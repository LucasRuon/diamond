-- Migration 018: evita recursao de RLS na policy de capacidade de reservas
-- A policy 015 consultava public.training_reservations dentro da propria
-- policy de INSERT da tabela, o que pode gerar "infinite recursion detected".

CREATE OR REPLACE FUNCTION public.training_reservation_booked_count(p_session_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.training_reservations
  WHERE session_id = p_session_id
    AND status = 'booked';
$$;

REVOKE ALL ON FUNCTION public.training_reservation_booked_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.training_reservation_booked_count(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "training_reservations_insert" ON public.training_reservations;

CREATE POLICY "training_reservations_insert" ON public.training_reservations
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND status = 'booked'
    AND EXISTS (
      SELECT 1
      FROM public.student_plans sp
      JOIN public.plans p ON p.id = sp.plan_id
      WHERE sp.student_id = auth.uid()
        AND sp.status = 'active'
        AND p.category = 'training'
        AND (
          p.total_sessions IS NULL
          OR p.total_sessions = 0
          OR (
            SELECT COUNT(*) FROM public.attendance a
            WHERE a.student_id = auth.uid()
              AND a.checked_in_at >= sp.start_at
              AND a.checked_in_at < COALESCE(sp.expires_at, now() + interval '1 year')
          ) < p.total_sessions
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.training_sessions s
      WHERE s.id = session_id
        AND s.scheduled_at >= now() + interval '1 hour'
        AND public.training_reservation_booked_count(s.id) < s.capacity
    )
  );

NOTIFY pgrst, 'reload schema';
