/** Home hub: Online / Solo / Tutorial, How to play, Feedback (HomeHub): technical spec v7 §7.1; L42-04, L51-03, L47-03. */

import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';
import type { RoomConnectionStatus } from '../../net/use-room-connection';
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
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
        Turn-based card battle
      </p>
      <h1 className="mt-2 font-sans text-4xl font-semibold tracking-tight text-ink md:text-5xl">
        Card Battle
      </h1>
      <HomeStatus
        status={status}
        error={error}
        soloLaunchPending={soloLaunchPending}
      />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="green" disabled={busy} onClick={onChooseOnline}>
          Play online
        </Button>
        <Button type="button" variant="green" disabled={busy} onClick={onChooseSolo}>
          Play solo
        </Button>
        <Button type="button" variant="green" disabled={busy} onClick={onChooseTutorial}>
          Tutorial
        </Button>
        <Button type="button" variant="orange" disabled={busy} onClick={onOpenHowToPlay}>
          How to play
        </Button>
        <Button type="button" variant="orange" disabled={busy} onClick={onOpenFeedback}>
          Feedback
        </Button>
      </div>

      <p className="mt-6 max-w-[42ch] text-sm leading-relaxed text-ink-muted">
        New here? Open How to play once, then pick Tutorial, Online, or Solo.
      </p>
    </div>
  );
}
