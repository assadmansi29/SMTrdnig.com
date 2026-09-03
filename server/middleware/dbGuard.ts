import { Request, Response, NextFunction } from 'express';
import { isPostgresReady, isDatabaseHealthy } from '../db';

/**
 * Express middleware that enforces PostgreSQL readiness.
 * Guarantees that no API request requiring the database can succeed
 * before the PostgreSQL connection is ready.
 * If PostgreSQL is offline or initializing, safely halts the request with HTTP 503.
 * Strictly prevents any local fallback or degraded operation.
 */
export async function requireDatabaseReady(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ready = await isPostgresReady();
    if (!ready || !isDatabaseHealthy()) {
      res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is initializing or offline.',
        code: 'DATABASE_UNAVAILABLE',
        storageEngine: 'PostgreSQL (Sole Engine - No Fallback)',
      });
      return;
    }
    next();
  } catch (err: any) {
    res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection failed.',
      code: 'DATABASE_UNAVAILABLE',
      details: err?.message || 'PostgreSQL connection failed',
      storageEngine: 'PostgreSQL (Sole Engine - No Fallback)',
    });
  }
}
