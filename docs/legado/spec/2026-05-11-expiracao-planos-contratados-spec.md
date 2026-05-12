---
date: 2026-05-11
planner: claude
plan_title: "Expiração e quota de planos contratados"
status: draft
research: docs/research/2026-05-11-expiracao-planos-contratados.md
---

# Implementation Plan: Expiração e quota de planos contratados

## Overview

Hoje `student_plans` não persiste validade nem quota de aulas. A validade é recalculada no frontend a partir de `created_at + duration_days`, o status nunca transita para `expired` automaticamente, e `total_sessions` é puramente decorativo. Este plano:

1. Persiste `activated_at`, `start_at`, `expires_at` em `student_plans`.
2. Calcula expiração a partir da **confirmação de pagamento** (não da contratação).
3. Faz status `active → expired` virar **automaticamente** via `pg_cron`.
4. Conta presenças (`attendance`) contra `total_sessions` e **bloqueia novas reservas** quando a quota acaba.
5. Permite contratar plano novo mesmo com plano ativo: o novo enfileira (`start_at = expires_at` do anterior) com aviso ao usuário.
6. Exibe validade e quota nas telas relevantes (aluno, responsável, admin).

## Current State

- `student_plans`: tem `id, student_id, plan_id, purchased_by, status, created_at, asaas_payment_id`. **Sem** colunas de validade/quota. Schema não está em `migrations/` (inferido pelo uso).
- `plans`: catálogo com `duration_days` e `total_sessions`; form admin (`js/pages/admin/plans.js:118-127`) edita apenas `duration_days`.
- Validade é renderizada em `js/pages/student/dashboard.js:64-67` somando `created_at + duration_days`. Nenhum outro lugar mostra.
- Ativação do plano: `js/pages/admin/charges.js:213` faz `update({ status: 'active' })` sem datar.
- Edge Function `supabase/functions/asaas-checkout/index.ts:64-71` insere com `status: 'pending_payment'` apenas.
- Reservas: `migrations/003_training_reservations.sql:46-61` exige plano `active` para inserir, mas não consulta quota nem validade.
- Filtro "Vencidas" em `js/pages/admin/charges.js:31` filtra por `status = 'expired'` que nunca é populado.
- Bloqueio de plano duplicado existe só para responsável: `js/pages/responsible/plans.js:156-158`.

## What We're NOT Doing

- **Reserva como gatilho de quota**: contagem é por presença (`attendance`) confirmada, não por reserva.
- **Cobrança proporcional / reembolso**: cancelar plano apenas seta `status='cancelled'`, sem cálculo de dias restantes.
- **Notificações push/email**: aviso de renovação é inline na tela, sem disparar e-mail.
- **Migrar `student_plans` para incluir histórico completo**: backfill é best-effort para registros `active` existentes; `expired/cancelled` antigos ficam como estão.
- **Editar `total_sessions` em planos já contratados**: o snapshot é fixo no momento do insert via `plan_id`; mudar o catálogo não retroage.

---

## Phase 1: Schema & auto-expiração

### Files to Modify:
- [ ] `migrations/008_plan_expiration.sql` (novo)

### Conteúdo da migration:

```sql
-- 1. Colunas novas em student_plans
ALTER TABLE public.student_plans
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS student_plans_expires_idx
  ON public.student_plans(expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS student_plans_student_status_idx
  ON public.student_plans(student_id, status);

-- 2. Garantir total_sessions em plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS total_sessions INT;

-- 3. Backfill: ativos existentes ganham activated_at=created_at,
--    start_at=created_at, expires_at=created_at + duration_days
UPDATE public.student_plans sp
SET activated_at = sp.created_at,
    start_at     = sp.created_at,
    expires_at   = sp.created_at + (p.duration_days || ' days')::interval
FROM public.plans p
WHERE p.id = sp.plan_id
  AND sp.status = 'active'
  AND sp.expires_at IS NULL;

-- 4. Função de expiração
CREATE OR REPLACE FUNCTION public.expire_student_plans()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE public.student_plans
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_student_plans() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_student_plans() TO service_role;

-- 5. Agendamento diário (requer extensão pg_cron habilitada no projeto)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'expire-student-plans-daily',
  '5 3 * * *',                       -- 03:05 UTC todo dia
  $$SELECT public.expire_student_plans();$$
);

NOTIFY pgrst, 'reload schema';
```

