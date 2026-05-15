# Spec: Toggle Ativo/Inativo de Planos

## Objetivo
Permitir que o admin ative/desative planos sem precisar excluí-los, controlando quais planos aparecem no catálogo de contratação.

## Requisitos

- **R1**: Tabela `plans` deve ter coluna `active boolean NOT NULL DEFAULT true`.
- **R2**: Admin vê um toggle de status no card de cada plano (lista em `/#admin/plans`) que alterna `active` com um clique.
- **R3**: Admin vê um checkbox "Plano ativo" no formulário de criação/edição (bottom sheet), com default `true` para novos planos.
- **R4**: Cards de planos inativos têm aparência visual distinta (opacidade reduzida + badge "INATIVO").
- **R5**: Planos inativos não aparecem nos catálogos de contratação ([student/plans.js](js/pages/student/plans.js#L51), [responsible/plans.js](js/pages/responsible/plans.js#L51)) — já filtrados com `.eq('active', true)`.
- **R6**: Planos inativos não aparecem no seletor de cobranças ([admin/charges.js](js/pages/admin/charges.js#L65)) — já filtrado.
- **R7**: Contratos `student_plans` com `status='active'` já existentes seguem válidos até expirar — desativar o plano NÃO os afeta.

## Fora do escopo
- Histórico/auditoria de quem ativou/desativou.
- Soft-delete (manter a função `delete` existente).
- Reativação automática.

## Critérios de aceite
1. Migration aplica `active` em `plans` com default `true` (idempotente — `ADD COLUMN IF NOT EXISTS`).
2. Admin clica no toggle no card → status atualiza no banco, toast confirma, card re-renderiza com novo estado.
3. Admin abre formulário de edição → checkbox reflete estado atual; ao salvar com checkbox desmarcado, plano fica inativo.
4. Aluno em `/#student/plans` não vê planos inativos.
5. Excluir plano segue funcionando como antes.
