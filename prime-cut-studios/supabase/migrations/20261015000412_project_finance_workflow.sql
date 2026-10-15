-- Project-scoped contract/invoice/deposit records. No payment processor or legal terms are created.
CREATE TABLE public.pc_project_finance (
 project_id uuid PRIMARY KEY REFERENCES public.pc_projects(id),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 proposal_id uuid NOT NULL REFERENCES public.pc_project_book_blocks(id),
 proposal_revision integer NOT NULL,
 contract_id uuid NOT NULL REFERENCES public.pc_project_book_blocks(id),
 invoice_id uuid NOT NULL REFERENCES public.pc_project_book_blocks(id),
 invoice_number text NOT NULL UNIQUE CHECK(length(invoice_number) BETWEEN 2 AND 80),
 total_cents bigint NOT NULL CHECK(total_cents BETWEEN 1 AND 100000000),
 deposit_cents bigint NOT NULL CHECK(deposit_cents BETWEEN 0 AND total_cents),
 signed_contract_id uuid REFERENCES public.pc_project_book_blocks(id),
 issued_by uuid REFERENCES public.pc_client_accounts(id),
 contract_verified_by uuid REFERENCES public.pc_client_accounts(id),
 confirmed_by uuid REFERENCES public.pc_client_accounts(id),
 contract_verified_at timestamptz,
 confirmed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.pc_project_receipts (
 id uuid PRIMARY KEY,
 project_id uuid NOT NULL REFERENCES public.pc_project_finance(project_id),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000000),
 reference text NOT NULL CHECK(length(reference) BETWEEN 2 AND 160),
 received_date date NOT NULL,
 actor_id uuid REFERENCES public.pc_client_accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(project_id,reference)
);
ALTER TABLE public.pc_project_finance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_project_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pc_project_finance,public.pc_project_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.pc_project_finance TO service_role;
GRANT SELECT,INSERT ON public.pc_project_receipts TO service_role;
CREATE OR REPLACE FUNCTION public.pc_manage_project_finance(p_project uuid,p_expected integer,p_action text,p_input jsonb,p_actor uuid)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE f public.pc_project_finance%rowtype; r public.pc_project_receipts%rowtype; doc uuid; paid bigint; proposal uuid; old_revision integer; project_status text;
BEGIN
 -- Serialize creation, edits and receipts on the parent as well as finance row.
 SELECT status INTO project_status FROM public.pc_projects WHERE id=p_project FOR UPDATE;
 IF NOT FOUND THEN RETURN 'not_found'; END IF;
 SELECT * INTO f FROM public.pc_project_finance WHERE project_id=p_project FOR UPDATE;
 -- An exact receipt retry is successful even after its first write advanced revision.
 IF p_action='receipt' THEN
  SELECT * INTO r FROM public.pc_project_receipts WHERE id=(p_input->>'id')::uuid;
  IF FOUND THEN
   IF r.project_id=p_project AND r.amount_cents=(p_input->>'amount')::bigint AND r.reference=p_input->>'reference' AND r.received_date=(p_input->>'date')::date THEN RETURN 'ok'; END IF;
   RETURN 'conflict';
  END IF;
 END IF;
 IF coalesce(f.revision,0)<>p_expected THEN RETURN 'conflict'; END IF;
 old_revision:=coalesce(f.revision,0);
 IF p_action='issue' THEN
  IF f.contract_verified_at IS NOT NULL OR f.confirmed_at IS NOT NULL OR EXISTS(SELECT 1 FROM public.pc_project_receipts WHERE project_id=p_project) THEN RETURN 'locked'; END IF;
  IF project_status NOT IN ('planning','quoted','contract','deposit-pending') THEN RETURN 'locked'; END IF;
  proposal:=(p_input->>'proposal')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.pc_project_book_blocks b WHERE b.id=proposal AND b.project_id=p_project AND b.client_visible AND b.requires_approval AND
   (SELECT br.kind FROM public.pc_project_book_responses br WHERE br.block_id=b.id AND br.revision=b.revision AND br.actor_kind='client' AND br.kind IN ('agree','changes') ORDER BY br.created_at DESC LIMIT 1)='agree') THEN RETURN 'proposal_pending'; END IF;
  FOREACH doc IN ARRAY ARRAY[(p_input->>'contract')::uuid,(p_input->>'invoice')::uuid] LOOP
   IF NOT EXISTS(SELECT 1 FROM public.pc_project_book_blocks WHERE id=doc AND project_id=p_project AND kind='document' AND client_visible AND file_mime='application/pdf' AND storage_path IS NOT NULL) THEN RETURN 'invalid_document'; END IF;
  END LOOP;
  IF p_input->>'contract'=p_input->>'invoice' THEN RETURN 'invalid_document'; END IF;
  INSERT INTO public.pc_project_finance(project_id,revision,proposal_id,proposal_revision,contract_id,invoice_id,invoice_number,total_cents,deposit_cents,issued_by)
   SELECT p_project,old_revision+1,proposal,b.revision,(p_input->>'contract')::uuid,(p_input->>'invoice')::uuid,p_input->>'number',(p_input->>'total')::bigint,(p_input->>'deposit')::bigint,p_actor FROM public.pc_project_book_blocks b WHERE b.id=proposal
   ON CONFLICT(project_id) DO UPDATE SET revision=excluded.revision,proposal_id=excluded.proposal_id,proposal_revision=excluded.proposal_revision,contract_id=excluded.contract_id,invoice_id=excluded.invoice_id,invoice_number=excluded.invoice_number,total_cents=excluded.total_cents,deposit_cents=excluded.deposit_cents,issued_by=excluded.issued_by,updated_at=now();
  UPDATE public.pc_projects SET status='contract',updated_at=now() WHERE id=p_project;
 ELSE
  IF f.project_id IS NULL THEN RETURN 'not_found'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.pc_project_book_blocks WHERE id=f.contract_id AND project_id=p_project AND client_visible AND storage_path IS NOT NULL) OR NOT EXISTS(SELECT 1 FROM public.pc_project_book_blocks WHERE id=f.invoice_id AND project_id=p_project AND client_visible AND storage_path IS NOT NULL) THEN RETURN 'invalid_document'; END IF;
  IF p_action='verify' THEN
   IF f.contract_verified_at IS NOT NULL THEN RETURN 'locked'; END IF;
   doc:=(p_input->>'signed')::uuid;
   IF doc=f.invoice_id OR NOT EXISTS(SELECT 1 FROM public.pc_project_book_blocks WHERE id=doc AND project_id=p_project AND kind='document' AND client_visible AND file_mime='application/pdf' AND storage_path IS NOT NULL) THEN RETURN 'invalid_document'; END IF;
   UPDATE public.pc_project_finance SET signed_contract_id=doc,contract_verified_at=now(),contract_verified_by=p_actor WHERE project_id=p_project;
   IF project_status IN ('planning','quoted','contract','deposit-pending') THEN UPDATE public.pc_projects SET status='deposit-pending',updated_at=now() WHERE id=p_project; END IF;
  ELSIF p_action='receipt' THEN
   SELECT coalesce(sum(amount_cents),0) INTO paid FROM public.pc_project_receipts WHERE project_id=p_project;
   IF (p_input->>'amount')::bigint<1 OR paid+(p_input->>'amount')::bigint>f.total_cents OR (p_input->>'date')::date>(now() AT TIME ZONE 'UTC')::date THEN RETURN 'invalid_payment'; END IF;
   IF EXISTS(SELECT 1 FROM public.pc_project_receipts WHERE project_id=p_project AND reference=p_input->>'reference') THEN RETURN 'conflict'; END IF;
   INSERT INTO public.pc_project_receipts(id,project_id,amount_cents,reference,received_date,actor_id) VALUES((p_input->>'id')::uuid,p_project,(p_input->>'amount')::bigint,p_input->>'reference',(p_input->>'date')::date,p_actor);
  ELSIF p_action='confirm' THEN
   SELECT coalesce(sum(amount_cents),0) INTO paid FROM public.pc_project_receipts WHERE project_id=p_project;
   IF f.contract_verified_at IS NULL OR paid<f.deposit_cents OR f.confirmed_at IS NOT NULL OR project_status NOT IN ('planning','quoted','contract','deposit-pending') OR NOT EXISTS(SELECT 1 FROM public.pc_projects WHERE id=p_project AND event_date IS NOT NULL) THEN RETURN 'not_ready'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.pc_project_book_blocks WHERE id=f.signed_contract_id AND project_id=p_project AND client_visible AND storage_path IS NOT NULL) THEN RETURN 'invalid_document'; END IF;
   UPDATE public.pc_project_finance SET confirmed_at=now(),confirmed_by=p_actor WHERE project_id=p_project;
   UPDATE public.pc_projects SET status='scheduled',updated_at=now() WHERE id=p_project;
  ELSE RETURN 'invalid_action'; END IF;
  UPDATE public.pc_project_finance SET revision=revision+1,updated_at=now() WHERE project_id=p_project;
 END IF;
 -- Existing notification/outbox system commits with the business action.
 PERFORM public.pc_notify_project(p_project,'finance:'||p_project||':'||(old_revision+1),'Contract / invoice / reservation update','project_update',p_actor,true);
 RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.pc_manage_project_finance(uuid,integer,text,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.pc_manage_project_finance(uuid,integer,text,jsonb,uuid) TO service_role;
