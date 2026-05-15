---
date: 2026-05-15T13:43:37-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-15-scroll-corte-fim-pagina.md
---

# Spec: Corrigir Corte no Fim do Scroll

**Data**: 2026-05-15
**Estimativa**: Média

## Objetivo

Garantir que o último conteúdo das telas autenticadas nunca fique oculto atrás da bottom nav fixa, inclusive em iOS/PWA com `safe-area-inset-bottom`, telas baixas e dispositivos que ainda possam estar carregando CSS antigo via service worker/cache.

A pesquisa atual indica que o CSS vivo já removeu a causa antiga (`--nav-safe-area-cap: 2px`) e passou a aplicar o respiro no próprio `#main-content`. A implementação desta spec deve fechar os riscos restantes: endurecer o sizing do scroll container em WebKit, forçar atualização dos assets versionados, adicionar uma regressão automatizada de clearance e marcar o plano antigo em `docs/spec/` como defasado.

## Escopo

### Incluído
- Ajustar o `#main-content` para ser um scroll item flexível com `min-height: 0`, evitando conflito entre `100vh`, `100dvh` e `-webkit-fill-available`.
- Manter o padding inferior de rotas autenticadas no próprio `#main-content`, controlado por `html.bottom-nav-visible`.
- Bump das versões de CSS em `index.html` e `service-worker.js` para forçar dispositivos a buscar os assets corrigidos.
- Bump do cache do service worker e chamada de `clients.claim()` após ativação.
- Criar teste Playwright focado em medir clearance entre o último elemento rolável e a bottom nav.
- Marcar a spec antiga `docs/spec/2026-05-15-scroll-corte-fim-pagina.md` como superseded.

### Não Incluído
- Reestruturar a SPA ou mover a bottom nav para dentro do fluxo do `#main-content`.
- Alterar regras de negócio, autenticação, Supabase, RLS ou Edge Functions.
- Trocar a estratégia geral de cache do service worker.
- Criar detecção por user-agent para iOS/Android.
- Garantir atualização de aparelhos totalmente offline antes de uma nova conexão.

## Pré-requisitos

- [x] Servir a aplicação localmente em `http://localhost:3000` com `python3 -m http.server 3000`.
- [x] Ambiente Python com Playwright funcional para executar scripts em `testsprite_tests/`.
- [ ] Acesso ao navegador do dispositivo afetado ou a um iPhone/PWA real para validação manual final.
- [ ] Confirmar que não há deploy pendente que sobrescreva `index.html`, `service-worker.js` ou os CSS alterados.

## Fases de Implementação

### Fase 1: Endurecer o Scroll Container

**Objetivo:** Remover dependência de `min-height: 100vh` no container rolável e deixar o scroll limitado pelo `#app`, reduzindo divergências entre Chromium, Safari e PWA instalada.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `css/reset.css` | Modificar | Adicionar `min-height: 0` no `#main-content` e ajustar comentário de padding inferior. |
| `css/pages.css` | Modificar | Trocar `min-height: 100vh` do `#main-content` base por `min-height: 0`, preservando `auth-screen`. |

#### Detalhes de Implementação

1. `css/reset.css`
   - No bloco `#main-content`, manter `flex: 1`, `overflow-y: auto` e `-webkit-overflow-scrolling: touch`.
   - Adicionar `min-height: 0;` logo após `flex: 1;`.
   - Atualizar o comentário de `padding-bottom: 0;` para refletir o estado atual: o respiro inferior é aplicado em `css/pages.css` no próprio scroll container.
   - Não alterar os tokens atuais:
     - `--safe-bottom: env(safe-area-inset-bottom, 0px);`
     - `--nav-bottom-padding: var(--safe-bottom);`
     - `--nav-clearance: calc(var(--nav-height) + var(--nav-bottom-padding));`
     - `--page-bottom-padding: calc(var(--nav-clearance) + var(--page-end-gap));`

2. `css/pages.css`
   - No primeiro bloco `#main-content`, substituir:

     ```css
     min-height: 100vh;
     ```

     por:

     ```css
     min-height: 0;
     ```

   - Não modificar `#main-content.auth-screen`; login e recuperação continuam com layout próprio e `min-height: 100dvh`.
   - Preservar as regras:
     - `#main-content { padding-bottom: var(--page-end-gap); }`
     - `html.bottom-nav-visible #main-content { padding-bottom: var(--page-bottom-padding); }`

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `rg -n "nav-safe-area-cap|#main-content > \\.page-container.*padding-bottom" css` não retorna ocorrências.
- [x] `rg -n "min-height: 100vh" css/pages.css` não retorna ocorrência no bloco base de `#main-content`.

**Verificação Manual:**
- [ ] Em uma rota autenticada, `#main-content` continua sendo o único container com scroll vertical.
- [ ] Login e recuperação de senha continuam ocupando a tela inteira, sem bottom nav.
- [ ] O conteúdo das rotas autenticadas ainda tem respiro inferior quando `html.bottom-nav-visible` está presente.

