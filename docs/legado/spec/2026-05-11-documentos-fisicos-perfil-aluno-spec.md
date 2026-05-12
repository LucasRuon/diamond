---
date: 2026-05-11T20:36:24-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-11-documentos-fisicos-perfil-aluno.md
---

# Spec: Upload de Ficha do Aluno

**Data**: 2026-05-11
**Estimativa**: Média

## Objetivo

Criar uma tela administrativa para vincular arquivos da ficha física ao perfil de um aluno, com upload de PDF, imagens, TXT e documentos Word para Supabase Storage privado. Os documentos devem ficar visíveis para administradores e para o próprio aluno no painel/perfil do aluno, sem expor URLs públicas permanentes.

## Escopo

### Incluído
- Criar persistência de metadados em `public.student_documents`.
- Criar bucket privado `student-documents` e políticas RLS para Storage.
- Criar módulo compartilhado para listar, validar, subir, arquivar e abrir documentos via URL assinada.
- Criar tela admin `#student-documents` para buscar alunos, selecionar um aluno, fazer upload da ficha e ver documentos vinculados.
- Adicionar entrada para a tela no painel admin e ação rápida na lista de usuários para alunos.
- Exibir os documentos visíveis no perfil do aluno.
- Manter o link legado `users.athlete_record_url` enquanto houver dados antigos.
- Criar teste Playwright/TestSprite para o fluxo principal de upload e visualização.

### Não Incluído
- OCR, leitura automática ou extração de dados da ficha.
- Edição colaborativa de documentos.
- Upload feito pelo próprio aluno.
- Compartilhamento de documentos com responsáveis/empresários.
- Remoção física automática de arquivos órfãos por job agendado.

## Pré-requisitos

- [ ] Aplicar a migration no Supabase antes de publicar o frontend.
- [ ] Confirmar no projeto remoto que não existe bucket/manual policy conflitante para documentos de aluno.
- [ ] Ter um usuário admin de teste e ao menos um usuário aluno de teste.
- [ ] Ter um arquivo pequeno de teste, por exemplo PDF ou PNG abaixo de 10 MB.

## Fases de Implementação

### Fase 1: Persistência, Bucket Privado e RLS

**Objetivo:** Criar a estrutura segura para armazenar metadados e objetos de documentos sem URLs públicas.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `migrations/007_student_documents.sql` | Criar | Tabela `student_documents`, bucket privado `student-documents`, índices, grants e políticas RLS. |

#### Detalhes de Implementação

1. `migrations/007_student_documents.sql`
   - Criar bucket privado:
     - `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (...) on conflict (id) do update ...`
     - `id/name`: `student-documents`
     - `public`: `false`
     - `file_size_limit`: `10485760`
     - `allowed_mime_types`: `application/pdf`, `text/plain`, `image/jpeg`, `image/png`, `image/webp`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
   - Criar `public.student_documents`:
     - `id uuid primary key default gen_random_uuid()`
     - `student_id uuid not null references public.users(id) on delete cascade`
     - `uploaded_by uuid references public.users(id) on delete set null`
     - `title text not null`
     - `document_type text not null default 'athlete_record'`
     - `storage_bucket text not null default 'student-documents'`
     - `storage_path text not null unique`
     - `original_file_name text not null`
     - `mime_type text not null`
     - `file_size integer not null check (file_size > 0 and file_size <= 10485760)`
     - `visible_to_student boolean not null default true`
     - `uploaded_at timestamptz not null default now()`
     - `deleted_at timestamptz`
   - Adicionar checks:
     - `document_type in ('athlete_record', 'medical', 'authorization', 'other')`
     - `storage_bucket = 'student-documents'`
     - `title` não vazio.
   - Criar índices:
     - `(student_id, deleted_at, uploaded_at desc)`
     - `(uploaded_by)`
     - `(document_type)`
   - Ativar RLS e conceder `select, insert, update` para `authenticated`.
   - Política `student_documents_select`:
     - admin vê todos os documentos não deletados;
     - aluno vê apenas documentos próprios, não deletados e com `visible_to_student = true`.
   - Política `student_documents_insert`:
     - apenas admin pode inserir;
     - `uploaded_by = auth.uid()`;
     - `student_id` deve apontar para usuário com `role = 'student'`;
     - `deleted_at is null`.
   - Política `student_documents_update`:
     - apenas admin pode atualizar;
     - manter `student_id`, `storage_bucket`, `storage_path`, `mime_type`, `file_size` e `uploaded_by` sem troca para outro documento;
     - permitir alterar `title`, `document_type`, `visible_to_student` e marcar `deleted_at`.
   - Criar políticas em `storage.objects` para bucket `student-documents`:
     - `select`: admin pode ler qualquer objeto; aluno pode ler objeto se existir metadado em `student_documents` com `storage_path = storage.objects.name`, `student_id = auth.uid()`, `visible_to_student = true` e `deleted_at is null`.
     - `insert`: apenas admin pode inserir objetos nesse bucket.
     - `delete`: apenas admin pode excluir objetos nesse bucket.
   - Usar caminho de Storage no formato `${student_id}/${document_id}.${ext}` para facilitar auditoria e limpeza.
   - Finalizar com `notify pgrst, 'reload schema';`.

