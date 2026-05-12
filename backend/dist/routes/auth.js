"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Placeholder for auth routes
router.post('/login', (req, res) => {
    res.status(501).json({ error: 'Auth not implemented yet' });
});
router.post('/register', (req, res) => {
    res.status(501).json({ error: 'Auth not implemented yet' });
});
router.get('/me', (req, res) => {
    res.status(501).json({ error: 'Auth not implemented yet' });
});
exports.default = router;
