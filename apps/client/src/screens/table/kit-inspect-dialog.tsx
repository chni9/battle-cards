/**
 * Kit inspect Dialog — static roster facts from getKit / getCard (rules spec §4).
 * Visual summary only; no rule logic.
 */

import { getCard, getKit, type KitId } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Dialog } from '../../design/components/dialog';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';
import { getCardArtUrl } from '../../design/asset-lookup';

export interface KitInspectDialogProps {
  open: boolean;
  kitId: KitId;
  onClose: () => void;
}

export function KitInspectDialog({
  open,
  kitId,
  onClose,
}: KitInspectDialogProps): ReactElement {
  const kit = getKit(kitId);
  const { startingResources: res, startingCardCounts: counts, traits } = kit;

  return (
    <Dialog
      open={open}
      title={kit.name}
      onClose={onClose}
      panelClassName="max-w-lg"
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
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
              {kit.specialCards.map((cardId) => {
                const def = getCard(cardId);
                return (
                  <li
                    key={cardId}
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

          {traits.alwaysUpgraded.length > 0 && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                Always upgraded
              </h3>
              <ul className="mt-1.5 flex flex-wrap gap-2">
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
            </section>
          )}

          {traits.immuneTo.length > 0 && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                Immune to
              </h3>
              <p className="mt-1 text-sm text-ink">
                {traits.immuneTo
                  .map((id) => getCard(id)?.name ?? id)
                  .join(', ')}
              </p>
            </section>
          )}

          {traits.allowsMultipleAttacksPerTurn && (
            <p className="rounded-[length:var(--radius-badge)] bg-cta-purple/10 px-2 py-1 text-sm font-medium text-ink">
              May play several attack cards as one action
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
