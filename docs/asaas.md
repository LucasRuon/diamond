# Integração Asaas (Pagamentos)

Documento operacional para subir/manter as Edge Functions `asaas-checkout` e `asaas-webhook` que integram cobranças Asaas ao Diamond X.

Spec/design: `.specs/features/asaas-payments/`.

## 1. Variáveis de ambiente (secrets Supabase)

| Variável                  | Descrição                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `ASAAS_API_KEY`           | Chave Asaas (sandbox ou produção).                                                         |
| `ASAAS_ENV`               | `sandbox` (default) ou `production`. Define a URL base.                                    |
| `ASAAS_WEBHOOK_TOKEN`     | Token compartilhado para validar o header `asaas-access-token` no webhook.                 |
| `SUPABASE_SERVICE_ROLE_KEY` | Fornecido pelo runtime — service role usada para `activate_student_plan`.                |

Configurar:

```bash
supabase secrets set \
  ASAAS_API_KEY=xxx \
  ASAAS_ENV=sandbox \
  ASAAS_WEBHOOK_TOKEN=$(openssl rand -hex 32)
```

> O `ASAAS_WEBHOOK_TOKEN` é seu — gere uma string longa e guarde com segurança. É o único segredo que protege o endpoint público do webhook.

## 2. Migration

Aplicar `migrations/011_asaas_integration.sql` no banco antes do primeiro deploy. Cria colunas `asaas_*`, índices e CHECK em `student_plans.asaas_status`.

## 3. Deploy

```bash
supabase functions deploy asaas-checkout
supabase functions deploy asaas-webhook
```

Para servir local durante desenvolvimento:

```bash
supabase functions serve asaas-checkout
supabase functions serve asaas-webhook
```

## 4. Registro do webhook no painel Asaas

1. Acessar o painel Asaas → **Integrações → Webhooks**.
2. Criar um novo webhook apontando para:
   ```
   https://<seu-projeto>.supabase.co/functions/v1/asaas-webhook
   ```
3. Em "Token de autenticação", colar o valor de `ASAAS_WEBHOOK_TOKEN`.
4. Selecionar eventos:
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_RECEIVED`
   - `PAYMENT_OVERDUE`
   - `PAYMENT_REFUNDED`
   - `PAYMENT_DELETED`
5. Habilitar.

> O webhook usa o header `asaas-access-token` (padrão Asaas). Tokens divergentes → 401.

## 5. Testes em sandbox

1. Garantir `ASAAS_ENV=sandbox` e usar chave sandbox do Asaas.
2. No app, comprar um plano:
   - PIX → exibe QR Code e copia-e-cola.
   - Cartão de Crédito → abre `invoiceUrl` em nova aba e mantém parcelas quando configuradas (usar cartão de teste `5162306219378829`).
   - Cartão de Débito → redireciona para o checkout, abre `invoiceUrl` e permite selecionar débito na fatura Asaas.
3. No painel sandbox Asaas → cobrança → **Simular pagamento confirmado**.
4. Webhook deve chegar → `student_plans` muda para `status='active'`, `asaas_status='CONFIRMED'` ou `RECEIVED`.
5. Repetir para `OVERDUE` (deixar vencer ou simular) e `REFUNDED` (reembolso pelo painel).

Logs:

```bash
supabase functions logs asaas-checkout --since 1h
supabase functions logs asaas-webhook --since 1h
```

## 6. Rotação do token do webhook

1. Gerar novo token: `openssl rand -hex 32`.
2. Atualizar secret:
   ```bash
   supabase secrets set ASAAS_WEBHOOK_TOKEN=<novo>
   ```
3. Redeploy: `supabase functions deploy asaas-webhook`.
4. No painel Asaas, atualizar o token do webhook **antes** de invalidar o antigo (há uma janela onde os dois precisam funcionar).
5. Confirmar entrega de um evento de teste no painel.

## 7. Pontos de atenção

- **Service role** é usada apenas dentro das Edge Functions. Nunca expor no frontend.
- **`activate_student_plan`** é `SECURITY DEFINER` e só aceita `admin` ou `service_role`. O webhook usa service_role.
- **Idempotência**: o webhook ignora eventos cujo `asaas_status` já está no estado-alvo (replay seguro).
- **Erros** nas chamadas Asaas retornam HTTP `502` com `code: 'asaas_customer'` ou `'asaas_payment'` e a mensagem traduzida.
- **Débito**: o app envia `DEBIT_CARD` internamente, mas a Edge Function envia `billingType: "CREDIT_CARD"` ao Asaas. A escolha final por débito acontece na fatura Asaas (`invoiceUrl`) e nenhum dado de cartão passa pelo frontend Diamond X.
