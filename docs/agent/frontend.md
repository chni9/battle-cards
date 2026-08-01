# docs/agent/frontend.md — Client conventions

> Created during L1-12 from the real client code. Transverse rules → `/AGENTS.md`.
> Protocol → `protocol.md`.
>
> Sources: technical spec §7 · `apps/client/src/`.

## Status

V1 shipped functional UI only, no art direction (technical spec v1 §9). **V2 is in progress**
(`docs/technical_spec_v2.md`, `docs/backlog_v2.md` Lots 10–14). `App.tsx` is the phase
router; Home, Lobby, and Table live under `apps/client/src/screens/` (Lots 11–12). End remains
inline in `App.tsx` until Lot 13. Update this file's examples in place as V2 components
land; don't fork a second frontend playbook. Intents, payloads, and visibility rules are
unchanged by V2 (except the Table **control pattern** in technical spec v2 §6.1 — same
payloads, different chrome; implemented in L12-08).

## Screens

| Screen | When | File |
|---|---|---|
| Home | No room — create / join + nickname | `screens/home.tsx` |
| Lobby | `phase: 'lobby'` — seats, code, host Start | `screens/lobby.tsx` |
| Table | `phase: 'playing'` — felt shell, opponents arc, center-stage log, queue, timers, hand, economy | `screens/table.tsx` (+ `screens/table/*`) |
| End | `phase: 'finished'` — winner, public recap stats, return home | `App.tsx` until Lot 13 |

Shared status copy: `screens/status-labels.ts`.

## Design system (V2 · Lots 10+)

Tokens and shared components live under `apps/client/src/`. Intents, payloads, and visibility
rules above are unchanged — this section only covers how the client looks.

- **Stack:** Tailwind CSS v4 (`@tailwindcss/vite`) + Motion (`motion/react`). Entry CSS:
  `apps/client/src/index.css` (`@import "tailwindcss"` + `@theme` tokens). Font: Outfit via
  `@fontsource/outfit` (not Inter).
- **Tokens:** palette and type scale derived from the V1 asset subset (card faces, kit pastels,
  verso/opponent slate, resource icons, button PNG *hues*). Colored `*_button.png` files are
  **not** used as UI skins — CTAs are CSS components inspired by those hues (Lot 10 ruling).
- **Components:** `apps/client/src/design/components/` — `Button`, `Card`, `ResourceIcon`,
  `ConnectionBadge`, `KitPortrait`, `Dialog` (L11-03), `Tooltip` (L12-08). Art resolution:
  `apps/client/src/design/asset-lookup.ts` (never invent a mapping; never import out-of-V1 art
  from `images/`).
- **Dialog:** controlled `open` / `onClose`; `role="dialog"` + `aria-modal` + labelled title;
  focus trap; Esc and overlay dismiss; action slot uses shared `Button` variants. Prefer this
  for every modal prompt (Lobby copy feedback; Table card-first prompts). No
  extra npm dependency unless separately ruled.
- **Tooltip:** hover + focus; `role="tooltip"`; used for unavailable own cards (reason from
  view fields only).
- **Button variants:** `purple` (play), `yellow` (draw), `green` (confirm/Start/Create/Join),
  `red` (Leave / return home), `orange` (buy/sell/upgrade / Copy). Solid rounded CTAs from
  token hues — no `*_button.png` skins, no hex clip-path.
- **Home (L11-01):** branded split — title + forms + decorative V1 kit/card art from the
  lookup; muted Protocol vN; same create/join validation.
- **Lobby (L11-02):** game code + Copy (clipboard); copy result via `Dialog`; Start / Leave
  unchanged functionally.
- **Activated art** for Imposition / Points Generator is in the lookup with an optional
  `activated` prop on `Card`, but no screen may pass `activated` until a ruled protocol
  exposure of `activePersistentEffects`.
- **Elimination:** one generic treatment on `KitPortrait` — desaturate + “Eliminated” badge.
  No `*(dead).png` paths.
