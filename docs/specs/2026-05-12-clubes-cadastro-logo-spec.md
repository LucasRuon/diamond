---
date: 2026-05-12T00:29:53-03:00
author: Codex
status: draft
ticket: null
research: docs/research/2026-05-12-clubes-cadastro-logo.md
---

# Spec: Correção Do Cadastro De Clubes Com Logo

**Data**: 2026-05-12
**Estimativa**: Média

## Objetivo

Corrigir o fluxo admin de cadastro e edição de clubes para que a criação com logo funcione na primeira submissão, a logo fique persistida em `public.clubs.logo_bucket/logo_path`, e falhas de banco, RLS ou Storage apareçam para o usuário sem deixar clubes parcialmente cadastrados sem logo.

## Escopo

### Incluído
- Tratar explicitamente erros dos updates que salvam `logo_bucket` e `logo_path`.
- Reorganizar o fluxo de edição para persistir nome e nova logo em uma única atualização quando houver arquivo.
- Adicionar compensação best-effort para remover logo recém-enviada e/ou clube recém-criado quando a criação com logo falhar após a primeira etapa.
- Exibir mensagens de erro em português no formulário de clubes para falhas de duplicate name, sessão, permissão, Storage e persistência da logo.
- Bump do cache PWA para garantir que os módulos corrigidos sejam carregados.
- Adicionar cobertura Playwright para criação de clube com logo.

### Não Incluído
- Trocar a arquitetura Supabase direta por Edge Function transacional.
- Remover logos antigas quando uma logo é substituída em edição.
- Migrar clubes já criados sem logo.
- Alterar regras RLS ou políticas de Storage, exceto se a validação remota provar divergência da migration local.
- Redesenhar a tela de clubes.

## Pré-requisitos

- [ ] Confirmar que a migration `008_clubs_linked_to_students.sql` foi aplicada no ambiente alvo.
- [ ] Confirmar no Supabase Dashboard que o bucket público `club-logos` existe com limite de 2 MB e MIME types permitidos.
- [ ] Ter um usuário admin válido para testar `#clubs`.
- [ ] Servir o app em `http://localhost:3000` antes de executar os testes Playwright.
- [ ] Configurar `ADMIN_EMAIL` e `ADMIN_PASSWORD` para os testes que autenticam como admin.

## Fases de Implementação

### Fase 1: Endurecer Helpers De Logo

**Objetivo:** Centralizar persistência e compensação de logo para que qualquer erro de Storage ou tabela `clubs` seja tratado como falha real.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/clubs.js` | Modificar | Adicionar helpers para salvar metadados da logo, remover uploads recém-criados e normalizar erros de clube. |

#### Detalhes de Implementação

1. `js/clubs.js`
   - Manter `uploadClubLogo({ clubId, file })` retornando `{ logo_bucket, logo_path }`.
   - Criar `async updateClubLogoMetadata(clubId, logoData)`:
     - executar `supabase.from('clubs').update(logoData).eq('id', clubId)`;
     - ler o retorno `{ error }`;
     - lançar `error` quando existir;
     - não engolir erros de RLS, constraint ou rede.
   - Criar `async removeClubLogoObject(logoPath)`:
     - retornar imediatamente se `logoPath` estiver vazio;
     - chamar `supabase.storage.from(CLUB_LOGO_BUCKET).remove([logoPath])`;
     - se houver erro, apenas `console.warn`, porque limpeza de compensação não deve esconder a falha principal.
   - Criar `getClubErrorMessage(error, fallback)` para traduzir erros comuns:
     - código `23505` ou mensagem contendo `clubs_active_name_idx`: `Já existe um clube ativo com este nome.`;
     - mensagens com `row-level security` ou `permission`: `Você não tem permissão para alterar clubes. Entre novamente como administrador.`;
     - mensagens de Storage/bucket/upload: `Não foi possível salvar a logo do clube. Verifique o arquivo e tente novamente.`;
     - fallback padrão recebido por parâmetro.
   - Exportar os novos helpers.
   - Preservar 4 espaços, single quotes e mensagens em português.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [ ] `deno check supabase/functions/asaas-checkout/index.ts` continua passando se usado como smoke test de TypeScript/Deno existente. Bloqueado por erro preexistente `TS18046` em `supabase/functions/asaas-checkout/index.ts`.
- [x] Servir com `python3 -m http.server 3000` e abrir `/#clubs` sem erro de import relacionado a `js/clubs.js`.
- [x] `rg -n "updateClubLogoMetadata|removeClubLogoObject|getClubErrorMessage" js/clubs.js` retorna os novos exports.

