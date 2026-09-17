// Activity — a follow-up, task, tour, tasting, or other scheduled/completed
// action. This is what reactivation_demo's ad hoc contacted/replied/
// recovered dictionaries and missed_call_recovery's hardcoded Day-2/5/14
// follow-up text should actually become: queryable records instead of
// state that vanishes on reload.
//
// Must reference at least one of leadId/opportunityId/customerId --
// an activity about nothing is not a valid record, same principle as
// Opportunity requiring a customer or lead.

(function () {
  var SCHEMA_VERSION = 1;
  var TYPES = ['call', 'sms', 'email', 'task', 'follow_up', 'tour', 'tasting'];
  var FIELDS = ['businessId', 'leadId', 'opportunityId', 'customerId', 'type', 'dueAt', 'completedAt', 'notes'];

  function emptyActivity() {
    return {
      schemaVersion: SCHEMA_VERSION,
      businessId: null,
      leadId: null,
      opportunityId: null,
      customerId: null,
      type: 'follow_up',
      dueAt: null,
      completedAt: null,
      notes: '',
    };
  }

  function validateActivity(activity) {
    if (!activity || typeof activity !== 'object') throw new Error('Activity must be an object');
    if (activity.schemaVersion !== SCHEMA_VERSION) throw new Error('Activity.schemaVersion ' + activity.schemaVersion + ' does not match expected ' + SCHEMA_VERSION);
    if (!activity.businessId) throw new Error('Activity.businessId is required');
    if (!activity.leadId && !activity.opportunityId && !activity.customerId) {
      throw new Error('Activity must reference at least one of leadId/opportunityId/customerId');
    }
    if (TYPES.indexOf(activity.type) === -1) throw new Error('Activity.type must be one of ' + TYPES.join(', '));
    for (var key in activity) {
      if (key !== 'schemaVersion' && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && FIELDS.indexOf(key) === -1) {
        throw new Error('Unknown Activity key "' + key + '" -- add it to FIELDS deliberately');
      }
    }
    return true;
  }

  var api = { SCHEMA_VERSION: SCHEMA_VERSION, TYPES: TYPES, FIELDS: FIELDS, emptyActivity: emptyActivity, validateActivity: validateActivity };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.NovexRevenueEngine = window.NovexRevenueEngine || {};
    window.NovexRevenueEngine.Activity = api;
  }
})();
