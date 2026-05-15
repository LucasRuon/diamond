---
date: 2026-05-15T13:37:59-03:00
researcher: Codex
git_commit: 09045e8203f716827063825c7ef96337ac05e961
branch: work
repository: Diamond
topic: "[$research-codebase] eu preciso entender por qual motivo o scroll down está cortando as ultimas informações das páginas do aplicativo?"
tags: [research, codebase, mobile, scroll, bottom-nav]
status: complete
last_updated: 2026-05-15
last_updated_by: Codex
last_updated_note: "Added follow-up research for bottom nav overlay behavior."
---

# Research: por qual motivo o scroll down corta as últimas informações das páginas?

**Date**: 2026-05-15T13:37:59-03:00
**Researcher**: Codex
**Git Commit**: 09045e8203f716827063825c7ef96337ac05e961
**Branch**: work
**Repository**: Diamond

## Research Question

[$research-codebase] eu preciso entender por qual motivo o scroll down está cortando as ultimas informações das páginas do aplicativo?

## Scope

Inclui o shell da SPA/PWA, os tokens globais de layout, o container de scroll, a bottom nav fixa, o controle da classe `bottom-nav-visible`, páginas autenticadas que usam `.page-container`, service worker/cache e documentos históricos diretamente relacionados. Não inclui medição em iPhone real; a checagem de runtime foi feita localmente em Chromium com safe-area simulada.

## Summary

No código vivo deste commit, a causa antiga registrada neste documento nao se aplica mais: `css/reset.css` nao tem mais `--nav-safe-area-cap: 2px`, e `--nav-bottom-padding` agora recebe o `--safe-bottom` inteiro (`css/reset.css:9`, `css/reset.css:13`). O respiro inferior tambem foi movido para o proprio `#main-content`, nao para `#main-content > .page-container` (`css/pages.css:15`, `css/pages.css:19`, `css/pages.css:23`).

Com os arquivos atuais carregados, o layout calcula uma bottom nav de `--nav-height + --safe-bottom` e aplica `--page-bottom-padding` no scroll container. Uma checagem local com viewport 393x852 e `--safe-bottom: 34px` mediu `#bottom-nav` com 85.08px de altura, `#main-content` com 119.09px de padding inferior e o ultimo botao terminando cerca de 33.92px acima do topo da nav. Ou seja: no CSS atual, o ultimo conteudo nao fica coberto nesse cenario simulado.

Se o corte continua aparecendo no aplicativo usado pelo cliente, a explicacao mais consistente com o codebase atual e que o dispositivo ainda esta renderizando uma versao anterior dos assets CSS/Service Worker ou uma publicacao que nao contem o commit atual. As versoes atuais esperadas sao `/css/reset.css?v=10`, `/css/pages.css?v=4` e cache `diamondx-v29` (`index.html:42`, `index.html:45`, `service-worker.js:1`, `service-worker.js:6`, `service-worker.js:9`).

## Detailed Findings

### Shell, scroll e bottom nav

- O shell estatico monta `main#main-content` e `nav#bottom-nav` como irmaos dentro de `#app` (`index.html:48`, `index.html:50`, `index.html:56`).
- `html, body` usam `overflow: hidden`, entao o body nao e o scroll principal (`css/reset.css:22`, `css/reset.css:33`).
- `#app` usa `height: 100dvh`, e em WebKit tambem recebe `height: -webkit-fill-available` (`css/reset.css:37`, `css/reset.css:42`, `css/reset.css:48`, `css/reset.css:55`, `css/reset.css:57`).
- `#main-content` e o container de scroll real, com `flex: 1`, `overflow-y: auto`, `-webkit-overflow-scrolling: touch`, padding superior de safe-area e `scroll-padding-bottom: var(--page-bottom-padding)` (`css/reset.css:66`, `css/reset.css:68`, `css/reset.css:69`, `css/reset.css:74`, `css/reset.css:78`).
- `#bottom-nav` e fixa no viewport com `position: fixed`, `bottom: 0`, `z-index: 1000`, `padding-bottom: var(--nav-bottom-padding)` e `height: calc(var(--nav-height) + var(--nav-bottom-padding))` (`css/components.css:196`, `css/components.css:197`, `css/components.css:198`, `css/components.css:207`, `css/components.css:208`, `css/components.css:210`).

### Tokens atuais de safe-area e clearance

- `--safe-bottom` vem de `env(safe-area-inset-bottom, 0px)` (`css/reset.css:9`).
- `--nav-bottom-padding` agora e igual a `var(--safe-bottom)`, sem cap de 2px (`css/reset.css:13`).
- `--nav-clearance` soma `--nav-height + --nav-bottom-padding` (`css/reset.css:17`).
- `--page-end-gap` usa o maior valor entre `clamp(20px, 4vh, 32px)` e `--safe-bottom` (`css/reset.css:18`).
- `--page-bottom-padding` soma `--nav-clearance + --page-end-gap` (`css/reset.css:19`).
- Em telas com altura ate 670px, `components.css` redefine `--nav-height`, `--page-end-gap` e `--page-bottom-padding`, mantendo a mesma composicao dos tokens (`css/components.css:253`, `css/components.css:255`, `css/components.css:257`, `css/components.css:258`).

