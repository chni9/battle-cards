/**
 * Holo Card — technical spec v7 §5.4 (anatomy, families, states, sizes), §6.6.5 (every face is
 * a button; long-press is ours), §8.3 (reduced motion keeps every number and label), L56-04
 * (listed damage × the pending multiplier) and Appendix A `global-activated-art-guard`.
 *
 * - **Data:** the chips, the accessible name and the family come from `card-face.ts`; the name
 *   from the catalog (the raw id when unknown); the art only from `artFor`, the base drawing,
 *   so no face ever requests activated art (Sentence, Shield) and Roulette keeps its drawing.
 * - **Root:** a `<button>` with `onActivate` (Enter and click call back), an `<article>`
 *   otherwise. It prevents the context menu and sets no text selection and no iOS callout.
 * - **Layers:** a rim layer under the face, so the counter glow (a `-z-10` child of an
 *   `isolate` root) stays outside the rim instead of tinting it; the face; the chip rail; the
 *   counter badge under the face. The art sits in a fixed box per size, `object-contain`, so a
 *   long name never shrinks it. Thumbs carry no cost chip and no name (art-only thumbs).
 * - **Sizing:** width and height both derive from one width (`--card-w`, else the size's
 *   default), so a stretching flex or grid row cannot distort the card and the row's own
 *   alignment still applies. A caller resizes a card only through `[--card-w:…]`.
 * - **Motion:** the sheen sweep, the foil drift, the glow pulse, the selected lift and the hover
 *   lift are applied only with full motion (`data-motion`); reduced motion keeps every badge,
 *   the still foil, the selection outline and the focus ring.
 */

