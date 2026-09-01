import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import compression from "compression";
import { createServer as createViteServer } from "vite";
import { initPostgres, getPool } from './server/db';
import authRoutes from './server/routes/authRoutes';
import userRoutes from './server/routes/userRoutes';
import adminRoutes from './server/routes/adminRoutes';
import youtubeRoutes from './server/routes/youtubeRoutes';

async function startServer() {
  // Initialize database schema if PostgreSQL is configured
  if (process.env.DATABASE_URL) {
    try {
      await initPostgres();
      console.log('[Database] PostgreSQL connection and schema initialized.');
    } catch (dbErr) {
      console.error('[Database] Failed to initialize PostgreSQL on startup:', dbErr);
    }
  }

  const app = express();
  const PORT = 3000;

  // 1. Enable HTTP Compression (Gzip / Deflate) for high bandwidth efficiency
  app.use(compression({
    level: 6,
    threshold: 1024, // only compress responses larger than 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));

  // 2. Global Request Parsers
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());

  // 3. Security & Caching Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // 4. Mount API routes FIRST
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/youtube', youtubeRoutes);

  // Health and Readiness Probe for Container Orchestrators (Cloud Run / K8s / ECS)
  app.get("/api/health", (req, res) => {
    const isPg = !!getPool();
    res.json({
      status: "ok",
      server: "SMTrading Pro Engine",
      storageEngine: isPg ? "PostgreSQL (Pooled)" : "Local Persistent JSON",
      time: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024))
    });
  });

  // 5. Frontend & Asset Handling
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve static assets with aggressive immutable caching
    app.use(express.static(distPath, {
      maxAge: '7d',
      etag: true,
      immutable: true,
      index: false
    }));

    // HTML fallback without cache to ensure instant client updates
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`SMTrading Full-Stack Platform running on http://localhost:${PORT}`);
  });

  // 6. Graceful Shutdown handlers for zero-downtime autoscaling rollouts
  const gracefulShutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      const pool = getPool();
      if (pool) {
        try {
          await pool.end();
          console.log('[Database] PostgreSQL connection pool drained and closed.');
        } catch (err) {
          console.error('[Database] Error closing PostgreSQL pool:', err);
        }
      }
      process.exit(0);
    });

    // Force exit if hanging connections don't drain within 10s
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
