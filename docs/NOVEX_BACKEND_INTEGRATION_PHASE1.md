# Novex Backend Integration — Phase 1 Plan

**Status: APPROVED with additions, gated on Social's migration chain
landing on `main`. Checked just now — not yet landed.** `main` still
carries only `0001`/`0002`; `social-b1`/`social-b2` remain unmerged
worktrees. **Implementation has not started.** No migration file,
application code change, or Social/Flyer/portal file has been committed.
Per the approval's own final instruction — "proceed with implementation
only after confirming the upstream Social migration chain has been merged
... and assigning migration numbers from the canonical branch at that
time" — this plan holds here until that check passes.

Scope, per instruction: only the non-destructive foundation moving Core
Business Profile, Brand Center, Core Campaign, and Campaign Center
persistence from localStorage toward canonical Core persistence, plus
required non-destructive RLS support and demo/localStorage compatibility.

## Approved additions (locked in)

1. **Migration numbers are assigned at implementation/merge time, not
   reserved now.** `0005`/`0006` below are illustrative only. Before
   committing any migration file, inspect the canonical branch and assign
   the next available sequential numbers after all upstream Social
   migrations have actually landed. The logical dependency order
   (businesses extension → campaigns extension, both after Social's
   chain) is what's fixed, not the digits.
2. **`campaign_plan`/`campaign_plan_version` stay Social-owned.** They are
   Social B2 platform-planning state, not a Core `campaigns` concept and
   not something this phase reads, writes, or promotes. Cross-channel
   recommendation ownership is a future, separately-approved integration
   — explicitly not decided or advanced by Phase 1.
3. **Validation runs on both persistence paths, in both directions** —
   see the corrected §2 below: every Supabase read maps through the same
   `validate*()` a localStorage read would, before the UI ever sees it;
   every write validates before persistence, on either path. The Supabase
   branch never bypasses schema/version/unknown-key checks the
   localStorage branch already enforces.
4. **No silent fallback after a configured backend fails.** Dual-mode is
   a configuration switch, decided once via `isBackendConfigured()` — not
   a per-operation "try backend, fall back to localStorage on error"
   pattern. If the backend is configured and a call fails (RLS denial,
   network, validation, persistence error), that failure surfaces to the
   user as an error. It is never swallowed by silently writing the same
   change to `localStorage` and reporting success — that would make a
   real failure look like a save, which is worse than no save at all.
5. **Scope is locked exactly as listed** — restated precisely below,
   replacing the prior looser phrasing.

### Locked scope

**Included:** Core Business Profile persistence, Brand Center
persistence, Core Campaign persistence, Campaign Center persistence,
required non-destructive RLS support, demo/localStorage compatibility.

**Excluded:** Social backfill, duplicate-column removal, destructive
migrations, Supabase project provisioning, onboarding/business INSERT
flow, Flyer changes, Social changes, recommendation-layer promotion into
Core.

## 0. A live instance of the exact risk this process exists to catch

Since the Readiness Audit, two new worktrees appeared: `social-b2`
(branched from `social-b1`, adds `0004_social_b2_platform_variants.sql`)
and `flyer-b1-2` (branched cleanly from current `main`, zero schema
changes — confirmed by diff, no concern). Social B2 already claimed
migration number `0004` — extending `social_content_campaigns` with
`campaign_plan`/`campaign_plan_version` (addition #2 above: staying
Social-owned) and `platform_variants` with Facebook/LinkedIn support and
platform-rendering fields. No field-ownership conflict with anything in
this plan, but it did invalidate this plan's previously-assumed numbering
— which is exactly why addition #1 above replaces fixed numbers with a
rule: assign at merge time, from whatever the canonical branch actually
looks like then. Recorded here as confirmation the checkpoint worked, not
as a problem needing more fixing.

## 1. Exact migrations (drafted, not yet committed as files)

Content is fixed and approved for review; **filenames/numbers are not** —
per addition #1, real numbers get assigned by inspecting the canonical
branch once Social's chain lands, not decided in this document.

### `NNNN_brand_center_business_profile.sql` (number TBD at merge time)

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
-- here -- locked out of scope. Every business row this phase touches
-- already exists.
```

### `NNNN_campaign_center_campaigns_extension.sql` (number TBD at merge time)

```sql
-- Campaign Center: generic campaign-intent fields on Core `campaigns`.
-- No RLS change needed -- campaigns_tenant (0001) already grants full
-- CRUD to the owning business, confirmed in the Readiness Audit.
--
-- Deliberately does NOT touch social_content_campaigns.campaign_plan /
-- campaign_plan_version (Social B2, stays Social-owned -- addition #2).

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
consistent with the Readiness Audit's rollback guidance (§8: additive
extensions are low-risk, cleanly reversible via `DROP COLUMN`).

## 2. Exact application code changes (corrected per additions #3/#4)

New files, one per module:

```
brand-center/data-access.js
campaign-center/data-access.js
```

`isBackendConfigured()` is checked **once**, not per call — dual-mode is
a configuration state, not a per-operation retry/fallback:

```js
function isBackendConfigured() {
  var cfg = window.NOVEX_PORTAL_CONFIG;
  return cfg && cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf('PASTE_') !== 0;
}
```

