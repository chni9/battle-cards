/**
 * `/dev/ui` demo for the L72-18 table banners (technical spec v7 §4.2). DEV only: the gallery
 * is lazily imported behind `import.meta.env.DEV`, so neither this file nor its "Play" label
 * ships. Components only, because `banner.gallery.tsx` exports the non-component `gallery`
 * (react-refresh).
 *
 * The host's `fixed` root stays inside the demo box: the box's `translateZ(0)` makes it the
 * containing block. Seeded kinds (Your turn, You won!, You are dead) remount the host per
 * play, since they fire on first mount. The others keep one mount and add one input per play,
 * so pressing Play several times queues several banners: an attack each time; the Sentence
 * countdown 3, 2, 1, then the fire line naming a 24-character victim (the nickname cap) to
 * check the wrap; one own Gambler wipe each time.
 */

import { useMemo, useState, type ReactElement } from 'react';

import type { ActionLogEntryView, PendingEffectView, SentenceAnnouncementLogEntry } from '@card-battle/shared';

import { CHROME_OUTLINE_CLASS } from '../primitives/chrome-classes';
import { Button } from '../primitives/button';
import type { BannerKind } from './banner-items';
import { TableBannerHost } from './table-banner-host';

export interface BannerDemoProps {
  kind: BannerKind;
  seatColor?: string;
}

const YOU = 'demo';
const CASTER = 'bob';
const VICTIM = 'victim';
const NO_EFFECTS: readonly PendingEffectView[] = [];
const NO_ANNOUNCEMENTS: readonly SentenceAnnouncementLogEntry[] = [];
const NO_LOG: readonly ActionLogEntryView[] = [];

function demoNickname(id: string): string {
  return id === VICTIM ? 'Bartholomew_Vanderbilt_X' : 'Bob';
}

function demoAttacks(plays: number): PendingEffectView[] {
  return Array.from({ length: plays }, (_, index) => ({
    id: `demo-attack-${String(index)}`,
    cardId: 'basic-attack',
    isUpgraded: false,
    sourcePlayerId: CASTER,
    targetPlayerId: YOU,
    queuedAt: index + 1,
    damageMultiplier: 1,
    redirectedBy: null,
  }));
}

function demoSentence(plays: number): SentenceAnnouncementLogEntry[] {
  return Array.from({ length: plays }, (_, index): SentenceAnnouncementLogEntry => {
    const step = index % 4;
    return step === 3
      ? { kind: 'sentenceFired', sourcePlayerId: CASTER, targetPlayerId: VICTIM, turnSequence: index + 1 }
      : { kind: 'sentenceCountdown', sourcePlayerId: CASTER, remainingOwnerTurns: 3 - step, turnSequence: index + 1 };
  });
}

function demoWipes(plays: number): ActionLogEntryView[] {
  return Array.from({ length: plays }, (_, index) => ({
    kind: 'actionPlayed',
    actorPlayerId: YOU,
    action: 'draw',
    turnSequence: index + 1,
    drawBust: true,
  }));
}

export function BannerDemo({ kind, seatColor }: BannerDemoProps): ReactElement {
  const [plays, setPlays] = useState(0);
  const seeded = kind === 'turn' || kind === 'won' || kind === 'dead';
  const pendingEffects = useMemo(() => (kind === 'attacked' ? demoAttacks(plays) : NO_EFFECTS), [kind, plays]);
  const sentenceAnnouncements = useMemo(() => (kind === 'sentence' ? demoSentence(plays) : NO_ANNOUNCEMENTS), [kind, plays]);
  const actionLog = useMemo(() => (kind === 'wipe' ? demoWipes(plays) : NO_LOG), [kind, plays]);

  const host = (
    <TableBannerHost
      key={seeded ? plays : 'one-mount'}
      isMyTurn={kind === 'turn'}
      isEliminated={kind === 'dead'}
      youWon={kind === 'won'}
      pendingEffects={pendingEffects}
      sentenceAnnouncements={sentenceAnnouncements}
      actionLog={actionLog}
      nicknameOf={demoNickname}
      you={YOU}
      {...(seatColor !== undefined ? { seatColor } : {})}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          variant="secondary"
          onClick={() => {
            setPlays((count) => count + 1);
          }}
        >
          Play
        </Button>
      </div>
      <div className={`relative h-56 overflow-hidden rounded-v7-chrome v7-ground [transform:translateZ(0)] ${CHROME_OUTLINE_CLASS}`}>
        {seeded && plays === 0 ? null : host}
      </div>
    </div>
  );
}
