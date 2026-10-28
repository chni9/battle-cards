/**
 * The hand fan — technical spec v7 §5.4 (card states, sizes), §6.1 item 4 (the `hand` region),
 * §6.6.1 (a tap opens the card sheet), §6.6.4 (selecting sends nothing), §6.6.5 (every face is a
 * button; long-press is ours), §8.3 (reduced motion keeps the cue); Lot 74 plan Appendix A
 * `card-band` and `global-card-face` (L74-07).
 *
 * One horizontal scroller with two groups, the hand (attacks, then actions) and the specials
 * after a gap. The component renders `handFanModel`; a tap only asks ArenaScreen to open the
 * card's sheet, so nothing is sent from here (golden rule 8). There is no entrance motion (V2
 * `card-band.tsx` always skips it); a held card that upgrades replays V2's 90 degree flip.
 */

import type { PlayingStateView } from '@card-battle/shared';
import { motion } from 'motion/react';
import { useState, type CSSProperties, type ReactElement } from 'react';

import { Card } from '../../ui/card/card';
import { durationS, EASE_ENTRANCE } from '../../ui/motion/motion-tokens';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { motionAttribute } from '../../ui/primitives/chrome-classes';
import { ScrollArea } from '../../ui/primitives/scroll-area';
import type { ActionContext } from '../../view-model/action-lock';
import {
  HAND_GROUP_COPY,
  handFanModel,
  type HandCardSource,
  type HandFanCard,
} from './hand-fan-model';

export interface HandFanProps {
  readonly view: PlayingStateView;
  readonly ctx: ActionContext;
  /** `selectedHandInstanceId(sheets)`, derived by ArenaScreen: the card whose sheet is open. */
  readonly selectedInstanceId: string | null;
  /** A tap selects the card by opening its sheet. It never sends anything (§6.6.4). */
  readonly onOpenCard: (source: HandCardSource) => void;
}

type HandFanStyle = CSSProperties & { readonly '--hand-strips': string; readonly '--hand-fulls': string };

/**
 * Every card but the last of its group sits in a narrower slot, so the next card overlaps it from
 * the right (DOM order paints later cards on top) and its left-edge chips stay readable (spec v7
 * §5.4). The slot is at least 44 px and at most a card plus an 8 px gap. Below 44 px the hand
 * scrolls inside itself (§6.1 item 4). 44px = the scroller's 2 x 16 px padding + the 12 px group
 * gap. The widths are starting points the L74-26 browser gate checks at 360, 375 and 390 px.
 */
const STRIP_WIDTH =
  'max(44px, min(var(--hand-card-w) + 8px, (100cqi - 44px - var(--hand-fulls) * var(--hand-card-w)) / max(var(--hand-strips), 1)))';

/** V2's flip is a 90 degree `rotateY`; `V7MotionTarget` has no `rotateY`, so raw motion props. */
const FLIP_FULL = {
  initial: { rotateY: 90 },
  animate: { rotateY: 0 },
  transition: { duration: durationS('base'), ease: EASE_ENTRANCE },
  style: { transformPerspective: 600 },
} as const;

/** Under reduced motion the cue is a 120 ms opacity fade (§8.3 keeps fades; designer Q13). */
const FLIP_REDUCED = {
  initial: { opacity: 0.4 },
  animate: { opacity: 1 },
  transition: { duration: durationS('fast') },
} as const;

