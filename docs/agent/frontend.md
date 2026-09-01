# docs/agent/frontend.md — Client conventions

> Created during L1-12 from the real client code. Transverse rules → `/AGENTS.md`.
> Protocol → `protocol.md`.
>
> Sources: technical spec §7 · `apps/client/src/`.

## Status

V1 shipped functional UI only, no art direction (technical spec v1 §9). **V2 is in progress**
(`docs/technical_spec_v2.md`, `docs/backlog_v2.md` Lots 10–14). `App.tsx` is the phase
router; Home, Lobby, Table, and End live under `apps/client/src/screens/` (Lots 11–13).
Update this file's examples in place as V2 components land; don't fork a second frontend
playbook. **Keep it current with every client convention change** (AGENTS.md §12) — same
commit as the code, never a later cleanup. Intents, payloads, and visibility rules are
unchanged by V2 (except the Table **control pattern** in technical spec v2 §6.1 — same
payloads, different chrome; implemented in L12-08).

## Screens

| Screen | When | File |
|---|---|---|
| Home | No room — hub → online (create/join) or solo; optional How to play | `screens/home.tsx` + `how-to-play-dialog.tsx` |
| Lobby | `phase: 'lobby'` — seats, code, host Start / bot controls, hidden kit pick | `screens/lobby.tsx` + `lobby-kit-picker-dialog.tsx` |
| Table | `phase: 'playing'` — felt shell, opponents arc, center-stage log, queue, timers, hand, economy | `screens/table.tsx` (+ `screens/table/*`) |
| End | `phase: 'finished'` — closable stats dialog over frozen board (`finalTable`); return home | `screens/end.tsx` + `game-over-dialog.tsx` |

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
  `ConnectionBadge`, `KitPortrait`, `Dialog` (L11-03), `Tooltip` (L12-08), `PlayerName` /
  `CostDisplay` (Lot 39), `IconButton` (L43-05, 44px, no `min-w-[7rem]`), `SeatTile` /
  `CardChoiceTile` / `choiceTileClassName` (L44-01; shop buy cells use the helper). Art resolution:
  `apps/client/src/design/asset-lookup.ts` (never invent a mapping; never invent filenames —
  `wizard` → `Magician.png` is declared). Copy kit PNGs from repo `images/` into
  `apps/client/src/assets/kits/` in the same task that adds the `KIT_FILES` entry.
- **Data-only kit registration (Lot 27):** append to `KIT_IDS`, add `KIT_CATALOG` row
  (tech v4 §8.2 verbatim), add `KIT_FILES` + PNG, mid-game `alwaysUpgraded` test. No engine
  change — `acquire-card.ts` already applies the trait. `content-scope.test.ts` locks
  `KIT_IDS.length === 15` with exhaustive catalog keys; client `KIT_FILES` is asserted in
  `asset-lookup.test.ts`. Inspect dialog already renders `alwaysUpgraded` / `specialCards`;
  only duplicate specials need a `${cardId}:${index}` React key (L27-05). New `KitTraits`
  fields need a dialog section + `KIT_TRAIT_SECTION_KEYS` entry (L30-05).
- **Dialog:** controlled `open` / `onClose`; `role="dialog"` + `aria-modal` + labelled title;
  focus trap; Esc and overlay dismiss; action slot uses shared `Button` variants (`compact` on
  phone dialogs). Overlay is sized to `visualViewport` (not `100dvh` / `fixed inset-0`,
  which can be the desktop window in DevTools device mode) and `items-start`; panel is
  `my-auto` / `max-h-full` of that overlay (never `items-center` — that clips the title).
  `panelClassName` `max-w-*` becomes one `max-w-[min(<abs>,100%)]` token via
  `dialogPanelClassName` (L53-02 / L53-07). Prefer this
  for every modal prompt (Lobby copy feedback; Table card-first prompts). No
  extra npm dependency unless separately ruled.
- **Tooltip:** hover + focus; `role="tooltip"`; used for unavailable own cards (reason from
  view fields only).
- **Button variants:** `purple` (play), `yellow` (kept for other CTAs), `green` (confirm/Start/Create/Join
  / Draw / Sell), `red` (Leave / return home), `orange` (Buy / Upgrade / Shop / Copy). Solid rounded CTAs from
  token hues — no `*_button.png` skins, no hex clip-path.
