# V7 Lot 81 — Close-out: task briefs

> Implements `docs/technical_spec_v7.md` (read it first) for Lot 81; parity checklist `docs/technical_spec_v7_parity.md`. Tracker: `docs/backlog_v7.md`.
> **Brief plan.** Step-by-step TDD instructions (superpowers:writing-plans format) are written from these briefs just before the lot executes, once the interfaces of earlier lots exist.
> Each brief was drafted from the spec and the code on `dev` `1de498d`, then restructured by the 2026-10-21 backlog review; a **Review** line overrides the brief where they differ.

## Draft id → final id

Briefs below may cite other tasks by their draft id; use this table.

| Draft | Final |
|---|---|
| L81-01 | L81-01 |
| L81-03 | L81-02 |
| L81-04 | L81-03 |
| L81-05 | L81-04 |
| L81-06 | L81-05 |
| L81-07 | L81-06 |

Cross-lot moves: draft L73-01 → L72-03, L73-02 → L72-04, L73-03 → L73-01; draft L72-03 split into L72-06 (harness) and L72-07 (icons); draft L74-02 dropped (sheet stack is L72-09); draft L76-18 folded into the Lot 76 copy task; draft L81-02 folded into L81-01.

## Lot scope

Close-out: delete `design/`, Outfit, legacy assets and dead code, sweep stale playbook lines, full V7 playtest, What's new polish. V7 closes after this lot.

## L81-01 — Remove remaining §11 dead client code

