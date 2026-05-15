---
date: 2026-05-15T14:48:31-03:00
researcher: Codex
git_commit: 49e8233b13f8ae51e2778f40948e9aeac1655bc1
branch: work
repository: Diamond
topic: "[$research-codebase] supabase.js:47 POST https://ggolcbrrenmnvtphmcbr.supabase.co/rest/v1/training_reservations?columns=%22session_id%22%2C%22student_id%22 500 (Internal Server Error)"
tags: [research, codebase, supabase, reservations]
status: complete
last_updated: 2026-05-15
last_updated_by: Codex
---

# Research: POST 500 em training_reservations

**Date**: 2026-05-15T14:48:31-03:00
**Researcher**: Codex
**Git Commit**: 49e8233b13f8ae51e2778f40948e9aeac1655bc1
**Branch**: work
**Repository**: Diamond

## Research Question

[$research-codebase] supabase.js:47 
POST https://ggolcbrrenmnvtphmcbr.supabase.co/rest/v1/training_reservations?columns=%22session_id%22%2C%22student_id%22 500 (Internal Server Error)
fetchWithTimeout @ supabase.js:47

## Scope

Inclui o cliente Supabase, o fluxo de reserva na tela do atleta, leitura de reservas para admin e responsavel, tabela `training_reservations`, policies RLS locais, capacidade/lista de espera e a Edge Function `waitlist-tick` aberta no editor. Tambem foi feita uma consulta REST anonima de leitura contra o projeto Supabase configurado para verificar se a tabela esta exposta no schema REST atual.

Exclui alteracoes de codigo, execucao de INSERT autenticado real e diagnostico conclusivo do erro remoto, porque o corpo JSON da resposta 500 autenticada nao foi fornecido nesta pesquisa.

## Summary

O arquivo `js/supabase.js` nao monta a chamada de reserva; ele apenas cria o client Supabase e substitui o `fetch` global por `fetchWithTimeout`. A linha `supabase.js:47` e onde qualquer requisicao Supabase passa pelo `fetch`, por isso aparece no stack do console (`js/supabase.js:24`, `js/supabase.js:47`, `js/supabase.js:64`).

O POST para `/rest/v1/training_reservations?columns="session_id","student_id"` nasce na tela de treinos do atleta em dois pontos: ao clicar em `MARCAR TREINO`, `reserveTraining()` insere `{ session_id, student_id }`; ao aceitar uma oferta de lista de espera, `acceptOffer()` faz o mesmo INSERT (`js/pages/student/trainings.js:339`, `js/pages/student/trainings.js:340`, `js/pages/student/trainings.js:341`, `js/pages/student/trainings.js:408`, `js/pages/student/trainings.js:409`, `js/pages/student/trainings.js:410`).

No banco local versionado, `training_reservations` tem `status` default `booked`, indice unico parcial para impedir reserva ativa duplicada e RLS habilitado (`migrations/003_training_reservations.sql:4`, `migrations/003_training_reservations.sql:8`, `migrations/003_training_reservations.sql:19`, `migrations/003_training_reservations.sql:23`). O resultado do INSERT e decidido pelas policies RLS e constraints do banco, nao por uma rota backend propria no repositorio.

A consulta anonima atual contra `https://ggolcbrrenmnvtphmcbr.supabase.co/rest/v1/training_reservations?select=id&limit=1` retornou HTTP 200 com `[]`. Isso mostra que, no momento desta pesquisa, a tabela esta exposta no schema REST remoto para leitura anonima com a anon key publica; nao reproduz o POST autenticado com `auth.uid()` do usuario.

## Detailed Findings

### Supabase client e origem do stack em `supabase.js:47`

