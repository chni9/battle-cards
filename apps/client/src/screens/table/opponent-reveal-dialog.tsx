/**
 * Spy / death reveal — shown on click so the opponent seat stays compact on mobile.
 * Replaces KitInspectDialog for revealed opponents (live hand + resources, not roster).
 */

import { getKit, type CardInstance, type KitId } from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Card } from '../../design/components/card';
import { Dialog } from '../../design/components/dialog';
import { KitPortrait } from '../../design/components/kit-portrait';
import { ResourceIcon } from '../../design/components/resource-icon';

export interface OpponentRevealDialogProps {
  open: boolean;
  nickname: string;
  mode: 'spy' | 'elimination';
  kitId: KitId;
  hand: readonly CardInstance[];
  specialCards: readonly CardInstance[];
  lives?: number | undefined;
  points?: number | undefined;
  upgradePoints?: number | undefined;
  shield?: number | undefined;
  /** Base Spy frozen snapshot when live resources are absent. */
  resourcesSnapshot?:
    | {
        lives: number;
        points: number;
        upgradePoints: number;
        shield: number;
      }
    | undefined;
  onClose: () => void;
  onInspectCard?: ((instanceId: string) => void) | undefined;
}

export function OpponentRevealDialog({
  open,
  nickname,
  mode,
  kitId,
  hand,
  specialCards,
  lives,
  points,
  upgradePoints,
  shield,
  resourcesSnapshot,
  onClose,
  onInspectCard,
}: OpponentRevealDialogProps): ReactElement {
  const kit = getKit(kitId);
  const showLives = lives ?? resourcesSnapshot?.lives;
  const showPoints = points ?? resourcesSnapshot?.points;
  const showUpgrade = upgradePoints ?? resourcesSnapshot?.upgradePoints;
  const showShield = shield ?? resourcesSnapshot?.shield;
  const hasResources =
    showLives !== undefined ||
    showPoints !== undefined ||
    showUpgrade !== undefined ||
    showShield !== undefined;
  const snapshotOnly =
    lives === undefined && resourcesSnapshot !== undefined;

  return (
    <Dialog
      open={open}
      title={mode === 'elimination' ? `${nickname} (eliminated)` : `${nickname} — Spy`}
      onClose={onClose}
      panelClassName="max-w-lg"
      actions={
        <Button variant="green" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <KitPortrait kitId={kitId} nickname={nickname} className="mx-auto w-24 shrink-0 sm:mx-0" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-semibold text-ink">{kit.name}</p>

          {hasResources && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                {snapshotOnly ? 'Resources (at Spy)' : 'Resources'}
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {showLives !== undefined && (
                  <ResourceIcon kind="life" value={showLives} flyToken={false} />
                )}
                {showPoints !== undefined && (
                  <ResourceIcon kind="point" value={showPoints} flyToken={false} />
                )}
                {showUpgrade !== undefined && (
                  <ResourceIcon kind="upgradePoint" value={showUpgrade} flyToken={false} />
                )}
                {showShield !== undefined && (
                  <ResourceIcon kind="shield" value={showShield} flyToken={false} />
                )}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              Hand
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {hand.length === 0 ? (
                <p className="text-sm text-ink-muted">Empty</p>
              ) : (
                hand.map((card) => (
                  <Card
                    key={card.instanceId}
                    instance={card}
                    detail="thumb"
                    className="w-12 !p-0.5"
                    {...(onInspectCard !== undefined
                      ? {
                          onSelect: () => {
                            onInspectCard(card.instanceId);
                          },
                        }
                      : {})}
                  />
                ))
              )}
            </div>
          </section>

          {specialCards.length > 0 && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                Specials
              </h3>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {specialCards.map((card) => (
                  <Card
                    key={card.instanceId}
                    instance={card}
                    detail="thumb"
                    className="w-12 !p-0.5"
                    {...(onInspectCard !== undefined
                      ? {
                          onSelect: () => {
                            onInspectCard(card.instanceId);
                          },
                        }
                      : {})}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Dialog>
  );
}
