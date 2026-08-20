# AGENTS.md — Card Battle

> Rules for AI coding agents (tool-agnostic) and developers.
> Single transverse source, loaded on every agent call — keep it short (~200 lines).
> `CLAUDE.md` imports this file (`@AGENTS.md`).
> Detailed playbooks (loaded on demand) → `docs/agent/`.

## 1. Project snapshot

*Card Battle* is a turn-based elimination card game for 2 to 4 players, built on hidden
information and **delayed resolution**: an action aimed at an opponent takes effect on that
opponent's next turn, after they have played their own action, giving them a chance to react.
V1 proved the engine; V2 the visual layer; V3 heuristic bots, solo, and simulation; V4 the
full Classic content (15 kits). **V5** adds measurement, fitted evaluation, belief, and search
bots on the same rules — no value or rule changes. **V6** (readability, stranger onboarding,
beta feedback) is **in progress** from Lot 41 (`docs/technical_spec_v6.md` /
`docs/backlog_v6.md`); start at L41-01. V5 may continue in parallel. Audience: the designer
and his friends, plus first-time beta testers under V6.

Domains: **engine** (turn loop, resolution, elimination, legal-action enumeration) ·
**cards** / **kits** (Classic catalog) · **protocol and visibility** (per-recipient state, Spy) ·
**lifecycle** (timers, disconnection, inactivity) · **bots** (policies, simulation, arena,
search).

## 2. Source hierarchy (always follow this order)

1. **Code + lock files** — operational truth.
2. **`docs/spec_bataille_des_cartes_en.md`** (rules) and **`docs/technical_spec_v1.md`**
   (scope, architecture, protocol, Definition of Done) — functional and business truth.
   `docs/backlog_v5.md` sequences V5 (Lots 32–40); `docs/backlog_v6.md` sequences V6
   (Lots 41+); `docs/backlog_v1.md` … `docs/backlog_v4.md` are closed archives.
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
docs/               Rules spec, technical specs, backlog_v1/v2.md (archives), backlog_v3.md (active).
docs/agent/         Playbooks for agents. Read the relevant one before coding.
```

## 5. Golden rules

1. **Mutual attacks — stronger cancels weaker.** Two attacks targeting each other, both still
   pending, compared on the retaliating player's turn: *equal damage cancels both*; *unequal
   damage cancels the weaker*, and the stronger stays pending until its target's turn. Designer
   ruling 2026-08-04 (Lot 19) restores stronger-prevails and supersedes the earlier tech §4.6
   "unequal = no interaction" override. See `docs/agent/decisions.md`.
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
   obvious. Open decisions #4, #5, #6, #7 are known-unresolved (`docs/agent/decisions.md`);
   #1, #2 and #3 are closed.
7. **V1–V4 are closed; V5 is in progress** (`docs/technical_spec_v5.md`,
 `docs/backlog_v5.md`). **V6 is in progress** from Lot 41 (`docs/technical_spec_v6.md`,
 `docs/backlog_v6.md`).
 Team/God/Quick modes, accounts, in-progress persistence and
 monetization stay out (technical spec v1 §9) — not even partially. V5 and V6 change **no rule
 and no value**. V5 adds a policy registry, arena, belief model, search, and fitted
 evaluation. V6 adds teaching, table readability, and in-game feedback (tutorial is Classic
 with setup overrides, not a new competitive mode). A bot playing badly is never grounds for touching a rule. **Search,
   lookahead, and fitted learning are in scope for V5.** Reading hidden information beyond
   the acting seat's per-recipient view (including Spy-revealed fields for seats that seat
   has Spyed) and the **public** action log is **out** — technical spec v3 decision 2 is
   **not** reopened: the policy still receives no `GameState`. Opponent modelling is
   bounded to public fields + that public log within one game (technical spec v5 §2.2).
8. **The server is authoritative.** Every action is fully revalidated server side: ownership,
   resources, whose turn it is, valid target, kit permission. A greyed-out client button is
   not validation.
9. **The 25-life cap applies to every source of gain** — Regeneration, Absorber, Imposition,
   elimination rewards, upgraded Cloning. Read it from `GameState.lifeLimit`, never hardcode it.

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
| `docs/agent/db.md` | Finished-game Postgres log, migrations, end-of-game write |
| `docs/agent/testing.md` | Writing tests — which are mandatory and what they must prove |
| `docs/agent/bots.md` | Bot policies, registry, arena, workers (created in L32-02) |
| `docs/agent/decisions.md` | Checking why something is the way it is, or logging a new decision |

## 8. Up-to-date docs — use Context7

Your training is stale on Colyseus, React, Vite and Vitest, and this project deliberately pins a
non-latest TypeScript (`decisions.md`). Fetch current docs through the Context7 MCP before
writing framework-specific code — never code a framework API from memory.

## 9. Workflow & commands

Work through the **open** backlogs: `docs/backlog_v6.md` (Lot 41 onward) and, in
parallel, `docs/backlog_v5.md` (Lots 32–40). V1–V4 are closed archives
(`docs/backlog_v1.md` … `docs/backlog_v4.md`). V5 sequencing:
**Instrument (Lot 32) before Fitting (33), Belief (34), Search (35)** — nothing that cannot
be measured gets built. See `docs/backlog_v5.md` "How to read this". V6 sequencing: protocol
(41) before tutorial (45); pickers (44) before tutorial; one protocol bump in L41-02.

**Keep the backlog current.** `In progress` when you start a task, `Done` once it passes the
gate below, `Blocked` when it needs a ruling (reason in `docs/agent/decisions.md`) — in the same
change as the code, never a separate cleanup pass. A backlog lagging behind the code is worse
than none: the next session trusts it and redoes finished work.

**Subagents** (Task / Explore / cavecrew / any delegated agent): spawn **only** with
**Grok 4.5** or **Composer 2.5** (including their fast variants). Do not use Opus, Sonnet,
GPT, or any other model for subagents. `inherit` is fine only when the parent is already one
of those two families.

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
- [ ] The task's own **Acceptance** line in the open backlog is satisfied
      (`docs/backlog_v6.md` for V6)
- [ ] That task's status set to `Done` in the open backlog (`docs/backlog_v6.md` for V6)
- [ ] **Committed** — Conventional Commit referencing the task ID (see §10). Never leave a
      `Done` task uncommitted in the working tree
- [ ] No dependency added outside `pnpm-lock.yaml`

**After finishing a lot** (all tasks in that lot `Done`): run an autonomous browser
playtest of the lot's surface (see `docs/agent/frontend.md` · Post-lot browser gate). Fix
every issue found, re-verify, and commit fixes before moving to the next lot. Do not wait
for the developer to discover integration gaps.

## 10. Commits & PR

Conventional Commits, imperative mood, subject ≤50 chars (hard cap 72), no trailing period.
Reference the backlog task in the subject: `feat(engine): add delayed resolution queue (L1-07)`.
Body only when the *why* is not obvious — and always for a rule interpretation, a spec
deviation, or a decision that a future reader would otherwise have to re-derive. No AI
attribution. A project-local `caveman-commit` skill (`.agents/skills/`) enforces this style.

**Always commit when a backlog task is Done.** Same change as the code and the open
backlog status flip — not a later cleanup. Leaving finished work uncommitted is a process
failure.

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
