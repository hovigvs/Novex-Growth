# Novex Brand Center — Architecture Proposal (B1)

**Status: PROPOSAL ONLY. Not implemented. No migration SQL written.**
No file in this repo's `main` branch has been touched by this proposal, and
nothing in the `social-b1` worktree has been read-write touched — it was
inspected read-only for this audit and is otherwise untouched.
`flyer-engine/` rendering/components are untouched.

This is shared customer configuration infrastructure, not a marketing-
generation engine. It extends
[`NOVEX_SYSTEM_ARCHITECTURE.md`](NOVEX_SYSTEM_ARCHITECTURE.md) (Core) and
sits alongside [`NOVEX_RETAIL_CONTENT_ENGINE.md`](NOVEX_RETAIL_CONTENT_ENGINE.md)
(Flyer) and the Social Content Engine (`social-b1` worktree) as a peer
consumer/producer of Core.

## 1. Architecture audit

| Source | Finding |
|---|---|
| `NOVEX_SYSTEM_ARCHITECTURE.md` | Core already defines `businesses`, `profiles`, `customers`, `leads`, `conversations`, `assets`, `campaigns`, `automations`, `ai_agents`. The stated rule ("every new feature integrates with Core rather than creating a separate isolated system") is the direct mandate for this proposal. |
| `NOVEX_RETAIL_CONTENT_ENGINE.md` | Flyer B1 (this session) built a **local, JS-only `BrandKit`** (`flyer-engine/brand-kit.js`) — colors, fonts, badge/price/border styles, footer info. It is explicitly a placeholder for the B1 vertical slice, never proposed as the production schema, and **is not a SQL table** — so there is no database-level conflict, only a shape/naming one (resolved below). |
| `NOVEX_SOCIAL_CONTENT_ENGINE.md` (`social-b1` worktree, read-only) | Social B1 is "Approved vertical slice." It already defines real, migration-backed `brand_kits` and `creative_profiles` tables (`supabase/migrations/0003_social_content_b1_schema.sql`) plus a runtime JS shape (`social-content-engine/domain/creative-profile.js`, `data/fixtures.js`). This is the one that matters — see §2. |
| Existing Core schema | `supabase/migrations/0001_core_schema.sql` (businesses/profiles/customers/leads/conversations/assets/campaigns/automations/ai_agents) and `0002_flyer_engine_schema.sql` (products/campaign_products/page_archetypes/generated_documents/document_pages/layout_instances). Confirmed byte-identical between `main` and the `social-b1` worktree — no divergence yet. `businesses` currently has only `id/name/vertical/plan/timestamps` — **no industry, website, description, contact, or social fields exist anywhere in Core today.** |
| Current portal | `portal.html` + `portal-config.js` (`NOVEX_MODULE_INFO`), unchanged in `social-b1`. Modules are flat entries in one JS object; no Brand Center entry exists yet. |

**Bottom line:** Social B1 got to `brand_kits`/`creative_profiles` first, with an approved, migration-backed schema and a real fixture-driven runtime shape. Brand Center B1 should **adopt and extend that schema**, not invent a parallel one. My own Flyer `BrandKit` never touched the database, so there is nothing there to reconcile at the schema level — only my JS module's shape needs to eventually consume the canonical record (future work, not now).

## 2. Overlap audit — the part that matters most

### 2a. Database level (real conflict risk if duplicated)

Codex's `0003_social_content_b1_schema.sql` already defines, extending `0001` cleanly (never duplicating `businesses`/`profiles`/`campaigns`/`assets`):

```
brand_kits (id, business_id, name, logo_asset_id, identity jsonb,
            writing_rules jsonb, is_default, timestamps)
creative_profiles (id, business_id, name, visual_preferences jsonb,
                    is_default, timestamps)
creative_profile_reference_assets (creative_profile_id, asset_id,
                                     position_order, notes)
```

Plus Social-specific tables that are **not** Brand Center's concern:
`social_content_campaigns`, `campaign_source_assets`, `creative_concepts`,
`platform_variants`.

**Recommendation: `brand_kits` and `creative_profiles` become the one
canonical shared pair, exactly as Codex defined them.** Brand Center B1
does not create `brand_center_kits`, `brand_profiles`, or any second
version. It becomes the **configuration UI and business-profile owner**
that reads/writes the same two tables Social (and later Flyer, Email,
WhatsApp, AI Receptionist) already reference.

### 2b. Runtime JS shape level (Codex's fixture data, `social-content-engine/data/fixtures.js`)

