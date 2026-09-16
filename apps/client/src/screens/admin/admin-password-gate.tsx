import { useState, type ReactElement, type SyntheticEvent } from 'react';

import { adminErrorCopy } from '../../admin/fetch-admin';
import { Button } from '../../design/components/button';
import {
  clearStoredInboxPassword,
  readStoredInboxPassword,
  storeInboxPassword,
} from '../../inbox/password-storage';

const inputClassName = [
  'mt-1.5 block w-full min-h-11 rounded-[length:var(--radius-control)]',
  'border border-border bg-surface-raised px-3 py-2 font-sans text-base text-ink',
].join(' ');

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
    void probe(secret).then((result) => {
      setBusy(false);
      if (!result.ok) {
        if (result.status === 401) {
          clearStoredInboxPassword();
        }
        setError(adminErrorCopy(result.status));
        return;
      }
      storeInboxPassword(secret);
      onUnlocked(secret);
    });
  };

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    tryUnlock(password.trim());
  };

  return (
    <form className="max-w-sm" onSubmit={onSubmit}>
      <label className="block text-sm font-medium text-ink">
        Password
        <input
          className={inputClassName}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </label>
      <div className="mt-4">
        <Button type="submit" variant="green" disabled={busy || password.trim().length === 0}>
          {busy ? 'Checking…' : 'Unlock'}
        </Button>
      </div>
      {error !== null ? (
        <p className="mt-4 text-sm text-cta-red" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
