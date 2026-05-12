---
date: 2026-05-11T21:35:59-03:00
researcher: Codex
git_commit: 1476bdba759e240e0c99ddf69ce542f096cff1df
branch: work
repository: Diamond
topic: "$research-codebase feature para adicionar novo campo para o Clube vinculado ao Aluno. o Administrador pode adicionar os clubes em uma nova tela do admin (nome e logo do clube) e vincular esse clube ao aluno"
tags: [research, codebase]
status: complete
last_updated: 2026-05-11
last_updated_by: Codex
---

# Research: Clube vinculado ao aluno

**Date**: 2026-05-11T21:35:59-03:00
**Researcher**: Codex
**Git Commit**: 1476bdba759e240e0c99ddf69ce542f096cff1df
**Branch**: work
**Repository**: Diamond

## Research Question
$research-codebase feature para adicionar novo campo para o Clube vinculado ao Aluno. o Administrador pode adicionar os clubes em uma nova tela do admin (nome e logo do clube) e vincular esse clube ao aluno

## Scope
Included the current student profile/anamnese model, admin routing/navigation, admin user editing, Supabase RLS/migrations, Storage upload patterns, and existing admin screens that are structurally close to a club-management screen.

Assumption: "Clube vinculado ao Aluno" means a first-class club record with name and logo that can be managed by admins and associated to student users. This research documents current behavior only; it does not propose implementation changes.

## Summary
There is no first-class club entity in the current local codebase. The only club-related persistence found is the text column `public.users.current_club`, added by the anamnese migration and edited from the logged-in student's own profile form (`migrations/001_add_athlete_anamnese_fields.sql:5`, `js/app.js:852`, `js/app.js:877`, `js/app.js:884`).

Admin user management currently lists and edits users, but its edit form and Edge Function only handle `full_name`, `role`, `cpf`, and `phone`; they do not expose or update `current_club` or a club relationship (`js/pages/admin/users.js:128`, `js/pages/admin/users.js:179`, `supabase/functions/admin-update-user/index.ts:104`).

The closest current admin feature with a searchable student selector and file upload is `#student-documents`. It has a route, admin-only guard, dashboard entry point, student search, metadata table, private Storage bucket, and upload helper (`js/app.js:257`, `js/app.js:290`, `js/pages/admin/dashboard.js:50`, `js/pages/admin/studentDocuments.js:23`, `migrations/007_student_documents.sql:4`, `migrations/007_student_documents.sql:33`).

## Detailed Findings

### Current Student Profile Club Field
- `migrations/001_add_athlete_anamnese_fields.sql` adds athlete fields directly to `public.users`, including `current_club TEXT` (`migrations/001_add_athlete_anamnese_fields.sql:4`, `migrations/001_add_athlete_anamnese_fields.sql:5`, `migrations/001_add_athlete_anamnese_fields.sql:6`, `migrations/001_add_athlete_anamnese_fields.sql:7`, `migrations/001_add_athlete_anamnese_fields.sql:8`).
- The profile page renders "CLUBE ATUAL" only inside the student-only "FICHA DO ATLETA" card, using `this.profile?.current_club || 'Não informado'` (`js/app.js:662`, `js/app.js:670`, `js/app.js:671`).
- The anamnese bottom sheet exposes `current_club` as a free-text input named `current_club`, with placeholder `Ex: Flamengo Sub-17` (`js/app.js:845`, `js/app.js:852`, `js/app.js:853`, `js/app.js:854`).
- Saving that form updates the current authenticated user's own `users` row with `current_club` and other athlete fields (`js/app.js:874`, `js/app.js:875`, `js/app.js:877`, `js/app.js:884`).

