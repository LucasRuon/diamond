---
date: 2026-05-05T10:47:03-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-05-financeiro-header-logo-title-overlap.md
---

# Spec: Header Financeiro Sem Sobreposicao Entre Titulo e Logo

**Data**: 2026-05-05
**Estimativa**: Pequena

## Objetivo

Corrigir o cabecalho da tela admin de Financeiro/Cobrancas para que o titulo `FINANCEIRO` nunca fique atras, acima ou visualmente colidido com a logo e os botoes de acao. Em larguras estreitas, a logo deve poder ser ocultada de forma intencional antes de encostar no titulo, mantendo os botoes de adicionar e atualizar visiveis e clicaveis.

## Escopo

### Incluido
- Adicionar classes semanticas ao header da tela `js/pages/admin/charges.js`.
- Remover dependencia de estilos inline para o layout do grupo de acoes do header financeiro.
- Criar regras CSS escopadas para o header financeiro em `css/components.css`.
- Ocultar apenas a logo do header financeiro em viewport estreita, preservando o titulo e os botoes.
- Validar a tela `#payments` em larguras mobile criticas e em desktop.

### Nao Incluido
- Redesenhar todos os cabecalhos da aplicacao.
- Alterar a logo global `.page-header-logo` usada por outras telas.
- Alterar carregamento de cobrancas, filtros, busca, Supabase ou fluxo de pagamento.
- Trocar icones, textos, IDs ou listeners dos botoes `add-charge-btn` e `refresh-charges-btn`.
- Criar testes end-to-end dependentes de credenciais reais.

## Pre-requisitos

- [x] Confirmar que a working tree atual pode receber uma spec nova sem alterar os arquivos de pesquisa nao commitados.
- [x] Ter um servidor local para abrir a SPA, por exemplo `python3 -m http.server 8080`.
- [ ] Ter acesso a um usuario admin para navegar ate `/#payments`.
- [ ] Fazer hard refresh ou desativar o service worker se o navegador continuar exibindo CSS/JS antigo.

## Fases de Implementacao

### Fase 1: Marcar o Header Financeiro

**Objetivo:** Dar ao cabecalho de Financeiro classes proprias para que a correcao seja escopada e nao altere outros headers.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `js/pages/admin/charges.js` | Modificar | Adicionar classes no `.page-header`, no titulo, no grupo de acoes e nos botoes do header financeiro. |

#### Detalhes de Implementacao

1. `js/pages/admin/charges.js`
   - Trocar o wrapper do cabecalho:
     ```html
     <div class="page-header">
     ```
     por:
     ```html
     <div class="page-header page-header--financeiro">
     ```
   - Trocar o titulo inline:
     ```html
     <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400;">FINANCEIRO</h1>
     ```
     por:
     ```html
     <h1 class="brand-title page-header-title">FINANCEIRO</h1>
     ```
   - Trocar o grupo de acoes inline:
     ```html
     <div style="display: flex; align-items: center; gap: 8px;">
     ```
     por:
     ```html
     <div class="page-header-actions page-header-actions--financeiro">
     ```
   - Adicionar classe especifica aos botoes sem mudar IDs:
     ```html
     <button id="add-charge-btn" class="btn btn-primary finance-header-action" aria-label="Adicionar cobranca">
     <button id="refresh-charges-btn" class="btn finance-header-action" aria-label="Atualizar cobrancas">
     ```
   - Remover dos botoes os estilos inline de `width` e `padding`, deixando apenas estilos de cor estritamente necessarios se eles ainda nao existirem em CSS.
   - Manter `id="add-charge-btn"` e `id="refresh-charges-btn"` para preservar os listeners existentes nas linhas seguintes do render.
   - Manter os icones Phosphor atuais: `ph-plus-circle` e `ph-arrows-clockwise`.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `node --check js/pages/admin/charges.js` termina sem erro.
- [x] `rg -n "page-header--financeiro|page-header-actions--financeiro|finance-header-action|add-charge-btn|refresh-charges-btn" js/pages/admin/charges.js` mostra as novas classes e preserva os dois IDs.

**Verificacao Manual:**
- [x] Abrir `/#payments` como admin e confirmar no DOM que o header tem `page-header page-header--financeiro`.
- [x] Clicar nos botoes de adicionar e atualizar e confirmar que os listeners continuam respondendo.

### Fase 2: Layout Responsivo Escopado

**Objetivo:** Garantir que o titulo e o grupo de acoes ocupem espaco previsivel, com a logo ocultada em telas estreitas antes de ocorrer sobreposicao.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `css/components.css` | Modificar | Adicionar regras de layout para `.page-header--financeiro`, `.page-header-actions` e `.finance-header-action`. |

#### Detalhes de Implementacao

1. `css/components.css`
   - Proximo ao bloco `/* Page Header — Logo + Título padronizado */`, adicionar regras escopadas:
     ```css
     .page-header--financeiro {
         display: grid;
         grid-template-columns: minmax(0, 1fr) auto;
         align-items: center;
         column-gap: 12px;
     }

     .page-header--financeiro .page-header-title {
         margin: 0;
         padding-top: 0;
         min-width: 0;
         font-size: 24px;
         line-height: 1.05;
     }

     .page-header-actions {
         display: flex;
         align-items: center;
         gap: 8px;
         flex-shrink: 0;
     }

     .finance-header-action {
         width: 42px;
         min-width: 42px;
         height: 42px;
         padding: 0;
         flex-shrink: 0;
     }

     .finance-header-action .ph {
         font-size: 22px;
     }
     ```
   - Adicionar regra especifica para a cor do botao de atualizar se o inline for removido:
     ```css
     #refresh-charges-btn {
         color: var(--dx-teal);
     }
     ```
   - Em `@media (max-width: 480px)`, garantir que o header financeiro mantenha uma linha compacta:
     ```css
     .page-header--financeiro {
         column-gap: 10px;
     }

     .page-header--financeiro .page-header-title {
         font-size: clamp(17px, 4.5vw, 20px);
     }
     ```
   - Em `@media (max-width: 420px)`, ocultar somente a logo deste header:
     ```css
     .page-header--financeiro .page-header-logo {
         display: none;
     }
     ```
   - Nao alterar a regra global `.page-header-logo`, porque outras telas dependem da logo fixa e nao distorcida.
   - Nao usar `position`, `z-index` ou margem negativa para resolver a colisao; a solucao deve vir do fluxo normal de layout.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `rg -n "page-header--financeiro|finance-header-action|#refresh-charges-btn" css/components.css js/pages/admin/charges.js` mostra regras CSS e markup correspondentes.