**Cx / risk:** S / Low · **Depends on:** Lot 74, Lot 75, Lot 80, Lot 78, Lot 79 · **Spec:** §11, §13 (Q35, Q62, Q81), §6.5, §6.8, §1, §12.1
**Parity (Appendix A):** `legacy-inbox-redirect`, `global-app-router`, `global-client-storage`, `admin-feedback-inbox-page`, `table-tutorial-script-spotlight`, `table-subchoice-mirror`, `table-fx-queue-overlay`, `table-action-log-panel`
**Files:** `apps/client/src/screens/inbox.tsx`, `apps/client/src/view-model/ (tutorial-coach-copy.ts and action-log.ts at their L73 location, with tests)`, `apps/client/src/fx/table-fx-context.tsx`, `apps/client/src/fx/table-fx-hooks.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

Sweep the dead code listed in technical spec v7 §11 (Q35, Q62, Q81) and delete every item still present after Lots 72–80:
- legacy `screens/inbox.tsx` (`InboxScreen`; nothing imports it, parity `legacy-inbox-redirect`);
- the tutorial legacy helpers `tutorialIncomingThreatIds`, `isTutorialIncomingThreatCard` (superseded by the L51-07 tones) and `tutorialShopSpotlight` (superseded by the V7 shop tab focus, §6.8), plus any other `tutorial-coach-copy` export that has no non-test importer;
- `TableFxContext.mirrorHighlightIds` / `setMirrorHighlightIds` (`fx/table-fx-context.tsx`, `fx/table-fx-hooks.ts`). The Mirror highlight now comes from `subChoice.eligibleEffectIds` through `threats()` (§6.5);
- the log exports `filterActionLog`, `groupByTurn`, `entryInvolvesPlayer` and `ACTION_LOG_KINDS`, each one only if it still has no non-test importer after the L74 `log()` view-model;
- `persistent-incoming.ts`, if it still exists (Q35).

Each removal drops only the tests that cover the deleted export. These stay: the `/inbox` → `/admin/feedback` redirect, `inbox/fetch-inbox.ts` and `inbox/password-storage.ts` (used by `/admin`), the `card-battle.v6.inboxPassword` key, and the shared `TutorialHighlight` union, `'opponent-portrait'` included (`packages/shared` edits are copy-only, §1). In `frontend.md`, the Screens table drops the legacy Inbox screen row and keeps the redirect documented.

**Acceptance:** - A grep finds none of the listed identifiers in `apps/client/src`, and `screens/inbox.tsx` is gone.
- The redirect tests (`inbox-route.test.ts`, `admin-route.test.ts` or their V7 rewrites) still pass.
- The Mirror eligible-effect highlight tests (L74) and the tutorial shop-tab tests (L75) still pass.
- The PR lists each removed test next to the export it covered. No test of a shipped behavior is removed.
- `pnpm verify` green.

**Review:** Folds the former L81-02: verify the "dies by Gambling" line is unreachable (server `perform-action.ts` relabel) before deleting it. Does not touch `inbox.tsx` (Lot 80) or `TableFxContext.mirrorHighlightIds` (Lot 74).

## L81-02 — Delete apps/client/src/design/

**Cx / risk:** M / Medium · **Depends on:** Lot 73, Lot 75, Lot 76, Lot 77, Lot 80, Lot 78, Lot 79 · **Spec:** §4.1, §4.2, §5.4, §5.5, §5.8, §12.1, §12.5
**Parity (Appendix A):** `global-dialog-button-primitives`, `global-dialog-interaction-contract`, `global-card-face`, `global-card-effect-copy-inline-icons`, `global-resource-captions`, `global-dialog-width`, `global-visual-viewport-fit`, `global-tooltip-unused`, `global-art-catalog`, `global-art-lot63-gambler-roulette`, `global-activated-art-guard`, `global-connection-badge`
**Files:** `apps/client/src/design/ (deleted)`, `apps/client/src/ui/`, `apps/client/src/view-model/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`

Delete `apps/client/src/design/`, the V2 look. Its life ends in Lot 81 (technical spec v7 §4.2: no file outlives its replacement).

1. At the start, regenerate the importer list (`grep -rn "/design/" apps/client/src`).
2. Move any pure module still under `design/` per §4.1, with its tests, changing only import paths.
3. Move every surviving importer of a V2 component (old `Button`, `Dialog`, `Card`, `SeatTile`, `CardChoiceTile`, `LifeCountBadge`, `ConnectionBadge`, the unused `Tooltip` L12-08…) onto its `ui/` primitive.
4. Classify every remaining `readFileSync` test under `design/` per §12.1:
   - product behavior (root has no `100dvh` and dialogs fit the visible viewport, L53-02/07; spoken cost on `CostDisplay`; card thumb title with name, upgrade and damage) is rewritten as a behavior test on the `ui/` replacement, with the same outcome;
   - V2 layout detail is retired, with one `decisions.md` entry citing §4.2 / §5.
   Update the matching rows of the `docs/backlog_v7.md` classification table.
5. In `frontend.md`, rewrite the component, asset-lookup and data-only kit registration paragraphs of 'Design system (V2 · Lots 10+)' so they point at `ui/`, `view-model/`, `artFor` / `assets/art/` / `scripts/extract-art.ts` (§5.5) and `DESIGN.md` (§5.8).
6. `DESIGN.md` drops any `design/` reference.

**Acceptance:** - `apps/client/src/design/` no longer exists, and no import path in `apps/client/src` contains `/design/`.
- Every former `design/` test is either rewritten (its behavior test passes against the `ui/` component) or listed as retired in the `decisions.md` entry and the §12.1 table.
- No `readFileSync` test reads a deleted path.
- The information the native titles carry (parity `global-tooltip-unused` Keep line) is still exposed by `ui/` labels and titles.
- `pnpm verify` green.

_Draft id L81-03._

## L81-03 — Retire V2 theme: Outfit and light tokens

**Cx / risk:** M / Medium · **Depends on:** L81-02, Lot 78, Lot 79 · **Spec:** §4.4, §4.5, §5.1, §5.2, §5.8, §12.5
**Parity (Appendix A):** `global-app-router`, `global-visual-viewport-fit`, `global-text-input-no-ios-zoom`, `global-motion-reduced-motion`
**Files:** `apps/client/package.json`, `pnpm-lock.yaml`, `apps/client/src/main.tsx`, `apps/client/src/index.css`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/agent/decisions.md`

Remove `@fontsource/outfit` with `pnpm remove --filter @card-battle/client @fontsource/outfit` (technical spec v7 §4.5), along with its three imports in `main.tsx`. Tailwind's default `--font-sans` then resolves to the §5.2 body font (Nunito, self-hosted since L72 `ui/fonts.ts`), so no text falls back to Outfit or a system font.

In `index.css`:
- drop the V2 light-theme `@theme` tokens (`surface*`, `ink*`, `border*`, `slate*`, `cta-*`, the V2 `seat-*` and `resource-*` values) and the V2 global rules and keyframes that no shipped file uses any more (e.g. `.table-felt*`, `[data-card-row]` landscape rules). They lived only until their screen migrated (§4.4);
- keep the `#root` overflow / no-`100dvh` rule and every rule a V7 element still uses;
- in `@layer base`, give `html` / `body` the V7 text color and ground (§5.1).

Also:
- update `DESIGN.md` (re-run Impeccable `document` or edit it) and the 'Stack' / 'Tokens' lines of `frontend.md`;
- append a dated `decisions.md` entry that supersedes 2026-08-01 'V2 design tokens from assets (L10-02)' (Outfit and the V2 palette).