- O frontend aponta para `https://ggolcbrrenmnvtphmcbr.supabase.co` e usa uma anon key hardcoded (`js/supabase.js:2`, `js/supabase.js:3`).
- `fetchWithTimeout(input, init)` cria um `AbortController`, agenda timeout de 20s e chama `fetch(input, { ...init, signal })` (`js/supabase.js:16`, `js/supabase.js:24`, `js/supabase.js:29`, `js/supabase.js:47`).
- O client exportado passa `fetchWithTimeout` como `global.fetch` do Supabase JS (`js/supabase.js:64`, `js/supabase.js:65`, `js/supabase.js:66`).
- Como todo `.from(...).insert(...)` passa por esse fetch global, o stack do navegador aponta para `supabase.js:47` mesmo quando a chamada foi montada por outro modulo.

### Fluxo de reserva do atleta

- A rota de treinos importa `supabase`, helpers de UI/toast, calendario e helpers de reserva (`js/pages/student/trainings.js:1`, `js/pages/student/trainings.js:3`, `js/pages/student/trainings.js:5`, `js/pages/student/trainings.js:6`).
- `loadAvailableTrainings()` carrega sessoes futuras do mes em `training_sessions` (`js/pages/student/trainings.js:70`, `js/pages/student/trainings.js:71`, `js/pages/student/trainings.js:72`, `js/pages/student/trainings.js:73`, `js/pages/student/trainings.js:74`, `js/pages/student/trainings.js:75`).
- A mesma funcao carrega reservas do proprio usuario em `training_reservations`, filtradas por `student_id = user.id` e `status = booked` (`js/pages/student/trainings.js:77`, `js/pages/student/trainings.js:78`, `js/pages/student/trainings.js:79`, `js/pages/student/trainings.js:80`, `js/pages/student/trainings.js:81`).
- O estado visual do botao de reserva considera plano ativo, janela minima de 1h, capacidade e indisponibilidade de reservas (`js/pages/student/trainings.js:193`, `js/pages/student/trainings.js:194`, `js/pages/student/trainings.js:196`, `js/pages/student/trainings.js:197`, `js/pages/student/trainings.js:198`, `js/pages/student/trainings.js:213`).
- `reserveTraining(sessionId)` busca o usuario atual, consulta uso do plano, bloqueia quota esgotada no frontend e entao executa o INSERT em `training_reservations` com apenas `session_id` e `student_id` (`js/pages/student/trainings.js:326`, `js/pages/student/trainings.js:327`, `js/pages/student/trainings.js:330`, `js/pages/student/trainings.js:331`, `js/pages/student/trainings.js:339`, `js/pages/student/trainings.js:341`).
- Em erro de INSERT, o frontend trata `23505` como reserva duplicada, erros de schema como tabela indisponivel e demais erros com uma mensagem generica sobre plano, prazos e turma cheia (`js/pages/student/trainings.js:343`, `js/pages/student/trainings.js:344`, `js/pages/student/trainings.js:346`, `js/pages/student/trainings.js:348`).
- O cancelamento atualiza a reserva para `status = cancelled` e preenche `cancelled_at`; nao remove a linha (`js/pages/student/trainings.js:357`, `js/pages/student/trainings.js:359`, `js/pages/student/trainings.js:360`, `js/pages/student/trainings.js:361`).

### Aceite de oferta da lista de espera

- A tela busca `session_interests` do usuario com status `waiting` ou `offered` junto das reservas e sessoes (`js/pages/student/trainings.js:90`, `js/pages/student/trainings.js:91`, `js/pages/student/trainings.js:92`, `js/pages/student/trainings.js:93`, `js/pages/student/trainings.js:94`, `js/pages/student/trainings.js:96`, `js/pages/student/trainings.js:101`).
- Quando ha oferta ativa, a UI renderiza botoes `ACEITAR` e `RECUSAR` ligados a `offer-accept-btn` e `offer-decline-btn` (`js/pages/student/trainings.js:146`, `js/pages/student/trainings.js:147`, `js/pages/student/trainings.js:166`, `js/pages/student/trainings.js:167`, `js/pages/student/trainings.js:312`, `js/pages/student/trainings.js:317`).
- `acceptOffer(interestId, sessionId)` tambem insere `{ session_id, student_id }` em `training_reservations` antes de atualizar o interesse para `accepted` (`js/pages/student/trainings.js:405`, `js/pages/student/trainings.js:408`, `js/pages/student/trainings.js:409`, `js/pages/student/trainings.js:410`, `js/pages/student/trainings.js:418`).
- Se esse INSERT falha, a UI marca o interesse como `cancelled` e mostra mensagem de oferta expirada/sem vaga (`js/pages/student/trainings.js:411`, `js/pages/student/trainings.js:413`, `js/pages/student/trainings.js:414`).

