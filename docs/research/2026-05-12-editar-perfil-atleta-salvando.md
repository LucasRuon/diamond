---
date: 2026-05-12T11:28:16-03:00
researcher: Codex
git_commit: d9bd67a780448780f1941298626a3b42f9858afc
branch: work
repository: Diamond
topic: "$research-codebase editar perfil do atleta fica só como \"salvando...\""
tags: [research, codebase]
status: complete
last_updated: 2026-05-12
last_updated_by: Codex
---

# Research: editar perfil do atleta fica só como "salvando..."

**Date**: 2026-05-12T11:28:16-03:00
**Researcher**: Codex
**Git Commit**: d9bd67a780448780f1941298626a3b42f9858afc
**Branch**: work
**Repository**: Diamond

## Research Question
$research-codebase editar perfil do atleta fica só como "salvando..."

## Scope
This research covers the current local code paths that can be described as editing an athlete profile:

- Athlete self-service profile editing in `#profile`, including personal data and "Ficha do Atleta".
- Admin editing an athlete user from `#users`.
- The shared bottom-sheet submit helper that changes the button to `SALVANDO...`.
- Local Supabase client, RLS migration context, Edge Function code, existing TestSprite test/report, and related research/spec documents.

It excludes live browser reproduction, browser console/network capture, remote Supabase database inspection, and deployed Edge Function verification.

## Summary
The text `SALVANDO...` is set only by the shared bottom-sheet submit handler in `js/ui.js`. That handler disables the submit button, awaits the page-specific `onSave(data)` callback, then closes the sheet on success or restores the button if the callback throws (`js/ui.js:52`, `js/ui.js:57`, `js/ui.js:59`, `js/ui.js:60`, `js/ui.js:62`, `js/ui.js:63`, `js/ui.js:64`, `js/ui.js:65`, `js/ui.js:67`, `js/ui.js:68`).

For the athlete's own `Editar Perfil` form, the awaited operations are: update `public.users`, update Supabase Auth metadata, then reload the profile from `public.users` and possibly `clubs` (`js/app.js:1017`, `js/app.js:1032`, `js/app.js:1040`, `js/app.js:1047`, `js/app.js:1052`, `js/app.js:199`, `js/app.js:206`, `js/app.js:232`, `js/app.js:235`, `js/app.js:239`). If those awaited calls return an error and the callback throws, `js/ui.js` restores the button. If one of them remains pending, the button remains in `SALVANDO...` because `close()` or the catch block is not reached.

For the admin editing an athlete in `#users`, the bottom sheet awaits `supabase.functions.invoke('admin-update-user', ...)`; after a successful response, `this.loadUsers(...)` is called without `await`, so a permanent `SALVANDO...` state in that flow points to work before the callback resolves, especially the Edge Function invocation or client-side validation path (`js/pages/admin/users.js:176`, `js/pages/admin/users.js:194`, `js/pages/admin/users.js:205`, `js/pages/admin/users.js:210`, `js/pages/admin/users.js:215`, `js/pages/admin/users.js:219`).

## Detailed Findings

### Shared Bottom Sheet Submit
- `ui.bottomSheet.show()` appends `#sheet-overlay`, injects supplied HTML into `.sheet-body`, and looks for the first `form` in the overlay (`js/ui.js:19`, `js/ui.js:20`, `js/ui.js:23`, `js/ui.js:30`, `js/ui.js:36`, `js/ui.js:50`).
- On form submit, it prevents default submission, creates `FormData`, converts entries to an object, finds the submit button, stores `originalText`, disables the button, and changes the label to `<i class="ph ph-circle-notch-bold"></i> SALVANDO...` (`js/ui.js:52`, `js/ui.js:53`, `js/ui.js:54`, `js/ui.js:55`, `js/ui.js:57`, `js/ui.js:58`, `js/ui.js:59`, `js/ui.js:60`).
- The sheet closes only after `await onSave(data)` resolves (`js/ui.js:62`, `js/ui.js:63`, `js/ui.js:64`).
- If `onSave(data)` throws, the generic catch logs `[bottomSheet] onSave error:`, re-enables the button, and restores `originalText` (`js/ui.js:65`, `js/ui.js:66`, `js/ui.js:67`, `js/ui.js:68`).
- The bottom-sheet catch does not show a toast. User-visible errors depend on the page-specific callback calling `toast.show()` before throwing (`js/ui.js:65`, `js/ui.js:66`, `js/auth.js:43`, `js/auth.js:44`, `js/auth.js:47`, `js/auth.js:49`).

