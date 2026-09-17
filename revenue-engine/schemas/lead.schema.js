// Lead — a narrower acquisition-event entity than Core's current
// `leads.status` (hot/warm/cold/past). Per the Revenue Engine
// consolidation audit, status here describes ONLY a Lead's own
// qualification lifecycle. Hot/warm/cold/past never appear here again --
// those were customer-segmentation and opportunity-stage concepts wrongly
// living on this table. A Lead becomes zero or more Opportunities
// (Opportunity.leadId); it is never itself "reactivated" -- a dormant
// customer gets a new Opportunity directly, no Lead involved.

(function () {
  var SCHEMA_VERSION = 1;
  var STATUSES = ['new', 'contacted', 'qualified', 'disqualified', 'converted'];
  var FIELDS = ['businessId', 'customerId', 'source', 'status', 'notes'];

  function emptyLead() {
    return {
      schemaVersion: SCHEMA_VERSION,
      businessId: null,
      customerId: null, // set only if this inquiry came from someone already a Customer
      source: '',
      status: 'new',
      notes: '',
    };
  }

  function validateLead(lead) {
    if (!lead || typeof lead !== 'object') throw new Error('Lead must be an object');
    if (lead.schemaVersion !== SCHEMA_VERSION) throw new Error('Lead.schemaVersion ' + lead.schemaVersion + ' does not match expected ' + SCHEMA_VERSION);
    if (!lead.businessId) throw new Error('Lead.businessId is required -- every entity is tenant-owned');
    if (STATUSES.indexOf(lead.status) === -1) throw new Error('Lead.status must be one of ' + STATUSES.join(', '));
    for (var key in lead) {
      if (key !== 'schemaVersion' && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && FIELDS.indexOf(key) === -1) {
        throw new Error('Unknown Lead key "' + key + '" -- add it to FIELDS deliberately instead of letting it drift in silently');
      }
    }
    return true;
  }

  var api = { SCHEMA_VERSION: SCHEMA_VERSION, STATUSES: STATUSES, FIELDS: FIELDS, emptyLead: emptyLead, validateLead: validateLead };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.NovexRevenueEngine = window.NovexRevenueEngine || {};
    window.NovexRevenueEngine.Lead = api;
  }
})();
