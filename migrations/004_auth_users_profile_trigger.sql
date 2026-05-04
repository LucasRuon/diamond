-- Migracao: criar perfil de aplicacao para usuarios do Supabase Auth
-- Executar no SQL Editor do Supabase Dashboard apos 002_rls_security.sql

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
  safe_role public.user_role;
BEGIN
  requested_role := COALESCE(new.raw_user_meta_data->>'role', 'student');

  safe_role := CASE
    WHEN requested_role IN ('student', 'responsible', 'businessman')
      THEN requested_role::public.user_role
    ELSE 'student'::public.user_role
  END;

  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    cpf,
    phone,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), new.email),
    safe_role,
    NULLIF(new.raw_user_meta_data->>'cpf', ''),
    NULLIF(new.raw_user_meta_data->>'phone', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = excluded.full_name,
    cpf = excluded.cpf,
    phone = excluded.phone,
    updated_at = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

NOTIFY pgrst, 'reload schema';
