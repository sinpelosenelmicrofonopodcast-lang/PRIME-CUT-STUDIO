-- Prime Cut Studios — isolated, private tables and private object storage.
-- Only the server's Supabase secret/service-role key can access customer records.
-- No policies are provided to anonymous or authenticated visitors.
CREATE TABLE IF NOT EXISTS public.pc_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) <= 254),
  phone text, service text NOT NULL,
  event_date date, location text, budget text, details text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','converted')),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_inquiries_created_idx ON public.pc_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS pc_inquiries_ip_idx ON public.pc_inquiries (ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS public.pc_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid UNIQUE REFERENCES public.pc_inquiries(id),
  client_name text NOT NULL, client_email text NOT NULL,
  title text NOT NULL, status text NOT NULL DEFAULT 'planning' CHECK (status IN
    ('planning','quoted','contract','deposit-pending','scheduled','shooting','editing','client-review','delivered','archived')),
  event_date date, location text,
  quote_amount_cents bigint CHECK (quote_amount_cents IS NULL OR quote_amount_cents BETWEEN 0 AND 100000000),
  quote_notes text NOT NULL DEFAULT '',
  portal_token_hash text UNIQUE,
  portal_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_projects_status_idx ON public.pc_projects (status);
CREATE INDEX IF NOT EXISTS pc_projects_updated_idx ON public.pc_projects (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.pc_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.pc_projects(id) ON DELETE CASCADE,
  title text NOT NULL, description text NOT NULL DEFAULT '', url text,
  visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_deliverables_project_idx ON public.pc_deliverables (project_id);

CREATE TABLE IF NOT EXISTS public.pc_portfolio_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, category text NOT NULL, summary text NOT NULL DEFAULT '',
  image_filename text NOT NULL, image_mime text NOT NULL,
  video_url text, consent_confirmed boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pc_portfolio_requires_consent CHECK (NOT published OR consent_confirmed)
);
CREATE INDEX IF NOT EXISTS pc_portfolio_created_idx ON public.pc_portfolio_entries (created_at DESC);

CREATE TABLE IF NOT EXISTS public.pc_admin_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash text NOT NULL, at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pc_admin_attempts_idx ON public.pc_admin_attempts (ip_hash, at DESC);

ALTER TABLE public.pc_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_portfolio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_admin_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pc_inquiries, public.pc_projects, public.pc_deliverables,
  public.pc_portfolio_entries, public.pc_admin_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.pc_admin_attempts_id_seq FROM PUBLIC, anon, authenticated;
-- Secret/service_role bypasses RLS; all access goes through authenticated Next.js server routes.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pc_inquiries, public.pc_projects,
 public.pc_deliverables, public.pc_portfolio_entries, public.pc_admin_attempts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.pc_admin_attempts_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.pc_convert_inquiry(
 p_inquiry_id uuid, p_project_id uuid, p_token_hash text, p_expires_at timestamptz)
RETURNS TABLE(project_id uuid, created boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public
AS $$
DECLARE rec public.pc_inquiries%ROWTYPE; stored uuid;
BEGIN
 SELECT * INTO rec FROM public.pc_inquiries WHERE id=p_inquiry_id FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT id INTO stored FROM public.pc_projects WHERE inquiry_id=p_inquiry_id;
 IF FOUND THEN project_id:=stored; created:=false; RETURN NEXT; RETURN; END IF;
 INSERT INTO public.pc_projects(id, inquiry_id, client_name, client_email, title,
 event_date, location, portal_token_hash, portal_expires_at)
 VALUES (p_project_id,p_inquiry_id,rec.name,rec.email,rec.service,rec.event_date,
 rec.location,p_token_hash,p_expires_at);
 UPDATE public.pc_inquiries SET status='converted' WHERE id=p_inquiry_id;
 project_id:=p_project_id; created:=true; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.pc_convert_inquiry(uuid,uuid,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pc_convert_inquiry(uuid,uuid,text,timestamptz) TO service_role;

-- A private Storage bucket: covers become viewable only through an approved Next.js media route.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('primecuts-portfolio', 'primecuts-portfolio', false, 4194304,
 ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO NOTHING;
