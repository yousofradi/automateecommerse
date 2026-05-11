const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const upload = multer({ dest: 'uploads/' });

// ── Caching ──────────────────────────────────────────────
let productCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds

function clearCache() {
  productCache.clear();
}

// ── Helper: Fetch full product with relations ────────────
async function getFullProduct(productId) {
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  if (error || !product) return null;
  return await enrichProduct(product);
}

async function enrichProduct(product) {
  // Fetch images
  const { data: images } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', product.id)
    .order('position');
  product.images = (images || []).map(i => i.url);
  product.imageUrl = product.image_url;

  // Fetch collection IDs
  const { data: colLinks } = await supabase
    .from('product_collections')
    .select('collection_id')
    .eq('product_id', product.id);
  product.collectionIds = (colLinks || []).map(c => c.collection_id);
  product.collectionId = product.collectionIds[0] || null;

  // Fetch options with values
  const { data: options } = await supabase
    .from('product_options')
    .select('id, name, required, position')
    .eq('product_id', product.id)
    .order('position');

  if (options && options.length > 0) {
    for (const opt of options) {
      const { data: values } = await supabase
        .from('option_values')
        .select('id, label, price, sale_price')
        .eq('option_id', opt.id)
        .order('position');
      opt.values = (values || []).map(v => ({
        label: v.label,
        price: Number(v.price),
        salePrice: v.sale_price != null ? Number(v.sale_price) : null
      }));
    }
  }
  product.options = options || [];

  // Fetch variants
  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id);
  product.variants = (variants || []).map(v => ({
    combination: v.combination,
    price: Number(v.price),
    salePrice: v.sale_price != null ? Number(v.sale_price) : null,
    cost: v.cost != null ? Number(v.cost) : null,
    quantity: v.quantity,
    imageUrl: v.image_url,
    active: v.active
  }));

  // Map snake_case to camelCase for frontend compat
  product.basePrice = Number(product.base_price);
  product.salePrice = product.sale_price != null ? Number(product.sale_price) : null;
  product.sortOrder = product.sort_order;
  product.createdAt = product.created_at;
  product.updatedAt = product.updated_at;
  // Keep _id alias for frontend compat
  product._id = product.id;

  return product;
}

async function enrichProducts(products) {
  return Promise.all(products.map(p => enrichProduct(p)));
}

// ── Helper: Save product relations ──────────────────────
async function saveProductRelations(productId, body) {
  // Save images
  if (Array.isArray(body.images)) {
    await supabase.from('product_images').delete().eq('product_id', productId);
    if (body.images.length > 0) {
      const imageRows = body.images.map((url, i) => ({
        product_id: productId,
        url,
        position: i
      }));
      await supabase.from('product_images').insert(imageRows);
    }
  }

  // Save collection associations
  if (Array.isArray(body.collectionIds)) {
    await supabase.from('product_collections').delete().eq('product_id', productId);
    if (body.collectionIds.length > 0) {
      const colRows = body.collectionIds.map(cid => ({
        product_id: productId,
        collection_id: cid
      }));
      await supabase.from('product_collections').insert(colRows);
    }
  } else if (body.collectionId) {
    await supabase.from('product_collections').delete().eq('product_id', productId);
    await supabase.from('product_collections').insert({
      product_id: productId,
      collection_id: body.collectionId
    });
  }

  // Save options
  if (Array.isArray(body.options)) {
    // Delete existing options (cascade deletes values)
    await supabase.from('product_options').delete().eq('product_id', productId);
    for (let i = 0; i < body.options.length; i++) {
      const opt = body.options[i];
      const { data: optRow } = await supabase
        .from('product_options')
        .insert({
          product_id: productId,
          name: opt.name,
          required: opt.required || false,
          position: i
        })
        .select()
        .single();

      if (optRow && Array.isArray(opt.values)) {
        const valRows = opt.values.map((v, j) => ({
          option_id: optRow.id,
          label: v.label,
          price: v.price || 0,
          sale_price: v.salePrice ?? v.sale_price ?? null,
          position: j
        }));
        await supabase.from('option_values').insert(valRows);
      }
    }
  }

  // Save variants
  if (Array.isArray(body.variants)) {
    await supabase.from('product_variants').delete().eq('product_id', productId);
    if (body.variants.length > 0) {
      const varRows = body.variants.map(v => ({
        product_id: productId,
        combination: v.combination || {},
        price: v.price || 0,
        sale_price: v.salePrice ?? v.sale_price ?? null,
        cost: v.cost ?? null,
        quantity: v.quantity ?? null,
        image_url: v.imageUrl || v.image_url || '',
        active: v.active !== false
      }));
      await supabase.from('product_variants').insert(varRows);
    }
  }
}

// ── Public ──────────────────────────────────────────────

