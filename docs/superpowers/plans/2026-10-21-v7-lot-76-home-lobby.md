# V7 Lot 76 — Home and lobby: task briefs

> Implements `docs/technical_spec_v7.md` (read it first) for Lot 76; parity checklist `docs/technical_spec_v7_parity.md`. Tracker: `docs/backlog_v7.md`.
> **Brief plan.** Step-by-step TDD instructions (superpowers:writing-plans format) are written from these briefs just before the lot executes, once the interfaces of earlier lots exist.
> Each brief was drafted from the spec and the code on `dev` `1de498d`, then restructured by the 2026-10-21 backlog review; a **Review** line overrides the brief where they differ.

## Draft id → final id

Briefs below may cite other tasks by their draft id; use this table.

| Draft | Final |
|---|---|
| L76-01 | L76-01 |
| L76-02 | L76-02 |
| L76-03 | L76-03 |
| L76-04 | L76-04 |
| L76-05 | L76-05 |
| L76-06 | L76-06 |
| L76-07 | L76-07 |
| L76-08 | L76-08 |
| L76-09 | L76-09 |
| L76-10 | L76-10 |
| L76-11 | L76-11 |
| L76-12 | L76-12 |
| L76-13 | L76-13 |
| L76-14 | L76-14 |
| L76-15 | L76-15 |
| L76-16 | L76-16 |
| L76-17 | L76-17 |
| L76-19 | L76-18 |

Cross-lot moves: draft L73-01 → L72-03, L73-02 → L72-04, L73-03 → L73-01; draft L72-03 split into L72-06 (harness) and L72-07 (icons); draft L74-02 dropped (sheet stack is L72-09); draft L76-18 folded into the Lot 76 copy task; draft L81-02 folded into L81-01.

## Lot scope

Home, the three paths, How to play, What's new, Feedback, the lobby with house rules and chat, the kit picker, claim, invite link, and the Lot 76 copy rows. Runs in parallel with Lots 73–75 from Lot 72; never edits `screens/table/` or `screens/arena/`.

## L76-01 — Split Home into screens/home with behavior tests

**Cx / risk:** M / Medium · **Depends on:** Lot 72 · **Spec:** §4.2, §7.1, §12.1, §12.2
**Parity (Appendix A):** `home-hub`, `home-beta-badge`, `home-whats-new`, `home-whats-new-dismiss`, `home-whats-new-seen-storage`, `home-how-to-play-soft-gate`, `home-how-to-play-dismiss`, `home-feedback-dialog`, `global-feedback-entry-points`, `home-online-path`, `home-tutorial-path`, `home-solo-path`, `solo-menu-rules`, `home-forms-enter-submit`, `home-connection-status-and-errors`, `global-status-labels`, `global-visual-viewport-fit`, `legacy-inbox-redirect`
**Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/screens/home/`, `apps/client/src/screens/whats-new-dialog.test.ts`, `apps/client/src/feedback/feedback-surfaces.test.ts`, `apps/client/src/design/components/visual-viewport.test.ts`, `apps/client/src/admin/admin-route.test.ts`, `apps/client/src/help/tutorial-hints-independence.test.ts`, `docs/backlog_v7.md`, `docs/agent/frontend.md`

Move `screens/home.tsx` into `screens/home/` (screen, hub, path header, status block, nickname field, the three paths). Put the component-state logic the tests need into small pure helpers next to it: the soft-gate target, the What's new auto-open, and the solo rules + `includeTurnTime` state. No visual or behavior change. Five source-text tests read `home.tsx`: `whats-new-dialog`, `feedback-surfaces`, `visual-viewport`, `admin-route` and `tutorial-hints-independence`. Rewrite every Home assertion in them as a rendered-component test, using the testing-library + happy-dom setup from L72. Style-only lines (`bg-cta-red`, no `bg-cta-green`, `variant="green"`, near `absolute`) are pointed at the new files and retired in L76-04. The table, End and admin assertions in those files stay untouched (§12.1). Updates the L76 rows of the §12.1 classification table in `docs/backlog_v7.md` and the paths in the `frontend.md` Screens table.

**Acceptance:** Rendered tests prove each of these. The idle hub shows no status line and no `/admin`, `/inbox`, Inbox, `Protocol v` or Reset help. The first path click with unseen storage opens How to play. Every gated close (Skip, Got it, Esc, backdrop) marks seen and enters the chosen path. A manual Esc does not mark seen. What's new auto-opens on the latest entry only, New opens the full history, and the unread label and dot clear on any dismissal. Home Feedback opens manual with screen 'home'. Start tutorial never writes hints `skipAll`. Join is enabled only with a nickname and a 6-character uppercased code. A default Start solo sends 1 / normal / random / default rules with `includeTurnTime` false. `main` is the scroll container and nothing uses `100dvh`. The pure helpers have unit tests. No assertion is weakened, and the §12.1 rows are filled. `pnpm verify` green.

## L76-02 — Split the lobby into screens/lobby with behavior tests

**Cx / risk:** M / Medium · **Depends on:** Lot 72 · **Spec:** §4.2, §7.2, §12.1, §12.2, §15
**Parity (Appendix A):** `lobby-player-list`, `lobby-kick-confirm`, `lobby-host-seat-kick`, `lobby-your-kit`, `lobby-action-row`, `lobby-chat`, `lobby-kit-picker-dialog`, `global-feedback-entry-points`, `global-visual-viewport-fit`
**Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/lobby/`, `apps/client/src/screens/lobby-kick.test.ts`, `apps/client/src/screens/lobby-kit-privacy.test.ts`, `apps/client/src/screens/lobby-ready-mark.test.ts`, `apps/client/src/screens/lobby-ready.test.ts`, `apps/client/src/feedback/feedback-surfaces.test.ts`, `apps/client/src/design/components/visual-viewport.test.ts`, `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/App.tsx`, `docs/backlog_v7.md`, `docs/agent/frontend.md`

