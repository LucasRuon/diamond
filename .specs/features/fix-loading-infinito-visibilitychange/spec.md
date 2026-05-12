# Spec: corrigir loading infinito ao voltar a aba/app ao foco

**Escopo:** Medium — bug fix concentrado em `js/app.js`, com efeito transversal em todas as páginas autenticadas.
**Status:** Draft
**Data:** 2026-05-12
**Autor:** luucasruon@gmail.com

---

## 1. Problema

Quando o usuário sai do app (troca de aba, abre outro app no celular, bloqueia a tela, abre uma fatura/checkout externo, etc.) e **volta**, a página atual entra em estado de "carregando…" indefinidamente. As queries do Supabase ficam pendentes e nunca resolvem. Só dar refresh (F5 / pull-to-refresh) restaura o app.

Sintoma reportado pelo usuário: "saí da tela, abri a fatura para pagar, voltei e ficou em carregando infinito. Acontece com outras telas também, não só Asaas."

## 2. Diagnóstico (causa raiz)

Sequência do bug:

1. Aba perde visibilidade → `document.visibilityState = 'hidden'`.
2. Aba volta a ficar visível → o `GoTrueClient` interno do `supabase-js` v2 dispara automaticamente um `TOKEN_REFRESHED` (ou re-emite `INITIAL_SESSION` / `SIGNED_IN`). Para isso adquire um **lock interno** (`_acquireLock` / `navigator.locks`).
3. O listener `supabase.auth.onAuthStateChange` em [js/app.js:51-65](../../../js/app.js#L51-L65) é `async` e faz `await this.loadProfile()` **dentro** do callback, depois chama `this.render()`. O `render()` da página dispara novas queries (`supabase.from(...).select(...)`).
4. **Conflito do lock**: chamar funções `async` do Supabase de dentro de um callback do `onAuthStateChange` é explicitamente proibido pelo SDK — em condições adversas (mobile, rede lenta, service worker) o lock não é liberado e todas as queries subsequentes ficam `pending` para sempre.
5. F5 recria o cliente do zero → lock some → app volta a funcionar.

Agravante: o listener trata **todos** os eventos igual (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `INITIAL_SESSION`, `USER_UPDATED`), sempre recarregando profile + re-renderizando a página inteira mesmo quando o usuário não mudou.

## 3. Objetivo

Eliminar o estado de "carregando infinito" ao retomar a aba/app, sem regressões nos fluxos de login, logout, reset de senha e troca de papel.

## 4. Requisitos

### 4.1 Funcionais

| ID    | Requisito                                                                                                                                                                     | Aceitação                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| FR-1  | Ao voltar para a aba/app, a página atual **não** deve re-renderizar nem refazer queries se o usuário autenticado for o mesmo.                                                 | Trocar de aba e voltar 5x em qualquer página autenticada — nenhuma chamada nova em Network além de `auth/v1/token`.      |
| FR-2  | Eventos `TOKEN_REFRESHED` devem atualizar apenas a referência do usuário/sessão em memória, sem disparar `loadProfile()` nem `render()`.                                      | Console log mostra `Auth Event: TOKEN_REFRESHED`, mas nenhuma query REST é feita logo em seguida.                        |
| FR-3  | Evento `INITIAL_SESSION` só deve disparar `loadProfile()` + `render()` se o `user.id` mudou em relação ao estado atual (caso real de boot/login), nunca em volta de visibilidade. | Re-emissão de `INITIAL_SESSION` com mesmo `user.id` é ignorada.                                                          |
| FR-4  | Chamadas Supabase (`loadProfile`, queries de página) **nunca** devem rodar com `await` direto dentro do callback do `onAuthStateChange`. Devem ser despachadas para fora (`setTimeout(…,0)` ou `queueMicrotask`). | Inspeção de código: nenhum `await supabase.*` dentro do callback. |
| FR-5  | Fluxo de login (`SIGNED_IN` real, primeiro login) continua carregando profile e renderizando a home correta por papel.                                                        | Logout + login manual leva ao dashboard correto.                                                                         |
| FR-6  | Fluxo de logout (`SIGNED_OUT`) limpa `this.user` e `this.profile`, redireciona para `#login`.                                                                                 | Botão "Sair" → retorna para login sem estado residual.                                                                   |
| FR-7  | Fluxo de recuperação de senha (`PASSWORD_RECOVERY`) continua forçando rota `#update-password` (comportamento atual preservado).                                               | Link de reset de e-mail → cai em `#update-password`.                                                                     |
| FR-8  | Caso o token expire enquanto a aba estava em background e o refresh **falhe** (sessão inválida), o app trata como logout e manda para `#login` — não fica em loading.         | Simular `refresh_token` inválido → vai para login com toast de "sessão expirada".                                        |

### 4.2 Não-funcionais

| ID     | Requisito                                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1  | Mudança contida em **um único arquivo** (`js/app.js`), sem novos imports, sem novas deps, sem mudar a CDN do Supabase.                                   |
| NFR-2  | Não introduzir framework de estado, store, nem listener global de `visibilitychange` próprio — confiar no que o `GoTrueClient` já emite.                 |
| NFR-3  | Manter compatibilidade com o `service-worker.js` atual (PWA instalada não pode quebrar offline shell).                                                   |
| NFR-4  | Comportamento idêntico em desktop (Chrome/Safari/Firefox) e PWA mobile (iOS Safari standalone + Android Chrome).                                         |

## 5. Fora de escopo

- Refatorar `app.js` para virar SPA com router de verdade.
- Trocar o cliente Supabase ou versão.
- Mudar como cada página individual faz suas queries.
- Implementar retry/backoff genérico para queries Supabase.
- Tratar o caso em que o backend Supabase está offline (já existe toast nas páginas).

## 6. Riscos e mitigações

| Risco                                                                                                                  | Mitigação                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ignorar `TOKEN_REFRESHED` pode esconder casos em que o `user.id` mudou (ex: troca de usuário sem `SIGNED_OUT`).        | Comparar `session?.user?.id` com `this.user?.id` — se diferente, tratar como troca real e recarregar.                                                       |
| `setTimeout(…,0)` pode atrasar o primeiro render no boot.                                                              | Aceitável: o boot tem skeleton/`page-enter` animation, ~0ms de delay é imperceptível.                                                                       |
| Algum fluxo legítimo dependia do re-render em `TOKEN_REFRESHED` (improvável, mas vale checar).                         | Buscar uso de `auth.refreshSession` / dependência implícita em `onAuthStateChange` em todas as pages. Spec exige nenhum encontrado antes de implementar.    |

## 7. Plano de teste manual (UAT)

Reproduzir em **PWA mobile instalada** (pior caso) e **desktop Chrome**:

1. **Golden path — visibilidade**
   - Logar como `student`. Abrir tela "Meus treinos".
   - Trocar para outra aba/app por 30s. Voltar.
   - **Esperado:** lista de treinos visível imediatamente. Nenhuma nova request REST. Console mostra `Auth Event: TOKEN_REFRESHED` mas nada além disso.

2. **Bloqueio de tela (mobile)**
   - PWA instalada como `student`. Bloquear o celular por 2 min. Desbloquear.
   - **Esperado:** mesma tela, sem loading infinito.

3. **Fluxo Asaas (o caso reportado)**
   - Como `student` em "Planos" → gerar cobrança → abrir `invoiceUrl` em browser externo.
   - Voltar para o app.
   - **Esperado:** tela "Planos" responsiva, sem loading.

4. **Login real**
   - Sair (logout). Logar novamente.
   - **Esperado:** vai para dashboard correto por papel (`admin` → admin dash, `student` → student dash, etc.).

5. **Logout**
   - Botão "Sair".
   - **Esperado:** vai para `#login`, sem estado residual.

6. **Reset de senha**
   - Clicar link de reset no email.
   - **Esperado:** cai em `#update-password`, fluxo de recovery preservado.

7. **Sessão expirada**
   - Em DevTools, invalidar manualmente o `refresh_token` no localStorage. Trocar de aba e voltar.
   - **Esperado:** redirecionado para `#login` com toast de sessão expirada (ou ao menos sem loading infinito).

8. **Troca de papel via admin**
   - Admin promove um usuário de `student` para `responsible`. Usuário precisa re-logar (comportamento atual).
   - **Esperado:** sem regressão.

## 8. Critério de "pronto"

- [ ] Listener `onAuthStateChange` em `js/app.js` reescrito conforme FR-1 a FR-8.
- [ ] Todos os 8 cenários de UAT verificados pelo usuário.
- [ ] Nenhuma chamada `await supabase.*` dentro do callback de `onAuthStateChange`.
- [ ] Commit atômico com mensagem descritiva.

---

## Próximos passos

Esta spec é Medium → pode pular `design.md` e `tasks.md` formais. Próxima etapa é **Execute**: aplicar a mudança no arquivo, listar inline os passos atômicos, commitar e levar o usuário pelos cenários de UAT.

Pergunta antes de implementar: **algum dos 8 cenários de UAT você não consegue reproduzir** (ex: não tem ambiente para invalidar token manual)? Se sim, ajusto o plano antes de aplicar.