### Current User And Role Model
- `app.loadProfile()` loads the current profile from `public.users` with `select('*')` and falls back to Auth metadata if no row is available (`js/app.js:196`, `js/app.js:198`, `js/app.js:199`, `js/app.js:203`).
- Registration collects full name, email, CPF, phone, and role; it does not collect athlete club data (`js/app.js:535`, `js/app.js:536`, `js/app.js:538`, `js/app.js:539`, `js/app.js:541`, `js/app.js:569`).
- The Auth trigger creates `public.users` rows from signup metadata with `id`, `email`, `full_name`, `role`, `cpf`, `phone`, and timestamps; it does not populate anamnese fields or club metadata (`migrations/004_auth_users_profile_trigger.sql:22`, `migrations/004_auth_users_profile_trigger.sql:24`, `migrations/004_auth_users_profile_trigger.sql:25`, `migrations/004_auth_users_profile_trigger.sql:26`, `migrations/004_auth_users_profile_trigger.sql:27`, `migrations/004_auth_users_profile_trigger.sql:28`).
- The original database spec describes `users` as the user/profile table and does not list a `clubs` table in the main schema section (`spec (1).md:82`, `spec (1).md:85`, `spec (1).md:86`, `spec (1).md:89`, `spec (1).md:96`, `spec (1).md:104`).

### Admin Routing And Navigation
- `js/app.js` imports admin modules at the top, including users, plans, trainings, dashboard, charges, reports, pre-training questionnaires, and student documents (`js/app.js:4`, `js/app.js:5`, `js/app.js:6`, `js/app.js:7`, `js/app.js:8`, `js/app.js:9`, `js/app.js:10`, `js/app.js:11`).
- Admin-only route protection is a static array containing `#users`, `#reports`, `#pre-training-questionnaires`, and `#student-documents` (`js/app.js:255`, `js/app.js:257`, `js/app.js:260`).
- The route switch maps those admin routes to their modules; there is currently no club route in this switch (`js/app.js:275`, `js/app.js:287`, `js/app.js:288`, `js/app.js:289`, `js/app.js:290`).
- Admin bottom navigation is also hard-coded and includes dashboard, users, trainings, pre-training questionnaires, plans, payments, and profile; it has no club item (`js/app.js:1013`, `js/app.js:1014`, `js/app.js:1015`, `js/app.js:1016`, `js/app.js:1017`, `js/app.js:1018`, `js/app.js:1019`, `js/app.js:1020`).

### Admin User Editing
- The admin users page loads all `users` rows, optionally filtering by role, and renders a card list (`js/pages/admin/users.js:43`, `js/pages/admin/users.js:47`, `js/pages/admin/users.js:49`, `js/pages/admin/users.js:53`, `js/pages/admin/users.js:65`).
- Student rows get a shortcut button to `#student-documents?studentId=<id>`, which shows the existing pattern for adding student-specific admin actions from the user list (`js/pages/admin/users.js:77`, `js/pages/admin/users.js:78`, `js/pages/admin/users.js:120`, `js/pages/admin/users.js:123`).
- `showEditUserForm(user)` renders fields for full name, read-only email, role, CPF, and phone only (`js/pages/admin/users.js:128`, `js/pages/admin/users.js:131`, `js/pages/admin/users.js:135`, `js/pages/admin/users.js:139`, `js/pages/admin/users.js:148`).
- Saving invokes `admin-update-user` with `userId`, `full_name`, `role`, `cpf`, and `phone`; no athlete or club field is sent (`js/pages/admin/users.js:179`, `js/pages/admin/users.js:181`, `js/pages/admin/users.js:182`, `js/pages/admin/users.js:183`, `js/pages/admin/users.js:184`, `js/pages/admin/users.js:185`).
- The Edge Function validates the caller as admin and updates only `full_name`, `role`, `cpf`, `phone`, and `updated_at` on `public.users` (`supabase/functions/admin-update-user/index.ts:66`, `supabase/functions/admin-update-user/index.ts:72`, `supabase/functions/admin-update-user/index.ts:104`, `supabase/functions/admin-update-user/index.ts:106`, `supabase/functions/admin-update-user/index.ts:107`, `supabase/functions/admin-update-user/index.ts:108`, `supabase/functions/admin-update-user/index.ts:109`, `supabase/functions/admin-update-user/index.ts:110`, `supabase/functions/admin-update-user/index.ts:111`).

