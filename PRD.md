# Diamond X Product Requirements Document

**Product:** Diamond X Performance & Training Center PWA  
**Repository:** Diamond  
**Date:** 2026-05-04  
**Status:** Draft  
**Primary platform:** Mobile-first web app / PWA  

## 1. Product Summary

Diamond X is a role-based training management PWA for a performance and training center. The product supports athletes, responsible users or business managers, and administrators in one Supabase-backed single-page app.

The app lets athletes manage their training plan, view and reserve training sessions, check in via QR Code, track attendance, and maintain their athlete profile. Responsible users and business managers monitor linked athletes, manage plan purchases, view payments, and see attendance/training visibility for those athletes. Administrators manage users, plans, training sessions, attendance, reports, and financial records.

## 2. Problem Statement

Diamond X needs a compact operational app that connects three workflows that are currently handled together in training centers:

- Athletes need a direct way to access plans, training schedules, check-in, and attendance history.
- Responsible users and business managers need visibility into linked athletes without needing full admin access.
- Administrators need a reliable back-office interface for users, sessions, attendance, plans, and payments.

The product must keep these workflows separated by role while sharing the same source of truth for users, plans, sessions, reservations, attendance, and billing status.

## 3. Goals

- Provide a mobile-first PWA experience for the Diamond X athlete journey.
- Allow athletes with active plans to reserve future training sessions when allowed by business rules.
- Preserve QR Code check-in as the authoritative attendance confirmation flow.
- Give responsible users and business managers read-only visibility into linked athletes' attendance and reservations.
- Give admins operational control over users, training sessions, plans, payments, and reports.
- Enforce role-based access with Supabase RLS, not only client-side routing.
- Maintain Diamond X brand identity through local fonts, logo usage, dark UI, and teal accent system.

## 4. Non-Goals

- Native iOS or Android apps.
- Public marketing website or landing page.
- Inventory, payroll, coach scheduling, or facility management.
- Multi-location tenancy.
- Automatic bank reconciliation beyond the current Asaas checkout/payment record direction.
- Session capacity management until `training_sessions` has an explicit capacity model.
- Responsible users or business managers reserving/canceling training on behalf of athletes.

## 5. Personas

### Athlete

An athlete who logs in from a mobile device to see plan status, upcoming training sessions, reserve eligible sessions, check in via QR Code at the training center, and review attendance history.

### Responsible User

A parent or guardian who links one or more athletes, reviews their plan status, attendance, training reservations, and payments, and purchases plans when needed.

### Business Manager

A sponsor, club manager, or external manager who monitors one or more athletes with the same visibility model as a responsible user.

### Administrator

A Diamond X operator who manages users, training sessions, manual attendance, plans, financial records, and reporting.

## 6. Current Product Surface

### Public Access

- Login.
- Registration with full name, email, CPF, phone, role, and password.
- Forgot password and password update flow.

### Athlete App

- Dashboard with active plan status, monthly attendance count, next training session, and responsible-user information when linked.
- Training screen with monthly calendar, upcoming sessions, reservation state, reservation/cancel actions, and QR Code check-in scanner.
- Attendance screen with attendance totals, monthly view, visual calendar/chart, and history.
- Plans and services screen with training and physiotherapy categories.
- Profile screen with personal data, athlete details, avatar upload, account type area, and Diamond X site card.

### Responsible / Business Manager App

- Dashboard listing linked athletes and plan status.
- Linked athletes screen with actions for attendance and trainings.
- Read-only training calendar for linked athletes' reservations.
- Plans purchase flow for linked athletes.
- Payments/charges view for linked athletes.
- Profile screen.

### Admin Panel

- Dashboard with student count, active plan count, estimated revenue chart, today's training sessions, and recent charges.
- Users management with filtering, creation/editing, and role visibility.
- Training management with monthly calendar, session creation, QR Code display, reservation counts, attendance bottom sheet, and delete action.
- Plans management for active plans by category and tier.
- Financial management with charges, search, status filters, manual payment confirmation, cancellation, and manual charge creation.
- Reports for attendance and training performance.
- Profile/configuration screen.

