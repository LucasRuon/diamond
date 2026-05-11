---
date: 2026-05-11T15:02:49-03:00
researcher: Codex
git_commit: 1797a9bbdd427e96e0e380dc21837d8c718d50c3
branch: work
repository: Diamond
topic: "nova feature, para criarmos um formulário obrigatório antes de completar o checkin do qrcode. Semlhante ao das imagens."
tags: [research, codebase]
status: complete
last_updated: 2026-05-11
last_updated_by: Codex
---

# Research: nova feature, para criarmos um formulário obrigatório antes de completar o checkin do qrcode. Semlhante ao das imagens.

**Date**: 2026-05-11T15:02:49-03:00
**Researcher**: Codex
**Git Commit**: 1797a9bbdd427e96e0e380dc21837d8c718d50c3
**Branch**: work
**Repository**: Diamond

## Research Question

nova feature, para criarmos um formulário obrigatório antes de completar o checkin do qrcode. Semlhante ao das imagens.

## Scope

Included: current student QR Code check-in flow, admin QR/manual attendance flow, attendance persistence, routing, shared UI form/bottom-sheet behavior, RLS policies, related tests/docs, and the visual references provided as local screenshots.

Excluded: implementation design, schema proposal, UI redesign, and code changes to the app runtime.

Assumption: the requested "formulário obrigatório" would be part of the athlete check-in path after QR token scan and before the `attendance` insert, because that is where the current app completes QR check-in.

## Summary

The current QR Code check-in is implemented entirely in `js/pages/student/trainings.js`. The athlete taps the scan button on `#trainings`, a bottom sheet starts `Html5Qrcode`, and a successful scan calls `handleScanSuccess(token)`. That method stops the scanner, removes the scanner sheet, validates active plan status, validates that the scanned `qr_code_token` belongs to a training session scheduled for the current day, then inserts directly into `attendance` with `method: 'qrcode'`.

There is no current pre-training questionnaire module, route, table, migration, or persisted response object in the live codebase. Existing form infrastructure is generic: `ui.bottomSheet.show()` can render any HTML form and convert `FormData` to an object for an async save callback. The profile/anamnese form stores athlete profile fields on `users`, but it is unrelated to a per-session pre-check-in questionnaire.

The provided screenshots show a separate "Treino / Pré-treino" questionnaire flow with recovery scale, well-being scale, body pain point selection, pain intensity bottom sheet, optional weight input, and an "Enviar questionário" final action. No matching strings or domain objects for those screens exist in the local JavaScript, CSS, migrations, docs, or tests.

## Detailed Findings

### Visual Reference Flow

- The first screenshot shows an agenda/training view with two check-in-related actions: a green `Checkin` button and a white `Responda o questionário pré-treino` button.
- The next screenshots show a full-screen pre-training flow titled `Treino` and `Pré-treino`.
- The flow includes:
  - Recovery scale choices from 6 to 20, with labels such as `Recuperação pobre`, `Recuperação razoável`, and `Recuperação boa`.
  - A well-being scale with grouped categories: `Nutrição e hidratação`, `Dormir e descansar`, `Relaxamento e apoio emocional`, and `Alongamento e descanso ativo`.
  - Front and rear body diagrams for selecting pain points.
  - A pain-intensity bottom sheet per selected body part with values 1-10 and labels from `Leve` to `Pior dor possível`.
  - A final optional `Peso atual (kg)` field and an `Enviar questionário` action.
- Local code search for `questionario`, `questionário`, `pré-treino`, `bem-estar`, `recupera`, `dor`, `peso atual`, `wellness`, `recovery`, `pain`, and `survey` found no matching feature implementation in the current app code, outside of password recovery text and athlete profile/anamnese fields.

### Student QR Code Entry Point

- The authenticated route switch maps `#trainings` to `app.renderTrainings()` and `#attendance` to `studentAttendance.render(params.get('id'))` (`js/app.js:269`, `js/app.js:270`, `js/app.js:271`).
- The student bottom navigation includes `#trainings` and `#attendance`; the attendance nav item is labeled `Presença` (`js/app.js:921`, `js/app.js:922`, `js/app.js:923`, `js/app.js:924`, `js/app.js:925`, `js/app.js:926`).
- `studentTrainings.render()` builds the `MEUS TREINOS` page and includes the highlighted card `PRESENÇA NO TREINO` with helper text `Escanear QR Code para check-in` (`js/pages/student/trainings.js:12`, `js/pages/student/trainings.js:21`, `js/pages/student/trainings.js:23`, `js/pages/student/trainings.js:24`).
- The scan button has id `start-scan-btn`, contains the QR icon, and is wired to `this.showScanner()` after render (`js/pages/student/trainings.js:26`, `js/pages/student/trainings.js:27`, `js/pages/student/trainings.js:52`, `js/pages/student/trainings.js:53`).

