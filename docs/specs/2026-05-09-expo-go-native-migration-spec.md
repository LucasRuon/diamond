---
date: 2026-05-09T15:54:07-03:00
author: Codex
status: approved
ticket: null
research: docs/research/2026-05-09-expo-go-native-migration.md
---

# Spec: Migração Expo Go Native Diamond X

**Data**: 2026-05-09
**Estimativa**: Grande

## Objetivo

Migrar o app Diamond X de SPA/PWA estática para uma aplicação nativa compatível com Expo Go, mantendo o design system atual sem alterar fontes, identidade visual, UI/UX, hierarquia de telas, fundo dinâmico do login, cores, espaçamentos, navegação por perfil, fluxos de autenticação, reservas, presença, planos, pagamentos e administração.

A migração deve trocar somente a camada de runtime e UI técnica: DOM, CSS, hash routing, service worker, CDN globals e APIs de navegador serão substituídos por React Native, Expo Router, Expo Font, Safe Area, câmera nativa, deep links e Supabase React Native. Backend Supabase, RLS, Edge Functions e regras de negócio existentes devem permanecer como fonte de verdade.

## Escopo

### Incluído

- Criar estrutura Expo Go com Expo Router e TypeScript.
- Portar o design system atual para tema React Native preservando `Abnes`, `Montserrat`, paleta, raios, status, cards, botões, inputs, badges, headers, bottom tabs e comportamento visual.
- Recriar o fundo dinâmico do login com `assets/bg-diamond.webp`, overlay escuro, animação de zoom e partículas em runtime nativo.
- Migrar Supabase para cliente React Native com storage persistente, polyfills e variáveis `EXPO_PUBLIC_*`.
- Reescrever telas atuais como componentes React Native mantendo layout, labels, navegação, ordem de conteúdo e fluxos.
- Migrar QR code, câmera, upload de avatar/arquivos e links externos para APIs nativas Expo.
- Manter `migrations/` e `supabase/functions/` como backend existente.
- Atualizar documentação e estratégia de validação para Expo Go.

### Não Incluído

- Redesign visual, troca de fontes, troca de paleta, mudança de copy ou reformulação de UX.
- Alterações de schema Supabase além das já existentes.
- Substituição do Asaas ou redesenho do fluxo financeiro.
- Criação de development build customizado. O alvo desta etapa é Expo Go.
- Publicação nas lojas iOS/Android.
- Remoção definitiva do app web antes de paridade funcional validada.

## Pré-requisitos

