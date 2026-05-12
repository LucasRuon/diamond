---
date: 2026-05-11T20:31:05-03:00
researcher: Codex
git_commit: 1476bdba759e240e0c99ddf69ce542f096cff1df
branch: work
repository: Diamond
topic: "campo para incluir documento físico (pdf, txt, img, doc etc.) dentro do perfil do Aluno via painel administrador. Ou seja, administrador acessar o painel do aluno ou adicionar o documento da ficha por alguma nova aba dentro do acesso do administrador e vincular ao aluno e também aparecer esse documento no painel do aluno."
tags: [research, codebase]
status: complete
last_updated: 2026-05-11
last_updated_by: Codex
---

# Research: campo para incluir documento físico no perfil do Aluno

**Date**: 2026-05-11T20:31:05-03:00
**Researcher**: Codex
**Git Commit**: 1476bdba759e240e0c99ddf69ce542f096cff1df
**Branch**: work
**Repository**: Diamond

## Research Question
campo para incluir documento físico (pdf, txt, img, doc etc.) dentro do perfil do Aluno via painel administrador. Ou seja, administrador acessar o painel do aluno ou adicionar o documento da ficha por alguma nova aba dentro do acesso do administrador e vincular ao aluno e também aparecer esse documento no painel do aluno.

## Scope
Included: current hash routes, the shared profile/anamnese screen, admin user management, student dashboard/profile visibility, Supabase `users` schema migrations, RLS policies, the admin update Edge Function, and existing Supabase Storage usage.

Excluded: live Supabase Dashboard inspection, browser execution, remote bucket/policy inspection, and implementation design.

Assumption: "documento físico" means uploaded or linked external files such as PDF, TXT, image, DOC/DOCX, or similar documents associated with a student profile.

## Summary
The current codebase does not have a student document upload/list feature managed by administrators. The closest existing field is `users.athlete_record_url`, added by the athlete anamnese migration and edited only from the logged-in student's own profile screen as a URL text field. When present, the student profile renders it as "VER FICHA COMPLETA".

The only current file upload flow is avatar upload: the profile page accepts `image/*`, uploads to the Supabase Storage bucket `avatars`, gets a public URL, and stores it in `users.avatar_url`. There is no local migration, route, page, table, or admin form for uploading arbitrary student documents or linking multiple files to a student.

The admin users screen can list users and open an edit bottom sheet, but that form only edits name, role, CPF, and phone through the `admin-update-user` Edge Function. The function also only accepts and persists those same fields.

## Detailed Findings

### Router And Role Entry Points
- `js/app.js` imports admin, student, and responsible modules and centralizes routing in `render()` (`js/app.js:4`, `js/app.js:10`, `js/app.js:11`, `js/app.js:15`, `js/app.js:230`).
- The relevant authenticated routes are `#dashboard`, `#attendance`, `#pre-training-questionnaire`, `#students`, `#users`, `#reports`, `#pre-training-questionnaires`, and `#profile` (`js/app.js:271`, `js/app.js:273`, `js/app.js:274`, `js/app.js:275`, `js/app.js:278`, `js/app.js:279`, `js/app.js:280`, `js/app.js:281`).
- Admin-only route guards currently include `#users`, `#reports`, and `#pre-training-questionnaires`; there is no dedicated route for student documents or an admin student profile route (`js/app.js:247`, `js/app.js:248`, `js/app.js:251`).
- `#profile` is shared and renders `app.renderProfile()` for the current authenticated user, not an arbitrary student selected by admin (`js/app.js:281`, `js/app.js:617`).

