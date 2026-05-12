---
date: 2026-05-12
planner: claude
plan_title: "Responsividade do menu inferior + reorganização do menu admin"
status: completed
related_research: docs/research/2026-05-12-responsividade-menu-inferior.md
---

# Implementation Plan: Responsividade do menu inferior + reorganização do menu admin

## Overview

O menu inferior (`#bottom-nav`) hoje é fluido na largura mas usa fonte (10px), ícone (20px) e altura (65px) fixos, sem media queries dedicadas. Em telas <380px com 7 itens (admin), os labels comprimem mal. Este plano:

1. Adiciona **escala fluida** (`clamp()`) para fonte, ícone, altura e gap, mais um breakpoint dedicado <380px.
2. Reorganiza o menu admin de 7 → **5 itens**: 4 principais (Dash, Usuários, Treinos, Planos) + botão **"Mais"** que abre overlay com itens secundários (Clubes, Cobranças, Config).

## Current State

- `css/components.css:79-114` — `#bottom-nav` e `.nav-item` com valores fixos (sem `@media` no menu).
- `js/app.js:1105-1147` — `updateNav()` injeta itens por role; admin tem 7 itens hardcoded em `app.js:1118-1126`.
- `index.html:47` — container `<nav id="bottom-nav" class="hidden">`.
- Não há overlay/submenu reaproveitável; modais existentes usam padrão próprio (ver `js/ui.js` se útil).

## What We're NOT Doing

- Layout alternativo para tablets/desktop (>=620px) — fora de escopo.
- Truncamento com ellipsis nos labels (escala fluida + reorganização resolvem o caso admin).
- Mudanças nos menus de `responsible`/`businessman` (6 itens) e `student` (5 itens) — apenas se a escala fluida quebrar algo durante teste manual.
- Refatorar `updateNav()` para sistema declarativo de rotas.

---

## Phase 1: Escala fluida do menu inferior

### Files to Modify:
- [x] `css/components.css:79-114` — substituir valores fixos do `#bottom-nav` e `.nav-item` por `clamp()` e adicionar bloco `@media (max-width: 380px)` específico.

### Detalhes técnicos:

- `#bottom-nav`: trocar `height: calc(65px + env(safe-area-inset-bottom))` por `height: calc(clamp(56px, 14vw, 68px) + env(safe-area-inset-bottom))`.
- `.nav-item`:
  - `height: clamp(56px, 14vw, 68px)` (espelhar com nav).
  - `font-size: clamp(9px, 2.6vw, 11px)`.
  - `gap: clamp(2px, 0.8vw, 5px)`.
- `.nav-item i`: `font-size: clamp(18px, 5.2vw, 22px)`.
- Bloco `@media (max-width: 380px) { .nav-item span { letter-spacing: -0.2px; } .nav-item { padding: 0 2px; } }` para apertar tipografia onde o admin ainda fica justo.
- Adicionar `white-space: nowrap` + `text-align: center` no `.nav-item span` para evitar quebra em 2 linhas (que estoura a altura).

### Success Criteria:

#### Manual:
- [ ] Em iPhone SE (375px) com perfil admin (após Phase 2 → 5 itens), todos os labels cabem em uma linha sem corte.
- [ ] Em viewport de 320px (limite), o nav ainda renderiza sem overflow horizontal e os ícones permanecem legíveis.
- [ ] Em viewport ≥420px, fonte/ícone parecem visualmente equivalentes ao atual (não encolhem inadvertidamente).
- [ ] Safe-area iOS continua respeitada (testar em simulador ou DevTools com `env(safe-area-inset-bottom)` simulado).

---

## Phase 2: Reorganização do menu admin com botão "Mais"

### Files to Modify:
- [x] `js/app.js:1118-1126` — reduzir lista admin para 5 itens (4 rotas + 1 ação `more`).
- [x] `js/app.js:1141-1146` — adaptar `innerHTML` para renderizar item especial `more` com `data-action="more"` (não é `<a href>`).
- [x] `js/app.js` (próximo a `updateNav`) — adicionar `openMoreMenu()` que cria/exibe overlay com Clubes, Cobranças, Config; fechar ao clicar fora, em ESC, ou ao escolher item.
- [x] `css/components.css` (após `.nav-item i`) — estilos do overlay `.more-menu-overlay` e `.more-menu-sheet` (bottom sheet acima do `#bottom-nav`, com `z-index > 1000`).
- [x] `index.html` — sem alterações (overlay é injetado via JS).

