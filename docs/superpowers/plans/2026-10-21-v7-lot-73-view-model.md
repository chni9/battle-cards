# V7 Lot 73 — View-model: task briefs

> Implements `docs/technical_spec_v7.md` (read it first) for Lot 73; parity checklist `docs/technical_spec_v7_parity.md`. Tracker: `docs/backlog_v7.md`.
> **Brief plan.** Step-by-step TDD instructions (superpowers:writing-plans format) are written from these briefs just before the lot executes, once the interfaces of earlier lots exist.
> Each brief was drafted from the spec and the code on `dev` `1de498d`, then restructured by the 2026-10-21 backlog review; a **Review** line overrides the brief where they differ.

## Draft id → final id

Briefs below may cite other tasks by their draft id; use this table.

| Draft | Final |
|---|---|
| L73-03 | L73-01 |
| L73-04 | L73-02 |
| L73-05 | L73-03 |
| L73-06 | L73-04 |
| L73-07 | L73-05 |
| L73-08 | L73-06 |
| L73-09 | L73-07 |
| L73-10 | L73-08 |
| L73-11 | L73-09 |
| L73-12 | L73-10 |
| L73-13 | L73-11 |
| L73-14 | L73-12 |
| L73-15 | L73-13 |

Cross-lot moves: draft L73-01 → L72-03, L73-02 → L72-04, L73-03 → L73-01; draft L72-03 split into L72-06 (harness) and L72-07 (icons); draft L74-02 dropped (sheet stack is L72-09); draft L76-18 folded into the Lot 76 copy task; draft L81-02 folded into L81-01.

## Lot scope

Pure, React-free view-model with behavior tests and no clock reads (§4.3). No player-visible change, no What's new item, no browser gate (§12.3).

## L73-01 — Correct pre-Lot-69 Spy comments and playbook lines

**Cx / risk:** S / Low · **Depends on:** L72-04 · **Spec:** §10.3, §6.3
**Parity (Appendix A):** `opponent-seat`, `opponent-reveal-dialog`
**Files:** `packages/shared/src/protocol/state-view.ts`, `apps/client/src/view-model/opponent-seat-resources.ts`, `apps/client/src/view-model/opponent-seat-resources.test.ts`, `apps/client/src/screens/table/opponent-reveal-dialog.tsx`, `apps/client/src/design/components/resource-icon.tsx`, `docs/agent/frontend.md`, `docs/agent/protocol.md`

Comment and doc fixes only (§10.3, Q34). Since Lot 69, a base Spy carries live lives, points, upgrade points and shield only. Spy+ (`full-resources`) and the spectator overlay add kit, hand and specials (`build-view-for.ts` `buildSpiedView`). Correct the following:
- `packages/shared/src/protocol/state-view.ts`: the `SpiedPlayerView` block and the `PlayingStateView` header. The note on `resourcesSnapshot` says it is no longer sent and stays in the type only because removing it is a protocol change.
- `view-model/opponent-seat-resources.ts`: the header, and the `opponentKitIsVisible` doc. It is true for any Spy relation or death reveal, and no longer means the kit is known.
- The `screens/table/opponent-reveal-dialog.tsx` header and the `unknown` doc in `design/components/resource-icon.tsx`.
- `docs/agent/frontend.md`: the 'Spy / death reveal (L51-08 / L51-10)' bullet, and the token-flyout line that groups base Spy with unspied seats.
- `docs/agent/protocol.md`: the visibility row 'Base Spy: frozen `resourcesSnapshot`'.

In `opponent-seat-resources.test.ts`, the title that says base Spy shows `?` is reworded to describe its pre-69 snapshot fixture. Its assertions do not change. No code, wire or behavior change.

**Acceptance:** A diff of the code files is limited to comments plus that test title. Every assertion is unchanged. `grep` finds no client or shared comment that still says a base Spy reveals the kit or shows `?` resources. `pnpm verify` green.

_Draft id L73-03._

## L73-02 — Add seats() visibility tiers and seat anatomy

