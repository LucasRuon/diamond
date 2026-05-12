# Tasks — Integração Asaas (Pagamentos)

Tarefas atômicas com dependências. Marcadores: `[P]` = paralelizável com tarefas no mesmo bloco.

## Fase 1 — Fundação (Schema + Edge Functions)

### T1 — Migration 011: schema Asaas
- **What:** Adicionar colunas `asaas_*` em `users` e `student_plans`, índices, CHECK e UNIQUE partials.
- **Where:** `migrations/011_asaas_integration.sql` (novo).
- **Depends on:** —
- **Reuses:** Padrão das migrations 008-010.
- **Done when:** Migration aplica sem erro em sandbox; `\d users` e `\d student_plans` mostram colunas + índices.
- **Tests:** Manual — aplicar e inspecionar schema. Inserir row com `asaas_status` inválido deve falhar.
- **Gate:** R1.1–R1.5 cobertos.

### T2 — [P] Reescrita da Edge Function `asaas-checkout`
- **What:** Reescrever `index.ts` conforme design §2 — validação de JWT, `ASAAS_ENV`, whitelist de método, PIX QR fetch, persistência de `asaas_*` campos, erro estruturado.
- **Where:** `supabase/functions/asaas-checkout/index.ts`.
- **Depends on:** T1 (colunas precisam existir para insert).
- **Reuses:** Estrutura atual do arquivo (CORS, criação de customer).
- **Done when:** `supabase functions serve asaas-checkout` localmente aceita request com Bearer, cria payment no sandbox, retorna QR para PIX e invoiceUrl para CREDIT_CARD; row em `student_plans` criada com IDs corretos.
- **Tests:** Manual com curl + token de teste; verificar erro 401 sem Bearer e 400 com método inválido.
- **Gate:** R2.1–R2.8.

### T3 — [P] Nova Edge Function `asaas-webhook`
- **What:** Criar função que valida `asaas-access-token`, processa eventos, chama RPC `activate_student_plan`, atualiza `asaas_status` e `student_plans.status`, é idempotente.
- **Where:** `supabase/functions/asaas-webhook/index.ts` (novo).
- **Depends on:** T1 (precisa de `asaas_payment_id`, `asaas_status`).
- **Reuses:** Estrutura de `asaas-checkout` para client Supabase com service_role.
- **Done when:** POST simulado com cada evento (`PAYMENT_CONFIRMED`, `RECEIVED`, `OVERDUE`, `REFUNDED`, `DELETED`) produz transição correta. Token errado → 401. Token correto + evento desconhecido → 200 noop. Replay do mesmo evento → 200 noop (idempotente).
- **Tests:** Manual com curl simulando payloads Asaas. Verificar logs.
- **Gate:** R3.1–R3.7.

## Fase 2 — Frontend (Cliente + UI)

### T4 — Cliente `js/asaas.js`
- **What:** Implementar `createCheckout` e `getPaymentStatus` conforme design §4.
- **Where:** `js/asaas.js`.
- **Depends on:** T2.
- **Reuses:** `supabase` client de `js/supabase.js`, `toast` de `js/auth.js`.
- **Done when:** `createCheckout` invoca a Edge Function e retorna `{ studentPlanId, pix, invoiceUrl }`. `getPaymentStatus` retorna a row do `student_plans`. Erros disparam `toast` com mensagem amigável.
- **Tests:** Manual via console — `await createCheckout({ planId, studentId, paymentMethod:'PIX' })` retorna QR no sandbox.
- **Gate:** R4.1–R4.3.

### T5 — Página de Checkout
- **What:** Criar `js/pages/checkout.js` com renderização condicional (PIX vs Cartão), copia-e-cola, polling de 5s, redirect em sucesso, botão Voltar.
- **Where:** `js/pages/checkout.js` (novo). Registrar rota em `js/app.js` (`import`, `case '#checkout'`).
- **Depends on:** T1, T4.
- **Reuses:** `escapeHtml`/`safeUrl` de `js/ui.js`, tokens CSS `--dx-*`.
- **Done when:** Acessando `#checkout?sp=<id>` exibe QR + copia-e-cola (PIX) OU botão de invoiceUrl (cartão); polling detecta confirmação simulada via webhook e redireciona para `#payments`.
- **Tests:** Manual end-to-end no sandbox.
- **Gate:** R5.1–R5.5.

