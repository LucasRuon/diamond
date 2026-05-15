---
date: 2026-05-15
researcher: claude
research_question: "Por que o scroll até o final das páginas corta conteúdo (último card/botão fica atrás da bottom nav)?"
status: complete
---

# Pesquisa: Corte de conteúdo no fim do scroll (bottom-nav sobreposta)

## Resumo

O conteúdo final das páginas (ex.: botão "SAIR DA CONTA" em Mais, card "PRO ELITE / CONTRATAR AGORA" em Planos, último "Treino" em Presença) fica visualmente escondido atrás da bottom nav porque o cálculo do espaço reservado para a navegação subestima a altura visual real ocupada pela barra em iPhones com home indicator.

A causa raiz é o cap artificial em [css/reset.css:13-15](css/reset.css#L13-L15):

```css
--nav-safe-area-cap: 2px;
--nav-bottom-padding: min(var(--safe-bottom), var(--nav-safe-area-cap));
```

Esse `--nav-bottom-padding` é usado em duas frentes que precisam ser coerentes — e não são:

1. **Altura real da bottom nav** ([css/components.css:210](css/components.css#L210)): `height: calc(var(--nav-height) + var(--nav-bottom-padding))`. Como `--nav-bottom-padding` está travado em 2px, a nav tem ~53px de altura CSS (51px de `--nav-height` + 2px). Ela está fixada em `bottom: 0`, então em iPhones a parte inferior fica sob o home indicator (~34px do `safe-area-inset-bottom`).
2. **Padding inferior das páginas** ([css/pages.css:19-21](css/pages.css#L19-L21)): `padding-bottom: var(--page-bottom-padding)` = `--nav-clearance + --page-end-gap` = `(nav-height + 2px) + max(clamp(20px,4vh,32px), --safe-bottom)`.

O `--page-end-gap` ([reset.css:20](css/reset.css#L20)) **usa o `--safe-bottom` cheio** (~34px no iPhone), mas o `--nav-clearance` ([reset.css:19](css/reset.css#L19)) **não** — ele soma apenas o `--nav-bottom-padding` capado em 2px. O resultado é que a folga calculada subestima o quanto a barra ocupa visualmente quando o navegador empurra a UI acima do home indicator.

Em iPhone (viewport ~393×852, safe-area-inset-bottom ≈ 34px):

| Variável | Valor calculado |
| --- | --- |
| `--nav-height` | clamp(48, 13vw=51, 58) ≈ **51px** |
| `--safe-bottom` | **34px** |
| `--nav-bottom-padding` | min(34, 2) = **2px** (cap) |
| `--nav-clearance` | 51 + 2 = **53px** |
| `--page-end-gap` | max(32, 34) = **34px** |
| `--page-bottom-padding` | 53 + 34 = **87px** |
| Altura real da `#bottom-nav` (CSS) | **53px** |

Em condições normais (sem safe area), 87px de padding deixariam 34px de respiro entre o último elemento e o topo da nav. O problema é que, em iOS, o navegador desloca o viewport para cima do home indicator: a nav `position: fixed; bottom: 0` permanece colada à borda física, mas a área tocável útil + visual da barra acaba ocupando mais que os 53px calculados na CSS quando contado em relação ao conteúdo. Como a CSS não compensa essa diferença (porque o cap quebrou a soma), o conteúdo final fica sob a barra.

## Achados detalhados

### Onde o gap inferior é definido
- [css/reset.css:8-22](css/reset.css#L8-L22) — declaração dos tokens. O cap em 2px (`--nav-safe-area-cap`) é a única decisão que reduz o espaço reservado; sem ele, `--nav-bottom-padding` seria igual ao `safe-area-inset-bottom` e tudo bateria.
- [css/reset.css:68-81](css/reset.css#L68-L81) — `#main-content` é o container de scroll (`overflow-y: auto`), com `padding-bottom: 0` e `scroll-padding-bottom: var(--page-bottom-padding)`. O respiro inferior fica todo no filho `.page-container`.

### Onde o padding inferior é aplicado nas páginas
- [css/pages.css:15-21](css/pages.css#L15-L21):
  ```css
  #main-content > .page-container { padding-bottom: var(--page-end-gap); }
  html.bottom-nav-visible #main-content > .page-container { padding-bottom: var(--page-bottom-padding); }
  ```
  O seletor é **filho direto** (`>`). Toda página afetada usa `<div class="page-container">` diretamente dentro de `#main-content` — verificado em [js/pages/student/plans.js:12-28](js/pages/student/plans.js#L12-L28), [js/pages/student/attendance.js:41](js/pages/student/attendance.js#L41), [js/pages/student/trainings.js:16](js/pages/student/trainings.js#L16) e [js/app.js:632](js/app.js#L632), [js/app.js:736](js/app.js#L736). Não há níveis intermediários quebrando o seletor.

### Controle da classe `bottom-nav-visible`
- [js/app.js:44-47](js/app.js#L44-L47) — `setBottomNavVisible(visible)` aplica a classe em `html`. Rotas autenticadas chamam `setBottomNavVisible(true)` no início do render ([app.js:695](js/app.js#L695), [app.js:1171](js/app.js#L1171)). Logo, o padding `--page-bottom-padding` está ativo nas telas que aparecem nos screenshots.

### A nav em si
- [css/components.css:196-211](css/components.css#L196-L211) — `#bottom-nav`:
  - `position: fixed; bottom: 0;`
  - `padding-bottom: var(--nav-bottom-padding)` (2px)
  - `height: calc(var(--nav-height) + var(--nav-bottom-padding))` (≈53px)

  Não há `padding-bottom: env(safe-area-inset-bottom)` real — está deliberadamente capado em 2px. Em consequência, a barra não “cresce” para acomodar o home indicator; o sistema operacional sobrepõe.

### Outros locais que usam `safe-area-inset-bottom`
- [css/components.css:277](css/components.css#L277), [css/components.css:971](css/components.css#L971) — bottom sheets/modais usam `calc(16px + env(safe-area-inset-bottom))` (sem cap).
- [css/pages.css:166](css/pages.css#L166) — telas de auth (`auth-screen`) usam `calc(40px + env(safe-area-inset-bottom))`. Essas páginas escondem a bottom nav ([app.js:1166-1168](js/app.js#L1166-L1168)), por isso não sofrem o corte.

## Motivo do corte (resposta direta)

O `--nav-bottom-padding` é forçado a no máximo 2px ([reset.css:14-15](css/reset.css#L14-L15)). Esse valor entra duas vezes no layout:
1. Define a **altura CSS** da `#bottom-nav` (53px), mas a barra fica visualmente apoiada acima do home indicator do iPhone, que ocupa ~34px adicionais que a CSS não soma.
2. Compõe `--nav-clearance` (53px) somado ao `--page-end-gap` (34px) para produzir `--page-bottom-padding` (87px), que vira o `padding-bottom` do `.page-container`.

Como a barra na prática "rouba" mais espaço visual do que os 53px calculados (o sistema empurra o conteúdo dela acima do home indicator sem que a CSS perceba), o respiro de ~34px previsto entre o último item e o topo da nav desaparece e o conteúdo final fica sobreposto.

Em dispositivos sem safe-area-inset-bottom (web desktop, Android sem gesture bar), o cap não causa diferença prática — `--safe-bottom` já é 0 e a conta fecha. O sintoma aparece especificamente em iOS com home indicator e em qualquer dispositivo cujo `env(safe-area-inset-bottom)` seja maior que 2px.

## Referências de código
- [css/reset.css:8-22](css/reset.css#L8-L22) — Tokens `--nav-*` e `--page-bottom-padding`; cap de 2px que origina o problema.
- [css/reset.css:68-81](css/reset.css#L68-L81) — `#main-content` como container de scroll com `padding-bottom: 0`.
- [css/pages.css:15-21](css/pages.css#L15-L21) — Padding inferior do `.page-container` condicionado a `html.bottom-nav-visible`.
- [css/components.css:196-211](css/components.css#L196-L211) — Altura/padding da `#bottom-nav` derivados do mesmo token capado.
- [js/app.js:44-47](js/app.js#L44-L47) — `setBottomNavVisible` aplica/remove a classe que ativa o padding.
- [js/app.js:1164-1217](js/app.js#L1164-L1217) — `updateNav` ativa `bottom-nav-visible` para todas as rotas autenticadas.
- [js/pages/student/plans.js:12-28](js/pages/student/plans.js#L12-L28), [js/pages/student/attendance.js:41](js/pages/student/attendance.js#L41) — Estrutura `#main-content > .page-container` que recebe o padding.