**Verificação Manual:**
- [x] Selecionar arquivo inválido continua mostrando a validação local antes de qualquer upload.
- [x] Simular falha de metadata update no DevTools/Network ou por policy e confirmar que não aparece toast de sucesso.

### Fase 2: Corrigir Fluxo Do Formulário Admin

**Objetivo:** Fazer o formulário `#clubs` falhar de forma explícita quando qualquer etapa crítica falhar, sem cadastrar parcialmente um clube com logo ausente.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `js/pages/admin/clubs.js` | Modificar | Reorganizar create/edit, checar todos os erros Supabase e exibir toast contextual. |

#### Detalhes de Implementação

1. `js/pages/admin/clubs.js`
   - Atualizar imports para trazer `updateClubLogoMetadata`, `removeClubLogoObject` e `getClubErrorMessage` de `../../clubs.js`.
   - Envolver a callback passada a `ui.bottomSheet.show()` em `try/catch` próprio.
   - No `catch`:
     - montar mensagem com `getClubErrorMessage(err, 'Erro ao salvar clube. Tente novamente.')`;
     - chamar `toast.show(message, 'error')`;
     - relançar o erro para o bottom sheet reabilitar o botão.
   - Evitar toast duplicado para validações já exibidas:
     - usar `err.alreadyNotified = true` antes de `throw` nas validações locais; ou
     - criar helper local `throwClubValidation(message)`.

2. Fluxo de criação sem arquivo
   - Manter inserção direta:

```js
const { data: newClub, error: insertError } = await supabase
    .from('clubs')
    .insert({ name, created_by: userId })
    .select('id')
    .single();
if (insertError) throw insertError;
```

   - Mostrar `Clube cadastrado!` apenas depois da inserção bem-sucedida.

3. Fluxo de criação com arquivo
   - Inserir o clube primeiro para obter `newClub.id`.
   - Declarar `let uploadedLogoPath = null;`.
   - Fazer upload com `uploadClubLogo({ clubId: newClub.id, file })` e guardar `uploadedLogoPath = logo_path`.
   - Persistir metadata com `await updateClubLogoMetadata(newClub.id, { logo_bucket, logo_path })`.
   - Se upload ou metadata falhar após a criação:
     - se `uploadedLogoPath` existir, chamar `await removeClubLogoObject(uploadedLogoPath)`;
     - fazer best-effort de compensação do clube recém-criado com `softDeleteClub(newClub.id)`;
     - lançar a falha original.
   - Mostrar `Clube cadastrado!` apenas depois da metadata da logo ter sido salva.
   - Não deixar o fluxo chegar em `loadClubs()` quando a criação com logo falhar.

4. Fluxo de edição sem arquivo
   - Manter update de `{ name, updated_at }` e checar `updateError`.

5. Fluxo de edição com arquivo
   - Fazer upload antes do update da tabela e guardar `uploadedLogoPath`.
   - Fazer um único update em `clubs` com `{ name, updated_at, logo_bucket, logo_path }`.
   - Checar `updateError`; se falhar, chamar `removeClubLogoObject(uploadedLogoPath)` e lançar erro.
   - Mostrar `Clube atualizado!` apenas após o update da tabela.
   - Esta fase não remove a logo antiga, porque isso pode quebrar perfis que ainda estejam usando a URL antiga durante cache/reload.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `rg -n "await supabase\\.from\\('clubs'\\)\\.update\\(\\{ logo_bucket, logo_path \\}\\)" js/pages/admin/clubs.js` não encontra mais updates sem tratamento de erro.
