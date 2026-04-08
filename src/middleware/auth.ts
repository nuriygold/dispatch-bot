import type express from 'express';
import { config } from '../config';

function extractToken(req: express.Request): string | null {
  const headerToken = req.header('x-dispatch-token');
  if (headerToken) return headerToken;

  const auth = req.header('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }

  return null;
}

function unauthorized(res: express.Response) {
  return res.status(401).json({ error: 'unauthorized' });
}

export function requireApiToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!config.apiToken) return next();
  if (extractToken(req) !== config.apiToken) return unauthorized(res);
  next();
}

export function requireAdminToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expected = config.adminToken || config.apiToken;
  if (!expected) return next();
  if (extractToken(req) !== expected) return unauthorized(res);
  next();
}

export function isValidWsToken(token: string | null): boolean {
  if (!config.apiToken) return true;
  return token === config.apiToken;
}
