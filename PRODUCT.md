# Product

<!-- impeccable:product-schema 1 -->

> Written by Impeccable `init` without a designer interview (L72-01 ran as a delegated
> task with no question tool). Every fact below is quoted or paraphrased from `AGENTS.md`
> and `docs/technical_spec_v7.md` (designer decisions of 2026-10-20), and any item that is
> inferred rather than stated carries the tag *(inferred)*. Nothing here is a new product
> decision. Where this file and the code or the specs disagree, the code and the specs win.

## Platform

web

## Users

- **Primary:** the designer and his friends, who play *Card Battle* together on their
  phones (spec v7 §2 Q2: phone portrait first, desktop derived) (AGENTS.md §1).
- **Next audience:** first-time beta testers who have never seen the game and arrive by a
  room code or a shared link, plus spectators and walk-ins who watch a lobby or a running
  table and may claim a seat (spec v7 §7.2).
- **In a game:** 2 to 8 seats. Bots fill seats in solo play.
- **Staff:** the designer alone, behind a password, on `/admin` (spec v7 §7.8).
- The job: play a full elimination match, read the table, and understand what is
  threatening whom without help from the other players.

## Product Purpose

*Card Battle* is a turn-based elimination card game for 2 to 8 players, built on hidden
information and **delayed resolution**. V7 replaces the prototype look of the whole client
with a real art direction and an interaction model built for the table, without changing a
rule, a value or a wire message (spec v7 §1).

Success on a 375 px wide phone, with up to 8 seats on screen and no horizontal page
scroll (spec v7 §1):

- a player reads who threatens whom, for how much, and when it lands, at a glance;
- playing a targeted card takes three taps or one drag, and an accidental tap never spends
  the turn;
- every function that exists on `origin/dev` at `1de498d` still exists (spec v7 Appendix
  A, `docs/technical_spec_v7_parity.md`);
- the game feels like a game, and all of it degrades cleanly under reduced motion.

## Positioning

Two mechanisms a neighboring card game could not copy without changing its rules:

- **Delayed resolution.** An action aimed at an opponent takes effect on that opponent's
  next turn, after they have played their own action, which gives them a chance to react
  and makes bluffing worth something (rules spec §6, Game Turn).
- **Hidden information with a price to lift it.** Each player's kit, hand and exact
  resources stay private except through Spy and its equivalents. Every action played is
  public (rules spec §6, Visibility).

## Operating Context

- Rooms by code or shared link (`?code=XXXXXX`), plus solo against bots and a tutorial.
- Pull-request previews and a staging host for testers before a release
  (`docs/agent/deploy.md`).
- A password-gated `/admin` for the designer: analytics, matches, kits, feedback triage.
- Phone portrait first; desktop is derived from it; a landscape phone is a compact mode
  (spec v7 §2 Q2, §6.4).
- In-game feedback from beta testers reaches the designer through a ticket flow that
  already exists and is kept (spec v7 §7.7).

## Capabilities and Constraints

Mode per surface (designer 2026-10-20, spec v7 §5.8): table = Experience/Operate, admin = Operate, home = light Persuade.

- **English only**, with existing labels keeping their wording; copy changes are only those
  listed in spec v7 §10 (Q9 = A, Q11 = B).
- **One dark theme.** No light theme (spec v7 §1).
- **Sound effects only, no music** (Q7 = A).
- **No Classic rule, value or protocol change.** `PROTOCOL_VERSION` stays 45. A real need
  for a new field stops the work and asks (spec v7 §1).
- **Existing drawings are reused** for cards and kits; new illustrations are a later
  chantier (Q1 = C).
- **The server is authoritative.** The client renders state and sends intents and holds no
  rule logic. Private information is built per recipient and never filtered after the
  fact (AGENTS.md golden rules 4 and 8).
- Out of scope for now (technical spec v1 §9): Team, God and Quick modes, accounts,
  in-progress persistence, monetization.
- Terminology to preserve: lives, points, upgrade points, shield, kit, Spy, Unspy,
  Mirror, special cards, shared pool, pending effects (rules spec §1).
- Undecided and not recorded here: any new surface concept beyond spec v7, and the
  `buildPath` workflow default for Impeccable (no one answered it, so none is stored).

## Brand Commitments

- Name: **Card Battle**; the wordmark is written "CARD BATTLE" on the home screen
  (spec v7 §7.1).
- Voice: plain English game copy, as it exists today and as spec v7 §10 amends it.
- The current card and kit drawings in `images/` stay, framed in code (Q1 = C).

## Evidence on Hand

- `images/` holds the existing card and kit drawings.
- `docs/spec_bataille_des_cartes_en.md` is the rules truth.
- `docs/technical_spec_v7.md` and `docs/technical_spec_v7_parity.md`: the V7 decisions and
  the audit of 198 client surfaces taken on `origin/dev` at `1de498d` (spec v7 §3).
- Playtests of the current client at solo 4 and 8 seats, on 375×812 and 1440×900
  (spec v7 §3).
- Absent, and not to be fabricated: customer quotes, usage numbers, benchmarks, marketing
  copy, press, pricing, and any sound or music asset (sound clips arrive in a late lot).

## Product Principles

*(inferred)* Derived from spec v7 §1 and the golden rules in `AGENTS.md`, not confirmed in
an interview.

1. **The threat reads at a glance.** Who attacks whom, for how much and when it lands
   matters more than decoration.
2. **A function never disappears.** Every function in Appendix A survives a redesign
   unless the spec retires it.
3. **The rules are untouchable from the client.** A confusing screen is never grounds for
   changing a rule, a value or a message.
4. **No information rides on color or motion alone.**
5. **Hidden stays hidden.** The interface shows only what the acting seat is allowed to
   see.

## Accessibility & Inclusion

- WCAG AA contrast: 4.5:1 for body text and 3:1 for large text.
- Touch targets of at least 44 px; at least 11 px for any functional text; 16 px for text
  inputs so iOS does not zoom on focus.
- `prefers-reduced-motion: reduce` gives fades and color flashes only, with the same
  numbers and labels; no shake, particles, flying cards or slam (spec v7 §8.3).
- State is never conveyed by color alone, for example the excluded-kit mark (Q15).
- Icon-only controls carry an accessible name (`aria-label`); real radio and
  `aria-pressed` semantics for selectors (spec v7 §11).
