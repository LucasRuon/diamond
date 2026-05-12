---
date: 2026-05-05T00:51:00-03:00
researcher: Codex
git_commit: 4ff85fb6df19899bed3ddc8d87c61e0e52b925f8
branch: main
repository: Diamond
topic: "$research-codebase Button exit the account (sair da conta) of the profile page, is being cut when the scroll is scrolled down completely. The lower manu bar cuts the button."
tags: [research, codebase]
status: complete
last_updated: 2026-05-06
last_updated_by: Codex
last_updated_note: "Added follow-up research for all authenticated pages and bottom navigation overlap"
---

# Research: Profile logout button cut by lower menu bar

**Date**: 2026-05-05T00:51:00-03:00
**Researcher**: Codex
**Git Commit**: 4ff85fb6df19899bed3ddc8d87c61e0e52b925f8
**Branch**: main
**Repository**: Diamond

## Research Question

$research-codebase Button exit the account (sair da conta) of the profile page, is being cut when the scroll is scrolled down completely. The lower manu bar cuts the button.

## Scope

This research covers the current profile page rendering, the logout button placement, the authenticated bottom navigation, and the app shell styles that control scrolling and fixed menu positioning. It includes `index.html`, `js/app.js`, `css/reset.css`, `css/components.css`, `css/pages.css`, and directly relevant existing documentation. It does not modify code or run visual browser verification.

## Summary

The profile page is rendered inside `#main-content`, which is the application's only scroll container. The logout button is the final element in the profile `.page-container`, with no local bottom margin after it (`js/app.js:617`, `js/app.js:713`, `js/app.js:714`). The lower menu is a separate fixed-position `#bottom-nav` pinned to the viewport bottom with height `calc(65px + env(safe-area-inset-bottom))` and `z-index: 1000` (`css/components.css:79`, `css/components.css:80`, `css/components.css:81`, `css/components.css:89`, `css/components.css:90`). Global layout gives `#main-content` bottom padding for the menu area, but that padding is on the scroll container itself, not on the profile page container (`css/reset.css:30`, `css/reset.css:32`, `css/reset.css:41`, `css/reset.css:44`, `css/reset.css:45`).

## Detailed Findings

### SPA Shell

- `index.html` defines a single app shell: `#app` contains `main#main-content`, `nav#bottom-nav`, and `#toasts-container` (`index.html:39`, `index.html:41`, `index.html:47`, `index.html:51`).
- The bottom nav starts hidden in the static HTML and is populated dynamically by JavaScript after route rendering (`index.html:47`, `index.html:48`, `js/app.js:929`, `js/app.js:934`).
- `html, body` are full-height and use `overflow: hidden`, so the body itself does not scroll (`css/reset.css:12`, `css/reset.css:18`, `css/reset.css:20`).
- `#app` is a flex column with `height: 100dvh`, making `#main-content` the flex child that owns route scrolling (`css/reset.css:23`, `css/reset.css:24`, `css/reset.css:26`, `css/reset.css:30`, `css/reset.css:32`).

### Main Scroll Container

- `#main-content` has `flex: 1`, `overflow-y: auto`, and touch scrolling enabled (`css/reset.css:30`, `css/reset.css:31`, `css/reset.css:32`, `css/reset.css:33`).
- `#main-content` has top safe-area padding and bottom padding calculated as `var(--nav-height) + 40px + env(safe-area-inset-bottom)` (`css/reset.css:38`, `css/reset.css:41`).
- `--nav-height` is defined as `65px`, matching the fixed height used by `.nav-item` and the non-safe-area portion of `#bottom-nav` (`css/reset.css:8`, `css/reset.css:9`, `css/components.css:90`, `css/components.css:103`).
- `.page-container` only applies horizontal padding and does not define bottom padding or margin (`css/reset.css:44`, `css/reset.css:45`).
- `css/pages.css` adds `min-height: 100vh` and transition styles to `#main-content`, so it participates in both app layout and page transitions (`css/pages.css:2`, `css/pages.css:3`, `css/pages.css:4`).

### Profile Page Content

