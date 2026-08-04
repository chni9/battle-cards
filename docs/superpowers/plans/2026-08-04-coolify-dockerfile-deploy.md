# Coolify Dockerfile Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single Dockerfile so Coolify serves the Vite SPA and Colyseus on one HTTPS origin, with migrate-on-boot against Coolify Postgres.

**Architecture:** Colyseus `defineServer({ express })` mounts the built client from `STATIC_DIR`. Client dials `window.location.origin` when not on localhost. Container entrypoint runs `db:migrate` then `tsx` server start. No server JS bundle yet.

**Tech Stack:** Node 24.18.0, pnpm 10.28.0, Colyseus 0.17 `defineServer` + Express static, Vite client build, Coolify Dockerfile + Postgres.

**Spec:** `docs/superpowers/specs/2026-08-04-coolify-dockerfile-deploy-design.md`

## Global Constraints

- Node image tag must be `24.18.0` (matches `devEngines.runtime`).
- pnpm version must be `10.28.0` (matches `packageManager`).
- Do **not** auto-migrate during local `pnpm dev`; only the Docker entrypoint migrates before listen.
- Do **not** set `VITE_SERVER_URL` in the Docker client build (same-origin).
- Never invent rules; deployment must not change game rules or protocol.
- Prefer `pnpm` for all installs; update lockfile when adding deps.
- Commit only when the developer explicitly asks (user rule) — commit steps below are optional gates.

---

## File map

| File | Responsibility |
|---|---|
| `apps/client/src/net/resolve-server-url.ts` | Pure URL resolution (env + location) |
| `apps/client/src/net/resolve-server-url.test.ts` | Same-origin / localhost / override cases |
| `apps/client/src/net/use-room-connection.ts` | Import resolver; drop inline `:2567` logic |
| `apps/server/src/http/static-spa.ts` | Resolve static dir; mount `express.static` + SPA fallback |
| `apps/server/src/http/static-spa.test.ts` | Missing dir soft-skip; fallback serves `index.html` |
| `apps/server/src/index.ts` | Wire `express` hook + listen |
| `apps/server/package.json` | Add `express`; move `tsx` to `dependencies` |
| `Dockerfile` | Multi-stage build + runtime entrypoint |
| `.dockerignore` | Keep build context small / correct |
| `docker/entrypoint.sh` | migrate then start |
| `docs/agent/db.md` | Allow production entrypoint migrate |
| `docs/agent/decisions.md` | Dated deploy decisions |
| `README.md` | Short Coolify / env section |

---

### Task 1: Same-origin client server URL

**Files:**
- Create: `apps/client/src/net/resolve-server-url.ts`
- Create: `apps/client/src/net/resolve-server-url.test.ts`
- Modify: `apps/client/src/net/use-room-connection.ts` (replace local `resolveServerUrl` / `DEFAULT_SERVER_URL`)

**Interfaces:**
- Consumes: `import.meta.env.VITE_SERVER_URL` (optional string)
- Produces: `resolveServerUrl(envUrl?: string, location?: { protocol: string; hostname: string; origin: string }): string`

- [ ] **Step 1: Write the failing tests**

Create `apps/client/src/net/resolve-server-url.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { resolveServerUrl } from './resolve-server-url';

describe('resolveServerUrl (Coolify same-origin deploy)', () => {
  it('uses VITE_SERVER_URL when set', () => {
    expect(
      resolveServerUrl('https://api.example.com', {
        protocol: 'https:',
        hostname: 'game.example.com',
        origin: 'https://game.example.com',
      }),
    ).toBe('https://api.example.com');
  });

  it('defaults to localhost:2567 when hostname is localhost', () => {
    expect(
      resolveServerUrl(undefined, {
        protocol: 'http:',
        hostname: 'localhost',
        origin: 'http://localhost:5173',
      }),
    ).toBe('http://localhost:2567');
  });

  it('defaults to localhost:2567 when hostname is 127.0.0.1', () => {
    expect(
      resolveServerUrl('', {
        protocol: 'http:',
        hostname: '127.0.0.1',
        origin: 'http://127.0.0.1:5173',
      }),
    ).toBe('http://localhost:2567');
  });

  it('uses page origin (not :2567) on a non-local host', () => {
    expect(
      resolveServerUrl(undefined, {
        protocol: 'https:',
        hostname: 'cards.example.com',
        origin: 'https://cards.example.com',
      }),
    ).toBe('https://cards.example.com');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

Run: `pnpm exec vitest run --project client apps/client/src/net/resolve-server-url.test.ts`

Expected: FAIL resolving `./resolve-server-url`

- [ ] **Step 3: Implement resolver**

Create `apps/client/src/net/resolve-server-url.ts`:

```ts
const DEFAULT_SERVER_URL = 'http://localhost:2567';

