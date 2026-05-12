---
date: 2026-05-12T10:34:47-03:00
researcher: Codex
git_commit: d9bd67a780448780f1941298626a3b42f9858afc
branch: work
repository: Diamond
topic: "$research-codebase pesquise todos os lugares do projeto que falam sobre \"Aluno\", por favor. Precisamos alterar de Aluno para Atleta, em todos os campos."
tags: [research, codebase]
status: complete
last_updated: 2026-05-12
last_updated_by: Codex
---

# Research: ocorrências de "Aluno" para troca por "Atleta"

**Date**: 2026-05-12T10:34:47-03:00
**Researcher**: Codex
**Git Commit**: d9bd67a780448780f1941298626a3b42f9858afc
**Branch**: work
**Repository**: Diamond

## Research Question

$research-codebase pesquise todos os lugares do projeto que falam sobre "Aluno", por favor. Precisamos alterar de Aluno para Atleta, em todos os campos.

## Scope

Inclui busca no codebase local por `alun` em arquivos de front-end, migrations, Supabase Edge Functions, testes TestSprite, specs e pesquisas existentes. A busca excluiu diretórios de fontes e bytecode Python (`Montserrat-Full-Version/**`, `**/__pycache__/**`) porque não representam texto editável da aplicação. Esta pesquisa documenta ocorrências atuais; nenhuma alteração de nomenclatura foi aplicada.

## Summary

A nomenclatura já está parcialmente migrada para "Atleta": cadastro, rótulo de role, dashboard de `student`, ficha/anamnese e alguns textos de responsável já usam "Atleta" (`js/app.js:582`, `js/app.js:664`, `js/app.js:711`, `js/pages/student/dashboard.js:15`, `js/pages/responsible/dashboard.js:14`). Ainda existem ocorrências de "Aluno/aluno/alunos" em telas de responsável, administração, documentos, financeiro, treinos, mensagens de erro, comentários, migrations, Edge Function, testes e documentação.

No código ativo de runtime, as ocorrências principais estão em 17 arquivos:

