# V7 Lot 77 — Game over: task briefs

> Implements `docs/technical_spec_v7.md` (read it first) for Lot 77; parity checklist `docs/technical_spec_v7_parity.md`. Tracker: `docs/backlog_v7.md`.
> **Brief plan.** Step-by-step TDD instructions (superpowers:writing-plans format) are written from these briefs just before the lot executes, once the interfaces of earlier lots exist.
> Each brief was drafted from the spec and the code on `dev` `1de498d`, then restructured by the 2026-10-21 backlog review; a **Review** line overrides the brief where they differ.

## Draft id → final id

Briefs below may cite other tasks by their draft id; use this table.

| Draft | Final |
|---|---|
| L77-01 | L77-01 |
| L77-02 | L77-02 |
| L77-03 | L77-03 |
| L77-04 | L77-04 |
| L77-05 | L77-05 |
| L77-06 | L77-06 |
| L77-07 | L77-07 |
| L77-08 | L77-08 |

Cross-lot moves: draft L73-01 → L72-03, L73-02 → L72-04, L73-03 → L73-01; draft L72-03 split into L72-06 (harness) and L72-07 (icons); draft L74-02 dropped (sheet stack is L72-09); draft L76-18 folded into the Lot 76 copy task; draft L81-02 folded into L81-01.

## Lot scope

Game over in V7: static winner hero, awards gallery, read-only chat, rules recall, button hierarchy, "Protocol v45" removed, Play again pending (§7.6).

## L77-01 — Lock finished-board orchestration with behavior tests

**Cx / risk:** M / Low · **Depends on:** Lot 73, Lot 75 · **Spec:** §4.2, §7.6, §12.1, §12.2, §13 #70
**Parity (Appendix A):** `end-finished-board-shell`, `end-feedback-ask-once`, `end-gameover-feedback-dismiss`, `end-return-home`, `end-play-again`, `finished-board-readonly`, `global-feedback-entry-points`
**Files:** `apps/client/src/screens/end/ (moved end.tsx, end-feedback.ts(+test), game-over-dialog.tsx, game-over-copy.ts(+test))`, `apps/client/src/screens/end/end.test.tsx`, `apps/client/src/feedback/feedback-surfaces.test.ts`, `apps/client/src/help/tutorial-hints-independence.test.ts`, `apps/client/src/App.tsx`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

Move the End screen into `screens/end/` (`end.tsx`, `end-feedback.ts`, `game-over-dialog.tsx`, `game-over-copy.ts` and their tests). Only import paths change (§4.2, §12.2). Before any restyle, lock the finished-board orchestration: rewrite the `end.tsx` source-text assertions of `feedback/feedback-surfaces.test.ts` as EndScreen component tests (testing-library + happy-dom, §12.2). Stub the finished board so the test drives its `onLeave` / `onOpenFeedback` / `onShowStats` props. The tests cover:
- Game over opens only after `TABLE_BANNER_MS`.
- The first stats close (View board, Esc, backdrop) opens ask-mode Feedback once per `gameCode`.
- Return home, Play a real game and the board flag all go through `requestLeave`: ask-once, then leave on Skip or sent, never on Cancel.
- Play again asks once, then calls `onPlayAgain` on Skip or sent.
- The Game over Feedback button replaces stats with the manual ticket.
- `!` does nothing while stats are open, and Stats reopen does nothing while Feedback is open.
- Only one Feedback dialog is ever mounted.

`end-feedback.test.ts` and `game-over-copy.test.ts` move with their modules unchanged. The `readFileSync` paths in `game-over-copy.test.ts` and `help/tutorial-hints-independence.test.ts` follow the move; their behavior rewrite is L77-02. Fill this lot's §12.1 classification rows in `docs/backlog_v7.md`. Update the `frontend.md` Screens table and the End screen file references. No visual change and no What's new item.

**Acceptance:** Every `end.tsx` source-text assertion of `feedback-surfaces.test.ts` has a behavior test with the same outcome: ask-once on the first close, leave or rematch only after Skip or sent, no stacking, and the flag goes through `requestLeave`. `end-feedback.test.ts` assertions are unchanged. No `readFileSync` reads `end.tsx`. Classification rows are filled in. `pnpm verify` green.

## L77-02 — Rebuild Game over as an Arcade Holo sheet