**Cx / risk:** M / Medium · **Depends on:** L72-04 · **Spec:** §4.3, §6.2, §6.3, §6.12, §11, §12.2
**Parity (Appendix A):** `opponent-seat`, `walk-in-spectator-mode`, `global-connection-badge`, `active-persistent-thumbs`, `sentence-chips`, `first-game-hint-host`, `opponent-reveal-dialog`
**Files:** `apps/client/src/view-model/seats.ts`, `apps/client/src/view-model/seats.test.ts`, `apps/client/src/view-model/test-fixtures.ts`, `docs/agent/testing.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`view-model/seats.ts` implements the data half of `seats(view, layoutBox)` (§6.2, §6.3). Each non-POV seat in `view.players` gets a tier derived from wire fields only: `eliminated` (`eliminationReveal`), `spy-plus` (`spied.kitId`), `base-spy` (`spied` without `kitId`) or `unspied`. Each seat also carries:
- nickname and a seat-colour index (its position in `view.players`)
- an avatar: the kit portrait when `visibleKitId` gives one, else a seat-colour disc with the initial. The same id feeds the kit sheet for Spy+, eliminated and spectator-visible seats (Q46).
- a lives pill and a points / upgrade points / shield row. All four kinds are always present, with `?` where the tier hides the value (L51-08). An unspied `activeShield` gives presence and tier only.
- every public status §6.3 allows for the tier: spying-on-you eye, Block turns or attack ban, Invisibility with turns, active persistents with card lives, ticking Sentences from `pendingSentences`, `duplicationActive` and Gambler `drawGain` when the server sent them (Q47), and `pendingReanimation` / `absorbWindowOpen` on eliminated seats. They are split into two visible badges plus an overflow count, in a named order constant (see questions).
- bot label with difficulty (hidden in the tutorial) and connection state (disconnected grace, absent N/3, idle N/5). An eliminated seat hides its connection, eye, bot label and flow badges, as today.
- an active-seat flag, and a `kitHidden` flag that is true for unspied and base-Spied living seats (§6.3, Q66)
- Spy+ or frozen hand and specials

It also returns the POV mode: seated; `reanimating` (eliminated with `pendingReanimation`); `watching` (eliminated without it, or a walk-in with the overlay granted); or walk-in fogged. Opponents get no hand count. It reuses the moved `visibleKitId`, `hasFullSpyCardReveal` and `opponentResourceDisplay`. This task also adds the shared `PlayingStateView` test builder for every L73 test and documents it in `docs/agent/testing.md`.

**Acceptance:** There is one test per tier: unspied, base Spy, Spy+, eliminated, and spectator overlay (walk-in after Stay, and an eliminated POV without reanimation). Each test proves which values show and that the hidden ones are `?`. The Reanimating and Watching POV modes are tested. A base-Spied seat is `kitHidden`. Every output field comes from a view field. `pnpm verify` green.

_Draft id L73-04._

## L73-03 — Add seats() layout modes, arc order and grid fallback

**Cx / risk:** M / Medium · **Depends on:** L73-02 · **Spec:** §4.3, §6.4, §14.3, §12.2
**Parity (Appendix A):** `table-shell-layout`, `opponent-seat`, `global-visual-viewport-fit`
**Files:** `apps/client/src/view-model/seat-layout.ts`, `apps/client/src/view-model/seat-layout.test.ts`, `apps/client/src/view-model/seats.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

The layout half of `seats(view, layoutBox)` (§6.4). `layoutBox` carries the visible viewport size and the arena region size.
- **Mode:** portrait when height > width; landscape-compact when the visible height is under 500 px; desktop at width ≥ 1024 and height ≥ 700. A 768×1024 tablet is portrait.
- **Order:** `turnOrder` rotated so the player after the POV comes first clockwise, with the POV as the bottom anchor. A walk-in has no anchor and every seat sits on the ellipse.
- **Positions:** seat centres on the upper half of an ellipse around the plate. Desktop uses the full ellipse around a larger plate; landscape-compact uses a top band with no full ellipse.
- **Grid fallback:** used when any two seat boxes at the chosen size, badge row included, overlap or sit less than 8 px apart. Rows are `ceil(n/2)` over `floor(n/2)`, left to right in turn order.

Seat size, plate size and the 8 px gap are named constants that L74 tunes (§14.3). Pure geometry: no DOM, no React.

**Acceptance:** Tests check that 360×740, 375×812 and 768×1024 are portrait, a 740×360 phone is landscape-compact and 1440×900 is desktop. They cover seat order for 2, 4 and 8 seats (next player first clockwise; walk-in has no anchor). A box where arc seats would sit under 8 px apart switches to a grid: 4 + 3 for 7 opponents, 4 + 4 for an 8-seat spectator view. No two arc seats are closer than the gap. `pnpm verify` green.

