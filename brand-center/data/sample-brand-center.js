// Sample, fully-populated Brand Center record -- used as the out-of-the-box
// demo state for brand-center.html, and as a reference for what a
// correctly-shaped canonical record looks like end to end.

const sampleBusinessProfile = {
  name: 'ABC Company',
  industry: 'Grocery & Specialty Foods',
  website: 'https://www.abccompany.ca',
  description: 'A family-run Mediterranean grocery and catering business serving the GTA since 1989.',
  phone: '(416) 555-0100',
  email: 'hello@abccompany.ca',
  address: { street: '720 Bristol Rd W', city: 'Mississauga', region: 'ON', postalCode: 'L4W 1J9', country: 'Canada' },
  socialLinks: { instagram: 'instagram.com/abccompany', facebook: 'facebook.com/abccompany', googleBusiness: '', tiktok: '', whatsapp: '' },
};

const sampleIdentity = {
  schemaVersion: 1,
  name: 'ABC Company', logoText: 'AC', logoAssetId: null,
  primaryColor: '#D31E25', secondaryColor: '#1E8E3E', accentColor: '#1C1C1C',
  headingFont: "'Archivo Black', Arial, sans-serif", bodyFont: "'DM Sans', Arial, sans-serif",
  tagline: 'The essence of Mediterranean gourmet',
};

const sampleWritingRules = {
  schemaVersion: 1,
  tone: 'warm, family-run, generous',
  ctaRules: 'Invitation-led; never sound discount-driven even during sales.',
  writingGuidance: 'Write like a neighbourhood grocer, not a big-box chain. Short sentences. Real ingredient names.',
  preferredTerminology: ['fresh-cut', 'family recipe', 'stocked daily'],
  prohibitedWording: ['cheap', 'bargain bin', 'as seen on TV'],
};

const sampleCreativeProfiles = [
  {
    id: 'cp-premium', name: 'Premium Editorial', isDefault: false,
    visualPreferences: {
      schemaVersion: 1,
      visualStyle: 'premium promotional food editorial', photographyStyle: 'warm directional light, abundant tabletop composition',
      textDensity: 'balanced', logoPlacement: 'bottom right',
      preferredCompositions: ['large food image', 'copy in natural negative space'],
      preferredBackgrounds: ['warm charcoal', 'cream stone'],
      avoidStyles: ['AI-looking food', 'coupon aesthetic'],
      imageGenerationGuidance: 'Natural portions, real food texture, warm restrained palette.',
    },
  },
  {
    id: 'cp-weekly', name: 'Weekly Promotion', isDefault: true,
    visualPreferences: {
      schemaVersion: 1,
      visualStyle: 'grocery-circular direct value', photographyStyle: 'bright, clean packshots and produce',
      textDensity: 'direct', logoPlacement: 'top left',
      preferredCompositions: ['dense grid', 'bold price hierarchy'],
      preferredBackgrounds: ['white', 'light neutral'],
      avoidStyles: ['dark moody lighting', 'ambiguous small text'],
      imageGenerationGuidance: 'High clarity at small thumbnail size is more important than artistry.',
    },
  },
  {
    id: 'cp-holiday', name: 'Holiday', isDefault: false,
    visualPreferences: {
      schemaVersion: 1,
      visualStyle: 'festive seasonal celebration', photographyStyle: 'warm string lights, seasonal props, rich color',
      textDensity: 'balanced', logoPlacement: 'bottom right',
      preferredCompositions: ['full-bleed seasonal banner'],
      preferredBackgrounds: ['deep red', 'evergreen'],
      avoidStyles: ['generic stock holiday clipart'],
      imageGenerationGuidance: 'Specific to the actual holiday and this store\'s real products, not generic clipart.',
    },
  },
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sampleBusinessProfile, sampleIdentity, sampleWritingRules, sampleCreativeProfiles };
} else {
  window.NovexBrandCenter = window.NovexBrandCenter || {};
  window.NovexBrandCenter.SampleData = { sampleBusinessProfile, sampleIdentity, sampleWritingRules, sampleCreativeProfiles };
}