## Fase 3 — Integração nos fluxos existentes

### T6 — [P] Fluxo de compra: student/plans
- **What:** Modal de método (PIX/Cartão + parcelas), chamada a `createCheckout`, redirect para `#checkout`. Remover insert direto.
- **Where:** `js/pages/student/plans.js`.
- **Depends on:** T4, T5.
- **Reuses:** Modal patterns já usados na página.
- **Done when:** Compra de plano cria cobrança Asaas e leva ao checkout; nenhum insert manual em `student_plans` permanece.
- **Tests:** Manual.
- **Gate:** R6.1, R6.2 (parcial).

### T7 — [P] Fluxo de compra: responsible/plans
- **What:** Mesmo de T6, com `studentId` selecionado.
- **Where:** `js/pages/responsible/plans.js`.
- **Depends on:** T4, T5.
- **Reuses:** Lógica de seleção de aluno já existente.
- **Done when:** Responsável compra plano para aluno via Asaas.
- **Tests:** Manual.
- **Gate:** R6.1, R6.2 (parcial).

### T8 — [P] Admin charges: opção dupla
- **What:** Dropdown/botões "Gerar cobrança Asaas" (createCheckout) e "Marcar como pago manualmente" (preservar fluxo atual: insert + `rpc('activate_student_plan')`).
- **Where:** `js/pages/admin/charges.js`.
- **Depends on:** T4, T5.
- **Reuses:** Fluxo manual atual.
- **Done when:** Admin pode escolher entre cobrança Asaas e marcação manual; ambos funcionam.
- **Tests:** Manual.
- **Gate:** R6.3.

### T9 — Página de pagamentos: status Asaas
- **What:** Exibir `asaas_status` traduzido, botão "Continuar pagamento" para pending, botão "Ver fatura" quando há `asaas_invoice_url`.
- **Where:** `js/pages/responsible/payments.js`.
- **Depends on:** T1.
- **Reuses:** Layout e filtros existentes.
- **Done when:** Linhas mostram status traduzido; botão "Continuar pagamento" redireciona para `#checkout?sp=<id>`; "Ver fatura" abre `asaas_invoice_url` em nova aba.
- **Tests:** Manual com plano em estados diferentes.
- **Gate:** R7.1–R7.3.

## Fase 4 — Documentação e fechamento

### T10 — Documentação Asaas
- **What:** Documentar variáveis, deploy, registro de webhook no painel Asaas, procedimento de teste em sandbox, rotação de token.
- **Where:** `docs/asaas.md` (novo) + nota em `README.md`/`CLAUDE.md`.
- **Depends on:** T2, T3 (precisa estarem deployadas para validar passos).
- **Reuses:** —
- **Done when:** Outro dev consegue subir o ambiente seguindo o doc passo a passo.
- **Tests:** Revisão manual — seguir o doc do zero.
- **Gate:** R8.1–R8.3.

### T11 — UAT end-to-end em sandbox
- **What:** Validar fluxo completo: compra (student) → checkout PIX → webhook simulado → ativação → status na página de pagamentos. Repetir para cartão e para cenário OVERDUE/REFUNDED.
- **Where:** Manual no app rodando + sandbox Asaas.
- **Depends on:** T1–T10.
- **Reuses:** —
- **Done when:** Todos os fluxos da spec funcionam sem intervenção manual no banco.
- **Tests:** Checklist por requisito (R1–R8).
- **Gate:** Spec completa.

## Resumo de Dependências

```
T1 ────┬─▶ T2 ──┬─▶ T4 ──┬─▶ T5 ──┬─▶ T6, T7, T8 (P) ──┐
       │        │        │        │                    │
       └─▶ T3 ──┘        └────────┴─▶ T9 ──────────────┼─▶ T11
                                                       │
                                              T10 ─────┘
```

Paralelizáveis:
- T2 ∥ T3 (ambas dependem só de T1)
- T6 ∥ T7 ∥ T8 (dependem de T5)
