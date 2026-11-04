/**
 * Home connection status line and error alert (HomeStatus): technical spec v7 §7.1, §7.7; L42-04,
 * L51-03. L76-04: the V7 look. The error is the lobby alert look (`--panel-2`, `--danger` inset
 * ring) with no OK: a Home error clears only on the next start (§7.7 "retry in place"). The
 * `role="alert"` node holds only the message; `data-home-alert` marks its wrapper.
 */

import type { ReactElement } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import { homeStatusCopy } from '../status-labels';

export interface HomeStatusProps {
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
}

export function HomeStatus({ status, error, soloLaunchPending }: HomeStatusProps): ReactElement {
  const copy = homeStatusCopy(status, soloLaunchPending);
  return (
    <>
      {copy !== null && (
        <p className="font-v7-body text-v7-body font-bold text-v7-text-2">{copy}</p>
      )}
      {error !== null && (
        <div
          data-home-alert
          className={`bg-v7-panel-2 px-3 py-2 ring-2 ring-inset ring-v7-danger ${CHROME_SHAPE_SM_CLASS}`}
        >
          <p role="alert" className="font-v7-body text-v7-body font-bold text-v7-text">
            {error}
          </p>
        </div>
      )}
    </>
  );
}