- `js/app.js` - perfil/menu do responsável ainda mostra "GERENCIAR MEUS ALUNOS" e a bottom nav de responsável mostra "Alunos" (`js/app.js:769`, `js/app.js:1084`).
- `js/pages/responsible/students.js` - tela "Meus Alunos", fluxo de vínculo, labels, toasts, logs e erros (`js/pages/responsible/students.js:11`, `js/pages/responsible/students.js:18`, `js/pages/responsible/students.js:84`, `js/pages/responsible/students.js:86`, `js/pages/responsible/students.js:89`, `js/pages/responsible/students.js:93`, `js/pages/responsible/students.js:104`, `js/pages/responsible/students.js:108`, `js/pages/responsible/students.js:125`, `js/pages/responsible/students.js:129`).
- `js/pages/responsible/dashboard.js` - estado vazio e fallback "Aluno sem nome" (`js/pages/responsible/dashboard.js:63`, `js/pages/responsible/dashboard.js:85`).
- `js/pages/responsible/trainings.js` - subtítulo, estados vazios, erro e fallback de aluno (`js/pages/responsible/trainings.js:16`, `js/pages/responsible/trainings.js:61`, `js/pages/responsible/trainings.js:71`, `js/pages/responsible/trainings.js:72`, `js/pages/responsible/trainings.js:81`, `js/pages/responsible/trainings.js:161`, `js/pages/responsible/trainings.js:171`).
- `js/pages/responsible/plans.js` - comentários e confirmação de plano ativo para "o aluno" (`js/pages/responsible/plans.js:148`, `js/pages/responsible/plans.js:149`).
- `js/pages/responsible/payments.js` - comentário sobre quota por aluno (`js/pages/responsible/payments.js:53`).
- `js/pages/admin/users.js` - filtro "Alunos", title de atalho de fichas e option "Aluno" no formulário (`js/pages/admin/users.js:28`, `js/pages/admin/users.js:82`, `js/pages/admin/users.js:146`).
- `js/pages/admin/dashboard.js` - cards e descrições administrativas de alunos/fichas/clubes (`js/pages/admin/dashboard.js:16`, `js/pages/admin/dashboard.js:45`, `js/pages/admin/dashboard.js:55`, `js/pages/admin/dashboard.js:67`).
- `js/pages/admin/charges.js` - busca, carregamento, formulário e fallback de cobrança por aluno (`js/pages/admin/charges.js:24`, `js/pages/admin/charges.js:60`, `js/pages/admin/charges.js:70`, `js/pages/admin/charges.js:72`, `js/pages/admin/charges.js:95`, `js/pages/admin/charges.js:163`, `js/pages/admin/charges.js:204`).
- `js/pages/admin/preTrainingQuestionnaires.js` - título dos questionários, erro de carregamento e fallback "Aluno não informado" (`js/pages/admin/preTrainingQuestionnaires.js:65`, `js/pages/admin/preTrainingQuestionnaires.js:122`, `js/pages/admin/preTrainingQuestionnaires.js:131`).
- `js/pages/admin/trainings.js` - bottom sheet de presença, carregamento de alunos e fallback de reserva (`js/pages/admin/trainings.js:213`, `js/pages/admin/trainings.js:219`, `js/pages/admin/trainings.js:226`, `js/pages/admin/trainings.js:251`).
- `js/pages/admin/studentDocuments.js` - tela "Fichas dos Alunos", busca, seleção, estados, badges, labels e formulário de upload (`js/pages/admin/studentDocuments.js:40`, `js/pages/admin/studentDocuments.js:48`, `js/pages/admin/studentDocuments.js:52`, `js/pages/admin/studentDocuments.js:59`, `js/pages/admin/studentDocuments.js:90`, `js/pages/admin/studentDocuments.js:112`, `js/pages/admin/studentDocuments.js:123`, `js/pages/admin/studentDocuments.js:155`, `js/pages/admin/studentDocuments.js:162`, `js/pages/admin/studentDocuments.js:171`, `js/pages/admin/studentDocuments.js:191`, `js/pages/admin/studentDocuments.js:202`, `js/pages/admin/studentDocuments.js:203`, `js/pages/admin/studentDocuments.js:242`, `js/pages/admin/studentDocuments.js:263`, `js/pages/admin/studentDocuments.js:290`, `js/pages/admin/studentDocuments.js:298`, `js/pages/admin/studentDocuments.js:316`).
- `js/studentDocuments.js` - erros de API client-side quando `studentId` não é informado (`js/studentDocuments.js:122`, `js/studentDocuments.js:153`).
- `js/planUsage.js` - comentário do helper de uso de plano (`js/planUsage.js:4`).
- `js/pages/student/trainings.js` - log de erro de reservas do aluno (`js/pages/student/trainings.js:108`).
- `js/pages/student/attendance.js` - comentário de autorização para responsável vinculado ao aluno (`js/pages/student/attendance.js:14`).
- `supabase/functions/admin-update-user/index.ts` - comentário da regra de `club_id` para alunos (`supabase/functions/admin-update-user/index.ts:125`).

## Detailed Findings

### Rotas e navegação

- O perfil de responsável/empresário inclui o card "DEPENDENTES" com CTA `GERENCIAR MEUS ALUNOS` apontando para `#students` (`js/app.js:765`, `js/app.js:769`).
- A bottom nav de responsável/empresário tem item `#students` com texto `Alunos` (`js/app.js:1082`, `js/app.js:1084`).
- O cadastro público já exibe `Atleta` para o role interno `student` (`js/app.js:582`), e `getRoleLabel` também retorna `Atleta` para `student` (`js/app.js:664`).

### Área de responsável/empresário

