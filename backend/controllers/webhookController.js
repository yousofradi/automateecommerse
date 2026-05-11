const supabase = require('../config/db');

exports.getWebhooks = async (req, res) => {
  try {
    const { data, error } = await supabase.from('webhooks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json((data || []).map(w => ({ _id: w.id, id: w.id, url: w.url, description: w.description, active: w.active, events: w.events, createdAt: w.created_at })));
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.createWebhook = async (req, res) => {
  try {
    const { data, error } = await supabase.from('webhooks').insert({
      url: req.body.url, description: req.body.description || '',
      active: req.body.active !== false, events: req.body.events || ['order.created']
    }).select().single();
    if (error) throw error;
    res.status(201).json({ _id: data.id, id: data.id, url: data.url, description: data.description, active: data.active, events: data.events });
  } catch (error) { res.status(400).json({ error: error.message }); }
};

exports.updateWebhook = async (req, res) => {
  try {
    const updates = {};
    if (req.body.url !== undefined) updates.url = req.body.url;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.active !== undefined) updates.active = req.body.active;
    if (req.body.events !== undefined) updates.events = req.body.events;
    const { data, error } = await supabase.from('webhooks').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Webhook not found' });
    res.json({ _id: data.id, id: data.id, url: data.url, description: data.description, active: data.active, events: data.events });
  } catch (error) { res.status(400).json({ error: error.message }); }
};

exports.deleteWebhook = async (req, res) => {
  try {
    const { error } = await supabase.from('webhooks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
