---
date: 2026-05-03T23:30:01-03:00
researcher: Codex
git_commit: 3b8f58311283230bc9425ac25ca83731bd0ff19d
branch: main
repository: Diamond
topic: "veja esse documento para implementarmos os ajustes spec-alteracoes-diamond-x.md"
tags: [research, codebase]
status: complete
last_updated: 2026-05-03
last_updated_by: Codex
---

# Research: Ajustes de `spec-alteracoes-diamond-x.md`

**Date**: 2026-05-03T23:30:01-03:00
**Researcher**: Codex
**Git Commit**: 3b8f58311283230bc9425ac25ca83731bd0ff19d
**Branch**: main
**Repository**: Diamond

## Research Question
Veja esse documento para implementarmos os ajustes `spec-alteracoes-diamond-x.md`.

## Scope
Inclui a spec `spec-alteracoes-diamond-x.md`, o documento anterior de análise em `docs/research/2026-05-03-spec-alteracoes-analysis.md`, as telas do atleta, as telas administrativas, a tela de perfil/configuração, estilos globais, entrypoint da SPA e pontos de dados Supabase usados por treinos, presença, planos e usuários. Não inclui execução visual do app nem validação com dados reais no Supabase.

## Summary
O Diamond X é uma SPA/PWA em JavaScript vanilla com Supabase. O shell HTML carrega CSS local, Phosphor Icons, Supabase, QRCode, `html5-qrcode` e o módulo principal `js/app.js` (`index.html:32`, `index.html:70`, `index.html:75`). O roteamento é por hash em `app.render()`, que encaminha `#dashboard`, `#trainings`, `#attendance`, `#plans`, `#payments`, `#users`, `#reports` e `#profile` para renderizadores por perfil (`js/app.js:62`, `js/app.js:93`).

A spec é majoritariamente visual/tipográfica, com dois blocos funcionais: calendário/agendamento de treinos e gráfico/calendário de frequência. As fontes e o asset principal de logo já existem como tokens: `--font-brand` aponta para Abnes e `--font-display`/`--font-body` para Montserrat (`css/variables.css:75`). Também já existem classes globais para botão Diamond, cabeçalho com logo, fundo de login e transições (`css/components.css:115`, `css/pages.css:1`, `css/pages.css:16`). No código renderizado, porém, várias telas ainda usam estilos inline com `var(--font-display)`, logos pequenas ou ausentes, listas de cards em vez de calendário/gráfico, e botões `btn-primary`.

## Detailed Findings

### Documentos da Spec
- A spec cobre 7 telas do App do Atleta e 6 telas do Painel Administrativo (`spec-alteracoes-diamond-x.md:4`).
- O App do Atleta pede alterações no login, painel, treinos, planos, frequência, perfil e tipo de conta (`spec-alteracoes-diamond-x.md:8`).
- O Painel Administrativo pede alterações em painel geral, usuários, treinos, gestão de planos, financeiro e perfil/configuração (`spec-alteracoes-diamond-x.md:52`).
- O documento anterior já mapeava a mesma área, mas seu conteúdo precisa ser lido como pesquisa histórica porque o código atual contém classes globais novas em `css/components.css` e `css/pages.css` que não estavam refletidas em todos os renderizadores.

### Arquitetura e Entrada da SPA
- `index.html` carrega `reset.css`, `variables.css`, `components.css` e `pages.css` em sequência (`index.html:32`).
- `index.html` define `main#main-content`, `nav#bottom-nav` e `#toasts-container` como shell da SPA (`index.html:39`).
- `js/app.js` importa todos os módulos de páginas administrativas, de atleta e de responsável (`js/app.js:4`, `js/app.js:10`, `js/app.js:14`).
- `app.render()` lê `window.location.hash`, protege rotas públicas e autenticadas e escolhe o renderizador pelo hash (`js/app.js:62`, `js/app.js:67`, `js/app.js:93`).
- `renderDashboard()`, `renderTrainings()`, `renderPlans()` e `renderPayments()` alternam a tela conforme `profile.role` (`js/app.js:261`, `js/app.js:272`, `js/app.js:277`, `js/app.js:283`).
- A navegação inferior também muda por papel de usuário em `updateNav()` (`js/app.js:582`, `js/app.js:590`).

