# Design — Planos e Regras de Reserva

**Spec:** [spec.md](./spec.md)
**Status:** Draft

## Visão geral

Mudança em 4 camadas, todas no mesmo PR/conjunto de migrations:

```
┌──────────────────────────────────────────────────────────────┐
│ 1. DB (migrations 013→016)                                   │
│    - plans.kind, plans.max_installments                      │
│    - training_sessions.capacity                              │
│    - session_interests                                       │
│    - push_subscriptions                                      │
│    - policies INSERT/UPDATE de reservations (1h/2h)          │
│    - trigger AFTER UPDATE training_reservations → promote()  │
│    - função promote_waitlist(session_id) SECURITY DEFINER    │
├──────────────────────────────────────────────────────────────┤
│ 2. Edge Functions (Deno)                                     │
│    - push-subscribe (registra subscription do usuário)       │
│    - push-notify    (envia push via web-push, usa vapid)     │
│    - waitlist-tick  (cron: expira ofertas e re-oferta)       │
├──────────────────────────────────────────────────────────────┤
│ 3. Frontend                                                  │
│    - admin/plans.js: kind, max_installments + sugestões      │
│    - admin/trainings.js: campo capacity                      │
│    - student/plans.js, responsible/plans.js, admin/charges:  │
│      select parcelas amarrado a max_installments             │
│    - student/trainings.js: botões marcar/cancelar/interesse  │
│    - student/dashboard.js: badge de oferta pendente          │
│    - app.js + novo js/push.js: registrar SW, subscribe       │
├──────────────────────────────────────────────────────────────┤
│ 4. Service worker                                            │
│    - handlers push, notificationclick                        │
└──────────────────────────────────────────────────────────────┘
```

## 1. Schema

### Migration 013 — plans.kind + max_installments

```sql
CREATE TYPE plan_kind AS ENUM ('avulsa','basic','plus','pro','elite','custom');

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS kind plan_kind NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS max_installments INT NOT NULL DEFAULT 1
    CHECK (max_installments BETWEEN 1 AND 12);

-- Seed: 5 níveis × 2 tiers × 2 categorias = 20 registros base
-- price=0 (admin define); name="<Kind> <Tier> <Categoria>"
INSERT INTO public.plans (name, category, tier, price, duration_days, total_sessions, max_installments, kind)
SELECT
  initcap(k::text) || ' ' || initcap(t::text) || ' ' || initcap(c::text),
  c, t, 0, dur, sess, inst, k
FROM (VALUES
  ('avulsa'::plan_kind, 10, 1, 1),
  ('basic',  30, 4, 2),
  ('plus',   45, 6, 2),
  ('pro',    60, 8, 3),
  ('elite',  75, 12, 4)
) AS x(k, dur, sess, inst)
CROSS JOIN (VALUES ('pre_diamond'), ('diamond_x')) AS y(t)
CROSS JOIN (VALUES ('training'), ('physio')) AS z(c)
ON CONFLICT DO NOTHING;
```

### Migration 014 — training_sessions.capacity

```sql
ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 20
    CHECK (capacity > 0);
```

`20` é placeholder — admin reclassifica. Edit form passa a expor o campo (REQ-WAIT-001).

### Migration 015 — janelas de reserva

