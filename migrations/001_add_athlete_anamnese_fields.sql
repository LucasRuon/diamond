-- Migração: Adicionar campos de anamnese do atleta na tabela users
-- Executar no SQL Editor do Supabase Dashboard

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_club TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS height_cm INTEGER;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS athlete_record_url TEXT;
