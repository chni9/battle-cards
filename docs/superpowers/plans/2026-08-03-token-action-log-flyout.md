# Token ↔ action-log flyout — Implementation Plan

> **For Claude:** execute task-by-task. Presentational only.

**Goal:** N token chips fly between resource and action-log panel on gain/loss.

**Architecture:** extend `tokenFlyout` + `measureTokenFlyout`; `ResourceIcon` enqueues `|Δ|` staggered events.

### Task 1: Measure + types + overlay delay

- `motion-timing.ts`: `TOKEN_STAGGER_MS = 70`
- `table-fx-types.ts`: optional `delayMs` on `tokenFlyout`
- `play-flyout.ts`: anchor action-log; helper `enqueue` loop or export measure + stagger offsets
- `table-fx-overlay.tsx`: honor `delayMs` (initial opacity 0)

### Task 2: ResourceIcon + Draw dedup + docs

- `resource-icon.tsx`: enqueue `|Δ|` chips
- `table.tsx`: Draw → `onDraw` only (ResourceIcon handles points)
- `docs/agent/frontend.md`: one-line Table FX update
