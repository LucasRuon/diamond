---
date: 2026-05-09T15:49:36-03:00
researcher: Codex
git_commit: 1797a9bbdd427e96e0e380dc21837d8c718d50c3
branch: work
repository: Diamond-expo
topic: "$research-codebase i want to change this project to Expo Go for native apps. Read all files and folders to understand and create a md file with all the change."
tags: [research, codebase, expo, native, migration]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Research: Expo Go Native Migration

**Date**: 2026-05-09T15:49:36-03:00
**Researcher**: Codex
**Git Commit**: 1797a9bbdd427e96e0e380dc21837d8c718d50c3
**Branch**: work
**Repository**: Diamond-expo

## Research Question

$research-codebase i want to change this project to Expo Go for native apps. Read all files and folders to understand and create a md file with all the change.

## Scope

Included:

- Full repository inventory, excluding generated dependency/build directories and binary font/image contents.
- Static web shell, PWA files, CSS, JavaScript app modules, role-specific page modules, Supabase Edge Functions, SQL migrations, docs/specs, and TestSprite test inventory.
- Current official Expo and Supabase React Native documentation needed to identify Expo Go migration constraints.

Excluded:

- Executing the app, running TestSprite, querying the remote Supabase project, or editing application code.
- Reading binary assets byte-for-byte. Binary assets were inventoried by path.

Assumption:

- The target is an Expo Go-compatible React Native app, not a native iOS/Android project with custom native modules.

## Summary

The current project is a mobile-first static PWA, not an Expo or React Native app. It has a one-line `package.json` with only `"type": "module"` (`package.json:1`), a browser HTML shell (`index.html:1`), a PWA manifest (`manifest.json:1`), a service worker cache (`service-worker.js:1`), CSS files, and browser ES modules. The README describes the stack as "SPA em HTML + CSS + JavaScript (ES Modules), sem framework" and PWA with `manifest.json` and `service-worker.js` (`README.md:7`).

The backend/data layer is already mostly portable because it is Supabase Auth, Postgres/RLS, Storage, and Edge Functions. The native migration is primarily a client rewrite: DOM rendering, hash routing, CDN globals, CSS, service worker APIs, browser QR scanner/generator libraries, file input upload, and web links must be replaced with React Native/Expo equivalents.

The migration can keep the business model and most Supabase table/function boundaries, but the client files under `js/`, `css/`, `index.html`, `manifest.json`, and `service-worker.js` cannot be reused directly inside Expo Go. Pure helper logic such as date/calendar functions in `js/calendar.js` and some CPF/mask validation from `js/ui.js` can be ported into TypeScript utilities.

## Repository Inventory

Top-level app files:

- `index.html` - Browser SPA shell that loads CDN scripts, CSS, local modules, and registers the service worker (`index.html:30`, `index.html:33`, `index.html:70`, `index.html:78`).
- `manifest.json` - PWA metadata and icons (`manifest.json:1`).
- `service-worker.js` - Browser cache strategy for app shell assets and CDN dependencies (`service-worker.js:1`, `service-worker.js:2`, `service-worker.js:44`).
- `package.json` - Currently no app scripts or dependencies, only ESM mode (`package.json:1`).
- `README.md`, `PRD.md`, `Ajustes App Diamond X.md`, `spec-alteracoes-diamond-x.md`, `spec (1).md` - Product and implementation documentation.

Client source:

- `js/app.js` - App bootstrap, Supabase session handling, hash routing, role routing, auth screens, profile screens, bottom nav (`js/app.js:20`, `js/app.js:28`, `js/app.js:228`, `js/app.js:580`, `js/app.js:894`).
- `js/auth.js` - Thin Supabase Auth wrapper plus browser DOM toast implementation (`js/auth.js:3`, `js/auth.js:43`).
- `js/supabase.js` - Browser Supabase client using CDN global `window.supabase` and hard-coded URL/key (`js/supabase.js:2`, `js/supabase.js:7`, `js/supabase.js:11`).
- `js/ui.js` - DOM helpers, bottom sheet, CPF/phone masks, CPF validation, and dynamic CSS injection (`js/ui.js:1`, `js/ui.js:17`, `js/ui.js:75`, `js/ui.js:117`).
- `js/calendar.js` - Pure date/calendar helpers (`js/calendar.js:1`, `js/calendar.js:14`, `js/calendar.js:54`).
- `js/qrcode.js` - Browser QRCode global wrapper (`js/qrcode.js:1`, `js/qrcode.js:9`).
- `js/trainingReservations.js` - Pure reservation error classification helper (`js/trainingReservations.js:1`).
- `js/asaas.js` - Empty file.

Role-specific screens:

- `js/pages/student/*` - Athlete dashboard, trainings/reservations/QR check-in, attendance, and plans (`js/pages/student/dashboard.js:4`, `js/pages/student/trainings.js:8`, `js/pages/student/attendance.js:5`, `js/pages/student/plans.js:5`).
- `js/pages/responsible/*` - Responsible/business manager dashboard, linked students, trainings, plans, and payments (`js/pages/responsible/dashboard.js:4`, `js/pages/responsible/students.js:5`, `js/pages/responsible/trainings.js:6`, `js/pages/responsible/plans.js:6`, `js/pages/responsible/payments.js:4`).
- `js/pages/admin/*` - Admin dashboard, users, trainings, plans, charges, and reports (`js/pages/admin/dashboard.js:4`, `js/pages/admin/users.js:5`, `js/pages/admin/trainings.js:7`, `js/pages/admin/plans.js:5`, `js/pages/admin/charges.js:5`, `js/pages/admin/reports.js:4`).

Styling/assets:

- `css/reset.css`, `css/variables.css`, `css/components.css`, `css/pages.css` - Browser CSS tokens, layout, components, page transitions, login background, calendars, charts (`css/variables.css:50`, `css/reset.css:12`, `css/components.css:3`, `css/pages.css:1`).
- `assets/` - App icons, `bg-diamond.webp`, local Montserrat/Abnes fonts.
- `Montserrat-Full-Version/` and `abnes/` - Font source packages/licenses.
- `base_icon_transparent_background.png` - Logo used by many screens (`js/app.js:302`, `js/pages/student/dashboard.js:16`).

Backend and data:

- `supabase/functions/admin-update-user/index.ts` - Authenticated admin-only Edge Function using service role to update users and Auth metadata (`supabase/functions/admin-update-user/index.ts:25`, `supabase/functions/admin-update-user/index.ts:59`, `supabase/functions/admin-update-user/index.ts:104`, `supabase/functions/admin-update-user/index.ts:122`).
- `supabase/functions/asaas-checkout/index.ts` - Edge Function that creates/reuses Asaas customer and inserts `student_plans` payment intent (`supabase/functions/asaas-checkout/index.ts:4`, `supabase/functions/asaas-checkout/index.ts:21`, `supabase/functions/asaas-checkout/index.ts:48`, `supabase/functions/asaas-checkout/index.ts:65`).
- `migrations/001_add_athlete_anamnese_fields.sql` - Athlete profile fields (`migrations/001_add_athlete_anamnese_fields.sql:4`).
- `migrations/002_rls_security.sql` - RLS for users, student plans, attendance, responsible links, sessions, and plans (`migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:56`, `migrations/002_rls_security.sql:94`).
- `migrations/003_training_reservations.sql` - Training reservation table and RLS (`migrations/003_training_reservations.sql:4`, `migrations/003_training_reservations.sql:31`, `migrations/003_training_reservations.sql:46`).
- `migrations/004_auth_users_profile_trigger.sql` - Auth trigger to create/update app profile rows from Supabase Auth metadata (`migrations/004_auth_users_profile_trigger.sql:4`, `migrations/004_auth_users_profile_trigger.sql:22`, `migrations/004_auth_users_profile_trigger.sql:55`).

