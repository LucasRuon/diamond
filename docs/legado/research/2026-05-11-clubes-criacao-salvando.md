---
date: 2026-05-11
researcher: claude
research_question: "Na tela de Clubes, ao criar um novo clube fica apenas em 'Salvando...' e nada acontece"
status: complete
---

# Pesquisa: Fluxo de criação de Clube travando em "SALVANDO..."

## Resumo

O fluxo de criação de clube na tela admin envolve 4 camadas:

1. UI do formulário em bottom-sheet — `js/pages/admin/clubs.js`
2. Submit genérico do bottom-sheet (controla o botão "SALVANDO...") — `js/ui.js`
3. Insert direto na tabela `public.clubs` via Supabase JS — `js/pages/admin/clubs.js:174-184`
4. Políticas RLS de INSERT/SELECT na tabela — `migrations/008_clubs_linked_to_students.sql:44-66`

O botão fica preso em "SALVANDO..." quando a Promise retornada pelo callback `onSave` em `ui.js:63` **não resolve nem rejeita** — ou seja, alguma chamada `await` interna a esse callback fica pendente indefinidamente. Os pontos abaixo mapeiam onde isso pode ocorrer.

## Fluxo detalhado

### 1. Disparo do formulário

- `js/pages/admin/clubs.js:36` — botão `#add-club-btn` chama `this.showClubForm()` sem argumento (modo "novo").
- `js/pages/admin/clubs.js:119-141` — `showClubForm()` monta o HTML do `<form id="club-form">` e injeta no bottom-sheet via `ui.bottomSheet.show(...)`.

### 2. Comportamento do bottom-sheet ao submeter

`js/ui.js:50-69` é onde o texto "SALVANDO..." é controlado:

```js
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-circle-notch-bold"></i> SALVANDO...';

    try {
        await onSave(data);
        close();
    } catch (err) {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});
```

Pontos importantes:

- O botão só volta ao estado original em dois caminhos: (a) sucesso → `close()` em `ui.js:64` (a sheet é removida), ou (b) erro lançado dentro de `onSave` → restauração do botão em `ui.js:66-68`.
- **Se a Promise não resolver nem rejeitar, o botão fica eternamente em "SALVANDO..."**.
- O `catch` em `ui.js:65-68` **não exibe nenhum toast nem log** — se `onSave` lançar, o usuário só vê o botão voltando ao estado normal, sem mensagem de erro. Isso significa que erros silenciosos (ex.: RLS) podem se manifestar como "voltou ao normal sem feedback", e não como "preso em Salvando".

### 3. Callback `onSave` em criação de clube

`js/pages/admin/clubs.js:142-190` — o callback async passado ao bottom-sheet executa, em sequência, para o modo de criação (sem `club` existente):

```js
ui.bottomSheet.show(club ? 'Editar Clube' : 'Novo Clube', formHtml, async (data) => {
    const name = data.name?.trim();
    if (!name) {
        toast.show('Informe o nome do clube.', 'error');
        throw new Error('Nome obrigatório.');
    }

    const fileInput = document.getElementById('club-logo-file');
    const file = fileInput?.files?.[0] || null;

    if (file) {
        const validationError = validateClubLogoFile(file);
        if (validationError) {
            toast.show(validationError, 'error');
            throw new Error(validationError);
        }
    }

    if (club) {
        // ...edição
    } else {
        const { data: newClub, error: insertError } = await supabase
            .from('clubs')
            .insert({ name, created_by: (await supabase.auth.getUser()).data.user?.id })
            .select('id')
            .single();                                  // js/pages/admin/clubs.js:174-178
        if (insertError) throw insertError;             // js/pages/admin/clubs.js:179

        if (file) {
            const { logo_bucket, logo_path } = await uploadClubLogo({ clubId: newClub.id, file });
            await supabase.from('clubs').update({ logo_bucket, logo_path }).eq('id', newClub.id);
        }

        toast.show('Clube cadastrado!');
    }

    await this.loadClubs();                             // js/pages/admin/clubs.js:189
});
```

Pontos onde a Promise pode ficar pendente sem resolver:

- **`js/pages/admin/clubs.js:176`** — `await supabase.auth.getUser()`. Se o token de sessão estiver corrompido ou o cliente Supabase estiver tentando refresh com erro de rede, essa Promise pode pendurar.
- **`js/pages/admin/clubs.js:174-178`** — o insert + `.select('id').single()`. Se houver problema de conexão (offline, CORS, DNS), o fetch interno pode não resolver. Em condições normais o supabase-js retorna `{ error }` em vez de pendurar, mas falhas de fetch antes do response chegam ao `await` sem timeout no SDK.
- **`js/pages/admin/clubs.js:189`** — `await this.loadClubs()`. Se o insert sucedeu mas o reload de lista (outra query a `clubs`) trava, o botão segue em "SALVANDO..." mesmo com o clube já criado no banco.

### 4. Cenários de erro silencioso vs. erro travado

Comportamento esperado por cenário:

| Cenário | O que acontece |
|---|---|
| Nome vazio | `throw` em `clubs.js:146` → `ui.js:66-68` restaura botão. Toast "Informe o nome do clube." exibido. |
| Usuário não é `admin` | `insertError` retornado pelo Supabase (violação RLS `clubs_insert`, `migrations/008_…:54-59`). `throw insertError` em `clubs.js:179` → botão restaurado, mas **sem toast** (o `catch` em `ui.js:65-68` não chama `toast.show`). Para o usuário, parece "voltou ao normal e nada salvou". |
| Nome duplicado entre clubes ativos | Conflito no índice único `clubs_active_name_idx` (`migrations/008_…:33-35`). Mesma trajetória do caso acima — botão restaura sem toast. |
| `select().single()` não consegue ler a linha de volta | Erro com mensagem do tipo "JSON object requested, multiple (or no) rows returned". Mesmo caminho — restaura botão sem feedback. |
| Falha de rede no `await supabase.auth.getUser()` ou no `insert` | Promise não rejeita imediatamente; o supabase-js não impõe timeout no fetch. Resultado: **botão preso em "SALVANDO..." indefinidamente**. |
| `loadClubs()` (após insert OK) trava | Clube já existe no banco, mas botão segue em "SALVANDO..." até o usuário fechar a sheet manualmente. |

### 5. Política RLS de INSERT (camada SQL)

`migrations/008_clubs_linked_to_students.sql:54-59`:

```sql
CREATE POLICY clubs_insert ON public.clubs
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    AND created_by = auth.uid()
  );
```

Requisitos para o insert passar:

- O usuário autenticado precisa ter `role = 'admin'` em `public.users`.
- O campo `created_by` enviado precisa ser exatamente `auth.uid()` (o frontend cumpre isso em `clubs.js:176`).

A política `clubs_select` em `migrations/008_…:49-51` exige `deleted_at IS NULL` — recém-inseridos atendem (default NULL), então `.select('id').single()` deve conseguir ler o registro novo.

### 6. Cliente Supabase

- `js/supabase.js` (cliente único via CDN) — URL e anon key hardcoded. Não há configuração de timeout customizado para fetch.

## Code References

- `js/pages/admin/clubs.js:36` — botão de "Novo Clube" liga `showClubForm()`
- `js/pages/admin/clubs.js:142-190` — callback `onSave` que executa o insert
- `js/pages/admin/clubs.js:174-178` — chamada `supabase.from('clubs').insert(...).select('id').single()`
- `js/pages/admin/clubs.js:176` — `(await supabase.auth.getUser()).data.user?.id` para preencher `created_by`
- `js/pages/admin/clubs.js:179` — `throw insertError` (único propagador de erro do insert)
- `js/pages/admin/clubs.js:189` — `await this.loadClubs()` após sucesso
- `js/ui.js:52-69` — handler de submit do bottom-sheet (define "SALVANDO..." e o que faz no sucesso/erro)
- `js/ui.js:60` — string exata `'<i class="ph ph-circle-notch-bold"></i> SALVANDO...'`
- `js/ui.js:63-68` — único caminho que tira o botão de "SALVANDO..." (sucesso fecha sheet; erro restaura sem toast)
- `js/clubs.js:25-39` — `uploadClubLogo` (só usado se houver arquivo)
- `migrations/008_clubs_linked_to_students.sql:19-30` — schema da tabela `clubs`
- `migrations/008_clubs_linked_to_students.sql:33-35` — índice único parcial por nome ativo (case-insensitive)
- `migrations/008_clubs_linked_to_students.sql:54-59` — política RLS `clubs_insert` (exige admin + `created_by = auth.uid()`)
- `migrations/008_clubs_linked_to_students.sql:49-51` — política RLS `clubs_select` (exige `deleted_at IS NULL`)