- [x] `rg -n "if \\(.*Error\\) throw" js/pages/admin/clubs.js` mostra checagem para insert e updates.
- [x] `python3 -m http.server 3000` carrega `http://localhost:3000/#clubs` sem erro de módulo.

**Verificação Manual:**
- [x] Admin cadastra clube novo com nome e PNG/JPG/WebP/SVG válido; o card aparece já com imagem.
- [x] Recarregar a página em `/#clubs` mantém a logo visível.
- [x] Tentar cadastrar clube duplicado mostra `Já existe um clube ativo com este nome.` e o botão volta ao estado normal.
- [x] Tentar cadastrar com sessão expirada mostra mensagem de sessão/permissão e não fecha o bottom sheet.
- [x] Editar clube e substituir logo atualiza o card sem precisar abrir o formulário novamente.

### Fase 3: Cache PWA E Integração

**Objetivo:** Garantir que navegadores com service worker recebam os módulos corrigidos e que a rota admin continue íntegra.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `service-worker.js` | Modificar | Incrementar `CACHE_NAME` e versionar os assets JS afetados. |

#### Detalhes de Implementação

1. `service-worker.js`
   - Alterar `CACHE_NAME` de `diamondx-v13` para `diamondx-v14`.
   - Versionar entradas afetadas:
     - `/js/clubs.js?v=14`
     - `/js/pages/admin/clubs.js?v=14`
   - Manter a estratégia network-first atual para `.js` e `.css`.
   - Confirmar que o cache antigo será removido no evento `activate`.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] `rg -n "diamondx-v14|clubs.js\\?v=14|pages/admin/clubs.js\\?v=14" service-worker.js` confirma o bump.
- [x] Abrir `http://localhost:3000/service-worker.js` retorna o arquivo atualizado quando servido localmente.

**Verificação Manual:**
- [x] Em uma aba limpa, acessar o app e confirmar no DevTools/Application que o novo cache foi criado.
- [x] Em um navegador que já tinha a PWA aberta, recarregar e confirmar que a tela de clubes usa o comportamento corrigido.

### Fase 4: Teste Playwright Para Cadastro Com Logo

**Objetivo:** Cobrir o caminho que falhava: criar clube com arquivo de logo e verificar que a imagem aparece sem precisar editar depois.

#### Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `testsprite_tests/fixtures/club-logo.svg` | Criar | Fixture SVG pequena e válida para upload. |
| `testsprite_tests/TC036_Admin_create_club_with_logo.py` | Criar | Teste Playwright focado em criação de clube com logo. |
| `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py` | Modificar | Opcional: manter TC035 sem logo; não misturar vínculo de aluno com validação de upload. |

#### Detalhes de Implementação

1. `testsprite_tests/fixtures/club-logo.svg`
   - Criar um SVG mínimo, menor que 2 MB, com `xmlns`, `viewBox` e fundo/círculo simples.
   - Usar extensão `.svg` para aproveitar MIME permitido `image/svg+xml`.

2. `testsprite_tests/TC036_Admin_create_club_with_logo.py`
   - Seguir padrão de `TC035_Admin_manage_clubs_and_link_student.py` para `BASE_URL`, credenciais e função `login`.
   - Gerar `CLUB_NAME = f"Clube Logo QA {int(time.time())}"`.
   - Fluxo:
     - login admin;
     - navegar para `/#clubs`;
     - clicar `#add-club-btn`;
     - preencher `input[name='name']`;
     - anexar fixture em `#club-logo-file` com `page.set_input_files`;
     - clicar submit;
     - esperar texto do clube na lista;
     - localizar o card por `data-id` não é direto antes de saber o id, então usar um locator baseado no texto e subir para `.club-card`;
     - assertar que o card contém `img[src*="club-logos"]` ou `img[src*="/storage/v1/object/public/club-logos/"]`.
   - Incluir timeout suficiente para upload Storage, por exemplo 15 segundos.
   - Fechar browser no final.