- **Table (L12):** felt shell in `screens/table/` — opponents arc, pending strip, **center-stage
  action log**, private dock + economy bar (`data-zone` hooks for Lot 14). Economy: Draw /
  UP buy-sell / Buy (Dialog chooser for special + shared) / Leave. Shell is
  `h-[100dvh] overflow-hidden` (no page scroll). **Only the action log scrolls** — opponents,
  pending, and private dock must fit without vertical scroll (tiny Spy thumbs / fluid faces as
  needed). Pending effects targeting `view.you` render in the private zone (Incoming); effects
  on others stay on the felt strip. Kit portrait opens a visual inspect Dialog from `getKit` /
  `getCard` only. **Private zone:** fluid hand fills available width/height (`FluidCardRow`);
  resources sit above the economy bar; `Card detail="face"` (art + name); effect copy in the
  card Dialog.
- **Table card-first (L12-08):** click own hand/specials → Dialog with effect text + Use /
  Upgrade / Sell. Cards stay clickable off-turn (and while Mirror/reward prompts run) so the
  player can read descriptions; action buttons disable when `!isMyTurn` or actions are locked.
  Nested Dialog for target, Regen quantity, Assassin multi-attack; self-only Use is one-shot;
  Spy-revealed cards inspect-only; Mirror and elimination rewards via Dialog. Same
  intents/payloads as V1.
- **Skills applied selectively:** product-UI guidance from design / ui-styling / ui-ux-pro-max
  (contrast, touch targets ≥44px, focus rings, form labels, Dialog a11y, reduced-motion).
  Landing-page layout rules from design-taste-frontend do **not** apply to
  Home/Lobby/Table/End.

## Conventions

- **Zero rule logic** on the client. Buttons send intents; the server revalidates.
- Connection hook: `apps/client/src/net/use-room-connection.ts` — create / joinById /
  messages / leave / auto-reconnect (`room.reconnection` + `sessionStorage` token fallback).
- Mid-game **Leave** is consented forfeit (disables auto-reconnect). Unexpected drop shows
  status `reconnecting` and does not clear the table view until reclaim fails.
- Every `stateUpdate` replaces the previous view. Validate shape before use.
- Timer display is cosmetic: trust `turnDeadlineMs` / `turnStarted.deadlineMs` from the
  server, never a client-only countdown as authority. When the active seat is `disconnected`,
  show paused copy instead of a live countdown.
- **Degraded states (L9-01):** each `PublicPlayerView.connection` drives badges —
  disconnected grace, `absent N/3`, idle timeouts `N/5`.
- Action log is the table's main organ (technical spec §7). Browsable history lives in
  `apps/client/src/action-log/` — scrollable turn groups, player/kind/search filters.
  Server `actionLog` is a discriminated union (`actionPlayed`, `actionResolved`,
  `playerEliminated`, `mirrorRedirected`, opaque `rewardsClaimed`). Reward picks are never
  shown.
- **End screen (L9-03):** `FinishedStateView.recap` — per-player play/buy/sell/upgrade
  counts + eliminations. No kits, hands, seed, or exact final resources. Return home via
  `leaveGame()`.
- **`playCard`** may omit `targetPlayerId` (Tax, Regen, Shield, Mirror, and other self-only
  V1 cards) and may include `quantity` (Regen 1–4). Table (L12-08): click card → Dialog;
  self-only Use sends immediately; targeted Use opens nested target Dialog; Regen opens
  quantity Dialog.
- **Assassin** (`allowsMultipleAttacksPerTurn`): `playMultipleAttacks` with ≥2
  `{ instanceId, targetPlayerId }`. Single attack still uses `playCard`. Multi-attack opens
  from the attack-card action Dialog. Draw label uses `getKit(self.kitId).startingResources.draw`.
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
  `RECONNECT_GRACE_MS` env (ms, min 1000) — default 60s.
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

## Manual Lot 7 lifecycle check (L7-05 / M4)

Prereq: `RECONNECT_GRACE_MS=5000 TURN_DURATION_MS=8000 pnpm dev` (short timers for manual runs).