- **Home (L11-01 / L17-01 + hub rework / L51-03):** branded hub first — title,
  decorative V1 kit/card art. Two mode paths (not stacked forms): **Play online**
  (nickname + create / join) and **Play solo** (nickname + opponent count 1–5 + difficulty,
  defaults 1 + Normal). Nickname is collected **inside** each path, not on the hub.
  **How to play** (L42 / L51-02): spec §5.1 sections in order (goal, turns, lives,
  points, cards, upgrade, kits, specials, shop — no delayed-resolution section);
  Skip + Got it both close; screenshot `<img>` only when the PNG exists under
  `src/assets/how-to-play/` (`import.meta.glob`, missing files omit the image).
  Copy is the §5.1 first-time floor; resource icons sit next to Lives / Points /
  Upgrade / Shield. **Soft gate** on the first hub Play online / Play solo / Tutorial
  click (`localStorage['card-battle.v6.howToPlaySeen']`); Skip, Got it, Esc, and overlay
  all set the key and continue into that path. Manual open: Skip / Got it set the key;
  Esc / overlay only close. Idle hub is unlabeled (not “Not connected”). Top-right **Beta**
  card (word Beta only). No protocol footer, no Reset help control, no delayed-resolution
  pitch. **Tutorial** opens a nickname-only path
  (`create({ tutorial: true })` then `startGame`; no `addBot`, no kit picker). Table **How to play** is a compact **?** `IconButton` on the turn strip
  (L43-05; does not send an intent). Tutorial table (L45-05): hovering dismissible coach
  chat (copy from `tutorialStepAt` / `TUTORIAL_TOUR_STEPS` / `TUTORIAL_LOOK_COACH`; last human
  coach on bot turns). Client-only **board tour** at index 0 (Got it; no `tutorialIndex` bump)
  then Draw. After Spy resolves (end of index 8), a **Look** gate forces a portrait click
  before sell. Coach panel is slightly transparent. Auto-opens
  on new copy; compact **?** reopens it (not a Coach pill). Skip tutorial is **flag only**.
  Resource words in coach copy render as table icons.
  Pulsing orange callout + pointing arrow **outside** the highlight square on scripted
  controls (Draw, cards, Shop). Real pending chips (Incoming **and** Waiting on others)
  get the same callout chrome **without** an arrow: red when `threatToneFor` is attack,
  orange otherwise, until the chip leaves the queue. Presentation persistents are not
  ringed. Shop is **not**
  auto-opened; illegal clicks do not send (`tutorial-follow-coach`
  copy on the coach). Client idle 20s retitles the coach **Play** (not during tour or Look).
  **First-game hints (L46):** Classic live table only (`playKind !== 'tutorial'`). Same
  `CoachPanel` chrome as tutorial but **compact and more transparent**, `data-zone="first-game-hint"`, Got it / Skip all.
  Selector ranks one undismissed topic from view facts: reward (while POV is choosing) →
  **attack** Incoming → **Thief** Incoming → (on turn) your-turn → draw → hand → specials →
  shop → resources → hidden-kit. Spy stays on the Incoming strip without a hint card.
  Auto-Got-it on Draw / Shop / play / portrait / hand or special inspect / attack- or
  thief-Incoming clear / confirm reward. × dismisses the same as Got it.
  Card sits next to `data-hint-anchor` (no rings); `incoming-thief` reuses Incoming.
  Hand / Specials anchors are the **card cluster** (`inline-flex`), not the flex-1 section;
  those two cards sit **beside** the cluster (top-aligned, left when it fits) so they are
  not dumped on the felt's left edge or over the other row. `leave` is not a hint id.
  Completing or skipping the tutorial does **not** set `skipAll`
  (L46-03); Hub **Reset help** still clears the key. `localStorage['card-battle.v6.hints']`. Solo composes `create` + N× `addBot` + `startGame`;
  `soloLaunchPending` skips Lobby flash. Difficulty copy via `formatBotDifficulty`
  (Easy / Normal / Hard).
- **Lobby (L11-02 / L17-02 / L17-03 / L49-02):** game code + Copy (clipboard); copy result via `Dialog`;
  **Your kit** (self portrait or Random) + Choose kit Dialog (all 15 kit portraits + Random;
  click a tile for description then Select). `chooseKit` payload `{ kitId }` or `'random'`.
  Other seats never show a kit. Start / Leave; host-only Add bot / Remove / set difficulty
  while `players.length < MAX_PLAYERS` (2–6); `BotSeatLabel` on every bot seat for all recipients. Solo path on Home uses the same picker
  and sends `chooseKit` before `startGame` when the pick is not random.
- **Table bot seats (L17-03 / L17-05):** `BotSeatLabel` on opponent zones. `botReason` may
  still arrive on the wire; the action-log **Why** control is **hidden in every mode** (L45-05).
- **Activated art** for Imposition / Points Generator: pass `activated` on `Card` when
  rendering entries from public/self `activePersistentEffects` (PROTOCOL_VERSION 19).
  Own actives sit on the kit identity row as tiny thumbs (not a CardBand row),
  including combat Shield while `shield > 0` (base/upgraded art — no activated PNG).
  Opponent actives sit beside the kit portrait (`activeShield` + persistents). Imposition / Points Generator also get
  presentation-only Incoming / felt chips via `persistent-incoming.ts` (engine still ticks
  them in step 4 — not real pending).
- **Elimination:** one generic treatment on `KitPortrait` — desaturate + “Eliminated” badge.
  No `*(dead).png` paths.
