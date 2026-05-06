---
date: 2026-05-06T10:03:12-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-05-profile-logout-bottom-nav-overlap.md
---

# Spec: Espacamento Inferior Global para Navegacao Fixa

**Data**: 2026-05-06
**Estimativa**: Pequena

## Objetivo

Garantir que o ultimo conteudo de todas as paginas autenticadas consiga rolar acima da navegacao inferior fixa quando o usuario chega ao fim do scroll. A mudanca deve generalizar o respiro que hoje existe apenas no perfil, preservar o `#main-content` como container rolavel unico e manter o `#bottom-nav` fixo como esta.

## Escopo

### Incluido
- Aplicar uma zona inferior de respiro a todos os wrappers diretos `.page-container` renderizados dentro de `#main-content`.
- Substituir o tratamento exclusivo de `.profile-page` por uma regra compartilhada para paginas autenticadas.
- Manter a navegacao inferior fixa fora do conteudo rolavel.
- Validar manualmente o fim do scroll em rotas representativas de atleta, responsavel/empresario e admin.

### Nao Incluido
- Redesenhar a bottom navigation, cards, headers ou conteudo das paginas.
- Mover `#bottom-nav` para dentro de `#main-content`.
- Alterar fluxos de autenticacao, Supabase, permissoes, dados ou rotas.
- Criar testes end-to-end dependentes de credenciais reais.
- Ajustar telas publicas de login/recuperacao, que usam `#main-content.auth-screen`.

## Pre-requisitos

- [x] Confirmar que a implementacao sera feita sobre a branch `work`.
- [ ] Ter um servidor local para abrir a SPA, por exemplo `python3 -m http.server 8080`.
- [ ] Ter acesso a pelo menos um usuario autenticavel; idealmente tambem uma conta admin ou responsavel para validar rotas com menus diferentes.
- [ ] Fazer hard refresh ou desativar service worker se o navegador continuar exibindo CSS antigo.

## Fases de Implementacao

### Fase 1: Generalizar o Respiro das Paginas

**Objetivo:** Fazer todos os wrappers diretos `.page-container` dentro de `#main-content` reservarem area inferior para a navegacao fixa.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `css/pages.css` | Modificar | Trocar a regra `.profile-page` por uma regra compartilhada para `#main-content > .page-container`. |

#### Detalhes de Implementacao

1. `css/pages.css`
   - Localizar a regra atual:
     ```css
     .profile-page {
         padding-bottom: calc(var(--nav-height) + 40px + env(safe-area-inset-bottom));
     }
     ```
   - Substituir por:
     ```css
     #main-content > .page-container {
         padding-bottom: calc(var(--nav-height) + 40px + env(safe-area-inset-bottom));
     }
     ```
   - Manter a regra fora dos blocos de login e antes das regras de transicao, como hoje.
   - Nao alterar `#main-content.auth-screen`, porque login e recuperacao zeram padding proprio e nao usam bottom nav.
   - Nao alterar `#bottom-nav`, `--nav-height` ou o padding global de `#main-content` nesta fase.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `rg -n "#main-content > \\.page-container|\\.profile-page" css/pages.css` mostra a nova regra compartilhada e nao mostra regra ativa para `.profile-page`.
- [x] `git diff --check` termina sem erro.

**Verificacao Manual:**
- [x] Abrir uma pagina autenticada com conteudo longo e confirmar no DOM que o wrapper principal e filho direto de `#main-content` com classe `.page-container`.
- [x] Rolar ate o fim e confirmar que o ultimo item fica visivel acima da nav inferior.

### Fase 2: Limpeza Opcional do Marcador de Perfil

**Objetivo:** Remover classe especifica que deixou de controlar layout, se a equipe preferir evitar marcador sem uso.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `js/app.js` | Modificar opcional | Trocar `class="page-container profile-page"` por `class="page-container"` no perfil, caso nao haja outro uso planejado. |

#### Detalhes de Implementacao

1. `js/app.js`
   - Verificar se `profile-page` nao e usado em outro seletor ou teste:
     ```bash
     rg -n "profile-page" .
     ```
   - Se o unico uso restante for o wrapper do perfil, trocar:
     ```html
     <div class="page-container profile-page">
     ```
     por:
     ```html
     <div class="page-container">
     ```
   - Nao alterar `#logout-btn`, listener de logout, cards condicionais ou ordem do template.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] Se `js/app.js` for modificado, `node --check js/app.js` termina sem erro.
- [x] `rg -n "profile-page" js css` nao retorna usos ativos, se a classe for removida.

