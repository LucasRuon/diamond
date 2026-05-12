-- ============================================================
-- Migration 011: Integração Asaas (pagamentos)
-- ============================================================
-- Adiciona colunas para rastrear customers e cobranças no Asaas.
-- Spec: .specs/features/asaas-payments/spec.md
-- ============================================================

-- 1. users.asaas_customer_id
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- UNIQUE partial (somente para valores não-nulos)
CREATE UNIQUE INDEX IF NOT EXISTS users_asaas_customer_id_uniq
  ON public.users (asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;

-- 2. student_plans.asaas_*  (asaas_payment_id pode já existir vindo da função antiga)
ALTER TABLE public.student_plans
  ADD COLUMN IF NOT EXISTS asaas_payment_id  TEXT,
  ADD COLUMN IF NOT EXISTS asaas_status      TEXT,
  ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT;

-- UNIQUE partial em asaas_payment_id
CREATE UNIQUE INDEX IF NOT EXISTS student_plans_asaas_payment_id_uniq
  ON public.student_plans (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

-- Índice secundário (lookup por webhook)
CREATE INDEX IF NOT EXISTS student_plans_asaas_payment_id_idx
  ON public.student_plans (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

-- CHECK constraint em asaas_status
ALTER TABLE public.student_plans
  DROP CONSTRAINT IF EXISTS student_plans_asaas_status_check;

ALTER TABLE public.student_plans
  ADD CONSTRAINT student_plans_asaas_status_check
  CHECK (
    asaas_status IS NULL
    OR asaas_status IN (
      'PENDING',
      'CONFIRMED',
      'RECEIVED',
      'OVERDUE',
      'REFUNDED',
      'CANCELLED'
    )
  );

NOTIFY pgrst, 'reload schema';