1. Four tabs, join one code, host **Start**. Confirm each opponent shows connection status.
2. **Reconnect within grace:** drop one tab's network (or DevTools offline) under the grace
   window; restore — status returns to connected, no absent badge, counters unchanged.
3. **Absent auto-draw:** keep one seat offline past grace → badge `absent 0/3`; when their turn
   arrives the game advances without a 30s wait; after three auto-turns they are eliminated,
   cards pooled, no reward prompt.
4. **Leave forfeit:** mid-game **Leave** on a 2-player room → immediate elim + `gameOver` for
   the other seat.
5. Repeat full 4-player playthroughs (kits / specials / Mirror or rewards) **three times** with
   no stuck state — M4 proof.

Verified 2026-07-31 (Playwright, `RECONNECT_GRACE_MS=5000 TURN_DURATION_MS=8000`):

- 4p rooms `RXAFII`, `MJXLKL`, `IIFWJS` — multi-draw rotation, Leave forfeit elim on one seat,
  no stuck state / protocol mismatch.
- 2p room `BFIOVB` — disconnected grace badge, absent after grace, win by forfeit for the
  remaining seat.

## Post-lot browser gate

Required after the last task of a backlog lot is `Done` (AGENTS.md §9). Agents own this —
do not hand off an untested lot.

1. Restart `pnpm dev` on the current code (match PROTOCOL_VERSION). Prefer long turns for
   interactive play (`TURN_DURATION_MS=300000`); short timers only when testing lifecycle.
2. Drive at least one **two-browser** (or multi-tab) session covering that lot's acceptance
   criteria end-to-end — not only unit tests.
3. Exercise the new UI paths (filters, screens, degraded states, log entries, recap, etc.).
4. On every defect: root-cause, fix, `pnpm verify`, commit, and **re-test** until clean.
5. Record the room code(s) and what was verified in this file (same pattern as the Lot 6/7
   notes above).

### Lot 9 verified 2026-08-01 (Playwright, `TURN_DURATION_MS=300000`, PROTOCOL 18)

- Action log: turn groups, draw/playCard/Resolved entries, player/kind/search filters.
- End screen: winner, single `(eliminated)` badge, recap counts + elim reason, Return home.
- Leave forfeit → game over recap (`P2 eliminated (leave)`). Rooms: `NNOLEX`, `UGVKXF`, etc.

### Lot 10 verified 2026-08-01 (Playwright, `TURN_DURATION_MS=300000`, PROTOCOL 18)

- Home: Outfit + surface tokens, Motion title enter, CSS hex CTA `Button` (Create/Join).
- Lobby: Start/Leave buttons; room `RQNKXT` (HostA + GuestB).
- Table: `KitPortrait`, `ResourceIcon` row, `Card` hand/specials with V1 art, opponent
  `opponent.png` placeholder when unspied; action bar uses shared `Button` variants.
- No protocol/intent change; favicon 404 only (pre-existing, unrelated).

### Lot 11 verified 2026-08-01 (Playwright, `TURN_DURATION_MS=300000`, PROTOCOL 18)

- Home: branded split with V1 decorative art, nickname + Create/Join, muted Protocol v18.
- Lobby: game code Copy → `Dialog` “Code copied”; seats; host Start / guest waiting / Leave.
- Two-tab flow: HostA create → GuestB join `HIWOGA` → host Start → Table (unchanged intents).
- No protocol/intent change.

### Lot 12 verified 2026-08-01 (Playwright, `TURN_DURATION_MS=300000`, PROTOCOL 18)

- Felt Table: opponents arc, pending strip, center-stage action log, private dock + economy bar.
- Room `VYFEUG` (HostA + GuestB). GuestB Tax via card Dialog Use (self-only one-shot) → log
  `playCard tax`; lives/points updated.
- HostA: Basic attack → Use → nested target Dialog (GuestB); server rejected without points
  (`Not enough points`) — correct; Draw (+1) still works from economy bar.
- Timers progress bar + connection status; unspied opponent shows `opponent.png` / Hidden kit.
- No protocol/intent change.
