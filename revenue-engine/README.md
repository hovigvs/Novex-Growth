# Novex Revenue Engine — spine (B1)

The shared Customer → Lead → Opportunity → Conversation → Activity model,
per [`../docs/NOVEX_REVENUE_ENGINE_AUDIT.md`](../docs/NOVEX_REVENUE_ENGINE_AUDIT.md).
Not a marketing-generation engine — this is the plumbing that lets
Qualification, Missed-Call Recovery, Reactivation, and later the Proposal/
Recovery/Corporate-Account/Capacity-to-Demand engines all share one
customer/opportunity record instead of each inventing their own.

**No SQL migration exists here.** Same rule as Brand Center and Campaign
Center: `leads`'s status narrowing and the new `opportunities`/
`activities` tables have a real dependency on the migration queue ahead
of them (Social's chain, then Brand Center's `businesses` extension, then
Campaign Center's `campaigns` extension — see
`NOVEX_BACKEND_INTEGRATION_PHASE1.md`). This directory is domain/schema
code and a localStorage-backed store, built against the documented
canonical shape, exactly the same pattern that already worked twice.

## Locked decisions this implementation follows

- **Lead status ≠ Opportunity stage ≠ Customer lifecycle.** `leads.status`
  here is `new/contacted/qualified/disqualified/converted` only —
  hot/warm/cold/past never appear on a Lead again.
- **An Opportunity needs a customer or a lead, never neither** — enforced
  in `validateOpportunity`. A reactivation/reorder Opportunity has
  `leadId: null` and a real `customerId` — it was never a Lead.
- **Losses require a reason.** `validateOpportunity` throws if
  `stage: 'lost'` has no `lostReason`. `'explicit_decline'` is one of the
  valid reasons specifically so future recovery logic can check for it
  and skip automatic recovery on an explicit no.
- **Segmentation is derived, never stored** (`schemas/segmentation.js`).
  Hot/warm/dormant/at_risk/due_for_reorder are computed fresh from
  `Opportunity`/`Customer` data every time, not written to a column that
  can go stale — the exact failure mode the audit found in the old
  `leads.status`. Manual overrides use a `segment:<name>` tag inside the
  existing `customers.tags` array — no new column.
- **Reorder detection is arithmetic on the business's own order history**
  (`computeReorderSignal`), not a model — matches the explicit "no fake ML
  necessary" direction: average interval between past won Opportunities,
  compared to time since the most recent one.
- **Every write validates before persistence** (`store.js` calls the
  matching schema's `validate*()` before saving) — the same rule locked
  in for the eventual Supabase path applies here today, on localStorage,
  because the discipline shouldn't wait for a real backend to start
  mattering.

## Files

```
schemas/
  lead.schema.js          -- narrowed Lead status, versioned + validated
  opportunity.schema.js   -- stage/lostReason/stalledSince, versioned + validated
  activity.schema.js      -- follow-ups/tasks/tours, versioned + validated
  conversation.schema.js  -- matches Core's conversations shape + opportunityId
  segmentation.js         -- pure derive functions, nothing stored
store.js                  -- localStorage CRUD, validates on every write
```

## First wire-up: `qualification_demo.html`

Chosen first per the audit (§5) — pure Conversation → Lead → Activity,
zero existing-customer ambiguity, already in Novex's catering vertical.
When the scripted qualification completes, it now creates real records
(a Lead, a Conversation with the transcript, an Activity for the
events-team handoff) instead of only animating a UI card. `reactivation_demo.html`
is the next, harder proof — it's the one that needs the Customer vs.
Lead vs. Opportunity split to be modeled correctly, since it's the one
currently getting it wrong.