```js
brandKit: { name, logoText, primary, secondary, accent, background, ink,
            headingFont, bodyFont, tone, ctaRules, phone }
creativeProfile: { name, visualStyle, photographyStyle, textDensity,
                    logoPlacement, preferredCompositions, preferredBackgrounds,
                    avoidStyles, imageGenerationGuidance, referenceAssets }
```

Compared to my Flyer `brand-kit.js`:

```js
{ name, logoText, primaryColor, secondaryColor, accentColor, inkColor,
  headingFont, bodyFont, priceFont, categoryHeaderStyle, badgeStyle,
  priceStyle, borderStyle, footerStyle, storePhone, storeWebsite }
```

**Genuine overlaps** (same concept, different key names — trivial to
reconcile): name/logoText, primary/secondary/accent color, ink/background,
heading/body font.

**A real finding, not just naming:** Codex's `brandKit` fixture carries a
`phone` field. Phone number is Business Profile data (a Core `businesses`
fact), not brand identity — it doesn't belong inside `brand_kits.identity`
at all. **Brand Center should own `phone`/`email`/`address`/`website` on
`businesses`, and every engine (Social, Flyer, Email, WhatsApp,
Receptionist) should read it from there via `business_id`, never duplicate
it into their own brand-kit blob.** This is exactly the kind of drift the
Core-integration rule exists to prevent, and it's already happening once,
harmlessly, in a fixture. Worth fixing before more engines copy the
pattern.

**Flyer-specific fields that stay Flyer-specific:** `priceFont`,
`categoryHeaderStyle`, `badgeStyle`, `priceStyle`, `borderStyle`,
`footerStyle` are print/flyer rendering concerns, not general brand
identity — they don't belong in the canonical `brand_kits` shape either.
Flyer's renderer will eventually read canonical `brand_kits.identity` for
colors/fonts and layer its own flyer-specific styling on top, in its own
code, the same way Social's renderer layers Instagram-specific concerns
(hashtags, captions) on top of the same canonical brand kit.

### 2c. Resolution — canonical shape (additive only, no breaking change to Codex's schema)

Because `identity` and `writing_rules` are `jsonb`, extending the *contract*
(which keys the app code expects) requires **zero schema migration** —
just agreement on key names. Proposed canonical shape, reconciling all
three sources:

```
brand_kits.identity = {
  logoAssetId,      // mirrors the existing logo_asset_id column; kept in
                     // sync or the column is dropped in favor of this key
                     // -- a decision for whoever owns the migration
  primaryColor, secondaryColor, accentColor,
  headingFont, bodyFont,
  tagline            // NEW key, not in Codex's fixture yet -- requested
                     // by Brand Center's spec, additive
}

brand_kits.writing_rules = {
  tone,                    // Codex's existing field (Brand Voice: tone attributes)
  ctaRules,                // Codex's existing field (Brand Kit: default CTA rules)
  writingGuidance,         // NEW key -- Brand Kit: "basic writing guidance"
  preferredTerminology,    // NEW key, string[] -- Brand Voice
  prohibitedWording        // NEW key, string[] -- Brand Voice
}

creative_profiles.visual_preferences = {
  // unchanged from Codex's existing fixture shape -- already covers the
  // full Creative Profile spec:
  visualStyle, photographyStyle, textDensity, logoPlacement,
  preferredCompositions, preferredBackgrounds, avoidStyles,
  imageGenerationGuidance
}
// referenceAssets already has a real join table:
// creative_profile_reference_assets -- reused as-is, not duplicated.
```

**No new tables for Brand Kit, Brand Voice, or Creative Profile.** Brand
Voice is not a fourth table — it's additive keys inside `writing_rules`,
which already exists for exactly this purpose. This is the single biggest
risk this proposal avoids: a `brand_voices` table would have been a
duplicate concept sitting right next to `brand_kits.writing_rules`.

**Coordination needed, not resolved by me unilaterally:** the `phone`
removal from `brandKit` fixtures and the `tagline`/`writingGuidance`/
`preferredTerminology`/`prohibitedWording` key additions touch a schema
Codex owns. This proposal recommends them; it does not enact them. Before
Phase B (implementation), this needs a short explicit sync with whoever
owns `social-b1` merging back to `main` — either they adopt these key
names going forward, or Brand Center adapts to whatever they've already
shipped by the time it merges. **This is precisely why no migration SQL
is written in this document.**

## 3. Canonical shared data model

