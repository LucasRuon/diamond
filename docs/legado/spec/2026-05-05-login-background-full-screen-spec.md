---
date: 2026-05-05T00:20:55-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-05-login-background-full-screen.md
---

# Spec: Login Background em Tela Inteira

**Data**: 2026-05-05
**Estimativa**: Pequena

## Objetivo

Fazer o fundo animado/interativo da tela de login ocupar a viewport inteira, sem ficar limitado pela area interna de `#main-content`. A mudanca deve preservar o formulario, a marca Diamond X, a animacao de particulas, a tela de recuperacao de acesso e o comportamento atual de autenticacao.

## Escopo

### Incluido
- Fundo visual de `#login` em tela inteira, incluindo `/assets/bg-diamond.webp`, overlay e `canvas#login-particles`.
- Mesma cobertura de fundo para `#forgot-password`, que reutiliza `.login-bg-wrapper`, `.login-bg-image` e `.login-bg-overlay`.
- Ajuste do container de rotas para remover padding do app shell apenas nas telas publicas com fundo de login.
- Ajuste defensivo no tamanho do canvas para usar a viewport quando `offsetWidth` ou `offsetHeight` ainda nao estiverem disponiveis.
- Validacao visual em mobile e desktop.

### Nao Incluido
- Trocar o asset de fundo atual por GIF ou novo arquivo.
- Redesenhar formulario, logo, textos, botoes ou fluxo de login.
- Aplicar o fundo de login em `#register` ou `#update-password`.
- Alterar Supabase, politicas RLS, sessoes, cadastro ou recuperacao de senha.

## Pre-requisitos

- [x] Confirmar que a implementacao sera feita sobre o estado atual de `main`.
- [x] Ter um servidor local para abrir a SPA, por exemplo `python3 -m http.server 8080`.
- [ ] Fazer hard refresh ou limpar cache do service worker se o navegador continuar exibindo CSS/JS antigo.

## Fases de Implementacao

### Fase 1: Estado de Rota para Telas Auth

**Objetivo:** Permitir que o CSS diferencie as telas com fundo de login das demais rotas sem alterar a estrutura global do app.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `js/app.js` | Modificar | Adicionar uma classe de estado em `#main-content` para rotas com fundo de login e tornar o resize do canvas mais robusto. |

#### Detalhes de Implementacao

1. `js/app.js`
   - No metodo `render()`, depois de resolver `hash` e antes do `switch`, calcular se a rota atual usa o fundo de login:
     ```js
     const authBackgroundRoutes = ['#login', '#forgot-password'];
     this.mainContent.classList.toggle('auth-screen', authBackgroundRoutes.includes(hash));
     ```
   - Manter `this.stopLoginParticles()` para qualquer rota diferente de `#login`, porque `#forgot-password` nao renderiza `canvas#login-particles`.
   - Em `initLoginParticles()`, ajustar `resize()` para nao criar canvas com dimensoes zero:
     ```js
     canvas.width = canvas.offsetWidth || window.innerWidth;
     canvas.height = canvas.offsetHeight || window.innerHeight;
     ```
   - Nao mover o canvas para fora de `.login-bg-wrapper`; a mudanca deve continuar local ao renderer atual.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `node --check js/app.js` termina sem erro.

**Verificacao Manual:**
- [x] Abrir `/#login` e confirmar que `#main-content` possui a classe `auth-screen`.
- [x] Abrir `/#forgot-password` e confirmar que `#main-content` possui a classe `auth-screen`.
- [x] Abrir uma rota comum, como `/#register`, e confirmar que `auth-screen` foi removida.

### Fase 2: Camadas de Fundo em Viewport Inteira

**Objetivo:** Fazer imagem, overlay e canvas preencherem a tela inteira, enquanto o conteudo continua centralizado e clicavel.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `css/pages.css` | Modificar | Escopar overrides para `#main-content.auth-screen`, tornar as camadas de fundo `fixed` e ajustar alturas para `100dvh`. |

#### Detalhes de Implementacao

1. `css/pages.css`
   - Adicionar um bloco escopado para a rota auth:
     ```css
     #main-content.auth-screen {
         padding-top: 0;
         padding-bottom: 0;
         min-height: 100dvh;
         background: var(--dx-bg);
     }
     ```
   - Atualizar `.login-bg-wrapper` para usar `min-height: 100dvh` e preservar `overflow: hidden`.
   - Para `#main-content.auth-screen .login-bg-image`, `#main-content.auth-screen .login-bg-overlay` e `#main-content.auth-screen #login-particles`:
     - usar `position: fixed`;
     - manter `inset: 0`;
     - definir `width: 100vw` e `height: 100dvh`;
     - manter `pointer-events: none` no canvas;
     - preservar a ordem de camadas atual: imagem abaixo, overlay/particulas acima da imagem, conteudo acima de todos.
   - Ajustar `.login-content` e `.forgot-access-content` para `min-height: 100dvh`.
   - Mover a protecao de safe area para o conteudo, nao para o fundo:
     ```css
     #main-content.auth-screen .login-content,
     #main-content.auth-screen .forgot-access-content {
         padding-top: calc(40px + env(safe-area-inset-top));
         padding-bottom: calc(40px + env(safe-area-inset-bottom));
     }
     ```
   - Garantir que o formulario continue com `position: relative` e `z-index: 2`.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `rg -n "auth-screen|100dvh|login-particles" css/pages.css js/app.js` mostra os novos seletores e o ajuste de resize.