export function HandFan({ view, ctx, selectedInstanceId, onOpenCard }: HandFanProps): ReactElement {
  const model = handFanModel(view, ctx);
  const groups = [model.hand, model.specials];
  const style: HandFanStyle = {
    '--hand-strips': String(groups.reduce((sum, cards) => sum + Math.max(0, cards.length - 1), 0)),
    '--hand-fulls': String(groups.filter((cards) => cards.length > 0).length),
  };
  return (
    // The container for `cqi`. `--hand-card-w` restates the Card `hand` width (spec v7 §5.4); each
    // card takes it through `[--card-w:var(--hand-card-w)]`, the Card's only resize path.
    <div data-hand-fan="" className="@container h-full w-full [--hand-card-w:clamp(64px,19vw,120px)]" style={style}>
      <ScrollArea axis="x" className="h-full px-4 pt-4 pb-3">
        <div className="mx-auto flex w-max items-end gap-3">
          <HandGroup zone="hand" cards={model.hand} selectedInstanceId={selectedInstanceId} onOpenCard={onOpenCard} />
          <HandGroup
            zone="specials"
            cards={model.specials}
            selectedInstanceId={selectedInstanceId}
            onOpenCard={onOpenCard}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

interface HandGroupProps {
  readonly zone: keyof typeof HAND_GROUP_COPY;
  readonly cards: readonly HandFanCard[];
  readonly selectedInstanceId: string | null;
  readonly onOpenCard: (source: HandCardSource) => void;
}

/** An empty group keeps V2's caption and text (Q60); a filled one is named by its `aria-label`. */
function HandGroup({ zone, cards, selectedInstanceId, onOpenCard }: HandGroupProps): ReactElement {
  const copy = HAND_GROUP_COPY[zone];
  return (
    <div data-zone={zone} data-hint-anchor={zone} className="flex items-end">
      {cards.length === 0 ? (
        <p className="flex min-h-11 flex-col justify-center px-1 font-v7-body text-v7-caption font-bold text-v7-text-2">
          <span>{copy.label}</span>
          <span>{copy.empty}</span>
        </p>
      ) : (
        <ul aria-label={copy.label} className="flex items-end">
          {cards.map((card, index) => (
            <HandSlot
              key={card.source.instance.instanceId}
              card={card}
              last={index === cards.length - 1}
              selected={card.source.instance.instanceId === selectedInstanceId}
              onOpen={onOpenCard}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface HandSlotProps {
  readonly card: HandFanCard;
  readonly last: boolean;
  readonly selected: boolean;
  readonly onOpen: (source: HandCardSource) => void;
}

/** Not clipped: the card overflows its slot to the right, and a selected or focused card rises above its neighbour. */
function HandSlot({ card, last, selected, onOpen }: HandSlotProps): ReactElement {
  return (
    <li
      className={`relative shrink-0 focus-within:z-10 ${selected ? 'z-10' : ''}`}
      style={last ? undefined : { width: STRIP_WIDTH }}
    >
      <HandCard card={card} selected={selected} onOpen={onOpen} />
    </li>
  );
}

interface HandCardProps {
  readonly card: HandFanCard;
  readonly selected: boolean;
  readonly onOpen: (source: HandCardSource) => void;
}

/**
 * V2 `AnimatedCard`: a held card that flips to upgraded replays the flip, and never on mount.
 * The change is read during render (the `Sheet` pattern), so the count and the new key land in
 * the same commit.
 */
function HandCard({ card, selected, onOpen }: HandCardProps): ReactElement {
  const { instance } = card.source;
  const reduced = usePrefersReducedMotion();
  const [shownUpgraded, setShownUpgraded] = useState(instance.isUpgraded);
  const [flips, setFlips] = useState(0);
  if (shownUpgraded !== instance.isUpgraded) {
    setShownUpgraded(instance.isUpgraded);
    setFlips(flips + 1);
  }
  const flip = flips === 0 ? { initial: false } : reduced ? FLIP_REDUCED : FLIP_FULL;
  return (
    <motion.div key={flips} data-upgrade-flip={String(flips)} data-motion={motionAttribute(reduced)} {...flip}>
      <Card
        size="hand"
        instance={instance}
        selected={selected}
        unplayable={card.unplayable}
        {...(card.description !== null ? { description: card.description } : {})}
        className="[--card-w:var(--hand-card-w)]"
        onActivate={() => {
          onOpen(card.source);
        }}
      />
    </motion.div>
  );
}
