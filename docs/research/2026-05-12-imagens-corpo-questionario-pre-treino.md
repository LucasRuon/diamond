---
date: 2026-05-12
researcher: claude
research_question: "Onde estão as imagens do corpo (frente/costas) usadas no questionário de check-in do atleta e o que envolve trocá-las pelas duas SVGs fornecidas?"
status: complete
---

# Research: Imagens do corpo no questionário pré-treino (check-in do atleta)

## Summary

As imagens do mapa corporal são dois SVGs servidos como arquivos estáticos em `/assets/pre-training/`:

- `assets/pre-training/body-front.svg` — vista de frente
- `assets/pre-training/body-back.svg` — vista de costas

Elas são referenciadas em **um único ponto de código** (`js/pages/student/preTrainingQuestionnaire.js:381`) que monta dinamicamente o `src` baseado em `state.painSide` (`'frente'` ou `'costas'`). O componente é o overlay modal que abre antes do check-in via QR code para o aluno responder o questionário pré-treino.

Os caminhos também são listados no **service worker** (`service-worker.js:24-25`) como assets pré-cacheados para uso offline da PWA — então trocar os arquivos exige bump da versão do cache no SW para que clientes existentes baixem as novas imagens.

As regiões clicáveis (botões absolutamente posicionados sobre a imagem) são definidas em coordenadas percentuais no objeto `BODY_REGIONS` (`preTrainingQuestionnaire.js:31-70`). **Se a anatomia/proporções das novas SVGs forem diferentes das atuais, as coordenadas `top/left/width/height` de cada região vão precisar ser recalibradas** — caso contrário os botões ficarão fora de lugar sobre a nova ilustração.

A página de visualização do questionário (`preTrainingQuestionnaireView.js`) **não renderiza as silhuetas** — só lista os pontos de dor como texto. Logo, a troca afeta apenas a tela de preenchimento.

## Detailed Findings

### 1. Localização das imagens atuais

```
assets/pre-training/body-front.svg
assets/pre-training/body-back.svg
```

Servidas estaticamente pela raiz da SPA (sem build). Os novos arquivos fornecidos pelo usuário são:
- `/Users/lucasruon/Downloads/logos/imagem_frente_identica.svg` → substituirá `body-front.svg`
- `/Users/lucasruon/Downloads/logos/imagem_identica.svg` → substituirá `body-back.svg` (presumido pelo nome "frente_identica" vs "identica")

### 2. Ponto de uso no código

**`js/pages/student/preTrainingQuestionnaire.js:381`** — montagem do `src` da imagem dentro do passo "pain" (dores corporais):

```js
const figureSrc = state.painSide === 'frente'
    ? '/assets/pre-training/body-front.svg'
    : '/assets/pre-training/body-back.svg';
```

Renderização da imagem em `preTrainingQuestionnaire.js:397-419`:

```html
<div class="precheck-body-map">
    <div class="precheck-body-figure">
        <img src="${figureSrc}" alt="Mapa corporal ${sideLabel.toLowerCase()}">
        <div class="precheck-body-fallback" hidden> ... </div>
        ${regions.map(region => `
            <button class="precheck-body-region ..."
                style="--top:${region.top}%; --left:${region.left}%;
                       --width:${region.width}%; --height:${region.height}%;">
            </button>
        `).join('')}
    </div>
    ...
</div>
```

Existe fallback: se a `<img>` falhar (`error` event em `preTrainingQuestionnaire.js:520-527`), os botões de região são escondidos e a div `.precheck-body-fallback` com botões textuais é mostrada.

### 3. Mapa de regiões clicáveis (coordenadas em %)

Definido em `js/pages/student/preTrainingQuestionnaire.js:31-70`:

- **Frente** (20 regiões): cabeça, ombros, braços, púbis, adutores, anterior coxa, joelhos, canelas, tornozelos, pés, tórax, abdômen.
- **Costas** (14 regiões): pescoço, lombar, punhos, mãos, posterior coxa, panturrilha, calcanhar, costas, nádegas.

Cada região tem `top`, `left`, `width`, `height` em percentuais relativos ao container `.precheck-body-figure`. Os valores foram calibrados para as SVGs atuais — alterações nas proporções da nova arte exigirão re-calibração desses números.

### 4. Service worker (cache offline)

`service-worker.js:24-25` lista as duas SVGs no `urlsToCache`:

```js
'/assets/pre-training/body-front.svg',
'/assets/pre-training/body-back.svg',
```

Para forçar clientes a baixar as imagens novas, é necessário incrementar o nome do cache (constante no topo do `service-worker.js`) — senão o SW serve a versão antiga do cache.

### 5. Fluxo de invocação do questionário

- **Aluno** abre o overlay via check-in QR ou link `#pre-training-questionnaire?id=...` (`js/app.js:324`), ou pela tela `attendance.js:174`.
- **Admin** acessa `#pre-training-questionnaires` (`js/app.js:331`, `js/pages/admin/preTrainingQuestionnaires.js`) e abre cada questionário em modo leitura — essa view **não usa as imagens do corpo**, só lista os pontos de dor formatados como texto.

### 6. Onde as imagens NÃO aparecem

- `js/pages/student/preTrainingQuestionnaireView.js` — view read-only, sem mapa corporal.
- `js/pages/admin/preTrainingQuestionnaires.js` — listagem, sem mapa.
- Nenhum CSS referencia as SVGs como `background-image`.

## Code References

- `js/pages/student/preTrainingQuestionnaire.js:381` — atribuição dinâmica de `figureSrc` (frente/costas)
- `js/pages/student/preTrainingQuestionnaire.js:31-70` — `BODY_REGIONS` com coordenadas % das regiões clicáveis
- `js/pages/student/preTrainingQuestionnaire.js:397-419` — markup do mapa corporal e botões de região
- `js/pages/student/preTrainingQuestionnaire.js:520-527` — fallback caso a imagem falhe
- `service-worker.js:24-25` — pré-cache das SVGs (exige bump de versão do cache na troca)
- `assets/pre-training/body-front.svg` — arquivo atual da frente
- `assets/pre-training/body-back.svg` — arquivo atual das costas

## Pontos de atenção para a troca

1. **Mapear qual SVG vai onde**: confirmar com o usuário que `imagem_frente_identica.svg` → `body-front.svg` e `imagem_identica.svg` → `body-back.svg` (nomes ambíguos).
2. **Recalibrar `BODY_REGIONS`** se as novas SVGs tiverem proporções/poses diferentes — os botões usam coordenadas % absolutas sobre a imagem.
3. **Bump no service worker** para invalidar cache de clientes que já instalaram a PWA.
4. **viewBox/aspect-ratio**: conferir se o CSS de `.precheck-body-figure` assume uma razão de aspecto específica (vale inspecionar `css/components.css` ou `css/pages.css` antes do plan).
