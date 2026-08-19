# Technical spec — Card Battle, version 6 (Readability, stranger onboarding, beta feedback)

> Implementation document for V6. It contains **no Classic rule and no Classic value**.
> Rules truth stays `docs/spec_bataille_des_cartes_en.md`. Engine, protocol baseline, and
> Definition of Done stay `docs/technical_spec_v1.md`. Visual language stays
> `docs/technical_spec_v2.md` plus Lot 39 (`docs/backlog_ux.md`). Bots stay
> `docs/technical_spec_v3.md` / `v5.md`. Content stays `docs/technical_spec_v4.md`.
> Sequencing lives in `docs/backlog_v6.md`.
>
> Scoped with the designer on 2026-08-19 (Approach 1). Where this document records a
> decision, it is a direct instruction from that session or an explicit inference flagged
> as such — never an invented Classic rule.

---

## 1. Objective and non-objectives

### Objective

A person who has never touched Card Battle can **start a match, understand delayed
resolution, take legal turns, and send feedback you can read** — without a voice call
walking them through the table.

Three deliverables, in dependency order:

1. **Teaching** — a richer illustrated How to play (soft-gated on first play), an optional
   **scripted 1v1 tutorial** on the real engine, and skippable **first-real-game hints**.
2. **Table readability** — costs as icon + number on every interactive control, no “UP”
   letters, visible resource names, shop-style visual pickers for **every** table prompt,
   phone hands that stay tappable, Leave that still reaches Game over.
3. **Beta feedback** — in-game reports (Home, Table, Game over) stored in Postgres and
   readable on a password-gated `/inbox`. Public URL, visible **Beta** badge, English only,
   no player accounts.

What V6 has to prove:

- a stranger can complete the tutorial and then a real Easy solo game without asking what
  Draw, Incoming, or Upgrade points are
- a tester can send Bug / Confusion / Idea from inside the product, and you can open that
  report in the browser the same day
- Classic play is unchanged: same prices, damage, kits, delay, mutual attacks

### Non-objectives

- **No Classic rule change. No Classic value change.** A confused tester is never grounds
  for changing Tax, delay, kits, or prices. Same clause as V4 / V5.
- **No new competitive mode.** Team, God, and Quick stay out (technical spec v1 §9). The
  tutorial is **Classic with setup overrides**, not a fourth mode (`GameMode` stays
  `'classic'`).
- **No player accounts, no authentication product.** Inbox is one env password. Hints and
  How to play live in `localStorage`.
- **No in-progress game persistence.** A mid-game restart still loses the match.
- **No monetization.**
- **No i18n / French client.** Player-facing copy is English only (designer 2026-08-19).
- **No screenshot upload** on feedback. No 1–5 rating. No Slack / Notion / email ping.
- **No full visual redesign** (that would be another V2). Motion, tokens, and art stay.
- **No generated tutorial art.** How to play screenshots are files **you** drop in; agents
  wire filenames and must not invent images.
- **V5 is not closed by this spec.** Search / belief / arena work may continue. V6 lots
  start at **41** so they never collide with Lots 32–40. Do not start Lot 41 until the
  designer opens `docs/backlog_v6.md`.

---

## 2. Decisions locked 2026-08-19

Recorded here so Lot 41 can copy them into `docs/agent/decisions.md` without re-deriving.

