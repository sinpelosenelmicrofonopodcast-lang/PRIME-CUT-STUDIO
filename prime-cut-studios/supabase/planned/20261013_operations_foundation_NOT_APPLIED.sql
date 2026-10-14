-- PrimeCuts OS operations foundation. REVIEWED PLAN ONLY. DO NOT RUN ON PRODUCTION YET.
-- Prerequisite: existing pc_projects and pc_client_accounts from v0.4.
create table if not exists public.pc_staff_members (
 id uuid primary key default gen_random_uuid(),
 account_id uuid not null unique references public.pc_client_accounts(id) on delete cascade,
 role text not null check (role in ('owner','administrator','secretary','producer','casting_manager','editor','photographer','crew','finance')),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.pc_staff_projects (
 account_id uuid not null references public.pc_client_accounts(id) on delete cascade,
 project_id uuid not null references public.pc_projects(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(account_id, project_id)
);
create table if not exists public.pc_operational_tasks (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.pc_projects(id) on delete cascade,
 title text not null check (char_length(title) between 2 and 180),
 description text not null default '', status text not null default 'todo' check (status in ('todo','doing','blocked','done')),
 assigned_account_id uuid references public.pc_client_accounts(id), due_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.pc_casting_calls (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.pc_projects(id) on delete cascade,
 title text not null, description text not null default '', requirements text not null default '',
 location text, pay_details text, closes_at timestamptz,
 status text not null default 'draft' check (status in ('draft','open','closed','archived')),
 published_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.pc_talent_profiles (
 id uuid primary key default gen_random_uuid(), account_id uuid not null unique references public.pc_client_accounts(id) on delete cascade,
 stage_name text not null, city text, experience text, portfolio_url text,
 consent_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.pc_casting_applications (
 id uuid primary key default gen_random_uuid(), casting_call_id uuid not null references public.pc_casting_calls(id) on delete cascade,
 talent_id uuid not null references public.pc_talent_profiles(id) on delete cascade,
 status text not null default 'submitted' check(status in('submitted','under_review','shortlisted','offered','selected','declined','withdrawn')),
 private_notes text not null default '', created_at timestamptz not null default now(),
 unique(casting_call_id,talent_id)
);
create table if not exists public.pc_operational_assets (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.pc_projects(id) on delete cascade,
 category text not null check(category in('photo','video','reference','location','casting','document','delivery')),
 provider text not null check(provider in('drive','lightroom','blackmagic','external')),
 title text not null, resource_url text not null, version text not null default 'v1',
 visible_to_client boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.pc_operational_audit (
 id bigint generated always as identity primary key, actor_id uuid, actor_kind text not null,
 project_id uuid references public.pc_projects(id) on delete set null,
 action text not null, subject_type text not null, subject_id text,
 details jsonb not null default '{}'::jsonb, recorded_at timestamptz not null default now()
);
-- Private-by-default. Server must implement authorization and project membership checks
-- before any DML is exposed to staff or talent. Never grant direct PUBLIC access.
do $$
declare t text;
begin
 foreach t in array array['pc_staff_members','pc_staff_projects','pc_operational_tasks','pc_casting_calls','pc_talent_profiles','pc_casting_applications','pc_operational_assets','pc_operational_audit'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from public, anon, authenticated',t);
  execute format('grant select,insert,update,delete on table public.%I to service_role',t);
 end loop;
end $$;
revoke all on sequence public.pc_operational_audit_id_seq from public,anon,authenticated;
grant usage, select on sequence public.pc_operational_audit_id_seq to service_role;
