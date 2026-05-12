---
date: 2026-05-11T22:19:55-03:00
researcher: Codex
git_commit: 8ec9ae2640b83be696b92869a68040bf7bd2349f
branch: work
repository: Diamond
topic: "$research-codebase na tela de usuário está retornando esse novo erro: Erro ao carregar usuários: Could not embed because more than one relationship was found for 'users' and 'clubs'"
tags: [research, codebase]
status: complete
last_updated: 2026-05-11
last_updated_by: Codex
---

# Research: Erro de embed entre users e clubs na tela de usuários

**Date**: 2026-05-11T22:19:55-03:00
**Researcher**: Codex
**Git Commit**: 8ec9ae2640b83be696b92869a68040bf7bd2349f
**Branch**: work
**Repository**: Diamond

## Research Question
$research-codebase na tela de usuário está retornando esse novo erro: Erro ao carregar usuários: Could not embed because more than one relationship was found for 'users' and 'clubs'

## Scope
Inclui a rota/tela admin de usuários, o helper de clubes, a migration de clubes vinculados a alunos, a Edge Function de atualização de usuários e os outros pontos do frontend que carregam a relação `club`.

Assumido: "tela de usuário" se refere à rota admin `#users`, renderizada por `js/pages/admin/users.js`.

## Summary
A tela admin `#users` carrega usuários com `supabase.from('users').select('*, club:clubs(id, name)')` e exibe `Erro ao carregar usuários: ${error.message}` quando a consulta retorna erro (`js/pages/admin/users.js:50`, `js/pages/admin/users.js:56`, `js/pages/admin/users.js:59`).

No schema local, existem duas relações entre `public.users` e `public.clubs`: `clubs.created_by` referencia `users.id`, e `users.club_id` referencia `clubs.id` (`migrations/008_clubs_linked_to_students.sql:24`, `migrations/008_clubs_linked_to_students.sql:38`, `migrations/008_clubs_linked_to_students.sql:39`). Como a consulta usa `club:clubs(...)` sem indicar qual FK representa o vínculo, o embed fica ambíguo entre essas duas relações.

O mesmo padrão de embed sem FK explícita também aparece em `app.loadProfile()`, que carrega o perfil atual com `select('*, club:clubs(id, name, logo_bucket, logo_path)')` (`js/app.js:198`, `js/app.js:200`, `js/app.js:202`).

## Detailed Findings

### Rota e tela admin de usuários
- `js/app.js` protege `#users` como rota admin e despacha essa rota para `adminUsers.render()` (`js/app.js:263`, `js/app.js:266`, `js/app.js:293`).
- `adminUsers.render()` monta a página `USUÁRIOS`, inicia `listActiveClubs()` de forma assíncrona e chama `this.loadUsers()` para popular a lista (`js/pages/admin/users.js:10`, `js/pages/admin/users.js:37`, `js/pages/admin/users.js:38`).
- `loadUsers()` usa a consulta `supabase.from('users').select('*, club:clubs(id, name)').order('full_name')` (`js/pages/admin/users.js:46`, `js/pages/admin/users.js:50`).
- Se a consulta retorna erro, a tela escreve literalmente `Erro ao carregar usuários: ${error.message}` dentro de `#users-list` (`js/pages/admin/users.js:56`, `js/pages/admin/users.js:58`, `js/pages/admin/users.js:59`).
- Quando a consulta retorna dados, a tela espera que alunos tenham `user.club?.name` para exibir o clube no card (`js/pages/admin/users.js:68`, `js/pages/admin/users.js:77`).

