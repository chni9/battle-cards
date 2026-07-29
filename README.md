# Card Battle — V1

Turn-based elimination card game, 2 to 4 players, hidden information, delayed resolution.
This repo is the first online-playable version: a narrow slice of the full game, meant to
validate the engine before content is added.

## Documents

| Document | Authority |
|---|---|
| `docs/spec_bataille_des_cartes_en.md` | The game rules. Authoritative on rules. |
| `docs/technical_spec_v1.md` | Scope, architecture, protocol, Definition of Done. Contains no rule — refers to the rules spec by section. |
| `docs/backlog_v1_card_battle.xlsx` | 63 tasks in 10 lots, with per-task acceptance criteria and watch points. Read the Legend tab first. |

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

## Layout

```
apps/server       Authoritative game server. All rule logic lives here.
apps/client       React client. Displays state, sends intents, holds no rule logic.
packages/shared   Domain types shared by both. Single definition, never duplicated.
```

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
