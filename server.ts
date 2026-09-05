import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { app } from './serverApp';

const PORT = 3000;

async function startServer() {
  // Static files in public
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Refra Cinema streaming server active on port ${PORT}`);
  });
}

startServer();
