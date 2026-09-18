# docs/agent/deploy.md — Coolify staging, PR previews, and production

> Read before changing hosting, Git branches Coolify watches, or env vars on the VPS.
> Transverse rules → `/AGENTS.md`. Finished-game DB → `db.md`. Client same-origin →
> `frontend.md`. Topology locked in `docs/superpowers/specs/2026-08-04-coolify-dockerfile-deploy-design.md`.
>
> Sources: technical spec v1 §3 (VPS + Coolify) · designer 2026-09-16 (staging +
> `dev` gitflow) · designer 2026-09-17 (Coolify Preview Deployments on staging,
> WaaS pattern).

## Layout

| Git ref | Coolify environment | Who plays there |
|---|---|---|
| `dev` | **staging** | Testers / designer before a release |
| PR **into `dev`** | Ephemeral **preview** on the staging app | Reviewers of that PR |
| `main` | **production** | Live players |

Feature work opens a PR **into `dev`**. Coolify listens to GitHub webhooks (same
pattern as WaaS / `BoldysAI/whatsapp-ai-migration`): the **staging** app auto-deploys
when `dev` moves, and **Preview Deployments** spin an ephemeral container per PR.
Production updates only when `dev` is merged **into `main`**. Do not add a GitHub
Action that clones Coolify apps.

Same image as today: one Dockerfile, SPA + Colyseus on `$PORT`, Coolify HTTPS proxy,
Coolify-managed Postgres. Staging is a **second** app + **second** Postgres. Do not reuse
the production `DATABASE_URL` or `INBOX_PASSWORD`. PR previews **reuse staging
Postgres** — test games land in staging `/admin`.

`NODE_ENV` stays `production` on staging, PR previews, and production. That flag
means “run the production server path” (trust proxy, migrate-on-boot, SPA). It is
not the Git branch name.

## What the repo already has

Nothing else is required in Git for Coolify to build staging or PR previews. The
image is the root `Dockerfile` (no `VITE_SERVER_URL` bake-in); the entrypoint
migrates then listens (`docker/entrypoint.sh`). Preview hostnames work because
the client dials `window.location.origin` when that env is unset
(`apps/client/src/net/resolve-server-url.ts`).

Coolify does **not** copy the staging app’s variables into previews. Set Preview
Deployment Environment Variables explicitly (section F). Never paste production
secrets there.

| Variable | Staging app | PR preview (staging app) | Production |
|---|---|---|---|
| `DATABASE_URL` | Staging Postgres Internal URL | **Same staging Internal URL** | Existing prod Postgres (do not copy) |
| `INBOX_PASSWORD` | Staging secret (not prod) | **Same staging secret** | Existing prod secret |
| `NODE_ENV` | `production` | `production` | `production` |
| `PORT` | Match **Ports Exposes** (`2567`) | `2567` | Same as today |
| `STATIC_DIR` | Leave unset (image default) | Leave unset | Leave unset |
| `VITE_SERVER_URL` | **Unset** (same-origin WebSocket) | **Unset** | **Unset** |

GitHub Action `.github/workflows/prod-from-dev.yml` fails any PR into `main` whose head
branch is not `dev`. It is inert until that workflow itself lives on `main` (first
promotion). Retarget open feature PRs (including `#29`) onto `dev` **before** that
promotion, or they will fail the check.

## GitHub (once)

These clicks live on GitHub, not Coolify.

1. **Settings → General → Default branch.** Switch from `main` to `dev` → **Update**.
   New PRs then target staging. Cursor / `gh` / the GitHub **Compare** button will offer
   `dev` as the base.
2. **Settings → Rules → Rulesets** (optional, recommended):
   - Ruleset on `main`: require a pull request, block force pushes, block deletions.
   - Ruleset on `dev`: require a pull request, block force pushes.
