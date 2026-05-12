---
date: 2026-05-09T17:04:51-03:00
researcher: Codex
git_commit: 1797a9bbdd427e96e0e380dc21837d8c718d50c3
branch: work
repository: Diamond
topic: "Create a md file to the all functions, pages, features and more, please. Read all from this project."
tags: [research, codebase, inventory]
status: complete
last_updated: 2026-05-09
last_updated_by: Codex
---

# Research: Diamond X Project Inventory

**Date**: 2026-05-09T17:04:51-03:00  
**Researcher**: Codex  
**Git Commit**: 1797a9bbdd427e96e0e380dc21837d8c718d50c3  
**Branch**: work  
**Repository**: Diamond

## Research Question

Create a md file to the all functions, pages, features and more, please. Read all from this project.

## Scope

This document inventories the full local project as of the commit above: SPA shell, routes, page modules, exported functions/methods, Supabase usage, Edge Functions, migrations, PWA files, CSS structure, assets, docs, and tests. It does not inspect binary font/image internals or execute the app.

## Summary

Diamond X is a mobile-first static PWA for training center management. The frontend is plain HTML/CSS/JavaScript ES modules, using `index.html` as the shell and `js/app.js` as the bootstrap/router (`README.md:3`, `README.md:7`, `index.html:39`, `js/app.js:20`). It supports athlete, responsible/businessman, and admin roles, with role-specific dashboards, training schedules, reservations, plans, payments, reports, profile editing, QR check-in, and Supabase-backed authentication/data (`README.md:40`, `js/app.js:580`, `js/app.js:591`, `js/app.js:597`, `js/app.js:603`).

Backend functionality is supplied by Supabase Auth, Postgres tables protected by RLS migrations, Supabase Storage for avatars, and two Deno Edge Functions: `admin-update-user` and `asaas-checkout` (`README.md:9`, `js/app.js:800`, `supabase/functions/admin-update-user/index.ts:25`, `supabase/functions/asaas-checkout/index.ts:12`).

## Project Structure

- `index.html` - SPA shell, PWA metadata, CDN scripts, global syntax error fallback, service worker registration (`index.html:1`, `index.html:55`, `index.html:70`, `index.html:78`).
- `manifest.json` - PWA name, display mode, theme colors, and icons (`manifest.json:1`).
- `service-worker.js` - install, activate, and fetch caching strategy for app assets (`service-worker.js:1`, `service-worker.js:22`, `service-worker.js:31`, `service-worker.js:44`).
- `js/` - application modules, routing, auth, Supabase client, UI helpers, calendar helpers, page modules (`README.md:20`).
- `css/` - reset, theme variables, reusable components, and page-specific styles (`README.md:19`, `css/components.css:3`, `css/pages.css:2`).
- `assets/` - local fonts, icons, and app imagery (`assets/fonts/Abnes.ttf`, `assets/icons/icon-192.png`, `assets/bg-diamond.webp`).
- `migrations/` - Supabase SQL migrations for athlete profile fields, RLS, reservations, and Auth profile trigger (`README.md:74`).
- `supabase/functions/` - Deno Edge Functions for admin user updates and Asaas checkout (`README.md:35`).
- `docs/research/` and `docs/specs/` - implementation research and specs already present in the repo.
- `testsprite_tests/` - generated frontend test cases and reports for registration, login, reservations, QR check-in, profile, plans, and role-specific areas.

## Runtime Entry Points

### HTML Shell

- `index.html` defines `#main-content`, `#bottom-nav`, and `#toasts-container`, which are filled by JavaScript at runtime (`index.html:39`, `index.html:41`, `index.html:47`, `index.html:51`).
- External dependencies are loaded from CDNs: Phosphor icons, Supabase JS v2, qrcodejs, and html5-qrcode (`index.html:30`, `index.html:70`, `index.html:71`, `index.html:72`).
- ES modules loaded directly: `js/supabase.js`, `js/auth.js`, and `js/app.js` (`index.html:73`, `index.html:74`, `index.html:75`).
- Service worker registration happens on window load when supported (`index.html:78`).

### App Bootstrap And Router

