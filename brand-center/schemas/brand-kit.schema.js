// BrandKit jsonb contract -- CANONICAL, matching Social B1's approved
// `brand_kits` table (supabase/migrations/0003_social_content_b1_schema.sql
// on the social-b1 worktree, not yet merged to main). This file does NOT
// define a new table; it defines and validates the shape of the two jsonb
// columns that table already has: `identity` and `writing_rules`.
//
// Versioned so jsonb never becomes a junk drawer: every stored blob
// carries its own schemaVersion, so a future key rename/restructure can
// migrate old rows deliberately instead of silently drifting per-module
// (primaryColor vs primary_color vs mainColor vs brandPrimary -- the
// exact failure mode flagged during review).
//
// Field names below are the reconciled set from the overlap audit: they
// match Social B1's existing fixture keys (name, logoText, primary,
// secondary, accent, headingFont, bodyFont, tone, ctaRules) plus the new
// additive keys Brand Center needs (tagline, writingGuidance,
// preferredTerminology, prohibitedWording). `phone` is deliberately
// ABSENT -- see business-profile.schema.js.

(function () {
const IDENTITY_SCHEMA_VERSION = 1;
const WRITING_RULES_SCHEMA_VERSION = 1;

const IDENTITY_FIELDS = [
  'name', 'logoText', 'logoAssetId',
  'primaryColor', 'secondaryColor', 'accentColor',
  'headingFont', 'bodyFont', 'tagline',
];

const WRITING_RULES_FIELDS = [
  'tone', 'ctaRules', 'writingGuidance',
  'preferredTerminology', 'prohibitedWording',
];

function emptyIdentity() {
  return {
    schemaVersion: IDENTITY_SCHEMA_VERSION,
    name: '', logoText: '', logoAssetId: null,
    primaryColor: '#1a1a1a', secondaryColor: '#666666', accentColor: '#999999',
    headingFont: "'DM Sans', Arial, sans-serif", bodyFont: "'DM Sans', Arial, sans-serif",
    tagline: '',
  };
}

function emptyWritingRules() {
  return {
    schemaVersion: WRITING_RULES_SCHEMA_VERSION,
    tone: '', ctaRules: '', writingGuidance: '',
    preferredTerminology: [], prohibitedWording: [],
  };
}

function validateIdentity(identity) {
  if (!identity || typeof identity !== 'object') throw new Error('BrandKit.identity must be an object');
  if (identity.schemaVersion !== IDENTITY_SCHEMA_VERSION) {
    throw new Error(`BrandKit.identity.schemaVersion ${identity.schemaVersion} does not match expected ${IDENTITY_SCHEMA_VERSION} -- write a migrator, don't silently coerce`);
  }
  if ('phone' in identity) throw new Error('BrandKit.identity must not carry phone -- that belongs on Core businesses (Business Profile), see the overlap-audit finding');
  for (const key of Object.keys(identity)) {
    if (key !== 'schemaVersion' && !IDENTITY_FIELDS.includes(key)) {
      throw new Error(`Unknown BrandKit.identity key "${key}" -- add it to IDENTITY_FIELDS deliberately instead of letting it drift in silently`);
    }
  }
  return true;
}

function validateWritingRules(rules) {
  if (!rules || typeof rules !== 'object') throw new Error('BrandKit.writing_rules must be an object');
  if (rules.schemaVersion !== WRITING_RULES_SCHEMA_VERSION) {
    throw new Error(`BrandKit.writing_rules.schemaVersion ${rules.schemaVersion} does not match expected ${WRITING_RULES_SCHEMA_VERSION}`);
  }
  if (rules.preferredTerminology && !Array.isArray(rules.preferredTerminology)) throw new Error('writing_rules.preferredTerminology must be an array of strings');
  if (rules.prohibitedWording && !Array.isArray(rules.prohibitedWording)) throw new Error('writing_rules.prohibitedWording must be an array of strings');
  for (const key of Object.keys(rules)) {
    if (key !== 'schemaVersion' && !WRITING_RULES_FIELDS.includes(key)) {
      throw new Error(`Unknown BrandKit.writing_rules key "${key}" -- add it to WRITING_RULES_FIELDS deliberately`);
    }
  }
  return true;
}

const api = {
  IDENTITY_SCHEMA_VERSION, WRITING_RULES_SCHEMA_VERSION,
  IDENTITY_FIELDS, WRITING_RULES_FIELDS,
  emptyIdentity, emptyWritingRules,
  validateIdentity, validateWritingRules,
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.NovexBrandCenter = window.NovexBrandCenter || {};
  window.NovexBrandCenter.BrandKit = api;
}

})();