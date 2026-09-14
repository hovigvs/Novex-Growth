// B1 render script — Node + Playwright (headless Chromium). This is today's
// implementation behind RenderingService; per Revision 3 §10 the engine
// itself never references Playwright/Chromium directly, only this script
// does, so the hosting/backend choice can change later without touching
// planner.js / rendering-service.js.
//
// Produces, per page: a self-contained .html (for direct browser preview),
// a print-accurate .pdf (US Letter), a .png (quick visual check), and a
// .layout.json (the actual structured Layout Plan that produced it, for
// inspection/debugging).

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const { archetypes } = require('./archetypes');
const { planPage } = require('./planner');
const renderingService = require('./rendering-service');
const { arzStyleBrandKit } = require('./brand-kit');
const { campaignProducts } = require('./data/sample-campaign');

const OUT_DIR = path.join(__dirname, '..', 'tests', 'flyer_visuals');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE_META = {
  businessName: 'ABC COMPANY',
  validDates: 'VALID SEP 11 – 17, 2026',
  totalPages: 8,
};

const PAGES = [
  { name: 'b1_hero_grid_v1', archetype: archetypes.hero_plus_grid_page, pool: campaignProducts, pageNumber: 1 },
  { name: 'b1_grocery_dense_v1', archetype: archetypes.grocery_dense_page, pool: campaignProducts, pageNumber: 4 },
];

// Page-level scrollHeight is NOT enough: zones are position:absolute
// inside the content area, so overflowing content inside a zone clips
// silently against that zone's own overflow:hidden boundary without ever
// growing the page's scrollHeight. Checking each .zone individually is
// what actually catches "content taller than its allocated box" -- this
// is the automated version of the getBoundingClientRect() checks done by
// hand earlier this session, extended to catch what page-level checks miss.
async function checkOverflow(page) {
  return page.evaluate(() => {
    const sheet = document.getElementById('pageSheet');
    const rect = sheet.getBoundingClientRect();
    const zones = [...document.querySelectorAll('.zone')].map((z, i) => ({
      index: i,
      clientHeight: z.clientHeight,
      scrollHeight: z.scrollHeight,
      overflowing: z.scrollHeight > z.clientHeight + 1,
    }));
    return {
      pageHeightCSS: Math.round(rect.height),
      pageScrollHeight: sheet.scrollHeight,
      pageLevelOverflow: sheet.scrollHeight > sheet.clientHeight + 1,
      zones,
      anyZoneOverflowing: zones.some(z => z.overflowing),
    };
  });
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  for (const spec of PAGES) {
    const layoutPlan = planPage(spec.archetype, spec.pool);
    const meta = { ...BASE_META, pageNumber: spec.pageNumber };
    const html = renderingService.generate(layoutPlan, arzStyleBrandKit, meta);

    const htmlPath = path.join(OUT_DIR, `${spec.name}.html`);
    const jsonPath = path.join(OUT_DIR, `${spec.name}.layout.json`);
    const pdfPath = path.join(OUT_DIR, `${spec.name}.pdf`);
    const pngPath = path.join(OUT_DIR, `${spec.name}.png`);

    fs.writeFileSync(htmlPath, html);
    fs.writeFileSync(jsonPath, JSON.stringify(layoutPlan, (k, v) => (k === 'merged' ? summarizeMerged(v) : v), 2));

    const page = await browser.newPage();
    await page.setViewportSize({ width: 900, height: 1150 });
    await page.goto('file://' + htmlPath);
    await page.waitForTimeout(300); // let web fonts settle

    const overflow = await checkOverflow(page);
    await page.screenshot({ path: pngPath, fullPage: false });
    await page.pdf({ path: pdfPath, width: '8.5in', height: '11in', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
    await page.close();

    results.push({ name: spec.name, archetype: spec.archetype.key, overflow, unplacedCount: layoutPlan.unplaced.length, unplaced: layoutPlan.unplaced, planZoneBudgets: layoutPlan.zones.map(z => ({ name: z.name, cost_budget: z.cost_budget, remainingBudget: z.remainingBudget })) });
  }

  await browser.close();

  console.log('\n=== B1 render summary ===');
  for (const r of results) {
    console.log(`\n${r.name} (${r.archetype})`);
    console.log(`  page-level overflow: ${r.overflow.pageLevelOverflow}`);
    console.log(`  any zone overflowing: ${r.overflow.anyZoneOverflowing}${r.overflow.anyZoneOverflowing ? '  ' + JSON.stringify(r.overflow.zones.filter(z => z.overflowing)) : ''}`);
    console.log(`  zone budgets: ${JSON.stringify(r.planZoneBudgets)}`);
    console.log(`  unplaced items: ${r.unplacedCount}${r.unplacedCount ? ' -> ' + r.unplaced.map(u => u.name).join(', ') : ''}`);
  }
  console.log(`\nOutput written to ${OUT_DIR}`);
}

function summarizeMerged(m) {
  if (!m || typeof m !== 'object') return m;
  return { id: m.id, sku: m.sku, name: m.name, category: m.category, priority_score: m.priority_score, priority_score_breakdown: m.priority_score_breakdown, discount_pct: m.discount_pct };
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
