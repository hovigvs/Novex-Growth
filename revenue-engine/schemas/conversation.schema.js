// Conversation — matches Core's existing `conversations` table shape
// exactly (channel, transcript, lead_id/customer_id nullable), plus the
// one addition the audit proposed: opportunityId, nullable -- a follow-up
// call about a stalled proposal is a conversation about an Opportunity,
// not just the original Lead.

(function () {
  var SCHEMA_VERSION = 1;
  var CHANNELS = ['voice', 'chat', 'whatsapp', 'sms', 'email'];
  var FIELDS = ['businessId', 'leadId', 'customerId', 'opportunityId', 'channel', 'transcript'];

  function emptyConversation() {
    return {
      schemaVersion: SCHEMA_VERSION,
      businessId: null,
      leadId: null,
      customerId: null,
      opportunityId: null,
      channel: 'chat',
      transcript: [],
    };
  }

  function validateConversation(conv) {
    if (!conv || typeof conv !== 'object') throw new Error('Conversation must be an object');
    if (conv.schemaVersion !== SCHEMA_VERSION) throw new Error('Conversation.schemaVersion ' + conv.schemaVersion + ' does not match expected ' + SCHEMA_VERSION);
    if (!conv.businessId) throw new Error('Conversation.businessId is required');
    if (CHANNELS.indexOf(conv.channel) === -1) throw new Error('Conversation.channel must be one of ' + CHANNELS.join(', '));
    if (!Array.isArray(conv.transcript)) throw new Error('Conversation.transcript must be an array');
    for (var key in conv) {
      if (key !== 'schemaVersion' && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && FIELDS.indexOf(key) === -1) {
        throw new Error('Unknown Conversation key "' + key + '" -- add it to FIELDS deliberately');
      }
    }
    return true;
  }

  var api = { SCHEMA_VERSION: SCHEMA_VERSION, CHANNELS: CHANNELS, FIELDS: FIELDS, emptyConversation: emptyConversation, validateConversation: validateConversation };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.NovexRevenueEngine = window.NovexRevenueEngine || {};
    window.NovexRevenueEngine.Conversation = api;
  }
})();
