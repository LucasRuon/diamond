---
date: 2026-05-03T23:33:20-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-03-spec-alteracoes-analysis.md
---

# Spec: Alterações Diamond X

**Data**: 2026-05-03
**Estimativa**: Grande

## Objetivo

Implementar os ajustes visuais e funcionais solicitados em `spec-alteracoes-diamond-x.md` no App do Atleta e no Painel Administrativo. O foco é padronizar identidade Diamond X com fonte Abnes, logos maiores sem distorção, botão Diamond, login com fundo interativo, gráficos/calendários de frequência e agenda de treinos com reserva pelo atleta até 24h antes da sessão.

## Escopo

### Incluído
- Padronização visual dos cabeçalhos, títulos e logos nas telas listadas na spec.
- Uso de `btn-diamond` nos CTAs exigidos pela spec.
- Login com subtítulo correto, logo maior, partículas/fundo interativo e transição entre páginas.
- Calendário de treinos para atleta e administrador.
- Nova reserva de treino pelo atleta, bloqueada quando faltar menos de 24h para a sessão.
- Gráfico/calendário de frequência do atleta e relatório visual de frequência.
- Migração SQL com tabela e políticas RLS para reservas.

### Não Incluído
- Integração de pagamento real ou mudança no provedor de cobrança.
- Limite de capacidade por treino, porque `training_sessions` não possui coluna de vagas.
- Alteração para permitir autoelevação de papel em `users.role`; a RLS atual bloqueia isso por segurança.
- Redesign completo das telas de responsável/empresário fora dos pontos compartilhados pelo perfil e navegação.

## Pré-requisitos

- [x] Confirmar que as mudanças locais não commitadas no worktree são a base de implementação.
- [ ] Aplicar as migrações existentes no Supabase antes da nova migração de reservas.
- [ ] Ter usuário admin e usuário atleta de teste com plano ativo.
- [x] Confirmar URL/local de teste da SPA, por exemplo `python3 -m http.server 8080`.

## Fases de Implementação

### Fase 1: Componentes Visuais Compartilhados

**Objetivo:** Centralizar estilos de identidade e calendário para reduzir repetição nos templates vanilla JS.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `css/components.css` | Modificar | Adicionar classes reutilizáveis para títulos Abnes, cabeçalhos, botões de ícone, calendários, barras de gráfico e estados de reserva/presença. |
| `css/pages.css` | Modificar | Completar estados de login e transição de página, preservando o fundo animado existente. |
| `js/calendar.js` | Criar | Helpers puros para montar calendário mensal, agrupar itens por dia e gerar labels pt-BR. |

#### Detalhes de Implementação

1. `css/components.css`
   - Criar `.brand-title`, `.section-label`, `.icon-action`, `.calendar-shell`, `.calendar-grid`, `.calendar-day`, `.calendar-day.is-today`, `.calendar-day.has-training`, `.calendar-day.has-attendance`, `.calendar-day.is-disabled`, `.chart-bars`, `.chart-bar`.
   - Garantir `.page-header-logo` com `width`/`height` fixos, `object-fit: contain` e `flex-shrink: 0`.
   - Manter `.btn-diamond` com fundo preto, borda `var(--dx-teal)` e `:active` invertido para verde com texto preto.

2. `css/pages.css`
   - Confirmar que `#login-particles`, `.login-bg-wrapper`, `.login-logo`, `.login-title` e `.login-subtitle` funcionam em mobile e desktop.
   - Ajustar animações para não dependerem de texto inline e não gerarem overflow.

3. `js/calendar.js`
   - Exportar funções como `getMonthMatrix(date)`, `dateKey(date)`, `formatDayLabel(date)`, `groupByDate(items, getDate)`.
   - Não incluir dependências externas.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro de sintaxe.

**Verificação Manual:**
- [ ] Cabeçalhos usam logo sem distorção em largura mobile.
- [ ] Classes novas não quebram cards, botões e navegação inferior existentes.

### Fase 2: Login e Transições

**Objetivo:** Implementar integralmente os ajustes do Slide 1 do App do Atleta.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Usar HTML/CSS do login interativo, inicializar partículas e aplicar transição controlada no router. |
| `css/pages.css` | Modificar | Ajustar responsividade e animações do login. |

#### Detalhes de Implementação

