import { Router } from 'express';
import { User } from '../models/User.js';
import { authRequired, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authRequired, attachUser, requireRole('Admin'));

router.get('/', async (_req, res, next) => {
  try {
    const users = await User.find({}, 'name email role').sort({ name: 1, email: 1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

export default router;
