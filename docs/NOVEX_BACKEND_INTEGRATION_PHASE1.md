# Novex Backend Integration — Phase 1 Plan

**Status: PROPOSAL ONLY. Before implementation.** No migration file, no
application code change, no Social/Flyer/portal file has been committed.
This is the exact migrations, exact code changes, and deployment sequence
requested for approval — nothing here executes until approved, and even
once approved, the migrations cannot be *applied* until a real Supabase
project exists (still not provisioned — see §5).

Scope, per instruction: only the non-destructive foundation moving Brand
Center and Campaign Center from localStorage toward canonical Core
persistence. **`0007` and any destructive Social cleanup are explicitly
excluded**, as is the `0006` backfill itself — that step touches Social's
data and belongs with Social's own migration, not this phase.

## 0. A live instance of the exact risk this process exists to catch

Since the Readiness Audit, two new worktrees appeared:
`social-b2` (branched from `social-b1`, adds
`0004_social_b2_platform_variants.sql`) and `flyer-b1-2` (branched
cleanly from current `main`, zero schema changes — confirmed by diff,
no concern). **Social B2 already claimed migration number `0004`** for
its own purposes (extending `social_content_campaigns` with
`campaign_plan`/`campaign_plan_version`, and `platform_variants` with
Facebook/LinkedIn support and several platform-rendering fields) —
unrelated to Brand Center, no field-ownership conflict with anything in
this plan, but it does mean **the numbering this plan previously implied
(Brand Center = `0004`) is now wrong.**

This is exactly the scenario the migration-coordination discipline was
built for, now real instead of hypothetical: two workstreams independently
reaching for the next sequential number. Renumbered below accordingly —
**provisionally, pending actual merge order**, which is not decided by
this document.

One more fact from that inspection, worth stating plainly: **Social B2's
`platform_recommendations` now exist** (inside `social_content_campaigns.campaign_plan`
jsonb) — the item the prior audit correctly reported as "does not exist
yet" is no longer accurate as of this check. Noted for completeness; it
doesn't change anything in this phase's scope.

## 1. Exact migrations (drafted, not yet committed as files)

Both are written in full below so their exact content can be approved.
They will be committed as real `.sql` files under `supabase/migrations/`
only once Social's chain (`0003` + `0004`) actually lands on `main` —
per the standing rule from Brand Center/Campaign Center's approval, which
this phase does not relax. Numbers below (`0005`, `0006`) assume that
chain lands as two files; if it lands differently, renumber at commit
time, not now.

### `0005_brand_center_business_profile.sql` (provisional number)

```sql
-- Brand Center: Business Profile fields on Core `businesses`, plus the
-- RLS fix found during the Core Integration Readiness Audit (SELECT-only
-- policy existed; Brand Center's entire purpose requires UPDATE too).

alter table businesses
  add column if not exists industry      text,
  add column if not exists website       text,
  add column if not exists description   text,
  add column if not exists phone         text,
  add column if not exists email         text,
  add column if not exists address       jsonb not null default '{}',
  add column if not exists social_links  jsonb not null default '{}';

-- RLS fix: businesses previously had SELECT only (businesses_own, 0001).
-- Brand Center needs to let a merchant edit their own row.
create policy businesses_update_own on businesses
  for update using (id in (select business_id from profiles where id = auth.uid()))
  with check (id in (select business_id from profiles where id = auth.uid()));

-- INSERT (new-business creation / onboarding) is deliberately NOT added
-- here -- see "Explicitly out of scope" below. Every business row this
-- phase touches already exists.
```

### `0006_campaign_center_campaigns_extension.sql` (provisional number)

```sql
-- Campaign Center: generic campaign-intent fields on Core `campaigns`.
-- No RLS change needed -- campaigns_tenant (0001) already grants full
-- CRUD to the owning business, confirmed in the Readiness Audit.

alter table campaigns
  add column if not exists title                text,
  add column if not exists objective             text,
  add column if not exists offer                 text,
  add column if not exists audience              text,
  add column if not exists start_date            date,
  add column if not exists end_date              date,
  add column if not exists brand_kit_id          uuid references brand_kits(id) on delete set null,
  add column if not exists creative_profile_id   uuid references creative_profiles(id) on delete set null,
  add column if not exists notes                 text;
```

Both use `add column if not exists` — idempotent, safe to re-run,
consistent with the rollback-risk guidance from the Readiness Audit
(§8: additive extensions are low-risk and cleanly reversible via `DROP
COLUMN` if ever needed).

**Explicitly out of scope, staying out even in this phase:**
- No `businesses` INSERT policy / new-business onboarding flow — every
  row this phase touches already exists (the single demo business).
  Onboarding a brand-new business is a separate, later concern (ties into
  the still-unbuilt Website Brand Import flow), not "moving existing
  config to persistence."
- No changes to `social_content_campaigns`, `campaign_source_assets`, or
  any Social/Flyer table.
- No `0007`, no column drops, nothing destructive.

