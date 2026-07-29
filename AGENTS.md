# AGENTS.md — Card Battle

> Rules for AI coding agents (tool-agnostic) and developers.
> Single transverse source, loaded on every agent call — keep it short (~200 lines).
> `CLAUDE.md` imports this file (`@AGENTS.md`).
> Detailed playbooks (loaded on demand) → `docs/agent/`.

## 1. Project snapshot

*Card Battle* is a turn-based elimination card game for 2 to 4 players, built on hidden
information and **delayed resolution**: an action aimed at an opponent takes effect on that
opponent's next turn, after they have played their own action, giving them a chance to react.
This repo is **V1**, the first online-playable version — a deliberately narrow slice
(16 cards, 4 kits, Classic mode, no accounts) whose only job is to prove the engine before
content is added. Audience: the designer and his friends.

Domains: **engine** (turn loop, resolution, elimination) · **cards** (16, one isolated handler
each) · **kits** (4, with permanent traits) · **protocol and visibility** (per-recipient state,
Spy) · **lifecycle** (timers, disconnection, inactivity).

## 2. Source hierarchy (always follow this order)

1. **Code + lock files** — operational truth.
2. **`docs/spec_bataille_des_cartes_en.md`** (rules) and **`docs/technical_spec_v1.md`**
   (scope, architecture, protocol, Definition of Done) — functional and business truth.
   `docs/backlog.md` sequences the work and carries per-task acceptance criteria.
   **English only** — the French versions were deleted, do not reintroduce them.
3. **Explicit developer instructions in the current session.**
4. **Up-to-date framework docs via Context7** (§8) — external libraries only.

Absolute rules:

- Never invent a business rule, product decision, or architectural convention absent from
  sources 1–3. If information is missing, mark it **undefined** and ask.
- **On a rule the rules spec wins over the technical spec — except where the technical spec
  explicitly overrides it**, which it does in §4.6 and its Appendix A rulings (more recent).
  See golden rule 1. The technical spec never restates a rule; keep it that way.
- On stack and conventions the code wins over any document. Surface conflicts, never
  reconcile them silently — record them in `docs/agent/decisions.md`.

## 3. Stack

| Layer | Choice |
|---|---|
| Language | TypeScript, strict, backend and frontend |
| Backend | Node.js + Colyseus — rooms, state sync, reconnection |
| Frontend | React + Vite |
| Structure | pnpm workspaces: `apps/server`, `apps/client`, `packages/shared` |
| Game state | In-memory, server side, one per room |
| Database | Postgres — **only** the log of finished games, one write at game end |
| Hosting | VPS + Coolify |
| Tests | Vitest · Lint: ESLint + typescript-eslint |

Exact versions live in `package.json` and `pnpm-lock.yaml` — never restate them in markdown.
The Node runtime is itself lockfile-pinned via `devEngines.runtime`, so **run everything through
`pnpm`**: a bare `node` call gets the system install. Rationale in `README.md`. **Never add a
dependency** except by installing it with pnpm, so the lockfile is updated.

## 4. Repo map

```
apps/server         Authoritative game server. ALL rule logic lives here.
apps/client         React client. Renders state, sends intents. Zero rule logic.
packages/shared     Domain types shared by both. One definition, never duplicated.
  src/domain/       card · kit · effect · player · game-state
docs/               Rules spec, technical spec, and backlog.md (the task tracker).
docs/agent/         Playbooks for agents. Read the relevant one before coding.
```

## 5. Golden rules

1. **The rules spec is wrong about mutual attacks — do not follow it.** §6 (line 243) and the
   §2 note (line 55) still say the stronger attack prevails. That clause is **overruled**.
   Actual rule: two attacks targeting each other, both still pending — *equal damage cancels
   both*, on the retaliating player's turn; *different damage means no interaction at all*,
   each resolves on its own target's turn. Technical spec §4.6 is correct. Fixing the rules
   spec file is a human-owned task: **do not edit it.**
2. **`applyDamage` and `applyLifeLoss` are two functions and must never be merged.**
   `applyDamage` is for attack cards only: it goes through the shield and decrements the hit
   player's card counters. `applyLifeLoss` is for Tax, Suicide, Imposition and every other
   non-attack loss: it ignores the shield and touches no counter. This is the project's most
   likely silent bug — nothing will flag it. See `docs/agent/engine.md`.
3. **Nothing resolves before its target has played their own action.** A queued effect
   resolves on its target's turn, *after* that player acts, in ascending `queuedAt` order.
   A player never loses lives or resources outside their own turn. Break this and the entire
   bluffing mechanic is worthless.
4. **Build one state view per recipient, directly.** Never build a complete state and filter
   it on the way out — that pattern leaks every field added later. See `docs/agent/protocol.md`.
5. **Every draw goes through the injected seeded generator.** Card distribution, Sentence,
   special card purchase, Mirror's default target. Without a seed nothing is reproducible.
6. **Never invent a rule.** If the rules spec, the technical spec and the backlog's **Watch
   point** line do not clearly resolve a case, **stop and ask** — even when the answer looks
   obvious. Open decisions #1, #4, #5, #6, #7 are known-unresolved (`docs/agent/decisions.md`);
   #2 and #3 are closed.
7. **V1 scope is closed.** The 11 other kits, Team/God/Quick modes, bots, accounts,
   in-progress persistence, monetization and art direction are out (technical spec §9) — not
   to be implemented "even partially, even to lay groundwork".
8. **The server is authoritative.** Every action is fully revalidated server side: ownership,
   resources, whose turn it is, valid target, kit permission. A greyed-out client button is
   not validation.
9. **The 25-life cap applies to every source of gain** — Regeneration, Absorber, Imposition,
   elimination rewards, upgraded Cloning. Read it from `GameState.lifeLimit`, never hardcode it.
