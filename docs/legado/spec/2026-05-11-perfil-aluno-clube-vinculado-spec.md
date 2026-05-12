---
date: 2026-05-11T22:39:03-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-11-clubes-vinculados-alunos.md
---

# Spec: Perfil Do Aluno Com Clube Vinculado Atualizado

**Data**: 2026-05-11
**Estimativa**: Pequena

## Objetivo

Garantir que o perfil do aluno mostre o clube recém-vinculado pelo administrador sem depender de refresh manual da página e exiba a logo do clube no topo do perfil, ao lado do logo da Diamond X, quando o clube tiver logo cadastrada.

## Escopo

### Incluído
- Recarregar `users` com a relação `clubs` antes de renderizar a rota `#profile`.
- Manter o fallback atual para `current_club` quando não houver clube vinculado.
- Exibir a logo do clube no cabeçalho do perfil do aluno, ao lado do logo Diamond X.
- Criar estilos reutilizáveis para o agrupamento de logos do cabeçalho do perfil.
- Atualizar cache PWA para garantir entrega do JS/CSS alterado.
- Validar o fluxo admin vincula clube -> aluno abre perfil -> clube/logo aparecem.

### Não Incluído
- Alterar o modelo de dados de clubes, `users.club_id`, RLS ou Storage.
- Alterar o fluxo admin de cadastro de clubes ou edição de usuários.
- Migrar automaticamente textos antigos de `users.current_club` para `users.club_id`.
- Criar realtime subscription para atualizações instantâneas enquanto o aluno já está parado na tela de perfil.
- Exibir logo do clube em outras telas além do perfil do aluno.

## Pré-requisitos

- [ ] `migrations/008_clubs_linked_to_students.sql` aplicada no Supabase usado pelo teste.
- [ ] Edge Function `admin-update-user` implantada com suporte a `club_id`.
- [ ] Pelo menos um clube ativo cadastrado com logo em `club-logos`.
- [ ] Um aluno de teste disponível para ser vinculado pelo admin.
- [ ] Servir a SPA localmente em `http://localhost:3000` para os testes TestSprite/Playwright ou `http://localhost:8080` para QA manual.

## Fases de Implementação

### Fase 1: Recarregar Perfil Na Rota `#profile`

**Objetivo:** Remover o stale state que impede o aluno de ver o clube vinculado por admin durante uma sessão já aberta.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Transformar o dispatch de `#profile` em fluxo assíncrono que chama `loadProfile()` antes de `renderProfile()`. |
| `service-worker.js` | Modificar | Incrementar `CACHE_NAME` para invalidar cache do `js/app.js`. |

#### Detalhes de Implementação

1. `js/app.js`
   - No `switch (hash)` de `render()`, substituir:
     - `case '#profile': this.renderProfile(); break;`
   - Por um fluxo que recarregue o perfil autenticado antes da renderização:
     - `case '#profile': await this.loadProfile(); this.renderProfile(); break;`
   - Manter `renderProfile()` síncrono para preservar os listeners e o carregamento assíncrono atual de documentos (`renderStudentProfileDocuments()`).
   - Não chamar `loadProfile()` para rotas públicas ou antes dos guards, para evitar consultas desnecessárias e efeitos colaterais em recovery/login.
   - Aceitar que o perfil é recarregado toda vez que o usuário entra em `#profile`; o custo é baixo e resolve atualizações feitas por outro usuário.

2. `service-worker.js`
   - Incrementar `CACHE_NAME` de `diamondx-v11` para `diamondx-v13`.
   - Não alterar a lista de assets nesta fase, porque `js/app.js` já está precacheado.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] Rodar `python3 -m http.server 3000` e abrir a SPA sem erro de módulo.
- [ ] Rodar `python3 testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py` e confirmar que o vínculo admin continua sendo salvo.
- [ ] Em um teste manual com console aberto, navegar para `/#profile` não gera erro quando `clubs` está vazio, sem logo ou com logo.

**Verificação Manual:**
- [ ] Com aluno logado antes da alteração admin, vincular clube por outro navegador/sessão admin.
- [ ] No navegador do aluno, navegar para outra rota e voltar para `#profile`.
- [ ] Confirmar que `CLUBE VINCULADO` mostra o clube cadastrado sem refresh completo da página.
- [ ] Confirmar que aluno sem `club_id` continua vendo `current_club` ou `Não informado`.

### Fase 2: Logo Do Clube No Cabeçalho Do Perfil

**Objetivo:** Mostrar a identidade visual do clube no topo do perfil do aluno, ao lado do logo Diamond X, sem quebrar o layout mobile.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Calcular logo do clube no `renderProfile()` e renderizar agrupamento de logos no cabeçalho. |
| `css/components.css` | Modificar | Adicionar classes para o grupo de logos e logo de clube no cabeçalho do perfil. |
| `service-worker.js` | Modificar | Confirmar incremento de cache feito na Fase 1 cobre o CSS alterado. |

#### Detalhes de Implementação

