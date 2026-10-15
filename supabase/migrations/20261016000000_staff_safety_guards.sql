-- Staff safety guards: small-team, owner-only edits.
-- Run this in Supabase SQL Editor if testing manually, otherwise `supabase db push`.
-- Idempotent so copy-paste into Table Editor SQL is safe.

-- 1. profiles.is_active was used by the app but never in migrations. Add it safely.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Block deleting / deactivating / demoting the last active OWNER.
CREATE OR REPLACE FUNCTION public.prevent_last_owner_loss()
RETURNS TRIGGER AS $$
DECLARE
  active_owners INT;
BEGIN
  -- Only care about rows that were an active owner before the change
  IF OLD.role = 'OWNER' AND COALESCE(OLD.is_active, TRUE) = TRUE THEN
    -- Case A: hard delete of an active owner
    IF TG_OP = 'DELETE' THEN
      SELECT COUNT(*) INTO active_owners
      FROM public.profiles
      WHERE role = 'OWNER'
        AND COALESCE(is_active, TRUE) = TRUE
        AND id <> OLD.id;
      IF active_owners < 1 THEN
        RAISE EXCEPTION 'Cannot remove the last active owner.';
      END IF;
      RETURN OLD;
    END IF;

    -- Case B: deactivation (is_active true -> false) or demotion (OWNER -> STAFF)
    IF TG_OP = 'UPDATE' THEN
      IF (COALESCE(NEW.is_active, TRUE) = FALSE AND COALESCE(OLD.is_active, TRUE) = TRUE)
         OR (NEW.role <> 'OWNER') THEN
        SELECT COUNT(*) INTO active_owners
        FROM public.profiles
        WHERE role = 'OWNER'
          AND COALESCE(is_active, TRUE) = TRUE
          AND id <> OLD.id;
        IF active_owners < 1 THEN
          RAISE EXCEPTION 'Cannot deactivate or demote the last active owner.';
        END IF;
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profiles_no_last_owner_loss ON public.profiles;
CREATE TRIGGER trg_profiles_no_last_owner_loss
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_loss();
