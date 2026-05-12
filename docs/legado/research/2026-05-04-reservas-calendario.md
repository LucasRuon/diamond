---
date: 2026-05-04T00:18:09-03:00
researcher: Codex
git_commit: 3b8f58311283230bc9425ac25ca83731bd0ff19d
branch: main
repository: Diamond
topic: "$research-codebase como fica as reservas no caledario? Tanto a nivel de aluno quando a nivel de responsavel/empresario e adm? Fiz uma reserva mas esta dando \"Erro ao carregar reservas\""
tags: [research, codebase]
status: complete
last_updated: 2026-05-04
last_updated_by: Codex
---

# Research: Reservas no calendario por perfil

**Date**: 2026-05-04T00:18:09-03:00
**Researcher**: Codex
**Git Commit**: 3b8f58311283230bc9425ac25ca83731bd0ff19d
**Branch**: main
**Repository**: Diamond

## Research Question

$research-codebase como fica as reservas no caledario? Tanto a nivel de aluno quando a nivel de responsavel/empresario e adm? Fiz uma reserva mas esta dando "Erro ao carregar reservas"

## Scope

Pesquisa focada no fluxo de calendario, reservas de treino e autorizacao por papel no frontend vanilla JS e nas migracoes Supabase locais. Tambem foi feita uma consulta REST anonima ao Supabase configurado em `js/supabase.js` para verificar o estado exposto pelo schema remoto da tabela de reservas.

## Summary

No codigo atual, reservas ficam em uma tabela planejada/chamada `training_reservations`. O aluno usa `#trainings` para ver calendario mensal de sessoes, criar reserva propria e cancelar reserva propria. O admin usa `#trainings` para ver calendario mensal de treinos, contagem de reservas por sessao e lista de reservados dentro do bottom sheet de presencas. Responsavel/empresario tem permissao planejada em RLS para ler reservas de alunos vinculados, mas a UI atual nao oferece uma tela de calendario/reservas para esse papel; pelo menu, ele acessa alunos, planos, faturas e frequencia.

A mensagem exata "Erro ao carregar reservas." esta no fluxo admin quando a query de `training_reservations` falha. A consulta direta ao REST do Supabase configurado retornou HTTP 404 com `PGRST205`: `Could not find the table 'public.training_reservations' in the schema cache`. Isso mostra que, no backend remoto consultado, a tabela de reservas nao esta disponivel no schema REST no momento da pesquisa, embora exista a migracao local `migrations/003_training_reservations.sql`.

## Detailed Findings

### Configuracao Supabase

- O frontend aponta para `https://ggolcbrrenmnvtphmcbr.supabase.co` e cria o client com a anon key em `js/supabase.js:2` e `js/supabase.js:11`.
- A consulta REST feita contra esse projeto para `training_reservations?select=id,session_id,status,student:users!student_id(id,full_name,email)&limit=1` retornou HTTP 404 com codigo `PGRST205` e mensagem de tabela ausente no schema cache.

### Roteamento por papel

- `#trainings` chama `app.renderTrainings()` no roteador principal (`js/app.js:105`).
- A protecao explicita por papel so bloqueia `#users` e `#reports` para nao-admins, e `#students` para quem nao e responsavel/empresario/admin (`js/app.js:80`).
- `renderTrainings()` envia admin para `adminTrainings.render()` e qualquer outro papel para `studentTrainings.render()` (`js/app.js:371`).
- O menu do admin inclui `Treinos` (`js/app.js:690` a `js/app.js:696`).
- O menu de responsavel/empresario nao inclui `Treinos`; inclui dashboard, alunos, planos, faturas e perfil (`js/app.js:697` a `js/app.js:702`).
- O menu de aluno inclui `Treinos` e `Presenca` (`js/app.js:703` a `js/app.js:708`).

### Aluno

- A tela do aluno renderiza calendario mensal em `#student-training-calendar` e lista mensal em `#student-trainings-list` (`js/pages/student/trainings.js:30` e `js/pages/student/trainings.js:45`).
- `loadAvailableTrainings()` busca sessoes futuras do mes em `training_sessions` (`js/pages/student/trainings.js:68` a `js/pages/student/trainings.js:73`).
- A mesma funcao busca reservas em `training_reservations` filtrando `student_id = user.id` e `status = booked` (`js/pages/student/trainings.js:75` a `js/pages/student/trainings.js:79`).
- Tambem busca plano ativo em `student_plans` para habilitar/desabilitar o botao de marcar treino (`js/pages/student/trainings.js:81` a `js/pages/student/trainings.js:86`).
- Se a query de sessoes ou reservas falhar, a UI mostra "Erro ao carregar treinos e reservas." (`js/pages/student/trainings.js:94` a `js/pages/student/trainings.js:97`).
- A lista mostra estado `Treino marcado`, `Disponivel para marcar` ou `Encerrado para marcacao` com base em reserva existente e antecedencia de 24h (`js/pages/student/trainings.js:116` a `js/pages/student/trainings.js:120`).
- Marcar treino insere `{ session_id, student_id: user.id }` em `training_reservations` (`js/pages/student/trainings.js:194` a `js/pages/student/trainings.js:198`).
- Cancelar reserva faz update para `status = cancelled` e grava `cancelled_at` (`js/pages/student/trainings.js:212` a `js/pages/student/trainings.js:216`).

