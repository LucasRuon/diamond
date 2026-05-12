---
date: 2026-05-11T21:39:57-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-11-clubes-vinculados-alunos.md
---

# Spec: Clubes Vinculados Aos Alunos

**Data**: 2026-05-11
**Estimativa**: Média

## Objetivo

Criar uma entidade de clubes administrável pelo painel admin, com nome e logo, e permitir que administradores vinculem um clube cadastrado ao perfil de alunos. O perfil do aluno deve exibir o clube vinculado com fallback para o campo legado `current_club` enquanto os dados antigos não forem migrados manualmente.

## Escopo

### Incluído
- Criar tabela `public.clubs`, bucket `club-logos`, políticas RLS e coluna `users.club_id`.
- Criar tela admin `#clubs` para listar, cadastrar, editar e remover clubes.
- Permitir upload/substituição de logo do clube pelo admin.
- Permitir vínculo de clube no formulário admin de edição de usuário, apenas para alunos.
- Exibir clube vinculado no perfil do aluno, preferindo `users.club_id -> clubs.name` e logo quando existir.
- Atualizar rota, dashboard admin, menu inferior e service worker para os novos módulos.

### Não Incluído
- Autoimportação ou deduplicação automática dos textos já salvos em `users.current_club`.
- Histórico de clubes por aluno.
- Permissões para responsáveis, empresários ou alunos criarem/alterarem clubes.
- Edição do vínculo de clube pelo próprio aluno.
- Relatórios agregados por clube.

## Pré-requisitos

- [ ] Confirmar que a migration `007_student_documents.sql` já foi aplicada antes da nova migration `008`.
- [ ] Confirmar no Supabase Dashboard que a extensão/função `gen_random_uuid()` está disponível, como nas migrations atuais.
- [ ] Validar se o bucket `club-logos` ainda não existe remotamente com configuração diferente.
- [ ] Ter um usuário admin disponível para validar cadastro de clube e vínculo com aluno.

## Fases de Implementação

### Fase 1: Modelo De Dados, Storage E RLS

**Objetivo:** Persistir clubes, logos e vínculo com alunos com políticas compatíveis com o SPA Supabase atual.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `migrations/008_clubs_linked_to_students.sql` | Criar | Nova migration com tabela `clubs`, bucket `club-logos`, coluna `users.club_id`, índices, grants e policies. |

#### Detalhes de Implementação

1. `migrations/008_clubs_linked_to_students.sql`
   - Criar ou atualizar bucket público `club-logos` com `file_size_limit` de 2 MB e MIME types `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`.
   - Criar tabela `public.clubs`:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `name TEXT NOT NULL`
     - `logo_bucket TEXT DEFAULT 'club-logos'`
     - `logo_path TEXT`
     - `created_by UUID REFERENCES public.users(id) ON DELETE SET NULL`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
     - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
     - `deleted_at TIMESTAMPTZ`
   - Adicionar constraints:
     - `length(trim(name)) > 0`
     - `logo_bucket = 'club-logos'`
     - índice único parcial em `lower(trim(name))` quando `deleted_at IS NULL`.
   - Adicionar `club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL` em `public.users`.
   - Criar índice `users_club_id_idx` em `public.users(club_id)` e índice `clubs_active_name_idx`.
   - Habilitar RLS em `public.clubs`.
   - Garantir grants para `authenticated`: `SELECT, INSERT, UPDATE`.
   - Policies:
     - `clubs_select`: autenticados leem apenas `deleted_at IS NULL`.
     - `clubs_insert`: apenas admin cria e `created_by = auth.uid()`.
     - `clubs_update`: apenas admin atualiza/soft-delete.
   - Policies de `storage.objects` para `club-logos`:
     - `SELECT`: público ou autenticado pode ler objetos do bucket, porque a logo é conteúdo público da UI.
     - `INSERT`, `UPDATE`, `DELETE`: apenas admin.
   - Adicionar trigger `set_clubs_updated_at` ou função local equivalente para manter `updated_at`.
   - Finalizar com `NOTIFY pgrst, 'reload schema';`.
   - Não popular `users.club_id` automaticamente a partir de `current_club`; isso deve ser feito manualmente pelo admin na Fase 5 para evitar vínculos incorretos por nomes ambíguos.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] Rodar a migration no Supabase SQL Editor sem erros.