#### Critérios de Sucesso

#### Progresso de Implementação

- [x] `migrations/007_student_documents.sql` criado com bucket privado, tabela, índices, grants, RLS de metadados e políticas de Storage.
- [ ] Migration aplicada e validada no Supabase com usuários admin, aluno dono e aluno não dono.

**Verificação Automatizada:**
- [ ] Executar a migration no Supabase sem erro.
- [ ] Como admin autenticado, inserir metadado para aluno e subir objeto no bucket `student-documents`.
- [ ] Como aluno autenticado, selecionar apenas documentos próprios visíveis.
- [ ] Como outro aluno autenticado, não conseguir selecionar nem gerar URL assinada para documento alheio.

**Verificação Manual:**
- [ ] Confirmar no Supabase Dashboard que o bucket `student-documents` está privado.
- [ ] Confirmar que não há URL pública permanente para arquivos enviados.

### Fase 2: Módulo Compartilhado de Documentos

**Objetivo:** Centralizar regras de validação, upload, listagem e abertura dos documentos para reutilizar entre admin e perfil do aluno.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/studentDocuments.js` | Criar | API client-side para documentos de aluno e validação de arquivos. |

#### Detalhes de Implementação

1. `js/studentDocuments.js`
   - Importar `supabase` de `./supabase.js`.
   - Exportar constantes:
     - `STUDENT_DOCUMENT_BUCKET = 'student-documents'`
     - `MAX_STUDENT_DOCUMENT_SIZE = 10 * 1024 * 1024`
     - mapa `ALLOWED_STUDENT_DOCUMENT_TYPES` com MIME type, extensões aceitas e label.
   - Exportar `validateStudentDocumentFile(file)`:
     - rejeitar arquivo ausente;
     - rejeitar tamanho acima de 10 MB;
     - rejeitar MIME type fora da lista;
     - validar extensão coerente com o MIME type quando possível;
     - retornar mensagem em português.
   - Exportar `async listStudentDocuments(studentId, options = {})`:
     - consultar `student_documents`;
     - por padrão filtrar `deleted_at is null`;
     - ordenar por `uploaded_at desc`;
     - se `options.includeHidden` for `false`, filtrar `visible_to_student = true`.
   - Exportar `async uploadStudentDocument({ studentId, file, title, documentType, visibleToStudent, uploadedBy })`:
     - validar `studentId`, `file` e `title`;
     - gerar `documentId = crypto.randomUUID()`;
     - montar `storagePath = `${studentId}/${documentId}.${ext}``;
     - subir para Storage com `cacheControl: '3600'` e `upsert: false`;
     - inserir metadado em `student_documents`;
     - se a inserção do metadado falhar, tentar remover o objeto recém-enviado para reduzir órfão;
     - retornar o metadado salvo.
   - Exportar `async createStudentDocumentSignedUrl(documentRecord)`:
     - usar `supabase.storage.from(documentRecord.storage_bucket).createSignedUrl(documentRecord.storage_path, 300)`;
     - retornar URL válida por 5 minutos.
   - Exportar `async archiveStudentDocument(documentRecord)`:
     - atualizar `deleted_at` com `new Date().toISOString()`;
     - manter o objeto físico no Storage para rollback/auditoria inicial.
   - Exportar helpers de formatação:
     - `formatDocumentSize(bytes)`;
     - `formatDocumentDate(isoDate)`;
     - `getDocumentTypeLabel(documentType)`.

#### Critérios de Sucesso

#### Progresso de Implementação

- [x] `js/studentDocuments.js` criado com constantes, validação de arquivo, listagem, upload, URL assinada, arquivamento e helpers de formatação.
- [x] Validação local confirmou erro em português para MIME bloqueado e limite de 10 MB.
- [x] Módulo servido em `http://127.0.0.1:3000/js/studentDocuments.js` com `Content-type: text/javascript`.

