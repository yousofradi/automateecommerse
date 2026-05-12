import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminAuth } from '../middleware/adminAuth';

const router = Router();

// GET /api/products
router.get('/', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  try {
    const { collectionId, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      active: true,
      status: 'ACTIVE',
    };

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    if (collectionId) {
      where.categories = {
        some: {
          id: parseInt(collectionId as string)
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
      page: parseInt(page as string),
      totalPages: Math.ceil(total / take)
    });
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });

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
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Fetch product error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products — create (Admin)
router.post('/', adminAuth, async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
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
          connect: categories?.map((id: number) => ({ id })) || []
        },
        options: {
          create: options?.map((opt: any) => ({
            name: opt.name,
            required: opt.required || false,
            values: {
              create: opt.values?.map((val: any) => ({
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
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/products/:id — update (Admin)
router.put('/:id', adminAuth, async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  try {
    const id = parseInt(req.params.id as string);
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
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id — delete (Admin)
router.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  try {
    const id = parseInt(req.params.id as string);
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