Tests and generated artifacts:

- `testsprite_tests/` contains TC001-TC030 Python UI tests, TestSprite PRD/test plan/report, and temporary reports.
- Existing TestSprite report includes coverage for auth/registration, athlete dashboard/profile, training/reservations, QR attendance, responsible linking, plans/payments, and admin flows (`testsprite_tests/testsprite-mcp-test-report.md:12`, `testsprite_tests/testsprite-mcp-test-report.md:167`).

## Current Architecture

### Browser App Shell

`index.html` defines the app root with `#main-content`, `#bottom-nav`, and `#toasts-container` (`index.html:39`, `index.html:41`, `index.html:47`, `index.html:51`). It loads Phosphor Icons, Supabase JS, QRCode.js, and html5-qrcode from CDNs (`index.html:30`, `index.html:70`, `index.html:71`, `index.html:72`). It then loads local ES modules for Supabase, auth, and app bootstrap (`index.html:73`, `index.html:74`, `index.html:75`).

`service-worker.js` caches HTML/CSS/JS/assets plus external CDN URLs (`service-worker.js:2`, `service-worker.js:17`, `service-worker.js:18`) and implements a fetch handler using browser `caches` and `fetch` APIs (`service-worker.js:44`, `service-worker.js:63`, `service-worker.js:77`).

### Routing and Auth

`js/app.js` owns app state with `user`, `profile`, and recovery mode (`js/app.js:20`, `js/app.js:23`, `js/app.js:24`, `js/app.js:26`). Initialization reads the Supabase session, loads profile data, registers `onAuthStateChange`, binds `hashchange`, and renders (`js/app.js:28`, `js/app.js:31`, `js/app.js:37`, `js/app.js:53`).

Routes are URL hash strings such as `#login`, `#dashboard`, `#trainings`, `#attendance`, `#users`, and `#profile` (`js/app.js:264`, `js/app.js:275`, `js/app.js:277`). Public routes are listed in `render()` (`js/app.js:231`). Role guards restrict admin pages and responsible pages (`js/app.js:244`, `js/app.js:249`, `js/app.js:253`).

Dashboard/trainings/plans/payments dispatch by `profile.role`: admin modules for admins, responsible modules for `responsible` or `businessman`, and student modules otherwise (`js/app.js:580`, `js/app.js:591`, `js/app.js:597`, `js/app.js:603`).

### Data Flow

The browser client is created from `window.supabase.createClient()` (`js/supabase.js:11`). App modules call Supabase directly from the client:

- Auth: `signInWithPassword`, `signUp`, `signOut`, password reset/update (`js/auth.js:4`, `js/auth.js:14`, `js/auth.js:32`, `js/app.js:455`, `js/app.js:506`).
- Profile: read/update `users`, upload avatar to `avatars`, update Auth metadata (`js/app.js:187`, `js/app.js:778`, `js/app.js:801`, `js/app.js:878`).
- Student flows: read plans/attendance/sessions/responsible links, insert/cancel reservations, insert QR attendance (`js/pages/student/dashboard.js:43`, `js/pages/student/trainings.js:69`, `js/pages/student/trainings.js:217`, `js/pages/student/trainings.js:321`, `js/pages/student/trainings.js:334`).
- Responsible flows: read linked students, plans, reservations, payments, insert responsible-student links and purchase intents (`js/pages/responsible/dashboard.js:44`, `js/pages/responsible/students.js:116`, `js/pages/responsible/trainings.js:100`, `js/pages/responsible/plans.js:161`, `js/pages/responsible/payments.js:24`).
- Admin flows: read/write users, plans, sessions, attendance, charges, reports, and invoke the admin Edge Function (`js/pages/admin/users.js:47`, `js/pages/admin/users.js:167`, `js/pages/admin/trainings.js:325`, `js/pages/admin/charges.js:213`, `js/pages/admin/reports.js:55`).

### UI and Styling

