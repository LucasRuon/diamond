-- Migration 008: Clubes vinculados a alunos
-- Tabela clubs, bucket club-logos, coluna users.club_id, RLS e trigger

-- Bucket público club-logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-logos',
  'club-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- Tabela de clubes
CREATE TABLE IF NOT EXISTS public.clubs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  logo_bucket  TEXT DEFAULT 'club-logos',
  logo_path    TEXT,
  created_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  CONSTRAINT clubs_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT clubs_logo_bucket_check CHECK (logo_bucket = 'club-logos')
);

-- Índice único parcial: nomes ativos não duplicados (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS clubs_active_name_idx
  ON public.clubs (lower(trim(name)))
  WHERE deleted_at IS NULL;

-- Coluna club_id em users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_club_id_idx ON public.users (club_id);

-- RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.clubs TO authenticated;

-- Somente clubes não deletados são visíveis
CREATE POLICY clubs_select ON public.clubs
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Somente admin cria clube e registra o criador
CREATE POLICY clubs_insert ON public.clubs
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    AND created_by = auth.uid()
  );

-- Somente admin atualiza (incluindo soft-delete)
CREATE POLICY clubs_update ON public.clubs
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Storage policies para club-logos
CREATE POLICY club_logos_select ON storage.objects
  FOR SELECT USING (bucket_id = 'club-logos');

CREATE POLICY club_logos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-logos'
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY club_logos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-logos'
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY club_logos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-logos'
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Trigger para manter updated_at atualizado
CREATE OR REPLACE FUNCTION public.set_clubs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_clubs_updated_at ON public.clubs;
CREATE TRIGGER set_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.set_clubs_updated_at();

NOTIFY pgrst, 'reload schema';
