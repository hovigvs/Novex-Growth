# Novex Flyer Engine — Phase B1 (Visual Proof)

This is the first real implementation slice of the engine proposed in
[`../docs/NOVEX_RETAIL_CONTENT_ENGINE.md`](../docs/NOVEX_RETAIL_CONTENT_ENGINE.md)
(Revision 3). It is a **separate, new subproject** — nothing in the repo
root (`flyer_print_prototype.html`, `flyer_generator_demo.html`, `portal.html`,
etc.) has been touched.

Scope, deliberately narrow per the agreed vertical-slice plan: prove that
one real page can look genuinely professional end-to-end, before building
out all 16 components. Built:

- `RenderingService` abstraction (`rendering-service.js`) + a Playwright/
  headless-Chromium implementation (`render.js`) — provider-agnostic
  interface, swappable backend, per Revision 3 §10.
- Structured Layout Plan (plain JS objects mirroring the
  `document_pages`/`layout_instances` shape from `0002_flyer_engine_schema.sql`).
- Two archetypes: `hero_plus_grid_page`, `grocery_dense_page`
  (`archetypes.js`), with real fractional zone geometry, not just cell-cost.
- Six components: Hero Product, Standard Product, Hot Deal, Double Product,
  Category Header, Footer (`components.js`).
- Minimal priority scoring + a structured breakdown (`scoring.js`).
- Minimal constraint handling — `merchant_force_hero`,
  `merchant_do_not_feature`, `requires_description` (`constraints.js`).
- A `BrandKit` abstraction (`brand-kit.js`) — flyer styling belongs to the
  merchant, not hardcoded to Novex. One sample brand kit included
  (`arzStyleBrandKit`), modeled on the real ARZ reference's red/black/white
  grocery-circular look, so this proof is judged against the same visual
  bar as the real thing.
- Realistic synthetic product data (`data/sample-campaign.js`) modeled on
  the real ARZ reference categories/items already captured this session.

Not built yet (deliberately, per the agreed plan): the other 10 components,
the other 6 archetypes, the Flyer Composition Planner (multi-page rhythm),
the Asset Preparation Pipeline, spreadsheet ingestion, any AI features.

## How to run it

```bash
cd flyer-engine
npm install                # already run once; re-run if package.json changes
npx playwright install chromium   # already run once this session
npm run render
```

`npm run render` runs `render.js`, which:
1. Builds two Layout Plans (one `hero_plus_grid_page`, one
   `grocery_dense_page`) from the sample campaign data.
2. Renders each through `RenderingService` to a self-contained HTML file.
3. Opens each in headless Chromium, checks for page overflow
   programmatically (same `getBoundingClientRect()` method used manually
   earlier this session, now automated), and exports a print-accurate PDF
   (US Letter, 8.5×11in) plus a PNG for quick viewing.

Output lands in [`../tests/flyer_visuals/`](../tests/flyer_visuals/):
- `b1_hero_grid_v1.html` / `.pdf` / `.png`
- `b1_grocery_dense_v1.html` / `.pdf` / `.png`
- `b1_hero_grid_v1.layout.json` / `b1_grocery_dense_v1.layout.json` — the
  actual structured Layout Plan that produced each render, for inspection.

**To preview in a browser without regenerating anything:** just open the
`.html` file directly — it's fully self-contained (inline CSS, no
external requests except Google Fonts), same as `flyer_print_prototype.html`
was.

## File map

| File | Role |
|---|---|
| `brand-kit.js` | BrandKit shape + `arzStyleBrandKit` sample |
| `data/sample-campaign.js` | Synthetic `products` + `campaign_products`, ARZ-modeled |
| `scoring.js` | `computeScore(campaignProduct)` → score + breakdown |
| `constraints.js` | `applyConstraints(scoredProducts)` → tier-eligible list |
| `archetypes.js` | `hero_plus_grid_page`, `grocery_dense_page` zone definitions |
| `components.js` | HTML template functions per component, take `(campaignProduct, product, brandKit, variant)` |
| `planner.js` | Fills an archetype's zones from scored+constrained products → Layout Plan |
| `rendering-service.js` | `RenderingService.generate(layoutPlan, brandKit)` → full HTML string |
| `render.js` | Node/Playwright script: HTML → PDF + PNG, with an overflow check |