| # | Decision |
|---|---|
| 1 | Teaching is **three layers**: How to play + optional tutorial + first-real-game hints. |
| 2 | How to play is a **soft gate** on the first Play online / Play solo / Tutorial: the primer opens; **Skip** and **Got it** both continue. After that it is a button on the hub **and** the table. It does not auto-open on later visits. This **reopens** the 2026-08-07 “Home only, never gates start” ruling **for V6**. |
| 3 | How to play images are **designer-supplied screenshots**. Agents do not generate art. Existing resource / card icons may sit next to copy. Missing files → omit the `<img>`, never a placeholder drawing. |
| 4 | Tutorial is optional, replayable, Approach 1: same `GameRoom`, `tutorial: true` on create, one scripted bot, real engine. |
| 5 | Tutorial **must** show, at least: Draw (points, not a card), an **economy card (Tax)**, **upgrade**, **counter an incoming attack** (mutual equal Basics cancel — rules spec §6 / golden rule 1), **Spy**, **sell**, **buy**, **a special**, then **kill**. Spotlight early; after the first queued attack of the kill phase, attack + Draw stay legal until the opponent dies. |
| 6 | Tutorial opponent starts at **1 life**. That is safe because the counter lesson uses **equal** Basic vs Basic (both cancel). Upgrade and the killing attack come **after** that cancel. **Do not** upgrade Basic before the counter — unequal damage would leave a 3-damage pending and finish the 1-life seat too early. |
| 7 | Completing the tutorial does **not** dismiss first-real-game hints. The first Solo or Online Classic match still gets them. Skip-all remains. Tutorial itself uses coach copy, not the hint overlay. |
| 8 | Feedback is always on Home, Table, and Game over. Game over **asks** once per finished match (skippable). |
| 9 | A report is Bug / Confusion / Idea + message + optional contact. Server attaches game code, nickname, screen, protocol, `playKind`, and a public log tail when in a match. No seed on the client or in the report row. |
| 10 | Designer inbox is `/inbox` in the same SPA, env password, not linked from the player hub. Postgres table `feedback_reports`. |
| 11 | Table pass: **no “UP” letters** on chrome; upgrade points are the existing icon + number. **Every interactive cost or yield** is icon + number. Action-log **prose** may still say “points”. |
| 12 | **Every** table prompt uses a shop-style visual picker (card faces, seats with name + seat color). Mirror / Incoming-related choices show the **attacking card art** plus the source player’s name and color. |
| 13 | English only. Open URL. Visible **Beta** badge. No hub password. |
| 14 | Classic frozen. Tutorial-only exceptions are listed in §5.3. Client disable is **not** validation (golden rule 8): the server filters tutorial-legal actions. |
| 15 | Architecture: **Approach 1** — one room, one protocol bump (28 → 29), HTTP feedback on the existing Express server, hints in `localStorage`. |

Inference flagged as such (not a separate designer vote, required by the locked beats):

- **Draw** is in the tutorial even though the “at least” list named economy cards rather than
  Draw. Playtest: strangers think Draw deals a card. First-game hints still teach it; the
  tutorial would be dishonest without it.
- **Human kit = Indestructible**, **opponent kit = Ghost**. Indestructible’s only special is
  Super Regeneration (self, non-lethal, obvious). Ghost is Spy-able (Untouchable is immune
  to Spy — unusable as the tutorial victim). Catalog specials match the loadout, so kit
  inspect does not advertise a card they do not hold.
- **Tax is the economy card.** Buy / sell / upgrade are separate beats on the same list.
- **Counter = mutual attacks**, not Mirror and not Block. Equal Basic vs Basic on the
  retaliating (human) turn cancels both (golden rule 1). Mirror remains a first-real-game
  hint / How to play sentence, not a tutorial beat.

---

## 3. What exists today (gaps V6 closes)

| Asset | Gap |
|---|---|
| How to play dialog (hub only) | Dense text, no screenshots, no first-turn “do this”, absent on the table, never in the start path |
| Table | Jargon (Buy UP, Incoming, Hidden kit), resource names `sr-only` / `title` only (invisible on touch), `CARD_BAND_ABS_MIN_W = 24` stamps on phones |
| Target / Mirror / multi-attack / steal / rewards / … | Radio lists and thin rows, not shop-like faces |
| `leaveGame()` | Sets `intentionalLeave` and `room.leave(true)` immediately — the leaver **never** receives `phase: 'finished'` |
| Postgres | `finished_games` only. No tester comments |
| Hub | “Protocol v28” and “Not connected” read as errors. No Beta framing. No Tutorial path |
| Game over | Stats + Excel. No “how was this?” |

Lot 39 already shipped seat colors, `CostDisplay` on some chrome, IllegalActionDialog, threat FX.
V6 **extends** that pass; it does not redo it.

---

## 4. Architecture (Approach 1)

```
Hub ── How to play (soft gate, screenshots you supply)
    ├─ Play online (unchanged Classic)
    ├─ Play solo  (unchanged Classic)
    └─ Tutorial   create(tutorial: true) → 1 scripted bot → startGame
                      │
                      ▼
                 GameRoom (same class)
                      │  playKind: 'tutorial'
                      │  applyTutorialSetup after Classic deal
                      │  tutorial-script-v6 policy (registry)
                      │  tutorialIndex + legal-action filter
                      ▼
                 Table + coach overlays (client copy keyed by index)

Feedback:  POST {server}/api/feedback   (works with no room — Home)
Inbox:     GET  {server}/api/inbox      + SPA /inbox (password header)
Hints:     localStorage, first Classic playing view only
```

