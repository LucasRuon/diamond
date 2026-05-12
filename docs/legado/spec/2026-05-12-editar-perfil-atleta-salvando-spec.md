---
date: 2026-05-12T11:45:22-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-12-editar-perfil-atleta-salvando.md
---

# Spec: Correção Do Perfil Do Atleta Preso Em Salvando

**Data**: 2026-05-12
**Estimativa**: Média

## Objetivo

Corrigir os fluxos de edição do perfil do atleta para que o botão não fique indefinidamente em `SALVANDO...` quando uma chamada Supabase não responde, mantendo a persistência em `public.users`, feedback visível em português e fechamento do bottom sheet somente quando a operação principal termina com sucesso.

## Escopo

### Incluído
- Adicionar timeout controlado ao cliente Supabase usado pela SPA.
- Tratar timeout e falhas de rede como erros recuperáveis, permitindo que o bottom sheet restaure o botão.
- Tornar a sincronização de metadados do Supabase Auth no perfil do atleta não bloqueante depois que `public.users` foi atualizado.
- Revisar o fluxo "Ficha do Atleta" para usar a mesma semântica de erro e sucesso do perfil pessoal.
- Revisar o fluxo admin de edição de usuário atleta para exibir erro quando a Edge Function ou o reload da lista falhar.
- Incrementar cache PWA para entregar os módulos corrigidos.
- Validar com checagem de sintaxe, `deno check` da função alterada se aplicável, TC026 e QA manual de timeout.

### Não Incluído
- Alterar schema de `public.users`.
- Alterar políticas RLS sem evidência remota de bloqueio legítimo.
- Trocar edição de perfil do atleta para Edge Function.
- Redesenhar perfil, ficha do atleta, tela admin de usuários ou bottom sheet.
- Corrigir testes TestSprite não relacionados a perfil/usuários.
- Investigar logs remotos do Supabase além do necessário para confirmar timeout, RLS ou função desatualizada.

## Pré-requisitos

- [ ] Servir a SPA em `http://localhost:3000` antes de executar o TC026.
- [ ] Ter usuário atleta autenticável com linha correspondente em `public.users`.
- [ ] Confirmar que a policy `users_update_own` está aplicada no Supabase alvo.
- [ ] Ter usuário admin válido para QA manual em `#users`, se o fluxo admin for validado.
- [ ] Saber que o TC026 altera nome, CPF e telefone do usuário de teste.

## Fases de Implementação

### Fase 1: Timeout No Cliente Supabase

**Objetivo:** Garantir que chamadas Supabase feitas pela SPA falhem de forma controlada em vez de manterem promises pendentes e o botão em `SALVANDO...`.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/supabase.js` | Modificar | Criar fetch com timeout e passá-lo ao `createClient`. |

#### Detalhes de Implementação

1. `js/supabase.js`
   - Declarar `const SUPABASE_REQUEST_TIMEOUT_MS = 20000;`.
   - Criar `function createTimeoutError()` que retorna `new Error('Tempo limite excedido ao comunicar com o servidor.')` e define `error.name = 'TimeoutError'`.
   - Criar `async function fetchWithTimeout(input, init = {})`.
   - Dentro do helper:
     - criar `AbortController`;
     - respeitar `init.signal` quando já existir, propagando aborts externos;
     - abortar após `SUPABASE_REQUEST_TIMEOUT_MS`;
     - chamar `fetch(input, { ...init, signal: controller.signal })`;
     - limpar o timer no `finally`;
     - quando a falha for abort por timeout, lançar o erro normalizado.
   - Instanciar o cliente como:

```js
export const supabase = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { fetch: fetchWithTimeout }
    })
    : null;
```

   - Não alterar URL, anon key ou nomes exportados.
   - Manter logs atuais de inicialização.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/supabase.js` termina sem erro.
- [x] `node --check js/app.js` continua sem erro.

**Verificação Manual:**
- [ ] Com rede normal, login e carregamento do perfil continuam funcionando.
- [ ] Simulando Supabase sem resposta no DevTools/Network, o submit do perfil volta do estado `SALVANDO...` em até 20 segundos.
- [ ] O console mostra erro de timeout legível, sem loop de submits.

### Fase 2: Robustez Do Perfil E Ficha Do Atleta

**Objetivo:** Fazer a edição do atleta concluir com base na atualização de `public.users`, sem ficar bloqueada por metadados do Auth ou reload auxiliar.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Ajustar `showEditProfileForm()` e `showEditAnamneseForm()` para tratar falhas bloqueantes e não bloqueantes explicitamente. |

#### Detalhes de Implementação

