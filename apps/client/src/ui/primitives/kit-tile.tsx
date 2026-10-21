/**
 * Kit tile for the kit picker and the house-rules strip (technical spec v7 §7.3, §7.4): a code
 * rendered card with the portrait, the kit name and readable stats. The caller supplies the
 * values (from `KIT_CATALOG`, never from PNGs) and the portrait node, which is decorative here
 * because the visible name labels the tile.
 *
 * With `onSelect`, the head is an `aria-pressed` button named by the kit (§11); the stats sit
 * outside it so they do not join that name. An excluded kit is greyed, says `EXCLUDED_LABEL`
 * in words (Q15, Q23: never color alone) and cannot be selected. The `help` info control
 * renders only when both `onInfo` and `infoLabel` are given.
 */

import type { ReactElement, ReactNode } from 'react';
import { Icon } from '../icons/icon';
import type { IconName } from '../icons/icon-names';
import { EXCLUDED_LABEL } from '../ui-copy';
import { CHROME_FOCUS_CLASS } from './chrome-classes';
import { IconButton } from './icon-button';

export interface KitTileStat {
  readonly icon: IconName;
  readonly label: string;
  readonly value: string;
}

export interface KitTileProps {
  name: string;
  portrait: ReactNode;
  stats: readonly KitTileStat[];
  selected?: boolean;
  excluded?: boolean;
  onSelect?: () => void;
  onInfo?: () => void;
  infoLabel?: string;
}

export function KitTile({
  name,
  portrait,
  stats,
  selected = false,
  excluded = false,
  onSelect,
  onInfo,
  infoLabel,
}: KitTileProps): ReactElement {
  const showSelected = selected && !excluded;
  const head = (
    <>
      <span
        aria-hidden="true"
        className={`flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-v7-chrome-sm bg-v7-bg-0 ${
          excluded ? 'opacity-60 grayscale' : ''
        }`}
      >
        {portrait}
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 break-words font-v7-display text-v7-title leading-none text-v7-text">{name}</span>
        {excluded ? (
          <span className="rounded-v7-chrome-sm border-2 border-v7-text-2 px-1.5 py-0.5 font-v7-body text-v7-caption font-extrabold leading-none text-v7-text">
            {EXCLUDED_LABEL}
          </span>
        ) : null}
      </span>
    </>
  );

  return (
    <div
      data-excluded={excluded ? 'true' : 'false'}
      data-selected={showSelected ? 'true' : 'false'}
      className={[
        'relative flex min-w-0 flex-col gap-2 p-2',
        'rounded-v7-chrome border-(length:--chrome-outline-width) border-v7-ink bg-v7-panel shadow-v7-chrome',
        showSelected ? 'ring-(length:--chrome-outline-width) ring-v7-cta' : '',
      ].join(' ')}
    >
      {onSelect !== undefined ? (
        <button
          type="button"
          aria-pressed={showSelected}
          disabled={excluded}
          onClick={onSelect}
          className={`flex min-h-11 flex-col gap-2 rounded-v7-chrome-sm text-left enabled:active:brightness-90 disabled:cursor-not-allowed ${CHROME_FOCUS_CLASS}`}
        >
          {head}
        </button>
      ) : (
        <div className="flex flex-col gap-2">{head}</div>
      )}
      <dl className="flex flex-wrap gap-x-3 gap-y-1">
        {stats.map((stat) => (
          <div key={stat.label} className="inline-flex items-center gap-1">
            <dt className="inline-flex">
              <Icon name={stat.icon} size={18} />
              <span className="sr-only">{stat.label}</span>
            </dt>
            <dd className="font-v7-display text-v7-body leading-none text-v7-text">{stat.value}</dd>
          </div>
        ))}
      </dl>
      {onInfo !== undefined && infoLabel !== undefined ? (
        // IconButton is `relative` for its count badge, so the corner placement lives on a wrapper.
        <span className="absolute top-3 right-3">
          <IconButton aria-label={infoLabel} icon="help" onClick={onInfo} />
        </span>
      ) : null}
    </div>
  );
}