Move `screens/lobby.tsx` into `screens/lobby/`, with `lobby-ready.ts`, `lobby-ready-mark.tsx`, `lobby-kit-picker.ts` and their tests. Switch the lobby's ChatLog import and the kit picker's KitInspectDetails import to their L72 `ui/` rebuilds, never `screens/table/` (§4.2, §15). The layout does not change. Rewrite the lobby assertions of `lobby-kick`, `lobby-kit-privacy`, `lobby-ready-mark`, `lobby-ready` (wiring block), `feedback-surfaces` and `visual-viewport` as rendered tests on a fake `LobbyStateView`. Style-only lines (`w-6 shrink-0`, `text-cta-green-deep`, `text-cta-red`, the green/orange Ready variant expression) are pointed at the new files and retired in L76-12. Updates the §12.1 table rows and the `frontend.md` Screens table.

**Acceptance:** Rendered tests prove each of these. No seat renders a kit, and Your kit shows only `yourKitSelection`. Choose kit opens the picker. The host gets Kick on every other seat, bot and human, and it opens 'Kick this player?'. Only the confirm's Kick button calls `onKickPlayer(id)`; Cancel, Esc and backdrop send nothing, and no `onRemoveBot` prop exists. Each seat's ready mark comes before the nickname with the label Ready / Not ready. A human guest sees Ready (with the check icon) / Cancel ready, which call `onSetReady(!ready)`. The host's Start stays disabled until `lobbyStartEnabled`. Feedback opens with screen 'lobby', the game code and the nickname. The lobby scrolls inside `#root`, with no `100dvh`. The pure `lobby-ready` tests are unchanged. `pnpm verify` green.

## L76-03 — Fix the Lot 76 stale copy rows

**Cx / risk:** S / Low · **Depends on:** L76-01, L76-02 · **Spec:** §10, §10.1, §10.4
**Parity (Appendix A):** `home-how-to-play-dialog`, `lobby-your-kit`, `lobby-kit-picker-dialog`, `home-solo-kit-picker`, `home-online-path`
**Files:** `apps/client/src/screens/how-to-play-content.ts`, `apps/client/src/screens/how-to-play-content.test.ts`, `apps/client/src/screens/lobby/`, `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/screens/home/`, `packages/shared/src/release-notes.ts`, `apps/client/src/screens/whats-new-dialog.test.ts`, `docs/technical_spec_v6.md`, `docs/agent/decisions.md`

Apply the §10.1 rows that belong to Lot 76; Prophet is handled in L76-18. (1) How to play **Kits**: mention host exclusions and Random only (Lot 70). Use 'Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated. A basic Spy shows only your resources.' For Gambler: 'each Draw has a 1-in-10 chance to drop you to 1 life and lose everything (you are not eliminated)'. (2) Lobby **Your kit** card: the same Lot 69 wording. (3) `RandomKitDetails`: 'one of the allowed kits' plus the Lot 69 wording. (4) Online **Create** helper: mention that guests press Ready (L57). The proposed wording is the default, and the PR lists each before/after string for designer review (§10). Update `how-to-play-content.test.ts` and any other test that locks these strings. Update the `technical_spec_v6.md` §5.1 `kits` row, or replace it with a pointer to v7 §10.1. Append a `decisions.md` entry that supersedes that v6 copy (Q11 = B).

**Acceptance:** No 'Today' string from the Lot 76 §10.1 rows is left in `apps/client/src`, except Prophet. The How to play must-say facts still pass (Spy, Random, Gambler, 5–100, weighted, 3 specials, 1-in-10), and the never-say list still holds. The v6 §5.1 row and the decisions entry are written. A What's new item with After `Fixed some bugs.` is appended to the open V7 entry, and the release-note tests are updated. `pnpm verify` green.

**Review:** Also owns the Prophet trait row (folded from the former L76-18), at its post-move path in `view-model/`.

## L76-04 — Restyle the Home hub and path chrome

**Cx / risk:** M / Medium · **Depends on:** L76-01 · **Spec:** §5.1, §5.2, §5.3, §5.7, §7.1, §10.4, §11, §12.1
**Parity (Appendix A):** `home-hub`, `home-beta-badge`, `home-whats-new`, `home-path-header`, `home-connection-status-and-errors`, `home-forced-exit-landing`, `global-status-labels`, `global-motion-reduced-motion`, `global-art-catalog`, `global-dialog-button-primitives`
**Files:** `apps/client/src/screens/home/`, `apps/client/src/screens/whats-new-dialog.test.ts`, `packages/shared/src/release-notes.ts`, `docs/agent/decisions.md`, `docs/agent/frontend.md`, `DESIGN.md`

