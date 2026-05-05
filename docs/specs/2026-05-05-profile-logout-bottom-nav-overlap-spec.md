---
date: 2026-05-05T00:53:39-03:00
author: Codex
status: completed
ticket: null
research: docs/research/2026-05-05-profile-logout-bottom-nav-overlap.md
---

# Spec: Botao de Logout Visivel Acima da Navegacao Inferior

**Data**: 2026-05-05
**Estimativa**: Pequena

## Objetivo

Corrigir a tela de perfil para que o botao `SAIR DA CONTA` nunca fique cortado pela navegacao inferior fixa quando o usuario chega ao fim do scroll. A mudanca deve preservar o shell atual da SPA, o comportamento de logout, a navegacao por perfil de usuario e o espacamento das demais rotas.

## Escopo

### Incluido
- Adicionar um identificador CSS especifico para a tela de perfil renderizada por `renderProfile()`.
- Criar uma zona inferior de respiro dentro do conteudo do perfil, apos o botao de logout, considerando `--nav-height` e `env(safe-area-inset-bottom)`.
- Validar o fim do scroll em perfil de atleta, responsavel/empresario e administrador quando possivel.
- Preservar o `#main-content` como unico container rolavel da aplicacao.

### Nao Incluido
- Redesenhar a pagina de perfil, cards, botoes ou bottom navigation.
- Alterar o fluxo de autenticacao, `auth.logout()`, Supabase ou dados de usuario.
- Mover `#bottom-nav` para dentro de `#main-content`.
- Ajustar sobreposicoes em outras paginas que nao apresentem o problema.
- Criar novos testes end-to-end dependentes de credenciais reais.

## Pre-requisitos

- [x] Confirmar que a implementacao sera feita sobre o estado atual da working tree, que ja possui alteracoes em `css/components.css`, `css/pages.css`, `js/app.js` e `js/pages/admin/reports.js`.
- [x] Ter um servidor local para abrir a SPA, por exemplo `python3 -m http.server 8080`.
- [x] Ter pelo menos um usuario autenticavel para verificar a rota `/#profile`; idealmente um atleta e, se disponivel, um admin ou responsavel.
- [x] Fazer hard refresh ou limpar cache do service worker se o navegador continuar exibindo CSS/JS antigo.

## Fases de Implementacao

### Fase 1: Marcador Semantico da Tela de Perfil

**Objetivo:** Permitir que o espacamento extra seja aplicado somente ao perfil, sem aumentar o rodape visual das demais rotas autenticadas.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `js/app.js` | Modificar | Adicionar uma classe especifica ao wrapper `.page-container` gerado por `renderProfile()`. |

#### Detalhes de Implementacao

1. `js/app.js`
   - Em `renderProfile()`, trocar o wrapper inicial:
     ```html
     <div class="page-container">
     ```
     por:
     ```html
     <div class="page-container profile-page">
     ```
   - Nao alterar a ordem dos cards, o texto do botao, o `id="logout-btn"` ou o listener de clique.
   - Manter `#logout-btn` como ultimo controle funcional do perfil para nao impactar testes existentes que localizam o botao por texto ou id.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `node --check js/app.js` termina sem erro.
- [x] `rg -n "page-container profile-page|logout-btn" js/app.js` mostra a classe nova e preserva o botao existente.

**Verificacao Manual:**
- [x] Abrir `/#profile` autenticado e confirmar no DOM que o wrapper principal tem as classes `page-container profile-page`.
- [x] Clicar em `SAIR DA CONTA`, cancelar o `confirm()`, e confirmar que o usuario permanece na tela de perfil.

### Fase 2: Zona Inferior Propria do Perfil

**Objetivo:** Garantir que o fim do conteudo do perfil continue rolando acima de `#bottom-nav`, inclusive em navegadores mobile com safe area.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `css/pages.css` | Modificar | Adicionar regra escopada para `.profile-page` com padding inferior suficiente para a nav fixa e barra de gestos. |

#### Detalhes de Implementacao

1. `css/pages.css`
   - Adicionar uma regra de layout fora dos blocos de login, proxima aos estilos gerais de paginas:
     ```css
     .profile-page {
         padding-bottom: calc(var(--nav-height) + 40px + env(safe-area-inset-bottom));
     }
     ```
   - Usar `padding-bottom`, e nao margem no botao, porque o respiro pertence ao fim da pagina de perfil e deve continuar existindo se o conteudo condicional mudar por role.
   - Manter o padding horizontal vindo de `.page-container`; a nova regra deve acrescentar apenas a area inferior.
   - Nao reduzir o `padding-bottom` global de `#main-content` nesta correcao. Ele protege outras rotas; qualquer ajuste global deve ser tratado em uma pesquisa separada.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `rg -n "profile-page|--nav-height|safe-area-inset-bottom" css/pages.css js/app.js` mostra a regra CSS e a classe aplicada no renderer.
