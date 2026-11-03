/**
 * The Reanimation kit picker — technical spec v7 §6.7, §11 (the portrait `alt` is the kit name);
 * V2 `reanimation-kit-panel.tsx` (L44-06, L26-02); Appendix A `table-subchoice-reanimation-kit`
 * (L74-19).
 *
 * - One `KitTile` per eligible kit: `aria-pressed` head named by the kit, portrait and name, no
 *   stats (V2 showed only the portrait and name; designer default 2026-11-02). The first kit is
 *   preselected, and a pick a resend no longer offers falls back to it.
 * - Nothing reads the POV's elimination: the prompt renders for an eliminated POV as for any other.
 */

import { getKit, type KitId, type ReanimationKitChoiceRequiredPayload } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { KitPortrait } from '../../../ui/kit/kit-portrait';
import { Button } from '../../../ui/primitives/button';
import { KitTile } from '../../../ui/primitives/kit-tile';
import { DISABLED_REASON_COPY } from '../../../view-model/action-reasons';
import { resolvePick, type SubChoicePickerProps } from './sub-choice-model';

export function KitChoice({
  subChoice,
  frame,
  send,
  locked,
}: SubChoicePickerProps<ReanimationKitChoiceRequiredPayload>): ReactElement {
  const [picked, setPicked] = useState<KitId | null>(null);
  const pick = resolvePick(picked, subChoice.eligibleKitIds);

  const body = (
    <>
      <p className="text-v7-body text-v7-text-2">Choose which kit to revive with.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {subChoice.eligibleKitIds.map((kitId) => (
          <li key={kitId} className="min-w-0">
            <KitTile
              name={getKit(kitId).name}
              portrait={<KitPortrait kitId={kitId} size="tile" />}
              stats={[]}
              selected={kitId === pick}
              onSelect={() => {
                setPicked(kitId);
              }}
            />
          </li>
        ))}
      </ul>
    </>
  );

  const actions = (
    <Button
      variant="primary"
      disabled={pick === null || locked}
      {...(locked ? { disabledReason: DISABLED_REASON_COPY['actions-locked'] } : {})}
      onClick={() => {
        if (pick !== null) send({ kind: 'reanimation-kit', kitId: pick });
      }}
    >
      Confirm kit
    </Button>
  );

  return frame({ body, actions });
}
