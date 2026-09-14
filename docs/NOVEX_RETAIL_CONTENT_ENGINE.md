# Novex Retail Content Engine — Architecture Proposal

**Status: PROPOSAL ONLY. Not implemented. Nothing in this doc has been built.**
No existing file has been touched — `flyer_print_prototype.html` and
`flyer_generator_demo.html` are untouched and stay as reference prototypes.
This is Phase 0: architecture for review, per direction. Nothing past this
document gets built until it's approved.

This extends [`NOVEX_SYSTEM_ARCHITECTURE.md`](NOVEX_SYSTEM_ARCHITECTURE.md) —
read that first for the Core entity model (Business/User/Customer/Lead/
Conversation/Asset/Campaign/Automation/AI Agent) this proposal builds on.

## 0. Why we're changing course, not just restyling

The last few iterations on `flyer_print_prototype.html` (uniform grid →
bigger photos → grocery-circular reskin → variable image sizes) kept
producing the same failure mode: a hand-tuned CSS grid that looks fine until
content changes, at which point it either overflows the page or forces
arbitrary trims. That's a symptom of the actual problem — there's no
separation between *deciding what goes where* and *drawing it*. Restyling
the grid again would produce another version of the same fragile thing.

The fix is architectural: a fixed library of layout components, a
deterministic planner that decides which component represents each product
and which page it lands on, and a renderer that only ever draws what the
planner approved. AI assists the decision-making; it never touches pixels.

One concrete thing this session already proved empirically, worth carrying
into the design: **page space is a countable budget, not a feeling.** A
standard 8.5×11 page held **33 standard-sized items** cleanly; making 2 items
"hero"-sized cost roughly **5 standard items' worth of space each** (2 heroes
= ~10 items' worth of room, confirmed by measurement, not estimate). The
layout planner below turns that observation into the actual mechanism —
every component has a known cell-cost, and page assignment is bin-packing
against a fixed per-page budget, not visual guesswork.

## 1. Component library (rendering layer)

Each component is a fixed HTML/CSS template taking a strict props object
(product data + brand kit + size variant). No component ever generates its
own markup dynamically from a prompt — the props change, the template
doesn't. Approximate cell-cost is denominated in "standard grid cells" (1
cell ≈ one compact item in the current prototype's 5-column grid), so the
planner can budget pages numerically instead of by eye:

| Component | Purpose | Approx. cost (cells) | Key props |
|---|---|---|---|
| **Hero Product** | One standout item, huge photo + price | ~8-10 | product, badge |
| **Standard Product** | The workhorse — photo, name, price | 1 | product |
| **Double Product** | Wider promo, ~2x width | 2-3 | product, promo copy |
| **Produce Hero** | Oversized produce photography | ~6-8 | product, seasonal tag |
| **Hot Deal** | High-contrast treatment, small footprint | 1.5-2 | product, badge |
| **Brand Feature** | Several SKUs from one brand, grouped | 4-6 | brand, products[] |
| **Catering Feature** | Large photo + description block | 6-10 | product, description |
| **Prepared Food Feature** | Platter photo + serving info | 6-8 | product, serves_count |
| **Category Grid** | Uniform bulk grid (today's prototype) | 1/item | products[] |
| **Promo Message** | Seasonal banner, no product | 3-5 | headline, theme |
| **Meat Feature** | Photography-led meat cut layout | 4-6 | product |
| **Full-width Campaign** | Major promo spanning the page | 15-20 | product/campaign |
| **Side Rail** | Vertical column (ARZ pages 2 & 7 pattern) | ~30% page width | products[] or ad copy |
| **Category Header** | Section divider bar | ~0 (structural) | category name, color |
| **Footer Promotion** | Bottom CTA strip | fixed (structural) | brand kit |
| **Store Information** | Hours/address/social | fixed (structural) | brand kit |

That's 16 — comfortably in the 15-25 range. Costs above are starting
estimates seeded from this session's measurements; they get refined once
real pages are rendered and measured (same `getBoundingClientRect()`
overflow-check method already used manually this session, but run
automatically per generated page instead of by hand).

## 2. Data model — Product entity

New entity, sitting alongside Core (extends
`supabase/migrations/0001_core_schema.sql`, not replacing it):

```
products
  id                uuid
  business_id       uuid  -> businesses
  sku               text
  name              text
  description       text
  category          text
  regular_price     numeric
  sale_price        numeric
  discount_pct      numeric   -- generated from regular/sale
  unit              text      -- "/lb", "ea", "2 for", etc.
  promotion_type    text      -- none | hot_deal | new | seasonal | clearance
  featured          boolean
  page_preference   int       -- optional merchant hint from the spreadsheet
  image_asset_id    uuid  -> assets
  priority_score    numeric   -- computed, cached (see below)
  created_at/updated_at
```

Plus one more Core-adjacent table for outputs:

```
generated_documents
  id            uuid
  business_id   uuid  -> businesses
  campaign_id   uuid  -> campaigns
  channel       text   -- print_flyer | digital_flyer | instagram_post | email | ...
  layout_plan   jsonb  -- the approved plan that produced this output
  asset_id      uuid  -> assets   -- the rendered file, once produced
  status        text   -- draft | approved | published
  created_at/updated_at
```

Each weekly upload creates one `campaigns` row (`type = 'weekly_specials'`).
Uploaded photos become `assets`. This is what makes the flyer "the first
output of a larger content system" rather than an isolated tool — Product,
Asset, and Campaign are the same rows a future Instagram-carousel or
email-campaign renderer would consume.

This proposal does **not** include a new `.sql` migration file yet — schema
gets written once the model below is approved, same two-step pattern already
used for Core (design in the doc first, `.sql` file as a separate, still-
unapplied artifact after sign-off).

## 3. Priority / visual-importance score

Deterministic, transparent, and logged per product (so "why is this the
hero?" always has an answer):

```
priority_score =
    w1 * promotion_weight(promotion_type)      -- hot_deal > seasonal > new > none
  + w2 * discount_pct
  + w3 * margin_pct                             -- optional, if merchant provides cost data
  + w4 * (featured ? 1 : 0)
  + w5 * category_importance(category)          -- produce/meat default higher (traffic drivers)
  + w6 * campaign_relevance                      -- e.g. matches active seasonal theme
```

Default weights ship sensible and are tunable per business later, not
hard-coded forever. Score buckets map to component tiers:

- Top percentile (≈1-2 per page) → Hero / Full-width Campaign / Catering Feature
- Next tier → Double Product / Brand Feature / Prepared Food Feature
- Everything else → Standard Product / Category Grid

This is the "merchandising, not box-filling" mechanism: a `Falafel Plate |
Hot Deal | Featured` scores high and earns a big block; `Fresh Mint |
Regular` scores low and stays small — automatically, not by manual per-item
styling like the last few iterations.

## 4. Layout-planning layer (deterministic — separate from rendering)

Input: full scored product list, merchant's `page_preference`/category
hints, brand kit, target page count (8, configurable), fixed per-page cell
budget.

Algorithm (greedy bin-packing, not AI):

1. Group products by explicit `page_preference` first, then by `category`.
2. Sort each group by `priority_score` descending.
3. Walk each page's group, assigning component tiers by score bucket,
   accumulating cell-cost against that page's budget.
4. Cap hero-tier components per page (e.g. max 1-2) so one page can't
   accidentally blow its budget the way this session's 2-hero experiment did
   (measured cost: +242px over one page for 2 heroes, confirmed by testing).
5. Overflow handling: if a category doesn't fit at its current component
   tier, downgrade its lowest-scored members to a smaller tier before ever
   spilling to a 9th page or silently dropping an item — visibility over
   surprise.
6. Output is a **Layout Plan**: plain JSON, e.g.
   `{ pages: [ { page: 1, blocks: [ {component:"produce_hero", product_id:"..."}, {component:"category_grid", product_ids:[...]} ] } ] }`.

This plan is what the "click a product → make larger / smaller / move /
feature / remove" editing surface actually edits — those actions mutate this
JSON; the renderer redraws deterministically from whatever the JSON says.
It's also what makes "✨ Improve This Page" tractable: that feature is Claude
reading this JSON + the score distribution for one page and proposing a
*structured diff* to it ("promote product X to hero", "move 3 products to
page 5") — never touching HTML directly, always a plan edit the merchant
approves before re-render.

## 5. Rendering layer (deterministic, no free-form LLM output)

A renderer walks the approved Layout Plan and calls the matching component
template per block. Same principle the current prototype already uses for
its `@page{size:letter}` print-accurate sizing — this generalizes it into
reusable functions instead of one hand-tuned page.

**PDF export — proposing MVP now, bigger option flagged for later:**
- **MVP (recommended to start):** keep the already-proven client-side
  approach — the page is sized in real inches via CSS, the merchant uses the
  browser's own "Print to PDF." Zero new infrastructure, zero new cost,
  already validated this session.
- **Later, if/when a client needs unattended/scheduled generation:**
  server-side headless rendering (Puppeteer/Playwright). This needs new
  infrastructure — Netlify Functions aren't well-suited to running a full
  Chromium instance — so it's a real infra decision, not a default.

## 6. Where AI is allowed — and explicitly where it is not

**Allowed** (always structured, reviewable output; never final pixels):
- Spreadsheet cleanup — inferring a missing category/unit, normalizing
  messy product names.
- Photo-to-SKU fuzzy matching when filenames don't line up exactly (same
  low-confidence-flagged-for-review pattern already agreed earlier this
  session, not silent guessing).
- Suggesting `priority_score` inputs (promotion_type, featured) when a
  merchant leaves a field blank.
- "✨ Improve This Page" — proposes a structured diff to the Layout Plan
  JSON, approved by the merchant before re-render.
- QA pass — flagging pages with too-uniform visual weight, empty slots,
  price/SKU mismatches.

**Never allowed:**
- Freely generating page HTML/CSS per flyer or per page.
- Choosing fonts/colors/positions outside the component library.
- Any path that bypasses the deterministic renderer.

This is the direct fix for "AI randomly designing every page" — the
component library and planner are the guardrails; AI operates *inside* them,
never around them.

## 7. Novex Core integration

- Uploaded photos → `assets` (tagged by SKU).
- Spreadsheet rows → `products` (new table, business-owned).
- Each weekly upload → one `campaigns` row.
- Each generated output (flyer PDF, IG post, email, etc.) → a
  `generated_documents` row linked to that campaign.
- Future auto-publishing (posting to IG/FB/GBP on a schedule) → `automations`
  rows, per the existing Core design.

Because Product/Asset/Campaign data is channel-agnostic, a future Instagram-
carousel renderer, email renderer, or Google Business Profile post is just
another renderer consuming the same scored product data — not a redesign.
That's the "one upload → flyer + social + email + signage" vision, but it's
a consequence of this data model, not something being built now.

## 8. Explicitly NOT being built in this phase

Digital flyer variant, Instagram/Facebook/GBP/WhatsApp/email renderers,
digital signage output, scheduled auto-publishing, server-side PDF
automation. The data model doesn't preclude any of these later — none of
them are in scope for the first build.

## 9. Migration / rollout plan

- **Phase A (this document):** proposal, no code. ✅ current step.
- **Phase B (on approval):** build component library + planner + renderer
  as new files, entirely separate from `flyer_print_prototype.html` /
  `flyer_generator_demo.html` — both stay untouched, unlinked from the
  portal, kept as reference.
- **Phase C:** internal validation against the real ARZ reference — we
  already have all 8 real pages rendered as images and the real per-page
  item counts from this session (~122 items across 8 pages, ranging 6-23
  per page). Feed a comparable synthetic product list through the planner
  and compare page-by-page character against the real thing before showing
  it to you.
- **Phase D:** only once Phase C passes, repoint the portal's "flyer" module
  at the new engine. Still additive — nothing destructive.

**Rollback:** every phase up to D touches only new files. Nothing existing
is at risk; if the new engine doesn't work out, delete the new files and
nothing about the live site changes.

## 10. Decisions needed before any implementation starts

1. **PDF approach:** client-side print-to-PDF for MVP (free, proven) vs.
   investing in server-side automated generation now (new infra/cost)? —
   *Recommend client-side for MVP.*
2. **AI-assisted spreadsheet cleanup / photo fuzzy-matching:** in the first
   build, or fast-follow once the deterministic core works end-to-end? —
   *Recommend fast-follow — ship the deterministic path first since a clean
   spreadsheet already gives the planner everything it needs.*
3. **Schema timing:** OK to write the actual `products` +
   `generated_documents` migration SQL (unapplied, same as
   `0001_core_schema.sql`) once this proposal is approved, before component
   code? — *Recommend yes, keeps data model and code in lockstep.*
4. **Score weights:** comfortable with sensible defaults I propose (discount%
   and hot-deal status weighted heaviest, category importance secondary),
   tunable later — or do you want to set the initial weights yourself?

Nothing below this line gets built until you've reviewed this and told me
which way to go on the four decisions above.
