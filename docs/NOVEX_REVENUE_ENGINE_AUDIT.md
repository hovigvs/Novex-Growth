# Novex Revenue Engine — Consolidation Audit

**Status: APPROVED, B1 in progress.** Canonical model confirmed with one
refinement over the original proposal: segmentation (hot/warm/dormant/
at_risk/due_for_reorder) is derived on read, never stored — see
[`../revenue-engine/README.md`](../revenue-engine/README.md) for the
locked decisions this implementation follows. Domain schemas and a
localStorage-backed store are built (`revenue-engine/`); `qualification_demo.html`
is wired end-to-end as the first proof (real Lead/Conversation/Activity
records, validated on write, no more animation-only UI). `reactivation_demo.html`
is next — the harder proof, since it's the one demo that actually needs
the Customer/Lead/Opportunity split to be modeled correctly. No SQL
migration is written or committed — same standing rule as Brand Center
and Campaign Center; the original audit findings below are unchanged and
still the reference for what's being built toward.

## 1. Current exact schema and data flow

**Core tables that exist today** (`0001_core_schema.sql`, live on `main`):

```
customers      id, business_id, name, email, phone, tags[], lifetime_value, timestamps
               -- no lifecycle/segmentation field, no last-activity timestamp

leads          id, business_id, customer_id (nullable FK -> customers),
               source, status (hot|warm|cold|past), timestamps
               -- status is the conflated field, see §2

conversations  id, business_id, lead_id (nullable), customer_id (nullable),
               channel, transcript jsonb, timestamps
               -- already flexible: can link to a lead, a customer, or
                  (once it exists) an opportunity

campaigns      id, business_id, type, target_segment jsonb, status, timestamps

automations    id, business_id, trigger_type, action jsonb, module_owner,
               enabled, timestamps
               -- a WORKFLOW-RULE table (trigger -> action), not an
                  instance-level task/follow-up record. Does not model
                  "Activity" as defined in the canonical model below.

assets, ai_agents, businesses, profiles -- unrelated to this audit
```

**No `opportunities` table exists anywhere in Core.** No `activities`
table exists anywhere in Core. No dedicated "Revenue Journey" architecture
doc exists in `docs/` — searched, found nothing. The closest existing
artifact to that concept is `reactivation_demo.html` itself, which the
original strategy conversation referred to as "already underway" — it
isn't backed by any written architecture, just a working demo.

**Current data flow, all three demos:** 100% self-contained, ephemeral
mock data. None of the three reads or writes `customers`, `leads`,
`conversations`, or any Core table. This matches what
`NOVEX_SYSTEM_ARCHITECTURE.md`'s audit table already flagged months ago
(all three listed "❌ own mock data, not Core") — unchanged since then.

## 2. Where the three demos duplicate or conflict

### `reactivation_demo.html` — the real conflation, confirmed in code

A single flat `LEADS` array (8 records), each tagged with a `bucket`
(`hot`/`warm`/`cold`/`past`) that maps directly onto `leads.status`'s
check constraint. Reading the actual records shows this one field is
doing the work of at least three different canonical concepts:

| Record | Bucket | What it actually is |
|---|---|---|
| Priya Anand, Marcus Chen | `hot` | Genuine new **Lead** — inbound inquiry, no reply sent yet |
| Sarah & Devon Whitfield | `warm` | A **stalled Opportunity** — quote already sent 12 days ago, no follow-up. Qualification already happened; this is past the Lead stage. |
| **Golden Oak Banquet Hall** | `warm` | Explicitly labeled "referral partner" in its own name — this is a **B2B partner relationship with a stalled Opportunity**, not a customer lead at all |
| Tanya Reyes, Horizon Legal | `cold` | Genuine neglected **Lead** — inquired, never qualified or followed up |
| **The Alcott Wedding** | `past` | An existing **Customer** ("booked last year") — the "value" is a reactivation/anniversary/**referral** opportunity, not a lead-acquisition value. Storing this as `leads.status='past'` would record a past client as an unconverted lead, which is backwards. |
| **Meridian Consulting Group** | `past` | An existing **Customer** with lapsed order cadence ("used to be monthly, no order in 5 months") — again a reactivation **Opportunity** on an existing customer, not a lead. |

Also present: `state.contacted`, `state.replied`, `state.recovered` — ad
hoc per-record boolean dictionaries. These are unstructured **Activity**/
**Conversation** tracking (did we contact them, did they reply, is this
recovered) that should be real records, not UI-only flags that vanish on
reload.

**This is the single clearest confirmation of the concern raised in
review:** two of these eight records are already-existing customers, one
is a referral partner, and none of that distinction survives if the whole
array gets poured into `leads.status` as originally proposed. That
proposal would have been a real mistake, caught here before it happened.

### `missed_call_recovery_demo.html` — cleanest of the three, but off-vertical

