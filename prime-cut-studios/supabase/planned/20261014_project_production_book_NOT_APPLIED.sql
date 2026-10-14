-- Additive production workspace proposal. LOCAL QA ONLY; not applied to production.
BEGIN;
CREATE TABLE public.pc_project_creation_keys(
 request_id uuid NOT NULL,actor_key text NOT NULL,project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(request_id,actor_key));
CREATE TABLE public.pc_project_book_blocks(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('brief','location','cast','script','palette','shot_list','schedule','deliverables','document','reference','custom')),
 title text NOT NULL CHECK(length(title) BETWEEN 2 AND 160),body text NOT NULL DEFAULT '' CHECK(length(body)<=20000),
 metadata jsonb NOT NULL DEFAULT '{"colors":[],"links":[]}'::jsonb CHECK(octet_length(metadata::text)<=15000),
 client_visible boolean NOT NULL DEFAULT false,requires_approval boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),position integer NOT NULL DEFAULT 1,
 storage_path text,original_filename text,file_mime text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(project_id,id));
CREATE INDEX pc_project_book_project_idx ON public.pc_project_book_blocks(project_id,position);
CREATE TABLE public.pc_project_book_versions(
 block_id uuid NOT NULL REFERENCES public.pc_project_book_blocks(id) ON DELETE CASCADE,revision integer NOT NULL,
 snapshot jsonb NOT NULL,actor_id uuid REFERENCES public.pc_client_accounts(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(block_id,revision));
CREATE TABLE public.pc_project_book_responses(
 id uuid PRIMARY KEY,project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 block_id uuid NOT NULL,revision integer NOT NULL,account_id uuid REFERENCES public.pc_client_accounts(id),actor_kind text NOT NULL DEFAULT 'client' CHECK(actor_kind IN ('client','staff')),
 kind text NOT NULL CHECK(kind IN ('agree','changes','comment')),body text NOT NULL CHECK(length(body) BETWEEN 1 AND 3000),
 created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(project_id,block_id) REFERENCES public.pc_project_book_blocks(project_id,id));
CREATE INDEX pc_book_responses_block_idx ON public.pc_project_book_responses(block_id,created_at DESC);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['pc_project_creation_keys','pc_project_book_blocks','pc_project_book_versions','pc_project_book_responses'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
 EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO service_role',t);
 END LOOP; END $$;
CREATE FUNCTION public.pc_create_production_project(p_request_id uuid,p_actor_id uuid,p_project_id uuid,p_input jsonb,p_invite_hash text)
RETURNS TABLE(project_id uuid,created boolean) LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE creator_key text:=COALESCE(p_actor_id::text,'legacy-owner');stored uuid;email text:=lower(trim(p_input->>'email'));
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text||creator_key));
 SELECT k.project_id INTO stored FROM public.pc_project_creation_keys k WHERE k.request_id=p_request_id AND k.actor_key=creator_key;
 IF FOUND THEN project_id:=stored;created:=false;RETURN NEXT;RETURN;END IF;
 INSERT INTO public.pc_projects(id,client_name,client_email,title,event_date,location)
 VALUES(p_project_id,p_input->>'name',COALESCE(email,''),p_input->>'title',NULLIF(p_input->>'eventDate','')::date,NULLIF(p_input->>'location',''));
 IF p_actor_id IS NOT NULL THEN
 INSERT INTO public.pc_staff_projects(account_id,project_id) VALUES(p_actor_id,p_project_id);
 END IF;
 INSERT INTO public.pc_project_book_blocks(project_id,kind,title,body,metadata,client_visible,position)
 VALUES(p_project_id,'brief','Resumen del proyecto',COALESCE(p_input->>'brief',''),jsonb_build_object('colors','[]'::jsonb,'links','[]'::jsonb,'planningDate',p_input->>'planningDate','deliveryDate',p_input->>'deliveryDate'),false,1);
 INSERT INTO public.pc_project_stages(project_id,position,title,description,planned_start,planned_end)
 SELECT p_project_id,x.ord::integer,x.entry->>0,x.entry->>1,
 CASE WHEN x.ord=5 THEN NULLIF(p_input->>'planningDate','')::date ELSE NULL END,
 CASE WHEN x.ord=12 THEN NULLIF(p_input->>'deliveryDate','')::date ELSE NULL END
 FROM jsonb_array_elements(p_input->'stages') WITH ORDINALITY AS x(entry,ord);
 IF email<>'' THEN
 INSERT INTO public.pc_client_invites(token_hash,project_id,email,member_role,expires_at)
 VALUES(p_invite_hash,p_project_id,email,'reviewer',now()+interval '7 days');
 END IF;
 INSERT INTO public.pc_project_creation_keys(request_id,actor_key,project_id) VALUES(p_request_id,creator_key,p_project_id);
 project_id:=p_project_id;created:=true;RETURN NEXT;END $$;