### Design Tokens, Fontes e Componentes
- A fonte Abnes está registrada em `@font-face` como `font-family: 'Abnes'` e usa `/assets/fonts/Abnes.ttf` (`css/variables.css:2`).
- Montserrat local está registrada em pesos 400, 500, 600, 700, 800 e 900 (`css/variables.css:8`, `css/variables.css:43`).
- `--font-brand` é Abnes; `--font-display` e `--font-body` são Montserrat (`css/variables.css:75`).
- A classe base `.btn` usa Montserrat via `font-family: var(--font-display)` (`css/components.css:3`).
- `.btn-primary` renderiza fundo verde esmeralda e texto escuro (`css/components.css:17`).
- `.btn-diamond` já existe com fundo preto, borda verde esmeralda e estado `:active` que inverte para verde com texto preto (`css/components.css:115`).
- `.page-header` e `.page-header-logo` já existem para cabeçalhos padronizados com logo de 52px e `object-fit: contain` (`css/components.css:128`).
- `pages.css` define transição em `#main-content`, classes `page-exit` e `page-enter`, fundo de login animado, logo de login de 160px e título/subtítulo de login (`css/pages.css:1`, `css/pages.css:24`, `css/pages.css:65`, `css/pages.css:76`).
- Busca no repositório mostra que `.btn-diamond`, `.page-header`, `.login-bg-wrapper`, `.login-logo`, `#login-particles`, `.page-exit` e `.page-enter` aparecem apenas nos CSS, não nos templates JS atuais.

### Login
- `renderLogin()` monta a tela diretamente em `js/app.js` (`js/app.js:113`).
- O login atual usa background estático com `bg-diamond.webp` e overlay inline (`js/app.js:116`, `js/app.js:117`, `js/app.js:118`).
- A logo no login usa `base_icon_transparent_background.png` com largura inline de 100px (`js/app.js:120`).
- O título `DIAMOND X` já usa `var(--font-brand)` inline (`js/app.js:121`).
- O subtítulo atual é `Performance & Training`, sem `Center`, com `font-size: 13px` e sem `font-family` explícita inline (`js/app.js:122`).
- O botão `ENTRAR` usa `btn btn-primary`, não `btn-diamond` (`js/app.js:132`).
- O submit do login chama `auth.login()`, mostra toast e depende do listener de auth para renderizar a próxima rota (`js/app.js:138`, `js/app.js:141`; listener em `js/app.js:31`).
- Não há aplicação de `page-exit`/`page-enter` no fluxo de troca de rota; as classes estão declaradas em CSS (`css/pages.css:6`, `css/pages.css:11`).

### App do Atleta: Painel
- `studentDashboard.render()` monta o Painel do Atleta (`js/pages/student/dashboard.js:4`).
- O cabeçalho tem `h1` inline com `font-family: var(--font-display)` e logo de 36px (`js/pages/student/dashboard.js:11`, `js/pages/student/dashboard.js:13`, `js/pages/student/dashboard.js:16`).
- O status do aluno busca `student_plans` e junta `plans(name, duration_days)` (`js/pages/student/dashboard.js:43`).
- A frequência do mês é contada em `attendance` filtrando `checked_in_at` desde o início do mês (`js/pages/student/dashboard.js:50`, `js/pages/student/dashboard.js:55`).
- O card de frequência mostra o número de treinos e possui link para `#attendance` com ícone de gráfico (`js/pages/student/dashboard.js:85`, `js/pages/student/dashboard.js:90`).
- Não existe gráfico inline no painel; o clique navega para a página de frequência.

### App do Atleta: Meus Treinos
- `studentTrainings.render()` monta a tela de treinos (`js/pages/student/trainings.js:6`).
- O título `MEUS TREINOS` usa `var(--font-display)` inline e não há logo no cabeçalho (`js/pages/student/trainings.js:11`, `js/pages/student/trainings.js:13`).
- O card principal permite iniciar scanner de QR Code para check-in (`js/pages/student/trainings.js:15`, `js/pages/student/trainings.js:20`).
- A lista de treinos busca até 5 sessões futuras em `training_sessions`, ordenadas por `scheduled_at` (`js/pages/student/trainings.js:35`, `js/pages/student/trainings.js:39`, `js/pages/student/trainings.js:44`).
- A tela renderiza cards de agenda semanal, não um calendário visual (`js/pages/student/trainings.js:56`, `js/pages/student/trainings.js:64`).
- O check-in por QR valida plano ativo em `student_plans`, valida sessão do dia pelo `qr_code_token` em `training_sessions` e insere presença em `attendance` (`js/pages/student/trainings.js:134`, `js/pages/student/trainings.js:152`, `js/pages/student/trainings.js:164`).
- Não há fluxo de o atleta marcar ou reservar treino até 24h antes da sessão. A tela atual lista sessões existentes e registra presença no dia via QR.

