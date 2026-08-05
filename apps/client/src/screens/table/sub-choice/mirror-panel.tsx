import {
  type MirrorChoiceRequiredPayload,
  type PlayingStateView,
  type PublicPlayerView,
  type ResolveSubChoicePayload,
} from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { Button } from '../../../design/components/button';
import { nicknameOf } from '../table-helpers';

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
      <div className="mt-3 flex flex-col gap-2">
        <label className="text-sm text-ink">
          Effect
          <select
            value={resolvedEffectId}
            onChange={(event) => {
              setEffectId(event.target.value);
            }}
            className="mt-1 w-full rounded-[length:var(--radius-control)] border border-border bg-surface px-2 py-1 text-ink"
          >
            {eligibleEffects.map((effect) => (
              <option key={effect.id} value={effect.id}>
                {effect.cardId} from {nicknameOf(view, effect.sourcePlayerId)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink">
          New target
          <select
            value={resolvedTargetId}
            onChange={(event) => {
              setTargetId(event.target.value);
            }}
            className="mt-1 w-full rounded-[length:var(--radius-control)] border border-border bg-surface px-2 py-1 text-ink"
          >
            {aliveOpponents.map((player) => (
              <option key={player.id} value={player.id}>
                {player.nickname}
              </option>
            ))}
          </select>
        </label>
      </div>
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
