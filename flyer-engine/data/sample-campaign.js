// Realistic synthetic campaign data, modeled on the real ARZ reference
// flyer (categories/items match what we actually observed across its 8
// pages this session — Produce Deals, Grocery, Hot Deals) rather than
// invented generic items. Mirrors the products / campaign_products split
// from 0002_flyer_engine_schema.sql: `products` is catalog identity,
// `campaign_products` is this campaign's price snapshot + scoring inputs.
//
// NOTE: these are plain JS objects for the B1 proof, not database rows.
// Field names deliberately match the schema so wiring a real DB in later
// is a drop-in, not a redesign.

// `icon` is an emoji placeholder standing in for a real product photo --
// the Asset Preparation Pipeline (real photos, background classification,
// safe-crop) is explicitly B4 scope, not B1. Using emoji here keeps this
// slice honest about what it's proving (layout/scoring/rendering) without
// pretending photography is solved.
const products = [
  { id: 'p1', sku: '9001', name: 'Falafel Plate + Free Pop Can', category: 'Prepared Foods', brand: 'ARZ', unit: 'ea', icon: '🧆' },
  { id: 'p2', sku: '9002', name: 'ARZ Virgin Olive Oil 2.88L', category: 'Grocery', brand: 'ARZ', unit: 'ea', icon: '🫒' },
  { id: 'p3', sku: '9003', name: 'BBQ Chicken Family Platter', category: 'Prepared Foods', brand: 'ARZ', unit: 'ea', icon: '🍗' },
  { id: 'p4', sku: '1001', name: 'Field Tomatoes', category: 'Produce', brand: null, unit: '/lb', icon: '🍅' },
  { id: 'p5', sku: '1002', name: 'Mini Cucumbers', category: 'Produce', brand: null, unit: '/lb', icon: '🥒' },
  { id: 'p6', sku: '1003', name: 'Clementine Loose', category: 'Produce', brand: null, unit: '/lb', icon: '🍊' },
  { id: 'p7', sku: '1004', name: 'Golden Delicious Apples', category: 'Produce', brand: null, unit: '/lb', icon: '🍏' },
  { id: 'p8', sku: '1005', name: 'Seedless Grapes', category: 'Produce', brand: null, unit: '/lb', icon: '🍇' },
  { id: 'p9', sku: '2001', name: 'Basmati Rice 8.82lb', category: 'Grocery', brand: 'Al Shalan', unit: 'ea', icon: '🍚' },
  { id: 'p10', sku: '2002', name: 'Pure Desi Ghee 800g', category: 'Grocery', brand: 'Nanak', unit: 'ea', icon: '🧈' },
  { id: 'p11', sku: '2003', name: 'Honey 1Kg', category: 'Grocery', brand: 'Casablanca', unit: 'ea', icon: '🍯' },
  { id: 'p12', sku: '2004', name: 'Sugar-Free Baklava 600g', category: 'Grocery', brand: 'ARZ', unit: 'ea', icon: '🍯' },
  { id: 'p13', sku: '2005', name: 'Haloumi Cheese 400g', category: 'Grocery', brand: null, unit: 'ea', icon: '🧀' },
  { id: 'p14', sku: '2006', name: 'Mixed Pickles 1L', category: 'Grocery', brand: 'Al Dayaa', unit: 'ea', icon: '🥒' },
  { id: 'p15', sku: '2007', name: 'Pitted Dates 500g', category: 'Grocery', brand: 'ARZ', unit: 'ea', icon: '🍯' },
  { id: 'p16', sku: '2008', name: 'Selected Pasta 450g', category: 'Grocery', brand: 'Arbella', unit: '4 for', icon: '🍝' },
  { id: 'p17', sku: '2009', name: 'Instant Noodles 30pk', category: 'Grocery', brand: 'Indomie', unit: 'ea', icon: '🍜' },
  { id: 'p18', sku: '2010', name: 'Jumbo Eggs 20pcs', category: 'Grocery', brand: 'Vital-V', unit: 'ea', icon: '🥚' },
  { id: 'p19', sku: '2011', name: 'Balkan Yogurt 1.8Kg', category: 'Grocery', brand: 'ARZ', unit: 'ea', icon: '🥛' },
  { id: 'p20', sku: '2012', name: 'Laughing Cow Cheese 24pk', category: 'Grocery', brand: null, unit: 'ea', icon: '🧀' },
  // Dairy & Deli -- added so the grocery_dense_page test has enough volume
  // to actually demonstrate density (real weekly data would have 20-30+
  // items in a dense category, not the ~18 left over from the hero page).
  { id: 'p21', sku: '3001', name: 'Cheese Pizza 9pk 580g', category: 'Dairy & Deli', brand: 'ARZ', unit: 'ea', icon: '🍕' },
  { id: 'p22', sku: '3002', name: 'Vegetable Samosas 10pc', category: 'Dairy & Deli', brand: 'Pran', unit: 'ea', icon: '🥟' },
  { id: 'p23', sku: '3003', name: 'Chicken Souvlaki Thighs', category: 'Dairy & Deli', brand: null, unit: '/lb', icon: '🍢' },
  { id: 'p24', sku: '3004', name: 'Pineapple Juice 21x190ml', category: 'Dairy & Deli', brand: 'Top', unit: 'ea', icon: '🧃' },
  { id: 'p25', sku: '3005', name: 'Mini Rolls 454g', category: 'Dairy & Deli', brand: 'Krinos', unit: 'ea', icon: '🥐' },
  { id: 'p26', sku: '3006', name: 'Deluxe Chicken Wieners 675g', category: 'Dairy & Deli', brand: 'Mina', unit: 'ea', icon: '🌭' },
  { id: 'p27', sku: '3007', name: 'Feta Cheese 700g', category: 'Dairy & Deli', brand: 'Krinos', unit: 'ea', icon: '🧀' },
  { id: 'p28', sku: '3008', name: 'Black Olives 1L', category: 'Dairy & Deli', brand: 'ARZ', unit: 'ea', icon: '🫒' },
];

