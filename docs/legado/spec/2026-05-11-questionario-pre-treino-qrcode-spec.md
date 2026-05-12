---
date: 2026-05-11T15:12:10-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-11-questionario-pre-treino-checkin-qrcode.md
---

# Spec: Questionário Pré-Treino Obrigatório no Check-in por QR Code e Manual

**Data**: 2026-05-11
**Estimativa**: Média

## Objetivo

Adicionar um questionário pré-treino obrigatório antes de qualquer gravação de presença, tanto no check-in por QR Code feito pelo atleta quanto no check-in manual feito pelo admin. A presença só deve ser concluída depois de responder os campos de recuperação, bem-estar, dores corporais e peso opcional. As respostas devem ficar persistidas por atleta e sessão de treino para consulta futura e para evitar que o questionário seja respondido novamente se o check-in precisar ser retomado.

## Escopo

### Incluído
- Criar persistência Supabase para respostas do questionário por `session_id` e `student_id`.
- Exigir o questionário no fluxo de check-in via QR Code do atleta.
- Exigir o questionário no fluxo de check-in manual do admin antes de marcar um atleta como presente.
- Manter as validações existentes de plano ativo, QR Code válido e treino do dia.
- Reaproveitar o design system atual: `card`, `btn`, `btn-primary`, `btn-diamond`, `input-group`, `input-control`, `badge`, `section-label`, tokens de `css/variables.css`, bottom sheets de `js/ui.js` e ícones Phosphor.
- Criar uma experiência mobile-first em etapas, semelhante às referências: recuperação, bem-estar, dores, intensidade por região e peso opcional.
- Criar assets próprios do corpo em frente e costas para seleção de regiões de dor, seguindo a estética do design system.
- Adicionar verificação automatizada focada no novo fluxo.

### Não Incluído
- Criar tela administrativa de análise das respostas.
- Alterar o histórico de presença para exibir detalhes do questionário.
- Mudar a arquitetura para backend próprio; a SPA continuará escrevendo diretamente no Supabase com RLS.

## Pré-requisitos

- [x] Confirmar que a migration será aplicada no Supabase antes do deploy do frontend.
- [ ] Confirmar que a tabela `attendance` possui unicidade por `session_id` + `student_id`, como o fluxo atual assume ao tratar erro `23505`.
- [ ] Ter um usuário atleta de teste com plano ativo e um treino do dia com `qr_code_token`.
- [ ] Ter um usuário admin de teste para validar check-in manual com preenchimento do questionário em nome do atleta.

## Fases de Implementação

### Fase 1: Persistência e RLS do Questionário

**Objetivo:** Criar a tabela de respostas com integridade por sessão/aluno e políticas compatíveis com os papéis existentes.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `migrations/005_pre_training_questionnaires.sql` | Criar | Tabela, índices, grants e políticas RLS para respostas pré-treino. |

#### Detalhes de Implementação