### App do Atleta: Planos e Serviços
- `studentPlans.render()` monta a tela de planos (`js/pages/student/plans.js:5`).
- O título `PLANOS E SERVIÇOS` usa `var(--font-display)` inline e não há logo no cabeçalho (`js/pages/student/plans.js:10`, `js/pages/student/plans.js:12`).
- A tela possui tabs `Treinamento` e `Fisioterapia` (`js/pages/student/plans.js:14`).
- `loadPlans()` busca planos ativos por categoria em `plans` e ordena por preço (`js/pages/student/plans.js:41`, `js/pages/student/plans.js:45`).
- Os planos são divididos em `preDiamond` e `diamondX` pelo campo `tier` (`js/pages/student/plans.js:57`).
- Os nomes de planos usam `h3` inline com peso 800 e sem `font-family: var(--font-brand)` (`js/pages/student/plans.js:68`, `js/pages/student/plans.js:88`).
- O botão `CONTRATAR AGORA` usa `btn btn-primary buy-btn` com fundo inline igual à categoria (`js/pages/student/plans.js:75`).
- A compra insere registro em `student_plans` com `status: 'pending_payment'` (`js/pages/student/plans.js:126`).

### App do Atleta: Minha Frequência
- `studentAttendance.render()` monta a frequência do aluno ou de um aluno indicado por query param (`js/pages/student/attendance.js:4`, `js/pages/student/attendance.js:5`).
- A tela faz autorização extra quando `targetStudentId` é informado, permitindo admin ou responsável vinculado (`js/pages/student/attendance.js:12`, `js/pages/student/attendance.js:18`, `js/pages/student/attendance.js:19`).
- O título usa `var(--font-display)` inline e não há logo no cabeçalho (`js/pages/student/attendance.js:39`, `js/pages/student/attendance.js:43`).
- A tela mostra dois cards de estatística: total de presenças e presenças do mês (`js/pages/student/attendance.js:46`, `js/pages/student/attendance.js:87`, `js/pages/student/attendance.js:89`).
- `loadAttendance()` busca `attendance` com join em `training_sessions(title, scheduled_at)` e ordena por `checked_in_at` descendente (`js/pages/student/attendance.js:66`, `js/pages/student/attendance.js:69`).
- O histórico é renderizado como lista de cards, não gráfico ou calendário (`js/pages/student/attendance.js:106`, `js/pages/student/attendance.js:112`).

### Perfil e Tipo de Conta
- `renderProfile()` é compartilhado por aluno, admin, responsável e empresário (`js/app.js:293`).
- O cabeçalho do perfil usa avatar/foto do usuário, não logo Diamond X (`js/app.js:299`, `js/app.js:300`).
- O título `PERFIL` usa `var(--font-display)` inline (`js/app.js:308`).
- O bloco `DADOS PESSOAIS` é um texto inline sem `font-family` explícita (`js/app.js:312`, `js/app.js:314`).
- Campos `NOME`, `E-MAIL`, `CPF` e `TELEFONE` são renderizados em sequência no card (`js/app.js:317`, `js/app.js:323`).
- Para `currentRole === 'student'`, há card `FICHA DO ATLETA` com data de nascimento, clube atual, peso, altura e link de ficha completa (`js/app.js:327`, `js/app.js:330`, `js/app.js:333`, `js/app.js:347`).
- O bloco `TIPO DE CONTA` renderiza opções `student`, `responsible` e `businessman` como labels clicáveis (`js/app.js:373`, `js/app.js:376`).
- Os nomes das opções usam `<span>` inline com `font-weight: 700`, sem `font-family: var(--font-brand)` (`js/app.js:379`).
- O card `Site Diamond X Performance` usa logo de 32px sem `object-fit` inline (`js/app.js:386`, `js/app.js:387`).
- O clique em tipo de conta tenta atualizar `users.role` no Supabase e depois atualizar metadata de auth (`js/app.js:415`, `js/app.js:421`, `js/app.js:423`).
- A migração de RLS presente no repositório bloqueia atualização do próprio `role` ao exigir que `role` permaneça igual ao atual (`migrations/002_rls_security.sql:34`, `migrations/002_rls_security.sql:36`, `migrations/002_rls_security.sql:41`). Se essa migração estiver aplicada, o fluxo de autoalteração de tipo de conta não deve conseguir persistir novo papel via client SDK.