10. **One backlog task at a time.** Read its **Watch point** and **Acceptance** lines before
    writing code. Do not bundle several task IDs into one pass, and do not skip ahead.

## 6. Code conventions

Derived from `tsconfig.base.json`, `eslint.config.mjs`, `vitest.config.ts`.

- **Strictness is not negotiable.** Beyond `strict`: `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`,
  `noPropertyAccessFromIndexSignature`, `noUnusedLocals/Parameters`, `verbatimModuleSyntax`.
  Never widen a type or add a cast to silence one of these — fix the model instead.
- **Lint is `strictTypeChecked` + `stylisticTypeChecked`.** No `eslint-disable` without a
  comment explaining why, and never on a rule about type safety.
- **Prefer union types over enums**, and derive unions from `as const` arrays when the values
  are needed at runtime (see `packages/shared/src/domain/card.ts`).
- **Encode invariants in types where possible.** `applyDamage` takes an `AttackCardId`, so it
  is structurally impossible to call from Tax. Prefer this over a comment saying "don't".
- ESM everywhere. `kebab-case` file names, `kebab-case` card and kit ids.
- **Doc comments cite their source** — `rules spec §3`, `technical spec §4.6`. An uncited rule
  looks invented and the next reader cannot check it. Comments explain *why*, never *what*.
- Tests sit beside the code they cover: `src/**/*.test.ts`.

## 7. Domain playbooks — read before coding

| Playbook | Read it when |
|---|---|
| `docs/agent/engine.md` | Turn loop, delayed resolution, life loss, mutual attacks, ledger, elimination |
| `docs/agent/card-handler.md` | Adding or changing any card |
| `docs/agent/protocol.md` | Colyseus rooms, events, per-recipient views, Spy visibility |
| `docs/agent/frontend.md` | Client screens and connection conventions (from L1-12) |
| `docs/agent/testing.md` | Writing tests — which are mandatory and what they must prove |
| `docs/agent/decisions.md` | Checking why something is the way it is, or logging a new decision |

## 8. Up-to-date docs — use Context7

Your training is stale on Colyseus, React, Vite and Vitest, and this project deliberately pins a
non-latest TypeScript (`decisions.md`). Fetch current docs through the Context7 MCP before
writing framework-specific code — never code a framework API from memory.

## 9. Workflow & commands

Work through `docs/backlog.md` **in task-ID order**, starting at lot 0. The sequencing is
deliberate: lot 1 is a thin vertical slice, almost free of game content, so nothing later
rests on an unproven foundation.

**Keep the backlog current.** `In progress` when you start a task, `Done` once it passes the
gate below, `Blocked` when it needs a ruling (reason in `docs/agent/decisions.md`) — in the same
change as the code, never a separate cleanup pass. A backlog lagging behind the code is worse
than none: the next session trusts it and redoes finished work.

| Command | Purpose |
|---|---|
| `pnpm dev` | Server and client in parallel |
| `pnpm typecheck` | `tsc` across the root config and all three packages |
| `pnpm lint` | ESLint over the repo |
| `pnpm test` | Vitest, all projects, once |
| `pnpm verify` | typecheck + lint + test — the gate below |

**Definition of Done** (technical spec §8 — before declaring any task complete):

- [ ] `pnpm verify` green: `tsc` clean, linter clean, all tests passing
- [ ] No test skipped, disabled, or weakened to pass
- [ ] Every card or rule touched has its test created or updated
- [ ] The task's own **Acceptance** line in `docs/backlog.md` is satisfied
- [ ] That task's status set to `Done` in `docs/backlog.md`
- [ ] No dependency added outside `pnpm-lock.yaml`

## 10. Commits & PR

Conventional Commits, imperative mood, subject ≤50 chars (hard cap 72), no trailing period.
Reference the backlog task in the subject: `feat(engine): add delayed resolution queue (L1-07)`.
Body only when the *why* is not obvious — and always for a rule interpretation, a spec
deviation, or a decision that a future reader would otherwise have to re-derive. No AI
attribution. A project-local `caveman-commit` skill (`.agents/skills/`) enforces this style.

**One commit per backlog task.** Finish a task, `pnpm verify`, mark it `Done`, then commit that
task alone. Do not bundle several task IDs into one commit unless the developer explicitly
allows it for that pass (e.g. a catch-up commit after a multi-task session).

## 11. Agent output style

- **Running on Claude Opus → reply in `caveman` style** (`.agents/skills/caveman/`): no
  articles, no filler, no pleasantries, fragments fine, short synonyms. Default level `full`.
  Any other model → normal prose. Off on request ("stop caveman" / "normal mode").
- **Style applies to chat replies only.** Code, comments, commit messages, `AGENTS.md`,
  `docs/**` and spec citations are always written in full, normal English.
- Drop it where compression could mislead: security warnings, confirmations of irreversible
  actions, and any multi-step sequence whose order gets ambiguous without conjunctions.
  Resume once the risky part is stated.

## 12. Auto-maintenance (living docs)

The files in `docs/agent/` are living documents. You maintain them automatically.

- **Keep this file short** (~200 lines max). Mechanical detail belongs in `docs/agent/*.md`, never here.
- **Routing — before any non-trivial task, read the relevant playbook**, then propose a short plan before coding.
- **When you establish a new convention, recurring pattern, or non-trivial technical decision**:
  write it directly into the relevant `docs/agent/*.md` file, alongside the code. No prior approval needed.
- **Architecture decisions → `docs/agent/decisions.md`**, append-only with date. Never overwrite past entries.
- **Pattern files**: keep them terse with stable sections. Edit the relevant section, not the whole file.
- **The code is the source of truth**: if a `docs/agent/` file contradicts the actual code, fix the doc.

Living docs map: `docs/agent/`.
