// BrandKit — flyer styling belongs to the merchant, not to Novex.
// Every component template (components.js) takes a BrandKit and reads its
// tokens instead of hardcoding colors/fonts, so a different store's flyer
// can look completely different through the exact same layout engine.
//
// Shape (Revision 3 §"BrandKit", minimum fields):
//   logo, primaryColor, secondaryColor, accentColor,
//   headingFont, bodyFont, priceFont,
//   categoryHeaderStyle, badgeStyle, priceStyle, borderStyle, footerStyle

/**
 * @typedef {Object} BrandKit
 * @property {string} name
 * @property {string} logoText          - text/initials fallback (a real logo image is a Phase B3+ concern)
 * @property {string} primaryColor
 * @property {string} secondaryColor
 * @property {string} accentColor
 * @property {string} inkColor          - primary body/price text color
 * @property {string} headingFont
 * @property {string} bodyFont
 * @property {string} priceFont
 * @property {Object} categoryHeaderStyle - { background, color }
 * @property {Object} badgeStyle          - { hot, save, new } each a background color
 * @property {Object} priceStyle          - { regularColor, saleColor }
 * @property {Object} borderStyle         - { color, width }
 * @property {Object} footerStyle         - { background, color }
 * @property {string} storePhone
 * @property {string} storeWebsite
 */

// Sample brand kit #1 — modeled directly on the real ARZ reference's
// red/black/white grocery-circular identity (the look we validated this
// session as actually reading like a real weekly flyer, not a boutique
// brochure). This is what B1 renders against, so the visual bar is the
// real thing, not an abstraction.
const arzStyleBrandKit = {
  name: 'ARZ Fine Foods (style reference)',
  logoText: 'AF',
  primaryColor: '#D31E25',      // red — deals, category accents
  secondaryColor: '#1E8E3E',    // green — produce category band
  accentColor: '#1C1C1C',       // near-black — grocery category band, footer
  inkColor: '#1a1a1a',
  headingFont: "'Archivo Black', Arial, sans-serif",
  bodyFont: "'DM Sans', Arial, sans-serif",
  priceFont: "'Archivo Black', Arial, sans-serif",
  categoryHeaderStyle: { background: '#1E8E3E', color: '#ffffff' },
  badgeStyle: { hot: '#1C1C1C', save: '#D31E25', new: '#C98A12' },
  priceStyle: { regularColor: '#999999', saleColor: '#D31E25', normalColor: '#1a1a1a' },
  borderStyle: { color: '#dddddd', width: '1px' },
  footerStyle: { background: '#1C1C1C', color: '#ffffff' },
  storePhone: '(416) 555-0100',
  storeWebsite: 'abccompany.ca',
};

module.exports = { arzStyleBrandKit };