- **Table (L12):** felt shell in `screens/table/` — opponents arc, pending strip, **center-stage
  action log**, private dock + economy bar (`data-zone` hooks for Lot 14). Economy: **Draw**
  + point `CostDisplay` (`signed="gain"`, green CTA — not yellow-on-yellow with the point
  icon) + **Shop** (L43-02 / L43-05). Shop Dialog (always openable — pool is
  public off-turn) holds upgrade-point Buy/Sell (`CostDisplay` of kit points cost/yield via
  `upgradePointBuyCost` / `upgradePointSellYield` at render time, never cached; Buy is orange
  `signed="cost"`, Sell is green `signed="gain"` so the point icon has contrast), the shared-card
  grid + Buy special, and the pool. Turn strip: **?** (How to play) left of timers, **flag**
  right (inline SVG, `aria-label` Forfeit / Leave table / Return home). Alive flag opens Stay / Forfeit
  (“Leave the game? That counts as a forfeit.”); spectator flag opens Stay / Leave
  (“Leave the table?”). Finished `readOnly` flag opens Stay / Return home (designer
  2026-08-21 follow-up — the flag stays on inspect; Game over **Return home** also stays).
  Esc / overlay = Stay. Stats stays on the dock when `readOnly`. Lobby Leave is
  still immediate disconnect. Buy/Sell/Buy-card stay disabled when `!isMyTurn || actionsLocked`.
  Shell is full-bleed
  `h-[100dvh] overflow-hidden` (no page scroll, no `max-w` gutters). Opponents stay **one
  horizontally scrollable row** (`flex-nowrap`, overflow-x; unlayered CSS locks nowrap so
  six seats never wrap to a second line — Lot 53). 4+ opponents use compact seat chrome.
  Lobby player list scrolls (`max-h` + overflow) so six seats do not cover Start / Add bot. **Dock is primary**
  (hand fills remaining height); action log is capped (~15vh portrait) until the felt is
  too short. **Landscape:** two-column felt — left opponents + pending + log, right
  dock (hand/economy) — so short phone heights keep the hand fully on-screen. If one
  uncropped hand row still cannot fit, chrome collapses into a button + Dialog in this order:
  **Incoming** (dock Incoming + felt Waiting on others) → **action log** → **opponents**.
  Viewports with `innerHeight` ≤ 500px collapse all three (L53-07). Collapse Dialogs must
  fit in the viewport with Close visible. Empty Incoming / Waiting / Specials take no flex
  space. No separate
  “Card Battle” header; code/status live in the turn strip. Opponents hug content (no empty
  white seat slab). Pending effects targeting `view.you`
  render in the private   zone (Incoming); effects on others stay on the felt strip (**Waiting
  on others**, L43-03) — both strips size to show full
  chips and scroll internally when many effects queue. Kit
  portrait opens a visual inspect Dialog from `getKit` / `getCard` only (L51-04:
  starting-hand action/attack versos + counts, `CostDisplay` on Draw / special play
  cost / upgrade-point buy-sell, grouped trait cards — never `N action · M attack`
  prose). **Private zone:**
  Incoming is a **full-width chip row** under the identity header (title + chips on
  one line). It is not squeezed beside the kit/name and has no `max-h-9` clip.
  `CardBand` — Hand and Specials share **one** face width (preferred min **40px**, max
  88px; shrink further rather than crop). Specials do not size independently. A short
  Hand or Specials row packs to `w-max` and **centers** with `mx-auto` (do not
  `justify-center` the overflow row — that clips both sides). Resources sit
  above
  the economy bar with **visible captions**
  (Lives, Points, Upgrade points, Shield — L43-01, not `sr-only` / `title` only);
  kit inspect and opponent reveal stay compact; `Card detail="face"`; effect
  copy in the card Dialog. Action log: scrollable list only (no filter rail); entries
  grouped under a sticky **Round N** header
  (table round = `floor(turnSequence / seatCount) + 1`, presentation only — no turn numbers
  shown) with one line per action. Hand/specials are **one row each** and **scroll
  horizontally** (L53-07; no wrap, no vertical card scroll, no pager). Width follows row
  height so the name line stays on-screen.
- **Dialog width (L53-02 / L53-07):** `dialogPanelClassName` maps `max-w-*` to one
  `max-w-[min(<abs>,100%)]` token of the overlay (Shop / kit picker / How to play / sub-choices).
  Panel is `min-w-0 max-h-full` of the overlay so 390×844 never clips
  Cancel off the right and 844×390 never clips Close off the bottom. Overlay is
  sized to `visualViewport` and `items-start` (not `items-center`, which clips the
  title of a tall panel); `my-auto` still centers a short panel. Footer `Button`s use
  `compact` and wrap. Collapse Opponents seats sit on a `min-w-0` nowrap row; Action
  log Dialog uses `embedded` so the empty state is not a full-height white slab.
- **Table card-first (L12-08 / L51-05):** click own hand/specials → Dialog with effect text + Use /
  Upgrade / Sell. Play cost is `CostDisplay` icons (`CardEffectCopy`); non-upgraded faces
  show base `effect` plus an Upgrade block of `upgradeAdds`; upgraded faces show only
  `upgradeEffect`. `formatCardEffectText` matches that copy (no `Cost:` prefix) for
  non-dialog surfaces. Cards stay clickable off-turn (and while Mirror/reward prompts run) so the
  player can read descriptions; action buttons disable when `!isMyTurn` or actions are locked.
  Nested Dialog for target, Regen quantity, **Card Transformer consume** (hand shared
  action/attack → `consumeInstanceId`), Assassin multi-attack; self-only Use is one-shot;
  Spy-revealed cards inspect-only; Mirror and elimination rewards via Dialog. Same
  intents/payloads as V1. Shop dialog thumbs use upgraded art when the seat's kit
  `alwaysUpgraded` covers that card (purchase arrives upgraded). Card dialog **Upgrade**
  shows `CostDisplay { kind: 'upgradePoint', amount: 1 }` with `signed="cost"`; **Sell** is
  green with catalog `sellYield` and `signed="gain"` (life icon on orange failed contrast).
  Interactive costs prefix **−** (pay: Use / Upgrade / Buy) or **+** (receive: Draw / Sell).
- **Visual pickers (L44-01):** `choiceTileClassName` is the shop selected/idle ring.
  `SeatTile` (seat wash + `PlayerName` + `KitPortrait`; hidden kit = opponent “?”;
  selected uses a 6px orange *layout* frame (`choiceTileSelectedFrameStyle`)
  plus inner glow — Dialog overflow cannot crop a box-model ring) and
  `CardChoiceTile` (card thumb, or attack verso when identity is hidden) live under
  `design/components/`. Shop buy cells use the helper only. Later L44 prompts consume
  the tiles; intents stay unchanged.
- **Mirror sub-choice (L44-03):** pending attacks are `CardChoiceTile` (art + name +
  source `PlayerName` + “→ you”); new target is `SeatTile`. Payload still
  `{ kind: 'mirror', pendingEffectId, newTargetPlayerId }`. Eligible ids only.
- **Steal / pool / consume / special (L44-05):** all grids are `CardChoiceTile`.
  Unknown steal identities use the attack verso and the fixed “Hidden card”
  caption — no instance id on the tile. Pool extras stay `disabled` at `maxCount`.
  Payloads unchanged (`steal-pick` instanceId, `pool-pick` instanceIds,
  consume `playCard` + `consumeInstanceId`, `special-pick` cardId).
- **Rewards / reanimation / Regeneration (L44-06):** reward resource kinds use
  `choiceTileClassName` + existing `REWARD_KIND_COSTS` `CostDisplay` (4/8/1);
  card kind is a `CardChoiceTile` grid (Confirm still two choices; log stays
  opaque). Reanimation wraps `KitPortrait` with the same chrome (not a third
  primitive). Regeneration is four click-to-commit buttons (`1 life` … `4 lives`);
  click sends `playCard` `{ quantity: n }` and closes; footer is Cancel only;
  each button shows `CostDisplay` of `structuredPlayCost` × n as points
  (`signed="cost"`). No client-side affordability.
