/**
 * POV elimination overlay — technical spec v7 §6.12 (L74-23).
 *
 * 'You are dead' over the arena region while `visible` (`usePovElimination`, for
 * `TABLE_BANNER_MS`). It replaces the banner's You are dead cue in the arena
 * (`TableBannerHost deadCue={false}`). The root is always mounted, so its polite live region
 * exists before the text: a region that mounts together with its text is skipped by many screen
 * readers (the `TableBannerHost` lesson). It is `pointer-events: none` and takes no focus or
 * press, an in-region layer like the plate, never a `Sheet` or a fixed layer. The slab is the
 * banner's flat outlined chrome on `--danger`; it is static until L78 adds motion.
 */

import type { ReactElement } from 'react';

import { V7_COLORS } from '../../ui/palette';
import { CHROME_OUTLINE_CLASS } from '../../ui/primitives/chrome-classes';
import { TABLE_BANNER_COPY } from '../../view-model/table-banner';

export interface PovEliminationOverlayProps {
  readonly visible: boolean;
}

export function PovEliminationOverlay({ visible }: PovEliminationOverlayProps): ReactElement {
  return (
    <div
      data-pov-elimination=""
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4"
    >
      {visible ? (
        <p
          className={`max-w-full px-8 py-4 text-center font-v7-display text-v7-display leading-tight ${CHROME_OUTLINE_CLASS} rounded-v7-chrome`}
          style={{ backgroundColor: V7_COLORS.danger, color: V7_COLORS['text-on-cta'] }}
        >
          {TABLE_BANNER_COPY.dead}
        </p>
      ) : null}
    </div>
  );
}