1. `js/app.js`
   - Em `renderLogin()`, usar `.login-bg-wrapper`, `.login-bg-image`, `.login-bg-overlay`, `canvas#login-particles`, `.login-logo`, `.login-title`, `.login-subtitle`.
   - Manter subtítulo exatamente como `Performance & Training Center`.
   - Trocar o submit principal para `class="btn btn-diamond"`.
   - Garantir que `initLoginParticles()` cancele `requestAnimationFrame` ao sair do login.
   - No `render()`, aplicar `page-exit` antes de trocar `mainContent.innerHTML` e `page-enter` depois da troca. Se a implementação atual só anima entrada, completar a saída sem atrasar excessivamente a navegação.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/app.js` termina sem erro.

**Verificação Manual:**
- [ ] `#login` mostra logo maior, subtítulo correto e botão Diamond.
- [ ] Fundo animado/partículas aparece sem cobrir formulário.
- [ ] Login bem-sucedido navega ao dashboard com transição perceptível.

### Fase 3: Identidade Visual nas Telas

**Objetivo:** Padronizar fonte Abnes, logos e CTAs nas telas do atleta e do painel admin.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/student/dashboard.js` | Modificar | Aplicar título Abnes, logo padronizada e CTA de frequência. |
| `js/pages/student/plans.js` | Modificar | Aplicar Abnes nos planos, tons esmeralda e botão Diamond. |
| `js/app.js` | Modificar | Ajustar perfil, dados pessoais, ficha do atleta, tipo de conta e card do site. |
| `js/pages/admin/dashboard.js` | Modificar | Padronizar título e logo. |
| `js/pages/admin/users.js` | Modificar | Padronizar título e logo. |
| `js/pages/admin/plans.js` | Modificar | Padronizar título, logo e nome dos planos. |
| `js/pages/admin/charges.js` | Modificar | Padronizar título e logo. |

#### Detalhes de Implementação

1. Telas de atleta
   - Usar `font-family: var(--font-brand)` nos títulos principais exigidos.
   - Em planos, aplicar Abnes nos nomes dos planos e `btn-diamond` em `CONTRATAR AGORA`.
   - Manter fisioterapia com cor secundária somente como detalhe, sem virar tema dominante.

2. `js/app.js`
   - Em `renderProfile()`, manter `PERFIL` em Abnes e logo `page-header-logo`.
   - Usar Montserrat para `DADOS PESSOAIS`, como pedido na spec.
   - Usar Abnes nos campos/blocos da ficha do atleta e nas opções `Atleta`, `Responsável`, `Empresário`.
   - Manter o card `Site Diamond X Performance` com logo 52x52 e `object-fit: contain`.
   - Não relaxar a RLS de `users.role`; se a troca de conta continuar no front, exibir erro claro quando Supabase negar a alteração.

3. Telas admin
   - Substituir títulos inline remanescentes por classe ou estilo consistente com `var(--font-brand)`.
   - Garantir logo maior e sem distorção em `dashboard`, `users`, `trainings`, `plans`, `charges` e `profile`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro.

**Verificação Manual:**
- [ ] Todas as 13 telas listadas em `spec-alteracoes-diamond-x.md` exibem título Abnes quando solicitado.
- [ ] Nenhuma logo aparece achatada ou esticada.
- [ ] CTAs de login e contratação usam botão Diamond.

### Fase 4: Reserva de Treinos pelo Atleta

**Objetivo:** Permitir que o atleta marque treinos futuros até 24h antes da sessão, preservando check-in por QR Code no dia do treino.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `migrations/003_training_reservations.sql` | Criar | Criar tabela `training_reservations`, índices, constraints e políticas RLS. |
| `js/pages/student/trainings.js` | Modificar | Renderizar calendário com sessões, estado de reserva e ação de marcar/cancelar. |
| `js/pages/admin/trainings.js` | Modificar | Exibir contagem/lista de reservas por sessão no calendário admin. |
| `js/calendar.js` | Modificar | Reutilizar helpers de calendário mensal. |

#### Detalhes de Implementação

1. `migrations/003_training_reservations.sql`
   - Criar `public.training_reservations` com:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE`
     - `student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE`
     - `status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled'))`
     - `reserved_at TIMESTAMPTZ NOT NULL DEFAULT now()`
     - `cancelled_at TIMESTAMPTZ`
   - Criar índice por `session_id` e `student_id`.
   - Criar índice único parcial para uma reserva ativa por aluno/sessão: `(session_id, student_id) WHERE status = 'booked'`.
   - Habilitar RLS.
   - Política de select: aluno vê as próprias reservas; admin vê todas; responsável/empresário vê reservas de alunos vinculados via `responsible_students`.
   - Política de insert: `student_id = auth.uid()`, usuário com plano ativo e sessão com `scheduled_at >= now() + interval '24 hours'`.
   - Política de update para cancelamento próprio: permitir mudar de `booked` para `cancelled` apenas para o próprio aluno; admin pode atualizar.

