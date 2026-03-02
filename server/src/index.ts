import 'dotenv/config';
import 'express-async-errors';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import categoriesRouter from './routes/categories';
import itemsRouter from './routes/items';
import gradeLevelsRouter from './routes/gradeLevels';
import subjectsRouter from './routes/subjects';
import projectsRouter from './routes/projects';
import authRouter from './routes/auth';
import { authMiddleware } from './middleware/auth';
import { initDb } from './db/database';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/items', authMiddleware, itemsRouter);
app.use('/api/grade-levels', authMiddleware, gradeLevelsRouter);
app.use('/api/subjects', authMiddleware, subjectsRouter);
app.use('/api/projects', authMiddleware, projectsRouter);

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({ error: err.message ?? 'Internal Server Error' });
});

const PORT = process.env.PORT ?? 3001;

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
