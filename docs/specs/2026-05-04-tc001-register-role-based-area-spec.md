---
date: 2026-05-04T12:12:17-03:00
author: Codex
status: draft
ticket: TC001
research: docs/research/2026-05-04-tc001-register-role-based-area.md
---

# Spec: Cadastro Redireciona para Area por Perfil

**Data**: 2026-05-04
**Estimativa**: Média

## Objetivo

Corrigir o fluxo de cadastro para que um novo usuário com dados válidos, quando o Supabase entregar uma sessão imediata após `signUp`, seja autenticado no estado local da SPA e levado para `#dashboard`, onde o dashboard correto é escolhido por `users.role` ou pelo `user_metadata.role`. O plano também cobre a criação confiável do perfil em `public.users` e uma validação objetiva do cenário TC001.

## Escopo

### Incluído
- Ajustar o submit de cadastro para tratar explicitamente sucesso com sessão e sucesso sem sessão.
- Reusar o roteamento existente de `#dashboard` e o dispatch por papel já implementado em `renderDashboard()`.
- Garantir que o perfil de aplicação seja criado a partir dos metadados de Auth sem expor `service_role` no cliente.
- Melhorar a cobertura local do TC001 para verificar URL e área renderizada, não apenas que `window.location.href` existe.
- Documentar os pré-requisitos de ambiente do Supabase para cadastro com sessão imediata.

### Não Incluído
- Redesenho da tela de cadastro ou alteração visual ampla do fluxo de login.
- Permitir autoelevação para `admin` pelo cadastro público.
- Mudança no fluxo de confirmação de e-mail se o produto decidir exigir confirmação antes do primeiro login.
- Correção dos demais testes falhos do relatório TestSprite, como TC011, TC012, TC015, TC026 ou QR Code.
- Substituição completa da suíte TestSprite gerada.

## Pré-requisitos

- [ ] Confirmar no Supabase Auth se o ambiente usado pelo TestSprite permite sessão imediata após cadastro. Se confirmação de e-mail estiver habilitada, TC001 precisa esperar login/confirmacao e nao pode exigir dashboard imediatamente.
- [ ] Acesso ao Supabase Dashboard/SQL Editor do projeto usado por `js/supabase.js`.
- [ ] Confirmar a estrutura real de `public.users`, especialmente colunas `id`, `email`, `full_name`, `role`, `cpf`, `phone`, `created_at` e `updated_at`.
- [ ] Usar e-mails únicos nos testes de cadastro para evitar erro de usuário já existente.

## Fases de Implementação

### Fase 1: Fluxo Cliente Pós-Cadastro

**Objetivo:** Fazer o cadastro com sessão imediata atualizar `app.user`, carregar o perfil e abrir o dashboard correto sem depender somente do listener assíncrono de auth.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Adicionar tratamento explícito do resultado de `auth.register()` e redirecionar para `#dashboard` quando houver sessão. |

#### Detalhes de Implementação

1. `js/app.js`
   - Criar um método pequeno no objeto `app`, por exemplo `async handleRegistrationSuccess(result, metadata)`.
   - Nesse método, inspecionar o retorno de `auth.register()`:
     - Sessão imediata: `result.session` existe ou `supabase.auth.getSession()` retorna sessão logo após o cadastro.
     - Sem sessão: cadastro aceito, mas confirmação/login ainda necessário.
   - Para sessão imediata:
     - Definir `this.user = session.user`.
     - Chamar `await this.loadProfile()`.
     - Se `loadProfile()` não encontrar linha em `public.users`, manter o fallback por `user_metadata.role`, que já existe em `loadProfile()`.
     - Exibir toast curto, por exemplo `Conta criada com sucesso!`.
     - Definir `window.location.hash = '#dashboard'`.
     - Se a hash já estiver em `#dashboard`, chamar `await this.render()` para evitar tela parada.
   - Para sucesso sem sessão:
     - Exibir mensagem clara, por exemplo `Conta criada! Verifique seu e-mail ou faça login para continuar.`
     - Manter `window.location.hash = '#login'`.
   - No handler de `register-form`, trocar o bloco atual:
     - De: toast `Conta criada! Por favor, faça login.` e `window.location.hash = '#login'`.
     - Para: `await this.handleRegistrationSuccess(result, metadata)`.
   - Preservar validação de CPF antes da chamada de auth.
   - Preservar `finally` restaurando o botão, mas garantir que não ocorra erro se a tela foi trocada durante o redirect.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/app.js` termina sem erro.
- [ ] Com mock/manual de `auth.register()` retornando `{ session: { user }, user }`, o fluxo define `#dashboard`.
- [ ] Com mock/manual de `auth.register()` retornando `{ user, session: null }`, o fluxo define `#login` e exibe mensagem de confirmação/login.

