---
date: 2026-05-05T10:11:56-03:00
researcher: Codex
git_commit: feef5a9b87dec6c0541ef4a3e64373de137d1602
branch: work
repository: Diamond
topic: "Na imagem o título da página \"Financeiro\" está ficando atrás ou acima da logo. Nesse caso a logo pode ocultar caso aconteça isso. Correto?"
tags: [research, codebase]
status: complete
last_updated: 2026-05-05
last_updated_by: Codex
---

# Research: Financeiro header title and logo overlap

**Date**: 2026-05-05T10:11:56-03:00
**Researcher**: Codex
**Git Commit**: feef5a9b87dec6c0541ef4a3e64373de137d1602
**Branch**: work
**Repository**: Diamond

## Research Question

Na imagem o título da página "Financeiro" está ficando atrás ou acima da logo. Nesse caso a logo pode ocultar caso aconteça isso. Correto?

## Scope

This research covers only the admin Financeiro/Cobranças header layout shown in the provided screenshot: the route that renders it, the DOM structure generated for the header, the shared CSS rules for `.page-header` and `.page-header-logo`, and the historical spec note that asked for fixed, non-distorted logos. It does not cover charge data loading, payment behavior, bottom navigation overlap, or implementation changes.

## Summary

Yes. In the current code, the `FINANCEIRO` title and the logo/actions group are rendered as sibling children in the same `.page-header` flex row. The right-side group contains the logo, add button, and refresh button, and that group is configured not to shrink. The title is allowed to shrink and does not have clipping, ellipsis, wrapping to a separate row, or a dedicated reserved width. Under constrained horizontal space, the right-side group can visually occupy the same horizontal area as the title; because it appears after the title in the DOM and does not shrink, the logo/action group remains visible in that collision.

There is no explicit `position`, `z-index`, or overlay layer on `.page-header-logo`. The behavior comes from normal flex layout plus fixed/non-shrinking header controls.

## Detailed Findings

### Route And Screen Entry

- `index.html` defines the SPA shell with `main#main-content`, where routed pages are injected (`index.html:39`, `index.html:41`).
- `js/app.js` imports the admin charges module as `adminCharges` (`js/app.js:8`).
- The app routes `#payments` to `renderPayments()` (`js/app.js:264`, `js/app.js:274`).
- For admin profiles, `renderPayments()` calls `adminCharges.render()` (`js/app.js:603`, `js/app.js:604`).
- The admin bottom nav labels `#payments` as `Cobranças`, matching the active menu item shown in the screenshot (`js/app.js:907`, `js/app.js:912`).

### Financeiro Header Markup

- `adminCharges.render()` replaces `#main-content` with a `.page-container` containing a `.page-header` (`js/pages/admin/charges.js:6`, `js/pages/admin/charges.js:7`, `js/pages/admin/charges.js:8`, `js/pages/admin/charges.js:9`, `js/pages/admin/charges.js:10`).
- The title is a direct first child of `.page-header`: `<h1 ...>FINANCEIRO</h1>` (`js/pages/admin/charges.js:11`).
- The title uses `font-family: var(--font-brand)`, `font-size: 24px`, and `font-weight: 400` inline (`js/pages/admin/charges.js:11`).
- The header's second child is an inline-styled `<div>` with `display: flex`, `align-items: center`, and `gap: 8px` (`js/pages/admin/charges.js:12`).
- That second child contains the Diamond X logo image, the add-charge button, and the refresh button (`js/pages/admin/charges.js:13`, `js/pages/admin/charges.js:14`, `js/pages/admin/charges.js:17`).

### Shared Header Layout

- `.page-header` is a flex container with centered alignment, `justify-content: space-between`, `gap: 16px`, `min-height: 56px`, and `margin-bottom: 20px` (`css/components.css:128`, `css/components.css:129`, `css/components.css:130`, `css/components.css:131`, `css/components.css:132`, `css/components.css:133`, `css/components.css:134`, `css/components.css:135`).
- `.page-header h1` and `.page-header > div:first-child` receive `min-width: 0` (`css/components.css:138`, `css/components.css:139`, `css/components.css:140`).
- The Financeiro title is an `h1`, so it matches the `min-width: 0` rule even though it is not a `div` child (`js/pages/admin/charges.js:11`, `css/components.css:138`, `css/components.css:140`).
- `.page-header > div:last-child` receives `flex-shrink: 0` (`css/components.css:143`, `css/components.css:144`).
- In the Financeiro header, that last child is the right-side group containing the logo and buttons (`js/pages/admin/charges.js:12`, `js/pages/admin/charges.js:13`, `js/pages/admin/charges.js:14`, `js/pages/admin/charges.js:17`).

### Title Text Behavior

- `.page-header h1` sets `line-height: 1.05`, `overflow-wrap: normal`, `word-break: normal`, `hyphens: manual`, and `text-wrap: balance` (`css/components.css:147`, `css/components.css:148`, `css/components.css:149`, `css/components.css:150`, `css/components.css:151`, `css/components.css:152`).
- The title style does not define `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`, a max width, or an alternate stacked layout for this screen (`js/pages/admin/charges.js:11`, `css/components.css:147`, `css/components.css:152`).
- On screens up to `480px`, `.page-header h1` is reduced to `font-size: clamp(17px, 4.5vw, 20px) !important` and `letter-spacing: 0` (`css/components.css:207`, `css/components.css:208`, `css/components.css:209`, `css/components.css:210`).
- That mobile rule changes title size, but it does not change the Financeiro header from one row to multiple rows and does not remove the fixed right-side group (`css/components.css:207`, `css/components.css:208`, `css/components.css:209`, `css/components.css:143`, `css/components.css:144`).