**Review:** Layout modes per the amended §6.4: landscape-compact (height < 500), desktop (width > height), portrait otherwise.

_Draft id L73-05._

## L73-04 — Add threats() arrows, labels, fan-out and Mirror state

**Cx / risk:** M / Medium · **Depends on:** L72-03, L73-02 · **Spec:** §4.3, §6.5, §8.1, §12.2
**Parity (Appendix A):** `incoming-pending`, `waiting-on-others-strip`, `table-subchoice-mirror`, `table-fx-threat`, `collapsed-chrome-dialogs`
**Files:** `apps/client/src/view-model/threats.ts`, `apps/client/src/view-model/threats.test.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`view-model/threats.ts`: `threats(view, subChoice)` (§6.5) returns one entry per `pendingEffects` item, in wire order. Each entry carries:
- source → target, from the current `sourcePlayerId`. A redirected effect gets a Mirror or Super Mirror badge from `redirectedBy`; earlier hops show in the log only.
- POV relation: incoming, outgoing or third-party
- tone: POV incoming uses `threatToneFor` (attack tone for attacks, Sentence and Mirror; other tone for Spy and the Thief family; L51-07 / Q61). POV outgoing is `mine`. Third party uses the source seat-colour index with a tone icon.
- its own label: `listedAttackDamage(cardId, isUpgraded, damageMultiplier)` or the effect icon. Never a summed total (golden rule 1 as of 2026-09-29).
- the side-by-side grouping key `(sourcePlayerId, targetPlayerId, queuedAt, cardId)`
- a Mirror-eligible flag from `subChoice.eligibleEffectIds`, only while a Mirror prompt is open

Fan-out groups (same source, card and `queuedAt` across every opponent) give one 'hits all' burst on the source plus a target badge on each seat, each keeping its own label. Helpers return the arrows to draw in grid mode (POV in and out only, plus the tapped seat's) and a seat's in/out set for the tap highlight.

**Acceptance:** Three Assassin attacks on the POV give three entries with three labels and no total. A ×2 attack shows the multiplied number. MEGA ATTACK on 7 opponents gives one fan-out group with 7 target badges. Spy and Thief incoming use the other tone; Sentence and Mirror use the attack tone. A redirected effect is drawn from the redirector with its badge. Mirror-eligible ids are flagged only while the prompt is open. `pnpm verify` green.

**Review:** Fan-out burst also covers an Assassin volley that hits every opponent with the same card and queuedAt; each target badge keeps its own damage. Never a summed label.

_Draft id L73-06._

## L73-05 — Add recurring chips; delete persistent-incoming.ts

**Cx / risk:** M / Medium · **Depends on:** L73-04 · **Spec:** §6.5, §11, §13, §12.2
**Parity (Appendix A):** `incoming-pending`, `waiting-on-others-strip`
**Files:** `apps/client/src/view-model/threats.ts`, `apps/client/src/view-model/recurring-chips.ts`, `apps/client/src/view-model/recurring-chips.test.ts`, `apps/client/src/screens/table/persistent-incoming.ts`, `apps/client/src/screens/table/persistent-incoming.test.ts`, `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`

Add recurring chips to `threats()` for the periodic effects that tick on the POV (§6.5, Q35): a Curse on the POV (own `activePersistentEffects`), and each living opponent's active Poison and Imposition with counter > 0. None for an eliminated or walk-in POV.
- **Amount:** the catalog rate for the tier, not a prediction. Poison is 1 / 2 lives; Imposition takes up to 2 / 4 points above 7; Curse is 1 life per 3 / 2 points spent. These are client constants citing the rules spec card lines and mirroring the server's.
- **Paused** when the POV's own view says the effect will not apply this turn, effect by effect as `apply-persistent-effects.ts` applies it. Own Invisibility pauses all three. Own `blockTurnsRemaining > 0` or `blockAttacksForbidden` pauses Poison and Imposition only (rules spec Block: Curse unchanged). An up, upgraded own Shield, or own points ≤ 7, pauses Imposition.

Delete the unwired `screens/table/persistent-incoming.ts` and its test (dead since c0e9668; §11, §13 #35). Rewrite the frontend.md line that says Imposition / Points Generator get chips through it. Add a `docs/agent/decisions.md` entry that retires that test and records the Curse-under-Block reading (see questions).

**Acceptance:** Opponent Poison while the POV has Block is paused. A Curse on the POV during Block is not paused. Own Invisibility pauses all three. Imposition is paused at 7 points and with an up, upgraded Shield, and live at 8. Upgraded tiers show their rates. Neither an eliminated owner nor a depleted counter gives a chip. `persistent-incoming.ts` is gone and nothing imports it. `pnpm verify` green.

**Review:** Paused conditions per the amended §6.5 (Curse keeps draining during Block). Rates are client constants citing the rules spec, like `CLIENT_SUB_CHOICE_MS`. Owns the deletion of `persistent-incoming.ts` and its decisions entry.

_Draft id L73-07._

## L73-06 — Add cardActions() for hand and special cards

**Cx / risk:** L / High · **Depends on:** L72-04, L73-02 · **Spec:** §4.3, §6.6.1, §6.6.2, §10.6, §11, §12.2
**Parity (Appendix A):** `card-actions-dialog`, `card-target-picker`, `regeneration-quantity-picker`, `card-transformer-consume-picker`, `assassin-multi-attack`, `table-target-picker-eligibility`, `table-multi-attack-target-eligibility`, `table-use-target-routing`, `table-use-disabled-reasons`
**Files:** `apps/client/src/view-model/card-actions.ts`, `apps/client/src/view-model/card-actions.test.ts`, `apps/client/src/view-model/action-lock.ts`, `apps/client/src/view-model/action-reasons.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`view-model/card-actions.ts`: `cardActions(view, instance, ctx)` for a hand or special card (§4.3, §6.6, §11). `ctx` is `{ subChoice, readOnly }`. A shared `actionLock(view, ctx)` gives not-your-turn and actions-locked (finished board, open sub-choice, eliminated POV or walk-in).
- **Actions:** Use, Upgrade, Sell and Multi-attack, each enabled or disabled with one reason code and its copy (§10.6 strings, listed in the PR). Sell is hidden for specials. Upgrade is hidden once upgraded. Multi-attack is offered only for attack cards of an `allowsMultipleAttacksPerTurn` kit.
- **Reasons:** not your turn; actions locked; Invisibility (`cardActsOnOpponents`, L58-06); the Block attack ban for attacks and Block (`blockAttacksForbidden`, as `list-legal-play-card.ts`); not enough points (catalog `cost.points`, as `canAffordPlayPoints`); no valid target; nothing to consume; no upgrade point; temporarily unavailable.
- **Use routing:** pick a target; send at once; Regeneration quantity (tiles 1–4 with their total cost, unaffordable tiles disabled); or Card Transformer consume (shared hand cards).
- **Target seats**, mirroring the server: attacks = living non-Invisible seats plus corpses with an attack pending on the POV (L68-07); Thief = the same with a Thief pending; Absorber = living or `absorbWindowOpen` seats, never a living Invisible one; Spy, Cloning, Curse and base Card / Upgrade Point / Spy Thief = living non-Invisible seats. Upgraded thieves take no target. No client immunity filter.
- **Multi-attack rows:** hand attacks only (Q44), with the attack seat set.

