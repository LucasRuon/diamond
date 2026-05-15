---
date: 2026-05-15T15:39:44-03:00
researcher: Codex
git_commit: 100549921a6b175f5fe7e3ac51fbb7fb7dd6d522
branch: work
repository: Diamond
topic: "[$research-codebase] fluxo de pagamento, hoje temos cartão de crédito e pix, precisamos adicionar a forma de débito"
tags: [research, codebase, pagamentos, asaas]
status: complete
last_updated: 2026-05-15
last_updated_by: Codex
---

# Research: fluxo de pagamento, hoje temos cartão de crédito e pix, precisamos adicionar a forma de débito

**Date**: 2026-05-15T15:39:44-03:00
**Researcher**: Codex
**Git Commit**: 100549921a6b175f5fe7e3ac51fbb7fb7dd6d522
**Branch**: work
**Repository**: Diamond

## Research Question

[$research-codebase] fluxo de pagamento, hoje temos cartão de crédito e pix, precisamos adicionar a forma de débito

## Scope

Inclui o fluxo de contratação de planos, criação de cobrança Asaas, rota de checkout, telas de faturas/cobranças, webhook de confirmação, migrations de `student_plans`/Asaas, documentação operacional e specs históricas relacionadas a pagamentos. Exclui validação externa na documentação da Asaas e execução real de cobrança sandbox/prod; a pesquisa é baseada no código vivo local.

Assumido escopo mínimo: mapear onde os métodos de pagamento atuais são definidos e como o método escolhido percorre UI -> Edge Function -> Asaas -> `student_plans` -> webhook/faturas.

## Summary

O fluxo atual usa Asaas via Edge Function `asaas-checkout`. As telas que coletam método de pagamento oferecem apenas `PIX` e `CREDIT_CARD` para atleta, responsável e administrador (`js/pages/student/plans.js:113`, `js/pages/student/plans.js:114`, `js/pages/student/plans.js:115`, `js/pages/responsible/plans.js:122`, `js/pages/responsible/plans.js:123`, `js/pages/responsible/plans.js:124`, `js/pages/admin/charges.js:96`, `js/pages/admin/charges.js:97`, `js/pages/admin/charges.js:98`).

O cliente `createCheckout()` repassa `paymentMethod` para `supabase.functions.invoke('asaas-checkout')` (`js/asaas.js:14`, `js/asaas.js:19`, `js/asaas.js:23`). A Edge Function valida o método contra `ALLOWED_METHODS = new Set(["PIX", "CREDIT_CARD"])`; qualquer outro valor retorna `invalid_payment_method` com HTTP 400 (`supabase/functions/asaas-checkout/index.ts:23`, `supabase/functions/asaas-checkout/index.ts:66`, `supabase/functions/asaas-checkout/index.ts:67`, `supabase/functions/asaas-checkout/index.ts:68`).

No código vivo não há ocorrência de `debit`, `débito`, `DEBIT` ou equivalente. Também não há coluna local dedicada para armazenar o método usado; a cobrança persistida em `student_plans` guarda `asaas_payment_id`, `asaas_status` e `asaas_invoice_url` (`migrations/011_asaas_integration.sql:18`, `migrations/011_asaas_integration.sql:19`, `migrations/011_asaas_integration.sql:20`, `migrations/011_asaas_integration.sql:21`, `supabase/functions/asaas-checkout/index.ts:195`, `supabase/functions/asaas-checkout/index.ts:199`, `supabase/functions/asaas-checkout/index.ts:200`, `supabase/functions/asaas-checkout/index.ts:201`).

## Detailed Findings

### Roteamento e entrada do fluxo

- A SPA registra as páginas de planos, faturas e checkout no roteador por hash (`js/app.js:383`, `js/app.js:384`, `js/app.js:385`).
- `renderPlans()` direciona `#plans` para `adminPlans`, `responsiblePlans` ou `studentPlans` conforme o papel do usuário (`js/app.js:711`, `js/app.js:712`, `js/app.js:713`, `js/app.js:714`).
- `renderPayments()` direciona `#payments` para `adminCharges`, `studentPayments` ou `responsiblePayments` (`js/app.js:717`, `js/app.js:718`, `js/app.js:719`, `js/app.js:720`, `js/app.js:721`).
- A bottom nav do atleta expõe `#plans` e coloca `#payments` dentro do menu "Mais"; a nav de responsável expõe `#plans` e `#payments` diretamente; a nav de admin coloca `#payments` no menu "Mais" como "Cobranças" (`js/app.js:1177`, `js/app.js:1181`, `js/app.js:1187`, `js/app.js:1188`, `js/app.js:1191`, `js/app.js:1193`, `js/app.js:1198`, `js/app.js:1225`, `js/app.js:1227`, `js/app.js:1230`).

