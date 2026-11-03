/**
 * Central plate — technical spec v7 §6.1 item 2 (the landing spot and the POV's incoming
 * effects), §6.5 (incoming arrows end at the plate badge; recurring chips; the Mirror eligible
 * highlight), §6.6.5 (every face opens its read-only sheet), §8.2; Appendix A `incoming-pending`,
 * `waiting-on-others-strip`, `table-action-log-inspect`; L74-06.
 *
 * - **Anchors.** The root keeps `data-zone="pending"` and `data-hint-anchor="incoming"` even when
 *   empty, and L74-12 measures it in the DOM, so it takes no `ref`. Badges carry
 *   `data-pending-id`, the resolution flash anchor.
 * - **Order.** The landing spot, the incoming badges in wire order, then the recurring chips. The
 *   root is bottom-anchored at `PLATE_BOX[mode]`, so extra rows grow up into the free space
 *   between the arc ends.
 * - **One badge per incoming effect.** Each shows its own listed damage or effect art, never a
 *   sum (golden rule 1), and opens the queue inspect. Nothing here sends an intent (§6.6.4): every
 *   control opens a read-only card sheet.
 * - **Drop highlight (L74-12, §6.6.3).** During a hand drag of an untargeted card, the root
 *   carries `data-drop="valid"` and a `--mine` ring, thicker and `data-drop="over"` under the
 *   pointer, as the seats do.
 * - **Recurring chips** show the catalog rate (`recurringAmountGlyph`), the owner for Poison and
 *   Imposition, and "Paused" / "Ending" in words; a live chip has no word (designer answer Q4).
 * - **Press-through** (Lot 74 Part 1 final review, Minor 3). The root is `pointer-events-none` and
 *   only the landing card, the badges and the chips take presses, so the plate's empty area never
 *   swallows a tap on a grid seat it overlaps. `measureDropZones` reads the root's rect, so the
 *   drop zone is unchanged.
 */

