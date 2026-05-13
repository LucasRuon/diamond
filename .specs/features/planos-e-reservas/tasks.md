# Planos e Regras de Reserva — Tasks

**Spec:** [spec.md](./spec.md)
**Design:** [design.md](./design.md)
**Status:** Draft

> **Nota sobre testes:** o projeto não possui suíte automatizada (CLAUDE.md). Todo `Gate` aqui é **manual** — checar via `python3 -m http.server 8080` + Supabase SQL Editor / DevTools. Cada task lista a verificação concreta no campo **Verify**.

---

## Execution Plan

### Phase 1 — Schema (Sequential)

```
T1 → T2 → T3 → T4 → T5
```

Migrations devem ser aplicadas em ordem numérica no Supabase. Sem `[P]` — uma depende da anterior compilando no DB.

### Phase 2 — Admin UI (Parallel após Phase 1)

```
T5 ──┬→ T6  [P]
     ├→ T7  [P]
     └→ T8  [P]
```

### Phase 3 — Selects de parcelas (Parallel)

```
T6 ──┬→ T9   [P]
     ├→ T10  [P]
     └→ T11  [P]
```

### Phase 4 — UI Aluno (Sequential, mesmo arquivo)

```
T5 → T12 → T13 → T14 → T15
```

T12–T15 tocam todos `js/pages/student/trainings.js` — sequencial para evitar conflito de edição.

### Phase 5 — Push infra (Sequential)

```
T16 → T17 → T18 → T19
```

### Phase 6 — Notificação + cron (Sequential)

```
T19 → T20 → T21
```

### Phase 7 — Dashboard

```
T15 → T22
```

---

## Task Breakdown

### T1: Migration 013 — `plans.kind` + `max_installments` + seed

**What:** Criar enum `plan_kind`, adicionar colunas e seed dos 20 planos base.
**Where:** `migrations/013_plan_kind_installments.sql` (novo)
**Depends on:** —
**Reuses:** estrutura de `migrations/008_plan_expiration.sql`
**Requirement:** REQ-PLAN-001, REQ-PLAN-002, REQ-PLAN-003

**Tools:** MCP `Supabase` (`apply_migration`) — Skill: NONE

**Done when:**
- [ ] Enum `plan_kind` criado.
- [ ] Colunas `kind` (default `custom`, NOT NULL) e `max_installments` (default 1, CHECK 1–12) presentes em `plans`.
- [ ] Seed inseriu 20 registros (5 kinds × 2 tiers × 2 categorias) sem violar UNIQUE existente.

**Verify:**
```sql
SELECT kind, count(*) FROM plans GROUP BY kind;
-- avulsa=4, basic=4, plus=4, pro=4, elite=4 (+ custom dos existentes)
```

**Gate:** manual (SQL) **Commit:** `feat(db): migration 013 - plan kind + max_installments + seed`

---

### T2: Migration 014 — `training_sessions.capacity`

**What:** Adicionar coluna `capacity` em `training_sessions`.
**Where:** `migrations/014_session_capacity.sql` (novo)
**Depends on:** T1
**Requirement:** REQ-WAIT-001

**Done when:**
- [ ] Coluna `capacity INT NOT NULL DEFAULT 20 CHECK (capacity > 0)`.
- [ ] Sessões existentes ficaram com `capacity=20`.

**Verify:** `SELECT id, capacity FROM training_sessions LIMIT 5;`

**Gate:** manual **Commit:** `feat(db): migration 014 - session capacity`

---

### T3: Migration 015 — policies INSERT/UPDATE de reservations (1h/2h + capacity)

**What:** Substituir policies de INSERT (24h→1h, +check capacity) e UPDATE (cancel: 2h, admin bypass).
**Where:** `migrations/015_reservation_windows.sql` (novo)
**Depends on:** T2
**Reuses:** `migrations/010_reservation_quota_policy.sql`, `migrations/003_training_reservations.sql`
**Requirement:** REQ-RES-001, REQ-RES-002, REQ-RES-005

**Done when:**
- [ ] `training_reservations_insert` exige `scheduled_at >= now()+1h` e `booked < capacity`.
- [ ] `training_reservations_update` exige `scheduled_at >= now()+2h` para aluno, mas admin bypassa.

