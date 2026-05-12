import { Router } from 'express';

const router = Router();

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

export default router;
