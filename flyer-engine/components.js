// Component library — Revision 3 §5. B1 builds 6 of the eventual 16:
// Hero Product, Standard Product, Hot Deal, Double Product, Category
// Header, Footer. Every function is a fixed deterministic template taking
// (mergedProduct, brandKit, variant) — no free-form generation, ever. The
// CSS design language here is the same grocery-circular system validated
// earlier this session against the real ARZ reference (flat masthead,
// solid category bars, thin grid rules, bold price treatment) — just
// parameterized through BrandKit tokens instead of hardcoded colors.

function fmt(n) {
  return '$' + Number(n).toFixed(2);
}

// B1.1: renders a real <img> when the merged product carries a `photo` URL
// (manually-sourced real product photography, per B1.1 scope -- test
// fixture only, NOT the automated Asset Preparation Pipeline), falling
// back to the B1 emoji placeholder otherwise. object-fit:cover crops to
// fill the box regardless of the source photo's own aspect ratio, which is
// deliberate: real photos come in wildly different shapes (a produce shot
// vs. a tall bottle vs. a wide platter) and part of what B1.1 is meant to
// reveal is whether that cropping reads as consistent or breaks rhythm.
function imageBox(m) {
  if (m.photo) return `<img src="${m.photo}" alt="${m.name}" style="width:100%;height:100%;object-fit:cover;display:block;"/>`;
  return m.icon || '🛒';
}

