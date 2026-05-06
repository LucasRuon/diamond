---
date: 2026-05-05T11:32:47-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-05-admin-user-role-change.md
---

# Spec: Correcao da Alteracao de Papel por Admin

**Data**: 2026-05-05
**Estimativa**: Media

## Objetivo

Corrigir o fluxo de edicao de usuarios no painel admin para que um administrador consiga alterar dados e `role` de outro usuario de forma persistente, sem relaxar a RLS que bloqueia autoescalada de privilegio pelo cliente Supabase. A alteracao deve manter `public.users.role` como fonte de verdade do app, preservar o bloqueio de usuarios comuns, e exibir feedback claro quando a operacao falhar.

## Escopo

### Incluido
- Criar uma operacao server-side para atualizar usuarios administrativamente.
- Validar, no servidor, que o chamador autenticado possui `public.users.role = 'admin'`.
- Atualizar `public.users` com `full_name`, `role`, `cpf`, `phone` e `updated_at`.
- Sincronizar Auth metadata do usuario editado quando a infraestrutura server-side permitir.
- Alterar a tela `#users` para usar a operacao admin em vez de `supabase.from('users').update()` direto.
- Manter a RLS `users_update_own` impedindo autoalteracao de `role` pelo cliente.
- Melhorar mensagens de erro do formulario de edicao de usuario.
- Validar sintaxe JavaScript/TypeScript e fazer smoke test manual do fluxo admin.

### Nao Incluido
- Permitir que usuarios alterem o proprio `role`.
- Expor `SUPABASE_SERVICE_ROLE_KEY` ou qualquer segredo no browser.
- Reabrir cadastro publico de contas admin.
- Redesenhar a tela de usuarios ou o bottom sheet.
- Criar painel separado de auditoria de alteracoes.
- Corrigir credenciais ou dados de contas de teste que nao tenham um admin real.

## Pre-requisitos

- [x] Projeto Supabase configurado com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente de Edge Functions.
- [ ] Pelo menos uma conta com linha em `public.users` e `role = 'admin'`.
- [ ] Usuario alvo existente em `public.users`.
- [ ] Migracoes `002_rls_security.sql` e `004_auth_users_profile_trigger.sql` aplicadas ou equivalentes no Supabase remoto.
- [ ] Confirmar que a conta usada no teste admin nao esta atualmente como `student` em `public.users`.
- [ ] Acesso para deploy da Edge Function no projeto Supabase ou decisao explicita de usar RPC SECURITY DEFINER como alternativa.

## Fases de Implementacao

### Fase 1: Operacao Admin Server-Side

