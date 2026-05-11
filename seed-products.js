/**
 * seed-products.js — Imports products from Wuilt CSV export into MongoDB
 * Usage: node seed-products.js [--clean]
 *   --clean: wipe existing products & collections before import
 */
const fs = require('fs');
const mongoose = require('mongoose');

// ── CSV Parser (handles quoted fields with commas, newlines) ──
function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  function readField() {
    if (i >= len || text[i] === '\n' || text[i] === '\r') return '';
    if (text[i] === '"') {
      i++; // skip opening quote
      let val = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            val += '"';
            i += 2;
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          val += text[i];
          i++;
        }
      }
      return val;
    } else {
      let val = '';
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
        val += text[i];
        i++;
      }
      return val;
    }
  }

  while (i < len) {
    const row = [];
    while (true) {
      row.push(readField());
      if (i < len && text[i] === ',') { i++; continue; }
      break;
    }
    // skip \r\n or \n
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

// ── Main ──
async function main() {
  const clean = process.argv.includes('--clean');
  
  // Connect to DB using same pattern as seed-shipping
  const uri = process.env.DB_URI || process.env.MONGODB_URI || 'mongodb+srv://yousofradi:yousof9009@cluster0.p4a1m.mongodb.net/ecommerce?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  // Import models after connection
  const Product = require('./backend/models/Product');
  const Collection = require('./backend/models/Collection');

  if (clean) {
    console.log('🧹 Cleaning existing data...');
    await Product.deleteMany({});
    await Collection.deleteMany({});
  }

  // Read CSV
  const csvText = fs.readFileSync('./Product-List.csv', 'utf-8');
  const rows = parseCSV(csvText);
  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Map header indices
  const idx = {};
  headers.forEach((h, i) => idx[h] = i);

  // ── Group rows by Handle (same handle = same product with variants) ──
  const productGroups = {};
  const groupOrder = [];

  for (const row of dataRows) {
    const handle = (row[idx['Handle']] || '').trim();
    if (!handle) continue;
    if (!productGroups[handle]) {
      productGroups[handle] = [];
      groupOrder.push(handle);
    }
    productGroups[handle].push(row);
  }

  console.log(`📦 Found ${groupOrder.length} unique products`);

  // ── Extract unique collection names → create Collection docs ──
  const collectionNames = new Set();
  for (const handle of groupOrder) {
    const mainRow = productGroups[handle][0];
    const colStr = (mainRow[idx['Collections']] || '').trim();
    if (colStr) {
      colStr.split(',').map(c => c.trim()).filter(Boolean).forEach(c => collectionNames.add(c));
    }
  }

  const collectionMap = {}; // name -> ObjectId
  let colOrder = 0;
  for (const name of collectionNames) {
    // Check if already exists
    let existing = await Collection.findOne({ name });
    if (!existing) {
      existing = await Collection.create({ name, sortOrder: colOrder });
    }
    collectionMap[name] = existing._id;
    colOrder++;
  }
  console.log(`📂 Created/found ${Object.keys(collectionMap).length} collections`);

  // ── Create Products ──
  let created = 0;
  let sortOrder = 0;

  for (const handle of groupOrder) {
    const rows = productGroups[handle];
    const mainRow = rows[0]; // First row has the product details

    const name = (mainRow[idx['Title']] || '').trim();
    if (!name) continue;

    const description = (mainRow[idx['Description']] || '').trim();
    const statusRaw = (mainRow[idx['Status']] || 'ACTIVE').trim().toUpperCase();
    const status = statusRaw === 'DRAFT' ? 'draft' : 'active';

    // Images: space-separated URLs in main row
    const imagesStr = (mainRow[idx['Images']] || '').trim();
    const images = imagesStr ? imagesStr.split(/\s+/).filter(u => u.startsWith('http')) : [];

    // Price handling: Regular Price is the base, Sale Price is the discounted
    const regularPrice = parseFloat(mainRow[idx['Regular Price']] || '0') || 0;
    const salePrice = parseFloat(mainRow[idx['Sale Price']] || '') || null;
    
    // If sale price exists, basePrice = regularPrice (original), salePrice = discounted
    const basePrice = regularPrice;

    // Quantity from main row
    const qtyRaw = (mainRow[idx['Quantity']] || '').trim();
    let quantity = null; // null = unlimited
    if (qtyRaw && qtyRaw !== 'Available' && qtyRaw !== '') {
      const parsed = parseInt(qtyRaw);
      if (!isNaN(parsed)) quantity = parsed;
    }

    // Collections
    const colStr = (mainRow[idx['Collections']] || '').trim();
    const colNames = colStr ? colStr.split(',').map(c => c.trim()).filter(Boolean) : [];
    const colIds = colNames.map(n => collectionMap[n]).filter(Boolean);
    const collectionId = colIds.length > 0 ? colIds[0] : null;

    // ── Build options from variant rows ──
    const options = [];
    
    // Check for Option1, Option2, Option3
    for (let optNum = 1; optNum <= 3; optNum++) {
      const optNameKey = `Option${optNum} Name`;
      const optValKey = `Option${optNum} Value`;
      const optName = (mainRow[idx[optNameKey]] || '').trim();
      
      if (!optName) continue;

      // Collect unique values across all variant rows
      const valuesMap = new Map();
      for (const row of rows) {
        const val = (row[idx[optValKey]] || '').trim();
        if (!val) continue;
        
        // Price for this variant
        const variantRegular = parseFloat(row[idx['Regular Price']] || '') || regularPrice;
        const variantSale = parseFloat(row[idx['Sale Price']] || '') || null;
        const variantPrice = variantSale || variantRegular;
        const priceDiff = variantPrice - (salePrice || basePrice);
        
        if (!valuesMap.has(val)) {
          valuesMap.set(val, { label: val, price: priceDiff > 0 ? Math.round(priceDiff) : 0 });
        }
      }

      if (valuesMap.size > 0) {
        options.push({
          name: optName,
          required: false,
          values: Array.from(valuesMap.values())
        });
      }
    }

    // Sum variant quantities if they exist
    if (rows.length > 1 && quantity === null) {
      let totalQty = 0;
      let hasNumeric = false;
      let allAvailable = true;
      for (const row of rows) {
        const vq = (row[idx['Quantity']] || '').trim();
        if (vq && vq !== 'Available') {
          const parsed = parseInt(vq);
          if (!isNaN(parsed)) {
            totalQty += parsed;
            hasNumeric = true;
            allAvailable = false;
          }
        }
      }
      if (hasNumeric) quantity = totalQty;
    }

    try {
      await Product.create({
        name,
        handle,
        basePrice,
        salePrice,
        imageUrl: images[0] || '',
        images,
        description,
        collectionId,
        collectionIds: colIds,
        options,
        sortOrder,
        active: status === 'active',
        status,
        quantity
      });
      created++;
      sortOrder++;
    } catch (err) {
      console.error(`❌ Failed to create "${name}":`, err.message);
    }
  }

  // ── Update collection images (use first product's first image) ──
  for (const [colName, colId] of Object.entries(collectionMap)) {
    const firstProduct = await Product.findOne({
      $or: [{ collectionId: colId }, { collectionIds: colId }],
      images: { $exists: true, $ne: [] }
    }).sort({ sortOrder: 1 });
    
    if (firstProduct && firstProduct.images.length > 0) {
      await Collection.findByIdAndUpdate(colId, { imageUrl: firstProduct.images[0] });
    }
  }

  console.log(`✅ Created ${created} products`);
  console.log('🎉 Seed complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
