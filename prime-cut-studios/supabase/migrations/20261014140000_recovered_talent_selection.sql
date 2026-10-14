CREATE OR REPLACE FUNCTION public.pc_assign_project_talent(p_project uuid, p_talent uuid, p_expires timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 IF p_expires IS NULL OR p_expires <= now() OR p_expires > now()+interval '90 days'
 THEN RAISE EXCEPTION 'INVALID_TALENT_SELECTION_EXPIRY' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.pc_projects WHERE id=p_project;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.pc_talent_profiles
 WHERE id=p_talent AND bank_consent IS TRUE AND client_material_consent IS TRUE AND available IS TRUE;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO public.pc_talent_selections(project_id,talent_id,expires_at)
 VALUES(p_project,p_talent,p_expires)
 ON CONFLICT (project_id,talent_id)
 DO UPDATE SET expires_at=excluded.expires_at, revoked_at=NULL;
 RETURN true;
END
$function$
;
CREATE OR REPLACE FUNCTION public.pc_revoke_project_talent(p_project uuid, p_talent uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 UPDATE public.pc_talent_selections SET revoked_at=now()
 WHERE project_id=p_project AND talent_id=p_talent AND revoked_at IS NULL;
 RETURN FOUND;
END
$function$
;
REVOKE ALL ON FUNCTION public.pc_assign_project_talent(uuid,uuid,timestamptz),public.pc_revoke_project_talent(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_assign_project_talent(uuid,uuid,timestamptz),public.pc_revoke_project_talent(uuid,uuid) TO service_role;

