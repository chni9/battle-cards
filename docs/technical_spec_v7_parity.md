# Technical spec v7 — Appendix A: UI parity inventory

> Companion to `docs/technical_spec_v7.md` §12. Generated on 2026-10-20 by a read-only, multi-agent audit of the client on `origin/dev` (commit `1de498d`), followed by a completeness-critic pass and gap fills.
> Every V7 lot uses the sections it touches as its **parity checklist**: each control, state and "keep" line below must still exist after the redesign, unless `technical_spec_v7.md` explicitly changes or retires it.
> This is audit evidence, not normative truth. Where it disagrees with the code, the code wins (AGENTS.md §2) — fix this file in the same change.
> `Lot 62+` marks surfaces introduced after Lot 61. "Keep" lines quote the behavior to preserve and, where known, the lot or decision that set it.

| Screen | Surfaces |
|---|---|
| Global (routing, connection, shared chrome) | 31 |
| Home and onboarding | 22 |
| Lobby | 20 |
| Table | 80 |
| Game over | 17 |
| Admin (/admin) | 28 |
| **Total** | **198** |


## Global (routing, connection, shared chrome)

### `global-app-router` — App phase and path router

- **Files:** `apps/client/src/App.tsx`, `apps/client/src/main.tsx`, `apps/client/index.html`, `apps/client/src/index.css`
- **Purpose:** Chooses the top-level surface from window.location.pathname and view.phase. Holds the nickname and join code for the whole session, connects every screen to the intents in useRoomConnection, and shows the claim-seat overlay.
- **Controls:**
  - No visible control of its own. Path rules: '/admin' and '/admin/*' render AdminApp with no Colyseus connection. '/inbox' and '/inbox/*' call window.location.replace('/admin/feedback'). Every other path renders GameApp.
  - Phase order: view.phase 'finished' renders EndScreen, 'playing' renders TableScreen, 'lobby' renders LobbyScreen unless soloLaunchPending is true, anything else renders HomeScreen.
  - Home callbacks: onCreate calls createGame(nickname). onJoin calls joinGame(joinCode, nickname). onStartSolo calls startSoloGame({nickname, opponentCount, difficulty, kitSelection, lobbyRules, includeTurnTime}). onStartTutorial calls startTutorialGame(nickname).
  - End onPlayAgain is given only for Classic games and only to a seat that is not a walk-in spectator. If soloMenuSeed(...) returns a seed, the app stores it in pendingSoloMenu, calls leaveGame(), and Home opens on the solo menu. Otherwise it sends the playAgain intent (lobby rematch).
  - onLeave on Lobby, Table and End calls leaveGame().
  - A 250 ms setInterval updates nowMs, which drives the Table and End timers.
- **States:**
  - Home is shown while status is connecting, and also while connected before the first STATE_UPDATE arrives (view is null).
  - Lobby is hidden while soloLaunchPending is true, so solo and tutorial never flash the lobby.
  - The claim-seat overlay can sit on top of Lobby, Table or End.
  - There is no 404 page. Unknown paths fall through to the game.
- **Keep:**
  - Solo and tutorial skip the Lobby flash through soloLaunchPending (L17-01).
  - /admin is handled before any game phase and opens no Colyseus socket. /inbox redirects to /admin/feedback (Lot 61, L61-06).
  - Nickname and join code live in App state. They survive Home remounts within a tab session, for example after Leave or a kick.
  - Table and End receive their statusLabel from STATUS_LABELS[status].
  - admin-route.test.ts checks the source text: App.tsx must contain "path.startsWith('/admin/')", "window.location.replace('/admin/feedback')" and '<AdminApp'. home.tsx must not contain '/admin' or '/inbox'.
- **Notes:** There is no router library and no deep link for a join code (for example ?code=). The document title is the static 'Card Battle'. Fonts are Outfit 400/600/700 from @fontsource. Tokens are light-only in index.css @theme; there is no dark mode. #root uses overflow hidden, so each screen must scroll inside itself (visual-viewport.test.ts).

### `global-room-connection-lifecycle` — Room connection lifecycle (before and while entering a room)

- **Files:** `apps/client/src/net/use-room-connection.ts`, `apps/client/src/net/resolve-server-url.ts`, `packages/shared/src/protocol/messages.ts`, `packages/shared/src/protocol/action-reject.ts`, `apps/server/src/rooms/game-room.ts`
- **Purpose:** Wraps the Colyseus client. Produces the status, error and soloLaunchPending values that Home shows, and sends the create, join, solo and tutorial launch sequences.
- **Controls:**
  - createGame: leaves any current room, clears the reconnect token, sets status connecting, then client.create(GAME_ROOM_NAME, {protocolVersion: PROTOCOL_VERSION, nickname: nickname.trim()}).
  - joinGame: client.joinById(code.trim().toUpperCase(), same options).
  - startSoloGame: create, then send SET_LOBBY_RULES {excludedKitIds, randomOnly, and turnTimeSeconds only when includeTurnTime is true}. Then CHOOSE_KIT {kitId} when randomOnly is false and the pick is not random. Then ADD_BOT {difficulty} once per opponent, then START_GAME.
  - startTutorialGame: create with tutorial: true, then START_GAME. No addBot, no chooseKit, no rules.
  - CLIENT_READY is sent on attach and again after a reconnect.
  - leaveGame: turns off reconnection, room.leave(true), resets to INITIAL (idle).
- **States:**
  - idle: nothing in progress.
  - connecting: a create, join, solo or tutorial request is in flight.
  - connected: the socket is attached. On Home this shows briefly as 'Connected' until the first view arrives.
  - reconnecting: the socket dropped. Automatic retries: maxRetries 120, minDelay 500 ms, maxDelay 5 s. After that, one manual reconnect with the sessionStorage token.
  - disconnected after a kick: the view is cleared and the error is 'You were kicked.'.
  - disconnected after reconnects run out: the error is the close reason or the reconnect error.
  - failed: create or join threw. The error is error.message, or 'Could not reach the server' when the error is not an Error.
  - failed during a solo or tutorial launch: an ERROR_MESSAGE arrived while soloLaunchPending was true. The client leaves the room and sets failed with that server message.
  - Server join rejections that reach Home as text: 'Protocol version mismatch: the server speaks vNN, this client sent vMM. Reload the page.', 'This tutorial cannot be joined.', 'A nickname is required to join.', 'This table is full.', 'This table has no more spectator space.', and the Colyseus room-not-found message.
  - soloLaunchPending stays true from the solo or tutorial click until the first STATE_UPDATE with phase 'playing'.
- **Keep:**
  - Solo is create, then setLobbyRules, then chooseKit when needed, then N times addBot, then startGame (L17-01, Lot 70).
  - When the solo slider was never moved, no turnTimeSeconds is sent, so the server keeps TURN_DURATION_MS (decisions 2026-10-06 Lot 70).
  - A kicked player lands on Home with the error shown and can join again with the same code (L57).
  - The reconnect token is kept in sessionStorage['card-battle:reconnection-token'] but is read only after a socket drop. Reloading the page during a game returns to Home.
  - The inline error clears on the next STATE_UPDATE unless an actionReject is still open.
- **Notes:** The SET_LOBBY_RULES step of the solo launch is Lot 70 (PROTOCOL_VERSION 45). Every other part of this flow comes from Lot 61 or earlier. The redesign must not change this sequence.

### `global-status-labels` — Connection status labels

- **Files:** `apps/client/src/screens/status-labels.ts`, `apps/client/src/screens/home.tsx`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/table/timers.tsx`, `apps/client/src/App.tsx`
- **Purpose:** The shared copy for connection status. Home uses a softened version.
- **Controls:**
  - None.
- **States:**
  - Home while idle: no status line. Elsewhere STATUS_LABELS.idle is 'Not connected', which in practice never shows.
  - connecting: 'Connecting…'.
  - connected: 'Connected'.
  - reconnecting: 'Reconnecting…'.
  - disconnected: 'Disconnected'.
  - failed: 'Could not join'.
  - While soloLaunchPending is true, Home shows 'Starting solo game…' instead. This copy also appears during a tutorial launch.
  - The error line sits under the status line on the hub and on every path header, as red text with role=alert.
  - The lobby shows STATUS_LABELS under its title. The table shows 'Code XXXXXX · {status}' in Timers.
- **Keep:**
  - The idle hub must not alarm and must not show 'Not connected' (L42-04, technical spec v6 §5.1, status-labels.test.ts).
  - Connecting, error-path and solo-launch copy stays (status-labels.test.ts).
  - The error stays visible on the hub and the paths until the next connection attempt replaces it.
- **Notes:** Spec v6 §5.1 allows the idle state to be unlabeled or to say 'Ready'. The code leaves it unlabeled.

### `global-connection-badge` — Seat connection and elimination badge

- **Files:** `apps/client/src/design/components/connection-badge.tsx`, `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/screens/table/opponent-zone.tsx`, `apps/server/src/engine/lifecycle/constants.ts`
- **Purpose:** A small uppercase badge next to a seat's nickname that shows elimination or a lifecycle problem.
- **Controls:**
  - None. Display only.
- **States:**
  - 'eliminated': dark tone (bg-ink/80).
  - 'disconnected — grace': slate tone.
  - 'absent N/3': slate tone, N is connection.automaticTurnsTaken.
  - 'idle timeouts N/5': slate tone, N is consecutiveTimeouts.
  - No badge when the seat is connected and has 0 timeouts.
- **Keep:**
  - The thresholds match server ABSENT_AUTO_TURN_LIMIT = 3 and CONNECTED_TIMEOUT_LIMIT = 5 (L10-04, frontend.md degraded states).
  - The badge appears only on table seat zones: own private zone and opponent zones. It is not shown on Home, Lobby or End (frontend.md Lot 12: 'No connection badges on End').
- **Notes:** The 3 and 5 are hardcoded in the client copy. The server constants are not shared. Listed here because it was assigned; it does not appear before a room exists.

### `global-client-storage` — Client storage keys and soft gates

- **Files:** `apps/client/src/help/help-storage.ts`, `apps/client/src/help/release-storage.ts`, `apps/client/src/feedback/asked-storage.ts`, `apps/client/src/inbox/password-storage.ts`, `apps/client/src/net/use-room-connection.ts`
- **Purpose:** Remembers per browser, with no accounts, which teaching and feedback prompts this player has already seen.
- **Controls:**
  - None directly. Testers reset by clearing the keys by hand.
- **States:**
  - localStorage 'card-battle.v6.howToPlaySeen' = '1': the How to play soft gate is passed.
  - localStorage 'card-battle.v6.lastSeenReleaseId' = release id: drives the What's new auto-open and unread dot.
  - localStorage 'card-battle.v6.hints' = JSON {dismissed, skipAll}: first-game hints on the table.
  - localStorage 'card-battle.v6.feedbackAsked.<gameCode>' = '1': Game over asks for feedback once per game.
  - sessionStorage 'card-battle:reconnection-token': the Colyseus token, read only after a drop.
  - sessionStorage 'card-battle.v6.inboxPassword': the /admin password.
  - Storage unavailable: every read falls back (unseen, unread, empty hints) and writes are skipped.
- **Keep:**
  - There are no accounts and no server-side preference (spec v6, L63-07).
  - Every access is wrapped in try/catch so a private window still works.
  - resetHelpStorage clears only howToPlaySeen and hints, and is for tests only. There is no hub control (L51-03).
  - Completing the tutorial never writes skipAll (L46-03).
- **Notes:** lastSeenReleaseId is new in Lot 63 (L63-07). The other keys are Lot 42 to Lot 47. The reconnect token key uses ':' rather than the 'v6.' namespace.

### `global-claim-seat-overlay` — Claim-seat picker (reached through Join with code)

- **Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/claim-seat-dialog.tsx`, `apps/client/src/screens/claim-seat.ts`
- **Purpose:** After joining by code, lets a player take over a disconnected living seat or keep watching.
- **Controls:**
  - Seat list buttons (aria-pressed), each with a seat-color dot, the nickname and a 'Host' tag when relevant. A click selects that seat.
  - 'Sit here' (green). Disabled until a seat is selected; when only one seat is listed it is selected automatically. Sends claimSeat(playerId).
  - Stay button (orange): 'Keep this seat' for a seated lobby guest, or 'Stay spectating' for a walk-in. For a walk-in it sends staySpectating. In both cases the picker is dismissed for the current set of claimable seats.
  - Esc and overlay click act as Stay.
- **States:**
  - Shown when claimableSeats is non-empty and the viewer is either a spectator or a non-host seat in the lobby.
  - Never shown to the host or to seated humans during play.
  - Shows again when the set of claimable seats changes.
- **Keep:**
  - No automatic nickname match. Copy: 'Sit as a disconnected player?' and 'Nicknames are not unique. Pick the seat by color, or keep watching.' (L57-13).
  - A walk-in sees no kits (Spy overlay withheld) until they press Stay or the picker empties (L57-16, PROTOCOL 33).
- **Notes:** Wired in App.tsx and drawn over Lobby, Table and End. Probably also covered by the lobby and table inventories.

### `global-dialog-button-primitives` — Dialog, Button and IconButton primitives used by Home

- **Files:** `apps/client/src/design/components/dialog.tsx`, `apps/client/src/design/components/button.tsx`, `apps/client/src/design/components/icon-button.tsx`, `apps/client/src/design/components/kit-portrait.tsx`
- **Purpose:** The shared interaction rules that every Home dialog and control inherits.
- **Controls:**
  - Dialog: Esc closes (document keydown), overlay click closes unless closeOnOverlayClick is false, Tab and Shift+Tab are trapped, focus goes to the first focusable on open and returns to the previous element on close.
  - Button: variants green, orange, red, purple, yellow. compact drops the 7rem minimum width. Disabled is 45% opacity with a not-allowed cursor.
  - IconButton: 44 px target with a required aria-label.
  - KitPortrait: uses the placeholder art when kitId is null; becomes a button when onClick is set.
- **States:**
  - The Dialog enter and exit animation is skipped under prefers-reduced-motion.
  - The overlay is sized to window.visualViewport, items-start, with the panel my-auto and max-h-full.
- **Keep:**
  - Every Dialog keeps role='dialog', aria-modal and a labelled title (spec v2 §5, L11-03).
  - The overlay follows visualViewport, not 100dvh or fixed inset-0, and never uses items-center, so the title is not clipped on phones (L53-02 / L53-07).
  - panelClassName max-w becomes max-w-[min(<abs>,100%)].
  - Color is the semantic signal: green confirms, orange is secondary, red is leave.
- **Notes:** Listed so the redesign keeps keyboard, focus and phone behavior in every Home dialog (How to play, What's new, Feedback, Table rules, Choose kit, Claim).

### `claim-seat-dialog` — Sit as a disconnected player? (claim-seat picker)

- **Files:** `apps/client/src/screens/claim-seat-dialog.tsx`, `apps/client/src/screens/claim-seat.ts`, `apps/client/src/App.tsx`, `apps/server/src/rooms/claim-seat-rules.ts`, `apps/server/src/rooms/game-room.ts`
- **Purpose:** Let a walk-in spectator, or a lobby guest who rejoined on a new socket, take over a reserved disconnected seat.
- **Controls:**
  - Seat buttons: color dot (seat index in view.players), nickname, 'Host' tag on the lobby host seat. aria-pressed marks the selected seat
  - Sit here (green): sends claimSeat { playerId }. Disabled until a seat is selected; a single listed seat is pre-selected
  - Stay button: 'Keep this seat' (seated lobby guest) or 'Stay spectating' (walk-in). Walk-ins also send staySpectating; both dismiss locally for the current claimable set
  - Esc or overlay: same as Stay
- **States:**
  - shown when shouldShowClaimPicker: there are claimable seats, and the viewer is a walk-in spectator (any phase) or a non-host seated guest in the lobby; never the host; never a living seated player during play
  - dismissed: stays hidden until the claimable set changes (claimDismissedKey); there is no control to reopen it
  - copy: 'Nicknames are not unique. Pick the seat by color, or keep watching.'
  - rejects: claim-not-claimable, claim-unknown, invalid-claim-payload
  - claiming in the lobby unseats the requester's current seat; the claimant becomes that seat id (inherits host status and that seat's hidden kit pick) and is set unready
- **Keep:**
  - Nickname plus seat color, no auto-match (L57-13; claim-seat-dialog.test.ts checks no toLowerCase)
  - Only listed seat pre-selected so Sit here is enabled (L57-15)
  - Seated living players never see the picker during play, so host Draw stays reachable (L57-13)
  - Walk-in Stay sends staySpectating so the Spy overlay unfogs (L57-16)

### `global-motion-reduced-motion` — Motion timing tokens + reduced-motion policy

- **Files:** `apps/client/src/fx/motion-timing.ts`, `apps/client/src/index.css`, `apps/client/src/design/components/dialog.tsx`, `apps/client/src/design/components/animated-card.tsx`, `apps/client/src/fx/table-fx-overlay.tsx`, `apps/client/src/screens/table.tsx`
- **Purpose:** Shared durations and easing for every motion, plus the prefers-reduced-motion behavior.
- **Controls:**
  - No in-app toggle. Reduced motion follows the OS setting via motion/react useReducedMotion and CSS @media (prefers-reduced-motion: reduce)
- **States:**
  - Tokens: MOTION_DURATION_S 0.55, MOTION_PULSE_S 0.45, RESOURCE_FLASH_MS 900, MOTION_STAGGER_S 0.08, TOKEN_FLYOUT_DURATION_S 0.6, TOKEN_STAGGER_MS 35, MAX_POINT_FLYOUTS 50, MOTION_EASE [0.16,1,0.3,1], FLYOUT_TRAVEL_EASE [0.42,0,0.58,1], FX_TTL_MS 1100, THREAT_FX_TTL_MS 3800, THREAT_OUTLINE_DURATION_S 3.2
  - Skipped under reduced motion: token chips and card ghosts, playFlyout images, ResourceIcon floats and pulse, the AnimatedCard entrance and upgrade flip, the Dialog fade/scale, the timer bar transition and the Draw pulse
  - Shortened or static under reduced motion: threat outline and cue (0.35s fade), resolution, elimination and reward overlays (no motion), tutorial callouts (static double ring, no ping, no arrow bob), coach panel (no enter animation)
- **Keep:**
  - FX_TTL_MS must stay above TOKEN_FLYOUT_DURATION_S × 1000 (motion-timing.ts comment)
  - Never gate an intent on a duration (Lot 14)
  - AnimatedCard never starts at opacity 0 (Lot 39 HMR fix)

### `global-help-storage` — Teaching storage keys (hints, How to play seen)

- **Files:** `apps/client/src/help/help-storage.ts`
- **Purpose:** Per-browser persistence for first-game hint dismissals and the How to play soft gate.
- **Controls:**
  - No UI control. resetHelpStorage() is tests-only (the hub Reset help control was removed in L51-03)
- **States:**
  - localStorage['card-battle.v6.hints'] = JSON {dismissed: HintId[], skipAll: boolean}. Unknown ids are filtered; bad JSON → empty state
  - localStorage['card-battle.v6.howToPlaySeen'] = '1' after Skip or Got it on How to play
  - Storage unavailable (private mode or throwing accessor): reads return the empty state, writes are no-ops
- **Keep:**
  - Key names are fixed. Designer retests clear these two keys by hand (frontend.md V6 first-time gate)
  - No accounts; per-browser only
- **Notes:** Hub gating that consumes howToPlaySeen belongs to the home surface.

### `global-feedback-dialog` — Feedback dialog (manual and ask mode)

- **Files:** `apps/client/src/feedback/feedback-dialog.tsx`, `apps/client/src/feedback/feedback-form-copy.ts`, `apps/client/src/feedback/submit-gate.ts`, `apps/client/src/feedback/build-feedback-payload.ts`, `apps/client/src/feedback/submit-feedback.ts`, `apps/client/src/feedback/feedback-dialog.test.ts`, `apps/client/src/feedback/feedback-form-copy.test.ts`, `packages/shared/src/feedback/report.ts`, `apps/server/src/http/feedback-http.ts`
- **Purpose:** The single tester ticket. It POSTs to /api/feedback over HTTP and needs no Colyseus room.
- **Controls:**
  - Kind: three buttons 'Bug' / 'Confusion' / 'Idea' (single select, the selected one is green, default Bug).
  - About chips: 'UI', 'Gameplay', 'Card', 'Shop', 'Bot', 'Tutorial', 'Other'. Multi-select toggles with aria-pressed (green when selected), via toggleFeedbackTopic, kept in catalog order.
  - Message textarea (maxLength 4000). Placeholder follows kind: 'What happened, and what did you expect?' / 'What was unclear?' / 'What would you add or change?'.
  - 'Contact (optional)' input (maxLength 200, autoComplete email).
  - 'Skip' (ask mode) or 'Cancel' (manual), orange, disabled while busy.
  - 'Send', green, label 'Sending…' while busy, disabled unless canSendFeedbackForm.
  - Esc / overlay dismisses as skip (ask) or cancel (manual). It is not gated by busy.
- **States:**
  - Title is always 'Feedback'. Ask mode adds the lead 'Skip is fine.'.
  - About hint per kind: bug 'Tap every area it touches — you can pick several.'; confusion 'Where was it unclear? Optional.'; idea 'What would this change? Optional.'.
  - Send hint (red, role=status) 'Pick at least one area to send a bug.' appears when kind is bug, no topic is picked, and the message is not empty.
  - Send is disabled when busy, when the message is empty or whitespace, or for a bug with no topic.
  - Errors (red, role=alert) show the server message: 'Could not save — try again' (503 / network / fallback), 'Not saved (no database)' (local without DATABASE_URL), 'Too many reports' (429, 10 per 10 min per IP), 'Invalid feedback' (400).
  - Success: the dialog closes at once with reason 'sent'. There is no confirmation toast.
  - The form resets on every dismiss (the draft is lost). Topics persist across kind switches while it is open.
- **Keep:**
  - A synchronous in-flight gate is claimed before the POST, so a double click cannot insert two rows (submit-gate.ts, L47-03, locked by feedback-dialog.test.ts).
  - A late response after dismiss is ignored (requestId).
  - Ask mode is the same Lot 47 ticket as manual (Kind / About / message / optional contact). Skip replaces Cancel (L57-05, supersedes the L57-02 one-sentence stub).
  - A bug needs at least 1 topic. Confusion and idea may send none (shared isFeedbackTopicsComplete; the server rejects it with 400) (L47-06).
  - Payload: kind, trimmed message, screen, protocolVersion, topics, plus optional contact (only when the trimmed value is non-empty), nickname, gameCode, playKind, and logTail = the last 30 public actionLog entries. The seed is never sent (build-feedback-payload.ts, technical spec v6 §7.1).
  - The server stores the user_agent and may enrich gameCode / playKind / logTail from the room (feedback-http.ts).
  - The dialog never calls leaveGame. The parent decides via onDismiss(reason).
  - No rating, screenshot, or Slack / mail ping (L57-01 / §11).
- **Notes:** The Kind buttons carry no aria-pressed. Only the About chips do.

### `global-feedback-entry-points` — Feedback entry points and context wiring

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/end.tsx`, `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/feedback/feedback-surfaces.test.ts`
- **Purpose:** Where the Feedback form opens and which context each place attaches.
- **Controls:**
  - Home: the hub 'Feedback' control next to How to play, plus the Online / Solo / Tutorial path headers. Manual mode, screen 'home', nickname taken from the nickname input, no gameCode and no logTail.
  - Lobby: 'Feedback' button. Manual mode, screen 'lobby', gameCode, nickname. No playKind or actionLog.
  - Live table: turn-strip `!`. TableScreen owns its own manual dialog: screen 'table' or 'tutorial', gameCode, playKind, the view actionLog, and nickname.
  - Finished board: the `!` and the Game over 'Feedback' button both route to EndScreen's dialog (screen 'end', finalTable.actionLog, nickname from view.players).
- **States:**
  - Spectators and walk-ins on the finished board: nickname is omitted when view.you is not among view.players.
- **Keep:**
  - Feedback is wired on Home, Lobby, Table and Game over (feedback-surfaces.test.ts).
  - The table control is the `!` IconButton with aria-label Feedback, not the word (L57-01).
  - The economy bar never shows Feedback (feedback-surfaces.test.ts).
  - There is no Inbox or Admin link on the hub (screens/home.admin-route.test.ts, split from admin-route.test.ts in L72-02; L47-05 / L61-06).
- **Notes:** Home, Lobby and Table chrome belong to other auditors. Only the Feedback wiring is listed here.

### `legacy-inbox-redirect` — Legacy /inbox redirect

- **Files:** `apps/client/src/App.tsx`, `apps/client/src/inbox/inbox-route.test.ts`, `apps/client/src/admin/admin-route.test.ts`
- **Purpose:** Old designer URL forwards to the admin feedback tab.
- **Controls:**
  - /inbox or /inbox/* runs window.location.replace('/admin/feedback'), which adds no history entry and renders nothing.
- **States:**
  - The legacy screens/inbox.tsx (InboxScreen, with its own password form, kind and topic filters and no triage) was deleted in L80-09. Nothing renders at /inbox.
- **Keep:**
  - The redirect stays (L61-06 / L61-09, locked by inbox-route.test.ts and admin-route.test.ts).
  - GET /api/inbox stays the backend for the Feedback tab.
- **Notes:** At the 1de498d audit inbox.tsx was dead code; frontend.md now records it as gone (L80-09).

### `rules-turn-time-default-override` — Human turn time: server default until the host moves the slider (lobby and solo) · `Lot 62+`

- **Files:** `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/home.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/client/src/screens/solo-menu-seed.ts`, `apps/client/src/App.tsx`, `apps/server/src/rooms/game-room.ts`, `apps/server/src/rooms/lobby-rules.ts`, `packages/shared/src/protocol/lobby-rules.ts`, `docs/agent/frontend.md`, `docs/agent/protocol.md`, `docs/agent/decisions.md`
- **Purpose:** Controls when a turnTimeSeconds value reaches the server. An untouched slider sends none, so TURN_DURATION_MS (env, minimum 5000, default 60000) stays in force. The view's turnTimeSeconds is always the effective rounded seconds.
- **Controls:**
  - Turn slider in the Table rules dialog: input type=range, min 5, max 180, step 1, aria-label 'Human turn seconds', label 'Human turn' with clock icon and an 'Ns' readout. onChange -> onTurnTimeChange(next) only when isTurnTimeSeconds(next).
  - Online lobby: each onChange step sends setLobbyRules { excludedKitIds, randomOnly, turnTimeSeconds } right away (lobby.tsx:138-144). There is no debounce or commit-on-release, and every step is broadcast with sendStateToEveryone.
  - Solo menu: onTurnTimeChange -> onSoloRulesChange(next, true), which sets includeTurnTime = true (home.tsx:323-330). Kit and Random changes pass false and never set it.
  - Solo launch ('Start solo game') -> startSoloGame sends setLobbyRules with turnTimeSeconds only when includeTurnTime (use-room-connection.ts:568-575), then chooseKit (unless Random only or 'random'), then N× addBot, then startGame.
- **States:**
  - Untouched (lobby): the server keeps turnTimeOverridden = false and humanTurnDurationMs() returns TURN_DURATION_MS (game-room.ts:1289-1296). The strip shows the effective seconds, Math.max(1, round(ms/1000)) (viewLobbyRules, game-room.ts:1298-1304).
  - Effective seconds above 180 (playtest env override): the strip clock shows the real value (for example '300s'). The slider and its readout clamp to 180 (sliderSeconds = MAX_TURN_TIME_SECONDS when the value is not valid, lobby-rules-panel.tsx:41-44), so strip and dialog disagree.
  - Effective seconds below 5 cannot happen (TURN_DURATION_MS minimum 5000).
  - Moved once (lobby): turnTimeOverridden becomes true for the life of the room (game-room.ts:1173-1176). It is never reset, including on Play again. There is no 'back to default' control.
  - Kit or Random change after the override: turnTimeSeconds is left out, and the server keeps the stored seconds (turnTimeSeconds ?? this.lobbyRules.turnTimeSeconds).
  - Solo untouched: includeTurnTime stays false, and the solo room uses TURN_DURATION_MS even though the panel shows 60s from defaultLobbyRules().
  - Solo Play again seed: lobbyRules come from the finished view (effective seconds). includeTurnTime starts as isTurnTimeSeconds(seed seconds) (home.tsx:116-118). With the default 60 it is true and 60 is sent explicitly. With an env value above 180 it is false and the server default applies again.
  - Online lobby during a drag: the slider is controlled by the server view, so the thumb follows round-trips. On a slow connection it may jitter or lag.
  - Tutorial: the rules are not used. humanTurnDurationMs ignores the override for playKind 'tutorial', and the finished-game rule columns stay NULL.
  - Bots keep their own think time whatever the slider says (rules spec §6 Setup; decisions 2026-10-06).
- **Keep:**
  - An untouched slider sends no turnTimeSeconds, so TURN_DURATION_MS still applies until the host moves it, in both lobby and solo (frontend.md Lot 70; protocol.md:129-131 'omitting turnTimeSeconds leaves TURN_DURATION_MS in force'; decisions 2026-10-06).
  - The host control is a whole number from 5 to 180, and the server rejects anything else with set-lobby-rules-turn-time (rules spec §6 Setup; parseSetLobbyRulesPayload).
  - The view's turnTimeSeconds is the effective rounded seconds and may exceed 180 when the env override is longer. finished_games.turn_time_seconds stores the seconds actually used (decisions 2026-10-06 Lot 70).
  - Kit / Random edits never carry turnTimeSeconds (lobby.tsx:130-137; home.tsx onSoloRulesChange(…, false)).
  - Play again keeps the rules, the turn time included (rules spec §6 Setup).
- **Notes:** If V7 changes the slider to commit on release (fewer setLobbyRules sends), the intent and payload stay the same, but the guest strip stops updating while the host drags. Whether that counts as presentation-only is open. Any V7 slider must keep 'untouched means nothing sent' in solo: the solo state machine separates the displayed value (soloRules.turnTimeSeconds) from whether it is sent (includeTurnTime).

### `reject-state-carryover` — Illegal-action reject carried across phase changes (lobby -> table, End -> rematch)

- **Files:** `apps/client/src/net/use-room-connection.ts`, `apps/client/src/App.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/end.tsx`, `apps/client/src/screens/illegal-action-dialog.tsx`, `apps/client/src/screens/illegal-action-copy.ts`, `apps/server/src/rooms/game-room.ts`, `docs/agent/frontend.md`, `docs/agent/decisions.md`
- **Purpose:** Shows how the one shared `actionReject`/`error` slot in useRoomConnection outlives the screen that produced it. A reject received in the lobby is never cleared by the lobby, survives the switch to phase 'playing', and opens IllegalActionDialog on the first table frame. The dialog shows the rich lobby copy, e.g. 'Guests not ready'. V7 needs to know about this cross-screen error state when it redesigns error display.
- **Controls:**
  - IllegalActionDialog OK button -> clearActionReject (clears actionReject and error).
  - IllegalActionDialog Esc / overlay click (closeOnOverlayClick) -> clearActionReject.
  - Leave / Forfeit flows -> leaveGame resets connection state.
  - Implicit clears: GAME_OVER (clears error/actionReject/subChoice), onDrop, onReconnect, onError, create/join game.
  - Lobby Start game pressed twice before the 'playing' stateUpdate arrives: the Button has no pending/debounce state (lobby.tsx Start button disabled only by !canLaunch). The second START_GAME hits server canStartGame with hasStarted=true -> start-already-started, which arrives once the client is at the table (plausible from code, not reproduced in a browser).
- **States:**
  - Clean entry: actionReject null when the phase flips -> table opens with no dialog.
  - Stale entry: actionReject non-null from the lobby -> TableScreen mounts with IllegalActionDialog open. resolveIllegalActionCopy uses the lobby code's rich copy (e.g. 'Guests not ready' / 'Every connected guest must press Ready before the host can start.'), which no longer applies.
  - While that stale dialog is open: otherModalOpen is true, so chrome popovers (incoming/log/opponents) are forced closed (table.tsx:1023-1040). hintDialogOpen is true, so first-game hints are held back until OK (table.tsx:1065-1073). The turn timer keeps running.
  - Late double-Start reject: 'start-already-started' modal ('The game has already started. You should be at the table shortly.') appears on the table right after start.
  - End screen: the read-only TableScreen receives actionReject/onDismissActionReject (end.tsx:137-140). A reject received on End (e.g. claim on the finished board) shows there, and if not dismissed it carries into the rematch lobby as the inline red line, then into the next table. GAME_OVER cleared only the earlier ones.
  - Kicked: actionReject is set to the kicked payload while App routes to Home. Home ignores actionReject. The next create/join resets it.
  - Reconnecting/disconnected: onDrop and attemptManualReconnect clear both fields.
- **Keep:**
  - During play, stateUpdate must not clear actionReject; bot/peer sync would close the modal mid-read (decisions 2026-08-10 Lot 39 item 5, L39-06; frontend.md:425).
  - IllegalActionDialog dismisses only by Esc / overlay / OK through clearActionReject, plus leave / gameOver / drop (L39-06).
  - When reject is null, the dialog unmounts entirely instead of staying mounted at open={false}, so AnimatePresence cannot leave a stuck blocking overlay (L39-06, illegal-action-dialog.tsx:31-35).
  - Copy comes from ILLEGAL_ACTION_COPY, exhaustive over every ActionRejectCode (illegal-action-copy.ts, L39-02). The wire message is the fallback only.
  - A table reject modal hides table chrome and holds back first-game hints while open (table.tsx otherModalOpen / hintDialogOpen).
  - No rule or protocol change: ERROR_MESSAGE `{ code, message }` stays as is (PROTOCOL 27+).
- **Notes:** The bug comes from two rules interacting, both from before Lot 61: (1) 'stateUpdate must not clear actionReject' (L39-06), written for the table, and (2) 'lobby keeps the inline alert' (L39-02), which never got a dismiss. The phase switch from lobby to playing is just another stateUpdate (use-room-connection.ts:222-241), so nothing clears the slot. Possible fixes are client-state only: clear on a phase change, scope the reject to the phase it arrived in, or give the lobby its own dismiss. Each needs a designer ruling because frontend.md documents the current behaviour.

### `global-dialog-interaction-contract` — Dialog primitive: dismissal, focus and viewport contract

- **Files:** `apps/client/src/design/components/dialog.tsx`, `apps/client/src/design/components/visual-viewport.ts`, `apps/client/src/design/components/dialog-width.ts`, `apps/client/src/index.css`, `docs/agent/frontend.md`, `docs/agent/decisions.md`
- **Purpose:** The one modal primitive used by every prompt in the game, admin and help flows. It decides how Escape, backdrop clicks, Tab and focus behave. The meaning of a dismissal (Stay, Skip, Cancel, View board...) comes from the onClose each caller wires in.
- **Controls:**
  - Escape key: a document-level keydown listener is registered for every open Dialog (dialog.tsx:108-124). It calls preventDefault, then onClose. It also fires when focus is inside a text input, for example the chat Message field
  - Backdrop click: closes only when the press lands on the overlay element itself (event.target === currentTarget, dialog.tsx:161-168). It is skipped when closeOnOverlayClick is false. The default is true (dialog.tsx:74). Clicks inside the panel call stopPropagation (dialog.tsx:213-215)
  - Tab / Shift+Tab: focus wraps between the first and last enabled focusable element in the panel. When the panel has nothing focusable, Tab is swallowed (dialog.tsx:126-159)
  - Initial focus on open: the first enabled focusable element in panel DOM order (title, then body children, then the actions row). If there is none, the panel itself gets focus (tabIndex -1) (dialog.tsx:84-101)
  - Focus restore on close or unmount: focus goes back to the element that had it before the Dialog opened (dialog.tsx:103-105)
  - actions slot: footer row data-zone="dialog-actions", rendered after the body. There is no built-in X button: every caller supplies its own Close / Cancel / OK / Stay
- **States:**
  - open / closed: AnimatePresence fade plus 0.98 scale, MOTION_DURATION_S; duration 0 under prefers-reduced-motion
  - non-dismissible: closeOnOverlayClick={false} with a no-op onClose. Only SubChoiceHost uses this
  - stacked: several Dialogs can be open at once. Each has its own Escape listener, so one Escape fires every open Dialog's onClose. All overlays are z-[100], so DOM order decides which is on top. The App-level claim picker renders after the screen, so it is always on top
  - short viewport (max-height 500px): panel padding is forced to 0.5rem (index.css:265-270)
  - mobile keyboard open, pinch-zoom, resize: the overlay is re-measured from window.visualViewport (offsetTop/offsetLeft/width/height) on vv resize, vv scroll and window resize (dialog.tsx:41-66, visual-viewport.ts)
  - no visualViewport API: falls back to innerWidth/innerHeight at 0,0
- **Keep:**
  - Escape and backdrop click go through the same onClose as the caller's safe or cancel button. There is no third dismiss path (L11-03; frontend.md Dialog convention)
  - Escape is not stack-aware: one keypress closes every open closable Dialog. Layered prompts guard themselves (kit-picker preview, inspect plus deactivate confirm). Any change to this is a product decision because of the claim picker (see claim-seat surface)
  - Backdrop dismissal triggers only on the overlay itself, never from a press inside the panel
  - Focus trap, initial focus and focus restore (accessibility; L11-03)
  - role="dialog", aria-modal="true", aria-labelledby pointing at the title h2
  - The overlay is sized to the live visualViewport (not 100dvh or fixed inset-0) with items-start. The panel is my-auto, max-h-full, and its width is min(preferred, 100%) through dialogPanelClassName, so Close/Cancel never clip at 390x844 or 844x390 (L53-02 / L53-07; decisions 2026-09-01). The body scrolls inside and the footer wraps
  - hintAnchor passes through as data-hint-anchor (first-game reward hint)
  - Layering: dialogs are z-[100]. HintOverlay is z-[105] and hidden while any dialog is open, except the reward hint over the reward sub-choice (table.tsx:1060-1068). TutorialCoach is z-[110] in its own pointer-events-none layer, so pressing coach buttons never counts as a backdrop click
- **Notes:** Dialog is not portaled: it renders inline where it is used. For example, the solo-menu Table rules Dialog sits inside the solo <form> (home.tsx:603 plus lobby-rules-panel.tsx:68), so any raw <button> placed in it must keep type="button". Several callers pass closeOnOverlayClick explicitly even though it is already the default. Escape listeners are re-registered on each render because onClose is often an inline arrow; this is harmless.

### `claim-seat-dismiss-stay` — Claim-seat picker dismissal (Escape / backdrop = Stay)

- **Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/claim-seat-dialog.tsx`, `apps/client/src/screens/claim-seat.ts`, `apps/client/src/net/use-room-connection.ts`, `packages/shared/src/protocol/messages.ts`, `packages/shared/src/protocol-version.ts`, `apps/server/src/rooms/game-room.ts`, `apps/server/src/protocol/visibility-matrix.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/lobby.tsx`, `docs/agent/decisions.md`, `docs/agent/frontend.md`
- **Purpose:** Offers a walk-in spectator, or a seated non-host lobby guest, the chance to sit in a disconnected seat. A dismissal is not a neutral close: for a walk-in it confirms Stay spectating and unfogs private hands.
- **Controls:**
  - Escape: calls onStay (claim-seat-dialog.tsx:43 passes onClose={onStay})
  - Backdrop click: calls onStay (closeOnOverlayClick defaults to true)
  - Orange button: 'Stay spectating' for a walk-in, 'Keep this seat' for a seated lobby guest (claim-seat.ts claimStayLabel). Calls onStay
  - onStay for a walk-in (view.isSpectator === true): sends STAY_SPECTATING with no payload (use-room-connection.ts:522-524), then setClaimDismissedKey(claimableKey) (App.tsx:125-130)
  - onStay for a seated lobby guest: only setClaimDismissedKey. No intent is sent
  - Seat row buttons (seat-color dot, nickname, 'Host' tag): local selection only, aria-pressed
  - Green 'Sit here': sends CLAIM_SEAT {playerId} (use-room-connection.ts:518-520). Disabled until a seat is selected. A single listed seat is pre-selected
- **States:**
  - hidden: claimableSeats is empty, or the viewer is the host, or the viewer is a living seated player during play (shouldShowClaimPicker, L57-15: host Draw stays reachable)
  - finished phase: never shown, because the server returns [] once a winner exists (game-room.ts:1604-1607)
  - walk-in fogged: while the picker list is non-empty and Stay is not confirmed, the server withholds the Spy overlay (walkInSpectatorSeesPrivate). Opponent kits show '?' and the table copy reads 'Hands stay hidden until you stay spectating or sit.' (table.tsx:1452)
  - walk-in after Stay: the server adds the session to stayConfirmedSpectators (game-room.ts:1652-1660). It stays there until a claim or leave, so it survives later picker reappearances
  - dismissed: hidden while claimableKey (claimable playerIds joined with '|' in server order) equals claimDismissedKey (App.tsx:80-95)
  - re-shown: only when that key changes (a seat added, removed or reordered)
  - stacked: the picker renders after Table/Lobby/End in App, so it sits on top of any open screen Dialog. One Escape closes both
  - claim rejected (claim-not-claimable, invalid payload): on the table an IllegalActionDialog opens under the picker; in the lobby an inline error shows
- **Keep:**
  - Escape, backdrop click and the Stay button are the same action. For a walk-in that action sends STAY_SPECTATING, which unfogs kits, hands and live resources for the rest of that spectator session (L57-16, PROTOCOL 32 to 33; decisions 2026-09-15)
  - A seated lobby guest's dismissal ('Keep this seat') sends nothing
  - No auto-match by nickname (nicknames are not unique; the seat is picked by color, L57-13). The only claimable seat is pre-selected so Sit here is enabled at once (L57-15)
  - Visibility rule shouldShowClaimPicker: walk-in in lobby or playing, or non-host seated guest in lobby, and only when claimable seats exist
  - The picker reappears only when the claimable set changes. Once dismissed for a given list it does not come back for that exact list, even when a seat reconnects and later drops again with the same id
  - Sit uses seated vision, and the server clears stayConfirmed on claim (game-room.ts:1710-1712)
  - STAY_SPECTATING is walk-in only; the server rejects it from a non-spectator with 'stay-spectating-not-spectator'
- **Notes:** Hazard: when a walk-in has chat, Opponents, Action log, kit/opponent inspect, How to play, Feedback or the Leave confirm open and the claimable list changes, the picker reappears on top. One Escape meant for the lower dialog also sends STAY_SPECTATING. There is no control to reopen the picker after dismissal, even though the spectator copy says 'Claim a disconnected seat or leave the table.' (table.tsx:1374-1375) and 'Claim a disconnected seat if one is listed' (lobby.tsx:150).

### `chat-compose-enter` — Chat composer: Enter sends (lobby inline and table dialog) · `Lot 62+`

- **Files:** `apps/client/src/screens/table/chat-log.tsx`, `apps/client/src/screens/table/table-chat.tsx`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/table.tsx`
- **Purpose:** Message input shared by the lobby chat (inline) and the table chat popup.
- **Controls:**
  - Enter in the 'Message' input: submits the form (chat-log.tsx:62). It is ignored when the trimmed body is empty or canWrite is false; otherwise SEND_CHAT is sent and the form resets
  - Green 'Send' (type=submit, never disabled): same as Enter
  - Table chat icon: toggles the popup. The badge shows the unread count since the last close
  - Escape / backdrop / Close on the table popup: closeChat (marks read). Any unsent draft is dropped
- **States:**
  - empty transcript: 'No messages yet.'
  - canWrite false (finished readOnly board): no composer; the snapshot is read-only
  - eliminated / spectator lines: grey italic with a role label
  - the transcript auto-scrolls to the newest line on new messages
  - lobby: canWrite is always true, including for walk-ins
- **Keep:**
  - Enter-to-send and reset after a send
  - maxLength 200
  - The input uses font-size 16px (text-base) so iOS does not zoom on focus (commit 6372d04, 'prevent mobile zoom on chat input')
  - Each line shows the round label and the seat-colored nickname (rules spec §6 Chat)
- **Notes:** Lot 70 (L70-01) plus the zoom fix after Lot 70. The table popup is a Dialog, so Escape while typing closes it.

### `feedback-dialog-dismiss` — Feedback dialog: manual Cancel vs ask Skip, no Enter-to-send

- **Files:** `apps/client/src/feedback/feedback-dialog.tsx`, `apps/client/src/feedback/submit-gate.ts`, `apps/client/src/screens/home.tsx`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/end.tsx`
- **Purpose:** Tester ticket opened from the Home / Lobby / Table '!' / Game over Feedback (manual), and the ask-once prompt (end screen).
- **Controls:**
  - Escape / backdrop: dismiss('skip') in ask-mode, dismiss('cancel') in manual mode. resetForm drops kind, topics, message and contact
  - Orange 'Skip' (ask) / 'Cancel' (manual): same as Escape. Disabled while busy
  - Kind buttons Bug / Confusion / Idea; About topic toggles (aria-pressed)
  - Message textarea (maxLength 4000; Enter adds a newline); Contact input (maxLength 200, autocomplete email). No <form>, so Enter never sends
  - Green 'Send' ('Sending…' while busy): POST /api/feedback. Disabled until canSendFeedbackForm (a bug needs at least one topic, and the message must be non-empty)
- **States:**
  - manual / ask (with lead 'Skip is fine.')
  - busy sending: buttons disabled, but Escape / backdrop still close; the late result is ignored
  - send error: role=alert message; the dialog stays open
  - send hint: role=status (missing topic or message)
- **Keep:**
  - In ask-mode, an overlay or Escape dismissal is Skip (technical spec v6 §7.1)
  - In manual mode, a dismissal is Cancel and is never marked asked
  - On Home / Lobby / live Table every reason just closes; only the end screen acts on the reason
  - The double-submit gate (beginFeedbackSend) and requestId guard against stale results
- **Notes:** Lots 47 / 57.

### `global-input-modalities` — Keyboard shortcuts and gestures (complete list)

- **Files:** `apps/client/src/design/components/dialog.tsx`, `apps/client/src/screens/table/shop-dialog.tsx`, `apps/client/src/design/components/tooltip.tsx`, `apps/client/src/design/components/card.tsx`, `apps/client/src/design/components/life-count-badge.tsx`, `apps/client/src/design/components/resource-icon.tsx`, `apps/client/src/design/components/cost-display.tsx`, `apps/client/src/action-log/action-log-panel.tsx`, `docs/agent/frontend.md`
- **Purpose:** Records that, apart from the Dialog handling and Shop double-click above, the client has no keyboard shortcuts or custom gestures, so a redesign does not add or drop any by accident.
- **Controls:**
  - Only keydown listener: Dialog Escape and Tab (grep across apps/client/src shows no other keydown/keyup handlers)
  - Only double-click: Shop tile instant buy
  - Enter submits only native forms: the Join code, solo menu, tutorial, chat and admin password fields
  - Native controls keep their browser keyboard behaviour: buttons (Enter/Space), the range slider (arrows, and each step sends SET_LOBBY_RULES online), text inputs
  - Hover-only info: native title tooltips on Card thumbs, life-count badge, resource icons, CostDisplay and action-log entries
  - No long-press, swipe, drag, pinch handler, context menu or pointer/touch handlers. Card images set draggable=false. Hand and specials rows scroll horizontally with native scrolling
- **States:**
  - keyboard-only: everything is reachable through buttons; inside an open Dialog Tab is trapped, so the TutorialCoach and HintOverlay buttons outside the panel cannot be reached by keyboard
- **Keep:**
  - No global hotkeys (none exist today; adding one is a new product decision)
  - Inputs stay at 16px or larger so mobile focus does not zoom (home, feedback and chat inputs use text-base; admin fields use text-v7-input, Lot 80)
  - Card art is not draggable
- **Notes:** Doc drift: frontend.md says Tooltip (hover + focus, role=tooltip) is used for the reasons own cards are unavailable, but apps/client/src/design/components/tooltip.tsx is imported nowhere. Only native title attributes remain.

### `global-page-reload-recovery` — Full page reload / tab restore mid-session (no Rejoin prompt)

- **Files:** `apps/client/src/net/use-room-connection.ts:70 (RECONNECT_TOKEN_KEY), 89-91 (120 retries, 5s max delay), 216-230 (persist on attach + every playing stateUpdate, clear on finished), 302-312 (clear on gameOver), 358-366 (persist on onReconnect), 369-410 (onLeave: the only readToken call → attemptManualReconnect), 745-772 (attemptManualReconnect), 784-804 (persist/read/clear)`, `apps/client/src/App.tsx (useState nickname/joinCode reset on reload; no URL code param; no mount effect)`, `apps/client/src/screens/home.tsx (OnlinePath Join form is the only re-entry point)`, `apps/client/src/screens/table/timers.tsx:86-91 ('Code {gameCode} · {statusLabel}' is where a player can read the code)`, `apps/client/src/screens/claim-seat.ts, apps/client/src/screens/claim-seat-dialog.tsx`, `apps/server/src/rooms/game-room.ts:722-760 (onDrop holds seat with allowReconnection manual), 803-870 (onLeave), 1635-1649 (holdReconnection), 1651-1736 (handleClaimSeat remaps; lobby duplicate guest seat unseated on claim)`, `apps/server/src/rooms/claim-seat-rules.ts`, `apps/server/src/rooms/tutorial-join.ts`, `apps/server/src/engine/lifecycle/constants.ts (grace 30s, 3 absent autodraws)`, `node_modules/@colyseus/core/build/Room.mjs:1042-1043 (any non-consented close, including reload, routes to onDrop)`, `docs/agent/frontend.md:487-505 (connection conventions)`, `docs/agent/decisions.md 2026-07-31 Lot 7`, `docs/technical_spec_v6.md §2.3 (join-by-code while playing) and §11 (tutorial mid-script reconnect, identity out of scope)`
- **Purpose:** Describes what a player gets after a refresh, an accidental reload, or a mobile tab discard while in a lobby, a match or Game over, and the one manual path back to their seat. The redesigned Home and connection banner must account for this state, because today it looks exactly like a cold start.
- **Controls:**
  - No dedicated Rejoin, Resume or Reload control exists. The reconnection token sits in sessionStorage['card-battle:reconnection-token'] but is never read on mount
  - Recovery path (manual): Home → Play online → retype the nickname (empty after reload) → type the 6-letter code (empty after reload) → Join
  - Lobby re-entry: if seats < 8, the server sits a NEW guest seat, then the picker 'Sit as a disconnected player?' opens with 'Keep this seat' (stay) and 'Sit here' (claimSeat; the duplicate guest seat is unseated). A full lobby enters as a walk-in spectator, then the same picker
  - Playing re-entry: walk-in spectator, then the picker with 'Stay spectating' (staySpectating) or 'Sit here' (claimSeat). A single listed seat is pre-selected; seats show nickname and seat color, with no auto-match
  - No deep link (?code=), no persisted nickname, no 'last game' memory
- **States:**
  - Lobby reload: the server holds the seat as a reservation (allowReconnection 'manual'), sets the guest to not ready, and other players see the seat disconnected. Start readiness counts only connected guests (frontend.md). A host reload leaves hostSessionId on the reserved seat, so the host must rejoin and claim to get host controls back
  - Playing reload: the seat goes 'disconnected', timers it owns pause (turn, Mirror, rewards), and other players see 'Paused — reconnecting'. After the 30s grace the seat is 'absent' and autodraws instantly on its turns. The 3rd autodraw eliminates it (eliminateWithoutReward, absence), and eliminated seats are no longer claimable
  - Solo reload: same as playing. The bots keep the room alive, and the code is shown only in the table Timers strip, so a player who never read it cannot get back
  - Tutorial reload: unrecoverable. Joining by code is rejected with 'This tutorial cannot be joined.', and only a fresh tutorial is possible (spec v6 §11 puts tutorial mid-script reconnect beyond grace out of scope)
  - Game over reload: the token is already cleared, and the server does not hold finished seats (onDrop returns once a winner is set). Re-joining by code enters as a walk-in spectator of the finished board, with no Play again for walk-ins, until another player's Play again turns walk-ins into unready lobby guests
  - Reload while 'reconnecting': same outcome as any reload. The pending auto-retry loop is lost
  - The token is cleared at the start of any create, join, solo or tutorial, so the first new action after a reload wipes the only rejoin credential
  - Room gone (server restart or deploy): the code returns 'room "X" not found'
  - sessionStorage unavailable (private mode or blocked): persist and read silently no-op
- **Keep:**
  - Same-tab socket drop within grace reclaims automatically, without the picker. The table view stays up while status is 'reconnecting' (frontend.md conventions; L7 / L57-13)
  - A reload is a non-consented drop, never a Leave: it must not forfeit. Only an explicit Leave or Forfeit eliminates (decisions 2026-07-31; Lot 71 forfeit). Do not add a beforeunload leave
  - Join-by-code while playing enters as a spectator first. The picker lists living disconnected seats by nickname and seat color, with no nickname auto-match (L57-13; spec v6 §2.3)
  - Walk-in kits stay fogged until Stay spectating (L57-16)
  - A lobby accidental drop reserves the seat until Kick, Leave or claim (L57-13)
  - Grace is 30s (RECONNECT_GRACE_MS); 3 absent autodraws eliminate with no reward (spec §5.7 as overridden by L57-13)
  - No accounts and no unique identity (spec v6 §11)
- **Notes:** The gap the critic flagged is confirmed in the code: readToken() is called only inside room.onLeave after SDK auto-retries are exhausted (use-room-connection.ts:394), and no useEffect reads it on mount. Server-side, the reserved seat would accept client.reconnect(token) after a reload (onDrop → manual allowReconnection, until elimination, kick, claim or game over). A Rejoin prompt is therefore technically possible client-only, without a protocol change, but it would be a new interaction rather than a restyle. See openQuestions.

### `chat-new-message-announcement` — New chat message signalling (unread, scroll, accessibility) · `Lot 62+`

- **Files:** `apps/client/src/screens/table/chat-log.tsx`, `apps/client/src/screens/table/table-chat.tsx`, `apps/client/src/screens/table/chat-unread.ts`, `apps/client/src/screens/table/chat-unread.test.ts`, `apps/client/src/screens/lobby.tsx`
- **Purpose:** How a reader learns a new chat line arrived. The red unread count on the table chat icon is the only signal. The lobby has none, there is no live region, and the unread logic counts list length rather than message identity.
- **Controls:**
  - Table: chat icon aria-label changes to 'Chat, N unread', plus the visual badge
  - Table: opening the Dialog, or closing it by Close, Esc, overlay or the icon, sets seenCount to messages.length
  - Lobby and table: the transcript scroller is forced to scrollTop = scrollHeight whenever the messages array changes
- **States:**
  - No role='log' and no aria-live on the transcript or the badge, so screen readers are not told about new lines. The icon's aria-label changes but is not announced
  - Lobby: inline log with no unread count. A line that arrives while the reader is scrolled away or looking elsewhere has no signal
  - Table popup open: unread is 0, and new lines appear and auto-scroll
  - Table popup closed: badge = length - seenCount
  - On mount (joining mid-game, reconnecting, lobby to table, playing to finished): seenCount starts at messages.length, so existing history never counts as unread
  - Your own lines are never counted, because sending needs the popup open
  - Reading older lines: any incoming line jumps the scroller to the bottom and loses the reader's place
  - The role changes that grow or shrink the list (elimination, claiming a seat) distort the count. See table-chat-side-stream-disclosure
- **Keep:**
  - Unread is client-local and counts messages that arrived while the popup was closed (decisions 2026-10-06 Lot 70; chat-unread.ts; chat-unread.test.ts)
  - The popup scrolls to the newest line when it opens and when lines arrive (frontend.md)
    - V7 ruling (designer 2026-10-26, `docs/agent/decisions.md`): "when lines arrive" now applies only while the reader is at the bottom (within 24 px). A reader who scrolled up stays put, their own send always scrolls down, and there is no 'new messages' pill. Opening still lands on the newest line.
  - The Dialog keeps its focus trap, Esc and overlay dismiss, and visual-viewport pinning (design/components/dialog.tsx, L53-07)
- **Notes:** V7 could add role='log' with aria-live polite, stick to the bottom only when the reader is already at the bottom, and add a 'new messages' jump pill. Those are presentation changes. Tracking unread by last-seen order instead of length would fix the shrink case without touching the protocol, since ChatMessageView.order is already on the wire.

### `global-card-face` — Card face component (full / face / thumb) with AnimatedCard wrapper and listed-damage badge

- **Files:** `apps/client/src/design/components/card.tsx`, `apps/client/src/design/components/animated-card.tsx`, `apps/client/src/design/components/life-count-badge.tsx`, `apps/client/src/design/components/card.test.ts`, `apps/client/src/design/components/life-count-badge.test.ts`, `apps/client/src/screens/table/card-band.tsx`, `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/active-persistent-thumb.tsx`, `apps/client/src/screens/table/sentence-chip.tsx`, `apps/client/src/screens/table/shop-dialog.tsx`, `apps/client/src/screens/table/opponent-reveal-dialog.tsx`, `apps/client/src/design/components/card-choice-tile.tsx`, `apps/client/src/screens/whats-new-dialog.tsx`
- **Purpose:** The single renderer for a CardInstance. It turns cardId + isUpgraded (+ activated) into catalog art, a name line, optional catalog effect copy and an overlaid listed-damage badge. Every hand, special, active, Sentence chip, shop, pool, reveal, picker tile, inspect dialog and What's new thumb goes through it.
- **Controls:**
  - Card with onSelect: renders a native <button type=button>. Click, Enter or Space calls onSelect(instance.instanceId). The caller decides what happens: card-band opens the actions Dialog (Use / Upgrade / Sell), active thumbs open the inspect Dialog with source 'active', the Sentence chip opens catalog inspect, opponent-reveal thumbs open the Spy inspect
  - Card without onSelect: renders a static <article>, not focusable (inspect dialogs, shop, pool and What's new thumbs use pointer-events-none or static mode)
  - aria-pressed={selected} on the button form
  - focus-visible outline (2px ink, offset 2) on the button form
  - Native title tooltip on thumbs only: '{name}[ upgraded][, N damage]', also used as aria-label
  - AnimatedCard (card-band only): mount flip (rotateY -28 to 0) unless skipEntrance (card-band always passes skipEntrance, L50-05); a 90deg re-flip when isUpgraded changes (upgrade reveal, L14-01); both off under reduced motion
- **States:**
  - detail='thumb': art only, plus the damage badge (icon 8px). Accessible name and title come from the label string. Used by Spy reveal, active persistents, Sentence chip, shop and pool grids, CardChoiceTile, What's new
  - detail='face': art + name line (10px), no effect text. Used by the hand and specials band (via AnimatedCard) and the left column of the actions and inspect Dialogs
  - detail='full' (the default): art + name + CardEffectCopy below. No call site uses it today (the dialogs pair a 'face' with a separate CardEffectCopy)
  - Upgraded: the name gets a ' ↑' suffix and the upgraded PNG is used
  - activated=true: the '(activated)' PNG is used. Today only entries from activePersistentEffects pass it (own kit row and opponent seats), plus the inspect Dialog when gated by CARDS_WITH_ACTIVATED_ART
  - Listed damage badge: LifeCountBadge kind='damage' at bottom-right over the art, shown only when listedAttackDamage(cardId, isUpgraded, damageMultiplier) is not null. It is null for non-attacks and for Tax, Absorber and Super Mirror (L56-04)
  - damageMultiplier > 1: the badge shows catalog damage × the multiplier (Mirror-doubled pending attacks in the Mirror picker, L56-04)
  - selected=true: ring-2 cta-purple. card-band uses it for the tutorial-highlighted instance, not for a real selection
  - Unknown definition: the name falls back to the raw cardId and the effect block is omitted
  - Off-turn or actions locked: the Card stays clickable so the player can read it. Locking happens in the Dialog buttons ('Actions locked — you can still read the card.', card-actions.tsx)
  - Spectator / eliminated: no special Card state. Callers hide the dock or pass no onSelect
  - Missing art or activated art: getCardArtUrl throws during render. The client has no error boundary, so the app goes blank
- **Keep:**
  - One component renders every card face from catalog data. Art is chosen only by cardId + isUpgraded + activated, never by instanceId (technical spec v2 §5, L10-04)
  - Three density tiers stay: art-only thumbs, art+name faces, and full art+name+effect (L10-04)
  - Upgraded faces show the upgraded art and the ↑ marker on the name line
  - Listed attack damage is a compact life-glyph badge over the art. It never uses ResourceIcon, which carries flyouts and captions (L56-04, card.test.ts asserts 'listedAttackDamage', 'LifeCountBadge', kind="damage" and no 'ResourceIcon')
  - The damage badge honors the Mirror multiplier (L56-04)
  - LifeCountBadge spoken labels: 'N damage', 'N card lives' / '1 card life', 'N turns remaining' / '1 turn remaining'. 'turns' drops the heart glyph (Invisibility, L58-06)
  - Thumbs carry an accessible name with the upgrade state and damage, because they have no visible name
  - Cards stay clickable off-turn and during Mirror or reward prompts, for reading (frontend.md, L12-08 / L51-05)
  - Hand and specials faces do not replay an entrance flip on pagination or remount (skipEntrance, L50-05). The upgrade reveal flip still plays
  - AnimatedCard never starts at opacity 0 (Lot 39 HMR regression note in animated-card.tsx)
  - Art is object-contain at a 2/3 aspect and draggable=false
- **Notes:** Card picks default padding and width with string heuristics: className.includes('p-') drops the default p-1 and includes('w-') drops the default w-28. A class like 'top-2' would suppress padding by accident. A redesign should replace this with explicit props. The tests are source-string assertions (readFileSync of card.tsx and life-count-badge.tsx), so a rewrite must keep the asserted literals or update those tests in the same change. Consumers: card-band (AnimatedCard face), card-actions (face, actions and inspect), active-persistent-thumb (thumb + activated), sentence-chip (thumb, never activated), shop-dialog (thumb; upgraded art when the kit's alwaysUpgraded covers the card), shop pool grid (thumb), opponent-reveal-dialog (thumb, clickable), CardChoiceTile (thumb), whats-new-dialog (thumb, always base art).

### `global-card-effect-copy-inline-icons` — Card effect copy with inline resource icons (CardEffectCopy, EffectTextWithIcons, effect-text-tokens, CostDisplay)

- **Files:** `apps/client/src/design/components/card-effect-copy.tsx`, `apps/client/src/design/components/effect-text-icons.tsx`, `apps/client/src/design/components/effect-text-tokens.ts`, `apps/client/src/design/components/cost-display.tsx`, `apps/client/src/design/components/structured-cost.ts`, `apps/client/src/design/components/card-effect-copy.test.ts`, `apps/client/src/design/components/effect-text-tokens.test.ts`, `apps/client/src/design/components/cost-display.test.ts`, `packages/shared/src/domain/card-catalog.ts`, `packages/shared/src/domain/special-card-catalog.ts`
- **Purpose:** Renders a card's rules text in the actions and inspect Dialogs (and in Card detail='full'). It shows a 'Cost' row with icon+number, then the base or upgraded effect, then an 'Upgrade — …' delta block. Resource phrases in the catalog prose ('4 lives', '3 points', '2 upgrade points', '4 shield points', 'instead of 3') become inline number+icon glyphs (L51-12).
- **Controls:**
  - No interactive controls. Static text
  - Native title tooltip on each CostDisplay (the spoken cost, e.g. '10 points'). Callers can pass title={null} when a parent button already names the action (L59-01)
- **States:**
  - Base card: Cost row (if any) + base `effect` + bordered 'Upgrade — {upgradeAdds}' block
  - Upgraded card: Cost row + `upgradeEffect` only. No Upgrade block
  - No play cost (structuredPlayCost returns null): the Cost row is omitted
  - Empty effect string: the effect paragraph is omitted
  - Upgraded Regeneration: the Cost row shows 2 points per life instead of the catalog rate (structuredPlayCost, rules §3)
  - pointsPerLife cost: renders 'N [point]/[life]'
  - Phrase tokenization: points, lives/life and upgrade points render through CostDisplay (16px icons), which includes sr-only spoken text
  - Shield phrase ('4 shield points'): renders number + shield icon directly, without CostDisplay. The icon is aria-hidden and there is no sr-only word, so a screen reader hears only the number (V7 speaks "N shield points" — L72-11, see decisions.md 2026-10-26)
  - 'instead of N' tail: becomes 'instead of ' + N with the previous span's resource icon. With no previous resource (e.g. '7 consecutive turns instead of 3.') the text stays plain
  - Damage numbers ('20 damage', 'instead of 1' after damage) and '2 card lives' are never iconified
  - 'upgrade points' is matched before 'points' (test-locked)
- **Keep:**
  - Play cost is always shown as icons labelled 'Cost'. The prose 'Cost:' prefix is never used (L51-05 / L51-12; card-effect-copy.test.ts asserts '<span>Cost</span>' and no 'Cost:')
  - Base faces show the base effect plus the Upgrade delta (`upgradeAdds`). Upgraded faces show only `upgradeEffect` (L51-05, frontend.md)
  - No 'Choose Use, Upgrade, or Sell.' helper line (test-locked)
  - Icon amounts come only from the catalog strings. The client never invents a value (effect-text-tokens.ts header)
  - Regeneration upgraded rate is 2 points per life in the Cost row (structured-cost.ts, rules spec §3)
  - Damage is never shown as a resource icon in effect prose (effect-text-tokens.test.ts)
  - Each CostDisplay carries sr-only spoken text, and its icons are aria-hidden
  - Interactive cost chrome uses signed '−' for pay and '+' for receive (CostDisplay signed, L39-04). Effect prose uses no sign
  - Action-log and How-to-play prose stay plain text via formatCardCost. Only interactive chrome and inspect use icons (cost-display.tsx header)
- **Notes:** Used by card-actions.tsx in the actions Dialog (own hand and specials) and the inspect Dialog (Spy / active / log / queue sources), and by Card detail='full'. The tokenizer works on English catalog prose with a regex. Any copy rewrite in the shared catalogs changes which phrases become icons.

### `global-resource-captions` — Resource captions (visible on the dock, sr-only elsewhere)

- **Files:** `apps/client/src/design/components/resource-captions.ts`, `apps/client/src/design/components/resource-captions.test.ts`, `apps/client/src/design/components/resource-icon.tsx`, `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/screens/table/private-zone.test.ts`, `apps/client/src/screens/table/opponent-zone.tsx`, `apps/client/src/screens/table/opponent-reveal-dialog.tsx`, `apps/client/src/screens/table/kit-inspect-details.tsx`, `apps/client/src/screens/game-over-dialog.tsx`
- **Purpose:** Names the four resources (Lives, Points, Shield, Upgrade points) and decides whether ResourceIcon shows the word next to the icon or only to screen readers (technical spec v6 §6.1, L43-01).
- **Controls:**
  - No interactive controls
  - Native title tooltip on every ResourceIcon: the label, or '{label} unknown' when the value is hidden
- **States:**
  - captionVisible=true (own dock only: DOCK_RESOURCE_CAPTION_VISIBLE = true in private-zone.tsx for Lives / Shield / Points / Upgrade points): the caption is visible between the icon and the value
  - captionVisible omitted or false (opponent seats, opponent reveal Dialog, kit inspect, Game over): the caption is sr-only ('{label} ' before the value)
  - value === 'unknown' (unspied or base-Spy seats, L51-08): shows '?'. sr text and title read '{label} unknown'
  - Upgraded shield on the dock: a separate 'Shield ↑' pill next to the row (private-zone.tsx)
- **Keep:**
  - Caption strings are exactly Lives / Points / Shield / Upgrade points (resource-captions.test.ts)
  - The own dock shows visible captions, not sr-only or title-only (L43-01; private-zone.test.ts locks DOCK_RESOURCE_CAPTION_VISIBLE === true and mode 'visible')
  - Kit inspect and opponent reveal stay compact, with icon + number and the caption for screen readers only (resource-icon.tsx doc, frontend.md)
  - Hidden values read as '{label} unknown', never as a number
- **Notes:** RESOURCE_CAPTIONS lives outside resource-icon.tsx so Fast Refresh stays valid (file header). ResourceIcon's gain/loss flash, floats and token flyouts are table FX and should be inventoried with the dock and seat surfaces. Only the caption mode and labels belong here.

### `global-dialog-width` — Dialog panel width and height helpers (dialog-width)

- **Files:** `apps/client/src/design/components/dialog-width.ts`, `apps/client/src/design/components/dialog-width.test.ts`, `apps/client/src/design/components/dialog.tsx`, `apps/client/src/index.css`
- **Purpose:** Turns a caller's `max-w-*` panelClassName into one `max-w-[min(<rem>,100%)]` token, so the preferred width is honored and always capped to the overlay. It also supplies the shared panel base class (my-auto, max-h-full, min-w-0, radius, border, shadow, padding) (Lot 53, L53-02 / L53-07).
- **Controls:**
  - No interactive controls. Layout helper consumed by Dialog
- **States:**
  - No max-w token: default 28rem, capped to 100%
  - Mapped tokens: max-w-sm 24rem, md 28rem, lg 32rem, xl 36rem, 2xl 42rem, 3xl 48rem, 4xl 56rem
  - Unknown max-w token (e.g. max-w-5xl): the token is stripped and the width silently falls back to 28rem
  - Short viewport (max-height 500px, index.css): every [role=dialog] gets 0.5rem padding and max-height 100% so Close stays on screen at 844×390
  - Tall panel: pinned to the top of the visualViewport-sized overlay (items-start). A short panel is centered by my-auto
- **Keep:**
  - A later max-w class must win. Tailwind v4 cannot override max-w-md with max-w-3xl in the same string, so the helper emits a single token (dialog-width.ts header; test asserts no max-w-md alongside max-w-3xl)
  - Widths are capped with min(…,100%) so a 390px phone never clips Cancel or Close off the right edge (L53-07)
  - Height is 100% of the overlay, never 90dvh, 100dvh or 100vw (test-locked)
  - The overlay is sized to visualViewport and uses items-start, never items-center or items-end, so a tall panel's title is not clipped (dialog-width.test.ts asserts dialog.tsx source strings)
  - Current consumer widths: max-w-md (feedback, table chat), max-w-lg (kit inspect, opponent reveal, lobby rules panel, admin feedback, one table dialog; the legacy inbox was deleted in L80-09), max-w-2xl (How to play, What's new, admin games, one table dialog), max-w-3xl (Shop, lobby kit picker, sub-choice host, Game over, one table dialog)
- **Notes:** Dialog itself is inventoried in global-dialog-button-primitives. This surface covers only the width and height contract that every modal inherits. The lobby rules panel (max-w-lg) and table chat (max-w-md) consumers arrived in L70-01, after Lot 61. The tests are source-string checks on dialog.tsx and index.css, so a redesign has to update them deliberately.

### `global-tooltip-unused` — Tooltip component (unused; native title is the live tooltip mechanism)

- **Files:** `apps/client/src/design/components/tooltip.tsx`, `docs/agent/frontend.md`
- **Purpose:** An accessible hover+focus tooltip (role=tooltip, aria-describedby, no dependency) built in L12-08 for unavailable-card reasons (technical spec v2 §6.1). No file imports it today. Since commit 1f4261b ('fluid Table hand and off-turn inspect') reasons and labels use native `title` attributes and in-dialog copy instead.
- **Controls:**
  - Hover (mouseenter / mouseleave) opens and closes it
  - Focus inside the wrapper opens it. Blur outside the wrapper closes it
  - No keyboard dismiss (Esc) and no touch support
- **States:**
  - enabled=false or empty content: renders children in a plain span with no tooltip chrome
  - open: dark ink bubble above the child, max 12rem wide, 11px text
- **Keep:**
  - Whatever V7 uses for hints must keep the information the native titles carry today: thumb card name + upgrade + damage (Card), spoken cost (CostDisplay, unless title={null}), resource label or 'unknown' (ResourceIcon), card-lives / turns / damage (LifeCountBadge), 'Active cards' (opponent actives strip)
  - Unavailable-action reasons are currently shown in Dialog copy ('Actions locked — you can still read the card.') and through disabled buttons, not in a Tooltip
- **Notes:** frontend.md still says Tooltip is 'used for unavailable own cards'. The code disagrees: grep finds no importer. Per AGENTS.md §12 the doc should be fixed or the component removed. This is a decision for the redesign.

### `global-art-catalog` — Art catalog and typed asset lookup (kits, card faces, activated faces, backs, opponent placeholder, resource icons)

- **Files:** `apps/client/src/design/asset-lookup.ts`, `apps/client/src/design/asset-lookup.test.ts`, `apps/client/src/assets/kits/`, `apps/client/src/assets/cards/`, `apps/client/src/assets/backs/`, `apps/client/src/assets/icons/`, `apps/client/src/assets/how-to-play/`, `apps/client/src/design/components/kit-portrait.tsx`, `apps/client/src/design/components/card-choice-tile.tsx`, `apps/client/src/screens/home.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/kit-inspect-details.tsx`, `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/fx/play-flyout.ts`, `apps/client/src/fx/opponent-token-chips.ts`, `docs/technical_spec_v2.md`, `docs/agent/decisions.md`
- **Purpose:** The only place that maps ids to PNG files. Typed maps (KIT_FILES, CARD_FILES, RESOURCE_FILES, BACK_FILES) resolve through eager import.meta.glob URLs. Every art-bearing UI depends on it: portraits, card faces, versos, the opponent and Random-kit placeholder, and the resource glyphs used in costs, badges, the dock and FX chips.
- **Controls:**
  - No interactive controls. Lookup functions: getKitPortraitUrl, getCardArtUrl(cardId, {isUpgraded, activated?}), getCardBackUrl('attack'|'action'|'special'|'kit'), getOpponentPlaceholderUrl, getResourceIconUrl('life'|'point'|'shield'|'upgradePoint'), getAttackLogoUrl, getActionLogoUrl, plus ALL_ART_CARD_IDS, CARDS_WITH_ACTIVATED_ART and the deprecated V1_CARD_IDS
- **States:**
  - Kit portraits: 16 KitIds → 16 PNGs. Name mismatches are mapped in code only: scientific → Scientist.png, wizard → Magician.png
  - Card faces: 31 CardIds × base and upgraded = 62 PNGs. Mismatches: absorber → Absorption.png, points-generator → Generator.png, mega-attack → 'MEGA ATTACK.png'. Cream art is unupgraded and pink (' +') is upgraded (designer 2026-09-21)
  - Activated faces: 9 cards × 2 = 18 PNGs: imposition, points-generator, block, invisibility, reanimation, super-absorber, curse, poison, roulette. Block and Reanimation activated art exists but no screen requests it, because neither card is in PERSISTENT_SPECIAL_CARD_IDS
  - No activated art: Sentence (ticking countdown, not a persistent) and Shield (the combat-shield thumb uses base or upgraded art), plus every other card
  - Card backs: attack verso (hidden identity on CardChoiceTile, Home decoration, attack play-ghost fallback), action verso (unspied opponent plays, Draw ghosts, kit-inspect action count), special verso (special buys), kit verso (resolved and tested, used by no screen)
  - Logos: attack_logo.png and action_logo.png are resolved and tested but used by no screen
  - opponent.png: unrevealed or unspied kit in KitPortrait (kitId === null), and the Random-kit face in the lobby kit picker and lobby rules panel
  - Resource icons: life.png, point.png, shield_point.png, upgrade_point.png
  - how-to-play/: empty (.gitkeep). Designer screenshots are globbed by filename and a missing file omits the <img>
  - Missing file: urlFromGlob throws 'Missing asset: folder/file'. Activated art requested for a card without it throws 'Card X has no activated art'. The FX paths (table.tsx play ghosts, opponent-token-chips) catch and fall back to a verso. Card and KitPortrait do not catch, and the client has no error boundary, so the screen blanks
- **Keep:**
  - Never import or reference *(dead).png (13 kit death portraits in repo images/), Draw.png, or *_button.png (purple_button.png etc.). Elimination is a generic greyscale + 'Eliminated' badge (decisions 2026-08-01 Lot 10 rulings, technical spec v2 §4.3/§4.1; asset-lookup.test.ts asserts no /button/, /Draw\.png/, /\(dead\)/ in any resolved URL)
  - Button PNG hues inspire the CSS Button variants only. The files are never copied into assets/ (technical spec v2 §4.3)
  - Never invent a filename or mapping. Copy a kit PNG from repo images/ in the same task that adds its KIT_FILES entry (frontend.md)
  - KIT_FILES and CARD_FILES use `satisfies Record<KitId|CardId, …>`, so a new kit or card cannot ship without art (compile-time) and the test covers all 16 kits and 31 cards
  - Activated art only for cards currently in activePersistentEffects (asset-lookup.ts header, PROTOCOL_VERSION 19 ruling 2026-08-02)
  - Hidden card identity uses the attack verso, never an instance id (CardChoiceTile 'Hidden card', designer 2026-08-24, L44-01/L44-05)
  - Unspied opponent plays and buys fly versos, and Spyed or public plays fly face art (L51-16, opponent-token-chips.ts)
  - Values printed on the PNGs (costs, recycle, shields, kit starting resources) are ignored. Live values come from catalog and view overlays: CostDisplay, the LifeCountBadge damage badge and ResourceIcon (designer 2026-09-21: 'Ignore printed PNG costs, recycle, and shields; Classic values stay')
  - Home decoration uses the attack verso, Basic attack, Mirror, and the Untouchable / Assassin / Scientific / Kamikaze portraits, all aria-hidden (home.tsx HomeArt)
  - Lobby rules (L70-01: host excluded kits, Random only, human turn seconds 5–180) shows Random with the opponent placeholder face. Excluded kits are greyed portraits. A redesign must keep a distinct Random face and the excluded-kit state
- **Notes:** Total shipped client PNGs: 16 kits, 80 card faces (62 base/upgraded + 18 activated), 7 backs/logos/placeholder, 4 resource icons. The repo images/ folder has 123 files, a superset. The lobby rules panel and kit-picker Random face came with L70-01 (after Lot 61). That surface belongs to the lobby inventory, but its art dependency is listed here.

### `global-art-lot63-gambler-roulette` — Gambler portrait and Roulette art (base, upgraded, activated) · `Lot 62+`

- **Files:** `apps/client/src/design/asset-lookup.ts`, `apps/client/src/design/asset-lookup.test.ts`, `apps/client/src/assets/kits/Gambler.png`, `apps/client/src/assets/cards/Roulette.png`, `apps/client/src/assets/cards/Roulette +.png`, `apps/client/src/assets/cards/Roulette (activated).png`, `apps/client/src/assets/cards/Roulette + (activated).png`, `docs/agent/decisions.md`, `docs/backlog_v6.md`
- **Purpose:** Art for the 16th kit (Gambler) and its circulating persistent special Roulette (L63-01 / L63-03; Factory renamed Roulette 2026-09-21). The armed Roulette thumb on the kit row and opponent seats, and its inspect, use the activated filenames.
- **Controls:**
  - No interactive controls
- **States:**
  - Gambler portrait (KIT_FILES.gambler = Gambler.png) shown wherever KitPortrait shows a revealed Gambler
  - Roulette in hand, shop or pool: cream Roulette.png (base) or pink 'Roulette +.png' (upgraded)
  - Roulette active (activePersistentEffects): 'Roulette (activated).png' / 'Roulette + (activated).png', byte-identical copies of the base and upgraded faces (test-locked in both client assets/cards and repo images/)
  - Roulette card-lives badge under the active thumb (counter, L56-06 / L63-02)
- **Keep:**
  - The activated Roulette faces reuse the cream and pink art. Do not invent a thick-red activated border (designer 2026-09-21 'Roulette activated faces reuse cream/pink art')
  - Do not reuse another card's PNG as a placeholder (designer 2026-09-20 'Gambler / Factory test-art placeholders')
  - CARDS_WITH_ACTIVATED_ART includes 'roulette' (asset-lookup.test.ts)
  - The id is 'roulette' with no 'factory' alias (decisions 2026-09-21, PROTOCOL_VERSION 37 → 38)
- **Notes:** The 2026-09-21 art drop replaced the Gambler and Roulette 'Test' placeholders and also refreshed Invisibility, Points Generator, Sentence, Super Absorber and Upgrade Point Thief faces (test 'cream unupgraded and pink upgraded faces for the 2026-09-21 art drop'). The Gambler portrait PNG prints starting resources (1 life, 0 points, …). Those printed values are not authoritative.

### `global-text-input-no-ios-zoom` — Mobile text-entry font-size rule (16 px minimum, no iOS focus zoom) · `Lot 62+`

- **Files:** `apps/client/src/screens/table/chat-log.tsx`, `apps/client/src/screens/table/table-chat.tsx`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/home.tsx`, `apps/client/src/feedback/feedback-dialog.tsx`, `apps/client/src/screens/admin/admin-password-gate.tsx`, `apps/client/src/screens/admin/admin-filters-form.tsx`, `apps/client/src/screens/admin/admin-overview-modules.tsx`, `apps/client/src/screens/admin/admin-classes.ts`, `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/design/components/dialog.tsx`, `apps/client/src/index.css`, `apps/client/index.html`, `apps/client/node_modules/tailwindcss/preflight.css`
- **Purpose:** A rule that applies everywhere. Every input, textarea and select a player can focus must have a computed font-size of at least 16 px, so iOS Safari does not zoom the page on focus. Chat, nickname, game code, feedback and the admin password already meet it. Commit 6372d04 (7 Oct 2026, PR #73, after Lot 70 chat) fixed the chat input by changing its class from text-sm to text-base. At the 1de498d audit neither docs/agent/frontend.md nor docs/agent/decisions.md recorded the rule and no test checked it, so a V7 restyle could bring the zoom bug back without anyone noticing. For /admin, Lot 80 records it (frontend.md › Admin tool mode, ADMIN_FIELD_CLASS) and pins every admin field with a test.
- **Controls:**
  - Nickname input, NicknameField (home.tsx:800-815), shown on the online, solo and tutorial paths (home.tsx:507, 604, 734). maxLength 24, autoComplete=nickname, placeholder 'Your name', disabled while busy. Calls onNicknameChange. 16 px through inputClassName (home.tsx:70-75, 'font-sans text-base').
  - Game code input (home.tsx:527-538). Forces uppercase in onChange, maxLength 6, autoComplete=off, spellCheck=false, placeholder 'ABCDEF', disabled while busy. Calls onJoinCodeChange; the form submits joinGame through the Join button. 16 px.
  - Lobby chat composer (lobby.tsx:237-242, which renders ChatLog with canWrite always on, chat-log.tsx:62-74). Text input name=chat-body, maxLength 200, aria-label 'Message', placeholder 'Message', plus a green compact Send button. Enter or Send submits; empty or whitespace-only text is dropped on the client and the form resets after a send. 16 px since 6372d04 (min-h-11, font-sans text-base, placeholder ink-muted/70).
  - Table chat composer: the same ChatLog inside a Dialog opened by the Chat IconButton next to Forfeit (table-chat.tsx:38-70). The composer only renders when canWrite is true. On open, the Dialog focuses the first focusable element, which is the message input (dialog.tsx:84-101).
  - Feedback dialog Message textarea (feedback-dialog.tsx:231-240). maxLength 4000, min-h-28, placeholder from feedbackMessagePlaceholder(kind). 16 px through inputClassName (feedback-dialog.tsx:44-49).
  - Feedback dialog 'Contact (optional)' input (feedback-dialog.tsx:244-252). maxLength 200, autoComplete=email, no type=email. 16 px.
  - Admin password field: the V7 TextField (type=password, autoComplete=current-password) at the 16 px input step; Unlock is off (aria-disabled, still focusable) while busy or empty. Pinned by admin-password-gate.test.tsx › 'the password field uses the 16 px input step' (L80-01).
  - Admin filters (admin-filters-form.tsx): From and To datetime-local inputs, Opponents select all/humans/withBots, Seat count select ('Any seat count' plus 2–8, L80-03), Kit select over KIT_IDS, and an 'Include tutorial matches' checkbox. Every input and select uses ADMIN_FIELD_CLASS (admin-classes.ts): text-v7-input (16 px) at a 44 px height, so the rule holds (L80-03; it broke it at the 1de498d audit with text-sm). Pinned by admin-filters-form.test.tsx › 'every filter field uses the 16 px input step'. The checkbox is not a text field.
  - Admin overview 'Actors' select, both/humans/bots, and the Kit wins 'Show' select, wins/winRate (admin-overview-modules.tsx). Both use ADMIN_FIELD_CLASS (16 px) since L80-05, pinned by admin-overview-modules.test.tsx › 'every select uses the 16 px input step'.
  - Legacy /inbox password input: gone with screens/inbox.tsx (L80-09). /inbox redirects to /admin/feedback (App.tsx).
  - Lobby / solo-menu Table rules dialog: the 'Human turn seconds' range slider, 5 to 180 s, step 1 (lobby-rules-panel.tsx:92-107), plus kit toggles and All / None / Random, all of which are buttons. A range input does not trigger the iOS focus zoom, so no font rule applies. If V7 adds a typed seconds field or a kit search box to the host rules (user: custom rules, banned kits and turn-time changes stay), that field falls under this rule.
- **States:**
  - Compliant: text-base is 1rem, which is 16 px because index.css:63-70 sets no html font-size and the browser default stays.
  - Inherit trap: Tailwind v4 preflight sets 'font: inherit' on input, select and textarea (preflight.css:243-249). The Dialog body is text-sm (dialog.tsx:221-222) and admin labels are text-xs. A V7 field with no explicit 16 px class inside those containers renders at 14 px or 12 px, and iOS zooms.
  - Admin: every admin input and select is 16 px since Lot 80 (ADMIN_FIELD_CLASS). At the 1de498d audit the admin filters form and the overview selects were text-sm, and focusing them on an iPhone zoomed the page.
  - Disabled: home nickname and code inputs are disabled while busy (connecting or solo launch pending). Join is disabled until canJoin. Admin Unlock is off (aria-disabled, focusable) while busy or when the password is blank. Feedback Send is disabled until canSend, and its label reads 'Sending…' while busy.
  - Hidden: the chat composer does not render when canWrite is false (finished board or holdout; decisions.md 2026-10-06 'Room chat outlives one match'). Only the transcript shows, with 'No messages yet.' when it is empty.
  - Keyboard open: the iOS on-screen keyboard shrinks visualViewport. See the global-visual-viewport-fit surface for how the overlays follow it.
  - Not reproducible on desktop: neither Chrome DevTools device mode nor the headless 390×844 post-lot gate (frontend.md) shows the iOS focus zoom. Verify by reading the computed font-size of every focusable field, or on a real iOS Safari.
- **Keep:**
  - Every focusable text-entry element (text, password, email, numeric, datetime-local, textarea, select) on every screen, including Dialogs and /admin if it is meant to be used on phones, has a computed font-size of at least 16 px. Fixed for chat in 6372d04 after Lot 70; already true for home since Lot 11 (1a504f7), feedback since L47-03 (43b1224) and the admin password since Lot 61 (6b021b3).
  - Zoom is prevented by font size, not by the viewport meta. index.html:5 is 'width=device-width, initial-scale=1.0' with no maximum-scale and no user-scalable=no, so pinch zoom still works. This is the current code; no decision records it.
  - The rule is about the computed pixel size, not the class name. If V7 changes the html font-size or the type scale, text-base may no longer be 16 px.
  - Player-facing inputs keep a tap height of at least 44 px (min-h-11) on home, chat and feedback.
  - Chat composer: at most 200 characters, aria-label 'Message', placeholder, a Send button, submit on Enter, empty or whitespace text not sent (the server also rejects it, decisions.md 2026-10-06 Lot 70), the form resets after a send, and the transcript scrolls to the bottom when a message arrives (chat-log.tsx:24-30).
  - Field attributes stay: nickname maxLength 24 and autoComplete=nickname. Join code is uppercased with maxLength 6, autoComplete off and spellCheck off. Feedback message maxLength 4000; contact maxLength 200 with autoComplete=email. Passwords use autoComplete=current-password.
  - The placeholder colour (ink-muted/70) and the focus-visible outline on home and feedback inputs stay.
- **Notes:** I marked this true because the chat input (Lot 70) and its zoom fix (6372d04) came after Lot 61. The 16 px class on home, feedback and admin password inputs is older. At the 1de498d audit five copies of inputClassName existed (home.tsx:70, feedback-dialog.tsx:44, inbox.tsx:35, admin-password-gate.tsx:11, admin-filters-form.tsx:9), plus inline classes in chat-log.tsx:69 and admin-overview-modules.tsx:61-64,272. Lot 80 removed the admin copies: inbox.tsx is deleted, the gate uses the V7 TextField, and every other admin input and select uses ADMIN_FIELD_CLASS (admin-classes.ts), each pinned by a 16 px test. Outside /admin no shared Input primitive enforces the rule in one place. home.tsx line numbers in this checkout are 70-75 for inputClassName, not the 51-56 the brief cites.

### `global-visual-viewport-fit` — Visible-viewport sizing for overlays and table (on-screen keyboard and device frame)

- **Files:** `apps/client/index.html`, `apps/client/src/index.css`, `apps/client/src/design/components/visual-viewport.ts`, `apps/client/src/design/components/dialog.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/felt-collapse.ts`, `apps/client/src/help/hint-overlay.tsx`
- **Purpose:** Keeps Dialogs, the table felt and first-game hint cards inside the rectangle the player can actually see. That rectangle is window.visualViewport, which shrinks when the iOS or Android keyboard opens over a focused chat or feedback field. The code used to be sized from 100dvh / fixed inset-0. The documented reason for the switch is Chrome DevTools device mode (L53-07); keyboard handling is a side effect.
- **Controls:**
  - No control of its own. It reacts to window resize, visualViewport resize, visualViewport scroll (Dialog only) and orientation changes.
  - Dialog: the overlay is position:fixed at the visualViewport offsetTop, offsetLeft, width and height, re-synced on vv resize, vv scroll and window resize (useOverlayViewportBox, dialog.tsx:41-66, 171-186). Clicking the overlay closes it unless closeOnOverlayClick is false. Esc closes it. Tab and Shift+Tab are trapped (dialog.tsx:102-158). On open, focus goes to the first focusable element, which is the message input for table chat; on close, focus returns to the element that had it.
  - Table: a felt measure reads readVisualViewportBox() height and width on ResizeObserver, window resize and vv resize, but not vv scroll (table.tsx:425-452). It feeds feltCollapseFromCounts (table.tsx:1013-1021).
  - Hint overlay: places the coach card against the visualViewport width and height and re-places it on vv resize (hint-overlay.tsx:57-95). Hidden while a dialog is open.
- **States:**
  - No visualViewport API: falls back to window.innerWidth and innerHeight with zero offsets (visual-viewport.ts:15-31).
  - Keyboard open: the visualViewport height drops. The Dialog overlay shrinks to the visible area, and its panel max-height is 100% of the overlay, so the body scrolls inside and the input stays above the keyboard.
  - Short viewport: when the visualViewport height is 500 px or less (SHORT_VIEWPORT_COLLAPSE_PX, felt-collapse.ts:25 and 76), the table collapses Incoming, opponents and the action log into buttons. An open keyboard can cross this threshold behind the chat Dialog.
  - DevTools device mode: dvh can report the desktop window, which is why visualViewport is used (decisions.md 2026-09-01 L53-07).
  - Full-bleed chain: html, body and #root are 100% with overflow hidden (index.css:63-84). Home and lobby scroll inside #root; the table shell is h-full and does not scroll.
- **Keep:**
  - Dialog overlay tracks the live visualViewport box (offsets plus size) on resize and scroll, uses items-start, the panel is my-auto with max-h-full and max-width min(preferred, 100%), the body scrolls and the footer wraps (frontend.md Dialog; decisions.md 2026-09-01 L53-07).
  - Never size overlays or the table from 100dvh or fixed inset-0. The table is h-full of #root (decisions.md 2026-09-01 'Table always fills the visible screen' and 'Full-bleed is a 100% chain').
  - html, body and #root stay 100% with overflow hidden. Home and lobby scroll inside #root (decisions.md 2026-09-01 'Home menu scrolls').
  - The table chrome collapse threshold reads the visualViewport height, not innerHeight alone (felt-collapse.ts:25, 76).
  - Hint cards are clamped to the visualViewport width and height (hint-overlay.tsx:66).
  - Viewport meta stays 'width=device-width, initial-scale=1.0' (index.html:5).
- **Notes:** Introduced in Lot 53 (L53-07), before Lot 61. Listed here because the iOS 16 px rule and the keyboard both depend on it. The Dialog listens to vv scroll but the table measure does not. A V7 overlay that needs to track the keyboard (for example a bottom-sheet chat) should reuse readVisualViewportBox with both resize and scroll listeners.


## Home and onboarding

### `home-beta-badge` — Beta badge

- **Files:** `apps/client/src/screens/home.tsx`
- **Purpose:** Tells testers the game is a beta.
- **Controls:**
  - None. A non-interactive aside, data-zone='beta-card'.
- **States:**
  - Shown in every Home mode (hub, online, solo, tutorial), absolutely positioned top-right.
- **Keep:**
  - The text is the word 'Beta' only: no Beta paragraph, no protocol version (not even a tooltip), no Reset help, no delayed-resolution pitch (L51-03, technical spec v6 §5.1 hub chrome).
- **Notes:** The What's new 'New' button is placed just to its left (right-[5.75rem] / sm:right-28). Lot 51 retired the 'Protocol vNN' text from Home and Lobby.

### `home-whats-new` — What's new button and dialog · `Lot 62+`

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/screens/whats-new-dialog.tsx`, `apps/client/src/help/release-storage.ts`, `packages/shared/src/release-notes.ts`
- **Purpose:** Shows player-facing release notes, auto-opens the latest unseen update, and keeps the full dated log one tap away.
- **Controls:**
  - Compact green 'New' Button (data-whats-new-button). aria-label is "What's new", or "What's new (unread)" when unread. Absolutely positioned top-right. Opens the dialog with scope 'history'.
  - Red unread dot (data-whats-new-unread, bg-cta-red) on that button while localStorage['card-battle.v6.lastSeenReleaseId'] is not the latest id.
  - Dialog "What's new" with a 'Got it' button (green, compact).
  - Esc and overlay click also close it.
  - Every close calls markLatestReleaseSeen() and clears the dot.
- **States:**
  - Auto-open on Home mount when the latest note is unseen, with scope 'current' (latest entry only, currently lot-72).
  - History scope: every entry, newest first, with 'Latest' under the first title.
  - Each entry shows a date eyebrow and a title. Before/after items show a card thumb (cardId) or kit portrait (kitId) when present, otherwise text only, as 'Before.' and 'After.' lines. When additions are non-empty, a 'New' section lists a kit portrait or card thumb plus a body.
  - The auto popup is checked again after Back to the hub and after a manual How to play close. It reopens only if the latest note is still unseen. With localStorage unavailable it reopens every time.
  - Can auto-open on top of the solo menu when Home mounts from solo Play again.
  - The New button is never disabled, even while connecting or launching.
- **Keep:**
  - The auto popup shows only the current update. New lists every dated entry (L65-05, decisions 2026-09-28).
  - How to play does not block What's new (release-storage.ts shouldAutoOpenWhatsNew).
  - Copy keeps Before and After, one short sentence each. Bug fixes read 'Fixed some bugs.' (decisions 2026-09-29).
  - The catalog is shared, newest first. Unshipped pull requests append to the open id. Shipped entries are never edited except to correct their own text (frontend.md, release-notes.ts header).
  - The control is small and top-right, not a hub action-row button (whats-new-dialog.test.ts: HubView must not contain onOpenWhatsNew; data-whats-new-button must sit near 'absolute').
  - Source-text tests check home.tsx for: "What's new", WhatsNewDialog, hasUnseenReleaseNotes, shouldAutoOpenWhatsNew, markLatestReleaseSeen, data-whats-new-unread, data-whats-new-button within 400 characters of variant="green", bg-cta-red, no 'bg-cta-green', "useState<WhatsNewScope>('current')", "setWhatsNewScope('history')", "setWhatsNewScope('current')", 'scope={whatsNewScope}'. They check the dialog for releaseNotesForScope, data-whats-new-scope, 'Latest' and 'Got it'.
- **Notes:** Introduced in L63-07. The current/history split is L65-05. The 'New' additions section is Lot 63. The storage key holds a release id, not a flag. There are no accounts.

### `home-hub` — Home hub

- **Files:** `apps/client/src/screens/home.tsx`
- **Purpose:** The branded landing screen. Players choose Online, Solo or Tutorial, or open How to play or Feedback.
- **Controls:**
  - 'Play online' (green) calls requestPath('online'). The soft gate may open How to play first.
  - 'Play solo' (green) calls requestPath('solo').
  - 'Tutorial' (green) calls requestPath('tutorial').
  - 'How to play' (orange) opens HowToPlayDialog manually, with no pending target.
  - 'Feedback' (orange) opens FeedbackDialog in manual mode with screen 'home'.
  - All five are disabled while busy (status connecting or soloLaunchPending).
- **States:**
  - Default.
  - Busy: every button disabled, status line shows 'Connecting…' or 'Starting solo game…'.
  - Error: red role=alert line (for example after a kick, 'Disconnected' plus 'You were kicked.', or a failed create).
  - First visit: the soft gate is armed and What's new may auto-open on top.
  - Remounting after leaving a room always starts in hub mode, except after solo Play again, which opens the solo menu.
- **Keep:**
  - Copy: eyebrow 'Turn-based card battle', H1 'Card Battle', helper 'New here? Open How to play once, then pick Tutorial, Online, or Solo.'
  - The nickname is collected inside each path, not on the hub (frontend.md Home L51-03).
  - No Inbox link, no Admin link, no protocol footer, no Reset help control, no delayed-resolution pitch (L51-03, feedback-surfaces.test.ts: home.tsx must not contain 'Inbox').
  - The Tutorial button is always live, never a dead or 'coming soon' button (L42-04).
  - Decorative HomeArt is aria-hidden: attack card back, Basic attack, Mirror, and the Untouchable / Assassin / Scientific / Kamikaze portraits. The art sits above the content on phones and to the right on md and up.
  - main keeps 'overflow-y-auto overscroll-contain', never 100dvh and never overflow-hidden, so the hub and menus scroll on short viewports (Lot 53 follow-up, visual-viewport.test.ts).
  - A Motion fade and slide of 0.35 s plays when the mode changes.
- **Notes:** The mode transition does not check prefers-reduced-motion. The Dialog component does.

### `home-how-to-play-dialog` — How to play primer dialog

- **Files:** `apps/client/src/screens/how-to-play-dialog.tsx`, `apps/client/src/screens/how-to-play-content.ts`, `apps/client/src/screens/how-to-play-screenshots.ts`, `apps/client/src/assets/how-to-play/`
- **Purpose:** A short first-time primer. The hub opens it manually and through the soft gate; the table opens it from '?'.
- **Controls:**
  - 'Skip' (orange, compact) calls onClose('skip').
  - 'Got it' (green, compact) calls onClose('got-it').
  - Esc and overlay click call onClose('dismiss') (closeOnOverlayClick).
  - Tab focus is trapped inside the dialog.
- **States:**
  - Lead line: 'This is a short primer — not the full rules.'
  - Nine sections in order: Goal, Turns, Lives, Points, Cards, Upgrade, Kits, Special cards, Shop.
  - Resource glyph rows: Lives + Shield on lives, Points on points, Upgrade points on upgrade.
  - A screenshot img appears only when the PNG exists. Today the folder holds only .gitkeep, so no images render.
  - Manual open: Skip and Got it mark the primer seen; dismiss only closes.
  - Gated open: see home-how-to-play-soft-gate.
- **Keep:**
  - Section order and the must-say facts are locked by how-to-play-content.test.ts: 25 lives cap, 2 to 8 players, exactly one action, Draw gives points, 1 upgrade point, Spy/Random on kits, Gambler 5–100 weighted with 3 specials and 1-in-10, Block chain and Poison does not tick, the pool and 'others do not see which card'.
  - Never say: delayed, double, not a card, does not deal a card, usually, shared card.
  - Screenshot names are designer-owned (one-action.png, resources.png, hidden-kit.png, shop.png). Never invent art (spec v6 §5.1, L42-01).
  - The same dialog is reused by the table '?' (L42-03 / L43-05) and must open without sending an intent.
- **Notes:** The dialog dates from Lot 42 / Lot 51. Parts of the copy are later: Gambler in Lot 64, forfeit rewards and Spy Thief in Lot 71, pool fog, Block/Poison in lot-72. The spec v6 §5.1 table was not updated for these. how-to-play-content.test.ts asserts that the designer PNGs are absent, so adding them will fail that test.

### `home-how-to-play-soft-gate` — How to play soft gate

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/help/help-storage.ts`
- **Purpose:** On the first visit, makes the player see the primer once before entering a play path.
- **Controls:**
  - The first click on Play online, Play solo or Tutorial while localStorage['card-battle.v6.howToPlaySeen'] is not '1' opens How to play with pendingTarget set.
  - In gated mode, every close (Skip, Got it, Esc, overlay) sets the key to '1' and then switches to the chosen path.
- **States:**
  - Unseen: the gate is armed.
  - Seen: the path opens directly.
  - localStorage unavailable: hasSeenHowToPlay is always false, so the gate opens on every path click, and markHowToPlaySeen does nothing.
- **Keep:**
  - Skip and Got it both continue into the intended path (L42-02).
  - A second visit does not gate.
  - There is no hub Reset help control. resetHelpStorage is for tests only (L51-03, spec v6 §5.1). Testers clear the key by hand.
  - After a manual (non-gated) close, the What's new auto-open is checked again.
- **Notes:** The code gates entry to a path (the hub button click), not the later form submit. Spec v6 §5.1/§9 says 'submit'; frontend.md matches the code.

### `home-path-header` — Path header (Online / Solo / Tutorial)

- **Files:** `apps/client/src/screens/home.tsx`
- **Purpose:** The shared top of each path: navigation, Feedback, title and connection status.
- **Controls:**
  - 'Back' (orange) calls goHub(). This does nothing while busy, and re-checks the What's new auto-open.
  - 'Feedback' (orange) opens the manual FeedbackDialog (screen 'home').
  - Both buttons are disabled while busy.
- **States:**
  - Eyebrow 'Card Battle', an H1 for the path, and a subtitle.
  - StatusBlock: the status line, plus a red error line with role=alert.
- **Keep:**
  - Feedback is reachable from every path header, not only the hub (L47-03 / L57-05, frontend.md).
- **Notes:** Titles: 'Play online', 'Play solo', 'Tutorial'. Subtitles are listed on each path surface.

### `home-nickname` — Nickname field and handling

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/App.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/server/src/rooms/game-room.ts`
- **Purpose:** Collects the display name used to create, join, start solo or start the tutorial, and attaches it to feedback.
- **Controls:**
  - Text input labelled 'Nickname'. maxLength 24, autoComplete 'nickname', placeholder 'Your name', disabled while busy.
  - In the Online path the field is outside both forms, so Enter in it does nothing.
  - In the Solo and Tutorial paths it is inside the form, so Enter submits Start.
- **States:**
  - Empty or whitespace only: Create, Join, Start solo game and Start tutorial are disabled, with no reason shown.
  - Busy: disabled.
  - Filled: the same value is reused across the Online, Solo and Tutorial paths.
- **Keep:**
  - One App-level nickname is shared by all three paths and by the Home feedback payload, trimmed and omitted when empty.
  - The client trims before sending. The server trims and rejects an empty name or one longer than 24 characters with 'A nickname is required to join.'.
  - Nicknames are not unique (decisions L57, claim picker copy).
  - The nickname is kept in memory only. It survives returning to Home in the same tab but not a page reload. There is no localStorage.
- **Notes:** Any redesign that moves the field onto the hub contradicts frontend.md ('Nickname is collected inside each path, not on the hub').

### `home-online-path` — Play online: create or join

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/server/src/rooms/game-code.ts`
- **Purpose:** Create a private room and become host, or join a room with its six-letter code.
- **Controls:**
  - Nickname field (see home-nickname).
  - Create form: 'Create' (green submit). Disabled until a nickname is typed and the client is not busy. Calls createGame.
  - Join form: 'Game code' input. Each keystroke is uppercased. maxLength 6, autoComplete off, spellCheck false, placeholder 'ABCDEF', disabled while busy.
  - 'Join' (green submit). Enabled only with a nickname and a trimmed code of exactly 6 characters. Enter in the code field submits Join.
  - Back and Feedback in the header.
- **States:**
  - Connecting: status 'Connecting…', both inputs and all buttons disabled.
  - Connected: 'Connected' shows briefly, then the Lobby renders.
  - Failed: 'Could not join' plus the server text: room not found, 'This table is full.', 'This table has no more spectator space.', 'This tutorial cannot be joined.', or the protocol-mismatch text.
  - After a kick: Home remounts on the hub, not on this path.
- **Keep:**
  - Create seats you as the lobby host.
  - Join into a lobby seats an unready guest, or opens the claim picker when reserved disconnected seats exist.
  - Join into a playing table makes you a walk-in spectator, with the claim picker when claimable seats exist (L57-07 / L57-13).
  - Codes are sent uppercased. Server codes are A–Z only.
  - Copy: subtitle 'Create a room for friends, or join with a six-letter code.', 'Create a game' with 'Host gets a code to share. Start from the lobby when everyone is seated.', and 'Join a game'.
- **Notes:** The client does not check that the code is letters only; the server rejects bad codes. The Create helper text predates guest Ready (Lot 57).

### `home-solo-path` — Play solo menu

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/bots/format-bot-difficulty.ts`, `packages/shared/src/domain/player-count.ts`, `packages/shared/src/domain/bot.ts`
- **Purpose:** Start a match against bots right away, with no lobby. Sets opponent count, difficulty, table rules and your hidden kit.
- **Controls:**
  - Nickname field.
  - Opponents: buttons 1 to 7 (SOLO_OPPONENT_COUNTS), default 1. The selected one is green, the others orange; there is no aria-pressed. Disabled while busy.
  - Difficulty: Easy / Normal / Hard (BOT_DIFFICULTIES via formatBotDifficulty), default Normal. Same styling and disabling as Opponents.
  - Table rules panel (see home-solo-table-rules).
  - 'Your kit' block, hidden when randomOnly is on: KitPortrait (Random placeholder or the picked kit), a label ('Random kit' or the kit name), and 'Choose kit' (orange, disabled while busy), which opens the kit picker.
  - 'Start solo game' (green submit). Disabled until a nickname is typed and the client is not busy.
  - Back and Feedback in the header.
- **States:**
  - Default: 1 opponent, Normal, Random kit, default rules.
  - Busy: 'Starting solo game…', all controls disabled except the rules gear and the New button.
  - Failed: the error shows and the menu stays.
  - Seeded from solo Play again (see home-solo-play-again-seed).
  - randomOnly on: the 'Your kit' block is hidden.
  - When a rule change excludes the currently picked kit, the pick resets to Random.
- **Keep:**
  - There is no lobby. Copy: 'Fight bots immediately — no lobby, same rules as online.' (L17-01).
  - All bots share one difficulty.
  - With randomOnly on, submit forces kitSelection 'random' and no chooseKit is sent.
  - The kit is hidden from opponents: 'Hidden from opponents. Random is the default.' (L49-02).
  - Total seats are 1 human plus N bots, at most 8 (MAX_PLAYERS).
- **Notes:** Opponent and difficulty selection is shown by color alone (green or orange).

### `home-solo-table-rules` — Table rules panel (custom rules: excluded kits, Random only, turn time) · `Lot 62+`

- **Files:** `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/home.tsx`, `apps/client/src/screens/lobby.tsx`, `packages/shared/src/protocol/lobby-rules.ts`, `packages/shared/src/protocol/action-reject.ts`, `docs/spec_bataille_des_cartes_en.md`
- **Purpose:** Host rules for a match: exclude kits, deal every kit at random, and set the human turn time. The solo menu uses it editable. The online lobby uses the same component, editable for the host and read-only for guests.
- **Controls:**
  - Summary card: clock icon with '{turnTimeSeconds}s'. RandomMark (opponent placeholder plus 'Random') when randomOnly is on. KitFaceRow of all 16 small portraits, with excluded ones gray at 40% opacity.
  - Gear IconButton, aria-label 'Table rules'. Shown only when editable. Opens the 'Table rules' dialog.
  - Dialog: 'Human turn' range slider from MIN_TURN_TIME_SECONDS 5 to MAX 180, step 1, aria-label 'Human turn seconds', with a '{N}s' readout. Keyboard arrows work natively.
  - Dialog: 'All' (green) calls allowEveryKit.
  - Dialog: 'None' (orange) calls excludeEveryKitButFirst and keeps the first Classic kit allowed.
  - Dialog: 'Random' toggle (green when on, aria-pressed) flips randomOnly.
  - Dialog: kit grid of toggle buttons (aria-pressed = allowed, aria-label = kit name). The button is disabled when its kit is the last one allowed.
  - Dialog: 'Close' (green). Esc and overlay click also close.
- **States:**
  - Editable: the solo menu always, and the host in the online lobby.
  - Read-only: online guests see the clock and kit faces with no gear.
  - randomOnly on or off.
  - Default display is 60s (DEFAULT_TURN_TIME_SECONDS).
  - When turnTimeSeconds is outside 5–180 (a server env override), the slider sits at 180 while the summary shows the real value.
  - Solo with the slider never moved: includeTurnTime is false, no time is sent, and the server keeps its TURN_DURATION_MS while the panel still reads 60s.
  - Solo after the slider moved: includeTurnTime is true and the time is sent.
  - Solo seeded from Play again: includeTurnTime is true when the seed time is within 5–180.
  - The gear is not disabled during a solo launch.
  - Hidden on the Tutorial path.
- **Keep:**
  - The designer said in this session to keep custom rules, excluded kits and turn-time changes in both the solo menu and the online lobby.
  - Rules spec §6 (lines 249–253): the host sets the rules before start; guests see them before Ready; Play again keeps them; the tutorial does not use them.
  - At least one kit stays allowed. The client disables the last kit; the server rejects with 'set-lobby-rules-no-kit'.
  - An excluded kit cannot be chosen. The picker filters it out; the server rejects with 'choose-kit-excluded'.
  - Random draws use only allowed kits.
  - Random only: nobody picks a kit and the kit picker is hidden.
  - Turn time is whole seconds from 5 to 180, default 60. The server rejects anything else with 'set-lobby-rules-turn-time'. Bots keep their own think time.
  - Only the host gets the settings icon. The popup layout is slider on top, then All / None / Random, then the kit portraits (decisions 2026-10-06 'Rules chrome and lobby chat').
  - Online lobby: every change sends setLobbyRules with the full excludedKitIds and randomOnly. turnTimeSeconds is included only when the slider moves.
- **Notes:** Lot 70, PROTOCOL_VERSION 44 to 45. Solo keeps the rules locally and sends them once at launch. In the online lobby, each slider step sends an intent immediately (onChange).

### `home-solo-kit-picker` — Choose kit dialog (solo and lobby)

- **Files:** `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/screens/lobby-kit-picker.ts`, `apps/client/src/screens/table/kit-inspect-details.tsx`
- **Purpose:** Pick your own hidden kit, or keep Random, after reading the kit's details.
- **Controls:**
  - Grid tiles: Random first, then each allowed kit. aria-pressed marks the current pick, aria-label is the kit name. Clicking a tile opens its preview.
  - Grid 'Close' (green) closes the dialog.
  - Preview 'Back' (orange) returns to the grid.
  - Preview 'Select this kit' (green) calls onSelect and closes.
  - Esc or overlay click in preview returns to the grid. In the grid it closes the dialog.
- **States:**
  - Grid: title 'Choose kit', lead 'Opponents cannot see your kit. Random is the default.', current pick ringed in orange.
  - Kit preview: title is the kit name, body is KitInspectDetails (starting stats, attack/action versos with counts, specials, traits, Draw and special costs).
  - Random preview: title 'Random kit', body is the RandomKitDetails copy.
  - Only allowed kits are listed (Lot 70 filter). Random is always listed.
- **Keep:**
  - Opponents never see another seat's pick (L49-02, lobby-kit-privacy.test.ts).
  - Random is the default label ('Random kit').
  - Solo sends chooseKit before startGame when the pick is not random.
  - The same dialog is used in the online lobby.
- **Notes:** The dialog is L49-02; the allowedKitIds filter was added in Lot 70. The RandomKitDetails copy still says 'one of the 16 kits … the same way as before this picker existed', which ignores host exclusions.

### `home-solo-play-again-seed` — Solo Play again reopens the solo menu · `Lot 62+`

- **Files:** `apps/client/src/screens/solo-menu-seed.ts`, `apps/client/src/App.tsx`, `apps/client/src/screens/home.tsx`
- **Purpose:** After a finished solo match, Play again goes back to a pre-filled solo menu instead of dealing a new match.
- **Controls:**
  - Triggered by End 'Play again', which belongs to the End surface.
  - Afterwards the player starts the next match with 'Start solo game'.
- **States:**
  - Seed is built when exactly 1 human seat exists, that seat is you, and there are 1 to 7 bots.
  - No seed for 2 or more humans (rematch lobby through playAgain), walk-in spectators, or the tutorial.
  - Difficulty is the shared bot difficulty, or 'normal' when the bots differ.
  - kitSelection is the kit you actually played (finalTable.self.kitId), even if you had picked Random.
  - lobbyRules come from the finished view, or defaultLobbyRules() when missing.
  - Home mounts in 'solo' mode, applies the seed once, then clears pendingSoloMenu.
- **Keep:**
  - L67-01 / decisions 2026-09-28: solo Play again leaves the room and opens the solo menu with the same kit, bot count and shared difficulty. It does not start the match.
  - Play again keeps the table rules (solo-menu-seed.test.ts).
  - The nickname comes back with it, from App state.
  - The room transcript ends when the solo room closes (decisions 'Room chat outlives one match').
- **Notes:** Lot 67 replaced Lot 66's instant restart. Rules seeding is Lot 70.

### `home-tutorial-path` — Tutorial path

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/net/use-room-connection.ts`
- **Purpose:** Starts the scripted 1v1 tutorial on the real table.
- **Controls:**
  - Nickname field.
  - 'Start tutorial' (green submit). Disabled until a nickname is typed and the client is not busy. Calls startTutorialGame.
  - Back and Feedback in the header.
- **States:**
  - Default.
  - Busy: the status reads 'Starting solo game…', the same copy as solo.
  - Failed: an error is shown.
- **Keep:**
  - Nickname only: no kit picker, no bots, no table rules. Copy: 'A scripted 1v1 on the real table. Nickname only — kits and bots are chosen for you.' (L45-04).
  - The client sends create({tutorial: true}) then startGame and skips the lobby. The server seats the scripted bot. No turn timer. A tutorial room cannot be joined by code.
  - Finishing or skipping the tutorial does not set the hints skipAll flag (L46-03, tutorial-hints-independence.test.ts: home.tsx must not contain 'skipAllHints').

### `home-feedback-dialog` — Feedback dialog (manual, Home)

- **Files:** `apps/client/src/feedback/feedback-dialog.tsx`, `apps/client/src/feedback/feedback-form-copy.ts`, `apps/client/src/feedback/build-feedback-payload.ts`, `apps/client/src/feedback/submit-feedback.ts`, `apps/client/src/feedback/submit-gate.ts`, `packages/shared/src/feedback/report.ts`
- **Purpose:** Testers send a bug, confusion or idea report with no room open.
- **Controls:**
  - Kind: Bug / Confusion / Idea buttons, default Bug. Selected is green; there is no aria-pressed.
  - About: multi-select chips UI / Gameplay / Card / Shop / Bot / Tutorial / Other, with aria-pressed. The hint under them changes by kind.
  - 'Message' textarea: maxLength 4000, placeholder changes by kind.
  - 'Contact (optional)' input: maxLength 200, autoComplete 'email'.
  - 'Cancel' (orange). Disabled while sending.
  - 'Send' (green). Disabled unless the form can be sent. Reads 'Sending…' while busy.
  - Esc and overlay click act as Cancel, even while a send is in flight.
- **States:**
  - Empty message: Send disabled.
  - Bug with no About chip and a non-empty message: red role=status hint 'Pick at least one area to send a bug.' and Send disabled.
  - Sending: busy.
  - Error: role=alert text. Either the server message ('Not saved (no database)' locally, 429 rate limit text) or 'Could not save — try again'.
  - Success: the dialog closes silently and resets. There is no confirmation.
  - Any dismiss resets the form.
- **Keep:**
  - Home uses manual mode with screen 'home'. The trimmed nickname is attached when typed. No gameCode, logTail or playKind is sent from Home (L47-03, spec v6 §7.1).
  - Never send the seed. protocolVersion is always sent.
  - A synchronous in-flight gate stops a double click from inserting two rows (submit-gate.ts, feedback-dialog.test.ts).
  - A bug needs at least one topic; confusion and idea do not (L47-06).
  - Submitting works without a Colyseus room.
  - feedback-surfaces.test.ts checks that home.tsx contains 'FeedbackDialog' and 'screen="home"' and does not contain 'Inbox'.
- **Notes:** The same component is used in ask mode on Game over and in manual mode in the Lobby and from the table '!' button; those belong to other areas.

### `solo-menu-rules` — Solo menu table rules, kit pick and Start solo · `Lot 62+`

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/screens/solo-menu-seed.ts`, `apps/client/src/net/use-room-connection.ts`
- **Purpose:** The solo player is the host: the same rules panel (always editable) and kit pick before an instant bot match with no lobby.
- **Controls:**
  - LobbyRulesPanel with editable=true: gear opens the same Table rules dialog (slider, All / None / Random, kit tiles, Close)
  - Your kit block (hidden when randomOnly): Choose kit opens LobbyKitPickerDialog filtered to allowed kits
  - Opponents count buttons, Difficulty buttons (home area)
  - Start solo game (submit): create room, setLobbyRules (turnTimeSeconds only if includeTurnTime), chooseKit if not random and not randomOnly, addBot × N, startGame
- **States:**
  - includeTurnTime false until the slider is moved (or the seed carries an in-range time); until then the server default clock applies
  - an excluded local pick resets to Random
  - randomOnly forces kitSelection 'random'
  - busy (connecting or soloLaunchPending): pickers disabled; Home stays visible (no Lobby flash)
  - reject during the solo launch: room left, status 'Could not join' with the message
- **Keep:**
  - Solo uses the same rules panel; the host sets rules on the solo menu (rules spec §6 Setup; frontend.md Lot 70)
  - An untouched slider does not send a time (frontend.md Lot 70)
  - Solo Play again reopens this menu with the same kit, bot count, shared difficulty and rules, and does not start the match (L67-01; App.tsx soloMenuSeed with FinishedStateView.lobbyRules)
- **Notes:** Mostly the Home area; listed for the rules emphasis. The panel shows 60s (defaultLobbyRules) while the server may use the TURN_DURATION_MS env default when includeTurnTime is false.

### `home-whats-new-seen-storage` — What's new seen-state storage · `Lot 62+`

- **Files:** `apps/client/src/help/release-storage.ts`
- **Purpose:** Remembers the latest release-note id the browser has seen, so the hub auto-opens What's new once per new id.
- **Controls:**
  - None (consumed by the hub What's new dialog)
- **States:**
  - localStorage['card-battle.v6.lastSeenReleaseId']; unseen while it differs from latestReleaseNote().id; storage failures read as unseen
- **Keep:**
  - Auto-open shows only the current entry (L65-05); How to play does not block What's new (designer 2026-09-20)
- **Notes:** L63-07. Listed because it lives in help/; its UI is the hub's.

### `solo-menu-rules-side-effects` — Solo menu: local kit reset, Random only, and the rematch seed · `Lot 62+`

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/screens/solo-menu-seed.ts`, `apps/client/src/App.tsx`, `apps/client/src/net/use-room-connection.ts`, `docs/agent/decisions.md`
- **Purpose:** The Home solo path keeps rules and kit choice in local React state and sends them in one burst at launch. Its rule-change side effects happen locally and silently, mirroring the server's lobby reset.
- **Controls:**
  - LobbyRulesPanel editable (gear, All / None / Random, kit tiles, slider) -> onSoloRulesChange(next, turnTimeChanged) (home.tsx:648-660).
  - Your kit card: KitPortrait plus label plus 'Choose kit' (orange, disabled while busy) opens LobbyKitPickerDialog with allowedKitIds(soloRules) (home.tsx:662-686, 385-395). Hidden when soloRules.randomOnly.
  - 'Start solo game' (green submit, disabled unless canSubmit: nickname set and not busy) -> onStartSolo(opponents, difficulty, kitSelection, { lobbyRules, includeTurnTime }), where kitSelection is forced to 'random' when Random only (home.tsx:147-155).
- **States:**
  - Selected kit X, then X excluded (tile or None): soloKitSelection silently becomes 'random' (home.tsx:331-336). The card flips to the placeholder and 'Random kit' with no notice.
  - Random only on: the Your kit card is hidden, but soloKitSelection keeps the previous value, and the launch sends 'random' with no chooseKit. Turning Random only off brings the earlier pick back.
  - Kit picker open while rules change: not reachable in solo, because the rules dialog and the picker are separate modal Dialogs.
  - Solo Play again (exactly one human seat, Classic, not a spectator): App builds a seed from the finished view (solo-menu-seed.ts) with kitSelection = finalTable.self.kitId (the kit actually dealt, even if the player had kept Random) and lobbyRules = view.lobbyRules. Home opens straight on the solo path with that state.
  - Seed with Random only on: soloKitSelection is the last dealt kit but hidden. If Random only is turned off, the card shows that kit instead of Random.
  - Launch error (server reject during soloLaunchPending): the room is left and status becomes 'failed' with the reject message as the Home error (use-room-connection.ts:264-280).
- **Keep:**
  - The solo menu uses the same rules panel and rules as online (rules spec §6 Setup 'in the online lobby and on the solo menu'; decisions 2026-10-06).
  - An excluded pick falls back to Random, both on the client and as the server deal backstop (decisions 2026-10-06 Lot 70).
  - Random only sends 'random' and no chooseKit (use-room-connection.ts:577-583).
  - Solo Play again opens the Home solo menu with that human's kit, the bot count, and the shared bot difficulty, and the rules come along (decisions 2026-09-28 Lot 67; solo-menu-seed.ts).
  - Solo launch order: setLobbyRules, then chooseKit, then addBot ×N, then startGame, with soloLaunchPending skipping the lobby flash (frontend.md L46).
- **Notes:** The solo menu has no 'Ready' and no other seats, so the stale-Ready issue does not apply here. Only the silent kit reset and the hidden-but-kept pick do.

### `home-forms-enter-submit` — Home path forms: what Enter does

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/design/components/button.tsx`, `apps/client/src/design/components/icon-button.tsx`
- **Purpose:** Implicit Enter submission on the Online, Solo and Tutorial paths. Coverage differs from path to path.
- **Controls:**
  - Online path: the Nickname field sits outside both forms (home.tsx:506-510), so Enter in Nickname does nothing
  - Online 'Create a game' form has no text field: only the green Create button (type=submit, disabled until the nickname is non-empty and not busy) calls onCreate
  - Online 'Join a game' form: Enter in 'Game code' submits Join only while the Join button is enabled (nickname non-empty, code is 6 characters, not busy). The input is uppercased as typed, maxLength 6, autocomplete off
  - Solo path: the whole menu is one <form> (home.tsx:603). Enter in Nickname starts the solo game when allowed. Opponents / Difficulty / Choose kit / rules buttons are type=button
  - Tutorial path: Enter in Nickname starts the tutorial when allowed
  - Back and Feedback buttons in the path header are disabled while busy
- **States:**
  - busy (connecting or solo launch pending): fields and submit disabled
  - nickname empty: submit disabled, so Enter does nothing
  - join code shorter than 6: Join disabled
- **Keep:**
  - Enter submits only when the matching submit button is enabled (native implicit submission respects disabled)
  - Button and IconButton default to type="button" (button.tsx:37, icon-button.tsx:21); only explicit type="submit" submits. Any new raw <button> inside the solo form must set type="button" or it will start the game
  - Nickname maxLength 24, autocomplete 'nickname'; join code uppercased
- **Notes:** The critic's claim that 'Enter submits create' is inaccurate: Create has no input, so only activating the button submits it. The Feedback dialog has no <form> and no Enter-to-send; in its textarea, Enter inserts a newline.

### `home-how-to-play-dismiss` — How to play: gated vs manual dismissal

- **Files:** `apps/client/src/screens/how-to-play-dialog.tsx`, `apps/client/src/screens/home.tsx`, `apps/client/src/screens/table.tsx`, `docs/agent/frontend.md`, `docs/agent/decisions.md`
- **Purpose:** The primer opens before the first hub path choice (soft gate) or from the '?' / How to play button. What a dismissal means differs between the two cases.
- **Controls:**
  - Gated open (first Play online / Play solo / Tutorial click): Escape, backdrop, Skip and Got it all mark 'card-battle.v6.howToPlaySeen' and continue into the chosen path (home.tsx:212-219)
  - Manual open (hub button or table '?'): Skip / Got it mark it seen; Escape / backdrop ('dismiss') only close
  - After a manual close on Home: openWhatsNewIfDue may auto-open What's new
- **States:**
  - gated with a pending target / manual
  - storage unavailable: hasSeenHowToPlay is false, so the gate shows every time
- **Keep:**
  - During the gate, Escape or backdrop equals Skip and still navigates on (decisions: 'Esc / overlay during a gate: same as Skip')
  - Manual Escape or backdrop does not set the seen key
  - Screenshots only render when the file exists
- **Notes:** L42 / L51-02.

### `home-whats-new-dismiss` — What's new: any dismissal marks the latest entry seen · `Lot 62+`

- **Files:** `apps/client/src/screens/whats-new-dialog.tsx`, `apps/client/src/screens/home.tsx`, `packages/shared/src/release-notes.ts`, `docs/agent/frontend.md`
- **Purpose:** Release-notes popup (auto: latest entry only) and history (New button: every dated entry).
- **Controls:**
  - Escape / backdrop / green 'Got it': closeWhatsNew calls markLatestReleaseSeen ('card-battle.v6.lastSeenReleaseId'), clears the red unread dot and closes (home.tsx:164-168)
  - Hub 'New' button (aria-label "What's new (unread)" when unread): opens scope 'history'
- **States:**
  - auto popup (scope current) on hub load or return when the latest entry is unseen
  - history scope with a 'Latest' tag on the first entry
  - unread dot / no dot
- **Keep:**
  - Every dismissal path counts as seen (same as Got it)
  - The auto popup shows only the latest entry, and the New button shows all entries newest first (L65-05)
  - How to play does not block it; it can auto-open after How to play closes or on returning to the hub
- **Notes:** L63-07 / L65-05.

### `home-connection-status-and-errors` — Home status line + join/create failure alert (StatusBlock)

- **Files:** `apps/client/src/screens/home.tsx:140-142 (busy / canSubmit / canJoin)`, `apps/client/src/screens/home.tsx:431 (HubView StatusBlock), 785 (PathHeader StatusBlock), 819-838 (StatusBlock, role=alert)`, `apps/client/src/screens/status-labels.ts`, `apps/client/src/net/use-room-connection.ts:247-282 (kicked + solo-launch ERROR_MESSAGE), 336-343 (onError), 422-469 (createGame/joinGame catch -> failed), 549-635 (solo/tutorial catch), 875-877 (describe)`, `apps/client/src/App.tsx (Home is the fallback route whenever view is null; nickname/joinCode are App useState)`, `apps/server/src/rooms/game-room.ts:444-490 (onAuth ServerErrors), 693-720 (onJoin repeats nickname/full checks), 1619-1633 (refreshJoinLock)`, `apps/server/src/rooms/claim-seat-rules.ts:75-103 (lobbyJoinKind)`, `apps/server/src/rooms/tutorial-join.ts:21-26`, `packages/shared/src/protocol/action-reject.ts:292-297`, `node_modules/@colyseus/core/build/MatchMaker.mjs:150-157 (joinById not found / locked checked before onAuth), 447 (already full)`, `node_modules/@colyseus/sdk/build/HTTP.mjs:173-184 (network error message passthrough)`
- **Purpose:** Single place on Home where connection progress and every create / join / solo-start / tutorial-start / kick / reclaim-failure message is shown. It is the only error UI Home has: no toast, no dialog, no retry or reload control.
- **Controls:**
  - No controls of its own. The <p role="alert"> error and the muted status line are passive. They cannot be dismissed
  - Retry happens only by resubmitting the originating form: Create (createGame), Join (joinGame), Start solo game (startSoloGame), Start tutorial (startTutorialGame). Each of these resets connection to INITIAL+connecting first, which is the only thing that clears the error
  - Join code input: forced uppercase on change, maxLength 6, autoComplete off. Join is enabled only when the trimmed code length is exactly 6 and the trimmed nickname is non-empty
  - Nickname input: maxLength 24, matching the server trim and 1-24 check in readNickname at game-room.ts:4783
  - Back (path header) and Play online / Play solo / Tutorial (hub) navigate between modes. The error and status follow along because every view renders the same StatusBlock
- **States:**
  - idle: no status copy, no alert. The idle hub must not alarm (L42-04, L51-03; spec v6 §5.1)
  - connecting: 'Connecting…'. busy=true disables every hub button (Play online, Play solo, Tutorial, How to play, Feedback), path Back + Feedback, nickname, code, opponent-count and difficulty buttons, Choose kit, Create/Join/Start submits. NOT disabled: the solo 'Table rules' gear in LobbyRulesPanel (no disabled prop)
  - soloLaunchPending: 'Starting solo game…'. Home stays mounted while the server lobby exists. The same copy also shows during the Tutorial launch
  - connected (transient): attachRoom sets status 'connected' before the first stateUpdate, so 'Connected' can flash on Home for a moment before Lobby renders
  - failed: 'Could not join' + red error. Used for create, join, solo and tutorial failures alike
  - disconnected: 'Disconnected' + red error, shown after a kick or a failed manual reclaim (Home remounts in hub mode, see the forced-exit surface)
  - Error string: protocol mismatch: 'Protocol version mismatch: the server speaks v{N}, this client sent v{M}. Reload the page.' (current PROTOCOL_VERSION 45). Typical after a deploy with a stale tab. There is no Reload button
  - Error string: 'A nickname is required to join.' (server). Practically unreachable from the UI because of the canSubmit guard and maxLength 24
  - Error string: 'This table is full.' (lobby with 8 seats and nothing claimable) and 'This table has no more spectator space.' (started or finished table, or a full lobby with claimable seats, with 8 spectators). These are usually PREEMPTED: refreshJoinLock locks the room in exactly those states, and Colyseus joinById checks the lock before onAuth, so players usually see the raw string 'room "ABCDEF" is locked'
  - Error string: 'This tutorial cannot be joined.' (join by code into a tutorial room; L45-04)
  - Error string (raw Colyseus): 'room "ABCDEF" not found' (wrong code or disposed room), 'ABCDEF is already full.' (seat reservation race), 'room "X" has been disposed.' / 'reconnection token invalid or expired.' (reclaim paths)
  - Error string (network): the browser fetch message passed through verbatim, e.g. 'Failed to fetch' (Chromium), 'Load failed' (Safari) or the Firefox NetworkError text. 'Could not reach the server' appears only for non-Error throws
  - Error string: 'You were kicked.' with status Disconnected (L57-09)
  - Solo/tutorial launch rejected mid-sequence (any ERROR_MESSAGE while soloLaunchPending, e.g. a start-game rejection): the client leaves the room, sets status failed and shows the server message
  - Persistence: the error survives hub↔path navigation and nickname/code edits. It clears only on the next create/join/solo/tutorial start or on leaveGame
  - Placement: the alert sits under the hub title or under the path header subtitle, not next to the Create or Join form that failed. Both forms share one Online path
- **Keep:**
  - The idle hub shows no status label and no protocol version anywhere, not even as a tooltip (L42-04, L51-03; spec v6 §5.1)
  - Error text is announced (role="alert")
  - While busy, inputs and navigation are locked so a second create/join cannot race the first
  - The Home path stays mounted during connecting and after a failure, so the player can retry in place without re-entering the path (HomeScreen stays mounted because view is null)
  - Nickname and join code live in App state and survive a failed attempt, a kick, and a return to Home (but not a page reload)
  - Join code is uppercased, the exact length is 6, and the nickname is trimmed. The server stays authoritative on whether the room exists or is full: the client never pre-validates a code (AGENTS.md golden rule 8)
  - A kicked human may re-Join the same code as a new guest (L57-09; spec v6 §2.3)
  - Solo and Tutorial never flash the Lobby: Home stays visible until phase=playing, or until failure (soloLaunchPending, L17-01 / L45-04)
  - Lobby and Home ignore actionReject.code and show only error/message (RoomConnection.actionReject doc comment)
- **Notes:** Per the designer's relayed instruction, the Home solo path's LobbyRulesPanel (gear → Table rules: excluded/banned kits, Random only, human turn seconds 5-180 via onTurnTimeChange which also flips includeTurnTime; Lot 70 / L70-01, addedAfterLot61) must stay. It is inventoried with the lobby rules surfaces. Its only link to this gap is that the gear stays enabled while busy. The tutorial path has no rules (Lot 70: 'Tutorial does not use the rules').

### `home-forced-exit-landing` — Landing on Home after being kicked or after reclaim fails

- **Files:** `apps/client/src/net/use-room-connection.ts:247-262 (kicked ERROR_MESSAGE → INITIAL + disconnected + 'You were kicked.'), 369-410 (onLeave kicked branch / manual reclaim), 745-772 (reclaim failure → INITIAL disconnected + raw error)`, `apps/client/src/App.tsx (view null → HomeScreen remounts; joinCode only set by the Home input, never from gameCode)`, `apps/client/src/screens/home.tsx:97 (mode starts at 'hub'), 431 (hub StatusBlock)`, `apps/server/src/rooms/game-room.ts:1522-1535 (kick: ERROR_MESSAGE kicked, then leave CONSENTED with the kicked reason)`, `packages/shared/src/protocol/action-reject.ts:293`
- **Purpose:** The player was in a room and is pushed back to Home without choosing to leave: kicked by the host in the lobby, or every reconnect attempt failed (SDK retries plus the manual token reclaim). Home must say what happened and offer a next step.
- **Controls:**
  - None specific. The hub offers Play online, Play solo, Tutorial, How to play, Feedback and What's new (New) as usual
  - Play online → Join: the nickname is still filled in. The code is still filled in only if this player originally joined by code. A host or creator who got dumped back has an empty code field, because the connection's gameCode is reset to null and is never copied to joinCode
- **States:**
  - Kicked: hub mode, 'Disconnected' + red 'You were kicked.'. actionReject {code:'kicked'} is set but Home ignores it
  - Reclaim failed: hub mode, 'Disconnected' + raw Colyseus or network text ('reconnection token invalid or expired.', 'room "X" has been disposed.', 'room "X" not found', 'Failed to fetch', ...)
  - Reconnect exhausted with no token (cleared or storage blocked): 'Disconnected' + the SDK close reason, e.g. 'No more retries. Reconnection failed.' or 'Room uptime too short for reconnection.' (the latter only when the token is missing; otherwise a manual reclaim runs)
  - Both cases: the status remains 'Disconnected' on the hub until the next create/join, which slightly contradicts the 'idle hub does not alarm' rule (L42-04) because it is not idle
- **Keep:**
  - A kicked human may Join the same code again as a new guest (L57-09)
  - A kick disables auto-reconnect and clears the token, so the client never re-enters silently (use-room-connection.ts:247-262)
  - A failed reclaim clears the token and drops the stale view: the player is never left on a frozen table
- **Notes:** The kick copy dates from Lot 57 (L57-09). Reclaim-failure landing dates from Lot 7. Today both reuse the generic StatusBlock, so the player gets no explanation of what happened and no suggested next action.


## Lobby

### `lobby-header-status` — Lobby header, connection status and inline error

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/status-labels.ts`, `apps/client/src/net/use-room-connection.ts`, `packages/shared/src/protocol/action-reject.ts`
- **Purpose:** Identify the screen ('Lobby' eyebrow, 'Card Battle' title), show the socket status and the last server reject message for the lobby.
- **Controls:**
  - None (read-only). The error comes from ERROR_MESSAGE.message; the lobby ignores the reject code and shows the English fallback string
- **States:**
  - status label from STATUS_LABELS: Connected / Connecting… / Reconnecting… / Disconnected / Could not join / Not connected
  - error present: red text with role=alert under the status line
  - no error: line omitted
  - reconnecting: lobby view stays on screen; no control is disabled while reconnecting
- **Keep:**
  - Lobby shows the STATUS_LABELS copy (Home uses homeStatusCopy instead) (frontend.md, L42-04)
  - Lobby and Home keep the inline alert string; the table uses IllegalActionDialog instead (L39-02)
  - lobby.tsx must not use 100dvh; it scrolls inside #root with overflow-y-auto (L53-07, locked by visual-viewport.test.ts)
- **Notes:** The error never gets a dismiss control in the lobby. In use-room-connection.ts, stateUpdate keeps `error` while `actionReject` is non-null, and the lobby never calls clearActionReject.

### `lobby-game-code` — Game code card with Copy and the copy-result dialog

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/design/components/dialog.tsx`
- **Purpose:** Show the 6-letter room code so friends can join from Home, and tell the host that they are the host.
- **Controls:**
  - Copy button (orange): navigator.clipboard.writeText(gameCode), then opens a Dialog
  - Copy dialog OK button (green), Esc or overlay click: closes the dialog
- **States:**
  - copy success: Dialog titled 'Code copied', body 'Share this code with friends: {CODE}'
  - copy failure (clipboard throws): Dialog titled 'Copy failed', body 'Could not copy automatically. Game code: {CODE}'
  - host: 'You are the host' line under the code
  - guest or walk-in: no host line
- **Keep:**
  - Copy result shows in the shared Dialog, not a toast (L11-02, frontend.md)
  - The code is the only way to share. Joining is the Home 'Join with code' field: 6 characters, uppercased, enabled only at length 6 (home.tsx)
- **Notes:** There is no invite URL, no Web Share and no ?code= deep link (no searchParams use in the client outside admin). Host status can move after Play again (resolveReformingHost) or when the host leaves (unseatLobbySeat).

### `lobby-rules-summary` — Table rules summary strip (everyone) · `Lot 62+`

- **Files:** `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/lobby.tsx`, `packages/shared/src/protocol/lobby-rules.ts`, `packages/shared/src/protocol/state-view.ts`, `apps/server/src/rooms/game-room.ts`
- **Purpose:** Show every lobby recipient (host, guests, walk-in spectators) the host's house rules before Ready: human turn length, Random only, and which Classic kits are excluded.
- **Controls:**
  - Host only: gear IconButton (aria-label 'Table rules') opens the Table rules dialog (see lobby-rules-host-dialog)
  - Guests and walk-ins: no control. They cannot open a detail view
- **States:**
  - clock icon plus `{turnTimeSeconds}s`. This is the effective seconds the server will use (viewLobbyRules: TURN_DURATION_MS env until the host sends a time, so it may be above 180)
  - Random only on: placeholder card back plus the word 'Random' next to the clock
  - kit face row: all 16 KIT_IDS portraits at w-10; excluded kits at opacity-40 grayscale; allowed kits at full color
  - default (view.lobbyRules missing): falls back to defaultLobbyRules() (no exclusions, randomOnly false, 60s)
  - editable=false (non-host): gear hidden
- **Keep:**
  - Guests see the same rules before they press Ready (rules spec §6 Setup; decisions 2026-10-06 Lot 70)
  - Clock with seconds, kit faces with excluded ones gray, random-kit face when kits are dealt at random; only the host gets a settings control (decisions 2026-10-06 'Rules chrome and lobby chat')
  - Displayed seconds come from LobbyStateView.lobbyRules.turnTimeSeconds (server-effective), never a client constant
  - The tutorial path never shows rules (setLobbyRules is rejected with set-lobby-rules-tutorial)
  - Rules data shape: LobbyRules { excludedKitIds: KitId[], randomOnly: boolean, turnTimeSeconds: number } on LobbyStateView.lobbyRules (PROTOCOL_VERSION 45)
- **Notes:** The user explicitly asked that house rules stay in V7: custom rules, banned kits, turn-time change. Accessibility gap: the excluded state is only conveyed by grayscale, and the portrait alt is the raw id ('untouchable portrait').

### `lobby-rules-host-dialog` — Table rules dialog (host editor) · `Lot 62+`

- **Files:** `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/net/use-room-connection.ts`, `packages/shared/src/protocol/lobby-rules.ts`, `packages/shared/src/protocol/messages.ts`, `apps/server/src/rooms/lobby-rules.ts`, `apps/server/src/rooms/game-room.ts`
- **Purpose:** Let the host set excluded kits, Random only, and the human turn length before start. The same panel is reused on the Home solo menu.
- **Controls:**
  - 'Human turn' range slider: min 5, max 180, step 1, aria-label 'Human turn seconds', value echoed as `Ns`. Each onChange sends setLobbyRules { excludedKitIds, randomOnly, turnTimeSeconds } (one message per step, applied immediately)
  - All button (green): sends excludedKitIds [] (allowEveryKit), randomOnly unchanged, no turnTimeSeconds
  - None button (orange): excludes every kit except KIT_IDS[0] ('untouchable'), via excludeEveryKitButFirst
  - Random toggle button: green when on, aria-pressed. Flips randomOnly and sends setLobbyRules without turnTimeSeconds
  - 16 kit portrait tiles (grid 4 columns, 5 at sm): aria-pressed means allowed, aria-label is the kit name. Click toggles exclusion via toggleExcludedKit. The last allowed tile is disabled (cursor-not-allowed)
  - Close button (green), Esc or overlay click: closes the dialog. There is no Save/Cancel; every change is already sent
- **States:**
  - slider value falls back to 180 when the effective seconds are outside 5–180 (env override), while the summary still shows the real seconds
  - kit tile allowed: full color; excluded: opacity-40 grayscale
  - last allowed kit: tile disabled
  - Random on: button green
  - server rejects (shown as the lobby inline error): set-lobby-rules-not-host, set-lobby-rules-not-in-lobby, set-lobby-rules-tutorial, set-lobby-rules-no-kit ('At least one kit must stay allowed.'), set-lobby-rules-turn-time ('Turn time must be a whole number of seconds from 5 to 180.'), invalid-set-lobby-rules-payload
- **Keep:**
  - Only the host may set rules, only in the lobby, never in the tutorial (canSetLobbyRules; rules spec §6 Setup)
  - Slider on top, then All / None / Random, then kit portraits; None keeps the first Classic kit because one kit must stay allowed (decisions 2026-10-06, frontend.md Lot 70)
  - Turn time is a whole number from 5 to 180, default 60; bots keep their own think time (rules spec §6 Setup)
  - Omitting turnTimeSeconds leaves the server clock (TURN_DURATION_MS) in place. Exclusion and Random changes in the lobby omit it; once any time is sent, turnTimeOverridden latches for the room (game-room.ts handleSetLobbyRules)
  - Excluded kits cannot be chosen; a seat whose pick becomes excluded is reset to Random by the server and everyone gets a fresh state (handleSetLobbyRules)
  - Random only: nobody picks; seats are dealt from the allowed kits with the seeded draw (startDealOptions; rules spec §6)
  - Play again keeps the rules (server this.lobbyRules persists; FinishedStateView.lobbyRules)
  - Rules are written on the finished game: excluded_kit_ids, random_only, turn_time_seconds (decisions 2026-10-06)
- **Notes:** Client validation mirrors the server through the shared helpers (isTurnTimeSeconds, toggleExcludedKit returns null on the last kit). Changing rules does not un-ready guests (handleSetLobbyRules never touches guestReady).

### `lobby-your-kit` — Your kit card (hidden lobby kit pick)

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/lobby-kit-picker.ts`, `apps/client/src/design/components/kit-portrait.tsx`
- **Purpose:** Show the recipient's own kit choice (or Random) and open the kit picker. Opponents never see it.
- **Controls:**
  - Choose kit button (orange): opens LobbyKitPickerDialog
- **States:**
  - selection random: placeholder portrait plus 'Random kit'
  - selection is a catalog kit: that kit's portrait and name
  - copy: 'Hidden from opponents until Spy or death.'
  - hidden entirely when rules.randomOnly is true (Lot 70)
  - hidden for a walk-in spectator, replaced by 'Watching the lobby'
  - pick silently reset to Random when the host excludes that kit
- **Keep:**
  - Only LobbyStateView.yourKitSelection is ever rendered; no seat row shows a kit (L49-01/L49-02; locked by lobby-kit-privacy.test.ts: source contains 'yourKitSelection', 'LobbyKitPickerDialog', 'Choose kit' and no player.kit)
  - Random is the default label (L49-02)
  - Kit picks survive Play again (kitSelections is cleared only on unseat)
- **Notes:** The section dates from L49. Lot 70 added the randomOnly hiding and the allowed-kit filter in the picker.

### `lobby-kit-picker-dialog` — Choose kit dialog (grid, then description, then Select)

- **Files:** `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/screens/lobby-kit-picker.ts`, `apps/client/src/screens/table/kit-inspect-details.tsx`, `apps/server/src/rooms/lobby-rules.ts`
- **Purpose:** Pick a catalog kit or Random. Two-step: tap a tile to read the description, then Select.
- **Controls:**
  - Grid tile buttons: Random first, then allowed catalog kits only (excluded kits are filtered out). aria-pressed marks the current pick, aria-label is the label. Click opens the preview
  - Preview step: Back (orange) returns to the grid; 'Select this kit' (green) calls onSelect, which sends chooseKit { kitId } (KitId or 'random'), then closes
  - Grid step: Close (green)
  - Esc or overlay: in preview goes back to the grid; in the grid closes
- **States:**
  - grid: title 'Choose kit', copy 'Opponents cannot see your kit. Random is the default.'
  - preview of a kit: title is the kit name, body KitInspectDetails
  - preview of random: title 'Random kit', body RandomKitDetails
  - current pick: orange border and ring
  - server rejects: choose-kit-random-only ('The host is dealing kits at random.'), choose-kit-excluded ('The host has excluded that kit.'), choose-kit-already-started, kit-unavailable, invalid-choose-kit-payload
  - chooseKit result is sent only to the chooser (sendStateTo), never broadcast
- **Keep:**
  - Random tile plus every allowed kit; click shows the description, then Select (L49-02)
  - Excluded kits are not choosable (Lot 70; server canChooseKit)
  - The same dialog serves the Home solo menu; there the pick is local state, sent before startGame only when not random and not randomOnly (use-room-connection.ts startSoloGame)
  - LOBBY_KIT_PICKER_SELECTIONS order is Random then KIT_IDS (lobby-kit-picker.test.ts)
- **Notes:** The RandomKitDetails copy says 'one of the 16 kits at random', which is wrong when the host excluded kits.

### `lobby-walk-in-notice` — Walk-in spectator lobby state ('Watching the lobby')

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/server/src/rooms/claim-seat-rules.ts`, `apps/server/src/rooms/game-room.ts`
- **Purpose:** Tell a socket that joined a full lobby with a reserved, disconnected seat that it is watching and can claim that seat.
- **Controls:**
  - No local control. Claiming goes through the App-level ClaimSeatDialog. Leave and Feedback stay available in the action row
- **States:**
  - shown when LobbyStateView.isSpectator is true. Server lobbyJoinKind returns 'spectate' only when 8 seats are taken and at least one claimable seat exists; otherwise the join is refused with 'This table is full.'
  - copy: 'Claim a disconnected seat if one is listed, or leave and join again later.'
  - no Ready toggle; action row shows 'Waiting for the host to start…'
  - rules summary visible, read-only
  - chat input visible; lines are stamped role spectator
  - after a Play again reform, walk-ins become unready lobby guests while a seat is free (L57-14)
- **Keep:**
  - Walk-in spectators skip the kit picker (frontend.md)
  - Lobby walk-in receives both chat streams (chatMessagesForReader readerIsSpectator)
  - Walk-ins become guests on Play again (L57-14)
- **Notes:** Seated lobby readers only get living lines, so a lobby walk-in's chat lines are invisible to the seated players.

### `lobby-player-list` — Players list (seats, ready marks, host and bot controls)

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/lobby-ready.ts`, `apps/client/src/screens/lobby-ready-mark.tsx`, `apps/client/src/design/components/bot-seat-label.tsx`, `apps/client/src/bots/format-bot-difficulty.ts`, `packages/shared/src/protocol/state-view.ts`
- **Purpose:** List every seat with public facts: nickname, you, host, bot and difficulty, ready. Give the host per-seat bot difficulty and Kick.
- **Controls:**
  - Host only, on each other seat that is a bot: Easy / Normal / Hard buttons (current tier green, others orange). Sends setBotDifficulty { playerId, difficulty }
  - Host only, on every other seat (human or bot): Kick (red), opens the Kick confirm dialog
  - List scrolls (max-h min(36rem, 58vh), overflow-y-auto)
- **States:**
  - header 'Players (n/8)' with n = players.length and MAX_PLAYERS 8
  - ready mark in a fixed w-6 column left of the nickname: green check (aria 'Ready') or red cross (aria 'Not ready')
  - host and bots are always isReady=true on the wire; human guests start false
  - disconnected or reserved guest: isReady forced false; no other disconnected indicator
  - row suffix ' (you)' on own seat; 'Host' tag on the host seat; BotSeatLabel 'Bot · {Difficulty}' shown to every recipient
  - non-host viewer: no per-row controls
  - host's own row: no controls
  - rejects: set-bot-difficulty-* and kick-*
- **Keep:**
  - Ready check or cross in an aligned column left of nicknames, using font-sans (L57-16; locked by lobby-ready-mark.test.ts: 'w-6 shrink-0', 'text-cta-green-deep', 'text-cta-red', mark before nickname in source)
  - BotSeatLabel on every bot seat for all recipients (L17-03)
  - Host Kick on every other seat, bots and humans, through kickPlayer, never removeBot (L57-09; lobby-kick.test.ts asserts no onRemoveBot)
  - No kit on any row (L49 privacy test)
  - List scrolls so eight seats do not cover Start / Add bot (frontend.md Lot 55)
- **Notes:** Rows carry no seat color, while chat nicknames and the claim dialog do use seat colors (seatIndexOf on players order).

### `lobby-kick-confirm` — Kick this player? confirm dialog and the kicked outcome

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/server/src/rooms/lobby-rules.ts`
- **Purpose:** Confirm a host kick before sending it.
- **Controls:**
  - Cancel (orange), Esc or overlay: closes with no message
  - Kick (red): sends kickPlayer { playerId }, then closes
- **States:**
  - body: '{nickname} will leave this lobby. They can join again with the code.'
  - kicked client: the server sends ERROR_MESSAGE code 'kicked'. The hook disables reconnection, clears the token, returns to Home with status Disconnected and error 'You were kicked.'
  - rejects: kick-not-host, kick-self, kick-unknown, kick-not-in-lobby, invalid-kick-payload, no-host-seated
- **Keep:**
  - Confirm Dialog with the exact title 'Kick this player?' (L57-09; source-locked by lobby-kick.test.ts with 'setKickTarget' and 'onKickPlayer')
  - A kicked human may rejoin with the same code as a new guest (L57-09)
  - A human kick clears the seat reservation

### `lobby-add-bot` — Add bot control (host)

- **Files:** `apps/client/src/screens/lobby.tsx`, `packages/shared/src/domain/bot.ts`
- **Purpose:** Host adds virtual bot seats at a chosen difficulty.
- **Controls:**
  - Difficulty toggles Easy / Normal / Hard: local state, default 'normal', selected one green
  - Add bot (green): sends addBot { difficulty }
- **States:**
  - visible only to the host
  - every button disabled when players.length >= MAX_PLAYERS (8)
  - rejects: add-bot-room-full, add-bot-not-host, add-bot-already-started
- **Keep:**
  - Host-only add bot and set difficulty while below MAX_PLAYERS; occupancy 2–8 (L17-02, L55-01)
  - Difficulty copy comes from formatBotDifficulty (Easy / Normal / Hard), wire values easy / normal / hard (L17-01)
  - Bots persist through Play again (L57-10)

### `lobby-action-row` — Lobby action row: Start, Ready, waiting copy, Leave, Feedback

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/lobby-ready.ts`, `apps/client/src/screens/lobby-ready-mark.tsx`, `apps/client/src/feedback/feedback-dialog.tsx`, `apps/server/src/rooms/lobby-rules.ts`
- **Purpose:** Primary lobby actions: host launches, guests signal ready, anyone leaves or sends feedback.
- **Controls:**
  - Start game (green, host only): sends startGame. Disabled unless lobbyStartEnabled: at least 2 seats and every human guest isReady
  - Ready (green, with check icon) or Cancel ready (orange), human guests only: sends setReady { ready: !youReady }
  - Leave (red): leaveGame() immediately, no confirm
  - Feedback (orange): opens FeedbackDialog mode='manual' screen='lobby' with gameCode and nickname
- **States:**
  - host: Start shown, no Ready
  - guest not ready: Ready plus 'Press Ready when you are set.'
  - guest ready: Cancel ready plus 'Waiting for the host to start…'
  - non-host with no Ready toggle (walk-in): 'Waiting for the host to start…'
  - Start grey when fewer than 2 seats or any human guest is not ready (a disconnected guest is forced unready)
  - rejects: start-not-all-ready, start-not-enough-players, start-not-host, start-already-started, ready-not-allowed, ready-not-in-lobby
- **Keep:**
  - Grey Start is not validation; the server rejects start-not-all-ready (L57-08, L57-11)
  - Host has no Ready control; host and bots are implicitly ready (L57-08)
  - Ready is green with a check; Cancel ready is orange (L57-16; lobby-ready.test.ts locks 'Cancel ready', the variant expression, LobbyReadyCheckIcon, lobbyStartEnabled)
  - Lobby Leave stays an immediate disconnect (frontend.md)
  - Feedback next to Leave, manual mode, screen 'lobby' (L47-03; feedback-surfaces.test.ts)

### `lobby-chat` — Lobby chat (under the player list) · `Lot 62+`

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/table/chat-log.tsx`, `apps/client/src/design/seat-colors.ts`, `packages/shared/src/protocol/table-chat.ts`, `packages/shared/src/protocol/messages.ts`, `apps/server/src/rooms/lobby-rules.ts`, `apps/server/src/rooms/game-room.ts`, `apps/server/src/protocol/build-view-for.ts`
- **Purpose:** Let lobby occupants talk before the match. The transcript continues into the match and across Play again.
- **Controls:**
  - Text input: name chat-body, type text, maxLength 200, aria-label and placeholder 'Message', text-base so iOS does not zoom
  - Send button (green compact, submit). Enter also submits the form
  - Client ignores empty or whitespace-only text; the form resets right after send, even if the server rejects
- **States:**
  - empty transcript: 'No messages yet.'
  - transcript: fixed h-52 scroll box that auto-scrolls to the newest line on every update
  - line: round label ('Lobby' for round 0, otherwise 'Round N'), seat-colored bold nickname (fallback #4a5d6e when the sender is not in players), ': body'
  - side-stream line (role eliminated or spectator): gray italic with ' (eliminated)' or ' (spectator)'
  - canWrite is always true in the lobby, including for walk-ins
  - seated lobby readers get living lines only; lobby walk-ins get both streams
  - rejects: invalid-send-chat-payload (empty), send-chat-too-long, send-chat-bot, send-chat-not-in-game
- **Keep:**
  - Chat sits at the bottom of the lobby player list (decisions 2026-10-06 'Rules chrome and lobby chat')
  - Lobby lines are stamped Lobby (round 0); in-match lines use the action-log round (tableRound) (rules spec §6 Chat)
  - At most 200 characters; bots do not chat (CHAT_BODY_MAX_LENGTH; rules spec §6 Chat)
  - The transcript lives as long as the room; Play again keeps it and new lobby lines append; a seated player in the next gathering writes as living (decisions 2026-10-06 'Room chat outlives one match')
  - Per-recipient filtering happens server side (chatMessagesForReader in build-view-for.ts); the client never filters
  - Chat input stays at least 16px to prevent mobile zoom (commit 6372d04, PR #73)
  - Each finished game stores the room transcript as of that game's end (game_chat_messages)
- **Notes:** No unread badge in the lobby. Seat color uses the index in view.players (LobbySeatView order). The 200 maxLength is hardcoded rather than read from CHAT_BODY_MAX_LENGTH, and there is no character counter.

### `lobby-rules-change-guest-effects` — Effects of a host rule change on guests (kit reset to Random, Ready left as is, Random only hides the pick) · `Lot 62+`

- **Files:** `apps/server/src/rooms/game-room.ts`, `apps/server/src/rooms/lobby-rules.ts`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/screens/lobby-kit-picker.ts`, `apps/client/src/screens/lobby-ready.ts`, `packages/shared/src/protocol/lobby-rules.ts`, `packages/shared/src/protocol/table-chat.ts`, `packages/shared/src/protocol/state-view.ts`, `docs/spec_bataille_des_cartes_en.md`, `docs/agent/decisions.md`, `docs/agent/frontend.md`
- **Purpose:** Covers what each guest sees, or does not see, after the host changes a table rule in the online lobby. The server works out the side effects in handleSetLobbyRules (game-room.ts:1153-1192) and broadcasts one stateUpdate. The client re-renders from yourKitSelection and lobbyRules with no diff, notice or chat line.
- **Controls:**
  - Host rule controls (Table rules dialog: All, None, Random, kit tiles, turn slider) -> setLobbyRules { excludedKitIds, randomOnly, turnTimeSeconds? }. The lobby wires these in lobby.tsx:130-147. Kit and Random changes send the current randomOnly / excludedKitIds and leave out turnTimeSeconds, so they never override the clock.
  - Guest 'Choose kit' (orange, Your kit card, lobby.tsx:163-171) opens LobbyKitPickerDialog. The card is not rendered when rules.randomOnly is on or the viewer is a walk-in spectator.
  - Kit picker: a tile click opens a preview, Back returns to the grid, 'Select this kit' -> chooseKit { kitId } or 'random', Close and Escape close it. The grid shows Random plus allowedKitIds(rules) only (lobby-kit-picker-dialog.tsx:113-115).
  - Guest 'Ready' (green with check) / 'Cancel ready' (orange) -> setReady { ready }. Hint text: 'Press Ready when you are set.' / 'Waiting for the host to start…'.
  - Host 'Start game' (green) -> startGame. It is enabled by lobbyStartEnabled: at least 2 seats and every human guest isReady (lobby-ready.ts). That check does not depend on rule changes.
  - Lobby chat input (ChatLog, canWrite) -> sendChat { body }. There is no system or rule-change line type: ChatAuthorRole is only living | eliminated | spectator (table-chat.ts:9).
- **States:**
  - Guest picked kit X and the host excludes X (tile, None, or a reduced set): the server rewrites kitSelections[guest] to 'random' (game-room.ts:1184-1190). On the next stateUpdate the Your kit card switches to the random placeholder and the label 'Random kit'. There is no notice, highlight or chat line. The host is never told whose pick was reset. Other seats never see picks at all (yourKitSelection is self-only, state-view.ts:81-85).
  - Guest is Ready, then the host changes any rule (kits, Random only, seconds): guestReady is not touched (handleSetLobbyRules writes only lobbyRules and kitSelections). The green check stays, Start stays enabled, and the host can start at once under rules the guest has not looked at. guestReady is cleared only on join, drop, Play again reform, seat claim and the walk-in seat move (game-room.ts:732/755/1435/1474/1724). No test asserts either behaviour.
  - Host turns Random only on: the Your kit card is hidden for every seat, host included (lobby.tsx:155 / rules.randomOnly ? null). The server keeps each previous pick in kitSelections; it does not reset them. startDealOptions ignores picks while randomOnly is on (lobby-rules.ts:512-514). Any chooseKit is rejected with choose-kit-random-only.
  - Host turns Random only off again: the Your kit card comes back with the guest's earlier pick if that kit is still allowed, otherwise 'Random kit' (it was reset by a later exclusion).
  - Kit picker open on the grid while the host excludes kits: the grid refilters live from view.lobbyRules, so tiles vanish under the cursor with no explanation.
  - Kit picker open on a preview of a kit the host has just excluded: KitInspectDetails stays up and 'Select this kit' stays enabled. Selecting sends chooseKit, the server rejects it with choose-kit-excluded ('The host has excluded that kit.'), and the inline red lobby alert appears (see lobby-sticky-reject-alert).
  - Kit picker open when the host turns Random only on: LobbyKitPickerDialog is rendered regardless of randomOnly (lobby.tsx:387-395) and kitPickerOpen is not reset. The dialog stays open, and Select is rejected with choose-kit-random-only ('The host is dealing kits at random.').
  - Rules strip (clock seconds, Random mark, kit faces with excluded ones gray) updates in place for everyone, including walk-in spectators. Nothing marks what changed. Excluded faces differ only by opacity and grayscale; the img alt is '<kitId> portrait' with no excluded wording.
  - Guest's pick survives Play again: kitSelections is only deleted on unseat (game-room.ts:1540), so a rematch lobby starts with the old pick. A later rule change can still silently reset it.
  - At start, a pick outside the allowed set is dropped again and that seat draws from the allowed kits (startDealOptions, lobby-rules.ts:520-533). This is the backstop behind the lobby reset.
  - Tutorial: none of this applies. setLobbyRules is rejected with set-lobby-rules-tutorial and the tutorial skips the lobby (soloLaunchPending).
- **Keep:**
  - When the host excludes a kit a guest has picked, the server resets that guest to Random. V7 may surface this but must not change it on the server (handleSetLobbyRules, Lot 70; decisions 2026-10-06: 'An excluded kit cannot be chosen').
  - Random only means nobody picks. The kit picker card is hidden and chooseKit is rejected (rules spec §6 Setup; decisions 2026-10-06 Lot 70).
  - Seats are dealt with the existing seeded draw, restricted to allowed kits. A forced pick outside the allowed set is dropped and that seat draws (decisions 2026-10-06 Lot 70; golden rule 5).
  - Guests see the same rules before Ready: the read-only strip must stay visible to guests and walk-in spectators (rules spec §6 Setup, line 249; frontend.md Lot 70).
  - Other seats never see a kit pick. Only yourKitSelection reaches the client (PROTOCOL_VERSION 30, L49-01/02).
  - A grey Start is not validation. The server re-checks start-not-all-ready (L57-08/L57-11).
  - Play again keeps the rules (rules spec §6 Setup; decisions 2026-10-06).
  - Kit-only and Random-only changes leave out turnTimeSeconds so they never override the clock (lobby.tsx:130-137; protocol.md:129-131).
- **Notes:** No code path tells a guest their pick was reset or a rule changed after they readied. Any notice would be new presentation. A client-only notice is possible without touching the protocol. A guest's yourKitSelection changes only through their own chooseKit or a host reset. A change while no chooseKit is in flight, or a lobbyRules change between two views, can be shown locally. A table-wide line in chat would need a new chat role or message kind, which is a protocol change. Clearing Ready on a rule change would be a server behaviour change and needs a designer ruling.

### `lobby-rules-dialog-kit-guardrails` — Table rules dialog: last-allowed kit lock and None keeps the first Classic kit · `Lot 62+`

- **Files:** `apps/client/src/screens/lobby-rules-panel.tsx`, `packages/shared/src/protocol/lobby-rules.ts`, `packages/shared/src/domain/kit.ts`, `apps/server/src/rooms/lobby-rules.ts`, `apps/client/src/screens/illegal-action-copy.ts`, `packages/shared/src/protocol/action-reject.ts`, `apps/client/src/screens/home.tsx`, `docs/agent/decisions.md`, `docs/agent/frontend.md`
- **Purpose:** Host-only guardrails in the Table rules popup that keep at least one kit allowed. The same LobbyRulesPanel is used in the online lobby (editable = isHost) and on the Home solo menu (editable always).
- **Controls:**
  - Gear IconButton (aria-label 'Table rules'), host only, opens the Dialog titled 'Table rules'. Close (green) / Escape closes it.
  - 'All' (green) -> onExcludedChange(allowEveryKit(rules).excludedKitIds) = [] (every kit allowed).
  - 'None' (orange) -> onExcludedChange(excludeEveryKitButFirst(rules).excludedKitIds): excludes every kit except KIT_IDS[0] = 'untouchable' (kit.ts:16-17).
  - 'Random' toggle (green when on, orange when off, aria-pressed) -> onRandomOnlyChange(!rules.randomOnly).
  - Kit tile buttons (aria-pressed = allowed, aria-label = kit name) -> toggleExcludedKit. It returns null when the click would leave no kit, and the panel then sends nothing (lobby-rules-panel.tsx:155-160).
  - Last allowed tile: disabled={lastAllowed}, true when the tile is allowed and excludedKitIds.length === KIT_IDS.length - 1 (lobby-rules-panel.tsx:144-151). Only the cursor changes (disabled:cursor-not-allowed). No title, tooltip, helper text or aria-describedby gives a reason.
- **States:**
  - Every kit allowed (default, excludedKitIds = []): all 16 tiles show in full colour and are enabled.
  - Some kits excluded: excluded tiles are drawn at opacity-40 and grayscale. Their aria-pressed is false and they stay clickable to restore.
  - Exactly one kit allowed: that tile is disabled with no stated reason, and every other tile is gray and clickable.
  - After None: only Untouchable is allowed, even when Untouchable was already excluded and the host had kept some other kit. None can re-enable an excluded kit while dropping the only kit the host had kept. Guests who had picked any kit except Untouchable are reset to Random by the server (see lobby-rules-change-guest-effects).
  - Pressing None when only Untouchable is already allowed sends an identical payload. The server still accepts it and broadcasts, with no visible change.
  - The server backstop rejects an all-excluded list with set-lobby-rules-no-kit ('At least one kit must stay allowed.' / illegal-action-copy title 'Need a kit'). The UI cannot normally reach it.
  - Online lobby: the dialog renders from the server view. Every click waits for the stateUpdate round-trip before the tile or toggle changes (no optimistic state).
  - Solo menu: the dialog renders from local soloRules and updates at once. The server only receives the rules at launch.
  - Guest / walk-in spectator: no gear and no dialog, only the read-only strip.
  - Random only on: All / None / tiles still work. The strip adds the Random mark (placeholder face plus 'Random').
- **Keep:**
  - At least one kit always stays allowed, both client side (toggleExcludedKit returns null; last tile disabled) and server side (parseExcludedKitIds 'none-allowed' -> set-lobby-rules-no-kit) (rules spec §6 Setup; decisions 2026-10-06 'Rules chrome and lobby chat').
  - None excludes every kit except the first Classic kit, 'because one kit must stay allowed' (decisions 2026-10-06 'Rules chrome and lobby chat'; frontend.md Lot 70). V7 must keep Untouchable as the survivor unless the designer rules otherwise.
  - All restores every kit.
  - Order inside the popup: the 5–180 second slider on top, then All / None / Random, then the kit portraits (frontend.md Lot 70; decisions 2026-10-06).
  - Only the host gets the settings control. Guests get the clock, the kit faces (excluded ones gray), and a random-kit face when Random only is on (decisions 2026-10-06).
  - excludedKitIds are stored in catalog order (toggleExcludedKit / parseExcludedKitIds).
- **Notes:** The reason text already exists in the reject copy ('At least one kit must stay allowed.'), so V7 can reuse it as helper text on the disabled tile without new wording. Whether None should keep the first currently allowed kit instead of Untouchable is a rule-adjacent change to excludeEveryKitButFirst and needs the designer.

### `lobby-sticky-reject-alert` — Lobby inline reject alert (sticky, carried into the table)

- **Files:** `apps/client/src/net/use-room-connection.ts`, `apps/client/src/App.tsx`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/illegal-action-dialog.tsx`, `apps/client/src/screens/illegal-action-copy.ts`, `packages/shared/src/protocol/action-reject.ts`
- **Purpose:** Shows server rejects in the lobby, including the Lot 70 races caused by host rule changes (choose-kit-excluded, choose-kit-random-only, set-lobby-rules-*), as a red role=alert line under the status label.
- **Controls:**
  - No dismiss control in the lobby. The Lobby gets only `error`, and clearActionReject is wired only to TableScreen (App.tsx:140/178).
- **States:**
  - After any ERROR_MESSAGE in the lobby: error = payload.message and actionReject = payload. Later stateUpdates keep error while actionReject is set (use-room-connection.ts:236-237), so the red line stays across rule changes and other seats' activity.
  - Cleared only by a drop, reconnect, room error, GAME_OVER, leave, or clearActionReject.
  - Match starts while a lobby reject is still stored: TableScreen receives the stale actionReject, and IllegalActionDialog opens on the table using the illegal-action-copy title and body (for example 'Kit hidden' / 'The host has excluded that kit…').
  - The lobby shows the server message (action-reject.ts copy), and the table dialog shows the longer illegal-action-copy text for the same code.
- **Keep:**
  - The server is authoritative. A greyed or hidden control is not validation, and rejects must still surface (golden rule 8).
  - The table keeps IllegalActionDialog open until dismissed, so bot or peer state syncs must not close it (use-room-connection.ts:236 comment, L39-02).
- **Notes:** The sticky-error mechanism predates Lot 61 (L39-02). Lot 70 added new ways to reach it: rule changes racing an open kit picker. Whether the carry-over into the table is intended is unclear (see openQuestions).

### `lobby-inline-reject-alert` — Lobby inline reject alert (no dismiss)

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/client/src/App.tsx`, `apps/client/src/screens/status-labels.ts`, `apps/client/src/screens/lobby-ready.ts`, `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/screens/claim-seat-dialog.tsx`, `apps/client/src/screens/table/chat-log.tsx`, `packages/shared/src/protocol/action-reject.ts`, `packages/shared/src/protocol/messages.ts`, `apps/server/src/rooms/lobby-rules.ts`, `apps/server/src/rooms/game-room.ts`
- **Purpose:** Shows the server's ERROR_MESSAGE reject for any lobby intent as one red line (role="alert") under the connection status line (lobby.tsx:106-111). This is the only feedback a host or guest gets when the server refuses a lobby action. The server is authoritative, and greyed-out client buttons are not validation (lobby-ready.ts header, AGENTS golden rule 8).
- **Controls:**
  - No dismiss control of its own: no close button, no Esc, no timeout. App.tsx passes `error` to LobbyScreen but no onDismissActionReject/clearActionReject (Table and End get both).
  - Start game (host) -> START_GAME. Rejects: start-not-host, start-already-started, start-not-enough-players, start-not-all-ready, no-host-seated (game-room.ts:494-517, lobby-rules.ts:106-117).
  - Ready / Cancel ready (human guest) -> setReady. Rejects: ready-not-in-lobby, ready-not-allowed, invalid-set-ready-payload.
  - Add bot + difficulty tier buttons (host) -> addBot. Rejects: add-bot-not-host, add-bot-already-started, add-bot-room-full, invalid-add-bot-payload.
  - Per-bot difficulty buttons (host) -> setBotDifficulty. Rejects: set-bot-difficulty-*.
  - Kick, then the confirm Dialog's Kick button (host) -> kickPlayer. Rejects: kick-not-host, kick-not-in-lobby, kick-self, kick-unknown, invalid-kick-payload.
  - Choose kit, then a pick in LobbyKitPickerDialog -> chooseKit. Rejects: choose-kit-already-started, choose-kit-random-only, choose-kit-excluded, invalid-choose-kit-payload.
  - Host rules panel (settings control): per-kit exclude toggles, All / None, Random only, turn-time range slider 5-180 s -> setLobbyRules. Rejects: set-lobby-rules-not-host, set-lobby-rules-not-in-lobby, set-lobby-rules-tutorial, set-lobby-rules-no-kit, set-lobby-rules-turn-time, invalid-set-lobby-rules-payload.
  - Lobby chat send (ChatLog, maxLength 200, empty text blocked on the client) -> sendChat. Rejects: send-chat-too-long, invalid-send-chat-payload, send-chat-bot, send-chat-not-in-game.
  - ClaimSeatDialog in lobby phase, for a walk-in spectator: Sit here -> claimSeat (claim-not-claimable, claim-unknown, invalid-claim-payload); Stay -> staySpectating (stay-spectating-not-spectator).
  - Ways it clears today, none of them on the lobby screen: Leave (leaveGame resets INITIAL), connection drop or reconnect (onDrop/onReconnect), room onError, GAME_OVER, createGame/joinGame (reset INITIAL).
- **States:**
  - Hidden: error === null.
  - Visible: shows the short wire string from ACTION_REJECT_MESSAGE (e.g. 'Every connected guest must be ready before start.'). The lobby does not use the richer ILLEGAL_ACTION_COPY title/body that already exists for every lobby code.
  - Sticky: the STATE_UPDATE handler keeps `error` while actionReject !== null (use-room-connection.ts:236-237). Every lobby reject sets actionReject (line 283-287), so the line survives every lobby stateUpdate.
  - Stale: it stays after its cause is gone (all guests now Ready, a seat freed, host changed rules). Nothing ties it to the current view.
  - Single slot: a newer reject replaces the older one. There is no queue or history.
  - Can be hidden behind a modal: while ClaimSeatDialog, LobbyKitPickerDialog, the host rules Dialog, the kick confirm, the copy-code Dialog or FeedbackDialog is open, the reject renders on the lobby page under the overlay. Example: a failed claim leaves the claim picker open with no visible reason.
  - Reconnecting: status line shows 'Reconnecting…' and onDrop clears error/actionReject.
  - Disconnected or failed: STATUS_LABELS 'Disconnected' / 'Could not join'. For a kick, App leaves the lobby for Home with error 'You were kicked.' (status disconnected); actionReject is also set but Home ignores it.
  - Host vs guest vs walk-in spectator: all three can trigger rejects. Spectators only through claim/stay; the host through start/bots/kick/rules.
  - Rematch lobby: after End -> Play again the phase returns to lobby, and the same alert behaviour applies.
  - Tutorial and solo skip this screen (soloLaunchPending). A reject during solo/tutorial launch tears the room down and shows the error on Home with status failed (use-room-connection.ts:263-281).
- **Keep:**
  - Every lobby intent keeps a visible reason when the server rejects it. The server revalidates everything (AGENTS golden rule 8; lobby-ready.ts: 'Grey Start is not validation').
  - Lobby rules stay in full (Lot 70 / L70-01, decisions 2026-10-06; user confirmed for V7): host-only excluded kits, Random only, human turn seconds 5-180 (default 60), All/None, at least one kit always allowed. Their rejects (set-lobby-rules-no-kit, set-lobby-rules-turn-time, choose-kit-excluded, choose-kit-random-only) still need an error surface.
  - Lobby chat stays (decisions 2026-10-06 'Rules chrome and lobby chat'), with the 200-character cap and empty-text reject.
  - Ready/Start gating as a client hint only (L57-11 / L57-16); the server still sends start-not-all-ready.
  - Host Kick goes through a confirm Dialog (L57-09). A kicked client lands on Home with the kicked message.
  - ERROR_MESSAGE payload stays `{ code, message }` (L39-01, PROTOCOL 27). No protocol change is needed to fix this display.
  - The error stays announced to assistive tech (role="alert").
  - A reject during solo/tutorial launch still aborts to Home with the error (L17-01 soloLaunchPending path).
  - Rejects from finished-room claim/rematch actions are shown on End through the read-only TableScreen's IllegalActionDialog (end.tsx:139-140).
- **Notes:** The inline lobby alert dates from L11-02 / Lot 39 (blame 2026-08-01). The 'keep error while actionReject' rule came with Lot 39's L39-06 fix (commit fdac68b, 2026-08-10). frontend.md:421-425 records 'Lobby/home keep the inline alert string', but with no dismiss rule. Lot 70 (after Lot 61) sends more reject codes to this same alert: lobby rules, kit exclusion/random-only, and lobby chat. No client test covers the actionReject/error lifecycle; grep found no test referencing actionReject in apps/client/src.

### `lobby-dialog-dismiss-map` — Lobby dialogs: kick, copy code, kit picker dismissal

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, `apps/client/src/feedback/feedback-dialog.tsx`
- **Purpose:** Dismissal meaning for the lobby's own modals. Every dismissal is local.
- **Controls:**
  - Kick confirm 'Kick this player?': Escape / backdrop / orange Cancel call setKickTarget(null) (no intent). Red Kick sends KICK_PLAYER (lobby.tsx:342-372)
  - Copy code feedback 'Code copied' / 'Copy failed': Escape / backdrop / OK close it (lobby.tsx:327-339)
  - Kit picker: Escape / backdrop go from the preview back to the grid first, and close only from the grid (lobby-kit-picker-dialog.tsx:53-59). Back (orange) returns to the grid. 'Select this kit' sends CHOOSE_KIT (lobby) or sets the local selection (solo), then closes
  - Lobby manual Feedback: Escape / backdrop / Cancel discard the draft
- **States:**
  - kit picker grid / preview (title becomes 'Choose kit' / 'Random kit' / kit name)
  - kick target set / null
  - walk-in lobby spectator: the claim picker may cover these
- **Keep:**
  - Kick needs an explicit tap. A dismissal never kicks
  - Kit picker: one Escape steps back one level
  - Selecting a kit is the only commit in the picker. Closing or Back never changes the selection
- **Notes:** The Table rules Dialog is listed separately (lobby-rules-dialog-live-apply).

### `lobby-rules-dialog-live-apply` — Table rules dialog: live-apply, dismissal never reverts · `Lot 62+`

- **Files:** `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/home.tsx`, `apps/client/src/net/use-room-connection.ts`, `packages/shared/src/protocol/lobby-rules.ts`, `packages/shared/src/protocol/state-view.ts`, `docs/backlog_v6.md`
- **Purpose:** Host-only custom rules: kit bans, Random only, human turn time. They are edited in a Dialog with no Save/Cancel. Each change applies as you make it, and closing the Dialog only hides it. The same panel drives the solo menu (local state, sent at launch).
- **Controls:**
  - Gear IconButton 'Table rules': opens the Dialog (host only; always shown in the solo menu)
  - Escape / backdrop / green Close: setOpen(false). Only hides, nothing is reverted
  - Range slider 'Human turn seconds' (5–180, step 1; MIN/MAX_TURN_TIME_SECONDS): every onChange, including each Arrow/Page/Home/End keypress or drag step, calls onTurnTimeChange. Online this sends SET_LOBBY_RULES {excludedKitIds, randomOnly, turnTimeSeconds}. In solo it updates local rules and sets includeTurnTime
  - 'All' (green): allowEveryKit, sends SET_LOBBY_RULES {excludedKitIds: [], randomOnly}
  - 'None' (orange): excludeEveryKitButFirst, keeping KIT_IDS[0] allowed
  - 'Random' toggle (aria-pressed, green when on): flips randomOnly
  - Per-kit portrait toggles (aria-pressed = allowed): toggleExcludedKit. The last allowed kit is disabled, so at least one kit always stays allowed
  - Online kit and Random changes omit turnTimeSeconds, so the server keeps its default until the host moves the slider (lobby.tsx:131-144)
- **States:**
  - guest / walk-in view: read-only clock 'Ns', Random mark, greyed excluded kit faces; no gear
  - host view: the gear plus the same read-only summary
  - solo menu: rendered inside the solo <form>. Rules are local; at launch SET_LOBBY_RULES is sent, with turnTimeSeconds only when includeTurnTime is set (use-room-connection.ts:569-575)
  - Random only on: the solo 'Your kit' chooser is hidden and the kit selection is forced to random
  - turnTimeSeconds not set yet: the slider shows MAX while the summary shows the server value (sliderSeconds fallback)
- **Keep:**
  - Designer 2026-10-20 (this session): custom rules, kit bans and turn-time change stay in the lobby redesign
  - Host-only editing. Guests see the rules before Ready. Play again keeps them. The tutorial does not use them (Lot 70, L70-01)
  - At least one kit always stays allowed. None keeps the first kit
  - Turn time 5–180 s, default 60 (DEFAULT_TURN_TIME_SECONDS)
  - Dismissing the Dialog (Escape, backdrop, Close) never reverts or discards edits, because every edit was already sent
  - Kit-only changes do not send turnTimeSeconds (the server default stays until the host sets a time)
- **Notes:** Lot 70, PROTOCOL 44 to 45. Every slider step sends an intent, which is chatty but intended. The Dialog is not portaled and sits inside the solo form, so its controls must stay type="button".

### `lobby-chat-walk-in-spectator-stream` — Lobby chat: walk-in spectator writing into the side stream · `Lot 62+`

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/table/chat-log.tsx`, `apps/server/src/protocol/build-view-for.ts`, `apps/server/src/rooms/game-room.ts`, `apps/server/src/rooms/lobby-rules.ts`, `packages/shared/src/protocol/table-chat.ts`, `apps/server/src/protocol/build-view-for.test.ts`, `docs/spec_bataille_des_cartes_en.md`, `docs/agent/decisions.md`
- **Purpose:** The inline lobby chat at the bottom of the player list is the same component for seated players and for walk-in spectators. Seated players (every lobby seat counts as living) write to the living stream and read only that stream. A walk-in spectator watching the lobby writes with role 'spectator'. Those lines go to the side stream, which seated lobby players never receive, and nothing on screen tells the spectator.
- **Controls:**
  - Message text input (name 'chat-body', type text, maxLength 200 hardcoded rather than CHAT_BODY_MAX_LENGTH, aria-label and placeholder 'Message', min-h-11, text-base 16px so mobile browsers do not zoom on focus, commits 6372d04 / b02362a)
  - Enter in the input or the green compact 'Send' button submits the form and calls onSendChat(body), which sends SEND_CHAT { body } (use-room-connection.ts sendChat). Send stays enabled even when the input is empty
  - Client-side guard: whitespace-only or empty text, or canWrite false, is dropped silently with no feedback (chat-log.tsx send)
  - The form resets as soon as the message is sent, without waiting for the server, so the text of a rejected message is lost
  - The scroll area (h-52, overflow-y-auto) is the only way to read older lines. It jumps to the bottom whenever the message list changes
  - The lobby passes canWrite always true (lobby.tsx ChatLog canWrite). Seated players and walk-ins both get the composer
- **States:**
  - Seated host or guest (always a living reader in the lobby, readerIsEliminated false in buildLobbyViewFor): receives only role 'living' lines. Their own lines render in normal ink
  - Walk-in spectator (view.isSpectator true, 'Watching the lobby' card instead of 'Your kit'): receives every line. Their own lines show gray italic with ' (spectator)' after the nickname. That label is the only hint that seated players cannot read them. The 'Watching the lobby' card copy mentions only claiming a seat or leaving, not chat
  - Empty transcript: 'No messages yet.'
  - Lines are stamped 'Lobby' (round 0) via chatRoundLabel. Lines from earlier matches in the same room keep their 'Round N' stamp
  - After Play again (same room): the earlier transcript stays and new lobby lines append. Seated players, including anyone eliminated in the previous match, no longer see side lines they could read during that match
  - A walk-in spectator who claims a seat in the lobby becomes a living reader. Side lines, including their own earlier spectator lines, vanish from their view
  - Nickname color: seatIndexOf over the lobby player list. Spectator senders, kicked players and players who left have no seat and fall back to the hardcoded '#4a5d6e' (UNKNOWN_SEAT), not a design token
  - Server rejection: 'send-chat-too-long', 'invalid-send-chat-payload' or 'send-chat-bot' copy arrives via ERROR_MESSAGE and shows in the lobby's role=alert error line under the status label
  - Tutorial: no lobby and no lobby chat (canSendChat inLobby excludes playKind 'tutorial')
  - Disconnected or reconnecting: the STATUS_LABELS line shows. sendChat uses roomRef.current?.send, so with no room the send does nothing and the input still clears
- **Keep:**
  - Rules spec §6 Chat: spectators can write, their lines are labeled spectator, and only eliminated players and spectators can read them. Living readers see only living lines. This is a rule. A redesign may label or reshape the box but must not show side lines to seated lobby players
  - The filter is built per recipient in buildLobbyViewFor through chatMessagesForReader (golden rule 4: never filter a full broadcast). Test: build-view-for.test.ts 'hides the side stream from a seated guest and shows it to a walk-in'
  - Role is fixed at send time (decisions 2026-10-06 Lot 70). game-room chatAuthor checks spectators before seats, so a lobby walk-in always writes as 'spectator'
  - Lobby lines are round 0 and stamped 'Lobby'. Each line reads round label, then seat-colored bold nickname, then ': ' and the body (decisions 2026-10-06 'Rules chrome and lobby chat')
  - Chat sits at the bottom of the lobby player list, inside the Players section, under the Kick and bot-difficulty rows (frontend.md Lobby; decisions 'Rules chrome and lobby chat')
  - At most 200 characters. Empty or whitespace-only text is rejected by the server. Bots cannot send
  - The transcript lasts for the life of the room. Play again keeps it, and later lobby lines append (decisions 2026-10-06 'Room chat outlives one match')
  - Per the designer in this run: the lobby rules panel above the chat (host settings for allowed and excluded kits, Random only, the 5–180 s turn slider; read-only rules for guests and walk-ins) stays in V7
- **Notes:** Lobby section order (lobby.tsx): Game code with Copy, then LobbyRulesPanel, then 'Watching the lobby' or 'Your kit' (hidden when Random only), then Players list, then Chat, then Add bot (host only), then Start / Ready / Leave. The asymmetry is intentional and tested, but nothing surfaces it in the UI: no notice for the spectator, and no sign for seated players. Solo: only the human can write, so the chat has no other human reader.

### `lobby-host-seat-kick` — Host seat removal (Kick on bots and humans) + confirm dialog; unwired REMOVE_BOT

- **Files:** `apps/client/src/screens/lobby.tsx`, `apps/client/src/screens/lobby-kick.test.ts`, `apps/client/src/App.tsx`, `apps/client/src/net/use-room-connection.ts`, `packages/shared/src/protocol/messages.ts`, `packages/shared/src/protocol/action-reject.ts`, `apps/server/src/rooms/game-room.ts`, `apps/server/src/rooms/lobby-rules.ts`, `docs/agent/decisions.md`, `docs/agent/frontend.md`, `docs/technical_spec_v6.md`, `docs/technical_spec_v3.md`, `docs/backlog_v6.md`
- **Purpose:** Lets the lobby host take any other seat off the table before Start. Bots and humans both use one red Kick control and one confirm dialog, which sends KICK_PLAYER. The older REMOVE_BOT intent (L17-02) is still exported by the hook and handled by the server, but since L57-09 no UI calls it. It is the only client-to-server intent with no control, and that is on purpose: L57-09 replaced the per-bot Remove button with Kick.
- **Controls:**
  - Per-seat 'Kick' button (Button variant red) in each Players list row, shown only when isHost && player.id !== view.you, for bot and human seats alike (lobby.tsx ~L235-243). Local action only: setKickTarget({ id, nickname }) opens the confirm dialog; nothing is sent yet.
  - Confirm Dialog 'Kick this player?' (lobby.tsx ~L342-377). Body: '{nickname} will leave this lobby. They can join again with the code.'
  - Dialog 'Cancel' (orange): setKickTarget(null), sends nothing.
  - Dialog 'Kick' (red): onKickPlayer(kickTarget.id), then the dialog closes. App passes kickPlayer from the hook (App.tsx L50, L221), which does roomRef.current?.send(KICK_PLAYER, { playerId }) (use-room-connection.ts L510-512).
  - Dialog onClose (the shared Dialog close path, e.g. Escape or backdrop per design/components/dialog): setKickTarget(null).
  - Hook removeBot(playerId) sends REMOVE_BOT { playerId } (use-room-connection.ts L172, L506-508, L718). App.tsx (L33-69) never destructures it and LobbyScreen has no onRemoveBot prop, so no control triggers it.
  - Same row, next to Kick on bot seats (covered by the bot-controls surface): BOT_DIFFICULTIES buttons that send setBotDifficulty. Add bot lives in a separate host section.
- **States:**
  - Host only: non-host guests and walk-in lobby spectators see no Kick on any row. The server also rejects with kick-not-host (golden rule 8).
  - The host's own row never has Kick. The server rejects kick-self if the intent is forged.
  - Kick has no disabled state. When shown, it is always enabled.
  - Bot target: the server drops the seat (game-room.ts handleKickPlayer, isBotSeat branch). Same effect as handleRemoveBot: seats filtered, refreshJoinLock when occupancy drops, refreshAutoDispose, state broadcast. The bot row disappears for everyone with no toast or notice.
  - Human target: the target's client gets ERROR_MESSAGE code 'kicked'. The hook clears the token, turns off reconnection and returns to Home with status disconnected and the error 'You were kicked.' (use-room-connection.ts L245-262, L366-383). The seat reservation, kit pick and ready flag are cleared (unseatLobbySeat), and the target can Join the same code as a new guest.
  - Reject path: kick-not-host / kick-not-in-lobby / kick-self / kick-unknown / invalid-kick-payload come back as ERROR_MESSAGE and show in the lobby's inline error line (role=alert, text-cta-red).
  - REMOVE_BOT reject codes (remove-bot-not-host / -already-started / -unknown / -target-is-human, invalid-remove-bot-payload) are still defined, but the shipped client can no longer trigger them.
  - Solo and tutorial skip the lobby (soloLaunchPending), so Kick never shows there. The solo launch adds bots with ADD_BOT only and never removes any.
  - Play again reforming lobby: the host gets Kick again on every other seat, kicked humans included.
  - After a kick drops occupancy under MAX_PLAYERS, the host's Add bot buttons re-enable (canAddBot = players.length < MAX_PLAYERS).
- **Keep:**
  - The host can remove ANY other lobby seat, bot or human, before Start, and only in the lobby (L57-09; decisions.md 2026-09-15 '[P] Lot 57 lobby rematch add-on': 'Kick: host, lobby, any other seat. Human: drop + clear reservation. Bot: removeBot. Confirm on the client.'; technical_spec_v6 §Lot 57).
  - Removal needs a client-side confirm before the intent goes out (L57-09). lobby-kick.test.ts asserts that lobby.tsx contains 'Kick', 'setKickTarget', 'onKickPlayer' and 'Kick this player?'.
  - Bots are removed through kickPlayer, not removeBot. lobby-kick.test.ts asserts that lobby.tsx does NOT contain 'onRemoveBot', so a V7 lobby that brings back a separate Remove bot wiring breaks that test unless the decision is changed first.
  - The KICK_PLAYER payload is { playerId } (KickPlayerPayload, same shape as RemoveBotPayload). Protocol and intents stay unchanged in V7.
  - A kicked human sees 'You were kicked' on Home and may rejoin with the same code as a new guest (L57-09, frontend.md Lobby).
  - Non-host clients see bot seats (BotSeatLabel with difficulty, for every recipient) but get no seat-management controls (technical_spec_v3 §6; golden rule 8: a hidden button is not validation).
  - Removing a seat unlocks the room by occupancy, and Add bot becomes available again under MAX_PLAYERS (technical_spec_v3 §6, L17-02).
  - The host lobby rules sit on the same screen (LobbyRulesPanel: excluded kits, Random only, turn seconds 5–180; Lot 70 / L70-01). They must also stay in V7 (user instruction). They belong to a separate lobby-rules surface, not this one.
- **Notes:** History: L17-02 (commit 58b0565) shipped a per-bot 'Remove' button wired to onRemoveBot / REMOVE_BOT. L57-09 (commit 62fc38c, PR #26) renamed it to 'Kick', put the confirm dialog in front, extended it to human seats, and moved bots onto KICK_PLAYER. The server still handles REMOVE_BOT (game-room.ts L524-526, handleRemoveBot ~L1047-1083, canRemoveBot in lobby-rules.ts), so the protocol surface is intact. Server effect on a bot is the same either way. The only differences are the reject codes and that REMOVE_BOT refuses a human target. Spec drift: decisions.md and technical_spec_v6 say 'Bot: removeBot', but the shipped client sends kickPlayer for bots and the server handles the bot inside handleKickPlayer. Same effect, different wire message. Nothing in this surface comes from Lot 62 or later.


## Table

### `table-chat-popup` — Table chat button, unread badge and popup (also read-only on the finished board) · `Lot 62+`

- **Files:** `apps/client/src/screens/table/table-chat.tsx`, `apps/client/src/screens/table/chat-log.tsx`, `apps/client/src/screens/table/chat-unread.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/end.tsx`, `packages/shared/src/protocol/table-chat.ts`
- **Purpose:** In-match chat next to Forfeit, with a client-local unread count. It continues the lobby transcript.
- **Controls:**
  - Chat IconButton (speech-bubble SVG) in the turn strip, right of the timers and left of the flag. aria-label 'Chat' or 'Chat, N unread'. Click toggles the popup
  - Dialog 'Chat' (max-w-md) with ChatLog (same input and Send as the lobby)
  - Close (orange), Esc or overlay: closes and marks every current message as seen
- **States:**
  - unread > 0: red count badge on the button (messages arrived since the popup was closed; initial seen count = message count at mount, so lobby lines are not unread)
  - open: unread 0
  - living reader: living stream only
  - eliminated reader or walk-in spectator: both streams; can write (role eliminated or spectator)
  - finished board (EndScreen, readOnly): opens the holdout snapshot from that game's end; input hidden (canWrite = !readOnly); onSendChat is a no-op
  - tutorial: the control renders (no playKind gating) and the server accepts sendChat while the match runs
- **Keep:**
  - The control sits next to Forfeit; unread counts messages since the popup was closed and stays on the client (decisions 2026-10-06 Lot 70)
  - Role is frozen at send time; living readers never receive the side stream (rules spec §6 Chat)
  - Eliminated and spectator lines stay gray italic and labeled (frontend.md)
  - The finished board cannot send (rules spec §6 Chat)
- **Notes:** Primarily the table area, listed here because the chat is shared with the lobby.

### `rules-recall-table-end` — House-rules recall during the match and at Game over (no UI today) · `Lot 62+`

- **Files:** `packages/shared/src/protocol/state-view.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/App.tsx`, `apps/client/src/screens/game-over-dialog.tsx`
- **Purpose:** Records that rules are not shown after start, and where the data exists.
- **Controls:**
  - None. There is no table or Game over surface showing excluded kits, Random only or turn length
- **States:**
  - PlayingStateView has no lobbyRules field; the table never knows the excluded kits or the configured turn length
  - FinishedStateView.lobbyRules (Classic only, omitted for the tutorial) is consumed only by the solo Play again seed (App.tsx), never rendered
  - the table timer progress bar divides by a hardcoded 60_000 ms (table.tsx around line 1004), so with a 5–180s host clock the bar is wrong; the seconds label is right because it comes from the deadline
- **Keep:**
  - Timer display is cosmetic and trusts the server deadline (frontend.md)
  - The protocol stays unchanged in V7, so any rules recall must come from data already on the wire (lobby view before start, FinishedStateView.lobbyRules at the end) or from client memory
- **Notes:** addedAfterLot61 refers to the Lot 70 FinishedStateView.lobbyRules field. No recall UI exists.

### `table-shell-layout` — Table shell / felt layout

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/table-shell.tsx`, `apps/client/src/screens/table/felt-collapse.ts`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/index.css`, `apps/client/src/design/components/visual-viewport.ts`, `apps/client/src/design/seat-colors.ts`
- **Purpose:** Full-bleed container for the live table: turn strip, prompt banner, opponent row, felt 'Waiting on others' strip, action log, and the POV dock (private zone + economy bar). It measures felt/viewport size and collapses chrome into buttons + dialogs so the hand row is never cropped.
- **Controls:**
  - 'Opponents (N)' orange compact button (data-zone=opponents-collapsed), shown only when opponents are collapsed: opens the Opponents dialog (local)
  - 'Action log' orange compact button (data-zone=log-collapsed), shown only when the log is collapsed: opens the Action log dialog (local)
  - Horizontal scroll / touch-pan-x on the opponent row (overflow-x, overscroll-x-contain)
  - No intents are sent by the shell itself
- **States:**
  - Portrait: opponents, then pending, then log, then dock, stacked vertically
  - Landscape: two columns, left = opponents + pending + log, right = dock. Short phone landscape keeps the left column at ~10.5rem. Tall landscape (min-height 560px) uses minmax(16rem, 38%)
  - Viewport innerHeight <= 500px: Incoming and opponents are collapsed up front (SHORT_VIEWPORT_COLLAPSE_PX)
  - Overflow collapse order: Incoming (dock Incoming + felt Waiting) first, then opponents, then the action log
  - Pending strip empty or Incoming collapsed: data-empty=true, takes no space
  - Dock gets the POV seat color wash (seatZoneStyle intensity 'fill', active when it is my turn)
  - Tutorial board tour: extra padding classes on the turn, opponents and log zones so callout arrows fit
  - Collapsed dialogs auto-hide while any other modal is open (otherModalOpen) and close when the collapse no longer applies
- **Keep:**
  - The dock is primary: one uncropped hand row must always fit (L53-07). Chrome collapses instead of cropping cards
  - Opponents stay on one horizontally scrollable nowrap row, up to 7 opponents (Lot 53 / Lot 55 eight-player). 4+ opponents use compact seat chrome
  - Collapse order Incoming, then opponents, then log, plus the <=500px rule (L53-05 / L53-07). In landscape, used() ignores dock min-height because the dock sits beside the chrome
  - Shell is h-full / w-full of #root and never page-scrolls; no 100dvh / 100vw (frontend.md)
  - No 'Card Battle' header: the game code and connection status live in the turn strip
  - DOM hooks used by FX, hints and tests: data-zone table / turn / felt / opponents / pending / action-log / dock / private / economy, the collapsed-button zones, data-collapse-incoming/log/opponents, data-opponent-count
  - Flyouts aim at collapsed buttons when panels are unmounted, so chips and pulses still play
  - Collapse dialogs must fit the viewport with Close visible (L53-02 / L53-07)
- **Notes:** Paths are relative to /Users/yassine/Documents/Perso/Bataille des cartes/battle-cards. Reads: view.players (count, isYou), pendingEffects (count split on targetPlayerId === you), self.specialCards.length (dock min height), currentTurnPlayerId and turnOrder (seat color). The TableShell `legacyActions` prop is unused. Many tests (table-chrome.test.ts, opponent-seat-resources.test.ts, private-zone.test.ts and others; 23 files under screens/table) assert source strings with readFileSync, so a restructure will need those tests rewritten, not just re-run.

### `turn-strip-timers` — Turn strip: meta, turn owner, timers, icon buttons

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/timers.tsx`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/screens/status-labels.ts`, `apps/client/src/design/components/icon-button.tsx`, `apps/client/src/design/components/player-name.tsx`, `apps/client/src/screens/how-to-play-dialog.tsx`, `apps/client/src/feedback/feedback-dialog.tsx`
- **Purpose:** Shows the game code, own connection status, whose turn it is, the turn countdown and progress bar, the active seat's Block state and the POV's sub-choice countdown. Hosts the ?, !, Chat and flag controls.
- **Controls:**
  - '?' IconButton (aria 'How to play'): opens HowToPlayDialog. Closing with reason skip or got-it calls markHowToPlaySeen (local)
  - '!' IconButton (aria 'Feedback'): opens the manual FeedbackDialog (screen 'table' / 'tutorial'); on the finished board it calls the parent onOpenFeedback instead
  - Chat IconButton (see table-chat)
  - Flag IconButton (see table-leave-forfeit)
- **States:**
  - My turn: 'Your turn' with a stronger seat tint (inset 2px ring at 0.55 alpha)
  - Other seat's turn: seat-colored possessive '{Nick}'s turn'
  - No active player: nickname '—'
  - Deadline null (tutorial has no turn timer; finished board): label '—', empty bar
  - Active seat disconnected: 'Paused — reconnecting', bar empty
  - Active seat absent with no deadline: 'Absent — auto-draw'
  - Under 20% remaining: bar turns red and grows (scaleY 1.15). At expiry the label reads '0s' and the server acts; there is no special client state
  - Own connection label from STATUS_LABELS: 'Connected' / 'Reconnecting…' / 'Disconnected'. The table stays mounted while reconnecting
  - Active seat Block: 'Block chain · N turn(s) left' or 'Block · attacks banned this turn'
  - POV sub-choice open: 'Choice: Ns' and an orange bar (40s denominator, CLIENT_SUB_CHOICE_MS)
  - Tutorial tour highlights 'timer' and 'flag' (callouts with arrow)
  - Reduced motion: bars jump instead of animating
- **Keep:**
  - Timers are cosmetic. Trust the server deadline: lastTurnStarted.deadlineMs ?? view.turnDeadlineMs (L12-07)
  - Order: '?' then '!' left of the timers, Chat then flag on the right (frontend.md)
  - '!' is never replaced by the word Feedback; 44px IconButton (Lot 57)
  - data-hint-anchor='your-turn' on the timers block; data-zone timers / timer-label; progressbar aria labels 'Turn timer' and 'Sub-choice timer'
  - Illegal-action rejects use the IllegalActionDialog, not a strip under the timers (L39-02)
- **Notes:** Reads: view.gameCode, currentTurnPlayerId, the active seat's nickname / connection.status / blockTurnsRemaining / blockAttacksForbidden, turnOrder (seat color), subChoice.deadlineMs (POV only), plus the client-side connection status. table.tsx:1004 divides the remaining time by a hardcoded 60_000 ms. Lot 70 lets the host set 5–180 s and TURN_DURATION_MS can override it, so the bar is wrong for any non-60 s turn. PlayingStateView carries neither lobbyRules nor turnTimeSeconds.

### `table-chat` — Table chat popup · `Lot 62+`

- **Files:** `apps/client/src/screens/table/table-chat.tsx`, `apps/client/src/screens/table/chat-log.tsx`, `apps/client/src/screens/table/chat-unread.ts`, `packages/shared/src/protocol/table-chat.ts`, `apps/client/src/net/use-room-connection.ts`
- **Purpose:** In-game chat next to the flag: a living stream, plus a side stream for eliminated players and spectators.
- **Controls:**
  - Chat IconButton (aria 'Chat' or 'Chat, N unread') toggles the popup
  - Red unread count badge on the icon
  - Dialog 'Chat': Close (orange), Esc, overlay click
  - Text input 'Message' (maxLength 200, text-base so mobile does not zoom, commit 6372d04)
  - 'Send' (green, form submit or Enter): sends SEND_CHAT { body }. Empty or whitespace-only text is not sent; the input resets after send
- **States:**
  - Empty: 'No messages yet.'
  - Unread > 0 while closed; 0 while open
  - canWrite=false on the finished board: the input and Send are hidden
  - Living reader: living lines only (filtered server-side)
  - Eliminated or walk-in spectator reader: both streams. Side lines are gray italic and suffixed '(eliminated)' or '(spectator)'
  - Line stamp 'Lobby' (round 0) or 'Round N', then the seat-colored nickname, then the body
  - Auto-scrolls to the newest line on every update
- **Keep:**
  - Control sits next to Forfeit (decisions 2026-10-06 Lot 70)
  - Unread counts messages that arrived since the popup closed and stays client-local
  - Role is frozen at send time; living readers never receive the side stream (per-recipient view)
  - Finished board cannot send; the transcript persists for the room's life, including lobby lines (decisions 2026-10-06 'Room chat outlives one match')
  - Body is at most 200 characters; bots do not chat
- **Notes:** Reads: view.chatMessages [{order, senderId, nickname, role, body, round}], already filtered per recipient; view.players (seat colors). seenCount is initialized to messages.length on mount, so a remount (reconnect, live table to finished board) resets unread to 0. Walk-in spectators and eliminated players get canWrite = !readOnly = true (side stream).

### `table-leave-forfeit` — Corner flag + leave / forfeit confirm

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/table-flag-intent.ts`, `apps/client/src/screens/table/table-leave-confirm.tsx`, `apps/client/src/screens/table/forfeit-flag-icon.tsx`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/screens/end.tsx`
- **Purpose:** A single flag that forfeits, leaves, skips the tutorial or returns home depending on context, always behind a confirm.
- **Controls:**
  - Flag IconButton (red inline SVG; aria 'Forfeit' / 'Leave table' / 'Return home' / 'Skip tutorial'): the first click only opens the confirm
  - Confirm 'Stay' (green), Esc or overlay: closes and stays
  - Confirm 'Forfeit' (red): sends FORFEIT; the socket stays connected
  - Confirm 'Leave' (red): leaveGame() disconnects
  - Confirm 'Skip tutorial' (red): leaveGame() back to the hub
  - Confirm 'Return home' (red): on the finished board, end.tsx requestLeave (feedback ask-once), then the hub
- **States:**
  - Alive Classic: 'Leave the game?' / 'That counts as a forfeit.'
  - Eliminated or walk-in spectator: 'Leave the table?' (no body, sr-only title)
  - Tutorial: 'Skip the tutorial?' / 'You will return to the hub. This is not a forfeit.'
  - readOnly finished board: 'Return home?' / 'Leave this finished game and go back to the home screen.'
  - Tutorial board tour 'flag' highlight
- **Keep:**
  - The first flag click never leaves (L43-05); Esc / overlay = Stay
  - Forfeit keeps the socket and sends FORFEIT; every other intent disconnects (L43-06)
  - The flag stays on the finished inspect board as Return home (designer 2026-08-21 follow-up)
  - Skip tutorial is flag-only (L45)
  - Server side, a forfeit pays kill rewards to living seats with a queued attack on the forfeiter (Lot 71). The copy does not mention it today
- **Notes:** Reads: readOnly, self eliminated (players[isYou].isEliminated), view.playKind, view.isSpectator. The 'hidden' intent exists in the type but is never produced.

### `table-prompts` — State prompt banner (Game over / Watching / Eliminated)

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/claim-seat.ts`
- **Purpose:** A one-box explainer above the felt when the POV cannot act.
- **Controls:**
  - None
- **States:**
  - readOnly: 'Game over' / 'Inspect the final board. Open Stats for the recap, or use the flag to return home.'
  - Walk-in spectator, hands visible (any player.spied present): 'Watching' / 'You can see every hand. Claim a disconnected seat or leave the table.'
  - Walk-in spectator, fogged (claim picker still open, L57-16): 'Watching' / 'Claim a disconnected seat or leave the table.'
  - Eliminated: 'Eliminated' / 'You are a spectator. Actions are locked while rewards (if any) resolve.'
  - Alive: hidden
- **Keep:**
  - Walk-in fog: kits and hands stay hidden until Stay spectating or the claim list empties (L57-16)
- **Notes:** Reads: readOnly, view.isSpectator, players[].spied presence (walkInSeesPrivateHands), self isEliminated. The claim-seat picker itself is an App-level overlay (App.tsx ClaimSeatDialog).

### `opponent-seat` — Opponent seat / zone

- **Files:** `apps/client/src/screens/table/opponent-zone.tsx`, `apps/client/src/screens/table/opponent-seat-resources.ts`, `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/screens/table/flow-status-badges.tsx`, `apps/client/src/screens/table/spy-eye-icon.tsx`, `apps/client/src/design/components/kit-portrait.tsx`, `apps/client/src/design/components/connection-badge.tsx`, `apps/client/src/design/components/bot-seat-label.tsx`, `apps/client/src/design/components/resource-icon.tsx`, `apps/client/src/design/components/player-name.tsx`, `apps/server/src/protocol/build-view-for.ts`
- **Purpose:** Compact public card for each opponent: name, status, kit portrait (hidden unless revealed), actives, Sentence countdown and the four resources (or '?').
- **Controls:**
  - Kit portrait button, only when Spy+ (hasFullSpyCardReveal) or eliminationReveal: opens OpponentRevealDialog. It also sets portraitInspected (tutorial Look gate) and dismisses the 'hidden-kit' hint
  - Active thumbs (shield + persistents): open the card inspect dialog (source 'active')
  - Sentence chips: open the card inspect dialog
  - No intents
- **States:**
  - Active seat: stronger seat tint, data-active-seat=true
  - Unspied: placeholder portrait, all four resources '?', data-hint-anchor='hidden-kit'
  - Base Spy (Lot 69): live lives / points / upgrade points / shield as numbers; kit still hidden; portrait not clickable
  - Spy+: kit portrait, live numbers, portrait clickable to the reveal
  - Eliminated: greyscale portrait with 'Eliminated' badge, frozen death numbers, portrait clickable. Connection badge, spy eye, bot label and flow badges are hidden
  - Connection badge: 'disconnected — grace' / 'absent N/3' / 'idle timeouts N/5'
  - Spying on you: open eye icon 12px (title / aria 'Spying on you')
  - Bot seat: BotSeatLabel with difficulty (hidden in the tutorial)
  - Flow badges: 'Block · N left' / 'Block · attacks banned' / 'Invisible' / 'Reanimating'
  - Compact chrome when 4+ opponents
  - Tutorial: 'opponent-portrait' spotlight, 'opponent' tour highlight
  - Eliminated POV or Stay walk-in: every seat shows the full overlay (spied filled server-side)
- **Keep:**
  - Hug content, never crop the kit portrait; resources stack beside the portrait, actives under it (L51-10)
  - Never print unspied totals; the four resource icons always render, '?' when unknown (L51-08)
  - Token flyouts only for seats with known numbers (flyToken)
  - No hand card count for opponents: it is private (state-view.ts ruling 2026-07-30)
  - Duplicator window is Spy-gated and has no public badge (designer 2026-08-06)
  - DOM hooks: data-zone opponent-seat with data-player-id / data-seat / data-seat-index, opponent-portrait, opponent-actives, opponent-resources, data-resource-kind, data-spy-eye
- **Notes:** Reads PublicPlayerView: id, nickname, isEliminated, isBot, botDifficulty, connection.{status, automaticTurnsTaken, consecutiveTimeouts}, spyingOnYou, blockTurnsRemaining, blockAttacksForbidden, activePersistentEffects[{id, cardId, isUpgraded, counter}], activeShield.isUpgraded, pendingReanimation, spied.{kitId, hand, specialCards, lives, points, upgradePoints, shield}, eliminationReveal.{kitId, lives, points, upgradePoints, shield}. Also view.currentTurnPlayerId, view.pendingSentences, view.playKind, and seat index from turnOrder. Not rendered: drawGain (FX only), duplicationActive, activeAttackBlock, absorbWindowOpen, spied.resourcesSnapshot. Lot 69 changed Spy so that base Spy carries live resources only and Spy+ carries kit, cards and resources (build-view-for.ts buildSpiedView). The comments in opponent-seat-resources.ts, opponent-reveal-dialog.tsx and resource-icon.tsx and the SpiedPlayerView doc in state-view.ts still describe the pre-69 model; the code behaves per Lot 69.

### `private-zone-identity` — Private zone: identity row, own resources, Duplicator control

- **Files:** `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/design/components/kit-portrait.tsx`, `apps/client/src/design/components/resource-icon.tsx`, `apps/client/src/design/components/connection-badge.tsx`, `apps/client/src/screens/table/flow-status-badges.tsx`, `apps/client/src/screens/table.tsx`
- **Purpose:** The POV's own seat: kit portrait, name and status, own actives and Sentence chips, the Incoming stack beside the kit, the card band, the four exact resources, and the Duplicator activation.
- **Controls:**
  - Own kit portrait button (aria 'Inspect your kit'): opens KitInspectDialog for self.kitId
  - Own active thumbs: open the card inspect dialog (source 'active'; Upgrade / Deactivate live there)
  - Own Sentence chips: open the card inspect dialog
  - Incoming chips and the collapsed 'Incoming (N)' / 'Waiting (N)' button (see incoming-pending)
  - 'Activate duplication' (purple; Duplicator kit when not yet active): sends ACTIVATE_DUPLICATION; disabled off-turn or when actions are locked
  - Hand / specials cards (see card-band)
- **States:**
  - Name, own connection badge (absent / idle timeouts) and flow badges (Block, Invisible, Reanimating)
  - Resources row with visible captions Lives / Shield / Points / Upgrade points; 'Shield ↑' pill when shieldIsUpgraded
  - 'Duplication active' text while the window is on
  - Dock seat wash, stronger on my turn
  - Eliminated: dock still shown but locked; the own portrait is not greyed
  - Walk-in spectator: the whole private zone is replaced by text, either 'Watching this table. Hands and kits are visible the same way as an eliminated player.' or 'Hands stay hidden until you stay spectating or sit.'
  - Tutorial tour highlights: your-zone, kit, resources, incoming, hand, specials
  - Turn-flow row renders empty (just a top border) when Invisibility is active and the kit is not Duplicator
- **Keep:**
  - Own kit portrait one step larger than opponents' (w-12 / sm:w-16; decisions 2026-09-28)
  - Resource captions visible, not sr-only / title only (L43-01)
  - Incoming sits beside the kit on the identity row (L53-07)
  - DOM hooks: data-zone private-zone with data-player-id = you (flyout POV root), resources with data-resource-kind, data-hint-anchor resources
  - ResourceIcon animates deltas and token flyouts for the dock
- **Notes:** Reads (private, POV only): view.self.{kitId, lives, shield, shieldIsUpgraded, points, upgradePoints, activePersistentEffects, hand, specialCards}. Public self (players[isYou]): nickname, connection, blockTurnsRemaining, blockAttacksForbidden, activePersistentEffects, pendingReanimation, duplicationActive (Spy-gated, true for self). Also view.pendingSentences (own), view.you, currentTurnPlayerId. Not rendered: self.attackBlockCharges.

### `card-band` — Card band (Hand + Specials rows)

- **Files:** `apps/client/src/screens/table/card-band.tsx`, `apps/client/src/screens/table/card-band-fit.ts`, `apps/client/src/design/components/animated-card.tsx`, `apps/client/src/design/components/card.tsx`
- **Purpose:** Shows the POV's hand and unplayed specials as tappable faces at one shared size.
- **Controls:**
  - Tap / click a hand or special card: opens the card actions dialog (works off-turn and during sub-choices, so the card can be read)
  - Horizontal scroll on each row
- **States:**
  - Empty hand: 'Empty'; no specials: 'None' (label + text only, no flex space)
  - Stacked (Hand over Specials) vs side-by-side; re-stack needs the band 48px taller than the enter threshold (L65-04)
  - Card width 22–48px from row height; extra cards overflow horizontally
  - Upgraded cards show the upgraded art and '↑' after the name; attack faces show a listed-damage badge
  - Upgrade flip animation when isUpgraded changes; entrance flip skipped
  - Tutorial: per-card spotlight (callout + selected ring) and section spotlight (hand / specials tour)
  - Tutorial tour or Look gate active: cards are not clickable (onSelectOwnCard omitted)
- **Keep:**
  - Hand and Specials share one face width; Specials never size independently (L53-07)
  - One row each with horizontal scroll: no wrap, no vertical card scroll, no pager (L53-07)
  - The full face (art + name) is never cropped; shrink below the preferred minimum rather than crop
  - A short row packs to w-max and centers with mx-auto (do not justify-center the overflow row)
  - DOM hooks: data-zone card-band / hand / specials, data-instance-id on each card (play/sell flyouts), data-hint-anchor hand / specials on the card cluster
- **Notes:** Reads self.hand and self.specialCards (CardInstance: instanceId, cardId, isUpgraded). Private to the POV.

### `card-actions-dialog` — Card actions dialog (Use / Upgrade / Sell / Multi-attack)

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/chrome-labels.ts`, `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/design/components/card-effect-copy.tsx`, `apps/client/src/design/components/cost-display.tsx`, `apps/client/src/design/components/structured-cost.ts`
- **Purpose:** Read a card's effect and act on it.
- **Controls:**
  - 'Use' (purple, play cost as − CostDisplay), via onBeginUse: Regeneration opens the quantity picker; Card Transformer opens the consume picker; targeted cards (cardPlayNeedsTarget) open the target picker; anything else sends PLAY_CARD { instanceId } at once and closes
  - 'Upgrade' (orange, −1 upgrade point): sends UPGRADE_CARD { instanceId } and closes. Hidden when already upgraded
  - 'Sell' (green, + catalog sellYield): sends SELL_CARD { instanceId } and closes. Hidden for specials
  - 'Multi-attack' (purple), only when the kit allows multiple attacks (Assassin) and the card is an attack: opens the multi-attack dialog
  - 'Cancel' (red), Esc, overlay: close
- **States:**
  - Title = card name; the body shows the face plus CardEffectCopy (base effect + upgrade block, or upgradeEffect only when upgraded)
  - Off-turn or locked (readOnly, sub-choice open, eliminated, spectator): every action disabled, with 'Actions locked — you can still read the card.'
  - Use disabled for Card Transformer with no shared action/attack card in hand
  - Use disabled for hostile cards while own Invisibility is active (cardActsOnOpponents, L58-06). No reason text is shown
  - Upgrade disabled with 0 upgrade points
  - 'Temporarily unavailable' text replaces Use for frozen card ids (the list is currently empty)
  - Tutorial spotlight on Use / Upgrade / Sell; a tutorial-illegal send is blocked client-side and the coach shows the follow-coach copy
- **Keep:**
  - No 'Choose Use, Upgrade, or Sell' prompt (L51-12)
  - Interactive costs are icons: − for paying (Use / Upgrade), + for receiving (Sell) (L39-04)
  - Sell is green for contrast (designer 2026-08-21)
  - Compact CTAs wrap so all buttons fit at 390px (L53-02)
  - Same intent payloads as V1; the server revalidates everything (golden rule 8)
- **Notes:** Reads the selected own CardInstance, self.upgradePoints, self.activePersistentEffects (Invisibility), self.hand (Transformer eligibility), kit traits.allowsMultipleAttacksPerTurn, isMyTurn. Tutorial dismisses the inspect-hand / inspect-special hints when the dialog opens.

### `card-target-picker` — Target seat picker

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/attack-targets.ts`, `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/design/components/seat-tile.tsx`
- **Purpose:** Choose the opponent for a targeted play.
- **Controls:**
  - SeatTile per eligible seat: select (aria-pressed); the first eligible seat is preselected
  - 'Confirm' (purple): sends PLAY_CARD { instanceId, targetPlayerId } and closes
  - 'Cancel' (red), Esc, overlay
- **States:**
  - Attack cards: living non-invisible seats, plus eliminated seats that still have an attack pending on you (riposte)
  - Thief: living seats, plus eliminated seats with a Thief pending on you
  - Absorber: living seats or eliminated seats with absorbWindowOpen, excluding invisible ones
  - Spy, Cloning, Curse, base Card Thief, base Upgrade Point Thief, base Spy Thief: living non-invisible seats
  - No eligible seat: empty grid, Confirm disabled, no explanation
  - Tile kit is shown only for Spy+ or death reveal; otherwise the '?' placeholder
- **Keep:**
  - Living invisible seats are never offered (L65-02)
  - Riposte against an eliminated attacker only while their attack is pending on you (L68-07)
  - Base Spy Thief is targeted, the upgrade is not (Lot 71); upgraded Card Thief / Upgrade Point Thief are untargeted (L66-01)
  - The tile never reveals a kit the POV cannot already see
- **Notes:** Reads players.{id, nickname, isEliminated, absorbWindowOpen, activePersistentEffects (invisibility)}, spied / eliminationReveal kit (visibleKitId), pendingEffects {id, cardId, sourcePlayerId, targetPlayerId}, turnOrder (seat wash). Riposte, invisible exclusion and Spy Thief targeting were added after Lot 61.

### `regeneration-quantity-picker` — Regeneration quantity picker

- **Files:** `apps/client/src/screens/table/card-actions.tsx`
- **Purpose:** Pick how many lives to buy with Regeneration.
- **Controls:**
  - Four tiles '1 life' … '4 lives', each with a points cost (per-life play cost × n): a click sends PLAY_CARD { instanceId, quantity n } and closes
  - 'Cancel' (red), Esc, overlay
- **States:**
  - Upgraded cost via structuredPlayCost
  - No client-side affordability check (the server rejects)
- **Keep:**
  - Click-to-commit, Cancel-only footer (L44-06)
- **Notes:** Reads the selected instance's isUpgraded plus the catalog.

### `card-transformer-consume-picker` — Card Transformer consume picker

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/design/components/card-choice-tile.tsx`
- **Purpose:** Choose which shared action/attack card in hand Card Transformer consumes.
- **Controls:**
  - CardChoiceTile grid of the shared cards in hand (first preselected)
  - 'Transform' (purple): sends PLAY_CARD { instanceId, consumeInstanceId } and closes
  - 'Cancel' (red), Esc, overlay
- **States:**
  - None eligible: 'No action or attack card in hand to transform.', Transform disabled
- **Keep:**
  - The payload uses consumeInstanceId (L24-02 / L44-05)
- **Notes:** Reads self.hand filtered to SHARED_CARD_IDS.

### `assassin-multi-attack` — Assassin multi-attack dialog

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/attack-targets.ts`
- **Purpose:** Play several hand attacks as one action, each with its own target.
- **Controls:**
  - CardChoiceTile toggle per hand attack card
  - Per selected card, a SeatTile grid for its target (defaults to the current target)
  - 'Play N attacks' (purple): sends PLAY_MULTIPLE_ATTACKS { attacks: [{ instanceId, targetPlayerId }] } and closes
  - 'Cancel' (red), Esc, overlay
- **States:**
  - Disabled until 2+ attacks are selected and each has a target
  - Only hand attacks (isSharedAttackCardId) are listed, not specials such as MEGA ATTACK
  - Target list = attackTargetOpponents (living non-invisible + riposte)
  - Staggered entrance motion (off with reduced motion)
  - The selection persists after Cancel (multiIds is not cleared)
- **Keep:**
  - Visible only when the kit allows multiple attacks per turn
  - The server decides volley pairing (L68-05)
- **Notes:** Reads self.hand, opponents, pendingEffects.

### `card-inspect-dialog` — Card inspect dialog (active / Spy / log / queue / Sentence)

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/screens/table/active-display.ts`, `apps/client/src/design/asset-lookup.ts`
- **Purpose:** Read-only view of any card the POV can see, plus Upgrade and Deactivate for own actives.
- **Controls:**
  - 'Upgrade' (orange, −1 upgrade point), shown when the inspected card is an own unupgraded upgradeable active, own shield or own ticking Sentence: sends UPGRADE_CARD { instanceId } where instanceId is the effect id, ACTIVE_SHIELD_INSTANCE_ID or the Sentence id. Disabled off-turn or when locked
  - 'Deactivate' (purple), on own active persistents except Shield and Sentence, my turn only: opens the deactivate confirm
  - 'Close' (green), Esc, overlay
- **States:**
  - Source spy: 'Spy reveal — inspect only'
  - Source active: 'Active', plus 'Card lives' or 'Turns left' (Invisibility) with a count badge when counter is not null
  - Source log / queue: catalog card only, no footer (synthetic id inspect:{source}:…)
  - Activated art only for cards that have activated PNGs; Sentence and Shield use face art
- **Keep:**
  - Inspect from log / queue / chips (L56-05)
  - Sentence has no activated PNG; requesting one throws and blanks the table
  - Upgrade active Poison, Points Generator, Imposition, Super Absorber, Roulette, Invisibility, Shield and a ticking Sentence (L66-01 / L67-01); Curse and Reanimation cannot be upgraded
  - Escape on the confirm returns to inspect rather than closing everything (Lot 69 test)
- **Notes:** Reads the dialog instance, self.upgradePoints, self.shield, self.activePersistentEffects, pendingSentences {id, sourcePlayerId, isUpgraded}, the opponent's activeShield / activePersistentEffects (counter), and spied / eliminationReveal hand and specials for the spy source. Bug: inspecting an opponent's base Shield shows Upgrade whenever the POV has a base shield and an upgrade point, because both use ACTIVE_SHIELD_INSTANCE_ID. Clicking it upgrades the POV's own shield.

### `deactivate-confirm-dialog` — Voluntary deactivate confirm · `Lot 62+`

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/table-copy.ts`
- **Purpose:** Confirm the free manual deactivation of an own persistent.
- **Controls:**
  - 'Cancel' (green) or Esc: back to the inspect dialog
  - 'Deactivate' (purple): sends DEACTIVATE_PERSISTENT { effectId } and closes both dialogs
- **States:**
  - Copy 'Are you sure?' / 'This card will be lost. This does not cost a turn.'
  - Available for own persistents, including a Curse on you and Invisibility; never for Shield or Sentence
  - Gated only on isMyTurn, not on actionsLocked
- **Keep:**
  - Lot 69: deactivate as many persistents as you want on your turn without spending the action; the card goes to the pool (rules spec §5)
  - The server rejects persistent-not-manual / persistent-not-active
- **Notes:** Reads self.activePersistentEffects and isMyTurn. Not offered on the finished board (onDeactivatePersistent is not passed there).

### `active-persistent-thumbs` — Active card thumbs (persistents + Shield)

- **Files:** `apps/client/src/screens/table/active-persistent-thumb.tsx`, `apps/client/src/screens/table/active-display.ts`, `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/screens/table/opponent-zone.tsx`, `apps/client/src/design/components/life-count-badge.tsx`
- **Purpose:** Show each seat's active slots.
- **Controls:**
  - Click a thumb: opens the card inspect dialog (source 'active')
- **States:**
  - Shield thumb (face art, no activated PNG) while self.shield > 0 or the opponent's activeShield is not null
  - Persistents in activated art
  - Counter badge: heart 'card-lives', or 'turns' for Invisibility; no badge when counter is null (Curse, Shield)
  - Own size w-7 / sm:w-8; opponent w-6 / sm:w-7
- **Keep:**
  - Card lives under actives (L56-06); Invisibility turns badge (L58-06)
  - Opponent shield points never shown; only presence and tier are public (PROTOCOL 20)
  - Up to four active slots (Lot 69); there is no slot counter UI today
- **Notes:** Reads activePersistentEffects [{id, cardId, isUpgraded, counter}], activeShield.isUpgraded, self.shield, self.shieldIsUpgraded.

### `sentence-chips` — Ticking Sentence chips · `Lot 62+`

- **Files:** `apps/client/src/screens/table/sentence-chip.tsx`, `apps/client/src/screens/table/opponent-zone.tsx`, `apps/client/src/screens/table/private-zone.tsx`
- **Purpose:** Public countdown of each ticking Sentence on its caster.
- **Controls:**
  - Click a chip: opens the card inspect dialog (Upgrade is offered when it is your own unupgraded Sentence)
- **States:**
  - One chip per Sentence, showing remaining owner turns in red; compact on opponent seats
- **Keep:**
  - Public pendingSentences (L63-05, PROTOCOL 37); the chip is clickable (L65-03)
  - Remaining turns are not card lives
  - Uses the catalog face (no activated PNG)
- **Notes:** Reads view.pendingSentences [{id, sourcePlayerId, remainingOwnerTurns, isUpgraded}].

### `incoming-pending` — Incoming queue (dock, beside the kit)

- **Files:** `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/screens/table/pending-queue.tsx`, `apps/client/src/screens/table/pending-chip-tone.ts`, `apps/client/src/fx/incoming-threat-diff.ts`, `apps/client/src/screens/table/table-copy.ts`
- **Purpose:** Pending effects aimed at the POV that resolve after the POV's next action.
- **Controls:**
  - Chip button (aria 'Inspect {label}'): opens catalog inspect (source 'queue')
  - Collapsed orange button 'Incoming (N)', or 'Waiting (N)' when nothing is incoming: opens the Incoming dialog
- **States:**
  - None incoming and not collapsed: hidden, no flex space
  - Stacked compact chips, capped at max-h-14, then vertical scroll
  - Chip: card label (with ↑ when upgraded), listed damage badge (catalog × damageMultiplier), source → target seat-colored names, tooltip with 'queued #N' and damage
  - Real chips get a no-arrow callout ring: red for attack tone, orange otherwise (L51-07)
  - Mirror sub-choice open: eligible chips get a purple ring
  - Entrance animation on new chips (off with reduced motion)
  - Collapsed on short viewports
  - Tutorial 'incoming' highlight
- **Keep:**
  - Incoming = pendingEffects with targetPlayerId === you; shown beside the kit (L53-07)
  - A new incoming attack triggers threat FX and the 'You are being attacked' banner (L39-05)
  - Listed damage uses listedAttackDamage (L56-04)
  - DOM hooks: data-zone incoming-pending / incoming-collapsed, data-pending-id, data-hint-anchor incoming (hints incoming / incoming-thief)
- **Notes:** Reads pendingEffects {id, cardId, isUpgraded, sourcePlayerId, targetPlayerId, queuedAt, damageMultiplier} and players nicknames / seat. redirectedBy is not read. persistent-incoming.ts (presentation chips for Imposition / Points Generator / Curse) has not been wired into table.tsx since commit c0e9668 (Lot 14), although frontend.md still says those chips render.

### `waiting-on-others-strip` — Felt 'Waiting on others' strip

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/pending-queue.tsx`, `apps/client/src/screens/table/table-shell.tsx`
- **Purpose:** Public queue of pending effects between other seats.
- **Controls:**
  - Chip: opens catalog inspect (source 'queue')
- **States:**
  - Hidden when empty or when Incoming is collapsed (it then lives in the Incoming dialog)
  - One horizontal nowrap scrolling row, title on the same row
  - Same chip anatomy, callout tones and Mirror highlight as Incoming
- **Keep:**
  - Effects on others stay on the felt; effects on you stay in the dock (L43-03)
  - Felt tone (light chips on dark felt)
- **Notes:** Reads pendingEffects where targetPlayerId !== you. The pending queue is public (rules spec §6).

### `collapsed-chrome-dialogs` — Collapsed chrome dialogs (Incoming / Action log / Opponents)

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/action-log/action-log-panel.tsx`
- **Purpose:** Holds chrome that was collapsed off the felt.
- **Controls:**
  - 'Close' (green), Esc, overlay
  - Incoming dialog: chips open inspect
  - Action log dialog: card-name segments open inspect (ActionLogPanel embedded)
  - Opponents dialog: the full seat controls; any inspect closes the dialog first
- **States:**
  - Incoming dialog title is 'Incoming' when anything targets you, else 'Waiting on others'; it lists both queues as full chips with queued #
  - Opponents dialog title 'Opponents (N)'; seats on one nowrap scrolling row
  - Hidden while any other modal is open; closes when the collapse flag clears
- **Keep:**
  - Dialogs fit the viewport with Close visible (L53-07)
  - The log dialog uses `embedded` so it is not a full-height white slab
- **Notes:** Same reads as the hosted surfaces. ActionLogPanel itself (rounds, segments, resource nets, fog) belongs to apps/client/src/action-log.

### `economy-bar` — Economy bar (Draw / Shop / Unspy / Stats)

- **Files:** `apps/client/src/screens/table/economy-bar.tsx`, `apps/client/src/screens/table/chrome-labels.ts`, `apps/client/src/screens/table/spy-eye-icon.tsx`, `apps/client/src/screens/table.tsx`
- **Purpose:** The POV's always-available turn actions.
- **Controls:**
  - Draw (green, or red when payout > 10): icon + number only; aria / title 'Draw, plus N points'; sends DRAW_CARD
  - Shop (orange, word label): opens the Shop dialog. Always openable, including off-turn and on the finished board; blocked during the tutorial tour / Look gate
  - Unspy (purple, crossed eye + −10): opens the Unspy picker
  - Stats (purple), finished board only: reopens the Game over stats
- **States:**
  - Draw / Unspy disabled off-turn or when actions are locked (readOnly, sub-choice open, eliminated, walk-in)
  - Unspy also disabled with no living seat spying you, or under 10 points
  - Draw pulses at turn start and whenever the payout changes (Gambler reroll)
  - Tutorial spotlight on draw / shop (extra padding for the arrow)
  - Walk-in spectator: the bar is still rendered, disabled, with a Draw value from the filler kit
- **Keep:**
  - No word labels on Draw / Unspy; names stay in aria-label / title (L59-01, designer 2026-09-15)
  - Shop keeps its word label, same compact button (L59-02)
  - Nested CostDisplay title={null} so hover reads the button name
  - Draw green for contrast (designer 2026-08-21); red when drawValue > 10 (L64-05)
  - drawValue = selfPublic.drawGain ?? kit catalog draw (L64-05)
  - DOM hooks: data-hint-anchor draw / shop, data-unspy
- **Notes:** Reads isMyTurn, actionsLocked, players[isYou].drawGain, self.kitId (catalog draw), self.points >= CLEAR_SPY_COST, players[].{spyingOnYou, isEliminated}. The Gambler red / pulse is Lot 64 (after 61).

### `shop-dialog` — Shop dialog (upgrade points, shared cards, special, pool)

- **Files:** `apps/client/src/screens/table/shop-dialog.tsx`, `apps/client/src/screens/table/chrome-labels.ts`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/design/components/choice-tile-chrome.ts`
- **Purpose:** Buy and sell outside of card play. Each purchase is the turn's one action.
- **Controls:**
  - Upgrade points 'Buy' (orange, −kit buy cost / +1 upgrade point): sends BUY_UPGRADE_POINT and closes
  - Upgrade points 'Sell' (green, +kit sell yield / −1 upgrade point): sends SELL_UPGRADE_POINT and closes
  - Shared card tile: click selects (aria-pressed); double-click buys and closes
  - 'Buy selected' (orange): sends BUY_CARD { cardId } and closes
  - 'Buy special' (orange, −20 points): sends BUY_SPECIAL_CARD and closes
  - Pool 'Buy random' (orange, −poolBuyCost): sends BUY_POOL_CARD and closes
  - 'Close' (red), Esc, overlay
- **States:**
  - Off-turn / locked: every buy button and every card tile disabled (a tile cannot even be selected)
  - Unaffordable tiles faded, aria ', cannot afford'; Buy selected disabled
  - Buy special disabled under 20 points; upgrade-point Buy disabled under the kit cost; Sell disabled at 0 upgrade points
  - Buy random disabled when the pool is empty or points are below the fee
  - Pool header 'Pool (N)', public faces with card type; 'The pool is empty.'
  - Shop faces show upgraded art and '↑' when the kit's alwaysUpgraded covers the card
  - Price blurb 'Prices are double the play cost.' with the selected card's cost
  - Tutorial: shop-upgrade-point highlight (scrollIntoView) and shop-absorber (Absorber preselected, callout on Buy selected)
  - Finished board: browse only
- **Keep:**
  - Upgrade-point costs computed from the kit at render, never cached (L58-03)
  - Pool faces public; recovered identity is fogged in the log only (L63-06)
  - Spy shop buy 4 / play 2 (Lot 54; do not restore 4/8)
  - Every successful buy closes the Shop
  - The Shop is never auto-opened in the tutorial
- **Notes:** Reads self.kitId, self.points, self.lives, self.upgradePoints, view.pool [CardInstance], view.poolBuyCost, plus the catalog. The Buy special cost of 20 is hardcoded in the client.

### `unspy-dialog` — Unspy seat picker

- **Files:** `apps/client/src/screens/table/unspy-dialog.tsx`, `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/design/components/seat-tile.tsx`
- **Purpose:** Pay 10 points to drop one living opponent's Spy on you.
- **Controls:**
  - SeatTile per living opponent spying you; a single spy is preselected
  - 'Confirm' (purple): sends CLEAR_SPY { targetPlayerId } and closes
  - 'Cancel' (red), Esc, overlay: closes and resets the pick
- **States:**
  - Hint 'Choose who is spying you.'
  - Confirm disabled with no pick
- **Keep:**
  - Drops their Spy on you, not yours on them (L58-07)
  - A single spy is preselected so Confirm stays readable (L58-09)
  - An eliminated spectator's overlay is not a Spy and is never listed
- **Notes:** Reads players.{id, nickname, isEliminated, spyingOnYou}, plus visible kit for the tile.

### `kit-inspect-dialog` — Own kit inspect dialog

- **Files:** `apps/client/src/screens/table/kit-inspect-dialog.tsx`, `apps/client/src/screens/table/kit-inspect-details.tsx`, `apps/client/src/screens/table/kit-inspect-traits.ts`, `apps/client/src/screens/table/kit-special-card-key.ts`
- **Purpose:** Static catalog facts about the POV's own kit.
- **Controls:**
  - 'Close' (green), Esc, overlay
- **States:**
  - Shows: kit name, portrait, starting resources (lives, points, upgrade points, Draw +N), starting hand versos ×counts, special cards with play costs, Always upgraded, Immune to, Attacks per turn, Upgrade point buy/sell, Draw risk, Ability copy (Ghost, Duplicator, Prophet, Gambler)
  - 'None' for empty trait groups
- **Keep:**
  - Starting hand as action / attack versos, never 'N action · M attack' prose (L51-04)
  - Every KitTraits field has a section (L30-05 test)
  - KitInspectDetails is shared with the lobby kit picker
- **Notes:** Reads self.kitId only, plus getKit / getCard. Opponents' kits cannot be opened here; the opponent reveal shows only the name.

### `opponent-reveal-dialog` — Opponent reveal (Spy+ / death)

- **Files:** `apps/client/src/screens/table/opponent-reveal-dialog.tsx`, `apps/client/src/screens/table.tsx`
- **Purpose:** Opponent's revealed kit, hand, specials and resources.
- **Controls:**
  - Hand / special thumbs: close this dialog and open card inspect (source 'spy', inspect only)
  - 'Close' (green), Esc, overlay
- **States:**
  - Spy+ mode: title = nickname, live numbers
  - Elimination mode: '{nick} (eliminated)', frozen at death
  - Hand 'Empty' when none; Specials section only when there are any
  - Resources '?' if any value is missing
- **Keep:**
  - Only reachable for Spy+ or a death reveal
  - No snapshot / '— Spy' copy (L51-08 test)
- **Notes:** Reads spied.{kitId, hand, specialCards, lives, points, upgradePoints, shield} or eliminationReveal.{kitId, hand, specialCards, lives, points, upgradePoints, shield}. eliminationReveal.shieldIsUpgraded is not shown. The header comment saying base Spy shows '?' predates Lot 69.

### `illegal-action-dialog` — Illegal action dialog

- **Files:** `apps/client/src/screens/illegal-action-dialog.tsx`, `apps/client/src/screens/illegal-action-copy.ts`, `packages/shared/src/protocol/action-reject.ts`
- **Purpose:** Explains a server reject in plain words.
- **Controls:**
  - 'OK' (green), Esc, backdrop
- **States:**
  - Title / body per ActionRejectCode (default title "Can't do that"), falling back to the wire message
  - Lot 69 codes: finish-slot-drop, no-slot-drop-pending, slot-drop-invalid
  - Unmounted when cleared (avoids a stuck overlay, L39-06)
  - Tutorial: illegal clicks never send; the coach shows 'tutorial-follow-coach' instead
- **Keep:**
  - Every ActionRejectCode has copy (exhaustive test)
  - Lobby keeps its inline alert; the table uses the modal (L39-02)
- **Notes:** Reads actionReject { code, message } from the connection, not from PlayingStateView.

### `slot-drop-picker` — Active slot drop picker (fifth active) · `Lot 62+`

- **Files:** `apps/client/src/screens/table/sub-choice/slot-drop-panel.tsx`, `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx`, `packages/shared/src/protocol/messages.ts`, `apps/server/src/engine/specials/slot-drop.ts`
- **Purpose:** With four actives, pick one to drop so a new activation sticks, or cancel. In the Curse case, the Curse user picks one of the victim's slots.
- **Controls:**
  - CardChoiceTile per eligible slot (aria 'Drop {caption}'): sends RESOLVE_SUB_CHOICE { kind: 'slot-drop', slotId } immediately, with no confirm
  - 'Cancel' (red): sends { kind: 'slot-drop', cancel: true }
  - No Esc or overlay close (closeOnOverlayClick false, onClose no-op)
- **States:**
  - Own slots: 'You have four active cards. Pick one to remove so the new card can stay.'
  - Curse on an opponent: '{victim} has four active cards. Pick one of theirs to remove so your Curse can land.'
  - Captions '(shield)' / '(sentence)'
  - Expiry hint: 'On expiry: your / {name}'s oldest droppable active card is dropped · Ns left', plus 'Choice: Ns' in the turn strip
  - Table actions locked while it is open
  - Curse is never listed
- **Keep:**
  - Four active slots and the forced drop on a fifth (Lot 69); slotOwnerPlayerId (PROTOCOL 44)
  - Cancel restores the card (commit 468e0b8); only humans cancel; same 40 s timeout
  - A forced pick never removes a Curse on you
- **Notes:** Reads subChoice.{slotOwnerPlayerId, eligibleSlots [{kind, id, cardId, isUpgraded}], deadlineMs} and players nicknames. The other sub-choice panels (mirror, reward, steal, pool, special, reanimation) are out of this area.

### `table-banners` — Center banners (turn / attacked / dead / won / Sentence / wipe)

- **Files:** `apps/client/src/screens/table/your-turn-flash.tsx`, `apps/client/src/screens/table/table-banner.ts`, `apps/client/src/action-log/action-log.ts`
- **Purpose:** Short full-screen cues for big moments.
- **Controls:**
  - None (pointer-events-none, role=status)
- **States:**
  - 'Your turn' (seat color)
  - 'You are being attacked', once per new attack-tone Incoming (red, flashier)
  - 'You are dead'
  - 'You won!'
  - Sentence lines, table-wide in red (aria-live assertive): 'Sentence in 3 turns!' / 'X turn(s) before Sentence!' / 'Sentence will kill {victim}!'
  - Own Gambler wipe: 'You gambled too much and lost everything'
  - Each cue queues for about 1.6 s
  - First paint skips log history but still emits won / dead / turn
  - Reduced motion: fade only
- **Keep:**
  - L51-06 cues; Sentence banners are not gated on death / win and also reach spectators (L63-03)
  - The wipe banner shows only for the player who wiped (L67-01)
  - Presentation persistent ids never count as attacks
- **Notes:** Reads isMyTurn, players (won / eliminated), pendingEffects targeting you, actionLog (sentenceCountdown, sentenceFired, actionPlayed draw drawBust by you), nicknames, POV seat color. The Sentence and wipe banners came after Lot 61.

### `table-fx-layer` — Table FX choreography

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/fx/table-fx-overlay.tsx`, `apps/client/src/fx/play-flyout.ts`, `apps/client/src/fx/opponent-token-chips.ts`, `apps/client/src/fx/incoming-threat-diff.ts`, `apps/client/src/fx/resource-flow-flash.ts`, `apps/client/src/fx/motion-timing.ts`
- **Purpose:** Presentational motion: play-card ghosts, buy/sell flyouts, resource token chips between seats and the log, resource flashes, resolution flash, elimination beat, reward pulse, threat outline and targeting cue.
- **Controls:**
  - None
- **States:**
  - Reduced motion skips the choreography
  - Unknown seats fly one point chip (L65-01)
  - Point chips capped at 50 (MAX_POINT_FLYOUTS)
  - Falls back to the collapsed buttons as anchors
- **Keep:**
  - Intents never await FX (Lot 14)
  - Anchors: data-zone (opponent-seat, private-zone, resources, card-band, hand, specials, pending, felt, dock, kit-portrait, incoming-*, log-collapsed, opponents-collapsed), data-player-id, data-resource-kind, data-instance-id
  - Chips only for public or already-visible amounts
- **Notes:** Reads actionLog, players (known resources only via opponentResourceDisplay), self resources, pendingEffects, lastActionResolved, the reward subChoice.

### `tutorial-overlays` — Tutorial coach, callouts, board tour, Look gate

- **Files:** `apps/client/src/screens/table/tutorial-coach.tsx`, `apps/client/src/screens/table/tutorial-coach-copy.ts`, `apps/client/src/screens/table/tutorial-callout.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/design/components/coach-panel.tsx`, `packages/shared/src/tutorial/tour.ts`, `packages/shared/src/tutorial/script.ts`
- **Purpose:** Scripted teaching layer on the table (playKind 'tutorial').
- **Controls:**
  - Coach hide '×' (aria 'Hide coach')
  - Reopen '?' toggle (aria 'Show coach'); this is a second '?' next to How to play
  - 'Got it' on tour steps: advances the client tourStep
  - Forced opponent-portrait click (Look gate)
  - Spotlighted Draw / Shop / card / Use / Upgrade / Sell / shop items
- **States:**
  - Board tour active: table locked (cards not clickable, Shop / Unspy cannot open, sends blocked)
  - Look pending
  - Script step
  - Idle 20 s: coach title becomes 'Play'
  - Illegal attempt: follow-coach copy
  - The coach auto-reopens on new copy
  - Tour highlights: your-zone, hand, specials, resources, incoming, shop, opponent, action-log, timer, kit, flag
- **Keep:**
  - Copy comes from the shared script; the client never invents strings (L45-05)
  - Orange guide vs red threat callouts; arrows outside the highlight
  - Real pending chips keep the no-arrow ring in Classic too (L51-07)
  - Skip is flag-only
  - data-tutorial-highlight ids
- **Notes:** Reads view.playKind, view.tutorialIndex, plus own hand / specials ids for spotlights.

### `first-game-hint-host` — First-game hint overlay (hosted)

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/help/hint-overlay.tsx`, `apps/client/src/help/select-hint.ts`, `apps/client/src/help/hint-ids.ts`
- **Purpose:** One contextual hint at a time in a live Classic game.
- **Controls:**
  - 'Got it'
  - 'Skip all'
  - '×' (same as Got it)
- **States:**
  - Classic live table only
  - Hidden while any dialog, chrome dialog or sub-choice is open (except the reward hint)
  - Order: reward, incoming, incoming-thief, your-turn, draw, hand, specials, shop, resources, hidden-kit
  - Auto-dismissed by causes (draw, open shop, play, inspect, incoming cleared, confirm reward)
- **Keep:**
  - The redesign must keep the data-hint-anchor targets: your-turn, draw, shop, hand, specials, resources, incoming, hidden-kit, reward (on the reward Dialog)
- **Notes:** Owned by apps/client/src/help; listed here for the anchor contract. hasUnspiedLivingOpponent treats base-Spied seats as spied, so 'hidden-kit' stops after a base Spy even though the kit is still hidden.

### `walk-in-spectator-mode` — Walk-in spectator table mode

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/claim-seat.ts`, `apps/client/src/screens/claim-seat-dialog.tsx`, `apps/client/src/App.tsx`, `apps/server/src/protocol/build-view-for.ts`
- **Purpose:** Watching a live table without a seat.
- **Controls:**
  - Flag → Leave table
  - Chat (spectator stream)
  - Inspect opponents / log
  - App-level claim-seat picker overlay (claim a disconnected seat or Stay spectating)
- **States:**
  - Actions locked
  - Private zone replaced by text
  - 'Watching' prompt
  - Fog until Stay (L57-16)
  - After Stay, full overlay like an eliminated spectator
- **Keep:**
  - Zero legal actions; no Spy overlay while the claim picker is open
- **Notes:** view.self is a filler (EMPTY_SPECTATOR_SELF, kitId 'untouchable', 0 resources). The economy bar is still rendered with that kit's Draw value, and the Shop opens with filler data.

### `table-subchoice-host` — Sub-choice modal host (all kinds)

- **Files:** `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx`, `apps/client/src/screens/table/sub-choice/sub-choice-constants.ts`, `apps/client/src/screens/table/sub-choice/index.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/timers.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/client/src/net/is-sub-choice-required.ts`, `apps/client/src/design/components/dialog.tsx`, `apps/client/src/screens/illegal-action-copy.ts`, `packages/shared/src/protocol/messages.ts`, `packages/shared/src/protocol/reward-choice.ts`
- **Purpose:** One modal Dialog for every unicast server prompt (SUB_CHOICE_REQUIRED, kind-discriminated SubChoiceRequiredPayload). It renders the kind panel, an expiry hint and a countdown, and answers with RESOLVE_SUB_CHOICE (ResolveSubChoicePayload). Seven kinds: mirror, elimination-reward, steal-pick, pool-pick, special-pick, reanimation-kit, slot-drop.
- **Controls:**
  - No close control: onClose is a no-op, so Esc does nothing; closeOnOverlayClick=false
  - Focus trap with Tab/Shift+Tab; the first focusable control gets focus on open; the previous focus comes back on unmount (dialog.tsx)
  - Kind panel controls (see the per-kind surfaces); every Confirm or commit calls onResolve, which sends RESOLVE_SUB_CHOICE and clears the local subChoice (use-room-connection.ts resolveSubChoice ~L662)
  - Turn strip, chooser only: text 'Choice: Ns' plus an orange progressbar (aria-label 'Sub-choice timer'). Ratio = (deadlineMs - now) / CLIENT_SUB_CHOICE_MS (40s) (table.tsx ~L1103-1119, timers.tsx ~L152)
  - On reward confirm the table calls noteHintCause('confirm-reward') before resolving (table.tsx ~L1788)
- **States:**
  - Open only for the chooser (unicast). Other seats get no indicator that a prompt is open
  - Titles: Mirror redirect / Elimination reward / Steal a card / Recover from pool / Choose a special / Choose a kit / Drop an active card
  - Expiry hint line: '{hint} · Ns left', with seconds clamped at 0. Mirror: 'On expiry: a random eligible redirect'. Reward: 'On expiry:' + CostDisplay of 4 lives ×2. Steal: 'a random eligible card'. Pool: 'random eligible cards'. Special: 'a random special'. Kit: 'a random kit'. Slot-drop: 'your oldest droppable active card is dropped', or '{victim}'s oldest…' when the chooser is not the slot owner
  - Shared or late deadline (Lot 71): the progress bar can open below 100% because the deadline is server time
  - Timer expired: the client does not close the dialog on 0s. subChoice clears only on resolve, TURN_STARTED or GAME_OVER (use-room-connection.ts ~L290-335)
  - Rejected resolve: actionReject opens IllegalActionDialog (codes finish-*-choice, reward-card-already-chosen, reward-card-unavailable, pool-pick-wrong-count, slot-drop-invalid, …). For elimination-reward the server re-sends SUB_CHOICE_REQUIRED with refreshed availableCards (game-room.ts ~L2174)
  - Reconnect: the server re-sends the open prompt (resyncSubChoiceRequiredFor, game-room.ts ~L4520)
  - While open: actionsLocked=true (table.tsx L884); the incoming, log and opponents chrome dialogs are suppressed (otherModalOpen); first-game hints are hidden except the reward hint
  - The modal overlay covers the table, so the table cannot be inspected while choosing
- **Keep:**
  - Payload shapes do not change per kind: mirror {pendingEffectId,newTargetPlayerId}; elimination-reward {eliminationId, choices:[2]}; steal-pick {instanceId}; pool-pick {instanceIds}; special-pick {cardId}; reanimation-kit {kitId}; slot-drop {slotId} | {cancel:true} (messages.ts L250-345)
  - Not dismissible; the player must answer or let it expire (L30-03)
  - Lock every other intent while a sub-choice is open, and also while self is eliminated (frontend.md Sub-choices)
  - Clear on confirm / turnStarted / gameOver (frontend.md L30-03)
  - The deadline is server truth (SUB_CHOICE_MS 40s, server engine/turn/sub-choice.ts); the client timer is cosmetic
  - Reward Dialog panel carries data-hint-anchor='reward' (hintAnchor prop) for the first-game reward hint (L46)
  - An orange rewardPulse plays once per eliminationId on [data-zone='dock'] when a reward prompt opens (table.tsx L761-775)
  - While a mirror prompt is open, its eligible pending ids are highlighted in the dock Incoming stack, the felt Waiting strip and the Incoming dialog (mirrorHighlightIds, table.tsx L855)
  - Dialog width token max-w-3xl through dialogPanelClassName; fits 390×844 and 844×390 (L53-02/L53-07)
  - Option labels use natural names (formatCardLabel, kit names, CostDisplay), never raw ids (frontend.md Elimination reward Dialog)
  - Reward picks never appear in the action log (opaque rewardsClaimed, L9-02)
- **Notes:** Generic host is L20-18/L30-03; visual pickers L44. The slot-drop kind and its expiry hint are Lot 69 (PROTOCOL 43/44). Shared simultaneous reward deadline is Lot 71. Source-text tests (sub-choice/*.test.ts, help/hint-overlay.test.ts) assert literal code such as "hintAnchor: 'reward'" and must be rewritten if the structure changes.

### `table-subchoice-mirror` — Mirror redirect picker

- **Files:** `apps/client/src/screens/table/sub-choice/mirror-panel.tsx`, `apps/client/src/design/components/card-choice-tile.tsx`, `apps/client/src/design/components/seat-tile.tsx`, `apps/client/src/design/components/player-name.tsx`
- **Purpose:** The Mirror user picks which pending attack aimed at them to redirect and the new target.
- **Controls:**
  - 'Pending attack' grid: one CardChoiceTile per eligible pending effect (art, card label, damage badge × damageMultiplier, meta '{source PlayerName} → you'). aria-pressed; aria-label "{source}'s {card} → you"
  - 'New target' grid: one SeatTile per living opponent (seat wash, PlayerName, KitPortrait or '?' when hidden), with a selected frame
  - Green 'Confirm redirect' button, disabled unless both an effect and a target resolve
- **States:**
  - Defaults: first eligible effect and first living opponent are preselected, so Confirm is enabled at once
  - A stale local choice falls back to the first eligible option
  - Eligible effects come from view.pendingEffects filtered by eligibleEffectIds. The list can be empty while Confirm still sends eligibleEffectIds[0]
  - Target list = every non-eliminated opponent, invisible seats included (the server accepts them; the effect resolves as immune)
- **Keep:**
  - Payload {kind:'mirror', pendingEffectId, newTargetPlayerId} (L44-03)
  - Tiles pass damageMultiplier so doubled listed damage shows immediately (L56-04)
  - Copy 'Choose which pending attack to redirect and its new target.' and '→ you' (asserted by mirror-panel.test.ts)
  - No <select>; tiles only (mirror-panel.test.ts)
  - Hidden kits stay '?' on SeatTile (visibleKitId; Spy+ or death reveal only, Lot 69)
- **Notes:** Expiry default is a random eligible redirect (server mirror-choice.ts).

### `table-subchoice-reward` — Elimination / forfeit reward picker

- **Files:** `apps/client/src/screens/table/sub-choice/reward-panel.tsx`, `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/design/components/choice-tile-chrome.ts`, `apps/client/src/design/components/cost-display.tsx`, `packages/shared/src/protocol/reward-choice.ts`, `apps/server/src/engine/turn/elimination-rewards.ts`
- **Purpose:** A rewardee picks two rewards from the eliminated or forfeiting player: 4 lives, 8 points, 1 upgrade point, or one of their cards.
- **Controls:**
  - Two fieldsets, 'Choice 1' and 'Choice 2', each a radiogroup of 4 tiles (role=radio, aria-checked): lives (CostDisplay 4), points (CostDisplay 8), upgradePoint (CostDisplay 1), and 'A card' as text. aria-labels '4 lives' / '8 points' / '1 upgrade point' / 'A card'
  - When a choice is 'card': a CardChoiceTile grid of availableCards (face art, formatCardLabel caption)
  - Green 'Confirm rewards' button
- **States:**
  - Defaults: Choice 1 = lives, Choice 2 = points, so Confirm is enabled immediately
  - Choosing 'card' preselects the first available card
  - Both choices can be 'card' and both default to the same first card. The server rejects that with reward-card-already-chosen and re-sends the prompt
  - Simultaneous pickers (Lot 71): a card another rewardee already took makes the server reject (reward-card-unavailable) and re-send refreshed availableCards; the list never updates live
  - Expiry or dropped human: the server defaults to 2× 4 lives
  - Copy: 'Pick two rewards from {eliminated nickname}.'
- **Keep:**
  - Payload {kind:'elimination-reward', eliminationId, choices:[c1,c2]} with RewardChoice types lives|points|upgradePoint|card{instanceId}
  - Reward amounts 4/8/1 come from REWARD_KIND_COSTS (rules spec §6). Do not change values
  - Both picks may be the same resource kind (Lot 71 decision: 'both picks may match')
  - Used for kill rewards, for every lethal contributor (Lot 69) and for forfeit / leave-table rewards to queued attackers (Lot 71). Several rewardees may choose at the same time on one shared countdown
  - The reward hint card sits over this dialog until Got it (L46)
  - Picks stay opaque in the log
- **Notes:** L44-06 visual. Lot 69/71 changed who gets it and when, not the panel. A 2-player game-ending elimination skips rewards (frontend.md Lot 46 gate).

### `table-subchoice-steal-pick` — Card Thief steal picker

- **Files:** `apps/client/src/screens/table/sub-choice/steal-pick-panel.tsx`, `apps/client/src/design/components/card-choice-tile.tsx`, `apps/server/src/engine/turn/steal-choice.ts`
- **Purpose:** When Card Thief targets a victim the thief spies on, the thief chooses which card to steal instead of a random one.
- **Controls:**
  - Grid of CardChoiceTile, one per eligibleInstanceId. The face shows when the victim's spied.hand/specialCards contain it, otherwise the attack verso captioned 'Hidden card'
  - Green 'Confirm steal' button
- **States:**
  - Default: the first eligible id is preselected
  - Base Spy (Lot 69: resources only) leaves spied.hand undefined, so every tile is a 'Hidden card' verso (blind pick)
  - Spy+ (full reveal) shows faces
  - Copy: 'Choose a card to steal from {victim}.'
- **Keep:**
  - Payload {kind:'steal-pick', instanceId} (L44-05)
  - Hidden identity uses the attack verso and the fixed caption 'Hidden card'; the instance id never shows on a tile (designer 2026-08-24)
  - Expiry: a random eligible card
- **Notes:** Server eligibility is any Spy relation (findSpyRelation), while the client only knows identities under Spy+ since Lot 69.

### `table-subchoice-pool-pick` — Card Absorber+ pool recovery picker

- **Files:** `apps/client/src/screens/table/sub-choice/pool-pick-panel.tsx`, `apps/client/src/design/components/card-choice-tile.tsx`
- **Purpose:** Upgraded Card Absorber lets the user choose exactly maxCount cards from the shared pool.
- **Controls:**
  - Toggle tiles (CardChoiceTile) for every view.pool card in eligibleInstanceIds; a click selects or deselects
  - Unselected tiles are disabled at the cap
  - Green 'Confirm recovery' button, enabled only when the selection equals maxCount
- **States:**
  - Counter copy: 'Select exactly N card(s) from the shared pool (k/N selected).'
  - Empty: 'No eligible cards in the pool.' (Confirm then cannot enable)
  - Nothing is preselected; Confirm is disabled until the count is met
- **Keep:**
  - Payload {kind:'pool-pick', instanceIds} (L44-05)
  - Extras are disabled at maxCount (frontend.md L44-05)
  - Pool faces are public (rules spec §1)
  - Expiry: random eligible cards

### `table-subchoice-special-pick` — Card Transformer+ special picker

- **Files:** `apps/client/src/screens/table/sub-choice/special-pick-panel.tsx`
- **Purpose:** Upgraded Card Transformer lets the user choose which special card they receive.
- **Controls:**
  - Tile grid of eligibleCardIds: synthetic instance 'pick-{cardId}' with base art, caption from getCard(cardId).name
  - Green 'Confirm special' button
- **States:**
  - Default: the first eligible special is preselected
  - Copy: 'Choose which special card to receive.'
- **Keep:**
  - Payload {kind:'special-pick', cardId} (L44-05)
  - Card Transformer never appears among the choices (server list; rules spec Card Transformer)
  - Expiry: a random special
- **Notes:** Captions use the catalog name, not formatCardLabel, so there is no upgrade tag.

### `table-subchoice-reanimation-kit` — Reanimation+ kit picker

- **Files:** `apps/client/src/screens/table/sub-choice/reanimation-kit-panel.tsx`, `apps/client/src/design/components/kit-portrait.tsx`
- **Purpose:** A player with upgraded Reanimation, on elimination, chooses the kit to come back with.
- **Controls:**
  - Kit tiles: a button with aria-pressed, aria-label kit.name, KitPortrait and the kit name in choiceTileClassName chrome
  - Green 'Confirm kit' button
- **States:**
  - Default: the first eligible kit is preselected
  - Copy: 'Choose which kit to revive with.'
  - The chooser is the dying seat, so the prompt can arrive while self is eliminated or being eliminated
- **Keep:**
  - Payload {kind:'reanimation-kit', kitId} (L26-02/L44-06)
  - Reuses the KitPortrait + choiceTile chrome; no third picker primitive (frontend.md L44-06)
  - The action log line stays 'X returns' and never names the kit (L50-03)
- **Notes:** When the deadline has already passed on the server, the server re-arms a full 40s (game-room.ts ~L2840).

### `table-subchoice-slot-drop` — Fifth active slot drop picker (+ Cancel) · `Lot 62+`

- **Files:** `apps/client/src/screens/table/sub-choice/slot-drop-panel.tsx`, `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx`, `apps/server/src/engine/specials/slot-drop.ts`, `packages/shared/src/protocol/messages.ts`, `docs/spec_bataille_des_cartes_en.md`
- **Purpose:** At four active slots, a new activation needs one existing slot dropped. The activating player picks one of their own, or, when Curse lands on a victim who already has four, the Curse user picks one of the victim's slots. A human may cancel.
- **Controls:**
  - One CardChoiceTile per eligibleSlots entry. Caption: card label, plus ' (shield)' or ' (sentence)'. aria-label 'Drop {caption}'. A click commits immediately (sends {kind:'slot-drop', slotId}); there is no Confirm and no selected state
  - Red compact 'Cancel' button sends {kind:'slot-drop', cancel:true}
- **States:**
  - Self variant: 'You have four active cards. Pick one to remove so the new card can stay.'
  - Curse variant (slotOwnerPlayerId ≠ you): '{victim} has four active cards. Pick one of theirs to remove so your Curse can land.'
  - Expiry: the oldest droppable active card is dropped (host hint names you or the victim)
  - Cancel: the new card is not activated and returns to hand or specials (lot-72 What's new 2026-10-07)
  - Reject codes: finish-slot-drop, no-slot-drop-pending, slot-drop-invalid
- **Keep:**
  - Payload {slotId} | {cancel:true} (ChooseSlotDropPayload)
  - A forced drop never lists Curse on you; Shield and ticking Sentence can be dropped (rules spec Active slots, Lot 69)
  - Only humans may cancel; bots and timeout never cancel (slot-drop.ts cancelSlotDrop)
  - slotOwnerPlayerId decides the copy and the expiry hint (PROTOCOL 44)
- **Notes:** Lot 69 (2026-10-05), card art fix 4022eb8, Curse chooser e5c1c59, Cancel 468e0b8 (2026-10-07, What's new id lot-72, which has no backlog lot). Unlike the other pickers, a tile click is a commit.

### `table-fx-queue-overlay` — Table FX queue + overlay layer

- **Files:** `apps/client/src/fx/table-fx-context.tsx`, `apps/client/src/fx/table-fx-hooks.ts`, `apps/client/src/fx/table-fx-types.ts`, `apps/client/src/fx/table-fx-overlay.tsx`, `apps/client/src/fx/motion-timing.ts`, `apps/client/src/screens/table.tsx`
- **Purpose:** A fire-and-forget presentational queue (TableFxProvider wraps TableScreen) and a fixed overlay that draws the event kinds playFlyout, tokenFlyout (chip or asCard ghost), resolutionFlash, eliminationBeat, rewardPulse, threatOutline and targetingCue.
- **Controls:**
  - No interactive controls. Overlay is pointer-events-none, aria-hidden, fixed inset-0 z-[110], data-zone='table-fx'
- **States:**
  - Each event expires at expiresAt (default FX_TTL_MS 1100ms; threat 3800ms; tokens delay + travel + 80–120ms). Expired events are pruned on the next enqueue and by a timeout
  - playFlyout is drawn last, on top of the others
  - Reduced motion: per-kind fallbacks (see global-motion-reduced-motion)
  - A missing anchor makes the event render nothing; there is no error state
- **Keep:**
  - Intents never await FX; enqueue returns void (Lot 14)
  - FX never invents game information; payloads are ids and art the client already has (table-fx-types.ts header)
  - Card chrome on tokenFlyout only when asCard===true, never inferred from width (L51-14)
  - The overlay z-index sits above dialogs (z-100) and the hint overlay (z-105)
- **Notes:** TableFxContext.mirrorHighlightIds/setMirrorHighlightIds are dead (the table derives mirror highlight from subChoice).

### `table-fx-token-chips` — Resource token chips (log ↔ seat / seat ↔ seat)

- **Files:** `apps/client/src/fx/opponent-token-chips.ts`, `apps/client/src/fx/play-flyout.ts`, `apps/client/src/fx/token-flyout-skip.ts`, `apps/client/src/fx/motion-timing.ts`, `apps/client/src/design/components/resource-icon.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/opponent-seat-resources.ts`
- **Purpose:** Resource icon chips fly between the action log and the seat or dock to show spends, gains, steals and damage.
- **Controls:**
  - None (presentational)
- **States:**
  - Source 1, POV dock: ResourceIcon diff of live numbers flies log→resource on a gain and resource→log on a loss (resource-icon.tsx)
  - Source 2, public log: chipsForPublicLogEntry per new entry. Draw = drawGain or kit draw for visible kits, exactly 1 point chip for hidden kits (L65-01), none on drawBust. playCard catalog cost. Multi-attack per card cost. buyCard buyCost. sellCard sellYield. upgrade 1 UP. buyUpgradePoint: points out (kit cost when visible, else Classic 10) and 1 UP in. sellUpgradePoint: reverse. buySpecialCard 20. clearSpy CLEAR_SPY_COST. buyPoolCard, deactivatePersistent and activateDuplication fly nothing. actionResolved livesLost and shieldAbsorbed fly from the target
  - Source 3: steal transfer seat→seat for thief / spy-thief / upgrade-point-thief from the live Δ. When both seats show '?', exactly 1 directional chip flies, never a total. boostStealChipsWithRecentYield covers a same-tick sell+steal
  - Source 4: Regeneration uses the live Δ, else the catalog per-life unit (quantity never invented)
  - Source 5: leftoverLiveFlowChips flies the leg the catalog did not explain (spend 3 + absorb 10 flies 3 out and 10 in)
  - Spy reveal with no previous snapshot is not a transaction; nothing flies
  - First paint seeds the seen log keys, so history does not replay
  - Missing anchors retry up to 3 animation frames, then the chip is dropped
  - Reduced motion: no chips are enqueued (the table effect returns early) and the overlay skips tokenFlyout
- **Keep:**
  - Chips are 40×40 at both ends and icon-only (object-contain + drop shadow, no tile chrome) (L51-14/L51-16)
  - Stagger TOKEN_STAGGER_MS 35ms, travel TOKEN_FLYOUT_DURATION_S 0.6s, opacity held to about 88% of travel (L51-16)
  - Point chips cap at MAX_POINT_FLYOUTS 50; the numeric float and total stay real (decision 2026-09-28)
  - Every transaction flies both legs when both exist (L51-15)
  - A hidden Draw flies 1 chip so the chip count cannot identify a kit (L65-01). Never invent Draw, absorb or regen totals
  - After the overlay lands a chip, skipResourceIconFlyout stops ResourceIcon from double-flying the same Δ (token-flyout-skip.ts)
  - Endpoints fall back to collapsed buttons (log-collapsed, opponents-collapsed, incoming-collapsed) when panels are collapsed (L53-07)
  - DOM anchors: [data-zone='action-log-panel'] or [data-zone='log-collapsed']; [data-zone='opponent-seat'][data-player-id] [data-resource-kind] and [data-zone='opponent-portrait']; [data-zone='private-zone'][data-player-id] [data-resource-kind] and [data-zone='kit-portrait']; [data-zone='resources'] [data-resource-kind]; [data-zone='opponents-collapsed']
- **Notes:** Built in L51-09…L51-16. Post-Lot-61 deltas: hidden Draw one chip (L65-01, 2026-09-28) and the 50 point cap (2026-09-28, PROTOCOL 41 pass).

### `table-fx-card-ghosts` — Card flyouts and ghosts (play / buy / sell)

- **Files:** `apps/client/src/fx/play-flyout.ts`, `apps/client/src/fx/opponent-token-chips.ts`, `apps/client/src/screens/table.tsx`
- **Purpose:** Card-sized art travels between hand or seat and the felt center to show plays, buys and sells.
- **Controls:**
  - None. The own-seat ghosts fire on the intent click itself (playCardWithFx, buyCardWithFx, buySpecialWithFx, sellCardWithFx in table.tsx ~L499-640)
- **States:**
  - Own play: hand instance [data-instance-id] → felt center, face art, verso fallback; one per attack on multi-attack; skipped under reduced motion
  - Own buy card: playFlyout felt center → hand with face art
  - Own buy special: special verso → specials
  - Own sell: instance → felt center
  - Opponent play: ghosts from the public log, seat or portrait → felt center, face of the public cardId
  - Opponent buy/sell: seat ↔ center. Action verso unless the kit is visible (Spy+ or elimination), special verso for special buys
  - buyPoolCard: no ghost
  - Tutorial: ghosts fire only if allowTutorialSend passes
  - Ghost size 48×72 (DECK_CARD_FLYOUT_*). Felt center = midpoint of [data-zone='pending'] and [data-zone='card-band'] / hand / dock, else [data-zone='felt']
- **Keep:**
  - Played cards go to the felt center, not to the log (L51-13/L51-16)
  - An unspied buy or sell shows a verso, never a guessed face (L51-13)
  - FX never delays the intent
- **Notes:** FlyoutImage (playFlyout) returns null under reduced motion.

### `table-fx-threat` — Incoming threat outline + targeting cue

- **Files:** `apps/client/src/fx/incoming-threat-diff.ts`, `apps/client/src/fx/threat-tone.ts`, `apps/client/src/fx/table-fx-overlay.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/pending-chip-tone.ts`
- **Purpose:** When a new real pending effect starts targeting the POV, a full-viewport outline pulses and the source seat pulses.
- **Controls:**
  - None
- **States:**
  - Diff newIncomingThreats(seen, pendingEffects, you): ids targeting you that are not 'persistent:' presentation ids and were not seen before. The first render seeds without flashing (table.tsx ~L776)
  - Tone threatToneFor: attack cards + sentence/mirror/super-mirror = red 'attack'; everything else (Spy, Thief, Tax…) = orange 'effect'
  - threatOutline: inset border pulse for 3.2s (THREAT_OUTLINE_DURATION_S), TTL 3.8s
  - targetingCue: ring + fill pulse on the source seat (or the Opponents collapsed button) and also on [data-zone='incoming-collapsed'] when present
  - Reduced motion: the outline fades from 0.7 opacity in 0.35s; the cue fades in 0.35s
- **Keep:**
  - Fires on queue, not on resolve (L39-05)
  - Presentation persistents (Imposition / Points Generator chips) never trigger it
  - The same tone function colors pending-chip callout rings (pendingChipCalloutTone, L51-07)
  - incomingAttackTargetingYouIds and incomingThiefTargetingYouIds (thief or *-thief) feed the first-game hints; Spy is not a Thief
- **Notes:** The 'You are being attacked' banner (your-turn-flash.tsx / table-banner.ts) is a separate table surface.

### `table-fx-resolution-elim-reward` — Resolution flash, elimination beat, reward pulse

- **Files:** `apps/client/src/fx/table-fx-overlay.tsx`, `apps/client/src/fx/play-flyout.ts`, `apps/client/src/screens/table.tsx`
- **Purpose:** Short labels and rings for resolve outcomes, eliminations and an open reward prompt.
- **Controls:**
  - None
- **States:**
  - resolutionFlash on each new ACTION_RESOLVED (dedupe key effectId:outcome). Labels: Applied (green), Cancelled and Blocked (muted), Immune (red, starts larger). Anchor: [data-pending-id] chip if visible, else [data-zone='pending'], else the Incoming anchor; otherwise nothing renders
  - eliminationBeat: red ring on the seat (queryPlayerFxAnchor) for each new playerEliminated log entry
  - rewardPulse: orange border pulse over [data-zone='dock']
  - Reduced motion: no scale or offset entrance, durations 0
- **Keep:**
  - An 'immune' outcome shows 'Immune' (frontend.md actionResolved immune)
  - Animations come from existing public events only
- **Notes:** seenElimKeys starts empty and is not seeded, so mounting a table with past eliminations (reconnect, finished board) replays a beat for every earlier elimination.

### `table-fx-resource-flash` — Resource value flash / floats

- **Files:** `apps/client/src/design/components/resource-icon.tsx`, `apps/client/src/fx/resource-flow-flash.ts`, `apps/client/src/fx/token-flyout-skip.ts`, `apps/client/src/fx/motion-timing.ts`
- **Purpose:** Gain and loss feedback on resource numbers: color change, a scale pulse and floating +N / −N labels, including on seats whose number shows '?'.
- **Controls:**
  - None
- **States:**
  - Gain: green value, +N float rising; loss: red value, −N float falling. Both floats show on a two-way tick (data-resource-flash gain|loss|both)
  - Pulse MOTION_PULSE_S 0.45s; floats clear after RESOURCE_FLASH_MS 900ms
  - Unknown '?' value: no Δ is computed, but emitResourceFlowFlash pub/sub still flashes the seat icon (queued until subscribed)
  - Reduced motion: the value color still flips; no pulse and no floats
- **Keep:**
  - A public chip amount flashes on the seat icon even when the printed value is '?' (L51-16)
  - The flash never prints an unknown total
  - One-shot skip prevents a double flyout after overlay choreography
- **Notes:** ResourceIcon prop flyToken=false is used on opponent seats; playerId scopes chips.

### `table-first-game-hints` — First-game hint cards (Classic only)

- **Files:** `apps/client/src/help/hint-overlay.tsx`, `apps/client/src/help/select-hint.ts`, `apps/client/src/help/hint-ids.ts`, `apps/client/src/help/hint-copy.ts`, `apps/client/src/help/place-hint-card.ts`, `apps/client/src/help/help-storage.ts`, `apps/client/src/design/components/coach-panel.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/timers.tsx`, `apps/client/src/screens/table/economy-bar.tsx`, `apps/client/src/screens/table/card-band.tsx`, `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/screens/table/opponent-zone.tsx`, `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx`, `docs/technical_spec_v6.md`
- **Purpose:** One small hovering coach card at a time teaches the live Classic table to a first-time player. It is not a Dialog and the table stays usable.
- **Controls:**
  - Green 'Got it' (data-hint-ack='got-it') dismisses this id permanently
  - Orange 'Skip all' (data-hint-ack='skip-all') sets skipAll
  - × IconButton (aria-label 'Hide coach') acts like Got it
  - Implicit auto-Got-it through noteHintCause: any playing intent (play, multi-attack, buy, sell, upgrade, buy/sell UP, pool buy, Unspy) dismisses your-turn, plus incoming / incoming-thief if those are present. Draw dismisses your-turn, draw and the threats. Opening the Shop dismisses shop. Opening an opponent portrait (Spy+ or death reveal, felt or Opponents dialog) dismisses hidden-kit. Opening a hand card dismisses hand; a special dismisses specials. An attack Incoming leaving the view dismisses incoming; a Thief one leaving dismisses incoming-thief. Confirming a reward dismisses reward. Resources is dismissed only by Got it or ×
- **States:**
  - Ids, in priority order (selectHint): reward (while POV chooses an elimination reward) → incoming (attack Incoming on POV; ignores Spy, Thief and persistent: chips) → incoming-thief (thief or *-thief) → on your turn: your-turn → draw → hand → specials → shop → resources → hidden-kit (an unspied living opponent exists); off turn: hidden-kit, else none
  - Shown only when playKind==='classic' && !readOnly && !selfEliminated && !walk-in spectator && !skipAll. Never in the tutorial; noteHintCause is a no-op there
  - Hidden (returns null) while any table Dialog or chrome dialog is open (dialog, How to play, leave confirm, kit or opponent inspect, IllegalAction, Incoming/Log/Opponents chrome, sub-choice), except the reward hint, which stays over the reward Dialog
  - Placement: card width min(15.5rem, 100vw−1rem); prefer 'below' the anchor, 'beside' for hand and specials (left when it fits, top-aligned), gap 8px, clamped to the visual viewport. Repositions on anchor ResizeObserver and window or visualViewport resize
  - No anchor in the DOM: fallback at left 0.5rem, bottom 7.5rem
  - Persisted across games until each id is dismissed (localStorage), not only the first game
  - Chrome: CoachPanel compact (46% surface + 10px blur, max-h min(32vh,12rem), z-[105]); body bold markers and resource words become inline icons through parseCoachBody
- **Keep:**
  - Copy is normative and locked (HINT_COPY / spec v6 §5.2), typos included ('you kit', 'stronger that', 'ressources', 'atteign', 'uo to', 'opponent !'); hint-copy.test.ts asserts several strings
  - Titles reuse chrome words: Your turn, Draw, Hand, Specials, Resources, Incoming (both incoming ids), Hidden kit, Shop, Elimination reward
  - Not a legal-action recommender; it reads view facts only (spec §5.2)
  - 'leave' is not a hint id (designer 2026-08-26)
  - Finishing or skipping the tutorial never sets skipAll (L46-03; tutorial-hints-independence.test.ts)
  - The hint card has no rings or arrows; it sits next to data-hint-anchor (L46-02)
  - applyHintPatch merges onto the previous state so a later write cannot drop an earlier dismissal
  - DOM anchors (data-hint-anchor): 'your-turn' on section[data-zone='timers']; 'draw' on the economy Draw button; 'shop' on the economy Shop button; 'hand' / 'specials' on the card-band [data-card-row] cluster (w-max) or its 'Empty' / 'None' placeholder; 'resources' on [data-zone='resources']; 'incoming' on the Incoming collapsed button or [data-zone='incoming-pending'] (incoming-thief reuses it, hintAnchorId); 'hidden-kit' on every living opponent seat article without a Spy+ or death reveal (first match wins); 'reward' on the sub-choice Dialog panel. Hint root: data-zone='first-game-hint', data-hint-id={id}
- **Notes:** Lot 46 (L46-01..03) with the 2026-08-28 extensions, the 08-29 placement fix and the copy rewrite. The selector's hasUnspiedLivingOpponent uses spied===undefined (base Spy counts as spied), while the hidden-kit anchor uses 'no Spy+ reveal'. Source-text tests (hint-overlay.test.ts, tutorial-hints-independence.test.ts) assert literal table.tsx code such as "subChoice?.kind === 'elimination-reward'" and the exact onSkipAll arrow body.

### `table-tutorial-coach` — Tutorial coach chat

- **Files:** `apps/client/src/screens/table/tutorial-coach.tsx`, `apps/client/src/screens/table/tutorial-coach-copy.ts`, `apps/client/src/design/components/coach-panel.tsx`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/screens/illegal-action-copy.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/index.css`, `packages/shared/src/tutorial/script.ts`, `packages/shared/src/tutorial/tour.ts`
- **Purpose:** A hovering, dismissible coach that shows the current scripted lesson, tour step, Look gate, idle nudge or follow-the-coach correction during the tutorial match.
- **Controls:**
  - × IconButton (aria-label 'Hide coach') hides this message (dismissed key = current message key)
  - When hidden: a compact '?' IconButton (aria-label 'Show coach', data-zone='tutorial-coach-toggle', data-tutorial-coach-open='false') reopens it
  - Tour steps only: a green full-width 'Got it' (data-tutorial-ack='got-it') advances tourStep
- **States:**
  - Copy source: tour step (TUTORIAL_TOUR_STEPS) → Look (TUTORIAL_LOOK_COACH) → script coach at tutorialIndex, walking backward to the last non-null coach so bot turns keep the previous lesson
  - Illegal attempt: title 'Tutorial step', body 'This tutorial step asks for a different action.' (tutorial-follow-coach). The intent is not sent
  - Idle: 20s (TUTORIAL_IDLE_MS) without acting on your turn retitles it 'Play'; not during the tour or Look
  - Reopens automatically when the message key changes (mode|index|title|body)
  - Hidden on readOnly (Tutorial complete board) and outside the tutorial
  - Root data-zone='tutorial-coach', data-tutorial-index={index}, data-tutorial-coach-open='true'
  - Position: fixed left-2, top-[4.75rem] (sm 5.25rem), width min(22rem, 100vw−1rem), z-[110], above Shop and card dialogs; 78% surface + 6px blur; max-h min(52vh,28rem); 0.22s enter animation
- **Keep:**
  - The coach is not a Dialog; the table stays clickable around it (spec v6 §5.4)
  - All copy lives in packages/shared/src/tutorial; the client never invents strings and none of it goes on the wire
  - Resource words render as table icons (parseCoachBody → CostDisplay or resource glyph)
  - Skip lives on the table flag only; the coach has no Skip (tutorial-callout.test.ts asserts no onSkip / SKIP_TUTORIAL in the coach)
  - It reopens on every new title or body
- **Notes:** L45-05 and the L45 follow-up. TUTORIAL_LAST_INDEX = 30.

### `table-tutorial-board-tour` — Tutorial board tour (client-only, 11 steps)

- **Files:** `packages/shared/src/tutorial/tour.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/screens/table/card-band.tsx`, `apps/client/src/screens/table/economy-bar.tsx`, `apps/client/src/screens/table/tutorial-callout.tsx`
- **Purpose:** Before the first Draw (tutorialIndex 0), the coach walks through each table region with a highlight and 'Got it'.
- **Controls:**
  - Coach 'Got it' advances tourStep (no protocol message)
  - Every game send (Draw, cards, Shop, Unspy, duplication) is silently blocked during the tour: allowTutorialSend returns false and onSelectOwnCard is removed. The follow-coach copy does not swap in
- **States:**
  - Steps and highlight ids: your-zone ('Your zone', TutorialZoneCallout around PrivateZone, pt-10), hand and specials (CardBand section spotlight), resources (resources row), incoming (Incoming collapsed button or stack), shop (economy Shop button), opponent (each felt opponent seat), action-log (felt log panel), timer (Timers, 'Turn strip'), kit (own KitPortrait, 'Your kit'), flag ('Leave' step, table flag)
  - Active only while tutorialIndex===0 and tourStep < 11. A reconnect at index > 0 skips it; tourStep resets on remount
  - Spacing helpers while highlighted: pb-10 on the turn row (timer, flag), opponents row (opponent) and log (action-log)
  - With an empty Incoming (always true at index 0), no Incoming element renders, so the 'incoming' step highlights nothing (private-zone.tsx ~L114-240)
  - When opponents or log are collapsed into buttons, those steps highlight nothing because only the expanded panels are wrapped
- **Keep:**
  - The tour does not bump tutorialIndex (spec v6 §5.4)
  - Copy verbatim from TUTORIAL_TOUR_STEPS
  - Highlight chrome: pulsing orange outline + arrow outside the highlight (TutorialCallout)
  - Order fixed: your zone, hand, specials, resources, Incoming, Shop, opponent, action log, timer, kit, flag
- **Notes:** Lot 45 follow-up (2026-08-26). The tour 'opponent' copy says kits stay hidden until Spy reveals them (see openQuestions on Lot 69).

### `table-tutorial-look-gate` — Tutorial Look gate (forced portrait click)

- **Files:** `packages/shared/src/tutorial/tour.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/opponent-zone.tsx`
- **Purpose:** After the human's Spy resolves (end of index 8), the player must click the opponent portrait to open the Spy reveal before the index 9 Sell.
- **Controls:**
  - Click the opponent KitPortrait ([data-zone='opponent-portrait'], highlight 'opponent-portrait', arrow bottom) on the felt or inside the Opponents dialog. This sets portraitInspected=true and opens OpponentRevealDialog
- **States:**
  - Pending while tutorialIndex===TUTORIAL_LOOK_INDEX (9) && !portraitInspected && !readOnly. Coach 'Look' with no Got it; every other send is blocked silently
  - After one inspect it never blocks again in this mount. It is not shown on later indices or on the finished board
  - A remount at index 9 asks again (state is local)
  - The portrait highlight is passed only to felt seats, not the Opponents dialog copy
- **Keep:**
  - Look is a client overlay, not an engine step (spec v6 §5.4)
  - Copy 'Spy has resolved. You can now click the opponent to see their kit and cards. Click their portrait.'
  - Requires a Spy+ reveal (the tutorial upgrades Spy at index 5) so the portrait is clickable

### `table-tutorial-script-spotlight` — Tutorial scripted step spotlight + send gating

- **Files:** `packages/shared/src/tutorial/script.ts`, `apps/client/src/screens/table/tutorial-coach-copy.ts`, `apps/client/src/screens/table/tutorial-callout.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/card-band.tsx`, `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/economy-bar.tsx`, `apps/client/src/screens/table/shop-dialog.tsx`, `apps/client/src/screens/table/pending-queue.tsx`, `apps/client/src/screens/table/pending-chip-tone.ts`, `apps/client/src/index.css`
- **Purpose:** For each tutorialIndex, highlights the one legal control and blocks any other intent locally (the server also rejects with tutorial-follow-coach).
- **Controls:**
  - Highlighted controls by index: 0 Draw (data-tutorial-highlight='draw'). 1 and 21 Tax tile ('tax') + Use. 3, 25 and 29 Basic tiles ('basic-attack') + Use; 25 and 29 must be the upgraded Basic. 5 Spy tile + Upgrade. 7 and 11 Spy + Use. 9 first Shield tile + Sell. 13 Shop button until open ('shop'), then shop 'Buy' upgrade point ('shop-upgrade-point'). 15 Shop button, then Absorber tile ('shop-absorber'), then 'Buy selected' ('shop-absorber-buy') once Absorber is selected. 17 Shield + Use. 19 Super Regeneration special + Use. 23 non-upgraded Basic + Upgrade. 27 Absorber + Use
  - Card action dialog buttons get highlight ids 'use', 'upgrade' and 'sell' (card-actions.tsx)
  - The Shop is never auto-opened; the player must click Shop
  - An illegal intent (wrong card, Basic+ at index 3, buying Basic, a bot-turn send, Unspy, pool buy, duplication 'other') does not send and shows the follow-coach copy
- **States:**
  - TutorialCallout guide tone is orange with an arrow (top or bottom) outside the box. layout inline|stretch; data-tutorial-highlight={id} only while active
  - Real pending chips (Incoming and Waiting, every mode) wear callout chrome with no arrow: red when threatToneFor is attack, orange otherwise (L51-07). Coach copy calls the incoming Basic 'the red highlight'
  - [data-zone='card-band']:has([data-tutorial-highlight]) switches to overflow visible so arrows are not cropped
  - Reduced motion: static white+color double ring, no ping, no arrow bob
  - No turn timer in tutorial rooms (deadline null → '—'); bot difficulty label hidden on the opponent seat
- **Keep:**
  - Legal map per index (TUTORIAL_STEPS.legalKind) and matchesLegalKind (spec v6 §5.4)
  - Illegal client clicks do not send; the server still rejects with 'tutorial-follow-coach'
  - Seat setup (setup.ts): human Indestructible 2 lives / 38 points / 1 UP, hand Tax(base), Spy, Basic, Shield, Shield, special Super Regeneration; bot Ghost 4 / 16 / 0 with Basic, Strong, Thief, Spy
  - Copy verbatim from TUTORIAL_STEPS (full English sentences)
- **Notes:** TutorialHighlight 'opponent-portrait' exists in the type but no step uses it (Look uses lookPending). Dead helpers: tutorialIncomingThreatIds, isTutorialIncomingThreatCard (Spy/Thief red, superseded by L51-07) and tutorialShopSpotlight; ShopDialog reads tutorialHighlight directly.

### `table-tutorial-flow` — Tutorial entry, skip and completion

- **Files:** `apps/client/src/screens/home.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/client/src/screens/table/table-flag-intent.ts`, `apps/client/src/screens/table/table-leave-confirm.tsx`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/screens/game-over-copy.ts`, `packages/shared/src/tutorial/setup.ts`
- **Purpose:** The path into and out of the scripted tutorial match that hosts the coach, tour, Look and spotlight.
- **Controls:**
  - Home Tutorial path: nickname field + 'Start tutorial' (create with tutorial:true, then START_GAME; no kit picker, no bots, no lobby flash). This is the home surface
  - Table flag (aria 'Skip tutorial') opens 'Skip the tutorial?' / 'You will return to the hub. This is not a forfeit.' with Stay or Skip tutorial (leaveGame → hub, no Game over)
  - Finished: Game over title 'Tutorial complete', CTA 'Play a real game' → hub (through the feedback ask-once); no Play again
- **States:**
  - playKind==='tutorial' on the views; tutorialIndex public; no turn timer; lobby rules unused (setLobbyRules rejected, Lot 70)
- **Keep:**
  - Skip is not a forfeit and hides Forfeit (spec v6 §5.4)
  - Completing or skipping does not touch hint storage (L46-03)
  - Replay is always available; no lockout
- **Notes:** Home and End UI belong to other surfaces; listed so tutorial dependencies stay visible.

### `table-action-log-panel` — Action log panel (felt)

- **Files:** `apps/client/src/action-log/action-log-panel.tsx`, `apps/client/src/action-log/action-log.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/table-shell.tsx`, `apps/client/src/design/components/player-name.tsx`, `apps/client/src/design/components/life-count-badge.tsx`
- **Purpose:** The table's main record: a scrollable public history grouped by table round, one natural-language line per entry.
- **Controls:**
  - Vertical scroll of the list (overscroll-contain)
  - Card-name segments are underlined buttons that open the catalog inspect (see table-action-log-inspect)
  - Kind icon per line with a title tooltip: Played, Resolved, Eliminated, Mirror, Lost, Curse, Reanimated, Rewards, Sentence, Resources
- **States:**
  - Heading 'Action log' (omitted when embedded in the collapsed Dialog)
  - Empty: 'No actions yet'
  - Sticky 'Round N' header per group; N = tableRound(turnSequence, players.length)
  - Auto-scroll to the bottom on new entries only when the user is within 48px of the bottom
  - Same panel on the live table, eliminated spectator, walk-in spectator and finished board (finalTable view)
- **Keep:**
  - No player, kind or search filters (L45/L51). No Why / botReason control in any mode (L45-05; action-log-panel.test.ts)
  - Seat-colored nicknames through segments, never substring replacement (L39-03)
  - Round number must equal the chat 'Round N' (Lot 70 uses the shared tableRound)
  - Lines are client-formatted from the per-recipient actionLog; the client never adds hidden info
  - Root data-zone='action-log-panel' is a token-chip endpoint (fx)
  - embedded mode does not stretch to h-full (L53-07; test asserts "embedded ? '' : 'h-full'")
- **Notes:** Consumers outside the panel: table-banner.ts (Sentence banner text via formatActionLogEntry), feedback payload logTail (last 30 entries, FEEDBACK_LOG_TAIL_MAX), FX token chips (actionLogFlyoutKey). Unused exports left from removed filters: filterActionLog, groupByTurn, entryInvolvesPlayer, ACTION_LOG_KINDS.

### `table-action-log-collapsed-dialog` — Collapsed action log button + Dialog

- **Files:** `apps/client/src/screens/table/table-shell.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/felt-collapse.ts`, `apps/client/src/screens/table/table-copy.ts`
- **Purpose:** On short viewports the felt log collapses into an 'Action log' button that opens the same panel in a Dialog.
- **Controls:**
  - Orange compact 'Action log' button (data-zone='log-collapsed') → chromeOpen='log'
  - Dialog 'Action log' (max-w-2xl) with an embedded panel and a green 'Close'; Esc and overlay click also close
- **States:**
  - Collapse decided by feltCollapseFromCounts (heights, counts)
  - Any other modal (card inspect, sub-choice, Shop, …) hides the chrome Dialog. Because chromeOpen stays 'log', the log Dialog comes back after a card inspect from it closes
- **Keep:**
  - The collapsed button stays a token-chip and flash endpoint (L53-07)
  - Close and Cancel stay fully on screen at 390×844 and 844×390 (L53-07)

### `table-action-log-entry-copy` — Action log line copy + client-side fog rendering

- **Files:** `apps/client/src/action-log/action-log.ts`, `packages/shared/src/protocol/state-view.ts`, `apps/server/src/protocol/build-view-for.ts`
- **Purpose:** Turns each ActionLogEntryView kind into segments. The server applies fog per recipient; the client renders whatever fields are present.
- **Controls:**
  - None beyond the inspectable card segments
- **States:**
  - actionPlayed: draw 'X draws'; buyCard 'X bought a card'; sellCard 'X sold a card'; upgradeCard 'X upgraded a card' (never named, even for self); buySpecialCard 'X bought a special card'; clearSpy 'X got unspied from Y' (or 'a spy'); buyUpgradePoint and sellUpgradePoint lines; deactivatePersistent 'X deactivated {card}; it is lost'; activateDuplication renders as 'X draws'; playMultipleAttacks 'X attacks with {card}(dmg) against Y, …'; playCard attack 'X attacks Y with {card}(dmg)' or 'X attacks with {card}'; non-attack 'X plays {card} on Y' or 'X plays {card}'
  - actionResolved: immune '{card} from X resolves on Y — immune'; cancelled '… against Y is cancelled'; blocked '… is blocked [by {blockedBy name as plain text}]'; applied attack or livesLost>0 "X's {card} hits Y"; other applied '{card} from X resolves on Y'
  - playerEliminated: 'X is eliminated [by Y] in combat / by absence / by inactivity / after leaving'
  - mirrorRedirected: 'X redirects {card}(dmg×multiplier) from Y to Z'
  - persistentDeactivated: "X's {card} is deactivated and lost". curseTransferred: 'X passes {Curse} to Y'. playerReanimated: 'X returns'. rewardsClaimed: 'X claims elimination rewards from Y'
  - Listed damage shows as a LifeCountBadge from listedAttackDamage × multiplier (null for Tax / Absorber / Super Mirror)
  - Fogged inputs the client must render (server mapActionLogEntry): an unspied activateDuplication arrives as draw with '+?'; buyPoolCard without cardId; draw without drawGain; reanimation without kitId; duplicated resourceChange lines omitted; concealed resource deltas
- **Keep:**
  - Natural language; buy, sell and upgrade omit the card name (frontend.md conventions)
  - Reward picks never shown (opaque rewardsClaimed, L9-02)
  - In-game reanimation never names the kit (L50-03)
  - Duplication activation reads as a Draw to non-seers (designer 2026-08-09)
  - 'immune' wording for outcome immune (frontend.md)
  - Exhaustive switches over kinds; Excel exportLog keeps full data
- **Notes:** Post-Lot-61 lines are split into table-action-log-post-lot61-lines and table-action-log-resource-nets.

### `table-action-log-post-lot61-lines` — Action log lines added after Lot 61 · `Lot 62+`

- **Files:** `apps/client/src/action-log/action-log.ts`, `apps/client/src/screens/table/table-banner.ts`, `packages/shared/src/protocol/state-view.ts`, `apps/server/src/protocol/build-view-for.ts`
- **Purpose:** Log copy for Sentence announcements, the Gambler wipe, fogged pool buys, Block / Attack Thief blocks and Ghost point fog.
- **Controls:**
  - None
- **States:**
  - sentenceCountdown: 'Sentence in 3 turns!' when remaining===SENTENCE_OWNER_TURNS (3), else 'N turn(s) before Sentence!'. sentenceFired: 'Sentence will kill Y!' (L63-05, PROTOCOL 37). The same text feeds the table-wide Sentence banner
  - Gambler wipe: actionPlayed draw with drawBust → 'X gambled too much and lost everything' (Lot 66/67)
  - playerEliminated reason 'gambling' → 'X dies by Gambling' (L64-04) is still formatted but unreachable since the Lot 66 wipe is not an elimination
  - buyPoolCard: 'X bought {card} from the pool' for seers (self, Spy of buyer, spectator overlay); otherwise 'X bought a card from the pool' (L63-06)
  - blocked outcome appends ' by {Attack Thief | Block …}' from blockedBy (L68-03, PROTOCOL 42)
  - Ghost life→point gains show as '+?' on nets unless the viewer sees that Ghost (decision 2026-10-06)
- **Keep:**
  - Never name the recovered pool card to non-seers (L63-06 characteristic failure)
  - Never publish a Gambler Draw payout to opponents (L65-01)
  - The Sentence countdown text matches the banner
- **Notes:** Lots 63–70.

### `table-action-log-resource-nets` — Action log icon resource nets · `Lot 62+`

- **Files:** `apps/client/src/action-log/action-log.ts`, `apps/client/src/action-log/action-log-panel.tsx`, `packages/shared/src/protocol/resource-delta.ts`, `packages/shared/src/protocol/state-view.ts`
- **Purpose:** Each line appends icon-only resource changes (+7 points, −1 life, +? point, …) for the actor's play and for each seat a resolution changed.
- **Controls:**
  - None. aria-label is spoken text (e.g. '+7 points', 'concealed point gain')
- **States:**
  - Play line: resourceDeltas suffix, order lives, points, upgrade points, shield; zeros omitted
  - Resolve line: playerDeltas. The target's nets follow the sentence; any other seat is named before its nets (steal shows both sides)
  - resourceChange line: 'X' + nets (persistent tick; Duplicator copies only for seers)
  - Concealed: '+?' / '−?' (unspied Draw, unspied buy-UP price, Ghost gains); a sale payout or buy price can be omitted entirely
  - Colors: gain text-cta-green '+', loss text-cta-red '−' (U+2212); no parentheses; the icon keeps its normal art
- **Keep:**
  - Formatting rules from decision 2026-09-28 (Action-log resource nets): icon-only, colored sign+number, '+?' / '−?' concealment, order, omitted zeros
  - Elimination rewards stay masked; Duplicator copies off the suffix
  - The stored log and Excel keep real amounts; only the per-recipient view is fogged
- **Notes:** PROTOCOL 41 (2026-09-28, commit 376fd53).

### `table-action-log-inspect` — Inspect a card from the log (and queue)

- **Files:** `apps/client/src/action-log/action-log-panel.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/card-actions.tsx`
- **Purpose:** Clicking a card name in a log line opens the existing card inspect Dialog with catalog effect text.
- **Controls:**
  - Underlined card-name button → onInspectCard(cardId, isUpgraded) → setDialog({kind:'inspect', instance:{instanceId:'inspect:log:{cardId}:{up|base}'}, source:'log'})
- **States:**
  - Inspectable segments: actionPlayed (play, multi-attack, pool buy when named, deactivate), actionResolved, mirrorRedirected, curseTransferred, persistentDeactivated
  - Not inspectable: draw, buy, sell, upgrade, elimination, rewards, Sentence lines and the blockedBy name (plain text)
  - Opening it from the collapsed log Dialog hides that Dialog until the inspect closes
- **Keep:**
  - Catalog-only synthetic instance; sources 'log' and 'queue' omit the Spy footer (L56-05)
  - Upgrade tier is shown in the inspect
- **Notes:** Incoming and Waiting chips use the same path with source 'queue'.

### `table-turn-timer-scale` — Turn timer bar and countdown, scaled to the host's turn length · `Lot 62+`

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/timers.tsx`, `apps/client/src/App.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/client/src/screens/end.tsx`, `apps/client/src/screens/lobby-rules-panel.tsx`, `apps/client/src/screens/home.tsx`, `apps/server/src/rooms/game-room.ts`, `packages/shared/src/protocol/state-view.ts`, `packages/shared/src/protocol/messages.ts`, `packages/shared/src/protocol/lobby-rules.ts`, `docs/agent/decisions.md`, `docs/spec_bataille_des_cartes_en.md`
- **Purpose:** Show how much of the current human turn is left. The server deadline drives it. Since Lot 70 the turn length is whatever the host set (5 to 180 s, default 60), but the bar still divides by a fixed 60 s. The seconds label is right. The bar fill and the red warning are wrong for any other length.
- **Controls:**
  - No interactive control. Read-only progress bar: role=progressbar, aria-label 'Turn timer', aria-valuemin 0 / max 100, aria-valuenow only when the ratio is known (timers.tsx:125-150)
  - Timer label pill (data-zone='timer-label', timers.tsx:112-118). Text is `${secondsLeft}s`, '—', 'Paused — reconnecting' or 'Absent — auto-draw' (table.tsx:986-1000)
  - Tutorial board-tour step 'timer' highlights the strip (TutorialZoneCallout highlightId='timer', table.tsx:1315-1334). data-hint-anchor='your-turn' on the section
  - Turn expiry sends no client intent. Server onTurnTimeout runs auto-draw, recordConnectedTimeout (may lead to an inactivity elimination) and endBlockChain (game-room.ts:3222-3265)
  - Inputs: deadlineMs = lastTurnStarted?.deadlineMs ?? view.turnDeadlineMs (App.tsx:181). nowMs comes from a 250 ms interval tick (App.tsx:101-110)
  - Where the turn length is set (lobby surfaces, listed for traceability): LobbyRulesPanel clock '{N}s' plus host-only gear → 'Table rules' dialog with a 5–180 slider (lobby-rules-panel.tsx:42-60). Online lobby sends setLobbyRules. Solo menu sends turnTimeSeconds only when includeTurnTime (use-room-connection.ts:568-575, home.tsx:116-118)
- **States:**
  - Own turn running: 'Your turn', label Ns (ceil, clamped ≥0), yellow fill at round(ratio*100)%
  - Opponent human turn running: "{nickname}'s turn" in the seat color, same bar
  - Low time: ratio < 0.2 turns the fill red (bg-cta-red) and scaleY 1.15 (timers.tsx:133-144). Today's math makes this the last 12 s for every turn length
  - Host turn > 60 s (up to 180): ratio = (deadline-now)/60000 clamped to 1, so the bar sits at 100% for the first (T-60) s. A 180 s turn shows full for 120 s
  - Host turn < 60 s (down to 5): the bar starts partly empty (5 s ≈ 8%) and is red from the start
  - Dev env TURN_DURATION_MS (min 5000, may exceed 180 s) is the human clock until the host sets a time (game-room.ts:262-270, 1290-1296). The lobby view's effective turnTimeSeconds may then be >180
  - Paused: active seat disconnected → 'Paused — reconnecting', ratio null, bar empty, no aria-valuenow. The server holds pausedTurnRemainingMs (game-room.ts:3177-3182, 4040-4053)
  - Absent: active seat absent and deadlineMs null → 'Absent — auto-draw' (the server auto-draws after setTimeout 0)
  - Resume after reconnect: the server restarts with the remaining ms and re-broadcasts TURN_STARTED with deadline = now + remaining (game-room.ts:4100-4108). The bar comes back partly drained, which is only correct for a 60 s turn
  - Bot turn: the server nulls turnDeadlineMs and sends no TURN_STARTED (game-room.ts:3155-3160, 3952-3959). The client keeps the previous human's lastTurnStarted, so it shows that stale countdown
  - During a sub-choice after acting: applyTurnResult clears the server turn timer but turnDeadlineMs stays in the view (game-room.ts:2224-2229, 328). The bar keeps draining to 0s/red while the 40 s sub-choice is open. Obvious with a 5 s turn
  - Tutorial: turnDeadlineMs null and no TURN_STARTED → label '—', empty bar (technical spec v6 §8, L45-04)
  - Finished board: TableScreen gets deadlineMs={null} → '—' (end.tsx:143)
  - Walk-in spectator / claimSeat / fresh-tab rejoin mid-match: lastTurnStarted is null until the next turn, so it falls back to view.turnDeadlineMs. This client never saw the lobby rules
  - Reduced motion: width animation duration 0
  - Clock skew: server epoch deadline compared to client Date.now()
- **Keep:**
  - The host's custom turn time (5–180 s, default 60) applies to human turns and must show truthfully on the table. Rules spec §6 Setup; decisions 2026-10-06 'Lot 70 lobby rules and table chat'; the user's V7 request keeps lobby rules including the turn-time change
  - Bots keep their own think time. The host turn length does not apply to them (Lot 70 decision; bot-think-ms.ts)
  - Countdown seconds come only from the server deadlineMs: 'Cosmetic only: trust server deadlineMs' (timers.tsx header, L12-07 / L14-05 / L39-05)
  - Paused-reconnecting and absent auto-draw labels instead of a countdown (technical spec §5.7; RECONNECT_GRACE_MS 30 s, L57-13)
  - Tutorial shows no running turn timer (technical spec v6 §8 / L45-04)
  - A low-time warning exists (red + slight grow under 20%, L39-05 motion polish). The threshold meaning needs a ruling once the bar scales
  - Turn expiry is server-driven: auto-draw, inactivity tick, and it ends the Block chain (#V4-6). The timer and inactivity do not pay forfeit rewards (Lot 71 decision). The client sends nothing
  - Accessible progressbar semantics and reduced-motion support
  - Protocol is frozen for V7: PlayingStateView (state-view.ts:298-356) has no lobbyRules or turnTimeSeconds, and TurnStartedPayload (messages.ts:80-85) carries only activePlayerId, deadlineMs and blockTurnsRemaining. Only LobbyStateView.lobbyRules (state-view.ts:96-100) and FinishedStateView.lobbyRules (state-view.ts:688-692) carry the effective turnTimeSeconds
- **Notes:** The bar dates from L12-07 / L14-05, and the 60 s divisor from designer 2026-08-05 ('Client progress bar already assumed 60s', decisions.md:1671-1672). It broke with Lot 70 (host turn seconds, PROTOCOL_VERSION 45), hence addedAfterLot61=true. The bug is table.tsx:1001-1004 `Math.min(1, (deadlineMs - nowMs) / 60_000)`. The secondsLeft label (table.tsx:990-993) is correct. Server source of truth: humanTurnDurationMs() (game-room.ts:1290-1296) returns lobbyRules.turnTimeSeconds*1000 only when turnTimeOverridden and not tutorial, else TURN_DURATION_MS; viewLobbyRules() rounds it into the lobby and finished views (1298-1304). Client-only ways to get the turn length without a protocol change: (1) cache lobbyRules.turnTimeSeconds from the last lobby view or the solo menu. This fails for mid-match joiners, claimSeat and fresh-tab rejoins. (2) Take the denominator from the remaining time when a new deadline first appears. This refills to full on reconnect resume and for late joiners. (3) Combine both. A payload field needs a PROTOCOL_VERSION bump, which conflicts with the V7 protocol freeze. No in-game place shows the configured turn length today. There is no rules recall on the table.

### `table-sub-choice-timer-scale` — Sub-choice countdown (strip bar and dialog seconds)

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/timers.tsx`, `apps/client/src/screens/table/sub-choice/sub-choice-constants.ts`, `apps/client/src/screens/table/sub-choice/index.ts`, `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/client/src/net/is-sub-choice-required.ts`, `apps/server/src/engine/turn/sub-choice.ts`, `apps/server/src/rooms/game-room.ts`, `apps/server/src/engine/turn/elimination-rewards.ts`, `apps/server/src/engine/turn/generic-sub-choice.ts`, `apps/server/src/engine/turn/steal-choice.ts`, `apps/server/src/engine/specials/slot-drop.ts`, `apps/server/src/cards/handlers/mirror.ts`
- **Purpose:** Show the chooser how long is left on an open sub-choice (Mirror, steal-pick, pool-pick, special-pick, reanimation-kit, slot-drop, elimination-reward) before the server picks a default. Checked against the gap claim: the window is a fixed 40 s that does not depend on the host turn time, so CLIENT_SUB_CHOICE_MS = 40_000 matches the server.
- **Controls:**
  - No interactive control on the countdown itself. A strip line 'Choice: Ns' plus an orange progress bar (role=progressbar, aria-label 'Sub-choice timer'), rendered only when subChoice is non-null (timers.tsx:152-178)
  - Dialog line '{expiryHint} · Ns left' in SubChoiceHost (sub-choice-host.tsx:132-153). The dialog has no close: onClose no-op, closeOnOverlayClick false
  - Expiry hints per kind (sub-choice-host.tsx:23-57): random eligible redirect (Mirror), random eligible card (steal), random eligible cards (pool), random special, random kit, oldest droppable active card (slot-drop, with its own slotDropExpiryHint), plus the reward copy
  - Expiry sends no client intent. Server on*Timeout resolves the default (game-room.ts begin*Timer 2420-2930)
- **States:**
  - Open for the chooser only. SUB_CHOICE_REQUIRED is unicast and other seats and spectators see no sub-choice bar
  - Fresh window: the engine sets deadlineMs = nowMs + SUB_CHOICE_MS (40 s) for every kind (mirror.ts:41, steal-choice.ts:78, generic-sub-choice.ts:84/155/223, slot-drop.ts:113, elimination-rewards.ts:457) → the bar starts full
  - Carried deadline: Lot 71 open reward prompts send every living recipient the same rewardChoice.deadlineMs (game-room.ts:2936-2960). finishRewardJob carries the remaining deadline to the next head (elimination-rewards.ts:624-645). The bar starts partly drained, which is correct
  - Resume after the chooser reconnects: the paused remaining ms comes back as durationMs and deadline = now + remaining (game-room.ts:4110-4186). The bar comes back partly drained, which is correct
  - Resync on reconnect or claim resends the stored deadline unchanged (resyncSubChoiceRequiredFor, game-room.ts:4518-4585)
  - Edge case: begin*Timer called when the choice deadline has already passed (remainingFromDeadline === 0, no durationMs). The server waits a fresh 40 s but sends the stale past deadline, so the client shows 0s and an empty bar while the server still waits (game-room.ts:2428-2432 and siblings)
  - Cleared on TURN_STARTED (use-room-connection.ts:290-297), on confirm and on gameOver
  - Bots get no prompt (beginRewardTimer bot route, game-room.ts:2896-2901)
  - Shown alongside the turn bar, which keeps draining during the sub-choice (see table-turn-timer-scale)
- **Keep:**
  - A single 40 s sub-choice window for every kind: SUB_CHOICE_MS, technical spec v4 §4.4 / L20-18, raised from 20 s on designer 2026-08-05 (decisions.md:1673-1674). Not tied to the host turn time
  - Shared simultaneous reward deadline for every rewarded player (Lot 71 decision 2026-10-06)
  - The default-on-expiry copy stays visible next to the seconds (L30-03 SubChoiceHost)
  - Sub-choice dialog cannot be dismissed. Other table actions stay locked while it is open (frontend.md Sub-choices L30-03)
  - Deadlines come from the server payload only
- **Notes:** The gap claim that the server often gives a sub-choice the turn's remaining time does not hold. In game-room.ts:2428-2431 `remainingFromDeadline` is computed from the sub-choice's own deadlineMs (choice.deadlineMs), which the engine always sets 40 s ahead. Only resume, carry-over and resync shorten it, and the 40 s scale stays right in those cases. The real risk is drift: CLIENT_SUB_CHOICE_MS is a hand-copied mirror of server SUB_CHOICE_MS, kept in sync only by a comment (sub-choice-constants.ts:1). Lot 71's shared reward deadline and Lot 69's slot-drop came after Lot 61, but the countdown surface itself is L30-03.

### `table-inspect-active-upgrade` — Inspect dialog: Upgrade button for an active card, the Shield or a ticking Sentence · `Lot 62+`

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/screens/table/active-display.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/screens/table/opponent-zone.tsx`, `apps/client/src/screens/table/sentence-chip.tsx`, `apps/client/src/screens/table/chrome-labels.ts`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/screens/illegal-action-copy.ts`, `apps/client/src/net/use-room-connection.ts`, `apps/client/src/design/components/dialog.tsx`, `packages/shared/src/domain/special-card-catalog.ts`, `packages/shared/src/domain/card.ts`, `packages/shared/src/protocol/messages.ts`, `packages/shared/src/release-notes.ts`, `apps/server/src/engine/economy/upgrade-card.ts`, `apps/server/src/engine/turn/list-legal-economy.ts`, `docs/spec_bataille_des_cartes_en.md`, `docs/agent/decisions.md`, `docs/agent/frontend.md`, `docs/backlog_v6.md`
- **Purpose:** The only way to spend an upgrade point on a card that is already in play: one of your own active persistents (Poison, Points Generator, Imposition, Super Absorber, Roulette, Invisibility), your combat Shield while shield > 0, or your own ticking Sentence. The hand-card actions dialog only covers copies still in hand or specials. Added by L66-01 (actives and Sentence, PROTOCOL_VERSION 40 gives PendingSentence an id) and L67-01 (active Shield through the synthetic id 'active-shield').
- **Controls:**
  - Upgrade button (Button compact variant="orange"; label CARD_UPGRADE_LABEL 'Upgrade' followed by CostDisplay { kind: 'upgradePoint', amount: 1 } signed="cost", which reads as -1 plus the upgrade-point icon). Clicking it calls onUpgradeCard(inspectUpgradeId) and then close(). table.tsx wires that to upgradeCardGuarded, then useRoomConnection.upgradeCard, which does room.send(UPGRADE_CARD = 'upgradeCard', { instanceId }). This is the same intent as a hand upgrade. instanceId is the own persistent effect id, 'active-shield' (ACTIVE_SHIELD_INSTANCE_ID) or the PendingSentence.id ('sentence:<turnSeq>:<sourceId>:<n>'). No confirmation step and no pending or spinner state: the dialog closes right away (card-actions.tsx:376-393).
  - Footer order in the inspect dialog: Upgrade (orange), then Deactivate (purple, only when canDeactivateInspect is true), then Close (green). Deactivate opens the separate 'Are you sure?' confirm (DEACTIVATE_CONFIRM_TITLE / DEACTIVATE_CONFIRM_BODY 'This card will be lost. This does not cost a turn.'). It needs source 'active', an id that is one of your own activePersistentEffects, cardId not 'shield' and not 'sentence', isMyTurn, and onDeactivatePersistent being provided. Off-turn it is HIDDEN, not disabled, and actionsLocked does not gate it (card-actions.tsx:130-137, 394-404).
  - Close button (green) calls close(). Escape and an overlay click call closeInspectDialog, which first dismisses an open Deactivate confirm and only then closes the inspect dialog (card-actions.tsx:153-159; dialog.tsx:108-124, 162-168).
  - Entry: tap your own active thumb in the private-zone own-actives row. The Shield thumb comes first while view.self.shield > 0 (shieldActiveInstance), then each activePersistentEffects row. The tap calls onSelectActive, then onInspectActive(view.you, id), which opens { kind: 'inspect', source: 'active', activated: true (false for Shield), counter } (private-zone.tsx:78-90, 160-180; table.tsx:1172-1222, 1471-1474).
  - Entry: tap your own Sentence chip (SentenceChipsForSeat in the private zone). It calls onInspectSentenceChip(sentence), which opens { kind: 'inspect', source: 'active', instance { instanceId: sentence.id, cardId: 'sentence', isUpgraded } } with NO activated flag (private-zone.tsx:182-186; table.tsx:1224-1235).
  - Opponent active thumbs and Sentence chips (in the opponent-zone arc and in the collapsed Opponents chrome dialog) open the same inspect dialog. Upgrade should never apply there; see openQuestions for the Shield exception (opponent-zone.tsx:46-95; table.tsx:1399-1402, 1635-1641).
- **States:**
  - Visible only when activeUpgradeInstanceId(view, instance) returns a non-null id (table-helpers.ts:116-145). That requires instance.isUpgraded false, view.self.upgradePoints >= 1, and one of these: (a) Sentence: a pendingSentences entry with id === instanceId, sourcePlayerId === view.you and not upgraded; (b) instanceId === 'active-shield' and view.self.shield > 0; (c) cardId in UPGRADEABLE_ACTIVE_CARD_IDS and an own activePersistentEffects entry with that id that is not upgraded.
  - Hidden, not disabled, in these cases: 0 upgrade points; the card is already upgraded; Curse, Reanimation or any persistent outside the list; an opponent's actives or Sentence (their ids never match self or sourcePlayerId); Spy-reveal, log and queue inspects. Log and queue use synthetic 'inspect:<source>:<cardId>:<tier>' ids that match nothing. This differs from the hand actions dialog, which shows Upgrade disabled at 0 upgrade points and hides it only once the card is upgraded.
  - Disabled (still visible) when !isMyTurn (off-turn: the dialog stays open for reading) or when actionsLocked = readOnly || subChoice !== null || selfEliminated || walkInSpectator (table.tsx:858, 884). That covers the Game-over read-only table, an open sub-choice (Mirror, rewards, slot drop, steal pick), an eliminated seat and a walk-in spectator.
  - No disabled-reason text in the inspect dialog. The hand actions dialog shows 'Actions locked — you can still read the card.'; inspect shows nothing.
  - Tutorial: upgradeCardGuarded looks up findOwnCard(instanceId), which searches only hand and specials. An active, Shield or Sentence id is never found there, so it calls setTutorialIllegalIndex and does not send the intent, and the dialog still closes (table.tsx:454-456, 642-655). The inspect Upgrade also has no TutorialCallout spotlight, unlike the hand Use / Upgrade / Sell buttons.
  - Body context while Upgrade shows: CardEffectCopy for the current tier (base effect plus the Upgrade block, or upgradeEffect only). source 'active' adds an 'Active' label. Persistents with a counter add a LifeCountBadge: 'Card lives', or 'Turns left' (kind 'turns') for Invisibility. Shield has no counter and uses activated=false. Sentence shows 'Active' with no remaining-turns row, because the counter is not passed.
  - Art rule: Card activated is only true when dialog.activated and the card is in CARDS_WITH_ACTIVATED_ART. Sentence and Shield never request activated art. Requesting Sentence activated art threw in getCardArtUrl and blanked the table (fix b6cfece).
  - After a successful upgrade: the server spends 1 upgrade point and the turn. The public log line is '{actor} upgraded a card'. The thumb or chip flips to upgraded art. Counters, Invisibility turns left, Sentence remaining turns and remaining shield points do not change. The upgraded rate applies from the next tick.
  - Server rejects and the client copy for each (illegal-action-copy.ts): not-your-turn; not-enough-upgrade-points ('No upgrade points'); already-upgraded ('Already upgraded'); card-not-held ('Card not in hand', which is misleading for an active target).
  - Two own Sentences: each chip opens its own id, so each has its own Upgrade.
  - Deactivate confirm open: it stacks over the inspect dialog. Escape or the overlay closes the confirm first.
- **Keep:**
  - The inspect dialog is the ONLY client path to upgrade an active persistent, the active Shield or a ticking Sentence. A redesign that drops it removes a rule-backed action (L66-01, L67-01; rules spec §1 'Spending 1 upgrade point can also upgrade one of your own active ...'; decisions 2026-09-28 Lot 66 and Lot 67).
  - The eligible set matches the server exactly. The client gate (activeUpgradeInstanceId) must stay in step with apps/server/src/engine/economy/upgrade-card.ts and list-legal-economy.ts: UPGRADEABLE_ACTIVE_CARD_IDS ['poison','points-generator','imposition','super-absorber','roulette','invisibility'], plus Shield while shield > 0 and not shieldIsUpgraded, plus your own non-upgraded ticking Sentence. Curse and Reanimation are excluded (decisions 2026-09-28).
  - Cost: 1 upgrade point AND the turn (it is the turn's action, as in the Lot 66 browser verification 'passes the turn'). Deactivate, by contrast, is free and does not end the turn (L69-01; rules spec §1 Active slots).
  - Upgrading never resets counters, Invisibility turns left, Sentence remaining turns or remaining shield points. Upgrading an active card adds no slot (rules spec Active slots; upgrade-card.ts header).
  - The intent is unchanged: upgradeCard { instanceId }. The Shield uses the synthetic 'active-shield' id. The Sentence uses the public PendingSentence.id, which needs PROTOCOL_VERSION 40 (protocol.md).
  - Cost chrome: CostDisplay upgradePoint amount 1 signed="cost" (a '-' prefix and the icon, never 'UP' letters); Upgrade stays orange like Buy (decisions: Table pass rule 11, orange for Buy/Upgrade, interactive costs prefix -/+).
  - Shield and ticking Sentence get Upgrade but never Deactivate. They can only leave through a forced slot drop (rules spec Active slots, L69-01).
  - The dialog stays openable off-turn for reading. Upgrade shows but is disabled off-turn or while actions are locked. A greyed button is not validation: the server revalidates (AGENTS golden rule 8).
  - Sentence and Shield inspect must not request activated art (b6cfece crash fix; frontend.md Lot 66 verified note).
  - The player-facing promise in lot-65 What's new must stay true: tapping the Sentence chip reads the card and, on your turn with an upgrade point, upgrades it; you can also upgrade active Poison, Points Generator, Imposition, Super Absorber, Roulette, Invisibility or Shield, and counters do not reset (release-notes.ts:170-174, 233-237).
- **Notes:** Introduced in 13de312 (L66-01). Sentence crash fix b6cfece (L66-01). Shield branch added in aba90c4 / 861ea24 (L67-01). The sibling Deactivate button and confirm were added later, in 057be78 (L69-01), and are covered by the existing deactivate-confirm entry. activeUpgradeInstanceId has no unit test in apps/client; only server tests (upgrade-card.test.ts) and the browser notes in frontend.md cover it. The inspect dialog itself has no notion of which seat owns the inspected card: it infers ownership from ids, and that causes the Shield issue in openQuestions.

### `table-target-picker-eligibility` — Choose target dialog: which seats each card can target · `Lot 62+`

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/attack-targets.ts`, `apps/client/src/screens/table/attack-targets.test.ts`, `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/design/components/seat-tile.tsx`, `apps/client/src/screens/table.tsx`, `packages/shared/src/protocol/state-view.ts`, `apps/server/src/engine/turn/perform-action.ts`, `apps/server/src/engine/turn/riposte-target.ts`, `apps/server/src/engine/turn/absorb-window.ts`, `apps/server/src/engine/specials/is-invisible.ts`
- **Purpose:** Single-target 'Choose target' dialog (TableDialog kind 'target') opened from Use. It lists only the seats that card may legally target, lets the player pick one SeatTile, and sends playCard with targetPlayerId. The seat set depends on the card (card-actions.tsx:160-187). It mirrors the server's invalid-target checks (perform-action.ts:1771-1791). The server still revalidates.
- **Controls:**
  - SeatTile button per eligible seat (aria-pressed = selected, aria-label = nickname). Click sets local targetId; no intent sent
  - Confirm (purple): onPlayCard(instanceId, { targetPlayerId: resolvedTarget }) then close. Disabled only when resolvedTarget === ''
  - Cancel (red): close(); no intent
  - Dialog onClose (Escape / dismiss): close()
  - Upstream: Use in the card actions dialog calls onBeginUse (table.tsx:1133), which opens kind 'target' when cardPlayNeedsTarget(cardId, isUpgraded) is true
- **States:**
  - Attack cards (basic/strong/super): living opponents, minus living Invisible seats, plus any eliminated seat that has a non-persistent pending attack on you (isAttackCardId, which includes mega-attack) where that seat is the source (attackTargetOpponents, L68-07 corpse riposte)
  - Thief: living opponents, minus living Invisible seats, plus any eliminated seat with a pending Thief on you (thiefTargetOpponents, decisions 2026-09-30). A pending attack does not make a corpse a Thief target, and a pending Thief does not make it an attack target (attack-targets.test.ts)
  - Absorber: living opponents, minus living Invisible seats, plus eliminated seats with absorbWindowOpen === true (absorberOpponents; window from PROTOCOL 25; Invisible exclusion added in L66-01)
  - Spy, Cloning, Curse, base Card Thief, base Upgrade Point Thief, base Spy Thief: aliveOpponents only (living and not Invisible). A corpse is never listed, even with something pending
  - Living Invisible seat (activePersistentEffects contains 'invisibility' and !isEliminated): left out of every picker (L65-02). An eliminated seat is never left out for Invisibility
  - Pending rows whose id starts with 'persistent:' (client-made chips) never qualify a corpse (attack-targets.ts:33)
  - Seats that do not qualify are left out of the grid. They are not shown greyed: SeatTile has a `disabled` prop, but this dialog never passes it
  - Default selection: the first eligible seat in view.players seat order. This can be a corpse when it sits before a living seat
  - Selection fallback: if the selected targetId is no longer in the eligible set, resolvedTarget silently switches to the first eligible seat
  - Empty set (for example every living opponent is Invisible and no corpse qualifies): the grid is empty and Confirm is disabled. There is no explanatory copy, and Use was not pre-disabled
  - Corpse tile: KitPortrait shows the eliminationReveal kit (visibleKitId); the nickname uses the seat color. There is no 'eliminated' or 'riposte' badge and no reason why the seat is targetable
  - Spy+ revealed living seat: KitPortrait shows the spied kit only with a full Spy+ reveal (hasFullSpyCardReveal); otherwise the portrait is generic
  - Off-turn or timer expiry while the dialog is open: it does not close automatically, and Confirm is not gated on isMyTurn or actionsLocked. The server rejects the play
  - Tutorial: Confirm goes through playCardWithFx, which re-runs allowTutorialSend on card id and upgrade level. The chosen target is not checked
  - Untouchable seats stay listed for Thief and Spy: immunity is checked at resolve (resolve-pending.ts:700), and hiding them would leak a hidden kit
- **Keep:**
  - Each card keeps its own target set: attack, Thief and Absorber can each include different corpses. All other targeted cards are living-only (card-actions.tsx:179-187; frontend.md 'Attack Choose target … Spy and the other living-only pickers stay living-only')
  - An eliminated seat is targetable by an attack only while it still has a pending attack on you (rules spec §6 line 275; L68-07). The answer is discarded and does not damage the corpse, so the UI should not suggest damage to a dead seat
  - An eliminated seat is targetable by Thief only while it still has a pending Thief on you (rules spec §3 line 33; decisions 2026-09-30)
  - Absorber may target an eliminated seat only while absorbWindowOpen is true (rules spec Absorber line 64; state-view.ts:169)
  - Living Invisible seats are never offered as a single target (L65-02; rules spec Invisibility line 193). The server answers invalid-target via isIllegalOpposingTarget
  - A redesigned picker (seat tap, drag-to-seat, on-felt highlight) must show a qualifying corpse as targetable. It must also keep non-qualifying corpses and living Invisible seats out of reach
  - The intent payload is unchanged: playCard { instanceId, targetPlayerId } (golden rule 8: the server revalidates)
  - Do not filter by kit immunity (Untouchable) on the client. The kit can be hidden (per-recipient visibility)
- **Notes:** Timeline: base Card Thief target (Lot 21) and the Absorber corpse window (PROTOCOL 25, 2026-08-07) predate Lot 61. Post-61 work: excluding Invisible seats (L65-02 rule, landed in L66-01 commit 0c81fa2), base Upgrade Point Thief target (L66-01), base Spy Thief target (L71-01, commit a9c3c17), attack corpse riposte (L68-07, commit 14a5ce9) and Thief corpse counter (decisions 2026-09-30, same PR #58). attack-targets.ts exports riposteAttackerIds(), which nothing imports; it is ready to drive a 'can answer' badge on corpse seats. The client never marks why a corpse qualifies. A pending attack or Thief from that corpse is visible in the public pending queue (PendingEffectView.sourcePlayerId/targetPlayerId), so a badge would need no new data.

### `table-multi-attack-target-eligibility` — Assassin multi-attack: target seats per attack row · `Lot 62+`

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/attack-targets.ts`, `apps/client/src/screens/table.tsx`, `apps/server/src/engine/turn/perform-action.ts`
- **Purpose:** The 'Assassin multi-attack' dialog (TableDialog kind 'multi'). The player picks two or more attack cards from hand and a target seat for each, then sends one playMultipleAttacks intent. Each row's seats use the same attack eligibility as single attacks (attackOpponents).
- **Controls:**
  - Multi-attack button in the card actions dialog: shown only when kit.traits.allowsMultipleAttacksPerTurn and the card is in ATTACK_CARD_IDS. Disabled when !isMyTurn || actionsLocked. Opens kind 'multi'
  - CardChoiceTile per attack card in hand (attackCards = isSharedAttackCardId). Toggles the card in multiIds. Checking a card seeds its row target with rowTarget, or defaultTarget when rowTarget is ''
  - SeatTile per eligible seat under each checked row. Click sets multiTargets[instanceId]
  - 'Play {n} attacks' (purple): onPlayMultipleAttacks([{instanceId, targetPlayerId}…]), then the selection resets and the dialog closes. Disabled when fewer than 2 cards are selected or any selected row has no target
  - Cancel (red) / Dialog onClose: close(). multiIds and multiTargets are not cleared on cancel
- **States:**
  - Row seat set = attackOpponents: living opponents, minus living Invisible seats (L65-02), plus corpses with a pending attack on you (L68-07). The server's playMultipleAttacks applies the same riposteOk and isIllegalOpposingTarget per attack (perform-action.ts:1581-1592)
  - Initial row target = multiTargets[id], else resolvedTarget (the first living non-Invisible opponent, because the 'multi' dialog falls back to aliveOpponents), else defaultTarget = aliveOpponents[0] ?? attackOpponents[0]. A corpse is preselected only when no living, non-Invisible seat exists
  - Entry animation: rows stagger in (motion) unless reduced motion is on
  - Own Invisibility active: the Multi-attack button stays enabled. Only Use gets greyed. The server rejects with play-not-legal (perform-action.ts:1540)
  - Block attack ban on self: no client gating; the server rejects attacks-forbidden-during-block
  - Off-turn or locked: the entry button is disabled. Inside the dialog, Play is not gated on isMyTurn
  - Tutorial: playMultipleWithFx checks allowTutorialSend({kind:'playMultipleAttacks'})
  - Selections persist across closing and reopening because the state lives in CardActions
- **Keep:**
  - Several attacks aimed at the same opponent count as one volley for the mutual compare (golden rule 1; decisions 2026-09-29). The UI must allow several rows to target the same seat
  - Corpse riposte is allowed per row, the same as a single attack (L68-07)
  - Living Invisible seats are never offered (L65-02)
  - At least two attacks, each with exactly one target; intent payload unchanged
- **Notes:** The corpse and Invisible eligibility here comes from L65-02 and L68-07. The dialog itself (L44-04) predates Lot 61.

### `table-use-target-routing` — Use routing: which cards open a target picker · `Lot 62+`

- **Files:** `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/screens/table/table-helpers.test.ts`, `apps/client/src/screens/table.tsx`, `docs/spec_bataille_des_cartes_en.md`
- **Purpose:** Decides what pressing Use does (onBeginUse, table.tsx:1133-1157). Regeneration opens the quantity picker. Card Transformer opens the consume picker. A card that cardPlayNeedsTarget accepts opens Choose target. Everything else plays at once with no target.
- **Controls:**
  - Use (from the card actions dialog) → onBeginUse(instance): checks the tutorial gate, then routes to quantity / consume / target, or sends playCard immediately and closes the dialog
- **States:**
  - Needs a target: basic/strong/super attack, Spy, Thief, Absorber, Cloning, Curse (any upgrade level)
  - Base Card Thief, base Upgrade Point Thief and base Spy Thief need a target. Their upgraded copies play with no target: the upgrade hits every living opponent (UP Thief, Spy Thief) or every opponent (Card Thief, rules spec line 180-182)
  - No picker: mega-attack, Poison, Imposition, Sentence, Suicide, Mirror and the self-only cards (cardIsSelfOnlyPlay)
  - instance.isUpgraded drives the branch, so a kit-granted permanent upgrade also skips the picker
  - Tutorial: if allowTutorialSend rejects the play, nothing opens and the tutorial shows its illegal-move index
- **Keep:**
  - Base Upgrade Point Thief opens Choose target; the upgraded copy does not (L66-01; frontend.md Lot 66 verify note)
  - Base Spy Thief opens Choose target; the upgraded copy does not (L71-01; table-helpers.test.ts)
  - Base Card Thief opens Choose target; upgraded steals from every opponent (Lot 21)
  - Upgraded thieves must not show a single-seat picker in a redesign. A seat-drag gesture for these must be refused or treated as 'all'
- **Notes:** The Upgrade Point Thief branch came in L66-01 (commit 0c81fa2) and the Spy Thief branch in L71-01 (commit a9c3c17). The Card Thief branch dates from Lot 21.

### `table-use-disabled-reasons` — Card actions dialog: Use disabled reasons (including the Invisibility lock)

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/card-actions.test.ts`, `apps/client/src/screens/table.tsx`, `packages/shared/src/domain/card.ts`
- **Purpose:** Greys Use in the card actions dialog when this client already knows the play is illegal. The main pre-check is the Invisibility pacifist lock: while your own Invisibility is active you cannot play a card that acts on another player.
- **Controls:**
  - Use (purple, with CostDisplay of the play cost): enabled only when isMyTurn && !actionsLocked && !transformerUseBlocked && !useBlockedByInvisibility
  - When isTemporarilyUnavailableCardId(cardId) is true, the text 'Temporarily unavailable' replaces the Use button
- **States:**
  - Off-turn (!isMyTurn): Use is disabled and the body shows 'Actions locked — you can still read the card.'
  - actionsLocked = readOnly || a sub-choice is open || self eliminated || walk-in spectator (table.tsx:884). Same copy as off-turn
  - Own Invisibility active and cardActsOnOpponents(cardId) is true (attacks, mega-attack, Spy, Thief, Card Thief, Spy Thief, UP Thief, Poison, Curse, Imposition, Super Absorber, Absorber, Cloning, Suicide, Sentence, Mirror, Super Mirror): Use is disabled with no reason copy (L58-06)
  - Card Transformer with no action or attack card in hand: Use is disabled with no reason copy (the consume dialog has its own empty copy)
  - Temporarily unavailable list (TEMPORARILY_UNAVAILABLE_SPECIAL_CARD_IDS) is empty today, so that branch never shows
  - Block attack ban on self: Use on an attack is not greyed. The server rejects attacks-forbidden-during-block; flow-status-badges shows the Block status
  - Tutorial spotlight: a TutorialCallout wraps Use when tutorialAction === 'use'
- **Keep:**
  - Invisibility forbids acting on others, Mirror included, while self-economy stays legal (rules spec line 193; Lot 58 designer 2026-09-15). The list is designer-locked: do not add Attack Thief (card.ts comment)
  - Upgrade and Sell stay usable while Invisible (only Use is pacifist-locked)
  - The card stays readable when actions are locked
- **Notes:** The Invisibility lock (L58-06) and CARD_IDS_THAT_ACT_ON_OPPONENTS (unchanged since commit 75455ec) both predate Lot 61. They are included because the gap's WHERE line points here, and a redesign of seat targeting must keep the lock.

### `table-sub-choice-non-dismissible` — Sub-choice dialog cannot be dismissed

- **Files:** `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx`, `apps/client/src/screens/table/sub-choice/mirror-panel.tsx`, `apps/client/src/screens/table/sub-choice/reward-panel.tsx`, `apps/client/src/screens/table/sub-choice/steal-pick-panel.tsx`, `apps/client/src/screens/table/sub-choice/pool-pick-panel.tsx`, `apps/client/src/screens/table/sub-choice/special-pick-panel.tsx`, `apps/client/src/screens/table/sub-choice/reanimation-kit-panel.tsx`, `apps/client/src/screens/table.tsx`
- **Purpose:** Mirror redirect, elimination reward, steal, pool recovery, special pick and reanimation kit choices must be resolved, or they expire to a server default. They cannot be closed.
- **Controls:**
  - Escape: preventDefault, then a no-op (onClose={() => undefined}, sub-choice-host.tsx:144)
  - Backdrop click: ignored (closeOnOverlayClick={false}, sub-choice-host.tsx:145)
  - No Close button and no actions row: every commit control lives in the body
  - Select-then-confirm panels: select a tile, then 'Confirm redirect' / 'Confirm rewards' / 'Confirm steal' / 'Confirm recovery' / 'Confirm special' / 'Confirm kit'. Each sends RESOLVE_SUB_CHOICE and is disabled until the choice is ready
  - Server deadline: the expiry hint plus 'Ns left' countdown (sub-choice-host.tsx:134-153)
- **States:**
  - one state per kind with its own title and 'On expiry: …' hint (SUB_CHOICE_COPY)
  - countdown from subChoice.deadlineMs
  - reward hint: the first-game reward HintOverlay may show over this Dialog (table.tsx:1060-1068)
  - other Dialogs can be open alongside it (Shop, chat, IllegalActionDialog for a reject). Escape closes those and leaves the sub-choice up
  - other modal chrome (Incoming / log / Opponents) is hidden while a sub-choice is pending (otherModalOpen)
- **Keep:**
  - Escape and backdrop never resolve, cancel or hide a sub-choice. Only the panel's explicit controls or the server timeout end it
  - Every kind keeps its expiry copy (random eligible redirect, 4x2 lives reward, random card/kit/special, and so on)
  - The Tab trap still applies. Initial focus goes to the first enabled tile or button in the panel
- **Notes:** The slot-drop kind (Lot 69) is the only one with tap-to-commit and an explicit Cancel intent; it is listed separately.

### `table-slot-drop-commit-cancel` — Slot-drop picker: tap commits, Cancel is an intent, Escape is not · `Lot 62+`

- **Files:** `apps/client/src/screens/table/sub-choice/slot-drop-panel.tsx`, `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx`, `apps/server/src/engine/specials/slot-drop.ts`, `packages/shared/src/domain/sub-choice.ts`, `docs/spec_bataille_des_cartes_en.md`, `docs/backlog_v6.md`
- **Purpose:** The fifth active-slot drop picker (Lot 69). Unlike the other sub-choices, a single tap on a tile commits, and a red Cancel button aborts the new activation.
- **Controls:**
  - Slot tile (CardChoiceTile, aria-label 'Drop <card>'): a single tap immediately sends RESOLVE_SUB_CHOICE {kind:'slot-drop', slotId}. There is no Confirm step (slot-drop-panel.tsx:77-79)
  - Red 'Cancel': sends RESOLVE_SUB_CHOICE {kind:'slot-drop', cancel:true} (slot-drop-panel.tsx:86-94). The server's cancelSlotDrop restores the special to its holder (removing it from the pool if needed) and clears the sub-choice
  - Escape / backdrop: no effect (inherited from SubChoiceHost)
- **States:**
  - own slots: 'You have four active cards. Pick one to remove so the new card can stay.'
  - Curse on an opponent with four actives: the caster picks the victim's slot, with copy naming the victim
  - expiry: the oldest droppable active card is dropped (own or the victim's, slotDropExpiryHint). Only a human may cancel
- **Keep:**
  - Cancel stays an explicit, visible intent and is not mapped to Escape or a backdrop click (rules spec Active slots: 'or the activating player cancels and keeps their four actives')
  - Tap-to-commit on a tile. A redesign that adds a select-then-confirm step changes the interaction speed but not the intent
  - Shield and Sentence slots show their '(shield)' / '(sentence)' captions
- **Notes:** The picker comes from Lot 69 (L69-01). Cancel comes from commit 468e0b8, 'fix(engine): cancel fifth-slot drop picker', after Lot 69.

### `table-deactivate-confirm-escape-layer` — Inspect plus deactivate-confirm Escape layering · `Lot 62+`

- **Files:** `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/card-actions.test.ts`
- **Purpose:** While the deactivate confirmation is open on top of an active-card inspect, Escape must close only the confirmation. Both Dialogs receive the same Escape.
- **Controls:**
  - Escape / backdrop on the deactivate confirm: setDeactivateConfirmEffectId(null) (card-actions.tsx:703-708)
  - Escape on the inspect Dialog (fires in the same keypress): closeInspectDialog clears only the pending confirm when one exists and returns, so the inspect stays open (card-actions.tsx:153-159)
  - Second Escape: closes the inspect (close() also resets consume and confirm state and setDialog(null))
  - Confirm deactivate (inside the confirm): onDeactivatePersistent(effectId). Free action on your turn
- **States:**
  - inspect only
  - inspect plus confirm (stacked)
  - canDeactivateInspect is false (Shield, Sentence, not your turn, not your active): no deactivate entry
- **Keep:**
  - One Escape peels one layer here: the confirm closes and the inspect remains (test 'keeps inspect open when Escape dismisses deactivate confirm (Lot 69)')
  - Dismissing the confirm never sends a deactivate
- **Notes:** This is the only table layering guard against the non-stack-aware Escape. The lobby kit picker has a similar guard (Escape goes from preview back to the grid).

### `table-dialog-dismiss-map` — Table dialogs: what Escape and backdrop mean

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/table-leave-confirm.tsx`, `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/shop-dialog.tsx`, `apps/client/src/screens/table/unspy-dialog.tsx`, `apps/client/src/screens/table/table-chat.tsx`, `apps/client/src/screens/table/kit-inspect-dialog.tsx`, `apps/client/src/screens/table/opponent-reveal-dialog.tsx`, `apps/client/src/screens/illegal-action-dialog.tsx`, `apps/client/src/screens/how-to-play-dialog.tsx`
- **Purpose:** Per-dialog map of dismissal meaning on the live (and read-only finished) table. Apart from the claim picker and the ask-once Feedback, no table dismissal sends an intent.
- **Controls:**
  - Flag confirm (TableLeaveConfirm): Escape / backdrop / green Stay call onStay (no intent). Red Forfeit sends FORFEIT; Leave table / Skip the tutorial / Return home call leaveGame / requestLeave
  - Card 'actions' / target / consume / Regeneration quantity / Assassin multi-attack Dialogs: Escape / backdrop / Cancel call close() (clears consume and confirm state and setDialog(null)). No PLAY_CARD is sent
  - Inspect Dialog: Escape / backdrop close. Upgrade or deactivate are explicit buttons
  - Shop: Escape / backdrop / red Close call setDialog(null). Every buy or sell button sends its intent and then closes the Shop
  - Unspy: Escape / backdrop / Cancel reset the picked spy and close. Confirm sends CLEAR_SPY
  - Table chat: Escape / backdrop / Close / the chat icon call closeChat (marks every message seen, so the unread badge clears)
  - Incoming / Action log / Opponents chrome Dialogs: Escape / backdrop / Close call setChromeOpen(null). Opponents seat buttons close and open an inspect
  - Kit inspect and opponent reveal: Escape / backdrop / Close. 'Inspect card' in a reveal closes it and opens the card inspect
  - IllegalActionDialog: Escape / backdrop / OK call onDismissActionReject (clearActionReject, local only)
  - How to play ('?'): Escape / backdrop are 'dismiss' and do not mark it seen. Skip / Got it mark 'card-battle.v6.howToPlaySeen' (table.tsx:1803-1811)
- **States:**
  - chrome hide-and-restore: chromeOpen is kept while another modal is open (dialog, How to play, leave confirm, kit or opponent inspect, action reject, sub-choice). The chrome Dialog closes, then reopens once that modal clears (table.tsx:1023-1040)
  - chrome Dialogs only exist when the felt collapsed that zone (collapse.incoming / actionLog / opponents)
  - readOnly finished board: intents are no-ops, but Shop, inspect and log dismissal still work
  - walk-in spectator: the flag means Stay / Leave. A claim picker may sit on top
- **Keep:**
  - Every confirm defaults to the safe outcome on Escape or backdrop: Stay on forfeit / leave / skip tutorial, Cancel on card prompts (L43-05: 'Esc / overlay = Stay'; the first flag click never disconnects)
  - Initial focus in TableLeaveConfirm lands on Stay (no focusable in the body, Stay first in the actions row)
  - Closing table chat marks it read; the unread count is client-local
  - IllegalActionDialog unmounts when cleared, so no stuck AnimatePresence overlay blocks the table (L39-06)
  - Chrome Dialogs come back after an interrupting modal closes
- **Notes:** Table chat (Lot 70) and the deactivate confirm (Lot 69) are newer. Closing table chat with Escape loses any unsent text, because ChatLog's uncontrolled input unmounts with the Dialog.

### `table-shop-double-click-buy` — Shop tile double-click = instant buy

- **Files:** `apps/client/src/screens/table/shop-dialog.tsx`, `apps/client/src/screens/table/shop-dialog.test.ts`
- **Purpose:** Faster buying: a single click on a shared-card tile selects it for the footer Buy, and a double-click buys that tile at once and closes the Shop.
- **Controls:**
  - Single click on a tile: setBuyCardId(id) (selection only, aria-pressed)
  - Double-click on a tile: if the tile is enabled and affordable, onBuyCard(id) (BUY_CARD) and then onClose() (shop-dialog.tsx:282-288). The two click events before it also select the tile
  - Footer orange 'Buy': buys the selected card (in the tutorial's shop-absorber step, the selection is forced to Absorber)
- **States:**
  - disabled tiles (not your turn, or actionsLocked): no events, so a double-click does nothing
  - unaffordable (faded, aria-label adds ', cannot afford'): a double-click is ignored
  - tutorial highlight shop-absorber: the footer Buy targets Absorber, but a double-click on another affordable tile still sends BUY_CARD for that tile, which the server rejects with 'tutorial-follow-coach'
- **Keep:**
  - The double-click instant buy exists and is tested ('keeps Buy / double-click / CostDisplay')
  - It obeys the same guards as the footer Buy (turn, actionsLocked, affordability)
  - After an instant buy the Shop closes, like every other Shop action
- **Notes:** This is the only double-click gesture in the client. There is no touch-specific equivalent; whether double-tap reliably fires dblclick on iOS Safari is unverified.

### `table-subchoice-wait-turn-strip` — Turn strip and table state while another seat resolves a sub-choice

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/timers.tsx`, `apps/client/src/App.tsx`, `apps/client/src/net/use-room-connection.ts`, `apps/client/src/screens/table/opponent-zone.tsx`, `apps/client/src/screens/table/economy-bar.tsx`, `apps/client/src/screens/table/sub-choice/sub-choice-constants.ts`, `apps/server/src/rooms/game-room.ts`, `apps/server/src/engine/turn/sub-choice.ts`, `packages/shared/src/protocol/state-view.ts`, `packages/shared/src/protocol/messages.ts`, `docs/agent/frontend.md`
- **Purpose:** This is all that seats other than the chooser see while `hasActiveSubChoice` freezes the table. That covers other living players, the eliminated victim, spectators and walk-ins. The Timers strip still reads '{active}'s turn' and counts down a stale turn deadline. Only the chooser gets the extra 'Choice: Ns' row (table.tsx:1103-1119 builds subChoiceLabel only from the POV's own `subChoice`; timers.tsx:152-179 renders it only when defined). No public field names the chooser: `SUB_CHOICE_REQUIRED` is unicast (messages.ts:394-404), and PlayingStateView has no pending-choice field (state-view.ts:297-353).
- **Controls:**
  - No control exists for the waiting state itself.
  - Usable by every seat during the wait: '?' How to play (setHowToPlayOpen), '!' Feedback (onOpenFeedback / setFeedbackOpen), Chat (TableChat → SEND_CHAT; canWrite = !readOnly), Forfeit flag (FORFEIT; handlePlayingForfeit is not gated by hasActiveSubChoice and can itself open forfeit reward picks), and the local inspect dialogs: own hand/specials/actives, pending chips, log rows, opponent kit/reveal. Collapsed-felt chrome buttons Open log / Open opponents / Open incoming also work.
  - Off-turn seats: Draw, Shop and Unspy are disabled (economy-bar.tsx:56 `disabled = !isMyTurn || actionsLocked`). Card dialog Use/Upgrade/Sell are disabled when !isMyTurn (frontend.md:348-349).
  - Active seat that is not the chooser: `actionsLocked` stays false because its own subChoice is null (table.tsx:884), so Draw/Shop/card Use stay enabled. The room gate rejects any intent (game-room.ts:1815-1818) and IllegalActionDialog opens (see table-subchoice-gate-reject-copy).
  - Chooser only: an extra 'Choice: Ns' label plus an orange 'Sub-choice timer' progressbar in Timers (ratio against CLIENT_SUB_CHOICE_MS = 40 s), and the SubChoiceHost dialog (table.tsx:1783-1796). Both are inventoried with the sub-choice panels.
- **States:**
  - Chooser is the active seat (Mirror, Card Thief steal-pick, Card Absorber pool-pick, Card Transformer special-pick, own fifth-slot drop, Curse slot drop on a victim): others see the right seat named and a wrong clock.
  - Chooser is off-turn (kill rewards, forfeit picks, Reanimation+ kit): the heading and the seat glow (opponent-zone.tsx:169-181 `isActiveSeat = currentTurnPlayerId === player.id`) stay on the active seat. That seat may already be eliminated: the turn pointer sits on the dead seat until rewards drain (frontend.md:589-590).
  - Stale clock: applyTurnResult clears the server turn timer (game-room.ts:2225-2229), but clearTurnTimer (3967-3972) never resets turnDeadlineMs, and no turnStarted is sent while the choice is open. Every non-chooser's countdown (App.tsx:181 `lastTurnStarted?.deadlineMs ?? view.turnDeadlineMs`) therefore runs to '0s' with a red bar and sits there for up to SUB_CHOICE_MS (40 s). It looks exactly like an expired turn.
  - Active seat disconnected: the strip shows 'Paused — reconnecting' (table.tsx:986-997). This is the only wait the strip explains. A disconnected off-turn chooser shows only its seat ConnectionBadge.
  - Active seat absent with no deadline: 'Absent — auto-draw'.
  - Tutorial: no turn timer (label '—'). The scripted bot answers sub-choices inline, so there is no visible wait.
  - Bot chooser: answers inline (bot-driver.ts handleRewardChoice etc.), so the wait is near zero.
  - Spectator, walk-in or eliminated POV: same strip, actions locked, nothing extra.
  - A walk-in who claims a disconnected seat that holds an open prompt gets it resynced (game-room.ts resumeTimersOwnedBy / resyncSubChoiceRequiredFor).
  - Wait ends: a new turnStarted (the client also clears its own subChoice, use-room-connection.ts:291-298), a stateUpdate, or gameOver.
- **Keep:**
  - Sub-choice prompts are a unicast `subChoiceRequired` / `resolveSubChoice` pair discriminated on `kind` (technical spec v4 §4.4 / L20-18; messages.ts:46-54, 313-344). Protocol and visibility are frozen for V7.
  - One table-wide gate: while any sub-choice is open, every turn action from any seat is rejected (engine/turn/sub-choice.ts:23-31 hasActiveSubChoice; game-room.ts:1815).
  - Timer display is cosmetic: trust server turnDeadlineMs / turnStarted.deadlineMs and never a client-only countdown as authority. Show paused copy when the active seat is disconnected (frontend.md:507-509; L9-01).
  - The client keeps a single `subChoice`, cleared on confirm, turnStarted or gameOver (use-room-connection.ts:291-330, 662-665). Lock other actions while it is open and when POV is eliminated (table.tsx:884; frontend.md:586-591).
  - Chat, Forfeit, How to play, Feedback and every inspect dialog stay usable during any wait.
  - Zero rule logic on the client (frontend.md:487).
- **Notes:** The mechanism predates Lot 61 (L12-07 timers, L20-18 sub-choice factoring, L30-03 host). Adjacent defect V7's clock will meet: the turn progress ratio divides by a hard-coded 60_000 ms (table.tsx:1004). Lot 70 lets the host set 5–180 s, but PlayingStateView carries no turn-length field (lobbyRules exists only on the lobby view), so the bar is wrong on any non-60 s table.

### `table-subchoice-wait-kill-rewards` — Waiting on other seats' kill or forfeit reward picks (simultaneous pickers) · `Lot 62+`

- **Files:** `apps/server/src/rooms/game-room.ts`, `apps/server/src/engine/turn/elimination-rewards.ts`, `apps/server/src/engine/turn/perform-action.ts`, `packages/shared/src/protocol/reward-choice.ts`, `packages/shared/src/protocol/state-view.ts`, `apps/client/src/action-log/action-log.ts`, `apps/client/src/screens/table/sub-choice/reward-panel.tsx`, `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx`, `apps/client/src/screens/illegal-action-copy.ts`, `apps/client/src/screens/table/opponent-zone.tsx`, `docs/agent/decisions.md`, `docs/spec_bataille_des_cartes_en.md`
- **Purpose:** Rewards are owed after a combat elimination (every living lethal contributor gets two picks, L69-01) or after a Forfeit / mid-game leave (each living player with an attack queued on the forfeiter, L71-01). Every paid human gets the reward picker at the same moment, on one shared 40 s countdown (game-room.ts:2887-2961 beginRewardTimer / sendOpenRewardPrompts). Nobody else sees anything showing that picks are in progress, or who is picking. That includes the victim, the interrupted active seat and spectators.
- **Controls:**
  - Non-choosers: none beyond the global controls (chat, forfeit, help, inspect).
  - Chooser (inventoried with RewardPanel): two picks → RESOLVE_SUB_CHOICE {kind:'elimination-reward', eliminationId, choices:[RewardChoice, RewardChoice]}.
  - Forfeit flag (FORFEIT) or leaving the table mid-game opens the forfeit variant (game-room.ts:914-985). A second forfeit while a queue is open adds jobs onto the countdown already running (sendOpenRewardPrompts).
  - Interrupted active seat during forfeit picks: Draw/Shop/cards stay enabled, and sending gets 'Rewards pending — Claim your elimination rewards first, then continue playing.' (illegal-action-copy.ts:70-73). That copy is wrong for a seat that has no reward.
- **States:**
  - Victim died on their own turn: the turn pointer and active-seat glow stay on the dead seat, the heading reads '{dead}'s turn', and the clock is stale or at 0s (rewards are raised before advanceTurn: perform-action.ts:1408-1424; resumeAfterRewards in elimination-rewards.ts:820-895).
  - Forfeit by a non-active seat while another living seat holds the turn: the server clears the turn timer and sets suppressTurnAdvanceAfterRewards (game-room.ts:957-969). That seat's on-screen clock keeps draining to 0 although it cannot act. When the picks end it keeps the turn and gets a fresh full clock plus turnStarted (continueAfterRewards with turnAdvanced:false).
  - The forfeiter was the active seat: the pointer stays on the forfeited seat until picks end, then the turn advances.
  - Several human pickers at once: each gets its own prompt with the same deadlineMs. A card one picker takes is gone for the others; on a failed pick the server re-sends availableCards (game-room.ts:2167-2183).
  - A picker who already submitted: their own dialog closes immediately (resolveSubChoice clears subChoice locally), and while others still pick, that seat sees nothing either.
  - Partial progress: a public opaque log line '{eliminator} claims elimination rewards from {eliminated}' appears for each claimant as they finish (action-log.ts:446-451; RewardsClaimedLogEntry state-view.ts:497-506).
  - Bots answer inline once they are the head. A bot queued behind a human head waits for that human.
  - Human picker with no live client: not prompted, and defaults to 2×4 lives at the shared deadline. If the head picker disconnects, the reward timer pauses until they reconnect or go absent (game-room.ts pauseTimersOwnedBy).
  - Nobody is paid, so there is no wait: no queued attack on the forfeiter, only Poison, only Thief / Imposition / Sentence / Curse pending, or an elimination by turn timer or inactivity.
  - A forfeit that leaves one player: that player wins with no prompt and Game over follows.
  - Final elimination in a 2-player game: no rewards, straight to Game over (frontend.md manual check step 6).
  - Dead seat has an armed Reanimation+: the kit pick follows serially after the queue drains (see table-subchoice-wait-reanimation-kit).
- **Keep:**
  - Reward picks stay opaque in the public log (L9-02). Only rewardsClaimed (eliminator + eliminated) is public, and only after each claim.
  - Everyone owed rewards picks at the same time on one shared countdown. The countdown defaults every remaining picker when it fires, and a later seat never gets a deadline that has already passed (decisions.md 2026-10-06 'Lot 71 shared reward deadline').
  - Default on expiry is 2×4 lives for humans; bots use their policy.
  - One reward per player, not per queued card. Order is fewest lives, then fewest points, then a seeded draw. Picks happen before the forfeiter's cards dump to the pool. Active Poison does not pay (rules spec forfeit paragraph; decisions.md 2026-10-06 Lot 71 entries).
  - After forfeit picks, the interrupted living seat keeps its turn (Lot 71, suppressTurnAdvanceAfterRewards / turnAdvanced:false).
  - Each player who actually receives forfeit rewards is credited one kill on the Game over recap (Lot 71).
  - Lock table actions when POV is eliminated. The turn pointer may still sit on the dead seat until rewards finish (frontend.md:589-590).
- **Notes:** The basic reward pause predates Lot 61 (Lot 6, L20-18). The parts that make this wait longer and harder to read are post-Lot 61: every lethal contributor is paid (L69-01), forfeit and leave payouts exist, and pickers run in parallel on a shared deadline (L71-01). playerEliminated carries a single eliminatorPlayerId (null for 'leave'), so the set of pickers cannot be derived from public data.

### `table-subchoice-wait-slot-drop` — Opponent choosing which of your active cards to drop (Curse), and the active seat's fifth-slot drop · `Lot 62+`

- **Files:** `packages/shared/src/protocol/messages.ts`, `apps/server/src/engine/specials/reconcile-slot-cap.ts`, `apps/server/src/engine/specials/slot-drop.ts`, `apps/server/src/engine/turn/perform-action.ts`, `apps/server/src/rooms/game-room.ts`, `apps/client/src/screens/table/sub-choice/slot-drop-panel.tsx`, `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx`, `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/screens/table/opponent-zone.tsx`, `docs/spec_bataille_des_cartes_en.md`, `docs/agent/decisions.md`
- **Purpose:** When an activation would open a fifth active slot, the activating (active) seat picks one slot to drop or cancels. When Curse lands on an opponent who already has four actives, the Curse user picks which of the victim's slots to remove. The chooser is the actor and the slot owner is the Curse target (reconcile-slot-cap.ts:58-104 `slotOwnerForCardPlay`; payload SlotDropChoiceRequiredPayload.slotOwnerPlayerId, messages.ts:323-334). The slot owner, whose card is about to be removed, gets no payload and no UI.
- **Controls:**
  - Victim and other seats: none. The victim can still open their own actives through onSelectActive inspect.
  - Chooser (inventoried with SlotDropPanel): tap a slot tile → RESOLVE_SUB_CHOICE {kind:'slot-drop', slotId}. The red Cancel button sends {kind:'slot-drop', cancel:true} (human only, commit 468e0b8).
- **States:**
  - Victim view: the log shows the Curse play naming them as target, because actionPlayed is broadcast at play time before the prompt (game-room.ts:2224-2265, then 1886-1912). The strip reads '{caster}'s turn' with a stale clock. Nothing says their actives are being chosen from.
  - Chooser drops a slot: the slot is cleared (a dropped shield goes to 0; a Sentence countdown is cancelled). completeSlotDrop builds and logs a second actionPlayed for the activated card, without targetPlayerId (perform-action.ts:1063-1079).
  - Chooser cancels: the card returns to hand or specials and no cancel line is logged, so the earlier 'plays …' line stays. The actor gets a fresh full turn clock and turnStarted (game-room.ts:2609-2621).
  - Timeout (40 s): the oldest droppable active is dropped. Curse is never listed as droppable.
  - Bot chooser: botDriver.handleSlotDropChoice answers inline (game-room.ts:2649-2665).
  - Chooser disconnects: the slot-drop timer pauses and resumes on reconnect (resumeTimersOwnedBy).
  - Chooser goes absent after grace: onReconnectGraceExpired sends every non-pool subChoice to onSpecialTimeout (game-room.ts:4016-4025). That handler returns early for kind 'slot-drop' (2794-2800), so the table may freeze indefinitely with no UI for anyone. Plausible, not reproduced.
  - Another seat that sends an action during a slot-drop gets the room gate's fallthrough code 'finish-elimination-rewards'. 'finish-slot-drop' exists (action-reject.ts:19; illegal-action-copy.ts:54-57), but subChoiceGateReject never returns it (game-room.ts:5075-5097).
- **Keep:**
  - Maximum of 4 active slots. The pick is a drop list or Cancel. On timeout the oldest droppable is dropped. Only a human may cancel (rules spec 'Active slots (max 4)'; decisions.md 2026-10-05 Lot 69; commit 468e0b8).
  - Curse case: the Curse user picks the victim's slot. Forced picks never list Curse. The payload carries slotOwnerPlayerId (PROTOCOL_VERSION 44), and the chooser's expiry hint names the victim (sub-choice-host.tsx slotDropExpiryHint).
  - The prompt is unicast to the chooser; the victim receives nothing (protocol and visibility frozen).
  - Bots never deactivate voluntarily; their only fifth-slot pressure is the forced pick on play (decisions.md Lot 69).
- **Notes:** Introduced by Lot 69 (PROTOCOL_VERSION 43 slot-drop; 44 Curse chooser + slotOwnerPlayerId) and the 2026-10-07 cancel fix. This is the only sub-choice where a hidden pick acts directly on a third seat's board.

### `table-subchoice-wait-active-seat-picks` — Active seat resolving a Mirror, Card Thief, Card Absorber or Card Transformer pick

- **Files:** `apps/server/src/rooms/game-room.ts`, `apps/server/src/engine/turn/perform-action.ts`, `apps/server/src/engine/turn/steal-choice.ts`, `apps/server/src/engine/turn/generic-sub-choice.ts`, `apps/server/src/engine/turn/orchestrate-turn.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/action-log/action-log.ts`, `apps/client/src/screens/table/sub-choice/mirror-panel.tsx`, `apps/client/src/screens/table/sub-choice/steal-pick-panel.tsx`, `apps/client/src/screens/table/sub-choice/pool-pick-panel.tsx`, `apps/client/src/screens/table/sub-choice/special-pick-panel.tsx`
- **Purpose:** The acting seat plays a card that needs a follow-up pick: a Mirror redirect, a Card Thief steal-pick (the thief picks at play: steal-choice.ts:42-80), a Card Absorber pool-pick or a Card Transformer special-pick (generic-sub-choice.ts). Other seats already see the play in the log. Nothing tells them a pick is pending or how long it can last.
- **Controls:**
  - Non-choosers: none beyond the global controls.
  - Chooser panels (inventoried elsewhere): RESOLVE_SUB_CHOICE kinds 'mirror', 'steal-pick', 'pool-pick', 'special-pick'.
- **States:**
  - Others see the 'plays Mirror / Card Thief / Card Absorber / Card Transformer' line first (applyTurnResult logs and broadcasts before handleAction arms the prompt, game-room.ts:2224-2265 then 1856-1912). The heading reads '{active}'s turn' with a stale clock.
  - Mirror: the outcome appears later as a mirrorRedirected line, and the pending chip retargets.
  - Card Thief: the victim sees the play aimed at them, not which card is being picked.
  - Card Absorber: the pool shrinks after the pick. Card Transformer: the special appears afterwards, visible only to Spy viewers.
  - Active chooser disconnected: the strip shows 'Paused — reconnecting'. Mirror / steal / pool / special timers pause, and absent-after-grace defaults Mirror, steal, pool and special (game-room.ts:4003-4025).
  - Timeouts: a random eligible redirect, card, pool cards or special.
- **Keep:**
  - Mirror play cost is deferred until the redirect resolves (perform-action.ts comment 'playtest 2026-08-09').
  - Mirror always finishes before any reward can be enqueued from the same turn (orchestrate-turn.ts:144-148).
  - The thief chooses at play time; the card is consumed while the pick is pending (steal-choice.ts header).
  - Prompts are unicast; no public field.

### `table-subchoice-wait-reanimation-kit` — Eliminated seat choosing a Reanimation+ kit

- **Files:** `apps/server/src/engine/turn/elimination-rewards.ts`, `apps/server/src/engine/turn/generic-sub-choice.ts`, `apps/server/src/rooms/game-room.ts`, `packages/shared/src/protocol/state-view.ts`, `apps/client/src/screens/table/flow-status-badges.tsx`, `apps/client/src/screens/table/opponent-zone.tsx`, `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/action-log/action-log.ts`, `apps/client/src/screens/table/sub-choice/reanimation-kit-panel.tsx`
- **Purpose:** After the reward queue drains, a seat eliminated while holding an armed upgraded Reanimation picks its new kit: 40 s, random on expiry (elimination-rewards.ts:693-719; game-room.ts:2826-2885). The public field `pendingReanimation: {isUpgraded}` exists 'so the table knows the match is not over' (state-view.ts:159-164). The opponent seat renders FlowStatusBadges only for living seats, though (opponent-zone.tsx:224-226), and the reanimating seat is still `isEliminated`. So other seats never see the 'Reanimating' badge (flow-status-badges.tsx:42-44).
- **Controls:**
  - Non-choosers: none.
  - Chooser (inventoried elsewhere): ReanimationKitPanel → RESOLVE_SUB_CHOICE {kind:'reanimation-kit', kitId}.
- **States:**
  - Others: a dead seat with no badge, the pointer possibly on it, a stale clock. Then a '{nickname} returns' log line; the kit is omitted in-game (action-log.ts:443-445; L50-03).
  - Reanimating POV: a 'Reanimating' badge on their own zone (private-zone.tsx:156) plus the kit picker.
  - Base Reanimation: no pick; a seeded random kit is applied immediately.
  - Serial with rewards, never in parallel; at most one kit pick open at a time.
  - The chooser is eliminated, so a disconnect does not pause this timer (game-room.ts:768-770 returns early for eliminated seats).
  - A forfeit while a kit pick is open re-arms the kit timer (game-room.ts:982-988).
- **Keep:**
  - The upgrade lets the player choose the reanimation kit instead of a random draw (rules spec Reanimation).
  - The in-game log never shows the revived kit; the Excel export still carries it (state-view.ts PlayerReanimatedLogEntry; L50-03).
  - pendingReanimation is public for every seat.
  - Reanimation clears Spy relations in both directions (L68-08).

### `table-subchoice-gate-reject-copy` — Reject dialog when a non-chooser acts during someone else's sub-choice

- **Files:** `apps/server/src/rooms/game-room.ts`, `packages/shared/src/protocol/action-reject.ts`, `apps/client/src/screens/illegal-action-copy.ts`, `apps/client/src/screens/table.tsx`
- **Purpose:** This dialog is the only feedback a blocked seat gets today about a sub-choice held by another seat. The room gate runs before the turn and already-acted checks (game-room.ts:1815-1818), so its finish-* code wins. The copy is written for the chooser.
- **Controls:**
  - IllegalActionDialog (table.tsx:1798): OK, Esc or a click on the overlay dismisses it (onDismissActionReject).
- **States:**
  - Reached mainly by the living active seat that is not the chooser: forfeit picks during its turn, or kill rewards while the pointer sits on a living seat. Off-turn seats have Draw and card actions disabled, so they rarely reach it.
  - Copy shown: 'Rewards pending — Claim your elimination rewards first, then continue playing.' or 'Mirror pending — Finish your Mirror choice first…' (illegal-action-copy.ts:38-73). It addresses the reader as the chooser.
  - Slot-drop has no case in subChoiceGateReject and falls through to finish-elimination-rewards (game-room.ts:5075-5097).
- **Keep:**
  - The server revalidates every action; a greyed-out button is not validation (AGENTS.md golden rule 8).
  - Every ActionRejectCode keeps client copy (ILLEGAL_ACTION_COPY is an exhaustive Record, checked by its test).
- **Notes:** Without any protocol change the client can tell it is not the chooser, because its own `subChoice` is null. V7 could therefore swap in 'Another player is choosing…' copy for finish-* codes as presentation only.

### `table-chat-side-stream-disclosure` — Table chat popup: living vs eliminated/spectator streams · `Lot 62+`

- **Files:** `apps/client/src/screens/table/table-chat.tsx`, `apps/client/src/screens/table/chat-log.tsx`, `apps/client/src/screens/table/chat-unread.ts`, `apps/client/src/screens/table.tsx`, `apps/server/src/protocol/build-view-for.ts`, `apps/server/src/rooms/game-room.ts`, `packages/shared/src/protocol/table-chat.ts`, `packages/shared/src/release-notes.ts`, `docs/agent/frontend.md`
- **Purpose:** The chat control in the turn strip opens a modal transcript. Living players read and write the living stream. Eliminated players and walk-in spectators read both streams and write to the side stream. The composer looks the same for every role, and living players get no in-table sign that a side stream exists.
- **Controls:**
  - Chat IconButton in the turn strip, right of Timers and left of the Forfeit / Leave flag. aria-label is 'Chat' or 'Chat, N unread'. Clicking opens the Dialog. If the Dialog is already open, it closes it and marks everything seen
  - Unread badge: red pill (bg-cta-red, white 10px number) at the icon's top-right corner, pointer-events-none, shown only when unread > 0
  - Dialog titled 'Chat' (max-w-md, focus trap, aria-modal, pinned to the visual viewport). The orange compact 'Close' button, Esc and an overlay click all call closeChat, which sets seenCount to the current length
  - Composer inside the Dialog (same ChatLog as the lobby): 'Message' input with maxLength 200 and 16px text, Enter or 'Send' sends SEND_CHAT { body }, and the form resets right away
  - Scrollable transcript (h-52), which jumps to the newest line on every change
- **States:**
  - Living player (any turn, own turn or off turn; chat is not turn-gated): receives only living lines, writes as living. No hint of the side stream except the 'lot-71' What's new line saying eliminated players and spectators share a separate chat
  - Eliminated player (selfEliminated, including after Forfeit and Stay): receives both streams, writes as 'eliminated'. Their own lines show gray italic with ' (eliminated)'. Nothing before sending says living players will not see it
  - Walk-in spectator (walkInSpectator, including the claim-picker fog): receives both streams, writes as 'spectator'. canWrite is !readOnly, so it is true
  - The moment of elimination: the view switches from living-only to both streams, so every earlier side line appears at once. The array grows, so with the popup closed the badge jumps by the number of earlier side lines, not just new ones
  - A walk-in claims a living seat mid-game (handleClaimSeat): the reader becomes living and the array shrinks. chatUnreadCount is count-based (Math.max(0, length - seenCount)), so the badge stays hidden until the new length passes the old seenCount. New living lines go unannounced
  - Side lines (role not 'living') render as text-sm italic text-ink-muted with a non-italic '(role)' suffix. Living lines render in normal ink
  - Nickname color: seatIndexOf over view.players, which is in turn order after the seeded shuffle in create-initial-state.ts, so a lobby line's color can change when the match starts. Senders not at the table fall back to '#4a5d6e'
  - Empty: 'No messages yet.'
  - Tutorial: the chat icon still renders in the turn strip and the server accepts messages (inGame is true), but the only other seat is a bot, so nobody else reads them
  - Solo Classic: only bots besides the human. Bots do not chat
  - Rejection (too long, empty or malformed): copy from illegal-action-copy.ts ('A chat message is at most 200 characters.' and so on) through the table's action-reject path. The draft is already cleared
  - Disconnected: the send does nothing because there is no room, and the input still clears
- **Keep:**
  - Rules spec §6 Chat: living readers see only living lines. Eliminated players and spectators can write, their lines are labeled, and only they can read them. They can still read the living stream
  - Per-recipient filtering happens in buildPlayingViewFor (readerIsEliminated = selfPlayer.isEliminated, readerIsSpectator = walkInSpectator), never as a filtered broadcast (golden rule 4). Test: build-view-for.test.ts 'buildPlayingViewFor (Lot 70) — chat streams'
  - Role is frozen at send time. A line written while living stays 'living' after the author dies (decisions 2026-10-06 Lot 70)
  - The control sits next to Forfeit, and the unread count is client-local: messages that arrived since the popup was closed (decisions 2026-10-06 Lot 70; frontend.md turn strip order: ? then !, then timers, then Chat, then flag)
  - Fixed-height popup that scrolls to the newest line. Each line is the round (or 'Lobby') and the seat-colored nickname. Side lines stay gray italic and labeled (frontend.md)
  - Round stamp: tableRound(turnSequence, seatCount), the same count as the action log
  - At most 200 characters. Bots cannot send. The server revalidates every send (golden rule 8)
- **Notes:** Every role uses the same ChatLog. The only role cue is on lines already sent. A redesign could add a composer caption per role (for example, telling eliminated players and spectators that only they will see the message) without changing any rule. A living-side indicator that side lines exist, especially a count, would leak who is talking at the table, so it needs a designer decision.

### `global-activated-art-guard` — Activated-art safety guard (Sentence chip and inspect never request activated art) · `Lot 62+`

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/sentence-chip.tsx`, `apps/client/src/screens/table/card-actions.tsx`, `apps/client/src/screens/table/private-zone.tsx`, `apps/client/src/screens/table/opponent-zone.tsx`, `apps/client/src/screens/table/active-display.ts`, `packages/shared/src/domain/special-card-catalog.ts`, `docs/agent/frontend.md`
- **Purpose:** Keeps the table from blanking when an inspect or thumb would ask asset-lookup for art that does not exist. Sentence has no activated PNG, so a request for it throws. The client has no error boundary, so one throw unmounts everything.
- **Controls:**
  - Sentence chip (thumb button beside the caster, own seat and opponents): click → onInspectSentenceChip opens the inspect Dialog with source 'active' and catalog art, without `activated` (L65-03)
  - Active persistent thumb click → onInspectActive opens the inspect Dialog with activated: true and the counter
  - Combat Shield active thumb click → inspect with activated: false
  - Inspect Dialog Card: activated is applied only when dialog.activated === true AND cardId is in CARDS_WITH_ACTIVATED_ART
- **States:**
  - Sentence chip: thumb at catalog base or upgraded art, with the remaining owner turns in red below. Not card-lives
  - Sentence inspect: catalog face + CardEffectCopy + 'Active'. With 1 upgrade point the same Dialog offers Upgrade (frontend.md L65 playtest note: 'Ada upgraded a card', chip stays at 3)
  - Shield active: base or upgraded art, no counter badge
  - Persistent actives (imposition, points-generator, poison, curse, super-absorber, invisibility, roulette): activated art + card-lives or turns badge
- **Keep:**
  - Never request activated art for Sentence or Shield (table.tsx comment 'Sentence has no activated PNG. Requesting it throws and blanks the table.'; sentence-chip.tsx and active-display.ts headers)
  - The inspect Dialog gates activated art with CARDS_WITH_ACTIVATED_ART (card-actions.tsx, 2026-09-28)
  - The ticking Sentence chip is a button that opens catalog inspect, including the upgrade tier (L65-03 acceptance)
  - Own kit-row and opponent active thumbs pass activated: true for every activePersistentEffects entry with no guard. This is safe only while every PERSISTENT_SPECIAL_CARD_IDS card has activated art. A new persistent needs activated PNGs or a guard
- **Notes:** The guard and the Sentence inspect wiring landed in commit 0c81fa2 (2026-09-28, the L65-03 / L66-01 pass). The Sentence chip itself dates from the designer 2026-09-20 playtest (L63-05 public pendingSentences). A V7 redesign should add a top-level error boundary or make the art lookup non-throwing for render paths (as the FX code already does with try/catch → verso). That would be a behavior addition, so it needs a decision.


## Game over

### `play-again-to-lobby` — Play again: reform the lobby or reseed the solo menu

- **Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/end.tsx`, `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/screens/solo-menu-seed.ts`, `apps/server/src/rooms/game-room.ts`
- **Purpose:** Rematch in the same room and code, carrying over rules, bots, kit picks and the chat transcript.
- **Controls:**
  - Game over 'Play again' (green): Classic only and not for walk-ins. Ask-once feedback first if this gameCode was not asked (playAgainPending), then: one human seat leaves and reopens the solo menu seed; two or more humans send playAgain
- **States:**
  - first opt-in reforms the lobby; others stay on the finished board (recapSeats) until they press Play again
  - host becomes the original match host if they opted in, else the first opted-in human in prior seat order
  - seats reset to unready; bots persist; walk-in spectators become unready guests while seats are free
  - rules, turn-time override, kit picks and chat transcript persist
  - tutorial: no Play again; play-again-tutorial reject
  - rejects: play-again-not-finished, play-again-tutorial
- **Keep:**
  - Same room and code; the first Play again does not yank other recap views (L57-10)
  - Ask-once then rematch; Return home still leaves (L57-12)
  - Walk-ins become lobby guests (L57-14)
  - Play again keeps the rules (Lot 70) and the chat (decisions 2026-10-06)
  - Solo (exactly one human) reopens the solo menu instead (L67-01)
- **Notes:** L67-01 and Lot 70 changed what carries over; the core flow is L57.

### `finished-board-readonly` — Finished board (read-only table)

- **Files:** `apps/client/src/screens/end.tsx`, `apps/client/src/screens/table.tsx`
- **Purpose:** The frozen finalTable under the closable Game over dialog.
- **Controls:**
  - Stats (economy bar): reopens Game over
  - Flag: Return home confirm, then requestLeave
  - '!': parent feedback
  - Shop browse
  - Every inspect
  - Chat read-only
  - Action log
- **States:**
  - Every intent locked
  - Deadline null
  - won / dead banner on first paint
  - Same per-recipient visibility as a live view (PROTOCOL 24)
- **Keep:**
  - Inspect, log and Shop browse stay available (PROTOCOL 24)
  - Feedback, stats and '!' never stack (L47-03)
  - The chat transcript is the snapshot from that game's end and cannot send
- **Notes:** Reads view.finalTable (a PlayingStateView), youWon. The noop handlers come from end.tsx.

### `end-action-log-export` — Download action log (Excel)

- **Files:** `apps/client/src/export/build-action-log-xlsx.ts`, `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/screens/game-over-copy.ts`, `apps/client/src/screens/admin/admin-game-detail-dialog.tsx`
- **Purpose:** Builds a two-sheet .xlsx (Turns, Events) from FinishedStateView.exportLog with full, unfogged data.
- **Controls:**
  - Game over Dialog button 'Download action log' (busy label 'Building Excel…'), rendered only when import.meta.env.DEV (showActionLogDownload)
  - Admin game detail 'Download action log' (admin surface, Lot 61)
- **States:**
  - Busy, error text (exception message or 'Export failed'), success → file '{gameCode}-action-log.xlsx'
- **Keep:**
  - DEV-only on the player Game over in every mode (spec v6 §5.4 Excel)
  - exportLog stays full (pool buys, Draw payouts, real nets, reanimation kit)
- **Notes:** Lot 19 builder; admin reuse is Lot 61.

### `end-finished-board-shell` — Finished board (EndScreen over a read-only TableScreen)

- **Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/end.tsx`, `apps/client/src/screens/end-feedback.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/table-banner.ts`, `apps/client/src/screens/table/economy-bar.tsx`, `apps/client/src/screens/table/table-flag-intent.ts`, `apps/client/src/screens/table/table-leave-confirm.tsx`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/help/select-hint.ts`, `packages/shared/src/protocol/state-view.ts`
- **Purpose:** When view.phase === 'finished', App renders EndScreen. It shows the frozen per-recipient `finalTable` as a board you can inspect but not act on, under the closable Game over dialog. EndScreen owns the only FeedbackDialog, so stats, the ask prompt and the `!` form never stack.
- **Controls:**
  - Automatic: TableBannerFlash shows 'You won!' (POV win) or 'You are dead' (POV elimination edge) for TABLE_BANNER_MS = 1600 ms. A setTimeout in end.tsx then opens the Game over dialog.
  - Turn strip `?` IconButton (aria-label 'How to play') opens HowToPlayDialog.
  - Turn strip `!` IconButton (aria-label 'Feedback') calls onOpenManualFeedback. It opens the manual form only when stats are closed and no form is open.
  - Economy bar purple 'Stats' Button (rendered only when readOnly and onShowStats are set) reopens the Game over dialog. It does nothing while Feedback is open (canReopenEndStats).
  - Corner flag (aria-label 'Return home') opens TableLeaveConfirm: title 'Return home?', body 'Leave this finished game and go back to the home screen.', green 'Stay' and red 'Return home'. Esc or overlay = Stay. Confirm calls EndScreen.requestLeave (ask-once, then leaveGame).
  - Draw / Shop / Unspy dock is locked (actionsLocked = readOnly). Every intent callback is a noop in end.tsx.
  - Inspect stays live: action log panel, opponent seats and reveal, pending queue chips, kit and card inspect, collapsed-felt buttons (Incoming / Action log / Opponents).
  - Read-only chat button (see end-finished-chat-readonly).
- **States:**
  - Banner period (first 1.6 s): the dialog is closed. `!` may open the manual form, and stats then wait until that form closes (isEndStatsOpen requires !feedbackOpen).
  - Stats open / stats dismissed / Feedback open, mutually exclusive and derived in end-feedback.ts.
  - readOnly: no first-game hints (shouldShowFirstGameHints returns false when readOnly). No tutorial Look gate. No turn countdown (deadlineMs null). The Timers strip still shows the game code and the connection statusLabel (for example reconnecting).
  - Finished prompt card in the prompts slot: 'Game over' / 'Inspect the final board. Open Stats for the recap, or use the flag to return home.'
  - POV won (povWon banner). POV eliminated. Walk-in spectator (view.isSpectator): no Play again, and recap kits may be fogged.
  - actionReject renders the IllegalActionDialog (for example 'Play again is only available after the game ends.' or 'The tutorial cannot play again in this room.').
  - Tutorial finished (playKind 'tutorial'): same board; the dialog title and CTA change.
- **Keep:**
  - The final board stays visible and inspectable under the stats dialog (PROTOCOL 24 finalTable; designer 2026-08-06).
  - Stats open only after the ~1.6 s win/death banner (L51-06), and never while Feedback is open (L47-03).
  - EndScreen owns a single FeedbackDialog. `!` is a no-op while stats or Feedback is open. Stats reopen is a no-op while Feedback is open (technical spec v6 §7.1, end-feedback.ts).
  - The finished board keeps the flag as Return home with a Stay confirm (designer 2026-08-21 follow-up, table-flag-intent.ts). The confirm goes through the requestLeave ask-once (L57-03).
  - Every intent is locked client side. The server stays authoritative (AGENTS golden rule 8).
  - The table Feedback control stays the 44px `!` icon. Never write the word Feedback on the felt, Incoming or the economy bar (L57-01 / technical spec v6 §2.2).
  - 'Stats' appears on the economy bar only on the finished board (economy-bar.tsx header comment).
- **Notes:** The finalTable keeps live visibility rules: Spy, elimination and walk-in overlay still apply to living seats (frontend.md End screen). App also renders ClaimSeatDialog alongside EndScreen (see open questions). TableScreen gets statusLabel, actionReject and onDismissActionReject from App through EndScreen.

### `end-game-over-dialog` — Game over / Tutorial complete stats dialog (container + action row)

- **Files:** `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/screens/game-over-copy.ts`, `apps/client/src/screens/game-over-copy.test.ts`, `apps/client/src/design/components/dialog.tsx`, `apps/client/src/design/components/button.tsx`
- **Purpose:** Closable recap dialog over the finished board: winner header, match meta line, award tiles, eliminations, and the hub / rematch / feedback actions.
- **Controls:**
  - Title: 'Game over' (classic) or 'Tutorial complete' (tutorial), from gameOverTitle(playKind).
  - Esc, overlay click (closeOnOverlayClick) or the orange 'View board' button call onStatsClose. The first close triggers the ask-once Feedback.
  - Orange 'Feedback' button calls onOpenStatsFeedback. It dismisses stats and opens the manual Feedback ticket in its place.
  - Green 'Play again' button, rendered only when showPlayAgain(playKind) is true (classic) and onPlayAgain is provided.
  - Red 'Return home' (classic) or 'Play a real game' (tutorial) button, from gameOverLeaveLabel. It calls requestLeave.
  - Purple 'Download action log' button, DEV builds only (see end-action-log-xlsx-download).
  - Footer order: [DEV Excel] · Feedback · View board · Play again · Return home.
- **States:**
  - Open / closed (driven by EndScreen).
  - Classic vs tutorial (title, CTA, Play again hidden on tutorial).
  - Walk-in spectator: onPlayAgain is omitted in App.tsx, so there is no Play again button.
  - DEV vs production (Excel button visibility).
  - Export busy: the button reads 'Building Excel…' and is disabled. An export error shows as role=alert text at the bottom of the dialog.
  - Panel max-w-3xl with a custom slate/kit surface mix background.
- **Keep:**
  - Dialog keeps its focus trap, Esc, overlay dismiss and aria-modal (dialog.tsx).
  - Tests lock the labels 'Play again', 'Feedback', 'Download action log', 'Tutorial complete', 'Play a real game' and 'Return home' (game-over-copy.test.ts).
  - Play again is Classic only. Tutorial keeps Play a real game (L57-12 / L45-06).
  - The Feedback button replaces stats with the form and never stacks with it (technical spec v6 §7.1, L47-03).
  - Any close of stats (View board / Esc / overlay) is the trigger for the first ask-once (L47-03 / L57-03).
- **Notes:** Lot 60 restyled the content into the awards gallery (L60-05). The action row predates Lot 61.

### `end-winner-header` — Game over winner header

- **Files:** `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/design/components/kit-portrait.tsx`, `apps/client/src/design/components/player-name.tsx`, `apps/client/src/design/seat-colors.ts`
- **Purpose:** Identifies the winner: kit portrait, seat color, nickname and kit name.
- **Controls:**
  - None (display only).
- **States:**
  - You won: the nickname gets the suffix ' (you)'.
  - Winner kit fogged for a walk-in whose claim picker is still open: recap kitId is omitted, so the portrait is a placeholder and the label reads 'Hidden kit'.
  - KitPortrait honours isEliminated from view.players.
  - Zone uses seatZoneStyle(index, {intensity: 'fill'}). Without a seat index there is no style (data-zone='game-over-winner').
- **Keep:**
  - Recap kitId is public at game over (final kit after Reanimation / Cloning), except for walk-ins with the claim picker open (L60-01 overrides L9-03; L57-16 fog still wins).
  - Seat-colored PlayerName for the winner.
  - The 'Winner' eyebrow label stays above the nickname.

### `end-match-meta-line` — Game over meta line (protocol · code · turns)

- **Files:** `apps/client/src/screens/game-over-dialog.tsx`, `packages/shared/src/protocol-version.ts`
- **Purpose:** Small muted line under the winner: `Protocol v{PROTOCOL_VERSION} · Code {gameCode} · {recap.turnSequence} turns`.
- **Controls:**
  - None.
- **States:**
  - Always rendered. PROTOCOL_VERSION is currently 45 (packages/shared/src/protocol-version.ts:109).
- **Keep:**
  - User (this session) approved removing the protocol version from this screen ('ok pour retirer v35'). V7 may drop the 'Protocol vN' segment.
  - The game code stays visible on the finished board through the Timers strip regardless.
- **Notes:** The hub already dropped its Protocol v footer in Lot 51 (frontend.md, Lot 51 gate). This line is the last player-facing protocol display. Whether 'Code' and the turn count stay is an open question.

### `end-awards-gallery` — Game over awards gallery

- **Files:** `apps/client/src/screens/game-over-awards.ts`, `apps/client/src/screens/game-over-awards.test.ts`, `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/design/components/resource-icon.tsx`, `apps/client/src/design/components/kit-portrait.tsx`, `apps/client/src/design/components/player-name.tsx`, `packages/shared/src/protocol/state-view.ts`
- **Purpose:** Seat-colored award tiles ranked from the public recap. Each tile shows a title, the winner faces (kit portrait, nickname, kit name) and a value.
- **Controls:**
  - None (display tiles, data-award-id per tile).
- **States:**
  - Empty: 'No awards this match.' (for example an immediate forfeit with every stat at 0).
  - Tie: one tile lists every co-winner face. The tile color comes from the first winner's soft seat zone.
  - An eliminated winner's portrait renders eliminated. Bot winners are allowed.
  - Fogged kit gives a placeholder portrait and the label 'Hidden kit'.
  - Value kinds: points (ResourceIcon point), lives (ResourceIcon life), upgrade (ResourceIcon upgradePoint), count (plain number), time (formatThinkTimeMs + ' s/turn', for example '4.2 s/turn' or '1m 5 s/turn').
  - Grid: 2 columns, sm 3, lg 4.
- **Keep:**
  - Fixed award order (17 ids): Most points spent, Most lives lost, Least lives lost, Most lives gained, Most points gained, Most upgrade points used, Most players killed, Most specials used, Most cards sold, Most cards bought, Slowest, Fastest, Most damage dealt, Fewest attacks, Most draws, Most attacks played, Most cards played (game-over-awards.ts).
  - Skip an award when every eligible seat is tied at 0 (L60-05).
  - Slowest / Fastest count humans only and need at least 2 humans. They rank by average think time per turn action (thinkTimeMs / turnActionsCount; #65), displayed as seconds per turn (L71 commit a9c3c17).
  - Bots compete for every non-clock award (L60-01).
  - Label 'Fewest attacks', never 'Pacifist' (L60-01; Lot 58 owns Pacifist for Invisibility).
  - No rule logic on the client: it only ranks public recap numbers, never parses exportLog (L60-05).
  - Kills come from the server (combat kills plus paid forfeit rewards per L71). The client does not recompute them.
- **Notes:** The per-turn average (#65, 2026-10-05) and the 's/turn' copy (L71) came after Lot 61. The gallery itself is Lot 60.

### `end-eliminations-list` — Game over eliminations list

- **Files:** `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/admin/admin-present.ts`
- **Purpose:** Compact list of recap eliminations with the reason and the eliminator.
- **Controls:**
  - None.
- **States:**
  - Empty: 'No eliminations'.
  - Row: '{nickname} eliminated ({reason}) by {eliminator}'. The 'by …' part is omitted when eliminatorPlayerId is null. Each row uses the eliminated seat's soft zone color (data-zone='game-over-elims').
  - Reason labels: Combat, Absent, Inactive, Left, Gambling (eliminationReasonLabel). Unknown reasons fall back to the raw id.
- **Keep:**
  - The heading 'Eliminations' and the reason wording match the admin labels (both read admin-present.eliminationReasonLabel).
  - Draw-bust deaths show 'Gambling' with no eliminator (L64-04).
- **Notes:** The 'gambling' reason came in Lot 64 (after Lot 61). The list itself is Lot 60.

### `end-play-again` — Play again (online rematch)

- **Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/end.tsx`, `apps/client/src/screens/end-feedback.ts`, `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/net/use-room-connection.ts`
- **Purpose:** Rematch in the same room and code for Classic tables with 2 or more humans.
- **Controls:**
  - Green 'Play again' calls requestPlayAgain. If this gameCode is not yet asked, it opens the ask-mode Feedback with playAgainPending, and Skip or a successful Send then calls onPlayAgain. If already asked, onPlayAgain runs immediately.
  - App onPlayAgain: when soloMenuSeed(...) returns null, it sends the `playAgain` intent (connection.playAgain()).
- **States:**
  - Hidden on tutorial and for walk-in spectators (App.tsx passes onPlayAgain only for classic and not walk-in).
  - No pending or disabled state after the click. The next lobby view replaces the screen.
  - Server reject shows the IllegalActionDialog (play-again-not-finished / play-again-tutorial).
- **Keep:**
  - Ask-once intercepts Play again unless already marked. Skip or Send rematches, a failed send does not (L57-12, shouldPlayAgainAfterAskDismiss).
  - The first Play again does not pull other players off their recap. Bots persist. Walk-in spectators become unready lobby guests (L57-10 / L57-14).
  - Host lobby rules carry into the rematch: excluded kits, Random only, turn seconds (L70-01: 'Play again keeps them'). The user confirmed this session that custom rules, forbidden kits and the time change stay.
  - Play again keeps the room chat transcript (decisions 2026-10-06 'Room chat outlives one match').
- **Notes:** Solo variant: see end-solo-play-again-menu.

### `end-solo-play-again-menu` — Solo Play again (reopen the solo menu) · `Lot 62+`

- **Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/solo-menu-seed.ts`, `apps/client/src/screens/solo-menu-seed.test.ts`, `apps/client/src/screens/home.tsx`
- **Purpose:** On a solo table (exactly one human, who is you, plus 1–7 bots, classic, not a spectator), Play again leaves the room and reopens the Home solo menu prefilled for the next match.
- **Controls:**
  - Play again (after ask-once) calls setPendingSoloMenu(seed) then leaveGame(). Home receives soloMenuSeed plus onSoloMenuSeedApplied.
  - Home 'Start solo game' is the only thing that starts the next match.
- **States:**
  - The seed carries: opponentCount = bot count; difficulty = the shared bot difficulty, or 'normal' when bots are mixed; kitSelection from finalTable.self.kitId; lobbyRules = view.lobbyRules, or defaultLobbyRules() when absent.
- **Keep:**
  - Solo Play again never deals the next match by itself (L67-01, supersedes the Lot 66 instant restart).
  - Solo host rules (excluded kits, Random only, turn time) carry into the reopened menu (L70-01; user confirmed this session that rules stay).
  - Solo Play again leaves the room, so that chat transcript ends with it (decisions 2026-10-06).
- **Notes:** L67-01 behaviour plus the L70 lobbyRules field.

### `end-return-home` — Return home / Play a real game (finished hub leave)

- **Files:** `apps/client/src/screens/end.tsx`, `apps/client/src/screens/end-feedback.ts`, `apps/client/src/screens/game-over-copy.ts`, `apps/client/src/screens/table/table-leave-confirm.tsx`
- **Purpose:** Leave the finished game to the hub from the dialog CTA or from the board flag.
- **Controls:**
  - Dialog red 'Return home' (classic) or 'Play a real game' (tutorial) calls requestLeave.
  - Board flag opens the Stay / Return home confirm, and its confirm calls requestLeave.
  - requestLeave: if already asked, onLeave (leaveGame) runs. Otherwise stats close, ask-mode Feedback opens with leavePending, and Skip or Send then leaves.
- **States:**
  - Already asked: leaves at once.
  - Not asked: ask-mode form. A failed send keeps the form open, so you stay on the board.
  - Tutorial finished: same path, label 'Play a real game', no Play again.
- **Keep:**
  - Every finished leave to the hub (Return home, Play a real game, flag) hits ask-once unless already marked (L57-03 / technical spec v6 §2.2).
  - Skip or a successful Send then disconnects. View board ask does not leave (shouldLeaveAfterAskDismiss).
  - Return home skipping the Game over ask is a known silent failure (backlog_v6 'Characteristic V6 failures').

### `end-feedback-ask-once` — Game over Feedback ask-once orchestration

- **Files:** `apps/client/src/screens/end.tsx`, `apps/client/src/screens/end-feedback.ts`, `apps/client/src/screens/end-feedback.test.ts`, `apps/client/src/feedback/asked-storage.ts`, `apps/client/src/feedback/feedback-surfaces.test.ts`
- **Purpose:** Decides when the finished board shows Feedback in ask mode or manual mode, and what happens after it closes.
- **Controls:**
  - Trigger 1: the first stats close (View board / Esc / overlay), when not yet asked and no form is open. Opens ask mode with no pending leave.
  - Trigger 2: Return home / Play a real game / flag. Opens ask mode with leavePending.
  - Trigger 3: Play again. Opens ask mode with playAgainPending.
  - Manual triggers: the Game over 'Feedback' button (also dismisses stats) and the board `!` (only when stats are closed).
- **States:**
  - alreadyAsked comes from localStorage['card-battle.v6.feedbackAsked.' + gameCode] === '1'.
  - If storage is unavailable, hasAskedFeedback is always false (ask every time) and markFeedbackAsked does nothing.
  - Dismiss reason skip / cancel / sent. Skip and sent mark asked, Cancel does not (shouldMarkEndFeedbackAsked). A manual 'sent' also marks asked.
  - A manual open from the stats Feedback button sets statsDismissed without asking, so the next ask happens only on hub leave or Play again.
- **Keep:**
  - Ask once per finished gameCode (technical spec v6 §7.1).
  - In ask mode an overlay dismiss counts as Skip (feedback-dialog.tsx onClose).
  - Leave or rematch only on skip or sent, never on cancel or a failed send (L57-03 / L57-12).
  - Source tests lock this wiring (feedback-surfaces.test.ts, end-feedback.test.ts).
- **Notes:** The playAgainPending branch is L57-12.

### `end-finished-chat-readonly` — Finished-board table chat (read-only) · `Lot 62+`

- **Files:** `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/table-chat.tsx`, `apps/client/src/screens/table/chat-log.tsx`, `apps/client/src/screens/table/chat-unread.ts`, `apps/client/src/screens/end.tsx`
- **Purpose:** Shows the room chat snapshot taken at game end on the finished board, with no sending.
- **Controls:**
  - Chat button next to the flag opens the chat popup. Its unread count lives on the client (chat-unread.ts).
  - No input form: TableChat canWrite={!readOnly}. EndScreen passes onSendChat = noop.
- **States:**
  - Read-only transcript of the finished snapshot. Eliminated and spectator streams follow the per-recipient view.
- **Keep:**
  - The finished board does not accept new messages (decisions 2026-10-06 Lot 70 / 'Room chat outlives one match').
  - Message role is frozen at send time. Living readers get only the living stream (decisions 2026-10-06).
- **Notes:** Lot 70. The table auditor likely covers chat in full. Listed here for the finished-board state only.

### `end-action-log-xlsx-download` — Game over 'Download action log' (Excel, DEV only)

- **Files:** `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/screens/game-over-copy.ts`, `apps/client/src/export/build-action-log-xlsx.ts`
- **Purpose:** Developer export of the full FinishedStateView.exportLog to .xlsx.
- **Controls:**
  - Purple 'Download action log' runs buildActionLogWorkbook(view.exportLog), then downloadWorkbookBuffer to '{gameCode}-action-log.xlsx'.
- **States:**
  - Rendered only when import.meta.env.DEV (showActionLogDownload).
  - Busy: label 'Building Excel…', button disabled.
  - Error: error.message or 'Export failed', shown as role=alert.
- **Keep:**
  - Excel download is DEV-only in every mode (technical spec v6 §5.4, locked by game-over-copy.test.ts).
  - Workbook sheets: 'Turns' (turnSequence, actor, action, card, upgraded, target, attacks, plus per-player before/after lives, points, upgradePoints, shield, kit, elim, hand, specials, pending) and 'Events'.
  - exportLog stays complete. It is not affected by the L63-06 log fog.
- **Notes:** Production testers cannot download. The designer gets the same workbook from /admin match detail.

### `end-gameover-feedback-dismiss` — Game over and ask-once Feedback dismissal chain

- **Files:** `apps/client/src/screens/end.tsx`, `apps/client/src/screens/end-feedback.ts`, `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/feedback/feedback-dialog.tsx`, `apps/client/src/feedback/asked-storage.ts`, `apps/client/src/App.tsx`, `apps/client/src/net/use-room-connection.ts`, `docs/technical_spec_v6.md`, `docs/agent/frontend.md`, `docs/agent/decisions.md`
- **Purpose:** On the finished board, dismissing the stats dialog or the ask-once Feedback dialog can leave the room or trigger Play again. Escape and backdrop clicks behave exactly like the Skip / View board buttons.
- **Controls:**
  - Game over Escape / backdrop / 'View board': onStatsClose (end.tsx:69-80). Dismisses the stats. If this gameCode was never asked, it opens Feedback in ask-mode
  - Game over 'Feedback': onOpenStatsFeedback. Dismisses the stats and opens the manual ticket
  - Game over 'Return home' (tutorial: 'Play a real game'): requestLeave (end.tsx:99-109). Leaves now if already asked, otherwise opens ask-mode with leavePending
  - Game over 'Play again' (classic only, not for walk-ins): requestPlayAgain (end.tsx:111-124). Plays again now if already asked, otherwise opens ask-mode with playAgainPending
  - Game over 'Download action log' (Excel, when allowed): local file build, not a dismissal
  - Ask-mode Feedback Escape / backdrop / 'Skip': dismiss('skip') (feedback-dialog.tsx:148-150, 158-160). markFeedbackAsked(gameCode); then with leavePending it calls leaveGame(); with playAgainPending it calls onPlayAgain (end.tsx:187-206)
  - onPlayAgain (App.tsx:148-163): with several humans it sends the PLAY_AGAIN intent; with one human it calls leaveGame() and reopens the seeded solo menu
  - Ask-mode 'Send' success ('sent'): same follow-up as Skip. A failed send keeps the dialog open, does not mark asked, and does not leave
  - Manual Feedback Escape / backdrop / 'Cancel': dismiss('cancel'). Not marked asked, no leave, no Play again
  - Dock 'Stats': reopens Game over (no-op while Feedback is open). Turn-strip '!': manual Feedback, only when stats and Feedback are both closed
  - Finished flag: TableLeaveConfirm, Stay / Return home. Escape or backdrop means Stay
- **States:**
  - banner period: stats open after TABLE_BANNER_MS (win/death banner)
  - stats open, stats dismissed, Feedback open: exclusive (isEndStatsOpen)
  - not asked / asked: localStorage 'card-battle.v6.feedbackAsked.' + gameCode
  - storage unavailable: hasAskedFeedback is always false, so the ask appears every time
  - busy sending: the Skip/Cancel button is disabled, but Escape and backdrop still dismiss and the in-flight result is ignored (requestId bump)
  - walk-in spectator: no Play again
- **Keep:**
  - Game over Escape, backdrop and View board are one action, and the first such close opens the ask-once Feedback (L47-03 / L57-03; frontend.md End screen)
  - In ask-mode, a backdrop click or Escape counts as Skip. Skip marks the game asked and continues any pending Return home or Play again (technical spec v6 §7.1: 'Overlay dismiss in ask-mode is Skip')
  - The ask after View board never leaves; the ask after Return home / Play again does (shouldLeaveAfterAskDismiss / shouldPlayAgainAfterAskDismiss)
  - Manual Cancel and a failed send never mark asked and never leave
  - Only one Feedback Dialog exists on the finished board. Stats, the ask and the '!' never stack (decisions 2026-09-02)
  - Return home, Play a real game and the finished flag all go through the same ask-once check
  - Solo Play again (one human) reopens the menu with the same kit, bot count and difficulty and does not start a match (Lot 67)
- **Notes:** Lots 47, 57 and 60 define most of this chain. Only the single-human Play again path that reopens the solo menu is Lot 67, so it was added after Lot 61. Hazard: Escape while the ask is 'Sending…' still dismisses as Skip. That marks the game asked and may leave even though the POST could still be landing.

### `end-chat-frozen-snapshot` — Finished board chat: read-only snapshot · `Lot 62+`

- **Files:** `apps/client/src/screens/end.tsx`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/table-chat.tsx`, `apps/client/src/screens/table/chat-log.tsx`, `apps/server/src/protocol/build-view-for.ts`, `apps/server/src/rooms/game-room.ts`, `apps/server/src/rooms/lobby-rules.ts`, `apps/server/src/db/write-finished-game.ts`
- **Purpose:** On the Game over board, the same chat icon opens the transcript from finalTable.chatMessages with no composer. After someone presses Play again, players still on the board get the holdout snapshot from the moment the game ended, and the next gathering's lobby lines never reach them.
- **Controls:**
  - Chat IconButton with the unread badge, same as on the table. It stays in the turn strip when readOnly
  - Dialog 'Chat' with a Close button, Esc and overlay dismiss
  - No composer: TableChat gets canWrite={!readOnly}, which is false, so ChatLog renders no form. EndScreen also passes onSendChat={noop}
- **States:**
  - Finished, before anyone presses Play again: the server builds the finished view from the live room transcript (this.chatMessages), but nobody can send, because canSendChat sees neither inGame nor inLobby
  - Finished, after someone presses Play again: recap seats get holdout.chatMessages, frozen at onGameOver. New 'Lobby' lines from the next gathering do not appear, and a send is rejected with 'send-chat-not-in-game' ('Chat is available in the lobby and during the game.')
  - The filter follows the final game state (buildFinishedViewFor feeds buildPlayingViewFor). The winner and any surviving living seat see living lines only. Eliminated seats and walk-in spectators see both streams
  - The composer is simply missing, with no caption saying why
  - The unread count starts at 0, because EndScreen mounts a new TableScreen and seenCount equals messages.length
  - Tutorial finish: the same read-only chat icon (tutorial lines, if any)
- **Keep:**
  - Rules spec §6 Chat: someone still looking at the finished board cannot send
  - Decisions 2026-10-06 'Room chat outlives one match': people still on the finished board see the holdout snapshot from that game's end. People in the next gathering see the continuing room transcript
  - Each finished-game write stores the room transcript as of that game's end in game_chat_messages (order_index, sender_id, nickname, role, body, round_index), in the same transaction (write-finished-game.ts). Nothing is saved if the room dies first
  - The same per-recipient visibility as during play (PROTOCOL 24 finalTable)
  - The chat icon stays on the readOnly board next to the flag (Stay / Return home) and the Stats reopen (frontend.md)
- **Notes:** Nothing on the board says the room has moved on and the next gathering is chatting. A caption such as 'Chat is closed for this game' would explain the missing composer. Whether players still on the board should see the live next-gathering transcript is a product decision, because the decisions log fixes the snapshot.


## Admin (/admin)

### `admin-shell` — /admin SPA shell and router

- **Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/admin/admin-app.tsx`, `apps/client/src/admin/admin-routes.ts`, `apps/client/src/admin/admin-route.test.ts`, `apps/client/src/screens/admin/admin-app.test.tsx`
- **Purpose:** Password-gated designer analytics in V7 tool mode (technical spec v7 §7.8). The pathname is matched before any game phase, and Colyseus is never used.
- **Controls:**
  - Browser back and forward: a popstate listener bumps routeKey and remounts the page.
  - Routes (adminRoute in admin-routes.ts): /admin and /admin/dashboard go to Overview. /admin/games and /admin/games/:id (detail). /admin/kits. /admin/feedback. /admin/data and /admin/data/:table. One trailing '/' is ignored, and any unknown /admin/* path falls back to Overview.
  - Quiet 'Sign out' button in the header row while unlocked (L80-02). It runs lockAdminSession(), the 401 path, so the stored key is cleared and the gate comes back empty.
- **States:**
  - Locked: the header plus the password gate. Sign out is absent.
  - Unlocked: the header, Sign out, nav and page. A stored password skips the gate with no probe.
  - Any 401 runs lockAdminSession, which clears the stored password and shows the gate again (subscribeAdminUnauthorized). A request started before a lock can neither store the old password again nor lock the session unlocked since (session counter, L80-02).
  - Header copy: h1 'Insights' and the blurb 'Finished matches, kit balance, feedback, and raw log tables. Not linked from the player hub.' The 'Designer' eyebrow above the h1 was removed (designer 2026-10-28, L80-12).
  - Tool mode: `<main data-mode="tool">` on a flat --bg-0 ground with no .v7-ground halos; admin Dialogs carry data-mode="tool" themselves (L80-01).
- **Keep:**
  - /admin loads without Colyseus and is never linked from the hub (L61-06, admin-route.test.ts).
  - Reuses sessionStorage 'card-battle.v6.inboxPassword' and the X-Inbox-Password header (admin-app.test.tsx, fetch-admin.test.ts).
  - Page state (filters, page numbers) resets on each navigation because of the key remount. The Database page relies on it (admin-data-page.test.tsx › 'in the real shell a tab change starts the next table at page 1, and so does coming back').
- **Notes:** Sign out (L80-02) is the lock control; at the 1de498d audit there was none.

### `admin-password-gate` — Admin password gate

- **Files:** `apps/client/src/screens/admin/admin-password-gate.tsx`, `apps/client/src/inbox/password-storage.ts`, `apps/client/src/admin/fetch-admin.ts`, `apps/server/src/http/inbox-auth.ts`
- **Purpose:** Unlocks /admin with INBOX_PASSWORD by probing GET /api/admin/overview.
- **Controls:**
  - 'Password' TextField (type password, autoComplete current-password, 16 px), prefilled from sessionStorage.
  - Primary 'Unlock' submit button (Enter submits the form). The label reads 'Checking…' while busy.
- **States:**
  - Unlock is off when the trimmed input is empty or a check is running: aria-disabled (focusableWhenDisabled), so it keeps focus and a press does nothing.
  - Errors (AdminStatus, role=alert): 401 'Wrong password' (also clears the stored password), 404 'Not found' (INBOX_PASSWORD unset), 429 'Too many wrong passwords. Try again in a few minutes.' (the stored key stays; L80-02), 503 'Database unavailable', and 0 / network / other 'Could not load'.
- **Keep:**
  - Same auth as the inbox: timing-safe compare, 404 when unset, 401 when wrong, one shared limiter of 10 wrong guesses per 10 min per IP that counts only failures (technical spec v6 §14, inbox-auth.ts).
  - The password is stored only in sessionStorage, and only after a successful load while its session is still current (password-storage.ts, fetch-admin.ts).

### `admin-nav` — Admin nav tabs

- **Files:** `apps/client/src/screens/admin/admin-nav.tsx`, `apps/client/src/screens/admin/admin-ui.tsx`, `apps/client/src/admin/admin-routes.ts`
- **Purpose:** Client-side navigation between the admin pages.
- **Controls:**
  - `<nav aria-label="Admin sections">` (AdminLinkBar) with links 'Overview' (/admin), 'Matches' (/admin/games), 'Kits' (/admin/kits), 'Feedback' (/admin/feedback), 'Database' (/admin/data). A plain primary click does pushState then dispatches popstate; a click with Alt, Ctrl, Meta or Shift stays the browser's (new tab or window).
- **States:**
  - The current section has aria-current="page" and the selected look of the Tabs track (L72-08 chrome, tool mode). Current means an exact path match, or a prefix match for non-root sections (adminSectionHref), so /admin/dashboard marks none.
  - The track wraps at 390 px.
- **Keep:**
  - The five sections and their order stay.
  - Deep links work: /admin/games/:id and /admin/data/:table.
- **Notes:** Links, not ARIA tabs, because each one changes the URL (L80-01). At the 1de498d audit they were buttons, the active one green.

### `admin-filters-form` — Shared admin match filters (Overview, Matches, Kits)

- **Files:** `apps/client/src/screens/admin/admin-filters-form.tsx`, `apps/client/src/screens/admin/admin-filters-copy.ts`, `apps/client/src/admin/filter-query.ts`, `apps/client/src/admin/filter-query.test.ts`, `apps/server/src/db/admin-filters.ts`
- **Purpose:** Match-level filters sent as query params to /api/admin/overview, /games and /kit-stats.
- **Controls:**
  - 'From' and 'To' datetime-local inputs.
  - 'Opponents' select: 'All matches' (no param) / 'Humans only' (bots=humans) / 'Includes bots' (bots=withBots).
  - 'Seat count' select: 'Any seat count' (no param) plus 2 to 8 (ADMIN_OCCUPANCY_KEYS), sent as occupancy (L80-03).
  - 'Kit' select: 'Any kit' plus every KIT_IDS entry by display name, sent as kit.
  - Checkbox 'Include tutorial matches' (includeTutorial=true).
  - Primary 'Apply'. Edits send nothing until Apply, and Apply always starts a new request, unchanged filters included, so it is the retry after an error (each page counts Apply presses in its request key).
- **States:**
  - Title 'Filters' and helper copy: 'Tutorial matches are hidden unless you include them below. From and To use your local clock.'
  - Each page holds its own filter state, and it resets on navigation.
  - Every field is 16 px (ADMIN_FIELD_CLASS) at a 44 px height.
- **Keep:**
  - From and To are converted from the local clock to UTC ISO on the client (L62-07, decisions 2026-09-19).
  - Tutorial rows are excluded by default (L61-01 / technical spec v6 §14).
  - Match mix (bots) filters games and is separate from Actors (L62-01).
- **Notes:** The UTC conversion is L62-07 (after Lot 61). The select cannot send a seat count the server would ignore; at the 1de498d audit it was a free text input.

### `admin-overview-page` — Admin Overview page (dashboard)

- **Files:** `apps/client/src/screens/admin/admin-dashboard-page.tsx`, `apps/client/src/screens/admin/admin-overview-modules.tsx`, `apps/client/src/screens/admin/use-admin-list.ts`, `apps/client/src/admin/fetch-admin.ts`, `apps/client/src/export/admin-xlsx.ts`
- **Purpose:** Nine stacked metric modules from one GET /api/admin/overview payload.
- **Controls:**
  - Filters plus Apply (admin-filters-form). Apply always asks again, so it retries after an error even before a first load, when no Actors control exists yet.
  - Quiet 'Download Excel', shown once an overview has loaded. It runs exportOverviewXlsx and writes 'admin-overview.xlsx' with sheets General, Volume, Gameplay, Economy, Combat, Hidden, Bots and seats, Endings, Retention.
  - The Actors select in module headers refetches immediately (see admin-actors-control).
- **States:**
  - Intro: 'Overview' / 'Nine modules on the finished-game log. Match mix filters games; Actors filters seats inside those games.'
  - 'Loading…' (AdminStatus, role=status) shows while a request is in flight: alone before the first response, never an empty 'No data' flash, and above the last loaded modules during a refetch, which stay on screen.
  - An error (AdminStatus, role=alert) shows above the modules and keeps the previous overview on screen; it goes as soon as the next request starts.
  - Empty data: the modules still render, with zero counts and 'No data' charts.
- **Keep:**
  - Excel exports the loaded overview JSON, which already reflects the current filters and Actors (L62-06).
  - A successful fetch clears the error (admin-dashboard-page.test.tsx).
  - A late overview response is ignored (useAdminList).
- **Notes:** The page shell is Lot 61. The nine-module body and the overview Excel are Lot 62 (see the module surfaces). The refetch Loading… line is a Lot 80 change; before it a refetch showed no pending state.

### `admin-actors-control` — Overview Actors select · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`, `apps/client/src/admin/filter-query.ts`
- **Purpose:** Seat- and action-grain filter for actor-level modules. Mixed tables still contribute the selected seats.
- **Controls:**
  - 'Actors' select: 'Humans and bots' (both, default, no param) / 'Humans' / 'Bots'. It is rendered on the Gameplay, Economy, Combat, Hidden tools and Bots and seats headers. All instances share one state.
- **States:**
  - A change refetches the overview right away, independent of the filter Apply.
- **Keep:**
  - Two filter grains: match mix filters games, Actors filters seats (L62-01 / technical spec v6 §15).
  - Seat win share applies Actors to both wins and games (decisions 2026-09-18 'ratio grains').
- **Notes:** Lot 62.

### `admin-overview-general` — Overview module: General · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`, `apps/client/src/admin/admin-present.ts`, `apps/client/src/admin/admin-overview-labels.ts`, `packages/shared/src/admin/api.ts`
- **Purpose:** Match-level totals and lengths.
- **Controls:**
  - None (display).
- **States:**
  - Metric cards: 'Finished matches'; 'Humans only' (hint 'No bot seats'); 'With bots' (hint 'At least one bot seat'); 'Average length' (hint 'Per match'); 'Median length'; 'Average length per human' (hint 'Weighted by human seats; bots excluded'); 'Average occupancy'; 'Average turns'; 'Clock per turn' (hint 'Match clock / turns'); 'Most wins (kit)' ('{Kit} (N wins)'); 'Feedback reports'.
  - Charts: 'Length with bots vs without' (bars, caption 'Ignores the opponents match-mix filter. Still uses dates, kit, occupancy, and tutorial.'); 'Length by seat count' (bars); 'Games per seat count' (pie).
  - Null values show '—'. Lengths are in minutes with one decimal ('< 0.1 min' under 3 s).
- **Keep:**
  - Module description: 'Match-level totals. Lengths are minutes. Occupancy pie uses the same seat counts as the length-by-seats bars.'
  - Tests lock the caption 'Ignores the opponents match-mix filter' (admin-overview-modules.test.tsx › 'keeps the UTC, non-attack and match-mix notes').
- **Notes:** Lot 62.

### `admin-overview-volume` — Overview module: Volume · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`
- **Purpose:** When matches ended.
- **Controls:**
  - None.
- **States:**
  - 'Games per UTC day' bars (label = day).
  - 'Games by hour of day' bars (label 'HH:00 UTC', caption 'Hours are UTC.').
  - Empty: 'No data'.
- **Keep:**
  - Hours are labelled UTC (locked by admin-overview-modules.test.tsx › 'keeps the UTC, non-attack and match-mix notes').
- **Notes:** Lot 62.

### `admin-overview-gameplay` — Overview module: Gameplay (actor-level) · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`, `apps/client/src/screens/admin/admin-charts.tsx`
- **Purpose:** Actions, kits, cards and pacing for the selected seats.
- **Controls:**
  - Actors select.
  - 'Show' select on Kit wins: 'Wins' / 'Win rate' (local state).
- **States:**
  - 'Actions used' bars, sorted by count descending (Draw, Play card, Multi-attack, Buy card, … Activate duplication).
  - 'Kit wins' bars. Win rate hides kits with zero picks. Caption 'Sample N matches. Win rate hides kits with zero picks.'
  - 'Kit pick vs win' scatter (kits with picks > 0; axes Pick rate × Win rate; caption 'Same numbers as the Kits table.').
  - 'Specials played' and 'Shared cards played' bars (card display names).
  - Think / pacing cards: 'Average think time', 'Think per action', 'p50 think', 'p90 think', 'Draw share' (hint 'Draw as a share of actionPlayed').
  - Partial note when thinkTimePartial: 'New matches only — think time is missing on pre-migration rows (X of Y seats).'
- **Keep:**
  - The server aggregates and the client only renders (L62-01).
  - Think time persists from migration 008 only, and old rows are null (L62-02).
- **Notes:** Lot 62.

### `admin-overview-economy` — Overview module: Economy (actor-level) · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`
- **Purpose:** Shop mix, upgrades and leftover resources.
- **Controls:**
  - Actors select.
- **States:**
  - 'Shop mix' bars (Buy card, Buy from pool, Buy special, Buy upgrade point).
  - Cards: 'Upgrade card'; 'Upgraded plays' (percent, hint 'X of Y playCard / multi-attack'); 'Leftover lives'; 'Leftover points'; 'Leftover upgrade points'; 'Buys / seat'; 'Sells / seat'; 'Upgrades / seat'; 'Cards played / seat'.
- **Keep:**
  - Labels come from admin-overview-labels.ts (Buy from pool, Unspy and so on).
- **Notes:** Lot 62.

### `admin-overview-combat` — Overview module: Combat (actor-level) · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`
- **Purpose:** Attack resolutions from the public action log.
- **Controls:**
  - Actors select.
- **States:**
  - Cards: 'Lives lost (attacks)', 'Shield absorbed', 'Non-attack life loss' (hint 'Tax, Suicide, Imposition — not applyDamage').
  - 'Resolution outcomes' pie (Applied / Immune / Cancelled / Blocked), caption 'Tax, Suicide, and Imposition life loss is not attack damage.'
- **Keep:**
  - Never merge non-attack loss into damage (AGENTS golden rule 2; L62-04). admin-overview-modules.test.tsx locks the caption.
- **Notes:** Lot 62.

### `admin-overview-hidden-tools` — Overview module: Hidden tools (actor-level) · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`
- **Purpose:** Spy, Thief, Unspy, Mirror and the selected persistents.
- **Controls:**
  - Actors select.
- **States:**
  - Cards: 'Spy plays', 'Thief plays', 'Unspy', 'Mirror redirects'.
  - 'Persistents' bars (Invisibility, Points Generator, Imposition), each shown as 'N plays / M off'.
- **Keep:**
  - Play counts are playCard only. 'Off' includes auto-loss and manual deactivate (L62-07, decisions 2026-09-19).
- **Notes:** Lot 62.

### `admin-overview-bots-seats` — Overview module: Bots and seats (actor-level) · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`
- **Purpose:** Human results in mixed games, bot difficulty, and win share by seat.
- **Controls:**
  - Actors select.
- **States:**
  - Card 'Human win rate (mixed)' (hint 'X of Y mixed games').
  - 'Wins by bot difficulty' bars (Easy / Normal / Hard / Mixed, shown as 'wins / games').
  - 'Win share by seat' bars ('Seat N', shown as 'wins / games').
- **Keep:**
  - Seat win share applies Actors to both wins and games (decisions 2026-09-18).
- **Notes:** Lot 62.

### `admin-overview-endings` — Overview module: Endings (match-level) · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`
- **Purpose:** How seats left the table, and how close the winner was.
- **Controls:**
  - None (no Actors).
- **States:**
  - 'Elimination reasons' pie (Combat / Absent / Inactive / Left / Gambling).
  - 'Leave and inactivity by seat count' bars ('N leave / M inactive / G games').
  - 'Winner leftover lives': card 'Average winner lives' plus bucket bars (1–5, 6–10, 11–15, 16+ lives).
  - 'Match duration' buckets (Under 5 min, 5–15 min, 15–30 min, 30+ min).
- **Keep:**
  - Bucket labels come from admin-overview-labels.ts.
- **Notes:** Lot 62. The Gambling reason is Lot 64.

### `admin-overview-retention-feedback` — Overview module: Retention and feedback (match-level) · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-overview-modules.tsx`
- **Purpose:** Rematch rate, distinct nicknames and the feedback pulse.
- **Controls:**
  - None.
- **States:**
  - 'Rematch rate' (hint 'N games whose room code appears more than once').
  - 'Distinct nicknames' (hint 'Display-only, not identity').
  - 'Feedback pulse': the count, with hint 'X.XX reports per game (date window)', or 'Date window only — not occupancy, kit, or match mix' when there is no ratio.
  - 'Feedback kind' pie (Bug / Confusion / Idea).
- **Keep:**
  - Reports per game uses the date window on both sides (decisions 2026-09-18).
  - Topics stay on the Feedback tab (module description).
- **Notes:** Lot 62.

### `admin-chart-primitives` — Admin chart and table primitives · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-charts.tsx`, `apps/client/src/admin/admin-chart-math.ts`, `apps/client/src/screens/admin/admin-ui.tsx`, `apps/client/src/screens/admin/admin-classes.ts`, `apps/client/src/admin/admin-present.ts`, `apps/client/src/admin/admin-overview-labels.ts`
- **Purpose:** Shared CSS/SVG charts and layout pieces for the admin pages.
- **Controls:**
  - Scatter points show a native SVG <title> tooltip on hover ('{kit}: pick X%, win Y%').
- **States:**
  - AdminHorizontalBarChart: label (truncated, title attribute), bar width relative to the max, value text (display or formatCount), optional caption. 'No data' when empty.
  - AdminPieChart: conic-gradient donut (role=img, aria-label lists label and count) with a legend of swatch, label and count. 'No data' when empty; an all-zero pie paints the empty ring (ADMIN_CHART_EMPTY_COLOR, --panel-2).
  - AdminScatterChart: 100×100 SVG (role=img, aria-label '{yLabel} versus {xLabel}'), with axis text '{yLabel} × {xLabel}'.
  - AdminBucketChart is a horizontal bar chart.
  - AdminMetricCard (label, value, optional hint) in AdminMetricGrid. AdminDataTable (required label naming a horizontal ScrollArea, empty message, optional row-open button), AdminPager, AdminStatus, AdminLinkBar, AdminToggleChip and AdminPageIntro (title plus description), all in admin-ui.tsx; class strings in admin-classes.ts.
  - Formatters: null or non-finite values show '—'; percent has one decimal; think time shows 'X.X s'.
- **Keep:**
  - No chart npm package; CSS/SVG and tokens only (L62-05 / technical spec v6 §15; admin-charts-dependencies.test.ts).
  - Chart palette: ADMIN_CHART_COLORS, eight hex from V7_COLORS in the order cta-2, point, life, upgrade, shield, threat-other, text-2, danger; single-series bars and dots in cta-2 (L80-04, admin-chart-math.ts).
- **Notes:** Charts are Lot 62. MetricCard, DataTable and PageIntro are Lot 61. The V7 palette replaced the V2 one (cta-purple, cta-orange, resource and seat colors) in L80-04.

### `admin-matches-page` — Admin Matches (games list)

- **Files:** `apps/client/src/screens/admin/admin-games-page.tsx`, `apps/client/src/screens/admin/use-admin-list.ts`, `apps/client/src/admin/admin-paging.ts`, `apps/client/src/export/admin-xlsx.ts`
- **Purpose:** Finished games from the log. Select a row to open its detail.
- **Controls:**
  - Filters plus Apply. Apply goes back to page 1 and always asks again (a retry needs no filter edit).
  - Quiet 'Download spreadsheet (this page)' (off until a page with rows loads). It runs exportGamesListXlsx and writes 'admin-games.xlsx' from the loaded page's rows only.
  - Each row's Room code cell is a button named 'Open match {roomId}' (Tab, Enter, Space); the whole row also takes the mouse click. Either opens the detail and replaceStates to /admin/games/:id (finished_games.id).
  - AdminPager under the table: quiet 'Previous', 'Page N of M' (aria-live polite), quiet 'Next', in `<nav aria-label="Pages">`. Each request sends page and no pageSize (server default 50).
- **States:**
  - Intro: 'Matches' / 'Finished games from the log. Select a row for seats, eliminations, and export.'
  - 'Loading…' (role=status) while the page for the current request is not loaded; the previous rows are gone and the pager is off.
  - 'Showing X of Y' once loaded.
  - List error (role=alert) with the rows gone. Detail Loading… and detail error (role=alert) at page level.
  - Empty: 'No finished matches match these filters.' Zero rows read 'Page 1 of 1'.
  - Pager: Previous off on page 1, Next off on the last page, both off while a page loads. Off is aria-disabled, so a keyboard press keeps focus. While a page loads the label keeps the last count known for the same filters (never below the page itself); new filters read 'Page 1 of 1' until their first page loads.
  - Columns: Room code, Ended, Players, Winner, Winning kit, Length, Turns, Notes ('Bots' · 'Tutorial' or '—'). The table scrolls sideways inside a labelled ScrollArea ('Matches'), never the page.
- **Keep:**
  - Rows are keyed by finished_games.id, not roomId (Play again reuses room_id; Lot 61 Bugbot, admin-games-page.test.tsx).
  - Late responses are ignored, and the previous page clears on filter switch or error (L62-07).
- **Notes:** Paging and keyboard rows are L80-06. At the 1de498d audit only page 1 was fetched and rows were clickable <tr> elements with no keyboard focus.

### `admin-match-detail-dialog` — Admin match detail dialog

- **Files:** `apps/client/src/screens/admin/admin-games-page.tsx`, `apps/client/src/screens/admin/admin-game-detail-dialog.tsx`, `apps/client/src/export/build-action-log-xlsx.ts`, `packages/shared/src/admin/api.ts`
- **Purpose:** Seats, elimination order, seed and action-log export for one finished match.
- **Controls:**
  - Quiet 'Download action log', shown when detail.exportLog exists. It runs buildActionLogWorkbook and writes '{roomId}.xlsx'. It reads 'Downloading…' while the workbook builds (aria-disabled, so focus stays) and builds once per press.
  - Quiet 'Close', Esc or overlay call closeDetail, which runs replaceState to /admin/games and ignores the URL detail id. Focus returns to the row's Open match button.
- **States:**
  - Title 'Match {roomId}'. While the detail loads, the page shows 'Loading…' (role=status) and the dialog opens once it has loaded.
  - Facts: Started, Ended, Mode ('Classic', an unknown mode raw), Length, Turns, Winner ('Unknown' when null), Notes ('Bots' · 'Tutorial' or '—').
  - 'Seats' table: Player ('—' when missing), Kit, Lives, Points, Role. Role precedence is Winner, then Bot, then Eliminated, then Player.
  - 'Elimination order' ordered list '{nick} — {reason}', plus ' · by {nick}' when the eliminator resolves to a seat; shown only when there are eliminations.
  - 'Replay seed (designer only): {seed}' in monospace.
  - A build failure shows 'Could not build the action log.' (role=alert) in the body and re-enables the button.
  - A deep link to /admin/games/:id opens it directly. A 404 or 503 shows a page-level error and the dialog stays closed; picking the same row again asks again.
- **Keep:**
  - Detail is GET /api/admin/games/:id on finished_games.id (L61-04 / Bugbot).
  - The seed may appear only here, on password-gated admin (L61-01 seed exception).
  - Late detail responses are ignored (admin-games-page.test.tsx).
- **Notes:** The extra facts, Points, the eliminator and the loading and error states are L80-07. Lot 70 rule columns and chat are still not in the API type (see admin-match-detail-rules-and-chat).

### `admin-kits-page` — Admin Kits (pick / win rates)

- **Files:** `apps/client/src/screens/admin/admin-kits-page.tsx`, `apps/client/src/screens/admin/use-admin-list.ts`, `apps/client/src/export/admin-xlsx.ts`
- **Purpose:** Kit pick and win rates for the filtered match set.
- **Controls:**
  - Filters plus Apply (Apply always asks again, so it retries after an error with no filter edit).
  - Quiet 'Download spreadsheet' (off until a non-empty answer loads). It runs exportKitStatsXlsx and writes 'admin-kit-stats.xlsx' with raw kit ids.
- **States:**
  - Intro: 'Kits' / 'Pick and win rates for the filtered match set. Tutorial matches stay excluded unless you change filters.'
  - 'Loading…' (role=status) until the stats for the current request load, with no table, no sample line and no empty copy.
  - 'Based on N matches' for a loaded answer.
  - Table ('Kit stats'): Kit, Times picked, Wins, Share of picks, Win rate.
  - Empty: 'No kit data for these filters.' Error (role=alert) with the previous table gone, never the empty copy.
- **Keep:**
  - Kit rates respect the tutorial filter (L61-04).
  - Late responses are ignored (L62-07).

### `admin-feedback-inbox-page` — Admin Feedback inbox (list + filters)

- **Files:** `apps/client/src/screens/admin/admin-feedback-page.tsx`, `apps/client/src/inbox/fetch-inbox.ts`, `packages/shared/src/feedback/report.ts`
- **Purpose:** Read tester reports from GET /api/inbox, filtered on the client.
- **Controls:**
  - Kind filter chips (`role="group"` 'Kind'): 'All' / 'Bug' / 'Confusion' / 'Idea'. AdminToggleChip with aria-pressed; the pressed one takes the --cta-2 fill.
  - Area filter chips (group 'Area'): 'Any area' plus UI / Gameplay / Card / Shop / Bot / Tutorial / Other.
  - Click a row's text button to open the report dialog.
  - Status filter and per-row status marks: see admin-feedback-triage.
- **States:**
  - Intro (AdminPageIntro): 'Feedback' / 'Tester reports from the game. Filter them, then mark each one pending, done or won't do.'
  - Rows load once on mount, with 'Loading…' (role=status) until the answer. There is no refresh button.
  - Errors are AdminStatus alerts (role=alert): a load error, or a failed status save. A save that fails from a mark in the open report shows inside the report dialog; a row mark's failure shows on the page.
  - Empty: 'No reports match these filters.' while the filters stay on screen.
  - Row meta: '{createdAt via formatDateTime} · {Kind} · {topics} · {gameCode} · {nickname}', then a message preview truncated to 96 characters.
- **Keep:**
  - Uses GET /api/inbox unchanged (L61-09; inbox-route.test.ts).
  - Kind and area filters stay on the client (L47-05 / L47-06).
  - No edit or delete (technical spec v6 §7.3).
- **Notes:** The intro, the states and the chips are L80-09. At the 1de498d audit the page had no intro, no loading line, a plain red error line and raw ISO dates.

### `admin-feedback-triage` — Feedback triage status (filter + marks) · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-feedback-page.tsx`, `apps/client/src/inbox/fetch-inbox.ts`, `packages/shared/src/feedback/report.ts`
- **Purpose:** Designer triage of each report as Pending, Done or Eliminated (won't do).
- **Controls:**
  - Status filter (group 'Status'): an 'Any status' chip plus three icon-only AdminToggleChips (clock = Pending, check = Done, cross = Eliminated), each with aria-label, title and aria-pressed. Default is Pending.
  - Per-row status marks: three icon buttons beside the row's text button (not inside it). A click PATCHes /api/inbox/:id {status} without opening the report. Clicking the current status does nothing.
  - The same marks appear inside the report dialog.
- **States:**
  - The row starts with a round status badge in the status color (orange pending, green done, red eliminated) holding the clock, check or cross glyph, named by the status (L80-09; a side stripe is the Impeccable `side-tab` defect).
  - Every mark on the page is off (aria-disabled, opacity 50%) while any save is running (global savingStatus). It stays focusable and swallows the press, so a mark pressed by keyboard keeps focus, in a row or in the report dialog.
  - The row updates only after the server confirms success. A 401 locks the admin session; a 429 shows the rate-limit copy.
- **Keep:**
  - Status values are pending / done / eliminated, with default pending, and pre-migration rows count as pending (L68-01, report.ts).
  - Marks are icons, not word buttons (frontend.md Feedback tab).
  - An unknown status returns 400 and a missing row 404 (server, L68-01).
- **Notes:** Lot 68.

### `admin-feedback-report-dialog` — Admin feedback report detail dialog

- **Files:** `apps/client/src/screens/admin/admin-feedback-page.tsx`
- **Purpose:** Full report with everything the designer needs for triage.
- **Controls:**
  - Status marks (triage).
  - Quiet 'Close', Esc or overlay.
- **States:**
  - V7 Dialog in tool mode (width lg, data-mode="tool"). Title is the kind label (or 'Report').
  - Shows createdAt (formatDateTime), the status marks, 'About: {topics}' when present, the full message (pre-wrap), 'Contact', 'Nickname', 'Code', 'Screen', 'Play', 'Protocol' and 'User agent' (each '—' when null), and logTail as pretty JSON in a <pre> inside a ScrollArea named 'Log tail'. A null logTail reads 'Log tail: —' with no region (L80-12).
  - A failed save from a mark in this report shows its alert (role=alert) inside the dialog, not behind the modal.
- **Keep:**
  - The detail keeps contact, nickname, game code, screen, playKind, protocol, user agent and log tail (admin-feedback-page.test.tsx › 'the report shows every kept field with — when null, in tool mode').
  - logTail is already seed-stripped by the server (strip-seed).
- **Notes:** Protocol stays visible here (designer data), separate from the player-facing removal.

### `admin-database-page` — Admin Database (read-only table browser)

- **Files:** `apps/client/src/screens/admin/admin-data-page.tsx`, `apps/client/src/screens/admin/use-admin-list.ts`, `apps/client/src/admin/admin-paging.ts`, `apps/client/src/export/admin-xlsx.ts`, `apps/server/src/db/admin-table-browser.ts`
- **Purpose:** Read-only grid of the allowlisted log tables.
- **Controls:**
  - Table links in `<nav aria-label="Database tables">` (AdminLinkBar): 'Finished games' / 'Players' / 'Eliminations' / 'Feedback' / 'Chat messages' (fifth, L80-11). Each links to /admin/data/{name}; a plain click does pushState then popstate, and the shell remounts the page.
  - Quiet 'Download spreadsheet (this page)' (off until a page loads). It runs exportTablePageXlsx and writes 'admin-{table}.xlsx'.
  - AdminPager: 'Previous', 'Page N of M', 'Next'. Each request sends page and pageSize=50 (L80-10).
- **States:**
  - Intro: 'Database' / 'Read-only view of log tables. Large fields are shortened in the grid.'
  - The link of the routed table has aria-current="page". A table outside the five (a deep link to /admin/data/nope) marks none, and the server's 404 shows 'Not found'.
  - 'Loading…' (role=status) while the page for the current request loads, with no grid and the pager off.
  - '{N} rows · page {N}' for a loaded page. The pager label keeps the last count known for the table while the next page loads.
  - Headers are snake_case converted to Title Case. Cells are truncated at 16rem. Null shows '—', objects are JSON-stringified, and truncated JSONB shows 'Preview only (N bytes)'.
  - Empty: 'No rows in this table.' and 'Page 1 of 1'.
  - Error (role=alert) with the rows gone. Late responses are ignored.
- **Keep:**
  - Five allowlisted tables only: Finished games, Players, Eliminations, Feedback and Chat messages (L80-11). No SQL box (L61-05 / technical spec v6 §14).
  - Late responses are ignored (L62-07).
- **Notes:** finished_games now carries the Lot 70 rule columns, which show up as plain columns here. Known issue: the server orders game_chat_messages by game_id only, so Chat messages pages can repeat or skip a line (decisions.md 2026-10-28 'Chat messages pages can repeat or skip lines'). At the 1de498d audit only page 1 was fetched and the tabs were buttons, the active one green.

### `admin-database-chat-transcripts` — Database: chat transcripts table (game_chat_messages), the Chat messages tab · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-data-page.tsx`, `apps/client/src/screens/admin/admin-app.tsx`, `apps/client/src/screens/admin/admin-nav.tsx`, `apps/client/src/admin/admin-present.ts`, `apps/client/src/admin/fetch-admin.ts`, `apps/client/src/export/admin-xlsx.ts`, `apps/server/src/db/admin-table-browser.ts`, `apps/server/src/http/admin-http.ts`, `apps/server/src/db/write-finished-game.ts`, `apps/server/db/migrations/011_lobby_rules_and_chat.sql`, `packages/shared/src/protocol/table-chat.ts`, `packages/shared/src/admin/api.ts`
- **Purpose:** Read-only grid of the persisted table chat. Since Lot 70 every finished-game write inserts one game_chat_messages row per message, with game_id, order_index, sender_id, nickname, role, body and round_index (write-finished-game.ts:150-165, migration 011). The server allowlist has included the table since Lot 70 (admin-table-browser.ts:8-14, commit 490712b). Since L80-11 the Database page has a Chat messages tab for it, fifth after Feedback (TABLES in admin-data-page.tsx).
- **Controls:**
  - Direct URL /admin/data/game_chat_messages. adminRoute() (admin-routes.ts) slices the table name from the path and AdminDataPage calls fetchAdminTable(password, 'game_chat_messages', {page: String(N), pageSize:'50'}), which sends GET /api/admin/tables/game_chat_messages with X-Inbox-Password. The Chat messages tab links here (L80-11).
  - Table tabs: Finished games, Players, Eliminations, Feedback, Chat messages (admin-data-page.tsx, L80-11). Each links to /admin/data/{name}.
  - 'Download spreadsheet (this page)' calls exportTablePageXlsx(visiblePage) and saves admin-game_chat_messages.xlsx with one sheet named game_chat_messages. Arrays and objects are JSON-stringified (admin-xlsx.ts:84-96, 259-270). It is disabled while visiblePage is null.
  - The 'Database' nav link goes to /admin/data, which always opens on finished_games, never chat (DEFAULT_TABLE in admin-data-page.tsx).
  - AdminPager pages the table 50 rows at a time (L80-10).
  - Not present: sort, search, per-game filter, cell expand or tooltip.
- **States:**
  - Chat table active: the Chat messages tab is the current one (aria-current), as for the other four tables.
  - Display name: tableDisplayName maps game_chat_messages to 'Chat messages' (admin-present.ts, L80-11). Column headers come from columnDisplayName: Game Id, Order Index, Sender Id, Nickname, Role, Body, Round Index.
  - Loading or switching: 'Loading…' (role=status) shows, with no grid, no row-count line, Download off and the pager off. A tab change remounts the page, so it starts at page 1.
  - Empty (0 rows, for example before any post-011 game): 'No rows in this table.', '0 rows · page 1' and 'Page 1 of 1'.
  - Error: a role=alert line from adminErrorCopy: 'Wrong password' (401), 'Not found' (404), 'Database unavailable' (503), or 'Could not load' (network / status 0). A 401 also clears the stored password and reopens AdminPasswordGate through subscribeAdminUnauthorized (admin-app.tsx).
  - Row order: the table has no created_at and no tableOrderBy branch, so the server falls back to ORDER BY 1, which sorts by the game_id uuid (admin-table-browser.ts tableOrderBy). Rows are not chronological, and order_index order within a game is not guaranteed.
  - Paging hazard (known issue): because game_id is not unique, LIMIT / OFFSET pages are not stable, so a line can show on two pages or on none. The one-line server fix is game_id DESC, order_index ASC in tableOrderBy (decisions.md 2026-10-28; out of scope for the client-only Lot 80).
  - Body (1–200 chars) is cut by max-w-[16rem] truncate with no title attribute. The full text is visible only in the spreadsheet.
  - Duplication: each finished game stores the room transcript as of that game's end, so after Play again the same line appears under several game_ids (decisions.md 2026-10-06 'Room chat outlives one match'; db.md:39).
  - round_index 0 means a lobby line ('Lobby' in-game via chatRoundLabel). The grid shows a raw 0.
  - role values: living, eliminated, spectator. The eliminated and spectator side stream, which living players never saw, appears mixed into the same grid.
- **Keep:**
  - Read-only browser over an explicit server allowlist. Unknown table returns 404 and no raw SQL param is accepted (L61-05; admin-table-browser.ts:28-30, 124-129).
  - game_chat_messages is in the admin allowlist (Lot 70, db.md:118). Chat rows are not overview metrics (db.md:118-119), so a redesign must not fold chat into Overview charts.
  - The role column must stay visible so living vs eliminated/spectator lines can be told apart. Role is frozen at send time (decisions.md 2026-10-06 Lot 70 'Table chat').
  - Excel export of the loaded page JSON only, client-side exceljs (L61-08 / L61-10).
  - Stale-fetch ignore, and the previous page clears on table switch or error (L62-07; admin-data-page.test.tsx › 'a late response for the previous table is ignored' and 'a failed page shows an alert and clears the previous rows').
  - A 401 re-opens the password gate. /admin is not linked from the hub (L61-06, frontend.md › Admin tool mode).
  - Nothing is persisted if the room dies before the game finishes. A redesign must not imply a live or in-progress chat log (decisions.md Lot 70).
- **Notes:** The gap was real until L80-11. Commit 490712b (L70) touched admin-table-browser.ts and its test but not admin-data-page.tsx or admin-present.ts, and L61-10's acceptance line said 'four tables only' (backlog_v6.md:513). L80-11 added the tab: it is presentation-only, since the server endpoint already served the table. Fixing the ORDER BY 1 ordering, or adding a per-game filter, would need a server change, so rows keep the server order (decisions.md 2026-10-28 'Admin Database lists five tables').

### `admin-database-finished-games-rule-columns` — Database: Finished games tab, raw Lot 70 house-rule columns · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-data-page.tsx`, `apps/client/src/admin/admin-present.ts`, `apps/client/src/export/admin-xlsx.ts`, `apps/server/src/db/admin-table-browser.ts`, `apps/server/src/db/write-finished-game.ts`, `apps/server/db/migrations/011_lobby_rules_and_chat.sql`, `apps/server/src/rooms/game-room.ts`, `packages/shared/src/protocol/lobby-rules.ts`
- **Purpose:** Today this is the only place in /admin where the persisted lobby rules can be seen. The finished_games tab runs SELECT *, so the three Lot 70 columns appear as raw grid columns: excluded_kit_ids text[], random_only boolean, turn_time_seconds integer (write-finished-game.ts:64-86, migration 011:5-21).
- **Controls:**
  - 'Finished games' tab link. This is the default when the route has no table (DEFAULT_TABLE in admin-data-page.tsx).
  - 'Download spreadsheet (this page)' writes admin-finished_games.xlsx. excluded_kit_ids is written as a JSON array string, random_only as true/false, and turn_time_seconds as a number. A null is written as an empty cell.
  - AdminPager pages the rows 50 at a time (L80-10).
  - Not present: any formatting of these columns, kit-name mapping, or a filter.
- **States:**
  - Excluded Kit Ids: node-postgres returns text[] as a JS array, which formatCell JSON-stringifies, for example ["ghost","gambler"]. Raw kit ids, not kit names (formatCell in admin-data-page.tsx).
  - Empty array '[]' means every Classic kit was allowed.
  - Random Only shows 'true' or 'false'.
  - Turn Time Seconds is the effective seconds the room used (viewLobbyRules rounds humanTurnDurationMs; game-room.ts:1298-1311). It is at least 5, and above 180 when the TURN_DURATION_MS env override is longer (decisions.md Lot 70).
  - All three columns show '—' for tutorial rows (classicLobbyRules returns null) and for rows written before migration 011. The two cases can only be told apart through the Is Tutorial column.
  - Solo matches persist the solo-menu rules too (the rules are null only when playKind is tutorial).
  - The same grid also shows Lot 61 columns: seed, action_log / export_log as 'Preview only (N bytes)' when over 512 bytes, has_bots and is_tutorial.
- **Keep:**
  - The CHECK constraint stores the three rule columns either all null or all present, with turn_time_seconds >= 5 (migration 011:9-21).
  - Tutorial rows never carry rules. setLobbyRules is rejected in the tutorial (decisions.md 2026-10-06 Lot 70; rules spec §6 Setup).
  - Host-set table rules (excluded kits, Random only, turn time 5–180, default 60) persist on the finished-game row. The lobby and solo-menu rules UI that produces them stays (user instruction this session; L70-01).
  - At least one kit always stays allowed, so excluded_kit_ids never lists every Classic kit (decisions.md 2026-10-06 Lot 70).
  - The seed may appear on admin game rows only (technical spec v6 §14).
- **Notes:** The house rules are visible here, but only as raw developer values, and on only 50 rows at a time. A redesign that styles this grid should decide whether these columns get friendly rendering (kit names, 'All kits', '60 s'), or whether rules belong only on the match detail (see openQuestions).

### `admin-match-detail-rules-and-chat` — Matches: match detail dialog is missing the persisted house rules and the chat transcript · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-games-page.tsx`, `apps/client/src/screens/admin/admin-game-detail-dialog.tsx`, `apps/server/src/db/admin-game-detail.ts`, `packages/shared/src/admin/api.ts`, `apps/client/src/admin/fetch-admin.ts`, `apps/client/src/export/build-action-log-xlsx.ts`, `apps/client/src/screens/lobby-rules-panel.tsx`, `packages/shared/src/protocol/table-chat.ts`, `apps/server/src/db/write-finished-game.ts`
- **Purpose:** Per-match designer view, keyed by finished_games.id. It shows Started, Ended, Mode, Length, Turns, Winner and Notes, a Seats table (Player / Kit / Lives / Points / Role), Elimination order and the Replay seed (admin-game-detail-dialog.tsx, L80-07). loadAdminGameDetail selects neither the three rule columns nor game_chat_messages (admin-game-detail.ts:35-38), and AdminGameDetail has no rules or chat fields (api.ts:336-354). So the Lot 70 data stored for each match cannot be seen in the match's own detail.
- **Controls:**
  - The row's 'Open match {roomId}' button, or a click on the row, calls openDetail(id): it replaceStates /admin/games/:id and fetches GET /api/admin/games/:id (admin-games-page.tsx).
  - Direct URL /admin/games/:id (adminRoute in admin-routes.ts). A non-uuid id returns 404 (admin-game-detail.ts:9-15).
  - 'Download action log' (shown only when exportLog is present) builds `${roomId}.xlsx` with Turns and Events sheets only. It carries no rules and no chat sheet (build-action-log-xlsx.ts:49,118).
  - 'Close' button and Dialog onClose call closeDetail: replaceState back to /admin/games and ignore the URL detail (admin-games-page.tsx).
  - Not present: a rules block, a chat transcript, a link to the Database chat rows for this game.
- **States:**
  - Detail loading: 'Loading…' (role=status) shows on the page and the Dialog opens once the detail has loaded (L80-07).
  - Detail error: a role=alert line above the list with adminErrorCopy (404 'Not found', 503 'Database unavailable'). The dialog does not open.
  - Rules to represent if surfaced: custom (excluded kits listed), all kits allowed (empty array), Random only on or off, turn time 5–180 or above 180 under env override, tutorial (null, no rules apply), legacy pre-011 row (null, not recorded).
  - Chat to represent if surfaced: no messages (indistinguishable from a pre-011 row); lobby-only lines (round_index 0, 'Lobby'); lines from earlier matches in the same room after online Play again, because each row stores the full room transcript to that game's end and messages have no timestamp or match marker; side-stream lines (role eliminated or spectator) that living players never saw; bodies up to 200 chars.
  - Mode, startedAt, hasBots / isTutorial (as Notes), seat points and the eliminator are shown since L80-07; only the rules and the chat are still missing.
- **Keep:**
  - Detail is keyed by finished_games.id, not room_id, because room_id is reused on Play again (L61-04; admin-game-detail.ts:1-4).
  - Closing /admin/games/:id returns to /admin/games. The detail fetch ignores stale responses (frontend.md › Admin tool mode; L62-07).
  - Designed detail, not a JSON dump (L61-07 acceptance).
  - The Replay seed stays labelled designer-only (technical spec v6 §14).
  - Download action log stays Excel-parity with the player Game over export (export_log; L61).
  - If chat is surfaced, the role labels must stay, because living readers never received the side stream (chatMessagesForReader; table-chat.ts:47-60; rules spec §6 Chat).
  - A read-only rules display already exists: LobbyRulesPanel with editable=false is the guest view, with a clock showing the seconds, a random-kit mark, and kit faces with excluded kits grayed (lobby-rules-panel.tsx:26-66; decisions.md 2026-10-06 'Rules chrome and lobby chat'). Round stamps reuse chatRoundLabel.
- **Notes:** Surfacing either rules or chat here needs an admin HTTP payload change: new AdminGameDetail fields in packages/shared/src/admin/api.ts and the matching SELECTs in admin-game-detail.ts. That is admin HTTP only, not a Colyseus PROTOCOL_VERSION bump (Lots 61 and 62 were 'HTTP only, no protocol bump'). It still falls outside a presentation-only redesign, so it needs a designer go-ahead.

### `admin-filters-lists-house-rules-absence` — Filters, Matches list, Kits and Overview: no awareness of the house rules · `Lot 62+`

- **Files:** `apps/client/src/screens/admin/admin-filters-form.tsx`, `apps/client/src/admin/filter-query.ts`, `apps/server/src/db/admin-filters.ts`, `apps/server/src/db/admin-list-games.ts`, `apps/server/src/db/admin-kit-stats.ts`, `apps/client/src/screens/admin/admin-games-page.tsx`, `apps/client/src/export/admin-xlsx.ts`, `packages/shared/src/admin/api.ts`
- **Purpose:** The shared admin filters and the Matches list predate Lot 70 and never read excluded_kit_ids, random_only or turn_time_seconds. The designer cannot isolate custom-rule matches, Random-only matches, or short-clock matches. Kit balance numbers mix matches where a kit was banned with matches where it was available.
- **Controls:**
  - Filters form (shared by Overview, Matches and Kits): From and To (datetime-local, converted from local time to UTC ISO), Opponents select (All matches / Humans only / Includes bots), Seat count select (Any seat count + 2–8), Kit select (Any kit + every KIT_IDS entry by name), 'Include tutorial matches' checkbox, and Apply (admin-filters-form.tsx; filter-query.ts).
  - Server parses only from, to, bots, actors, occupancy, kit and includeTutorial (admin-filters.ts:79-125). There is no rules param.
  - Matches list 'Notes' column shows only 'Bots' and/or 'Tutorial' (gameNotesLabel). AdminGameListItem has no rules fields (api.ts).
  - Matches 'Download spreadsheet' columns: Code, Ended, Seats, Winner, Kit, Duration ms, Turns, Bots, Tutorial. No rules (admin-xlsx.ts:26-42).
- **States:**
  - Kit filter means 'any seat played this kit'. A match where that kit was excluded simply does not match. Nothing distinguishes 'excluded' from 'not picked'.
  - Kits page pickRate = picks / totalPicks over every filtered match (admin-kit-stats.ts:47), with no correction for matches that excluded the kit or dealt kits at random (Random only).
  - Overview series (duration, turns, clock ms per turn) mix 5 s and 180 s turn clocks without a way to split them.
  - Tutorial rows stay excluded by default (includeTutorial false). Those are exactly the rows whose rule columns are null.
- **Keep:**
  - Default filters exclude tutorial rows (L61 / db.md tutorial exclusion; DEFAULT_ADMIN_FILTERS).
  - From/To are sent as UTC ISO from the designer's local clock (L62-07).
  - Match mix (bots) selects games while Actors selects seats / actions, two separate filter grains (L62-04; db.md 'Admin Overview').
  - Lobby rules are a Classic setup feature the host controls. The redesign keeps them in the lobby and solo menu (user instruction this session; L70-01). The admin side only reads what was persisted.
- **Notes:** This entry records an absence rather than a missing control on an existing widget. The filter widgets themselves date from Lot 61 and are presumably inventoried elsewhere; it is flagged so a V7 admin redesign does not lock in a filter bar with no room for rule facets. Any rule filter needs new query params in admin-filters.ts and filter-query.ts (admin HTTP change, no protocol bump).

### `admin-password-enter-submit` — Admin password gate: Enter submits

- **Files:** `apps/client/src/screens/admin/admin-password-gate.tsx`, `apps/client/src/screens/admin/admin-feedback-page.tsx`, `apps/client/src/screens/admin/admin-games-page.tsx`, `apps/client/src/screens/admin/admin-game-detail-dialog.tsx`
- **Purpose:** Admin unlock form plus admin detail Dialogs.
- **Controls:**
  - Enter in 'Password' (type=password, autocomplete current-password): submits Unlock when it is on (not busy, trimmed value non-empty); otherwise Enter does nothing
  - Admin feedback report Dialog: Escape / backdrop / Close call setOpenId(null)
  - Admin match detail Dialog: Escape / backdrop / Close call closeDetail
- **States:**
  - busy: 'Checking…'
  - error alert from adminErrorCopy
  - unlocked: the password is stored for the admin session
- **Keep:**
  - Enter-to-unlock (admin-password-gate.test.tsx › 'Enter in Password submits once, stores the key and unlocks')
  - Admin Dialogs follow the global Dialog contract, in tool mode (data-mode="tool")
- **Notes:** The legacy screens/inbox.tsx (InboxScreen, with its own form and Dialog) was deleted in L80-09; /inbox redirects to /admin/feedback (App.tsx).

## Critic gaps (all filled above)

1. The turn progress bar always assumes a 60 s turn, so it is wrong whenever the host changes the turn time (added after Lot 61, Lot 70 interaction). The sub-choice bar likewise assumes 40 s, but the server often gives a sub-choice the turn's remaining time instead. — look in: `apps/client/src/screens/table.tsx:1004 (progressRatio = (deadlineMs - nowMs) / 60_000)`, `apps/client/src/screens/table.tsx:1113-1119 (subChoiceProgressRatio / CLIENT_SUB_CHOICE_MS)`, `apps/client/src/screens/table/sub-choice/sub-choice-constants.ts`, `apps/server/src/rooms/game-room.ts:1290-1296 (humanTurnDurationMs), 2420-2435 (sub-choice ms = remaining turn deadline)`, `packages/shared/src/protocol/state-view.ts:298-356 (PlayingStateView has no lobbyRules / turnTimeSeconds)`, `packages/shared/src/protocol/lobby-rules.ts (MIN 5 / MAX 180)`
2. Side effects of changing lobby rules are not surfaced (Lot 70). When the host excludes a kit a guest has picked, the server silently resets that guest to Random. Ready marks are not cleared when rules change after guests have readied. No chat line or notice announces a change. The last allowed kit tile is disabled with no reason given, and 'None' silently keeps the first Classic kit. — look in: `apps/server/src/rooms/game-room.ts:1153-1192 (handleSetLobbyRules: kitSelections reset to 'random', guestReady untouched)`, `apps/client/src/screens/lobby-rules-panel.tsx:118-170 (All / None / Random, lastAllowed disabled tile)`, `packages/shared/src/protocol/lobby-rules.ts (excludeEveryKitButFirst, toggleExcludedKit returns null)`, `apps/client/src/screens/lobby.tsx:130-147 (Your kit card silently flips)`, `apps/client/src/screens/home.tsx:323-337 (solo resets kit to random and sets includeTurnTime only when the slider moved)`, `docs/agent/frontend.md:203-211`
3. Admin side of Lot 70: the server allowlists game_chat_messages, but the Database page offers only four table tabs, so chat transcripts are reachable only by typing /admin/data/game_chat_messages. Match detail shows neither the persisted lobby rules (excluded_kit_ids, random_only, turn_time_seconds) nor the chat. No admin filter uses the rules. — look in: `apps/client/src/screens/admin/admin-data-page.tsx:10-15 (TABLES has 4 entries)`, `apps/server/src/db/admin-table-browser.ts:8-14 (ALLOWED_TABLES includes game_chat_messages)`, `apps/server/src/db/write-finished-game.ts:67-85, 150-152`, `packages/shared/src/admin/api.ts (no rules or chat fields)`, `apps/client/src/screens/admin/admin-games-page.tsx`
4. Inspect-dialog Upgrade button for cards already in play (added after Lot 61, L66-01 / L67-01). It upgrades active Poison, Points Generator, Imposition, Super Absorber, Roulette and Invisibility, the active Shield (1 upgrade point, needs shield > 0) and your own ticking Sentence. It sits next to Deactivate, which is hidden for Shield and Sentence, and is disabled off-turn or while actions are locked. — look in: `apps/client/src/screens/table/card-actions.tsx:126-137, 226-227, 370-410`, `apps/client/src/screens/table/table-helpers.ts (activeUpgradeInstanceId, ACTIVE_SHIELD_INSTANCE_ID)`, `git 0c81fa2 (L66-01)`
5. Target-picker eligibility states added after Lot 61. An eliminated seat is a valid attack target while it still has an attack queued on you (corpse riposte, L68-07), and likewise for Thief. Absorber may target an eliminated seat whose absorb window is open. Living Invisible seats are excluded (L65-02). Base Card Thief, Upgrade Point Thief and Spy Thief need a target but their upgraded versions do not (L66-01 / L71-01). — look in: `apps/client/src/screens/table/attack-targets.ts`, `apps/client/src/screens/table/card-actions.tsx:160-196 (aliveOpponents / absorberOpponents / attackOpponents / thiefOpponents)`, `apps/client/src/screens/table/table-helpers.ts:96-111 (cardPlayNeedsTarget)`, `apps/client/src/screens/table/card-actions.tsx:212-222 (Invisibility pacifist lock on Use)`
6. A lobby error has no dismiss control and leaks into the table. The lobby shows the reject inline but never clears actionReject. The error survives every lobby stateUpdate, and once the match starts, TableScreen opens IllegalActionDialog with the old lobby message. — look in: `apps/client/src/net/use-room-connection.ts:237 (error kept while actionReject !== null), 244-289`, `apps/client/src/screens/lobby.tsx:106-111 (inline role=alert, no dismiss)`, `apps/client/src/App.tsx (Lobby gets no onDismissActionReject; Table and End do)`, `apps/client/src/screens/illegal-action-dialog.tsx`
7. Dismissal gestures that send intents, and the dialog interaction contract. Pressing Escape or clicking the backdrop on the claim-seat picker equals Stay, and for a walk-in that sends STAY_SPECTATING, which unfogs hands. The picker reappears only when the set of claimable seats changes. Every Dialog closes on Escape and on backdrop click by default, except the sub-choice dialog, which cannot be dismissed. Dialogs trap Tab focus, restore focus on close and follow the visual viewport. Enter submits the create, join, solo, tutorial and chat forms. Double-clicking a Shop tile buys the card immediately. There are no other keyboard shortcuts. — look in: `apps/client/src/App.tsx:80, 109-133 (claimDismissedKey, onStay -> staySpectating)`, `apps/client/src/screens/claim-seat-dialog.tsx:43 (onClose={onStay})`, `apps/client/src/design/components/dialog.tsx:74, 108-165 (Escape, overlay, focus trap, visualViewport)`, `apps/client/src/screens/table/sub-choice/sub-choice-host.tsx:144-145`, `apps/client/src/screens/table/shop-dialog.tsx:282-288 (onDoubleClick buys)`, `apps/client/src/screens/table/chat-log.tsx:62 (form submit)`
8. No UI exists while another seat resolves a sub-choice. sub-choice payloads go to one player only and no public field says who is choosing. Examples: kill rewards after an elimination, the two simultaneous kill picks after a forfeit (L71-01), a Curse caster choosing which of YOUR active cards to drop (L69, slotOwnerPlayerId differs from the chooser), Mirror. Everyone else just sees the turn clock. — look in: `packages/shared/src/protocol/messages.ts (SlotDropChoiceRequiredPayload.slotOwnerPlayerId; sub-choice events go to one player)`, `packages/shared/src/protocol/state-view.ts (no public pending-choice field)`, `apps/client/src/screens/table.tsx:1103-1111 (subChoiceLabel only for your own sub-choice)`, `apps/server/src/rooms/game-room.ts:2416-2930 (sub-choice timers)`
9. Reload behaviour and Home failure states. The reconnect token is written to sessionStorage but read only after an unexpected socket drop. A full page refresh mid-game lands on Home with no Rejoin prompt; the seat sits disconnected until the player rejoins by code and claims it. Join and create failures show only as inline text: protocol mismatch ('Reload the page', with no button), nickname required, table full, spectate full, room not found, server unreachable, kicked. — look in: `apps/client/src/net/use-room-connection.ts:369-410 (onLeave manual reconnect), 784-804 (persist/read/clear token; nothing reads it on mount)`, `apps/server/src/rooms/game-room.ts:440-490 (join ServerError messages)`, `apps/client/src/screens/home.tsx:830-836 (inline error)`, `apps/client/src/screens/status-labels.ts`
10. Gaps in the chat streams (Lot 70). A walk-in spectator in the lobby gets a working chat box, but those messages land in the side stream, which seated lobby players never receive. Nothing tells the spectator. Living players get no sign that a side stream exists. New messages are not announced (no aria-live), and the only signal is the unread badge on the table chat icon. The finished board shows a frozen chatMessages snapshot from finalTable. — look in: `apps/server/src/protocol/build-view-for.ts:195-199 (lobby reader: readerIsEliminated false), 653-657`, `packages/shared/src/protocol/table-chat.ts (chatMessagesForReader)`, `apps/client/src/screens/lobby.tsx:228-238 (canWrite always true)`, `apps/client/src/screens/table/chat-log.tsx:82-101 (side lines italic with '(role)')`, `docs/spec_bataille_des_cartes_en.md §6 Chat (line 261)`
11. REMOVE_BOT is wired in the hook but has no UI. The hook exports removeBot and sends REMOVE_BOT, but App never takes it from the hook; the host removes bots with Kick (KICK_PLAYER) through the same confirm dialog. — look in: `apps/client/src/net/use-room-connection.ts:172, 506-508, 718`, `apps/client/src/App.tsx:33-69 (removeBot not destructured)`, `apps/client/src/screens/lobby.tsx:184-213 (Kick on bots)`, `packages/shared/src/protocol/messages.ts (REMOVE_BOT)`
12. Shared rendering pieces and the art catalog are not inventoried. Card has full, face and thumb detail plus activated art. EffectTextWithIcons and effect-text-tokens turn resource phrases in catalog text into inline icons (L51-12). Resource captions are visible on the dock and hidden for screen readers elsewhere. dialog-width sets dialog widths. Tooltip is unused. asset-lookup maps kit portraits (Gambler art added after Lot 61), card art in base, upgraded and activated forms (Roulette activated added after Lot 61), card backs per type, the opponent placeholder and resource icons. Two constraints in the code: never import *(dead).png, Draw.png or *_button.png; and Sentence has no activated PNG, so requesting one throws and blanks the table. — look in: `apps/client/src/design/components/card.tsx`, `apps/client/src/design/components/effect-text-icons.tsx`, `apps/client/src/design/components/effect-text-tokens.ts`, `apps/client/src/design/components/resource-captions.ts`, `apps/client/src/design/components/dialog-width.ts`, `apps/client/src/design/components/tooltip.tsx`, `apps/client/src/design/asset-lookup.ts`, `apps/client/src/screens/table.tsx:1228-1233 (Sentence activated-art warning)`, `apps/client/src/assets/{backs,cards,icons,kits}`
13. Cross-cutting mobile input rule: every text input must be at least 16 px (text-base) so iOS Safari does not zoom on focus. This was fixed for chat after Lot 61 (6372d04). Related: the viewport meta has no maximum-scale, and the Dialog and table measure visualViewport for the on-screen keyboard. — look in: `git show 6372d04 (apps/client/src/screens/table/chat-log.tsx)`, `apps/client/src/screens/home.tsx:51-56 (inputClassName text-base)`, `apps/client/index.html`, `apps/client/src/design/components/visual-viewport.ts`, `apps/client/src/feedback/feedback-dialog.tsx:231-250 (textarea/input)`

## Audit open questions (raw)

Numbered as referenced by `technical_spec_v7.md` §13 (disposition table).

1. [home-onboarding] 'Remove v35': no 'v35' text exists in the pre-room or onboarding area; Home and Lobby dropped 'Protocol vNN' in L51-03. The only protocol numbers players can see are on Game over ('Protocol v{PROTOCOL_VERSION} · Code … · N turns', screens/game-over-dialog.tsx:255, currently v45) and in the server's join-error text shown on Home ('Protocol version mismatch: the server speaks vNN … Reload the page.'). Which one should go?
2. [home-onboarding] Soft gate trigger: the code opens How to play on the first hub path click (Play online / Play solo / Tutorial); spec v6 §5.1/§9 says 'submit'. If V7 merges paths or moves the nickname, where should the gate fire?
3. [home-onboarding] Solo turn time: the panel shows 60s by default, but if the slider is never moved no time is sent and the server keeps TURN_DURATION_MS (for example 300 s in playtests). Should V7 show an 'auto' or server value, or always send the time?
4. [home-onboarding] Online lobby slider: every slider step sends setLobbyRules immediately (onChange). Is it acceptable for V7 to send only on release or on Close? That keeps the protocol but changes how often the intent goes out.
5. [home-onboarding] Copy that predates later lots. RandomKitDetails says 'one of the 16 kits … the same way as before this picker existed' and ignores exclusions. The How to play 'Kits' text says 'In the lobby you may pick a kit or keep Random' and does not mention host exclusions or Random only. The Online 'Create' helper says 'Start from the lobby when everyone is seated' and predates guest Ready. The tutorial launch shows 'Starting solo game…'. Rewrite these?
6. [home-onboarding] Feedback: a successful send closes the dialog with no confirmation, and Esc or overlay still cancels during 'Sending…', so the report can still be saved after a cancel. Should V7 add a sent confirmation and lock dismiss while sending?
7. [home-onboarding] Accessibility: the Opponents, Difficulty and Feedback Kind selectors show selection only by green or orange color, with no aria-pressed or radio semantics. The Home mode transition ignores prefers-reduced-motion. KitFaceRow alt text is the raw kit id ('scientific portrait'). Can V7 fix these as part of the presentation work?
8. [home-onboarding] Busy gaps: during a solo launch the Table rules gear and the What's new 'New' button stay clickable while everything else is disabled. Should they be disabled too?
9. [home-onboarding] Persistence: the nickname is not kept across reloads, and reloading during a game returns to Home because the reconnect token is used only after a socket drop. Stay out of scope, since V7 is presentation-only?
10. [home-onboarding] What's new with localStorage blocked: the popup reopens on every Back to the hub and every How to play close. Acceptable?
11. [home-onboarding] Source-text tests lock exact strings and classes in home.tsx: whats-new-dialog.test.ts (bg-cta-red, no bg-cta-green, data-whats-new-button near variant="green" and 'absolute', useState<WhatsNewScope>('current'), HubView without onOpenWhatsNew), feedback-surfaces.test.ts, visual-viewport.test.ts ('overflow-y-auto overscroll-contain', no 100dvh), admin-route.test.ts and tutorial-hints-independence.test.ts. how-to-play-content.test.ts asserts that the designer PNGs are absent. The Definition of Done forbids weakening tests, so does the designer approve rewriting these assertions for V7?
12. [home-onboarding] Theme and art: the tokens are light-only with no dark mode, the How to play screenshots folder is empty and designer-owned, and HomeArt reuses V1 card and kit art. Will V7 supply new art or screenshots, or keep the existing assets?
13. [home-onboarding] Hub structure: Play online, Play solo and Tutorial are three equal green CTAs, with How to play and Feedback as two equal orange ones; Beta and New are two separate top-right elements. Is V7 free to regroup these, as long as each function, the nickname-inside-path rule and the 'no Inbox/Admin/protocol/Reset help on the hub' rules stay?
14. [lobby-rules-chat] The relayed user message says 'ok pour retirer v35'. Nothing in the lobby area (client lobby, rules, chat, claim) shows or references 'v35'. PROTOCOL_VERSION is 45 (packages/shared/src/protocol-version.ts), and v35 is the Lot 60 recap bump. The parent should confirm which surface 'v35' means before removing anything.
15. [lobby-rules-chat] Guests only see icon-level rules: a clock with seconds, tiny grayscale kit faces and a Random mark. There are no kit names and no read-only detail. Should V7 give guests and walk-ins a read-only rules sheet (same data, no new intent)? Excluded state is conveyed only by grayscale, and the portrait alt is the raw kit id.
16. [lobby-rules-chat] Changing rules after a guest pressed Ready keeps them ready (handleSetLobbyRules never resets guestReady), so the host can start right away on new rules. The spec says guests see rules 'before they press Ready'. Should a rules change un-ready guests (server change) or at least flag the change (client only)?
17. [lobby-rules-chat] When the host excludes a kit a guest picked, the server silently resets that pick to Random. Should V7 tell the guest?
18. [lobby-rules-chat] The host editor applies every change immediately. The slider sends setLobbyRules on every step, and there is no Save/Cancel or 'back to server default'. Once a time is sent, turnTimeOverridden latches. Is committing on slider release acceptable in V7 (same intent, fewer messages)?
19. [lobby-rules-chat] Table timer progress is hardcoded to 60s (apps/client/src/screens/table.tsx about line 1004) while turn length is now host-set from 5 to 180. PlayingStateView carries no turn length and the protocol must not change. Should the redesign derive length from the first turnStarted deadline, from the cached lobby view, or drop the proportional bar?
20. [lobby-rules-chat] Rules are never recalled at the table or on Game over, although FinishedStateView.lobbyRules exists. Should V7 show house rules in-match (only possible from client memory of the lobby view) and on Game over?
21. [lobby-rules-chat] In the lobby, a walk-in spectator's input is enabled, but their lines are role 'spectator', so seated players never see them. Intended, or should the walk-in input be hidden or labeled in the lobby?
22. [lobby-rules-chat] The tutorial table renders the Chat control, and the server accepts sendChat during the tutorial match (canSendChat inGame is true). Lot 70 only excludes the tutorial from rules. Should tutorial chat stay?
23. [lobby-rules-chat] Kit picker copy (RandomKitDetails) says 'one of the 16 kits at random', which is wrong when kits are excluded. The picker also hides excluded kits instead of graying them, unlike the rules strip. Which treatment should V7 use?
24. [lobby-rules-chat] After 'Stay spectating' or 'Keep this seat', the claim picker cannot be reopened until the claimable set changes. Yet the walk-in lobby copy says 'Claim a disconnected seat if one is listed'. Should V7 add a reopen control (client only)?
25. [lobby-rules-chat] Lobby rows show no seat color (chat nicknames and the claim dialog do) and no disconnected or reserved marker beyond the red cross. Should V7 add seat color or a disconnected badge to rows? LobbySeatView has no connection field, so only seat color is possible without protocol work.
26. [lobby-rules-chat] Verify the stale lobby reject: lobby ERROR_MESSAGE sets actionReject, the lobby never clears it, and stateUpdate keeps `error` while actionReject is non-null. A lobby reject (for example a choose-kit-excluded race) may persist and open IllegalActionDialog when the table mounts. The lobby has no dismiss for the inline error.
27. [lobby-rules-chat] Verify on the server: when the host leaves the lobby, unseatLobbySeat sets hostSessionId to seats[0], which can be a bot seat (apps/server/src/rooms/game-room.ts about line 1544). The remaining humans would then have no Start.
28. [lobby-rules-chat] Sharing is copy-code only, with no invite link or Web Share. Should V7 add a share link? A ?code= prefill on Home would be client-only; join still needs a nickname.
29. [lobby-rules-chat] Lobby controls are not disabled while status is 'reconnecting'. Should V7 show a disabled or overlay state?
30. [lobby-rules-chat] On claim, the claimant inherits the reserved seat's hidden kit pick, because kitSelections is keyed by seat id. Is that intended?
31. [lobby-rules-chat] The solo menu shows 60s from defaultLobbyRules while includeTurnTime is false, but the server then uses the TURN_DURATION_MS env default, which can differ. The online lobby shows the server-effective seconds.
32. [lobby-rules-chat] Out of the lobby area, found while reading: decisions.md 2026-10-06 Lot 71 says 'Each living player with an active Poison is paid once', while the rules spec §6 Elimination, backlog L71-01 and frontend.md say active Poison does not pay. This is an unreconciled doc conflict.
33. [table-core] Turn timer vs lobby rules (Lot 70): table.tsx:1004 divides the remaining time by a hardcoded 60 s, but the host can set 5–180 s and TURN_DURATION_MS can override it. PlayingStateView has no lobbyRules or turnTimeSeconds. Should V7 (a) derive the bar's full length from the first turnStarted deadline, (b) add a view field, which would bump the protocol even though 'protocol stays', or (c) drop the bar and keep only seconds? Related: should the table show the active house rules (turn seconds, excluded kits, random-only) anywhere? Today they appear only in the lobby.
34. [table-core] Spy semantics drift: since Lot 69, base Spy carries live resources only and Spy+ adds kit, hand and specials (build-view-for.ts). Several client comments and tests still describe the pre-69 model: opponent-seat-resources.ts, its test, opponent-reveal-dialog.tsx, resource-icon.tsx, and the SpiedPlayerView doc in state-view.ts. Confirm the V7 target: a base-Spied seat shows numbers, a hidden kit and no reveal dialog. Should a base Spy get any visual marker of its own?
35. [table-core] persistent-incoming.ts builds presentation chips for Imposition / Points Generator / Curse but has not been wired into the table since commit c0e9668 (Lot 14), while frontend.md still says those chips render. Should V7 show them in Incoming / Waiting, or should the doc and the dead module be removed?
36. [table-core] activeAttackBlock (public) and self.attackBlockCharges (private) are never rendered, and since L68-03 Attack Thief no longer keeps a charge. Should V7 show an 'Attack Thief armed' state, or are these fields dead?
37. [table-core] Bug to avoid copying: inspecting an opponent's base Shield shows an Upgrade button when the POV has its own base shield and an upgrade point, because both use ACTIVE_SHIELD_INSTANCE_ID (activeUpgradeInstanceId). Clicking it upgrades the POV's own shield. Should V7 offer Upgrade only on own actives?
38. [table-core] Walk-in spectators still see the economy bar (disabled), with a Draw value from the filler kit 'untouchable', and can open a Shop built on filler self data. Hide the economy bar for spectators in V7?
39. [table-core] Disabled-state reasons are mostly silent: Use greyed by own Invisibility, Card Transformer with no consumable card, Unspy greyed for no spy / under 10 points / off-turn, an empty target list with Confirm disabled, and Shop tiles disabled off-turn (they cannot even be selected to preview a price). Should V7 explain disabled reasons explicitly?
40. [table-core] Deactivate (Lot 69) is gated on isMyTurn only, not on actionsLocked, so it shows while a sub-choice is pending; the server revalidates. Keep that, or lock it like the other actions?
41. [table-core] Since Lot 69, an Invisibility-only seat renders an empty turn-flow-controls row (border only). Is that just an artifact to drop?
42. [table-core] Slot-drop picker: clicking a tile commits immediately with no confirm, and the panel never says what Cancel does (in the Curse-on-opponent case the Curse is not applied and the card is restored). Keep one-tap commit? Does the Cancel copy need wording from the designer?
43. [table-core] Other seats get no indication that the active player is inside a sub-choice (reward / Mirror / slot-drop picks): subChoice is sent only to the chooser, so their timer simply keeps running. Should V7 show a public 'choosing…' state? That needs public data, which the view does not carry today.
44. [table-core] Assassin multi-attack keeps the previous selection after Cancel and lists only hand attacks (not special attacks such as MEGA ATTACK). Is that intended?
45. [table-core] There are two '?' controls in the tutorial: How to play in the turn strip and the coach reopen toggle. Should V7 tell them apart visually?
46. [table-core] Own kit portrait never shows the eliminated treatment. The opponent reveal does not show eliminationReveal.shieldIsUpgraded. A revealed opponent's kit traits cannot be opened (only the own-kit inspect exists). Should V7 add opponent kit inspect for Spy+ / dead seats? It is catalog-only data, so no hidden info.
47. [table-core] A Spied Gambler's drawGain is delivered to Spy viewers but never shown on the opponent seat (it is used only by FX). Should V7 surface it for Spy viewers?
48. [table-core] Chat unread resets to 0 on every remount (reconnect, live table to finished board, lobby to table) because seenCount starts at messages.length. Is that acceptable for V7?
49. [table-core] Esc closes every stacked Dialog at once, because each Dialog listens for keydown on the document; only the deactivate confirm handles this explicitly. Should V7 define layered Esc behavior?
50. [table-core] Buy special shows a hardcoded 20 points in the client rather than a catalog constant. Should V7 read it from shared?
51. [table-subchoice-fx-help] Lot 69 made base Spy reveal live resources only; kit, hand and specials need Spy+. Three locked copies still say a plain Spy reveals the kit: hint 'hidden-kit' ('You cannot see their kit until you use Spy to reveal it'), the tour step 'Opponent' ('Their kit and cards stay hidden until Spy reveals them'), and spec v6 §5.2. Should V7 update these strings? They are pinned by hint-copy.test.ts and spec §5.2.
52. [table-subchoice-fx-help] Hint 'incoming-thief' fires for every '*-thief' card (Card Thief, Spy Thief, Upgrade Point Thief). Its copy says 'steal uo to 10 points… counter it with Thief', which is wrong for Card Thief (takes a card) and Spy Thief (all points, no cap, Lot 71). Should it get per-card copy, or stay as is?
53. [table-subchoice-fx-help] HINT_COPY carries designer-locked typos ('you kit', 'you hand', 'stronger that', 'ressources', 'atteign', 'uo to', 'opponent !'). Should the redesign reproduce them verbatim, or may the designer fix them?
54. [table-subchoice-fx-help] Steal-pick after Lot 69: the server lets the thief choose under any Spy relation, but the client only knows card identities under Spy+. A base-Spy thief therefore picks blind among identical 'Hidden card' versos. Is that intended?
55. [table-subchoice-fx-help] Reward picker: both choices can be 'A card' and both default to the same first card, which the server rejects (reward-card-already-chosen) and then re-prompts. With simultaneous pickers (Lot 71), a card taken by another rewardee also triggers reject and re-prompt instead of a live update. Can V7 block the duplicate pick on the client and grey out taken cards without a protocol change, or should it keep today's behavior?
56. [table-subchoice-fx-help] Slot-drop Cancel also shows when the Curse user picks the victim's slot. What does Cancel mean in that case (the Curse is not cast and returns to the caster's specials?), and what should the copy say? Slot-drop is also the only picker where a tile click commits with no Confirm. Keep that?
57. [table-subchoice-fx-help] Non-choosers get no signal that someone is in a sub-choice (Mirror, rewards, slot-drop, reanimation). No public field exists, so adding a 'X is choosing' indicator would need protocol. Confirm V7 does not add one.
58. [table-subchoice-fx-help] Sub-choice expiry: the dialog is not closed locally when the deadline passes. It sits at '0s left' until the next turnStarted or gameOver. Keep, or auto-close at 0s on the client?
59. [table-subchoice-fx-help] The sub-choice Dialog is a full modal: the player cannot peek at Incoming, opponents or the log while choosing. frontend.md still says cards stay clickable during Mirror and reward prompts, which no longer matches the code. Should V7 allow a minimize or peek while intents stay locked?
60. [table-subchoice-fx-help] Tutorial highlights miss elements that are not rendered. The tour 'incoming' step has no element at index 0 because Incoming is empty. The tour 'opponent' and 'action-log' steps and the Look portrait highlight do nothing when opponents or log are collapsed into buttons. The 'hidden-kit' and 'incoming' hint anchors then fall back to bottom-left. Should V7 give every region an always-present anchor?
61. [table-subchoice-fx-help] Spec v6 §5.4 says tutorial Spy and Thief incoming chips are red. The code follows L51-07: every real pending chip (Incoming and Waiting, all modes) is ringed, red only for attack, Sentence and Mirror cards, orange for Spy and Thief. Confirm L51-07 wins for V7.
62. [table-subchoice-fx-help] Dead or legacy code in this area: tutorialIncomingThreatIds / isTutorialIncomingThreatCard / tutorialShopSpotlight; TutorialHighlight 'opponent-portrait' (no step uses it); TableFxContext.mirrorHighlightIds; filterActionLog / groupByTurn / entryInvolvesPlayer / ACTION_LOG_KINDS; the 'X dies by Gambling' line (unreachable since the Lot 66 wipe). May V7 drop these?
63. [table-subchoice-fx-help] eliminationBeat is not seeded on mount, so a reconnect or the finished board replays a red beat for every past elimination. Intended or a bug to fix during V7?
64. [table-subchoice-fx-help] Many tests in this area read source text with readFileSync and assert literal code: hint-overlay.test.ts, tutorial-hints-independence.test.ts, tutorial-callout.test.ts, action-log-panel.test.ts and every sub-choice/*.test.ts (for example the exact onSkipAll arrow body, "hintAnchor: 'reward'", 'z-[110]', "embedded ? '' : 'h-full'"). A visual rewrite will break them without any behavior change. May V7 replace them with behavior tests?
65. [table-subchoice-fx-help] Cross-area, related to the user's note that host rules stay (excluded kits, random-only, turn time). The table turn-progress bar divides by a fixed 60_000 ms (table.tsx ~L1004), so with host turn times of 5–180 s (Lot 70) the bar is wrong; only the seconds label is right. PlayingStateView carries no lobbyRules or turnTimeSeconds, so showing the rules or the true duration in-game would need protocol. The tutorial ignores lobby rules (setLobbyRules rejected). Should the lobby/table owner of V7 handle the bar?
66. [table-subchoice-fx-help] hasUnspiedLivingOpponent counts a base-Spy seat as spied, but the 'hidden-kit' DOM anchor treats base-Spy seats as still hidden (no Spy+ reveal). Which definition should V7 use for the hidden-kit hint?
67. [end-feedback-admin] Protocol line removal: the user agreed this session to drop it ('ok pour retirer v35'). The only player-facing protocol display left is the Game over line `Protocol v{PROTOCOL_VERSION} · Code {gameCode} · {N} turns` (apps/client/src/screens/game-over-dialog.tsx). PROTOCOL_VERSION is now 45, not 35. Confirm this line is what was meant, and say whether the game code and turn count stay.
68. [end-feedback-admin] Feedback success: after a successful Send the dialog just closes, with no toast or thank-you. Should V7 add a confirmation, or keep the silent close?
69. [end-feedback-admin] Esc or overlay during an in-flight Send dismisses as Skip (ask mode) or Cancel (manual) and drops the response, even though the Skip/Cancel button is disabled while busy. In ask mode with a pending leave this disconnects. Keep, or block dismiss while busy?
70. [end-feedback-admin] Opening Feedback from the Game over 'Feedback' button dismisses stats without the post-close ask, so the ask-once appears only on hub leave or Play again, and a manual Cancel does not mark asked. Is that intended for V7?
71. [end-feedback-admin] Feedback Kind buttons have no aria-pressed or radio semantics (the About chips do). Can V7 change this to a proper radio group as a presentation-only change?
72. [end-feedback-admin] Play again shows no pending or disabled state after the click (the view swap is the only feedback). Should V7 add a waiting state?
73. [end-feedback-admin] Admin Matches and Database fetch only page 1 (50 rows), though the API accepts page and pageSize. 'Showing X of Y' and 'page 1' have no pager. Add pagination in V7, or keep page 1?
74. [end-feedback-admin] Admin 429 (too many wrong passwords) and any other non-401/404/503 status show the generic 'Could not load'. Should there be specific rate-limit copy?
75. [end-feedback-admin] Admin has no lock or sign-out control. The password stays in sessionStorage until the tab closes or a 401. Add one?
76. [end-feedback-admin] The admin Seat count filter is free text. The server silently ignores values outside 2–8 (apps/server/src/db/admin-filters.ts), so a typo returns unfiltered data with no warning. Turn it into a select of 2–8?
77. [end-feedback-admin] Admin Feedback is inconsistent with the other pages: no page intro, no loading state, no empty state, raw ISO createdAt (others use formatDateTime), and errors without role=alert. Normalize in V7?
78. [end-feedback-admin] Admin match rows are clickable <tr> elements with no keyboard access or role. Fix during the redesign (presentation and interaction only)?
79. [end-feedback-admin] Admin match detail hides fields the API returns: seat points, startedAt, mode, hasBots / isTutorial, and the eliminator in the elimination order. The action-log download has no busy or error state. Show more?
80. [end-feedback-admin] Lot 70 data is not exposed in admin: game_chat_messages is not in the Database allowlist, and match detail does not show excluded_kit_ids / random_only / turn_time_seconds. Adding them needs server changes beyond a visual redesign. Designer decision?
81. [end-feedback-admin] Legacy apps/client/src/screens/inbox.tsx (InboxScreen) is dead code behind the /inbox redirect. Delete it in V7, or leave it?
82. [end-feedback-admin] App renders ClaimSeatDialog next to EndScreen. For a walk-in spectator with claimableSeats on the finished phase, it could stack with the Game over dialog, against the 'dialogs never stack' rule. Confirm the server never sends claimableSeats on finished, or define which dialog wins.
83. [end-feedback-admin] The 'Download action log' Excel on Game over is DEV-only in every mode (technical spec v6 §5.4), so production testers cannot export. Keep DEV-only in V7? The designer path is the admin match detail.
84. [end-feedback-admin] Naming: the finished prompt card says 'Open Stats for the recap', the dock button says 'Stats', and the dialog is titled 'Game over' and closed with 'View board'. Should V7 unify these labels? The copy tests lock 'Feedback', 'Play again', 'Return home', 'Play a real game', 'Tutorial complete' and 'Download action log'.
