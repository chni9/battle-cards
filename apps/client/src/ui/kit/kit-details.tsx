/**
 * KitDetails — technical spec v7 §4.2 (shared pieces), §6.6.5 (the kit sheet shows every
 * current section), §5.5 (every value comes from `KIT_CATALOG`, never from the art), §7.3 (the
 * kit picker's description step) and §11 (portrait `alt` = kit name). Appendix A:
 * `kit-inspect-dialog`, `lobby-kit-picker-dialog`, `home-solo-kit-picker`; L27-05 (duplicate
 * specials keep their own keys), L30-05 (every `KitTraits` field has a section), L51-04
 * (versos with counts). L72-15. It replaces `screens/table/kit-inspect-details.tsx` on V7
 * surfaces; that file and its duplicated copy stay until L75 and L76.
 *
 * - **Sections:** a header (the sheet portrait and the kit name), then the groups of
 *   `KIT_DETAILS_SECTION_IDS`, each a labelled `<section data-kit-section>` with an `<h3>`, in
 *   that order (the test pins it). The ability group renders only for a kit with
 *   `KIT_ABILITY_COPY`. All visible copy is the V6 copy, verbatim.
 * - **Cards:** the starting hand is one hidden thumb per family (an action and an attack verso)
 *   with its count, so no "N action · M attack" prose; special and trait cards are thumb
 *   `Card`s. A thumb prints no name, so each carries a visible caption. The Card's own upgraded
 *   badge replaces the V2 "↑". Card needs a `CardInstance`, so the synthetic instance ids are
 *   `kitSpecialCardKey(cardId, index)` (index keeps Specialist's duplicates apart),
 *   `always-upgraded:<cardId>` and `immune-to:<cardId>`.
 * - **Costs:** a thumb prints no cost chip (L72-12), so a special's play cost is a signed
 *   `CostAmount` under its caption; Draw and the upgrade-point prices are `CostAmount` too, so
 *   every amount is an icon plus a number with spoken text.
 * - **Read-only:** no face is a button; the sheet around the details owns Select (§7.3).
 */

import { getCard, getKit, upgradePointBuyCost, upgradePointSellYield, type CardId, type KitId } from '@card-battle/shared';
import { useId, type ReactElement, type ReactNode } from 'react';
import { KIT_ABILITY_COPY } from '../../view-model/kit-inspect-traits';
import { kitSpecialCardKey } from '../../view-model/kit-special-card-key';
import { Card } from '../card/card';
import { cardCostChip } from '../card/card-face';
import { CostAmount } from '../card/cost-amount';
import { RESOURCE_ICON } from '../icons/icon-names';
import { CHROME_SHAPE_SM_CLASS } from '../primitives/chrome-classes';
import { Pill } from '../primitives/pill';
import { RESOURCE_CAPTIONS } from '../resource-captions';
import { KIT_DETAILS_SECTION_TITLES, type KitDetailsSectionId } from './kit-details-sections';
import { KitPortrait } from './kit-portrait';

export interface KitDetailsProps {
  kitId: KitId;
}

const PROSE_CLASS = 'font-v7-body text-v7-body leading-snug font-bold text-v7-text-2';
const HINT_CLASS = 'mb-2 font-v7-body text-v7-caption leading-snug font-bold text-v7-text-2';
const LIST_CLASS = 'flex flex-wrap gap-3';
const CAPTION_CLASS = 'font-v7-body text-v7-caption font-bold text-v7-text-2';
const AMOUNT_CLASS = 'font-v7-body text-v7-body font-extrabold text-v7-text';