import { getCard, type CardInstance, type CardType } from '@card-battle/shared';
import type { CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react';
import { artFor } from '../asset-lookup';
import { Icon } from '../icons/icon';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { motionAttribute } from '../primitives/chrome-classes';
import type { StructuredCost } from '../structured-cost';
import {
  INNER_CLASS,
  VERSO_CLASS,
  VERSO_FRAME_CLASS,
  VERSO_HATCH_CLASS,
  VERSO_LIGHT_CLASS,
  rimLayerClass,
  type Rim,
} from './card-classes';
import {
  HIDDEN_CARD_LABEL,
  cardCostChip,
  cardDamageChip,
  cardFaceLabel,
  cardFamilyOf,
  cardNameFontSize,
  type CardCounter,
  type CardSize,
} from './card-face';
import { CostAmount } from './cost-amount';

type DataAttributes = Readonly<Record<`data-${string}`, string>>;

interface CardCommonProps {
  size: CardSize;
  selected?: boolean;
  /** Desaturated; the caller decides it (spec v7 §5.4). The face stays activatable. */
  unplayable?: boolean;
  className?: string;
  dataAttributes?: DataAttributes;
}

export interface FaceUpCardProps extends CardCommonProps {
  face?: 'up';
  instance: CardInstance;
  damageMultiplier?: number;
  counter?: CardCounter;
  onActivate?: (instanceId: string) => void;
}

export interface HiddenCardProps extends CardCommonProps {
  face: 'hidden';
  family: CardType;
  onActivate?: () => void;
}

export type CardProps = FaceUpCardProps | HiddenCardProps;

type ChipLayout = 'left-stack' | 'corners';

/**
 * Width and height both come from one width: the caller's `--card-w` when set on the card
 * (className `[--card-w:…]`; it does not inherit, `ui/tokens.css`), else the size's
 * `--card-w-size`. A definite height leaves a stretching flex or grid row nothing to stretch,
 * so the card keeps 2:3 without overriding the row's alignment (fix round 1, A2).
 */
const ROOT_CLASS =
  'group @container relative isolate block w-[var(--card-w,var(--card-w-size))] h-[calc(var(--card-w,var(--card-w-size))*1.5)] shrink-0 rounded-v7-card shadow-v7-card p-(--card-rim-width) text-left select-none [-webkit-touch-callout:none]';

const WIDTH_CLASS: Readonly<Record<CardSize, string>> = {
  hand: '[--card-w-size:clamp(64px,19vw,120px)]',
  lifted: '[--card-w-size:clamp(80px,24vw,150px)]',
  sheet: '[--card-w-size:clamp(200px,56vw,240px)]',
  thumb: '[--card-w-size:44px]',
  tile: '[--card-w-size:clamp(88px,26vw,128px)]',
};

/**
 * Selection is the spec's `--cta` outline (§5.4); focus never touches the outline, it lights a
 * separate `--text` ring just outside it (the `focus` layer), so a focused selected card shows
 * both and a focused unselected one shows only the ring (fix round 1, A1). `outline-none` also
 * keeps the browser's own focus outline off.
 */
const SELECTED_CLASS = 'outline-3 outline-offset-2 outline-v7-cta';
const UNSELECTED_CLASS = 'outline-none';
const FULL_MOTION_CLASS = 'transition-transform duration-(--dur-base) ease-v7-entrance';
const LIFT_CLASS = '-translate-y-2 scale-105';
/** A small desktop lift; Tailwind v4 `hover:` only applies on hover-capable pointers. */
const HOVER_LIFT_CLASS = 'hover:-translate-y-1';
/**
 * The card body (rim, face or verso) in one layer, so an unplayable card is dimmed there and never
 * on the root, which carries the `--cta` selection outline, nor on the focus ring: both keep full
 * contrast (fix round 2). The body is the root's padding box.
 */
const BODY_CLASS = 'pointer-events-none absolute inset-0';
/**
 * The marks (cost and damage chips, the "+" badge, the counter badge) sit in a sibling layer over
 * the same box, outside the dimmed body: dimmed, the `--life` damage chip label fell to 2.6:1 (spec
 * v7 §5.1 binds 4.5:1), and an unplayable card stays activatable (§5.4). L72-21 gate.
 */
const MARKS_CLASS = 'pointer-events-none absolute inset-0';
/** Desaturated and dimmed, so grey drawings read "not now" too; never faded out (fix round 1, A5). */
const UNPLAYABLE_CLASS = 'saturate-30 brightness-75';

function bodyClassName(unplayable: boolean): string {
  return unplayable ? `${BODY_CLASS} ${UNPLAYABLE_CLASS}` : BODY_CLASS;
}
const BUTTON_CLASS = 'cursor-pointer';
const FOCUS_RING_CLASS =
  'pointer-events-none absolute -inset-2 hidden rounded-[calc(var(--card-radius)+8px)] border-2 border-v7-text group-focus-visible:block';

/** `@container` lets the name size itself against the face width (`cqi`, fix round 1, A4). */
const FACE_CLASS = `${INNER_CLASS} @container bg-linear-to-b from-v7-card-face-0 to-v7-card-face-1`;

/** A fixed art box per size, so every drawing fits the same frame whatever the name. */
const ART_BOX_CLASS: Readonly<Record<CardSize, string>> = {
  hand: 'inset-x-[8%] top-[6%] bottom-[29%]',
  lifted: 'inset-x-[8%] top-[6%] bottom-[25%]',
  sheet: 'inset-x-[10%] top-[15%] bottom-[19%]',
  thumb: 'inset-[8%]',
  tile: 'inset-x-[8%] top-[6%] bottom-[25%]',
};

/**
 * The name strip, anchored at the bottom; thumbs print no name, and their accessible name
 * carries it. A `min-h` strip would grow upward rather than clip if an unknown name needed a
 * third line. The side padding is `CARD_NAME_FIT[size].textPct` in `card-face.ts` (100 % minus
 * both sides): change them together.
 */
const NAME_STRIP_CLASS: Readonly<Record<Exclude<CardSize, 'thumb'>, string>> = {
  hand: 'min-h-[29%] px-[1.5%] pb-[4%]',
  lifted: 'min-h-[25%] px-[6%] pb-[3%]',
  sheet: 'min-h-[19%] px-[8%] pb-[3%]',
  tile: 'min-h-[25%] px-[6%] pb-[3%]',
};

/**
 * Balanced lines, never truncated and never broken mid-word: the inline font size
 * (`cardNameFontSize`) shrinks the name until its widest word fits the strip (hand floor 10 px,
 * 11 px elsewhere; catalog names bottom out at 10.04 px on a 64 px hand card), and scales the
 * hand name up a little toward the 120 px clamp top. "Upgrade Point Thief" and "Super Regeneration" take two lines; `line-clamp-3` is only a
 * cap, and `break-words` only guards an unknown name wider than the floor allows.
 */
const NAME_CLASS =
  'line-clamp-3 text-center text-balance font-v7-card font-semibold leading-[1.1] tracking-tight text-v7-text-on-card break-words text-(length:--card-name-size)';

/**
 * The fitted size travels as `--card-name-size`. Where `cqi` is unsupported the variable is
 * invalid at computed time, so the name inherits its strip's size class instead.
 */
type NameStyle = CSSProperties & { readonly '--card-name-size': string };

function nameStyle(name: string, size: Exclude<CardSize, 'thumb'>): NameStyle {
  return { '--card-name-size': cardNameFontSize(name, size) };
}

const NAME_TEXT_CLASS: Readonly<Record<Exclude<CardSize, 'thumb'>, string>> = {
  hand: 'text-v7-micro',
  lifted: 'text-v7-caption',
  sheet: 'text-v7-title',
  tile: 'text-v7-caption',
};

const CHIPS_CLASS: Readonly<Record<CardSize, string>> = {
  hand: 'left-[3px] top-[3px] flex-col items-start gap-[3px]',
  lifted: 'inset-x-[5px] top-[5px] items-start',
  sheet: 'inset-x-2.5 top-2.5 items-start',
  thumb: 'left-[2px] top-[2px] flex-col items-start gap-[2px]',
  tile: 'inset-x-[5px] top-[5px] items-start',
};

/**
 * Chip height, padding and numeral size; the cost icon follows `COST_ICON_SIZE`. Hand chips grow
 * with the card past ~96 px (`cqi` of the `@container` root): 16 px and 11 px on a phone, about
 * 20 px and 13 px at the 120 px clamp top.
 */
const CHIP_SIZE_CLASS: Readonly<Record<CardSize, string>> = {
  hand: 'h-[max(16px,16.7cqi)] min-w-[max(16px,16.7cqi)] px-1 text-[length:max(11px,10.8cqi)]',
  lifted: 'h-5 min-w-5 px-1.5 text-v7-caption',
  sheet: 'h-8 min-w-8 px-2.5 text-v7-title',
  thumb: 'h-4 min-w-4 px-1 text-v7-micro',
  tile: 'h-5 min-w-5 px-1.5 text-v7-caption',
};

const BADGE_SIZE_CLASS: Readonly<Record<CardSize, string>> = {
  hand: 'size-[max(16px,16.7cqi)] text-[length:max(11px,10.8cqi)]',
  lifted: 'size-5 text-v7-caption',
  sheet: 'size-8 text-v7-title',
  thumb: 'size-4 text-v7-micro',
  tile: 'size-5 text-v7-caption',
};

const COST_ICON_SIZE: Readonly<Record<CardSize, 'sm' | 'md' | 'lg'>> = {
  hand: 'sm',
  lifted: 'md',
  sheet: 'lg',
  thumb: 'sm',
  tile: 'md',
};

/** A per-life rate draws two icons; at lifted and tile it takes the small ones to fit the rail. */
function costIconSize(size: CardSize, cost: StructuredCost): 'sm' | 'md' | 'lg' {
  return cost.kind === 'pointsPerLife' && (size === 'lifted' || size === 'tile') ? 'sm' : COST_ICON_SIZE[size];
}

/** Printed pieces share the sticker look: a white ring that lifts them off the drawing. */
const STICKER_CLASS =
  'inline-flex shrink-0 items-center justify-center rounded-full font-v7-card font-bold leading-none tabular-nums ring-1 ring-v7-card-face-0 shadow-[0_1px_2px_rgb(12_9_32/0.45)]';
const COST_CHIP_CLASS = 'bg-linear-to-b from-v7-panel-2 to-v7-panel text-v7-text';
const DAMAGE_CHIP_CLASS = 'bg-v7-life text-v7-text-on-cta';
const UPGRADED_BADGE_CLASS = 'bg-[image:var(--card-rim-gold)] text-v7-text-on-cta';

/**
 * The upgraded sheen (spec v7 §5.4, §8.2): a holo foil over the drawing plus, with full motion,
 * a white band translated across the face. The foil is `--card-holo-sheen`, a saturated
 * diagonal rainbow on a layer twice the face width, blended with `soft-light`: it shifts the
 * drawing's hues without muting them and leaves the white face white (soft-light over white is
 * white). `color` turned red flames brown and grey blades olive. With full motion the layer
 * drifts back and forth (translated only); with reduced motion it holds still. The sweep is
 * the foil's sibling so the foil's opacity does not cap it (fix round 1, B9).
 */
const SHEEN_TINT_CLASS =
  'absolute inset-y-0 left-0 w-[200%] bg-[image:var(--card-holo-sheen)] opacity-70 mix-blend-soft-light';
const SHEEN_DRIFT_CLASS = 'v7-card-holo-drift';
const SHEEN_SWEEP_CLASS =
  'v7-card-sheen absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-v7-card-face-0 to-transparent opacity-70';

/** The verso gem in the family's token; the glow tokens stay for its halo (fix round 1, B4). */
const EMBLEM_CLASS: Readonly<Record<CardType, string>> = {
  attack: 'bg-v7-threat-attack',
  action: 'bg-v7-cta-2',
  special: 'bg-[image:var(--card-rim-gold)]',
};
const HALO_CLASS: Readonly<Record<CardType, string>> = {
  attack: 'bg-v7-glow-a',
  action: 'bg-v7-glow-b',
  special: 'bg-[image:var(--card-rim-gold)]',
};

const preventContextMenu = (event: MouseEvent<HTMLElement>): void => {
  event.preventDefault();
};

interface CardRootProps {
  readonly label: string;
  readonly title: string | undefined;
  readonly className: string;
  readonly attributes: DataAttributes;
  readonly selected: boolean;
  readonly onActivate: (() => void) | undefined;
  readonly children: ReactNode;
}

/** One root for both faces: a toggle-style button when the caller can act, an article otherwise. */
function CardRoot({ label, title, className, attributes, selected, onActivate, children }: CardRootProps): ReactElement {
  const titleProps = title !== undefined ? { title } : {};
  if (onActivate !== undefined) {
    return (
      <button
        {...attributes}
        type="button"
        aria-label={label}
        aria-pressed={selected}
        {...titleProps}
        onClick={() => {
          onActivate();
        }}
        onContextMenu={preventContextMenu}
        className={className}
      >
        {children}
        <span aria-hidden="true" data-card-layer="focus" className={FOCUS_RING_CLASS} />
      </button>
    );
  }
  return (
    <article {...attributes} aria-label={label} {...titleProps} onContextMenu={preventContextMenu} className={className}>
      {children}
    </article>
  );
}

/** The root's classes; the caller's `className` always comes last, on both root forms. */
function rootClassName(input: {
  readonly size: CardSize;
  readonly full: boolean;
  readonly interactive: boolean;
  readonly selected: boolean;
  readonly className: string | undefined;
}): string {
  const { size, full, interactive, selected, className } = input;
  return [
    ROOT_CLASS,
    WIDTH_CLASS[size],
    interactive ? BUTTON_CLASS : '',
    full ? FULL_MOTION_CLASS : '',
    selected ? SELECTED_CLASS : UNSELECTED_CLASS,
    selected && full ? LIFT_CLASS : '',
    interactive && full && !selected ? HOVER_LIFT_CLASS : '',
    className ?? '',
  ]
    .filter((part) => part !== '')
    .join(' ');
}

function rimFor(family: CardType): Rim {
  return family === 'special' ? 'gold' : 'holo';
}

export function Card(props: CardProps): ReactElement {
  const full = !usePrefersReducedMotion();
  if (props.face === 'hidden') {
    return <HiddenFace {...props} full={full} />;
  }
  return <FaceUp {...props} full={full} />;
}

function HiddenFace({
  family,
  size,
  selected = false,
  unplayable = false,
  className,
  dataAttributes,
  onActivate,
  full,
}: HiddenCardProps & { readonly full: boolean }): ReactElement {
  const rim = rimFor(family);
  return (
    <CardRoot
      label={HIDDEN_CARD_LABEL}
      title={size === 'thumb' ? HIDDEN_CARD_LABEL : undefined}
      selected={selected}
      onActivate={onActivate}
      className={rootClassName({ size, full, interactive: onActivate !== undefined, selected, className })}
      attributes={{
        ...dataAttributes,
        'data-card-face': 'hidden',
        'data-card-family': family,
        'data-card-rim': rim,
        'data-card-size': size,
        'data-motion': motionAttribute(!full),
        ...(unplayable ? { 'data-unplayable': 'true' } : {}),
      }}
    >
      <span aria-hidden="true" data-card-layer="body" className={bodyClassName(unplayable)}>
        <span aria-hidden="true" data-card-layer="rim" className={rimLayerClass(rim)} />
        <span aria-hidden="true" data-card-layer="verso" className={VERSO_CLASS}>
          <span className={VERSO_LIGHT_CLASS} />
          <span className={VERSO_HATCH_CLASS} />
          <span className={VERSO_FRAME_CLASS} />
          <span className={`absolute aspect-square w-[72%] rounded-full opacity-30 blur-lg ${HALO_CLASS[family]}`} />
          <span className="relative flex aspect-square w-[46%] rotate-45 items-center justify-center rounded-[24%] bg-v7-bg-0 p-[15%] ring-2 ring-v7-panel-2">
            <span data-card-layer="emblem" className={`block size-full rounded-[24%] ${EMBLEM_CLASS[family]}`} />
          </span>
        </span>
      </span>
    </CardRoot>
  );
}

function FaceUp({
  instance,
  size,
  damageMultiplier,
  counter,
  selected = false,
  unplayable = false,
  className,
  dataAttributes,
  onActivate,
  full,
}: FaceUpCardProps & { readonly full: boolean }): ReactElement {
  const { cardId, instanceId, isUpgraded } = instance;
  const name = getCard(cardId)?.name ?? cardId;
  const family = cardFamilyOf(cardId);
  const rim = rimFor(family);
  // Thumbs stay art-only plus damage (Appendix A `global-card-face`, L10-04): on a 44 px face a
  // two-digit cost chip spans the whole width, and no thumb place (log, queue, Spy hand, pool,
  // actives) is where a cost is paid. The sheet the thumb opens shows it.
  const cost = size === 'thumb' ? null : cardCostChip(cardId, isUpgraded);
  const damage = cardDamageChip(cardId, isUpgraded, damageMultiplier ?? 1);
  const label = cardFaceLabel({ name, isUpgraded, damage, ...(counter !== undefined ? { counter } : {}) });
  const layout: ChipLayout = size === 'hand' || size === 'thumb' ? 'left-stack' : 'corners';
  const corners = layout === 'corners';
  const sticker = `${STICKER_CLASS} ${CHIP_SIZE_CLASS[size]}`;
  const upgradedBadge = isUpgraded ? (
    <span aria-hidden="true" data-card-badge="upgraded" className={`${STICKER_CLASS} ${BADGE_SIZE_CLASS[size]} ${UPGRADED_BADGE_CLASS}`}>
      +
    </span>
  ) : null;

  return (
    <CardRoot
      label={label}
      title={size === 'thumb' ? label : undefined}
      selected={selected}
      onActivate={onActivate === undefined ? undefined : () => {
        onActivate(instanceId);
      }}
      className={rootClassName({ size, full, interactive: onActivate !== undefined, selected, className })}
      attributes={{
        ...dataAttributes,
        'data-card-face': 'up',
        'data-card-id': cardId,
        'data-instance-id': instanceId,
        'data-card-family': family,
        'data-card-rim': rim,
        'data-card-size': size,
        'data-motion': motionAttribute(!full),
        ...(unplayable ? { 'data-unplayable': 'true' } : {}),
      }}
    >
      {counter !== undefined ? (
        // The pulse animates the opacity of a pre-blurred child (spec v7 §8.2). On the blurred
        // span itself, `animate-pulse` (to 0.5 at 50%) would only move 0.6 to 0.5.
        <span
          aria-hidden="true"
          data-card-layer="glow"
          className={`pointer-events-none absolute -inset-1 -z-10 ${full ? 'animate-pulse' : ''}`}
        >
          <span className="absolute inset-0 rounded-v7-card bg-v7-cta-2 opacity-60 blur-md" />
        </span>
      ) : null}
      <span data-card-layer="body" className={bodyClassName(unplayable)}>
        <span aria-hidden="true" data-card-layer="rim" className={rimLayerClass(rim)} />
        <span data-card-layer="face" className={FACE_CLASS}>
          <span className={`absolute flex items-center justify-center ${ART_BOX_CLASS[size]}`}>
            <img
              src={artFor(cardId)}
              alt=""
              draggable={false}
              className="pointer-events-none size-full object-contain"
            />
          </span>
          {isUpgraded ? (
            <span aria-hidden="true" data-card-layer="sheen" className="pointer-events-none absolute inset-0">
              <span data-card-layer="sheen-tint" className={`${SHEEN_TINT_CLASS} ${full ? SHEEN_DRIFT_CLASS : ''}`} />
              {full ? <span data-card-layer="sheen-sweep" className={SHEEN_SWEEP_CLASS} /> : null}
            </span>
          ) : null}
          {/* Above the sheen, so the sweep never washes the name out. */}
          {size !== 'thumb' ? (
            <span
              data-card-name=""
              className={`absolute inset-x-0 bottom-0 flex items-center justify-center ${NAME_STRIP_CLASS[size]} ${NAME_TEXT_CLASS[size]}`}
            >
              <span className={NAME_CLASS} style={nameStyle(name, size)}>
                {name}
              </span>
            </span>
          ) : null}
        </span>
      </span>
      <span data-card-layer="marks" className={MARKS_CLASS}>
        <span data-card-chips={layout} className={`pointer-events-none absolute flex ${CHIPS_CLASS[size]}`}>
          {/* Corners: cost then "+" down the left, damage alone on the right, so the top rail never
              holds the widest cost and the badge side by side (fix round 1, A3). Left stack: one
              column, cost, damage, "+". */}
          <span className={corners ? 'flex flex-col items-start gap-1' : 'contents'}>
            {cost !== null ? (
              <span data-card-chip="cost" data-cost-kind={cost.kind} className={`${sticker} ${COST_CHIP_CLASS}`}>
                <CostAmount amount={cost} title={null} size={costIconSize(size, cost)} />
              </span>
            ) : null}
            {corners ? upgradedBadge : null}
          </span>
          <span className={corners ? 'ml-auto' : 'contents'}>
            {damage !== null ? (
              <span aria-hidden="true" data-card-chip="damage" className={`${sticker} ${DAMAGE_CHIP_CLASS}`}>
                {String(damage)}
              </span>
            ) : null}
            {corners ? null : upgradedBadge}
          </span>
        </span>
        {counter !== undefined ? (
          <span
            aria-hidden="true"
            data-card-counter={counter.kind}
            className="pointer-events-none absolute inset-x-0 -bottom-2 mx-auto flex w-fit items-center gap-0.5 rounded-full bg-v7-bg-0 px-1 py-px font-v7-card text-v7-micro font-bold leading-none text-v7-text tabular-nums ring-1 ring-v7-cta-2"
          >
            <Icon name={counter.kind === 'card-lives' ? 'life' : 'clock'} size={10} />
            {String(counter.amount)}
          </span>
        ) : null}
      </span>
    </CardRoot>
  );
}
