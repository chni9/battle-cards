/**
 * A direct `AnimatePresence` child that tells its content whether it is still present
 * (L72-09 fix rounds 1-3). While it exits, AnimatePresence keeps rendering the last element
 * with its stale props and handlers; `present` is the one live value. An exiting sheet overlay
 * that was the live sheet uses it to become a no-op press shield with an inert panel; a covered
 * one stays inert and click-through under the live sheet; an exiting toast card turns inert and
 * click-through.
 */

import { useIsPresent } from 'motion/react';
import type { ReactElement } from 'react';

export interface PresenceLayerProps {
  render: (present: boolean) => ReactElement;
}

export function PresenceLayer({ render }: PresenceLayerProps): ReactElement {
  return render(useIsPresent());
}
