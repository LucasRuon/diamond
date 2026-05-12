---
date: 2026-05-12T10:46:28-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-12-aluno-para-atleta-ocorrencias.md
---

# Spec: Troca De Aluno Para Atleta

**Data**: 2026-05-12
**Estimativa**: Média

## Objetivo

Padronizar a nomenclatura do produto para "Atleta" em todos os textos editáveis e visíveis que ainda usam "Aluno", mantendo estáveis os identificadores técnicos existentes (`student`, `student_id`, `student_documents`, rotas, migrations aplicadas e diretórios). A mudança deve alinhar navegação, formulários, estados vazios, mensagens de erro, comentários técnicos e testes automatizados sem alterar contratos de banco ou RLS.

## Escopo

### Incluído
- Atualizar textos visíveis da área de responsável/empresário que falam de alunos vinculados.
- Atualizar textos visíveis da área administrativa em usuários, dashboard, financeiro, questionários, treinos e fichas.
- Atualizar mensagens de erro, toasts, logs e fallbacks client-side que ainda dizem "Aluno".
- Atualizar comentários técnicos em JS, migrations e Edge Function para a nomenclatura atual.
- Atualizar testes TestSprite afetados pela alteração de textos esperados.
- Fazer bump do cache PWA para forçar atualização dos módulos alterados.

### Não Incluído
- Renomear roles, tabelas, colunas, buckets, RPCs, rotas, diretórios ou nomes de módulos que usam `student`.
- Criar migrations de schema ou data migration.
- Alterar o texto de pesquisas e specs históricas já concluídas em `docs/research/` e `docs/specs/`.
- Redesenhar telas ou alterar fluxo funcional de vínculo, cobrança, presença ou documentos.

## Pré-requisitos

- [ ] Confirmar com o produto que `student` continuará sendo o identificador técnico interno.
- [ ] Confirmar que a mudança deve cobrir textos visíveis, mensagens, testes e comentários, mas não documentação histórica.
- [ ] Servir o app em `http://localhost:3000` antes de executar os testes Playwright.

## Fases de Implementação

### Fase 1: Área De Responsável E Atleta

**Objetivo:** Trocar a nomenclatura nos fluxos de responsável/empresário e nos poucos textos do próprio atleta que ainda usam a palavra antiga.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Atualizar CTA de dependentes e item de navegação `#students`. |
| `js/pages/responsible/students.js` | Modificar | Atualizar tela de vínculos, formulário, mensagens, logs e toasts. |
| `js/pages/responsible/dashboard.js` | Modificar | Atualizar estado vazio e fallback de nome. |
| `js/pages/responsible/trainings.js` | Modificar | Atualizar subtítulo, estados vazios, CTA, erros e fallbacks de reserva. |
| `js/pages/responsible/plans.js` | Modificar | Atualizar comentário e fallback da confirmação de plano ativo. |
| `js/pages/responsible/payments.js` | Modificar | Atualizar comentário de quota por pessoa vinculada. |
| `js/pages/student/trainings.js` | Modificar | Atualizar log de erro de reservas. |
| `js/pages/student/attendance.js` | Modificar | Atualizar comentário de autorização do responsável. |
| `js/planUsage.js` | Modificar | Atualizar comentário do helper de uso de plano. |

#### Detalhes de Implementação

1. `js/app.js`
   - Trocar `GERENCIAR MEUS ALUNOS` por `GERENCIAR MEUS ATLETAS`.
   - Trocar o label da bottom nav do responsável de `Alunos` para `Atletas`.
   - Manter hash `#students`, ícones e lógica de role sem alteração.

2. `js/pages/responsible/students.js`
   - Trocar título `MEUS ALUNOS` por `MEUS ATLETAS`.
   - Trocar carregamento e erro para `atletas vinculados` e `Erro ao carregar atletas.`.
   - Trocar estado vazio para `Você ainda não tem atletas vinculados.`.
   - Trocar instrução do formulário para `Insira o e-mail do atleta...`.
   - Trocar label, botão e bottom sheet para `E-MAIL DO ATLETA`, `VINCULAR ATLETA` e `Vincular Atleta`.
   - Atualizar logs e mensagens:
     - `Tentando vincular atleta com email:`
     - `Erro ao buscar atleta:`
     - `Atleta não encontrado com este e-mail.`
     - `O e-mail informado pertence a um ${role}, não a um atleta.`
     - `Vinculando atleta`
     - `Este atleta já está vinculado a você.`
     - `Atleta ${nome} vinculado!`
   - Não alterar nome de variáveis, tabelas ou payloads (`student`, `student_id`, `responsible_students`).

