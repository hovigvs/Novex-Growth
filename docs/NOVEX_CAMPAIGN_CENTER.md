# Novex Campaign Center — Architecture Proposal (B1)

**Status: PROPOSAL ONLY. Not implemented. No migration SQL, no new files
beyond this document.** Nothing in `main`, `brand-center/`, `flyer-engine/`,
or the `social-b1` worktree has been touched. This is the audit + proposal
requested before coding — stopping for approval, same pattern as Brand
Center B1's first round.

This is shared campaign-intent infrastructure — the object that answers
"what is this merchant trying to promote," not a generation engine. It
extends [`NOVEX_SYSTEM_ARCHITECTURE.md`](NOVEX_SYSTEM_ARCHITECTURE.md)
(Core) and [`NOVEX_BRAND_CENTER.md`](NOVEX_BRAND_CENTER.md) (approved),
and audits the same two peer workstreams Brand Center did: Flyer
(`0002_flyer_engine_schema.sql`, `main`) and Social
(`0003_social_content_b1_schema.sql`, `social-b1` worktree, one hardening
commit since last audited — checked, no schema changes in it).

## 1. Audit of current Core campaign schema

`campaigns` (`0001_core_schema.sql`, live on `main`):

```
campaigns
  id              uuid
  business_id     uuid -> businesses
  type            text          -- free text, no check constraint
  target_segment  jsonb          -- structured audience/segment data, unused by either Flyer or Social today
  status          text          -- draft | scheduled | active | completed | archived
  created_at / updated_at
```

That's the entire shape. **No title, objective, offer, audience (as a
simple field), dates, notes, or brand/creative-profile selection exist
anywhere in Core today.** Every field the user needs to type when creating
a campaign is currently missing from the one table that's supposed to
represent it.

## 2. Overlap with Social/Flyer campaign extensions

**Flyer (`0002`, `main`) — no overlap.** `campaign_products` is a
per-product row within a campaign (price snapshot, merchandising
constraints, score) — it has no campaign-level intent fields. `generated_documents`/`document_pages`/`layout_instances`/`page_archetypes`
are output-structure tables, also no overlap. Flyer references
`campaigns(id)` as a foreign key and never extends it. Nothing here needs
to change.

**Social (`0003`, `social-b1` worktree) — real, direct overlap, the
important finding this round:**

```
social_content_campaigns
  campaign_id             uuid  PK, FK -> campaigns(id)
  business_id             uuid
  title                   text   ⚠ duplicates what Campaign Center needs on campaigns
  objective               text   ⚠ same
  offer                   text   ⚠ same
  brief                   text   -- Social-specific: raw input to concept generation, not generic
  brand_kit_id            uuid -> brand_kits   ⚠ duplicates what Campaign Center needs on campaigns
  creative_profile_id     uuid -> creative_profiles   ⚠ same
  workflow_status         text   -- Social-specific (draft/analyzing/concepts_ready/.../approved/failed)
  selected_concept_id     uuid -> creative_concepts   -- Social-specific
  approved_by_profile_id  uuid -> profiles   -- Social-specific
  approved_at             timestamptz   -- Social-specific
```

`title`, `objective`, `offer`, `brand_kit_id`, and `creative_profile_id`
are exactly the generic campaign-intent fields this assignment asks
Campaign Center to own — Social B1 already built its own copy of them,
one layer down, before Campaign Center existed to own the canonical one.
This is precisely the pattern the last two audits were trying to prevent,
now caught a second time instead of a first.

**`campaign_source_assets` (also in `0003`) — no overlap, good news.**
It's already a generic join table (`campaign_id` FK straight to `campaigns`,
not to `social_content_campaigns`; `asset_id`, `role`, `position_order`,
`merchant_notes`). This is already exactly "selected source assets" —
Campaign Center should reuse it as-is, the same way Brand Center reused
`brand_kits`/`creative_profiles` rather than inventing a parallel version.

## 3. Canonical campaign field ownership

