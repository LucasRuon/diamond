---
date: 2026-05-04T12:16:21-03:00
author: Codex
status: draft
ticket: TC005
research: docs/research/2026-05-04-TC005-registration-flow.md
---

# Spec: Fluxo de Cadastro TC005

**Data**: 2026-05-04
**Estimativa**: Média

## Objetivo

Corrigir e validar o fluxo de cadastro de novo atleta para que, quando o Supabase retornar sessão imediata após `signUp`, a SPA inicialize o usuário autenticado, abra a área correta do papel selecionado e deixe o teste TC005 verificar um indicador confiável de autenticação. O plano também elimina o estado indefinido de "Carregando informações..." no dashboard do atleta quando consultas auxiliares falham.

## Escopo

### Incluído
- Validar o fluxo pós-cadastro em `js/app.js` para sucesso com sessão e sucesso sem sessão.
- Garantir que o dashboard do atleta renderize conteúdo final ou estado vazio mesmo quando planos, frequência, próximo treino ou responsável não carregarem.
- Atualizar o TC005 para usar seletores estáveis, e-mail único e uma asserção compatível com a navegação real do produto.
- Confirmar que o cadastro público continua restrito aos papéis `student`, `responsible` e `businessman`.

### Não Incluído
- Criar fluxo de administrador por cadastro público.
- Exigir que o botão de logout apareça no dashboard inicial; `SAIR DA CONTA` continua pertencendo ao perfil.
- Alterar políticas RLS ou schema do Supabase, salvo se a validação revelar erro externo ao frontend.
- Reescrever toda a suíte TestSprite gerada.
- Redesenhar a tela de login, cadastro ou dashboard.

## Pré-requisitos

- [ ] Servidor local disponível em `http://localhost:3000`.
- [ ] Supabase Auth configurado para retornar sessão imediata no cadastro usado pelo TC005; se confirmação de e-mail estiver habilitada, a expectativa de entrar direto na área autenticada deve ser revista.
- [ ] E-mail de cadastro único por execução do teste.
- [ ] CPF matematicamente válido para o cadastro, como `111.444.777-35`.
- [ ] Confirmar se a implementação prévia de `handleRegistrationSuccess()` em `js/app.js` está presente na branch antes de iniciar.

## Fases de Implementação

### Fase 1: Confirmar Contrato Pós-Cadastro

**Objetivo:** Fazer o submit de cadastro ter comportamento determinístico para Supabase com sessão imediata e sem sessão imediata.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Revisar `handleRegistrationSuccess()` e o submit de `#register-form` para garantir redirect correto e estado local autenticado. |

#### Detalhes de Implementação

1. `js/app.js`
   - Manter ou ajustar `async handleRegistrationSuccess(result)` como ponto único de decisão após `auth.register()`.
   - Ler sessão em duas fontes:
     - `result?.session`
     - `await supabase.auth.getSession()` logo após o `signUp`
   - Quando houver `session.user`:
     - Definir `this.user = session.user`.
     - Chamar `await this.loadProfile()`.
     - Exibir `Conta criada com sucesso!`.
     - Navegar para `#dashboard`.
     - Se a hash já for `#dashboard`, chamar `await this.render()` para evitar tela parada.
   - Quando não houver sessão:
     - Limpar `this.user` e `this.profile`.
     - Exibir `Conta criada! Verifique seu e-mail ou faça login para continuar.`
     - Navegar para `#login`.
   - No handler de `#register-form`, garantir que o caminho de sucesso chame apenas `await this.handleRegistrationSuccess(result)`.
   - Preservar validação local de CPF antes de chamar Supabase.
   - No `finally`, restaurar o botão somente se `btn.isConnected`, porque o redirect pode trocar a tela.
   - Remover ou reduzir `console.log` de cadastro caso estejam poluindo a saída do teste; manter `console.error` em falhas reais.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `node --check js/app.js` termina sem erro.
- [ ] Cadastro com resposta contendo sessão leva a `window.location.hash === '#dashboard'`.
- [ ] Cadastro com resposta sem sessão leva a `window.location.hash === '#login'`.

**Verificação Manual:**
- [ ] Com e-mail único e CPF válido, o usuário entra no dashboard quando o Supabase retorna sessão.
- [ ] Com confirmação de e-mail habilitada, o usuário é orientado a confirmar/login e não fica em loading.
- [ ] CPF inválido continua exibindo `CPF Inválido. Por favor, verifique.` antes de qualquer chamada ao Supabase.