A single ephemeral session simulation (no persisted array at all) across
four **trades** verticals — renovation, commercial cleaning, landscaping,
auto detailing (`portal-config.js` tags it `vertical:"trades"`). Flow:
missed call → scripted **Conversation** → extracted **Lead** fields
(service/details/timeline/value range) → a canned **Activity** follow-up
sequence (Day 2/5/14). No existing-customer case, no stage/Opportunity
concept, no won/lost. Structurally the cleanest of the three — it never
touches the conflation problem because it never deals with an existing
customer — but it's the one demo not actually in Novex's primary
catering/venue vertical, worth flagging as a scope oddity independent of
this consolidation.

### `qualification_demo.html` — also clean, and on-vertical

Also a single ephemeral session simulation (Instagram DM catering
inquiry). Flow: inbound DM → scripted **Conversation** → extracted
**Lead**-qualification fields (occasion/date/guest count/dietary/budget)
→ an implicit **Activity** (handoff to the events team for a formal
quote). No persistence, no stage, no existing-customer case, no won/lost.
100% new-lead qualification — no ambiguity to resolve here.

## 3. Is `leads` reusable as-is?

**No — it should become a narrower acquisition entity**, not the center
of the platform. Concretely:

- `status` (`hot`/`warm`/`cold`/`past`) mixes Lead-qualification state
  (should something like a genuine "new / contacted / qualified /
  disqualified / converted" replace it), Opportunity stage (`warm` as
  "stalled proposal" is an Opportunity concept), and Customer segmentation
  (`past` is a customer-lifecycle fact, not a lead state) — confirmed
  concretely by the table in §2, not just asserted abstractly.
- The table itself (`id, business_id, customer_id, source, timestamps`)
  is otherwise fine and reusable — `customer_id` being nullable already
  supports "this lead is tied to an existing customer" structurally. Only
  `status`'s values need to change; the shape doesn't need a rebuild.

## 4. Minimum canonical entity model for Revenue Engine B1

```
customers      (existing, +last_activity_at needed -- see below)
leads          (existing, narrowed status -- see below)
opportunities  (NEW -- does not exist anywhere in Core today)
activities     (NEW -- does not exist anywhere in Core today)
conversations  (existing, +opportunity_id nullable FK -- see below)
campaigns      (existing, unchanged)
```

**`leads.status`** narrows to a Lead's own qualification lifecycle only:
`new | contacted | qualified | disqualified | converted`. Hot/warm/cold/
past are removed from this table entirely — they were never really
Lead-shaped facts.

**`opportunities`** (new): `id, business_id, customer_id (nullable),
lead_id (nullable -- an Opportunity can exist without a Lead, e.g.
reactivation), stage (new | qualified | proposal_sent | stalled | won |
lost), estimated_value, stalled_since, stalled_reason, lost_reason
(nullable -- e.g. date_unavailable | budget | explicit_decline |
competitor | ghosted), source_campaign_id (immutable FK to campaigns),
timestamps`. One Lead may produce zero or multiple Opportunities (matches
the locked rule). A reactivation Opportunity on an existing Customer has
`lead_id = null` — it was never a Lead.

**`activities`** (new): `id, business_id, related_lead_id (nullable),
related_opportunity_id (nullable), related_customer_id (nullable), type
(call | sms | email | task | tour | tasting | follow_up), due_at,
completed_at, notes, timestamps`. This is what `reactivation_demo`'s ad
hoc `contacted`/`replied`/`recovered` dicts and `missed_call_recovery`'s
hardcoded Day-2/5/14 follow-up text should actually become — queryable
records instead of state that vanishes on reload.