1. `migrations/005_pre_training_questionnaires.sql`
   - Criar `public.pre_training_questionnaires` com:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE`
     - `student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE`
     - `recovery_score INTEGER NOT NULL CHECK (recovery_score BETWEEN 6 AND 20)`
     - `wellness_scores JSONB NOT NULL DEFAULT '{}'::jsonb`
     - `pain_points JSONB NOT NULL DEFAULT '[]'::jsonb`
     - `weight_kg NUMERIC(5,2)`
     - `submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL`
     - `source TEXT NOT NULL DEFAULT 'qrcode' CHECK (source IN ('qrcode', 'manual'))`
     - `submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()`
     - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - Criar constraint única `pre_training_questionnaires_session_student_unique` em `(session_id, student_id)`.
   - Criar índices em `session_id`, `student_id` e `submitted_at`.
   - Ativar RLS.
   - Dar `SELECT, INSERT, UPDATE` para `authenticated`.
   - Política `select`:
     - aluno vê as próprias respostas;
     - admin vê todas;
     - responsável/empresário vê alunos vinculados por `responsible_students`.
   - Política `insert`:
     - permitir aluno inserir a própria resposta com `student_id = auth.uid()` e `source = 'qrcode'`;
     - permitir admin inserir resposta para qualquer aluno com `source = 'manual'` e `submitted_by = auth.uid()`;
     - exige sessão existente para o dia atual para reduzir resposta solta;
     - exige plano ativo em `student_plans` para o `student_id` da resposta.
   - Política `update`:
     - permitir aluno atualizar a própria resposta;
     - permitir admin atualizar respostas manuais;
     - manter `student_id` e `session_id` originais;
     - permitir edição idempotente antes/depois de tentativa de check-in, sem quebrar retomada.
   - Finalizar com `NOTIFY pgrst, 'reload schema';`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] Executar a migration no Supabase e confirmar que a tabela aparece no schema cache.
- [ ] Inserir uma resposta como atleta autenticado para treino do dia e receber status de sucesso.
- [ ] Tentar inserir resposta com `student_id` de outro usuário e receber bloqueio de RLS.

**Verificação Manual:**
- [ ] Confirmar no Supabase Dashboard que há apenas uma resposta ativa por atleta/sessão.

### Fase 2: Módulo de Questionário Pré-Treino

**Objetivo:** Isolar a UI, estado, assets corporais e validação do questionário em um módulo próprio importável pelos fluxos de QR Code e check-in manual.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/student/preTrainingQuestionnaire.js` | Criar | Fluxo em etapas, validação, persistência e retorno da resposta salva. |
| `assets/pre-training/body-front.svg` | Criar | Ilustração corporal frontal para seleção de regiões de dor. |
| `assets/pre-training/body-back.svg` | Criar | Ilustração corporal posterior para seleção de regiões de dor. |

#### Detalhes de Implementação

1. `js/pages/student/preTrainingQuestionnaire.js`
   - Exportar `preTrainingQuestionnaire` com método:
     - `async ensureCompleted({ session, studentId, actorId, source })`
   - `ensureCompleted` deve:
     - consultar `pre_training_questionnaires` por `session_id` e `student_id`;
     - retornar a resposta existente sem abrir o fluxo quando já houver registro;
     - abrir o fluxo quando não houver resposta.
   - Usar `studentId` como atleta dono da resposta e `actorId` como usuário que está respondendo ou registrando:
     - QR Code: `studentId = actorId = atleta logado`, `source = 'qrcode'`;
     - manual: `studentId = atleta selecionado`, `actorId = admin logado`, `source = 'manual'`.
   - Implementar estado local:
     - `step`: `recovery`, `wellness`, `pain`, `weight`, `review`;
     - `recoveryScore`: número 6-20;
     - `wellnessScores`: objeto com chaves `nutrition_hydration`, `sleep_rest`, `emotional_support`, `active_recovery`, cada uma com valores 1-5;
     - `painPoints`: array de objetos `{ region, side, intensity }`;
     - `weightKg`: número ou `null`.
   - Renderizar em overlay full-screen próprio, não em rota nova, para manter o contexto do check-in:
     - header com `Pré-treino`, nome do treino e botão de fechar;
     - indicador de progresso discreto;
     - rodapé fixo com ação principal e ação voltar quando aplicável.
   - Usar apenas componentes/tokens existentes:
     - botões com `btn`, `btn-primary`, `btn-diamond` e `icon-action`;
     - cards e labels com `card` e `section-label`;
     - inputs com `input-group` e `input-control`;
     - ícones Phosphor para estados e regiões.
   - Etapa `recovery`:
     - botões numéricos 6-20 em grid responsivo;
     - labels auxiliares: `Recuperação pobre`, `Recuperação razoável`, `Recuperação boa`;
     - bloquear avanço sem seleção.
   - Etapa `wellness`:
     - quatro grupos com escala 1-5;
     - bloquear avanço até todos os grupos terem resposta.
   - Etapa `pain`:
     - renderizar `assets/pre-training/body-front.svg` e `assets/pre-training/body-back.svg` como imagens base.
     - sobrepor regiões clicáveis por coordenadas CSS estáveis para: cabeça, ombro, braço, tronco, quadril, coxa, joelho, panturrilha, tornozelo/pe.
     - permitir lado `frente` e `costas` por controle segmentado.
     - ao selecionar região, abrir `ui.bottomSheet.show('Intensidade da dor', ...)` com escala 1-10.
     - permitir seguir sem dor selecionada com estado `Sem dor`.
   - Etapa `weight`:
     - input `number`, `step="0.1"`, opcional.
     - validar intervalo plausível, por exemplo 20 a 250 kg quando preenchido.
   - Etapa `review`:
     - resumo compacto das respostas.
     - botão `ENVIAR QUESTIONÁRIO`.
   - Ao enviar:
     - usar `upsert` em `pre_training_questionnaires` com chave única `(session_id, student_id)`;
     - gravar `submitted_by: actorId` e `source`;
     - normalizar números antes de gravar;
     - retornar a resposta salva para o chamador;
     - propagar erro para exibir toast no fluxo de QR.

