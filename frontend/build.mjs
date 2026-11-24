import { cp, mkdir, writeFile } from 'node:fs/promises';

const apiUrl = new URL(process.env.API_BASE_URL ?? '');
if (apiUrl.protocol !== 'https:' && apiUrl.protocol !== 'http:') {
  throw new Error('API_BASE_URL must be an HTTP or HTTPS origin.');
}

const destination = new URL('./dist/', import.meta.url);
await mkdir(destination, { recursive: true });
await cp(new URL('./public/', import.meta.url), destination, { recursive: true });
await writeFile(new URL('config.js', destination), `export const apiBaseUrl = ${JSON.stringify(apiUrl.origin)};\n`);
