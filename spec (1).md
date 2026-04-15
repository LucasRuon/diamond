# Diamond X — Especificação Técnica do Aplicativo

## 1. Visão Geral

**Nome do produto:** Diamond X  
**Tipo:** Progressive Web App (PWA) — mobile-first, instalável na tela inicial  
**Domínio:** Escola de futebol — treinamento e capacitação  
**Objetivo:** Plataforma para gestão de alunos, planos, frequência e cobranças da escola Diamond X  

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) — mobile-first PWA |
| Backend / Auth | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Pagamentos | Asaas API (boleto, cartão de crédito, PIX) |
| Frequência | QR Code gerado dinamicamente por sessão de treino |
| Hospedagem | Vercel / Netlify (sugestão) |
| Instalação mobile | PWA via manifest.json + Service Worker |

---

## 3. Arquitetura Geral

```
diamondx-app/
├── index.html               # Entry point / SPA shell
├── manifest.json            # PWA manifest
├── service-worker.js        # Cache e offline support
├── assets/
│   ├── icons/               # Ícones PWA (192x192, 512x512)
│   └── images/
├── css/
│   ├── reset.css
│   ├── variables.css        # Design tokens
│   ├── components.css
│   └── pages.css
├── js/
│   ├── app.js               # Router SPA
│   ├── auth.js              # Login / cadastro
│   ├── supabase.js          # Cliente Supabase
│   ├── asaas.js             # Integração Asaas
│   ├── qrcode.js            # Geração / leitura QR
│   └── pages/
│       ├── admin/
│       │   ├── dashboard.js
│       │   ├── users.js
│       │   ├── plans.js
│       │   ├── charges.js
│       │   └── trainings.js
│       ├── responsible/
│       │   ├── dashboard.js
│       │   ├── students.js
│       │   └── plans.js
│       └── student/
│           ├── dashboard.js
│           └── trainings.js
└── .env                     # Chaves de API (nunca comitadas)
```

---

## 4. Níveis de Usuário

### 4.1 Admin
Acesso total ao sistema. Gerencia a operação completa da escola.

### 4.2 Responsável
Pessoa física que contrata planos e gerencia um ou mais alunos vinculados a ela (ex: pai/mãe de alunos).

### 4.3 Aluno
Acesso limitado à visualização de seus próprios treinos, frequência e planos vinculados.

---

## 5. Banco de Dados (Supabase / PostgreSQL)

### Tabelas principais

#### `users`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | Gerado pelo Supabase Auth |
| full_name | TEXT | Nome completo |
| email | TEXT UNIQUE | Email de acesso |
| phone | TEXT | Telefone |
| role | ENUM | `admin`, `responsible`, `student` |
| cpf | TEXT | CPF (usado no Asaas) |
| birth_date | DATE | Data de nascimento |
| asaas_customer_id | TEXT | ID do cliente no Asaas |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `responsible_students`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| responsible_id | UUID FK → users | |
| student_id | UUID FK → users | |
| created_at | TIMESTAMP | |

#### `plans`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| name | TEXT | Ex: "Plano Mensal Basic" |
| description | TEXT | |
| price | DECIMAL(10,2) | Valor total |
| max_installments | INT | Máx. de parcelas permitidas (1 = à vista) |
| duration_days | INT | Validade do plano em dias |
| sessions_per_week | INT | Treinos por semana incluídos |
| allowed_payment_methods | TEXT[] | `["pix","boleto","credit_card"]` |
| active | BOOLEAN | Plano disponível para venda |
| created_at | TIMESTAMP | |

#### `student_plans`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| student_id | UUID FK → users | |
| plan_id | UUID FK → plans | |
| purchased_by | UUID FK → users | Responsável ou admin que comprou |
| start_date | DATE | |
| end_date | DATE | Calculado via duration_days |
| status | ENUM | `active`, `expired`, `pending_payment`, `cancelled` |
| asaas_payment_id | TEXT | ID do pagamento no Asaas |
| installments | INT | Número de parcelas escolhidas |
| created_at | TIMESTAMP | |

#### `training_sessions`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| title | TEXT | Ex: "Treino Técnico — Terça 19h" |
| description | TEXT | |
| scheduled_at | TIMESTAMP | Data e hora do treino |
| location | TEXT | Local / campo |
| max_students | INT | Capacidade máxima |
| qr_code_token | TEXT UNIQUE | Token para check-in |
| created_by | UUID FK → users | Admin que criou |
| created_at | TIMESTAMP | |

