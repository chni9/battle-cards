/**
 * The lobby header and game code card (technical spec v7 §7.2; parity `lobby-header-status`,
 * `lobby-game-code`): the eyebrow, title and connection status, the inline `role="alert"` error
 * (§7.7) with its OK dismiss (L76-14), and the code with Copy, Share and their V7 result dialog.
 * Share (§7.2, Q28; L76-17) hands the invite link to the Web Share sheet when the browser has one
 * (a cancel is silent), else copies the link ('Link copied'). Every result body keeps the code, so a
 * failed copy still shows it. The status line is a polite `role="status"` region, so
 * 'Reconnecting…' is announced as the arena's `ReconnectBanner` does. The OK sits outside the
 * `role="alert"` node, so only the message is announced. It holds no intent control, so it takes no
 * `locked`: nothing in it locks, Share included (A.9 ruling 6). L76-12, L76-14, L76-17.
 */

import { useId, useState, type ReactElement } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { Button } from '../../ui/primitives/button';
import { CHROME_SHAPE_CLASS, CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import { Dialog } from '../../ui/primitives/dialog';
import { IconButton } from '../../ui/primitives/icon-button';
import { STATUS_LABELS } from '../status-labels';
import { inviteLink } from './invite-link';
import {
  COPY_FAILED_TITLE,
  COPY_LABEL,
  COPY_OK_TITLE,
  COPY_RESULT_DISMISS_LABEL,
  copyResultBody,
  GAME_CODE_LABEL,
  HOST_LINE,
  LINK_COPIED_TITLE,
  linkCopiedBody,
  LOBBY_DISMISS_LABEL,
  LOBBY_EYEBROW,
  LOBBY_TITLE,
  SHARE_LABEL,
} from './lobby-copy';

/** What the copy-result dialog reports: the code copied, the invite link copied (L76-17), or a refused clipboard. */
type CopyResult = { readonly kind: 'code' } | { readonly kind: 'link'; readonly link: string } | { readonly kind: 'failed' };

export interface LobbyHeaderProps {
  readonly gameCode: string;
  readonly status: RoomConnectionStatus;
  readonly error: string | null;
  /** Shows 'You are the host' under the code. */
  readonly isHost: boolean;
  /** The alert's OK (A.9 ruling 4): App's clearActionReject through LobbyScreen. */
  readonly onDismissError: () => void;
}

export function LobbyHeader({ gameCode, status, error, isHost, onDismissError }: LobbyHeaderProps): ReactElement {
  const codeId = useId();
  const [resultOpen, setResultOpen] = useState(false);
  // Kept while the dialog exits, so its title does not flash to another result.
  const [result, setResult] = useState<CopyResult>({ kind: 'code' });

  const close = (): void => {
    setResultOpen(false);
  };
  const copy = (): void => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(gameCode);
        setResult({ kind: 'code' });
      } catch {
        setResult({ kind: 'failed' });
      }
      setResultOpen(true);
    })();
  };
  const share = (): void => {
    const link = inviteLink(window.location.origin, gameCode);
    void (async () => {
      if ('share' in navigator) {
        try {
          await navigator.share({ url: link });
          return;
        } catch (error) {
          // The player closed the share sheet: nothing to report. Any other failure copies the link.
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(link);
        setResult({ kind: 'link', link });
      } catch {
        setResult({ kind: 'failed' });
      }
      setResultOpen(true);
    })();
  };

  let resultTitle: string;
  let resultBody: string;
  switch (result.kind) {
    case 'code':
      resultTitle = COPY_OK_TITLE;
      resultBody = copyResultBody(gameCode, false);
      break;
    case 'link':
      resultTitle = LINK_COPIED_TITLE;
      resultBody = linkCopiedBody(result.link);
      break;
    case 'failed':
      resultTitle = COPY_FAILED_TITLE;
      resultBody = copyResultBody(gameCode, true);
      break;
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <p className="font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.14em] text-v7-text-2">{LOBBY_EYEBROW}</p>
        <h1 className="font-v7-display text-v7-display leading-none text-v7-text">{LOBBY_TITLE}</h1>
        <p role="status" className="font-v7-body text-v7-body font-bold text-v7-text-2">
          {STATUS_LABELS[status]}
        </p>
        {error !== null ? (
          <div
            data-lobby-alert
            className={`mt-2 flex items-start gap-2 bg-v7-panel-2 py-1 pr-1 pl-3 ring-2 ring-inset ring-v7-danger ${CHROME_SHAPE_SM_CLASS}`}
          >
            <p role="alert" className="min-w-0 flex-1 py-2.5 font-v7-body text-v7-body font-bold text-v7-text">
              {error}
            </p>
            <IconButton aria-label={LOBBY_DISMISS_LABEL} icon="close" variant="quiet" onClick={onDismissError} />
          </div>
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
          <Button variant="secondary" icon="share" onClick={share}>
            {SHARE_LABEL}
          </Button>
        </div>
        {isHost ? <p className="mt-2 font-v7-body text-v7-body font-bold text-v7-text-2">{HOST_LINE}</p> : null}
      </section>
      <Dialog
        open={resultOpen}
        title={resultTitle}
        onClose={close}
        dataAttributes={{ 'data-lobby-sheet': 'copy-result' }}
        actions={
          <Button variant="primary" onClick={close}>
            {COPY_RESULT_DISMISS_LABEL}
          </Button>
        }
      >
        <p className="font-v7-body text-v7-body text-v7-text">{resultBody}</p>
      </Dialog>
    </>
  );
}