**Verificação Automatizada:**
- [x] Servir o app com `python3 -m http.server 3000`.
- [x] Abrir `/js/studentDocuments.js` no navegador/console sem erro de módulo.
- [x] Validar manualmente via console que arquivo com MIME bloqueado retorna erro antes do upload.

**Verificação Manual:**
- [ ] Mensagens de erro de arquivo aparecem em português e explicam o limite aceito.

### Fase 3: Tela Administrativa de Upload

**Objetivo:** Dar ao admin uma tela dedicada para selecionar aluno, subir ficha e gerenciar documentos vinculados.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/admin/studentDocuments.js` | Criar | Tela admin de busca/listagem de alunos, upload e lista de documentos. |
| `js/app.js` | Modificar | Importar a tela, registrar rota `#student-documents` e proteger como admin-only. |
| `js/pages/admin/dashboard.js` | Modificar | Adicionar card/link para documentos de alunos. |
| `js/pages/admin/users.js` | Modificar | Adicionar ação rápida de ficha em cards de usuários com `role = 'student'`. |

#### Detalhes de Implementação

1. `js/pages/admin/studentDocuments.js`
   - Importar `supabase`, `toast`, `ui`, `escapeHtml`, `safeUrl` quando necessário e funções de `../../studentDocuments.js`.
   - Exportar `adminStudentDocuments` com:
     - `selectedStudentId`
     - `students`
     - `async render(initialStudentId = null)`
     - `async loadStudents(searchTerm = '')`
     - `async selectStudent(studentId)`
     - `renderStudentList()`
     - `renderSelectedStudentPanel()`
     - `showUploadForm()`
     - `async openDocument(documentId)`
     - `async archiveDocument(documentId)`
   - Header:
     - título `FICHAS DOS ALUNOS`;
     - botão voltar para `#dashboard` ou `#users`;
     - logo atual.
   - Busca de alunos:
     - consultar `users` com `role = 'student'`;
     - selecionar `id, full_name, email, cpf, phone, avatar_url`;
     - filtrar localmente por nome/email enquanto o usuário digita.
   - Seleção via query:
     - aceitar `#student-documents?studentId=<uuid>`;
     - se informado, pré-selecionar o aluno.
   - Painel do aluno selecionado:
     - mostrar dados resumidos do aluno;
     - botão `ENVIAR FICHA`;
     - lista de documentos com ícone por tipo, título, nome original, tamanho, data, visibilidade e ações `abrir`/`arquivar`.
   - `showUploadForm()`:
     - abrir `ui.bottomSheet.show('Enviar ficha', ...)`;
     - campos:
       - título obrigatório, padrão `Ficha do aluno`;
       - tipo: `Ficha do atleta`, `Médico`, `Autorização`, `Outro`;
       - arquivo obrigatório com `accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,.doc,.docx"`;
       - checkbox `Visível para o aluno` marcado por padrão.
     - Como `ui.bottomSheet.show()` hoje converte `FormData` em objeto simples e perde `File`, ler o arquivo diretamente por `document.getElementById('student-document-file').files[0]` dentro do callback `onSave`.
     - Chamar `uploadStudentDocument(...)`.
     - Recarregar o painel do aluno ao concluir.
   - `openDocument(documentId)`:
     - localizar documento em memória;
     - criar URL assinada;
     - `window.open(url, '_blank', 'noopener,noreferrer')`;
     - se popup for bloqueado, renderizar link temporário clicável.
   - `archiveDocument(documentId)`:
     - confirmar com `confirm('Arquivar este documento?')`;
     - chamar `archiveStudentDocument`;
     - recarregar lista.

