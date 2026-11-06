/**
 * Hub What's new: technical spec v7 §7.1, §7.7, §10.4, §5.4; L63-07, L65-05; L76-05.
 * `current` is the auto popup (the latest entry alone). `history` is the New button (every dated
 * entry, newest first, 'Latest' under the first title). A V7 `Dialog`, so Esc closes only the top
 * sheet (§6.7). Got it, Esc, the backdrop and a swipe-down each call `onClose` once per open
 * (`useOncePerOpen`), so Home's `closeWhatsNew` marks the latest id seen once.
 */

import {
  releaseNotesForScope,
  type CardId,
  type KitId,
  type ReleaseNoteAddition,
  type WhatsNewScope,
} from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../ui/card/card';
import { KitPortrait } from '../ui/kit/kit-portrait';
import { Button } from '../ui/primitives/button';
import { CHROME_FLAT_SM_CLASS } from '../ui/primitives/chrome-classes';
import { Dialog } from '../ui/primitives/dialog';
import { useOncePerOpen } from './use-once-per-open';

export interface WhatsNewDialogProps {
  open: boolean;
  onClose: () => void;
  /** `current` is the auto popup. `history` is the hub New button. */
  scope: WhatsNewScope;
}

function additionKey(noteId: string, item: ReleaseNoteAddition): string {
  return item.kind === 'kit'
    ? `${noteId}-kit-${item.kitId}`
    : `${noteId}-card-${item.cardId}`;
}

/** The kit portrait for a `kitId` (it wins when both are set), else the base-art card thumb, else nothing. */
function ReleaseArt({
  kitId,
  cardId,
  instanceId,
}: {
  readonly kitId: KitId | undefined;
  readonly cardId: CardId | undefined;
  readonly instanceId: string;
}): ReactElement | null {
  if (kitId !== undefined) return <KitPortrait kitId={kitId} size="thumb" />;
  if (cardId !== undefined) {
    return <Card size="thumb" instance={{ instanceId, cardId, isUpgraded: false }} />;
  }
  return null;
}

export function WhatsNewDialog({
  open,
  onClose,
  scope,
}: WhatsNewDialogProps): ReactElement {
  const once = useOncePerOpen(open);
  const close = (): void => {
    once(onClose);
  };
  const notes = releaseNotesForScope(scope);

  return (
    <Dialog
      open={open}
      title="What's new"
      width="2xl"
      onClose={close}
      dataAttributes={{ 'data-home-sheet': 'whats-new' }}
      actions={
        <Button variant="primary" onClick={close}>
          Got it
        </Button>
      }
    >
      <ol data-whats-new-scope={scope} className="flex list-none flex-col gap-6 p-0">
        {notes.map((note, index) => (
          <li key={note.id} data-release-id={note.id}>
            <p className="font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.14em] text-v7-text-2">
              {note.date}
            </p>
            <h3 className="mt-1 font-v7-display text-v7-title leading-tight text-v7-text">{note.title}</h3>
            {scope === 'history' && index === 0 ? (
              <p
                data-whats-new-latest
                className={`mt-1 inline-flex bg-v7-cta px-2 font-v7-body text-v7-caption font-extrabold text-v7-text-on-cta ${CHROME_FLAT_SM_CLASS}`}
              >
                Latest
              </p>
            ) : null}
            {note.items.length > 0 ? (
              <ul className="mt-3 flex list-none flex-col gap-3 p-0">
                {note.items.map((item, itemIndex) => (
                  <li
                    key={`${note.id}-${String(itemIndex)}`}
                    data-whats-new-item
                    className="flex items-start gap-3"
                  >
                    <ReleaseArt
                      kitId={item.kitId}
                      cardId={item.cardId}
                      instanceId={`whats-new-${note.id}-${String(itemIndex)}`}
                    />
                    <div className="min-w-0 space-y-1 font-v7-body text-v7-body text-v7-text">
                      <p>
                        <span className="font-extrabold text-v7-text-2">Before. </span>
                        {item.before}
                      </p>
                      <p>
                        <span className="font-extrabold">After. </span>
                        {item.after}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {note.additions.length > 0 ? (
              <section data-whats-new-section="new" className="mt-4">
                <h4 className="font-v7-display text-v7-body text-v7-text">New</h4>
                <ul className="mt-3 flex list-none flex-col gap-3 p-0">
                  {note.additions.map((addition) => (
                    <li
                      key={additionKey(note.id, addition)}
                      data-whats-new-addition
                      className="flex items-start gap-3"
                    >
                      <ReleaseArt
                        kitId={addition.kind === 'kit' ? addition.kitId : undefined}
                        cardId={addition.kind === 'card' ? addition.cardId : undefined}
                        instanceId={additionKey(note.id, addition)}
                      />
                      <p className="min-w-0 font-v7-body text-v7-body text-v7-text">{addition.body}</p>
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
