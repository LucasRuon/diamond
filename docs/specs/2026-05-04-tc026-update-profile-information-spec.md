---
date: 2026-05-04T12:16:22-03:00
author: Codex
status: draft
ticket: TC026
research: docs/research/2026-05-04-TC026-update-profile-information.md
---

# Spec: Atualizacao de Informacoes do Perfil

**Data**: 2026-05-04
**Estimativa**: Pequena

## Objetivo

Corrigir o fluxo de edicao de perfil para que dados pessoais validos sejam persistidos em `public.users`, a tela de perfil seja atualizada apos salvar, e o usuario receba uma confirmacao visivel compativel com o TC026. O plano tambem ajusta o teste gerado para usar um CPF valido e submeter o formulario uma unica vez, preservando a regra atual de validacao de CPF.

## Escopo

### Incluido
- Manter a validacao de CPF existente em `ui.validate.cpf()`.
- Exibir erro claro quando o CPF informado for invalido no bottom sheet de perfil.
- Normalizar campos de perfil antes do update em Supabase.
- Padronizar a confirmacao de sucesso para `Alteracoes salvas com sucesso`, texto esperado pelo TC026.
- Atualizar o TC026 para usar seletores mais estaveis, CPF valido e apenas um submit.
- Validar sintaxe JavaScript e o fluxo Playwright contra `http://localhost:3000`.

### Nao Incluido
- Remover ou flexibilizar a validacao de CPF.
- Alterar schema de `public.users`.
- Alterar politicas RLS sem evidencia de falha no ambiente remoto.
- Redesenhar a tela de perfil ou o bottom sheet.
- Corrigir outros testes TestSprite, como avatar, reservas, compra de planos ou dashboards.

## Pre-requisitos

- [ ] Servidor local acessivel em `http://localhost:3000`.
- [ ] Conta `luucasruon@gmail.com` autenticavel com senha usada pelo TC026, ou ajuste equivalente de credenciais no teste.
- [ ] Linha correspondente em `public.users` para o usuario de teste.
- [ ] Politica RLS `users_update_own` aplicada no Supabase usado por `js/supabase.js`.
- [ ] Permissao para reexecutar o TC026 contra o Supabase real, sabendo que o teste altera nome, CPF e telefone do usuario.

## Fases de Implementacao

### Fase 1: Feedback e Normalizacao do Formulario

**Objetivo:** Fazer o formulario de edicao de perfil falhar de forma visivel em dados invalidos e enviar ao Supabase apenas valores normalizados.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `js/app.js` | Modificar | Ajustar `showEditProfileForm()` para normalizar payload, emitir toast de CPF invalido e usar mensagem de sucesso esperada. |

#### Detalhes de Implementacao

1. `js/app.js`
   - Dentro de `showEditProfileForm()`, antes da validacao, criar constantes normalizadas:
     - `fullName = data.full_name?.trim() || ''`
     - `cpf = data.cpf?.trim() || null`
     - `phone = data.phone?.trim() || null`
   - Se `fullName` estiver vazio, mostrar `toast.show('Informe o nome completo.', 'error')` e lançar erro para manter o bottom sheet aberto.
   - Trocar a validacao atual para validar `cpf` normalizado:
     - Se `cpf` existir e `!ui.validate.cpf(cpf)`, mostrar `toast.show('CPF invalido.', 'error')` antes de lançar erro.
   - Atualizar `public.users` com `full_name: fullName`, `cpf`, `phone` e `updated_at`.
   - Atualizar Auth metadata com `full_name: fullName`.
   - Trocar `toast.show('Perfil atualizado!')` por `toast.show('Alteracoes salvas com sucesso')`.
   - Preservar `await this.loadProfile()` e `this.render()` apos o update.
   - Preservar o comportamento do `ui.bottomSheet.show()`: fechar apenas quando `onSave` resolver sem erro.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [x] `node --check js/app.js` termina sem erro.
- [x] `node --check js/ui.js` termina sem erro.

**Verificacao Manual:**
- [ ] CPF invalido mantem o bottom sheet aberto e mostra toast de erro.
- [ ] Nome vazio mantem o bottom sheet aberto e mostra toast de erro.
- [ ] Salvar com nome, CPF valido e telefone fecha o bottom sheet.
- [ ] A tela de perfil renderiza nome, CPF e telefone atualizados.
- [ ] A confirmacao visivel contem `Alteracoes salvas com sucesso`.