**Verify:**
```sql
-- como aluno, INSERT em sessão a 30min → deve falhar
-- como aluno, UPDATE status=cancelled em sessão a 1h → deve falhar
-- como admin, UPDATE em qualquer momento → ok
```

**Gate:** manual **Commit:** `feat(db): migration 015 - reservation windows 1h/2h`

---

### T4: Migration 016 — `session_interests` + `push_subscriptions` + RLS

**What:** Criar tabelas + índices + policies da waitlist e push subs (com `notified_at`).
**Where:** `migrations/016_waitlist_push.sql` (novo)
**Depends on:** T3
**Requirement:** REQ-WAIT-002, REQ-WAIT-003, REQ-WAIT-005, REQ-WAIT-009

**Done when:**
- [ ] Tabela `session_interests` com colunas spec'd + `notified_at TIMESTAMPTZ`.
- [ ] Unique index parcial em `(session_id, student_id) WHERE status IN ('waiting','offered')`.
- [ ] Index FIFO em `(session_id, created_at) WHERE status='waiting'`.
- [ ] Policies SELECT/INSERT/UPDATE conforme design (REQ-WAIT-003 / 005).
- [ ] Tabela `push_subscriptions` + policies (insert/delete próprio).

**Verify:** `\d session_interests`, `\d push_subscriptions` no SQL Editor.

**Gate:** manual **Commit:** `feat(db): migration 016 - waitlist & push subscriptions`

---

### T5: Migration 017 — `promote_waitlist()` + trigger AFTER UPDATE

**What:** Função `SECURITY DEFINER` + trigger `trg_promote_after_cancel`.
**Where:** `migrations/017_waitlist_promote.sql` (novo)
**Depends on:** T4
**Requirement:** REQ-WAIT-006, REQ-WAIT-008, U3

**Done when:**
- [ ] `promote_waitlist(uuid)` definida com `FOR UPDATE SKIP LOCKED`, retorna interest_id ou NULL.
- [ ] Trigger `training_reservations_promote` AFTER UPDATE chamando função quando `booked→cancelled`.
- [ ] `pg_notify('waitlist_offer', ...)` disparado em cada promoção.
- [ ] GRANT EXECUTE para `service_role`.

**Verify:** simular cancelamento, verificar `session_interests.status` virou `offered` para o `waiting` mais antigo.

**Gate:** manual **Commit:** `feat(db): migration 017 - waitlist promote function & trigger`

---

### T6: Admin plans form — kind + max_installments + sugestões [P]

**What:** Expor selects e auto-preencher sugestões ao trocar `kind`.
**Where:** `js/pages/admin/plans.js`
**Depends on:** T5
**Requirement:** REQ-PLAN-004, REQ-PLAN-005

**Done when:**
- [ ] `<select name="kind">` (6 opções) e `<input name="max_installments" min=1 max=12>`.
- [ ] Ao trocar kind ≠ custom: preencher `duration_days`, `total_sessions`, `max_installments` (sem travar).
- [ ] Listagem mostra `kind` como badge.

**Verify:** abrir `#admin/plans`, criar plano `basic` → campos auto-preenchidos com 30/4/2; salvar; ver badge.

**Gate:** manual (browser) **Commit:** `feat(admin): plans kind & installments`

---

### T7: Admin trainings form — capacity [P]

**What:** Adicionar input `capacity` no form de sessão de treino.
**Where:** `js/pages/admin/trainings.js`
**Depends on:** T5
**Requirement:** REQ-WAIT-001

**Done when:**
- [ ] `<input type="number" name="capacity" min="1" value="20">` no form de create/edit.
- [ ] Persiste no insert/update da sessão.

**Verify:** criar sessão com capacity=5; conferir DB.

**Gate:** manual **Commit:** `feat(admin): training session capacity`

---

### T8: Admin charges — select parcelas amarrado ao plano [P]

**What:** Substituir range fixo 1–12 por `plan.max_installments` (atualizar quando plano muda no form).
**Where:** `js/pages/admin/charges.js:101-103`
**Depends on:** T5
**Requirement:** REQ-PLAN-006

**Done when:**
- [ ] Select de parcelas re-renderiza com `Array.from({length: plan.max_installments})` quando admin escolhe plano.