### Fase 2: Finalizar Estado do Dashboard do Atleta

**Objetivo:** Impedir que o dashboard autenticado do atleta permaneça indefinidamente em "Carregando informações..." após o cadastro.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/student/dashboard.js` | Modificar | Adicionar tratamento de erro e estados vazios nas consultas assíncronas do dashboard do atleta. |

#### Detalhes de Implementação

1. `js/pages/student/dashboard.js`
   - Em `render()`, continuar exibindo cabeçalho `OLÁ, ...` e `Painel do Atleta`.
   - Ajustar `loadStatus()` para envolver as consultas de `student_plans` e `attendance` em `try/catch`.
   - Em erro de plano/frequência:
     - Logar `console.error('Erro ao carregar status do atleta:', error)`.
     - Substituir o loading por cards de estado vazio, por exemplo `NENHUM PLANO` e `0 treinos`, sem quebrar a tela.
   - Ajustar `loadNextTraining()` para capturar erros de `training_sessions`.
     - Se não houver treino futuro ou houver erro, renderizar estado vazio discreto em `#next-training-area` em vez de deixar comentário vazio se isso dificultar a verificação.
   - Ajustar `loadResponsible()` para capturar erro de `responsible_students`.
     - Ausência de responsável vinculado deve ser tratada como estado normal, sem toast de erro.
   - Usar `escapeHtml()` para qualquer valor vindo de Supabase ou metadata que seja inserido no HTML.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `node --check js/pages/student/dashboard.js` termina sem erro.
- [ ] Simulando erro nas queries auxiliares, `#student-status-area` não mantém o texto `Carregando informações...`.

**Verificação Manual:**
- [ ] Após cadastro de atleta, o dashboard mostra `Painel do Atleta` e um estado final de plano/frequência.
- [ ] Falha em plano, frequência, treino futuro ou responsável não derruba a página.
- [ ] Login de atleta existente continua abrindo o mesmo dashboard.

### Fase 3: Corrigir Asserção do TC005

**Objetivo:** Transformar o TC005 em uma verificação confiável do comportamento descrito: cadastro válido entra na área autenticada correta.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `testsprite_tests/TC005_Register_a_new_account_and_enter_the_correct_area.py` | Modificar | Trocar XPath frágil, e-mail fixo e cliques repetidos por fluxo direto e asserções estáveis. |

#### Detalhes de Implementação

1. `testsprite_tests/TC005_Register_a_new_account_and_enter_the_correct_area.py`
   - Navegar diretamente para `http://localhost:3000/#register` ou clicar no link apenas se o objetivo for cobrir a entrada pela tela de login.
   - Preferir seletores existentes por ID:
     - `#reg-name`
     - `#reg-email`
     - `#reg-cpf`
     - `#reg-phone`
     - `#reg-role`
     - `#reg-password`
     - `#register-form button[type="submit"]`
   - Gerar e-mail único por execução, por exemplo `tc005+{timestamp}@example.com`, para evitar falha por usuário já existente.
   - Selecionar explicitamente `student` no `#reg-role`.
   - Remover os cliques repetidos em `CADASTRAR` depois do primeiro submit; após sucesso, o formulário pode não existir mais.
   - Após submit, aguardar `page.wait_for_url("**/#dashboard", timeout=10000)` quando o ambiente tiver sessão imediata.
   - Assertar indicadores da área de atleta:
     - URL contém `#dashboard`.
     - Texto `Painel do Atleta` está visível.
     - Texto `Perfil` está visível na navegação autenticada.
   - Se for necessário manter a verificação de logout, clicar em `a[href="#profile"]` e então assertar `SAIR DA CONTA` visível no perfil. Não exigir `Sair` no dashboard, porque esse não é o contrato atual da UI.
   - Se o Supabase retornar sucesso sem sessão, o teste deve falhar com mensagem explícita informando que o ambiente exige confirmação de e-mail e não satisfaz o TC005.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `python3 testsprite_tests/TC005_Register_a_new_account_and_enter_the_correct_area.py` passa com Supabase retornando sessão imediata.
- [ ] O teste falha se o app redirecionar para `#login` após cadastro com sessão.
- [ ] O teste falha se o dashboard do atleta não renderizar `Painel do Atleta`.

**Verificação Manual:**
- [ ] TestSprite marca TC005 como aprovado após reexecução.
- [ ] O teste não cria múltiplas submissões para o mesmo usuário.
- [ ] A falha por e-mail já cadastrado deixa de ocorrer em execuções repetidas.