Build the hub from §7.1 on the V7 ground (§5.1–§5.3). A 'CARD BATTLE' wordmark (Lilita, arcade outline) sits over a slowly floating fan of holo cards (ui/ Card, existing art, aria-hidden, still under reduced motion). The **Beta** badge (the word only) and the small **New** control with its unread dot sit top-right; New is not a hub row button (L63-07). Three illustrated mode tiles, Solo / Online / Tutorial, use existing extracted art (§5.5); their labels keep the current wording unless the designer rules otherwise. Secondary **How to play** and **Feedback** buttons follow, and the eyebrow and helper copy stay. Restyle the path header (Back, Feedback, title, subtitle) and the status block. Idle stays unlabeled, the status copy comes from `homeStatusCopy`, and the role=alert error sits under the title. Mode transitions honor reduced motion. New is disabled while `soloLaunchPending` (§11, Q7/Q8). Retire the style-only What's new assertions with a `decisions.md` entry that cites §5.1/§7.1 and supersedes 'New is never disabled'. Update the `frontend.md` Home and What's new paragraphs, and `DESIGN.md` if any token is added. Open or append the V7 What's new entry.

**Acceptance:** Rendered tests prove each of these. The tiles open their paths through the soft gate. Every hub control and the path Back/Feedback buttons are disabled while busy. New is disabled during a solo launch and keeps its unread label. The card fan is aria-hidden and does not move under reduced motion. No Inbox, Admin, protocol or Reset help control appears. A browser check at 360×740 and 1440×900 shows no horizontal scroll, and the hub scrolls inside `#root`. `pnpm verify` green.

**Review:** Mode tiles keep the current labels "Play solo", "Play online", "Tutorial" (§10.6).

## L76-05 — Rebuild What's new as a V7 sheet

**Cx / risk:** S / Low · **Depends on:** L76-04 · **Spec:** §7.1, §7.7, §10.4, §12.1
**Parity (Appendix A):** `home-whats-new`, `home-whats-new-dismiss`, `home-whats-new-seen-storage`, `global-client-storage`, `global-card-face`
**Files:** `apps/client/src/screens/whats-new-dialog.tsx`, `apps/client/src/screens/whats-new-dialog.test.ts`, `docs/agent/frontend.md`

Replace `whats-new-dialog.tsx` with a V7 sheet (§7.1, §7.7). The auto-open shows only the latest entry. New opens the full dated history, newest first, with 'Latest' under the first title. Each entry keeps its date eyebrow and title, its Before/After items with a card thumb (ui/ Card, base art) or kit portrait, and the **New** additions block below the items. 'Got it' stays. Esc, backdrop, swipe-down and Got it all mark the latest id seen (L65-05). Rewrite the dialog half of `whats-new-dialog.test.ts` as rendered tests. The catalog assertions (latest id, item counts, dates) stay as data tests and change with each What's new append.

**Acceptance:** Rendered tests prove each of these. The current scope renders one entry, and the history scope renders every entry in catalog order with 'Latest' on the first. Items render above additions. Card or kit art is present when `cardId`/`kitId` is set. Every dismissal path calls the seen marker exactly once. `pnpm verify` green.

## L76-06 — Turn How to play into a swipeable card carousel

**Cx / risk:** M / Medium · **Depends on:** L76-03, L76-04 · **Spec:** §7.1, §5.6, §5.7, §12.2, §13
**Parity (Appendix A):** `home-how-to-play-dialog`, `home-how-to-play-soft-gate`, `home-how-to-play-dismiss`, `global-help-storage`, `global-dialog-interaction-contract`
**Files:** `apps/client/src/screens/how-to-play-dialog.tsx`, `apps/client/src/screens/how-to-play-dialog.test.tsx`, `docs/agent/frontend.md`

Rewrite `screens/how-to-play-dialog.tsx` in place. Keep the same export and `onClose(reason)` contract, so the table '?' and arena callers need no edit. Show one card per `HOW_TO_PLAY_SECTIONS` entry, in order. The copy stays verbatim, including the L76-03 Kits row, with resource icons inline (ui/ icons). Designer screenshots render only when the PNG exists. Pages change by swipe, keyboard or buttons, and the position is announced. Skip and Got it keep their meaning. In a gated open, any dismissal (Skip, Got it, Esc, backdrop, swipe-down) marks seen and continues to the chosen path. In a manual open, only Skip and Got it mark seen (§7.1). It never sends an intent. Update the `frontend.md` How to play paragraph.

**Acceptance:** Rendered tests prove each of these. Nine cards render in section order. Skip and Got it report 'skip' / 'got-it', and Esc / backdrop report 'dismiss'. The L76-01 gate tests stay green. Paging never closes the sheet. Reduced motion turns off the slide. No screenshot `<img>` renders without a file. `pnpm verify` green.

## L76-07 — Rebuild the Feedback sheet with a Sent confirmation

