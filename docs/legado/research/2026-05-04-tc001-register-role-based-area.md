---
date: 2026-05-04T12:07:31-03:00
researcher: Codex
git_commit: cfecc1532f04a9b654525ba6024b8f67d952ae25
branch: main
repository: Diamond
topic: "$research-codebase '/Users/lucasruon/Downloads/Sistemas/Diamond/testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py'"
tags: [research, codebase]
status: complete
last_updated: 2026-05-04
last_updated_by: Codex
---

# Research: $research-codebase '/Users/lucasruon/Downloads/Sistemas/Diamond/testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py'

**Date**: 2026-05-04T12:07:31-03:00
**Researcher**: Codex
**Git Commit**: cfecc1532f04a9b654525ba6024b8f67d952ae25
**Branch**: main
**Repository**: Diamond

## Research Question
$research-codebase '/Users/lucasruon/Downloads/Sistemas/Diamond/testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py'

## Scope
This research includes the mentioned TestSprite Playwright test, the static SPA entry point, registration/login rendering, Supabase auth wrapper, CPF/phone mask and CPF validation helper, role-based routing and dashboard dispatch, the TestSprite frontend plan/report, and related local product/research documentation.

It excludes executing the test, querying the remote Supabase project, and inspecting browser runtime state. The smallest scope that answers the request is the TC001 registration path and the code it exercises.

