-- Correção: ajustar RLS do questionário pré-treino para data local e check-in manual admin
-- Executar após 005 no SQL Editor do Supabase Dashboard

DROP POLICY IF EXISTS "pre_training_questionnaires_insert" ON public.pre_training_questionnaires;
DROP POLICY IF EXISTS "pre_training_questionnaires_update" ON public.pre_training_questionnaires;

CREATE POLICY "pre_training_questionnaires_insert" ON public.pre_training_questionnaires
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.training_sessions
      WHERE id = session_id
        AND (scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
    )
    AND (
      (
        student_id = auth.uid()
        AND submitted_by = auth.uid()
        AND source = 'qrcode'
        AND EXISTS (
          SELECT 1 FROM public.student_plans
          WHERE student_id = pre_training_questionnaires.student_id
            AND status = 'active'
        )
      )
      OR (
        source = 'manual'
        AND submitted_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role::text = 'admin'
        )
      )
    )
  );

CREATE POLICY "pre_training_questionnaires_update" ON public.pre_training_questionnaires
  FOR UPDATE
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.training_sessions
      WHERE id = session_id
        AND (scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
    )
    AND (
      (
        student_id = auth.uid()
        AND submitted_by = auth.uid()
        AND source = 'qrcode'
        AND EXISTS (
          SELECT 1 FROM public.student_plans
          WHERE student_id = pre_training_questionnaires.student_id
            AND status = 'active'
        )
      )
      OR (
        source = 'manual'
        AND submitted_by = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role::text = 'admin'
        )
      )
    )
  );

NOTIFY pgrst, 'reload schema';
