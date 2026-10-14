-- PrimeCuts OS unified operations, casting and rental availability.
-- STAGED ONLY: apply before activating UI. Do not run automatically during builds.
-- All tables private; only trusted server requests using SUPABASE_SECRET_KEY may access.
CREATE TABLE IF NOT EXISTS public.pc_staff_members(
 account_id uuid PRIMARY KEY REFERENCES public.pc_client_accounts(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('administrator','secretary','producer','casting_manager','editor','photographer','crew','finance')),
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.pc_staff_projects(
 account_id uuid NOT NULL REFERENCES public.pc_staff_members(account_id) ON DELETE CASCADE,
 project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 PRIMARY KEY(account_id,project_id));
CREATE INDEX IF NOT EXISTS pc_staff_projects_project_idx ON public.pc_staff_projects(project_id);
CREATE TABLE IF NOT EXISTS public.pc_staff_invites(
 token_hash text PRIMARY KEY CHECK(char_length(token_hash)=64),
 email text NOT NULL CHECK(email=lower(trim(email))),
 role text NOT NULL CHECK(role IN ('administrator','secretary','producer','casting_manager','editor','photographer','crew','finance')),
 project_id uuid REFERENCES public.pc_projects(id) ON DELETE SET NULL,
 expires_at timestamptz NOT NULL, redeemed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS pc_staff_invites_email_idx ON public.pc_staff_invites(email,created_at DESC);
CREATE TABLE IF NOT EXISTS public.pc_operational_tasks(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(char_length(title) BETWEEN 2 AND 180),
 description text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','doing','blocked','done')),
 assigned_account_id uuid REFERENCES public.pc_client_accounts(id) ON DELETE SET NULL,
 due_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS pc_tasks_project_idx ON public.pc_operational_tasks(project_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.pc_casting_calls(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(char_length(title) BETWEEN 3 AND 160),
 description text NOT NULL DEFAULT '',requirements text NOT NULL DEFAULT '',location text,
 pay_details text,closes_at timestamptz,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','closed','archived')),
 published_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS pc_casting_calls_project_idx ON public.pc_casting_calls(project_id,status);
CREATE TABLE IF NOT EXISTS public.pc_casting_applications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 casting_call_id uuid NOT NULL REFERENCES public.pc_casting_calls(id) ON DELETE CASCADE,
 full_name text NOT NULL CHECK(char_length(full_name) BETWEEN 2 AND 140),
 email text NOT NULL CHECK(email=lower(trim(email))),
 phone text,city text,portfolio_url text,headshot_url text,experience text,availability text,
 consent_at timestamptz NOT NULL,ip_hash text NOT NULL,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','under_review','shortlisted','offered','selected','declined','withdrawn')),
 private_notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(casting_call_id,email));
CREATE INDEX IF NOT EXISTS pc_casting_applications_call_idx ON public.pc_casting_applications(casting_call_id,status);
CREATE INDEX IF NOT EXISTS pc_casting_applications_ip_idx ON public.pc_casting_applications(ip_hash,created_at DESC);
CREATE TABLE IF NOT EXISTS public.pc_equipment_overrides(
 asset_id text PRIMARY KEY CHECK(char_length(asset_id) BETWEEN 6 AND 80),
 rental_approved boolean NOT NULL DEFAULT false,
 disabled boolean NOT NULL DEFAULT false,
 photo_url text,
 daily_rate_cents integer CHECK(daily_rate_cents IS NULL OR (daily_rate_cents>=0 AND daily_rate_cents<=10000000)),
 item_notes text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.pc_operational_audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid,
 actor_kind text NOT NULL,
 project_id uuid REFERENCES public.pc_projects(id) ON DELETE SET NULL,
 action text NOT NULL,subject_type text NOT NULL,subject_id text,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,occurred_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS pc_audit_project_idx ON public.pc_operational_audit(project_id,occurred_at DESC);
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['pc_staff_members','pc_staff_projects','pc_staff_invites','pc_operational_tasks','pc_casting_calls','pc_casting_applications','pc_equipment_overrides','pc_operational_audit']
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO service_role',t);
 END LOOP;
END $$;
REVOKE ALL ON SEQUENCE public.pc_operational_audit_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.pc_operational_audit_id_seq TO service_role;
-- Server-only atomic staff invitation redemption. Existing account MUST be
-- authenticated and account id verified by API before this function is called.
CREATE OR REPLACE FUNCTION public.pc_accept_staff_invite(
 p_token_hash text,p_new_password_hash text DEFAULT NULL,p_existing_account_id uuid DEFAULT NULL)
RETURNS TABLE(account_id uuid,role text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE inv public.pc_staff_invites%ROWTYPE; a public.pc_client_accounts%ROWTYPE; new_id uuid;
BEGIN
 SELECT * INTO inv FROM public.pc_staff_invites WHERE token_hash=p_token_hash
  AND redeemed_at IS NULL AND expires_at>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 IF p_existing_account_id IS NOT NULL THEN
  SELECT * INTO a FROM public.pc_client_accounts WHERE id=p_existing_account_id AND email=inv.email AND disabled=false FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  new_id:=a.id;
 ELSE
  IF p_new_password_hash IS NULL OR char_length(p_new_password_hash)<100 THEN RETURN; END IF;
  INSERT INTO public.pc_client_accounts(email,name,password_hash) VALUES(inv.email,inv.email,p_new_password_hash)
  ON CONFLICT(email) DO NOTHING RETURNING id INTO new_id;
  IF new_id IS NULL THEN RETURN; END IF;
 END IF;
 INSERT INTO public.pc_staff_members(account_id,role) VALUES(new_id,inv.role)
 ON CONFLICT ON CONSTRAINT pc_staff_members_pkey DO NOTHING;
 IF NOT FOUND THEN RETURN; END IF;
 IF inv.project_id IS NOT NULL THEN
  INSERT INTO public.pc_staff_projects(account_id,project_id) VALUES(new_id,inv.project_id) ON CONFLICT DO NOTHING;
 END IF;
 UPDATE public.pc_staff_invites SET redeemed_at=now() WHERE token_hash=inv.token_hash;
 account_id:=new_id;role:=inv.role;RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.pc_accept_staff_invite(text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_accept_staff_invite(text,text,uuid) TO service_role;