**Verify:** cobrança avulsa com plano `avulsa` (1 parcela) → select mostra só 1.

**Gate:** manual **Commit:** `feat(admin): charges installments from plan`

---

### T9: Student plans — select parcelas do plano [P]

**What:** Trocar range fixo por `plan.max_installments` no checkout.
**Where:** `js/pages/student/plans.js:122`
**Depends on:** T6
**Requirement:** REQ-PLAN-006

**Done when:**
- [ ] Select limitado a `max_installments` do plano escolhido.

**Verify:** plano basic (2x) → opções 1x e 2x apenas.

**Gate:** manual **Commit:** `feat(student): plan installments respect max`

---

### T10: Responsible plans — select parcelas do plano [P]

**What:** Mesma alteração do T9 para tela do responsável.
**Where:** `js/pages/responsible/plans.js:125`
**Depends on:** T6
**Requirement:** REQ-PLAN-006

**Done when:**
- [ ] Select limitado a `max_installments`.

**Verify:** idem T9 logado como responsável.

**Gate:** manual **Commit:** `feat(responsible): plan installments respect max`

---

### T11: Mensagem de erro `trainings.js:252` [P]

**What:** Remover "prazo de 24h", refletir novas janelas (1h marcar / 2h cancelar / turma cheia).
**Where:** `js/pages/student/trainings.js` (linha do toast/erro de reserva)
**Depends on:** T5
**Requirement:** REQ-RES-004

**Done when:**
- [ ] Mensagem atualizada e única (sem dois copies divergentes).

**Verify:** tentar reservar sessão a 30min → mensagem nova aparece.

**Gate:** manual **Commit:** `fix(student): update reservation error copy`

---

### T12: Student trainings — gate de marcação 1h + capacity

**What:** Esconder/desabilitar botão "MARCAR" conforme janela 1h e lotação.
**Where:** `js/pages/student/trainings.js`
**Depends on:** T11
**Requirement:** REQ-RES-003 (parte marcar), REQ-WAIT-004 (parte "TURMA CHEIA")

**Done when:**
- [ ] `minutesUntil < 60` → botão disabled + tooltip.
- [ ] `booked >= capacity` → mostra "TURMA CHEIA" e troca CTA por "TENHO INTERESSE".

**Verify:** abrir sessão a 30min → MARCAR disabled; sessão lotada → CTA "TENHO INTERESSE".

**Gate:** manual **Commit:** `feat(student): training booking window 1h + capacity gate`

---

### T13: Student trainings — gate de cancelamento 2h

**What:** Desabilitar/esconder "CANCELAR" se `minutesUntil < 120`; toast explicativo.
**Where:** `js/pages/student/trainings.js`
**Depends on:** T12
**Requirement:** REQ-RES-003 (parte cancelar)

**Done when:**
- [ ] Botão cancelar inativo dentro da janela com toast informativo.
- [ ] Admin (role) não vê o gate (continua podendo cancelar).

**Verify:** sessão a 1h → CANCELAR bloqueado; admin consegue cancelar (via UI admin).

**Gate:** manual **Commit:** `feat(student): cancel window 2h`

---

### T14: Student trainings — botão "TENHO INTERESSE" toggle waiting/cancelled

**What:** Renderizar botão sempre que aluno tem plano ativo e não possui reserva booked; toggle insert/update.
**Where:** `js/pages/student/trainings.js`
**Depends on:** T13
**Requirement:** REQ-WAIT-004, REQ-WAIT-005

**Done when:**
- [ ] Estado on (waiting) ↔ off (cancelled) persistido em `session_interests`.
- [ ] Bloqueado se sem plano ativo na categoria (RLS já cobre, UI mostra mensagem).

**Verify:** clicar interesse → row em waiting; clicar de novo → cancelled; refresh → estado correto.

**Gate:** manual **Commit:** `feat(student): waitlist interest toggle`

---

### T15: Student trainings — banner oferta (accept/decline)

**What:** Mostrar banner quando aluno tem `session_interests.status='offered' AND expires_at>now()`; botões ACEITAR/RECUSAR.
**Where:** `js/pages/student/trainings.js`
**Depends on:** T14
**Requirement:** REQ-WAIT-007