3. `js/pages/responsible/dashboard.js`
   - Trocar `Nenhum aluno vinculado.` por `Nenhum atleta vinculado.`.
   - Trocar fallback `Aluno sem nome` por `Atleta sem nome`.

4. `js/pages/responsible/trainings.js`
   - Trocar subtítulo para `Reservas dos atletas vinculados`.
   - Trocar erro para `Erro ao carregar atletas vinculados.`.
   - Trocar estado vazio para `Nenhum atleta vinculado.` e CTA `VINCULAR ATLETA`.
   - Trocar fallbacks `Aluno` por `Atleta`.
   - Trocar `Sem reserva dos seus alunos.` por `Sem reserva dos seus atletas.`.

5. `js/pages/responsible/plans.js`, `js/pages/responsible/payments.js`, `js/pages/student/trainings.js`, `js/pages/student/attendance.js` e `js/planUsage.js`
   - Atualizar apenas comentários, logs e fallbacks em português.
   - Preservar nomes técnicos `studentName`, `studentId` e consultas Supabase.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `rg -n -i "alun" js/app.js js/pages/responsible js/pages/student js/planUsage.js` não retorna ocorrências.
- [x] `python3 -m http.server 3000` carrega `http://localhost:3000/#students` sem erro de módulo.

**Verificação Manual:**
- [ ] Responsável vê `Atletas` na bottom nav.
- [ ] Responsável abre `#students` e todos os textos do vínculo usam "Atleta".
- [ ] Responsável sem vínculos vê estado vazio com "atleta".
- [ ] Responsável com reserva vê cards sem fallback "Aluno".

### Fase 2: Área Administrativa

**Objetivo:** Atualizar todos os textos administrativos visíveis para que filtros, formulários, cards e fichas usem "Atleta".

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/admin/users.js` | Modificar | Atualizar filtro, tooltip de fichas e option do role `student`. |
| `js/pages/admin/dashboard.js` | Modificar | Atualizar KPI, atalhos e descrições. |
| `js/pages/admin/charges.js` | Modificar | Atualizar busca, carregamento, formulário e fallbacks de cobrança. |
| `js/pages/admin/preTrainingQuestionnaires.js` | Modificar | Atualizar título, log de erro e fallback de nome. |
| `js/pages/admin/trainings.js` | Modificar | Atualizar bottom sheet de presença manual e fallback de reserva. |
| `js/pages/admin/studentDocuments.js` | Modificar | Atualizar tela de fichas, busca, seleção, badges e upload. |
| `js/studentDocuments.js` | Modificar | Atualizar mensagens de parâmetro ausente. |

#### Detalhes de Implementação

1. `js/pages/admin/users.js`
   - Trocar filtro `Alunos` por `Atletas`.
   - Trocar tooltip `Abrir fichas do aluno` por `Abrir fichas do atleta`.
   - Trocar option visível `<option value="student">Aluno</option>` por `Atleta`.
   - Manter `value="student"` e lógica `user.role === 'student'`.

2. `js/pages/admin/dashboard.js`
   - Trocar KPI `Alunos` por `Atletas`.
   - Trocar descrição de questionários para `Ver respostas de todos os atletas`.
   - Trocar card `Fichas dos alunos` por `Fichas dos atletas`.
   - Trocar descrição de clubes para `Cadastrar logos e vincular atletas`.

3. `js/pages/admin/charges.js`
   - Trocar placeholder para `Buscar por nome do atleta...`.
   - Trocar toast `Carregando alunos...` por `Carregando atletas...`.
   - Trocar label `ALUNO / CLIENTE` por `ATLETA / CLIENTE`.
   - Trocar option vazia para `Selecione um atleta...`.
   - Trocar texto de ajuda para `intenção de cobrança vinculada ao atleta`.
   - Trocar fallbacks `Aluno Removido` e `Aluno` por `Atleta Removido` e `Atleta`.

4. `js/pages/admin/preTrainingQuestionnaires.js`
   - Trocar título para `QUESTIONÁRIOS DOS ATLETAS`.
   - Trocar log para `Erro ao carregar atletas dos questionários:`.
   - Trocar fallback para `Atleta não informado`.

5. `js/pages/admin/trainings.js`
   - Trocar instrução para `Selecione os atletas presentes nesta sessão.`.
   - Trocar carregamento para `Carregando atletas...`.
   - Trocar comentário `Buscar todos os alunos` por `Buscar todos os atletas`.
   - Trocar fallback `Aluno` por `Atleta`.

6. `js/pages/admin/studentDocuments.js`
   - Trocar título para `FICHAS DOS ATLETAS`.
   - Trocar label de busca para `BUSCAR ATLETA`.
   - Trocar carregamento, erro e vazio para `atletas`.
   - Trocar estados `Selecione um aluno`, `Aluno selecionado`, `Aluno não encontrado` por equivalentes com `atleta`.
   - Trocar fallbacks de avatar/nome para `Atleta` e `Atleta sem nome`.
   - Trocar instrução `documento do aluno` por `documento do atleta`.
   - Trocar badges para `VISÍVEL AO ATLETA` e `OCULTO DO ATLETA`.
   - Trocar toast `Selecione um aluno antes de enviar a ficha.` por `Selecione um atleta antes de enviar a ficha.`.
   - Trocar valor padrão `Ficha do aluno` por `Ficha do atleta`.
   - Trocar checkbox `Visível para o aluno` por `Visível para o atleta`.
   - Manter ids/classes com `student-document` para evitar refactor desnecessário.

7. `js/studentDocuments.js`
   - Trocar erros `Aluno não informado.` por `Atleta não informado.`.
   - Não alterar assinatura de funções (`studentId`) nem nomes do bucket/tabela.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `rg -n -i "alun" js/pages/admin js/studentDocuments.js` não retorna ocorrências.
- [x] `python3 -m http.server 3000` carrega `/#users`, `/#payments`, `/#trainings`, `/#student-documents` e `/#dashboard` sem erro de módulo.