### Success Criteria:

#### Automated:
- [ ] Migration aplica sem erro em projeto novo e em projeto com dados existentes.
- [ ] `SELECT cron.job FROM cron.job WHERE jobname='expire-student-plans-daily'` retorna 1 linha.
- [ ] `SELECT public.expire_student_plans()` retorna int e roda sem erro.

#### Manual:
- [ ] Inserir `student_plans` com `status='active'` e `expires_at = now() - interval '1 day'`; executar `SELECT public.expire_student_plans();` e verificar que virou `expired`.
- [ ] Registros `active` pré-existentes têm `expires_at` preenchido após migration.

---

## Phase 2: RPC de ativação (enfileira renovações)

### Files to Modify:
- [ ] `migrations/009_activate_student_plan_rpc.sql` (novo)

### Conteúdo:

```sql
CREATE OR REPLACE FUNCTION public.activate_student_plan(p_student_plan_id UUID)
RETURNS public.student_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sp        public.student_plans;
  v_duration  INT;
  v_last_exp  TIMESTAMPTZ;
  v_start     TIMESTAMPTZ;
  v_is_admin  BOOLEAN;
BEGIN
  -- Apenas admin ou service_role pode ativar
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role::text = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT sp.*, p.duration_days
    INTO v_sp, v_duration
  FROM public.student_plans sp
  JOIN public.plans p ON p.id = sp.plan_id
  WHERE sp.id = p_student_plan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_plan not found';
  END IF;

  IF v_sp.status NOT IN ('pending_payment') THEN
    RAISE EXCEPTION 'invalid status transition from %', v_sp.status;
  END IF;

  -- Maior expires_at entre planos active/expired do mesmo aluno e categoria
  SELECT MAX(sp2.expires_at)
    INTO v_last_exp
  FROM public.student_plans sp2
  JOIN public.plans p2 ON p2.id = sp2.plan_id
  JOIN public.plans pcur ON pcur.id = v_sp.plan_id
  WHERE sp2.student_id = v_sp.student_id
    AND sp2.id <> v_sp.id
    AND sp2.status = 'active'
    AND p2.category = pcur.category;

  v_start := GREATEST(COALESCE(v_last_exp, now()), now());

  UPDATE public.student_plans
  SET status       = 'active',
      activated_at = now(),
      start_at     = v_start,
      expires_at   = v_start + (v_duration || ' days')::interval
  WHERE id = p_student_plan_id
  RETURNING * INTO v_sp;

  RETURN v_sp;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_student_plan(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
```

### Success Criteria:

#### Automated:
- [ ] `SELECT public.activate_student_plan('<id>')` chamado por admin retorna a row atualizada.
- [ ] Chamada por usuário não-admin → `permission denied / forbidden`.
- [ ] Chamada com plano já `active` → erro `invalid status transition`.

#### Manual:
- [ ] Aluno sem planos prévios: ativar plano → `start_at ≈ now()`, `expires_at ≈ now() + duration_days`.
- [ ] Aluno com plano `active` da mesma categoria expirando em DD/MM: ativar novo plano → `start_at = DD/MM`, `expires_at = DD/MM + duration_days`.

---

## Phase 3: Admin — cobranças e catálogo

### Files to Modify:
- [ ] `js/pages/admin/charges.js`
  - Trocar `update({ status: 'active' })` (linha 213) por `supabase.rpc('activate_student_plan', { p_student_plan_id: charge.id })`.
  - Estender `select` em `loadCharges` (linha 127) para incluir `expires_at, start_at, plan:plans(name, price, duration_days, total_sessions)`.
  - Renderizar `Válido até: dd/mm/yyyy` no card quando `status='active'` e `expires_at` existir.
  - No `showChargeActions` (linha 187), incluir linha de validade e (se houver `total_sessions`) "X/Y aulas" usando helper de Phase 5.
  - Tratar erro do RPC com `toast.show(error.message, 'error')` mantendo padrão atual.
- [ ] `js/pages/admin/plans.js`
  - Adicionar campo `<input name="total_sessions" type="number" min="0">` no form (após linha 125 onde está `duration_days`).
  - Incluir `total_sessions` em `loadPlans` select e no insert/update do plano (linhas 95-145).
  - Exibir "N aulas" no card de listagem do catálogo.