**Done when:**
- [ ] Banner com countdown até `expires_at`.
- [ ] "ACEITAR" cria `training_reservations` (booked) + UPDATE interest=accepted.
- [ ] "RECUSAR" → interest=cancelled (trigger promove próximo).
- [ ] Aceite após expiração falha graciosamente (RLS/janela) e re-promove.

**Verify:** simular oferta no DB → recarregar app → ver banner; aceitar → reserva criada; recusar → próximo da fila vira `offered`.

**Gate:** manual **Commit:** `feat(student): waitlist offer banner accept/decline`

---

### T16: VAPID keys + constants

**What:** Gerar par VAPID, configurar secrets no Supabase e expor public key no client.
**Where:** `js/supabase.js` (const `VAPID_PUBLIC`), Supabase Edge secrets (`VAPID_PRIVATE`, `VAPID_PUBLIC`, `VAPID_SUBJECT`).
**Depends on:** T5
**Requirement:** REQ-WAIT-009, U2

**Done when:**
- [ ] Par gerado (web-push CLI ou Node).
- [ ] Secrets configurados.
- [ ] `VAPID_PUBLIC` exportado de `js/supabase.js`.

**Verify:** `supabase secrets list` mostra os 3 secrets; `import { VAPID_PUBLIC } from './supabase.js'` funciona.

**Gate:** manual **Commit:** `chore(push): vapid keys & client constant`

---

### T17: Edge function `push-subscribe`

**What:** Endpoint que persiste subscription do usuário autenticado.
**Where:** `supabase/functions/push-subscribe/index.ts` (novo) + `deno.json`
**Depends on:** T16
**Reuses:** padrão de auth de `supabase/functions/admin-update-user/`
**Requirement:** REQ-WAIT-009

**Done when:**
- [ ] Valida JWT, upsert `push_subscriptions (user_id, endpoint, p256dh, auth)`.
- [ ] CORS habilitado para origem da PWA.

**Verify:** `curl -X POST` com JWT válido + body de subscription → row criada em `push_subscriptions`.

**Gate:** manual **Commit:** `feat(functions): push-subscribe endpoint`

---

### T18: Service worker — push & notificationclick + bump cache

**What:** Adicionar listeners `push` e `notificationclick`; subir `CACHE_NAME` para `diamondx-v26`.
**Where:** `service-worker.js`
**Depends on:** T17
**Requirement:** REQ-WAIT-009

**Done when:**
- [ ] `push` mostra notificação via `showNotification`.
- [ ] `notificationclick` abre `data.url` (default `/#trainings`).
- [ ] `CACHE_NAME` atualizado.

**Verify:** DevTools → Application → Service Workers → enviar push de teste via Supabase function → notificação aparece; clique abre `#trainings`.

**Gate:** manual **Commit:** `feat(pwa): service worker push handlers`

---

### T19: `js/push.js` — registro e subscribe

**What:** Função `registerPush()` chamada após login que pede permissão, faz subscribe no SW e POST em `push-subscribe`.
**Where:** `js/push.js` (novo), wire em `js/app.js` (pós-`loadProfile`).
**Depends on:** T18
**Requirement:** REQ-WAIT-009, REQ-WAIT-010 (fallback in-app já coberto por T15/T22)

**Done when:**
- [ ] Pede permissão apenas uma vez por sessão; ignora se já concedida/negada.
- [ ] Subscribe usa `VAPID_PUBLIC` urlBase64→Uint8Array.
- [ ] Falhas silenciosas (sem subscription = fallback in-app).

**Verify:** login → prompt aparece → row em `push_subscriptions`.

**Gate:** manual **Commit:** `feat(pwa): client push subscribe`

---

### T20: Edge function `push-notify` (interna)

**What:** Função service_role que envia push para `user_id` via `web-push`. Remove subs com 410/404.
**Where:** `supabase/functions/push-notify/index.ts` (novo)
**Depends on:** T19
**Requirement:** REQ-WAIT-009, R2

**Done when:**
- [ ] Lê `push_subscriptions` do user_id; envia via `npm:web-push` (esm.sh).
- [ ] Body `{ user_id, title, body, url }`.
- [ ] Não exposta sem service_role (verificação no header).