### Scanner Runtime Behavior

- `showScanner()` renders a scanner bottom sheet containing `#reader`, scanner instructions, and a cancel button (`js/pages/student/trainings.js:252`, `js/pages/student/trainings.js:253`, `js/pages/student/trainings.js:255`, `js/pages/student/trainings.js:256`, `js/pages/student/trainings.js:257`).
- The scanner UI uses `ui.bottomSheet.show('Escanear QR Code', scannerHtml, () => {})` (`js/pages/student/trainings.js:261`).
- After a short timeout, the code instantiates `new Html5Qrcode("reader")`, configures `fps: 10` and a `250 x 250` QR box, starts the environment-facing camera, and passes successful decoded text to `this.handleScanSuccess(decodedText)` (`js/pages/student/trainings.js:263`, `js/pages/student/trainings.js:264`, `js/pages/student/trainings.js:265`, `js/pages/student/trainings.js:267`, `js/pages/student/trainings.js:268`, `js/pages/student/trainings.js:270`).
- If camera access fails, the catch handler shows `Erro ao acessar câmera: ...` through the shared toast (`js/pages/student/trainings.js:271`, `js/pages/student/trainings.js:272`).
- The cancel button calls `this.stopScanner()`, adds `closing` to the sheet overlay, and removes the overlay after 300ms (`js/pages/student/trainings.js:275`, `js/pages/student/trainings.js:276`, `js/pages/student/trainings.js:277`, `js/pages/student/trainings.js:278`, `js/pages/student/trainings.js:279`).

### Current QR Check-in Completion Path

- `handleScanSuccess(token)` is the current completion path for QR Code check-in (`js/pages/student/trainings.js:290`).
- The method logs the token, stops the scanner, removes `#sheet-overlay`, and shows `Validando seu check-in...` before validation (`js/pages/student/trainings.js:291`, `js/pages/student/trainings.js:292`, `js/pages/student/trainings.js:295`, `js/pages/student/trainings.js:296`, `js/pages/student/trainings.js:298`).
- It gets the current authenticated user from Supabase auth (`js/pages/student/trainings.js:301`).
- It checks for an active plan by querying `student_plans` where `student_id` is the current user and `status` is `active` (`js/pages/student/trainings.js:303`, `js/pages/student/trainings.js:304`, `js/pages/student/trainings.js:305`, `js/pages/student/trainings.js:307`, `js/pages/student/trainings.js:308`, `js/pages/student/trainings.js:309`).
- If no active plan is returned, it throws `Você precisa de um plano ativo para registrar presença.` (`js/pages/student/trainings.js:311`, `js/pages/student/trainings.js:312`).
- It calculates the current day start/end locally, then queries `training_sessions` by `qr_code_token`, with `scheduled_at` constrained to the same day (`js/pages/student/trainings.js:315`, `js/pages/student/trainings.js:316`, `js/pages/student/trainings.js:317`, `js/pages/student/trainings.js:318`, `js/pages/student/trainings.js:319`, `js/pages/student/trainings.js:321`, `js/pages/student/trainings.js:322`, `js/pages/student/trainings.js:324`, `js/pages/student/trainings.js:325`, `js/pages/student/trainings.js:326`, `js/pages/student/trainings.js:327`).
- If no same-day session is found, it throws `QR Code inválido ou treino não agendado para hoje.` (`js/pages/student/trainings.js:329`, `js/pages/student/trainings.js:330`).
- It inserts an `attendance` row with `session_id`, `student_id`, and `method: 'qrcode'` (`js/pages/student/trainings.js:333`, `js/pages/student/trainings.js:334`, `js/pages/student/trainings.js:335`, `js/pages/student/trainings.js:336`, `js/pages/student/trainings.js:337`, `js/pages/student/trainings.js:338`, `js/pages/student/trainings.js:339`, `js/pages/student/trainings.js:340`).
- Duplicate inserts with error code `23505` are surfaced as `Sua presença já está confirmada neste treino!`; other errors are thrown as-is (`js/pages/student/trainings.js:342`, `js/pages/student/trainings.js:343`, `js/pages/student/trainings.js:344`).
- On success, the toast says `Check-in realizado: ${session.title}! ⚽✅` and `loadAvailableTrainings()` refreshes the trainings page (`js/pages/student/trainings.js:347`, `js/pages/student/trainings.js:348`).