- **No second Colyseus room type.**
- **No fake tutorial UI that pretends to be the engine.**
- Feedback is **HTTP**, not a Colyseus message (Home has no room).
- Mount `/api/*` **before** `mountStaticSpa`’s catch-all (`apps/server/src/http/static-spa.ts`).
- Local Vite (`:5173`) talks to `:2567` today (`resolve-server-url.ts`). Feedback `fetch`
  uses that same base URL. Enable CORS on the feedback/inbox routes for the Vite origin
  in development; production same-origin Coolify needs none.
- **One** `PROTOCOL_VERSION` bump for the whole of V6: **28 → 29**, in L41-02. No later
  V6 task bumps it.

---

## 5. Teaching

### 5.1 How to play

**Surface:** controlled `Dialog` (existing). Reachable from hub, from the table (new), and
as the **soft gate** before the first Online / Solo / Tutorial submit.

**Storage:** `localStorage` key `card-battle.v6.howToPlaySeen` = `'1'` after Skip or Got it.
Hub **Reset help** clears this and the hint keys (designer retest).

**Copy:** still a primer, not the full rules spec. Must define, in this order, with the
screenshot slot beside the section when the file exists:

| Section id | Title | Must say | Screenshot file (designer) |
|---|---|---|---|
| `goal` | Goal | Last player alive wins. Lives never exceed 25. | — |
| `table` | The table | Dock is yours; opponents are hidden until Spy; Incoming is delayed hits on **you**. | `apps/client/src/assets/how-to-play/table-overview.png` |
| `delay` | Delayed resolution | An action aimed at an opponent resolves on **their** next turn, **after** they have acted. You never lose lives off-turn. That delay is how you counter or heal. | `how-to-play/delayed-resolution.png` |
| `turn` | One action | Each turn: exactly one of draw, play, buy, sell, upgrade, or use a special. **Draw grants points equal to your kit’s Draw value — it does not deal a card.** | `how-to-play/one-action.png` |
| `resources` | Resources | Lives, Points, Upgrade points (icon, never “UP”), Shield (attacks only; Tax ignores it). | `how-to-play/resources.png` |
| `hidden` | Hidden information | Kit, hand, exact resources stay private. Every **action** is public. | `how-to-play/hidden-kit.png` |
| `shop` | Shop | Buying a shared card costs **double** its play cost. Selling yields the play cost. Upgrade spends 1 upgrade point. | `how-to-play/shop.png` |
| `modes` | Online, solo, tutorial | Online = code + friends (bots may fill). Solo = bots. Tutorial = optional scripted 1v1. | — |

Beta line on the hub (replaces the protocol headline): **“Beta — rules are stable. Tell us
what is confusing.”** Protocol version may stay as a tiny footer or `title` tooltip — not
the first thing a stranger reads. “Not connected” is not shown as an alarm on the idle hub;
idle is unlabeled or “Ready”.

### 5.2 First-real-game hints

Skippable overlays on the **first Classic** `playing` view per browser (`playKind !==
'tutorial'`). Completing the tutorial does **not** set these done.

`localStorage` key `card-battle.v6.hints` JSON:

```ts
{ dismissed: HintId[]; skipAll: boolean }
```

| `HintId` | When it fires | One-line copy (normative) |
|---|---|---|
| `your-turn` | POV becomes active the first time | Your turn — take **one** action. |
| `draw` | First time the dock is shown | **Draw** gives points, not a card. |
| `resources` | Same | Heart lives · diamond points · upgrade-point icon · shield (attacks only). |
| `incoming` | First **real** Incoming targeting POV (not presentation persistents) | This hits **after you act** on your next turn. You can attack back, Shield, or Mirror. |
| `hidden-kit` | First time an unspied opponent is visible | You cannot see their kit until Spy (or death). |
| `shop` | First time Buy is enabled on your turn | Shop prices are double the play cost. |
| `leave` | First time Leave is visible | Leave is a **forfeit**. |

