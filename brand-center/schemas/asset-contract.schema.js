// Asset representation contract -- shared Core infrastructure. This does
// NOT propose a new table: it defines the shape that lives inside the
// existing Core `assets.metadata` jsonb column (0001_core_schema.sql),
// so Social, Flyer, Website, Email etc. all describe an asset the same
// way instead of each growing its own asset-library concept.
//
// B1 populates a subset of this shape (type, roles, tags, source,
// immutable original) manually on upload. Fields like `depicts`,
// `quality`, and `derivatives` are architected for here but populated by
// later work (Flyer's Asset Preparation Pipeline, Social's rendering
// outputs) -- not built in Brand Center B1 itself, per "do not build
// advanced media analysis in Brand Center B1."

(function () {
const ASSET_METADATA_SCHEMA_VERSION = 1;

const ROLES = ['logo', 'product', 'hero', 'catering', 'social', 'website', 'reference', 'other'];
const ORIENTATIONS = ['landscape', 'portrait', 'square', 'unknown'];
const SOURCES = ['merchant_upload', 'website_import', 'generated', 'stock'];

function emptyAssetMetadata() {
  return {
    schemaVersion: ASSET_METADATA_SCHEMA_VERSION,
    roles: [],              // what can this asset be used for -- e.g. ['product','social']
    tags: [],                // free-text descriptive tags -- e.g. ['hummus','mediterranean-food']
    orientation: 'unknown',
    source: 'merchant_upload',
    depicts: '',              // short human/AI description of the subject, optional in B1
    quality: null,             // reserved for the future Asset Preparation Pipeline (excellent/acceptable/poor/missing)
    immutable: true,          // the ORIGINAL upload is never modified in place
    derivatives: [],          // [{ kind: 'instagram_4x5' | 'story_9x16' | 'flyer_cutout', assetId }]
    usedInCampaigns: [],      // campaign_id[] -- denormalized convenience, source of truth stays the join tables
  };
}

function validateAssetMetadata(meta) {
  if (!meta || typeof meta !== 'object') throw new Error('asset metadata must be an object');
  if (meta.schemaVersion !== ASSET_METADATA_SCHEMA_VERSION) {
    throw new Error(`asset metadata schemaVersion ${meta.schemaVersion} does not match expected ${ASSET_METADATA_SCHEMA_VERSION}`);
  }
  if (meta.roles && (!Array.isArray(meta.roles) || meta.roles.some(r => !ROLES.includes(r)))) {
    throw new Error(`asset metadata.roles must only contain: ${ROLES.join(', ')}`);
  }
  if (meta.orientation && !ORIENTATIONS.includes(meta.orientation)) throw new Error(`asset metadata.orientation must be one of ${ORIENTATIONS.join(', ')}`);
  if (meta.source && !SOURCES.includes(meta.source)) throw new Error(`asset metadata.source must be one of ${SOURCES.join(', ')}`);
  if (meta.immutable !== true) throw new Error('asset metadata.immutable must be true -- originals are never modified in place; a derivative is a new asset row');
  return true;
}

const api = {
  ASSET_METADATA_SCHEMA_VERSION, ROLES, ORIENTATIONS, SOURCES,
  emptyAssetMetadata, validateAssetMetadata,
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.NovexBrandCenter = window.NovexBrandCenter || {};
  window.NovexBrandCenter.AssetContract = api;
}

})();