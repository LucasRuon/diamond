---
date: 2026-05-05T11:29:29-03:00
researcher: Codex
git_commit: 3af9906071e0973e85b9dec1d1073c962ec87812
branch: work
repository: Diamond
topic: "$research-codebase change user role is not work. I change rola user from Student to Admin and it nor save or changed"
tags: [research, codebase]
status: complete
last_updated: 2026-05-05
last_updated_by: Codex
---

# Research: $research-codebase change user role is not work. I change rola user from Student to Admin and it nor save or changed

**Date**: 2026-05-05T11:29:29-03:00
**Researcher**: Codex
**Git Commit**: 3af9906071e0973e85b9dec1d1073c962ec87812
**Branch**: work
**Repository**: Diamond

## Research Question

$research-codebase change user role is not work. I change rola user from Student to Admin and it nor save or changed

## Scope

This research covers the current admin user-management role edit flow, the shared bottom-sheet submit behavior, profile/role loading, registration role handling, and local Supabase RLS migrations related to `public.users.role`. It does not include a live browser run, a direct remote Supabase policy inspection, or changing application code.

## Summary

The admin user screen currently renders a role selector with `student`, `responsible`, `businessman`, and `admin`, and on submit it sends a direct browser Supabase update to `public.users` with `role: data.role` (`js/pages/admin/users.js:124`, `js/pages/admin/users.js:153`). The local RLS migration for `public.users` defines only `users_update_own`: the authenticated user can update only their own row, and the row's `role` must remain equal to the authenticated user's current role (`migrations/002_rls_security.sql:38`, `migrations/002_rls_security.sql:40`, `migrations/002_rls_security.sql:45`). If that policy is applied in the remote Supabase project, an admin editing another user's role from Student to Admin has no matching `users` update policy in the local migration.

The application's active role source is `public.users.role` when that row is available; Auth `user_metadata.role` is only a fallback in `loadProfile()` (`js/app.js:185`, `js/app.js:187`, `js/app.js:188`). The admin edit form updates `public.users` only and does not call `supabase.auth.updateUser()` for the edited user.

## Detailed Findings

### Admin User Management UI

- `js/app.js` imports `adminUsers` and routes `#users` to `adminUsers.render()` (`js/app.js:4`, `js/app.js:275`).
- `#users` is guarded as an admin route by checking `this.profile?.role`; non-admin roles are redirected to `#dashboard` (`js/app.js:244`, `js/app.js:246`, `js/app.js:249`).
- `adminUsers.render()` builds the user-management screen, including role filters for all users, admins, responsible users, and students (`js/pages/admin/users.js:20`, `js/pages/admin/users.js:21`, `js/pages/admin/users.js:22`, `js/pages/admin/users.js:24`).
- `loadUsers()` reads from `public.users`, optionally filters by `role`, and orders by `full_name` (`js/pages/admin/users.js:41`, `js/pages/admin/users.js:44`, `js/pages/admin/users.js:46`, `js/pages/admin/users.js:50`).
- Each rendered user card stores `data-id` and displays the current `user.role` as a badge (`js/pages/admin/users.js:62`, `js/pages/admin/users.js:63`, `js/pages/admin/users.js:74`).

### Edit Role Form

- Clicking a user card looks up the selected row from the already loaded `users` array and opens `showEditUserForm(user)` (`js/pages/admin/users.js:103`, `js/pages/admin/users.js:106`, `js/pages/admin/users.js:107`, `js/pages/admin/users.js:108`).
- The edit form contains a `select name="role"` with options `student`, `responsible`, `businessman`, and `admin`; the current row's role controls the selected option (`js/pages/admin/users.js:124`, `js/pages/admin/users.js:126`, `js/pages/admin/users.js:127`, `js/pages/admin/users.js:130`).
- On submit, the form writes `full_name`, `role`, `cpf`, `phone`, and `updated_at` to `public.users` and filters by the edited user's `id` (`js/pages/admin/users.js:148`, `js/pages/admin/users.js:153`, `js/pages/admin/users.js:155`, `js/pages/admin/users.js:157`, `js/pages/admin/users.js:162`).
- On Supabase error, the form shows `Erro ao atualizar: <message>` and throws the error; on success, it shows `Usuário atualizado com sucesso!` and reloads the user list (`js/pages/admin/users.js:164`, `js/pages/admin/users.js:165`, `js/pages/admin/users.js:166`, `js/pages/admin/users.js:169`, `js/pages/admin/users.js:170`).