#### `attendance`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | |
| session_id | UUID FK → training_sessions | |
| student_id | UUID FK → users | |
| checked_in_at | TIMESTAMP | Momento do check-in |
| method | ENUM | `qrcode`, `manual` |
| marked_by | UUID FK → users | Nulo se QR Code, admin se manual |

---

## 6. Telas e Fluxos

### 6.1 Autenticação

**Tela de Login**
- Campo e-mail e senha
- Link "Esqueci minha senha" → magic link via Supabase Auth
- Botão "Entrar"
- Link para cadastro

**Tela de Cadastro**
- Campos: nome completo, e-mail, telefone, CPF, data de nascimento, senha
- Seleção de papel: Responsável ou Aluno (Admin nunca se auto-cadastra)
- Validação de CPF
- Ao cadastrar: cria usuário no Supabase Auth + registro na tabela `users` + cria cliente no Asaas

---

### 6.2 Área do Admin

**Dashboard Admin**
- Resumo: total de alunos ativos, planos vendidos no mês, cobranças pendentes, próximos treinos
- Atalhos rápidos para as seções principais

**Gestão de Usuários**
- Listagem de todos os usuários com filtro por papel (admin / responsável / aluno)
- Cadastro manual de usuários (qualquer papel, incluindo outros admins)
- Edição e desativação de usuários
- Visualização do responsável vinculado a cada aluno

**Gestão de Planos**
- Listagem de planos (ativos e inativos)
- Criar novo plano: nome, descrição, valor, parcelamento máximo, duração, treinos/semana, formas de pagamento aceitas
- Editar plano existente
- Ativar / desativar plano (não excluir — preservar histórico)

**Gestão de Cobranças**
- Listagem de todas as cobranças com status (pago, pendente, vencido, cancelado)
- Filtros: por aluno, por plano, por status, por período
- Criar cobrança manualmente para um aluno
- Visualizar link de pagamento / boleto / QR PIX gerado pelo Asaas
- Marcar cobrança como cancelada

**Gestão de Treinos**
- Criar sessão de treino: título, descrição, data/hora, local, capacidade máxima
- Ao criar: gerar `qr_code_token` único para a sessão
- Exibir QR Code da sessão para projetar na lousa / imprimir
- Marcar presença manualmente por aluno
- Visualizar lista de presentes e ausentes por sessão

**Frequência Geral**
- Relatório de frequência por aluno: % de presença, treinos assistidos vs. esperados
- Filtros por período e por plano

---

### 6.3 Área do Responsável

**Dashboard Responsável**
- Cards dos alunos vinculados com status do plano de cada um (ativo / vencido / sem plano)
- Próximos treinos dos alunos

**Meus Alunos**
- Listagem dos alunos vinculados
- Adicionar novo aluno: preenche dados ou vincula aluno já cadastrado via e-mail/CPF
- Ver frequência individual de cada aluno

**Planos Disponíveis**
- Listagem dos planos ativos
- Detalhe do plano: descrição, valor, formas de pagamento, parcelamento
- Contratar plano:
  1. Selecionar aluno a quem o plano será atribuído
  2. Escolher forma de pagamento (PIX / boleto / cartão)
  3. Se cartão: selecionar número de parcelas
  4. Confirmar → cria cobrança no Asaas → exibe link/QR de pagamento

**Minhas Contratações**
- Histórico de planos contratados, com status de pagamento de cada um

---

### 6.4 Área do Aluno

**Dashboard Aluno**
- Card do plano ativo (validade, treinos/semana incluídos)
- Próximos treinos disponíveis para ele
- Resumo de frequência do mês

**Treinos Disponíveis**
- Listagem de sessões de treino futuras
- Detalhe: horário, local, vagas disponíveis

**Minha Frequência**
- Histórico de presenças com data, treino e método de check-in

---

## 6.5 Catálogo de Planos e Serviços

A Diamond X possui duas categorias de produtos comercializáveis no sistema:

### Planos de Aulas (Futebol / Treinamento)

