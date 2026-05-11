# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

Diamond X é uma PWA mobile-first de gestão de treinos. Frontend é uma SPA pura em HTML/CSS/JS (ES Modules, sem framework, sem build). Backend é Supabase (Auth, Postgres com RLS, Edge Functions em Deno). Pagamentos via Asaas.

## Comandos

Servir a SPA localmente (qualquer servidor estático na raiz):

```bash
python3 -m http.server 8080
# ou
npx serve .
```

Edge Functions (Deno, via Supabase CLI):

```bash
supabase functions deploy admin-update-user
supabase functions deploy asaas-checkout
supabase functions serve <name>   # local
```

Migrations: aplicar manualmente os arquivos em `migrations/` na ordem numérica (001 → 004) no projeto Supabase.

Não há build, lint, nem suíte de testes configurados (`package.json` só declara `"type": "module"`). Testsprite tem artefatos em `testsprite_tests/` mas não há scripts npm.

## Arquitetura

### Bootstrap e roteamento (`js/app.js`)

- App é um objeto singleton (`app`) com `init()` chamado na carga. Não há framework de rotas — roteamento é por `window.location.hash` + listener `hashchange`.
- `app.render()` é o dispatcher central: lê hash, aplica gates de auth e RBAC, anima transição (`page-exit`/`page-enter`) e chama o renderer da página. Toda página nova deve ser registrada aqui no `switch (hash)` e ter sua rota adicionada às listas de gates (`publicRoutes`, `adminRoutes`, `responsibleRoutes`) quando aplicável.
- `app.user` e `app.profile` são o estado global. `loadProfile()` carrega de `users` table; o fallback usa `user_metadata.role` quando o registro ainda não existe.
- Fluxo de recovery de senha é tratado de forma especial: `isRecoveryRedirect()` detecta credenciais em hash/query (code, token_hash, ou access_token+refresh_token) e força rota `#update-password` antes de qualquer outro routing.

### Auth e RBAC

- `js/auth.js` encapsula `supabase.auth` (login/register/logout/resetPassword) e expõe `toast` (helper de notificação inline-styled).
- Papéis: `student`, `responsible`, `businessman`, `admin`. RBAC é dupla camada — checagem no `render()` do app + políticas RLS em `migrations/002_rls_security.sql`. Mudanças de papel exigem ajuste em ambos.
- `migrations/004_auth_users_profile_trigger.sql` cria registro em `users` automaticamente após signup; manter esse trigger ao adicionar campos.

### Páginas

- `js/pages/{admin,responsible,student}/<page>.js` — cada arquivo exporta um objeto com método `render()` que injeta HTML em `app.mainContent` e fixa listeners. Sem virtual DOM; rebind manual a cada render.
- Funcionalidades transversais: `js/calendar.js` (calendário), `js/trainingReservations.js` (reservas), `js/qrcode.js` (check-in via `html5-qrcode` CDN), `js/asaas.js` (chamadas para Edge Function de checkout), `js/ui.js` (helpers de DOM, `escapeHtml`, `safeUrl`).

### Supabase client

- `js/supabase.js` consome o SDK carregado via CDN (`window.supabase` em `index.html`) e expõe um cliente único. URL e anon key estão hardcoded — mudanças de ambiente exigem editar esse arquivo.

### Edge Functions

- `supabase/functions/admin-update-user/` — operações privilegiadas em `auth.users` (precisa do service_role key como secret).
- `supabase/functions/asaas-checkout/` — cria checkout no Asaas (secrets do Asaas como variáveis no Supabase).
- Deno + `esm.sh` (lockado em `deno.lock`).

### PWA

- `service-worker.js` gerencia cache offline; `manifest.json` declara o app instalável. Ao adicionar assets críticos, atualizar a lista de cache no SW.
- `index.html` é o shell — todos os scripts são `type="module"`. Dependências externas (Supabase JS, qrcodejs, html5-qrcode, Phosphor icons) vêm de CDN nas tags `<script>`/`<link>` do shell.

### CSS

- Modular em ordem fixa de import no `index.html`: `reset.css` → `variables.css` (tokens `--dx-*` + `@font-face` Montserrat local) → `components.css` → `pages.css`. Tokens de cor (`--dx-teal`, `--dx-bg`, `--dx-muted`, `--dx-danger`) são usados em estilos inline no JS.

## Convenções importantes

- Adicionar uma página: criar `js/pages/<role>/<name>.js` exportando `{ render }`, importar em `app.js`, adicionar `case` no `switch` do `render()`, e — se for restrita — incluir em `adminRoutes`/`responsibleRoutes`.
- Mudanças de schema: novo arquivo em `migrations/` com prefixo numérico sequencial; atualizar políticas RLS no mesmo PR se a tabela for sensível.
- Toda string vinda de dados é renderizada via template literals — usar `escapeHtml`/`safeUrl` de `js/ui.js` para evitar XSS.
- Não há bundler: `import` paths devem ser relativos e completos (`./foo.js`), navegador resolve direto.
