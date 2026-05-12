import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// POST /api/orders - create order
router.post('/', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  try {
    const { items, totalPrice, shippingFee, paymentMethod, discount } = req.body;

    const order = await prisma.order.create({
      data: {
        orderId: `ORD-${Date.now()}`,
        totalPrice,
        shippingFee,
        paymentMethod,
        discount: discount || 0,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            name: item.name,
            imageUrl: item.imageUrl,
            basePrice: item.basePrice,
            finalPrice: item.finalPrice,
            quantity: item.quantity,
            selectedOptions: item.selectedOptions
          }))
        }
      },
      include: {
        items: true
      }
    });

    res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req: Request, res: Response) => {
  const prisma = (req as any).prisma as PrismaClient;
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid order ID' });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true
      }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Fetch order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

export default router;