- `app.init()` starts the SPA, reads the current Supabase session, loads the profile, subscribes to Auth state changes, listens for hash changes, and renders the current route (`js/app.js:28`, `js/app.js:31`, `js/app.js:37`, `js/app.js:53`, `js/app.js:938`).
- `render()` maps hash routes to pages and redirects unauthenticated users to `#login` (`js/app.js:228`, `js/app.js:231`, `js/app.js:234`, `js/app.js:264`).
- Public routes are `#login`, `#register`, `#forgot-password`, and `#update-password` (`js/app.js:231`).
- Authenticated routes include `#dashboard`, `#trainings`, `#attendance`, `#students`, `#plans`, `#payments`, `#users`, `#reports`, and `#profile` (`js/app.js:269`).
- Admin-only route checks apply to `#users` and `#reports`; responsible/business/admin checks apply to `#students` (`js/app.js:246`, `js/app.js:249`, `js/app.js:253`).

## Pages And Features

### Public/Auth Pages

- Login page: renders Diamond X branding, email/password form, forgot password link, animated particles, and calls `auth.login()` on submit (`js/app.js:293`, `js/app.js:321`, `js/app.js:324`, `js/auth.js:4`).
- Forgot password page: renders recovery email form and calls `supabase.auth.resetPasswordForEmail()` with redirect back to the app (`js/app.js:411`, `js/app.js:446`, `js/app.js:455`).
- Update password page: detects recovery session credentials, establishes a session if needed, and calls `supabase.auth.updateUser({ password })` (`js/app.js:470`, `js/app.js:492`, `js/app.js:497`, `js/app.js:506`).
- Register page: collects full name, email, CPF, phone, role, and password; validates CPF; calls `auth.register()`; then routes to dashboard or login depending on session state (`js/app.js:515`, `js/app.js:535`, `js/app.js:539`, `js/app.js:564`, `js/app.js:200`).

### Shared Authenticated Pages

- Dashboard: dispatches to admin, responsible/businessman, or student dashboard based on profile role (`js/app.js:580`).
- Trainings: dispatches to admin, responsible/businessman, or student training module (`js/app.js:591`).
- Plans: dispatches to admin, responsible/businessman, or student plan module (`js/app.js:597`).
- Payments: dispatches to admin charge management for admins and responsible payment history for other roles (`js/app.js:603`).
- Profile: displays avatar, personal data, student athlete profile fields, role badge, external Diamond X site link, role-specific admin/responsible shortcuts, avatar upload, personal data edit, athlete anamnese edit, and logout (`js/app.js:613`, `js/app.js:648`, `js/app.js:676`, `js/app.js:685`, `js/app.js:704`, `js/app.js:713`).
- Bottom navigation: role-specific nav items are generated by `updateNav()` (`js/app.js:894`, `js/app.js:907`, `js/app.js:914`, `js/app.js:921`).

### Student Pages

- Student dashboard shows greeting, active/latest plan status, monthly attendance count, next training, and responsible contact when linked (`js/pages/student/dashboard.js:5`, `js/pages/student/dashboard.js:38`, `js/pages/student/dashboard.js:97`, `js/pages/student/dashboard.js:141`).
- Student trainings page shows QR check-in entry, monthly calendar, future training list, reservation state, active-plan requirement, 24-hour reservation cutoff, reservation creation/cancellation, camera scanner, and QR token validation (`js/pages/student/trainings.js:12`, `js/pages/student/trainings.js:58`, `js/pages/student/trainings.js:172`, `js/pages/student/trainings.js:217`, `js/pages/student/trainings.js:237`, `js/pages/student/trainings.js:252`, `js/pages/student/trainings.js:290`).
- Student attendance page shows total presences, current-month presences, current-month calendar, weekly bar chart, and attendance history; it can also render another student when a responsible/admin passes `id` in the hash (`js/pages/student/attendance.js:6`, `js/pages/student/attendance.js:15`, `js/pages/student/attendance.js:95`, `js/pages/student/attendance.js:155`).
- Student plans page lists active plans by category (`training` and `physio`), separates pre-Diamond and Diamond X tiers, and creates `student_plans` pending-payment rows when a plan is purchased (`js/pages/student/plans.js:8`, `js/pages/student/plans.js:32`, `js/pages/student/plans.js:44`, `js/pages/student/plans.js:116`).

