/**
 * Seat sheet — technical spec v7 §6.3 (what the POV may see of a seat), §6.5 (a tapped seat:
 * kit if visible, statuses, pending effects, Spy hand), §6.6.5 (a thumb opens its read-only
 * sheet on tap or long-press), §11 (Q46: the kit shows only for Spy+, a death reveal or the
 * spectator overlay); Appendix A `opponent-reveal-dialog`, `opponent-seat`,
 * `kit-inspect-dialog`; Lot 74 plan A.8 rulings 1 and 9; L74-05.
 *
 * It is the one place the seat's words are readable in full: the bot difficulty and the
 * connection state (designer answer Q1), every status badge past the two the seat shows, the
 * four resources, the seat's public pending effects, the cards it has in play, and under Spy+ or
 * a death reveal its hand and specials.
 *
 * - **No hidden information (§6.3).** Every value comes from the `SeatModel` and the view the
 *   server sent this recipient: a hidden value reads `unknown`, a hidden kit is the initial disc
 *   with no control, and the sheet never re-derives a tier.
 * - **Read-only (§6.6.4).** Opening the sheet, a thumb or the kit sends nothing: the callbacks
 *   open other read-only sheets and the sheet has no action row.
 * - **Pending effects** read from `seatThreatIds`: incoming first, then outgoing, each effect
 *   once (a self-queued Suicide counts as incoming, ruling A.8.9). Each effect keeps its own
 *   label and route; there is never a total (golden rule 1). No `data-pending-id` here: that FX
 *   anchor belongs to the arena (L74-06).
 */

import { formatCardLabel, getKit, type CardInstance, type KitId, type PlayingStateView } from '@card-battle/shared';
import type { ReactElement, ReactNode } from 'react';

import { artFor } from '../../ui/asset-lookup';
import { Card } from '../../ui/card/card';
import { cardCounterLabel, type CardCounter } from '../../ui/card/card-face';
import { Icon } from '../../ui/icons/icon';
import { RESOURCE_ICON } from '../../ui/icons/icon-names';
import { KitPortrait } from '../../ui/kit/kit-portrait';
import { useLongPress } from '../../ui/motion/use-long-press';
import { Avatar } from '../../ui/primitives/avatar';
import { Badge } from '../../ui/primitives/badge';
import { CHROME_FOCUS_CLASS } from '../../ui/primitives/chrome-classes';
import { Pill } from '../../ui/primitives/pill';
import { Sheet } from '../../ui/primitives/sheet';
import { RESOURCE_CAPTIONS } from '../../ui/resource-captions';
import { BotSeatLabel } from '../../ui/seat/bot-seat-label';
import { ConnectionBadge } from '../../ui/seat/connection-badge';
import { PlayerName } from '../../ui/seat/player-name';
import { inPlayThumbs, type InPlayThumb } from '../../view-model/card-actions';
import type { SeatModel } from '../../view-model/seats';
import { nicknameOf } from '../../view-model/table-helpers';
import { seatThreatIds, type ThreatEntry, type ThreatsModel } from '../../view-model/threats';
import { arenaSheetKey } from './arena-sheets';
import type { CardSheetSource } from './card-sheet-source';
import { seatBadgeView } from './seat-badges';
import { pendingEffectCopy } from './threat-copy';

export interface SeatSheetProps {
  /** False while the sheet plays its exit from `closing` (arena-sheets.ts, Appendix A.5). */
  open: boolean;
  seat: SeatModel;
  view: PlayingStateView;
  threatModel: ThreatsModel;
  onClose: () => void;
  onOpenKit: (kitId: KitId) => void;
  onOpenCard: (source: CardSheetSource) => void;
}

/** The V2 words: `OpponentRevealDialog` ('Resources', 'Hand', 'Specials'), `PendingQueue` ('Pending effects', 'None'), the V2 thumbs ('Active cards'). */
const RESOURCES_HEADING = 'Resources';
const PENDING_HEADING = 'Pending effects';
const IN_PLAY_HEADING = 'Active cards';
const HAND_HEADING = 'Hand';
const SPECIALS_HEADING = 'Specials';
const NO_PENDING_LABEL = 'None';
const EMPTY_HAND_LABEL = 'Empty';
/** New (plan Appendix B, §10.6). */
const STATUSES_HEADING = 'Statuses';

const HEADING_CLASS = 'text-v7-caption font-v7-body font-extrabold text-v7-text-2';
const THUMB_LIST_CLASS = 'flex flex-wrap items-start gap-x-3 gap-y-4';

