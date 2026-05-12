---
date: 2026-05-12
planner: claude
plan_title: "Corrigir trava em 'SALVANDO...' na edição de logo de clube"
status: implemented
research: docs/research/2026-05-12-edicao-logo-clube-salvando-travado.md
---

# Implementation Plan: Corrigir trava em "SALVANDO..." na edição de logo de clube

## Overview

O botão de salvar do bottom sheet de clube pode ficar preso em "SALVANDO..." indefinidamente quando o usuário troca a logo. A causa mais provável (sem repro confirmada ainda) é uma operação local sem timeout em `removeImageBackground` (`img.onload`/`canvas.toBlob`), que pode não disparar callback para certas imagens. Como agravante, o handler do `bottomSheet` só reseta o botão se `onSave` lançar — uma Promise pendurada deixa a UI travada para sempre.

Este plano endereça causa raiz e sintoma em camadas independentes, além de limpar logos órfãs após troca bem-sucedida.

## Current State

- `js/ui.js:49-71` — submit do `bottomSheet` confia em `onSave` settle; sem watchdog.
- `js/clubs.js:25-95` — `removeImageBackground` usa `new Image()` e `canvas.toBlob` sem timeout. `img.onerror` cobre erro de decode, mas não há proteção contra callback que nunca dispara.
- `js/pages/admin/clubs.js:184-205` — branch de edição: upload novo + `update` na tabela. Cleanup do objeto recém-enviado existe **só** no rollback (`updateError`); a logo antiga **nunca** é removida em uma troca bem-sucedida.
- `js/clubs.js:122-132` — `removeClubLogoObject` já existe e é best-effort (engole erro). Reutilizável.

## What We're NOT Doing

- Não vamos reescrever `removeImageBackground` (algoritmo de canvas permanece).
- Não vamos mudar políticas RLS de storage.
- Não vamos adicionar fila/retry; basta timeout + propagação correta de erro.
- Não vamos adicionar logs estruturados além do `console.warn`/`console.error` existente.
- Não vamos tocar no fluxo de **criação** de clube além do que for naturalmente compartilhado (ex.: `removeImageBackground`).

---

## Phase 1: Timeout em `removeImageBackground`

Causa raiz mais provável. Adiciona timeout em `img.onload` e `canvas.toBlob` para que falhas silenciosas virem rejeição — o `try/catch` em `js/pages/admin/clubs.js:175-181` já trata rejeição enviando o arquivo original, então o impacto é só "remove fundo falha → envia original", nunca travar.

### Files to Modify:
- [x] `js/clubs.js` — `removeImageBackground` (linhas 25-95)
  - Envolver a Promise de `new Image()` em um `Promise.race` com timeout de 8s; rejeitar com `Error('Timeout ao decodificar imagem.')`.
  - Envolver `canvas.toBlob` em `Promise.race` com timeout de 8s; rejeitar com `Error('Timeout ao gerar PNG transparente.')`.
  - Garantir `URL.revokeObjectURL` no `finally` (já existe).

### Success Criteria:

#### Automated:
- [ ] `python3 -m http.server 8080` continua servindo sem erro de sintaxe.
- [ ] Console sem erros ao carregar `#clubs` como admin.

#### Manual:
- [ ] Editar clube com logo nova + "Remover fundo" marcado, imagem válida → upload conclui normalmente.
- [ ] Editar clube com SVG + "Remover fundo" marcado → ignora canvas (já curto-circuita em `:27`), salva normalmente.
- [ ] Simular timeout (devtools throttling extremo ou imagem corrompida) → toast de erro aparece e botão volta a "SALVAR ALTERAÇÕES" em ≤8s.

---

## Phase 2: Watchdog no `bottomSheet`

Rede de segurança defensiva — independente da causa, garante que o botão nunca fica preso. Aplica-se a **todos** os usos do bottom sheet, não só clubes.

### Files to Modify:
- [x] `js/ui.js` — handler de submit do `bottomSheet.show` (linhas 49-71)
  - Após `btn.disabled = true`, iniciar um `setTimeout` de 30s que, caso o `onSave` ainda não tenha resolvido/rejeitado, reabilita o botão, restaura `originalText` e loga `console.error('[bottomSheet] onSave timeout watchdog')`. **Não** chamar `close()` — preservar dados do form.
  - Limpar o timeout em ambos os branches do `try/catch` (sucesso e erro).
  - O watchdog é um "último recurso": 30s é maior que o `fetchWithTimeout` Supabase (20s) + qualquer timeout local da Phase 1 (8s), evitando falsos positivos em redes lentas.

### Success Criteria:

#### Automated:
- [ ] Sem erros de sintaxe; SPA carrega.

#### Manual:
- [ ] Fluxo normal de salvar clube/aluno/treino continua fechando o sheet sem regressão.
- [ ] Em fluxo intencionalmente quebrado (ex.: comentar o `throw` no catch local de uma página), o botão se reabilita em 30s automaticamente.
- [ ] Console mostra `[bottomSheet] onSave timeout watchdog` quando o watchdog dispara.

---

## Phase 3: Limpar logo antiga em troca bem-sucedida

Higiene de storage. Hoje, cada troca de logo deixa o objeto anterior órfão em `club-logos`.

### Files to Modify:
- [x] `js/pages/admin/clubs.js` — branch de edição (linhas 184-205)
  - Capturar `club.logo_path` (e `logo_bucket`) **antes** do upload, em `previousLogoPath`.
  - Após `update` bem-sucedido (sem `updateError`), se houve nova logo (`file` truthy) e `previousLogoPath` existia, chamar `removeClubLogoObject(previousLogoPath)` (best-effort; já engole erro).
  - Ordem importa: a remoção só ocorre **depois** que a tabela `clubs` aponta para a nova logo, garantindo que um erro de delete não deixe a UI quebrada.

### Success Criteria:

#### Automated:
- [ ] Sem erros de sintaxe.

#### Manual:
- [ ] Editar clube com logo existente → enviar nova logo → no Supabase Storage, o caminho antigo desaparece e o novo permanece.
- [ ] Editar clube sem trocar logo (só nome) → objeto antigo permanece intacto.
- [ ] Editar clube e troca de logo falha (RLS, rede) → objeto antigo permanece intacto (rollback do upload novo já existe nas linhas 200-203).

---

## Verificação final (cross-phase)

- [ ] Repro original (editar clube com logo existente, escolher nova logo, salvar) conclui em tempo razoável OU exibe toast de erro com botão reabilitado — nunca trava em "SALVANDO...".
- [ ] `git diff` toca apenas `js/ui.js`, `js/clubs.js` e `js/pages/admin/clubs.js`.
- [ ] Nenhuma migration nova; nenhuma mudança em Edge Functions.
