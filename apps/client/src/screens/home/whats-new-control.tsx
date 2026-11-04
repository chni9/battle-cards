/**
 * Home What's new control (WhatsNewControl): technical spec v7 §7.1 (L63-07: a small top-right
 * control with an unread dot beside Beta), §11 and §13 Q8 (disabled only while a solo game
 * launches, keeping its name), Appendix A `home-whats-new`. The dot is decorative: the unread
 * state is carried by the name. Native `disabled`, so the button leaves the Tab order while a
 * launch runs.
 */

import type { ReactElement } from 'react';

import { Button } from '../../ui/primitives/button';

export interface WhatsNewControlProps {
  /** The latest entry is unseen: the name gains "(unread)" and the dot shows. */
  readonly unread: boolean;
  /** True only while a solo game launches (spec v7 §11, §13 Q8); the name and dot stay. */
  readonly disabled: boolean;
  readonly onOpen: () => void;
}

export function WhatsNewControl({ unread, disabled, onOpen }: WhatsNewControlProps): ReactElement {
  return (
    <Button
      variant="quiet"
      data-whats-new-button
      aria-label={unread ? "What's new (unread)" : "What's new"}
      disabled={disabled}
      onClick={onOpen}
      className="relative"
    >
      New
      {unread ? (
        <span
          data-whats-new-unread
          aria-hidden="true"
          className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-v7-ink bg-v7-cta"
        />
      ) : null}
    </Button>
  );
}
