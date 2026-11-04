/**
 * The Random kit's description on its kit sheet (technical spec v7 §10.1 Lot 76 row, §7.3): the
 * server deals one of the allowed kits when the game starts, and who can see it afterwards. The
 * words are L76-03's (`kit-pick-copy.ts`), moved here from the V2 picker dialog by L76-10, now in
 * V7 text tokens because the sheet's `--panel` ground would swallow V2's dark `text-ink`.
 */

import type { ReactElement } from 'react';

import { RANDOM_KIT_ASSIGN_COPY, RANDOM_KIT_PRIVACY_COPY } from '../kit-pick-copy';

export function RandomKitDetails(): ReactElement {
  return (
    <div className="flex flex-col gap-3 font-v7-body text-v7-body leading-snug font-bold">
      <p className="text-v7-text">{RANDOM_KIT_ASSIGN_COPY}</p>
      <p className="text-v7-text-2">{RANDOM_KIT_PRIVACY_COPY}</p>
    </div>
  );
}
