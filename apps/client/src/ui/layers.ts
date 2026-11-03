/**
 * The global z-index layers of V7 overlays (technical spec v7 §6.7, §6.12). Sheets and their
 * Minimize bars portal to `document.body`, so these values compare against each other and
 * against the table, never against a local stacking context. Inside a layer, the sheet stack
 * (`ui/primitives/sheet-stack.ts`) assigns `sheet + n` and `sheetBar + n`, clamped below the
 * next layer: read-only < expanded blocking < Minimize bars < banner < toast.
 *
 * `dragGhost` is the arena's hand-drag ghost and Sell zone (L74-12, spec v7 §6.6.5; Lot 74 plan
 * Appendix A.8 ruling 10): a `pointer-events: none` portal mounted only during a drag, below every
 * sheet, so a sheet opened by a drop always covers it.
 */
export const Z_INDEX = { dragGhost: 40, sheet: 50, sheetBar: 80, banner: 90, toast: 95 } as const;
