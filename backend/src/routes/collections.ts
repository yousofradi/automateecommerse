import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// GET /api/collections
router.get('/', async (req, res) => {
  const prisma = (req as any).prisma as PrismaClient;
  try {
    const collections = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    res.json(collections);
  } catch (err) {
    console.error('Fetch collections error:', err);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// GET /api/collections/:id
router.get('/:id', async (req, res) => {
  const prisma = (req as any).prisma as PrismaClient;
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid collection ID' });

    const collection = await prisma.category.findUnique({
      where: { id }
    });
    if (!collection) return res.status(404).json({ error: 'Collection not found' });
    res.json(collection);
  } catch (err) {
    console.error('Fetch collection error:', err);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

export default router;
