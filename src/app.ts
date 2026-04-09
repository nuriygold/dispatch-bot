import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { router } from './api/router';
import { adminRouter } from './api/adminRouter';
import { controlRouter } from './api/controlRouter';
import { logger } from './logger';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(helmet());
  app.use(cors());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(adminRouter);
  app.use(controlRouter);
  app.use(router);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'API error');
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'invalid_request', detail: err.flatten() });
    }
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  });

  return app;
}
