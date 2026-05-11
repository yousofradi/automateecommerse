const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const adminAuth = require('../middleware/adminAuth');

// POST /api/seed/collections — replaces existing collections with predefined list
router.post('/collections', adminAuth, async (req, res) => {
  try {
    const collectionsData = [
      { name: 'سكوب سندورة', image_url: 'https://assets.wuiltstore.com/cmo0fglem05nc01lzdnl9fvh8_scope.webp' },
      { name: 'ألعاب', image_url: 'https://assets.wuiltstore.com/cmo0gt4x805sk01n0exmd9zpl_Games.webp' },
      { name: 'أدوات فنية / تلوين', image_url: 'https://assets.wuiltstore.com/cmo0ghhw505rb01lw53u64q3m_Paint.webp' },
      { name: 'استيكرات', image_url: 'https://assets.wuiltstore.com/cmo0gm31705l401l7gsye6xl0_stickers.webp' },
      { name: 'ديكورالمكتب', image_url: 'https://assets.wuiltstore.com/cmo04f8v105qn01l8fi0tg23k_WhatsApp_Image_2026-04-15_at_3.59.46_PM.webp' },
      { name: 'المنظمات', image_url: 'https://assets.wuiltstore.com/cmo0f1b6005k401l7fifjhre2_organize.webp' },
      { name: 'شنط / توك / اكسسورات', image_url: 'https://assets.wuiltstore.com/cmo0ezw3z05n301lzcnujdmqp_bags.webp' },
      { name: 'لانش بوكس/مجات/زجاجات', image_url: 'https://assets.wuiltstore.com/cmo0gw54j05nx01lzbeay9u9s_Cups.webp' },
      { name: 'دفاتر / كشاكيل', image_url: 'https://assets.wuiltstore.com/cmo0gqr7g05rf01lw67ng3o0i_paper.webp' },
      { name: 'نوت بوك', image_url: 'https://assets.wuiltstore.com/cmo0erg2z05mz01lz872kai3p_note.webp' },
      { name: 'استيكي نوت', image_url: 'https://assets.wuiltstore.com/cmo0g29og05sc01n09wxm7lm7_stickynotes.webp' },
      { name: 'اقلام متعددة الالوان', image_url: 'https://assets.wuiltstore.com/cmo0g4sk405r401lw6l6k74ug_multicolor.webp' },
      { name: 'اقلام جاف / حبر', image_url: 'https://assets.wuiltstore.com/cmo0ducgq05mk01lz5hcx85zn_WhatsApp_Image_2026-04-15_at_8.26.26_PM.webp' },
      { name: 'اقلام رصاص / سنون', image_url: 'https://assets.wuiltstore.com/cmo0gdy5405r901lw46gq56o6_pencils.webp' },
      { name: 'اقلام هايلايتر', image_url: 'https://assets.wuiltstore.com/cmo0ga3u405r801lw8kwmhpz0_hightlighter.webp' },
      { name: 'كوريكتور', image_url: 'https://assets.wuiltstore.com/cmo0fxcpd05nj01lzer8ncltm_corrector.webp' },
      { name: 'ادوات التخطيط والتلخيص', image_url: 'https://assets.wuiltstore.com/cmo0fe5rz05rs01n088zzaw9p_plaining.webp' },
      { name: 'مقالم مستوردة', image_url: 'https://assets.wuiltstore.com/cmo0famk605kc01l7gaiv17yk_case.webp' },
      { name: 'الادوات الهندسيه', image_url: 'https://assets.wuiltstore.com/cmo0fz3tj05sa01n0du419tyw_engineeringTools.webp' },
      { name: 'برايات', image_url: 'https://assets.wuiltstore.com/cmo0f4fhy05n901lzdk9y3y1n_br.webp' },
      { name: 'أستيكه (جوما)', image_url: 'https://assets.wuiltstore.com/cmo0f7oqe05qm01lwbsay4oje_earser.webp' }
    ];

    // Clear existing
    await supabase.from('product_collections').delete().neq('product_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('collection_product_order').delete().neq('collection_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('collections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    for (const c of collectionsData) {
      c.url_name = c.name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/(^-|-$)+/g, '');
      await supabase.from('collections').insert(c);
    }

    res.json({ message: 'Collections replaced successfully' });
  } catch (err) { res.status(500).json({ error: 'Seed failed: ' + err.message }); }
});