The UI is assembled by setting `innerHTML` on browser elements and adding event listeners after injection. This pattern appears in app routes and every role-specific page (`js/app.js:296`, `js/pages/student/trainings.js:14`, `js/pages/admin/trainings.js:12`, `js/pages/responsible/students.js:8`).

CSS custom properties define the design tokens (`css/variables.css:50`). Browser CSS handles fixed bottom nav, safe-area padding, card/button/input styles, calendars, charts, login background image, animations, and media queries (`css/reset.css:30`, `css/components.css:79`, `css/components.css:318`, `css/pages.css:41`, `css/pages.css:50`).

### QR and Camera

Admin QR generation uses global `QRCode` in `adminTrainings.showQrCode()` (`js/pages/admin/trainings.js:338`, `js/pages/admin/trainings.js:342`). Student QR scanning uses global `Html5Qrcode`, starts camera access with `facingMode: "environment"`, and handles decoded QR text by checking active plan, matching a same-day session, and inserting attendance (`js/pages/student/trainings.js:252`, `js/pages/student/trainings.js:264`, `js/pages/student/trainings.js:267`, `js/pages/student/trainings.js:290`).

### Backend Boundaries

RLS is the server-side authorization layer. The security migration enables RLS on core tables (`migrations/002_rls_security.sql:15`) and defines role- or relationship-based policies for users, attendance, plans, sessions, and responsible links (`migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:56`, `migrations/002_rls_security.sql:94`, `migrations/002_rls_security.sql:147`, `migrations/002_rls_security.sql:165`).

The admin user update flow already uses a backend boundary instead of direct client-side privileged mutation. The client invokes `admin-update-user` (`js/pages/admin/users.js:167`), and the Edge Function verifies the caller with the anon key client, checks that caller's profile role is `admin`, then updates with service role (`supabase/functions/admin-update-user/index.ts:46`, `supabase/functions/admin-update-user/index.ts:59`, `supabase/functions/admin-update-user/index.ts:66`, `supabase/functions/admin-update-user/index.ts:104`).

## Expo Go Migration Change Inventory

### 1. Project Scaffolding

Current state:

- `package.json` has no Expo, React, React Native, scripts, or dependencies (`package.json:1`).
- There is no `app.json`, `app.config.*`, `App.tsx`, `app/`, `src/`, `babel.config.js`, `metro.config.js`, `tsconfig.json`, or React Native entry point in the repository inventory.

Required changes:

- Replace the static package setup with an Expo project setup created from `create-expo-app`.
- Add Expo/React Native scripts such as `start`, `android`, `ios`, and `web`.
- Add Expo Router if using file-based routing. Official Expo docs recommend `create-expo-app` for a new Expo Router app and document `expo-router/entry` as the package entry when installing manually.
- Add app config (`app.json` or `app.config.ts`) for app name, scheme/deep links, icons, splash, orientation, runtime permissions, and Expo plugins.
- Add TypeScript config if the new app is TypeScript.

Expo Go compatibility note:

- Official Expo docs state Expo Go is a starting point for viewing app changes on a device, and development builds are used later when the app needs native libraries or native config beyond what Expo Go supports.

### 2. Static Web/PWA Files

Current state:

- PWA metadata lives in `manifest.json` (`manifest.json:1`).
- Service worker caching lives in `service-worker.js` (`service-worker.js:1`).
- Browser shell and CDN dependencies live in `index.html` (`index.html:1`, `index.html:70`).

Required changes:

- Replace `index.html` with Expo/React Native entry and route files.
- Move PWA/app identity from `manifest.json` into Expo app config.
- Do not register `service-worker.js` for the native app; Expo Go does not use browser service workers for native runtime caching.
- Keep web support only if Expo Web is also a target; otherwise these files become legacy web/PWA artifacts.

### 3. Supabase Client

Current state:

- `js/supabase.js` depends on a CDN global and browser `window.supabase` (`js/supabase.js:7`, `js/supabase.js:11`).
- Supabase URL and anon key are hard-coded in the source (`js/supabase.js:2`, `js/supabase.js:3`).

