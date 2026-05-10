---
date: 2026-05-09T23:17:26-03:00
researcher: Codex
git_commit: f040e1066ee18231c2bf20f4b0c78c5442423f8a
branch: diamond-expo
repository: Diamond-expo
topic: "APIs e integracoes do Diamond X"
tags: [documentation, api, integrations, edge-functions]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# APIs e Integracoes

## Visao Geral

O app nao possui um backend HTTP proprio dentro do projeto Expo. As integracoes e APIs ficam nestes pontos:

- Supabase client direto no app.
- Supabase Edge Functions.
- Supabase Auth.
- Supabase Storage.
- Asaas via Edge Function.
- Deep links Expo/Supabase.

## Supabase Client

O client e criado em `src/lib/supabase.ts` com URL e chave anonima vindas de variaveis publicas (`src/lib/supabase.ts:7`, `src/lib/supabase.ts:8`, `src/lib/supabase.ts:9`).

As telas e services usam esse client para consultar tabelas, chamar Edge Functions, autenticar usuarios e fazer upload de arquivos.

## Edge Function: `admin-update-user`

Local: `supabase/functions/admin-update-user/index.ts`.

Objetivo: permitir que admins atualizem usuarios e roles com service role, sem expor permissao privilegiada no app.

Fluxo:

1. Aceita `OPTIONS` para CORS e apenas `POST` para execucao (`supabase/functions/admin-update-user/index.ts:25`, `supabase/functions/admin-update-user/index.ts:28`).
2. Le `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` (`supabase/functions/admin-update-user/index.ts:33`).
3. Exige `Authorization: Bearer ...` (`supabase/functions/admin-update-user/index.ts:42`).
4. Valida o usuario chamador com client anonimo (`supabase/functions/admin-update-user/index.ts:46`, `supabase/functions/admin-update-user/index.ts:59`).
5. Busca perfil do chamador e exige role `admin` (`supabase/functions/admin-update-user/index.ts:66`, `supabase/functions/admin-update-user/index.ts:72`).
6. Valida payload, role e nome (`supabase/functions/admin-update-user/index.ts:76`, `supabase/functions/admin-update-user/index.ts:88`, `supabase/functions/admin-update-user/index.ts:92`, `supabase/functions/admin-update-user/index.ts:96`).
7. Atualiza `public.users` com service role (`supabase/functions/admin-update-user/index.ts:104`).
8. Sincroniza metadados no Auth (`supabase/functions/admin-update-user/index.ts:122`).

Chamada no app:

- `src/features/admin/AdminUsersScreen.tsx:75`.
- `src/services/admin.ts:5`.

## Edge Function: `asaas-checkout`

Local: `supabase/functions/asaas-checkout/index.ts`.

Objetivo: criar cliente/cobranca no Asaas e registrar uma compra pendente em `student_plans`.

Fluxo:

1. Le `ASAAS_API_KEY` (`supabase/functions/asaas-checkout/index.ts:4`).
2. Define endpoint Asaas (`supabase/functions/asaas-checkout/index.ts:5`).
3. Cria client Supabase com service role (`supabase/functions/asaas-checkout/index.ts:16`).
4. Recebe `planId`, `studentId`, `paymentMethod` e `installments` (`supabase/functions/asaas-checkout/index.ts:21`).
5. Busca usuario e plano (`supabase/functions/asaas-checkout/index.ts:24`).
6. Cria cliente no Asaas se nao existir (`supabase/functions/asaas-checkout/index.ts:31`, `supabase/functions/asaas-checkout/index.ts:32`).
7. Cria pagamento no Asaas (`supabase/functions/asaas-checkout/index.ts:48`).
8. Insere registro em `student_plans` com `status: pending_payment` e `asaas_payment_id` (`supabase/functions/asaas-checkout/index.ts:65`).

Variaveis necessarias no ambiente da Edge Function:

- `ASAAS_API_KEY`.
- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY`.

## Integracao com Asaas

A integracao Asaas esta concentrada na Edge Function `asaas-checkout`. Ela usa:

- Endpoint `https://api.asaas.com/v3`.
- `customers` para criar cliente.
- `payments` para criar cobranca.

Referencia: `supabase/functions/asaas-checkout/index.ts:5`, `supabase/functions/asaas-checkout/index.ts:32`, `supabase/functions/asaas-checkout/index.ts:48`.

## Deep Links

O app usa o scheme `diamondx` (`app.json:5`).

`src/features/auth/deep-links.ts` trata links iniciais e eventos de URL. Se a URL trouxer `access_token` e `refresh_token` no fragmento, o app chama `supabase.auth.setSession()` (`src/features/auth/deep-links.ts:5`, `src/features/auth/deep-links.ts:11`, `src/features/auth/deep-links.ts:17`).

Esse fluxo e usado principalmente em recuperacao de senha e sessoes vindas de redirecionamento Supabase.

## Supabase Auth

APIs usadas:

- `signInWithPassword`.
- `signUp`.
- `signOut`.
- `resetPasswordForEmail`.
- `updateUser`.
- `setSession`.
- `getSession`.
- `onAuthStateChange`.

Referencias: `src/features/auth/auth-service.ts:5`, `src/features/auth/auth-service.ts:14`, `src/features/auth/auth-service.ts:29`, `src/features/auth/auth-service.ts:34`, `src/features/auth/auth-service.ts:39`, `src/features/auth/deep-links.ts:18`, `src/providers/AuthProvider.tsx:42`, `src/providers/AuthProvider.tsx:51`.

## Supabase Storage

O bucket `avatars` e usado para avatar de usuario:

- Upload em `supabase.storage.from('avatars').upload(...)`.
- URL publica em `getPublicUrl`.
- Atualizacao de `users.avatar_url`.

Referencias: `src/features/profile/ProfileScreen.tsx:108`, `src/features/profile/ProfileScreen.tsx:111`, `src/features/profile/ProfileScreen.tsx:112`.

## APIs Internas por Services

- `usersService.getProfile()` e `updateProfile()` (`src/services/users.ts:3`).
- `plansService.getActivePlans()` e `getStudentPlan()` (`src/services/plans.ts:3`).
- `attendanceService.getUserAttendance()` e `checkIn()` (`src/services/attendance.ts:3`).
- `trainingSessionsService.getSessions()` (`src/services/trainingSessions.ts:3`).
- `trainingReservationsService.getUserReservations()`, `reserve()` e `cancel()` (`src/services/trainingReservations.ts:3`).
- `responsibleLinksService.getLinkedStudents()` (`src/services/responsibleLinks.ts:3`).
- `adminService.updateUserRole()` (`src/services/admin.ts:3`).

## Permissoes Nativas Relacionadas

- Camera: usada para QR scanner, configurada no plugin `expo-camera` (`app.json:29`, `app.json:32`).
- Galeria/camera de fotos: usada para avatar, configurada no plugin `expo-image-picker` (`app.json:35`, `app.json:38`, `app.json:39`).

