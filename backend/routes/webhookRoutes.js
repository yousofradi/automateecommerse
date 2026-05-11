const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const adminAuth = require('../middleware/adminAuth');

// All webhook routes are admin-only
router.get('/', adminAuth, webhookController.getWebhooks);
router.post('/', adminAuth, webhookController.createWebhook);
router.put('/:id', adminAuth, webhookController.updateWebhook);
router.delete('/:id', adminAuth, webhookController.deleteWebhook);

module.exports = router;