function Section({ name, heading, children }: { name: string; heading?: string; children: ReactNode }): ReactElement {
  return (
    <section data-seat-sheet-section={name} className="flex flex-col gap-1.5">
      {heading !== undefined ? <h3 className={HEADING_CLASS}>{heading}</h3> : null}
      {children}
    </section>
  );
}

interface SheetThumbProps {
  source: CardSheetSource;
  instance: CardInstance;
  counter?: CardCounter;
  onOpenCard: (source: CardSheetSource) => void;
}

/**
 * A 44 px face that opens its read-only card sheet on a tap, Enter or a 450 ms press (§6.6.5).
 * The hook's `onClickCapture` swallows the click that ends a long press, so one press opens one
 * sheet; opening a sheet that is already open only moves it to the top anyway (A.5).
 */
function SheetThumb({ source, instance, counter, onOpenCard }: SheetThumbProps): ReactElement {
  const longPress = useLongPress({
    onLongPress: () => {
      onOpenCard(source);
    },
  });
  return (
    <span {...longPress} className="inline-flex">
      <Card
        size="thumb"
        instance={instance}
        {...(counter !== undefined ? { counter } : {})}
        onActivate={() => {
          onOpenCard(source);
        }}
      />
    </span>
  );
}

/** Card lives and Invisibility turns ride on the card; Shield and a Sentence never do (ruling A.8.1). */
function counterOf(thumb: InPlayThumb): CardCounter | undefined {
  const { badge } = thumb;
  if (badge === null || badge.kind === 'sentence-turns') {
    return undefined;
  }
  return { kind: badge.kind, amount: badge.value };
}

function PendingRow({
  entry,
  view,
  onOpenCard,
}: {
  entry: ThreatEntry;
  view: PlayingStateView;
  onOpenCard: (source: CardSheetSource) => void;
}): ReactElement {
  const copy = pendingEffectCopy(entry, (playerId) => nicknameOf(view, playerId));
  const source = { kind: 'queue', effectId: entry.effectId, cardId: entry.cardId, isUpgraded: entry.isUpgraded } as const;
  return (
    <li>
      <button
        type="button"
        data-seat-sheet-pending={entry.effectId}
        aria-label={copy.ariaLabel}
        title={copy.title}
        onClick={() => {
          onOpenCard(source);
        }}
        className={`flex min-h-11 w-full items-center gap-2 text-left text-v7-caption text-v7-text ${CHROME_FOCUS_CLASS}`}
      >
        <img src={artFor(entry.cardId)} alt="" draggable={false} className="size-5 shrink-0 object-contain" />
        <span className="font-v7-body font-extrabold">{copy.label}</span>
        {entry.label.kind === 'damage' ? (
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <Icon name="life" size={12} />
            <span className="font-v7-display">{String(entry.label.amount)}</span>
          </span>
        ) : null}
        <span className="min-w-0 truncate">
          <PlayerName nickname={nicknameOf(view, entry.sourcePlayerId)} playerId={entry.sourcePlayerId} view={view} />
          <span className="text-v7-text-2">{' → '}</span>
          <PlayerName nickname={nicknameOf(view, entry.targetPlayerId)} playerId={entry.targetPlayerId} view={view} />
        </span>
        {entry.mirrorBadge !== null ? (
          <span className="shrink-0 text-v7-text-2">{formatCardLabel(entry.mirrorBadge, false)}</span>
        ) : null}
      </button>
    </li>
  );
}