Controls: **Got it** (dismiss this id) · **Skip all**. Table **How to play** stays available.
Do not block the turn timer; do not require dismissing to act (the overlay is pointer-events
on the coach card only, not a full-screen trap — except the first `your-turn` may sit beside
the existing Your-turn flash, not replace it).

### 5.3 Tutorial — setup overrides

`GameMode` remains `'classic'`. `GameState` / views gain `playKind: 'classic' | 'tutorial'`
(default `'classic'`). Tutorial overrides run **once** after the normal start/deal, in
`applyTutorialSetup(state)` called only from the room when `playKind === 'tutorial'`. Classic
start tests must stay green **without** fixture edits.

**Room:** `RoomJoinOptions.tutorial?: true`. Create from Home **Tutorial** (solo-shaped: no
lobby flash). Server: at most one human; auto-seat one bot on `startGame` if missing; reject
a second human join (`tutorial-room-closed`). Ignore `addBot` difficulty; the bot policy id
is `tutorial-script-v6` (registry). **Never** edit `heuristic-v4` or its freeze test.

**Turn timer:** 300_000 ms in tutorial rooms regardless of `TURN_DURATION_MS`, so a short
prod timer cannot fail the lesson.

**Fixed seats after override:**

| Seat | Kit | Lives | Points | Upgrade points | Shield | Draw (kit) | Hand (exact instances) | Specials |
|---|---|---|---|---|---|---|---|---|
| Human | `indestructible` | 12 | 10 | 1 | 0 | 1 | Tax **upgraded** (kit `alwaysUpgraded`), Spy, Basic attack, Basic attack, Strong attack | Super Regeneration (not upgraded) |
| Bot | `ghost` | **1** | 1 | 0 | 0 | 1 | Basic attack | none |

Strip any other cards the Classic deal produced. Bot nickname may stay the usual generator
(`Alpha`). Human nickname is whatever they typed.

**Why 1 life works:** the incoming Basic (1) is **cancelled** by the human’s answering Basic
(1) on the human’s counter turn. No damage lands. Spy / sell / buy / upgrade / Super
Regeneration do not cut lives. The **kill** Basic (1) then finishes them after they Draw.

**Why not Assassin:** Sentence can randomly eliminate, including the human. Multi-attack is
a second lesson. Indestructible’s catalog special **is** Super Regeneration — kit inspect
matches the dock.

### 5.4 Tutorial — script (normative order)

`tutorialIndex` is an integer on the room and on every playing view (public). Coach copy is
**client-only**, keyed by index — do not put long strings on the wire.

Human is first in `turnOrder`.

| Index | Whose turn | Legal action (server filter) | Coach title / body (client) |
|---|---|---|---|
| 0 | Human | `draw` | Draw | Draw gives **points**, not a card. Draw once. |
| 1 | Human | play **Tax** | Economy | Tax spends **1 life** (shield does not stop it) and gives points. Play Tax. |
| 2 | Bot | play **Basic attack** → human | — (no coach on the bot) |
| 3 | Human | play **Basic attack** → bot | Counter | Incoming is delayed. Play Basic attack back at them. **Equal** damage cancels **both** attacks. |
| 4 | Bot | `draw` | — | (queued Basics cancel here as mutual equal — golden rule 1) |
| 5 | Human | play **Spy** → bot | Spy | Spy reveals their kit and cards **when it resolves on their turn**. Play Spy. |
| 6 | Bot | `draw` | — | Spy resolves; human may open the opponent portrait |
| 7 | Human | **sell** Strong attack | Sell | Selling yields the play cost in points. Sell Strong attack. |
| 8 | Bot | `draw` | — |
| 9 | Human | **buy** Basic attack from the shop | Buy | Shop price is **double** the play cost. Buy Basic attack. |
| 10 | Bot | `draw` | — |
| 11 | Human | **upgrade** the Basic just bought (fallback: any owned non-upgraded Basic) | Upgrade | Spend **1 upgrade point** (the icon). Upgrade that Basic — it will deal 3, but we will not use it to finish them. |
| 12 | Bot | `draw` | — |
| 13 | Human | play **Super Regeneration** | Special | Specials are kit cards, usually one use. Play Super Regeneration (gain lives, cap 25). |
| 14 | Bot | `draw` | — |
| 15+ | Human | play a **non-upgraded Basic** → bot, or `draw` if they cannot afford it | Finish | They have 1 life. Queue a Basic attack. It hits **after they play**. |
| 15+ | Bot | `draw` only | — | Resolve the kill; 2p game-ending elim **skips rewards** (existing ruling). |

