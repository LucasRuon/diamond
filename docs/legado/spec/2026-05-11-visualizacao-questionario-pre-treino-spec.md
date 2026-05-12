---
date: 2026-05-11T18:16:18-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-11-questionario-pre-treino-checkin-qrcode.md
---

# Spec: Visualização das Respostas do Questionário Pré-Treino

**Data**: 2026-05-11
**Estimativa**: Média

## Objetivo

Criar uma tela autenticada para visualizar as respostas já salvas do questionário pré-treino respondido no check-in. A visualização deve funcionar para todos os níveis atuais de usuário, respeitando o mesmo limite de acesso já usado no histórico de presença: atleta vê as próprias respostas, admin vê todas, e responsável/empresário vê apenas atletas vinculados.

## Escopo

### Incluído
- Criar uma rota autenticada para detalhe de uma resposta do questionário.
- Adicionar ação de acesso ao questionário nos cards do histórico de presença em `#attendance`.
- Carregar respostas de `pre_training_questionnaires` relacionadas a `attendance` por `session_id` e `student_id`.
- Exibir recuperação, bem-estar, dores, peso, origem, data de envio, treino e atleta.
- Reaproveitar o design system atual: `page-container`, `page-header`, `card`, `btn`, `btn-primary`, `badge`, `section-label`, `brand-title`, `icon-action`, tokens de `css/variables.css` e ícones Phosphor.
- Manter UI em português e mobile-first.
- Adicionar teste TestSprite focado no acesso à visualização a partir do histórico.

### Não Incluído
- Criar dashboard analítico/agregado de respostas por turma, período ou atleta.
- Permitir edição de respostas pela tela de visualização.
- Alterar a regra de coleta do questionário no check-in.
- Criar nova migration, salvo se a validação revelar ausência de RLS no ambiente remoto.
- Exibir respostas sem vínculo de permissão no frontend; a RLS permanece como barreira final.

## Pré-requisitos

- [ ] Confirmar que `migrations/005_pre_training_questionnaires.sql` e `006_pre_training_questionnaires_rls_fix.sql` foram aplicadas no Supabase.
- [ ] Ter pelo menos uma presença com resposta em `pre_training_questionnaires` para validar o fluxo.
- [ ] Ter usuários de teste para `student`, `admin`, `responsible` e `businessman`.
- [ ] Confirmar que `responsible_students` contém vínculo válido para responsáveis/empresários nos cenários de teste.

## Fases de Implementação

### Fase 1: Contratos Compartilhados do Questionário

**Objetivo:** Expor labels e formatadores já usados na coleta para a nova tela não duplicar semântica.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/student/preTrainingQuestionnaire.js` | Modificar | Exportar constantes/helpers de labels para reuso na visualização. |

#### Detalhes de Implementação

1. `js/pages/student/preTrainingQuestionnaire.js`
   - Exportar `PRE_TRAINING_WELLNESS_GROUPS` com as mesmas chaves e labels hoje usadas em `WELLNESS_GROUPS`.
   - Exportar `formatPainLabel(point)` para padronizar o texto das dores selecionadas.
   - Manter compatibilidade interna substituindo referências locais para os novos exports ou criando aliases locais.
   - Não alterar comportamento de `ensureCompleted()` ou `open()`.
   - Garantir que o módulo continue importável por `js/pages/student/trainings.js` e `js/pages/admin/trainings.js`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `python3 -m http.server 3000` serve o app sem erro de módulo.
- [x] Browser console não mostra erro de import/export ao abrir `/#trainings`.

**Verificação Manual:**
- [ ] O fluxo atual de responder o questionário antes do check-in continua abrindo normalmente.

### Fase 2: Tela de Detalhe da Resposta

**Objetivo:** Criar uma página reutilizável por todos os papéis para exibir uma resposta específica.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/student/preTrainingQuestionnaireView.js` | Criar | Página de leitura da resposta com autorização defensiva e renderização dos campos. |
| `js/app.js` | Modificar | Importar a página e registrar a rota autenticada `#pre-training-questionnaire`. |
| `css/pages.css` | Modificar | Adicionar classes específicas da tela de visualização. |