**Acceptance:** - A grep for 'outfit' (case-insensitive) in `apps/client` outside `node_modules` returns nothing, and `pnpm-lock.yaml` has no `@fontsource/outfit`.
- Every token and global rule left in `index.css` has a consumer (grep list in the PR).
- The root-viewport behavior test (no `100dvh`, `#root` overflow hidden) still passes.
- `pnpm --filter @card-battle/client build` succeeds.
- Spot check at 375×812 on Home, the table, Game over and `/admin`: computed fonts are Lilita One, Fredoka or Nunito, never Outfit, and no light V2 surface shows.
- `pnpm verify` green.

**Review:** Also deletes `apps/client/src/assets/{cards,kits,backs,icons}` files no module imports; `images/` and `assets/how-to-play/` stay.

_Draft id L81-04._

## L81-04 — Sweep stale playbook lines and close §12.1 table

**Cx / risk:** M / Low · **Depends on:** L81-01, L81-02, L81-03 · **Spec:** §12.1, §12.5, §6, §7, §15
**Files:** `docs/agent/frontend.md`, `docs/agent/testing.md`, `docs/backlog_v7.md`

Rewrite or delete every `docs/agent/frontend.md` line that still describes a removed V2/V6 element after L81-01…04 (technical spec v7 §12.5, AGENTS.md §12):
- the Status paragraph ('V2 visual language is shipped', 'through Lot 63');
- the Screens table (felt-shell Table, `screens/table.tsx` + `screens/table/*`);
- the remaining V2 Design system and Table paragraphs (felt, turn strip, center-stage log, dock Incoming, pager, `SeatTile` pickers, `persistent-incoming` chips, Tooltip);
- the reusable 'V6 first-time gate (L48)' steps that name removed controls (`/inbox` password list, turn-strip `?` / `!`, Incoming beside the kit). They are re-pointed at the V7 elements of §6–§7 and at `/admin/feedback`.

Dated 'Lot NN verified' records stay as history.

Also:
- the `docs/agent/testing.md` client-environment paragraph (node-only, source-read) is brought in line with the L72 Vitest config (happy-dom component tests, `.test.tsx`);
- the §12.1 classification table in `docs/backlog_v7.md` gets a class and a replacement test (or a retirement decision) on every row.

**Acceptance:** - Outside the 'Lot NN verified' records, `frontend.md` mentions none of: `screens/table`, `design/components`, `table-felt`, felt shell, `Outfit`, `SeatTile`, `TableShell`, `?ui=next`, `InboxScreen`, turn strip, pager.
- Every file path that `frontend.md` names exists.
- The first-time gate can be followed on the current tree.
- A fresh `grep -rl readFileSync apps/client/src --include='*.test.ts*'` lists only files classified as kept in the §12.1 table.
- `pnpm verify` green.

_Draft id L81-05._

## L81-05 — Finalize the V7 What's new entry

**Cx / risk:** S / Low · **Depends on:** Lot 79 · **Spec:** §10.4, §10.6, §15
**Parity (Appendix A):** `home-whats-new`, `home-whats-new-dismiss`, `home-whats-new-seen-storage`
**Files:** `packages/shared/src/release-notes.ts`, `packages/shared/src/release-notes tests (latest-id pins)`, `docs/agent/frontend.md`

Do the final editorial pass on the open V7 What's new entry in `packages/shared/src/release-notes.ts` (technical spec v7 §10.4):
- it names each player-facing V7 change that Lots 74–79 appended and that no shipped entry already covers, once each;
- each item keeps Before / After, one short sentence per side; bug fixes such as the turn-clock bar read `Fixed some bugs.` (designer 2026-09-29);
- the title matches the entry's final scope;
- shipped entries are untouched.

The `release-notes.ts` header comment and the `frontend.md` What's new paragraph name the V7 entry ids and say which are on `main`. Tests that pin the latest id are updated in the same commit. The close-out removals (L81-01…05) add no item, because they change nothing the player sees.

**Acceptance:** - What's new tests green: the latest id is pinned, the `current` scope shows only the open entry, and `history` lists every entry newest first.
- The diff touches no shipped entry.
- The PR lists every item for designer wording review.
- `pnpm verify` green.

_Draft id L81-06._

## L81-06 — Full V7 playtest and design gate