```
businesses (Core, EXTENDED by Brand Center — exclusively Brand Center's
            territory, zero overlap with Social's tables)
  + industry           text
  + website            text
  + description        text
  + phone              text
  + email              text
  + address            jsonb   -- {street, city, region, postal_code, country}
  + social_links       jsonb   -- {instagram, facebook, google_business, ...}

brand_kits (CANONICAL, owned jointly — Social B1 defined it, Brand Center
            B1 becomes its configuration surface, no new table)
  identity jsonb        -- see §2c
  writing_rules jsonb   -- see §2c
  logo_asset_id -> assets

creative_profiles (CANONICAL, same table Social B1 defined)
  visual_preferences jsonb  -- see §2c
creative_profile_reference_assets (reused as-is)

assets (Core, UNCHANGED schema — Brand Center is a management UI over it)
  type, tags, metadata jsonb already sufficient for "usage role" (see §5)
```

`businesses` extension is exclusively Brand Center's territory — Social B1
only ever reads `businesses.id` via foreign key, never writes to or extends
that table, so this is zero-conflict, safe to do independently.

## 4. Proposed Brand Center UX

Thin and functional, per instruction — no visual polish investment in B1.

```
Brand Center (new portal module)
├── Business Profile        (form: name, industry, website, description,
│                             phone, email, address, social links)
├── Brand Kit                (form: logo upload, primary/secondary/accent
│                             color pickers, heading/body font selects,
│                             tagline, default CTA rules, writing guidance)
├── Brand Voice              (form: tone attributes [tags/chips], preferred
│                             terminology [tag list], prohibited wording
│                             [tag list])
├── Creative Profile          (form: visual style, photography style, text
│                             density, preferred composition, preferred
│                             backgrounds, logo placement, styles to avoid,
│                             reference assets [picker from Asset Library])
└── Asset Library             (grid: upload, type filter, tag editor, usage
                              role — see §5)
```

One `businesses` row → one default `brand_kits` row → one default
`creative_profiles` row, editable in place (matches `is_default` boolean
already on both Codex tables — multiple named kits/profiles are supported
by the schema for later, B1 UI only needs to manage the default one).

Every field maps directly to an existing or newly-extended Core column —
no module-specific copies, satisfying "configure once, other engines
reference it."

## 5. Asset Library design (minimal, B1)

**No new table.** The existing Core `assets` table already has everything
B1 needs:

| Requested field | Existing column |
|---|---|
| asset type (logo/photograph/video) | `type` (currently `photo\|video\|menu_item\|document\|other` — B1 can launch using `photo`/`video` + a `"logo"` tag; adding a `logo` value to the check constraint is a trivial, low-risk follow-up if tagging proves insufficient, not required for B1) |
| tags | `tags text[]` — already exists |
| usage role | `tags` (e.g. `"role:logo"`, `"role:hero"`) for B1; a first-class `usage_role` column is a cheap future addition to `assets` (Core, exclusively Brand Center/Asset-Library territory, no Social overlap) if tags prove too loose |
| original asset remains immutable | Already the pattern established in both Flyer (`assets` rows are never mutated, only referenced) and Social (`campaign_source_assets` marks originals `role='primary'`, rendered outputs are new `assets` rows) — Brand Center follows the same convention, doesn't invent a new one |

B1 UI: upload → creates one `assets` row (`business_id`, `type`, `storage_path`, `tags`) → appears in a simple grid with tag editing and a "set as logo" action (writes `brand_kits.logo_asset_id`). No cropping, no background processing, no derivatives — that's the Flyer/Social B4-equivalent Asset Preparation Pipeline work, explicitly out of scope here too.

## 6. Future Website Brand Import architecture (not built in B1)

```
Website URL → Analyze → Proposed Brand Profile → Merchant Review → Save
```

Proposed shape for later (B2+), **no schema needed now**:
1. Merchant pastes a URL into a "Import from website" action in Brand
   Center.
2. A Netlify Function fetches the page (and maybe a couple of obvious
   subpages — About, Contact), extracts likely signals: `<title>`,
   meta description, dominant colors from the page's own CSS/logo image,
   visible phone/email/address (simple regex/DOM parsing), social links
   from footer `<a>` tags.
3. Optionally, Claude (server-side, same pattern as `chat.js`) normalizes
   the extracted signals into a structured draft matching the exact
   Business Profile / Brand Kit shape from §3 — this is the same
   "AI-assisted ingestion, never freeform generation" principle already
   established in the Flyer proposal (Revision 3 §11).
4. The draft is shown to the merchant as an editable form — **identical
   UI to manual configuration**, just pre-filled. Nothing saves until the
   merchant reviews and hits Save.