### Admin QR Code and Manual Attendance

- Admin training cards include a QR button whose `data-token` is the session `qr_code_token` (`js/pages/admin/trainings.js:135`, `js/pages/admin/trainings.js:136`).
- `setupEvents()` wires `.btn-qr` to `showQrCode(btn.dataset.token)` and `.btn-attendance` to `showAttendanceList(btn.dataset.id, btn.dataset.title)` (`js/pages/admin/trainings.js:188`, `js/pages/admin/trainings.js:189`, `js/pages/admin/trainings.js:190`, `js/pages/admin/trainings.js:193`, `js/pages/admin/trainings.js:194`).
- Admin session creation inserts into `training_sessions` and sets `qr_code_token: crypto.randomUUID()` and `created_by` from the current authenticated user (`js/pages/admin/trainings.js:324`, `js/pages/admin/trainings.js:325`, `js/pages/admin/trainings.js:326`, `js/pages/admin/trainings.js:327`, `js/pages/admin/trainings.js:328`, `js/pages/admin/trainings.js:329`).
- `showQrCode(token)` renders a bottom sheet titled `Check-in via QR` and generates a QR Code with `QRCode(...)` using the token as text (`js/pages/admin/trainings.js:338`, `js/pages/admin/trainings.js:339`, `js/pages/admin/trainings.js:340`, `js/pages/admin/trainings.js:341`, `js/pages/admin/trainings.js:342`).
- `showAttendanceList(sessionId, title)` fetches all students, current attendance rows for the session, and booked reservations for the same session (`js/pages/admin/trainings.js:208`, `js/pages/admin/trainings.js:224`, `js/pages/admin/trainings.js:225`, `js/pages/admin/trainings.js:227`, `js/pages/admin/trainings.js:228`, `js/pages/admin/trainings.js:230`, `js/pages/admin/trainings.js:231`, `js/pages/admin/trainings.js:232`, `js/pages/admin/trainings.js:233`, `js/pages/admin/trainings.js:234`).
- Clicking a present student deletes the `attendance` row for the session/student; clicking an absent student inserts `attendance` with `method: 'manual'` and `marked_by` set to the current admin id (`js/pages/admin/trainings.js:274`, `js/pages/admin/trainings.js:276`, `js/pages/admin/trainings.js:285`, `js/pages/admin/trainings.js:286`, `js/pages/admin/trainings.js:287`, `js/pages/admin/trainings.js:288`, `js/pages/admin/trainings.js:289`, `js/pages/admin/trainings.js:290`, `js/pages/admin/trainings.js:291`).

### Attendance Display

- `studentAttendance.render(targetStudentId = null)` renders the attendance page for the current user or, when allowed, another student passed by id (`js/pages/student/attendance.js:5`, `js/pages/student/attendance.js:6`, `js/pages/student/attendance.js:10`, `js/pages/student/attendance.js:11`).
- When another student is requested, the page verifies admin role or a `responsible_students` link before displaying data (`js/pages/student/attendance.js:13`, `js/pages/student/attendance.js:15`, `js/pages/student/attendance.js:16`, `js/pages/student/attendance.js:19`, `js/pages/student/attendance.js:20`, `js/pages/student/attendance.js:21`, `js/pages/student/attendance.js:23`, `js/pages/student/attendance.js:24`, `js/pages/student/attendance.js:27`, `js/pages/student/attendance.js:28`).
- `loadAttendance(studentId)` queries `attendance` joined to `training_sessions` for `title` and `scheduled_at`, filtered by `student_id`, ordered by `checked_in_at` descending (`js/pages/student/attendance.js:95`, `js/pages/student/attendance.js:98`, `js/pages/student/attendance.js:99`, `js/pages/student/attendance.js:100`, `js/pages/student/attendance.js:103`, `js/pages/student/attendance.js:108`, `js/pages/student/attendance.js:109`).
- The attendance list displays each row's session title, localized check-in date/time, and whether the method was `QR Code` or `Manual` (`js/pages/student/attendance.js:136`, `js/pages/student/attendance.js:137`, `js/pages/student/attendance.js:138`, `js/pages/student/attendance.js:139`, `js/pages/student/attendance.js:144`, `js/pages/student/attendance.js:145`).
- Calendar visuals mark days with attendance using `.has-attendance` (`js/pages/student/attendance.js:155`, `js/pages/student/attendance.js:159`, `js/pages/student/attendance.js:163`, `js/pages/student/attendance.js:165`, `js/pages/student/attendance.js:168`).