**Verificação Manual:**
- [ ] Admin vê filtro `Atletas` em `#users`.
- [ ] Select de papel mostra `Atleta`, mas continua salvando `role: student`.
- [ ] Admin abre `#student-documents` e a tela inteira usa "Atleta".
- [ ] Upload de ficha mantém o tipo `athlete_record` e o título padrão `Ficha do atleta`.
- [ ] Financeiro manual mostra `ATLETA / CLIENTE` e lista usuários de role `student`.

### Fase 3: Comentários Técnicos E Cache PWA

**Objetivo:** Remover a nomenclatura antiga de comentários editáveis e garantir atualização de assets no service worker.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `migrations/002_rls_security.sql` | Modificar | Atualizar comentários de RLS. |
| `migrations/007_student_documents.sql` | Modificar | Atualizar comentário inicial da migration. |
| `migrations/008_clubs_linked_to_students.sql` | Modificar | Atualizar comentário inicial da migration. |
| `migrations/009_activate_student_plan_rpc.sql` | Modificar | Atualizar comentário sobre planos ativos. |
| `supabase/functions/admin-update-user/index.ts` | Modificar | Atualizar comentário de `club_id`. |
| `service-worker.js` | Modificar | Incrementar cache e versionar módulos JS alterados. |

#### Detalhes de Implementação

1. Comentários em migrations e Edge Function
   - Trocar referências em português para "atleta/atletas".
   - Não alterar nomes de tabelas, policies, constraints, funções, buckets ou roles.
   - Não criar nova migration apenas para comentário.

2. `service-worker.js`
   - Incrementar `CACHE_NAME` de `diamondx-v14` para `diamondx-v15`.
   - Atualizar entradas de assets JS afetados:
     - `/js/app.js?v=15`
     - `/js/studentDocuments.js?v=15`
     - adicionar ou versionar os módulos admin/responsible/student alterados quando já estiverem no precache.
   - Como o fetch de `.js` é network-first, o bump é principalmente para limpar caches antigos e reduzir risco em PWA instalada.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `rg -n -i "alun" migrations supabase/functions/admin-update-user/index.ts` não retorna ocorrências.
- [x] `rg -n "diamondx-v15|app.js\\?v=15|studentDocuments.js\\?v=15" service-worker.js` confirma o bump.
- [ ] `deno check supabase/functions/admin-update-user/index.ts` passa, ou registra bloqueio de configuração se faltar `Deno`/imports remotos.

**Verificação Manual:**
- [ ] Abrir `http://localhost:3000/service-worker.js` mostra `diamondx-v15`.
- [ ] Em navegador com PWA já carregada, recarregar e confirmar que labels alterados aparecem.