**Verify:** invocar via service_role com user_id de teste → notificação chega no device.

**Gate:** manual **Commit:** `feat(functions): push-notify internal`

---

### T21: Edge function `waitlist-tick` (cron)

**What:** Cron 1min: expira `offered` vencidas (→ expired + promote) e envia push para `offered` ainda não notificados.
**Where:** `supabase/functions/waitlist-tick/index.ts` (novo) + agendamento Supabase Cron.
**Depends on:** T20
**Requirement:** REQ-WAIT-006, REQ-WAIT-008

**Done when:**
- [ ] Marca `expired` onde `expires_at < now()` e chama `promote_waitlist(session_id)`.
- [ ] Para `offered AND notified_at IS NULL`: chama `push-notify`, set `notified_at=now()`.
- [ ] Idempotente (rodar 2× sem efeito duplicado).
- [ ] Cron agendado a cada minuto.

**Verify:**
1. Criar interest waiting, cancelar reserva → `offered`.
2. Aguardar próximo tick → push chega + `notified_at` populado.
3. Não responder em 30min → tick seguinte marca `expired`, próximo vira `offered`.

**Gate:** manual **Commit:** `feat(functions): waitlist-tick cron`

---

### T22: Student dashboard — badge de oferta pendente

**What:** Query e card destacado se há `session_interests.status='offered'` do aluno.
**Where:** `js/pages/student/dashboard.js`
**Depends on:** T15
**Requirement:** REQ-WAIT-010

**Done when:**
- [ ] Card no topo com CTA para `#trainings`.
- [ ] Some quando a oferta expira/aceita/recusa.

**Verify:** simular oferta ativa → dashboard mostra card; aceitar via banner → card some.

**Gate:** manual **Commit:** `feat(student): dashboard waitlist offer badge`

---

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1–T5 | 1 migration cada | ✅ |
| T6 | 1 form + listagem (mesmo arquivo, coeso) | ✅ |
| T7 | 1 input | ✅ |
| T8–T10 | 1 select cada | ✅ |
| T11 | 1 string | ✅ |
| T12–T15 | 1 comportamento UI cada (mesmo arquivo, sequencial) | ✅ |
| T16 | 1 config | ✅ |
| T17, T20, T21 | 1 edge function cada | ✅ |
| T18 | handlers SW + cache bump | ✅ |
| T19 | 1 módulo client | ✅ |
| T22 | 1 card dashboard | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends on (body) | Diagram shows | Status |
|------|--------------------|---------------|--------|
| T1 | — | raiz | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T5 | T5→T6 [P] | ✅ |
| T7 | T5 | T5→T7 [P] | ✅ |
| T8 | T5 | T5→T8 [P] | ✅ |
| T9 | T6 | T6→T9 [P] | ✅ |
| T10 | T6 | T6→T10 [P] | ✅ |
| T11 | T5 | T5→T11 (Phase 4) | ✅ |
| T12 | T11 | T11→T12 | ✅ |
| T13 | T12 | T12→T13 | ✅ |
| T14 | T13 | T13→T14 | ✅ |
| T15 | T14 | T14→T15 | ✅ |
| T16 | T5 | raiz Phase 5 | ✅ |
| T17 | T16 | T16→T17 | ✅ |
| T18 | T17 | T17→T18 | ✅ |
| T19 | T18 | T18→T19 | ✅ |
| T20 | T19 | T19→T20 | ✅ |
| T21 | T20 | T20→T21 | ✅ |
| T22 | T15 | T15→T22 | ✅ |

---

## Test Co-location

Projeto sem suíte automatizada — todos os tasks usam **gate manual** com Verify explícito. Não há matriz TESTING.md aplicável.

---

## Tools / MCPs sugeridos

- **Migrations (T1–T5):** aplicar manualmente via **SQL Editor** do Supabase, na ordem 013 → 017. Cada commit local adiciona o arquivo em `migrations/` (não roda automaticamente).
- **Edge functions (T17, T20, T21):** Supabase CLI (`supabase functions deploy`).
- **Frontend (T6–T15, T19, T22):** servidor estático local + DevTools.
- **VAPID (T16):** `npx web-push generate-vapid-keys`.