### Success Criteria:

#### Automated:
- [ ] Lint manual (sem ferramenta): nenhum import quebrado.
- [ ] Form submit do plano persiste `total_sessions` (verificar via `select * from plans`).

#### Manual:
- [ ] Admin cria cobrança manual, clica "Confirmar Pagamento Manual" → status vira `active`, `expires_at` preenchido, card mostra "Válido até".
- [ ] Admin edita plano e define `total_sessions = 4` → catálogo do aluno (`/student/plans`) mostra "4 aulas".
- [ ] Cobranças `pending_payment` e `cancelled` continuam aparecendo normalmente nos filtros.

---

## Phase 4: Contratação com aviso de renovação

### Files to Modify:
- [ ] `js/pages/student/plans.js`
  - Antes do `insert` (linha 128), buscar `student_plans` `active` do mesmo aluno **e mesma categoria** ordenado por `expires_at desc`.
  - Se existir: exibir confirmação inline ("Você já tem '<plan.name>' ativo até DD/MM/YYYY. O novo plano começará após essa data. Confirmar?").
  - Manter o `insert` com `status: 'pending_payment'` (a ativação posterior cuidará do `start_at`).
- [ ] `js/pages/responsible/plans.js`
  - Substituir o bloqueio (linhas 156-158) pela mesma confirmação com data.
  - Mensagem deve citar nome do dependente.
- [ ] `js/pages/admin/charges.js`
  - No fluxo de cobrança manual (`bottomSheet.show` em ~linha 101), após escolher aluno, buscar plano ativo e exibir aviso textual no próprio sheet (não bloqueia, mas informa).
- [ ] `supabase/functions/asaas-checkout/index.ts`
  - Sem mudança no fluxo de criação (continua `pending_payment`). Após confirmação do Asaas (webhook ou retorno de checkout), chamar `rpc('activate_student_plan', …)` com service_role no client.
  - **Atenção**: pesquisar se o projeto já tem webhook Asaas; se não, manter ativação manual via admin como hoje e marcar como TODO para fase futura. Inserir comentário `// TODO: integrar webhook Asaas para ativar via RPC` em `index.ts` linha 71.

### Success Criteria:

#### Automated:
- [ ] Insert via responsável agora cria registro `pending_payment` (não dá erro de "já existe ativo").

#### Manual:
- [ ] Aluno com plano de treino ativo até 30/05 contrata novo Basic em 11/05: vê aviso, confirma; após admin aprovar, novo plano tem `start_at=30/05` e `expires_at=29/06`.
- [ ] Responsável vê aviso citando nome do dependente.
- [ ] Aluno tenta contratar plano de **outra categoria** (ex.: tem treino, contrata fisio) → sem aviso de duplicidade.

---

## Phase 5: Quota por presença e bloqueio de reserva

### Files to Modify:
- [ ] `js/planUsage.js` (novo helper)
  - Exporta `getActivePlanUsage(studentId)`: busca o `student_plan` com `status='active'` mais recente, joina `plans` para pegar `total_sessions, duration_days, category, name`, e conta `attendance` no intervalo `[start_at, LEAST(expires_at, now())]`.
  - Retorna `{ plan, used, total, remaining, expiresAt, startAt }` ou `null`.
- [ ] `js/trainingReservations.js`
  - Antes de inserir reserva, chamar `getActivePlanUsage`. Se `total > 0 && remaining <= 0`, bloquear com mensagem "Quota de aulas esgotada (N/N). Aguarde renovação."
  - Se `remaining <= 2`, exibir aviso "Restam X aulas neste plano." (não bloqueia).
- [ ] `migrations/010_reservation_quota_policy.sql` (novo)
  - Substituir `training_reservations_insert` policy: além de exigir plano `active`, exigir que a contagem de `attendance` desde o `start_at` do plano seja `< total_sessions` **OU** `total_sessions IS NULL/0` (plano sem quota).
  - Defesa em profundidade: o JS já bloqueia, mas RLS garante consistência se chamada vier por outro caminho.