export type PageLocation = {
  protocol: string;
  hostname: string;
  origin: string;
};

/**
 * Where the Colyseus client dials.
 * - `VITE_SERVER_URL` wins when non-empty (split API host).
 * - Local Vite: localhost / 127.0.0.1 → port 2567.
 * - Deployed same-origin (Coolify): page `origin` (no :2567).
 */
export function resolveServerUrl(
  envUrl: string | undefined = undefined,
  location: PageLocation | undefined = undefined,
): string {
  if (envUrl !== undefined && envUrl.length > 0) {
    return envUrl;
  }

  if (location !== undefined) {
    const { hostname, origin } = location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }
  }

  return DEFAULT_SERVER_URL;
}
```

- [ ] **Step 4: Wire `use-room-connection.ts`**

Remove the local `DEFAULT_SERVER_URL` and `resolveServerUrl` function. Import `resolveServerUrl` from `./resolve-server-url`. Call sites become:

```ts
const client = new Client(
  resolveServerUrl(
    import.meta.env.VITE_SERVER_URL,
    typeof window !== 'undefined'
      ? {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          origin: window.location.origin,
        }
      : undefined,
  ),
);
```

Prefer a tiny local helper to avoid repeating the `window` block four times:

```ts
function serverUrl(): string {
  return resolveServerUrl(
    import.meta.env.VITE_SERVER_URL,
    typeof window !== 'undefined'
      ? {
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          origin: window.location.origin,
        }
      : undefined,
  );
}
```

Then `new Client(serverUrl())` at each former call site.

Update the comment above the old function to cite same-origin Coolify deploy.

- [ ] **Step 5: Re-run client tests — expect PASS**

Run: `pnpm exec vitest run --project client apps/client/src/net/resolve-server-url.test.ts`

Expected: PASS

- [ ] **Step 6: Commit (only if developer asked)**

```bash
git add apps/client/src/net/resolve-server-url.ts \
  apps/client/src/net/resolve-server-url.test.ts \
  apps/client/src/net/use-room-connection.ts
git commit -m "$(cat <<'EOF'
fix(client): dial same origin behind Coolify proxy

EOF
)"
```

---

### Task 2: Serve SPA from Colyseus Express

**Files:**
- Create: `apps/server/src/http/static-spa.ts`
- Create: `apps/server/src/http/static-spa.test.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/package.json` (add `express`; move `tsx` → `dependencies`)
- Modify: root lockfile via `pnpm install`

**Interfaces:**
- Consumes: Express `Application` from Colyseus `express` hook; `STATIC_DIR` env
- Produces: `resolveStaticDir(): string | undefined`, `mountStaticSpa(app, staticDir: string): void`

- [ ] **Step 1: Add dependencies**

From repo root:

```bash
pnpm --filter @card-battle/server add express
pnpm --filter @card-battle/server add -D @types/express
```

Then edit `apps/server/package.json`: move `"tsx"` from `devDependencies` into `dependencies` (same version currently pinned). Run `pnpm install` so the lockfile reflects the move.

- [ ] **Step 2: Write failing tests for static mount**

Create `apps/server/src/http/static-spa.test.ts` using `node:fs` temp dirs + `express` + `node:http` request, or Vitest + supertest-free raw `http` against `app.listen(0)`.

Minimal pattern:

```ts
import { createServer } from 'node:http';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';

import { mountStaticSpa, resolveStaticDir } from './static-spa';

describe('resolveStaticDir', () => {
  it('returns undefined when STATIC_DIR points at a missing path', () => {
    const prev = process.env['STATIC_DIR'];
    process.env['STATIC_DIR'] = path.join(tmpdir(), 'card-battle-missing-static');
    try {
      expect(resolveStaticDir()).toBeUndefined();
    } finally {
      if (prev === undefined) delete process.env['STATIC_DIR'];
      else process.env['STATIC_DIR'] = prev;
    }
  });
});