```sql
DROP POLICY IF EXISTS "training_reservations_insert" ON public.training_reservations;

CREATE POLICY "training_reservations_insert" ON public.training_reservations
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'booked'
    AND EXISTS (
      SELECT 1
      FROM public.student_plans sp
      JOIN public.plans p ON p.id = sp.plan_id
      WHERE sp.student_id = auth.uid()
        AND sp.status = 'active'
        AND p.category = 'training'
        AND (
          p.total_sessions IS NULL OR p.total_sessions = 0
          OR (
            SELECT COUNT(*) FROM public.attendance a
            WHERE a.student_id = auth.uid()
              AND a.checked_in_at >= sp.start_at
              AND a.checked_in_at < COALESCE(sp.expires_at, now() + interval '1 year')
          ) < p.total_sessions
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.training_sessions s
      WHERE s.id = session_id
        AND s.scheduled_at >= now() + interval '1 hour'        -- ← era 24h
        AND (
          SELECT COUNT(*) FROM public.training_reservations r
          WHERE r.session_id = s.id AND r.status = 'booked'
        ) < s.capacity
    )
  );

DROP POLICY IF EXISTS "training_reservations_update" ON public.training_reservations;

CREATE POLICY "training_reservations_update" ON public.training_reservations
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin')
    OR (student_id = auth.uid() AND status = 'booked')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin')
    OR (
      student_id = auth.uid()
      AND status = 'cancelled'
      AND cancelled_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.training_sessions s
        WHERE s.id = session_id
          AND s.scheduled_at >= now() + interval '2 hours'      -- ← novo
      )
    )
  );
```

Capacity também passa a fazer parte da policy de INSERT — bloqueia overbooking direto no DB.

### Migration 016 — waitlist + push

```sql
CREATE TABLE public.session_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','offered','accepted','expired','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  offered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX session_interests_active_uniq
  ON public.session_interests(session_id, student_id)
  WHERE status IN ('waiting','offered');

CREATE INDEX session_interests_fifo_idx
  ON public.session_interests(session_id, created_at)
  WHERE status = 'waiting';

ALTER TABLE public.session_interests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.session_interests TO authenticated;

-- aluno: vê e gerencia o próprio; admin tudo; responsável vê dos tutelados
CREATE POLICY "session_interests_select" ON public.session_interests
  FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.responsible_students
      WHERE responsible_id = auth.uid() AND student_id = session_interests.student_id
    )
  );

CREATE POLICY "session_interests_insert" ON public.session_interests
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND status = 'waiting'
    AND EXISTS (
      SELECT 1 FROM public.student_plans sp
      JOIN public.plans p ON p.id = sp.plan_id
      JOIN public.training_sessions s ON s.id = session_id
      WHERE sp.student_id = auth.uid()
        AND sp.status = 'active'
        AND p.category = 'training'
    )
  );

CREATE POLICY "session_interests_update" ON public.session_interests
  FOR UPDATE USING (student_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin')
  );

-- push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- só edge function (service_role) lê; usuário só insere o próprio
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
```

### Migration 017 — função promote + trigger

```sql
CREATE OR REPLACE FUNCTION public.promote_waitlist(p_session_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity INT;
  v_booked   INT;
  v_offered  INT;
  v_pick     UUID;
BEGIN
  SELECT capacity INTO v_capacity FROM training_sessions WHERE id = p_session_id;
  IF v_capacity IS NULL THEN RETURN NULL; END IF;

  SELECT COUNT(*) INTO v_booked
    FROM training_reservations
    WHERE session_id = p_session_id AND status = 'booked';

  SELECT COUNT(*) INTO v_offered
    FROM session_interests
    WHERE session_id = p_session_id AND status = 'offered'
      AND expires_at > now();

  -- vagas reais = capacity - booked - offers ativas
  IF (v_booked + v_offered) >= v_capacity THEN
    RETURN NULL;
  END IF;

  -- pega o próximo waiting (FIFO), com lock e skip-locked para concorrência
  SELECT id INTO v_pick
    FROM session_interests
    WHERE session_id = p_session_id AND status = 'waiting'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

  IF v_pick IS NULL THEN RETURN NULL; END IF;

  UPDATE session_interests
    SET status = 'offered',
        offered_at = now(),
        expires_at = now() + interval '30 minutes'
    WHERE id = v_pick;

  -- pg_notify para edge function pegar e disparar push
  PERFORM pg_notify('waitlist_offer', json_build_object(
    'interest_id', v_pick,
    'session_id', p_session_id
  )::text);

  RETURN v_pick;
END;
$$;

-- trigger: ao cancelar reserva, tenta promover
CREATE OR REPLACE FUNCTION public.trg_promote_after_cancel()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'booked' THEN
    PERFORM public.promote_waitlist(NEW.session_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS training_reservations_promote ON public.training_reservations;
CREATE TRIGGER training_reservations_promote
  AFTER UPDATE ON public.training_reservations
  FOR EACH ROW EXECUTE FUNCTION public.trg_promote_after_cancel();

GRANT EXECUTE ON FUNCTION public.promote_waitlist(UUID) TO service_role;
```

