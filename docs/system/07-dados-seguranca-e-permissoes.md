---
date: 2026-05-09T23:17:26-03:00
researcher: Codex
git_commit: f040e1066ee18231c2bf20f4b0c78c5442423f8a
branch: diamond-expo
repository: Diamond-expo
topic: "Dados, seguranca e permissoes do Diamond X"
tags: [documentation, data, security, permissions]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Dados, Seguranca e Permissoes

## Roles

O sistema trabalha com:

- `admin`.
- `responsible`.
- `businessman`.
- `student`.

Esses roles aparecem em `src/utils/roles.ts` (`src/utils/roles.ts:1`). A migration `002_rls_security.sql` adiciona `businessman` ao enum `user_role`, se ainda nao existir (`migrations/002_rls_security.sql:7`).

## Guardas no Frontend

O frontend redireciona usuarios pelo role:

- `app/index.tsx` decide a area inicial (`app/index.tsx:21`).
- Layouts de aluno, responsavel e admin redirecionam para login se nao houver sessao (`app/(student)/_layout.tsx:10`, `app/(responsible)/_layout.tsx:10`, `app/(admin)/_layout.tsx:10`).

Esses guardas melhoram a experiencia, mas nao substituem RLS.

## Autorizacao Real

A autorizacao real fica no Supabase:

- Politicas RLS nas tabelas.
- Edge Function `admin-update-user` para operacoes administrativas privilegiadas.

RLS e habilitado nas tabelas principais em `migrations/002_rls_security.sql` (`migrations/002_rls_security.sql:15`).

## Politicas por Tabela

### `users`

- Usuarios autenticados podem ler usuarios.
- Usuario pode atualizar apenas seus proprios dados.
- Role deve permanecer igual no update do proprio usuario.

Referencias: `migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:40`.

### `attendance`

- Aluno ve suas presencas.
- Responsavel ve presencas dos alunos vinculados.
- Admin ve tudo.
- Insert permitido para aluno autenticado ou admin.
- Delete permitido para admin.

Referencias: `migrations/002_rls_security.sql:56`, `migrations/002_rls_security.sql:69`, `migrations/002_rls_security.sql:78`.

### `student_plans`

- Aluno ve seus planos.
- Comprador ve o que comprou.
- Admin ve tudo.
- Insert permitido para aluno, comprador ou admin.
- Update permitido para admin.

Referencias: `migrations/002_rls_security.sql:94`, `migrations/002_rls_security.sql:104`, `migrations/002_rls_security.sql:114`.

### `plans`

- Leitura para usuarios autenticados.
- Escrita apenas para admins.

Referencias: `migrations/002_rls_security.sql:129`, `migrations/002_rls_security.sql:133`.

### `training_sessions`

- Leitura para usuarios autenticados.
- Escrita apenas para admins.

Referencias: `migrations/002_rls_security.sql:147`, `migrations/002_rls_security.sql:151`.

### `responsible_students`

- Responsavel, aluno vinculado e admin podem ler.
- Insert permitido para responsavel, empresario ou admin.
- Delete permitido para o proprio responsavel ou admin.

Referencias: `migrations/002_rls_security.sql:165`, `migrations/002_rls_security.sql:175`, `migrations/005_responsible_students_delete_policy.sql:12`.

### `training_reservations`

- Aluno, responsavel vinculado e admin podem ler.
- Insert exige aluno autenticado, status `booked`, plano ativo e sessao pelo menos 24 horas no futuro.
- Update permite cancelamento pelo aluno ou alteracao por admin.

Referencias: `migrations/003_training_reservations.sql:31`, `migrations/003_training_reservations.sql:46`, `migrations/003_training_reservations.sql:63`.

## Edge Function Administrativa

`admin-update-user` protege alteracao de roles:

- Valida bearer token.
- Busca usuario chamador.
- Busca perfil do chamador.
- Exige `role === 'admin'`.
- Usa service role apenas dentro da funcao.

Referencias: `supabase/functions/admin-update-user/index.ts:42`, `supabase/functions/admin-update-user/index.ts:59`, `supabase/functions/admin-update-user/index.ts:66`, `supabase/functions/admin-update-user/index.ts:72`, `supabase/functions/admin-update-user/index.ts:104`.

## Perfil e Auto-escalada

O proprio usuario nao deve conseguir promover seu role. A politica `users_update_own` exige que o role novo seja igual ao role atual do usuario (`migrations/002_rls_security.sql:40`, `migrations/002_rls_security.sql:43`).

No cadastro, o trigger aceita apenas roles seguros vindos de metadata: `student`, `responsible` e `businessman`; qualquer outro vira `student` (`migrations/004_auth_users_profile_trigger.sql:16`).

## Permissoes Nativas

### Camera

Usada para QR scanner/check-in. A permissao esta declarada no plugin `expo-camera`:

```text
O Diamond X precisa de acesso a camera para ler QR Codes de check-in.
```

Referencia: `app.json:29`, `app.json:32`.

### Fotos e Camera para Avatar

Usada para upload/troca de avatar. As permissoes estao no plugin `expo-image-picker` (`app.json:35`, `app.json:38`, `app.json:39`).

## Storage

O bucket `avatars` guarda imagens de perfil. A URL publica e gravada em `users.avatar_url` (`src/features/profile/ProfileScreen.tsx:108`, `src/features/profile/ProfileScreen.tsx:111`, `src/features/profile/ProfileScreen.tsx:112`).

## Dados Sensiveis

Campos de usuario usados pelo app incluem:

- Email.
- Nome completo.
- CPF.
- Telefone.
- Avatar.
- Dados de anamnese/perfil esportivo.
- Role.

Parte desses campos aparece no tipo `UserProfile` (`src/providers/AuthProvider.tsx:5`) e em updates de perfil (`src/features/profile/ProfileScreen.tsx:55`, `src/features/profile/ProfileScreen.tsx:77`).

## Observacao de Tipagem

`src/types/database.ts` tipa apenas `users` de forma minima, mas o codigo usa varias outras tabelas (`src/types/database.ts:9`, `src/types/database.ts:12`). A seguranca runtime depende das politicas do Supabase e nao dessa tipagem.

