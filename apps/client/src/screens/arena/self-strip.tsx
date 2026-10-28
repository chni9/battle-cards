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
 * and no resources (Q38), so it gets no strip here: L74-23 owns the Watching strip.
 */

import type { KitId } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Card } from '../../ui/card/card';
import type { CardCounter } from '../../ui/card/card-face';
import { RESOURCE_ICON } from '../../ui/icons/icon-names';
import { KitPortrait } from '../../ui/kit/kit-portrait';
import { Badge } from '../../ui/primitives/badge';
import { Pill } from '../../ui/primitives/pill';
import { RESOURCE_CAPTIONS } from '../../ui/resource-captions';
import type { ThumbBadge } from '../../view-model/card-actions';
import { SELF_STRIP_POV_LABELS, type SelfFlowBadge, type SelfStripModel } from '../../view-model/self-strip';
import type { CardSheetSource } from './card-sheet-source';

export interface SelfStripProps {
  /** `selfStrip(view, ctx)`, computed once in ArenaScreen (Appendix A.2); L74-13 reads `.dock` from the same value. */
  readonly model: SelfStripModel;
  /** The own kit portrait opens the kit sheet (§6.1 item 3). */
  readonly onOpenKit: (kitId: KitId) => void;
  /** A thumb opens the card sheet with source `{ kind: 'in-play', thumb }` (§6.6.1). */
  readonly onOpenCard: (source: CardSheetSource) => void;
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

export function SelfStrip({ model, onOpenKit, onOpenCard }: SelfStripProps): ReactElement | null {
  const { kitId, resources } = model;
  if (kitId === null || resources === null) {
    return null;
  }
  return (
    <div data-self-strip="" className="flex w-full flex-col gap-2 px-4 py-2">
      <div className="flex items-start gap-3">
        <KitPortrait
          kitId={kitId}
          size="tile"
          onClick={() => {
            onOpenKit(kitId);
          }}
          ariaLabel={OWN_KIT_LABEL}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div data-zone="resources" data-hint-anchor="resources" className="flex flex-wrap items-center gap-2">
            <Pill
              icon={RESOURCE_ICON.life}
              label={RESOURCE_CAPTIONS.life}
              value={resources.lives}
              resourceKind="life"
              size="lg"
              captionVisible
            />
            <Pill
              icon={RESOURCE_ICON.shield}
              label={RESOURCE_CAPTIONS.shield}
              value={resources.shield}
              resourceKind="shield"
              captionVisible
            />
            {resources.shieldIsUpgraded ? <Badge label={UPGRADED_SHIELD_LABEL} tone="shield" /> : null}
            <Pill
              icon={RESOURCE_ICON.point}
              label={RESOURCE_CAPTIONS.point}
              value={resources.points}
              resourceKind="point"
              captionVisible
            />
            <Pill
              icon={RESOURCE_ICON.upgradePoint}
              label={RESOURCE_CAPTIONS.upgradePoint}
              value={resources.upgradePoints}
              resourceKind="upgradePoint"
              captionVisible
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
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