Required changes:

- Replace `js/supabase.js` with a React Native-compatible client module, for example `src/lib/supabase.ts`.
- Import `createClient` from `@supabase/supabase-js` instead of using a CDN global.
- Move project URL/key to Expo public environment variables such as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Configure React Native session persistence with AsyncStorage or another supported storage adapter and disable URL session detection for native.
- Add URL polyfills required by Supabase in React Native.
- Preserve RLS as the authorization layer; client-side routing remains only a UX guard.

Supabase official docs for React Native/Expo show installing `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, and `react-native-url-polyfill`, then creating a client with persistent auth storage and `detectSessionInUrl: false`.

### 4. Routing and Navigation

Current state:

- Routes are hash strings parsed from `window.location.hash` (`js/app.js:172`, `js/app.js:179`, `js/app.js:228`).
- Navigation is raw anchor tags and generated bottom nav HTML (`js/app.js:929`).
- Password recovery reads URL search/hash params and mutates browser history (`js/app.js:57`, `js/app.js:122`, `js/app.js:140`, `js/app.js:162`).

Required changes:

- Replace hash routing with Expo Router routes or React Navigation.
- Convert role dispatch into guarded route groups or a root auth/layout component that redirects based on Supabase session and `profile.role`.
- Replace bottom nav HTML with native tabs. Current nav definitions can be ported as a route map: admin dashboard/users/trainings/plans/payments/profile, responsible dashboard/students/trainings/plans/payments/profile, student dashboard/trainings/plans/attendance/profile (`js/app.js:907`, `js/app.js:914`, `js/app.js:921`).
- Replace browser password recovery URL parsing with deep link handling using an Expo app scheme and Supabase redirect URLs.
- Replace `window.location.hash`, `window.history.replaceState`, `window.location.reload`, and anchor `href="#..."` navigation with router navigation methods.

### 5. Screen Rewrite

Current state:

- Every screen injects HTML strings into `#main-content` and attaches DOM listeners (`js/app.js:296`, `js/pages/admin/users.js:10`, `js/pages/student/trainings.js:14`, `js/pages/responsible/plans.js:11`).

Required changes:

- Rewrite screens as React Native components using `View`, `Text`, `Pressable`, `TextInput`, `ScrollView`/`FlatList`, `Image`, and modal/bottom-sheet components.
- Convert each current module to a screen/component:
  - Auth: login, register, forgot password, update password from `js/app.js:293`, `js/app.js:411`, `js/app.js:470`, `js/app.js:515`.
  - Profile and edit sheets from `js/app.js:613`, `js/app.js:739`, `js/app.js:790`, `js/app.js:829`.
  - Student dashboard/trainings/attendance/plans from `js/pages/student/*`.
  - Responsible dashboard/students/trainings/plans/payments from `js/pages/responsible/*`.
  - Admin dashboard/users/trainings/plans/charges/reports from `js/pages/admin/*`.
- Replace `innerHTML`, `document.getElementById`, `querySelectorAll`, `classList`, and DOM events with React state, props, effects, and event handlers.
- Replace `confirm()` with a native alert/dialog.
- Replace DOM bottom sheet helper with a native modal or bottom sheet implementation.

### 6. Styling and Design Tokens

Current state:

- CSS variables define colors, fonts, radius, and semantic status tokens (`css/variables.css:50`).
- CSS files implement global browser layout, fixed bottom nav, cards, inputs, calendars, charts, login animations, and responsive media queries (`css/reset.css:12`, `css/components.css:79`, `css/components.css:311`, `css/pages.css:33`).

Required changes:

- Port design tokens into a TypeScript theme object.
- Replace CSS classes with React Native `StyleSheet` objects or a React Native styling system.
- Replace CSS custom properties like `var(--dx-teal)` with theme constants.
- Replace CSS safe-area `env()` usage with `react-native-safe-area-context`.
- Replace browser CSS animations and canvas particles with React Native-compatible animation/canvas alternatives or remove them.
- Load fonts through Expo font APIs rather than `@font-face`. Existing font assets can be reused from `assets/fonts/`.