### Athlete Self-Service Personal Profile Flow
- The `#profile` route currently reloads the profile before rendering: `case '#profile': await this.loadProfile(); this.renderProfile();` (`js/app.js:280`, `js/app.js:316`, `js/app.js:334`).
- `loadProfile()` selects the current `users` row with the related club fields, assigns `this.profile`, falls back to a plain `users` select on relation errors, normalizes array club relations, then calls `loadProfileClub()` (`js/app.js:199`, `js/app.js:206`, `js/app.js:208`, `js/app.js:209`, `js/app.js:212`, `js/app.js:213`, `js/app.js:216`, `js/app.js:218`, `js/app.js:222`, `js/app.js:229`, `js/app.js:232`).
- `loadProfileClub()` can issue a second query to `clubs` when `this.profile.club_id` exists and `this.profile.club` is not already loaded (`js/app.js:235`, `js/app.js:236`, `js/app.js:239`, `js/app.js:240`, `js/app.js:242`, `js/app.js:244`, `js/app.js:246`).
- `renderProfile()` renders `DADOS PESSOAIS` and wires `#edit-profile-btn` to `showEditProfileForm()` (`js/app.js:670`, `js/app.js:695`, `js/app.js:697`, `js/app.js:698`, `js/app.js:799`).
- `showEditProfileForm()` builds `#edit-profile-form` with `full_name`, `cpf`, `phone`, and `SALVAR ALTERAÇÕES`, then passes the form to `ui.bottomSheet.show('Editar Perfil', ...)` (`js/app.js:998`, `js/app.js:1000`, `js/app.js:1003`, `js/app.js:1007`, `js/app.js:1011`, `js/app.js:1013`, `js/app.js:1017`).
- The save callback trims `full_name`, `cpf`, and `phone`, validates required name and CPF, then updates `public.users` for `id = this.user.id` with `full_name`, `cpf`, `phone`, and `updated_at` (`js/app.js:1018`, `js/app.js:1019`, `js/app.js:1020`, `js/app.js:1022`, `js/app.js:1027`, `js/app.js:1032`, `js/app.js:1033`, `js/app.js:1035`, `js/app.js:1036`, `js/app.js:1037`, `js/app.js:1038`, `js/app.js:1040`).
- If the table update returns an error, the callback shows `Erro ao atualizar: ...` and throws, which lets `ui.bottomSheet.show()` restore the button (`js/app.js:1042`, `js/app.js:1043`, `js/app.js:1044`, `js/ui.js:65`, `js/ui.js:67`, `js/ui.js:68`).
- After the table update, the callback awaits `supabase.auth.updateUser({ data: { full_name } })`, then shows `Alteracoes salvas com sucesso`, awaits `loadProfile()`, and calls `this.render()` without awaiting it (`js/app.js:1047`, `js/app.js:1048`, `js/app.js:1051`, `js/app.js:1052`, `js/app.js:1053`).

### Athlete "Ficha do Atleta" Flow
- The student-only profile card renders "FICHA DO ATLETA" and wires `#edit-anamnese-btn` to `showEditAnamneseForm()` (`js/app.js:710`, `js/app.js:713`, `js/app.js:714`, `js/app.js:814`, `js/app.js:815`, `js/app.js:817`).
- `showEditAnamneseForm()` builds `#edit-anamnese-form` with birth date, linked club display, weight, height, and athlete record URL, then passes it to the same bottom-sheet helper (`js/app.js:903`, `js/app.js:905`, `js/app.js:907`, `js/app.js:911`, `js/app.js:922`, `js/app.js:927`, `js/app.js:932`, `js/app.js:934`, `js/app.js:938`).
- The save callback updates `public.users` for the current user with `birth_date`, `weight_kg`, `height_cm`, `athlete_record_url`, and `updated_at`, then awaits `loadProfile()` and calls `this.render()` (`js/app.js:939`, `js/app.js:940`, `js/app.js:941`, `js/app.js:942`, `js/app.js:943`, `js/app.js:944`, `js/app.js:947`, `js/app.js:953`, `js/app.js:954`, `js/app.js:955`).
- This flow does not call `supabase.auth.updateUser()`, so its awaited Supabase operations are the table update and profile reload (`js/app.js:947`, `js/app.js:954`).