2. `js/pages/student/trainings.js`
   - Buscar `training_sessions` futuras e `training_reservations` do usuário em paralelo.
   - Renderizar calendário mensal; dias com sessões ficam marcados.
   - Ao selecionar uma sessão, mostrar estado:
     - `Disponível para marcar` quando faltar 24h ou mais e não houver reserva.
     - `Treino marcado` quando existir reserva `booked`.
     - `Encerrado para marcação` quando faltar menos de 24h.
   - Inserir reserva em `training_reservations` sem alterar o fluxo de QR Code.
   - Cancelar reserva com update para `status='cancelled'` e `cancelled_at`.
   - Tratar erros RLS/constraint com toast amigável.

3. `js/pages/admin/trainings.js`
   - Mostrar calendário mensal como visão principal ou alternável com lista.
   - Incluir contagem de reservas por sessão.
   - No detalhe/presenças, mostrar quem reservou e quem fez check-in, sem misturar reserva com presença.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/pages/student/trainings.js` termina sem erro.
- [x] `node --check js/pages/admin/trainings.js` termina sem erro.

**Verificação Manual:**
- [ ] Atleta com plano ativo consegue marcar treino com mais de 24h de antecedência.
- [ ] Atleta não consegue marcar treino faltando menos de 24h.
- [ ] Atleta sem plano ativo recebe erro e não cria reserva.
- [ ] Admin vê reservas por treino no calendário.
- [ ] Check-in por QR continua registrando em `attendance`.

### Fase 5: Frequência em Gráfico e Calendário

**Objetivo:** Trocar a experiência puramente em lista por visualização de frequência em gráfico/calendário.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/student/attendance.js` | Modificar | Renderizar calendário mensal de presenças e gráfico de barras por semana/mês. |
| `js/pages/student/dashboard.js` | Modificar | Ao clicar em frequência, abrir gráfico resumido ou navegar para a página com gráfico já carregado. |
| `js/pages/admin/reports.js` | Modificar | Reaproveitar visual de gráfico para ranking e média geral. |
| `js/calendar.js` | Modificar | Adicionar helpers de agrupamento semanal/mensal se necessário. |
| `css/components.css` | Modificar | Estilizar estados de presença e barras de frequência. |

#### Detalhes de Implementação

1. `js/pages/student/attendance.js`
   - Continuar buscando `attendance` com join em `training_sessions`.
   - Calcular presença total, presença do mês, mapa por dia e agregação por semana do mês atual.
   - Renderizar:
     - Cards de estatísticas existentes.
     - Calendário mensal com dias de presença destacados.
     - Gráfico de barras por semana ou últimos 6 meses.
     - Histórico em lista abaixo do visual.
   - Preservar autorização de admin/responsável para `targetStudentId`.

2. `js/pages/student/dashboard.js`
   - Transformar o card de frequência em botão/anchor com ação clara.
   - Aceitar uma das duas opções:
     - Navegar para `#attendance` com o gráfico como primeira visualização.
     - Ou abrir bottom sheet com mini gráfico e link para `#attendance`.

3. `js/pages/admin/reports.js`
   - Manter cálculo de média geral e ranking.
   - Acrescentar visual de barras compacto para frequência geral no período selecionado.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/pages/student/attendance.js` termina sem erro.
- [x] `node --check js/pages/admin/reports.js` termina sem erro.

**Verificação Manual:**
- [ ] Página `#attendance` mostra calendário ou gráfico antes/junto do histórico.
- [ ] Dias com presença aparecem destacados.
- [ ] Frequência de aluno acessada por responsável/admin respeita autorização existente.
- [ ] Dashboard do atleta leva o usuário ao gráfico sem erro.

