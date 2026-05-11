const supabase = require('../config/db');

exports.getCollections = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collections').select('*').order('sort_order').order('created_at', { ascending: false });
    if (error) throw error;
    // Map to camelCase for frontend compat
    const collections = (data || []).map(c => ({
      _id: c.id, id: c.id, name: c.name, urlName: c.url_name,
      description: c.description, imageUrl: c.image_url,
      sortOrder: c.sort_order, createdAt: c.created_at, updatedAt: c.updated_at
    }));
    res.json(collections);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.getCollection = async (req, res) => {
  try {
    const { id } = req.params;
    let query;
    // UUID check
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUUID) {
      query = supabase.from('collections').select('*').eq('id', id);
    } else {
      query = supabase.from('collections').select('*').eq('url_name', id);
    }
    const { data: collection, error } = await query.maybeSingle();
    if (error) throw error;
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    // Get product order
    const { data: orderData } = await supabase
      .from('collection_product_order').select('product_id')
      .eq('collection_id', collection.id).order('position');

    res.json({
      _id: collection.id, id: collection.id, name: collection.name,
      urlName: collection.url_name, description: collection.description,
      imageUrl: collection.image_url, sortOrder: collection.sort_order,
      productOrder: (orderData || []).map(o => o.product_id),
      createdAt: collection.created_at, updatedAt: collection.updated_at
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createCollection = async (req, res) => {
  try {
    const body = req.body;
    const { data, error } = await supabase.from('collections').insert({
      name: body.name, url_name: body.urlName || body.url_name || null,
      description: body.description || '', image_url: body.imageUrl || body.image_url || '',
      sort_order: body.sortOrder || body.sort_order || 0
    }).select().single();
    if (error) throw error;
    // Save product order if provided
    if (Array.isArray(body.productOrder) && body.productOrder.length > 0) {
      const rows = body.productOrder.map((pid, i) => ({ collection_id: data.id, product_id: pid, position: i }));
      await supabase.from('collection_product_order').insert(rows);
    }
    res.status(201).json({ _id: data.id, id: data.id, name: data.name, urlName: data.url_name, description: data.description, imageUrl: data.image_url, sortOrder: data.sort_order });
  } catch (error) { res.status(400).json({ error: error.message }); }
};

exports.updateCollection = async (req, res) => {
  try {
    const body = req.body;
    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.urlName !== undefined || body.url_name !== undefined) updateData.url_name = body.urlName || body.url_name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.imageUrl !== undefined || body.image_url !== undefined) updateData.image_url = body.imageUrl || body.image_url;
    if (body.sortOrder !== undefined || body.sort_order !== undefined) updateData.sort_order = body.sortOrder || body.sort_order;

    const { data, error } = await supabase.from('collections').update(updateData).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Collection not found' });

    // Update product order if provided
    if (Array.isArray(body.productOrder)) {
      await supabase.from('collection_product_order').delete().eq('collection_id', req.params.id);
      if (body.productOrder.length > 0) {
        const rows = body.productOrder.map((pid, i) => ({ collection_id: req.params.id, product_id: pid, position: i }));
        await supabase.from('collection_product_order').insert(rows);
      }
    }

    res.json({ _id: data.id, id: data.id, name: data.name, urlName: data.url_name, description: data.description, imageUrl: data.image_url, sortOrder: data.sort_order });
  } catch (error) { res.status(400).json({ error: error.message }); }
};

exports.deleteCollection = async (req, res) => {
  try {
    const { error } = await supabase.from('collections').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Collection deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.deleteCollectionsBatch = async (req, res) => {
  try {
    const { collectionIds } = req.body;
    if (!Array.isArray(collectionIds)) return res.status(400).json({ error: 'collectionIds must be an array' });
    await supabase.from('collections').delete().in('id', collectionIds);
    res.json({ message: 'Collections deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