2. `assets/pre-training/body-front.svg` e `assets/pre-training/body-back.svg`
   - Criar SVGs simples e próprios, em traço/shape monocromático, compatíveis com fundo escuro.
   - Usar `currentColor` ou cores alinhadas a `var(--dx-muted)`/`var(--dx-teal)` quando embutidos via CSS.
   - Manter anatomia suficientemente reconhecível para seleção de dor, sem excesso de detalhe.
   - Otimizar dimensões para mobile, por exemplo `viewBox="0 0 240 420"`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `python3 -m http.server 3000` serve o app sem erro de módulo.
- [ ] Browser console sem erro ao importar `js/pages/student/preTrainingQuestionnaire.js`.
- [x] `curl -I http://localhost:3000/assets/pre-training/body-front.svg` e `body-back.svg` retornam `200`.

**Verificação Manual:**
- [ ] No mobile, cada etapa cabe na tela com rolagem previsível e sem texto sobreposto.
- [ ] Não é possível enviar sem recuperação e bem-estar completos.
- [ ] As imagens de corpo frente/costas carregam e mantêm regiões clicáveis alinhadas em 360px, 390px e desktop.
- [ ] Selecionar dor abre bottom sheet de intensidade e mantém a seleção ao voltar.

### Fase 3: Integração com o Check-in por QR Code

**Objetivo:** Alterar o fluxo atual para validar o QR, exigir/enviar o questionário e só então inserir presença.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/student/trainings.js` | Modificar | Importar o questionário, separar validação de QR e inserir presença somente após questionário concluído. |

#### Detalhes de Implementação

1. `js/pages/student/trainings.js`
   - Importar `preTrainingQuestionnaire` de `./preTrainingQuestionnaire.js`.
   - Extrair a validação existente de `handleScanSuccess(token)` para método interno, por exemplo `async validateQrCheckin(token, userId)`, mantendo:
     - validação de plano ativo;
     - cálculo de início/fim do dia;
     - busca de `training_sessions` pelo `qr_code_token`;
     - erro `Você precisa de um plano ativo para registrar presença.`;
     - erro `QR Code inválido ou treino não agendado para hoje.`.
   - Em `handleScanSuccess(token)`, depois de validar `session`:
     - trocar feedback para `Responda o pré-treino para concluir o check-in.`;
     - chamar `await preTrainingQuestionnaire.ensureCompleted({ session, studentId: user.id, actorId: user.id, source: 'qrcode' })`;
     - apenas depois inserir em `attendance` com `method: 'qrcode'`.
   - Se o atleta fechar o questionário:
     - não inserir presença;
     - mostrar toast `Check-in pausado. Responda o questionário para confirmar presença.`;
     - permitir nova leitura do QR.
   - Se a resposta já existir para sessão/aluno:
     - pular a UI e seguir para o insert de `attendance`.
   - Manter o tratamento de duplicidade de presença:
     - `23505` continua mostrando `Sua presença já está confirmada neste treino!`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] Executar teste novo `python3 testsprite_tests/TC031_Complete_pre_training_questionnaire_before_QR_check_in.py` após subir servidor na porta 3000.

**Verificação Manual:**
- [ ] Escanear QR válido de treino do dia abre o questionário antes da presença.
- [ ] Fechar o questionário não cria linha em `attendance`.
- [ ] Enviar o questionário cria uma linha em `pre_training_questionnaires` e depois uma linha em `attendance`.
- [ ] Repetir o mesmo QR depois do questionário exibe o erro de presença já confirmada, sem exigir nova resposta.

### Fase 4: Integração com o Check-in Manual

**Objetivo:** Exigir o mesmo questionário antes de o admin marcar presença manual para um atleta.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/admin/trainings.js` | Modificar | Abrir questionário pré-treino antes do `attendance.insert` manual. |