5. Save writes to the exact same `businesses`/`brand_kits` rows manual
   entry would have written to — the import path is a pre-fill mechanism,
   not a parallel data shape.

This needs no new tables and no B1 schema decisions — it's a future
ingestion path into the same canonical model. Not building step 2/3 now
per instruction (no crawling in B1 unless trivial, and a real fetch+parse
pipeline isn't trivial).

## 7. Exact B1 scope

**In scope:**
- `businesses` table extension (industry/website/description/phone/email/
  address/social_links) — migration written only after §2's coordination
  point is resolved.
- Thin Brand Center portal module: Business Profile, Brand Kit, Brand
  Voice, Creative Profile forms, Asset Library grid — manual configuration
  only, functional not polished.
- Reads/writes the canonical `brand_kits`/`creative_profiles` tables
  (Codex's schema), never a parallel version.
- "Set as logo" action wiring an uploaded asset to `brand_kits.logo_asset_id`.

**Explicitly out of scope for B1:**
- Website crawling/import (architecture only, §6).
- Asset Preparation Pipeline (background removal, cropping, quality
  scoring) — still B4-equivalent future work, unchanged from the Flyer
  proposal's stance.
- Any migration SQL — held until the overlap in §2c is actually
  coordinated with the `social-b1` side, not just proposed here.
- Portal visual polish.
- Refactoring Flyer's local `brand-kit.js` to consume the canonical record
  — real follow-up work, flagged, not done now (would touch flyer
  rendering, explicitly off-limits this round).

## 8. Files proposed to create/change (none touched yet)

| File | Change |
|---|---|
| `docs/NOVEX_BRAND_CENTER.md` | This document (already created) |
| `supabase/migrations/0004_brand_center_schema.sql` | **NOT YET WRITTEN.** Would contain only the `businesses` ALTER TABLE (industry/website/description/phone/email/address/social_links) — deliberately numbered *after* Codex's `0003`, touches zero tables Social B1 owns. Written only once §2c's coordination happens. |
| `brand-center.html` (or similar, new file) | New thin portal module UI, following the existing pattern of one HTML file per module (matches `reactivation_demo.html`, `qualification_demo.html`, etc.) |
| `portal-config.js` | One new `NOVEX_MODULE_INFO` entry (`"brand-center": {...}`) — see §9 for merge-conflict handling |
| `portal.html` | Not touched — modules render generically from `NOVEX_MODULE_INFO`, no per-module code lives here |

Nothing in `flyer-engine/`, nothing in `social-content-engine/`, nothing in
the `social-b1` worktree.

## 9. Merge-conflict risks with the Social worktree

| Risk | Assessment |
|---|---|
| `supabase/migrations/` file numbering | Low risk — Brand Center's migration (if/when written) is a new file (`0004_...`), Social's is already `0003_...`. Different files never conflict. Only risk is both sides claiming `0004` independently before merging; noted here so whoever merges second just renumbers. |
| `portal-config.js` | Low-moderate risk — both Brand Center and (eventually) Social B2 will want to add an entry to the same `NOVEX_MODULE_INFO` object. Git merges non-overlapping line insertions in the same file automatically in the common case; risk rises only if both insert at the exact same line. Mitigation: add the new entry at the end of the object, in its own commit, minimal surrounding diff. |
| `businesses` table | Zero risk — Social B1 never writes to or extends this table, confirmed by reading `0003`'s migration (only ever references `businesses(id)` as a foreign key). |
| `brand_kits`/`creative_profiles` shape (jsonb key names) | The real coordination point (§2c) — not a Git merge conflict (jsonb has no schema to conflict over), but an **application-level contract conflict** if Brand Center's UI writes keys Social's renderer doesn't expect, or vice versa. This is why §2c's key names are a proposal, not a decision — needs a real sync before Phase B, not just a merge. |
| `docs/NOVEX_SYSTEM_ARCHITECTURE.md`, `NOVEX_RETAIL_CONTENT_ENGINE.md` | Confirmed byte-identical between `main` and `social-b1` right now — zero risk today. Both sides should keep edits to these files rare and additive. |

Nothing else in the repo is shared surface between the two workstreams today.

## Strategic note

Once Brand Center, Social, and Flyer all exist and share the same
`businesses`/`brand_kits`/`creative_profiles`/`assets` rows, a merchant's
one-time setup genuinely drives three previously-isolated demos — this is
the first point where "the Novex Growth System" becomes a real, load-
bearing claim rather than a documented aspiration.

---

Stopping here, as instructed. No migration SQL written. No portal files
changed. Waiting for approval and for the `social-b1` coordination point
in §2c before Phase B.