1. `js/app.js`
   - No início de `renderProfile()`, depois de `currentRole`, adicionar:
     - `const profileClub = this.profile?.club;`
     - `const profileClubLogoUrl = currentRole === 'student' ? getClubLogoUrl(profileClub) : null;`
   - Substituir o logo único no cabeçalho:
     - `<img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">`
   - Por um wrapper:
     - `div.profile-header-logos`
     - renderizar a logo do clube antes ou depois da Diamond, conforme decisão visual; usar "ao lado" de forma explícita.
     - Exemplo de estrutura:
       - se `profileClubLogoUrl` existir, `<img src="${safeUrl(profileClubLogoUrl)}" alt="Logo do clube ${escapeHtml(profileClub.name)}" class="profile-club-header-logo">`
       - sempre renderizar `<img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">`
   - Usar `safeUrl()` para URL de Storage e `escapeHtml()` no `alt`.
   - Renderizar o logo do clube apenas para `currentRole === 'student'` e somente se existir `logo_path` válido.
   - Não duplicar `getClubLogoUrl()` em outros lugares; reaproveitar o helper já importado.
   - Manter o bloco "FICHA DO ATLETA" como está, incluindo logo/nome e fallback para `current_club`.

2. `css/components.css`
   - Adicionar classes próximas de `.page-header-logo`:
     - `.profile-header-logos`: `display: flex`, `align-items: center`, `gap: 10px`, `flex-shrink: 0`.
     - `.profile-club-header-logo`: dimensão menor que a Diamond, por exemplo `44px` por `44px`, `object-fit: contain`, `border-radius: 8px`, `background: var(--dx-surface2)`, `border: 1px solid var(--dx-border)`, `padding: 4px`.
   - Em media query mobile existente, reduzir a logo do clube se necessário para evitar quebra do título/email:
     - `width: 38px; height: 38px;`
   - Não alterar `.page-header-logo` global de forma que afete todas as telas.

3. `service-worker.js`
   - Se a Fase 1 ainda não tiver incrementado para `diamondx-v13`, fazer aqui.
   - Como `css/components.css` já está no `ASSETS`, não é necessário adicionar novo arquivo.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `rg "profile-header-logos|profile-club-header-logo|await this.loadProfile\\(\\).*renderProfile|diamondx-v13" js/app.js css/components.css service-worker.js` encontra as alterações esperadas.
- [x] Rodar `python3 -m http.server 3000` e validar que `/#profile` retorna HTML/JS/CSS sem 404 no console.

**Verificação Manual:**
- [ ] Perfil de aluno com clube e logo mostra logo do clube no topo ao lado do logo Diamond X.
- [ ] Perfil de aluno com clube sem logo mostra apenas o logo Diamond X no topo e o nome do clube na ficha.
- [ ] Perfil de aluno sem clube não mostra espaço vazio no cabeçalho.
- [ ] Perfil de admin/responsável/empresário continua mostrando somente o logo Diamond X.
- [ ] Em viewport mobile estreito, avatar, título, email e logos não se sobrepõem.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Admin vincula clube enquanto aluno já está logado | Ao entrar novamente em `#profile`, o app recarrega `this.profile` e mostra o novo clube. |
| Relação `club` vem `null`, mas `club_id` existe | Perfil não quebra; exibe fallback `current_club` ou `Não informado` e apenas logo Diamond X no topo. |
| Clube vinculado não tem `logo_path` | Nome do clube aparece na ficha; topo mantém apenas logo Diamond X. |
| URL pública da logo não é gerada | `getClubLogoUrl()` retorna `null`; nenhum `img` quebrado é renderizado no cabeçalho. |
| Clube foi soft-deletado depois do vínculo | Como a policy pode ocultar `clubs.deleted_at IS NOT NULL`, perfil deve cair no fallback sem erro. |
| Aluno edita a ficha após vínculo admin | O campo de clube continua bloqueado pelo texto "vinculado pelo administrador". |
| Service worker antigo ainda ativo | Incremento de `CACHE_NAME` força atualização do cache na próxima ativação. |

## Riscos e Mitigações

- Recarregar perfil em toda entrada de `#profile` aumenta uma consulta Supabase por navegação -> custo baixo e limitado a uma rota; evita stale state causado por atualização admin.
- Falha temporária em `loadProfile()` poderia usar fallback incompleto -> manter tratamento atual de `loadProfile()` e validar que `renderProfile()` lida com campos ausentes.
- Header pode ficar apertado em celulares pequenos -> usar wrapper flex com `flex-shrink: 0`, logo do clube menor e testar viewport estreito.
- Logo SVG ou imagem remota malformada pode quebrar visual -> usar `safeUrl()` e renderizar condicionalmente apenas quando houver URL pública.
- Cache PWA pode atrasar a visualização da correção -> incrementar `CACHE_NAME` e confirmar que o service worker novo ativa.

## Rollback

1. Reverter em `js/app.js` o `case '#profile'` para `this.renderProfile();` se a consulta extra causar regressão grave.
2. Remover de `js/app.js` o wrapper `.profile-header-logos` e a renderização da logo de clube, voltando ao `<img>` único da Diamond.
3. Remover de `css/components.css` as classes `.profile-header-logos` e `.profile-club-header-logo`.
4. Se necessário, manter ou incrementar novamente `CACHE_NAME` em `service-worker.js`; não reduzir cache name em produção já ativada.
5. Nenhum rollback de dados é necessário, porque a mudança não altera schema nem registros.

## Checklist Final

- [ ] Scope implemented
- [ ] Validation complete
- [ ] Rollback path verified
