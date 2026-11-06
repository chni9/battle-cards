/**
 * The global z-index layers of V7 overlays (technical spec v7 §6.7, §6.12). Sheets and their
 * Minimize bars portal to `document.body`, so these values compare against each other and
 * against the table, never against a local stacking context. Inside a layer, the sheet stack
 * (`ui/primitives/sheet-stack.ts`) assigns `sheet + n` and `sheetBar + n`, clamped below the
 * next layer: read-only < expanded blocking < Minimize bars < hint < coach < banner < toast. The
 * `fx/` overlay (`z-[110]`) paints above all of them.
 *
 * `dragGhost` is the arena's hand-drag ghost and Sell zone (L74-12, spec v7 §6.6.5; Lot 74 plan
 * Appendix A.8 ruling 10): a `pointer-events: none` portal mounted only during a drag, below every
 * sheet, so a sheet opened by a drop always covers it.
 *
 * `hint` and `coach` (L75-04; Lot 75 plan Appendix A.8.1, open-question ruling 1): the first-game
 * hints and the tutorial callouts, then the tutorial coach, paint above every sheet and Minimize
 * bar, so a sheet never hides them, and under banners and toasts, which keep painting above the
 * coach. A tutorial room never shows a first-game hint, so the callouts share `hint` (K6).
 */
export const Z_INDEX = { dragGhost: 40, sheet: 50, sheetBar: 80, hint: 84, coach: 86, banner: 90, toast: 95 } as const;
