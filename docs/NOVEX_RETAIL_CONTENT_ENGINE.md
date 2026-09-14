# Novex Retail Content Engine — Architecture (Revision 3, final for review)

**Status: PROPOSAL ONLY. Not implemented.** No existing file has been
touched — `flyer_print_prototype.html` and `flyer_generator_demo.html` are
untouched and stay as reference prototypes. This document supersedes
Revisions 1 and 2 in full; it is the only version to read. It extends
[`NOVEX_SYSTEM_ARCHITECTURE.md`](NOVEX_SYSTEM_ARCHITECTURE.md) — read that
first for the Core entity model (Business/User/Customer/Lead/Conversation/
Asset/Campaign/Automation/AI Agent) this builds on.

*Revision history, for context only: Rev 1 proposed a component library +
scored bin-packing. Rev 2 added page archetypes, layout constraints, an
asset pipeline, and made the layout spec (not the PDF) the source of truth.
Rev 3 (this document) fixes campaign price/priority modeling, splits
merchant intent from system-derived constraints, adds a whole-flyer
composition planner above per-page archetype selection, refines the asset
pipeline to classify rather than blindly strip backgrounds, adds component
variants and real zone geometry, and makes rendering provider-agnostic.*

## 1. Why an architecture, not a restyle

Iterating on `flyer_print_prototype.html` kept producing the same failure:
a hand-tuned CSS grid that overflows or forces arbitrary trims the moment
content changes. A deterministic component library and scored bin-packing
fixes that, but bin-packing alone produces an efficient catalog, not an
art-directed flyer — the real ARZ flyer deliberately varies page
composition (produce sidebar, catering rail, meat-heavy spread), and that
variety has to be designed in, not left as an emergent side effect of
packing efficiency.

One empirical fact from this session, still load-bearing: page space is a
countable budget. A standard 8.5×11 page held **33 standard-sized items**;
making 2 items hero-sized cost **~5 standard items' worth of space each**,
confirmed by measurement. Everything below turns that into a real planning
mechanism instead of a feeling.

## 2. Planning hierarchy

```
Campaign
  → Flyer Composition Plan   (whole-flyer rhythm: which archetype per page, as a set)
      → Page Archetypes       (one composition per page, with real geometric zones)
          → Zones             (rectangular regions with geometry + allowed components)
              → Components    (deterministic templates, each with 2-4 variants)
                  → Layout Instances  (one component placed in one zone, referencing
                                        a campaign_product)
                      → Renderer      (provider-agnostic; produces PDF/PNG from the plan)
```

Two layers were added in this revision, in this order for a reason: the
**Flyer Composition Plan** decides the whole 8-page rhythm *before* any
single page's archetype is fixed, and **Zones** carry real rectangular
geometry, not just a cell-cost number. Both are explained below.

## 3. Flyer Composition Planner (whole-flyer, before per-page archetypes)

Deciding archetypes page-by-page, in isolation, can produce a technically
valid but boring flyer — e.g. five `grocery_dense_page`s in a row followed
by a sudden `hero_plus_grid_page`, each individually reasonable, collectively
monotonous. The Composition Planner runs first and commits to an archetype
*sequence* for the whole document:

```
Page 1: produce_feature_page
Page 2: catering_side_rail_page
Page 3: promo_campaign_page
Page 4: grocery_dense_page
Page 5: grocery_dense_page
Page 6: category_split_page
Page 7: catering_side_rail_page
Page 8: meat_visual_page
```

It works from the whole scored product set plus category distribution
(how much produce/meat/catering/packaged-grocery content exists this week),
applying rhythm rules such as: don't repeat `grocery_dense_page` more than
twice consecutively; a `catering_side_rail_page` or `meat_visual_page`
anchors roughly one page per few pages if the category mix supports it;
`promo_campaign_page` is used when an active seasonal campaign exists,
otherwise skipped. This is still rule-based, not an LLM call — deterministic
and explainable, same as scoring.