After index 14, `tutorialIndex` stays at 15 (kill phase) until `phase: 'finished'`.

**Spotlight:** indices 0–14 enable **only** the legal action above (client highlights that
control; server rejects anything else with `tutorial-follow-coach`). Index 15+ allows any
legal Basic (not upgraded) at the bot, or Draw. Do **not** allow Super attack / Strong / the
upgraded Basic for the kill — 3 damage is fine on 1 life but the lesson is “the delayed
Basic finishes them”; keep it the 1-damage card. If they somehow lack a non-upgraded Basic,
allow any attack at the bot (watch point: loadout + buy must make this unreachable in tests).

**Bot policy `tutorial-script-v6`:** reads `playKind` + `tutorialIndex` from the **view**
(still no `GameState` — v3 decision 2). Index 2 → Basic at the human; every other bot turn
→ Draw. Sub-choices: none expected; if one appears, Draw-equivalent / default hooks already
on the policy interface.

**Rejects:** new `ActionRejectCode` `'tutorial-follow-coach'` — message: `This tutorial step
asks for a different action.` Client maps to coach-tinted IllegalActionDialog.

**Game over:** title **Tutorial complete** when `playKind === 'tutorial'`. Winner line as
today. Primary CTA: **Play a real game** (leave → hub Solo). Feedback prompt still runs (§7).

**Replay:** hub Tutorial always available. No localStorage lockout.

**Finished-game log:** persist as today, with `is_tutorial = true` (new column). Balance
screens and arena **must not** read those rows. Seed stays server-only.

---

## 6. Table readability

Client-only except Leave/forfeit (§8).

### 6.1 Labels and costs

- Resource row: visible word **or** icon + number with a visible caption (Lives, Points,
  Upgrade points, Shield) — not `sr-only` only. Touch has no hover.
- Economy: **Draw (+N)** stays. **Buy** / **Sell** of an upgrade point: upgrade-point
  **icon** + cost/yield number (`CostDisplay`). No substring `UP`.
- Card dialog **Upgrade** and **Sell**: show cost / yield as icon + number **on the button**.
- Shop already uses icon costs — keep it; “base play cost” copy becomes “double the play
  cost (icon + number).”
- **Buy special** stays but the 20-point price is `CostDisplay`.
- Pool button: **Pool (N)** is acceptable; empty copy already good.
- Opponent: **Hidden kit**, not a raw mystery with no caption. After Spy: kit name.
- Felt queue: **Pending on others** → **Waiting on others** (or **Queued on others**).
  Incoming stays **Incoming** but the first hint defines it.
- Action-log cancel of mutual attacks: include **why** when the engine knows equal-cancel
  vs stronger-prevails. If the wire already distinguishes, surface it; if not, **do not
  invent a new rule** — add a presentation field only when the resolution outcome is
  already known server-side. Prefer extending `actionResolved` copy from existing
  `outcome` / cancel reason if one exists; otherwise a V6 task **stops and asks** rather
  than guessing. (See §12 if the code has no cancel reason today.)

### 6.2 Phone hand

`CARD_BAND_ABS_MIN_W` is 24 today — unreadably small. Raise the **pagination floor** so
faces do not shrink below **48 px** width; paginate earlier. Preferred min may stay 40–72.
Desktop must not regress to a single-card pager when the dock is wide.

### 6.3 Leave

Table **Leave** opens a confirm Dialog: “Leave the game? That counts as a forfeit.”
**Stay** / **Forfeit**.

**Forfeit** sends a new `FORFEIT` intent. The client **stays connected**. Server applies the
existing consented-leave elimination. In 2p the match finishes; the leaver receives
`phase: 'finished'` and the Game over + feedback prompt. **Return home** still calls
`leaveGame()`.

Lobby Leave may still disconnect (no match to recap).

### 6.4 Visual pickers

One shared pattern, shop-like (card/seat tiles, not radios). Used by **every** table prompt:

| Prompt | Tile shows |
|---|---|
| Target player | Seat color, nickname, kit portrait or hidden placeholder |
| Mirror — which pending attack | **Card art** of that attack, source **name + seat color**, “→ you” |
| Mirror — new target | Same as target player |
| Multi-attack | Attack card faces + per-attack seat picker as above |
| Steal / pool / consume / special-pick | Card faces (`detail="face"`) |
| Reanimation kit | Kit portraits + names |
| Elimination rewards | Icon + number for lives/points/UP; card faces for card picks |
| Regeneration quantity | Existing numeric field, same Dialog chrome, live `CostDisplay` for pts × lives |

Intents and payloads **unchanged** (except `FORFEIT` / tutorial fields in §8). Zero rule
logic on the client.

---

## 7. Feedback and inbox

### 7.1 Player form

Always: Home, Table (economy-adjacent **Feedback** control), Game over (prompt + the same
control).

Fields:

- `kind`: `bug` \| `confusion` \| `idea`
- `message`: string, trimmed, min 1, max 4000
- `contact`: optional, max 200 (email or Discord — not validated beyond length)

Auto (client may send; server prefers its own when a room exists):

- `nickname`, `gameCode`, `screen` (`home` \| `lobby` \| `table` \| `end` \| `tutorial`),
  `protocolVersion`, `playKind` if known, `logTail` (max 30 public `actionLog` entries from
  the current view — **public log only**)

Server stores `user_agent`. **Never** `GameState.seed`.

Submit works **without** a Colyseus room. Fire-and-forget: a DB failure returns 503 to the
client with “Could not save — try again”; it must **not** interrupt a match (call is not on
the game loop). Unset `DATABASE_URL`: 503 in production, 200 + log skip in local if that
matches finished-game soft-skip **except** the player must see that it did not store — for
feedback, **do not silently succeed**. Local without DB: show “Not saved (no database)”.

In-memory rate limit: 10 POSTs / 10 minutes / IP. Excess: 429.

### 7.2 Schema

Migration `004_feedback_and_tutorial.sql` (name may increment if 004 is taken):

```sql
ALTER TABLE finished_games
  ADD COLUMN is_tutorial boolean NOT NULL DEFAULT false;

CREATE TABLE feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  message text NOT NULL,
  contact text,
  nickname text,
  game_code text,
  screen text NOT NULL,
  protocol_version int NOT NULL,
  play_kind text,
  log_tail jsonb,
  user_agent text
);
```

Check constraint on `kind` ∈ (`bug`,`confusion`,`idea`). No seed column.

### 7.3 Inbox

- SPA route `/inbox` (pathname, not a hub button). Vite `historyApiFallback` / static
  catch-all already returns `index.html`.
- `App.tsx`: if `pathname === '/inbox'`, render inbox, not Home.
- `GET /api/inbox` requires header `X-Inbox-Password` matching `INBOX_PASSWORD` (timing-safe
  compare). Missing env: 404 (do not advertise the inbox). Wrong password: 401.
- List newest first: date, kind, game code, nickname, message preview. Open one: full
  message, contact, log tail, user agent, protocol.
- Filter by `kind`. No edit/delete in V6 (YAGNI).

---

## 8. Protocol (28 → 29)

Single bump in L41-02.

| Change | Where |
|---|---|
| `RoomJoinOptions.tutorial?: true` | create only |
| `FORFEIT` client message, payload `undefined` | playing |
| `PlayingStateView.playKind` | `'classic'` \| `'tutorial'` |
| `PlayingStateView.tutorialIndex` | `number \| null` (`null` when classic) |
| `FinishedStateView.playKind` | same |
| `ActionRejectCode` `'tutorial-follow-coach'` \| `'tutorial-room-closed'` | ERROR_MESSAGE |
| `BOT_REASON_CODES` unchanged | tutorial bot may omit Why or use a coarse `tutorial-script` code **without** numbers |

`tutorialIndex` is public (both seats see it). It is not hidden information.

Views still built **per recipient**. Do not attach seed, legal action lists for the opponent,
or bot internals.

Tutorial legal filter is **server-side** in the room’s perform path (after
`listLegalActions`, intersect with the script). Do not fork handlers.

---

## 9. Client conventions (delta)

Update `docs/agent/frontend.md` in the lot that lands each surface.

