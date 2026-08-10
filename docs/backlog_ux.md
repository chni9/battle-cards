# Backlog — Table UX polish

> **Dedicated tracker** for client table readability work (illegal-action codes/modal, seat
> colors, icon costs, threat FX). **Not** part of V5 search-bot sequencing —
> `docs/backlog_v5.md` Lots 32–38 stay reserved for search / belief / arena.
> Task IDs use **Lot 39** (`L39-01` … `L39-06`) so they never collide with V5 Lot 32.
>
> Plan: `~/.cursor/plans/table_ux_polish_497ccc89.plan.md` (Approach 1).
> V4 content is closed (`docs/backlog_v4.md`). Keep status current — `/AGENTS.md` §9.

Status values: `To do` · `In progress` · `Done` · `Blocked`

## How to read this

- Follow ID order when tasks share protocol or UI surfaces; L39-03 / L39-04 / L39-05 are
  mostly independent once L39-01 lands.
- Complexity / risk columns match other backlogs (S/M/L · Low/Medium/High).
- **Do not** bump `PROTOCOL_VERSION` again in this lot after L39-01 (27). Later tasks are
  client-only unless a new wire field is explicitly approved.

## Progress

| Lot | Tasks | Done |
|---|---|---|
| 39 · Table UX polish | 6 | 6 |

---

## Lot 39 — Table UX polish

| ID | Task | Cx | Risk | Depends on | Status |
|---|---|---|---|---|---|
| L39-01 | Shared `ActionRejectCode` + `ACTION_REJECT_MESSAGE` + `actionReject()`; `ERROR_MESSAGE` payload `{ code, message }`; `PROTOCOL_VERSION` **26 → 27**; engine/room emit codes (every prior reject string mapped); exhaustiveness + server smoke tests. **Acceptance:** `pnpm verify` green; every code has a message; a known reject returns `code`. | M | Medium | — | Done |
| L39-02 | Client: parse `{ code, message }`, `IllegalActionDialog`, remove timers header error line for action rejects; client copy map keyed by code. **Acceptance:** illegal move shows a modal; timers strip no longer shows the red reject line. | M | Low | L39-01 | Done |
| L39-03 | Seat palette tokens + `PlayerName` + zone tints + colored names in pending queue and action log (structured segments). **Acceptance:** four seats read as distinct colors on the felt; log/pending names use seat color. | M | Low | — | Done |
| L39-04 | `CostDisplay` on interactive cost surfaces (shop / Use / special buy / rewards / Sentence expiry). **Acceptance:** interactive costs show icon+number; prose costs elsewhere stay text. | S | Low | — | Done |
| L39-05 | Threat outline + Incoming entrance + targeting cue + tone classification; active-seat glow + stronger turn banner. **Acceptance:** new Incoming targeting POV flashes outline (red attack / orange other); active seat has seat-colored glow. | M | Medium | L39-03 | Done |
| L39-06 | Agent docs (`protocol.md` / `frontend.md` / `decisions.md` as needed) + browser playtest gate for the lot surface. **Acceptance:** docs match shipped behaviour; post-lot playtest issues fixed and verified. | S | Low | L39-02, L39-03, L39-04, L39-05 | Done |
