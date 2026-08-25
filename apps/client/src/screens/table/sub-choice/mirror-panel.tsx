/**
 * Mirror sub-choice — L44-03 / technical spec v6 §6.4.
 * Same resolve payload as before.
 */

import {
  formatCardLabel,
  type CardInstance,
  type MirrorChoiceRequiredPayload,
  type PlayingStateView,
  type PublicPlayerView,
  type ResolveSubChoicePayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import { CardChoiceTile } from '../../../design/components/card-choice-tile';
import { PlayerName } from '../../../design/components/player-name';
import { SeatTile } from '../../../design/components/seat-tile';
import { nicknameOf, visibleKitId } from '../table-helpers';

export interface MirrorPanelProps {
  subChoice: MirrorChoiceRequiredPayload;
  view: PlayingStateView;
  opponents: readonly PublicPlayerView[];
  onResolve: (payload: Extract<ResolveSubChoicePayload, { kind: 'mirror' }>) => void;
}

export function MirrorPanel({
  subChoice,
  view,
  opponents,
  onResolve,
}: MirrorPanelProps): ReactElement {
  const aliveOpponents = opponents.filter((player) => !player.isEliminated);
  const defaultTarget = aliveOpponents[0]?.id ?? '';

  const [effectId, setEffectId] = useState('');
  const [targetId, setTargetId] = useState('');

  const eligibleEffects = view.pendingEffects.filter((effect) =>
    subChoice.eligibleEffectIds.includes(effect.id),
  );

  const resolvedEffectId = subChoice.eligibleEffectIds.includes(effectId)
    ? effectId
    : (subChoice.eligibleEffectIds[0] ?? '');

  const resolvedTargetId = aliveOpponents.some((player) => player.id === targetId)
    ? targetId
    : defaultTarget;

  const ready = resolvedEffectId !== '' && resolvedTargetId !== '';

  return (
    <>
      <p className="text-sm text-ink-muted">
        Choose which pending attack to redirect and its new target.
      </p>
      <p className="mt-3 text-sm font-medium text-ink">Pending attack</p>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {eligibleEffects.map((effect) => {
          const instance: CardInstance = {
            instanceId: effect.id,
            cardId: effect.cardId,
            isUpgraded: effect.isUpgraded,
          };
          const name = formatCardLabel(effect.cardId, effect.isUpgraded);
          const sourceName = nicknameOf(view, effect.sourcePlayerId);
          return (
            <li key={effect.id}>
              <CardChoiceTile
                instance={instance}
                caption={name}
                selected={resolvedEffectId === effect.id}
                ariaLabel={`${sourceName}'s ${name} → you`}
                onSelect={() => {
                  setEffectId(effect.id);
                }}
                meta={
                  <span className="mt-0.5 w-full truncate text-center text-[11px] font-medium text-ink-muted">
                    <PlayerName
                      nickname={sourceName}
                      playerId={effect.sourcePlayerId}
                      view={view}
                    />
                    {' → you'}
                  </span>
                }
              />
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm font-medium text-ink">New target</p>
      <ul className="mt-2 grid grid-cols-2 gap-3 p-2 sm:grid-cols-3">
        {aliveOpponents.map((player) => (
          <li key={player.id}>
            <SeatTile
              view={view}
              playerId={player.id}
              nickname={player.nickname}
              kitId={visibleKitId(player)}
              selected={resolvedTargetId === player.id}
              onSelect={() => {
                setTargetId(player.id);
              }}
            />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button
          variant="green"
          disabled={!ready}
          onClick={() => {
            if (!ready) {
              return;
            }
            onResolve({
              kind: 'mirror',
              pendingEffectId: resolvedEffectId,
              newTargetPlayerId: resolvedTargetId,
            });
          }}
        >
          Confirm redirect
        </Button>
      </div>
    </>
  );
}
