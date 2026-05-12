# Spec — Integração Asaas (Pagamentos)

## Contexto
Hoje a compra de plano insere direto em `student_plans` com status `pending_payment` sem gerar cobrança real. Existe `supabase/functions/asaas-checkout/index.ts` mas nunca é chamada (`js/asaas.js` está vazio) e não há webhook para ativar o plano após pagamento confirmado.

## Decisões (do usuário, 2026-05-12)
- **Ambiente:** configurável via env `ASAAS_ENV` (`sandbox` | `production`).
- **Métodos:** PIX e Cartão de Crédito (com parcelas). Boleto fora de escopo.
- **Confirmação:** Webhook Asaas → Edge Function chamando `activate_student_plan` (service_role).
- **Migração:** Substituir totalmente o fluxo atual. Admin mantém opção manual em `charges.js` para retrocompatibilidade operacional.

## Requisitos

### R1 — Schema
- R1.1 `users.asaas_customer_id text` (nullable, único quando preenchido).
- R1.2 `student_plans.asaas_payment_id text` (nullable, único).
- R1.3 `student_plans.asaas_status text` (PENDING|CONFIRMED|RECEIVED|OVERDUE|REFUNDED|CANCELLED).
- R1.4 `student_plans.asaas_invoice_url text` — link Asaas para o aluno acompanhar.
- R1.5 Índices em `asaas_payment_id` e `asaas_customer_id`.

### R2 — Edge Function `asaas-checkout`
- R2.1 Resolver URL base do Asaas pela env `ASAAS_ENV`.
- R2.2 Exigir Authorization Bearer do chamador; validar via `supabase.auth.getUser(token)`.
- R2.3 Aceitar apenas `paymentMethod ∈ {PIX, CREDIT_CARD}`.
- R2.4 Criar/recuperar customer no Asaas (idempotente via `asaas_customer_id`).
- R2.5 Para PIX: buscar QR Code via `/payments/{id}/pixQrCode` e retornar `encodedImage`, `payload`, `expirationDate`.
- R2.6 Para Cartão: retornar `invoiceUrl` (link de pagamento Asaas — sem manipular dados de cartão no app).
- R2.7 Persistir `asaas_payment_id`, `asaas_status='PENDING'`, `asaas_invoice_url`.
- R2.8 Tratamento de erro: traduzir mensagens do Asaas, retornar status HTTP coerente.

### R3 — Edge Function `asaas-webhook` (nova)
- R3.1 Endpoint público; validar header `asaas-access-token` contra secret `ASAAS_WEBHOOK_TOKEN`.
- R3.2 Processar eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_DELETED`.
- R3.3 Localizar `student_plan` por `asaas_payment_id`; atualizar `asaas_status`.
- R3.4 Em `CONFIRMED`/`RECEIVED`: chamar `rpc('activate_student_plan', { p_student_plan_id })` com client service_role.
- R3.5 Em `REFUNDED`/`DELETED`: marcar plano `cancelled`.
- R3.6 Idempotente: ignorar evento se status já está no estado-alvo.
- R3.7 Sempre responder 200 (mesmo em ignorados) para evitar reprocessamento; logar erros.

### R4 — Cliente frontend `js/asaas.js`
- R4.1 `createCheckout({ planId, studentId, paymentMethod, installments })` → `supabase.functions.invoke('asaas-checkout', …)`.
- R4.2 `getPaymentStatus(studentPlanId)` consulta `student_plans.asaas_status` (lê via Supabase).
- R4.3 Tratar erros e expor mensagens amigáveis via `toast`.

### R5 — UI de Checkout
- R5.1 Nova rota `#checkout?sp=<student_plan_id>` (registrada em `app.js`).
- R5.2 PIX: exibir QR Code (img base64), copia-e-cola com botão Copiar, prazo de expiração, status atual.
- R5.3 Cartão: botão "Pagar com cartão" abrindo `invoiceUrl` em nova aba.
- R5.4 Polling do status a cada 5s (máx. 10min); ao confirmar, toast de sucesso e redirect para `#payments`.
- R5.5 Botão "Voltar" mantém cobrança pendente; usuário pode retomar via `#payments`.

### R6 — Fluxo de compra
- R6.1 `pages/student/plans.js` e `pages/responsible/plans.js`: ao confirmar plano, coletar método (PIX|Cartão) e parcelas (se cartão), chamar `createCheckout`, redirecionar para `#checkout?sp=…`.
- R6.2 Remover insert manual em `student_plans` — agora é responsabilidade da Edge Function.
- R6.3 `pages/admin/charges.js`: opção dupla — "Gerar cobrança Asaas" (mesmo fluxo) ou "Marcar como pago manualmente" (insert + activate direto, requer admin).

### R7 — Página de pagamentos
- R7.1 Exibir `asaas_status` traduzido e `invoice_url` quando disponível.
- R7.2 Botão "Continuar pagamento" para `pending_payment` reabre `#checkout?sp=…`.
- R7.3 Botão "Ver fatura" para qualquer status com `invoice_url`.

### R8 — Documentação
- R8.1 README/docs: variáveis necessárias (`ASAAS_API_KEY`, `ASAAS_ENV`, `ASAAS_WEBHOOK_TOKEN`).
- R8.2 Passos para registrar webhook no painel Asaas com URL `https://<project>.supabase.co/functions/v1/asaas-webhook` e o token.
- R8.3 Procedimento de teste em sandbox (cartão de teste Asaas, simulação de confirmação).

## Fora de escopo
- Boleto bancário.
- Tokenização de cartão dentro do app (PCI scope) — usamos invoiceUrl do Asaas.
- Assinaturas recorrentes (`/subscriptions`) — somente cobranças avulsas por plano.
- Reembolso via app — feito no painel Asaas; webhook reflete no banco.

## Riscos
- Webhook público sem autenticação Supabase: depende exclusivamente do token compartilhado. Documentar rotação.
- `activate_student_plan` exige `service_role`; webhook precisa usar service key — não expor.
- Mudança de RLS em `student_plans` se houver insert agora feito por service_role apenas (verificar policies em 002).
