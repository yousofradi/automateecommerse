const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const adminAuth = require('../middleware/adminAuth');

router.get('/paymentMethods', async (req, res) => {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'autoecommerce_global_settings').maybeSingle();
    res.json(data && data.value ? (data.value.paymentMethods || []) : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:key', async (req, res) => {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', req.params.key).maybeSingle();
    res.json(data ? data.value : null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:key', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').upsert(
      { key: req.params.key, value: req.body.value },
      { onConflict: 'key' }
    ).select().single();
    if (error) throw error;
    res.json(data.value);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/pwa/manifest.json', async (req, res) => {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'autoecommerce_global_settings').maybeSingle();
    const logoUrl = data?.value?.storeLogo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    const storeName = data?.value?.storeName || 'AutoEcommerce Admin';
    res.header('Content-Type', 'application/manifest+json');
    res.header('Access-Control-Allow-Origin', '*');
    res.json({
      id: "autoecommerce-admin-v1", name: storeName + " Admin", short_name: "Admin",
      description: "Store Management Dashboard", start_url: "/admin/index.html",
      scope: "/admin/", display: "standalone", background_color: "#ffffff",
      theme_color: "#64748b", orientation: "portrait",
      icons: [
        { src: logoUrl, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" }
      ]
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
