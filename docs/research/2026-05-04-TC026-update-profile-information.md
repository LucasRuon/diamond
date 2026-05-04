---
date: 2026-05-04T12:11:19-03:00
researcher: Codex
git_commit: cfecc1532f04a9b654525ba6024b8f67d952ae25
branch: main
repository: Diamond
topic: "[$research-codebase] TC026_Update_profile_information.py"
tags: [research, codebase]
status: complete
last_updated: 2026-05-04
last_updated_by: Codex
---

# Research: TC026_Update_profile_information.py

**Date**: 2026-05-04T12:11:19-03:00
**Researcher**: Codex
**Git Commit**: cfecc1532f04a9b654525ba6024b8f67d952ae25
**Branch**: main
**Repository**: Diamond

## Research Question
[$research-codebase] `testsprite_tests/TC026_Update_profile_information.py`

## Scope
This research covers the generated TestSprite Playwright test for TC026, the SPA login and profile route used by that test, the profile edit form, the bottom sheet form handler, CPF/phone masking and CPF validation helpers, Supabase profile update calls, local RLS migration context for `public.users`, and the relevant TestSprite plan/report entries.

It excludes live execution against Supabase and visual browser replay. The scope assumption is that the requested research target is how `TC026_Update_profile_information.py` maps to the current codebase behavior.

## Summary
TC026 is a Playwright test that logs into the SPA at `http://localhost:3000`, opens the profile tab from the authenticated bottom navigation, clicks the personal-data `EDITAR` button, fills the profile bottom sheet with `Lucas Silva`, `123.456.789-00`, and `(11) 91234-5678`, submits the form multiple times, then asserts that `Lucas Silva` and `Alterações salvas com sucesso` are visible (`testsprite_tests/TC026_Update_profile_information.py:33`, `testsprite_tests/TC026_Update_profile_information.py:40`, `testsprite_tests/TC026_Update_profile_information.py:45`, `testsprite_tests/TC026_Update_profile_information.py:55`, `testsprite_tests/TC026_Update_profile_information.py:61`, `testsprite_tests/TC026_Update_profile_information.py:68`, `testsprite_tests/TC026_Update_profile_information.py:73`, `testsprite_tests/TC026_Update_profile_information.py:78`, `testsprite_tests/TC026_Update_profile_information.py:82`, `testsprite_tests/TC026_Update_profile_information.py:99`, `testsprite_tests/TC026_Update_profile_information.py:100`).

The live app implements profile editing in `js/app.js`. The profile page renders the displayed name, email, CPF, and phone from `app.profile` and wires `#edit-profile-btn` to `showEditProfileForm()` (`js/app.js:579`, `js/app.js:602`, `js/app.js:605`, `js/app.js:607`, `js/app.js:609`, `js/app.js:611`, `js/app.js:683`). The edit form submits through `ui.bottomSheet.show()`, validates CPF when provided, updates `public.users` with `full_name`, `cpf`, `phone`, and `updated_at`, updates Supabase Auth metadata with `full_name`, shows `Perfil atualizado!`, reloads the profile, and re-renders the page (`js/app.js:795`, `js/app.js:814`, `js/app.js:815`, `js/app.js:819`, `js/app.js:822`, `js/app.js:823`, `js/app.js:824`, `js/app.js:825`, `js/app.js:827`, `js/app.js:834`, `js/app.js:838`, `js/app.js:839`, `js/app.js:840`).

The current TestSprite report records TC026 as failed. Its summarized finding says the update form did not persist or visually confirm changes and the modal did not close (`testsprite_tests/testsprite-mcp-test-report.md:81`, `testsprite_tests/testsprite-mcp-test-report.md:82`, `testsprite_tests/testsprite-mcp-test-report.md:84`). The raw report records that the modal inputs contained the submitted values, while the main profile still showed CPF and phone as `Não informado`, and no success message appeared (`testsprite_tests/tmp/raw_report.md:313`, `testsprite_tests/tmp/raw_report.md:316`, `testsprite_tests/tmp/raw_report.md:317`, `testsprite_tests/tmp/raw_report.md:318`).

## Detailed Findings