Only once this sequence is committed does per-page work begin: each page's
already-assigned archetype defines its zones, and bin-packing fills those
zones from the scored, constrained product set. The resulting sequence
(and the reasoning that produced it — e.g. "Page 2 chosen as
`catering_side_rail_page` because catering category has 4 items with
`requires_description`") is stored alongside the document for the same
reason score breakdowns are stored: so "why does the flyer look like this"
always has an answer.

## 4. Page Archetypes and Zone geometry

Eight archetypes, each modeled directly on a real ARZ reference page from
this session:

| Archetype | Composition | Modeled on |
|---|---|---|
| `produce_feature_page` | Vertical produce sidebar + main grid | Real ARZ page 1 |
| `grocery_dense_page` | Uniform high-density grid | Real ARZ pages 4, 5 |
| `hero_plus_grid_page` | 1-2 heroes + supporting grid | General workhorse |
| `category_split_page` | Page divided into two category bands | Real ARZ page 6 |
| `catering_side_rail_page` | Main content + vertical editorial rail | Real ARZ pages 2, 7 |
| `brand_feature_page` | One brand grouped prominently + grid fill | — |
| `meat_visual_page` | Large photography-led, low item count | Real ARZ page 8 |
| `promo_campaign_page` | Full-width seasonal banner + supporting grid | Real ARZ page 3 |

**Zones carry real geometry, not just cell-cost.** Cell-cost stays as a
useful planner heuristic (it's how the empirical 33-item/page budget gets
applied), but it's insufficient alone — a 6-cell horizontal strip and a
6-cell vertical column consume the same "area" but behave completely
differently. Each zone in an archetype defines both:

```
zone:
  name: sidebar
  x: 0            \
  y: 0             |  fractional geometry (0-1 of page width/height)
  width: 0.28      |
  height: 0.90    /
  min_width: 0.22
  aspect_ratio: null        # set when a zone should constrain component AR
  cost_budget: 8            # heuristic cap, still used by the planner
  allowed_components: [produce_hero, standard_product]
```

## 5. Component Library and variants

16 components, matching Revision 1/2's list, each a fixed deterministic
template — but important components now support a **small, fixed set of
variants** rather than one rigid look, so an 8-page flyer doesn't read as
obviously template-generated:

| Component | Approx. cost (cells) | Variants |
|---|---|---|
| Hero Product | ~8-10 | `left_image`, `right_image`, `image_top`, `full_bleed` |
| Standard Product | 1 | `compact`, `vertical`, `horizontal`, `image_heavy`, `price_heavy` |
| Double Product | 2-3 | `horizontal`, `vertical` |
| Produce Hero | ~6-8 | `image_top`, `full_bleed` |
| Hot Deal | 1.5-2 | `compact`, `price_heavy` |
| Brand Feature | 4-6 | `horizontal`, `vertical` |
| Catering Feature | 6-10 | `left_image`, `right_image` |
| Prepared Food Feature | 6-8 | `left_image`, `right_image` |
| Category Grid | 1/item | `compact`, `image_heavy` |
| Promo Message | 3-5 | — (copy/theme only, no image variant) |
| Meat Feature | 4-6 | `left_image`, `right_image` |
| Full-width Campaign | 15-20 | `image_top`, `full_bleed` |
| Side Rail | ~30% width | `product_list`, `editorial_copy` |
| Category Header | ~0 | — |
| Footer Promotion | fixed | — |
| Store Information | fixed | — |

2-4 variants per component is enough for real visual variety; this stays
fully deterministic — a variant is still a fixed template, chosen by the
planner from a controlled list, never AI-generated layout.

## 6. Layout Constraints — merchant intent vs. system-derived

This distinction matters because a merchant will eventually ask "why did
the falafel end up on page 1?" — Novex needs to answer either "you marked
it Must Be Page 1" or "the planner selected it based on this week's
priority score," and those are different fields, not one blended list.

**Merchant intent** (explicit, human-set, lives on `campaign_products`):

| Field | Meaning |
|---|---|
| `merchant_priority` | High / Normal / Low |
| `merchant_featured` | Feature this product |
| `merchant_force_hero` | Make this a hero, overriding score-based tier |
| `merchant_page_preference` | "I want this on page N" |
| `merchant_keep_together_group` | Free-text tag — products sharing a tag are placed on the same page/near each other |
| `merchant_do_not_feature` | Never promote this item regardless of score |

**System-derived constraints** (computed, not human-set):

| Field | Meaning |
|---|---|
| `requires_description` | Component must have a description slot (from product category, e.g. catering) |
| `requires_serving_count` | Catering/prepared-food only |
| `min_component_size` / `max_component_size` | Floor/ceiling regardless of score |
| `asset_quality_restriction` | Set when `asset_quality_score` is Poor — blocks Hero/Full-width tiers |
| `safe_crop_requirement` | From the Asset Preparation Pipeline — how tightly this image may be cropped |

Simplification from Revision 2: explicit `must_be_adjacent_to` /
`must_not_be_adjacent_to` product-ID arrays are dropped as a stored field —
"keep together" is fully expressed by `merchant_keep_together_group`
(a shared tag), and "don't cluster two hero items" becomes a general
Composition Planner rule (Section 3), not a per-product stored constraint.
Similarly, `same_brand_group`/`same_category_group` are dropped as separate
fields — they're just `products.brand` and `products.category`, already
available without duplicating them onto every campaign row.

## 7. Priority Scoring — campaign-specific, explainable

**Priority score is never stored on `products`.** A box of baklava is
irrelevant most weeks and the hero item during a holiday campaign — the
score is a property of *this campaign's* placement of that product, so it
lives on `campaign_products`, alongside a breakdown for debugging:

```
campaign_products.priority_score            = 83
campaign_products.priority_score_breakdown  = {
  "featured":        30,
  "hot_deal":        20,
  "discount":        12,
  "campaign_match":  15,
  "category":         6,
  "total":           83
}
```

Novex owns the underlying weights (illustrative starting point, to be
tuned against real output, not treated as final):

| Factor | Illustrative weight |
|---|---|
| Featured status | 30 |
| Promotion type (hot deal > seasonal > new > none) | 20 |
| Discount strength | 15 |
| Campaign relevance | 15 |
| Margin contribution (if provided) | 10 |
| Category importance | 10 |

No merchant ever edits these numbers directly — `merchant_force_hero`,
`merchant_featured`, and `merchant_priority` (Section 6) are the plain
controls that feed into this calculation.

## 8. Asset Preparation Pipeline — classify, don't blindly strip

Revision 2's "remove background automatically" was wrong: a BBQ platter
often *wants* its styled photographic presentation; a packaged rice bag
usually wants a clean white/transparent background; produce often wants
isolation. The pipeline now classifies before it acts:

```
Upload image
  → detect product bounds
  → classify image_role         (product_packshot | food_photography |
                                   produce | lifestyle | promotional_art)
  → classify background_mode    (preserve | remove | white | transparent | auto)
  → crop whitespace (only if background_mode calls for it)
  → normalize orientation
  → determine safe-crop region
  → generate master + flyer-sized derivatives
  → compute asset_quality_score (Excellent / Acceptable / Poor / Missing)
  → attach all of the above to the asset record
```

`image_role` defaults sensibly by product category (packaged grocery →
`product_packshot`/`white`; catering platters and meat →
`food_photography`/`preserve`; produce → `produce`/`auto`) but is always
overridable per asset. `asset_quality_score` of Poor feeds directly into
`asset_quality_restriction` (Section 6), blocking Hero-tier placement with
a surfaced warning:

> ⚠ Olive Oil image resolution is too low for Hero placement. Use Standard
> Product instead, or upload a larger image.

## 9. Data model

```
business
  → products                 (catalog identity only: SKU, name, category,
                                brand, unit, master image — NOT authoritative
                                pricing)
  → assets                   (photos, incl. Asset Preparation Pipeline metadata)
  → campaigns                 (a weekly-specials run — from existing Core schema)
      → campaign_products     (THIS campaign's snapshot: regular_price,
                                 sale_price, priority_score + breakdown,
                                 merchant intent, system constraints)
      → generated_documents   (one output artifact: print flyer, IG post, etc.)
          → document_pages    (each page, tagged with its committed archetype)
              → layout_instances  (each component instance in a zone,
                                    with its chosen variant, referencing a
                                    campaign_product)
```

**Price snapshot fix (the key correction this revision makes):** both
`regular_price` and `sale_price` live on `campaign_products`, not
`products`. If olive oil is $42.99→$26.99 in September and $45.99→$29.99 in
November, regenerating September's flyer later must still show September's
prices — that's only possible if pricing is snapshotted per campaign, not
overwritten on the shared catalog row. `products` may carry a
`current_regular_price` purely as a display convenience (e.g. pre-filling
a new campaign's form) — it is explicitly never the source of truth for
any generated document.

Actual migration SQL, updated to match this revision, is at
[`supabase/migrations/0002_flyer_engine_schema.sql`](../supabase/migrations/0002_flyer_engine_schema.sql)
— **written for inspection, not executed anywhere.**

## 10. Rendering — provider-agnostic by design

The flyer engine calls one interface, not a specific hosting provider:

```
RenderingService.generate(layoutPlan) -> { pdf_url, png_urls[] }
```

Today's likely implementation is server-side headless Chromium (Playwright)
— structured Layout Plan → component templates → HTML/CSS/SVG → headless
browser → PDF (print) or screenshot (PNG/JPEG/WebP for social/digital),
sharing the same templates as client-side live preview. But the engine
itself only knows about `RenderingService`, not Netlify, Playwright,
Render, or Fly.io — so the actual hosting choice (Netlify Background
Function with a Chromium layer vs. a small dedicated service) can be made
and changed later based on real volume, without touching the planner,
component library, or data model. Given current scale (a handful of test
flyers, not high volume), a Background Function is the likely starting
point, but that's an infrastructure decision made behind the interface, not
inside it.

## 11. AI scope

**V1 (ships with the first working engine) — ingestion assistance only:**
normalize messy product names/units, infer a missing category, flag
obvious data problems instead of guessing, fuzzy-match photos to SKUs when
filenames don't line up (low-confidence matches flagged for review). V1's
job is to prove `spreadsheet + images → structured products → merchandising
→ layout → flyer → PDF` end to end, deterministically.

**V1.1 (fast-follow, after V1's deterministic core is proven) — design
assistant:** "✨ Improve This Page" proposes a structured diff to the
Layout Plan (never touches HTML/CSS directly), merchant approves before
re-render; suggesting a better hero item; flagging visually monotonous
pages.

**Deliberately deferred, not scoped:** learning from a business's own flyer
history (e.g. "this merchant's produce reliably gets Page 1") to shape
future Composition Plans automatically. Genuinely interesting, explicitly
future work.

**Never allowed, at any phase:** freely generating page HTML/CSS, choosing
fonts/colors/positions outside the component library, any path that
bypasses the deterministic renderer.

## 12. Novex Core integration

Uploaded photos → `assets`. Spreadsheet rows → `products`. Each weekly
upload → one `campaigns` row. Each generated output → a
`generated_documents` row with its own `document_pages`/`layout_instances`
structure. Future auto-publishing (scheduled posting) → `automations` rows,
per existing Core design. Because Product/Asset/Campaign data is
channel-agnostic, a future Instagram or email renderer is just another
consumer of `RenderingService`, not a redesign.

## 13. Explicitly not being built in this phase

Digital flyer variant beyond print, Instagram/Facebook/GBP/WhatsApp/email
renderers, digital signage output, scheduled auto-publishing, V1.1's design
assistant, learning from flyer history. The data model doesn't preclude
any of these later; none are in scope for the first build.

## 14. Migration / rollout plan

- **Phase A (this document):** proposal, no code. ✅ current step.
- **Phase B (on approval):** build the Composition Planner, Page Archetypes,
  Zone geometry, Component library + variants, Constraint system, Asset
  pipeline, and `RenderingService` as new files, entirely separate from
  `flyer_print_prototype.html` / `flyer_generator_demo.html` — both stay
  untouched, unlinked from the portal.
- **Phase C:** internal validation against the real ARZ reference (all 8
  pages already rendered as images this session, with real per-page item
  counts) — compare the engine's composition and page character against
  the real thing before showing it to you.
- **Phase D:** only once Phase C passes, repoint the portal's "flyer"
  module at the new engine. Still additive, nothing destructive.

**Rollback:** every phase up to D touches only new files.

## 15. Final architecture summary

A weekly upload (spreadsheet + photos + brand kit) becomes one `campaign`.
Products are catalog identity; everything that changes weekly (price,
promotion, merchant intent) is snapshotted per-campaign on
`campaign_products`, so any past flyer stays reproducible even after catalog
prices move on. A deterministic pipeline — Composition Planner → Page
Archetypes (real geometric zones, not just cell-cost) → scored, constrained
Components (each with a few fixed variants) → Layout Instances — produces a
structured Layout Plan, which a provider-agnostic `RenderingService` turns
into print PDF and social-ready images from the same templates. AI assists
ingestion (V1) and later, design suggestions (V1.1) — it never generates
layout HTML directly. Every "why did this happen" question (why is this
the hero, why is this page's archetype, why was this image restricted) has
a stored, inspectable answer.

## 16. Remaining blockers before Phase B can start

None are architectural — the design is settled. What's genuinely open:

1. **Weight tuning** (Section 7's table) needs real product-mix testing,
   not just illustrative numbers — this happens naturally during Phase C.
2. **Rendering hosting choice** (Section 10) needs actual expected volume
   (flyers/week, pages/flyer) before picking Background Function vs. a
   dedicated service — doesn't block starting Phase B, since the engine is
   built against `RenderingService` regardless of which implementation
   backs it first.
3. **No Supabase project exists yet** (per `NOVEX_SYSTEM_ARCHITECTURE.md`'s
   audit) — Phase B can be built and tested against the schema locally/in
   a throwaway project before deciding to provision the real one, so this
   doesn't block starting either, but it will need a real decision before
   Phase D (portal integration).

## 17. Proposed Phase B implementation order

1. `RenderingService` interface + a minimal implementation (even a
   trivial one) first, so every later step has somewhere to render to for
   testing.
2. Component library (16 components, deterministic templates + variants)
   — pure presentation, no planning logic yet, testable in isolation the
   same way `flyer_print_prototype.html` was hand-tested this session.
3. Zone geometry + Page Archetypes (static definitions, matching
   `page_archetypes` seed data).
4. Priority scoring + score breakdown, operating on a hand-built sample
   `campaign_products` set (no ingestion yet).
5. Layout Constraints (merchant intent + system-derived) applied as filters
   on top of scoring.
6. Zone/Component planner — assigns scored, constrained products into an
   archetype's zones (per-page bin-packing).
7. Flyer Composition Planner — decides the whole 8-page archetype sequence,
   feeding step 6 per page.
8. Asset Preparation Pipeline (classification + derivatives + quality
   score) — wired in once the rest of the pipeline can consume its output.
9. Ingestion (V1 AI): spreadsheet → structured products/campaign_products,
   photo-to-SKU matching.
10. End-to-end test against a synthetic dataset modeled on the real ARZ
    reference (Phase C from Section 14).

Stopping here, as instructed. No Phase B code has been written.
