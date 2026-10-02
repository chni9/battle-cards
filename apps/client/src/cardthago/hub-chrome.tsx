import type { ReactElement } from 'react';

import type { RoomConnectionStatus } from '../net/use-room-connection';
import { homeStatusCopy } from '../screens/status-labels';

interface HubChromeProps {
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

function StatusLine({
  status,
  error,
  soloLaunchPending,
}: {
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
}): ReactElement {
  const copy = homeStatusCopy(status, soloLaunchPending);
  return (
    <>
      {copy !== null ? <p className="mt-4 text-sm text-ink-muted">{copy}</p> : null}
      {error !== null ? (
        <p className="mt-2 text-sm font-medium text-cta-red" role="alert">{error}</p>
      ) : null}
    </>
  );
}

export function AtelierHubChrome({
  status,
  error,
  soloLaunchPending,
  busy,
  onOpenHowToPlay,
  onOpenFeedback,
  onChooseOnline,
  onChooseSolo,
  onChooseTutorial,
}: HubChromeProps): ReactElement {
  return (
    <div className="cardthago-hub">
      <div className="cardthago-hub__portal">
        <div className="cardthago-hub__lintel">
          <h1 className="cardthago-hub__title cardthago-inscription">Cardthago</h1>
        </div>
        <p className="cardthago-inscription mt-8 text-center text-xs tracking-[0.2em] text-[#d4c4a8]">
          Turn-based card battle
        </p>
        <StatusLine status={status} error={error} soloLaunchPending={soloLaunchPending} />
        <div className="cardthago-hub__seals">
          <button
            type="button"
            className="cardthago-hub__seal cardthago-inscription"
            disabled={busy}
            onClick={onChooseOnline}
          >
            Play online
          </button>
          <button
            type="button"
            className="cardthago-hub__seal cardthago-inscription"
            disabled={busy}
            onClick={onChooseSolo}
          >
            Play solo
          </button>
          <button
            type="button"
            className="cardthago-hub__seal cardthago-inscription"
            disabled={busy}
            onClick={onChooseTutorial}
          >
            Tutorial
          </button>
          <button
            type="button"
            className="cardthago-hub__seal cardthago-hub__seal--secondary cardthago-inscription"
            disabled={busy}
            onClick={onOpenHowToPlay}
          >
            How to play
          </button>
          <button
            type="button"
            className="cardthago-hub__seal cardthago-hub__seal--secondary cardthago-inscription"
            disabled={busy}
            onClick={onOpenFeedback}
          >
            Feedback
          </button>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-[#c4b8a0]">
          New here? Open How to play once, then pick Tutorial, Online, or Solo.
        </p>
      </div>
    </div>
  );
}

export function FresqueHubChrome({
  status,
  error,
  soloLaunchPending,
  busy,
  onOpenHowToPlay,
  onOpenFeedback,
  onChooseOnline,
  onChooseSolo,
  onChooseTutorial,
}: HubChromeProps): ReactElement {
  return (
    <div className="cardthago-hub">
      <div className="cardthago-hub__court">
        <div className="cardthago-hub__columns">
          <div className="cardthago-hub__column" aria-hidden />
          <div>
            <div className="cardthago-hub__banner">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
                Turn-based card battle
              </p>
              <h1 className="cardthago-hub__title cardthago-inscription mt-1">Cardthago</h1>
            </div>
            <StatusLine status={status} error={error} soloLaunchPending={soloLaunchPending} />
            <div className="cardthago-hub__scene-actions">
              <button
                type="button"
                className="cardthago-hub__scene-object"
                disabled={busy}
                onClick={onChooseOnline}
              >
                Merchant gate — Play online
              </button>
              <button
                type="button"
                className="cardthago-hub__scene-object"
                disabled={busy}
                onClick={onChooseSolo}
              >
                Lone bench — Play solo
              </button>
              <button
                type="button"
                className="cardthago-hub__scene-object cardthago-hub__scene-object--wide"
                disabled={busy}
                onClick={onChooseTutorial}
              >
                Painted scroll — Tutorial
              </button>
              <button
                type="button"
                className="cardthago-hub__scene-object"
                disabled={busy}
                onClick={onOpenHowToPlay}
              >
                Mosaic tablet — How to play
              </button>
              <button
                type="button"
                className="cardthago-hub__scene-object"
                disabled={busy}
                onClick={onOpenFeedback}
              >
                Clay jar — Feedback
              </button>
            </div>
            <p className="mt-5 text-center text-sm leading-relaxed text-ink">
              New here? Open How to play once, then pick Tutorial, Online, or Solo.
            </p>
          </div>
          <div className="cardthago-hub__column" aria-hidden />
        </div>
      </div>
    </div>
  );
}
