---
date: 2026-05-05T00:51:00-03:00
researcher: Codex
git_commit: 4ff85fb6df19899bed3ddc8d87c61e0e52b925f8
branch: main
repository: Diamond
topic: "$research-codebase Button exit the account (sair da conta) of the profile page, is being cut when the scroll is scrolled down completely. The lower manu bar cuts the button."
tags: [research, codebase]
status: complete
last_updated: 2026-05-05
last_updated_by: Codex
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
