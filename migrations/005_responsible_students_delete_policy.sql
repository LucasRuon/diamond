-- Migração: Permitir que o responsável desvincule alunos (DELETE em responsible_students)
-- Executar no SQL Editor do Supabase Dashboard

-- ============================================================
-- Política de DELETE para responsible_students
-- Permite que o responsável remova seus próprios vínculos
-- e que admins removam qualquer vínculo.
-- ============================================================

DROP POLICY IF EXISTS "responsible_students_delete" ON public.responsible_students;

CREATE POLICY "responsible_students_delete" ON public.responsible_students
  FOR DELETE
  USING (
    responsible_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );
