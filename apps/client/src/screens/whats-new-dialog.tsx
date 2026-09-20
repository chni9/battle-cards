/**
 * Hub What’s new — L63-07. Catalog in shared; history is every entry, newest first.
 */

import { RELEASE_NOTES } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';

export interface WhatsNewDialogProps {
  open: boolean;
  onClose: () => void;
}

export function WhatsNewDialog({ open, onClose }: WhatsNewDialogProps): ReactElement {
  return (
    <Dialog
      open={open}
      title="What's new"
      onClose={onClose}
      closeOnOverlayClick
      panelClassName="max-w-2xl"
      actions={
        <Button compact type="button" variant="green" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <ol className="mt-1 list-none space-y-6 p-0">
        {RELEASE_NOTES.map((note, index) => (
          <li key={note.id} data-release-id={note.id}>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
              {note.date}
            </p>
            <h3 className="mt-1 text-base font-semibold text-ink">{note.title}</h3>
            {index === 0 ? (
              <p className="mt-1 text-xs font-medium text-ink-muted">Latest</p>
            ) : null}
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink">
              {note.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
