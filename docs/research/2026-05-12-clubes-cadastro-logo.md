---
date: 2026-05-12T00:27:03-03:00
researcher: Codex
git_commit: 8b267fae48a9a7d34b09700512b333c0327149fd
branch: work
repository: Diamond
topic: "$research-codebase o cadastro dos clubes está cadastrando mas com problemas, não cadastra na primeira vez, depois não salva a logo, e eu preciso ir em editar e incluir a logo."
tags: [research, codebase]
status: complete
last_updated: 2026-05-12
last_updated_by: Codex
---

# Research: Cadastro de clubes e logo

**Date**: 2026-05-12T00:27:03-03:00
**Researcher**: Codex
**Git Commit**: 8b267fae48a9a7d34b09700512b333c0327149fd
**Branch**: work
**Repository**: Diamond

## Research Question
$research-codebase o cadastro dos clubes está cadastrando mas com problemas, não cadastra na primeira vez, depois não salva a logo, e eu preciso ir em editar e incluir a logo.

## Scope
Included the current admin club creation/editing screen, shared club upload helper, bottom-sheet form handler, club table/storage migration, admin route integration, service worker cache registration, and the existing TestSprite coverage for club management.

Excluded live Supabase database inspection, deployed function versions, browser console/network traces, and manual reproduction. Assumption: the reported behavior refers to the local code path for the admin `#clubs` screen.

## Summary
The admin `#clubs` screen creates a club in two separate persistence steps: first it inserts `{ name, created_by }` into `public.clubs`, then, if a file is selected, it uploads the logo to Storage and performs a second `clubs` update with `logo_bucket` and `logo_path` (`js/pages/admin/clubs.js:180`, `js/pages/admin/clubs.js:187`, `js/pages/admin/clubs.js:189`).

The logo upload helper throws when validation or Storage upload fails, but the second database update that saves `logo_bucket/logo_path` is awaited without reading its returned `error` object in both create and edit flows (`js/clubs.js:25`, `js/clubs.js:32`, `js/clubs.js:36`, `js/pages/admin/clubs.js:169`, `js/pages/admin/clubs.js:189`). In Supabase JS, table calls return `{ data, error }`; the current code only checks `insertError` for the first insert and `updateError` for the name update (`js/pages/admin/clubs.js:161`, `js/pages/admin/clubs.js:165`, `js/pages/admin/clubs.js:180`, `js/pages/admin/clubs.js:185`).

When the initial club insert fails, the thrown error is caught by the generic bottom sheet, which logs to console and restores the button, but does not show a toast by itself (`js/ui.js:62`, `js/ui.js:65`, `js/ui.js:66`, `js/ui.js:67`, `js/ui.js:68`). Current schema constraints and RLS can reject inserts for duplicate active names or non-admin callers (`migrations/008_clubs_linked_to_students.sql:33`, `migrations/008_clubs_linked_to_students.sql:54`).

## Detailed Findings

### Admin Route And Entry Point
- `js/app.js` imports the admin clubs module and club logo helper (`js/app.js:12`, `js/app.js:13`).
- `#clubs` is included in the admin-only route list, so non-admin profiles are redirected before the page renders (`js/app.js:295`, `js/app.js:297`, `js/app.js:300`, `js/app.js:301`).
- The route switch dispatches `#clubs` to `adminClubs.render()` (`js/app.js:315`, `js/app.js:331`).
- The service worker pre-caches both `js/clubs.js` and `js/pages/admin/clubs.js` under cache version `diamondx-v13` (`service-worker.js:1`, `service-worker.js:15`, `service-worker.js:16`).

### Club List Rendering
- `adminClubs.render()` mounts the page header, add button, and `#clubs-list`, then calls `loadClubs()` (`js/pages/admin/clubs.js:12`, `js/pages/admin/clubs.js:23`, `js/pages/admin/clubs.js:29`, `js/pages/admin/clubs.js:35`).
- `loadClubs()` selects `id, name, logo_bucket, logo_path, created_at` from `clubs`, filters `deleted_at IS NULL`, and orders by name (`js/pages/admin/clubs.js:39`, `js/pages/admin/clubs.js:43`, `js/pages/admin/clubs.js:45`, `js/pages/admin/clubs.js:46`, `js/pages/admin/clubs.js:47`).
- Each card computes `logoUrl` through `getClubLogoUrl(club)` and renders either the uploaded image or a `ph-shield` placeholder (`js/pages/admin/clubs.js:64`, `js/pages/admin/clubs.js:65`, `js/pages/admin/clubs.js:70`, `js/pages/admin/clubs.js:71`, `js/pages/admin/clubs.js:72`).

