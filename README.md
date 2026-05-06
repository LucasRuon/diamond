# Diamond X

PWA mobile-first de gestão de treinos para o Diamond X Performance & Training Center. A aplicação atende três perfis (atleta, responsável/gestor e administrador) sobre uma única base Supabase, com check-in por QR Code, reservas de sessões de treino e integração financeira via Asaas.

## Stack

- **Frontend:** SPA em HTML + CSS + JavaScript (ES Modules), sem framework. PWA com `manifest.json` e `service-worker.js`.
- **Estilo:** CSS modular (`reset.css`, `variables.css`, `components.css`, `pages.css`), fontes Montserrat locais, ícones Phosphor.
- **Backend:** Supabase (Auth, Postgres com RLS, Edge Functions em Deno).
- **Pagamentos:** Asaas (checkout via Edge Function).

## Estrutura

```
.
├── index.html              # Shell da SPA
├── manifest.json           # Configuração PWA
├── service-worker.js       # Cache e offline
├── css/                    # Estilos globais e por página
├── js/
│   ├── app.js              # Bootstrap e roteamento
│   ├── auth.js             # Sessão e RBAC
│   ├── supabase.js         # Cliente Supabase
│   ├── asaas.js            # Integração de pagamentos
│   ├── calendar.js         # Calendário e sessões
│   ├── trainingReservations.js
│   ├── qrcode.js           # Check-in por QR Code
│   ├── ui.js               # Toasts e helpers de UI
│   └── pages/
│       ├── student/        # Telas do atleta
│       ├── responsible/    # Telas do responsável/gestor
│       └── admin/          # Telas administrativas
├── assets/                 # Ícones e mídia
├── migrations/             # Migrations SQL do Supabase
├── supabase/functions/     # Edge Functions (admin-update-user, asaas-checkout)
├── docs/                   # Documentação adicional
└── PRD.md                  # Product Requirements Document
```

## Perfis e funcionalidades

- **Atleta:** dashboard de plano, reserva e cancelamento de sessões, check-in por QR Code, histórico de presença, perfil e planos.
- **Responsável / Gestor:** visibilidade dos atletas vinculados, planos, presenças e pagamentos.
- **Administrador:** CRUD de usuários, sessões de treino, presenças manuais, planos, relatórios e financeiro.

O controle de acesso é aplicado tanto pelo roteamento quanto pelas políticas de RLS no Supabase.

## Como executar

A aplicação é estática. Sirva o diretório raiz com qualquer servidor HTTP:

```bash
# usando python
python3 -m http.server 8080

# ou com npx
npx serve .
```

Depois acesse `http://localhost:8080`.

## Configuração Supabase

1. Crie um projeto no Supabase.
2. Aplique as migrations em `migrations/` (na ordem numérica).
3. Faça o deploy das Edge Functions em `supabase/functions/`:
   ```bash
   supabase functions deploy admin-update-user
   supabase functions deploy asaas-checkout
   ```
4. Configure a URL e a anon key do projeto em `js/supabase.js`.
5. Defina os secrets necessários para o Asaas nas Edge Functions.

## Migrations

- `001_add_athlete_anamnese_fields.sql` — campos de anamnese do atleta.
- `002_rls_security.sql` — políticas de RLS por perfil.
- `003_training_reservations.sql` — tabela de reservas de treino.
- `004_auth_users_profile_trigger.sql` — trigger de criação de perfil ao registrar.

## Documentação

- `PRD.md` — requisitos de produto.
- `docs/` — notas de design e implementação.
- `Ajustes App Diamond X.md` e `spec-alteracoes-diamond-x.md` — ajustes e specs em andamento.