### Responsible/Businessman Pages

- Responsible dashboard summarizes linked students and latest plan status, with links to attendance, trainings, and plans (`js/pages/responsible/dashboard.js:5`, `js/pages/responsible/dashboard.js:35`, `js/pages/responsible/dashboard.js:84`, `js/pages/responsible/dashboard.js:124`).
- Responsible students page lists linked students and provides an email-based student linking bottom sheet (`js/pages/responsible/students.js:6`, `js/pages/responsible/students.js:27`, `js/pages/responsible/students.js:81`).
- Responsible trainings page shows monthly training calendar and reservation status for linked students (`js/pages/responsible/trainings.js:9`, `js/pages/responsible/trainings.js:47`, `js/pages/responsible/trainings.js:140`, `js/pages/responsible/trainings.js:177`).
- Responsible plans page lists plans by category, selects beneficiary (`self` or linked student), validates existing active training plan, and creates pending payment records (`js/pages/responsible/plans.js:9`, `js/pages/responsible/plans.js:42`, `js/pages/responsible/plans.js:115`, `js/pages/responsible/plans.js:147`).
- Responsible payments page lists purchases where the current user is `purchased_by`, with status badges and payment labels (`js/pages/responsible/payments.js:5`, `js/pages/responsible/payments.js:20`, `js/pages/responsible/payments.js:81`).

### Admin Pages

- Admin dashboard shows total students, active plans, estimated six-month revenue chart, today training summary, and a recent charges section placeholder (`js/pages/admin/dashboard.js:5`, `js/pages/admin/dashboard.js:51`, `js/pages/admin/dashboard.js:99`, `js/pages/admin/dashboard.js:117`).
- Admin users page lists users by role filter, opens user edit bottom sheet, validates CPF, invokes `admin-update-user`, and can send password reset email (`js/pages/admin/users.js:8`, `js/pages/admin/users.js:43`, `js/pages/admin/users.js:95`, `js/pages/admin/users.js:116`, `js/pages/admin/users.js:167`, `js/pages/admin/users.js:199`).
- Admin trainings page lists monthly sessions, creates sessions, deletes sessions, shows QR code, lists reservations, and toggles attendance manually (`js/pages/admin/trainings.js:10`, `js/pages/admin/trainings.js:51`, `js/pages/admin/trainings.js:188`, `js/pages/admin/trainings.js:208`, `js/pages/admin/trainings.js:305`, `js/pages/admin/trainings.js:338`).
- Admin plans page lists all plans, creates plans, updates plans, and deletes plans (`js/pages/admin/plans.js:6`, `js/pages/admin/plans.js:30`, `js/pages/admin/plans.js:76`, `js/pages/admin/plans.js:95`).
- Admin reports page calculates school attendance average, attendance volume chart, and ranked student attendance for current month or all time (`js/pages/admin/reports.js:5`, `js/pages/admin/reports.js:51`, `js/pages/admin/reports.js:123`, `js/pages/admin/reports.js:165`).
- Admin charges page manages finance records: search, filters, manual charge creation, charge listing, mark paid, cancel charge, and refresh (`js/pages/admin/charges.js:6`, `js/pages/admin/charges.js:47`, `js/pages/admin/charges.js:59`, `js/pages/admin/charges.js:122`, `js/pages/admin/charges.js:187`, `js/pages/admin/charges.js:243`).

## Function And Method Inventory

### `js/app.js`

