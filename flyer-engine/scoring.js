// Minimal priority scoring — Revision 3 §7. Deterministic, explainable.
// Score lives on campaign_products (never on products): priority is a
// property of this campaign's placement of a product, not the product
// itself. Every score comes with a breakdown so "why is this the hero?"
// always has a stored answer.

const WEIGHTS = {
  featured: 30,
  promotion: 20,
  discount: 15,
  campaignRelevance: 15, // no active seasonal campaign concept in B1 -> always 0 for now
  margin: 10,            // no cost data supplied in B1 -> always 0 for now
  category: 10,
};

const PROMOTION_WEIGHT = {
  hot_deal: 1.0,
  seasonal: 0.7,
  new: 0.5,
  clearance: 0.4,
  none: 0,
};

// Category importance is a rough default (produce/prepared foods are
// traffic drivers) -- tunable per business later, per the architecture doc.
const CATEGORY_IMPORTANCE = {
  'Prepared Foods': 1.0,
  'Produce': 0.8,
  'Grocery': 0.4,
};

function discountPct(regularPrice, salePrice) {
  if (!salePrice || !regularPrice || regularPrice <= 0) return 0;
  return Math.max(0, Math.round((1 - salePrice / regularPrice) * 100));
}

/**
 * @param {Object} cp campaign_product row
 * @returns {{score:number, breakdown:Object}}
 */
function computeScore(cp) {
  const discount = discountPct(cp.regular_price, cp.sale_price);
  const promoWeight = PROMOTION_WEIGHT[cp.promotion_type] ?? 0;
  const categoryWeight = CATEGORY_IMPORTANCE[cp.category] ?? 0.3;

  const breakdown = {
    featured: cp.merchant_featured ? WEIGHTS.featured : 0,
    promotion_type: Math.round(WEIGHTS.promotion * promoWeight),
    discount: Math.round(WEIGHTS.discount * (discount / 100)),
    campaign_relevance: 0, // no active seasonal campaign in B1
    margin: 0,             // no cost data supplied in B1
    category: Math.round(WEIGHTS.category * categoryWeight),
  };
  breakdown.total = Object.keys(breakdown).reduce((sum, k) => sum + breakdown[k], 0);

  return { score: breakdown.total, discount_pct: discount, breakdown };
}

module.exports = { computeScore, discountPct, WEIGHTS, PROMOTION_WEIGHT, CATEGORY_IMPORTANCE };