### Fase 2: Robustez do TC026

**Objetivo:** Fazer o teste representar o comportamento esperado do produto: login, edicao com dados validos, um submit e verificacao da tela atualizada.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `testsprite_tests/TC026_Update_profile_information.py` | Modificar | Substituir CPF invalido, remover submits duplicados e preferir seletores sem XPath absoluto quando possivel. |

#### Detalhes de Implementacao

1. `testsprite_tests/TC026_Update_profile_information.py`
   - Manter a abertura de `http://localhost:3000`.
   - Preferir seletores por `id`, hash ou texto quando existirem:
     - `#login-email`
     - `#login-password`
     - `#login-form button[type="submit"]`
     - `a[href="#profile"]`
     - `#edit-profile-btn`
     - `#edit-profile-form input[name="full_name"]`
     - `#edit-profile-form input[name="cpf"]`
     - `#edit-profile-form input[name="phone"]`
     - `#edit-profile-form button[type="submit"]`
   - Substituir `123.456.789-00` por um CPF valido de teste, por exemplo `529.982.247-25`.
   - Substituir os tres cliques em `SALVAR ALTERACOES` por um unico clique.
   - Apos o submit, aguardar o fechamento de `#sheet-overlay` ou aguardar que ele fique removido/oculto.
   - Assertar que a pagina mostra:
     - `Lucas Silva`
     - `529.982.247-25`
     - `(11) 91234-5678`
     - `Alteracoes salvas com sucesso`
   - Evitar assercoes amplas com `//*[contains(., ...)]` quando houver risco de selecionar o `body`; preferir `page.get_by_text(...).first` ou locators de texto equivalentes do Playwright Python.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [ ] `python3 testsprite_tests/TC026_Update_profile_information.py` passa com o servidor local em `http://localhost:3000`.
- [ ] O teste falha se o nome salvo nao aparecer na tela de perfil.
- [ ] O teste falha se CPF ou telefone continuarem como `Nao informado`.
- [ ] O teste falha se a confirmacao de sucesso nao for exibida.

**Verificacao Manual:**
- [ ] O teste nao fica tentando clicar em botao de formulario depois que o bottom sheet fecha.
- [ ] O usuario de teste permanece autenticado e consegue voltar a `#profile`.
- [ ] Reexecutar o teste nao quebra por causa de dados ja preenchidos no perfil.

### Fase 3: Validacao de Persistencia e RLS

**Objetivo:** Confirmar que a falha original nao vem de politica RLS ou ausencia de linha em `public.users`.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `migrations/002_rls_security.sql` | Modificar somente se necessario | Ajustar ou documentar `users_update_own` apenas se a validacao contra Supabase comprovar bloqueio de update. |

#### Detalhes de Implementacao

1. Validacao no app/Supabase
   - Com o usuario do TC026 autenticado, confirmar que `loadProfile()` encontra uma linha real em `public.users`.
   - Confirmar que o update executado pelo browser retorna sem `error`.
   - Confirmar que o campo `role` nao muda durante o update de perfil.
   - Se o update falhar por RLS:
     - Revisar se `users_update_own` esta aplicada no ambiente remoto.
     - Confirmar que `auth.uid() = users.id` para a linha do usuario.
     - Ajustar a politica somente se a politica aplicada divergir do arquivo local ou bloquear o update legitimo de `full_name`, `cpf` e `phone`.

2. `migrations/002_rls_security.sql`
   - Nao criar politica que permita alterar `role`.
   - Se for necessario mudar a politica, manter `WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()))`.
   - Documentar no comentario da migracao que o fluxo de perfil deve poder alterar apenas dados pessoais do proprio usuario.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [ ] TC026 passa sem usar chave privilegiada no cliente.
- [ ] Uma tentativa manual de alterar `role` pelo cliente continua bloqueada.

**Verificacao Manual:**
- [ ] A linha em `public.users` do usuario de teste contem `full_name`, `cpf`, `phone` e `updated_at` atualizados.
- [ ] O perfil recarregado depois de logout/login ainda mostra os dados salvos.
- [ ] O dashboard por papel continua funcionando apos a edicao de perfil.