2. `js/app.js`
   - Importar `adminStudentDocuments` de `./pages/admin/studentDocuments.js`.
   - Incluir `#student-documents` em `adminRoutes`.
   - Adicionar case:
     - `case '#student-documents': await adminStudentDocuments.render(params.get('studentId')); break;`
   - Manter hash routing existente.

3. `js/pages/admin/dashboard.js`
   - Adicionar card após `Questionários pré-treino`:
     - link `href="#student-documents"`;
     - ícone `ph ph-folder-open`;
     - texto `Fichas dos alunos`;
     - subtítulo `Enviar e consultar documentos vinculados`.

4. `js/pages/admin/users.js`
   - Em cards de usuários com `role === 'student'`, adicionar botão pequeno com ícone `ph ph-file-arrow-up`.
   - O botão deve usar `event.stopPropagation()` para não abrir a edição do usuário.
   - Ao clicar, navegar para `#student-documents?studentId=${encodeURIComponent(user.id)}`.

#### Critérios de Sucesso

#### Progresso de Implementação

- [x] `js/pages/admin/studentDocuments.js` criado com busca de alunos, seleção via query, painel do aluno, envio, abertura por URL assinada e arquivamento.
- [x] Rota `#student-documents` registrada em `js/app.js` e protegida como admin-only.
- [x] Card `Fichas dos alunos` adicionado ao painel admin.
- [x] Ação rápida de ficha adicionada para usuários com `role = 'student'`.
- [x] Checks de rota com Playwright mockado confirmaram render admin e redirecionamento de aluno para `#dashboard`.

**Verificação Automatizada:**
- [x] `python3 -m http.server 3000` serve o app.
- [x] Abrir `http://localhost:3000/#student-documents` como admin sem erro de módulo no console.
- [x] Abrir `http://localhost:3000/#student-documents` como aluno redireciona para `#dashboard`.

**Verificação Manual:**
- [ ] Admin consegue buscar e selecionar um aluno.
- [ ] Admin consegue subir PDF ou imagem abaixo de 10 MB.
- [ ] Após upload, o documento aparece na lista do aluno selecionado.
- [ ] O botão de abrir gera URL assinada e abre o documento.
- [ ] O botão de arquivar remove o documento da lista ativa sem quebrar a tela.

### Fase 4: Visualização no Perfil do Aluno

