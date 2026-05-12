---
date: 2026-04-24
researcher: claude
research_question: "O que já existe e o que precisa ser implementado conforme os Ajustes App Diamond X?"
status: complete
---

# Research: Ajustes App Diamond X — Estado Atual vs. Necessidades

## Resumo

O Diamond X é uma PWA (SPA vanilla JS + Supabase) com 3 perfis de usuário: `admin`, `responsible` e `student`. O design system atual usa **Barlow Condensed** como fonte de display e **DM Sans** como fonte de corpo — ambas via Google Fonts. As fontes **Montserrat** (full woff2) e **Abnes** (otf/ttf) estão fisicamente na pasta do projeto mas **não são usadas em nenhum lugar**. Não existe GIF de background nem logo Diamond nas abas de navegação. O perfil do atleta não possui campos de anamnese. A seção "Tipo de Conta" mostra o texto do role mas não tem seletor interativo.

---

## Achados por Item do Ajuste

### 1. Capa — Logo Diamond + Fonte da Marca

**Estado atual:**
- `index.html:26` — carrega Barlow Condensed + DM Sans via Google Fonts
- `css/variables.css:27-28` — define `--font-display: 'Barlow Condensed'` e `--font-body: 'DM Sans'`
- `app.js:118` — tela de login usa `font-family: var(--font-display)` para o título "DIAMOND X"
- Logo na tela de login: `<img src="/assets/icons/icon-192.png">` (80px, acima do título)

**O que falta:**
- Trocar `--font-display` para Montserrat Black/ExtraBold (fonte da marca)
- Adicionar `--font-brand` para a fonte Abnes (logo/título "Diamond X")
- Carregar Montserrat localmente via `@font-face` (arquivos woff2 já estão em `Montserrat-Full-Version/Web Fonts/Montserrat/`)
- Carregar Abnes via `@font-face` (arquivos em `abnes/abnes.ttf` e `abnes/abnes.otf`)

**Fontes disponíveis localmente:**
- `abnes/abnes.ttf` — fonte da marca (títulos "Diamond X")
- `Montserrat-Full-Version/Web Fonts/Montserrat/Montserrat-Black.woff2`
- `Montserrat-Full-Version/Web Fonts/Montserrat/Montserrat-ExtraBold.woff2`
- `Montserrat-Full-Version/Web Fonts/Montserrat/Montserrat-Bold.woff2`
- `Montserrat-Full-Version/Web Fonts/Montserrat/Montserrat-SemiBold.woff2`
- `Montserrat-Full-Version/Web Fonts/Montserrat/Montserrat-Regular.woff2`

---

### 2. Capa — GIF de Estrutura no Background

**Estado atual:**
- Tela de login (`app.js:116-139`): container simples sem background visual
- Apenas `<img src="/assets/icons/icon-192.png">` como identidade visual
- Nenhum GIF existe nos assets

**O que falta:**
- O arquivo GIF precisa ser **fornecido pelo usuário** e adicionado em `assets/`
- CSS para aplicar o GIF como `background` na tela de login com overlay escuro para legibilidade

---

### 3. Fonte Diamond nos Títulos das Abas

**Estado atual:**
- Títulos de cada página usam `font-family: var(--font-display)` (Barlow Condensed)
  - `app.js:297` — "PERFIL"
  - `studentDashboard.js:10` — "OLÁ, [NOME]"
  - `adminDashboard.js:8` — "PAINEL GERAL"
  - `responsibleDashboard.js:10` — "OLÁ, [NOME]"
  - `studentPlans.js:13` — "PLANOS E SERVIÇOS"
  - `adminPlans.js:11` — "GESTÃO DE PLANOS"
  - `adminCharges.js:11` — "FINANCEIRO"
- Labels da nav inferior (`app.js:461-480`): sem fonte especial, texto simples 10px

**O que falta:**
- Substituir `--font-display` por Montserrat nos `h1` das páginas
- Labels da nav inferior com Montserrat (já está font-weight: 500 sem família definida)
- Nomes das abas (Início, Treinos, Planos, etc.) — já existem, só precisam da fonte

---

### 4. Logos Diamond como Identidade Visual em Cada Aba

**Estado atual:**
- `css/components.css:92-112` — nav usa ícones Phosphor Icons (`ph-house`, `ph-calendar`, etc.)
- `app.js:461-480` — itens de nav: apenas ícone + texto, sem logo Diamond
- Não existe nenhuma instância do logo Diamond além de `icon-192.png` na tela de login

**O que falta:**
- Adicionar logo Diamond (PNG ou SVG) como elemento visual nas páginas (header de cada seção)
- O único asset disponível é `assets/icons/icon-192.png` e `base_icon_transparent_background.png`
- Possibilidade: usar logo como ícone da aba ativa no nav, ou como watermark discreta nas páginas

---

### 5. Link do Site Diamond dentro do App

**Estado atual:**
- Nenhum link externo para site da Diamond existe no app

**O que falta:**
- Seção ou botão no perfil (`app.js:283-357`) ou em alguma tela que abra o site
- URL do site precisa ser fornecida pelo usuário

---

