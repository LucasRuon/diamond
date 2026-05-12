---
date: 2026-05-11T22:23:16-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-11-admin-users-clubs-embed-error.md
---

# Spec: Correção Do Embed Entre Usuários E Clubes

**Data**: 2026-05-11
**Estimativa**: Pequena

## Objetivo

Corrigir o erro `Could not embed because more than one relationship was found for 'users' and 'clubs'` na tela admin de usuários e no carregamento do perfil atual. As consultas que partem de `public.users` devem indicar explicitamente que o embed de `clubs` usa a relação `users.club_id -> clubs.id`, evitando ambiguidade com a relação inversa `clubs.created_by -> users.id`.

## Escopo

### Incluído
- Ajustar a query da tela admin `#users` para usar embed explícito pela FK de `users.club_id`.
- Ajustar `app.loadProfile()` para usar a mesma relação explícita ao carregar o clube vinculado do usuário autenticado.
- Validar que o nome da constraint usado no embed existe no Supabase remoto.
- Validar manualmente a tela admin de usuários e o perfil de aluno com clube vinculado.

### Não Incluído
- Alterar o modelo de dados de clubes ou usuários.
- Alterar a Edge Function `admin-update-user`, pois ela não usa embed entre `users` e `clubs`.
- Migrar valores legados de `users.current_club` para `users.club_id`.
- Redesenhar a tela de usuários, perfil ou gestão de clubes.
- Criar relatórios ou filtros por clube.

## Pré-requisitos

- [ ] Ter acesso a um usuário admin no ambiente de teste.
- [ ] Ter ao menos um clube ativo em `public.clubs`.
- [ ] Ter ao menos um aluno com `users.club_id` preenchido para validar exibição do vínculo.
- [ ] Confirmar que a migration `008_clubs_linked_to_students.sql` já foi aplicada no ambiente alvo.

## Fases de Implementação

### Fase 1: Confirmar Nome Da Relação Remota

**Objetivo:** Garantir que o frontend usará o nome correto da FK reconhecida pelo PostgREST.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| N/A | Validar | Sem alteração de arquivo nesta fase; apenas confirmação do schema remoto. |

#### Detalhes de Implementação

1. Supabase SQL Editor
   - Executar uma consulta para localizar a FK entre `public.users.club_id` e `public.clubs.id`:

```sql
SELECT
  con.conname AS constraint_name,
  src.relname AS source_table,
  array_agg(src_col.attname ORDER BY cols.ordinality) AS source_columns,
  dst.relname AS target_table
FROM pg_constraint con
JOIN pg_class src ON src.oid = con.conrelid
JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
JOIN pg_class dst ON dst.oid = con.confrelid
JOIN pg_namespace dst_ns ON dst_ns.oid = dst.relnamespace
JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ordinality) ON true
JOIN pg_attribute src_col ON src_col.attrelid = con.conrelid AND src_col.attnum = cols.attnum
WHERE con.contype = 'f'
  AND src_ns.nspname = 'public'
  AND src.relname = 'users'
  AND dst_ns.nspname = 'public'
  AND dst.relname = 'clubs'
GROUP BY con.conname, src.relname, dst.relname;
```

   - Resultado esperado no schema criado pela migration local: `users_club_id_fkey`.
   - Se o resultado tiver outro nome, usar esse nome real nos embeds da Fase 2.
   - Se não houver FK de `users.club_id` para `clubs.id`, criar uma migration corretiva separada antes do frontend. A migration deve adicionar ou normalizar a FK e terminar com `NOTIFY pgrst, 'reload schema';`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] A consulta SQL retorna exatamente uma FK de `public.users` para `public.clubs` pela coluna `club_id`.
  - Não executado localmente: o projeto Supabase não está linkado no repositório. A migration local `008_clubs_linked_to_students.sql` usa `ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id)`, cujo nome padrão esperado no PostgreSQL é `users_club_id_fkey`.

**Verificação Manual:**
- [x] O nome da FK foi anotado antes da alteração do frontend.
- [x] Não há plano de usar a relação `clubs.created_by` para a tela de usuários ou perfil de aluno.

### Fase 2: Corrigir Embeds No Frontend

**Objetivo:** Remover a ambiguidade das queries Supabase que carregam `club` a partir de `users`.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/admin/users.js` | Modificar | Declarar a FK no embed da listagem admin de usuários. |
| `js/app.js` | Modificar | Declarar a FK no embed usado por `loadProfile()`. |

#### Detalhes de Implementação

1. `js/pages/admin/users.js`
   - Alterar a query de `loadUsers()`:

```js
supabase.from('users').select('*, club:clubs!users_club_id_fkey(id, name)').order('full_name');
```

   - Se a Fase 1 retornar uma constraint com outro nome, substituir `users_club_id_fkey` pelo nome confirmado.
   - Preservar o alias `club`, porque a renderização atual usa `user.club?.name`.
   - Preservar `club_id` no payload de `*`, porque o formulário compara `user.club_id` com `this.clubs`.
   - Não alterar filtros de papel, cards, eventos de edição ou atalho de documentos.

2. `js/app.js`
   - Alterar a query de `loadProfile()`:

```js
supabase
    .from('users')
    .select('*, club:clubs!users_club_id_fkey(id, name, logo_bucket, logo_path)')
    .eq('id', this.user.id)
    .single();