- [ ] Confirmar que a migração será feita in-place na raiz do repositório, mantendo arquivos web como referência legacy até paridade.
- [ ] Confirmar que Expo Web/PWA não é requisito desta fase.
- [ ] Confirmar que o projeto Supabase remoto possui as migrations locais aplicadas, especialmente `migrations/003_training_reservations.sql`.
- [ ] Criar `.env.local` com `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Validar no Supabase Auth a URL de deep link para recuperação de senha, usando o scheme configurado no Expo.
- [ ] Ter um dispositivo físico com Expo Go para validar câmera, QR e Safe Area.

## Fases de Implementação

### Fase 1: Scaffold Expo Go e Configuração Base

**Objetivo:** Transformar a raiz do projeto em uma aplicação Expo Router compatível com Expo Go, sem ainda remover o app web legacy.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `package.json` | Modificar | Adicionar scripts Expo, dependências React Native/Expo e remover configuração vazia atual. |
| `app.json` | Criar | Configurar nome, slug, scheme, orientação, ícones, splash, permissões e plugins Expo Go. |
| `babel.config.js` | Criar | Configurar Babel para Expo. |
| `metro.config.js` | Criar | Configurar Metro caso seja necessário suportar assets/fontes atuais. |
| `tsconfig.json` | Criar | Configurar TypeScript com paths para `src/*`. |
| `expo-env.d.ts` | Criar | Declarações geradas/esperadas do Expo. |
| `.env.example` | Criar | Documentar variáveis públicas necessárias. |
| `app/_layout.tsx` | Criar | Layout raiz com providers, carregamento de fontes e rota inicial. |
| `app/index.tsx` | Criar | Redirecionamento inicial conforme sessão/perfil. |
| `src/config/env.ts` | Criar | Validação central das env vars públicas. |
| `README.md` | Modificar | Atualizar comandos mínimos para rodar no Expo Go. |
| `index.html` | Manter legacy | Não carregar no runtime nativo; manter temporariamente como referência visual. |
| `manifest.json` | Manter legacy | Metadados passam para `app.json`; manter temporariamente. |
| `service-worker.js` | Manter legacy | Não registrar no app nativo; manter temporariamente. |

#### Detalhes de Implementação

1. `package.json`
   - Adicionar scripts:
     - `start`: `expo start`
     - `android`: `expo start --android`
     - `ios`: `expo start --ios`
     - `web`: `expo start --web` somente para inspeção, não como alvo de paridade.
     - `typecheck`: `tsc --noEmit`
   - Adicionar dependências compatíveis com Expo Go:
     - `expo`, `expo-router`, `react`, `react-native`
     - `expo-font`, `expo-splash-screen`, `expo-status-bar`
     - `react-native-safe-area-context`, `react-native-screens`
     - `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`
     - `expo-camera`, `expo-image-picker`, `expo-linking`, `expo-clipboard`
     - `lucide-react-native` ou `@expo/vector-icons` para substituir Phosphor Web mantendo a semântica dos ícones.
   - Se QR nativo exigir biblioteca fora do Expo Go, selecionar uma opção JS/SVG compatível antes de implementar.

2. `app.json`
   - Definir `name` como `Diamond X`.
   - Definir `scheme` como `diamondx`.
   - Reutilizar `assets/icons/icon-512.png` como ícone.
   - Reutilizar `base_icon_transparent_background.png` ou asset equivalente no splash.
   - Declarar permissões de câmera e biblioteca de imagens com textos em português.
   - Não trocar cores de splash/theme sem mapear os tokens atuais.

3. `app/_layout.tsx`
   - Carregar fontes antes de renderizar a árvore:
     - `Abnes` de `assets/fonts/Abnes.ttf`
     - `Montserrat` com pesos 400, 500, 600, 700, 800, 900.
   - Se os `.woff2` atuais não forem aceitos no native runtime, copiar as versões `.ttf` correspondentes de `Montserrat-Full-Version/Desktop Fonts/Montserrat/TTF/` para `assets/fonts/` sem alterar a família visual.
   - Instalar providers nesta ordem: Safe Area, Auth Provider, Toast/Overlay Provider, Router Slot.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `npm install` conclui sem conflitos de peer dependency incompatíveis com Expo.
- [x] `npm run typecheck` conclui sem erros.
- [x] `npx expo config --type public` mostra `name`, `slug`, `scheme`, ícones e permissões esperados.

**Verificação Manual:**
- [ ] `npm start` abre o QR do Expo sem erro de Metro.
- [ ] Expo Go carrega a tela inicial sem tela branca.
- [ ] Splash, ícone e nome aparecem como Diamond X.

### Fase 2: Design System Nativo Preservado

**Objetivo:** Portar a camada visual para React Native mantendo fidelidade ao design atual antes de migrar telas de negócio.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/theme/tokens.ts` | Criar | Portar tokens de `css/variables.css`. |
| `src/theme/typography.ts` | Criar | Mapear famílias `Abnes` e `Montserrat`, pesos e estilos. |
| `src/theme/layout.ts` | Criar | Definir espaçamentos, raios, bordas, safe-area e dimensões de tabs. |
| `src/theme/index.ts` | Criar | Exportar tema único. |
| `src/components/ui/AppText.tsx` | Criar | Texto tipográfico com variantes preservadas. |
| `src/components/ui/Button.tsx` | Criar | Botões `primary`, `diamond`, `ghost`, estados disabled/loading. |
| `src/components/ui/Card.tsx` | Criar | Card com surface, border, padding e raio atuais. |
| `src/components/ui/TextField.tsx` | Criar | Input dark com label, erro e foco teal. |
| `src/components/ui/Badge.tsx` | Criar | Badges de status active/pending/overdue/cancelled. |
| `src/components/ui/PageHeader.tsx` | Criar | Header com título brand/display e logo à direita. |
| `src/components/ui/BottomSheet.tsx` | Criar | Substituir `ui.bottomSheet` por modal nativo. |
| `src/components/ui/ToastProvider.tsx` | Criar | Substituir toast DOM mantendo cores e timing. |
| `src/components/layout/AppScreen.tsx` | Criar | Container base com fundo, padding e safe area. |
| `src/components/layout/RoleTabs.tsx` | Criar | Bottom navigation nativa por perfil. |
| `src/components/auth/DynamicAuthBackground.tsx` | Criar | Recriar fundo do login com imagem, overlay, zoom e partículas. |
| `css/variables.css` | Referência | Usar como fonte de verdade visual durante a portabilidade. |
| `css/components.css` | Referência | Usar para dimensões de botões, cards, bottom nav e inputs. |
| `css/pages.css` | Referência | Usar para login, background, animações e containers. |

#### Detalhes de Implementação

1. `src/theme/tokens.ts`
   - Portar exatamente:
     - `dxTeal: '#00C9A7'`
     - `dxBg: '#0a0a0a'`
     - `dxSurface: '#141414'`
     - `dxSurface2: '#1c1c1c'`
     - `dxBorder: '#242424'`
     - `dxText: '#f0f0f0'`
     - `dxMuted: '#666666'`
     - `dxDanger: '#f87171'`
     - `dxWarn: '#facc15'`
     - `dxSuccess: '#4ade80'`
   - Portar backgrounds semânticos como RGBA equivalentes aos CSS atuais.
   - Preservar `radiusSm: 4`, `radiusMd: 8`, `radiusLg: 12`, `radiusFull: 9999`, `borderWidth: 0.5`.

2. `src/components/auth/DynamicAuthBackground.tsx`
   - Usar `ImageBackground` com `assets/bg-diamond.webp`.
   - Aplicar overlay vertical equivalente a `rgba(10,10,10,0.80)` até `rgba(10,10,10,0.95)`.
   - Recriar zoom contínuo de 20s via `Animated.loop`.
   - Recriar partículas com camada nativa compatível com Expo Go. Se a implementação usar canvas/SVG, confirmar compatibilidade com Expo Go antes de adicionar dependência.
   - Não substituir por gradiente estático nem remover movimento.

3. `src/components/layout/RoleTabs.tsx`
   - Portar itens atuais:
     - Admin: Dash, Usuários, Treinos, Planos, Cobranças, Config.
     - Responsible/businessman: Início, Alunos, Treinos, Planos, Faturas, Perfil.
     - Student: Início, Treinos, Planos, Presença, Perfil.
   - Manter altura visual equivalente a `65px + safe-area`.
   - Usar cor ativa `dxTeal` e inativa `dxMuted`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `npm run typecheck` valida imports de tema/componentes.
- [ ] Testes unitários de snapshot/props para `Button`, `Badge`, `AppText` e `RoleTabs` passam quando adicionados.

**Verificação Manual:**
- [ ] Tela de login nativa usa o mesmo fundo, logo, título `DIAMOND X`, fonte Abnes, subtítulo e movimento do web.
- [ ] Cards, inputs, botões e tabs têm cores, raios, pesos tipográficos e espaçamentos visualmente equivalentes ao PWA.
- [ ] Nenhuma tela usa fonte padrão do sistema quando deveria usar `Abnes` ou `Montserrat`.

### Fase 3: Supabase, Auth Provider e Deep Links

**Objetivo:** Substituir CDN/browser Supabase por cliente React Native persistente, mantendo sessões, perfil, roles e recuperação de senha.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/supabase.ts` | Criar | Cliente Supabase React Native com AsyncStorage e polyfill. |
| `src/features/auth/auth-service.ts` | Criar | Portar login, register, logout, reset/update password. |
| `src/providers/AuthProvider.tsx` | Criar | Centralizar sessão, profile, loading, role e auth state listener. |
| `src/hooks/useAuth.ts` | Criar | Hook tipado para consumir AuthProvider. |
| `src/features/auth/deep-links.ts` | Criar | Tratar links de recuperação/sessão Supabase via Expo Linking. |
| `src/types/database.ts` | Criar | Tipos mínimos das tabelas usadas ou output do Supabase CLI. |
| `js/supabase.js` | Descontinuar | Substituído por `src/lib/supabase.ts` no runtime nativo. |
| `js/auth.js` | Descontinuar | Lógica portada para `auth-service` e ToastProvider. |

#### Detalhes de Implementação

1. `src/lib/supabase.ts`
   - Importar `react-native-url-polyfill/auto` antes de criar o client.
   - Usar `createClient(env.supabaseUrl, env.supabasePublishableKey, { auth: ... })`.
   - Configurar `storage: AsyncStorage`, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`.
   - Não hard-codear URL/chave no código nativo.

2. `src/providers/AuthProvider.tsx`
   - Carregar sessão inicial com `supabase.auth.getSession()`.
   - Buscar profile em `users` pelo `session.user.id`.
   - Reproduzir regra atual: sem sessão vai para auth; com sessão vai para dashboard do role.
   - Manter RLS como autorização real; guards nativos são só UX.

3. `src/features/auth/deep-links.ts`
   - Usar `expo-linking` para receber URLs `diamondx://`.
   - Tratar `access_token`, `refresh_token`, `code` e `type=recovery` conforme fluxo Supabase.
   - Direcionar para `app/(auth)/update-password.tsx` quando o link for recuperação.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `npm run typecheck` passa.
- [ ] Teste de `env.ts` falha com mensagem clara quando variáveis faltam.
- [ ] Teste unitário de role helper cobre `admin`, `responsible`, `businessman` e `student`.

**Verificação Manual:**
- [ ] Login válido persiste após fechar e reabrir Expo Go.
- [ ] Logout limpa sessão e retorna ao login.
- [ ] Usuário autenticado abre direto na área correta.
- [ ] Link de recuperação abre o app e mostra tela de nova senha.

### Fase 4: Navegação por Perfil e Telas Auth/Profile

**Objetivo:** Trocar hash routing por Expo Router, começando pelos fluxos que controlam acesso, navegação e identidade do app.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `app/(auth)/_layout.tsx` | Criar | Layout auth sem bottom tabs. |
| `app/(auth)/login.tsx` | Criar | Tela de login preservando UI atual. |
| `app/(auth)/register.tsx` | Criar | Tela de cadastro preservando campos e validações. |
| `app/(auth)/forgot-password.tsx` | Criar | Tela de recuperação preservando fundo e copy. |
| `app/(auth)/update-password.tsx` | Criar | Tela de nova senha com estado de link válido/expirado. |
| `app/(student)/_layout.tsx` | Criar | Tabs do aluno. |
| `app/(responsible)/_layout.tsx` | Criar | Tabs do responsável/businessman. |
| `app/(admin)/_layout.tsx` | Criar | Tabs do admin. |
| `app/profile.tsx` | Criar | Rota compartilhada de perfil quando aplicável. |
| `src/features/profile/ProfileScreen.tsx` | Criar | Portar visual e dados do perfil. |
| `src/features/profile/EditProfileSheet.tsx` | Criar | Portar edição de nome, CPF, telefone. |
| `src/features/profile/EditAnamneseSheet.tsx` | Criar | Portar ficha do atleta. |
| `src/features/profile/avatar-upload.ts` | Criar | Upload nativo para Supabase Storage. |
| `src/utils/masks.ts` | Criar | Portar CPF/telefone de `js/ui.js`. |
| `src/utils/validation.ts` | Criar | Portar validação CPF e helpers de formulário. |
| `js/app.js` | Descontinuar parcial | Auth/profile/router migrados para Expo Router. |

#### Detalhes de Implementação

1. Rotas auth
   - `login.tsx` deve preservar:
     - Logo `base_icon_transparent_background.png`.
     - Título `DIAMOND X` em Abnes.
     - Subtítulo `Performance & Training Center`.
     - Links `Esqueci a senha` e `Cadastre-se`.
     - Animações de entrada equivalentes.
   - `register.tsx` deve preservar role selection e campos atuais.
   - `forgot-password.tsx` deve manter visual de acesso com fundo dinâmico.

2. Layouts role-based
   - Cada grupo deve montar `RoleTabs` com o mesmo conjunto de tabs do web.
   - Regras de redirect:
     - `admin` só acessa grupo admin.
     - `responsible` e `businessman` acessam grupo responsible.
     - Demais perfis autenticados acessam grupo student.
   - Caso role esteja ausente durante loading, manter tela de carregamento sem piscar rotas erradas.

3. Perfil
   - Recriar cards `DADOS PESSOAIS`, `FICHA DO ATLETA`, `RELATÓRIOS`, `DEPENDENTES`, `TIPO DE CONTA` e card de marca conforme role atual.
   - Substituir `<input type="file">` por `expo-image-picker`.
   - Upload deve converter URI local para blob/array buffer e gravar no bucket `avatars`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `npm run typecheck` passa.
- [ ] Testes unitários de máscaras CPF/telefone e validação CPF passam.
- [ ] Teste de route map confirma tabs por role.

**Verificação Manual:**
- [ ] Login, cadastro, esqueci senha e nova senha mantêm layout e comportamento visual.
- [ ] Perfil exibe os mesmos blocos do web para aluno, responsável/businessman e admin.
- [ ] Upload de avatar atualiza Storage e mostra a nova imagem após reload do app.

### Fase 5: Serviços de Domínio e Utilitários Portáveis

**Objetivo:** Extrair chamadas Supabase e helpers reutilizáveis antes de migrar todas as telas, evitando duplicação por role.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/utils/calendar.ts` | Criar | Portar `js/calendar.js` para TypeScript. |
| `src/utils/trainingReservations.ts` | Criar | Portar helper de erro de reservas. |
| `src/utils/formatters.ts` | Criar | Moeda, datas, horários e labels pt-BR. |
| `src/utils/roles.ts` | Criar | Helpers de role e labels. |
| `src/services/users.ts` | Criar | Queries e mutations de usuários/perfis. |
| `src/services/plans.ts` | Criar | Queries de planos e criação de adesões. |
| `src/services/trainingSessions.ts` | Criar | Queries/mutations de treinos. |
| `src/services/trainingReservations.ts` | Criar | Reservar/cancelar/listar reservas. |
| `src/services/attendance.ts` | Criar | Presenças, check-in QR/manual e estatísticas. |
| `src/services/responsibleLinks.ts` | Criar | Alunos vinculados e relações responsável/aluno. |
| `src/services/payments.ts` | Criar | Cobranças, faturas e integração com checkout existente. |
| `src/services/admin.ts` | Criar | Chamadas admin, incluindo Edge Function `admin-update-user`. |
| `js/calendar.js` | Portar | Lógica migrada para `src/utils/calendar.ts`. |
| `js/trainingReservations.js` | Portar | Lógica migrada para `src/utils/trainingReservations.ts`. |

#### Detalhes de Implementação

1. Serviços
   - Manter nomes de tabelas e query shapes atuais sempre que possível:
     - `users`
     - `plans`
     - `student_plans`
     - `training_sessions`
     - `training_reservations`
     - `attendance`
     - `responsible_students`
   - Não mover lógica de autorização para o cliente; continuar dependendo de RLS e Edge Functions.
   - Centralizar tratamento de erros com mensagens equivalentes às atuais.

2. Pagamentos
   - Preservar fluxo atual por enquanto:
     - Compra direta cria `student_plans` quando esse for o comportamento web atual.
     - Edge Function `asaas-checkout` permanece disponível para evolução sem expor secrets.
   - Qualquer URL externa retornada deve ser aberta com `Linking.openURL`.

3. Relatórios e gráficos
   - Criar serviços que retornem dados prontos para componentes nativos.
   - Reproduzir os gráficos atuais com views nativas simples antes de avaliar biblioteca externa.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `npm run typecheck` passa.
- [ ] Testes de `calendar.ts` cobrem matriz mensal, today e labels pt-BR.
- [ ] Testes de `trainingReservations.ts` cobrem `PGRST205`, schema cache e fallback genérico.

**Verificação Manual:**
- [ ] Queries executadas em telas migradas retornam os mesmos dados vistos no PWA.
- [ ] Erros de tabela de reservas ausente mostram mensagem equivalente à atual.

### Fase 6: Telas de Aluno e Responsável

**Objetivo:** Recriar telas de uso principal do aluno e responsável/businessman com UI nativa fiel ao web.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `app/(student)/index.tsx` | Criar | Rota dashboard do aluno. |
| `app/(student)/trainings.tsx` | Criar | Rota treinos/reservas/check-in do aluno. |
| `app/(student)/plans.tsx` | Criar | Rota planos do aluno. |
| `app/(student)/attendance.tsx` | Criar | Rota presença do aluno. |
| `app/(responsible)/index.tsx` | Criar | Rota dashboard do responsável/businessman. |
| `app/(responsible)/students.tsx` | Criar | Rota alunos vinculados. |
| `app/(responsible)/trainings.tsx` | Criar | Rota treinos de dependentes. |
| `app/(responsible)/plans.tsx` | Criar | Rota planos para dependentes. |
| `app/(responsible)/payments.tsx` | Criar | Rota faturas/pagamentos. |
| `src/features/student/StudentDashboardScreen.tsx` | Criar | Portar `js/pages/student/dashboard.js`. |
| `src/features/student/StudentTrainingsScreen.tsx` | Criar | Portar calendário, reservas e check-in. |
| `src/features/student/StudentPlansScreen.tsx` | Criar | Portar listagem/compra de planos. |
| `src/features/student/StudentAttendanceScreen.tsx` | Criar | Portar histórico e estatísticas. |
| `src/features/responsible/ResponsibleDashboardScreen.tsx` | Criar | Portar dashboard responsável. |
| `src/features/responsible/ResponsibleStudentsScreen.tsx` | Criar | Portar dependentes e vínculo. |
| `src/features/responsible/ResponsibleTrainingsScreen.tsx` | Criar | Portar agenda por aluno. |
| `src/features/responsible/ResponsiblePlansScreen.tsx` | Criar | Portar compra para dependente. |
| `src/features/responsible/ResponsiblePaymentsScreen.tsx` | Criar | Portar faturas. |
| `src/components/training/CalendarMonth.tsx` | Criar | Calendário mensal nativo baseado nos helpers portados. |
| `src/components/charts/SimpleBarChart.tsx` | Criar | Gráficos simples compatíveis com Expo Go. |

#### Detalhes de Implementação

1. Student
   - `StudentDashboardScreen` deve preservar cards de status, plano ativo, treinos e chamadas principais.
   - `StudentTrainingsScreen` deve preservar calendário mensal, cards de sessão, reserva/cancelamento e check-in.
   - `StudentAttendanceScreen` deve preservar totais, calendário/lista e barras semanais.
   - `StudentPlansScreen` deve preservar agrupamento Pré Diamond/Diamond X, cores de tier e CTA.

2. Responsible/businessman
   - Preservar distinção visual e funcional entre responsável e empresário quando já existir no profile role.
   - `ResponsibleStudentsScreen` deve manter fluxo de vínculo e leitura de dados de dependentes.
   - Telas de treinos, planos e pagamentos devem permitir operar para o aluno vinculado selecionado.

3. UI/UX
   - Não transformar telas em landing pages.
   - Manter densidade mobile-first, cards escuros, headers com logo, bottom tab fixa e CTAs equivalentes.
   - Listas longas devem usar `FlatList` quando houver risco de performance.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `npm run typecheck` passa.
- [ ] Testes unitários dos helpers de calendário e formatação continuam passando.
- [ ] Testes de serviços mockados cobrem reserva, cancelamento e check-in.

**Verificação Manual:**
- [ ] Aluno vê dashboard, treinos, planos, presença e perfil com visual equivalente ao web.
- [ ] Reserva e cancelamento funcionam e refletem no Supabase.
- [ ] Responsável/businessman vê dependentes, treinos, planos e faturas.
- [ ] Navegação por tabs não cobre conteúdo em dispositivos com safe area.

### Fase 7: Telas Admin, QR, Câmera e Capacidades Nativas

**Objetivo:** Completar áreas administrativas e substituir APIs web de QR/câmera/upload/link por APIs nativas Expo Go.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `app/(admin)/index.tsx` | Criar | Rota dashboard admin. |
| `app/(admin)/users.tsx` | Criar | Rota usuários. |
| `app/(admin)/trainings.tsx` | Criar | Rota treinos/administração de presenças. |
| `app/(admin)/plans.tsx` | Criar | Rota gestão de planos. |
| `app/(admin)/charges.tsx` | Criar | Rota cobranças. |
| `app/(admin)/reports.tsx` | Criar | Rota relatórios/frequência. |
| `src/features/admin/AdminDashboardScreen.tsx` | Criar | Portar `js/pages/admin/dashboard.js`. |
| `src/features/admin/AdminUsersScreen.tsx` | Criar | Portar usuários, roles e reset de senha. |
| `src/features/admin/AdminTrainingsScreen.tsx` | Criar | Portar criação/edição de treinos, QR e presença manual. |
| `src/features/admin/AdminPlansScreen.tsx` | Criar | Portar CRUD de planos. |
| `src/features/admin/AdminChargesScreen.tsx` | Criar | Portar cobranças e alteração de status. |
| `src/features/admin/AdminReportsScreen.tsx` | Criar | Portar relatórios e ranking. |
| `src/components/qr/QrCodeDisplay.tsx` | Criar | QR code nativo para admin. |
| `src/components/qr/QrScanner.tsx` | Criar | Scanner com `expo-camera`. |
| `src/utils/nativeLinks.ts` | Criar | Abrir site, mapas, recibos e arquivos com `Linking`. |
| `src/utils/nativeFiles.ts` | Criar | Converter URI local para upload Supabase. |
| `js/qrcode.js` | Descontinuar | Substituído por componente QR nativo. |

#### Detalhes de Implementação

1. Admin
   - `AdminUsersScreen` deve invocar `admin-update-user` para alteração de role/dados privilegiados.
   - `AdminTrainingsScreen` deve preservar:
     - Calendário/lista de treinos.
     - Criação/edição/exclusão.
     - QR por sessão.
     - Presença manual dos alunos reservados.
   - `AdminChargesScreen` deve manter filtros e alteração de status financeiro.
   - `AdminReportsScreen` deve manter médias, barras semanais e ranking.

2. QR e câmera
   - `QrScanner` deve usar `CameraView` e `onBarcodeScanned`.
   - Solicitar permissão antes de abrir scanner.
   - Desativar scanner após leitura bem-sucedida para evitar múltiplos inserts.
   - Ao sair da tela/modal, desmontar câmera.
   - Validar token QR contra sessão do dia, plano ativo e RLS como no web.

3. Links e arquivos
   - Google Maps, site Diamond X, ficha do atleta, recibos e URLs de checkout devem usar `Linking.openURL`.
   - Upload deve validar extensão/tamanho antes de enviar ao Storage.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `npm run typecheck` passa.
- [ ] Testes de serviços admin mockados cobrem update user, plano, treino e cobrança.
- [ ] Teste unitário impede double-submit de QR quando scanner já processou token.

**Verificação Manual:**
- [ ] Admin cria treino, gera QR e visualiza QR no app nativo.
- [ ] Dispositivo físico lê QR com câmera e registra presença uma única vez.
- [ ] Admin marca presença manualmente.
- [ ] Admin altera roles via Edge Function sem expor service role no client.
- [ ] Links externos abrem fora do app corretamente.

### Fase 8: Paridade, Testes, Documentação e Desativação Legacy

**Objetivo:** Validar paridade funcional/visual e deixar claro o que permanece legacy, o que é nativo e como reverter.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `README.md` | Modificar | Documentar stack Expo, setup, env, execução e validação Expo Go. |
| `PRD.md` | Modificar | Atualizar referência de PWA para app nativo Expo quando a paridade for aprovada. |
| `docs/native-validation.md` | Criar | Checklist manual de validação em Expo Go. |
| `docs/legacy-web-retirement.md` | Criar | Critérios para remover/arquivar app web antigo. |
| `tests/native/README.md` | Criar | Estratégia de testes nativos e equivalência com TestSprite. |
| `tests/unit/calendar.test.ts` | Criar | Testes dos helpers de calendário. |
| `tests/unit/trainingReservations.test.ts` | Criar | Testes dos helpers de reservas. |
| `tests/unit/roles.test.ts` | Criar | Testes de roteamento/roles. |
| `testsprite_tests/` | Manter legacy | Usar como inventário de requisitos web, não como validação nativa. |
| `index.html` | Avaliar arquivamento | Arquivar/remover somente após paridade aprovada. |
| `manifest.json` | Avaliar arquivamento | Arquivar/remover somente após paridade aprovada. |
| `service-worker.js` | Avaliar arquivamento | Arquivar/remover somente após paridade aprovada. |
| `css/` | Avaliar arquivamento | Arquivar/remover somente após paridade visual aprovada. |
| `js/` | Avaliar arquivamento | Arquivar/remover somente após paridade funcional aprovada. |

#### Detalhes de Implementação

1. Validação visual
   - Capturar screenshots do PWA atual e do Expo Go para:
     - Login.
     - Dashboard aluno.
     - Treinos aluno.
     - Perfil.
     - Dashboard admin.
     - Financeiro/cobranças.
   - Comparar manualmente fonte, cor, spacing, logo, background dinâmico e tabs.

2. Validação funcional
   - Criar checklist nativo com equivalentes dos casos TestSprite TC001-TC030.
   - Priorizar:
     - Registro/login/guards por role.
     - Atualização de perfil/avatar.
     - Reservas e bloqueios de horário.
     - Check-in QR em dispositivo físico.
     - Responsável vinculando e operando dependente.
     - Planos e cobranças.
     - Admin users/trainings/plans/reports.

3. Desativação legacy
   - Só remover `index.html`, `service-worker.js`, `manifest.json`, `css/` e `js/` quando:
     - Todos os fluxos críticos estiverem validados no Expo Go.
     - Documentação nativa estiver atualizada.
     - Houver tag/commit de rollback do PWA atual.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `npm run typecheck` passa.
- [ ] Testes unitários adicionados passam.
- [ ] `npx expo start --no-dev --minify` inicia sem erro de bundle.

**Verificação Manual:**
- [ ] Checklist `docs/native-validation.md` completo em iOS ou Android físico.
- [ ] Login background mantém imagem, overlay, zoom e partículas.
- [ ] Nenhum fluxo crítico depende de DOM, `window`, `document`, service worker ou CDN global.
- [ ] Arquivos legacy estão claramente documentados como referência ou removidos após aprovação.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Fontes `.woff2` não carregam no native runtime | Usar as versões `.ttf` já presentes em `Montserrat-Full-Version` e manter os mesmos nomes de família/pesos. |
| Usuário abre app sem internet | Mostrar estado offline/erro sem quebrar layout; sessão persistida pode existir, mas dados Supabase devem exibir retry. |
| Sessão existe, mas profile ainda não carregou | Mostrar loading visual neutro e não redirecionar para role errado. |
| Role ausente ou desconhecido | Tratar como `student` apenas para UX e registrar erro; RLS continua protegendo dados. |
| Link de recuperação abre com token expirado | Mostrar tela de nova senha com mensagem de link inválido/expirado, equivalente ao web. |
| Permissão de câmera negada | Exibir estado explicando necessidade da câmera e botão para tentar novamente/abrir configurações. |
| Scanner lê o mesmo QR várias vezes | Bloquear processamento após primeira leitura até finalizar insert ou resetar scanner. |
| Treino não é do dia ou plano está inativo | Bloquear check-in com mensagem equivalente ao fluxo atual. |
| Tabela `training_reservations` ausente no Supabase remoto | Mostrar mensagem de migração indisponível igual ao helper atual. |
| Safe area em iPhone com notch ou Android gesture nav | Bottom tabs e conteúdo não se sobrepõem. |
| Upload de avatar grande ou formato inválido | Bloquear antes do upload com mensagem clara e preservar avatar anterior. |
| URL externa inválida | Não abrir link e mostrar toast de erro sem travar a tela. |

## Riscos e Mitigações

- Perda de fidelidade visual ao trocar CSS por React Native -> Portar tokens primeiro, criar componentes base antes das telas e comparar screenshots por fluxo.
- Fontes Montserrat em `.woff2` incompatíveis no native -> Usar fontes `.ttf` já incluídas no pacote de fontes do repositório.
- Dependência QR não compatível com Expo Go -> Validar biblioteca antes da Fase 7; preferir implementação JS/SVG compatível.
- Câmera só validada em simulador -> Exigir validação manual em dispositivo físico com Expo Go.
- Regras privilegiadas expostas no client -> Manter `admin-update-user` como Edge Function e nunca adicionar service role ao app.
- Divergência entre web TestSprite e native -> Usar TestSprite como inventário de requisitos, não como prova de cobertura nativa.
- Migração grande demais para uma entrega única -> Implementar por fases com app compilando e typecheck passando em cada fase.
- Legacy web removido cedo demais -> Remover/arquivar apenas após checklist de paridade e ponto de rollback.

## Impactos de Segurança e Dados

- Chaves públicas Supabase podem ficar em `EXPO_PUBLIC_*`; service role e secrets Asaas continuam apenas em Edge Functions/ambiente Supabase.
- RLS permanece obrigatória para isolamento entre aluno, responsável/businessman e admin.
- Guards de Expo Router não substituem políticas de banco.
- Uploads nativos devem validar tipo/tamanho e gravar em paths previsíveis por usuário para evitar sobrescrita indevida.
- Deep links de recuperação devem tratar token expirado sem registrar tokens em logs.

## Rollback

1. Manter um commit/tag antes da Fase 1 com o PWA atual funcional.
2. Até a aprovação da Fase 8, não apagar `index.html`, `manifest.json`, `service-worker.js`, `css/` e `js/`; eles servem como rollback e referência visual.
3. Se uma fase falhar, reverter somente os arquivos criados/modificados naquela fase e manter backend Supabase intacto.
4. Se houver falha em dados remotos, não aplicar rollback de schema sem plano separado; esta spec não prevê migrations novas.
5. Se a dependência QR/câmera bloquear Expo Go, pausar Fase 7 e selecionar alternativa compatível antes de continuar.

## Checklist Final

- [ ] Expo Go inicializa na raiz do repositório.
- [ ] Design tokens, fontes, fundo dinâmico, cards, tabs e headers preservados.
- [ ] Auth, sessão persistente, roles e deep links funcionam.
- [ ] Telas de aluno migradas com paridade visual/funcional.
- [ ] Telas de responsável/businessman migradas com paridade visual/funcional.
- [ ] Telas admin migradas com Edge Function para privilégios.
- [ ] QR/câmera/upload/link externo funcionam em dispositivo físico.
- [ ] Backend Supabase, RLS e Edge Functions preservados.
- [ ] Testes automatizados mínimos e checklist manual executados.
- [ ] Arquivos legacy mantidos ou removidos conforme decisão documentada.
- [ ] Rollback path verificado.

## Assunções e Perguntas em Aberto

- Assunção: a migração será in-place, com o app web atual mantido temporariamente como legacy/reference.
- Assunção: Expo Go é o alvo desta etapa; development builds ficam fora de escopo até surgir dependência nativa incompatível.
- Assunção: a UI deve ser portada fielmente, não redesenhada.
- Pergunta: Expo Web/PWA deve continuar suportado depois da migração nativa?
- Pergunta: o fluxo financeiro final deve continuar criando `student_plans` diretamente ou deve passar obrigatoriamente por `asaas-checkout`?
- Pergunta: qual plataforma física será usada como gate principal de QA, iOS, Android ou ambas?