**Cx / risk:** M / Medium · **Depends on:** Lot 72 · **Spec:** §7.7, §5.2, §10.4, §10.6, §11, §12.1
**Parity (Appendix A):** `global-feedback-dialog`, `feedback-dialog-dismiss`, `home-feedback-dialog`, `global-feedback-entry-points`, `global-text-input-no-ios-zoom`, `global-dialog-interaction-contract`
**Files:** `apps/client/src/feedback/feedback-dialog.tsx`, `apps/client/src/feedback/feedback-dialog.test.ts`, `apps/client/src/ui/primitives/`, `packages/shared/src/release-notes.ts`, `docs/agent/frontend.md`, `DESIGN.md`

Rewrite `feedback/feedback-dialog.tsx` in place as a V7 sheet (§7.7). Keep the same export, props and `onDismiss('skip' | 'cancel' | 'sent')`, so the Lobby, table '!', arena and End callers need no edit. Kind (Bug / Confusion / Idea) becomes a real radio group (Q71), and the About chips keep `aria-pressed`. The message (4000) and Contact (optional) (200, autocomplete email) fields are 16 px through a shared text-field primitive: L72's if it ships one, else one added to `ui/primitives/` with DESIGN.md. Kind-based placeholders and hints stay, with Skip in ask mode and Cancel in manual mode. While sending, Esc, backdrop, swipe and Skip/Cancel are locked. A success shows a **Sent** confirmation, and closing it reports 'sent' once (Q6/Q68/Q69). The payload, in-flight gate, requestId guard, the 'bug needs at least one topic' rule and the error copy do not change. Rewrite `feedback-dialog.test.ts` as behavior tests, update the `frontend.md` Feedback paragraph, and add a What's new item.

**Acceptance:** Tests with a mocked `submitFeedback` prove each of these. A double click sends one POST. Send is disabled for an empty message, and for a bug with no topic (with the hint shown). Ask mode shows Skip and 'Skip is fine.'. Dismiss attempts while sending do nothing. A success shows Sent, and closing it reports 'sent' exactly once. A failure shows the server message and keeps the form. The payload never includes the seed and keeps today's fields. The End ask-once helper tests stay green. `pnpm verify` green.

**Review:** "Sent" closes by itself after ~1.5 s; a 15 s client timeout re-enables dismiss with an error (amended §7.7).

## L76-08 — Restyle the Online and Tutorial paths

**Cx / risk:** S / Low · **Depends on:** L76-03, L76-04, L76-07 · **Spec:** §7.1, §5.2
**Parity (Appendix A):** `home-online-path`, `home-tutorial-path`, `home-nickname`, `home-forms-enter-submit`, `home-connection-status-and-errors`, `global-text-input-no-ios-zoom`, `global-room-connection-lifecycle`
**Files:** `apps/client/src/screens/home/`, `docs/agent/frontend.md`

Online path (§7.1): the nickname field sits outside both forms, then Create, then Join with a large code field. The code field uppercases as typed, has maxLength 6, autocomplete and spellcheck off, and placeholder 'ABCDEF'; Enter submits Join only when Join is enabled. Tutorial path: nickname only, then 'Start tutorial'. Every input uses the 16 px text-field primitive. The copy stays, with the L76-03 Create helper. Busy locks the inputs and submits, and failures stay in the status block so the player can retry in place. Update the `frontend.md` Home paragraph.

**Acceptance:** Rendered tests prove each of these. Create needs a nickname. Join needs a nickname and a 6-character code. Enter in the Online nickname field does nothing, and Enter in the code field submits Join. Tutorial start calls `onStartTutorial` once and sends no rules or kit. Inputs are disabled while busy. The nickname survives switching paths. `pnpm verify` green.

**Review:** Connection errors stay inline status blocks, restyled (amended §7.7).

## L76-09 — Wire the rules strip and build the host editor

**Cx / risk:** M / High · **Depends on:** Lot 72, L76-01, L76-02 · **Spec:** §7.4, §7.1, §10.4, §10.6, §11, §13
**Parity (Appendix A):** `home-solo-table-rules`, `lobby-rules-summary`, `lobby-rules-host-dialog`, `lobby-rules-dialog-kit-guardrails`, `lobby-rules-dialog-live-apply`, `rules-turn-time-default-override`, `solo-menu-rules`, `solo-menu-rules-side-effects`, `global-art-catalog`
**Files:** `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/lobby/`, `apps/client/src/screens/home/`, `packages/shared/src/release-notes.ts`, `docs/agent/decisions.md`, `docs/agent/frontend.md`