// GET /api/products — list all (with pagination & collection filter)
router.get('/', async (req, res) => {
  try {
    const { page, limit, admin, collectionId, search, hasOptions } = req.query;

    // Simple caching for public requests
    const cacheKey = JSON.stringify({ page, limit, admin, collectionId, search, hasOptions });
    if (admin !== 'true' && productCache.has(cacheKey)) {
      const cached = productCache.get(cacheKey);
      if (Date.now() - cached.time < CACHE_DURATION) {
        return res.json(cached.data);
      }
    }

    let query = supabase.from('products').select('*', { count: 'exact' });

    // If not admin request, only show active products
    if (admin !== 'true') {
      query = query.not('active', 'eq', false).not('status', 'eq', 'draft');
      // Hide out-of-stock: quantity is null (unlimited) or > 0
      query = query.or('quantity.is.null,quantity.gt.0');
    }

    // Server-side search by name
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Filter by collection
    if (collectionId) {
      // Get product IDs in this collection
      const { data: colProducts } = await supabase
        .from('product_collections')
        .select('product_id')
        .eq('collection_id', collectionId);
      const productIds = (colProducts || []).map(cp => cp.product_id);
      if (productIds.length === 0) {
        const emptyResult = page || limit
          ? { products: [], total: 0, page: 1, totalPages: 0 }
          : [];
        return res.json(emptyResult);
      }
      query = query.in('id', productIds);
    }

    // Filter by variable products (has at least one option group)
    let hasOptionsFilter = false;
    if (hasOptions === 'true') {
      const { data: optProducts } = await supabase
        .from('product_options')
        .select('product_id');
      const optProductIds = [...new Set((optProducts || []).map(o => o.product_id))];
      if (optProductIds.length === 0) {
        return res.json(page || limit ? { products: [], total: 0, page: 1, totalPages: 0 } : []);
      }
      query = query.in('id', optProductIds);
      hasOptionsFilter = true;
    }

    // Sort
    query = query.order('created_at', { ascending: false });

    // Check for manual ordering in collection
    let manualOrder = null;
    if (collectionId) {
      const { data: orderData } = await supabase
        .from('collection_product_order')
        .select('product_id, position')
        .eq('collection_id', collectionId)
        .order('position');
      if (orderData && orderData.length > 0) {
        manualOrder = orderData.map(o => o.product_id);
      }
    }

    if (page || limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      if (manualOrder && !search) {
        // Fetch all then sort manually
        const { data: allProducts, count } = await query;
        let products = allProducts || [];

        const orderMap = {};
        manualOrder.forEach((id, idx) => orderMap[id] = idx);
        products.sort((a, b) => {
          const idxA = orderMap[a.id] !== undefined ? orderMap[a.id] : 9999;
          const idxB = orderMap[b.id] !== undefined ? orderMap[b.id] : 9999;
          return idxA - idxB;
        });

        const sliced = products.slice(from, from + limitNum);
        const enriched = await enrichProducts(sliced);

        const result = {
          products: enriched,
          total: count || products.length,
          page: pageNum,
          totalPages: Math.ceil((count || products.length) / limitNum)
        };

        if (admin !== 'true') {
          productCache.set(cacheKey, { data: result, time: Date.now() });
        }
        return res.json(result);
      }

      query = query.range(from, to);
      const { data: products, count, error } = await query;
      if (error) throw error;

      const enriched = await enrichProducts(products || []);

      const result = {
        products: enriched,
        total: count || 0,
        page: pageNum,
        totalPages: Math.ceil((count || 0) / limitNum)
      };

      if (admin !== 'true') {
        productCache.set(cacheKey, { data: result, time: Date.now() });
      }
      res.json(result);
    } else {
      if (admin !== 'true') {
        query = query.limit(500);
      }
      const { data: products, error } = await query;
      if (error) throw error;

      const enriched = await enrichProducts(products || []);

      if (admin !== 'true') {
        productCache.set(cacheKey, { data: enriched, time: Date.now() });
      }
      res.json(enriched);
    }
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id — single product
router.get('/:id', async (req, res) => {
  try {
    const product = await getFullProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Fetch product error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// GET /api/products/handle/:handle — single product by handle
router.get('/handle/:handle', async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('handle', req.params.handle)
      .single();
    if (error || !product) return res.status(404).json({ error: 'Product not found' });
    const enriched = await enrichProduct(product);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product by handle' });
  }
});

const { uploadToCloudinary, isDriveUrl } = require('../utils/cloudinary');

// Helper to process drive images in payload
async function processDriveImages(body) {
  try {
    if (isDriveUrl(body.imageUrl)) {
      body.imageUrl = await uploadToCloudinary(body.imageUrl);
    }
    if (Array.isArray(body.images)) {
      for (let i = 0; i < body.images.length; i++) {
        if (isDriveUrl(body.images[i])) {
          body.images[i] = await uploadToCloudinary(body.images[i]);
        }
      }
    }
    if (Array.isArray(body.variants)) {
      for (let v of body.variants) {
        if (isDriveUrl(v.imageUrl)) {
          v.imageUrl = await uploadToCloudinary(v.imageUrl);
        }
      }
    }
  } catch (err) {
    console.error('Error processing drive images:', err);
  }
}

// ── Admin ───────────────────────────────────────────────

// POST /api/products — create
router.post('/', adminAuth, async (req, res) => {
  try {
    const body = req.body;
    const { name, basePrice } = body;

    if (!name || basePrice == null) {
      return res.status(400).json({ error: 'Name and basePrice are required' });
    }

    // Process images if they are from Google Drive
    await processDriveImages(body);

    // Get count for sort order
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: body.name,
        handle: body.handle || '',
        base_price: body.basePrice,
        sale_price: body.salePrice ?? null,
        image_url: body.imageUrl || '',
        description: body.description || '',
        sort_order: count || 0,
        active: body.active !== false,
        status: body.status || 'active',
        quantity: body.quantity ?? null
      })
      .select()
      .single();

    if (error) throw error;

    // Save relations (images, collections, options, variants)
    await saveProductRelations(product.id, body);

    const full = await getFullProduct(product.id);
    clearCache();
    res.status(201).json(full);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id — update
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const body = req.body;

    // Process images if they are from Google Drive
    await processDriveImages(body);

    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.handle !== undefined) updateData.handle = body.handle;
    if (body.basePrice !== undefined) updateData.base_price = body.basePrice;
    if (body.salePrice !== undefined) updateData.sale_price = body.salePrice;
    if (body.imageUrl !== undefined) updateData.image_url = body.imageUrl;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.quantity !== undefined) updateData.quantity = body.quantity;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', req.params.id);
      if (error) throw error;
    }

    // Update relations
    await saveProductRelations(req.params.id, body);

    const product = await getFullProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    clearCache();
    res.json(product);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id — delete
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    clearCache();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/products/delete/batch — bulk delete
router.post('/delete/batch', adminAuth, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: 'productIds must be an array' });
    await supabase.from('products').delete().in('id', productIds);
    clearCache();
    res.json({ message: 'Products deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete products' });
  }
});

