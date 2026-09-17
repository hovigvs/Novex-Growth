// Revenue Engine store — localStorage-backed CRUD for the demo, same
// demo-mode pattern as Brand Center / Campaign Center. Validates every
// record through the matching schema module before it's ever saved --
// this is the "validate on both persistence paths" rule from the
// Backend Integration plan, applied here even though this path is
// localStorage today, not Supabase: the discipline doesn't wait for a
// real backend to start.
//
// One shared record store per demo business, keyed the same way
// Brand Center/Campaign Center key theirs, so all three modules could
// eventually cross-read the same business's data.

(function () {
  var STORAGE_KEY = 'novex_revenue_engine_demo_business';
  var DEMO_BUSINESS_ID = 'demo-business';

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { leads: [], opportunities: [], activities: [], conversations: [], customers: [] };
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function nextId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  }

  function nowIso() { return new Date().toISOString(); }

  var RE = window.NovexRevenueEngine;

  function createLead(fields) {
    var state = load();
    var lead = Object.assign(RE.Lead.emptyLead(), { businessId: DEMO_BUSINESS_ID }, fields);
    RE.Lead.validateLead(lead);
    lead.id = nextId('lead');
    lead.createdAt = nowIso();
    lead.updatedAt = lead.createdAt;
    state.leads.push(lead);
    save(state);
    return lead;
  }

  function createOpportunity(fields) {
    var state = load();
    var opp = Object.assign(RE.Opportunity.emptyOpportunity(), { businessId: DEMO_BUSINESS_ID }, fields);
    RE.Opportunity.validateOpportunity(opp);
    opp.id = nextId('opp');
    opp.createdAt = nowIso();
    opp.updatedAt = opp.createdAt;
    state.opportunities.push(opp);
    save(state);
    return opp;
  }

  function createActivity(fields) {
    var state = load();
    var activity = Object.assign(RE.Activity.emptyActivity(), { businessId: DEMO_BUSINESS_ID }, fields);
    RE.Activity.validateActivity(activity);
    activity.id = nextId('activity');
    activity.createdAt = nowIso();
    activity.updatedAt = activity.createdAt;
    state.activities.push(activity);
    save(state);
    return activity;
  }

  function createConversation(fields) {
    var state = load();
    var conv = Object.assign(RE.Conversation.emptyConversation(), { businessId: DEMO_BUSINESS_ID }, fields);
    RE.Conversation.validateConversation(conv);
    conv.id = nextId('conv');
    conv.createdAt = nowIso();
    conv.updatedAt = conv.createdAt;
    state.conversations.push(conv);
    save(state);
    return conv;
  }

  function listAll() { return load(); }

  function reset() { save({ leads: [], opportunities: [], activities: [], conversations: [], customers: [] }); }

  window.NovexRevenueEngine = window.NovexRevenueEngine || {};
  window.NovexRevenueEngine.Store = {
    DEMO_BUSINESS_ID: DEMO_BUSINESS_ID,
    createLead: createLead,
    createOpportunity: createOpportunity,
    createActivity: createActivity,
    createConversation: createConversation,
    listAll: listAll,
    reset: reset,
  };
})();