### Existing Admin CRUD Pattern
- `js/pages/admin/plans.js` is a compact admin CRUD example: it renders a page header with logo and add button, loads records from `plans`, displays cards, and opens a bottom-sheet form for create/edit (`js/pages/admin/plans.js:6`, `js/pages/admin/plans.js:10`, `js/pages/admin/plans.js:14`, `js/pages/admin/plans.js:30`, `js/pages/admin/plans.js:49`, `js/pages/admin/plans.js:95`).
- The plan form persists directly through the browser Supabase client using `supabase.from('plans').update(...)` or `.insert(...)` (`js/pages/admin/plans.js:136`, `js/pages/admin/plans.js:137`, `js/pages/admin/plans.js:143`, `js/pages/admin/plans.js:144`, `js/pages/admin/plans.js:145`).
- `migrations/002_rls_security.sql` allows authenticated users to read plans and restricts plan writes to admins (`migrations/002_rls_security.sql:129`, `migrations/002_rls_security.sql:130`, `migrations/002_rls_security.sql:133`, `migrations/002_rls_security.sql:135`, `migrations/002_rls_security.sql:137`).

### Existing Student Selection And Upload Pattern
- `adminStudentDocuments.render(initialStudentId)` owns a two-panel admin screen with student search/list and selected-student panel (`js/pages/admin/studentDocuments.js:23`, `js/pages/admin/studentDocuments.js:32`, `js/pages/admin/studentDocuments.js:45`, `js/pages/admin/studentDocuments.js:56`).
- It loads students from `users` with selected fields and `role = 'student'`, then filters locally by name, email, CPF, or phone (`js/pages/admin/studentDocuments.js:79`, `js/pages/admin/studentDocuments.js:82`, `js/pages/admin/studentDocuments.js:84`, `js/pages/admin/studentDocuments.js:85`, `js/pages/admin/studentDocuments.js:142`, `js/pages/admin/studentDocuments.js:146`).
- When a student is selected, it updates the hash to `#student-documents?studentId=<id>`, renders the selected student's summary, and shows an upload button (`js/pages/admin/studentDocuments.js:99`, `js/pages/admin/studentDocuments.js:130`, `js/pages/admin/studentDocuments.js:198`, `js/pages/admin/studentDocuments.js:207`).
- The upload form uses a file input and calls `uploadStudentDocument(...)`, passing `studentId`, file, title, document type, visibility flag, and uploader id (`js/pages/admin/studentDocuments.js:294`, `js/pages/admin/studentDocuments.js:310`, `js/pages/admin/studentDocuments.js:325`, `js/pages/admin/studentDocuments.js:339`, `js/pages/admin/studentDocuments.js:340`, `js/pages/admin/studentDocuments.js:341`, `js/pages/admin/studentDocuments.js:345`).
- `js/studentDocuments.js` centralizes upload validation, Storage upload, metadata insert, signed URL creation, and archive behavior for student documents (`js/studentDocuments.js:3`, `js/studentDocuments.js:90`, `js/studentDocuments.js:142`, `js/studentDocuments.js:175`, `js/studentDocuments.js:199`, `js/studentDocuments.js:216`, `js/studentDocuments.js:231`).