3. Open PRs that still target `main` (today: [Lot 61 `#29`](https://github.com/chni9/battle-cards/pull/29)):
   PR page → **Edit** next to the title → change base from `main` to `dev` → **Change base**.
4. **Promote to production:** GitHub → **Pull requests → New** → base `main`, compare `dev`
   → merge when staging looks right. Coolify production (still watching `main`) deploys.

Do not push feature work straight to `main`. Do not point the production Coolify app at
`dev`.

## Coolify — create staging

Do this on the existing Card Battle project. Do **not** clone the production **Postgres**
resource, and do **not** paste production `DATABASE_URL` into staging.

### A. Add the `staging` environment

1. Left sidebar → **Projects** → open the Card Battle project.
2. Environment tabs at the top (you should see `production`). Click **+**.
3. Name: `staging`. Same server / destination as production. Create.
4. You are now on the empty **staging** tab. Stay there for every resource below.

If your Coolify build instead shows **Clone** on the project: prefer **Clone to a new
Environment** only if you will immediately replace the cloned database URL and domain.
Safer: empty environment + new resources (this section).

### B. Staging Postgres

1. On **staging** → **+ New** (or **New Resource**).
2. Under **Databases** → **PostgreSQL**.
3. Same **server** and **Docker network destination** as the future app.
4. Image: the **same major** as production (open production Postgres →
   **Configuration → General → Image**). Do not jump to a new major “because Coolify
   defaulted to 18” unless prod is already that major.
5. Leave the database **private** (do not enable **Make it publicly available**).
6. **Start**. Wait until it is healthy.
7. **Configuration → General**: copy **Internal URL**
   (`postgres://…@<container>:5432/…`). That string is staging `DATABASE_URL`.

### C. Staging application (Dockerfile, branch `dev`)

1. Still on **staging** → **+ New**.
2. Git source: the **same** GitHub App / deploy key as production, repository
   `chni9/battle-cards`.
3. **Branch:** `dev` (not `main`, not a `cursor/…` feature branch).
4. **Build Pack:** Dockerfile.
5. **Base Directory:** `/` (empty / repo root).
6. **Dockerfile Location:** `/Dockerfile` (Coolify default).
7. Create the resource, then open **Configuration**:

**General**

- **Git Branch** = `dev`.
- **Ports Exposes** = `2567` (must match `PORT`).
- **Port Mappings:** none extra — do **not** map `3000:3000`.
- **Name** something like `card-battle-staging` so it is not confused with prod.

**Domains**

- Add the staging hostname (e.g. `staging.<your-prod-domain>` or a dedicated
  subdomain already pointed at the VPS).
- HTTPS / Coolify proxy on. One domain, same origin for the SPA and the WebSocket.
- DNS: the same A/AAAA (or CNAME) pattern as production, for this hostname only.

**Environment Variables** → Developer view, runtime (not build-only):

```
NODE_ENV=production
PORT=2567
DATABASE_URL=<paste staging Internal URL>
INBOX_PASSWORD=<new secret, not production>
```

Leave `VITE_SERVER_URL` and `STATIC_DIR` out. Mark `DATABASE_URL` and
`INBOX_PASSWORD` as secrets. Disable **Build Variable** on those two — they are
runtime only (`docs/agent/db.md`; the Vite build must not bake a server URL).

**Network**

- The app and the staging Postgres must share the Docker destination / network.
  Same destination as step B.4 is enough; Coolify then resolves the Internal URL
  hostname.

**Git / auto-deploy**

- **Configuration → Webhooks / Git**: auto-deploy on push, already typical for a
  GitHub App. Confirm it lists branch `dev`.
- **Preview Deployments:** enable on this **staging** app after section D succeeds.
  See section F. Persistent staging is still `dev`; previews are extra ephemeral
  containers, not a substitute for the `dev` host. **Production stays off.**

8. **Deploy**. Follow the build log: `pnpm install --frozen-lockfile`, client build,
   runtime install, then `Running database migrations…` then
   `Starting Card Battle server…`.
9. If migrate fails, the container will not listen — that is fail-fast, not a
   “retry until it works”. Fix `DATABASE_URL` / Postgres health and redeploy.

### D. Confirm staging

1. Open the staging HTTPS URL. The hub should load.
2. Create a room, join from a second tab, play until Game over. WebSocket stays on
   the same origin (no `:2567` in the browser).
3. Staging Postgres: a row in `finished_games` (Coolify Postgres → **Terminal** /
   any SQL UI you already use on prod, pointed at staging).
4. `GET /inbox` on staging uses the **staging** `INBOX_PASSWORD`. Production inbox
   must still reject that password.

### E. Leave production alone

On the **production** environment tab, the existing app must still show:

- Git Branch **`main`**
- The original domain
- The original `DATABASE_URL` / `INBOX_PASSWORD`
- **Preview Deployments** **off**

Do not click **Deploy** on production as part of this setup. Do not enable
previews on production.

### F. PR preview deployments (staging app only)

Match WaaS: Coolify **native** Preview Deployments. GitHub fires `pull_request`
webhooks; Coolify builds the PR ref with the same `/Dockerfile` and tears the
container down when the PR merges or closes. No workflow in this repo clones a
Coolify app.

Enable only after the **staging** app itself is healthy (section D). Confirm
Build Pack **Dockerfile**, **Dockerfile Location** `/Dockerfile`, **Ports Exposes**
`2567`, no `3000:3000` mapping.

1. **Wildcard DNS first.** Create an `A` / `AAAA` record for
   `*.staging.yassine.boldys.ai` (or `*.<your-staging-hostname>`) pointing at the
   same VPS as staging. Without the wildcard, Coolify cannot serve
   `https://{pr_id}.staging.yassine.boldys.ai`.
2. Staging app → **Configuration → Advanced → Deployment** → enable
   **Preview Deployments**. Leave **Allow Public PR Deployments** **off** (fork
   / public-contributor code would run on the VPS).
3. **Configuration → Preview Deployments** → **Preview URL Template**
   `{{pr_id}}.staging.yassine.boldys.ai`. Coolify’s default `{{pr_id}}.{{domain}}`
   is the same if the staging domain is `staging.yassine.boldys.ai`.
4. **Preview Deployment Environment Variables** (runtime, **not** Build
   Variable — Coolify does not inherit the staging app’s env):

   ```
   NODE_ENV=production
   PORT=2567
   DATABASE_URL=<staging Internal URL>
   INBOX_PASSWORD=<staging secret>
   ```

   Leave `VITE_SERVER_URL` unset so the SPA dials the preview origin.
5. GitHub App already watching `chni9/battle-cards` needs **Pull requests**
   Read and write and a subscription to **Pull request** events. If the app was
   created without those: Coolify **Sources** → the GitHub App → **Permissions**
   → **Update**, then accept the GitHub permission prompt.
6. Open a test PR **into `dev`**. Confirm a hostname like
   `https://{n}.staging.yassine.boldys.ai` boots (`Running database migrations…`
   then `Starting Card Battle server…`). Hub + two-tab room; WebSocket stays
   same-origin. Staging `/admin` (staging `INBOX_PASSWORD`) lists the preview
   game — that pollution is expected.
7. Close the PR and confirm Coolify deletes the preview container.
8. PRs already open when you flip the switch are **not** auto-deployed: Preview
   Deployments → **Load Pull Requests** → **Deploy** on the ones you want.

A preview that adds a SQL migration runs `docker/entrypoint.sh` against the
**shared** staging database. That is the locked trade-off versus a per-PR
Postgres (out of scope). Never set preview `DATABASE_URL` to production.

## Promote staging → production

1. Staging has been play-tested on the `dev` tip.
2. GitHub PR: base `main`, compare `dev`. Title like `chore: promote staging to production`.
3. Merge (the `prod-from-dev` check must be green).
4. Coolify production auto-deploys `main`. Watch migrate logs the same way as staging.
5. Smoke the production domain (hub, one room, WebSocket).

Hotfixes follow the same path: land on `dev`, check staging, then promote. Do not
hotfix on `main` to “skip staging” unless you have deliberately disabled the
GitHub check.

## Clone-app shortcut (optional)

If you clone the **production application** into `staging` to copy Dockerfile
settings:

1. Clone **without** volumes (`clone_volumes` off).
2. Create staging Postgres first (section B) and **replace** `DATABASE_URL` before
   the first deploy.
3. Change Git Branch to `dev`.
4. Change the domain to the staging hostname (cloned FQDN would steal production
   TLS / routing if you leave it).
5. Rotate `INBOX_PASSWORD`.

Never start the clone while it still points at production Postgres or the
production domain.

## Out of scope

- A second Dockerfile or docker-compose for staging
- Sharing one Postgres between staging and production
- Per-PR Postgres (previews share staging)
- GitHub Actions that clone Coolify applications
- Enabling Preview Deployments on **production**
- Using PR previews as a substitute for the persistent `dev` staging host
- Server production JS bundle (`tsx` in the image is unchanged)
