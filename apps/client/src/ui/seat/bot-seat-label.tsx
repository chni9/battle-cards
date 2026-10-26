/**
 * Visible bot seat marker — technical spec v3 §6, §7 (L17-03: shown to every recipient, not
 * host-only) and v7 §5.1, §5.2, §5.3. L72-19. It replaces `design/components/bot-seat-label.tsx`
 * on V7 surfaces; the V2 file stays for the V2 table and lobby until L74 and L76 switch their
 * imports.
 *
 * Reads "Bot · {Easy|Normal|Hard}" (`formatBotDifficulty`): a decorative `bot` icon, the word
 * in `--text-2` on `--panel`, and the tier in `--text`. The root has no role and no
 * `aria-label`, so the visible text is the spoken text, as in V2 (the dot is `aria-hidden`).
 * The children have no whitespace text nodes, so `textContent` is exactly `Bot·Easy` for
 * tests. Same chip as the connection badge: 11 px, `--chrome-radius-sm`, no outline or hard
 * shadow (the seat frame owns the chrome, §5.3). `--text-2` and `--text` clear 4.5:1 on
 * `--panel` (`ui/contrast.test.ts`), and the `bot` icon (`--text-2`) is far from `--panel`
 * (CIEDE2000 68), so it needs no well (DESIGN.md › Icons).
 */

import type { BotDifficulty } from '@card-battle/shared';
import type { ReactElement } from 'react';
import { formatBotDifficulty } from '../../bots/format-bot-difficulty';
import { Icon } from '../icons/icon';

export interface BotSeatLabelProps {
  difficulty: BotDifficulty;
  className?: string;
}

const CHIP_CLASS =
  'inline-flex items-center gap-1 rounded-v7-chrome-sm px-1.5 py-0.5 font-v7-body text-v7-micro font-extrabold uppercase tracking-wide';

export function BotSeatLabel({ difficulty, className = '' }: BotSeatLabelProps): ReactElement {
  return (
    <span className={[CHIP_CLASS, 'bg-v7-panel text-v7-text-2', className].filter((part) => part !== '').join(' ')}>
      <Icon name="bot" size={12} className="shrink-0" />
      <span>Bot</span>
      <span aria-hidden="true">·</span>
      <span className="normal-case tracking-normal text-v7-text">{formatBotDifficulty(difficulty)}</span>
    </span>
  );
}
