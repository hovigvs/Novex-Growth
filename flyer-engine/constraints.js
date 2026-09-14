// Minimal constraint handling — Revision 3 §6. Constraints are hard
// filters applied before scoring picks a component tier; scores decide
// how much space, constraints decide what's even eligible.
//
// B1 scope (deliberately narrow): merchant_force_hero, merchant_featured,
// merchant_do_not_feature, requires_description. The rest of the full
// constraint set (must_be_page_1, adjacency, min/max component size,
// asset_quality_restriction, etc.) is real but deferred to B2+ per the
// agreed vertical-slice plan -- it isn't needed to prove one good page.

/**
 * @param {Object} merged  product + campaign_product joined record, plus {score, breakdown}
 * @returns {{eligibleTiers: string[], excluded: boolean, reason: string|null}}
 */
function resolveConstraints(merged) {
  if (merged.merchant_do_not_feature) {
    return { eligibleTiers: ['standard'], excluded: false, reason: 'merchant_do_not_feature: capped to standard tier' };
  }
  if (merged.merchant_force_hero) {
    return { eligibleTiers: ['hero'], excluded: false, reason: 'merchant_force_hero: forced to hero tier' };
  }
  if (merged.requires_description) {
    // A requires_description product needs a component with a description
    // slot; in B1's 6-component set only Hero/Double have room for one, so
    // such a product is only eligible for those tiers, regardless of
    // category -- this is a system-derived constraint, not a category rule.
    return { eligibleTiers: ['hero', 'double'], excluded: false, reason: 'requires_description: needs a component with a description slot' };
  }
  return { eligibleTiers: ['hero', 'double', 'hotDeal', 'standard'], excluded: false, reason: null };
}

module.exports = { resolveConstraints };
