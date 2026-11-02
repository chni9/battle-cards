/**
 * The reconnect banner — technical spec v7 §6.12; Appendix A `global-room-connection-lifecycle`,
 * `global-page-reload-recovery`; Part 2 Review Focus 3 (L74-25).
 *
 * The polite `role="status"` region is always mounted and empty while connected: a live region
 * that mounts together with its text is skipped by many screen readers (the `ui/banner` pattern).
 * While reconnecting it shows `Reconnecting…` (`STATUS_LABELS`). It sits in flow above the top bar
 * (designer 2026-11-02), so it pushes the board down, covers no control and never blocks: no
 * `fixed` layer. The lock itself is `ActionContext.reconnecting` in `ArenaScreen`.
 */

import type { ReactElement } from 'react';

import { Icon } from '../../ui/icons/icon';
import { CHROME_SHAPE_SM_CLASS } from '../../ui/primitives/chrome-classes';
import { STATUS_LABELS } from '../status-labels';

export function ReconnectBanner({ reconnecting }: { readonly reconnecting: boolean }): ReactElement {
  return (
    <div role="status" aria-live="polite" data-zone="reconnect-banner" className="flex justify-center">
      {reconnecting ? (
        <p
          className={`mb-1 flex items-center gap-2 bg-v7-panel-2 px-3 py-1.5 font-v7-body text-v7-caption font-bold text-v7-text ${CHROME_SHAPE_SM_CLASS}`}
        >
          <Icon name="disconnected" size={16} />
          {STATUS_LABELS.reconnecting}
        </p>
      ) : null}
    </div>
  );
}
