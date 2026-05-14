---
date: 2026-05-14T19:30:36-03:00
researcher: Codex
git_commit: 255dbe3118f4461cfd03d4742cddaa8b7b6b528a
branch: work
repository: Diamond
topic: "$research-codebase eu recebi agora do cliente que o padding no final da página está escondendo botões no dispositivo dele. Mas no meu não. O que pode ser? É algo geral para outros dispositivos ou nÃo isso não poderia estar acontencendo?"
tags: [research, codebase, mobile, layout, bottom-nav]
status: complete
last_updated: 2026-05-14
last_updated_by: Codex
last_updated_note: "Added follow-up note after adaptive bottom padding implementation."
---

# Research: padding inferior escondendo botões em alguns dispositivos

**Date**: 2026-05-14T19:30:36-03:00
**Researcher**: Codex
**Git Commit**: 255dbe3118f4461cfd03d4742cddaa8b7b6b528a
**Branch**: work
**Repository**: Diamond

## Research Question

$research-codebase eu recebi agora do cliente que o padding no final da página está escondendo botões no dispositivo dele. Mas no meu não. O que pode ser? É algo geral para outros dispositivos ou nÃo isso não poderia estar acontencendo?

## Scope

Included the static SPA shell, global scroll layout, bottom navigation, page wrappers, bottom-sheet/footer components, service worker cache/versioning, and relevant historical research/spec documents about bottom navigation spacing. This research did not modify runtime files and did not include a screenshot or computed-style measurement from the client's device.

## Summary

The current code can produce device-dependent bottom spacing behavior. It is not guaranteed to appear on every device, but it is also not impossible or isolated by design.

The app has one internal scroll container, `#main-content`, while `#bottom-nav` is a fixed sibling pinned to the viewport bottom. Current CSS reserves bottom space in two places for routed pages: `#main-content` has `padding-bottom: var(--nav-clearance)`, and every direct `.page-container` under it also gets `padding-bottom: var(--nav-clearance)`. Since logged-in routes consistently render direct `.page-container` wrappers, that bottom spacing is general across authenticated pages.

The visual result still varies by device because `--nav-clearance` is derived from responsive `clamp()` values, safe-area variables, and a short-height media query. PWA/Safari cache can also make one device run older CSS while another device shows the current version.

## Detailed Findings

### App Shell And Scroll Container

- The static shell keeps route content and bottom navigation as siblings: `main#main-content` and `nav#bottom-nav` both live inside `#app` (`index.html:48`, `index.html:50`, `index.html:56`).
- The document body itself does not scroll because `html, body` use `overflow: hidden`; the routed area scrolls inside `#main-content` (`css/reset.css:22`, `css/reset.css:33`, `css/reset.css:66`, `css/reset.css:68`).
- `#app` uses dynamic viewport sizing with `height: 100dvh`, and WebKit gets an override to `-webkit-fill-available` (`css/reset.css:37`, `css/reset.css:42`, `css/reset.css:48`, `css/reset.css:55`, `css/reset.css:57`).

### Bottom Navigation And Clearance

- `:root` defines `--safe-bottom`, `--nav-height`, `--nav-safe-area-cap`, `--nav-bottom-padding`, and `--nav-clearance` (`css/reset.css:8`, `css/reset.css:11`, `css/reset.css:14`, `css/reset.css:15`, `css/reset.css:19`).
- Current `--nav-bottom-padding` uses `min(var(--safe-bottom), var(--nav-safe-area-cap))`, and the cap is `2px`; the previous standalone `6px` override is not present in the current `css/reset.css` (`css/reset.css:13`, `css/reset.css:14`, `css/reset.css:15`).
- `#main-content` always applies `padding-bottom: var(--nav-clearance)` unless the route has the `auth-screen` class (`css/reset.css:66`, `css/reset.css:77`, `css/pages.css:7`, `css/pages.css:9`).
- Direct page wrappers add another `padding-bottom: var(--nav-clearance)` via `#main-content > .page-container` (`css/pages.css:14`, `css/pages.css:15`).
- The fixed nav itself is pinned with `position: fixed` and `bottom: 0`, has `z-index: 1000`, and uses `height: calc(var(--nav-height) + var(--nav-bottom-padding))` (`css/components.css:196`, `css/components.css:197`, `css/components.css:198`, `css/components.css:207`, `css/components.css:208`, `css/components.css:210`).
- For viewports up to `670px` high, `--nav-height` and `--nav-clearance` are redefined, so a short device can compute different bottom spacing from a taller device (`css/components.css:253`, `css/components.css:255`, `css/components.css:256`).

