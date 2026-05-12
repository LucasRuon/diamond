-- Migração: documentos físicos vinculados ao perfil do aluno
-- Executar após 006 no SQL Editor do Supabase Dashboard

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'student-documents',
  'student-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'athlete_record',
  storage_bucket TEXT NOT NULL DEFAULT 'student-documents',
  storage_path TEXT NOT NULL UNIQUE,
  original_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760),
  visible_to_student BOOLEAN NOT NULL DEFAULT true,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT student_documents_document_type_check CHECK (
    document_type IN ('athlete_record', 'medical', 'authorization', 'other')
  ),
  CONSTRAINT student_documents_bucket_check CHECK (
    storage_bucket = 'student-documents'
  ),
  CONSTRAINT student_documents_title_not_empty_check CHECK (
    length(trim(title)) > 0
  )
);

CREATE INDEX IF NOT EXISTS student_documents_student_active_idx
  ON public.student_documents(student_id, deleted_at, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS student_documents_uploaded_by_idx
  ON public.student_documents(uploaded_by);

CREATE INDEX IF NOT EXISTS student_documents_document_type_idx
  ON public.student_documents(document_type);

CREATE OR REPLACE FUNCTION public.prevent_student_document_identity_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.storage_bucket IS DISTINCT FROM OLD.storage_bucket
     OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
     OR NEW.original_file_name IS DISTINCT FROM OLD.original_file_name
     OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
     OR NEW.file_size IS DISTINCT FROM OLD.file_size
     OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
     OR NEW.uploaded_at IS DISTINCT FROM OLD.uploaded_at THEN
    RAISE EXCEPTION 'student document identity fields cannot be changed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_student_document_identity_change
  ON public.student_documents;

CREATE TRIGGER prevent_student_document_identity_change
  BEFORE UPDATE ON public.student_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_student_document_identity_change();

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.student_documents TO authenticated;

DROP POLICY IF EXISTS "student_documents_select" ON public.student_documents;
DROP POLICY IF EXISTS "student_documents_insert" ON public.student_documents;
DROP POLICY IF EXISTS "student_documents_update" ON public.student_documents;

CREATE POLICY "student_documents_select" ON public.student_documents
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role::text = 'admin'
      )
      OR (
        student_id = auth.uid()
        AND visible_to_student = true
      )
    )
  );

CREATE POLICY "student_documents_insert" ON public.student_documents
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role::text = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = student_id AND role::text = 'student'
    )
  );

CREATE POLICY "student_documents_update" ON public.student_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role::text = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = student_id AND role::text = 'student'
    )
  );

DROP POLICY IF EXISTS "student_documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "student_documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "student_documents_storage_delete" ON storage.objects;

CREATE POLICY "student_documents_storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'student-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role::text = 'admin'
      )
      OR EXISTS (
        SELECT 1 FROM public.student_documents
        WHERE storage_bucket = storage.objects.bucket_id
          AND storage_path = storage.objects.name
          AND student_id = auth.uid()
          AND visible_to_student = true
          AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY "student_documents_storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'student-documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

CREATE POLICY "student_documents_storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'student-documents'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role::text = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
