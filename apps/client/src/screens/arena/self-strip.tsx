/**
 * The POV's own strip — technical spec v7 §6.1 item 3 (the own kit portrait, the four resources
 * with their captions, the flow badges, the cards in play), §6.6.1 (a thumb opens the card
 * sheet), §11 (Q37, Q38, Q40); Appendix A `private-zone-identity`, `active-persistent-thumbs`,
 * `sentence-chips`, `global-resource-captions`, `global-activated-art-guard`; Lot 74 plan
 * Appendix A.8 rulings 1 and 6 (L74-09).
 *
 * It renders `selfStrip(view, ctx)` (computed once in ArenaScreen) and sends nothing: the portrait
 * and the thumbs only ask ArenaScreen to open a sheet (§6.6.4). The Activate duplication button is
 * the dock's (L74-13); the strip keeps only the "Duplication active" badge. A walk-in has no kit
 * and no resources (Q38), so it gets no strip here: its self strip is `SpectatorStrip`
 * (`spectator-strip.tsx`, L74-23).
 *
 * L74-23 (§6.12, A.8 rulings 7 and 9): an eliminated Watching POV keeps this strip, headed by the
 * Watching header (`WatchingHeader`: Leave table and V2's locked line) while `model.leave` and
 * `onLeave` are set; on the finished board (`leave` false) it shows only the strip. A Reanimating
 * POV keeps its 'Reanimating' flow badge as its label, with no second heading.
 *
 * L74-17 (§6.12, §8.3): each resource pill flashes and floats its Δ (`useResourceFlash`,
 * `ResourceFlashCue`), and the POV's own Δ flies its chips from the log.
 *
 * L75-03 (§6.1 item 3, §6.4; plan A.5.2): `compact` draws one row, the thumb kit portrait and four
 * small pills whose captions are spoken (and in `title`), not shown, because four captioned pills do
 * not fit one row at 360 px. It is the full strip's one JSX tree with other class strings, sizes and
 * captions, never a second branch, so L75-13's band flip re-renders the same elements: the kit
 * portrait keeps its focus and every pill keeps its flash. Every anchor is the full strip's.
 *
 * L75-04 (§6.12; plan A.8.6): `tutorialHighlight` marks the resources row (`resources`) or the kit
 * portrait root (`kit`, through `KitPortrait dataAttributes`) for the board tour, in both strips.
 */

import type { KitId } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { useResourceFlash } from '../../fx/use-resource-flash';
import type { ResourceKind } from '../../ui/asset-lookup';
import { Card } from '../../ui/card/card';
import type { CardCounter } from '../../ui/card/card-face';
import { RESOURCE_ICON } from '../../ui/icons/icon-names';
import { KitPortrait } from '../../ui/kit/kit-portrait';
import { Badge } from '../../ui/primitives/badge';
import { Pill, type PillProps } from '../../ui/primitives/pill';
import { RESOURCE_CAPTIONS } from '../../ui/resource-captions';
import type { ThumbBadge } from '../../view-model/card-actions';
import { SELF_STRIP_POV_LABELS, type SelfFlowBadge, type SelfStripModel } from '../../view-model/self-strip';
import type { CardSheetSource } from './card-sheet-source';
import { ResourceFlashCue } from './resource-flash';
import { WatchingHeader } from './spectator-strip';

export interface SelfStripProps {
  /** `selfStrip(view, ctx)`, computed once in ArenaScreen (Appendix A.2); L74-13 reads `.dock` from the same value. */
  readonly model: SelfStripModel;
  /** The own kit portrait opens the kit sheet (§6.1 item 3). */
  readonly onOpenKit: (kitId: KitId) => void;
  /** A thumb opens the card sheet with source `{ kind: 'in-play', thumb }` (§6.6.1). */
  readonly onOpenCard: (source: CardSheetSource) => void;
  /** L74-23: the Watching header's Leave table; without it no header renders. */
  readonly onLeave?: () => void;
  /** L75-03: one row with a thumb portrait and small pills, captions spoken only. Default false: the full strip. */
  readonly compact?: boolean;
  /** L75-04: the board tour's mark on the resources row or the kit portrait; absent or null, none. */
  readonly tutorialHighlight?: 'resources' | 'kit' | null;
}

const OWN_KIT_LABEL = 'Inspect your kit';
const SENTENCE_TURNS_LABEL = 'Turns left';
/** V2's upgraded-shield pill text, verbatim (`private-zone.tsx`). */
const UPGRADED_SHIELD_LABEL = 'Shield ↑';
const DUPLICATION_ACTIVE_LABEL = 'Duplication active';

/** Ruling 1: only card lives and Invisibility's turns glow; Shield and Sentence never pass a counter. */
function counterFor(badge: ThumbBadge | null): { readonly counter?: CardCounter } {
  if (badge === null) {
    return {};
  }
  switch (badge.kind) {
    case 'card-lives':
      return { counter: { kind: 'card-lives', amount: badge.value } };
    case 'turns':
      return { counter: { kind: 'turns', amount: badge.value } };
    case 'sentence-turns':
      return {};
  }
}

/** `FlowStatusBadges` strings from V2; Invisibility's turns ride in the badge value. */
function FlowBadge({ badge }: { readonly badge: SelfFlowBadge }): ReactElement {
  switch (badge.kind) {
    case 'block':
      return <Badge icon="block" label={`Block · ${String(badge.turnsLeft)} left`} />;
    case 'attack-ban':
      return <Badge icon="block" label="Block · attacks banned" />;
    case 'invisibility':
      return (
        <Badge
          icon="invisibility"
          label="Invisible"
          {...(badge.turnsLeft !== null ? { value: badge.turnsLeft } : {})}
        />
      );
    case 'reanimating':
      return <Badge icon="reanimation-armed" label={SELF_STRIP_POV_LABELS.reanimating} />;
  }
}

