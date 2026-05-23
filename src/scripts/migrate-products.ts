/**
 * Product Migration Script
 *
 * Migrates all products from ProductCatalog.tsx to Firestore
 *
 * Run this once to populate your Firebase database with products
 */

import { collection, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FirestoreProduct, FirestoreCategory } from '../lib/firestore-schema';

// Import product images
import highEndPendantLight from '../imports/High-End_Pendant_Light.jpg';
import luxuryCrystalChandelier from '../imports/Luxury_Crystal_Chandelier.jpeg';
import luxuryCrystalChandelier500W from '../imports/Luxury_Crystal_Chandelier_500W_Gold.jpg';
import premium8LightChandelier from '../imports/Premium_8-Light_Chandelier_Gold.jpeg';
import designerPendantLight from '../imports/Designer_Pendant_Light__Statement_.jpeg';

// Bulb images
import energySavingBulb5W from '../imports/Energy_Saving_Bulb_5W.png';
import energySavingBulb40W from '../imports/Energy_Saving_Bulb_40W.png';
import ledG45ColorBulb3W from '../imports/LED_G45_Color_Bulb_3W.png';
import emergencyBulb30W from '../imports/Emergency_Bulb_30W.png';
import kansLED5WB22 from '../imports/Kans_LED_5W_B22__T-Type_.png';
import kansLED7WE27 from '../imports/Kans_LED_7W_B27__T-Type_.png';
import kansLED9WB22 from '../imports/Kans_LED_9W_B22__T-Type_.png';
import kansLED15WB22 from '../imports/Kans_LED_15W_B22__T-Type_.png';
import kansLED30WB22 from '../imports/Kans_LED_30W_B22__T-Type_.png';
import kansLED50WE27 from '../imports/Kans_LED_50W_E27__Blue_Box_.png';

// LED Panel images
import ledPanel60x6060W from '../imports/LED_Panel_60x60_60W.png';
import ledSurfacePanel18WRound from '../imports/LED_Surface_Panel_18W_Round_Warm_White.png';
import kansLED18_6WRGB from '../imports/Kans_LED_18_6W_Surface_Panel_RGB.png';
import kansLED18_6WBlueWhite from '../imports/Kans_LED_18_6W_Surface_Panel_Blue_White.png';

// Map imported images to their URLs
const imageMap: Record<string, string> = {
  highEndPendantLight,
  luxuryCrystalChandelier,
  luxuryCrystalChandelier500W,
  premium8LightChandelier,
  designerPendantLight,
  energySavingBulb5W,
  energySavingBulb40W,
  ledG45ColorBulb3W,
  emergencyBulb30W,
  kansLED5WB22,
  kansLED7WE27,
  kansLED9WB22,
  kansLED15WB22,
  kansLED30WB22,
  kansLED50WE27,
  ledPanel60x6060W,
  ledSurfacePanel18WRound,
  kansLED18_6WRGB,
  kansLED18_6WBlueWhite,
};

// Helper function to convert image references
function resolveImageUrl(image: any): string {
  if (typeof image === 'string') {
    // Already a URL string
    return image;
  }

  // Find matching imported image
  for (const [key, value] of Object.entries(imageMap)) {
    if (value === image) {
      return value;
    }
  }

  // Fallback to string representation
  return String(image);
}

// Helper function to create slug from name
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper function to distribute stock across warehouses
function distributeStock(totalStock: number): { accra: number; kumasi: number; takoradi: number } {
  const accra = Math.floor(totalStock * 0.5); // 50% in Accra
  const kumasi = Math.floor(totalStock * 0.35); // 35% in Kumasi
  const takoradi = totalStock - accra - kumasi; // Remaining in Takoradi

  return { accra, kumasi, takoradi };
}