Replace `screens/lobby-rules-panel.tsx` in the solo menu and the lobby with the §7.4 strip and sheet, built on the L72 read-only rules sheet. Everyone sees the strip: a clock with the seconds, the Random-only mark, and 16 kit faces. Each face's alt is the kit name, and excluded faces are greyed **plus** labeled 'Excluded', never by color alone. Guests and walk-ins tap the strip to open the read-only sheet (Q15). The host opens the editor in the same sheet. The turn slider (5–180) sends only on release, with the same `setLobbyRules` (Q4/Q18). The editor also has All / None / Random and 16 kit toggles. The last allowed kit is locked, with the existing reason 'At least one kit must stay allowed.'. None keeps the first Classic kit. Changes apply live, with no Save/Cancel. Kit and Random edits never carry `turnTimeSeconds`. If the effective seconds are out of range, the strip shows them while the slider sits at 180. In solo the rules are local: the strip and the readout show 'Server default' until the slider moves (Q3/Q31), and only a slider release sets `includeTurnTime`. The editor is disabled during a solo launch (Q8). The tutorial never shows rules. Add a `decisions.md` entry superseding the per-step sends and the host-only rules view (decisions 2026-10-06). Update the `frontend.md` Lot 70 lines and add a What's new item.

**Acceptance:** Tests prove each of these. A drag sends one `setLobbyRules` on release, with `turnTimeSeconds`. Kit, Random, All and None payloads never include it. The last allowed tile is disabled with its reason, and a null `toggleExcludedKit` sends nothing. None leaves only `KIT_IDS[0]`. Guests get the sheet with no editable control. An untouched solo menu shows 'Server default' and launches with `includeTurnTime` false, and a slider release flips it to true. An excluded solo pick resets to Random. Every excluded face has the label and a kit-name alt. `pnpm verify` green.

**Review:** Retitled: wire the lobby and Solo rules strip and build the **host editor** (slider on release, All / None / Random, kit toggles, last-kit lock, "Server default") on the shared `ui/rules` from Lot 72.

## L76-10 — Rebuild the kit picker sheet

**Cx / risk:** M / Medium · **Depends on:** Lot 72, L76-02, L76-03 · **Spec:** §7.3, §5.4, §5.5, §6.7, §11
**Parity (Appendix A):** `lobby-kit-picker-dialog`, `home-solo-kit-picker`, `lobby-your-kit`, `lobby-dialog-dismiss-map`, `lobby-rules-change-guest-effects`, `global-art-catalog`
**Files:** `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/screens/lobby/`, `apps/client/src/screens/home/`, `apps/client/src/ui/card/`, `docs/agent/decisions.md`, `docs/agent/frontend.md`, `DESIGN.md`

Replace `lobby-kit-picker-dialog.tsx` in the solo menu and the lobby with the §7.3 picker. The Random tile comes first, then every Classic kit in `LOBBY_KIT_PICKER_SELECTIONS` order. Each kit is a code-rendered tile with readable `KIT_CATALOG` stats: lives, points, upgrade points, Draw, and action / attack counts. Excluded kits stay visible, greyed with 'Excluded', and cannot be selected (Q23). The current pick is `aria-pressed`, and the Random tile copy reflects the allowed set (L76-03). Tapping a tile opens the kit sheet (ui/ KitInspectDetails, or `RandomKitDetails` for Random) with **Select this kit**, which turns disabled at once if that kit becomes excluded. Esc steps back one level. Selecting is the only commit: `chooseKit` in the lobby, local state in solo. Random only hides the picker, closing it if open, and shows a line that kits will be dealt (wording listed in the PR). The kit tile comes from `ui/`; if L72 has none, it is added to `ui/card/` with DESIGN.md. Add a decisions entry superseding 'only allowed kits are listed'.

**Acceptance:** Rendered tests prove each of these. All 16 kits plus Random are listed in order. An excluded kit is greyed and labeled, and it can never reach Select. Stats come from `KIT_CATALOG`. Select sends `chooseKit({ kitId })` / 'random' in the lobby and only sets local state in solo. Back, Esc and close never change the selection. Turning Random only on closes and hides the picker. `lobby-kit-picker.test.ts` stays green. `pnpm verify` green.

## L76-11 — Restyle the Solo path

**Cx / risk:** M / Medium · **Depends on:** L76-08, L76-09, L76-10 · **Spec:** §7.1, §11
**Parity (Appendix A):** `home-solo-path`, `solo-menu-rules`, `solo-menu-rules-side-effects`, `home-solo-play-again-seed`, `home-nickname`, `home-forms-enter-submit`, `global-room-connection-lifecycle`
**Files:** `apps/client/src/screens/home/`, `docs/agent/frontend.md`

Solo path per §7.1. Nickname first. Opponents, 1 to 7, are added as avatars around a mini table, with an accessible count control (radio or stepper semantics, default 1, Q7). Difficulty is a Segmented control Easy / Normal / Hard (radio semantics, default Normal, `formatBotDifficulty`). Next come the Your kit card (Random by default, hidden under Random only), the rules strip (L76-09), and **Start solo game**. These stay unchanged: the launch sequence, `soloLaunchPending`, Random only forcing 'random', and the Play again seed (kit, count, shared difficulty, rules, and `includeTurnTime` from the seed). Update `frontend.md`.

**Acceptance:** Rendered tests prove each of these. Count and difficulty expose their checked state to assistive tech and change by keyboard. Start calls `onStartSolo` with the chosen count, difficulty and kit (forced to 'random' under Random only), plus `{ lobbyRules, includeTurnTime }`. A seed opens the solo path pre-filled and is applied once. Every control is disabled while busy. `solo-menu-seed.test.ts` stays green. A browser check at 360×740 keeps Start reachable. `pnpm verify` green.

