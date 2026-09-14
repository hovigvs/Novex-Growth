// RenderingService — Revision 3 §10. Provider-agnostic interface: the
// engine calls RenderingService.generate(layoutPlan, brandKit, meta) and
// gets back a self-contained HTML string. What turns that HTML into a
// PDF/PNG (headless Chromium today, per render.js) is a separate concern
// this module knows nothing about -- swap the capture step later without
// touching this file.

const components = require('./components');

function renderZoneContent(zone, brandKit) {
  const { instances } = zone;
  if (instances.length === 0) return '';

  // A zone whose instances are hero/double components fills as a flex row
  // of full-height boxes (1 or 2 side by side).
  const heroLike = instances.filter(i => i.component === 'hero' || i.component === 'double');
  if (heroLike.length === instances.length) {
    const boxes = instances.map(inst => {
      const html = inst.component === 'hero'
        ? components.heroProduct(inst.merged, brandKit, 'left_image')
        : components.doubleProduct(inst.merged, brandKit);
      return `<div style="flex:1;height:100%;">${html}</div>`;
    }).join('');
    return `<div style="display:flex;gap:0.08in;height:100%;padding:0.06in 0.22in;">${boxes}</div>`;
  }

  // Otherwise it's a grid-flow zone: category headers span the full row,
  // hot deals take 2 grid columns (wider card), standard products take 1.
  const cells = instances.map(inst => {
    if (inst.component === 'categoryHeader') {
      return `<div class="full-row">${components.categoryHeader(inst.categoryName, brandKit)}</div>`;
    }
    if (inst.component === 'hotDeal') {
      return `<div style="grid-column:span 2;">${components.hotDeal(inst.merged, brandKit)}</div>`;
    }
    return `<div>${components.standardProduct(inst.merged, brandKit)}</div>`;
  }).join('');
  return `<div class="grid-flow" style="padding:0.04in 0.22in;">${cells}</div>`;
}

function renderZone(zone, brandKit) {
  const style = `left:${zone.x * 100}%;top:${zone.y * 100}%;width:${zone.width * 100}%;height:${zone.height * 100}%;`;
  return `<div class="zone" style="${style}">${renderZoneContent(zone, brandKit)}</div>`;
}

/**
 * @param {Object} layoutPlan  from planner.js: { archetypeKey, zones }
 * @param {Object} brandKit
 * @param {Object} meta  { businessName, validDates, pageNumber, totalPages }
 * @returns {string} full self-contained HTML document
 */
function generate(layoutPlan, brandKit, meta) {
  const zonesHtml = layoutPlan.zones.map(z => renderZone(z, brandKit)).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Weekly Flyer — ${layoutPlan.archetypeKey} — Page ${meta.pageNumber}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=DM+Sans:wght@400;500;600;700;800;900&display=swap"/>
<style>${components.styles(brandKit)}</style>
</head>
<body>
<div class="page" id="pageSheet">
  ${components.masthead(brandKit, meta)}
  <div class="content-area">
    ${zonesHtml}
  </div>
  ${components.footer(brandKit)}
</div>
</body>
</html>`;
}

module.exports = { generate };
