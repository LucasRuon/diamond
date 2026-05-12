# Design — Integração Asaas (Pagamentos)

## Visão Geral

Substituição completa do fluxo atual de compra de plano. Hoje `plans.js` (student/responsible) faz `insert` direto em `student_plans` com `status='pending_payment'` — sem cobrança real. Após este projeto, qualquer compra passa pela Edge Function `asaas-checkout`, que cria customer + payment no Asaas e persiste IDs. Confirmação vem via webhook (`asaas-webhook`) que chama a RPC `activate_student_plan` com `service_role`.

## Arquitetura

```
┌────────────────────┐      ┌──────────────────────┐      ┌──────────────┐
│ student/responsible│─────▶│ asaas-checkout       │─────▶│  Asaas API   │
│   plans.js (UI)    │ JWT  │ (Edge Function)      │      │  /customers  │
│                    │      │ - valida user        │      │  /payments   │
└────────┬───────────┘      │ - cria/recupera cust │      │  /pixQrCode  │
         │ redirect          │ - cria payment       │      └──────┬───────┘
         ▼                   │ - insert student_plan│             │
┌────────────────────┐      └──────────────────────┘             │
│ checkout.js (nova) │              ▲                            │
│ - QR Code PIX      │              │ poll status                │
│ - invoiceUrl cartão│──────────────┘                            │
│ - polling 5s       │                                           │
└────────────────────┘                                           │
                                                                 ▼ webhook
┌────────────────────┐      ┌──────────────────────┐
│  student_plans     │◀─────│ asaas-webhook (nova) │
│  asaas_status      │ RPC  │ - valida token       │
│  asaas_*           │      │ - activate_*_plan    │
└────────────────────┘      └──────────────────────┘
```

## Componentes

### 1. Schema (migration 011)
Novo arquivo `migrations/011_asaas_integration.sql`:
- `ALTER TABLE users ADD COLUMN asaas_customer_id text` + UNIQUE constraint partial (`WHERE asaas_customer_id IS NOT NULL`).
- `ALTER TABLE student_plans ADD COLUMN asaas_payment_id text`, `asaas_status text`, `asaas_invoice_url text`.
- UNIQUE em `student_plans.asaas_payment_id` (partial).
- Índices em ambos campos.
- CHECK constraint para `asaas_status` (PENDING|CONFIRMED|RECEIVED|OVERDUE|REFUNDED|CANCELLED|NULL).
- RLS revisão: garantir que `student_plans` permita INSERT por `service_role` (já permite por padrão — RLS é skipped para service_role).

### 2. Edge Function `asaas-checkout` (reescrita)
Arquivo: `supabase/functions/asaas-checkout/index.ts`.

Mudanças vs. atual:
- Validar Authorization Bearer via `supabase.auth.getUser(token)` antes de qualquer side effect.
- URL base resolvida por `Deno.env.get('ASAAS_ENV')` (`sandbox` → `https://sandbox.asaas.com/api/v3`, `production` → `https://api.asaas.com/v3`).
- Whitelist `paymentMethod ∈ {PIX, CREDIT_CARD}`.
- Para PIX: após criar payment, GET `/payments/{id}/pixQrCode` → retornar `{ encodedImage, payload, expirationDate }`.
- Para CREDIT_CARD: retornar `invoiceUrl` (link do Asaas).
- Persistir em `student_plans`: `asaas_payment_id`, `asaas_status='PENDING'`, `asaas_invoice_url`, `status='pending_payment'`.
- Tratamento de erro: parsear `errors[]` da resposta Asaas, retornar `{ error: msg, code }` com status HTTP coerente (400 input, 502 upstream).

Retorno padronizado:
```json
{
  "studentPlanId": "uuid",
  "paymentId": "pay_xxx",
  "invoiceUrl": "https://...",
  "pix": { "encodedImage": "...", "payload": "...", "expirationDate": "..." } | null
}
```

### 3. Edge Function `asaas-webhook` (nova)
Arquivo: `supabase/functions/asaas-webhook/index.ts`.

- Endpoint público (sem JWT do Supabase).
- Validar header `asaas-access-token` contra `Deno.env.get('ASAAS_WEBHOOK_TOKEN')`. Em mismatch: log + 401.
- Body: `{ event, payment }` (Asaas format).
- Mapa `event → ação`:
  - `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED` → `asaas_status` atualizado + `rpc('activate_student_plan')`.
  - `PAYMENT_OVERDUE` → só atualiza `asaas_status='OVERDUE'`.
  - `PAYMENT_REFUNDED`, `PAYMENT_DELETED` → `asaas_status` atualizado + `student_plans.status='cancelled'`.
- Idempotência: SELECT `asaas_status` antes; se já é o estado-alvo, retorna 200 sem ação.
- Sempre HTTP 200 (mesmo em ignored/error interno) — apenas logar via `console.error`.
- Cliente Supabase usa `SUPABASE_SERVICE_ROLE_KEY`.

