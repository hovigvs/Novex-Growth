// Business Profile — Core `businesses` fields owned exclusively by Brand
// Center. NOT part of brand_kits.identity. This is the fix for the
// phone-ownership issue found during the overlap audit: phone/email/
// website/address/social_links/industry/description live here, on the
// business itself, so every engine (Social, Flyer, Email, WhatsApp,
// Receptionist) reads ONE copy via business_id instead of each keeping
// its own.
//
// Schema version note: unlike the jsonb-backed BrandKit/CreativeProfile
// contracts, these are real (proposed) Core `businesses` columns, so this
// file documents the shape the eventual migration/UI must agree on -- it
// isn't itself a versioned jsonb blob. No migration has been written yet
// (see docs/NOVEX_BRAND_CENTER.md "Migration history stays linear").

(function () {
const SCHEMA_VERSION = 1;

const FIELDS = [
  'name', 'industry', 'website', 'description',
  'phone', 'email', 'address', 'socialLinks',
];

function emptyBusinessProfile() {
  return {
    name: '',
    industry: '',
    website: '',
    description: '',
    phone: '',
    email: '',
    address: { street: '', city: '', region: '', postalCode: '', country: '' },
    socialLinks: { instagram: '', facebook: '', googleBusiness: '', tiktok: '', whatsapp: '' },
  };
}

/**
 * Validates a Business Profile object. Throws on structural problems;
 * returns a list of soft warnings for merchant-facing incompleteness
 * (missing fields are not fatal -- a business can be saved partially
 * configured, same as every other Novex demo module).
 */
function validateBusinessProfile(profile) {
  if (!profile || typeof profile !== 'object') throw new Error('BusinessProfile must be an object');
  if (typeof profile.name !== 'string' || !profile.name.trim()) throw new Error('BusinessProfile.name is required');
  if (profile.address && typeof profile.address !== 'object') throw new Error('BusinessProfile.address must be an object');
  if (profile.socialLinks && typeof profile.socialLinks !== 'object') throw new Error('BusinessProfile.socialLinks must be an object');

  const warnings = [];
  if (!profile.phone) warnings.push('No phone number set — CTAs across Flyer/Social/WhatsApp will omit it.');
  if (!profile.email) warnings.push('No email set.');
  if (!profile.industry) warnings.push('No industry set — affects category-importance defaults elsewhere (e.g. Flyer scoring).');
  return { valid: true, warnings };
}

const api = { SCHEMA_VERSION, FIELDS, emptyBusinessProfile, validateBusinessProfile };
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  window.NovexBrandCenter = window.NovexBrandCenter || {};
  window.NovexBrandCenter.BusinessProfile = api;
}

})();