#### Detalhes de Implementação

1. `js/pages/student/preTrainingQuestionnaireView.js`
   - Exportar `preTrainingQuestionnaireView` com `async render(questionnaireId)`.
   - Se `questionnaireId` estiver ausente, redirecionar para `#attendance` e mostrar estado de erro no conteúdo antes do redirecionamento, se necessário.
   - Buscar a resposta por `id` em `pre_training_questionnaires`:
     - `id`
     - `session_id`
     - `student_id`
     - `recovery_score`
     - `wellness_scores`
     - `pain_points`
     - `weight_kg`
     - `source`
     - `submitted_at`
     - `updated_at`
     - `submitted_by`
   - Buscar dados complementares em consultas separadas para reduzir dependência de joins implícitos:
     - `training_sessions`: `id`, `title`, `scheduled_at`.
     - `users`: `id`, `full_name`, `email` para o atleta.
   - Confiar na RLS para bloquear leitura indevida e tratar retorno vazio como acesso indisponível.
   - Renderizar estado de carregamento, estado vazio/sem permissão e estado de erro.
   - Header:
     - link de voltar para `#attendance?id=<student_id>` quando houver `student_id`;
     - `#attendance` como fallback;
     - título `QUESTIONÁRIO PRÉ-TREINO`;
     - logo padrão `base_icon_transparent_background.png`.
   - Card de contexto:
     - nome do treino;
     - data/hora agendada;
     - nome do atleta;
     - badge `QR CODE` para `source = 'qrcode'` e `MANUAL` para `source = 'manual'`;
     - data de envio formatada em `pt-BR`.
   - Card de recuperação:
     - número grande com `recovery_score`;
     - label calculado:
       - 6 a 10: `Recuperação pobre`;
       - 11 a 15: `Recuperação razoável`;
       - 16 a 20: `Recuperação boa`.
   - Card de bem-estar:
     - lista com as quatro chaves de `PRE_TRAINING_WELLNESS_GROUPS`;
     - mostrar `Não informado` quando alguma chave estiver ausente por legado ou dado parcial.
   - Card de dores:
     - se `pain_points` estiver vazio, mostrar badge `Sem dor`;
     - se houver dor, listar cada ponto com label, lado e intensidade usando `formatPainLabel(point)`;
     - destacar intensidade em badge para facilitar leitura.
   - Card de peso:
     - exibir `Não informado` quando `weight_kg` for `null`;
     - formatar número com vírgula e uma casa decimal quando disponível.
   - Usar `escapeHtml` para todo texto vindo do banco.

2. `js/app.js`
   - Importar `preTrainingQuestionnaireView` de `./pages/student/preTrainingQuestionnaireView.js`.
   - No `switch (hash)`, adicionar:
     - `case '#pre-training-questionnaire': await preTrainingQuestionnaireView.render(params.get('id')); break;`
   - Não adicionar a rota a `adminRoutes` nem `responsibleRoutes`; ela deve ser autenticada para todos os papéis e autorizada pela RLS/dados.
   - `updateNav(hash)` deve continuar sem item ativo específico para essa rota. Não criar item novo na bottom nav.

3. `css/pages.css`
   - Criar classes com prefixo `.precheck-view-`.
   - Estilizar grid de resumo com uma coluna no mobile e duas no desktop estreito quando houver espaço.
   - Manter cards com `border-radius` existente, sem cards aninhados.
   - Criar elementos estáveis para:
     - `.precheck-view-meta`
     - `.precheck-view-score`
     - `.precheck-view-list`
     - `.precheck-view-pain-list`
     - `.precheck-view-empty`
   - Usar apenas tokens existentes, principalmente `--dx-bg`, `--dx-surface2`, `--dx-border`, `--dx-teal`, `--dx-teal-dim`, `--dx-muted`, `--dx-text` e `--dx-danger`.
   - Garantir quebra de texto com `overflow-wrap: anywhere` em nomes de treino, atleta e regiões de dor.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `python3 -m http.server 3000` inicia o app.
