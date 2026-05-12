-- 1. Colunas novas em student_plans
ALTER TABLE public.student_plans
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS start_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS student_plans_expires_idx
  ON public.student_plans(expires_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS student_plans_student_status_idx
  ON public.student_plans(student_id, status);

-- 2. Garantir total_sessions em plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS total_sessions INT;

-- 3. Backfill: ativos existentes ganham activated_at=created_at,
--    start_at=created_at, expires_at=created_at + duration_days
UPDATE public.student_plans sp
SET activated_at = sp.created_at,
    start_at     = sp.created_at,
    expires_at   = sp.created_at + (p.duration_days || ' days')::interval
FROM public.plans p
WHERE p.id = sp.plan_id
  AND sp.status = 'active'
  AND sp.expires_at IS NULL;

-- 4. Função de expiração
CREATE OR REPLACE FUNCTION public.expire_student_plans()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE public.student_plans
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_student_plans() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_student_plans() TO service_role;

-- 5. Agendamento diário (requer extensão pg_cron habilitada no projeto)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'expire-student-plans-daily',
  '5 3 * * *',                       -- 03:05 UTC todo dia
  $$SELECT public.expire_student_plans();$$
);

NOTIFY pgrst, 'reload schema';
