---
date: 2026-05-04T00:20:40-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-04-reservas-calendario.md
---

# Spec: Reservas no Calendario por Perfil

**Data**: 2026-05-04
**Estimativa**: Média

## Objetivo

Corrigir o erro "Erro ao carregar reservas.", garantir que `training_reservations` exista e esteja exposta no Supabase remoto, manter o calendario de aluno/admin funcional mesmo quando a consulta de reservas falhar e adicionar uma visao somente leitura de reservas para responsavel/empresario.

## Escopo

### Incluído
- Aplicar e validar a tabela `public.training_reservations` no Supabase remoto usado por `js/supabase.js`.
- Tornar as telas de treinos resilientes a erro na tabela de reservas, sem apagar o calendario de sessoes.
- Destacar reservas no calendario do aluno e expor contagem/lista para admin.
- Criar calendario somente leitura para responsavel/empresario ver reservas dos alunos vinculados.
- Adicionar verificacoes automatizadas basicas de sintaxe e smoke checks manuais por perfil.

### Não Incluído
- Capacidade/vagas por treino, porque `training_sessions` nao possui coluna de limite.
- Responsavel/empresario marcar ou cancelar treino em nome do aluno.
- Mudancas no fluxo de check-in por QR Code ou na tabela `attendance`.
- Migracao automatizada via CI/CD; a aplicacao da SQL remota continua manual pelo Supabase Dashboard/SQL Editor.

## Pré-requisitos

- [ ] Acesso ao Supabase Dashboard do projeto `https://ggolcbrrenmnvtphmcbr.supabase.co`.
- [ ] Conta de teste para `admin`, `student` com plano ativo e `responsible` ou `businessman` vinculado ao aluno.
- [ ] Pelo menos uma `training_session` futura com mais de 24h de antecedencia.
- [ ] Confirmar se `migrations/003_training_reservations.sql` ja foi executada no banco remoto antes de reaplicar a versao idempotente.

## Fases de Implementação

### Fase 1: Banco Remoto e Schema REST

**Objetivo:** Garantir que `training_reservations` exista no Supabase remoto, com RLS, privilegios minimos e cache REST atualizado.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `migrations/003_training_reservations.sql` | Modificar | Tornar a migracao idempotente para producao remota, incluir grants explicitos e reload do schema PostgREST. |

#### Detalhes de Implementação

1. `migrations/003_training_reservations.sql`
   - Manter `CREATE TABLE IF NOT EXISTS public.training_reservations` com as colunas atuais: `id`, `session_id`, `student_id`, `status`, `reserved_at`, `cancelled_at`.
   - Manter os indices `training_reservations_session_idx`, `training_reservations_student_idx` e o indice unico parcial `training_reservations_active_unique_idx`.
   - Adicionar grants explicitos depois de habilitar RLS:
     - `GRANT SELECT, INSERT, UPDATE ON public.training_reservations TO authenticated;`
     - Nao conceder `DELETE`, porque cancelamento usa update para `status = 'cancelled'`.
   - Manter as politicas RLS atuais:
     - Select: proprio aluno, admin, responsavel/empresario vinculado via `responsible_students`.
     - Insert: somente proprio aluno, `status = 'booked'`, plano ativo e sessao com pelo menos 24h.
     - Update: admin ou proprio aluno cancelando reserva ativa.
   - Adicionar ao final:
     - `NOTIFY pgrst, 'reload schema';`
   - Executar o SQL no Supabase remoto e validar que a REST API deixa de retornar `PGRST205`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] Consulta REST anonima/autenticada para `training_reservations?select=id&limit=1` retorna HTTP 200 ou 401/403 por RLS, mas nao HTTP 404 com `PGRST205`.
- [ ] No SQL Editor, `select to_regclass('public.training_reservations');` retorna `training_reservations`.

**Verificação Manual:**
- [ ] No Supabase Table Editor, `training_reservations` aparece em `public`.
- [ ] Recarregar `#trainings` como admin nao exibe mais "Erro ao carregar reservas." por tabela ausente.

### Fase 2: Resiliencia das Consultas de Reservas