### Bottom Sheet Submit Behavior

- `ui.bottomSheet.show()` wraps the form submit, converts `FormData` into a plain object, disables the submit button, and changes the label to `SALVANDO...` (`js/ui.js:49`, `js/ui.js:53`, `js/ui.js:54`, `js/ui.js:56`, `js/ui.js:59`).
- If the supplied `onSave(data)` resolves, the sheet closes (`js/ui.js:61`, `js/ui.js:62`, `js/ui.js:63`).
- If `onSave(data)` throws, the submit button is re-enabled and the original button text is restored (`js/ui.js:64`, `js/ui.js:65`, `js/ui.js:66`).

### Role Source And Navigation

- `loadProfile()` first selects the current authenticated user's row from `public.users`; if data is returned, that row becomes `this.profile` (`js/app.js:185`, `js/app.js:187`, `js/app.js:188`).
- Auth metadata is used only as fallback when the `public.users` row is missing or the select throws (`js/app.js:188`, `js/app.js:189`, `js/app.js:193`, `js/app.js:194`).
- Dashboard routing, training pages, plans, payments, and bottom navigation branch from `this.profile?.role` (`js/app.js:580`, `js/app.js:582`, `js/app.js:591`, `js/app.js:597`, `js/app.js:603`, `js/app.js:902`).
- Admin navigation includes `#users`; responsible/businessman and student navigation do not include that route (`js/app.js:907`, `js/app.js:909`, `js/app.js:914`, `js/app.js:921`).
- The profile page displays the account type from `this.profile?.role` and includes text saying only an administrator can change the account type (`js/app.js:613`, `js/app.js:615`, `js/app.js:694`, `js/app.js:698`, `js/app.js:701`).

### Registration Role Handling

- Public registration offers only `student`, `responsible`, and `businessman`; it does not offer `admin` (`js/app.js:515`, `js/app.js:527`).
- Registration sends the selected role as Supabase Auth metadata through `auth.register()` (`js/app.js:553`, `js/app.js:555`, `js/app.js:557`, `js/app.js:564`).
- The Auth wrapper calls `supabase.auth.signUp()` with `options.data = metadata` and does not directly insert a row into `public.users` (`js/auth.js:14`, `js/auth.js:15`, `js/auth.js:18`, `js/auth.js:19`, `js/auth.js:25`).
- The profile trigger migration whitelists only `student`, `responsible`, and `businessman`; any other requested role falls back to `student` (`migrations/004_auth_users_profile_trigger.sql:14`, `migrations/004_auth_users_profile_trigger.sql:16`, `migrations/004_auth_users_profile_trigger.sql:17`, `migrations/004_auth_users_profile_trigger.sql:19`).

### Supabase RLS Context

- `js/supabase.js` creates a browser Supabase client with the project URL and anon key (`js/supabase.js:1`, `js/supabase.js:2`, `js/supabase.js:3`, `js/supabase.js:11`).
- `migrations/002_rls_security.sql` enables RLS on `public.users` and other core tables (`migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:16`).
- The migration drops old `users` policies, then creates `users_select` for authenticated reads and `users_update_own` for updates (`migrations/002_rls_security.sql:23`, `migrations/002_rls_security.sql:24`, `migrations/002_rls_security.sql:25`, `migrations/002_rls_security.sql:30`, `migrations/002_rls_security.sql:40`).
- `users_update_own` has `USING (auth.uid() = id)`, so the policy applies only to the authenticated user's own row (`migrations/002_rls_security.sql:40`, `migrations/002_rls_security.sql:42`).
- `users_update_own` has `WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()))`, so the updated row must still belong to the authenticated user and keep the same role value (`migrations/002_rls_security.sql:43`, `migrations/002_rls_security.sql:44`, `migrations/002_rls_security.sql:45`).
- The same migration uses admin-role checks for other tables such as attendance, plans, training sessions, and responsible-student links, but no corresponding admin update policy for `public.users` appears in the local migration (`migrations/002_rls_security.sql:65`, `migrations/002_rls_security.sql:100`, `migrations/002_rls_security.sql:137`, `migrations/002_rls_security.sql:155`, `migrations/002_rls_security.sql:171`).

