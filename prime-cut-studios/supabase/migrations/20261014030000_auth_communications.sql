-- Additive migration. Auth identity is assigned ONLY by the trusted server after GoTrue verification.
alter table public.pc_client_accounts add column if not exists auth_user_id uuid unique;
create table public.pc_auth_pending (email text primary key,auth_user_id uuid not null,name text not null,kind text not null check(kind in ('client','talent')),language text not null check(language in ('en','es')),privacy_version text not null default 'account-services-2026-10-14',created_at timestamptz not null default now());
create table public.pc_action_limits (key text not null,at timestamptz not null default now());
create index on public.pc_action_limits(key,at);
create table public.pc_email_outbox (id uuid primary key default gen_random_uuid(),dedupe_key text unique not null,recipient text not null,template text not null,language text not null default 'en',payload jsonb not null default '{}',state text not null default 'queued' check(state in ('queued','processing','blocked','accepted','delivered','bounced','failed','unknown','expired')),attempts integer not null default 0,next_attempt timestamptz not null default now(),lease_until timestamptz,expires_at timestamptz,provider_id text,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.pc_email_events (id text primary key,provider_id text,type text not null,created_at timestamptz not null default now());
create table public.pc_email_suppressions (email text primary key,reason text not null,created_at timestamptz not null default now());
create table public.pc_notifications (id uuid primary key default gen_random_uuid(),account_id uuid references public.pc_client_accounts(id),owner_only boolean not null default false,project_id uuid references public.pc_projects(id),source_key text not null,title text not null,link text not null,read_at timestamptz,created_at timestamptz not null default now(),check(account_id is not null or owner_only));
create unique index on public.pc_notifications(source_key,coalesce(account_id::text,'owner'));
create table public.pc_message_reads (event_id uuid references public.pc_project_events(id) on delete cascade,reader_key text not null,read_at timestamptz not null default now(),primary key(event_id,reader_key));
create table public.pc_newsletter (email text primary key,language text not null check(language in ('es','en')),segment text not null default 'subscriber' check(segment in ('client','talent','subscriber')),state text not null check(state in ('pending','subscribed','unsubscribed','bounced')),consent_at timestamptz not null,consent_version text not null,confirmed_at timestamptz,unsubscribed_at timestamptz,confirm_hash text,confirm_expires timestamptz,manage_hash text,created_at timestamptz not null default now());
create or replace function public.pc_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtext(p_key));
 if (select count(*) from pc_action_limits where key=p_key and at>now()-make_interval(secs=>p_seconds))>=p_limit then return false;end if;
 insert into pc_action_limits(key) values(p_key);return true;
end $$;
create or replace function public.pc_link_auth_account(p_uid uuid,p_email text,p_name text) returns uuid language plpgsql set search_path=public as $$
declare result uuid;begin
 insert into pc_client_accounts(email,name,password_hash,auth_user_id) values(lower(p_email),left(p_name,140),'supabase-auth',p_uid)
 on conflict(email) do update set auth_user_id=excluded.auth_user_id where pc_client_accounts.auth_user_id is null or pc_client_accounts.auth_user_id=excluded.auth_user_id returning id into result;
 return result;end $$;
create or replace function public.pc_invalidate_sessions(p_id uuid) returns void language sql set search_path=public as $$ update pc_client_accounts set session_version=session_version+1 where id=p_id; $$;
create or replace function public.pc_claim_email() returns setof public.pc_email_outbox language plpgsql set search_path=public as $$
declare selected uuid;begin
 update pc_email_outbox set state='expired',updated_at=now() where state in ('queued','blocked') and expires_at<now();
 update pc_email_outbox set state='unknown',last_error='LEASE_EXPIRED_CHECK_PROVIDER',updated_at=now() where state='processing' and lease_until<now();
 select id into selected from pc_email_outbox where state in ('queued','blocked') and next_attempt<=now() and attempts<3 order by created_at for update skip locked limit 1;
 return query update pc_email_outbox set state='processing',attempts=attempts+1,lease_until=now()+interval '2 minutes',updated_at=now() where id=selected returning *;end $$;
