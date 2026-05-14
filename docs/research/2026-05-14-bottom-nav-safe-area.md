---
date: 2026-05-14
researcher: claude
research_question: "Como o padding/safe-area do menu inferior (#bottom-nav) é controlado na versão webapp?"
status: complete
---

# Research: Padding / safe-area do menu inferior na webapp

## Summary

A altura, o padding inferior e a "zona de respiro" (clearance) do `#bottom-nav` são totalmente dirigidos por **variáveis CSS no `:root`** definidas em `css/reset.css`. O cálculo combina:

- `--nav-height` (clamp responsivo) — altura visual dos itens
- `--nav-bottom-padding` — padding extra na parte de baixo, derivado de `env(safe-area-inset-bottom)` mas **limitado a 2px no browser** e elevado a **6px em modo standalone** (PWA instalada)
- `--nav-clearance` — somatório usado como `padding-bottom` do `#main-content` para o conteúdo não ficar atrás da nav

A `viewport-fit=cover` está presente no `<meta viewport>` (`index.html:5`), portanto `env(safe-area-inset-*)` retorna valores reais em iOS. A detecção de standalone é feita por JS inline antes do CSS carregar (`index.html:26-34`), adicionando a classe `html.standalone-app` que ativa o padding "PWA". Existe também uma media query equivalente `@media (display-mode: standalone)`.

Resumindo o ponto de dor: **no browser comum a safe-area do iPhone é deliberadamente "cortada" para no máx. 2px** (`min(env(safe-area-inset-bottom), 2px)` — `css/reset.css:14`). Isso é intencional no código atual, mas costuma ser exatamente o que dificulta o ajuste fino quando se quer respeitar a home-indicator do iOS no Safari.

## Detailed Findings

### 1. Variáveis raiz que comandam a nav

`css/reset.css:8-19`

```css
:root {
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --nav-height: clamp(48px, 13vw, 58px);
    /* limita a safe area a no máximo 2px */
    --nav-bottom-padding: min(env(safe-area-inset-bottom), 2px);
    --nav-bottom-offset: 0px;
    --nav-clearance: calc(var(--nav-height) + 2px + var(--nav-bottom-padding));
}
```

- `--safe-bottom` é declarado mas **não é referenciado em nenhum outro lugar** do CSS (`grep` em `css/`). É efetivamente código morto hoje.
- `--nav-bottom-padding` é o valor que vira o `padding-bottom` real da nav e parte da altura.
- O `+ 2px` solto dentro de `--nav-clearance` é uma folga estética entre conteúdo e nav.

### 2. Override em modo standalone (PWA instalada)

`css/reset.css:60-70`

```css
@media all and (display-mode: standalone) {
    :root {
        --nav-bottom-padding: 6px;
        --nav-bottom-offset: 0px;
    }
}

html.standalone-app {
    --nav-bottom-padding: 6px;
    --nav-bottom-offset: 0px;
}
```

A classe `standalone-app` é adicionada pelo bootstrap inline em `index.html:26-34`, antes do CSS carregar, cobrindo o caso `window.navigator.standalone === true` (iOS legacy) além do display-mode matchMedia.

Resultado prático: no PWA instalado a nav ganha 6px de padding inferior fixo; no browser (Safari/Chrome rodando como página) ela fica com no máximo 2px, **independentemente** do tamanho real da safe-area-inset-bottom.

### 3. Override por tela baixa

`css/components.css:253-258`

```css
@media (max-height: 670px) {
    :root {
        --nav-height: clamp(46px, 11vw, 54px);
        --nav-clearance: calc(var(--nav-height) + 8px + var(--nav-bottom-padding));
    }
}
```

Reduz a altura e aumenta o respiro do conteúdo em telas curtas.

### 4. Aplicação no `#bottom-nav`

`css/components.css:196-211`

```css
#bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    background: var(--dx-surface);
    border-top: var(--border-width) solid var(--dx-border);
    display: flex;
    justify-content: space-around;
    align-items: stretch;
    padding-bottom: var(--nav-bottom-padding);
    z-index: 1000;
    box-sizing: border-box;
    height: calc(var(--nav-height) + var(--nav-bottom-padding));
}
```

