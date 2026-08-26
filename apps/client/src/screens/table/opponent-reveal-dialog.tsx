/**
 * Spy / death reveal — shown on click so the opponent seat stays compact on mobile.
 * Replaces KitInspectDialog for revealed opponents (live hand + resources, not roster).
 * Base Spy resources stay `?`; upgraded Spy and death reveal show numbers (L51-08).
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
  onClose,
  onInspectCard,
}: OpponentRevealDialogProps): ReactElement {
  const kit = getKit(kitId);
  const known =
    lives !== undefined &&
    points !== undefined &&
    upgradePoints !== undefined &&
    shield !== undefined;

  return (
    <Dialog
      open={open}
      title={mode === 'elimination' ? `${nickname} (eliminated)` : nickname}
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

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              Resources
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <ResourceIcon
                kind="life"
                value={known ? lives : 'unknown'}
                flyToken={false}
              />
              <ResourceIcon
                kind="point"
                value={known ? points : 'unknown'}
                flyToken={false}
              />
              <ResourceIcon
                kind="upgradePoint"
                value={known ? upgradePoints : 'unknown'}
                flyToken={false}
              />
              <ResourceIcon
                kind="shield"
                value={known ? shield : 'unknown'}
                flyToken={false}
              />
            </div>
          </section>

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
