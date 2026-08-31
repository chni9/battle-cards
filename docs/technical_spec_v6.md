# Technical spec — Card Battle, version 6 (Readability, stranger onboarding, beta feedback)

> Implementation document for V6. It contains **no Classic rule and no Classic value**,
> unless the current session's developer instructions explicitly change one (Lot 50).
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
- Classic play is unchanged unless the designer explicitly requests a rule or value
  change in the current session: same prices, damage, kits, delay, mutual attacks by default.
  **2026-08-29:** Classic occupancy is **2 to 6** (was 2 to 4).

### Non-objectives

- **No Classic rule change. No Classic value change** — unless the current session's
  developer instructions explicitly change one (record in `decisions.md` + rules spec).
  **2026-08-29 exception:** Classic occupancy is 2–6. A confused tester is never grounds
  for changing Tax, delay, kits, or prices on inference alone. Same clause as V4 / V5,
  with that explicit-instruction exception.
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
| 5 | Tutorial **must** show, at least: Draw (points, not a card), **Tax twice (base +4)**, **upgrade**, **equal Basic counter**, **Spy** (and Spy counter), **sell**, **buy Absorber**, **buy an upgrade point**, **Shield vs Strong**, **Super Regeneration**, **Absorber**, **Thief**, then **kill** with Basic+. Spotlight every index 0–30. |
| 6 | Human tutorial seat starts at **2 lives** (designer 2026-08-25). Tax 2→1; Shield vs Strong keeps 1 life for Super Regeneration. The counter lesson is still **equal** Basic vs Basic (both cancel; the bot stays at 4). Kill is **upgraded Basic** (3) after Super Regeneration, Thief, a second base Tax, Absorber, and a Strong counter. **Do not** upgrade Basic before the equal-counter beat. |
| 7 | Completing the tutorial does **not** dismiss first-real-game hints. The first Solo or Online Classic match still gets them. Skip-all remains. Tutorial itself uses coach copy, not the hint overlay. |
| 8 | Feedback is always on Home, Table, and Game over. Game over **asks** once per finished match (skippable). |
| 9 | A report is Bug / Confusion / Idea + message + optional contact. Server attaches game code, nickname, screen, protocol, `playKind`, and a public log tail when in a match. No seed on the client or in the report row. |
| 10 | Designer inbox is `/inbox` in the same SPA, env password, not linked from the player hub. Postgres table `feedback_reports`. |
| 11 | Table pass: **no “UP” letters** on chrome; upgrade points are the existing icon + number. **Every interactive cost or yield** is icon + number. Action-log **prose** may still say “points”. |
| 12 | **Every** table prompt uses a shop-style visual picker (card faces, seats with name + seat color). Mirror / Incoming-related choices show the **attacking card art** plus the source player’s name and color. |
| 13 | English only. Open URL. Visible **Beta** badge. No hub password. |
| 14 | Classic frozen. Tutorial-only exceptions are listed in §5.3. Client disable is **not** validation (golden rule 8): the server filters tutorial-legal actions. |
| 15 | Architecture: **Approach 1** — one room, one protocol bump (28 → 29), HTTP feedback on the existing Express server, hints in `localStorage`. |

### 2.1 Session 2026-08-29 — Classic occupancy