### Admin

- A tela admin renderiza calendario mensal em `#admin-training-calendar` e lista em `#trainings-list` (`js/pages/admin/trainings.js:23` e `js/pages/admin/trainings.js:38`).
- `loadTrainings()` busca as sessoes do mes em `training_sessions` (`js/pages/admin/trainings.js:57` a `js/pages/admin/trainings.js:62`).
- Depois monta `sessionIds` e busca reservas de sessoes do mes em `training_reservations`, com join para `users` pelo aluno (`js/pages/admin/trainings.js:70` a `js/pages/admin/trainings.js:77`).
- Se essa query de reservas falhar, a UI troca a lista para "Erro ao carregar reservas." e limpa o calendario (`js/pages/admin/trainings.js:79` a `js/pages/admin/trainings.js:82`).
- Quando a query funciona, o admin agrupa reservas por sessao (`js/pages/admin/trainings.js:85` a `js/pages/admin/trainings.js:89`) e mostra a contagem no card da sessao (`js/pages/admin/trainings.js:109` e `js/pages/admin/trainings.js:120`).
- No bottom sheet de presencas, o admin busca todos os alunos, as presencas da sessao e as reservas `booked` da sessao (`js/pages/admin/trainings.js:209` a `js/pages/admin/trainings.js:219`).
- A lista de reservados mostra nome, email e badge `PRESENTE` ou `RESERVADO` comparando reserva com `attendance` (`js/pages/admin/trainings.js:221` a `js/pages/admin/trainings.js:232`).

### Responsavel/Empresario

- Responsavel/empresario tem dashboard proprio (`js/app.js:364` a `js/app.js:365`) e menu sem item `#trainings` (`js/app.js:697` a `js/app.js:702`).
- O dashboard lista alunos vinculados via `responsible_students` e planos em `student_plans` (`js/pages/responsible/dashboard.js:43` a `js/pages/responsible/dashboard.js:82`).
- O dashboard oferece link para `#attendance?id=<student_id>` com texto `VER FREQUENCIA` (`js/pages/responsible/dashboard.js:101` a `js/pages/responsible/dashboard.js:104`).
- A tela `Meus Alunos` lista vinculos de `responsible_students` e, ao clicar em um aluno, navega para `#attendance?id=<student_id>` (`js/pages/responsible/students.js:31` a `js/pages/responsible/students.js:41`, `js/pages/responsible/students.js:78` a `js/pages/responsible/students.js:83`).
- A tela de frequencia valida que o usuario e admin ou tem vinculo em `responsible_students` antes de exibir dados de outro aluno (`js/pages/student/attendance.js:13` a `js/pages/student/attendance.js:31`).
- A tela de frequencia consulta `attendance`, nao `training_reservations` (`js/pages/student/attendance.js:95` a `js/pages/student/attendance.js:109`).
- Portanto, apesar da politica local de reservas permitir leitura por responsavel vinculado, a UI atual nao consulta reservas para responsavel/empresario.

### Tabela e RLS locais de reservas

- A migracao local cria `public.training_reservations` com `id`, `session_id`, `student_id`, `status`, `reserved_at` e `cancelled_at` (`migrations/003_training_reservations.sql:4` a `migrations/003_training_reservations.sql:11`).
- `session_id` referencia `training_sessions` com cascade e `student_id` referencia `users` com cascade (`migrations/003_training_reservations.sql:6` a `migrations/003_training_reservations.sql:7`).
- Existe indice unico parcial para impedir mais de uma reserva ativa por aluno/sessao (`migrations/003_training_reservations.sql:19` a `migrations/003_training_reservations.sql:21`).
- A politica de select local permite leitura pelo proprio aluno, por admin e por responsavel vinculado via `responsible_students` (`migrations/003_training_reservations.sql:29` a `migrations/003_training_reservations.sql:42`).
- A politica de insert local permite reserva apenas quando `student_id = auth.uid()`, `status = booked`, ha plano ativo e a sessao esta a pelo menos 24h (`migrations/003_training_reservations.sql:44` a `migrations/003_training_reservations.sql:59`).
- A politica de update local permite admin atualizar ou o proprio aluno cancelar reserva ativa (`migrations/003_training_reservations.sql:61` a `migrations/003_training_reservations.sql:83`).