### Seleção de método no atleta

- A tela do atleta lista planos ativos por categoria em `plans`, filtrando `active = true` e `category = currentCategory` (`js/pages/student/plans.js:50`, `js/pages/student/plans.js:51`, `js/pages/student/plans.js:52`, `js/pages/student/plans.js:53`, `js/pages/student/plans.js:54`, `js/pages/student/plans.js:55`).
- Ao clicar em `CONTRATAR AGORA`, `purchasePlan()` busca `max_installments` do plano para montar opções de parcelamento (`js/pages/student/plans.js:80`, `js/pages/student/plans.js:92`, `js/pages/student/plans.js:98`, `js/pages/student/plans.js:102`, `js/pages/student/plans.js:103`, `js/pages/student/plans.js:104`).
- O formulário do checkout do atleta contém `FORMA DE PAGAMENTO` com apenas `<option value="PIX">PIX</option>` e `<option value="CREDIT_CARD">Cartão de Crédito</option>` (`js/pages/student/plans.js:111`, `js/pages/student/plans.js:112`, `js/pages/student/plans.js:113`, `js/pages/student/plans.js:114`, `js/pages/student/plans.js:115`).
- A UI de parcelas aparece somente quando `methodSel.value === 'CREDIT_CARD'` (`js/pages/student/plans.js:145`, `js/pages/student/plans.js:146`, `js/pages/student/plans.js:167`, `js/pages/student/plans.js:168`, `js/pages/student/plans.js:169`).
- O submit chama `createCheckout({ planId, studentId: userId, paymentMethod, installments })` e redireciona para `#checkout?sp=<studentPlanId>` (`js/pages/student/plans.js:149`, `js/pages/student/plans.js:150`, `js/pages/student/plans.js:151`, `js/pages/student/plans.js:152`, `js/pages/student/plans.js:153`, `js/pages/student/plans.js:158`).

### Seleção de método no responsável

- O módulo de responsável tem `showPurchaseForm(planId, planName)`, busca o usuário atual e vínculos em `responsible_students`, depois monta um formulário com beneficiário e método de pagamento (`js/pages/responsible/plans.js:95`, `js/pages/responsible/plans.js:96`, `js/pages/responsible/plans.js:97`, `js/pages/responsible/plans.js:98`, `js/pages/responsible/plans.js:99`, `js/pages/responsible/plans.js:108`, `js/pages/responsible/plans.js:112`).
- O seletor de método do responsável também contém apenas `PIX` e `CREDIT_CARD` (`js/pages/responsible/plans.js:120`, `js/pages/responsible/plans.js:121`, `js/pages/responsible/plans.js:122`, `js/pages/responsible/plans.js:123`, `js/pages/responsible/plans.js:124`).
- Parcelas são consideradas somente para `CREDIT_CARD` (`js/pages/responsible/plans.js:155`, `js/pages/responsible/plans.js:156`, `js/pages/responsible/plans.js:170`, `js/pages/responsible/plans.js:171`, `js/pages/responsible/plans.js:172`).
- O submit do responsável chama `createCheckout({ planId, studentId: data.student_id, paymentMethod, installments })`, salva o PIX em cache do checkout quando existe e navega para `#checkout?sp=<studentPlanId>` (`js/pages/responsible/plans.js:158`, `js/pages/responsible/plans.js:159`, `js/pages/responsible/plans.js:160`, `js/pages/responsible/plans.js:161`, `js/pages/responsible/plans.js:162`, `js/pages/responsible/plans.js:164`, `js/pages/responsible/plans.js:166`).
- No render atual do catálogo de responsável, `loadPlans()` monta cards Diamond X como `EM BREVE`, e `setupPurchaseEvents()` procura `.buy-plan-btn` (`js/pages/responsible/plans.js:64`, `js/pages/responsible/plans.js:66`, `js/pages/responsible/plans.js:77`, `js/pages/responsible/plans.js:78`, `js/pages/responsible/plans.js:89`, `js/pages/responsible/plans.js:90`, `js/pages/responsible/plans.js:91`).

