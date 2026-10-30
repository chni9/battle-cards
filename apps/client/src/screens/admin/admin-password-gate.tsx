/**
 * The /admin password gate (L61-06), on the V7 primitives in tool mode (L80-01). It shares the
 * inbox session password (`card-battle.v6.inboxPassword`, L47-05): a success stores it, a 401
 * clears it.
 *
 * Unlock stays focusable while blank or checking (`focusableWhenDisabled`): a click that starts
 * the check must not drop focus to the page by toggling native `disabled` on the focused button
 * (`docs/agent/frontend.md` › V7 primitives). The guard in `tryUnlock` makes Enter in the field a
 * no-op in those states.
 */

import { useState, type ReactElement, type SyntheticEvent } from 'react';

import { adminErrorCopy } from '../../admin/fetch-admin';
import {
  clearStoredInboxPassword,
  readStoredInboxPassword,
  storeInboxPassword,
} from '../../inbox/password-storage';
import { Button } from '../../ui/primitives/button';
import { TextField } from '../../ui/primitives/text-field';
import { ADMIN_PANEL_CLASS } from './admin-classes';
import { AdminStatus } from './admin-ui';

interface AdminPasswordGateProps {
  onUnlocked: (password: string) => void;
  probe: (password: string) => Promise<{ ok: boolean; status: number }>;
}

export function AdminPasswordGate({ onUnlocked, probe }: AdminPasswordGateProps): ReactElement {
  const [password, setPassword] = useState(() => readStoredInboxPassword() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tryUnlock = (secret: string): void => {
    if (secret.length === 0 || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    void probe(secret)
      .then((result) => {
        if (!result.ok) {
          if (result.status === 401) {
            clearStoredInboxPassword();
          }
          setError(adminErrorCopy(result.status));
          return;
        }
        storeInboxPassword(secret);
        onUnlocked(secret);
      })
      .catch(() => {
        setError(adminErrorCopy(0));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    tryUnlock(password.trim());
  };

  return (
    <form className={`${ADMIN_PANEL_CLASS} flex max-w-sm flex-col gap-4`} onSubmit={onSubmit}>
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
        }}
      />
      <div>
        <Button
          type="submit"
          variant="primary"
          disabled={busy || password.trim().length === 0}
          focusableWhenDisabled
        >
          {busy ? 'Checking…' : 'Unlock'}
        </Button>
      </div>
      {error !== null ? <AdminStatus state={{ kind: 'error', message: error }} /> : null}
    </form>
  );
}