### Test Entry Point And Steps
- `TC026_Update_profile_information.py` defines an async Playwright flow and launches Chromium in headless mode with a 1280x720 window (`testsprite_tests/TC026_Update_profile_information.py:5`, `testsprite_tests/TC026_Update_profile_information.py:15`, `testsprite_tests/TC026_Update_profile_information.py:16`, `testsprite_tests/TC026_Update_profile_information.py:18`).
- The test opens `http://localhost:3000`, fills email `luucasruon@gmail.com`, fills password `123456789`, and clicks the login submit button through absolute XPath selectors (`testsprite_tests/TC026_Update_profile_information.py:33`, `testsprite_tests/TC026_Update_profile_information.py:34`, `testsprite_tests/TC026_Update_profile_information.py:39`, `testsprite_tests/TC026_Update_profile_information.py:40`, `testsprite_tests/TC026_Update_profile_information.py:44`, `testsprite_tests/TC026_Update_profile_information.py:45`, `testsprite_tests/TC026_Update_profile_information.py:49`, `testsprite_tests/TC026_Update_profile_information.py:50`).
- After login, it clicks `/html/body/div/nav/a[5]`, which corresponds to the student bottom-nav `Perfil` item when the authenticated role is `student` (`testsprite_tests/TC026_Update_profile_information.py:55`, `testsprite_tests/TC026_Update_profile_information.py:56`, `js/app.js:877`, `js/app.js:878`, `js/app.js:879`, `js/app.js:880`, `js/app.js:881`, `js/app.js:882`).
- The test clicks the first `EDITAR` button inside the profile page personal-data card, fills name, CPF, and phone fields in the bottom sheet, then clicks the sheet submit button three times (`testsprite_tests/TC026_Update_profile_information.py:61`, `testsprite_tests/TC026_Update_profile_information.py:62`, `testsprite_tests/TC026_Update_profile_information.py:67`, `testsprite_tests/TC026_Update_profile_information.py:68`, `testsprite_tests/TC026_Update_profile_information.py:72`, `testsprite_tests/TC026_Update_profile_information.py:73`, `testsprite_tests/TC026_Update_profile_information.py:77`, `testsprite_tests/TC026_Update_profile_information.py:78`, `testsprite_tests/TC026_Update_profile_information.py:82`, `testsprite_tests/TC026_Update_profile_information.py:83`, `testsprite_tests/TC026_Update_profile_information.py:88`, `testsprite_tests/TC026_Update_profile_information.py:89`, `testsprite_tests/TC026_Update_profile_information.py:94`, `testsprite_tests/TC026_Update_profile_information.py:95`).
- Its final assertions look for `Lucas Silva` and `Alterações salvas com sucesso` anywhere in the page text (`testsprite_tests/TC026_Update_profile_information.py:97`, `testsprite_tests/TC026_Update_profile_information.py:99`, `testsprite_tests/TC026_Update_profile_information.py:100`).

### SPA Shell And Routing
- `index.html` defines the SPA shell with `#main-content`, dynamic `#bottom-nav`, and `#toasts-container`; it loads Supabase from CDN and then loads `js/supabase.js`, `js/auth.js`, and `js/app.js` as modules (`index.html:39`, `index.html:41`, `index.html:47`, `index.html:51`, `index.html:70`, `index.html:73`, `index.html:74`, `index.html:75`).
- `app.init()` reads the Supabase auth session, stores `this.user`, loads `this.profile` when a user exists, subscribes to auth state changes, and renders the current hash route (`js/app.js:28`, `js/app.js:31`, `js/app.js:32`, `js/app.js:34`, `js/app.js:37`, `js/app.js:48`, `js/app.js:50`, `js/app.js:53`, `js/app.js:54`).
- `loadProfile()` selects the current row from `public.users` using `this.user.id`; when no row is returned it falls back to user metadata or email for `role` and `full_name` (`js/app.js:185`, `js/app.js:187`, `js/app.js:188`, `js/app.js:189`, `js/app.js:190`, `js/app.js:193`).
- `render()` redirects unauthenticated private routes to `#login`, redirects authenticated `#login` or `#register` to `#dashboard`, and routes `#profile` to `renderProfile()` (`js/app.js:197`, `js/app.js:202`, `js/app.js:203`, `js/app.js:207`, `js/app.js:208`, `js/app.js:244`).