### Seleção de método no admin

- `adminCharges.showAddChargeForm()` carrega atletas e planos ativos para abrir a bottom sheet de nova cobrança (`js/pages/admin/charges.js:61`, `js/pages/admin/charges.js:63`, `js/pages/admin/charges.js:64`, `js/pages/admin/charges.js:65`).
- O formulário administrativo tem dois modos: `Gerar cobrança Asaas` e `Marcar como pago manualmente` (`js/pages/admin/charges.js:85`, `js/pages/admin/charges.js:86`, `js/pages/admin/charges.js:87`, `js/pages/admin/charges.js:88`, `js/pages/admin/charges.js:89`).
- No modo Asaas, o seletor de método administrativo contém apenas `PIX` e `CREDIT_CARD` (`js/pages/admin/charges.js:94`, `js/pages/admin/charges.js:95`, `js/pages/admin/charges.js:96`, `js/pages/admin/charges.js:97`, `js/pages/admin/charges.js:98`).
- O fluxo manual insere uma linha em `student_plans` com `status: 'pending_payment'` e chama `activate_student_plan`; ele não usa método Asaas (`js/pages/admin/charges.js:118`, `js/pages/admin/charges.js:120`, `js/pages/admin/charges.js:121`, `js/pages/admin/charges.js:126`, `js/pages/admin/charges.js:132`, `js/pages/admin/charges.js:133`).
- O fluxo Asaas administrativo usa `paymentMethod = data.payment_method`, considera parcelas apenas para `CREDIT_CARD` e chama `createCheckout()` com os mesmos campos do atleta/responsável (`js/pages/admin/charges.js:142`, `js/pages/admin/charges.js:143`, `js/pages/admin/charges.js:144`, `js/pages/admin/charges.js:145`, `js/pages/admin/charges.js:146`, `js/pages/admin/charges.js:147`, `js/pages/admin/charges.js:148`, `js/pages/admin/charges.js:149`).

### Cliente frontend Asaas

- `js/asaas.js` documenta `paymentMethod` como `'PIX'|'CREDIT_CARD'` (`js/asaas.js:8`, `js/asaas.js:9`, `js/asaas.js:10`, `js/asaas.js:11`, `js/asaas.js:12`).
- `createCheckout()` exige `planId`, `studentId` e `paymentMethod`, invoca `asaas-checkout` via Supabase Functions e envia `installments` somente quando maior que 1 (`js/asaas.js:14`, `js/asaas.js:15`, `js/asaas.js:19`, `js/asaas.js:20`, `js/asaas.js:21`, `js/asaas.js:22`, `js/asaas.js:23`, `js/asaas.js:24`).
- A função traduz erro da Edge Function para toast e relança o erro (`js/asaas.js:28`, `js/asaas.js:30`, `js/asaas.js:34`, `js/asaas.js:35`, `js/asaas.js:38`, `js/asaas.js:39`, `js/asaas.js:42`, `js/asaas.js:43`, `js/asaas.js:44`).
- `getPaymentStatus()` consulta `student_plans` por `id` e lê `status`, `asaas_status`, `asaas_invoice_url` e `asaas_payment_id` (`js/asaas.js:54`, `js/asaas.js:56`, `js/asaas.js:57`, `js/asaas.js:58`, `js/asaas.js:59`).

### Edge Function `asaas-checkout`