- [ ] Executar uma consulta como admin autenticado e confirmar `select * from public.clubs` retorna vazio sem erro.
- [ ] Executar upload de teste no bucket `club-logos` como admin e confirmar bloqueio para usuário não admin.

**Verificação Manual:**
- [ ] Confirmar no Supabase Dashboard que `public.clubs`, `users.club_id` e bucket `club-logos` existem.
- [ ] Confirmar que remover um clube via `deleted_at` não remove alunos e deixa `users.club_id` preservado até ajuste explícito ou FK `ON DELETE SET NULL` em deleção física.

### Fase 2: Helper Frontend Para Clubes E Logos

**Objetivo:** Centralizar validação, upload e URL pública de logo para evitar lógica duplicada na tela admin.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/clubs.js` | Criar | Helper para validação de logo, upload, URL pública, listagem básica e soft-delete. |

#### Detalhes de Implementação

1. `js/clubs.js`
   - Exportar constantes `CLUB_LOGO_BUCKET = 'club-logos'`, `MAX_CLUB_LOGO_SIZE = 2 * 1024 * 1024` e allowlist de MIME types.
   - Criar `validateClubLogoFile(file)` retornando mensagem em português ou `null`.
   - Criar `getClubLogoUrl(club)`:
     - retornar `null` se não houver `logo_path`;
     - usar `supabase.storage.from(club.logo_bucket || CLUB_LOGO_BUCKET).getPublicUrl(club.logo_path).data.publicUrl`.
   - Criar `uploadClubLogo({ clubId, file })`:
     - validar arquivo;
     - montar path estável `clubs/${clubId}/${Date.now()}-${safeFileName}`;
     - usar `.upload(path, file, { upsert: false })`;
     - retornar `{ logo_bucket: CLUB_LOGO_BUCKET, logo_path: path }`.
   - Criar `listActiveClubs()` ordenando por `name`, filtrando `deleted_at IS NULL`.
   - Criar `softDeleteClub(clubId)` com `deleted_at` e `updated_at`.
   - Usar `escapeHtml`/`safeUrl` apenas na camada de renderização, não dentro do helper.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `python3 -m http.server 8080` carrega `js/clubs.js` sem erro de import no console.
- [ ] Upload de arquivo acima de 2 MB retorna mensagem de validação antes de chamar Storage.

**Verificação Manual:**
- [ ] Testar PNG, JPG e WebP válidos.
- [ ] Testar PDF ou TXT e confirmar mensagem de erro.

### Fase 3: Tela Admin De Gestão De Clubes

**Objetivo:** Entregar um CRUD admin para criar e editar nome/logo de clubes.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/admin/clubs.js` | Criar | Tela `#clubs` com lista, cards, formulário bottom sheet e upload de logo. |
| `css/pages.css` | Modificar | Estilos responsivos para cards/lista de clubes se os estilos inline não forem suficientes. |

#### Detalhes de Implementação

1. `js/pages/admin/clubs.js`
   - Seguir o padrão de `js/pages/admin/plans.js`: `render()`, `loadClubs()`, `setupEvents()`, `showClubForm(club = null)`.
   - Header:
     - link "Voltar" para `#dashboard`;
     - título `CLUBES`;
     - logo Diamond X;
     - botão com ícone `ph-plus-circle` para novo clube.
   - `loadClubs()`:
     - buscar `clubs` com `.is('deleted_at', null).order('name')`;
     - renderizar empty state "Nenhum clube cadastrado.";
     - cada card mostra logo ou placeholder `ph-shield`, nome, data de criação e ações editar/excluir.
   - `showClubForm(club = null)`:
     - campo `name` obrigatório;
     - input de arquivo `accept="image/png,image/jpeg,image/webp,image/svg+xml"`;
     - preview da logo atual quando existir;
     - ao criar, inserir primeiro `{ name, created_by }`, depois fazer upload se houver arquivo, depois atualizar `logo_bucket/logo_path`;
     - ao editar, atualizar nome e, se houver novo arquivo, subir nova logo e atualizar paths.
   - Excluir deve ser soft-delete com confirmação: atualizar `deleted_at` e `updated_at`.
   - Exibição deve usar `escapeHtml` para texto e `safeUrl` para URL pública.
   - Mensagens em português via `toast.show`.