### Admin Editing An Athlete User
- `adminUsers.render()` loads active clubs asynchronously and calls `loadUsers()` for the user list (`js/pages/admin/users.js:10`, `js/pages/admin/users.js:37`, `js/pages/admin/users.js:38`).
- `loadUsers()` selects users with the related club name, renders athlete cards, and calls `setupEditEvents(users)` (`js/pages/admin/users.js:46`, `js/pages/admin/users.js:50`, `js/pages/admin/users.js:56`, `js/pages/admin/users.js:68`, `js/pages/admin/users.js:77`, `js/pages/admin/users.js:92`).
- Clicking a user card calls `showEditUserForm(user)` (`js/pages/admin/users.js:115`, `js/pages/admin/users.js:116`, `js/pages/admin/users.js:117`, `js/pages/admin/users.js:119`, `js/pages/admin/users.js:120`).
- For users whose current role is `student`, the form includes `CLUBE VINCULADO` with `select[name="club_id"]` and submits through the shared bottom-sheet handler (`js/pages/admin/users.js:132`, `js/pages/admin/users.js:134`, `js/pages/admin/users.js:145`, `js/pages/admin/users.js:162`, `js/pages/admin/users.js:165`, `js/pages/admin/users.js:171`, `js/pages/admin/users.js:176`).
- The save callback validates full name and CPF, computes `clubId` only when the selected role is `student`, then awaits `supabase.functions.invoke('admin-update-user', ...)` with `userId`, `full_name`, `role`, `cpf`, `phone`, and `club_id` (`js/pages/admin/users.js:177`, `js/pages/admin/users.js:187`, `js/pages/admin/users.js:192`, `js/pages/admin/users.js:194`, `js/pages/admin/users.js:196`, `js/pages/admin/users.js:197`, `js/pages/admin/users.js:198`, `js/pages/admin/users.js:199`, `js/pages/admin/users.js:200`, `js/pages/admin/users.js:201`).
- If `invoke` returns `error` or a response body with `error`, the callback shows a toast and throws; otherwise it shows `Usuário atualizado com sucesso!` and calls `this.loadUsers(...)` without awaiting it (`js/pages/admin/users.js:205`, `js/pages/admin/users.js:206`, `js/pages/admin/users.js:207`, `js/pages/admin/users.js:210`, `js/pages/admin/users.js:211`, `js/pages/admin/users.js:212`, `js/pages/admin/users.js:215`, `js/pages/admin/users.js:219`).
- The Edge Function validates method, environment variables, Authorization header, caller identity, and admin role before parsing and validating the payload (`supabase/functions/admin-update-user/index.ts:25`, `supabase/functions/admin-update-user/index.ts:28`, `supabase/functions/admin-update-user/index.ts:38`, `supabase/functions/admin-update-user/index.ts:42`, `supabase/functions/admin-update-user/index.ts:59`, `supabase/functions/admin-update-user/index.ts:62`, `supabase/functions/admin-update-user/index.ts:66`, `supabase/functions/admin-update-user/index.ts:72`, `supabase/functions/admin-update-user/index.ts:76`, `supabase/functions/admin-update-user/index.ts:89`, `supabase/functions/admin-update-user/index.ts:93`, `supabase/functions/admin-update-user/index.ts:97`).
- The Edge Function validates `club_id` for student users, updates `public.users` through the service-role client, optionally updates Auth metadata, and returns `{ user, metadataWarning }` (`supabase/functions/admin-update-user/index.ts:105`, `supabase/functions/admin-update-user/index.ts:109`, `supabase/functions/admin-update-user/index.ts:113`, `supabase/functions/admin-update-user/index.ts:119`, `supabase/functions/admin-update-user/index.ts:128`, `supabase/functions/admin-update-user/index.ts:130`, `supabase/functions/admin-update-user/index.ts:135`, `supabase/functions/admin-update-user/index.ts:139`, `supabase/functions/admin-update-user/index.ts:142`, `supabase/functions/admin-update-user/index.ts:147`, `supabase/functions/admin-update-user/index.ts:161`).

