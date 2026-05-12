---
date: 2026-05-12
researcher: claude
research_question: "A responsividade do menu inferior está adaptável para os tamanhos de tela?"
status: complete
---

# Pesquisa: Responsividade do Menu Inferior (`#bottom-nav`)

## Resumo

**Resposta curta: parcialmente.** O menu inferior tem responsividade *fluida* (largura 100% + `flex` distribuindo os itens com `flex: 1`) e respeita safe-area de iOS, mas **não possui nenhuma media query dedicada** para ajustar tamanho de fonte, ícone, altura ou comportamento em telas muito pequenas ou muito grandes. Em telas estreitas com muitos itens (perfil admin tem 7 itens), o layout depende exclusivamente do encolhimento por `flex: 1`, o que pode comprimir rótulos.

## Detalhamento

### Marcação

- `index.html:47` — `<nav id="bottom-nav" class="hidden">` é o container fixo, único; conteúdo é injetado via JS.
- `index.html:5` — viewport definido com `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover` (suporte a notch/safe-area via `viewport-fit=cover`).

### Estilos do menu (`css/components.css:79-114`)

```css
#bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: var(--dx-surface);
    border-top: var(--border-width) solid var(--dx-border);
    display: flex;
    justify-content: space-around;
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 1000;
    height: calc(65px + env(safe-area-inset-bottom));
}

.nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--dx-muted);
    font-size: 10px;
    font-weight: 500;
    height: 65px;
    transition: all 0.2s ease;
}

.nav-item.active { color: var(--dx-teal); }
.nav-item i      { font-size: 20px; }
```

O que isso garante:
- **Largura fluida** — `width: 100%` no nav e `flex: 1` em cada item distribui o espaço igualmente em qualquer largura de tela.
- **Safe-area iOS** — `padding-bottom: env(safe-area-inset-bottom)` e altura `calc(65px + env(safe-area-inset-bottom))` empurram o conteúdo acima da barra home do iPhone.
- **Altura fixa** — 65px de área útil, independente de viewport.
- **Fonte e ícone fixos** — `font-size: 10px` no rótulo e `20px` no ícone, sem variação por tamanho de tela.

### Conteúdo dinâmico (`js/app.js:1105-1147`)

A função `updateNav(activeHash)` renderiza itens diferentes por papel:

- **admin** (`js/app.js:1118-1126`) — **7 itens**: Dash, Usuários, Clubes, Treinos, Planos, Cobranças, Config.
- **responsible / businessman** (`js/app.js:1127-1132`) — **6 itens**: Início, Atletas, Treinos, Planos, Faturas, Perfil.
- **student** (`js/app.js:1133-1139`) — **5 itens**: Início, Treinos, Planos, Presença, Perfil.

Implicação para responsividade: em um iPhone SE (375px), 7 itens (admin) recebem ~53px cada — suficiente para o ícone (20px) e rótulo curto, mas labels como "Usuários" e "Cobranças" ficam apertados na fonte de 10px. Não há truncamento, ellipsis, nem fallback "só ícone".

### Verificação de media queries

`grep` em `css/components.css`, `css/pages.css`, `css/variables.css`, `css/reset.css`:

- **Nenhuma regra `@media` aplica-se a `#bottom-nav` ou `.nav-item`.** As media queries existentes no projeto miram `max-width: 380px`, `420px`, `480px` e `min-width: 620px`, `700px`, `760px`, mas todas afetam outros componentes (`components.css:250, 275, 300, 829, 843` e várias em `pages.css`), não o menu.

### Visibilidade do menu

`updateNav` esconde o menu em rotas de auth (`#login`, `#register`, `#forgot-password`, `#update-password`) — `js/app.js:1107-1110`. Em outras rotas, `app.js` aplica `.hidden` em pontos específicos: 351, 469, 528, 573, e remove em 638, 1112.

## Conclusão objetiva

| Aspecto | Status |
|---|---|
| Largura adapta a qualquer viewport | ✅ Sim (`width: 100%` + `flex: 1`) |
| Safe-area iOS (notch / home bar) | ✅ Sim (`env(safe-area-inset-bottom)`) |
| Altura responde a viewport | ❌ Não (fixo 65px) |
| Fonte/ícone escalam por tela | ❌ Não (10px / 20px fixos) |
| Tratamento para telas <380px com 6–7 itens | ❌ Não há media query dedicada |
| Tratamento para tablets/desktop largos | ❌ Não há max-width nem layout alternativo |
| Truncamento/ellipsis em rótulos longos | ❌ Não definido |

## Code References

- `index.html:5` — viewport com `viewport-fit=cover`
- `index.html:47` — container `<nav id="bottom-nav">`
- `css/components.css:80-92` — estilos do `#bottom-nav` (fixed, flex, safe-area)
- `css/components.css:94-114` — `.nav-item`, `.nav-item.active`, `.nav-item i`
- `js/app.js:1105-1147` — `updateNav()` decide itens por role
- `js/app.js:1118-1139` — listas de itens por papel (7 admin / 6 responsible / 5 student)
