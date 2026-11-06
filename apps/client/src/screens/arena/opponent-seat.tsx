/**
 * One opponent seat — technical spec v7 §6.2 (anatomy), §6.3 (visibility tiers), §6.4 (the seat
 * box), §11 (portrait names; Q36, Q47, Q66); Appendix A `opponent-seat`; L74-04 and
 * decisions.md 2026-10-28 "V7 opponent seat anatomy in the 76×92 box".
 *
 * - **One control.** A stretched `<button>` named by the full nickname covers the seat; the
 *   anatomy is a non-interactive sibling it points to with `aria-describedby`, so no control
 *   nests inside another (frontend.md › Kit, Nesting). The visible name truncates, while the
 *   accessible name keeps all 24 characters (plan Review Focus 5); the visible name is
 *   `aria-hidden`, so the description does not repeat it.
 * - **Words in the title (designer answer Q1).** The anatomy takes no pointer, so the one
 *   tooltip a pointer can reach is the button's: the full nickname, then the connection label
 *   and the bot words, joined with ` · `. The bot and connection icons speak the same words to
 *   screen readers; the seat sheet (L74-05) prints them. Every word is public.
 * - **Rows** (14 + 53 + 16 px inside the 3 px outline): the name in its seat hue with the
 *   connection and bot icons; the kit thumb or the initial disc beside the lives pill and the
 *   points / upgrade points / shield column; at most two status badges and "+n".
 * - **Per mode (L75-02, spec v7 §6.4, §14.3; plan A.4.3).** The root is `seatRect(center, mode)`
 *   (`SEAT_BOX[mode]`) and carries `data-seat-size={mode}`. Portrait and landscape-compact keep the
 *   anatomy above. Desktop draws 18 + 96 + 16 px inside the 120×136 box: a body-size name, a tile kit
 *   portrait (72×96) or a `md` disc, and a 40 px resource column. `SEAT_ANATOMY` holds each mode's
 *   size classes whole, so Tailwind sees them.
 * - **No hidden information (§6.3).** Every value comes from the `SeatModel`: a hidden value
 *   prints `?` and speaks "unknown", a hidden kit shows the initial disc, and the seat never
 *   re-derives a tier.
 * - **Anchors:** `data-zone="opponent-seat"`, `data-player-id`, `data-seat`, `data-seat-index`,
 *   `data-tier`, `data-eliminated`, `data-active-seat`, `data-tapped-seat`,
 *   `data-hint-anchor="hidden-kit"` (unspied and base-Spied, Q66), `data-zone="opponent-portrait"`
 *   and `data-spy-eye` on the eye badge. Values keep `data-resource-kind` for the L74-17 FX: each
 *   flashes and floats a public chip amount (`useResourceFlash`, by player id), `?` included.
 * - **Targeting (L74-10, §6.6.5).** With `target`, the button carries `data-target-seat`. A valid
 *   seat is named "{nickname}, target", its tap is the target tap, and it wears a `--mine` ring
 *   (the POV's own outgoing effect, §5.1) that pulses at full motion. Any other seat is
 *   `aria-disabled`, inert and dimmed, and keeps its usual name. Validity comes from the model.
 * - **Drop highlight (L74-12, §6.6.3).** During a hand drag, a seat that takes the card carries
 *   `data-drop="valid"` and a `--mine` ring, thicker and `data-drop="over"` under the pointer.
 *   `measureDropZones` reads this root's rect by `data-zone` and `data-player-id`.
 * - **Tutorial (L75-04, plan A.8.6, K7).** `tutorialHighlight` puts `data-tutorial-highlight` on the
 *   root (`opponent`, the board tour) or on the `opponent-portrait` div (`opponent-portrait`, Look).
 */

import { useId, type CSSProperties, type ReactElement } from 'react';