### Leituras de reserva por perfil

- Admin lista sessoes do mes e, em seguida, busca reservas por `session_id` com join para `users` pelo aluno (`js/pages/admin/trainings.js:59`, `js/pages/admin/trainings.js:74`, `js/pages/admin/trainings.js:76`, `js/pages/admin/trainings.js:77`, `js/pages/admin/trainings.js:78`, `js/pages/admin/trainings.js:79`).
- Admin tambem busca reservas dentro do bottom sheet de presencas da sessao (`js/pages/admin/trainings.js:232`, `js/pages/admin/trainings.js:233`, `js/pages/admin/trainings.js:234`, `js/pages/admin/trainings.js:235`, `js/pages/admin/trainings.js:236`).
- Responsavel/empresario busca vinculos em `responsible_students`, depois consulta `training_reservations` para os atletas vinculados (`js/pages/responsible/trainings.js:55`, `js/pages/responsible/trainings.js:56`, `js/pages/responsible/trainings.js:57`, `js/pages/responsible/trainings.js:78`, `js/pages/responsible/trainings.js:100`, `js/pages/responsible/trainings.js:104`).
- O helper `getReservationsLoadMessage()` transforma erro de schema/cache envolvendo `training_reservations` em mensagem especifica sobre migracao Supabase (`js/trainingReservations.js:3`, `js/trainingReservations.js:13`, `js/trainingReservations.js:18`, `js/trainingReservations.js:20`).

### Schema local de `training_reservations`

- A migracao base cria `public.training_reservations` com `id`, `session_id`, `student_id`, `status`, `reserved_at` e `cancelled_at` (`migrations/003_training_reservations.sql:4`, `migrations/003_training_reservations.sql:5`, `migrations/003_training_reservations.sql:6`, `migrations/003_training_reservations.sql:7`, `migrations/003_training_reservations.sql:8`, `migrations/003_training_reservations.sql:9`, `migrations/003_training_reservations.sql:10`).
- `session_id` referencia `training_sessions(id)` e `student_id` referencia `users(id)`, ambos com cascade (`migrations/003_training_reservations.sql:6`, `migrations/003_training_reservations.sql:7`).
- O indice parcial `training_reservations_active_unique_idx` impede mais de uma linha `booked` para o mesmo aluno e sessao (`migrations/003_training_reservations.sql:19`, `migrations/003_training_reservations.sql:20`, `migrations/003_training_reservations.sql:21`).
- A tabela tem RLS habilitado e grants de `SELECT`, `INSERT` e `UPDATE` para `authenticated` (`migrations/003_training_reservations.sql:23`, `migrations/003_training_reservations.sql:25`).
- A policy inicial de select permite proprio aluno, admin e responsavel vinculado (`migrations/003_training_reservations.sql:31`, `migrations/003_training_reservations.sql:34`, `migrations/003_training_reservations.sql:35`, `migrations/003_training_reservations.sql:39`, `migrations/003_training_reservations.sql:40`, `migrations/003_training_reservations.sql:42`).

### Policies locais que governam o INSERT