### 6. Dados do Perfil Atleta — Anamnese

**Estado atual:**
- `app.js:283-357` — `renderProfile()` mostra: nome, e-mail, CPF, telefone
- `app.js:398-451` — `showEditProfileForm()` permite editar: nome, CPF, telefone
- Tabela `users` no Supabase: `id, full_name, email, cpf, phone, role, avatar_url`
- Campos de anamnese **não existem** no banco nem no front

**O que falta:**
- **No banco (Supabase)**: nova tabela `athlete_profiles` ou colunas adicionais em `users`:
  - `birth_date` (DATE)
  - `current_club` (TEXT)
  - `weight_kg` (NUMERIC)
  - `height_cm` (NUMERIC)
  - `athlete_record_url` (TEXT — link para ficha/PDF)
- **No front**: nova seção "FICHA DO ATLETA" no perfil do estudante com os campos acima
- Formulário de edição expandido para incluir esses campos

---

### 7. Pagamento e Agendamento — Habilitar (Aguardando Token Asaas)

**Estado atual:**
- `js/asaas.js` — arquivo existe (não foi lido ainda, mas está listado)
- `adminCharges.js` — gerenciamento manual de cobranças já implementado
- `studentPlans.js:83-110` — botão "CONTRATAR AGORA" cria `student_plan` com `status: 'pending_payment'`
- Nenhuma integração real com Asaas está ativa

**O que falta:**
- Token Asaas (a ser fornecido pelo usuário)
- Integrar `asaas.js` com endpoints reais quando o token chegar
- Agendamento de treinos: estrutura de `training_sessions` já existe no banco (usada em dashboard)

---

### 8. Planos — Pré Diamond vs. Diamond X

**Estado atual:**
- `plans` table: categorias existentes são `'training'` e `'physio'`
- `studentPlans.js:6` — duas tabs: "Treinamento" e "Fisioterapia"
- Não existe distinção entre "Pré Diamond" e "Diamond X"
- Sem coluna `tier` ou similar na tabela de planos

**O que falta:**
- Adicionar coluna `tier` na tabela `plans` (valores: `'pre_diamond'`, `'diamond_x'`)
- Ou usar a coluna `name` + filtro `active` para controlar visibilidade
- Front: mostrar "Diamond X — Em breve / Indisponível" para planos do tier premium
- `adminPlans.js:89` — formulário de planos precisará do campo de tier

---

### 9. Última Aba do Perfil — Tipo de Conta com Seletor

**Estado atual:**
- `app.js:334-337` — seção "TIPO DE CONTA" mostra `this.profile?.role` como texto puro:
  ```js
  <p style="color: var(--dx-muted); font-size: 12px; font-weight: 700;">TIPO DE CONTA</p>
  <p style="font-weight: 700; color: var(--dx-teal); text-transform: uppercase;">${this.profile?.role}</p>
  ```
- Valores atuais de role: `student`, `responsible`, `admin`
- Formulário de cadastro (`app.js:204`): tem `<select>` com "Aluno" e "Responsável"

**O que falta:**
- Adicionar valor `'businessman'` (empresário) ao sistema de roles
- Trocar exibição estática por cards selecionáveis para:
  - Atleta (`student`)
  - Responsável (`responsible`)
  - Empresário (`businessman`)
- Lógica para salvar mudança de role no Supabase (com confirmação, pois muda as permissões de acesso)
- Formulário de cadastro: adicionar opção "Empresário"

---

## Mapa de Arquivos por Tarefa

| Ajuste | Arquivos a modificar |
|--------|---------------------|
| Fontes (Montserrat + Abnes) | `css/variables.css`, `index.html` |
| GIF background capa | `app.js` (`renderLogin()`), `css/pages.css` |
| Títulos com fonte Diamond | `css/variables.css`, todos os `pages/*.js` |
| Logo nas abas | `app.js` (`updateNav()`), `css/components.css` |
| Link site Diamond | `app.js` (`renderProfile()`) |
| Anamnese do atleta | `app.js` (`renderProfile()`, `showEditProfileForm()`), migração Supabase |
| Pagamento/Asaas | `js/asaas.js`, `js/pages/student/plans.js`, `js/pages/admin/charges.js` |
| Planos Pré Diamond vs Diamond X | `js/pages/student/plans.js`, `js/pages/admin/plans.js`, migração Supabase |
| Tipo de conta selecionável | `app.js` (`renderProfile()`, `renderRegister()`) |

## Assets Presentes mas Não Usados

- `abnes/abnes.ttf` — fonte da marca, pronta para uso via `@font-face`
- `abnes/abnes.otf` — alternativa desktop
- `Montserrat-Full-Version/Web Fonts/Montserrat/*.woff2` — 18 pesos/estilos
- `base_icon_transparent_background.png` — logo sem fundo, disponível para uso nas abas

## O que Requer Fornecimento Externo (Usuário)

1. **GIF** de estrutura/fundo para a tela de capa
2. **URL do site** Diamond para o link interno
3. **Token Asaas** para habilitar integração de pagamentos
4. **Decisão**: se a mudança de tipo de conta é livre (auto-serviço) ou requer aprovação do admin