| ID | Plano | Valor | Duração | Aulas incluídas | Parcelas máx. (cartão) |
|----|-------|-------|---------|-----------------|------------------------|
| 1 | Basic | R$ 599,90 | 30 dias | 4 aulas | 2x |
| 2 | Plus | R$ 799,90 | 45 dias | 6 aulas | 3x |
| 3 | Pro | R$ 999,90 | 60 dias | 8 aulas | 4x |
| 4 | Pro Elite | R$ 1.299,90 | 75 dias | 12 aulas | 5x |

> Os planos de aulas são vinculados a um aluno e controlam o acesso às sessões de treino. A validade começa a contar a partir da data de confirmação do pagamento.

### Serviços de Fisioterapia e Recovery

| ID | Serviço | Valor | Descrição |
|----|---------|-------|-----------|
| 5 | Fisio. Avaliação | R$ 180,00 | Avaliação inicial — cobrança única à vista |
| 6 | Fisio. Sessão Avulsa | R$ 160,00 | Sessão individual de fisioterapia |
| 7 | Fisio. Pacote 10 sessões | R$ 1.400,00 | Pacote fechado de 10 sessões |
| 8 | Fisio. Liberação Miofascial | R$ 80,00 | Procedimento de liberação miofascial |
| 9 | Fisio. Bota Pneumática | R$ 50,00 | Sessão de bota pneumática |
| 10 | Fisio. Bota + Liberação | R$ 110,00 | Combo bota pneumática + liberação miofascial |
| 11 | Recovery VIP | R$ 200,00 | Bota + Liberação + Banheira de Gelo + Sauna |

> Serviços de fisioterapia são cobranças avulsas — não geram vínculo de sessões de treino nem controlam frequência. Podem ser contratados independentemente de um plano de aulas.

### Regras de Pagamento

- **Métodos aceitos:** PIX, Cartão de Crédito, Boleto Bancário
- **Vencimento padrão:** Data atual no momento da criação da cobrança (D+0)
- **Parcelamento:** Disponível apenas no cartão de crédito, conforme limite de cada plano. Serviços avulsos de fisioterapia são sempre cobrados à vista
- **Cobranças manuais:** Admin pode criar cobranças com valor e descrição customizados diretamente para qualquer cliente

### Impacto no Banco de Dados

A tabela `plans` deve refletir os dois tipos de produto com um campo `category`:

```sql
ALTER TABLE plans ADD COLUMN category TEXT CHECK (category IN ('training', 'physio')) DEFAULT 'training';
ALTER TABLE plans ADD COLUMN sessions_included INT; -- nulo para serviços de fisioterapia avulsos
```

Planos de categoria `training` criam um registro em `student_plans` e habilitam o controle de frequência. Planos de categoria `physio` geram apenas a cobrança no Asaas, sem vínculo com sessões de treino.

---

## 7. Integração Asaas

### 7.1 Fluxo de criação de cliente
Ao cadastrar qualquer usuário (responsável ou aluno que comprará planos):
1. POST `/customers` no Asaas com nome, CPF, e-mail e telefone
2. Salvar `asaas_customer_id` na tabela `users`

### 7.2 Fluxo de criação de cobrança
Ao contratar um plano:
1. Verificar se o responsável/aluno já tem `asaas_customer_id`; se não, criar
2. POST `/payments` com:
   - `customer`: asaas_customer_id
   - `billingType`: `PIX` | `BOLETO` | `CREDIT_CARD`
   - `value`: valor do plano
   - `dueDate`: data de vencimento (D+3 recomendado)
   - `installmentCount`: número de parcelas (se cartão)
   - `description`: nome do plano
3. Salvar `asaas_payment_id` em `student_plans`
4. Retornar ao frontend: link do boleto, QR PIX ou redirect de cartão

### 7.3 Webhook Asaas → Supabase
Configurar endpoint serverless (Supabase Edge Function) para receber eventos:
- `PAYMENT_CONFIRMED` → atualizar `student_plans.status` para `active`
- `PAYMENT_OVERDUE` → atualizar para `pending_payment`
- `PAYMENT_RECEIVED` → atualizar para `active`

