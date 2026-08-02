/**
 * Pending effects strip — L12-04 / self-targeted in private zone.
 * Chips stay fully visible; strip scrolls when many effects queue.
 */

import { formatCardLabel, type PendingEffectView, type PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { nicknameOf } from './table-helpers';

export interface PendingQueueProps {
  view: PlayingStateView;
  effects: readonly PendingEffectView[];
  /** Section title. */
  title?: string;
  /** Compact single-line chips (Incoming / felt strip). */
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
    tone === 'felt' ? 'text-xs text-slate-soft/90' : 'text-xs text-ink-muted';
  const chipClass =
    tone === 'felt'
      ? 'border-slate-soft/50 bg-surface-raised text-ink'
      : 'border-border-soft bg-surface-raised text-ink';

  return (
    <section data-zone="pending-queue" className="flex min-h-0 flex-col">
      <h2 className={`shrink-0 ${titleClass}`}>{title}</h2>
      {effects.length === 0 ? (
        <p className={`mt-0.5 shrink-0 ${emptyClass}`}>None</p>
      ) : (
        <ul
          className={[
            'mt-1 flex min-h-0 gap-1.5',
            compact ? 'flex-wrap justify-end overflow-y-auto' : 'flex-wrap overflow-y-auto',
          ].join(' ')}
        >
          {effects.map((effect) => {
            const label = formatCardLabel(effect.cardId, effect.isUpgraded);
            const route = `${nicknameOf(view, effect.sourcePlayerId)} → ${nicknameOf(view, effect.targetPlayerId)}`;
            if (compact) {
              return (
                <li
                  key={effect.id}
                  data-pending-id={effect.id}
                  title={`${label} · ${route} · queued #${String(effect.queuedAt)}`}
                  className={[
                    'inline-flex max-w-full items-center gap-1 rounded-[length:var(--radius-badge)] border px-2 py-1 shadow-sm',
                    chipClass,
                  ].join(' ')}
                >
                  <span className="truncate text-xs font-semibold">{label}</span>
                  <span className="truncate text-[10px] text-ink-muted">{route}</span>
                </li>
              );
            }
            return (
              <li
                key={effect.id}
                data-pending-id={effect.id}
                className={[
                  'flex min-w-[8rem] flex-col rounded-[length:var(--radius-card)] border px-2 py-1 shadow-sm',
                  chipClass,
                ].join(' ')}
              >
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-[10px] leading-tight text-ink-muted">{route}</span>
                <span className="text-[10px] tabular-nums text-ink-muted">
                  queued #{effect.queuedAt}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
