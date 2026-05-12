"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
// Attach Prisma client to each request for easy access in route handlers
app.use((req, _res, next) => {
    req.prisma = prisma;
    next();
});
// ── Middleware ───────────────────────────────────────
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json({ limit: '5mb' }));
// ── Routes ───────────────────────────────────────
const products_1 = __importDefault(require("./routes/products"));
const collections_1 = __importDefault(require("./routes/collections"));
const orders_1 = __importDefault(require("./routes/orders"));
const auth_1 = __importDefault(require("./routes/auth"));
app.use('/api/products', products_1.default);
app.use('/api/collections', collections_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/auth', auth_1.default);
// ── Health check ───────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ── 404 handler ───────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// ── Error handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// ── Start server ───────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});
exports.default = app;
