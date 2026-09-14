// CreativeProfile jsonb contract -- CANONICAL, matching Social B1's
// approved `creative_profiles` table. Shape matches Social B1's existing
// fixture keys exactly (data/fixtures.js in the social-content-engine),
// unchanged, since it already covers the full Creative Profile spec.
//
// A business may have MANY creative profiles (Premium Editorial, Weekly
// Promotion, Holiday, Corporate, ...) -- `is_default` on the table marks
// the one used when a campaign doesn't pick explicitly. This file
// validates one profile object; the portal UI manages a list of them per
// business.

(function () {
const VISUAL_PREFERENCES_SCHEMA_VERSION = 1;

const VISUAL_PREFERENCES_FIELDS = [
  'visualStyle', 'photographyStyle', 'textDensity', 'logoPlacement',
  'preferredCompositions', 'preferredBackgrounds', 'avoidStyles',
  'imageGenerationGuidance',
];

const TEXT_DENSITIES = ['minimal', 'balanced', 'direct'];

function emptyVisualPreferences() {
  return {
    schemaVersion: VISUAL_PREFERENCES_SCHEMA_VERSION,
    visualStyle: '', photographyStyle: '', textDensity: 'balanced', logoPlacement: '',
    preferredCompositions: [], preferredBackgrounds: [], avoidStyles: [],
    imageGenerationGuidance: '',
  };
}

/**
 * Validates one CreativeProfile.visual_preferences blob. `referenceAssets`
 * is deliberately NOT part of this jsonb -- it's the existing
 * `creative_profile_reference_assets` join table (asset_id + position +
 * notes), reused as-is rather than duplicated into jsonb.
 */
function validateVisualPreferences(prefs) {
  if (!prefs || typeof prefs !== 'object') throw new Error('CreativeProfile.visual_preferences must be an object');
  if (prefs.schemaVersion !== VISUAL_PREFERENCES_SCHEMA_VERSION) {
    throw new Error(`visual_preferences.schemaVersion ${prefs.schemaVersion} does not match expected ${VISUAL_PREFERENCES_SCHEMA_VERSION}`);
  }
  if (!TEXT_DENSITIES.includes(prefs.textDensity)) throw new Error(`visual_preferences.textDensity must be one of ${TEXT_DENSITIES.join(', ')}`);
  for (const listField of ['preferredCompositions', 'preferredBackgrounds', 'avoidStyles']) {
    if (prefs[listField] && !Array.isArray(prefs[listField])) throw new Error(`visual_preferences.${listField} must be an array of strings`);
  }
  for (const key of Object.keys(prefs)) {
    if (key !== 'schemaVersion' && !VISUAL_PREFERENCES_FIELDS.includes(key)) {
      throw new Error(`Unknown visual_preferences key "${key}" -- add it to VISUAL_PREFERENCES_FIELDS deliberately`);
    }
  }
  return true;
}

const api = {
  VISUAL_PREFERENCES_SCHEMA_VERSION, VISUAL_PREFERENCES_FIELDS, TEXT_DENSITIES,
  emptyVisualPreferences, validateVisualPreferences,
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.NovexBrandCenter = window.NovexBrandCenter || {};
  window.NovexBrandCenter.CreativeProfile = api;
}

})();