**Objetivo:** Exibir no painel/perfil do aluno os documentos que o admin marcou como visíveis.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/app.js` | Modificar | Adicionar card de documentos no perfil do aluno e abertura via URL assinada. |

#### Detalhes de Implementação

1. `js/app.js`
   - Importar `listStudentDocuments`, `createStudentDocumentSignedUrl`, `formatDocumentSize`, `formatDocumentDate` e `getDocumentTypeLabel` de `./studentDocuments.js`.
   - No card de `FICHA DO ATLETA`, manter o link legado `athlete_record_url` quando existir.
   - Ainda dentro do bloco `currentRole === 'student'`, adicionar card:
     - título `DOCUMENTOS DA FICHA`;
     - container `id="student-profile-documents"`;
     - estado inicial `Carregando documentos...`.
   - Após os listeners de `renderProfile()`, chamar `this.renderStudentProfileDocuments()` se o papel atual for `student`.
   - Criar `async renderStudentProfileDocuments()`:
     - consultar `listStudentDocuments(this.user.id, { includeHidden: false })`;
     - se não houver documentos, mostrar `Nenhum documento disponível.`;
     - renderizar lista compacta com título, tipo, data, tamanho e botão de abrir.
   - Criar `async openStudentProfileDocument(documentId)`:
     - buscar no array renderizado ou consultar novamente;
     - gerar URL assinada;
     - abrir em nova aba com `window.open`;
     - mostrar toast de erro se a URL não puder ser criada.
   - Não permitir upload, edição ou arquivamento no perfil do aluno.

#### Critérios de Sucesso

#### Progresso de Implementação

- [x] `js/app.js` importa helpers de documentos do aluno.
- [x] Perfil do aluno renderiza o card `DOCUMENTOS DA FICHA` com estado de carregamento, lista compacta e estado vazio.
- [x] Link legado `athlete_record_url` permanece no card `FICHA DO ATLETA`.
- [x] `renderStudentProfileDocuments()` lista apenas documentos visíveis via `includeHidden: false`.
- [x] `openStudentProfileDocument()` gera URL assinada e abre o documento em nova aba.
- [x] Checks de perfil com Playwright mockado confirmaram documento visível, estado vazio e link legado.

**Verificação Automatizada:**
- [x] Como aluno com documento visível, abrir `/#profile` sem erro no console.
- [x] Como aluno sem documento visível, o perfil mostra estado vazio.

**Verificação Manual:**
- [ ] Documento enviado pelo admin aparece no perfil do aluno correto.
- [ ] Documento arquivado ou marcado como não visível deixa de aparecer para o aluno.
- [ ] Link legado `athlete_record_url` continua funcionando quando preenchido.
- [ ] Aluno não consegue abrir documento de outro aluno alterando URL/ID no console.

### Fase 5: Estilos e Teste de Regressão

**Objetivo:** Finalizar a experiência visual mobile-first e cobrir o fluxo principal com teste.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `css/pages.css` | Modificar | Classes da tela de documentos, lista, dropzone e ações compactas. |
| `testsprite_tests/TC034_Admin_upload_student_ficha_document.py` | Criar | Teste Playwright do fluxo admin envia ficha e aluno visualiza. |

#### Detalhes de Implementação

1. `css/pages.css`
   - Adicionar classes:
     - `.student-documents-layout`
     - `.student-documents-search`
     - `.student-documents-student-list`
     - `.student-documents-student-card`
     - `.student-documents-selected`
     - `.student-document-list`
     - `.student-document-item`
     - `.student-document-actions`
     - `.student-document-upload-hint`
   - Reusar tokens existentes: `var(--dx-surface)`, `var(--dx-surface2)`, `var(--dx-border)`, `var(--dx-teal)`, `var(--dx-muted)`, `var(--radius-md)`.
   - Garantir que botões de ação tenham largura estável e que textos longos de arquivos quebrem linha sem sobrepor ícones.
   - Manter layout de uma coluna em mobile e no máximo duas colunas em telas largas.

2. `testsprite_tests/TC034_Admin_upload_student_ficha_document.py`
   - Seguir padrão dos testes existentes.
   - Servidor esperado: `http://127.0.0.1:3000`.
   - Fluxo:
     - login como admin;
     - abrir `/#student-documents`;
     - selecionar aluno de teste;
     - subir arquivo fixture pequeno;
     - verificar item na lista;
     - abrir sessão como aluno ou refazer login como aluno;
     - abrir `/#profile`;
     - verificar que `DOCUMENTOS DA FICHA` mostra o documento.
   - Criar fixture temporária dentro do próprio teste se os testes existentes não tiverem pasta de fixtures.
   - Evitar depender de arquivo remoto.

#### Critérios de Sucesso

#### Progresso de Implementação