**Core `campaigns` (extended, Campaign Center's territory):**

```
+ title                text
+ objective             text
+ offer                 text
+ audience              text      -- simple free text for B1, deliberately
                                      NOT the same thing as the existing
                                      target_segment jsonb (see note below)
+ start_date            date
+ end_date              date
+ brand_kit_id          uuid -> brand_kits
+ creative_profile_id   uuid -> creative_profiles
+ notes                 text
```

`status` and `type` already exist and are reused as-is — `status` already
covers "lifecycle status" from the request. `target_segment jsonb` is left
alone, untouched, reserved for a real future segment-builder (rule-based
targeting) rather than conflated with the simple free-text `audience`
field B1 needs — this is a deliberate decision, not an oversight, flagged
for your confirmation like the other field-ownership calls.

**`campaign_source_assets` — reused exactly as `0003` defined it.** No
changes.

**`social_content_campaigns` — needs trimming, not by Campaign Center.**
Once `campaigns` carries `title`/`objective`/`offer`/`brand_kit_id`/
`creative_profile_id`, `social_content_campaigns` should drop those five
columns and read them from its own `campaign_id` → `campaigns` join
instead. **This is a Social-side migration, flagged here for Social B2,
not enacted by Campaign Center.** Exactly the same shape of finding as
Brand Center's `brandKit.phone` issue — recognized, not fixed
unilaterally.

**Flyer's tables — untouched, no ownership change.**

## 4. Proposed Campaign Center UX

```
Create Campaign
  → Define Goal / Offer / Audience    (title, objective, offer, audience, dates)
  → Select Brand Kit + Creative Profile   (reads Brand Center's records directly —
                                            in B1's demo mode, the same localStorage
                                            record Brand Center already writes)
  → Select Source Assets                  (reads Brand Center's Asset Library —
                                            same shared assets, not a new picker)
  → Notes
  → Review
  → Save
```

Below the form, an **Output Channels** section lists Social / Flyer /
Email / WhatsApp / Website as informational tiles — **all disabled in
B1**, regardless of whether a real engine exists for that channel already
(Flyer and Social both exist as separate Node subprojects with no callable
integration from a static portal page yet, so "safe to call" is false for
all five today, not just the unbuilt ones). Each tile can show a one-line
status like "Flyer engine exists (B1.1) — orchestration not wired yet" so
the UI is honest about what's real versus planned, without implying a
click would do anything.

This is the concrete proof that "configure once" actually works even in
demo mode: Campaign Center's picker reads the exact same `localStorage`
record Brand Center writes, so a Brand Kit created in one module shows up
live in the other — no separate copy, no re-entry.

## 5. Exact B1 scope

**In scope:**
- Campaign creation/list/edit UI following the flow above.
- Reads Brand Center's existing demo-mode record for Brand Kit / Creative
  Profile / Asset pickers — does not duplicate that data.
- Versioned, validated schema for the campaign-intent shape (matching
  Brand Center's `schemaVersion` + `validate*()` pattern), since this is
  exactly the kind of structured object that needs the same discipline.
- Output Channels section, informational/disabled only.
- `campaigns` table extension — **documented here, migration not written**
  (see §7).

**Explicitly out of scope, per instruction:** publishing, scheduling,
analytics, billing, CRM, campaign automation, any output generation.
Trimming `social_content_campaigns` (Social's follow-up, not this
module's).

## 6. Files proposed to create/change (none created yet)

| File | Purpose |
|---|---|
| `docs/NOVEX_CAMPAIGN_CENTER.md` | This document (already created) |
| `campaign-center/schemas/campaign.schema.js` | Versioned/validated shape for the `campaigns` extension fields |
| `campaign-center/data/sample-campaigns.js` | Demo record(s), consistent with Brand Center's/Flyer's sample-data pattern |
| `campaign-center/README.md` | Same structure/rationale documentation as `brand-center/README.md` |
| `campaign-center.html` | The portal module UI |
| `portal-config.js` | One new `NOVEX_MODULE_INFO` entry, appended at the end (same low-conflict placement used for Brand Center) |
| `supabase/migrations/000X_campaign_center_schema.sql` | **NOT written yet** — see §7 for why |

## 7. Migration dependencies/conflicts

- The `campaigns` extension's `brand_kit_id`/`creative_profile_id` columns
  are foreign keys into `brand_kits`/`creative_profiles` — tables that
  **only exist in `0003`, still unmerged into `main`.** This migration
  cannot be written and applied independently of that landing, for the
  same reason Brand Center's `businesses` extension held: the schema
  history must stay linear, and this dependency is even more direct here
  (an actual FK, not just a shared concept).
- Recommended eventual sequencing, once each prior step lands:
  `0003` (Social, external) → Brand Center's `businesses`
  extension + finalized `brand_kits`/`creative_profiles` keys → Campaign
  Center's `campaigns` extension (needs the FK targets to exist). Three
  linear steps, not written until each prior one is real.
- **No conflict with Flyer.** `campaign_products`/`generated_documents`
  reference `campaigns(id)` only and need no changes for this extension to
  land.
- **The `social_content_campaigns` trim is a separate, Social-owned
  migration**, sequenced whenever Social B2 picks it up — not a blocker
  for Campaign Center B1's UI/domain code, which only needs the
  *documented* canonical shape to build against (same as Brand Center's
  approach), not the live column.

Stopping here, as instructed. Waiting for approval before writing any
code.
