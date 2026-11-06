/**
 * The lobby's kit card (technical spec v7 §7.2, §7.3; parity `lobby-your-kit`,
 * `lobby-walk-in-notice`). One of three cards:
 * - a walk-in reads the "Watching the lobby" banner, with Claim a seat while App passes
 *   `onReopenClaim` (L76-16; it sends nothing, so it ignores `locked`, plan A.9 ruling 6);
 * - under Random only, the dealt line: the host reads `RANDOM_ONLY_SOLO_LINE`, a guest
 *   `RANDOM_ONLY_LOBBY_LINE` (controller ruling, L76-12);
 * - otherwise Your kit: the privacy line, the pick's `KitPortrait` and label, and Choose kit.
 * It owns the `KitPickerSheet` open state and clears it while the card cannot show, so turning
 * Random only off never reopens the picker. Choose kit stays live while `locked` (plan A.9
 * ruling 6); only Select this kit locks. L76-12.
 */

import type { LobbyKitSelection, LobbyRules } from '@card-battle/shared';
import { useId, useState, type ReactElement } from 'react';

import { Icon } from '../../ui/icons/icon';
import { KitPortrait } from '../../ui/kit/kit-portrait';
import { Button } from '../../ui/primitives/button';
import { CHROME_SHAPE_CLASS } from '../../ui/primitives/chrome-classes';
import { CHOOSE_KIT_LABEL, KIT_PRIVACY_COPY, RANDOM_ONLY_LOBBY_LINE, RANDOM_ONLY_SOLO_LINE } from '../kit-pick-copy';
import { KitPickerSheet } from './kit-picker-sheet';
import { CLAIM_SEAT_LABEL, WATCHING_BODY, WATCHING_TITLE, YOUR_KIT_TITLE } from './lobby-copy';
import { lobbyKitSelectionLabel } from './lobby-kit-picker';

export interface LobbyKitCardProps {
  /** view.yourKitSelection. */
  readonly selection: LobbyKitSelection;
  /** view.lobbyRules ?? defaultLobbyRules(): excluded kits and Random only. */
  readonly rules: LobbyRules;
  /** view.isSpectator === true: the Watching the lobby banner, no kit card. */
  readonly walkIn: boolean;
  /** The viewer hosts: under Random only they read the solo line, since they deal the kits themselves. */
  readonly isHost: boolean;
  /** Reconnecting: Select this kit is disabled; Choose kit and the sheets stay live. */
  readonly locked: boolean;
  readonly onChooseKit: (selection: LobbyKitSelection) => void;
  /** App's claim picker reopen (§7.2, Q24, A.9 ruling 9): present only for a walk-in while seats are claimable. */
  readonly onReopenClaim?: () => void;
}

const CARD_CLASS = `${CHROME_SHAPE_CLASS} bg-v7-panel p-4`;
const TITLE_CLASS = 'font-v7-display text-v7-title leading-none text-v7-text';
const BODY_CLASS = 'font-v7-body text-v7-body text-v7-text-2';

export function LobbyKitCard({ selection, rules, walkIn, isHost, locked, onChooseKit, onReopenClaim }: LobbyKitCardProps): ReactElement {
  const titleId = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Render-time sync: while the card cannot show, the open flag clears, so the picker does not
  // reopen when the host turns Random only off (technical spec v7 §7.3; L76-10).
  if ((walkIn || rules.randomOnly) && pickerOpen) setPickerOpen(false);

  if (walkIn) {
    return (
      <section aria-labelledby={titleId} className={CARD_CLASS}>
        <h2 id={titleId} className={TITLE_CLASS}>
          {WATCHING_TITLE}
        </h2>
        <p className={`mt-2 ${BODY_CLASS}`}>{WATCHING_BODY}</p>
        {onReopenClaim !== undefined ? (
          <Button variant="primary" className="mt-3" onClick={onReopenClaim}>
            {CLAIM_SEAT_LABEL}
          </Button>
        ) : null}
      </section>
    );
  }

  const picker = (
    <KitPickerSheet
      open={pickerOpen}
      current={selection}
      rules={rules}
      onSelect={onChooseKit}
      onClose={() => {
        setPickerOpen(false);
      }}
      disabled={locked}
    />
  );

  if (rules.randomOnly) {
    return (
      <>
        <div className={`${CARD_CLASS} flex items-center gap-3`}>
          <Icon name="random" className="shrink-0" />
          <p className="font-v7-body text-v7-body font-bold text-v7-text">
            {isHost ? RANDOM_ONLY_SOLO_LINE : RANDOM_ONLY_LOBBY_LINE}
          </p>
        </div>
        {picker}
      </>
    );
  }

  return (
    <>
      <section aria-labelledby={titleId} className={CARD_CLASS}>
        <h2 id={titleId} className={TITLE_CLASS}>
          {YOUR_KIT_TITLE}
        </h2>
        <p className={`mt-2 text-pretty ${BODY_CLASS}`}>{KIT_PRIVACY_COPY}</p>
        <div className="mt-3 flex items-center gap-3">
          <KitPortrait kitId={selection} size="tile" />
          <div className="flex min-w-0 flex-col items-start gap-2">
            <p className="font-v7-display text-v7-title text-v7-text">{lobbyKitSelectionLabel(selection)}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setPickerOpen(true);
              }}
            >
              {CHOOSE_KIT_LABEL}
            </Button>
          </div>
        </div>
      </section>
      {picker}
    </>
  );
}
