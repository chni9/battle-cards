/**
 * A direct `AnimatePresence` child that tells its content whether it is still present
 * (L72-09 fix round 1). While it exits, AnimatePresence keeps rendering the last element with
 * its stale props and handlers; `present` is the one live value, so an exiting overlay, handle
 * or toast can turn inert and stop taking pointer events instead of acting on a closed sheet.
 */

import { useIsPresent } from 'motion/react';
import type { ReactElement } from 'react';

export interface PresenceLayerProps {
  render: (present: boolean) => ReactElement;
}

export function PresenceLayer({ render }: PresenceLayerProps): ReactElement {
  return render(useIsPresent());
}
