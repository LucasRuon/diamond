-- Migration 019: adiciona flag de ativo/inativo na tabela de planos
-- Permite ao admin desativar planos sem exclui-los. Planos inativos somem
-- dos catalogos de contratacao (student, responsible) e do seletor de
-- cobrancas (admin). Contratos student_plans ja ativos seguem validos.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS plans_active_idx ON public.plans (active);