### Supabase And RLS Context
- The SPA uses a single Supabase client created from `window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` without a custom fetch timeout in `js/supabase.js` (`js/supabase.js:1`, `js/supabase.js:2`, `js/supabase.js:3`, `js/supabase.js:7`, `js/supabase.js:11`).
- Local RLS migration `002_rls_security.sql` enables RLS on `public.users`, allows authenticated users to select users, and allows users to update only their own row while preserving the current role (`migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:16`, `migrations/002_rls_security.sql:28`, `migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:32`, `migrations/002_rls_security.sql:38`, `migrations/002_rls_security.sql:40`, `migrations/002_rls_security.sql:42`, `migrations/002_rls_security.sql:43`, `migrations/002_rls_security.sql:45`).
- Admin updates to other users do not use this browser-side `users_update_own` policy; they go through the `admin-update-user` Edge Function and service-role Supabase client (`js/pages/admin/users.js:194`, `supabase/functions/admin-update-user/index.ts:52`, `supabase/functions/admin-update-user/index.ts:128`).

### Existing Test And Historical Context
- Current `TC026_Update_profile_information.py` logs in, opens `#profile`, opens `#edit-profile-btn`, fills valid test values, submits once, waits for `#sheet-overlay` to hide, then asserts the success text and updated fields (`testsprite_tests/TC026_Update_profile_information.py:28`, `testsprite_tests/TC026_Update_profile_information.py:33`, `testsprite_tests/TC026_Update_profile_information.py:35`, `testsprite_tests/TC026_Update_profile_information.py:37`, `testsprite_tests/TC026_Update_profile_information.py:39`, `testsprite_tests/TC026_Update_profile_information.py:40`, `testsprite_tests/TC026_Update_profile_information.py:44`, `testsprite_tests/TC026_Update_profile_information.py:45`, `testsprite_tests/TC026_Update_profile_information.py:46`, `testsprite_tests/TC026_Update_profile_information.py:47`, `testsprite_tests/TC026_Update_profile_information.py:49`, `testsprite_tests/TC026_Update_profile_information.py:50`, `testsprite_tests/TC026_Update_profile_information.py:51`, `testsprite_tests/TC026_Update_profile_information.py:52`, `testsprite_tests/TC026_Update_profile_information.py:53`).
- The older raw TestSprite report recorded TC026 failing with the edit modal still open after clicking "SALVAR ALTERAÇÕES", inputs containing submitted values, profile still showing CPF/telefone as "Não informado", and no success confirmation (`testsprite_tests/tmp/raw_report.md:309`, `testsprite_tests/tmp/raw_report.md:313`, `testsprite_tests/tmp/raw_report.md:316`, `testsprite_tests/tmp/raw_report.md:317`, `testsprite_tests/tmp/raw_report.md:318`).
- `docs/specs/2026-05-04-tc026-update-profile-information-spec.md` records the intended correction for TC026: normalize profile fields, keep CPF validation, use success text `Alteracoes salvas com sucesso`, update the test to use a valid CPF, and validate RLS only if remote evidence shows a profile update block (`docs/specs/2026-05-04-tc026-update-profile-information-spec.md:16`, `docs/specs/2026-05-04-tc026-update-profile-information-spec.md:21`, `docs/specs/2026-05-04-tc026-update-profile-information-spec.md:24`, `docs/specs/2026-05-04-tc026-update-profile-information-spec.md:25`, `docs/specs/2026-05-04-tc026-update-profile-information-spec.md:67`, `docs/specs/2026-05-04-tc026-update-profile-information-spec.md:108`, `docs/specs/2026-05-04-tc026-update-profile-information-spec.md:139`).
- `docs/research/2026-05-11-clubes-criacao-salvando.md` and `docs/research/2026-05-12-clubes-cadastro-logo.md` document the same shared bottom-sheet mechanics for a previous "SALVANDO..." report in club forms: the button changes before `await onSave(data)`, closes on success, restores on thrown error, and remains in `SALVANDO...` if the awaited promise stays pending (`docs/research/2026-05-11-clubes-criacao-salvando.md:19`, `docs/research/2026-05-11-clubes-criacao-salvando.md:30`, `docs/research/2026-05-11-clubes-criacao-salvando.md:55`, `docs/research/2026-05-11-clubes-criacao-salvando.md:56`, `docs/research/2026-05-12-clubes-cadastro-logo.md:50`, `docs/research/2026-05-12-clubes-cadastro-logo.md:51`, `docs/research/2026-05-12-clubes-cadastro-logo.md:52`, `docs/research/2026-05-12-clubes-cadastro-logo.md:53`).