## Code References

- `js/pages/admin/users.js:124` - Admin edit form includes the role selector.
- `js/pages/admin/users.js:153` - Admin edit form submits a direct `public.users` update.
- `js/pages/admin/users.js:157` - The submitted update includes `role: data.role`.
- `js/pages/admin/users.js:162` - The update targets the selected user's id, not necessarily the authenticated admin's id.
- `js/ui.js:61` - Bottom sheet closes only after the save handler resolves.
- `js/ui.js:64` - Bottom sheet stays open and restores the button when the save handler throws.
- `js/app.js:187` - Runtime profile source is `public.users`.
- `js/app.js:189` - Auth metadata role is a fallback when no profile row is available.
- `js/app.js:249` - Client route guard restricts `#users` to `profile.role === 'admin'`.
- `js/app.js:582` - Dashboard selection depends on `profile.role`.
- `migrations/002_rls_security.sql:40` - Local RLS policy creates only self-update behavior for `public.users`.
- `migrations/002_rls_security.sql:45` - Local RLS policy requires the role to remain unchanged.
- `migrations/004_auth_users_profile_trigger.sql:17` - Registration profile trigger allows only non-admin public roles.

## Architecture Documentation

Diamond is a static vanilla JavaScript SPA using direct browser Supabase calls. `index.html` provides the shell, `js/app.js` owns auth state, hash routing, role-based dispatch, and profile rendering, `js/auth.js` wraps Supabase Auth, and `js/supabase.js` exports the browser Supabase client.

Role state is centered on `public.users.role`. Registration first stores requested role metadata in Supabase Auth; the local trigger migration translates that metadata into a `public.users` row while filtering out public `admin` creation. Runtime screens then use `loadProfile()` to read `public.users` and use Auth metadata only if that row is unavailable.

The admin users page has no backend API or Edge Function between the UI and `public.users`. The role change action is a direct `update()` call from the browser Supabase client, so its behavior depends on the RLS policies applied to `public.users` in Supabase.

## Historical Context

The PRD states that client-side role changes must not allow privilege escalation, that RLS must prevent users from changing their own role into a privileged role, and that service-role Supabase keys must not be used in browser code (`PRD.md:179`, `PRD.md:205`, `PRD.md:227`).

The 2026-05-03 implementation spec explicitly excludes changes that allow self-elevation of `users.role` and says not to relax the `users.role` RLS; if account type switching remains in the frontend, Supabase denial should be shown clearly (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:32`, `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:138`).

Prior research on registration documented the same role source path: `loadProfile()` reads `public.users` first, and `users_update_own` blocks role mutation through the client when the local RLS migration is applied (`docs/research/2026-05-04-tc001-register-role-based-area.md:80`, `docs/research/2026-05-04-tc001-register-role-based-area.md:90`).

## Related Research

- `docs/research/2026-05-04-tc001-register-role-based-area.md` - Registration, role loading, role-based routing, and `users_update_own` context.
- `docs/research/2026-05-04-TC026-update-profile-information.md` - Profile update flow and self-update RLS context.
- `docs/research/2026-05-03-spec-alteracoes-analysis.md` - Earlier role/profile and RLS analysis.

## Open Questions

- Whether `migrations/002_rls_security.sql` is currently applied unchanged in the remote Supabase project configured by `js/supabase.js`.
- The exact Supabase error shown in the browser when the admin edit form attempts to change another user's role.
- Whether the intended admin role-change path should update only `public.users.role` or also Supabase Auth user metadata for the edited user.