- The `#profile` route is dispatched to `renderProfile()` from the central hash router (`js/app.js:264`, `js/app.js:277`).
- `renderProfile()` replaces `this.mainContent.innerHTML` with a `<div class="page-container">` wrapper (`js/app.js:613`, `js/app.js:617`, `js/app.js:618`).
- The profile template renders the header, personal data card, optional student athlete card, optional admin or responsible/business cards, account type card, and Diamond X website card before the logout button (`js/app.js:619`, `js/app.js:633`, `js/app.js:648`, `js/app.js:676`, `js/app.js:685`, `js/app.js:694`, `js/app.js:704`).
- Most preceding profile blocks have inline `margin-bottom: 24px`, including the data card, athlete card, role-specific cards, account type card, and website card (`js/app.js:633`, `js/app.js:649`, `js/app.js:677`, `js/app.js:686`, `js/app.js:694`, `js/app.js:704`).
- The logout button is rendered as the last child inside `.page-container`: `<button id="logout-btn" class="btn" ...>SAIR DA CONTA</button>` (`js/app.js:713`).
- The closing `</div>` for `.page-container` comes immediately after the logout button, so there is no profile-specific trailing element, margin, or spacer after `#logout-btn` (`js/app.js:713`, `js/app.js:714`).
- The logout click handler is attached immediately after template injection; it confirms the action, calls `auth.logout()`, sets `#login`, and reloads the window (`js/app.js:717`, `js/app.js:718`, `js/app.js:719`, `js/app.js:720`, `js/app.js:721`, `js/app.js:722`).

### Button Styling

- `.btn` is an inline-flex button, centered, with `padding: 14px 24px`, uppercase display font, and `width: 100%` (`css/components.css:3`, `css/components.css:4`, `css/components.css:5`, `css/components.css:6`, `css/components.css:7`, `css/components.css:9`, `css/components.css:11`, `css/components.css:14`).
- `#logout-btn` uses `.btn` plus inline border and danger text color; it does not add bottom margin or bottom padding inline (`js/app.js:713`).

### Bottom Navigation

- Authenticated routes call `updateNav(hash)` after route rendering (`js/app.js:290`).
- Public auth routes hide the bottom nav, while other authenticated routes remove the `hidden` class (`js/app.js:894`, `js/app.js:896`, `js/app.js:897`, `js/app.js:901`).
- The profile tab exists for every role's bottom navigation: admin uses `#profile` with label `Config`, responsible/businessman uses `#profile` with label `Perfil`, and student uses `#profile` with label `Perfil` (`js/app.js:907`, `js/app.js:913`, `js/app.js:914`, `js/app.js:920`, `js/app.js:921`, `js/app.js:926`).
- `#bottom-nav` is fixed to the viewport bottom, spans full width, has a top border, and sits above route content via `z-index: 1000` (`css/components.css:79`, `css/components.css:80`, `css/components.css:81`, `css/components.css:83`, `css/components.css:85`, `css/components.css:89`).
- `#bottom-nav` includes bottom safe-area padding and has total height `calc(65px + env(safe-area-inset-bottom))` (`css/components.css:88`, `css/components.css:90`).
- Each `.nav-item` has `height: 65px`, centered column layout, icon and text, and the active tab color changes through `.nav-item.active` (`css/components.css:93`, `css/components.css:95`, `css/components.css:96`, `css/components.css:98`, `css/components.css:103`, `css/components.css:107`, `css/components.css:108`, `css/components.css:111`, `css/components.css:112`).

## Code References

- `index.html:39` - Root app container starts.
- `index.html:41` - Dynamic route content mounts in `#main-content`.
- `index.html:47` - Fixed bottom nav shell exists outside `#main-content`.
- `css/reset.css:20` - Body scrolling is disabled.
- `css/reset.css:30` - `#main-content` layout starts.
- `css/reset.css:32` - `#main-content` owns vertical scrolling.
- `css/reset.css:41` - Global bottom padding for menu/safe area.
- `css/reset.css:44` - `.page-container` styling starts.
- `css/components.css:3` - Shared `.btn` styling starts.
- `css/components.css:79` - `#bottom-nav` styling starts.
- `css/components.css:80` - Bottom nav is fixed.
- `css/components.css:90` - Bottom nav height includes safe area.
- `js/app.js:277` - `#profile` route dispatches to `renderProfile()`.
- `js/app.js:617` - Profile page template injection starts.
- `js/app.js:618` - Profile content wrapper is `.page-container`.
- `js/app.js:713` - Logout button is rendered as the final profile control.
- `js/app.js:714` - Profile wrapper closes immediately after the logout button.
- `js/app.js:718` - Logout button click handler starts.
- `js/app.js:901` - Authenticated routes show the bottom nav.
- `js/app.js:929` - Dynamic bottom nav anchors are rendered.