### Login Flow Used By TC026
- `renderLogin()` hides the bottom nav and injects the login form with `#login-email`, `#login-password`, and an `ENTRAR` submit button (`js/app.js:260`, `js/app.js:261`, `js/app.js:272`, `js/app.js:273`, `js/app.js:279`, `js/app.js:281`).
- The login form handler calls `auth.login()` with the current email and password input values, then shows the `Bem-vindo!` toast when the promise resolves (`js/app.js:291`, `js/app.js:292`, `js/app.js:294`, `js/app.js:295`).
- `auth.login()` delegates directly to `supabase.auth.signInWithPassword({ email, password })`, throws any Supabase error, and returns the auth data (`js/auth.js:3`, `js/auth.js:4`, `js/auth.js:5`, `js/auth.js:6`, `js/auth.js:7`, `js/auth.js:10`, `js/auth.js:11`).
- `js/supabase.js` creates the client from a hard-coded Supabase URL and anon key when `window.supabase` exists (`js/supabase.js:1`, `js/supabase.js:2`, `js/supabase.js:3`, `js/supabase.js:7`, `js/supabase.js:11`).

### Profile Display
- `renderProfile()` computes `avatarUrl` from `profile.avatar_url` or the `ui-avatars.com` fallback and derives `currentRole` from `profile.role` or `student` (`js/app.js:579`, `js/app.js:580`, `js/app.js:581`).
- The profile header displays the authenticated user's email and the `PERFIL` title (`js/app.js:593`, `js/app.js:594`, `js/app.js:595`).
- The `DADOS PESSOAIS` card displays `this.profile.full_name`, `this.user.email`, `this.profile.cpf || 'Não informado'`, and `this.profile.phone || 'Não informado'` (`js/app.js:599`, `js/app.js:601`, `js/app.js:604`, `js/app.js:605`, `js/app.js:606`, `js/app.js:607`, `js/app.js:608`, `js/app.js:609`, `js/app.js:610`, `js/app.js:611`).
- The personal-data edit button is `#edit-profile-btn`; after the HTML is injected, the app attaches a click handler that calls `showEditProfileForm()` (`js/app.js:602`, `js/app.js:683`).

### Profile Edit Form And Data Flow
- `showEditProfileForm()` builds a form with `name="full_name"`, `name="cpf"`, `name="phone"`, and a `SALVAR ALTERAÇÕES` submit button (`js/app.js:795`, `js/app.js:797`, `js/app.js:800`, `js/app.js:804`, `js/app.js:808`, `js/app.js:810`).
- The form is passed to `ui.bottomSheet.show('Editar Perfil', formHtml, async (data) => { ... })` (`js/app.js:814`).
- Before writing to Supabase, the save callback checks `if (data.cpf && !ui.validate.cpf(data.cpf))` and throws `CPF Inválido.` when validation returns false (`js/app.js:815`, `js/app.js:816`).
- When validation passes, the callback updates `public.users` for `id = this.user.id` with `full_name`, `cpf`, `phone`, and `updated_at` (`js/app.js:819`, `js/app.js:820`, `js/app.js:821`, `js/app.js:822`, `js/app.js:823`, `js/app.js:824`, `js/app.js:825`, `js/app.js:827`).
- If Supabase returns an update error, the callback shows `Erro ao atualizar: ...` and throws the error (`js/app.js:829`, `js/app.js:830`, `js/app.js:831`).
- After the profile table update, the callback updates Supabase Auth metadata with the new `full_name`, shows `Perfil atualizado!`, reloads the profile, and re-renders the page (`js/app.js:834`, `js/app.js:835`, `js/app.js:838`, `js/app.js:839`, `js/app.js:840`).
- After opening the bottom sheet, `setTimeout()` applies CPF and phone input masks to `#edit-cpf` and `#edit-phone` (`js/app.js:843`, `js/app.js:844`, `js/app.js:845`, `js/app.js:846`).