### Calendario e frequencia

- Os helpers de calendario ficam em `js/calendar.js`: `dateKey`, `getMonthMatrix`, labels pt-BR, `groupByDate` e `getWeekdayLabels` (`js/calendar.js:1` a `js/calendar.js:75`).
- O calendario de treinos de aluno/admin marca dias com sessoes usando `has-training`, mas nao marca visualmente dias com reserva do aluno; a reserva aparece nos cards da lista (`js/pages/student/trainings.js:155` a `js/pages/student/trainings.js:177`, `js/pages/admin/trainings.js:144` a `js/pages/admin/trainings.js:166`).
- A frequencia usa outro calendario, baseado em `attendance`, com classe `has-attendance` para dias em que houve check-in (`js/pages/student/attendance.js:155` a `js/pages/student/attendance.js:172`).

## Code References

- `js/supabase.js:2` - Projeto Supabase remoto usado pelo frontend.
- `js/app.js:80` - Bloqueio de rotas por papel.
- `js/app.js:371` - Decisao de tela de treinos: admin recebe admin, demais papeis recebem aluno.
- `js/app.js:690` - Menu admin com `Treinos`.
- `js/app.js:697` - Menu responsavel/empresario sem `Treinos`.
- `js/app.js:703` - Menu aluno com `Treinos`.
- `js/pages/student/trainings.js:75` - Query de reservas do aluno.
- `js/pages/student/trainings.js:194` - Insert de reserva pelo aluno.
- `js/pages/student/trainings.js:212` - Cancelamento de reserva pelo aluno.
- `js/pages/admin/trainings.js:71` - Query admin de reservas por sessoes do mes.
- `js/pages/admin/trainings.js:79` - Origem da mensagem "Erro ao carregar reservas."
- `js/pages/admin/trainings.js:215` - Query admin de reservas dentro do bottom sheet de presencas.
- `js/pages/responsible/dashboard.js:101` - Responsavel acessa frequencia, nao reservas.
- `js/pages/student/attendance.js:95` - Frequencia consulta `attendance`.
- `migrations/003_training_reservations.sql:4` - Tabela local de reservas.
- `migrations/003_training_reservations.sql:29` - RLS select local por aluno/admin/responsavel vinculado.
- `migrations/003_training_reservations.sql:44` - RLS insert local com plano ativo e prazo de 24h.

## Architecture Documentation

O dominio separa tres conceitos:

- `training_sessions`: agenda criada pelo admin, lida por usuarios autenticados.
- `training_reservations`: reserva planejada por aluno para uma sessao futura.
- `attendance`: presenca/check-in, usada para frequencia e confirmacao de comparecimento.

O fluxo de reserva e client-side via Supabase JS. Nao ha rota backend propria no repositorio para reservas. A seguranca e as regras de negocio ficam nas politicas RLS da migracao local. A UI de aluno e admin depende da existencia remota de `training_reservations`; quando essa tabela nao existe no schema REST, as queries que usam essa tabela falham antes de renderizar as reservas.

## Historical Context

- A spec de 2026-05-03 define a Fase 4 como criacao de reservas ate 24h antes do treino (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:156`).
- A spec lista a migracao `migrations/003_training_reservations.sql`, a tela de aluno e a tela admin como arquivos de implementacao dessa fase (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:160` a `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:165`).
- A spec tambem descreve a permissao de select para aluno, admin e responsavel/empresario vinculado (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:180`).
- Os criterios manuais de sucesso ainda aparecem desmarcados para aluno marcar treino, admin ver reservas e QR continuar registrando presenca (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:206` a `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:211`).

## Related Research

- `docs/research/2026-05-03-spec-alteracoes-analysis.md` - Pesquisa anterior sobre o estado antes/durante a spec de alteracoes Diamond X.

## Open Questions

- A pesquisa nao teve uma sessao autenticada de admin/aluno para capturar o objeto `reservationsError` exato no navegador.
- O Supabase remoto consultado respondeu que `public.training_reservations` nao existe no schema cache; a pesquisa nao verificou via SQL Editor se a migracao `003_training_reservations.sql` ja foi executada no banco remoto ou se falta refresh do schema cache.