### Fase 4: Testes E Varredura Final

**Objetivo:** Atualizar testes que validam textos antigos e fechar a implementação com busca objetiva por ocorrências restantes.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `testsprite_tests/TC034_Admin_upload_student_ficha_document.py` | Modificar | Atualizar mocks, asserts e dados visíveis para "Atleta". |
| `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py` | Modificar | Atualizar docstring, comentários e mensagem final. |

#### Detalhes de Implementação

1. `testsprite_tests/TC034_Admin_upload_student_ficha_document.py`
   - Trocar mock de `aluno@example.com` para `atleta@example.com`.
   - Trocar `Aluno Teste` por `Atleta Teste`.
   - Trocar assert `FICHAS DOS ALUNOS` por `FICHAS DOS ATLETAS`.
   - Trocar assert `VISÍVEL AO ALUNO` por `VISÍVEL AO ATLETA`.
   - Manter role `student`, tabela `student_documents` e rota `#student-documents`.

2. `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py`
   - Trocar docstring e comentários para `atleta`.
   - Trocar mensagem final para `TC035 passou: clube criado e vinculado ao atleta com sucesso.`.
   - Manter variáveis `STUDENT_EMAIL`, `STUDENT_PASSWORD` e a rota `#users`, porque representam contrato técnico existente do teste.

3. Varredura final
   - Executar busca ampla no código ativo e testes:

```bash
rg -n -i "alun" js migrations supabase/functions testsprite_tests
```

   - Esperado: zero ocorrências.
   - Executar busca separada em documentação para confirmar que sobram apenas arquivos históricos fora do escopo:

```bash
rg -n -i "alun" docs README.md "spec (1).md" spec-alteracoes-diamond-x.md
```

   - Esperado: ocorrências apenas em documentação histórica ou nesta spec, se houver.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `python3 testsprite_tests/TC034_Admin_upload_student_ficha_document.py` passa com o app servido em `http://localhost:3000`.
- [ ] `python3 testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py` passa quando credenciais e Supabase alvo estiverem configurados.
- [ ] `rg -n -i "alun" js migrations supabase/functions testsprite_tests` retorna zero ocorrências.

**Verificação Manual:**
- [ ] Navegar como admin, responsável e atleta e confirmar que textos visíveis usam "Atleta".
- [ ] Validar que cadastro/login/perfil ainda reconhecem `student` como papel de atleta.
- [ ] Validar que documentos, planos, cobranças e presença continuam carregando dados existentes.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Usuário com role interno `student` | UI exibe `Atleta`, sem alterar role salvo no banco. |
| Responsável sem vínculos | Estado vazio informa que não há atletas vinculados. |
| Responsável tenta vincular e-mail de outro papel | Erro informa que o e-mail não pertence a um atleta. |
| Documento sem usuário associado | Fallback exibe `Atleta não informado` ou `Atleta sem nome`. |
| Cobrança de usuário removido | Card exibe `Atleta Removido`. |
| PWA instalada com cache antigo | Novo cache `diamondx-v15` força atualização dos assets versionados. |
| Busca por ocorrências em docs históricas | Ocorrências antigas podem permanecer fora do escopo sem bloquear release. |

## Riscos e Mitigações

- Renomear identificadores técnicos pode quebrar RLS, tabelas e testes -> manter `student` e `student_id` intactos.
- Trocar textos de testes sem atualizar mocks pode gerar falso negativo -> atualizar mock e asserts no mesmo arquivo.
- Service worker pode servir JS antigo em PWA instalada -> fazer bump de `CACHE_NAME` e versionar assets críticos.
- Busca `rg -i "alun"` pode encontrar documentação histórica -> separar validação de código ativo da validação documental.
- Mensagens com gênero/artigo podem ficar estranhas em contexto de plural -> revisar manualmente telas de responsável, admin e documentos.

## Rollback

1. Reverter as alterações nos arquivos JS, migrations de comentário, Edge Function, service worker e testes desta spec.
2. Se o cache `diamondx-v15` já tiver sido publicado, fazer novo bump de `CACHE_NAME` para uma versão posterior no rollback.
3. Não há rollback de banco, porque não há alteração de schema, policy ou dados.

## Checklist Final

- [ ] Scope implemented
- [ ] Validation complete
- [ ] Rollback path verified
