# Quick Task 001: Sincronizar dados do customer Asaas em cobranças subsequentes

**Date:** 2026-05-13
**Status:** In Progress

## Description

A Edge Function `asaas-checkout` só envia os dados do aluno (nome, CPF, email, telefone) para o Asaas no momento da **criação** do customer. Quando o customer já existe (`student.asaas_customer_id` setado), os dados nunca são re-sincronizados — então, se o aluno preencher CPF/telefone no perfil **depois** que o customer Asaas já foi criado sem esses campos, a próxima tentativa de cobrança falha com:

> "Para criar esta cobrança é necessário preencher o CPF ou CNPJ do cliente."

A causa é que o customer no Asaas ainda está sem CPF, mesmo o `users.cpf` já estando preenchido localmente.

**Correção:** quando `asaas_customer_id` já existir, fazer `POST /customers/{id}` no Asaas com os dados atuais do `student` antes de criar o payment.

## Files Changed

- `supabase/functions/asaas-checkout/index.ts` — extrair payload do customer em uma const e, no ramo em que `customerId` já existia, executar `POST /customers/{id}` para atualizar nome/CPF/email/telefone. Em caso de falha, retornar erro 502 com mensagem do Asaas (não silenciar — o erro original "CPF obrigatório" voltaria a aparecer na criação do payment).

## Verification

- [ ] Aluno com `asaas_customer_id` previamente salvo (sem CPF no Asaas) e com `users.cpf` agora preenchido → consegue gerar cobrança PIX (resposta tem `invoiceUrl` e `pix.payload`).
- [ ] Aluno novo (sem `asaas_customer_id`) → fluxo de criação de customer permanece inalterado, cobrança gerada normalmente.
- [ ] Se o update do customer falhar (ex: CPF inválido), Edge Function responde 502 com a mensagem do Asaas, e não 502 genérico vindo da criação do payment.
- [ ] Deploy: `supabase functions deploy asaas-checkout`.

## Commit

(pendente)