### Onde o respiro inferior e aplicado hoje

- `pages.css` documenta que o respiro foi movido para o scroll container porque, no iOS PWA standalone, padding no filho do scroll container nem sempre fica totalmente rolavel ate o fim (`css/pages.css:15`, `css/pages.css:16`, `css/pages.css:17`, `css/pages.css:18`).
- O estado base aplica `padding-bottom: var(--page-end-gap)` em `#main-content` (`css/pages.css:19`, `css/pages.css:20`).
- Quando a bottom nav esta visivel, `html.bottom-nav-visible #main-content` troca para `padding-bottom: var(--page-bottom-padding)` (`css/pages.css:23`, `css/pages.css:24`).
- A regra antiga `html.bottom-nav-visible #main-content > .page-container` nao existe mais no CSS vivo; `.page-container` no reset fornece apenas padding horizontal (`css/reset.css:81`, `css/reset.css:82`).

### Como a classe `bottom-nav-visible` entra

- `setBottomNavVisible(visible)` remove/adiciona `.hidden` na nav e alterna `html.bottom-nav-visible` (`js/app.js:44`, `js/app.js:45`, `js/app.js:46`).
- Rotas autenticadas chamam `updateNav()`, que chama `setBottomNavVisible(true)` fora das rotas publicas de auth (`js/app.js:1164`, `js/app.js:1166`, `js/app.js:1171`).
- A rota de perfil renderiza o botao final `SAIR DA CONTA` dentro de uma `.page-container` direta (`js/app.js:735`, `js/app.js:736`, `js/app.js:854`).

### Cache e versoes esperadas

- `index.html` carrega `/css/reset.css?v=10`, `/css/components.css?v=20`, `/css/pages.css?v=4` e `/js/app.js?v=18` (`index.html:42`, `index.html:44`, `index.html:45`, `index.html:84`).
- `service-worker.js` usa `CACHE_NAME = 'diamondx-v29'` e precacheia os mesmos CSS versionados (`service-worker.js:1`, `service-worker.js:6`, `service-worker.js:8`, `service-worker.js:9`).
- A estrategia do service worker e network-first para HTML, JS e CSS same-origin, com cache como fallback (`service-worker.js:63`, `service-worker.js:64`, `service-worker.js:68`, `service-worker.js:69`, `service-worker.js:72`, `service-worker.js:75`, `service-worker.js:82`).

### Checagem local de runtime

- Servidor local usado: `python3 -m http.server 8082`.
- Chromium/Playwright executado com viewport 393x852, `html.bottom-nav-visible`, `#bottom-nav` visivel, conteudo longo injetado em `.page-container` e `--safe-bottom` sobrescrito para `34px`.
- Resultado medido:
  - `#main-content` `padding-bottom`: `119.09px`.
  - `#bottom-nav` altura: `85.08px`.
  - Topo da nav: `766.92px`.
  - Bottom do ultimo botao: `733px`.
  - Espaco entre ultimo botao e topo da nav: `33.92px`.
- Essa medicao confirma a coerencia dos tokens atuais em Chromium. Ela nao substitui uma medicao em iOS WebKit/PWA real.

## Code References

- `css/reset.css:9` - Origem do `--safe-bottom`.
- `css/reset.css:13` - `--nav-bottom-padding` usa o safe-area completo no codigo atual.
- `css/reset.css:17` - `--nav-clearance` deriva da altura da nav mais safe-area.
- `css/reset.css:19` - `--page-bottom-padding` compoe clearance da nav mais gap final da pagina.
- `css/reset.css:66` - Inicio da regra do container de scroll `#main-content`.
- `css/pages.css:15` - Comentario sobre mover o respiro para o scroll container.
- `css/pages.css:23` - Classe `bottom-nav-visible` aplica o padding inferior no `#main-content`.
- `css/components.css:196` - Inicio da regra da bottom nav fixa.
- `css/components.css:207` - Padding inferior da bottom nav.
- `css/components.css:210` - Altura da bottom nav inclui o padding inferior.
- `js/app.js:44` - Helper que controla visibilidade da bottom nav.
- `js/app.js:1171` - Rotas autenticadas ativam a bottom nav.
- `index.html:42` - Versao atual do `reset.css` esperada no navegador.
- `index.html:45` - Versao atual do `pages.css` esperada no navegador.
- `service-worker.js:1` - Cache atual `diamondx-v29`.

## Architecture Documentation

Diamond X usa uma SPA estatica com roteamento por hash. O documento e travado (`html, body { overflow: hidden; }`) e o scroll vertical acontece dentro de `main#main-content`. A bottom nav nao participa do fluxo do conteudo; ela e uma nav fixa no viewport, irma do container de scroll. Por isso, qualquer tela autenticada precisa de um respiro inferior calculado por CSS para que o ultimo conteudo role acima da nav fixa.

