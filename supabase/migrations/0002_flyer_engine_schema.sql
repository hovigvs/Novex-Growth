-- Novex Retail Content Engine — flyer/layout schema (Phase 2 of
-- docs/NOVEX_RETAIL_CONTENT_ENGINE.md, Revision 2).
--
-- NOT YET APPLIED to any live project. Written for inspection/review only,
-- per the explicit instruction to produce this migration without executing
-- it. Extends 0001_core_schema.sql (businesses, campaigns, assets already
-- exist there) rather than duplicating it.
--
-- Entity chain modeled here:
--   business -> products -> assets -> campaign -> campaign_products
--     -> generated_documents -> document_pages -> layout_instances
--
-- Key decision encoded in this schema: the layout specification (documents
-- / pages / layout_instances) is the source of truth. A rendered PDF/PNG is
-- an output, referenced by generated_documents.output_asset_id, always
-- regeneratable from the structured rows below. Editing a price touches one
-- campaign_products row, never a rendered file.

-- ---------------------------------------------------------------------
-- Products — catalog identity (SKU/name/category/master image). Does NOT
-- carry sale price, promotion, or any of this week's merchandising
-- decisions — those live on campaign_products because they change weekly
-- while the product itself doesn't.
-- ---------------------------------------------------------------------
create table products (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses(id) on delete cascade,
  sku             text not null,
  name            text not null,
  description     text,
  category        text,
  regular_price   numeric(12,2),
  unit            text,                        -- "/lb", "ea", "2 for", etc.
  brand           text,
  master_asset_id uuid references assets(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (business_id, sku)
);
create index idx_products_business on products(business_id);
create index idx_products_category on products(business_id, category);
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Asset Preparation Pipeline metadata — extends the existing `assets`
-- table (from 0001_core_schema.sql) rather than creating a parallel one.
-- ---------------------------------------------------------------------
alter table assets add column if not exists quality_score text
  check (quality_score in ('excellent','acceptable','poor','missing'));
alter table assets add column if not exists safe_crop jsonb not null default '{}';
alter table assets add column if not exists background_normalized boolean not null default false;
alter table assets add column if not exists master_derivative_path text;
alter table assets add column if not exists flyer_derivative_path text;
alter table assets add column if not exists prepared_at timestamptz;

-- ---------------------------------------------------------------------
-- Campaign Products — THIS week's price, promotion, and merchandising
-- constraints for a product within one campaign. This is what a price
-- change or a "make this a hero" click actually edits.
-- ---------------------------------------------------------------------
create table campaign_products (
  id                        uuid primary key default gen_random_uuid(),
  business_id               uuid not null references businesses(id) on delete cascade,
  campaign_id               uuid not null references campaigns(id) on delete cascade,
  product_id                uuid not null references products(id) on delete cascade,

  -- this week's commercial terms
  sale_price                numeric(12,2),
  promotion_type            text not null default 'none'
                              check (promotion_type in ('none','hot_deal','new','seasonal','clearance')),
  featured                  boolean not null default false,
  priority                  text not null default 'normal'
                              check (priority in ('high','normal','low')),

  -- merchant-facing controls (Section 7) — stored plainly, mapped to
  -- scoring/placement internally rather than exposing raw weights
  is_hero                   boolean not null default false,
  do_not_feature            boolean not null default false,

  -- layout constraints (Section 2)
  must_be_page_1            boolean not null default false,
  preferred_page            int,
  must_be_adjacent_to       uuid[] not null default '{}',   -- other campaign_products.id
  must_not_be_adjacent_to   uuid[] not null default '{}',
  same_brand_group          text,
  same_category_group       text,
  minimum_component_size    text,   -- references a component key from the library
  maximum_component_size    text,
  requires_price            boolean not null default true,
  requires_regular_price    boolean not null default false,
  requires_save_badge       boolean not null default false,
  requires_description      boolean not null default false,
  requires_serving_count    boolean not null default false,
  serving_count             text,

  -- computed/cached
  priority_score            numeric,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (campaign_id, product_id)
);
create index idx_campaign_products_business on campaign_products(business_id);
create index idx_campaign_products_campaign on campaign_products(campaign_id);
create index idx_campaign_products_score on campaign_products(campaign_id, priority_score desc);
create trigger trg_campaign_products_updated_at before update on campaign_products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Page Archetypes — a small reference table (not per-tenant data). Zone
-- definitions live as data so tuning a budget or adding a 9th archetype
-- is a content change, not a code change.
-- ---------------------------------------------------------------------
create table page_archetypes (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,   -- e.g. 'produce_feature_page'
  name        text not null,
  description text,
  zones       jsonb not null default '[]',  -- [{name, cost_budget, allowed_components: [...]}]
  created_at  timestamptz not null default now()
);

insert into page_archetypes (key, name, description, zones) values
  ('produce_feature_page', 'Produce Feature', 'Vertical produce sidebar + main grid (modeled on real ARZ page 1)',
    '[{"name":"sidebar","cost_budget":8,"allowed_components":["produce_hero","standard_product"]},
      {"name":"main_grid","cost_budget":22,"allowed_components":["category_grid","standard_product","hot_deal"]}]'),
  ('grocery_dense_page', 'Grocery Dense', 'Uniform high-density grid, few/no features (modeled on real ARZ pages 4-5)',
    '[{"name":"grid","cost_budget":33,"allowed_components":["category_grid","standard_product","hot_deal"]}]'),
  ('hero_plus_grid_page', 'Hero + Grid', '1-2 heroes plus a supporting grid',
    '[{"name":"hero_zone","cost_budget":14,"allowed_components":["hero_product","double_product"]},
      {"name":"grid_zone","cost_budget":18,"allowed_components":["category_grid","standard_product"]}]'),
  ('category_split_page', 'Category Split', 'Page divided into two category bands (modeled on real ARZ page 6)',
    '[{"name":"band_a","cost_budget":15,"allowed_components":["category_grid","standard_product"]},
      {"name":"band_b","cost_budget":15,"allowed_components":["category_grid","standard_product"]}]'),
  ('catering_side_rail_page', 'Catering Side Rail', 'Main content plus a vertical editorial rail (modeled on real ARZ pages 2, 7)',
    '[{"name":"main_zone","cost_budget":24,"allowed_components":["category_grid","standard_product","prepared_food_feature"]},
      {"name":"rail_zone","cost_budget":9,"allowed_components":["catering_feature","side_rail"]}]'),
  ('brand_feature_page', 'Brand Feature', 'One brand grouped prominently plus grid fill',
    '[{"name":"brand_zone","cost_budget":8,"allowed_components":["brand_feature"]},
      {"name":"grid_zone","cost_budget":22,"allowed_components":["category_grid","standard_product"]}]'),
  ('meat_visual_page', 'Meat Visual', 'Large photography-led layout, low item count (modeled on real ARZ page 8)',
    '[{"name":"visual_grid","cost_budget":10,"allowed_components":["meat_feature","hero_product"]}]'),
  ('promo_campaign_page', 'Promo Campaign', 'Full-width seasonal banner plus supporting items (modeled on real ARZ page 3)',
    '[{"name":"banner_zone","cost_budget":10,"allowed_components":["promo_message","full_width_campaign"]},
      {"name":"grid_zone","cost_budget":20,"allowed_components":["category_grid","standard_product"]}]');

-- ---------------------------------------------------------------------
-- Generated Documents — one output artifact for a campaign (the print
-- flyer, an Instagram post, etc). The structured pages/layout_instances
-- below are the source of truth; output_asset_id is a rendered file
-- (PDF/PNG), always regeneratable from the structure.
-- ---------------------------------------------------------------------
create table generated_documents (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references businesses(id) on delete cascade,
  campaign_id      uuid not null references campaigns(id) on delete cascade,
  channel          text not null check (channel in
                     ('print_flyer','digital_flyer','instagram_post','instagram_story',
                      'facebook_post','google_business_post','whatsapp_broadcast','email')),
  status           text not null default 'draft'
                     check (status in ('draft','approved','rendering','published')),
  output_asset_id  uuid references assets(id) on delete set null,  -- the rendered PDF/PNG, once produced
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_generated_documents_business on generated_documents(business_id);
create index idx_generated_documents_campaign on generated_documents(campaign_id);
create trigger trg_generated_documents_updated_at before update on generated_documents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Document Pages — each page of a generated document, tagged with the
-- archetype the planner chose for it.
-- ---------------------------------------------------------------------
create table document_pages (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null references generated_documents(id) on delete cascade,
  page_number    int not null,
  archetype_id   uuid references page_archetypes(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (document_id, page_number)
);
create index idx_document_pages_document on document_pages(document_id);
create trigger trg_document_pages_updated_at before update on document_pages
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Layout Instances — each component placed on a page. References a
-- campaign_product where applicable (nullable for structural components
-- like Footer Promotion / Store Information that carry no product).
-- ---------------------------------------------------------------------
create table layout_instances (
  id                   uuid primary key default gen_random_uuid(),
  page_id              uuid not null references document_pages(id) on delete cascade,
  campaign_product_id  uuid references campaign_products(id) on delete set null,
  component_key        text not null,   -- e.g. 'hero_product', 'category_grid', 'footer_promotion'
  zone                 text not null,   -- which archetype zone this instance fills
  size_variant         text,
  position_order       int not null default 0,
  rendered_props       jsonb not null default '{}',  -- cached final props snapshot used at render time
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index idx_layout_instances_page on layout_instances(page_id);
create index idx_layout_instances_campaign_product on layout_instances(campaign_product_id);
create trigger trg_layout_instances_updated_at before update on layout_instances
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security — same tenant-isolation pattern as 0001_core_schema.sql
-- ---------------------------------------------------------------------
alter table products            enable row level security;
alter table campaign_products   enable row level security;
alter table generated_documents enable row level security;
-- document_pages/layout_instances are scoped transitively through their
-- parent generated_document/page, not by a direct business_id column.

create policy products_tenant on products
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));

create policy campaign_products_tenant on campaign_products
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));

create policy generated_documents_tenant on generated_documents
  for all using (business_id in (select business_id from profiles where id = auth.uid()))
  with check (business_id in (select business_id from profiles where id = auth.uid()));

create policy document_pages_tenant on document_pages
  for all using (
    document_id in (
      select id from generated_documents
      where business_id in (select business_id from profiles where id = auth.uid())
    )
  );

create policy layout_instances_tenant on layout_instances
  for all using (
    page_id in (
      select dp.id from document_pages dp
      join generated_documents gd on gd.id = dp.document_id
      where gd.business_id in (select business_id from profiles where id = auth.uid())
    )
  );

-- page_archetypes is shared reference data (not tenant-owned) — readable by
-- any authenticated user, not writable by tenants.
alter table page_archetypes enable row level security;
create policy page_archetypes_read_all on page_archetypes
  for select using (auth.role() = 'authenticated');