## L76-12 — Restyle the lobby around a mini arena

**Cx / risk:** L / Medium · **Depends on:** L76-02, L76-09, L76-10 · **Spec:** §7.2, §5.1, §5.3, §10.4, §11, §12.1
**Parity (Appendix A):** `lobby-header-status`, `lobby-game-code`, `lobby-your-kit`, `lobby-walk-in-notice`, `lobby-player-list`, `lobby-kick-confirm`, `lobby-add-bot`, `lobby-action-row`, `lobby-host-seat-kick`, `lobby-dialog-dismiss-map`, `global-feedback-entry-points`, `global-visual-viewport-fit`
**Files:** `apps/client/src/screens/lobby/`, `packages/shared/src/release-notes.ts`, `docs/agent/decisions.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

Lobby per §7.2 on the V7 ground. The top shows the status line (`STATUS_LABELS`), the big game code with **Copy** (the 'Code copied' / 'Copy failed' result dialog stays), and 'You are the host'. Then come the rules strip (L76-09), and either the Your kit card (L76-03 copy, L76-10 picker), the Random-only line, or the walk-in 'Watching the lobby' banner. Seats form a mini arena with seat colors (Q25). Each seat shows the ready check or cross before the nickname, '(you)', 'Host', and `BotSeatLabel` for every recipient, under the header 'Players (n/8)'; no seat ever shows a kit. The host gets per-bot difficulty, Add bot with its difficulty (disabled at 8 seats), and Kick on every other seat through the 'Kick this player?' confirm (`kickPlayer`, never `removeBot`). The action row has Start (grey until `lobbyStartEnabled`), Ready with its check / Cancel ready with their hints, the walk-in waiting copy, an immediate Leave, and Feedback. Retire the style-only ready-mark and Ready-variant assertions with a `decisions.md` entry citing §7.2/§5.1, superseding the L57-16 green/orange chrome. Rewrite the `frontend.md` Lobby paragraph and add a What's new item.

**Acceptance:** The L76-02 behavior tests stay green on the new layout. New tests prove each of these. Seat color follows `players` order. Add bot is disabled at 8 seats and sends the chosen difficulty. Per-bot difficulty sends `setBotDifficulty`. A copy failure shows the code in the dialog. A browser check with 2, 4 and 8 seats at 360×740 and 1440×900 keeps Start and Add bot reachable with no horizontal scroll. `pnpm verify` green.

## L76-13 — Add the lobby chat panel

**Cx / risk:** S / Low · **Depends on:** Lot 72, L76-12 · **Spec:** §7.5, §5.2, §10.6
**Parity (Appendix A):** `lobby-chat`, `lobby-chat-walk-in-spectator-stream`, `chat-compose-enter`, `chat-new-message-announcement`, `global-text-input-no-ios-zoom`
**Files:** `apps/client/src/screens/lobby/`, `docs/agent/frontend.md`

Chat panel under the seats (§7.5), built on the L72 `ui/` ChatLog and collapsible on phones. Enter and Send post `sendChat`. The input caps at `CHAT_BODY_MAX_LENGTH` (200) and is 16 px, and empty text is dropped. An empty transcript reads 'No messages yet.'. Each line shows its round label ('Lobby' / 'Round N') and the seat-colored nickname, and side-stream lines keep their role label. A walk-in's input is labeled 'Spectators only see this' (Q21). The client does no filtering; the server builds each recipient's stream. Update the `frontend.md` lobby chat lines.

**Acceptance:** Rendered tests prove each of these. Enter sends the trimmed body and resets the input. Whitespace sends nothing. The input caps at 200. The walk-in label shows only when `isSpectator`. Collapsing keeps the transcript. `pnpm verify` green.

## L76-14 — Make lobby errors dismissible and lock controls while reconnecting

**Cx / risk:** S / Medium · **Depends on:** L76-12 · **Spec:** §7.2, §4.1, §13
**Parity (Appendix A):** `lobby-inline-reject-alert`, `lobby-sticky-reject-alert`, `reject-state-carryover`, `lobby-header-status`
**Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/lobby/`, `docs/agent/decisions.md`, `docs/agent/frontend.md`

Per §7.2 (Q26, Q29). The lobby's inline role=alert reject gets a dismiss control that calls `clearActionReject`; App now passes it to LobbyScreen. App also clears the shared reject on every view phase change, so a lobby or End reject never opens on the next screen. While status is `reconnecting`, every lobby control that sends an intent is disabled: Start, Ready, Add bot, difficulty, Kick, Choose kit, the rules editor and chat Send. Leave, Copy/Share and Feedback stay live. The hook API is unchanged (§4.1). Add a `decisions.md` entry superseding the L39 carry-over across phase changes, and update the `frontend.md` connection conventions.

**Acceptance:** Tests prove each of these. Dismissing the alert calls `clearActionReject` once. A phase change from lobby to playing, or from finished to lobby, clears a stored reject. A state update within the same phase does not clear it. With status 'reconnecting', the listed controls are disabled and Leave is not. Table reject handling is unchanged. `pnpm verify` green.

