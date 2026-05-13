# Spec — Planos e Regras de Reserva

**Status:** Draft
**Escopo:** Large (schema + RLS + UI + waitlist com notificação)

## Contexto

Diamond X tem hoje `plans` com `name/category/tier/price/duration_days/total_sessions` e reservas com policy de 24h para marcar e sem janela para cancelar. Esta feature:

1. Introduz o conceito de **nível de plano** (Avulsa / Basic / Plus / Pro / Elite) com regras de parcelas e duração padronizadas, mantendo o admin livre para criar planos.
2. Reduz a janela de **marcação para 1h** e introduz **janela de 2h para cancelar**.
3. Cria **waitlist por sessão** com notificação FIFO via push PWA + badge in-app quando uma vaga abre.

## Decisões fixadas (contexto do usuário)

| # | Pergunta | Decisão |
|---|---|---|
| D1 | Planos fixos ou livres? | Livre — admin continua criando planos. Os 5 níveis são convenção via novo campo `kind`. |
| D2 | Combinações | `kind` × `category` (training/physio) × `tier` (pre_diamond/diamond_x) — todas válidas. |
| D3 | total_sessions por kind | Avulsa 1, Basic 4, Plus 6, Pro 8, Elite 12 (sugestão; admin pode editar). |
| D4 | Janela cancelamento | 2h antes do `scheduled_at`. Admin tem override (cancela a qualquer momento). |
| D5 | Captura de interesse | Botão "tenho interesse" independente da tentativa de reservar. |
| D6 | Distribuição da vaga liberada | FIFO — notifica só o 1º da fila, com janela de aceite (30min, default). |
| D7 | Canal de aviso | Push web (Service Worker) + badge/lista no dashboard do aluno. |

## Requisitos

### Planos — REQ-PLAN-*

- **REQ-PLAN-001** — Adicionar coluna `plans.kind` enum (`avulsa|basic|plus|pro|elite|custom`), default `custom`, NOT NULL.
- **REQ-PLAN-002** — Adicionar coluna `plans.max_installments` INT NOT NULL default 1, com CHECK (≥1 e ≤12).
- **REQ-PLAN-003** — Seed inicial dos 5 níveis padrão (cobrindo `category × tier` = 4 combinações cada = 20 registros), com:
  - Avulsa → 1x parcela, 10 dias, 1 aula
  - Basic → 2x parcelas, 30 dias, 4 aulas
  - Plus → 2x parcelas, 45 dias, 6 aulas
  - Pro → 3x parcelas, 60 dias, 8 aulas
  - Elite → 4x parcelas, 75 dias, 12 aulas
  - Preços ficam zerados na seed; admin define.
- **REQ-PLAN-004** — Formulário admin de plano expõe `kind` (select) e `max_installments` (number 1–12). Ao escolher um kind ≠ `custom`, sugerir (não travar) `duration_days`/`total_sessions`/`max_installments` conforme tabela do REQ-PLAN-003.
- **REQ-PLAN-005** — Listagem admin de planos mostra o `kind` como badge.
- **REQ-PLAN-006** — Select de parcelas no checkout (aluno, responsável e cobrança avulsa admin) deve ser limitado a `plans.max_installments` em vez do range fixo 1–12 atual.

### Reservas — REQ-RES-*

- **REQ-RES-001** — Policy de INSERT em `training_reservations`: trocar `scheduled_at >= now() + interval '24 hours'` por `>= now() + interval '1 hour'`.
- **REQ-RES-002** — Policy de UPDATE em `training_reservations` (cancelamento pelo aluno): exigir que `training_sessions.scheduled_at >= now() + interval '2 hours'`. Admin (role admin) ignora a janela.
- **REQ-RES-003** — UI do aluno em [trainings.js](js/pages/student/trainings.js) deve:
  - Esconder/desabilitar botão "marcar" quando `scheduled_at - now < 1h`.
  - Esconder/desabilitar botão "cancelar reserva" quando `scheduled_at - now < 2h`, exibindo toast explicativo.
- **REQ-RES-004** — Mensagem de erro em `trainings.js:252` atualizada (remover "prazo de 24h"); refletir as novas janelas.
- **REQ-RES-005** — Admin pode cancelar reserva de qualquer aluno a qualquer momento via UI administrativa de reservas/sessão.

