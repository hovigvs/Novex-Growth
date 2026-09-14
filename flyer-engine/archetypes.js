// Page Archetypes — Revision 3 §4. B1 builds exactly two of the eight
// proposed archetypes (the rest are B2 scope). Zones carry real fractional
// geometry (x/y/width/height, of the content area below the masthead and
// above the footer), not just a cell-cost number -- a 6-cell horizontal
// strip and a 6-cell vertical column behave differently and this lets the
// renderer actually express that.
//
// `allowed_components` uses B1's tier vocabulary (hero/double/hotDeal/
// standard) rather than the full 16-component key list, since only 6
// components exist yet.

const archetypes = {
  hero_plus_grid_page: {
    key: 'hero_plus_grid_page',
    name: 'Hero + Grid',
    // Zone heights + cost_budget recalibrated against a real measured
    // render (B1): the first pass (0.34/0.66 height, budget 13/24)
    // overflowed grid_zone by 137px at "0.5 budget remaining" -- i.e. the
    // cost-per-item heuristic wasn't actually tracking real pixel height
    // for this component mix (category headers + wide hot-deal cards).
    // Measured ~32px/cost-unit at this mix; budget below reflects that,
    // not the original estimate. This is exactly the kind of calibration
    // Revision 3 flagged as "needs testing against real output."
    zones: [
      { name: 'hero_zone', x: 0, y: 0, width: 1.0, height: 0.32, cost_budget: 13, allowed_components: ['hero', 'double'] },
      { name: 'grid_zone', x: 0, y: 0.32, width: 1.0, height: 0.68, cost_budget: 19, allowed_components: ['standard', 'hotDeal'] },
    ],
  },
  grocery_dense_page: {
    key: 'grocery_dense_page',
    name: 'Grocery Dense',
    zones: [
      { name: 'grid', x: 0, y: 0, width: 1.0, height: 1.0, cost_budget: 33, allowed_components: ['standard', 'hotDeal'] },
    ],
  },
};

// Cost per component tier -- empirically grounded in this session's actual
// measurement: a standard page held 33 standard items; a hero cost ~5x a
// standard item's space.
const TIER_COST = {
  hero: 10,
  double: 3,
  hotDeal: 1.5,
  standard: 1,
};

module.exports = { archetypes, TIER_COST };