### Painel Administrativo: Painel Geral
- `adminDashboard.render()` monta o Painel Geral (`js/pages/admin/dashboard.js:4`).
- O cabeçalho tem `PAINEL GERAL` com `var(--font-display)` e logo de 36px (`js/pages/admin/dashboard.js:9`, `js/pages/admin/dashboard.js:10`, `js/pages/admin/dashboard.js:11`).
- A tela mostra estatísticas de alunos e planos ativos, gráfico de faturamento estimado e próximos treinos do dia (`js/pages/admin/dashboard.js:14`, `js/pages/admin/dashboard.js:25`, `js/pages/admin/dashboard.js:32`).
- O gráfico existente é financeiro, não de frequência (`js/pages/admin/dashboard.js:51`).

### Painel Administrativo: Usuários
- `adminUsers.render()` monta a tela de usuários (`js/pages/admin/users.js:5`).
- O título `USUÁRIOS` usa `var(--font-display)` inline e não há logo no cabeçalho (`js/pages/admin/users.js:9`, `js/pages/admin/users.js:11`).
- A ação de adicionar usuário é um botão `btn btn-primary` com ícone (`js/pages/admin/users.js:12`).
- A lista busca `users`, ordena por `full_name` e pode filtrar por papel (`js/pages/admin/users.js:38`, `js/pages/admin/users.js:41`, `js/pages/admin/users.js:43`).

### Painel Administrativo: Treinos
- `adminTrainings.render()` monta a tela de treinos administrativos (`js/pages/admin/trainings.js:5`).
- O título `TREINOS` usa `var(--font-display)` inline e não há logo no cabeçalho (`js/pages/admin/trainings.js:9`, `js/pages/admin/trainings.js:11`).
- A lista busca todas as sessões em `training_sessions`, ordenadas por `scheduled_at` descendente (`js/pages/admin/trainings.js:27`, `js/pages/admin/trainings.js:30`, `js/pages/admin/trainings.js:33`).
- Os treinos são renderizados como cards com data, hora, local, QR Code, presenças e exclusão (`js/pages/admin/trainings.js:51`, `js/pages/admin/trainings.js:58`, `js/pages/admin/trainings.js:67`, `js/pages/admin/trainings.js:72`).
- Não há calendário visual administrativo; existe formulário de criação com campo `datetime-local` (`js/pages/admin/trainings.js:173`, `js/pages/admin/trainings.js:185`).
- O formulário cria `training_sessions` com `scheduled_at`, `qr_code_token` e `created_by` (`js/pages/admin/trainings.js:192`, `js/pages/admin/trainings.js:193`, `js/pages/admin/trainings.js:196`).

### Painel Administrativo: Gestão de Planos
- `adminPlans.render()` monta a tela de gestão de planos (`js/pages/admin/plans.js:5`).
- O título `GESTÃO DE PLANOS` usa `var(--font-display)` inline e não há logo no cabeçalho (`js/pages/admin/plans.js:9`, `js/pages/admin/plans.js:11`).
- A lista busca `plans`, ordena por categoria e preço (`js/pages/admin/plans.js:27`, `js/pages/admin/plans.js:29`).
- Cada plano renderiza categoria, badge de tier `DIAMOND X` ou `PRÉ DIAMOND`, nome, preço, descrição e ações (`js/pages/admin/plans.js:46`, `js/pages/admin/plans.js:51`, `js/pages/admin/plans.js:54`, `js/pages/admin/plans.js:59`).
- O formulário de plano já possui campo `TIER` com opções `pre_diamond` e `diamond_x` (`js/pages/admin/plans.js:107`, `js/pages/admin/plans.js:109`).

### Painel Administrativo: Financeiro
- `adminCharges.render()` monta a tela Financeiro (`js/pages/admin/charges.js:5`).
- O título `FINANCEIRO` usa `var(--font-display)` inline e não há logo no cabeçalho (`js/pages/admin/charges.js:9`, `js/pages/admin/charges.js:11`).
- A tela possui ações de adicionar cobrança e recarregar cobranças (`js/pages/admin/charges.js:12`, `js/pages/admin/charges.js:13`, `js/pages/admin/charges.js:16`).
- A lista busca `student_plans` com join em `users` e `plans`, filtrável por status (`js/pages/admin/charges.js:121`, `js/pages/admin/charges.js:124`, `js/pages/admin/charges.js:135`).
- As cobranças são renderizadas como cards com aluno, plano, data, status e valor (`js/pages/admin/charges.js:151`, `js/pages/admin/charges.js:157`, `js/pages/admin/charges.js:160`, `js/pages/admin/charges.js:166`).