- A primeira policy de INSERT, em `003_training_reservations.sql`, exige `student_id = auth.uid()`, `status = booked`, plano ativo e sessao pelo menos 24h no futuro (`migrations/003_training_reservations.sql:46`, `migrations/003_training_reservations.sql:49`, `migrations/003_training_reservations.sql:50`, `migrations/003_training_reservations.sql:51`, `migrations/003_training_reservations.sql:56`, `migrations/003_training_reservations.sql:59`).
- `010_reservation_quota_policy.sql` substitui essa policy para exigir plano ativo de categoria `training` e quota de presencas abaixo de `plans.total_sessions` quando houver limite (`migrations/010_reservation_quota_policy.sql:1`, `migrations/010_reservation_quota_policy.sql:3`, `migrations/010_reservation_quota_policy.sql:10`, `migrations/010_reservation_quota_policy.sql:14`, `migrations/010_reservation_quota_policy.sql:16`, `migrations/010_reservation_quota_policy.sql:23`).
- `014_session_capacity.sql` adiciona `training_sessions.capacity` com default 20 e check `capacity > 0` (`migrations/014_session_capacity.sql:4`, `migrations/014_session_capacity.sql:5`, `migrations/014_session_capacity.sql:6`).
- `015_reservation_windows.sql` substitui novamente a policy de INSERT: mantem plano ativo/categoria/quota, altera a janela para 1h antes do treino e adiciona comparacao da contagem de reservas `booked` com `s.capacity` (`migrations/015_reservation_windows.sql:4`, `migrations/015_reservation_windows.sql:6`, `migrations/015_reservation_windows.sql:13`, `migrations/015_reservation_windows.sql:17`, `migrations/015_reservation_windows.sql:22`, `migrations/015_reservation_windows.sql:32`, `migrations/015_reservation_windows.sql:34`, `migrations/015_reservation_windows.sql:36`).
- A mesma migracao substitui a policy de UPDATE para permitir cancelamento pelo aluno somente se a sessao ainda estiver pelo menos 2h no futuro (`migrations/015_reservation_windows.sql:40`, `migrations/015_reservation_windows.sql:42`, `migrations/015_reservation_windows.sql:51`, `migrations/015_reservation_windows.sql:52`, `migrations/015_reservation_windows.sql:55`, `migrations/015_reservation_windows.sql:57`).
- A policy atual versionada em `015_reservation_windows.sql` le `public.training_reservations` dentro de uma policy definida na propria tabela, no trecho de contagem por capacidade (`migrations/015_reservation_windows.sql:34`, `migrations/015_reservation_windows.sql:35`). Esta e uma dependencia de banco relevante para o POST porque e avaliada durante o `WITH CHECK` do INSERT.

### Plano ativo e quota no frontend

- `getActivePlanUsage(studentId)` busca um plano ativo com join para `plans(name, category, total_sessions, duration_days)` (`js/planUsage.js:8`, `js/planUsage.js:10`, `js/planUsage.js:11`, `js/planUsage.js:12`, `js/planUsage.js:13`).
- Quando o plano tem `total_sessions`, o helper conta presencas em `attendance` desde `start_at` ate o menor valor entre `expires_at` e agora (`js/planUsage.js:20`, `js/planUsage.js:23`, `js/planUsage.js:24`, `js/planUsage.js:26`, `js/planUsage.js:28`, `js/planUsage.js:33`).
- A tela de treinos usa esse helper para bloquear quota esgotada antes do INSERT (`js/pages/student/trainings.js:330`, `js/pages/student/trainings.js:331`, `js/pages/student/trainings.js:332`, `js/pages/student/trainings.js:333`).
- O banco tambem consulta `attendance` na policy de INSERT para a mesma regra de quota (`migrations/015_reservation_windows.sql:22`, `migrations/015_reservation_windows.sql:23`, `migrations/015_reservation_windows.sql:24`, `migrations/015_reservation_windows.sql:25`, `migrations/015_reservation_windows.sql:26`).

### Lista de espera, trigger e `waitlist-tick`