### Bottom-Sheet Submit Behavior
- The shared bottom sheet finds the first form inside the overlay, intercepts submit, creates `new FormData(form)`, then converts it with `Object.fromEntries(formData.entries())` (`js/ui.js:49`, `js/ui.js:50`, `js/ui.js:52`, `js/ui.js:54`, `js/ui.js:55`).
- Before calling the page-specific save callback, it disables the submit button and changes the text to `SALVANDO...` (`js/ui.js:57`, `js/ui.js:59`, `js/ui.js:60`).
- On success, it closes the bottom sheet; on thrown error, it logs `[bottomSheet] onSave error:`, re-enables the button, and restores the original text (`js/ui.js:62`, `js/ui.js:63`, `js/ui.js:64`, `js/ui.js:65`, `js/ui.js:66`, `js/ui.js:67`, `js/ui.js:68`).
- The bottom-sheet catch does not show a toast. User-visible error messages only appear when the page-specific callback calls `toast.show()` before throwing, as it does for missing name and logo validation errors (`js/pages/admin/clubs.js:143`, `js/pages/admin/clubs.js:145`, `js/pages/admin/clubs.js:153`, `js/pages/admin/clubs.js:155`).

### Create Club Flow
- `showClubForm()` builds a form with `name="name"` and a file input `id="club-logo-file"` / `name="logo_file"` (`js/pages/admin/clubs.js:119`, `js/pages/admin/clubs.js:122`, `js/pages/admin/clubs.js:125`, `js/pages/admin/clubs.js:134`).
- The save callback reads the text name from `data.name`, but reads the selected logo directly from `document.getElementById('club-logo-file').files[0]` (`js/pages/admin/clubs.js:142`, `js/pages/admin/clubs.js:143`, `js/pages/admin/clubs.js:149`, `js/pages/admin/clubs.js:150`).
- In create mode, the callback gets the current Supabase session and requires `session.user.id` before inserting (`js/pages/admin/clubs.js:174`, `js/pages/admin/clubs.js:175`, `js/pages/admin/clubs.js:176`, `js/pages/admin/clubs.js:177`, `js/pages/admin/clubs.js:178`).
- The first database operation inserts only `name` and `created_by`, returns `id`, and throws when `insertError` exists (`js/pages/admin/clubs.js:180`, `js/pages/admin/clubs.js:182`, `js/pages/admin/clubs.js:183`, `js/pages/admin/clubs.js:184`, `js/pages/admin/clubs.js:185`).
- If a file exists, the second phase calls `uploadClubLogo({ clubId: newClub.id, file })` and then calls `supabase.from('clubs').update({ logo_bucket, logo_path }).eq('id', newClub.id)` (`js/pages/admin/clubs.js:187`, `js/pages/admin/clubs.js:188`, `js/pages/admin/clubs.js:189`).
- After the optional logo path update, the callback shows `Clube cadastrado!` and reloads the clubs list (`js/pages/admin/clubs.js:192`, `js/pages/admin/clubs.js:195`).

### Edit Club Flow
- Edit mode first updates `name` and `updated_at`, checks `updateError`, and throws if that first update fails (`js/pages/admin/clubs.js:160`, `js/pages/admin/clubs.js:161`, `js/pages/admin/clubs.js:163`, `js/pages/admin/clubs.js:164`, `js/pages/admin/clubs.js:165`).
- If a new file is selected while editing, it runs the same upload helper and then calls a second `clubs` update for `logo_bucket/logo_path` (`js/pages/admin/clubs.js:167`, `js/pages/admin/clubs.js:168`, `js/pages/admin/clubs.js:169`).
- The second logo metadata update in edit mode is also awaited without inspecting the returned `{ error }` (`js/pages/admin/clubs.js:169`).