### Data Model Evidence

- The local migration `002_rls_security.sql` enables RLS on `attendance` and `training_sessions` (`migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:18`, `migrations/002_rls_security.sql:20`).
- The `attendance_select` policy lets students see their own attendance, responsible users see linked students, and admins see all attendance (`migrations/002_rls_security.sql:56`, `migrations/002_rls_security.sql:57`, `migrations/002_rls_security.sql:59`, `migrations/002_rls_security.sql:60`, `migrations/002_rls_security.sql:61`, `migrations/002_rls_security.sql:62`, `migrations/002_rls_security.sql:64`, `migrations/002_rls_security.sql:65`).
- The `attendance_insert` policy allows insert when `student_id = auth.uid()` or when the current user is admin (`migrations/002_rls_security.sql:69`, `migrations/002_rls_security.sql:70`, `migrations/002_rls_security.sql:72`, `migrations/002_rls_security.sql:73`, `migrations/002_rls_security.sql:74`).
- The `attendance_delete` policy allows delete for admins (`migrations/002_rls_security.sql:78`, `migrations/002_rls_security.sql:79`, `migrations/002_rls_security.sql:81`, `migrations/002_rls_security.sql:82`).
- The `training_sessions_select` policy allows authenticated reads, and `training_sessions_write` restricts writes to admins (`migrations/002_rls_security.sql:142`, `migrations/002_rls_security.sql:147`, `migrations/002_rls_security.sql:148`, `migrations/002_rls_security.sql:149`, `migrations/002_rls_security.sql:151`, `migrations/002_rls_security.sql:152`, `migrations/002_rls_security.sql:154`, `migrations/002_rls_security.sql:155`).
- The project spec describes `training_sessions` with `qr_code_token` and `attendance` with `session_id`, `student_id`, `checked_in_at`, `method`, and `marked_by` (`spec (1).md:132`, `spec (1).md:141`, `spec (1).md:145`, `spec (1).md:149`, `spec (1).md:150`, `spec (1).md:151`, `spec (1).md:152`, `spec (1).md:153`).
- The local migrations do not contain `CREATE TABLE` statements for `attendance` or `training_sessions`; they operate on existing tables through RLS. The only local `CREATE TABLE` found in migrations for the training area is `training_reservations` (`migrations/003_training_reservations.sql:4`).
- `training_reservations` is separate from attendance and stores booked/cancelled reservation state by `session_id` and `student_id` (`migrations/003_training_reservations.sql:4`, `migrations/003_training_reservations.sql:6`, `migrations/003_training_reservations.sql:7`, `migrations/003_training_reservations.sql:8`).

### Shared UI and Form Infrastructure

- Shared buttons, cards, input groups, input controls, and badges live in `css/components.css` (`css/components.css:3`, `css/components.css:18`, `css/components.css:28`, `css/components.css:39`, `css/components.css:52`, `css/components.css:66`).
- The page container gets bottom padding for the fixed navigation through `css/pages.css` (`css/pages.css:14`, `css/pages.css:15`).
- `ui.bottomSheet.show(title, contentHtml, onSave)` creates `#sheet-overlay`, `.sheet-content`, `.sheet-header`, `.sheet-body`, close behavior, and optional form submission handling (`js/ui.js:17`, `js/ui.js:18`, `js/ui.js:19`, `js/ui.js:20`, `js/ui.js:21`, `js/ui.js:22`, `js/ui.js:23`, `js/ui.js:24`, `js/ui.js:29`, `js/ui.js:35`, `js/ui.js:38`, `js/ui.js:43`, `js/ui.js:44`, `js/ui.js:49`).
- If the injected content contains a `<form>`, `ui.bottomSheet.show()` prevents default submit, converts `FormData` with `Object.fromEntries(formData.entries())`, disables the submit button, calls `onSave(data)`, and closes on success (`js/ui.js:49`, `js/ui.js:51`, `js/ui.js:52`, `js/ui.js:53`, `js/ui.js:54`, `js/ui.js:56`, `js/ui.js:58`, `js/ui.js:61`, `js/ui.js:62`, `js/ui.js:63`).
- Bottom sheet styling is injected by `js/ui.js`, with fixed overlay, bottom alignment, max-height `90vh`, and scrollable `.sheet-body` (`js/ui.js:116`, `js/ui.js:119`, `js/ui.js:120`, `js/ui.js:124`, `js/ui.js:125`, `js/ui.js:133`, `js/ui.js:139`, `js/ui.js:140`, `js/ui.js:171`, `js/ui.js:173`).
- The app already uses bottom-sheet forms for admin training creation and profile/anamnese editing (`js/pages/admin/trainings.js:305`, `js/pages/admin/trainings.js:307`, `js/pages/admin/trainings.js:324`, `js/app.js:739`, `js/app.js:740`, `js/app.js:768`).