### Storage And Logo-Adjacent Patterns
- Avatar upload is current-user-only: the hidden profile file input accepts `image/*`, uploads to the public `avatars` bucket, obtains a public URL, and stores it in `users.avatar_url` (`js/app.js:639`, `js/app.js:896`, `js/app.js:907`, `js/app.js:908`, `js/app.js:914`, `js/app.js:915`, `js/app.js:919`, `js/app.js:921`).
- Student documents use a private Storage bucket created in migration `007_student_documents.sql`, with MIME allowlist and 10 MB limit (`migrations/007_student_documents.sql:4`, `migrations/007_student_documents.sql:12`, `migrations/007_student_documents.sql:14`, `migrations/007_student_documents.sql:15`, `migrations/007_student_documents.sql:16`).
- The same migration creates `public.student_documents` metadata with `storage_bucket`, `storage_path`, original filename, MIME type, file size, visibility flag, timestamps, and soft-delete column (`migrations/007_student_documents.sql:33`, `migrations/007_student_documents.sql:39`, `migrations/007_student_documents.sql:40`, `migrations/007_student_documents.sql:41`, `migrations/007_student_documents.sql:42`, `migrations/007_student_documents.sql:43`, `migrations/007_student_documents.sql:44`, `migrations/007_student_documents.sql:45`, `migrations/007_student_documents.sql:46`).
- Storage policies for `student-documents` allow admins to read/insert/delete objects, while students can read only visible active documents linked to their own `student_documents` metadata (`migrations/007_student_documents.sql:156`, `migrations/007_student_documents.sql:159`, `migrations/007_student_documents.sql:161`, `migrations/007_student_documents.sql:166`, `migrations/007_student_documents.sql:169`, `migrations/007_student_documents.sql:170`, `migrations/007_student_documents.sql:176`, `migrations/007_student_documents.sql:181`, `migrations/007_student_documents.sql:186`, `migrations/007_student_documents.sql:191`).
- No local code or migration currently defines a club-logo bucket, club table, club module, or club route. Code search for `club`, `clube`, and `current_club` found only the existing text field and product/domain references around managers and brand logos.

### RLS And Direct Browser Writes
- `public.users` has RLS enabled (`migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:16`).
- `users_select` allows any authenticated user to select from `public.users`, which supports current user listings and responsible/student-link flows (`migrations/002_rls_security.sql:28`, `migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:31`, `migrations/002_rls_security.sql:32`).
- `users_update_own` lets users update only their own row and requires the role to remain unchanged (`migrations/002_rls_security.sql:38`, `migrations/002_rls_security.sql:40`, `migrations/002_rls_security.sql:42`, `migrations/002_rls_security.sql:43`, `migrations/002_rls_security.sql:45`).
- Admin updates to other users currently go through the `admin-update-user` Edge Function and service-role client rather than a browser `users` update policy for admins (`js/pages/admin/users.js:179`, `supabase/functions/admin-update-user/index.ts:52`, `supabase/functions/admin-update-user/index.ts:104`).

### PWA Asset Registration
- The service worker pre-caches a fixed asset list that includes `js/app.js`, shared JS, pre-training modules, CSS, and icons (`service-worker.js:1`, `service-worker.js:2`, `service-worker.js:10`, `service-worker.js:11`, `service-worker.js:12`, `service-worker.js:13`, `service-worker.js:15`, `service-worker.js:17`, `service-worker.js:20`).
- The fetch handler uses network-first behavior for same-origin `.js` and `.css` requests, then updates the cache when the network response succeeds (`service-worker.js:57`, `service-worker.js:58`, `service-worker.js:62`, `service-worker.js:63`, `service-worker.js:66`, `service-worker.js:69`, `service-worker.js:72`).

## Code References
- `migrations/001_add_athlete_anamnese_fields.sql:5` - Existing club-related field is `users.current_club`.
- `js/app.js:670` - Student profile displays "CLUBE ATUAL".
- `js/app.js:852` - Student profile edit form exposes `current_club` as text input.
- `js/app.js:877` - Student profile save payload includes `current_club`.
- `js/app.js:257` - Admin-only route list.
- `js/app.js:287` - Admin route switch begins admin screen dispatch.
- `js/app.js:1013` - Admin bottom navigation items start.
- `js/pages/admin/users.js:47` - Admin users page reads from `public.users`.
- `js/pages/admin/users.js:128` - Admin user edit form starts.
- `js/pages/admin/users.js:179` - Admin user save invokes `admin-update-user`.
- `supabase/functions/admin-update-user/index.ts:104` - Service-role profile update starts.
- `js/pages/admin/plans.js:95` - Closest direct admin CRUD form pattern.
- `js/pages/admin/studentDocuments.js:79` - Existing admin student-selection query.
- `js/studentDocuments.js:142` - Existing reusable upload helper.
- `migrations/007_student_documents.sql:4` - Existing private Storage bucket creation pattern.
- `migrations/007_student_documents.sql:102` - Existing admin/student metadata select policy pattern.
- `migrations/002_rls_security.sql:40` - Users can update only their own `public.users` row through browser RLS.
- `service-worker.js:2` - Static pre-cache list starts.

