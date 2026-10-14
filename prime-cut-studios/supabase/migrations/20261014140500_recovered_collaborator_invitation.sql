CREATE OR REPLACE FUNCTION public.pc_invite_project_collaborator(p_project uuid, p_email text, p_role text, p_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE target_email text := lower(btrim(p_email));
BEGIN
 IF target_email IS NULL OR char_length(target_email) > 254
  OR target_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  OR p_role IS NULL OR p_role NOT IN ('viewer','reviewer')
  OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$'
 THEN RAISE EXCEPTION 'INVALID_COLLABORATOR_INVITATION' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.pc_projects WHERE id=p_project FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 -- Inviting another collaborator must NOT rewrite the project's primary client email
 -- or invalidate other members/invitations.
 UPDATE public.pc_client_invites
 SET expires_at=now()
 WHERE project_id=p_project AND email=target_email
  AND redeemed_at IS NULL AND expires_at>now();
 INSERT INTO public.pc_client_invites(token_hash,project_id,email,member_role,expires_at)
 VALUES(p_hash,p_project,target_email,p_role,now()+interval '7 days');
 RETURN true;
END
$function$
;
REVOKE ALL ON FUNCTION public.pc_invite_project_collaborator(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_invite_project_collaborator(uuid,text,text,text) TO service_role;