## Code References
- `js/ui.js:52` - Shared bottom-sheet submit handler starts.
- `js/ui.js:60` - Exact `SALVANDO...` label is assigned.
- `js/ui.js:63` - Page-specific save callback is awaited.
- `js/ui.js:64` - Bottom sheet closes only after callback success.
- `js/ui.js:65` - Generic bottom-sheet catch starts.
- `js/app.js:334` - `#profile` reloads profile before rendering.
- `js/app.js:998` - Athlete self-service personal-profile edit form starts.
- `js/app.js:1017` - Personal-profile save callback is registered.
- `js/app.js:1032` - Personal-profile update to `public.users` starts.
- `js/app.js:1047` - Personal-profile Auth metadata update starts.
- `js/app.js:1052` - Personal-profile save awaits `loadProfile()`.
- `js/app.js:903` - Athlete ficha edit form starts.
- `js/app.js:947` - Athlete ficha update to `public.users` starts.
- `js/pages/admin/users.js:176` - Admin user edit save callback is registered.
- `js/pages/admin/users.js:194` - Admin edit awaits `admin-update-user`.
- `supabase/functions/admin-update-user/index.ts:128` - Edge Function service-role profile update starts.
- `migrations/002_rls_security.sql:40` - Current local own-user update RLS policy starts.
- `testsprite_tests/TC026_Update_profile_information.py:47` - Current TC026 submits profile edit once.
- `testsprite_tests/tmp/raw_report.md:316` - Older TestSprite raw report recorded the modal staying open.

## Architecture Documentation
Athlete self-service personal data path:

`#profile` -> `loadProfile()` -> `renderProfile()` -> `#edit-profile-btn` -> `showEditProfileForm()` -> `ui.bottomSheet.show()` -> submit sets `SALVANDO...` -> validate name/CPF -> `supabase.from('users').update(...).eq('id', this.user.id)` -> `supabase.auth.updateUser({ data: { full_name } })` -> success toast -> `loadProfile()` -> `this.render()` -> bottom sheet helper closes overlay when callback resolves.

Athlete ficha path:

`#profile` -> `renderProfile()` student card -> `#edit-anamnese-btn` -> `showEditAnamneseForm()` -> `ui.bottomSheet.show()` -> submit sets `SALVANDO...` -> `supabase.from('users').update(ficha fields).eq('id', this.user.id)` -> success toast -> `loadProfile()` -> `this.render()` -> bottom sheet helper closes overlay when callback resolves.

Admin athlete edit path:

`#users` -> `adminUsers.render()` -> `loadUsers()` -> athlete card click -> `showEditUserForm(user)` -> `ui.bottomSheet.show()` -> submit sets `SALVANDO...` -> validate name/CPF -> `supabase.functions.invoke('admin-update-user', body)` -> Edge Function validates admin and payload -> service-role update of `public.users` -> optional Auth metadata update -> success toast -> `this.loadUsers(...)` called without await -> bottom sheet helper closes overlay when callback resolves.

## Historical Context
- `docs/research/2026-05-04-TC026-update-profile-information.md` documented an earlier TC026/profile-edit state. The live code now has updated line numbers, success text, valid CPF test data, one submit in the test, and `#profile` reloads the profile before rendering.
- `docs/specs/2026-05-04-tc026-update-profile-information-spec.md` describes the profile edit correction plan and the remaining need to validate remote RLS/profile-row state when remote evidence is available.
- `docs/research/2026-05-11-clubes-criacao-salvando.md` and `docs/research/2026-05-12-clubes-cadastro-logo.md` document the same generic bottom-sheet `SALVANDO...` behavior in a different admin form.

## Related Research
- `docs/research/2026-05-04-TC026-update-profile-information.md` - Earlier profile update flow and TC026 context.
- `docs/research/2026-05-11-clubes-criacao-salvando.md` - Earlier "SALVANDO..." research for club creation.
- `docs/research/2026-05-12-clubes-cadastro-logo.md` - Current club form and shared bottom-sheet submit behavior.
- `docs/research/2026-05-11-clubes-vinculados-alunos.md` - Admin athlete/club linking and athlete profile display context.

## Open Questions
- The remote Supabase project was not inspected, so this research cannot confirm whether `public.users` RLS, the `users` row for the current athlete, the `clubs` relation, or the deployed `admin-update-user` function match the local code.
- Browser console and network traces were not captured, so this research cannot identify which awaited request is pending in the reported session.
- The current TC026 file has been updated from the older failed report, but it was not executed during this research.
