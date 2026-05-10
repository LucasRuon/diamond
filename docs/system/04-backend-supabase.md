---
date: 2026-05-09T23:17:26-03:00
researcher: Codex
git_commit: f040e1066ee18231c2bf20f4b0c78c5442423f8a
branch: diamond-expo
repository: Diamond-expo
topic: "Backend Supabase do Diamond X"
tags: [documentation, backend, supabase]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Backend Supabase

## Visao Geral

O backend do Diamond X usa Supabase para:

- Autenticacao.
- Banco Postgres.
- Row Level Security.
- Storage de avatar.
- Edge Functions.

O app nativo acessa Supabase pelo client em `src/lib/supabase.ts`, configurado com variaveis Expo publicas e persistencia nativa via AsyncStorage (`src/lib/supabase.ts:7`, `src/lib/supabase.ts:11`).

## Autenticacao

O app usa Supabase Auth para:

- Login por email/senha.
- Cadastro.
- Logout.
- Reset de senha.
- Atualizacao de senha.

Essas chamadas ficam em `src/features/auth/auth-service.ts` (`src/features/auth/auth-service.ts:3`).

`AuthProvider` observa a sessao inicial e mudancas futuras com `getSession()` e `onAuthStateChange()` (`src/providers/AuthProvider.tsx:41`, `src/providers/AuthProvider.tsx:51`).

## Perfil de Aplicacao

Depois do login, o app busca a linha do usuario em `public.users`:

```ts
supabase.from('users').select('*').eq('id', user.id).single()
```

Referencia: `src/providers/AuthProvider.tsx:66`.

A migration `004_auth_users_profile_trigger.sql` cria `handle_new_auth_user()` e o trigger `on_auth_user_created` para criar/atualizar perfil em `public.users` quando um usuario e criado no Supabase Auth (`migrations/004_auth_users_profile_trigger.sql:4`, `migrations/004_auth_users_profile_trigger.sql:22`, `migrations/004_auth_users_profile_trigger.sql:55`).

## Tabelas Usadas pelo App

- `users`: perfil, role, email, nome, telefone, CPF, avatar e campos de atleta.
- `plans`: catalogo de planos.
- `student_plans`: compras, status de pagamento e planos ativos.
- `attendance`: presencas.
- `training_sessions`: treinos cadastrados.
- `training_reservations`: reservas de treinos.
- `responsible_students`: vinculos responsavel-aluno.
- `payments`: consultada por `paymentsService`, embora as telas financeiras usem principalmente `student_plans`.

O app acessa essas tabelas diretamente nas features e services. Exemplos: `src/features/student/StudentDashboardScreen.tsx:25`, `src/features/admin/AdminChargesScreen.tsx:58`, `src/features/responsible/ResponsibleStudentsScreen.tsx:56`.

## Migrations

### `001_add_athlete_anamnese_fields.sql`

Adiciona campos de anamnese/perfil esportivo em `public.users` (`migrations/001_add_athlete_anamnese_fields.sql:4`).

### `002_rls_security.sql`

Habilita RLS nas tabelas principais e cria politicas para:

- `users`.
- `student_plans`.
- `attendance`.
- `responsible_students`.
- `training_sessions`.
- `plans`.

Referencias: `migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:56`, `migrations/002_rls_security.sql:94`, `migrations/002_rls_security.sql:129`, `migrations/002_rls_security.sql:147`.

### `003_training_reservations.sql`

Cria `training_reservations`, indices, indice unico para reserva ativa e politicas de RLS (`migrations/003_training_reservations.sql:4`, `migrations/003_training_reservations.sql:19`, `migrations/003_training_reservations.sql:31`).

A politica de insert exige que:

- O aluno seja o usuario autenticado.
- O status seja `booked`.
- Exista plano ativo.
- A sessao seja pelo menos 24 horas no futuro.

Referencia: `migrations/003_training_reservations.sql:46`.

### `004_auth_users_profile_trigger.sql`

Cria trigger de perfil a partir de Supabase Auth. O role solicitado e aceito apenas para `student`, `responsible` e `businessman`; caso contrario vira `student` (`migrations/004_auth_users_profile_trigger.sql:14`, `migrations/004_auth_users_profile_trigger.sql:16`).

### `005_responsible_students_delete_policy.sql`

Permite que responsaveis removam seus proprios vinculos e que admins removam qualquer vinculo (`migrations/005_responsible_students_delete_policy.sql:12`).

## Storage

O avatar usa o bucket `avatars`. `ProfileScreen` seleciona imagem, envia para o bucket e atualiza `users.avatar_url` (`src/features/profile/ProfileScreen.tsx:97`, `src/features/profile/ProfileScreen.tsx:108`, `src/features/profile/ProfileScreen.tsx:111`, `src/features/profile/ProfileScreen.tsx:112`).

## Services Internos

A pasta `src/services` cria uma camada fina sobre Supabase:

- `usersService`: perfil (`src/services/users.ts:3`).
- `plansService`: planos e plano ativo do aluno (`src/services/plans.ts:3`).
- `paymentsService`: pagamentos (`src/services/payments.ts:3`).
- `attendanceService`: presencas e check-in (`src/services/attendance.ts:3`).
- `trainingSessionsService`: sessoes (`src/services/trainingSessions.ts:3`).
- `trainingReservationsService`: reservas (`src/services/trainingReservations.ts:3`).
- `responsibleLinksService`: alunos vinculados (`src/services/responsibleLinks.ts:3`).
- `adminService`: Edge Function administrativa (`src/services/admin.ts:3`).

## Tipagem do Banco

`src/types/database.ts` contem uma tipagem minima da tabela `users` (`src/types/database.ts:9`, `src/types/database.ts:12`). O codigo atual consulta mais tabelas do que as declaradas nesse arquivo.