- A tela `#students` é titulada `MEUS ALUNOS`, mostra carregamento "Buscando alunos vinculados..." e estados/erros com "alunos" (`js/pages/responsible/students.js:11`, `js/pages/responsible/students.js:18`, `js/pages/responsible/students.js:44`, `js/pages/responsible/students.js:52`).
- O formulário de vínculo pede "e-mail do aluno", usa label `E-MAIL DO ALUNO`, botão `VINCULAR ALUNO` e bottom sheet `Vincular Aluno` (`js/pages/responsible/students.js:84`, `js/pages/responsible/students.js:86`, `js/pages/responsible/students.js:89`, `js/pages/responsible/students.js:93`).
- A validação do vínculo emite console/error/toast com "aluno": busca, não encontrado, role incorreto, vínculo duplicado e sucesso (`js/pages/responsible/students.js:94`, `js/pages/responsible/students.js:103`, `js/pages/responsible/students.js:104`, `js/pages/responsible/students.js:108`, `js/pages/responsible/students.js:114`, `js/pages/responsible/students.js:125`, `js/pages/responsible/students.js:129`).
- O dashboard de responsável já usa o subtítulo "Visão geral dos seus atletas" (`js/pages/responsible/dashboard.js:14`), mas o estado vazio e fallback ainda usam "aluno" (`js/pages/responsible/dashboard.js:63`, `js/pages/responsible/dashboard.js:85`).
- A tela de treinos do responsável usa "Reservas dos alunos vinculados", estados "Nenhum aluno vinculado", CTA `VINCULAR ALUNO`, fallback `Aluno` e estado "Sem reserva dos seus alunos" (`js/pages/responsible/trainings.js:16`, `js/pages/responsible/trainings.js:71`, `js/pages/responsible/trainings.js:72`, `js/pages/responsible/trainings.js:81`, `js/pages/responsible/trainings.js:161`, `js/pages/responsible/trainings.js:171`).
- O fluxo de contratação de plano do responsável mantém comentários e fallback de confirmação como "aluno" (`js/pages/responsible/plans.js:148`, `js/pages/responsible/plans.js:149`).

### Administração

- A lista de usuários filtra role `student` com botão visível `Alunos`; o formulário de edição mostra option `Aluno` para `value="student"` (`js/pages/admin/users.js:28`, `js/pages/admin/users.js:146`).
- Na lista de usuários, o atalho para fichas de usuários `student` tem `title="Abrir fichas do aluno"` (`js/pages/admin/users.js:81`, `js/pages/admin/users.js:82`).
- O dashboard admin exibe KPI `Alunos`, CTA de questionários "Ver respostas de todos os alunos", card `Fichas dos alunos` e descrição de clubes "vincular alunos" (`js/pages/admin/dashboard.js:16`, `js/pages/admin/dashboard.js:45`, `js/pages/admin/dashboard.js:55`, `js/pages/admin/dashboard.js:67`).
- O financeiro admin pesquisa por "nome do aluno", carrega alunos, mostra label `ALUNO / CLIENTE`, option `Selecione um aluno...`, texto de intenção vinculada ao aluno e fallbacks `Aluno Removido`/`Aluno` (`js/pages/admin/charges.js:24`, `js/pages/admin/charges.js:60`, `js/pages/admin/charges.js:70`, `js/pages/admin/charges.js:72`, `js/pages/admin/charges.js:95`, `js/pages/admin/charges.js:163`, `js/pages/admin/charges.js:204`).
- A tela admin de questionários usa `QUESTIONÁRIOS DOS ALUNOS`, log de erro "alunos dos questionários" e fallback "Aluno não informado" (`js/pages/admin/preTrainingQuestionnaires.js:65`, `js/pages/admin/preTrainingQuestionnaires.js:122`, `js/pages/admin/preTrainingQuestionnaires.js:131`).
- No fluxo admin de treinos/presença manual, o bottom sheet instrui "Selecione os alunos presentes", carrega "alunos", busca todos os `student` e usa fallback `Aluno` em reservas (`js/pages/admin/trainings.js:213`, `js/pages/admin/trainings.js:219`, `js/pages/admin/trainings.js:226`, `js/pages/admin/trainings.js:251`).

### Documentos vinculados