**Objetivo:** Criar um endpoint seguro que recebe a edicao de usuario, autentica o chamador pelo JWT, valida role admin em `public.users`, e executa a atualizacao privilegiada fora do browser.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/admin-update-user/index.ts` | Criar | Edge Function para validar admin e atualizar `public.users` com service role no servidor. |

#### Detalhes de Implementacao

1. `supabase/functions/admin-update-user/index.ts`
   - Reaproveitar o padrao de `supabase/functions/asaas-checkout/index.ts` para `serve()`, `createClient()` e CORS.
   - Aceitar apenas `POST` e responder `OPTIONS` com headers CORS.
   - Ler o header `Authorization: Bearer <jwt>` enviado por `supabase.functions.invoke()`.
   - Criar dois clients:
     - `userClient` com `SUPABASE_URL`, `SUPABASE_ANON_KEY` e o header `Authorization` do request para identificar o chamador.
     - `adminClient` com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, usado somente dentro da function.
   - Obter o usuario autenticado com `userClient.auth.getUser()`. Se nao houver usuario, retornar `401`.
   - Buscar `public.users.role` do chamador com `adminClient.from('users').select('role').eq('id', caller.id).single()`.
   - Se o chamador nao for admin, retornar `403`.
   - Ler payload JSON com:
     - `userId`
     - `full_name`
     - `role`
     - `cpf`
     - `phone`
   - Validar `userId` como string UUID nao vazia.
   - Validar `role` contra lista fechada: `student`, `responsible`, `businessman`, `admin`.
   - Normalizar `full_name = full_name.trim()`, `cpf = cpf?.trim() || null`, `phone = phone?.trim() || null`.
   - Rejeitar `full_name` vazio com `400`.
   - Atualizar `public.users` pelo `adminClient`:
     - `full_name`
     - `role`
     - `cpf`
     - `phone`
     - `updated_at: new Date().toISOString()`
   - Usar `.eq('id', userId).select('id, email, full_name, role, cpf, phone, updated_at').single()` para confirmar que exatamente um registro foi atualizado.
   - Opcionalmente chamar `adminClient.auth.admin.updateUserById(userId, { user_metadata: { full_name, role, cpf, phone } })`.
   - Se a sincronizacao de Auth metadata falhar apos o update em `public.users`, retornar sucesso com `metadataWarning` em vez de reverter `public.users`, porque o app usa `public.users` como fonte principal.
   - Retornar JSON com `{ user, metadataWarning: string | null }`.
   - Nunca retornar valores de segredo, stack traces completos ou payloads nao sanitizados.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `deno check supabase/functions/admin-update-user/index.ts` termina sem erro, quando Deno estiver disponivel.
- [x] `rg -n "SUPABASE_SERVICE_ROLE_KEY" js supabase/functions/admin-update-user/index.ts` mostra a chave apenas dentro de `supabase/functions/admin-update-user/index.ts`, nao em `js/`.
- [x] `rg -n "role.*student|role.*responsible|role.*businessman|role.*admin" supabase/functions/admin-update-user/index.ts` mostra validacao de lista fechada.

**Verificacao Manual:**
- [x] Chamada sem JWT retorna `401`.
- [ ] Chamada autenticada como nao-admin retorna `403`.
- [ ] Chamada autenticada como admin atualiza `public.users.role` do usuario alvo.
- [ ] A RLS direta ainda bloqueia `supabase.from('users').update({ role: 'admin' }).eq('id', auth.uid())` para usuario comum.

### Fase 2: Integracao da Tela de Usuarios

**Objetivo:** Fazer o formulario admin chamar a operacao segura e recarregar a lista com o papel atualizado.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `js/pages/admin/users.js` | Modificar | Substituir update direto em `public.users` por `supabase.functions.invoke('admin-update-user')` e melhorar validacoes/feedback. |

#### Detalhes de Implementacao

1. `js/pages/admin/users.js`
   - Em `showEditUserForm(user)`, normalizar valores antes de enviar:
     - `fullName = data.full_name?.trim() || ''`
     - `role = data.role`
     - `cpf = data.cpf?.trim() || null`
     - `phone = data.phone?.trim() || null`
   - Validar `fullName`; se vazio, mostrar `toast.show('Informe o nome completo.', 'error')` e lancar erro para manter o bottom sheet aberto.
   - Manter validacao de CPF com `ui.validate.cpf(cpf)` quando `cpf` existir.
   - Substituir o bloco:
     - `supabase.from('users').update(...).eq('id', user.id)`
   - Por:
     - `supabase.functions.invoke('admin-update-user', { body: { userId: user.id, full_name: fullName, role, cpf, phone } })`
   - Tratar erro de `functions.invoke()`:
     - Se `error` existir, mostrar `Erro ao atualizar usuario: ${error.message}`.
     - Se `data?.error` existir, mostrar essa mensagem.
     - Lancar erro para manter o bottom sheet aberto.
   - Em sucesso:
     - Mostrar `Usuario atualizado com sucesso!`.
     - Se `data?.metadataWarning` existir, mostrar toast adicional de aviso ou registrar `console.warn`.
     - Recarregar a lista mantendo o filtro atual. Para isso, armazenar `this.currentRoleFilter` em `setupFilters()`/`loadUsers()` e chamar `this.loadUsers(this.currentRoleFilter || 'all')`.
   - Preservar `escapeHtml()` na renderizacao e os IDs/classes existentes usados pela tela.
   - Preservar `resetPasswordForEmail(user.email)`, mas garantir que erro desse botao nao interfira no submit principal.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `node --check js/pages/admin/users.js` termina sem erro.
- [x] `rg -n "functions.invoke\\('admin-update-user'|from\\('users'\\)\\.update" js/pages/admin/users.js` confirma uso da function e ausencia do update direto no submit admin.
- [x] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro.

**Verificacao Manual:**
- [ ] Admin abre `#users`, edita um aluno para `admin`, salva, e ve a badge mudar para `ADMIN`.
- [ ] Ao filtrar por `Admins`, o usuario alterado aparece depois do reload.
- [ ] CPF invalido mostra erro e mantem o bottom sheet aberto.
- [ ] Falha de permissao mostra erro e mantem o bottom sheet aberto.
- [ ] Recarregar a pagina e logar com o usuario alterado renderiza dashboard/nav de admin.

