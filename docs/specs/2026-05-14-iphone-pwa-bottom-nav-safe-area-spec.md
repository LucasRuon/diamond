---
date: 2026-05-14T16:15:20-03:00
author: Codex
status: approved
ticket: null
research: docs/research/2026-05-14-bottom-nav-safe-area.md
---

# Spec: Ajuste do safe area do menu inferior no PWA iPhone

**Data**: 2026-05-14
**Estimativa**: Pequena

## Objetivo

Reduzir o espaco inferior do `#bottom-nav` no iPhone em modo PWA instalado, mantendo o menu inferior com no maximo 2px de safe area/padding inferior. Hoje o browser comum ja limita `--nav-bottom-padding` a 2px, mas o modo standalone sobrescreve esse valor para 6px em `css/reset.css`, deixando o menu visualmente mais alto no webapp instalado.

## Escopo

### Incluido
- Normalizar o padding inferior do `#bottom-nav` para usar o mesmo limite de 2px no PWA standalone.
- Manter `bottom: 0`, `viewport-fit=cover`, altura responsiva do menu e calculo de `--nav-clearance` existentes.
- Atualizar versionamento dos assets CSS e o cache do service worker para o iPhone receber o CSS novo.
- Validar o menu em Safari/PWA no iPhone ou simulador com foco na area inferior.

### Nao Incluido
- Reorganizar itens do menu inferior ou alterar rotas/renderizacao em `js/app.js`.
- Alterar safe area superior, Dynamic Island/notch ou status bar.
- Alterar bottom sheets, toasts, precheck footer ou outros componentes que usam `env(safe-area-inset-bottom)` sem cap.
- Mudar regras de altura dos itens (`--nav-height`, `.nav-item`) alem do necessario para o padding inferior.

## Pre-requisitos

- [ ] Ter um iPhone ou simulador iOS disponivel para validar o PWA instalado.
- [x] Servir a aplicacao localmente ou em preview com service worker atualizado.
- [ ] Limpar/recarregar o PWA instalado caso o iOS mantenha cache antigo apos a mudanca.

## Fases de Implementacao

### Fase 1: Normalizar token de safe area do menu

**Objetivo:** Fazer o PWA standalone usar o mesmo limite de 2px ja aplicado no browser comum.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `css/reset.css` | Modificar | Remover o override standalone de 6px e centralizar o limite de 2px do padding inferior da nav. |

#### Detalhes de Implementacao

1. `css/reset.css`
   - Manter `--safe-bottom: env(safe-area-inset-bottom, 0px);`.
   - Adicionar um token explicito para o limite desejado:

     ```css
     --nav-safe-area-cap: 2px;
     ```

   - Trocar o calculo atual de `--nav-bottom-padding` para usar o token:

     ```css
     --nav-bottom-padding: min(var(--safe-bottom), var(--nav-safe-area-cap));
     ```

   - Remover ou ajustar os overrides abaixo para que nenhum modo standalone volte a aplicar `6px`:

     ```css
     @media all and (display-mode: standalone) {
         :root {
             --nav-bottom-offset: 0px;
         }
     }

     html.standalone-app {
         --nav-bottom-offset: 0px;
     }
     ```

   - Se os blocos standalone ficarem apenas repetindo o valor padrao `--nav-bottom-offset: 0px`, eles podem ser removidos por completo. O ponto obrigatorio e eliminar `--nav-bottom-padding: 6px`.
   - Manter `--nav-clearance: calc(var(--nav-height) + 2px + var(--nav-bottom-padding));` para o conteudo acompanhar a reducao do menu sem criar sobreposicao.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `rg -n "--nav-bottom-padding: 6px|nav-safe-area-cap|nav-bottom-padding" css/reset.css` mostra `--nav-safe-area-cap: 2px`, o calculo com `min(...)` e nenhum `--nav-bottom-padding: 6px`.

**Verificacao Manual:**
- [ ] No PWA instalado em iPhone, o espaco abaixo dos icones/labels do menu inferior fica visualmente curto, equivalente a 2px de respiro.
- [ ] No Safari comum, o comportamento permanece igual ao atual: safe area inferior limitada a no maximo 2px.
- [ ] Em telas sem safe area inferior, o menu nao ganha faixa extra artificial.

### Fase 2: Atualizar cache e versionamento de assets

**Objetivo:** Garantir que o iPhone/PWA carregue o CSS corrigido em vez de uma versao antiga precacheada.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `index.html` | Modificar | Incrementar a query string de `/css/reset.css` apos a alteracao do CSS. |
| `service-worker.js` | Modificar | Incrementar `CACHE_NAME` e alinhar a lista `ASSETS` com os CSS versionados carregados por `index.html`. |

#### Detalhes de Implementacao