describe('mountStaticSpa', () => {
  const servers: ReturnType<typeof createServer>[] = [];

  afterEach(() => {
    for (const s of servers) s.close();
    servers.length = 0;
  });

  it('serves index.html for unknown GET paths (SPA fallback)', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'card-battle-spa-'));
    await writeFile(path.join(dir, 'index.html'), '<html>ok</html>', 'utf8');
    await mkdir(path.join(dir, 'assets'));
    await writeFile(path.join(dir, 'assets', 'app.js'), 'console.log(1)', 'utf8');

    const app = express();
    mountStaticSpa(app, dir);
    const server = createServer(app);
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('expected port');
    const base = `http://127.0.0.1:${String(addr.port)}`;

    const asset = await fetch(`${base}/assets/app.js`);
    expect(asset.status).toBe(200);
    expect(await asset.text()).toContain('console.log');

    const spa = await fetch(`${base}/lobby/abc`);
    expect(spa.status).toBe(200);
    expect(await spa.text()).toBe('<html>ok</html>');
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

Run: `pnpm exec vitest run --project server apps/server/src/http/static-spa.test.ts`

Expected: FAIL module not found / functions missing

- [ ] **Step 4: Implement `static-spa.ts`**

```ts
/**
 * Serve the Vite SPA from the same Colyseus HTTP server (Coolify single-container).
 * Soft-skips when the directory is missing so local `tsx` without a client build still boots.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Express } from 'express';
import express from 'express';

const DEFAULT_RELATIVE_STATIC_DIR = 'apps/client/dist';

/** Absolute static root, or undefined if unset/missing (caller should skip mount). */
export function resolveStaticDir(
  envValue: string | undefined = process.env['STATIC_DIR'],
  cwd: string = process.cwd(),
): string | undefined {
  const candidate =
    envValue !== undefined && envValue.length > 0
      ? path.resolve(envValue)
      : path.resolve(cwd, DEFAULT_RELATIVE_STATIC_DIR);

  if (!existsSync(candidate)) {
    return undefined;
  }

  return candidate;
}

export function mountStaticSpa(app: Express, staticDir: string): void {
  app.use(express.static(staticDir));

  app.get(/.*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    // Let Colyseus / API handlers win when they already handled the request.
    res.sendFile(path.join(staticDir, 'index.html'), (err: Error | undefined) => {
      if (err !== undefined) next(err);
    });
  });
}
```

**Watch point:** Colyseus registers its own routes when `defineServer` runs. Mount static **inside** the `express: (app) => { ... }` callback so order follows Colyseus docs. If SPA fallback steals matchmaker HTTP paths during manual smoke, narrow the fallback (e.g. exclude paths starting with `/matchmake`) — verify against a running server before declaring Task 2 done.

If `@types/express` types `sendFile` callback differently under `exactOptionalPropertyTypes`, adjust the callback signature to satisfy `tsc` rather than casting.

- [ ] **Step 5: Wire `apps/server/src/index.ts`**

```ts
import { GAME_ROOM_NAME, PROTOCOL_VERSION } from '@card-battle/shared';
import { defineRoom, defineServer } from 'colyseus';

import { mountStaticSpa, resolveStaticDir } from './http/static-spa';
import { GameRoom } from './rooms/game-room';

const DEFAULT_PORT = 2567;

const server = defineServer({
  rooms: {
    [GAME_ROOM_NAME]: defineRoom(GameRoom),
  },
  express: (app) => {
    const staticDir = resolveStaticDir();
    if (staticDir === undefined) {
      console.warn('STATIC_DIR missing or not found — SPA not served');
      return;
    }
    mountStaticSpa(app, staticDir);
  },
});

const port = Number(process.env['PORT'] ?? DEFAULT_PORT);

await server.listen(port);

console.log(`Card Battle server listening on ${port} — protocol v${PROTOCOL_VERSION}`);
```

- [ ] **Step 6: Run server tests + typecheck slice**

Run:

```bash
pnpm exec vitest run --project server apps/server/src/http/static-spa.test.ts
pnpm --filter @card-battle/server typecheck
```

Expected: PASS / clean

- [ ] **Step 7: Commit (only if developer asked)**

```bash
git add apps/server/src/http/static-spa.ts \
  apps/server/src/http/static-spa.test.ts \
  apps/server/src/index.ts \
  apps/server/package.json \
  pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(server): serve Vite SPA from Colyseus HTTP

EOF
)"
```

---

### Task 3: Dockerfile, ignore list, entrypoint

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker/entrypoint.sh`

**Interfaces:**
- Consumes: Task 2 server + built `apps/client/dist`; `DATABASE_URL`, `PORT`, `STATIC_DIR`, `NODE_ENV`
- Produces: image that migrates then listens

- [ ] **Step 1: Write `.dockerignore`**

```dockerignore
node_modules
**/node_modules
.git
.github
.cursor
.agents
**/dist
!apps/client/dist
apps/client/dist
*.md
!README.md
docs
.env
.env.*
coverage
.turbo
**/*.test.ts
agent-transcripts
```

Note: client `dist` is produced *inside* the image build — ignore local dist so the build stage is authoritative. Do not ignore `apps/server/db/migrations` (needed at runtime).

Refine if `*.md` proves too aggressive; keeping `docs` ignored is fine for the image.

- [ ] **Step 2: Write `docker/entrypoint.sh`**

```sh
#!/bin/sh
set -eu

echo "Running database migrations…"
pnpm --filter @card-battle/server db:migrate

echo "Starting Card Battle server…"
exec pnpm --filter @card-battle/server start
```

Make executable: `chmod +x docker/entrypoint.sh`

- [ ] **Step 3: Write `Dockerfile`**

Pragmatic multi-stage that keeps the pnpm workspace intact (Approach 1 — `tsx` in prod):

```dockerfile
# syntax=docker/dockerfile:1

FROM node:24.18.0-bookworm-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @card-battle/client build

FROM node:24.18.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV STATIC_DIR=/app/apps/client/dist

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client/package.json apps/client/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --prod

COPY apps/server apps/server
COPY packages/shared packages/shared
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
COPY --from=build /app/apps/client/dist /app/apps/client/dist

RUN chmod +x /app/docker/entrypoint.sh

ENV PORT=2567
EXPOSE 2567

ENTRYPOINT ["/app/docker/entrypoint.sh"]
```

If `pnpm install --frozen-lockfile --prod` fails to link `workspace:*` without full sources, switch runtime to:

```dockerfile
FROM build AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV STATIC_DIR=/app/apps/client/dist
ENV PORT=2567
EXPOSE 2567
COPY docker/entrypoint.sh /app/docker/entrypoint.sh
RUN chmod +x /app/docker/entrypoint.sh
ENTRYPOINT ["/app/docker/entrypoint.sh"]
```

Prefer the leaner variant first; fall back only if the lean install breaks.

- [ ] **Step 4: Local image smoke (optional but recommended)**

```bash
docker build -t card-battle:local .
# Expect fail-fast without DATABASE_URL:
docker run --rm -e PORT=2567 card-battle:local ; echo exit:$?
# With a reachable Postgres:
docker run --rm -e PORT=2567 -e DATABASE_URL=postgres://… -p 2567:2567 card-battle:local
```

Expected without DB: migrate prints error, container exits non-zero.  
Expected with DB: `applied`/`skip` migration lines, then `Card Battle server listening on 2567`. Browser `http://localhost:2567` serves the SPA; Colyseus join works on same origin.

- [ ] **Step 5: Commit (only if developer asked)**

```bash
git add Dockerfile .dockerignore docker/entrypoint.sh
git commit -m "$(cat <<'EOF'
build: add Coolify Dockerfile for single-container deploy

EOF
)"
```

---

### Task 4: Docs — db rule, decision, README

**Files:**
- Modify: `docs/agent/db.md` (golden rule 5 + Env / Commands as needed)
- Modify: `docs/agent/decisions.md` (append-only entry dated 2026-08-04)
- Modify: `README.md` (production / Coolify section)
- Modify: `docs/superpowers/specs/2026-08-04-coolify-dockerfile-deploy-design.md` status → implemented when code lands (optional last touch)

**Interfaces:** none (docs only)

- [ ] **Step 1: Update `docs/agent/db.md` golden rule 5**

Replace the “Never auto-migrate on server boot” rule with:

```markdown
5. **Migrations are explicit in local/dev.** Run
   `pnpm --filter @card-battle/server db:migrate` against `DATABASE_URL`.
   **Production exception:** the Docker entrypoint (`docker/entrypoint.sh`) runs
   migrations once before `listen`, and exits non-zero if they fail (fail-fast).
   Do not add migrate-on-boot to the `tsx`/`pnpm dev` path.
```

Adjust any later sentence that still says migrations are never automatic.

- [ ] **Step 2: Append `docs/agent/decisions.md`**

```markdown
## 2026-08-04 · [T] Coolify single-container deploy + migrate-on-boot

Hosting is VPS + Coolify (technical spec §3). Locked choices:

- One Dockerfile: Colyseus serves Vite `apps/client/dist` via the `defineServer` `express`
  hook (`STATIC_DIR`, default `/app/apps/client/dist` in the image). Same HTTPS origin for
  page and WebSocket; client uses `window.location.origin` off localhost.
- Server still runs under `tsx` in production (no emit bundle yet) — deferred deliberately;
  `tsx` moved to `@card-battle/server` `dependencies` so `--prod` images can start.
- Postgres remains Coolify-managed; `DATABASE_URL` is required for the container to boot
  because `docker/entrypoint.sh` runs `db:migrate` before listen (fail-fast). This
  **overrides** the earlier “never auto-migrate on boot” stance for the production
  entrypoint only; local/dev stays explicit (`docs/agent/db.md`).
```

- [ ] **Step 3: Extend `README.md`**

After the Commands / Layout section (or at end), add:

```markdown
## Production (Coolify)

Single container: SPA + Colyseus on `$PORT`. See `Dockerfile` and
`docs/superpowers/specs/2026-08-04-coolify-dockerfile-deploy-design.md`.

| Variable | Required | Meaning |
|---|---|---|
| `DATABASE_URL` | yes (prod image) | Postgres; entrypoint migrates then starts |
| `PORT` | no (default 2567) | Listen port — match Coolify `ports_exposes` |
| `NODE_ENV` | yes in prod | `production` |
| `STATIC_DIR` | no | SPA root (image default `/app/apps/client/dist`) |
| `VITE_SERVER_URL` | no | Leave unset for same-origin Coolify deploys |

Coolify: Git Dockerfile build → attach domain + HTTPS → link Postgres `DATABASE_URL` → deploy.
```

Also fix the outdated README line that still says V2 is “in progress” only if you touch that paragraph for another reason — **do not** expand scope; leave V2/V3 status alone unless already wrong in the same edit.

- [ ] **Step 4: Gate**

Run: `pnpm verify`

Expected: typecheck + lint + tests green.

- [ ] **Step 5: Commit (only if developer asked)**

```bash
git add docs/agent/db.md docs/agent/decisions.md README.md \
  docs/superpowers/specs/2026-08-04-coolify-dockerfile-deploy-design.md
git commit -m "$(cat <<'EOF'
docs: allow prod entrypoint migrate for Coolify

EOF
)"
```

---

### Task 5: Coolify operator checklist (manual — no code)

Not automated. After Tasks 1–4 are on the branch Coolify builds:

- [ ] **Step 1:** Create Postgres in the same Coolify project/environment.
- [ ] **Step 2:** Application build pack = Dockerfile, root Dockerfile, Git repo already connected.
- [ ] **Step 3:** Domain + force HTTPS; `ports_exposes` = container `PORT` (2567 unless overridden).
- [ ] **Step 4:** Env: `NODE_ENV=production`, `DATABASE_URL` from Postgres link.
- [ ] **Step 5:** Deploy; confirm migrate logs (`applied` / `skip`); open domain; create/join room; finish a game; confirm Postgres row in `finished_games`.

---

## Spec coverage self-review

| Spec requirement | Task |
|---|---|
| Single container SPA + Colyseus | 2, 3 |
| Coolify Postgres + `DATABASE_URL` | 3, 5 |
| Domain / same-origin client | 1 |
| Git Dockerfile at root | 3, 5 |
| `tsx` prod runtime | 2, 3 |
| Entrypoint migrate-then-start + db.md change | 3, 4 |
| `express` + `STATIC_DIR` | 2 |
| `.dockerignore` / Node 24.18 / pnpm 10.28 | 3 |
| decisions.md + README | 4 |
| Out of scope (bundle, compose, Redis) | not planned |

Placeholder scan: no TBD/TODO left in steps.  
Type consistency: `resolveServerUrl` / `resolveStaticDir` / `mountStaticSpa` names match across tasks.
