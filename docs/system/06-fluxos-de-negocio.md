---
date: 2026-05-09T23:17:26-03:00
researcher: Codex
git_commit: f040e1066ee18231c2bf20f4b0c78c5442423f8a
branch: diamond-expo
repository: Diamond-expo
topic: "Fluxos de negocio do Diamond X"
tags: [documentation, business-flows]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Fluxos de Negocio

## Login e Redirecionamento por Papel

1. Usuario informa email e senha na tela de login.
2. `authService.signIn()` chama `supabase.auth.signInWithPassword()`.
3. `AuthProvider` recebe a sessao por `onAuthStateChange()`.
4. `AuthProvider` carrega o perfil em `users`.
5. `app/index.tsx` redireciona pelo role.

Referencias: `app/(auth)/login.tsx:17`, `src/features/auth/auth-service.ts:4`, `src/providers/AuthProvider.tsx:51`, `src/providers/AuthProvider.tsx:66`, `app/index.tsx:21`.

Regras de redirecionamento:

- Sem sessao: `/(auth)/login`.
- `admin`: `/(admin)`.
- `responsible` ou `businessman`: `/(responsible)`.
- Demais casos: `/(student)`.

Referencia: `app/index.tsx:17`, `app/index.tsx:23`, `app/index.tsx:24`, `app/index.tsx:26`.

## Cadastro

1. Usuario preenche nome, email, CPF, WhatsApp e senha.
2. A tela valida email e CPF.
3. `authService.signUp()` cria usuario no Supabase Auth.
4. Trigger do banco cria/atualiza perfil em `public.users`.
5. App faz logout e envia usuario para login.

Referencias: `app/(auth)/register.tsx:22`, `app/(auth)/register.tsx:27`, `app/(auth)/register.tsx:31`, `src/features/auth/auth-service.ts:13`, `migrations/004_auth_users_profile_trigger.sql:22`, `app/(auth)/register.tsx:39`.

## Recuperacao e Atualizacao de Senha

1. Usuario informa email em `forgot-password`.
2. App chama `supabase.auth.resetPasswordForEmail()`.
3. Supabase envia link de recuperacao.
4. Deep link pode restaurar sessao usando `access_token` e `refresh_token`.
5. Usuario informa nova senha em `update-password`.
6. App chama `supabase.auth.updateUser({ password })`.

Referencias: `app/(auth)/forgot-password.tsx:17`, `src/features/auth/auth-service.ts:33`, `src/features/auth/deep-links.ts:18`, `app/(auth)/update-password.tsx:17`, `src/features/auth/auth-service.ts:38`.

## Dashboard do Aluno

`StudentDashboardScreen` carrega:

- Plano ativo em `student_plans`.
- Presencas do mes em `attendance`.
- Proximo treino em `training_sessions`.
- Responsavel vinculado em `responsible_students`.

Referencias: `src/features/student/StudentDashboardScreen.tsx:25`, `src/features/student/StudentDashboardScreen.tsx:37`, `src/features/student/StudentDashboardScreen.tsx:44`, `src/features/student/StudentDashboardScreen.tsx:53`.

## Reserva de Treino

1. Aluno abre `Treinos`.
2. Tela carrega sessoes, reservas e plano ativo.
3. Aluno escolhe uma sessao.
4. App insere em `training_reservations`.
5. Banco valida via RLS se o aluno pode reservar.

Referencias: `src/features/student/StudentTrainingsScreen.tsx:31`, `src/features/student/StudentTrainingsScreen.tsx:36`, `src/features/student/StudentTrainingsScreen.tsx:40`, `src/features/student/StudentTrainingsScreen.tsx:66`, `migrations/003_training_reservations.sql:46`.

## Cancelamento de Reserva

1. Aluno toca para cancelar reserva.
2. App remove ou cancela registro em `training_reservations`.
3. Tela recarrega dados.

Referencia no app nativo: `src/features/student/StudentTrainingsScreen.tsx:79`.

Referencia de politica SQL para update/cancelamento: `migrations/003_training_reservations.sql:63`.

## Check-in por QR Code

1. Aluno abre o scanner.
2. App verifica plano ativo em `student_plans`.
3. App busca treino do dia em `training_sessions` pelo token lido.
4. App verifica duplicidade em `attendance`.
5. App insere a presenca.

