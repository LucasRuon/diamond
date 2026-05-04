---
date: 2026-05-04
researcher: claude
research_question: "Como funciona o fluxo de cadastro de novos usuários referenciado pelo teste TC005?"
status: complete
test_reference: testsprite_tests/TC005_Register_a_new_account_and_enter_the_correct_area.py
---

# Pesquisa: Fluxo de Cadastro (TC005)

## Sumário

O cadastro é uma SPA hash-routed: a tela de login renderizada em [js/app.js](../../js/app.js) expõe um link `#register` que dispara `renderRegister()`. O formulário coleta nome, e-mail, CPF, telefone, role e senha; valida CPF localmente; e chama `auth.register()` que invoca `supabase.auth.signUp` armazenando `full_name`, `role`, `cpf` e `phone` em `user_metadata`.

**Divergência crítica com o TC005:** após o signUp, o app exibe toast `"Conta criada! Por favor, faça login."` e redireciona para `#login` ([js/app.js:534-535](../../js/app.js#L534-L535)). O TC005 espera ver `"Sair"` (indicador autenticado) imediatamente após submeter o cadastro — esse indicador só aparece após o login subsequente, em telas autenticadas como `#profile` ([js/app.js:679](../../js/app.js#L679)).

## Detalhamento

### 1. Entrada: tela de login e link "Cadastre-se"

- [index.html](../../index.html) — shell SPA com `#app` > `#main-content` ([index.html:39-45](../../index.html#L39-L45))
- Link Cadastre-se renderizado dinamicamente em [js/app.js:283](../../js/app.js#L283):
  ```html
  <a href="#register" style="color: var(--dx-teal); font-weight: 600;">Cadastre-se</a>
  ```

### 2. Tela de cadastro

`renderRegister()` em [js/app.js:482-544](../../js/app.js#L482-L544) injeta o formulário `#register-form`:

| Campo | ID | Linha |
|---|---|---|
| Nome completo | `reg-name` | [488](../../js/app.js#L488) |
| E-mail | `reg-email` | [489](../../js/app.js#L489) |
| CPF | `reg-cpf` | [491](../../js/app.js#L491) |
| Telefone | `reg-phone` | [492](../../js/app.js#L492) |
| Role (`student`/`responsible`/`businessman`) | `reg-role` | [494](../../js/app.js#L494) |
| Senha (minlength=6) | `reg-password` | [495](../../js/app.js#L495) |
| Botão CADASTRAR | `<button type="submit">` | [496](../../js/app.js#L496) |

### 3. Máscaras e validações

[js/ui.js](../../js/ui.js):
- `ui.mask.cpf` — [ui.js:76-82](../../js/ui.js#L76-L82)
- `ui.mask.phone` — [ui.js:84-89](../../js/ui.js#L84-L89)
- `ui.validate.cpf` — [ui.js:98-112](../../js/ui.js#L98-L112) — rejeita comprimento ≠ 11, dígitos repetidos (`/^(\d)\1{10}$/`), e calcula os dois dígitos verificadores

O CPF do teste `111.444.777-35` é matematicamente válido pela rotina dos dígitos verificadores.

### 4. Handler do submit

[js/app.js:506-543](../../js/app.js#L506-L543):
1. `e.preventDefault()` ([507](../../js/app.js#L507))
2. Valida CPF — `if (!ui.validate.cpf(cpf)) throw new Error('CPF Inválido. Por favor, verifique.')` ([512-515](../../js/app.js#L512-L515))
3. Monta `metadata = { full_name, role, cpf, phone }` ([517-527](../../js/app.js#L517-L527))
4. `await auth.register(email, password, metadata)` ([531](../../js/app.js#L531))
5. `toast.show('Conta criada! Por favor, faça login.')` + `window.location.hash = '#login'` ([534-535](../../js/app.js#L534-L535))

### 5. Camada auth → Supabase

[js/auth.js:14-30](../../js/auth.js#L14-L30):
```js
async register(email, password, metadata) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: metadata }
  });
  if (error) throw error;
  return data;
}
```

Cliente Supabase: [js/supabase.js:1-15](../../js/supabase.js) — `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`.

### 6. Roteamento por role e indicador autenticado

- Guarda de rotas públicas: usuário autenticado em `#login`/`#register` é redirecionado para `#dashboard` — [js/app.js:207-209](../../js/app.js#L207-L209)
- `renderDashboard()` faz fanout por role — [js/app.js:546-555](../../js/app.js#L546-L555):
  - `admin` → `adminDashboard.render()`
  - `responsible`/`businessman` → `responsibleDashboard.render()`
  - default (`student`/atleta) → `studentDashboard.render()`
- Botão "SAIR DA CONTA" — [js/app.js:679](../../js/app.js#L679) (na tela `#profile`)
- Bottom-nav exibida apenas para autenticados fora de rotas públicas — [js/app.js:850-891](../../js/app.js#L850-L891)

### 7. Banco de dados

- [migrations/001_add_athlete_anamnese_fields.sql](../../migrations/001_add_athlete_anamnese_fields.sql) — adiciona `birth_date`, `current_club`, `weight_kg`, `height_cm`, `athlete_record_url` na tabela `users`
- [migrations/002](../../migrations/) — enum `user_role` (`student`/`responsible`/`businessman`/`admin`), RLS ativado, política UPDATE bloqueia mutação de `role` via cliente (anti-escalação de privilégio)
- `user_metadata` (JSONB) do Supabase Auth carrega `full_name`, `role`, `cpf`, `phone` enviados no signUp

### 8. Estrutura `js/`

```
js/
├── supabase.js          # cliente
├── auth.js              # login/register/logout
├── ui.js                # máscaras, validações, toast, bottomSheet
├── app.js               # SPA + render de login/register/dashboard/profile
├── asaas.js             # pagamentos
├── calendar.js, qrcode.js, trainingReservations.js
└── pages/
    ├── student/   (dashboard, trainings, plans, attendance)
    ├── admin/     (dashboard, users, trainings, plans, charges, reports)
    └── responsible/ (dashboard, students, trainings, plans, payments)
```

## Mapeamento TC005 → Código

| Passo do teste | Local no código |
|---|---|
| `goto("http://localhost:3000")` | [index.html](../../index.html) + bootstrap em [js/app.js](../../js/app.js) |
| Click `Cadastre-se` (xpath login form) | [js/app.js:283](../../js/app.js#L283) |
| Fill `reg-name` | [js/app.js:488](../../js/app.js#L488) |
| Fill `reg-email` | [js/app.js:489](../../js/app.js#L489) |
| Fill `reg-cpf` | [js/app.js:491](../../js/app.js#L491) |
| Fill `reg-phone` | [js/app.js:492](../../js/app.js#L492) |
| Fill `reg-password` | [js/app.js:495](../../js/app.js#L495) |
| Submit `CADASTRAR` | [js/app.js:506-543](../../js/app.js#L506-L543) |
| Assert `Sair` visível | **Não satisfeito** — fluxo redireciona para `#login` em [js/app.js:535](../../js/app.js#L535); `Sair` aparece em [js/app.js:679](../../js/app.js#L679) (perfil autenticado) |

## Code References

- [js/app.js:283](../../js/app.js#L283) — link `Cadastre-se`
- [js/app.js:482-544](../../js/app.js#L482-L544) — `renderRegister()`
- [js/app.js:506-543](../../js/app.js#L506-L543) — handler submit cadastro
- [js/app.js:534-535](../../js/app.js#L534-L535) — toast + redirect pós-signUp para `#login`
- [js/app.js:546-555](../../js/app.js#L546-L555) — `renderDashboard()` fanout por role
- [js/app.js:679](../../js/app.js#L679) — botão "SAIR DA CONTA"
- [js/auth.js:14-30](../../js/auth.js#L14-L30) — `auth.register()` → `supabase.auth.signUp`
- [js/ui.js:76-89](../../js/ui.js#L76-L89) — máscaras CPF/telefone
- [js/ui.js:98-112](../../js/ui.js#L98-L112) — `ui.validate.cpf`
- [js/supabase.js:1-15](../../js/supabase.js) — cliente Supabase
- [migrations/001_add_athlete_anamnese_fields.sql](../../migrations/001_add_athlete_anamnese_fields.sql) — campos de atleta
- [migrations/002](../../migrations/) — enum `user_role` + RLS