function styles(brandKit) {
  return `
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{background:#ccc;font-family:${brandKit.bodyFont};color:${brandKit.inkColor};}
  .page{width:8.5in;height:11in;margin:0 auto 30px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);position:relative;overflow:hidden;}
  @media print{ html,body{background:#fff;} .page{margin:0;box-shadow:none;} }
  @page{ size: letter; margin: 0; }

  .masthead{background:#fff;padding:0.14in 0.24in;display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid ${brandKit.primaryColor};}
  .m-left{display:flex;align-items:center;gap:10px;}
  .m-logo-mark{width:34px;height:34px;border-radius:50%;background:${brandKit.primaryColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;flex-shrink:0;}
  .m-name{font-family:${brandKit.headingFont};font-size:22px;line-height:1;letter-spacing:-.01em;}
  .m-tag{font-size:9.5px;color:#666;margin-top:2px;}
  .m-right{text-align:right;}
  .m-dates{font-size:10px;font-weight:800;background:${brandKit.inkColor};color:#fff;padding:5px 11px;border-radius:3px;white-space:nowrap;}
  .m-page{font-size:8.5px;color:#888;margin-top:4px;}

  .content-area{position:relative;width:100%;height:calc(100% - 0.72in - 0.5in);}
  .zone{position:absolute;overflow:hidden;}

  .category-header{color:#fff;font-family:${brandKit.headingFont};font-size:13px;letter-spacing:.02em;text-transform:uppercase;padding:5px 10px;margin-bottom:6px;}

  .hero-product{border:1.5px solid ${brandKit.inkColor};display:flex;height:100%;position:relative;background:#fff;}
  .hero-product.left_image{flex-direction:row;}
  .hero-product.right_image{flex-direction:row-reverse;}
  .hero-product .h-img{flex:0 0 42%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:72px;overflow:hidden;}
  .hero-product .h-body{flex:1;padding:14px 16px;display:flex;flex-direction:column;justify-content:center;}
  .hero-product .h-badge{position:absolute;top:-9px;left:14px;background:${brandKit.badgeStyle.hot};color:#fff;font-size:9px;font-weight:800;letter-spacing:.04em;padding:3px 10px;text-transform:uppercase;}
  .hero-product .h-name{font-size:19px;font-weight:800;line-height:1.15;margin-bottom:4px;}
  .hero-product .h-desc{font-size:10.5px;color:#555;margin-bottom:6px;line-height:1.4;}
  .hero-product .h-serves{font-size:9.5px;color:#777;margin-bottom:6px;}
  .hero-product .h-was{font-size:11px;color:${brandKit.priceStyle.regularColor};text-decoration:line-through;}
  .hero-product .h-now{font-family:${brandKit.priceFont};font-size:38px;font-weight:900;color:${brandKit.priceStyle.saleColor};line-height:1;}
  .hero-product .h-pct{display:inline-block;margin-top:4px;font-size:10px;font-weight:800;color:#fff;background:${brandKit.badgeStyle.save};padding:2px 8px;}

  .double-product{border:1.5px solid ${brandKit.inkColor};display:flex;align-items:center;height:100%;background:#fff;position:relative;padding:8px 10px;gap:10px;}
  .double-product .d-badge{position:absolute;top:-8px;left:10px;background:${brandKit.badgeStyle.hot};color:#fff;font-size:7.5px;font-weight:800;letter-spacing:.04em;padding:2px 8px;text-transform:uppercase;}
  .double-product .d-img{flex:0 0 78px;width:78px;height:78px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:40px;overflow:hidden;}
  .double-product .d-body{flex:1;min-width:0;}
  .double-product .d-name{font-size:13px;font-weight:800;line-height:1.2;margin-bottom:2px;}
  .double-product .d-desc{font-size:8.5px;color:#555;line-height:1.35;margin-bottom:3px;}
  .double-product .d-serves{font-size:8px;color:#777;margin-bottom:2px;}
  .double-product .d-price{display:flex;align-items:baseline;gap:6px;}
  .double-product .d-was{font-size:9.5px;color:${brandKit.priceStyle.regularColor};text-decoration:line-through;}
  .double-product .d-now{font-family:${brandKit.priceFont};font-size:24px;font-weight:900;color:${brandKit.priceStyle.saleColor};}

  .hot-deal{background:#fff;border:1.5px solid ${brandKit.inkColor};padding:8px 9px;display:flex;align-items:center;gap:8px;position:relative;height:100%;}
  .hot-deal .label{position:absolute;top:-8px;left:8px;background:${brandKit.inkColor};color:#fff;font-size:7px;font-weight:800;letter-spacing:.04em;padding:2px 7px;text-transform:uppercase;}
  .hot-deal .thumb{width:50px;height:50px;background:#f2f2f2;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;overflow:hidden;}
  .hot-deal .info{flex:1;min-width:0;}
  .hot-deal .name{font-size:10px;font-weight:700;line-height:1.15;}
  .hot-deal .size{font-size:7.5px;color:#777;}
  .hot-deal .price{text-align:right;flex-shrink:0;}
  .hot-deal .was{font-size:7.5px;color:${brandKit.priceStyle.regularColor};text-decoration:line-through;}
  .hot-deal .now{font-family:${brandKit.priceFont};font-size:22px;font-weight:900;color:${brandKit.priceStyle.saleColor};line-height:1;}

  .standard-product{border:1px solid ${brandKit.borderStyle.color};padding:6px 4px 7px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;position:relative;background:#fff;}
  .standard-product .badge{position:absolute;top:3px;left:3px;font-size:6.5px;font-weight:800;padding:2px 5px;color:#fff;letter-spacing:.02em;}
  .standard-product .thumb{width:46px;height:46px;margin:2px auto 4px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;overflow:hidden;}
  .standard-product .name{font-size:8px;font-weight:700;line-height:1.15;min-height:20px;text-transform:uppercase;}
  .standard-product .size{font-size:6.5px;color:#888;margin:1px 0 3px;}
  .standard-product .was{font-size:7px;color:${brandKit.priceStyle.regularColor};text-decoration:line-through;}
  .standard-product .now{font-family:${brandKit.priceFont};font-size:17px;font-weight:900;line-height:1;}
  .standard-product .now.on-sale{color:${brandKit.priceStyle.saleColor};}
  .standard-product .now.regular{color:${brandKit.priceStyle.normalColor};}

  .grid-flow{display:grid;grid-template-columns:repeat(5,1fr);gap:0;height:100%;align-content:start;}
  .grid-flow .full-row{grid-column:1 / -1;}

  .flyer-footer{position:absolute;bottom:0;left:0;right:0;height:0.5in;background:${brandKit.footerStyle.background};color:${brandKit.footerStyle.color};padding:0 0.3in;display:flex;justify-content:space-between;align-items:center;font-size:8.5px;}
  .flyer-footer b{font-family:${brandKit.headingFont};font-size:10px;}
  `;
}