#### Detalhes de Implementação

1. `js/pages/admin/trainings.js`
   - Importar `preTrainingQuestionnaire` de `../student/preTrainingQuestionnaire.js`.
   - Em `showAttendanceList(sessionId, title)`, garantir que o objeto de sessão passado ao questionário tenha ao menos `{ id: sessionId, title }`.
   - No clique de um aluno ausente:
     - obter `adminId` com `supabase.auth.getUser()`;
     - chamar `await preTrainingQuestionnaire.ensureCompleted({ session: { id: sessionId, title }, studentId, actorId: adminId, source: 'manual' })`;
     - somente depois inserir em `attendance` com `method: 'manual'` e `marked_by: adminId`.
   - Se o admin fechar o questionário:
     - não inserir presença;
     - manter o aluno como ausente;
     - exibir toast `Questionário obrigatório para marcar presença manual.`
   - Se já existir resposta para aquele aluno/sessão:
     - pular a UI e marcar presença manual normalmente.
   - Ao remover uma presença manual existente:
     - manter a resposta do questionário preservada, pois ela representa dado clínico/operacional do pré-treino.
     - não apagar `pre_training_questionnaires`.
   - Durante o envio, desabilitar temporariamente o item clicado para evitar duplo clique e duplicidade de insert.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] Executar teste novo `python3 testsprite_tests/TC032_Complete_pre_training_questionnaire_before_manual_check_in.py` após subir servidor na porta 3000.

**Verificação Manual:**
- [ ] Admin tenta marcar aluno ausente e o questionário abre antes da presença.
- [ ] Fechar o questionário mantém o aluno como ausente.
- [ ] Enviar o questionário cria uma linha em `pre_training_questionnaires` com `source = 'manual'` e `submitted_by = adminId`.
- [ ] Depois do envio, a presença manual é criada com `method = 'manual'`.
- [ ] Desmarcar presença não remove a resposta do questionário.

### Fase 5: Estilos, PWA e Design System

**Objetivo:** Adicionar estilos mínimos e reutilizáveis para o fluxo, sem criar uma linguagem visual paralela.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `css/components.css` | Modificar | Componentes reutilizáveis do questionário: stepper, opções, mapa corporal e rodapé fixo. |
| `service-worker.js` | Modificar | Incluir o novo módulo JS e os assets corporais no cache e subir versão do cache. |

#### Detalhes de Implementação