- **Duplicator action-log copy:** `activateDuplication` formats as "`X draws`"
  (playtest 2026-08-09); Spy/self still receive the real action kind on the wire.- **Skills applied selectively:** product-UI guidance from design / ui-styling / ui-ux-pro-max
  (contrast, touch targets ≥44px, focus rings, form labels, Dialog a11y, reduced-motion).
  Landing-page layout rules from design-taste-frontend do **not** apply to
  Home/Lobby/Table/End.
- **Table FX (Lot 14):** `apps/client/src/fx/` — hybrid presentational layer. Local Motion on
  cards/timers/resources; `TableFxProvider` queue for play flyouts, **token** chips (exact
  `|Δ|` icons between the action-log panel and the resource — staggered ~95ms, ~0.85s
  travel; not cards from Draw), buy/sell card ghosts, resolution, elim, rewards. Resource
  flash clears after ~1.6s. Shared timing in `fx/motion-timing.ts` (~0.55s). Dialogs animate
  open/close. Intents must never await FX. `useReducedMotion` skips choreography.
- **Table UX polish (Lot 39 · `docs/backlog_ux.md`):** client readability only — no rule
  change. Task IDs are **L39-** so they never collide with V5 Lot 32 search work.
  - **IllegalActionDialog (L39-02):** `error` is `{ code, message }` (PROTOCOL 27). Table
    parses into `actionReject` and opens `IllegalActionDialog` (title/body from
    `illegal-action-copy.ts`, Esc / overlay / OK dismiss via `clearActionReject`). Timers
    strip no longer shows a red reject line. Lobby/home keep the inline alert string.
    `stateUpdate` must **not** clear `actionReject` (bot sync would dismiss mid-read).
    When cleared, unmount the dialog (do not leave `Dialog` at `open={false}`) so
    AnimatePresence cannot leave a stuck blocking overlay.
  - **Seat colors (L39-03):** client-only palette `--color-seat-0…3` (blue / red /
    green / yellow) indexed by `view.players` array position (`seat-colors.ts`).
    POV **dock** uses a strong seat wash (`seatZoneStyle({ intensity: 'fill' })`)
    instead of the old fixed `surface-kit` pink; opponent seats use a softer tint +
    loud glow when active. Colored names in pending queue and action log.
    No wire field.
  - **Opponent token flyouts (L51-09 / L51-11 / L51-13 / L51-14 / L51-15 / L51-16):** POV dock
    `ResourceIcon` still handles live dock Δ except overlay-landed transfers
    (skip only after chips measure). Unspied / base Spy enqueue **directed** chips
    (`from` / `to` log or player): play/buy/upgrade spends seat→log; sell yield
    log→seat; buy upgrade point spends Classic 10 when kit is hidden. **Resource
    chips are icon-only** (`object-contain` + drop shadow, no `bg-surface-raised`,
    no card radius, no border). Overlay card chrome is **`asCard === true` only**
    — never `from.width`. Token chips are 40×40 both ends (L51-16); that size
    must not promote them to tiles (L51-14). **Card ghosts on buy/sell and play**
    (felt pending + card-band midpoint, ~48×72, `asCard: true`) — buy/sell verso
    when unspied, face when Spyed; play uses public `cardId` face art. Special
    buy uses the special verso. **Every resource
    transaction flies both legs when both exist** (L51-15): catalog spend/yield
    plus `leftoverLiveFlowChips` for live Δ the catalog did not explain
    (Absorber spend 3 + absorb 10 → 3 out and 10 in, not the net +7).
    Overlay opacity holds through ~88% of travel so the gain leg is still
    visible at the dock (L51-16). Public chip amounts flash on the seat icon
    even when the printed value is `?` (`emitResourceFlowFlash`).
    `actionResolved` `livesLost` / `shieldAbsorbed` fly from the target
    (POV, unspied, and live Spy) — do not skip seats with live icons.
    Regeneration: live Δ when numbers are known, otherwise the catalog per-life
    unit (rate + 1 life) so the action still animates; quantity is not on the
    public log. Thief / Spy Thief / Upgrade Point Thief: live Δ victim→thief
    (extra upgraded gain from the log); both `?` → one directional chip, never an
    invented total. Overlay `z-[110]`.
    Travel `TOKEN_FLYOUT_DURATION_S` in `apps/client/src/fx/motion-timing.ts`
    (0.6s; raise it to slow chips — keep `FX_TTL_MS` above that × 1000).
    Reduced motion skips choreography. Do not invent Draw totals.
  - **CostDisplay (L39-04):** icon+number on interactive cost chrome (Use / shop / special
    buy / rewards / Sentence expiry). Button chrome adds `signed="cost" | "gain"` (− / +).
    How-to-play and action-log prose stay text via `formatCardCost`. Kit inspect and
    card inspect use `CostDisplay`. Card inspect prefixes the play-cost row with
    **Cost** and inlines resource glyphs in effect / `upgradeAdds` copy
    (`EffectTextWithIcons`, L51-12). No “Choose Use, Upgrade, or Sell.” helper.
    Draw is green (gain); Sell is green (gain); Buy / Upgrade stay
    orange (pay).
  - **Threat FX + turn banner (L39-05):** when a **new** real Incoming pending targets POV
    (diff in `incoming-threat-diff.ts`; presentation `persistent:…` chips never count),
    enqueue `threatOutline` + optional `targetingCue` (opponent-seat pulse highlight,
    not a line). Tone via `threatToneFor`: **red**
    `attack` for attack cards + Sentence / Mirror / Super Mirror; **orange** `effect`
    otherwise. Flash TTL `THREAT_FX_TTL_MS` (~3.8s) with a matching long outline pulse.
    Active seat gets seat-colored glow (`seatZoneStyle({ active: true })`); own-turn timers
    banner gets a stronger seat tint. Table banners reuse the same flash duration (~1.6s,
    `pointer-events-none`): attacked / dead are flashier red; win copy is `You won!`.

