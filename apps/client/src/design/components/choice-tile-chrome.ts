/**
 * Shared selected/idle classes for shop-style choice tiles (L44-01).
 * Copied from the shop buy cell — do not restyle here.
 */

export interface ChoiceTileChromeOptions {
  selected: boolean;
  /** Not your turn / pool at cap — cursor + fade. */
  disabled?: boolean;
  /** Unaffordable but still selectable (shop). */
  faded?: boolean;
}

export function choiceTileClassName(options: ChoiceTileChromeOptions): string {
  const faded = options.faded === true || options.disabled === true;
  return [
    'flex h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
    options.selected
      ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
      : 'border-border-soft bg-surface hover:border-border',
    faded ? 'opacity-55' : '',
    options.disabled === true ? 'cursor-not-allowed' : '',
  ].join(' ');
}