- `init()` - initializes session, profile, auth listener, hash listener, and first render (`js/app.js:28`).
- `isRecoveryRedirect()` - detects password recovery mode from search/hash credentials (`js/app.js:57`).
- `getHashParams()` - parses the hash body as URL params (`js/app.js:75`).
- `getHashQueryParams()` - parses query params embedded after a hash route (`js/app.js:80`).
- `getRecoveryCode()` - reads recovery `code` from URL/search/hash (`js/app.js:86`).
- `getRecoveryTokenHash()` - reads recovery `token_hash` (`js/app.js:94`).
- `getRecoveryTokens()` - reads recovery access and refresh tokens (`js/app.js:102`).
- `hasRecoveryCredentials()` - checks whether recovery credentials are present (`js/app.js:113`).
- `establishRecoverySession()` - restores/verifies recovery session with Supabase (`js/app.js:122`).
- `getCurrentRoute()` - returns current hash route and params, forcing recovery route when needed (`js/app.js:172`).
- `loadProfile()` - loads the current user profile from `users`, falling back to Auth metadata (`js/app.js:185`).
- `handleRegistrationSuccess(result)` - handles post-signup routing and profile load (`js/app.js:200`).
- `render()` - central route renderer and role guard (`js/app.js:228`).
- `renderLogin()` - login page renderer and submit handler (`js/app.js:293`).
- `initLoginParticles()` - canvas particle background for login (`js/app.js:333`).
- `stopLoginParticles()` - stops the login particle animation (`js/app.js:407`).
- `renderForgotPassword()` - forgot password page and email submit handler (`js/app.js:411`).
- `renderUpdatePassword()` - password update page and submit handler (`js/app.js:470`).
- `renderRegister()` - registration page and signup handler (`js/app.js:515`).
- `renderDashboard()` - role-based dashboard dispatcher (`js/app.js:580`).
- `renderTrainings()` - role-based trainings dispatcher (`js/app.js:591`).
- `renderPlans()` - role-based plans dispatcher (`js/app.js:597`).
- `renderPayments()` - role-based payments/charges dispatcher (`js/app.js:603`).
- `getRoleLabel(role)` - maps internal roles to Portuguese display labels (`js/app.js:608`).
- `renderProfile()` - profile page renderer and event wiring (`js/app.js:613`).
- `showEditAnamneseForm()` - athlete profile bottom sheet and update handler (`js/app.js:739`).
- `handleAvatarUpload(event)` - uploads avatar to Supabase Storage and updates `users.avatar_url` (`js/app.js:790`).
- `showEditProfileForm()` - profile edit bottom sheet and update handler (`js/app.js:829`).
- `updateNav(activeHash)` - generates role-specific bottom navigation (`js/app.js:894`).

### Shared Modules

- `auth.login(email, password)` - Supabase password sign-in (`js/auth.js:4`).
- `auth.register(email, password, metadata)` - Supabase signup with user metadata (`js/auth.js:14`).
- `auth.logout()` - Supabase sign out (`js/auth.js:32`).
- `auth.resetPassword(email)` - Supabase password reset email (`js/auth.js:37`).
- `toast.show(message, type)` - transient toast UI (`js/auth.js:44`).
- `escapeHtml(str)` - DOM-based HTML escaping helper (`js/ui.js:1`).
- `safeUrl(url)` - allows only `http` and `https` URLs for rendered links (`js/ui.js:7`).
- `ui.bottomSheet.show(title, contentHtml, onSave)` - bottom-sheet modal with form handling (`js/ui.js:19`).
- `ui.mask.cpf(value)` - CPF mask formatter (`js/ui.js:76`).
- `ui.mask.phone(value)` - phone mask formatter (`js/ui.js:84`).
- `ui.mask.apply(input, type)` - binds formatter to input event (`js/ui.js:91`).
- `ui.validate.cpf(cpf)` - CPF checksum validation (`js/ui.js:98`).
- `dateKey(date)` - converts date to `YYYY-MM-DD` local key (`js/calendar.js:3`).
- `getMonthMatrix(date)` - builds a 6-week calendar matrix (`js/calendar.js:14`).
- `formatDayLabel(date)` - localized day label (`js/calendar.js:46`).
- `formatMonthLabel(date)` - localized month/year label (`js/calendar.js:54`).
- `groupByDate(items, getDate)` - groups records by date key (`js/calendar.js:61`).
- `getWeekdayLabels()` - returns weekday labels (`js/calendar.js:73`).
- `isReservationsSchemaError(error)` - detects missing/schema-cache reservation table errors (`js/trainingReservations.js:1`).
- `getReservationsLoadMessage(error)` - maps reservation loading errors to user messages (`js/trainingReservations.js:16`).
- `qrCode.generate(containerId, token, size)` - QR code generator wrapper around global `QRCode` (`js/qrcode.js:1`).
- `supabase` - exported Supabase client from hardcoded project URL and anon key (`js/supabase.js:1`, `js/supabase.js:11`).