// Per-campaign snapshot: THIS week's prices/promotion/merchant intent.
// regular_price/sale_price live here (not on `products`) per Revision 3 --
// so a past flyer stays reproducible even after catalog prices move on.
const campaignProducts = [
  { id: 'cp1', product_id: 'p1', regular_price: 14.99, sale_price: 11.99, promotion_type: 'hot_deal',
    merchant_priority: 'high', merchant_featured: true, merchant_force_hero: true, merchant_do_not_feature: false,
    requires_description: false, requires_serving_count: false },
  { id: 'cp2', product_id: 'p2', regular_price: 42.99, sale_price: 26.99, promotion_type: 'hot_deal',
    merchant_priority: 'high', merchant_featured: true, merchant_force_hero: false, merchant_do_not_feature: false,
    requires_description: false, requires_serving_count: false },
  { id: 'cp3', product_id: 'p3', regular_price: 32.99, sale_price: 26.99, promotion_type: 'hot_deal',
    merchant_priority: 'normal', merchant_featured: true, merchant_force_hero: false, merchant_do_not_feature: false,
    requires_description: true, description: '1 whole chicken, rice or spicy potatoes, chef-selected salad & garlic sauce.',
    requires_serving_count: true, serving_count: 'Serves 4-6' },

  { id: 'cp4', product_id: 'p4', regular_price: 1.99, sale_price: 1.49, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp5', product_id: 'p5', regular_price: 1.99, sale_price: 1.49, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp6', product_id: 'p6', regular_price: 2.99, sale_price: 1.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp7', product_id: 'p7', regular_price: 2.29, sale_price: 1.69, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp8', product_id: 'p8', regular_price: 4.49, sale_price: 3.49, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },

  { id: 'cp9', product_id: 'p9', regular_price: 17.99, sale_price: 13.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp10', product_id: 'p10', regular_price: 18.99, sale_price: 12.99, promotion_type: 'hot_deal',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp11', product_id: 'p11', regular_price: 12.99, sale_price: 7.99, promotion_type: 'hot_deal',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp12', product_id: 'p12', regular_price: 22.99, sale_price: 19.99, promotion_type: 'new',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp13', product_id: 'p13', regular_price: 11.99, sale_price: 8.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp14', product_id: 'p14', regular_price: 6.99, sale_price: 4.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp15', product_id: 'p15', regular_price: 7.99, sale_price: 5.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp16', product_id: 'p16', regular_price: 1.99, sale_price: 1.25, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp17', product_id: 'p17', regular_price: 24.99, sale_price: 17.99, promotion_type: 'hot_deal',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp18', product_id: 'p18', regular_price: 14.99, sale_price: 10.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp19', product_id: 'p19', regular_price: 7.99, sale_price: 5.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp20', product_id: 'p20', regular_price: 13.99, sale_price: 9.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },

  { id: 'cp21', product_id: 'p21', regular_price: 13.99, sale_price: 9.99, promotion_type: 'new',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp22', product_id: 'p22', regular_price: 2.99, sale_price: 1.99, promotion_type: 'new',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp23', product_id: 'p23', regular_price: 8.99, sale_price: 5.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp24', product_id: 'p24', regular_price: 9.99, sale_price: 7.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp25', product_id: 'p25', regular_price: 5.49, sale_price: 4.49, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp26', product_id: 'p26', regular_price: 6.99, sale_price: 4.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp27', product_id: 'p27', regular_price: 12.99, sale_price: 8.99, promotion_type: 'hot_deal',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
  { id: 'cp28', product_id: 'p28', regular_price: 6.99, sale_price: 4.99, promotion_type: 'none',
    merchant_priority: 'normal', merchant_featured: false, merchant_force_hero: false, merchant_do_not_feature: false },
];

function getProduct(id) {
  return products.find(p => p.id === id);
}

module.exports = { products, campaignProducts, getProduct };