### Relações entre users e clubs no schema local
- A migration `008_clubs_linked_to_students.sql` cria a tabela `public.clubs` (`migrations/008_clubs_linked_to_students.sql:18`, `migrations/008_clubs_linked_to_students.sql:19`).
- A coluna `clubs.created_by` referencia `public.users(id)` para registrar quem criou o clube (`migrations/008_clubs_linked_to_students.sql:24`).
- A mesma migration adiciona `users.club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL`, que representa o clube vinculado ao aluno (`migrations/008_clubs_linked_to_students.sql:37`, `migrations/008_clubs_linked_to_students.sql:38`, `migrations/008_clubs_linked_to_students.sql:39`).
- O índice `users_club_id_idx` reforça que `users.club_id` é uma coluna consultável no vínculo aluno-clube (`migrations/008_clubs_linked_to_students.sql:41`).
- A policy de criação de clubes exige que `created_by = auth.uid()`, usando a relação inversa `clubs.created_by -> users.id` para autoria (`migrations/008_clubs_linked_to_students.sql:53`, `migrations/008_clubs_linked_to_students.sql:54`, `migrations/008_clubs_linked_to_students.sql:57`, `migrations/008_clubs_linked_to_students.sql:58`).

### Fluxo de clube no formulário de edição de usuário
- `adminUsers` mantém um array `clubs` no estado do módulo (`js/pages/admin/users.js:6`, `js/pages/admin/users.js:8`).
- `listActiveClubs()` busca clubes ativos direto de `public.clubs`, selecionando `id`, `name`, dados de logo e `created_at` (`js/clubs.js:41`, `js/clubs.js:43`, `js/clubs.js:44`, `js/clubs.js:45`, `js/clubs.js:46`).
- O formulário de edição mostra `CLUBE VINCULADO` apenas quando o usuário editado já tem `role === 'student'` (`js/pages/admin/users.js:132`, `js/pages/admin/users.js:162`, `js/pages/admin/users.js:164`, `js/pages/admin/users.js:165`).
- As opções do select vêm de `this.clubs`, e o valor selecionado compara `user.club_id` com `c.id` (`js/pages/admin/users.js:166`, `js/pages/admin/users.js:167`).
- No submit, a tela envia `club_id` para a Edge Function somente quando o papel salvo é `student`; para outros papéis, envia `null` (`js/pages/admin/users.js:176`, `js/pages/admin/users.js:192`, `js/pages/admin/users.js:194`, `js/pages/admin/users.js:201`).

### Edge Function de atualização de usuários
- `admin-update-user` lê `club_id` do payload junto com `userId`, `full_name` e `role` (`supabase/functions/admin-update-user/index.ts:82`, `supabase/functions/admin-update-user/index.ts:86`).
- Se o papel salvo é `student` e há `club_id`, a função valida UUID, busca o clube por `id` e exige `deleted_at IS NULL` (`supabase/functions/admin-update-user/index.ts:105`, `supabase/functions/admin-update-user/index.ts:109`, `supabase/functions/admin-update-user/index.ts:110`, `supabase/functions/admin-update-user/index.ts:113`, `supabase/functions/admin-update-user/index.ts:117`).
- A atualização de `public.users` grava `club_id: clubIdUpdate` via service role e retorna `club_id` no select final (`supabase/functions/admin-update-user/index.ts:125`, `supabase/functions/admin-update-user/index.ts:128`, `supabase/functions/admin-update-user/index.ts:135`, `supabase/functions/admin-update-user/index.ts:139`).
- Essa função não usa embed entre `users` e `clubs`; ela consulta `clubs` diretamente por `id` e depois atualiza `users.club_id` (`supabase/functions/admin-update-user/index.ts:113`, `supabase/functions/admin-update-user/index.ts:128`).

### Outro ponto com o mesmo embed
- `app.loadProfile()` carrega o perfil atual com `supabase.from('users').select('*, club:clubs(id, name, logo_bucket, logo_path)')` (`js/app.js:198`, `js/app.js:200`, `js/app.js:202`).
- A tela de perfil do aluno usa `this.profile?.club` para exibir nome e logo do clube vinculado e cai para `current_club` quando `club?.name` não existe (`js/app.js:677`, `js/app.js:679`, `js/app.js:680`, `js/app.js:681`, `js/app.js:687`).
- O formulário de ficha do atleta mostra o clube administrado quando `this.profile?.club_id` existe; quando não existe, mantém o campo legado `current_club` (`js/app.js:869`, `js/app.js:874`, `js/app.js:877`, `js/app.js:879`).

