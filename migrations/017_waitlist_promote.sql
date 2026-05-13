-- Migration 017: promote_waitlist() + trigger AFTER UPDATE em training_reservations
-- REQ-WAIT-006, REQ-WAIT-008, U3 (FOR UPDATE SKIP LOCKED para concorrência)

CREATE OR REPLACE FUNCTION public.promote_waitlist(p_session_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_capacity INT;
  v_booked   INT;
  v_offered  INT;
  v_pick     UUID;
BEGIN
  SELECT capacity INTO v_capacity FROM training_sessions WHERE id = p_session_id;
  IF v_capacity IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_booked
    FROM training_reservations
    WHERE session_id = p_session_id AND status = 'booked';

  SELECT COUNT(*) INTO v_offered
    FROM session_interests
    WHERE session_id = p_session_id
      AND status = 'offered'
      AND expires_at > now();

  IF (v_booked + v_offered) >= v_capacity THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_pick
    FROM session_interests
    WHERE session_id = p_session_id AND status = 'waiting'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

  IF v_pick IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE session_interests
    SET status = 'offered',
        offered_at = now(),
        expires_at = now() + interval '30 minutes',
        notified_at = NULL
    WHERE id = v_pick;

  PERFORM pg_notify('waitlist_offer', json_build_object(
    'interest_id', v_pick,
    'session_id', p_session_id
  )::text);

  RETURN v_pick;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_promote_after_cancel()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status = 'booked' THEN
    PERFORM public.promote_waitlist(NEW.session_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS training_reservations_promote ON public.training_reservations;
CREATE TRIGGER training_reservations_promote
  AFTER UPDATE ON public.training_reservations
  FOR EACH ROW EXECUTE FUNCTION public.trg_promote_after_cancel();

REVOKE ALL ON FUNCTION public.promote_waitlist(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_waitlist(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
