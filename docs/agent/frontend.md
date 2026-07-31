# docs/agent/frontend.md — Client conventions

> Created during L1-12 from the real client code. Transverse rules → `/AGENTS.md`.
> Protocol → `protocol.md`.
>
> Sources: technical spec §7 · `apps/client/src/`.

## Status

Functional UI only for V1 — no art direction (technical spec §9). Screens live in
`apps/client/src/App.tsx` for now; split further when the surface grows past one file.

## Screens

| Screen | When |
|---|---|
| Home | No room — create / join + nickname |
| Lobby | `phase: 'lobby'` — seats, code, host Start |
| Table | `phase: 'playing'` — opponents, log, queue, timer, play hand or special cards, Assassin multi-attack, economy including `buySpecialCard` |
| End | `phase: 'finished'` — winner, return home |

## Conventions

- **Zero rule logic** on the client. Buttons send intents; the server revalidates.
- Connection hook: `apps/client/src/net/use-room-connection.ts` — create / joinById /
  messages / leave.
- Every `stateUpdate` replaces the previous view. Validate shape before use.
- Timer display is cosmetic: trust `turnDeadlineMs` / `turnStarted.deadlineMs` from the
  server, never a client-only countdown as authority.
- Action log is the table's main organ (technical spec §7).
- **`playCard`** may omit `targetPlayerId` (Tax, Regen, Shield, Mirror) and may include
  `quantity` (Regen 1–4). Table: hand select + “Include target” checkbox + quantity field.
- **Assassin** (`allowsMultipleAttacksPerTurn`): `playMultipleAttacks` with ≥2
  `{ instanceId, targetPlayerId }`. Single attack still uses `playCard`. Draw label uses
  `getKit(self.kitId).startingResources.draw`.
- **Spy display:** list each spied hand/special card. Base: show full resource snapshot
  (lives, points, UP, shield) labeled by turn sequence. Upgraded: show those values live.
- **`actionResolved.outcome === 'immune'`**: show public failure (Untouchable vs Thief/Spy).
- **Mirror**: listen for `mirrorChoiceRequired`, send `chooseMirrorTarget`. Clear the
  prompt on confirm or the next `turnStarted`.
- **Elimination rewards**: listen for `rewardChoiceRequired`, send `chooseEliminationReward`
  with two picks. Clear on confirm / `turnStarted` / `gameOver`. Lock other table actions while
  the prompt is up (same as Mirror). Also lock actions when `players[you].isEliminated` — after
  an elim the turn pointer may still sit on the dead seat until rewards finish.
- Dev override: server `TURN_DURATION_MS` env (ms, min 5000) — default still 30s.
- Finish client tasks with a Conventional Commit (AGENTS.md §10) — same rule as server work.

## Manual two-browser check (Lot 6)

How agents / developers verified elimination rewards in a real room:

1. `TURN_DURATION_MS=300000 pnpm dev` (long turns; reward sub-choice stays 20s).
2. Open **two** browser contexts/tabs on `http://localhost:5173/` (Playwright tabs or two windows).
3. Tab A: nickname → **Create** → note game code. Tab B: nickname + code → **Join**. Host **Start**.
4. Farm points with **Tax** (uncheck “Include target”), pass the other seat with **Draw**.
5. Queue **super-attack** (10 pts, 7 dmg) at the opponent; on their turn they **Draw** so it resolves.
   Two hits (or one if they already Taxed lives down to ≤7) eliminate them.
6. **Eliminator** tab must show **Elimination reward** with a 20s countdown and two pickers
   (`lives` / `points` / `upgradePoint` / `card` + card list from the held hand/specials).
7. **Victim** tab must show **Eliminated** / spectator copy and have **Draw disabled** (not only a
   server error). Confirming rewards (or waiting out the 20s default `2×4 lives`) then emits
   `gameOver` when one seat remains.
8. Spot-checks already done: card + upgradePoint pick → game over; reward expiry alone → game
   over; acting as victim during the pause → server `Finish elimination rewards first.` (UI now
   prevents the click).

## Manual 4-player check (Lot 6)

Same stack as above; open **four** tabs (or windows), join one code, host **Start**.

Verified 2026-07-31 (Playwright, room `BGZEXW` family):

1. Seats P1–P4. Prefer a low-life kit as first victim (Kamikaze starts at 4 lives — one
   base super resolves to an elim on their turn).
2. Target the victim via the **nickname label** (more reliable than `getByRole('radio', { name })`
   for short nicknames in automation), play **super-attack**, rotate **Draw** until their
   resolve phase runs.
3. Only the **eliminator** sees **Elimination reward**. Other alive tabs do not. Victim sees
   **You are a spectator** and Draw disabled.
4. Confirm rewards (e.g. lives + card). **Game must not end** while ≥2 players remain: turn
   advances to the next alive seat; opponents list shows `(eliminated)` on the victim.
5. Repeat for a second elim (still ≥2 alive afterward). Example: after P3 then P2 died, P1/P4
   still played — `gameOver` stayed false, Active moved on.
6. Final elim of the penultimate player → rewards → then `gameOver` for the last survivor.