Referencias: `app/(student)/scanner.tsx:16`, `app/(student)/scanner.tsx:34`, `app/(student)/scanner.tsx:50`, `app/(student)/scanner.tsx:65`.

## Historico de Presenca

`StudentAttendanceScreen` consulta `attendance` com dados de `training_sessions` para mostrar historico do aluno (`src/features/student/StudentAttendanceScreen.tsx:18`, `src/features/student/StudentAttendanceScreen.tsx:20`).

## Compra de Plano pelo Aluno

1. Aluno abre Planos.
2. Tela lista planos ativos por categoria.
3. Se for plano de treino, app verifica se ja existe plano ativo.
4. App insere cobranca pendente em `student_plans`.

Referencias: `src/features/student/StudentPlansScreen.tsx:37`, `src/features/student/StudentPlansScreen.tsx:61`, `src/features/student/StudentPlansScreen.tsx:73`.

## Responsavel Vincula Aluno

1. Responsavel abre Alunos.
2. Informa email do aluno.
3. App busca usuario em `users`.
4. App valida que o role e `student`.
5. App insere linha em `responsible_students`.

Referencias: `src/features/responsible/ResponsibleStudentsScreen.tsx:40`, `src/features/responsible/ResponsibleStudentsScreen.tsx:52`, `src/features/responsible/ResponsibleStudentsScreen.tsx:56`.

## Responsavel Compra Plano para Aluno

1. Responsavel abre Planos.
2. App carrega planos e alunos vinculados.
3. Responsavel seleciona beneficiario.
4. App verifica plano ativo quando aplicavel.
5. App insere cobranca em `student_plans`.

Referencias: `src/features/responsible/ResponsiblePlansScreen.tsx:39`, `src/features/responsible/ResponsiblePlansScreen.tsx:54`, `src/features/responsible/ResponsiblePlansScreen.tsx:69`, `src/features/responsible/ResponsiblePlansScreen.tsx:77`.

## Gestao de Usuarios pelo Admin

1. Admin abre Usuarios.
2. Tela lista usuarios em `users`.
3. Admin edita nome, role, CPF e telefone.
4. App chama `admin-update-user`.
5. Edge Function valida admin e atualiza com service role.

Referencias: `src/features/admin/AdminUsersScreen.tsx:50`, `src/features/admin/AdminUsersScreen.tsx:75`, `supabase/functions/admin-update-user/index.ts:72`, `supabase/functions/admin-update-user/index.ts:104`.

## Gestao de Treinos pelo Admin

O admin pode:

- Listar sessoes.
- Criar treino.
- Remover treino.
- Abrir QR.
- Ver reservas.
- Marcar ou remover presenca manual.

Referencias: `src/features/admin/AdminTrainingsScreen.tsx:73`, `src/features/admin/AdminTrainingsScreen.tsx:103`, `src/features/admin/AdminTrainingsScreen.tsx:139`, `src/features/admin/AdminTrainingsScreen.tsx:158`, `src/features/admin/AdminTrainingsScreen.tsx:166`, `src/features/admin/AdminTrainingsScreen.tsx:180`.

## Gestao de Planos pelo Admin

O admin pode listar, criar, editar e excluir planos em `plans` (`src/features/admin/AdminPlansScreen.tsx:40`, `src/features/admin/AdminPlansScreen.tsx:66`, `src/features/admin/AdminPlansScreen.tsx:87`).

## Cobrancas pelo Admin

`AdminChargesScreen` usa `student_plans` para:

- Listar cobrancas.
- Filtrar por status.
- Confirmar pagamento (`status: active`).
- Cancelar cobranca (`status: cancelled`).
- Criar cobranca manual.

Referencias: `src/features/admin/AdminChargesScreen.tsx:58`, `src/features/admin/AdminChargesScreen.tsx:92`, `src/features/admin/AdminChargesScreen.tsx:100`, `src/features/admin/AdminChargesScreen.tsx:119`.

## Relatorios

`AdminReportsScreen` calcula metricas a partir de `training_sessions`, `attendance` e `users` (`src/features/admin/AdminReportsScreen.tsx:29`, `src/features/admin/AdminReportsScreen.tsx:34`, `src/features/admin/AdminReportsScreen.tsx:58`).

