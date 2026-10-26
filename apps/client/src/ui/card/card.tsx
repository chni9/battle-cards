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
 * - **Sizing:** the root sizes by width and keeps its 2:3 ratio while its height is auto, so a
 *   stretching flex or grid parent must align its items (`items-end`, `items-start`…).
 * - **Motion:** the sheen sweep, the glow pulse and the selected lift are applied only with full
 *   motion (`data-motion`); reduced motion keeps every badge, the static sheen and the outline.
 */

import { getCard, type CardInstance, type CardType } from '@card-battle/shared';
import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { artFor } from '../asset-lookup';
import { Icon } from '../icons/icon';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { motionAttribute } from '../primitives/chrome-classes';
import {
  HIDDEN_CARD_LABEL,
  cardCostChip,
  cardDamageChip,
  cardFaceLabel,
  cardFamilyOf,
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

type Rim = 'holo' | 'gold';
type ChipLayout = 'left-stack' | 'corners';

const ROOT_CLASS =
  'relative isolate block aspect-[2/3] shrink-0 rounded-v7-card shadow-v7-card p-(--card-rim-width) text-left select-none [-webkit-touch-callout:none]';

const WIDTH_CLASS: Readonly<Record<CardSize, string>> = {
  hand: 'w-[clamp(64px,19vw,120px)]',
  lifted: 'w-[clamp(80px,24vw,150px)]',
  sheet: 'w-[clamp(200px,56vw,240px)]',
  thumb: 'w-11',
  tile: 'w-[clamp(88px,26vw,128px)]',
};

const RIM_CLASS: Readonly<Record<Rim, string>> = {
  holo: 'bg-[image:var(--card-rim-holo)]',
  gold: 'bg-[image:var(--card-rim-gold)]',
};

const SELECTED_CLASS = 'outline-3 outline-offset-2 outline-v7-cta';
const FULL_MOTION_CLASS = 'transition-transform duration-(--dur-base) ease-v7-entrance';
const LIFT_CLASS = '-translate-y-2 scale-105';
const UNPLAYABLE_CLASS = 'saturate-30';
const BUTTON_CLASS =
  'cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-v7-text';

/** The face and the verso sit inside the rim; their radius is the card radius minus the rim. */
const INNER_CLASS =
  'absolute inset-(--card-rim-width) overflow-hidden rounded-[calc(var(--card-radius)-var(--card-rim-width))]';
const FACE_CLASS = `${INNER_CLASS} bg-linear-to-b from-v7-card-face-0 to-v7-card-face-1`;
const VERSO_CLASS = `${INNER_CLASS} flex items-center justify-center bg-linear-to-b from-v7-panel-2 to-v7-panel`;

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
 * carries it. A `min-h` strip grows upward over the art box when a name needs a third line.
 */
const NAME_STRIP_CLASS: Readonly<Record<Exclude<CardSize, 'thumb'>, string>> = {
  hand: 'min-h-[29%] px-[2%] pb-[4%]',
  lifted: 'min-h-[25%] px-[6%] pb-[4%]',
  sheet: 'min-h-[19%] px-[8%] pb-[3%]',
  tile: 'min-h-[25%] px-[6%] pb-[4%]',
};

/**
 * Balanced lines, never truncated at a real width: at hand size on a 375 px phone (71 px wide)
 * the longest names ("Upgrade Point Thief", "Super Regeneration") take two lines at the 11 px
 * floor. A word wider than the strip hyphenates instead of overflowing, so at the 64 px clamp
 * floor "Super Regeneration" and "Card Transformer" take three; `line-clamp-3` is only a cap.
 */
const NAME_CLASS =
  'line-clamp-3 text-center text-balance font-v7-card font-semibold leading-[1.1] tracking-tight text-v7-text-on-card hyphens-auto break-words';

const NAME_TEXT_CLASS: Readonly<Record<Exclude<CardSize, 'thumb'>, string>> = {
  hand: 'text-v7-micro',
  lifted: 'text-v7-caption',
  sheet: 'text-v7-body',
  tile: 'text-v7-caption',
};

const CHIPS_CLASS: Readonly<Record<CardSize, string>> = {
  hand: 'left-[3px] top-[3px] flex-col items-start gap-[3px]',
  lifted: 'inset-x-[5px] top-[5px] items-start',
  sheet: 'inset-x-2.5 top-2.5 items-start',
  thumb: 'left-[2px] top-[2px] flex-col items-start gap-[2px]',
  tile: 'inset-x-[5px] top-[5px] items-start',
};

/** Chip height, padding and numeral size; the cost icon follows `COST_ICON_SIZE`. */
const CHIP_SIZE_CLASS: Readonly<Record<CardSize, string>> = {
  hand: 'h-4 min-w-4 px-1 text-v7-micro',
  lifted: 'h-5 min-w-5 px-1.5 text-v7-caption',
  sheet: 'h-8 min-w-8 px-2.5 text-v7-title',
  thumb: 'h-4 min-w-4 px-1 text-v7-micro',
  tile: 'h-5 min-w-5 px-1.5 text-v7-caption',
};

const BADGE_SIZE_CLASS: Readonly<Record<CardSize, string>> = {
  hand: 'size-4 text-v7-micro',
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

/** Printed pieces share the sticker look: a white ring that lifts them off the drawing. */
const STICKER_CLASS =
  'inline-flex shrink-0 items-center justify-center rounded-full font-v7-card font-bold leading-none tabular-nums ring-1 ring-v7-card-face-0 shadow-[0_1px_2px_rgb(12_9_32/0.45)]';
const COST_CHIP_CLASS = 'bg-linear-to-b from-v7-panel-2 to-v7-panel text-v7-text';
const DAMAGE_CHIP_CLASS = 'bg-v7-life text-v7-text-on-cta';
const UPGRADED_BADGE_CLASS = 'bg-[image:var(--card-rim-gold)] text-v7-text-on-cta';

/**
 * The upgraded sheen (spec v7 §5.4, §8.2): a holo tint plus, with full motion, a white band
 * translated across the face. Multiply shows the tint on the white face, where an overlay
 * blend would leave white unchanged; the sweep is the tint's sibling so the tint's opacity
 * does not cap it.
 */
const SHEEN_TINT_CLASS =
  'absolute inset-0 bg-[image:var(--card-rim-holo)] bg-size-[250%_250%] bg-top-left opacity-20 mix-blend-multiply';
const SHEEN_SWEEP_CLASS =
  'v7-card-sheen absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-v7-card-face-0 to-transparent opacity-70';

const EMBLEM_CLASS: Readonly<Record<CardType, string>> = {
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
        className={`${className} ${BUTTON_CLASS}`}
      >
        {children}
      </button>
    );
  }
  return (
    <article {...attributes} aria-label={label} {...titleProps} onContextMenu={preventContextMenu} className={className}>
      {children}
    </article>
  );
}

