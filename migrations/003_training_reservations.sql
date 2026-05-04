-- Migração: reservas de treinos
-- Executar após 001 e 002 no SQL Editor do Supabase Dashboard

CREATE TABLE IF NOT EXISTS public.training_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled')),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS training_reservations_session_idx
  ON public.training_reservations(session_id);

CREATE INDEX IF NOT EXISTS training_reservations_student_idx
  ON public.training_reservations(student_id);

CREATE UNIQUE INDEX IF NOT EXISTS training_reservations_active_unique_idx
  ON public.training_reservations(session_id, student_id)
  WHERE status = 'booked';

ALTER TABLE public.training_reservations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.training_reservations TO authenticated;

DROP POLICY IF EXISTS "training_reservations_select" ON public.training_reservations;
DROP POLICY IF EXISTS "training_reservations_insert" ON public.training_reservations;
DROP POLICY IF EXISTS "training_reservations_update" ON public.training_reservations;

CREATE POLICY "training_reservations_select" ON public.training_reservations
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role::text = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.responsible_students
      WHERE responsible_id = auth.uid()
        AND student_id = training_reservations.student_id
    )
  );

CREATE POLICY "training_reservations_insert" ON public.training_reservations
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'booked'
    AND EXISTS (
      SELECT 1 FROM public.student_plans
      WHERE student_id = auth.uid()
        AND status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.training_sessions
      WHERE id = session_id
        AND scheduled_at >= now() + interval '24 hours'
    )
  );

CREATE POLICY "training_reservations_update" ON public.training_reservations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role::text = 'admin'
    )
    OR (
      student_id = auth.uid()
      AND status = 'booked'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role::text = 'admin'
    )
    OR (
      student_id = auth.uid()
      AND status = 'cancelled'
      AND cancelled_at IS NOT NULL
    )
  );

NOTIFY pgrst, 'reload schema';