**Objetivo:** Fazer aluno e admin continuarem vendo os treinos do mes mesmo quando a query de reservas falhar, com mensagem diagnostica sem bloquear a agenda.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/trainingReservations.js` | Criar | Helper pequeno para detectar erro de schema/tabela de reservas e padronizar mensagens. |
| `js/pages/student/trainings.js` | Modificar | Separar erro de sessoes de erro de reservas, renderizar agenda sem reservas quando necessario e desabilitar marcar/cancelar nesse estado. |
| `js/pages/admin/trainings.js` | Modificar | Separar erro de sessoes de erro de reservas, renderizar sessoes com aviso e tratar falha no bottom sheet sem quebrar presencas. |

#### Detalhes de Implementação

1. `js/trainingReservations.js`
   - Exportar `isReservationsSchemaError(error)` retornando `true` para `PGRST205`, mensagem contendo `training_reservations` ou erro de schema cache.
   - Exportar `getReservationsLoadMessage(error)` com texto curto para UI:
     - Schema ausente: `Tabela de reservas indisponivel. Verifique a migracao no Supabase.`
     - Demais erros: `Nao foi possivel carregar reservas agora.`

2. `js/pages/student/trainings.js`
   - Importar os helpers.
   - Continuar falhando a tela inteira apenas quando `training_sessions` falhar.
   - Quando `reservationsError` ocorrer:
     - Logar `console.error('Erro ao carregar reservas do aluno:', reservationsError)`.
     - Renderizar o calendario e a lista de sessoes com `reservations = []`.
     - Exibir aviso acima de `Agenda do Mes` usando `getReservationsLoadMessage`.
     - Desabilitar `reserve-training-btn` e esconder/desabilitar cancelamento, porque a tela nao sabe se ja existe reserva ativa.
   - Quando reservas carregarem:
     - Passar as reservas para `renderCalendar(sessions, reservations)` e aplicar classe `has-reservation` nos dias com reserva do aluno.
     - Manter insert/cancelamento atuais, mas melhorar toast para erro `PGRST205` com a mensagem do helper.

3. `js/pages/admin/trainings.js`
   - Importar os helpers.
   - Continuar falhando a tela inteira apenas quando `training_sessions` falhar.
   - Quando `reservationsError` ocorrer:
     - Logar `console.error('Erro ao carregar reservas admin:', reservationsError)`.
     - Renderizar as sessoes do mes com contagem `0` ou `--` e aviso no topo da lista.
     - Manter calendario visivel.
   - Em `showAttendanceList()`, capturar erro da query de `training_reservations`.
     - Se falhar, renderizar em `#reserved-students-list` o aviso de reservas indisponiveis.
     - Continuar carregando lista de alunos e presencas.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/trainingReservations.js` termina sem erro.
- [x] `node --check js/pages/student/trainings.js` termina sem erro.
- [x] `node --check js/pages/admin/trainings.js` termina sem erro.

**Verificação Manual:**
- [ ] Com tabela de reservas indisponivel, admin ainda ve os treinos do mes e um aviso sobre reservas.
- [ ] Com tabela de reservas indisponivel, aluno ainda ve os treinos do mes, mas nao consegue marcar sem confirmacao da tabela.
- [ ] Com tabela disponivel, aluno ve `Treino marcado` e pode cancelar a propria reserva.
- [ ] Bottom sheet de presencas continua permitindo marcar presenca manual mesmo se reservas falharem.

### Fase 3: Calendario de Responsavel/Empresario

**Objetivo:** Dar visibilidade de reservas aos responsaveis/empresarios, respeitando RLS e sem permitir operacoes em nome do aluno.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/responsible/trainings.js` | Criar | Tela de calendario mensal somente leitura para reservas dos alunos vinculados. |
| `js/app.js` | Modificar | Importar a tela, rotear `#trainings` por papel e adicionar item `Treinos` no menu de responsavel/empresario. |
| `js/pages/responsible/dashboard.js` | Modificar | Adicionar CTA secundario para `#trainings` nos cards de alunos vinculados. |
| `js/pages/responsible/students.js` | Modificar | Adicionar acao para abrir treinos, preservando o acesso atual a frequencia. |

#### Detalhes de Implementação

1. `js/pages/responsible/trainings.js`
   - Seguir o padrao visual de `responsibleDashboard` e dos calendarios existentes.
   - Estado local: `currentMonth = new Date()`.
   - Buscar vinculos:
     - `responsible_students.select('student_id, student:users!student_id(id, full_name, email)').eq('responsible_id', user.id)`.
   - Se nao houver vinculos, mostrar estado vazio com link para `#students`.
   - Buscar `training_sessions` do mes inteiro, ordenadas por `scheduled_at`.
   - Buscar `training_reservations` com `student_id in (linkedStudentIds)` e `status = booked`.
   - Renderizar calendario com classe `has-training` para dias com sessao e `has-reservation` para dias em que aluno vinculado reservou.
   - Renderizar lista por sessao mostrando:
     - Data/hora/local.
     - Alunos vinculados com reserva naquela sessao.
     - Estado `Sem reserva dos seus alunos` quando houver treino sem reserva vinculada.
   - Nao incluir botoes de marcar ou cancelar reserva.
   - Em erro de reservas, usar `getReservationsLoadMessage` e manter sessoes visiveis.

