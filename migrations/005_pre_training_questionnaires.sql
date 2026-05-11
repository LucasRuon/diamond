-- Migração: respostas do questionário pré-treino
-- Executar após 004 no SQL Editor do Supabase Dashboard

CREATE TABLE IF NOT EXISTS public.pre_training_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recovery_score INTEGER NOT NULL CHECK (recovery_score BETWEEN 6 AND 20),
  wellness_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  weight_kg NUMERIC(5,2),
  submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'qrcode' CHECK (source IN ('qrcode', 'manual')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pre_training_questionnaires_session_student_unique UNIQUE (session_id, student_id),
  CONSTRAINT pre_training_questionnaires_weight_range CHECK (
    weight_kg IS NULL OR weight_kg BETWEEN 20 AND 250
  )
);

CREATE INDEX IF NOT EXISTS pre_training_questionnaires_session_idx
  ON public.pre_training_questionnaires(session_id);

CREATE INDEX IF NOT EXISTS pre_training_questionnaires_student_idx
  ON public.pre_training_questionnaires(student_id);

CREATE INDEX IF NOT EXISTS pre_training_questionnaires_submitted_at_idx
  ON public.pre_training_questionnaires(submitted_at);

CREATE OR REPLACE FUNCTION public.set_pre_training_questionnaires_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.prevent_pre_training_questionnaire_identity_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_id IS DISTINCT FROM OLD.session_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'session_id and student_id cannot be changed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pre_training_questionnaires_updated_at
  ON public.pre_training_questionnaires;

CREATE TRIGGER set_pre_training_questionnaires_updated_at
  BEFORE UPDATE ON public.pre_training_questionnaires
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pre_training_questionnaires_updated_at();

DROP TRIGGER IF EXISTS prevent_pre_training_questionnaire_identity_change
  ON public.pre_training_questionnaires;

CREATE TRIGGER prevent_pre_training_questionnaire_identity_change
  BEFORE UPDATE ON public.pre_training_questionnaires
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_pre_training_questionnaire_identity_change();

ALTER TABLE public.pre_training_questionnaires ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.pre_training_questionnaires TO authenticated;

DROP POLICY IF EXISTS "pre_training_questionnaires_select" ON public.pre_training_questionnaires;
DROP POLICY IF EXISTS "pre_training_questionnaires_insert" ON public.pre_training_questionnaires;
DROP POLICY IF EXISTS "pre_training_questionnaires_update" ON public.pre_training_questionnaires;

CREATE POLICY "pre_training_questionnaires_select" ON public.pre_training_questionnaires
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
        AND student_id = pre_training_questionnaires.student_id
    )
  );

CREATE POLICY "pre_training_questionnaires_insert" ON public.pre_training_questionnaires
  FOR INSERT
  WITH CHECK (
    (
      (
        student_id = auth.uid()
        AND submitted_by = auth.uid()
        AND source = 'qrcode'
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
    AND EXISTS (
      SELECT 1 FROM public.training_sessions
      WHERE id = session_id
        AND scheduled_at >= date_trunc('day', now())
        AND scheduled_at < date_trunc('day', now()) + interval '1 day'
    )
    AND EXISTS (
      SELECT 1 FROM public.student_plans
      WHERE student_id = pre_training_questionnaires.student_id
        AND status = 'active'
    )
  );

CREATE POLICY "pre_training_questionnaires_update" ON public.pre_training_questionnaires
  FOR UPDATE
  USING (
    student_id = auth.uid()
    OR (
      source = 'manual'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role::text = 'admin'
      )
    )
  )
  WITH CHECK (
    (
      student_id = auth.uid()
      AND submitted_by = auth.uid()
      AND source = 'qrcode'
    )
    OR (
      source = 'manual'
      AND submitted_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role::text = 'admin'
      )
    )
  );

NOTIFY pgrst, 'reload schema';
