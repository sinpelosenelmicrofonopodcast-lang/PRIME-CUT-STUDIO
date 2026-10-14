-- PrimeCuts OS foundation. Apply to a dedicated Supabase project.
create extension if not exists pgcrypto;

create type public.staff_role as enum ('owner','admin','producer','editor','finance','viewer');
create type public.lead_status as enum ('new','qualified','quoted','won','lost','archived');
create type public.project_status as enum ('inquiry','quote','contract','deposit','pre_production','scheduled','shooting','editing','client_review','final','delivered','archived');
create type public.invoice_status as enum ('draft','sent','partial','paid','void','overdue');
create type public.asset_status as enum ('internal','available','reserved','rented','maintenance','retired');

create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text,
 role public.staff_role not null default 'viewer',
 created_at timestamptz not null default now()
);
create table public.clients(
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid references auth.users(id) on delete set null,
 full_name text not null,
 email text,
 phone text,
 company text,
 notes text,
 created_at timestamptz not null default now()
);
create table public.leads(
 id uuid primary key default gen_random_uuid(),
 client_id uuid references public.clients(id) on delete set null,
 status public.lead_status not null default 'new',
 service text,
 event_date date,
 location text,
 details text,
 source text,
 created_at timestamptz not null default now()
);
create table public.catalog_items(
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('service','package','add_on','digital_product','rental')),
 name text not null,
 description text,
 active boolean not null default true,
 base_price_cents integer,
 pricing_label text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.projects(
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete restrict,
 lead_id uuid references public.leads(id) on delete set null,
 title text not null,
 status public.project_status not null default 'inquiry',
 event_date timestamptz,
 location text,
 total_cents integer not null default 0,
 paid_cents integer not null default 0,
 drive_folder_id text,
 drive_delivery_folder_id text,
 calendar_event_id text,
 delivery_due_at timestamptz,
 marketing_allowed boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.project_staff(
 project_id uuid references public.projects(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 assignment text,
 primary key(project_id,user_id)
);
create table public.quotes(
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 status text not null default 'draft', subtotal_cents integer not null default 0, discount_cents integer not null default 0,
 travel_cents integer not null default 0, tax_cents integer not null default 0, total_cents integer not null default 0,
 approved_at timestamptz, expires_at timestamptz, public_token uuid not null default gen_random_uuid(), created_at timestamptz not null default now()
);
create table public.quote_items(
 id uuid primary key default gen_random_uuid(), quote_id uuid not null references public.quotes(id) on delete cascade,
 catalog_item_id uuid references public.catalog_items(id) on delete set null, description text not null,
 quantity numeric(10,2) not null default 1, unit_price_cents integer not null default 0, sort_order integer not null default 0
);
create table public.contracts(
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 template_key text, status text not null default 'draft', document_drive_id text, signer_name text, signer_email text,
 signed_at timestamptz, signature_hash text, created_at timestamptz not null default now()
);
create table public.invoices(
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 number text unique, status public.invoice_status not null default 'draft', amount_cents integer not null,
 due_at timestamptz, provider text, provider_invoice_id text, created_at timestamptz not null default now()
);
create table public.payments(
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
 amount_cents integer not null, provider text, provider_payment_id text, status text not null default 'pending', paid_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.deliverables(
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 name text not null, kind text, status text not null default 'planned', drive_file_id text, drive_url text,
 client_visible boolean not null default false, delivered_at timestamptz, created_at timestamptz not null default now()
);
create table public.equipment(
 id uuid primary key default gen_random_uuid(), name text not null, category text, serial_number text,
 status public.asset_status not null default 'internal', rental_enabled boolean not null default false,
 day_rate_cents integer, weekend_rate_cents integer, replacement_value_cents integer, notes text, created_at timestamptz not null default now()
);
create table public.rental_orders(
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete restrict,
 status text not null default 'inquiry', starts_at timestamptz not null, ends_at timestamptz not null,
 subtotal_cents integer not null default 0, deposit_cents integer not null default 0, total_cents integer not null default 0,
 agreement_drive_id text, checkout_condition jsonb not null default '{}'::jsonb, return_condition jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.rental_items(
 rental_order_id uuid references public.rental_orders(id) on delete cascade,
 equipment_id uuid references public.equipment(id) on delete restrict,
 rate_cents integer not null default 0,
 primary key(rental_order_id,equipment_id)
);
create table public.marketing_assets(
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 drive_file_id text, asset_type text, title text, approved_for_marketing boolean not null default false, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create table public.marketing_posts(
 id uuid primary key default gen_random_uuid(), project_id uuid references public.projects(id) on delete set null,
 platform text not null, status text not null default 'draft', caption text, scheduled_at timestamptz, published_url text,
 created_at timestamptz not null default now()
);
create table public.activity_log(
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
 entity_type text not null, entity_id uuid, action text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_staff() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('owner','admin','producer','editor','finance'));
$$;
revoke execute on function private.is_staff() from public;
grant execute on function private.is_staff() to authenticated;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.catalog_items enable row level security;
alter table public.projects enable row level security;
alter table public.project_staff enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.contracts enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.deliverables enable row level security;
alter table public.equipment enable row level security;
alter table public.rental_orders enable row level security;
alter table public.rental_items enable row level security;
alter table public.marketing_assets enable row level security;
alter table public.marketing_posts enable row level security;
alter table public.activity_log enable row level security;

create policy "profile self read" on public.profiles for select to authenticated using(id=(select auth.uid()) or (select private.is_staff()));
create policy "staff clients" on public.clients for all to authenticated using((select private.is_staff()) or auth_user_id=(select auth.uid())) with check((select private.is_staff()) or auth_user_id=(select auth.uid()));
create policy "staff leads" on public.leads for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "catalog public read" on public.catalog_items for select to anon,authenticated using(active=true or (select private.is_staff()));
create policy "catalog staff write" on public.catalog_items for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "projects visible" on public.projects for select to authenticated using((select private.is_staff()) or exists(select 1 from public.clients c where c.id=client_id and c.auth_user_id=(select auth.uid())));
create policy "projects staff write" on public.projects for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "project staff manage" on public.project_staff for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "quotes visible" on public.quotes for select to authenticated using((select private.is_staff()) or exists(select 1 from public.projects p join public.clients c on c.id=p.client_id where p.id=project_id and c.auth_user_id=(select auth.uid())));
create policy "quotes staff write" on public.quotes for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "quote items visible" on public.quote_items for select to authenticated using(exists(select 1 from public.quotes q where q.id=quote_id and ((select private.is_staff()) or exists(select 1 from public.projects p join public.clients c on c.id=p.client_id where p.id=q.project_id and c.auth_user_id=(select auth.uid())))));
create policy "quote items staff write" on public.quote_items for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "contracts visible" on public.contracts for select to authenticated using((select private.is_staff()) or exists(select 1 from public.projects p join public.clients c on c.id=p.client_id where p.id=project_id and c.auth_user_id=(select auth.uid())));
create policy "contracts staff write" on public.contracts for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "invoices visible" on public.invoices for select to authenticated using((select private.is_staff()) or exists(select 1 from public.projects p join public.clients c on c.id=p.client_id where p.id=project_id and c.auth_user_id=(select auth.uid())));
create policy "invoices staff write" on public.invoices for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "payments visible" on public.payments for select to authenticated using((select private.is_staff()) or exists(select 1 from public.invoices i join public.projects p on p.id=i.project_id join public.clients c on c.id=p.client_id where i.id=invoice_id and c.auth_user_id=(select auth.uid())));
create policy "payments staff write" on public.payments for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "deliverables visible" on public.deliverables for select to authenticated using(client_visible and exists(select 1 from public.projects p join public.clients c on c.id=p.client_id where p.id=project_id and c.auth_user_id=(select auth.uid())) or (select private.is_staff()));
create policy "deliverables staff write" on public.deliverables for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "equipment public read" on public.equipment for select to anon,authenticated using(rental_enabled=true or (select private.is_staff()));
create policy "equipment staff write" on public.equipment for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "rental visible" on public.rental_orders for select to authenticated using((select private.is_staff()) or exists(select 1 from public.clients c where c.id=client_id and c.auth_user_id=(select auth.uid())));
create policy "rental staff write" on public.rental_orders for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "rental items visible" on public.rental_items for select to authenticated using((select private.is_staff()) or exists(select 1 from public.rental_orders r join public.clients c on c.id=r.client_id where r.id=rental_order_id and c.auth_user_id=(select auth.uid())));
create policy "rental items staff write" on public.rental_items for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "marketing staff" on public.marketing_assets for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "posts staff" on public.marketing_posts for all to authenticated using((select private.is_staff())) with check((select private.is_staff()));
create policy "activity staff" on public.activity_log for select to authenticated using((select private.is_staff()));
create policy "activity insert staff" on public.activity_log for insert to authenticated with check((select private.is_staff()));

create index projects_client_idx on public.projects(client_id);
create index projects_status_idx on public.projects(status);
create index deliverables_project_idx on public.deliverables(project_id);
create index invoices_project_idx on public.invoices(project_id);
create index rentals_dates_idx on public.rental_orders(starts_at,ends_at);
create index marketing_project_idx on public.marketing_assets(project_id);