### Existing Athlete Profile Form Is Not Per-Check-in

- The profile page renders `FICHA DO ATLETA` only for `currentRole === 'student'` and shows stored fields such as birth date, current club, weight, height, and athlete record URL (`js/app.js:648`, `js/app.js:651`, `js/app.js:654`, `js/app.js:656`, `js/app.js:660`, `js/app.js:664`, `js/app.js:668`).
- `showEditAnamneseForm()` opens a bottom-sheet form for those profile fields (`js/app.js:739`, `js/app.js:741`, `js/app.js:743`, `js/app.js:747`, `js/app.js:752`, `js/app.js:756`, `js/app.js:761`, `js/app.js:764`, `js/app.js:768`).
- Its save callback updates the `users` row for the current profile with `birth_date`, `current_club`, `weight_kg`, `height_cm`, `athlete_record_url`, and `updated_at` (`js/app.js:769`, `js/app.js:770`, `js/app.js:771`, `js/app.js:772`, `js/app.js:773`, `js/app.js:774`, `js/app.js:775`, `js/app.js:778`).
- The anamnese migration only adds those columns to `public.users` (`migrations/001_add_athlete_anamnese_fields.sql:1`).

### Tests Related to Check-in

- TestSprite generated tests reference same-day QR check-in and attendance history, but they do not reflect the current `#trainings` scanner implementation consistently.
- `TC014_Record_a_same_day_attendance_check_in.py` logs in, clicks the bottom-nav attendance item, then tries to click icons on the attendance page before asserting `Presença registrada` and `Histórico mensal` (`testsprite_tests/TC014_Record_a_same_day_attendance_check_in.py:52`, `testsprite_tests/TC014_Record_a_same_day_attendance_check_in.py:55`, `testsprite_tests/TC014_Record_a_same_day_attendance_check_in.py:61`, `testsprite_tests/TC014_Record_a_same_day_attendance_check_in.py:67`, `testsprite_tests/TC014_Record_a_same_day_attendance_check_in.py:73`, `testsprite_tests/TC014_Record_a_same_day_attendance_check_in.py:78`, `testsprite_tests/TC014_Record_a_same_day_attendance_check_in.py:79`).
- `TC022_Check_in_to_todays_session_with_a_valid_QR_code.py` navigates directly to `/#attendance` and asserts English placeholder texts `Check-in successful` and `Monthly attendance updated` (`testsprite_tests/TC022_Check_in_to_todays_session_with_a_valid_QR_code.py:52`, `testsprite_tests/TC022_Check_in_to_todays_session_with_a_valid_QR_code.py:53`, `testsprite_tests/TC022_Check_in_to_todays_session_with_a_valid_QR_code.py:57`, `testsprite_tests/TC022_Check_in_to_todays_session_with_a_valid_QR_code.py:58`).
- `TC023_Show_attendance_after_a_valid_check_in.py` clicks a dashboard training/details link, then clicks the scan button in the trainings page, and asserts `Check-in efetuado com sucesso` and the test email (`testsprite_tests/TC023_Show_attendance_after_a_valid_check_in.py:52`, `testsprite_tests/TC023_Show_attendance_after_a_valid_check_in.py:55`, `testsprite_tests/TC023_Show_attendance_after_a_valid_check_in.py:58`, `testsprite_tests/TC023_Show_attendance_after_a_valid_check_in.py:61`, `testsprite_tests/TC023_Show_attendance_after_a_valid_check_in.py:66`, `testsprite_tests/TC023_Show_attendance_after_a_valid_check_in.py:67`).

## Code References

