-- PrimeCuts OS equipment holds and checkout. STAGED ONLY.
-- Apply AFTER 20261013_operations_casting_rentals_NOT_APPLIED.sql.
-- One record per physical asset; use unique asset IDs in the asset tracker.
CREATE TABLE IF NOT EXISTS public.pc_equipment_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 asset_id text NOT NULL CHECK(char_length(asset_id) BETWEEN 6 AND 80),
 project_id uuid REFERENCES public.pc_projects(id) ON DELETE SET NULL,
 requester_name text NOT NULL CHECK(char_length(requester_name) BETWEEN 2 AND 160),
 start_date date NOT NULL,
 end_date date NOT NULL,
 status text NOT NULL DEFAULT 'hold' CHECK(status IN ('hold','confirmed','cancelled','returned')),
 hold_expires_at timestamptz NOT NULL DEFAULT (now()+interval '48 hours'),
 checked_out_at timestamptz,checked_in_at timestamptz,
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT booking_dates_valid CHECK(end_date>=start_date)
);
CREATE INDEX IF NOT EXISTS pc_equipment_bookings_dates_idx ON public.pc_equipment_bookings(asset_id,start_date,end_date);
ALTER TABLE public.pc_equipment_bookings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pc_equipment_bookings FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pc_equipment_bookings TO service_role;
-- Lock a stable integer key for this asset to serialize concurrent book attempts.
-- Service role only; transactions end automatically on failure.
CREATE OR REPLACE FUNCTION public.pc_reserve_equipment(
 p_asset_id text,p_requester text,p_start date,p_end date,p_project_id uuid DEFAULT NULL)
RETURNS TABLE(booking_id uuid,booked boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE new_id uuid;
BEGIN
 IF p_asset_id IS NULL OR char_length(p_asset_id)<6 OR char_length(p_asset_id)>80
 OR p_requester IS NULL OR char_length(trim(p_requester))<2 OR p_start IS NULL OR p_end IS NULL
 OR p_end<p_start THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(p_asset_id));
 IF EXISTS (
  SELECT 1 FROM public.pc_equipment_bookings b WHERE b.asset_id=p_asset_id
  AND (b.status='confirmed' OR (b.status='hold' AND b.hold_expires_at>now())) AND b.start_date<=p_end AND b.end_date>=p_start
 ) THEN booking_id:=NULL;booked:=false;RETURN NEXT;RETURN; END IF;
 new_id:=gen_random_uuid();
 INSERT INTO public.pc_equipment_bookings(id,asset_id,project_id,requester_name,start_date,end_date)
 VALUES(new_id,p_asset_id,p_project_id,p_requester,p_start,p_end);
 booking_id:=new_id;booked:=true;RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.pc_reserve_equipment(text,text,date,date,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_reserve_equipment(text,text,date,date,uuid) TO service_role;

-- Transitions from hold to confirmed must also be atomic and conflict-free.
CREATE OR REPLACE FUNCTION public.pc_confirm_equipment_booking(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE b public.pc_equipment_bookings%ROWTYPE;
BEGIN
 SELECT * INTO b FROM public.pc_equipment_bookings WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR b.status<>'hold' OR b.hold_expires_at<=now() THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(b.asset_id));
 IF EXISTS(SELECT 1 FROM public.pc_equipment_bookings x WHERE x.asset_id=b.asset_id AND x.id<>b.id
   AND (x.status='confirmed' OR (x.status='hold' AND x.hold_expires_at>now()))
   AND x.start_date<=b.end_date AND x.end_date>=b.start_date) THEN RETURN false; END IF;
 UPDATE public.pc_equipment_bookings SET status='confirmed' WHERE id=p_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.pc_confirm_equipment_booking(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_confirm_equipment_booking(uuid) TO service_role;
