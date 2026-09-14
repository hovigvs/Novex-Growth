# Novex Retail Content Engine — Architecture Proposal (Revision 2)

**Status: PROPOSAL ONLY. Not implemented. Nothing in this doc has been built.**
No existing file has been touched — `flyer_print_prototype.html` and
`flyer_generator_demo.html` are untouched and stay as reference prototypes.
This is Phase 0: architecture for review. Nothing past this document gets
built until it's approved.

This extends [`NOVEX_SYSTEM_ARCHITECTURE.md`](NOVEX_SYSTEM_ARCHITECTURE.md) —
read that first for the Core entity model this proposal builds on.

**Revision 2 changes:** added Page Archetypes as a layer above bin-packing,
added a formal Layout Constraint system, added an Asset Preparation
Pipeline, restructured the data model so the layout specification (not the
PDF) is the source of truth, settled on server-side rendering for
production output, split AI scope into V1 (ingestion) vs V1.1 (design
assistant), and moved score-weight ownership to Novex with intuitive
merchant-facing controls instead of exposed math. The actual migration SQL
is now written (`supabase/migrations/0002_flyer_engine_schema.sql`) but not
executed anywhere.

## 0. Why we're changing course, not just restyling

The last few iterations on `flyer_print_prototype.html` kept producing the
same failure mode: a hand-tuned CSS grid that looks fine until content
changes, then either overflows or forces arbitrary trims. Revision 1 of this
proposal fixed *that* problem (deterministic component library + scored
bin-packing) but had a real gap, caught in review: **efficient bin-packing
alone produces an organized catalog, not a professionally art-directed
flyer.** The real ARZ flyer deliberately varies its page composition —
Page 1 mixes a produce sidebar with a grocery grid, Page 2 is bakery plus a
catering side-rail ad, Page 8 is almost entirely big meat photography. That
variety is deliberate art direction, not an emergent property of packing
efficiency. Section 1 below (Page Archetypes) is the fix.

One thing still worth carrying forward from this session's actual
measurements: page space is a countable budget. A standard page held **33
standard-sized items**; making 2 items hero-sized cost **~5 standard items'
worth of space each**, confirmed by measurement. Archetypes don't replace
that budget — they organize *how* it's spent per page.

## 1. Page Archetypes (selected before bin-packing)

The planner's first decision isn't "which component does this product get,"
it's **"what composition is this page?"** Only then does bin-packing fill
the zones that composition defines. This is the direct fix for "a more
organized version of the flyer you disliked."

| Archetype | Composition | Zones (approx. budget) | Modeled on |
|---|---|---|---|
| `produce_feature_page` | Vertical produce sidebar + main grid | sidebar (~8 cells, produce-only), main_grid (~22 cells) | Real ARZ page 1 |
| `grocery_dense_page` | Uniform high-density grid, few/no features | grid (~30-33 cells) | Real ARZ pages 4, 5 |
| `hero_plus_grid_page` | 1-2 heroes + supporting grid | hero_zone (~10-16 cells), grid_zone (~15-20 cells) | General workhorse mix |
| `category_split_page` | Page divided into 2 category bands | band_a (~15 cells), band_b (~15 cells) | Real ARZ page 6 (Frozen + Deli) |
| `catering_side_rail_page` | Main content + vertical ad/feature rail | main_zone (~24 cells), rail_zone (~9 cells, no bin-packing — editorial) | Real ARZ pages 2, 7 |
| `brand_feature_page` | One brand's SKUs grouped prominently + grid fill | brand_zone (~8 cells), grid_zone (~22 cells) | — |
| `meat_visual_page` | Large photography-led layout, low item count | visual_grid (~9-12 large cells) | Real ARZ page 8 |
| `promo_campaign_page` | Full-width seasonal/campaign banner + supporting items | banner_zone (~10 cells, no product), grid_zone (~20 cells) | Real ARZ page 3 (Back to School) |

**How archetype gets chosen per page:** the planner looks at what's actually
being assigned to that page — category mix, score distribution, whether a
`catering`/`prepared_food` category is present with descriptive content,
whether one item's score is an outlier vs. the rest — and picks the closest-
matching archetype from the table above (rule-based selection, not an LLM
call). If nothing distinctive applies, it defaults to `grocery_dense_page`,
the safe efficient fallback. Once the archetype is chosen, bin-packing (as
described in Revision 1) runs *within* that archetype's defined zones,
never across them — a produce item never lands in a `meat_visual_page`'s
zone, for instance.

