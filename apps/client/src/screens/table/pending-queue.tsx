/**
 * Pending effects strip — L12-04 / self-targeted in private zone.
 * Chips stay fully visible; strip scrolls when many effects queue.
 * L14-04: optional Mirror highlight via highlightedIds.
 * L39-03: source/target nicknames in seat color.
 * L39-05: CSS entrance on chip mount when `animateEntrance` (Incoming).
 * L51-07: real pending chips use tutorial callout chrome, no arrow.
 */

import { formatCardLabel, type PendingEffectView, type PlayingStateView } from '@card-battle/shared';
import { useReducedMotion } from 'motion/react';
import type { ReactElement } from 'react';

import { PlayerName } from '../../design/components/player-name';
import { isPersistentPresentationId } from '../../fx/incoming-threat-diff';
import { threatToneFor } from '../../fx/threat-tone';
import { nicknameOf } from './table-helpers';
import { TutorialCallout } from './tutorial-callout';

export interface PendingQueueProps {
  view: PlayingStateView;
  effects: readonly PendingEffectView[];
  /** Section title. */
  title?: string;
  /** Compact single-line chips (Incoming / felt strip). */
  compact?: boolean;
  /** Tone for placement on felt (light on dark) vs private dock. */
  tone?: 'felt' | 'dock';
  /** Pending effect ids to emphasize (Mirror eligible). */
  highlightedIds?: readonly string[];
  /** Animate chips on mount (Incoming). Stable keys keep the animation one-shot. */
  animateEntrance?: boolean;
}

export function pendingChipCalloutTone(
  cardId: string,
): 'threat' | 'guide' {
  return threatToneFor(cardId) === 'attack' ? 'threat' : 'guide';
}

export function PendingQueue({
  view,
  effects,
  title = 'Pending effects',
  compact = false,
  tone = 'felt',
  highlightedIds = [],
  animateEntrance = false,
}: PendingQueueProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const entranceClass =
    animateEntrance && reduceMotion !== true ? 'pending-chip-enter' : '';

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
  const highlightClass = 'ring-2 ring-cta-purple border-cta-purple shadow-md';
  const hasRealPending = effects.some(
    (effect) => !isPersistentPresentationId(effect.id),
  );

  return (
    <section data-zone="pending-queue" className="flex min-h-0 flex-col">
      <h2 className={`shrink-0 ${titleClass}`}>{title}</h2>
      {effects.length === 0 ? (
        <p className={`mt-0.5 shrink-0 ${emptyClass}`}>None</p>
      ) : (
        <ul
          className={[
            'mt-1 flex min-h-0 gap-1.5',
            compact ? 'flex-wrap justify-end' : 'flex-wrap',
            hasRealPending ? 'overflow-visible' : 'overflow-y-auto',
          ].join(' ')}
        >
          {effects.map((effect) => {
            const label = formatCardLabel(effect.cardId, effect.isUpgraded);
            const sourceNick = nicknameOf(view, effect.sourcePlayerId);
            const targetNick = nicknameOf(view, effect.targetPlayerId);
            const routePlain = `${sourceNick} → ${targetNick}`;
            const highlighted = highlightedIds.includes(effect.id);
            const ringPending = !isPersistentPresentationId(effect.id);
            const route = (
              <>
                <PlayerName
                  nickname={sourceNick}
                  playerId={effect.sourcePlayerId}
                  view={view}
                  className="text-[10px]"
                />
                <span className="text-ink-muted"> → </span>
                <PlayerName
                  nickname={targetNick}
                  playerId={effect.targetPlayerId}
                  view={view}
                  className="text-[10px]"
                />
              </>
            );
            const chip = compact ? (
              <span
                className={[
                  'flex max-w-full flex-wrap items-start gap-1 rounded-[length:var(--radius-badge)] border px-2 py-1 shadow-sm transition-shadow duration-200',
                  chipClass,
                  highlighted ? highlightClass : '',
                  entranceClass,
                ].join(' ')}
              >
                <span className="whitespace-normal break-words text-xs font-semibold">{label}</span>
                <span className="inline-flex min-w-0 whitespace-normal break-words text-[10px] text-ink-muted">
                  {route}
                </span>
              </span>
            ) : (
              <span
                className={[
                  'flex min-w-[8rem] flex-col rounded-[length:var(--radius-card)] border px-2 py-1 shadow-sm transition-shadow duration-200',
                  chipClass,
                  highlighted ? highlightClass : '',
                  entranceClass,
                ].join(' ')}
              >
                <span className="text-sm font-semibold">{label}</span>
                <span className="inline-flex flex-wrap items-baseline gap-0 text-[10px] leading-tight text-ink-muted">
                  {route}
                </span>
                <span className="text-[10px] tabular-nums text-ink-muted">
                  queued #{effect.queuedAt}
                </span>
              </span>
            );
            return (
              <li
                key={effect.id}
                data-pending-id={effect.id}
                title={compact ? `${label} · ${routePlain} · queued #${String(effect.queuedAt)}` : undefined}
                className={ringPending ? 'overflow-visible' : undefined}
              >
                {ringPending ? (
                  <TutorialCallout
                    active
                    arrow={false}
                    tone={pendingChipCalloutTone(effect.cardId)}
                  >
                    {chip}
                  </TutorialCallout>
                ) : (
                  chip
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
