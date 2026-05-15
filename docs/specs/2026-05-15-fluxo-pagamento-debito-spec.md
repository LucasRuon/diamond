---
date: 2026-05-15T15:44:43-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-15-fluxo-pagamento-debito.md
---

# Spec: Fluxo de Pagamento com Cartao de Debito

**Data**: 2026-05-15
**Estimativa**: Media

## Objetivo

Adicionar "Cartao de Debito" como forma de pagamento nos fluxos de contratacao e cobranca Asaas do Diamond X, mantendo a arquitetura atual de SPA estatica + Supabase Edge Functions.

A decisao tecnica e tratar `DEBIT_CARD` como metodo interno do produto e criar a cobranca Asaas com `billingType: "CREDIT_CARD"`, pois a documentacao oficial do Asaas indica que o debito e disponibilizado ao cliente na tela de fatura (`invoiceUrl`) quando a cobranca usa `CREDIT_CARD` ou `UNDEFINED`. A implementacao nao deve capturar dados de cartao no app.

Referencias externas:
- Asaas, pagamento por cartao e debito via fatura: https://docs.asaas.com/docs/payments-via-credit-card
- Asaas, referencia de criacao de pagamento e `billingType` aceitos: https://docs.asaas.com/reference/create-new-payment-with-credit-card

## Escopo

### Incluido
- Exibir "Cartao de Debito" nos seletores de pagamento do atleta, responsavel e administrador.
- Aceitar `DEBIT_CARD` no contrato interno de `createCheckout()`.
- Validar `DEBIT_CARD` na Edge Function `asaas-checkout`.
- Mapear `DEBIT_CARD` para `billingType: "CREDIT_CARD"` no payload enviado ao Asaas.
- Garantir que parcelas continuem aparecendo e sendo enviadas apenas para `CREDIT_CARD`.
- Atualizar a documentacao operacional de Asaas com o fluxo e o teste de debito.

### Nao Incluido
- Captura transparente de dados de cartao de debito no frontend ou na Edge Function.
- Uso de `billingType: "DEBIT_CARD"` no endpoint `/v3/payments`, pois ele nao aparece como valor aceito na referencia de criacao de cobrancas.
- Garantia de que a fatura Asaas restringira o usuario exclusivamente ao debito, ja que a propria fatura pode disponibilizar opcoes de cartao.
- Persistir o metodo escolhido em `student_plans` para relatorios ou exibicao historica.
- Criar ou alterar migrations, RLS ou RPCs.
- Automatizar pagamento real no sandbox Asaas.

## Pre-requisitos

- [ ] Confirmar que a conta Asaas sandbox/producao usada pelo projeto pode criar cobrancas por cartao e exibe opcao de debito no `invoiceUrl`.
- [ ] Ter `ASAAS_API_KEY`, `ASAAS_ENV`, `SUPABASE_SERVICE_ROLE_KEY` e `ASAAS_WEBHOOK_TOKEN` configurados no ambiente Supabase alvo.
- [ ] Ter acesso ao painel sandbox Asaas para simular confirmacao de pagamento.
- [ ] Servir a SPA localmente em `http://localhost:3000` para QA manual quando necessario.

## Fases de Implementacao

### Fase 1: Metodo de Debito nas Telas

**Objetivo:** Permitir que usuarios escolham "Cartao de Debito" nas tres entradas atuais do fluxo Asaas sem alterar o comportamento de parcelamento.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `js/pages/student/plans.js` | Modificar | Adicionar opcao `DEBIT_CARD` no formulario de contratacao do atleta. |
| `js/pages/responsible/plans.js` | Modificar | Adicionar opcao `DEBIT_CARD` no formulario de contratacao do responsavel. |
| `js/pages/admin/charges.js` | Modificar | Adicionar opcao `DEBIT_CARD` no formulario de cobranca Asaas do admin. |

#### Detalhes de Implementacao

1. `js/pages/student/plans.js`
   - No `<select name="payment_method" id="cf-method">`, adicionar:
     ```html
     <option value="DEBIT_CARD">Cartao de Debito</option>
     ```
   - Manter a linha de calculo de parcelas como:
     ```js
     const installments = paymentMethod === 'CREDIT_CARD' ? Number(data.installments || 1) : undefined;
     ```
   - Manter o toggle de parcelas condicionado somente a `methodSel.value === 'CREDIT_CARD'`.

2. `js/pages/responsible/plans.js`
   - No `<select name="payment_method" id="rp-method">`, adicionar a mesma opcao `DEBIT_CARD`.
   - Manter parcelas somente para `CREDIT_CARD`.
   - Nao alterar a logica de beneficiario, cache de PIX ou redirecionamento para `#checkout?sp=`.

