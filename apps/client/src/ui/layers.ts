/**
 * The global z-index layers of V7 overlays (technical spec v7 §6.7, §6.12). Sheets and their
 * Minimize bars portal to `document.body`, so these values compare against each other and
 * against the table, never against a local stacking context. Inside a layer, the sheet stack
 * (`ui/primitives/sheet-stack.ts`) assigns `sheet + n` and `sheetBar + n`, clamped below the
 * next layer: read-only < expanded blocking < Minimize bars < banner < toast.
 */
export const Z_INDEX = { sheet: 50, sheetBar: 80, banner: 90, toast: 95 } as const;