### Detalhes técnicos:

**Lista admin nova** (`app.js:1118-1126`):
```js
const items = role === 'admin' ? [
    { h: '#dashboard', i: 'ph-chart-line-up', t: 'Dash' },
    { h: '#users',     i: 'ph-users',         t: 'Usuários' },
    { h: '#trainings', i: 'ph-calendar',      t: 'Treinos' },
    { h: '#plans',     i: 'ph-clipboard-text',t: 'Planos' },
    { a: 'more',       i: 'ph-dots-three',    t: 'Mais' }
] : (...);
```

**Render** — diferenciar `item.h` (link) vs `item.a === 'more'` (botão):
```js
this.bottomNav.innerHTML = items.map(item => {
  const isActive = item.h && hash === item.h;
  if (item.a === 'more') {
    const moreActive = ['#clubs','#payments','#profile'].includes(hash);
    return `<button type="button" class="nav-item ${moreActive ? 'active' : ''}" data-action="more" aria-label="Mais opções">
      <i class="ph${moreActive ? '-bold' : ''} ${item.i}"></i><span>${item.t}</span>
    </button>`;
  }
  return `<a href="${item.h}" class="nav-item ${isActive ? 'active' : ''}">
    <i class="ph${isActive ? '-bold' : ''} ${item.i}"></i><span>${item.t}</span>
  </a>`;
}).join('');
this.bottomNav.querySelector('[data-action="more"]')?.addEventListener('click', () => this.openMoreMenu());
```

**`openMoreMenu()`** — cria overlay com itens Clubes (`ph-shield`), Cobranças (`ph-receipt`), Config (`ph-gear`). Cada clique navega via `location.hash = '#...'` e fecha. Fechar ao clicar fora, ESC, ou re-clicar no botão "Mais".

**CSS overlay** — bottom sheet:
```css
.more-menu-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1100; display: flex; align-items: flex-end; }
.more-menu-sheet { background: var(--dx-surface); width: 100%; border-radius: 16px 16px 0 0; padding: 16px 12px calc(16px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 4px; }
.more-menu-item { display: flex; align-items: center; gap: 12px; padding: 14px 12px; color: var(--dx-text); font-size: 15px; background: transparent; border: 0; text-align: left; border-radius: 8px; }
.more-menu-item i { font-size: 22px; color: var(--dx-teal); }
.more-menu-item:hover { background: rgba(255,255,255,0.04); }
```

**Estado ativo do "Mais"** — quando a rota atual for `#clubs`, `#payments` ou `#profile`, marcar `.nav-item.active` no botão Mais para feedback visual.

### Success Criteria:

#### Manual:
- [ ] Menu admin mostra exatamente 5 itens: Dash, Usuários, Treinos, Planos, Mais.
- [ ] Clicar em "Mais" abre bottom sheet com Clubes, Cobranças, Config.
- [ ] Clicar em qualquer item do sheet navega para a rota correta e fecha o overlay.
- [ ] Clicar fora do sheet (no backdrop) fecha sem navegar.
- [ ] ESC fecha o overlay.
- [ ] Quando rota ativa é `#clubs`/`#payments`/`#profile`, o botão "Mais" aparece destacado (`.active`).
- [ ] Não há múltiplos overlays empilhados ao reabrir.
- [ ] Outras roles (`responsible`, `businessman`, `student`) continuam funcionando inalteradas.

---

## Phase 3: Verificação cruzada e ajustes finos

### Files to Modify:
- [ ] Nenhuma alteração de código planejada — fase de validação. Ajustes pontuais em `css/components.css` se um caso quebrar.

### Success Criteria:

#### Manual:
- [ ] Teste em viewport 320px / 375px / 414px / 480px / 768px para cada papel (admin, responsible, student) — menu legível e sem overflow em todos.
- [ ] Service worker (`service-worker.js`) ainda serve `css/components.css` — se o cache estiver lockado a uma versão, bumpar versão do SW (CLAUDE.md indica atualizar lista quando assets críticos mudam; verificar se aplicável).
- [ ] Sem regressão visual em outras telas que usam tokens `--dx-*` (overlay reaproveita variáveis existentes).

---

## Open Questions

Nenhuma — escopo, breakpoints e estratégia do "Mais" foram decididos antes da escrita.
