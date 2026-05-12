---
date: 2026-05-12
researcher: claude
research_question: "Por que ao editar a logo de um clube já existente o botão fica travado em 'SALVANDO...'?"
status: complete
---

# Research: Edição de logo de clube trava em "SALVANDO..."

## Sumário

O botão fica preso em "SALVANDO..." quando o callback `onSave` do `ui.bottomSheet` lança um erro que **não é re-arremessado** ou quando a Promise **nunca resolve/rejeita**. Olhando o fluxo de edição em `js/pages/admin/clubs.js:157-252`, o cenário "já tem logo e troco por uma nova" passa por três operações sequenciais que podem falhar silenciosamente sob certas condições — e algumas delas têm tratamento parcial que pode deixar a Promise pendurada.

Pontos relevantes (sem propor mudanças, apenas descrição):

- O `bottomSheet` só reseta o botão se `onSave` **lançar** (`ui.js:62-69`). Se a Promise nunca resolver, o botão fica eternamente em "SALVANDO...".
- A política RLS de storage exige `users.role = 'admin'` para INSERT/UPDATE/DELETE no bucket `club-logos` (`migrations/008_clubs_linked_to_students.sql:72-91`). Falhas aqui retornam erro de storage, que **é** lançado por `uploadClubLogo` e propagado.
- O upload usa `upsert: false` e gera um caminho novo com `Date.now()` (`js/clubs.js:101-107`). Não há colisão de path nem remoção do objeto antigo — a logo antiga permanece órfã no bucket após a troca.
- `removeImageBackground` (quando o checkbox "Remover fundo" está marcado) faz manipulação de canvas; falhas aqui são capturadas e o arquivo original é enviado (`js/pages/admin/clubs.js:174-182`), então **não** é fonte de travamento.

## Detalhamento

### 1. Camada de UI: o handler do bottomSheet

Arquivo: `js/ui.js:49-71`

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
        console.error('[bottomSheet] onSave error:', err);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});