## Conventions

- **Zero rule logic** on the client. Buttons send intents; the server revalidates.
- Connection hook: `apps/client/src/net/use-room-connection.ts` — create / joinById /
  messages / leave / auto-reconnect (`room.reconnection` + `sessionStorage` token fallback).
- Mid-game **flag Forfeit** confirms then sends `FORFEIT` (socket stays). Spectator **Leave**
  and finished-board **Return home** (flag or Game over) call `leaveGame()`. Unexpected drop shows
  status `reconnecting` and does not clear the table view until reclaim fails.
- Every `stateUpdate` replaces the previous view. Validate shape before use.
- Timer display is cosmetic: trust `turnDeadlineMs` / `turnStarted.deadlineMs` from the
  server, never a client-only countdown as authority. When the active seat is `disconnected`,
  show paused copy instead of a live countdown.
- **Degraded states (L9-01):** each `PublicPlayerView.connection` drives badges —
  disconnected grace, `absent N/3`, idle timeouts `N/5`.
- Action log is the table's main organ (technical spec §7). Browsable history lives in
  `apps/client/src/action-log/` — scrollable round groups (no player/kind/search filters).
  Copy is natural language (`Alice attacks Bob with Basic attack`); buy/sell/upgrade omit
  the card name (`sold a card`). Card display names come from `getCard`.
  Server `actionLog` is a discriminated union (`actionPlayed`, `actionResolved`,
  `playerEliminated`, `mirrorRedirected`, `playerReanimated`, opaque `rewardsClaimed`).
  Reward picks are never shown. In-game `playerReanimated` never includes `kitId`
  (designer 2026-08-24 / L50-03): copy is always `X returns`. Excel `exportLog` still
  carries the kit. Bot rows may carry optional
  `botReason` (L17-05); the Why control is hidden in every mode (L45-05) — never feed
  reasons into play/legal UI.
- **End screen (L9-03 / L13-01 / designer 2026-08-06):** `FinishedStateView` keeps public
  `recap` + `exportLog`. PROTOCOL 24 adds `finalTable` (per-recipient `PlayingStateView`
  snapshot, `turnDeadlineMs: null`). Client renders the frozen table under a closable
  Game over Dialog (default open; Esc / overlay / View board dismiss). Stats button on the
  economy bar reopens it. Intents are locked (`readOnly`); Shop / inspect / action log stay.
  Flag opens Stay / Return home (`leaveGame()`); Game over **Return home** is the same intent.
  Tutorial finished views use title **Tutorial complete** and CTA **Play a real game**
  (still `onLeave` → hub only). Table banners (L51-06): **Your turn** (seat color);
  **You are being attacked** once per new attack-tone Incoming (flashier, red);
  **You are dead** on the POV elimination edge (flashier, red); **You won!** on POV
  win. Game over Dialog opens after the ~1.6s banner. Won and dead never share a seat. **Download action log** renders only when
  `import.meta.env.DEV` (every mode).
  No kits on the finished seat list
  itself (still private
  except via `finalTable.self` / Spy / eliminationReveal as in playing).
- **`playCard`** may omit `targetPlayerId` (Tax, Regen, Shield, Mirror, and other self-only
  V1 cards) and may include `quantity` (Regen 1–4). Table (L12-08): click card → Dialog;
  self-only Use sends immediately; targeted Use opens nested target Dialog; Regen opens
  quantity Dialog. Regen quantity is a free text field; Confirm stays disabled until
  the value is an integer from 1 to 4 (mobile `type="number"` was unusable).
- **Assassin** (`allowsMultipleAttacksPerTurn`): `playMultipleAttacks` with ≥2
  `{ instanceId, targetPlayerId }`. Single attack still uses `playCard`. Multi-attack opens
  from the attack-card action Dialog. Draw label uses `getKit(self.kitId).startingResources.draw`.
- **Spy / death reveal (L51-08 / L51-10):** opponent seats always show lives /
  points / upgrade points / shield icons. Unspied and base Spy render `?` (never
  unspied totals, never the frozen snapshot numbers). Upgraded Spy and death
  reveal show live / freeze numbers. Icons stack vertically beside the portrait;
  activated cards sit under the portrait. Shield stays on the seat (no omit-on-
  overflow). Portrait stays tappable when a Spy or death reveal exists. Dialog
  title is `{nickname}` for Spy and `{nickname} (eliminated)` on death. No Hidden
  kit / Spied — tap / Revealed — tap labels.
- **`actionResolved.outcome === 'immune'`**: surface **“immune”** in action-log copy and
  resolution FX flash (Untouchable, Invisibility, and any future `outcome: 'immune'`).
- **Elimination reward Dialog:** option labels use natural names (`4 lives`, card catalog
  names via `formatCardLabel`) — never raw `RewardChoice` type ids or `cardId` strings.
- **Sub-choices (L30-03):** one unicast `subChoiceRequired` / `resolveSubChoice` pair
  (`SubChoiceRequiredPayload` discriminated on `kind`). Client stores a single `subChoice`
  and renders `SubChoiceHost` — Mirror, elimination rewards, steal-pick, pool-pick,
  special-pick, reanimation-kit. Deadline is `SUB_CHOICE_MS` (40s). Clear on confirm /
  `turnStarted` / `gameOver`. Lock other table actions while a sub-choice is open. Also lock
  when `players[you].isEliminated` — after an elim the turn pointer may still sit on the dead
  seat until rewards finish. Reward picks stay opaque in the action log.
- Dev override: server `TURN_DURATION_MS` env (ms, min 5000) — default 60s.
  `RECONNECT_GRACE_MS` env (ms, min 1000) — default 60s.
