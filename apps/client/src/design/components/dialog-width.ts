/**
 * Dialog panel width — Lot 53.
 * Tailwind v4 cannot let a later `max-w-3xl` override `max-w-md` in the same
 * class string; both utilities exist and source order wins, so Shop stayed 448px.
 */

const HAS_MAX_W = /(?:^|\s)max-w-/;

export const DIALOG_PANEL_BASE_CLASS =
  'flex max-h-[calc(100dvh-1rem)] min-h-0 w-full flex-col overflow-hidden rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-3 font-sans text-ink shadow-[0_12px_40px_rgba(28,26,31,0.28)] outline-none sm:p-5';

/** Default `max-w-md` only when the caller did not pass a `max-w-*` override. */
export function dialogPanelClassName(panelClassName: string): string {
  const width = HAS_MAX_W.test(` ${panelClassName}`) ? '' : 'max-w-md';
  return [DIALOG_PANEL_BASE_CLASS, width, panelClassName]
    .filter((part) => part !== '')
    .join(' ');
}