### Current Student Profile And Athlete Record Field
- The profile renderer builds an avatar header, personal data card, role-specific cards, and logout button from `this.profile` and `this.user` (`js/app.js:617`, `js/app.js:621`, `js/app.js:637`, `js/app.js:698`, `js/app.js:717`).
- The "FICHA DO ATLETA" card is conditional on `currentRole === 'student'`, so it appears only when the current logged-in profile is a student (`js/app.js:619`, `js/app.js:652`, `js/app.js:653`).
- That card displays birth date, current club, weight, height, and a link only when `this.profile?.athlete_record_url` exists (`js/app.js:658`, `js/app.js:660`, `js/app.js:664`, `js/app.js:668`, `js/app.js:672`).
- The rendered link uses `safeUrl(this.profile.athlete_record_url)`, opens in a new tab, and labels the link "VER FICHA COMPLETA" (`js/app.js:672`, `js/app.js:673`, `js/app.js:674`).
- `showEditAnamneseForm()` exposes `athlete_record_url` as an `<input type="url">` named `athlete_record_url`; it is not a file input (`js/app.js:743`, `js/app.js:764`, `js/app.js:766`).
- Saving the anamnese form updates the current user's own `users` row with `birth_date`, `current_club`, `weight_kg`, `height_cm`, `athlete_record_url`, and `updated_at` (`js/app.js:772`, `js/app.js:773`, `js/app.js:774`, `js/app.js:775`, `js/app.js:776`, `js/app.js:777`, `js/app.js:778`, `js/app.js:782`).

### Admin User Management
- The admin users page lists all rows from `users` and optionally filters by `role` (`js/pages/admin/users.js:43`, `js/pages/admin/users.js:47`, `js/pages/admin/users.js:49`, `js/pages/admin/users.js:53`).
- Each listed user card opens `showEditUserForm(user)` (`js/pages/admin/users.js:106`, `js/pages/admin/users.js:109`, `js/pages/admin/users.js:110`, `js/pages/admin/users.js:111`).
- The admin edit form contains fields for full name, read-only email, role, CPF, and phone; it does not include athlete anamnese fields, `athlete_record_url`, or a document/file input (`js/pages/admin/users.js:116`, `js/pages/admin/users.js:119`, `js/pages/admin/users.js:123`, `js/pages/admin/users.js:127`, `js/pages/admin/users.js:136`, `js/pages/admin/users.js:146`).
- On save, the admin users page invokes the `admin-update-user` Supabase Edge Function with `userId`, `full_name`, `role`, `cpf`, and `phone` only (`js/pages/admin/users.js:167`, `js/pages/admin/users.js:168`, `js/pages/admin/users.js:169`, `js/pages/admin/users.js:170`, `js/pages/admin/users.js:171`, `js/pages/admin/users.js:172`, `js/pages/admin/users.js:173`).
- `supabase/functions/admin-update-user/index.ts` validates the caller as admin, then updates `users.full_name`, `users.role`, `users.cpf`, `users.phone`, and `updated_at` only (`supabase/functions/admin-update-user/index.ts:66`, `supabase/functions/admin-update-user/index.ts:72`, `supabase/functions/admin-update-user/index.ts:104`, `supabase/functions/admin-update-user/index.ts:106`, `supabase/functions/admin-update-user/index.ts:107`, `supabase/functions/admin-update-user/index.ts:108`, `supabase/functions/admin-update-user/index.ts:109`, `supabase/functions/admin-update-user/index.ts:110`, `supabase/functions/admin-update-user/index.ts:111`).
- The function returns a selected user payload containing `id`, `email`, `full_name`, `role`, `cpf`, `phone`, and `updated_at`; no document or athlete record columns are selected (`supabase/functions/admin-update-user/index.ts:113`, `supabase/functions/admin-update-user/index.ts:114`, `supabase/functions/admin-update-user/index.ts:136`).

### Student Dashboard And Linked Student Views
- The student dashboard shows plan status, monthly attendance count, next training, and linked responsible contact; it does not read or render athlete document data (`js/pages/student/dashboard.js:5`, `js/pages/student/dashboard.js:38`, `js/pages/student/dashboard.js:97`, `js/pages/student/dashboard.js:141`).
- Responsible/business users can list linked students and open attendance or trainings links, but the linked student list only selects `full_name`, `email`, and `role` from each student (`js/pages/responsible/students.js:31`, `js/pages/responsible/students.js:33`, `js/pages/responsible/students.js:35`, `js/pages/responsible/students.js:36`, `js/pages/responsible/students.js:37`, `js/pages/responsible/students.js:38`, `js/pages/responsible/students.js:70`).
- Responsible/business dashboards also select linked student `full_name` and `email`, plus plan status; they do not select profile document fields (`js/pages/responsible/dashboard.js:44`, `js/pages/responsible/dashboard.js:46`, `js/pages/responsible/dashboard.js:48`, `js/pages/responsible/dashboard.js:49`, `js/pages/responsible/dashboard.js:50`, `js/pages/responsible/dashboard.js:74`).
- The admin dashboard shows counts, estimated revenue, today's trainings, and a link to questionnaire responses; it has no student document card or upload entry point (`js/pages/admin/dashboard.js:5`, `js/pages/admin/dashboard.js:14`, `js/pages/admin/dashboard.js:25`, `js/pages/admin/dashboard.js:32`, `js/pages/admin/dashboard.js:39`, `js/pages/admin/dashboard.js:50`).

