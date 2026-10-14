-- Atomic public scope + private cost update; call only from authorized server routes.
CREATE UNIQUE INDEX IF NOT EXISTS pc_catalog_production_package_unique
 ON public.catalog_items ((metadata->>'package_id')) WHERE kind='production-package-2026';
CREATE OR REPLACE FUNCTION public.pc_save_production_package(
 p_package_id text,p_service_slug text,p_package jsonb,p_price_cents integer,
 p_cost_cents bigint,p_active boolean,p_display_order integer
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF p_package_id IS NULL OR length(p_package_id)>100 OR p_service_slug IS NULL
 OR p_package IS NULL OR jsonb_typeof(p_package)<>'object'
 OR p_package->>'id' IS DISTINCT FROM p_package_id
 OR p_price_cents IS NULL OR p_price_cents<1 OR p_price_cents>100000000
 OR p_cost_cents IS NULL OR p_cost_cents<0 OR p_cost_cents>100000000
 OR p_display_order IS NULL OR p_display_order<0 OR p_display_order>1000
 OR (p_package_id='gun-n-run' AND p_price_cents<>50000)
 THEN RAISE EXCEPTION 'INVALID_PACKAGE_INPUT' USING ERRCODE='22023';END IF;
 INSERT INTO public.catalog_items(id,kind,name,active,base_price_cents,metadata)
 VALUES(gen_random_uuid(),'production-package-2026',p_package->'title'->>'en',p_active,p_price_cents,
 jsonb_build_object('package_id',p_package_id,'service_slug',p_service_slug,'package',p_package,'display_order',p_display_order))
 ON CONFLICT ((metadata->>'package_id')) WHERE kind='production-package-2026'
 DO UPDATE SET name=excluded.name,active=excluded.active,base_price_cents=excluded.base_price_cents,metadata=excluded.metadata;
 INSERT INTO public.pc_pricing_costs(package_id,cost_cents,updated_at)
 VALUES(p_package_id,p_cost_cents,now())
 ON CONFLICT(package_id) DO UPDATE SET cost_cents=excluded.cost_cents,updated_at=excluded.updated_at;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.pc_save_production_package(text,text,jsonb,integer,bigint,boolean,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_save_production_package(text,text,jsonb,integer,bigint,boolean,integer) TO service_role;
