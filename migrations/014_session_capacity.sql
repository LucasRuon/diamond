-- Migration 014: training_sessions.capacity
-- REQ-WAIT-001

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 20
    CHECK (capacity > 0);

NOTIFY pgrst, 'reload schema';
