---
date: 2026-05-11
researcher: claude
research_question: "Quando um plano é contratado pelo aluno ou responsável e vinculado ao aluno, a expiração é calculada com base nos dias do plano (ex.: Basic R$ 599,90, 30 dias, 4 aulas)?"
status: complete
---

# Pesquisa: Expiração e quota de aulas em planos contratados

## Resumo

**Parcialmente correto.** O catálogo de planos (`plans`) possui as colunas `duration_days` e `total_sessions`, e o sistema **calcula** a data de validade na UI somando `duration_days` à data de contratação (`student_plans.created_at`). Porém:

- A expiração é **derivada em tempo de render**, não persistida — não existe coluna `expires_at`/`end_date` em `student_plans`.
- Não há job/trigger que mude o `status` para `expired` automaticamente; o filtro "Vencidas" (`status = 'expired'`) existe na UI mas depende de alguém atualizar o campo manualmente.
- `total_sessions` (ex.: 4 aulas) é apenas **exibido** no catálogo. Não há contador de aulas restantes no `student_plans`, nem checagem contra `attendance`/`training_reservations` que decremente ou bloqueie ao atingir o limite.

## Tabelas relevantes

As tabelas `plans` e `student_plans` não estão definidas nos arquivos `migrations/` deste repositório (apenas RLS é configurado em `migrations/002_rls_security.sql:17-21`). O schema é inferido pelo uso no código.

### `plans` (catálogo)
Colunas usadas no código:
- `id`, `name`, `description`, `category` (`training` | `physio`), `tier` (`pre_diamond` | `diamond_x`)
- `price` (numeric)
- `duration_days` (int) — `js/pages/admin/plans.js:125,140`
- `total_sessions` (int) — exibido em `js/pages/student/plans.js:73,93` e `js/pages/responsible/plans.js:71,92`. **Não há formulário admin para editar este campo** (`js/pages/admin/plans.js:95-134` não inclui `total_sessions`); foi populado fora do app.
- `active` (bool) — `js/pages/student/plans.js:51`

### `student_plans` (contratações)
Colunas usadas no código:
- `id`, `student_id`, `plan_id`, `purchased_by`, `status`, `created_at`
- `asaas_payment_id` — `supabase/functions/asaas-checkout/index.ts:70`
- Valores de `status`: `pending_payment`, `active`, `expired`, `cancelled` (`js/pages/admin/charges.js:234`).
- **Não existem** `expires_at`, `end_date`, `sessions_remaining`, `sessions_used` ou similares em nenhum insert/select do projeto.

## Como a expiração é calculada hoje

A validade é computada no frontend, no dashboard do aluno (`js/pages/student/dashboard.js:43-68`):

```js
const { data: plans } = await supabase
    .from('student_plans')
    .select('status, created_at, plan:plans(name, duration_days)')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
...
if (currentPlan && currentPlan.status === 'active') {
    const date = new Date(currentPlan.created_at);
    date.setDate(date.getDate() + currentPlan.plan.duration_days);
    validityStr = date.toLocaleDateString('pt-BR');
}
```

Observações:
- O cálculo usa `created_at` da contratação, **não** a data de confirmação de pagamento — embora o status só vire `active` quando o admin confirma (`js/pages/admin/charges.js:213`).
- O cálculo só roda no dashboard do aluno. Nas listas de cobranças (`js/pages/admin/charges.js:152-172`) e nos pagamentos do responsável (`js/pages/responsible/payments.js`) a "validade" não é mostrada.
- Nenhuma rotina marca o `status` como `expired` quando `created_at + duration_days < hoje`. O filtro "Vencidas" em `js/pages/admin/charges.js:31` simplesmente lista quem já tem esse status no banco.

## Fluxo de contratação

Três caminhos criam linhas em `student_plans`, todos com `status: 'pending_payment'` e **sem** preencher data de expiração/quota:

1. **Aluno contrata** — `js/pages/student/plans.js:128-135`:
   ```js
   await supabase.from('student_plans').insert([{
       student_id: userId, plan_id: planId,
       purchased_by: userId, status: 'pending_payment'
   }]);
   ```

2. **Responsável contrata para dependente** — `js/pages/responsible/plans.js:147-168`. Bloqueia se já existir plano `training` ativo para o aluno (linhas 156-158), mas tampouco grava expiração/quota.

3. **Edge Function Asaas** — `supabase/functions/asaas-checkout/index.ts:64-71`. Grava `asaas_payment_id`, sem expiração/quota.

4. **Cobrança manual do admin** — `js/pages/admin/charges.js:107-114`. Apenas insere `student_id`, `purchased_by`, `status` (o comentário linhas 111-113 reconhece a falta de colunas customizadas).

A transição `pending_payment` → `active` é manual via "Confirmar Pagamento" (`js/pages/admin/charges.js:212-219`), que **não** atualiza nenhum campo de validade.

## Quota de aulas (`total_sessions`)

`total_sessions` aparece **somente como texto descritivo** nos catálogos:
- `js/pages/student/plans.js:73,93`
- `js/pages/responsible/plans.js:71,92`

Buscas por `sessions_remaining`, `classes_remaining`, `max_classes` em `js/`, `supabase/` e `migrations/` retornam zero resultados. O fluxo de check-in (`js/pages/student/attendance.js`, `js/qrcode.js`, `migrations/003_training_reservations.sql`) registra presença mas **não** lê ou decrementa qualquer contador no `student_plans`.

Isso significa que, atualmente, um aluno com plano "Basic 4 aulas" pode reservar/comparecer a mais de 4 aulas dentro dos 30 dias sem bloqueio — a quota é meramente informativa.

## Code References

- `js/pages/admin/plans.js:118-127` — formulário admin: `price` e `duration_days` (sem `total_sessions`).
- `js/pages/admin/plans.js:136-145` — persistência do plano no catálogo.
- `js/pages/student/dashboard.js:43-68` — único lugar que calcula `created_at + duration_days` para exibir "Válido até".
- `js/pages/student/plans.js:73,93` — exibição de `duration_days` + `total_sessions` no catálogo do aluno.
- `js/pages/responsible/plans.js:71,92` — mesma exibição na visão do responsável.
- `js/pages/student/plans.js:128-135` — insert da contratação pelo aluno (sem expiração/quota).
- `js/pages/responsible/plans.js:147-168` — insert pelo responsável; valida duplicidade de plano ativo.
- `js/pages/admin/charges.js:107-114` — insert manual pelo admin (placeholder, sem colunas extras).
- `js/pages/admin/charges.js:212-219` — confirma pagamento alterando só o `status`.
- `js/pages/admin/charges.js:234,239` — labels dos status, incluindo `expired`.
- `supabase/functions/asaas-checkout/index.ts:64-71` — insert via Edge Function Asaas.
- `migrations/002_rls_security.sql:17,21,87-135` — RLS de `student_plans` e `plans` (não cria as tabelas).