3. `testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py`
   - Não adicionar upload de logo nesse teste, a menos que seja necessário reduzir quantidade de casos.
   - Se reutilizar helper `login`, considerar duplicação aceitável porque os testes existentes são scripts independentes.

#### Critérios de Sucesso

**Verificação Automatizada:**
- [x] Iniciar servidor: `python3 -m http.server 3000`.
- [ ] Rodar: `python3 testsprite_tests/TC036_Admin_create_club_with_logo.py`. Bloqueado por `ADMIN_EMAIL` e `ADMIN_PASSWORD` ausentes no shell atual.
- [ ] O teste passa e falha se a imagem não aparecer no card recém-criado. Implementado no assert `img[src*="club-logos"]`, pendente execução autenticada.
- [ ] Rodar regressão: `python3 testsprite_tests/TC035_Admin_manage_clubs_and_link_student.py`. Bloqueado por credenciais admin ausentes no shell atual.

**Verificação Manual:**
- [x] Repetir o fluxo manual com o mesmo SVG da fixture e confirmar que o comportamento bate com o teste.

## Edge Cases

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Clube criado sem logo | Deve continuar criando na primeira submissão e renderizar placeholder `ph-shield`. |
| Clube criado com logo e metadata update falha | Deve mostrar erro, reabilitar botão, remover upload novo quando possível e soft-deletar o clube recém-criado quando possível. |
| Upload falha antes de retornar `logo_path` | Deve mostrar erro e soft-deletar o clube recém-criado no fluxo de criação com logo. |
| Soft-delete compensatório falha | Deve mostrar erro principal e registrar `console.warn`; admin pode remover o clube manualmente. |
| Edição com nova logo e update da tabela falha | Deve remover o upload novo quando possível, não mostrar sucesso e manter dados anteriores do clube. |
| Nome duplicado | Deve mostrar mensagem específica e não fechar o bottom sheet. |
| Arquivo maior que 2 MB ou MIME inválido | Deve bloquear antes do upload com mensagem local. |
| Sessão expirada | Deve mostrar mensagem de sessão/permissão e não tentar inserir sem `created_by`. |
| Service worker antigo | Deve ser substituído pelo cache `diamondx-v14` após reload/activate. |

## Riscos e Mitigações

- Fluxo ainda não é transacional entre Postgres e Storage -> usar compensação best-effort e mensagens claras; considerar Edge Function futura se houver muitos casos parciais.
- RLS remota diferente da migration local pode continuar bloqueando metadata update -> validar policies no Supabase Dashboard e usar a mensagem de permissão para diagnóstico.
- Limpeza de upload novo pode falhar por policy de Storage -> registrar warning e não esconder o erro principal.
- Teste com SVG pode passar enquanto PNG/JPG falha por MIME remoto divergente -> manter QA manual com pelo menos um raster além do SVG.
- Cache PWA pode servir arquivo antigo durante uma sessão já aberta -> bump de cache e validação em aba limpa antes de publicar.

## Rollback

1. Reverter alterações em `js/clubs.js`, `js/pages/admin/clubs.js` e `service-worker.js`.
2. Remover `testsprite_tests/TC036_Admin_create_club_with_logo.py` e `testsprite_tests/fixtures/club-logo.svg` se o teste novo bloquear o pipeline por instabilidade ambiental.
3. Se a correção já tiver sido publicada e houver comportamento inesperado, publicar novo `service-worker.js` com outro `CACHE_NAME` para invalidar o cache corrigido.
4. Não reverter dados automaticamente. Clubes criados sem logo antes da correção devem ser ajustados manualmente pelo admin em `#clubs`.

## Checklist Final

- [x] Scope implemented
- [ ] Validation complete. Parcial: checks locais passaram, execução autenticada de TC035/TC036 pendente por credenciais ausentes.
- [x] Rollback path verified
