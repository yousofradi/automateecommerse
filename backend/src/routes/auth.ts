import { Router, Request, Response } from 'express';

const router = Router();

// Placeholder for auth routes
router.post('/login', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Auth not implemented yet' });
});

router.post('/register', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Auth not implemented yet' });
});

router.get('/me', (req: Request, res: Response) => {
  res.status(501).json({ error: 'Auth not implemented yet' });
});

export default router;