A reason shows only when the view proves the server would reject. The client is never stricter than the server's legal enumeration.

**Acceptance:** Each card family is tested for its target set: attack and Thief corpse ripostes stay separate, living Invisible seats are never offered, and upgraded thieves take no target. Each disabled reason has a fixture that triggers it. Regeneration tiles are priced and disabled past what the POV can afford. Card Transformer with no shared card gives 'nothing to consume'. Off-turn every action is disabled with its reason. `pnpm verify` green.

_Draft id L73-08._

## L73-07 — Add in-play card actions: own-only Upgrade and Deactivate

**Cx / risk:** M / Medium · **Depends on:** L73-06 · **Spec:** §6.6.1, §11, §5.4, §12.2
**Parity (Appendix A):** `table-inspect-active-upgrade`, `deactivate-confirm-dialog`, `active-persistent-thumbs`, `sentence-chips`, `card-inspect-dialog`, `global-activated-art-guard`
**Files:** `apps/client/src/view-model/card-actions.ts`, `apps/client/src/view-model/in-play-actions.test.ts`, `docs/agent/decisions.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`cardActions` for cards in play (§6.6.1, §11, Q37, Q40). The input carries the owner and zone.
- **Upgrade** applies only to the POV's own active persistents in `UPGRADEABLE_ACTIVE_CARD_IDS`, its own Shield while `self.shield > 0` (the `active-shield` id), and its own ticking Sentences (`PendingSentence.id`). It is disabled with its reason at 0 upgrade points, off-turn or while locked, and hidden once upgraded or for Curse and Reanimation. It is never offered on an opponent's active, Shield or Sentence, which fixes the shared `active-shield` bug in the new path.
- **Deactivate** applies to own persistents only, never Shield or Sentence. It is disabled with its reason off-turn and while a sub-choice is open (Q40). The Lot 69 confirm stays a UI step.

Thumbs carry their badge kind: card lives, Invisibility turns, Sentence remaining owner turns, or none for Curse and Shield. Sentence and Shield never request activated art (`global-activated-art-guard`). Opponent, Spy-hand, log, queue, pool and shop cards get a read-only sheet. The old table keeps `activeUpgradeInstanceId` until L75, since nothing changes for players in L73 (§10.4). `docs/agent/decisions.md` records Q37 and Q40.

**Acceptance:** An opponent's base Shield offers no Upgrade, even when the POV holds a base Shield and 1 upgrade point. Own Poison, Shield and Sentence offer Upgrade with 1 upgrade point and show it disabled at 0. Deactivate is absent on Shield and Sentence, and disabled off-turn and during a sub-choice. Shield and Sentence thumbs never request activated art. `pnpm verify` green.

_Draft id L73-09._

## L73-08 — Add drop zones and dropTarget()

**Cx / risk:** S / Medium · **Depends on:** L73-06 · **Spec:** §4.3, §6.6.3, §6.6.4, §12.2
**Parity (Appendix A):** `table-use-target-routing`, `table-target-picker-eligibility`, `card-actions-dialog`
**Files:** `apps/client/src/view-model/drop-target.ts`, `apps/client/src/view-model/drop-target.test.ts`, `apps/client/src/view-model/card-actions.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