Observações:
- A nav está **ancorada em `bottom: 0`** sem `env(safe-area-inset-bottom)` no `bottom`. Em iOS Safari rodando como webapp (não PWA), isso significa que a barra fica colada à borda física da tela, com apenas até 2px de respiro interno acima da home-indicator.
- Cada `.nav-item` tem `height: var(--nav-height)` (`css/components.css:223`), portanto o `padding-bottom` da nav vira espaço puro abaixo dos ícones.

### 5. Clearance do conteúdo principal

`css/reset.css:77-89`

```css
#main-content {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding-top: calc(45px + env(safe-area-inset-top));
    padding-bottom: var(--nav-clearance);
}
```

A safe-area de cima é aplicada cheia (`+ env(safe-area-inset-top)`), enquanto a de baixo passa pelo filtro `min(..., 2px)` antes de virar `--nav-clearance`. É uma assimetria intencional nas regras atuais.

### 6. Controle de visibilidade via JS

`js/app.js:37-46` e chamadas espalhadas:

```js
bottomNav: document.getElementById('bottom-nav'),
...
setBottomNavVisible(visible) {
    this.bottomNav.classList.toggle('hidden', !visible);
    document.documentElement.classList.toggle('bottom-nav-visible', visible);
},
```

Chamado em pontos como `js/app.js:408, 526, 585, 630, 695, 1167, 1171` para esconder em telas públicas/auth e mostrar nas áreas logadas. A classe `html.bottom-nav-visible` apenas troca a cor de fundo de `html`/`body` (`css/reset.css:72-75`), não altera padding.

A renderização dos itens fica em `js/app.js:1199-1213` (`this.bottomNav.innerHTML = items.map(...)`).

### 7. Viewport e PWA shell

`index.html:5`

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

`viewport-fit=cover` é o que habilita `env(safe-area-inset-*)` a retornar valores diferentes de zero em iOS. Já está correto — o "problema" do ajuste não vem daqui, vem do `min(..., 2px)` aplicado no `:root`.

### 8. Outros usos de safe-area-inset-bottom (não relacionados ao nav, mas relevantes para contexto)

- `css/components.css:275` — bottom-sheet "Mais" usa `calc(16px + env(safe-area-inset-bottom))` (sem cap).
- `css/components.css:969` — outro componente fixo no rodapé usando `calc(12px + env(safe-area-inset-bottom))` (sem cap).
- `js/ui.js:182` — toast/modal inline usa `calc(24px + env(safe-area-inset-bottom))`.
- `css/pages.css:160-161` — página com paddings `calc(40px + env(safe-area-inset-*))`.

Ou seja: **o `#bottom-nav` é o único elemento que aplica o cap `min(..., 2px)` na safe-area inferior**. Todos os demais elementos fixos no rodapé respeitam o valor cheio.

## Code References

- `css/reset.css:8-19` — definição das variáveis `--nav-height`, `--nav-bottom-padding`, `--nav-clearance` (cap de 2px no browser)
- `css/reset.css:60-70` — override standalone (`6px`)
- `css/reset.css:77-89` — `#main-content` aplica `padding-bottom: var(--nav-clearance)`
- `css/components.css:196-211` — estilos do `#bottom-nav` (`bottom: 0`, `padding-bottom: var(--nav-bottom-padding)`, `height` somando ambos)
- `css/components.css:213-242` — `.nav-item` com `height: var(--nav-height)`
- `css/components.css:253-258` — override para telas com `max-height: 670px`
- `index.html:5` — `viewport-fit=cover`
- `index.html:26-34` — script inline que adiciona `html.standalone-app` antes do CSS
- `index.html:21` — `apple-mobile-web-app-status-bar-style: black-translucent`
- `index.html:56-58` — markup do `<nav id="bottom-nav">`
- `js/app.js:37-46` — referência ao elemento e helper `setBottomNavVisible`
- `js/app.js:1199-1213` — render dos itens da nav
- `css/components.css:275, 969`; `js/ui.js:182`; `css/pages.css:160-161` — outros consumidores de `env(safe-area-inset-bottom)` sem cap, úteis como referência cruzada