- `016_waitlist_push.sql` cria `session_interests`, com status `waiting`, `offered`, `accepted`, `expired` e `cancelled` (`migrations/016_waitlist_push.sql:5`, `migrations/016_waitlist_push.sql:9`, `migrations/016_waitlist_push.sql:10`).
- A mesma migracao cria `session_booked_counts(p_session_ids UUID[])` como `SECURITY DEFINER`, contando reservas `booked` sem expor identidades aos alunos (`migrations/016_waitlist_push.sql:97`, `migrations/016_waitlist_push.sql:100`, `migrations/016_waitlist_push.sql:103`, `migrations/016_waitlist_push.sql:104`, `migrations/016_waitlist_push.sql:106`, `migrations/016_waitlist_push.sql:110`, `migrations/016_waitlist_push.sql:111`).
- `017_waitlist_promote.sql` cria `promote_waitlist(p_session_id)`, que le capacidade, conta reservas `booked`, conta ofertas ativas e promove o primeiro interesse `waiting` quando ha vaga (`migrations/017_waitlist_promote.sql:4`, `migrations/017_waitlist_promote.sql:16`, `migrations/017_waitlist_promote.sql:21`, `migrations/017_waitlist_promote.sql:25`, `migrations/017_waitlist_promote.sql:31`, `migrations/017_waitlist_promote.sql:35`, `migrations/017_waitlist_promote.sql:46`).
- O trigger `training_reservations_promote` e `AFTER UPDATE`, nao `AFTER INSERT`; ele chama `promote_waitlist()` quando uma reserva muda de `booked` para `cancelled` (`migrations/017_waitlist_promote.sql:62`, `migrations/017_waitlist_promote.sql:67`, `migrations/017_waitlist_promote.sql:68`, `migrations/017_waitlist_promote.sql:74`, `migrations/017_waitlist_promote.sql:75`, `migrations/017_waitlist_promote.sql:76`).
- A Edge Function `waitlist-tick` exige service role, expira ofertas vencidas, chama `promote_waitlist` e envia push para ofertas ainda nao notificadas (`supabase/functions/waitlist-tick/index.ts:1`, `supabase/functions/waitlist-tick/index.ts:28`, `supabase/functions/waitlist-tick/index.ts:33`, `supabase/functions/waitlist-tick/index.ts:42`, `supabase/functions/waitlist-tick/index.ts:53`, `supabase/functions/waitlist-tick/index.ts:59`, `supabase/functions/waitlist-tick/index.ts:75`, `supabase/functions/waitlist-tick/index.ts:95`).
- Pelo codigo local, `waitlist-tick` nao participa do POST direto de `training_reservations`; ela atua sobre `session_interests` e usa `promote_waitlist` em rotina agendada.

### Estado remoto observado sem sessao de usuario

- Foi feita uma chamada `GET /rest/v1/training_reservations?select=id&limit=1` com a anon key publica configurada em `js/supabase.js`.
- Resposta observada: HTTP 200, corpo `[]`, header `sb-project-ref: ggolcbrrenmnvtphmcbr`.
- Essa resposta indica que a tabela existe e esta no schema REST remoto no momento da pesquisa.
- Essa chamada nao avaliou o `WITH CHECK` de INSERT, porque nao usou JWT autenticado de atleta nem payload de reserva.

## Code References

- `js/supabase.js:47` - Ponto generico em que o wrapper chama `fetch`.
- `js/supabase.js:64` - Criacao do client Supabase com `fetchWithTimeout`.
- `js/pages/student/trainings.js:339` - Inicio do INSERT de reserva pelo botao de marcar treino.
- `js/pages/student/trainings.js:408` - Inicio do INSERT ao aceitar oferta de lista de espera.
- `js/pages/student/trainings.js:343` - Tratamento de erro do INSERT de reserva.
- `js/pages/student/trainings.js:357` - Cancelamento via UPDATE, nao DELETE.
- `js/trainingReservations.js:3` - Helper que detecta erro de schema/cache de reservas.
- `migrations/003_training_reservations.sql:4` - Criacao da tabela de reservas.
- `migrations/003_training_reservations.sql:19` - Indice unico parcial para reserva ativa.
- `migrations/003_training_reservations.sql:46` - Primeira policy de INSERT.
- `migrations/010_reservation_quota_policy.sql:3` - Policy de INSERT com quota por presenca.
- `migrations/014_session_capacity.sql:4` - Coluna `capacity` em `training_sessions`.
- `migrations/015_reservation_windows.sql:6` - Policy atual versionada para INSERT com janela de 1h e capacidade.
- `migrations/015_reservation_windows.sql:34` - Contagem de `training_reservations` dentro da policy de INSERT da propria tabela.
- `migrations/017_waitlist_promote.sql:75` - Trigger de promocao apos cancelamento de reserva.
- `supabase/functions/waitlist-tick/index.ts:42` - Cron seleciona ofertas expiradas em `session_interests`.
- `supabase/functions/waitlist-tick/index.ts:53` - Cron chama RPC `promote_waitlist`.