- Finish client tasks with a Conventional Commit (AGENTS.md §10) — same rule as server work.

## Manual two-browser check (Lot 6)

How agents / developers verified elimination rewards in a real room:

1. `TURN_DURATION_MS=300000 pnpm dev` (long turns; reward sub-choice stays 40s).
2. Open **two** browser contexts/tabs on `http://localhost:5173/` (Playwright tabs or two windows).
3. Tab A: nickname → **Create** → note game code. Tab B: nickname + code → **Join**. Host **Start**.
4. Farm points with **Tax** (uncheck “Include target”), pass the other seat with **Draw**.
5. Queue **super-attack** (10 pts, 7 dmg) at the opponent; on their turn they **Draw** so it resolves.
   Two hits (or one if they already Taxed lives down to ≤7) eliminate them.
6. **Eliminator** tab must show **Elimination reward** with a 40s countdown and two pickers
   (`lives` / `points` / `upgradePoint` / `card` + card list from the held hand/specials) —
   **only in mid-game** (still ≥2 contenders after the elim). Use a **3+ player** room for
   this check, or leave another seat alive. In pure **2p**, a game-ending elim **skips**
   rewards and goes straight to game over (designer 2026-08-06) unless the victim has
   reanimation pending.
7. **Victim** tab must show **Eliminated** / spectator copy and have **Draw disabled** (not only a
   server error). Confirming rewards (or waiting out the 40s default `2×4 lives`) then emits
   `gameOver` when one seat remains.
8. Spot-checks: mid-game card + upgradePoint pick keeps the match going; final elim of the
   penultimate player → **no** reward dialog → game over; acting as victim during a mid-game
   pause → server `Finish elimination rewards first.` (UI now prevents the click).

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
6. Final elim of the penultimate player → **skips** rewards (game-ending) → `gameOver` for
   the last survivor. Closable stats dialog over the finished board.

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

### Lot 13 verified 2026-08-03 (Playwright, `TURN_DURATION_MS=300000`)

- Room `BBTWGH`: HostA + GuestB → Start → GuestB Leave forfeit.
- End: Home-like branded layout, Winner HostA (you), Players + Eliminated marker, Recap,
  Return home → Home. No connection badges on End.
- No protocol/intent change; `build-view-for.ts` untouched.

### Lot 14 verified 2026-08-03 (Playwright, `TURN_DURATION_MS=300000`)

- Rooms `JMGZOZ`, `VSJDBP`: two-tab Start → Table FX layer present (`data-zone="table-fx"`);
  timer progressbar Motion width from server deadline; card Dialog Use path still sends;
  Leave forfeit → redesigned End.
- Hybrid FX: local card entrance + timer; overlay for flyout/resolution/elim/rewards.
- No protocol/intent change; intents never await FX.

### Lot 17 verified 2026-08-04 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 21)

- **Solo:** Home Play solo → defaults (1 opp, Normal) → Start. Room `SSHUHB`. Lobby skipped.
  Table: opponent `Alpha` with `Bot · Normal`; action log Why → “Investing for a stronger later
  turn.” Bot pace readable between turns.
- **Lobby bots:** Create → room `MKZBSV` → Add Easy + Add Hard (`Alpha` Easy, `Bravo` Hard) →
  Start. Table shows both bot labels; Why on bot plays; resolution FX still fires
  (`Bravo's Strong attack hits Alpha`).
- Living docs: `frontend.md`, `protocol.md`, `db.md` updated for solo / lobby bots / `botReason`.

### Lot 30 verified 2026-08-05 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 23)

- **2p human:** rooms `JLHWBF` (Player1 + Player2). Pool `(N)` → Shared pool dialog (empty
  copy + Close); kit inspect loads special art + Always upgraded / Immune to / Multiple
  attacks sections; Draw rotates turns; action log updates; no app JS errors (favicon 404
  only, pre-existing).
- **Solo:** rooms `LEGUIR` / `SOZVBU` — Pool + kit inspect + Tax/Thief/Draw paths; bot turn
  rotation works when the human keeps acting. Early “stall” reports were turn-ownership
  confusion / tab leave, not a client lock (`FJKUXN` HostA `consented leave` in server log).
- **L30 surfaces covered:** art map (30 cards), pool button, SubChoiceHost wiring (Mirror /
  reward host present; mid-game Mirror not forced this pass), Block/Invis/Duplicator chrome
  code paths wired (kit RNG did not force those kits this session), immune log copy,
  trait-section count test.
- Deeper forced paths (MEGA / Super Mirror / Reanimation / Absorber pool-pick) remain
  engine-tested; re-check in a longer session once Lot 29 bots bias toward those cards.

### Lot 39 verified 2026-08-10 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 27)

- **Solo rooms:** `XZVWJS` (HostA, 2× Normal), `EGIPYR` (HostB, 2× Easy), `DYNMDK`
  (HostC, 2× Normal). Home shows Protocol v27.
- **Seat colors:** POV + opponents tinted; log/pending names use seat hue (blue / red /
  green / yellow).
- **IllegalActionDialog:** Buy UP / unaffordable Super attack → modal “Not enough points”;
  timers strip has no red reject line. Modal survives bot `stateUpdate` (fix in
  `use-room-connection`). OK dismiss works after unmount-on-clear fix (stuck overlay).
- **CostDisplay:** Use button shows icon+number (`point.png`); Buy shop lists icon costs
  (Basic 2 / Strong 4 / special 20 pts).
- **Threat FX:** orange Incoming outline observed for Spy targeting POV (`XZVWJS`). Red
  attack Incoming not forced this pass (bots did not queue an attack on the human);
  `threatToneFor` unit tests cover red/orange classification.
- Living docs: `frontend.md`, `protocol.md` (already PROTOCOL 27), `decisions.md` Lot 39.

### Lot 43 verified 2026-08-21 (browser, `TURN_DURATION_MS=300000`)

