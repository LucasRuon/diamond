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
      SELECT 1 FROM public.training_sessions
      WHERE id = session_id
        AND scheduled_at >= now() + interval '24 hours'
    )
  );

NOTIFY pgrst, 'reload schema';
