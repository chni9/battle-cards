/**
 * Optional How to play primer for first-time visitors — Home hub only.
 * Copy cites rules §1 / §6 / Classic; never gates Create / Join / Solo.
 */

import type { ReactElement } from 'react';

import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';

export interface HowToPlayDialogProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    title: 'Goal',
    body: 'Classic mode: last player alive wins. Lives never go above 25, from any source.',
  },
  {
    title: 'Delayed resolution',
    body: 'An action aimed at an opponent resolves on their next turn — after they have played their own action. That delay is how you bluff, riposte, heal, or Mirror before the hit lands. You never lose lives or resources outside your own turn.',
  },
  {
    title: 'One action per turn',
    body: 'Each turn you take a single action: draw, play, buy, sell, upgrade, or use a special. Draw only grants points equal to your kit’s Draw value — it does not deal a card.',
  },
  {
    title: 'Resources',
    body: 'Lives keep you in the game. Points pay for cards and upgrades. Upgrade points permanently upgrade a card once. Shield absorbs attack damage only — other life loss (Tax, Suicide, and similar) ignores it.',
  },
  {
    title: 'Hidden information',
    body: 'Your kit, hand, and exact resources stay private. Every action you play is public. Spy and similar effects can reveal what was hidden.',
  },
  {
    title: 'Online vs solo',
    body: 'Online: create a room or join with a six-letter code; the host starts when ready (bots can fill empty seats in the lobby). Solo: pick opponent count and difficulty, then jump straight into a bot game — no lobby.',
  },
] as const;

export function HowToPlayDialog({ open, onClose }: HowToPlayDialogProps): ReactElement {
  return (
    <Dialog
      open={open}
      title="How to play"
      onClose={onClose}
      closeOnOverlayClick
      panelClassName="max-w-lg"
      actions={
        <Button type="button" variant="green" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <p className="text-sm leading-relaxed text-ink-muted">
        Card Battle is a turn-based elimination game built on hidden information and delayed
        resolution. This is a short primer — not the full rules.
      </p>
      <ol className="mt-4 list-none space-y-4 p-0">
        {SECTIONS.map((section) => (
          <li key={section.title}>
            <h3 className="text-sm font-semibold text-ink">{section.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{section.body}</p>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