## 2. Edge Functions

### `push-subscribe`
- Método: `POST`. Body: `{ endpoint, keys: { p256dh, auth } }`.
- Valida JWT, upsert em `push_subscriptions` para `auth.uid()`.
- Retorna `{ ok: true }`.

### `push-notify` (interna, service_role)
- Não exposta ao cliente — chamada por `waitlist-tick` ou diretamente por outra função.
- Body: `{ user_id, title, body, url }`.
- Lê subscriptions do usuário, envia via `web-push` (esm.sh). Remove subscription em 410/404.
- Secrets: `VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT`.

### `waitlist-tick` (cron)
- Roda a cada 1min via pg_cron chamando esta function via webhook OU via cron do Supabase.
- Para cada `session_interests` com `status='offered'` e `expires_at < now()`:
  1. Marca `expired`.
  2. Chama `promote_waitlist(session_id)` (que escolhe o próximo).
- Para cada notify recebida (via pg_notify ou polling de `offered` recentes ainda sem push enviado), dispara `push-notify` para `student_id`.

> Decisão: vamos usar **polling** simples a cada 30s/1min no `waitlist-tick` (lê `session_interests` `status='offered' AND offered_at > now() - 2min AND notified=false`) em vez de tentar consumir `pg_notify` em Deno — mais robusto via Supabase. Isso exige uma coluna extra `notified_at TIMESTAMPTZ` em `session_interests`.

**Ajuste à migration 016:** adicionar `notified_at TIMESTAMPTZ`.

## 3. Frontend

### `js/pages/admin/plans.js`
Adicionar no form:
- `<select name="kind">` com as 6 opções.
- `<input type="number" name="max_installments" min="1" max="12">`.
- JS: ao trocar kind, preencher `duration_days`, `total_sessions`, `max_installments` com a sugestão (tabela do REQ-PLAN-003), mas o usuário pode sobrescrever.

Listagem: adicionar badge do `kind` ao lado do tier.

### `js/pages/admin/trainings.js`
Form de novo treino: adicionar `<input type="number" name="capacity" min="1" value="20">`.

### Selects de parcelas
Trocar `Array.from({ length: 12 })` por `Array.from({ length: plan.max_installments })` em:
- `js/pages/student/plans.js:122`
- `js/pages/responsible/plans.js:125`
- `js/pages/admin/charges.js:101-103` (precisa do plano selecionado → atualizar quando o admin escolhe o plano no form)

### `js/pages/student/trainings.js`
Para cada sessão, calcular `minutesUntil = (scheduled_at - now)/60000`:

- Botão "MARCAR":
  - oculto se já existe reserva booked do aluno.
  - desabilitado se `minutesUntil < 60` (1h) — tooltip "Marcação bloqueada (faltam menos de 1h)".
  - desabilitado se `booked >= capacity` — mostra "TURMA CHEIA" + botão "TENHO INTERESSE".
- Botão "CANCELAR RESERVA":
  - desabilitado se `minutesUntil < 120` — toast "Cancelamento bloqueado (faltam menos de 2h)".
- Botão "TENHO INTERESSE":
  - sempre disponível para alunos sem reserva e com plano ativo na categoria.
  - alterna `waiting`/`cancelled` na tabela.
