import { Request, Response, NextFunction } from 'express';

/**
 * Admin authentication middleware.
 * Checks for x-admin-key header against ADMIN_API_KEY env var.
 */
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const key = (req.headers['x-admin-key'] as string) || (req.query.ADMIN_API_KEY as string) || (req.query.adminKey as string);
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    console.warn('WARNING: ADMIN_API_KEY not set — admin routes are unprotected');
    return next();
  }

  if (!key || key !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized — invalid admin key' });
  }

  next();
};