- [ ] Abrir `http://localhost:3000/#pre-training-questionnaire?id=<id-valido>` não gera erro de módulo no console.
- [x] Abrir a rota com `id` inexistente exibe estado de indisponibilidade, sem tela quebrada.

**Verificação Manual:**
- [ ] Atleta consegue abrir a própria resposta.
- [ ] Admin consegue abrir resposta de qualquer atleta.
- [ ] Responsável/empresário consegue abrir resposta de atleta vinculado.
- [ ] Responsável/empresário não consegue ver resposta de atleta não vinculado.
- [ ] A tela fica legível em 360px, 390px e desktop, sem texto sobreposto.

### Fase 3: Entrada Pelo Histórico de Presença

**Objetivo:** Tornar a visualização descobrível a partir da tela `#attendance`, que já é o ponto compartilhado entre papéis.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/student/attendance.js` | Modificar | Carregar respostas relacionadas e adicionar ação `Questionário` nos cards do histórico. |

#### Detalhes de Implementação

1. `js/pages/student/attendance.js`
   - Alterar a query de `attendance` para incluir `session_id` e `student_id`, mantendo `checked_in_at`, `method` e `training_sessions`.
   - Após carregar `history`, montar `sessionIds` únicos.
   - Se houver `sessionIds`, consultar `pre_training_questionnaires`:
     - `id`
     - `session_id`
     - `student_id`
     - `submitted_at`
     - `source`
     - filtro `.eq('student_id', studentId)`;
     - filtro `.in('session_id', sessionIds)`.
   - Tratar erro de questionários sem impedir a renderização do histórico:
     - logar erro no console;
     - exibir os cards de presença normalmente;
     - mostrar estado `Questionário indisponível` em vez do link.
   - Criar `questionnairesBySessionId = new Map(...)`.
   - Em cada card de histórico:
     - quando houver resposta, adicionar link/button:
       - texto `QUESTIONÁRIO`;
       - ícone `ph-clipboard-text`;
       - href `#pre-training-questionnaire?id=<questionnaire.id>`;
       - estilo alinhado aos botões compactos existentes.
     - quando não houver resposta, mostrar badge discreta `SEM QUESTIONÁRIO` somente se a presença for anterior ao novo fluxo ou se o dado não existir.
   - Preservar o badge `CONFIRMADO` e o layout atual do histórico.
   - Não mudar cálculos de estatísticas, calendário ou gráfico.
   - Para `targetStudentId`, manter o link de voltar atual para `#students`; a nova tela de detalhe volta para `#attendance?id=<student_id>`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `python3 testsprite_tests/TC019_Review_attendance_history_and_totals.py` continua passando.
- [x] Novo teste da Fase 4 consegue clicar em `QUESTIONÁRIO` no histórico.

**Verificação Manual:**
- [ ] Presenças com resposta exibem ação `QUESTIONÁRIO`.
- [ ] Presenças antigas sem resposta não quebram a lista.
- [ ] A ação funciona tanto em `#attendance` quanto em `#attendance?id=<student_id>`.

### Fase 4: Validação e Teste de Regressão

**Objetivo:** Cobrir o fluxo principal e os limites de autorização com teste automatizado e checks manuais.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `testsprite_tests/TC033_View_pre_training_questionnaire_response.py` | Criar | Teste Playwright para abrir o histórico e visualizar uma resposta salva. |

#### Detalhes de Implementação

1. `testsprite_tests/TC033_View_pre_training_questionnaire_response.py`
   - Seguir o padrão dos testes existentes em `testsprite_tests/`.
   - Pré-condição do teste:
     - usuário logado com presença recente que tenha resposta em `pre_training_questionnaires`;
     - se o teste não puder preparar dados diretamente, documentar a fixture necessária no topo do arquivo.
   - Fluxo esperado:
     - abrir `http://localhost:3000`;
     - autenticar como atleta ou usar sessão já configurada conforme padrão TestSprite local;
     - navegar para `/#attendance`;
     - clicar no primeiro botão/link `QUESTIONÁRIO`;
     - validar textos:
       - `QUESTIONÁRIO PRÉ-TREINO`;
       - `Recuperação`;
       - `Bem-estar`;
       - `Dores`;
       - `Peso`;
       - `QR CODE` ou `MANUAL`.
   - Adicionar screenshot em falha no mesmo padrão dos testes atuais.

