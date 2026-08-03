/**
 * Visible bot seat marker — technical spec v3 §6, §7 · L17-03.
 * Shown to every recipient; not host-only.
 */

import type { BotDifficulty } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { formatBotDifficulty } from '../../bots/format-bot-difficulty';

export interface BotSeatLabelProps {
  difficulty: BotDifficulty;
  className?: string;
}

export function BotSeatLabel({ difficulty, className = '' }: BotSeatLabelProps): ReactElement {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-[length:var(--radius-badge)]',
        'border border-border-soft bg-surface px-1.5 py-0.5',
        'text-[10px] font-semibold uppercase tracking-wide text-ink-muted',
        className,
      ]
        .filter((part) => part.length > 0)
        .join(' ')}
    >
      <span>Bot</span>
      <span aria-hidden>·</span>
      <span className="normal-case tracking-normal text-ink">
        {formatBotDifficulty(difficulty)}
      </span>
    </span>
  );
}