1. `css/components.css`
   - Adicionar classes com prefixo `precheck-`, por exemplo:
     - `.precheck-overlay`
     - `.precheck-shell`
     - `.precheck-header`
     - `.precheck-progress`
     - `.precheck-option-grid`
     - `.precheck-scale-option`
     - `.precheck-body-map`
     - `.precheck-body-figure`
     - `.precheck-body-region`
     - `.precheck-footer`
   - Usar apenas tokens existentes:
     - `var(--dx-bg)`, `var(--dx-surface)`, `var(--dx-surface2)`, `var(--dx-border)`, `var(--dx-teal)`, `var(--dx-teal-dim)`, `var(--dx-danger)`, `var(--dx-muted)`, `var(--radius-md)`, `var(--radius-lg)`.
   - Garantir responsividade:
     - grids com `repeat(auto-fit, minmax(...))`;
     - rodapé com `env(safe-area-inset-bottom)`;
     - `max-width` centralizado em telas maiores;
     - nenhum texto dependente de `vw` para tamanho de fonte.
   - Evitar cards dentro de cards; cada etapa deve ser um bloco direto dentro do shell.

2. `service-worker.js`
   - Incrementar `CACHE_NAME`, por exemplo de `diamondx-v5` para `diamondx-v6`.
   - Adicionar `/js/pages/student/preTrainingQuestionnaire.js` em `ASSETS`.
   - Adicionar `/assets/pre-training/body-front.svg` e `/assets/pre-training/body-back.svg` em `ASSETS`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `curl -I http://localhost:3000/js/pages/student/preTrainingQuestionnaire.js` retorna `200`.
- [x] `curl -I http://localhost:3000/assets/pre-training/body-front.svg` e `body-back.svg` retornam `200`.
- [ ] Recarregar a PWA limpa o cache antigo e busca o módulo novo.

**Verificação Manual:**
- [ ] Layout em 360px, 390px e desktop não tem sobreposição de texto, botão ou rodapé.
- [ ] As escolhas selecionadas têm contraste visível com `var(--dx-teal)`.
- [ ] O questionário mantém a identidade visual atual do Diamond X.

### Fase 6: Testes e QA

**Objetivo:** Cobrir as regras novas com testes automatizados focados e checklist manual para os pontos dependentes de câmera/Supabase.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `testsprite_tests/TC031_Complete_pre_training_questionnaire_before_QR_check_in.py` | Criar | Teste Playwright do fluxo obrigatório antes da confirmação de presença. |
| `testsprite_tests/TC032_Complete_pre_training_questionnaire_before_manual_check_in.py` | Criar | Teste Playwright do fluxo obrigatório antes da presença manual admin. |

#### Detalhes de Implementação

1. `testsprite_tests/TC031_Complete_pre_training_questionnaire_before_QR_check_in.py`
   - Basear o setup nos testes TestSprite atuais.
   - Logar como atleta com plano ativo.
   - Navegar para `http://localhost:3000/#trainings`.
   - Simular o fluxo de QR de forma determinística. Preferir expor em ambiente de teste uma chamada direta controlada a `studentTrainings.handleScanSuccess(validToken)` ou usar mock de câmera se já existir suporte no runner.
   - Verificar que a presença não é criada antes do questionário.
   - Preencher recuperação, bem-estar, uma dor opcional e peso.
   - Enviar o questionário.
   - Verificar toast ou histórico com presença confirmada.

2. `testsprite_tests/TC032_Complete_pre_training_questionnaire_before_manual_check_in.py`
   - Logar como admin.
   - Navegar para `http://localhost:3000/#trainings`.
   - Abrir `PRESENÇAS` de um treino do dia.
   - Clicar em um aluno ausente.
   - Verificar que o questionário abre antes da mudança visual para presente.
   - Fechar o questionário e confirmar que o aluno continua ausente.
   - Reabrir, preencher recuperação, bem-estar, dor opcional e peso.
   - Enviar e confirmar que o aluno passa para `PRESENTE`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `python3 testsprite_tests/TC031_Complete_pre_training_questionnaire_before_QR_check_in.py` passa contra servidor local na porta 3000.
