# Backlog — Card Battle V6

> **Task tracker** for V6 (readability, stranger onboarding, beta feedback).
> Scoped by `docs/technical_spec_v6.md`.
> V1–V4 are closed archives. **V5 may continue in parallel** (`docs/backlog_v5.md`,
> Lots 32–40). V6 lot ids start at **41** so they never collide with Lot 39 UX or Lot 40
> engage-search.
> Designer opened this backlog 2026-08-20. Coding starts at L41-01.
> Keep each task's status current — `/AGENTS.md` §9.

Status values: `To do` · `In progress` · `Done` · `Blocked`

## How to read this

**Sequencing principle**

Nothing a stranger cannot see, and nothing you cannot read from testers, gets built as a
side quest inside V5. V6 is its own version: **wire the tutorial/forfeit contract (41)
before teaching UI (42, 46) and before the scripted match (45)**. Visual pickers (44)
should land before the tutorial so the scripted shop/target look like the real table.
Feedback (47) only needs HTTP + Postgres and can overlap 42–44.

1. **Protocol (Lot 41).** `PROTOCOL_VERSION` 28 → 29. `playKind`, `tutorialIndex`,
   `FORFEIT`, tutorial reject codes. Classic views default unchanged.
2. **How to play (Lot 42).** Soft gate, table help, Beta hub, screenshot slots.
3. **Readability (Lot 43).** Costs, labels, hand floor, Leave confirm + forfeit-stay.
4. **Pickers (Lot 44).** Shop-like prompts, including Mirror card art + seat color.
5. **Tutorial (Lot 45).** Setup overrides, script bot, spotlight, coach, kill.
6. **Hints (Lot 46).** First Classic match, skippable, still after tutorial.
7. **Feedback (Lot 47).** Postgres + `/api/feedback` + `/inbox`.
8. **Gate (Lot 48).** Playbooks + first-time browser playtest.
9. **Beta UI (Lot 51).** Primer rewrite, hub chrome, inspect restyle, table banners,
   Spy seat resources, opponent flyouts. Client presentation; no protocol bump.

**Execution order**

Follow the ID order when tasks share protocol or the table shell. Independent tasks may
run in parallel after their Depends-on line is `Done`.

**Complexity / risk**

Same scale as V5: S / M / L · Low / Medium / **High**. High means silent failure (tutorial
kills too early, seed in a feedback row, Classic deal mutated).

**References**

Technical spec v6 §N → `technical_spec_v6.md`. Rules → `spec_bataille_des_cartes_en.md`.
Engine / DoD → `technical_spec_v1.md`. Playbooks: `docs/agent/frontend.md`, `protocol.md`,
`db.md`, `bots.md`, `testing.md`.

**Scope lock**

- **No Classic rule or value change** unless the current session's developer instructions
  explicitly change one (Lot 50). Tutorial-only exceptions remain spec §5.3–§5.4.
- **No Team / God / Quick. No accounts. No French UI. No screenshot uploads.**
- **`PROTOCOL_VERSION` bumps exactly once**, in **L41-02**.
- **Do not edit `heuristic-v4` or its freeze test.**
- How to play **screenshots are designer-owned**. Missing files omit `<img>`; agents never
  invent art (spec §1, §5.1).
- Client still has **zero rule logic**. Spotlight is presentation; the server filters.

---

## Progress

42 of 58 tasks done. Spec written 2026-08-19. Lot 41 coding started 2026-08-20.

| Lot | Tasks | Done |
|---|---|---|
| 41 · Protocol + governance | 5 | 5 |
| 42 · How to play | 4 | 4 |
| 43 · Table readability | 6 | 6 |
| 44 · Visual pickers | 6 | 6 |
| 45 · Tutorial | 7 | 7 |
| 46 · First-game hints | 3 | 0 |
| 47 · Feedback + inbox | 5 | 0 |
| 48 · Docs + playtest | 2 | 0 |
| 49 · Lobby kit pick | 2 | 2 |
| 50 · Beta feedback | 9 | 9 |
| 51 · Beta UI feedback | 9 | 3 |

---