**Verificacao Manual:**
- [x] Abrir `/#profile` autenticado e confirmar que o perfil continua renderizando os dados, cards e botao `SAIR DA CONTA`.
- [x] Rolar ate o fim do perfil e confirmar que o botao continua livre da nav inferior.

### Fase 3: Validacao de Rotas e Regressao

**Objetivo:** Confirmar que a mudanca compartilhada cobre paginas representativas sem afetar login, nav fixa ou fluxos existentes.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Nenhum | N/A | Fase de verificacao. |

#### Detalhes de Implementacao

1. Servidor local
   - Rodar `python3 -m http.server 8080` na raiz do projeto.
   - Acessar `http://localhost:8080/#login` e autenticar.

2. Rotas de atleta
   - Validar `/#dashboard`, `/#trainings`, `/#plans`, `/#attendance` e `/#profile`.
   - Em cada rota, rolar ate o fim e verificar se o ultimo card, botao ou item de lista fica acima da bottom nav.

3. Rotas de responsavel/empresario
   - Validar `/#dashboard`, `/#students`, `/#trainings`, `/#plans`, `/#payments` e `/#profile`, se houver conta disponivel.

4. Rotas de admin
   - Validar `/#dashboard`, `/#users`, `/#trainings`, `/#plans`, `/#payments`, `/#reports` e `/#profile`, se houver conta disponivel.

5. Rotas publicas
   - Abrir `/#login` e `/#forgot-password`.
   - Confirmar que `#bottom-nav` fica escondida e que o layout de fundo/login nao ganha respiro inferior indevido.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `git diff --check` termina sem erro.
- [x] Se `js/app.js` foi alterado, `node --check js/app.js` termina sem erro.
- [x] Fetch local de `http://127.0.0.1:8080/` retorna status 200.

**Verificacao Manual:**
- [x] Em viewport mobile aproximada de 390x844, nenhum ultimo item das rotas autenticadas testadas fica coberto pela nav.
- [x] Em viewport mobile baixa aproximada de 390x667, repetir as rotas mais longas e confirmar que o fim do conteudo ainda fica visivel.
- [x] Em desktop, confirmar que o espaco inferior nao quebra leitura ou interacao.
- [x] Bottom nav continua fixa e funcional nas rotas autenticadas.
- [x] Bottom nav continua escondida nas rotas publicas.

## Edge Cases

| Cenario | Comportamento Esperado |
|---------|------------------------|
| Navegador iOS com barra de gestos | `env(safe-area-inset-bottom)` compoe o respiro inferior. |
| Pagina autenticada com pouco conteudo | Pode haver area vazia inferior, mas nenhum conteudo fica coberto pela nav. |
| Pagina autenticada com lista longa | Ultimo item da lista rola acima da nav fixa. |
| Perfil ainda possui `profile-page` no HTML | Classe fica sem efeito de layout se a regra CSS for removida; pagina usa o respiro compartilhado. |
| Login e recuperacao | Continuam usando `#main-content.auth-screen` sem bottom nav visivel. |
| Service worker entrega CSS antigo | Hard refresh ou unregister do service worker antes de validar visualmente. |

## Riscos e Mitigacoes

- Espaco inferior duplicado com o padding global de `#main-content` -> validar mobile e desktop; se o espaco ficar excessivo, ajustar somente o componente compartilhado mantendo a altura minima da nav.
- Alguma pagina nao usa `.page-container` como filho direto -> validar com `rg -n "mainContent.innerHTML|page-container" js/pages js/app.js`; paginas fora do padrao devem ser tratadas separadamente.
- Regra atingir tela de cadastro publica, que tambem usa `.page-container` -> validar `#register`; se o respiro for indesejado, escopar a regra para um estado autenticado ou manter uma excecao para rotas publicas.
- Cache do service worker mascarar mudanca -> validar com hard refresh ou DevTools com service worker desativado.
- Impacto de seguranca ou integridade de dados -> nenhum esperado; mudanca de apresentacao, sem alterar auth, queries, storage ou persistencia.

## Rollback

1. Reverter a regra compartilhada `#main-content > .page-container` em `css/pages.css`.
2. Restaurar a regra `.profile-page` em `css/pages.css`, se o comportamento anterior do perfil precisar ser mantido.
3. Se a Fase 2 removeu `profile-page` de `js/app.js`, recolocar `class="page-container profile-page"` no wrapper do perfil.
4. Fazer hard refresh no navegador.
5. Reexecutar `git diff --check` e, se `js/app.js` foi alterado, `node --check js/app.js`.

## Checklist Final

- [x] Scope implemented
- [x] Validation complete
- [x] Public auth routes checked
- [x] Representative authenticated routes checked
- [x] Rollback path verified