### Student Modules

- `studentDashboard.render()` - renders athlete dashboard shell (`js/pages/student/dashboard.js:5`).
- `studentDashboard.loadStatus()` - loads current plan and monthly attendance (`js/pages/student/dashboard.js:38`).
- `studentDashboard.loadNextTraining()` - loads next future session (`js/pages/student/dashboard.js:97`).
- `studentDashboard.getPlanStatusLabel(status)` - plan status label map (`js/pages/student/dashboard.js:131`).
- `studentDashboard.loadResponsible()` - loads linked responsible contact (`js/pages/student/dashboard.js:141`).
- `studentTrainings.render()` - renders QR card, calendar, and list shell (`js/pages/student/trainings.js:12`).
- `studentTrainings.loadAvailableTrainings()` - loads sessions, reservations, active plan, and session cards (`js/pages/student/trainings.js:58`).
- `studentTrainings.renderCalendar(sessions, reservations)` - renders training calendar (`js/pages/student/trainings.js:172`).
- `studentTrainings.setupReservationEvents()` - wires reserve/cancel buttons (`js/pages/student/trainings.js:202`).
- `studentTrainings.changeMonth(direction)` - navigates calendar month (`js/pages/student/trainings.js:212`).
- `studentTrainings.reserveTraining(sessionId)` - inserts booked reservation (`js/pages/student/trainings.js:217`).
- `studentTrainings.cancelReservation(reservationId)` - marks reservation cancelled (`js/pages/student/trainings.js:237`).
- `studentTrainings.showScanner()` - opens camera scanner bottom sheet (`js/pages/student/trainings.js:252`).
- `studentTrainings.stopScanner()` - stops html5-qrcode scanner (`js/pages/student/trainings.js:284`).
- `studentTrainings.handleScanSuccess(token)` - validates active plan, same-day QR token, and inserts attendance (`js/pages/student/trainings.js:290`).
- `studentAttendance.render(targetStudentId)` - renders attendance view for current or authorized target student (`js/pages/student/attendance.js:6`).
- `studentAttendance.loadAttendance(studentId)` - loads attendance history and stats (`js/pages/student/attendance.js:95`).
- `studentAttendance.renderVisuals(history)` - renders calendar and weekly chart (`js/pages/student/attendance.js:155`).
- `studentPlans.render()` - renders plan catalog shell (`js/pages/student/plans.js:8`).
- `studentPlans.setupTabs()` - binds training/physio category tabs (`js/pages/student/plans.js:32`).
- `studentPlans.loadPlans()` - loads active plans by category (`js/pages/student/plans.js:44`).
- `studentPlans.setupPurchaseEvents()` - binds buy buttons (`js/pages/student/plans.js:110`).
- `studentPlans.purchasePlan(planId, planName)` - creates pending payment for current student (`js/pages/student/plans.js:116`).

### Responsible Modules