### Generality Across Routes

- The top-level router toggles `auth-screen` only for `#login` and `#forgot-password`, then renders route content and updates the nav (`js/app.js:340`, `js/app.js:341`, `js/app.js:368`, `js/app.js:373`, `js/app.js:404`).
- Public routes are hidden from the bottom nav in `updateNav()`, but the route layout CSS still depends on whether `auth-screen` was applied (`js/app.js:1164`, `js/app.js:1166`, `js/app.js:1167`).
- The profile route renders a direct `.page-container` wrapper with its final logout button as the last visible element (`js/app.js:735`, `js/app.js:736`, `js/app.js:854`).
- Admin, student, responsible, and checkout route modules render direct `.page-container` wrappers, so the shared page-wrapper bottom padding applies broadly (`js/pages/admin/charges.js:10`, `js/pages/admin/charges.js:11`, `js/pages/student/trainings.js:15`, `js/pages/student/trainings.js:16`, `js/pages/responsible/dashboard.js:9`, `js/pages/responsible/dashboard.js:10`, `js/pages/checkout.js:25`, `js/pages/checkout.js:26`).

### Other Bottom-Area Components

- The shared bottom sheet is appended to `document.body`, uses `position: fixed`, `align-items: flex-end`, `max-height: 90vh`, and scrolls `.sheet-body` (`js/ui.js:20`, `js/ui.js:36`, `js/ui.js:129`, `js/ui.js:135`, `js/ui.js:149`, `js/ui.js:181`, `js/ui.js:183`).
- `.sheet-body` uses full bottom safe-area padding with `calc(24px + env(safe-area-inset-bottom))`, without the `2px` cap used by the nav (`js/ui.js:181`, `js/ui.js:182`).
- The "Mais" menu sheet and pre-training footer also use full `env(safe-area-inset-bottom)` padding (`css/components.css:271`, `css/components.css:275`, `css/components.css:965`, `css/components.css:969`).

### Device-Specific Inputs

- The viewport meta includes `viewport-fit=cover`, which allows iOS safe-area variables to be non-zero (`index.html:5`).
- Apple/PWA metadata is present, and an inline script adds `html.standalone-app` when the app is running standalone (`index.html:15`, `index.html:16`, `index.html:26`, `index.html:28`, `index.html:31`).
- The current CSS no longer defines a special `.standalone-app` padding override, so standalone detection is present but not changing `--nav-bottom-padding` in the current files (`css/reset.css:1` through `css/reset.css:120`).
- Example calculations from the current CSS show the route-end reserve is about 110px to 120px when both `#main-content` and `.page-container` padding apply: 390x844 computes roughly `54.7px` clearance twice; 375x667 computes roughly `56px` clearance twice.

### Cache And Versioning Context

- `index.html` currently references `/css/reset.css?v=8`, `/css/components.css?v=19`, `/css/pages.css?v=2`, and `/js/app.js?v=18` (`index.html:42`, `index.html:44`, `index.html:45`, `index.html:84`).
- The service worker cache is `diamondx-v27` and precaches the same CSS/JS versions (`service-worker.js:1`, `service-worker.js:6`, `service-worker.js:8`, `service-worker.js:9`, `service-worker.js:10`).
- The service worker uses network-first handling for same-origin `/`, `index.html`, `.js`, and `.css` requests, with cache fallback on fetch failure (`service-worker.js:63`, `service-worker.js:64`, `service-worker.js:66`, `service-worker.js:68`, `service-worker.js:69`, `service-worker.js:72`, `service-worker.js:75`, `service-worker.js:82`).
- The May 14 spec explicitly lists stale PWA/service-worker cache as a risk that can mask the bottom-nav CSS update on iPhone until reload/reinstall (`docs/specs/2026-05-14-iphone-pwa-bottom-nav-safe-area-spec.md:95`, `docs/specs/2026-05-14-iphone-pwa-bottom-nav-safe-area-spec.md:128`, `docs/specs/2026-05-14-iphone-pwa-bottom-nav-safe-area-spec.md:172`, `docs/specs/2026-05-14-iphone-pwa-bottom-nav-safe-area-spec.md:177`).