2. `css/pages.css`
   - Adicionar classes apenas se necessário, por exemplo:
     - `.club-card`
     - `.club-logo-preview`
     - `.club-actions`
   - Manter compatibilidade mobile-first e usar tokens de `css/variables.css`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `python3 -m http.server 8080` e acessar `http://localhost:8080/#clubs` logado como admin sem erro de módulo.
- [ ] `rg "adminClubs|#clubs|club-logos" js css service-worker.js migrations` mostra as integrações esperadas.

**Verificação Manual:**
- [ ] Admin cria clube apenas com nome.
- [ ] Admin cria clube com logo e o card mostra a imagem.
- [ ] Admin edita nome e substitui logo.
- [ ] Admin exclui clube e ele desaparece da lista sem erro.

### Fase 4: Rotas, Navegação E Atalhos Admin

**Objetivo:** Tornar a gestão de clubes acessível no app admin e offline-cache aware.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Importar `adminClubs`, proteger rota `#clubs`, despachar render e adicionar item/atalho admin. |
| `js/pages/admin/dashboard.js` | Modificar | Adicionar card de acesso para gestão de clubes. |
| `service-worker.js` | Modificar | Incluir novos módulos no cache e incrementar `CACHE_NAME`. |

#### Detalhes de Implementação

1. `js/app.js`
   - Importar `adminClubs` de `./pages/admin/clubs.js`.
   - Adicionar `#clubs` em `adminRoutes`.
   - Adicionar `case '#clubs': await adminClubs.render(); break;`.
   - Incluir item no menu admin, preferencialmente entre `Usuários` e `Treinos`:
     - `{ h: '#clubs', i: 'ph-shield', t: 'Clubes' }`
   - Considerar o limite visual do menu inferior; se ficar apertado, priorizar `Dashboard`, `Usuários`, `Clubes`, `Treinos`, `Planos`, `Config` e manter cobranças acessível por dashboard/perfil.

2. `js/pages/admin/dashboard.js`
   - Adicionar card semelhante a "Fichas dos alunos":
     - link `#clubs`;
     - título `Clubes`;
     - subtítulo `Cadastrar logos e vincular alunos`;
     - ícone `ph-shield`.

3. `service-worker.js`
   - Incrementar `CACHE_NAME`, por exemplo de `diamondx-v10` para `diamondx-v11`.
   - Incluir `/js/clubs.js` e `/js/pages/admin/clubs.js` em `ASSETS`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] Acessar `/#clubs` como admin renderiza a tela.
- [ ] Acessar `/#clubs` como aluno redireciona para `#dashboard`.
- [ ] O service worker novo ativa sem falha de cache.

**Verificação Manual:**
- [ ] O card "Clubes" aparece no dashboard admin.
- [ ] O item "Clubes" aparece no menu admin e fica ativo na rota correta.

### Fase 5: Vínculo Do Clube Ao Aluno

