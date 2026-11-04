/**
 * The guest's rules toast (technical spec v7 §7.4, Q16 and Q17, §10.6; plan A.9 rulings 4 and 10;
 * L76-15): the lobby's one `Toast`, polite (`tone="info"`). The owner holds the notice and closes
 * it: OK and the timer both call `onDismiss`, so the cause is ignored. The title is a constant, so
 * a closing toast never blanks it during its fade.
 */

import type { ReactElement } from 'react';

import { Toast } from '../../ui/primitives/toast';
import { LOBBY_DISMISS_LABEL, PICK_RESET_BODY, RULES_CHANGED_TITLE } from './lobby-copy';
import { LOBBY_RULES_TOAST_MS, type LobbyRulesNotice } from './rules-change-notice';

export interface LobbyRulesToastProps {
  readonly notice: LobbyRulesNotice | null;
  /** OK or the timer: the owner closes it (sets its notice to null). */
  readonly onDismiss: () => void;
}

export function LobbyRulesToast({ notice, onDismiss }: LobbyRulesToastProps): ReactElement | null {
  return (
    <Toast
      open={notice !== null}
      tone="info"
      title={RULES_CHANGED_TITLE}
      {...(notice?.pickReset === true ? { body: PICK_RESET_BODY } : {})}
      timeoutMs={LOBBY_RULES_TOAST_MS}
      dismissLabel={LOBBY_DISMISS_LABEL}
      onDismiss={() => {
        onDismiss();
      }}
    />
  );
}