This is genuinely how professional flyer design works — a small library of
proven page compositions, populated with this week's specific products —
rather than one universal grid algorithm.

## 2. Layout Constraints (in addition to scores)

Priority score decides *how much space* a product deserves. Constraints
decide *placement rules that scores can't express* — a catering platter and
a bag of cucumbers are fundamentally different content objects, and scoring
alone can't capture that a platter photo can never be cropped tighter than
85%, or that two competing brands' hero items must not sit adjacent.

Constraints live per-campaign (they're about *this week's* flyer, not the
eternal product catalog — see the data model below):

| Constraint | Meaning |
|---|---|
| `must_be_page_1` | Hard placement requirement |
| `preferred_page` | Soft placement hint, honored if it doesn't break the budget |
| `must_be_adjacent_to` | e.g. keep a platter next to its side-dish upsell |
| `must_not_be_adjacent_to` | e.g. competing brands, or two hero items too close together |
| `same_brand_group` | Groups SKUs for `brand_feature_page` selection |
| `same_category_group` | Groups SKUs for `category_split_page`/grid cohesion |
| `minimum_component_size` / `maximum_component_size` | Floor/ceiling on which components a product may be assigned, regardless of score |
| `requires_price` | Nearly always true; explicit for completeness |
| `requires_regular_price` | Show the crossed-out "was" price |
| `requires_save_badge` | Force a "SAVE X%" badge even if not top-scored |
| `requires_description` | Component must have a description slot (disqualifies pure-grid components) |
| `requires_serving_count` | Catering/prepared-food specific — component must show "serves X" |

The planner treats constraints as filters applied *before* scoring picks a
tier — a product with `requires_description` + `requires_serving_count`
(a catering platter, say) can only ever be assigned to a component that has
those slots (Catering Feature, Prepared Food Feature), no matter how its
score comes out. Constraints are hard; scores are soft.

## 3. Asset Preparation Pipeline (new — not previously addressed)

Flagged as a real gap in Revision 1: a brilliant layout engine still
produces an ugly flyer if the input photography is bad, and merchant-
uploaded images will be inconsistent — white backgrounds, transparent PNGs,
angled phone photos, wildly different aspect ratios, tiny files, products
occupying a fraction of the frame.

Pipeline, run once per uploaded image, output attached to the `assets` row:

```
Upload image
  → detect product bounds
  → normalize/remove background if needed
  → crop whitespace
  → normalize orientation
  → determine safe-crop region (for hero vs. standard vs. thumbnail use)
  → generate a master (cleaned) version
  → generate flyer-sized derivatives (per component size class)
  → compute asset_quality_score
  → attach all of the above to the product's asset record
```

`asset_quality_score`: **Excellent / Acceptable / Poor / Missing.** This
feeds the layout planner directly — a `Poor`-scored image disqualifies a
product from Hero/Full-width/Catering Feature placement regardless of its
priority score, with a surfaced warning instead of a silent downgrade:

> ⚠ Olive Oil image resolution is too low for Hero placement. Use Standard
> Product instead, or upload a larger image.

This is scoped as an assist pipeline (mostly deterministic image processing
— bounds detection, whitespace cropping, resolution checks — with AI used
narrowly for background removal/product detection where deterministic
methods fall short), not a new AI-generation surface.

## 4. Data model — layout specification is the source of truth

Direct response to the concern that mattered most here: **if a customer
changes Tomatoes $1.49 → $1.29, Novex updates the structured flyer and
regenerates — it never treats the PDF as the source of truth.** The PDF (or
PNG/JPEG for social) is a rendered *output* of this structure, always
regeneratable from it:

```
business
  → products                (catalog identity: SKU, name, category, master image)
  → assets                  (photos, incl. Asset Preparation Pipeline metadata)
  → campaigns                (a weekly-specials run — from existing Core schema)
      → campaign_products    (THIS week's price/promo/constraints for a product)
      → generated_documents  (one output artifact: the print flyer, an IG post, etc.)
          → document_pages   (each page, tagged with its chosen archetype)
              → layout_instances  (each component placed in a page, referencing
                                    a campaign_product, sized/positioned)
```

