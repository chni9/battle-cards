# Card Battle

Turn-based elimination card game, 2 to 4 players, hidden information, delayed resolution.
**V1** (this repo's engine and protocol) is complete: a narrow slice of the full game, built to
validate it before content is added — 63/63 backlog tasks done. **V2**, in progress, gives the
existing client a real design system, the game's illustrations, and animation, with no change
to any rule, screen flow, or protocol event.

## Documents

| Document | Authority |
|---|---|
| `docs/spec_bataille_des_cartes_en.md` | The game rules. Authoritative on rules. |
| `docs/technical_spec_v1.md` | V1 scope, architecture, protocol, Definition of Done. Contains no rule — refers to the rules spec by section. |
| `docs/technical_spec_v2.md` | V2 scope: design system, asset mapping, screens, animation. Changes no rule, screen flow, or protocol event. |
| `docs/backlog_v1.md` | V1 task archive (Lots 0–9, 63 tasks, all `Done`). Read-only history. |
| `docs/backlog_v2.md` | **Active** task tracker: V2 visual design (Lots 10–14). Watch point and acceptance criteria per task. Read "How to read this" first. |
| `AGENTS.md` | Working rules for agents and developers. `docs/agent/` holds the per-domain playbooks. |

**Known correction not yet applied to the rules spec:** the mutual-attacks rule in rules spec
§6 and the Super attack note in §2 still say the stronger attack prevails. That clause is
overruled. Actual rule: two attacks targeting each other, both pending — equal damage cancels
both on the retaliating player's turn; different damage means no interaction at all, each
resolves on its own target's turn. See technical spec §4.6.

## Requirements

Only **pnpm** needs to be on your machine. The Node runtime is not a system dependency here
— see below.

```bash
pnpm install     # also downloads the pinned Node runtime into ./node_modules
```

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Server and client dev processes in parallel |
| `pnpm typecheck` | `tsc` across the root config and all three packages |
| `pnpm lint` | ESLint over the whole repo |
| `pnpm test` | Vitest, all projects, once |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm verify` | typecheck + lint + test — the formal Definition of Done gate (technical spec §8) |

`pnpm dev` serves the client on <http://localhost:5173> and the game server on port 2567. Both
are overridable: `PORT` for the server, `VITE_SERVER_URL` for the address the client dials.

## Layout

```
apps/server       Authoritative game server. All rule logic lives here.
apps/client       React client. Displays state, sends intents, holds no rule logic.
packages/shared   Domain types shared by both. Single definition, never duplicated.
```

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

## Toolchain

| Tool | Version | Note |
|---|---|---|
| Node | 24.18.0 | Active LTS ("Krypton"): LTS since 2025-10-28, maintenance from 2026-10-20 |
| pnpm | 10.28.0 | Workspaces |
| TypeScript | 5.9.3 | Highest version `typescript-eslint` supports (peer range `<6.1.0`); TS 7 is not yet supported by the linter |
| ESLint | 10.8.0 | Flat config, with `typescript-eslint` 8.65.0 `strictTypeChecked` + `stylisticTypeChecked` |
| Vitest | 4.1.10 | Projects defined in `vitest.config.ts` at the root |
| Vite | 8.1.5 | Client build, with React plugin 6.0.4 |
| React | 19.2.8 | |
| Colyseus | 0.17.10 | Server-side rooms and transport. Used as transport only — no synchronised `Schema` state, see `docs/agent/protocol.md` |
| `@colyseus/sdk` | 0.17.43 | Client SDK. Replaces the older `colyseus.js` package |

### The Node runtime is project-local

`package.json` declares the runtime under `devEngines.runtime` with `onFail: "download"`.
On `pnpm install`, pnpm downloads Node 24.18.0 into `node_modules/.pnpm/node@runtime+24.18.0`
and pins the exact version and checksum in `pnpm-lock.yaml`. Every script run through pnpm
uses that binary.

Consequences:

- No `nvm`, `fnm`, or `volta` needed, and your system Node is neither used nor modified.
- The runtime is versioned like any other dependency — one source of truth, in the lockfile.
- Run commands through `pnpm`. Calling `node` directly gets your system Node, not this one.

### `packages/shared` is consumed as source

Its `exports` map points at `src/index.ts` rather than a build output. Nothing has to be
built before typechecking, testing, or running, and there is no dual source/dist resolution
to get wrong. The consumers (Vite for the client, `tsx` for the server, Vitest for tests) all
transpile TypeScript themselves.

The server therefore has no `tsc`-emit build step yet. `pnpm typecheck` type-checks it and
`tsx` runs it. A production bundle will be added when deployment is actually tackled.

### tsconfig

`tsconfig.base.json` carries the strict settings, extended by each package. Beyond `strict`,
it turns on `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`,
`noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax`.
