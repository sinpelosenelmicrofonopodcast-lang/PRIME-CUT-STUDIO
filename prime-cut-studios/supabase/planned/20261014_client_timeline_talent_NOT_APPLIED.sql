-- REVIEW ONLY. No production execution, build hooks, or automatic migration.
-- Requires existing client portal and casting/operations schema.
BEGIN;
ALTER TABLE public.pc_project_members ADD COLUMN member_role text NOT NULL DEFAULT 'reviewer' CHECK(member_role IN ('viewer','reviewer'));
ALTER TABLE public.pc_client_invites ADD COLUMN member_role text NOT NULL DEFAULT 'reviewer' CHECK(member_role IN ('viewer','reviewer'));
CREATE TABLE public.pc_client_profiles (
 account_id uuid PRIMARY KEY REFERENCES public.pc_client_accounts(id) ON DELETE CASCADE,
 company text NOT NULL DEFAULT '' CHECK(length(company)<=140), phone text NOT NULL DEFAULT '' CHECK(length(phone)<=40),
 language text NOT NULL DEFAULT 'en' CHECK(language IN ('en','es')),
 contact_method text NOT NULL DEFAULT 'email' CHECK(contact_method IN ('email','phone','portal')),
 preferences text NOT NULL DEFAULT '' CHECK(length(preferences)<=1500),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pc_privacy_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_id uuid REFERENCES public.pc_client_accounts(id) ON DELETE SET NULL,
 kind text NOT NULL CHECK(kind IN ('correction','export','deletion')), details text NOT NULL CHECK(length(details)<=1500),
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewing','completed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pc_project_stages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 position integer NOT NULL CHECK(position BETWEEN 1 AND 100),title text NOT NULL CHECK(length(title) BETWEEN 2 AND 120),
 description text NOT NULL DEFAULT '' CHECK(length(description)<=1000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','waiting_client','blocked','completed','not_applicable')),
 planned_start date,planned_end date,dates_confirmed boolean NOT NULL DEFAULT false,
 actual_start timestamptz,actual_end timestamptz,next_step text NOT NULL DEFAULT '' CHECK(length(next_step)<=1000),
 responsible text NOT NULL DEFAULT '' CHECK(length(responsible)<=120), revision integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,position), UNIQUE(project_id,id),
 CHECK(planned_start IS NULL OR planned_end IS NULL OR planned_end>=planned_start)
);
CREATE TABLE public.pc_project_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 stage_id uuid,actor_id uuid REFERENCES public.pc_client_accounts(id) ON DELETE SET NULL,
 actor_kind text NOT NULL CHECK(actor_kind IN ('client','staff')),kind text NOT NULL CHECK(kind IN ('message','stage_update','approval','revision_requested')),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 3000),client_visible boolean NOT NULL DEFAULT true,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,revision integer,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(project_id,stage_id) REFERENCES public.pc_project_stages(project_id,id)
);
CREATE INDEX pc_events_project_idx ON public.pc_project_events(project_id,created_at DESC);
CREATE INDEX pc_stages_project_idx ON public.pc_project_stages(project_id,position);
CREATE TABLE public.pc_talent_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),source_application_id uuid UNIQUE REFERENCES public.pc_casting_applications(id) ON DELETE SET NULL,
 full_name text NOT NULL CHECK(length(full_name) BETWEEN 2 AND 140),email text NOT NULL,phone text,city text,ip_hash text,
 portfolio_url text,headshot_url text,experience text,availability text,
 bank_consent boolean NOT NULL DEFAULT false,client_material_consent boolean NOT NULL DEFAULT false,
 available boolean NOT NULL DEFAULT true,consent_version text NOT NULL,
 manage_token_hash text NOT NULL UNIQUE CHECK(length(manage_token_hash)=64),manage_expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pc_talent_consent_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),talent_id uuid NOT NULL REFERENCES public.pc_talent_profiles(id) ON DELETE CASCADE,
 bank_consent boolean NOT NULL,client_material_consent boolean NOT NULL,consent_version text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pc_talent_selections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 talent_id uuid NOT NULL REFERENCES public.pc_talent_profiles(id) ON DELETE CASCADE,
 created_by uuid REFERENCES public.pc_client_accounts(id) ON DELETE SET NULL, expires_at timestamptz NOT NULL,
 revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id,talent_id)
);
ALTER TABLE public.pc_casting_applications ADD COLUMN consent_version text;
-- Legacy records intentionally remain NULL: no consent is inferred.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['pc_client_profiles','pc_privacy_requests','pc_project_stages','pc_project_events','pc_talent_profiles','pc_talent_consent_events','pc_talent_selections'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE FUNCTION public.pc_update_stage(p_stage_id uuid,p_expected_revision integer,p_values jsonb,p_actor_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.pc_project_stages%ROWTYPE; BEGIN
 SELECT * INTO s FROM public.pc_project_stages WHERE id=p_stage_id FOR UPDATE;
 IF NOT FOUND OR s.revision<>p_expected_revision THEN RETURN false; END IF;
 UPDATE public.pc_project_stages SET title=p_values->>'title',description=p_values->>'description',status=p_values->>'status',
 planned_start=NULLIF(p_values->>'planned_start','')::date,planned_end=NULLIF(p_values->>'planned_end','')::date,
 dates_confirmed=(p_values->>'dates_confirmed')::boolean,next_step=p_values->>'next_step',responsible=p_values->>'responsible',
 actual_start=CASE WHEN p_values->>'status'='in_progress' THEN COALESCE(actual_start,now()) ELSE actual_start END,
 actual_end=CASE WHEN p_values->>'status'='completed' THEN COALESCE(actual_end,now()) ELSE NULL END,
 revision=revision+1,updated_at=now() WHERE id=s.id;
 INSERT INTO public.pc_project_events(project_id,stage_id,actor_id,actor_kind,kind,body,revision,details)
 VALUES(s.project_id,s.id,p_actor_id,'staff','stage_update',p_values->>'reason',s.revision+1,jsonb_build_object('previous',to_jsonb(s),'updated',p_values-'reason'));
 RETURN true; END $$;
CREATE FUNCTION public.pc_client_project_action(p_event_id uuid,p_project_id uuid,p_account_id uuid,p_stage_id uuid,p_revision integer,p_kind text,p_body text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.pc_project_stages%ROWTYPE; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.pc_project_members m JOIN public.pc_client_accounts a ON a.id=m.account_id
 WHERE m.project_id=p_project_id AND m.account_id=p_account_id AND NOT a.disabled AND m.member_role='reviewer') THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.pc_project_events WHERE id=p_event_id AND project_id=p_project_id AND actor_id=p_account_id) THEN RETURN true; END IF;
 IF p_kind NOT IN ('message','approval','revision_requested') THEN RETURN false; END IF;
 IF p_kind<>'message' THEN
 SELECT * INTO s FROM public.pc_project_stages WHERE id=p_stage_id AND project_id=p_project_id FOR UPDATE;
 IF NOT FOUND OR s.status<>'waiting_client' OR s.revision<>p_revision THEN RETURN false; END IF;
 UPDATE public.pc_project_stages SET status=CASE WHEN p_kind='approval' THEN 'completed' ELSE 'in_progress' END,
 actual_end=CASE WHEN p_kind='approval' THEN now() ELSE NULL END,actual_start=COALESCE(actual_start,now()),
 revision=revision+1,updated_at=now() WHERE id=s.id;
 END IF;
 INSERT INTO public.pc_project_events(id,project_id,stage_id,actor_id,actor_kind,kind,body,revision)
 VALUES(p_event_id,p_project_id,CASE WHEN p_kind='message' THEN NULL ELSE p_stage_id END,p_account_id,'client',p_kind,p_body,p_revision);
 RETURN true; END $$;
CREATE FUNCTION public.pc_apply_casting_with_talent(p_application jsonb,p_bank boolean,p_material boolean,p_token_hash text,p_version text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE app_id uuid:=gen_random_uuid();talent_id uuid;BEGIN
 -- Serialize by address so concurrent requests cannot bypass the public limit.
 PERFORM pg_advisory_xact_lock(hashtext(p_application->>'ip_hash'));
 IF (SELECT count(*) FROM public.pc_casting_applications WHERE ip_hash=p_application->>'ip_hash' AND created_at>now()-interval '1 hour')>=5 THEN RAISE EXCEPTION 'APPLICATION_LIMIT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pc_casting_calls WHERE id=(p_application->>'casting_call_id')::uuid AND status='open' AND (closes_at IS NULL OR closes_at>now())) THEN RAISE EXCEPTION 'CASTING_CLOSED'; END IF;
 INSERT INTO public.pc_casting_applications(id,casting_call_id,full_name,email,phone,city,portfolio_url,headshot_url,experience,availability,consent_at,ip_hash,consent_version)
 VALUES(app_id,(p_application->>'casting_call_id')::uuid,p_application->>'full_name',p_application->>'email',p_application->>'phone',p_application->>'city',p_application->>'portfolio_url',p_application->>'headshot_url',p_application->>'experience',p_application->>'availability',now(),p_application->>'ip_hash',p_version);
 IF p_bank THEN
 INSERT INTO public.pc_talent_profiles(source_application_id,full_name,email,phone,city,ip_hash,portfolio_url,headshot_url,experience,availability,bank_consent,client_material_consent,consent_version,manage_token_hash,manage_expires_at)
 VALUES(app_id,p_application->>'full_name',p_application->>'email',p_application->>'phone',p_application->>'city',p_application->>'ip_hash',p_application->>'portfolio_url',p_application->>'headshot_url',p_application->>'experience',p_application->>'availability',true,p_material,p_version,p_token_hash,now()+interval '180 days') RETURNING id INTO talent_id;
 INSERT INTO public.pc_talent_consent_events(talent_id,bank_consent,client_material_consent,consent_version) VALUES(talent_id,true,p_material,p_version);
 END IF; RETURN app_id;END $$;
CREATE FUNCTION public.pc_update_talent(p_token_hash text,p_bank boolean,p_material boolean,p_available boolean,p_experience text,p_availability text,p_version text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE t public.pc_talent_profiles%ROWTYPE; BEGIN
 SELECT * INTO t FROM public.pc_talent_profiles WHERE manage_token_hash=p_token_hash AND manage_expires_at>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE public.pc_talent_profiles SET bank_consent=p_bank,client_material_consent=p_bank AND p_material,available=p_available,
 experience=p_experience,availability=p_availability,consent_version=p_version,updated_at=now() WHERE id=t.id;
 IF t.bank_consent<>p_bank OR t.client_material_consent<>(p_bank AND p_material) THEN
 INSERT INTO public.pc_talent_consent_events(talent_id,bank_consent,client_material_consent,consent_version) VALUES(t.id,p_bank,p_bank AND p_material,p_version);
 END IF;
 IF NOT p_bank OR NOT p_material OR NOT p_available THEN UPDATE public.pc_talent_selections SET revoked_at=now() WHERE talent_id=t.id AND revoked_at IS NULL; END IF;
 RETURN true; END $$;
REVOKE ALL ON FUNCTION public.pc_update_stage(uuid,integer,jsonb,uuid),public.pc_client_project_action(uuid,uuid,uuid,uuid,integer,text,text),public.pc_apply_casting_with_talent(jsonb,boolean,boolean,text,text),public.pc_update_talent(text,boolean,boolean,boolean,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_update_stage(uuid,integer,jsonb,uuid),public.pc_client_project_action(uuid,uuid,uuid,uuid,integer,text,text),public.pc_apply_casting_with_talent(jsonb,boolean,boolean,text,text),public.pc_update_talent(text,boolean,boolean,boolean,text,text,text) TO service_role;
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
  INSERT INTO public.pc_project_members(project_id,account_id,member_role)
    VALUES(i.project_id,new_id,i.member_role) ON CONFLICT DO NOTHING;
  UPDATE public.pc_client_invites SET redeemed_at=now() WHERE token_hash=i.token_hash;
  account_id:=new_id; project_id:=i.project_id; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.pc_accept_client_invite(text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pc_accept_client_invite(text,text,uuid) TO service_role;


CREATE FUNCTION public.pc_join_talent_bank(p_profile jsonb,p_material boolean,p_token_hash text,p_version text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE t uuid; BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(p_profile->>'ip_hash'));
 IF (SELECT count(*) FROM public.pc_talent_profiles WHERE ip_hash=p_profile->>'ip_hash' AND created_at>now()-interval '1 hour')>=5 THEN RAISE EXCEPTION 'APPLICATION_LIMIT'; END IF;
 INSERT INTO public.pc_talent_profiles(full_name,email,phone,city,ip_hash,portfolio_url,headshot_url,experience,availability,bank_consent,client_material_consent,consent_version,manage_token_hash,manage_expires_at)
 VALUES(p_profile->>'full_name',p_profile->>'email',p_profile->>'phone',p_profile->>'city',p_profile->>'ip_hash',p_profile->>'portfolio_url',p_profile->>'headshot_url',p_profile->>'experience',p_profile->>'availability',true,p_material,p_version,p_token_hash,now()+interval '180 days') RETURNING id INTO t;
 INSERT INTO public.pc_talent_consent_events(talent_id,bank_consent,client_material_consent,consent_version) VALUES(t,true,p_material,p_version);
 RETURN t; END $$;
REVOKE ALL ON FUNCTION public.pc_join_talent_bank(jsonb,boolean,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_join_talent_bank(jsonb,boolean,text,text) TO service_role;

COMMIT;