### Spec relacionada
- A spec de clubes pediu explicitamente a criação de duas relações: `clubs.created_by UUID REFERENCES public.users(id)` e `users.club_id UUID REFERENCES public.clubs(id)` (`docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:63`, `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:71`).
- A mesma spec pediu a query `select('*, club:clubs(id, name, logo_bucket, logo_path)')` na tela de usuários e no `loadProfile()` (`docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:244`, `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:249`, `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:297`, `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:299`).
- Os critérios de sucesso da spec incluíam que o perfil de aluno com `club_id` carregasse sem erro de join (`docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:311`, `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:314`).

## Code References
- `js/pages/admin/users.js:50` - Query da tela admin de usuários com `club:clubs(id, name)`.
- `js/pages/admin/users.js:59` - Local exato onde a mensagem `Erro ao carregar usuários: ...` é renderizada.
- `migrations/008_clubs_linked_to_students.sql:24` - Relação `clubs.created_by -> users.id`.
- `migrations/008_clubs_linked_to_students.sql:39` - Relação `users.club_id -> clubs.id`.
- `js/app.js:202` - Outro embed `club:clubs(...)`, usado pelo carregamento do perfil atual.
- `js/pages/admin/users.js:167` - UI espera `user.club_id` para selecionar o clube do aluno no formulário.
- `supabase/functions/admin-update-user/index.ts:135` - Persistência de `club_id` em `public.users`.
- `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:249` - Spec indicou o embed sem FK explícita para a tela de usuários.
- `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:299` - Spec indicou o mesmo embed sem FK explícita para `loadProfile()`.

## Architecture Documentation
O fluxo atual de `#users` é:

`hash #users` -> `app.render()` valida papel admin -> `adminUsers.render()` -> `listActiveClubs()` carrega opções do select -> `loadUsers()` consulta `public.users` com embed `club:clubs(...)` -> cards exibem `user.club?.name` -> clique abre edição -> submit chama `admin-update-user` -> Edge Function valida admin e grava `users.club_id`.

O modelo local de dados tem duas conexões entre as mesmas tabelas:

`public.clubs.created_by` -> `public.users.id`, para autoria do cadastro do clube.

`public.users.club_id` -> `public.clubs.id`, para vínculo do aluno com um clube.

As consultas que usam embed `club:clubs(...)` partem de `users` e precisam de uma única relação inequívoca entre `users` e `clubs`. No estado atual do schema local, há mais de uma relação disponível entre essas tabelas.

## Historical Context
- `docs/research/2026-05-11-clubes-vinculados-alunos.md` foi escrito antes da implementação local da feature e documentava que ainda não existia entidade de clubes. O live code atual já contém `js/clubs.js`, `js/pages/admin/clubs.js`, rota `#clubs`, migration `008_clubs_linked_to_students.sql` e `users.club_id`.
- `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md` descreve a feature implementada e contém tanto a criação das duas relações quanto os embeds `club:clubs(...)` usados na UI.

## Related Research
- `docs/research/2026-05-11-clubes-vinculados-alunos.md` - Pesquisa anterior da feature de clubes vinculados.
- `docs/research/2026-05-09-project-inventory.md` - Inventário geral de rotas, módulos, migrations e Edge Functions.
- `docs/research/2026-05-05-admin-user-role-change.md` - Fluxo admin de edição de usuários e papéis.

## Open Questions
- O schema remoto do Supabase não foi inspecionado diretamente nesta pesquisa; as conclusões usam o live code e as migrations locais como fonte de verdade disponível.
- Não foi executada uma consulta real contra o Supabase remoto para capturar o código PostgREST completo do erro, apenas mapeado o caminho local que renderiza a mensagem recebida.