### Fase 6: Validação Final e Ajustes de Integridade

**Objetivo:** Validar a jornada completa do app e documentar pontos que exigem decisão de produto.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `docs/specs/2026-05-03-alteracoes-diamond-x-spec.md` | Modificar | Marcar checklist conforme implementação e registrar desvios, se houver. |

#### Detalhes de Implementação

1. Smoke test local
   - Servir a SPA localmente.
   - Login como atleta, admin e responsável.
   - Testar rotas `#dashboard`, `#trainings`, `#attendance`, `#plans`, `#payments`, `#users`, `#reports`, `#profile`.

2. Dados
   - Validar reserva com usuário atleta com e sem plano ativo.
   - Validar bloqueio de 24h no front e no Supabase.
   - Validar exclusão de sessão admin removendo reservas por cascade.

3. Segurança
   - Confirmar que aluno não lê reservas de outros alunos.
   - Confirmar que aluno não cria reserva para outro `student_id`.
   - Confirmar que autoalteração de `users.role` continua sem escalada indevida.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro.

**Verificação Manual:**
- [ ] Todas as telas do documento original foram revisadas em mobile.
- [ ] Fluxo admin cria treino, atleta reserva, admin vê reserva e atleta faz check-in por QR.
- [ ] Não há regressão em compra de planos e visualização financeira.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Atleta tenta reservar treino faltando 23h59m | Front bloqueia e RLS/DB também nega insert. |
| Atleta sem plano ativo tenta reservar | Reserva não é criada e toast informa necessidade de plano ativo. |
| Atleta tenta reservar duas vezes a mesma sessão | Constraint única impede duplicidade; UI mostra estado `Treino marcado`. |
| Sessão é excluída pelo admin | Reservas vinculadas são removidas por cascade. |
| Responsável acessa frequência de aluno não vinculado | Usuário é redirecionado para `#dashboard`, preservando regra atual. |
| Não há presenças no mês | Gráfico/calendário renderiza vazio com mensagem clara. |
| Supabase nega troca de tipo de conta por RLS | UI mostra erro sem modificar metadata local. |
| Logo carrega com proporção diferente | CSS `object-fit: contain` evita distorção. |

## Riscos e Mitigações

- Migração de reservas pode divergir do schema real do Supabase -> usar `IF NOT EXISTS`, constraints explícitas e aplicar em ambiente de teste antes de produção.
- Regra de 24h só no front seria burlável -> duplicar regra na política RLS de insert.
- Confusão entre reserva e presença -> manter `training_reservations` separada de `attendance` e rotular claramente na UI.
- Autoalteração de tipo de conta pode falhar com a RLS atual -> não alterar política de segurança sem decisão explícita; exibir erro claro.
- Muitos estilos inline dificultam consistência -> mover o mínimo necessário para classes em `css/components.css` sem refatorar todo o app.
- Calendário em telas pequenas pode quebrar layout -> usar grid de 7 colunas com dimensões estáveis e labels compactas.

## Rollback

1. Reverter alterações nos arquivos JS/CSS modificados.
2. Se a migração `003_training_reservations.sql` tiver sido aplicada e precisar rollback de dados, exportar reservas relevantes e executar `DROP TABLE public.training_reservations;`.
3. Limpar cache do service worker/PWA se assets CSS/JS antigos continuarem sendo servidos.
4. Validar que `training_sessions` e `attendance` continuam funcionando sem dependência da tabela removida.

## Checklist Final

- [x] Scope implemented
- [ ] Login visual and transitions validated
- [ ] Visual identity applied across athlete and admin screens
- [ ] Training reservation migration applied and verified
- [ ] Student and admin training calendars validated
- [ ] Attendance graph/calendar validated
- [ ] Security/RLS behavior verified
- [ ] Validation complete
- [ ] Rollback path verified

## Notas de Validação

- Validação automatizada concluída em 2026-05-03: `find js -name '*.js' -print0 | xargs -0 -n1 node --check`.
- Smoke check local concluído em `http://127.0.0.1:8080/`: shell HTML, `js/app.js`, `js/calendar.js`, `css/components.css` e `css/pages.css` retornaram HTTP 200.
- Validações manuais com Supabase, usuários de teste, RLS e fluxo QR permanecem pendentes.