- A função lê `ASAAS_API_KEY`, `ASAAS_ENV`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY`; `ASAAS_ENV` alterna entre URL sandbox e produção (`supabase/functions/asaas-checkout/index.ts:4`, `supabase/functions/asaas-checkout/index.ts:5`, `supabase/functions/asaas-checkout/index.ts:6`, `supabase/functions/asaas-checkout/index.ts:7`, `supabase/functions/asaas-checkout/index.ts:8`, `supabase/functions/asaas-checkout/index.ts:9`, `supabase/functions/asaas-checkout/index.ts:11`, `supabase/functions/asaas-checkout/index.ts:12`, `supabase/functions/asaas-checkout/index.ts:13`).
- `ALLOWED_METHODS` contém somente `PIX` e `CREDIT_CARD` (`supabase/functions/asaas-checkout/index.ts:23`).
- A função exige `POST`, valida Bearer via `supabase.auth.getUser(token)` e rejeita ausência/invalidade de token (`supabase/functions/asaas-checkout/index.ts:43`, `supabase/functions/asaas-checkout/index.ts:44`, `supabase/functions/asaas-checkout/index.ts:49`, `supabase/functions/asaas-checkout/index.ts:50`, `supabase/functions/asaas-checkout/index.ts:51`, `supabase/functions/asaas-checkout/index.ts:53`, `supabase/functions/asaas-checkout/index.ts:56`, `supabase/functions/asaas-checkout/index.ts:57`).
- O body esperado é `{ planId, studentId, paymentMethod, installments }`; o método é convertido para uppercase e validado contra `ALLOWED_METHODS` (`supabase/functions/asaas-checkout/index.ts:61`, `supabase/functions/asaas-checkout/index.ts:62`, `supabase/functions/asaas-checkout/index.ts:63`, `supabase/functions/asaas-checkout/index.ts:66`, `supabase/functions/asaas-checkout/index.ts:67`, `supabase/functions/asaas-checkout/index.ts:68`).
- A permissão aceita o próprio aluno, admin, responsible ou businessman como chamador (`supabase/functions/asaas-checkout/index.ts:82`, `supabase/functions/asaas-checkout/index.ts:83`, `supabase/functions/asaas-checkout/index.ts:84`, `supabase/functions/asaas-checkout/index.ts:85`, `supabase/functions/asaas-checkout/index.ts:86`, `supabase/functions/asaas-checkout/index.ts:87`, `supabase/functions/asaas-checkout/index.ts:88`).
- O customer Asaas é criado quando `student.asaas_customer_id` está ausente, ou atualizado quando já existe (`supabase/functions/asaas-checkout/index.ts:91`, `supabase/functions/asaas-checkout/index.ts:98`, `supabase/functions/asaas-checkout/index.ts:99`, `supabase/functions/asaas-checkout/index.ts:100`, `supabase/functions/asaas-checkout/index.ts:113`, `supabase/functions/asaas-checkout/index.ts:114`, `supabase/functions/asaas-checkout/index.ts:115`, `supabase/functions/asaas-checkout/index.ts:118`, `supabase/functions/asaas-checkout/index.ts:124`).
- O payload enviado ao Asaas `/payments` usa `billingType: method`, `value: plan.price`, vencimento D+3, descrição do plano e `externalReference: studentId` (`supabase/functions/asaas-checkout/index.ts:135`, `supabase/functions/asaas-checkout/index.ts:136`, `supabase/functions/asaas-checkout/index.ts:140`, `supabase/functions/asaas-checkout/index.ts:141`, `supabase/functions/asaas-checkout/index.ts:142`, `supabase/functions/asaas-checkout/index.ts:143`, `supabase/functions/asaas-checkout/index.ts:144`, `supabase/functions/asaas-checkout/index.ts:145`, `supabase/functions/asaas-checkout/index.ts:146`).
- Parcelamento (`installmentCount` e `totalValue`) só é adicionado se `method === "CREDIT_CARD"` e `installments > 1` (`supabase/functions/asaas-checkout/index.ts:148`, `supabase/functions/asaas-checkout/index.ts:149`, `supabase/functions/asaas-checkout/index.ts:150`).
- A função busca QR Code apenas quando `method === "PIX"` (`supabase/functions/asaas-checkout/index.ts:166`, `supabase/functions/asaas-checkout/index.ts:167`, `supabase/functions/asaas-checkout/index.ts:168`, `supabase/functions/asaas-checkout/index.ts:169`, `supabase/functions/asaas-checkout/index.ts:170`).
- A persistência cria `student_plans` com `student_id`, `plan_id`, `purchased_by`, `status: "pending_payment"`, `asaas_payment_id`, `asaas_status: "PENDING"` e `asaas_invoice_url`; o método de pagamento não é gravado nesse insert (`supabase/functions/asaas-checkout/index.ts:189`, `supabase/functions/asaas-checkout/index.ts:190`, `supabase/functions/asaas-checkout/index.ts:191`, `supabase/functions/asaas-checkout/index.ts:192`, `supabase/functions/asaas-checkout/index.ts:195`, `supabase/functions/asaas-checkout/index.ts:196`, `supabase/functions/asaas-checkout/index.ts:197`, `supabase/functions/asaas-checkout/index.ts:198`, `supabase/functions/asaas-checkout/index.ts:199`, `supabase/functions/asaas-checkout/index.ts:200`, `supabase/functions/asaas-checkout/index.ts:201`).

### Checkout e retomada de pagamento

- A página `checkoutPage.render(studentPlanId)` carrega `student_plans` com `asaas_status`, `asaas_invoice_url`, `asaas_payment_id` e o plano relacionado (`js/pages/checkout.js:14`, `js/pages/checkout.js:55`, `js/pages/checkout.js:56`, `js/pages/checkout.js:57`, `js/pages/checkout.js:58`, `js/pages/checkout.js:59`).
- O checkout considera pago quando `student_plans.status === 'active'` ou `asaas_status` é `CONFIRMED`/`RECEIVED` (`js/pages/checkout.js:69`, `js/pages/checkout.js:70`, `js/pages/checkout.js:72`, `js/pages/checkout.js:76`, `js/pages/checkout.js:77`).
- Para PIX, o QR Code só é exibido quando `checkoutPage.cachedPix` contém dados da criação inicial da cobrança (`js/pages/checkout.js:84`, `js/pages/checkout.js:85`, `js/pages/checkout.js:86`, `js/pages/checkout.js:87`, `js/pages/checkout.js:96`, `js/pages/checkout.js:117`, `js/pages/checkout.js:121`, `js/pages/checkout.js:122`).
- Para cobranças com `asaas_invoice_url`, a tela mostra um único botão `ABRIR FATURA / PAGAR` com ícone de cartão de crédito, sem ramificação explícita por método persistido (`js/pages/checkout.js:98`, `js/pages/checkout.js:99`, `js/pages/checkout.js:100`).
- O polling consulta `getPaymentStatus()` a cada 5s por até 120 ticks e redireciona para `#payments` quando a cobrança fica ativa/confirmada/recebida (`js/pages/checkout.js:6`, `js/pages/checkout.js:7`, `js/pages/checkout.js:160`, `js/pages/checkout.js:163`, `js/pages/checkout.js:170`, `js/pages/checkout.js:172`, `js/pages/checkout.js:173`, `js/pages/checkout.js:174`, `js/pages/checkout.js:175`).
- `studentPayments` e `responsiblePayments` listam faturas de `student_plans`, exibem status Asaas traduzido, `CONTINUAR PAGAMENTO` para pendências e `VER FATURA` quando há `asaas_invoice_url` (`js/pages/student/payments.js:28`, `js/pages/student/payments.js:29`, `js/pages/student/payments.js:35`, `js/pages/student/payments.js:36`, `js/pages/student/payments.js:99`, `js/pages/student/payments.js:104`, `js/pages/student/payments.js:105`, `js/pages/student/payments.js:109`, `js/pages/student/payments.js:110`, `js/pages/responsible/payments.js:26`, `js/pages/responsible/payments.js:27`, `js/pages/responsible/payments.js:33`, `js/pages/responsible/payments.js:34`, `js/pages/responsible/payments.js:102`, `js/pages/responsible/payments.js:107`, `js/pages/responsible/payments.js:108`, `js/pages/responsible/payments.js:112`, `js/pages/responsible/payments.js:113`).
- O dashboard do atleta também busca a fatura pendente mais recente e mostra ações `CONTINUAR PAGAMENTO`, `VER FATURA` ou `VER FATURAS` (`js/pages/student/dashboard.js:90`, `js/pages/student/dashboard.js:95`, `js/pages/student/dashboard.js:96`, `js/pages/student/dashboard.js:100`, `js/pages/student/dashboard.js:101`, `js/pages/student/dashboard.js:105`, `js/pages/student/dashboard.js:149`, `js/pages/student/dashboard.js:152`, `js/pages/student/dashboard.js:153`, `js/pages/student/dashboard.js:157`).

