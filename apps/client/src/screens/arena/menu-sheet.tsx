/**
 * The top-bar menu sheet — technical spec v7 §6.1 and §6.9; L74-15 (extracted from `top-bar.tsx`,
 * plan Appendix A.9.4). Owner-local in `TopBar`: the bar renders it and nothing else does.
 *
 * Body order (§6.1): How to play, then Show coach (L75-04, only while the tutorial coach is hidden;
 * `icon="coach"`, distinct from How to play's `help`, Q45), the Action log entry (L74-15), the Table
 * rules entry (L74-22, only while the rules are known), then the game code line with Copy (`Code
 * copied` / `Copy failed`).
 * A menu entry closes the menu before it opens its own surface, so the two never stack.
 */

import type { PlayingStateView } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../ui/primitives/button';
import { Sheet } from '../../ui/primitives/sheet';
import { TABLE_RULES_LABEL } from '../../ui/ui-copy';
import { ACTION_LOG_OPEN_LABEL, HOW_TO_PLAY_ARIA_LABEL, OPEN_COACH_ARIA_LABEL } from '../../view-model/table-copy';
import {
  CODE_COPIED_LABEL,
  CODE_COPY_FAILED_LABEL,
  COPY_CODE_LABEL,
  gameCodeLine,
  MENU_LABEL,
} from './top-bar-model';

export interface MenuSheetProps {
  open: boolean;
  view: PlayingStateView;
  statusLabel: string;
  onClose: () => void;
  /** How to play; the entry closes the menu first. */
  onHowToPlay: () => void;
  /** L75-04: Show coach, reopening the hidden tutorial coach; absent → no entry (plan A.8.3). */
  onShowCoach?: () => void;
  /** L74-15: the Action log entry; absent → no entry. */
  onOpenLog?: () => void;
  /** L74-22: the Table rules entry; absent while the rules are unknown (spec v7 §6.11). */
  onOpenRules?: () => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

const COPY_STATUS_LABEL: Readonly<Record<Exclude<CopyState, 'idle'>, string>> = {
  copied: CODE_COPIED_LABEL,
  failed: CODE_COPY_FAILED_LABEL,
};

export function MenuSheet({
  open,
  view,
  statusLabel,
  onClose,
  onHowToPlay,
  onShowCoach,
  onOpenLog,
  onOpenRules,
}: MenuSheetProps): ReactElement {
  const [copy, setCopy] = useState<CopyState>('idle');
  const [wasOpen, setWasOpen] = useState(open);

  // A fresh opening starts with no copy status (the bar reset it on the Menu press). React's
  // "adjust state while rendering" pattern, as `ui/primitives/sheet.tsx` does; never an effect.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCopy('idle');
    }
  }

  const copyCode = (): void => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(view.gameCode);
        setCopy('copied');
      } catch {
        setCopy('failed');
      }
    })();
  };

  return (
    <Sheet
      open={open}
      mode="read-only"
      placement="bottom"
      title={MENU_LABEL}
      onClose={onClose}
      dataAttributes={{ 'data-arena-sheet': 'menu' }}
    >
      <div className="flex flex-col gap-3">
        <Button
          variant="quiet"
          icon="help"
          fullWidth
          onClick={() => {
            onClose();
            onHowToPlay();
          }}
        >
          {HOW_TO_PLAY_ARIA_LABEL}
        </Button>
        {onShowCoach !== undefined ? (
          <Button
            variant="quiet"
            icon="coach"
            fullWidth
            onClick={() => {
              onClose();
              onShowCoach();
            }}
          >
            {OPEN_COACH_ARIA_LABEL}
          </Button>
        ) : null}
        {onOpenLog !== undefined ? (
          <Button
            variant="quiet"
            icon="log"
            fullWidth
            onClick={() => {
              onClose();
              onOpenLog();
            }}
          >
            {ACTION_LOG_OPEN_LABEL}
          </Button>
        ) : null}
        {onOpenRules !== undefined ? (
          <Button
            variant="quiet"
            icon="rules"
            fullWidth
            onClick={() => {
              onClose();
              onOpenRules();
            }}
          >
            {TABLE_RULES_LABEL}
          </Button>
        ) : null}
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-v7-body text-v7-body text-v7-text">{gameCodeLine(view, statusLabel)}</p>
          <Button variant="quiet" icon="copy" onClick={copyCode}>
            {COPY_CODE_LABEL}
          </Button>
        </div>
        <p role="status" className="min-h-4 font-v7-body text-v7-caption font-bold text-v7-text-2">
          {copy === 'idle' ? null : COPY_STATUS_LABEL[copy]}
        </p>
      </div>
    </Sheet>
  );
}