- [x] `css/pages.css` atualizado com classes mobile-first para busca, lista de alunos, painel selecionado, lista de documentos, ações e dica de upload.
- [x] `testsprite_tests/TC034_Admin_upload_student_ficha_document.py` criado com fluxo determinístico mockado: admin envia ficha e aluno visualiza no perfil.
- [x] `TC034` cria fixture temporária local durante a execução e não depende de arquivo remoto.
- [x] `deno check supabase/functions/admin-update-user/index.ts` continua passando.

**Verificação Automatizada:**
- [x] `python3 -m http.server 3000`
- [x] `python3 testsprite_tests/TC034_Admin_upload_student_ficha_document.py`
- [x] `deno check supabase/functions/admin-update-user/index.ts` continua passando, confirmando que a feature não exigiu alteração no Edge Function existente.

**Verificação Manual:**
- [ ] Em 360px, 390px e desktop, a tela admin não tem texto sobreposto.
- [ ] Upload mostra feedback de progresso e erro em português.
- [ ] Perfil do aluno continua com espaçamento correto acima da bottom nav.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Admin tenta subir arquivo acima de 10 MB | Upload é bloqueado antes de chamar Storage e mostra erro em português. |
| Admin tenta subir `.exe`, `.zip` ou MIME não permitido | Upload é bloqueado e nenhum metadado é criado. |
| Upload no Storage passa, mas insert em `student_documents` falha | App tenta remover o objeto recém-enviado e mostra erro ao admin. |
| Documento arquivado | Não aparece para aluno nem na lista ativa do admin; metadado permanece para auditoria. |
| Aluno tenta acessar documento de outro aluno | RLS impede seleção/criação de URL assinada. |
| Popup bloqueado ao abrir documento | Tela mostra link temporário gerado por URL assinada. |
| `athlete_record_url` antigo existe | Perfil continua mostrando `VER FICHA COMPLETA` além da nova lista de documentos. |
| Aluno sem documentos | Card exibe estado vazio sem erro. |

## Riscos e Mitigações

- RLS de Storage incorreta pode expor documentos sensíveis -> usar bucket privado, URL assinada curta e teste explícito com aluno diferente.
- Metadado pode ficar divergente do objeto se uma etapa falhar -> fazer upload primeiro, inserir metadado depois e remover o objeto se o insert falhar.
- `ui.bottomSheet.show()` não entrega `File` no objeto salvo -> ler o input de arquivo pelo DOM dentro do callback e documentar esse detalhe no código.
- Arquivos Word podem ter MIME inconsistente no navegador -> validar MIME e extensão com mensagens claras, aceitando apenas extensões permitidas quando o MIME vier genérico.
- A lista admin pode ficar pesada com muitos alunos -> implementar busca local inicialmente e deixar paginação como evolução se houver volume real.

## Rollback

1. Reverter imports/rotas em `js/app.js`, cards em `js/pages/admin/dashboard.js`, ação rápida em `js/pages/admin/users.js`, alterações em `css/pages.css` e remover `js/pages/admin/studentDocuments.js`/`js/studentDocuments.js`.
2. No Supabase, desabilitar a entrada visual não afeta dados existentes; os documentos permanecem privados no bucket.
3. Para rollback completo de dados, arquivar ou exportar registros de `public.student_documents`, remover objetos do bucket `student-documents`, dropar políticas, dropar tabela e remover bucket.
4. Manter `users.athlete_record_url` intacto durante todo o rollback, pois é legado e não depende da nova estrutura.

## Checklist Final

- [ ] Migration aplicada no ambiente alvo.
- [ ] Bucket privado e políticas validadas com admin, aluno dono e aluno não dono.
- [x] Tela admin criada e acessível por `#student-documents`.
- [x] Ação rápida em `#users` abre a tela com aluno pré-selecionado.
- [x] Perfil do aluno lista documentos visíveis e abre via URL assinada.
- [x] Arquivo inválido e arquivo grande são bloqueados no cliente.
- [x] Teste `TC034_Admin_upload_student_ficha_document.py` executado.
- [ ] Rollback path verificado.