- [ ] `js/pages/student/training.js` (ou onde está a tela de reservar — confirmar caminho exato)
  - Renderizar badge "X de N aulas restantes" no header da tela de reservas.

### Conteúdo da migration 010:

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
          p.total_sessions IS NULL
          OR p.total_sessions = 0
          OR (
            SELECT COUNT(*) FROM public.attendance a
            WHERE a.student_id = auth.uid()
              AND a.checked_in_at >= sp.start_at
              AND a.checked_in_at < COALESCE(sp.expires_at, now() + interval '1 year')
          ) < p.total_sessions
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.training_sessions
      WHERE id = session_id
        AND scheduled_at >= now() + interval '24 hours'
    )
  );

NOTIFY pgrst, 'reload schema';
```

### Success Criteria:

#### Automated:
- [ ] Insert direto via SQL com aluno que tem 4/4 presenças no plano Basic falha com policy violation.
- [ ] Insert com aluno tendo plano de `total_sessions = NULL` passa (planos ilimitados).

#### Manual:
- [ ] Aluno com plano "Basic 4 aulas" faz 4 check-ins → na 5ª tentativa de reserva, vê erro "Quota esgotada" e botão fica desabilitado.
- [ ] Aluno com 2 presenças vê "Restam 2 aulas" na tela de reservar.
- [ ] Cancelar uma reserva (sem ter feito check-in) **não** devolve quota (confirmado pelo gatilho ser presença).
- [ ] Após plano expirar via cron, reserva é bloqueada pela policy original (falta `status='active'`).

---

## Phase 6: Visibilidade — dashboard aluno e pagamentos responsável

### Files to Modify:
- [ ] `js/pages/student/dashboard.js`
  - Substituir cálculo manual (linhas 64-67) por leitura direta de `expires_at` do plano `active` mais recente.
  - Adicionar segunda linha no card "Plano Ativo": "X/Y aulas usadas" usando `getActivePlanUsage`.
  - Se `expires_at` < now() + 7 dias: estilo de alerta (cor `--dx-warning` ou similar).
- [ ] `js/pages/responsible/payments.js`
  - Para cada dependente, listar plano ativo com `expires_at`, "X/Y aulas" e link para contratar renovação.
  - Reaproveitar `getActivePlanUsage(studentId)` por dependente.

### Success Criteria:

#### Automated:
- [ ] Nenhuma referência remanescente a `date.setDate(date.getDate() + currentPlan.plan.duration_days)` no projeto (grep).

#### Manual:
- [ ] Dashboard mostra "Válido até" idêntico ao valor salvo no banco.
- [ ] Aviso visual aparece quando expira em ≤ 7 dias.
- [ ] Responsável de 2 dependentes vê validade+quota de cada um na tela de pagamentos.
- [ ] Após cron rodar e expirar o plano, dashboard mostra "NENHUM PLANO ATIVO".

---

## Rollout / Ordem de aplicação

1. Aplicar `migrations/008_plan_expiration.sql` no Supabase Dashboard.
2. Aplicar `migrations/009_activate_student_plan_rpc.sql`.
3. Deploy do código JS das Phases 3–4 e 6 (sem migration 010 ainda).
4. Aplicar `migrations/010_reservation_quota_policy.sql` (depois de garantir que `total_sessions` está preenchido nos planos em uso — caso contrário, planos sem o campo seguem ilimitados pelo branch `IS NULL`).
5. Deploy do código JS da Phase 5 (helper + bloqueio).
6. Validar manualmente os fluxos descritos nos "Manual" critérios.

## Riscos & mitigações

- **`pg_cron` não habilitado**: se a extensão não estiver disponível no plano Supabase do projeto, substituir por Edge Function agendada via `scheduled-events` (Vercel cron ou similar) chamando `expire_student_plans()` via service_role. Decidir no momento da aplicação da migration 008.
- **Backfill inexato**: `active` antigos terão `activated_at = created_at` (não a data real de confirmação). Aceito porque histórico anterior não tem essa informação.
- **Categoria treino vs fisio na policy 010**: a policy atual só restringe reservas de treino. Se houver reservas de fisio no futuro, refazer policy parametrizada.
- **Service role no webhook Asaas**: tratamento foi adiado (TODO em `asaas-checkout/index.ts`); ativação continua manual por admin até essa integração existir.