Classic rooms seat **2 to 6** players (was 2–4 through #V4-30). Not Team/God/Quick.
Card values, delay, and mutual attacks are unchanged. Single source:
`packages/shared/src/domain/player-count.ts`.

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
`resetHelpStorage` still clears this and the hint keys (tests / Lot 46). There is **no**
hub **Reset help** control (L51-03).

**Copy:** still a primer, not the full rules spec. First-time floor only — no delayed
resolution, no mutual-attack, no shop-price formula. Must define, in this order, with the
screenshot slot beside the section when the file exists. Existing resource icons may sit
next to Lives / Points / Upgrade / Shield mentions. Do not invent PNG names; unused
designer files (`delayed-resolution.png`, `table-overview.png`) stay on disk unused.

| Section id | Title | Must say | Screenshot file (designer) |
|---|---|---|---|
| `goal` | Goal | Last player alive wins. This is a turn-based elimination game for 2 to 6 players: reduce opponents' lives to 0 and stay alive yourself. Lives can never go above 25, no matter how you gain them. | — |
| `turn` | Turns | Players act one after another. On your turn you take exactly one action, then play passes on. That action is one of: Draw, play a card from your hand, play a special, buy, sell, or upgrade. | `how-to-play/one-action.png` |
| `lives` | Lives | Lives are your health. At 0 lives you are eliminated and become a spectator. Attacks deal damage to lives. A shield only absorbs attack damage; other life loss ignores it. | `how-to-play/resources.png` |
| `points` | Points | Points are the currency for almost every action: playing most cards, buying from the Shop, selling, and buying upgrade points. Draw gives you points equal to your kit's Draw value. | — |
| `cards` | Cards | Your hand holds attack cards and action cards. Attacks deal damage to a chosen opponent. Action cards do everything else: gain resources, steal, spy, shield, or heal. Tap a card to read it, then Use, Upgrade, or Sell. | — |
| `upgrade` | Upgrade | You can upgrade a held copy by spending 1 upgrade point. That upgrade is permanent for that copy and makes its effect stronger. The card dialog tells you what the upgrade adds. | — |
| `kits` | Kits | Each player has a kit. It sets starting lives, points, upgrade points, and Draw, how many random action and attack cards you begin with, which special cards you hold, and sometimes a kit ability. Opponents cannot see your kit until they Spy you, or until you are eliminated. In the lobby you may pick a kit or keep Random. | `how-to-play/hidden-kit.png` |
| `specials` | Special cards | Special cards come with your kit; you can also buy one in the Shop. Each special has one use: after you play it, it is gone. They have a play cost in points and can be upgraded like other cards. | — |
| `shop` | Shop | Open Shop to buy extra cards or upgrade points, and to sell cards you do not need. | `how-to-play/shop.png` |

Hub chrome (L51-03): a small **Beta** card, top-right, text **Beta** only — no Beta
paragraph, no protocol version (not even a tooltip), no Reset help. Delayed-resolution
pitch is gone. “Not connected” is not shown as an alarm on the idle hub; idle is unlabeled
or “Ready”.

### 5.2 First-real-game hints

Skippable overlays on the **first Classic** `playing` view per browser (`playKind !==
'tutorial'`). Completing the tutorial does **not** set these done.

`localStorage` key `card-battle.v6.hints` JSON:

```ts
{ dismissed: HintId[]; skipAll: boolean }
```

| `HintId` | When it fires | Copy (normative; `HINT_COPY`) |
|---|---|---|
| `your-turn` | POV becomes active the first time | It is your turn you have to take **one** action. |
| `draw` | First time the dock is shown | **Draw** gives you points. The number of points you can draw depends on you kit. |
| `hand` | First time the dock is shown (after Draw) | This is you hand where you have all the cards you can use. Click a card to **use**, **upgrade**, or **sell** it for points. |
| `specials` | First time the dock is shown (after Hand) | **Specials** are one-use cards. They are stronger that normal cards. Use them wisely. Special cards you start with depend on your kit. |
| `resources` | Same | Here you will find lives, points, upgrade points and shield. They are your ressources that you have to manage during the game. If your number of lives atteign 0, you are eliminated. |
| `incoming` | First **attack** Incoming targeting POV (not Spy, Thief, or presentation persistents) | There is an incoming **attack**! It will take effect **after you act**. In general, you can: attack back with a equal or stronger attack, use Shield, or use Mirror. |
| `incoming-thief` | First Thief Incoming targeting POV (`thief` or `*-thief`; not Spy) | An opponent used **Thief** on you! It will take effect **after you act**. This will steal uo to 10 points from you. You can counter it with Thief, or spend your points before it resolves. |
| `hidden-kit` | First time an unspied opponent is visible | Here are your opponents. You cannot see their kit until you use Spy to reveal it. |
| `shop` | Current best remaining economy lesson on your turn (L46-02) | This is the shop. You can buy cards, special cards and upgrade points from here. |
| `reward` | First elimination-reward sub-choice for POV | You eliminated an opponent ! You can pick **two** rewards: 4 lives, 8 points, a card from their hand, or an upgrade point. |

`leave` is **not** a first-game hint (designer 2026-08-26). The Forfeit flag keeps its own confirm copy.

Controls: **Got it** (dismiss this id) · **Skip all**. Table **How to play** stays available.
Do not block the turn timer; do not require dismissing to act (the overlay is pointer-events
on the coach card only, not a full-screen trap — except the first `your-turn` may sit beside
the existing Your-turn flash, not replace it). Tutorial matches use the L45 coach, never these
ids.

**Selector (designer 2026-08-26, extended 2026-08-28):** one undismissed card. Not a legal-action recommender.
While POV is choosing an elimination reward: `reward` first (the overlay stays up over that Dialog
until Got it). Then: `incoming` (**attack** Incoming to POV — not Spy/Thief, ignore `persistent:`) →
`incoming-thief` (`thief` or `*-thief`). On your turn after threats: `your-turn` → `draw` → `hand` →
`specials` → `shop` → `resources` → `hidden-kit` (unspied living opponent). Off your turn after threats:
`hidden-kit`, else none. Card sits next to `data-hint-anchor` (`incoming-thief` reuses Incoming); no rings.
Hand / Specials use a shrink-wrapped card-cluster anchor and sit **beside** that cluster
(top-aligned, left when it fits — not the full dock section).

**Auto-Got-it** (plus the Got it button): `your-turn` on any playing intent; `draw` on Draw;
`shop` when Shop opens; `incoming` on a playing intent while an **attack** still targets you, or when
that attack leaves the view; `incoming-thief` likewise for Thief Incoming; `hand` when a hand card
opens; `specials` when a special opens; `reward` when rewards are confirmed; `hidden-kit` when an
opponent portrait opens; `resources` is Got it only.
Got it and × both dismiss that id (it must not return later in the same browser).

### 5.3 Tutorial — setup overrides

`GameMode` remains `'classic'`. Views carry `playKind: 'classic' | 'tutorial'` (default
`'classic'`). The overlay is **room-owned** (decisions.md 2026-08-20), not on `GameState`.
Tutorial overrides run **once** after the normal start/deal, in
`applyTutorialSetup(state, { humanId, botId })` called only from the room when
`playKind === 'tutorial'`. Classic start tests must stay green **without** fixture edits.
Never call setup from `run-game.ts`.

**Room:** `RoomJoinOptions.tutorial?: true`. Create from Home **Tutorial** (nickname only; no
kit picker; no lobby flash). Client never sends `addBot`. Server: at most one human; auto-seat
exactly one `tutorial-script-v6` bot on `startGame` if missing (needed before `canStartGame`’s
two-seat check); reject a second human join (`tutorial-room-closed`); **reject `ADD_BOT`** in
a tutorial room (reuse `tutorial-room-closed` — no protocol bump). Ignore difficulty. **Never**
edit `heuristic-v4` or its freeze test.

**Turn timer:** **none** in tutorial rooms (`turnDeadlineMs = null`). A client idle of **20 s**
retitles the coach **Play**. Do not set a 300_000 ms server deadline.

**Fixed seats after override (designer 2026-08-25):**

| Seat | Kit | Lives | Points | Upgrade points | Shield | Hand (exact instances) | Specials |
|---|---|---|---|---|---|---|---|
| Human | `indestructible` | **2** | **38** | **1** | 0 | Tax (**not** upgraded), Spy, **one** Basic, Shield, Shield | Super Regeneration (not upgraded) |
| Bot | `ghost` | **4** | **16** | 0 | 0 | Basic, Strong, Thief, Spy | none (strip Curse) |

Strip any other cards the Classic deal produced. Bot nickname may stay the usual generator
(`Alpha`). Human nickname is whatever they typed. No Absorber at deal — they **buy** it.
Start with 1 upgrade point (for Spy); they **buy** a second from the Shop (cost 10). Sell
yields **points** (Shield sell 7). Starting **38** points covers Shield at index 17 after
skipping that step's former Draw, and still leaves enough after Thief's 10-point steal.

**Tax instance override:** Indestructible `alwaysUpgraded` still includes `tax`. After mint,
force `isUpgraded = false` so both Tax plays grant **+4 points**, not +6. Do not change the
kit trait. Tutorial-only; decisions.md 2026-08-25.

**Why 2 lives:** Tax (2→1) then Shield against Strong keeps the human at **1** for Super
Regeneration (Shield stops attack damage; Tax does not). The equal Basic counter cancels; the
bot stays at 4 until the upgraded Basic (3) hits. Kill is Basic+ vs the bot, then Absorber,
then Basic+ vs a reused Strong (3 vs 2 — stronger stays).

**Why not Assassin:** Sentence can randomly eliminate, including the human. Multi-attack is a
second lesson. Indestructible’s catalog special **is** Super Regeneration — kit inspect matches
the dock.

**Reusable cards:** attack and action cards **stay in hand** (rules spec §5). The same Tax,
Basic, Spy, and Strong are reused. Only specials are one-use.

### 5.4 Tutorial — script (normative order)

`tutorialIndex` is an integer on the room and on every playing view (public). Coach copy is
**client-only**, keyed by index — do not put long strings on the wire. Increment the index **only** after a successful scripted action. Indices 0 and 1 are both
the human (Draw, then Tax): after Draw, the room snaps the turn back to the human so Tax
can be the next action. That skip is tutorial overlay, not a Classic extra action
(decisions.md 2026-08-25). From index 1 onward the table alternates.

| Index | Whose turn | Legal action (server filter) | Coach title / body (client) |
|---|---|---|---|
| 0 | Human | `draw` | Draw | **Points** are spent to play many cards and to buy in the Shop. Draw gives **points**. Draw once. |
| 1 | Human | play **Tax** (base) | Tax | **Lives** are health; 0 eliminates. Tax spends **1 life** (Shield does not stop that) and gives **4 points**. Play Tax. |
| 2 | Bot | play **Basic** → human | — (keep last coach) |
| 3 | Human | play **Basic** → bot (not upgraded) | Counter | Incoming is delayed until after you act. Incoming Basic is the red highlight. Play Basic back. **Equal** damage cancels **both**. |
| 4 | Bot | `draw` | — | Mutual equal cancel; bot still at **4** lives. |
| 5 | Human | **upgrade Spy** | Upgrade | An **upgrade point** upgrades one held card. Spend **1 upgrade point** on Spy. |
| 6 | Bot | `draw` | — |
| 7 | Human | play **Spy+** → bot | Spy | Spy reveals their kit and cards **when it resolves on their turn**. Play Spy. |
| 8 | Bot | `draw` | — (keep last coach) | Spy resolves after this draw. Look is a **client overlay** before index 9, not this row. |
| 9 | Human | **sell** one Shield | Sell | Selling **removes the card from hand** and yields play-cost **points**. Sell **one** Shield, keep the other. |
| 10 | Bot | play **Spy** → human | — |
| 11 | Human | play **Spy** → bot (counter) | Counter Spy | Incoming Spy (red). Play Spy back. The same card aimed at the source **cancels both**. |
| 12 | Bot | `draw` | — |
| 13 | Human | **buy an upgrade point** | Shop | Open the Shop and **buy an upgrade point** (spends **points**, grants another **upgrade point**). |
| 14 | Bot | `draw` | — |
| 15 | Human | **buy Absorber** | Buy | Buying spends Shop price (**double** the play cost) and puts the card in hand. Buy Absorber. Never buy Basic. |
| 16 | Bot | play **Strong** → human | — |
| 17 | Human | play **Shield** | Shield | Incoming Strong (red). **Shield** stops **attack** damage, not Tax. Play remaining Shield. |
| 18 | Bot | play **Thief** → human | — |
| 19 | Human | play **Super Regeneration** at 1 life | Thief | Incoming Thief (red) steals **points** after you act. Play Super Regeneration (restore **lives**, cap 25). Specials are usually one-use. |
| 20 | Bot | `draw` | — |
| 21 | Human | play **Tax** again (same card, still base) | Tax | Thief took **points**. Tax again — Super Regeneration gave **lives** to spend. **+4 points**. |
| 22 | Bot | `draw` | — |
| 23 | Human | **upgrade** the same Basic | Upgrade | Upgrade that Basic. It will deal **3**. |
| 24 | Bot | `draw` | — |
| 25 | Human | play **Basic+** → bot | Attack | Play the upgraded Basic. They have 4 lives — this queues **3** damage. |
| 26 | Bot | `draw` | — | Bot **4→1**. |
| 27 | Human | play **Absorber** → bot (immediate) | Absorber | Play Absorber on them. You gain the lives they **lost last turn**. |
| 28 | Bot | play **Strong** → human (reuse) | — |
| 29 | Human | play **Basic+** → bot | Finish | Play Basic+ back. **3** vs **2** cancels their Strong; yours stays and will finish them. |
| 30 | Bot | `draw` | — | Basic+ hits; human wins; 2p skips rewards. |

Must-show beats: Draw, Tax (twice, base +4), upgrade, equal Basic counter, Spy, Spy counter,
sell, buy Absorber, buy upgrade point, Shield vs Strong, Super Regeneration, Absorber, Thief,
kill.

**Spotlight:** every index enables **only** the legal action above (client highlights that
control; Shop is **not** auto-opened). Server rejects anything else with
`tutorial-follow-coach`. Illegal client clicks **do not send**. Upgraded Basic is **not**
legal at index 3. `buyCard` of `basic-attack` is never legal.

**Bot policy `tutorial-script-v6`:** reads `playKind` + `tutorialIndex` from the **view**
(still no `GameState` — v3 decision 2). Map: **2** Basic→human; **10** Spy→human; **16** and
**28** Strong→human; **18** Thief→human; else Draw. Bot-driver **short-circuits** Easy /
search / noise when this policy is seated. Omit `botReason` on the table log.

**Coach:** hovering dismissible chat (`z-[110]`, above Shop/card dialogs); the table stays
clickable around it. The panel is slightly transparent (`color-mix` on `--color-surface-raised`
plus backdrop blur). It **opens on every new title/body** (next index, idle **Play**, illegal
`tutorial-follow-coach` copy, tour step, Look gate) and can be opened again from a compact **?**
control (not a Coach pill). Resource words in coach copy render as table icons (`CostDisplay` /
resource PNGs). First mention of a term (points, lives, Incoming, upgrade point, Spy, sell, Shop
buy, Shield, Thief) uses a full English sentence — not compressed chat style. Highlight the
scripted control with a pulsing **orange** outline and a pointing arrow **outside** the
highlight square. Incoming Attack, Spy, and Thief chips on the Incoming strip (not Waiting
on others) use a pulsing **red** outline. Shop upgrade-point callout keeps in-flow top
padding so the arrow is not cropped by the Dialog scroller. Bot turns keep the last coach.
**Skip tutorial** on the **flag only**:
`leaveGame()` to hub, **no** Game over, **hide Forfeit**.

**Board tour (client-only, before index 0 Draw):** while `tutorialIndex === 0` and the tour is
unfinished, the coach presents each region in order (your zone, hand, specials, resources,
Incoming, Shop, opponent, action log, timer, kit, flag). Each step highlights that region.
The human advances with **Got it** on the chat. These steps do **not** bump `tutorialIndex`.
Reconnects with `tutorialIndex !== 0` skip the tour. Until Got it finishes, game sends
(Draw, cards, Shop) are blocked and must not swap in `tutorial-follow-coach`.

**Look gate (client-only, after Spy resolves):** Spy is played at index 7 and resolves after
the bot acts at index 8. Before the human sell at index 9, the coach tells them they can
**click the opponent** to see kit and cards. That click is a forced table action (no Got it).
Index 9 sends stay blocked until the Spy reveal dialog opens. The Look overlay is **only**
index 9 — it must not return on later indices or on the finished board. After one successful
inspect, the gate does not block again. The hovering coach is hidden when the table is
`readOnly` (Tutorial complete).

**Rejects:** `'tutorial-follow-coach'` — message: `This tutorial step asks for a different
action.` Client maps to coach-tinted copy (do not send the illegal intent).

**Game over:** title **Tutorial complete** when `playKind === 'tutorial'`. Winner line as
today. Primary CTA: **Play a real game** → hub only (not a Solo create). Feedback prompt still
runs (§7).

**Excel:** **Download action log** only when `import.meta.env.DEV` (every mode, not tutorial
only).

**Why:** hide the action-log **Why** control in **all** games (no protocol bump; `botReason`
may still exist on the wire).

**Replay:** hub Tutorial always available. No localStorage lockout.

**Finished-game log:** persist as today, with `is_tutorial = true`. Balance screens and arena
**must not** read those rows. Seed stays server-only.

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
| Regeneration quantity | Four click-to-commit buttons (1–4 lives), live `CostDisplay` of total points |

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

- Hub: Beta card (top-right, word **Beta** only); Tutorial button; How to play.
  No protocol footer. No Reset help control.
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
- Tutorial script: one test per index 0–30 proving the only legal human/bot action; mutual
  cancel at 3–4 leaves bot at **4** lives; after index 17 human lives **1** with remaining
  shield (Strong absorbed); after 26 bot
  lives **1**; after 30 the human wins; Super Regeneration does not exceed `lifeLimit`;
  Absorber is bought not dealt; Basic is never bought.
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

1. **Unequal counter wrecks the lesson.** Spotlight **must** force a non-upgraded Basic at
   index 3. Tests assert bot lives === **4** after the cancel (both still pending until the
   bot draws at 4, then both cancel).
2. **Untouchable as victim** would no-op Spy (`immuneTo: spy`). Victim is Ghost.
3. **Sentence / Suicide / Imposition / MEGA** in the human specials band would wreck the
   4-life script. Loadout is Super Regeneration only. Indestructible would mint Tax+;
   `applyTutorialSetup` must force base Tax.
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
| 51 | Beta UI feedback | Primer rewrite, hub chrome, inspect, banners, Spy seat, flyouts |

Lots 42 / 43 / 44 / 47 can overlap after 41. **45 depends on 41** (and should land after 44
so the tutorial shop/target already look like the real table). **46** after 43 (anchors).
**48** last. **51** is a designer playtest follow-up (client presentation; no protocol bump).