**Verificação Manual:**
- [ ] Cadastro com CPF válido e e-mail único entra em `#dashboard` quando o Supabase retorna sessão.
- [ ] O dashboard renderizado corresponde ao papel selecionado: atleta, responsável ou empresário.
- [ ] Cadastro com CPF inválido continua bloqueado antes de chamar Supabase.
- [ ] Usuário autenticado que acessa `#register` continua sendo redirecionado para `#dashboard`.

### Fase 2: Perfil de Aplicação no Supabase

**Objetivo:** Garantir que cada usuário criado em Supabase Auth tenha uma linha correspondente em `public.users`, sem inserir perfil pelo browser nem permitir escalada de papel.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `migrations/004_auth_users_profile_trigger.sql` | Criar | Adicionar trigger idempotente em `auth.users` para criar/atualizar perfil em `public.users` a partir de `raw_user_meta_data`. |
| `migrations/002_rls_security.sql` | Modificar | Documentar ou ajustar políticas de `public.users` caso o trigger exija compatibilidade explícita com RLS existente. |

#### Detalhes de Implementação

1. `migrations/004_auth_users_profile_trigger.sql`
   - Criar função `public.handle_new_auth_user()` com `SECURITY DEFINER` e `SET search_path = public`.
   - No `INSERT` em `auth.users`, inserir em `public.users`:
     - `id = new.id`
     - `email = new.email`
     - `full_name = coalesce(new.raw_user_meta_data->>'full_name', new.email)`
     - `role = coalesce(new.raw_user_meta_data->>'role', 'student')::public.user_role`
     - `cpf = new.raw_user_meta_data->>'cpf'`
     - `phone = new.raw_user_meta_data->>'phone'`
   - Restringir roles aceitos pelo cadastro público a `student`, `responsible` e `businessman`; qualquer outro valor deve cair para `student`.
   - Usar `ON CONFLICT (id) DO UPDATE` apenas para campos de cadastro seguros (`email`, `full_name`, `cpf`, `phone`, `updated_at`) e não permitir promover para `admin`.
   - Criar trigger idempotente em `auth.users`:
     - `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`
     - `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();`
   - Adicionar `NOTIFY pgrst, 'reload schema';` ao final.

2. `migrations/002_rls_security.sql`
   - Não adicionar política de `INSERT` público em `public.users` para o browser.
   - Manter `users_update_own` impedindo mudança de `role` pelo próprio usuário.
   - Se necessário, acrescentar comentário no arquivo explicando que criação de perfil é responsabilidade do trigger `SECURITY DEFINER`, não do cliente.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] SQL executa no Supabase sem erro em ambiente de teste.
- [ ] `select tgname from pg_trigger where tgname = 'on_auth_user_created';` retorna o trigger.
- [ ] Cadastro novo cria linha em `public.users` com `role` igual ao papel selecionado permitido.

**Verificação Manual:**
- [ ] Depois de cadastrar atleta, admin enxerga o usuário em `#users` como `student`.
- [ ] Depois de cadastrar responsável/empresário, a navegação inferior usa o menu correto.
- [ ] Tentativa de cadastro com metadata `role = admin` não cria administrador.

### Fase 3: Teste TC001 e Regressão Local

**Objetivo:** Tornar o teste TC001 capaz de provar o comportamento esperado: cadastro válido abre a área autenticada e o dashboard por papel.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py` | Modificar | Substituir asserção fraca por verificações de rota e conteúdo autenticado. |

#### Detalhes de Implementação

1. `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py`
   - Navegar diretamente para `http://localhost:3000/#register` para reduzir dependência de XPath da tela de login.
   - Preferir seletores por `id` existentes:
     - `#reg-name`
     - `#reg-email`
     - `#reg-cpf`
     - `#reg-phone`
     - `#reg-role`
     - `#reg-password`
     - `#register-form button[type="submit"]`
   - Gerar e-mail único por execução, por exemplo com timestamp.
   - Selecionar explicitamente o papel testado. Para TC001, usar `student` como caminho principal, porque é o default atual e o dashboard de atleta já é o fallback.
   - Após submit válido, aguardar `page.wait_for_url("**/#dashboard", timeout=10000)` quando o ambiente tem sessão imediata.
   - Assertar conteúdo da área autenticada, por exemplo ausência do formulário de cadastro e presença de texto do dashboard de atleta.
   - Manter o primeiro submit com CPF inválido se o objetivo for cobrir bloqueio inicial, mas assertar que a tela permanece em `#register` e que o toast de erro aparece antes de prosseguir.
   - Se o ambiente exigir confirmação de e-mail, marcar esse teste como incompatível com dashboard imediato e mover a expectativa para teste de login pós-confirmação.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `python3 testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py` passa com servidor em `http://localhost:3000` e Supabase com sessão imediata.