### Webhook e ativação do plano

- `asaas-webhook` mapeia `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED` para ativação, `PAYMENT_OVERDUE` para atraso, e `PAYMENT_REFUNDED`/`PAYMENT_DELETED` para cancelamento (`supabase/functions/asaas-webhook/index.ts:15`, `supabase/functions/asaas-webhook/index.ts:16`, `supabase/functions/asaas-webhook/index.ts:17`, `supabase/functions/asaas-webhook/index.ts:18`, `supabase/functions/asaas-webhook/index.ts:19`, `supabase/functions/asaas-webhook/index.ts:20`).
- O webhook valida `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN` e ignora métodos que não são `POST` (`supabase/functions/asaas-webhook/index.ts:48`, `supabase/functions/asaas-webhook/index.ts:50`, `supabase/functions/asaas-webhook/index.ts:51`, `supabase/functions/asaas-webhook/index.ts:52`, `supabase/functions/asaas-webhook/index.ts:53`, `supabase/functions/asaas-webhook/index.ts:54`).
- O pagamento é localizado por `student_plans.asaas_payment_id` (`supabase/functions/asaas-webhook/index.ts:82`, `supabase/functions/asaas-webhook/index.ts:83`, `supabase/functions/asaas-webhook/index.ts:84`, `supabase/functions/asaas-webhook/index.ts:85`, `supabase/functions/asaas-webhook/index.ts:86`, `supabase/functions/asaas-webhook/index.ts:87`).
- Em confirmação/recebimento, o webhook chama `activate_student_plan` se o domínio ainda está `pending_payment`, depois atualiza `asaas_status` (`supabase/functions/asaas-webhook/index.ts:109`, `supabase/functions/asaas-webhook/index.ts:111`, `supabase/functions/asaas-webhook/index.ts:112`, `supabase/functions/asaas-webhook/index.ts:113`, `supabase/functions/asaas-webhook/index.ts:119`, `supabase/functions/asaas-webhook/index.ts:120`, `supabase/functions/asaas-webhook/index.ts:121`).
- A RPC `activate_student_plan` só aceita admin ou `service_role`, exige status inicial `pending_payment`, calcula vigência considerando planos ativos anteriores da mesma categoria e atualiza `status`, `activated_at`, `start_at` e `expires_at` (`migrations/009_activate_student_plan_rpc.sql:14`, `migrations/009_activate_student_plan_rpc.sql:20`, `migrations/009_activate_student_plan_rpc.sql:39`, `migrations/009_activate_student_plan_rpc.sql:43`, `migrations/009_activate_student_plan_rpc.sql:44`, `migrations/009_activate_student_plan_rpc.sql:56`, `migrations/009_activate_student_plan_rpc.sql:57`, `migrations/009_activate_student_plan_rpc.sql:58`, `migrations/009_activate_student_plan_rpc.sql:59`, `migrations/009_activate_student_plan_rpc.sql:60`).