- `responsibleDashboard.render()` - renders responsible dashboard shell (`js/pages/responsible/dashboard.js:5`).
- `responsibleDashboard.loadStudentsSummary()` - loads linked students and plan summary (`js/pages/responsible/dashboard.js:35`).
- `responsibleDashboard.getPlanStatusLabel(status)` - status label map (`js/pages/responsible/dashboard.js:124`).
- `responsibleDashboard.getPlanStatusClass(status)` - status CSS class map (`js/pages/responsible/dashboard.js:134`).
- `responsibleStudents.render()` - renders linked students page (`js/pages/responsible/students.js:6`).
- `responsibleStudents.loadLinkedStudents()` - loads linked students (`js/pages/responsible/students.js:27`).
- `responsibleStudents.showLinkStudentForm()` - links student by email (`js/pages/responsible/students.js:81`).
- `responsibleTrainings.render()` - renders responsible training calendar/list shell (`js/pages/responsible/trainings.js:9`).
- `responsibleTrainings.loadTrainings()` - loads linked students, sessions, and reservations (`js/pages/responsible/trainings.js:47`).
- `responsibleTrainings.renderSessionCard(session, reservations, studentsById)` - renders per-session reservation card (`js/pages/responsible/trainings.js:140`).
- `responsibleTrainings.renderCalendar(sessions, reservations)` - renders reservation-aware calendar (`js/pages/responsible/trainings.js:177`).
- `responsibleTrainings.changeMonth(direction)` - navigates calendar month (`js/pages/responsible/trainings.js:207`).
- `responsiblePlans.render()` - renders responsible plan catalog (`js/pages/responsible/plans.js:9`).
- `responsiblePlans.setupTabs()` - binds category tabs (`js/pages/responsible/plans.js:30`).
- `responsiblePlans.loadPlans()` - loads active plans by category (`js/pages/responsible/plans.js:42`).
- `responsiblePlans.setupPurchaseEvents()` - binds purchase buttons (`js/pages/responsible/plans.js:109`).
- `responsiblePlans.showPurchaseForm(planId, planName)` - selects beneficiary/payment method and inserts pending plan (`js/pages/responsible/plans.js:115`).
- `responsiblePayments.render()` - renders payment history shell (`js/pages/responsible/payments.js:5`).
- `responsiblePayments.loadPayments()` - loads purchased `student_plans` rows (`js/pages/responsible/payments.js:20`).
- `responsiblePayments.getStatusLabel(status)` - payment status labels (`js/pages/responsible/payments.js:81`).
- `responsiblePayments.getStatusClass(status)` - payment badge classes (`js/pages/responsible/payments.js:91`).

### Admin Modules

- `adminDashboard.render()` - renders admin dashboard shell (`js/pages/admin/dashboard.js:5`).
- `adminDashboard.loadRevenueChart()` - builds estimated monthly revenue chart from active plans (`js/pages/admin/dashboard.js:51`).
- `adminDashboard.loadStats()` - counts students and active plans (`js/pages/admin/dashboard.js:99`).
- `adminDashboard.loadTodayTrainings()` - lists today's sessions (`js/pages/admin/dashboard.js:117`).
- `adminUsers.render()` - renders admin users page (`js/pages/admin/users.js:8`).
- `adminUsers.loadUsers(roleFilter)` - loads users, optionally filtered by role (`js/pages/admin/users.js:43`).
- `adminUsers.getRoleBadgeClass(role)` - maps roles to badge classes (`js/pages/admin/users.js:86`).
- `adminUsers.setupFilters()` - binds role filters (`js/pages/admin/users.js:95`).
- `adminUsers.setupEditEvents(users)` - binds user card click handlers (`js/pages/admin/users.js:106`).
- `adminUsers.showEditUserForm(user)` - edits user data/role via Edge Function and sends reset email (`js/pages/admin/users.js:116`).
- `adminTrainings.render()` - renders admin training calendar/list (`js/pages/admin/trainings.js:10`).
- `adminTrainings.loadTrainings()` - loads sessions and reservations for selected month (`js/pages/admin/trainings.js:51`).
- `adminTrainings.renderCalendar(sessions, reservationsBySession)` - renders admin calendar (`js/pages/admin/trainings.js:156`).
- `adminTrainings.changeMonth(direction)` - navigates calendar month (`js/pages/admin/trainings.js:183`).
- `adminTrainings.setupEvents()` - binds QR, attendance, and delete buttons (`js/pages/admin/trainings.js:188`).
- `adminTrainings.showAttendanceList(sessionId, title)` - displays reservations and toggles attendance (`js/pages/admin/trainings.js:208`).
- `adminTrainings.showAddTrainingForm()` - creates a session with UUID QR token (`js/pages/admin/trainings.js:305`).
- `adminTrainings.showQrCode(token)` - renders QR code for check-in (`js/pages/admin/trainings.js:338`).
- `adminPlans.render()` - renders plan management shell (`js/pages/admin/plans.js:6`).
- `adminPlans.loadPlans()` - loads all plans (`js/pages/admin/plans.js:30`).
- `adminPlans.setupEvents(plans)` - binds edit/delete plan actions (`js/pages/admin/plans.js:76`).
- `adminPlans.showPlanForm(plan)` - creates or updates a plan (`js/pages/admin/plans.js:95`).
- `adminReports.render()` - renders reports shell (`js/pages/admin/reports.js:5`).
- `adminReports.loadFrequencyData(period)` - calculates frequency metrics (`js/pages/admin/reports.js:51`).
- `adminReports.renderSchoolChart(attendanceData, period)` - renders weekly/monthly chart data (`js/pages/admin/reports.js:123`).
- `adminReports.renderBars(container, counts, getLabel)` - generic bar chart renderer (`js/pages/admin/reports.js:165`).
- `adminCharges.render()` - renders finance/charges shell (`js/pages/admin/charges.js:6`).
- `adminCharges.setupSearch()` - filters charge cards by student name (`js/pages/admin/charges.js:47`).
- `adminCharges.showAddChargeForm()` - creates manual pending charge intent (`js/pages/admin/charges.js:59`).
- `adminCharges.loadCharges(statusFilter)` - loads charges by status (`js/pages/admin/charges.js:122`).
- `adminCharges.setupActionEvents(charges)` - binds charge card actions (`js/pages/admin/charges.js:177`).
- `adminCharges.showChargeActions(charge)` - mark paid/cancel charge bottom sheet (`js/pages/admin/charges.js:187`).
- `adminCharges.getStatusLabel(status)` - charge status labels (`js/pages/admin/charges.js:233`).
- `adminCharges.getStatusClass(status)` - charge badge classes (`js/pages/admin/charges.js:238`).
- `adminCharges.setupFilters()` - binds charge status filters (`js/pages/admin/charges.js:243`).