### Shared Logo Helper
- `js/clubs.js` defines `CLUB_LOGO_BUCKET = 'club-logos'`, a 2 MB max size, and an allowlist of JPEG, PNG, WebP, and SVG MIME types (`js/clubs.js:3`, `js/clubs.js:4`, `js/clubs.js:5`).
- `validateClubLogoFile(file)` returns Portuguese validation messages for unsupported MIME type or file size over 2 MB (`js/clubs.js:7`, `js/clubs.js:9`, `js/clubs.js:10`, `js/clubs.js:12`, `js/clubs.js:13`).
- `uploadClubLogo()` validates again, sanitizes the filename, stores at `clubs/${clubId}/${Date.now()}-${safeName}`, and uploads to `club-logos` with `upsert: false` (`js/clubs.js:25`, `js/clubs.js:26`, `js/clubs.js:29`, `js/clubs.js:30`, `js/clubs.js:32`, `js/clubs.js:34`).
- If Storage returns `error`, the helper throws it; otherwise it returns `{ logo_bucket: 'club-logos', logo_path: path }` for the page to persist in `public.clubs` (`js/clubs.js:36`, `js/clubs.js:38`).
- `getClubLogoUrl(club)` returns `null` when there is no `logo_path`; otherwise it asks Supabase Storage for the public URL from `club.logo_bucket || 'club-logos'` (`js/clubs.js:18`, `js/clubs.js:19`, `js/clubs.js:20`, `js/clubs.js:21`, `js/clubs.js:22`).

### Database And Storage Rules
- Migration `008_clubs_linked_to_students.sql` creates or updates the public `club-logos` bucket with a 2 MB limit and the same MIME allowlist used by the frontend (`migrations/008_clubs_linked_to_students.sql:4`, `migrations/008_clubs_linked_to_students.sql:5`, `migrations/008_clubs_linked_to_students.sql:9`, `migrations/008_clubs_linked_to_students.sql:10`, `migrations/008_clubs_linked_to_students.sql:11`).
- The `clubs` table has `logo_bucket TEXT DEFAULT 'club-logos'`, nullable `logo_path`, and a check constraint that `logo_bucket = 'club-logos'` (`migrations/008_clubs_linked_to_students.sql:19`, `migrations/008_clubs_linked_to_students.sql:22`, `migrations/008_clubs_linked_to_students.sql:23`, `migrations/008_clubs_linked_to_students.sql:29`).
- Active club names are unique case-insensitively through `clubs_active_name_idx` where `deleted_at IS NULL` (`migrations/008_clubs_linked_to_students.sql:32`, `migrations/008_clubs_linked_to_students.sql:33`, `migrations/008_clubs_linked_to_students.sql:34`, `migrations/008_clubs_linked_to_students.sql:35`).
- RLS allows authenticated users to select non-deleted clubs, but insert/update require the current profile role to be `admin`; insert also requires `created_by = auth.uid()` (`migrations/008_clubs_linked_to_students.sql:49`, `migrations/008_clubs_linked_to_students.sql:54`, `migrations/008_clubs_linked_to_students.sql:57`, `migrations/008_clubs_linked_to_students.sql:58`, `migrations/008_clubs_linked_to_students.sql:62`, `migrations/008_clubs_linked_to_students.sql:65`).
- Storage object policies allow select for `club-logos`, while insert/update/delete require authenticated admin role (`migrations/008_clubs_linked_to_students.sql:69`, `migrations/008_clubs_linked_to_students.sql:72`, `migrations/008_clubs_linked_to_students.sql:75`, `migrations/008_clubs_linked_to_students.sql:76`, `migrations/008_clubs_linked_to_students.sql:79`, `migrations/008_clubs_linked_to_students.sql:82`, `migrations/008_clubs_linked_to_students.sql:83`).

### Existing Test Coverage
- `TC035_Admin_manage_clubs_and_link_student.py` documents the requirement that migration `008_clubs_linked_to_students.sql` is applied before the test (`testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:4`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:7`).
- The test creates a club by filling only `input[name='name']`, clicking submit, and waiting for the club name in the list (`testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:43`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:46`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:47`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:48`).
- The test then links a student to the newly created club and asserts that `select[name='club_id']` is no longer empty when reopened (`testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:50`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:62`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:70`, `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:71`).
- The test does not attach a logo file during creation and does not assert `clubs.logo_path`, card image rendering, or first-submit failure behavior.

