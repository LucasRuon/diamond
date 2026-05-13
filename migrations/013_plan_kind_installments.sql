-- Migration 013: plans.kind + plans.max_installments + seed dos 5 níveis padrão
-- REQ-PLAN-001, REQ-PLAN-002, REQ-PLAN-003

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_kind') THEN
    CREATE TYPE plan_kind AS ENUM ('avulsa','basic','plus','pro','elite','custom');
  END IF;
END$$;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS kind plan_kind NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS max_installments INT NOT NULL DEFAULT 1
    CHECK (max_installments BETWEEN 1 AND 12);

-- Seed: 5 kinds × 2 tiers × 2 categorias = 20 registros base.
-- price=0 (admin define depois). Nome combina Kind + Tier + Categoria.
-- Seed dinâmico: descobre o tipo real (enum) das colunas `category` e `tier`
-- em runtime e faz o cast adequado. Funciona para text, varchar e enums
-- customizados (plan_category, plan_tier, etc.).
DO $seed$
DECLARE
  cat_type TEXT;
  tier_type TEXT;
  rec record;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO cat_type
    FROM pg_attribute
   WHERE attrelid = 'public.plans'::regclass AND attname = 'category';

  SELECT format_type(atttypid, atttypmod) INTO tier_type
    FROM pg_attribute
   WHERE attrelid = 'public.plans'::regclass AND attname = 'tier';

  FOR rec IN
    SELECT
      initcap(k::text) || ' ' || initcap(t) || ' ' || initcap(c) AS p_name,
      c AS p_category, t AS p_tier, dur AS p_dur,
      sess AS p_sess, inst AS p_inst, k AS p_kind
    FROM (VALUES
      ('avulsa'::plan_kind, 10,  1, 1),
      ('basic'::plan_kind,  30,  4, 2),
      ('plus'::plan_kind,   45,  6, 2),
      ('pro'::plan_kind,    60,  8, 3),
      ('elite'::plan_kind,  75, 12, 4)
    ) AS x(k, dur, sess, inst)
    CROSS JOIN (VALUES ('pre_diamond'), ('diamond_x')) AS y(t)
    CROSS JOIN (VALUES ('training'), ('physio')) AS z(c)
  LOOP
    EXECUTE format(
      'INSERT INTO public.plans (name, category, tier, price, duration_days, total_sessions, max_installments, kind) '
      || 'VALUES ($1, $2::%s, $3::%s, 0, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
      cat_type, tier_type
    )
    USING rec.p_name, rec.p_category, rec.p_tier, rec.p_dur,
          rec.p_sess, rec.p_inst, rec.p_kind;
  END LOOP;
END
$seed$;

NOTIFY pgrst, 'reload schema';
