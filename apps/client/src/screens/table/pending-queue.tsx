/**
 * Pending effects strip — L12-04 / self-targeted in private zone.
 * Same info as V1 queue: card, source, target, queuedAt.
 */

import type { PendingEffectView, PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { nicknameOf } from './table-helpers';

export interface PendingQueueProps {
  view: PlayingStateView;
  effects: readonly PendingEffectView[];
  /** Section title. */
  title?: string;
  /** Compact chips for private-zone incoming strip. */
  compact?: boolean;
  /** Tone for placement on felt (light on dark) vs private dock. */
  tone?: 'felt' | 'dock';
}

export function PendingQueue({
  view,
  effects,
  title = 'Pending effects',
  compact = false,
  tone = 'felt',
}: PendingQueueProps): ReactElement {
  const titleClass =
    tone === 'felt'
      ? 'text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-soft'
      : 'text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted';
  const emptyClass =
    tone === 'felt' ? 'text-sm text-slate-soft/90' : 'text-xs text-ink-muted';
  const chipClass =
    tone === 'felt'
      ? 'border-slate-soft/50 bg-surface-raised text-ink'
      : 'border-border-soft bg-surface-raised text-ink';

  return (
    <section data-zone="pending-queue" className={compact ? '' : ''}>
      <h2 className={titleClass}>{title}</h2>
      {effects.length === 0 ? (
        <p className={`mt-0.5 ${emptyClass}`}>None</p>
      ) : (
        <ul className={`mt-1 flex flex-wrap gap-1.5 ${compact ? 'justify-end' : ''}`}>
          {effects.map((effect) => (
            <li
              key={effect.id}
              data-pending-id={effect.id}
              className={[
                'flex flex-col rounded-[length:var(--radius-card)] border px-2 py-1 shadow-sm',
                chipClass,
                compact ? 'min-w-0 max-w-[9rem]' : 'min-w-[8rem]',
              ].join(' ')}
            >
              <span className={compact ? 'text-xs font-semibold' : 'text-sm font-semibold'}>
                {effect.cardId}
              </span>
              <span className="text-[10px] leading-tight text-ink-muted">
                {nicknameOf(view, effect.sourcePlayerId)}
                {' → '}
                {nicknameOf(view, effect.targetPlayerId)}
              </span>
              {!compact && (
                <span className="text-[10px] tabular-nums text-ink-muted">
                  queued #{effect.queuedAt}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