### Logo And Action Group Behavior

- `.page-header-logo` has fixed dimensions: `width: 72px` and `height: 52px` (`css/components.css:155`, `css/components.css:156`, `css/components.css:157`).
- The logo uses `display: block`, `object-fit: contain`, `object-position: center`, `opacity: 0.95`, and `flex-shrink: 0` (`css/components.css:158`, `css/components.css:159`, `css/components.css:160`, `css/components.css:161`, `css/components.css:162`).
- On screens up to `380px`, `.page-header-logo` is reduced to `width: 64px` and `height: 46px` (`css/components.css:191`, `css/components.css:196`, `css/components.css:197`, `css/components.css:198`).
- The add-charge button in this header has inline `width: auto` and `padding: 10px 16px`; it contains a plus-circle icon with `font-size: 20px` (`js/pages/admin/charges.js:14`, `js/pages/admin/charges.js:15`).
- The refresh button has inline `width: auto`, `padding: 10px`, and contains a refresh icon with `font-size: 24px` (`js/pages/admin/charges.js:17`, `js/pages/admin/charges.js:18`).
- The right-side group also has its own internal `gap: 8px` between logo, add button, and refresh button (`js/pages/admin/charges.js:12`).

### App Container Width Context

- The global `#app` uses `height: 100dvh` and `width: 100%` (`css/reset.css:23`, `css/reset.css:24`, `css/reset.css:26`, `css/reset.css:27`).
- `#main-content` is the scrollable route container (`css/reset.css:30`, `css/reset.css:31`, `css/reset.css:32`, `css/reset.css:33`).
- `.page-container` applies horizontal padding of `20px` on each side (`css/reset.css:44`, `css/reset.css:45`).
- Therefore, the `.page-header` does not use the full viewport width; it uses the route content width after `.page-container` horizontal padding (`js/pages/admin/charges.js:9`, `js/pages/admin/charges.js:10`, `css/reset.css:44`, `css/reset.css:45`).
- The global `h1` rule adds `margin-bottom: 24px` and `padding-top: 10px` to all `h1` elements, including the Financeiro title unless overridden (`css/reset.css:48`, `css/reset.css:49`, `css/reset.css:50`, `css/reset.css:51`, `js/pages/admin/charges.js:11`).

### Historical Context

- The May 3 implementation spec explicitly required `.page-header-logo` to have fixed width/height, `object-fit: contain`, and `flex-shrink: 0` (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:58`, `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:60`).
- The same spec listed `js/pages/admin/charges.js` as one of the admin screens to receive standardized title and logo treatment (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:116`, `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:124`).
- That spec's success criteria included checking that headers show a non-distorted logo on mobile width (`docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:71`, `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:77`).

## Code References

- `index.html:41` - Dynamic route outlet for the SPA.
- `js/app.js:8` - Imports `adminCharges`.
- `js/app.js:274` - Routes `#payments`.
- `js/app.js:604` - Admin payment route renders `adminCharges`.
- `js/app.js:912` - Admin bottom-nav label for `#payments` is `Cobranças`.
- `js/pages/admin/charges.js:9` - Financeiro content wrapper starts.
- `js/pages/admin/charges.js:10` - Financeiro `.page-header` starts.
- `js/pages/admin/charges.js:11` - Title `FINANCEIRO` is the first header child.
- `js/pages/admin/charges.js:12` - Right-side flex group starts.
- `js/pages/admin/charges.js:13` - Header logo image.
- `js/pages/admin/charges.js:14` - Add-charge button.
- `js/pages/admin/charges.js:17` - Refresh button.
- `css/reset.css:44` - `.page-container` horizontal padding.
- `css/reset.css:49` - Global `h1` rule starts.
- `css/components.css:129` - `.page-header` flex layout starts.
- `css/components.css:143` - Last header `div` does not shrink.
- `css/components.css:147` - Header title text behavior starts.
- `css/components.css:155` - `.page-header-logo` styling starts.
- `css/components.css:207` - Mobile header title rule starts.
- `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md:60` - Historical requirement for fixed, non-shrinking logo.

## Architecture Documentation

The application is a vanilla JavaScript SPA. `index.html` provides a static shell and `js/app.js` dispatches hash routes by replacing `#main-content` contents. The admin Financeiro screen is implemented in `js/pages/admin/charges.js`; it injects the header directly as an HTML string. Shared styling for the header lives in `css/components.css`, while global page width and spacing come from `css/reset.css`.

The Financeiro header is not a separate component with route-specific layout logic. It uses the shared `.page-header` contract: first child for title/content, last child for fixed right-side controls. In this screen, the right-side controls include both branding (`.page-header-logo`) and two action buttons. The shared CSS makes the right-side group and the logo non-shrinking, while the title remains flexible.

## Related Research

- `docs/research/2026-05-05-admin-financeiro-cobrancas-screen.md` - Broader research for the full admin Financeiro/Cobranças screen.
- `docs/research/2026-05-03-spec-alteracoes-analysis.md` - Earlier analysis of the Diamond X visual-change spec and screen mapping.
- `docs/research/2026-05-05-profile-logout-bottom-nav-overlap.md` - Documents the same SPA shell and `#main-content` route container.

## Open Questions

- No browser measurement was captured for this research, so the exact pixel width at which the title and logo/action group collide was not measured.
- The screenshot shows the visual symptom, but this research did not run a device-specific visual test against the same viewport and safe-area settings.