2. `js/app.js`
   - Importar `responsibleTrainings`.
   - Ajustar `renderTrainings()`:
     - `admin` -> `adminTrainings.render()`.
     - `responsible` ou `businessman` -> `responsibleTrainings.render()`.
     - demais -> `studentTrainings.render()`.
   - Adicionar `{ h: '#trainings', i: 'ph-calendar', t: 'Treinos' }` ao menu de responsavel/empresario.

3. `js/pages/responsible/dashboard.js`
   - Nos cards de aluno, adicionar link `VER TREINOS` para `#trainings` ao lado de `VER FREQUENCIA`.
   - Manter CTA `PLANOS` quando nao houver plano ativo.

4. `js/pages/responsible/students.js`
   - Trocar clique do card inteiro por duas acoes explicitas:
     - `FREQUENCIA` -> `#attendance?id=<student_id>`.
     - `TREINOS` -> `#trainings`.
   - Evitar que clicar no botao dispare navegacao duplicada.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/pages/responsible/trainings.js` termina sem erro.
- [x] `node --check js/app.js` termina sem erro.
- [x] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro.

**Verificação Manual:**
- [ ] Responsavel/empresario ve item `Treinos` no menu inferior.
- [ ] Responsavel/empresario ve apenas reservas de alunos vinculados.
- [ ] Responsavel/empresario nao ve botoes de marcar/cancelar treino.
- [ ] Acesso a `#attendance?id=<student_id>` continua funcionando para aluno vinculado.

### Fase 4: Marcadores Visuais e CSS

**Objetivo:** Diferenciar no calendario dias com treino, dias com reserva e dias com presenca sem quebrar o visual atual.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `css/components.css` | Modificar | Adicionar estilo para `.calendar-day.has-reservation` e estado combinado com treino/presenca. |
| `js/pages/student/trainings.js` | Modificar | Aplicar `has-reservation` em dias com reserva propria. |
| `js/pages/admin/trainings.js` | Modificar | Opcionalmente aplicar indicador de dia com reservas agregadas. |
| `js/pages/responsible/trainings.js` | Modificar | Aplicar `has-reservation` para reservas dos alunos vinculados. |

#### Detalhes de Implementação

1. `css/components.css`
   - Adicionar `.calendar-day.has-reservation` com borda ou fundo sutil baseado em `var(--dx-teal-dim)`.
   - Adicionar pseudo-elemento diferente de `.has-training::after` para evitar conflito visual.
   - Preservar `.has-attendance` usado por `js/pages/student/attendance.js`.
   - Garantir contraste suficiente para `is-today`, `is-disabled` e combinacoes `has-training has-reservation`.

2. Telas de calendario
   - `studentTrainings.renderCalendar(sessions, reservations)`: marcar dias reservados pelo aluno.
   - `adminTrainings.renderCalendar(sessions, reservationsBySession)`: marcar dias com ao menos uma reserva, se a query estiver disponivel.
   - `responsibleTrainings.renderCalendar(sessions, reservations)`: marcar dias com reserva de aluno vinculado.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `node --check js/pages/student/trainings.js` termina sem erro.
- [x] `node --check js/pages/admin/trainings.js` termina sem erro.
- [x] `node --check js/pages/responsible/trainings.js` termina sem erro.

**Verificação Manual:**
- [ ] Dia com treino sem reserva continua marcado como treino.
- [ ] Dia com reserva fica visualmente distinguivel do dia apenas com treino.
- [ ] Calendario de frequencia continua marcando presencas como antes.
- [ ] Layout permanece sem sobreposicao em mobile.

### Fase 5: Validacao Fim a Fim

**Objetivo:** Confirmar que o fluxo banco -> Supabase REST -> UI funciona para aluno, admin e responsavel/empresario.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Nenhum | Validar | Executar verificacoes automatizadas e roteiro manual nos perfis de teste. |

#### Detalhes de Implementação

1. Verificacoes locais
   - Rodar `find js -name '*.js' -print0 | xargs -0 -n1 node --check`.
   - Servir a aplicacao localmente, por exemplo `python3 -m http.server 8080`, e abrir `http://127.0.0.1:8080/`.