### Bottom Sheet Submission Behavior
- `ui.bottomSheet.show()` appends `#sheet-overlay` to `document.body` and places the supplied form inside `.sheet-body` (`js/ui.js:18`, `js/ui.js:19`, `js/ui.js:20`, `js/ui.js:21`, `js/ui.js:22`, `js/ui.js:29`, `js/ui.js:30`, `js/ui.js:35`).
- On form submit, it prevents default browser submission, converts `FormData` into a plain object, disables the submit button, and changes its label to `SALVANDO...` (`js/ui.js:49`, `js/ui.js:51`, `js/ui.js:52`, `js/ui.js:53`, `js/ui.js:54`, `js/ui.js:56`, `js/ui.js:57`, `js/ui.js:58`, `js/ui.js:59`).
- It awaits the supplied `onSave(data)` callback and closes the overlay only after that callback resolves (`js/ui.js:61`, `js/ui.js:62`, `js/ui.js:63`).
- If `onSave(data)` throws, the bottom sheet catch block re-enables the button and restores its original text; no toast is emitted by this catch block (`js/ui.js:64`, `js/ui.js:65`, `js/ui.js:66`, `js/ui.js:67`).

### CPF And Phone Helpers
- `ui.mask.cpf()` strips non-digits and formats CPF as `000.000.000-00`; `ui.mask.phone()` strips non-digits and formats phone input with Brazilian punctuation (`js/ui.js:75`, `js/ui.js:76`, `js/ui.js:77`, `js/ui.js:78`, `js/ui.js:79`, `js/ui.js:80`, `js/ui.js:81`, `js/ui.js:84`, `js/ui.js:85`, `js/ui.js:86`, `js/ui.js:87`, `js/ui.js:88`, `js/ui.js:89`).
- `ui.validate.cpf()` strips non-digits, rejects empty, non-11-digit, and repeated-digit values, then validates both CPF check digits (`js/ui.js:97`, `js/ui.js:98`, `js/ui.js:99`, `js/ui.js:100`, `js/ui.js:101`, `js/ui.js:102`, `js/ui.js:103`, `js/ui.js:104`, `js/ui.js:105`, `js/ui.js:106`, `js/ui.js:107`, `js/ui.js:108`, `js/ui.js:109`, `js/ui.js:110`, `js/ui.js:111`).
- TC026 fills `123.456.789-00` into the CPF field before submit (`testsprite_tests/TC026_Update_profile_information.py:72`, `testsprite_tests/TC026_Update_profile_information.py:73`).

### Data Access And RLS Context
- The local security migration enables RLS on `public.users` (`migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:16`).
- It creates a `users_select` policy allowing authenticated users to read users rows (`migrations/002_rls_security.sql:28`, `migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:31`, `migrations/002_rls_security.sql:32`).
- It creates a `users_update_own` policy allowing updates when `auth.uid() = id` and the row's `role` remains identical to the current user's role (`migrations/002_rls_security.sql:34`, `migrations/002_rls_security.sql:36`, `migrations/002_rls_security.sql:37`, `migrations/002_rls_security.sql:38`, `migrations/002_rls_security.sql:39`, `migrations/002_rls_security.sql:40`, `migrations/002_rls_security.sql:41`, `migrations/002_rls_security.sql:42`).
- The anamnese migration only adds athlete-detail columns to `public.users`; the profile edit flow researched here writes the existing profile fields shown in the PRD context: `full_name`, `cpf`, `phone`, and `avatar_url` (`migrations/001_add_athlete_anamnese_fields.sql:1`, `migrations/001_add_athlete_anamnese_fields.sql:4`, `migrations/001_add_athlete_anamnese_fields.sql:5`, `migrations/001_add_athlete_anamnese_fields.sql:6`, `migrations/001_add_athlete_anamnese_fields.sql:7`, `migrations/001_add_athlete_anamnese_fields.sql:8`, `PRD.md:176`, `PRD.md:191`).

