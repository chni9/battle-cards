/** Home connection status line and error alert (HomeStatus): technical spec v7 §7.1; L42-04, L51-03. */

import type { ReactElement } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
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
        <p className="mt-4 text-sm text-ink-muted">{copy}</p>
      )}
      {error !== null && (
        <p className="mt-2 text-sm font-medium text-cta-red" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