## Architecture Documentation

The application is a hash-routed vanilla JavaScript SPA. The static shell in `index.html` keeps route content and the bottom navigation as sibling elements: route pages are injected into `#main-content`, while `#bottom-nav` remains a fixed viewport-level navigation element. `js/app.js` controls both route dispatch and bottom-nav rendering. Shared CSS in `css/reset.css` defines the app height, disables body scrolling, and makes `#main-content` the scrollable area. Shared CSS in `css/components.css` defines the fixed lower navigation and button primitives.

The profile page is a shared renderer for student, responsible/businessman, and admin accounts. It conditionally adds role-specific cards, then renders the Diamond X website card and the `SAIR DA CONTA` button at the bottom of the page. The route itself does not add a separate footer or spacer after the logout button.

## Historical Context

The existing TC005 registration-flow spec states that `SAIR DA CONTA` belongs to the profile page rather than the dashboard (`docs/specs/2026-05-04-tc005-registration-flow-spec.md:28`). The same spec says that tests needing logout should click `a[href="#profile"]` and assert `SAIR DA CONTA` there (`docs/specs/2026-05-04-tc005-registration-flow-spec.md:152`).

The existing login background research documents the same shell architecture: `#main-content` is the route scroll container with top and bottom padding, and `index.html` provides `#app`, `#main-content`, and `#bottom-nav` as the SPA shell (`docs/research/2026-05-05-login-background-full-screen.md:53`, `docs/research/2026-05-05-login-background-full-screen.md:56`, `docs/research/2026-05-05-login-background-full-screen.md:80`).

## Related Research

- `docs/research/2026-05-05-login-background-full-screen.md` - Documents the current app shell, `#main-content` scroll behavior, and route rendering boundaries.
- `docs/research/2026-05-04-TC026-update-profile-information.md` - Documents profile page behavior and bottom-nav access to `#profile`.
- `docs/research/2026-05-04-TC005-registration-flow.md` - Documents the registration/login flow and notes the logout button is on the profile route.

## Open Questions

- No browser screenshot or viewport measurement was captured in this research, so the exact pixel overlap at full scroll was not measured here.
- The working tree already had modified files when this research was performed (`css/components.css`, `css/pages.css`, `js/app.js`, `js/pages/admin/reports.js`) and untracked docs. The line references in this document reflect the live working tree at research time.

## Follow-up Research 2026-05-06T09:57:38-03:00

### Research Question

$research-codebase on all pages, when the scroll is scrolled down completely, menu bar cuts page

### Scope

This follow-up checks the current live working tree for the shared app shell, route dispatch, all authenticated page wrappers, bottom navigation styles, and existing documentation/spec context related to bottom-nav overlap. It covers `index.html`, `js/app.js`, all modules under `js/pages/`, `css/reset.css`, `css/components.css`, `css/pages.css`, `docs/research/`, and `docs/specs/`. It does not modify application behavior and does not include browser screenshot or viewport measurement.

### Metadata

- Date: 2026-05-06T09:57:38-03:00
- Researcher: Codex
- Git Commit: 884fa972ab9b00597480183ad260560d6aabed7f
- Branch: work
- Repository: Diamond

### Summary

The app currently uses one scroll container for routed content: `main#main-content`. The bottom menu is a sibling `nav#bottom-nav` outside that scroll container and is fixed to the viewport bottom (`index.html:39`, `index.html:41`, `index.html:47`, `css/components.css:80`, `css/components.css:82`). Global CSS gives `#main-content` bottom padding of `calc(var(--nav-height) + 40px + env(safe-area-inset-bottom))`, while `.page-container` itself only supplies horizontal padding (`css/reset.css:30`, `css/reset.css:32`, `css/reset.css:41`, `css/reset.css:44`, `css/reset.css:45`).

In the current live code, the profile route is the only authenticated route wrapper with an extra page-level bottom padding class: `renderProfile()` now renders `<div class="page-container profile-page">`, and `.profile-page` adds `padding-bottom: calc(var(--nav-height) + 40px + env(safe-area-inset-bottom))` (`js/app.js:617`, `js/app.js:618`, `css/pages.css:14`, `css/pages.css:15`). The other authenticated page modules render a plain `.page-container` wrapper and rely on the global `#main-content` bottom padding.