- [ ] O teste falha se o app terminar em `#login` após cadastro com sessão.
- [ ] O teste falha se o dashboard não renderizar conteúdo autenticado.

**Verificação Manual:**
- [ ] TestSprite registra TC001 como aprovado após reexecução.
- [ ] TC006 continua aprovado para dados inválidos.
- [ ] TC002 e TC003 continuam aprovados para login e roteamento por papel.

### Fase 4: Smoke por Papeis e Segurança

**Objetivo:** Validar que a correção não quebrou o login existente, o fallback de perfil, nem as garantias de RLS sobre papel.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `docs/specs/2026-05-04-tc001-register-role-based-area-spec.md` | Modificar | Atualizar checkboxes/resultados durante a implementação, se a equipe seguir o fluxo de implementação por fases. |

#### Detalhes de Implementação

1. Validação funcional
   - Rodar o servidor local conforme o fluxo atual do projeto, garantindo que esteja acessível em `http://localhost:3000`.
   - Cadastrar um usuário para cada papel público:
     - `student` -> `studentDashboard.render()`.
     - `responsible` -> `responsibleDashboard.render()`.
     - `businessman` -> `responsibleDashboard.render()`.
   - Fazer logout e login com cada usuário para confirmar que o fluxo pós-login continua usando o mesmo papel.

2. Validação de segurança
   - Confirmar que o cliente não grava em `public.users` com chave privilegiada.
   - Confirmar que `users_update_own` ainda bloqueia alteração de `role` pelo próprio usuário.
   - Confirmar que `admin` não pode ser criado por cadastro público.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro.
- [ ] Testes TestSprite TC001, TC002, TC003 e TC006 passam após a mudança.

**Verificação Manual:**
- [ ] Cadastro de atleta cai no dashboard de atleta.
- [ ] Cadastro de responsável cai no dashboard de responsável.
- [ ] Cadastro de empresário cai no dashboard de responsável/empresário.
- [ ] Cadastro sem sessão imediata mostra orientação clara e não fica em loading.
- [ ] Usuário comum não consegue virar admin alterando payload ou perfil.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Supabase retorna `session` no `signUp` | App atualiza usuário local, carrega perfil e abre `#dashboard`. |
| Supabase retorna `user`, mas `session` é `null` | App mostra instrução de login/confirmação e envia para `#login`. |
| Trigger de perfil ainda não executou quando dashboard renderiza | `loadProfile()` usa fallback de `user_metadata.role` e o dashboard correto abre. |
| E-mail já cadastrado | Formulário permanece em `#register`, botão é restaurado e toast mostra erro de Supabase. |
| CPF inválido | Formulário não chama Supabase e exibe erro de CPF. |
| Metadata tenta `role = admin` no cadastro público | Trigger grava `student` ou rejeita o valor, nunca cria admin. |
| `public.users` sem linha para usuário recém-criado | App usa fallback temporário e a correção de banco garante criação nos próximos cadastros. |
| Confirmação de e-mail habilitada | Dashboard imediato não é esperado; TC001 deve ser adaptado ou ambiente deve desabilitar confirmação para esse requisito. |

## Riscos e Mitigações

- Dependência de configuração do Supabase Auth -> Validar explicitamente se o ambiente retorna sessão imediata; ajustar expectativa de TC001 se confirmação de e-mail for obrigatória.
- Trigger com colunas divergentes da tabela real -> Confirmar schema de `public.users` antes de aplicar SQL e usar `CREATE OR REPLACE FUNCTION` compatível.
- Autoelevação por metadata de cadastro -> Whitelist de roles públicos no trigger e manutenção da política `users_update_own`.
- Corrida entre listener `onAuthStateChange` e redirect manual -> Atualizar `app.user` e chamar `loadProfile()` no próprio fluxo de sucesso.
- Teste instável por e-mail reutilizado -> Gerar e-mail único por execução.
- Teste instável por XPath absoluto -> Usar ids existentes da tela de cadastro.

## Rollback

1. Reverter a mudança em `js/app.js` para voltar ao comportamento anterior de toast e `#login` após cadastro.
2. Remover o trigger de banco se necessário:
   - `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`
   - `DROP FUNCTION IF EXISTS public.handle_new_auth_user();`
3. Reverter mudanças no TC001 se a suíte TestSprite for regenerada por outra fonte.
4. Reexecutar TC002 e TC003 para confirmar que login padrão e roteamento por papel voltaram ao estado anterior.

## Checklist Final

- [x] Scope implemented
- [ ] Validation complete
- [ ] Rollback path verified
