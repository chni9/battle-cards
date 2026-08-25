/**
 * Non-dismissible tutorial coach — technical spec v6 §5.4 / L45-05.
 * Not a Dialog: the table stays clickable. Skip uses the same leave-to-hub path as the flag.
 */

import { Fragment, type ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { SKIP_TUTORIAL_ACTION_LABEL } from './table-copy';

export interface TutorialCoachProps {
  index: number;
  title: string;
  body: string;
  onSkip: () => void;
}

export function TutorialCoach({
  index,
  title,
  body,
  onSkip,
}: TutorialCoachProps): ReactElement {
  return (
    <aside
      data-zone="tutorial-coach"
      data-tutorial-index={String(index)}
      className="px-2 py-1.5 sm:px-3 sm:py-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        <Button
          variant="red"
          className="min-h-11 min-w-0 shrink-0 px-3 py-2 text-xs"
          onClick={onSkip}
        >
          {SKIP_TUTORIAL_ACTION_LABEL}
        </Button>
      </div>
      <CoachBody text={body} />
    </aside>
  );
}

function CoachBody({ text }: { text: string }): ReactElement {
  const chunks = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <p className="mt-1 text-sm leading-snug text-ink">
      {chunks.map((chunk, index) => {
        const bold = /^\*\*([^*]+)\*\*$/.exec(chunk);
        const inner = bold?.[1];
        if (inner !== undefined) {
          return <strong key={`b-${String(index)}`}>{inner}</strong>;
        }

        return <Fragment key={`t-${String(index)}`}>{chunk}</Fragment>;
      })}
    </p>
  );
}
