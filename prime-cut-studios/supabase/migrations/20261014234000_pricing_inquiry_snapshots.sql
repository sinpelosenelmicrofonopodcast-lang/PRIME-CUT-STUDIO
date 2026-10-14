-- Additive; old deployments continue to work. No customer data is rewritten.
ALTER TABLE public.pc_inquiries ADD COLUMN IF NOT EXISTS request_id uuid;
ALTER TABLE public.pc_inquiries ADD COLUMN IF NOT EXISTS request_snapshot jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS pc_inquiries_request_id_unique ON public.pc_inquiries(request_id) WHERE request_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.pc_pricing_costs (
 package_id text PRIMARY KEY,
 cost_cents bigint NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pc_pricing_costs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pc_pricing_costs FROM anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pc_pricing_costs TO service_role;
-- Public reads use the existing server-side catalog loader and explicit field selection.
-- Preserve the legacy catalog access rules for other kinds of items.
ALTER POLICY "catalog public read" ON public.catalog_items
 USING ((kind <> 'production-package-2026' AND active = true) OR (SELECT private.is_staff()));