### Edge Functions

- `admin-update-user/jsonResponse(body, status)` - JSON/CORS response helper (`supabase/functions/admin-update-user/index.ts:12`).
- `admin-update-user/normalizeOptionalText(value)` - trims optional string fields to `null` if empty (`supabase/functions/admin-update-user/index.ts:19`).
- `admin-update-user/serve(handler)` - POST-only endpoint that authenticates the caller, verifies admin role, validates payload, updates `public.users`, then syncs Auth metadata (`supabase/functions/admin-update-user/index.ts:25`, `supabase/functions/admin-update-user/index.ts:59`, `supabase/functions/admin-update-user/index.ts:72`, `supabase/functions/admin-update-user/index.ts:104`, `supabase/functions/admin-update-user/index.ts:122`).
- `asaas-checkout/serve(handler)` - creates/fetches Asaas customer, creates payment, and inserts pending `student_plans` record with `asaas_payment_id` (`supabase/functions/asaas-checkout/index.ts:12`, `supabase/functions/asaas-checkout/index.ts:24`, `supabase/functions/asaas-checkout/index.ts:32`, `supabase/functions/asaas-checkout/index.ts:48`, `supabase/functions/asaas-checkout/index.ts:65`).

## Supabase Tables And Data Access

- `users` - profiles, roles, CPF/phone, avatar URL, athlete profile fields, Asaas customer ID; read and profile update usage appears throughout app modules (`js/app.js:187`, `js/app.js:814`, `js/pages/admin/users.js:47`, `supabase/functions/asaas-checkout/index.ts:44`).
- `student_plans` - plan purchase/payment records, active plan checks, charge management, revenue calculation, responsible payments (`js/pages/student/dashboard.js:44`, `js/pages/student/trainings.js:83`, `js/pages/admin/charges.js:126`, `js/pages/admin/dashboard.js:56`).
- `attendance` - QR/manual check-ins, history, reports, monthly counts (`js/pages/student/trainings.js:335`, `js/pages/admin/trainings.js:287`, `js/pages/student/attendance.js:99`, `js/pages/admin/reports.js:56`).
- `responsible_students` - links responsible/business users to student accounts (`js/pages/responsible/students.js:32`, `js/pages/responsible/students.js:117`, `js/pages/student/dashboard.js:146`).
- `training_sessions` - scheduled trainings and QR tokens (`js/pages/admin/trainings.js:59`, `js/pages/admin/trainings.js:325`, `js/pages/student/trainings.js:322`).
- `training_reservations` - session reservations and cancellations (`migrations/003_training_reservations.sql:4`, `js/pages/student/trainings.js:77`, `js/pages/student/trainings.js:220`, `js/pages/student/trainings.js:239`).
- `plans` - plan catalog and admin plan management (`js/pages/student/plans.js:49`, `js/pages/responsible/plans.js:47`, `js/pages/admin/plans.js:32`).
- Supabase Storage bucket `avatars` - avatar upload and public URL generation (`js/app.js:800`, `js/app.js:808`).

