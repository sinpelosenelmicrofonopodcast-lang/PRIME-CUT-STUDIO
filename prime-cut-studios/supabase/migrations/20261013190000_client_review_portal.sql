-- PrimeCuts OS: client accounts, scoped membership, single-use invites, and external review links.
-- All tables are service-role-only; no anonymous or authenticated direct access.
CREATE TABLE IF NOT EXISTS public.pc_client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND char_length(email) BETWEEN 5 AND 254),
  name text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  disabled boolean NOT NULL DEFAULT false,
  session_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.pc_project_members (
  project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.pc_client_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id,account_id)
);
CREATE INDEX IF NOT EXISTS pc_members_account_idx ON public.pc_project_members(account_id);
CREATE TABLE IF NOT EXISTS public.pc_client_invites (
  token_hash text PRIMARY KEY CHECK (char_length(token_hash)=64),
  project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email=lower(trim(email))),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_invites_project_idx ON public.pc_client_invites(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.pc_client_login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_client_login_attempt_idx ON public.pc_client_login_attempts(ip_hash,occurred_at DESC);
ALTER TABLE public.pc_deliverables ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'drive'
  CHECK (provider IN ('drive','lightroom','blackmagic'));
ALTER TABLE public.pc_client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_client_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_client_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pc_client_accounts, public.pc_project_members,
 public.pc_client_invites, public.pc_client_login_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.pc_client_login_attempts_id_seq FROM PUBLIC,anon,authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pc_client_accounts, public.pc_project_members,
 public.pc_client_invites, public.pc_client_login_attempts TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.pc_client_login_attempts_id_seq TO service_role;
-- Atomic invitation redemption; runs under the caller's service role, never exposed to public clients.
CREATE OR REPLACE FUNCTION public.pc_accept_client_invite(
  p_token_hash text, p_new_password_hash text DEFAULT NULL, p_existing_account_id uuid DEFAULT NULL
) RETURNS TABLE(account_id uuid,project_id uuid)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public
AS $$
DECLARE i public.pc_client_invites%ROWTYPE; a public.pc_client_accounts%ROWTYPE; new_id uuid;
BEGIN
  SELECT * INTO i FROM public.pc_client_invites
    WHERE token_hash=p_token_hash AND redeemed_at IS NULL AND expires_at>now()
    FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF p_existing_account_id IS NOT NULL THEN
    SELECT * INTO a FROM public.pc_client_accounts
      WHERE id=p_existing_account_id AND email=i.email AND disabled=false FOR UPDATE;
    IF NOT FOUND THEN RETURN; END IF;
    new_id:=a.id;
  ELSE
    IF p_new_password_hash IS NULL OR char_length(p_new_password_hash)<100 THEN RETURN; END IF;
    INSERT INTO public.pc_client_accounts(email,name,password_hash)
      VALUES(i.email,(SELECT client_name FROM public.pc_projects WHERE id=i.project_id),p_new_password_hash)
      ON CONFLICT(email) DO NOTHING RETURNING id INTO new_id;
    IF new_id IS NULL THEN RETURN; END IF;
  END IF;
  INSERT INTO public.pc_project_members(project_id,account_id)
    VALUES(i.project_id,new_id) ON CONFLICT DO NOTHING;
  UPDATE public.pc_client_invites SET redeemed_at=now() WHERE token_hash=i.token_hash;
  account_id:=new_id; project_id:=i.project_id; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.pc_accept_client_invite(text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pc_accept_client_invite(text,text,uuid) TO service_role;