import { useResourceFlash } from '../../fx/use-resource-flash';
import { KitPortrait } from '../../ui/kit/kit-portrait';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { Icon } from '../../ui/icons/icon';
import { RESOURCE_ICON } from '../../ui/icons/icon-names';
import { v7SeatColor } from '../../ui/palette';
import { Avatar } from '../../ui/primitives/avatar';
import { CHROME_FOCUS_CLASS, CHROME_SHAPE_SM_CLASS, motionAttribute } from '../../ui/primitives/chrome-classes';
import { RESOURCE_CAPTIONS } from '../../ui/resource-captions';
import { BotSeatLabel } from '../../ui/seat/bot-seat-label';
import { botSeatLabelText } from '../../ui/seat/bot-seat-label-text';
import { PlayerName } from '../../ui/seat/player-name';
import type { LayoutMode, SeatPlacement } from '../../view-model/seat-layout';
import { SEAT_VISIBLE_BADGE_COUNT, type SeatModel, type SeatResource } from '../../view-model/seats';
import { ResourceFlashCue } from './resource-flash';
import { SEAT_MORE_STATUSES_LABEL, seatBadgeView } from './seat-badges';
import { seatRect } from './seat-geometry';
import { targetSeatLabel, type SeatTarget } from './targeting-model';

export interface OpponentSeatProps {
  model: SeatModel;
  /** The seat centre in arena pixels (`seatCenters`). */
  center: SeatPlacement;
  /** This seat's sheet is open (L74-05): a `--cta` ring; L74-06 lights its arrows. */
  tapped: boolean;
  onOpen: (playerId: string) => void;
  /** L74-10: set while a card is targeted; the seat's tap then targets (or does nothing). */
  target?: SeatTarget;
  /** L74-12: set during a hand drag when this seat takes the card; `over` under the pointer. */
  drop?: 'valid' | 'over';
  /** L75-02: the layout mode, which sizes the box and the anatomy. Default 'portrait'. */
  mode?: LayoutMode;
  /** L75-04: the tutorial mark, fed by `ArenaSeatsProps.tutorial` (private to the arena, K7). */
  tutorialHighlight?: 'opponent' | 'opponent-portrait';
}

const ROOT_CLASS = `pointer-events-auto absolute flex flex-col bg-v7-panel text-v7-text select-none [-webkit-touch-callout:none] ${CHROME_SHAPE_SM_CLASS}`;

/** The size literals of one mode's seat anatomy (L75-02). */
interface SeatAnatomy {
  readonly nameClass: string;
  readonly portraitClass: string;
  readonly kitSize: 'thumb' | 'tile';
  readonly avatarSize: 'sm' | 'md';
  readonly resourcesClass: string;
  readonly livesPillClass: string;
  readonly livesIconSize: number;
  readonly livesTextClass: string;
  readonly rowClass: string;
  readonly rowIconSize: number;
  readonly rowTextClass: string;
}

/** decisions.md 2026-10-28 "V7 opponent seat anatomy in the 76×92 box": unchanged since L74-04. */
const PHONE_ANATOMY: SeatAnatomy = {
  nameClass: 'text-v7-caption leading-[14px]',
  portraitClass: 'h-[53px] w-10',
  kitSize: 'thumb',
  avatarSize: 'sm',
  resourcesClass: 'w-7',
  livesPillClass: 'flex h-4 items-center gap-0.5 rounded-v7-chrome-sm bg-v7-panel-2 px-0.5 ring-2 ring-v7-life ring-inset',
  livesIconSize: 12,
  livesTextClass: 'text-v7-caption',
  rowClass: 'flex h-3 items-center gap-0.5 px-0.5',
  rowIconSize: 10,
  rowTextClass: 'text-v7-micro',
};

/** Spec v7 §14.3 starting values (L75-02): 114×130 inside the 3 px outline of the 120×136 box. */
const DESKTOP_ANATOMY: SeatAnatomy = {
  nameClass: 'text-v7-body leading-[18px]',
  portraitClass: 'h-24 w-18',
  kitSize: 'tile',
  avatarSize: 'md',
  resourcesClass: 'w-10',
  livesPillClass: 'flex h-5 items-center gap-0.5 rounded-v7-chrome-sm bg-v7-panel-2 px-0.5 ring-2 ring-v7-life ring-inset',
  livesIconSize: 14,
  livesTextClass: 'text-v7-body',
  rowClass: 'flex h-4 items-center gap-0.5 px-0.5',
  rowIconSize: 12,
  rowTextClass: 'text-v7-caption',
};

const SEAT_ANATOMY: Readonly<Record<LayoutMode, SeatAnatomy>> = {
  portrait: PHONE_ANATOMY,
  'landscape-compact': PHONE_ANATOMY,
  desktop: DESKTOP_ANATOMY,
};
const BADGE_CHIP_CLASS = 'flex items-center gap-px rounded-v7-chrome-sm bg-v7-panel-2 p-px';
/** Between the nickname, the connection label and the bot words in the seat's `title`. */
const SEAT_TITLE_SEPARATOR = ' · ';
/** The drop ring on the root: the POV's own outgoing effect color (§5.1), thicker under the pointer. */
const DROP_RING_CLASS = { valid: 'ring-2 ring-v7-mine', over: 'ring-4 ring-v7-mine' } as const;

