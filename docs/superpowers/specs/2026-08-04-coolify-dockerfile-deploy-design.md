# Coolify Dockerfile deploy — design

Date: 2026-08-04  
Status: implemented — see `Dockerfile`, `docker/entrypoint.sh`, and `docs/agent/decisions.md` (2026-08-04 Coolify entry)

## Goal

Deploy Card Battle on an existing VPS via Coolify using a single Dockerfile: one container serves the Vite SPA and the Colyseus game server on the same port, behind Coolify’s HTTPS reverse proxy, with a Coolify-managed Postgres for the finished-game log.

## Decisions locked

| Topic | Choice |
|---|---|
| Topology | Single container: SPA + Colyseus on `$PORT` |
| Database | Coolify Postgres; `DATABASE_URL` wired to the app |
| Domain | Existing domain already pointed at the VPS |
| Source | Git repo already connected to Coolify |
| Server runtime | Keep `tsx` (no production JS bundle yet) |
| Migrations | Entrypoint runs `db:migrate` then starts the server; update `docs/agent/db.md` accordingly |

## Architecture

```
Client browser
  → HTTPS (+ WebSocket upgrade) via Coolify proxy
  → container listening on $PORT
       ├─ Express static files → apps/client/dist
       ├─ SPA fallback → index.html
       └─ Colyseus matchmaker / rooms (same HTTP server)
  → Postgres (Coolify service) via DATABASE_URL
```

Same origin for page and WebSocket. No separate client port, no CORS surface for the happy path.

## Code changes

### 1. Server — serve SPA from Colyseus Express hook

`defineServer` already supports an `express` callback (Colyseus 0.17). Use it to:

- Mount `express.static` on `STATIC_DIR` (default: `apps/client/dist` relative to `WORKDIR` `/app`, i.e. `/app/apps/client/dist` in the image).
- SPA fallback: non-API GETs that miss a file return `index.html`.
- Do not interfere with Colyseus HTTP/WebSocket routes.

Add `express` as a direct dependency of `@card-battle/server` (pnpm isolation). Move `tsx` from `devDependencies` to `dependencies` so production images that install production deps can still run `start` / `db:migrate`.

### 2. Client — same-origin default

Today, when the page host is not localhost, `resolveServerUrl` dials `hostname:2567`. That breaks behind a single HTTPS domain.

Change: if `VITE_SERVER_URL` is unset and the host is not localhost, use `window.location.origin`.

Leave `VITE_SERVER_URL` as an optional build-time override. Production Docker build leaves it unset.

### 3. Docker entrypoint

`docker/entrypoint.sh`:

1. Run `pnpm --filter @card-battle/server db:migrate`.
2. On failure, exit non-zero (container must not start with a stale/missing schema).
3. `exec` the server start command.

### 4. Docs

- `docs/agent/db.md`: replace “never auto-migrate on boot” with: local/dev stays explicit; **production container entrypoint may migrate before listen**, fail-fast on error.
- `docs/agent/decisions.md`: append dated entry (Coolify single-container, migrate-on-boot exception, tsx-in-prod deferral of server bundle).
- `README.md`: short production/Coolify section (env table, pointer to Dockerfile).

## Dockerfile

Multi-stage, Node **24.18.0** (pinned to project runtime):

| Stage | Responsibility |
|---|---|
| `build` | Enable pnpm via corepack; `pnpm install --frozen-lockfile`; `pnpm --filter @card-battle/client build` |
| `runtime` | Copy workspace sources needed to run (`apps/server`, `packages/shared`, lockfiles, built `apps/client/dist`); install deps; set `NODE_ENV=production`; `CMD` entrypoint |

`.dockerignore`: `node_modules`, `.git`, local artefacts, anything not required for install/build/run.

No docker-compose in the repo for this ship. Postgres remains a Coolify-managed service linked by env.

## Environment

| Variable | Role |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Listen port (Coolify typically injects this; expose the same in Coolify `ports_exposes`) |
| `DATABASE_URL` | Postgres connection string from Coolify DB |
| `STATIC_DIR` | Optional override for SPA directory |

Do **not** set `VITE_SERVER_URL` at image build time for the default same-origin deploy.

## Coolify operator steps (after code lands)

1. Create PostgreSQL in the same Coolify project/environment.
2. Create / configure the Git-backed application with build pack **Dockerfile**, Dockerfile at repo root.
3. Attach the existing domain; force HTTPS.
4. Set `ports_exposes` to match container `PORT`.
5. Link `DATABASE_URL` from the Postgres service; set `NODE_ENV=production`.
6. Deploy; confirm migrate logs succeed; open the domain; create/join a room (WebSocket); finish a game and confirm a Postgres row.

WebSocket upgrade is expected to work through Coolify’s HTTP proxy without extra ports.

## Out of scope

- Server production bundle (`esbuild` / `tsc` emit)
- Repo-owned docker-compose for app + Postgres
- Multi-instance Colyseus / Redis presence
- Accounts, persistence of in-progress games
- Auto-migrate during local `pnpm dev`

## Success criteria

- HTTPS domain serves the client UI.
- Match create/join works over WebSocket on that domain.
- Finished games persist when `DATABASE_URL` is set.
- Coolify rebuild from Git succeeds with `--frozen-lockfile`.

## Risks / watch points

- **SPA vs Colyseus routes:** static fallback must not swallow Colyseus HTTP endpoints; mount carefully and prefer Colyseus’s documented `express` hook.
- **pnpm + Docker:** workspace + `workspace:*` shared package must resolve in the runtime image; copy the monorepo layout Coolify builds from, not a single app folder in isolation.
- **Migrate fail-fast:** a bad `DATABASE_URL` or unreachable DB prevents boot — intentional for production; surface clearly in Coolify logs.