- A rota admin `#student-documents` usa título `FICHAS DOS ALUNOS`, label `BUSCAR ALUNO`, estados "Carregando alunos", "Selecione um aluno", "Nenhum aluno encontrado", "Aluno selecionado" e badges `VISÍVEL AO ALUNO`/`OCULTO DO ALUNO` (`js/pages/admin/studentDocuments.js:40`, `js/pages/admin/studentDocuments.js:48`, `js/pages/admin/studentDocuments.js:52`, `js/pages/admin/studentDocuments.js:59`, `js/pages/admin/studentDocuments.js:155`, `js/pages/admin/studentDocuments.js:202`, `js/pages/admin/studentDocuments.js:263`).
- A mesma tela usa fallback `Aluno` em avatar/nome, mensagens de erro/toast e instruções de upload (`js/pages/admin/studentDocuments.js:90`, `js/pages/admin/studentDocuments.js:112`, `js/pages/admin/studentDocuments.js:123`, `js/pages/admin/studentDocuments.js:162`, `js/pages/admin/studentDocuments.js:171`, `js/pages/admin/studentDocuments.js:191`, `js/pages/admin/studentDocuments.js:203`, `js/pages/admin/studentDocuments.js:242`, `js/pages/admin/studentDocuments.js:290`).
- O formulário de upload ainda tem valor padrão `Ficha do aluno` e checkbox "Visível para o aluno"; o tipo do documento já usa `Ficha do atleta` (`js/pages/admin/studentDocuments.js:298`, `js/pages/admin/studentDocuments.js:303`, `js/pages/admin/studentDocuments.js:316`).
- O helper `js/studentDocuments.js` já chama o tipo `athlete_record` de `Ficha do atleta`, mas erros de parâmetro ausente ainda dizem `Aluno não informado.` (`js/studentDocuments.js:38`, `js/studentDocuments.js:122`, `js/studentDocuments.js:153`).

### Migrations e Edge Function

- `migrations/002_rls_security.sql` contém comentários de RLS com "vincular alunos", "aluno vê" e "alunos vinculados"; as estruturas de dados continuam usando nomes internos `student_*` (`migrations/002_rls_security.sql:29`, `migrations/002_rls_security.sql:49`, `migrations/002_rls_security.sql:50`).
- `migrations/007_student_documents.sql` começa com comentário "documentos físicos vinculados ao perfil do aluno"; a tabela e o bucket usam nomes internos `student_documents`/`student-documents` (`migrations/007_student_documents.sql:1`, `migrations/007_student_documents.sql:33`, `migrations/007_student_documents.sql:35`).
- `migrations/008_clubs_linked_to_students.sql` descreve "Clubes vinculados a alunos" no comentário da migration (`migrations/008_clubs_linked_to_students.sql:1`).
- `migrations/009_activate_student_plan_rpc.sql` comenta a expiração entre planos ativos "do mesmo aluno e categoria" (`migrations/009_activate_student_plan_rpc.sql:43`).
- A Edge Function `admin-update-user` mantém o role interno `student` e comenta que "Alunos recebem o club_id" (`supabase/functions/admin-update-user/index.ts:9`, `supabase/functions/admin-update-user/index.ts:125`).

### Testes