**Cx / risk:** L / Medium · **Depends on:** L81-01…L81-05 · **Spec:** §12.3, §12.4, §12.5, §8.3, §9, §15
**Parity (Appendix A):** `global-app-router`, `global-room-connection-lifecycle`, `home-hub`, `home-whats-new`, `lobby-action-row`, `lobby-rules-summary`, `lobby-chat`, `table-shell-layout`, `table-turn-timer-scale`, `table-subchoice-mirror`, `table-subchoice-reward`, `table-subchoice-slot-drop`, `walk-in-spectator-mode`, `table-tutorial-flow`, `table-chat-popup`, `rules-recall-table-end`, `end-game-over-dialog`, `finished-board-readonly`, `admin-shell`
**Files:** `docs/agent/frontend.md`, `AGENTS.md`, `docs/backlog_v7.md`, `apps/client/src/ (fix commits only, as found)`

Run the full post-lot browser gate over the whole client on the final tree (technical spec v7 §12.3, `frontend.md` Post-lot browser gate). Use two browsers and `TURN_DURATION_MS=300000 pnpm dev`.

Table:
- viewports 360×740, 375×812, 390×844, one landscape phone and 1440×900;
- tables of 2, 4 and 8 seats;
- scenarios: incoming attack, mutual cancel, Mirror, elimination + reward, slot-drop, base Spy and Spy+, spectator, full tutorial, reconnect, house rules, chat.

Other surfaces:
- Home: Solo / Online / Tutorial, How to play, the What's new auto popup with the final entry, Feedback;
- lobby: rules, chat, kit picker, claim, invite link;
- Game over: awards, Play again, View board, Return home ask-once;
- `/admin` at 1440×900 and 390×844;
- reduced motion (§8.3) and the Sound / Vibration settings (§9).

Design gate (§12.4): run the Impeccable detector on the shipped V7 files with no unapproved ignore, then an Impeccable `critique` of every surface.

For each defect: find the root cause, fix it, run `pnpm verify`, commit the fix on its own with a reference to L81-07, and re-test. Record the room codes and results under a 'Lot 81 verified' heading in `frontend.md`. The `AGENTS.md` §1 snapshot lists Lots 72–81 as done.

**Acceptance:** - The 'Lot 81 verified' record covers every viewport × seat count × scenario above, with room codes and a pass or fixed result each.
- No width shows a horizontal page scroll (L53-07).
- Each screen's Appendix A Keep lines were spot-checked, and the record says so.
- Every design-gate finding is fixed or approved by the designer.
- `pnpm verify` green on the final commit.

**Review:** Re-runs the §8.2 performance gate with sound on. V7 closes after this lot; AGENTS.md and the backlog become archives.

_Draft id L81-07._

## Draft questions and their dispositions

Resolved in the 2026-10-21 backlog review unless listed under "Designer questions still open" in `docs/backlog_v7.md`; dispositions are recorded in the **Review** lines above and in the amended spec.

- Legacy PNGs: should L81 delete the files under `apps/client/src/assets/{cards,kits,backs,icons}` that no V7 module imports any more? Default: repo `images/` stays (it is the extract-art source) and `assets/how-to-play/` stays (designer-owned). If `assets/cards/` goes, the Roulette activated byte-identity test in `asset-lookup.test.ts` has to be rewritten against the V7 art.
- 'What's new final': which entry does this mean? If the V7 entry shipped to `main` when the freeze lifted after L77, then L78/L79 started a new id, and §10.4 forbids editing the shipped one. Does L81 only polish the open entry, or does the designer want one V7 summary entry?
- 'gambling' log line: the server still relabels a same-action elimination of a busted Drawer that has no eliminator as `reason: 'gambling'` (`apps/server/src/engine/turn/perform-action.ts`, around line 1290). Can a no-eliminator kill (Poison, Curse…) land in the same Draw action, which would make the line reachable? If it cannot: what wording should the generic path use for 'gambling', and should the Game over recap 'Gambling' label go too? `/admin` keeps it for historical rows.
- The pre-V7 'Lot NN verified' records in `frontend.md` (Lots 6–67, about 600 lines) are dated history but describe removed UI. Default: keep them. Alternative: move them to an archive file.
- Should the reusable 'V6 first-time gate (L48)' in `frontend.md` be rewritten as a V7 first-time gate, or replaced by a pointer to the §12.3 checklist?
- Does V7 close after Lot 81, like V6 at Lot 71? If yes: the `AGENTS.md` §1 / §9 / golden rule 7 wording and `docs/backlog_v7.md` become an archive. Or does V7 stay open for follow-up lots?
- Should the L81 full playtest re-run the §8.2 performance gate (4× CPU throttle, hit + elimination scenario) now that sound (L79) is in? §12.3 does not require it.