function Group({ id, children }: { id: KitDetailsSectionId; children: ReactNode }): ReactElement {
  const headingId = useId();
  return (
    <section data-kit-section={id} aria-labelledby={headingId} className="rounded-v7-chrome-sm bg-v7-panel-2 p-3">
      <h3 id={headingId} className="font-v7-display text-v7-body text-v7-text">
        {KIT_DETAILS_SECTION_TITLES[id]}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * A thumb prints no name, so the name stays visible under it (the V2 caption, without "↑"). The
 * columns are left-aligned, so every thumb in the sheet shares the hand thumbs' left edge.
 */
function Caption({ cardId }: { cardId: CardId }): ReactElement {
  return (
    <span data-card-caption className={`${CAPTION_CLASS} text-left`}>
      {getCard(cardId)?.name ?? cardId}
    </span>
  );
}

/** The always-upgraded and immune-to lists: "None", or one thumb with its caption per card. */
function TraitCards({
  cardIds,
  instancePrefix,
  isUpgraded,
}: {
  cardIds: readonly CardId[];
  instancePrefix: 'always-upgraded' | 'immune-to';
  isUpgraded: boolean;
}): ReactElement {
  if (cardIds.length === 0) {
    return <p className={PROSE_CLASS}>None</p>;
  }
  return (
    <ul className={LIST_CLASS}>
      {cardIds.map((cardId) => (
        <li key={cardId} className="flex w-20 flex-col items-start gap-1">
          <Card size="thumb" instance={{ instanceId: `${instancePrefix}:${cardId}`, cardId, isUpgraded }} />
          <Caption cardId={cardId} />
        </li>
      ))}
    </ul>
  );
}

export function KitDetails({ kitId }: KitDetailsProps): ReactElement {
  const kit = getKit(kitId);
  const { startingResources: res, startingCardCounts: counts, traits } = kit;
  const abilityCopy = KIT_ABILITY_COPY[kitId];
  const resources = [
    ['life', 'life', res.lives],
    ['point', 'point', res.points],
    ['upgradePoint', 'upgrade', res.upgradePoints],
  ] as const;
  const hand = [
    ['action', 'Action', counts.action],
    ['attack', 'Attack', counts.attack],
  ] as const;

  return (
    <div data-kit-id={kitId} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <KitPortrait kitId={kitId} size="sheet" />
        <p data-kit-name="" className="min-w-0 break-words font-v7-display text-v7-title text-v7-text">
          {kit.name}
        </p>
      </div>

      <Group id="starting-resources">
        <div className="flex flex-wrap items-center gap-2">
          {resources.map(([kind, tone, value]) => (
            <Pill
              key={kind}
              icon={RESOURCE_ICON[kind]}
              label={RESOURCE_CAPTIONS[kind]}
              value={value}
              resourceKind={kind}
              tone={tone}
            />
          ))}
          <span
            data-kit-stat="draw"
            title="Draw action points"
            className={`inline-flex min-h-9 items-center gap-1.5 bg-v7-panel-2 px-2 ${CHROME_SHAPE_SM_CLASS} ${AMOUNT_CLASS}`}
          >
            Draw{' '}
            <CostAmount amount={{ kind: 'points', amount: res.draw }} signed="gain" title={null} size="sm" />
          </span>
        </div>
      </Group>

      <Group id="starting-hand">
        <p className={HINT_CLASS}>Random draws from action and attack cards. Duplicates are possible.</p>
        <ul className={LIST_CLASS}>
          {hand.map(([family, label, count]) => (
            <li key={family} data-hand-family={family} className="flex items-center gap-2">
              <Card face="hidden" family={family} size="thumb" />
              <div className="flex flex-col">
                <span className={CAPTION_CLASS}>{label}</span>
                <span className={`${AMOUNT_CLASS} tabular-nums`}>×{count}</span>
              </div>
            </li>
          ))}
        </ul>
      </Group>

      <Group id="special-cards">
        {kit.specialCards.length > 0 ? (
          <ul className={LIST_CLASS}>
            {kit.specialCards.map((cardId, index) => {
              const key = kitSpecialCardKey(cardId, index);
              const cost = cardCostChip(cardId, false);
              return (
                <li key={key} data-special-key={key} className="flex w-20 flex-col items-start gap-1">
                  <Card size="thumb" instance={{ instanceId: key, cardId, isUpgraded: false }} />
                  <Caption cardId={cardId} />
                  {/* `mt-auto` lines the costs up when one name wraps to two lines and another does not. */}
                  {cost !== null ? (
                    <CostAmount amount={cost} signed="cost" size="sm" className={`mt-auto ${AMOUNT_CLASS}`} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Group>

      <Group id="always-upgraded">
        <TraitCards cardIds={traits.alwaysUpgraded} instancePrefix="always-upgraded" isUpgraded />
      </Group>

      <Group id="immune-to">
        <TraitCards cardIds={traits.immuneTo} instancePrefix="immune-to" isUpgraded={false} />
      </Group>

      <Group id="attacks-per-turn">
        <p className={PROSE_CLASS}>
          {traits.allowsMultipleAttacksPerTurn
            ? 'May play several attack cards as one action'
            : 'One attack card per action'}
        </p>
      </Group>

      <Group id="upgrade-points">
        <div className={`flex flex-wrap gap-3 ${PROSE_CLASS}`}>
          <span data-kit-stat="upgrade-point-buy" className="inline-flex items-center gap-1">
            Buy{' '}
            <CostAmount
              amount={{ kind: 'points', amount: upgradePointBuyCost(kitId) }}
              signed="cost"
              size="sm"
              className={AMOUNT_CLASS}
            />
          </span>
          <span data-kit-stat="upgrade-point-sell" className="inline-flex items-center gap-1">
            Sell{' '}
            <CostAmount
              amount={{ kind: 'points', amount: upgradePointSellYield(kitId) }}
              signed="gain"
              size="sm"
              className={AMOUNT_CLASS}
            />
          </span>
        </div>
      </Group>

      <Group id="draw-risk">
        <p className={PROSE_CLASS}>
          {traits.drawBustDenominator !== undefined
            ? `1 in ${String(traits.drawBustDenominator)} chance each Draw drops this player to 1 life, 0 points, 0 upgrade points, and no shield, and moves their hand and unplayed specials to the pool. Active cards stay. They are not eliminated.`
            : 'None'}
        </p>
      </Group>

      {abilityCopy !== undefined ? (
        <Group id="ability">
          <p className={PROSE_CLASS}>{abilityCopy}</p>
        </Group>
      ) : null}
    </div>
  );
}
