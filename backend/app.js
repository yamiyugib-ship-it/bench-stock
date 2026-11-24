import express from 'express';
import { createInventoryRouter } from './inventory-controller.js';

export function createApp(database, { frontendDirectory, frontendOrigin } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use('/api', (request, response, next) => {
    response.vary('Origin');
    if (frontendOrigin && request.get('Origin') === frontendOrigin) {
      response.set('Access-Control-Allow-Origin', frontendOrigin);
      response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.set('Access-Control-Allow-Headers', 'Content-Type');
      if (request.method === 'OPTIONS') return response.sendStatus(204);
    }
    next();
  });

  app.use('/api', express.json({ limit: '8kb' }), createInventoryRouter(database));
  app.use('/api', (_request, response) => response.status(404).json({ error: 'Endpoint not found.' }));

  if (frontendDirectory) app.use(express.static(frontendDirectory));

  app.use((error, _request, response, _next) => {
    if (error.type === 'entity.parse.failed') return response.status(400).json({ error: 'Invalid JSON.' });
    if (error.type === 'entity.too.large') return response.status(413).json({ error: 'Request body is too large.' });
    if (error.status) return response.status(error.status).json({ error: error.message });

    console.error('Inventory request failed.', error.code ?? error.name);
    response.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}
