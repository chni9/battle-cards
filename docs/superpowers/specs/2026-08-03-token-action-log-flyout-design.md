# Token ↔ action-log flyout — design

Presentational Table FX polish. No protocol, rules, or intent gating.

## Locked choices

- Exact chip count = `|Δ|` (no cap).
- Anchor = `[data-zone="action-log-panel"]` chrome (open or closed).
- Stagger ≈ 70ms between chips.
- Own resources only (`flyToken`); opponents / kit inspect unchanged.
- Reduced motion: skip chips; keep flash/float.

## Behavior

- **Gain:** N resource icons from action-log panel → resource chip.
- **Loss:** N icons from resource → action-log panel.
- Kinds: `life` | `point` | `shield` | `upgradePoint`.
- Trigger: `ResourceIcon` value Δ (existing). Remove Draw’s duplicate enqueue.

## Approach

Extend `tokenFlyout`: measure log↔resource; enqueue N events with `delayMs` + matching `expiresAt`.
