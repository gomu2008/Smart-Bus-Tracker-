import express from 'express';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './server/routes.js';
import { simulator } from './server/simulator.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Enable CORS & handle preflight OPTIONS requests for dev, iframe, and proxy environments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Mount REST API endpoints
app.use('/api', apiRouter);

// Global API error handler
app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

// Start autonomous bus simulator for live tracking demo
simulator.start();

async function startServer() {
  if (!isProd) {
    // In development mode, attach Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // In production, serve the built Vite output
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build dist folder not found. Running in fallback mode.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Smart Bus Tracker] Server listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