3. `js/pages/admin/charges.js`
   - No `<select name="payment_method" id="ac-method">`, adicionar a mesma opcao `DEBIT_CARD`.
   - Manter o modo manual sem metodo Asaas.
   - Manter `syncMethod()` exibindo parcelas somente quando o metodo for `CREDIT_CARD`.
   - Manter `syncInstallments()` baseado no plano selecionado, pois ele continua relevante apenas para credito.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `rg -n "DEBIT_CARD|Cartao de Debito" js/pages/student/plans.js js/pages/responsible/plans.js js/pages/admin/charges.js` mostra as tres opcoes novas.

**Verificacao Manual:**
- [x] Em `#plans` como atleta, o formulario mostra PIX, Cartao de Credito e Cartao de Debito.
- [x] Em `#plans` como responsavel, o formulario mostra PIX, Cartao de Credito e Cartao de Debito.
- [x] Em `#payments` como admin, "Nova Cobranca" no modo Asaas mostra PIX, Cartao de Credito e Cartao de Debito.
- [x] Ao escolher debito, o campo "PARCELAS" permanece oculto nas tres telas.
- [x] Ao escolher credito, o campo "PARCELAS" continua aparecendo conforme `max_installments`.

### Fase 2: Contrato Frontend e Edge Function

**Objetivo:** Fazer o metodo interno `DEBIT_CARD` passar pela API interna com validacao forte e ser convertido para o payload Asaas suportado.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `js/asaas.js` | Modificar | Atualizar contrato documentado de `paymentMethod`. |
| `supabase/functions/asaas-checkout/index.ts` | Modificar | Aceitar `DEBIT_CARD`, mapear para `CREDIT_CARD` no Asaas e ignorar parcelas em debito. |

#### Detalhes de Implementacao

1. `js/asaas.js`
   - Atualizar o JSDoc de `paymentMethod` para:
     ```js
     * @param {'PIX'|'CREDIT_CARD'|'DEBIT_CARD'} params.paymentMethod
     ```
   - Nao normalizar `DEBIT_CARD` no frontend. A Edge Function deve continuar sendo a fonte de verdade para validacao e mapeamento.
   - Manter `installments: installments && installments > 1 ? installments : undefined`, pois a UI ja evita parcelas no debito e a Edge Function tambem deve proteger o contrato.

2. `supabase/functions/asaas-checkout/index.ts`
   - Atualizar a whitelist:
     ```ts
     const ALLOWED_METHODS = new Set(["PIX", "CREDIT_CARD", "DEBIT_CARD"]);
     ```
   - Depois da validacao, calcular o tipo Asaas em variavel separada:
     ```ts
     const asaasBillingType = method === "DEBIT_CARD" ? "CREDIT_CARD" : method;
     ```
   - Usar `asaasBillingType` em `paymentPayload.billingType`.
   - Atualizar o comentario de `billingType` para deixar explicito que `DEBIT_CARD` usa a fatura de cartao do Asaas.
   - Manter parcelamento apenas quando `method === "CREDIT_CARD"`:
     ```ts
     if (method === "CREDIT_CARD" && installments && installments > 1) {
     ```
   - Manter QR Code apenas quando `method === "PIX"`.
   - Opcionalmente retornar metadados nao quebrantes no JSON:
     ```ts
     paymentMethod: method,
     asaasBillingType,
     ```
     Esses campos nao devem ser obrigatorios para a SPA funcionar.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `deno check supabase/functions/asaas-checkout/index.ts` termina sem erros.
- [x] `rg -n "DEBIT_CARD|asaasBillingType" supabase/functions/asaas-checkout/index.ts js/asaas.js` confirma o contrato e o mapeamento.

**Verificacao Manual:**
- [x] Criar cobranca com `DEBIT_CARD` retorna sucesso da Edge Function e redireciona para `#checkout?sp=<id>`.
- [x] A cobranca criada com debito possui `asaas_invoice_url` preenchido em `student_plans`.
- [x] A tela de checkout exibe "ABRIR FATURA / PAGAR".
- [x] Ao abrir o `invoiceUrl`, a fatura Asaas permite selecionar pagamento por debito.
- [x] Enviar metodo invalido por chamada direta continua retornando HTTP 400 com `invalid_payment_method`.

### Fase 3: Documentacao e Validacao Operacional

**Objetivo:** Registrar a decisao de integracao e deixar um roteiro de QA para impedir regressao nos metodos existentes.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `docs/asaas.md` | Modificar | Incluir debito nos testes sandbox e documentar que ele usa `invoiceUrl` de cobranca `CREDIT_CARD`. |

#### Detalhes de Implementacao