import { formatCardLabel, type PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { artFor } from '../../ui/asset-lookup';
import { Card } from '../../ui/card/card';
import { CostAmount } from '../../ui/card/cost-amount';
import { CHROME_FOCUS_CLASS } from '../../ui/primitives/chrome-classes';
import { PlayerName } from '../../ui/seat/player-name';
import type { RecurringChip } from '../../view-model/recurring-chips';
import { PLATE_BOX, plateCenterFor, type LayoutMode, type Size } from '../../view-model/seat-layout';
import { seatColorIndexOf } from '../../view-model/seats';
import { INCOMING_OPEN_LABEL } from '../../view-model/table-copy';
import { nicknameOf } from '../../view-model/table-helpers';
import type { ThreatEntry, ThreatsModel } from '../../view-model/threats';
import type { CardSheetSource } from './card-sheet-source';
import type { PlateDropHighlight } from './hand-drag';
import { lastPlayedCard, recurringAmountGlyph, recurringChipThumb } from './plate-model';
import { pendingEffectCopy, RECURRING_STATE_COPY } from './threat-copy';
import { MIRROR_ELIGIBLE_CLASS, THREAT_TONE_RING_CLASS } from './threat-geometry';

export interface CentralPlateProps {
  view: PlayingStateView;
  model: ThreatsModel;
  /** `SeatsModel.layout.mode`: picks `plateCenterFor` and `PLATE_BOX`. */
  mode: LayoutMode;
  arena: Size;
  onOpenCard: (source: CardSheetSource) => void;
  // No `ref`: L74-12 measures the `data-zone="pending"` root in the DOM (`measureDropZones`).
  /** L74-12: lit while an untargeted card is dragged; `over` under the pointer. */
  dropHighlight?: PlateDropHighlight | null;
}

const BADGE_CLASS = `pointer-events-auto inline-flex min-h-11 min-w-11 items-center gap-1 rounded-v7-chrome-sm bg-v7-panel-2 px-1.5 text-v7-text ring-2 ring-inset ${CHROME_FOCUS_CLASS}`;
/** The seats' drop rings (`opponent-seat.tsx`), rounded like the plate's landing frame. */
const DROP_RING_CLASS = {
  valid: 'rounded-v7-chrome-sm ring-2 ring-v7-mine',
  over: 'rounded-v7-chrome-sm ring-4 ring-v7-mine',
} as const;
const CHIP_CLASS = 'pointer-events-auto inline-flex min-h-11 items-center gap-1 rounded-v7-chrome-sm bg-v7-panel-2 px-1.5 text-v7-caption text-v7-text';

function IncomingBadge({
  entry,
  view,
  onOpenCard,
}: {
  entry: ThreatEntry;
  view: PlayingStateView;
  onOpenCard: (source: CardSheetSource) => void;
}): ReactElement {
  const copy = pendingEffectCopy(entry, (playerId) => nicknameOf(view, playerId));
  return (
    <li>
      <button
        type="button"
        data-pending-id={entry.effectId}
        data-tone={entry.tone}
        {...(entry.mirrorEligible ? { 'data-mirror-eligible': 'true' } : {})}
        aria-label={copy.ariaLabel}
        title={copy.title}
        onClick={() => {
          onOpenCard({ kind: 'queue', effectId: entry.effectId, cardId: entry.cardId, isUpgraded: entry.isUpgraded });
        }}
        className={[BADGE_CLASS, THREAT_TONE_RING_CLASS[entry.tone], entry.mirrorEligible ? MIRROR_ELIGIBLE_CLASS : '']
          .filter((part) => part !== '')
          .join(' ')}
      >
        <img src={artFor(entry.cardId)} alt="" draggable={false} className="size-5 shrink-0 object-contain" />
        {/* The Vital Rule: an incoming hit is read at 22 px (§5.2). */}
        {entry.label.kind === 'damage' ? (
          <span className="font-v7-display text-v7-vital leading-none tabular-nums">{entry.label.amount}</span>
        ) : null}
        {entry.mirrorBadge !== null ? (
          <span data-mirror-badge={entry.mirrorBadge} className="text-v7-micro font-bold">
            {formatCardLabel(entry.mirrorBadge, false)}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function RecurringChipView({
  chip,
  view,
  onOpenCard,
}: {
  chip: RecurringChip;
  view: PlayingStateView;
  onOpenCard: (source: CardSheetSource) => void;
}): ReactElement {
  const thumb = recurringChipThumb(view, chip);
  const glyph = recurringAmountGlyph(chip.amount);
  const attributes = {
    'data-recurring-chip': chip.effectId,
    'data-recurring-state': chip.state,
    'data-card-id': chip.cardId,
  };
  const content = (
    <>
      <img src={artFor(chip.cardId)} alt="" draggable={false} className="size-4 shrink-0 object-contain" />
      <span className="sr-only">{formatCardLabel(chip.cardId, chip.isUpgraded)}</span>
      {/* The POV's own Curse needs no owner. */}
      {chip.cardId === 'curse' ? null : (
        <PlayerName
          nickname={nicknameOf(view, chip.ownerPlayerId)}
          seatIndex={seatColorIndexOf(view, chip.ownerPlayerId)}
          className="text-v7-micro"
        />
      )}
      <CostAmount amount={glyph.amount} {...(glyph.signed !== undefined ? { signed: glyph.signed } : {})} title={null} />
      {chip.state === 'live' ? null : <span className="font-bold">{RECURRING_STATE_COPY[chip.state]}</span>}
    </>
  );
  return (
    <li>
      {thumb === null ? (
        <span {...attributes} className={CHIP_CLASS}>
          {content}
        </span>
      ) : (
        <button
          type="button"
          {...attributes}
          onClick={() => {
            onOpenCard({ kind: 'in-play', thumb });
          }}
          className={`${CHIP_CLASS} ${CHROME_FOCUS_CLASS}`}
        >
          {content}
        </button>
      )}
    </li>
  );
}

export function CentralPlate({ view, model, mode, arena, onOpenCard, dropHighlight }: CentralPlateProps): ReactElement {
  const center = plateCenterFor(mode, arena);
  const size = PLATE_BOX[mode];
  const landing = lastPlayedCard(view.actionLog);
  const incoming = model.entries.filter((entry) => entry.relation === 'incoming');
  const drop = dropHighlight ?? null;
  return (
    <section
      data-zone="pending"
      data-hint-anchor="incoming"
      {...(drop !== null ? { 'data-drop': drop } : {})}
      aria-label={INCOMING_OPEN_LABEL}
      style={{
        left: center.centerX - size.width / 2,
        width: size.width,
        bottom: arena.height - (center.centerY + size.height / 2),
        minHeight: size.height,
      }}
      className={`pointer-events-none absolute z-20 flex flex-col items-center justify-end gap-1 ${drop !== null ? DROP_RING_CLASS[drop] : ''}`}
    >
      <div
        data-plate-landing=""
        className="flex min-h-[74px] min-w-[52px] items-center justify-center rounded-v7-chrome-sm border-2 border-dashed border-v7-panel-2 p-0.5"
      >
        {landing === null ? null : (
          <Card
            size="thumb"
            instance={landing}
            className="pointer-events-auto"
            onActivate={() => {
              onOpenCard({ kind: 'log', cardId: landing.cardId, isUpgraded: landing.isUpgraded });
            }}
          />
        )}
      </div>
      {incoming.length > 0 ? (
        <ul data-plate-badges="" className="flex flex-wrap justify-center gap-1">
          {incoming.map((entry) => (
            <IncomingBadge key={entry.effectId} entry={entry} view={view} onOpenCard={onOpenCard} />
          ))}
        </ul>
      ) : null}
      {model.recurring.length > 0 ? (
        <ul data-plate-recurring="" className="flex flex-wrap justify-center gap-1">
          {model.recurring.map((chip) => (
            <RecurringChipView key={chip.effectId} chip={chip} view={view} onOpenCard={onOpenCard} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