Key modeling decision: **`regular_price` lives on `products`** (catalog
identity), but **`sale_price`, `promotion_type`, `featured`, and all the
Section 2 constraints live on `campaign_products`** — because those change
every week, while the product itself doesn't. Editing this week's Tomatoes
price touches one `campaign_products` row; it never touches `products` and
never requires regenerating anything by hand — the next render of that
`generated_documents` row picks up the change automatically.

`page_archetypes` is a small reference table (not per-tenant data) holding
the 8 archetypes from Section 1 and their zone definitions as data, not
hardcoded logic — so tuning a zone's budget, or adding a 9th archetype
later, is a data change, not a code change.

Actual migration SQL for all of this is written and ready for inspection at
[`supabase/migrations/0002_flyer_engine_schema.sql`](../supabase/migrations/0002_flyer_engine_schema.sql)
— **not executed against anything.** It extends `0001_core_schema.sql`
(businesses/campaigns/assets already exist there) rather than duplicating
it.

## 5. Rendering — server-side for production, client-side for preview only

Settled: production PDF generation is server-side, deterministic, using
headless Chromium (Playwright). Client-side rendering is for live preview
only, while a merchant is editing.

```
Layout Plan (structured JSON: pages → layout_instances → campaign_products)
  → Renderer (component templates, same ones used for preview)
  → HTML/CSS/SVG
  → Headless Chromium (Playwright)
       ├─→ Print-to-PDF   → print flyer, press-ready
       └─→ Screenshot     → PNG/JPEG/WebP → digital/social derivatives
```

Same structured plan, same component templates, same renderer — the only
difference between a print PDF and an Instagram-ready PNG is which capture
step headless Chromium runs. That's what makes "one upload → flyer + social
assets" realistic later without a second rendering system.

**Real infrastructure implication, flagged honestly:** Netlify's standard
Functions aren't built for running a full Chromium instance (cold-start and
package-size constraints). This needs either a Netlify Background Function
with a Chromium binary layer (e.g. `@sparticuz/chromium`), or a small
dedicated always-on rendering service (Render/Fly.io-style). That's a real
"what does this cost and where does it run" decision — not resolved here,
flagged as the next infra question once implementation actually starts.
Given the cost-sensitivity we've operated under all along, I'd want to
confirm actual usage volume (how many flyers/week, how many pages) before
picking a specific hosting approach — a Background Function is likely
sufficient and cheapest at Novex's current scale.

## 6. AI scope — V1 vs V1.1

**V1 (ships with the first working engine) — ingestion assistance only:**
- Normalize messy product names/units from the spreadsheet.
- Infer a missing category.
- Detect obvious data problems (blank price, duplicate SKU, etc.) and flag
  them instead of guessing silently.
- Fuzzy-match photos to SKUs when filenames don't line up exactly
  (low-confidence matches flagged for human review, never silent).

These directly reduce real merchant effort and don't require the
deterministic core to be fully proven first — they operate on raw input
before layout planning ever runs. V1's job is to prove:
`spreadsheet + images → structured products → merchandising → layout → flyer → PDF`
end to end, deterministically, before any design-assistant AI is added.