**Objetivo:** Permitir que o admin selecione um clube cadastrado ao editar um aluno e persistir o vínculo de forma segura.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/admin/users.js` | Modificar | Carregar clubes, exibir clube nos cards de alunos e incluir select no formulário de edição. |
| `supabase/functions/admin-update-user/index.ts` | Modificar | Validar `club_id` e atualizar `users.club_id` via service role. |

#### Detalhes de Implementação

1. `js/pages/admin/users.js`
   - Importar `listActiveClubs` de `../../clubs.js`.
   - Adicionar estado `clubs: []`.
   - Em `render()` ou `loadUsers()`, carregar clubes ativos antes de abrir o formulário.
   - Alterar query de usuários para incluir relação:
     - `select('*, club:clubs(id, name, logo_bucket, logo_path)')`
   - Em cards de alunos, mostrar uma linha pequena `Clube: <nome>` quando `user.club?.name` existir; caso contrário não poluir a lista.
   - Em `showEditUserForm(user)`, incluir select `CLUBE VINCULADO` somente se `user.role === 'student'`.
   - Opções:
     - vazio: `Sem clube vinculado`;
     - clubes ativos ordenados por nome.
   - No submit, enviar `club_id: data.club_id || null` apenas para alunos.
   - Ao trocar papel de aluno para outro papel, enviar `club_id: null` para remover vínculo.
   - Preservar validações atuais de CPF e nome.

2. `supabase/functions/admin-update-user/index.ts`
   - Ler `club_id` do payload como texto opcional.
   - Validar UUID quando informado.
   - Se `club_id` existir:
     - buscar em `clubs` por `id` e `deleted_at IS NULL`;
     - retornar `400` com `Clube invalido.` se não existir.
   - Atualizar `users.club_id`:
     - valor validado quando `role === 'student'`;
     - `null` quando papel salvo não for `student`.
   - Manter `current_club` sem alteração para preservar histórico textual legado.
   - Ajustar `.select(...)` para retornar `club_id` além dos campos atuais.
   - Não gravar `club_id` em `user_metadata`, pois o vínculo pertence ao perfil relacional.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `deno check supabase/functions/admin-update-user/index.ts` passa.
- [ ] Como admin, editar aluno com `club_id` válido retorna sucesso.
- [ ] Como admin, enviar `club_id` inexistente retorna erro controlado.
- [ ] Como admin, editar um aluno para papel `responsible` limpa `club_id`.

**Verificação Manual:**
- [ ] Abrir `#users`, editar um aluno e selecionar clube.
- [ ] Reabrir o mesmo aluno e confirmar o clube selecionado.
- [ ] Editar responsável/admin e confirmar que o campo de clube não aparece.

### Fase 6: Exibição No Perfil Do Aluno E Compatibilidade Legada

**Objetivo:** Mostrar o clube vinculado no perfil do aluno sem quebrar alunos que só possuem `current_club`.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Carregar relação `club`, renderizar logo/nome e ajustar edição da ficha do atleta. |

#### Detalhes de Implementação

1. `js/app.js`
   - Atualizar `loadProfile()` para buscar:
     - `select('*, club:clubs(id, name, logo_bucket, logo_path)')`
   - Importar `getClubLogoUrl` de `./clubs.js`.
   - No card "FICHA DO ATLETA":
     - se `this.profile?.club?.name` existir, mostrar nome e logo do clube;
     - senão, mostrar `this.profile?.current_club || 'Não informado'`.
   - Alterar label visual para `CLUBE VINCULADO`.
   - Em `showEditAnamneseForm()`:
     - manter campo `current_club` como texto legado apenas quando não houver `club_id`;
     - quando houver `club_id`, mostrar aviso pequeno "Clube vinculado pelo administrador" e não permitir edição do nome pelo aluno.
   - O update da anamnese deve continuar sem enviar `club_id`.
   - Garantir que toda URL de logo passe por `safeUrl`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] Perfil de aluno com `club_id` carrega sem erro de join.
- [ ] Perfil de aluno sem `club_id` mas com `current_club` mantém o texto legado.
- [ ] Perfil de aluno sem nenhum dado mostra `Não informado`.

**Verificação Manual:**
- [ ] Vincular clube a um aluno pelo admin e logar como aluno para ver logo/nome no perfil.
- [ ] Abrir edição da ficha do atleta e confirmar que o aluno não altera o vínculo administrado.

### Fase 7: Testes E QA Final

**Objetivo:** Validar o fluxo completo e registrar cobertura mínima para regressões relevantes.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py` | Criar | Teste Playwright gerado/manual para cadastro de clube e vínculo ao aluno, se houver ambiente Supabase de teste preparado. |

#### Detalhes de Implementação

1. `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py`
   - Servir app em `http://localhost:3000`.
   - Login admin.
   - Abrir `#clubs`.
   - Criar clube com nome único, por exemplo `Clube QA <timestamp>`.
   - Abrir `#users`, filtrar alunos, editar aluno de teste e selecionar clube.
   - Validar persistência reabrindo o formulário.
   - Opcional: login como aluno de teste e validar perfil.

