# Spec — Faturas pendentes para Atleta

## Problema

Quando um atleta (ou responsável/empresário) contrata um plano mas não conclui o pagamento imediato, perde o link para a tela de checkout/fatura e fica sem caminho para retomar.

- Responsável/empresário JÁ têm `#payments` (`js/pages/responsible/payments.js`) com botão "CONTINUAR PAGAMENTO" para pendentes.
- Atleta NÃO tem página equivalente nem item de menu.

## Escopo

**Medium.** Espelhar a página de faturas existente para o atleta e expor via menu "Mais".

## Requisitos

- **R1** Atleta acessa rota `#payments` que renderiza lista de seus `student_plans` (filtro `student_id = auth.uid()`), ordenada por `created_at desc`.
- **R2** Cada item exibe: nome do plano, preço, data, status (PAGO / AGUARDANDO / VENCIDO / CANCELADO), status Asaas traduzido, validade (se ativo).
- **R3** Item com `status = 'pending_payment'` exibe botão **CONTINUAR PAGAMENTO** → `#checkout?sp=<id>`.
- **R4** Item com `asaas_invoice_url` exibe botão secundário **VER FATURA** (abre em nova aba).
- **R5** Atleta passa a ter botão **Mais** na bottom nav, abrindo o overlay já existente (`openMoreMenu`) com itens **Faturas** e **Configurações**.
- **R6** Rota `#payments` para `role = 'student'` é dispatcheada em `app.renderPayments()` para `studentPayments.render()`.
- **R7** Empty state quando não há faturas (mesma UX da página do responsável).

## Fora de escopo

- Banner de pendência no dashboard.
- Notificações push.
- Cancelar fatura pendente pelo cliente.
- Mudanças em RLS (já permite — `migrations/002_rls_security.sql:94`).

## Arquivos afetados

- `js/pages/student/payments.js` (novo)
- `js/app.js` (import, dispatch em `renderPayments`, nav do student com "Mais")

## Critério de pronto

- Logar como atleta, contratar um plano sem pagar, fechar checkout, abrir Mais → Faturas → ver pendente → CONTINUAR PAGAMENTO leva ao `#checkout?sp=...` correto.
- Responsável/empresário continuam funcionando sem regressão.