### 7. QR Generation and Camera Scanning

Current state:

- QR generation depends on browser `QRCode` global (`js/qrcode.js:9`, `js/pages/admin/trainings.js:342`).
- QR scanning depends on browser `Html5Qrcode` global and DOM element `#reader` (`js/pages/student/trainings.js:264`).

Required changes:

- Replace `html5-qrcode` with `expo-camera`.
- Use `CameraView` and its barcode scanning callback for QR scanning.
- Request camera permissions with Expo camera permission APIs.
- Ensure the scanner is unmounted or inactive when leaving the screen/modal.
- Replace QR generation with a React Native-compatible QR component or generated image/SVG strategy.

Official Expo camera docs state `expo-camera` is included in Expo Go and supports detecting bar codes in the camera preview. They also document `CameraView`, `onBarcodeScanned`, and QR barcode settings.

### 8. File Upload and External Links

Current state:

- Avatar upload uses browser `<input type="file">`, receives a `File`, uploads it to Supabase Storage, then stores the public URL (`js/app.js:625`, `js/app.js:790`, `js/app.js:801`, `js/app.js:808`).
- External links use browser anchors with `target="_blank"` for athlete records, Diamond X website, and Google Maps (`js/app.js:669`, `js/app.js:704`, `js/pages/student/trainings.js:148`, `js/pages/admin/trainings.js:128`).

Required changes:

- Replace file input with a native image/file picker flow that produces a URI/blob suitable for Supabase Storage upload.
- Replace browser anchors with React Native `Linking.openURL()` or Expo Router link components where appropriate.
- Replace Google Maps web URLs with `Linking.openURL()` to the same URL or platform-specific map links.

### 9. Auth, Password Recovery, and Deep Links

Current state:

- Password reset redirects to `window.location.origin + window.location.pathname` (`js/app.js:455`).
- Recovery mode parses tokens from browser `window.location.search` and `window.location.hash` (`js/app.js:57`, `js/app.js:75`, `js/app.js:102`).

Required changes:

- Configure an Expo app scheme in app config and Supabase Auth redirect URLs.
- Replace URL parsing helpers with deep link listeners and route params.
- Keep existing Supabase flows conceptually: `resetPasswordForEmail`, `setSession`, `verifyOtp`, `exchangeCodeForSession`, and `updateUser({ password })` are already isolated in `js/app.js` and can be ported to native code paths (`js/app.js:129`, `js/app.js:145`, `js/app.js:162`, `js/app.js:506`).

### 10. Payments and Asaas

Current state:

- `asaas-checkout` Edge Function exists but most current client plan purchase flows insert `student_plans` records directly rather than invoking Asaas checkout (`supabase/functions/asaas-checkout/index.ts:48`, `js/pages/student/plans.js:129`, `js/pages/responsible/plans.js:161`).
- Admin charges manage statuses directly on `student_plans` (`js/pages/admin/charges.js:213`, `js/pages/admin/charges.js:223`).

Required changes:

- Keep Edge Function code in `supabase/functions/`.
- Port purchase screens to call the same Supabase table/function boundaries from React Native.
- If payment URLs/invoices are returned by Asaas, open them with native linking instead of browser navigation.
- Preserve the rule that payment provider secrets remain in Edge Function environment variables, which is already documented in the PRD (`PRD.md:226`).

### 11. Backend, SQL, and RLS

Current state:

- Supabase migrations and Edge Functions are independent of the web DOM and can remain as backend artifacts.
- Client modules rely on RLS to enforce role behavior and relationships.

Required changes:

- Keep `migrations/` and `supabase/functions/` in the repository.
- Reuse existing table names and query shapes unless schema changes are introduced separately.
- Keep the admin update flow behind `admin-update-user`; it already validates the caller role server-side.
- Confirm the deployed database has all local migrations, especially `training_reservations`, because current UI has fallback handling for schema cache/table absence (`js/trainingReservations.js:1`, `migrations/003_training_reservations.sql:87`).

