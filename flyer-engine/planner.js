// Zone/Component planner — Revision 3 §2/§4 (B2's Composition Planner and
// full multi-page rhythm are out of scope for B1; this fills ONE page's
// zones from a scored, constrained product list).

const { computeScore } = require('./scoring');
const { resolveConstraints } = require('./constraints');
const { TIER_COST } = require('./archetypes');
const { getProduct } = require('./data/sample-campaign');

function mergeAndScore(cp) {
  const product = getProduct(cp.product_id);
  const merged = { ...product, ...cp };
  const { score, discount_pct, breakdown } = computeScore(merged);
  merged.priority_score = score;
  merged.priority_score_breakdown = breakdown;
  merged.discount_pct = discount_pct;
  const constraint = resolveConstraints(merged);
  merged.eligibleTiers = constraint.eligibleTiers;
  merged.constraintReason = constraint.reason;
  return merged;
}

// Decide a tier for a merged product given a zone's allowed components,
// the product's constraint-resolved eligible tiers, AND the zone's actual
// remaining budget -- a tier that "should" apply but doesn't fit is not a
// valid choice. Preference order still favors bigger tiers for
// higher-scoring/hot-deal items, but never at the cost of silently
// dropping a lower-scored item that would fit at a smaller tier -- the
// caller falls through to try later zones if nothing fits here.
function pickTier(merged, allowedTiers, remainingBudget) {
  const candidates = merged.eligibleTiers.filter(t => allowedTiers.includes(t));
  const preferenceOrder = ['hero', 'double', 'hotDeal', 'standard'];
  for (const tier of preferenceOrder) {
    if (!candidates.includes(tier)) continue;
    if (tier === 'hotDeal' && merged.promotion_type !== 'hot_deal') continue; // Hot Deal component reserved for actual hot deals
    if (TIER_COST[tier] <= remainingBudget) return tier;
  }
  return null;
}

// A zone is "grid-like" if it has no room for hero/double (i.e. it's a
// bulk standard/hot-deal area). Grid-like zones fill by CATEGORY BAND --
// group by category, order bands by that category's best score, then
// score-order within a band -- so the real flyer's clean "Produce...
// Grocery..." sectioning happens instead of categories interleaving by
// raw global score (which produced a broken GROCERY/PRODUCE/GROCERY
// repeat when first tried). Feature-like zones (hero/double eligible)
// keep pure global score order, since "best of show" isn't category-bound.
function orderForZone(zone, pool) {
  const isGridLike = !zone.allowed_components.includes('hero') && !zone.allowed_components.includes('double');
  if (!isGridLike) return pool; // already globally score-sorted by the caller

  const byCategory = new Map();
  for (const m of pool) {
    if (!byCategory.has(m.category)) byCategory.set(m.category, []);
    byCategory.get(m.category).push(m);
  }
  const bands = [...byCategory.values()];
  bands.forEach(band => band.sort((a, b) => b.priority_score - a.priority_score));
  bands.sort((a, b) => b[0].priority_score - a[0].priority_score);
  return bands.flat();
}

/**
 * Fills one archetype's zones from a pool of campaign_product rows.
 * @param {Object} archetype  from archetypes.js
 * @param {Object[]} campaignProducts  candidate campaign_product rows for this page
 * @returns {Object} a Layout Plan for one page: { archetypeKey, zones: [{...zone, instances}] }
 */
function planPage(archetype, campaignProducts) {
  const scored = campaignProducts.map(mergeAndScore).sort((a, b) => b.priority_score - a.priority_score);
  const used = new Set();
  const zones = archetype.zones.map(zone => {
    let remainingBudget = zone.cost_budget;
    const instances = [];
    let lastCategory = null;
    const remainingPool = scored.filter(m => !used.has(m.id));
    const ordered = orderForZone(zone, remainingPool);
    for (const merged of ordered) {
      const tier = pickTier(merged, zone.allowed_components, remainingBudget);
      if (!tier) continue; // doesn't fit THIS zone at any eligible tier -- try later zones

      // Category Header: emitted once per new category band encountered
      // while filling a grid-style zone (mirrors the real ARZ flyer's
      // banded sections). Structural, no budget cost (matches the
      // component library's ~0 cost for Category Header).
      if (tier === 'standard' || tier === 'hotDeal') {
        if (merged.category !== lastCategory) {
          instances.push({ component: 'categoryHeader', categoryName: merged.category });
          lastCategory = merged.category;
        }
      }

      instances.push({ component: tier, campaignProductId: merged.id, merged });
      used.add(merged.id);
      remainingBudget -= TIER_COST[tier];
    }
    return { ...zone, instances, remainingBudget };
  });

  const unplaced = scored.filter(m => !used.has(m.id));
  if (unplaced.length) {
    console.warn(`[planner] ${unplaced.length} item(s) did not fit any zone in "${archetype.key}": ${unplaced.map(m => m.name).join(', ')}`);
  }

  return { archetypeKey: archetype.key, zones, unplaced: unplaced.map(m => ({ id: m.id, name: m.name })) };
}

module.exports = { planPage, mergeAndScore, pickTier };
