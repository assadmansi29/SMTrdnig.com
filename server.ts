import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import { initPostgres } from './server/db';
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

  // Global Middlewares (25MB limit for high-resolution avatar image uploads)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());

  // API routes mounted FIRST
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/youtube', youtubeRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", server: "SMTrading Pro Engine", time: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SMTrading Full-Stack Platform running on http://localhost:${PORT}`);
  });
}

startServer();