### Detailed Findings

#### Shared Shell And Scroll Ownership

- `index.html` keeps route content and the bottom nav as sibling elements inside `#app`: `main#main-content` at `index.html:41`, `nav#bottom-nav` at `index.html:47`, and `#toasts-container` at `index.html:51`.
- `html, body` are full size and use `overflow: hidden`, so document-level scrolling is disabled (`css/reset.css:12`, `css/reset.css:18`, `css/reset.css:20`).
- `#app` is a flex column with `height: 100dvh`; `#main-content` is the flex child with `overflow-y: auto`, making it the route scroll container (`css/reset.css:23`, `css/reset.css:26`, `css/reset.css:30`, `css/reset.css:32`).
- `#main-content` includes top safe-area padding and bottom padding for the navigation area: `padding-bottom: calc(var(--nav-height) + 40px + env(safe-area-inset-bottom))` (`css/reset.css:38`, `css/reset.css:41`).
- `.page-container` only defines `padding: 0 20px`; it does not define a general bottom spacer for every page wrapper (`css/reset.css:44`, `css/reset.css:45`).
- `css/pages.css` also gives `#main-content` `min-height: 100vh`, while `#app` is already `100dvh` (`css/pages.css:2`, `css/pages.css:4`, `css/reset.css:23`, `css/reset.css:26`).

#### Bottom Navigation

- `#bottom-nav` is `position: fixed`, pinned to `bottom: 0`, spans `width: 100%`, and uses `z-index: 1000` (`css/components.css:80`, `css/components.css:81`, `css/components.css:82`, `css/components.css:84`, `css/components.css:90`).
- The nav includes safe-area padding and has a computed height of `calc(65px + env(safe-area-inset-bottom))`; each `.nav-item` is `65px` tall (`css/components.css:89`, `css/components.css:91`, `css/components.css:94`, `css/components.css:104`).
- The central renderer calls `this.updateNav(hash)` after page rendering (`js/app.js:228`, `js/app.js:264`, `js/app.js:290`).
- `updateNav()` hides the nav only for public routes `#login`, `#register`, `#forgot-password`, and `#update-password`; otherwise it removes `hidden` from `#bottom-nav` and renders role-specific anchors (`js/app.js:894`, `js/app.js:896`, `js/app.js:897`, `js/app.js:901`, `js/app.js:907`, `js/app.js:914`, `js/app.js:921`, `js/app.js:929`).

#### Authenticated Page Wrappers

- The central route switch sends authenticated hashes to page renderers for dashboard, trainings, attendance, students, plans, payments, users, reports, and profile (`js/app.js:264`, `js/app.js:269`, `js/app.js:270`, `js/app.js:271`, `js/app.js:272`, `js/app.js:273`, `js/app.js:274`, `js/app.js:275`, `js/app.js:276`, `js/app.js:277`).
- Role dispatch maps shared route names to role-specific modules: dashboards route to admin/responsible/student modules, trainings route to admin/responsible/student modules, plans route to admin/responsible/student modules, and payments route to admin charges for admins or responsible payments for other roles (`js/app.js:581`, `js/app.js:583`, `js/app.js:585`, `js/app.js:587`, `js/app.js:591`, `js/app.js:592`, `js/app.js:593`, `js/app.js:594`, `js/app.js:597`, `js/app.js:598`, `js/app.js:599`, `js/app.js:600`, `js/app.js:603`, `js/app.js:604`, `js/app.js:605`).
- Admin modules render plain `.page-container` wrappers: dashboard (`js/pages/admin/dashboard.js:7`, `js/pages/admin/dashboard.js:8`), users (`js/pages/admin/users.js:10`, `js/pages/admin/users.js:11`), trainings (`js/pages/admin/trainings.js:12`, `js/pages/admin/trainings.js:13`), plans (`js/pages/admin/plans.js:8`, `js/pages/admin/plans.js:9`), charges/payments (`js/pages/admin/charges.js:8`, `js/pages/admin/charges.js:9`), and reports (`js/pages/admin/reports.js:7`, `js/pages/admin/reports.js:8`).
- Responsible/business modules render plain `.page-container` wrappers: dashboard (`js/pages/responsible/dashboard.js:9`, `js/pages/responsible/dashboard.js:10`), students (`js/pages/responsible/students.js:8`, `js/pages/responsible/students.js:9`), trainings (`js/pages/responsible/trainings.js:11`, `js/pages/responsible/trainings.js:12`), plans (`js/pages/responsible/plans.js:11`, `js/pages/responsible/plans.js:12`), and payments (`js/pages/responsible/payments.js:7`, `js/pages/responsible/payments.js:8`).
- Student modules render plain `.page-container` wrappers: dashboard (`js/pages/student/dashboard.js:9`, `js/pages/student/dashboard.js:10`), trainings (`js/pages/student/trainings.js:14`, `js/pages/student/trainings.js:15`), plans (`js/pages/student/plans.js:10`, `js/pages/student/plans.js:11`), and attendance (`js/pages/student/attendance.js:40`, `js/pages/student/attendance.js:41`).
- The shared profile route renders `.page-container profile-page` instead of a plain `.page-container` (`js/app.js:613`, `js/app.js:617`, `js/app.js:618`).

