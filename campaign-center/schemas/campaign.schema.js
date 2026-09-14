// Campaign intent contract -- CANONICAL, belongs on Core `campaigns`
// (extended), per docs/NOVEX_CAMPAIGN_CENTER.md. NOT a new campaign
// model: Social's `social_content_campaigns` and Flyer's
// `campaign_products`/`generated_documents` all key off the same
// `campaigns.id` this shape extends.
//
// Versioned + validated for the same reason brand-center/schemas/*.js
// are: generic campaign intent (title/objective/offer/audience/dates/
// brand+creative selection/notes) must live in exactly one place, not
// drift into a second copy the way Social B1's social_content_campaigns
// already did once (title/objective/offer/brand_kit_id/creative_profile_id
// -- flagged in the overlap audit, trimmed there in a later Social
// migration, not duplicated here).
//
// `sourceAssetIds` models `campaign_source_assets` (already exists,
// reused as-is -- this is an in-memory convenience array for the demo-mode
// UI, not a new table).

(function () {
const CAMPAIGN_SCHEMA_VERSION = 1;

const STATUSES = ['draft', 'scheduled', 'active', 'completed', 'archived'];

const FIELDS = [
  'title', 'objective', 'offer', 'audience',
  'startDate', 'endDate',
  'brandKitId', 'creativeProfileId', 'sourceAssetIds',
  'notes', 'status', 'type',
];

function emptyCampaign() {
  return {
    schemaVersion: CAMPAIGN_SCHEMA_VERSION,
    title: '', objective: '', offer: '', audience: '',
    startDate: '', endDate: '',
    brandKitId: null, creativeProfileId: null, sourceAssetIds: [],
    notes: '', status: 'draft', type: 'general',
  };
}

/**
 * Validates a Campaign intent object. This is Core `campaigns` extension
 * data -- NOT a marketing-generation payload. No channel-specific fields
 * (hashtags, copy, layout plans, etc.) belong here; those stay on the
 * channel-specific tables (Social's platform_variants, Flyer's
 * generated_documents) that key off this same campaign.
 */
function validateCampaign(campaign) {
  if (!campaign || typeof campaign !== 'object') throw new Error('Campaign must be an object');
  if (campaign.schemaVersion !== CAMPAIGN_SCHEMA_VERSION) {
    throw new Error(`Campaign.schemaVersion ${campaign.schemaVersion} does not match expected ${CAMPAIGN_SCHEMA_VERSION}`);
  }
  if (typeof campaign.title !== 'string' || !campaign.title.trim()) throw new Error('Campaign.title is required');
  if (!STATUSES.includes(campaign.status)) throw new Error(`Campaign.status must be one of ${STATUSES.join(', ')}`);
  if (campaign.sourceAssetIds && !Array.isArray(campaign.sourceAssetIds)) throw new Error('Campaign.sourceAssetIds must be an array of asset ids');
  if (campaign.startDate && campaign.endDate && campaign.startDate > campaign.endDate) {
    throw new Error('Campaign.startDate must not be after endDate');
  }
  for (const key of Object.keys(campaign)) {
    if (key !== 'schemaVersion' && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && !FIELDS.includes(key)) {
      throw new Error(`Unknown Campaign key "${key}" -- add it to FIELDS deliberately instead of letting it drift in silently`);
    }
  }
  const warnings = [];
  if (!campaign.brandKitId) warnings.push('No Brand Kit selected.');
  if (!campaign.creativeProfileId) warnings.push('No Creative Profile selected.');
  if (!campaign.sourceAssetIds || campaign.sourceAssetIds.length === 0) warnings.push('No source assets selected.');
  return { valid: true, warnings };
}

const api = { CAMPAIGN_SCHEMA_VERSION, STATUSES, FIELDS, emptyCampaign, validateCampaign };
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.NovexCampaignCenter = window.NovexCampaignCenter || {};
  window.NovexCampaignCenter.Campaign = api;
}

})();