2. QA manual obrigatório
   - Testar sem TestSprite caso Supabase de teste não tenha usuários fixos ou Storage liberado.
   - Registrar capturas da tela `#clubs`, formulário de usuário e perfil do aluno para PR.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `deno check supabase/functions/admin-update-user/index.ts`.
- [ ] `python3 -m http.server 3000` mantém a aplicação acessível.
- [ ] `python3 testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py` passa quando credenciais de teste estiverem configuradas.

**Verificação Manual:**
- [ ] Admin cadastra, edita e remove clube.
- [ ] Admin vincula clube a aluno.
- [ ] Aluno vê clube vinculado no perfil.
- [ ] Usuário não admin não acessa `#clubs`.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Clube sem logo | Listas e perfil mostram placeholder/ícone e mantêm nome do clube. |
| Logo inválida ou maior que 2 MB | Upload bloqueado no frontend e também pelo bucket. |
| Nome duplicado com diferença de maiúsculas/minúsculas | Migration bloqueia duplicidade entre clubes ativos. |
| Clube removido logicamente | Não aparece para novos vínculos, mas vínculo existente pode ser tratado manualmente pelo admin. |
| Aluno com `current_club` legado e sem `club_id` | Perfil continua mostrando o texto legado. |
| Aluno com `club_id` e `current_club` preenchidos | Perfil e admin priorizam o clube relacional. |
| Admin troca aluno para responsável/admin | `club_id` é limpo no Edge Function. |
| Usuário não admin tenta escrever em `clubs` ou `club-logos` | RLS/Storage policies bloqueiam a ação. |
| Service worker antigo em cache | Incremento de `CACHE_NAME` força atualização dos assets novos. |

## Riscos e Mitigações

- Conflito entre `current_club` legado e `club_id` novo -> priorizar `club_id` na UI e preservar `current_club` até migração manual.
- RLS insuficiente permitiria escrita por não admin -> validar policies com usuário aluno e manter update de vínculo em Edge Function com service role.
- Menu inferior admin pode ficar visualmente lotado -> se necessário reduzir itens menos críticos e manter atalhos no dashboard.
- Upload de logo pode deixar arquivos órfãos ao substituir/remover clube -> aceitar inicialmente ou adicionar limpeza futura; não bloquear o MVP por Storage cleanup.
- Join `club:clubs(...)` pode falhar antes da migration ser aplicada -> aplicar migration antes do deploy frontend e manter rollback claro.

## Rollback

1. Reverter alterações em `js/app.js`, `js/pages/admin/dashboard.js`, `js/pages/admin/users.js`, `js/pages/admin/clubs.js`, `js/clubs.js`, `css/pages.css`, `service-worker.js` e teste novo.
2. Fazer redeploy da versão anterior do Edge Function `admin-update-user`.
3. No Supabase, remover policies/storage de `club-logos` se a funcionalidade não tiver sido usada.
4. Se não houver dados produtivos, executar rollback SQL:
   - remover FK/índice e coluna `public.users.club_id`;
   - remover tabela `public.clubs`;
   - remover bucket `club-logos`.
5. Se já houver dados produtivos, não apagar tabela/bucket imediatamente; apenas ocultar rotas e manter dados para investigação.

## Checklist Final

- [ ] Migration `008_clubs_linked_to_students.sql` aplicada.
- [ ] Bucket `club-logos` validado com upload admin.
- [ ] Tela `#clubs` criada e acessível apenas para admin.
- [ ] CRUD de clubes funcionando com nome e logo.
- [ ] `admin-update-user` aceita e valida `club_id`.
- [ ] Admin consegue vincular clube ao aluno em `#users`.
- [ ] Perfil do aluno exibe clube relacional com fallback para `current_club`.
- [ ] Service worker atualizado para os novos assets.
- [ ] `deno check supabase/functions/admin-update-user/index.ts` executado.
- [ ] QA manual do fluxo admin -> aluno concluído.
- [ ] Rollback path revisado.