### Fase 3: Politicas, Deploy e Configuracao

**Objetivo:** Garantir que a correcao esteja disponivel no Supabase remoto e que a seguranca original continue valida.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `migrations/002_rls_security.sql` | Nao modificar por padrao | Manter `users_update_own` bloqueando autoalteracao de role. Modificar apenas se a politica remota divergir do arquivo local. |
| `supabase/functions/admin-update-user/index.ts` | Modificar se necessario | Ajustar nomes de env vars ou CORS conforme deploy real. |

#### Detalhes de Implementacao

1. Deploy da function
   - Confirmar que o projeto Supabase possui secrets:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Deployar a function:
     - `supabase functions deploy admin-update-user`
   - Se o projeto exigir JWT automaticamente, manter o fluxo padrao. Se `verify_jwt = false` for usado por configuracao local, a function ainda deve validar manualmente o JWT pelo header `Authorization`.

2. RLS
   - Nao adicionar politica que permita `FOR UPDATE` de `public.users` por admins via browser, a menos que a equipe decida abandonar a Edge Function.
   - Confirmar que `users_update_own` continua com:
     - `USING (auth.uid() = id)`
     - `WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()))`
   - Confirmar que a criacao publica de admins continua bloqueada em `004_auth_users_profile_trigger.sql`.

3. Alternativa se Edge Function nao puder ser usada
   - Criar uma migracao separada, por exemplo `migrations/005_admin_update_user_rpc.sql`, com uma funcao `SECURITY DEFINER` que:
     - valida `auth.uid()` e `public.users.role = 'admin'`;
     - valida `role` em lista fechada;
     - atualiza apenas `public.users`;
     - define `search_path = public`;
     - concede `EXECUTE` somente para `authenticated`.
   - Atualizar a UI para chamar `supabase.rpc('admin_update_user', ...)`.
   - Documentar que esta alternativa nao sincroniza Auth metadata.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `supabase functions deploy admin-update-user` conclui sem erro no projeto correto.
- [ ] `supabase functions logs admin-update-user` nao mostra erros apos o smoke test.
- [x] `node --check js/pages/admin/users.js` continua passando apos ajustes de integracao.

**Verificacao Manual:**
- [x] `SUPABASE_SERVICE_ROLE_KEY` nao aparece em nenhum arquivo de frontend.
- [ ] Usuario comum nao consegue promover a si mesmo por chamada direta ao Supabase.
- [ ] Usuario comum nao consegue chamar a function para editar outro usuario.
- [ ] Admin consegue editar outro usuario mesmo com RLS `users_update_own` ativa.

### Fase 4: Validacao End-to-End e Evidencias

**Objetivo:** Confirmar que a falha relatada foi resolvida no fluxo real e que nao houve regressao de acesso por papel.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `testsprite_tests/TC011_Log_in_as_an_administrator_and_access_the_admin_area.py` | Modificar se necessario | Ajustar somente se as credenciais de admin forem corrigidas e o teste ainda tiver seletores obsoletos. |
| `testsprite_tests/testsprite-mcp-test-report.md` | Modificar se gerado novamente | Atualizar apenas por reexecucao TestSprite. |
| `testsprite_tests/tmp/raw_report.md` | Modificar se gerado novamente | Atualizar apenas por reexecucao TestSprite. |

#### Detalhes de Implementacao

1. Smoke test manual
   - Iniciar a SPA local, por exemplo:
     - `python3 -m http.server 8080`
   - Entrar com uma conta admin real.
   - Abrir `/#users`.
   - Selecionar um usuario `student`.
   - Alterar `PAPEL NO SISTEMA` para `Administrador`.
   - Salvar.
   - Confirmar toast de sucesso.
   - Confirmar badge `ADMIN` na lista.
   - Fazer logout.
   - Entrar com o usuario alterado.
   - Confirmar dashboard/admin nav com `Usuarios`, `Treinos`, `Planos`, `Financeiro`, `Relatorios`.