- **2p** room `WNM2C6` (HostA vs 1 bot): dock captions Lives / Points / Upgrade points / Shield;
  **?** opens How to play; **Shop** shows upgrade-point Buy/Sell + cards + pool; flag Stay keeps
  the table; flag Forfeit → Game over on the same client (`HostA eliminated (leave)`).
- **3p** room `WA1I2N` (HostA vs 2 bots): Forfeit stays connected as spectator (Eliminated
  banner; bots keep playing); second flag is **Leave the table?** (not forfeit copy); Leave
  returns to the hub with no Game over dialog.
- Designer follow-up 2026-08-21: finished inspect **keeps the flag** as Return home; Draw is
  green; Sell is green; button costs show − / +.
- Phone-width hand pagination remains L48-02.

### Lot 44 verified 2026-08-24 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- **Solo** room `KUVIMX` (Lot44Host vs 1× Normal bot Alpha). Shop buy cells still use
  `choiceTileClassName` (selected orange ring, `CostDisplay`, Buy selected).
- **Target:** Basic attack / Strong attack / Spy → `SeatTile` grid (hidden kit “?”, nickname
  Alpha, seat wash). Confirm still sends; no radios.
- **Regeneration:** four click-to-commit tiles `1 life` … `4 lives` with live `CostDisplay`
  (−3 / −6 / −9 / −12 pts at base rate). Footer Cancel only. Click `1 life` applied
  (lives 4→5) and closed the Dialog.
- Not forced this pass (engine-tested / source-tested): Assassin multi, steal hidden/spied,
  pool / consume / special-pick, Mirror, elimination rewards, reanimation kit. L48-02 remains
  the formal first-time gate.

### Lot 45 verified 2026-08-25 (browser, tutorial no turn timer, PROTOCOL 30)

- Hub **Tutorial** → How to play soft gate (Skip) → nickname-only form (no kit picker, no add-bot).
  Nick `L45Host` → Start tutorial. Room `EZBIMB`. One bot **Alpha**; difficulty label hidden on the
  table. Coach **Draw** (points, not a card); Draw spotlight. Shop opens only on click (not
  auto). Illegal Shield Use → coach **Tutorial step**. Tax coach copy **4 points**. After Tax,
  coach **Counter** (equal cancel); Basic highlighted; Incoming Basic from Alpha. Action log has
  no Why. **Skip tutorial** confirm is not a forfeit → hub, no Game over.
- Engine walk 0–30 is covered by `tutorial-script.integration.test.ts` (L45-07), not the browser
  pass.

### Lot 45 follow-up verified 2026-08-26 (browser, board tour + Look gate)

- Nick `TourHost`, room `GMFBAP`. Client-only 11-step tour before Draw (Got it); Draw blocked
  on the Leave step; Draw after tour. Coach panel slightly transparent. After Spy resolves,
  Look forces a portrait click (no Got it); Spy reveal then Sell.

### Lot 46 verified 2026-08-26 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- Hub **Reset help**, then **Tutorial** nick `L46Tut`. Room `RMXLCN`. Board-tour coach **Your zone**
  with **Got it** only — no first-game hint, no **Skip all**. **Skip tutorial** confirm → hub (not
  a forfeit). Next Classic still eligible.
- **Play solo** nick `L46Host`. Room `CVYCNN`. First-game card **Your turn** (“take **one** action”)
  with **Got it** and **Skip all**, next to the turn strip. **Skip all** hides it. Second solo
  `OTFTLE` has no hint card. Hub **Reset help** then third solo `MBIXNF` shows **Your turn** again.

### Lot 46 follow-up verified 2026-08-28 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- Hub **Reset help**, **Play solo** nick `L46Hints`, 1× Normal bot. Room `WONXYS`.
  After **Your turn** and **Draw**, **Hand** (“use / upgrade / sell”) then **Specials**
  (usually one-use). Shop / Resources / Hidden kit still follow.
- Same room: Alpha **Card Thief** → Incoming hint “incoming **Thief**” (not Shield/Mirror).
  Later Alpha **Strong attack** → Incoming hint “incoming **attack**” / do something
  (attack back, Shield, or Mirror). The two bodies are distinct.
- First POV **elimination reward** hint is unit-tested (selector + Dialog anchor). Not forced
  in this 2p solo (game-ending elim skips rewards).

### Lot 46 placement fix verified 2026-08-29 (browser, `TURN_DURATION_MS=300000`)

- Solo nick `L46Beside`, room `MAEVCV`. After Your turn / Draw, **Hand** sits in the HAND
  row immediately left of the cards; **Specials** sits in the SPECIALS row immediately
  left of Super Mirror — not on the far left of the felt.

### Lot 46 copy rewrite (main 2026-08-29)

- Designer replaced the short §5.2 one-liners with longer `HINT_COPY` bodies (Draw depends
  on kit; Shop buy cards / specials / upgrade points; Incoming attack vs Thief still
  distinct). Spec + copy test lock those strings. Placement and selector unchanged.

### Lot 50 verified 2026-08-24 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- Solo Specialist vs 1 bot, nick `SupercalifragilisticNick`. Shop tile select stays open;
  Buy upgrade point closes the Shop. Base Card Transformer (Mirror) granted Imposition;
  upgraded special-pick list has 19 specials and no Card Transformer. Log shows the long
  nick without ellipsis. Phone-width (390) Hand pager `1/2` with 44px `IconButton` arrows.
  Room `PPWXUP` on the pager pass.

### Lot 51 verified 2026-08-26 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

- **Hub:** top-right **Beta** card (word Beta only). No `Protocol v` footer, no Reset help,
  no delayed-resolution pitch. How to play: Goal → Turns → Lives → Points → Cards → Upgrade
  → Kits → Special cards → Shop; resource glyphs beside Lives / Points / Upgrade / Shield;
  Skip / Got it. No “delayed”, “double”, or “(not a card)”.
- **Kit inspect** (Scientific on Play solo): starting-hand action/attack versos with counts;
  Draw and special play cost use `CostDisplay`; traits grouped (Always upgraded).
