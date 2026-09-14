// Sample campaigns for the demo business, referencing Brand Center's
// sample Creative Profile ids (brand-center/data/sample-brand-center.js)
// so the two modules visibly share live data in the demo, not copies.

const sampleCampaigns = [
  {
    id: 'camp-family-gatherings',
    schemaVersion: 1,
    title: 'Family Gathering Catering — Fall',
    objective: 'Generate family-party catering inquiries',
    offer: 'Catering for gatherings of 10-100 guests',
    audience: 'Local families planning a fall/holiday gathering, 10-100 guests',
    startDate: '2026-09-15', endDate: '2026-11-30',
    brandKitId: 'default', creativeProfileId: 'cp-premium',
    sourceAssetIds: [],
    notes: 'Lean into warm, generous tone -- matches the Premium Editorial creative profile.',
    status: 'active', type: 'catering_promotion',
  },
  {
    id: 'camp-weekly-flyer',
    schemaVersion: 1,
    title: 'Weekly Grocery Specials',
    objective: 'Drive weekly foot traffic with fresh deals',
    offer: 'Rotating weekly discounts on produce, grocery, and prepared foods',
    audience: 'Existing customers within delivery/pickup radius',
    startDate: '2026-09-11', endDate: '2026-09-17',
    brandKitId: 'default', creativeProfileId: 'cp-weekly',
    sourceAssetIds: [],
    notes: 'Recurring weekly cadence -- same Creative Profile every week.',
    status: 'active', type: 'weekly_specials',
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sampleCampaigns };
} else {
  window.NovexCampaignCenter = window.NovexCampaignCenter || {};
  window.NovexCampaignCenter.SampleData = { sampleCampaigns };
}
