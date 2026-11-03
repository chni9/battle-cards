/**
 * The lobby header and game code card (technical spec v7 §7.2; parity `lobby-header-status`,
 * `lobby-game-code`): the eyebrow, title and connection status, the inline `role="alert"` error
 * (§7.7; L76-14 adds its dismiss), and the code with Copy and its V7 result dialog. Both result
 * bodies keep the code, so a failed copy still shows it. It holds no intent control, so it takes
 * no `locked`. L76-12.
 */

import { useId, useState, type ReactElement } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { Button } from '../../ui/primitives/button';
import { CHROME_SHAPE_CLASS, CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import { Dialog } from '../../ui/primitives/dialog';
import { STATUS_LABELS } from '../status-labels';
import {
  COPY_FAILED_TITLE,
  COPY_LABEL,
  COPY_OK_TITLE,
  COPY_RESULT_DISMISS_LABEL,
  copyResultBody,
  GAME_CODE_LABEL,
  HOST_LINE,
  LOBBY_EYEBROW,
  LOBBY_TITLE,
} from './lobby-copy';

export interface LobbyHeaderProps {
  readonly gameCode: string;
  readonly status: RoomConnectionStatus;
  readonly error: string | null;
  /** Shows 'You are the host' under the code. */
  readonly isHost: boolean;
}

export function LobbyHeader({ gameCode, status, error, isHost }: LobbyHeaderProps): ReactElement {
  const codeId = useId();
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const close = (): void => {
    setCopyOpen(false);
  };
  const copy = (): void => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(gameCode);
        setCopyFailed(false);
        setCopyOpen(true);
      } catch {
        setCopyFailed(true);
        setCopyOpen(true);
      }
    })();
  };

  return (
    <>
      <header className="flex flex-col gap-1">
        <p className="font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.14em] text-v7-text-2">{LOBBY_EYEBROW}</p>
        <h1 className="font-v7-display text-v7-display leading-none text-v7-text">{LOBBY_TITLE}</h1>
        <p className="font-v7-body text-v7-body font-bold text-v7-text-2">{STATUS_LABELS[status]}</p>
        {error !== null ? (
          <p
            role="alert"
            className={`${CHROME_SHAPE_SM_CLASS} bg-v7-panel-2 px-3 py-2 font-v7-body text-v7-body font-bold text-v7-text ring-2 ring-inset ring-v7-danger`}
          >
            {error}
          </p>
        ) : null}
      </header>
      <section aria-labelledby={codeId} className={`${CHROME_SHAPE_CLASS} bg-v7-panel p-4`}>
        <h2 id={codeId} className="font-v7-body text-v7-caption font-extrabold uppercase tracking-wide text-v7-text-2">
          {GAME_CODE_LABEL}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="font-v7-display text-v7-display tracking-[0.2em] text-v7-text">{gameCode}</p>
          <Button variant="secondary" icon="copy" onClick={copy}>
            {COPY_LABEL}
          </Button>
        </div>
        {isHost ? <p className="mt-2 font-v7-body text-v7-body font-bold text-v7-text-2">{HOST_LINE}</p> : null}
      </section>
      <Dialog
        open={copyOpen}
        title={copyFailed ? COPY_FAILED_TITLE : COPY_OK_TITLE}
        onClose={close}
        dataAttributes={{ 'data-lobby-sheet': 'copy-result' }}
        actions={
          <Button variant="primary" onClick={close}>
            {COPY_RESULT_DISMISS_LABEL}
          </Button>
        }
      >
        <p className="font-v7-body text-v7-body text-v7-text">{copyResultBody(gameCode, copyFailed)}</p>
      </Dialog>
    </>
  );
}
