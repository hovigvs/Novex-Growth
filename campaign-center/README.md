# Novex Campaign Center — B1

The shared campaign-intent layer — "what is this merchant trying to
promote" — not a generation engine. Full architecture:
[`../docs/NOVEX_CAMPAIGN_CENTER.md`](../docs/NOVEX_CAMPAIGN_CENTER.md).

**Canonical model:** generic campaign intent (title/objective/offer/
audience/dates/Brand Kit/Creative Profile/notes) belongs on Core
`campaigns` (extended). This directory does not define a new campaign
table — `campaign.schema.js` defines and validates the *application-level
contract* for that extension, the same pattern `brand-center/schemas/`
uses for `brand_kits`/`creative_profiles`.

**No SQL migration exists here.** The `campaigns` extension has a real
foreign-key dependency on `brand_kits`/`creative_profiles` existing, which
depends on `0003_social_content_b1_schema.sql` landing in `main` first —
see the architecture doc's migration-dependency section. This directory is
domain/UI code built against the documented contract, backed by
localStorage (demo mode, same as `brand-center.html` and the rest of the
portal).

## Locked decisions this implementation respects

- Generic intent lives on `campaigns`, never duplicated into a
  channel-specific table — `campaign.schema.js`'s `validateCampaign()`
  rejects unknown keys, the same drift guard `brand-kit.schema.js` uses.
- `campaign_source_assets` (already defined by Social B1) is the reused
  shape for `sourceAssetIds` — modeled here as a plain id array for the
  demo UI, not a new table.
- Output channels (Social/Flyer/Email/WhatsApp/Website) are rendered as
  informational, disabled tiles only — `campaign-center.html` contains no
  code path that calls any generation engine.
- The eventual Social-side cleanup (`social_content_campaigns` dropping
  its duplicate `title`/`objective`/`offer`/`brand_kit_id`/
  `creative_profile_id` columns) is a staged, non-destructive migration on
  Social's side — *backfill Core → switch reads/writes → verify → remove
  duplicates later* — not performed here, and not a dependency of this B1.

## Structure

```
campaign-center/
  schemas/
    campaign.schema.js    -- campaigns extension contract, versioned + validated
  data/
    sample-campaigns.js   -- demo campaigns, reference Brand Center's sample Creative Profile ids
```

## Portal module

[`../campaign-center.html`](../campaign-center.html) reads Brand Center's
live `localStorage` record directly (`novex_brand_center_demo_business`)
for its Brand Kit / Creative Profile / Asset pickers — not a copied
snapshot. Creating a Brand Kit change in Brand Center and reopening
Campaign Center shows the update immediately, which is the concrete,
demo-mode proof that "configure once, every engine reads from here"
actually holds together before any real backend exists.