**V1.1 (fast-follow, after V1's deterministic core is proven) — design/
merchandising assistant:**
- "✨ Improve This Page" — proposes a structured diff to the Layout Plan
  JSON (never touches HTML/CSS directly), merchant approves before re-render.
- Suggesting a better hero item, rearranging promotions, flagging pages with
  too-uniform visual weight.

**Longer-term, explicitly not scoped yet:** learning from a business's own
flyer history — e.g. noticing this merchant's produce reliably gets heavy
Page-1 space, or that catering consistently performs better in a side rail
— and letting that shape future archetype/placement choices automatically.
Genuinely interesting, deliberately deferred until the deterministic engine
and V1.1 assistant are both proven.

## 7. Priority scoring — Novex owns the weights, merchants use plain controls

No merchant ever sees or edits a weight. Novex ships sensible internal
defaults (illustrative — to be tuned against real output, not treated as
final):

| Factor | Illustrative weight |
|---|---|
| Featured status | 30 |
| Promotion type (hot deal > seasonal > new > none) | 20 |
| Discount strength | 15 |
| Campaign relevance | 15 |
| Margin contribution (if merchant provides cost data) | 10 |
| Category importance | 10 |

Merchants influence the outcome through plain controls that map onto the
constraint/scoring system underneath, not math:

- **Feature this product**
- **Make this a hero**
- **Priority: High / Normal / Low**
- **Must appear on Page 1**
- **Keep these together** (maps to `same_brand_group`/`same_category_group`
  or `must_be_adjacent_to`)
- **Do not feature**

Each of these is a thin, understandable layer over the constraint fields in
Section 2 and the score inputs in the table above — the merchant clicks
"Make this a hero," Novex sets the internal weight/constraint fields that
produce that outcome.

## 8. Where AI is allowed — and explicitly where it is not

Unchanged from Revision 1, restated for completeness:

**Allowed** (structured, reviewable, never final pixels): spreadsheet
cleanup, photo-to-SKU fuzzy matching, asset quality flagging, "Improve This
Page" as a plan-diff (V1.1), QA passes.

**Never allowed:** freely generating page HTML/CSS, choosing fonts/colors/
positions outside the component library, any path that bypasses the
deterministic renderer.

## 9. Novex Core integration

Unchanged in spirit from Revision 1 — photos become `assets`, the weekly
upload becomes a `campaigns` row, generated outputs become
`generated_documents` rows — now modeled precisely per Section 4's entity
chain instead of one flat JSON blob. Future auto-publishing becomes
`automations` rows, per existing Core design.

## 10. Explicitly NOT being built in this phase

Digital flyer variant beyond print, Instagram/Facebook/GBP/WhatsApp/email
renderers, digital signage output, scheduled auto-publishing, the V1.1
design-assistant AI, and the "learn from flyer history" idea in Section 6.
The data model doesn't preclude any of these — none are in scope for the
first build.

## 11. Migration / rollout plan

- **Phase A (Revision 1 + this revision):** proposal, no code. ✅ current step.
- **Phase B (on approval):** build page archetypes, constraint system, asset
  pipeline, component library, planner, and renderer as new files, entirely
  separate from `flyer_print_prototype.html` / `flyer_generator_demo.html` —
  both stay untouched, unlinked from the portal, kept as reference.
- **Phase C:** internal validation against the real ARZ reference — we
  already have all 8 real pages rendered as images and the real per-page
  item counts/character from this session. Feed a comparable synthetic
  product list through the planner and compare page-by-page archetype
  choices and composition against the real thing before showing it to you.
- **Phase D:** only once Phase C passes, repoint the portal's "flyer" module
  at the new engine. Still additive — nothing destructive.

**Rollback:** every phase up to D touches only new files. Nothing existing
is at risk.

## 12. Decisions — resolved this round

1. **PDF approach: server-side, resolved.** Headless Chromium (Playwright),
   deterministic HTML/CSS/SVG → PDF and → PNG/JPEG/WebP from the same
   renderer. Client-side is preview-only. Hosting approach for the headless
   step is a follow-up infra decision once implementation starts (see
   Section 5).
2. **AI scope: resolved.** V1 = ingestion assistance only (data cleanup,
   image-SKU matching). V1.1 = design/merchandising assistant ("Improve
   This Page," etc.), fast-follow after V1's deterministic core is proven.
3. **Schema: resolved.** Migration SQL is written
   (`supabase/migrations/0002_flyer_engine_schema.sql`) for inspection, not
   executed anywhere.
4. **Score weights: resolved.** Novex owns and tunes internal weights;
   merchants get plain controls (Feature, Hero, Priority, Must Be Page 1,
   Keep Together, Do Not Feature) that map onto the underlying scoring/
   constraint system, never raw numbers.

## 13. Open for the next review round

- Final tuning of the illustrative weight table in Section 7 (needs testing
  against real product mixes, not guessed).
- Hosting/cost decision for headless-Chromium rendering (Section 5) —
  needs actual expected volume (flyers/week, pages/flyer) before picking
  Background Function vs. a small dedicated service.
- Exact rule-based heuristics for archetype selection per page (Section 1's
  "how archetype gets chosen" is directional; the precise decision rules
  get refined once we're testing against real data in Phase C).

Nothing gets built until you've reviewed this revision and we've done the
one more pass you mentioned.
