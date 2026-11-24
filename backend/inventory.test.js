import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from './app.js';
import { initializeDatabase } from './inventory-repository.js';

async function startTestServer(database) {
  const server = createApp(database).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  return {
    async request(path, body) {
      const response = await fetch(`${baseUrl}${path}`, body === undefined ? {} : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
      return { status: response.status, data };
    },
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

test('inventory REST API with PostgreSQL', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'bench-stock-'));
  let database;
  let server;

  async function start() {
    database = new PGlite(directory);
    await initializeDatabase(database);
    server = await startTestServer(database);
  }

  async function stop() {
    await server?.close();
    server = undefined;
    await database?.close();
    database = undefined;
  }

  t.after(async () => {
    await stop();
    await rm(directory, { recursive: true, force: true });
  });
  await start();

  const request = (path, body) => server.request(path, body);
  const list = () => request('/supplies');
  const create = (name, quantity) => request('/supplies', { name, quantity });
  const adjust = (id, direction, amount) => request(`/supplies/${id}/adjustments`, { direction, amount });

  await t.test('S1 lists an empty inventory and then sorts supplies by name', async () => {
    assert.deepEqual(await request('/health'), { status: 200, data: { status: 'ok' } });
    assert.deepEqual(await list(), { status: 200, data: [] });
    assert.equal((await create('Wax', 0)).status, 201);
    assert.equal((await create('Brushes', 2)).status, 201);
    assert.deepEqual((await list()).data.map(({ name }) => name), ['Brushes', 'Wax']);
  });

  await t.test('S2 trims names and rejects duplicates and invalid inputs', async () => {
    const created = await create('  Glaze  ', 6);
    assert.equal(created.status, 201);
    assert.deepEqual(created.data, { id: created.data.id, name: 'Glaze', quantity: 6 });
    const before = await list();
    assert.equal((await create('gLaZe', 8)).status, 409);
    for (const [name, quantity] of [['  ', 1], ['X'.repeat(81), 0], ['Clay', -1], ['Clay', 1.5], ['Clay', '4'], ['Clay', 1000000]]) {
      assert.equal((await create(name, quantity)).status, 400);
    }
    assert.deepEqual(await list(), before);
  });

  await t.test('S3 applies entries and exits and validates adjustment inputs', async () => {
    const { data: item } = await create('Clay bags', 4);
    const result = await adjust(item.id, 'in', 3);
    assert.deepEqual(result, { status: 200, data: { ...item, quantity: 7 } });
    assert.deepEqual(await adjust(item.id, 'out', 7), { status: 200, data: { ...item, quantity: 0 } });
    const before = await list();
    for (const [direction, amount] of [['bad', 1], ['in', 0], ['out', -1], ['out', 0.5], ['out', '1']]) {
      assert.equal((await adjust(item.id, direction, amount)).status, 400);
    }
    assert.equal((await adjust('bad', 'in', 1)).status, 400);
    assert.equal((await adjust(999999, 'in', 1)).status, 404);
    assert.deepEqual(await list(), before);
  });

  await t.test('S4 rejects stock outside bounds and prevents simultaneous overselling', async () => {
    const { data: scarce } = await create('Sponge packs', 3);
    const { data: full } = await create('Test tiles', 999999);
    const before = await list();
    assert.equal((await adjust(scarce.id, 'out', 4)).status, 409);
    assert.equal((await adjust(full.id, 'in', 1)).status, 409);
    assert.deepEqual(await list(), before);

    const withdrawals = await Promise.all([adjust(scarce.id, 'out', 2), adjust(scarce.id, 'out', 2)]);
    assert.deepEqual(withdrawals.map(({ status }) => status).sort(), [200, 409]);
    assert.equal((await list()).data.find(({ id }) => id === scarce.id).quantity, 1);
  });

  await t.test('S5 keeps quantities after HTTP server and database are reopened', async () => {
    const before = await list();
    assert.ok(before.data.length > 0);
    await stop();
    await start();
    assert.deepEqual(await list(), before);
  });
});