```

   - Se a Fase 1 retornar outro nome, usar o mesmo nome confirmado.
   - Preservar o alias `club`, porque o perfil usa `this.profile?.club`.
   - Preservar `logo_bucket` e `logo_path`, porque `getClubLogoUrl(club)` depende desses campos.
   - Manter o fallback atual para `current_club` quando não houver `club.name`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `rg -n "club:clubs\\(" js` não retorna embeds ambíguos no frontend.
- [x] `rg -n "club:clubs!" js` mostra as duas queries corrigidas.
- [x] Servir a aplicação com `python3 -m http.server 3000` sem erro de import no console.

**Verificação Manual:**
- [ ] Admin acessa `http://localhost:3000/#users` e a lista carrega sem a mensagem `Erro ao carregar usuários`.
- [ ] Um aluno com `club_id` preenchido exibe o nome do clube no card de usuários.
- [ ] O filtro `Alunos` continua carregando a lista sem erro.
- [ ] Ao abrir o formulário de edição de um aluno, o select `CLUBE VINCULADO` mantém o clube salvo selecionado.
- [ ] Perfil de aluno com `club_id` exibe o clube vinculado e logo quando disponível.
- [ ] Perfil de aluno sem `club_id` continua exibindo `current_club` ou `Não informado`.

### Fase 3: Regressão E Publicação

**Objetivo:** Validar o fluxo principal antes de publicar a correção.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| N/A | Validar | Sem alteração prevista; fase dedicada a QA e deploy. |

#### Detalhes de Implementação

1. Validação local
   - Iniciar servidor estático na porta esperada pelos testes:

```bash
python3 -m http.server 3000
```

   - Executar testes existentes que cubram login/admin quando a configuração Supabase de teste estiver disponível:

```bash
python3 testsprite_tests/TC011_Log_in_as_an_administrator_and_access_the_admin_area.py
```

   - Se houver teste específico de atualização de perfil ou usuário disponível e com massa de dados compatível, executar também:

```bash
python3 testsprite_tests/TC026_Update_profile_information.py
```

2. QA manual
   - Validar no navegador os dois fluxos que usam o embed:
     - admin `#users`;
     - perfil do aluno.
   - Confirmar no Network/Console que a resposta Supabase não contém erro de relationship ambiguity.

3. Publicação
   - Como a correção é frontend-only quando a FK já existe, publicar a alteração estática pelo fluxo usado no projeto.
   - Se a Fase 1 exigiu migration corretiva, aplicar a migration no Supabase antes de publicar o frontend.
   - Se houver cache agressivo do PWA, avaliar incremento de `CACHE_NAME` em `service-worker.js` apenas se o deploy atual não invalida corretamente `js/app.js` e `js/pages/admin/users.js`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] Testes Playwright selecionados passam no ambiente com Supabase configurado.
  - `TC011_Log_in_as_an_administrator_and_access_the_admin_area.py` executou, mas falhou em expectativa legada de URL contendo `/admin`.
  - `TC026_Update_profile_information.py` executou, mas falhou aguardando `#sheet-overlay` ficar oculto após salvar perfil.
- [x] Não há ocorrências restantes de `club:clubs(` em `js/`.

**Verificação Manual:**
- [ ] Usuários admin, alunos, responsáveis e empresários continuam carregando perfil sem regressão aparente.
- [ ] A tela `#clubs` continua listando clubes ativos.
- [ ] A atualização de usuário via `admin-update-user` continua salvando e limpando `club_id` conforme o papel.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Aluno com `club_id` nulo | Lista e perfil carregam sem erro e usam fallback visual atual. |
| Aluno com `club_id` apontando para clube deletado logicamente | Query pode retornar o clube se RLS permitir ou `club` nulo se policy filtrar; UI não deve quebrar. |
| Constraint remota tem nome diferente de `users_club_id_fkey` | Usar o nome confirmado na Fase 1 ou criar migration para normalizar a constraint antes do deploy. |
| Schema cache do PostgREST ainda antigo após migration | Executar `NOTIFY pgrst, 'reload schema';` e aguardar reload antes de testar o frontend. |
| Usuário não admin acessa `#users` | Roteamento atual deve continuar redirecionando para dashboard, sem exposição da lista admin. |
| Falha de RLS ao ler `clubs` embutido | A tela deve mostrar erro de carregamento; investigar policies de `clubs_select` separadamente. |

## Riscos e Mitigações

- Nome da FK diferente entre local e remoto -> confirmar via SQL antes da alteração e usar o nome real no embed.
- Corrigir apenas a tela `#users` e deixar `loadProfile()` quebrando para alunos -> alterar os dois embeds identificados pela pesquisa.
- Cache do PWA servir JavaScript antigo -> validar em janela limpa e considerar bump de cache se necessário.
- Policy de `clubs_select` esconder clubes soft-deletados -> aceitar `club` nulo no frontend e manter fallback para `current_club`.
- Migration corretiva criada sem validar dados existentes -> se for necessário adicionar FK, auditar `users.club_id` órfãos antes de aplicar constraint.

## Rollback

1. Reverter as alterações em `js/pages/admin/users.js` e `js/app.js` para os selects anteriores.
2. Se uma migration corretiva tiver sido criada apenas para normalizar nome de constraint, não reverter automaticamente sem avaliar dependências de produção; o rename/add de FK tende a ser compatível com a correção.
3. Limpar cache do PWA ou publicar nova versão estática se clientes continuarem recebendo bundles antigos.

## Checklist Final

- [x] Scope implemented
- [ ] Validation complete
- [ ] Rollback path verified