## 2. Exact application code changes

Both `brand-center.html` and `campaign-center.html` currently read/write
`localStorage` directly. The change is a **data-access layer with the
identical dual-mode pattern `portal.html` already uses for `isDemoMode`**
— not a rewrite of either module's UI or validation logic, which stays
exactly as built and tested.

New files:

```
brand-center/data-access.js
campaign-center/data-access.js
```

Each exposes the same function names the `.html` files already call
(`loadState`/`saveState` equivalents), switching internally:

```js
// brand-center/data-access.js (shape, not final code)
function isBackendConfigured() {
  var cfg = window.NOVEX_PORTAL_CONFIG;
  return cfg && cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf('PASTE_') !== 0;
}

async function loadBrandCenterState(businessId) {
  if (!isBackendConfigured()) return loadFromLocalStorage(); // exact current behavior, unchanged
  var supabase = getSupabaseClient(); // window.supabase.createClient(...), same pattern as portal-login.html
  var [business, brandKit, profiles, assets] = await Promise.all([
    supabase.from('businesses').select('*').eq('id', businessId).single(),
    supabase.from('brand_kits').select('*').eq('business_id', businessId).eq('is_default', true).maybeSingle(),
    supabase.from('creative_profiles').select('*').eq('business_id', businessId),
    supabase.from('assets').select('*').eq('business_id', businessId),
  ]);
  return mapRowsToStateShape(business.data, brandKit.data, profiles.data, assets.data); // returns the SAME shape brand-center.html already renders
}

async function saveBusinessProfile(businessId, profile) {
  NBC.BusinessProfile.validateBusinessProfile(profile); // same validator, unchanged
  if (!isBackendConfigured()) return saveToLocalStorage();
  return supabase.from('businesses').update(toBusinessRow(profile)).eq('id', businessId);
}
// saveBrandKit / saveCreativeProfile / asset upload follow the same shape:
// validate with the existing schema module, then either localStorage or
// a Supabase call, never both, never a third shape.
```

`campaign-center/data-access.js` mirrors this exactly for `campaigns` +
`campaign_source_assets`, reading Brand Center's data the same way it
already does today (a cross-module read — currently a shared
`localStorage` key, becomes a shared `business_id` query).

**Why this is safe to write and commit before a Supabase project exists:**
the `isBackendConfigured()` branch means the localStorage path — the
one actually exercised by anything running today — is untouched and
stays exactly as tested in Brand Center/Campaign Center B1. The
Supabase branch is new code with no live path to execute yet; it will
be verified against a real project as its own explicit step (§4), not
assumed correct from code review alone.

**What does NOT change:** `brand-center/schemas/*.js`,
`campaign-center/schemas/*.js`, and every `validate*()` function —
those were deliberately designed to match the canonical column/jsonb
shape from day one, which is exactly what makes this swap a data-access
change only, not a redesign.

## 3. Deployment sequence

```
1. Social's 0003 (+ 0004, however that chain actually lands) → main
   -- external, not this phase's work, blocks everything below.

2. THIS PHASE, once (1) is done and numbers are confirmed:
   a. Commit 0005 (businesses extension + RLS fix) and 0006 (campaigns
      extension) as real files under supabase/migrations/.
   b. Commit brand-center/data-access.js and campaign-center/data-access.js,
      wired into brand-center.html / campaign-center.html behind the
      isBackendConfigured() check -- localStorage path unaffected,
      re-verify with the same manual browser pass used for B1 (tab
      switching, save/validate, cross-module read) to confirm zero
      regression in demo mode.

3. SEPARATE, NOT PART OF THIS PHASE: provisioning an actual Supabase
   project and pasting SUPABASE_URL/SUPABASE_ANON_KEY into
   portal-config.js. This is what actually applies 0005/0006 and flips
   isBackendConfigured() to true anywhere. Per the Readiness Audit §9,
   this deserves its own explicit decision tied to a real trigger (a
   pilot merchant), not bundled into this phase automatically -- flagging
   it here as the actual point nothing in §1/§2 can be *exercised* live
   until it happens, not asking to skip it.

4. Once (3) happens: manually verify Brand Center/Campaign Center against
   the real project (create a business, save a Brand Kit, create a
   campaign, confirm RLS blocks a second business's data) before calling
   Phase 1 complete.
```

Steps 1 and 3 are outside this phase's authority — step 1 is Social's,
step 3 is a separate infrastructure decision. This phase is step 2 only.

## 4. Explicitly reconfirmed exclusions

- No `0006`-Social-backfill, no `0007`, no Social application-code
  changes, no `social_content_campaigns` touch of any kind.
- No Flyer file touched (`flyer-b1-2`'s work confirmed independent —
  zero schema drift, diffed against `main`).
- No Supabase project provisioned by this phase.
- No new-business onboarding flow / `businesses` INSERT policy.

Stopping here, as instructed, for approval before any file in §1/§2 is
actually committed.
