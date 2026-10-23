/**
 * Icon + number cost amount (technical spec v7 §6.6.1, L59-01, L39-04, L72-11).
 * Spoken text is sr-only; `title={null}` drops the tooltip so a parent control
 * can keep its own name.
 */

import type { ReactElement } from 'react';

import { Icon } from '../icons/icon';
import { costSignGlyph, type CostSign } from '../structured-cost';
import { glyphAmountIcon, spokenGlyphAmount, type GlyphAmount } from './glyph-amount';

export interface CostAmountProps {
  amount: GlyphAmount;
  signed?: CostSign;
  multiplier?: number;
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
  const spokenOptions = {
    ...(multiplier !== undefined ? { multiplier } : {}),
    ...(signed !== undefined ? { signed } : {}),
  };
  const spoken = spokenGlyphAmount(amount, spokenOptions);
  const tooltip = title === undefined ? spoken : (title ?? undefined);
  const iconPx = ICON_PX[size];
  return (
    <span
      data-glyph-icon={glyphAmountIcon(amount)}
      className={`inline-flex items-center whitespace-nowrap tabular-nums ${className}`}
      {...(tooltip !== undefined ? { title: tooltip } : {})}
    >
      <span className="sr-only">{spoken}</span>
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {multiplier !== undefined && multiplier !== 1 ? `${multiplier}×` : null}
        {costSignGlyph(signed)}
        {amount.amount}
        <Icon name={glyphAmountIcon(amount)} size={iconPx} />
        {amount.kind === 'pointsPerLife' ? (
          <>
            /
            <Icon name="life" size={iconPx} />
          </>
        ) : null}
      </span>
    </span>
  );
}