### Database Shape And RLS
- `migrations/001_add_athlete_anamnese_fields.sql` adds athlete profile columns directly to `public.users`: `birth_date`, `current_club`, `weight_kg`, `height_cm`, and `athlete_record_url` (`migrations/001_add_athlete_anamnese_fields.sql:4`, `migrations/001_add_athlete_anamnese_fields.sql:5`, `migrations/001_add_athlete_anamnese_fields.sql:6`, `migrations/001_add_athlete_anamnese_fields.sql:7`, `migrations/001_add_athlete_anamnese_fields.sql:8`).
- The local migrations do not define a separate `student_documents`, `athlete_documents`, or similar document table; the only existing athlete-record persistence field in migrations is the single `users.athlete_record_url` text column (`migrations/001_add_athlete_anamnese_fields.sql:8`).
- `migrations/002_rls_security.sql` enables RLS on core tables including `users`, but it does not include storage bucket policies or document-specific tables/policies (`migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:16`, `migrations/002_rls_security.sql:17`, `migrations/002_rls_security.sql:18`, `migrations/002_rls_security.sql:19`, `migrations/002_rls_security.sql:20`, `migrations/002_rls_security.sql:21`).
- `users_select` allows any authenticated user to read all `public.users` rows, and `users_update_own` allows users to update only their own row while preserving their role (`migrations/002_rls_security.sql:28`, `migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:31`, `migrations/002_rls_security.sql:32`, `migrations/002_rls_security.sql:38`, `migrations/002_rls_security.sql:40`, `migrations/002_rls_security.sql:42`, `migrations/002_rls_security.sql:43`, `migrations/002_rls_security.sql:45`).
- New Auth signups create `public.users` rows through `handle_new_auth_user()`, which inserts `email`, `full_name`, `role`, `cpf`, and `phone`, but not athlete anamnese or document fields (`migrations/004_auth_users_profile_trigger.sql:22`, `migrations/004_auth_users_profile_trigger.sql:24`, `migrations/004_auth_users_profile_trigger.sql:25`, `migrations/004_auth_users_profile_trigger.sql:26`, `migrations/004_auth_users_profile_trigger.sql:27`, `migrations/004_auth_users_profile_trigger.sql:28`).

### Existing Storage And File Handling
- The profile page has an avatar-only file input: `<input type="file" id="avatar-input" accept="image/*">` (`js/app.js:624`, `js/app.js:626`, `js/app.js:629`).
- `handleAvatarUpload()` reads the selected file, uploads it to Supabase Storage bucket `avatars`, gets a public URL, and writes that URL to `users.avatar_url` (`js/app.js:794`, `js/app.js:795`, `js/app.js:800`, `js/app.js:801`, `js/app.js:805`, `js/app.js:806`, `js/app.js:807`, `js/app.js:812`, `js/app.js:813`, `js/app.js:814`, `js/app.js:817`, `js/app.js:819`).
- The avatar input accepts only images and is wired from the current user's `#profile` route, not from the admin users page (`js/app.js:629`, `js/app.js:730`, `js/app.js:731`, `js/app.js:733`).
- Code search found no other uses of `supabase.storage`, no other `input type="file"` elements, and no local migration defining Supabase Storage buckets or policies for documents.

### Shared Form Infrastructure
- `ui.bottomSheet.show()` can render arbitrary form HTML, collect `FormData`, and pass a plain object to an async `onSave` callback (`js/ui.js:19`, `js/ui.js:23`, `js/ui.js:50`, `js/ui.js:54`, `js/ui.js:55`, `js/ui.js:63`).
- Existing profile and admin user edit flows use this bottom-sheet pattern, but current callbacks persist only scalar form values, not file blobs (`js/app.js:772`, `js/pages/admin/users.js:151`, `js/ui.js:54`, `js/ui.js:55`).

