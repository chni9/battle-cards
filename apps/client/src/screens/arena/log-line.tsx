/**
 * One action-log line's segments — technical spec v7 §6.9; Appendix A `table-action-log-entry-copy`,
 * `table-action-log-resource-nets`, `table-action-log-inspect`; L56-05, L63-06; L74-15.
 *
 * The segments come from `log(view)` (`view-model/log.ts`) unchanged, so fog stays on the server:
 * a concealed net reads `+?`, and an unnamed card is never an inspectable one. Nicknames take their
 * seat hue on `--panel` (`PlayerName`). A resource net keeps its sign and words in `--text` (§5.1
 * keeps resource and `--danger` colors off small text; decisions.md L74-15) and the resource icon
 * keeps its own color, so the direction rides on the sign and the spoken text, not on a color.
 */

import { formatCardLabel, type PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Icon } from '../../ui/icons/icon';
import { RESOURCE_ICON } from '../../ui/icons/icon-names';
import { CHROME_FOCUS_CLASS } from '../../ui/primitives/chrome-classes';
import { PlayerName } from '../../ui/seat/player-name';
import type { LogLine, LogSegment } from '../../view-model/log';
import type { CardSheetSource } from './card-sheet-source';
import { unreachable } from './unreachable';

export interface LogLineSegmentsProps {
  line: LogLine;
  /** Seat hues for the nicknames. */
  view: PlayingStateView;
  /** The sheet passes it: inspectable card names become buttons. The ticker omits it (it is one button). */
  onOpenCard?: (source: CardSheetSource) => void;
}

function segmentElement(
  segment: LogSegment,
  index: number,
  view: PlayingStateView,
  onOpenCard: LogLineSegmentsProps['onOpenCard'],
): ReactElement {
  const key = `${segment.type}-${String(index)}`;

  switch (segment.type) {
    case 'text':
      return <span key={key}>{segment.text}</span>;
    case 'player':
      return (
        <PlayerName
          key={key}
          nickname={segment.nickname}
          playerId={segment.playerId}
          view={view}
          possessive={segment.possessive === true}
        />
      );
    case 'damage':
      return (
        <span key={key} data-log-damage="" className="ml-0.5 inline-flex items-center gap-0.5 align-middle">
          <span className="sr-only">{`${String(segment.amount)} damage`}</span>
          <span aria-hidden="true" className="tabular-nums">
            {segment.amount}
          </span>
          <Icon name="life" size={14} />
        </span>
      );
    case 'resource':
      return (
        <span key={key} data-log-net={segment.kind} className="ml-1 inline-flex items-center gap-0.5 align-middle">
          <span className="sr-only">{segment.spoken}</span>
          <span aria-hidden="true" className="tabular-nums">
            {segment.label}
          </span>
          <Icon name={RESOURCE_ICON[segment.kind]} size={14} />
        </span>
      );
    case 'card': {
      const label = formatCardLabel(segment.cardId, segment.isUpgraded);

      return segment.inspectable && onOpenCard !== undefined ? (
        <button
          key={key}
          type="button"
          data-log-card=""
          onClick={() => {
            onOpenCard({ kind: 'log', cardId: segment.cardId, isUpgraded: segment.isUpgraded });
          }}
          className={`inline-flex min-h-11 items-center align-middle font-extrabold underline decoration-v7-text-2 underline-offset-2 ${CHROME_FOCUS_CLASS}`}
        >
          {label}
        </button>
      ) : (
        <span key={key}>{label}</span>
      );
    }
    default:
      return unreachable(segment);
  }
}

export function LogLineSegments({ line, view, onOpenCard }: LogLineSegmentsProps): ReactElement {
  return <>{line.segments.map((segment, index) => segmentElement(segment, index, view, onOpenCard))}</>;
}