// POST /api/seed — import products from CSV text
router.post('/', adminAuth, async (req, res) => {
  try {
    const { clean, csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: 'csvData is required' });

    if (clean) {
      await supabase.from('product_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_options').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('product_collections').delete().neq('product_id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('collections').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const rows = parseCSV(csvData);
    const headers = rows[0];
    const dataRows = rows.slice(1);
    const idx = {};
    headers.forEach((h, i) => idx[h] = i);

    // Group by Handle
    const productGroups = {};
    const groupOrder = [];
    for (const row of dataRows) {
      const handle = (row[idx['Handle']] || '').trim();
      if (!handle) continue;
      if (!productGroups[handle]) { productGroups[handle] = []; groupOrder.push(handle); }
      productGroups[handle].push(row);
    }

    // Extract collections
    const collectionNames = new Set();
    for (const handle of groupOrder) {
      const mainRow = productGroups[handle][0];
      const colStr = (mainRow[idx['Collections']] || '').trim();
      if (colStr) colStr.split(',').map(c => c.trim()).filter(Boolean).forEach(c => collectionNames.add(c));
    }

    const collectionMap = {};
    for (const name of collectionNames) {
      const { data: existing } = await supabase.from('collections').select('id').eq('name', name).maybeSingle();
      if (existing) { collectionMap[name] = existing.id; }
      else {
        const { data: newCol } = await supabase.from('collections').insert({ name }).select().single();
        if (newCol) collectionMap[name] = newCol.id;
      }
    }

    let created = 0;
    let sortOrder = 0;
    for (const handle of groupOrder) {
      const rows = productGroups[handle];
      const mainRow = rows[0];
      const name = (mainRow[idx['Title']] || '').trim();
      if (!name) continue;

      const description = (mainRow[idx['Description']] || '').trim();
      const statusRaw = (mainRow[idx['Status']] || 'ACTIVE').trim().toUpperCase();
      const status = statusRaw === 'DRAFT' ? 'draft' : 'active';
      const imagesStr = (mainRow[idx['Images']] || '').trim();
      const images = imagesStr ? imagesStr.split(/\s+/).filter(u => u.startsWith('http')) : [];
      const regularPrice = parseFloat(mainRow[idx['Regular Price']] || '0') || 0;
      const salePrice = parseFloat(mainRow[idx['Sale Price']] || '') || null;

      const qtyRaw = (mainRow[idx['Quantity']] || '').trim();
      let quantity = null;
      if (qtyRaw && qtyRaw !== 'Available') {
        const parsed = parseInt(qtyRaw);
        if (!isNaN(parsed)) quantity = parsed;
      }

      const colStr = (mainRow[idx['Collections']] || '').trim();
      const colNames = colStr ? colStr.split(',').map(c => c.trim()).filter(Boolean) : [];
      const colIds = colNames.map(n => collectionMap[n]).filter(Boolean);

      // Build options
      const options = [];
      for (let optNum = 1; optNum <= 3; optNum++) {
        const optName = (mainRow[idx[`Option${optNum} Name`]] || '').trim();
        if (!optName) continue;
        const valuesMap = new Map();
        for (const row of rows) {
          const val = (row[idx[`Option${optNum} Value`]] || '').trim();
          if (!val) continue;
          const vr = parseFloat(row[idx['Regular Price']] || '') || regularPrice;
          const vs = parseFloat(row[idx['Sale Price']] || '') || null;
          const vp = vs || vr;
          const diff = vp - (salePrice || regularPrice);
          if (!valuesMap.has(val)) valuesMap.set(val, { label: val, price: diff > 0 ? Math.round(diff) : 0 });
        }
        if (valuesMap.size > 0) options.push({ name: optName, required: false, values: Array.from(valuesMap.values()) });
      }

      try {
        const { data: newProd } = await supabase.from('products').insert({
          name, handle, base_price: regularPrice, sale_price: salePrice,
          image_url: images[0] || '', description,
          sort_order: sortOrder, active: status === 'active', status, quantity
        }).select().single();

        if (newProd) {
          // Save images
          if (images.length > 0) {
            await supabase.from('product_images').insert(images.map((url, i) => ({ product_id: newProd.id, url, position: i })));
          }
          // Save collections
          if (colIds.length > 0) {
            await supabase.from('product_collections').insert(colIds.map(cid => ({ product_id: newProd.id, collection_id: cid })));
          }
          // Save options
          for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const { data: optRow } = await supabase.from('product_options').insert({ product_id: newProd.id, name: opt.name, position: i }).select().single();
            if (optRow && opt.values.length > 0) {
              await supabase.from('option_values').insert(opt.values.map((v, j) => ({ option_id: optRow.id, label: v.label, price: v.price, position: j })));
            }
          }
          created++;
        }
        sortOrder++;
      } catch (err) { /* skip invalid */ }
    }

    res.json({ message: `Seed complete: ${created} products, ${Object.keys(collectionMap).length} collections` });
  } catch (err) { res.status(500).json({ error: 'Seed failed: ' + err.message }); }
});

// CSV parser (same as original)
function parseCSV(text) {
  const rows = []; let i = 0; const len = text.length;
  function readField() {
    if (i >= len || text[i] === '\n' || text[i] === '\r') return '';
    if (text[i] === '"') {
      i++; let val = '';
      while (i < len) {
        if (text[i] === '"') { if (i + 1 < len && text[i + 1] === '"') { val += '"'; i += 2; } else { i++; break; } }
        else { val += text[i]; i++; }
      }
      return val;
    } else {
      let val = '';
      while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') { val += text[i]; i++; }
      return val;
    }
  }
  while (i < len) {
    const row = [];
    while (true) { row.push(readField()); if (i < len && text[i] === ',') { i++; continue; } break; }
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

module.exports = router;