1. `js/app.js` em `showEditProfileForm()`
   - Preservar normalização atual de `fullName`, `cpf` e `phone`.
   - Manter validações atuais:
     - nome obrigatório;
     - CPF opcional, mas válido quando informado.
   - Manter o update principal em `public.users` como etapa bloqueante.
   - Se o update principal retornar erro, manter `toast.show('Erro ao atualizar: ' + error.message, 'error')` e `throw error`.
   - Trocar o `await supabase.auth.updateUser(...)` direto por bloco não bloqueante:
     - executar em `try/catch`;
     - se retornar `{ error }`, lançar dentro do bloco para cair no `catch`;
     - no `catch`, usar `console.warn('Perfil salvo, mas metadados do Auth nao foram sincronizados:', err);`;
     - não relançar, porque `public.users` é a fonte exibida em `#profile`.
   - Depois do update principal, atualizar `this.profile` de forma otimista com `full_name`, `cpf`, `phone` e `updated_at` antes do reload, reduzindo risco de tela antiga se o reload cair no fallback.
   - Manter `toast.show('Alteracoes salvas com sucesso')`.
   - Manter `await this.loadProfile()`; com o timeout da Fase 1, essa etapa não deve ficar pendente indefinidamente.
   - Chamar `this.render()` após o reload.

2. `js/app.js` em `showEditAnamneseForm()`
   - Manter o update de `birth_date`, `weight_kg`, `height_cm`, `athlete_record_url` e `updated_at` como etapa bloqueante.
   - Após sucesso, mesclar `updateData` em `this.profile` antes de `await this.loadProfile()`.
   - Se o update retornar erro, manter toast de erro e relançar.
   - Se `loadProfile()` cair em fallback por timeout ou relação de clube, o usuário ainda deve ver a ficha recém-salva a partir do merge otimista quando possível.
   - Não permitir edição de `club_id` pelo atleta.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/app.js` termina sem erro.
- [x] `python3 testsprite_tests/TC026_Update_profile_information.py` passa com a SPA em `http://localhost:3000`.

**Verificação Manual:**
- [ ] Salvar perfil com nome, CPF válido e telefone fecha o bottom sheet.
- [ ] Nome, CPF e telefone atualizados aparecem na tela do perfil.
- [ ] Forçar falha em `auth.updateUser` não impede o fechamento do bottom sheet quando `public.users` foi atualizado.
- [ ] Forçar falha no update de `public.users` mantém o bottom sheet aberto, restaura o botão e mostra erro.
- [ ] Salvar "Ficha do Atleta" atualiza data, peso, altura e link sem alterar clube vinculado.

### Fase 3: Fluxo Admin De Edição De Usuário

**Objetivo:** Evitar que a edição admin de atleta fique sem resposta quando a Edge Function demora, falha ou retorna corpo de erro.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/admin/users.js` | Modificar | Tratar timeout/erro de `admin-update-user` e reload da lista com feedback claro. |
| `supabase/functions/admin-update-user/index.ts` | Modificar se necessário | Adicionar timeouts internos apenas se o QA confirmar que a função implantada fica pendente. |

#### Detalhes de Implementação

1. `js/pages/admin/users.js`
   - Manter validações atuais de nome e CPF.
   - Após `supabase.functions.invoke('admin-update-user', ...)`, continuar tratando:
     - `error`;
     - `responseData?.error`;
     - `responseData?.metadataWarning`.
   - Normalizar mensagem de timeout/abort para `Tempo limite excedido ao atualizar usuário. Tente novamente.`.
   - Em sucesso, trocar `this.loadUsers(this.currentRoleFilter || 'all');` por:

```js
try {
    await this.loadUsers(this.currentRoleFilter || 'all');
} catch (reloadError) {
    console.warn('Usuário salvo, mas a lista não foi recarregada:', reloadError);
}
```

   - Não relançar erro de reload depois que a função retornou sucesso, para não manter o bottom sheet aberto apesar do usuário já ter sido salvo.

2. `supabase/functions/admin-update-user/index.ts`
   - Só alterar se a reprodução indicar que a Edge Function fica pendente no ambiente alvo mesmo com o timeout do cliente.
   - Se necessário, criar helper `withTimeout<T>(promise, ms, message)` para as chamadas críticas:
     - `userClient.auth.getUser()`;
     - select do perfil admin;
     - select de clube;
     - update de `users`;
     - `adminClient.auth.admin.updateUserById`.
   - Retornar JSON com status `504` e mensagem `Tempo limite excedido ao atualizar o usuario.` quando o helper expirar.
   - Preservar CORS, validação de admin e uso de service role.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/pages/admin/users.js` termina sem erro.
- [ ] Se a função for alterada, `deno check supabase/functions/admin-update-user/index.ts` termina sem erro.

**Verificação Manual:**
- [ ] Admin edita um atleta e vê `Usuário atualizado com sucesso!`.
- [ ] Se a função retornar erro, o bottom sheet permanece aberto e o botão volta ao texto original.
- [ ] Se a função exceder timeout no cliente, o usuário vê mensagem de tempo limite.
- [ ] Se apenas o reload da lista falhar depois do sucesso, o bottom sheet fecha e o console registra o aviso.

### Fase 4: Cache PWA E Testes De Regressão