### 7.4 Endpoints Asaas utilizados
| Endpoint | Uso |
|----------|-----|
| `POST /customers` | Criar cliente |
| `GET /customers/{id}` | Verificar cliente |
| `POST /payments` | Criar cobrança |
| `GET /payments/{id}` | Consultar status |
| `POST /payments/{id}/cancel` | Cancelar cobrança |
| `GET /payments/{id}/pixQrCode` | Obter QR PIX |
| `GET /payments/{id}/identificationField` | Linha digitável boleto |

---

## 8. Controle de Frequência com QR Code

### Fluxo de Check-in via QR Code
1. Admin cria sessão de treino → sistema gera `qr_code_token` único (UUID)
2. Admin exibe QR Code na tela (gerado via biblioteca `qrcode.js`)
3. Aluno abre o app → tela "Fazer Check-in" → câmera lê o QR Code
4. App envia token para Supabase → valida se sessão existe e está ativa
5. Registra presença em `attendance` com `method = 'qrcode'`
6. Feedback visual: "Presença confirmada! ✅"

### Fluxo de Check-in Manual (fallback)
- Admin acessa a sessão → lista de alunos com plano ativo
- Marca presença individualmente
- Registra em `attendance` com `method = 'manual'` e `marked_by = admin_id`

---

## 9. PWA — Instalação Mobile

### manifest.json (campos obrigatórios)
```json
{
  "name": "Diamond X",
  "short_name": "Diamond X",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#FFD700",
  "icons": [
    { "src": "/assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker
- Cache de assets estáticos (CSS, JS, fontes, ícones)
- Estratégia: Cache First para assets, Network First para dados da API
- Página de offline fallback

### Requisitos para instalação
- HTTPS obrigatório em produção
- manifest.json linkado no `<head>`
- Service Worker registrado
- Ícones nos tamanhos corretos

---

## 10. Design System

### Identidade Visual

**Logotipo:** Arquivo fornecido pelo cliente (`base_icon_transparent_background.png`). Não recriar ou substituir — usar sempre o arquivo original. Versões necessárias:
- Ícone isolado (diamante) para PWA icons e splash screen
- Logo completa (diamante + "X" estilizado) para telas de login e onboarding

### Paleta de Cores

| Token | Valor | Uso |
|-------|-------|-----|
| `--dx-teal` | `#00C9A7` | Cor primária — botões, links, destaques, elementos ativos |
| `--dx-teal-dim` | `rgba(0,201,167,0.15)` | Fundos de badges, avatares, cards de destaque |
| `--dx-teal-border` | `rgba(0,201,167,0.30)` | Bordas de elementos com estado ativo |
| `--dx-bg` | `#0a0a0a` | Fundo base do app |
| `--dx-surface` | `#141414` | Cards, bottom nav, inputs |
| `--dx-surface2` | `#1c1c1c` | Superfícies secundárias, hover states |
| `--dx-border` | `#242424` | Bordas neutras (0.5px) |
| `--dx-text` | `#f0f0f0` | Texto primário |
| `--dx-muted` | `#666666` | Texto secundário, labels, placeholders |
| `--dx-danger` | `#f87171` | Erros, cobranças vencidas, status crítico |
| `--dx-warn` | `#facc15` | Alertas, status pendente |
| `--dx-success` | `#4ade80` | Confirmações, status ativo (alternativo ao teal) |

### Semântica de Status

| Status | Cor de texto | Background | Uso |
|--------|-------------|------------|-----|
| Ativo | `#00C9A7` | `rgba(0,201,167,0.12)` | Plano vigente, pagamento confirmado |
| Pendente | `#facc15` | `rgba(250,204,21,0.10)` | Aguardando pagamento |
| Vencido | `#f87171` | `rgba(248,113,113,0.12)` | Plano expirado, cobrança vencida |
| Cancelado | `#666666` | `rgba(102,102,102,0.12)` | Plano ou cobrança cancelada |

### Tipografia

| Uso | Fonte | Peso | Tamanho |
|-----|-------|------|---------|
| Display / títulos grandes | Barlow Condensed | 800 | 24–32px |
| Títulos de tela | Barlow Condensed | 700 | 18–20px |
| Corpo / labels | DM Sans | 400 / 600 | 13–16px |
| Captions / badges | DM Sans | 500 | 10–12px |

> Importar via Google Fonts: `Barlow+Condensed:wght@700;800` e `DM+Sans:wght@400;500;600`

### Modo