### 12. Tests

Current state:

- Current TestSprite tests are browser/Playwright-style Python tests for web hash routes.
- The TestSprite report covers requirements but includes web-specific paths such as `/#dashboard`, `/#trainings`, and `/#attendance` in the generated PRD/test plan (`testsprite_tests/standard_prd.json:30`, `testsprite_tests/standard_prd.json:117`, `testsprite_tests/standard_prd.json:123`).

Required changes:

- Existing browser tests cannot directly validate native Expo Go UI.
- Keep them only if Expo Web remains supported.
- Add native test strategy for React Native screens and flows. Required coverage should mirror existing product flows: auth/role routing, dashboard, reservations, QR check-in, attendance, responsible links, plans/payments, admin management, and reports.
- Manual Expo Go validation should include real device camera permission and QR scanning because browser QR tests do not prove native camera behavior.

## File-by-File Change Map

### Replace or retire for native

- `index.html` - Replace with Expo entry/router files.
- `manifest.json` - Move metadata/icons into Expo app config.
- `service-worker.js` - Native Expo Go does not use this browser service worker.
- `css/reset.css`, `css/variables.css`, `css/components.css`, `css/pages.css` - Port tokens and styles into React Native theme/styles.
- `js/app.js` - Split into auth provider, route layouts, role guard, auth screens, profile screens, and tab navigation.
- `js/auth.js` - Keep auth method names conceptually, but remove DOM toast implementation.
- `js/supabase.js` - Replace with React Native `createClient` module using package import, env variables, persistent storage, and URL polyfill.
- `js/qrcode.js` - Replace with React Native-compatible QR component.
- `js/pages/**/*.js` - Rewrite as React Native screens/components.

### Port with limited changes

- `js/calendar.js` - Pure date helpers can become `src/utils/calendar.ts`.
- `js/trainingReservations.js` - Error helper can become `src/utils/trainingReservations.ts`.
- CPF and phone mask/validation parts of `js/ui.js` can become form utilities; DOM bottom sheet parts must be replaced.

### Keep mostly unchanged

- `migrations/*.sql` - Backend schema/RLS remains relevant.
- `supabase/functions/*/index.ts` - Edge Functions remain relevant.
- `assets/icons/icon-192.png`, `assets/icons/icon-512.png`, `base_icon_transparent_background.png`, `assets/bg-diamond.webp`, `assets/fonts/*` - Reuse through Expo asset/font loading, subject to native image/font format compatibility.
- Documentation under `docs/`, `README.md`, `PRD.md` - Update after migration to describe Expo/React Native instead of PWA.

### Remove or ignore from native app bundle

- `.DS_Store` files.
- `testsprite_tests/__pycache__/` and `testsprite_tests/tmp/` generated artifacts.
- Full font source packages under `Montserrat-Full-Version/` may remain as source/licensing artifacts, but the app should only bundle selected runtime font files.

## Proposed Expo Native Folder Shape

This is a change map, not an implemented structure:

```text
.
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── update-password.tsx
│   ├── (student)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── trainings.tsx
│   │   ├── plans.tsx
│   │   ├── attendance.tsx
│   │   └── profile.tsx
│   ├── (responsible)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── students.tsx
│   │   ├── trainings.tsx
│   │   ├── plans.tsx
│   │   ├── payments.tsx
│   │   └── profile.tsx
│   └── (admin)/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── users.tsx
│       ├── trainings.tsx
│       ├── plans.tsx
│       ├── charges.tsx
│       ├── reports.tsx
│       └── profile.tsx
├── src/
│   ├── lib/supabase.ts
│   ├── providers/auth-provider.tsx
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── student/
│   │   ├── responsible/
│   │   └── admin/
│   ├── theme/
│   └── utils/
├── assets/
├── migrations/
└── supabase/functions/
```

