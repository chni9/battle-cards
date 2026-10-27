# V7 Lot 73 — View-model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, React-free V7 view-model: the functions that turn a per-recipient view into what the arena displays and which intents it may send, with behavior tests. No player-visible change.

**Architecture:**
- Each spec v7 §4.3 function gets its own module in `apps/client/src/view-model/`: `seats`, `threats`, `cardActions` / `dropTarget`, `selfStrip`, `shop`, `log`, `rulesRecall` and `turnClock`.
- Each module reads only fields of the per-recipient view (`PlayingStateView` and friends), mirrors the server's legality where it shows a disabled reason, and never reads the clock: callers pass `nowMs`.
- One shared test-fixture builder (`view-model/test-fixtures.ts`, L73-02) feeds every test.
- Lot 74 renders this output; nothing in Lot 73 is mounted.

**Tech Stack:** TypeScript (strict) · Vitest 4 (node environment, `*.test.ts`) · `@card-battle/shared` domain and protocol types. No new dependency.

**Spec:** `docs/technical_spec_v7.md` (normative; §4.3, §6.1–§6.12, §10.3, §11, §12, §15 row 73) with Appendix A `docs/technical_spec_v7_parity.md`. Tracker: `docs/backlog_v7.md` Lot 73. The task briefs this plan expands are kept in git history at commit 881c28f, the last version of this file before the expansion.

> Generated 2026-10-27. The controller fixed one shared interface contract (Appendix A below). One planning agent wrote each domain's tasks from the contract, spec, briefs and code. The controller then ran a cross-task consistency pass. Each task ends with **Decisions**: choices the executor cannot derive from the spec. They are binding unless the designer overrides them in review. Appendix B lists the questions for the designer, each with the default this plan implements, and the consolidated new strings. Appendix C keeps the brief's draft questions and their dispositions.

## Global Constraints

- **Client-only (§1, §15 row 73).** No server, engine or protocol change, and no `packages/shared` change except the comment-only fixes in L73-01 (§10.3). `PROTOCOL_VERSION` stays 45. No Classic rule or value changes.
- **No player-visible change:** no What's new item, and no browser gate (§12.3: "L73 has no browser gate"). The old table keeps its behavior, including the Q37 opponent-Shield upgrade bug, until the L75 flip.
- **View-model purity (§4.3):** code lives in `apps/client/src/view-model/**/*.ts`.
  - No React, react-dom or motion import, and no `Date.now()` or `performance.now()`. This is enforced by the L72-03 lint block and `view-model-purity.test.ts`.
  - It may import `@card-battle/shared` and pure `ui/*.ts` helpers. It never imports a `ui/` component, `design/` or `screens/`.
- **Tests:**
  - Behavior tests in `*.test.ts` beside the module run in node, with no environment pragma.
  - Never a new source-text (`readFileSync`) test (AGENTS.md §6; §12). `vitest` imports are explicit (no globals), and tests never call `Date.now()`.
  - No test is skipped, disabled or weakened.
  - A retired test (a dead module or dead helpers) gets a `docs/agent/decisions.md` entry citing the superseding V7 section, in the same commit.
  - Lot 73 owns no rows in `docs/backlog_v7_test_classification.md`; L73-01 re-checks this (§12.1).
- **Server truth:**
  - A disabled reason shows only when the view proves the server would reject. The client is never stricter than the server's legal enumeration (`apps/server/src/engine/turn/list-legal-*.ts`).
  - No client immunity filter. Server revalidation stays the only validation (AGENTS.md golden rule 8).
- **No hidden information (§6.3):** values come only from fields the server sent to this recipient. No client inference.
- **Never a summed attack total (golden rule 1, designer 2026-09-29):** one label per pending effect.
- **Copy:** English only.
  - Reuse an existing V2 string verbatim for the same case.
  - New player-facing strings (the disabled reasons first) are listed in the Lot 73 PR under "New strings (§10.6)" for designer review. Appendix B holds the consolidated table.
- **Strict TypeScript:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`. Never widen a type or cast to silence them. Use unions derived from `as const` arrays, and named exports only.
- **Doc comments cite their source** (`spec v7 §6.5`, `rules spec §3`, `server list-legal-play-card.ts`) and explain why.
- **Definition of Done per task (§12.5, AGENTS.md §9):**
  - `pnpm verify` green;
  - the backlog Acceptance met;
  - the `docs/backlog_v7.md` status set to `Done` and the Progress row count updated;
  - the `docs/agent/frontend.md` lines the task supersedes updated in the same commit;
  - exactly one Conventional Commit, subject ≤ 50 chars (hard cap 72) with the task id, e.g. `feat(view-model): add threats() arrows (L73-04)`;
  - files staged by name, never `git add -A`;
  - no AI attribution (AGENTS.md §10 overrides any Co-Authored-By line).
- **Branching (§4.6):** branch `claude/v7-lot-73` from `dev`; one ready-for-review PR into `dev` at the end of the lot. The V7 promotion freeze is in force (no `dev` → `main`).
- **Tooling:** run every command through `pnpm`, because Node is pinned via `devEngines`. Single test file: `pnpm vitest run <path>`.

## Review Focus

The five input classes most likely to bite, each pinned by a named test:

1. **An eliminated seat that also carries spectator `spied`:** a tier read from `spied.kitId` would print live post-death numbers. L73-02, `an eliminated seat that also carries spectator spied shows its death reveal, not live values`.
2. **A 0×0 arena box on the first paint, before L74 measures:** the ellipse radii go negative. L73-03, `an arena smaller than one seat (a 0×0 first paint) uses the grid`.
3. **Corpses and living Invisible seats as targets:** only a corpse whose own attack (or Thief) is pending on the POV qualifies, never a living Invisible attacker. L73-06, `keeps attack and Thief corpse ripostes separate and never offers a living Invisible seat (L68-07, L65-02)`.
4. **Every living opponent Invisible:** Spy, attacks and Sentence+ get `no-valid-target`, while upgraded Card Thief, base Sentence and MEGA ATTACK stay enabled, as on the server. L73-06, `with every living opponent Invisible, %s routes %s with reason %s`.
5. **A deadline already past, or a first sighting shorter than the time left:** seconds must clamp at 0 and the ratio to [0, 1]. L73-13, `clamps the seconds at 0 and the ratio between 0 and 1`.

## Conventions (shared by every task)

- **File and naming:**
  - kebab-case file names, one module per §4.3 function;
  - helpers private to a module stay unexported;
  - a function exported only for tests is a smell: test through the public function.
- **Inputs:** finished-board callers pass `finished.finalTable` as the view and `readOnly: true` in `ActionContext`. A walk-in spectator is `view.isSpectator === true`. An eliminated POV is the `isYou` player with `isEliminated`.
- **Outputs:**
  - Plain readonly data: no functions in the model, no class instances.
  - Order is meaningful and documented (seat order, badge order, action order).
  - Absent means "not offered"; disabled means "offered, with a reason".
- **Shared helpers, one each, never a private copy:** `availabilityFor` (L73-06) builds every `ActionAvailability`. `povModeOf`, `connectionLabel` and `seatColorIndexOf` (L73-02) give the POV mode, the connection text and the seat colour wherever they appear. `inPlayThumbs` (L73-07) builds every in-play thumb.
- **Test fixtures:** every test builds its view with `view-model/test-fixtures.ts`, whose defaults are fixed in Appendix A. Tests override only what they assert on, and they set `players` and `turnOrder` together when the seat set changes.
- **Commands:** run one test file from the repo root with `pnpm vitest run apps/client/src/view-model/<file>.test.ts`.
- **Docs:**
  - Each task updates only the `docs/agent/frontend.md` lines it supersedes. New L73 bullets go at the end of `## View-model layer (V7 · Lot 72+)`, each after the previous task's bullet, in task order.
  - `docs/agent/decisions.md` ends with a `---` line. Each entry is appended after it in the file's existing `## YYYY-MM-DD · [P] …` format, closes with its own `---`, and never edits a past entry. Lot 73 appends in task order: L73-02, L73-03, L73-05, L73-06, L73-07, L73-09, L73-11, L73-13.
- **Backlog:** set the task's row to `In progress` when you start it and to `Done` in its commit. After task L73-NN the Progress table reads `| 73 · View-model | 13 | NN |` and `| **Total** | **134** | **21 + NN** |`: 22 after L73-01, 34 after L73-13. If a parallel lot moved the Total first, add one to whatever it holds; the Lot 73 cell is exact.
- **References:** "Appendix A" followed by a parity row id in backticks (for example Appendix A `economy-bar`) means spec v7 Appendix A, `docs/technical_spec_v7_parity.md`. This plan's own Appendix A is the interface contract.

## Execution order

Sequential, in id order: L73-01 → L73-13. Each task starts from the previous task's commit.
- L73-02 must land before every later task, because it creates the fixtures and the shared seat helpers.
- L73-06 must land before L73-07..L73-10, because it creates `action-lock.ts` and `action-reasons.ts`.
- L73-07 must land before L73-09, because the self strip builds its thumbs with `inPlayThumbs`.
- L73-12 must land before L73-13.

---

### Task L73-01: Correct pre-Lot-69 Spy comments and playbook lines

**Files:**
- Modify (comments only):
  - `packages/shared/src/protocol/state-view.ts`: line 170 (`spied?` doc), lines 190–215 (`SpiedPlayerView`), lines 273–285 (the `PlayingStateView` header block).
  - `packages/shared/src/domain/visibility.ts`: lines 6–8 (header).
  - `apps/client/src/view-model/opponent-seat-resources.ts`: lines 1–5 (header), 56 (`opponentKitIsVisible` doc), 69 (`collectLiveResourceSnaps` doc).
  - `apps/client/src/view-model/table-helpers.ts`: lines 52–53 (stacked docs above `hasFullSpyCardReveal`), plus a doc on `visibleKitId` (line 64).
  - `apps/client/src/screens/table/opponent-reveal-dialog.tsx`: lines 1–5.
  - `apps/client/src/screens/table/opponent-zone.tsx`: lines 1–6 and 38.
  - `apps/client/src/design/components/resource-icon.tsx`: line 27.
- Modify (test, title and comment only):
  - `apps/client/src/view-model/opponent-seat-resources.test.ts`: line 22, the `it()` title.
  - `apps/client/src/view-model/table-helpers-kit.test.ts`: line 2, the header comment.
- Docs: `docs/agent/frontend.md` (lines 1057–1061 and 1211–1218), `docs/agent/protocol.md` (rows at lines 67 and 68), `docs/backlog_v7_test_classification.md` (line 50, Test cell), `docs/backlog_v7.md` (L73-01 row, Progress table).

**Interfaces:**
- Consumes: nothing.
- Produces: no code symbol, and no change to wire, behavior or assertions. L73-02 relies on the corrected meaning: `opponentKitIsVisible` is true for any Spy relation or death reveal, while the kit itself is known only from `spied.kitId` (Spy+, spectator vision) or `eliminationReveal.kitId`.

- [ ] **Step 1: Write the failing check.** This task changes no behavior, so its "test" is the Acceptance grep plus the lot-entry check of spec §12.1.
  1. Lot-entry check (spec v7 §12.1; Lot 73 is the lot's first task). Every file in the regenerated list must already be classified, and no section may name Lot 73:
     ```sh
     grep -rl readFileSync apps/client/src | grep '\.test\.' | wc -l          # expect 65
     grep -rl readFileSync apps/client/src | grep '\.test\.' | sed 's#^apps/client/src/##' \
       | while read -r f; do grep -qF "\`$f\`" docs/backlog_v7_test_classification.md || echo "missing $f"; done
                                                                               # expect no output
     grep -c '^## Owner lot 73' docs/backlog_v7_test_classification.md        # expect 0
     ```
     This is a check, not a doc change. If any line differs, stop and ask.
  2. The Acceptance grep (base Spy said to show `?`, a frozen snapshot, or a kit; or an ambiguous "Spy / death reveal"):
     ```sh
     grep -rnE '(unspied|Unspied) (/|and) base Spy|[Bb]ase Spy[^`]*`\?`|[Bb]ase Spy (freezes|resources stay)|Base \(`kit-and-cards`\): frozen|Spy \(base\): kit|Frozen resources at first Spy resolve|Spy / death reveal|Spy or death reveal' \
       apps/client/src packages/shared/src --include='*.ts' --include='*.tsx'
     ```
- [ ] **Step 2: Run it and see it fail.** The grep prints exactly these 14 lines:
  `resource-icon.tsx:27`, `opponent-reveal-dialog.tsx:2` and `:4`, `opponent-zone.tsx:3`, `:4` and `:38`, `opponent-seat-resources.ts:3`, `opponent-seat-resources.test.ts:22`, `table-helpers.ts:52`, `table-helpers-kit.test.ts:2`, `state-view.ts:195`, `:207` and `:278`, `visibility.ts:7`.
- [ ] **Step 3: Implement.** Comment edits only. Write each replacement exactly as below.
  - **Pinned strings.** Source-text tests read two of these files, so the new text must not contain them:
    - `opponent-reveal-dialog.tsx`: `— Spy` and `resourcesSnapshot` (`opponent-zone.opponent-seat-resources.test.ts`).
    - `opponent-zone.tsx`: `Hidden kit`, `HIDDEN_KIT_LABEL`, `Spied — tap`, `Revealed — tap`, `omitShield`, `ResizeObserver` and `variant="crossed"` (`opponent-zone.opponent-seat-resources.test.ts`, `opponent-zone.test.ts`).
  - `state-view.ts` line 170 →
    ```ts
      /** Filled when the recipient spies this player (L3-05) or has spectator vision; see `SpiedPlayerView`. */
    ```
  - `state-view.ts` lines 190–215. Every field and type stays byte-identical; only the three comments change. The complete result:
    ```ts
    /**
     * Spy-gated slice of another player: present when the recipient has a Spy relation on them,
     * or full spectator vision (rules spec §3, Lot 69; server `build-view-for.ts` `buildSpiedView`).
     *
     * Base Spy (`kit-and-cards`, a pre-Lot-69 level name): live lives, points, upgrade points and
     * shield only. Kit, hand and specials stay hidden.
     * Spy+ (`full-resources`), an eliminated spectator, or a walk-in after Stay (L57-16): the same
     * live values plus `kitId`, `hand` and `specialCards`.
     */
    export interface SpiedPlayerView {
      /** Spy+ and spectator vision only (Lot 69). */
      kitId?: KitId;
      hand?: readonly CardInstance[];
      specialCards?: readonly CardInstance[];
      /** Live resources: every Spy relation and spectator vision (Lot 69). */
      lives?: number;
      points?: number;
      upgradePoints?: number;
      shield?: number;
      /**
       * Never sent since Lot 69. It stays in the type only because removing it is a protocol
       * change; the cleanup is separate work (technical spec v7 §14.1).
       */
      resourcesSnapshot?: {
        lives: number;
        points: number;
        upgradePoints: number;
        shield: number;
        turnSequence: number;
      };
    }
    ```
  - `state-view.ts` lines 273–285, the whole block:
    ```ts
    /**
     * Playing view (L1-09). Built per recipient.
     *
     * Private: own kit, hand, lives, shield, exact resources.
     * Public: elimination status, pending queue, turn order, actions.
     * Spy (base, Lot 69): live lives, points, upgrade points and shield. Spy+ (upgraded) and
     * spectator vision: those live values plus kit, hand and specials. `spied.resourcesSnapshot`
     * is never sent (technical spec v7 §14.1).
     * Server-only: never `seed`.
     *
     * Developer ruling 2026-07-30: lives and shield are **not** public without Spy
     * (overrides tech §5.1 table for unspied opponents).
     * Hand **card count** is also private — revealed only via Spy+ or spectator vision
     * (`spied.hand` / specials).
     */
    ```
  - `visibility.ts` lines 6–8 →
    ```ts
     * Developer ruling 2026-07-30 (evening): Spy "resources" = lives, points, upgrade
     * points, shield. Since Lot 69 every level sees them live; the base level (`kit-and-cards`,
     * a pre-Lot-69 name) no longer reveals kit or cards. The first-grant `resourcesSnapshot` is
     * still frozen server-side but never sent (technical spec v7 §14.1).
    ```
  - `opponent-seat-resources.ts` lines 1–5 →
    ```ts
    /**
     * Opponent seat resource presentation — L51-08, Lot 69.
     * An unspied seat stays `?`. Every Spy relation, base or Spy+, carries live numbers on
     * `spied`; a death reveal carries the numbers frozen at death.
     * Must never print unspied totals (those fields are not on PublicPlayerView).
     */
    ```
    - Lines 56 and 69 →
      ```ts
      /** True for any Spy relation or death reveal (L51-09). Since Lot 69 it no longer means the kit is known: a base Spy has no `spied.kitId`. */
      ```
      ```ts
      /** POV plus every seat with known totals: any Spy relation (live) or death reveal (frozen) (L51-11, Lot 69). */
      ```
  - `table-helpers.ts`:
    - Delete line 52, the orphan `/** Kit art the recipient already sees — Spy or death reveal. Matches opponent-zone. */`. Line 53 stays on `hasFullSpyCardReveal`.
    - Add above `export function visibleKitId` → `/** Kit the recipient already sees: death reveal, else Spy+. A base Spy keeps it hidden (Lot 69). Matches opponent-zone. */`
  - `opponent-reveal-dialog.tsx` lines 1–5 →
    ```ts
    /**
     * Spy+ / death reveal — shown on click so the opponent seat stays compact on mobile.
     * Replaces KitInspectDialog for revealed opponents (live hand + resources, not roster).
     * Spy+ shows live numbers and a death reveal the frozen ones; a missing value renders `?`
     * (L51-08). A base Spy never opens it: it reveals resources only, on the seat (Lot 69).
     */
    ```
  - `opponent-zone.tsx`:
    - Lines 3–4 →
      ```ts
       * Spy+ / death reveal: click the portrait to open the reveal dialog.
       * Resource icons always render; an unspied seat shows `?`, any Spy relation live numbers (L51-08, Lot 69).
      ```
    - Line 38 → `/** Spy+ or death reveal — opens the opponent info dialog. */`
  - `resource-icon.tsx` line 27 →
    ```ts
      /** Numeric amount, or `unknown` for an unspied seat (L51-08); every Spy relation has live numbers (Lot 69). */
    ```
  - `opponent-seat-resources.test.ts` line 22: title only → `it('shows unknown for unspied and for a pre-Lot-69 snapshot fixture, never snapshot totals', () => {`. Every assertion and fixture stays byte-identical.
  - `table-helpers-kit.test.ts` line 2 → ` * visibleKitId follows opponent-zone Spy+ / death reveal — L44-02, Lot 69.`
- [ ] **Step 4: Run it and see it pass.**
  - The Step 1 grep prints nothing.
  - The code diff is comments plus one title:
    ```sh
    git diff -U0 -- apps/client/src packages/shared/src | grep -E '^[-+]' | grep -vE '^(\+\+\+|---) ' \
      | grep -vE '^[-+][[:space:]]*(/\*\*|\*|//)'
    ```
    It prints exactly the two `it('shows unknown for unspied …` lines (`-` old, `+` new).
  - Tests: `pnpm vitest run apps/client/src/view-model/opponent-seat-resources.test.ts apps/client/src/view-model/table-helpers-kit.test.ts apps/client/src/screens/table/opponent-zone.opponent-seat-resources.test.ts apps/client/src/screens/table/opponent-zone.test.ts apps/client/src/screens/table/table-chrome.test.ts apps/client/src/screens/table/active-persistent-thumb.test.ts apps/client/src/screens/table/sentence-chip.test.ts apps/client/src/design/components/life-count-badge.test.ts`. All pass with unchanged counts.
- [ ] **Step 5: Docs.** Line numbers are from `881c28f`, before any edit in this step.
  - `docs/agent/frontend.md` lines 1059–1061, inside the token-flyout bullet. These three lines currently run from `    (skip only after chips measure). Unspied / base Spy enqueue **directed** chips` to `    log→seat; buy upgrade point spends Classic 10 when kit is hidden. **Resource`. Replace all three with these four lines:
    ```
        (skip only after chips measure). Every seat enqueues **directed** chips
        (`from` / `to` log or player): play/buy/upgrade spends seat→log; sell yield
        log→seat. A seat whose kit is hidden (unspied, or base Spy since Lot 69) flies one
        Draw point and spends Classic 10 for an upgrade point. **Resource
    ```
    The code agrees: `chipsForPublicLogEntry` runs for every log entry, and its local `visibleKitId` reads only `eliminationReveal` and `spied.kitId`.
  - `docs/agent/frontend.md` lines 1211–1218. Replace the whole `**Spy / death reveal (L51-08 / L51-10):**` bullet with:
    ```
    - **Spy / death reveal (L51-08 / L51-10, Lot 69):** opponent seats always show lives /
      points / upgrade points / shield icons. An unspied seat renders `?` (never unspied
      totals). Any Spy relation, base or upgraded, shows live numbers; a death reveal shows the
      numbers frozen at death. A base Spy keeps the kit, hand and specials hidden; Spy+
      (`spied.kitId`) and death reveal show them. The server never sends
      `spied.resourcesSnapshot` (spec v7 §14.1). Icons stack vertically beside the portrait;
      activated cards sit under the portrait. Shield stays on the seat (no omit-on-
      overflow). Portrait stays tappable when a Spy+ or death reveal exists. Dialog
      title is `{nickname}` for Spy+ and `{nickname} (eliminated)` on death. No Hidden
      kit / Spied — tap / Revealed — tap labels.
    ```
  - `docs/agent/protocol.md`:
    - Line 67: replace `**Private.** Revealed only by Spy, Spy Thief (Lot 71 grants` with the text below. The rest of the row is unchanged.
      ```
      **Private.** Revealed only by an upgraded Spy (`full-resources`; a base Spy reveals the exact resource values only, Lot 69), Spy Thief (Lot 71 grants
      ```
    - Line 68: replace the whole row with:
      ```
      | Lives, shield, points, upgrade points | **Private** without Spy / spectator overlay. Every Spy relation, base or upgraded, and the eliminated / Stay walk-in overlay: live values (rules §3, Lot 69). `spied.resourcesSnapshot` stays in the type but is never sent; removing it is separate work (technical spec v7 §14.1) |
      ```
  - `docs/backlog_v7_test_classification.md` line 50, Test cell only: `opponent seat resources (L51-08) > shows unknown for unspied and for a pre-Lot-69 snapshot fixture, never snapshot totals`.
  - `docs/backlog_v7.md`:
    - Set the L73-01 row to `In progress` when starting and `Done` in this commit.
    - Progress: `| 73 · View-model | 13 | 0 |` → `| 73 · View-model | 13 | 1 |` and `| **Total** | **134** | **21** |` → `| **Total** | **134** | **22** |`.
- [ ] **Step 6: Verify and commit.**
  ```sh
  pnpm verify
  git add packages/shared/src/protocol/state-view.ts packages/shared/src/domain/visibility.ts \
    apps/client/src/view-model/opponent-seat-resources.ts apps/client/src/view-model/opponent-seat-resources.test.ts \
    apps/client/src/view-model/table-helpers.ts apps/client/src/view-model/table-helpers-kit.test.ts \
    apps/client/src/screens/table/opponent-reveal-dialog.tsx apps/client/src/screens/table/opponent-zone.tsx \
    apps/client/src/design/components/resource-icon.tsx docs/agent/frontend.md docs/agent/protocol.md \
    docs/backlog_v7_test_classification.md docs/backlog_v7.md
  git commit -m "docs: correct pre-Lot-69 Spy comments (L73-01)"
  ```
  No body: there is no ruling.

**Acceptance map:**
- Code diff limited to comments plus the test title, every assertion unchanged: the Step 4 diff filter prints only the two `it('shows unknown for unspied …` lines, and the Step 4 suites pass with unchanged counts.
- No client or shared comment still says a base Spy reveals the kit or shows `?`: the Step 1 grep prints nothing in Step 4.
- `pnpm verify` green: Step 6.

**Decisions:**
- **Fix beyond the brief's file list.** Also fix `visibility.ts`, the two `table-helpers` docs, the `table-helpers-kit.test.ts` header, the `opponent-zone.tsx` header and prop doc, and the `collectLiveResourceSnaps` doc. The Acceptance grep covers every client and shared comment, and those lines say the same pre-69 thing.
- **More fixes in `state-view.ts`.** Also drop "card count" from the header's `Public:` line, because the same block says hand count is private (ruling 2026-07-30). Also fix the `spied?` field doc, which omitted spectator vision. These are comments in the blocks this task owns.
- **Protocol row 67.** Row 67 gets the same fix as row 68: kit and hand need Spy+ since Lot 69.
- **Classification row.** The row at line 50 gets the new title, so the classification still names an existing `it()`. Its owner lot and class do not change.
- **No server edits.** Server comments with the pre-69 wording are left alone, even comment-only (`visibility-matrix.ts` `grantSpy`). V7 changes no server file, and spec v7 §14.1 tracks that cleanup.
- **No `decisions.md` entry.** The change records no ruling and retires no test.

---

### Task L73-02: Add seats() visibility tiers and seat anatomy

**Files:**
- Create:
  - `apps/client/src/view-model/seats.ts`.
  - `apps/client/src/view-model/test-fixtures.ts`.
- Test: `apps/client/src/view-model/seats.test.ts`.
- Modify: `docs/agent/testing.md` (new section), `docs/agent/frontend.md` (View-model layer section), `docs/agent/decisions.md` (one appended entry), `docs/backlog_v7.md` (L73-02 row, Progress table).

**Interfaces:**
- Consumes:
  - From `@card-battle/shared`: the types `PlayingStateView`, `PublicPlayerView`, `PendingSentenceView`, `PersistentEffectView`, `CardInstance`, `KitId`, `BotDifficulty`, `LogResourceKind`, and the constant `LOG_RESOURCE_KINDS`.
  - `seatIndexOf` from `../ui/seat-colors`.
  - `avatarInitial` from `../ui/primitives/avatar-initial`.
  - `connectionBadgeLabel` from `../ui/seat/connection-badge-label`.
  - `visibleKitId` and `hasFullSpyCardReveal` from `./table-helpers`.
  - `opponentResourceDisplay` from `./opponent-seat-resources`.
  - Fixture types from `@card-battle/shared`: `CardId`, `PrivateSelfView`, `PendingEffectView`, `EliminationRevealView`.
- Produces from `test-fixtures.ts`: exactly the contract's `makeCard`, `makePlayer`, `makeSelf`, `makePlayingView`, `makePending` and `makePersistent`, with the contract defaults. It adds one builder:
  ```ts
  /** Death freeze (Lot 19): Kamikaze, no cards, every token 0, shield not upgraded, turn 1. */
  export function makeEliminationReveal(overrides?: Partial<EliminationRevealView>): EliminationRevealView;
  ```
- Produces from `seats.ts`:
  ```ts
  export type SeatTier = 'unspied' | 'base-spy' | 'spy-plus' | 'eliminated';
  export type PovMode = 'seated' | 'reanimating' | 'watching' | 'walk-in-fogged';
  export interface SeatResource { kind: LogResourceKind; value: number | '?' }
  export const SEAT_BADGE_KINDS = [
    'spying-on-you', 'block', 'invisibility', 'sentence', 'shield',
    'persistent', 'duplication', 'draw-gain', 'reanimation', 'absorb-window',
  ] as const;
  export type SeatBadgeKind = (typeof SEAT_BADGE_KINDS)[number];
  export const SEAT_VISIBLE_BADGE_COUNT = 2;
  export type SeatBadge =
    | { kind: 'spying-on-you' }
    | { kind: 'block'; turnsRemaining: number }            // 0 = attack ban only (last chain turn, L25-01)
    | { kind: 'invisibility'; effect: PersistentEffectView } // turns left = effect.counter (L58-06)
    | { kind: 'sentence'; sentence: PendingSentenceView }   // remaining owner turns, not card lives
    | { kind: 'shield'; isUpgraded: boolean }               // presence + tier only (PROTOCOL 20)
    | { kind: 'persistent'; effect: PersistentEffectView }  // card lives = effect.counter (L56-06)
    | { kind: 'duplication' }                               // Spy-gated duplicationActive
    | { kind: 'draw-gain'; amount: number }                 // Spy-gated Gambler drawGain (Q47)
    | { kind: 'reanimation'; isUpgraded: boolean }          // eliminated seats only
    | { kind: 'absorb-window' };                            // eliminated seats only
  export type SeatAvatar = { kind: 'kit'; kitId: KitId } | { kind: 'initial'; initial: string };
  export interface SeatReveal {
    mode: 'spy' | 'elimination';             // same values as V2 OpponentRevealDialog `mode`
    hand: readonly CardInstance[];
    specialCards: readonly CardInstance[];
  }
  export interface SeatModel {
    playerId: string;
    nickname: string;
    seatColorIndex: number;                  // seatColorIndexOf(view, id)
    tier: SeatTier;
    avatar: SeatAvatar;
    kitHidden: boolean;                      // tier 'unspied' or 'base-spy' (§6.3, Q66)
    resources: readonly SeatResource[];      // always 4, LOG_RESOURCE_KINDS order
    badges: readonly SeatBadge[];            // all, SEAT_BADGE_KINDS order
    badgeOverflow: number;                   // max(0, badges.length − SEAT_VISIBLE_BADGE_COUNT): the "+n"
    isActive: boolean;                       // currentTurnPlayerId === playerId
    isEliminated: boolean;                   // tier === 'eliminated'
    botDifficulty: BotDifficulty | null;     // null: human, eliminated seat, or tutorial
    connectionLabel: string | null;          // connectionLabel(player)
    reveal: SeatReveal | null;               // Spy+ live, or death-frozen, hand and specials
  }
  export interface SeatList { pov: PovMode; seats: readonly SeatModel[] }
  export function povModeOf(view: PlayingStateView): PovMode;
  export function seatList(view: PlayingStateView): SeatList;
  /** Seat colour (L39-03): `seatIndexOf` (the `view.players` position), else that position past the palette, else 0. */
  export function seatColorIndexOf(view: PlayingStateView, playerId: string): number;
  /** Connection badge text (`connectionBadgeLabel`, L10-04), or null when connected or eliminated. */
  export function connectionLabel(player: PublicPlayerView): string | null;
  ```
  - L73-04 uses `seatColorIndexOf` for arrow colours. L73-09 uses `povModeOf`, `connectionLabel` and `seatColorIndexOf` for the self strip, so seats, arrows and strip share one rule each.
  - The card-lives, turns and Sentence thumb badge kinds are L73-07's `ThumbBadge` (`inPlayThumbs`). Seats carry the raw `effect` and `sentence`, so L74 builds the L73-07 `InPlayCardRef` (`zone: 'active' | 'shield' | 'sentence'`, `ownerPlayerId: seat.playerId`) straight from a badge.

- [ ] **Step 1: Write the failing tests.**
  - Create `test-fixtures.ts`. The defaults follow the contract and every builder spreads `overrides` last:
    ```ts
    export function makeCard(cardId: CardId, overrides?: Partial<CardInstance>): CardInstance {
      return { instanceId: `${cardId}-1`, cardId, isUpgraded: false, ...overrides };
    }
    export function makePlayer(id: string, overrides?: Partial<PublicPlayerView>): PublicPlayerView {
      return {
        id, nickname: id, isEliminated: false, isYou: false, isBot: false,
        connection: { status: 'connected', disconnectedAt: null, automaticTurnsTaken: 0, consecutiveTimeouts: 0 },
        activePersistentEffects: [], activeShield: null, blockTurnsRemaining: 0, blockAttacksForbidden: false,
        activeAttackBlock: null, duplicationActive: false, pendingReanimation: null, absorbWindowOpen: false,
        ...overrides,
      };
    }
    export function makeSelf(overrides?: Partial<PrivateSelfView>): PrivateSelfView {
      return { kitId: 'kamikaze', lives: 10, shield: 0, shieldIsUpgraded: false, points: 0, upgradePoints: 0,
        hand: [], specialCards: [], activePersistentEffects: [], attackBlockCharges: 0, ...overrides };
    }
    export function makePlayingView(overrides?: Partial<PlayingStateView>): PlayingStateView {
      return {
        phase: 'playing', you: 'me', gameCode: 'TEST', currentTurnPlayerId: 'me', turnSequence: 1,
        turnOrder: ['me', 'p1', 'p2'], turnDeadlineMs: null,
        players: [makePlayer('me', { isYou: true }), makePlayer('p1'), makePlayer('p2')],
        self: makeSelf(), pendingEffects: [], actionLog: [], pool: [], poolBuyCost: 1, pendingSentences: [],
        playKind: 'classic', tutorialIndex: null, ...overrides,
      };
    }
    export function makePending(
      input: Pick<PendingEffectView, 'id' | 'sourcePlayerId' | 'targetPlayerId' | 'cardId'> & Partial<PendingEffectView>,
    ): PendingEffectView {
      return { isUpgraded: false, queuedAt: 1, damageMultiplier: 1, redirectedBy: null, ...input };
    }
    export function makePersistent(
      input: Pick<PersistentEffectView, 'id' | 'cardId'> & Partial<PersistentEffectView>,
    ): PersistentEffectView {
      return { isUpgraded: false, counter: null, targetPlayerId: null, ...input };
    }
    export function makeEliminationReveal(overrides?: Partial<EliminationRevealView>): EliminationRevealView {
      return { kitId: 'kamikaze', hand: [], specialCards: [], lives: 0, points: 0, upgradePoints: 0, shield: 0,
        shieldIsUpgraded: false, turnSequence: 1, ...overrides };
    }
    ```
    The module header says it is imported by tests only and cites the Lot 73 contract.
  - Create `seats.test.ts`. Its header cites spec v7 §6.2, §6.3, §6.12, §11 and §12.2. Shared setup:
    ```ts
    import type { PlayingStateView, PublicConnectionView, SpiedPlayerView } from '@card-battle/shared';
    import { describe, expect, expectTypeOf, it } from 'vitest';

    import {
      SEAT_BADGE_KINDS, SEAT_VISIBLE_BADGE_COUNT, connectionLabel, povModeOf, seatColorIndexOf, seatList,
      type SeatBadge, type SeatBadgeKind, type SeatModel,
    } from './seats';
    import { makeCard, makeEliminationReveal, makePersistent, makePlayer, makePlayingView } from './test-fixtures';

    /** What the server sends for Spy+ and spectator vision (`buildSpiedView`, Lot 69). */
    const FULL_VISION: SpiedPlayerView = {
      kitId: 'assassin', hand: [makeCard('basic-attack')], specialCards: [makeCard('mega-attack')],
      lives: 9, points: 4, upgradePoints: 1, shield: 3,
    };
    const ME = makePlayer('me', { isYou: true });

    function seatOf(view: PlayingStateView, playerId: string): SeatModel {
      const seat = seatList(view).seats.find((entry) => entry.playerId === playerId);
      if (seat === undefined) throw new Error(`no seat for ${playerId}`);
      return seat;
    }
    const valuesOf = (seat: SeatModel): (number | '?')[] => seat.resources.map((resource) => resource.value);
    const kindsOf = (seat: SeatModel): string[] => seat.badges.map((badge) => badge.kind);
    const connection = (partial: Partial<PublicConnectionView>): PublicConnectionView => ({
      status: 'connected', disconnectedAt: null, automaticTurnsTaken: 0, consecutiveTimeouts: 0, ...partial,
    });
    ```
  - `describe('seatList visibility tiers (technical spec v7 §6.3, one test per tier)')`:
    1. `it('unspied living opponent: public statuses only, every resource ?, kit hidden')`. The fixture:
       - `p1` has nickname `'Zed'`, `spyingOnYou: true`, `blockTurnsRemaining: 2`, `activeShield: { isUpgraded: true }`, `activePersistentEffects: [poison]` with `poison = makePersistent({ id: 'poison-1', cardId: 'poison', counter: 2 })`, and `activeAttackBlock: true`.
       - `pendingSentences: [{ id: 'sentence-1', sourcePlayerId: 'p1', remainingOwnerTurns: 2, isUpgraded: false }]`.

       The expectations:
       ```ts
       expect(seat.tier).toBe('unspied');
       expect(seat.kitHidden).toBe(true);
       expect(seat.avatar).toEqual({ kind: 'initial', initial: 'Z' });
       expect(seat.resources.map((r) => r.kind)).toEqual(['life', 'point', 'upgradePoint', 'shield']);
       expect(valuesOf(seat)).toEqual(['?', '?', '?', '?']);
       expect(seat.reveal).toBeNull();
       expect(seat.badges).toEqual([
         { kind: 'spying-on-you' },
         { kind: 'block', turnsRemaining: 2 },
         { kind: 'sentence', sentence: { id: 'sentence-1', sourcePlayerId: 'p1', remainingOwnerTurns: 2, isUpgraded: false } },
         { kind: 'shield', isUpgraded: true },          // presence and tier, never the value
         { kind: 'persistent', effect: poison },        // card lives 2 stay public (L56-06)
       ]);                                              // activeAttackBlock renders nothing (Q36)
       expect(seat.badgeOverflow).toBe(3);
       ```
    2. `it('base Spy: live lives, points, upgrade points and shield; kit, hand and specials hidden (Lot 69)')`. The fixture: `p1` has `spied: { lives: 7, points: 3, upgradePoints: 1, shield: 2 }` and `duplicationActive: true`; `p2` has `spied: { lives: 1, points: 0, upgradePoints: 0, shield: 0 }` and `drawGain: 14`. The expectations:
       ```ts
       const p1 = seatOf(view, 'p1');
       expect(p1.tier).toBe('base-spy');
       expect(p1.kitHidden).toBe(true);
       expect(p1.avatar).toEqual({ kind: 'initial', initial: 'P' });
       expect(valuesOf(p1)).toEqual([7, 3, 1, 2]);
       expect(p1.reveal).toBeNull();
       expect(p1.badges).toEqual([{ kind: 'duplication' }]);
       expect(seatOf(view, 'p2').badges).toEqual([{ kind: 'draw-gain', amount: 14 }]);
       ```
    3. `it('Spy+: kit portrait, live resources, hand and specials')`. The fixture: `p1` has `spied: FULL_VISION`. The expectations:
       ```ts
       expect(seat.tier).toBe('spy-plus');
       expect(seat.kitHidden).toBe(false);
       expect(seat.avatar).toEqual({ kind: 'kit', kitId: 'assassin' });
       expect(valuesOf(seat)).toEqual([9, 4, 1, 3]);
       expect(seat.reveal).toEqual({ mode: 'spy', hand: [makeCard('basic-attack')], specialCards: [makeCard('mega-attack')] });
       ```
    4. `it('eliminated: frozen kit, cards and tokens; only Reanimation and the absorb window; no connection, eye or bot label')`. The fixture `p1`:
       - `isEliminated: true`;
       - `eliminationReveal: makeEliminationReveal({ kitId: 'ghost', hand: [makeCard('thief')], points: 5, shield: 2 })`;
       - `pendingReanimation: { isUpgraded: true }` and `absorbWindowOpen: true`;
       - `isBot: true` and `botDifficulty: 'hard'`;
       - `connection: connection({ status: 'absent', disconnectedAt: 5, automaticTurnsTaken: 2 })`;
       - `spyingOnYou: true`, `blockTurnsRemaining: 1` and `activeShield: { isUpgraded: false }`.

       The expectations:
       ```ts
       expect(seat.tier).toBe('eliminated');
       expect(seat.isEliminated).toBe(true);
       expect(seat.kitHidden).toBe(false);
       expect(seat.avatar).toEqual({ kind: 'kit', kitId: 'ghost' });
       expect(valuesOf(seat)).toEqual([0, 5, 0, 2]);
       expect(seat.reveal).toEqual({ mode: 'elimination', hand: [makeCard('thief')], specialCards: [] });
       expect(seat.badges).toEqual([{ kind: 'reanimation', isUpgraded: true }, { kind: 'absorb-window' }]);
       expect(seat.connectionLabel).toBeNull();
       expect(seat.botDifficulty).toBeNull();
       ```
    5. `it('spectator overlay: a walk-in after Stay watches every seat at Spy+ (L57-16)')`. The fixture: `you: 'watcher'`, `isSpectator: true`, `currentTurnPlayerId: 'p0'`, `turnOrder: ['p0', 'p1', 'p2']`, and `players: ['p0', 'p1', 'p2'].map((id) => makePlayer(id, { spied: FULL_VISION }))`. The expectations:
       ```ts
       const list = seatList(view);
       expect(list.pov).toBe('watching');
       expect(list.seats.map((seat) => seat.playerId)).toEqual(['p0', 'p1', 'p2']);
       for (const seat of list.seats) {
         expect([seat.tier, seat.kitHidden, seat.reveal?.mode]).toEqual(['spy-plus', false, 'spy']);
         expect(valuesOf(seat)).toEqual([9, 4, 1, 3]);
       }
       ```
    6. `it('spectator overlay: an eliminated POV without Reanimation watches every seat at Spy+ (§6.12)')`. The fixture: `players: [makePlayer('me', { isYou: true, isEliminated: true, eliminationReveal: makeEliminationReveal() }), makePlayer('p1', { spied: FULL_VISION }), makePlayer('p2', { spied: { ...FULL_VISION, kitId: 'gambler' } })]` and `currentTurnPlayerId: 'p1'`. The expectations:
       ```ts
       expect(seatList(view).pov).toBe('watching');
       expect(seatList(view).seats.map((s) => [s.playerId, s.tier, s.kitHidden]))
         .toEqual([['p1', 'spy-plus', false], ['p2', 'spy-plus', false]]);
       expect(seatOf(view, 'p2').avatar).toEqual({ kind: 'kit', kitId: 'gambler' });
       ```
    7. `it('an eliminated seat that also carries spectator spied shows its death reveal, not live values')`. The fixture:
       - the POV is `me`, eliminated, with no Reanimation;
       - `p1` has `isEliminated: true`, `eliminationReveal: makeEliminationReveal({ kitId: 'wizard', points: 6 })` and `spied: { kitId: 'wizard', hand: [], specialCards: [], lives: 0, points: 0, upgradePoints: 0, shield: 0 }`;
       - `p2` has `spied: FULL_VISION`.

       Expect `tier` `'eliminated'`, `valuesOf` `[0, 6, 0, 0]` and `reveal` `{ mode: 'elimination', hand: [], specialCards: [] }`.
    8. `it('never prints the dead pre-Lot-69 resourcesSnapshot (spec v7 §14.1)')`. The fixture: `p1` has `spied: { resourcesSnapshot: { lives: 12, points: 9, upgradePoints: 2, shield: 4, turnSequence: 3 } }`. Expect `tier` `'base-spy'` and `valuesOf` `['?', '?', '?', '?']`.
    9. `it('derives the tier from wire fields only: a resolved Spy in the log does not unfog a seat')`. The fixture `actionLog` holds:
       - `{ kind: 'actionPlayed', actorPlayerId: 'me', action: 'playCard', cardId: 'spy', isUpgraded: true, targetPlayerId: 'p1', turnSequence: 1 }`;
       - `{ kind: 'actionResolved', effectId: 'e-1', sourcePlayerId: 'me', targetPlayerId: 'p1', cardId: 'spy', isUpgraded: true, livesLost: 0, shieldAbsorbed: 0, outcome: 'applied', turnSequence: 2 }`.

       `p1` has no `spied`. Expect `tier` `'unspied'` and `valuesOf` `['?', '?', '?', '?']`.
  - `describe('POV mode (§6.3, §6.12)')`:
    10. `it('an eliminated POV with pendingReanimation is reanimating and keeps the seated tiers')`. The fixture: `me` has `isYou: true`, `isEliminated: true`, `eliminationReveal: makeEliminationReveal()` and `pendingReanimation: { isUpgraded: false }`; `p1` is plain; `p2` has `spied: { lives: 6, points: 2, upgradePoints: 0, shield: 0 }`. The expectations: `povModeOf(view)` and `seatList(view).pov` both equal `'reanimating'`; `p1` has tier `'unspied'` and values `['?', '?', '?', '?']`; `p2` has tier `'base-spy'`.
    11. `it('a walk-in before Stay is fogged: every seat unspied, kit hidden (L57-16)')`. The fixture: `you: 'watcher'`, `isSpectator: true`, `claimableSeats: [{ playerId: 'p1', nickname: 'p1' }]`, `currentTurnPlayerId: 'p0'`, `turnOrder: ['p0', 'p1']`, and `players: [makePlayer('p0'), makePlayer('p1', { connection: connection({ status: 'disconnected', disconnectedAt: 10 }) })]`. Expect `pov` `'walk-in-fogged'` and `seats.map((s) => [s.tier, s.kitHidden])` `[['unspied', true], ['unspied', true]]`.
    12. `it('a living seated POV is seated')`. Expect `seatList(makePlayingView()).pov` to be `'seated'`.
  - `describe('seat anatomy (§6.2)')`:
    13. `it('lists every seat but the POV, in view.players order, with its seat-colour index (L39-03)')`. The fixture: `players: [makePlayer('p1'), ME, makePlayer('p2')]` and `turnOrder: ['p1', 'me', 'p2']`. Expect `seats.map((s) => [s.playerId, s.nickname, s.seatColorIndex])` `[['p1', 'p1', 0], ['p2', 'p2', 2]]`.
    14. `it('flags only the seat whose turn it is')`. With `makePlayingView({ currentTurnPlayerId: 'p2' })`, expect `seats.map((s) => [s.playerId, s.isActive])` `[['p1', false], ['p2', true]]`.
    15. `it('shows the bot difficulty, hidden in the tutorial (L17-03)')`. The fixture: `players = [ME, makePlayer('p1', { isBot: true, botDifficulty: 'normal' }), makePlayer('p2')]`. Classic gives `['normal', null]`. With `playKind: 'tutorial'` and `tutorialIndex: 0`, it gives `[null, null]`.
    16. `it('shows the connection badge text: grace, absent N/3, idle N/5, none when connected (L10-04)')`. The fixture: `turnOrder: ['me', 'p1', 'p2', 'p3', 'p4']` and four opponents:
        - `p1` has `connection({ status: 'disconnected', disconnectedAt: 1000 })`;
        - `p2` has `connection({ status: 'absent', disconnectedAt: 1000, automaticTurnsTaken: 2 })`;
        - `p3` has `connection({ consecutiveTimeouts: 1 })`;
        - `p4` is plain.

        Expect `seats.map((s) => s.connectionLabel)` `['disconnected — grace', 'absent 2/3', 'idle timeouts 1/5', null]`. The exported helper gives the same text: `view.players.filter((p) => !p.isYou).map(connectionLabel)` equals the same list, and `connectionLabel(makePlayer('x', { isEliminated: true, connection: connection({ status: 'absent', automaticTurnsTaken: 1 }) }))` is `null` (`connectionBadgeLabel` alone would say `'eliminated'`).
    17. `it('orders every living status by SEAT_BADGE_KINDS and counts the overflow past two')`. Statuses from different kits share one seat only to pin the order. The fixture:
        - `invisibility = makePersistent({ id: 'inv-1', cardId: 'invisibility', counter: 3 })` and `curse = makePersistent({ id: 'curse-1', cardId: 'curse' })`;
        - `p1` has `activePersistentEffects: [curse, invisibility]`, `activeShield: { isUpgraded: false }`, `blockAttacksForbidden: true` (0 turns), `duplicationActive: true`, `drawGain: 12`, `spyingOnYou: true` and `spied: { lives: 3, points: 1, upgradePoints: 0, shield: 4 }`;
        - `pendingSentences` holds `{ id: 's-1', sourcePlayerId: 'p1', remainingOwnerTurns: 1, isUpgraded: true }` and `{ id: 's-2', sourcePlayerId: 'p2', remainingOwnerTurns: 3, isUpgraded: false }`.

        The expectations:
       ```ts
       expect(kindsOf(seat)).toEqual(['spying-on-you', 'block', 'invisibility', 'sentence', 'shield', 'persistent', 'duplication', 'draw-gain']);
       expect(seat.badges.slice(0, SEAT_VISIBLE_BADGE_COUNT).map((b) => b.kind)).toEqual(['spying-on-you', 'block']);
       expect(seat.badgeOverflow).toBe(6);
       expect(seat.badges[1]).toEqual({ kind: 'block', turnsRemaining: 0 });          // attack ban, last chain turn
       expect(seat.badges[2]).toEqual({ kind: 'invisibility', effect: invisibility }); // one badge, not also a persistent
       expect(seat.badges[5]).toEqual({ kind: 'persistent', effect: curse });
       expect(seatOf(view, 'p2').badges).toEqual([
         { kind: 'sentence', sentence: { id: 's-2', sourcePlayerId: 'p2', remainingOwnerTurns: 3, isUpgraded: false } },
       ]);
       ```
    18. `it('pins the badge kinds and the two visible slots (decisions.md 2026-10-27)')`:
       ```ts
       expect(SEAT_BADGE_KINDS).toEqual(['spying-on-you', 'block', 'invisibility', 'sentence', 'shield',
         'persistent', 'duplication', 'draw-gain', 'reanimation', 'absorb-window']);
       expect(SEAT_VISIBLE_BADGE_COUNT).toBe(2);
       expectTypeOf<SeatBadge['kind']>().toEqualTypeOf<SeatBadgeKind>();
       ```
    19. `it('seatColorIndexOf: the view.players position, past the palette too, else 0 (L39-03)')`. The fixture: `ids = ['me', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']` (nine seats, one past the 8-colour palette, so `seatIndexOf` returns `null` for `p8`), `players: ids.map((id) => makePlayer(id, { isYou: id === 'me' }))` and `turnOrder: ids`. Expect `seatColorIndexOf(view, 'p2')` to be `2`, `seatColorIndexOf(view, 'p8')` to be `8`, `seatColorIndexOf(view, 'nobody')` to be `0`, and `seatOf(view, 'p8').seatColorIndex` to be `8`.
- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/view-model/seats.test.ts`. Expected: the file fails to load with `Failed to resolve import "./seats"`. `test-fixtures.ts` itself type-checks: `pnpm --filter @card-battle/client typecheck` reports only the missing `./seats` module.
- [ ] **Step 3: Implement** `povModeOf`, `seatList(view: PlayingStateView): SeatList`, `seatColorIndexOf` and `connectionLabel` in `seats.ts`, with the types above. Its header cites spec v7 §6.2, §6.3 and §11, and says that values come from wire fields only.
  - **Seats.** `view.players.filter((p) => !p.isYou)` in order. A walk-in has no `isYou`, so it gets every seat.
  - **Tier.**
    - `eliminated` when `player.isEliminated || player.eliminationReveal !== undefined`;
    - else `spy-plus` when `player.spied?.kitId !== undefined`;
    - else `base-spy` when `player.spied !== undefined`;
    - else `unspied`.
  - **Avatar.** `visibleKitId(player)` gives `{ kind: 'kit', kitId }`. Otherwise `{ kind: 'initial', initial: avatarInitial(player.nickname) }`.
  - **Resources.** `opponentResourceDisplay(player)` (`eliminationReveal` wins over `spied`). Map `LOG_RESOURCE_KINDS` to `lives` / `points` / `upgradePoints` / `shield`, or `'?'` when `known` is false.
  - **Reveal.**
    - With `eliminationReveal`: `{ mode: 'elimination', hand, specialCards }` from it.
    - Else when `hasFullSpyCardReveal(player)`: the `spied` lists. Narrow `spied.hand` and `spied.specialCards` with `!== undefined`; never cast.
    - Else `null`.
  - **Badges.** Push them in `SEAT_BADGE_KINDS` order, with no sort:
    1. the eye when `spyingOnYou === true`;
    2. `block` when `blockTurnsRemaining > 0 || blockAttacksForbidden`;
    3. one `invisibility` per effect whose `cardId === 'invisibility'`;
    4. one `sentence` per `view.pendingSentences` entry with `sourcePlayerId === player.id`, in wire order;
    5. `shield` when `activeShield !== null`;
    6. one `persistent` per other effect, in wire order;
    7. `duplication` when `duplicationActive`;
    8. `draw-gain` when `drawGain !== undefined`;
    9. `reanimation` when `pendingReanimation !== null`;
    10. `absorb-window` when `absorbWindowOpen`.

    On an `eliminated` tier, keep only `reanimation` and `absorb-window`.
  - **Bot difficulty** is `null` when the tier is eliminated, when `!player.isBot`, when `botDifficulty` is undefined, or when `view.playKind === 'tutorial'`.
  - **Connection label** is `connectionLabel(player)`: `player.isEliminated ? null : connectionBadgeLabel(player)`.
  - **Seat colour** is `seatColorIndexOf(view, player.id)`: `seatIndexOf(view, playerId)`, else the player's `view.players` position (`findIndex`, when ≥ 0), else 0. The fallbacks are never reached on a real table of at most 8 seats; they keep the result a plain `number` without a cast.
  - **POV mode.** `povModeOf(view)`:
    - when `view.isSpectator === true`: `'watching'` if `view.players.some((p) => p.spied !== undefined)`, else `'walk-in-fogged'`;
    - otherwise, from `me = view.players.find((p) => p.isYou)`: `'seated'` unless `me` is eliminated; then `'reanimating'` when `me.pendingReanimation !== null`, else `'watching'`.
- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/view-model/seats.test.ts`: 19 tests pass. Also run `pnpm vitest run apps/client/src/view-model/view-model-purity.test.ts` (purity lint stays green).
- [ ] **Step 5: Docs.**
  - `docs/agent/testing.md`: insert this section after `## V7 test policy (technical spec v7 §12.1–§12.2)`, before `## Seeded randomness`. It is one paragraph, so later tasks append sentences to its end:
    ```
    ## View-model fixtures (V7 · L73-02)

    `apps/client/src/view-model/test-fixtures.ts` builds the wire views every Lot 73 test reads; tests import it and shipped code never does. `makePlayingView(overrides?)` is a Classic playing view: you `me`, game `TEST`, `me`'s turn, turn 1, turnOrder `['me', 'p1', 'p2']`, no deadline, players `me` (isYou), `p1` and `p2`, `self` from `makeSelf()`, empty queue, log, pool and Sentences, pool fee 1, no tutorial index, and no `isSpectator`, `claimableSeats` or `chatMessages`. `makePlayer(id, overrides?)` is a living, connected human with nickname = id, no actives, Shield, Block, Duplication, Reanimation or absorb window, and no `spied`, `spyingOnYou`, `eliminationReveal` or `drawGain`. `makeSelf(overrides?)` is Kamikaze with 10 lives and every other resource 0. `makeCard(cardId)` gives `${cardId}-1` base; `makePending(...)` is base, `queuedAt` 1, ×1, not redirected; `makePersistent(...)` is base with no counter or target; `makeEliminationReveal(overrides?)` is a Kamikaze death freeze with every token 0. A test that needs other seats passes `players` and `turnOrder` together; a test that changes the POV's resources sets `self` (the POV's `PublicPlayerView` carries no private values). Later tasks append builders and never change these defaults (Lot 73 plan contract).
    ```
  - `docs/agent/frontend.md`, `## View-model layer (V7 · Lot 72+)`:
    - In the first bullet, the line `the last bullet of this section.` becomes `the L72-04 bullet of this section.`, because the L73 bullets now follow that bullet.
    - In the bullet at lines 60–61, "`view-model/` imports only `@card-battle/shared` and pure `ui/*.ts` helpers (asset-lookup, structured-cost, hint-ids)", rewrap as needed and make the parenthesis `(asset-lookup, structured-cost, hint-ids, seat-colors, primitives/avatar-initial, seat/connection-badge-label)`.
    - Append after the last bullet (the one ending "`screens/table/`."):
    ```
    - **Seats (`view-model/seats.ts`, L73-02; spec v7 §6.2, §6.3):** `seatList(view)` returns the
      POV mode (`povModeOf`: `seated`, `reanimating`, `watching`, `walk-in-fogged`) and one
      `SeatModel` per seat that is not the POV's (`!isYou`; a walk-in gets every seat), in
      `view.players` order with `seatColorIndexOf` colours. The tier comes from wire fields only:
      `eliminated` (`isEliminated` or `eliminationReveal`), `spy-plus` (`spied.kitId`),
      `base-spy` (`spied` without `kitId`), else `unspied`; no log line changes it. `kitHidden`
      is true for `unspied` and `base-spy` (Q66). `resources` always holds life, point,
      upgradePoint and shield, each a number or `'?'` (`opponentResourceDisplay`; the dead
      `resourcesSnapshot` is never read). `reveal` carries Spy+ live or death-frozen hand and
      specials; opponents never get a hand count. A walk-in is `watching` once any seat carries
      `spied` (L57-16), else `walk-in-fogged`. `povModeOf`, `connectionLabel` and
      `seatColorIndexOf` are exported so the threat arrows and the self strip reuse them.
    - **Seat badges (L73-02):** every public status is one `SeatBadge`, in `SEAT_BADGE_KINDS`
      order: spying-on-you, block, invisibility, sentence, shield, persistent, duplication,
      draw-gain, reanimation, absorb-window. A seat shows the first `SEAT_VISIBLE_BADGE_COUNT`
      (2) plus `+badgeOverflow`; the seat sheet lists all. Invisibility is one badge carrying its
      effect, never also a persistent; a `block` badge with 0 turns is the last-turn attack ban.
      An eliminated seat keeps only reanimation and absorb-window, with `connectionLabel` and
      `botDifficulty` null. `activeAttackBlock` renders nothing (Q36). The bot difficulty is
      null in the tutorial. Why: `decisions.md` 2026-10-27 "V7 seat tiers and badge order".
    ```
  - `docs/agent/decisions.md`: append at the end of the file, after its final `---` line, and close the entry with its own `---`:
    ```
    ## 2026-10-27 · [P] V7 seat tiers and badge order (L73-02)

    Source: technical spec v7 §6.2 (≤ 2 status badges + "+n"), §6.3 (tiers from wire fields
    only), §11 (Q36, Q46, Q47) and the Lot 73 brief's open badge-order question.

    - **Tier.** `eliminated` when `isEliminated` or `eliminationReveal` (the server always freezes
      the reveal at death, `elimination-rewards.ts` `captureEliminationSnapshot`), else
      `spy-plus` when `spied.kitId`, else `base-spy` when `spied` is present, else `unspied`. A
      dead seat that also carries spectator `spied` shows its death reveal. `kitHidden` is true
      for `unspied` and `base-spy` (Q66).
    - **Badges.** Every public status is one badge, in `SEAT_BADGE_KINDS` order: spying-on-you,
      block, invisibility, sentence, shield, persistent, duplication, draw-gain, reanimation,
      absorb-window. Active persistents and ticking Sentences count as badges: a phone seat has
      no room for a thumbs row, and the seat sheet lists them all. Invisibility is one badge
      with its turns, never also a persistent. A Block badge with 0 turns is the last-turn
      attack ban (L25-01).
    - **Eliminated seats** keep only reanimation and absorb-window, the two statuses that exist
      only on a dead seat (§6.3). They show no connection, eye or bot label, as V2 hides them
      (`opponent-zone.tsx`). Death dumps actives and cancels the seat's Sentences
      (`cleanupEliminatedPlayer`); the frozen Shield value shows in the resource row.
    - **Not rendered:** `activeAttackBlock`, dead since Lot 68 (Q36).
    - **Walk-in.** `watching` once any seat carries `spied` (the overlay is granted, L57-16). This is
      the same test as `screens/claim-seat.ts` `walkInSeesPrivateHands`; the view-model cannot
      import `screens/`. Otherwise it is `walk-in-fogged`.

    ---
    ```
  - `docs/backlog_v7.md`: L73-02 `Done`; Progress `| 73 · View-model | 13 | 1 |` → `| 73 · View-model | 13 | 2 |` and `| **Total** | **134** | **22** |` → `| **Total** | **134** | **23** |`.
- [ ] **Step 6: Verify and commit.**
  ```sh
  pnpm verify
  git add apps/client/src/view-model/seats.ts apps/client/src/view-model/seats.test.ts \
    apps/client/src/view-model/test-fixtures.ts docs/agent/testing.md docs/agent/frontend.md \
    docs/agent/decisions.md docs/backlog_v7.md
  git commit -m "feat(view-model): add seats() tiers (L73-02)" \
    -m "Badge order and the eliminated-seat rule are planner rulings, recorded in decisions.md 2026-10-27."
  ```

**Acceptance map:**
- One test per tier, each proving the shown values and the `?`: unspied (test 1), base Spy (2), Spy+ (3), eliminated (4), spectator overlay for a walk-in after Stay (5) and for an eliminated POV without Reanimation (6).
- Reanimating and Watching POV modes: tests 10 (Reanimating), 6 and 5 (Watching); 11 and 12 cover the fogged walk-in and the seated POV.
- A base-Spied seat is `kitHidden`: test 2.
- Every output field comes from a view field: test 9 (a resolved Spy in the log does not unfog a seat) and test 8 (the dead `resourcesSnapshot` is never read).
- `pnpm verify` green: Step 6.

**Decisions:**
- **Tier eliminated.** The `eliminated` tier also triggers on `isEliminated` (the brief names only `eliminationReveal`). On the wire they always coincide, and `isEliminated` stays correct if a reveal were ever missing. `SeatModel.isEliminated` mirrors the tier.
- **Tier spy-plus.** `spy-plus` follows `spied.kitId` (brief), while `reveal` and the kit avatar follow `hasFullSpyCardReveal` / `visibleKitId`. `buildSpiedView` always sends `kitId`, `hand` and `specialCards` together, so they agree.
- **Badge order.** The order is `SEAT_BADGE_KINDS` as listed: the brief's proposed order with `draw-gain` added after `duplication`. Both are Spy-gated kit windows.
- **Thumbs.** Active persistents and Sentences are badges, not a separate thumbs row (draft question; recorded in `decisions.md`).
- **Invisibility** is one `invisibility` badge carrying the effect. It never repeats as `persistent`, because one status should not spend both visible slots.
- **Eliminated seat badges.** An eliminated seat keeps only `reanimation` and `absorb-window`; eye, Block, Invisibility, Duplication, draw-gain, Shield, persistents and Sentences are dropped.
- **Connection.** `connectionLabel(player)` wraps `connectionBadgeLabel`, the single home of that copy (L72-19), and is null on an eliminated seat, where V2 hides it. It is exported so the L73-09 strip applies the same rule.
- **Seat colour.** `seatColorIndexOf` is exported so seats, threat arrows (L73-04) and the strip (L73-09) give a seat one colour (controller ruling 2026-10-27).
- **POV mode.** `povModeOf` is exported for L73-09. A walk-in counts as overlay-granted from wire `spied` presence (L57-16), not from `claimableSeats`.
- **No hand count.** Opponents have no hand-count field anywhere in `SeatModel` (`state-view.ts` ruling 2026-07-30).
- **Thumb badge kinds** (card lives, turns, Sentence turns) are not computed here. Seats carry the raw `effect` and `sentence`, and L73-07's `ThumbBadge` helper applies to seat thumbs too.
- **Fixture builder.** `test-fixtures.ts` adds `makeEliminationReveal`, because `EliminationRevealView` has nine required fields and three tests here need one (later tasks' corpse tests can reuse it).

---

### Task L73-03: Add seats() layout modes, arc order and grid fallback

**Files:**
- Create:
  - `apps/client/src/view-model/seat-layout.ts`.
  - `apps/client/src/view-model/seat-layout.test.ts`.
- Modify:
  - `apps/client/src/view-model/seats.ts`: add `SeatsModel` and `seats()`.
  - `apps/client/src/view-model/test-fixtures.ts`: append `makeTableView`.
  - `docs/agent/frontend.md`, `docs/agent/testing.md`, `docs/agent/decisions.md` and `docs/backlog_v7.md`.

**Interfaces:**
- Consumes:
  - `viewportModeFor` and `ViewportMode` from `../ui/viewport-mode`. This is the L72 single mode rule, whose header says the L73 seat layout reuses it.
  - The `PlayingStateView` type.
  - `seatList`, `SeatList` (L73-02).
  - `makePlayer` and `makePlayingView` from `./test-fixtures`.
- Produces from `seat-layout.ts`:
  ```ts
  export type LayoutMode = ViewportMode;                    // 'portrait' | 'landscape-compact' | 'desktop'
  export interface Size { width: number; height: number }
  export interface LayoutBox { viewport: Size; arena: Size }
  export function layoutModeFor(viewport: Size): LayoutMode; // = viewportModeFor(viewport)
  export function seatOrder(view: PlayingStateView): readonly string[];
  export const SEAT_MIN_GAP_PX = 8;
  /** Seat bounding box, badge row included (§6.4). L73 starting values; L74 tunes them (§14.3). */
  export const SEAT_BOX: Readonly<Record<LayoutMode, Size>> = {
    portrait: { width: 76, height: 92 },
    'landscape-compact': { width: 76, height: 84 },
    desktop: { width: 120, height: 136 },
  };
  /** Central plate box (§6.1 item 2; desktop "larger plate", §6.4). L74 tunes them (§14.3). */
  export const PLATE_BOX: Readonly<Record<LayoutMode, Size>> = {
    portrait: { width: 120, height: 96 },
    'landscape-compact': { width: 140, height: 80 },
    desktop: { width: 220, height: 160 },
  };
  export interface SeatPlacement { playerId: string; centerX: number; centerY: number }
  export type SeatLayout =
    | { kind: 'arc'; mode: LayoutMode; placements: readonly SeatPlacement[] }
    | { kind: 'grid'; mode: LayoutMode; rows: readonly (readonly string[])[] };
  export function plateCenterFor(mode: LayoutMode, arena: Size): { centerX: number; centerY: number };
  export function layoutSeats(view: PlayingStateView, box: LayoutBox): SeatLayout;
  ```
- Produces from `seats.ts`: `export interface SeatsModel extends SeatList { layout: SeatLayout }` and `export function seats(view: PlayingStateView, layoutBox: LayoutBox): SeatsModel;` (spec v7 §4.3 name).
- Produces from `test-fixtures.ts`:
  ```ts
  /** A table of `ids` in turn order; the seat `overrides.you ?? 'me'` is the POV (isYou). L73-03. */
  export function makeTableView(ids: readonly string[], overrides?: Partial<PlayingStateView>): PlayingStateView;
  // makePlayingView({ turnOrder: [...ids], players: ids.map((id) => makePlayer(id, { isYou: id === you })), ...overrides })
  ```

- [ ] **Step 1: Write the failing tests.**
  - Append `makeTableView` to `test-fixtures.ts` as above.
  - Create `seat-layout.test.ts`. Its header cites spec v7 §6.4 (amended), §14.3 and §12.2. Setup:
    ```ts
    import { describe, expect, it } from 'vitest';

    import {
      PLATE_BOX, SEAT_BOX, SEAT_MIN_GAP_PX, layoutModeFor, layoutSeats, plateCenterFor, seatOrder,
      type LayoutBox, type SeatLayout, type SeatPlacement, type Size,
    } from './seat-layout';
    import { seats } from './seats';
    import { makeTableView } from './test-fixtures';

    const PHONE: LayoutBox = { viewport: { width: 360, height: 740 }, arena: { width: 360, height: 320 } };
    const PHONE_TALL: LayoutBox = { viewport: { width: 375, height: 812 }, arena: { width: 375, height: 360 } };
    const TABLET: LayoutBox = { viewport: { width: 768, height: 1024 }, arena: { width: 768, height: 560 } };
    const LANDSCAPE: LayoutBox = { viewport: { width: 740, height: 360 }, arena: { width: 740, height: 200 } };
    const DESKTOP: LayoutBox = { viewport: { width: 1440, height: 900 }, arena: { width: 1000, height: 600 } };

    const opponentIds = (count: number): string[] => Array.from({ length: count }, (_, i) => `p${i + 1}`);
    const seatIds = (count: number): string[] => Array.from({ length: count }, (_, i) => `p${i}`);
    /** The POV first in turn order, then `count` opponents. */
    const seated = (count: number) => makeTableView(['me', ...opponentIds(count)]);
    /** A walk-in spectator (L57-13) watching `count` seats p0…. */
    const walkIn = (count: number) => makeTableView(seatIds(count), { you: 'watcher', isSpectator: true });

    function placementsOf(layout: SeatLayout): readonly SeatPlacement[] {
      if (layout.kind !== 'arc') throw new Error(`expected an arc, got a ${layout.kind}`);
      return layout.placements;
    }
    function at<T>(list: readonly T[], index: number): T {
      const item = list[index];
      if (item === undefined) throw new Error(`no item ${index}`);
      return item;
    }
    /** 1 when the centre is on the ellipse centred on the plate that touches the arena's top and sides. */
    function ellipseResidual(p: SeatPlacement, mode: 'portrait' | 'desktop', arena: Size): number {
      const seat = SEAT_BOX[mode];
      const plate = plateCenterFor(mode, arena);
      const rx = plate.centerX - seat.width / 2;
      const ry = plate.centerY - seat.height / 2;
      return ((p.centerX - plate.centerX) / rx) ** 2 + ((p.centerY - plate.centerY) / ry) ** 2;
    }
    ```
  - `describe('layoutModeFor (technical spec v7 §6.4, amended)')`:
    1–6. One `it.each`, `'%i×%i is %s'`, over `[360, 740, 'portrait'], [375, 812, 'portrait'], [768, 1024, 'portrait'], [740, 360, 'landscape-compact'], [1440, 900, 'desktop'], [1024, 600, 'desktop']` (`as const`). Each asserts `layoutModeFor({ width, height })`. The 1024×600 row proves the Review line supersedes the brief's "≥ 700" rule.
  - `describe('seatOrder (§6.4: the next player first, clockwise)')`:
    7. `it('2 seats: the one opponent')`: `seatOrder(makeTableView(['p1', 'me']))` equals `['p1']`.
    8. `it('4 seats: turnOrder rotated to start after the POV')`: `seatOrder(makeTableView(['p1', 'p2', 'me', 'p3']))` equals `['p3', 'p1', 'p2']`.
    9. `it('8 seats: turnOrder rotated to start after the POV')`: `seatOrder(makeTableView(['p1', 'p2', 'p3', 'me', 'p4', 'p5', 'p6', 'p7']))` equals `['p4', 'p5', 'p6', 'p7', 'p1', 'p2', 'p3']`.
    10. `it('a walk-in has no anchor: every seat, from turnOrder[0]')`: `seatOrder(walkIn(8))` equals `seatIds(8)`.
  - `describe('arc placement (§6.4)')`:
    11. `it('2 seats in portrait: the opponent sits at the top of the arc, above the plate')`:
       ```ts
       const layout = layoutSeats(seated(1), PHONE);
       expect(layout.mode).toBe('portrait');
       const p1 = at(placementsOf(layout), 0);
       expect(p1.playerId).toBe('p1');
       expect(p1.centerX).toBeCloseTo(PHONE.arena.width / 2, 6);
       expect(p1.centerY).toBeCloseTo(SEAT_BOX.portrait.height / 2, 6);
       expect(plateCenterFor('portrait', PHONE.arena)).toEqual({ centerX: 180, centerY: PHONE.arena.height - PLATE_BOX.portrait.height / 2 });
       ```
    12. `it('portrait, 4 opponents: next player first, left to right over the plate, on one ellipse')`. `layout = layoutSeats(seated(4), PHONE)`; `placements = placementsOf(layout)`. Expect:
        - ids equal `opponentIds(4)`;
        - each `ellipseResidual(p, 'portrait', PHONE.arena)` is `toBeCloseTo(1, 6)`;
        - `centerX` strictly ascending;
        - mirror pairs: `at(placements, 0).centerX + at(placements, 3).centerX` and `p1.x + p2.x` are both close to 360, and `p0.y ≈ p3.y`, `p1.y ≈ p2.y`;
        - the inner seats are higher (`at(placements, 1).centerY < at(placements, 0).centerY`);
        - every `centerY < plateCenterFor('portrait', PHONE.arena).centerY`.
    13. `it('desktop 1440×900: the full ellipse around the plate, the POV keeps the bottom slot')`. `placements = placementsOf(layoutSeats(seated(7), DESKTOP))`; `plate = plateCenterFor('desktop', DESKTOP.arena)`. Expect:
        - `plate` equals `{ centerX: 500, centerY: 300 }`;
        - ids equal `opponentIds(7)`;
        - every residual is close to 1;
        - `first = at(placements, 0)` has `centerX < 500` and `centerY > 300` (clockwise from the bottom);
        - `last = at(placements, 6)` has `centerX > 500` and `centerY > 300`;
        - `at(placements, 3)` is close to `(500, SEAT_BOX.desktop.height / 2)`;
        - `Math.max(...placements.map((p) => p.centerY))` is less than `DESKTOP.arena.height - SEAT_BOX.desktop.height / 2` (nobody in the bottom slot).
    14. `it('landscape-compact 740×360: one top band of equal columns, no ellipse')`:
       ```ts
       const layout = layoutSeats(seated(4), LANDSCAPE);
       const y = SEAT_BOX['landscape-compact'].height / 2;
       expect(layout).toEqual({ kind: 'arc', mode: 'landscape-compact', placements: [
         { playerId: 'p1', centerX: 92.5, centerY: y }, { playerId: 'p2', centerX: 277.5, centerY: y },
         { playerId: 'p3', centerX: 462.5, centerY: y }, { playerId: 'p4', centerX: 647.5, centerY: y },
       ] });
       ```
    15. `it('a walk-in on desktop: 8 seats around the whole ellipse from turnOrder[0], none reserved')`. `placements = placementsOf(layoutSeats(walkIn(8), DESKTOP))`. Expect:
        - ids equal `seatIds(8)`;
        - every residual is close to 1;
        - `p0.centerX + p7.centerX` is close to 1000 and `p0.centerY ≈ p7.centerY` (a mirror pair around the bottom);
        - `p0.centerY > 300`.
    16. `it('a walk-in in portrait: every seat on the upper arc from turnOrder[0]')`. `placements = placementsOf(layoutSeats(walkIn(3), PHONE))`. Expect:
        - ids `['p0', 'p1', 'p2']`;
        - residuals close to 1;
        - x ascending;
        - `at(placements, 1)` close to `(180, SEAT_BOX.portrait.height / 2)`.
  - `describe('grid fallback (§6.4)')`:
    17. `it('7 opponents in a 360×740 portrait box fall back to 4 + 3 in turn order')`: `layoutSeats(seated(7), PHONE)` equals `{ kind: 'grid', mode: 'portrait', rows: [['p1', 'p2', 'p3', 'p4'], ['p5', 'p6', 'p7']] }`.
    18. `it('an 8-seat spectator view falls back to 4 + 4')`: `layoutSeats(walkIn(8), PHONE)` equals `{ kind: 'grid', mode: 'portrait', rows: [['p0', 'p1', 'p2', 'p3'], ['p4', 'p5', 'p6', 'p7']] }`.
    19. `it('the same 7 opponents stay on the arc at 1440×900')`: `layoutSeats(seated(7), DESKTOP).kind` is `'arc'`.
    20. `it('an arena smaller than one seat (a 0×0 first paint) uses the grid')`. `layoutSeats(seated(2), { viewport: PHONE.viewport, arena: { width: 0, height: 0 } })` equals `{ kind: 'grid', mode: 'portrait', rows: [['p1'], ['p2']] }`.
    21. `it('never leaves two arc seats closer than the gap, in any mode')`:
       ```ts
       expect(SEAT_MIN_GAP_PX).toBe(8);
       let arcs = 0;
       for (const box of [PHONE, PHONE_TALL, TABLET, LANDSCAPE, DESKTOP]) {
         for (const view of [...[1, 2, 3, 4, 5, 6, 7].map(seated), walkIn(8)]) {
           const layout = layoutSeats(view, box);
           const order = seatOrder(view);
           if (layout.kind === 'grid') {
             expect(layout.rows.flat()).toEqual(order);
             expect(layout.rows.map((row) => row.length))
               .toEqual([Math.ceil(order.length / 2), Math.floor(order.length / 2)].filter((n) => n > 0));
             continue;
           }
           arcs += 1;
           const seat = SEAT_BOX[layout.mode];
           layout.placements.forEach((a, i) => {
             for (const b of layout.placements.slice(i + 1)) {
               const gap = Math.max(Math.abs(a.centerX - b.centerX) - seat.width, Math.abs(a.centerY - b.centerY) - seat.height);
               expect(gap).toBeGreaterThanOrEqual(SEAT_MIN_GAP_PX);
             }
           });
         }
       }
       expect(arcs).toBeGreaterThan(20); // 33 with the L73 constants; guards against a vacuous loop
       ```
  - `describe('seats() (§4.3)')`:
    22. `it('returns the seat list plus its layout; 8 seats in a 360×740 box keep all four resources')`. `view = seated(7)` and `model = seats(view, PHONE)`. Expect:
        - `model.pov` is `'seated'`;
        - `model.seats.map((s) => s.playerId)` equals `opponentIds(7)`;
        - `model.layout` equals `layoutSeats(view, PHONE)`;
        - every seat's `resources.map((r) => r.kind)` equals `['life', 'point', 'upgradePoint', 'shield']`.
- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/view-model/seat-layout.test.ts`. Expected: `Failed to resolve import "./seat-layout"`. `seats.test.ts` still passes (19), since `makeTableView` only appends.
- [ ] **Step 3: Implement.** `seat-layout.ts` header cites spec v7 §6.4, §14.3 and `ui/viewport-mode.ts`.
  - `layoutModeFor` returns `viewportModeFor(viewport)`.
  - `seatOrder(view)`:
    - when `view.isSpectator === true`: `[...view.turnOrder]`;
    - otherwise, with `i = turnOrder.indexOf(view.you)`: `[...turnOrder.slice(i + 1), ...turnOrder.slice(0, Math.max(i, 0))]`.
  - `plateCenterFor`:

    | Mode | `centerX` | `centerY` |
    |---|---|---|
    | portrait | `W/2` | `H − PLATE_BOX.portrait.height/2` (on the arena's bottom edge) |
    | desktop | `W/2` | `H/2` |
    | landscape-compact | `W/2` | `(H + SEAT_BOX['landscape-compact'].height) / 2` (centred below the band) |

  - The algorithm:
  ```ts
  // order = seatOrder(view); n = order.length; mode = layoutModeFor(box.viewport); seat = SEAT_BOX[mode]
  // if (box.arena.width < seat.width || box.arena.height < seat.height) → grid
  // landscape-compact band: centerX = W * (k + 0.5) / n, centerY = seat.height / 2
  // portrait / desktop ellipse, centre (cx, cy) = plateCenterFor(mode, arena):
  //   rx = cx - seat.width / 2;  ry = cy - seat.height / 2
  //   θk (degrees) = mode === 'portrait'   ? 180 - (k + 0.5) * 180 / n          // upper half, left → right
  //                : view.isSpectator      ? 270 - (k + 0.5) * 360 / n          // walk-in: n slots, none reserved
  //                :                         270 - (k + 1) * 360 / (n + 1)      // slot 0 (bottom, 270°) is the POV
  //   centerX = cx + rx * cos θk;  centerY = cy - ry * sin θk                   // screen y grows down: falling θ is clockwise
  // tooClose(a, b) = Math.max(|a.x - b.x| - seat.width, |a.y - b.y| - seat.height) < SEAT_MIN_GAP_PX
  // any pair tooClose → grid, else { kind: 'arc', mode, placements } (n = 0 → arc with no placements)
  // grid rows = [order.slice(0, ceil(n/2)), order.slice(ceil(n/2))].filter((row) => row.length > 0)
  ```
  - `seats.ts`: `seats(view, layoutBox)` returns `{ ...seatList(view), layout: layoutSeats(view, layoutBox) }`. `SeatsModel.seats` stays in `view.players` order (contract); the layout carries the seat order.
- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/view-model/seat-layout.test.ts apps/client/src/view-model/seats.test.ts apps/client/src/ui/viewport-mode.test.ts`: 22, 19 and 11 tests pass.
- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, `## View-model layer`:
    - Append `, viewport-mode` inside the helper parenthesis that L73-02 extended.
    - After the L73-02 "Seat badges" bullet, append:
    ```
    - **Seat layout (`view-model/seat-layout.ts`, L73-03; spec v7 §6.4):** `seats(view, layoutBox)`
      is `seatList(view)` plus `layout`. `layoutModeFor(layoutBox.viewport)` is
      `ui/viewport-mode.ts` `viewportModeFor`. `seatOrder` rotates `turnOrder` so the player
      after the POV comes first; a walk-in keeps `turnOrder` from `turnOrder[0]`. Portrait: seat
      centres on the upper half of the ellipse centred on the plate (`plateCenterFor`: on the
      arena's bottom edge) that touches the arena's top and sides, n equal sectors from the
      left. Desktop: the full ellipse around the arena centre, the bottom slot left to the POV
      (a walk-in uses all n slots). Landscape-compact: one top band of n equal columns, reported
      as `kind: 'arc'`. Grid fallback when two seat boxes (`SEAT_BOX[mode]`, badge row included)
      are under `SEAT_MIN_GAP_PX` (8) apart on both axes, or the arena cannot hold one seat:
      `ceil(n/2)` over `floor(n/2)` in seat order. `SEAT_BOX`, `PLATE_BOX` and the gap are L74
      playtest values (§14.3); retuning them updates `seat-layout.test.ts`.
    ```
  - `docs/agent/testing.md`: append to the end of the `## View-model fixtures (V7 · L73-02)` paragraph: `` L73-03 adds `makeTableView(ids, overrides?)`: one `makePlayer` per id in turn order, with `isYou` on `overrides.you ?? 'me'` (pass `{ you: 'watcher', isSpectator: true }` for a walk-in).``
  - `docs/agent/decisions.md`: append at the end of the file, after the L73-02 entry's closing `---`, and close the entry with its own `---`:
    ```
    ## 2026-10-27 · [P] V7 seat layout geometry (L73-03)

    Source: technical spec v7 §6.4 (amended modes, arc, grid), §14.3 (values tuned in the L74
    playtest) and the Lot 73 brief's open walk-in question.

    - **Mode** is `ui/viewport-mode.ts` `viewportModeFor`: one rule for sheets, Carousel and seats.
    - **Portrait arc.** The plate sits centred on the arena's bottom edge. Seat centres lie on the
      ellipse centred on the plate that touches the arena's top and sides: n equal sectors over
      the upper half, centres at half steps, the first seat on the left (clockwise from the
      POV at the bottom).
    - **Desktop arc** uses the full ellipse around the arena centre: n + 1 equal slots from the
      bottom, with slot 0 left to the POV.
    - **Walk-in** (no anchor): seat order is `turnOrder` from `turnOrder[0]`. Desktop spreads n
      slots around the full ellipse, half a step from the bottom. Portrait keeps the upper half,
      because the bottom of a portrait arena sits on the self-strip region.
    - **Landscape-compact:** one top band of n equal columns, no ellipse, reported as an `arc`
      (the layout union has no third kind).
    - **Gap test:** two seat boxes are too close when they are under `SEAT_MIN_GAP_PX` apart on
      both axes; 8 px or more on either axis separates them. An arena smaller than one seat
      box (a 0×0 first paint) uses the grid. Grid rows are ceil(n/2) over floor(n/2) in seat
      order; an empty second row is dropped.
    - `SEAT_BOX` (portrait 76×92, landscape-compact 76×84, desktop 120×136), `PLATE_BOX` and the
      gap are L73 starting values. L74 tunes them and updates the L73 tests that pin the
      360-wide grid switch.

    ---
    ```
  - `docs/backlog_v7.md`: L73-03 `Done`; Progress `| 73 · View-model | 13 | 2 |` → `| 73 · View-model | 13 | 3 |` and `| **Total** | **134** | **23** |` → `| **Total** | **134** | **24** |`.
- [ ] **Step 6: Verify and commit.**
  ```sh
  pnpm verify
  git add apps/client/src/view-model/seat-layout.ts apps/client/src/view-model/seat-layout.test.ts \
    apps/client/src/view-model/seats.ts apps/client/src/view-model/test-fixtures.ts \
    docs/agent/frontend.md docs/agent/testing.md docs/agent/decisions.md docs/backlog_v7.md
  git commit -m "feat(view-model): add seat layout modes (L73-03)" \
    -m "Arc geometry, the walk-in arc and the gap test are planner rulings, recorded in decisions.md 2026-10-27."
  ```

**Acceptance map:**
- 360×740, 375×812 and 768×1024 portrait, 740×360 landscape-compact, 1440×900 desktop: tests 1–6.
- Seat order for 2, 4 and 8 seats, next player first; a walk-in has no anchor: tests 7–10.
- Grid when arc seats would sit under 8 px apart: 4 + 3 for 7 opponents (test 17), 4 + 4 for an 8-seat spectator view (test 18).
- No two arc seats closer than the gap: test 21.
- `pnpm verify` green: Step 6.

**Decisions:**
- **Layout mode.** `LayoutMode` aliases `ViewportMode`, and `layoutModeFor` delegates to `viewportModeFor`. L72 already owns that rule, and its header says seats reuse it so the modes cannot drift. The names and shape match the contract.
- **Geometry.** Portrait uses the upper half with the plate on the arena's bottom edge. Desktop uses the full ellipse with the POV's bottom slot reserved. A walk-in gets n slots on desktop and the upper half in portrait. Landscape-compact is a top band. This answers the brief's open question and the spec's "desktop: full ellipse".
- **Walk-in order.** `seatOrder` and the anchor both read `view.isSpectator`. A seated POV missing from `turnOrder`, which the server never sends, falls back to `turnOrder` unrotated.
- **Gap test.** "Under 8 px apart" means under 8 px on both axes (an axis gutter, as CSS gaps work). An arena smaller than one seat box uses the grid, so no radius goes negative.
- **Grid rows.** They follow seat order. An empty second row is dropped (one seat gives `[['p1']]`), and n = 0 gives an arc with no placements.
- **Landscape band.** It is reported as `kind: 'arc'`, because the contract union has only arc and grid.
- **Exports.** `plateCenterFor`, `SEAT_BOX`, `PLATE_BOX` and `layoutSeats` are exported additions. L74 places the plate from the same function. `SeatsModel.seats` keeps `view.players` order.
- **Test boxes.** The arena sizes are fixed above (phone 360×320, tall phone 375×360, tablet 768×560, landscape 740×200, desktop 1000×600). Tests express coordinates relative to `SEAT_BOX` and `PLATE_BOX` where the result is exact. The two grid-switch tests (17, 18) pin the L73 values; with them, 4 opponents fit the 360-wide arc and 5 or more do not.
- **Fixture builder.** `makeTableView` is appended to `test-fixtures.ts`; the contract defaults are untouched.

---

### Task L73-04: Add threats() arrows, labels, fan-out and Mirror state

**Files:**
- Create: `apps/client/src/view-model/threats.ts`
- Test: `apps/client/src/view-model/threats.test.ts` (create)
- Modify: `docs/agent/frontend.md`, `docs/backlog_v7.md`

**Interfaces:**
- Consumes:
  - `makePending`, `makePersistent`, `makePlayer`, `makePlayingView` from `./test-fixtures` (L73-02);
  - `threatToneFor` from `./threat-tone`;
  - `seatColorIndexOf` from `./seats` (L73-02);
  - `listedAttackDamage`, `CardId`, `PendingEffectView`, `PendingEffectRedirectSource`, `PlayingStateView`, `PersistentEffectView`, `PublicPlayerView` and `SubChoiceRequiredPayload` from `@card-battle/shared`.
- Produces, all in `threats.ts`, with the contract names and shapes:
  - `ThreatRelation`, `ThreatLabel`, `ThreatEntry`, `FanOutGroup`, `ThreatsModel`, `threats`, `gridThreatEntries`, `seatThreatIds`;
  - `export type ThreatEntryTone = ReturnType<typeof threatToneFor> | 'mine'`, which is structurally `ThreatTone | 'mine'`. `ThreatEntry.tone` has this type.
  - **Added field:** `ThreatEntry.queuedAt: number`, for the "queued #N" tooltip and for ordering.
  - `ThreatEntry.mirrorBadge` has type `PendingEffectRedirectSource | null`, which is the contract's `'mirror' | 'super-mirror' | null`.
  - `FanOutGroup.key` has the format `` `${sourcePlayerId}|${queuedAt}|${cardId}` ``. `ThreatEntry.fanOutKey` holds that value or `null`.

- [ ] **Step 1: Write the failing tests** in `apps/client/src/view-model/threats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type {
  MirrorChoiceRequiredPayload,
  PendingEffectView,
  PlayingStateView,
  StealPickChoiceRequiredPayload,
  SubChoiceRequiredPayload,
} from '@card-battle/shared';

import { makePending, makePersistent, makePlayer, makePlayingView } from './test-fixtures';
import { gridThreatEntries, seatThreatIds, threats } from './threats';

const EIGHT_SEATS = ['me', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const;

function viewWith(
  pendingEffects: readonly PendingEffectView[],
  seatIds: readonly string[] = ['me', 'p1', 'p2'],
): PlayingStateView {
  return makePlayingView({
    players: seatIds.map((id) => makePlayer(id, { isYou: id === 'me' })),
    turnOrder: seatIds,
    pendingEffects,
  });
}

describe('threats() labels (spec v7 §6.5, golden rule 1)', () => {
  it('gives three Assassin attacks on the POV three entries with their own labels and no total', () => {
    const model = threats(viewWith([
      makePending({ id: 'a1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 4 }),
      makePending({ id: 'a2', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 4 }),
      makePending({ id: 'a3', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', isUpgraded: true, queuedAt: 4 }),
    ]), null);
    expect(model.entries.map((entry) => entry.effectId)).toEqual(['a1', 'a2', 'a3']);
    const labels = model.entries.map((entry) => entry.label);
    expect(labels).toEqual([
      { kind: 'damage', amount: 1 },
      { kind: 'damage', amount: 1 },
      { kind: 'damage', amount: 4 },
    ]);
    expect(labels).not.toContainEqual({ kind: 'damage', amount: 6 });
    expect(model.fanOuts).toEqual([]);
  });

  it('multiplies the listed damage by damageMultiplier', () => {
    const model = threats(viewWith([
      makePending({ id: 'm1', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'strong-attack', damageMultiplier: 2, redirectedBy: 'mirror' }),
      makePending({ id: 'm2', sourcePlayerId: 'p2', targetPlayerId: 'p1', cardId: 'super-attack', isUpgraded: true, damageMultiplier: 2, redirectedBy: 'mirror' }),
    ]), null);
    expect(model.entries.map((entry) => entry.label)).toEqual([
      { kind: 'damage', amount: 4 },
      { kind: 'damage', amount: 20 },
    ]);
  });

  it('labels a non-attack effect with its card icon', () => {
    const model = threats(viewWith([
      makePending({ id: 's1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'spy' }),
      makePending({ id: 't1', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'thief', isUpgraded: true }),
    ]), null);
    expect(model.entries.map((entry) => [entry.label, entry.isUpgraded])).toEqual([
      [{ kind: 'effect', cardId: 'spy' }, false],
      [{ kind: 'effect', cardId: 'thief' }, true],
    ]);
  });
});

describe('threats() relation and tone', () => {
  it('sets relation, tone and the source seat colour from the POV', () => {
    const model = threats(viewWith([
      makePending({ id: 'in', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'spy' }),
      makePending({ id: 'out', sourcePlayerId: 'me', targetPlayerId: 'p1', cardId: 'basic-attack' }),
      makePending({ id: 'tp-attack', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack' }),
      makePending({ id: 'tp-effect', sourcePlayerId: 'p2', targetPlayerId: 'p1', cardId: 'thief' }),
    ]), null);
    expect(
      model.entries.map(({ effectId, relation, tone, sourceSeatColorIndex }) => ({ effectId, relation, tone, sourceSeatColorIndex })),
    ).toEqual([
      { effectId: 'in', relation: 'incoming', tone: 'effect', sourceSeatColorIndex: 1 },
      { effectId: 'out', relation: 'outgoing', tone: 'mine', sourceSeatColorIndex: 0 },
      { effectId: 'tp-attack', relation: 'third-party', tone: 'attack', sourceSeatColorIndex: 1 },
      { effectId: 'tp-effect', relation: 'third-party', tone: 'effect', sourceSeatColorIndex: 2 },
    ]);
  });

  it.each(['spy', 'thief', 'card-thief', 'spy-thief', 'upgrade-point-thief', 'attack-thief'] as const)(
    'gives incoming %s the other (effect) tone (L51-07, Q61)',
    (cardId) => {
      const [entry] = threats(viewWith([makePending({ id: 'x', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId })]), null).entries;
      expect(entry).toMatchObject({ relation: 'incoming', tone: 'effect' });
    },
  );

  it.each(['sentence', 'mirror', 'super-mirror'] as const)('gives incoming %s the attack tone', (cardId) => {
    const [entry] = threats(viewWith([makePending({ id: 'x', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId })]), null).entries;
    expect(entry).toMatchObject({ relation: 'incoming', tone: 'attack' });
  });

  it('keys side-by-side arrows on source, target, queuedAt and card', () => {
    const model = threats(viewWith([
      makePending({ id: 's1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', queuedAt: 4 }),
      makePending({ id: 's2', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', queuedAt: 4 }),
      makePending({ id: 's3', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'strong-attack', queuedAt: 5 }),
      makePending({ id: 'b1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 4 }),
    ]), null);
    expect(model.entries.map((entry) => [entry.groupKey, entry.queuedAt])).toEqual([
      ['p1|me|4|strong-attack', 4],
      ['p1|me|4|strong-attack', 4],
      ['p1|me|5|strong-attack', 5],
      ['p1|me|4|basic-attack', 4],
    ]);
  });
});

describe('threats() Mirror state', () => {
  it('draws a redirected effect from the redirector with its Mirror or Super Mirror badge', () => {
    const model = threats(viewWith([
      makePending({ id: 'r1', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'basic-attack', redirectedBy: 'mirror' }),
      makePending({ id: 'r2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'strong-attack', redirectedBy: 'super-mirror', damageMultiplier: 2 }),
      makePending({ id: 'd1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' }),
    ]), null);
    expect(model.entries[0]).toMatchObject({ sourcePlayerId: 'p2', sourceSeatColorIndex: 2, relation: 'incoming', tone: 'attack', mirrorBadge: 'mirror' });
    expect(model.entries[1]).toMatchObject({ sourcePlayerId: 'p1', relation: 'third-party', mirrorBadge: 'super-mirror', label: { kind: 'damage', amount: 4 } });
    expect(model.entries[2]?.mirrorBadge).toBeNull();
  });

  it('flags Mirror-eligible ids only while a Mirror prompt is open', () => {
    const view = viewWith([
      makePending({ id: 'e1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' }),
      makePending({ id: 'e2', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'super-attack', isUpgraded: true }),
    ]);
    const mirror: MirrorChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: ['e1'], deadlineMs: 0 };
    const stealPick: StealPickChoiceRequiredPayload = { kind: 'steal-pick', victimPlayerId: 'p1', eligibleInstanceIds: ['e1'], deadlineMs: 0 };
    const flags = (subChoice: SubChoiceRequiredPayload | null): boolean[] =>
      threats(view, subChoice).entries.map((entry) => entry.mirrorEligible);
    expect(flags(mirror)).toEqual([true, false]);
    expect(flags(null)).toEqual([false, false]);
    expect(flags(stealPick)).toEqual([false, false]);
  });
});

describe('threats() fan-out', () => {
  it('makes MEGA ATTACK on 7 opponents one fan-out group with 7 target badges', () => {
    const targets = EIGHT_SEATS.filter((id) => id !== 'p1');
    const model = threats(viewWith(
      targets.map((id) => makePending({ id: `mega-${id}`, sourcePlayerId: 'p1', targetPlayerId: id, cardId: 'mega-attack', queuedAt: 3 })),
      EIGHT_SEATS,
    ), null);
    expect(model.entries).toHaveLength(7);
    expect(model.fanOuts).toEqual([{
      key: 'p1|3|mega-attack',
      sourcePlayerId: 'p1',
      cardId: 'mega-attack',
      queuedAt: 3,
      targets: targets.map((id) => ({ playerId: id, effectId: `mega-${id}`, label: { kind: 'damage', amount: 20 } })),
    }]);
    expect(model.entries.every((entry) => entry.fanOutKey === 'p1|3|mega-attack')).toBe(true);
    expect(model.entries[0]).toMatchObject({ targetPlayerId: 'me', relation: 'incoming', tone: 'attack' });
  });

  it('fans out an Assassin volley that hits every opponent, each badge keeping its own damage', () => {
    const model = threats(viewWith([
      makePending({ id: 'v1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 5 }),
      makePending({ id: 'v2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', isUpgraded: true, queuedAt: 5 }),
      makePending({ id: 'v3', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', queuedAt: 5 }),
    ]), null);
    expect(model.fanOuts.map((group) => group.key)).toEqual(['p1|5|basic-attack']);
    expect(model.fanOuts[0]?.targets).toEqual([
      { playerId: 'me', effectId: 'v1', label: { kind: 'damage', amount: 1 } },
      { playerId: 'p2', effectId: 'v2', label: { kind: 'damage', amount: 3 } },
      { playerId: 'p2', effectId: 'v3', label: { kind: 'damage', amount: 1 } },
    ]);
  });

  it('does not fan out a volley that misses a living opponent', () => {
    const model = threats(viewWith([
      makePending({ id: 'v1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack', queuedAt: 5 }),
      makePending({ id: 'v2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack', queuedAt: 5 }),
    ], ['me', 'p1', 'p2', 'p3']), null);
    expect(model.fanOuts).toEqual([]);
    expect(model.entries.map((entry) => entry.fanOutKey)).toEqual([null, null]);
  });

  it.each([
    ['a living Invisible', { activePersistentEffects: [makePersistent({ id: 'inv', cardId: 'invisibility', counter: 3 })] }],
    ['an eliminated', { isEliminated: true }],
  ] as const)('fans out a hits-all play that skips %s opponent', (_label, p3) => {
    const view = makePlayingView({
      players: [makePlayer('me', { isYou: true }), makePlayer('p1'), makePlayer('p2'), makePlayer('p3', p3)],
      turnOrder: ['me', 'p1', 'p2', 'p3'],
      pendingEffects: [
        makePending({ id: 't1', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'spy-thief', isUpgraded: true, queuedAt: 6 }),
        makePending({ id: 't2', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'spy-thief', isUpgraded: true, queuedAt: 6 }),
      ],
    });
    const model = threats(view, null);
    expect(model.fanOuts.map((group) => group.key)).toEqual(['p1|6|spy-thief']);
    expect(model.fanOuts[0]?.targets.map((target) => target.label)).toEqual([
      { kind: 'effect', cardId: 'spy-thief' },
      { kind: 'effect', cardId: 'spy-thief' },
    ]);
  });

  it('draws arrows once a fan-out no longer covers every living opponent', () => {
    // p2 has already resolved its copy on its own turn; me and p3 still wait.
    const model = threats(viewWith([
      makePending({ id: 'mega-me', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'mega-attack', queuedAt: 3 }),
      makePending({ id: 'mega-p3', sourcePlayerId: 'p1', targetPlayerId: 'p3', cardId: 'mega-attack', queuedAt: 3 }),
    ], ['me', 'p1', 'p2', 'p3']), null);
    expect(model.fanOuts).toEqual([]);
    expect(model.entries.map((entry) => [entry.fanOutKey, entry.label])).toEqual([
      [null, { kind: 'damage', amount: 20 }],
      [null, { kind: 'damage', amount: 20 }],
    ]);
  });

  it('draws a hits-all play on a 2-seat table as a plain arrow', () => {
    const model = threats(viewWith([
      makePending({ id: 'mega-me', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'mega-attack', queuedAt: 3 }),
    ], ['me', 'p1']), null);
    expect(model.fanOuts).toEqual([]);
    expect(model.entries[0]?.fanOutKey).toBeNull();
  });

  it('keeps a base Suicide self-queue out of its fan-out', () => {
    const model = threats(viewWith([
      makePending({ id: 'su-p1', sourcePlayerId: 'me', targetPlayerId: 'p1', cardId: 'suicide', queuedAt: 2 }),
      makePending({ id: 'su-p2', sourcePlayerId: 'me', targetPlayerId: 'p2', cardId: 'suicide', queuedAt: 2 }),
      makePending({ id: 'su-me', sourcePlayerId: 'me', targetPlayerId: 'me', cardId: 'suicide', queuedAt: 2 }),
    ]), null);
    expect(model.fanOuts.map((group) => group.targets.map((target) => target.effectId))).toEqual([['su-p1', 'su-p2']]);
    expect(model.entries.map((entry) => [entry.effectId, entry.relation, entry.tone, entry.fanOutKey])).toEqual([
      ['su-p1', 'outgoing', 'mine', 'me|2|suicide'],
      ['su-p2', 'outgoing', 'mine', 'me|2|suicide'],
      ['su-me', 'incoming', 'effect', null],
    ]);
  });

  it('fans out a Super Mirror redirect to every opponent and keeps each badge', () => {
    const model = threats(viewWith([
      makePending({ id: 'fx:dup:a:p1', sourcePlayerId: 'me', targetPlayerId: 'p1', cardId: 'strong-attack', queuedAt: 4, damageMultiplier: 2, redirectedBy: 'super-mirror' }),
      makePending({ id: 'fx:dup:a:p2', sourcePlayerId: 'me', targetPlayerId: 'p2', cardId: 'strong-attack', queuedAt: 4, damageMultiplier: 2, redirectedBy: 'super-mirror' }),
    ]), null);
    expect(model.fanOuts.map((group) => group.key)).toEqual(['me|4|strong-attack']);
    expect(model.entries.map((entry) => [entry.mirrorBadge, entry.tone, entry.label])).toEqual([
      ['super-mirror', 'mine', { kind: 'damage', amount: 4 }],
      ['super-mirror', 'mine', { kind: 'damage', amount: 4 }],
    ]);
  });
});

describe('gridThreatEntries and seatThreatIds', () => {
  const model = threats(viewWith([
    makePending({ id: 'a', sourcePlayerId: 'p1', targetPlayerId: 'me', cardId: 'basic-attack' }),
    makePending({ id: 'b', sourcePlayerId: 'me', targetPlayerId: 'p2', cardId: 'spy' }),
    makePending({ id: 'c', sourcePlayerId: 'p2', targetPlayerId: 'p3', cardId: 'thief' }),
    makePending({ id: 'd', sourcePlayerId: 'p3', targetPlayerId: 'p1', cardId: 'strong-attack' }),
  ], ['me', 'p1', 'p2', 'p3']), null);

  it("keeps POV arrows in grid mode and adds the tapped seat's", () => {
    const ids = (tapped: string | null): string[] => gridThreatEntries(model, 'me', tapped).map((entry) => entry.effectId);
    expect(ids(null)).toEqual(['a', 'b']);
    expect(ids('p3')).toEqual(['a', 'b', 'c', 'd']);
    expect(ids('p2')).toEqual(['a', 'b', 'c']);
  });

  it("lists a seat's incoming and outgoing ids for the tap highlight", () => {
    expect(seatThreatIds(model, 'p1')).toEqual({ incoming: ['d'], outgoing: ['a'] });
    expect(seatThreatIds(model, 'p2')).toEqual({ incoming: ['b'], outgoing: ['c'] });
  });
});
```

- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/view-model/threats.test.ts`. Expected: the suite fails to import `./threats` (Vite's `Failed to resolve import "./threats"`), so `Test Files  1 failed (1)` and no test runs.

- [ ] **Step 3: Implement** the following in `apps/client/src/view-model/threats.ts`:
  - `threats(view: PlayingStateView, subChoice: SubChoiceRequiredPayload | null): ThreatsModel`;
  - `gridThreatEntries(model: ThreatsModel, povId: string, tappedSeatId: string | null): readonly ThreatEntry[]`;
  - `seatThreatIds(model: ThreatsModel, playerId: string): { incoming: readonly string[]; outgoing: readonly string[] }`.

  Add a header doc comment that cites spec v7 §6.5, golden rule 1 (one label per pending effect, never summed) and rules spec §6.

  **Entries.** Map `view.pendingEffects` in wire order. Each entry gets:
  - `label`: `listedAttackDamage(cardId, isUpgraded, damageMultiplier)`. A number gives `{ kind: 'damage', amount }`; `null` gives `{ kind: 'effect', cardId }`.
  - `relation`: `incoming` when `targetPlayerId === view.you`. Otherwise `outgoing` when `sourcePlayerId === view.you`. Otherwise `third-party`.
  - `tone`: `'mine'` for outgoing, otherwise `threatToneFor(cardId)`.
  - `sourceSeatColorIndex`: `seatColorIndexOf(view, sourcePlayerId)` (L73-02), so an arrow and its seat share one colour.
  - `groupKey`, `queuedAt` and `mirrorBadge` (`redirectedBy`).
  - `mirrorEligible`: `subChoice?.kind === 'mirror' && subChoice.eligibleEffectIds.includes(id)`.
  - `fanOutKey`: the key of the fan-out group that holds this effect's id, else `null`.

  **Grid and seat helpers.** `gridThreatEntries` keeps the entries whose source or target is `povId`, or whose source or target is `tappedSeatId` when that is not null, in wire order. `seatThreatIds` lists the ids whose target is `playerId` (`incoming`) and the ids whose source is `playerId` (`outgoing`), in wire order.

  **Fan-out detection.** This is the non-obvious part:

```ts
/** Server `playerIsInvisible` (engine/specials/is-invisible.ts:10-12): any active Invisibility. */
function isInvisible(player: PublicPlayerView): boolean {
  return player.activePersistentEffects.some((effect) => effect.cardId === 'invisibility');
}

function fanOutGroups(view: PlayingStateView): FanOutGroup[] {
  const buckets = new Map<string, PendingEffectView[]>(); // Map keeps first-seen (wire) order
  for (const effect of view.pendingEffects) {
    if (effect.targetPlayerId === effect.sourcePlayerId) continue; // base Suicide self-queue
    const key = `${effect.sourcePlayerId}|${effect.queuedAt}|${effect.cardId}`;
    const bucket = buckets.get(key);
    if (bucket === undefined) buckets.set(key, [effect]);
    else bucket.push(effect);
  }
  const groups: FanOutGroup[] = [];
  for (const [key, effects] of buckets) {
    const first = effects[0];
    if (first === undefined) continue;
    const targets = new Set(effects.map((effect) => effect.targetPlayerId));
    if (targets.size < 2) continue; // one target is a plain arrow
    // "Across every opponent" (§6.5): every living opponent of the source, except living
    // Invisible seats, which upgraded thieves skip (L65-02) while MEGA ATTACK still hits them.
    const covered = view.players
      .filter((p) => p.id !== first.sourcePlayerId && !p.isEliminated && !isInvisible(p))
      .every((p) => targets.has(p.id));
    if (!covered) continue;
    groups.push({
      key, sourcePlayerId: first.sourcePlayerId, cardId: first.cardId, queuedAt: first.queuedAt,
      targets: effects.map((effect) => ({ playerId: effect.targetPlayerId, effectId: effect.id, label: labelFor(effect) })),
    });
  }
  return groups;
}
```

  Build `fanOuts` first. Then fill each entry's `fanOutKey` from a `Map<effectId, key>`.

- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/view-model/threats.test.ts`. Expected: `Test Files  1 passed (1)`, `Tests  27 passed (27)`.

- [ ] **Step 5: Docs.**
  - In `docs/agent/frontend.md`, append this bullet at the end of `## View-model layer (V7 · Lot 72+)`, after the L73-03 "Seat layout" bullet and before `## Design system (V7 · Lot 72+)`:

```markdown
- `view-model/threats.ts` (L73-04, spec v7 §6.5): `threats(view, subChoice)` gives one
  `ThreatEntry` per `pendingEffects` item, in wire order, each with its **own** label
  (`listedAttackDamage` × `damageMultiplier`, else the effect's card icon), never a summed
  total (golden rule 1). Relation is `incoming` when the POV is the target (a self-queued
  base Suicide included), else `outgoing` when the POV is the source, else `third-party`.
  Tone: `mine` for outgoing, `threatToneFor` otherwise; every entry also carries the source
  seat colour (`seatColorIndexOf`). `groupKey` (`source|target|queuedAt|cardId`) fans arrows side by side.
  A **fan-out** (`FanOutGroup`, key `source|queuedAt|cardId`) is a `(source, cardId,
  queuedAt)` set with at least two distinct targets that covers every living opponent of the
  source except living Invisible seats; a self-targeted entry never joins one. A single
  target, or a set that no longer covers everyone because a target has resolved, draws plain
  arrows. Members stay in `entries` with `fanOutKey` set, and each target badge keeps its own
  label. `mirrorBadge` comes from `redirectedBy`. `mirrorEligible` is set only while a `mirror`
  sub-choice lists the id. `gridThreatEntries` keeps POV in/out plus the tapped seat's
  entries, and `seatThreatIds` gives a seat's in/out ids. The tone type is
  `ReturnType<typeof threatToneFor>`, so `threats.ts` adds no `fx/` import.
```

  - In `docs/backlog_v7.md`, change the final cell of row `L73-04` from `To do` to `Done`. In Progress, change `| 73 · View-model | 13 | 3 |` to `| 73 · View-model | 13 | 4 |` and `| **Total** | **134** | **24** |` to `| **Total** | **134** | **25** |`.

- [ ] **Step 6: Verify and commit.**
  - `pnpm verify` must be green.
  - Stage the files by name: `git add apps/client/src/view-model/threats.ts apps/client/src/view-model/threats.test.ts docs/agent/frontend.md docs/backlog_v7.md`
  - Commit with this message (subject is 46 characters):

```
feat(view-model): add threats() model (L73-04)

A fan-out is a (source, card, queuedAt) set with two or more distinct
targets covering every living opponent of the source except living
Invisible seats (spec v7 §6.5). Labels stay per effect, never summed.
```

**Acceptance map:**
- Three Assassin attacks on the POV give three entries with three labels and no total: `gives three Assassin attacks on the POV three entries with their own labels and no total`.
- A ×2 attack shows the multiplied number: `multiplies the listed damage by damageMultiplier`.
- MEGA ATTACK on 7 opponents gives one fan-out group with 7 target badges: `makes MEGA ATTACK on 7 opponents one fan-out group with 7 target badges`.
- Spy and Thief incoming use the other tone; Sentence and Mirror the attack tone: `gives incoming %s the other (effect) tone (L51-07, Q61)` and `gives incoming %s the attack tone`.
- A redirected effect is drawn from the redirector with its badge: `draws a redirected effect from the redirector with its Mirror or Super Mirror badge`.
- Mirror-eligible ids are flagged only while the prompt is open: `flags Mirror-eligible ids only while a Mirror prompt is open`.
- `pnpm verify` green: Step 6.

**Decisions:**
1. **Fan-out membership.** Group by `(sourcePlayerId, queuedAt, cardId)` and leave out self-targeted entries. A group is a fan-out when it has ≥ 2 distinct targets and those targets cover every living opponent of the source that is not living-Invisible. This is the literal §6.5 reading, plus two server facts:
   - upgraded Spy Thief and Upgrade Point Thief skip living Invisible seats (`spy-thief.ts`, `upgrade-point-thief.ts` `livingTargets`);
   - MEGA ATTACK, Suicide and Super Mirror hit every alive opponent (`mega-attack.ts`, `suicide.ts`, `super-mirror.ts`).

   The rule therefore also covers the Review's Assassin volley and Super Mirror copies, which keep the original `queuedAt` (`duplicate-pending-effect.ts`). Because the test is literal, a burst turns into separate arrows once its first target resolves. This is the plan's default; the designer may override it (Appendix B, Q1).
2. **One target is a plain arrow.** A burst replaces several arrows ("instead of 7 arrows"). One target has nothing to compress, and an arrow names source and target more precisely. Default; designer question (Appendix B, Q2).
3. **Fan-out targets.** There is one target row per effect, in wire order. A seat hit twice gets two badges with their own labels, never a per-seat sum (golden rule 1). `fanOuts` is in first-seen wire order.
4. **Self-target and relation.** Base Suicide queues on its own user (`suicide.ts`, the `!card.isUpgraded` branch). That entry is `incoming` (relation checks the target first), takes `threatToneFor('suicide')` = `effect`, and never joins a fan-out.
5. **Tone type.** `ReturnType<typeof threatToneFor> | 'mine'`, not an `import type` from `fx/`. This keeps the frontend.md rule that only `threat-tone.ts` and `opponent-token-chips.ts` reach into `fx/`.
6. **Seat colour.** `seatColorIndexOf` from `seats.ts` (L73-02), the same index the seat itself uses. A pending source is always in `view.players`, so its fallbacks are defensive.
7. **Entries and the grid helper.** `entries` keeps fan-out members, one entry per `pendingEffects` item as §4.3 says. The L74 renderer draws a member as burst plus badge, never as an arrow. `gridThreatEntries` is a pure relation filter and leaves that choice to the renderer.
8. **Test shape.** Tests read `model.entries` and `model.fanOuts`, never `toEqual` on the whole `ThreatsModel`, so L73-05 can add `recurring` without editing this file.
9. **No `persistent:` id filter.** Those ids are V2 presentation chips. The wire never carries them, and the V2 consumers (`pending-queue.tsx`, `table-banner.ts`, `attack-targets.ts`) keep their own filters until L75.
10. **No log read.** Earlier Mirror hops show in the log only (§6.5). `threats()` reads `pendingEffects` and `players` only.

---

### Task L73-05: Add recurring chips; delete persistent-incoming.ts

**Files:**
- Create: `apps/client/src/view-model/recurring-chips.ts`
- Test: `apps/client/src/view-model/recurring-chips.test.ts` (create)
- Modify:
  - `apps/client/src/view-model/threats.ts`: adds `recurring`.
  - `apps/client/src/view-model/incoming-threat-diff.ts`: comment only, line 8.
  - `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`
- Delete: `apps/client/src/screens/table/persistent-incoming.ts`, `apps/client/src/screens/table/persistent-incoming.test.ts`

**Interfaces:**
- Consumes:
  - `threats`, `ThreatsModel` (L73-04);
  - `makePersistent`, `makePlayer`, `makePlayingView`, `makeSelf` from `./test-fixtures`;
  - `PersistentEffectView`, `PlayingStateView`, `PrivateSelfView`, `PublicPlayerView` from `@card-battle/shared`.
- Produces in `recurring-chips.ts`:
  - the contract's `RecurringCardId`, `RecurringChip` and `recurringChips(view: PlayingStateView): readonly RecurringChip[]`;
  - the amount type:

```ts
export type RecurringAmount =
  | { kind: 'lives-per-turn'; lives: number }                          // Poison
  | { kind: 'points-above-floor'; maxPoints: number; floor: number }   // Imposition
  | { kind: 'life-per-points-spent'; pointsPerLife: number };          // Curse
/** Rules spec §5 Poison (lines 224–225); mirrors server POISON_LIVES_BASE / _UPGRADED. */
export const CLIENT_POISON_LIVES = { base: 1, upgraded: 2 } as const;
/** Rules spec §5 Imposition (line 228): only points above 7; mirrors IMPOSITION_POINTS_FLOOR. */
export const CLIENT_IMPOSITION_FLOOR = 7;
/** Rules spec §5 Imposition (lines 228–229): cap 2 / 4; mirrors IMPOSITION_POINTS_BASE / _UPGRADED. */
export const CLIENT_IMPOSITION_CAP = { base: 2, upgraded: 4 } as const;
/** Rules spec §5 Curse (lines 217, 221): 1 life per 3 / 2 points spent; mirrors CURSE_POINTS_PER_LIFE_*. */
export const CLIENT_CURSE_POINTS_PER_LIFE = { base: 3, upgraded: 2 } as const;
```

  - in `threats.ts`: `ThreatsModel` gains `recurring: readonly RecurringChip[]`, and `threats()` sets it to `recurringChips(view)`.

- [ ] **Step 1: Write the failing tests** in `apps/client/src/view-model/recurring-chips.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { PersistentEffectView, PlayingStateView, PrivateSelfView, PublicPlayerView } from '@card-battle/shared';

import { recurringChips } from './recurring-chips';
import { makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';
import { threats } from './threats';

const poison = (id: string, isUpgraded = false): PersistentEffectView =>
  makePersistent({ id, cardId: 'poison', counter: 3, isUpgraded });
const imposition = (id: string, isUpgraded = false): PersistentEffectView =>
  makePersistent({ id, cardId: 'imposition', counter: 2, isUpgraded });
// Curse is victim-owned with a null counter (server cards/handlers/curse.ts).
const curse = (id: string, isUpgraded = false): PersistentEffectView =>
  makePersistent({ id, cardId: 'curse', isUpgraded });
const invisibility = makePersistent({ id: 'inv', cardId: 'invisibility', counter: 3 });

/** POV 'me' (12 points, cursed with cu1); p1 holds Poison po1, p2 holds Imposition im1. */
function table(input: {
  me?: Partial<PublicPlayerView>;
  self?: Partial<PrivateSelfView>;
  p1?: Partial<PublicPlayerView>;
  p2?: Partial<PublicPlayerView>;
}): PlayingStateView {
  return makePlayingView({
    players: [
      makePlayer('me', { isYou: true, ...input.me }),
      makePlayer('p1', { activePersistentEffects: [poison('po1')], ...input.p1 }),
      makePlayer('p2', { activePersistentEffects: [imposition('im1')], ...input.p2 }),
    ],
    self: makeSelf({ points: 12, activePersistentEffects: [curse('cu1')], ...input.self }),
  });
}

function pausedById(view: PlayingStateView): Record<string, boolean> {
  return Object.fromEntries(recurringChips(view).map((chip) => [chip.effectId, chip.paused]));
}

describe('recurringChips (spec v7 §6.5, Q35)', () => {
  it('lists a Curse on the POV and opponent Poison and Imposition at their base rates', () => {
    expect(recurringChips(table({}))).toEqual([
      { effectId: 'cu1', cardId: 'curse', ownerPlayerId: 'me', isUpgraded: false, amount: { kind: 'life-per-points-spent', pointsPerLife: 3 }, paused: false },
      { effectId: 'po1', cardId: 'poison', ownerPlayerId: 'p1', isUpgraded: false, amount: { kind: 'lives-per-turn', lives: 1 }, paused: false },
      { effectId: 'im1', cardId: 'imposition', ownerPlayerId: 'p2', isUpgraded: false, amount: { kind: 'points-above-floor', maxPoints: 2, floor: 7 }, paused: false },
    ]);
  });

  it('shows the upgraded rate of each tier', () => {
    const view = table({
      self: { activePersistentEffects: [curse('cu1', true)] },
      p1: { activePersistentEffects: [poison('po1', true)] },
      p2: { activePersistentEffects: [imposition('im1', true)] },
    });
    expect(recurringChips(view).map((chip) => [chip.effectId, chip.isUpgraded, chip.amount])).toEqual([
      ['cu1', true, { kind: 'life-per-points-spent', pointsPerLife: 2 }],
      ['po1', true, { kind: 'lives-per-turn', lives: 2 }],
      ['im1', true, { kind: 'points-above-floor', maxPoints: 4, floor: 7 }],
    ]);
  });

  it.each([
    ['blockTurnsRemaining > 0', { blockTurnsRemaining: 2 }],
    ['blockAttacksForbidden', { blockAttacksForbidden: true }],
  ] as const)('pauses opponent Poison and Imposition, not a Curse on the POV, during Block (%s)', (_label, me) => {
    expect(pausedById(table({ me }))).toEqual({ cu1: false, po1: true, im1: true });
  });

  it('pauses all three under own Invisibility', () => {
    const view = table({ self: { activePersistentEffects: [invisibility, curse('cu1')] } });
    expect(pausedById(view)).toEqual({ cu1: true, po1: true, im1: true });
  });

  it('pauses Imposition at 7 points and keeps it live at 8', () => {
    expect(pausedById(table({ self: { points: 7 } }))['im1']).toBe(true);
    expect(pausedById(table({ self: { points: 8 } }))['im1']).toBe(false);
    expect(pausedById(table({ self: { points: 0 } }))).toEqual({ cu1: false, po1: false, im1: true });
  });

  it('pauses Imposition only under an up, upgraded Shield; Poison keeps ticking', () => {
    expect(pausedById(table({ self: { shield: 3, shieldIsUpgraded: true } }))).toEqual({ cu1: false, po1: false, im1: true });
    expect(pausedById(table({ self: { shield: 3, shieldIsUpgraded: false } }))['im1']).toBe(false);
    expect(pausedById(table({ self: { shield: 0, shieldIsUpgraded: true } }))['im1']).toBe(false);
  });

  it('gives no chip for an eliminated owner or a depleted counter', () => {
    const view = table({
      self: { activePersistentEffects: [] },
      p1: { isEliminated: true },
      p2: {
        activePersistentEffects: [
          makePersistent({ id: 'im0', cardId: 'imposition', counter: 0 }),
          makePersistent({ id: 'po0', cardId: 'poison', counter: 0 }),
        ],
      },
    });
    expect(recurringChips(view)).toEqual([]);
  });

  it("ignores the POV's own Poison and Imposition and a Curse sitting on an opponent", () => {
    const view = table({
      self: { activePersistentEffects: [poison('own-po'), imposition('own-im')] },
      p1: { activePersistentEffects: [curse('cu-p1')] },
      p2: { activePersistentEffects: [] },
    });
    expect(recurringChips(view)).toEqual([]);
  });

  it('gives no chips to an eliminated POV or a walk-in', () => {
    expect(recurringChips(table({ me: { isEliminated: true } }))).toEqual([]);
    const walkIn = makePlayingView({
      you: 'watcher',
      isSpectator: true,
      currentTurnPlayerId: 'p1',
      turnOrder: ['p1', 'p2'],
      players: [makePlayer('p1', { activePersistentEffects: [poison('po1')] }), makePlayer('p2')],
    });
    expect(recurringChips(walkIn)).toEqual([]);
  });

  it('exposes the chips as threats().recurring', () => {
    const view = table({ me: { blockTurnsRemaining: 1 } });
    expect(threats(view, null).recurring).toEqual(recurringChips(view));
    expect(threats(view, null).recurring).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/view-model/recurring-chips.test.ts`. Expected: the import of `./recurring-chips` fails to resolve, so `Test Files  1 failed (1)` and no test runs.

- [ ] **Step 3: Implement, then delete.**
  1. **`recurringChips(view)`** in `apps/client/src/view-model/recurring-chips.ts`. Add a header doc comment that cites spec v7 §6.5, Q35 and `apps/server/src/engine/turn/apply-persistent-effects.ts`.
     - Return `[]` when `view.isSpectator === true`, or when the POV's `players` entry is missing or `isEliminated`.
     - Compute four flags:
       - `invisible`: `view.self.activePersistentEffects` has an `invisibility` effect;
       - `blocked`: on the POV's `players` entry, `blockTurnsRemaining > 0 || blockAttacksForbidden`;
       - `shieldStops`: `view.self.shield > 0 && view.self.shieldIsUpgraded`;
       - `belowFloor`: `view.self.points <= CLIENT_IMPOSITION_FLOOR`.
     - Walk `view.players` in order.
       - On the POV's seat, emit one chip for each `curse` in `view.self.activePersistentEffects`, in order, with `ownerPlayerId = view.you` and `paused = invisible`.
       - On each living opponent, emit one chip for each `poison` or `imposition` in its `activePersistentEffects` whose `counter !== null && counter > 0`, in order. Poison gets `paused = invisible || blocked`. Imposition gets `paused = invisible || blocked || shieldStops || belowFloor`.
     - Each amount is the tier's constant (`isUpgraded ? X.upgraded : X.base`).
  2. **`threats.ts`.** Add `recurring: readonly RecurringChip[]` to `ThreatsModel` with a doc line citing §6.5 recurring chips. Return `recurring: recurringChips(view)` from `threats()`. Use `import { recurringChips, type RecurringChip } from './recurring-chips'`. `recurring-chips.ts` never imports `threats.ts`, so there is no cycle.
  3. **`incoming-threat-diff.ts`.** Make a comment-only change on line 8: replace `` /** Synthetic ids from `persistent-incoming.ts` — not engine queue entries. */ `` with `` /** Legacy synthetic `persistent:` ids (V2 presentation chips, module deleted in L73-05) — never engine queue entries. */ ``.
  4. **Delete** with `git rm apps/client/src/screens/table/persistent-incoming.ts apps/client/src/screens/table/persistent-incoming.test.ts`.
  5. **Check nothing references it.** `grep -rn "persistent-incoming\|buildPersistentIncomingChips\|buildPersistentOthersChips" apps packages` must print nothing. Before this task it matched only the module, its test, and the `incoming-threat-diff.ts:8` comment (verified 2026-10-27).

- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/view-model/recurring-chips.test.ts apps/client/src/view-model/threats.test.ts`. Expected: `Test Files  2 passed (2)`, `Tests  38 passed (38)` (11 + 27). Then run `pnpm typecheck`, which must be clean and proves nothing imported the deleted module.

- [ ] **Step 5: Docs.**
  - **`docs/agent/frontend.md`, V2 bullet.** In the `**Activated art**` bullet, replace these three lines:

    ```
      Opponent actives sit beside the kit portrait (`activeShield` + persistents). Imposition / Points Generator also get
      presentation-only Incoming / felt chips via `persistent-incoming.ts` (engine still ticks
      them in step 4 — not real pending).
    ```

    with:

    ```
      Opponent actives sit beside the kit portrait (`activeShield` + persistents). The V2 table
      shows no Incoming / felt chip for Imposition or Points Generator: the unwired
      `persistent-incoming.ts` was deleted in L73-05 (spec v7 §13 #35). V7 recurring chips come
      from `view-model/recurring-chips.ts` (View-model layer above).
    ```

  - **`docs/agent/frontend.md`, View-model section.** Append this bullet at the end of the section, after the L73-04 `threats.ts` bullet:

    ```markdown
    - `view-model/recurring-chips.ts` (L73-05, spec v7 §6.5, Q35): `recurringChips(view)` (also
      `threats().recurring`) lists every Curse on the POV (`self.activePersistentEffects`) and each
      living opponent's Poison and Imposition with `counter > 0`, in `view.players` order; none for
      an eliminated or walk-in POV. The amount is the catalog rate for the tier from the
      `CLIENT_*` constants (rules spec §5, mirroring `apply-persistent-effects.ts`), never a
      prediction. `paused` mirrors the engine: own Invisibility pauses all three; an own Block
      chain (`blockTurnsRemaining > 0` or `blockAttacksForbidden`) pauses Poison and Imposition,
      and Curse keeps draining; an up, upgraded own Shield or own points ≤ 7 pause Imposition.
    ```

  - **`docs/agent/decisions.md`.** Append this entry at the end of the file, after the L73-03 entry's closing `---`; it closes with its own `---`. Use the commit date in the heading if it is later than 2026-10-27.

    ```markdown
    ## 2026-10-27 · [P] V7 recurring chips: Curse drains during Block; persistent-incoming retired (L73-05)

    Source: technical spec v7 §6.5, §11 and §13 #35; rules spec §5 (Block line 165, Invisibility
    line 193, Curse lines 217–221, Poison lines 224–225, Imposition lines 228–229) and §6 Game Turn
    (line 269); `apps/server/src/engine/turn/apply-persistent-effects.ts`.

    - **Paused reading.** A recurring chip is paused when the POV's own view shows the engine will
      skip that effect on the POV's next tick. Own Invisibility pauses Poison, Imposition and Curse:
      `applyPersistentEffects` returns before every victim tick (lines 74–79,
      `engine/specials/is-invisible.ts` lines 10–12). An own Block chain (`blockTurnsRemaining > 0`
      or `blockAttacksForbidden`) pauses Poison and Imposition only
      (`victimPersistentTicksPausedByBlock`, lines 203–205, checked at 213 and 235). **Curse keeps
      draining during Block:** `applyCursesOnVictim` has no Block check (lines 258–266), and the
      rules spec Block card says "Curse and attacks are unchanged". An up, upgraded own Shield
      (line 217) and own points ≤ 7 (lines 221–227) pause Imposition. This follows the amended
      spec v7 §6.5, not the earlier draft that let Block pause every chip.
    - **Amounts.** The catalog rate for the tier, never a prediction. The rates are client constants
      in `view-model/recurring-chips.ts` (`CLIENT_POISON_LIVES`, `CLIENT_IMPOSITION_FLOOR`,
      `CLIENT_IMPOSITION_CAP`, `CLIENT_CURSE_POINTS_PER_LIFE`) that cite the rules spec and mirror the
      server constants (lines 39–49), as `CLIENT_SUB_CHOICE_MS` does. Curse shows a rate (1 life per
      3 or 2 points spent).
    - **Retired test.** `screens/table/persistent-incoming.test.ts` is deleted with
      `screens/table/persistent-incoming.ts`, which no surface has rendered since c0e9668 (Lot 14).
      Its two cases (opponent Imposition and own Points Generator on Incoming; own Imposition once per
      opponent on the felt) describe V2 presentation chips that spec v7 §6.5 supersedes. Recurring
      chips list only the effects that tick against the POV (Curse on you, opponent Poison and
      Imposition), and `view-model/recurring-chips.test.ts` covers them.

    ---
    ```

  - **`docs/backlog_v7.md`.** Change the final cell of row `L73-05` from `To do` to `Done`. In Progress, change `| 73 · View-model | 13 | 4 |` to `| 73 · View-model | 13 | 5 |` and `| **Total** | **134** | **25** |` to `| **Total** | **134** | **26** |`.

- [ ] **Step 6: Verify and commit.**
  - `pnpm verify` must be green.
  - Run `git rm apps/client/src/screens/table/persistent-incoming.ts apps/client/src/screens/table/persistent-incoming.test.ts` if Step 3 has not run it already.
  - Stage the rest by name: `git add apps/client/src/view-model/recurring-chips.ts apps/client/src/view-model/recurring-chips.test.ts apps/client/src/view-model/threats.ts apps/client/src/view-model/incoming-threat-diff.ts docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md`
  - Commit with this message (subject is 46 characters):

```
feat(view-model): add recurring chips (L73-05)

Own Block pauses opponent Poison and Imposition but not a Curse on the
POV (rules spec Block, apply-persistent-effects.ts); own Invisibility
pauses all three. Deletes the unwired persistent-incoming.ts and its
test (spec v7 §6.5, §13 #35).
```

**Acceptance map:**
- Opponent Poison during own Block is paused, a Curse on the POV is not: `pauses opponent Poison and Imposition, not a Curse on the POV, during Block (%s)`.
- Own Invisibility pauses all three: `pauses all three under own Invisibility`.
- Imposition paused at 7 points and under an up, upgraded Shield, live at 8: `pauses Imposition at 7 points and keeps it live at 8` and `pauses Imposition only under an up, upgraded Shield; Poison keeps ticking`.
- Upgraded tiers show their rates: `shows the upgraded rate of each tier`.
- No chip for an eliminated owner or a depleted counter: `gives no chip for an eliminated owner or a depleted counter`.
- `persistent-incoming.ts` is gone and nothing imports it: Step 3 items 4–5 (`git rm`, empty grep) and the clean `pnpm typecheck` in Step 4.
- `pnpm verify` green: Step 6.

**Decisions:**
1. **The given facts match the server.** Each one is checked against the code:
   - Own Invisibility pauses all three: `apply-persistent-effects.ts:74-79`.
   - Block pauses Poison and Imposition only: lines 203–205, 213 and 235. Curse has no Block check: lines 258–266.
   - An up, upgraded Shield pauses Imposition: line 217.
   - Points ≤ 7 pause Imposition: lines 221–227. `taken = min(cap, max(0, points − 7))` is 0 at 7 and 1 at 8.
2. **Where each value is read.**
   - Own persistents (Curse, Invisibility), points and Shield come from `view.self`. That is the POV's private record, and the contract's fixture rule sets POV values on `self`.
   - Block and `isEliminated` come from the POV's `players` entry, the only place they exist.
3. **Counters.**
   - Poison and Imposition need `counter !== null && counter > 0`, as the server skips a null or depleted counter (lines 193 and 245). Fixtures must pass a counter, because the `makePersistent` default is `null`.
   - Curse ignores the counter. It is always `null` (`curse.ts:33`), and the engine never reads it.
4. **Owners.**
   - Opponent owners must be living (server lines 188 and 240).
   - A Poison owned by an Invisible opponent still ticks. The server never checks the owner, so the chip is not paused.
5. **Order.** Chips follow `view.players` order. Within a seat they follow its `activePersistentEffects` order, and the POV's seat uses `self.activePersistentEffects`.
6. **Chip scope.** Only the three cards §6.5 lists get a chip. Points Generator, Roulette, Super Absorber, Invisibility and Sentence get none. Super Absorber copies the POV's ledger rather than draining a fixed rate.
7. **Curse at 1 life is not marked paused.** The engine ends a Curse at ≤ 1 life instead of draining (lines 269–272), but §6.5 does not list this case, so the chip shows live. Default; designer question (Appendix B, Q3).
8. **Constant names.** The names use the `CLIENT_` prefix after `CLIENT_SUB_CHOICE_MS`, so `grep` never confuses them with the server constants. Tests assert literal numbers (1, 2, 7, 2, 4, 3, 2), so a drifting constant fails a test.
9. **`isPersistentPresentationId` stays.** Its V2 consumers go in L75. Only the comment that names the deleted file changes, so the Step 3 `grep` is clean.
10. **`paused` reads the current view only.** It is not a turn simulation. For example, `blockAttacksForbidden` stays true on the last chain turn (`state-view.ts` doc), and the chip follows it.

---

### Task L73-06: Add cardActions() for hand and special cards

**Notes for L73-06 … L73-08.** Server line numbers are at `881c28f`. Never `toEqual` a whole `CardActionsModel`: L73-08 adds `drop` and `canDrag`, so tests assert fields. Catalog play costs used below (`cost.points`): basic 1, strong 2, super 10, absorber 3, spy 2, thief 5, mirror 6, shield 7, tax 0 (1 life), Regeneration 3 per life (2 upgraded), cloning 3, curse 8, suicide 3, sentence 20, block 5, card-transformer 2, card-absorber 4, mega-attack 16, super-mirror 7, invisibility 10, attack-thief 8, super-regeneration 6.

**Files:**
- Create: `apps/client/src/view-model/action-lock.ts`, `apps/client/src/view-model/action-reasons.ts`,
  `apps/client/src/view-model/card-actions.ts`
- Test: `apps/client/src/view-model/action-lock.test.ts`, `apps/client/src/view-model/action-reasons.test.ts`,
  `apps/client/src/view-model/card-actions.test.ts`, `apps/client/src/view-model/card-actions-frozen.test.ts`
- Modify: `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`

**Interfaces:**
- Consumes: `@card-battle/shared`: `cardActsOnOpponents`, `isAttackCardId`, `isSharedAttackCardId`,
  `isSharedCardId`, `isTemporarilyUnavailableCardId`, `getCard`, `getKit`, `SHARED_CARD_CATALOG`,
  types `CardId`, `CardInstance`, `PlayingStateView`, `PublicPlayerView`, `PendingEffectView`,
  `SubChoiceRequiredPayload`. `./attack-targets`: `attackTargetOpponents`, `thiefTargetOpponents`.
  `../ui/structured-cost`: `structuredPlayCost`. Test fixtures: `makeCard`, `makePending`,
  `makePersistent`, `makePlayer`, `makePlayingView`, `makeSelf`.
- Produces (contract names unchanged):
  - `action-lock.ts`: `ActionContext`, `LockReason`, `actionLock`.
  - `action-reasons.ts`: `DISABLED_REASONS`, `DisabledReason`, `DISABLED_REASON_COPY`,
    `ActionAvailability`, plus `availabilityFor(reason: DisabledReason | null): ActionAvailability`
    (`{ enabled: reason === null, reason }`; L73-07, L73-09 and L73-10 build every availability with it).
  - `card-actions.ts`: `CardRef` (hand, special, read-only), `CardActionKind`, `CardAction`,
    `UseRouting`, `CardActionsModel`, `cardActions`, plus:
    ```ts
    export const REGENERATION_QUANTITIES = [1, 2, 3, 4] as const; // regeneration.ts MAX_LIVES_PER_USE
    export type RegenerationQuantity = (typeof REGENERATION_QUANTITIES)[number];
    export interface RegenerationTile extends ActionAvailability {
      quantity: RegenerationQuantity; label: string; totalCost: number; // points, per-life price × quantity
    }
    export const MULTI_ATTACK_MIN_ATTACKS = 2; // perform-action.ts:1548 multi-attack-need-two
    export interface MultiAttackRow { instance: CardInstance; seatIds: readonly string[] }
    export interface MultiAttackModel { rows: readonly MultiAttackRow[]; minAttacks: typeof MULTI_ATTACK_MIN_ATTACKS }
    ```

- [ ] **Step 1: Write the failing tests.**

`action-lock.test.ts` (4 `it` blocks):
```ts
import type { PlayingStateView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { actionLock, type ActionContext } from './action-lock';
import { makePlayer, makePlayingView } from './test-fixtures';

const FREE: ActionContext = { subChoice: null, readOnly: false };
const SLOT_DROP: SubChoiceRequiredPayload = { kind: 'slot-drop', slotOwnerPlayerId: 'me', eligibleSlots: [], deadlineMs: 0 };
const ELIMINATED_ME = [makePlayer('me', { isYou: true, isEliminated: true }), makePlayer('p1'), makePlayer('p2')];

describe('actionLock (spec v7 §11; V2 table.tsx actionsLocked)', () => {
  it('is null on your own turn with nothing open', () => {
    expect(actionLock(makePlayingView(), FREE)).toBeNull();
  });
  it("is not-your-turn on another seat's turn and between turns", () => {
    expect(actionLock(makePlayingView({ currentTurnPlayerId: 'p1' }), FREE)).toBe('not-your-turn');
    expect(actionLock(makePlayingView({ currentTurnPlayerId: null }), FREE)).toBe('not-your-turn');
  });
  it.each<[string, PlayingStateView, ActionContext]>([
    ['the finished board', makePlayingView(), { subChoice: null, readOnly: true }],
    ['an open sub-choice', makePlayingView(), { subChoice: SLOT_DROP, readOnly: false }],
    ['an eliminated POV', makePlayingView({ players: ELIMINATED_ME }), FREE],
    ['a walk-in spectator', makePlayingView({ isSpectator: true }), FREE],
  ])('is actions-locked for %s', (_label, view, ctx) => {
    expect(actionLock(view, ctx)).toBe('actions-locked');
  });
  it('reports actions-locked before not-your-turn', () => {
    expect(actionLock(makePlayingView({ currentTurnPlayerId: 'p1', players: ELIMINATED_ME }), FREE)).toBe('actions-locked');
    expect(actionLock(makePlayingView({ currentTurnPlayerId: 'p1' }), { subChoice: SLOT_DROP, readOnly: false })).toBe('actions-locked');
  });
});
```

`action-reasons.test.ts` (2 blocks): pins the copy table (Appendix B, New strings).
```ts
import { describe, expect, it } from 'vitest';

import { DISABLED_REASON_COPY, DISABLED_REASONS, availabilityFor } from './action-reasons';

describe('disabled reasons (spec v7 §10.6, §11)', () => {
  it('pins one copy string per reason, in DISABLED_REASONS order', () => {
    expect(Object.keys(DISABLED_REASON_COPY)).toEqual([...DISABLED_REASONS]);
    expect(DISABLED_REASON_COPY).toEqual({
      'not-your-turn': 'Not your turn',
      'actions-locked': 'Actions locked',
      invisibility: "Invisible: you can't act on other players",
      'attack-ban': 'Block: attacks banned this turn',
      'not-enough-points': 'Not enough points',
      'not-enough-lives': 'Not enough lives',
      'no-upgrade-point': 'No upgrade points',
      'no-valid-target': 'No valid target',
      'nothing-to-consume': 'No action or attack card in hand to transform.',
      'temporarily-unavailable': 'Temporarily unavailable',
      'no-living-spy': 'Nobody is spying on you',
      'pool-empty': 'Pool empty',
    });
  });
  it('builds an availability with a reason only when disabled', () => {
    expect(availabilityFor(null)).toEqual({ enabled: true, reason: null });
    expect(availabilityFor('pool-empty')).toEqual({ enabled: false, reason: 'pool-empty' });
  });
});
```

`card-actions.test.ts` (32 blocks). Header and builders:
```ts
import type { CardId, PendingEffectView, PlayingStateView, PrivateSelfView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import type { DisabledReason } from './action-reasons';
import { cardActions, type CardActionKind, type CardActionsModel, type CardRef, type UseRouting } from './card-actions';
import { makeCard, makePending, makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const ON_TURN: ActionContext = { subChoice: null, readOnly: false };
const OPEN_MIRROR: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: ['fx-1'], deadlineMs: 0 };
const INVISIBLE = makePersistent({ id: 'pe-inv', cardId: 'invisibility', counter: 3 });
const hand = (cardId: CardId, isUpgraded = false): CardRef => ({ zone: 'hand', instance: makeCard(cardId, { isUpgraded }) });
const special = (cardId: CardId, isUpgraded = false): CardRef => ({ zone: 'special', instance: makeCard(cardId, { isUpgraded }) });
const kinds = (model: CardActionsModel): CardActionKind[] => model.actions.map((action) => action.kind);
/** `undefined` = absent, `null` = enabled, else its reason. */
const reasonOf = (model: CardActionsModel, kind: CardActionKind): DisabledReason | null | undefined =>
  model.actions.find((action) => action.kind === kind)?.reason;
const viewWith = (self: Partial<PrivateSelfView>, overrides: Partial<PlayingStateView> = {}): PlayingStateView =>
  makePlayingView({ self: makeSelf(self), ...overrides });
const useReason = (view: PlayingStateView, ref: CardRef, ctx: ActionContext = ON_TURN) => reasonOf(cardActions(view, ref, ctx), 'use');
const tiles = (model: CardActionsModel) => (model.use?.kind === 'regeneration' ? model.use.tiles : null);
const BANNED = [makePlayer('me', { isYou: true, blockAttacksForbidden: true }), makePlayer('p1'), makePlayer('p2')];
const ALL_INVISIBLE = [makePlayer('me', { isYou: true }), makePlayer('p1', { activePersistentEffects: [INVISIBLE] }), makePlayer('p2', { activePersistentEffects: [INVISIBLE] })];

/** Living p1; living Invisible p2 (attack on me); corpses c1 (attack on me), c2 (Thief on me),
 *  c3 (absorb window, leftover Invisibility), c4 (attacks p1; my own attack sits on it). */
function crowdedTable(): PlayingStateView {
  return viewWith({ points: 30, upgradePoints: 1 }, {
    turnOrder: ['me', 'p1', 'p2', 'c1', 'c2', 'c3', 'c4'],
    players: [
      makePlayer('me', { isYou: true }), makePlayer('p1'), makePlayer('p2', { activePersistentEffects: [INVISIBLE] }),
      makePlayer('c1', { isEliminated: true }), makePlayer('c2', { isEliminated: true }),
      makePlayer('c3', { isEliminated: true, absorbWindowOpen: true, activePersistentEffects: [INVISIBLE] }),
      makePlayer('c4', { isEliminated: true }),
    ],
    pendingEffects: [
      makePending({ id: 'fx-c1', sourcePlayerId: 'c1', targetPlayerId: 'me', cardId: 'strong-attack' }),
      makePending({ id: 'fx-c2', sourcePlayerId: 'c2', targetPlayerId: 'me', cardId: 'thief' }),
      makePending({ id: 'fx-c4', sourcePlayerId: 'c4', targetPlayerId: 'p1', cardId: 'basic-attack' }),
      makePending({ id: 'fx-me', sourcePlayerId: 'me', targetPlayerId: 'c4', cardId: 'basic-attack' }),
      makePending({ id: 'fx-p2', sourcePlayerId: 'p2', targetPlayerId: 'me', cardId: 'basic-attack' }),
    ],
  });
}
```

`describe('cardActions: hand and special actions (spec v7 §6.6.1, Appendix A card-actions-dialog)')`:
1. `offers Use, Upgrade and Sell on a base hand card, in display order`: `viewWith({ points: 1, upgradePoints: 1 })`, `hand('basic-attack')` → `instanceId 'basic-attack-1'`; `actions` `toEqual([{ kind: 'use', enabled: true, reason: null }, { kind: 'upgrade', enabled: true, reason: null }, { kind: 'sell', enabled: true, reason: null }])`; `multiAttack` null.
2. `hides Sell on a special`: `kinds(cardActions(viewWith({ points: 3, upgradePoints: 1 }), special('cloning'), ON_TURN))` → `['use', 'upgrade']`.
3. `hides Upgrade once the copy is upgraded`: `hand('strong-attack', true)`, points 2, 1 UP → `['use', 'sell']`.
4. `keys Upgrade on the copy, not the kit trait`: `viewWith({ kitId: 'scientific', points: 2, upgradePoints: 1 })`; `reasonOf(…hand('spy')…, 'upgrade')` → `null`; `hand('spy', true)` → `undefined`.
5. `disables Upgrade at 0 upgrade points`: `viewWith({ points: 1 })`, `hand('basic-attack')` → upgrade `'no-upgrade-point'`.
6. `keeps Upgrade and Sell usable under own Invisibility and the Block ban`: `viewWith({ points: 1, upgradePoints: 1, activePersistentEffects: [INVISIBLE] }, { players: BANNED })`, `hand('basic-attack')` → use `'invisibility'`, upgrade `null`, sell `null`.
7. `gives a read-only card no actions and no routing`: `{ zone: 'read-only', instance: makeCard('thief') }` on `crowdedTable()` → `instanceId 'thief-1'`, `actions []`, `use null`, `multiAttack null`.

`describe('target seats per card family (Appendix A table-target-picker-eligibility)')`:

8. Target sets per family, `'%s targets %j'`:
   ```ts
   it.each<[string, CardRef, readonly string[]]>([
     ['Basic attack', hand('basic-attack'), ['p1', 'c1']], ['Strong attack', hand('strong-attack'), ['p1', 'c1']],
     ['Super attack+', hand('super-attack', true), ['p1', 'c1']], ['Thief', hand('thief'), ['p1', 'c2']],
     ['Thief+', hand('thief', true), ['p1', 'c2']], ['Absorber', hand('absorber'), ['p1', 'c3']],
   ])('%s targets %j', (_label, ref, seatIds) => {
     expect(cardActions(crowdedTable(), ref, ON_TURN).use).toEqual({ kind: 'target', seatIds });
   });
   ```
9. `it.each` over `[label, CardRef]` rows (as in block 8) for `hand('spy')`, `hand('spy', true)`, `special('cloning')`, `special('curse')`, `special('card-thief')`, `special('upgrade-point-thief')`, `special('spy-thief')`: `'%s targets living non-Invisible seats only'` → `use` `toEqual({ kind: 'target', seatIds: ['p1'] })`.
10. `keeps attack and Thief corpse ripostes separate and never offers a living Invisible seat (L68-07, L65-02)`: attack seats `not.toContain('c2')`, Thief seats `not.toContain('c1')`; for `basic-attack`, `thief`, `absorber`, `spy`, `curse` the seats never contain `'p2'` or `'me'`.
11. `upgraded thieves take no target`: `it.each(['card-thief', 'upgrade-point-thief', 'spy-thief'] as const)` → `cardActions(crowdedTable(), special(id, true), ON_TURN)`: `use` `toEqual({ kind: 'send' })`, use reason `null`.
12. `keeps an Untouchable seat as a Spy and Thief target: no client immunity filter`: `viewWith({ points: 30 }, { players: [makePlayer('me', { isYou: true }), makePlayer('p1', { spied: { kitId: 'untouchable', hand: [], specialCards: [] } }), makePlayer('p2')] })` → Spy and Thief `use` both `{ kind: 'target', seatIds: ['p1', 'p2'] }`.
13. `it.each` over `[label, CardRef]` rows, `'%s sends at once with no target'`, on `crowdedTable()` → `use` `{ kind: 'send' }` and use reason `null` for: `special('mega-attack')`, `special('poison')`, `special('imposition')`, `special('sentence')`, `special('suicide')`, `hand('mirror')` (fx-c1 base strong attack is Mirror-eligible), `special('super-mirror')`, `hand('tax')`, `hand('shield')`, `special('block')`, `special('invisibility')`, `special('attack-thief')`.
14. Empty living set, never stricter than the server:
    ```ts
    it.each<[string, CardRef, UseRouting['kind'], DisabledReason | null]>([
      ['Spy', hand('spy'), 'target', 'no-valid-target'], ['Basic attack', hand('basic-attack'), 'target', 'no-valid-target'],
      ['Upgrade Point Thief+', special('upgrade-point-thief', true), 'send', 'no-valid-target'],
      ['Spy Thief+', special('spy-thief', true), 'send', 'no-valid-target'], ['Sentence+', special('sentence', true), 'send', 'no-valid-target'],
      ['Card Thief+', special('card-thief', true), 'send', null], ['Sentence', special('sentence'), 'send', null],
      ['MEGA ATTACK', special('mega-attack'), 'send', null],
    ])('with every living opponent Invisible, %s routes %s with reason %s', (_label, ref, kind, reason) => {
      const model = cardActions(viewWith({ points: 30 }, { players: ALL_INVISIBLE }), ref, ON_TURN);
      expect(model.use?.kind).toBe(kind);
      expect(reasonOf(model, 'use')).toBe(reason);
    });
    ```
15. `shows an empty seat set, not a fallback, when every living opponent is Invisible`:
    `cardActions(viewWith({ points: 30 }, { players: ALL_INVISIBLE }), hand('spy'), ON_TURN).use` →
    `toEqual({ kind: 'target', seatIds: [] })`.

`describe('Use routing: pre-send choices (Appendix A regeneration-quantity-picker, card-transformer-consume-picker)')`:

16. Regeneration at 7 points: use reason `null`; `tiles(model)` `toEqual([{ quantity: 1, label: '1 life', totalCost: 3, enabled: true, reason: null }, { quantity: 2, label: '2 lives', totalCost: 6, enabled: true, reason: null }, { quantity: 3, label: '3 lives', totalCost: 9, enabled: false, reason: 'not-enough-points' }, { quantity: 4, label: '4 lives', totalCost: 12, enabled: false, reason: 'not-enough-points' }])`.
17. Upgraded Regeneration at 7 points: `tiles(model)?.map((t) => [t.totalCost, t.enabled])` → `[[2, true], [4, true], [6, true], [8, false]]`.
18. Regeneration at 2 points: use `'not-enough-points'`; every tile reason `'not-enough-points'`.
19. Card Transformer: `viewWith({ points: 2, hand: [makeCard('basic-attack'), makeCard('spy')] })`, `special('card-transformer')` → `use` `toEqual({ kind: 'consume', options: [makeCard('basic-attack'), makeCard('spy')] })`, reason `null`.
20. `gives Card Transformer with no shared card nothing-to-consume, before the points check`: `useReason(viewWith({ points: 2 }), special('card-transformer'))` → `'nothing-to-consume'`; with `points: 0` → `'nothing-to-consume'`; `viewWith({ points: 1, hand: [makeCard('spy')] })` → `'not-enough-points'`.

`describe('disabled reasons, one fixture each (spec v7 §11)')`:

21. Off-turn: `viewWith({ kitId: 'assassin', points: 20, upgradePoints: 1, hand: [makeCard('basic-attack'), makeCard('strong-attack')] }, { currentTurnPlayerId: 'p1' })`, `hand('basic-attack')` → `actions` `toEqual([{ kind: 'use', enabled: false, reason: 'not-your-turn' }, { kind: 'upgrade', enabled: false, reason: 'not-your-turn' }, { kind: 'sell', enabled: false, reason: 'not-your-turn' }, { kind: 'multi-attack', enabled: false, reason: 'not-your-turn' }])`; `special('cloning')` reasons → `['not-your-turn', 'not-your-turn']`; `hand('regeneration')` tile reasons → four `'not-your-turn'`.
22. `it.each<[string, Partial<PlayingStateView>, ActionContext]>` with `['on the finished board', {}, { subChoice: null, readOnly: true }]`, `['while a sub-choice is open', {}, { subChoice: OPEN_MIRROR, readOnly: false }]`, `['for an eliminated POV', { players: [makePlayer('me', { isYou: true, isEliminated: true }), makePlayer('p1'), makePlayer('p2')] }, ON_TURN]`, `['for a walk-in spectator', { isSpectator: true }, ON_TURN]` → `cardActions(viewWith({ points: 20, upgradePoints: 1 }, overrides), hand('basic-attack'), ctx).actions.map((a) => a.reason)` → `['actions-locked', 'actions-locked', 'actions-locked']`.
23. Invisibility (L58-06, `cardActsOnOpponents`): `viewWith({ points: 30, activePersistentEffects: [INVISIBLE] }, { pool: [makeCard('spy')] })`; `'invisibility'` for `hand('basic-attack')`, `special('mega-attack')`, `hand('spy')`, `hand('mirror')`, `special('suicide')`, `special('sentence')`; `null` for `hand('shield')`, `hand('tax')`, `special('block')`, `special('attack-thief')`, `special('card-absorber')`, `special('super-regeneration')`.
24. Block ban: `viewWith({ points: 30 }, { players: BANNED })`: `'attack-ban'` for `hand('strong-attack')`, `special('mega-attack')`, `special('block')`; `null` for `hand('tax')` and `hand('thief')`.
25. Precedence: `viewWith({ points: 30, activePersistentEffects: [INVISIBLE] }, { players: BANNED })` + `hand('basic-attack')` → `'invisibility'`; same view with `{ readOnly: true }` ctx → `'actions-locked'`; `viewWith({ points: 0 }, { players: BANNED })` + `hand('basic-attack')` → `'attack-ban'`; `viewWith({ points: 0 }, { players: ALL_INVISIBLE })` + `hand('spy')` → `'no-valid-target'`.
26. Points: `viewWith({ points: 1 })` + `hand('strong-attack')` → `'not-enough-points'`; points 2 → `null`; points 15 + `special('mega-attack')` → `'not-enough-points'`; points 16 → `null`.
27. `keeps Tax usable at 1 life (tax.ts canPlay ignores lives)`: `useReason(viewWith({ lives: 1 }), hand('tax'))` → `null`.
28. Mirror family:
    ```ts
    const onMe = (cardId: CardId, extra: Partial<PendingEffectView> = {}): PendingEffectView =>
      makePending({ id: `fx-${cardId}`, sourcePlayerId: 'p1', targetPlayerId: 'me', cardId, ...extra });
    it.each<[string, PendingEffectView[], DisabledReason | null, DisabledReason | null, DisabledReason | null]>([
      ['nothing pending', [], 'no-valid-target', 'no-valid-target', 'no-valid-target'],
      ['a base attack on you', [onMe('basic-attack')], null, null, null],
      ['an upgraded attack on you', [onMe('basic-attack', { isUpgraded: true })], 'no-valid-target', null, null],
      ['a Super Mirror redirect on you', [onMe('basic-attack', { redirectedBy: 'super-mirror' })], 'no-valid-target', 'no-valid-target', null],
      ['a base MEGA ATTACK on you', [onMe('mega-attack')], 'no-valid-target', null, null],
      ['an upgraded MEGA ATTACK on you', [onMe('mega-attack', { isUpgraded: true })], 'no-valid-target', 'no-valid-target', null],
      ['a Thief on you', [onMe('thief')], 'no-valid-target', 'no-valid-target', 'no-valid-target'],
      ['an attack on p2', [makePending({ id: 'fx-x', sourcePlayerId: 'p1', targetPlayerId: 'p2', cardId: 'basic-attack' })], 'no-valid-target', 'no-valid-target', 'no-valid-target'],
    ])('Mirror / Mirror+ / Super Mirror with %s', (_label, pendingEffects, base, upgraded, superMirror) => {
      const view = viewWith({ points: 7 }, { pendingEffects });
      expect(useReason(view, hand('mirror'))).toBe(base);
      expect(useReason(view, hand('mirror', true))).toBe(upgraded);
      expect(useReason(view, special('super-mirror'))).toBe(superMirror);
    });
    ```
29. Card Absorber: `useReason(viewWith({ points: 4 }), special('card-absorber'))` → `'pool-empty'`; with `{ pool: [makeCard('spy')] }` → `null`.

`describe('Multi-attack (Assassin; Q44; Appendix A assassin-multi-attack)')` with
`const ATTACKS = [makeCard('basic-attack'), makeCard('strong-attack'), makeCard('spy')];` and
`const assassin = (self: Partial<PrivateSelfView> = {}, overrides: Partial<PlayingStateView> = {}) => viewWith({ kitId: 'assassin', points: 3, hand: ATTACKS, ...self }, overrides);`
`const multi = (view: PlayingStateView) => reasonOf(cardActions(view, hand('basic-attack'), ON_TURN), 'multi-attack');`

30. `offers hand-attack rows with the attack seat set`: `const view = { ...crowdedTable(), self: makeSelf({ kitId: 'assassin', points: 3, hand: ATTACKS, specialCards: [makeCard('mega-attack')] }) };` `cardActions(view, hand('strong-attack'), ON_TURN)`: `kinds` → `['use', 'upgrade', 'sell', 'multi-attack']`; multi reason `null`; `multiAttack` `toEqual({ minAttacks: 2, rows: [{ instance: makeCard('basic-attack'), seatIds: ['p1', 'c1'] }, { instance: makeCard('strong-attack'), seatIds: ['p1', 'c1'] }] })`.
31. `hides Multi-attack below two hand attacks, for other kits, on non-attacks and on MEGA ATTACK`: `assassin({ hand: [makeCard('basic-attack'), makeCard('spy')] })` → no `'multi-attack'` kind and `multiAttack` null; `assassin({ kitId: 'kamikaze' })`, `hand('spy')` on `assassin()`, and `special('mega-attack')` on `assassin({ points: 30, specialCards: [makeCard('mega-attack')] })` → no `'multi-attack'`.
32. `uses the server reasons in its order (perform-action.ts:1536-1626)`: `multi(assassin({ activePersistentEffects: [INVISIBLE] }))` → `'invisibility'`; `multi(assassin({}, { players: BANNED }))` → `'attack-ban'`; both at once → `'attack-ban'`; `multi(assassin({}, { players: ALL_INVISIBLE }))` → `'no-valid-target'`; `multi(assassin({ points: 2 }))` → `'not-enough-points'`; `multi(assassin({ points: 3 }))` → `null`; `multi(assassin({ points: 10, hand: [makeCard('super-attack'), makeCard('basic-attack')] }))` → `'not-enough-points'`.

`card-actions-frozen.test.ts` (2 blocks). `vi.mock` is justified here and nowhere else in Lot 73: `TEMPORARILY_UNAVAILABLE_SPECIAL_CARD_IDS` (`packages/shared/src/domain/card.ts`) is empty today, so no real card can reach `temporarily-unavailable`, and the reason would otherwise ship untested. The file replaces only `isTemporarilyUnavailableCardId`, in its own file so no other suite sees the mock, and adds no production seam:
```ts
import { describe, expect, it, vi } from 'vitest';

import { cardActions, type CardRef } from './card-actions';
import { makeCard, makePersistent, makePlayingView, makeSelf } from './test-fixtures';

// card.ts TEMPORARILY_UNAVAILABLE_SPECIAL_CARD_IDS is empty today (L56-02 / L58-06 switch).
vi.mock('@card-battle/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@card-battle/shared')>();
  return { ...actual, isTemporarilyUnavailableCardId: (cardId: string) => cardId === 'cloning' };
});

const CLONING: CardRef = { zone: 'special', instance: makeCard('cloning') };

describe('cardActions on a frozen special (L56-02 / L58-06 switch)', () => {
  it('keeps Use on a frozen special, disabled as temporarily-unavailable; Upgrade stays usable', () => {
    const view = makePlayingView({ self: makeSelf({ points: 3, upgradePoints: 1 }) });
    expect(cardActions(view, CLONING, { subChoice: null, readOnly: false }).actions).toEqual([
      { kind: 'use', enabled: false, reason: 'temporarily-unavailable' },
      { kind: 'upgrade', enabled: true, reason: null },
    ]);
  });
  it('reports temporarily-unavailable before Invisibility, and the lock before both', () => {
    const self = makeSelf({ points: 3, activePersistentEffects: [makePersistent({ id: 'pe-inv', cardId: 'invisibility', counter: 3 })] });
    const use = (ctx: { subChoice: null; readOnly: boolean }) => cardActions(makePlayingView({ self }), CLONING, ctx).actions[0]?.reason;
    expect(use({ subChoice: null, readOnly: false })).toBe('temporarily-unavailable');
    expect(use({ subChoice: null, readOnly: true })).toBe('actions-locked');
  });
});
```

- [ ] **Step 2: Run them and see them fail.**
`pnpm vitest run apps/client/src/view-model/action-lock.test.ts apps/client/src/view-model/action-reasons.test.ts apps/client/src/view-model/card-actions.test.ts apps/client/src/view-model/card-actions-frozen.test.ts`
Expected: all four files fail with `Failed to resolve import "./action-lock"` (or `./action-reasons`, `./card-actions`).

- [ ] **Step 3: Implement.**
- `action-reasons.ts`: the contract list, the copy record written in `DISABLED_REASONS` order (Step 1 table), `ActionAvailability`, `availabilityFor`.
- `action-lock.ts`: `actionLock(view, ctx)` exactly as the contract. The POV's public entry is
  `view.players.find((p) => p.id === view.you)` (the V2 `selfEliminated`).
- `card-actions.ts`: `export function cardActions(view: PlayingStateView, card: CardRef, ctx: ActionContext): CardActionsModel`.
  Approach: `lock = actionLock(view, ctx)`; a `read-only` ref returns `{ instanceId, actions: [], use: null, multiAttack: null }`;
  a hand or special ref builds Use (always), Upgrade (unless `instance.isUpgraded`), Sell (zone
  `hand` and `isSharedCardId`), Multi-attack (below), each `availabilityFor(lock ?? check)`.
  Upgrade's check is `self.upgradePoints < 1 ? 'no-upgrade-point' : null`; Sell has none
  (`list-legal-economy.ts:43-71`, `sell-card.ts`). Seat ids are opponents (`id !== view.you`) in
  `view.players` order, filtered by the family rule:

| Card | `use` | Seat rule / extra check | Server source |
|---|---|---|---|
| basic, strong, super attack (any tier) | `target` | `attackTargetOpponents(opponents, view.pendingEffects, view.you)`: living non-Invisible, plus a corpse that is the source of an attack (`isAttackCardId`) on the POV | `list-legal-play-card.ts:138-145`; `perform-action.ts:1771-1792`; `riposte-target.ts:8-18` |
| thief (any tier) | `target` | `thiefTargetOpponents(…)`: same with a pending `thief` | `list-legal-play-card.ts:146-153`; `riposte-target.ts:20-30` |
| absorber (any tier) | `target` | `(!p.isEliminated \|\| p.absorbWindowOpen) && !livingInvisible(p)` | `list-legal-play-card.ts:45-50, 136-137`; `absorb-window.ts:18-20` |
| spy, cloning, curse (any tier); base card-thief, upgrade-point-thief, spy-thief | `target` | `!p.isEliminated && !livingInvisible(p)` | `list-legal-play-card.ts:41-44, 154`; `curse.ts`, `card-thief.ts:48`, `upgrade-point-thief.ts:29`, `spy-thief.ts:30` canPlay |
| upgraded upgrade-point-thief, spy-thief | `send` | `no-valid-target` when no living non-Invisible opponent | `upgrade-point-thief.ts:17-34`, `spy-thief.ts:18-34` |
| upgraded card-thief | `send` | none (no living check) | `card-thief.ts:48-52` |
| sentence | `send` | upgraded: `no-valid-target` when no living non-Invisible opponent (base counts the POV) | `sentence.ts:14`; `pending-sentences.ts:22-42` |
| mirror | `send` | `no-valid-target` unless a pending effect with `targetPlayerId === you` is an attack, base Mirror: not upgraded; never `redirectedBy 'super-mirror'`; `mega-attack` only for upgraded Mirror and base MEGA | `mirror.ts:14`; `mirror-choice.ts:32-66` |
| super-mirror | `send` | `no-valid-target` unless any `isAttackCardId` effect targets the POV | `super-mirror.ts:23`; `mirror-choice.ts:71-75` |
| card-absorber | `send` | `pool-empty` when `view.pool.length === 0` | `card-absorber.ts:17` |
| regeneration | `regeneration` | tiles 1–4, `totalCost = perLife × n`; perLife from `structuredPlayCost(SHARED_CARD_CATALOG.regeneration, isUpgraded)` (3, or 2 upgraded) | `regeneration.ts:12-40`; `list-legal-play-card.ts:75-99` |
| card-transformer | `consume` | options `self.hand.filter((c) => isSharedCardId(c.cardId))`; `nothing-to-consume` when empty | `card-transformer.ts:20-40`; `list-legal-play-card.ts:101-133` |
| mega-attack, block, every other card | `send` | none | each handler's `canPlay` (`targetPlayerId === null`) |

  Use's reason chain, first hit wins (server order, `perform-action.ts:1752-1825`):
  ```ts
  lock
  ?? (isTemporarilyUnavailableCardId(cardId) ? 'temporarily-unavailable' : null)
  ?? (ownInvisible(view) && cardActsOnOpponents(cardId) ? 'invisibility' : null)   // self.activePersistentEffects
  ?? (povBanned(view) && (isAttackCardId(cardId) || cardId === 'block') ? 'attack-ban' : null) // POV public blockAttacksForbidden
  ?? cardCheck(view, instance, routing)     // the table's no-valid-target / nothing-to-consume / pool-empty
  ?? (self.points < playPoints(instance) ? 'not-enough-points' : null) // regeneration: perLife; else getCard(id)?.cost.points ?? 0
  ```
  Each Regeneration tile is `availabilityFor(useReason ?? (self.points < totalCost ? 'not-enough-points' : null))`.
  Multi-attack is present only when zone is `hand`, `isSharedAttackCardId(cardId)`,
  `getKit(self.kitId).traits.allowsMultipleAttacksPerTurn` and `self.hand` holds ≥ 2 shared
  attacks. Its chain is `lock ?? attack-ban ?? invisibility ?? (attack seats empty ? no-valid-target) ??
  (points < sum of the two cheapest hand-attack costs ? not-enough-points)`; rows are the hand's
  shared attacks in hand order, each with the attack seat ids. Doc comments cite the table's sources.

- [ ] **Step 4: Run them and see them pass.** Same command as Step 2: all 4 files pass (4 + 2 + 32 + 2 `it` / `it.each` blocks; Vitest counts each `it.each` row as its own test).
  Then `pnpm vitest run apps/client/src/view-model` stays green.

- [ ] **Step 5: Docs.**
- `docs/agent/frontend.md`: append at the end of `## View-model layer (V7 · Lot 72+)`, after the L73-05
  recurring-chips bullet and before `## Design system (V7 · Lot 72+)`. It supersedes no line; the V2 "Table card-first" bullet stays true until L75:
  ```markdown
  - **Card actions (L73-06).** `view-model/card-actions.ts` `cardActions(view, card, ctx)` gives a
    hand or special card's actions in the order Use, Upgrade, Sell, Multi-attack. A hidden action is
    absent; an unavailable one is disabled with one `DisabledReason` from
    `view-model/action-reasons.ts`, whose `DISABLED_REASON_COPY` holds all V7 disabled-reason copy.
    `view-model/action-lock.ts` `actionLock(view, ctx)` gives `actions-locked` (finished board, open
    sub-choice, eliminated POV, walk-in) before `not-your-turn`; every V7 action model starts from
    it. `use` carries the routing: target seats, send, Regeneration tiles 1–4, or Card Transformer
    consume options. Seats and reasons mirror `list-legal-play-card.ts`, `perform-action.ts` and each
    handler's `canPlay` in the server's check order, and a reason shows only when the view proves the
    server rejects. Never add a client immunity filter, and never gate a play the server accepts
    (golden rule 8). The V2 table keeps `screens/table/card-actions.tsx` until L75.
  ```
- `docs/agent/decisions.md`: append at the end, after the L73-05 entry's closing `---`; the entry closes with its own `---`:
  ```markdown
  ## 2026-10-27 · [P] V7 card actions mirror the server's play checks (L73-06)

  Source: technical spec v7 §4.3, §6.6, §11 (Q39, Q44); `apps/server/src/engine/turn/list-legal-play-card.ts`,
  `perform-action.ts` (`playCardAction`, `playMultipleAttacksAction`) and each handler's `canPlay`.

  - **Rule.** `cardActions` disables an action only when the view proves the server rejects it, in the
    server's order: lock, temporarily unavailable, Invisibility, Block ban, target / consume / pool,
    points. Target seats follow the server's per-card sets; there is no client immunity filter.
  - **Beyond V2.** Use is also disabled for Mirror and Super Mirror with nothing they can redirect,
    upgraded Upgrade Point Thief, Spy Thief and Sentence with no living non-Invisible opponent, Card
    Absorber on an empty pool, Block during the ban, and any unaffordable play. V2 let the server reject.
  - **Left enabled.** A second Reanimation while one is armed (`reanimation.ts` `canPlay`) and a play
    that needs a forced slot drop when no slot is droppable (Lot 69). The client may be less strict than
    the server, which rejects them with an illegal-action toast. No reason code is added; whether
    Reanimation gets one is a designer question in the Lot 73 PR.
  - **Tax** stays enabled at 1 life: `tax.ts` `canPlay` ignores lives, so `not-enough-lives` is a shop
    reason only.
  - **Multi-attack** is hidden, not disabled, with fewer than two hand attacks
    (`multi-attack-need-two`; `listAssassinMultiAttackCandidates` returns none), as Upgrade is hidden
    once upgraded. Its points reason uses the two cheapest hand attacks.

  ---
  ```
- `docs/backlog_v7.md`: row L73-06 status `To do` → `Done`; Progress `| 73 · View-model | 13 | 5 |` →
  `| 73 · View-model | 13 | 6 |` and `| **Total** | **134** | **26** |` → `| **Total** | **134** | **27** |`.

- [ ] **Step 6: Verify and commit.**
```bash
pnpm verify
git add apps/client/src/view-model/action-lock.ts apps/client/src/view-model/action-lock.test.ts \
  apps/client/src/view-model/action-reasons.ts apps/client/src/view-model/action-reasons.test.ts \
  apps/client/src/view-model/card-actions.ts apps/client/src/view-model/card-actions.test.ts \
  apps/client/src/view-model/card-actions-frozen.test.ts \
  docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md
git commit -F - <<'EOF'
feat(view-model): add cardActions() (L73-06)

Disabled reasons mirror the server's play checks in its order, so the
client never blocks a play the server accepts. Multi-attack is hidden
below two hand attacks; a second Reanimation stays enabled and the
server rejects it with a toast. Recorded in decisions.md.
EOF
```

**Acceptance map:**
- Each card family's target set: blocks 8, 9, 11, 13, 14 and 15. Attack and Thief corpse ripostes stay separate and living Invisible seats are never offered: block 10. Upgraded thieves take no target: block 11.
- Each disabled reason has a fixture that triggers it. Every reason `cardActions` emits has one here: `not-your-turn` (21), `actions-locked` (22), `invisibility` (23), `attack-ban` (24), `not-enough-points` (26), `no-upgrade-point` (5), `no-valid-target` (14, 28), `nothing-to-consume` (20), `pool-empty` (29) and `temporarily-unavailable` (`card-actions-frozen.test.ts`). The two it never emits get theirs where they arise: `no-living-spy` in L73-09 (`Unspy is disabled with $reason`) and `not-enough-lives` in L73-10 (`checks points and lives: Tax needs 2 lives, Super attack 20 points`).
- Regeneration tiles are priced and disabled past what the POV can afford: blocks 16–18.
- Card Transformer with no shared card gives `nothing-to-consume`: block 20.
- Off-turn every action is disabled with its reason: block 21.
- `pnpm verify` green: Step 6.

**Decisions:**
1. Reason precedence is the server's check order, per action (`perform-action.ts:1752-1825` for Use, `:1536-1626` for Multi-attack). So Invisibility beats the ban on Use, and the ban beats Invisibility on Multi-attack.
2. Own Invisibility is read from `self.activePersistentEffects` (server `playerIsInvisible(actor)`); the ban from the POV's public `blockAttacksForbidden` (`PrivateSelfView` has no ban field).
3. The extra Use gates (Mirror, Super Mirror, upgraded UP / Spy Thief, upgraded Sentence, Card Absorber, Block) mirror handler `canPlay` exactly; the view's `pendingEffects` filtered on `targetPlayerId === you` equals the server queue (`queue-effect.ts:40`, `mirror-choice.ts:117`).
4. A second Reanimation while one is armed and the Lot 69 slot outlet stay enabled, with no new reason code: the client may be less strict than the server, which rejects them with an illegal-action toast (`reanimation.ts` `canPlay`; golden rule 8). Whether Reanimation should get its own reason is a designer question (Appendix B, Q4).
5. Tax at 1 life stays enabled (`tax.ts:16`). `not-enough-lives` and `no-living-spy` are never produced here; L73-10 and L73-09 own their fixtures.
6. Multi-attack is hidden below `MULTI_ATTACK_MIN_ATTACKS` hand attacks, never a special (MEGA ATTACK) row (`assassin-candidates.ts:91-93`, Q44).
7. Routing is computed even when Use is disabled, so the sheet can show seats, tiles or options read-only. Tiles take Use's reason first, then their own price.
8. Seat ids keep `view.players` order and never include `view.you`.
9. Copy: the `DISABLED_REASON_COPY` rows of the Appendix B New strings table. Reuse V2 text where the same case had text: the illegal-action titles and the card dialog lines. `actions-locked` drops the card-only tail of the V2 line because Shop and Unspy share the copy.
10. `temporarily-unavailable` gets its fixture through a hoisted `vi.mock` of `@card-battle/shared` in its own file, because the shared list is empty. No production seam is added for it.

---

### Task L73-07: Add in-play card actions: own-only Upgrade and Deactivate

**Files:**
- Modify: `apps/client/src/view-model/card-actions.ts`
- Test: `apps/client/src/view-model/in-play-actions.test.ts` (create)
- Modify: `docs/agent/decisions.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

**Interfaces:**
- Consumes: `ACTIVE_SHIELD_INSTANCE_ID`, `isUpgradeableActiveCardId`, types `PersistentEffectView`,
  `PendingSentenceView` (`@card-battle/shared`); `persistentToCardInstance` (`./active-display`);
  `CARDS_WITH_ACTIVATED_ART` (`../ui/asset-lookup`); `actionLock`, `availabilityFor`.
- Produces (in `card-actions.ts`): the contract's three `CardRef` variants, plus:
  ```ts
  export type InPlayCardRef = Extract<CardRef, { zone: 'active' | 'shield' | 'sentence' }>;
  export type ThumbBadge =
    | { kind: 'card-lives'; value: number }      // PersistentEffectView.counter, any persistent but Invisibility
    | { kind: 'turns'; value: number }           // Invisibility remaining turns (L58-06)
    | { kind: 'sentence-turns'; value: number }; // PendingSentence.remainingOwnerTurns (not card lives)
  export interface InPlayThumb {
    ref: InPlayCardRef;       // feed it to cardActions for the sheet
    instance: CardInstance;   // face: instanceId = the model's instanceId, cardId, isUpgraded
    badge: ThumbBadge | null; // null for Shield and any counter-null persistent (Curse, Reanimation)
    // own Shield: ref and face carry self.shieldIsUpgraded; another seat's Shield: activeShield.isUpgraded
    activatedArt: boolean;    // the thumb art field: never for Shield or Sentence
  }
  export function inPlayThumbs(view: PlayingStateView, ownerPlayerId: string): readonly InPlayThumb[];
  ```
  `CardActionsModel.instanceId` for in-play refs: active → `effect.id`; own Shield →
  `'active-shield'`; another seat's Shield → `` `active-shield:${ownerPlayerId}` ``; Sentence →
  `sentence.id`. L73-09 consumes `inPlayThumbs` and `InPlayThumb` (with its `InPlayCardRef` and `ThumbBadge` fields).

- [ ] **Step 1: Write the failing tests.** `in-play-actions.test.ts` (15 blocks):
```ts
import type { PendingSentenceView, PersistentEffectView, PlayingStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import { cardActions, inPlayThumbs, type CardRef } from './card-actions';
import { makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const ON_TURN: ActionContext = { subChoice: null, readOnly: false };
const MIRROR_OPEN: ActionContext = { subChoice: { kind: 'mirror', eligibleEffectIds: ['fx-1'], deadlineMs: 0 }, readOnly: false };
const POISON = makePersistent({ id: 'pe-poison', cardId: 'poison', counter: 3 });
const CURSE = makePersistent({ id: 'pe-curse', cardId: 'curse' });
const P1_POISON = makePersistent({ id: 'pe-p1-poison', cardId: 'poison', counter: 4 });
const OWN_SENTENCE: PendingSentenceView = { id: 'sentence:4:me:0', sourcePlayerId: 'me', remainingOwnerTurns: 3, isUpgraded: false };
const P1_SENTENCE: PendingSentenceView = { id: 'sentence:5:p1:0', sourcePlayerId: 'p1', remainingOwnerTurns: 2, isUpgraded: false };
const UPGRADE_ON = { kind: 'upgrade', enabled: true, reason: null } as const;
const DEACTIVATE_ON = { kind: 'deactivate', enabled: true, reason: null } as const;

/** Four own slots (Shield, Poison, Curse on me, Sentence; rules spec "Active slots") and p1's Shield, Poison, Sentence. */
function board(upgradePoints: number, actives: readonly PersistentEffectView[] = [POISON, CURSE], overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  return makePlayingView({
    players: [
      makePlayer('me', { isYou: true, activeShield: { isUpgraded: false }, activePersistentEffects: actives }),
      makePlayer('p1', { activeShield: { isUpgraded: false }, activePersistentEffects: [P1_POISON] }),
      makePlayer('p2'),
    ],
    self: makeSelf({ upgradePoints, shield: 4, activePersistentEffects: actives }),
    pendingSentences: [OWN_SENTENCE, P1_SENTENCE],
    ...overrides,
  });
}
const active = (ownerPlayerId: string, effect: PersistentEffectView): CardRef => ({ zone: 'active', ownerPlayerId, effect });
const shield = (ownerPlayerId: string, isUpgraded = false): CardRef => ({ zone: 'shield', ownerPlayerId, isUpgraded });
const sentence = (entry: PendingSentenceView, ownerPlayerId = entry.sourcePlayerId): CardRef => ({ zone: 'sentence', ownerPlayerId, sentence: entry });
const actionsOf = (view: PlayingStateView, ref: CardRef, ctx = ON_TURN) => cardActions(view, ref, ctx).actions;
```
`describe('cardActions: own-only Upgrade in play (Q37)')`:
1. `offers no Upgrade on an opponent's base Shield, even with an own base Shield and 1 upgrade point`: `cardActions(board(1), shield('p1'), ON_TURN)` → `actions []`, `instanceId 'active-shield:p1'`; `shield('me')` on the same board → `actions [UPGRADE_ON]`, `instanceId 'active-shield'`.
2. `it.each<[string, CardRef, string]>([['own Poison', active('me', POISON), 'pe-poison'], ['own Shield', shield('me'), 'active-shield'], ['own Sentence', sentence(OWN_SENTENCE), 'sentence:4:me:0']])('%s offers Upgrade at 1 upgrade point and shows it disabled at 0', …)`: at `board(1)` the model's `instanceId` is the third column and its upgrade action `toEqual(UPGRADE_ON)`; at `board(0)` it is `{ kind: 'upgrade', enabled: false, reason: 'no-upgrade-point' }`.
3. `gives an opponent's Poison and Sentence a read-only sheet`: `actionsOf(board(1), active('p1', P1_POISON))` and `actionsOf(board(1), sentence(P1_SENTENCE))` → `[]`.
4. `hides Upgrade on Curse, Reanimation and anything already upgraded, at exactly 1 upgrade point`: with `const reanimation = makePersistent({ id: 'pe-rean', cardId: 'reanimation' })`, `const upgradedPoison = makePersistent({ id: 'pe-poison-up', cardId: 'poison', isUpgraded: true, counter: 3 })`, `const upgradedSentence = { ...OWN_SENTENCE, isUpgraded: true }` and `const view = board(1, [CURSE, reanimation, upgradedPoison], { self: makeSelf({ upgradePoints: 1, shield: 4, shieldIsUpgraded: true, activePersistentEffects: [CURSE, reanimation, upgradedPoison] }), pendingSentences: [upgradedSentence] })`: Curse, Reanimation and the upgraded Poison → `[DEACTIVATE_ON]`; `shield('me', true)` → `[]`; `sentence(upgradedSentence)` → `[]`.
5. `upgrades own Invisibility: Upgrade is not pacifist-locked`: `const inv = makePersistent({ id: 'pe-inv', cardId: 'invisibility', counter: 2 })`; `actionsOf(board(1, [inv]), active('me', inv))` → `[UPGRADE_ON, DEACTIVATE_ON]`.
6. `follows the server on ownership (upgrade-card.ts finds by id)`: `board(1, [POISON], { self: makeSelf({ upgradePoints: 1, shield: 0, activePersistentEffects: [POISON] }) })` + `shield('me')` → `[]`; `sentence(P1_SENTENCE, 'me')` on `board(1)` → `[]`; `active('me', P1_POISON)` → `[]`; `board(1, [POISON], { isSpectator: true })` + `shield('me')` → `[]`.
7. `never offers Use, Sell or Multi-attack on a card in play`: own Poison model → `use` null, `multiAttack` null, kinds `['upgrade', 'deactivate']`.

`describe('cardActions: Deactivate (Lot 69; Q40)')`:

8. `is absent on Shield and Sentence`: kinds for `shield('me')` and `sentence(OWN_SENTENCE)` on `board(1)` → `['upgrade']`.
9. `is offered on own persistents, a Curse on you included`: `actionsOf(board(0), active('me', CURSE))` → `[DEACTIVATE_ON]`; `actionsOf(board(0), active('me', POISON))` → `[{ kind: 'upgrade', enabled: false, reason: 'no-upgrade-point' }, DEACTIVATE_ON]`.
10. `is disabled off-turn and while a sub-choice is open`: `actionsOf(board(1, [POISON], { currentTurnPlayerId: 'p1' }), active('me', POISON))` → `[{ kind: 'upgrade', enabled: false, reason: 'not-your-turn' }, { kind: 'deactivate', enabled: false, reason: 'not-your-turn' }]`; `actionsOf(board(1), active('me', POISON), MIRROR_OPEN)` → the same two with `'actions-locked'`.
11. `is locked on the finished board`: `actionsOf(board(1), active('me', CURSE), { subChoice: null, readOnly: true })` → `[{ kind: 'deactivate', enabled: false, reason: 'actions-locked' }]`.

`describe('inPlayThumbs (Appendix A active-persistent-thumbs, sentence-chips, global-activated-art-guard)')`:

12. Own order and badges: `inPlayThumbs(board(1), 'me')` `toEqual([`
    `{ ref: shield('me'), instance: { instanceId: 'active-shield', cardId: 'shield', isUpgraded: false }, badge: null, activatedArt: false },`
    `{ ref: active('me', POISON), instance: { instanceId: 'pe-poison', cardId: 'poison', isUpgraded: false }, badge: { kind: 'card-lives', value: 3 }, activatedArt: true },`
    `{ ref: active('me', CURSE), instance: { instanceId: 'pe-curse', cardId: 'curse', isUpgraded: false }, badge: null, activatedArt: true },`
    `{ ref: sentence(OWN_SENTENCE), instance: { instanceId: 'sentence:4:me:0', cardId: 'sentence', isUpgraded: false }, badge: { kind: 'sentence-turns', value: 3 }, activatedArt: false } ])`.
    Then an upgraded own Shield: on `board(1, [POISON, CURSE], { self: makeSelf({ upgradePoints: 1, shield: 4, shieldIsUpgraded: true, activePersistentEffects: [POISON, CURSE] }) })`, the first thumb `toMatchObject({ ref: shield('me', true), instance: { instanceId: 'active-shield', cardId: 'shield', isUpgraded: true } })`. L73-09's strip relies on it.
13. Opponent: `inPlayThumbs(board(1), 'p1')` → Shield `{ ref: shield('p1'), instance: { instanceId: 'active-shield:p1', cardId: 'shield', isUpgraded: false }, badge: null, activatedArt: false }`, then `active('p1', P1_POISON)` with `{ kind: 'card-lives', value: 4 }`, then `sentence(P1_SENTENCE)` with `{ kind: 'sentence-turns', value: 2 }` and `activatedArt: false`. `inPlayThumbs(board(1), 'p2')` → `[]`.
14. `badges Invisibility with turns and drops the Shield thumb at 0 shield`: `board(0, [inv], { self: makeSelf({ shield: 0, activePersistentEffects: [inv] }), pendingSentences: [] })` → `[{ ref: active('me', inv), instance: { instanceId: 'pe-inv', cardId: 'invisibility', isUpgraded: false }, badge: { kind: 'turns', value: 2 }, activatedArt: true }]`.
15. `never requests activated art for Shield or Sentence, and its refs resolve to the intent ids`: `[...inPlayThumbs(board(1), 'me'), ...inPlayThumbs(board(1), 'p1')].filter((t) => t.ref.zone !== 'active').map((t) => t.activatedArt)` → `[false, false, false, false]`; `inPlayThumbs(board(1), 'me').map((t) => cardActions(board(1), t.ref, ON_TURN).instanceId)` → `['active-shield', 'pe-poison', 'pe-curse', 'sentence:4:me:0']`.

- [ ] **Step 2: Run them and see them fail.** `pnpm vitest run apps/client/src/view-model/in-play-actions.test.ts`.
  Expected: `TypeError: inPlayThumbs is not a function`, and the in-play refs throw reading `instance.instanceId` of `undefined`.

- [ ] **Step 3: Implement** the in-play branch of `cardActions` and `inPlayThumbs(view, ownerPlayerId)` in
  `card-actions.ts`. Approach: one ownership predicate that mirrors the server's lookups, then
  `availabilityFor(lock ?? check)` per action. Actions are `upgrade` then `deactivate`; `use` and
  `multiAttack` are `null`.
  ```ts
  /** The POV owns it exactly when the server would find it (upgrade-card.ts:44-108; list-legal-deactivate.ts:23-31). */
  function ownInPlay(view: PlayingStateView, ref: InPlayCardRef): { upgradeable: boolean; deactivatable: boolean } | null {
    if (view.isSpectator === true || ref.ownerPlayerId !== view.you) return null;
    if (ref.zone === 'shield') return view.self.shield > 0 ? { upgradeable: !view.self.shieldIsUpgraded, deactivatable: false } : null;
    if (ref.zone === 'sentence') {
      const entry = view.pendingSentences.find((s) => s.id === ref.sentence.id && s.sourcePlayerId === view.you);
      return entry === undefined ? null : { upgradeable: !entry.isUpgraded, deactivatable: false };
    }
    const effect = view.self.activePersistentEffects.find((e) => e.id === ref.effect.id);
    return effect === undefined ? null
      : { upgradeable: !effect.isUpgraded && isUpgradeableActiveCardId(effect.cardId), deactivatable: true };
  }
  ```
  `null` gives `actions: []` (read-only sheet). Upgrade's check is `self.upgradePoints < 1 ? 'no-upgrade-point'`;
  Deactivate's is the lock only (`actionLock` covers the sub-choice gate, `game-room.ts:1820`).
  `inPlayThumbs`: when `ownerPlayerId === view.you` and not a walk-in, it reads the Shield from
  `self.shield > 0` / `self.shieldIsUpgraded` and the persistents from `self.activePersistentEffects`;
  otherwise it reads `activeShield` / `activePersistentEffects` from the `view.players` entry (none → `[]`).
  Faces: own Shield `{ instanceId: 'active-shield', cardId: 'shield', isUpgraded: self.shieldIsUpgraded }`
  with ref `{ zone: 'shield', ownerPlayerId, isUpgraded: self.shieldIsUpgraded }`; another seat's Shield
  uses `active-shield:<playerId>` and `activeShield.isUpgraded`; an active is `persistentToCardInstance(effect)`;
  a Sentence is `{ instanceId: sentence.id, cardId: 'sentence', isUpgraded: sentence.isUpgraded }`.
  L73-09 builds its own thumbs from this function, so every field here is consumed there.
  Sentences come from `view.pendingSentences` with `sourcePlayerId === ownerPlayerId`, in array
  order. The order is Shield, persistents, Sentences (V2 `private-zone.tsx:76-90`). Badges: a persistent with
  `counter !== null` gets `turns` for `invisibility`, else `card-lives`; a counter of `null` gets no
  badge (`active-persistent-thumb.tsx:29-53`). `activatedArt` is `zone === 'active'` and the card is
  in a module-level `new Set<string>(CARDS_WITH_ACTIVATED_ART)`.

- [ ] **Step 4: Run them and see them pass.** `pnpm vitest run apps/client/src/view-model/in-play-actions.test.ts apps/client/src/view-model/card-actions.test.ts`:
  both green, with no L73-06 block changed.

- [ ] **Step 5: Docs.**
- `docs/agent/frontend.md`: append after the L73-06 bullet. It supersedes no line, because the V2 inspect dialog is unchanged:
  ```markdown
  - **In-play cards (L73-07).** `cardActions` also takes `active`, `shield` and `sentence` refs.
    Upgrade is offered only on the POV's own active persistent in `UPGRADEABLE_ACTIVE_CARD_IDS`, own
    Shield while `self.shield > 0` (`active-shield`) and own ticking Sentence (its id). It is disabled
    at 0 upgrade points, off-turn and while locked, and hidden once upgraded and for Curse and
    Reanimation (Q37). Another seat's card in play gets a read-only sheet; its Shield model id is
    `active-shield:<playerId>`, never the POV's. Deactivate is offered on own persistents only, never
    Shield or Sentence, and is disabled off-turn and during a sub-choice (Q40); the Lot 69 confirm
    stays a UI step. `inPlayThumbs(view, ownerPlayerId)` lists a seat's Shield, persistents and
    ticking Sentences with their `ThumbBadge` and `activatedArt`, which is never true for Shield or
    Sentence (Appendix A `global-activated-art-guard`). The V2 table keeps `activeUpgradeInstanceId`
    until L75.
  ```
- `docs/agent/decisions.md`: append at the end, after the L73-06 entry's closing `---`; the entry closes with its own `---`:
  ```markdown
  ## 2026-10-27 · [P] V7 in-play Upgrade is own-only; Deactivate locks during a sub-choice (L73-07)

  Source: technical spec v7 §11 and §13 (Q37, Q40); Appendix A `table-inspect-active-upgrade`,
  `card-inspect-dialog`, `deactivate-confirm-dialog`; `apps/server/src/engine/economy/upgrade-card.ts`,
  `apps/server/src/engine/turn/list-legal-economy.ts`, `apps/server/src/rooms/game-room.ts` `handleAction`.

  - **Q37.** The V7 `cardActions` offers Upgrade on a card in play only when the server would find it as
    the POV's own. That is an own active persistent in `UPGRADEABLE_ACTIVE_CARD_IDS` (by effect id in
    `self.activePersistentEffects`), the own Shield while `self.shield > 0` (`active-shield`), or an own
    ticking Sentence (`PendingSentence.id` with `sourcePlayerId === you`). Another seat's active, Shield
    or Sentence gets a read-only sheet, and its Shield model id is `active-shield:<playerId>`, so no path
    can send it as the POV's Shield. Upgrade is disabled with its reason at 0 upgrade points (V2 hid it),
    off-turn and while locked. It is hidden once upgraded and for Curse and Reanimation.
  - **V2 unchanged.** The V2 table keeps `activeUpgradeInstanceId` and its opponent-Shield bug until the
    L75 flip, because Lot 73 changes nothing a player sees (spec v7 §10.4, §12.3). L74-09 pins the
    regression in the rendered path.
  - **Q40.** Deactivate is offered on own active persistents only (a Curse on you and Reanimation
    included), never on Shield or Sentence. It is disabled, not hidden, off-turn (`not-your-turn`) and
    while actions are locked, an open sub-choice included (`actions-locked`), because the server rejects
    it then (`handleAction` sub-choice gate). V2 gated it on `isMyTurn` only and hid it off-turn.
  - **Thumbs.** Shield and Sentence never request activated art. A persistent requests it only when
    `CARDS_WITH_ACTIVATED_ART` lists it (Appendix A `global-activated-art-guard`).

  ---
  ```
- `docs/backlog_v7.md`: row L73-07 `To do` → `Done`; Progress `| 73 · View-model | 13 | 6 |` → `| 73 · View-model | 13 | 7 |` and `| **Total** | **134** | **27** |` → `| **Total** | **134** | **28** |`.

- [ ] **Step 6: Verify and commit.**
```bash
pnpm verify
git add apps/client/src/view-model/card-actions.ts apps/client/src/view-model/in-play-actions.test.ts \
  docs/agent/decisions.md docs/agent/frontend.md docs/backlog_v7.md
git commit -F - <<'EOF'
feat(view-model): add in-play actions (L73-07)

Upgrade in play is offered only on the POV's own actives, Shield and
ticking Sentences (Q37); another seat's Shield carries a per-seat id.
Deactivate is disabled off-turn and during a sub-choice (Q40). The V2
table keeps activeUpgradeInstanceId until L75. Recorded in decisions.md.
EOF
```

**Acceptance map:**
- An opponent's base Shield offers no Upgrade, even with an own base Shield and 1 upgrade point: block 1.
- Own Poison, Shield and Sentence offer Upgrade at 1 upgrade point and show it disabled at 0: block 2.
- Deactivate is absent on Shield and Sentence (block 8), and disabled off-turn and during a sub-choice (block 10).
- Shield and Sentence thumbs never request activated art: block 15 (blocks 12–14 pin each thumb's `activatedArt`).
- `pnpm verify` green: Step 6.

**Decisions:**
1. Ownership is the server's lookup, not the ref's claim: an id the server cannot find as the POV's own gives no action (`upgrade-card.ts:44-108`). A Sentence's owner is its `sourcePlayerId`.
2. Upgraded state comes from `self` (`shieldIsUpgraded`, the own effect, the `pendingSentences` entry). The ref's copy is ignored for own cards.
3. Another seat's Shield id is `active-shield:<playerId>`: it is unique per seat and can never be sent as the own Shield (Q37 defence in depth). No intent ever carries it.
4. Upgrade at 0 upgrade points is disabled, not hidden (Acceptance; V2 hid it). Deactivate off-turn is disabled, not hidden (Q40; V2 hid it).
5. A walk-in owns nothing in play: its `self` is filler data (Q38).
6. Badges reproduce V2 (`counter !== null`; Invisibility is `turns`), and Sentence adds `sentence-turns`. `activatedArt` uses a `Set` built from `CARDS_WITH_ACTIVATED_ART`, not a widening cast.

---

### Task L73-08: Add drop zones and dropTarget()

**Files:**
- Create: `apps/client/src/view-model/drop-target.ts`
- Test: `apps/client/src/view-model/drop-target.test.ts` (create)
- Modify: `apps/client/src/view-model/card-actions.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

**Interfaces:**
- Consumes: `CardActionsModel`, `cardActions`, `CardRef` (`./card-actions`); `PlayCardPayload`,
  `SellCardPayload` (`@card-battle/shared`).
- Produces: `drop-target.ts`: `Rect`, `Point`, `DropZoneRects`, `CardIntent`, `DropResult`, `dropTarget`
  (contract shapes). `card-actions.ts`:
  ```ts
  export type PlateDrop = 'send' | 'regeneration' | 'consume';
  export interface DropZones {
    seatIds: readonly string[]; // seats that accept the card: Use enabled and routed 'target'
    plate: PlateDrop | null;    // what a plate drop does: Use enabled and routed send / regeneration / consume
    sell: boolean;              // Sell present and enabled (hand shared cards only)
  }
  // CardActionsModel gains: drop: DropZones; canDrag: boolean
  ```

- [ ] **Step 1: Write the failing tests.** `drop-target.test.ts` (15 blocks):
```ts
import type { CardId, PlayingStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import { cardActions, type CardRef, type DropZones } from './card-actions';
import { dropTarget, type DropZoneRects, type Point } from './drop-target';
import { makeCard, makePending, makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const ON_TURN: ActionContext = { subChoice: null, readOnly: false };
const RECTS: DropZoneRects = {
  seats: [
    { playerId: 'p1', rect: { left: 0, top: 0, width: 100, height: 80 } },
    { playerId: 'p2', rect: { left: 120, top: 0, width: 100, height: 80 } },  // living Invisible
    { playerId: 'c1', rect: { left: 240, top: 0, width: 100, height: 80 } },  // corpse, attack pending on me
    { playerId: 'c4', rect: { left: 360, top: 0, width: 100, height: 80 } },  // corpse, nothing pending on me
  ],
  plate: { left: 100, top: 200, width: 200, height: 120 },
  sell: { left: 0, top: 400, width: 120, height: 60 },
};
const AT = { p1: { x: 50, y: 40 }, p2: { x: 170, y: 40 }, c1: { x: 290, y: 40 }, c4: { x: 410, y: 40 },
  plate: { x: 200, y: 260 }, sell: { x: 60, y: 430 }, nowhere: { x: 600, y: 600 } } satisfies Record<string, Point>;
function table(overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  return makePlayingView({
    turnOrder: ['me', 'p1', 'p2', 'c1', 'c4'],
    players: [makePlayer('me', { isYou: true }), makePlayer('p1'),
      makePlayer('p2', { activePersistentEffects: [makePersistent({ id: 'pe-inv', cardId: 'invisibility', counter: 3 })] }),
      makePlayer('c1', { isEliminated: true }), makePlayer('c4', { isEliminated: true })],
    self: makeSelf({ points: 30, hand: [makeCard('basic-attack'), makeCard('shield'), makeCard('regeneration')] }),
    pendingEffects: [makePending({ id: 'fx-c1', sourcePlayerId: 'c1', targetPlayerId: 'me', cardId: 'basic-attack' })],
    ...overrides,
  });
}
const hand = (cardId: CardId, isUpgraded = false): CardRef => ({ zone: 'hand', instance: makeCard(cardId, { isUpgraded }) });
const special = (cardId: CardId, isUpgraded = false): CardRef => ({ zone: 'special', instance: makeCard(cardId, { isUpgraded }) });
const drop = (ref: CardRef, at: Point, view = table(), rects = RECTS, ctx = ON_TURN) => dropTarget(at, rects, cardActions(view, ref, ctx));
const play = (instanceId: string, targetPlayerId?: string) => ({ kind: 'intent', intent: { kind: 'playCard',
  payload: targetPlayerId === undefined ? { instanceId } : { instanceId, targetPlayerId } } });
const sell = (instanceId: string) => ({ kind: 'intent', intent: { kind: 'sellCard', payload: { instanceId } } });
```
Acceptance blocks (every result is checked with `toStrictEqual`, so no `targetPlayerId: undefined` slips through):
1. `an attack dropped on a valid seat returns playCard with that target`: `drop(hand('basic-attack'), AT.p1)` → `play('basic-attack-1', 'p1')`; `AT.c1` → `play('basic-attack-1', 'c1')`.
2. `the same drop on a living Invisible seat or a non-qualifying corpse returns null`: `AT.p2` → `null`; `AT.c4` → `null`.
3. `MEGA ATTACK on a seat returns null; on the plate it returns playCard with no target`: `special('mega-attack')` at `AT.p1` → `null`; at `AT.plate` → `play('mega-attack-1')`.
4. `Regeneration on the plate opens its choice and sends nothing`: `hand('regeneration')` at `AT.plate` → `{ kind: 'open-choice', choice: 'regeneration' }`; `special('card-transformer')` → `{ kind: 'open-choice', choice: 'consume' }`.
5. `a special over the Sell zone returns null`: `special('cloning')` at `AT.sell` → `null`; `hand('shield')` → `sell('shield-1')`; `hand('basic-attack')` → `sell('basic-attack-1')`.
6. `off-turn no drag starts`: `cardActions(table({ currentTurnPlayerId: 'p1' }), hand('basic-attack'), ON_TURN).canDrag` → `false`; `drop(hand('basic-attack'), AT.p1, table({ currentTurnPlayerId: 'p1' }))` → `null`.

Further blocks:

7. `publishes the §6.6.3 drop zones`: `it.each<[string, CardRef, DropZones]>` on `table()` → `cardActions(...).drop`:
   - `hand('basic-attack')` → `{ seatIds: ['p1', 'c1'], plate: null, sell: true }`
   - `special('mega-attack')` → `{ seatIds: [], plate: 'send', sell: false }`
   - `hand('regeneration')` → `{ seatIds: [], plate: 'regeneration', sell: true }`
   - `special('card-transformer')` → `{ seatIds: [], plate: 'consume', sell: false }`
   - `hand('shield')` → `{ seatIds: [], plate: 'send', sell: true }`
   - `special('card-thief', true)` → `{ seatIds: [], plate: 'send', sell: false }`
   - `special('cloning')` → `{ seatIds: ['p1'], plate: null, sell: false }`
8. `a disabled Use opens no seat or plate, but Sell still takes a hand card`: `const broke = table({ self: makeSelf({ points: 0, hand: [makeCard('basic-attack')] }) })`; `cardActions(broke, hand('basic-attack'), ON_TURN)` → `drop` `{ seatIds: [], plate: null, sell: true }`, `canDrag true`; `drop(hand('basic-attack'), AT.p1, broke)` → `null`; at `AT.sell` → `sell('basic-attack-1')`.
9. `canDrag is false while locked, for read-only and in-play cards, and when no zone takes the card`: on `table()`, `canDrag` → `false` for `hand('basic-attack')` with `{ subChoice: { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 0 }, readOnly: false }`, for `hand('basic-attack')` with `{ subChoice: null, readOnly: true }`, for `{ zone: 'read-only', instance: makeCard('basic-attack') }`, for `{ zone: 'shield', ownerPlayerId: 'me', isUpgraded: false }` on `table({ self: makeSelf({ shield: 4 }) })`, and for `special('cloning')` on `table({ self: makeSelf({ points: 0 }) })`. It is `true` for `hand('basic-attack')` on `table()`.
10. `an attack over the plate or nowhere returns null`: `hand('basic-attack')` at `AT.plate` and `AT.nowhere` → `null`.
11. `returns null inside two valid zones`: `const overlap: DropZoneRects = { ...RECTS, seats: [{ playerId: 'p1', rect: { left: 0, top: 0, width: 100, height: 80 } }, { playerId: 'c1', rect: { left: 50, top: 0, width: 100, height: 80 } }] }`; `drop(hand('basic-attack'), { x: 75, y: 40 }, table(), overlap)` → `null`; at `{ x: 25, y: 40 }` → `play('basic-attack-1', 'p1')`.
12. `treats rects as half-open, so a shared edge belongs to one zone`: seats `p1` `{ left: 0, top: 0, width: 100, height: 80 }` and `c1` `{ left: 100, top: 0, width: 100, height: 80 }`; at `{ x: 100, y: 40 }` → `play('basic-attack-1', 'c1')`.
13. `an invalid seat under the pointer wins`: `const onPlate: DropZoneRects = { ...RECTS, seats: [{ playerId: 'p1', rect: { left: 150, top: 220, width: 60, height: 60 } }] }`; `special('mega-attack')` at `AT.plate` with `onPlate` → `null`.
14. `refuses a seat drop for upgraded thieves and sends them from the plate (Appendix A table-use-target-routing)`: `special('card-thief', true)` at `AT.p1` → `null`; at `AT.plate` → `play('card-thief-1')`.
15. `drops nowhere on the plate when the plate rect is absent`: `drop(special('mega-attack'), AT.plate, table(), { ...RECTS, plate: null })` → `null`.

- [ ] **Step 2: Run them and see them fail.** `pnpm vitest run apps/client/src/view-model/drop-target.test.ts`.
  Expected: `Failed to resolve import "./drop-target"`.

- [ ] **Step 3: Implement.**
- `card-actions.ts`: every model gets `drop` and `canDrag`. In-play and read-only refs give
  `{ seatIds: [], plate: null, sell: false }` and `false`. A hand or special ref gives
  `seatIds = useEnabled && use.kind === 'target' ? use.seatIds : []`,
  `plate = useEnabled && use.kind !== 'target' ? use.kind : null` (`'send' | 'regeneration' | 'consume'`)
  and `sell = sell action present && enabled`.
  `canDrag = actionLock(view, ctx) === null && (seatIds.length > 0 || plate !== null || sell)`.
- `drop-target.ts`: `export function dropTarget(pointer: Point, zoneRects: DropZoneRects, actions: CardActionsModel): DropResult | null`.
  Pure rectangle math, no DOM (§12.2):
  ```ts
  /** Half-open, so two rects that share an edge never both contain a point. */
  const contains = (r: Rect, p: Point) => p.x >= r.left && p.x < r.left + r.width && p.y >= r.top && p.y < r.top + r.height;
  if (!actions.canDrag) return null;
  const hits: DropResult[] = [];
  for (const seat of zoneRects.seats) {
    if (!contains(seat.rect, pointer)) continue;
    if (!actions.drop.seatIds.includes(seat.playerId)) return null; // over an invalid seat (§6.6.4)
    hits.push(playCard({ instanceId: actions.instanceId, targetPlayerId: seat.playerId }));
  }
  if (actions.drop.plate !== null && zoneRects.plate !== null && contains(zoneRects.plate, pointer))
    hits.push(actions.drop.plate === 'send' ? playCard({ instanceId: actions.instanceId })
      : { kind: 'open-choice', choice: actions.drop.plate });
  if (actions.drop.sell && zoneRects.sell !== null && contains(zoneRects.sell, pointer))
    hits.push({ kind: 'intent', intent: { kind: 'sellCard', payload: { instanceId: actions.instanceId } } });
  return hits.length === 1 ? (hits[0] ?? null) : null; // none, or two valid zones
  ```
  `playCard(payload)` wraps `{ kind: 'intent', intent: { kind: 'playCard', payload } }`. The
  no-target payload has no `targetPlayerId` key (`exactOptionalPropertyTypes`). Doc comments cite spec v7 §6.6.3–§6.6.4.

- [ ] **Step 4: Run them and see them pass.** `pnpm vitest run apps/client/src/view-model/drop-target.test.ts apps/client/src/view-model/card-actions.test.ts apps/client/src/view-model/in-play-actions.test.ts`: all green.

- [ ] **Step 5: Docs.**
- `docs/agent/frontend.md`: append after the L73-07 bullet. It supersedes no line:
  ```markdown
  - **Drag and drop (L73-08).** `cardActions` adds `drop` (valid seats, what the plate does, Sell) and
    `canDrag`, which is false off-turn, while locked, for read-only and in-play cards, and when no zone
    takes the card; the arena adds the tutorial tour and Look gate. A disabled Use opens no seat or
    plate zone. `view-model/drop-target.ts` `dropTarget(pointer, zoneRects, actions)` is pure
    rectangle math on half-open rects, with no DOM. It returns the exact `playCard` / `sellCard`
    intent, an open-choice result for Regeneration and Card Transformer, or `null` over an invalid
    seat, outside every valid zone, or inside two (spec v7 §6.6.3–§6.6.4).
  ```
- `docs/backlog_v7.md`: row L73-08 `To do` → `Done`; Progress `| 73 · View-model | 13 | 7 |` → `| 73 · View-model | 13 | 8 |` and `| **Total** | **134** | **28** |` → `| **Total** | **134** | **29** |`.

- [ ] **Step 6: Verify and commit.**
```bash
pnpm verify
git add apps/client/src/view-model/drop-target.ts apps/client/src/view-model/drop-target.test.ts \
  apps/client/src/view-model/card-actions.ts docs/agent/frontend.md docs/backlog_v7.md
git commit -m "feat(view-model): add dropTarget() (L73-08)"
```

**Acceptance map:** the six Acceptance clauses are blocks 1–6, in order: an attack on a valid seat (1); a living Invisible seat or a non-qualifying corpse (2); MEGA ATTACK on a seat and on the plate (3); Regeneration on the plate (4); a special over Sell (5); off-turn, no drag (6). `pnpm verify` green: Step 6.

**Decisions:**
1. Drop zones come only from enabled actions: a disabled Use can never produce an intent the server would reject. Sell is independent of Use.
2. An invalid seat under the pointer returns `null` even when another valid zone also contains it (Acceptance: "over an invalid seat"). Overlapping rects are the caller's layout bug, resolved safely.
3. Rects are half-open (`[left, left + width)`), so an edge never counts as two zones.
4. `canDrag` is also false when no zone accepts the card, so no drag starts that can only snap back. The tap still opens the sheet with the reason (§5.4).
5. Upgraded thieves refuse a seat drop and send from the plate (Appendix A `table-use-target-routing` Keep: "refused or treated as 'all'" — refused).
6. Multi-attack has no drop path (§6.6.3 lists none); it stays a sheet flow.

---

### Task L73-09: Add selfStrip() and the dock

**Files:**
- Create: `apps/client/src/view-model/self-strip.ts`
- Test: `apps/client/src/view-model/self-strip.test.ts`
- Modify:
  - `docs/agent/frontend.md` (one new bullet in `## View-model layer (V7 · Lot 72+)`)
  - `docs/agent/decisions.md` (one appended entry)
  - `docs/backlog_v7.md` (L73-09 row and Progress table)
- Untouched, and these tests must stay green unchanged: `screens/table/economy-bar.tsx`, `private-zone.tsx` and `unspy-dialog.tsx`, with `economy-bar.test.ts`, `economy-bar.chrome-labels.test.ts`, `cost-chrome.test.ts`, `private-zone.test.ts` and `unspy-dialog.test.ts`. The old table keeps its dock until L75 (§10.4).

**Interfaces:**
- Consumes:
  - `ActionContext`, `actionLock` and `LockReason` from `./action-lock` (L73-06).
  - `ActionAvailability`, `DisabledReason`, `availabilityFor` and `DISABLED_REASON_COPY` from `./action-reasons` (L73-06). Every availability is built with `availabilityFor`; tests use the copy only.
  - `cardActions`, `CardActionsModel`, `inPlayThumbs` and `InPlayThumb` from `./card-actions` (L73-07).
  - `povModeOf`, `PovMode`, `connectionLabel` and `seatColorIndexOf` from `./seats` (L73-02).
  - `livingSpiesOnYou` from `./table-helpers`.
  - `CLEAR_SPY_COST` and `getKit` from `@card-battle/shared`, and the types `KitId`, `PlayingStateView` and `PublicPlayerView`.
  - `StructuredCost` from `../ui/structured-cost`.
  - The fixtures `makePlayer`, `makeSelf`, `makePlayingView` and `makePersistent` from `./test-fixtures`.
- Produces (all exported from `self-strip.ts`):

```ts
/** §10.6 strings, keyed by the L73-02 `PovMode` values. Both are verbatim V2 text (flow-status-badges.tsx, table.tsx). */
export const SELF_STRIP_POV_LABELS = {
  reanimating: 'Reanimating',
  watching: 'Watching',
} as const satisfies Readonly<Record<Extract<PovMode, 'reanimating' | 'watching'>, string>>;
/** L64-05: Draw turns hot above the catalog Gambler payout (economy-bar.tsx `drawValue > 10`). */
export const DRAW_HOT_ABOVE = 10;

/** One own thumb: an L73-07 `InPlayThumb` (ref, instance, badge, activatedArt) plus its in-play actions. */
export interface SelfThumb extends InPlayThumb {
  actions: CardActionsModel;  // cardActions(view, thumb.ref, ctx); ref.ownerPlayerId is always view.you
}
export interface SelfResources { lives: number; shield: number; shieldIsUpgraded: boolean; points: number; upgradePoints: number }
export type SelfFlowBadge =
  | { kind: 'block'; turnsLeft: number }
  | { kind: 'attack-ban' }
  | { kind: 'invisibility'; turnsLeft: number | null }
  | { kind: 'reanimating' };
export interface DrawControl extends ActionAvailability { gain: number; hot: boolean }
export interface DockShopEntry { browseOnly: boolean }
export interface UnspyControl extends ActionAvailability {
  cost: StructuredCost;               // { kind: 'points', amount: CLEAR_SPY_COST }
  spyIds: readonly string[];          // livingSpiesOnYou(view), view.players order
  preselectedSpyId: string | null;    // the single spy (L58-09), else null
}
export interface DockModel {
  draw: DrawControl | null;           // null on the finished board and for a walk-in
  shop: DockShopEntry | null;         // null only for a walk-in (Q38)
  unspy: UnspyControl | null;         // Seated or Reanimating POV only; null on the finished board
  duplication: ActionAvailability | null; // Duplicator, not active, not finished, not a walk-in
  stats: boolean;                     // true exactly on the finished board (ctx.readOnly)
}
export interface SelfStripModel {
  playerId: string;                   // view.you
  pov: PovMode;                       // povModeOf(view) (L73-02)
  povLabel: string | null;            // null when seated
  leave: boolean;                     // 'Watching' with Leave; false on the finished board
  seatColorIndex: number | null;      // seatColorIndexOf(view, view.you) (L73-02); null for a walk-in
  isActive: boolean;                  // currentTurnPlayerId === view.you
  kitId: KitId | null;                // null for a walk-in
  resources: SelfResources | null;    // null for a walk-in
  thumbs: readonly SelfThumb[];       // Shield (shield > 0), own actives, own ticking Sentences
  connectionLabel: string | null;     // connectionLabel(players[you]) (L73-02); null for a walk-in
  flowBadges: readonly SelfFlowBadge[];
  duplicationActive: boolean;
  dock: DockModel;
}
export function selfStrip(view: PlayingStateView, ctx: ActionContext): SelfStripModel;
```

- [ ] **Step 1: Write the failing tests.** Create `apps/client/src/view-model/self-strip.test.ts`:

```ts
/**
 * selfStrip() and the dock: technical spec v7 §6.1 items 3 and 5, §6.3, §6.12 and §11 (L73-09).
 */
import {
  CLEAR_SPY_COST,
  type PlayingStateView,
  type PublicPlayerView,
  type SubChoiceRequiredPayload,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import { DISABLED_REASON_COPY, type DisabledReason } from './action-reasons';
import { cardActions } from './card-actions';
import { selfStrip } from './self-strip';
import { makePersistent, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const FINISHED: ActionContext = { subChoice: null, readOnly: true };
const MIRROR_OPEN: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };
const SUB_CHOICE: ActionContext = { subChoice: MIRROR_OPEN, readOnly: false };

function viewWith(
  pov: Partial<PublicPlayerView>,
  rest: Partial<PlayingStateView> = {},
  opponents: readonly PublicPlayerView[] = [makePlayer('p1'), makePlayer('p2')],
): PlayingStateView {
  return makePlayingView({ ...rest, players: [makePlayer('me', { isYou: true, ...pov }), ...opponents] });
}

const SPY_P1 = [makePlayer('p1', { spyingOnYou: true }), makePlayer('p2')];

function walkInView(): PlayingStateView {
  return makePlayingView({
    you: 'spec',
    isSpectator: true,
    currentTurnPlayerId: 'p1',
    turnOrder: ['p1', 'p2'],
    players: [makePlayer('p1'), makePlayer('p2')],
    self: makeSelf({ kitId: 'untouchable', lives: 0 }),
  });
}

describe('selfStrip resources and thumbs (§6.1 item 3)', () => {
  it('carries exact own resources, the kit and the seat colour', () => {
    const strip = selfStrip(
      makePlayingView({ self: makeSelf({ lives: 7, shield: 3, shieldIsUpgraded: true, points: 12, upgradePoints: 2 }) }),
      LIVE,
    );
    expect(strip.playerId).toBe('me');
    expect(strip.kitId).toBe('kamikaze');
    expect(strip.seatColorIndex).toBe(0);
    expect(strip.isActive).toBe(true);
    expect(strip.resources).toEqual({ lives: 7, shield: 3, shieldIsUpgraded: true, points: 12, upgradePoints: 2 });
  });

  it('shows the Shield thumb only while shield > 0', () => {
    const down = selfStrip(makePlayingView({ self: makeSelf({ shield: 0 }) }), LIVE);
    expect(down.thumbs.some((thumb) => thumb.ref.zone === 'shield')).toBe(false);
    const up = selfStrip(makePlayingView({ self: makeSelf({ shield: 1, shieldIsUpgraded: true }) }), LIVE);
    expect(up.thumbs[0]?.ref).toEqual({ zone: 'shield', ownerPlayerId: 'me', isUpgraded: true });
    expect(up.thumbs[0]?.instance).toEqual({ instanceId: 'active-shield', cardId: 'shield', isUpgraded: true });
  });

  it('orders Shield, own actives, then own ticking Sentences, with badges and art', () => {
    const view = makePlayingView({
      self: makeSelf({
        shield: 4,
        activePersistentEffects: [
          makePersistent({ id: 'poison-1', cardId: 'poison', counter: 2 }),
          makePersistent({ id: 'curse-1', cardId: 'curse' }),
          makePersistent({ id: 'invis-1', cardId: 'invisibility', counter: 3 }),
        ],
      }),
      pendingSentences: [
        { id: 'sentence-1', sourcePlayerId: 'me', remainingOwnerTurns: 2, isUpgraded: false },
        { id: 'sentence-2', sourcePlayerId: 'p1', remainingOwnerTurns: 1, isUpgraded: false },
      ],
    });
    const strip = selfStrip(view, LIVE);
    expect(strip.thumbs.map((thumb) => thumb.ref.zone)).toEqual(['shield', 'active', 'active', 'active', 'sentence']);
    expect(strip.thumbs.every((thumb) => thumb.ref.ownerPlayerId === 'me')).toBe(true);
    expect(strip.thumbs.map((thumb) => thumb.actions.instanceId)).toEqual([
      'active-shield', 'poison-1', 'curse-1', 'invis-1', 'sentence-1',
    ]);
    expect(strip.thumbs.map((thumb) => thumb.badge)).toEqual([
      null,
      { kind: 'card-lives', value: 2 },
      null,
      { kind: 'turns', value: 3 },
      { kind: 'sentence-turns', value: 2 },
    ]);
    expect(strip.thumbs.map((thumb) => thumb.activatedArt)).toEqual([false, true, true, true, false]);
  });

  it('gives every thumb its in-play cardActions (L73-07)', () => {
    const view = makePlayingView({
      self: makeSelf({
        shield: 4,
        upgradePoints: 1,
        activePersistentEffects: [makePersistent({ id: 'poison-1', cardId: 'poison', counter: 2 })],
      }),
      pendingSentences: [{ id: 'sentence-1', sourcePlayerId: 'me', remainingOwnerTurns: 2, isUpgraded: false }],
    });
    const strip = selfStrip(view, LIVE);
    for (const thumb of strip.thumbs) {
      expect(thumb.actions).toEqual(cardActions(view, thumb.ref, LIVE));
    }
    expect(strip.thumbs[1]?.actions.actions.find((action) => action.kind === 'upgrade')).toEqual({
      kind: 'upgrade', enabled: true, reason: null,
    });
  });

  it('lists own Block, attack ban, Invisibility and Reanimating badges (§6.1 item 3)', () => {
    expect(selfStrip(viewWith({ blockTurnsRemaining: 2, blockAttacksForbidden: true }), LIVE).flowBadges)
      .toEqual([{ kind: 'block', turnsLeft: 2 }]);
    expect(selfStrip(viewWith({ blockAttacksForbidden: true }), LIVE).flowBadges).toEqual([{ kind: 'attack-ban' }]);
    const invisible = makePlayingView({
      self: makeSelf({ activePersistentEffects: [makePersistent({ id: 'invis-1', cardId: 'invisibility', counter: 4 })] }),
    });
    expect(selfStrip(invisible, LIVE).flowBadges).toEqual([{ kind: 'invisibility', turnsLeft: 4 }]);
    const reanimating = viewWith({ isEliminated: true, pendingReanimation: { isUpgraded: false } }, { currentTurnPlayerId: 'p1' });
    expect(selfStrip(reanimating, LIVE).flowBadges).toEqual([{ kind: 'reanimating' }]);
  });

  it('shows own connection state and Duplication active', () => {
    const strip = selfStrip(
      viewWith(
        { duplicationActive: true, connection: { status: 'connected', disconnectedAt: null, automaticTurnsTaken: 0, consecutiveTimeouts: 2 } },
        { self: makeSelf({ kitId: 'duplicator' }), currentTurnPlayerId: 'p1' },
      ),
      LIVE,
    );
    expect(strip.connectionLabel).toBe('idle timeouts 2/5');
    expect(strip.duplicationActive).toBe(true);
  });
});

describe('selfStrip POV label (§6.3, §6.12)', () => {
  it('a seated POV has no label and no Leave', () => {
    expect(selfStrip(makePlayingView(), LIVE)).toMatchObject({ pov: 'seated', povLabel: null, leave: false });
  });

  it('an eliminated POV with pendingReanimation is Reanimating', () => {
    const view = viewWith({ isEliminated: true, pendingReanimation: { isUpgraded: true } }, { currentTurnPlayerId: 'p1' });
    expect(selfStrip(view, LIVE)).toMatchObject({ pov: 'reanimating', povLabel: 'Reanimating', leave: false });
  });

  it('an eliminated POV without pendingReanimation is Watching with Leave', () => {
    const view = viewWith({ isEliminated: true }, { currentTurnPlayerId: 'p1' });
    expect(selfStrip(view, LIVE)).toMatchObject({ pov: 'watching', povLabel: 'Watching', leave: true });
  });

  it('a walk-in is Watching with Leave and shows no kit, resources or thumbs (Q38)', () => {
    expect(selfStrip(walkInView(), LIVE)).toMatchObject({
      pov: 'walk-in-fogged', povLabel: 'Watching', leave: true,
      kitId: null, resources: null, thumbs: [], seatColorIndex: null,
      connectionLabel: null, flowBadges: [], isActive: false,
    });
  });

  it('offers no strip Leave on the finished board (the flag is Return home)', () => {
    const view = viewWith({ isEliminated: true }, { currentTurnPlayerId: null, turnDeadlineMs: null });
    expect(selfStrip(view, FINISHED)).toMatchObject({ povLabel: 'Watching', leave: false });
  });
});

describe('dock (§6.1 item 5, §6.12)', () => {
  it('Draw pays the kit catalog draw, enabled on turn and locked off-turn', () => {
    expect(selfStrip(makePlayingView(), LIVE).dock.draw).toEqual({ gain: 1, hot: false, enabled: true, reason: null });
    expect(selfStrip(makePlayingView({ self: makeSelf({ kitId: 'tactician' }) }), LIVE).dock.draw?.gain).toBe(4);
    expect(selfStrip(makePlayingView({ currentTurnPlayerId: 'p1' }), LIVE).dock.draw)
      .toEqual({ gain: 1, hot: false, enabled: false, reason: 'not-your-turn' });
  });

  it('a Gambler payout of 14 is hot (L64-05)', () => {
    const view = viewWith({ drawGain: 14 }, { self: makeSelf({ kitId: 'gambler' }) });
    expect(selfStrip(view, LIVE).dock.draw).toEqual({ gain: 14, hot: true, enabled: true, reason: null });
  });

  it('a Gambler payout of exactly 10, or no rolled payout, is not hot', () => {
    const rolled = viewWith({ drawGain: 10 }, { self: makeSelf({ kitId: 'gambler' }) });
    expect(selfStrip(rolled, LIVE).dock.draw).toMatchObject({ gain: 10, hot: false });
    const catalog = makePlayingView({ self: makeSelf({ kitId: 'gambler' }) });
    expect(selfStrip(catalog, LIVE).dock.draw).toMatchObject({ gain: 10, hot: false });
  });

  it('Unspy is enabled with a living spy, 10 points and on turn (L58-07)', () => {
    const view = viewWith({}, { self: makeSelf({ points: 10 }) }, SPY_P1);
    expect(selfStrip(view, LIVE).dock.unspy).toEqual({
      enabled: true, reason: null,
      cost: { kind: 'points', amount: CLEAR_SPY_COST },
      spyIds: ['p1'], preselectedSpyId: 'p1',
    });
  });

  it.each<{ reason: DisabledReason; view: PlayingStateView; ctx: ActionContext }>([
    { reason: 'no-living-spy', view: viewWith({}, { self: makeSelf({ points: 10 }) }), ctx: LIVE },
    { reason: 'not-enough-points', view: viewWith({}, { self: makeSelf({ points: 9 }) }, SPY_P1), ctx: LIVE },
    { reason: 'not-your-turn', view: viewWith({}, { self: makeSelf({ points: 10 }), currentTurnPlayerId: 'p1' }, SPY_P1), ctx: LIVE },
    { reason: 'actions-locked', view: viewWith({}, { self: makeSelf({ points: 10 }) }, SPY_P1), ctx: SUB_CHOICE },
  ])('Unspy is disabled with $reason', ({ reason, view, ctx }) => {
    expect(selfStrip(view, ctx).dock.unspy).toMatchObject({ enabled: false, reason });
    expect(DISABLED_REASON_COPY[reason]).not.toBe('');
  });

  it('Unspy ignores a spy that is eliminated (no living spy)', () => {
    const view = viewWith({}, { self: makeSelf({ points: 30 }) }, [
      makePlayer('p1', { spyingOnYou: true, isEliminated: true }),
      makePlayer('p2'),
    ]);
    expect(selfStrip(view, LIVE).dock.unspy).toMatchObject({ enabled: false, reason: 'no-living-spy', spyIds: [], preselectedSpyId: null });
  });

  it('preselects nobody when two living seats spy you', () => {
    const view = viewWith({}, { self: makeSelf({ points: 10 }) }, [
      makePlayer('p1', { spyingOnYou: true }),
      makePlayer('p2', { spyingOnYou: true }),
    ]);
    expect(selfStrip(view, LIVE).dock.unspy).toMatchObject({ enabled: true, spyIds: ['p1', 'p2'], preselectedSpyId: null });
  });

  it('Shop is always openable, browse-only off-turn or locked', () => {
    expect(selfStrip(makePlayingView(), LIVE).dock.shop).toEqual({ browseOnly: false });
    expect(selfStrip(makePlayingView({ currentTurnPlayerId: 'p1' }), LIVE).dock.shop).toEqual({ browseOnly: true });
    expect(selfStrip(makePlayingView(), SUB_CHOICE).dock.shop).toEqual({ browseOnly: true });
  });

  it('offers Activate duplication to a Duplicator only while it is not active (L28-02)', () => {
    const self = makeSelf({ kitId: 'duplicator' });
    expect(selfStrip(viewWith({ duplicationActive: false }, { self }), LIVE).dock.duplication)
      .toEqual({ enabled: true, reason: null });
    expect(selfStrip(viewWith({ duplicationActive: false }, { self, currentTurnPlayerId: 'p1' }), LIVE).dock.duplication)
      .toEqual({ enabled: false, reason: 'not-your-turn' });
    expect(selfStrip(viewWith({ duplicationActive: false }, { self }), SUB_CHOICE).dock.duplication)
      .toEqual({ enabled: false, reason: 'actions-locked' });
    expect(selfStrip(viewWith({ duplicationActive: true }, { self, currentTurnPlayerId: 'p1' }), LIVE).dock.duplication)
      .toBeNull();
    expect(selfStrip(makePlayingView(), LIVE).dock.duplication).toBeNull();
  });

  it('a walk-in has no economy (Q38)', () => {
    expect(selfStrip(walkInView(), LIVE).dock).toEqual({ draw: null, shop: null, unspy: null, duplication: null, stats: false });
  });

  it('an eliminated POV keeps a locked dock; Unspy stays only while Reanimating (§6.3)', () => {
    const watching = selfStrip(
      viewWith({ isEliminated: true }, { currentTurnPlayerId: 'p1', self: makeSelf({ points: 20 }) }, SPY_P1),
      LIVE,
    ).dock;
    expect(watching.draw).toMatchObject({ enabled: false, reason: 'actions-locked' });
    expect(watching.shop).toEqual({ browseOnly: true });
    expect(watching.unspy).toBeNull();
    expect(watching.stats).toBe(false);
    const reanimating = selfStrip(
      viewWith({ isEliminated: true, pendingReanimation: { isUpgraded: false } }, { currentTurnPlayerId: 'p1', self: makeSelf({ points: 20 }) }, SPY_P1),
      LIVE,
    ).dock;
    expect(reanimating.unspy).toMatchObject({ enabled: false, reason: 'actions-locked' });
  });

  it('the finished board shows Stats and no Draw, Unspy or duplication; Shop is browse-only (§6.12)', () => {
    const view = viewWith({}, { turnDeadlineMs: null, self: makeSelf({ kitId: 'duplicator', points: 30 }) }, SPY_P1);
    expect(selfStrip(view, FINISHED).dock).toEqual({ draw: null, shop: { browseOnly: true }, unspy: null, duplication: null, stats: true });
    expect(selfStrip(walkInView(), FINISHED).dock).toEqual({ draw: null, shop: null, unspy: null, duplication: null, stats: true });
  });
});
```

That is 26 test cases: 6 in the resources block, 5 in the POV-label block and 15 in the dock block, with the `it.each` counted as 4.

- [ ] **Step 2: Run them and see them fail.** `pnpm vitest run apps/client/src/view-model/self-strip.test.ts`. Expected: the file errors with `Failed to resolve import "./self-strip"`, and no test runs.

- [ ] **Step 3: Implement** `selfStrip(view: PlayingStateView, ctx: ActionContext): SelfStripModel` in `apps/client/src/view-model/self-strip.ts`.
  - The file opens with a header that cites spec v7 §6.1 items 3 and 5, §6.3, §6.12, Q38, L58-07 and L64-05, and parity `private-zone-identity`, `economy-bar` and `unspy-dialog`.
  - **Approach:** read `pov` once from `povModeOf(view)`, `lock` once from `actionLock(view, ctx)`, and `me` from `view.players.find((player) => player.id === view.you)`. Every field then comes from one view field. Every availability is `availabilityFor(reason)` (L73-06); there is no private copy.
  - Identity: `seatColorIndex` is `null` for a walk-in, else `seatColorIndexOf(view, view.you)`. `connectionLabel` is `me === undefined ? null : connectionLabel(me)`, the L73-02 rule (null when connected or eliminated).
  - Thumbs: `[]` for a walk-in; otherwise `inPlayThumbs(view, view.you).map((thumb) => ({ ...thumb, actions: cardActions(view, thumb.ref, ctx) }))`. L73-07 already gives the order (Shield only while `self.shield > 0`, own actives from `self.activePersistentEffects`, then own ticking Sentences), the faces, badges and `activatedArt`.
  - Flow badges, in V2 `flow-status-badges.tsx` order:
    - `me.blockTurnsRemaining > 0` gives `block`; otherwise `me.blockAttacksForbidden` gives `attack-ban`.
    - An own `invisibility` effect in `view.self.activePersistentEffects` gives `invisibility`, with `turnsLeft: effect.counter`.
    - `me.pendingReanimation !== null` gives `reanimating`.
    - There are no badges when `me` is undefined, as for a walk-in.
  - POV label:
    - `seated` gives `null`.
    - `reanimating` gives `SELF_STRIP_POV_LABELS.reanimating`.
    - `watching` and `walk-in-fogged` give `SELF_STRIP_POV_LABELS.watching`.
    - `leave = !ctx.readOnly && (pov === 'watching' || pov === 'walk-in-fogged')`.
  - Walk-in (`view.isSpectator === true`): `kitId` and `resources` are `null` and `thumbs` is `[]`. The filler `self` is never read.
  - Dock:

```ts
function dockFor(view: PlayingStateView, ctx: ActionContext, pov: PovMode, me: PublicPlayerView | undefined, lock: LockReason | null): DockModel {
  if (view.isSpectator === true) {
    return { draw: null, shop: null, unspy: null, duplication: null, stats: ctx.readOnly };
  }
  const shop: DockShopEntry = { browseOnly: lock !== null };
  if (ctx.readOnly) {
    return { draw: null, shop, unspy: null, duplication: null, stats: true };
  }
  const gain = me?.drawGain ?? getKit(view.self.kitId).startingResources.draw;
  const spyIds = livingSpiesOnYou(view).map((player) => player.id);
  const unspyReason = lock ?? (spyIds.length === 0 ? 'no-living-spy' : view.self.points < CLEAR_SPY_COST ? 'not-enough-points' : null);
  return {
    draw: { gain, hot: gain > DRAW_HOT_ABOVE, ...availabilityFor(lock) },
    shop,
    unspy: pov === 'seated' || pov === 'reanimating'
      ? { cost: { kind: 'points', amount: CLEAR_SPY_COST }, spyIds, preselectedSpyId: spyIds.length === 1 ? (spyIds[0] ?? null) : null, ...availabilityFor(unspyReason) }
      : null,
    duplication: view.self.kitId === 'duplicator' && me?.duplicationActive !== true ? availabilityFor(lock) : null,
    stats: false,
  };
}
```

- [ ] **Step 4: Run them and see them pass.** `pnpm vitest run apps/client/src/view-model/self-strip.test.ts`. Expected: 26 passed. Then run `pnpm vitest run apps/client/src/screens/table` and confirm that the old-table tests still pass with no change.

- [ ] **Step 5: Docs.**
  - In `docs/agent/frontend.md`, append this bullet at the end of `## View-model layer (V7 · Lot 72+)`, after the L73-08 "Drag and drop" bullet:

```
- `view-model/self-strip.ts` (L73-09, technical spec v7 §6.1 items 3 and 5, §6.12):
  `selfStrip(view, ctx)` gives the self strip and, in `.dock`, the dock. Thumbs run combat
  Shield (only while `self.shield > 0`), own actives, then own ticking Sentences
  (`inPlayThumbs`, L73-07), and each carries `cardActions(view, ref, ctx)`. The POV mode,
  connection text and seat colour are L73-02's `povModeOf`, `connectionLabel` and
  `seatColorIndexOf`. Draw pays `players[you].drawGain ?? kit draw` and is
  `hot` above 10 (L64-05). Unspy is present for a Seated or Reanimating POV and absent for a
  Watching one. Its reason is the lock, then `no-living-spy`, then `not-enough-points`
  (L58-07). The finished board (`readOnly`) shows `stats` instead of Draw, Unspy and Activate
  duplication, and Shop is browse-only. A walk-in (`isSpectator`) gets no kit, resources,
  thumbs or economy (Q38).
```

  - Append to `docs/agent/decisions.md` at the end, after the L73-07 entry's closing `---`; the entry closes with its own `---`:

```
## 2026-10-27 · [P] V7 self strip and dock: walk-in, finished board and spectator Unspy (L73-09)

Source: technical spec v7 §6.1 items 3 and 5, §6.3, §6.12 and Appendix A Q38;
`apps/client/src/view-model/self-strip.ts`.

- **Walk-in.** A walk-in's `view.self` is the server filler `EMPTY_SPECTATOR_SELF`
  (`build-view-for.ts`), so `selfStrip` returns no kit, resources, thumbs, Draw, Shop, Unspy or
  duplication for `isSpectator` (Q38). The V2 private zone was already text only.
- **Finished board.** `stats` replaces Draw, Unspy and Activate duplication (§6.12). Walk-ins
  get it too: Stats only reopens Game over and carries no economy. The strip offers no Leave
  there, because the flag is Return home (§6.12).
- **Unspy.** It is present for a Seated or Reanimating POV and absent for a Watching POV (§6.3,
  spectator overlay). Its reasons follow the server's order: the lock, then no living spy, then
  points (`clear-spy.ts` checks the spy before `payCost`).

---
```

  - In `docs/backlog_v7.md`:
    - On the L73-09 row, change `| M | Medium | L73-07 | To do |` to `| M | Medium | L73-07 | Done |`.
    - In the Progress table, change `| 73 · View-model | 13 | 8 |` to `| 73 · View-model | 13 | 9 |` and `| **Total** | **134** | **29** |` to `| **Total** | **134** | **30** |`.

- [ ] **Step 6: Verify and commit.**
  1. Run `pnpm verify` and wait for it to pass.
  2. `git add apps/client/src/view-model/self-strip.ts apps/client/src/view-model/self-strip.test.ts docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md`
  3. `git commit` with this message and no attribution trailer (AGENTS.md §10):

```
feat(view-model): add selfStrip and dock (L73-09)

Walk-ins get no strip economy (Q38). The finished board shows Stats
for every POV, walk-ins included, and the strip offers no Leave there.
Unspy is absent for a Watching POV (spec v7 §6.3).
```

**Acceptance map:**
- Unspy is disabled with each of its reasons, and enabled with a living spy, 10 points and on turn: `Unspy is disabled with $reason` and `Unspy is enabled with a living spy, 10 points and on turn (L58-07)`.
- A Gambler payout of 14 is hot: `a Gambler payout of 14 is hot (L64-05)`.
- A walk-in has no economy: `a walk-in has no economy (Q38)` and `a walk-in is Watching with Leave and shows no kit, resources or thumbs (Q38)`.
- An eliminated POV with `pendingReanimation` is Reanimating, without it Watching: `an eliminated POV with pendingReanimation is Reanimating` and `an eliminated POV without pendingReanimation is Watching with Leave`.
- The finished board shows Stats and no Draw: `the finished board shows Stats and no Draw, Unspy or duplication; Shop is browse-only (§6.12)`.
- The Shield thumb appears only while shield > 0: `shows the Shield thumb only while shield > 0`.
- `pnpm verify` green: Step 6.

**Decisions:**
- **The dock is `selfStrip(view, ctx).dock`; there is no separate export.**
  - §4.3 names only `selfStrip`, and the contract says L73-09 names the dock types.
  - The `economy-bar.test.ts` classification rows ask for "a dock function beside selfStrip"; this field is it.
- **The thumbs field is named `thumbs`.**
  - It holds Shield and Sentences as well as actives (§6.1 item 3).
  - The classification rows for `active-persistent-thumb.test.ts` write `selfStrip(view).actives`; it means `thumbs`.
- **The POV mode is `povModeOf(view)` (L73-02)**, the function `seatList` uses, so seats and strip never disagree. The connection text and seat colour likewise reuse L73-02's `connectionLabel` and `seatColorIndexOf`, and the thumbs reuse L73-07's `inPlayThumbs` (controller rulings 2026-10-27).
- **The POV's public slice is found by `player.id === view.you`.** That is how `seatColorIndexOf` matches.
- **Own persistents are read from `view.self.activePersistentEffects`.** That is the private copy V2 `private-zone.tsx` reads.
- **Walk-in, finished board and Unspy presence follow the `decisions.md` entry above.**
  - The spec does not say whether a walk-in on the finished board sees Stats, or whether the strip shows Leave there.
- **Unspy reason order:**
  - the lock first (`actionLock`: `actions-locked` before `not-your-turn`);
  - then `no-living-spy`;
  - then `not-enough-points`.
  - This is `clear-spy.ts` order. Invisibility does not gate Unspy or duplication, because `perform-action.ts` checks Invisibility only for `playCard` and multi-attack.
- **Activate duplication** follows `listLegalActivateDuplicationActions` (Duplicator kit only) and V2 `private-zone.tsx` (hidden while `duplicationActive`). Its reason is the lock only.
- **`hot` is `gain > 10`**, the same as V2 (`economy-bar.tsx`, L64-05).
  - How it renders (red or another emphasis) is L74's to settle. §6.1 says `--cta`, while Appendix A keeps the red state.
- **Flow badges reuse V2 `FlowStatusBadges` precedence:** Block turns win over the attack ban.
  - Duplication active is a boolean, not a badge (V2 shows it as a separate text).

---

### Task L73-10: Add shop() with one special-price constant

**Files:**
- Create: `apps/client/src/view-model/shop.ts`
- Test: `apps/client/src/view-model/shop.test.ts`
- Modify:
  - `apps/client/src/view-model/opponent-token-chips.ts`: delete the local `SPECIAL_CARD_PURCHASE_POINTS = 20` (line 65) and its doc line, and import the constant from `./shop`.
  - `apps/client/src/screens/table/shop-dialog.tsx`: replace both `20` literals (lines 131 and 139) with the imported constant. Change nothing else.
  - `docs/agent/frontend.md` and `docs/backlog_v7.md`.
- Existing tests that must stay green unchanged:
  - `apps/client/src/view-model/opponent-token-chips.test.ts` (18 tests). Its "flies the 20-point special purchase" test keeps its `count: 20`.
  - `apps/client/src/screens/table/shop-dialog.test.ts` (4)
  - `apps/client/src/screens/table/economy-bar.chrome-labels.test.ts` (1). The shop source must still have no `\bUP\b` and must still name `upgradePointBuyCost` and `upgradePointSellYield`.
  - `apps/client/src/screens/table/cost-chrome.test.ts` (1)

**Interfaces:**
- Consumes:
  - `ActionContext` and `actionLock` from `./action-lock`.
  - `ActionAvailability`, `DisabledReason`, `availabilityFor` and `DISABLED_REASON_COPY` from `./action-reasons` (L73-06). Tests use the copy only.
  - `tutorialHighlightAt`, `tutorialShopSpotlight` and `TutorialShopSpotlight` from `./tutorial-coach-copy`.
  - `SHOP_SECTION_CARDS`, `SHOP_SECTION_POOL` and `SHOP_SECTION_UPGRADE_POINTS` from `./chrome-labels`.
  - `structuredCostFromCardCost` and `StructuredCost` from `../ui/structured-cost`.
  - From `@card-battle/shared`: `SHARED_CARD_IDS`, `SHARED_CARD_CATALOG`, `getKit`, `upgradePointBuyCost` and `upgradePointSellYield`, and the types `CardCost`, `CardInstance`, `PlayingStateView`, `PrivateSelfView` and `SharedCardId`.
  - The fixtures `makeCard`, `makePlayer`, `makePlayingView` and `makeSelf`.
- Produces (all exported from `shop.ts`):

```ts
/**
 * The only client copy of the random special price (spec v7 §6.8, §13 Q50). Mirrors the
 * server's SPECIAL_CARD_PURCHASE_COST (apps/server/src/engine/economy/buy-special-card.ts),
 * which stays authoritative; rules spec §5.
 */
export const SPECIAL_CARD_PURCHASE_POINTS = 20;
export const SHOP_TABS = ['cards', 'special', 'pool', 'upgrade-points'] as const; // §6.8 order
export type ShopTab = (typeof SHOP_TABS)[number];
export const SHOP_TAB_LABELS: Readonly<Record<ShopTab, string>> = {
  cards: SHOP_SECTION_CARDS, special: 'Special', pool: SHOP_SECTION_POOL, 'upgrade-points': SHOP_SECTION_UPGRADE_POINTS,
};
export type ShopHighlight =
  | { tab: 'upgrade-points'; item: Extract<TutorialShopSpotlight, 'upgrade-point'> }
  | { tab: 'cards'; item: Extract<TutorialShopSpotlight, 'absorber'> };
export interface ShopCardTile {
  cardId: SharedCardId;
  instance: CardInstance;          // { instanceId: `shop-${cardId}`, cardId, isUpgraded: kit alwaysUpgraded }
  cost: StructuredCost | null;     // catalog buyCost (never the upgraded play cost); null never occurs for the catalog
  affordable: boolean;             // points and lives vs buyCost, ignoring turn and lock (the V2 faded tile)
  highlighted: boolean;            // tutorial shop-absorber on the Absorber tile
  buy: ActionAvailability;
}
export interface ShopCardsModel { tiles: readonly ShopCardTile[]; defaultSelectedCardId: SharedCardId } // SHARED_CARD_IDS[0]
export interface ShopSpecialModel { cost: StructuredCost; buy: ActionAvailability }
export interface ShopPoolModel { cards: readonly CardInstance[]; cost: StructuredCost; buy: ActionAvailability }
export interface ShopUpgradePointsModel { buyCostPoints: number; sellYieldPoints: number; buy: ActionAvailability; sell: ActionAvailability }
export interface ShopModel {
  tabs: readonly ShopTab[];
  initialTab: ShopTab;
  highlight: ShopHighlight | null;
  browseOnly: boolean;             // actionLock(view, ctx) !== null
  cards: ShopCardsModel;
  special: ShopSpecialModel;
  pool: ShopPoolModel;
  upgradePoints: ShopUpgradePointsModel;
}
export function shop(view: PlayingStateView, ctx: ActionContext): ShopModel;
```

- [ ] **Step 1: Write the failing tests.** Create `apps/client/src/view-model/shop.test.ts`:

```ts
/**
 * shop(): technical spec v7 §6.8, §11 and §13 Q50 (L73-10).
 */
import {
  getCard,
  SHARED_CARD_IDS,
  TUTORIAL_STEPS,
  upgradePointBuyCost,
  upgradePointSellYield,
  type ActionLogEntryView,
  type PlayingStateView,
  type SharedCardId,
  type SubChoiceRequiredPayload,
  type TutorialHighlight,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { ActionContext } from './action-lock';
import { DISABLED_REASON_COPY } from './action-reasons';
import { chipsForPublicLogEntry } from './opponent-token-chips';
import {
  shop,
  SHOP_TAB_LABELS,
  SPECIAL_CARD_PURCHASE_POINTS,
  type ShopCardTile,
  type ShopModel,
} from './shop';
import { makeCard, makePlayer, makePlayingView, makeSelf } from './test-fixtures';

const LIVE: ActionContext = { subChoice: null, readOnly: false };
const MIRROR_OPEN: SubChoiceRequiredPayload = { kind: 'mirror', eligibleEffectIds: [], deadlineMs: 1 };

function tile(model: ShopModel, cardId: SharedCardId): ShopCardTile {
  const found = model.cards.tiles.find((entry) => entry.cardId === cardId);
  if (found === undefined) {
    throw new Error(`no ${cardId} tile`);
  }
  return found;
}

function tutorialIndexOf(highlight: TutorialHighlight): number {
  const step = TUTORIAL_STEPS.find((entry) => entry.highlight === highlight);
  if (step === undefined) {
    throw new Error(`no tutorial step highlights ${String(highlight)}`);
  }
  return step.index;
}

describe('shop() (§6.8)', () => {
  it('keeps the one client special price and feeds the token chips from it (Q50)', () => {
    expect(SPECIAL_CARD_PURCHASE_POINTS).toBe(20);
    expect(shop(makePlayingView(), LIVE).special.cost).toEqual({ kind: 'points', amount: SPECIAL_CARD_PURCHASE_POINTS });
    const entry: ActionLogEntryView = { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'buySpecialCard', turnSequence: 3 };
    expect(chipsForPublicLogEntry(entry, 'me', makePlayingView().players, 'kamikaze')).toEqual([
      { kind: 'point', count: SPECIAL_CARD_PURCHASE_POINTS, from: { playerId: 'p1' }, to: 'log' },
    ]);
  });

  it('opens on Cards with the §6.8 tab order and the V2 default selection', () => {
    const model = shop(makePlayingView(), LIVE);
    expect(model.tabs).toEqual(['cards', 'special', 'pool', 'upgrade-points']);
    expect(SHOP_TAB_LABELS).toEqual({ cards: 'Cards', special: 'Special', pool: 'Pool', 'upgrade-points': 'Upgrade points' });
    expect(model.initialTab).toBe('cards');
    expect(model.highlight).toBeNull();
    expect(model.browseOnly).toBe(false);
    expect(model.cards.defaultSelectedCardId).toBe('basic-attack');
  });

  it('lists every shared card at its catalog buy cost; the Spy tile costs 4 to buy (Lot 54)', () => {
    const model = shop(makePlayingView({ self: makeSelf({ points: 100 }) }), LIVE);
    expect(model.cards.tiles.map((entry) => entry.cardId)).toEqual([...SHARED_CARD_IDS]);
    expect(model.cards.tiles.map((entry) => entry.cost)).toEqual([
      { kind: 'points', amount: 2 },
      { kind: 'points', amount: 4 },
      { kind: 'points', amount: 20 },
      { kind: 'points', amount: 6 },
      { kind: 'points', amount: 4 },
      { kind: 'points', amount: 10 },
      { kind: 'points', amount: 12 },
      { kind: 'points', amount: 14 },
      { kind: 'lives', amount: 2 },
      { kind: 'points', amount: 6 },
    ]);
    expect(tile(model, 'spy').cost).toEqual({ kind: 'points', amount: 4 });
    expect(getCard('spy')?.cost).toEqual({ points: 2 });
    expect(tile(model, 'spy').instance).toEqual({ instanceId: 'shop-spy', cardId: 'spy', isUpgraded: false });
  });

  it('checks points and lives: Tax needs 2 lives, Super attack 20 points', () => {
    const poor = shop(makePlayingView({ self: makeSelf({ points: 19, lives: 1 }) }), LIVE);
    expect(tile(poor, 'tax')).toMatchObject({ affordable: false, buy: { enabled: false, reason: 'not-enough-lives' } });
    expect(tile(poor, 'super-attack')).toMatchObject({ affordable: false, buy: { enabled: false, reason: 'not-enough-points' } });
    expect(tile(poor, 'mirror')).toMatchObject({ affordable: true, buy: { enabled: true, reason: null } });
    const twoLives = shop(makePlayingView({ self: makeSelf({ points: 19, lives: 2 }) }), LIVE);
    expect(tile(twoLives, 'tax').buy).toEqual({ enabled: true, reason: null });
  });

  it('shows the kit alwaysUpgraded faces at unchanged prices (Tactician)', () => {
    const model = shop(makePlayingView({ self: makeSelf({ kitId: 'tactician', points: 15 }) }), LIVE);
    expect(model.cards.tiles.filter((entry) => entry.instance.isUpgraded).map((entry) => entry.cardId))
      .toEqual(['spy', 'thief', 'mirror']);
    expect(tile(model, 'spy').cost).toEqual({ kind: 'points', amount: 4 });
  });

  it.each(['kamikaze', 'upgrader', 'gambler'] as const)('prices upgrade points from the %s kit at call time (L58-03)', (kitId) => {
    const model = shop(makePlayingView({ self: makeSelf({ kitId }) }), LIVE);
    expect(model.upgradePoints.buyCostPoints).toBe(upgradePointBuyCost(kitId));
    expect(model.upgradePoints.sellYieldPoints).toBe(upgradePointSellYield(kitId));
  });

  it('Upgrader buys an upgrade point for 5 where Kamikaze needs 10; Sell needs one to sell', () => {
    expect(shop(makePlayingView({ self: makeSelf({ kitId: 'upgrader', points: 5, upgradePoints: 0 }) }), LIVE).upgradePoints)
      .toEqual({ buyCostPoints: 5, sellYieldPoints: 7, buy: { enabled: true, reason: null }, sell: { enabled: false, reason: 'no-upgrade-point' } });
    expect(shop(makePlayingView({ self: makeSelf({ kitId: 'kamikaze', points: 5, upgradePoints: 1 }) }), LIVE).upgradePoints)
      .toEqual({ buyCostPoints: 10, sellYieldPoints: 7, buy: { enabled: false, reason: 'not-enough-points' }, sell: { enabled: true, reason: null } });
  });

  it('disables Buy special at 19 points with its reason', () => {
    expect(shop(makePlayingView({ self: makeSelf({ points: 19 }) }), LIVE).special.buy)
      .toEqual({ enabled: false, reason: 'not-enough-points' });
    expect(DISABLED_REASON_COPY['not-enough-points']).not.toBe('');
    expect(shop(makePlayingView({ self: makeSelf({ points: 20 }) }), LIVE).special.buy).toEqual({ enabled: true, reason: null });
  });

  it('shows public pool faces and disables Buy random on an empty pool and under the fee (L58-05)', () => {
    const poolCard = makeCard('shield', { instanceId: 'pool-1', isUpgraded: true });
    expect(shop(makePlayingView({ pool: [], poolBuyCost: 1, self: makeSelf({ points: 50 }) }), LIVE).pool)
      .toEqual({ cards: [], cost: { kind: 'points', amount: 1 }, buy: { enabled: false, reason: 'pool-empty' } });
    expect(shop(makePlayingView({ pool: [poolCard], poolBuyCost: 4, self: makeSelf({ points: 3 }) }), LIVE).pool)
      .toEqual({ cards: [poolCard], cost: { kind: 'points', amount: 4 }, buy: { enabled: false, reason: 'not-enough-points' } });
    expect(shop(makePlayingView({ pool: [poolCard], poolBuyCost: 4, self: makeSelf({ points: 4 }) }), LIVE).pool.buy)
      .toEqual({ enabled: true, reason: null });
  });

  it('off-turn disables every buy with its reason while every tile stays listed', () => {
    const view = makePlayingView({
      currentTurnPlayerId: 'p1',
      pool: [makeCard('spy', { instanceId: 'pool-1' })],
      self: makeSelf({ points: 19, upgradePoints: 2 }),
    });
    const model = shop(view, LIVE);
    expect(model.browseOnly).toBe(true);
    expect(model.cards.tiles).toHaveLength(SHARED_CARD_IDS.length);
    expect(model.pool.cards).toHaveLength(1);
    expect(tile(model, 'super-attack').affordable).toBe(false);
    const buys = [
      ...model.cards.tiles.map((entry) => entry.buy),
      model.special.buy, model.pool.buy, model.upgradePoints.buy, model.upgradePoints.sell,
    ];
    expect(buys).toHaveLength(SHARED_CARD_IDS.length + 4);
    for (const buy of buys) {
      expect(buy).toEqual({ enabled: false, reason: 'not-your-turn' });
    }
  });

  it.each<{ label: string; view: PlayingStateView; ctx: ActionContext }>([
    { label: 'the finished board', view: makePlayingView({ turnDeadlineMs: null, self: makeSelf({ points: 100 }) }), ctx: { subChoice: null, readOnly: true } },
    { label: 'an open sub-choice', view: makePlayingView({ self: makeSelf({ points: 100 }) }), ctx: { subChoice: MIRROR_OPEN, readOnly: false } },
    {
      label: 'an eliminated POV',
      view: makePlayingView({
        currentTurnPlayerId: 'p1',
        players: [makePlayer('me', { isYou: true, isEliminated: true }), makePlayer('p1'), makePlayer('p2')],
        self: makeSelf({ points: 100 }),
      }),
      ctx: LIVE,
    },
  ])('is browse-only on $label (actions-locked)', ({ view, ctx }) => {
    const model = shop(view, ctx);
    expect(model.browseOnly).toBe(true);
    expect(model.cards.tiles).toHaveLength(SHARED_CARD_IDS.length);
    expect(model.cards.tiles.every((entry) => entry.buy.reason === 'actions-locked')).toBe(true);
    expect(model.special.buy).toEqual({ enabled: false, reason: 'actions-locked' });
    expect(model.upgradePoints.buy).toEqual({ enabled: false, reason: 'actions-locked' });
  });

  it('opens shop-upgrade-point on the Upgrade points tab with Buy highlighted (§6.8)', () => {
    const model = shop(makePlayingView({ playKind: 'tutorial', tutorialIndex: tutorialIndexOf('shop-upgrade-point') }), LIVE);
    expect(model.initialTab).toBe('upgrade-points');
    expect(model.highlight).toEqual({ tab: 'upgrade-points', item: 'upgrade-point' });
    expect(model.cards.tiles.some((entry) => entry.highlighted)).toBe(false);
  });

  it('opens shop-absorber on Cards with Absorber highlighted, not preselected (§6.8)', () => {
    const model = shop(makePlayingView({ playKind: 'tutorial', tutorialIndex: tutorialIndexOf('shop-absorber') }), LIVE);
    expect(model.initialTab).toBe('cards');
    expect(model.highlight).toEqual({ tab: 'cards', item: 'absorber' });
    expect(model.cards.tiles.filter((entry) => entry.highlighted).map((entry) => entry.cardId)).toEqual(['absorber']);
    expect(model.cards.defaultSelectedCardId).toBe('basic-attack');
  });

  it('ignores tutorial highlights outside the Shop and in Classic', () => {
    expect(shop(makePlayingView({ playKind: 'tutorial', tutorialIndex: tutorialIndexOf('draw') }), LIVE).highlight).toBeNull();
    expect(shop(makePlayingView({ playKind: 'classic', tutorialIndex: null }), LIVE).highlight).toBeNull();
  });
});
```

That is 18 test cases: the kit `it.each` counts as 3 and the lock `it.each` as 3.

- [ ] **Step 2: Run them and see them fail.** `pnpm vitest run apps/client/src/view-model/shop.test.ts`. Expected: the file errors with `Failed to resolve import "./shop"`, and no test runs.

- [ ] **Step 3: Implement** `shop(view: PlayingStateView, ctx: ActionContext): ShopModel` in `apps/client/src/view-model/shop.ts`, then switch both old copies to the constant.
  - **Approach:** compute `lock = actionLock(view, ctx)` once. Every buy is `availabilityFor(lock ?? ownReason)` (L73-06), so the lock reason comes first, as in L73-09.
  - Own reasons, in the server's order:
    - **Card tile:** `buyShortfall(view.self, SHARED_CARD_CATALOG[cardId].buyCost)`. It returns `'not-enough-points'` when `(cost.points ?? 0) > self.points`, else `'not-enough-lives'` when `(cost.lives ?? 0) > self.lives`, else `null`. This mirrors `canAffordCost` and `payCost` in `apps/server/src/engine/economy/transfers.ts`. `affordable` is `buyShortfall(...) === null`.
    - **Special:** `self.points < SPECIAL_CARD_PURCHASE_POINTS` gives `'not-enough-points'`.
    - **Pool:** `view.pool.length === 0` gives `'pool-empty'`, checked before `self.points < view.poolBuyCost`, which gives `'not-enough-points'` (`buy-pool-card.ts` order).
    - **Upgrade points:** Buy gives `'not-enough-points'` when `self.points < upgradePointBuyCost(self.kitId)`. Sell gives `'no-upgrade-point'` when `self.upgradePoints < 1` (`upgrade-points.ts`). Call both price helpers inside `shop()`; never cache them (L58-03, Cloning).
  - Tile face: `{ instanceId: \`shop-${cardId}\`, cardId, isUpgraded: getKit(view.self.kitId).traits.alwaysUpgraded.includes(cardId) }`, the same face as V2 `shop-dialog.tsx`.
  - Tutorial:

```ts
const spotlight = view.playKind === 'tutorial' && view.tutorialIndex !== null
  ? tutorialShopSpotlight(tutorialHighlightAt(view.tutorialIndex))
  : undefined;
const highlight: ShopHighlight | null =
  spotlight === 'upgrade-point' ? { tab: 'upgrade-points', item: 'upgrade-point' }
  : spotlight === 'absorber' ? { tab: 'cards', item: 'absorber' }
  : null;
// initialTab = highlight?.tab ?? 'cards'; tile.highlighted = highlight?.item === 'absorber' && cardId === 'absorber'
```

  - The only place `20` appears in `shop.ts` is the constant's value. Doc comments name the server constant instead of restating the number, and contain no date ending in `-20`.
  - `opponent-token-chips.ts`: delete the comment line and `const SPECIAL_CARD_PURCHASE_POINTS = 20;` (lines 64–65). Add `import { SPECIAL_CARD_PURCHASE_POINTS } from './shop';`. The `buySpecialCard` case keeps `count: SPECIAL_CARD_PURCHASE_POINTS`.
  - `shop-dialog.tsx`: add `import { SPECIAL_CARD_PURCHASE_POINTS } from '../../view-model/shop';`. Change `view.self.points < 20` to `view.self.points < SPECIAL_CARD_PURCHASE_POINTS`, and `amount: 20` to `amount: SPECIAL_CARD_PURCHASE_POINTS`. Change nothing else; the old Shop's look and behavior stay as they are until L75.

- [ ] **Step 4: Run them and see them pass.** `pnpm vitest run apps/client/src/view-model/shop.test.ts apps/client/src/view-model/opponent-token-chips.test.ts apps/client/src/screens/table/shop-dialog.test.ts apps/client/src/screens/table/economy-bar.chrome-labels.test.ts apps/client/src/screens/table/cost-chrome.test.ts`. Expected: 18 + 18 + 4 + 1 + 1 = 42 passed, with no assertion edited in the four existing files.

- [ ] **Step 5: Docs.**
  - In `docs/agent/frontend.md`, append this bullet at the end of `## View-model layer (V7 · Lot 72+)`, after the L73-09 bullet:

```
- `view-model/shop.ts` (L73-10, technical spec v7 §6.8): `shop(view, ctx)` gives the tabs
  Cards / Special / Pool / Upgrade points. Card tiles use the catalog `buyCost` (Spy buys for
  4), the kit's `alwaysUpgraded` faces, and points-and-lives affordability. Upgrade-point
  prices come from `upgradePointBuyCost` / `upgradePointSellYield` at call time (L58-03), and
  Buy random uses the public `poolBuyCost`. Every buy carries the lock reason off-turn, in a
  sub-choice and on the finished board, so the Shop is browse-only there.
  `SPECIAL_CARD_PURCHASE_POINTS` is the **only** client copy of the special price (Q50):
  `screens/table/shop-dialog.tsx` and `view-model/opponent-token-chips.ts` import it, and the
  server's `SPECIAL_CARD_PURCHASE_COST` stays authoritative. In the tutorial,
  `shop-upgrade-point` opens Upgrade points and `shop-absorber` opens Cards with Absorber
  highlighted, not preselected.
```

  - In the `**Table (L12):**` bullet, on the line that contains `grid + Buy special, and the pool` (line 885 at `881c28f`; the L73 bullets above have moved it down), replace `grid + Buy special, and the pool` with ``grid + Buy special (price `SPECIAL_CARD_PURCHASE_POINTS` from `view-model/shop.ts`, Q50), and the pool``.
  - In `docs/backlog_v7.md`:
    - On the L73-10 row, change `| M | Medium | L72-03, L73-06 | To do |` to `| M | Medium | L72-03, L73-06 | Done |`.
    - In the Progress table, change `| 73 · View-model | 13 | 9 |` to `| 73 · View-model | 13 | 10 |` and `| **Total** | **134** | **30** |` to `| **Total** | **134** | **31** |`.

- [ ] **Step 6: Verify and commit.**
  1. Check that exactly one client literal holds the special price. These read-only commands must print exactly what is shown:
     - `grep -rnE "SPECIAL_CARD_PURCHASE_POINTS = |points < 20\b|amount: 20\b" apps/client/src --include='*.ts' --include='*.tsx' | grep -v '\.test\.'` prints one line: `apps/client/src/view-model/shop.ts:<n>:export const SPECIAL_CARD_PURCHASE_POINTS = 20;`.
     - `grep -cw "20" apps/client/src/view-model/shop.ts apps/client/src/view-model/opponent-token-chips.ts apps/client/src/screens/table/shop-dialog.tsx` prints `…/shop.ts:1`, `…/opponent-token-chips.ts:0` and `…/shop-dialog.tsx:0`.
  2. Run `pnpm verify` and wait for it to pass.
  3. `git add apps/client/src/view-model/shop.ts apps/client/src/view-model/shop.test.ts apps/client/src/view-model/opponent-token-chips.ts apps/client/src/screens/table/shop-dialog.tsx docs/agent/frontend.md docs/backlog_v7.md`
  4. `git commit` with this message and no attribution trailer (AGENTS.md §10):

```
feat(view-model): add shop() model (L73-10)

SPECIAL_CARD_PURCHASE_POINTS in view-model/shop.ts is now the only
client copy of the special price (Q50); the server constant stays
authoritative. Tutorial shop-absorber highlights Absorber without
preselecting it (spec v7 §6.8 over the brief).
```

**Acceptance map:**
- The Spy tile costs 4 to buy: `lists every shared card at its catalog buy cost; the Spy tile costs 4 to buy (Lot 54)`.
- Upgrade-point Buy and Sell follow a kit-specific price: `prices upgrade points from the %s kit at call time (L58-03)` and `Upgrader buys an upgrade point for 5 where Kamikaze needs 10; Sell needs one to sell`.
- Buy special is disabled at 19 points with its reason: `disables Buy special at 19 points with its reason`.
- Buy random is disabled on an empty pool and under the fee: `shows public pool faces and disables Buy random on an empty pool and under the fee (L58-05)`.
- Off-turn every buy is disabled while every tile stays listed: `off-turn disables every buy with its reason while every tile stays listed`.
- `grep` finds one client literal for the special price: Step 6 item 1.
- `pnpm verify` green: Step 6.

**Decisions:**
- **The constant keeps the existing client name `SPECIAL_CARD_PURCHASE_POINTS`**, which is the smallest diff in `opponent-token-chips.ts`. It lives in `shop.ts` (the L73-10 Review line).
- **The tab order is Cards, Special, Pool, Upgrade points**, the §6.8 order, and Cards is the default tab.
  - `'Special'` is the only new tab label. The other three reuse the `chrome-labels.ts` strings verbatim.
- **`defaultSelectedCardId` is `SHARED_CARD_IDS[0]`** (`basic-attack`), which is V2's `DEFAULT_SHOP_CARD_ID`.
  - §6.8 keeps select-then-Buy and says only that the tutorial's Absorber is "highlighted, not preselected". That ruling overrides the L73-10 brief's "Absorber preselected".
  - The price blurb shows the selected tile's `cost`, and L74 reads `SHOP_PRICE_BLURB` from `table-copy.ts`.
- **The tutorial highlight is read from the view alone** (`tutorialHighlightAt(view.tutorialIndex)`).
  - While the board tour or the Look gate is active, the Shop cannot be opened (parity `economy-bar`), so overlay state never changes the result.
- **Reason order:** the lock first, then the server's own check order:
  - points before lives (`payCost`);
  - an empty pool before the fee (`buyPoolCard`).
- **`affordable` ignores turn and lock,** so an unaffordable tile still fades off-turn, as in V2. `buy` carries the turn reason.
- **`cost` is typed `StructuredCost | null`** because `structuredCostFromCardCost` returns that. It is never widened and never cast.
- **Tile prices use the base `buyCost` even when the kit always upgrades the card.** `card-catalog.ts`: shop prices never follow an upgraded play cost.
- **Out of scope:** no change to the server, to `packages/shared` or to `SPECIAL_CARD_PURCHASE_COST` (§6.8, Q50). `shop-dialog.tsx` changes only its two literals.

---

### Task L73-11: Add log(); remove unused log filters

**Files:**
- Create: `apps/client/src/view-model/log.ts`
- Test (create): `apps/client/src/view-model/log.test.ts`
- Modify: `apps/client/src/view-model/action-log.ts` (delete `ActionLogFilters`, `entryInvolvesPlayer`, `filterActionLog`, `TurnGroup`, `groupByTurn`; header line 3)
- Modify (test): `apps/client/src/view-model/action-log.test.ts` (imports, the L9-02 block)
- Modify: `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`

**Interfaces:**
- Consumes: `PlayingStateView`, `ActionLogEntryView`, `ActionLogEntryKind`, `ActionLogPlayedAction` (`@card-battle/shared`); `formatActionLogEntrySegments`, `formatActionLogEntry`, `groupByRound`, `ActionLogSegment`, `ActionLogCardSegment`, `NicknameResolver` (`./action-log`); tests: `makePlayingView`, `makePlayer` (`./test-fixtures`, L73-02).
- Produces (`view-model/log.ts`):
  ```ts
  /** A card-name segment plus whether it opens the catalog inspect (L56-05). */
  export type LogCardSegment = ActionLogCardSegment & { inspectable: boolean };
  export type LogSegment = Exclude<ActionLogSegment, ActionLogCardSegment> | LogCardSegment;
  export interface LogLine {
    index: number;            // position in view.actionLog (keys, ticker change detection)
    kind: ActionLogEntryKind; // kind icon in the sheet
    turnSequence: number;
    segments: readonly LogSegment[];
    text: string;             // formatActionLogEntry(entry, nicknameOf): accessible name, tests
  }
  export interface LogRound { round: number; lines: readonly LogLine[] }
  export interface LogModel { ticker: LogLine | null; rounds: readonly LogRound[] }
  export function log(view: PlayingStateView): LogModel;
  ```
- Removes from `view-model/action-log.ts`: `ActionLogFilters`, `entryInvolvesPlayer`, `filterActionLog`, `TurnGroup`, `groupByTurn`. `ACTION_LOG_KINDS`, `roundOfTurn`, `groupByRound`, `RoundGroup` and every formatter export stay.

- [ ] **Step 1: Write the failing tests.**

  1a. Create `apps/client/src/view-model/log.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';

  import type { ActionLogEntryView, CardId, PlayingStateView } from '@card-battle/shared';

  import { log, type LogCardSegment, type LogLine } from './log';
  import { makePlayer, makePlayingView } from './test-fixtures';

  function draw(turnSequence: number, actorPlayerId = 'me'): ActionLogEntryView {
    return { kind: 'actionPlayed', actorPlayerId, action: 'draw', turnSequence };
  }

  /** `count` seats: the POV `me`, then `p1`, `p2`… in turn order. */
  function tableOf(count: number, actionLog: readonly ActionLogEntryView[]): PlayingStateView {
    const ids = ['me', ...Array.from({ length: count - 1 }, (_, i) => `p${String(i + 1)}`)];
    return makePlayingView({
      players: ids.map((id) => makePlayer(id, id === 'me' ? { isYou: true } : {})),
      turnOrder: ids,
      actionLog,
    });
  }

  function cards(line: LogLine | null | undefined): LogCardSegment[] {
    return (line?.segments ?? []).filter((s): s is LogCardSegment => s.type === 'card');
  }

  function roundsOf(view: PlayingStateView): { round: number; indexes: number[] }[] {
    return log(view).rounds.map((g) => ({ round: g.round, indexes: g.lines.map((l) => l.index) }));
  }

  function only(entry: ActionLogEntryView): LogLine | null {
    return log(makePlayingView({ actionLog: [entry] })).ticker;
  }

  describe('log() ticker and rounds (spec v7 §6.9)', () => {
    it('makes the latest entry the ticker, with nicknames from the view', () => {
      const view = makePlayingView({
        players: [
          makePlayer('me', { isYou: true, nickname: 'Ann' }),
          makePlayer('p1', { nickname: 'Bob' }),
          makePlayer('p2'),
        ],
        actionLog: [
          draw(0),
          { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'playCard', cardId: 'basic-attack',
            isUpgraded: false, targetPlayerId: 'me', turnSequence: 1 },
        ],
      });
      const { ticker } = log(view);
      expect(ticker?.index).toBe(1);
      expect(ticker?.kind).toBe('actionPlayed');
      expect(ticker?.turnSequence).toBe(1);
      expect(ticker?.text).toBe('Bob attacks Ann with Basic attack (1)');
      expect(ticker?.segments).toEqual([
        { type: 'player', playerId: 'p1', nickname: 'Bob' },
        { type: 'text', text: ' attacks ' },
        { type: 'player', playerId: 'me', nickname: 'Ann' },
        { type: 'text', text: ' with ' },
        { type: 'card', cardId: 'basic-attack', isUpgraded: false, inspectable: true },
        { type: 'damage', amount: 1 },
      ]);
    });

    it('has no ticker and no rounds for an empty log', () => {
      expect(log(makePlayingView())).toEqual({ ticker: null, rounds: [] });
    });

    it('splits rounds every 4 turns at 4 seats', () => {
      const view = tableOf(4, [draw(0), draw(3, 'p3'), draw(4), draw(7, 'p3'), draw(8)]);
      expect(roundsOf(view)).toEqual([
        { round: 1, indexes: [0, 1] },
        { round: 2, indexes: [2, 3] },
        { round: 3, indexes: [4] },
      ]);
    });

    it('splits rounds every 8 turns at 8 seats', () => {
      const view = tableOf(8, [draw(0), draw(7, 'p7'), draw(8), draw(15, 'p7'), draw(16)]);
      expect(roundsOf(view)).toEqual([
        { round: 1, indexes: [0, 1] },
        { round: 2, indexes: [2, 3] },
        { round: 3, indexes: [4] },
      ]);
    });
  });

  describe('log() renders only what the server sent (spec v7 §6.9)', () => {
    it("reads a fogged pool buy as 'a card from the pool' with no inspectable card", () => {
      const { rounds } = log(makePlayingView({ actionLog: [
        { kind: 'actionPlayed', actorPlayerId: 'me', action: 'buyPoolCard', cardId: 'thief',
          isUpgraded: false, turnSequence: 0 },
        { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'buyPoolCard', turnSequence: 1 },
      ] }));
      const [named, fogged] = rounds.flatMap((round) => round.lines);
      expect(fogged?.text).toBe('p1 bought a card from the pool');
      expect(cards(fogged)).toEqual([]);
      expect(named?.text).toBe('me bought Thief from the pool');
      expect(cards(named)).toEqual([{ type: 'card', cardId: 'thief', isUpgraded: false, inspectable: true }]);
    });

    it('renders an unspied Ghost point gain as +?', () => {
      const line = only({
        kind: 'actionResolved', effectId: 'e-ghost', sourcePlayerId: 'me', targetPlayerId: 'p1',
        cardId: 'basic-attack', isUpgraded: false, livesLost: 2, shieldAbsorbed: 0,
        outcome: 'applied', turnSequence: 1,
        playerDeltas: [{ playerId: 'p1', deltas: [
          { kind: 'life', amount: -2 },
          { kind: 'point', concealed: true, direction: 'gain' },
        ] }],
      });
      expect(line?.text).toBe("me's Basic attack hits p1 −2 +?");
      expect(line?.segments.filter((s) => s.type === 'resource')).toEqual([
        { type: 'resource', kind: 'life', direction: 'loss', label: '−2', spoken: '−2 lives' },
        { type: 'resource', kind: 'point', direction: 'gain', label: '+?', spoken: 'concealed points gain' },
      ]);
    });
  });

  describe('log() inspectable card segments (L56-05)', () => {
    const inspectable: readonly (readonly [string, ActionLogEntryView, readonly CardId[]])[] = [
      ['a play', { kind: 'actionPlayed', actorPlayerId: 'me', action: 'playCard', cardId: 'absorber',
        isUpgraded: false, targetPlayerId: 'p1', turnSequence: 0 }, ['absorber']],
      ['a multi-attack', { kind: 'actionPlayed', actorPlayerId: 'me', action: 'playMultipleAttacks',
        turnSequence: 0, attacks: [
          { cardId: 'basic-attack', targetPlayerId: 'p1', isUpgraded: false },
          { cardId: 'basic-attack', targetPlayerId: 'p2', isUpgraded: true },
        ] }, ['basic-attack', 'basic-attack']],
      ['a named pool buy', { kind: 'actionPlayed', actorPlayerId: 'me', action: 'buyPoolCard',
        cardId: 'thief', isUpgraded: false, turnSequence: 0 }, ['thief']],
      ['a deactivation', { kind: 'actionPlayed', actorPlayerId: 'me', action: 'deactivatePersistent',
        cardId: 'poison', isUpgraded: false, turnSequence: 0 }, ['poison']],
      ['a resolution', { kind: 'actionResolved', effectId: 'e-spy', sourcePlayerId: 'me',
        targetPlayerId: 'p1', cardId: 'spy', isUpgraded: false, livesLost: 0, shieldAbsorbed: 0,
        outcome: 'applied', turnSequence: 0 }, ['spy']],
      ['a Mirror redirect', { kind: 'mirrorRedirected', actorPlayerId: 'me', cardId: 'super-attack',
        isUpgraded: false, damageMultiplier: 2, previousTargetPlayerId: 'me', newTargetPlayerId: 'p1',
        turnSequence: 0 }, ['super-attack']],
      ['a Curse transfer', { kind: 'curseTransferred', fromPlayerId: 'p1', toPlayerId: 'me',
        cardId: 'curse', isUpgraded: false, effectId: 'c1', turnSequence: 0 }, ['curse']],
      ['a lost persistent', { kind: 'persistentDeactivated', ownerPlayerId: 'p2',
        cardId: 'imposition', isUpgraded: true, turnSequence: 0 }, ['imposition']],
    ];
    it.each(inspectable)('marks every card on %s inspectable', (_label, entry, cardIds) => {
      const line = only(entry);
      expect(cards(line).map((c) => c.cardId)).toEqual(cardIds);
      expect(cards(line).every((c) => c.inspectable)).toBe(true);
    });

    const plain: readonly (readonly [string, ActionLogEntryView])[] = [
      ['a draw', draw(0, 'p1')],
      ['a buy', { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'buyCard', turnSequence: 0 }],
      ['a sell', { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'sellCard', turnSequence: 0 }],
      ['an upgrade', { kind: 'actionPlayed', actorPlayerId: 'p1', action: 'upgradeCard', turnSequence: 0 }],
      ['an elimination', { kind: 'playerEliminated', playerId: 'p2', eliminatorPlayerId: 'p1',
        reason: 'combat', turnSequence: 0 }],
      ['a reward claim', { kind: 'rewardsClaimed', eliminatorPlayerId: 'p1', eliminatedPlayerId: 'p2',
        turnSequence: 0 }],
      ['a Sentence countdown', { kind: 'sentenceCountdown', sourcePlayerId: 'p1',
        remainingOwnerTurns: 3, turnSequence: 0 }],
      ['a Sentence fire', { kind: 'sentenceFired', sourcePlayerId: 'p1', targetPlayerId: 'me',
        turnSequence: 0 }],
    ];
    it.each(plain)('gives %s no inspectable card', (_label, entry) => {
      expect(cards(only(entry))).toEqual([]);
    });

    it('keeps the blockedBy card name as plain text', () => {
      const line = only({
        kind: 'actionResolved', effectId: 'e-block', sourcePlayerId: 'p1', targetPlayerId: 'me',
        cardId: 'basic-attack', isUpgraded: false, livesLost: 0, shieldAbsorbed: 0,
        outcome: 'blocked', blockedBy: 'attack-thief', turnSequence: 0,
      });
      expect(line?.text).toBe('Basic attack from p1 against me is blocked by Attack Thief');
      expect(cards(line)).toEqual([{ type: 'card', cardId: 'basic-attack', isUpgraded: false, inspectable: true }]);
      expect(line?.segments.at(-1)).toEqual({ type: 'text', text: 'Attack Thief' });
    });
  });
  ```
  (23 tests: 7 `it` plus 8 + 8 `it.each` rows.)

  1b. Edit `apps/client/src/view-model/action-log.test.ts` (these tests still pass before Step 3):
  - In the import list, delete the `filterActionLog,` and `groupByTurn,` lines.
  - Rename `describe('filterActionLog / groupByTurn (L9-02)', …)` to `describe('MEGA ATTACK phrasing and round grouping (L9-02)', …)`.
  - Inside it, delete exactly three `it` blocks: `'filters by kind, player, and query'`, `'shows nothing when no kinds are selected'` and `'groups consecutive entries by turnSequence'`. Keep `'phrases MEGA ATTACK as an attack, including full shield absorb (L20-05)'` and `'groups by table round from seat count (no turn numbers in grouping key)'` verbatim.

- [ ] **Step 2: Run them and see them fail.** `pnpm vitest run apps/client/src/view-model/log.test.ts apps/client/src/view-model/action-log.test.ts`. Expected: `log.test.ts` fails to load (`Failed to resolve import "./log"`); `action-log.test.ts` passes with 30 tests.

- [ ] **Step 3: Implement** `export function log(view: PlayingStateView): LogModel` in `apps/client/src/view-model/log.ts`. Approach: resolve nicknames from `view.players` (fallback the id, as `action-log-panel.tsx`), group `view.actionLog` with `groupByRound(view.actionLog, view.players.length)`, map each entry in order to a `LogLine` with a running `index`, and take the ticker as the last line of the last round (`null` when empty). Each card segment gets `inspectable` from its entry:
  ```ts
  /** L56-05 / Appendix A `table-action-log-inspect`: the only lines whose card opens inspect. */
  const INSPECTABLE_PLAYED_ACTIONS: ReadonlySet<ActionLogPlayedAction> = new Set([
    'playCard', 'playMultipleAttacks', 'buyPoolCard', 'deactivatePersistent',
  ]);

  function cardsAreInspectable(entry: ActionLogEntryView): boolean {
    switch (entry.kind) {
      case 'actionPlayed':
        return INSPECTABLE_PLAYED_ACTIONS.has(entry.action);
      case 'actionResolved':
      case 'mirrorRedirected':
      case 'curseTransferred':
      case 'persistentDeactivated':
        return true;
      default:
        return false;
    }
  }
  ```
  The header cites spec v7 §6.9, Appendix A `table-action-log-panel` / `-entry-copy` / `-resource-nets` / `-inspect` / `-post-lot61-lines`, and says fog stays on the server (the module renders only fields present). Then, in `action-log.ts`, delete `ActionLogFilters` (lines 35–39), `entryInvolvesPlayer`, `filterActionLog`, `TurnGroup` and `groupByTurn` (lines 482–565), and change header line 3 to ` * No rule logic — formatting and round grouping only.`

- [ ] **Step 4: Run them and see them pass.** Same command: `log.test.ts` 23 passed, `action-log.test.ts` 30 passed. Then `grep -rnE "filterActionLog|groupByTurn|entryInvolvesPlayer|ActionLogFilters|TurnGroup\b" apps packages` prints nothing.

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, Conventions, the bullet that starts `- Action log is the table's main organ (technical spec §7).`: after its line `` `apps/client/src/action-log/` — scrollable round groups (no player/kind/search filters).`` insert:
    ```
      V7 reads it through `view-model/log.ts` `log(view)` (L73-11, spec v7 §6.9): the ticker is
      the latest entry, rounds come from `groupByRound` with `view.players.length`, and each card
      segment carries `inspectable` (the L56-05 list below; a `blockedBy` name stays text). Pass
      `finalTable` on the finished board. The unused filter helpers (`filterActionLog`,
      `entryInvolvesPlayer`, `ActionLogFilters`, `groupByTurn`) are gone (spec v7 §11, Q62).
    ```
  - `docs/agent/decisions.md`: append at the end, after the L73-09 entry's closing `---`; the entry closes with its own `---`:
    ```
    ## 2026-10-27 · [P] Unused action-log filters removed (L73-11)

    Source: technical spec v7 §11 ("Dead code removed when its replacement lands: … unused log
    filters"), §13 Q62 and §6.9; Appendix A `table-action-log-panel` ("No player, kind or search
    filters (L45/L51)").

    - `view-model/action-log.ts` drops `filterActionLog`, `entryInvolvesPlayer`,
      `ActionLogFilters`, `groupByTurn` and its return type `TurnGroup`. Since the panel dropped
      its filter rail (L45/L51) only their own tests imported them. The V7 log sheet
      (`view-model/log.ts`, §6.9) groups by round and has no filters.
    - Retired from the L9-02 block of `action-log.test.ts`: 'filters by kind, player, and
      query', 'shows nothing when no kinds are selected' and 'groups consecutive entries by
      turnSequence'. They covered only the deleted exports, so no shipped behavior loses a test.
    - The block's other two tests cover live code and stay verbatim under the renamed describe
      'MEGA ATTACK phrasing and round grouping (L9-02)': MEGA ATTACK phrasing (L20-05) and
      `groupByRound` / `roundOfTurn`.
    - `ACTION_LOG_KINDS` and its L56-03 test stay; L81-01 re-checks it. No player-visible
      change: the old panel never called the removed helpers.

    ---
    ```
  - `docs/backlog_v7.md`: L73-11 row status `To do` → `Done`; Progress `| 73 · View-model | 13 | 10 |` → `| 73 · View-model | 13 | 11 |` and `| **Total** | **134** | **31** |` → `| **Total** | **134** | **32** |`.

- [ ] **Step 6: Verify and commit.** `pnpm verify` green. Then:
  ```
  git add apps/client/src/view-model/log.ts apps/client/src/view-model/log.test.ts \
    apps/client/src/view-model/action-log.ts apps/client/src/view-model/action-log.test.ts \
    docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md
  git commit -m "feat(view-model): add log(), drop filters (L73-11)" \
    -m "Retire the three L9-02 tests that covered only filterActionLog and groupByTurn; decisions.md records it (spec v7 §11, Q62)."
  ```

**Acceptance map:**
- The ticker is the last entry: `makes the latest entry the ticker, with nicknames from the view` (and `has no ticker and no rounds for an empty log`).
- Groups split on round boundaries at 4 and 8 seats: `splits rounds every 4 turns at 4 seats` and `splits rounds every 8 turns at 8 seats`.
- A fogged pool buy reads 'a card from the pool' with no inspectable card: `reads a fogged pool buy as 'a card from the pool' with no inspectable card`.
- An unspied Ghost gain renders `+?`: `renders an unspied Ghost point gain as +?`.
- No import of the removed helpers remains: the Step 4 grep prints nothing.
- `pnpm verify` green: Step 6.

**Decisions:**
- Inspectability is decided by entry kind (the L56-05 list), not "any card segment". Today the formatter emits card segments only on those lines, so the `false` branch is a guard that keeps a future formatter change from making a buy or Sentence line inspectable. `blockedBy` is a text segment and never inspectable (Appendix A `table-action-log-inspect`).
- Rounds use `view.players.length`, as the V2 panel and the chat's `tableRound` do (Appendix A `table-action-log-panel`: the round must equal the chat "Round N").
- `LogLine.index` is the position in `view.actionLog`; `text` is `formatActionLogEntry` output. Both are cheap and give L74 keys, a ticker change signal and an accessible name without re-deriving.
- `TurnGroup` goes with `groupByTurn`: it is only that function's return type.
- Only 3 of the 5 `it`s in the "L9-02 test block" are removed. The brief says "their L9-02 test block", but the MEGA ATTACK (L20-05) and `groupByRound` tests in it cover live code. Removing them would weaken tests (AGENTS DoD).
- The V2 `action-log-panel.tsx` is untouched (no player-visible change in L73, spec v7 §10.4). L74 renders `log()`.
- No resource icon URL in the model: a resource segment keeps `kind`, and the L74 component maps it to the §5.6 icon.

---

### Task L73-12: Add rulesRecall() and turn-length source selection

**Files:**
- Create: `apps/client/src/view-model/rules-recall.ts`
- Test (create): `apps/client/src/view-model/rules-recall.test.ts`
- Modify (test helper): `apps/client/src/view-model/test-fixtures.ts` (append two builders)
- Modify: `docs/agent/frontend.md`, `docs/agent/testing.md`, `docs/backlog_v7.md`

**Interfaces:**
- Consumes: `LobbyRules`, `LobbyStateView`, `FinishedStateView`, `PlayingStateView`, `StateView`, `KitId`, `KIT_IDS`, `allowedKitIds`, `defaultLobbyRules` (`@card-battle/shared`); `makePlayingView` (`./test-fixtures`).
- Produces (`view-model/rules-recall.ts`):
  ```ts
  /** Spec v7 §6.11 / §7.6. A `LobbyRules`, so it passes straight to `RulesStrip` / `RulesSheet` (L72-16). */
  export interface RulesRecall extends LobbyRules {
    /** Kits a seat may pick or be dealt, in `KIT_IDS` order (shared `allowedKitIds`). */
    readonly allowedKitIds: readonly KitId[];
  }
  export function rulesRecall(view: LobbyStateView | FinishedStateView): RulesRecall | null;
  /** The cache step's state: the last lobby rules seen and the room they belong to. */
  export interface RulesCache { readonly gameCode: string; readonly rules: LobbyRules }
  export function nextRulesCache(cache: RulesCache | null, view: StateView | null): RulesCache | null;
  /** Turn-length source selection: this room's cached rules for a Classic table, else null. */
  export function cachedLobbyRules(cache: RulesCache | null, view: PlayingStateView): LobbyRules | null;
  /** Menu → Table rules on the table (§6.11). */
  export function tableRulesRecall(cache: RulesCache | null, view: PlayingStateView): RulesRecall | null;
  ```
- Produces (`view-model/test-fixtures.ts`, appended; defaults above it unchanged):
  ```ts
  export type LobbyViewOverrides = Partial<Omit<LobbyStateView, 'lobbyRules'>> & { lobbyRules?: LobbyRules | null };
  export function makeLobbyView(overrides?: LobbyViewOverrides): LobbyStateView;
  // phase 'lobby', you 'me', gameCode 'TEST', hostPlayerId 'me',
  // players [{ id: 'me', nickname: 'me', isBot: false, isReady: true }], yourKitSelection 'random',
  // lobbyRules defaultLobbyRules() (no exclusions, randomOnly false, 60 s); `lobbyRules: null` omits the field.
  export type FinishedViewOverrides = Partial<Omit<FinishedStateView, 'lobbyRules'>> & { lobbyRules?: LobbyRules | null };
  export function makeFinishedView(overrides?: FinishedViewOverrides): FinishedStateView;
  // finalTable makePlayingView(); gameCode, players, playKind and tutorialIndex copied from finalTable;
  // phase 'finished', you 'me', winnerPlayerId 'me',
  // recap { turnSequence: finalTable.turnSequence, players: [], eliminations: [] }, exportLog { turns: [], events: [] },
  // lobbyRules defaultLobbyRules(); `lobbyRules: null` omits it (the wire shape of a tutorial finish).
  ```
  Implement both as `const { lobbyRules = defaultLobbyRules(), ...rest } = overrides;` then spread defaults, `...rest`, and `...(lobbyRules === null ? {} : { lobbyRules })`. `exactOptionalPropertyTypes` forbids `lobbyRules: undefined`, hence the `null` switch.

- [ ] **Step 1: Write the failing tests.** Append the two builders above to `test-fixtures.ts`, then create `apps/client/src/view-model/rules-recall.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';

  import { KIT_IDS, type LobbyRules } from '@card-battle/shared';

  import {
    cachedLobbyRules,
    nextRulesCache,
    rulesRecall,
    tableRulesRecall,
    type RulesCache,
  } from './rules-recall';
  import { makeFinishedView, makeLobbyView, makePlayingView } from './test-fixtures';

  const TWO_OUT_30: LobbyRules = { excludedKitIds: ['kamikaze', 'ghost'], randomOnly: false, turnTimeSeconds: 30 };
  const GAMBLER_OUT_45: LobbyRules = { excludedKitIds: ['gambler'], randomOnly: true, turnTimeSeconds: 45 };
  const room = (gameCode: string) => makePlayingView({ gameCode });

  describe('rulesRecall (spec v7 §6.11, §7.6)', () => {
    it('recalls a lobby view with 2 excluded kits and a 30 s turn', () => {
      expect(rulesRecall(makeLobbyView({ lobbyRules: TWO_OUT_30 }))).toEqual({
        excludedKitIds: ['kamikaze', 'ghost'],
        randomOnly: false,
        turnTimeSeconds: 30,
        allowedKitIds: ['untouchable', 'scientific', 'assassin', 'upgrader', 'tactician',
          'indestructible', 'prophet', 'specialist', 'witch', 'warrior', 'wizard', 'juggernaut',
          'duplicator', 'gambler'],
      });
    });

    it('recalls a finished Classic view from its own rules', () => {
      const recall = rulesRecall(makeFinishedView({ lobbyRules: GAMBLER_OUT_45 }));
      expect(recall).toMatchObject({ excludedKitIds: ['gambler'], randomOnly: true, turnTimeSeconds: 45 });
      expect(recall?.allowedKitIds).toEqual(KIT_IDS.slice(0, 15));
    });

    it('gives null for a tutorial finished view', () => {
      const tutorial = makePlayingView({ playKind: 'tutorial', tutorialIndex: 7 });
      expect(rulesRecall(makeFinishedView({ finalTable: tutorial, lobbyRules: null }))).toBeNull();
      expect(rulesRecall(makeFinishedView({ finalTable: tutorial, lobbyRules: TWO_OUT_30 }))).toBeNull();
    });

    it('gives null when the view carries no rules', () => {
      expect(rulesRecall(makeLobbyView({ lobbyRules: null }))).toBeNull();
    });

    it('allows every kit when none is excluded', () => {
      expect(rulesRecall(makeLobbyView())).toEqual({
        excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60, allowedKitIds: [...KIT_IDS],
      });
    });
  });

  describe('nextRulesCache (spec v7 §6.11)', () => {
    const lobby1 = makeLobbyView({ gameCode: 'ROOM1', lobbyRules: TWO_OUT_30 });

    it('a new room code clears the cache', () => {
      const cache = nextRulesCache(null, lobby1);
      expect(cache).toEqual({ gameCode: 'ROOM1', rules: TWO_OUT_30 });
      expect(nextRulesCache(cache, room('ROOM2'))).toBeNull();
      expect(nextRulesCache(cache, makeLobbyView({ gameCode: 'ROOM2', lobbyRules: GAMBLER_OUT_45 })))
        .toEqual({ gameCode: 'ROOM2', rules: GAMBLER_OUT_45 });
    });

    it('each lobby view of the room replaces it, Play again included', () => {
      const playing = nextRulesCache(nextRulesCache(null, lobby1), room('ROOM1'));
      const finished = nextRulesCache(playing, makeFinishedView({ finalTable: room('ROOM1') }));
      expect(nextRulesCache(finished, makeLobbyView({ gameCode: 'ROOM1', lobbyRules: GAMBLER_OUT_45 })))
        .toEqual({ gameCode: 'ROOM1', rules: GAMBLER_OUT_45 });
    });

    it('keeps the same cache for a playing or finished view of the room and for no view', () => {
      const cache = nextRulesCache(null, lobby1);
      expect(nextRulesCache(cache, room('ROOM1'))).toBe(cache);
      expect(nextRulesCache(cache, makeFinishedView({ finalTable: room('ROOM1'), lobbyRules: GAMBLER_OUT_45 })))
        .toBe(cache);
      expect(nextRulesCache(cache, null)).toBe(cache);
    });
  });

  describe('table rules source (spec v7 §6.10, §6.11)', () => {
    const cache: RulesCache = { gameCode: 'ROOM1', rules: TWO_OUT_30 };

    it('gives the cached rules only to a Classic table of the same room', () => {
      expect(cachedLobbyRules(cache, room('ROOM1'))).toBe(TWO_OUT_30);
      expect(cachedLobbyRules(cache, room('ROOM2'))).toBeNull();
      expect(cachedLobbyRules(cache, makePlayingView({ gameCode: 'ROOM1', playKind: 'tutorial', tutorialIndex: 0 })))
        .toBeNull();
      expect(cachedLobbyRules(null, room('ROOM1'))).toBeNull();
    });

    it('recalls the cached rules on the table and hides them when unknown', () => {
      const recall = tableRulesRecall(cache, room('ROOM1'));
      expect(recall).toMatchObject({ excludedKitIds: ['kamikaze', 'ghost'], randomOnly: false, turnTimeSeconds: 30 });
      expect(recall?.allowedKitIds).toHaveLength(14);
      expect(tableRulesRecall(null, room('ROOM1'))).toBeNull();
    });
  });
  ```
  (10 tests.)

- [ ] **Step 2: Run them and see them fail.** `pnpm vitest run apps/client/src/view-model/rules-recall.test.ts`. Expected: the file fails to load with `Failed to resolve import "./rules-recall"`. Every other suite that imports `test-fixtures.ts` still passes.

- [ ] **Step 3: Implement** the four functions in `apps/client/src/view-model/rules-recall.ts`. Approach: a private `recallOf(rules)` returns `{ excludedKitIds, randomOnly, turnTimeSeconds, allowedKitIds: allowedKitIds(rules) }`. `rulesRecall` returns null for a finished view with `playKind === 'tutorial'` or when `lobbyRules` is absent, else `recallOf`. `nextRulesCache`:
  ```ts
  if (view === null) return cache;                       // no room code to compare
  if (view.phase === 'lobby' && view.lobbyRules !== undefined) {
    return { gameCode: view.gameCode, rules: view.lobbyRules }; // every lobby view replaces it, Play again included
  }
  return cache !== null && cache.gameCode === view.gameCode ? cache : null; // same object, or a room change drops it
  ```
  `cachedLobbyRules` returns `cache.rules` only when the cache is non-null, `cache.gameCode === view.gameCode` and `view.playKind === 'classic'`. `tableRulesRecall` is `recallOf` over it. The header cites §6.11, §7.6, §6.10 source (1), Appendix A `rules-recall-table-end` / `lobby-rules-summary`, and says the cache lives in memory only (Lot 74 holds it in App state), so a reload mid-game hides the recall.

- [ ] **Step 4: Run them and see them pass.** Same command: 10 passed.

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, `### Rules (ui/rules/, L72-16)`: replace the whole bullet that starts `- **Who supplies \`rules\`:**` with:
    ```
    - **Who supplies `rules`:** the L76 lobby (`LobbyStateView.lobbyRules`), the L74 table recall
      and `FinishedStateView.lobbyRules` in L77 (spec v7 §6.11). The data comes from
      `view-model/rules-recall.ts` (L73-12): `rulesRecall(view)` for a lobby or finished view, and
      `tableRulesRecall(cache, view)` on the table. The cache is the last `lobbyRules` seen in this
      room, kept in memory: call `nextRulesCache(cache, view)` on every view change (a new room
      code drops it). `cachedLobbyRules(cache, view)` is the same rules as `turnClock`'s length
      source. A `RulesRecall` is a `LobbyRules`, so it passes as `rules`. A `null` recall means
      the rules are unknown (a reload mid-game) or the room is a tutorial: the caller hides the
      strip, and the tutorial never mounts it. The component invents no default.
    ```
  - `docs/agent/testing.md`: at the end of the `view-model/test-fixtures.ts` paragraph that L73-02 added, append the sentence: ``L73-12 adds `makeLobbyView` and `makeFinishedView` (the finished view copies `gameCode`, `players`, `playKind` and `tutorialIndex` from its `finalTable`); pass `lobbyRules: null` to omit the rules, as the wire does for a tutorial finish.``
  - `docs/backlog_v7.md`: L73-12 row `To do` → `Done`; Progress `| 73 · View-model | 13 | 11 |` → `| 73 · View-model | 13 | 12 |` and `| **Total** | **134** | **32** |` → `| **Total** | **134** | **33** |`.

- [ ] **Step 6: Verify and commit.** `pnpm verify` green. Then:
  ```
  git add apps/client/src/view-model/rules-recall.ts apps/client/src/view-model/rules-recall.test.ts \
    apps/client/src/view-model/test-fixtures.ts docs/agent/frontend.md docs/agent/testing.md \
    docs/backlog_v7.md
  git commit -m "feat(view-model): add rulesRecall() (L73-12)"
  ```

**Acceptance map:**
- A lobby view with 2 excluded kits and 30 s recalls both: `recalls a lobby view with 2 excluded kits and a 30 s turn`.
- A finished Classic view recalls its own rules: `recalls a finished Classic view from its own rules`.
- A tutorial finished view gives null: `gives null for a tutorial finished view`.
- A new room code clears the cache: `a new room code clears the cache`.
- `pnpm verify` green: Step 6.

**Decisions:**
- "Turn-length source selection" is `cachedLobbyRules(cache, view)`: it chooses which lobby rules count as `turnClock` source (1). The `TURN_STARTED` and seconds-only fallbacks are L73-13's. Reason: the L73-12 Review line, and the contract's `turnClock` input takes `cachedLobbyRules: LobbyRules | null` with no room code.
- The cache step is pure state in, state out (`nextRulesCache`), so L74 owns only the `useState`. Only lobby views write. A playing or finished view of the same room returns the same object, so React skips the update. A view of another room drops the cache. A `null` view keeps it: it carries no room code, a reconnect keeps the view (frontend.md "does not clear the table view"), and the next room's first view drops a stale entry anyway.
- The tutorial guard sits on the reader side. `game-room.ts` sends `lobbyRules: this.viewLobbyRules()` on every lobby view, the tutorial's too (the client sends `START_GAME` only after `create`), so the cache can hold a tutorial room's rules. `cachedLobbyRules` checks `view.playKind`. `rulesRecall(finished)` checks `playKind` as well as the omitted field (§6.11: "the tutorial never shows rules"). `LobbyStateView` has no `playKind`, so the lobby caller keeps "never mount the strip in the tutorial" (§7.4).
- `excludedKitIds` is returned as received. The server already orders it by `KIT_IDS`, and `rulesKitFaces` reorders anyway. The seconds are never clamped (frontend.md Rules: "Seconds are shown as received").

---

### Task L73-13: Add turnClock() with modes and length fallbacks

**Files:**
- Create: `apps/client/src/view-model/turn-clock.ts`
- Test (create): `apps/client/src/view-model/turn-clock.test.ts`
- Modify: `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`

**Interfaces:**
- Consumes: `PlayingStateView`, `LobbyRules`, `ConnectionStatus`, `PublicPlayerView` (`@card-battle/shared`); tests: `makePlayingView`, `makePlayer` (`./test-fixtures`). At runtime its `cachedLobbyRules` input comes from L73-12's `cachedLobbyRules(cache, view)` (wired by L74; `turn-clock.ts` does not import `rules-recall.ts`).
- Produces (`view-model/turn-clock.ts`):
  ```ts
  export const TURN_CLOCK_MODES = ['countdown', 'paused', 'absent', 'none'] as const;
  export type TurnClockMode = (typeof TURN_CLOCK_MODES)[number];
  export const TURN_CLOCK_DANGER_SECONDS = 10; // spec v7 §6.10: last 10 s in --danger
  export const TURN_CLOCK_TICK_SECONDS = 5;    // spec v7 §6.10: last 5 s tick (L79)
  export const TURN_CLOCK_NONE_LABEL = '—';                       // V2 table.tsx, reused verbatim
  export const TURN_CLOCK_PAUSED_LABEL = 'Paused — reconnecting'; // V2 table.tsx
  export const TURN_CLOCK_ABSENT_LABEL = 'Absent — auto-draw';    // V2 table.tsx
  export type TurnLengthSource = 'lobby-rules' | 'turn-started';
  /** First `TURN_STARTED` sighting of a turn (contract). Gives the length only, never the seconds. */
  export interface TurnStartedRecord { turnSequence: number; deadlineMs: number; receivedAtMs: number }
  export interface TurnClockInput {
    turnStarted: TurnStartedRecord | null;
    view: PlayingStateView;
    cachedLobbyRules: LobbyRules | null;
    readOnly: boolean;
    nowMs: number;
  }
  export interface TurnClockIdle { mode: Exclude<TurnClockMode, 'countdown'>; label: string }
  export interface TurnClockCountdown {
    mode: 'countdown';
    secondsLeft: number;                    // ceil(max(0, deadline − now) / 1000)
    label: string;                          // `${secondsLeft}s`
    lengthMs: number | null;                // null → seconds only, no bar
    lengthSource: TurnLengthSource | null;
    ratio: number | null;                   // remaining / length, clamped to [0, 1]
    danger: boolean;                        // secondsLeft ≤ TURN_CLOCK_DANGER_SECONDS
    tick: boolean;                          // secondsLeft ≤ TURN_CLOCK_TICK_SECONDS
  }
  export type TurnClockModel = TurnClockIdle | TurnClockCountdown;
  export function turnClock(input: TurnClockInput): TurnClockModel;
  /** Record step: keep the first sighting for its turnSequence (a resume keeps the length). */
  export function nextTurnStartedRecord(previous: TurnStartedRecord | null, sighting: TurnStartedRecord): TurnStartedRecord;
  ```

- [ ] **Step 1: Write the failing tests.** Create `apps/client/src/view-model/turn-clock.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';

  import type { ConnectionStatus, LobbyRules, PlayingStateView } from '@card-battle/shared';

  import { makePlayer, makePlayingView } from './test-fixtures';
  import {
    nextTurnStartedRecord,
    TURN_CLOCK_DANGER_SECONDS,
    TURN_CLOCK_TICK_SECONDS,
    turnClock,
    type TurnClockInput,
    type TurnClockModel,
    type TurnStartedRecord,
  } from './turn-clock';

  const NOW = 1_000_000;
  const RULES_30: LobbyRules = { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 30 };

  function clock(input: Partial<TurnClockInput>): TurnClockModel {
    return turnClock({ turnStarted: null, view: makePlayingView(), cachedLobbyRules: null, readOnly: false, nowMs: NOW, ...input });
  }

  /** `p1` is the active seat with this connection status. */
  function activeP1(status: ConnectionStatus, overrides: Partial<PlayingStateView> = {}): PlayingStateView {
    const p1 = makePlayer('p1', { connection: {
      status,
      disconnectedAt: status === 'connected' ? null : NOW - 5_000,
      automaticTurnsTaken: status === 'absent' ? 1 : 0,
      consecutiveTimeouts: 0,
    } });
    return makePlayingView({
      currentTurnPlayerId: 'p1',
      players: [makePlayer('me', { isYou: true }), p1, makePlayer('p2')],
      ...overrides,
    });
  }

  /** The POV's human turn with `remainingMs` left on the server deadline. */
  function countdownView(remainingMs: number, turnSequence = 1): PlayingStateView {
    return makePlayingView({ turnSequence, turnDeadlineMs: NOW + remainingMs });
  }

  describe('turnClock modes (spec v7 §6.10)', () => {
    it('is none in the tutorial, even with a deadline', () => {
      const view = makePlayingView({ playKind: 'tutorial', tutorialIndex: 0, turnDeadlineMs: NOW + 30_000 });
      expect(clock({ view, cachedLobbyRules: RULES_30 })).toEqual({ mode: 'none', label: '—' });
    });

    it('is none on the finished board, even with a disconnected last seat', () => {
      expect(clock({ view: activeP1('disconnected', { turnDeadlineMs: null }), readOnly: true }))
        .toEqual({ mode: 'none', label: '—' });
    });

    it('is none on a bot turn after a human turn', () => {
      const humanTurn: TurnStartedRecord = { turnSequence: 5, deadlineMs: NOW + 20_000, receivedAtMs: NOW - 10_000 };
      const botTurn = makePlayingView({
        currentTurnPlayerId: 'p1', turnSequence: 6, turnDeadlineMs: null,
        players: [makePlayer('me', { isYou: true }), makePlayer('p1', { isBot: true, botDifficulty: 'normal' }), makePlayer('p2')],
      });
      expect(clock({ view: botTurn, turnStarted: humanTurn, cachedLobbyRules: RULES_30 }))
        .toEqual({ mode: 'none', label: '—' });
    });

    it('is paused while the active seat is disconnected, with or without a deadline', () => {
      const paused = { mode: 'paused', label: 'Paused — reconnecting' };
      expect(clock({ view: activeP1('disconnected', { turnDeadlineMs: NOW + 12_000 }), cachedLobbyRules: RULES_30 }))
        .toEqual(paused);
      expect(clock({ view: activeP1('disconnected', { turnDeadlineMs: null }) })).toEqual(paused);
    });

    it('is absent when the active seat is absent with no deadline', () => {
      expect(clock({ view: activeP1('absent', { turnDeadlineMs: null }) }))
        .toEqual({ mode: 'absent', label: 'Absent — auto-draw' });
      expect(clock({ view: activeP1('absent', { turnDeadlineMs: NOW + 2_000 }) }).mode).toBe('countdown');
    });

    it('counts down a 30 s host turn with 15 s left at ratio 0.5', () => {
      expect(clock({ view: countdownView(15_000), cachedLobbyRules: RULES_30 })).toEqual({
        mode: 'countdown', secondsLeft: 15, label: '15s', lengthMs: 30_000,
        lengthSource: 'lobby-rules', ratio: 0.5, danger: false, tick: false,
      });
    });
  });

  describe('turnClock length fallbacks (spec v7 §6.10)', () => {
    it('prefers the cached lobby length over a TURN_STARTED record', () => {
      const record = { turnSequence: 1, deadlineMs: NOW + 15_000, receivedAtMs: NOW - 45_000 };
      expect(clock({ view: countdownView(15_000), turnStarted: record, cachedLobbyRules: RULES_30 }))
        .toMatchObject({ lengthMs: 30_000, lengthSource: 'lobby-rules', ratio: 0.5 });
    });

    it('falls back to the first TURN_STARTED seen for this turn', () => {
      const record = { turnSequence: 1, deadlineMs: NOW + 30_000, receivedAtMs: NOW - 10_000 };
      expect(clock({ view: countdownView(30_000), turnStarted: record }))
        .toMatchObject({ secondsLeft: 30, lengthMs: 40_000, lengthSource: 'turn-started', ratio: 0.75 });
    });

    it('keeps the original length when a resume TURN_STARTED arrives for the same turn', () => {
      const first = nextTurnStartedRecord(null, { turnSequence: 4, deadlineMs: NOW + 25_000, receivedAtMs: NOW - 20_000 });
      const resumed = nextTurnStartedRecord(first, { turnSequence: 4, deadlineMs: NOW + 18_000, receivedAtMs: NOW });
      expect(resumed).toBe(first);
      expect(clock({ view: countdownView(18_000, 4), turnStarted: resumed })).toMatchObject({
        mode: 'countdown', secondsLeft: 18, lengthMs: 45_000, lengthSource: 'turn-started', ratio: 0.4,
      });
    });

    it('gives seconds only with no cached rules and no record', () => {
      expect(clock({ view: countdownView(15_000) })).toEqual({
        mode: 'countdown', secondsLeft: 15, label: '15s', lengthMs: null,
        lengthSource: null, ratio: null, danger: false, tick: false,
      });
    });

    it('ignores a record from another turnSequence', () => {
      const stale = { turnSequence: 3, deadlineMs: NOW + 15_000, receivedAtMs: NOW - 15_000 };
      expect(clock({ view: countdownView(15_000, 4), turnStarted: stale }))
        .toMatchObject({ secondsLeft: 15, lengthMs: null, lengthSource: null, ratio: null });
    });

    it('gives seconds only when the first sighting was already past its deadline', () => {
      const skewed = { turnSequence: 1, deadlineMs: NOW, receivedAtMs: NOW + 500 };
      expect(clock({ view: countdownView(2_000), turnStarted: skewed }))
        .toMatchObject({ secondsLeft: 2, lengthMs: null, lengthSource: null, ratio: null });
    });

    it('clamps the seconds at 0 and the ratio between 0 and 1', () => {
      expect(clock({ view: countdownView(-3_000), cachedLobbyRules: RULES_30 }))
        .toMatchObject({ secondsLeft: 0, label: '0s', ratio: 0, danger: true, tick: true });
      const lateFirstSighting = { turnSequence: 1, deadlineMs: NOW + 10_000, receivedAtMs: NOW };
      expect(clock({ view: countdownView(30_000), turnStarted: lateFirstSighting }))
        .toMatchObject({ lengthMs: 10_000, ratio: 1 });
    });
  });

  describe('turnClock danger and tick (spec v7 §6.10)', () => {
    it('names the thresholds', () => {
      expect(TURN_CLOCK_DANGER_SECONDS).toBe(10);
      expect(TURN_CLOCK_TICK_SECONDS).toBe(5);
    });

    it.each([
      [10_001, 11, false, false],
      [10_000, 10, true, false],
      [5_001, 6, true, false],
      [5_000, 5, true, true],
      [1, 1, true, true],
    ] as const)('with %i ms left shows %is, danger %s, tick %s', (remainingMs, secondsLeft, danger, tick) => {
      expect(clock({ view: countdownView(remainingMs), cachedLobbyRules: RULES_30 }))
        .toMatchObject({ secondsLeft, danger, tick });
    });
  });

  describe('nextTurnStartedRecord (spec v7 §6.10)', () => {
    it('keeps the first sighting for the same turnSequence and replaces it on a new turn', () => {
      const first: TurnStartedRecord = { turnSequence: 2, deadlineMs: NOW + 30_000, receivedAtMs: NOW };
      expect(nextTurnStartedRecord(null, first)).toBe(first);
      expect(nextTurnStartedRecord(first, { turnSequence: 2, deadlineMs: NOW + 40_000, receivedAtMs: NOW + 5_000 }))
        .toBe(first);
      const next = { turnSequence: 3, deadlineMs: NOW + 90_000, receivedAtMs: NOW + 30_000 };
      expect(nextTurnStartedRecord(first, next)).toBe(next);
    });
  });
  ```
  (20 tests: 15 `it` plus 5 `it.each` rows.)

- [ ] **Step 2: Run them and see them fail.** `pnpm vitest run apps/client/src/view-model/turn-clock.test.ts`. Expected: the file fails to load with `Failed to resolve import "./turn-clock"`.

- [ ] **Step 3: Implement** `turnClock(input)` and `nextTurnStartedRecord(previous, sighting)` in `apps/client/src/view-model/turn-clock.ts`. Approach: check the modes in the order below, then compute the countdown from `view.turnDeadlineMs` and a private `turnLength(rules, record, turnSequence)`.
  ```ts
  if (readOnly || view.playKind === 'tutorial') return { mode: 'none', label: TURN_CLOCK_NONE_LABEL };
  const active = view.players.find((p) => p.id === view.currentTurnPlayerId);
  const deadlineMs = view.turnDeadlineMs;
  if (active?.connection.status === 'disconnected') return { mode: 'paused', label: TURN_CLOCK_PAUSED_LABEL };
  if (active?.connection.status === 'absent' && deadlineMs === null) return { mode: 'absent', label: TURN_CLOCK_ABSENT_LABEL };
  if (active === undefined || deadlineMs === null) return { mode: 'none', label: TURN_CLOCK_NONE_LABEL };
  const remainingMs = Math.max(0, deadlineMs - nowMs); // positive zero, so toEqual(0) holds
  // turnLength: (1) rules → turnTimeSeconds * 1000, 'lobby-rules';
  // (2) record?.turnSequence === view.turnSequence and deadlineMs − receivedAtMs > 0 → that, 'turn-started';
  // (3) null → lengthMs / lengthSource / ratio null.
  // ratio = Math.min(1, remainingMs / lengthMs).
  ```
  `nextTurnStartedRecord` returns `previous` when `previous?.turnSequence === sighting.turnSequence`, else `sighting`. The module doc tells L74 how to call it: once per new `lastTurnStarted` identity, with `{ turnSequence: view.turnSequence, deadlineMs: lastTurnStarted.deadlineMs, receivedAtMs: nowMs }` from the playing view current at receive time. The server sends the state before `TURN_STARTED` on a new turn (`game-room.ts`: `beginTurnOrAbsentAutoPlay` → `sendStateToEveryone` → `broadcastTurnStarted`), and a resume does not advance `turnSequence` (`resumeTimersOwnedBy`). Cite spec v7 §6.10, §4.1, §13 Q19/Q33/Q65, and Appendix A `table-turn-timer-scale` and `turn-strip-timers`.

- [ ] **Step 4: Run them and see them pass.** Same command: 20 passed.

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, Conventions, the bullet `- Timer display is cosmetic: trust …`: after its line `show paused copy instead of a live countdown.` insert:
    ```
      V7 (L73-13, spec v7 §6.10): `view-model/turn-clock.ts` `turnClock()` checks `none` for the
      tutorial and the finished board, then `paused`, then `absent` (null deadline), then `none`
      for any other null deadline (bot turns), else `countdown`. Seconds come from
      `view.turnDeadlineMs` only. The full length comes from the cached lobby `turnTimeSeconds`
      (`cachedLobbyRules`, L73-12), else the first `TURN_STARTED` of that `turnSequence`
      (`nextTurnStartedRecord`; call it on each new `lastTurnStarted` with `view.turnSequence`
      and the receive time), else seconds only with no ratio. `danger` is the last 10 s and `tick`
      the last 5 s. Once L74 wires it, it replaces the fixed 60 s divisor in `table.tsx`.
    ```
  - `docs/agent/decisions.md`: append at the end, after the L73-11 entry's closing `---`; the entry closes with its own `---`:
    ```
    ## 2026-10-27 · [P] · [DISCREPANCY] Turn clock mode order and deadline source (L73-13)

    Source: technical spec v7 §6.10, the L73-13 brief, Appendix A `turn-strip-timers` and
    `table-turn-timer-scale`, `apps/server/src/rooms/game-room.ts` (`beginTurnOrAbsentAutoPlay`,
    `pauseTimersOwnedBy`, `onReconnect`).

    - **Brief line.** Modes are checked in the order `none` (tutorial, finished board, null
      deadline), `paused`, `absent` (absent with no deadline), `countdown`.
    - **Code line.** The server nulls `turnDeadlineMs` when a turn starts on a disconnected seat
      (the grace window). A null-deadline `none` checked first would hide "Paused — reconnecting"
      at turn start and make `absent`, which needs a null deadline, unreachable. The V2 table
      checks paused and absent before its "—" label (`screens/table.tsx`).
    - **Reading.** `turnClock` checks `none` for the tutorial and the finished board first, then
      `paused`, then `absent` (null deadline), then `none` for any other null deadline (bot turns,
      no active seat), then `countdown`. The brief's cases still hold: a finished board with a
      disconnected last seat is `none`, and a bot turn after a human turn is `none`.
    - **Deadline source.** Seconds come from `view.turnDeadlineMs` only. The `TURN_STARTED` record
      gives the full length, never the seconds, so a stale human record during a bot turn shows
      no countdown (Appendix A `table-turn-timer-scale`, "Bot turn"). The server sends a state
      carrying the same deadline after every `TURN_STARTED`, the resume included.
    - **Not changed.** When an absent seat's turn starts, the server leaves the previous deadline
      in place and auto-draws on the next tick. That brief window shows a countdown from the
      stale deadline, as V2 does.

    ---
    ```
  - `docs/backlog_v7.md`: L73-13 row `To do` → `Done`; Progress `| 73 · View-model | 13 | 12 |` → `| 73 · View-model | 13 | 13 |` and `| **Total** | **134** | **33** |` → `| **Total** | **134** | **34** |`.

- [ ] **Step 6: Verify and commit.** `pnpm verify` green. Lot 73 has no browser gate (spec v7 §12.3), so the lot is ready for its PR once this commit lands. Then:
  ```
  git add apps/client/src/view-model/turn-clock.ts apps/client/src/view-model/turn-clock.test.ts \
    docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md
  git commit -m "feat(view-model): add turnClock() (L73-13)" \
    -m "Check paused and absent before the null-deadline none: the server nulls the deadline when a turn starts on a disconnected seat. Seconds come from view.turnDeadlineMs; TURN_STARTED gives only the length. See decisions.md."
  ```

**Acceptance map:**
- One test per mode: `none` (`is none in the tutorial, even with a deadline`, `is none on the finished board, even with a disconnected last seat`, `is none on a bot turn after a human turn`), `paused` (`is paused while the active seat is disconnected, with or without a deadline`), `absent` (`is absent when the active seat is absent with no deadline`), `countdown` (`counts down a 30 s host turn with 15 s left at ratio 0.5`).
- A 30 s host turn with 15 s left gives ratio 0.5: `counts down a 30 s host turn with 15 s left at ratio 0.5`.
- A resume `TURN_STARTED` keeps the original length: `keeps the original length when a resume TURN_STARTED arrives for the same turn`.
- No cached rules and no record give seconds only: `gives seconds only with no cached rules and no record`.
- `danger` starts at 10 s and `tick` at 5 s: `with %i ms left shows %is, danger %s, tick %s` and `names the thresholds`.
- A bot turn after a human turn is `none`: `is none on a bot turn after a human turn`.
- A finished board with a disconnected last seat is `none`: `is none on the finished board, even with a disconnected last seat`.
- `pnpm verify` green: Step 6.

**Decisions:**
- Mode order as recorded in the decisions entry above. The brief's literal order makes `absent` unreachable and hides `paused` at turn start (`game-room.ts` `beginTurnOrAbsentAutoPlay` nulls the deadline for a disconnected seat). V2 checks paused and absent first.
- Seconds use `view.turnDeadlineMs`, not V2's `lastTurnStarted?.deadlineMs ?? view.turnDeadlineMs`. This fixes the stale bot-turn countdown (Appendix A `table-turn-timer-scale`). The record keeps the first sighting, so its `deadlineMs` is that sighting's and only feeds the length.
- `absent` needs a null deadline (brief, V2 `table.tsx`, Appendix A `turn-strip-timers`). An absent seat with a stale deadline falls to `countdown`, and a test pins it.
- A first sighting whose `deadlineMs − receivedAtMs ≤ 0` (client clock ahead) gives no length, so seconds only, with no divide by zero or negative ratio. `ratio` is clamped to `[0, 1]` because a first sighting can come mid-turn (walk-in, claim, resume) and the server can restart a full turn on the same `turnSequence` (`turnAdvanced === false`).
- `danger` and `tick` read the displayed `secondsLeft` (ceil), so the red "10s" and the number agree. Both stay true at `0s`.
- `TurnClockModel` is a union: idle modes carry only `label`. The idle copy reuses the V2 strings verbatim (U+2014 em dash) as constants owned by this module. `table.tsx` keeps its inline strings until L75 replaces it (no player-visible change in L73).
- `TurnClockInput` names the contract's inline input type; the shape is unchanged.

---

## Appendix A — Interface contract (final)

The names and shapes every task uses after the cross-task pass. Sources, in precedence order: the code on this branch; spec v7 §4.3, §6.1–§6.12, §11 and §12 with its parity file; the `docs/backlog_v7.md` Lot 73 Acceptance cells; the task sections above. A task may add private helpers inside its own files. It never renames or reshapes anything listed here.

### Shared test fixtures: `view-model/test-fixtures.ts` (L73-02; L73-03 and L73-12 append)

Imported by tests only. Every builder spreads its overrides last. Later tasks append builders and never change a default.

```ts
export function makeCard(cardId: CardId, overrides?: Partial<CardInstance>): CardInstance;
// { instanceId: `${cardId}-1`, cardId, isUpgraded: false }
export function makePlayer(id: string, overrides?: Partial<PublicPlayerView>): PublicPlayerView;
// nickname = id, isEliminated false, isYou false, isBot false,
// connection { status: 'connected', disconnectedAt: null, automaticTurnsTaken: 0, consecutiveTimeouts: 0 },
// activePersistentEffects [], activeShield null, blockTurnsRemaining 0, blockAttacksForbidden false,
// activeAttackBlock null, duplicationActive false, pendingReanimation null, absorbWindowOpen false.
// No botDifficulty, spied, spyingOnYou, eliminationReveal or drawGain unless overridden.
export function makeSelf(overrides?: Partial<PrivateSelfView>): PrivateSelfView;
// kitId 'kamikaze', lives 10, shield 0, shieldIsUpgraded false, points 0, upgradePoints 0,
// hand [], specialCards [], activePersistentEffects [], attackBlockCharges 0.
export function makePlayingView(overrides?: Partial<PlayingStateView>): PlayingStateView;
// phase 'playing', you 'me', gameCode 'TEST', currentTurnPlayerId 'me', turnSequence 1,
// turnOrder ['me', 'p1', 'p2'], turnDeadlineMs null,
// players [makePlayer('me', { isYou: true }), makePlayer('p1'), makePlayer('p2')],
// self makeSelf(), pendingEffects [], actionLog [], pool [], poolBuyCost 1, pendingSentences [],
// playKind 'classic', tutorialIndex null. No isSpectator, claimableSeats or chatMessages.
export function makePending(
  input: Pick<PendingEffectView, 'id' | 'sourcePlayerId' | 'targetPlayerId' | 'cardId'> & Partial<PendingEffectView>,
): PendingEffectView; // isUpgraded false, queuedAt 1, damageMultiplier 1, redirectedBy null
export function makePersistent(
  input: Pick<PersistentEffectView, 'id' | 'cardId'> & Partial<PersistentEffectView>,
): PersistentEffectView; // isUpgraded false, counter null, targetPlayerId null

// L73-02
export function makeEliminationReveal(overrides?: Partial<EliminationRevealView>): EliminationRevealView;
// kitId 'kamikaze', hand [], specialCards [], lives 0, points 0, upgradePoints 0, shield 0,
// shieldIsUpgraded false, turnSequence 1.

// L73-03
export function makeTableView(ids: readonly string[], overrides?: Partial<PlayingStateView>): PlayingStateView;
// makePlayingView({ turnOrder: [...ids], players: ids.map((id) => makePlayer(id, { isYou: id === you })), ...overrides }),
// where you = overrides?.you ?? 'me'. A walk-in passes { you: 'watcher', isSpectator: true }.

// L73-12
export type LobbyViewOverrides = Partial<Omit<LobbyStateView, 'lobbyRules'>> & { lobbyRules?: LobbyRules | null };
export function makeLobbyView(overrides?: LobbyViewOverrides): LobbyStateView;
// phase 'lobby', you 'me', gameCode 'TEST', hostPlayerId 'me',
// players [{ id: 'me', nickname: 'me', isBot: false, isReady: true }], yourKitSelection 'random',
// lobbyRules defaultLobbyRules(); `lobbyRules: null` omits the field.
export type FinishedViewOverrides = Partial<Omit<FinishedStateView, 'lobbyRules'>> & { lobbyRules?: LobbyRules | null };
export function makeFinishedView(overrides?: FinishedViewOverrides): FinishedStateView;
// finalTable makePlayingView(); gameCode, players, playKind and tutorialIndex copied from finalTable;
// phase 'finished', you 'me', winnerPlayerId 'me',
// recap { turnSequence: finalTable.turnSequence, players: [], eliminations: [] }, exportLog { turns: [], events: [] },
// lobbyRules defaultLobbyRules(); `lobbyRules: null` omits it (the wire shape of a tutorial finish).
```

Tests that change the seat set pass `players` and `turnOrder` together. A test that changes the POV's resources sets `self`; the POV's `PublicPlayerView` carries no private values.

### `view-model/seats.ts` (L73-02; L73-03 adds `seats`)

```ts
export type SeatTier = 'unspied' | 'base-spy' | 'spy-plus' | 'eliminated'; // wire fields only (§6.3)
export type PovMode = 'seated' | 'reanimating' | 'watching' | 'walk-in-fogged';
export interface SeatResource { kind: LogResourceKind; value: number | '?' }
export const SEAT_BADGE_KINDS = [
  'spying-on-you', 'block', 'invisibility', 'sentence', 'shield',
  'persistent', 'duplication', 'draw-gain', 'reanimation', 'absorb-window',
] as const;
export type SeatBadgeKind = (typeof SEAT_BADGE_KINDS)[number];
export const SEAT_VISIBLE_BADGE_COUNT = 2;
export type SeatBadge =
  | { kind: 'spying-on-you' }
  | { kind: 'block'; turnsRemaining: number }             // 0 = attack ban only (L25-01)
  | { kind: 'invisibility'; effect: PersistentEffectView }
  | { kind: 'sentence'; sentence: PendingSentenceView }
  | { kind: 'shield'; isUpgraded: boolean }
  | { kind: 'persistent'; effect: PersistentEffectView }
  | { kind: 'duplication' }
  | { kind: 'draw-gain'; amount: number }
  | { kind: 'reanimation'; isUpgraded: boolean }           // eliminated seats only
  | { kind: 'absorb-window' };                             // eliminated seats only
export type SeatAvatar = { kind: 'kit'; kitId: KitId } | { kind: 'initial'; initial: string };
export interface SeatReveal { mode: 'spy' | 'elimination'; hand: readonly CardInstance[]; specialCards: readonly CardInstance[] }
export interface SeatModel {
  playerId: string;
  nickname: string;
  seatColorIndex: number;                 // seatColorIndexOf(view, playerId)
  tier: SeatTier;
  avatar: SeatAvatar;
  kitHidden: boolean;                     // tier 'unspied' or 'base-spy' (Q66)
  resources: readonly SeatResource[];     // always 4, LOG_RESOURCE_KINDS order
  badges: readonly SeatBadge[];           // all, SEAT_BADGE_KINDS order
  badgeOverflow: number;                  // max(0, badges.length − SEAT_VISIBLE_BADGE_COUNT)
  isActive: boolean;
  isEliminated: boolean;
  botDifficulty: BotDifficulty | null;    // null: human, eliminated seat, or tutorial
  connectionLabel: string | null;         // connectionLabel(player)
  reveal: SeatReveal | null;
}
export interface SeatList { pov: PovMode; seats: readonly SeatModel[] } // non-POV seats, view.players order
export function povModeOf(view: PlayingStateView): PovMode;
export function seatList(view: PlayingStateView): SeatList;
/** seatIndexOf (view.players position), else that position past the palette, else 0. */
export function seatColorIndexOf(view: PlayingStateView, playerId: string): number;
/** connectionBadgeLabel(player), or null when connected or eliminated. */
export function connectionLabel(player: PublicPlayerView): string | null;
// L73-03:
export interface SeatsModel extends SeatList { layout: SeatLayout }
export function seats(view: PlayingStateView, layoutBox: LayoutBox): SeatsModel; // spec v7 §4.3 name
```

### `view-model/seat-layout.ts` (L73-03)

```ts
export type LayoutMode = ViewportMode;                       // ui/viewport-mode.ts
export interface Size { width: number; height: number }
export interface LayoutBox { viewport: Size; arena: Size }
export function layoutModeFor(viewport: Size): LayoutMode;    // = viewportModeFor(viewport)
export function seatOrder(view: PlayingStateView): readonly string[]; // next after the POV first; a walk-in from turnOrder[0]
export const SEAT_MIN_GAP_PX = 8;
export const SEAT_BOX: Readonly<Record<LayoutMode, Size>>;    // portrait 76×92, landscape-compact 76×84, desktop 120×136
export const PLATE_BOX: Readonly<Record<LayoutMode, Size>>;   // portrait 120×96, landscape-compact 140×80, desktop 220×160
export interface SeatPlacement { playerId: string; centerX: number; centerY: number }
export type SeatLayout =
  | { kind: 'arc'; mode: LayoutMode; placements: readonly SeatPlacement[] }
  | { kind: 'grid'; mode: LayoutMode; rows: readonly (readonly string[])[] };
export function plateCenterFor(mode: LayoutMode, arena: Size): { centerX: number; centerY: number };
export function layoutSeats(view: PlayingStateView, box: LayoutBox): SeatLayout;
```

### `view-model/threats.ts` (L73-04; L73-05 adds `recurring`)

```ts
export type ThreatRelation = 'incoming' | 'outgoing' | 'third-party';
export type ThreatLabel = { kind: 'damage'; amount: number } | { kind: 'effect'; cardId: CardId };
export type ThreatEntryTone = ReturnType<typeof threatToneFor> | 'mine'; // 'attack' | 'effect' | 'mine'; no fx/ import
export interface ThreatEntry {
  effectId: string; sourcePlayerId: string; targetPlayerId: string; cardId: CardId; isUpgraded: boolean;
  queuedAt: number;
  relation: ThreatRelation;
  tone: ThreatEntryTone;
  sourceSeatColorIndex: number;                   // seatColorIndexOf(view, sourcePlayerId)
  label: ThreatLabel;                             // never a summed total
  groupKey: string;                               // `${sourcePlayerId}|${targetPlayerId}|${queuedAt}|${cardId}`
  fanOutKey: string | null;                       // its FanOutGroup key, else null
  mirrorBadge: PendingEffectRedirectSource | null; // 'mirror' | 'super-mirror', from redirectedBy
  mirrorEligible: boolean;                        // subChoice?.kind === 'mirror' && eligibleEffectIds includes effectId
}
export interface FanOutGroup {
  key: string;                                    // `${sourcePlayerId}|${queuedAt}|${cardId}`
  sourcePlayerId: string; cardId: CardId; queuedAt: number;
  targets: readonly { playerId: string; effectId: string; label: ThreatLabel }[];
}
export interface ThreatsModel {
  entries: readonly ThreatEntry[];
  fanOuts: readonly FanOutGroup[];
  recurring: readonly RecurringChip[];            // L73-05
}
export function threats(view: PlayingStateView, subChoice: SubChoiceRequiredPayload | null): ThreatsModel;
export function gridThreatEntries(model: ThreatsModel, povId: string, tappedSeatId: string | null): readonly ThreatEntry[];
export function seatThreatIds(model: ThreatsModel, playerId: string): { incoming: readonly string[]; outgoing: readonly string[] };
```

### `view-model/recurring-chips.ts` (L73-05)

```ts
export type RecurringCardId = 'poison' | 'imposition' | 'curse';
export type RecurringAmount =
  | { kind: 'lives-per-turn'; lives: number }                          // Poison
  | { kind: 'points-above-floor'; maxPoints: number; floor: number }   // Imposition
  | { kind: 'life-per-points-spent'; pointsPerLife: number };          // Curse
export const CLIENT_POISON_LIVES = { base: 1, upgraded: 2 } as const;
export const CLIENT_IMPOSITION_FLOOR = 7;
export const CLIENT_IMPOSITION_CAP = { base: 2, upgraded: 4 } as const;
export const CLIENT_CURSE_POINTS_PER_LIFE = { base: 3, upgraded: 2 } as const;
export interface RecurringChip {
  effectId: string; cardId: RecurringCardId; ownerPlayerId: string; isUpgraded: boolean;
  amount: RecurringAmount; paused: boolean;
}
export function recurringChips(view: PlayingStateView): readonly RecurringChip[];
```

### `view-model/action-lock.ts` and `view-model/action-reasons.ts` (L73-06)

```ts
// action-lock.ts
export interface ActionContext { subChoice: SubChoiceRequiredPayload | null; readOnly: boolean } // readOnly = finished board
export type LockReason = 'not-your-turn' | 'actions-locked';
export function actionLock(view: PlayingStateView, ctx: ActionContext): LockReason | null;
// 'actions-locked' for readOnly, an open sub-choice, an eliminated POV or a walk-in; else 'not-your-turn' off-turn; else null.

// action-reasons.ts
export const DISABLED_REASONS = [
  'not-your-turn', 'actions-locked', 'invisibility', 'attack-ban',
  'not-enough-points', 'not-enough-lives', 'no-upgrade-point',
  'no-valid-target', 'nothing-to-consume', 'temporarily-unavailable',
  'no-living-spy', 'pool-empty',
] as const;
export type DisabledReason = (typeof DISABLED_REASONS)[number];
export const DISABLED_REASON_COPY: Record<DisabledReason, string>; // Appendix B, New strings
export interface ActionAvailability { enabled: boolean; reason: DisabledReason | null } // reason null iff enabled
export function availabilityFor(reason: DisabledReason | null): ActionAvailability; // the only builder
```

### `view-model/card-actions.ts` (L73-06 hand, special and read-only; L73-07 in play; L73-08 drop zones)

```ts
export type CardRef =
  | { zone: 'hand' | 'special'; instance: CardInstance }
  | { zone: 'read-only'; instance: CardInstance }        // opponent Spy hand, log, queue, pool, shop
  | { zone: 'active'; ownerPlayerId: string; effect: PersistentEffectView }   // L73-07
  | { zone: 'shield'; ownerPlayerId: string; isUpgraded: boolean }            // L73-07
  | { zone: 'sentence'; ownerPlayerId: string; sentence: PendingSentenceView }; // L73-07
export type InPlayCardRef = Extract<CardRef, { zone: 'active' | 'shield' | 'sentence' }>; // L73-07
export type CardActionKind = 'use' | 'upgrade' | 'sell' | 'multi-attack' | 'deactivate';
export interface CardAction extends ActionAvailability { kind: CardActionKind } // hidden actions are absent
export const REGENERATION_QUANTITIES = [1, 2, 3, 4] as const;
export type RegenerationQuantity = (typeof REGENERATION_QUANTITIES)[number];
export interface RegenerationTile extends ActionAvailability { quantity: RegenerationQuantity; label: string; totalCost: number }
export type UseRouting =
  | { kind: 'target'; seatIds: readonly string[] }   // may be empty: Use disabled 'no-valid-target'
  | { kind: 'send' }
  | { kind: 'regeneration'; tiles: readonly RegenerationTile[] }
  | { kind: 'consume'; options: readonly CardInstance[] };
export const MULTI_ATTACK_MIN_ATTACKS = 2;
export interface MultiAttackRow { instance: CardInstance; seatIds: readonly string[] }
export interface MultiAttackModel { rows: readonly MultiAttackRow[]; minAttacks: typeof MULTI_ATTACK_MIN_ATTACKS }
export type PlateDrop = 'send' | 'regeneration' | 'consume';                  // L73-08
export interface DropZones { seatIds: readonly string[]; plate: PlateDrop | null; sell: boolean } // L73-08
export interface CardActionsModel {
  instanceId: string;              // hand / special / read-only: CardInstance.instanceId; active: effect.id;
                                   // own Shield: 'active-shield'; another seat's Shield: `active-shield:${ownerPlayerId}`;
                                   // Sentence: sentence.id
  actions: readonly CardAction[];  // order use, upgrade, sell, multi-attack, deactivate
  use: UseRouting | null;          // null when Use is absent
  multiAttack: MultiAttackModel | null;
  drop: DropZones;                 // L73-08
  canDrag: boolean;                // L73-08
}
export function cardActions(view: PlayingStateView, card: CardRef, ctx: ActionContext): CardActionsModel;

// L73-07 thumbs
export type ThumbBadge =
  | { kind: 'card-lives'; value: number }       // persistent counter, any persistent but Invisibility
  | { kind: 'turns'; value: number }            // Invisibility turns left
  | { kind: 'sentence-turns'; value: number };  // PendingSentence.remainingOwnerTurns
export interface InPlayThumb {
  ref: InPlayCardRef;        // own Shield: isUpgraded = self.shieldIsUpgraded; another seat's: activeShield.isUpgraded
  instance: CardInstance;    // instanceId = the model's instanceId
  badge: ThumbBadge | null;  // null for Shield and any counter-null persistent
  activatedArt: boolean;     // never for Shield or Sentence
}
export function inPlayThumbs(view: PlayingStateView, ownerPlayerId: string): readonly InPlayThumb[];
// order: Shield (own: while self.shield > 0), persistents, ticking Sentences of that owner
```

### `view-model/drop-target.ts` (L73-08)

```ts
export interface Rect { left: number; top: number; width: number; height: number } // half-open
export interface Point { x: number; y: number }
export interface DropZoneRects { seats: readonly { playerId: string; rect: Rect }[]; plate: Rect | null; sell: Rect | null }
export type CardIntent =
  | { kind: 'playCard'; payload: PlayCardPayload }
  | { kind: 'sellCard'; payload: SellCardPayload };
export type DropResult = { kind: 'intent'; intent: CardIntent } | { kind: 'open-choice'; choice: 'regeneration' | 'consume' };
export function dropTarget(pointer: Point, zoneRects: DropZoneRects, actions: CardActionsModel): DropResult | null;
```

### `view-model/self-strip.ts` (L73-09)

```ts
export const SELF_STRIP_POV_LABELS: { reanimating: 'Reanimating'; watching: 'Watching' }; // keyed by PovMode
export const DRAW_HOT_ABOVE = 10;
export interface SelfThumb extends InPlayThumb { actions: CardActionsModel }
export interface SelfResources { lives: number; shield: number; shieldIsUpgraded: boolean; points: number; upgradePoints: number }
export type SelfFlowBadge =
  | { kind: 'block'; turnsLeft: number } | { kind: 'attack-ban' }
  | { kind: 'invisibility'; turnsLeft: number | null } | { kind: 'reanimating' };
export interface DrawControl extends ActionAvailability { gain: number; hot: boolean }
export interface DockShopEntry { browseOnly: boolean }
export interface UnspyControl extends ActionAvailability { cost: StructuredCost; spyIds: readonly string[]; preselectedSpyId: string | null }
export interface DockModel {
  draw: DrawControl | null; shop: DockShopEntry | null; unspy: UnspyControl | null;
  duplication: ActionAvailability | null; stats: boolean;
}
export interface SelfStripModel {
  playerId: string; pov: PovMode; povLabel: string | null; leave: boolean;
  seatColorIndex: number | null; isActive: boolean; kitId: KitId | null; resources: SelfResources | null;
  thumbs: readonly SelfThumb[]; connectionLabel: string | null; flowBadges: readonly SelfFlowBadge[];
  duplicationActive: boolean; dock: DockModel;
}
export function selfStrip(view: PlayingStateView, ctx: ActionContext): SelfStripModel;
```

### `view-model/shop.ts` (L73-10)

```ts
export const SPECIAL_CARD_PURCHASE_POINTS = 20; // the only client copy (Q50); imported by opponent-token-chips.ts and shop-dialog.tsx
export const SHOP_TABS = ['cards', 'special', 'pool', 'upgrade-points'] as const;
export type ShopTab = (typeof SHOP_TABS)[number];
export const SHOP_TAB_LABELS: Readonly<Record<ShopTab, string>>;
export type ShopHighlight =
  | { tab: 'upgrade-points'; item: Extract<TutorialShopSpotlight, 'upgrade-point'> }
  | { tab: 'cards'; item: Extract<TutorialShopSpotlight, 'absorber'> };
export interface ShopCardTile {
  cardId: SharedCardId; instance: CardInstance; cost: StructuredCost | null;
  affordable: boolean; highlighted: boolean; buy: ActionAvailability;
}
export interface ShopCardsModel { tiles: readonly ShopCardTile[]; defaultSelectedCardId: SharedCardId }
export interface ShopSpecialModel { cost: StructuredCost; buy: ActionAvailability }
export interface ShopPoolModel { cards: readonly CardInstance[]; cost: StructuredCost; buy: ActionAvailability }
export interface ShopUpgradePointsModel { buyCostPoints: number; sellYieldPoints: number; buy: ActionAvailability; sell: ActionAvailability }
export interface ShopModel {
  tabs: readonly ShopTab[]; initialTab: ShopTab; highlight: ShopHighlight | null; browseOnly: boolean;
  cards: ShopCardsModel; special: ShopSpecialModel; pool: ShopPoolModel; upgradePoints: ShopUpgradePointsModel;
}
export function shop(view: PlayingStateView, ctx: ActionContext): ShopModel;
```

### `view-model/log.ts` (L73-11)

```ts
export type LogCardSegment = ActionLogCardSegment & { inspectable: boolean };
export type LogSegment = Exclude<ActionLogSegment, ActionLogCardSegment> | LogCardSegment;
export interface LogLine { index: number; kind: ActionLogEntryKind; turnSequence: number; segments: readonly LogSegment[]; text: string }
export interface LogRound { round: number; lines: readonly LogLine[] }
export interface LogModel { ticker: LogLine | null; rounds: readonly LogRound[] }
export function log(view: PlayingStateView): LogModel;
// action-log.ts loses ActionLogFilters, entryInvolvesPlayer, filterActionLog, TurnGroup and groupByTurn.
```

### `view-model/rules-recall.ts` (L73-12)

```ts
export interface RulesRecall extends LobbyRules { readonly allowedKitIds: readonly KitId[] }
export function rulesRecall(view: LobbyStateView | FinishedStateView): RulesRecall | null; // null: no rules, or a tutorial finish
export interface RulesCache { readonly gameCode: string; readonly rules: LobbyRules }
export function nextRulesCache(cache: RulesCache | null, view: StateView | null): RulesCache | null;
export function cachedLobbyRules(cache: RulesCache | null, view: PlayingStateView): LobbyRules | null; // turnClock length source (1)
export function tableRulesRecall(cache: RulesCache | null, view: PlayingStateView): RulesRecall | null;
```

### `view-model/turn-clock.ts` (L73-13)

```ts
export const TURN_CLOCK_MODES = ['countdown', 'paused', 'absent', 'none'] as const;
export type TurnClockMode = (typeof TURN_CLOCK_MODES)[number];
export const TURN_CLOCK_DANGER_SECONDS = 10;
export const TURN_CLOCK_TICK_SECONDS = 5;
export const TURN_CLOCK_NONE_LABEL = '—';
export const TURN_CLOCK_PAUSED_LABEL = 'Paused — reconnecting';
export const TURN_CLOCK_ABSENT_LABEL = 'Absent — auto-draw';
export type TurnLengthSource = 'lobby-rules' | 'turn-started';
/** First TURN_STARTED sighting per turnSequence; gives the length only, never the seconds. */
export interface TurnStartedRecord { turnSequence: number; deadlineMs: number; receivedAtMs: number }
export interface TurnClockInput {
  turnStarted: TurnStartedRecord | null; view: PlayingStateView;
  cachedLobbyRules: LobbyRules | null; readOnly: boolean; nowMs: number;
}
export interface TurnClockIdle { mode: Exclude<TurnClockMode, 'countdown'>; label: string }
export interface TurnClockCountdown {
  mode: 'countdown'; secondsLeft: number; label: string;
  lengthMs: number | null; lengthSource: TurnLengthSource | null; ratio: number | null;
  danger: boolean; tick: boolean;
}
export type TurnClockModel = TurnClockIdle | TurnClockCountdown;
export function turnClock(input: TurnClockInput): TurnClockModel;
// Mode order: (1) none for the tutorial and the finished board; (2) paused while the active seat is
// disconnected; (3) absent while it is absent with a null deadline; (4) none for any other null
// deadline (bot turns); (5) countdown. Seconds come from view.turnDeadlineMs only.
export function nextTurnStartedRecord(previous: TurnStartedRecord | null, sighting: TurnStartedRecord): TurnStartedRecord;
```

---

## Appendix B — Designer questions

Each question has a default that the plan implements and tests. An answer that differs changes only the owning task's code and tests. List them in the Lot 73 PR.

| # | Question | Plan default | Owner |
|---|---|---|---|
| Q1 | **Burst after the first hit resolves.** A fan-out uses the literal "every opponent" test: a (source, card, `queuedAt`) set is one burst only while it covers every living, non-Invisible opponent of the source. A MEGA ATTACK, Suicide or upgraded-thief burst therefore turns into separate arrows once its first target resolves, one turn after the play. Should the burst persist for the remaining copies? That would mean matching the `actionPlayed` log entry, because the queue alone cannot tell it from an Assassin volley that missed a seat. | The literal rule: arrows once a copy has resolved. Test `draws arrows once a fan-out no longer covers every living opponent`. | L73-04 |
| Q2 | **"Hits all" on a 2-seat table.** A hits-all play against a single living opponent has one target. Burst or plain arrow? | A plain arrow. Test `draws a hits-all play on a 2-seat table as a plain arrow`. | L73-04 |
| Q3 | **Curse at 1 life.** The engine ends a Curse on the POV at ≤ 1 life instead of draining (`apply-persistent-effects.ts:269-272`), but §6.5's paused list does not include this case. Should the chip show paused, or ending? | The chip stays live (not paused). | L73-05 |
| Q4 | **Second Reanimation while one is armed.** The server rejects it (`reanimation.ts` `canPlay`, an illegal-action toast). Should Use show a reason such as "Reanimation already armed"? That needs a new code in the fixed `DISABLED_REASONS` list. | Use stays enabled and no code is added: the client may be less strict than the server. Recorded in the L73-06 `decisions.md` entry. | L73-06 |

### New strings (§10.6)

Every player-facing string Lot 73 puts in a view-model constant. "Reused" strings are V2 text kept verbatim; "New" strings need the designer's review.

| String | Constant | Task | Origin |
|---|---|---|---|
| Not your turn | `DISABLED_REASON_COPY['not-your-turn']` | L73-06 | Reused: `ILLEGAL_ACTION_COPY['not-your-turn'].title` |
| Actions locked | `DISABLED_REASON_COPY['actions-locked']` | L73-06 | New: shortened from the V2 card-dialog line "Actions locked — you can still read the card."; the tail is card-only, and Shop and Unspy share this copy |
| Invisible: you can't act on other players | `DISABLED_REASON_COPY.invisibility` | L73-06 | New (V2 showed no text, L58-06) |
| Block: attacks banned this turn | `DISABLED_REASON_COPY['attack-ban']` | L73-06 | New (named in the brief's draft questions) |
| Not enough points | `DISABLED_REASON_COPY['not-enough-points']` | L73-06 | Reused: `ILLEGAL_ACTION_COPY['not-enough-points'].title` |
| Not enough lives | `DISABLED_REASON_COPY['not-enough-lives']` | L73-06 | Reused: `ILLEGAL_ACTION_COPY['not-enough-lives'].title` |
| No upgrade points | `DISABLED_REASON_COPY['no-upgrade-point']` | L73-06 | Reused: `ILLEGAL_ACTION_COPY['not-enough-upgrade-points'].title` |
| No valid target | `DISABLED_REASON_COPY['no-valid-target']` | L73-06 | New (V2 showed an empty picker with no text) |
| No action or attack card in hand to transform. | `DISABLED_REASON_COPY['nothing-to-consume']` | L73-06 | Reused: V2 consume picker, `screens/table/card-actions.tsx` |
| Temporarily unavailable | `DISABLED_REASON_COPY['temporarily-unavailable']` | L73-06 | Reused: `screens/table/card-actions.tsx` |
| Nobody is spying on you | `DISABLED_REASON_COPY['no-living-spy']` | L73-06 | New |
| Pool empty | `DISABLED_REASON_COPY['pool-empty']` | L73-06 | Reused: `ILLEGAL_ACTION_COPY['empty-pool'].title` |
| 1 life / {n} lives | `RegenerationTile.label` | L73-06 | Reused: V2 `regenerationQuantityLabel`, `screens/table/card-actions.tsx` |
| Reanimating | `SELF_STRIP_POV_LABELS.reanimating` | L73-09 | Reused: V2 `flow-status-badges.tsx`; also listed in spec §10.6 |
| Watching | `SELF_STRIP_POV_LABELS.watching` | L73-09 | Reused: the V2 spectator heading in `screens/table.tsx`; also listed in spec §10.6 |
| Special | `SHOP_TAB_LABELS.special` | L73-10 | New (§6.8 tab label) |
| Cards / Pool / Upgrade points | `SHOP_TAB_LABELS` | L73-10 | Reused: `view-model/chrome-labels.ts` |
| — / Paused — reconnecting / Absent — auto-draw / {N}s | `TURN_CLOCK_*_LABEL`, countdown `label` | L73-13 | Reused: V2 `screens/table.tsx` |
| disconnected — grace / absent N/3 / idle timeouts N/5 | `connectionLabel` | L73-02 | Reused: `ui/seat/connection-badge-label.ts` |

L73-01, L73-03, L73-04, L73-05, L73-07, L73-08, L73-11 and L73-12 add no player-facing string.

---

## Appendix C — Draft questions and their dispositions

Resolved in the 2026-10-21 backlog review unless listed under "Designer questions still open" in `docs/backlog_v7.md`; dispositions are recorded in the **Review** lines above and in the amended spec.

- Layout modes (§6.4): some boxes match no mode. Landscape boxes with height ≥ 500 px that are not desktop (for example 1024×600 or 900×650) and portrait boxes under 500 px tall are undefined. Proposed: height under 500 px means landscape-compact first, then desktop, and every other box uses the portrait arc. Related: a walk-in spectator has no anchor. Should its seats start unrotated from `turnOrder[0]` and use the full ellipse in portrait too?
- Seat badges (§6.2): which statuses take the two visible badge slots, and do active persistents and ticking Sentences count as badges or keep a thumbs row on the seat? Proposed order: spying-on-you, Block, Invisibility, ticking Sentence, Shield, persistents, Duplication, then Reanimation / absorb window.
- Recurring chips (§6.5) read as if own Block pauses every chip. The rules spec (Block card) and `apps/server/src/engine/turn/apply-persistent-effects.ts` keep Curse draining during Block; only Poison and Imposition pause, while Invisibility pauses all three. L73-07 follows the rules spec and the engine and records it in `decisions.md`. Confirm.
- Recurring chip amounts: the Poison, Imposition and Curse rates exist only as server constants. L73-07 mirrors them as client constants citing the rules spec, as `CLIENT_SUB_CHOICE_MS` already does. Is that acceptable, or should they move to `packages/shared`, which touches the server? Curse can only show a rate (1 life per 3 or 2 points spent), not a fixed number. Is that acceptable?
- Fan-out (§6.5): is a 'hits all' play against a single living opponent drawn as a plain arrow? An Assassin volley that hits every opponent with the same card id and `queuedAt` looks exactly like a fan-out on the wire. Should it render as the burst, with each target keeping its own label?
- §4.1 lists `fx/play-flyout.ts` '(trigger logic)', but the file is DOM measurement against old-table anchors, apart from its zone constants and selector builders. Should only those move, with the rest staying in `fx/` until L74/L78 rehost the FX?
- Q37 (opponent-Shield Upgrade upgrades your own Shield) stays live in the old table until the L75 flip, because L73 only fixes the new view-model path and changes nothing for players. Should the old table be fixed now instead, with a 'Fixed some bugs.' What's new item?
- Disabled reasons (§11): L73-08 adds 'Block: attacks banned this turn', because the server rejects attacks and Block while `blockAttacksForbidden` is set. It also gives Multi-attack the Invisibility and Block reasons the server already enforces. Should it add 'needs two attacks in hand' for Multi-attack as well? Confirm or trim these.
- turnClock signature: §4.3 lists `{ turnStarted, view, cachedLobbyRules, nowMs }`. L73-15 adds `readOnly`, so a finished board with a disconnected last seat does not show 'Paused'. It also adds a record that keeps the first sighting's length per `turnSequence`. Accept this extension?
- Overlap with L72: §5.5 moves the `asset-lookup` tests in L72's art task, and §4.2 lets L72 rebuild shared pieces (`chat-unread`, `table-banner`, `kit-inspect-traits`…). L73-01 and L73-02 move only what the `backlog_v7.md` §4.1 list still shows as unmoved. Is that list the single source? Should old-layout helpers that L75 deletes (`card-band-fit.ts`, `felt-collapse.ts`) stay where they are rather than move?
- L76 and L80 run in parallel from L72 and may import modules that L73-01 and L73-02 move (`release-storage`, `help-storage`, `chat-unread`, `structured-cost`, `seat-colors`). Should L73-01 and L73-02 merge into `dev` first and the parallel branches rebase, or should those paths stay frozen until L76 merges?
- Finding outside V7: server bot code still reads `spied.resourcesSnapshot` (`apps/server/src/bots/score-engage/score-actions.ts:68`, `apps/server/src/bots/belief/determinize.ts:119` and `:230`). The server has not sent that field since Lot 69, so bots never see base-Spy resources. Should this be tracked as a separate V5 or server fix (§14.1)? **Corrected 2026-10-27:** this is no behavior bug. Every bot path reads the live `spied.*` fields first, and the server has sent them since Lot 69. Only the snapshot fallback is dead code. It is tracked as separate work in spec v7 §14.1 (designer: separate fix).