- Hub: Beta badge; Tutorial button; How to play; Reset help (muted, for you).
- Soft gate wraps Online / Solo / Tutorial submits.
- Table: How to play, Feedback, coach (tutorial), hints (first Classic).
- `leaveGame()` is **not** the forfeit path from a live table.
- Inbox is a fifth top-level surface (`pathname`), not a game phase.
- Feedback fetch: `resolve-server-url()` + `/api/feedback`.

Zero rule logic: coach highlights are presentation of `tutorialIndex`; the server still
rejects.

---

## 10. Testing and Definition of Done

V1 §8 / AGENTS.md §9 apply. Extra for V6:

- Classic deal + start **byte-identical** for a fixed seed with `playKind: 'classic'`
  (tutorial setup must not leak).
- Tutorial script: one test per index 0–15 proving the only legal human/bot action; mutual
  cancel at 3–4 leaves bot at 1 life; kill at 15+ eliminates; Super Regeneration does not
  exceed `lifeLimit`.
- `heuristic-v4.freeze.test.ts` green without fixture edits.
- Feedback: POST persists; missing DB does not report success; no seed in stored JSON.
- Inbox: wrong password 401; missing env 404.
- Client: CostDisplay on Buy/Sell upgrade-point and Upgrade/Sell card buttons; no `UP`
  string in economy chrome (unit test on labels).
- Visual pickers: Mirror panel renders card id via `getCard` art, not a radio of effect ids
  as the only control.
- Do **not** skip, weaken, or disable tests to pass.

Visual tasks still need a human or browser playtest sign-off (V2 §8), including: soft gate,
tutorial full run, first-game hints, forfeit → Game over, inbox open, phone-width hand.

---

## 11. Out of V6 scope

Not even partially, even “to lay groundwork”:

- Team / God / Quick
- Accounts, OAuth, unique player identity
- In-progress persistence, reconnect of tutorial mid-script beyond existing grace
- Monetization, content unlocks
- French UI / i18n framework
- Feedback screenshot upload, ratings, Slack/Notion/email
- Changing Classic prices, damage, starting resources, or mutual-attack math
- A second Colyseus room type
- Raising search iteration budgets / touching V5 freeze tests
- Designer-facing analytics beyond inbox + `is_tutorial` on finished games

---

## 12. Watch points and residual checks

1. **Unequal counter kills the lesson.** Spotlight **must** force a non-upgraded Basic at
   index 3. Tests assert bot lives === 1 after the cancel.
2. **Untouchable as victim** would no-op Spy (`immuneTo: spy`). Victim is Ghost.
3. **Sentence / Suicide / Imposition / MEGA** in the human specials band would wreck a
   1-life script. Loadout is Super Regeneration only.
4. **Silent feedback success without DB** would make you think testers were quiet. Forbidden.
5. **`leaveGame()` on Forfeit** repeats today’s bug. Table Forfeit ≠ disconnect.
6. **Protocol bump twice** in V6 is forbidden; put every wire change in L41-02.
7. **Cancel-reason copy:** if `actionResolved` has no equal-cancel vs stronger-prevails
   discriminant today, do **not** invent one in copy. File it as a question in
   `decisions.md` rather than guessing. Coach at index 3 already explains equal cancel.
8. **CORS** on `:2567` from `:5173` for POST `/api/feedback` — easy to miss locally.
9. **How to play screenshots** are designer-owned. Implementation must not block the rest of
   V6 if files are missing; sections degrade to text.

---

## 13. Lot map

Detail and acceptance lines: `docs/backlog_v6.md`.

| Lot | Name | Role |
|---|---|---|
| 41 | Protocol + tutorial state | 28 → 29, `playKind`, `FORFEIT`, governance |
| 42 | How to play | Soft gate, table help, screenshot slots, Beta hub chrome |
| 43 | Table readability | Labels, costs, no “UP”, hand floor, Leave confirm + forfeit-stay |
| 44 | Visual pickers | Shop-like prompts including Mirror card + seat color |
| 45 | Tutorial | Setup, script bot, spotlight, coach, Game over CTA |
| 46 | First-game hints | localStorage, skip all, still after tutorial |
| 47 | Feedback + inbox | Postgres, HTTP, form, `/inbox` |
| 48 | Docs + browser gate | Playbooks, first-time playtest, screenshot wiring |

Lots 42 / 43 / 44 / 47 can overlap after 41. **45 depends on 41** (and should land after 44
so the tutorial shop/target already look like the real table). **46** after 43 (anchors).
**48** last.