## External Documentation Checked

- Expo Router installation/quick start: `https://docs.expo.dev/router/installation/`
- Expo Router SDK reference: `https://docs.expo.dev/versions/latest/sdk/router/`
- Expo development builds and Expo Go boundary: `https://docs.expo.dev/develop/development-builds/create-a-build`
- Supabase Auth with React Native: `https://supabase.com/docs/guides/auth/quickstarts/react-native`
- Supabase with Expo React Native: `https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native`
- Expo Camera SDK: `https://docs.expo.dev/versions/latest/sdk/camera/`
- AsyncStorage SDK reference: `https://docs.expo.dev/versions/latest/sdk/async-storage/`

## Code References

- `README.md:7` - Current frontend is HTML/CSS/JS PWA, not Expo.
- `package.json:1` - No Expo/React Native project setup exists.
- `index.html:70` - Supabase SDK currently comes from CDN.
- `js/supabase.js:11` - Supabase client currently depends on `window.supabase`.
- `js/app.js:228` - App routing/rendering is browser hash/DOM based.
- `js/app.js:894` - Bottom nav is generated HTML, role based.
- `js/ui.js:17` - Shared UI bottom sheet is DOM based.
- `js/pages/student/trainings.js:264` - QR scanner uses browser `Html5Qrcode`.
- `js/pages/admin/trainings.js:342` - Admin QR generation uses browser `QRCode`.
- `css/variables.css:50` - Design tokens to port into native theme.
- `migrations/002_rls_security.sql:15` - RLS is the server-side authorization layer.
- `supabase/functions/admin-update-user/index.ts:59` - Admin Edge Function verifies authenticated caller.

## Architecture Documentation

The current app is a static browser SPA with direct Supabase client access and Supabase RLS. Runtime flow is:

```text
index.html -> CDN globals + local ES modules -> js/app.js init -> Supabase session -> users profile -> hash route -> role-specific page module -> direct Supabase table/function calls
```

The Expo Go native flow should become:

```text
Expo entry -> auth provider -> Supabase React Native client -> Expo Router layout -> role-specific route group -> React Native screen -> Supabase table/function calls
```

Backend boundaries remain:

```text
React Native client -> Supabase Auth/PostgREST/Storage/Functions -> RLS/Edge Function authorization -> Postgres/Asaas
```

## Historical Context

The PRD defines the product as a mobile-first PWA with athlete, responsible/business manager, and admin workflows (`PRD.md:7`, `PRD.md:11`, `PRD.md:13`). It explicitly lists QR check-in, reservation, attendance, plans/payments, and role-based RLS goals (`PRD.md:27`, `PRD.md:29`, `PRD.md:32`).

Existing research documents in `docs/research/` cover previous implementation details for registration, reservations, profile updates, admin role changes, login background, and bottom nav spacing. These remain useful as current web-app evidence, but this migration would change the client architecture.

TestSprite artifacts currently describe and validate the web/PWA route structure. They should be treated as functional requirements inventory for the native rewrite, not as native test coverage.

## Related Research

- `docs/research/2026-05-03-spec-alteracoes-analysis.md`
- `docs/research/2026-05-04-reservas-calendario.md`
- `docs/research/2026-05-04-tc001-register-role-based-area.md`
- `docs/research/2026-05-05-admin-user-role-change.md`
- `docs/research/2026-05-05-profile-logout-bottom-nav-overlap.md`

## Open Questions

- Should the migrated app keep Expo Web/PWA support, or should native iOS/Android be the only target?
- Should the current static web app be replaced in-place, or should an Expo app be added alongside it during migration?
- Which payment flow is the intended source of truth: direct `student_plans` inserts, the existing `asaas-checkout` Edge Function, or a new checkout flow returning payment URLs?
- Which native QR generation library should be selected for admin QR display?
- Which native image picker/upload strategy should be selected for avatars and athlete record files?
- Does the remote Supabase project currently have all local migrations applied, especially `training_reservations`?