// POST /api/products/deactivate/batch — bulk deactivate
router.post('/deactivate/batch', adminAuth, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: 'productIds must be an array' });
    await supabase
      .from('products')
      .update({ active: false, status: 'draft' })
      .in('id', productIds);
    clearCache();
    res.json({ message: 'Products deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate products' });
  }
});

// PUT /api/products/reorder/batch — reorder products
router.put('/reorder/batch', adminAuth, async (req, res) => {
  try {
    const { order } = req.body;
    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ error: 'order array is required' });
    }
    for (const item of order) {
      await supabase
        .from('products')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id);
    }
    clearCache();
    res.json({ message: 'Products reordered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder products' });
  }
});

// PUT /api/products/collection/batch — bulk update collection
router.put('/collection/batch', adminAuth, async (req, res) => {
  try {
    const { productIds, collectionId, action } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ error: 'productIds must be an array' });

    if (action === 'add') {
      const rows = productIds.map(pid => ({
        product_id: pid,
        collection_id: collectionId
      }));
      // Use upsert to avoid duplicates
      await supabase.from('product_collections').upsert(rows, {
        onConflict: 'product_id,collection_id'
      });
    } else if (action === 'remove') {
      await supabase
        .from('product_collections')
        .delete()
        .eq('collection_id', collectionId)
        .in('product_id', productIds);
    } else if (action === 'set') {
      // Remove collection from all products
      await supabase
        .from('product_collections')
        .delete()
        .eq('collection_id', collectionId);
      // Add to specified products
      if (productIds.length > 0) {
        const rows = productIds.map(pid => ({
          product_id: pid,
          collection_id: collectionId
        }));
        await supabase.from('product_collections').insert(rows);
      }
    } else {
      return res.status(400).json({ error: 'invalid action' });
    }

    clearCache();
    res.json({ message: 'Product collections updated successfully' });
  } catch (err) {
    console.error('Batch collection update error:', err);
    res.status(500).json({ error: 'Failed to update product collections' });
  }
});