### Fase 2: Forçar Atualização dos Assets PWA

**Objetivo:** Garantir que navegadores e PWAs instaladas recebam as regras corrigidas, em vez de continuar usando CSS antigo em cache.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `index.html` | Modificar | Bump das query strings dos CSS alterados. |
| `service-worker.js` | Modificar | Bump do `CACHE_NAME`, atualização dos assets versionados e claim imediato dos clients. |

#### Detalhes de Implementação

1. `index.html`
   - Atualizar os links de CSS alterados:

     ```html
     <link rel="stylesheet" href="/css/reset.css?v=11">
     <link rel="stylesheet" href="/css/pages.css?v=5">
     ```

   - Não alterar `variables.css`, `components.css` ou scripts se esses arquivos não forem modificados pela fase 1.

2. `service-worker.js`
   - Atualizar:

     ```js
     const CACHE_NAME = 'diamondx-v30';
     ```

   - Atualizar os mesmos assets no array `ASSETS`:
     - `/css/reset.css?v=11`
     - `/css/pages.css?v=5`
   - Manter `/css/components.css?v=20` se `components.css` não tiver sido alterado.
   - No listener `activate`, após remover caches antigos, chamar `self.clients.claim()`:

     ```js
     self.addEventListener('activate', event => {
         event.waitUntil(
             caches.keys()
                 .then(keys => Promise.all(
                     keys
                         .filter(key => key !== CACHE_NAME)
                         .map(key => caches.delete(key))
                 ))
                 .then(() => self.clients.claim())
         );
     });
     ```

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `rg -n "reset.css\\?v=11|pages.css\\?v=5" index.html service-worker.js` retorna as referências esperadas nos dois arquivos.
- [x] `rg -n "diamondx-v30|clients\\.claim" service-worker.js` retorna o novo cache e a chamada de claim.
- [x] Com servidor local ativo, executar:

  ```bash
  node -e "fetch('http://127.0.0.1:3000/').then(async r => { const t = await r.text(); console.log(r.status, t.includes('/css/reset.css?v=11'), t.includes('/css/pages.css?v=5')); })"
  ```

  Resultado esperado: `200 true true`.

**Verificação Manual:**
- [ ] Em DevTools > Application > Service Workers, a nova versão do worker ativa sem manter `diamondx-v29`.
- [ ] Após um reload online, Network mostra `reset.css?v=11` e `pages.css?v=5`.
- [ ] No aparelho afetado, abrir a PWA online uma vez e confirmar que os CSS versionados atuais foram carregados.

### Fase 3: Adicionar Regressão de Clearance

**Objetivo:** Criar uma validação automatizada que mede a distância real entre o último elemento rolável e o topo da bottom nav, simulando safe-area inferior.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `testsprite_tests/TC037_Verify_bottom_nav_clearance.py` | Criar | Teste Playwright independente de login/Supabase para validar layout global. |

#### Detalhes de Implementação

1. `testsprite_tests/TC037_Verify_bottom_nav_clearance.py`
   - Usar o padrão async Playwright já existente nos testes `TC###`.
   - Abrir `http://localhost:3000`.
   - Usar viewport mobile, por exemplo `393x852`.
   - Injetar `:root { --safe-bottom: 34px; }` para simular iPhone com home indicator.
   - Preparar o DOM sem depender de autenticação:
     - Remover `.hidden` de `#bottom-nav`.
     - Adicionar `bottom-nav-visible` em `document.documentElement`.
     - Renderizar itens simples na nav.
     - Renderizar uma `.page-container` longa com um botão final identificável.
   - Rolar `#main-content` até o final.
   - Medir:
     - `lastButton.getBoundingClientRect().bottom`
     - `bottomNav.getBoundingClientRect().top`
     - `getComputedStyle(mainContent).paddingBottom`
     - `getComputedStyle(bottomNav).height`
   - Falhar se `bottomNav.top - lastButton.bottom < 20`.
   - Falhar se o `padding-bottom` computado do `#main-content` for menor que a altura computada da nav.
   - Opcionalmente salvar screenshot em `testsprite_tests/tmp/TC037_bottom_nav_clearance.png` quando falhar.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `python3 testsprite_tests/TC037_Verify_bottom_nav_clearance.py` finaliza sem assertion error com servidor na porta `3000`.
- [x] O teste reporta gap final mínimo de `20px` entre o último botão e a nav.
- [x] O teste não exige usuário Supabase, fixtures remotas ou credenciais reais.

**Verificação Manual:**
- [ ] A simulação visual mostra a bottom nav fixa por cima do viewport, mas o último botão permanece acima dela ao fim do scroll.
- [ ] O teste continua passando em viewport baixa, por exemplo `360x640`, ou o arquivo documenta um segundo cenário para `@media (max-height: 670px)`.

### Fase 4: Limpar Documentação Defasada e Validar em Device

**Objetivo:** Evitar execução do plano antigo baseado no cap de 2px e fechar a validação no ambiente onde o corte foi observado.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `docs/spec/2026-05-15-scroll-corte-fim-pagina.md` | Modificar | Marcar como superseded e apontar para esta spec em `docs/specs/`. |

