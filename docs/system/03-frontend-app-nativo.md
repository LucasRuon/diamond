---
date: 2026-05-09T23:17:26-03:00
researcher: Codex
git_commit: f040e1066ee18231c2bf20f4b0c78c5442423f8a
branch: diamond-expo
repository: Diamond-expo
topic: "Frontend nativo do Diamond X"
tags: [documentation, frontend, expo, react-native]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Frontend App Nativo

## Arquitetura do Frontend

O frontend e um app Expo Router. A arvore de rotas fica em `app/`, enquanto telas reais e componentes vivem em `src/features/` e `src/components/`.

O layout raiz carrega fontes, controla splash screen e instala providers globais (`app/_layout.tsx:17`, `app/_layout.tsx:38`). A rota inicial decide a area do usuario com base em sessao e role (`app/index.tsx:6`, `app/index.tsx:17`, `app/index.tsx:21`).

## Providers Globais

`app/_layout.tsx` instala:

- `SafeAreaProvider`.
- `ToastProvider`.
- `AuthProvider`.
- `RootApp`, que ativa deep links.

Referencias: `app/_layout.tsx:38`, `app/_layout.tsx:39`, `app/_layout.tsx:40`, `app/_layout.tsx:41`.

## Navegacao por Papel

Cada grupo de rota tem layout proprio:

- `app/(auth)/_layout.tsx` redireciona usuario autenticado para a area do role (`app/(auth)/_layout.tsx:8`).
- `app/(student)/_layout.tsx` protege sessao, define tabs de aluno e oculta tabs no scanner (`app/(student)/_layout.tsx:10`, `app/(student)/_layout.tsx:15`, `app/(student)/_layout.tsx:47`).
- `app/(responsible)/_layout.tsx` protege sessao e define tabs de responsavel (`app/(responsible)/_layout.tsx:10`, `app/(responsible)/_layout.tsx:47`).
- `app/(admin)/_layout.tsx` protege sessao e define tabs administrativas (`app/(admin)/_layout.tsx:10`, `app/(admin)/_layout.tsx:50`).

`RoleTabs` renderiza a navegacao inferior usando `lucide-react-native`, safe area e cores do tema (`src/components/layout/RoleTabs.tsx:28`, `src/components/layout/RoleTabs.tsx:36`, `src/components/layout/RoleTabs.tsx:48`).

## Telas Publicas

### Login

`app/(auth)/login.tsx` usa `DynamicAuthBackground`, campos de email/senha, `authService.signIn()` e toasts de erro (`app/(auth)/login.tsx:17`, `app/(auth)/login.tsx:25`, `app/(auth)/login.tsx:33`).

### Cadastro

`app/(auth)/register.tsx` coleta nome, email, CPF, WhatsApp e senha. Antes de cadastrar, valida email e CPF e chama `authService.signUp()` (`app/(auth)/register.tsx:22`, `app/(auth)/register.tsx:27`, `app/(auth)/register.tsx:31`, `app/(auth)/register.tsx:38`).

### Recuperacao de Senha

`app/(auth)/forgot-password.tsx` chama `authService.resetPassword()` e mostra estado de sucesso (`app/(auth)/forgot-password.tsx:17`, `app/(auth)/forgot-password.tsx:25`, `app/(auth)/forgot-password.tsx:57`).

`app/(auth)/update-password.tsx` valida confirmacao de senha e chama `authService.updatePassword()` (`app/(auth)/update-password.tsx:17`, `app/(auth)/update-password.tsx:22`, `app/(auth)/update-password.tsx:29`).

## Telas do Aluno

- `StudentDashboardScreen` mostra plano, presencas, proximo treino e responsavel (`src/features/student/StudentDashboardScreen.tsx:13`).
- `StudentTrainingsScreen` lista treinos, reservas e entrada para scanner (`src/features/student/StudentTrainingsScreen.tsx:15`).
- `StudentPlansScreen` lista planos e registra cobranca pendente (`src/features/student/StudentPlansScreen.tsx:25`).
- `StudentAttendanceScreen` mostra historico de presencas (`src/features/student/StudentAttendanceScreen.tsx:13`).
- `app/(student)/scanner.tsx` valida QR e registra check-in (`app/(student)/scanner.tsx:9`).

## Telas do Responsavel

- `ResponsibleDashboardScreen` resume alunos vinculados e planos (`src/features/responsible/ResponsibleDashboardScreen.tsx:13`).
- `ResponsibleStudentsScreen` lista, vincula e desvincula alunos (`src/features/responsible/ResponsibleStudentsScreen.tsx:15`).
- `ResponsibleTrainingsScreen` mostra treinos e reservas dos vinculados (`src/features/responsible/ResponsibleTrainingsScreen.tsx:14`).
- `ResponsiblePlansScreen` permite comprar planos para si ou para aluno vinculado (`src/features/responsible/ResponsiblePlansScreen.tsx:25`).
- `ResponsiblePaymentsScreen` lista faturas (`src/features/responsible/ResponsiblePaymentsScreen.tsx:28`).

## Telas do Admin

- `AdminDashboardScreen` mostra indicadores administrativos (`src/features/admin/AdminDashboardScreen.tsx:12`).
- `AdminUsersScreen` lista usuarios e atualiza dados via Edge Function (`src/features/admin/AdminUsersScreen.tsx:35`).
- `AdminTrainingsScreen` gerencia treinos, QR e presencas (`src/features/admin/AdminTrainingsScreen.tsx:45`).
- `AdminPlansScreen` gerencia planos (`src/features/admin/AdminPlansScreen.tsx:24`).
- `AdminChargesScreen` gerencia cobrancas (`src/features/admin/AdminChargesScreen.tsx:40`).
- `AdminReportsScreen` exibe relatorios (`src/features/admin/AdminReportsScreen.tsx:18`).

## Perfil Compartilhado

`ProfileScreen` e usado por aluno, responsavel e admin. Ele edita dados pessoais, anamnese, avatar e faz logout (`src/features/profile/ProfileScreen.tsx:29`, `src/features/profile/ProfileScreen.tsx:54`, `src/features/profile/ProfileScreen.tsx:77`, `src/features/profile/ProfileScreen.tsx:97`, `src/features/profile/ProfileScreen.tsx:119`).

## Design System

Tokens visuais ficam em `src/theme/tokens.ts`, incluindo `dxTeal`, `dxBg`, superficies, bordas, textos e status (`src/theme/tokens.ts:1`, `src/theme/tokens.ts:2`).

Componentes principais:

- `AppText`.
- `Button`.
- `TextField`.
- `FormInput`.
- `FormSelect`.
- `Card`.
- `Badge`.
- `FilterPills`.
- `BottomSheet`.
- `BottomModal`.
- `ToastProvider`.
- `PageHeader`.
- `RoleTabs`.
- `CalendarMonth`.
- `QrScanner`.
- `QrCodeDisplay`.
- `SimpleBarChart`.

## Feedback e Estado Visual

`ToastProvider` expoe `showToast(message, type)` e remove toasts apos 3 segundos (`src/components/ui/ToastProvider.tsx:20`, `src/components/ui/ToastProvider.tsx:27`, `src/components/ui/ToastProvider.tsx:31`).

## QR e Camera

O scanner do aluno fica em `app/(student)/scanner.tsx` e usa o componente `QrScanner` (`app/(student)/scanner.tsx:83`). A configuracao de permissao de camera fica em `app.json` (`app.json:29`, `app.json:32`).