```

- O reset do botão depende **exclusivamente** de `onSave` rejeitar (ou resolver — caso em que o sheet fecha).
- Se `onSave` ficar pendurado (Promise nunca settled), o botão permanece "SALVANDO..." indefinidamente. O timeout de 20s de `fetchWithTimeout` (`js/supabase.js:11-57`) garante que requisições Supabase eventualmente abortem — então um hang puro é improvável **se** todo `await` for de fato uma chamada Supabase com `fetchWithTimeout`.

### 2. Fluxo de edição (com logo)

Arquivo: `js/pages/admin/clubs.js:157-252`

Cenário relevante: `club` truthy, `file` truthy, `removeBg` opcional.

Pseudo-fluxo:

1. `validateClubLogoFile(file)` — `js/clubs.js:7-16`. Sync, throw via `throwClubValidation` se inválido (marca `alreadyNotified = true`).
2. (Opcional) `removeImageBackground(file)` — `js/clubs.js:25-95`. Já tem try/catch local (`js/pages/admin/clubs.js:175-181`) que cai para o arquivo original em caso de erro.
3. `uploadClubLogo({clubId, file})` — `js/clubs.js:97-111`. Faz `supabase.storage.from('club-logos').upload(path, file, { upsert: false })`. **Lança** o erro Supabase se RLS bloquear ou se houver falha de rede (fetch via wrapper com timeout).
4. `supabase.from('clubs').update(payload).eq('id', club.id)` — `js/pages/admin/clubs.js:195-198`. Se `updateError`, chama `removeClubLogoObject(uploadedLogoPath)` (cleanup do objeto recém-enviado) e depois `throw updateError` (`js/pages/admin/clubs.js:200-203`).
5. `toast.show('Clube atualizado!')` + `await this.loadClubs()` (linha 244).

Pontos em que a Promise pode não rejeitar adequadamente:

- **`removeClubLogoObject` engole o erro** (`js/clubs.js:122-132`): retorna sem propagar caso o `remove` falhe. Isso é intencional (best-effort), e não interfere — a chamada `if (updateError) throw updateError` na linha 203 ainda dispara o erro principal.
- Se `updateError` for `null` (update bem-sucedido), mas o request silenciosamente nunca chegar (improvável dado o `fetchWithTimeout`), o `await this.loadClubs()` em `:244` ainda precisaria resolver. Se a sessão expirou no meio do fluxo, o select dentro de `loadClubs` (`:54-58`) pode resultar em `error`, e o método retorna void — Promise resolve normalmente, o sheet fecha. Não bloqueia.
- O bloco `if (updateError)` aparece duplicado nas linhas 200 e 203 — é uma duplicação semântica (uma para cleanup, outra para throw). Funcional.

### 3. Estado do botão e ciclo do bottomSheet

- O bottomSheet é recriado a cada chamada `showClubForm` (`js/ui.js:19-75`). Cada overlay tem seu próprio handler.
- Submits duplicados podem ocorrer se o usuário clicar muitas vezes antes do `btn.disabled = true` executar — mas, na prática, o `submit` é serializado pelo event loop e `disabled` previne o segundo clique.
- `close()` em `ui.js:39-42` adiciona classe `closing` e remove o overlay após 300ms. Só ocorre se `onSave` resolver sem throw.

### 4. RLS e Storage

Arquivo: `migrations/008_clubs_linked_to_students.sql:42-91`

- `clubs_update` exige `users.role = 'admin'` (linha 62-66). Sem `WITH CHECK`, o Postgres usa o `USING` para validar o estado novo também.
- `club_logos_insert` exige bucket = `'club-logos'` AND `users.role = 'admin'` (linha 72-77).
- `club_logos_update` e `club_logos_delete` têm a mesma restrição. **Note:** o upload novo é INSERT (path novo via `Date.now()`), não UPDATE — portanto, a policy relevante para troca de logo é a de INSERT, não UPDATE.

Implicação: se o usuário autenticado **não for** admin (por exemplo, se o registro em `public.users` tiver `role` diferente do `user_metadata.role` carregado em `app.profile`), o INSERT no storage falhará com erro de RLS — que é lançado corretamente e cai no catch de `:245-251`, exibindo toast e re-arremessando para resetar o botão. Esse caminho **não** trava em "SALVANDO...".

### 5. Resíduo: logo antiga não removida

Quando uma logo é trocada com sucesso, o objeto antigo permanece no bucket `club-logos` — `removeClubLogoObject` só é chamado no rollback (linhas 201 e 229), nunca para deletar a logo anterior em uma troca bem-sucedida. Comportamento observado, não bug funcional.

## Hipóteses para o travamento

Com base na leitura do código, os caminhos que **realmente** poderiam manter o botão em "SALVANDO..." indefinidamente são:

1. **Um `await` interno que nunca settle**: improvável dado o `fetchWithTimeout` de 20s envolvendo todas as chamadas Supabase. Mas a CDN (`https://cdn.jsdelivr.net/.../html5-qrcode` etc.) e o canvas em `removeImageBackground` não passam por `fetchWithTimeout` — o canvas é local/sync porém o `img.onload` poderia teoricamente nunca disparar para um arquivo malformado. Há `img.onerror` para rejeitar, e o erro é capturado em `:175-181`, então não trava.
2. **Erro lançado fora do try/catch**: o try/catch em `:158-251` envolve todo o corpo do `onSave`, então erros síncronos ou awaited são capturados e re-lançados em `:250`. Não deve haver fuga.
3. **`btn.innerHTML = originalText` não executa por exceção no catch do bottomSheet**: o catch em `ui.js:65-69` é simples; não há await nem chamada que possa falhar. Improvável.
4. **Submit duplicado em formulários distintos**: se houver dois `<form>` no DOM (overlay anterior não removido), apenas o form do overlay novo é alvo do listener. Não é fonte de travamento.

A causa mais provável dentro do que o código permite hoje é **um `await` de Supabase storage que demora mais que o esperado mas dentro de 20s** — dando a impressão visual de "travado". Após o timeout, o erro `TimeoutError` é lançado e o botão deveria resetar, exibindo o toast `getClubErrorMessage(...)` (fallback "Erro ao salvar clube. Tente novamente."). Para confirmar empiricamente, recomenda-se observar o console (`[bottomSheet] onSave error:`) durante a reprodução do bug.

## Code References

- `js/pages/admin/clubs.js:157-252` — Handler `onSave` do form de clube (criar/editar)
- `js/pages/admin/clubs.js:184-205` — Branch de edição com upload condicional
- `js/pages/admin/clubs.js:200-203` — Cleanup do objeto enviado em caso de `updateError`
- `js/clubs.js:97-111` — `uploadClubLogo` (INSERT no storage, sem upsert)
- `js/clubs.js:113-120` — `updateClubLogoMetadata` (UPDATE na tabela `clubs`)
- `js/clubs.js:122-132` — `removeClubLogoObject` (best-effort, engole erro)
- `js/clubs.js:25-95` — `removeImageBackground` (canvas, com `img.onerror` para rejeitar)
- `js/ui.js:49-71` — Submit handler do `bottomSheet` (responsável pelo estado "SALVANDO...")
- `js/ui.js:39-42` — `close()` do bottomSheet
- `js/supabase.js:11-57` — `fetchWithTimeout` de 20s
- `migrations/008_clubs_linked_to_students.sql:42-91` — RLS de `clubs` e `storage.objects` para `club-logos`