**Cx / risk:** L / Medium · **Depends on:** L77-01 · **Spec:** §7.6, §7.7, §5.1, §5.2, §5.3, §5.6, §10.4, §11, §12.1, §13 #1, §13 #14, §13 #67, §13 #83, §13 #84
**Parity (Appendix A):** `end-game-over-dialog`, `end-winner-header`, `end-match-meta-line`, `end-awards-gallery`, `end-eliminations-list`, `end-action-log-export`, `end-action-log-xlsx-download`, `end-return-home`, `end-play-again`, `global-dialog-interaction-contract`, `global-visual-viewport-fit`, `global-art-catalog`, `global-motion-reduced-motion`
**Files:** `apps/client/src/screens/end/game-over-dialog.tsx`, `apps/client/src/screens/end/game-over-dialog.test.tsx`, `apps/client/src/screens/end/game-over-copy.test.ts`, `apps/client/src/help/tutorial-hints-independence.test.ts`, `apps/client/src/design/components/ (deletions where last importer)`, `packages/shared/src/release-notes.ts`, `packages/shared/src/release-notes.test.ts`, `docs/agent/frontend.md`, `DESIGN.md`, `docs/backlog_v7.md`

Replace the V2 `GameOverDialog` with a V7 Game over built on `ui/` primitives (§7.6, §7.7). It is a bottom sheet on phones and a centered dialog on desktop, sized to the visual viewport (L53-02/07). The body scrolls inside and the footer stays visible. The title comes from `gameOverTitle` ("Game over" / "Tutorial complete").

**Winner hero** (static, §7.6):
- large kit portrait from `artFor` in a code-rendered frame, with `alt` = kit name (§11)
- "Winner" eyebrow, seat-colored nickname with " (you)", and the kit name
- a fogged walk-in recap shows a placeholder and "Hidden kit"
- an eliminated winner keeps the eliminated treatment
- no connection badges