**Verificacao Manual:**
- [x] Em `/#login`, o fundo cobre topo, laterais e area inferior da viewport, sem faixas solidas causadas pelo padding do shell.
- [x] Em `/#forgot-password`, o fundo cobre a viewport inteira mesmo sem o canvas de particulas.
- [x] Campos, links e botoes continuam clicaveis; o canvas nao intercepta ponteiro.
- [x] Em altura pequena, o conteudo pode rolar sem revelar uma area sem fundo.

### Fase 3: QA Visual e Regressao

**Objetivo:** Validar que a mudanca resolveu a cobertura do fundo sem quebrar navegacao, login ou telas protegidas.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Nenhum | N/A | Fase de verificacao. |

#### Detalhes de Implementacao

1. Servidor local
   - Rodar `python3 -m http.server 8080` na raiz do projeto.
   - Acessar `http://localhost:8080/#login`.

2. Checagens de viewport
   - Testar desktop aproximado: 1440x900.
   - Testar mobile aproximado: 390x844.
   - Testar mobile baixo: 390x667.

3. Fluxo de navegacao
   - Ir de `/#login` para `/#forgot-password` e voltar para `/#login`.
   - Ir de `/#login` para `/#register`.
   - Se houver credenciais validas disponiveis, fazer login e confirmar que o dashboard nao herda o fundo fixo.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `node --check js/app.js` termina sem erro.
- [x] `python3 -m http.server 8080` serve `index.html` com status 200.

**Verificacao Manual:**
- [x] Nenhuma viewport testada mostra o fundo preso a uma faixa parcial da tela.
- [x] Nao ha barra/espaco vazio no topo ou rodape das telas de login e recuperacao.
- [x] A navegacao inferior continua escondida em `#login` e `#forgot-password`.
- [ ] A navegacao inferior continua aparecendo nas rotas autenticadas quando aplicavel.

## Edge Cases

| Cenario | Comportamento Esperado |
|---------|------------------------|
| Navegador mobile muda a altura da barra de endereco | Fundo acompanha a viewport dinamica via `100dvh`. |
| `canvas.offsetWidth` ou `canvas.offsetHeight` retorna zero logo apos renderizar | Canvas usa `window.innerWidth` e `window.innerHeight` como fallback. |
| Usuario navega de `#login` para `#forgot-password` | Animacao de particulas e listener de resize sao limpos, e o fundo estatico continua em tela inteira. |
| Usuario navega para rota sem fundo auth | Classe `auth-screen` e overrides de padding deixam de ser aplicados. |
| Conteudo do login excede altura disponivel | `#main-content` continua rolavel e o fundo fixo permanece cobrindo a viewport. |
| Service worker entrega CSS antigo | Hard refresh, unregister do service worker em DevTools ou incremento posterior de estrategia de cache se necessario. |

## Riscos e Mitigacoes

- `position: fixed` dentro de `#main-content` pode interagir com a transformacao de transicao de pagina -> validar entrada/saida em `#login`; se houver deslocamento visivel, aplicar `auth-screen` antes da transicao ou desabilitar transform apenas nessas rotas.
- Camadas fixas podem ficar acima do formulario se o `z-index` for alterado incorretamente -> manter `.login-content` e `.forgot-access-content` com `z-index: 2` e fundo/overlay/canvas em camadas inferiores.
- Remover padding de `#main-content` pode afetar safe area no iOS -> devolver safe area ao conteudo com `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`.
- Canvas em tela inteira aumenta area desenhada -> manter 50 particulas por enquanto; se houver queda perceptivel de FPS, reduzir quantidade em mobile via `matchMedia`.
- Mudanca visual nao altera dados, mas pode mascarar regressao de login se validada apenas por screenshot -> incluir submit com credencial valida quando disponivel.

## Rollback

1. Reverter a adicao de `auth-screen` e o fallback de resize em `js/app.js`.
2. Reverter os overrides de `#main-content.auth-screen` e as alteracoes de `position: fixed`/`100dvh` em `css/pages.css`.
3. Fazer hard refresh no navegador para garantir que CSS/JS antigos foram recarregados.
4. Reexecutar `node --check js/app.js` e abrir `/#login` para confirmar retorno ao comportamento anterior.

## Checklist Final

- [x] Scope implemented
- [x] Validation complete
- [ ] Rollback path verified
