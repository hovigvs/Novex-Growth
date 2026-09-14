# Novex Core Integration Readiness Audit

**Status: APPROVED as a plan. No implementation authorized.** No code,
SQL, Social, Flyer, or portal files have been modified — this remains an
audit and sequencing plan only. Holding here while Social B2 completes
manual visual approval and the next integration phase is prioritized.

## Approved, with one added principle

The migration sequence (§2) and the `businesses` RLS finding (§7) are
accepted as written. One principle is added, binding on §3/§8's staged
cleanup:

> **Migration `0007` (removing Social's duplicate campaign-intent columns)
> must never be deployed in the same release as `0006` (the backfill +
> application-code switch). A verification period separates them, and
> that period must actually elapse — not be assumed or skipped for
> convenience. Destructive cleanup is never automatic; it is a distinct,
> later, deliberately-triggered step.**

This hardens what §3/§8 already recommended into a hard rule: even once
`0006` ships and its verification checklist (§3 step 3) passes, `0007`
still requires its own separate deploy, decided on its own, not bundled
in "while we're at it." The risk this closes: a backfill and a
destructive drop landing in one deploy because they were designed
together, which quietly deletes the verification period's reason to
exist.

## Current-state audit

| Entity | Location | State |
|---|---|---|
| Core `businesses` | `0001`, live on `main` | `id, business_id-owning FK target, name, vertical, plan, timestamps`. No industry/website/description/phone/email/address/social_links — Brand Center's proposed extension, still undocumented-only. **RLS: SELECT-only** (`businesses_own`) — no UPDATE or INSERT policy exists. See finding below. |
| Core `campaigns` | `0001`, live on `main` | `id, business_id, type, target_segment jsonb, status, timestamps`. No title/objective/offer/audience/dates/brand_kit_id/creative_profile_id/notes — Campaign Center's proposed extension, still undocumented-only. **RLS: full CRUD tenant policy already present** (`campaigns_tenant`). |
| `brand_kits` | `0003`, **`social-b1` worktree only, not in `main`** | `id, business_id, name, logo_asset_id, identity jsonb, writing_rules jsonb, is_default, timestamps`. Canonical per Brand Center's approved architecture. Full CRUD RLS policy present. |
| `creative_profiles` | `0003`, **`social-b1` worktree only** | `id, business_id, name, visual_preferences jsonb, is_default, timestamps`, plus `creative_profile_reference_assets` join table. Canonical, approved. Full CRUD RLS present. |
| `assets` | `0001` + Flyer's `0002` extension, live on `main` | `id, business_id, type, storage_path, tags, metadata jsonb, timestamps` + Flyer's `image_role, background_mode, quality_score, safe_crop, master_derivative_path, flyer_derivative_path, prepared_at`. Brand Center's asset-contract shape (roles/depicts/derivatives/immutable) lives inside `metadata` jsonb at the application level — no schema conflict, confirmed compatible with Flyer's columns. Full CRUD RLS present. |
| `campaign_source_assets` | `0003`, **`social-b1` worktree only** | `campaign_id, asset_id, role, position_order, merchant_notes`. Already generic — FKs straight to `campaigns(id)`, not to `social_content_campaigns`. Adopted conceptually by Campaign Center's B1 UI (an in-memory id array today, no live table yet). Full CRUD RLS present, scoped transitively through `campaigns`. |
| `social_content_campaigns` | `0003`, **`social-b1` worktree only** | `campaign_id (PK/FK), business_id, title, objective, offer, brief, brand_kit_id, creative_profile_id, workflow_status, selected_concept_id, approved_by_profile_id, approved_at, timestamps`. Contains the previously-flagged duplicate fields (`title`/`objective`/`offer`/`brand_kit_id`/`creative_profile_id`) that overlap with Campaign Center's proposed `campaigns` extension. Unchanged since that finding — not yet reconciled. |
| Social B2 platform-recommendation state | `social-b1` worktree | **Does not exist yet.** Checked fresh: the worktree is still at its last hardening commit, no B2 branch, schema, or code. Nothing to audit here — recorded honestly rather than speculated about. This item stays open until Social B2 actually starts. |
| Flyer campaign/output tables | `0002`, live on `main` | `campaign_products` (per-product campaign row — price snapshot, merchandising constraints, priority score), `page_archetypes` (reference data), `generated_documents`/`document_pages`/`layout_instances` (output structure). All FK to `campaigns(id)`; none extend `campaigns` itself; zero overlap with Brand Center/Campaign Center fields. Confirmed unchanged since authored. |

**One concrete finding from this audit, not previously caught:**
`businesses` has only a SELECT RLS policy. Brand Center's entire purpose
is letting a merchant edit their own business profile — under the current
RLS, an authenticated merchant could read their business row but **not
update it**. The `businesses` extension migration must add UPDATE (and
likely INSERT, for onboarding) policies, not just new columns, or Brand
Center would silently fail to save the moment it touches a real backend.

## 1. Canonical table ownership

| Table | Owner | Notes |
|---|---|---|
| `businesses` | Brand Center (extension), Core (base) | Brand Center owns industry/website/description/phone/email/address/social_links |
| `campaigns` | Campaign Center (extension), Core (base) | Campaign Center owns title/objective/offer/audience/dates/brand_kit_id/creative_profile_id/notes |
| `brand_kits` / `creative_profiles` / `creative_profile_reference_assets` | Social B1 (defined), Brand Center (configuration surface) | Unchanged, canonical per prior approval |
| `assets` | Core (base), Flyer (pipeline columns), Brand Center (metadata contract, app-level only) | No further schema ownership disputes found |
| `campaign_source_assets` | Social B1 (defined), shared by Campaign Center | Reused as-is, no changes |
| `social_content_campaigns` | Social, trimmed post-cleanup | Loses its 5 duplicate columns once `campaigns` carries them |
| `campaign_products` / `page_archetypes` / `generated_documents` / `document_pages` / `layout_instances` | Flyer | Untouched, no ownership change |

## 2. Migration dependency order

Strict linear sequence — none written yet, numbers illustrative:

```
0003  Social B1 schema (brand_kits, creative_profiles, campaign_source_assets,
      social_content_campaigns, creative_concepts, platform_variants)
      -- external, owned by Social workstream, must land in main first.

0004  Brand Center: businesses extension
      (industry, website, description, phone, email, address, social_links)
      + businesses UPDATE/INSERT RLS policies (the gap found above)
      -- depends on 0003 only insofar as history must stay linear;
         no direct FK dependency.

0005  Campaign Center: campaigns extension
      (title, objective, offer, audience, start_date, end_date,
       brand_kit_id, creative_profile_id, notes)
      -- HARD dependency on 0003: brand_kit_id/creative_profile_id are
         real foreign keys into tables 0003 creates.

0006  Social: backfill campaigns from social_content_campaigns
      (data-only migration, see §3/§4)
      -- depends on 0005 (target columns must exist).

0007  Social: drop the 5 now-duplicate columns from social_content_campaigns
      -- depends on 0006 + a verified compatibility window (§3), and on
         Social's application code no longer reading/writing them (§5).
```

0004 and 0005 could technically be reordered (neither hard-blocks the
other), but keeping them linear avoids any ambiguity about which extension
landed against which base schema — consistent with the "schema history
stays linear" principle from Brand Center's approval.

## 3. Social duplicate-field cleanup sequence

The staged, non-destructive approach specified, made concrete:

1. **Backfill Core** (`0006`) — for every existing `social_content_campaigns`
   row, copy `title`/`objective`/`offer`/`brand_kit_id`/`creative_profile_id`
   into the corresponding `campaigns` row (same `campaign_id`). Additive
   only — `social_content_campaigns` keeps its columns during this step.
2. **Switch application reads/writes** — Social's app code changes to
   read/write those five fields via `campaigns` instead of
   `social_content_campaigns`. This should happen in the **same deploy**
   as step 1's backfill, not a separate one — a window where the backfill
   has run but old code still writes to the duplicate columns would let
   the two silently diverge again, recreating the exact drift this whole
   effort exists to prevent.
3. **Verify** — a soak period confirming no code path anywhere (Social's
   own, or anything else) still reads the `social_content_campaigns`
   copies. Concretely: grep the deployed app code for those column names,
   confirm zero hits, before proceeding.
4. **Remove duplicates later** (`0007`) — only after step 3 passes, drop
   the five columns from `social_content_campaigns`. This is the only
   destructive step, deliberately last and separate from the migration
   that adds the new canonical columns. **Hard rule (added on approval):
   `0007` is never in the same deploy as `0006` — step 3's verification
   period must actually elapse between them, every time, not just when
   convenient.**

All four steps are Social's to execute — Campaign Center does not touch
`social_content_campaigns`.

## 4. Data backfill requirements

**Real backfill risk is low today, on purpose:** no live Supabase project
exists yet and no real merchant data exists anywhere in this system —
confirmed repeatedly across every prior audit in this project. So step 1
above (backfilling *existing* `social_content_campaigns` rows into
`campaigns`) has nothing to actually migrate right now. The staged
procedure is still worth specifying precisely, now, because it becomes
real the moment a pilot merchant's data exists — retrofitting a safe
migration path after real data accumulates is much harder than designing
it in advance, which is the whole point of doing this audit before that
happens.

**Brand Center / Campaign Center's own "backfill" equivalent** is
different in kind: any demo-mode `localStorage` data a tester has
accumulated in their own browser. This is optional to preserve (it's demo
data, not merchant data) — if worth keeping, a small one-time export
script (read `localStorage`, POST into the new tables via the Supabase
client) could run per-browser on first login after the real backend
launches. Not required for B1→backend cutover to function; flagged as a
nice-to-have, not a requirement.

## 5. Compatibility period / read-write strategy

**For Social's duplicate fields:** the compatibility window is the gap
between step 1 (backfill) and step 4 (drop) in §3. During that window,
both copies of the data physically exist in the database. The
recommendation above — switch application reads/writes in the *same*
deploy as the backfill — is what keeps that window safe: nothing should
ever read the old columns again after the backfill runs, even though they
still exist physically until step 4. Treat them as already deprecated in
code from that moment, not just eventually deleted in schema.

**For Brand Center / Campaign Center's localStorage → real backend
cutover:** no compatibility window is needed in the same sense, because
there's no existing live data to migrate away from. The cutover is a
direct swap: replace `localStorage.getItem`/`setItem` calls with Supabase
client `select`/`upsert` calls. This was the deliberate payoff of matching
the demo-mode record shape to the exact canonical contract from the
start — the `validate*()` functions and field names don't change, only
where the data is read from and written to.

## 6. Portal API/service boundaries

No new API/service layer is needed for Brand Center or Campaign Center's
plain CRUD. Per the principle already established in the Flyer
architecture (Revision 3 §10) and reaffirmed here: simple data reads/
writes go straight from the browser through the Supabase JS client,
relying on RLS for the tenant boundary — a bespoke REST layer would be
over-engineering for what RLS already secures correctly. The boundary that
does matter, and stays unchanged by this proposal: anything invoking a
paid or sensitive API (AI classification, image generation, headless
rendering) goes through a Netlify Function, the same pattern `tts.js`/
`chat.js` already establish. Neither Brand Center nor Campaign Center B1
touches such an API, so neither needs a function today.

## 7. Tenant-isolation requirements

Every table across `0001`/`0002`/`0003` already follows one consistent
RLS pattern: `business_id in (select business_id from profiles where id =
auth.uid())`, applied for full CRUD except where deliberately narrower
(`businesses`, `profiles`). This consistency is a real strength found in
this audit — three separately-authored migrations converged on the same
tenant-isolation shape without coordination, because the pattern was
documented once in `NOVEX_SYSTEM_ARCHITECTURE.md` and followed each time.

**The one gap:** `businesses` lacks UPDATE/INSERT policies (see the
finding above). Any future migration touching `businesses` — Brand
Center's extension is the first one that will — must add:
```
create policy businesses_update_own on businesses
  for update using (id in (select business_id from profiles where id = auth.uid()))
  with check (id in (select business_id from profiles where id = auth.uid()));
```
and an equivalent INSERT policy scoped to account/business creation
(likely via a trusted server-side path during onboarding rather than
open client INSERT, since creating a business is also when the first
`profiles` row linking a user to it gets created — a chicken-and-egg
that's usually handled by a Netlify Function using the service role key
for that one step, not by client-side RLS).

## 8. Rollback risks

**Pre-launch (today's actual state):** near-zero. No live Supabase
project, no real data. Any of these migrations can be rewritten or
abandoned freely before a project is provisioned — this is the cheapest
possible time to get the sequence right, which is the whole reason to do
this audit now rather than after a pilot merchant is live.

**Post-launch (once a real project + real merchant data exist):**
- `0004`/`0005` (additive column extensions): low risk, reversible —
  `ALTER TABLE ... DROP COLUMN` cleanly undoes an unused addition.
- `0006` (backfill): low risk if idempotent (safe to re-run without
  duplicating data) — should be written as an `UPSERT`/`ON CONFLICT`
  style operation, not a blind `INSERT`.
- `0007` (drop Social's duplicate columns): the one genuinely
  hard-to-reverse step — once dropped, recovering the data requires a
  backup restore, not a simple migration rollback. This is exactly why
  the staged approach exists, why it's sequenced last, only after a
  verified soak period, and why — per the principle added on approval —
  it may never ship in the same deployment as `0006`. Bundling the two
  would delete the verification window's entire purpose along with the
  columns.
- Cross-cutting risk: if Social's application-code switch (§3 step 2) is
  *not* deployed atomically with the backfill, a live merchant could edit
  a campaign's title through Social's old code path after the backfill
  ran, silently reintroducing drift between the two copies. This is a
  process/deploy-discipline risk, not a schema risk — worth calling out
  explicitly to whoever executes §3 on the Social side.

## 9. What should wait until after Social B2 visual approval

- **Nothing in this readiness plan is blocked by Social B2's visuals
  specifically** — the schema dependency is on `0003` (already fully
  designed and approved, just unmerged), not on whatever B2 adds
  visually. B2's actual deliverable (better creative output) doesn't
  change `brand_kits`/`creative_profiles`'s shape as far as this audit can
  tell from the current, unstarted state of that work.
- **What genuinely should wait:** actually *executing* `0003` → `0004` →
  `0005` against a real Supabase project. Provisioning a live project and
  running this sequence is a real infrastructure commitment (matching the
  same reasoning in the Flyer proposal's "don't provision speculative
  infrastructure" stance) — better done once there's an actual reason
  (a pilot merchant, or Social B2 reaching a point where real persistence
  is needed to keep testing), not on a schedule tied to a visual-review
  gate that doesn't touch these tables.
- **What should NOT wait:** nothing in this document requires waiting.
  The migration files themselves could be drafted (not applied) at any
  time once `0003` is confirmed final — the visual-review gate governs
  Social's own creative-quality decision, not this schema's readiness.

---

Stopping here, as instructed. No code, SQL, or file changes beyond this
document.