2. Regressao de seguranca
   - Entrar como usuario comum.
   - Tentar chamada direta no console/browser para mudar o proprio papel via `supabase.from('users').update({ role: 'admin' })`.
   - Confirmar erro de RLS ou ausencia de persistencia.
   - Tentar chamar a Edge Function autenticado como nao-admin.
   - Confirmar resposta `403`.

3. Testes existentes
   - Rodar sintaxe JS:
     - `find js -name '*.js' -print0 | xargs -0 -n1 node --check`
   - Rodar smoke de login admin se houver credencial admin real:
     - `python3 testsprite_tests/TC011_Log_in_as_an_administrator_and_access_the_admin_area.py`
   - Se TestSprite estiver disponivel, reexecutar os casos relacionados a login por papel e area admin.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro.
- [x] `deno check supabase/functions/admin-update-user/index.ts` termina sem erro, quando Deno estiver disponivel.
- [ ] `python3 testsprite_tests/TC011_Log_in_as_an_administrator_and_access_the_admin_area.py` passa com credencial admin real.

**Verificacao Manual:**
- [ ] A alteracao Student -> Admin persiste em `public.users`.
- [ ] O usuario promovido acessa area admin apos novo login ou reload.
- [ ] Usuarios nao-admin continuam sem acesso a `#users`.
- [ ] Cadastro publico continua criando apenas `student`, `responsible` ou `businessman`.
- [ ] Erros da function aparecem como toast e nao fecham o bottom sheet.

## Edge Cases

| Cenario | Comportamento Esperado |
|---------|------------------------|
| Chamador sem sessao | Function retorna `401`; UI mostra erro e mantem formulario aberto. |
| Chamador autenticado mas nao-admin | Function retorna `403`; nenhuma linha e atualizada. |
| Admin edita o proprio papel para `student` | Operacao pode ser permitida, mas o admin perde acesso admin apos reload; confirmar se a equipe aceita ou bloquear auto-rebaixamento na function. |
| Payload com `role` fora da lista | Function retorna `400`; nenhum update e executado. |
| Usuario alvo inexistente | Function retorna `404` ou erro controlado; UI mostra mensagem sem fechar o bottom sheet. |
| CPF vazio | Salvo como `null`, mantendo campo opcional. |
| CPF invalido | UI bloqueia antes da chamada e mantem bottom sheet aberto. |
| Sync de Auth metadata falha | `public.users` permanece atualizado; function retorna warning para diagnostico. |
| RLS remota diverge do arquivo local | Edge Function ainda atualiza via service role; registrar divergencia e reconciliar migracoes separadamente. |
| Nenhuma conta admin existe | Fluxo nao pode se autoresolver pelo app; criar primeiro admin por processo administrativo no Supabase. |

## Riscos e Mitigacoes

- Uso incorreto de service role -> manter chave apenas em Edge Function, nunca em `js/`, e validar admin antes do update.
- Escalada por payload manipulado -> validar JWT, role do chamador e lista fechada de roles no servidor.
- Admin acidentalmente remove o ultimo admin -> decidir se a function deve bloquear rebaixamento do proprio usuario ou do ultimo admin antes de implementar.
- Divergencia entre Auth metadata e `public.users` -> tratar `public.users` como fonte de verdade e retornar `metadataWarning` se a sincronizacao falhar.
- Teste TC011 usar conta que ainda e `student` -> corrigir dado de teste primeiro ou usar outra credencial admin.
- Deploy em projeto Supabase errado -> confirmar project ref antes do deploy e testar logs da function.

## Rollback

1. Reverter as alteracoes em `js/pages/admin/users.js` para o update anterior apenas se a function precisar ser desligada temporariamente.
2. Remover ou desabilitar a Edge Function `admin-update-user` no Supabase.
3. Manter `migrations/002_rls_security.sql` sem relaxamento de RLS.
4. Se algum papel foi alterado incorretamente, restaurar `public.users.role` pelo Supabase Dashboard ou SQL administrativo auditavel.
5. Reexecutar smoke de login por papel para confirmar que os usuarios voltaram aos acessos esperados.

## Checklist Final

- [ ] Scope implemented
- [ ] Validation complete
- [ ] Rollback path verified