**Read path — validates before the UI ever sees the data, on either
branch (addition #3):**

```js
async function loadBrandCenterState(businessId) {
  var raw;
  if (!isBackendConfigured()) {
    raw = loadFromLocalStorage(); // exact current behavior, unchanged
  } else {
    var supabase = getSupabaseClient(); // same pattern as portal-login.html
    var [business, brandKit, profiles, assets] = await Promise.all([
      supabase.from('businesses').select('*').eq('id', businessId).single(),
      supabase.from('brand_kits').select('*').eq('business_id', businessId).eq('is_default', true).maybeSingle(),
      supabase.from('creative_profiles').select('*').eq('business_id', businessId),
      supabase.from('assets').select('*').eq('business_id', businessId),
    ]);
    // Addition #4: a configured backend's error surfaces -- it is never
    // swallowed into an empty/default state that looks like success.
    var firstError = business.error || brandKit.error || profiles.error || assets.error;
    if (firstError) throw new BackendError(firstError);
    raw = mapRowsToStateShape(business.data, brandKit.data, profiles.data, assets.data);
  }
  // Addition #3: validate on the way IN too, not just on save. A row
  // that fails validate*() here is a data problem to surface, not paper
  // over -- same unknown-key/schema-version rejection either path takes
  // on write.
  NBC.BusinessProfile.validateBusinessProfile(raw.businessProfile);
  NBC.BrandKit.validateIdentity(raw.identity);
  NBC.BrandKit.validateWritingRules(raw.writingRules);
  raw.creativeProfiles.forEach(function (p) { NBC.CreativeProfile.validateVisualPreferences(p.visualPreferences); });
  return raw;
}
```

**Write path — validates before persistence, on either branch, and never
falls back silently on a configured-backend failure (addition #4):**

```js
async function saveBusinessProfile(businessId, profile) {
  NBC.BusinessProfile.validateBusinessProfile(profile); // same validator, unchanged, runs first either way
  if (!isBackendConfigured()) return saveToLocalStorage();
  var result = await supabase.from('businesses').update(toBusinessRow(profile)).eq('id', businessId);
  if (result.error) throw new BackendError(result.error); // surfaced to the UI's existing flash()-style error path, not swallowed
  return result;
}
// saveBrandKit / saveCreativeProfile / asset upload follow the identical
// shape: validate, then exactly one of {localStorage, Supabase} --
// never both, never a silent downgrade from one to the other on failure.
```

`BackendError` is a thin wrapper so `brand-center.html`'s existing
`flash('msg-...', false, e.message)` error-display path (already built
and tested in B1) renders it exactly like today's validation errors —
no new UI pattern needed, just a new error source feeding the same
display.

`campaign-center/data-access.js` mirrors this exactly for `campaigns` +
`campaign_source_assets`, including the read-side validation and the
same no-silent-fallback rule, and continues reading Brand Center's data
the same way it does today (currently a shared `localStorage` key,
becomes a shared `business_id` query — same cross-module principle,
different transport).

**What does NOT change:** `brand-center/schemas/*.js`,
`campaign-center/schemas/*.js`, and every `validate*()` function — those
were built to match the canonical shape from day one, which is what
makes this swap a data-access change only, not a redesign, and what makes
addition #3 straightforward to satisfy (the validators already exist,
this just calls them on both sides of both paths instead of one).

## 3. Deployment sequence

```
1. Social's chain lands on `main` (external, blocks everything below).
   -- Checked at the top of this document: not yet true.

2. At that point, and not before: inspect the canonical branch, assign
   the next available sequential migration numbers (addition #1) to the
   two files in §1, and commit them as real files under
   supabase/migrations/.

3. Commit brand-center/data-access.js and campaign-center/data-access.js,
   wired in behind isBackendConfigured(). Re-verify the localStorage path
   with the same manual browser pass used for B1 (tab switching,
   save/validate, cross-module read) to confirm zero regression in demo
   mode -- this path must still work exactly as before for as long as no
   backend is configured.

4. SEPARATE, NOT PART OF THIS PHASE: provisioning an actual Supabase
   project and pasting SUPABASE_URL/SUPABASE_ANON_KEY into
   portal-config.js -- excluded per locked scope. This is what actually
   applies the migrations and flips isBackendConfigured() to true
   anywhere; it deserves its own decision tied to a real trigger, not
   bundled here.

5. Once (4) happens, separately: manually verify against the real
   project (create/edit a business, save a Brand Kit, create a campaign,
   confirm RLS blocks a second business's data, deliberately trigger a
   failure -- e.g. a bad RLS grant -- and confirm it surfaces as an error
   rather than silently succeeding into localStorage) before calling
   Phase 1 complete.
```

Step 1 is Social's, step 4 is a separate infrastructure decision — this
phase is steps 2-3, with step 5 as its own later verification once step 4
happens.

## 4. Reconfirmed exclusions (matches the locked scope above)

Social backfill, duplicate-column removal, any destructive migration,
Supabase project provisioning, onboarding/business INSERT flow, any
Flyer file, any Social file, and promoting `campaign_plan`/platform
recommendations into Core.

---

**Current status: holding at step 1.** `main` does not yet carry Social's
migration chain. No file in §1/§2 will be committed until that changes —
this document will be re-checked against the canonical branch, not
assumed current, before any implementation begins.