### Schema e RLS relacionados

- `migrations/011_asaas_integration.sql` adiciona `users.asaas_customer_id` e colunas Asaas em `student_plans`: `asaas_payment_id`, `asaas_status` e `asaas_invoice_url` (`migrations/011_asaas_integration.sql:8`, `migrations/011_asaas_integration.sql:9`, `migrations/011_asaas_integration.sql:10`, `migrations/011_asaas_integration.sql:17`, `migrations/011_asaas_integration.sql:18`, `migrations/011_asaas_integration.sql:19`, `migrations/011_asaas_integration.sql:20`, `migrations/011_asaas_integration.sql:21`).
- A mesma migration cria índice único parcial para `asaas_payment_id` e check de `asaas_status` limitado a `PENDING`, `CONFIRMED`, `RECEIVED`, `OVERDUE`, `REFUNDED` e `CANCELLED` (`migrations/011_asaas_integration.sql:23`, `migrations/011_asaas_integration.sql:24`, `migrations/011_asaas_integration.sql:25`, `migrations/011_asaas_integration.sql:33`, `migrations/011_asaas_integration.sql:38`, `migrations/011_asaas_integration.sql:41`, `migrations/011_asaas_integration.sql:42`, `migrations/011_asaas_integration.sql:43`, `migrations/011_asaas_integration.sql:44`, `migrations/011_asaas_integration.sql:45`, `migrations/011_asaas_integration.sql:46`, `migrations/011_asaas_integration.sql:47`).
- `migrations/013_plan_kind_installments.sql` adiciona `plans.max_installments` com check entre 1 e 12; essa coluna alimenta os seletores de parcelas do cartão (`migrations/013_plan_kind_installments.sql:11`, `migrations/013_plan_kind_installments.sql:12`, `migrations/013_plan_kind_installments.sql:13`, `migrations/013_plan_kind_installments.sql:14`).
- `migrations/019_plans_active_flag.sql` adiciona `plans.active`, usada pelas telas de catálogo e cobrança para listar planos disponíveis (`migrations/019_plans_active_flag.sql:1`, `migrations/019_plans_active_flag.sql:6`, `migrations/019_plans_active_flag.sql:7`, `js/pages/student/plans.js:53`, `js/pages/admin/charges.js:65`).
- A RLS de `student_plans` permite SELECT para aluno, comprador ou admin; INSERT quando `student_id = auth.uid()`, `purchased_by = auth.uid()` ou admin; UPDATE apenas para admin. A Edge Function usa service role, que opera fora dessas policies (`migrations/002_rls_security.sql:87`, `migrations/002_rls_security.sql:94`, `migrations/002_rls_security.sql:97`, `migrations/002_rls_security.sql:98`, `migrations/002_rls_security.sql:99`, `migrations/002_rls_security.sql:104`, `migrations/002_rls_security.sql:107`, `migrations/002_rls_security.sql:108`, `migrations/002_rls_security.sql:109`, `migrations/002_rls_security.sql:114`, `migrations/002_rls_security.sql:117`, `migrations/002_rls_security.sql:118`).

