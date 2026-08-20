/**
 * How to play primer — technical spec v6 §5.1 / L42-01.
 * Screenshot `<img>` only when the designer file exists. Skip and Got it both close.
 */

import type { ReactElement } from 'react';

import { getResourceIconUrl, type ResourceKind } from '../design/asset-lookup';
import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import { HOW_TO_PLAY_SECTIONS } from './how-to-play-content';
import { howToPlayScreenshotUrl } from './how-to-play-screenshots';

export type HowToPlayCloseReason = 'skip' | 'got-it' | 'dismiss';

export interface HowToPlayDialogProps {
  open: boolean;
  onClose: (reason: HowToPlayCloseReason) => void;
}

const RESOURCE_GLYPHS: readonly { kind: ResourceKind; caption: string }[] = [
  { kind: 'life', caption: 'Lives' },
  { kind: 'point', caption: 'Points' },
  { kind: 'upgradePoint', caption: 'Upgrade points' },
  { kind: 'shield', caption: 'Shield' },
];

export function HowToPlayDialog({ open, onClose }: HowToPlayDialogProps): ReactElement {
  return (
    <Dialog
      open={open}
      title="How to play"
      onClose={() => {
        onClose('dismiss');
      }}
      closeOnOverlayClick
      panelClassName="max-w-2xl"
      actions={
        <>
          <Button
            type="button"
            variant="orange"
            onClick={() => {
              onClose('skip');
            }}
          >
            Skip
          </Button>
          <Button
            type="button"
            variant="green"
            onClick={() => {
              onClose('got-it');
            }}
          >
            Got it
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-muted">
        This is a short primer — not the full rules.
      </p>
      <ol className="mt-4 list-none space-y-5 p-0">
        {HOW_TO_PLAY_SECTIONS.map((section) => {
          const shot =
            section.screenshotFile === null
              ? null
              : howToPlayScreenshotUrl(section.screenshotFile);
          return (
            <li
              key={section.id}
              data-how-to-play-section={section.id}
              className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)] sm:items-start"
            >
              <div>
                <h3 className="text-sm font-semibold text-ink">{section.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{section.body}</p>
                {section.id === 'resources' ? <ResourceGlyphRow /> : null}
              </div>
              {shot !== null ? (
                <img
                  src={shot}
                  alt=""
                  className="w-full rounded-[length:var(--radius-card)] border border-border object-cover"
                  draggable={false}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </Dialog>
  );
}

function ResourceGlyphRow(): ReactElement {
  return (
    <ul className="mt-2 flex flex-wrap gap-3 p-0">
      {RESOURCE_GLYPHS.map((item) => (
        <li key={item.kind} className="inline-flex items-center gap-1.5 text-sm text-ink">
          <img
            src={getResourceIconUrl(item.kind)}
            alt=""
            width={20}
            height={20}
            className="size-5 shrink-0 object-contain"
            aria-hidden
          />
          <span>{item.caption}</span>
        </li>
      ))}
    </ul>
  );
}