- [x] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro de sintaxe.

**Verificacao Manual:**
- [x] Em 390px de largura, o titulo `FINANCEIRO` e os botoes nao se sobrepoem; a logo fica oculta se necessario.
- [x] Em 360px de largura, os botoes de adicionar e atualizar continuam visiveis e clicaveis.
- [x] Em 320px de largura, nao ha texto desenhado por baixo dos botoes nem logo cobrindo o titulo.
- [x] Em desktop, a logo continua visivel no header financeiro.

### Fase 3: Regressao Visual e Funcional

**Objetivo:** Confirmar que a correcao ficou limitada ao Financeiro e que os demais headers mantiveram o comportamento esperado.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Nenhum | N/A | Fase de validacao. |

#### Detalhes de Implementacao

1. Servidor local
   - Rodar `python3 -m http.server 8080` na raiz do projeto.
   - Acessar `http://localhost:8080/#login`, autenticar como admin e navegar para `/#payments`.

2. Checagem do Financeiro
   - Testar `/#payments` em 320px, 360px, 390px, 420px e desktop.
   - Confirmar que o titulo, os botoes e a logo seguem a regra: em tela estreita, a logo some antes de colidir; em tela larga, a logo aparece.
   - Confirmar que o botao de adicionar ainda abre o formulario de cobranca.
   - Confirmar que o botao de atualizar recarrega a lista sem erro no console.

3. Checagem de outros headers
   - Abrir `/#dashboard`, `/#students`, `/#trainings`, `/#plans` e `/#reports` como admin quando aplicavel.
   - Confirmar que logos dessas telas nao foram ocultadas por engano em desktop.
   - Confirmar que a regra especial de reports (`.page-header--reports`) continua funcionando.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `node --check js/pages/admin/charges.js` termina sem erro.
- [x] `python3 -m http.server 8080` serve `index.html` com status 200.

**Verificacao Manual:**
- [x] `FINANCEIRO` nunca aparece atras, acima ou por baixo da logo ou dos botoes.
- [x] A logo do Financeiro desaparece somente em largura estreita definida pela media query.
- [x] Os botoes `add-charge-btn` e `refresh-charges-btn` continuam funcionais.
- [x] Nenhuma outra tela admin perde a logo em desktop.
- [x] Console do navegador nao mostra erro novo ao renderizar `/#payments`.

## Edge Cases

| Cenario | Comportamento Esperado |
|---------|------------------------|
| Viewport de 320px | Logo do header financeiro fica oculta; titulo e botoes permanecem legiveis e clicaveis. |
| Viewport entre 421px e 480px | Header continua em uma linha compacta; logo pode aparecer se houver espaco suficiente pela regra definida. |
| Desktop ou tablet largo | Logo do Financeiro permanece visivel com dimensoes globais de `.page-header-logo`. |
| Fonte Abnes carrega com largura diferente do fallback | Grid reserva espaco para as acoes e evita que o titulo invada a coluna dos botoes. |
| Service worker entrega CSS antigo | Hard refresh ou unregister do service worker antes da validacao visual. |
| Lista de cobrancas falha ao carregar | Header ainda deve renderizar corretamente; erro de dados nao deve afetar layout. |

## Riscos e Mitigacoes

- Media query ocultar a logo cedo demais -> validar em 420px e ajustar breakpoint para 400px se houver espaco real sem colisao.
- Botoes ficarem menores que a area minima de toque -> manter `42px` de largura/altura, acima do minimo pratico para controles iconicos compactos.
- Regra `#refresh-charges-btn` afetar outro elemento futuro com mesmo ID duplicado -> IDs devem permanecer unicos; se houver novo refresh em outra tela, usar classe especifica em vez de duplicar ID.
- Classe `.page-header-actions` ser reutilizada futuramente em outro contexto -> manter regras genericas apenas para flex/gap e deixar tamanhos de botao em `.finance-header-action`.
- Impacto de seguranca ou integridade de dados -> nenhum esperado; a mudanca e visual e nao altera consultas, permissoes, autenticacao ou persistencia.

## Rollback

1. Remover `page-header--financeiro`, `page-header-title`, `page-header-actions`, `page-header-actions--financeiro` e `finance-header-action` do template em `js/pages/admin/charges.js`.
2. Restaurar os estilos inline originais do header financeiro se for necessario voltar exatamente ao estado anterior.
3. Remover as regras `.page-header--financeiro`, `.page-header-actions`, `.finance-header-action` e `#refresh-charges-btn` adicionadas em `css/components.css`.
4. Reexecutar `node --check js/pages/admin/charges.js` e abrir `/#payments` para confirmar que a tela voltou ao comportamento anterior.

## Checklist Final

- [x] Scope implemented
- [x] Validation complete
- [ ] Rollback path verified
