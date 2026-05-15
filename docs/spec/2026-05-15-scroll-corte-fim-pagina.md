---
date: 2026-05-15
planner: claude
plan_title: "Corrigir corte de conteúdo no fim do scroll (bottom-nav sobreposta)"
status: approved
related_research: docs/research/2026-05-15-scroll-corte-fim-pagina.md
---

# Implementation Plan: Corrigir corte de conteúdo no fim do scroll

## Overview

O cap artificial `--nav-safe-area-cap: 2px` em [css/reset.css:14-15](css/reset.css#L14-L15) força `--nav-bottom-padding` a no máximo 2px, quebrando dois cálculos que precisam ser coerentes:

1. A altura/padding interno da `#bottom-nav` (que precisa crescer para acomodar o `safe-area-inset-bottom` e empurrar os ícones acima do home indicator/gesture bar).
2. O `--nav-clearance` que compõe o `--page-bottom-padding` aplicado em `.page-container`.

O resultado é que o último conteúdo de cada página (ex.: botão "SAIR DA CONTA", card "PRO ELITE / CONTRATAR AGORA", último treino em Presença) fica sobreposto pela bottom nav em dispositivos com `env(safe-area-inset-bottom) > 2px`.

A correção é remover o cap e deixar `--nav-bottom-padding` espelhar `--safe-bottom` integralmente. A solução é **universal**: em dispositivos sem safe area (desktop, Android com botões), `env(safe-area-inset-bottom)` já é 0 e nada muda visualmente; em iOS com home indicator e Android com gesture bar, a nav cresce o suficiente para que ícones, área tocável e clearance da página fiquem coerentes.

## Current State

Tokens definidos em [css/reset.css:8-22](css/reset.css#L8-L22):

```css
--safe-bottom: env(safe-area-inset-bottom, 0px);
--nav-height: clamp(48px, 13vw, 58px);

/* limita a safe area a no máximo 2px */
--nav-safe-area-cap: 2px;
--nav-bottom-padding: min(var(--safe-bottom), var(--nav-safe-area-cap));

--nav-bottom-offset: 0px;
--nav-clearance: calc(var(--nav-height) + var(--nav-bottom-padding));
--page-end-gap: max(clamp(20px, 4vh, 32px), var(--safe-bottom));
--page-bottom-padding: calc(var(--nav-clearance) + var(--page-end-gap));
```

Consumidores do token:
- [css/components.css:207](css/components.css#L207) — `#bottom-nav { padding-bottom: var(--nav-bottom-padding); }`
- [css/components.css:210](css/components.css#L210) — `#bottom-nav { height: calc(var(--nav-height) + var(--nav-bottom-padding)); }`
- [css/components.css:256](css/components.css#L256) — redeclaração de `--nav-clearance` dentro de `@media (max-height: 670px)`.
- [css/pages.css:20](css/pages.css#L20) — `padding-bottom: var(--page-bottom-padding)` aplicado em `#main-content > .page-container` quando `html.bottom-nav-visible`.
- [css/reset.css:80](css/reset.css#L80) — `scroll-padding-bottom: var(--page-bottom-padding)` em `#main-content`.

Cálculo atual no iPhone (393×852, `safe-area-inset-bottom ≈ 34px`):

| Token | Valor |
| --- | --- |
| `--nav-bottom-padding` | 2px (capado) |
| Altura `#bottom-nav` | 51 + 2 = 53px |
| `--nav-clearance` | 53px |
| `--page-end-gap` | max(32, 34) = 34px |
| `--page-bottom-padding` | 87px |

Como a nav está `position: fixed; bottom: 0` com `viewport-fit=cover` ([index.html:5](index.html#L5)), seus ícones renderizam dentro do retângulo de 53px partindo do bottom físico — ou seja, parcialmente sob o home indicator. O clearance de 87px não compensa porque foi calculado com o mesmo token capado.

## What We're NOT Doing

- Não alterar a estrutura HTML das páginas nem o seletor `#main-content > .page-container`.
- Não introduzir gates por user-agent ou `@supports (-webkit-touch-callout: none)` — a correção deve ser universal via `env(safe-area-inset-bottom)`.
- Não mexer no `--page-end-gap` (continua usando `--safe-bottom` integralmente; ele já está correto).
- Não alterar os outros consumidores de `env(safe-area-inset-bottom)` (bottom sheets em [css/components.css:277,971](css/components.css#L277), `auth-screen` em [css/pages.css:166](css/pages.css#L166)).
- Não atualizar a lista de cache do service worker (mudança é em CSS já cacheado pelo SW pelo nome do arquivo — o usuário precisará atualizar manualmente, mas isso é fora de escopo).

---

## Phase 1: Remover o cap de `--nav-bottom-padding`

Tornar `--nav-bottom-padding` igual a `--safe-bottom`, eliminando o token `--nav-safe-area-cap`. Isso restaura a coerência entre altura real da bottom nav e o clearance de página em qualquer dispositivo.

### Files to Modify:

- [x] [css/reset.css](css/reset.css) — bloco `:root` (linhas 8–22):
  - Remover `--nav-safe-area-cap: 2px;` (linha 14).
  - Substituir `--nav-bottom-padding: min(var(--safe-bottom), var(--nav-safe-area-cap));` por `--nav-bottom-padding: var(--safe-bottom);`.
  - Remover o comentário `/* limita a safe area a no máximo 2px */` (linha 13).
  - Demais tokens (`--nav-clearance`, `--page-end-gap`, `--page-bottom-padding`) permanecem inalterados — eles vão recalcular automaticamente.

### Success Criteria:

#### Automated:
- [ ] `python3 -m http.server 8080` sobe sem erro e a SPA carrega no `http://localhost:8080`.
- [ ] Inspeção via DevTools: `getComputedStyle(document.documentElement).getPropertyValue('--nav-bottom-padding')` retorna o mesmo valor que `--safe-bottom`.
- [ ] Inspeção via DevTools: altura computada da `#bottom-nav` = `--nav-height + --safe-bottom`.
- [ ] Inspeção via DevTools: `padding-bottom` computado de `#main-content > .page-container` em rota autenticada = `--nav-height + 2*--safe-bottom + clamp(20px,4vh,32px)` (porque `--nav-clearance` e `--page-end-gap` somam o safe-bottom).

#### Manual (desktop / DevTools Device Toolbar):
- [ ] Rota `#mais` (estudante): botão "SAIR DA CONTA" totalmente visível ao rolar até o fim, sem sobreposição da bottom nav.
- [ ] Rota `#plans` (estudante): card "PRO ELITE" e botão "CONTRATAR AGORA" totalmente visíveis no fim do scroll.
- [ ] Rota `#presenca` (estudante): o último item da lista de treinos é totalmente visível ao rolar até o fim.
- [ ] Rotas equivalentes nos papéis `admin` e `responsible`: último elemento visível.
- [ ] Em viewport desktop sem safe area (Chrome normal, sem device toolbar): visual da bottom nav idêntico ao anterior (altura ~51px, sem crescimento).
- [ ] Em DevTools com simulador "iPhone 14 Pro" e `viewport-fit=cover` ativo: bottom nav fica visivelmente mais alta (~85px = 51 + 34), ícones renderizam acima da linha do home indicator simulado.
- [ ] `@media (max-height: 670px)` (ex.: viewport 360×640): clearance continua funcionando (sem sobreposição), nav usa `--nav-height` reduzido.
- [ ] Bottom sheets que usam `safe-area-inset-bottom` (ex.: overlay "Mais", modais em [components.css:277,971](css/components.css#L277)) continuam com aparência correta — não regrediram.
- [ ] Tela de login (`auth-screen`) inalterada — não tem bottom nav, padding próprio em [pages.css:166](css/pages.css#L166).

#### Manual (dispositivo real, se possível):
- [ ] iPhone com home indicator: confirmar que o último item de cada página fica acima da nav, sem corte; ícones da bottom nav acima do home indicator.
- [ ] Android com gesture bar: mesma verificação.
- [ ] Android com 3 botões: visual inalterado.

---

## Review checklist (antes de marcar approved)

- [ ] Sem regressões em telas curtas (`max-height: 670px`).
- [ ] Sem regressões em bottom sheets e modais.
- [x] Sem novas referências a `--nav-safe-area-cap` no codebase (`grep -rn "nav-safe-area-cap"` retorna vazio após a mudança).
- [x] Mudança limitada a `css/reset.css` (3 linhas alteradas/removidas).