/**
 * A resource pill that flashes and floats its own Δ (L74-17, spec v7 §6.12): the POV listens as
 * `self` and flies its chips (`useResourceFlash`). `data-resource-flash` is set only mid-flash.
 */
function FlashingPill(props: PillProps & { readonly resourceKind: ResourceKind; readonly value: number }): ReactElement {
  const flash = useResourceFlash({ kind: props.resourceKind, value: props.value });
  return (
    <span
      className="relative inline-flex rounded-v7-chrome-sm"
      {...(flash.tone !== null ? { 'data-resource-flash': flash.tone } : {})}
    >
      <Pill {...props} />
      <ResourceFlashCue flash={flash} />
    </span>
  );
}

export function SelfStrip({
  model,
  onOpenKit,
  onOpenCard,
  onLeave,
  compact = false,
  tutorialHighlight = null,
}: SelfStripProps): ReactElement | null {
  const { kitId, resources } = model;
  if (kitId === null || resources === null) {
    return null;
  }
  // One tree for both strips (L75-03): `compact` only switches these strings, sizes and captions.
  const pillSize = compact ? 'sm' : 'md';
  const hasFlowBadges = model.flowBadges.length > 0 || model.connectionLabel !== null || model.duplicationActive;
  // Compact: the badges take their own line below the row; `mt-2` only with a badge, so an empty one adds no height.
  const flowBadgesClass = !compact
    ? 'flex flex-wrap items-center gap-1.5'
    : hasFlowBadges
      ? 'flex basis-full flex-wrap items-center gap-1.5 mt-2'
      : 'flex basis-full flex-wrap items-center gap-1.5';
  return (
    <div
      data-self-strip={compact ? 'compact' : 'full'}
      className={`flex w-full flex-col gap-2 ${compact ? 'px-2 py-1' : 'px-4 py-2'}`}
    >
      {model.pov === 'watching' && model.leave && onLeave !== undefined ? <WatchingHeader model={model} onLeave={onLeave} /> : null}
      <div className={compact ? 'flex min-w-0 flex-wrap items-center gap-x-2' : 'flex items-start gap-3'}>
        <KitPortrait
          kitId={kitId}
          size={compact ? 'thumb' : 'tile'}
          onClick={() => {
            onOpenKit(kitId);
          }}
          ariaLabel={OWN_KIT_LABEL}
          {...(tutorialHighlight === 'kit' ? { dataAttributes: { 'data-tutorial-highlight': 'kit' } } : {})}
        />
        <div className={compact ? 'contents' : 'flex min-w-0 flex-1 flex-col gap-2'}>
          <div
            data-zone="resources"
            data-hint-anchor="resources"
            {...(tutorialHighlight === 'resources' ? { 'data-tutorial-highlight': 'resources' } : {})}
            className={compact ? 'flex min-w-0 items-center gap-1.5' : 'flex flex-wrap items-center gap-2'}
          >
            <FlashingPill
              icon={RESOURCE_ICON.life}
              label={RESOURCE_CAPTIONS.life}
              value={resources.lives}
              resourceKind="life"
              size={compact ? 'sm' : 'lg'}
              captionVisible={!compact}
            />
            <FlashingPill
              icon={RESOURCE_ICON.shield}
              label={RESOURCE_CAPTIONS.shield}
              value={resources.shield}
              resourceKind="shield"
              size={pillSize}
              captionVisible={!compact}
            />
            {resources.shieldIsUpgraded ? <Badge label={UPGRADED_SHIELD_LABEL} tone="shield" /> : null}
            <FlashingPill
              icon={RESOURCE_ICON.point}
              label={RESOURCE_CAPTIONS.point}
              value={resources.points}
              resourceKind="point"
              size={pillSize}
              captionVisible={!compact}
            />
            <FlashingPill
              icon={RESOURCE_ICON.upgradePoint}
              label={RESOURCE_CAPTIONS.upgradePoint}
              value={resources.upgradePoints}
              resourceKind="upgradePoint"
              size={pillSize}
              captionVisible={!compact}
            />
          </div>
          <div className={flowBadgesClass}>
            {model.flowBadges.map((badge) => (
              <FlowBadge key={badge.kind} badge={badge} />
            ))}
            {model.connectionLabel !== null ? <Badge icon="disconnected" label={model.connectionLabel} /> : null}
            {model.duplicationActive ? <Badge icon="duplication-active" label={DUPLICATION_ACTIVE_LABEL} /> : null}
          </div>
        </div>
      </div>
      {model.thumbs.length > 0 ? (
        <ul aria-label="Active cards" className="flex flex-wrap items-start gap-2 pb-3">
          {model.thumbs.map((thumb) => (
            <li key={thumb.instance.instanceId} className="flex flex-col items-center gap-1">
              <Card
                size="thumb"
                instance={thumb.instance}
                {...counterFor(thumb.badge)}
                onActivate={() => {
                  onOpenCard({ kind: 'in-play', thumb });
                }}
              />
              {thumb.badge?.kind === 'sentence-turns' ? (
                <Badge
                  icon="sentence-ticking"
                  label={SENTENCE_TURNS_LABEL}
                  labelHidden
                  value={thumb.badge.value}
                  tone="threat-attack"
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