function rootClassName(input: {
  readonly size: CardSize;
  readonly full: boolean;
  readonly selected: boolean;
  readonly unplayable: boolean;
  readonly className: string | undefined;
}): string {
  const { size, full, selected, unplayable, className } = input;
  return [
    ROOT_CLASS,
    WIDTH_CLASS[size],
    full ? FULL_MOTION_CLASS : '',
    selected ? SELECTED_CLASS : '',
    selected && full ? LIFT_CLASS : '',
    unplayable ? UNPLAYABLE_CLASS : '',
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
      className={rootClassName({ size, full, selected, unplayable, className })}
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
      <span aria-hidden="true" data-card-layer="rim" className={`absolute inset-0 rounded-v7-card ${RIM_CLASS[rim]}`} />
      <span aria-hidden="true" data-card-layer="verso" className={VERSO_CLASS}>
        <span className="absolute inset-[7%] rounded-[calc(var(--card-radius)-6px)] border border-v7-text-2 opacity-25" />
        <span className={`absolute aspect-square w-[72%] rounded-full opacity-30 blur-lg ${EMBLEM_CLASS[family]}`} />
        <span className="relative flex aspect-square w-[46%] rotate-45 items-center justify-center rounded-[24%] bg-v7-bg-0 p-[15%] ring-2 ring-v7-panel-2">
          <span className={`block size-full rounded-[24%] ${EMBLEM_CLASS[family]}`} />
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
  const sticker = `${STICKER_CLASS} ${CHIP_SIZE_CLASS[size]}`;

  return (
    <CardRoot
      label={label}
      title={size === 'thumb' ? label : undefined}
      selected={selected}
      onActivate={onActivate === undefined ? undefined : () => {
        onActivate(instanceId);
      }}
      className={rootClassName({ size, full, selected, unplayable, className })}
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
      <span aria-hidden="true" data-card-layer="rim" className={`absolute inset-0 rounded-v7-card ${RIM_CLASS[rim]}`} />
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
            <span className={SHEEN_TINT_CLASS} />
            {full ? <span data-card-layer="sheen-sweep" className={SHEEN_SWEEP_CLASS} /> : null}
          </span>
        ) : null}
        {/* Above the sheen, so the sweep never washes the name out. */}
        {size !== 'thumb' ? (
          <span
            data-card-name=""
            className={`absolute inset-x-0 bottom-0 flex items-center justify-center ${NAME_STRIP_CLASS[size]}`}
          >
            <span className={`${NAME_CLASS} ${NAME_TEXT_CLASS[size]}`}>{name}</span>
          </span>
        ) : null}
      </span>
      <span data-card-chips={layout} className={`pointer-events-none absolute flex ${CHIPS_CLASS[size]}`}>
        {cost !== null ? (
          <span data-card-chip="cost" data-cost-kind={cost.kind} className={`${sticker} ${COST_CHIP_CLASS}`}>
            <CostAmount amount={cost} title={null} size={COST_ICON_SIZE[size]} />
          </span>
        ) : null}
        <span className={layout === 'corners' ? 'ml-auto flex flex-col items-end gap-1' : 'contents'}>
          {damage !== null ? (
            <span aria-hidden="true" data-card-chip="damage" className={`${sticker} ${DAMAGE_CHIP_CLASS}`}>
              {String(damage)}
            </span>
          ) : null}
          {isUpgraded ? (
            <span
              aria-hidden="true"
              data-card-badge="upgraded"
              className={`${STICKER_CLASS} ${BADGE_SIZE_CLASS[size]} ${UPGRADED_BADGE_CLASS}`}
            >
              +
            </span>
          ) : null}
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
    </CardRoot>
  );
}