## Code References
- `js/pages/admin/clubs.js:142` - Save callback registered for create/edit club form.
- `js/pages/admin/clubs.js:180` - Initial create insert into `public.clubs`.
- `js/pages/admin/clubs.js:185` - Only create-path Supabase table error currently checked before logo handling.
- `js/pages/admin/clubs.js:188` - Create-path logo upload call after the row exists.
- `js/pages/admin/clubs.js:189` - Create-path metadata update for `logo_bucket/logo_path`.
- `js/pages/admin/clubs.js:169` - Edit-path metadata update for `logo_bucket/logo_path`.
- `js/clubs.js:25` - Shared upload helper entry point.
- `js/clubs.js:32` - Storage upload to `club-logos`.
- `js/clubs.js:36` - Storage errors are thrown by the helper.
- `js/ui.js:54` - Generic bottom-sheet form data extraction.
- `js/ui.js:60` - Submit button switches to `SALVANDO...`.
- `js/ui.js:65` - Generic bottom-sheet catch path.
- `migrations/008_clubs_linked_to_students.sql:33` - Unique active club name index.
- `migrations/008_clubs_linked_to_students.sql:54` - Club insert RLS policy.
- `migrations/008_clubs_linked_to_students.sql:72` - Club logo Storage insert policy.
- `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py:43` - Existing test creates club without a logo file.

## Architecture Documentation
Current create path:

`admin #clubs` -> `adminClubs.render()` -> `#add-club-btn` -> `showClubForm()` -> `ui.bottomSheet.show()` -> bottom-sheet submit disables button -> page callback validates name/file -> `supabase.auth.getSession()` -> `clubs.insert({ name, created_by }).select('id').single()` -> optional `uploadClubLogo()` to Storage -> optional `clubs.update({ logo_bucket, logo_path })` -> toast -> `loadClubs()` -> cards render logo only if `logo_path` exists.

Current edit path:

`club card EDITAR` -> `showClubForm(club)` -> existing logo preview from `getClubLogoUrl(club)` -> submit -> `clubs.update({ name, updated_at })` -> optional `uploadClubLogo()` -> optional `clubs.update({ logo_bucket, logo_path })` -> toast -> `loadClubs()`.

Current error surfacing pattern:

Page-specific validation errors show toasts before throwing. Supabase errors from the first create insert and first edit update are thrown, then handled by the generic bottom-sheet catch, which only logs to console and restores the button. Supabase errors from the second `logo_bucket/logo_path` table update are not currently read by the page callback.

## Historical Context
- `docs/research/2026-05-11-clubes-criacao-salvando.md` previously documented the earlier "SALVANDO..." behavior and the same bottom-sheet mechanics. Its code snippet differs from the current code because current create mode now uses `supabase.auth.getSession()` before insert, while the older research referred to `supabase.auth.getUser()`.
- `docs/research/2026-05-11-clubes-vinculados-alunos.md` documents the broader club feature and later follow-up around profile display and header logo. The current live code now reloads profile on `#profile` before rendering (`js/app.js:332`) and renders club logo next to the Diamond logo when `profileClubLogoUrl` exists (`js/app.js:688`, `js/app.js:689`, `js/app.js:690`).
- `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md` specified the two-step create flow: insert club first, then upload logo and update `logo_bucket/logo_path` (`docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:158`, `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:162`, `docs/specs/2026-05-11-clubes-vinculados-alunos-spec.md:163`).

## Related Research
- `docs/research/2026-05-11-clubes-criacao-salvando.md` - Earlier research for club creation stuck on "SALVANDO...".
- `docs/research/2026-05-11-clubes-vinculados-alunos.md` - Broader research for club entity, student linking, and profile display.
- `docs/research/2026-05-11-admin-users-clubs-embed-error.md` - Research for ambiguous `users`/`clubs` embed relationship.

## Open Questions
- The remote Supabase project was not inspected, so this research cannot confirm whether the remote `clubs_update` policy, `club-logos` Storage policies, or `clubs_active_name_idx` exactly match the local migration.
- Browser console/network traces were not captured, so this research cannot identify the exact returned error for the reported first-attempt failure or logo metadata update failure.
- Existing TestSprite coverage does not attach a logo during club creation, so local automated evidence does not cover the reported "criar com logo" path.