## Database Migrations

- `001_add_athlete_anamnese_fields.sql` adds `birth_date`, `current_club`, `weight_kg`, `height_cm`, and `athlete_record_url` to `public.users` (`migrations/001_add_athlete_anamnese_fields.sql:4`).
- `002_rls_security.sql` adds `businessman` to `user_role`, enables RLS on primary tables, and defines policies for `users`, `attendance`, `student_plans`, `plans`, `training_sessions`, and `responsible_students` (`migrations/002_rls_security.sql:7`, `migrations/002_rls_security.sql:16`, `migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:56`, `migrations/002_rls_security.sql:94`, `migrations/002_rls_security.sql:129`, `migrations/002_rls_security.sql:147`, `migrations/002_rls_security.sql:165`).
- `003_training_reservations.sql` creates `training_reservations`, indexes it, grants authenticated access, and defines RLS for select, insert, and update/cancel flows. Insert policy requires active plan and session at least 24 hours in the future (`migrations/003_training_reservations.sql:4`, `migrations/003_training_reservations.sql:19`, `migrations/003_training_reservations.sql:31`, `migrations/003_training_reservations.sql:46`, `migrations/003_training_reservations.sql:63`).
- `004_auth_users_profile_trigger.sql` creates `handle_new_auth_user()` and the `on_auth_user_created` trigger so Auth signups create/update `public.users` profiles while restricting self-selected role to student/responsible/businessman (`migrations/004_auth_users_profile_trigger.sql:4`, `migrations/004_auth_users_profile_trigger.sql:16`, `migrations/004_auth_users_profile_trigger.sql:22`, `migrations/004_auth_users_profile_trigger.sql:55`).

## PWA, Styling, And Assets

- The app manifest uses standalone display and Diamond X theme/background colors (`manifest.json:4`, `manifest.json:5`, `manifest.json:6`, `manifest.json:7`).
- Service worker pre-caches root, core CSS, core JS, icons, Phosphor, and Supabase CDN, then uses network-first for local HTML/JS/CSS and stale-while-revalidate for other GET requests (`service-worker.js:1`, `service-worker.js:2`, `service-worker.js:52`, `service-worker.js:61`, `service-worker.js:77`).
- `css/reset.css` establishes app shell layout, mobile viewport behavior, base form reset, and `.hidden`.
- `css/variables.css` defines local fonts and theme variables (`css/variables.css:2`, `css/variables.css:50`).
- `css/components.css` defines buttons, cards, inputs, badges, bottom nav, page headers, calendars, and charts (`css/components.css:3`, `css/components.css:28`, `css/components.css:52`, `css/components.css:66`, `css/components.css:80`, `css/components.css:130`, `css/components.css:311`, `css/components.css:398`).
- `css/pages.css` defines main-content transitions, login background, particle canvas, login/forgot pages, and responsive auth layout (`css/pages.css:2`, `css/pages.css:34`, `css/pages.css:41`, `css/pages.css:83`, `css/pages.css:140`).
- Assets include `assets/bg-diamond.webp`, local Montserrat/Abnes fonts, and PWA icons.

## Tests And Documentation

- `testsprite_tests/` contains 30 Python test cases, a frontend test plan JSON, standardized PRD JSON, HTML/Markdown reports, and temp output.
- Covered flows include registration by role, login, auth protection, admin access, reservations, check-in, attendance history, linked athletes, profile update, avatar update, plan purchase, linked-athlete purchase, and reservation cutoff.
- Existing docs include project README, PRD, specs, and research notes in `docs/research/` and `docs/specs/`.

## File Notes

- `js/asaas.js` exists but is currently empty.
- `package.json` only declares `"type": "module"` (`package.json:1`).
- `README.md` describes the stack, role capabilities, execution instructions, Supabase setup, migrations, and documentation map (`README.md:5`, `README.md:40`, `README.md:48`, `README.md:62`, `README.md:74`, `README.md:81`).

## Open Questions

None identified from local code inspection.