### Fase 4: Regressao e Relatorio

**Objetivo:** Fechar a correcao com verificacoes locais e evidencia objetiva para TestSprite.

#### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `testsprite_tests/testsprite-mcp-test-report.md` | Modificar se gerado novamente | Atualizar somente via reexecucao TestSprite, caso o fluxo de testes gere novo relatorio. |
| `testsprite_tests/tmp/raw_report.md` | Modificar se gerado novamente | Atualizar somente via reexecucao TestSprite, caso o fluxo de testes gere novo relatorio. |

#### Detalhes de Implementacao

1. Validacao local
   - Rodar checagem de sintaxe em arquivos JavaScript alterados.
   - Iniciar o app na porta esperada pelo TC026.
   - Executar o TC026 isolado.
   - Se houver acesso ao TestSprite, reexecutar o plano/teste TC026 e comparar o novo resultado com o relatorio anterior.

2. Evidencia
   - Registrar no resultado da implementacao:
     - Comando usado para iniciar o servidor.
     - Comando usado para executar TC026.
     - Resultado observado no perfil.
     - Qualquer diferenca entre ambiente local e TestSprite.

#### Criterios de Sucesso

**Verificacao Automatizada:**
- [ ] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro.
- [ ] `python3 testsprite_tests/TC026_Update_profile_information.py` termina sem erro.
- [ ] Reexecucao TestSprite marca TC026 como aprovado, se o ambiente TestSprite estiver disponivel.

**Verificacao Manual:**
- [ ] Editar perfil pela UI com CPF valido mostra confirmacao.
- [ ] Editar perfil pela UI com CPF invalido mostra erro e nao persiste dados.
- [ ] Apos recarregar a pagina, os dados salvos continuam visiveis.
- [ ] A navegacao inferior e o logout continuam funcionando.

## Edge Cases

| Cenario | Comportamento Esperado |
|---------|------------------------|
| CPF `123.456.789-00` | Rejeitado como CPF invalido, bottom sheet permanece aberto e erro e exibido. |
| CPF vazio | Permitido e salvo como `null`, mantendo CPF opcional. |
| Telefone vazio | Permitido e salvo como `null`, mantendo telefone opcional. |
| Nome com espacos nas pontas | Salvo sem espacos extras. |
| Supabase update retorna erro de RLS | Toast de erro aparece, formulario permanece aberto e nenhum dado local e sobrescrito como sucesso. |
| Auth metadata update falha apos update em `public.users` | Erro deve ser visivel; avaliar compensacao manual porque `public.users` ja pode ter sido atualizado. |
| Teste executado duas vezes | Segunda execucao sobrescreve os mesmos dados e continua passando. |
| Usuario sem linha em `public.users` | `loadProfile()` usa fallback, mas salvar perfil deve falhar de forma visivel ate a linha ser criada. |

## Riscos e Mitigacoes

- Divergencia entre app e teste sobre CPF valido -> manter regra do produto e atualizar o teste para usar dado valido.
- Texto de toast usado por outros testes -> usar uma mensagem mais especifica e compativel com TC026, verificando buscas por `Perfil atualizado!` antes de remover dependencia.
- RLS remoto divergente do arquivo local -> validar contra o Supabase usado pela chave anon antes de alterar migracoes.
- Teste altera dados reais da conta compartilhada -> documentar que TC026 sobrescreve perfil do usuario de teste e usar conta dedicada quando possivel.
- Bottom sheet fecha antes do toast ser observado -> assertar tanto dados persistidos na pagina quanto toast de sucesso.

## Rollback

1. Reverter as alteracoes em `js/app.js` para restaurar o texto `Perfil atualizado!` e a validacao anterior.
2. Reverter as alteracoes em `testsprite_tests/TC026_Update_profile_information.py` para o script gerado original.
3. Se `migrations/002_rls_security.sql` for alterado, aplicar a versao anterior da politica `users_update_own` no Supabase.
4. Restaurar manualmente os dados do usuario de teste em `public.users`, se necessario.

## Checklist Final

- [ ] Scope implemented
- [ ] Validation complete
- [ ] Rollback path verified