### 4. Cliente frontend `js/asaas.js`
Arquivo até hoje vazio. Exportar:
```js
export async function createCheckout({ planId, studentId, paymentMethod, installments })
export async function getPaymentStatus(studentPlanId)
```
- `createCheckout` chama `supabase.functions.invoke('asaas-checkout', { body: { … } })`. Trata erro e retorna `{ studentPlanId, pix, invoiceUrl }`.
- `getPaymentStatus` faz `select('asaas_status, asaas_invoice_url, status').eq('id', studentPlanId).single()`.
- Erros traduzidos e expostos via `toast` (importar de `js/auth.js`).

### 5. UI de Checkout (nova rota)
Arquivo: `js/pages/checkout.js` (compartilhado — student/responsible/admin podem acessar).

- Lê `student_plan_id` de `window.location.hash` (`#checkout?sp=<id>`).
- Renderiza com base no método (PIX vs cartão) — busca da row em `student_plans` o `asaas_invoice_url`.
- PIX: `<img src="data:image/png;base64,...">`, copia-e-cola com botão Copiar (`navigator.clipboard.writeText`), prazo de expiração formatado, status atual.
- Cartão: botão "Pagar com cartão" → `window.open(invoiceUrl, '_blank')`.
- Polling: `setInterval` 5s, máx 120 ticks. Em status `CONFIRMED`/`RECEIVED` → toast sucesso + `location.hash = '#payments'`. Cleanup no `beforeunload`/route change.
- Botão "Voltar" preserva cobrança pendente; retorno via `#payments`.

Registrar em `app.js`:
- `import { checkoutPage } from './pages/checkout.js'`
- `case '#checkout': await checkoutPage.render(); break` (com parse do query param).
- Adicionar a `publicRoutes`? Não — exige usuário autenticado (qualquer role).

### 6. Fluxo de compra (modificações)
- `js/pages/student/plans.js`: na ação "comprar", abrir modal com seletor `PIX | Cartão` (+ parcelas 1-12 quando cartão). Remover insert atual. Chamar `createCheckout({ planId, studentId: app.user.id, paymentMethod, installments })`. Redirect `#checkout?sp=…`.
- `js/pages/responsible/plans.js`: idêntico, mas `studentId` vem do select de aluno responsável.
- `js/pages/admin/charges.js`: adicionar dropdown — "Gerar cobrança Asaas" (mesmo fluxo) | "Marcar como pago manualmente" (fluxo atual mantido, insert + `rpc('activate_student_plan')` direto).

### 7. Página de pagamentos
- `js/pages/responsible/payments.js`: adicionar coluna/linha "Status Asaas" (traduzir constantes). Botão "Continuar pagamento" para `status='pending_payment'` → `#checkout?sp=<id>`. Botão "Ver fatura" quando há `asaas_invoice_url`.
- Verificar se há equivalente para student (não há `payments.js` em student/). Decisão: adicionar item de menu "Pagamentos" só para responsible/admin (mantém status atual). Se houver pendência student, exibir banner em `dashboard` student com link.

### 8. Documentação
Atualizar `README.md` ou criar `docs/asaas.md`:
- Variáveis: `ASAAS_API_KEY`, `ASAAS_ENV`, `ASAAS_WEBHOOK_TOKEN`.
- Comando: `supabase secrets set ASAAS_API_KEY=... ASAAS_ENV=sandbox ASAAS_WEBHOOK_TOKEN=...`.
- Deploy: `supabase functions deploy asaas-checkout asaas-webhook`.
- Registro webhook no painel Asaas: URL `https://<project>.supabase.co/functions/v1/asaas-webhook`, header `asaas-access-token: <token>`, eventos selecionados.
- Teste sandbox: cartão `5162306219378829` (Asaas test), simular confirmação via painel.

## Decisões de Design

- **PIX vs Cartão na MESMA rota** (não duas rotas separadas) — simplifica state e polling.
- **Polling em vez de Realtime** — webhook + Realtime exigiria configurar publication para `student_plans`; polling em 5s é aceitável para checkout (operação de minutos).
- **`asaas_status` separado de `student_plans.status`** — `asaas_status` reflete estado upstream; `status` é o nosso domínio (pending_payment/active/cancelled/expired). Webhook traduz upstream→domínio quando aplicável.
- **Admin manual mantém path antigo** — risco baixo (admin only), evita regressão operacional. Spec R6.3 explícita.

## Pontos de Atenção

- **Rotação do `ASAAS_WEBHOOK_TOKEN`**: documentar em `docs/asaas.md`. Re-deploy função após mudança.
- **CORS no webhook**: não é cross-browser; remover headers CORS para reduzir superfície.
- **Logs**: webhook deve usar `console.log` estruturado (`{ event, paymentId, action }`) — facilita debugging via `supabase functions logs`.
- **Race condition**: `createCheckout` insere `student_plans` ANTES de retornar QR. Se webhook chegar antes do redirect (improvável mas possível), idempotência cobre.
- **RLS em `student_plans`**: migration 002 deve permitir UPDATE por service_role (default). Verificar — sem mudança esperada.