### Configuração operacional

- `supabase/config.toml` desativa a verificação JWT automática para `asaas-checkout` e `asaas-webhook` porque essas funções autenticam por conta própria (`supabase/config.toml:1`, `supabase/config.toml:4`, `supabase/config.toml:5`, `supabase/config.toml:9`, `supabase/config.toml:10`, `supabase/config.toml:12`, `supabase/config.toml:13`).
- `docs/asaas.md` lista os secrets `ASAAS_API_KEY`, `ASAAS_ENV`, `ASAAS_WEBHOOK_TOKEN` e `SUPABASE_SERVICE_ROLE_KEY` (`docs/asaas.md:7`, `docs/asaas.md:9`, `docs/asaas.md:11`, `docs/asaas.md:12`, `docs/asaas.md:13`, `docs/asaas.md:14`).
- O mesmo documento descreve deploy de `asaas-checkout` e `asaas-webhook`, registro do webhook no painel Asaas e testes sandbox para PIX e cartão (`docs/asaas.md:31`, `docs/asaas.md:34`, `docs/asaas.md:35`, `docs/asaas.md:45`, `docs/asaas.md:48`, `docs/asaas.md:50`, `docs/asaas.md:63`, `docs/asaas.md:66`, `docs/asaas.md:67`, `docs/asaas.md:68`, `docs/asaas.md:69`, `docs/asaas.md:70`).

## Code References

- `js/pages/student/plans.js:113` - Select de forma de pagamento do atleta.
- `js/pages/responsible/plans.js:122` - Select de forma de pagamento do responsável.
- `js/pages/admin/charges.js:96` - Select de forma de pagamento do admin no modo Asaas.
- `js/asaas.js:11` - Tipo documentado de `paymentMethod` no frontend.
- `js/asaas.js:19` - Chamada para `supabase.functions.invoke('asaas-checkout')`.
- `supabase/functions/asaas-checkout/index.ts:23` - Whitelist atual de métodos aceitos.
- `supabase/functions/asaas-checkout/index.ts:142` - `billingType` enviado ao Asaas recebe o método validado.
- `supabase/functions/asaas-checkout/index.ts:148` - Parcelamento limitado ao método `CREDIT_CARD`.
- `supabase/functions/asaas-checkout/index.ts:168` - QR Code limitado ao método `PIX`.
- `supabase/functions/asaas-checkout/index.ts:192` - Inserção em `student_plans` após criar cobrança.
- `js/pages/checkout.js:58` - Checkout lê status, invoice URL e payment ID da cobrança.
- `supabase/functions/asaas-webhook/index.ts:15` - Mapa de eventos Asaas para status/side effects.
- `migrations/011_asaas_integration.sql:18` - Colunas Asaas persistidas em `student_plans`.
- `migrations/013_plan_kind_installments.sql:13` - Limite de parcelas configurável por plano.
- `docs/asaas.md:67` - Documento operacional cita teste PIX.
- `docs/asaas.md:68` - Documento operacional cita teste cartão.