## Summary
TC001 is an async Playwright script that opens `http://localhost:3000`, clicks the `Cadastre-se` link on the login screen, fills the registration form through absolute XPath selectors, submits first with an invalid CPF, then with a valid CPF and multiple email values, and finally asserts only that the current URL is not `None` (`testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:34`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:39`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:44`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:65`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:70`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:98`).

The planned TC001 behavior is broader than the generated Python assertion: the TestSprite plan says the test should verify that the authenticated area and dashboard or role-specific home area open after registration (`testsprite_tests/testsprite_frontend_test_plan.json:3`, `testsprite_tests/testsprite_frontend_test_plan.json:41`, `testsprite_tests/testsprite_frontend_test_plan.json:45`). The local app's registration submit handler validates CPF, calls Supabase `signUp` through `auth.register`, shows "Conta criada! Por favor, faça login.", and sets `window.location.hash = '#login'` after a successful register call (`js/app.js:511`, `js/app.js:531`, `js/app.js:534`, `js/app.js:535`).

Role-based dashboard rendering exists, but it is part of the authenticated route flow, not the final explicit action of the registration handler. Authenticated users on `#login` or `#register` are redirected to `#dashboard`, and `renderDashboard()` chooses admin, responsible/businessman, or student dashboard from `profile.role` (`js/app.js:207`, `js/app.js:208`, `js/app.js:546`, `js/app.js:548`, `js/app.js:550`, `js/app.js:553`).

## Detailed Findings

### TC001 Test File
- The test starts Playwright asynchronously, launches Chromium headless, creates a browser context, sets the default timeout to 5000 ms, and opens a page (`testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:5`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:12`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:15`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:26`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:30`).
- It navigates to `http://localhost:3000` and clicks the login page's register link by absolute XPath `/html/body/div/main/div/div[3]/p[2]/a` (`testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:34`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:35`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:39`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:40`).
- It fills name, email, CPF, phone, and password by absolute XPath selectors matching the current dynamic registration DOM (`testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:44`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:48`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:52`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:57`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:61`).
- The first CPF value in the test is `123.456.789-10`; later the test replaces it with `529.982.247-25` before resubmitting (`testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:53`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:70`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:71`).
- The test changes the email after repeated submit attempts to `testuser2026b@example.com` and `testuser2026c@example.com` (`testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:80`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:81`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:90`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:91`).
- The final executable assertion reads `window.location.href` and asserts only that the value is not `None`; it does not assert `#dashboard`, authenticated content, a role-specific dashboard heading, or a selected role (`testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:97`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:98`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:99`).

### SPA Entry Point
- `index.html` provides one shell with `#main-content`, a hidden `#bottom-nav`, and `#toasts-container` (`index.html:39`, `index.html:41`, `index.html:47`, `index.html:51`).
- It loads Supabase from CDN, QR libraries, then local ES modules `js/supabase.js`, `js/auth.js`, and `js/app.js` (`index.html:70`, `index.html:71`, `index.html:72`, `index.html:73`, `index.html:74`, `index.html:75`).
- `package.json` only declares `"type": "module"`; the repository does not define an npm script for the `localhost:3000` target inside `package.json` (`package.json:1`, `package.json:2`).

### Login To Register Navigation
- `renderLogin()` hides the bottom nav, injects the login page markup, and includes the `Cadastre-se` link with `href="#register"` (`js/app.js:260`, `js/app.js:261`, `js/app.js:263`, `js/app.js:283`).
- The global router lists `#register` as a public route and dispatches it to `renderRegister()` (`js/app.js:200`, `js/app.js:231`, `js/app.js:233`).

### Registration Form And Submit Handler
- `renderRegister()` injects the registration form with fields for full name, email, CPF, phone, role select, and password (`js/app.js:482`, `js/app.js:487`, `js/app.js:488`, `js/app.js:489`, `js/app.js:491`, `js/app.js:492`, `js/app.js:494`, `js/app.js:495`).
- The role select options are `student`, `responsible`, and `businessman`; no option is programmatically selected by TC001, so the DOM default is the first option, `student` (`js/app.js:494`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:44`, `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:86`).
- CPF and phone masks are attached immediately after the form is injected (`js/app.js:502`, `js/app.js:503`, `js/app.js:504`).
- On submit, the handler reads the CPF and calls `ui.validate.cpf(cpf)` before disabling the submit button or calling Supabase (`js/app.js:506`, `js/app.js:511`, `js/app.js:512`, `js/app.js:513`, `js/app.js:517`).
- The metadata sent into `auth.register()` contains `full_name`, selected `role`, `cpf`, and `phone` (`js/app.js:520`, `js/app.js:521`, `js/app.js:522`, `js/app.js:523`, `js/app.js:524`, `js/app.js:525`, `js/app.js:526`, `js/app.js:531`).
- After `auth.register()` resolves, the handler shows a success toast and changes the route to `#login` (`js/app.js:531`, `js/app.js:534`, `js/app.js:535`).
- When registration throws, the handler logs the error and shows the error message as a toast, then restores the submit button state in `finally` (`js/app.js:536`, `js/app.js:537`, `js/app.js:538`, `js/app.js:539`, `js/app.js:540`, `js/app.js:541`).

### Supabase Auth Wrapper
- `auth.register(email, password, metadata)` calls `supabase.auth.signUp()` with the supplied email and password and passes the metadata through `options.data` (`js/auth.js:14`, `js/auth.js:15`, `js/auth.js:16`, `js/auth.js:17`, `js/auth.js:18`, `js/auth.js:19`).
- The wrapper throws any Supabase auth error and returns the Supabase data object on success (`js/auth.js:23`, `js/auth.js:29`).
- The local comment says profile-row creation in `users` is expected to happen through a Supabase trigger or later manual work; this repository search did not find a local trigger definition for creating the `users` row from auth metadata (`js/auth.js:25`, `js/auth.js:26`, `js/auth.js:27`).
- The Supabase client is constructed from a hard-coded project URL and anon key in `js/supabase.js` (`js/supabase.js:1`, `js/supabase.js:2`, `js/supabase.js:3`, `js/supabase.js:11`).

### CPF And Phone Helpers
- `ui.mask.cpf()` strips non-digits and formats input as `000.000.000-00` (`js/ui.js:75`, `js/ui.js:76`, `js/ui.js:77`, `js/ui.js:78`, `js/ui.js:79`, `js/ui.js:80`, `js/ui.js:81`, `js/ui.js:82`).
- `ui.mask.phone()` strips non-digits and formats the value with Brazilian phone punctuation (`js/ui.js:84`, `js/ui.js:85`, `js/ui.js:86`, `js/ui.js:87`, `js/ui.js:88`, `js/ui.js:89`).
- `ui.validate.cpf()` strips non-digits, rejects empty, non-11-digit, or repeated-digit CPFs, then validates the two CPF check digits (`js/ui.js:97`, `js/ui.js:98`, `js/ui.js:99`, `js/ui.js:100`, `js/ui.js:101`, `js/ui.js:105`, `js/ui.js:106`, `js/ui.js:110`, `js/ui.js:111`).

### Auth State, Profile Loading, And Role-Based Area
- App initialization reads the current Supabase session and stores `session.user` as `app.user` (`js/app.js:28`, `js/app.js:31`, `js/app.js:32`).
- If a user exists, initialization calls `loadProfile()` before rendering (`js/app.js:34`).
- The auth state listener updates `app.user`, loads the profile when a session user exists, clears the profile when not authenticated, and calls `render()` (`js/app.js:37`, `js/app.js:39`, `js/app.js:48`, `js/app.js:49`, `js/app.js:50`).
- `loadProfile()` queries `users` by the authenticated user's id and uses the returned row as `app.profile`; if no row is found, it falls back to `user_metadata.role` or `student` and `user_metadata.full_name` or email (`js/app.js:185`, `js/app.js:187`, `js/app.js:188`, `js/app.js:189`, `js/app.js:190`, `js/app.js:193`).
- Authenticated users on `#login` or `#register` are routed to `#dashboard` by `render()` (`js/app.js:207`, `js/app.js:208`, `js/app.js:209`).
- `renderDashboard()` dispatches to `adminDashboard.render()`, `responsibleDashboard.render()`, or `studentDashboard.render()` based on `this.profile?.role` (`js/app.js:546`, `js/app.js:548`, `js/app.js:549`, `js/app.js:550`, `js/app.js:551`, `js/app.js:553`).
- `renderTrainings()`, `renderPlans()`, and `renderPayments()` use the same role categories to select admin, responsible/businessman, or student modules (`js/app.js:557`, `js/app.js:558`, `js/app.js:559`, `js/app.js:560`, `js/app.js:563`, `js/app.js:564`, `js/app.js:565`, `js/app.js:566`, `js/app.js:569`, `js/app.js:570`, `js/app.js:571`).
- The bottom navigation is also role-based: admin receives dashboard/users/trainings/plans/payments/profile, responsible/businessman receives dashboard/students/trainings/plans/payments/profile, and students receive dashboard/trainings/plans/attendance/profile (`js/app.js:850`, `js/app.js:858`, `js/app.js:863`, `js/app.js:870`, `js/app.js:877`).

### Route Guards And RLS Context
- Unauthenticated users attempting protected hashes are redirected to `#login` (`js/app.js:202`, `js/app.js:203`).
- The client route guard keeps `#users` and `#reports` admin-only, and keeps `#students` limited to responsible, businessman, or admin roles (`js/app.js:212`, `js/app.js:214`, `js/app.js:215`, `js/app.js:217`, `js/app.js:221`).
- The security migration enables RLS on `public.users`, `student_plans`, `attendance`, `responsible_students`, `training_sessions`, and `plans` (`migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:16`, `migrations/002_rls_security.sql:17`, `migrations/002_rls_security.sql:18`, `migrations/002_rls_security.sql:19`, `migrations/002_rls_security.sql:20`, `migrations/002_rls_security.sql:21`).
- The `users_update_own` policy allows a user to update only their own row and requires the `role` value to remain the same as the current persisted role (`migrations/002_rls_security.sql:34`, `migrations/002_rls_security.sql:36`, `migrations/002_rls_security.sql:38`, `migrations/002_rls_security.sql:39`, `migrations/002_rls_security.sql:40`, `migrations/002_rls_security.sql:41`).

## Code References
- `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:35` - TC001 navigates to `http://localhost:3000`.
- `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:39` - TC001 clicks the `Cadastre-se` link by absolute XPath.
- `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:53` - TC001 initially submits an invalid CPF value.
- `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:71` - TC001 later replaces the CPF with `529.982.247-25`.
- `testsprite_tests/TC001_Register_and_land_in_the_role_based_area.py:99` - TC001's final assertion only checks that `window.location.href` is not `None`.
- `testsprite_tests/testsprite_frontend_test_plan.json:41` - The TestSprite plan expects the authenticated role area to open.
- `testsprite_tests/testsprite-mcp-test-report.md:16` - The TestSprite report contains the TC001 result entry.
- `index.html:39` - The SPA root container begins here.
- `index.html:73` - The local Supabase module is loaded.
- `index.html:75` - The main SPA module is loaded.
- `js/app.js:283` - The login screen includes the `Cadastre-se` route link.
- `js/app.js:482` - Registration screen rendering starts here.
- `js/app.js:494` - Registration role select defines `student`, `responsible`, and `businessman`.
- `js/app.js:513` - The registration handler validates CPF before calling auth.
- `js/app.js:531` - The registration handler calls `auth.register()`.
- `js/app.js:535` - Successful registration changes the hash to `#login`.
- `js/auth.js:15` - `auth.register()` calls Supabase `signUp`.
- `js/ui.js:98` - CPF validation logic starts here.
- `js/app.js:187` - Profile loading queries `users` by authenticated id.
- `js/app.js:207` - Authenticated login/register routes redirect to dashboard.
- `js/app.js:546` - Role-based dashboard dispatch starts here.
- `js/app.js:850` - Role-based bottom navigation starts here.
- `migrations/002_rls_security.sql:36` - The local RLS policy for own-user updates is defined here.

## Architecture Documentation
The current application is a static single-page app. `index.html` hosts the shell and loads CDN dependencies plus local ES modules. `js/app.js` owns route parsing, auth state handling, public/protected route behavior, page rendering, and role-based dispatch. `js/auth.js` is a thin wrapper over Supabase Auth. `js/supabase.js` creates the browser Supabase client. `js/ui.js` contains shared DOM utilities, masks, CPF validation, and bottom sheet behavior.

The registration call path for TC001 is:

`TC001 Playwright script -> http://localhost:3000 -> index.html -> js/app.js app.init() -> renderLogin() -> #register -> renderRegister() -> register form submit -> ui.validate.cpf() -> auth.register() -> supabase.auth.signUp() -> toast.show() -> window.location.hash = '#login'`.

The role-based landing path in the app is separate:

`Supabase session exists -> app.init()/onAuthStateChange -> loadProfile() -> render() -> authenticated #login/#register redirect -> #dashboard -> renderDashboard() -> adminDashboard/responsibleDashboard/studentDashboard based on profile.role`.

The local data model context for roles is centered on `users.role`. Registration sends role as Supabase Auth metadata; profile loading primarily reads `public.users`, then falls back to Auth metadata when no profile row is available. The local security migration documents RLS for profile updates and role immutability on self-update.

## Historical Context
The PRD describes registration with full name, email, CPF, phone, role, and password, and states that authenticated users should be redirected away from login/register to dashboard (`PRD.md:67`, `PRD.md:68`, `PRD.md:102`, `PRD.md:108`). It also documents role-based dashboard/navigation requirements and says Supabase RLS remains the source of truth for data access (`PRD.md:112`, `PRD.md:113`, `PRD.md:114`, `PRD.md:115`).

The TestSprite report marks TC001 as failed and records that registration did not redirect or confirm creation as expected by that report (`testsprite_tests/testsprite-mcp-test-report.md:16`, `testsprite_tests/testsprite-mcp-test-report.md:17`, `testsprite_tests/testsprite-mcp-test-report.md:19`). The same report marks TC002 and TC003 as passed for standard login and role-based routing after login (`testsprite_tests/testsprite-mcp-test-report.md:21`, `testsprite_tests/testsprite-mcp-test-report.md:22`, `testsprite_tests/testsprite-mcp-test-report.md:25`, `testsprite_tests/testsprite-mcp-test-report.md:26`, `testsprite_tests/testsprite-mcp-test-report.md:27`).

The existing research document `docs/research/2026-05-03-spec-alteracoes-analysis.md` previously documented that role dispatch occurs in `js/app.js` and that RLS blocks self-changing `users.role` when the migration is applied (`docs/research/2026-05-03-spec-alteracoes-analysis.md:46`, `docs/research/2026-05-03-spec-alteracoes-analysis.md:115`, `docs/research/2026-05-03-spec-alteracoes-analysis.md:116`).

## Related Research
- `docs/research/2026-05-03-spec-alteracoes-analysis.md` - Prior codebase research covering role dispatch, profile behavior, and RLS context.
- `docs/research/2026-05-04-reservas-calendario.md` - Prior codebase research covering role-specific training/reservation views after authenticated navigation.
- `docs/research/2026-04-24-ajustes-diamond-x.md` - Older codebase research documenting the earlier role/profile state.

## Open Questions
- No local SQL trigger/function definition was found for creating `public.users` rows from Supabase Auth metadata during signup. Confirming whether such a trigger exists requires remote Supabase inspection, which was outside this research scope.
- TC001 targets `http://localhost:3000`, but `package.json` does not define the local server command. The server process used when TestSprite generated or ran TC001 is not represented in `package.json`.
