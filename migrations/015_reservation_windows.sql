-- Migration 015: janelas de reserva (1h marcar / 2h cancelar) + capacity no INSERT
-- REQ-RES-001, REQ-RES-002, REQ-RES-005

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
        AND (
          SELECT COUNT(*) FROM public.training_reservations r
          WHERE r.session_id = s.id AND r.status = 'booked'
        ) < s.capacity
    )
  );

DROP POLICY IF EXISTS "training_reservations_update" ON public.training_reservations;

CREATE POLICY "training_reservations_update" ON public.training_reservations
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin')
    OR (student_id = auth.uid() AND status = 'booked')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin')
    OR (
      student_id = auth.uid()
      AND status = 'cancelled'
      AND cancelled_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.training_sessions s
        WHERE s.id = session_id
          AND s.scheduled_at >= now() + interval '2 hours'
      )
    )
  );

NOTIFY pgrst, 'reload schema';
