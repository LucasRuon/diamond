-- Migration 016: session_interests + push_subscriptions + RLS
-- REQ-WAIT-002, REQ-WAIT-003, REQ-WAIT-005, REQ-WAIT-009

-- ============== session_interests ==============
CREATE TABLE IF NOT EXISTS public.session_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','offered','accepted','expired','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  offered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS session_interests_active_uniq
  ON public.session_interests(session_id, student_id)
  WHERE status IN ('waiting','offered');

CREATE INDEX IF NOT EXISTS session_interests_fifo_idx
  ON public.session_interests(session_id, created_at)
  WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS session_interests_student_idx
  ON public.session_interests(student_id, status);

ALTER TABLE public.session_interests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.session_interests TO authenticated;

DROP POLICY IF EXISTS "session_interests_select" ON public.session_interests;
CREATE POLICY "session_interests_select" ON public.session_interests
  FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.responsible_students rs
      WHERE rs.responsible_id = auth.uid()
        AND rs.student_id = session_interests.student_id
    )
  );

DROP POLICY IF EXISTS "session_interests_insert" ON public.session_interests;
CREATE POLICY "session_interests_insert" ON public.session_interests
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND status = 'waiting'
    AND EXISTS (
      SELECT 1 FROM public.student_plans sp
      JOIN public.plans p ON p.id = sp.plan_id
      JOIN public.training_sessions s ON s.id = session_id
      WHERE sp.student_id = auth.uid()
        AND sp.status = 'active'
        AND p.category = 'training'
    )
  );

DROP POLICY IF EXISTS "session_interests_update" ON public.session_interests;
CREATE POLICY "session_interests_update" ON public.session_interests
  FOR UPDATE USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin')
  );

-- ============== push_subscriptions ==============
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS "push_subscriptions_select_self" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_self" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_delete" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============== RPC: contagem agregada de reservas por sessão ==============
-- Permite que alunos vejam quantas vagas estão ocupadas sem expor identidades
-- (RLS de training_reservations só deixa ver as próprias).
CREATE OR REPLACE FUNCTION public.session_booked_counts(p_session_ids UUID[])
RETURNS TABLE(session_id UUID, booked INT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT session_id, COUNT(*)::int AS booked
    FROM public.training_reservations
   WHERE session_id = ANY(p_session_ids)
     AND status = 'booked'
   GROUP BY session_id;
$$;

REVOKE ALL ON FUNCTION public.session_booked_counts(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.session_booked_counts(UUID[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