## L76-15 — Toast guests when the host changes rules

**Cx / risk:** S / Low · **Depends on:** Lot 72, L76-12 · **Spec:** §7.4, §10.6, §13
**Parity (Appendix A):** `lobby-rules-change-guest-effects`
**Files:** `apps/client/src/screens/lobby/`, `docs/agent/frontend.md`

Client-only notices (§7.4, Q16/Q17), computed from two consecutive lobby views of the same room. A 'Rules changed' toast shows when `lobbyRules` differ. 'Your pick was reset to Random' shows when `yourKitSelection` went from a kit to 'random' because that kit was newly excluded. A pure diff helper next to the lobby carries the tests, and the toasts use ui/ Toast. No toast fires on the first lobby view or after a phase change, and the host gets neither. Ready state is untouched, and the server does not change.

**Acceptance:** Helper tests prove each of these. No notice fires on the first view, on unchanged rules, on the guest's own Random pick, or on a Random-only toggle that keeps the pick. 'Rules changed' fires for each field change. The reset notice fires only for a newly excluded pick. A component test shows the toast to a guest and not to the host. `pnpm verify` green.

## L76-16 — Restyle the claim sheet and add Claim a seat

**Cx / risk:** M / Medium · **Depends on:** Lot 72, L76-12 · **Spec:** §7.7, §7.2, §6.7, §10.6, §12.1
**Parity (Appendix A):** `claim-seat-dialog`, `global-claim-seat-overlay`, `claim-seat-dismiss-stay`, `lobby-walk-in-notice`, `global-dialog-interaction-contract`
**Files:** `apps/client/src/screens/claim-seat-dialog.tsx`, `apps/client/src/screens/claim-seat-dialog.test.ts`, `apps/client/src/App.tsx`, `apps/client/src/screens/lobby/`, `docs/agent/frontend.md`

Rebuild `screens/claim-seat-dialog.tsx` as a V7 sheet over Lobby, Table and End (§7.7, §6.7 stack contract). Seat rows show a seat-color dot, the nickname and the 'Host' tag, with `aria-pressed` and no nickname auto-match. The only listed seat is pre-selected. **Sit here** sends `claimSeat`, and the Stay button reads 'Keep this seat' or 'Stay spectating'. Esc, backdrop, swipe and Stay are the same action, and for a walk-in they send `staySpectating` (L57-16). App gains a reopen handler that clears the dismissed key and passes it to the lobby, where the walk-in banner shows **Claim a seat** while `claimableSeats` is non-empty (Q24); the arena wires the same handler in L74. Rewrite the dialog and App parts of `claim-seat-dialog.test.ts` as rendered tests; the table part stays untouched.

**Acceptance:** Rendered tests prove each of these. The copy 'Sit as a disconnected player?' and 'Nicknames are not unique…' is present. Two seats with the same nickname are both listed and neither is pre-selected. A single seat is pre-selected, and Sit here is enabled. Every dismissal path calls onStay once. A walk-in's Stay sends `staySpectating`, and a seated guest's sends nothing. Claim a seat reopens the picker for the same claimable set. The `claim-seat.ts` tests stay green. `pnpm verify` green.

## L76-17 — Add the invite link