- Room `ZYGXYI` (Scientific vs 1× Normal): unspied opponent four icons with `?`; no Hidden kit
  / Spied — tap; Incoming Strong attack chip ringed, **no arrow**; center **You are being
  attacked** then **Your turn**.
- Room `ZOVGTV` (Tactician nick `L51Spy`): Shop-buy Spy (always-upgraded); after resolve,
  opponent live numbers (not `?`); Super attack dialog CostDisplay + Upgrade delta; token
  chips from the seat toward the action log.
- Room `BRXKPO` (nick `L51Dead`, forfeit): center **You are dead** (~1.6s) then Game over
  (Protocol v30 stays on that dialog). **You won!** not forced this pass — same first-paint
  seed as dead (`table-banner.test.ts`).

### Lot 51 follow-up verified 2026-08-27 (browser, PROTOCOL 30)

- Room `A1HICW` (nick `L51Fx`, Kamikaze vs 1× Normal): opponent resources are a vertical
  column of four `?` icons beside the portrait; Regeneration inspect is **Cost** + coin/heart
  glyphs, no “Choose Use, Upgrade, or Sell.”; buy-upgrade spend coins dock → log.
- Room `UYHZH` (nick `L51Ghost`): sell yield coins log → Alpha (gain). Action-verso ghost
  enqueued seat/portrait → log (96×144, tokenFlyout). Landscape opponents strip `40dvh` so
  the seat is not clipped.
- Thief seat-to-seat chips remain unit-tested (`stealTransferChips`); not forced in this
  browser pass (hands rarely held Thief).

### Lot 51-13 verified 2026-08-28 (browser, PROTOCOL 30)

- Room `GDYM1C` (nick `L51Fx13`, Indestructible): Draw coin chips log↔dock; Regeneration+
  (1 life / 2 points) flies two coins dock→log and one heart log→dock. Playing
  Regeneration does not fly a card to the center.
- Buy/sell card ghosts are ~48×72 and fade in ~0.5s (no lingering full-size log card).
  Destination is the pending/card-band midpoint on the felt. Thief live Δ still flies
  victim→thief (1 directional chip when both `?`; same-tick sell yield fills a net-0 Δ).

### Lot 51-14 verified 2026-08-29 (browser, PROTOCOL 30)

- Room `NOJYLL` (nick `L51Chip`, Indestructible): Draw +1. Flying point chip is
  **icon-only** over the felt — no raised-surface tile, no card border. Still at
  t=1.05s: coin center gold `(185, 152, 17)`; 22px corners match felt pink
  `~(244, 193, 194)`, not log/raised white `~(245, 243, 241)`.
- Overlay chrome stays `asCard === true` only (buy/sell ghosts). Resource
  `tokenFlyout` uses `object-contain` + drop shadow. Playbooks updated in the
  same change (`frontend.md`, `testing.md`, `decisions.md`).

### Lot 51-16 verified 2026-08-29 (browser, PROTOCOL 30)

- Room `DOMKYZD` / table nick `L51Fx16`, Specialist vs 1× Normal (Alpha).
- Absorber+ (cost 3) on Alpha while Strong attack was pending on POV: small
  Absorber ghost hand → felt center; gold coins in flight at the same time as
  hearts (Strong resolve −2 life). Coins visible both near the log and arriving
  on the Points dock — spend and gain legs, not a single net chip.
- Mutual equal/weaker attack vs Alpha's Strong still cancels (Round 2 log);
  cancelled attacks correctly fly no `livesLost` chips from the `?` seat.

### Lot 53 verified 2026-08-31 (browser, `TURN_DURATION_MS=300000`, PROTOCOL 30)

Phone-first crowding pass after the six-player Classic merge. Specialist / mixed kits vs
**5 Easy bots**. Skip How to play / Skip all hints.

- Room `OGPSGK` (nick `L53Phone`): first pass used wrap + vertical scroll (superseded by
  L53-07).
- Room `LKFOCS` / `LK47DCS` (nick `L53Mobile`): landscape collapse Dialogs were cropped
  (`items-end` + `90dvh`) — superseded by L53-07.

### Lot 53-07 verified 2026-08-31 (headless Chrome, exact viewports, PROTOCOL 30)

Re-checked the playtest screenshots: wrap+vertical scroll cropped names, Specials grew
on their own, 844×390 Dialogs/buttons sat off-screen. Contract is now one shared width,
one row, horizontal scroll, height-fit (never crop).

- Room `MUMAMB` (nick `L53Look`), Specialist vs 5 Easy bots. Headless Chrome, exact
  390×844 / 844×390 viewports at deviceScaleFactor 2 (not a 1280×800 desktop shot).
- Portrait: Hand and Specials both **81×133**, `overflow-x: auto`, `overflow-y: hidden`,
  `flex-wrap: nowrap`. Names not clipped. Hand `scrollWidth` 431 > `clientWidth` 368.
- Landscape: cards **71×118** both, **same y**, `data-side-by-side=true`. Left column
  hugs (Opponents 44px, Action log 50px — no empty white 1fr slab). Shop / card /
  Opponents / Action log Dialogs: `inViewport` and Close/Cancel fully on-screen
  (Shop Close bottom 374 in 390; Opponents seats `headerH` 20, `iconClipped: false`).
- `pnpm verify` green (1144 tests).

Designer follow-up: the L53-07 recording still cropped Thief **Cancel**, Opponents
off the left, and the Action log title (empty white slab). Overlay is sized to
`visualViewport` (not `100dvh` / `fixed inset-0`) with panel `max-h-full` /
`min(preferred, 100%)`. Room `OEDLPQ` (nick `L53Crop`): portrait 390×844 Thief
dialog Cancel right 373 ≤ 390 (Sell + Cancel wrap); landscape 844×390 Action log
title + body + Close in view; Opponents first seat left 47, Close in view.
