const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const supabase = require('../config/db');
const { publicKey, privateKey } = require('../config/notifications');
const adminAuth = require('../middleware/adminAuth');

webpush.setVapidDetails('mailto:support@autoecommerce.com', publicKey, privateKey);

// Register a new subscription
router.post('/subscribe', adminAuth, async (req, res) => {
  try {
    const subscription = req.body;
    await supabase.from('push_subscriptions').upsert(
      { subscription, admin_id: 'primary_admin', created_at: new Date().toISOString() },
      { onConflict: 'subscription->>endpoint' }
    );
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Test notification
router.post('/test', adminAuth, async (req, res) => {
  try {
    const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');
    const payload = JSON.stringify({
      title: 'AutoEcommerce Admin', body: 'Notifications are working! 🚀', icon: '/admin/logo.png'
    });
    const results = await Promise.all(
      (subscriptions || []).map(sub =>
        webpush.sendNotification(sub.subscription, payload)
          .catch(err => {
            if (err.statusCode === 410) return supabase.from('push_subscriptions').delete().eq('id', sub.id);
            throw err;
          })
      )
    );
    res.json({ success: true, count: results.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