### TestSprite Plan And Recorded Result
- The TestSprite frontend plan defines TC026 as a medium-priority `Profile Management` test whose flow is login, navigate to profile, update supported fields, save, verify updated information, and verify the save confirmation (`testsprite_tests/testsprite_frontend_test_plan.json:1000`, `testsprite_tests/testsprite_frontend_test_plan.json:1001`, `testsprite_tests/testsprite_frontend_test_plan.json:1002`, `testsprite_tests/testsprite_frontend_test_plan.json:1003`, `testsprite_tests/testsprite_frontend_test_plan.json:1021`, `testsprite_tests/testsprite_frontend_test_plan.json:1023`, `testsprite_tests/testsprite_frontend_test_plan.json:1026`, `testsprite_tests/testsprite_frontend_test_plan.json:1027`, `testsprite_tests/testsprite_frontend_test_plan.json:1030`, `testsprite_tests/testsprite_frontend_test_plan.json:1031`, `testsprite_tests/testsprite_frontend_test_plan.json:1034`, `testsprite_tests/testsprite_frontend_test_plan.json:1035`, `testsprite_tests/testsprite_frontend_test_plan.json:1038`, `testsprite_tests/testsprite_frontend_test_plan.json:1039`, `testsprite_tests/testsprite_frontend_test_plan.json:1042`).
- The standardized PRD generated for TestSprite describes profile management as viewing name, email, CPF, and phone, updating profile data when allowed, and seeing updated profile information (`testsprite_tests/standard_prd.json:68`, `testsprite_tests/standard_prd.json:69`, `testsprite_tests/standard_prd.json:70`, `testsprite_tests/standard_prd.json:71`).
- The final TestSprite markdown report marks TC026 as failed and says the profile update form does not persist or visually confirm changes (`testsprite_tests/testsprite-mcp-test-report.md:81`, `testsprite_tests/testsprite-mcp-test-report.md:82`, `testsprite_tests/testsprite-mcp-test-report.md:83`, `testsprite_tests/testsprite-mcp-test-report.md:84`).
- The raw report records that the modal stayed open, the modal inputs contained the new values, the main profile still showed CPF and phone as `Não informado`, and no confirmation appeared (`testsprite_tests/tmp/raw_report.md:313`, `testsprite_tests/tmp/raw_report.md:316`, `testsprite_tests/tmp/raw_report.md:317`, `testsprite_tests/tmp/raw_report.md:318`).

## Code References
- `testsprite_tests/TC026_Update_profile_information.py:33` - TC026 opens the local app root.
- `testsprite_tests/TC026_Update_profile_information.py:40` - TC026 fills the login email used by the test.
- `testsprite_tests/TC026_Update_profile_information.py:45` - TC026 fills the login password used by the test.
- `testsprite_tests/TC026_Update_profile_information.py:55` - TC026 navigates through the fifth bottom-nav item.
- `testsprite_tests/TC026_Update_profile_information.py:61` - TC026 clicks the profile personal-data edit button.
- `testsprite_tests/TC026_Update_profile_information.py:68` - TC026 enters the new full name.
- `testsprite_tests/TC026_Update_profile_information.py:73` - TC026 enters the CPF value used in the profile update attempt.
- `testsprite_tests/TC026_Update_profile_information.py:78` - TC026 enters the phone value used in the profile update attempt.
- `testsprite_tests/TC026_Update_profile_information.py:99` - TC026 asserts that the new name is visible.
- `testsprite_tests/TC026_Update_profile_information.py:100` - TC026 asserts a save confirmation string.
- `index.html:41` - The app's dynamic route content mounts in `#main-content`.
- `index.html:47` - The bottom navigation that TC026 clicks is dynamically populated in `#bottom-nav`.
- `js/app.js:185` - Profile state is loaded from `public.users`.
- `js/app.js:244` - The `#profile` route renders the profile screen.
- `js/app.js:260` - Login screen rendering starts here.
- `js/app.js:291` - Login form submission handler starts here.
- `js/app.js:579` - Shared profile rendering starts here.
- `js/app.js:602` - Personal-data edit button exists here.
- `js/app.js:683` - Edit button is wired to `showEditProfileForm()`.
- `js/app.js:795` - Profile edit bottom sheet form starts here.
- `js/app.js:815` - CPF validation gate starts here.
- `js/app.js:819` - Supabase `public.users` update starts here.
- `js/app.js:834` - Supabase Auth metadata update starts here.
- `js/app.js:838` - The app's profile-update success toast text is emitted here.
- `js/ui.js:49` - Bottom sheet submit handling starts here.
- `js/ui.js:62` - Bottom sheet awaits the supplied save callback.
- `js/ui.js:63` - Bottom sheet closes only after callback success.
- `js/ui.js:64` - Bottom sheet handles callback errors by restoring the button state.
- `js/ui.js:97` - CPF validator starts here.
- `migrations/002_rls_security.sql:36` - Current local RLS policy for updating a user's own profile row starts here.
- `testsprite_tests/testsprite_frontend_test_plan.json:1000` - TC026 test-plan definition starts here.
- `testsprite_tests/testsprite-mcp-test-report.md:81` - TC026 final report entry starts here.
- `testsprite_tests/tmp/raw_report.md:313` - TC026 raw failure observation starts here.

