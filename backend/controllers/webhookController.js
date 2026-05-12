const Webhook = require('../models/Webhook');

exports.getWebhooks = async (req, res) => {
  try {
    const webhooks = await Webhook.find().sort({ createdAt: -1 });
    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createWebhook = async (req, res) => {
  try {
    const webhook = new Webhook(req.body);
    await webhook.save();
    res.status(201).json(webhook);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateWebhook = async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    res.json(webhook);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    res.json({ message: 'Webhook deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