## Architecture Documentation

O fluxo de pagamento atual é direto entre frontend e Edge Function:

`#plans` ou admin `#payments` -> formulário de método (`PIX` ou `CREDIT_CARD`) -> `createCheckout()` -> `supabase.functions.invoke('asaas-checkout')` -> validação de usuário -> criação/atualização de customer Asaas -> POST `/payments` com `billingType` -> insert em `student_plans` -> redirect `#checkout?sp=<id>`.

A confirmação é assíncrona:

`Asaas webhook` -> `asaas-webhook` -> lookup por `asaas_payment_id` -> `activate_student_plan()` quando confirmado/recebido -> atualização de `asaas_status` -> polling do checkout ou telas de faturas refletem o novo status.

O domínio interno não modela "método de pagamento" como campo próprio. O método existe como valor transitório de formulário/payload até a criação da cobrança no Asaas. Depois, as telas trabalham com `student_plans.status`, `student_plans.asaas_status`, `student_plans.asaas_invoice_url` e `student_plans.asaas_payment_id`.

## Historical Context

- `.specs/features/asaas-payments/spec.md` definiu explicitamente que os métodos do projeto Asaas seriam "PIX e Cartão de Crédito (com parcelas)" e que boleto ficou fora de escopo (`.specs/features/asaas-payments/spec.md:6`, `.specs/features/asaas-payments/spec.md:8`, `.specs/features/asaas-payments/spec.md:67`, `.specs/features/asaas-payments/spec.md:68`).
- `.specs/features/asaas-payments/design.md` descreve a arquitetura atual e registra a whitelist `paymentMethod ∈ {PIX, CREDIT_CARD}` (`.specs/features/asaas-payments/design.md:9`, `.specs/features/asaas-payments/design.md:11`, `.specs/features/asaas-payments/design.md:42`, `.specs/features/asaas-payments/design.md:48`).
- `.specs/features/asaas-payments/tasks.md` registra como critério de validação da Edge Function retornar QR para PIX e `invoiceUrl` para `CREDIT_CARD` (`.specs/features/asaas-payments/tasks.md:16`, `.specs/features/asaas-payments/tasks.md:21`).
- A spec original `spec (1).md` citava `allowed_payment_methods` com `["pix","boleto","credit_card"]`, contratação com PIX/boleto/cartão e `billingType: PIX | BOLETO | CREDIT_CARD` (`spec (1).md:111`, `spec (1).md:114`, `spec (1).md:227`, `spec (1).md:229`, `spec (1).md:283`, `spec (1).md:285`, `spec (1).md:310`, `spec (1).md:315`). Esse documento não corresponde ao código vivo atual para boleto e não cita débito.
- `docs/legado/research/2026-05-05-admin-financeiro-cobrancas-screen.md` registrou um estado anterior em que `js/asaas.js` estava vazio; no código vivo atual esse arquivo já implementa `createCheckout()` e `getPaymentStatus()` (`docs/legado/research/2026-05-05-admin-financeiro-cobrancas-screen.md:103`, `docs/legado/research/2026-05-05-admin-financeiro-cobrancas-screen.md:104`, `js/asaas.js:14`, `js/asaas.js:54`).

## Related Research

- `docs/legado/research/2026-05-05-admin-financeiro-cobrancas-screen.md`
- `docs/legado/research/2026-05-11-expiracao-planos-contratados.md`
- `docs/legado/research/2026-05-09-project-inventory.md`
- `docs/research/2026-05-15-training-reservations-post-500.md`

## Open Questions

- Qual constante/payload a Asaas deve receber para pagamento em débito, se essa modalidade for suportada no endpoint de cobranças usado hoje?
- O débito deve aparecer nas três entradas atuais do fluxo (`student/plans`, `responsible/plans`, `admin/charges`) ou apenas em algumas delas?
- Débito deve usar o mesmo `asaas_invoice_url` genérico exibido hoje para cartão, ou precisa de uma experiência de checkout diferente?
- O domínio precisa armazenar o método escolhido em `student_plans` para diferenciar crédito, débito e PIX após a criação da cobrança?
- Débito aceita parcelamento neste produto ou deve ser tratado como pagamento à vista?
