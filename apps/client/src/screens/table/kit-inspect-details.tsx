/**
 * Shared kit roster details — rules spec §4. Used by inspect Dialog and lobby picker.
 */

import { getCard, getKit, type KitId } from '@card-battle/shared';
import type { ReactElement, ReactNode } from 'react';

import { getCardArtUrl } from '../../design/asset-lookup';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';
import { KIT_ABILITY_COPY } from './kit-inspect-traits';
import { kitSpecialCardKey } from './kit-special-card-key';

export interface KitInspectDetailsProps {
  kitId: KitId;
}

function TraitSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section data-trait-section="">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

export function KitInspectDetails({ kitId }: KitInspectDetailsProps): ReactElement {
  const kit = getKit(kitId);
  const { startingResources: res, startingCardCounts: counts, traits } = kit;
  const abilityCopy = KIT_ABILITY_COPY[kitId];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <KitPortrait kitId={kitId} className="mx-auto w-24 shrink-0 sm:mx-0" />
      <div className="min-w-0 flex-1 space-y-3">
        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Starting resources
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <ResourceIcon kind="life" value={res.lives} label="Lives" flyToken={false} />
            <ResourceIcon kind="point" value={res.points} label="Points" flyToken={false} />
            <ResourceIcon
              kind="upgradePoint"
              value={res.upgradePoints}
              label="Upgrade points"
              flyToken={false}
            />
            <span
              className="inline-flex items-center gap-1 rounded-[length:var(--radius-badge)] border border-border-soft bg-surface px-2 py-1 text-xs font-semibold tabular-nums text-ink"
              title="Draw action points"
            >
              Draw +{res.draw}
            </span>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Starting hand (random draws)
          </h3>
          <p className="mt-1 text-sm text-ink">
            {counts.action} action · {counts.attack} attack
          </p>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Special cards
          </h3>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {kit.specialCards.map((cardId, index) => {
              const def = getCard(cardId);
              return (
                <li
                  key={kitSpecialCardKey(cardId, index)}
                  className="w-[5.5rem] rounded-[length:var(--radius-card)] border border-border-soft bg-surface-raised p-1"
                >
                  <img
                    src={getCardArtUrl(cardId, { isUpgraded: false })}
                    alt=""
                    className="aspect-[2/3] w-full object-contain"
                    draggable={false}
                  />
                  <p className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-ink">
                    {def?.name ?? cardId}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <TraitSection title="Always upgraded">
          {traits.alwaysUpgraded.length === 0 ? (
            <p className="text-sm text-ink-muted">None</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {traits.alwaysUpgraded.map((cardId) => {
                const def = getCard(cardId);
                return (
                  <li
                    key={cardId}
                    className="w-[5.5rem] rounded-[length:var(--radius-card)] border border-cta-purple/40 bg-surface-raised p-1"
                  >
                    <img
                      src={getCardArtUrl(cardId, { isUpgraded: true })}
                      alt=""
                      className="aspect-[2/3] w-full object-contain"
                      draggable={false}
                    />
                    <p className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-ink">
                      {def?.name ?? cardId} ↑
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </TraitSection>

        <TraitSection title="Immune to">
          {traits.immuneTo.length === 0 ? (
            <p className="text-sm text-ink-muted">None</p>
          ) : (
            <p className="text-sm text-ink">
              {traits.immuneTo.map((id) => getCard(id)?.name ?? id).join(', ')}
            </p>
          )}
        </TraitSection>

        <TraitSection title="Multiple attacks per turn">
          <p className="text-sm text-ink">
            {traits.allowsMultipleAttacksPerTurn
              ? 'May play several attack cards as one action'
              : 'No — one attack card per action'}
          </p>
        </TraitSection>

        <TraitSection title="Upgrade-point buy cost">
          <p className="text-sm text-ink">
            {traits.upgradePointBuyCost !== undefined
              ? `${String(traits.upgradePointBuyCost)} points (kit override)`
              : 'Default (10 points)'}
          </p>
        </TraitSection>

        <TraitSection title="Upgrade-point sell yield">
          <p className="text-sm text-ink">
            {traits.upgradePointSellYield !== undefined
              ? `${String(traits.upgradePointSellYield)} points (kit override)`
              : 'Default (7 points)'}
          </p>
        </TraitSection>

        {abilityCopy !== undefined && (
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              Ability
            </h3>
            <p className="mt-1 text-sm text-ink">{abilityCopy}</p>
          </section>
        )}
      </div>
    </div>
  );
}