alter table public.pc_project_book_responses add column client_visible boolean not null default true;
update public.pc_project_book_responses r set client_visible=b.client_visible from public.pc_project_book_blocks b where r.block_id=b.id;
create function public.pc_book_response_visibility() returns trigger language plpgsql set search_path=public as $$ begin new.client_visible=(select client_visible from pc_project_book_blocks where id=new.block_id);return new;end $$;
create trigger pc_response_visibility before insert on public.pc_project_book_responses for each row execute function public.pc_book_response_visibility();
revoke all on function public.pc_book_response_visibility() from public,anon,authenticated;
-- Notifications and operational mail are atomic with the saved event. Never include message text/private notes.
create or replace function public.pc_notify_project(p_project uuid,p_source text,p_title text,p_template text,p_actor uuid,p_clients boolean) returns void language plpgsql set search_path=public as $$
declare member record;begin
 for member in select a.id,a.email,coalesce(p.language,'en') as language,case when s.account_id is not null then '/team/projects/' else '/client/projects/' end as base
 from pc_client_accounts a left join pc_client_profiles p on p.account_id=a.id left join pc_staff_members s on s.account_id=a.id and s.active
 where not a.disabled and a.id is distinct from p_actor and
 ((p_clients and exists(select 1 from pc_project_members m where m.project_id=p_project and m.account_id=a.id)) or (s.account_id is not null and (s.role in ('owner','administrator') or exists(select 1 from pc_staff_projects sp where sp.project_id=p_project and sp.account_id=a.id)))) loop
 insert into pc_notifications(account_id,project_id,source_key,title,link) values(member.id,p_project,p_source,p_title,member.base||p_project||'#conversation') on conflict do nothing;
 insert into pc_email_outbox(dedupe_key,recipient,template,language,payload) values(p_source||':'||member.id,member.email,p_template,member.language,jsonb_build_object('path',member.base||p_project||'#conversation')) on conflict(dedupe_key) do nothing;
 end loop;
 insert into pc_notifications(owner_only,project_id,source_key,title,link) values(true,p_project,p_source,p_title,'/team/projects/'||p_project||'#conversation') on conflict do nothing;
 if p_actor is not null and not exists(select 1 from pc_email_outbox where dedupe_key like p_source||':%' and recipient='info@primecutstudiostx.com') then insert into pc_email_outbox(dedupe_key,recipient,template,language,payload) values(p_source||':owner','info@primecutstudiostx.com',p_template,'es',jsonb_build_object('path','/team/projects/'||p_project||'#conversation')) on conflict do nothing;end if;
end $$;
create or replace function public.pc_notify_event() returns trigger language plpgsql set search_path=public as $$ begin
 perform pc_notify_project(new.project_id,'event:'||new.id,case when new.kind='message' then 'New project message' else 'Project update / decision' end,case when new.kind='message' then 'message' else 'project_update' end,new.actor_id,new.client_visible);return new;end $$;
create trigger pc_event_notifications after insert on public.pc_project_events for each row execute function public.pc_notify_event();
create or replace function public.pc_notify_book() returns trigger language plpgsql set search_path=public as $$ begin
 if new.client_visible and (TG_OP='INSERT' or new.revision<>old.revision or not old.client_visible) then perform pc_notify_project(new.project_id,'book:'||new.id||':'||new.revision,'Document / production proposal available',case when new.requires_approval then 'approval' else 'document' end,null,true);end if;return new;end $$;
create trigger pc_book_notifications after insert or update on public.pc_project_book_blocks for each row execute function public.pc_notify_book();
create or replace function public.pc_notify_book_response() returns trigger language plpgsql set search_path=public as $$ begin
 perform pc_notify_project(new.project_id,'response:'||new.id,'Production proposal response','decision',new.account_id,new.client_visible);return new;end $$;