## Code References
- `js/app.js:187` - `loadProfile()` loads the current user's row from `public.users`.
- `js/app.js:248` - Admin route guard list has no document-management route.
- `js/app.js:617` - Shared current-user profile renderer starts.
- `js/app.js:652` - Student-only "FICHA DO ATLETA" card starts.
- `js/app.js:672` - Existing athlete record URL is rendered as "VER FICHA COMPLETA".
- `js/app.js:764` - Anamnese form exposes `athlete_record_url` as a URL input.
- `js/app.js:782` - Anamnese save updates only the logged-in user's own row.
- `js/app.js:794` - Avatar upload flow starts.
- `js/app.js:806` - Existing Storage bucket usage is `avatars`.
- `js/pages/admin/users.js:116` - Admin user edit form starts.
- `js/pages/admin/users.js:167` - Admin user save invokes `admin-update-user`.
- `supabase/functions/admin-update-user/index.ts:104` - Edge Function update starts.
- `migrations/001_add_athlete_anamnese_fields.sql:8` - Existing athlete record persistence column is `athlete_record_url`.
- `migrations/002_rls_security.sql:30` - Authenticated users can select `public.users`.
- `migrations/002_rls_security.sql:40` - Users can update only their own `public.users` row through anon-client RLS.
- `js/ui.js:19` - Shared bottom sheet form helper starts.

## Architecture Documentation
Diamond X is a static SPA using hash routes in `js/app.js` and direct Supabase browser calls through the shared client in `js/supabase.js`. Authenticated runtime profile state is centered on `public.users`: `app.loadProfile()` reads the current user's row, and role-based renderers dispatch admin, responsible/business, or student screens from `this.profile.role`.

Current athlete ficha data is stored inline on the `users` row. The existing data path is:

`student #profile` -> `renderProfile()` -> `showEditAnamneseForm()` -> `ui.bottomSheet.show()` -> `supabase.from('users').update({...}).eq('id', this.user.id)` -> `loadProfile()` -> `renderProfile()`.

Current avatar upload is a separate current-user-only storage path:

`student/admin/responsible #profile` -> hidden `avatar-input` -> `handleAvatarUpload()` -> `supabase.storage.from('avatars').upload(filePath, file)` -> `getPublicUrl(filePath)` -> `supabase.from('users').update({ avatar_url: publicUrl }).eq('id', this.user.id)`.

Current admin user management is:

`admin #users` -> `adminUsers.loadUsers()` -> `showEditUserForm(user)` -> `supabase.functions.invoke('admin-update-user', body)` -> Edge Function validates caller is admin -> service-role update of selected scalar fields in `public.users`.

## Historical Context
- `docs/research/2026-05-09-project-inventory.md` documents the same current profile and storage inventory: Profile includes personal data, student athlete profile fields, avatar upload, anamnese edit, and logout; Supabase Storage usage is the `avatars` bucket (`docs/research/2026-05-09-project-inventory.md:81`, `docs/research/2026-05-09-project-inventory.md:136`, `docs/research/2026-05-09-project-inventory.md:137`, `docs/research/2026-05-09-project-inventory.md:138`).
- `docs/research/2026-05-11-questionario-pre-treino-checkin-qrcode.md` also documented that the existing athlete profile form stores `athlete_record_url` on `users` and is not a per-check-in document or questionnaire flow (`docs/research/2026-05-11-questionario-pre-treino-checkin-qrcode.md:122`, `docs/research/2026-05-11-questionario-pre-treino-checkin-qrcode.md:124`, `docs/research/2026-05-11-questionario-pre-treino-checkin-qrcode.md:126`).

## Related Research
- `docs/research/2026-05-09-project-inventory.md` - Project-wide inventory of pages, functions, migrations, and storage usage.
- `docs/research/2026-05-05-admin-user-role-change.md` - Admin user-management and role update flow.
- `docs/research/2026-05-04-TC026-update-profile-information.md` - Profile update flow and profile persistence context.
- `docs/research/2026-05-11-questionario-pre-treino-checkin-qrcode.md` - Current athlete profile/anamnese context around questionnaire implementation.

## Open Questions
- The live remote Supabase project was not inspected, so this research cannot confirm whether unmanaged remote Storage buckets or policies exist outside the local code and migrations.
