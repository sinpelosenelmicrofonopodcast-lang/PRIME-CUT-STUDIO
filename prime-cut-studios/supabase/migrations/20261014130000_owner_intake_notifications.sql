-- Persist an internal email and dashboard notice in the same transaction as intake.
create or replace function public.pc_notify_intake() returns trigger
language plpgsql set search_path=public as $$
declare data jsonb:=to_jsonb(new); source text:=tg_table_name||':'||(data->>'id'); kind text; target text; payload jsonb;
begin
 if tg_table_name='pc_talent_profiles' and data->>'source_application_id' is not null then return new; end if;
 if tg_table_name='pc_inquiries' then kind:='Solicitud de servicios o equipos';target:='/admin#leads';
 elsif tg_table_name='pc_casting_applications' then kind:='Aplicación de casting';target:='/team/casting';
 elsif tg_table_name='pc_talent_profiles' then kind:='Nuevo perfil de talento';target:='/team/talent';
 else kind:='Nueva cuenta confirmada';target:='/admin#leads'; end if;
 payload:=jsonb_strip_nulls(jsonb_build_object('path',target,'kind',kind,'name',coalesce(data->>'name',data->>'full_name'),'email',data->>'email','phone',data->>'phone','service',data->>'service','event_date',data->>'event_date','location',coalesce(data->>'location',data->>'city'),'budget',data->>'budget','details',case when tg_table_name='pc_inquiries' then data->>'details' else null end));
 insert into public.pc_email_outbox(dedupe_key,recipient,template,language,payload) values('owner-intake:'||source,'info@primecutstudiostx.com','owner_intake','es',payload) on conflict(dedupe_key) do nothing;
 insert into public.pc_notifications(owner_only,source_key,title,link) values(true,'owner-intake:'||source,kind,target) on conflict do nothing;
 if tg_table_name='pc_casting_applications' then
  insert into public.pc_email_outbox(dedupe_key,recipient,template,language,payload) values('casting-received:'||source,data->>'email','casting','en',jsonb_build_object('path','/casting')) on conflict(dedupe_key) do nothing;
 elsif tg_table_name='pc_talent_profiles' then
  insert into public.pc_email_outbox(dedupe_key,recipient,template,language,payload) values('talent-received:'||source,data->>'email','talent_received','en',jsonb_build_object('path','/talent/account')) on conflict(dedupe_key) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.pc_notify_intake() from public,anon,authenticated;
grant execute on function public.pc_notify_intake() to service_role;
create trigger pc_inquiry_notice after insert on public.pc_inquiries for each row execute function public.pc_notify_intake();
create trigger pc_casting_notice after insert on public.pc_casting_applications for each row execute function public.pc_notify_intake();
create trigger pc_talent_notice after insert on public.pc_talent_profiles for each row execute function public.pc_notify_intake();
create trigger pc_account_notice after insert on public.pc_client_accounts for each row execute function public.pc_notify_intake();
create or replace function public.pc_claim_email() returns setof public.pc_email_outbox language plpgsql set search_path=public as $$
declare selected uuid;begin
 update pc_email_outbox set state='expired',updated_at=now() where state in ('queued','blocked') and expires_at<now();
 update pc_email_outbox set state='unknown',last_error='LEASE_EXPIRED_CHECK_PROVIDER',updated_at=now() where state='processing' and lease_until<now();
 select id into selected from pc_email_outbox where state in ('queued','blocked') and template not in ('confirmation','recovery') and next_attempt<=now() and attempts<3 order by (template='owner_intake') desc,created_at for update skip locked limit 1;
 return query update pc_email_outbox set state='processing',attempts=attempts+1,lease_until=now()+interval '2 minutes',updated_at=now() where id=selected returning *;
end $$;
revoke all on function public.pc_claim_email() from public,anon,authenticated;
grant execute on function public.pc_claim_email() to service_role;
-- Catch up only outstanding business requests; do not resend customer receipts.
insert into public.pc_email_outbox(dedupe_key,recipient,template,language,payload)
select 'owner-intake:pc_inquiries:'||i.id::text,'info@primecutstudiostx.com','owner_intake','es',jsonb_strip_nulls(jsonb_build_object('path','/admin#leads','kind','Solicitud pendiente de atención','name',i.name,'email',i.email,'phone',i.phone,'service',i.service,'event_date',i.event_date::text,'location',i.location,'budget',i.budget,'details',i.details))
from public.pc_inquiries i where i.status='new'
on conflict(dedupe_key) do nothing;
insert into public.pc_notifications(owner_only,source_key,title,link)
select true,'owner-intake:pc_inquiries:'||i.id::text,'Solicitud pendiente de atención','/admin#leads' from public.pc_inquiries i where i.status='new' on conflict do nothing;
