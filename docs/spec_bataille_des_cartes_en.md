# Rules Spec — Card Battle (video game)

## 1. Resources and Fundamentals

### Resources

- **Lives**: determines whether a player remains in the game. At 0, the player is eliminated.
- **Points**: general-purpose currency, used among other things to use cards, buy or sell cards, and buy upgrade points.
- **Upgrade points**: allows a card to be upgraded permanently, once per game. Purchase cost: 10 points. Resale: 7 points. (This cost can be modified by certain kit special abilities — see Kits section.)
- **Shield**: additional point capital protecting the player; destroyed when it reaches 0.

### Damage and Life Loss

- **Damage** specifically refers to life loss inflicted by an attack-type card (basic attack cards, and any special card explicitly defined as an attack — e.g. MEGA ATTACK, see Special Cards section).
- The shield only absorbs damage, before the player's lives. If damage exceeds the remaining shield points, the excess carries over to the player's lives.
- Any other life loss (a card's cost like Tax, an effect like Suicide, Poison, etc.) is not an attack: it is not filtered by the shield and applies directly to the player's lives.

### Card Economy (attack and action)

- Selling a card yields its usage cost in points, unless stated otherwise for a given card.
  Selling an **upgraded** copy also refunds 1 upgrade point (including copies that are
  upgraded by a permanent kit trait).
- Buying a card you don't own costs double its usage cost. This purchase comes from an infinite stock, independent of cards sold or lost by eliminated players.
- Upgrading a card costs 1 upgrade point, regardless of the card.
- A player can own multiple copies of the same card.

### Shared Pool

Sold cards, used special cards (a special card has only one use, except Card Absorber — see section 5), and eliminated players' cards join a common pool. Occupancy and the faces of cards sitting in the pool are visible to all players. Card Absorber recovers four cards from it. Independently, on their turn a player may buy **one random** card from the pool: the table-wide fee starts at 1 point and **doubles after every such buy** (never resets, including when the pool is empty). Card Absorber does not change that fee. An empty pool cannot be bought from. The buy consumes the turn. Other players see that a pool buy happened; they do **not** see which card was recovered unless they already see that buyer's private information (self, Spy of the buyer, or an eliminated / walk-in spectator overlay). The buyer still sees the card.

### Counter Rule

A card that inflicts a direct effect on an opponent — meaning it alters their resources or state against their will (Spy, Thief) — can be countered by the same card played back against the source of the effect. The same upgrade level cancels both. An upgraded incoming Spy or Thief removes a basic answer and still resolves. A basic incoming Spy or Thief is cancelled by an upgraded answer, and that upgraded card stays pending. Playing the same card against a third party counters nothing. A living player may play Thief against an eliminated player only while that player still has a pending Thief on them. The counter is compared the same way, then the answer is discarded and does not stay queued on the corpse. A Thief aimed at an eliminated player who has no Thief pending against you is illegal. This rule does not apply to attack cards (see the mutual attacks rule, section 6), nor to cards that inflict no effect on the opponent, even when they target them to choose who to act on (Absorber: the user chooses which opponent to absorb from, but that opponent suffers no additional consequence from this card), nor to strictly personal cards (Shield, Regeneration, Tax). Mirror follows a distinct mechanic, one of chain redirection rather than cancellation (see section 3).

### Kits

Each kit corresponds to a unique card. 16 kits currently exist: 15 finalized and the Duplicator, in testing. In the lobby, each player may choose a kit (or keep Random). The choice stays hidden from opponents. Seats that stay on Random receive a kit drawn at random at the start of the game. Duplicate kits across seats are allowed.

### Number of Players

Classic mode: 2 to 8 players. Team, God and Quick modes stay out of this implementation.

### Victory Conditions

Defined per game mode (see Game Modes section).

## 2. Attack Cards

An attack card targets an opponent of choice and inflicts damage on them, reducing their lives. It follows the general Card Economy rules (section 1).

| Card | Cost | Damage (base) | Damage (upgraded) |
|---|---|---|---|
| Basic attack | 1 point | 1 | 3 |
| Strong attack | 2 points | 2 | 4 |
| Super attack | 10 points | 7 | 10 |

The cost/damage ratio is not linear across cards: a high-damage attack is a deliberate design choice. A defending multi-attack adds its damage together (section 6). Incoming hits stay separate: the defense cancels only the hits it can cover, largest first, and the rest still resolve. Once upgraded, Super can only be redirected by an upgraded Mirror.

## 3. Action Cards

Action cards follow the general Card Economy rules (section 1). The Counter Rule (section 1) applies to Spy and Thief; it does not apply to Mirror (which follows its own chain-redirection mechanic, detailed below), nor to Absorber (which targets an opponent but inflicts no effect on them), nor to Shield, Tax and Regeneration (strictly personal effects).

**Absorber** — Price: 3 points
- Action: the user chooses an opponent; they gain all the lives that opponent lost during their last move — their most recent complete turn, from their action to the end of their resolution phase —, regardless of the cause of that loss. Does not allow absorbing one's own lost lives. An eliminated opponent remains a valid choice until every player who was still alive at that elimination has finished one turn, through their own action; after that window closes, they can no longer be absorbed. The last living player from that elimination can still choose the corpse on their turn.
- Upgrade: also captures every point and every upgrade point that left that opponent during their last move, whatever the way (a spend, a sale, or a theft). Shield points that leave are never captured. Base Absorber stays lives only.

**Spy** — Price: 2 points
- Action: allows you to see the opponent's lives, points, upgrade points, and shield live for the rest of the game (not their kit or cards). Can be countered by another Spy of the same upgrade level. An upgraded Spy is not cancelled by a basic Spy; a basic Spy is cancelled by an upgraded Spy, which stays pending.
- Upgrade: also allows you to see the opponent's kit, hand, and special cards, in addition to those live resources.
- The spied player may, as their turn action, pay 10 points to drop **one** living opponent's Spy on them (Unspy). That action is public. An eliminated spectator's overlay vision is not a Spy and cannot be Unspied.

**Thief** — Price: 5 points
- Action: steals 10 points from an opponent, capped at the amount the target has. Can be countered by another Thief of the same upgrade level. An upgraded Thief is not cancelled by a basic Thief; a basic Thief is cancelled by an upgraded Thief, which stays pending.
- Upgrade: the target always loses the stolen amount (capped as in the base version), but the user gains double that amount.

**Mirror** — Price: 6 points
- Action: redirects a non-upgraded attack intended for the user toward an opponent of choice. If several non-upgraded attacks are pending against them, they choose which one to redirect. Cannot redirect an already-upgraded attack. The redirected attack remains a fully pending attack, simply directed at its new target: it can be redirected again by another Mirror, with no limit on the chain, and if the newly targeted player has their own attack pending against the Mirror's user, both attacks are evaluated as mutual attacks between these two players (section 6). Playing Mirror when no non-upgraded attack is pending against the user is an invalid action, not a wasted card.
- Upgrade: also allows redirecting upgraded attacks, and doubles the damage of the redirected attack.

**Shield** — Price: 7 points
- Action: grants 4 shield points. A player can only have one active shield at a time. Playing Shield while a shield is already up spends the turn and sets the total from the card just played: basic becomes 4 and not upgraded; Shield+ becomes 7 and upgraded. A basic Shield played onto an upgraded shield drops it to 4 and clears the upgraded flag. The Shield card stays in hand (action cards are reusable). Refilling a shield does not open a second shield or an extra active slot.
- Upgrade: grants 7 shield points and blocks Thief, Spy, and Imposition at no cost in shield points while active. While a shield is already up and not yet upgraded, spending 1 upgrade point and the turn sets that upgraded flag. Remaining shield points stay as they are until replaced by playing Shield again as above.

**Tax** — Price: 1 life (this cost always applies; the shield only protects against attacks)
- Action: allows you to gain 4 points.
- Upgrade: allows you to gain 6 points for the same life spent (always 1 life per use).

**Regeneration** — Price: 3 points per life, up to 4 lives per use
- Action: buys up to 4 lives at 3 points each.
- Upgrade: cost reduced to 2 points per life; the cap of 4 lives per use remains unchanged.

## 4. Kits

### Starting Card Distribution

Each kit's starting action and attack cards are drawn randomly among the available types, up to the number indicated for that kit. Duplicates are possible (a player can start with several copies of the same card type).

### Kit Upgrades

Some kits apply an ability that makes a specific card type always upgraded, for every copy held by the player, regardless of how it was acquired (starting distribution, purchase during the game, elimination reward, theft). Example: Scientific has Spy always upgraded — if they buy a second Spy on turn 12, it arrives upgraded. This state is permanent and free: it never consumes the player's upgrade point stock.

### Roster

| Kit | Lives | Points | Upgrade pts | Draw | Action cards | Attack cards | Special ability | Special cards |
|---|---|---|---|---|---|---|---|---|
| Upgrader | 10 | 0 | 3 | 1 | 4 | 2 | An upgrade point costs 5 points instead of 10 | Upgrade Point Thief |
| Untouchable | 10 | 0 | 0 | 1 | 5 | 2 | Immune to Thief and Spy | Spy Thief, Imposition |
| Kamikaze | 4 | 9 | 1 | 1 | 7 | 2 | None | Suicide |
| Tactician | 1 | 15 | 0 | 4 | 2 | 2 | Spy, Thief and Mirror already upgraded | Block |
| Indestructible | 18 | 0 | 0 | 1 | 4 | 1 | Tax and Regeneration already upgraded | Super Regeneration |
| Assassin | 10 | 0 | 0 | 1 | 4 | 4 | Can play an unlimited number of attack cards in the same turn, as long as they have the necessary points. Each attack targets an opponent of choice (the same target or different targets). Each attack keeps its own independent resolution. | Sentence, Points Generator |
| Prophet | 10 | 4 | 2 | 1 | 5 | 2 | None | 2 random special cards, drawn from the circulating special pool |
| Specialist | 8 | 4 | 0 | 1 | 3 | 2 | Absorber already upgraded | 2 Card Transformers, Card Thief, Super Absorber |
| Scientific | 10 | 0 | 0 | 1 | 5 | 2 | Spy already upgraded | Cloning |
| Ghost | 14 | 0 | 1 | 1 | 4 | 2 | Tax already upgraded. Every life this player loses, regardless of cause, makes them gain 2 points | Curse |
| Witch | 10 | 0 | 1 | 1 | 5 | 2 | Thief already upgraded | Reanimation, Poison |
| Warrior | 10 | 0 | 0 | 1 | 3 | 3 | All attacks already upgraded | Card Absorber |
| Wizard | 10 | 4 | 0 | 2 | 4 | 2 | Thief already upgraded | MEGA ATTACK |
| Juggernaut | 14 | 4 | 1 | 1 | 4 | 2 | Shield already upgraded | Super Mirror |
| Duplicator (in testing) | 2 | 0 | 0 | 1 | 1 | 0 | Activatable duplication — see detail below | Imposition, Attack Thief |
| Gambler | 1 | 0 | 0 | 10 | 0 | 0 | Draw risk — see detail below | 2 distinct random specials (never Roulette) plus Roulette |

### Duplicator — Ability Detail

- On their turn, the Duplicator can choose to activate their duplication **instead of** taking a normal action (drawing, playing/selling/buying a card, buying an upgrade point). Activation is anticipatory: it covers the gains of the following table round (until the Duplicator's next turn), not gains already obtained before activation. It has no resource cost — its only cost is occupying the Duplicator's action for that turn, instead of a normal action.
- *Rebalancing hypothesis to test as a priority (not validated by playtesting): raise starting lives from 2 to 6 and starting action cards from 1 to 2. Reason: the shift from passive to active duplication removed its survival safety net without compensation elsewhere — it risks dying before ever getting to activate its ability once.*
- Once activated, they receive a copy of all lives, all points, and all upgrade points gained by all opponents — regardless of the source of that gain (including a gain from theft such as Thief or Spy Thief, or from an elimination reward). It's a copy: the opponent keeps their gain, the Duplicator receives the equivalent.
- Cards are never duplicated, regardless of their origin.
- If they take another action on their turn instead of activating duplication, no gain is duplicated during the interval that follows — activation is not permanent, it must be renewed on every Duplicator turn to stay active.
- If several players have the Duplicator kit in the same game, they exclude each other for gains obtained through their own duplication power (no loop): only a Duplicator's active gains (obtained directly through their own actions, not those received through duplication) are duplicated by another Duplicator.

### Gambler — Ability Detail

- Starts with 1 life, 0 points, 0 upgrade points, no attack or action cards, **2** random special cards drawn **without replacement** from the circulating pool excluding Roulette (the two are distinct; never a second Roulette), and **Roulette**.
- Catalog Draw stays **10** as the listed kit number. At the start of each of this player's turns (including Block extra turns), Draw payout is rerolled to an integer **5–100** inclusive with truncated-geometric weight P(n) ∝ r^(n − 5), r = 10^(-1/16) ≈ 0.8660, so P(n > 20) ≤ 0.10 (5 is most likely; each extra point is rarer; 100 stays possible). Other kits keep catalog Draw.
- Each Draw has a **1-in-10** chance that this player gambled too much. Lives drop to 1 (real life loss, not damage, so the drop cannot reach 0). Points become 0. Upgrade points become 0. Shield is lost, including an upgraded shield. Every card in hand and every unplayed special moves to the shared pool with no sell refund. Active persistent cards stay. The player is not eliminated, no Absorber window opens, and nobody is paid a kill reward. The table says `{nickname} gambled too much and lost everything`. That player also sees the red table banner `You gambled too much and lost everything`. Other seats do not get the banner. The Draw number stays hidden from seats that cannot already see it. The rolls use the injected seeded generator. Invisibility's passive point ticks do not roll.
- Roulette is otherwise a normal circulating special (shop, Prophet, Card Transformer).

## 5. Special Cards

### General Rules

- A special card cannot be bought or sold individually. It is possible to pay 20 points to get a random special card (the player does not choose which one).
- A special card has only one use. As with attack and action cards, upgrading it costs 1 upgrade point. An upgrade placed before use is lost once the card is played.
- Spending 1 upgrade point can also upgrade one of your own active Poison, Points Generator, Imposition, Super Absorber, Roulette, Invisibility, or Shield cards, or your own ticking Sentence. That spends the turn. Counters, Sentence remaining turns, and remaining Shield points do not reset; the upgraded rate applies from the next tick. An upgraded Shield blocks Thief, Spy, and Imposition at no shield cost while it is still up. Sentence only becomes upgraded, so the later draw cannot pick you. Curse, Reanimation, and a card that is already upgraded cannot be upgraded this way.
- A special card with a persistent effect (activated once, then active until a deactivation condition) is permanently lost once deactivated, just like any other special card — except voluntary deactivate (below) returns it to the shared pool.
- **Active slots (max 4):** a slot is an up shield, your Poison, Points Generator, Imposition, Super Absorber, Roulette, or Invisibility, a Curse sitting on you, or your own ticking Sentence. One-shots, pending attacks, and Attack Thief charges do not count. Curse occupies the cursed player, not the caster. Upgrading an already-active persistent card, and refilling a shield, do not add a slot. At four slots, a new activation does not stick until someone drops one existing slot from a list (same timeout as other picks); they cannot refuse the new card. The activating player chooses which slot to drop, except when Curse lands on an opponent who already has four actives — then the Curse user picks which of the victim's slots to remove. Clearing a dropped shield sets shield points to 0; clearing Sentence cancels the countdown (its card is already in the pool). A forced drop cannot remove a Curse on you — only transfer on a successful attack or dropping to 1 life ends it. On your turn you may deactivate as many of your persistent specials as you want, including a Curse on you, without spending your action or ending the turn; those cards go to the pool. Shield and a ticking Sentence still occupy a slot but cannot be hand-deactivated (only a forced drop clears them).
- Five cards (Points Generator, Poison, Super Absorber, Imposition, Roulette) are tied to a **dedicated internal counter** ("card lives"), independent of the combat shield: it does not protect the user (damage continues to reach them normally, following the usual shield/lives rules). In parallel, every time the user loses a life to damage, this counter also loses 1 point. When it reaches 0, the card deactivates and is permanently lost. Starting counter values: Points Generator 3, Poison 3, Super Absorber 2, Imposition 2, Roulette 2.

### Card List

**Upgrade Point Thief** — Price: 5 points
- Action: the user chooses one living opponent (a living invisible player cannot be chosen). Steals all unspent upgrade points from that opponent, and removes the upgrade from all of their currently upgraded cards, including those whose upgrade comes from a permanent kit ability. Each upgrade lost this way transfers 1 upgrade point to the user; the victim gets nothing back. This effect only removes the upgrade from copies held at the moment the card resolves: if a kit ability makes a card type always upgraded, any new copy acquired afterward (purchase, elimination reward, theft) arrives upgraded again normally. It does not steal points.
- Upgrade: the same steal hits every living opponent (still not a living invisible player) and still does not steal points.

**Spy Thief** — Price: 5 points
- Action: the user chooses one living opponent (a living invisible player cannot be chosen). Steals all of that opponent's points (no cap, and the stolen points are not doubled) and leaves a Spy+ reveal on them for the rest of the game: kit, cards, and live resources. Not counterable. An upgraded Shield does not block it. Untouchable is not immune.
- Upgrade: that same steal and Spy+ reveal hit every living opponent (still not a living invisible player). Stolen points are not doubled.

**Suicide** — Price: 3 points
- Action: the user is eliminated on their next turn. All opponents lose 5 lives and all their points (each on that opponent's turn, after they act). The user is the eliminator of every opponent killed by this effect and receives the corresponding rewards (even though they may still be eliminated later by their own pending Suicide). No reward is granted for the user's own elimination.
- Upgrade: the user is no longer eliminated by their own card. They remain the eliminator of every opponent killed by this effect, and receive the corresponding rewards normally.

**Block** — Price: 5 points
- Action: cancels any action pending resolution against the user, then they play 3 consecutive turns (other players wait). They can play any action during these turns, except attack cards. Block itself cannot be played during an active Block chain. While Block is active (the turn it is played and every extra turn in the chain), Imposition does not drain that player; Poison, Curse, and attacks are unchanged.
- Upgrade: 7 consecutive turns instead of 3.

**Super Regeneration** — Price: 6 points
- Action: gain 9 lives.
- Upgrade: gain 18 lives.

**Sentence** — Price: 20 points
- Action: after **3** of the user's own later turns (the activation turn does not count as one of those three, and neither does the turn Block is played nor any extra turn from that Block), a seeded random living player is chosen (including the user) and elimination is queued for that victim's next turn. Invisible players are excluded from the draw. If nobody remains eligible, the Sentence fizzles. If the user is eliminated before the draw fires, the Sentence is cancelled and does not queue. Remaining countdown turns are not card lives and are not shortened by damage. Sentence is not a manual deactivate. The table sees a public countdown on the caster while it ticks. When the user plays Sentence, everyone sees **Sentence in 3 turns!** When remaining decrements on a later caster turn, everyone sees **X turn(s) before Sentence!** When Sentence fires, everyone sees **Sentence will kill {victim}!** Those table-wide messages do not appear on other players' turns. Eliminated seats and spectators still see them.
- Upgrade: the random draw never picks the user.

**Points Generator** — Price: 5 points
- Action: generates 3 points per turn for the user, as long as the card's dedicated internal counter (see General Rules) is not depleted.
- Upgrade: generates 6 points per turn.

**Card Thief** — Price: 5 points
- Action: the user chooses the targeted opponent; they steal a random card from them. If that opponent is currently spied on (Spy active on them), the user can choose exactly which card to steal instead of a random draw.
- Upgrade: steals a card from every opponent (same exception if an opponent is spied on).

**Card Transformer** — Price: 2 points
- Action: the user transforms an action or attack card of their choice, in their possession, into a random special card. The result is never another Card Transformer.
- Upgrade: allows choosing the special card obtained instead of a random draw. Card Transformer is not among the choices.

**Cloning** — Price: 3 points
- Action: the user copies an opponent of choice's kit, lives, points, upgrade points and shield. The user keeps their own hand, special cards and active persistent cards. This action cancels all effects pending against the user; they inherit no effect pending against the cloned player. Any visibility gained through Spy (or equivalent) is reset to zero both ways: what the user held over other players, and what others held over them.
- Upgrade: also gains 10 points, 2 upgrade points and 4 lives.

**Invisibility** — Price: 10 points
- Action: the user becomes immune to any opposing action and draws 4 points per turn while invisibility is active (designer 2026-09-15 / Lot 58). Lasts **4** of the user's turns including the activation turn, then the card is lost. While it is active the user cannot play anything that acts on another player (attacks, MEGA ATTACK, Spy, Thief, Card Thief, Spy Thief, Upgrade Point Thief, Poison, Curse, Imposition, Super Absorber, Absorber, Cloning, Suicide, Sentence, Mirror, Super Mirror). Self-economy stays legal (draw, shop, buy/sell/upgrade, Super Regeneration, Card Transformer, Card Absorber, Block, Reanimation, Duplicator). Remaining turns are not card lives: damage does not shorten the duration. On their turn the user may deactivate it without spending their action (the card goes to the pool).
- Upgrade: lasts **7** of the user's turns instead of 4, and draws 6 points per turn.

**Reanimation** — Price: 8 points
- Action: upon activation, if the user is eliminated later in the game, they are reanimated with a random kit and its starting resources, as at the start of the game, instead of being permanently eliminated. Coming back clears every Spy involving that player: they no longer spy anyone, and no stored Spy on them remains. An eliminated spectator's overlay is not a stored Spy.
- Upgrade: allows choosing the reanimation kit instead of a random draw.

**Card Absorber** — Price: 4 points
- Action: recovers 4 random cards from the shared pool (sold cards, used special cards except Card Absorber itself, eliminated players' cards). The Card Absorber card is consumed and never joins the pool.
- Upgrade: allows choosing the 4 recovered cards instead of a random draw.

**MEGA ATTACK** — Price: 16 points
- Action: attacks every player in the game for 20 damage. This is an attack-type card (the shield applies normally). Can only be redirected by an upgraded Mirror.
- Upgrade: can no longer be redirected at all.

**Super Mirror** — Price: 7 points
- Action: redirects every attack currently pending against the user toward all opponents, each independently — each opponent takes the damage of each of the attacks redirected this way (not a single combined attack). These redirected attacks can no longer be redirected by a regular Mirror, but can be by another Super Mirror.
- Upgrade: doubles the damage of the attacks redirected this way.

**Super Absorber** — Price: 8 points
- Action: persistent on the user (counter 2 is card lives). Every living opponent: absorb the lives they lost on their turn. Playing it does not capture opponents' last complete turns (no activation snapshot), including eliminated opponents still inside the Absorber window described in section 3. Invisible opponents are skipped. Lives gained still cap at 25.
- Upgrade: also absorb every point and every upgrade point that left them that turn, whatever the way (a spend, a sale, or a theft). Shield points that leave are never captured. Amounts are not doubled.

**Curse** — Price: 8 points
- Action: the user chooses an opponent to curse. The effect lives on that opponent (not the user). While cursed, they lose 1 life for every 3 points they spend on their turn. Every life that player actually loses (after the shield, from any cause — including that spend drain) is granted to the **original user** who played that Curse copy. Multiple Curses on the same player stack — each copy ticks and pays independently.
- The siphon does not apply when the Curse sits on its original user (they do not gain the lives they lost). It also does not apply if that original user is missing or already eliminated.
- Passing the Curse: when a cursed player successfully deals at least 1 life with any attack card, every Curse they hold moves onto the hit player (the upgraded state and original user are kept). Cancelled, blocked, immune, or fully shield-absorbed attacks do not transfer.
- End: the effect deactivates and is permanently lost to the shared pool as soon as the cursed player drops to 1 remaining life (it cannot finish them off), or when that player is eliminated.
- Upgrade: 1 life lost per 2 points spent instead of 3, and each life the victim loses grants 2 lives to the original user instead of 1.

**Poison** — Price: 8 points
- Action: all opponents lose 1 life per turn, as long as the card's dedicated internal counter is not depleted.
- Upgrade: 2 lives lost per turn instead of 1.

**Imposition** — Price: 6 points
- Action: every turn, only points an opponent has above 7 can be taken, capped at 2. 7 or below gives nothing; 8 gives 1; 9 gives 2. If nothing can be taken, nothing happens (no lives, and the turn is not skipped). An upgraded Shield on that opponent stops the drain and spends no shield points. The counter stays 2. Effect active as long as the card's dedicated internal counter is not depleted.
- Upgrade: the cap is 4. 11 points gives 4. 7 or below still gives nothing.

**Attack Thief** — Price: 8 points
- Action: blocks every attack already pending against the user, each one on its own, and steals a random attack card from each opponent. It does not block an attack played on a later turn. The public log names Attack Thief when it blocks.
- Upgrade: steals all attack cards from all opponents.

**Roulette** — Price: 10 points
- Action: activates a persistent on the user. Each of the user's turns, including the activation turn, they gain one random **normal** (shared attack or action) card — never a special. Independent **10%** chance the granted copy is already upgraded. 2 card lives.
- Upgrade: still one card per turn; **80%** a shared attack or action / **20%** a circulating special other than Roulette; independent **10%** chance the granted copy is already upgraded (whichever bucket hit).

## 6. Game Flow and Resolution

### Setup

1. Each player receives a kit: the kit they chose in the lobby, or a random draw (section 4) if they kept Random.
2. Each player receives their kit's starting resources (lives, points, upgrade points).
3. Each player receives their starting attack and action cards, drawn at random according to their kit's quantities (duplicates possible, section 4).
4. Each player receives their kit's special cards.
5. Turn order is determined, then the game begins.

### Visibility

Remain private: each player's kit, the contents of their hand, and the exact value of their resources — except for a specific effect (Spy and equivalents). Every action played is public, including the card's identity, including purchases, sales, upgrades, draws, and Unspy. A pool buy is public as an action; the recovered card's identity stays private to the buyer (and anyone who already sees that buyer's private information). The queue of pending effects is public, as is a ticking Sentence countdown. A player who is being Spyed sees which living opponents currently spy them (eye on those seats) and may Unspy one of them for 10 points (section 3).

### Game Turn

- A player can only take one action per turn, whether a classic action (drawing, playing/selling/buying a card, buying an upgrade point, buying a random pool card, Unspy) or using a special card — no exception, except an explicit override from a kit or a card (e.g. Assassin, Block).
- Drawing: the player gains a number of points equal to their kit's "Draw" value (section 4). That's all this action does — it does not grant any card, despite its name. Gambler's Draw instead grants the payout rolled at the start of that turn (section 4) and rolls a 1-in-10 wipe (section 4). A wipe does not eliminate.
- An action targeted at an opponent takes effect on that opponent's next turn, never before. A player can therefore never suffer a loss of life or resources outside of their own turn.
- A player's turn is only considered over once they have played their single action. Pending actions targeting them only resolve **after** they have played that action — giving them a chance to react before the effects apply (riposte, buy lives, use Mirror, etc.). Example: player A attacks player B (2 lives) with a Super attack. B does not die automatically upon reaching their turn: they first play their action (for example Regeneration to gain lives), then A's attack resolves. If their action neither modifies nor cancels the attack, it then applies normally.
- Periodic effects targeting an opponent (Poison, Imposition) follow the same logic: they trigger on the target's turn, after they have played their action. Imposition does not drain on the turn Block is played against that player, nor during that player's Block extra turns. Curse drains 1 life per 3 points spent on that turn and siphons lives the cursed player actually loses, including on that turn after they act.

### Mutual Attacks

When two attacks target each other mutually between two players and are both still pending resolution, the comparison happens on the turn of the player who retaliated. Incoming hits stay separate and are covered largest first. An exact group of answers is spent on a hit when their damage adds up to it: two Strongs cancel one Strong+, even when a normal Strong is also incoming, and that Strong still hits. A Strong played with a Basic spends only the Strong on an equal Strong, and the Basic goes through alone. Answers that cannot make an exact match are one defensive bundle. The bundle cancels a hit while its damage is at least that hit. Damage left over keeps every attack in the bundle pending, so a Strong and a Basic+ cancel one Strong+ and both go through. A bundle that is used up exactly is cancelled. A hit the bundle cannot cover still resolves (an answer of 3 against two attacks of 2 cancels one of them and stays; the other 2 still hits). A Super+ against a Strong+ and a Basic cancels both and stays pending. Hits that are not covered still resolve. Mirror still redirects only one pending attack at a time. Redirecting one hit does not cancel the other hits from that same action that still target the Mirror player.

A living player may attack an eliminated player only while that player still has a pending attack on them, and only to answer it. The answer is compared the same way, then discarded: it does not damage the corpse and does not stay queued. An attack on an eliminated player who has nothing pending against you is illegal.

An attack redirected by Mirror remains a fully pending attack: if the player it is redirected to has their own attack pending against the one who redirected it, both attacks are evaluated as mutual attacks between them, following the same rule. Example: player A attacks player C, and player B also attacks player C with the same card. On C's turn, C uses Mirror to redirect A's attack toward B. B's attack against C and A's attack (redirected by C) toward B face off as mutual attacks between B and C, and cancel out since they deal the same damage.

### Elimination

- An eliminated player loses all their lives. They become a spectator; all their unclaimed cards join the shared pool (section 1).
- Each living player who contributed to the kill on the turn the victim dies chooses two rewards among: 4 lives, 8 points, a card of choice among the eliminated player's remaining cards (including unused special cards), or an upgrade point. That includes every attacker whose pending hit **resolved** on that turn against the victim, even when the shield absorbed all damage or a later hit dealt the finishing blow — delayed resolution must not strip credit from earlier attackers. Non-attack life loss (Poison, Imposition, Tax, and so on) still requires actual lives taken. Both reward choices can be identical. A card already taken is gone before the next picker. Rewards are claimed in order: fewest lives among contributors, then fewest points, then a seeded random draw among ties. Pending attacks that never resolved do not count. When several players die in one resolution, each contributor gets two full reward picks per victim they helped kill, in that order.
- A player eliminated without a third-party contributor — through Tax's life cost, their own Sentence, or their own non-upgraded Suicide — generates no reward for anyone. A Gambler wipe is not an elimination and pays no reward.
- Forfeiting with the Forfeit button, or leaving the table while the game is playing, pays those same two reward picks to each living player who still has an attack queued on the forfeiter, and to each living player who has an active Poison. Poison is not aimed at one seat, so any active Poison counts. One reward per player, not per queued card. Order is fewest lives, then fewest points, then a seeded draw. A card already taken is gone. Those picks happen before the forfeiter's remaining cards join the pool. Pending Thief, Imposition, Sentence, and Curse do not pay. If nobody has a queued attack and nobody has an active Poison, nobody is paid. The turn timer and inactivity elimination do not pay these rewards.

## 7. Game Modes

### Life Limit

Each mode imposes a life cap: a player can never exceed this number, regardless of the source of the gain (any excess gain beyond the cap is lost).
- Classic: 25 lives
- Team: 25 lives
- Quick game: 20 lives
- God mode: no limit

### Classic Mode

Every player for themselves. Last player alive wins.

### Team Mode

- Same rules as Classic mode, in teams.
- Turn order is entirely individual, as in Classic mode: each player takes their turn in a global rotation, without grouping by team. Team membership only determines allowed interactions, not turn order.
- A player cannot attack a teammate.
- A player cannot directly give cards or resources to a teammate. Allowed support actions: buying them lives (Regeneration), creating a shield for them, buying them a card, buying them an upgrade point, redirecting toward them an attack that wasn't originally aimed at them (Mirror and Super Mirror can target an ally instead of the user themselves in this mode), or using Tax at one's own cost to pass the points obtained to them.
- Objective: eliminate every player from other teams, while keeping at least one player alive on your own team.

### God Mode

- One player is randomly designated as the God — a special role distinct from the 15 normal kits.
- All other players are allied against the God, under the same support rules as Team mode.
- No elimination rewards in this mode.
- God's starting lives depending on the number of opponents (mode capped at 6 opposing players):

| Opponents | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|
| God's lives | 10 | 15 | 20 | 25 | 30 |

- The God starts with 2 upgrade points, 9 points, draws 2 points, all existing action cards and all existing attack cards, and 4 random special cards.
- All of their standard attack and action cards are already upgraded from the start. Their 2 upgrade points are only used to upgrade their special cards, if they wish.
- Cloning cannot target the God.
- Objective: the God must eliminate all other players; the other players must eliminate the God.

### Quick Mode

- All attacks (including MEGA ATTACK) deal double their usual damage.
- Compatible with all other game modes.