## Lot 41 — Protocol + governance

Nothing in Lots 45–46 may start before L41-03. L43-06 needs L41-02 types.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L41-01 | Append dated `[P]` entries to `docs/agent/decisions.md` copying technical spec v6 §2 (teaching layers, soft gate reopening 2026-08-07, screenshots, tutorial beats, 1-life + equal-Basic cancel, hints after tutorial, feedback shape, inbox, costs/pickers, English, Beta, Approach 1, Indestructible/Ghost inference). **Acceptance:** an agent reading only `decisions.md` + `AGENTS.md` can tell V6 is specified, Classic is frozen, and Lot 41 is the start. | S | Medium | — | Done |
| L41-02 | `PROTOCOL_VERSION` **28 → 29**. Add `playKind: 'classic' \| 'tutorial'` and `tutorialIndex: number \| null` to `PlayingStateView` and `FinishedStateView`; `RoomJoinOptions.tutorial?: true`; client message `FORFEIT`; `ActionRejectCode` `'tutorial-follow-coach'` and `'tutorial-room-closed'` + `ACTION_REJECT_MESSAGE`. Client copy map for the two codes. **Acceptance:** `pnpm verify` green; classic clients that still send v28 fail the existing mismatch path; exhaustive reject-code test includes the two new codes. **Watch point:** this is the **only** bump in V6. | M | **High** | L41-01 | Done |
| L41-03 | `build-view-for` emits `playKind: 'classic'` and `tutorialIndex: null` for existing rooms; never `seed`. Tests: classic view shape unchanged aside from the two new fields. **Acceptance:** a fixture playing view from a pre-V6 start includes the defaults; seed still absent. | M | **High** | L41-02 | Done |
| L41-04 | Migration `004_finished_games_tutorial.sql`: `finished_games.is_tutorial boolean NOT NULL DEFAULT false`. Persist sets it from `playKind`. Arena / balance readers ignore `is_tutorial = true` (document in `db.md` in L48; a unit test on the persist builder is enough here). **Acceptance:** classic persist writes `false`; column default does not break old rows. | S | Medium | L41-02 | Done |
| L41-05 | Room: reject `joinById` when the room is tutorial (`tutorial-room-closed`). `onCreate` stores `tutorial` from join options. **Acceptance:** second human cannot join a tutorial create; classic create/join unchanged. | S | Medium | L41-02 | Done |

---

## Lot 42 — How to play

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L42-01 | Rewrite `how-to-play-dialog.tsx` to spec §5.1 sections (goal, table, delay, turn, resources, hidden, shop, modes). Screenshot `<img>` only if the file exists under `apps/client/src/assets/how-to-play/` (exact names in spec §5.1). Existing resource icons allowed. **Acceptance:** Skip/Got it still close; no invented PNGs in the repo. **Watch point:** missing files must not break the build — optional imports or a manifest that skips absent paths. | M | Low | — | Done |
| L42-02 | Soft gate: first Play online / Play solo / Tutorial submit opens How to play if `localStorage['card-battle.v6.howToPlaySeen']` is unset. Skip and Got it both set the key and **then** continue the intended submit. Reset help on the hub clears How to play + hint keys. **Acceptance:** second visit does not auto-open; Reset help makes it open again. | M | Medium | L42-01 | Done |
| L42-03 | Table control (turn strip or economy) opens the same How to play Dialog. Does not gate actions. **Acceptance:** can open mid-game without sending an intent. | S | Low | L42-01 | Done |
| L42-04 | Hub chrome: visible **Beta** line (spec §5.1); idle hub must not alarm with “Not connected”; protocol version demoted to footer/tooltip. Tutorial button may be present but can no-op until L45-04 if labeled disabled — **prefer** wiring the click in L45-04 and showing the button here as disabled with “Coming in Tutorial lot” **forbidden**. Either hide Tutorial until L45-04 or ship L42-04 + L45-04 together. **Acceptance:** stranger-facing hub copy matches spec; no red idle error. | S | Low | — | Done |

---