**Dark mode exclusivo** — o app opera apenas em tema escuro, alinhado à identidade da marca.

### Ícones

Phosphor Icons (SVG inline) — estilo `regular` para nav inativa, `bold` para nav ativa. Tamanho padrão: 20px.

### Componentes Base

**Bottom Navigation Bar** — fixa no rodapé, fundo `--dx-surface`, borda superior `0.5px solid --dx-border`. Ícone + label. Item ativo em `--dx-teal`.

| Perfil | Itens da nav |
|--------|-------------|
| Admin | Dashboard · Usuários · Planos · Cobranças · Treinos |
| Responsável | Início · Meus Alunos · Planos · Cobranças |
| Aluno | Início · Treinos · Frequência |

**Cards** — `background: --dx-surface`, `border: 0.5px solid --dx-border`, `border-radius: 12px`, `padding: 12px 14px`. Cards de destaque recebem `border-top: 2px solid --dx-teal`.

**Botão primário** — `background: --dx-teal`, `color: #0a0a0a`, `font-weight: 800`, `border-radius: 8px`, `letter-spacing: 0.05em`. Nunca usar sombra.

**Inputs** — `background: --dx-surface2`, `border: 0.5px solid --dx-border`, `border-radius: 8px`. Focus: `border-color: --dx-teal`.

**Badges de status** — `border-radius: 20px`, `font-size: 11px`, `font-weight: 600`, `padding: 3px 8px`. Cores conforme tabela de semântica acima.

**Bottom Sheets** — para formulários e confirmações. Overlay `rgba(0,0,0,0.6)`, sheet com `background: --dx-surface`, `border-radius: 20px 20px 0 0`, animação slide-up.

**Toast Notifications** — feedback de ações (ex: "Presença confirmada ✓", "Cobrança gerada"). Posição: topo centralizado, `border-radius: 8px`, duração 3s, slide-down.

---

## 11. Segurança

- Autenticação via Supabase Auth (JWT)
- Row Level Security (RLS) habilitado em todas as tabelas
- Políticas RLS:
  - Admin: lê e escreve tudo
  - Responsável: lê/escreve apenas seus alunos e contratações
  - Aluno: lê apenas seus próprios dados
- Chaves Asaas armazenadas apenas no backend (Edge Functions) — nunca expostas no frontend
- Validação de CPF no cadastro
- Rate limiting no endpoint de webhook

---

## 12. Fases de Desenvolvimento Sugeridas

### Fase 1 — Base (MVP)
- [ ] Setup do projeto (estrutura de pastas, PWA manifest, service worker)
- [ ] Autenticação (login, cadastro, recuperação de senha)
- [ ] Roteamento SPA por papel de usuário
- [ ] CRUD de usuários (admin)
- [ ] CRUD de planos (admin)

### Fase 2 — Cobranças
- [ ] Integração Asaas: criação de clientes
- [ ] Criação de cobranças (PIX, boleto, cartão)
- [ ] Webhook de confirmação de pagamento
- [ ] Contratação de planos pelo responsável

### Fase 3 — Treinos e Frequência
- [ ] CRUD de sessões de treino
- [ ] Geração de QR Code por sessão
- [ ] Leitura de QR Code pelo aluno (câmera)
- [ ] Check-in manual pelo admin
- [ ] Dashboard de frequência

### Fase 4 — Polimento
- [ ] Dashboards completos por papel
- [ ] Relatórios de inadimplência
- [ ] Relatórios de frequência
- [ ] Testes em dispositivos iOS e Android
- [ ] Deploy em produção com HTTPS

---

## 13. Variáveis de Ambiente

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Apenas no backend / Edge Functions
ASAAS_API_KEY=...                   # Apenas no backend / Edge Functions
ASAAS_BASE_URL=https://api.asaas.com/v3
```

> ⚠️ Nunca expor `SUPABASE_SERVICE_ROLE_KEY` nem `ASAAS_API_KEY` no frontend JavaScript.

---

## 14. Referências e Documentação

- [Supabase Docs](https://supabase.com/docs)
- [Asaas API Docs](https://docs.asaas.com)
- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [qrcode.js](https://davidshimjs.github.io/qrcodejs/)
- [html5-qrcode (leitura)](https://github.com/mebjas/html5-qrcode)