## 7. Functional Requirements

### 7.1 Authentication and Session Management

- Users can register with full name, email, CPF, phone, role, and password.
- Users can log in with email and password.
- Users can request a password reset link.
- Users can set a new password from a recovery link or recovery session.
- Auth state changes must update the current user, profile, and visible route.
- Unauthenticated users must be redirected to login for protected routes.
- Authenticated users must be redirected away from login/register to dashboard.

### 7.2 Role-Based Navigation and Authorization

- The app must render different dashboards and bottom navigation items by role.
- Admin-only routes must be inaccessible to non-admin users.
- Responsible-user routes must be limited to responsible, business manager, or admin users.
- Client routing is a UX guard only; Supabase RLS remains the source of truth for data access.

### 7.3 Athlete Dashboard

- Show current plan name, status, and validity date when available.
- Show monthly attendance count.
- Link directly to attendance details.
- Show next upcoming training session with date, time, title, location, and shortcut to trainings.
- Show linked responsible user information when available.

### 7.4 Training Sessions and Reservations

- Admins can create, view, and delete training sessions.
- Training sessions must include title, scheduled date/time, location, QR Code token, and creator.
- Athletes can view monthly training sessions.
- Athletes with an active plan can reserve a session only when the session is at least 24 hours away.
- Athletes cannot reserve the same session more than once while a booked reservation exists.
- Athletes can cancel their own active reservation.
- Reservations must not replace attendance; QR Code check-in remains the attendance record.
- Admins can view reservation counts by training session.
- Admins can view reserved athletes inside the attendance bottom sheet.
- Responsible users and business managers can view reservations for linked athletes only.
- If reservations fail to load, the app should keep session calendars visible and show a diagnostic reservation message.

### 7.5 QR Code Check-In and Attendance

- Admin-created sessions include QR Code tokens.
- Athletes can scan a QR Code to check in for a valid same-day session.
- Athletes must have an active plan to check in.
- Attendance records must be stored in `attendance`.
- Admins can manually mark or remove attendance for a session.
- Attendance views must distinguish presence from reservation.
- Responsible users and business managers can view attendance for linked athletes.

### 7.6 Plans and Services

- Athletes can browse active plans.
- Plans are grouped by category, including training and physiotherapy.
- Plans support tier labels such as Pre Diamond and Diamond X.
- Athletes can initiate plan purchase.
- Responsible users/business managers can purchase plans for linked athletes.
- Admins can create, edit, activate, deactivate, and review plans.

### 7.7 Payments and Charges

- Plan purchases create `student_plans` records with payment status.
- The app supports statuses including active, pending payment, expired, and cancelled.
- Admins can search and filter charges.
- Admins can manually confirm payment or cancel a charge.
- The Supabase Edge Function `asaas-checkout` can create or reuse Asaas customers and create payments.
- Payment records should stay linked to the student and purchased plan.

### 7.8 Responsible / Business Manager Linking

- Responsible users and business managers can link students through `responsible_students`.
- Linked athlete dashboards must show plan status.
- Linked athlete attendance and reservation data must be read-only.
- The app must show an empty state when no athletes are linked.

### 7.9 Profile and Athlete Data

- Users can view personal data: name, email, CPF, and phone.
- Users can upload/update avatar images when storage permissions allow it.
- Athletes can view and edit athlete profile details added by the anamnese migration.
- Role changes from the client must not allow privilege escalation.

### 7.10 Admin Reports

- Admins can review attendance/reporting views.
- Reports should support operational decisions such as attendance ranking, total attendance, and training participation.
- Report data must respect admin-only access.

## 8. Data Requirements

### Core Tables

- `users`: app profile data, role, CPF, phone, avatar, and Asaas customer ID.
- `plans`: commercial plans and services.
- `student_plans`: student purchases/subscriptions and payment status.
- `training_sessions`: scheduled training sessions and QR Code tokens.
- `training_reservations`: athlete reservations for future sessions.
- `attendance`: confirmed presence/check-in records.
- `responsible_students`: relationship between responsible/business users and athletes.
- `avatars`: storage bucket or metadata area used by avatar upload flow.