### Dados e Permissões Relacionados aos Ajustes Funcionais
- `training_sessions` é usado para listar treinos do aluno, treinos administrativos, próximo treino do dashboard e QR Code (`js/pages/student/trainings.js:39`, `js/pages/admin/trainings.js:30`, `js/pages/student/dashboard.js:100`, `js/pages/admin/trainings.js:206`).
- `attendance` é usado para contar frequência mensal, listar histórico e marcar/desmarcar presença manual ou por QR (`js/pages/student/dashboard.js:55`, `js/pages/student/attendance.js:69`, `js/pages/admin/trainings.js:123`, `js/pages/student/trainings.js:165`).
- A política RLS de `attendance_insert` permite insert quando `student_id = auth.uid()` ou quando o usuário é admin (`migrations/002_rls_security.sql:65`, `migrations/002_rls_security.sql:68`, `migrations/002_rls_security.sql:69`).
- `training_sessions` tem leitura para autenticados e escrita para admin na migração RLS (`migrations/002_rls_security.sql:143`, `migrations/002_rls_security.sql:147`).
- Não foi encontrado no código atual um modelo/tabela de reservas de treino por atleta. O fluxo existente é sessão criada por admin + check-in por aluno.

## Code References
- `spec-alteracoes-diamond-x.md:1` - Documento de origem dos ajustes.
- `index.html:32` - Ordem de carregamento dos CSS globais.
- `index.html:70` - Dependências browser de Supabase, QRCode e scanner.
- `js/app.js:62` - Router principal por hash.
- `js/app.js:113` - Renderização atual do login.
- `js/app.js:293` - Renderização compartilhada do perfil/configuração.
- `js/app.js:582` - Navegação inferior por perfil.
- `css/variables.css:75` - Tokens de fonte Abnes/Montserrat.
- `css/components.css:115` - Botão Diamond já definido em CSS.
- `css/components.css:128` - Cabeçalho com logo já definido em CSS.
- `css/pages.css:1` - Transições de página já definidas em CSS.
- `css/pages.css:16` - Fundo interativo do login já definido em CSS.
- `js/pages/student/dashboard.js:13` - Título do painel do atleta ainda em `--font-display`.
- `js/pages/student/trainings.js:39` - Treinos do atleta vêm de `training_sessions`.
- `js/pages/student/plans.js:57` - Planos separados por `tier`.
- `js/pages/student/attendance.js:69` - Histórico de frequência vem de `attendance`.
- `js/pages/admin/dashboard.js:10` - Título admin geral ainda em `--font-display`.
- `js/pages/admin/users.js:11` - Título usuários ainda em `--font-display`.
- `js/pages/admin/trainings.js:30` - Treinos admin vêm de `training_sessions`.
- `js/pages/admin/plans.js:109` - Campo `TIER` já existe no formulário admin.
- `js/pages/admin/charges.js:124` - Financeiro usa `student_plans`.
- `migrations/002_rls_security.sql:36` - RLS bloqueia autoalteração de `users.role`.

## Architecture Documentation
O padrão atual é renderização por string HTML dentro de módulos ES. As telas buscam dados diretamente no Supabase client no navegador e atualizam o DOM após a resposta. Componentes visuais recorrentes são definidos em CSS (`.btn`, `.card`, badges e navegação), mas muitas propriedades críticas das telas da spec ainda estão inline dentro dos templates JS.

Os fluxos de treino são centrados em `training_sessions`: admin cria sessões com data/hora e token QR; aluno lista sessões futuras; check-in por QR procura sessão do dia e insere presença. Os fluxos de frequência são centrados em `attendance`: dashboard conta presenças do mês, página de frequência lista histórico, admin marca/desmarca presenças por sessão. Não há camada intermediária de serviço nem API própria para esses fluxos no front atual.

## Historical Context
O documento `docs/research/2026-04-24-ajustes-diamond-x.md` registrava um estado anterior no qual Abnes/Montserrat e campos de anamnese ainda não estavam integrados. No código atual, Abnes/Montserrat estão em `css/variables.css`, o perfil já possui ficha do atleta em `js/app.js`, e o formulário administrativo de planos já possui `tier`.

## Related Research
- `docs/research/2026-04-24-ajustes-diamond-x.md`

## Open Questions
- A spec pede que o atleta possa marcar treino até 24h antes da sessão, mas o código atual não tem tabela ou fluxo de reserva/agendamento por atleta; só existe criação administrativa de sessão e check-in por QR.
- A spec pede "fundo interativo"; já há CSS de background animado/partículas, mas não há código JS ou HTML atual usando `#login-particles`.
- A autoalteração de tipo de conta existe no front, mas a migração RLS presente no repo bloqueia mudança do próprio `role` se aplicada no Supabase.
