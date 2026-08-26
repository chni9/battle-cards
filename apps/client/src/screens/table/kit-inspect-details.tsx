/**
 * Shared kit roster details — rules spec §4 / L51-04.
 * Used by inspect Dialog and lobby picker.
 */

import {
  getCard,
  getKit,
  upgradePointBuyCost,
  upgradePointSellYield,
  type CardId,
  type KitId,
} from '@card-battle/shared';
import type { ReactElement, ReactNode } from 'react';

import { getCardArtUrl, getCardBackUrl } from '../../design/asset-lookup';
import { CostDisplay } from '../../design/components/cost-display';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';
import { structuredCostFromCardCost } from '../../design/components/structured-cost';
import { KIT_ABILITY_COPY } from './kit-inspect-traits';
import { kitSpecialCardKey } from './kit-special-card-key';

export interface KitInspectDetailsProps {
  kitId: KitId;
}

function Group({
  title,
  trait = false,
  children,
}: {
  title: string;
  trait?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <section
      {...(trait ? { 'data-trait-section': '' } : {})}
      className="rounded-[length:var(--radius-card)] border border-border-soft bg-surface px-3 py-2.5"
    >
      <h3 className="text-xs font-semibold tracking-wide text-ink">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function VersoCount({
  type,
  count,
  label,
}: {
  type: 'action' | 'attack';
  count: number;
  label: string;
}): ReactElement {
  return (
    <li className="flex items-center gap-2 rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-1.5">
      <img
        src={getCardBackUrl(type)}
        alt=""
        className="h-14 w-10 object-contain"
        draggable={false}
      />
      <div>
        <p className="text-xs font-semibold text-ink">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-ink">×{count}</p>
      </div>
    </li>
  );
}

function CardThumb({
  cardId,
  isUpgraded,
  caption,
  cost,
}: {
  cardId: CardId;
  isUpgraded: boolean;
  caption: string;
  cost?: ReactNode;
}): ReactElement {
  return (
    <li className="w-[5.5rem] rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-1">
      <img
        src={getCardArtUrl(cardId, { isUpgraded })}
        alt=""
        className="aspect-[2/3] w-full object-contain"
        draggable={false}
      />
      <p className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-ink">
        {caption}
      </p>
      {cost !== undefined ? (
        <div className="mt-0.5 flex justify-center text-[10px] text-ink">{cost}</div>
      ) : null}
    </li>
  );
}

export function KitInspectDetails({ kitId }: KitInspectDetailsProps): ReactElement {
  const kit = getKit(kitId);
  const { startingResources: res, startingCardCounts: counts, traits } = kit;
  const abilityCopy = KIT_ABILITY_COPY[kitId];
  const buyCost = upgradePointBuyCost(kitId);
  const sellYield = upgradePointSellYield(kitId);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <KitPortrait kitId={kitId} className="mx-auto w-24 shrink-0 sm:mx-0" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <Group title="Starting resources">
          <div className="flex flex-wrap items-center gap-2">
            <ResourceIcon kind="life" value={res.lives} label="Lives" flyToken={false} />
            <ResourceIcon kind="point" value={res.points} label="Points" flyToken={false} />
            <ResourceIcon
              kind="upgradePoint"
              value={res.upgradePoints}
              label="Upgrade points"
              flyToken={false}
            />
            <span
              className="inline-flex items-center gap-1 rounded-[length:var(--radius-badge)] border border-border-soft bg-surface-raised px-2 py-1 text-xs font-semibold text-ink"
              title="Draw action points"
            >
              Draw{' '}
              <CostDisplay
                cost={{ kind: 'points', amount: res.draw }}
                signed="gain"
                className="text-inherit"
              />
            </span>
          </div>
        </Group>

        <Group title="Starting hand">
          <p className="mb-2 text-[11px] leading-snug text-ink-muted">
            Random draws from action and attack cards. Duplicates are possible.
          </p>
          <ul className="flex flex-wrap gap-2">
            <VersoCount type="action" count={counts.action} label="Action" />
            <VersoCount type="attack" count={counts.attack} label="Attack" />
          </ul>
        </Group>

        <Group title="Special cards">
          <ul className="flex flex-wrap gap-2">
            {kit.specialCards.map((cardId, index) => {
              const def = getCard(cardId);
              const playCost = structuredCostFromCardCost(def?.cost);
              return (
                <CardThumb
                  key={kitSpecialCardKey(cardId, index)}
                  cardId={cardId}
                  isUpgraded={false}
                  caption={def?.name ?? cardId}
                  {...(playCost !== null
                    ? {
                        cost: <CostDisplay cost={playCost} signed="cost" />,
                      }
                    : {})}
                />
              );
            })}
          </ul>
        </Group>

        <Group title="Always upgraded" trait>
          {traits.alwaysUpgraded.length === 0 ? (
            <p className="text-sm text-ink-muted">None</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {traits.alwaysUpgraded.map((cardId) => {
                const def = getCard(cardId);
                return (
                  <CardThumb
                    key={cardId}
                    cardId={cardId}
                    isUpgraded
                    caption={`${def?.name ?? cardId} ↑`}
                  />
                );
              })}
            </ul>
          )}
        </Group>

        <Group title="Immune to" trait>
          {traits.immuneTo.length === 0 ? (
            <p className="text-sm text-ink-muted">None</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {traits.immuneTo.map((cardId) => {
                const def = getCard(cardId);
                return (
                  <CardThumb
                    key={cardId}
                    cardId={cardId}
                    isUpgraded={false}
                    caption={def?.name ?? cardId}
                  />
                );
              })}
            </ul>
          )}
        </Group>

        <Group title="Attacks per turn" trait>
          <p className="text-sm leading-snug text-ink">
            {traits.allowsMultipleAttacksPerTurn
              ? 'May play several attack cards as one action'
              : 'One attack card per action'}
          </p>
        </Group>

        <Group title="Upgrade points" trait>
          <div className="flex flex-wrap gap-3 text-sm text-ink">
            <span className="inline-flex items-center gap-1">
              Buy{' '}
              <CostDisplay
                cost={{ kind: 'points', amount: buyCost }}
                signed="cost"
                className="text-inherit"
              />
            </span>
            <span className="inline-flex items-center gap-1">
              Sell{' '}
              <CostDisplay
                cost={{ kind: 'points', amount: sellYield }}
                signed="gain"
                className="text-inherit"
              />
            </span>
          </div>
        </Group>

        {abilityCopy !== undefined && (
          <Group title="Ability">
            <p className="text-sm leading-snug text-ink">{abilityCopy}</p>
          </Group>
        )}
      </div>
    </div>
  );
}
