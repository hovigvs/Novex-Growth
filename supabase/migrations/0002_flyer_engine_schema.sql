-- Novex Retail Content Engine — flyer/layout schema
-- (Phase 2 of docs/NOVEX_RETAIL_CONTENT_ENGINE.md, Revision 3 — final for review)
--
-- NOT YET APPLIED to any live project. Written for inspection/review only.
-- Extends 0001_core_schema.sql (businesses, campaigns, assets already exist
-- there) rather than duplicating it.
--
-- Entity chain modeled here:
--   business -> products -> assets -> campaign -> campaign_products
--     -> generated_documents -> document_pages -> layout_instances
--
-- Two corrections from the prior draft, per review:
--   1. regular_price/sale_price live on campaign_products (a per-campaign
--      SNAPSHOT), not products -- so a past flyer stays reproducible even
--      after catalog prices change. products.current_regular_price is a
--      display convenience only, never authoritative for a generated
--      document.
--   2. priority_score (+ a structured breakdown for debugging) lives on
--      campaign_products, never on products -- priority is a property of
--      this campaign's placement of a product, not the product itself.

-- ---------------------------------------------------------------------
-- Products — catalog identity only (SKU/name/category/brand/master image).
-- Deliberately does NOT carry authoritative pricing, promotion, or any
-- merchandising decision -- those are campaign-specific (see below).
-- ---------------------------------------------------------------------
create table products (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references businesses(id) on delete cascade,
  sku                    text not null,
  name                   text not null,
  description            text,
  category               text,
  brand                  text,
  unit                   text,                 -- "/lb", "ea", "2 for", etc. -- catalog-level, rarely changes
  current_regular_price  numeric(12,2),        -- DISPLAY CONVENIENCE ONLY (e.g. pre-filling a new
                                                -- campaign's form). Never read when rendering a
                                                -- generated_document -- that always uses the
                                                -- campaign_products snapshot below.
  master_asset_id        uuid references assets(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (business_id, sku)
);
create index idx_products_business on products(business_id);
create index idx_products_category on products(business_id, category);
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Asset Preparation Pipeline metadata — extends the existing `assets`
-- table (from 0001_core_schema.sql). Classifies rather than blindly
-- stripping backgrounds: image_role + background_mode decide how the
-- pipeline treats a given photo.
-- ---------------------------------------------------------------------
alter table assets add column if not exists image_role text
  check (image_role in ('product_packshot','food_photography','produce','lifestyle','promotional_art'));
alter table assets add column if not exists background_mode text
  check (background_mode in ('preserve','remove','white','transparent','auto'));
alter table assets add column if not exists quality_score text
  check (quality_score in ('excellent','acceptable','poor','missing'));
alter table assets add column if not exists safe_crop jsonb not null default '{}';
alter table assets add column if not exists master_derivative_path text;
alter table assets add column if not exists flyer_derivative_path text;
alter table assets add column if not exists prepared_at timestamptz;

-- ---------------------------------------------------------------------
-- Campaign Products — the per-campaign SNAPSHOT: this campaign's prices,
-- promotion, computed priority score + breakdown, merchant intent, and
-- system-derived constraints. This is what a price change or a "make this
-- a hero" click actually edits -- never `products`.
-- ---------------------------------------------------------------------
create table campaign_products (
  id                          uuid primary key default gen_random_uuid(),
  business_id                 uuid not null references businesses(id) on delete cascade,
  campaign_id                 uuid not null references campaigns(id) on delete cascade,
  product_id                  uuid not null references products(id) on delete cascade,

  -- price snapshot for THIS campaign -- authoritative, reproducible even
  -- after the catalog's current_regular_price later changes
  regular_price               numeric(12,2) not null,
  sale_price                  numeric(12,2),
  promotion_type              text not null default 'none'
                                 check (promotion_type in ('none','hot_deal','new','seasonal','clearance')),

  -- merchant intent -- explicit, human-set. Distinguished from system-
  -- derived constraints below so "why did this happen" always has an
  -- answer: merchant instruction vs. Novex-calculated.
  merchant_priority            text not null default 'normal'
                                  check (merchant_priority in ('high','normal','low')),
  merchant_featured            boolean not null default false,
  merchant_force_hero          boolean not null default false,
  merchant_page_preference     int,
  merchant_keep_together_group text,     -- free-text tag; shared tag = placed together
  merchant_do_not_feature      boolean not null default false,

  -- system-derived constraints -- computed by Novex, not human-set
  requires_description         boolean not null default false,
  requires_serving_count       boolean not null default false,
  serving_count                text,
  min_component_size           text,   -- references a component key from the library
  max_component_size           text,
  asset_quality_restriction    text,   -- set when the linked asset's quality_score is 'poor'
  safe_crop_requirement        jsonb not null default '{}',

  -- computed/cached scoring, explainable
  priority_score               numeric,
  priority_score_breakdown     jsonb not null default '{}',
  -- e.g. {"featured":30,"hot_deal":20,"discount":12,"campaign_match":15,"category":6,"total":83}

  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  unique (campaign_id, product_id)
);
create index idx_campaign_products_business on campaign_products(business_id);
create index idx_campaign_products_campaign on campaign_products(campaign_id);
create index idx_campaign_products_score on campaign_products(campaign_id, priority_score desc);
create trigger trg_campaign_products_updated_at before update on campaign_products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Page Archetypes — a small reference table (not per-tenant data). Zones
-- carry real geometry (fractional x/y/width/height, not just cell-cost),
-- so a 6-cell horizontal strip and a 6-cell vertical column are no longer
-- treated as interchangeable.
-- ---------------------------------------------------------------------
create table page_archetypes (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,   -- e.g. 'produce_feature_page'
  name        text not null,
  description text,
  zones       jsonb not null default '[]',
    -- [{name, x, y, width, height, min_width, aspect_ratio, cost_budget, allowed_components:[...]}]
  created_at  timestamptz not null default now()
);

insert into page_archetypes (key, name, description, zones) values
  ('produce_feature_page', 'Produce Feature', 'Vertical produce sidebar + main grid (modeled on real ARZ page 1)',
    '[{"name":"sidebar","x":0,"y":0,"width":0.28,"height":0.90,"min_width":0.22,"cost_budget":8,"allowed_components":["produce_hero","standard_product"]},
      {"name":"main_grid","x":0.28,"y":0,"width":0.72,"height":0.90,"cost_budget":22,"allowed_components":["category_grid","standard_product","hot_deal"]}]'),
  ('grocery_dense_page', 'Grocery Dense', 'Uniform high-density grid (modeled on real ARZ pages 4-5)',
    '[{"name":"grid","x":0,"y":0,"width":1.0,"height":0.90,"cost_budget":33,"allowed_components":["category_grid","standard_product","hot_deal"]}]'),
  ('hero_plus_grid_page', 'Hero + Grid', '1-2 heroes plus a supporting grid',
    '[{"name":"hero_zone","x":0,"y":0,"width":1.0,"height":0.35,"cost_budget":14,"allowed_components":["hero_product","double_product"]},
      {"name":"grid_zone","x":0,"y":0.35,"width":1.0,"height":0.55,"cost_budget":18,"allowed_components":["category_grid","standard_product"]}]'),
  ('category_split_page', 'Category Split', 'Page divided into two category bands (modeled on real ARZ page 6)',
    '[{"name":"band_a","x":0,"y":0,"width":1.0,"height":0.45,"cost_budget":15,"allowed_components":["category_grid","standard_product"]},
      {"name":"band_b","x":0,"y":0.45,"width":1.0,"height":0.45,"cost_budget":15,"allowed_components":["category_grid","standard_product"]}]'),
  ('catering_side_rail_page', 'Catering Side Rail', 'Main content plus a vertical editorial rail (modeled on real ARZ pages 2, 7)',
    '[{"name":"main_zone","x":0,"y":0,"width":0.70,"height":0.90,"cost_budget":24,"allowed_components":["category_grid","standard_product","prepared_food_feature"]},
      {"name":"rail_zone","x":0.70,"y":0,"width":0.30,"height":0.90,"cost_budget":9,"allowed_components":["catering_feature","side_rail"]}]'),
  ('brand_feature_page', 'Brand Feature', 'One brand grouped prominently plus grid fill',
    '[{"name":"brand_zone","x":0,"y":0,"width":1.0,"height":0.30,"cost_budget":8,"allowed_components":["brand_feature"]},
      {"name":"grid_zone","x":0,"y":0.30,"width":1.0,"height":0.60,"cost_budget":22,"allowed_components":["category_grid","standard_product"]}]'),
  ('meat_visual_page', 'Meat Visual', 'Large photography-led layout, low item count (modeled on real ARZ page 8)',
    '[{"name":"visual_grid","x":0,"y":0,"width":1.0,"height":0.90,"cost_budget":10,"allowed_components":["meat_feature","hero_product"]}]'),
  ('promo_campaign_page', 'Promo Campaign', 'Full-width seasonal banner plus supporting items (modeled on real ARZ page 3)',
    '[{"name":"banner_zone","x":0,"y":0,"width":1.0,"height":0.25,"cost_budget":10,"allowed_components":["promo_message","full_width_campaign"]},
      {"name":"grid_zone","x":0,"y":0.25,"width":1.0,"height":0.65,"cost_budget":20,"allowed_components":["category_grid","standard_product"]}]');

-- ---------------------------------------------------------------------
-- Generated Documents — one output artifact for a campaign (the print
-- flyer, an Instagram post, etc). composition_plan stores the Flyer
-- Composition Planner's whole-document reasoning (Section 3 of the
-- architecture doc) for the same explainability reason score_breakdown
-- exists. The structured pages/layout_instances are the source of truth;
-- output_asset_id is a rendered file, always regeneratable from them.
-- ---------------------------------------------------------------------
create table generated_documents (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references businesses(id) on delete cascade,
  campaign_id       uuid not null references campaigns(id) on delete cascade,
  channel           text not null check (channel in
                      ('print_flyer','digital_flyer','instagram_post','instagram_story',
                       'facebook_post','google_business_post','whatsapp_broadcast','email')),
  status            text not null default 'draft'
                      check (status in ('draft','approved','rendering','published')),
  composition_plan  jsonb not null default '{}',   -- e.g. {"pages":[{"page":1,"archetype":"produce_feature_page","reason":"..."}]}
  output_asset_id   uuid references assets(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_generated_documents_business on generated_documents(business_id);
create index idx_generated_documents_campaign on generated_documents(campaign_id);
create trigger trg_generated_documents_updated_at before update on generated_documents
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Document Pages — each page of a generated document, tagged with the
-- archetype committed by the Flyer Composition Planner.
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
-- Layout Instances — each component placed in a zone. `variant` selects
-- from that component's small fixed set (e.g. 'left_image', 'vertical') --
-- still a deterministic template choice, never free-form generation.
-- Nullable campaign_product_id covers structural components (Footer
-- Promotion, Store Information) that carry no product.
-- ---------------------------------------------------------------------
create table layout_instances (
  id                   uuid primary key default gen_random_uuid(),
  page_id              uuid not null references document_pages(id) on delete cascade,
  campaign_product_id  uuid references campaign_products(id) on delete set null,
  component_key        text not null,   -- e.g. 'hero_product', 'category_grid', 'footer_promotion'
  variant              text,            -- e.g. 'left_image', 'vertical', 'price_heavy'
  zone                 text not null,   -- which archetype zone (by name) this instance fills
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
