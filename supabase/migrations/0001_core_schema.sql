-- Novex Growth — Core schema (Phase 2 of docs/NOVEX_SYSTEM_ARCHITECTURE.md)
--
-- Minimum viable multi-tenant data model for: businesses, users, customers,
-- leads, conversations, assets, campaigns, automations, ai_agents.
--
-- NOT YET APPLIED to any live project. This file is a design artifact —
-- run it against a real Supabase project only when we decide to provision
-- one (see the architecture doc's "Implementation Plan" section for the
-- go/no-go discussion). Safe to sit in the repo unapplied indefinitely.
--
-- Tenant isolation model: every table carries business_id. A `profiles`
-- table (1:1 with Supabase's built-in auth.users) maps a logged-in user to
-- their business. Every other table's RLS policy checks that the row's
-- business_id matches the caller's business_id via that mapping — so a
-- customer belonging to Business A is never visible to Business B, enforced
-- at the database layer regardless of what the UI does.

-- ---------------------------------------------------------------------
-- Helper: shared updated_at trigger
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- Businesses (the tenant boundary)
-- ---------------------------------------------------------------------
create table businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  vertical    text not null check (vertical in ('catering','venue','restaurant','trades','other')),
  plan        text not null default 'demo',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_businesses_updated_at before update on businesses
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Users (Core "Users" entity — extends Supabase auth.users 1:1)
-- ---------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner','staff','admin')),
  email       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_profiles_business on profiles(business_id);
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
create table customers (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  tags            text[] not null default '{}',
  lifetime_value  numeric(12,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_customers_business on customers(business_id);
create index idx_customers_email on customers(business_id, email);
create trigger trg_customers_updated_at before update on customers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------
create table leads (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  customer_id  uuid references customers(id) on delete set null,
  source       text,
  status       text not null default 'warm' check (status in ('hot','warm','cold','past')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_leads_business on leads(business_id);
create index idx_leads_status on leads(business_id, status);
create trigger trg_leads_updated_at before update on leads
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------
create table conversations (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete cascade,
  lead_id      uuid references leads(id) on delete set null,
  customer_id  uuid references customers(id) on delete set null,
  channel      text not null check (channel in ('voice','chat','whatsapp','sms','email')),
  transcript   jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_conversations_business on conversations(business_id);
create index idx_conversations_created on conversations(business_id, created_at desc);
create trigger trg_conversations_updated_at before update on conversations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Assets (photos, menu items, videos — shared by Marketing + Industry Modules)
-- ---------------------------------------------------------------------
create table assets (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  type          text not null check (type in ('photo','video','menu_item','document','other')),
  storage_path  text not null,
  tags          text[] not null default '{}',
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_assets_business on assets(business_id);
create trigger trg_assets_updated_at before update on assets
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------
create table campaigns (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  type            text not null,
  target_segment  jsonb not null default '{}',
  status          text not null default 'draft' check (status in ('draft','scheduled','active','completed','archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_campaigns_business on campaigns(business_id);
create trigger trg_campaigns_updated_at before update on campaigns
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Automations
-- ---------------------------------------------------------------------
create table automations (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  trigger_type  text not null,
  action        jsonb not null default '{}',
  module_owner  text not null,
  enabled       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_automations_business on automations(business_id);
create trigger trg_automations_updated_at before update on automations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- AI Agents
-- ---------------------------------------------------------------------
create table ai_agents (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses(id) on delete cascade,
  persona       text not null,
  voice_config  jsonb not null default '{}',
  channels      text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_ai_agents_business on ai_agents(business_id);
create trigger trg_ai_agents_updated_at before update on ai_agents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security — tenant isolation
-- ---------------------------------------------------------------------
alter table businesses    enable row level security;
alter table profiles      enable row level security;
alter table customers     enable row level security;
alter table leads         enable row level security;
alter table conversations enable row level security;
alter table assets        enable row level security;
alter table campaigns     enable row level security;
alter table automations   enable row level security;
alter table ai_agents     enable row level security;

-- A logged-in user may see their own profile row (to discover their business_id).
create policy profiles_self on profiles
  for select using (id = auth.uid());
create policy profiles_self_update on profiles
  for update using (id = auth.uid());

-- A logged-in user may see their own business row.
create policy businesses_own on businesses
  for select using (
    id in (select business_id from profiles where id = auth.uid())
  );

-- Generic tenant-scoped policy, applied per table below: full CRUD, but only
-- on rows whose business_id matches the caller's own business_id.
create policy customers_tenant on customers
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));

create policy leads_tenant on leads
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));

create policy conversations_tenant on conversations
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));

create policy assets_tenant on assets
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));

create policy campaigns_tenant on campaigns
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));

create policy automations_tenant on automations
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));

create policy ai_agents_tenant on ai_agents
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));