## Architecture Documentation

O fluxo de reserva e client-side direto para PostgREST:

`#trainings -> studentTrainings.render() -> loadAvailableTrainings() -> reserveTraining() -> supabase.from('training_reservations').insert([{ session_id, student_id }]) -> PostgREST/RLS/constraints`

Nao ha Edge Function intermediaria para criar reserva. As Edge Functions encontradas tratam checkout, webhook, admin update, push e waitlist tick; nenhuma delas intercepta o INSERT normal de reserva.

O dominio separa tres registros:

- `training_sessions`: agenda criada por admin e lida por usuarios autenticados.
- `training_reservations`: reserva planejada por atleta, com status `booked` ou `cancelled`.
- `attendance`: presenca confirmada por QR/manual, usada tambem para quota de plano.

O mecanismo de lista de espera fica paralelo:

`session_interests -> promote_waitlist() -> oferta -> acceptOffer() -> INSERT em training_reservations`

## Historical Context

- `docs/legado/research/2026-05-04-reservas-calendario.md` registrou que, em 2026-05-04, uma consulta REST anonima ao mesmo projeto retornava HTTP 404 `PGRST205` para `training_reservations`, indicando tabela ausente no schema cache naquele momento (`docs/legado/research/2026-05-04-reservas-calendario.md:34`, `docs/legado/research/2026-05-04-reservas-calendario.md:41`).
- Nesta pesquisa de 2026-05-15, a mesma area REST respondeu HTTP 200 para leitura anonima limitada, entao o estado remoto observado mudou em relacao ao historico de 2026-05-04.
- `CLAUDE.md` documenta que migrations sao aplicadas manualmente no Supabase Dashboard, e nao por pipeline automatizado neste repositorio (`CLAUDE.md:27`, `CLAUDE.md:29`).
- `PRD.md` ainda descreve reserva com antecedencia minima de 24h e afirma que capacidade nao esta modelada; o codigo/migrations atuais ja usam 1h para marcar, 2h para cancelar e `training_sessions.capacity` (`PRD.md:130`, `PRD.md:265`, `migrations/014_session_capacity.sql:4`, `migrations/015_reservation_windows.sql:1`).

## Related Research

- `docs/legado/research/2026-05-04-reservas-calendario.md`
- `docs/legado/research/2026-05-09-project-inventory.md`
- `docs/legado/research/2026-05-11-expiracao-planos-contratados.md`
- `docs/legado/research/2026-05-11-questionario-pre-treino-checkin-qrcode.md`

## Open Questions

- Qual e o corpo JSON completo da resposta 500 do POST autenticado? O console mostrou apenas o status e a URL.
- O banco remoto esta exatamente com as migrations `014`, `015`, `016` e `017` aplicadas na mesma ordem do repositorio local?
- O erro 500 ocorreu pelo botao `MARCAR TREINO` ou pelo botao `ACEITAR` uma oferta de lista de espera? Os dois caminhos geram o mesmo POST de `session_id` e `student_id`.
- Qual `session_id` e qual `student_id` estavam no payload autenticado que retornou 500?
- A policy remota de INSERT de `training_reservations` e a mesma versionada em `migrations/015_reservation_windows.sql`?
