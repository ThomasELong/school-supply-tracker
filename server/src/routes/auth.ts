import { Router, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };

  const appPassword = process.env.APP_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!appPassword || !jwtSecret) {
    res.status(500).json({ error: 'Server auth not configured' });
    return;
  }

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const provided = Buffer.from(password);
  const expected = Buffer.from(appPassword);
  const match =
    provided.length === expected.length &&
    timingSafeEqual(provided, expected);

  if (!match) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const token = jwt.sign({ sub: 'teacher' }, jwtSecret, { expiresIn: '8h' });
  res.json({ token });
});

export default router;
