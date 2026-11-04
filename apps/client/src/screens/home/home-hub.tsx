/**
 * Home hub (HomeHub): technical spec v7 §7.1 (fan, wordmark, three mode tiles in the order Solo,
 * Online, Tutorial, How to play, Feedback), §5.1–§5.3 (V7 tokens and chrome), §5.5 (tile art from
 * `artFor`); Appendix A `home-hub`; L42-04, L51-03, L47-03. L76-04: the V7 hub.
 *
 * The wordmark keeps the `<h1>` text 'Card Battle' and shows CARD BATTLE through CSS, so its
 * accessible name does not change. Its outline and hard shadow are inline palette hex, never
 * `var()` (DESIGN.md › The Inline Hex Rule). Every control is disabled while busy; the soft gate
 * lives in `HomeScreen`, the tiles only call back.
 */

import type { CardId, KitId } from '@card-battle/shared';
import type { CSSProperties, ReactElement } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { artFor } from '../../ui/asset-lookup';
import type { HowToPlayContinueTarget } from '../../ui/help-storage';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { V7_COLORS } from '../../ui/palette';
import { Button } from '../../ui/primitives/button';
import {
  CHROME_DISABLED_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_SHAPE_CLASS,
  chromePressClass,
  motionAttribute,
} from '../../ui/primitives/chrome-classes';
import { HomeArt } from './home-art';
import { HomeStatus } from './home-status';

export interface HomeHubProps {
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
  busy: boolean;
  onOpenHowToPlay: () => void;
  onOpenFeedback: () => void;
  onChooseOnline: () => void;
  onChooseSolo: () => void;
  onChooseTutorial: () => void;
}

/** Display uppercase, 48 px from `sm`; it overlaps the bottom of the fan (DESIGN.md › Typography). */
const WORDMARK_CLASS =
  'relative -mt-8 font-v7-display text-v7-display uppercase leading-none tracking-wide text-v7-text sm:text-[48px]';

/** The arcade outline painted under the fill (a 6 px stroke shows 3 px) and the hard ink shadow. */
const WORDMARK_STYLE: CSSProperties = {
  WebkitTextStroke: `6px ${V7_COLORS.ink}`,
  paintOrder: 'stroke fill',
  textShadow: `0 4px 0 ${V7_COLORS.ink}`,
};

/** Each tile's base drawing (designer question 1). */
const TILE_ART: Readonly<Record<HowToPlayContinueTarget, CardId | KitId>> = {
  solo: 'scientific',
  online: 'assassin',
  tutorial: 'basic-attack',
};

interface ModeTileProps {
  readonly target: HowToPlayContinueTarget;
  readonly label: string;
  readonly disabled: boolean;
  readonly onChoose: () => void;
}

/** A big chrome tile whose accessible name is exactly its label (the art is decorative). */
function ModeTile({ target, label, disabled, onChoose }: ModeTileProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  return (
    <button
      type="button"
      data-home-tile={target}
      data-motion={motionAttribute(reduced)}
      disabled={disabled}
      onClick={onChoose}
      className={[
        'flex min-h-11 items-center gap-3 bg-v7-panel px-3 py-3 text-left text-v7-text sm:flex-col sm:text-center',
        CHROME_SHAPE_CLASS,
        CHROME_FOCUS_CLASS,
        CHROME_DISABLED_CLASS,
        chromePressClass(reduced),
      ].join(' ')}
    >
      <img src={artFor(TILE_ART[target])} alt="" draggable={false} className="size-16 shrink-0 object-contain" />
      <span className="font-v7-display text-v7-title leading-none">{label}</span>
    </button>
  );
}

export function HomeHub({
  status,
  error,
  soloLaunchPending,
  busy,
  onOpenHowToPlay,
  onOpenFeedback,
  onChooseOnline,
  onChooseSolo,
  onChooseTutorial,
}: HomeHubProps): ReactElement {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <HomeArt />
      <h1 className={WORDMARK_CLASS} style={WORDMARK_STYLE}>
        Card Battle
      </h1>
      <p className="font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.14em] text-v7-text-2">
        Turn-based card battle
      </p>
      <HomeStatus status={status} error={error} soloLaunchPending={soloLaunchPending} />

      <div className="grid w-full gap-3 sm:grid-cols-3">
        <ModeTile target="solo" label="Play solo" disabled={busy} onChoose={onChooseSolo} />
        <ModeTile target="online" label="Play online" disabled={busy} onChoose={onChooseOnline} />
        <ModeTile target="tutorial" label="Tutorial" disabled={busy} onChoose={onChooseTutorial} />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" icon="help" disabled={busy} onClick={onOpenHowToPlay}>
          How to play
        </Button>
        <Button variant="quiet" icon="feedback" disabled={busy} onClick={onOpenFeedback}>
          Feedback
        </Button>
      </div>

      <p className="max-w-[42ch] font-v7-body text-v7-body text-v7-text-2">
        New here? Open How to play once, then pick Tutorial, Online, or Solo.
      </p>
    </div>
  );
}