### Fase 4: Regressão de Papéis e Segurança

**Objetivo:** Garantir que a correção do TC005 não quebre login, roteamento por papel ou restrição de criação de administradores.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Ajustes finais se a validação de papéis revelar divergência no fallback de perfil. |
| `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py` | Modificar | Opcional: alinhar asserções com o padrão estabilizado no TC005 se ainda estiverem fracas. |

#### Detalhes de Implementação

1. Validação funcional
   - Cadastrar contas com `student`, `responsible` e `businessman`.
   - Confirmar que:
     - `student` abre `studentDashboard.render()`.
     - `responsible` abre `responsibleDashboard.render()`.
     - `businessman` usa a mesma área de responsável/empresário.
   - Fazer logout/login com cada usuário para confirmar que a sessão persistida continua roteando corretamente.

2. Validação de segurança
   - Confirmar que `#reg-role` não oferece `admin`.
   - Confirmar que `loadProfile()` usa `user_metadata.role` apenas como fallback quando a linha em `public.users` não está disponível.
   - Confirmar que nenhuma mudança introduz escrita privilegiada no cliente.
   - Se houver trigger de criação de perfil no Supabase, confirmar que metadata `role = admin` forjada não promove usuário comum.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro.
- [ ] TC001, TC004, TC005 e TC006 passam na suíte local ou no TestSprite.

**Verificação Manual:**
- [ ] Cadastro de atleta cai no dashboard de atleta.
- [ ] Cadastro de responsável cai na área de responsável.
- [ ] Cadastro de empresário cai na área de empresário/responsável.
- [ ] Usuário autenticado que acessa `#register` é redirecionado para `#dashboard`.
- [ ] Usuário comum não consegue criar conta `admin` pelo formulário público.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Supabase retorna sessão no `signUp` | App define `app.user`, carrega perfil e abre `#dashboard`. |
| Supabase retorna `session: null` por confirmação de e-mail | App mostra orientação e abre `#login`; TC005 deve registrar incompatibilidade de ambiente. |
| Linha em `public.users` ainda não existe | `loadProfile()` usa `user_metadata.role` e `user_metadata.full_name` como fallback. |
| Consultas do dashboard falham por RLS/schema/dados vazios | Dashboard renderiza estado vazio e remove `Carregando informações...`. |
| E-mail já cadastrado | Teste usa e-mail único; app mostra erro do Supabase sem múltiplos submits. |
| Clique repetido no submit | Botão desabilitado durante criação e teste não tenta reenviar após navegação. |
| Teste procura `Sair` no dashboard | Teste deve navegar ao perfil antes de assertar `SAIR DA CONTA`, ou usar `Perfil`/`Painel do Atleta` como indicador autenticado. |
| Role alterado manualmente para `admin` no payload | Cadastro público não deve promover usuário para administrador. |

## Riscos e Mitigações

- Ambiente Supabase com confirmação de e-mail habilitada -> TC005 não pode exigir dashboard imediato; documentar pré-requisito ou ajustar expectativa para login pós-confirmação.
- Teste usar e-mail fixo real já cadastrado -> gerar e-mail único por execução.
- `onAuthStateChange` e redirect manual competirem -> centralizar decisão em `handleRegistrationSuccess()` e renderizar quando a hash já for `#dashboard`.
- Dashboard continuar em loading por erro silencioso -> adicionar `try/catch` e estados vazios em cada consulta auxiliar.
- Ajustar a UI para satisfazer literalmente `Sair` no dashboard pode piorar o produto -> manter logout no perfil e corrigir o teste para validar o contrato real.
- Metadata de role vinda do cliente pode ser forjada -> restringir opções de UI e validar no backend/trigger quando existir criação de perfil.

## Rollback

1. Reverter alterações em `js/app.js` para o comportamento anterior de sucesso pós-cadastro.
2. Reverter alterações em `js/pages/student/dashboard.js` se os estados vazios causarem regressão visual.
3. Reverter `testsprite_tests/TC005_Register_a_new_account_and_enter_the_correct_area.py` para a versão anterior se for necessário reproduzir o relatório original.
4. Nenhuma migração de dados é prevista neste plano; se uma validação externa de Supabase for alterada manualmente, documentar e reverter pelo Dashboard/SQL Editor.

## Checklist Final

- [ ] Scope implemented
- [ ] Validation complete
- [ ] Rollback path verified