**Footer line:** "Code {gameCode} · {turnSequence} turns". The "Protocol v{PROTOCOL_VERSION}" prefix is removed (§2, §13 #1/#14/#67).

**Award tiles** become V7 tiles in a wrapping layout (the swipe gallery is L77-03). They keep:
- the title and every co-winner face (portrait, nickname, kit name)
- value kinds with `ui/` resource icons and formatted counts / s-per-turn
- the first winner's seat color, `data-award-id`, and "No awards this match."

**Eliminations:** heading "Eliminations", rows "{nick} eliminated ({reason}) by {eliminator}" through `eliminationReasonLabel`, and "No eliminations" when empty.

**Button hierarchy:**
- primary: Play again (Classic, not walk-ins)
- secondary: View board, Feedback, and the DEV-only Download action log ("Building Excel…" busy state and role=alert error, unchanged)
- quiet: Return home / Play a real game

Esc, backdrop, swipe-down and View board are one action (`onClose`, which triggers the ask-once). Labels stay as they are (§13 #84). No functional text under 11 px (§5.2). Keep the `data-zone` anchors `game-over-winner`, `game-over-awards` and `game-over-elims` for L78.

Rewrite the `readFileSync` assertions of `game-over-copy.test.ts` and the Game over part of `help/tutorial-hints-independence.test.ts` as component tests (§12.1). Delete any `design/` module whose last importer this task removes, and classify its tests. Append a Before / After Game over item to the open What's new entry (§10.4) and update the release-notes test. Update the `frontend.md` End screen and Lot 60 gallery paragraphs, plus `DESIGN.md` when a `ui/` component is added or changed.

**Acceptance:** Component tests (happy-dom, fake `FinishedStateView`):
- the meta line reads "Code ABC123 · 14 turns" and contains no "Protocol"
- Play again renders only for Classic with `onPlayAgain`, and is absent for tutorial and walk-ins
- the tutorial view shows "Tutorial complete" and "Play a real game"
- Feedback calls `onOpenFeedback`
- View board, Esc and backdrop each call `onClose` once
- Download action log renders only when DEV is stubbed true
- a fogged kit shows "Hidden kit" in the hero and on tiles, and ties list every co-winner
- the tutorial Game over buttons never write hint `skipAll`

No `readFileSync` reads the Game over file. The L77-01 EndScreen tests stay green. The release-notes test matches the open entry. `pnpm verify` green.

**Review:** Tutorial finish: "Play a real game" is the primary button.

## L77-03 — Make the awards a swipeable gallery

**Cx / risk:** M / Low · **Depends on:** L77-02 · **Spec:** §7.6, §5.7, §8.3, §10.4
**Parity (Appendix A):** `end-awards-gallery`, `global-motion-reduced-motion`
**Files:** `apps/client/src/ui/primitives/ (swipe gallery)`, `apps/client/src/screens/end/game-over-dialog.tsx`, `apps/client/src/screens/end/game-over-dialog.test.tsx`, `packages/shared/src/release-notes.ts`, `packages/shared/src/release-notes.test.ts`, `DESIGN.md`, `docs/agent/frontend.md`

Turn the award tiles into the swipeable gallery of §7.6:
- one horizontal scroll-snap row inside the sheet, never a page scroll at 360–390 px
- reachable by touch swipe, trackpad and keyboard (focusable, visible focus)
- the fixed Lot 60 order from `GAME_OVER_AWARD_IDS`, with all-zero awards still skipped by `pickGameOverAwards` (unchanged view-model, L73)
- reduced motion: no smooth scroll or snap animation (§8.3)

Build it as a `ui/` primitive, or reuse the one L76 adds for the How to play carousel if it exists, and document it in `DESIGN.md`. Eliminations stay a list below the gallery. Update the L77-02 What's new Game over item to mention the gallery and adjust the release-notes test. Replace the `frontend.md` Lot 60 gallery line ("2 columns, sm 3, lg 4").

**Acceptance:** Component tests:
- tiles render in `GAME_OVER_AWARD_IDS` order with `data-award-id`
- an empty recap still shows "No awards this match."
- with reduced motion emulated, the gallery uses no smooth-scroll behavior

At 375×812 in the browser, swiping goes tile to tile with no horizontal page scroll. `pnpm verify` green.

**Review:** Uses the Lot 72 `Carousel` (grid at desktop width).

## L77-04 — Recall the table rules on Game over

**Cx / risk:** S / Low · **Depends on:** L77-02 · **Spec:** §6.11, §7.4, §6.7, §7.6, §10.6, §13 #20
**Parity (Appendix A):** `rules-recall-table-end`, `global-dialog-interaction-contract`
**Files:** `apps/client/src/screens/end/game-over-dialog.tsx`, `apps/client/src/screens/end/game-over-dialog.test.tsx`, `apps/client/src/screens/end/end.tsx`, `apps/client/src/screens/arena/ (finished-board menu source)`, `packages/shared/src/release-notes.ts`, `packages/shared/src/release-notes.test.ts`, `docs/agent/frontend.md`

Add the §6.11 house-rules recall to Game over: a "Table rules" control (§10.6) that opens the shared `ui/` read-only rules sheet. It is the same sheet as the lobby (§7.4): turn time, Random only, and excluded kits labeled "Excluded", never shown by color alone. The data comes from `rulesRecall(finishedView)` (L73), which reads `FinishedStateView.lobbyRules`. The control is hidden when that field is absent, as on the tutorial.

The rules sheet stacks one level above Game over (§6.7). Esc, backdrop or swipe-down closes only the rules sheet and never counts as a stats close, so no ask-once fires. The finished board's menu Table rules item reads the same source, so the rules still show at the end after a reload mid-match. Append a What's new item (§10.4), update the release-notes test and update `frontend.md` End screen.

**Acceptance:** Component tests:
- rules from a fake `FinishedStateView.lobbyRules` (45 s, Random only, two excluded kits) appear in the sheet with "Excluded" labels
- there is no Table rules control on a tutorial view or a view without `lobbyRules`
- Esc on the open rules sheet closes it, leaves Game over open, and opens no Feedback
- the finished-board menu item shows the same rules with no cached lobby view

`pnpm verify` green.

## L77-05 — Show the read-only chat on Game over

**Cx / risk:** S / Low · **Depends on:** L77-02 · **Spec:** §7.6, §6.9, §10.4
**Parity (Appendix A):** `end-finished-chat-readonly`, `end-chat-frozen-snapshot`, `table-chat-side-stream-disclosure`
**Files:** `apps/client/src/screens/end/game-over-dialog.tsx`, `apps/client/src/screens/end/game-over-dialog.test.tsx`, `packages/shared/src/release-notes.ts`, `packages/shared/src/release-notes.test.ts`, `docs/agent/frontend.md`

Add the room chat to Game over as a read-only section (§7.6, §6.9). It uses the shared `ui/` ChatLog with no composer, fed by `finalTable.chatMessages`, with seat colors from `finalTable.players`.
- Living and eliminated/spectator lines are labeled as on the table.
- The streams are exactly what the server sends per recipient, so a living winner sees only living lines.
- An empty transcript keeps the existing "No messages yet."

Game over has no send path (rules spec §6 Chat; decisions 2026-10-06 holdout snapshot). The finished board's chat icon keeps its own read-only sheet and unread count (L74). No new caption. Append a What's new item (§10.4), update the release-notes test and update `frontend.md` End screen.

**Acceptance:** Component tests:
- messages from a fake `finalTable` render in order with their stream labels
- there is no text input or Send button anywhere in Game over
- an empty transcript shows "No messages yet."

The L77-01 EndScreen tests stay green. `pnpm verify` green.

**Review:** Read-only chat is a Chat entry opening the read-only sheet ("Chat is closed for this game"); reading it clears the unread count.

## L77-06 — Show a pending state after Play again

**Cx / risk:** M / Medium · **Depends on:** L77-01, L77-02 · **Spec:** §7.6, §11, §6.12, §13 #72, §10.6
**Parity (Appendix A):** `end-play-again`, `play-again-to-lobby`, `end-solo-play-again-menu`, `end-feedback-ask-once`, `reject-state-carryover`
**Files:** `apps/client/src/screens/end/end.tsx`, `apps/client/src/screens/end/end.test.tsx`, `apps/client/src/screens/end/game-over-dialog.tsx`, `apps/client/src/screens/end/game-over-dialog.test.tsx`, `packages/shared/src/release-notes.ts`, `packages/shared/src/release-notes.test.ts`, `docs/agent/frontend.md`

Give Play again the pending state of §7.6 / §11 (Q72).
- It starts the moment EndScreen actually calls `onPlayAgain`: at once when already asked, or after the ask-once Skip or successful send.
- While pending, Play again is disabled and busy (`aria-busy` plus a busy indicator). Any new label is listed in the PR (§10.6).
- It ends when the screen unmounts (lobby view or solo menu) or when a new `actionReject` arrives.
- It survives a Stats close and reopen.

A reject (`play-again-not-finished`, `play-again-tutorial`) clears pending and shows the §6.12 reject toast above Game over with `ILLEGAL_ACTION_COPY`. Dismissing the toast calls `clearActionReject`. A double click sends `playAgain` once.

Unchanged: solo (one human) still leaves and reopens the seeded solo menu (L67-01), and the first opt-in still does not pull others off their recap (L57-10). Append a What's new item (§10.4), update the release-notes test and update `frontend.md` End screen.

**Acceptance:** EndScreen tests:
- an already-asked Play again calls `onPlayAgain` once and renders the button disabled with `aria-busy`
- a double click does not call it twice
- on the ask path it is called once after Skip and never after Cancel
- a new reject re-enables Play again and shows the toast above Game over

`solo-menu-seed.test.ts` is unchanged. `pnpm verify` green.

## L77-07 — Pin Game over first for finished-phase claims

**Cx / risk:** S / Low · **Depends on:** L77-01 · **Spec:** §13 #82, §14.3, §7.7, §6.7
**Parity (Appendix A):** `global-claim-seat-overlay`, `claim-seat-dismiss-stay`, `claim-seat-dialog`
**Files:** `apps/client/src/screens/claim-seat.ts`, `apps/client/src/screens/claim-seat-dialog.test.ts`, `docs/agent/decisions.md`, `docs/agent/frontend.md`

Close watch point §14.3 / §13 #82. First verify what the server sends on finished views (`claimableSeatsNow`, the `sendStateTo` holdout branch). Reading at `1de498d`: nothing reaches walk-ins while a winner exists, but holdout recap views can carry the next match's claimable seats once that match starts. Then pin "Game over first" on the client: `shouldShowClaimPicker` never opens the claim picker on a `phase: 'finished'` view, so it can never stack over Game over, the rules sheet or the ask-once Feedback.

No Claim a seat control is added to the recap until the designer answers (see questions). Record the finding and the stacking rule as a dated `docs/agent/decisions.md` entry and in the `frontend.md` Claim row and conventions. No server change and no What's new item.

**Acceptance:** `claim-seat` tests: `shouldShowClaimPicker` returns false for `phase: 'finished'` with claimable seats, whether spectator or seated, host or not. The lobby and playing cases are unchanged. The decisions entry cites the server lines it read. `pnpm verify` green.

## L77-08 — Run the Lot 77 browser and design gates

**Cx / risk:** M / Low · **Depends on:** L77-01…L77-07 · **Spec:** §12.3, §12.4, §12.5, §4.6
**Parity (Appendix A):** `end-game-over-dialog`, `end-finished-board-shell`, `end-feedback-ask-once`, `end-play-again`, `end-solo-play-again-menu`, `end-awards-gallery`, `end-match-meta-line`, `end-finished-chat-readonly`, `rules-recall-table-end`, `end-action-log-xlsx-download`
**Files:** `docs/agent/frontend.md`, `docs/backlog_v7.md`, `apps/client/src/screens/end/ (gate fixes)`

Run the post-lot browser gate (§12.3, `frontend.md` Post-lot browser gate) on Game over at 360×740, 375×812, 390×844, a landscape phone and 1440×900. Scenarios:
- solo win, and solo loss with the POV eliminated
- 2-human online: Play again pending, the first opt-in reforms the lobby, the other player stays on the recap with the frozen chat
- solo Play again reopens the seeded menu
- tutorial complete → Play a real game
- walk-in spectator: no Play again, "Hidden kit" while fogged
- custom house rules recalled (none on the tutorial)
- the ask-once chain through View board, Return home, Play again, Feedback, `!` and Stats
- DEV Download action log
- reduced motion
- no horizontal page scroll, and the footer stays reachable with the on-screen keyboard open

Run the Impeccable detector on the shipped End files and a `critique` of Game over (§12.4). Fix every defect in its own commit and re-verify. Record room codes under "Lot 77 verified" in `frontend.md` and set the lot Done in `docs/backlog_v7.md`. The PR notes that, with L75 and L76 merged, the player path is fully V7 (§4.6).

**Acceptance:** Every scenario passes at every listed viewport, or its defect is fixed and re-verified. Detector findings are fixed or carry designer-approved ignores. The critique is recorded. "Lot 77 verified" lists the room codes. `pnpm verify` green.

## Draft questions and their dispositions

Resolved in the 2026-10-21 backlog review unless listed under "Designer questions still open" in `docs/backlog_v7.md`; dispositions are recorded in the **Review** lines above and in the amended spec.

- Tutorial finish: there is no Play again on the tutorial. Should "Play a real game" become the primary button, or stay quiet in the Return home slot as §7.6 reads literally?
- Play again pending on the ask-once path: by the time Skip or Send triggers the rematch, Game over is already dismissed, so the pending state is never seen. Should Game over reopen in its pending state, or is the board enough until the lobby or solo menu replaces it? Should pending get a new label, or only a busy indicator with aria-busy?
- Read-only chat on Game over: should it be an inline section (collapsible on phones, like the lobby panel in §7.5) or a Chat entry that opens the read-only chat sheet? Should reading it there clear the unread count on the finished board's chat icon? Is a caption such as "chat is closed for this game" wanted? It is not in §10.6.
- Table rules on Game over: only a "Table rules" control that opens the read-only sheet, or also the §7.4 rules strip inline? If L76 lands the strip first, should L77 reuse it?
- Finished-phase claims (§14.3): the server never sends claimable seats to walk-ins on finished views. But once the next match has started, holdout recap views can carry its disconnected seats, and the server would accept a claim from a recap viewer. Should L77-07 just pin "no picker on finished", or should L77 also add a "Claim a seat" control to the recap so a recap viewer can join the running match (§13 #82 "claim via control")?
- Swipe gallery: should it be one `ui/` primitive shared with L76's How to play carousel, and which lot builds it if both are in flight? At desktop width (1024 px and up), the same gallery or a grid?
- L76 Feedback "Sent" confirmation (§7.7): in ask mode with a pending Return home or Play again, should the leave or rematch fire as soon as the send succeeds (today's behavior) or after the confirmation is dismissed? The EndScreen chain locked in L77-01 depends on this.
- Does L74's finished-board menu item Table rules already read `FinishedStateView.lobbyRules`, or only the in-memory lobby cache? L77-04 assumes it should read `FinishedStateView.lobbyRules` (§6.11).
- What's new: one consolidated Game over item for the whole lot, or one Before / After item per player-facing task as drafted (L77-02 / 04 / 05 / 06, with L77-03 amending L77-02's item)?

