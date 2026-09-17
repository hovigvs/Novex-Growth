// Segmentation — hot / warm / dormant / at_risk / due_for_reorder /
// high_value are DERIVED on read, never stored as a static field. This is
// the direct fix for the conflation found in the audit: a customer
// stored as "warm" stays warm forever unless something remembers to
// recompute it. Manual overrides are supported via a `segment:<name>`
// convention inside the existing `customers.tags` array (no new column)
// -- staff can hand-tag something the rules don't capture, additive to
// the computed list, never replacing it.
//
// Deliberately simple, explainable rules -- no fake ML, per the explicit
// direction that reorder-cadence detection ("Microsoft Toronto: usually
// orders every 36-55 days, 72 days since last order") just needs the
// company's own history used properly, not a model.

(function () {
  var DAY_MS = 24 * 60 * 60 * 1000;
  var HOT_WINDOW_DAYS = 3;
  var AT_RISK_STALL_DAYS = 14;
  var DORMANT_DAYS = 90;
  var DEFAULT_HIGH_VALUE_THRESHOLD = 5000;

  function daysAgo(iso) {
    if (!iso) return Infinity;
    return (Date.now() - new Date(iso).getTime()) / DAY_MS;
  }

  /**
   * @param {Object} customer   { id, lastActivityAt, lifetimeValue, tags }
   * @param {Object[]} opportunities  every Opportunity for this customer (any stage)
   * @param {Object} [options]  { highValueThreshold }
   * @returns {string[]} derived + manual segment labels, recomputed fresh every call
   */
  function computeSegments(customer, opportunities, options) {
    if (!customer) return [];
    opportunities = opportunities || [];
    var opts = options || {};
    var threshold = opts.highValueThreshold || DEFAULT_HIGH_VALUE_THRESHOLD;
    var segments = [];

    var openOpps = opportunities.filter(function (o) { return o.stage !== 'won' && o.stage !== 'lost'; });
    var freshOpp = openOpps.some(function (o) {
      return (o.stage === 'new' || o.stage === 'qualified') && daysAgo(o.createdAt) <= HOT_WINDOW_DAYS;
    });
    if (freshOpp) segments.push('hot');

    var proposalOut = openOpps.some(function (o) { return o.stage === 'proposal_sent'; });
    if (proposalOut) segments.push('warm');

    var stalledOpps = openOpps.filter(function (o) { return o.stage === 'stalled'; });
    if (stalledOpps.length) {
      segments.push('stalled');
      var longStalled = stalledOpps.some(function (o) { return daysAgo(o.stalledSince) >= AT_RISK_STALL_DAYS; });
      if (longStalled) segments.push('at_risk');
    }

    if (openOpps.length === 0 && daysAgo(customer.lastActivityAt) >= DORMANT_DAYS) {
      segments.push('dormant');
    }

    var reorderSignal = computeReorderSignal(opportunities);
    if (reorderSignal && reorderSignal.dueForReorder) segments.push('due_for_reorder');

    if ((customer.lifetimeValue || 0) >= threshold) segments.push('high_value');

    // Manual overrides: `segment:vip` in customers.tags -- additive, never
    // computed away. Reuses the existing tags[] column, no schema change.
    (customer.tags || []).forEach(function (tag) {
      if (typeof tag === 'string' && tag.indexOf('segment:') === 0) {
        var manual = tag.slice('segment:'.length);
        if (manual && segments.indexOf(manual) === -1) segments.push(manual);
      }
    });

    return segments;
  }

  /**
   * "Microsoft Toronto" logic: look at past WON opportunities' timestamps,
   * compute the typical interval between them, compare to time since the
   * most recent one. Plain arithmetic on the business's own history, not
   * a prediction model.
   */
  function computeReorderSignal(opportunities) {
    var won = (opportunities || [])
      .filter(function (o) { return o.stage === 'won' && o.updatedAt; })
      .sort(function (a, b) { return new Date(a.updatedAt) - new Date(b.updatedAt); });
    if (won.length < 2) return null;

    var intervals = [];
    for (var i = 1; i < won.length; i++) {
      intervals.push((new Date(won[i].updatedAt) - new Date(won[i - 1].updatedAt)) / DAY_MS);
    }
    var avgIntervalDays = intervals.reduce(function (s, n) { return s + n; }, 0) / intervals.length;
    var lastOrderDaysAgo = daysAgo(won[won.length - 1].updatedAt);

    return {
      orderCount: won.length,
      avgIntervalDays: Math.round(avgIntervalDays),
      lastOrderDaysAgo: Math.round(lastOrderDaysAgo),
      dueForReorder: lastOrderDaysAgo > avgIntervalDays * 1.3, // 30% past typical cadence
    };
  }

  var api = { computeSegments: computeSegments, computeReorderSignal: computeReorderSignal };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.NovexRevenueEngine = window.NovexRevenueEngine || {};
    window.NovexRevenueEngine.Segmentation = api;
  }
})();
