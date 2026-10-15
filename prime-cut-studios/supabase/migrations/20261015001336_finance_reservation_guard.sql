-- Preserve legacy projects; projects using the new finance flow must finish reservation before production.
CREATE OR REPLACE FUNCTION public.pc_guard_financial_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.status IN ('scheduled','shooting','editing','client-review','delivered') AND EXISTS(SELECT 1 FROM public.pc_project_finance WHERE project_id=NEW.id AND confirmed_at IS NULL) THEN
  RAISE EXCEPTION 'Complete contract, deposit and reservation before production' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.pc_guard_financial_reservation() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_guard_financial_reservation() TO service_role;
CREATE TRIGGER pc_financial_reservation_guard BEFORE UPDATE OF status ON public.pc_projects
FOR EACH ROW EXECUTE FUNCTION public.pc_guard_financial_reservation();