- `js/pages/student/trainings.js:21` - Student page renders the QR check-in card.
- `js/pages/student/trainings.js:252` - Scanner bottom sheet starts here.
- `js/pages/student/trainings.js:290` - `handleScanSuccess(token)` begins the QR check-in completion path.
- `js/pages/student/trainings.js:303` - Active-plan validation begins.
- `js/pages/student/trainings.js:315` - Same-day training-session validation begins.
- `js/pages/student/trainings.js:333` - Attendance insert begins.
- `js/pages/admin/trainings.js:324` - Admin creates training sessions with `qr_code_token`.
- `js/pages/admin/trainings.js:338` - Admin renders the QR Code sheet.
- `js/pages/admin/trainings.js:285` - Admin manual attendance insert begins.
- `js/pages/student/attendance.js:95` - Attendance history query begins.
- `js/ui.js:19` - Shared bottom sheet API.
- `js/ui.js:49` - Generic form submission handling in bottom sheets.
- `migrations/002_rls_security.sql:69` - RLS insert policy for `attendance`.
- `spec (1).md:145` - Project-level attendance table description.

## Architecture Documentation

The training/check-in flow is a static SPA flow with direct Supabase client reads/writes from browser modules. There is no app-owned backend route for check-in. The QR token is generated when an admin creates a `training_sessions` row, displayed as a QR Code in the admin screen, scanned by the athlete from the student trainings screen, and validated client-side through Supabase queries before writing `attendance`.

Runtime path:

`#trainings` route -> `studentTrainings.render()` -> `start-scan-btn` click -> `showScanner()` -> `Html5Qrcode.start()` -> `handleScanSuccess(token)` -> `student_plans` active check -> `training_sessions` same-day token check -> `attendance.insert({ session_id, student_id, method: 'qrcode' })` -> success toast -> `loadAvailableTrainings()`.

Admin path:

`#trainings` route for admin -> `adminTrainings.render()` -> `loadTrainings()` -> session cards -> QR button -> `showQrCode(token)` for athlete scanning; manual attendance button -> `showAttendanceList()` -> `attendance.insert()` or `attendance.delete()`.

Data boundaries:

- `training_sessions`: session schedule and QR token source.
- `student_plans`: active-plan gate for QR check-in and reservation eligibility.
- `attendance`: final confirmed presence record.
- `training_reservations`: booking state, separate from attendance.
- `users`: profile/anamnese fields, including current stored weight, but not per-session questionnaire responses.

UI boundaries:

- Shared visual primitives live in `css/components.css`.
- Page spacing and transitions live in `css/pages.css`.
- Bottom sheets and generic form handling live in `js/ui.js`.
- The current QR scanner also uses a bottom sheet; the screenshot reference flow is visually closer to a full-screen multi-step page with at least one bottom sheet for pain intensity.

## Historical Context

- `PRD.md` states that QR Code check-in remains the authoritative attendance confirmation flow and that attendance records must be stored in `attendance` (`PRD.md:29`, `PRD.md:133`, `PRD.md:144`).
- `PRD.md` lists athlete attendance history, admin manual attendance, and responsible/business read-only visibility as existing product requirements (`PRD.md:75`, `PRD.md:92`, `PRD.md:145`, `PRD.md:147`).
- `spec (1).md` describes the current QR flow as admin creates a session/token, admin displays the QR Code, athlete scans it, the app validates the token, and then writes `attendance` with `method = 'qrcode'` (`spec (1).md:345`, `spec (1).md:346`, `spec (1).md:347`, `spec (1).md:348`, `spec (1).md:349`, `spec (1).md:350`).
- Existing research `docs/research/2026-05-09-project-inventory.md` also identified `studentTrainings.handleScanSuccess(token)` as the method that validates active plan, same-day QR token, and inserts attendance.
- Existing research `docs/research/2026-05-04-reservas-calendario.md` documented that reservations and attendance are separate concepts: reservations use `training_reservations`, while frequency/check-in uses `attendance`.

## Related Research

- `docs/research/2026-05-09-project-inventory.md`
- `docs/research/2026-05-04-reservas-calendario.md`
- `docs/research/2026-05-03-spec-alteracoes-analysis.md`

## Open Questions

- The live codebase does not define where a pre-training questionnaire response should be stored.
- The live codebase does not define whether questionnaire completion should be required only for QR Code check-in or also for admin manual attendance.
- The live codebase does not define whether one response is required per `training_sessions` row, per calendar day, or per attempted QR scan.
- The visual references show a body diagram asset, but no matching front/rear body diagram asset exists in the current project asset list.