## Code References

- `css/reset.css:66` - `#main-content` is the route scroll container.
- `css/reset.css:77` - `#main-content` applies bottom clearance.
- `css/pages.css:14` - Direct `.page-container` wrappers also receive bottom clearance.
- `css/components.css:196` - Fixed bottom nav rule starts.
- `css/components.css:253` - Short-height media query changes nav clearance.
- `js/app.js:368` - Only selected auth routes receive `auth-screen`.
- `js/app.js:1164` - Bottom nav visibility and rendering starts.
- `index.html:42` - Current reset CSS version.
- `service-worker.js:1` - Current cache name.
- `service-worker.js:72` - Network-first CSS/JS fetch path.

## Architecture Documentation

Diamond X is a static hash-routed SPA/PWA. Route modules replace `#main-content.innerHTML` with page markup. The document body is locked and `#main-content` owns scrolling. The bottom navigation is not inside the scroll container; it is a viewport-fixed sibling. Spacing that prevents route content from ending behind the nav is handled through CSS padding, split today between the scroll container and direct page wrappers.

The relevant layout chain is:

`index.html #app -> #main-content scroll container -> direct .page-container route wrapper -> page cards/buttons`

and separately:

`index.html #app -> #bottom-nav fixed viewport sibling`

## Historical Context

- `docs/legado/spec/2026-05-06-all-pages-bottom-nav-spacing-spec.md` planned the shared rule that applies bottom padding to all direct `.page-container` wrappers under `#main-content` and notes service-worker cache as a visual validation risk.
- `docs/research/2026-05-12-iphone-bottom-nav-viewport-gap.md` previously documented that route-end spacing could be affected by clearance on both `#main-content` and direct `.page-container` wrappers.
- `docs/specs/2026-05-14-iphone-pwa-bottom-nav-safe-area-spec.md` documents the later safe-area reduction, current asset versions, and remaining need to validate on a real iPhone/PWA.

## Related Research

- `docs/research/2026-05-12-iphone-bottom-nav-viewport-gap.md`
- `docs/research/2026-05-14-bottom-nav-safe-area.md`
- `docs/legado/research/2026-05-05-profile-logout-bottom-nav-overlap.md`

## Open Questions

- Which exact route and button the client saw hidden.
- Whether the client was using Safari tab mode, installed PWA standalone, Android WebView, or another browser.
- Whether the client's device had the current CSS versions (`reset.css?v=8`, `components.css?v=19`, `pages.css?v=2`) or an older service-worker cache.
- Exact computed values on the client's device for `window.innerHeight`, `visualViewport.height`, `env(safe-area-inset-bottom)`, `#main-content.getBoundingClientRect()`, and `#bottom-nav.getBoundingClientRect()`.

## Follow-up Implementation 2026-05-14T19:38:55-03:00

After this research, the layout was changed so `#main-content` no longer owns the bottom clearance padding. The bottom clearance now lives on direct `.page-container` wrappers and is scoped to `html.bottom-nav-visible`, using `--page-bottom-padding` derived from the nav height plus an adaptive `--page-end-gap` (`css/reset.css:19`, `css/reset.css:20`, `css/reset.css:21`, `css/reset.css:80`, `css/pages.css:15`, `css/pages.css:19`, `css/pages.css:20`).

The short-height media query now recalculates the same adaptive variables instead of adding a separate fixed `8px` to `--nav-clearance` (`css/components.css:253`, `css/components.css:255`, `css/components.css:256`, `css/components.css:257`, `css/components.css:258`). CSS asset versions and the service worker cache were also incremented so devices can receive the new layout (`index.html:42`, `index.html:44`, `index.html:45`, `service-worker.js:1`, `service-worker.js:6`, `service-worker.js:8`, `service-worker.js:9`).
