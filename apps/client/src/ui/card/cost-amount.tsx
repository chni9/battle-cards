/**
 * A cost or gain drawn as number plus resource icon, with a spoken text — technical spec v7
 * §6.6.1. It replaces the V2 `CostDisplay` (L39-04) for V7 surfaces.
 *
 * The root is one `inline-flex` span: a screen-reader-only spoken amount ("3 pts", "minus 1
 * life"), and one `aria-hidden` span holding the visible `{m}×`, sign, number and icon. A
 * `pointsPerLife` rate reads `N [point]/[life]`. `data-glyph-icon` names the primary icon for
 * tests and later components.
 *
 * `title` defaults to the spoken amount. Pass `title={null}` inside a control that names itself:
 * an inner `title` would replace its tooltip (L59-01), and the spoken text still names an
 * unlabeled button. `size` sets only the icon (px); the number takes its font and color from the
 * parent, so it never paints a resource color as small text (§5.1). Icon paints are fixed, so a
 * caller puts the amount in a well on a fill close to its icon's color (DESIGN.md › Icons).
 */

import type { ReactElement } from 'react';
import { Icon } from '../icons/icon';
import { costSignGlyph, type CostSign } from '../structured-cost';
import { glyphAmountIcon, spokenGlyphAmount, type GlyphAmount } from './glyph-amount';

export interface CostAmountProps {
  amount: GlyphAmount;
  /** Prefix the number with − (pay) or + (receive). */
  signed?: CostSign;
  /** Prefix such as the `2×` of an elimination expiry. */
  multiplier?: number;
  /** Native tooltip. Defaults to the spoken amount; `null` renders none (L59-01). */
  title?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ICON_PX = { sm: 14, md: 16, lg: 20 } as const;

export function CostAmount({
  amount,
  signed,
  multiplier,
  title,
  size = 'sm',
  className = '',
}: CostAmountProps): ReactElement {
  const spoken = spokenGlyphAmount(amount, {
    ...(multiplier !== undefined ? { multiplier } : {}),
    ...(signed !== undefined ? { signed } : {}),
  });
  const tooltip = title === undefined ? spoken : (title ?? undefined);
  const iconPx = ICON_PX[size];

  return (
    <span
      data-glyph-icon={glyphAmountIcon(amount)}
      title={tooltip}
      className={`inline-flex items-center whitespace-nowrap tabular-nums ${className}`}
    >
      <span className="sr-only">{spoken}</span>
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {multiplier !== undefined && multiplier !== 1 ? <span>{`${String(multiplier)}×`}</span> : null}
        <span>{`${costSignGlyph(signed)}${String(amount.amount)}`}</span>
        <Icon name={glyphAmountIcon(amount)} size={iconPx} />
        {amount.kind === 'pointsPerLife' ? (
          <>
            <span>/</span>
            <Icon name="life" size={iconPx} />
          </>
        ) : null}
      </span>
    </span>
  );
}
