---
date: 2026-05-12T16:47:53-03:00
researcher: Codex
git_commit: dad21756ef72798782abc9dbd097942d0b0ed876
branch: work
repository: Diamond
topic: "$research-codebase [Image #1] note que o menu inferior tem um spaço grande para chegar ao final da tela do telefone (iPhone 15 nesse caso), o tamanho da tela do aplicativo precisa ser responsivo com a tela do telefone do usuário. Como podemos ajustar esse caso?"
tags: [research, codebase, layout, mobile, pwa]
status: complete
last_updated: 2026-05-12
last_updated_by: Codex
---

# Research: iPhone bottom nav viewport gap

**Date**: 2026-05-12T16:47:53-03:00
**Researcher**: Codex
**Git Commit**: dad21756ef72798782abc9dbd097942d0b0ed876
**Branch**: work
**Repository**: Diamond

## Research Question

$research-codebase [Image #1] note que o menu inferior tem um spaço grande para chegar ao final da tela do telefone (iPhone 15 nesse caso), o tamanho da tela do aplicativo precisa ser responsivo com a tela do telefone do usuário. Como podemos ajustar esse caso?

## Scope

Included the SPA shell, viewport/PWA metadata, global layout CSS, bottom navigation CSS, bottom navigation rendering in JavaScript, service worker cache entries, and existing legacy research/spec documents related to bottom navigation spacing. This research did not modify runtime files and did not run a browser/simulator measurement.

## Summary

The current app shell is a static PWA/SPA with `main#main-content` and `nav#bottom-nav` as siblings inside `#app`. The project already opts into iOS full-screen safe-area handling with `viewport-fit=cover`, PWA standalone display, and `env(safe-area-inset-bottom)`. The bottom navigation is fixed with `bottom: 0`, so in CSS it is already pinned to the browser viewport bottom. The visible gap in the supplied iPhone image is therefore most likely tied to viewport sizing/runtime display context or to accumulated safe-area/content spacing, not to the nav item distribution itself.

The current code also reserves bottom space in two places: `#main-content` and direct `.page-container` children both add navigation-height plus extra padding. That affects scrollable content clearance above the fixed nav. The nav itself uses a responsive `clamp()` minimum height, but the global `--nav-height` token remains fixed at `65px`, so content clearance and actual nav height are not fully synchronized.

## Detailed Findings

### SPA Shell And PWA Viewport

- `index.html` sets the viewport to `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`, which enables safe-area CSS variables on iOS when supported (`index.html:5`).
- The PWA metadata enables Apple mobile web app mode and a black translucent status bar (`index.html:15`, `index.html:16`, `index.html:21`).
- The static shell contains `main#main-content` followed by `nav#bottom-nav` as sibling elements inside `#app` (`index.html:39`, `index.html:41`, `index.html:47`).
- `manifest.json` declares `"display": "standalone"`, so installed PWA launches without normal browser chrome (`manifest.json:4`, `manifest.json:5`).

### App Height And Scroll Container

- `html, body` have `height: 100%`, `width: 100%`, and `overflow: hidden`, so the document itself is not the scroll container (`css/reset.css:12`, `css/reset.css:18`, `css/reset.css:20`).
- `#app` is a flex column with `height: 100dvh`, intended to follow the dynamic viewport height (`css/reset.css:23`, `css/reset.css:26`).
- `#main-content` is the scrollable route area with `flex: 1`, `overflow-y: auto`, and touch scrolling (`css/reset.css:30`, `css/reset.css:32`, `css/reset.css:33`).
- `#main-content` adds top safe-area padding and bottom clearance for the menu with `padding-bottom: calc(var(--nav-height) + 40px + env(safe-area-inset-bottom))` (`css/reset.css:38`, `css/reset.css:41`).
- `css/pages.css` also gives `#main-content` `min-height: 100vh`, while `#app` is already `100dvh` (`css/pages.css:2`, `css/pages.css:4`, `css/reset.css:26`).

### Bottom Navigation Positioning

- `#bottom-nav` is `position: fixed` with `bottom: 0`, `left: 0`, `right: 0`, and `width: 100%` (`css/components.css:196`, `css/components.css:197`, `css/components.css:198`, `css/components.css:201`).
- It uses `padding-bottom: env(safe-area-inset-bottom)` and `box-sizing: content-box`, so the safe-area padding increases the rendered nav box rather than being included inside a fixed height (`css/components.css:207`, `css/components.css:209`).
- The nav has `min-height: clamp(56px, 14vw, 68px)`, and each `.nav-item` mirrors that minimum height (`css/components.css:210`, `css/components.css:213`, `css/components.css:223`).
- The nav item typography and icon sizing are already responsive with `clamp()` (`css/components.css:219`, `css/components.css:221`, `css/components.css:236`).
- A small-screen media query only adjusts item padding and label letter spacing below 380px (`css/components.css:244`, `css/components.css:245`, `css/components.css:248`).

### Content Bottom Clearance

- `:root` still defines `--nav-height: 65px`, even though the nav now uses a `clamp()` value for its rendered minimum height (`css/reset.css:8`, `css/reset.css:9`, `css/components.css:210`).
- `#main-content` reserves `var(--nav-height) + 40px + safe-area` at the scroll-container level (`css/reset.css:41`).
- `#main-content > .page-container` adds the same style of bottom padding again to direct page wrappers (`css/pages.css:14`, `css/pages.css:15`).
- The duplicated reserve affects the space available at the end of page content, but it is separate from the physical position of `#bottom-nav`, which is controlled by fixed positioning.

### Navigation Rendering

- `js/app.js` caches the bottom nav element from `#bottom-nav` (`js/app.js:36`).
- `updateNav()` removes `.hidden`, reads the current role, and renders role-specific nav items (`js/app.js:1162`, `js/app.js:1163`, `js/app.js:1168`).
- The admin nav currently renders five visible items: Dash, Usuarios, Treinos, Planos, and Mais (`js/app.js:1168`, `js/app.js:1173`).
- The special `Mais` item is rendered as a button with `data-action="more"` instead of an anchor (`js/app.js:1190`, `js/app.js:1193`, `js/app.js:1204`).

### Cache And Asset Versioning

- `index.html` loads `/css/components.css?v=15` and `/js/app.js?v=17` (`index.html:35`, `index.html:75`).
- The service worker precaches the same versioned CSS and JS URLs (`service-worker.js:8`, `service-worker.js:10`).
- The service worker uses `CACHE_NAME = 'diamondx-v18'` and network-first behavior for same-origin HTML, JS, and CSS requests (`service-worker.js:1`, `service-worker.js:63`, `service-worker.js:72`, `service-worker.js:75`).

## Code References

- `index.html:5` - Enables `viewport-fit=cover` for safe-area behavior.
- `index.html:39` - Starts the `#app` shell.
- `index.html:41` - Route content mounts into `main#main-content`.
- `index.html:47` - `nav#bottom-nav` exists outside route content.
- `manifest.json:5` - PWA display mode is `standalone`.
- `css/reset.css:23` - Starts `#app` layout rule.
- `css/reset.css:26` - `#app` uses `height: 100dvh`.
- `css/reset.css:30` - Starts `#main-content` scroll-container rule.
- `css/reset.css:41` - Adds bottom clearance for nav plus safe area.
- `css/pages.css:4` - Adds `min-height: 100vh` to `#main-content`.
- `css/pages.css:15` - Adds page-wrapper bottom clearance.
- `css/components.css:196` - Starts `#bottom-nav` styling.
- `css/components.css:198` - Pins bottom nav with `bottom: 0`.
- `css/components.css:207` - Adds iOS bottom safe-area padding to nav.
- `css/components.css:210` - Uses responsive nav minimum height.
- `js/app.js:1162` - Shows the bottom nav for authenticated routes.
- `js/app.js:1168` - Starts role-specific nav item definitions.
- `service-worker.js:8` - Caches `/css/components.css?v=15`.

## Architecture Documentation

Diamond is a static, mobile-first SPA/PWA. The document body does not scroll; `#main-content` owns vertical scrolling. The bottom nav is a fixed viewport-level sibling, not part of the route content. Authenticated pages inject direct `.page-container` wrappers into `#main-content`, while `js/app.js` separately renders the role-based bottom navigation. Layout spacing is split between global shell CSS in `css/reset.css`, page-level CSS in `css/pages.css`, and component styling in `css/components.css`.

For the iPhone gap case, the relevant current boundaries are:

- Viewport and PWA mode: `index.html`, `manifest.json`.
- App height and scroll model: `css/reset.css`.
- Route bottom clearance: `css/pages.css`.
- Fixed navigation dimensions and safe-area padding: `css/components.css`.
- Role-based navigation markup: `js/app.js`.

## Adjustment Points

The code paths to adjust are:

- Synchronize the navigation height token with the rendered nav height. Today `--nav-height` is fixed at `65px`, while the nav uses `clamp(56px, 14vw, 68px)`.
- Review whether bottom clearance should exist on both `#main-content` and `#main-content > .page-container`. The current implementation reserves menu space in both places.
- Keep `viewport-fit=cover` and `env(safe-area-inset-bottom)` because they are the current mechanisms that allow iOS devices to account for the home indicator area.
- If the black area in the screenshot is outside the browser/PWA viewport, CSS inside the app can only fill the viewport it receives. In that case, validation must compare Safari tab mode versus installed standalone PWA mode.
- If CSS is changed, update or verify the versioned CSS URL and service worker cache behavior so iPhones do not keep an older layout from cache.

## Historical Context

- `docs/legado/research/2026-05-12-responsividade-menu-inferior.md` documented the previous state where the bottom nav had fixed 65px height, fixed 10px labels, fixed 20px icons, and no dedicated menu media query.
- `docs/legado/spec/2026-05-12-responsividade-menu-inferior-spec.md` planned and marked as completed the current responsive nav work: `clamp()` sizing plus reduction of admin visible items to 5 with a `Mais` sheet.
- `docs/legado/spec/2026-05-06-all-pages-bottom-nav-spacing-spec.md` planned the shared page-container bottom padding now visible at `css/pages.css:15`.
- `docs/legado/research/2026-05-05-profile-logout-bottom-nav-overlap.md` documents the same shell model: route content in `#main-content`, fixed `#bottom-nav` as a sibling, and scroll spacing handled by padding.

## Related Research

- `docs/legado/research/2026-05-12-responsividade-menu-inferior.md`
- `docs/legado/research/2026-05-05-profile-logout-bottom-nav-overlap.md`
- `docs/legado/research/2026-05-05-login-background-full-screen.md`

## Open Questions

- Whether the screenshot was taken in Safari tab mode, installed PWA standalone mode, or another webview.
- Whether the black area below the nav is part of the browser viewport or outside the viewport provided to the web app.
- Exact computed values on the device for `window.innerHeight`, `visualViewport.height`, `env(safe-area-inset-bottom)`, and the `#bottom-nav` bounding rectangle.
