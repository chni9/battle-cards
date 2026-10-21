/**
 * Resource or stat pill (L43-01, L51-08, parity `global-resource-captions`): icon plus number,
 * spoken as "{label} {value}". A hidden value renders "?" and reads "{label} unknown" (§6.3).
 *
 * The tone is a 2 px inset ring, never the number's color: resource colors are text only at
 * large size (spec v7 §5.1; `--life` on `--panel-2` is 4.25:1), so the value stays `--text`.
 * The caption word shows on the dock (`captionVisible`) and is screen-reader only elsewhere
 * (`resourceCaptionMode`). The root keeps a native `title` ("{label}" or "{label} unknown").
 */

import type { ReactElement } from 'react';
import type { ResourceKind } from '../asset-lookup';
import { Icon } from '../icons/icon';
import type { IconName } from '../icons/icon-names';
import { resourceCaptionMode } from '../resource-captions';

export type PillTone = 'life' | 'point' | 'upgrade' | 'shield' | 'neutral';

export interface PillProps {
  icon: IconName;
  label: string;
  value: number | 'unknown';
  resourceKind?: ResourceKind;
  size?: 'sm' | 'md' | 'lg';
  captionVisible?: boolean;
  tone?: PillTone;
  className?: string;
}

const KIND_TONE: Readonly<Record<ResourceKind, PillTone>> = {
  life: 'life',
  point: 'point',
  upgradePoint: 'upgrade',
  shield: 'shield',
};

const TONE_CLASS: Readonly<Record<PillTone, string>> = {
  life: 'ring-2 ring-inset ring-v7-life',
  point: 'ring-2 ring-inset ring-v7-point',
  upgrade: 'ring-2 ring-inset ring-v7-upgrade',
  shield: 'ring-2 ring-inset ring-v7-shield',
  neutral: '',
};

const SIZE_CLASS = { sm: 'min-h-7 gap-1 px-1.5', md: 'min-h-9 gap-1.5 px-2', lg: 'min-h-12 gap-2 px-3' } as const;
const VALUE_CLASS = { sm: 'text-v7-caption', md: 'text-v7-body', lg: 'text-v7-vital' } as const;
const ICON_SIZE = { sm: 14, md: 18, lg: 26 } as const;

export function Pill({
  icon,
  label,
  value,
  resourceKind,
  size = 'md',
  captionVisible,
  tone,
  className,
}: PillProps): ReactElement {
  const resolvedTone = tone ?? (resourceKind !== undefined ? KIND_TONE[resourceKind] : 'neutral');
  const unknown = value === 'unknown';
  return (
    <span
      data-tone={resolvedTone}
      data-size={size}
      {...(resourceKind !== undefined ? { 'data-resource-kind': resourceKind } : {})}
      title={unknown ? `${label} unknown` : label}
      className={[
        'inline-flex items-center whitespace-nowrap rounded-v7-chrome-sm border-(length:--chrome-outline-width) border-v7-ink bg-v7-panel-2 text-v7-text shadow-v7-chrome',
        SIZE_CLASS[size],
        TONE_CLASS[resolvedTone],
        className ?? '',
      ].join(' ')}
    >
      <Icon name={icon} size={ICON_SIZE[size]} />
      <span aria-hidden="true" className={`font-v7-display leading-none ${VALUE_CLASS[size]}`}>
        {unknown ? '?' : value}
      </span>
      {resourceCaptionMode(captionVisible) === 'visible' ? (
        <span aria-hidden="true" className="font-v7-body text-v7-caption font-bold text-v7-text-2">
          {label}
        </span>
      ) : null}
      <span className="sr-only">{`${label} ${unknown ? 'unknown' : String(value)}`}</span>
    </span>
  );
}