/** L74-17 (§6.12): a seat value flashes its public chip amount, also on a hidden `?`, and never flies. */
function ResourceValue({
  resource,
  playerId,
  anatomy,
}: {
  resource: SeatResource;
  playerId: string;
  anatomy: SeatAnatomy;
}): ReactElement {
  const { kind, value } = resource;
  const caption = RESOURCE_CAPTIONS[kind];
  const hidden = value === '?';
  const isLife = kind === 'life';
  const flash = useResourceFlash({ kind, value: value === '?' ? 'unknown' : value, playerId });
  return (
    <li
      data-resource-kind={kind}
      {...(flash.tone !== null ? { 'data-resource-flash': flash.tone } : {})}
      title={hidden ? `${caption} unknown` : caption}
      className={`relative ${isLife ? anatomy.livesPillClass : anatomy.rowClass}`}
    >
      <Icon name={RESOURCE_ICON[kind]} size={isLife ? anatomy.livesIconSize : anatomy.rowIconSize} className="shrink-0" />
      <span aria-hidden="true" className={`font-v7-display ${isLife ? anatomy.livesTextClass : anatomy.rowTextClass}`}>
        {hidden ? '?' : String(value)}
      </span>
      <span className="sr-only">{`${caption} ${hidden ? 'unknown' : String(value)}`}</span>
      <ResourceFlashCue flash={flash} />
    </li>
  );
}

/** The stretched control's name and tap: the seat sheet, or a target while targeting. */
function seatControl(
  target: SeatTarget | undefined,
  nickname: string,
  onOpen: () => void,
): { readonly label: string; readonly onClick: () => void } {
  switch (target?.kind) {
    case undefined:
      return { label: nickname, onClick: onOpen };
    case 'valid':
      return { label: targetSeatLabel(nickname), onClick: target.onTarget };
    case 'invalid':
      // Inert: an invalid seat neither targets nor opens its sheet while targeting.
      return { label: nickname, onClick: () => undefined };
  }
}

