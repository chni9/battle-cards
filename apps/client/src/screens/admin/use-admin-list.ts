/**
 * The state of one admin read: Overview, Matches, Kits and Database (technical spec v7 §7.8
 * "consistent loading, empty and error states"; L80-05, L80-06, L80-08, L80-10). One hook, so
 * every page tells a load, an answer and a failure apart the same way and drops a stale answer
 * the same way.
 *
 * `key` names the request. A new key starts a new one, and until its answer lands the read is not
 * loaded: Loading…, and no data or error from an older request. An answer for an older request is
 * dropped. Each start carries its own id and an answer counts only for the id that asked, so
 * asking for an earlier key again (Actors both, humans, both) is a new request: it reads Loading…
 * until its own answer, and an older answer or error for the same key does not stand in for it.
 * `load` is read through `useEffectEvent` when the key changes, so every input of `load`
 * that can change while the page is mounted belongs in the key. The password does not: `AdminApp`
 * mounts the pages only while unlocked, and the gate replaces them on every lock.
 *
 * `scope` names the result set an answer belongs to (Matches: the applied filters; Database: the
 * table; Overview: one set). `lastData` is the last data loaded for the current scope, kept while
 * a later request of that scope loads or after it fails, so a pager keeps its count while the
 * next page loads and the Overview keeps its modules. With no `scope`, the key is the scope.
 *
 * Hooks live in a `.ts` file: a `.tsx` file exports components only (react-refresh).
 */

import { useEffect, useEffectEvent, useState } from 'react';

import { adminErrorCopy, type AdminFetchResult } from '../../admin/fetch-admin';

export interface AdminListRequest<Data> {
  key: string;
  scope?: string;
  load: () => Promise<AdminFetchResult<Data>>;
}

export interface AdminList<Data> {
  /** The current request's data; `null` while it loads and after it failed. */
  data: Data | null;
  /** The current request has answered, with data or with an error. */
  loaded: boolean;
  /** `adminErrorCopy` of the current request's failure, else `null`. */
  error: string | null;
  /** The last data loaded for the current scope, the current request's included. */
  lastData: Data | null;
}

export function useAdminList<Data>({ key, scope = key, load }: AdminListRequest<Data>): AdminList<Data> {
  const [request, setRequest] = useState({ key, scope, id: 0 });
  const [answer, setAnswer] = useState<{ id: number; result: AdminFetchResult<Data> } | null>(null);
  const [last, setLast] = useState<{ scope: string; data: Data } | null>(null);
  const startLoad = useEffectEvent(load);

  // A changed key or scope is a new request with a new id, set while rendering so no render reads
  // an answer of the old one as the new one's.
  if (request.key !== key || request.scope !== scope) {
    setRequest({ key, scope, id: request.id + 1 });
  }

  useEffect(() => {
    let cancelled = false;
    void startLoad().then((result) => {
      if (cancelled) {
        return;
      }
      setAnswer({ id: request.id, result });
      if (result.ok) {
        setLast({ scope: request.scope, data: result.data });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [request]);

  const current = answer?.id === request.id ? answer.result : null;
  return {
    data: current?.ok === true ? current.data : null,
    loaded: current !== null,
    error: current !== null && !current.ok ? adminErrorCopy(current.status) : null,
    lastData: last?.scope === scope ? last.data : null,
  };
}
