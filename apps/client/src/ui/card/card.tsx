/**
 * Holo card face (technical spec v7 §5.4, §6.6.5, §8.3, L56-04).
 * Appendix A `global-activated-art-guard`: art is only `artFor` of the base drawing.
 * Upgraded, activated and active looks are code states, never a second PNG.
 */

import { getCard, type CardInstance, type CardType } from '@card-battle/shared';
import { createElement, type MouseEvent, type ReactElement } from 'react';

import { artFor } from '../asset-lookup';
import { Icon } from '../icons/icon';
import type { IconName } from '../icons/icon-names';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { CostAmount } from './cost-amount';
import {
  HIDDEN_CARD_LABEL,
  cardCostChip,
  cardDamageChip,
  cardFaceLabel,
  cardFamilyOf,
  type CardCounter,
  type CardSize,
} from './card-face';

interface CardCommonProps {
  size: CardSize;
  selected?: boolean;
  unplayable?: boolean;
  className?: string;
  dataAttributes?: Readonly<Record<`data-${string}`, string>>;
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

const WIDTH: Readonly<Record<CardSize, string>> = {
  hand: 'w-[clamp(64px,19vw,120px)]',
  lifted: 'w-[clamp(80px,24vw,150px)]',
  sheet: 'w-[clamp(200px,56vw,240px)]',
  thumb: 'w-11',
  tile: 'w-[clamp(88px,26vw,128px)]',
};

const EMBLEM: Readonly<Record<CardType, string>> = {
  attack: 'bg-v7-glow-a',
  action: 'bg-v7-glow-b',
  special: 'bg-[image:var(--card-rim-gold)]',
};

function costSize(size: CardSize): 'sm' | 'md' | 'lg' {
  if (size === 'sheet') return 'lg';
  if (size === 'hand' || size === 'thumb') return 'sm';
  return 'md';
}

function damageText(size: CardSize): string {
  if (size === 'sheet') return 'text-v7-title';
  if (size === 'hand' || size === 'thumb') return 'text-v7-micro';
  return 'text-v7-caption';
}

function nameText(size: CardSize): string {
  if (size === 'sheet') return 'text-v7-body';
  if (size === 'hand') return 'text-v7-micro';
  return 'text-v7-caption';
}

function blockContextMenu(event: MouseEvent<HTMLElement>): void {
  event.preventDefault();
}

export function Card(props: CardProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const motion = reduced ? 'reduced' : 'full';
  const selected = props.selected === true;
  const unplayable = props.unplayable === true;
  const hidden = props.face === 'hidden';
  const family = hidden ? props.family : cardFamilyOf(props.instance.cardId);
  const rim = family === 'special' ? 'gold' : 'holo';
  const interactive = props.onActivate !== undefined;

  const className = [
    'relative isolate aspect-[2/3] shrink-0 select-none rounded-v7-card p-(--card-rim-width) shadow-v7-card [-webkit-touch-callout:none]',
    WIDTH[props.size],
    rim === 'gold' ? 'bg-[image:var(--card-rim-gold)]' : 'bg-[image:var(--card-rim-holo)]',
    selected ? 'outline-3 outline-offset-2 outline-v7-cta' : '',
    selected && motion === 'full'
      ? '-translate-y-2 scale-105 transition-transform duration-(--dur-base) ease-v7-entrance'
      : '',
    unplayable ? 'saturate-30' : '',
    interactive ? 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-v7-text' : '',
    props.className ?? '',
  ]
    .filter((part) => part !== '')
    .join(' ');

  const label = hidden
    ? HIDDEN_CARD_LABEL
    : cardFaceLabel({
        name: getCard(props.instance.cardId)?.name ?? props.instance.cardId,
        isUpgraded: props.instance.isUpgraded,
        damage: cardDamageChip(props.instance.cardId, props.instance.isUpgraded, props.damageMultiplier),
        ...(props.counter !== undefined ? { counter: props.counter } : {}),
      });

  const shared = {
    ...(props.dataAttributes ?? {}),
    'aria-label': label,
    className,
    'data-card-face': hidden ? 'hidden' : 'up',
    'data-card-rim': rim,
    'data-card-size': props.size,
    'data-motion': motion,
    ...(hidden ? { 'data-card-family': props.family } : {}),
    ...(hidden
      ? {}
      : { 'data-card-id': props.instance.cardId, 'data-instance-id': props.instance.instanceId }),
    ...(unplayable ? { 'data-unplayable': 'true' } : {}),
    onContextMenu: blockContextMenu,
  };

  const body = hidden ? hiddenBody(props.family) : faceBody(props, motion);

  if (props.face === 'hidden') {
    if (props.onActivate !== undefined) {
      const onActivate = props.onActivate;
      return (
        <button type="button" {...shared} aria-pressed={selected} onClick={() => { onActivate(); }}>
          {body}
        </button>
      );
    }
    return <article {...shared}>{body}</article>;
  }

  if (props.onActivate !== undefined) {
    const onActivate = props.onActivate;
    const instanceId = props.instance.instanceId;
    return (
      <button
        type="button"
        {...shared}
        aria-pressed={selected}
        onClick={() => { onActivate(instanceId); }}
      >
        {body}
      </button>
    );
  }
  return <article {...shared}>{body}</article>;
}

function hiddenBody(family: CardType): ReactElement {
  return (
    <span
      data-card-layer="verso"
      className="relative block h-full w-full overflow-hidden bg-linear-to-b from-v7-panel-2 to-v7-panel"
    >
      <span
        className={`absolute inset-[28%] [clip-path:polygon(50%_0,100%_50,50%_100,0_50)] ${EMBLEM[family]}`}
      />
    </span>
  );
}

function faceBody(props: FaceUpCardProps, motion: 'reduced' | 'full'): ReactElement {
  const { instance, size } = props;
  const cost = cardCostChip(instance.cardId, instance.isUpgraded);
  const damage = cardDamageChip(instance.cardId, instance.isUpgraded, props.damageMultiplier);
  const stack = size === 'hand' || size === 'thumb' ? 'left-stack' : 'corners';
  const name = getCard(instance.cardId)?.name ?? instance.cardId;
  const counter = props.counter;

  const costChip =
    cost === null
      ? null
      : (
          <span
            data-card-chip="cost"
            data-cost-kind={cost.kind}
            className="bg-linear-to-b from-v7-panel-2 to-v7-panel text-v7-text"
          >
            <CostAmount amount={cost} title={null} size={costSize(size)} />
          </span>
        );

  const damageChip =
    damage === null
      ? null
      : createElement(
          'span',
          {
            'aria-hidden': 'true',
            'data-card-chip': 'damage',
            className: `bg-v7-life font-v7-card font-bold tabular-nums text-v7-text-on-cta ${damageText(size)}`,
          },
          damage,
        );

  return (
    <>
      {counter !== undefined ? (
        <span
          data-card-layer="glow"
          className={[
            'pointer-events-none absolute -inset-1 -z-10 rounded-v7-card bg-v7-cta-2 opacity-60 blur-md',
            motion === 'full' ? 'animate-pulse' : '',
          ]
            .filter((part) => part !== '')
            .join(' ')}
        />
      ) : null}
      <span
        data-card-layer="face"
        className="flex h-full w-full flex-col overflow-hidden bg-linear-to-b from-v7-card-face-0 to-v7-card-face-1"
      >
        <span className="relative min-h-0 flex-1">
          <img
            alt=""
            draggable={false}
            src={artFor(instance.cardId)}
            className="absolute inset-0 size-full object-contain"
          />
          {stack === 'left-stack' ? (
            <span
              data-card-chips="left-stack"
              className="pointer-events-none absolute top-0.5 left-0.5 z-10 flex flex-col items-start gap-0.5"
            >
              {costChip}
              {damageChip}
            </span>
          ) : (
            <span data-card-chips="corners" className="pointer-events-none absolute inset-0 z-10">
              {costChip === null ? null : <span className="absolute top-0.5 left-0.5">{costChip}</span>}
              {damageChip === null ? null : <span className="absolute top-0.5 right-0.5">{damageChip}</span>}
            </span>
          )}
          {instance.isUpgraded ? (
            <span
              data-card-layer="sheen"
              className="pointer-events-none absolute inset-0 overflow-hidden bg-[image:var(--card-rim-holo)] opacity-20 mix-blend-overlay"
            >
              {motion === 'full' ? (
                <span
                  data-card-layer="sheen-sweep"
                  className="v7-card-sheen pointer-events-none absolute inset-y-0 w-1/3 bg-white"
                />
              ) : null}
            </span>
          ) : null}
          {instance.isUpgraded
            ? createElement(
                'span',
                {
                  'aria-hidden': 'true',
                  'data-card-badge': 'upgraded',
                  className:
                    'absolute right-0.5 bottom-0.5 z-10 bg-[image:var(--card-rim-gold)] px-1 font-v7-card leading-none text-v7-text-on-cta',
                },
                '+',
              )
            : null}
          {counter !== undefined
            ? createElement(
                'span',
                {
                  'aria-hidden': 'true',
                  'data-card-counter': counter.kind,
                  className: 'absolute bottom-0.5 left-0.5 z-10 inline-flex items-center font-v7-card',
                },
                createElement(Icon, {
                  name: (counter.kind === 'card-lives' ? 'life' : 'clock') satisfies IconName,
                  size: 10,
                }),
                counter.amount,
              )
            : null}
        </span>
        {size === 'thumb'
          ? null
          : createElement(
              'span',
              {
                'data-card-name': '',
                className: `block w-full truncate px-0.5 text-center font-v7-card font-semibold text-v7-text-on-card ${nameText(size)}`,
              },
              name,
            )}
      </span>
    </>
  );
}