Add the §6.6.3 drop zones to the `cardActions` output, and `view-model/drop-target.ts` with `dropTarget(pointer, zoneRects, cardActions)` (§4.3, §6.6.4).
- A targeted card drops on a valid seat only.
- An untargeted card (self, or 'hits all') drops on the plate only.
- A card that needs a pre-send choice (Regeneration, Card Transformer) opens the choice step from the plate and sends nothing.
- A card whose Sell is legal (never a special) drops on the Sell zone.

It returns the exact intent payload (`playCard { instanceId, targetPlayerId? }` or `sellCard { instanceId }`), an open-choice result, or `null` for any other release: outside every valid zone, over an invalid seat, or inside two valid zones. `canDrag` is false off-turn and while locked; the arena adds the tutorial tour and Look gate. Pure rectangles, no DOM (§12.2).

**Acceptance:** An attack dropped on a valid seat returns `playCard` with that target. The same drop on a living Invisible seat or a non-qualifying corpse returns null. MEGA ATTACK on a seat returns null; on the plate it returns `playCard` with no target. Regeneration on the plate returns open-choice with no intent. A special over the Sell zone returns null. Off-turn, no drag starts. `pnpm verify` green.

_Draft id L73-10._

## L73-09 — Add selfStrip() and the dock

**Cx / risk:** M / Medium · **Depends on:** L73-07 · **Spec:** §4.3, §6.1, §6.3, §6.12, §11
**Parity (Appendix A):** `private-zone-identity`, `economy-bar`, `unspy-dialog`, `active-persistent-thumbs`, `sentence-chips`, `walk-in-spectator-mode`, `finished-board-readonly`
**Files:** `apps/client/src/view-model/self-strip.ts`, `apps/client/src/view-model/self-strip.test.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`view-model/self-strip.ts` with `selfStrip(view, ctx)` (§6.1 items 3 and 5, §6.3, §6.12). The strip carries:
- exact lives, shield (with its upgraded mark), points and upgrade points, plus the own kit id for the kit sheet
- own thumbs in order: combat Shield while `shield > 0`, then active persistents, then own ticking Sentences, each with its L73-09 actions
- own connection and flow badges (Block, Invisibility, Reanimating), and 'Duplication active'
- the POV label: seated, 'Reanimating', or 'Watching' with Leave

The dock carries:
- Draw at `drawGain ?? kit draw`, flagged hot above 10 (L64-05)
- Shop, always openable and browse-only off-turn
- Unspy, always present and disabled with its reason (no living spy, under `CLEAR_SPY_COST`, not your turn, or locked; L58-07). Never offered to spectators.
- Activate duplication for a Duplicator while it is not active (disabled off-turn or while locked)

On the finished board, Stats replaces Draw, Unspy and duplication, and Shop stays browse-only. For a walk-in spectator the economy is hidden (Q38). An eliminated POV keeps a locked dock.

**Acceptance:** Unspy is disabled with each of its reasons, and enabled with a living spy, 10 points and on turn. A Gambler payout of 14 is hot. A walk-in has no economy. An eliminated POV with `pendingReanimation` is Reanimating; without it, Watching. The finished board shows Stats and no Draw. The Shield thumb appears only while shield > 0. `pnpm verify` green.

_Draft id L73-11._

## L73-10 — Add shop() with one special-price constant

**Cx / risk:** M / Medium · **Depends on:** L72-03, L73-06 · **Spec:** §4.3, §6.8, §11, §13
**Parity (Appendix A):** `shop-dialog`, `table-shop-double-click-buy`, `economy-bar`
**Files:** `apps/client/src/view-model/shop.ts`, `apps/client/src/view-model/shop.test.ts`, `apps/client/src/view-model/opponent-token-chips.ts`, `apps/client/src/screens/table/shop-dialog.tsx`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`view-model/shop.ts` with `shop(view, ctx)` (§6.8), with tabs Cards, Special, Pool and Upgrade points.
- **Cards:** `SHARED_CARD_IDS` tiles at their catalog `buyCost` (Spy buys for 4 and plays for 2, Lot 54). Affordability checks both points and lives. The kit's `alwaysUpgraded` cards show upgraded faces. Includes the selected card's cost for the price blurb.
- **Special:** Buy special for 20 points, from one client constant that replaces the copies in `opponent-token-chips.ts` and `shop-dialog.tsx` (Q50). The server's `SPECIAL_CARD_PURCHASE_COST` stays authoritative and untouched.
- **Pool:** public faces, and Buy random at `poolBuyCost`, disabled when the pool is empty or the POV is under the fee.
- **Upgrade points:** Buy at `upgradePointBuyCost(kitId)` and Sell for `upgradePointSellYield(kitId)`, both computed at call time (L58-03).

Every buy is disabled with its reason off-turn, while locked, or on the finished board (browse-only). For tutorial highlights, `shop-upgrade-point` opens the Upgrade points tab and `shop-absorber` opens Cards with Absorber preselected.

**Acceptance:** The Spy tile costs 4 to buy. Upgrade-point Buy and Sell follow a kit-specific price. Buy special is disabled at 19 points with its reason. Buy random is disabled on an empty pool and under the fee. Off-turn every buy is disabled while every tile stays listed. `grep` finds one client literal for the special price. `pnpm verify` green.

**Review:** The single client special-price constant lives here; Lot 74 only consumes `shop()`.

_Draft id L73-12._

## L73-11 — Add log(); remove unused log filters

**Cx / risk:** S / Low · **Depends on:** L72-03, L73-02 · **Spec:** §4.3, §6.9, §11, §12.2
**Parity (Appendix A):** `table-action-log-panel`, `table-action-log-entry-copy`, `table-action-log-resource-nets`, `table-action-log-inspect`, `table-action-log-post-lot61-lines`
**Files:** `apps/client/src/view-model/log.ts`, `apps/client/src/view-model/log.test.ts`, `apps/client/src/view-model/action-log.ts`, `apps/client/src/view-model/action-log.test.ts`, `docs/agent/decisions.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`view-model/log.ts` with `log(view)` (§6.9), built on the moved `action-log.ts`. It returns:
- the ticker line: the latest `actionLog` entry as segments
- the sheet's round groups (`groupByRound` with the seat count), with icon resource nets
- which card segments are inspectable (L56-05): plays, multi-attacks, named pool buys, deactivations, resolutions, Mirror redirects, Curse transfers and lost persistents. Draw, buy, sell, upgrade, elimination, reward, Sentence and `blockedBy` segments are never inspectable.

