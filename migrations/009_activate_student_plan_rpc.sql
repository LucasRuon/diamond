CREATE OR REPLACE FUNCTION public.activate_student_plan(p_student_plan_id UUID)
RETURNS public.student_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sp        public.student_plans;
  v_duration  INT;
  v_last_exp  TIMESTAMPTZ;
  v_start     TIMESTAMPTZ;
  v_is_admin  BOOLEAN;
BEGIN
  -- Apenas admin ou service_role pode ativar
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role::text = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT sp.*
    INTO v_sp
  FROM public.student_plans sp
  WHERE sp.id = p_student_plan_id
  FOR UPDATE;

  SELECT p.duration_days
    INTO v_duration
  FROM public.plans p
  WHERE p.id = v_sp.plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_plan not found';
  END IF;

  IF v_sp.status NOT IN ('pending_payment') THEN
    RAISE EXCEPTION 'invalid status transition from %', v_sp.status;
  END IF;

  -- Maior expires_at entre planos active do mesmo aluno e categoria
  SELECT MAX(sp2.expires_at)
    INTO v_last_exp
  FROM public.student_plans sp2
  JOIN public.plans p2 ON p2.id = sp2.plan_id
  JOIN public.plans pcur ON pcur.id = v_sp.plan_id
  WHERE sp2.student_id = v_sp.student_id
    AND sp2.id <> v_sp.id
    AND sp2.status = 'active'
    AND p2.category = pcur.category;

  v_start := GREATEST(COALESCE(v_last_exp, now()), now());

  UPDATE public.student_plans
  SET status       = 'active',
      activated_at = now(),
      start_at     = v_start,
      expires_at   = v_start + (v_duration || ' days')::interval
  WHERE id = p_student_plan_id
  RETURNING * INTO v_sp;

  RETURN v_sp;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_student_plan(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
