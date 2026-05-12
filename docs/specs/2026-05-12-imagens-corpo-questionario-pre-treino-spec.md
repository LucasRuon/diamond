---
date: 2026-05-12
planner: claude
plan_title: "Trocar imagens do corpo no questionário pré-treino"
status: completed
research: docs/research/2026-05-12-imagens-corpo-questionario-pre-treino.md
---

# Implementation Plan: Trocar imagens do corpo no questionário pré-treino

## Overview

Substituir as duas SVGs do mapa corporal (frente e costas) usadas na etapa de "dores" do questionário pré-treino do aluno. Os novos arquivos foram fornecidos pelo usuário em `/Users/lucasruon/Downloads/logos/`. A troca exige bump do cache do service worker e recalibração das 34 regiões clicáveis para a nova ilustração.

## Current State

- `assets/pre-training/body-front.svg` — SVG vetorial puro, viewBox `0 0 800 1000` (~6.8KB)
- `assets/pre-training/body-back.svg` — SVG vetorial puro, viewBox `0 0 800 1000` (~5.1KB)
- Referenciados em `js/pages/student/preTrainingQuestionnaire.js:381` (escolha dinâmica frente/costas)
- Pré-cache offline em `service-worker.js:24-25`; versão atual do cache: `'diamondx-v16'` (`service-worker.js:1`)
- Mapa de regiões clicáveis em `js/pages/student/preTrainingQuestionnaire.js:31-70` (`BODY_REGIONS`): 20 regiões na frente, 14 nas costas, coordenadas em % relativas ao container `.precheck-body-figure` (`css/components.css:674-687`, aspect-ratio 4:5)
- Fallback se a `<img>` falhar: `preTrainingQuestionnaire.js:520-527`
- View read-only (admin) não usa as imagens — não impactada

## What We're NOT Doing

- Não alterar `preTrainingQuestionnaireView.js` (view de admin, sem mapa)
- Não converter os SVGs para PNG puro (decisão do usuário: manter SVG com PNG embutido)
- Não trocar o esquema/lista de regiões — mantemos os mesmos 34 `region` IDs (apenas reposicionando)
- Não mexer em RLS, migrations ou Edge Functions

---

## Phase 1: Substituir os arquivos SVG e invalidar cache

### Files to Modify:

- [x] `assets/pre-training/body-front.svg` — sobrescrever com conteúdo de `/Users/lucasruon/Downloads/logos/imagem_frente_identica.svg`
- [x] `assets/pre-training/body-back.svg` — sobrescrever com conteúdo de `/Users/lucasruon/Downloads/logos/imagem_identica.svg`
- [x] `service-worker.js:1` — bump `CACHE_NAME` de `'diamondx-v16'` para `'diamondx-v17'`

### Success Criteria:

#### Automated:
- [x] `ls -la assets/pre-training/body-front.svg assets/pre-training/body-back.svg` mostra arquivos com tamanho ~169KB e ~168KB
- [x] `grep "CACHE_NAME" service-worker.js` retorna `'diamondx-v17'`
- [x] `git status` mostra apenas estas 3 alterações nesta fase

#### Manual:
- [ ] Abrir SPA em `python3 -m http.server 8080`, navegar como aluno até o passo "dores" do questionário pré-treino
- [ ] Imagem da frente aparece (com `state.painSide === 'frente'`)
- [ ] Imagem das costas aparece ao alternar lado
- [ ] Em DevTools → Application → Service Workers, registrar SW e ver `diamondx-v17` ativo após reload duro
- [ ] Em DevTools → Application → Cache Storage, confirmar que as novas SVGs estão cacheadas

---

## Phase 2: Recalibrar coordenadas das regiões clicáveis

Os novos SVGs têm viewBox `369x450` (proporção ~0.82, próxima do 4:5 = 0.80 atual). O `object-fit: contain` no CSS centraliza a imagem no container, então o desalinhamento principal vem das diferenças de pose e enquadramento entre as ilustrações.

Estratégia: ajustar visualmente em DevTools com a ferramenta de edição de estilo, anotar valores, e atualizar `BODY_REGIONS` no código.

### Files to Modify:

- [x] `js/pages/student/preTrainingQuestionnaire.js:31-70` — ajustar `top`, `left`, `width`, `height` (todos em %) das 20 regiões da frente e 14 das costas para corresponder à nova arte

### Procedimento de calibração

1. Servir SPA local e abrir o passo "dores" como aluno
2. Para o lado "frente":
   - Para cada uma das 20 regiões em `BODY_REGIONS.frente`, hover sobre o botão no DevTools (Elements panel) para visualizar a área
   - Comparar com a posição real do membro na nova ilustração
   - Ajustar `--top`, `--left`, `--width`, `--height` no inline style até centralizar sobre o membro correto
   - Anotar valores finais
3. Repetir para "costas" (14 regiões)
4. Aplicar todos os valores anotados ao objeto `BODY_REGIONS` no código
5. Recarregar e validar cada região clicando uma a uma

### Success Criteria:

#### Automated:
- [ ] `BODY_REGIONS` mantém exatamente os mesmos 34 IDs de `region` (nenhum adicionado/removido)
- [ ] Cada entry tem `top`, `left`, `width`, `height` numéricos entre 0 e 100

#### Manual:
- [ ] Cada uma das 20 regiões da frente, ao ser tocada, fica visualmente centrada sobre o membro correto da nova ilustração
- [ ] Cada uma das 14 regiões das costas idem
- [ ] Não há regiões sobrepostas que dificultem seleção
- [ ] Estado `is-selected` aparece corretamente (background teal) ao tocar
- [ ] Testar em viewport mobile (390px) e desktop — o `aspect-ratio: 4/5` + `min(100%, 560px)` mantém proporção, mas validar visualmente

---

## Phase 3: Validação E2E e regressão

### Files to Modify:

- (sem alterações de código nesta fase — apenas verificação)

### Success Criteria:

#### Manual:
- [ ] Fluxo completo do questionário pré-treino do aluno funciona: lado frente → marcar dor → lado costas → marcar dor → submit
- [ ] Os pontos selecionados aparecem corretamente no resumo (`precheck-pain-summary`) com os labels esperados
- [ ] Admin abre o questionário enviado em `#pre-training-questionnaires` e vê os pontos de dor listados como texto (sem mapa)
- [ ] Fallback funciona: em DevTools, bloquear request das SVGs e confirmar que `.precheck-body-fallback` aparece com botões textuais
- [ ] PWA instalada (se já estava): após o reload pós-bump do SW, novas imagens aparecem offline (testar em modo airplane no DevTools)

---

## Notas

- Não há lint nem testes automatizados configurados no projeto — toda validação é manual via browser
- Bump do `CACHE_NAME` é crítico: sem ele, clientes que já instalaram a PWA continuarão vendo as SVGs antigas porque o SW serve do cache
- O fallback textual em `.precheck-body-fallback` torna a feature resiliente mesmo se as imagens falharem — bom safety net durante o rollout