**Campaign attribution** (locked rule: "original immutable, recovery
additive"): rather than overloading a single FK that would need special
update logic to stay immutable, a lightweight join —
`opportunity_campaign_touches (opportunity_id, campaign_id, role:
'original'|'recovery', touched_at)` — records the original touch once,
never updated, and every later recovery campaign adds a new row. Simpler
to keep correct than a single mutable column with a "don't overwrite this
one" rule attached.

**Segmentation (hot/warm/dormant/past) — flagged as an open design
question, not decided here:** these are properties of a Customer's
*current state*, which is time-relative (a customer marked "warm" today
silently goes stale if nothing ever recomputes it). Two options: (a) a
stored `customers.segment` column, updated by a scheduled job/trigger, or
(b) derive it on read from `customers.last_activity_at` /
`lifetime_value` / open-Opportunity state, never stored. I'd lean toward
(b) — a stored enum that nothing keeps current is exactly the kind of
field that becomes silently wrong, the same failure mode already found in
`leads.status`. Flagging for a decision, not deciding unilaterally.

**Consent / do-not-contact (locked rule):** `customers` needs a
`do_not_contact` boolean (or a small `consent_status` enum) that recovery/
reactivation logic must check before generating a next action. Also
closes a real compliance gap flagged earlier in this project (CASL —
Canada's Anti-Spam Legislation) around automated outreach.

**`conversations`** needs one addition: a nullable `opportunity_id` FK —
a follow-up call about a stalled proposal is a conversation about an
Opportunity, not just about the original Lead.

**`customers`** needs one addition: `last_activity_at timestamptz` — the
Meridian Consulting / Alcott Wedding reactivation triggers ("no order in
5 months," "no contact in 11 months") are only computable if something
tracks when a customer was last active.

## 5. Which existing demo should become the first real integrated workflow

Two different candidates, for two different reasons — not a single pick:

- **`qualification_demo.html`** is the right one to prove the *plumbing*
  first: it's pure Conversation → Lead → Activity, zero ambiguity, and
  it's already in Novex's actual catering vertical (unlike
  `missed_call_recovery_demo`'s trades scripts). Low-risk first wire-up.
- **`reactivation_demo.html`** is the right one to prove the *full
  model*: it's the only one of the three that actually exercises the
  Customer-vs-Lead-vs-Opportunity distinction, since it's the one
  currently getting it wrong. Successfully remodeling it — where the
  Alcott Wedding and Meridian Consulting records become Customer +
  Opportunity with no Lead, and Golden Oak Banquet Hall becomes a
  partner-flagged Opportunity — is the real test of whether the canonical
  model holds up against real (if fictional) data, not just in theory.

Recommend both, in that order: qualification first to validate the
mechanism, reactivation second to validate the model.

## 6. Minimum non-destructive migration sequence, if schema changes are needed

Not written yet — sequencing only, same discipline as every prior phase:

```
1. Confirm Social's chain + Brand Center's + Campaign Center's migrations
   have landed and numbers are settled (this audit doesn't change that
   queue -- it joins it, doesn't jump it).
2. Additive: create `opportunities`, `activities`,
   `opportunity_campaign_touches`. Add `customers.last_activity_at`,
   `customers.do_not_contact`. Add `conversations.opportunity_id`
   (nullable). None of this touches existing rows.
3. Narrow `leads.status`'s check constraint to the new values. This is
   the one step that isn't purely additive -- it changes what's a valid
   value for an EXISTING column. Since no live data exists yet anywhere
   (confirmed repeatedly across this project), there's nothing to
   backfill or break today, but if this runs after real leads rows exist,
   it needs the same staged approach already established for Social's
   cleanup: map old values to new first, verify, only then tighten the
   constraint.
4. Wire qualification_demo, then reactivation_demo, onto the new tables.
```

## 7. How this foundation supports Calendar Gap, Cancellation Recovery, Corporate Accounts, and Revenue Attribution without redesign

- **Calendar Gap / Demand Activation:** a detected gap creates a
  `campaigns` row (already how Campaign Center models a demand-generation
  push) targeting a segment; any resulting inbound response becomes a
  `leads` row with `source` pointing at that campaign, or — if it matches
  an existing dormant customer — an `opportunities` row directly, exactly
  like the Meridian Consulting case above. No new entity needed.
- **Cancellation Recovery:** queries `opportunities`/`customers` for
  matches (compatible budget, date-conflict history, past interest) —
  this only works cleanly *because* Opportunity and Customer are already
  separate from Lead; matching "past leads who wanted this date" against
  a flat conflated table would have meant filtering out customers and
  partners by hand every time.
- **Corporate Account Engine (caterers):** an Opportunity with
  `lead_id = null` and a `customer_id` pointing at a recurring corporate
  account is already exactly what the model supports — this is the same
  shape as the Meridian Consulting reactivation case, just triggered by
  order-cadence instead of a calendar gap.
- **Revenue Attribution:** `opportunity_campaign_touches` gives a clean
  answer to "which campaign influenced this win" without needing to
  reconstruct it later — immutable original touch, additive recovery
  touches, queryable from day one.

None of this requires inventing new entities beyond what §4 already
proposes — the future features consume the same `opportunities`/
`activities`/`campaigns` shapes, they don't need their own.

## Locked rules — confirmed compatible with everything above

Lead status / Opportunity stage / Customer lifecycle are distinct (§3-4).
Hot/Warm/Dormant/Past are segmentation, not stored as Lead status (§4).
One Customer → many Leads/Opportunities over time (schema already
supports this via nullable FKs). One Lead → zero or many Opportunities
(`opportunities.lead_id` nullable, not unique). Stalled state uses
explicit `stalled_since`/`stalled_reason`, not a boolean (§4). Original
campaign attribution immutable, recovery additive
(`opportunity_campaign_touches`, §4). Every new table carries
`business_id` (§4, §6). Explicit declines/consent/do-not-contact
constrain recovery (`customers.do_not_contact`, `lost_reason =
'explicit_decline'`, §4) — not yet enforced anywhere since no recovery
logic exists yet, but the fields exist for it to check.

---

Stopping here, as instructed. No implementation. Returning this for
approval of the canonical model before anything gets built.
