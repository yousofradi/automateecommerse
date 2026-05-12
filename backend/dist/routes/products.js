"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAuth_1 = require("../middleware/adminAuth");
const router = (0, express_1.Router)();
// GET /api/products
router.get('/', async (req, res) => {
    const prisma = req.prisma;
    try {
        const { collectionId, search, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);
        const where = {
            active: true,
            status: 'ACTIVE',
        };
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }
        if (collectionId) {
            where.categories = {
                some: {
                    id: parseInt(collectionId)
                }
            };
        }
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    categories: true,
                    variants: true,
                    options: {
                        include: {
                            values: true
                        }
                    }
                },
                skip,
                take,
                orderBy: { sortOrder: 'asc' }
            }),
            prisma.product.count({ where })
        ]);
        res.json({
            products,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / take)
        });
    }
    catch (err) {
        console.error('Fetch products error:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// GET /api/products/:id
router.get('/:id', async (req, res) => {
    const prisma = req.prisma;
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'Invalid product ID' });
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                categories: true,
                variants: true,
                options: {
                    include: {
                        values: true
                    }
                }
            }
        });
        if (!product)
            return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    }
    catch (err) {
        console.error('Fetch product error:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
// POST /api/products — create (Admin)
router.post('/', adminAuth_1.adminAuth, async (req, res) => {
    const prisma = req.prisma;
    try {
        const { name, slug, basePrice, salePrice, imageUrl, images, status, categories, options } = req.body;
        const product = await prisma.product.create({
            data: {
                name,
                slug,
                basePrice,
                salePrice,
                imageUrl,
                images: images || [],
                status: status || 'ACTIVE',
                categories: {
                    connect: categories?.map((id) => ({ id })) || []
                },
                options: {
                    create: options?.map((opt) => ({
                        name: opt.name,
                        required: opt.required || false,
                        values: {
                            create: opt.values?.map((val) => ({
                                label: val.label,
                                price: val.price || 0,
                                salePrice: val.salePrice
                            }))
                        }
                    })) || []
                }
            },
            include: {
                categories: true,
                options: {
                    include: {
                        values: true
                    }
                }
            }
        });
        res.status(201).json(product);
    }
    catch (err) {
        console.error('Create product error:', err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});
// PUT /api/products/:id — update (Admin)
router.put('/:id', adminAuth_1.adminAuth, async (req, res) => {
    const prisma = req.prisma;
    try {
        const id = parseInt(req.params.id);
        const body = req.body;
        const product = await prisma.product.update({
            where: { id },
            data: {
                name: body.name,
                slug: body.slug,
                basePrice: body.basePrice,
                salePrice: body.salePrice,
                imageUrl: body.imageUrl,
                images: body.images,
                status: body.status,
                active: body.active
            }
        });
        res.json(product);
    }
    catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
// DELETE /api/products/:id — delete (Admin)
router.delete('/:id', adminAuth_1.adminAuth, async (req, res) => {
    const prisma = req.prisma;
    try {
        const id = parseInt(req.params.id);
        await prisma.product.delete({ where: { id } });
        res.json({ message: 'Product deleted' });
    }
    catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});
exports.default = router;
