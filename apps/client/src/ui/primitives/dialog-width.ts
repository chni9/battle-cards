/**
 * Dialog panel width — Lot 53.
 * Tailwind v4 cannot let a later `max-w-3xl` override `max-w-md` in the same
 * class string; both utilities exist and source order wins, so Shop stayed 448px.
 * Preferred widths are capped with `min(..., 100%)` of the overlay so a 390px
 * phone never clips Cancel / Close off the right edge (L53-07).
 */

const DIALOG_MAX_W = {
  'max-w-sm': '24rem',
  'max-w-md': '28rem',
  'max-w-lg': '32rem',
  'max-w-xl': '36rem',
  'max-w-2xl': '42rem',
  'max-w-3xl': '48rem',
  'max-w-4xl': '56rem',
} as const;

type DialogMaxWToken = keyof typeof DIALOG_MAX_W;

function isDialogMaxWToken(token: string): token is DialogMaxWToken {
  return Object.hasOwn(DIALOG_MAX_W, token);
}

function findMaxWToken(panelClassName: string): string | undefined {
  const match = /\s(max-w-\S+)/.exec(` ${panelClassName}`);
  return match?.[1];
}

/** Height is 100% of the `fixed inset-0` overlay — not 100dvh, which can be the
 *  desktop window in DevTools device mode while the game frame is 390px tall.
 *  `my-auto` centers a short panel; with `items-start` on the overlay a tall
 *  panel stays pinned to the top instead of clipping the title. */
export const DIALOG_PANEL_BASE_CLASS =
  'my-auto flex max-h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-2 font-sans text-ink shadow-[0_12px_40px_rgba(28,26,31,0.28)] outline-none sm:p-3';

export function dialogPreferredMaxWidth(panelClassName: string): string {
  const token = findMaxWToken(panelClassName);
  if (token !== undefined && isDialogMaxWToken(token)) {
    return DIALOG_MAX_W[token];
  }
  return '28rem';
}

/** Default 28rem, or the caller's `max-w-*`, always capped to the overlay. */
export function dialogPanelClassName(panelClassName: string): string {
  const token = findMaxWToken(panelClassName);
  const abs = dialogPreferredMaxWidth(panelClassName);
  const rest =
    token !== undefined
      ? panelClassName
          .replace(
            new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
            ' ',
          )
          .trim()
      : panelClassName;
  return [DIALOG_PANEL_BASE_CLASS, `max-w-[min(${abs},100%)]`, rest]
    .filter((part) => part !== '')
    .join(' ');
}
