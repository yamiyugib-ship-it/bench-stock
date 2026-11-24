# Bench Stock

A small inventory app for a ceramics studio. Add a supply and record stock coming in or going out. The API rejects withdrawals that exceed the available stock.

## Run locally

Install Node.js 24, open a terminal in this folder, and run:

```sh
npm ci
npm start
```

Open [Bench Stock locally](http://127.0.0.1:3000). The first run creates a local PostgreSQL data directory using PGlite. Data persists across restarts. To use a separate PostgreSQL instance locally, copy `.env.example` to `.env` and set `DATABASE_URL`.

Try adding `Clay bags` with quantity `5`. Under **Adjust**, record **Stock out** for `2` units. The list shows `3`. Try removing `4` units and check that the app rejects the request and still shows `3` after refreshing.

## Architecture

| Part | Responsibility |
| --- | --- |
| `frontend/public/` | HTML, CSS, and JavaScript for the forms, inventory, and feedback |
| `backend/inventory-controller.js` | Express REST routes and HTTP responses |
| `backend/inventory-service.js` | Input validation and inventory rules |
| `backend/inventory-repository.js` | Parameterized SQL and PostgreSQL schema |

The local server also serves the frontend for convenience. In production the frontend is built independently and the backend serves only the REST API.

## Production and submission

| Link | Status |
| --- | --- |
| Public GitHub repository | Pending publication |
| Frontend | Pending deployment |
| Backend `/api/health` | Pending deployment |

1. Upload this folder to a public GitHub repository. Include `.env.example` and keep local `.env` files out of Git.
2. Create a PostgreSQL database in Neon. Copy its connection URL from **Connect** into the backend environment only. The API creates the table on startup.
3. Create a **Web Service** in Render from the repository. Choose the Node runtime and leave the root directory as the repository root. Use `npm ci --omit=dev` to build, `npm start` to run, and `/api/health` as the health check path. Set `NODE_ENV=production`, `DATABASE_URL`, and `FRONTEND_ORIGIN`. For the first deploy, use `https://example.invalid` as the temporary value of `FRONTEND_ORIGIN`.
4. Create a **Static Site** in Render from the same repository. Use `npm run build:frontend` as the build command and `frontend/dist` as the publish directory. Set `API_BASE_URL` to the public HTTPS origin of the backend, without `/api`.
5. Replace `FRONTEND_ORIGIN` on the backend with the actual static site HTTPS origin and redeploy. Check the health URL and run the example above from the public frontend. Add the three verified links to this table, then submit the public GitHub and frontend links in the campus.

The hosted inventory is a shared classroom demo. Use fictional supply data.

[Render deployment guide](https://render.com/docs/your-first-deploy) · [Neon connection guide](https://neon.com/docs/get-started/connect-neon)

## Tests and design

Run `npm test` for the API and PostgreSQL integration suite. See the [specification](spec.md) and [QA report](QA.md) for the acceptance criteria and observed results.