1. `index.html`
   - Incrementar o asset alterado:

     ```html
     <link rel="stylesheet" href="/css/reset.css?v=8">
     ```

   - Nao alterar `components.css` ou `pages.css` nesta fase, salvo se algum deles tambem for modificado durante a implementacao.

2. `service-worker.js`
   - Incrementar `CACHE_NAME` de `diamondx-v26` para `diamondx-v27`.
   - Atualizar o asset precacheado de reset para `/css/reset.css?v=8`.
   - Alinhar os demais CSS com o que `index.html` ja carrega hoje, especialmente `/css/components.css?v=19` e `/css/pages.css?v=2`, para evitar cache defasado.
   - Nao alterar estrategia de fetch; a regra network-first para HTML/JS/CSS deve continuar.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `node --check service-worker.js` termina sem erro.
- [x] `rg -n "reset.css\\?v=8|components.css\\?v=19|diamondx-v27" index.html service-worker.js` confirma as versoes esperadas.

**Verificacao Manual:**
- [ ] Apos recarregar/reinstalar o PWA, o iPhone recebe o CSS novo sem manter o menu com padding antigo de 6px.
- [ ] O app segue abrindo offline com os assets criticos cacheados.

### Fase 3: Validar layout em iPhone e rotas logadas

**Objetivo:** Confirmar que a reducao do safe area nao cria sobreposicao nem quebra o scroll das telas autenticadas.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Nenhum | Validar | Fase de QA. Ajustes pontuais em `css/reset.css` apenas se a validacao revelar sobreposicao. |

#### Detalhes de Implementacao

1. Servir o app localmente:

   ```bash
   python3 -m http.server 3000
   ```

2. Abrir `http://localhost:3000` ou o preview equivalente no iPhone/simulador.
3. Validar uma rota logada com o menu visivel, por exemplo `/#dashboard`.
4. Instalar/abrir como PWA standalone e comparar com Safari comum.
5. Inspecionar visualmente a borda inferior do `#bottom-nav`: a area abaixo dos itens deve ser minima, sem a faixa de 6px.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] Com servidor local ativo, buscar o HTML e confirmar que ele referencia `/css/reset.css?v=8`.

**Verificacao Manual:**
- [ ] Em iPhone 15 ou simulador equivalente, o menu inferior fica colado ao fim da viewport com apenas 2px de respiro interno.
- [ ] Os labels e icones continuam centralizados verticalmente dentro de `--nav-height`.
- [ ] O ultimo conteudo rolavel das paginas logadas nao fica escondido atras do menu.
- [ ] Telas publicas/auth continuam sem padding inferior de menu quando `#bottom-nav` esta escondido.

## Edge Cases

| Cenario | Comportamento Esperado |
|---------|------------------------|
| iPhone com `env(safe-area-inset-bottom)` alto em PWA standalone | `--nav-bottom-padding` resolve para 2px, nao para o valor cheio do iOS e nao para 6px. |
| Safari comum no iPhone | Mantem o limite atual de no maximo 2px. |
| Android ou desktop sem safe area inferior | `--safe-bottom` resolve para 0px e o menu nao ganha padding extra. |
| PWA com service worker antigo | Novo `CACHE_NAME` e query string do CSS forcarao instalacao/cache novo apos reload. |
| Tela baixa com `@media (max-height: 670px)` | `--nav-clearance` continua usando o padding reduzido e preserva o respiro de conteudo dessa media query. |

## Riscos e Mitigacoes

- Cache antigo no iOS pode mascarar o ajuste -> incrementar query string do CSS, `CACHE_NAME` e orientar reload/reinstalacao do PWA durante QA.
- Reducao do padding pode aproximar demais o menu da home indicator em algum iPhone -> validar em device/simulador; se necessario, ajustar apenas `--nav-safe-area-cap` para outro valor pequeno definido pelo produto.
- Remover o override standalone pode afetar qualquer expectativa visual especifica do PWA -> comparar Safari comum e PWA lado a lado antes de fechar.
- Service worker esta com entradas CSS defasadas em relacao ao `index.html` atual -> alinhar `ASSETS` durante a mesma alteracao para evitar comportamento inconsistente.

## Rollback

1. Reverter `css/reset.css` para o comportamento anterior, restaurando `--nav-bottom-padding: 6px` nos blocos standalone.
2. Reverter a query string de `/css/reset.css` em `index.html`.
3. Incrementar novamente `CACHE_NAME` ou restaurar o anterior conforme a estrategia de deploy, garantindo que clients recebam o rollback.
4. Revalidar o PWA instalado apos limpar/recarregar cache.

## Checklist Final

- [x] Scope implemented
- [x] `--nav-bottom-padding: 6px` removido
- [x] CSS versionado atualizado em `index.html`
- [x] `service-worker.js` atualizado e validado
- [ ] QA feito em Safari comum e PWA standalone no iPhone/simulador
- [ ] Rollback path verified