2. Regressão manual por papel
   - Student:
     - responder pré-treino no check-in QR;
     - confirmar presença;
     - abrir `Presença`;
     - abrir `QUESTIONÁRIO`.
   - Admin:
     - marcar check-in manual;
     - responder questionário;
     - acessar `#attendance?id=<student_id>`;
     - abrir `QUESTIONÁRIO`.
   - Responsible/businessman:
     - acessar aluno vinculado em `#students`;
     - abrir `FREQUÊNCIA`;
     - abrir `QUESTIONÁRIO`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `python3 testsprite_tests/TC033_View_pre_training_questionnaire_response.py` passa com servidor em `3000`.
- [x] `python3 testsprite_tests/TC031_Complete_pre_training_questionnaire_before_QR_check_in.py` continua passando.
- [x] `python3 testsprite_tests/TC032_Complete_pre_training_questionnaire_before_manual_check_in.py` continua passando.

**Verificação Manual:**
- [ ] Nenhuma rota autenticada mostra dados de atleta sem permissão.
- [ ] A tela de detalhe renderiza corretamente respostas completas, respostas sem dor e respostas sem peso.
- [ ] O histórico segue funcional quando a consulta de questionários retorna vazio.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Presença sem resposta de questionário | Card mostra `SEM QUESTIONÁRIO` e não oferece link quebrado. |
| Resposta existe mas presença foi removida depois | A rota por `id` ainda exibe a resposta se a RLS permitir, mas ela só será descoberta por link direto. |
| `id` de questionário inexistente | Tela mostra estado `Questionário não encontrado ou sem permissão.` |
| Responsável acessa atleta não vinculado | RLS retorna vazio/erro e a UI não exibe dados. |
| `wellness_scores` sem alguma chave | Campo aparece como `Não informado`, sem quebrar layout. |
| `pain_points` com formato legado ou label ausente | Exibir região normalizada com fallback para `region.replaceAll('_', ' ')`. |
| `weight_kg` nulo | Exibir `Não informado`. |
| Nome de treino muito longo | Quebra dentro do card com `overflow-wrap: anywhere`. |
| Falha ao consultar questionários no histórico | Histórico continua aparecendo e a ação de questionário fica indisponível. |

## Riscos e Mitigações

- Duplicação de labels entre coleta e visualização -> exportar labels/helpers do módulo existente antes de criar a tela.
- Vazamento de respostas sensíveis -> manter a rota autenticada, consultar via RLS, tratar retorno vazio como sem permissão e nunca buscar dados por lista ampla sem filtro.
- Histórico ficar mais lento por consulta extra -> buscar questionários em lote com `.in('session_id', sessionIds)` depois de carregar presenças.
- Quebra de rota para admins/responsáveis -> não restringir `#pre-training-questionnaire` nos arrays `adminRoutes`/`responsibleRoutes`; a autorização fica na query e na RLS.
- Layout poluído no histórico -> usar ação compacta apenas quando houver resposta e manter `SEM QUESTIONÁRIO` discreto para legado.

## Rollback

1. Remover o case `#pre-training-questionnaire` e o import de `js/app.js`.
2. Remover o link/badge de questionário e a consulta extra em `js/pages/student/attendance.js`.
3. Remover `js/pages/student/preTrainingQuestionnaireView.js`.
4. Remover classes `.precheck-view-*` de `css/pages.css`.
5. Reverter exports adicionais em `js/pages/student/preTrainingQuestionnaire.js` se nenhum outro módulo os usar.
6. Não é necessário rollback de banco, pois a feature usa tabela e RLS já existentes.

## Checklist Final

- [x] Scope implemented
- [x] Tela usa o design system padrão do app
- [x] Rota autenticada criada
- [x] Histórico de presença mostra ação para respostas existentes
- [ ] Permissões validadas por papel
- [x] Estados vazio/erro/legado tratados
- [x] Validation complete
- [x] Rollback path verified
