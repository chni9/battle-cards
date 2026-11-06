/**
 * One Home launch per intent per connection state (Part 2 Review Focus 3, L76-08); technical spec
 * v7 §1 ("an accidental tap never spends the turn"), §7.7 (a connection error stays inline and the
 * player retries in place). `createGame` and the solo and tutorial launches await `leaveCurrent`
 * before they set `connecting`, so a second submit can land before the buttons grey out. The same
 * epoch latch as `screens/arena/top-bar.tsx` (plan A.9 ruling 5), re-implemented here.
 */

import { useRef, useState } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';

export const HOME_LAUNCHES = ['create', 'join', 'solo', 'tutorial'] as const;
export type HomeLaunch = (typeof HOME_LAUNCHES)[number];

/**
 * One launch per intent per connection state (Part 2 Review Focus 3). Returns `launchOnce(launch, run)`:
 * `run()` is called unless that intent already launched since `status`, `error` or `soloLaunchPending`
 * last changed. A change re-arms every intent, so a failure lets the player retry in place.
 */
export function useLaunchOnce(
  status: RoomConnectionStatus,
  error: string | null,
  soloLaunchPending: boolean,
): (launch: HomeLaunch, run: () => void) => void {
  const [epoch, setEpoch] = useState(0);
  const [source, setSource] = useState({ status, error, soloLaunchPending });
  // Adjust state while rendering: a new connection state is a new epoch, so every intent is armed again.
  if (source.status !== status || source.error !== error || source.soloLaunchPending !== soloLaunchPending) {
    setSource({ status, error, soloLaunchPending });
    setEpoch(epoch + 1);
  }
  /**
   * The epoch each intent last launched in. A state guard is not enough: two submits in one event
   * burst both read the same render's closure, and a ref is read only here, in a handler, never
   * during render (the React Compiler lint).
   */
  const launched = useRef<Partial<Record<HomeLaunch, number>>>({});

  return (launch, run) => {
    if (launched.current[launch] === epoch) {
      return;
    }
    launched.current[launch] = epoch;
    run();
  };
}
