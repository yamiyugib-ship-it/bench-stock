import { Router } from 'express';
import { createInventoryService } from './inventory-service.js';

export function createInventoryRouter(database) {
  const router = Router();
  const inventory = createInventoryService(database);

  router.get('/health', async (_request, response) => {
    try {
      await database.query('SELECT 1');
      response.json({ status: 'ok' });
    } catch {
      response.status(503).json({ error: 'Database unavailable.' });
    }
  });

  router.get('/supplies', async (_request, response) => {
    response.json(await inventory.list());
  });

  router.post('/supplies', async (request, response) => {
    response.status(201).json(await inventory.create(request.body));
  });

  router.post('/supplies/:id/adjustments', async (request, response) => {
    response.json(await inventory.adjust(request.params.id, request.body));
  });

  return router;
}
