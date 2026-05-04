-- Migração de segurança: RLS para bloquear auto-escalada de role e proteger dados sensíveis
-- Executar no SQL Editor do Supabase Dashboard

-- ============================================================
-- Adicionar 'businessman' ao enum user_role (se ainda não existir)
-- ============================================================
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'businessman';

-- ============================================================
-- VULN-001: Impedir que usuários alterem o próprio campo role
-- ============================================================
-- Garante que nenhum usuário autenticado pode promover a si mesmo para admin
-- (ou qualquer outro role) via Supabase SDK. Apenas service_role pode alterar role.

-- Habilitar RLS nas tabelas principais (se ainda não estiver ativo)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsible_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para recriar de forma consistente
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_no_role_escalation" ON public.users;

-- Leitura: usuários autenticados podem ler todos os usuários
-- (necessário para o fluxo de vincular alunos a responsáveis)
CREATE POLICY "users_select" ON public.users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Update: usuário pode atualizar apenas seus próprios dados,
-- e o campo `role` deve permanecer idêntico ao atual (impedindo escalada).
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- ============================================================
-- Tabela attendance: aluno vê apenas suas presenças,
-- responsável vê presenças dos alunos vinculados, admin vê tudo.
-- ============================================================
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
DROP POLICY IF EXISTS "attendance_insert" ON public.attendance;
DROP POLICY IF EXISTS "attendance_delete" ON public.attendance;

CREATE POLICY "attendance_select" ON public.attendance
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.responsible_students
      WHERE responsible_id = auth.uid() AND student_id = attendance.student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "attendance_insert" ON public.attendance
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "attendance_delete" ON public.attendance
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

-- ============================================================
-- Tabela student_plans: usuário vê seus próprios planos,
-- admin vê todos.
-- ============================================================
DROP POLICY IF EXISTS "student_plans_select" ON public.student_plans;
DROP POLICY IF EXISTS "student_plans_insert" ON public.student_plans;
DROP POLICY IF EXISTS "student_plans_update" ON public.student_plans;

CREATE POLICY "student_plans_select" ON public.student_plans
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR purchased_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "student_plans_insert" ON public.student_plans
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    OR purchased_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "student_plans_update" ON public.student_plans
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

-- ============================================================
-- Tabela plans: leitura pública para autenticados,
-- escrita apenas para admins.
-- ============================================================
DROP POLICY IF EXISTS "plans_select" ON public.plans;
DROP POLICY IF EXISTS "plans_write" ON public.plans;

CREATE POLICY "plans_select" ON public.plans
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "plans_write" ON public.plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

-- ============================================================
-- Tabela training_sessions: leitura pública, escrita admin.
-- ============================================================
DROP POLICY IF EXISTS "training_sessions_select" ON public.training_sessions;
DROP POLICY IF EXISTS "training_sessions_write" ON public.training_sessions;

CREATE POLICY "training_sessions_select" ON public.training_sessions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "training_sessions_write" ON public.training_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

-- ============================================================
-- Tabela responsible_students: responsável gerencia seus vínculos.
-- ============================================================
DROP POLICY IF EXISTS "responsible_students_select" ON public.responsible_students;
DROP POLICY IF EXISTS "responsible_students_insert" ON public.responsible_students;

CREATE POLICY "responsible_students_select" ON public.responsible_students
  FOR SELECT
  USING (
    responsible_id = auth.uid()
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "responsible_students_insert" ON public.responsible_students
  FOR INSERT
  WITH CHECK (
    responsible_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role::text IN ('responsible', 'businessman', 'admin')
    )
  );