function masthead(brandKit, meta) {
  return `
  <div class="masthead">
    <div class="m-left">
      <div class="m-logo-mark">${brandKit.logoText}</div>
      <div>
        <div class="m-name">${meta.businessName}</div>
        <div class="m-tag">Weekly flyer &middot; generated by Novex Growth</div>
      </div>
    </div>
    <div class="m-right">
      <div class="m-dates">${meta.validDates}</div>
      <div class="m-page">Page ${meta.pageNumber} of ${meta.totalPages}</div>
    </div>
  </div>`;
}

function footer(brandKit) {
  return `
  <div class="flyer-footer">
    <div><b>Order online or in-store</b> &middot; Prices valid while supplies last</div>
    <div>${brandKit.storePhone} &middot; ${brandKit.storeWebsite}</div>
  </div>`;
}

function categoryHeader(name, brandKit) {
  return `<div class="category-header" style="background:${brandKit.categoryHeaderStyle.background}">${name}</div>`;
}

function heroProduct(m, brandKit, variant = 'left_image') {
  const badge = m.promotion_type === 'hot_deal' ? 'Hot Deal' : (m.promotion_type === 'new' ? 'New' : null);
  return `
  <div class="hero-product ${variant}">
    ${badge ? `<span class="h-badge">${badge}</span>` : ''}
    <div class="h-img">${imageBox(m)}</div>
    <div class="h-body">
      <div class="h-name">${m.name}</div>
      ${m.requires_description && m.description ? `<div class="h-desc">${m.description}</div>` : ''}
      ${m.requires_serving_count && m.serving_count ? `<div class="h-serves">${m.serving_count}</div>` : ''}
      ${m.sale_price ? `<div class="h-was">${fmt(m.regular_price)}</div>` : ''}
      <div class="h-now">${fmt(m.sale_price || m.regular_price)}</div>
      ${m.discount_pct ? `<div class="h-pct">SAVE ${m.discount_pct}%</div>` : ''}
    </div>
  </div>`;
}

function doubleProduct(m, brandKit) {
  const badge = m.promotion_type === 'hot_deal' ? 'Hot Deal' : (m.promotion_type === 'new' ? 'New' : null);
  return `
  <div class="double-product">
    ${badge ? `<span class="d-badge">${badge}</span>` : ''}
    <div class="d-img">${imageBox(m)}</div>
    <div class="d-body">
      <div class="d-name">${m.name}</div>
      ${m.requires_description && m.description ? `<div class="d-desc">${m.description}</div>` : ''}
      ${m.requires_serving_count && m.serving_count ? `<div class="d-serves">${m.serving_count}</div>` : ''}
      <div class="d-price">
        ${m.sale_price ? `<span class="d-was">${fmt(m.regular_price)}</span>` : ''}
        <span class="d-now">${fmt(m.sale_price || m.regular_price)}</span>
      </div>
    </div>
  </div>`;
}

function hotDeal(m, brandKit) {
  return `
  <div class="hot-deal">
    <span class="label">Hot Deal</span>
    <div class="thumb">${imageBox(m)}</div>
    <div class="info">
      <div class="name">${m.name}</div>
      <div class="size">${m.unit}</div>
    </div>
    <div class="price">
      ${m.sale_price ? `<div class="was">${fmt(m.regular_price)}</div>` : ''}
      <div class="now">${fmt(m.sale_price || m.regular_price)}</div>
    </div>
  </div>`;
}

function standardProduct(m, brandKit) {
  const isSale = !!m.sale_price;
  let badgeHtml = '';
  if (m.promotion_type === 'new') badgeHtml = `<span class="badge" style="background:${brandKit.badgeStyle.new}">NEW</span>`;
  else if (isSale && m.discount_pct > 0) badgeHtml = `<span class="badge" style="background:${brandKit.badgeStyle.save}">SAVE ${m.discount_pct}%</span>`;
  return `
  <div class="standard-product">
    ${badgeHtml}
    <div class="thumb">${imageBox(m)}</div>
    <div class="name">${m.name}</div>
    <div class="size">${m.unit}</div>
    ${isSale ? `<div class="was">${fmt(m.regular_price)}</div>` : ''}
    <div class="now ${isSale ? 'on-sale' : 'regular'}">${fmt(m.sale_price || m.regular_price)}</div>
  </div>`;
}

module.exports = { styles, masthead, footer, categoryHeader, heroProduct, doubleProduct, hotDeal, standardProduct, fmt };