export function OpponentSeat({
  model,
  center,
  tapped,
  onOpen,
  target,
  drop,
  mode = 'portrait',
  tutorialHighlight,
}: OpponentSeatProps): ReactElement {
  const detailsId = useId();
  const reduced = usePrefersReducedMotion();
  const control = seatControl(target, model.nickname, () => {
    onOpen(model.playerId);
  });
  const validTarget = target?.kind === 'valid';
  // The ring sits on the stretched button; the dim on the root, because the button is transparent.
  const targetClass = validTarget ? ['ring-4 ring-v7-mine', reduced ? '' : 'animate-pulse'] : [];
  const rect = seatRect(center, mode);
  const anatomy = SEAT_ANATOMY[mode];
  const botWords = model.botDifficulty !== null ? botSeatLabelText(model.botDifficulty) : null;
  const seatTitle = [model.nickname, model.connectionLabel, botWords]
    .filter((words): words is string => words !== null)
    .join(SEAT_TITLE_SEPARATOR);
  const style: CSSProperties = {
    left: `${String(rect.left)}px`,
    top: `${String(rect.top)}px`,
    width: `${String(rect.width)}px`,
    height: `${String(rect.height)}px`,
    ...(model.isActive
      ? { outline: `3px solid ${v7SeatColor(model.seatColorIndex)}`, outlineOffset: 2 }
      : {}),
  };
  const className = [
    ROOT_CLASS,
    model.isEliminated ? 'border-dashed' : '',
    tapped ? 'ring-3 ring-v7-cta' : '',
    target?.kind === 'invalid' ? 'opacity-50' : '',
    drop !== undefined ? DROP_RING_CLASS[drop] : '',
  ]
    .filter((part) => part !== '')
    .join(' ');

  return (
    <div
      data-zone="opponent-seat"
      data-player-id={model.playerId}
      data-seat={model.playerId}
      data-seat-index={String(model.seatColorIndex)}
      data-tier={model.tier}
      data-seat-size={mode}
      data-eliminated={model.isEliminated ? 'true' : 'false'}
      {...(model.isActive ? { 'data-active-seat': 'true' } : {})}
      {...(tapped ? { 'data-tapped-seat': 'true' } : {})}
      {...(model.kitHidden ? { 'data-hint-anchor': 'hidden-kit' } : {})}
      {...(drop !== undefined ? { 'data-drop': drop } : {})}
      {...(tutorialHighlight === 'opponent' ? { 'data-tutorial-highlight': 'opponent' } : {})}
      style={style}
      className={className}
    >
      <button
        type="button"
        aria-label={control.label}
        aria-describedby={detailsId}
        title={seatTitle}
        {...(target !== undefined ? { 'data-target-seat': target.kind } : {})}
        {...(target?.kind === 'invalid' ? { 'aria-disabled': true } : {})}
        {...(validTarget ? { 'data-motion': motionAttribute(reduced) } : {})}
        onClick={control.onClick}
        className={['absolute inset-0 rounded-v7-chrome-sm', CHROME_FOCUS_CLASS, ...targetClass]
          .filter((part) => part !== '')
          .join(' ')}
      />
      <div id={detailsId} className="pointer-events-none relative flex h-full min-w-0 flex-col">
        <div data-seat-name title={model.nickname} className="flex min-w-0 items-center gap-0.5">
          {/* Hidden from the description: the button already carries the name. */}
          <span aria-hidden="true" className="flex min-w-0">
            <PlayerName
              nickname={model.nickname}
              seatIndex={model.seatColorIndex}
              className={`min-w-0 truncate ${anatomy.nameClass}`}
            />
          </span>
          {model.connectionLabel !== null ? (
            <span data-seat-connection title={model.connectionLabel} className="inline-flex shrink-0">
              <Icon name="disconnected" size={12} />
              <span className="sr-only">{model.connectionLabel}</span>
            </span>
          ) : null}
          {model.botDifficulty !== null ? (
            <span data-seat-bot title={botSeatLabelText(model.botDifficulty)} className="inline-flex shrink-0">
              <Icon name="bot" size={12} />
              <span className="sr-only">
                <BotSeatLabel difficulty={model.botDifficulty} />
              </span>
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 items-center gap-0.5">
          <div
            data-zone="opponent-portrait"
            {...(tutorialHighlight === 'opponent-portrait' ? { 'data-tutorial-highlight': 'opponent-portrait' } : {})}
            className={`flex shrink-0 items-center justify-center ${anatomy.portraitClass}`}>
            {model.avatar.kind === 'kit' ? (
              <KitPortrait kitId={model.avatar.kitId} size={anatomy.kitSize} isEliminated={model.isEliminated} />
            ) : (
              // Hidden: the seat button already carries the nickname, and the disc only repeats its
              // initial (L74-26 gate G3, ledger 62).
              <span aria-hidden="true" className="inline-flex">
                <Avatar name={model.nickname} seatIndex={model.seatColorIndex} eliminated={model.isEliminated} size={anatomy.avatarSize} />
              </span>
            )}
          </div>
          <ul data-zone="opponent-resources" className={`flex flex-col gap-px leading-none ${anatomy.resourcesClass}`}>
            {model.resources.map((resource) => (
              <ResourceValue key={resource.kind} resource={resource} playerId={model.playerId} anatomy={anatomy} />
            ))}
          </ul>
        </div>
        <ul data-seat-badges className="flex h-4 items-center gap-0.5">
          {model.badges.slice(0, SEAT_VISIBLE_BADGE_COUNT).map((badge, index) => {
            const view = seatBadgeView(badge);
            return (
              <li
                // Kinds repeat (two persistents), and the model order is stable for a render.
                key={`${badge.kind}-${String(index)}`}
                data-seat-badge={badge.kind}
                {...(badge.kind === 'spying-on-you' ? { 'data-spy-eye': '' } : {})}
                title={view.label}
                className={BADGE_CHIP_CLASS}
              >
                <Icon name={view.icon} size={12} className="shrink-0" />
                {view.value !== null ? (
                  <span aria-hidden="true" className="font-v7-display text-v7-micro leading-none">
                    {view.value}
                  </span>
                ) : null}
                <span className="sr-only">{view.label}</span>
              </li>
            );
          })}
          {model.badgeOverflow > 0 ? (
            <li data-seat-badge-overflow className="font-v7-display text-v7-micro leading-none text-v7-text-2">
              +{model.badgeOverflow}
              <span className="sr-only">{` ${SEAT_MORE_STATUSES_LABEL}`}</span>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