create trigger pc_response_notifications after insert on public.pc_project_book_responses for each row execute function public.pc_notify_book_response();
-- Newsletter token use is atomic; suppressed addresses require a NEW explicit opt-in and new confirmation.
create or replace function public.pc_newsletter_confirm(p_hash text,p_manage text) returns boolean language plpgsql set search_path=public as $$ declare recipient text;begin
 update pc_newsletter set state='subscribed',confirmed_at=now(),confirm_hash=null,manage_hash=p_manage,unsubscribed_at=null where confirm_hash=p_hash and state='pending' and confirm_expires>now() returning email into recipient;
 return recipient is not null;end $$;
create or replace function public.pc_newsletter_manage(p_hash text,p_action text,p_language text) returns boolean language plpgsql set search_path=public as $$ declare recipient text;begin
 if p_action='unsubscribe' then update pc_newsletter set state='unsubscribed',unsubscribed_at=now() where manage_hash=p_hash returning email into recipient;
 elsif p_action='language' and p_language in ('es','en') then update pc_newsletter set language=p_language where manage_hash=p_hash returning email into recipient;end if;
 return recipient is not null;end $$;
do $$ declare t text;begin foreach t in array array['pc_auth_pending','pc_action_limits','pc_email_outbox','pc_email_events','pc_email_suppressions','pc_notifications','pc_message_reads','pc_newsletter'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;end $$;
revoke all on function public.pc_rate_limit(text,integer,integer),public.pc_link_auth_account(uuid,text,text),public.pc_invalidate_sessions(uuid),public.pc_claim_email(),public.pc_notify_project(uuid,text,text,text,uuid,boolean),public.pc_notify_event(),public.pc_notify_book(),public.pc_notify_book_response(),public.pc_newsletter_confirm(text,text),public.pc_newsletter_manage(text,text,text) from public,anon,authenticated;
grant execute on function public.pc_rate_limit(text,integer,integer),public.pc_link_auth_account(uuid,text,text),public.pc_invalidate_sessions(uuid),public.pc_claim_email(),public.pc_newsletter_confirm(text,text),public.pc_newsletter_manage(text,text,text) to service_role;

grant execute on function public.pc_notify_project(uuid,text,text,text,uuid,boolean) to service_role;

notify pgrst,'reload schema';
create function public.pc_email_delivery_event(p_id text,p_provider text,p_type text) returns void language plpgsql set search_path=public as $$ declare target_email text;begin
 insert into pc_email_events(id,provider_id,type) values(p_id,p_provider,p_type) on conflict do nothing;if not found then return;end if;
 if p_type='email.bounced' then
 update pc_email_outbox set state='bounced',updated_at=now() where provider_id=p_provider returning pc_email_outbox.recipient into target_email;
 if target_email is not null then insert into pc_email_suppressions(email,reason) values(target_email,'hard_bounce') on conflict do nothing;update pc_newsletter set state='bounced' where email=target_email;end if;
 elsif p_type='email.delivered' then update pc_email_outbox set state='delivered',updated_at=now() where provider_id=p_provider and state='accepted';
 elsif p_type='email.failed' then update pc_email_outbox set state='failed',updated_at=now() where provider_id=p_provider and state='accepted';end if;end $$;
revoke all on function public.pc_email_delivery_event(text,text,text) from public,anon,authenticated;
grant execute on function public.pc_email_delivery_event(text,text,text) to service_role;

create unique index pc_email_provider_unique on public.pc_email_outbox(provider_id) where provider_id is not null;

create function public.pc_account_talent_withdraw(p_account uuid) returns void language plpgsql set search_path=public as $$ declare profile record;begin
 for profile in select t.id from pc_talent_profiles t join pc_client_accounts a on lower(t.email)=a.email where a.id=p_account and not a.disabled and t.bank_consent for update of t loop
 update pc_talent_profiles set bank_consent=false,client_material_consent=false,updated_at=now() where id=profile.id;
 insert into pc_talent_consent_events(talent_id,bank_consent,client_material_consent,consent_version) values(profile.id,false,false,'account-withdrawal-2026-10-14');
 update pc_talent_selections set revoked_at=now() where talent_id=profile.id and revoked_at is null;
 end loop;end $$;
revoke all on function public.pc_account_talent_withdraw(uuid) from public,anon,authenticated;
grant execute on function public.pc_account_talent_withdraw(uuid) to service_role;
notify pgrst,'reload schema';
