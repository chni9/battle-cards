# docs/agent/frontend.md — Client conventions

> Created during L1-12 from the real client code. Transverse rules → `/AGENTS.md`.
> Protocol → `protocol.md`.
>
> Sources: technical spec §7 · `apps/client/src/`.

## Status

Functional UI only for V1 — no art direction (technical spec §9). Screens live in
`apps/client/src/App.tsx` for now; split further when the surface grows past one file.

## Screens

| Screen | When |
|---|---|
| Home | No room — create / join + nickname |
| Lobby | `phase: 'lobby'` — seats, code, host Start |
| Table | `phase: 'playing'` — opponents, log, queue, timer, play any hand card, Assassin multi-attack, economy; specials listed but not playable until Lot 5 |
| End | `phase: 'finished'` — winner, return home |

## Conventions

- **Zero rule logic** on the client. Buttons send intents; the server revalidates.
- Connection hook: `apps/client/src/net/use-room-connection.ts` — create / joinById /
  messages / leave.
- Every `stateUpdate` replaces the previous view. Validate shape before use.
- Timer display is cosmetic: trust `turnDeadlineMs` / `turnStarted.deadlineMs` from the
  server, never a client-only countdown as authority.
- Action log is the table's main organ (technical spec §7).
- **`playCard`** may omit `targetPlayerId` (Tax, Regen, Shield, Mirror) and may include
  `quantity` (Regen 1–4). Table: hand select + “Include target” checkbox + quantity field.
- **Assassin** (`allowsMultipleAttacksPerTurn`): `playMultipleAttacks` with ≥2
  `{ instanceId, targetPlayerId }`. Single attack still uses `playCard`. Draw label uses
  `getKit(self.kitId).startingResources.draw`.
- **Spy display:** list each spied hand/special card. Base: show points snapshot labeled by
  turn sequence. Upgraded: show live points (tokens = points only).
- **`actionResolved.outcome === 'immune'`**: show public failure (Untouchable vs Thief/Spy).
- **Mirror**: listen for `mirrorChoiceRequired`, send `chooseMirrorTarget`. Clear the
  prompt on confirm or the next `turnStarted`.
- Dev override: server `TURN_DURATION_MS` env (ms, min 5000) — default still 30s.
- Finish client tasks with a Conventional Commit (AGENTS.md §10) — same rule as server work.