CREATE FUNCTION public.pc_save_project_book(p_block_id uuid,p_project_id uuid,p_expected_revision integer,p_input jsonb,p_actor_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE old public.pc_project_book_blocks%ROWTYPE;b public.pc_project_book_blocks%ROWTYPE;BEGIN
 SELECT * INTO old FROM public.pc_project_book_blocks WHERE id=p_block_id FOR UPDATE;
 IF FOUND THEN
 IF old.project_id<>p_project_id OR old.revision<>p_expected_revision THEN RETURN false;END IF;
 INSERT INTO public.pc_project_book_versions(block_id,revision,snapshot,actor_id) VALUES(old.id,old.revision,to_jsonb(old),p_actor_id) ON CONFLICT DO NOTHING;
 UPDATE public.pc_project_book_blocks SET title=p_input->>'title',kind=p_input->>'kind',body=p_input->>'body',metadata=p_input->'metadata',
 client_visible=(p_input->>'client_visible')::boolean,requires_approval=(p_input->>'requires_approval')::boolean,revision=revision+1,updated_at=now() WHERE id=old.id RETURNING * INTO b;
 ELSE
 IF p_expected_revision<>0 THEN RETURN false;END IF;
 INSERT INTO public.pc_project_book_blocks(id,project_id,kind,title,body,metadata,client_visible,requires_approval,position)
 VALUES(p_block_id,p_project_id,p_input->>'kind',p_input->>'title',p_input->>'body',p_input->'metadata',(p_input->>'client_visible')::boolean,(p_input->>'requires_approval')::boolean,COALESCE((SELECT max(position)+1 FROM public.pc_project_book_blocks WHERE project_id=p_project_id),1)) RETURNING * INTO b;
 END IF;
 INSERT INTO public.pc_project_book_versions(block_id,revision,snapshot,actor_id) VALUES(b.id,b.revision,to_jsonb(b),p_actor_id) ON CONFLICT DO NOTHING;
 RETURN true;END $$;
CREATE FUNCTION public.pc_respond_project_book(p_id uuid,p_project_id uuid,p_block_id uuid,p_revision integer,p_account_id uuid,p_kind text,p_body text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE b public.pc_project_book_blocks%ROWTYPE;BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.pc_project_members m JOIN public.pc_client_accounts a ON a.id=m.account_id WHERE m.project_id=p_project_id AND m.account_id=p_account_id AND m.member_role='reviewer' AND NOT a.disabled) THEN RETURN false;END IF;
 SELECT * INTO b FROM public.pc_project_book_blocks WHERE id=p_block_id AND project_id=p_project_id FOR UPDATE;
 IF NOT FOUND OR NOT b.client_visible OR b.revision<>p_revision OR p_kind NOT IN ('agree','changes','comment') THEN RETURN false;END IF;
 IF EXISTS(SELECT 1 FROM public.pc_project_book_responses WHERE id=p_id AND account_id=p_account_id AND block_id=p_block_id) THEN RETURN true;END IF;
 INSERT INTO public.pc_project_book_responses(id,project_id,block_id,revision,account_id,kind,body) VALUES(p_id,p_project_id,p_block_id,p_revision,p_account_id,p_kind,p_body);
 RETURN true;END $$;
REVOKE ALL ON FUNCTION public.pc_create_production_project(uuid,uuid,uuid,jsonb,text),public.pc_save_project_book(uuid,uuid,integer,jsonb,uuid),public.pc_respond_project_book(uuid,uuid,uuid,integer,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_create_production_project(uuid,uuid,uuid,jsonb,text),public.pc_save_project_book(uuid,uuid,integer,jsonb,uuid),public.pc_respond_project_book(uuid,uuid,uuid,integer,uuid,text,text) TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('primecuts-project-documents','primecuts-project-documents',false,3145728,ARRAY['application/pdf','image/jpeg','image/png','image/webp']::text[]);
COMMIT;