#### Current Profile-Specific Spacing

- `.profile-page` is defined in `css/pages.css` and adds bottom padding equal to the nav-height formula plus safe area (`css/pages.css:14`, `css/pages.css:15`).
- The existing spec for the profile overlap fix describes this as a scoped change to profile only and explicitly says not to reduce the global `#main-content` padding because other routes depend on it (`docs/specs/2026-05-05-profile-logout-bottom-nav-overlap-spec.md:84`, `docs/specs/2026-05-05-profile-logout-bottom-nav-overlap-spec.md:91`, `docs/specs/2026-05-05-profile-logout-bottom-nav-overlap-spec.md:97`).
- The live code reflects that spec: profile has extra page-level padding, while other page modules still use plain `.page-container` wrappers and the global scroll-container padding.

### Code References

- `index.html:41` - Dynamic page content mounts in `#main-content`.
- `index.html:47` - Bottom navigation is outside route content.
- `css/reset.css:20` - Body-level scrolling is disabled.
- `css/reset.css:30` - `#main-content` layout starts.
- `css/reset.css:32` - `#main-content` owns vertical scrolling.
- `css/reset.css:41` - Global bottom padding for the fixed nav area.
- `css/reset.css:44` - Plain `.page-container` styling starts.
- `css/components.css:80` - Bottom nav is fixed.
- `css/components.css:91` - Bottom nav height includes safe area.
- `css/pages.css:14` - Profile-only page spacing rule starts.
- `js/app.js:264` - Central hash route switch starts.
- `js/app.js:290` - Navigation is updated after route rendering.
- `js/app.js:618` - Profile wrapper includes `profile-page`.
- `js/app.js:901` - Authenticated routes show the bottom nav.
- `js/pages/admin/charges.js:9` - Admin payments page uses plain `.page-container`.
- `js/pages/student/trainings.js:15` - Student trainings page uses plain `.page-container`.
- `js/pages/responsible/students.js:9` - Responsible students page uses plain `.page-container`.

### Architecture Documentation

Diamond is a vanilla JavaScript hash-routed SPA. The route outlet and bottom navigation are separate siblings in the static shell. All route modules replace `#main-content.innerHTML` with template strings. The app uses one internal scroll container (`#main-content`) rather than scrolling the document body. The bottom nav is viewport-fixed and role-based; route content scrolls behind or under that fixed viewport layer unless spacing in the scrollable content creates clearance.

The spacing model is currently split between shared shell spacing and one route-specific spacing rule. Shared spacing lives on the scroll container (`#main-content`). Profile-specific spacing lives on the profile route wrapper (`.profile-page`). Other authenticated route wrappers do not have a route-specific bottom-spacing class in the current live code.

### Historical Context

- `docs/research/2026-05-05-profile-logout-bottom-nav-overlap.md` originally documented the profile logout button overlap before the current `profile-page` class was present.
- `docs/specs/2026-05-05-profile-logout-bottom-nav-overlap-spec.md` specified adding `profile-page` to the profile wrapper and adding `.profile-page` bottom padding in `css/pages.css`.
- `docs/research/2026-05-05-login-background-full-screen.md` documents the same app shell and `#main-content` scroll-container behavior.

### Open Questions

- No browser screenshot, DOM measurement, or mobile viewport scroll test was captured in this follow-up, so the exact full-scroll overlap on each route is not measured here.
- The live code shows profile-specific bottom spacing only for `#profile`; whether any non-profile page visually overlaps at a specific viewport depends on rendered data volume and viewport dimensions, which were not measured in this research.