Fog stays on the server: the client renders only the fields present (unspied Ghost `+?`, pool-buy identity). Remove the unused `filterActionLog`, `groupByTurn`, `entryInvolvesPlayer` and `ActionLogFilters`, and their L9-02 test block. They have been dead since the panel dropped its filters (§11, Q62). Add a `docs/agent/decisions.md` entry. `ACTION_LOG_KINDS` and its L56-03 test stay.

**Acceptance:** The ticker is the last entry. Groups split on round boundaries at 4 and 8 seats. A fogged pool buy reads 'a card from the pool' with no inspectable card. An unspied Ghost gain renders `+?`. No import of the removed helpers remains. `pnpm verify` green.

**Review:** Owns the removal of the unused log filters (Q62). The "dies by Gambling" line is handled in L81-01 after a reachability check.

_Draft id L73-13._

## L73-12 — Add rulesRecall() and turn-length source selection

**Cx / risk:** S / Low · **Depends on:** L72-03 · **Spec:** §4.3, §6.11, §7.6, §6.10
**Parity (Appendix A):** `rules-recall-table-end`, `lobby-rules-summary`
**Files:** `apps/client/src/view-model/rules-recall.ts`, `apps/client/src/view-model/rules-recall.test.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`view-model/rules-recall.ts` (§6.11, §7.6).
- `rulesRecall(lobbyView | finishedView)` returns the turn time, Random only, and the excluded and allowed kits (`allowedKitIds`). It returns `null` when the rules are unknown, and in the tutorial (`FinishedStateView.lobbyRules` is omitted there, and the tutorial never shows rules).
- A pure cache step keeps the last `LobbyStateView.lobbyRules` seen for the room (`gameCode`). Each new lobby view replaces it, Play again included, and a room change drops it.

The cache feeds `turnClock` and the table recall. It lives in memory only: nothing is persisted, so a reload mid-game hides the recall. No protocol change.

**Acceptance:** A lobby view with 2 excluded kits and 30 s recalls both. A finished Classic view recalls its own rules. A tutorial finished view gives null. A new room code clears the cache. `pnpm verify` green.

**Review:** Renamed: pure `rulesRecall()` and turn-length source selection only — the App-level cache of the last `lobbyRules` and the `lastTurnStarted` receive time belong to Lot 74 (clock task).

_Draft id L73-14._

## L73-13 — Add turnClock() with modes and length fallbacks

**Cx / risk:** M / Medium · **Depends on:** L73-12 · **Spec:** §4.1, §4.3, §6.10, §13
**Parity (Appendix A):** `table-turn-timer-scale`, `turn-strip-timers`
**Files:** `apps/client/src/view-model/turn-clock.ts`, `apps/client/src/view-model/turn-clock.test.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`view-model/turn-clock.ts` with `turnClock({ turnStarted, view, cachedLobbyRules, readOnly, nowMs })` (§6.10, Q19/Q33/Q65). Modes are checked in this order:
- `none` in the tutorial, on the finished board, and with a null deadline (bot turns)
- `paused` ('Paused — reconnecting') while the active seat is disconnected
- `absent` ('Absent — auto-draw') when the active seat is absent with no deadline
- otherwise `countdown`, with seconds left taken from the server deadline only (ceil, ≥ 0)