- [x] `python3 testsprite_tests/TC032_Complete_pre_training_questionnaire_before_manual_check_in.py` passa contra servidor local na porta 3000.
- [ ] `deno check supabase/functions/asaas-checkout/index.ts` continua sem regressão se nenhuma função Supabase for alterada.

**Verificação Manual:**
- [ ] QR inválido não abre questionário.
- [ ] Atleta sem plano ativo não abre questionário.
- [ ] QR válido abre questionário, envia resposta e confirma presença.
- [ ] Cancelar no meio do questionário não confirma presença.
- [ ] Check-in manual abre questionário, envia resposta e confirma presença manual.
- [ ] Cancelar no meio do questionário manual mantém o atleta ausente.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| QR Code inválido | Mostrar erro atual e não abrir questionário. |
| Treino não é de hoje | Mostrar erro atual e não abrir questionário. |
| Atleta sem plano ativo | Mostrar erro atual e não abrir questionário. |
| Atleta fecha o questionário | Não inserir presença; permitir tentar novamente. |
| Admin fecha o questionário manual | Não inserir presença; manter atleta ausente. |
| Resposta já existe, presença ainda não | Pular questionário e tentar inserir presença. |
| Presença já existe | Mostrar `Sua presença já está confirmada neste treino!`. |
| Falha ao salvar questionário | Não inserir presença; mostrar erro e manter possibilidade de tentar novamente. |
| Dor selecionada sem intensidade | Bloquear avanço ou remover a região incompleta antes do resumo. |
| Peso inválido | Mostrar validação local e impedir envio até corrigir ou limpar o campo. |
| Offline após ler QR | Não salvar questionário nem presença; exibir erro de conexão do Supabase. |
| Asset corporal não carrega | Exibir fallback com botões textuais por região de dor. |

## Riscos e Mitigações

- Inconsistência entre questionário salvo e presença não criada -> aceitar retomada: se já houver resposta, o próximo scan pode concluir a presença sem refazer o questionário.
- RLS bloqueando o upsert por conflito de política -> validar insert e update separadamente após aplicar migration; se necessário, usar `select` + `insert/update` explícito no frontend em vez de `upsert`.
- Experiência longa demais antes do check-in -> manter etapas curtas, progresso visível e seleção por botões grandes.
- Check-in manual feito pelo admin grava resposta em nome do atleta -> registrar `source = 'manual'` e `submitted_by = adminId` para auditoria.
- Regiões clicáveis podem desalinhar dos SVGs em telas pequenas -> usar container com `aspect-ratio`, coordenadas percentuais e fallback textual.
- Cache PWA servindo JS antigo -> incrementar `CACHE_NAME` e listar o novo módulo no service worker.
- Teste automatizado instável por depender de câmera -> simular a chamada pós-scan ou mockar `Html5Qrcode` no teste.

## Rollback

1. Reverter alterações em `js/pages/student/trainings.js`, `js/pages/admin/trainings.js`, `js/pages/student/preTrainingQuestionnaire.js`, `assets/pre-training/body-front.svg`, `assets/pre-training/body-back.svg`, `css/components.css`, `service-worker.js` e testes novos.
2. Subir nova versão do service worker removendo o módulo do cache para clientes deixarem de buscar o arquivo.
3. Se necessário reverter dados, executar rollback SQL controlado:
   - remover políticas de `pre_training_questionnaires`;
   - `DROP TABLE public.pre_training_questionnaires;`
4. Confirmar que o QR voltou a inserir diretamente em `attendance` após validação de plano e treino do dia.
5. Confirmar que o admin voltou a marcar presença manual diretamente em `attendance`.

## Checklist Final

- [x] Scope implemented
- [ ] Migration applied and RLS validated
- [x] QR flow requires questionnaire before attendance insert
- [x] Manual admin attendance requires questionnaire before attendance insert
- [x] Body front/back assets created and aligned
- [x] Design system padrão preserved
- [ ] Mobile layout verified
- [x] Validation complete
- [ ] Rollback path verified