export function SeatSheet({ open, seat, view, threatModel, onClose, onOpenKit, onOpenCard }: SeatSheetProps): ReactElement {
  const player = view.players.find((entry) => entry.id === seat.playerId);
  const title = seat.isEliminated ? `${seat.nickname} (eliminated)` : seat.nickname;

  // The kit the POV may see (Q46): the model's avatar says it, the sheet never re-derives it.
  const kitId = seat.avatar.kind === 'kit' ? seat.avatar.kitId : null;

  const { incoming, outgoing } = seatThreatIds(threatModel, seat.playerId);
  const pendingIds = [...incoming, ...outgoing.filter((effectId) => !incoming.includes(effectId))];
  const pending = pendingIds.flatMap((effectId) => {
    const entry = threatModel.entries.find((candidate) => candidate.effectId === effectId);
    return entry === undefined ? [] : [entry];
  });

  const thumbs = inPlayThumbs(view, seat.playerId);
  const { reveal } = seat;

  return (
    <Sheet
      open={open}
      mode="read-only"
      placement="bottom"
      title={title}
      onClose={onClose}
      dataAttributes={{ 'data-arena-sheet': arenaSheetKey({ kind: 'seat', playerId: seat.playerId }) }}
    >
      <div className="flex flex-col gap-4 pt-2 pb-3">
        <Section name="identity">
          <div className="flex items-center gap-3">
            {kitId !== null ? (
              <KitPortrait
                kitId={kitId}
                size="tile"
                isEliminated={seat.isEliminated}
                onClick={() => {
                  onOpenKit(kitId);
                }}
              />
            ) : (
              <Avatar name={seat.nickname} seatIndex={seat.seatColorIndex} size="md" />
            )}
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              {kitId !== null ? <p className="font-v7-display text-v7-body text-v7-text">{getKit(kitId).name}</p> : null}
              {seat.botDifficulty !== null || (seat.connectionLabel !== null && player !== undefined) ? (
                <div className="flex flex-wrap items-center gap-1">
                  {seat.botDifficulty !== null ? <BotSeatLabel difficulty={seat.botDifficulty} /> : null}
                  {seat.connectionLabel !== null && player !== undefined ? <ConnectionBadge player={player} /> : null}
                </div>
              ) : null}
            </div>
          </div>
        </Section>

        <Section name="resources" heading={RESOURCES_HEADING}>
          <ul className="flex flex-wrap gap-2">
            {seat.resources.map(({ kind, value }) => (
              <li key={kind}>
                <Pill
                  size="sm"
                  icon={RESOURCE_ICON[kind]}
                  label={RESOURCE_CAPTIONS[kind]}
                  value={value === '?' ? 'unknown' : value}
                  resourceKind={kind}
                />
              </li>
            ))}
          </ul>
        </Section>

        {seat.badges.length > 0 ? (
          <Section name="statuses" heading={STATUSES_HEADING}>
            <ul className="flex flex-wrap gap-2">
              {seat.badges.map((badge, index) => {
                const badgeView = seatBadgeView(badge);
                return (
                  // Kinds repeat (two persistents), and the model order is stable for a render.
                  <li key={`${badge.kind}-${String(index)}`}>
                    <Badge icon={badgeView.icon} label={badgeView.label} />
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}

        <Section name="pending" heading={PENDING_HEADING}>
          {pending.length === 0 ? (
            <p className="text-v7-body text-v7-text-2">{NO_PENDING_LABEL}</p>
          ) : (
            <ul className="flex flex-col">
              {pending.map((entry) => (
                <PendingRow key={entry.effectId} entry={entry} view={view} onOpenCard={onOpenCard} />
              ))}
            </ul>
          )}
        </Section>

        {thumbs.length > 0 ? (
          <Section name="in-play" heading={IN_PLAY_HEADING}>
            <ul className={THUMB_LIST_CLASS}>
              {thumbs.map((thumb) => {
                const counter = counterOf(thumb);
                return (
                  <li key={thumb.instance.instanceId} className="flex flex-col items-center gap-1 pb-2">
                    <SheetThumb
                      source={{ kind: 'in-play', thumb }}
                      instance={thumb.instance}
                      {...(counter !== undefined ? { counter } : {})}
                      onOpenCard={onOpenCard}
                    />
                    {thumb.badge?.kind === 'sentence-turns' ? (
                      <span className="text-v7-caption text-v7-text-2">
                        {cardCounterLabel({ kind: 'turns', amount: thumb.badge.value })}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Section>
        ) : null}

        {reveal !== null ? (
          <Section name="hand" heading={HAND_HEADING}>
            {reveal.hand.length === 0 ? (
              <p className="text-v7-body text-v7-text-2">{EMPTY_HAND_LABEL}</p>
            ) : (
              <ul className={THUMB_LIST_CLASS}>
                {reveal.hand.map((instance) => (
                  <li key={instance.instanceId}>
                    <SheetThumb
                      source={{ kind: 'spy-reveal', instance, ownerPlayerId: seat.playerId }}
                      instance={instance}
                      onOpenCard={onOpenCard}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ) : null}

        {reveal !== null && reveal.specialCards.length > 0 ? (
          <Section name="specials" heading={SPECIALS_HEADING}>
            <ul className={THUMB_LIST_CLASS}>
              {reveal.specialCards.map((instance) => (
                <li key={instance.instanceId}>
                  <SheetThumb
                    source={{ kind: 'spy-reveal', instance, ownerPlayerId: seat.playerId }}
                    instance={instance}
                    onOpenCard={onOpenCard}
                  />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </Sheet>
  );
}