**Objetivo:** Garantir que navegadores e PWA recebam os módulos corrigidos e que o comportamento seja validado com teste automatizado e QA manual.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `service-worker.js` | Modificar | Incrementar `CACHE_NAME` e versionar módulos alterados. |
| `testsprite_tests/TC026_Update_profile_information.py` | Modificar se necessário | Ajustar apenas se o teste não cobrir o comportamento corrigido. |
| `testsprite_tests/TC037_Profile_save_timeout.py` | Criar | Teste opcional para simular request pendente/timeout no submit do perfil. |

#### Detalhes de Implementação

1. `service-worker.js`
   - Incrementar `CACHE_NAME` de `diamondx-v15` para `diamondx-v16`.
   - Versionar assets alterados:
     - `/js/supabase.js?v=16`;
     - `/js/app.js?v=16`;
     - `/js/pages/admin/users.js?v=16`;
     - manter demais versões existentes se não forem alteradas.
   - Confirmar que o evento `activate` remove caches antigos.

2. `testsprite_tests/TC026_Update_profile_information.py`
   - Manter se já passa com:
     - CPF válido;
     - um único submit;
     - espera por `#sheet-overlay` oculto;
     - asserts de nome, CPF, telefone e `Alteracoes salvas com sucesso`.
   - Ajustar somente se seletores ou tempos precisarem refletir o timeout novo.

3. `testsprite_tests/TC037_Profile_save_timeout.py` opcional
   - Criar apenas se houver tempo para cobrir timeout de forma determinística.
   - Usar Playwright para autenticar, abrir `#profile`, preencher o formulário e interceptar a chamada Supabase de update de `users` com uma resposta pendente ou abortada.
   - Para manter o teste rápido, permitir configurar o timeout por query/env somente em ambiente de teste, ou validar falha abortada em vez de aguardar 20 segundos.
   - Assertar que o botão volta para `SALVAR ALTERAÇÕES` e o bottom sheet permanece aberto.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/supabase.js js/app.js js/pages/admin/users.js service-worker.js` termina sem erro.
- [x] `python3 testsprite_tests/TC026_Update_profile_information.py` passa.
- [ ] Se criado, `python3 testsprite_tests/TC037_Profile_save_timeout.py` passa.

**Verificação Manual:**
- [ ] Em uma aba limpa, `http://localhost:3000/#profile` carrega os módulos novos.
- [ ] Em navegador que já tinha PWA/cache, recarregar ativa `diamondx-v16`.
- [ ] O fluxo reportado não fica em `SALVANDO...` sem feedback.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Supabase REST não responde | Request é abortada após 20 segundos, botão volta ao normal e o usuário recebe erro. |
| Update em `public.users` salva, mas Auth metadata falha | Perfil fecha com sucesso, console registra warning e dados exibidos vêm de `public.users`. |
| Update em `public.users` falha por RLS | Bottom sheet permanece aberto, botão é restaurado e toast mostra erro. |
| `loadProfile()` falha após salvar | Timeout impede travamento; merge otimista mantém dados recém-salvos sempre que possível. |
| Atleta tenta alterar clube pela ficha | Campo continua somente leitura; `club_id` não é enviado pelo fluxo do atleta. |
| Admin edita atleta e função retorna `metadataWarning` | Usuário é considerado salvo; warning fica no console. |
| Admin salva, mas reload da lista falha | Bottom sheet fecha, toast de sucesso permanece e o erro de reload fica no console. |
| Usuário clica submit repetidamente | Botão desabilitado impede submissões concorrentes durante a tentativa ativa. |

## Riscos e Mitigações

- Timeout global pode abortar operações legítimas em rede muito lenta -> usar 20 segundos, mensagem clara e permitir nova tentativa.
- Abortar fetch não cancela necessariamente uma operação já recebida pelo servidor -> manter updates idempotentes e não disparar submits paralelos.
- Ignorar falha de Auth metadata pode deixar `user_metadata.full_name` desatualizado -> mitigado porque o app carrega `public.users`; registrar warning para diagnóstico.
- Cache PWA pode manter versão antiga do `supabase.js` -> bump obrigatório de `CACHE_NAME` e query string dos módulos alterados.
- Alterar Edge Function sem reproduzir pendência pode aumentar escopo -> deixar mudança da função condicionada a evidência de timeout interno.

## Rollback

1. Reverter alterações em `js/supabase.js`, removendo `fetchWithTimeout` e voltando ao `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`.
2. Reverter alterações em `js/app.js` e `js/pages/admin/users.js`.
3. Se alterada, redeploy da versão anterior de `supabase/functions/admin-update-user/index.ts`.
4. Reverter `service-worker.js` para o `CACHE_NAME` e versões anteriores.
5. Não há rollback de dados previsto; os updates mantêm o mesmo schema e as mesmas tabelas.

## Checklist Final

- [x] Timeout do cliente Supabase implementado.
- [x] Edição de perfil pessoal do atleta salva e fecha corretamente.
- [ ] Edição da ficha do atleta salva e fecha corretamente.
- [x] Fluxo admin de edição de usuário tratado para timeout/erro.
- [x] Cache PWA atualizado.
- [x] TC026 executado com sucesso.
- [ ] QA manual de timeout concluído.
- [ ] Rollback path verified.
