---
date: 2026-05-05T09:03:35-03:00
researcher: Codex
git_commit: feef5a9b87dec6c0541ef4a3e64373de137d1602
branch: work
repository: Diamond
topic: "$research-codebase look: [Image #1]"
tags: [research, codebase]
status: complete
last_updated: 2026-05-05
last_updated_by: Codex
last_updated_note: "Added follow-up research for Financeiro header title/logo overlap"
---

# Research: Admin financeiro / cobranças screen

**Date**: 2026-05-05T09:03:35-03:00
**Researcher**: Codex
**Git Commit**: feef5a9b87dec6c0541ef4a3e64373de137d1602
**Branch**: work
**Repository**: Diamond

## Research Question

$research-codebase look: [Image #1]

## Scope

This research maps the current code behind the screen shown in Image #1: the authenticated admin `#payments`/Cobranças view, its route selection, UI template, list filtering, Supabase data flow, shared styling, bottom navigation, and related payment records. It includes the directly relevant SPA shell, router, admin charges module, shared CSS, Supabase configuration, RLS policy, Asaas edge function, and existing docs/specs. It does not run the app or modify implementation.

## Summary

The screenshot corresponds to the admin financial charges screen. The SPA routes `#payments` to `app.renderPayments()`, and for `profile.role === 'admin'` that method calls `adminCharges.render()` (`js/app.js:264`, `js/app.js:274`, `js/app.js:603`, `js/app.js:604`). `adminCharges.render()` injects the `FINANCEIRO` page with the Diamond X logo, add-charge button, refresh button, search input, status filters, and an `#admin-charges-list` container (`js/pages/admin/charges.js:5`, `js/pages/admin/charges.js:8`, `js/pages/admin/charges.js:11`, `js/pages/admin/charges.js:13`, `js/pages/admin/charges.js:14`, `js/pages/admin/charges.js:17`, `js/pages/admin/charges.js:24`, `js/pages/admin/charges.js:27`, `js/pages/admin/charges.js:34`).

The cards visible in the screenshot are rendered from `student_plans` joined with `users` and `plans`, ordered by `created_at` descending (`js/pages/admin/charges.js:122`, `js/pages/admin/charges.js:125`, `js/pages/admin/charges.js:126`, `js/pages/admin/charges.js:127`, `js/pages/admin/charges.js:131`, `js/pages/admin/charges.js:132`, `js/pages/admin/charges.js:134`). Each card displays student name, plan name or `Cobrança Avulsa`, localized date, status badge, price, and a vertical-dots icon (`js/pages/admin/charges.js:152`, `js/pages/admin/charges.js:153`, `js/pages/admin/charges.js:154`, `js/pages/admin/charges.js:157`, `js/pages/admin/charges.js:161`, `js/pages/admin/charges.js:162`, `js/pages/admin/charges.js:164`, `js/pages/admin/charges.js:167`, `js/pages/admin/charges.js:168`).

## Detailed Findings

### App Shell And Route

- `index.html` defines a static SPA shell with `main#main-content` for route content, `nav#bottom-nav` for authenticated navigation, and `#toasts-container` (`index.html:39`, `index.html:41`, `index.html:47`, `index.html:51`).
- The document loads reset, variables, components, and page CSS before the JS modules (`index.html:33`, `index.html:34`, `index.html:35`, `index.html:36`, `index.html:73`, `index.html:74`, `index.html:75`).
- The app imports `adminCharges` from `./pages/admin/charges.js` and `responsiblePayments` from `./pages/responsible/payments.js` (`js/app.js:8`, `js/app.js:17`).
- `app.render()` dispatches `#payments` to `this.renderPayments()` (`js/app.js:264`, `js/app.js:274`).
- `renderPayments()` selects `adminCharges.render()` for admin users and `responsiblePayments.render()` for all non-admin users (`js/app.js:603`, `js/app.js:604`, `js/app.js:605`).
- Admin bottom navigation contains `#payments` with the receipt icon and label `Cobranças`, matching the active tab in the screenshot (`js/app.js:907`, `js/app.js:912`, `js/app.js:929`, `js/app.js:930`, `js/app.js:931`, `js/app.js:932`).

### Admin Charges Header And Controls

- `adminCharges.render()` replaces `#main-content` with a `.page-container` holding a `.page-header` (`js/pages/admin/charges.js:6`, `js/pages/admin/charges.js:7`, `js/pages/admin/charges.js:8`, `js/pages/admin/charges.js:9`, `js/pages/admin/charges.js:10`).
- The page title is literal `FINANCEIRO` and uses `var(--font-brand)` inline, which resolves to the local Abnes font (`js/pages/admin/charges.js:11`, `css/variables.css:2`, `css/variables.css:4`, `css/variables.css:76`).
- The header's right side contains `/base_icon_transparent_background.png`, an add-charge button using `ph-plus-circle`, and a refresh button using `ph-arrows-clockwise` (`js/pages/admin/charges.js:12`, `js/pages/admin/charges.js:13`, `js/pages/admin/charges.js:14`, `js/pages/admin/charges.js:15`, `js/pages/admin/charges.js:17`, `js/pages/admin/charges.js:18`).
- The search input is `#search-charge-input` with placeholder `Buscar por nome do aluno...` (`js/pages/admin/charges.js:23`, `js/pages/admin/charges.js:24`).
- The status filters are inline buttons with `data-status` values `all`, `pending_payment`, `active`, and `expired`, labeled `Todas`, `Pendentes`, `Pagas`, and `Vencidas` (`js/pages/admin/charges.js:27`, `js/pages/admin/charges.js:28`, `js/pages/admin/charges.js:29`, `js/pages/admin/charges.js:30`, `js/pages/admin/charges.js:31`).
- After rendering the shell, the module calls `loadCharges()`, `setupFilters()`, `setupSearch()`, and attaches click listeners for refresh and add-charge actions (`js/pages/admin/charges.js:40`, `js/pages/admin/charges.js:41`, `js/pages/admin/charges.js:42`, `js/pages/admin/charges.js:43`, `js/pages/admin/charges.js:44`).

### Data Loading And Card Rendering

- `loadCharges(statusFilter = 'all')` reads `#admin-charges-list` and builds a Supabase query against `student_plans` (`js/pages/admin/charges.js:122`, `js/pages/admin/charges.js:123`, `js/pages/admin/charges.js:125`, `js/pages/admin/charges.js:126`).
- The select includes `id`, `status`, `created_at`, `student:users!student_id(full_name)`, and `plan:plans(name, price)` (`js/pages/admin/charges.js:127`, `js/pages/admin/charges.js:128`, `js/pages/admin/charges.js:129`, `js/pages/admin/charges.js:130`, `js/pages/admin/charges.js:131`, `js/pages/admin/charges.js:132`).
- The query orders by `created_at` descending and optionally applies `.eq('status', statusFilter)` when a filter other than `all` is selected (`js/pages/admin/charges.js:134`, `js/pages/admin/charges.js:136`, `js/pages/admin/charges.js:137`).
- On query error the list displays `Erro ao carregar dados.`; on empty results it displays `Nenhuma cobrança encontrada.` (`js/pages/admin/charges.js:140`, `js/pages/admin/charges.js:142`, `js/pages/admin/charges.js:143`, `js/pages/admin/charges.js:147`, `js/pages/admin/charges.js:148`).
- For non-empty results, the module formats `created_at` with `toLocaleDateString('pt-BR')`, derives badge label/class, and maps each charge into a `.card.charge-item-card` (`js/pages/admin/charges.js:152`, `js/pages/admin/charges.js:153`, `js/pages/admin/charges.js:154`, `js/pages/admin/charges.js:155`, `js/pages/admin/charges.js:157`, `js/pages/admin/charges.js:158`).
- The rendered card uses `charge.student?.full_name || 'Aluno Removido'`, `charge.plan?.name || 'Cobrança Avulsa'`, and `charge.plan?.price || 0` (`js/pages/admin/charges.js:161`, `js/pages/admin/charges.js:162`, `js/pages/admin/charges.js:167`).
- After card injection, `setupActionEvents(charges)` attaches click handlers to each `.charge-item-card`, finds the matching charge by `data-id`, and opens charge actions (`js/pages/admin/charges.js:174`, `js/pages/admin/charges.js:177`, `js/pages/admin/charges.js:178`, `js/pages/admin/charges.js:179`, `js/pages/admin/charges.js:180`, `js/pages/admin/charges.js:181`, `js/pages/admin/charges.js:182`).

### Search, Filters, And Actions

- `setupSearch()` attaches an `input` listener to `#search-charge-input`, lowercases the entered term, reads all `.charge-item-card` elements, and toggles each card's display based on the first `p` text inside the card (`js/pages/admin/charges.js:47`, `js/pages/admin/charges.js:48`, `js/pages/admin/charges.js:49`, `js/pages/admin/charges.js:50`, `js/pages/admin/charges.js:51`, `js/pages/admin/charges.js:52`, `js/pages/admin/charges.js:53`, `js/pages/admin/charges.js:54`).
- `setupFilters()` attaches click handlers to `.filter-btn`; clicking removes the active class from all filters, activates the clicked filter, and calls `loadCharges(btn.dataset.status)` (`js/pages/admin/charges.js:243`, `js/pages/admin/charges.js:244`, `js/pages/admin/charges.js:245`, `js/pages/admin/charges.js:246`, `js/pages/admin/charges.js:247`, `js/pages/admin/charges.js:248`, `js/pages/admin/charges.js:249`).
- `getStatusLabel()` maps `active` to `PAGO`, `pending_payment` to `PENDENTE`, `expired` to `VENCIDO`, and `cancelled` to `CANCELADA` (`js/pages/admin/charges.js:233`, `js/pages/admin/charges.js:234`, `js/pages/admin/charges.js:235`).
- `getStatusClass()` maps those statuses to shared badge classes `badge-active`, `badge-pending`, `badge-overdue`, and `badge-cancelled` (`js/pages/admin/charges.js:238`, `js/pages/admin/charges.js:239`, `js/pages/admin/charges.js:240`).
- `showChargeActions()` opens a bottom sheet titled `Gerenciar Cobrança` with details, a conditional `CONFIRMAR PAGAMENTO MANUAL` button for `pending_payment`, and a `CANCELAR COBRANÇA` button (`js/pages/admin/charges.js:187`, `js/pages/admin/charges.js:188`, `js/pages/admin/charges.js:190`, `js/pages/admin/charges.js:191`, `js/pages/admin/charges.js:192`, `js/pages/admin/charges.js:193`, `js/pages/admin/charges.js:196`, `js/pages/admin/charges.js:197`, `js/pages/admin/charges.js:202`, `js/pages/admin/charges.js:208`).
- Confirming payment updates `student_plans.status` to `active`, shows `Pagamento confirmado!`, removes the sheet after a closing animation, and reloads charges (`js/pages/admin/charges.js:212`, `js/pages/admin/charges.js:213`, `js/pages/admin/charges.js:216`, `js/pages/admin/charges.js:217`, `js/pages/admin/charges.js:218`).
- Canceling updates `student_plans.status` to `cancelled`, shows `Cobrança cancelada.`, removes the sheet after a closing animation, and reloads charges (`js/pages/admin/charges.js:222`, `js/pages/admin/charges.js:223`, `js/pages/admin/charges.js:226`, `js/pages/admin/charges.js:227`, `js/pages/admin/charges.js:228`).

### Manual Charge Flow

- Clicking the add-charge button calls `showAddChargeForm()` (`js/pages/admin/charges.js:44`, `js/pages/admin/charges.js:59`).
- The method shows `Carregando alunos...`, queries `users` for `id`, `full_name`, and `email`, filters role `student`, and orders by `full_name` (`js/pages/admin/charges.js:60`, `js/pages/admin/charges.js:61`, `js/pages/admin/charges.js:62`, `js/pages/admin/charges.js:63`, `js/pages/admin/charges.js:64`, `js/pages/admin/charges.js:65`).
- The bottom-sheet form includes student selection, description, price, and initial payment method options `PIX`, `Boleto`, and `Cartão` (`js/pages/admin/charges.js:67`, `js/pages/admin/charges.js:68`, `js/pages/admin/charges.js:70`, `js/pages/admin/charges.js:71`, `js/pages/admin/charges.js:77`, `js/pages/admin/charges.js:78`, `js/pages/admin/charges.js:82`, `js/pages/admin/charges.js:83`, `js/pages/admin/charges.js:86`, `js/pages/admin/charges.js:87`, `js/pages/admin/charges.js:88`, `js/pages/admin/charges.js:89`, `js/pages/admin/charges.js:90`).
- On submit, the handler gets the current admin id from Supabase auth and inserts into `student_plans` with `student_id`, `purchased_by`, and `status: 'pending_payment'` (`js/pages/admin/charges.js:101`, `js/pages/admin/charges.js:102`, `js/pages/admin/charges.js:107`, `js/pages/admin/charges.js:108`, `js/pages/admin/charges.js:109`, `js/pages/admin/charges.js:110`).
- A successful insert shows `Cobrança manual registrada!` and reloads the charge list (`js/pages/admin/charges.js:116`, `js/pages/admin/charges.js:117`, `js/pages/admin/charges.js:118`).

### Styling And Mobile Layout

- The body uses `var(--dx-bg)`, `var(--dx-text)`, Montserrat body font, full viewport height/width, and `overflow: hidden`, while `#main-content` is the scrollable container (`css/reset.css:12`, `css/reset.css:13`, `css/reset.css:14`, `css/reset.css:15`, `css/reset.css:18`, `css/reset.css:19`, `css/reset.css:20`, `css/reset.css:30`, `css/reset.css:32`).
- `#main-content` adds top safe-area padding and bottom padding based on `--nav-height`, `40px`, and `env(safe-area-inset-bottom)` (`css/reset.css:35`, `css/reset.css:38`, `css/reset.css:40`, `css/reset.css:41`).
- `.page-container` gives horizontal padding only (`css/reset.css:44`, `css/reset.css:45`).
- Shared `.card` styling sets surface background, border, 12px radius, and `12px 14px` padding; `.input-control` sets the dark input surface, border, radius, padding, and text color (`css/components.css:27`, `css/components.css:28`, `css/components.css:29`, `css/components.css:30`, `css/components.css:31`, `css/components.css:51`, `css/components.css:52`, `css/components.css:53`, `css/components.css:54`, `css/components.css:55`, `css/components.css:56`).
- `.badge` uses pill radius, 11px font size, and inline-flex display; `.badge-pending` uses the pending color variables that match the yellow `PENDENTE` badges in the screenshot (`css/components.css:64`, `css/components.css:65`, `css/components.css:66`, `css/components.css:67`, `css/components.css:68`, `css/components.css:70`, `css/components.css:74`, `css/variables.css:68`, `css/variables.css:69`).
- `#bottom-nav` is fixed at the viewport bottom, spans full width, uses the surface background, includes safe-area padding, and has height `calc(65px + env(safe-area-inset-bottom))` (`css/components.css:78`, `css/components.css:79`, `css/components.css:80`, `css/components.css:81`, `css/components.css:83`, `css/components.css:84`, `css/components.css:88`, `css/components.css:90`).
- `.nav-item.active` uses `var(--dx-teal)`, matching the active Cobranças tab color in the screenshot (`css/components.css:93`, `css/components.css:100`, `css/components.css:107`, `css/components.css:108`).
- `.page-header` lays out the title and right-side controls with flex, `space-between`, `16px` gap, and `min-height: 56px`; `.page-header-logo` is `72px` by `52px` with `object-fit: contain` (`css/components.css:128`, `css/components.css:129`, `css/components.css:130`, `css/components.css:131`, `css/components.css:132`, `css/components.css:133`, `css/components.css:134`, `css/components.css:155`, `css/components.css:156`, `css/components.css:157`, `css/components.css:159`).

### Related Payment Data Paths

- Student plan purchase creates a `student_plans` record with `student_id`, `plan_id`, `purchased_by`, and `status: 'pending_payment'` (`js/pages/student/plans.js:116`, `js/pages/student/plans.js:117`, `js/pages/student/plans.js:128`, `js/pages/student/plans.js:129`, `js/pages/student/plans.js:130`, `js/pages/student/plans.js:131`, `js/pages/student/plans.js:132`, `js/pages/student/plans.js:133`).
- Responsible/business plan purchase lets the user choose a beneficiary and payment method, checks for an active plan, inserts `student_plans` with `pending_payment`, then routes to `#payments` after a timeout (`js/pages/responsible/plans.js:126`, `js/pages/responsible/plans.js:135`, `js/pages/responsible/plans.js:147`, `js/pages/responsible/plans.js:149`, `js/pages/responsible/plans.js:156`, `js/pages/responsible/plans.js:161`, `js/pages/responsible/plans.js:162`, `js/pages/responsible/plans.js:163`, `js/pages/responsible/plans.js:164`, `js/pages/responsible/plans.js:165`, `js/pages/responsible/plans.js:173`, `js/pages/responsible/plans.js:174`).
- Non-admin `#payments` renders `responsiblePayments`, which queries `student_plans` by `purchased_by = current user`, joins plans and students, and shows `FATURAS E PAGAMENTOS` rather than the admin `FINANCEIRO` screen (`js/pages/responsible/payments.js:4`, `js/pages/responsible/payments.js:7`, `js/pages/responsible/payments.js:8`, `js/pages/responsible/payments.js:9`, `js/pages/responsible/payments.js:20`, `js/pages/responsible/payments.js:22`, `js/pages/responsible/payments.js:24`, `js/pages/responsible/payments.js:25`, `js/pages/responsible/payments.js:30`, `js/pages/responsible/payments.js:31`, `js/pages/responsible/payments.js:33`).
- `migrations/002_rls_security.sql` enables RLS on `student_plans`; its select policy allows records where `student_id = auth.uid()`, `purchased_by = auth.uid()`, or the current user is admin (`migrations/002_rls_security.sql:15`, `migrations/002_rls_security.sql:17`, `migrations/002_rls_security.sql:86`, `migrations/002_rls_security.sql:90`, `migrations/002_rls_security.sql:94`, `migrations/002_rls_security.sql:97`, `migrations/002_rls_security.sql:98`, `migrations/002_rls_security.sql:99`, `migrations/002_rls_security.sql:100`).
- The same migration permits `student_plans` updates only for admin users (`migrations/002_rls_security.sql:114`, `migrations/002_rls_security.sql:115`, `migrations/002_rls_security.sql:116`, `migrations/002_rls_security.sql:117`, `migrations/002_rls_security.sql:118`, `migrations/002_rls_security.sql:119`).
- A Supabase Edge Function for Asaas checkout exists at `supabase/functions/asaas-checkout/index.ts`; it reads `planId`, `studentId`, `paymentMethod`, and `installments`, creates/fetches an Asaas customer, posts to `/payments`, and inserts a `student_plans` record with `asaas_payment_id` (`supabase/functions/asaas-checkout/index.ts:1`, `supabase/functions/asaas-checkout/index.ts:4`, `supabase/functions/asaas-checkout/index.ts:21`, `supabase/functions/asaas-checkout/index.ts:24`, `supabase/functions/asaas-checkout/index.ts:25`, `supabase/functions/asaas-checkout/index.ts:32`, `supabase/functions/asaas-checkout/index.ts:48`, `supabase/functions/asaas-checkout/index.ts:52`, `supabase/functions/asaas-checkout/index.ts:53`, `supabase/functions/asaas-checkout/index.ts:64`, `supabase/functions/asaas-checkout/index.ts:65`, `supabase/functions/asaas-checkout/index.ts:70`).
- The local `js/asaas.js` file exists but is empty; `wc -c js/asaas.js` returned `0`.

## Code References

- `index.html:39` - SPA app shell starts.
- `index.html:41` - `#main-content` receives page HTML.
- `index.html:47` - `#bottom-nav` exists outside route content.
- `js/app.js:8` - Admin charges module import.
- `js/app.js:274` - `#payments` route dispatch.
- `js/app.js:603` - Role-aware payment renderer starts.
- `js/app.js:604` - Admin `#payments` renders `adminCharges`.
- `js/app.js:912` - Admin nav label `Cobranças`.
- `js/pages/admin/charges.js:5` - Admin charges module starts.
- `js/pages/admin/charges.js:11` - `FINANCEIRO` title.
- `js/pages/admin/charges.js:24` - Search input from the screenshot.
- `js/pages/admin/charges.js:28` - `Todas` status filter.
- `js/pages/admin/charges.js:122` - Charge loading starts.
- `js/pages/admin/charges.js:126` - Data source is `student_plans`.
- `js/pages/admin/charges.js:131` - Student join by `student_id`.
- `js/pages/admin/charges.js:132` - Plan join for name and price.
- `js/pages/admin/charges.js:158` - Charge card markup starts.
- `js/pages/admin/charges.js:161` - Student name display.
- `js/pages/admin/charges.js:164` - Status badge display.
- `js/pages/admin/charges.js:167` - Price display.
- `js/pages/admin/charges.js:234` - Status labels.
- `css/reset.css:30` - Main content scroll container starts.
- `css/reset.css:41` - Bottom padding for nav/safe area.
- `css/components.css:27` - Shared card styling.
- `css/components.css:74` - Pending badge styling.
- `css/components.css:79` - Fixed bottom nav starts.
- `css/components.css:129` - Shared page header layout.
- `css/variables.css:52` - Teal token used across controls.
- `css/variables.css:68` - Pending badge text color.
- `migrations/002_rls_security.sql:94` - `student_plans` select policy starts.
- `supabase/functions/asaas-checkout/index.ts:48` - Edge function Asaas payment creation starts.

## Architecture Documentation

Diamond is a vanilla JavaScript SPA/PWA using hash routes and direct Supabase client calls from browser modules. `index.html` provides the app shell and loads global CSS, CDN libraries, and ES modules. `js/app.js` owns authentication-aware routing and role-based navigation. Admin, student, and responsible/business screens live in separate files under `js/pages/`, but they all inject HTML strings into `#main-content`.

The admin financial screen is implemented entirely in `js/pages/admin/charges.js`. The module owns template rendering, Supabase reads/writes, client-side text search, status filter event handling, and bottom-sheet actions. The data model behind this view is `student_plans`, with joins to `users` for student names and `plans` for plan names/prices. Shared appearance comes from `css/reset.css`, `css/variables.css`, and `css/components.css`, while several layout and typography details in the charges screen remain inline in the JavaScript template.

## Historical Context

The original project spec defines `student_plans` with `student_id`, `plan_id`, `purchased_by`, `status`, `asaas_payment_id`, `installments`, and timestamps (`spec (1).md:118`, `spec (1).md:121`, `spec (1).md:122`, `spec (1).md:123`, `spec (1).md:124`, `spec (1).md:127`, `spec (1).md:128`, `spec (1).md:129`, `spec (1).md:130`). It also describes admin charge management as listing all charges by status, filtering, manual charge creation, payment link/PIX/boleto viewing, and cancellation (`spec (1).md:193`, `spec (1).md:194`, `spec (1).md:195`, `spec (1).md:196`, `spec (1).md:197`, `spec (1).md:198`).

The same spec states that manual charges can be created with custom value and description, and that Asaas payment creation should save `asaas_payment_id` in `student_plans` (`spec (1).md:285`, `spec (1).md:288`, `spec (1).md:310`, `spec (1).md:313`, `spec (1).md:320`). `spec-alteracoes-diamond-x.md` separately calls out Slide 5 / Financeiro for Abnes font and larger non-distorted logo (`spec-alteracoes-diamond-x.md:71`, `spec-alteracoes-diamond-x.md:72`, `spec-alteracoes-diamond-x.md:73`).

Existing research from May 3 already identified `adminCharges.render()` as the Financeiro screen and documented that the list uses `student_plans` joined to `users` and `plans` (`docs/research/2026-05-03-spec-alteracoes-analysis.md:145`, `docs/research/2026-05-03-spec-alteracoes-analysis.md:146`, `docs/research/2026-05-03-spec-alteracoes-analysis.md:149`, `docs/research/2026-05-03-spec-alteracoes-analysis.md:150`, `docs/research/2026-05-03-spec-alteracoes-analysis.md:180`).

## Related Research

- `docs/research/2026-05-03-spec-alteracoes-analysis.md` - Broader architecture and spec comparison, including the Financeiro screen.
- `docs/research/2026-05-04-tc001-register-role-based-area.md` - Documents role-based routing and navigation.
- `docs/research/2026-05-05-profile-logout-bottom-nav-overlap.md` - Documents the same shell and fixed bottom navigation behavior.

## Follow-up Research 2026-05-05T10:10:11-03:00

Research question: "Na imagem o título da página "Financeiro" está ficando atrás ou acima da logo. Nesse caso a logo pode ocultar caso aconteça isso. Correto?"

The current code places the `FINANCEIRO` title and the right-side header actions in the same `.page-header` flex row. The title is the first child, and the second child is a right-side `<div>` containing the logo image, add button, and refresh button (`js/pages/admin/charges.js:10`, `js/pages/admin/charges.js:11`, `js/pages/admin/charges.js:12`, `js/pages/admin/charges.js:13`, `js/pages/admin/charges.js:14`, `js/pages/admin/charges.js:17`).

The shared header style uses `display: flex`, `align-items: center`, `justify-content: space-between`, and `gap: 16px` (`css/components.css:128`, `css/components.css:129`, `css/components.css:130`, `css/components.css:131`, `css/components.css:132`, `css/components.css:133`). The right-side header container is explicitly prevented from shrinking with `.page-header > div:last-child { flex-shrink: 0; }` (`css/components.css:143`, `css/components.css:144`).

The title is allowed to shrink because `.page-header h1` is matched by the `min-width: 0` rule (`css/components.css:138`, `css/components.css:139`, `css/components.css:140`). Its text also keeps normal word breaking and does not define clipping or ellipsis (`css/components.css:147`, `css/components.css:148`, `css/components.css:149`, `css/components.css:150`, `css/components.css:151`, `css/components.css:152`). On small screens, the CSS reduces page-header titles to `clamp(17px, 4.5vw, 20px)` (`css/components.css:207`, `css/components.css:208`, `css/components.css:209`), but it still keeps the title in the same row as the fixed-width right-side controls.

The logo itself is fixed at `72px` by `52px`, uses `object-fit: contain`, and also does not shrink (`css/components.css:155`, `css/components.css:156`, `css/components.css:157`, `css/components.css:159`, `css/components.css:162`). For screens up to `380px`, it reduces to `64px` by `46px` (`css/components.css:191`, `css/components.css:196`, `css/components.css:197`, `css/components.css:198`).

Factual answer from the current implementation: yes, if the title text and the right-side controls need more horizontal space than the `.page-header` has, the right-side group, including the logo, can occupy the same horizontal area as the title. Because the right-side group appears after the title in the DOM and is not configured to shrink, it is the element that remains visually present in that constrained layout (`js/pages/admin/charges.js:11`, `js/pages/admin/charges.js:12`, `css/components.css:143`, `css/components.css:144`, `css/components.css:155`, `css/components.css:162`).

## Open Questions

- The screenshot itself shows concrete charge data, but this research did not query the live Supabase database, so the exact source rows for `Lucas Silva` and `Ricardo Persegona Mendes` were not verified at the database level.
- No browser run or visual measurement was captured in this research, so pixel-perfect correspondence between Image #1 and the current local render was not measured.