// Source products (all 137 products from ProductCatalog.tsx)
const sourceProducts = [
  // Luxury & Lifestyle Lighting
  { id: 'lux001', name: 'High-End Pendant Light', sku: '81792/1AWL', price: 3500, category: 'luxury', subcategory: 'Chandeliers', image: highEndPendantLight, featured: true, badge: 'Premium', rating: 4.9, reviews: 127, stock: 24, description: 'Elegant pendant light with premium gold finish and modern design perfect for luxury interiors', specs: ['Gold finish', '1-light design', 'Height adjustable', 'E27 bulb base'] },
  { id: 'lux002', name: 'Luxury Crystal Chandelier', sku: '72877/400GD', price: 1700, category: 'luxury', subcategory: 'Chandeliers', image: luxuryCrystalChandelier, featured: true, rating: 4.8, reviews: 89, stock: 12, description: 'Stunning crystal chandelier with 400W capacity and gold accents', specs: ['Crystal design', '400W max', 'Gold accents', 'Multiple arms'] },
  { id: 'lux003', name: 'Designer Floor Lamp', sku: '2511-1 140W 3C', price: 2500, category: 'luxury', subcategory: 'Lamps', image: 'https://melcom.com/media/catalog/product/cache/d0e1b0d5c74d14bfa9f7dd43ec52d082/1/6/167542a.png', rating: 4.7, reviews: 54, stock: 18, description: 'Contemporary designer floor lamp with 3-color temperature control', specs: ['140W power', '3-color temps', 'Premium build', 'Modern design'] },
  { id: 'lux004', name: 'Plato Ceiling Light', sku: 'M822 46W 3C', price: 2000, category: 'luxury', subcategory: 'Ceiling Lights', image: 'https://img-1.kwcdn.com/product/fancy/05ba9300-1020-4ad6-995b-6a66c7c751f0.jpg?imageView2/2/w/800/q/70/format/avif', rating: 4.6, reviews: 41, stock: 31, description: 'Sophisticated ceiling light with color temperature adjustment', specs: ['46W LED', '3-color modes', 'Flush mount', 'Energy efficient'] },
  { id: 'lux005', name: 'LED Strip Light Warm/Pink', sku: '400W Strip', price: 2200, category: 'luxury', subcategory: 'Architectural', image: 'https://chronoslights.com/cdn/shop/products/flexible-pink-led-strip-light.jpg?v=1739440865&width=5000', badge: 'Trending', rating: 4.8, reviews: 103, stock: 67, description: 'Flexible LED strip with warm white and pink color options', specs: ['400W capacity', 'Dual colors', '5m length', 'Dimmable'] },
  { id: 'lux006', name: 'RGB LED Strip Light', sku: '400W RGB', price: 2500, category: 'luxury', subcategory: 'Architectural', image: 'https://m.media-amazon.com/images/I/714kos1LkBL._AC_SX679_.jpg', featured: true, rating: 4.9, reviews: 215, stock: 89, description: 'Premium RGB LED strip with full color spectrum and smart control', specs: ['RGB colors', '400W max', 'App control', 'Music sync'] },
  { id: 'lux007', name: 'Silicon Strip 220CV', sku: 'Flex Strip', price: 2200, category: 'luxury', subcategory: 'Architectural', image: 'https://i.ebayimg.com/images/g/Y5kAAOSwS6NmclR0/s-l960.webp', rating: 4.5, reviews: 78, stock: 45, description: 'Waterproof silicon LED strip for indoor and outdoor use', specs: ['220V AC', 'IP65 rated', 'Flexible', 'Easy install'] },
  { id: 'lux008', name: 'Integrated Step Light 6W', sku: 'Step Light', price: 200, category: 'luxury', subcategory: 'Architectural', image: 'https://www.vonn.ae/wp-content/uploads/VOS39613BL_IMAGE_1-600x600.jpg', rating: 4.7, reviews: 92, stock: 156, description: 'Recessed step light for stairs and pathways', specs: ['6W LED', 'Recessed mount', 'Warm white', 'Low profile'] },
  { id: 'lux009', name: 'Wall Light Black+Gold', sku: '6023/6516 BK+GD', price: 250, category: 'luxury', subcategory: 'Wall Lights', image: 'https://fandomlights.com/cdn/shop/files/O1CN01a6sZeK1ONRMtXIzT4__2213310341693-0-cib_720x.jpg?v=1758060557', rating: 4.6, reviews: 63, stock: 38, description: 'Modern wall sconce with black and gold finish', specs: ['Dual finish', 'Up/down light', 'E27 base', 'Metal body'] },
  { id: 'lux010', name: 'Designer Desk Lamp', sku: 'Desk Lamp BK', price: 300, category: 'luxury', subcategory: 'Lamps', image: 'https://m.media-amazon.com/images/I/611vtCsb6BL._AC_SX679_.jpg', rating: 4.8, reviews: 134, stock: 72, description: 'Adjustable desk lamp with touch controls and USB charging', specs: ['Touch control', 'USB port', 'Adjustable arm', 'LED bulb'] },

  // Solar & Infrastructure
  { id: 'sol001', name: '50W Solar Flood Light', sku: '50W Solar WT', price: 1000, category: 'solar', subcategory: 'Floodlights', image: 'https://99rands.co.za/wp-content/uploads/2023/03/50w-Led-Solar-Flood-Lamp-With-Solar-Panel-and-Smart-Remote-3.jpg', badge: 'Eco', rating: 4.7, reviews: 156, stock: 94, description: 'Energy-efficient solar floodlight with automatic dusk-to-dawn operation', specs: ['50W solar', 'Auto sensor', 'IP65 rated', '8hrs runtime'] },
  { id: 'sol002', name: 'Solar Outdoor Lamp Pair', sku: 'BT25 Pair', price: 1500, category: 'solar', subcategory: 'Outdoor', image: 'https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/07/3871082/1.jpg?5915', featured: true, rating: 4.9, reviews: 243, stock: 56, description: 'Premium solar outdoor lamp set with motion sensor and dual brightness', specs: ['2-pack set', 'Motion sensor', 'Dual modes', '10hrs battery'] },
  { id: 'sol003', name: 'Solar Fan 300W 16\'', sku: '300/16\' WT', price: 1000, category: 'solar', subcategory: 'Fans', image: 'https://d2j6dbq0eux0bg.cloudfront.net/images/40373910/products/626862288/4124715650.png', rating: 4.6, reviews: 98, stock: 42, description: '16-inch solar-powered fan with 300W motor for off-grid cooling', specs: ['16-inch blade', '300W motor', 'Solar panel', '3-speed control'] },
  { id: 'sol004', name: 'Orange Solar Fan', sku: '8516 Orange', price: 800, category: 'solar', subcategory: 'Fans', image: 'https://www.emsolargroup.com/wp-content/uploads/2026/04/solar-fan-complete-unit.png', rating: 4.5, reviews: 71, stock: 38, description: 'Compact solar fan with vibrant orange design', specs: ['Solar powered', 'Portable', 'Rechargeable', 'Quiet operation'] },
  { id: 'sol005', name: 'Solar Table Fan', sku: 'Solar Table', price: 500, category: 'solar', subcategory: 'Fans', image: 'https://3.imimg.com/data3/PY/AJ/GLADMIN-101827/rechargeable-fan-250x250.jpg', rating: 4.4, reviews: 82, stock: 127, description: 'Portable solar table fan ideal for camping and outdoor use', specs: ['Table mount', 'USB charge', 'Solar panel', 'Adjustable tilt'] },
  { id: 'sol006', name: '300W Industrial Floodlight', sku: '300W Flood', price: 1500, category: 'solar', subcategory: 'Commercial', image: 'https://m.media-amazon.com/images/I/61t1a4GPybL._AC_SY300_SX300_QL70_ML2_.jpg', badge: 'Commercial', rating: 4.8, reviews: 187, stock: 63, description: 'Heavy-duty industrial floodlight for large area illumination', specs: ['300W LED', 'Die-cast body', 'Wide beam', 'IP66 rated'] },
  { id: 'sol007', name: '200W High Bay with Bracket', sku: '200W HiBay', price: 800, tradePrice: 650, category: 'solar', subcategory: 'Commercial', image: 'https://images-cdn.ubuy.co.in/633cb42d269f756fa62c11dc-adiding-led-high-bay-light-170lm-w-ultra.jpg', rating: 4.7, reviews: 124, stock: 51, description: 'Professional high-bay lighting with mounting bracket included', specs: ['200W output', 'Bracket mount', 'High lumen', 'Warehouse grade'] },
  { id: 'sol008', name: '200W Streetlight', sku: '200W Street', price: 450, tradePrice: 380, category: 'solar', subcategory: 'Commercial', image: 'https://www.yahualighting.com/uploads/202310151/200w-solar-led-street-light70402b78-0b00-412c-a91f-a378efa0ce3c.jpg', featured: true, rating: 4.9, reviews: 312, stock: 78, description: 'Commercial-grade solar streetlight with photocell sensor', specs: ['200W solar', 'Auto on/off', 'All-weather', '12hrs runtime'] },
  { id: 'sol009', name: '50W LED Flood Light', sku: '50W LED', price: 550, category: 'solar', subcategory: 'Floodlights', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOIifptWV60bzkSQXo7TAySx2URSOBijCgXw&s', rating: 4.6, reviews: 145, stock: 103, description: 'Versatile LED floodlight for security and accent lighting', specs: ['50W LED', 'Adjustable', 'IP65 rated', 'Cool white'] },

  // Elite Wiring & Smart Accessories
  { id: 'wire001', name: '1 Gang 1 Way Switch', sku: '1G1W', price: 10.30, tradePrice: 7.00, category: 'wiring', subcategory: 'Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYEA8sEZ4PNeH9QnxUmI8vIB_UICqojelegQ&s', rating: 4.5, reviews: 289, stock: 450, description: 'Standard single-gang switch with premium construction', specs: ['1-gang 1-way', '13A rated', 'Fire resistant', 'White finish'] },
  { id: 'wire002', name: '3 Gang 2 Way Switch', sku: '3G2W', price: 22.00, tradePrice: 16.00, category: 'wiring', subcategory: 'Switches', image: 'https://www.qlitedirect.com/wp-content/uploads/2015/09/3.1-3-Gang-2-Way-Switch-QL-3G2WS-BB-500x500.jpg', rating: 4.6, reviews: 198, stock: 340, description: 'Triple-gang 2-way switch for multi-point control', specs: ['3-gang 2-way', '13A per gang', 'Premium plate', 'Screw terminals'] },
  { id: 'wire003', name: '20A DP Switch + Neon', sku: '20A DP+N', price: 30.00, tradePrice: 21.00, category: 'wiring', subcategory: 'Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRm1T8u_BSDNe109V5UH7ZAd_VvrGkOmaTAQ&s', badge: 'Popular', rating: 4.7, reviews: 402, stock: 267, description: '20A double-pole switch with neon indicator for water heaters', specs: ['20A capacity', 'Double pole', 'Neon indicator', 'Heavy duty'] },
  { id: 'wire004', name: '45A Switch + Socket + Neon', sku: '45A Combo', price: 48.00, tradePrice: 38.00, category: 'wiring', subcategory: 'Switches', image: 'https://ess.com.mt/Content/suppliercatalogue/products/images/1053707/1.jpg', rating: 4.8, reviews: 176, stock: 154, description: 'High-capacity cooker control unit with switch, socket and indicator', specs: ['45A switch', 'Integrated socket', 'Neon light', 'Cooker control'] },
  { id: 'wire005', name: 'Door Bell Switch', sku: '1317', price: 12.00, category: 'wiring', subcategory: 'Switches', image: 'https://microless.com/cdn/products/9eaa16a39aee88011da448ed4fffbf17-hi.jpg', rating: 4.4, reviews: 312, stock: 520, description: 'Momentary doorbell switch with bell symbol marking', specs: ['Push button', 'Momentary', 'Bell marked', 'Standard size'] },
  { id: 'wire006', name: '13A Socket DP + 2USB', sku: '13A 2G USB', price: 52.00, tradePrice: 50.00, category: 'wiring', subcategory: 'Sockets', image: 'https://i.pinimg.com/1200x/f8/2c/f3/f82cf38f1c61208ddb8702f88ba33832.jpg', featured: true, badge: 'Smart', rating: 4.9, reviews: 568, stock: 189, description: 'Modern socket with dual USB ports for charging devices', specs: ['13A socket', '2x USB ports', 'Fast charging', 'Switched'] },
  { id: 'wire007', name: '13A Multi Socket + USB A+C', sku: '13A Multi', price: 35.00, category: 'wiring', subcategory: 'Sockets', image: 'https://www.tronic.co.ke/cdn/shop/files/TR-5213-UC.jpg?v=1756396646&width=700', badge: 'New', rating: 4.8, reviews: 234, stock: 298, description: 'Versatile socket with USB-A and USB-C charging ports', specs: ['Multi socket', 'USB-A & USB-C', 'Smart charging', 'Compact design'] },
  { id: 'wire008', name: 'TV Co-axial Socket', sku: 'TV Socket', price: 11.50, tradePrice: 8.00, category: 'wiring', subcategory: 'Sockets', image: 'https://i.pinimg.com/1200x/c0/5c/7c/c05c7cbd37c4a5c6889b90f2aab07905.jpg', rating: 4.3, reviews: 145, stock: 412, description: 'Coaxial socket for TV and satellite connections', specs: ['Co-axial', 'TV/SAT', 'F-type', 'Shielded'] },

  // Industrial Control
  { id: 'ind001', name: 'Sassin 4 Way 40A Main Switch', sku: 'SS-4W-40A', price: 605, category: 'industrial', subcategory: 'Breakers', image: 'https://image.made-in-china.com/2f0j00wpnkdPSlSGbV/Sassin-4-Phase-4p-32AMP-MCB-Electrical-Miniature-Circuit-Breaker-for-Overload-Protection-China-Vb514.webp', badge: 'Industrial', rating: 4.8, reviews: 87, stock: 34, description: 'Professional 4-way distribution board with 40A main switch', specs: ['4-way board', '40A main', 'MCB ready', 'Metal enclosure'] },
  { id: 'ind002', name: 'High-Capacity Breaker 100A', sku: '100A 4Pole', price: 300, category: 'industrial', subcategory: 'Breakers', image: 'https://www.plc-city.com/shop/114736-large_default/sie-5sy6206-7-nfs.jpg', rating: 4.7, reviews: 112, stock: 67, description: 'Industrial-grade 100A circuit breaker with 4-pole configuration', specs: ['100A rating', '4-pole', 'Industrial', 'DIN rail'] },
  { id: 'ind003', name: 'Sassin 8 Way 3 Phase', sku: 'SS-8W-3PH', price: 2700, category: 'industrial', subcategory: 'Breakers', image: 'https://s.alicdn.com/@sc04/kf/H6c6bad4589f8437abb2a4e0147341da34.jpg_640x640.jpg', featured: true, rating: 4.9, reviews: 145, stock: 21, description: 'Heavy-duty 8-way 3-phase distribution panel for commercial installations', specs: ['8-way', '3-phase', 'Double door', 'Wall mounted'] },
  { id: 'ind004', name: 'Sassin 12 Way Single Phase', sku: 'SS-12W-1PH', price: 1300, category: 'industrial', subcategory: 'Breakers', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNUgTAlu9REjdabH7qO3lDD95vrqUmD5_ZjQ&s', rating: 4.7, reviews: 98, stock: 45, description: '12-way single-phase consumer unit for residential and commercial', specs: ['12-way', 'Single phase', 'Main switch', 'RCBO compatible'] },
  { id: 'ind005', name: '35mm Single Metal Box', sku: '35mm Single', price: 4.00, category: 'industrial', subcategory: 'Mounting', image: 'https://m.media-amazon.com/images/I/71k+pvD-C5L._AC_UF1000,1000_QL80_.jpg', rating: 4.4, reviews: 567, stock: 890, description: 'Standard single-gang metal flush mounting box', specs: ['35mm depth', 'Single gang', 'Galvanized', 'Knock-outs'] },
  { id: 'ind006', name: '35mm Double Metal Box', sku: '35mm Double', price: 5.00, category: 'industrial', subcategory: 'Mounting', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxrZbQ1Hj1awCTB61gX_Zi3F95skgn2awihg&s', rating: 4.5, reviews: 434, stock: 720, description: 'Double-gang metal back box for switches and sockets', specs: ['35mm depth', 'Double gang', 'Steel', 'Pre-drilled'] },
  { id: 'ind007', name: '3x3 Pattress', sku: 'Pattress 3x3', price: 6.60, category: 'industrial', subcategory: 'Mounting', image: 'https://i.pinimg.com/1200x/92/86/e9/9286e90066083bb2fc6b1853d68f32ac.jpg', rating: 4.3, reviews: 198, stock: 456, description: 'Surface-mount pattress box for trunking accessories', specs: ['3x3 size', 'Surface mount', 'White finish', 'Cable entries'] },
  { id: 'ind008', name: '13A Fridge Guard', sku: 'Fridge Guard', price: 95.00, category: 'industrial', subcategory: 'Protection', image: 'https://i.pinimg.com/1200x/a9/1e/0b/a91e0b94c5e7ce2e3aaef68a8da9a31b.jpg', rating: 4.6, reviews: 234, stock: 178, description: 'Voltage protection device for refrigerators and freezers', specs: ['Surge protection', 'Delay restart', '13A socket', 'LED display'] },

  // Fans & Appliances
  { id: 'fan001', name: 'Orient CF 5611 White', sku: 'CF-5611-WT', price: 410, tradePrice: 370, category: 'appliances', subcategory: 'Ceiling Fans', image: 'https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/85/6074192/1.jpg?8943', badge: 'Popular', rating: 4.7, reviews: 456, stock: 123, description: 'Premium Orient ceiling fan with high air delivery', specs: ['56-inch', '3-speed', 'White finish', 'Energy efficient'] },
  { id: 'fan002', name: 'Orient CF 2433 Short Blade', sku: 'CF-2433', price: 300, category: 'appliances', subcategory: 'Ceiling Fans', image: 'https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/48/9786003/1.jpg?5562', rating: 4.5, reviews: 298, stock: 89, description: 'Compact ceiling fan ideal for small rooms', specs: ['24-inch', 'Short blade', 'Low noise', 'Durable motor'] },
  { id: 'fan003', name: 'Orient WL 20\' Wall Fan', sku: 'WL-20', price: 480, category: 'appliances', subcategory: 'Wall Fans', image: 'https://m.media-amazon.com/images/I/71a2x0UmjDL.jpg', rating: 4.6, reviews: 312, stock: 167, description: 'Wall-mounted oscillating fan with remote control', specs: ['20-inch', 'Oscillating', 'Remote control', 'Timer function'] },
  { id: 'bulb001', name: 'Energy Saving Bulb 5W', sku: 'ESB-5W', price: 7.00, category: 'appliances', subcategory: 'Bulbs', image: energySavingBulb5W, rating: 4.3, reviews: 678, stock: 945, description: 'Compact energy-saving LED bulb for general lighting', specs: ['5W LED', 'E27 base', 'Warm white', '450 lumens'] },
  { id: 'bulb002', name: 'Energy Saving Bulb 40W', sku: 'ESB-40W', price: 22.00, category: 'appliances', subcategory: 'Bulbs', image: energySavingBulb40W, rating: 4.5, reviews: 434, stock: 567, description: 'High-output LED bulb equivalent to 40W incandescent', specs: ['40W equivalent', 'E27 base', 'Cool white', '3200 lumens'] },
  { id: 'bulb003', name: 'LED G45 Color Bulb 3W', sku: 'LED-G45-3W', price: 5.00, category: 'appliances', subcategory: 'Bulbs', image: ledG45ColorBulb3W, rating: 4.2, reviews: 389, stock: 823, description: 'Decorative colored LED bulb for mood lighting', specs: ['3W LED', 'G45 shape', 'Multi-color', 'Party lighting'] },
  { id: 'bulb004', name: 'Emergency Bulb 30W', sku: 'EMG-30W-WT', price: 100, category: 'appliances', subcategory: 'Bulbs', image: emergencyBulb30W, badge: 'Emergency', rating: 4.7, reviews: 289, stock: 234, description: 'Rechargeable emergency LED bulb with backup battery', specs: ['30W output', 'Backup battery', '4hrs runtime', 'Auto switch'] },

  // ELITE ELEGANCE 91-SERIES (WHITE)
  { id: 'ee001', sku: '91302EFQ', name: '1 Gang 2 Way Switch (91-Series White)', price: 28.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYEA8sEZ4PNeH9QnxUmI8vIB_UICqojelegQ&s', stock: 420, badge: 'Elite', rating: 4.8 },
  { id: 'ee002', sku: '91304EFQ', name: '2 Gang 2 Way Switch (91-Series White)', price: 38.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYEA8sEZ4PNeH9QnxUmI8vIB_UICqojelegQ&s', stock: 350, rating: 4.7 },
  { id: 'ee003', sku: '91306EFQ', name: '3 Gang 2 Way Switch (91-Series White)', price: 48.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYEA8sEZ4PNeH9QnxUmI8vIB_UICqojelegQ&s', stock: 290 },
  { id: 'ee004', sku: '91432', name: 'TV Socket (91-Series White)', price: 24.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://assets.legrand.com/pim/PHOTOS-WEB/LG-618032-WEB-R.jpg', stock: 380 },
  { id: 'ee005', sku: '91407MQ', name: '13A Single Multi Socket (91-Series White)', price: 35.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://i.pinimg.com/1200x/71/af/0a/71af0a64dca45214ad7c7e13e561f7e3.jpg', stock: 320 },
  { id: 'ee006', sku: '91408M', name: '13A Double Multi Socket (91-Series White)', price: 45.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://i.pinimg.com/1200x/9b/06/34/9b06345f0f874ee69365dde3e64432ff.jpg', stock: 280 },
  { id: 'ee007', sku: '91324', name: '20A Single Gang Double Pole Switch (91-Series)', price: 42.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://i.pinimg.com/736x/1d/ae/10/1dae10c635f567f0089230349d871059.jpg', stock: 240 },
  { id: 'ee008', sku: '91408MB', name: '13A Double Multi Socket + USB (91-Series)', price: 62.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://www.tronic.co.ke/cdn/shop/files/TD5113-UB-GO.jpg?v=1756396253', stock: 220, featured: true },

  // ELITE ELEGANCE P-TYPE
  { id: 'ep001', sku: 'P302F', name: '1 Gang 2 Way Switch (P-Type)', price: 32.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYEA8sEZ4PNeH9QnxUmI8vIB_UICqojelegQ&s', stock: 340 },
  { id: 'ep002', sku: 'P304F', name: '2 Gang 2 Way Switch (P-Type)', price: 42.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://sharpsupplygh.com/wp-content/uploads/2025/11/2g2w-grey1.jpg', stock: 290 },
  { id: 'ep003', sku: 'P306F', name: '3 Gang 2 Way Switch (P-Type)', price: 52.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT7M6begb-wmK8e_F4l7afvU0a-tHAxR-AvQg&s', stock: 230 },
  { id: 'ep004', sku: 'P324AC', name: 'Air Condition Switch (P-Type)', price: 38.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT9jBMG4QwA1AnbPW9-DLbIfl9w_f2X3e_ndg&s', stock: 260 },
  { id: 'ep005', sku: 'P324WH', name: 'Water Heater Switch (P-Type)', price: 38.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSeUscgcIlCqqvBzvUgD7EKL7ciBrzx1K2Qow&s', stock: 270 },
  { id: 'ep006', sku: 'P408MB', name: '13A Double Multi Socket + 2 USB (P-Type)', price: 68.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrzGpq7nNkQDRzUm9E3rMKBnb6RWgI0BS1jmr7ejD-_6QM9VUb', stock: 180, featured: true },

  // ELITE ELEGANCE VIP-TYPE (GOLD & SILVER)
  { id: 'vip001', sku: 'VP302J', name: '1 Gang 2 Way Switch (VIP Gold)', price: 55.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://assets.legrand.com/pim/PHOTOS-WEB/LEGRAND/83/832401-LEGRAND-1000.jpg', stock: 140, badge: 'Luxury' },
  { id: 'vip002', sku: 'VP304J', name: '2 Gang 2 Way Switch (VIP Gold)', price: 72.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://www.tlc-direct.co.uk/Images/Products/size_3/VLXG2D.JPG', stock: 120 },
  { id: 'vip003', sku: 'VP306J', name: '3 Gang 2 Way Switch (VIP Gold)', price: 88.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://i.etsystatic.com/6729716/r/il/982364/6073995325/il_fullxfull.6073995325_e4mk.jpg', stock: 95 },
  { id: 'vip004', sku: 'VP302Y', name: '1 Gang 2 Way Switch (VIP Silver)', price: 52.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://i.pinimg.com/736x/ae/56/0a/ae560a157a10fd0c4730ae0962ef9ae2.jpg', stock: 160 },
  { id: 'vip005', sku: 'VP352Y', name: 'Dimmer Switch (VIP Silver)', price: 75.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://i.pinimg.com/1200x/14/93/09/149309fbdffdf930483b94878af0538e.jpg', stock: 110 },
  { id: 'vip006', sku: 'VP408MBJ', name: '13A Double Multi Socket + USB (VIP Gold)', price: 95.00, category: 'wiring', subcategory: 'Elite Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaAPyMrJnkTzYWAkPl7RBLT21wvW3Mv8uNEg&s', stock: 85, featured: true },

  // TAOS NEW TYPE SERIES (WHITE, CHAMPAGNE, GREY)
  { id: 'taos001', sku: '71302', name: '1 Gang 2 Way Switch (Taos White)', price: 18.00, category: 'wiring', subcategory: 'Switches', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYEA8sEZ4PNeH9QnxUmI8vIB_UICqojelegQ&s', stock: 520 },
  { id: 'taos002', sku: '71304', name: '2 Gang 2 Way Switch (Taos White)', price: 28.00, category: 'wiring', subcategory: 'Switches', image: 'https://www.tronic.co.ke/cdn/shop/files/TS5122-WH_1.jpg?v=1756398107&width=700', stock: 460 },
  { id: 'taos003', sku: '71306', name: '3 Gang 2 Way Switch (Taos White)', price: 38.00, category: 'wiring', subcategory: 'Switches', image: 'https://www.tronic.co.ke/cdn/shop/files/TD5132-GO.png?v=1756398344&width=700', stock: 390 },
  { id: 'taos004', sku: '71456', name: '13A Single Socket + 2USB (Taos)', price: 45.00, category: 'wiring', subcategory: 'Sockets', image: 'https://image.made-in-china.com/2f0j00GHyRgmTBaIop/Stock-1-Gang-13A-UK-Socket-with-2-USB-Port-Electrical-Wall-Socket.webp', stock: 340 },
  { id: 'taos005', sku: '71306CH', name: '3 Gang 2 Way Switch (Taos Champagne)', price: 42.00, category: 'wiring', subcategory: 'Switches', image: 'https://i.pinimg.com/1200x/17/75/c0/1775c02c798b1f765c5bd95f46f9faf1.jpg', stock: 280 },
  { id: 'taos006', sku: '71304 GR', name: '2 Gang 2 Way Switch (Taos Grey)', price: 32.00, category: 'wiring', subcategory: 'Switches', image: 'https://e-motion-cdn.fra1.cdn.digitaloceanspaces.com/product/9020/1VwPVC1OyGL5Yu8b53QKC8qRUjiFuSpxefnN6AQV-315x315.jpg?v=-1', stock: 310 },

  // EXTENSION SOCKETS
  { id: 'ext001', sku: 'AWN45', name: '4 Way Extension Socket 5m Wire', price: 85.00, category: 'wiring', subcategory: 'Extension Sockets', image: 'https://m.media-amazon.com/images/I/51SZ7y3P7vL.jpg', stock: 180, rating: 4.6 },
  { id: 'ext002', sku: 'CWR43M', name: '4 Way Extension Socket 3m Wire', price: 65.00, category: 'wiring', subcategory: 'Extension Sockets', image: 'https://i.pinimg.com/1200x/9e/f6/c6/9ef6c6f0b0237e03ef9a51655d869ebb.jpg', stock: 220 },
  { id: 'ext003', sku: 'CWR43MB', name: '4 Way Extension Socket 3m Wire + USB', price: 78.00, category: 'wiring', subcategory: 'Extension Sockets', image: 'https://f.nooncdn.com/p/pzsku/Z1410A6DA90E283B4C674Z/45/1747642364/b0e8e53e-4ecd-45e5-8c0e-7aa17df6ad7b.jpg?width=800', stock: 195, badge: 'Popular' },

  // MAIN SWITCHES & DISTRIBUTION BOARDS
  { id: 'main001', sku: 'SASSIN 4WAY SP', name: 'Sassin 4-Way Single Phase Main Switch', price: 450, category: 'industrial', subcategory: 'Breakers', image: 'https://i.pinimg.com/1200x/bf/31/27/bf3127ba8d0f73bd682e22b1d77f5701.jpg', stock: 45 },
  { id: 'main002', sku: 'SASSIN 6WAY SP', name: 'Sassin 6-Way Single Phase Main Switch', price: 580, category: 'industrial', subcategory: 'Breakers', image: 'https://niolin-industrial.com/cdn/shop/files/FamilyPic.jpg?v=1706064932&width=750', stock: 38 },
  { id: 'main003', sku: 'SASSIN 8WAY SP', name: 'Sassin 8-Way Single Phase Main Switch', price: 720, category: 'industrial', subcategory: 'Breakers', image: 'https://niolin-industrial.com/cdn/shop/files/SASSINMAIN_dc96adc6-983f-4920-a1ac-669ab6d99d4b.jpg?v=1708858770&width=750', stock: 32 },
  { id: 'main004', sku: 'SASSIN 12WAY SP', name: 'Sassin 12-Way Single Phase Main Switch', price: 950, category: 'industrial', subcategory: 'Breakers', image: 'https://ikrorwxhkjplln5p.ldycdn.com/cloud/mmBpoKlmRllSprplillqk/Modular-din-rail-devices.jpg', stock: 24 },
  { id: 'main005', sku: 'SASSIN 8WAY 3PH', name: 'Sassin 8-Way 3 Phase Distribution Board', price: 1850, category: 'industrial', subcategory: 'Breakers', image: 'https://abtglobalventures.com/wp-content/uploads/2025/05/ABt-8-Way-3-Phase-Classic-Range-Distribution-Board.webp', stock: 18 },
  { id: 'main006', sku: 'ELITE 6WAY SP', name: 'Elite 6-Way Single Phase Board', price: 650, category: 'industrial', subcategory: 'Breakers', image: 'https://abtglobalventures.com/wp-content/uploads/2025/05/ABt-6-Way-Single-Phase-Consumer-Unit-Hibrid-Range-Distribution-Board-1.webp', stock: 28 },

  // CIRCUIT BREAKERS
  { id: 'brk001', sku: 'ELITE 16A 1P', name: 'Elite 16A 1-Pole Breaker', price: 25.00, category: 'industrial', subcategory: 'Breakers', image: 'https://res.cloudinary.com/rsc/image/upload/b_rgb:FFFFFF,c_pad,dpr_2.625,f_auto,h_214,q_auto,w_380/c_pad,h_214,w_380/Y2650197-01?pgw=1', stock: 320 },
  { id: 'brk002', sku: 'ELITE 32A 1P', name: 'Elite 32A 1-Pole Breaker', price: 32.00, category: 'industrial', subcategory: 'Breakers', image: 'https://www.major-tech.com/uploads/products_images/1085/V3C1P63-Web.jpg', stock: 280 },
  { id: 'brk003', sku: 'ELITE 63A 1P', name: 'Elite 63A 1-Pole Breaker', price: 58.00, category: 'industrial', subcategory: 'Breakers', image: 'https://adajusa.com/52176-large_default/mcb-circuit-breaker-1-pole-63a-1x63a-ls-electric.jpg', stock: 180 },
  { id: 'brk004', sku: 'SASSIN 32A 2P', name: 'Sassin 32A 2-Pole Breaker', price: 48.00, category: 'industrial', subcategory: 'Breakers', image: 'https://image.made-in-china.com/2f0j00PNiVqfCsfrbM/Sassin-3sb6-2p-32A-MCB-Short-Circuit-Protection.webp', stock: 210 },
  { id: 'brk005', sku: 'SASSIN 63A 4P', name: 'Sassin 63A 4-Pole Breaker', price: 125.00, category: 'industrial', subcategory: 'Breakers', image: 'https://image.made-in-china.com/2f0j00UgVkpitjsIch/Sassin-Manufacture-Price-4-Phase-4p-63AMP-MCB-Electrical-Miniature-Circuit-Breaker-for-Controlling-CE.webp', stock: 95 },

  // KANS LED BULBS
  { id: 'kled001', sku: 'KANS LED 5W B22 T', name: 'Kans LED 5W B22 (T-Type)', price: 12.00, category: 'appliances', subcategory: 'Bulbs', image: kansLED5WB22, stock: 680 },
  { id: 'kled002', sku: 'KANS LED 7W E27 T', name: 'Kans LED 7W E27 (T-Type)', price: 15.00, category: 'appliances', subcategory: 'Bulbs', image: kansLED7WE27, stock: 620 },
  { id: 'kled003', sku: 'KANS LED 9W B22 T', name: 'Kans LED 9W B22 (T-Type)', price: 18.00, category: 'appliances', subcategory: 'Bulbs', image: kansLED9WB22, stock: 580 },
  { id: 'kled004', sku: 'KANS LED 15W B22 T', name: 'Kans LED 15W B22 (T-Type)', price: 28.00, category: 'appliances', subcategory: 'Bulbs', image: kansLED15WB22, stock: 420 },
  { id: 'kled005', sku: 'KANS LED 30W B22 T', name: 'Kans LED 30W B22 (T-Type)', price: 45.00, category: 'appliances', subcategory: 'Bulbs', image: kansLED30WB22, stock: 340 },
  { id: 'kled006', sku: 'KANS LED 50W E27 BL', name: 'Kans LED 50W E27 (Blue Box)', price: 65.00, category: 'appliances', subcategory: 'Bulbs', image: kansLED50WE27, stock: 280 },

  // LED PANELS & CEILING LIGHTS
  { id: 'panel001', sku: 'KANS 18+6W BL+WT', name: 'Kans LED 18+6W Surface Panel Blue+White', price: 95.00, category: 'luxury', subcategory: 'Ceiling Lights', image: kansLED18_6WBlueWhite, stock: 180 },
  { id: 'panel002', sku: 'KANS 18+6W RGB', name: 'Kans LED 18+6W Surface Panel RGB', price: 110.00, category: 'luxury', subcategory: 'Ceiling Lights', image: kansLED18_6WRGB, stock: 160 },
  { id: 'panel003', sku: 'S1050/18W R WWT', name: 'LED Surface Panel 18W Round Warm White', price: 68.00, category: 'luxury', subcategory: 'Ceiling Lights', image: ledSurfacePanel18WRound, stock: 240 },
  { id: 'panel004', sku: 'S9030/60W', name: 'LED Panel 60x60 60W', price: 145.00, category: 'luxury', subcategory: 'Ceiling Lights', image: ledPanel60x6060W, stock: 120 },

  // ORIENT CEILING & WALL FANS
  { id: 'orient001', sku: 'CF-5639-WT', name: 'Orient CF 5639 5-Blade Ceiling Fan White', price: 480, category: 'appliances', subcategory: 'Ceiling Fans', image: 'https://gh.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/85/6074192/1.jpg?8943', stock: 95 },
  { id: 'orient002', sku: 'CF-5639-BLUE', name: 'Orient CF 5639 5-Blade Ceiling Fan Blue', price: 480, category: 'appliances', subcategory: 'Ceiling Fans', image: 'https://5.imimg.com/data5/SELLER/Default/2022/4/XY/EW/LD/82489894/orient-electric-vandy-ceiling-fan-azure-blue-1000x1000.jpg', stock: 82 },
  { id: 'orient003', sku: 'CF-5625-WT', name: 'Orient CF 5625 Ceiling Fan White', price: 520, category: 'appliances', subcategory: 'Ceiling Fans', image: 'https://www.electromart.com.gh/wp-content/uploads/2024/06/ORIENT-56%E2%80%B3-NORWESTOR-CEILING-FAN.png', stock: 78 },
  { id: 'orient004', sku: 'WL-20', name: 'Orient WL 20 Wall Fan', price: 480, category: 'appliances', subcategory: 'Wall Fans', image: 'https://m.media-amazon.com/images/I/81hKc7wxyUL._AC_UF894,1000_QL80_.jpg', stock: 110 },

  // CABLES & WIRING
  { id: 'cable001', sku: '2.5MM EARTH', name: '2.5mm Earth Cable', price: 8.50, tradePrice: 6.50, category: 'industrial', subcategory: 'Cables', image: 'https://www.higonsolar.com/storage/uploads/images/202306/07/1686119507_uuE2A2QZ8S.jpg', stock: 950 },
  { id: 'cable002', sku: '16MM EARTH', name: '16mm Earth Cable', price: 28.00, tradePrice: 22.00, category: 'industrial', subcategory: 'Cables', image: 'https://www.mjselectricalsupplies.com.au/assets/full/BW160ELKIT.jpg?20230621173852', stock: 420 },
  { id: 'cable003', sku: 'KANS 2.5MM RED', name: 'Kans Cable 2.5mm Red', price: 9.00, category: 'industrial', subcategory: 'Cables', image: 'https://www.reinders.com/media/catalog/product/m/a/maxi-cable-red-2500.jpg?optimize=medium&bg-color=255,255,255&fit=bounds&height=728&width=728&canvas=728:728', stock: 720 },
  { id: 'cable004', sku: 'KANS 6MM EARTH', name: 'Kans Cable 6mm Earth', price: 18.00, category: 'industrial', subcategory: 'Cables', image: 'https://static.vwcable.com/wp-content/uploads/co-renmincable/Bvr-750V-PVC-Coated-Single-Core-Copper-Electric-2-5mm-Wire-Cable.jpg', stock: 480 },

  // CHANDELIERS & LUXURY FIXTURES
  { id: 'luxch001', sku: '72877/500GD', name: 'Luxury Crystal Chandelier 500W Gold', price: 2200, category: 'luxury', subcategory: 'Chandeliers', image: luxuryCrystalChandelier500W, stock: 8, featured: true, badge: 'Luxury' },
  { id: 'luxch002', sku: '72707/8GD', name: 'Premium 8-Light Chandelier Gold', price: 3200, category: 'luxury', subcategory: 'Chandeliers', image: premium8LightChandelier, stock: 6, featured: true },
  { id: 'luxch003', sku: '81792/ST', name: 'Designer Pendant Light (Statement)', price: 1850, category: 'luxury', subcategory: 'Chandeliers', image: designerPendantLight, stock: 12 },
];

// Transform source product to Firestore format
function transformProduct(sourceProduct: any): Omit<FirestoreProduct, 'id' | 'createdAt' | 'updatedAt'> {
  const imageUrl = resolveImageUrl(sourceProduct.image);
  const stock = sourceProduct.stock || 0;
  const warehouseStock = distributeStock(stock);

  return {
    sku: sourceProduct.sku,
    name: sourceProduct.name,
    slug: createSlug(sourceProduct.name),
    description: sourceProduct.description || '',
    longDescription: sourceProduct.description || '',

    // Categorization
    categoryId: sourceProduct.category,
    categoryName: getCategoryName(sourceProduct.category),
    subcategory: sourceProduct.subcategory,
    tags: [sourceProduct.category, sourceProduct.subcategory, ...(sourceProduct.badge ? [sourceProduct.badge] : [])],

    // Pricing
    price: sourceProduct.price,
    tradePrice: sourceProduct.tradePrice || null,
    costPrice: sourceProduct.price * 0.6, // Estimate 40% margin
    currency: 'GHS',
    compareAtPrice: null,

    // Media
    images: [
      {
        url: imageUrl,
        alt: sourceProduct.name,
        isPrimary: true,
        order: 0,
      },
    ],
    videos: [],

    // Variants
    hasVariants: false,
    variants: [],

    // Specifications
    specs: (sourceProduct.specs || []).reduce((acc: Record<string, string>, spec: string, index: number) => {
      acc[`spec_${index + 1}`] = spec;
      return acc;
    }, {}),
    technicalSpecs: sourceProduct.specs || [],

    // Inventory
    trackInventory: true,
    totalStock: stock,
    warehouseStock,
    lowStockThreshold: 10,

    // Status
    status: 'active',
    isAvailable: stock > 0,
    isFeatured: sourceProduct.featured || false,
    isOnSale: false,

    // Ratings & Reviews
    rating: sourceProduct.rating || 0,
    reviewCount: sourceProduct.reviews || 0,

    // SEO
    metaTitle: sourceProduct.name,
    metaDescription: sourceProduct.description || '',
    keywords: [sourceProduct.name, sourceProduct.sku, sourceProduct.category, sourceProduct.subcategory],

    // Badges
    badges: sourceProduct.badge ? [sourceProduct.badge] : [],

    // Shipping (estimate based on product category)
    weight: getEstimatedWeight(sourceProduct.category),
    dimensions: {
      length: 30,
      width: 30,
      height: 30,
    },

    // Timestamps (will be set by Firestore)
    publishedAt: Timestamp.now(),

    // Analytics
    viewCount: 0,
    purchaseCount: 0,
    cartAddCount: 0,
  };
}

// Helper functions
function getCategoryName(categoryId: string): string {
  const categoryNames: Record<string, string> = {
    luxury: 'Luxury Lighting',
    solar: 'Solar & Infrastructure',
    wiring: 'Smart Accessories',
    industrial: 'Industrial Control',
    appliances: 'Fans & Appliances',
  };
  return categoryNames[categoryId] || categoryId;
}

function getEstimatedWeight(category: string): number {
  const weights: Record<string, number> = {
    luxury: 5, // kg
    solar: 3,
    wiring: 0.5,
    industrial: 8,
    appliances: 6,
  };
  return weights[category] || 2;
}

// Main migration function
export async function migrateProducts(onProgress?: (current: number, total: number, productName: string) => void) {
  console.log('Starting product migration');
  console.log(`📦 Found ${sourceProducts.length} products to migrate`);

  const batch = writeBatch(db);
  const productsRef = collection(db, 'products');

  let migrated = 0;

  for (const sourceProduct of sourceProducts) {
    try {
      const transformedProduct = transformProduct(sourceProduct);
      const productRef = doc(productsRef, sourceProduct.id);

      const firestoreProduct: FirestoreProduct = {
        id: sourceProduct.id,
        ...transformedProduct,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      batch.set(productRef, firestoreProduct);
      migrated++;

      if (onProgress) {
        onProgress(migrated, sourceProducts.length, sourceProduct.name);
      }

      console.log(`Prepared: ${sourceProduct.name} (${migrated}/${sourceProducts.length})`);

      // Firestore batch limit is 500 operations, commit in chunks if needed
      if (migrated % 400 === 0) {
        await batch.commit();
        console.log(`💾 Committed batch of ${migrated} products`);
      }
    } catch (error) {
      console.error(`Failed to prepare product ${sourceProduct.name}:`, error);
    }
  }

  // Commit remaining products
  await batch.commit();
  console.log(`💾 Committed final batch`);

  console.log(`Migration complete. Migrated ${migrated}/${sourceProducts.length} products`);

  return { migrated, total: sourceProducts.length };
}

// Create categories
export async function migrateCategories() {
  console.log('🏷️  Creating categories...');

  const categories: Omit<FirestoreCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Luxury Lighting',
      slug: 'luxury-lighting',
      description: 'Premium chandeliers, pendant lights, and designer fixtures',
      parentId: null,
      image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800',
      icon: 'Sparkles',
      metaTitle: 'Luxury Lighting - Cofkans Electricals',
      metaDescription: 'Explore our collection of luxury chandeliers and designer lighting',
      order: 1,
      isActive: true,
      isFeatured: true,
      productCount: 0,
    },
    {
      name: 'Solar & Infrastructure',
      slug: 'solar-infrastructure',
      description: 'Solar-powered lighting and commercial floodlights',
      parentId: null,
      image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800',
      icon: 'Sun',
      metaTitle: 'Solar & Infrastructure - Cofkans Electricals',
      metaDescription: 'Energy-efficient solar lighting solutions for homes and businesses',
      order: 2,
      isActive: true,
      isFeatured: true,
      productCount: 0,
    },
    {
      name: 'Smart Accessories',
      slug: 'smart-accessories',
      description: 'Switches, sockets, and smart electrical accessories',
      parentId: null,
      image: 'https://images.unsplash.com/photo-1558089687-3d5e04b4d6c9?w=800',
      icon: 'Zap',
      metaTitle: 'Smart Accessories - Cofkans Electricals',
      metaDescription: 'Modern switches, USB sockets, and smart home accessories',
      order: 3,
      isActive: true,
      isFeatured: false,
      productCount: 0,
    },
    {
      name: 'Industrial Control',
      slug: 'industrial-control',
      description: 'Circuit breakers, distribution boards, and industrial equipment',
      parentId: null,
      image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800',
      icon: 'Building2',
      metaTitle: 'Industrial Control - Cofkans Electricals',
      metaDescription: 'Professional-grade circuit breakers and distribution equipment',
      order: 4,
      isActive: true,
      isFeatured: false,
      productCount: 0,
    },
    {
      name: 'Fans & Appliances',
      slug: 'fans-appliances',
      description: 'Ceiling fans, LED bulbs, and electrical appliances',
      parentId: null,
      image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800',
      icon: 'Fan',
      metaTitle: 'Fans & Appliances - Cofkans Electricals',
      metaDescription: 'Quality ceiling fans, LED bulbs, and home appliances',
      order: 5,
      isActive: true,
      isFeatured: false,
      productCount: 0,
    },
  ];

  const batch = writeBatch(db);
  const categoriesRef = collection(db, 'categories');

  for (const category of categories) {
    const categoryRef = doc(categoriesRef, category.slug);

    const firestoreCategory: FirestoreCategory = {
      id: category.slug,
      ...category,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    batch.set(categoryRef, firestoreCategory);
    console.log(`Created category: ${category.name}`);
  }

  await batch.commit();
  console.log(`Categories migration complete.`);
}

// Run full migration
export async function runFullMigration(onProgress?: (current: number, total: number, productName: string) => void) {
  console.log('Starting full migration');

  try {
    // Step 1: Create categories
    await migrateCategories();

    // Step 2: Migrate products
    const result = await migrateProducts(onProgress);

    console.log('Full migration complete.');
    console.log(`📊 Results: ${result.migrated}/${result.total} products migrated`);

    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