The countdown's full length comes from (1) the cached lobby `turnTimeSeconds`, else (2) the first `TURN_STARTED` seen for this `turnSequence` (`deadlineMs − receivedAtMs`; state is sent before `TURN_STARTED` in `game-room.ts`), else (3) seconds only, with no ratio. It flags `danger` for the last 10 s and `tick` for the last 5 s (used in L79). A pure record step keeps the first sighting's length when a later `TURN_STARTED` arrives for the same `turnSequence` (resume). It ignores a record whose `turnSequence` is not the view's, such as a stale human record during a bot turn. The display stays cosmetic. Once L74 wires it, it replaces the fixed 60 s divisor.

**Acceptance:** There is one test per mode. A 30 s host turn with 15 s left gives ratio 0.5. A resume `TURN_STARTED` keeps the original length. With no cached rules and no record, the clock gives seconds only. `danger` starts at 10 s and `tick` at 5 s. A bot turn after a human turn is `none`. A finished board with a disconnected last seat is `none`. `pnpm verify` green.

_Draft id L73-15._

## Draft questions and their dispositions

Resolved in the 2026-10-21 backlog review unless listed under "Designer questions still open" in `docs/backlog_v7.md`; dispositions are recorded in the **Review** lines above and in the amended spec.

- Layout modes (§6.4): some boxes match no mode. Landscape boxes with height ≥ 500 px that are not desktop (for example 1024×600 or 900×650) and portrait boxes under 500 px tall are undefined. Proposed: height under 500 px means landscape-compact first, then desktop, and every other box uses the portrait arc. Related: a walk-in spectator has no anchor. Should its seats start unrotated from `turnOrder[0]` and use the full ellipse in portrait too?
- Seat badges (§6.2): which statuses take the two visible badge slots, and do active persistents and ticking Sentences count as badges or keep a thumbs row on the seat? Proposed order: spying-on-you, Block, Invisibility, ticking Sentence, Shield, persistents, Duplication, then Reanimation / absorb window.
- Recurring chips (§6.5) read as if own Block pauses every chip. The rules spec (Block card) and `apps/server/src/engine/turn/apply-persistent-effects.ts` keep Curse draining during Block; only Poison and Imposition pause, while Invisibility pauses all three. L73-07 follows the rules spec and the engine and records it in `decisions.md`. Confirm.
- Recurring chip amounts: the Poison, Imposition and Curse rates exist only as server constants. L73-07 mirrors them as client constants citing the rules spec, as `CLIENT_SUB_CHOICE_MS` already does. Is that acceptable, or should they move to `packages/shared`, which touches the server? Curse can only show a rate (1 life per 3 or 2 points spent), not a fixed number. Is that acceptable?
- Fan-out (§6.5): is a 'hits all' play against a single living opponent drawn as a plain arrow? An Assassin volley that hits every opponent with the same card id and `queuedAt` looks exactly like a fan-out on the wire. Should it render as the burst, with each target keeping its own label?
- §4.1 lists `fx/play-flyout.ts` '(trigger logic)', but the file is DOM measurement against old-table anchors, apart from its zone constants and selector builders. Should only those move, with the rest staying in `fx/` until L74/L78 rehost the FX?
- Q37 (opponent-Shield Upgrade upgrades your own Shield) stays live in the old table until the L75 flip, because L73 only fixes the new view-model path and changes nothing for players. Should the old table be fixed now instead, with a 'Fixed some bugs.' What's new item?
- Disabled reasons (§11): L73-08 adds 'Block: attacks banned this turn', because the server rejects attacks and Block while `blockAttacksForbidden` is set. It also gives Multi-attack the Invisibility and Block reasons the server already enforces. Should it add 'needs two attacks in hand' for Multi-attack as well? Confirm or trim these.
- turnClock signature: §4.3 lists `{ turnStarted, view, cachedLobbyRules, nowMs }`. L73-15 adds `readOnly`, so a finished board with a disconnected last seat does not show 'Paused'. It also adds a record that keeps the first sighting's length per `turnSequence`. Accept this extension?
- Overlap with L72: §5.5 moves the `asset-lookup` tests in L72's art task, and §4.2 lets L72 rebuild shared pieces (`chat-unread`, `table-banner`, `kit-inspect-traits`…). L73-01 and L73-02 move only what the `backlog_v7.md` §4.1 list still shows as unmoved. Is that list the single source? Should old-layout helpers that L75 deletes (`card-band-fit.ts`, `felt-collapse.ts`) stay where they are rather than move?
- L76 and L80 run in parallel from L72 and may import modules that L73-01 and L73-02 move (`release-storage`, `help-storage`, `chat-unread`, `structured-cost`, `seat-colors`). Should L73-01 and L73-02 merge into `dev` first and the parallel branches rebase, or should those paths stay frozen until L76 merges?
- Finding outside V7: server bot code still reads `spied.resourcesSnapshot` (`apps/server/src/bots/score-engage/score-actions.ts:68`, `apps/server/src/bots/belief/determinize.ts:119` and `:230`). The server has not sent that field since Lot 69, so bots never see base-Spy resources. Should this be tracked as a separate V5 or server fix (§14.1)? **Corrected 2026-10-27:** this is no behavior bug. Every bot path reads the live `spied.*` fields first, and the server has sent them since Lot 69. Only the snapshot fallback is dead code. It is tracked as separate work in spec v7 §14.1 (designer: separate fix).