## Lot 43 — Table readability

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L43-01 | Resource row: visible captions (Lives, Points, Upgrade points, Shield) next to icons — not `sr-only` / `title` only. **Acceptance:** captions present in the dock DOM (not only `title=`). | S | Low | — | Done |
| L43-02 | Shop Dialog (title **Shop**) swallows buy/sell upgrade points (`CostDisplay` of kit points cost/yield from `upgradePointBuyCost` / `upgradePointSellYield`), shared-card grid + Buy special, and pool. Dock economy is **Draw** + point `CostDisplay` + **Shop**. Card dialog Upgrade/Sell use `CostDisplay`. **No `UP` substring** in economy-bar / shop / those button labels (test). Payloads unchanged. **Acceptance:** grep/test on those components; play cost already on Use (L39-04) stays. | M | Low | — | Done |
| L43-03 | Copy: opponent unspied label **Hidden kit**; felt queue **Waiting on others**; shop blurb uses “double the play cost” + CostDisplay, not “base play cost”. **Acceptance:** strings updated; How to play §5.1 stays the longer explanation. **Watch point:** if `actionResolved` has no equal-cancel vs stronger-prevails discriminant, do **not** invent cancel-why copy (spec §12 #7) — stop and ask. | S | Low | — | Done |
| L43-04 | `CARD_BAND_ABS_MIN_W` pagination floor **48**. Update `card-band-fit` tests: a narrow width paginates rather than shrinking to 24. Wide dock still fits a full hand without a pager. **Acceptance:** unit tests on `fitCardBand`; browser check in L48. | M | Medium | — | Done |
| L43-05 | Turn strip: **?** (How to play) left, **flag** right. Dock is Draw + Shop (Stats when `readOnly`). Alive flag → Stay / Forfeit (“Leave the game? That counts as a forfeit.”). Spectator flag → Stay / Leave (“Leave the table?”). Esc / overlay = Stay. Finished inspect flag → Stay / Return home (designer 2026-08-21 follow-up; Game over Return home stays). **Acceptance:** first flag click does not disconnect. | S | Low | L43-02 | Done |
| L43-06 | Forfeit sends `FORFEIT` and **keeps the socket**. Server applies consented-leave elim without `leave` / live-socket reject. 2p → `phase: 'finished'` for the forfeiter. 3p+ spectator may `leaveGame()` whenever (designer override of spec §6.3). Game over Return home still `leaveGame()`. **Acceptance:** helper tests 2p sole survivor / 3p no survivor / already-elim no-op; client alive → forfeit, spectator → leaveGame, readOnly → returnHome / leaveGame. Do not build Feedback. | M | **High** | L41-02, L43-05 | Done |

---

## Lot 44 — Visual pickers

Same intents as today. Shop buy grid is the visual reference (do not regress it).

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L44-01 | Shared tiles: `SeatTile` (seat color, nickname, kit or hidden art) and `CardChoiceTile` (face art + name). Used by later tasks. **Acceptance:** Story-less unit render tests or table tests; tokens from existing seat colors. | M | Low | L39-03 (already Done) | Done |
| L44-02 | Replace target-player radios with `SeatTile` grid. **Acceptance:** `playCard` payload unchanged; 2p and 3p+ still target correctly. | M | Low | L44-01 | Done |
| L44-03 | Mirror sub-choice: pick pending attack as **card art + source name + seat color** (“→ you”), then `SeatTile` for the new target. **Acceptance:** `resolveSubChoice` `{ kind: 'mirror' }` unchanged; eligible ids only. | M | Medium | L44-01 | Done |
| L44-04 | Multi-attack prompt: attack **faces** + per-line `SeatTile`, not a raw list. **Acceptance:** `playMultipleAttacks` payload unchanged; Assassin only. | M | Medium | L44-02 | Done |
| L44-05 | Steal-pick, pool-pick, Transformer consume, special-pick: `CardChoiceTile` grids (backs only where the protocol already hides identity). **Acceptance:** payloads unchanged; unknown steal cards stay unknown. | M | Medium | L44-01 | Done |
| L44-06 | Elimination rewards, reanimation-kit, Regeneration quantity: visual rewards / kit portraits; Regen is four click-to-commit life buttons with live CostDisplay (designer 2026-08-24; not a numeric field). **Acceptance:** reward picks still opaque in the action log; quantity 1–4 validation unchanged (server). | M | Low | L44-01 | Done |

---

## Lot 45 — Tutorial

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L45-01 | `applyTutorialSetup` after Classic deal when `playKind === 'tutorial'`. Loadout **exactly** spec §5.3 (4-life seats, base Tax, one Basic, two Shields, no Absorber at deal, bot Ghost with Basic/Strong/Thief/Spy). **Acceptance:** fixed-seed classic start **without** the overlay is unchanged; Tax instance `isUpgraded === false`; simulator does not import setup. **Watch point:** Indestructible `alwaysUpgraded` still includes `tax` — force the instance, do not change the trait. | L | **High** | L41-03, L41-05 | Done |
| L45-02 | Policy `tutorial-script-v6` in the registry: view-only; map 2 Basic→human, 10 Spy→human, 16/28 Strong→human, 18 Thief→human, else Draw. Bot-driver short-circuits Easy/search/noise. No `botReason`. **Acceptance:** registry test; `heuristic-v4.freeze.test.ts` unmodified and green. | M | **High** | L32-02 (Done), L41-03 | Done |
| L45-03 | Room advances `tutorialIndex` per spec §5.4 (0–30); intersects `listLegalActions` with the script; `'tutorial-follow-coach'` otherwise. **Acceptance:** one test per index 0–30; after 3–4 bot `lives === 4`; after 17 human `lives === 1`; after 21 Tax granted **4** points; after 26 bot `lives === 1`; after 30 human winner; upgraded Basic is **not** legal at index 3; no `buyCard` of `basic-attack`. | L | **High** | L45-01, L45-02 | Done |
| L45-04 | Client `startTutorialGame`: `create({ tutorial: true })` then `startGame` (no `addBot`, no `chooseKit`), skip lobby like solo. Hub **Tutorial** nickname-only. Server auto-seats the scripted bot; reject `ADD_BOT`; no turn timer; Skip tutorial (not Forfeit) leaves to hub. **Acceptance:** one human + one bot; join by code rejected; solo/online unchanged. | M | Medium | L45-03, L42-02, L42-04 | Done |
| L45-05 | Coach overlay: client copy table spec §5.4 keyed by `tutorialIndex`; highlight the control (index 8 = opponent portrait); idle 20s title **Play**; illegal clicks do not send. Hide **Why** on the table log in **all** games. **Acceptance:** index 0 copy mentions Draw is points; index 1 and 21 mention 4 points; index 3 mentions equal cancel. | M | Low | L45-04 | Done |
| L45-06 | Finished `playKind === 'tutorial'`: Game over title **Tutorial complete**; CTA **Play a real game** → hub only. **Download action log** only when `import.meta.env.DEV`. Rewards skipped (existing 2p game-ending elim). **Acceptance:** unit on finished view title; Excel button absent unless DEV. | S | Low | L45-04, L41-03 | Done |
| L45-07 | Seeded integration: drive indices 0–30 to human win. Assert Spy visibility after 8; Spy counter; Shield sold; Absorber bought not dealt; UP bought; second Tax after Regen+Thief (+4); Super Regen from 1 life; Absorber after 4→1; Basic never bought; `lives <= lifeLimit`; human winner. **Acceptance:** one test file; no `Math.random()`. | M | **High** | L45-03 | Done |

---

## Lot 46 — First-game hints

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L46-01 | Hint overlay + `HintId` union from spec §5.2; `localStorage` `card-battle.v6.hints`; Got it / Skip all. **Does not run** when `playKind === 'tutorial'`. **Acceptance:** tutorial match shows coach, not these ids. | M | Low | L41-03, L43-01 | To do |
| L46-02 | Triggers: `your-turn`, `draw`, `resources` on first Classic dock; `incoming` on first real Incoming to POV (reuse `incoming-threat-diff.ts`, ignore presentation persistents); `hidden-kit`; `shop` when Buy enabled; `leave`. **Acceptance:** unit tests on trigger helpers; Incoming hint is not the persistent chip. | M | Medium | L46-01, L39-05 (Done) | To do |
| L46-03 | Completing tutorial does **not** set skipAll. Next Classic Solo/Online still shows hints. `resetHelpStorage` (L42-02 helper; hub Reset help removed in L51-03) still clears hint keys in tests. **Acceptance:** storage keys independent of tutorial completion. | S | Medium | L46-01, L45-04 | To do |

---

## Lot 47 — Feedback + inbox

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L47-01 | Migration `005_feedback_reports.sql` as spec §7.2 (no seed column). Types + insert helper, unit-tested. **Acceptance:** kind check constraint; insert of a report with `log_tail` and without `game_code`. | M | **High** | — | To do |
| L47-02 | Express `POST /api/feedback` mounted **before** static catch-all. CORS for the Vite origin in dev. Rate limit 10 / 10 min / IP. Unset `DATABASE_URL`: client-visible failure, **not** 200 OK. Never write `seed`. **Acceptance:** tests with mocked db; production-shaped 503 vs local message per spec §7.1. | M | **High** | L47-01 | To do |
| L47-03 | Feedback Dialog on Home, Table, Game over. Game over **asks** once per finished `gameCode` (Skip). Fields: kind, message, optional contact. Attach nickname, code, screen, protocol, playKind, log tail from view. **Acceptance:** Home submit works with no room; table submit includes log tail; no seed in the JSON body. Forfeit→recap→prompt is proven in L43-06 + L48-02. | M | Medium | L47-02 | To do |
| L47-04 | `GET /api/inbox` with `X-Inbox-Password` vs `INBOX_PASSWORD` (timing-safe). Missing env → 404. Wrong password → 401. | S | **High** | L47-01 | To do |
| L47-05 | SPA `/inbox`: list + kind filter + detail. Not linked from the hub. `App.tsx` pathname branch. **Acceptance:** player hub has no Inbox button; opening `/inbox` without password cannot read rows. | M | Medium | L47-04 | To do |

---

## Lot 48 — Docs + browser gate

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L48-01 | Update living docs in place: `frontend.md` (hub/table/inbox/tutorial/hints/forfeit), `protocol.md` (v29 fields, FORFEIT), `db.md` (feedback + `is_tutorial`), `bots.md` (`tutorial-script-v6`). **Acceptance:** playbooks match shipped behaviour; no second frontend playbook. | S | Low | L42–L47 as landed | To do |
| L48-02 | Post-lot-style **first-time player** browser gate (spec §10): soft gate, How to play, Tutorial full script to kill, first Classic hints after tutorial, forfeit → Game over → feedback, `/inbox` with password, phone-width hand pagination. Fix defects, re-verify, commit. Record room codes in `frontend.md`. **Acceptance:** designer or agent playtest notes in `frontend.md`; `pnpm verify` green. | L | Medium | all of 41–47 | To do |

---

## Lot 49 — Lobby kit pick (designer 2026-08-23)

Not in the original V6 spec. Optional Classic kit choice in the lobby; default stays
random. Hidden from opponents. `PROTOCOL_VERSION` 29 → 30 (exception to the V6
single-bump lock — see `decisions.md`).

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L49-01 | Protocol 29 → 30: client `chooseKit` `{ kitId: KitId \| 'random' }`; `LobbyStateView.yourKitSelection` per recipient only; reject codes `choose-kit-already-started` and `invalid-choose-kit-payload`. Room stores picks; `createInitialState` `forcedKitsBySeatId` for catalog picks; all-random omits the map. **Acceptance:** opponent lobby view JSON has no other seat's kit id; seeded all-random deals match the previous path. | M | **High** | L41-02 | Done |
| L49-02 | Lobby + solo **Choose kit** Dialog: Random tile + all 15 kit portraits; click opens description then Select. Same Dialog on the solo form; send `chooseKit` before `startGame` when not random. **Acceptance:** player list never shows another seat's kit; Random remains the default label. | M | Low | L49-01 | Done |

---

## Lot 50 — Beta feedback (designer 2026-08-24)

Designer playtest follow-up. Classic rule changes in this lot are **explicit session
instructions** (L50-01 exception). One commit per task. Do not edit `heuristic-v4` or
`score-play/`. No protocol bump.

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L50-01 | Governance: Classic rules stay frozen **unless the current session explicitly changes one**. Update `AGENTS.md` golden rules 6–7, technical spec v6 non-objectives, this file's Scope lock, and append `decisions.md`. **Acceptance:** an agent reading only those files sees the exception and still must not invent a rule. | S | Low | — | Done |
| L50-02 | Curse siphon: every life the cursed player actually loses is granted to the original caster (`grantLives`, `lifeLimit`). Upgrade 1 lost → 2 gained. Each copy pays. No siphon when the Curse sits on its original caster, or if that caster is missing/eliminated. Transfer and end-at-1-life stay. Store `originalCasterPlayerId` on the engine persistent; omit from `PersistentEffectView`. **Spend-tick restored in L50-09** (L50-02 had dropped it). **Acceptance:** tests for attack + Tax/Poison, shield absorb 0, stacks, self-holder skip, cap, transfer. | **L** | **High** | L50-01 | Done |
| L50-03 | In-game `playerReanimated` never includes `kitId` for any recipient. Copy is always `{nick} returns`. Excel export may still carry `kitId`. **Acceptance:** view + action-log tests; Spy/self no longer see the kit in the table log. | S | Low | — | Done |
| L50-04 | `score-engage` overlay only: Spy `-Infinity` vs upgraded public shield or known Spy/Thief immune; non-top-threat Spy drops to invest-band; held Reanimation bumped to `deny + 150` unless a finishable lethal attack is available. **Acceptance:** overlay tests; `heuristic-v4.freeze.test.ts` unmodified and green. Easy rooms stay v4. | M | Medium | — | Done |
| L50-05 | Card-band pager: `IconButton` chrome; lock row count against dock-height jitter; reserve pager height before fitting; `AnimatedCard` in the band skips entrance flip. **Acceptance:** `fitCardBand` tests: same width + shorter height does not change `pageSize` once paginating. | M | Medium | — | Done |
| L50-06 | Shop Dialog: Buy/Sell upgrade point call `onClose` after the intent (same as buy special/card). Grid selection stays open. **Acceptance:** handlers close; selecting a shop tile does not. | S | Low | — | Done |
| L50-07 | Action log lines, Incoming, and compact pending chips wrap and scroll — no `truncate` on those strings. Seat portrait nicks may stay truncated. **Acceptance:** a long nickname is fully readable by scrolling the log/incoming strip. | S | Low | — | Done |
| L50-08 | Card Transformer never yields `card-transformer` — random draw and upgraded `special-pick` eligible list both exclude it. Shop special purchase unchanged. **Acceptance:** base never grants it across a fixed seed sweep; upgraded pick of `card-transformer` rejects; eligible list length is 19. | S | Medium | L50-01 | Done |
| L50-09 | Curse correction: spend-tick **and** siphon. Victim still loses 1 life per 3 points spent (per 2 upgraded, `pointsSpent` only, remainder discarded, floor at 1). Those losses — and every other actual life loss — go to the original caster (`grantLives`, `lifeLimit`; upgraded ×2). **Acceptance:** 7 points → 2 lives lost + caster +2; theft does not tick; attack/Tax siphon tests stay. | M | **High** | L50-02 | Done |

---

## Lot 51 — Beta UI feedback (designer 2026-08-26)

Designer playtest follow-up. **No Classic rule or value change. No protocol bump.**
Client presentation + catalog `upgradeAdds` copy derived from existing `effect` /
`upgradeEffect`. One commit per task. Why stays hidden on the table (already L45-05).

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L51-01 | Governance: append `decisions.md`; rewrite technical spec v6 §5.1 to the first-time primer (no delayed resolution); add this lot; L46-03 no longer assumes a hub Reset help button. **Acceptance:** an agent reading only those files sees Lot 51 is client-only and the primer must-say is the locked bodies. | S | Low | — | Done |
| L51-02 | Rewrite `how-to-play-content.ts` to spec §5.1 (goal, turn, lives, points, cards, upgrade, kits, specials, shop). Screenshot slots only for existing filenames. Resource icons beside Lives / Points / Upgrade / Shield. **Acceptance:** tests assert the locked must-say; no “double”, “delayed”, or “not a card”. | M | Low | L51-01 | Done |
| L51-03 | Hub: drop protocol version (Home + Lobby), Reset help, delayed-resolution pitch, and the Beta paragraph. Small **Beta** card top-right, text Beta only. **Acceptance:** no `Protocol v` in hub/lobby DOM; no Reset help control. | S | Low | L51-01 | Done |
| L51-04 | Kit inspect: Draw + UP buy/sell as `CostDisplay`; starting hand = action/attack versos + counts; special thumbs show play-cost icons; restyle trait groups. **Acceptance:** no `N action · M attack` prose; costs are icons. | M | Low | L51-01 | To do |
| L51-05 | `Card.upgradeAdds` on every catalog row (derived deltas). `formatCardEffectText`: no `Cost:` prefix; non-upgraded = effect + Upgrade delta; upgraded = full `upgradeEffect`. Inspect dialogs use `CostDisplay`. **Acceptance:** catalog exhaustiveness; Basic non-upgraded does not repeat “Deal 3 damage to an opponent.” as the upgrade line. | M | Low | L51-01 | To do |
| L51-06 | Table banners: Your turn (existing); **You are being attacked** once per new attack-tone Incoming (flashier, red); **You are dead** on POV elim (flashier, red); **You won!** on POV win. Game over dialog still follows. **Acceptance:** unit on trigger helpers; won and dead never on the same seat. | M | Low | L51-01 | To do |
| L51-07 | Pending chips (Incoming + Waiting on others): tutorial callout chrome, no arrow; red = `threatToneFor` attack, orange = other real pending; persist until resolve. No ring on presentation persistents. Drop arrowed Incoming threat wrap. **Acceptance:** pending-queue test; tutorial coach arrows stay on scripted controls. | M | Low | L51-01 | To do |
| L51-08 | Opponent seat: live resource icons when upgraded Spy or death reveal; unspied and base Spy show the same icons with `?`. Wrap to a second line; drop shield on the seat only if still overflowing. Remove Hidden kit / Spied — tap / Revealed — tap. Spy dialog title is nickname only. **Acceptance:** unspied `?` never prints real totals. | M | Medium | L51-01 | To do |
| L51-09 | Opponent token flyouts from the seat to the action-log center. POV stays dock `ResourceIcon`. Unspied / base Spy: public log amounts only (`livesLost`, `shieldAbsorbed`, catalog play/buy/sell/upgrade). Skip Draw when kit Draw is hidden. Include life, point, upgrade-point, and shield chips. **Acceptance:** `measureTokenFlyout` accepts `playerId`; no invented Draw count. | M | Medium | L51-08 | To do |

---

## Task count and honest sizing

| Lot | Tasks |
|---|---|
| 41 | 5 |
| 42 | 4 |
| 43 | 6 |
| 44 | 6 |
| 45 | 7 |
| 46 | 3 |
| 47 | 5 |
| 48 | 2 |
| 49 | 2 |
| 50 | 9 |
| 51 | 9 |
| **Total** | **58** |

**Characteristic V6 failures (silent):** tutorial setup leaking into Classic deals; upgrading Basic before the counter so unequal damage lands; minting Tax+ via Indestructible `alwaysUpgraded` so the lesson is +6; `leaveGame()` on Forfeit so testers never see Game over; feedback 200 without a row; seed in `log_tail`; inventing How to play art; a second protocol bump.

**Designer-owned:** PNG files listed in technical spec v6 §5.1. L42-01 must ship without them. Drop files in `apps/client/src/assets/how-to-play/` anytime; no task id required for adding binaries if L42-01 already skips missing paths.

**L42-04 / L45-04:** do not show a dead Tutorial button. Hide it until L45-04, or land those two tasks in one pass (designer may allow a bundled commit for that pair only).