- [x] `node --check js/app.js` termina sem erro.

**Verificacao Manual:**
- [x] Em viewport mobile aproximada de 390x844, rolar `/#profile` ate o fim e confirmar que todo o botao `SAIR DA CONTA` fica visivel acima da nav inferior.
- [x] Em viewport mobile baixa aproximada de 390x667, repetir o fim do scroll e confirmar que a nav nao cobre o botao.
- [x] Em desktop/navegador largo, confirmar que o perfil nao ganha um espaco visual excessivo que prejudique a leitura.

### Fase 3: Regressao de Navegacao e Roles

**Objetivo:** Confirmar que a correcao nao altera o shell de navegacao, o logout ou os perfis condicionais.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Nenhum | N/A | Fase de verificacao. |

#### Detalhes de Implementacao

1. Servidor local
   - Rodar `python3 -m http.server 8080` na raiz do projeto.
   - Acessar `http://localhost:8080/#login` e autenticar.

2. Checagens por role
   - Atleta: verificar que a ficha do atleta continua aparecendo e que `SAIR DA CONTA` fica livre da nav ao fim do scroll.
   - Responsavel/empresario: verificar que o card `DEPENDENTES` continua aparecendo e que o botao fica livre da nav.
   - Admin: verificar que o card `RELATORIOS` continua aparecendo e que o botao fica livre da nav.

3. Fluxo de logout
   - Clicar em `SAIR DA CONTA`.
   - Confirmar o dialogo.
   - Esperar redirecionamento para `/#login` e confirmar que `#bottom-nav` fica escondida.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `node --check js/app.js` termina sem erro.
- [x] `python3 -m http.server 8080` serve `index.html` com status 200.

**Verificacao Manual:**
- [x] O botao de logout nao fica parcial ou totalmente coberto no fim do scroll.
- [x] A bottom nav continua fixa e funcional em rotas autenticadas.
- [x] A bottom nav continua escondida em `#login`.
- [x] O logout confirmado limpa a sessao e leva o usuario para `#login`.

## Edge Cases

| Cenario | Comportamento Esperado |
|---------|------------------------|
| Navegador iOS com barra de gestos | Padding considera `env(safe-area-inset-bottom)` e deixa o botao acima da area segura. |
| Perfil de atleta tem mais conteudo por causa da ficha | O fim do scroll ainda inclui respiro depois do botao. |
| Perfil admin/responsavel tem menos conteudo | O espaco extra nao esconde conteudo nem altera o funcionamento da nav. |
| `#main-content` ja possui padding inferior global | O perfil pode ter respiro adicional, mas o botao deve priorizar visibilidade sobre compactacao. |
| Service worker entrega CSS antigo | Hard refresh ou unregister do service worker antes de validar visualmente. |
| Usuario cancela o confirm de logout | Permanece em `/#profile`, com o botao ainda visivel e clicavel. |

## Riscos e Mitigacoes

- Espaco inferior parecer grande em telas altas -> limitar a mudanca ao perfil e validar em desktop; se ficar excessivo, reduzir o extra de `40px` para `24px` mantendo `var(--nav-height)`.
- Outra rota tambem depender do padding global de `#main-content` -> nao alterar o padding global nesta tarefa.
- Classe nova nao ser aplicada se o renderer de perfil for duplicado futuramente -> manter a regra atrelada ao wrapper atual de `renderProfile()` e documentar em QA com `rg`.
- Cache do service worker mascarar a correcao -> validar com hard refresh ou service worker desativado em DevTools.
- Impacto de seguranca ou integridade de dados -> nenhum esperado; a mudanca e apenas de apresentacao e nao altera autenticacao, permissoes, queries ou persistencia.

## Rollback

1. Remover `profile-page` do wrapper em `renderProfile()` em `js/app.js`.
2. Remover a regra `.profile-page` de `css/pages.css`.
3. Fazer hard refresh no navegador para garantir que CSS/JS antigos foram recarregados.
4. Reexecutar `node --check js/app.js` e abrir `/#profile` para confirmar retorno ao comportamento anterior.

## Checklist Final

- [x] Scope implemented
- [x] Validation complete
- [x] Rollback path verified