## Architecture Documentation
Diamond X is a static Supabase-backed SPA. `index.html` mounts `#main-content` and `#bottom-nav`, then loads `js/app.js` as the route/controller entrypoint (`index.html:39`, `index.html:41`, `index.html:47`, `index.html:75`). `js/app.js` owns authenticated profile state, hash routing, role dispatch, bottom navigation, the current-user profile page, avatar upload, and direct imports of page modules.

Current club data path:

`student #profile` -> `renderProfile()` -> "FICHA DO ATLETA" displays `profile.current_club` -> `showEditAnamneseForm()` -> bottom-sheet text input `current_club` -> `supabase.from('users').update({ current_club }).eq('id', this.user.id)` -> `loadProfile()` -> rerender.

Current admin user-edit path:

`admin #users` -> `adminUsers.loadUsers()` -> `showEditUserForm(user)` -> `supabase.functions.invoke('admin-update-user', body)` -> Edge Function validates current caller has admin role -> service-role update of selected scalar profile fields in `public.users`.

Current admin student-file path:

`admin #student-documents` -> `adminStudentDocuments.loadStudents()` -> select a student -> `showUploadForm()` -> `uploadStudentDocument()` -> private Storage upload to `student-documents` -> metadata insert into `public.student_documents` -> signed URL opening for reads.

## Historical Context
- `docs/research/2026-05-09-project-inventory.md` previously documented the project-wide inventory, including `admin-update-user`, avatar Storage usage, and the anamnese migration adding `current_club` to `public.users` (`docs/research/2026-05-09-project-inventory.md:102`, `docs/research/2026-05-09-project-inventory.md:259`, `docs/research/2026-05-09-project-inventory.md:271`, `docs/research/2026-05-09-project-inventory.md:275`).
- `docs/specs/2026-05-11-documentos-fisicos-perfil-aluno-spec.md` describes the now-present student document feature, including creation of `public.student_documents`, the private `student-documents` bucket, admin route `#student-documents`, and a quick action from student user cards (`docs/specs/2026-05-11-documentos-fisicos-perfil-aluno-spec.md:21`, `docs/specs/2026-05-11-documentos-fisicos-perfil-aluno-spec.md:24`, `docs/specs/2026-05-11-documentos-fisicos-perfil-aluno-spec.md:54`, `docs/specs/2026-05-11-documentos-fisicos-perfil-aluno-spec.md:197`, `docs/specs/2026-05-11-documentos-fisicos-perfil-aluno-spec.md:199`).
- `docs/research/2026-05-11-documentos-fisicos-perfil-aluno.md` was written before the local student-document implementation existed. It is useful for the older baseline, but live code now includes `js/studentDocuments.js`, `js/pages/admin/studentDocuments.js`, route `#student-documents`, and migration `007_student_documents.sql`.

## Related Research
- `docs/research/2026-05-09-project-inventory.md` - Project-wide inventory of pages, routes, functions, migrations, and storage.
- `docs/research/2026-05-05-admin-user-role-change.md` - Admin user-management and role update flow.
- `docs/research/2026-05-04-TC026-update-profile-information.md` - Current profile edit and persistence behavior.
- `docs/research/2026-05-11-documentos-fisicos-perfil-aluno.md` - Older baseline for student document/profile attachment research.
- `docs/specs/2026-05-11-documentos-fisicos-perfil-aluno-spec.md` - Implementation spec for the current student document admin screen and private Storage pattern.

## Open Questions
- The remote Supabase project was not inspected, so this research cannot confirm whether unmanaged remote tables, buckets, or policies for clubs already exist outside local code and migrations.
- The local migrations do not contain the original full schema for `public.users`, `plans`, or `student_plans`; some base schema details are inferred from code and `spec (1).md`.
