---
date: 2026-05-05T00:17:58-03:00
researcher: Codex
git_commit: 4ff85fb6df19899bed3ddc8d87c61e0e52b925f8
branch: main
repository: Diamond
topic: "Can we put the interactive background gif of the login page on the whole screen and not just in one part?"
tags: [research, codebase]
status: complete
last_updated: 2026-05-05
last_updated_by: Codex
---

# Research: Can we put the interactive background gif of the login page on the whole screen and not just in one part?

**Date**: 2026-05-05T00:17:58-03:00
**Researcher**: Codex
**Git Commit**: 4ff85fb6df19899bed3ddc8d87c61e0e52b925f8
**Branch**: main
**Repository**: Diamond

## Research Question
Can we put the interactive background gif of the login page on the whole screen and not just in one part?

## Scope
This research covers the current login route rendering, the login background CSS, the app shell layout that contains the login route, and directly relevant product/spec documentation. It does not implement the change or verify screenshots. The smallest relevant scope is the login and access-reset screen background implementation in `js/app.js`, `css/pages.css`, `css/reset.css`, and `index.html`.

## Summary
Yes, the current code structure can support a whole-screen login background because the background is already isolated into route-level layers: `.login-bg-image`, `.login-bg-overlay`, and `canvas#login-particles`. Today those layers are scoped to `.login-bg-wrapper`, which is rendered inside `#main-content`, not directly on `body` or `#app` (`js/app.js:294`, `js/app.js:295`, `js/app.js:296`, `js/app.js:298`). The visible area is affected by the app shell because `#main-content` is the scroll container and has safe-area/top/bottom padding (`css/reset.css:30`, `css/reset.css:32`, `css/reset.css:38`, `css/reset.css:41`). The current animated asset is not a GIF in the codebase; CSS references `/assets/bg-diamond.webp`, and the interactive layer is a canvas particle animation (`css/pages.css:37`, `js/app.js:331`).

## Detailed Findings

### Login Route DOM
- The SPA shell contains one dynamic route outlet: `<main id="main-content">` (`index.html:41`).
- The login route replaces `mainContent.innerHTML` with a `.login-bg-wrapper` containing `.login-bg-image`, `.login-bg-overlay`, `canvas#login-particles`, and `.login-content` (`js/app.js:291`, `js/app.js:294`, `js/app.js:295`, `js/app.js:296`, `js/app.js:297`, `js/app.js:298`, `js/app.js:299`).
- The login form content sits inside `.login-content`, separate from the background layers (`js/app.js:299`, `js/app.js:303`, `js/app.js:312`).
- The forgot-password route reuses `.login-bg-wrapper`, `.login-bg-image`, and `.login-bg-overlay`, but does not include `canvas#login-particles` (`js/app.js:409`, `js/app.js:412`, `js/app.js:413`, `js/app.js:414`).

### Background Styling
- `#login-particles` is `position: absolute` with `inset: 0`, so the canvas fills its positioned ancestor's box rather than the viewport by itself (`css/pages.css:18`, `css/pages.css:19`, `css/pages.css:20`).
- `.login-bg-wrapper` is `position: relative`, has `min-height: 100vh`, centers content with flexbox, and clips overflow (`css/pages.css:25`, `css/pages.css:26`, `css/pages.css:27`, `css/pages.css:28`, `css/pages.css:29`, `css/pages.css:31`).
- `.login-bg-image` is also `position: absolute` with `inset: 0`, uses `/assets/bg-diamond.webp`, and animates with `loginBgZoom` (`css/pages.css:34`, `css/pages.css:35`, `css/pages.css:36`, `css/pages.css:37`, `css/pages.css:39`).
- `.login-bg-overlay` fills the same local wrapper area with a dark vertical gradient (`css/pages.css:47`, `css/pages.css:48`, `css/pages.css:49`, `css/pages.css:50`).
- `.login-content` is `position: relative`, has `z-index: 2`, and has `min-height: 100vh`, which places the form layer above the background while also using viewport-height sizing (`css/pages.css:54`, `css/pages.css:55`, `css/pages.css:56`, `css/pages.css:64`).