### Important Constraints

- `training_reservations` allows only one active booked reservation per student/session.
- Reservation status is limited to `booked` or `cancelled`.
- Reservation cancellation is an update, not a delete.
- RLS must prevent users from changing their own role into a privileged role.
- Responsible users/business managers can only read linked athlete records.
- Admins can access operational records required for management.

## 9. UX Requirements

- The UI is mobile-first and PWA-compatible.
- The login screen uses Diamond X branding, local logo, Abnes title, Montserrat body text, and animated/interactive background.
- Primary Diamond X CTAs should use the `btn-diamond` visual style where brand emphasis is required.
- Page headers should use the Diamond X logo without distortion.
- Calendars should clearly distinguish training days, reservation days, attendance days, disabled days, and today.
- Error states should preserve usable context when possible, especially for training calendars.
- Destructive actions such as deleting sessions or cancelling charges require confirmation or explicit action.

## 10. Security and Compliance Requirements

- Supabase RLS must be enabled on sensitive tables.
- Users must not be able to self-promote roles through the client SDK.
- Admin data must not be exposed through client-side route mistakes alone.
- CPF, phone, and profile data must be escaped before rendering.
- User-provided URLs and external links must be sanitized or constrained.
- Payment provider secrets must live in Supabase Edge Function environment variables, not browser code.
- Service-role Supabase keys must never be used in browser code.

## 11. Technical Requirements

- The app remains a vanilla JavaScript ES module SPA.
- The app is served from `index.html` with hash routing.
- Supabase JS v2 is the browser data/auth client.
- Phosphor Icons, QRCode.js, and html5-qrcode are loaded from CDN.
- CSS is organized through `reset.css`, `variables.css`, `components.css`, and `pages.css`.
- Local fonts are used for brand consistency.
- The PWA manifest and service worker remain available.
- JavaScript modules must pass syntax checks with `node --check`.

## 12. Success Metrics

- Athletes can log in, see active plan status, reserve an eligible session, and check in by QR Code.
- Admins can create a session, see it in the calendar, view reservations, and mark attendance.
- Responsible users/business managers can see linked athletes and read their attendance/reservation state.
- Reservation table availability issues do not blank the full training calendar.
- No non-admin user can access admin-only data through direct navigation or Supabase queries.
- Payment status changes are visible in athlete/responsible/admin views.

## 13. Release Criteria

- `training_reservations` migration is applied to the target Supabase project and available through PostgREST.
- Manual smoke tests pass for athlete, responsible/business manager, and admin accounts.
- QR Code check-in continues writing to `attendance`.
- Reservation creation and cancellation work for eligible athlete accounts.
- Responsible/business manager read-only views only show linked athletes.
- Admin financial status actions update `student_plans` correctly.
- No JavaScript syntax errors across `js/**/*.js`.
- PWA entrypoint loads without blocking runtime errors.

## 14. Known Risks and Open Questions

- The remote Supabase project must have `training_reservations` applied and schema cache reloaded; otherwise reservation reads can fail.
- Plan expiration is derived from `created_at + duration_days` in some UI flows; a dedicated validity field may be needed for more precise subscription handling.
- Manual charge creation currently depends on the existing `student_plans` structure and may need a first-class custom charge/service model.
- Session capacity is not modeled, so reservations do not enforce maximum slots.
- Asaas webhook reconciliation is not represented in the current codebase and should be specified before relying on automatic payment activation.
- CDN dependencies can affect offline/PWA behavior; local bundling may be needed for a stricter installable app.

## 15. Future Enhancements

- Session capacity and waitlist.
- Coach assignment and coach-facing views.
- Asaas webhook handler for payment status synchronization.
- Push notifications for upcoming trainings, payment status, and reservation reminders.
- Exportable attendance and financial reports.
- Admin audit log for manual payment and attendance changes.
- Better offline behavior for installed PWA sessions.
