/**
 * Threat arrows, labels and hits-all marks — technical spec v7 §6.5 (one arrow and one label per
 * pending effect, never a sum; fan-out bursts; ends and colours; Mirror badges and the eligible
 * highlight; grid mode; the tapped seat), §11; Appendix A `incoming-pending`,
 * `table-subchoice-mirror`; L74-06.
 *
 * - **Visual only.** The layer is `aria-hidden` and press-through: a 44 px button per label would
 *   pile up over seats on a 360 px phone. The POV's incoming effects are buttons on the central
 *   plate, every seat's pending effects are buttons in its seat sheet (L74-05), so every public
 *   pending effect stays reachable (decisions.md 2026-10-28, designer answer Q3).
 * - **Labels.** One per drawn arrow that does not end at the plate (the plate badge is the
 *   incoming label): the card art, the listed damage for an attack, and the Mirror / Super Mirror
 *   name when redirected. Each amount stands alone (golden rule 1).
 * - **Static.** No draw-in or motion attributes: arrow motion is L78.
 * - **FX anchors.** Labels and hits-all badges carry `data-pending-id` for the resolution flash.
 */

import { formatCardLabel } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { artFor } from '../../ui/asset-lookup';
import { V7_COLORS } from '../../ui/palette';
import type { SeatLayout, Size } from '../../view-model/seat-layout';
import type { FanOutGroup, ThreatLabel, ThreatsModel } from '../../view-model/threats';
import { HITS_ALL_LABEL } from './threat-copy';
import {
  arrowStroke,
  fanOutMarks,
  MIRROR_ELIGIBLE_CLASS,
  THREAT_TONE_RING_CLASS,
  threatArrows,
  type ThreatArrow,
} from './threat-geometry';

export interface ThreatLayerProps {
  model: ThreatsModel;
  layout: SeatLayout;
  /** The measured arena box the layout was computed for. */
  arena: Size;
  povId: string;
  /** The seat whose sheet is open (`openSeatId`): its arrows light up, the rest dim. */
  tappedSeatId: string | null;
}

const CENTERED_CLASS = 'absolute -translate-x-1/2 -translate-y-1/2';
const CHIP_CLASS = 'inline-flex items-center gap-0.5 whitespace-nowrap rounded-v7-chrome-sm bg-v7-panel-2 px-1 py-0.5 text-v7-text';
/** The arrows and labels a tapped seat neither sends nor receives (§6.5). */
const DIMMED_OPACITY = 0.35;
const AMOUNT_CLASS = 'font-v7-display text-v7-caption leading-none tabular-nums';

function ArrowPaths({ arrow }: { arrow: ThreatArrow }): ReactElement {
  const { entry, geometry, highlighted } = arrow;
  const stroke = arrowStroke(entry);
  return (
    <g
      data-threat-arrow={entry.effectId}
      data-relation={entry.relation}
      data-source-player-id={entry.sourcePlayerId}
      data-target-player-id={entry.targetPlayerId}
      {...(highlighted !== null ? { 'data-highlighted': String(highlighted) } : {})}
      {...(entry.mirrorEligible ? { 'data-mirror-eligible': 'true' } : {})}
      opacity={highlighted === false ? DIMMED_OPACITY : 1}
    >
      <path
        d={geometry.d}
        fill="none"
        stroke={stroke}
        strokeWidth={highlighted === true || entry.mirrorEligible ? 4 : 2.5}
        strokeLinecap="round"
      />
      <path d={geometry.head} fill={stroke} />
    </g>
  );
}

function ArrowLabel({ arrow }: { arrow: ThreatArrow }): ReactElement {
  const { entry, geometry, highlighted } = arrow;
  return (
    <span
      data-threat-label=""
      data-pending-id={entry.effectId}
      data-tone={entry.tone}
      {...(entry.mirrorEligible ? { 'data-mirror-eligible': 'true' } : {})}
      style={{ left: geometry.label.x, top: geometry.label.y, ...(highlighted === false ? { opacity: DIMMED_OPACITY } : {}) }}
      className={[
        CENTERED_CLASS,
        CHIP_CLASS,
        'ring-2 ring-inset',
        THREAT_TONE_RING_CLASS[entry.tone],
        entry.mirrorEligible ? MIRROR_ELIGIBLE_CLASS : '',
      ]
        .filter((part) => part !== '')
        .join(' ')}
    >
      <img src={artFor(entry.cardId)} alt="" draggable={false} className="size-4 object-contain" />
      {entry.label.kind === 'damage' ? <span className={AMOUNT_CLASS}>{entry.label.amount}</span> : null}
      {entry.mirrorBadge !== null ? (
        <span data-mirror-badge={entry.mirrorBadge} className="text-v7-micro font-bold">
          {formatCardLabel(entry.mirrorBadge, false)}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The burst and badge ring: the source's colour, as its arrows would take (`--mine` for the POV,
 * the seat hue for another seat). Every group has a copy aimed at another seat, so one exists.
 */
function fanOutStroke(model: ThreatsModel, group: FanOutGroup): string {
  const member = model.entries.find((entry) => entry.fanOutKey === group.key && entry.relation !== 'incoming');
  return member === undefined ? V7_COLORS['threat-other'] : arrowStroke(member);
}

function MarkContent({ label }: { label: ThreatLabel }): ReactElement {
  return label.kind === 'damage' ? (
    <span className={AMOUNT_CLASS}>{label.amount}</span>
  ) : (
    <img src={artFor(label.cardId)} alt="" draggable={false} className="size-4 object-contain" />
  );
}

export function ThreatLayer({ model, layout, arena, povId, tappedSeatId }: ThreatLayerProps): ReactElement {
  const arrows = threatArrows({ model, layout, arena, povId, tappedSeatId });
  const marks = fanOutMarks({ model, layout, arena, povId });
  return (
    <div data-zone="threats" aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <svg className="absolute inset-0 overflow-visible" width={arena.width} height={arena.height}>
        {arrows.map((arrow) => (
          <ArrowPaths key={arrow.entry.effectId} arrow={arrow} />
        ))}
      </svg>
      {arrows
        .filter((arrow) => arrow.entry.relation !== 'incoming')
        .map((arrow) => (
          <ArrowLabel key={arrow.entry.effectId} arrow={arrow} />
        ))}
      {marks.map(({ group, burst, targets }) => {
        const borderColor = fanOutStroke(model, group);
        return [
          <span
            key={group.key}
            data-threat-burst={group.key}
            data-source-player-id={group.sourcePlayerId}
            style={{ left: burst.x, top: burst.y, borderColor }}
            className={`${CENTERED_CLASS} ${CHIP_CLASS} border-2 text-v7-caption font-bold`}
          >
            <img src={artFor(group.cardId)} alt="" draggable={false} className="size-4 object-contain" />
            {HITS_ALL_LABEL}
          </span>,
          ...targets.map((target) => (
            <span
              key={target.effectId}
              data-fan-out-target={target.playerId}
              data-pending-id={target.effectId}
              style={{ left: target.at.x, top: target.at.y, borderColor }}
              className={`${CENTERED_CLASS} ${CHIP_CLASS} border-2`}
            >
              <MarkContent label={target.label} />
            </span>
          )),
        ];
      })}
    </div>
  );
}