### Interactive Particle Layer
- `renderLogin()` calls `initLoginParticles()` immediately after injecting the login markup (`js/app.js:319`, `js/app.js:320`).
- `initLoginParticles()` selects `#login-particles` and exits if the canvas is absent (`js/app.js:331`, `js/app.js:332`, `js/app.js:333`).
- The canvas drawing size is copied from `canvas.offsetWidth` and `canvas.offsetHeight`, so its actual particle area follows the rendered CSS size of the canvas (`js/app.js:338`, `js/app.js:339`, `js/app.js:340`).
- The animation creates 50 particles within `canvas.width` and `canvas.height`, then moves, wraps, and draws them on each animation frame (`js/app.js:345`, `js/app.js:346`, `js/app.js:347`, `js/app.js:354`, `js/app.js:385`).
- The animation is cleaned up when leaving login because `render()` calls `stopLoginParticles()` for non-login hashes, and the mutation observer also stops it when the canvas disappears (`js/app.js:260`, `js/app.js:389`, `js/app.js:390`, `js/app.js:391`, `js/app.js:397`).

### App Shell Boundaries
- `html, body` are fixed to full width and height, use `overflow: hidden`, and set the base app background color (`css/reset.css:12`, `css/reset.css:18`, `css/reset.css:19`, `css/reset.css:20`).
- `#app` is a flex column with `height: 100dvh` and full width (`css/reset.css:23`, `css/reset.css:24`, `css/reset.css:26`, `css/reset.css:27`).
- `#main-content` is the route scroll container with `flex: 1`, `overflow-y: auto`, top safe-area padding, and bottom navigation padding (`css/reset.css:30`, `css/reset.css:31`, `css/reset.css:32`, `css/reset.css:38`, `css/reset.css:41`).
- `css/pages.css` also gives `#main-content` `min-height: 100vh` and page transition transforms (`css/pages.css:2`, `css/pages.css:3`, `css/pages.css:4`).
- The login background layers are not mounted on `body`, `#app`, or `#main-content`; they are mounted inside `.login-bg-wrapper`, which itself is inside `#main-content` (`index.html:39`, `index.html:41`, `js/app.js:294`, `js/app.js:295`).

## Code References
- `index.html:39` - Root app container for the SPA.
- `index.html:41` - Dynamic route outlet where login markup is injected.
- `js/app.js:291` - Login route renderer entry point.
- `js/app.js:294` - Login route replaces `#main-content` contents.
- `js/app.js:295` - `.login-bg-wrapper` scopes all login background layers.
- `js/app.js:296` - Background image layer.
- `js/app.js:297` - Overlay layer.
- `js/app.js:298` - Interactive particle canvas layer.
- `js/app.js:331` - Particle initializer entry point.
- `js/app.js:338` - Canvas size follows rendered element size.
- `css/pages.css:18` - Particle canvas styling starts.
- `css/pages.css:25` - Login wrapper styling starts.
- `css/pages.css:34` - Login background image styling starts.
- `css/pages.css:47` - Login overlay styling starts.
- `css/reset.css:30` - `#main-content` app shell layout starts.
- `css/reset.css:38` - Route content has top safe-area padding.
- `css/reset.css:41` - Route content has bottom navigation padding.

## Architecture Documentation
The application is a hash-routed vanilla JavaScript SPA. `index.html` provides a static shell with `#app`, `#main-content`, and `#bottom-nav`. `js/app.js` owns route rendering by replacing `this.mainContent.innerHTML` based on `window.location.hash`. The login route is one of the public routes and hides the bottom navigation before rendering its custom background and form. The background is not a global app background; it is a set of children inside the login route wrapper. CSS then makes those children absolute within `.login-bg-wrapper`.

The current login visual has two moving parts: a CSS-animated WebP background image and a JavaScript canvas particle field. The image animation comes from `.login-bg-image` plus `@keyframes loginBgZoom`. The interactive particle layer comes from `initLoginParticles()`, which calculates the canvas drawing dimensions from the element's rendered dimensions.

## Historical Context
- The PRD requires the login screen to use Diamond X branding and an animated/interactive background (`PRD.md:211`, `PRD.md:212`).
- The May 3 implementation spec explicitly targeted `#login-particles`, `.login-bg-wrapper`, `.login-logo`, `.login-title`, and `.login-subtitle` for mobile and desktop behavior (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:63`, `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:64`).
- The same spec requested that `renderLogin()` use `.login-bg-wrapper`, `.login-bg-image`, `.login-bg-overlay`, `canvas#login-particles`, `.login-logo`, `.login-title`, and `.login-subtitle` (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:93`, `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:94`).

## Related Research
- `docs/research/2026-05-03-spec-alteracoes-analysis.md` - Earlier analysis of the Diamond X alteration spec. That document predates the current live implementation state for `renderLogin()` and `#login-particles`; live code is the current source of truth for this research.

## Open Questions
None identified.
