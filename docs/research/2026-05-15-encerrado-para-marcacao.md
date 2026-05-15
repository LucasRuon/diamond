---
date: 2026-05-15
researcher: claude
research_question: "Por que um treino criado hoje, agendado para daqui 1h, aparece como 'Encerrado para marcação'?"
status: complete
---

# Research: Regra de janela de marcação de treinos (1h)

## Summary

O badge **"Encerrado para marcação"** é renderizado quando a sessão de treino está a **menos de 60 minutos** do horário atual do cliente. A condição é estrita (`>= 60`), avaliada em milissegundos no navegador, e é replicada como política RLS no Postgres (`>= now() + interval '1 hour'`).

No card da imagem (`Treino 15/05` às `15:40`), o estado "Encerrado para marcação" aparece sempre que o relógio do cliente marca **15:40:01 ou depois das 14:40:00** — ou seja, qualquer fração abaixo de exatos 60 minutos antes do treino já dispara o bloqueio. O botão `TENHO INTERESSE` (lista de espera) continua aparecendo porque a sessão ainda é futura (`minutesUntil > 0`) e o aluno tem plano ativo.

## Detailed Findings

### Onde o estado é calculado

Em [js/pages/student/trainings.js:193-194](js/pages/student/trainings.js#L193-L194):

```js
const minutesUntil = (date.getTime() - Date.now()) / 60000;
const canBook = minutesUntil >= 60;
const canCancel = minutesUntil >= 120;
```

- `date` vem de `session.scheduled_at` (campo `training_sessions.scheduled_at`).
- `Date.now()` é hora local do navegador. Não há ajuste de fuso ou tolerância (sem buffer/sem arredondamento).
- O cálculo é em **minutos com casas decimais**. Se faltarem 59 min e 59 s, `minutesUntil ≈ 59.98` → `canBook = false`.

### Onde o badge é decidido

Em [js/pages/student/trainings.js:203-208](js/pages/student/trainings.js#L203-L208):

```js
let stateLabel;
if (reservationsUnavailable) stateLabel = 'Reservas indisponíveis';
else if (reservation)         stateLabel = 'Treino marcado';
else if (isFull)              stateLabel = 'Turma cheia';
else if (canBook)             stateLabel = 'Disponível para marcar';
else                          stateLabel = 'Encerrado para marcação';
```

Como o aluno **não tem reserva**, a turma **não está cheia** (0/30) e `canBook` é falso (menos de 60min), cai no fallback final: `'Encerrado para marcação'`.

### Por que o botão "TENHO INTERESSE" aparece

Em [js/pages/student/trainings.js:222-224](js/pages/student/trainings.js#L222-L224):

```js
// Mostrar "tenho interesse" quando: sem reserva, com plano ativo, e (turma cheia OU dentro de 1h e sem vaga ainda).
// Conforme spec REQ-WAIT-004: sempre disponível para alunos sem reserva (sessões futuras).
const showInterest = !reservation && hasActivePlan && canUseReservations && minutesUntil > 0;
```

Como `minutesUntil > 0` (treino ainda no futuro) e o aluno tem plano ativo, a lista de espera é oferecida mesmo quando a janela de marcação direta já fechou.

### Texto do tooltip de bloqueio

[js/pages/student/trainings.js:220](js/pages/student/trainings.js#L220):

```js
const reserveTitle = !canBook && !isFull && hasActivePlan
    ? 'Marcação bloqueada (faltam menos de 1h)'
    : '';
```

Confirma a interpretação humana da regra: **"faltam menos de 1h"**.

### Replicação no backend (RLS)

A mesma regra está em [migrations/015_reservation_windows.sql:30-37](migrations/015_reservation_windows.sql#L30-L37) na política `training_reservations_insert`:

```sql
AND EXISTS (
  SELECT 1 FROM public.training_sessions s
  WHERE s.id = session_id
    AND s.scheduled_at >= now() + interval '1 hour'
    AND ( SELECT COUNT(*) FROM public.training_reservations r
          WHERE r.session_id = s.id AND r.status = 'booked' ) < s.capacity
)
```

E cancelamento exige 2h em [migrations/015_reservation_windows.sql:54-58](migrations/015_reservation_windows.sql#L54-L58):

```sql
AND EXISTS (
  SELECT 1 FROM public.training_sessions s
  WHERE s.id = session_id
    AND s.scheduled_at >= now() + interval '2 hours'
)
```

Ou seja: mesmo que o front fosse alterado para permitir, o Postgres rejeitaria o INSERT.

## Por que está acontecendo neste caso específico

O treino mostrado é `Treino 15/05` às `15:40` de hoje (2026-05-15). Existem três causas plausíveis, em ordem de probabilidade:

1. **A sessão foi criada com `scheduled_at` a menos de 60 min do agora real.** O texto do usuário ("daqui 1h") é informal — se o `scheduled_at` no banco é 15:40 e a hora atual do cliente é 14:40:30, a diferença é 59,5 min e o badge bate. A regra é `>=`, não `>`, mas exige 60 inteiros.
2. **Fuso/UTC.** `scheduled_at` é `timestamptz` no banco. O front faz `new Date(session.scheduled_at).getTime() - Date.now()`. Se o admin salvou o horário sem fuso ou interpretou mal o seletor, o valor real no banco pode ser diferente do exibido (`toLocaleString('pt-BR')` formata no fuso do navegador).
3. **Relógio do dispositivo adiantado.** Como `Date.now()` é puramente local, um cliente com relógio 1-2 min à frente já entra na janela de bloqueio antes do esperado.

Não há margem/tolerância na regra — o limiar é exato em 60 minutos.

## Code References

- [js/pages/student/trainings.js:193-194](js/pages/student/trainings.js#L193-L194) — Cálculo de `minutesUntil`/`canBook`/`canCancel`.
- [js/pages/student/trainings.js:203-208](js/pages/student/trainings.js#L203-L208) — Decisão do `stateLabel` que produz "Encerrado para marcação".
- [js/pages/student/trainings.js:213-220](js/pages/student/trainings.js#L213-L220) — Estado/legenda do botão de reserva quando `!canBook`.
- [js/pages/student/trainings.js:222-224](js/pages/student/trainings.js#L222-L224) — Condição que mantém o `TENHO INTERESSE` visível.
- [js/pages/student/trainings.js:366](js/pages/student/trainings.js#L366) — Mensagem equivalente no fluxo de cancelamento (2h).
- [migrations/015_reservation_windows.sql:30-37](migrations/015_reservation_windows.sql#L30-L37) — RLS de INSERT exige `scheduled_at >= now() + interval '1 hour'`.
- [migrations/015_reservation_windows.sql:54-58](migrations/015_reservation_windows.sql#L54-L58) — RLS de UPDATE/cancelamento exige `>= now() + interval '2 hours'`.
- [migrations/003_training_reservations.sql:59](migrations/003_training_reservations.sql#L59) — Política mais antiga (24h), substituída pela 015.
- [migrations/010_reservation_quota_policy.sql:29](migrations/010_reservation_quota_policy.sql#L29) — Outra política histórica de 24h, antes da revisão.