## Architecture Documentation
The app is a static vanilla JavaScript SPA. `index.html` provides the shell, CDN dependencies, dynamic mount points, and module entry points. `js/app.js` owns top-level auth state, hash routing, role-based navigation, profile rendering, profile editing, avatar upload, and dispatch to role-specific page modules. `js/auth.js` wraps Supabase Auth operations and toast creation. `js/ui.js` contains shared escaping, URL safety, bottom sheet, masks, and CPF validation helpers.

The TC026 data path is:

`TC026 Playwright script -> http://localhost:3000 -> index.html -> js/app.js app.init() -> renderLogin() -> auth.login() -> Supabase Auth signInWithPassword() -> auth state change -> loadProfile() -> render() -> #dashboard -> bottom nav #profile -> renderProfile() -> showEditProfileForm() -> ui.bottomSheet.show() -> ui.validate.cpf() -> supabase.from('users').update(...) -> supabase.auth.updateUser(...) -> toast.show('Perfil atualizado!') -> loadProfile() -> renderProfile()`.

The profile display is role-shared. Admin, responsible/businessman, and student profiles all use `renderProfile()`, with role-specific extra cards and role-specific bottom nav labels. For the student role, the fifth nav item is `Perfil`, matching the XPath used by TC026.

Profile persistence is split between `public.users` and Supabase Auth metadata. The profile table update writes `full_name`, `cpf`, `phone`, and `updated_at`; the Auth metadata update writes only `full_name`. The displayed profile values are loaded primarily from `public.users` through `loadProfile()`, with a fallback object using metadata/email when the profile row is unavailable.

## Historical Context
The product PRD lists profile screen support for personal data, athlete details, avatar upload, account type, and the Diamond X site card (`PRD.md:77`). The same PRD states users can view personal data including name, email, CPF, and phone, and describes `users` as app profile data with role, CPF, phone, avatar, and Asaas customer ID (`PRD.md:176`, `PRD.md:191`).

An older research document recorded that the profile page showed name, email, CPF, and phone, and that `showEditProfileForm()` allowed editing name, CPF, and phone (`docs/research/2026-04-24-ajustes-diamond-x.md:102`, `docs/research/2026-04-24-ajustes-diamond-x.md:103`, `docs/research/2026-04-24-ajustes-diamond-x.md:104`, `docs/research/2026-04-24-ajustes-diamond-x.md:105`). A later research document recorded the shared profile page pattern and the sequential display of `NOME`, `E-MAIL`, `CPF`, and `TELEFONE` (`docs/research/2026-05-03-spec-alteracoes-analysis.md:105`, `docs/research/2026-05-03-spec-alteracoes-analysis.md:106`, `docs/research/2026-05-03-spec-alteracoes-analysis.md:110`).

## Related Research
- `docs/research/2026-05-04-tc001-register-role-based-area.md` - Related auth, profile loading, registration, role routing, and navigation context.
- `docs/research/2026-05-04-TC004-register-new-athlete.md` - Related TestSprite registration flow context.
- `docs/research/2026-05-03-spec-alteracoes-analysis.md` - Broader Diamond X app/profile architecture context.
- `docs/research/2026-04-24-ajustes-diamond-x.md` - Earlier profile-state research.

## Open Questions
- Whether the remote Supabase database has the RLS policies from `migrations/002_rls_security.sql` applied is not verified by local code inspection.
- Whether the test account `luucasruon@gmail.com` currently has a `public.users` row with a role and editable profile fields is not verified by local code inspection.
- Whether TestSprite expected `Alterações salvas com sucesso` from a spec outside the repository is not identified in the local codebase; the live app toast text for this save path is `Perfil atualizado!` (`js/app.js:838`).