### Waitlist — REQ-WAIT-*

- **REQ-WAIT-001** — Garantir `training_sessions.capacity` (INT NOT NULL). Se não existir, migrar com default razoável e backfill manual pelo admin.
- **REQ-WAIT-002** — Nova tabela `session_interests`:
  ```
  id UUID PK
  session_id UUID FK → training_sessions
  student_id UUID FK → users
  created_at TIMESTAMPTZ default now()
  status TEXT CHECK (status IN ('waiting','offered','accepted','expired','cancelled'))
  offered_at TIMESTAMPTZ NULL
  expires_at TIMESTAMPTZ NULL
  UNIQUE (session_id, student_id) WHERE status IN ('waiting','offered')
  ```
- **REQ-WAIT-003** — RLS em `session_interests`: aluno gerencia o próprio registro (insert/cancel); admin vê tudo; responsável vê dos seus tutelados.
- **REQ-WAIT-004** — UI do aluno: na sessão, mostrar botão **"TENHO INTERESSE"** sempre que o aluno não tem reserva ativa (independente de a sessão estar lotada ou não). O botão alterna entre estado on/off (`waiting` ↔ `cancelled`).
- **REQ-WAIT-005** — Apenas alunos com plano ativo na categoria da sessão podem entrar na waitlist (mesma regra de quota das reservas).
- **REQ-WAIT-006** — Quando uma reserva é cancelada e a sessão passa de "lotada" para "com vaga":
  - Selecionar o `session_interests` com `status='waiting'` mais antigo (FIFO).
  - Marcar como `status='offered'`, `offered_at=now()`, `expires_at=now() + interval '30 minutes'`.
  - Disparar push + criar registro de aviso visível no dashboard.
- **REQ-WAIT-007** — Aluno pode **aceitar** (cria reserva e marca interesse `accepted`) ou **recusar** (marca `cancelled`) a oferta. Aceite após `expires_at` falha e o sistema oferece ao próximo da fila automaticamente.
- **REQ-WAIT-008** — Job/trigger que, ao expirar uma oferta, repassa para o próximo `waiting` (loop até a fila esvaziar ou alguém aceitar).
- **REQ-WAIT-009** — Push web via Service Worker + endpoint Edge Function para subscribe/notify. Subscriptions persistidas em nova tabela `push_subscriptions(user_id, endpoint, p256dh, auth, created_at)`.
- **REQ-WAIT-010** — Fallback: se o aluno não tiver subscription ativa, mostrar a oferta apenas in-app (badge no header + card no dashboard).

## Fora de escopo

- E-mail / SMS como canais de aviso.
- Migração de planos antigos para `kind != 'custom'` (admin reclassifica manualmente).
- Histórico/relatório de waitlist.

## Rastreabilidade

| Arquivo do código atual | Requisitos que tocam |
|---|---|
| migrations/008_plan_expiration.sql | REQ-PLAN-001, 002 (nova migration) |
| migrations/010_reservation_quota_policy.sql | REQ-RES-001 (nova migration) |
| migrations/003_training_reservations.sql | REQ-RES-002 (nova migration) |
| js/pages/admin/plans.js | REQ-PLAN-004, 005 |
| js/pages/student/plans.js | REQ-PLAN-006 |
| js/pages/responsible/plans.js | REQ-PLAN-006 |
| js/pages/admin/charges.js | REQ-PLAN-006 |
| js/pages/student/trainings.js | REQ-RES-003, 004, REQ-WAIT-004, 007 |
| js/pages/student/dashboard.js | REQ-WAIT-010 |
| service-worker.js | REQ-WAIT-009 |
| (novo) supabase/functions/push-* | REQ-WAIT-009 |

## Pontos de incerteza para o design

- **U1** — `training_sessions.capacity` já existe? Confirmar no schema atual (não vi nas migrations listadas; pode estar em migration anterior fora da pasta).
- **U2** — Vapid keys para push web precisam ser geradas e configuradas como secret no Supabase Edge Functions.
- **U3** — Se duas reservas forem canceladas quase simultaneamente, o "promotion" da fila precisa ser idempotente — provável solução: função SQL `SECURITY DEFINER` chamada por trigger `AFTER UPDATE` na `training_reservations`, com `FOR UPDATE SKIP LOCKED`.
