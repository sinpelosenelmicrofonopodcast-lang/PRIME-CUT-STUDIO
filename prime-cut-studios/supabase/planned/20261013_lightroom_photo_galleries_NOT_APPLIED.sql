-- PrimeCuts OS photo gallery links. STAGED / NOT APPLIED.
-- Only the owner may publish a gallery publicly after confirming written consent.
-- The user's Lightroom share link is NOT included in source control.
CREATE TABLE IF NOT EXISTS public.pc_photo_galleries(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 project_id uuid REFERENCES public.pc_projects(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(char_length(title) BETWEEN 2 AND 140),
 description text NOT NULL DEFAULT '' CHECK(char_length(description)<=1200),
 category text NOT NULL DEFAULT 'Photography' CHECK(category IN ('Photography','Events','Commercial','Portraits','Music Video','Other')),
 gallery_type text NOT NULL DEFAULT 'proofs' CHECK(gallery_type IN ('proofs','final_delivery','portfolio')),
 album_url text NOT NULL CHECK(char_length(album_url)<=1000),
 embed_url text CHECK(embed_url IS NULL OR char_length(embed_url)<=1000),
 visibility text NOT NULL DEFAULT 'draft' CHECK(visibility IN ('draft','client','public')),
 consent_confirmed boolean NOT NULL DEFAULT false,
 requested_downloads boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT pc_photo_galleries_client_scope CHECK(visibility<>'client' OR project_id IS NOT NULL),
 CONSTRAINT pc_photo_galleries_public_consent CHECK(visibility<>'public' OR consent_confirmed)
);
CREATE INDEX IF NOT EXISTS pc_photo_galleries_project_idx ON public.pc_photo_galleries(project_id,visibility,created_at DESC);
CREATE INDEX IF NOT EXISTS pc_photo_galleries_public_idx ON public.pc_photo_galleries(visibility,created_at DESC);
ALTER TABLE public.pc_photo_galleries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pc_photo_galleries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.pc_photo_galleries TO service_role;
-- Server must validate Adobe link hosts and project membership on EVERY request.
-- Adobe link access is independent of PrimeCuts login; use Invite only in Lightroom.
