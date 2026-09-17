// Opportunity — a specific commercial/revenue possibility. Does NOT
// require a Lead (leadId is nullable): a dormant-customer reactivation or
// a corporate reorder creates an Opportunity directly on an existing
// Customer, per the locked rule that a reactivated customer is not a
// new Lead. One Lead may produce zero or many Opportunities.
//
// Stalled state uses explicit stalledSince/stalledReason, never a
// boolean. lostReason is required once stage='lost', and
// 'explicit_decline' specifically suppresses automatic recovery
// (recovery logic must check this -- not enforced here, since no
// recovery logic exists yet, but the field exists for it to check).

(function () {
  var SCHEMA_VERSION = 1;
  var STAGES = ['new', 'qualified', 'proposal_sent', 'stalled', 'won', 'lost'];
  var LOST_REASONS = ['date_unavailable', 'budget', 'explicit_decline', 'competitor', 'capacity', 'ghosted', 'other'];
  var FIELDS = [
    'businessId', 'customerId', 'leadId', 'stage', 'estimatedValue',
    'stalledSince', 'stalledReason', 'lostReason', 'sourceCampaignId', 'notes',
  ];

  function emptyOpportunity() {
    return {
      schemaVersion: SCHEMA_VERSION,
      businessId: null,
      customerId: null,
      leadId: null, // nullable on purpose -- reactivation/reorder opportunities have no lead
      stage: 'new',
      estimatedValue: 0,
      stalledSince: null,
      stalledReason: '',
      lostReason: null,
      sourceCampaignId: null, // immutable once set -- see opportunity_campaign_touches for later recovery touches
      notes: '',
    };
  }

  function validateOpportunity(opp) {
    if (!opp || typeof opp !== 'object') throw new Error('Opportunity must be an object');
    if (opp.schemaVersion !== SCHEMA_VERSION) throw new Error('Opportunity.schemaVersion ' + opp.schemaVersion + ' does not match expected ' + SCHEMA_VERSION);
    if (!opp.businessId) throw new Error('Opportunity.businessId is required');
    if (!opp.customerId && !opp.leadId) throw new Error('Opportunity must reference at least a customerId or a leadId -- an opportunity about nobody is not a valid record');
    if (STAGES.indexOf(opp.stage) === -1) throw new Error('Opportunity.stage must be one of ' + STAGES.join(', '));
    if (opp.stage === 'lost' && !opp.lostReason) throw new Error('Opportunity.lostReason is required once stage is "lost" -- losses must be explained, not just recorded');
    if (opp.lostReason && LOST_REASONS.indexOf(opp.lostReason) === -1) throw new Error('Opportunity.lostReason must be one of ' + LOST_REASONS.join(', '));
    if (opp.stage === 'stalled' && !opp.stalledSince) throw new Error('Opportunity.stalledSince is required once stage is "stalled"');
    for (var key in opp) {
      if (key !== 'schemaVersion' && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && FIELDS.indexOf(key) === -1) {
        throw new Error('Unknown Opportunity key "' + key + '" -- add it to FIELDS deliberately');
      }
    }
    return true;
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION, STAGES: STAGES, LOST_REASONS: LOST_REASONS, FIELDS: FIELDS,
    emptyOpportunity: emptyOpportunity, validateOpportunity: validateOpportunity,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.NovexRevenueEngine = window.NovexRevenueEngine || {};
    window.NovexRevenueEngine.Opportunity = api;
  }
})();