- Card de oferta (quando o aluno tem `session_interests.status='offered'`):
  - banner no topo da página + dashboard: "VOCÊ FOI CONVOCADO PARA <treino> — aceitar até <expires_at>".
  - botão "ACEITAR" → cria reserva, marca interesse `accepted`.
  - botão "RECUSAR" → marca `cancelled`, dispara nova promoção.

Mensagem em `trainings.js:252`: trocar de "verifique seu plano e o prazo de 24h" para "verifique seu plano e os prazos (1h marcar / 2h cancelar / turma cheia)".

### `js/pages/student/dashboard.js`
Query extra: `session_interests` com `status='offered'` do aluno. Se existir, card destacado no topo com CTA pra `#trainings`.

### `js/push.js` (novo)
- `registerPush()`: chamado após login.
  1. Pede permissão `Notification.requestPermission()`.
  2. `navigator.serviceWorker.ready.then(sw => sw.pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC }))`.
  3. POST para edge function `push-subscribe`.
- `VAPID_PUBLIC` é configurado em `js/supabase.js` ao lado das outras consts (não é segredo).

### `service-worker.js`
Adicionar:
```js
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/assets/icons/icon-192.png',
    data: { url: data.url || '/#trainings' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

Atualizar `CACHE_NAME` para `diamondx-v26`.

## 4. Fluxos chave

### Fluxo A — cancelamento dentro do prazo
1. Aluno X cancela reserva 5h antes (`scheduled_at - now > 2h` ✓).
2. UPDATE `cancelled` passa pela RLS.
3. Trigger `trg_promote_after_cancel` chama `promote_waitlist(session_id)`.
4. Função pega o `waiting` mais antigo Y → marca `offered`, `expires_at = +30min`, `pg_notify`.
5. `waitlist-tick` (ou listener) detecta `offered` novo → chama `push-notify` para Y.
6. Y recebe push → abre app → vê banner → clica "ACEITAR" → cria reserva, marca `accepted`.

### Fluxo B — oferta expira
1. Y não responde em 30min.
2. Próximo `waitlist-tick` vê `offered AND expires_at < now()` → marca `expired` → chama `promote_waitlist` → próximo da fila vira `offered`.

### Fluxo C — concorrência (duas vagas abertas simultâneo)
- Dois cancelamentos disparam dois triggers; cada um chama `promote_waitlist` que usa `FOR UPDATE SKIP LOCKED` — garante que não premiam o mesmo `waiting`. Dois alunos diferentes recebem oferta.

## 5. Ordem de execução

Sugestão de fases (cada uma um commit atômico):

1. Migrations 013–017 + seed.
2. Admin UI: `plans.js` (kind/max_installments) + `trainings.js` (capacity).
3. Selects de parcelas amarrados ao plano (3 telas).
4. UI student: janelas 1h/2h + botão "interesse" (sem push ainda; mostra oferta in-app via polling/refresh).
5. Edge function `push-subscribe` + `js/push.js` + service-worker handlers + Vapid keys.
6. Edge function `push-notify` + `waitlist-tick` (cron).
7. Dashboard student: badge de oferta.

Fases 1–4 já entregam valor mesmo sem push (oferta aparece quando o aluno abre o app). Push é incremental.

## Riscos / pontos abertos

- **R1** — `training_sessions.capacity` default `20` é arbitrário. Admin precisa revisar todas as sessões existentes pós-migration.
- **R2** — `web-push` em Deno: usar `npm:web-push` via `esm.sh` ou `npm:` specifier; precisa validar compatibilidade.
- **R3** — Permissão de Notificação no iOS PWA exige que o app esteja **instalado na tela inicial** (iOS 16.4+). Fallback in-app cobre quem não instalou.
- **R4** — Não há proteção contra um aluno entrar em waitlist e simultaneamente reservar outra sessão da mesma quota — política de quota só conta presença (`attendance`), não reservas. Se vira problema, revisar quota.
- **R5** — `pg_notify` em Deno requer conexão persistente; por isso optei por polling no `waitlist-tick`.
