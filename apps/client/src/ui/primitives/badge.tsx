/**
 * Status badges (technical spec v7 §6.2): a decorative icon, a label (visible, or screen-reader
 * only with `labelHidden`) and an optional value such as Invisibility turns or card lives.
 * The tone is an inset ring, never the text color (resource and threat colors are text only
 * at large size, §5.1), so the words stay `--text` on `--panel-2`.
 *
 * `BadgeGroup` shows `max` badges (2 by default, the seat budget of §6.2) and then "+n"; the
 * marker is a 44 px button only when the caller handles `onOverflowClick` (it opens the seat
 * sheet, which lists them all). `overflowLabel` adds screen-reader words after "+n" ("+2 more
 * statuses"), so the accessible name still starts with the visible text (WCAG 2.5.3).
 */

import type { ReactElement } from 'react';
import { Icon } from '../icons/icon';
import type { IconName } from '../icons/icon-names';
import { CHROME_FLAT_SM_CLASS, CHROME_FOCUS_CLASS } from './chrome-classes';

export type BadgeTone =
  | 'neutral'
  | 'threat-attack'
  | 'threat-other'
  | 'mine'
  | 'life'
  | 'point'
  | 'upgrade'
  | 'shield';

export interface BadgeProps {
  icon?: IconName;
  label: string;
  value?: string | number;
  tone?: BadgeTone;
  labelHidden?: boolean;
}

const TONE_CLASS: Readonly<Record<BadgeTone, string>> = {
  neutral: '',
  'threat-attack': 'ring-2 ring-inset ring-v7-threat-attack',
  'threat-other': 'ring-2 ring-inset ring-v7-threat-other',
  mine: 'ring-2 ring-inset ring-v7-mine',
  life: 'ring-2 ring-inset ring-v7-life',
  point: 'ring-2 ring-inset ring-v7-point',
  upgrade: 'ring-2 ring-inset ring-v7-upgrade',
  shield: 'ring-2 ring-inset ring-v7-shield',
};

const CHIP_CLASS = `${CHROME_FLAT_SM_CLASS} inline-flex min-h-7 items-center gap-1 whitespace-nowrap bg-v7-panel-2 px-1.5 font-v7-body text-v7-caption font-extrabold leading-none text-v7-text`;

export function Badge({ icon, label, value, tone = 'neutral', labelHidden = false }: BadgeProps): ReactElement {
  return (
    <span data-tone={tone} className={`${CHIP_CLASS} ${TONE_CLASS[tone]}`}>
      {icon !== undefined ? <Icon name={icon} size={16} /> : null}
      <span className={labelHidden ? 'sr-only' : ''}>{label}</span>
      {value !== undefined ? <span className="font-v7-display text-v7-body">{value}</span> : null}
    </span>
  );
}

export interface BadgeGroupItem extends BadgeProps {
  id: string;
}

export interface BadgeGroupProps {
  items: readonly BadgeGroupItem[];
  max?: number;
  onOverflowClick?: () => void;
  /** Screen-reader words read after "+n", such as "more statuses". */
  overflowLabel?: string;
}

export function BadgeGroup({ items, max = 2, onOverflowClick, overflowLabel }: BadgeGroupProps): ReactElement {
  const visible = items.slice(0, max);
  const hidden = items.length - visible.length;
  const marker = `+${hidden}`;
  const spoken =
    overflowLabel !== undefined && overflowLabel !== '' ? <span className="sr-only">{` ${overflowLabel}`}</span> : null;
  return (
    <ul className="flex flex-wrap items-center gap-1">
      {visible.map(({ id, ...badge }) => (
        <li key={id} className="inline-flex">
          <Badge {...badge} />
        </li>
      ))}
      {hidden > 0 ? (
        <li className="inline-flex">
          {onOverflowClick !== undefined ? (
            <button
              type="button"
              onClick={onOverflowClick}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-v7-chrome-sm active:brightness-90 ${CHROME_FOCUS_CLASS}`}
            >
              <span className={`${CHIP_CLASS} font-v7-display shadow-v7-chrome`}>{marker}</span>
              {spoken}
            </button>
          ) : (
            <span className="inline-flex">
              <span className={`${CHIP_CLASS} font-v7-display`}>{marker}</span>
              {spoken}
            </span>
          )}
        </li>
      ) : null}
    </ul>
  );
}