2. Verificacoes Supabase
   - Confirmar que `training_reservations` existe no banco remoto.
   - Confirmar que o schema REST foi recarregado.
   - Criar uma reserva real por aluno com plano ativo em sessao futura.
   - Confirmar que reserva duplicada na mesma sessao falha por constraint ou RLS.
   - Confirmar que reserva com menos de 24h falha por RLS.

3. Roteiro manual por perfil
   - Aluno:
     - Entrar em `#trainings`.
     - Ver calendario mensal.
     - Marcar treino futuro.
     - Cancelar reserva.
   - Admin:
     - Entrar em `#trainings`.
     - Ver contagem de reservas por sessao.
     - Abrir `PRESENCAS` e ver alunos reservados.
     - Marcar presenca manual e confirmar que `attendance` muda sem alterar `training_reservations`.
   - Responsavel/empresario:
     - Entrar em `#trainings`.
     - Ver reservas dos alunos vinculados.
     - Confirmar ausencia de acoes de marcar/cancelar.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `find js -name '*.js' -print0 | xargs -0 -n1 node --check` termina sem erro.
- [x] REST de `training_reservations` nao retorna `PGRST205`.

**Verificação Manual:**
- [ ] Nenhum perfil autenticado ve "Erro ao carregar reservas." quando a tabela existe.
- [ ] Quando reservas falham por schema/RLS, a agenda de sessoes continua visivel.
- [ ] Aluno, admin e responsavel/empresario veem dados coerentes com seus papeis.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| `training_reservations` ausente no Supabase remoto | UI mostra agenda de sessoes com aviso de reservas indisponiveis; REST nao deve ficar sem diagnostico. |
| Schema cache do PostgREST desatualizado apos criar tabela | `NOTIFY pgrst, 'reload schema';` recarrega cache; se persistir, validar no Dashboard e aguardar propagacao. |
| Aluno tenta reservar a mesma sessao duas vezes | Banco bloqueia pelo indice unico parcial; UI mostra mensagem amigavel. |
| Aluno sem plano ativo tenta reservar | RLS bloqueia insert; UI informa que plano ativo e necessario. |
| Sessao falta menos de 24h | Botao fica desabilitado; RLS tambem bloqueia insert direto. |
| Responsavel sem alunos vinculados | Tela mostra estado vazio e link para `#students`. |
| Responsavel vinculado a varios alunos na mesma sessao | Lista mostra todos os alunos vinculados com reserva naquela sessao. |
| Admin abre presencas quando reservas falham | Lista de presencas carrega; bloco de reservas mostra aviso. |
| Reserva cancelada existe no historico | Queries de UI filtram `status = booked`; canceladas nao contam como reserva ativa. |

## Riscos e Mitigações

- Migração remota nao aplicada ou aplicada no projeto errado -> validar URL/chave de `js/supabase.js` e `to_regclass` no Dashboard antes dos testes de UI.
- Grants muito amplos -> conceder apenas `SELECT`, `INSERT`, `UPDATE` para `authenticated` e deixar RLS restringir linhas e operacoes.
- Responsavel conseguir operar reserva de aluno -> a tela responsavel deve ser somente leitura e a RLS de insert exige `student_id = auth.uid()`.
- UI esconder treinos quando reservas falham -> tratar erro de sessoes separadamente de erro de reservas.
- Confusao entre reserva e presenca -> manter labels distintos: `RESERVADO`, `PRESENTE`, `Treino marcado`; nao gravar presenca ao criar reserva.

## Rollback

1. Reverter alteracoes em `js/trainingReservations.js`, `js/pages/student/trainings.js`, `js/pages/admin/trainings.js`, `js/pages/responsible/trainings.js`, `js/pages/responsible/dashboard.js`, `js/pages/responsible/students.js`, `js/app.js` e `css/components.css`.
2. Se a migracao tiver criado dados invalidos, exportar reservas relevantes antes de qualquer rollback de banco.
3. Para rollback completo de banco, executar em janela planejada: `DROP TABLE public.training_reservations;`.
4. Recarregar a aplicacao e validar que `training_sessions` e `attendance` continuam funcionando sem dependencia da tabela removida.

## Checklist Final

- [ ] Scope implemented
- [x] Migration applied in the correct Supabase project
- [x] REST schema cache validated
- [ ] Student reservation flow validated
- [ ] Admin reservation visibility validated
- [ ] Responsible/businessman read-only calendar validated
- [ ] Validation complete
- [ ] Rollback path verified
