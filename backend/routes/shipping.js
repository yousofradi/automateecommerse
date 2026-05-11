const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const adminAuth = require('../middleware/adminAuth');
const defaultShippingFees = require('../config/shipping');

// GET /api/shipping — return all shipping fees (or seed if empty)
router.get('/', async (req, res) => {
  try {
    let { data: fees } = await supabase.from('shipping_fees').select('*');
    if (!fees || fees.length === 0) {
      const seedData = Object.entries(defaultShippingFees).map(([gov, fee]) => ({ governorate: gov, fee }));
      await supabase.from('shipping_fees').insert(seedData);
      const result = await supabase.from('shipping_fees').select('*');
      fees = result.data || [];
    }
    const map = {};
    fees.forEach(f => { map[f.governorate] = Number(f.fee); });
    res.json(map);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin: Get raw DB objects
router.get('/list', adminAuth, async (req, res) => {
  try {
    const { data } = await supabase.from('shipping_fees').select('*').order('governorate');
    res.json((data || []).map(f => ({ _id: f.id, id: f.id, governorate: f.governorate, fee: Number(f.fee) })));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Admin: Update fee
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('shipping_fees').update({ fee: req.body.fee }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ _id: data.id, id: data.id, governorate: data.governorate, fee: Number(data.fee) });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

// Admin: Add new governorate
router.post('/', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('shipping_fees').insert({ governorate: req.body.governorate, fee: req.body.fee }).select().single();
    if (error) throw error;
    res.json({ _id: data.id, id: data.id, governorate: data.governorate, fee: Number(data.fee) });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

// Admin: Bulk update all to a single fee
router.post('/bulk-update', adminAuth, async (req, res) => {
  try {
    const { fee } = req.body;
    if (fee == null || isNaN(fee)) return res.status(400).json({ error: 'Valid fee is required' });
    const { count } = await supabase.from('shipping_fees').select('*', { count: 'exact', head: true });
    if (!count || count === 0) {
      const seedData = Object.entries(defaultShippingFees).map(([gov]) => ({ governorate: gov, fee }));
      await supabase.from('shipping_fees').insert(seedData);
    } else {
      await supabase.from('shipping_fees').update({ fee }).neq('id', '00000000-0000-0000-0000-000000000000');
    }
    res.json({ success: true, message: 'All shipping fees updated' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
