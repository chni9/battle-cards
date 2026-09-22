/**
 * Hub What’s new — L63-07. Catalog in shared; history is every entry, newest first.
 */

import { RELEASE_NOTES, type ReleaseNoteAddition } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Button } from '../design/components/button';
import { Card } from '../design/components/card';
import { Dialog } from '../design/components/dialog';
import { KitPortrait } from '../design/components/kit-portrait';

export interface WhatsNewDialogProps {
  open: boolean;
  onClose: () => void;
}

function additionKey(noteId: string, item: ReleaseNoteAddition): string {
  return item.kind === 'kit'
    ? `${noteId}-kit-${item.kitId}`
    : `${noteId}-card-${item.cardId}`;
}

function AdditionArt({ item }: { readonly item: ReleaseNoteAddition }): ReactElement {
  if (item.kind === 'kit') {
    return <KitPortrait kitId={item.kitId} className="w-14 shrink-0 sm:w-16" />;
  }

  return (
    <Card
      instance={{
        instanceId: `whats-new-${item.cardId}`,
        cardId: item.cardId,
        isUpgraded: false,
      }}
      detail="thumb"
      className="w-14 shrink-0 !p-0.5 sm:w-16"
    />
  );
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
            {note.items.length > 0 ? (
              <ul className="mt-3 list-none space-y-4 p-0">
                {note.items.map((item, itemIndex) => (
                  <li
                    key={`${note.id}-${item.cardId ?? item.kitId ?? 'item'}-${String(itemIndex)}`}
                    className="flex items-start gap-3"
                  >
                    {item.kitId !== undefined ? (
                      <KitPortrait kitId={item.kitId} className="w-14 shrink-0 sm:w-16" />
                    ) : item.cardId !== undefined ? (
                      <Card
                        instance={{
                          instanceId: `whats-new-${note.id}-${item.cardId}`,
                          cardId: item.cardId,
                          isUpgraded: false,
                        }}
                        detail="thumb"
                        className="w-14 shrink-0 !p-0.5 sm:w-16"
                      />
                    ) : null}
                    <div className="min-w-0 space-y-1.5 text-sm leading-relaxed text-ink">
                      <p>
                        <span className="font-semibold text-ink-muted">Before. </span>
                        {item.before}
                      </p>
                      <p>
                        <span className="font-semibold text-ink">After. </span>
                        {item.after}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {note.additions.length > 0 ? (
              <section className="mt-3" data-whats-new-section="new">
                <h4 className="text-sm font-semibold text-ink">New</h4>
                <ul className="mt-3 list-none space-y-4 p-0">
                  {note.additions.map((item) => (
                    <li
                      key={additionKey(note.id, item)}
                      className="flex items-start gap-3"
                    >
                      <AdditionArt item={item} />
                      <p className="min-w-0 text-sm leading-relaxed text-ink">{item.body}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