No estado atual, esse respiro e global para o scroll container:

`#app -> #main-content scroll container com padding-bottom -> .page-container -> cards/botoes`

Separadamente, a nav fixa fica em:

`#app -> #bottom-nav fixed bottom`

## Historical Context

- `docs/research/2026-05-14-bottom-padding-buttons-device-difference.md` registrou um estado anterior em que o espacamento ficava em dois lugares, `#main-content` e `.page-container`, e tambem citou risco de cache PWA defasado.
- `docs/specs/2026-05-14-iphone-pwa-bottom-nav-safe-area-spec.md` documentou a fase anterior que limitava safe-area a 2px, depois substituida no codigo atual.
- `docs/spec/2026-05-15-scroll-corte-fim-pagina.md` ainda descreve o cap `--nav-safe-area-cap: 2px` como estado atual, mas essa informacao esta defasada em relacao ao working tree atual.

## Related Research

- `docs/research/2026-05-14-bottom-padding-buttons-device-difference.md`
- `docs/research/2026-05-14-bottom-nav-safe-area.md`
- `docs/research/2026-05-12-iphone-bottom-nav-viewport-gap.md`
- `docs/legado/research/2026-05-05-profile-logout-bottom-nav-overlap.md`

## Open Questions

- O dispositivo afetado esta carregando `reset.css?v=10`, `pages.css?v=4` e service worker `diamondx-v29`?
- A publicacao/preview usada pelo cliente contem o commit `09045e8203f716827063825c7ef96337ac05e961`?
- Quais sao os valores reais em iOS WebKit/PWA para `window.innerHeight`, `visualViewport.height`, `--safe-bottom`, `#main-content.getBoundingClientRect()` e `#bottom-nav.getBoundingClientRect()`?

## Follow-up Research 2026-05-15T13:41:01-03:00

### Research Question

Tem algo relacionado ao menu inferior talvez estar sobrepondo a página?

### Summary

Sim. O menu inferior e um elemento fixo fora do fluxo da pagina, entao ele sobrepoe o viewport por desenho. A arquitetura atual depende de uma compensacao de padding no scroll container para impedir que o ultimo conteudo fique atras dessa nav.

O caminho atual e:

`#bottom-nav fixed bottom com z-index 1000` sobreposto ao viewport, e `#main-content` recebendo `padding-bottom: var(--page-bottom-padding)` quando `html.bottom-nav-visible` esta ativo.

### Evidence

- `#bottom-nav` esta fixado com `position: fixed`, `bottom: 0`, `z-index: 1000` e altura calculada com `--nav-height + --nav-bottom-padding` (`css/components.css:196`, `css/components.css:197`, `css/components.css:198`, `css/components.css:207`, `css/components.css:208`, `css/components.css:210`).
- A nav nao ocupa espaco no fluxo do `#main-content`; o shell monta `main#main-content` e `nav#bottom-nav` como elementos irmaos (`index.html:48`, `index.html:50`, `index.html:56`).
- O respiro que evita a sobreposicao vem da classe `html.bottom-nav-visible`, que aplica `padding-bottom: var(--page-bottom-padding)` no proprio `#main-content` (`css/pages.css:23`, `css/pages.css:24`).
- A classe `bottom-nav-visible` e alternada junto com a visibilidade da nav em `setBottomNavVisible()` (`js/app.js:44`, `js/app.js:45`, `js/app.js:46`).
- Rotas autenticadas chamam `setBottomNavVisible(true)` em `updateNav()`; rotas publicas de auth chamam `setBottomNavVisible(false)` (`js/app.js:1164`, `js/app.js:1166`, `js/app.js:1167`, `js/app.js:1171`).
- `#main-content.auth-screen` remove padding inferior e scroll padding, mas esse estado e aplicado apenas a `#login` e `#forgot-password` pelo roteador atual (`css/pages.css:7`, `css/pages.css:9`, `css/pages.css:10`, `js/app.js:340`, `js/app.js:341`, `js/app.js:368`).

### When the overlay can become visible

- Se a nav estiver visivel mas `html.bottom-nav-visible` nao estiver no `<html>`, a bottom nav continuara fixa por cima do viewport sem o padding compensatorio em `#main-content`.
- Se o device estiver com CSS antigo em cache, pode estar usando regras anteriores onde o clearance era menor ou aplicado em outro lugar.
- Se alguma rota autenticada mantiver `#main-content.auth-screen`, o CSS zera o padding inferior dessa tela, mas no roteador atual `auth-screen` so e ligado para `#login` e `#forgot-password`.
- Se o iOS/WebKit reportar valores diferentes de safe-area/viewport no PWA instalado, o calculo pode divergir do Chromium local; isso ainda depende de medicao no device real.

### Conclusion

O menu inferior sobrepor a area da pagina e esperado pela implementacao atual. O ponto critico nao e a nav ser fixa, mas a compensacao por `padding-bottom` no `#main-content` estar presente, atualizada e carregada no dispositivo.