**Cx / risk:** M / Low · **Depends on:** L76-08, L76-12 · **Spec:** §7.1, §7.2, §10.4, §13
**Parity (Appendix A):** `lobby-game-code`, `home-online-path`, `global-app-router`, `global-page-reload-recovery`
**Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/lobby/`, `apps/client/src/screens/home/`, `packages/shared/src/release-notes.ts`, `docs/agent/frontend.md`

Lobby: add **Share** next to Copy (§7.2, Q28). When `navigator.share` exists, Share uses the Web Share API with the link `{origin}/?code=XXXXXX`; a user cancel is silent. Otherwise it copies that link and shows a result dialog (wording listed in the PR). Home: a `?code=` URL parameter pre-fills the Join code, uppercased and capped at 6 characters, client only (§7.1). The nickname is still required, nothing joins automatically, and admin paths ignore the parameter. Pure link and parse helpers carry the tests. Update `frontend.md` (Lobby and Home) and add a What's new item.

**Acceptance:** Tests prove each of these. The link helper builds the root URL with the code. The parse helper uppercases, caps at 6 characters and ignores a missing parameter. Share calls `navigator.share` with the link when it exists and falls back to the clipboard otherwise, and both failure paths still show the code. Loading with `?code=` puts the code in Join, and Join stays disabled until a nickname is typed. `/admin?code=` is unaffected. `pnpm verify` green.

**Review:** `?code=` opens Home on the Online path with Join pre-filled (soft gate first) and is stripped from the URL; Share falls back to copying the link with a "Link copied" result.

## L76-18 — Run the Lot 76 browser and design gate

**Cx / risk:** M / Low · **Depends on:** L76-01…L76-17 · **Spec:** §12.3, §12.4, §12.5, §4.6
**Parity (Appendix A):** `home-hub`, `lobby-player-list`, `global-text-input-no-ios-zoom`, `global-visual-viewport-fit`, `global-motion-reduced-motion`, `claim-seat-dismiss-stay`
**Files:** `docs/agent/frontend.md`, `docs/backlog_v7.md`, `.impeccable/config.json`

Post-lot gate (§12.3, §12.4, AGENTS.md §9). Run a two-browser session over the lot's surfaces at 360×740, 375×812, 390×844, 844×390 and 1440×900. Cover: the hub; How to play, gated and manual; What's new, auto and history; Feedback through to Sent; Online create and join, including a `?code=` link; Solo with rules and a kit; Tutorial start. Also cover the lobby with 2, 4 and 8 seats as host, guest and walk-in: rules sheet, toasts, kit picker, chat, claim reopen, Kick and reconnect. Check that every focusable field computes to at least 16 px, and check reduced motion. Fix the Impeccable detector findings and record a `critique` of Home and the lobby. Add a 'Lot 76 verified' heading with room codes in `frontend.md`, and update the V6 first-time gate steps that V7 changed. Confirm that every old Home and lobby file is gone and the L76 §12.1 rows are Done.

**Acceptance:** Gate notes and room codes are recorded. Every defect is fixed, re-verified, and committed under its task id. `screens/home.tsx`, `lobby.tsx`, `lobby-rules-panel.tsx`, `lobby-kit-picker-dialog.tsx` and the old What's new and claim dialogs no longer exist. The design gate passes or is noted as not run per §12.4. `pnpm verify` green. The lot PR into `dev` is ready for review (§4.6).

_Draft id L76-19._

## Draft questions and their dispositions

Resolved in the 2026-10-21 backlog review unless listed under "Designer questions still open" in `docs/backlog_v7.md`; dispositions are recorded in the **Review** lines above and in the amended spec.

- Mode tile labels: §7.1 names the tiles Solo / Online / Tutorial, but §1 says existing labels keep their wording ('Play solo', 'Play online', 'Tutorial'). Which labels ship? The draft defaults to the existing ones.
- L72 boundary: does L72 (not L73) ship the `ui/` ChatLog, KitInspectDetails and the read-only rules sheet that L76-02/09/10/13 depend on? Does the rules sheet include the host editor mode? Does L72 ship a text-field primitive (16 px floor, not in the §4.2 list) and a kit tile, or does L76 add them (L76-07, L76-10)? Also, L76 imports `seat-colors` and `asset-lookup` from wherever they live when it merges, and whichever of L73/L76 lands second fixes the paths. Is that acceptable?
- Prophet copy (§10.1, Lot 76) lives in `screens/table/kit-inspect-traits.ts`, and its test is in `screens/table/kit-inspect-dialog.test.ts`, which L76 must not edit. The draft makes L76-18 wait for the L73 pure-module move. Alternatively, should L75 take this row?
- What's new: `lot-72` is promoted to `main` before L72 merges, so the first player-facing V7 PR opens a new entry. Which id and title should it use (for example `lot-76`, or one V7 entry shared by L74–L77 during the freeze)? And is one Before/After item per player-facing task right, or one 'Home and lobby' item extended task by task?
- §7.7 lists 'connection errors' among the bottom sheets / dialogs. Does that mean Home create, join, kick and reclaim failures move from the inline role=alert status block into a sheet? The draft keeps them inline (V7-styled), because §7.1 says nothing and the parity keep is 'retry in place'.
- Invite link: when Web Share is missing, Share copies the link. What should the result dialog say ('Link copied' is not in §10.6)? Should a `?code=` URL open Home directly on the Online path (soft gate still first), or stay on the hub with Join pre-filled? Should the parameter be stripped from the URL after reading? The draft pre-fills only and leaves the URL alone.
- Proposed copy for designer review. Online Create helper: 'Host gets a code to share. Start from the lobby once every guest is Ready.' First Kits sentence: 'In the lobby you may pick a kit or keep Random, unless the host excluded it or deals every kit at random.' Random-only line in place of Your kit: reuse the existing 'The host is dealing kits at random.' in the lobby, and what for solo, where you are the host?
- The kit picker lead 'Opponents cannot see your kit. Random is the default.' and the solo 'Hidden from opponents. Random is the default.' also predate Lot 69 but are not §10.1 rows. Keep them verbatim?
- Gambler kit tile: `KIT_CATALOG` says Draw 10, while the real Draw is 5–100 weighted (kit inspect shows 10 today). Should the §7.3 tile show the catalog 10 or '5–100'?
- Rules toasts (§7.4): walk-in lobby spectators also see the strip. Do they get 'Rules changed' too? The draft gives it to seated non-host guests only.
- Claim a seat (§7.2) is placed in the walk-in banner. A seated non-host guest who pressed 'Keep this seat' also cannot reopen the picker today. Should they get the control as well?
- Feedback 'Sent': does the confirmation close itself after a delay, or wait for the player? And since §7.7 locks dismissal while sending and `submitFeedback` has no client timeout, a hung request would trap the sheet. Add a timeout, or keep it?
- Reconnecting lobby (§7.2 'controls disabled'): the draft disables every intent-sending control and keeps Leave, Copy/Share and Feedback live. For the slider's 'send on release' with a keyboard, the draft commits on each value-changing key-up. Confirm both readings.