#### Detalhes de Implementação

1. `docs/spec/2026-05-15-scroll-corte-fim-pagina.md`
   - Alterar o frontmatter `status` de `approved` para `superseded`.
   - Adicionar uma nota no topo:

     ```markdown
     > Superseded por `docs/specs/2026-05-15-scroll-corte-fim-pagina-spec.md`.
     > O estado descrito aqui sobre `--nav-safe-area-cap: 2px` não corresponde mais ao CSS atual.
     ```

   - Não apagar o documento antigo, porque ele preserva contexto histórico.

2. Validação manual no device afetado
   - Abrir a PWA ou navegador online após o deploy.
   - Confirmar no device, quando possível, os valores:
     - URL carregada de `/css/reset.css?v=11`
     - URL carregada de `/css/pages.css?v=5`
     - cache ativo `diamondx-v30`
     - `#main-content` com `padding-bottom` maior ou igual à altura da `#bottom-nav`
   - Verificar rotas:
     - `#mais`: botão `SAIR DA CONTA` totalmente visível.
     - `#plans`: último card e botão de contratação totalmente visíveis.
     - `#presenca`: último item da lista totalmente visível.
     - Uma rota admin com lista longa.
     - Uma rota responsible com lista longa.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `rg -n "superseded|docs/specs/2026-05-15-scroll-corte-fim-pagina-spec.md" docs/spec/2026-05-15-scroll-corte-fim-pagina.md` confirma a nota de superseded.

**Verificação Manual:**
- [ ] No device afetado, o último elemento das páginas testadas não fica atrás da bottom nav.
- [ ] A bottom nav mantém ícones acima do home indicator/gesture bar.
- [ ] Após fechar e reabrir a PWA, o comportamento permanece correto.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| iPhone/PWA com `safe-area-inset-bottom` alto | A nav cresce com `--safe-bottom` e o `#main-content` recebe clearance suficiente. |
| Desktop ou Android sem safe-area | `--safe-bottom` fica `0px`; visual não deve ganhar espaço extra relevante. |
| Tela baixa coberta por `@media (max-height: 670px)` | `--nav-height`, `--page-end-gap` e `--page-bottom-padding` recalculam sem cortar o último elemento. |
| Rota pública `#login` ou `#forgot-password` | `auth-screen` mantém padding inferior zerado e não exibe bottom nav. |
| Nav visível sem `html.bottom-nav-visible` por bug de roteamento | O teste/manual QA deve evidenciar sobreposição; a correção esperada é no controle da classe em `js/app.js`, não duplicar padding em filhos. |
| Device com CSS antigo em cache | Novo `CACHE_NAME`, query strings e `clients.claim()` devem atualizar após uma abertura online/reload. |
| Usuário completamente offline | Pode continuar com cache antigo até ficar online; não há correção puramente local para esse caso. |
| Bottom sheets e footer do precheck | Continuam usando `env(safe-area-inset-bottom)` próprios, sem regressão visual. |

## Riscos e Mitigações

- `min-height: 0` no `#main-content` pode expor telas com pouco conteúdo que dependiam de `100vh` implicitamente -> manter `auth-screen` com `100dvh` e validar dashboards/listas vazias.
- `clients.claim()` pode trocar o service worker controlador durante uma aba aberta -> risco baixo porque a app é estática e CSS/JS usam network-first; validar reload simples após deploy.
- O teste `TC037` manipula o DOM e não cobre dados reais das rotas -> ele cobre o contrato global de layout; manter QA manual nas rotas reais.
- Bump de query string sem deploy completo não corrige dispositivos em produção -> validar que `index.html` e `service-worker.js` publicados são os mesmos do commit.
- Em iOS WebKit, `env(safe-area-inset-bottom)` pode divergir entre Safari e PWA standalone -> medir no dispositivo afetado e registrar valores se ainda houver corte.

## Rollback

1. Reverter alterações em `css/reset.css` e `css/pages.css` para o estado anterior.
2. Reverter `index.html` para `/css/reset.css?v=10` e `/css/pages.css?v=4`.
3. Reverter `service-worker.js` para `CACHE_NAME = 'diamondx-v29'`, remover `clients.claim()` se necessário e restaurar os assets versionados anteriores.
4. Remover `testsprite_tests/TC037_Verify_bottom_nav_clearance.py`.
5. Reverter a nota de superseded em `docs/spec/2026-05-15-scroll-corte-fim-pagina.md` se o plano antigo voltar a ser a referência.
6. Não há rollback de dados: nenhuma migration, tabela, storage ou Edge Function é alterada.

## Checklist Final

- [x] Scope implemented
- [ ] CSS de scroll validado em desktop, mobile simulado e tela baixa
- [x] Service worker e asset versions atualizados
- [x] Teste `TC037` passando localmente
- [ ] Device afetado validado após reload online/PWA reaberta
- [x] Documentação antiga marcada como superseded
- [ ] Validation complete
- [ ] Rollback path verified