- `testsprite_tests/TC034_Admin_upload_student_ficha_document.py` contém dados mockados com `email: 'aluno@example.com'`, nome `Aluno Teste`, asserts `FICHAS DOS ALUNOS`, `Aluno Teste` e `VISÍVEL AO ALUNO` (`testsprite_tests/TC034_Admin_upload_student_ficha_document.py:12`, `testsprite_tests/TC034_Admin_upload_student_ficha_document.py:103`, `testsprite_tests/TC034_Admin_upload_student_ficha_document.py:193`, `testsprite_tests/TC034_Admin_upload_student_ficha_document.py:194`, `testsprite_tests/TC034_Admin_upload_student_ficha_document.py:195`, `testsprite_tests/TC034_Admin_upload_student_ficha_document.py:208`).
- `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py` usa "aluno" em docstring, comentários e mensagem final do fluxo de clube vinculado (`testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:2`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:50`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:56`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:74`).

### Documentação e specs

Arquivos de documentação também contêm "Aluno/aluno/alunos" e podem precisar de atualização se a mudança de nomenclatura deve cobrir documentação histórica:

- `spec (1).md` possui 30 ocorrências, incluindo objetivo, definição de persona `Aluno`, áreas de responsável/aluno, menu e regras de acesso (`spec (1).md:8`, `spec (1).md:73`, `spec (1).md:219`, `spec (1).md:238`, `spec (1).md:451`, `spec (1).md:474`).
- Specs em `docs/specs/` com mais ocorrências: `2026-05-11-documentos-fisicos-perfil-aluno-spec.md` tem 60, `2026-05-11-clubes-vinculados-alunos-spec.md` tem 45, `2026-05-04-reservas-calendario-spec.md` tem 37, `2026-05-11-perfil-aluno-clube-vinculado-spec.md` tem 18, `2026-05-11-questionario-pre-treino-qrcode-spec.md` tem 15 e `2026-05-11-expiracao-planos-contratados-spec.md` tem 14.
- Pesquisas existentes em `docs/research/` também registram a nomenclatura anterior, especialmente `2026-05-04-reservas-calendario.md` com 28 ocorrências, `2026-05-11-admin-users-clubs-embed-error.md` com 15, `2026-05-03-spec-alteracoes-analysis.md` com 8, `2026-05-11-clubes-vinculados-alunos.md` com 8 e `2026-05-11-documentos-fisicos-perfil-aluno.md` com 3.

## Code References

- `js/app.js:582` - Cadastro já usa `Atleta` para `value="student"`.
- `js/app.js:664` - `getRoleLabel` já mapeia `student` para `Atleta`.
- `js/app.js:769` - CTA de dependentes ainda usa "MEUS ALUNOS".
- `js/app.js:1084` - Navegação de responsável ainda usa "Alunos".
- `js/pages/responsible/students.js:11` - Título da tela de vínculo ainda é "MEUS ALUNOS".
- `js/pages/responsible/students.js:84` - Texto instrui inserir e-mail do aluno.
- `js/pages/admin/users.js:28` - Filtro admin do role `student` mostra "Alunos".
- `js/pages/admin/users.js:146` - Select de papel mostra "Aluno" para `student`.
- `js/pages/admin/dashboard.js:55` - Card administrativo mostra "Fichas dos alunos".
- `js/pages/admin/charges.js:70` - Cobrança manual identifica o alvo como "ALUNO / CLIENTE".
- `js/pages/admin/studentDocuments.js:40` - Tela de documentos tem título "FICHAS DOS ALUNOS".
- `js/pages/admin/studentDocuments.js:298` - Upload usa título padrão "Ficha do aluno".
- `js/studentDocuments.js:122` - API client-side emite erro "Aluno não informado."
- `migrations/007_student_documents.sql:1` - Migration documenta "perfil do aluno".
- `supabase/functions/admin-update-user/index.ts:125` - Edge Function comenta regra de `club_id` para alunos.
- `testsprite_tests/TC034_Admin_upload_student_ficha_document.py:193` - Teste espera "FICHAS DOS ALUNOS".

## Architecture Documentation

O conceito de pessoa treinando é representado internamente pelo role `student`, por colunas `student_id`, tabelas como `student_plans`, `student_documents`, `responsible_students`, bucket `student-documents` e módulos em `js/pages/student/`. A UI em português é independente desses identificadores: alguns rótulos já exibem "Atleta", enquanto outras telas ainda exibem "Aluno". Os dados seguem fluxo client-side Supabase: telas JS consultam tabelas diretamente com RLS e a Edge Function `admin-update-user` atualiza usuário/role/clube com service role.

## Historical Context

- `docs/research/2026-04-24-ajustes-diamond-x.md` registra um estado antigo em que o cadastro tinha select "Aluno" e "Responsável" (`docs/research/2026-04-24-ajustes-diamond-x.md:160`).
- `spec-alteracoes-diamond-x.md` já descreve "App do Atleta" e "Ficha do Atleta" (`spec-alteracoes-diamond-x.md:4`, `spec-alteracoes-diamond-x.md:44`, `spec-alteracoes-diamond-x.md:80`).
- `README.md` já usa "atleta" na descrição dos perfis e mantém o diretório `student/` descrito como "Telas do atleta" (`README.md:3`, `README.md:30`, `README.md:42`).

## Related Research

- `docs/research/2026-05-11-documentos-fisicos-perfil-aluno.md` - Pesquisa anterior sobre documentos no perfil do aluno.
- `docs/research/2026-05-11-clubes-vinculados-alunos.md` - Pesquisa anterior sobre clubes vinculados a alunos.
- `docs/research/2026-05-11-admin-users-clubs-embed-error.md` - Pesquisa sobre vínculo aluno-clube em admin/users e perfil.
- `docs/research/2026-05-04-reservas-calendario.md` - Pesquisa sobre reservas de calendário para aluno, responsável e admin.

## Open Questions

- Não identificado se a troca deve renomear apenas textos visíveis em runtime ou também comentários, testes, specs e pesquisas históricas.
- Não identificado se identificadores internos em inglês (`student`, `student_id`, `student_plans`, diretórios `student/`) devem permanecer estáveis ou serem renomeados; hoje eles representam o mesmo conceito, mas a UI já pode exibir "Atleta" sem alterar schema.