// POST /api/products/import — Bulk Import
router.post('/import', adminAuth, upload.single('file'), async (req, res) => {
  try {
    const { deleteAll, createCollections } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const cleanPrice = (val) => {
      if (val === null || val === undefined || val === '') return null;
      const cleaned = val.toString().replace(/[^\d.]/g, '');
      return cleaned === '' ? 0 : parseFloat(cleaned);
    };

    if (deleteAll === 'true') {
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      clearCache();
    }

    const normalizeArabic = (str) => {
      if (!str) return '';
      return str.trim()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .toLowerCase();
    };

    // Get all collections to map names
    const { data: collections } = await supabase.from('collections').select('*');
    const collectionMap = {};
    (collections || []).forEach(c => {
      collectionMap[normalizeArabic(c.name)] = c.id;
    });

    const productsMap = new Map();
    let lastProduct = null;

    const stream = fs.createReadStream(req.file.path).pipe(csv({
      mapHeaders: ({ header }) => header.toLowerCase().replace(/\ufeff/g, '').trim()
    }));

    for await (const row of stream) {
      const title = row['title'] ? row['title'].trim() : '';

      if (title) {
        const product = {
          name: title,
          description: row['description'] || '',
          basePrice: cleanPrice(row['regular price']),
          salePrice: row['sale price'] ? cleanPrice(row['sale price']) : null,
          imageUrl: '',
          images: [],
          status: (row['status'] || 'active').toLowerCase(),
          quantity: (row['quantity'] === 'Available' || !row['quantity']) ? null : (parseInt(row['quantity']) || 0),
          collectionIds: [],
          options: []
        };

        const imagesVal = row['images'];
        if (imagesVal) {
          const imgs = imagesVal.split(/\s+/).filter(url => url.startsWith('http'));
          product.images = imgs;
          product.imageUrl = imgs[0] || '';
        }

        // Handle collections
        const collectionsVal = row['collections'];
        if (collectionsVal) {
          const names = collectionsVal.split(',').map(n => n.trim()).filter(Boolean);
          for (const name of names) {
            const normName = normalizeArabic(name);
            if (collectionMap[normName]) {
              product.collectionIds.push(collectionMap[normName]);
            } else if (createCollections === 'true') {
              try {
                const { data: newCol } = await supabase
                  .from('collections')
                  .insert({
                    name,
                    url_name: name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '') || Date.now().toString()
                  })
                  .select()
                  .single();
                if (newCol) {
                  collectionMap[normName] = newCol.id;
                  product.collectionIds.push(newCol.id);
                }
              } catch (e) {
                console.error('Failed to auto-create collection:', name, e.message);
              }
            }
          }
        }

        productsMap.set(title, product);
        lastProduct = product;
      }

      // Handle Options
      if (lastProduct) {
        for (let i = 1; i <= 3; i++) {
          const optName = row[`option${i} name`] ? row[`option${i} name`].trim() : '';
          const optValue = row[`option${i} value`] ? row[`option${i} value`].trim() : '';

          if (optName && optValue) {
            let group = lastProduct.options.find(g => g.name === optName);
            if (!group) {
              group = { name: optName, values: [] };
              lastProduct.options.push(group);
            }

            const rowReg = row['regular price'];
            const rowSale = row['sale price'];
            const price = rowReg ? cleanPrice(rowReg) : lastProduct.basePrice;
            const sPrice = rowSale ? cleanPrice(rowSale) : lastProduct.salePrice;

            if (!group.values.find(v => v.label === optValue)) {
              group.values.push({
                label: optValue,
                price: price,
                salePrice: sPrice
              });
            }
          }
        }
      }
    }

    // Now upsert products
    const finalProducts = Array.from(productsMap.values());
    let index = 0;
    for (const pData of finalProducts) {
      // Check existing
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('name', pData.name)
        .maybeSingle();

      if (existing) {
        // Update
        await supabase.from('products').update({
          description: pData.description,
          base_price: pData.basePrice,
          sale_price: pData.salePrice,
          image_url: pData.imageUrl,
          status: pData.status,
          quantity: pData.quantity
        }).eq('id', existing.id);

        await saveProductRelations(existing.id, pData);
      } else {
        const sortOrder = deleteAll === 'true' ? index++ : (await supabase.from('products').select('*', { count: 'exact', head: true })).count || 0;

        const { data: newProd } = await supabase
          .from('products')
          .insert({
            name: pData.name,
            description: pData.description,
            base_price: pData.basePrice,
            sale_price: pData.salePrice,
            image_url: pData.imageUrl,
            active: pData.status === 'active',
            status: pData.status,
            quantity: pData.quantity,
            sort_order: sortOrder
          })
          .select()
          .single();

        if (newProd) {
          await saveProductRelations(newProd.id, pData);
        }
      }
    }

    // Cleanup file
    try { fs.unlinkSync(req.file.path); } catch(e) {}
    clearCache();
    if (createCollections === 'true') {
      try {
        require('./collectionRoutes').clearCache();
      } catch (e) {}
    }

    res.json({ message: `تم استيراد ${finalProducts.length} منتج بنجاح`, count: finalProducts.length });
  } catch (err) {
    console.error('Import Error:', err);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    res.status(500).json({ error: 'فشل استيراد المنتجات: ' + err.message });
  }
});

module.exports = router;