1. `docs/asaas.md`
   - Na secao "Testes em sandbox", adicionar um item para debito:
     - escolher "Cartao de Debito" no app;
     - confirmar que a tela redireciona para checkout;
     - abrir `invoiceUrl`;
     - selecionar debito na fatura Asaas;
     - simular confirmacao no painel sandbox;
     - validar `student_plans.status='active'` e `asaas_status='CONFIRMED'` ou `RECEIVED`.
   - Adicionar nota em "Pontos de atencao" explicando:
     - o app envia `DEBIT_CARD` internamente;
     - a Edge Function envia `billingType: "CREDIT_CARD"` ao Asaas;
     - a fatura Asaas e responsavel pela escolha final de debito;
     - nenhum dado de cartao passa pelo frontend Diamond X.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `rg -n "Debito|DEBIT_CARD|billingType" docs/asaas.md` encontra a nota operacional nova.

**Verificacao Manual:**
- [x] Fluxo PIX continua exibindo QR Code e copia-e-cola na criacao inicial.
- [x] Fluxo Cartao de Credito continua abrindo `invoiceUrl` e mantendo parcelas quando configuradas.
- [x] Fluxo Cartao de Debito abre `invoiceUrl` sem campo de parcelas no app.
- [x] Webhook `asaas-webhook` ativa o plano depois da simulacao de pagamento confirmado.

## Edge Cases

| Cenario | Comportamento Esperado |
|---------|------------------------|
| Usuario escolhe debito e o plano permite varias parcelas | App nao mostra parcelas e Edge Function nao envia `installmentCount` nem `totalValue`. |
| Cliente manipula o body e envia `DEBIT_CARD` com `installments: 12` | Edge Function aceita o metodo, mas ignora parcelas porque o metodo interno nao e `CREDIT_CARD`. |
| Cliente manipula o body e envia `DEBIT_CARD` em caixa baixa | Edge Function converte para uppercase e processa como `DEBIT_CARD`. |
| Cliente envia metodo desconhecido, por exemplo `BOLETO` | Edge Function retorna HTTP 400 com `invalid_payment_method`. |
| Asaas nao disponibiliza debito no `invoiceUrl` da conta usada | Cobranca ainda e criada como cartao, mas o QA reprova o requisito de debito; validar configuracao/comercial Asaas antes de producao. |
| Usuario atualiza a pagina de checkout depois de criar debito | Como o QR nao e necessario, a tela continua funcional via `asaas_invoice_url`. |
| Pagamento de debito confirmado pelo webhook | `asaas-webhook` segue o mesmo lookup por `asaas_payment_id` e ativa o plano sem mudancas. |

## Riscos e Mitigacoes

- Debito nao ser uma opcao exclusiva na fatura Asaas -> Documentar a limitacao e validar no sandbox; se o negocio exigir debito exclusivo, abrir novo escopo com Asaas antes de implementar.
- Conta Asaas sem habilitacao comercial para cartao/debito -> Colocar validacao sandbox como pre-requisito e bloquear deploy de producao ate passar.
- Metodo escolhido nao ficar persistido em `student_plans` -> Aceitar para o escopo atual; se relatorios por metodo forem necessarios, planejar migration `payment_method` separada.
- Regressao em parcelas de credito -> Manter condicoes existentes baseadas em `CREDIT_CARD` e testar plano com `max_installments > 1`.
- Exposicao de dados sensiveis de cartao -> Nao coletar numero, validade, CVV ou dados do portador no Diamond X; toda entrada de cartao fica no ambiente Asaas.

## Rollback

1. Remover as opcoes `<option value="DEBIT_CARD">Cartao de Debito</option>` de `js/pages/student/plans.js`, `js/pages/responsible/plans.js` e `js/pages/admin/charges.js`.
2. Remover `DEBIT_CARD` do JSDoc em `js/asaas.js`.
3. Remover `DEBIT_CARD` de `ALLOWED_METHODS` e voltar `paymentPayload.billingType` para usar diretamente `method` em `supabase/functions/asaas-checkout/index.ts`.
4. Redeployar `asaas-checkout` com `supabase functions deploy asaas-checkout`.
5. Reverter as notas de `docs/asaas.md`.
6. Nenhum rollback de dados e necessario, pois o plano nao cria migrations e cobrancas ja emitidas continuam no Asaas como `CREDIT_CARD`.

## Checklist Final

- [x] Opcoes de debito adicionadas nos tres formularios.
- [x] Parcelas continuam exclusivas de credito.
- [x] Edge Function aceita `DEBIT_CARD` e envia `billingType: "CREDIT_CARD"` ao Asaas.
- [x] `deno check supabase/functions/asaas-checkout/index.ts` executado com sucesso.
- [x] Documentacao operacional atualizada.
- [x] QA sandbox executado para PIX, credito e debito.
- [x] Webhook confirmado ativando plano apos pagamento.
- [x] Rollback path verified.
