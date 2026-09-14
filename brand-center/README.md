# Novex Brand Center — B1

Shared customer configuration infrastructure, not a marketing-generation
engine. Full architecture/decisions: [`../docs/NOVEX_BRAND_CENTER.md`](../docs/NOVEX_BRAND_CENTER.md).

**Canonical models:** `brand_kits` and `creative_profiles` are Social B1's
design (`supabase/migrations/0003_social_content_b1_schema.sql`, currently
on the `social-b1` worktree, not yet merged to `main`). This directory does
**not** define a competing schema — it defines and validates the
*application-level contract* (the shape of those tables' jsonb columns)
that Brand Center, Flyer, and Social all need to agree on.

**No SQL migration exists here.** The `businesses` table extension
(industry/website/phone/email/address/social_links) and any
`brand_kits`/`creative_profiles` key additions are held until `0003` lands
in `main`'s migration history, per the approved migration-coordination
decision. This directory is domain/UI code, built against the documented
contract in the meantime.

## Structure

```
brand-center/
  schemas/
    business-profile.schema.js   -- Core `businesses` extension shape (proposed columns, not yet migrated)
    brand-kit.schema.js           -- brand_kits.identity / .writing_rules jsonb contract, versioned + validated
    creative-profile.schema.js    -- creative_profiles.visual_preferences jsonb contract, versioned + validated
    asset-contract.schema.js      -- shared asset metadata shape (roles/tags/source/derivatives), lives in Core assets.metadata jsonb
  data/
    sample-brand-center.js        -- fully-populated demo record used by brand-center.html
```

Each schema file is written UMD-lite (`module.exports` for Node,
`window.NovexBrandCenter.X` for a plain `<script>` tag) so the same file
works whether a future Node-based engine (Flyer, Social) `require()`s it,
or the static portal page loads it directly with no build step.

## Why versioned jsonb, not a junk drawer

Every stored blob carries its own `schemaVersion`. `validate*()` functions
reject unknown keys and mismatched versions rather than silently accepting
whatever shape a given module happens to write — this is the direct fix
for "six months from now we'll have `primaryColor` / `primary_color` /
`mainColor` / `brandPrimary` depending on which module wrote it."

## Portal module

[`../brand-center.html`](../brand-center.html) is the actual B1 UI —
Business Profile, Brand Kit, Brand Voice, multiple named Creative
Profiles, and a minimal Asset Library grid. Backed by `localStorage` under
demo mode (same pattern `portal.html` already uses everywhere else) — a
real Supabase-backed save is a drop-in swap once `0003` lands and the
`businesses` extension migration is written, because the record shape
saved to `localStorage` already matches the canonical contract exactly.

Functional, not polished, per scope.
