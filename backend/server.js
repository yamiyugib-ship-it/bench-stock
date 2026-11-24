import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createApp } from './app.js';
import { initializeDatabase } from './inventory-repository.js';

const { DATABASE_URL, FRONTEND_ORIGIN, NODE_ENV, PORT = '3000' } = process.env;
const production = NODE_ENV === 'production';

async function start() {
  if (production && !DATABASE_URL) throw new Error('Set DATABASE_URL for production.');
  if (production && !FRONTEND_ORIGIN) throw new Error('Set FRONTEND_ORIGIN for production.');

  const frontendOrigin = FRONTEND_ORIGIN ? new URL(FRONTEND_ORIGIN).origin : undefined;
  const frontendDirectory = production ? undefined : fileURLToPath(new URL('../frontend/public/', import.meta.url));
  let database;

  if (DATABASE_URL) {
    database = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });
    database.on('error', () => console.error('An idle database connection closed unexpectedly.'));
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    database = new PGlite('.data');
  }

  try {
    await initializeDatabase(database);
  } catch {
    await (DATABASE_URL ? database.end() : database.close());
    throw new Error('Could not initialize PostgreSQL. Check the connection and database permissions.');
  }

  const server = createApp(database, { frontendDirectory, frontendOrigin })
    .listen(Number(PORT), production ? '0.0.0.0' : '127.0.0.1', () => {
      console.log(production ? `API listening on port ${PORT}.` : `Bench Stock is ready at http://127.0.0.1:${PORT}`);
    });

  function shutdown() {
    server.close(async () => {
      await (DATABASE_URL ? database.end() : database.close());
    });
  }

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
