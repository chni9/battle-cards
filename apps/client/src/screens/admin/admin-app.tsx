/**
 * Password-gated /admin SPA shell (Lot 61-06), in V7 tool mode (technical spec v7 §7.8, L80-01).
 *
 * `data-mode="tool"` scopes the flat chrome of `ui/tokens.css` (1 px tool-line outline, 8 / 6 px
 * radius, no hard shadow, no press translate). The ground is flat `--bg-0`, with no `.v7-ground`
 * halos or scanlines: §7.8 asks for neutral dark panels and no juice (designer 2026-10-28). The
 * `main` scrolls, so it is `relative` like every V7 scroll container (L53-07).
 *
 * Sign out (§7.8, L80-02) is the 401 lock path: `lockAdminSession()` clears the key, bumps the
 * session counter and notifies the shell, so the gate, the storage and the subscribers behave as
 * after a 401. It shows only while unlocked.
 */

import { useEffect, useState, type ReactElement } from 'react';

import { adminRoute } from '../../admin/admin-routes';
import {
  fetchAdminOverview,
  lockAdminSession,
  subscribeAdminUnauthorized,
} from '../../admin/fetch-admin';
import { readStoredInboxPassword } from '../../inbox/password-storage';
import { Button } from '../../ui/primitives/button';
import { AdminNav } from './admin-nav';
import { AdminPasswordGate } from './admin-password-gate';
import { AdminDashboardPage } from './admin-dashboard-page';
import { AdminDataPage } from './admin-data-page';
import { AdminFeedbackPage } from './admin-feedback-page';
import { AdminGamesPage } from './admin-games-page';
import { AdminKitsPage } from './admin-kits-page';

export function AdminApp(): ReactElement {
  const [routeKey, setRouteKey] = useState(0);
  const [password, setPassword] = useState<string | null>(() => readStoredInboxPassword());

  useEffect(() => {
    const onPop = (): void => {
      setRouteKey((value) => value + 1);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  useEffect(() => {
    return subscribeAdminUnauthorized(() => {
      setPassword(null);
    });
  }, []);

  const route = adminRoute(window.location.pathname);

  return (
    <main data-mode="tool" className="relative h-full overflow-y-auto bg-v7-bg-0 font-v7-body text-v7-text">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.14em] text-v7-text-2">
              Designer
            </p>
            <h1 className="mt-2 font-v7-display text-v7-display text-v7-text">Insights</h1>
            <p className="mt-2 max-w-xl font-v7-body text-v7-body font-bold text-v7-text-2">
              Finished matches, kit balance, feedback, and raw log tables. Not linked from the
              player hub.
            </p>
          </div>
          {password !== null ? (
            <div className="shrink-0">
              <Button
                variant="quiet"
                onClick={() => {
                  lockAdminSession();
                }}
              >
                Sign out
              </Button>
            </div>
          ) : null}
        </header>

        {password === null ? (
          <div className="mt-8">
            <AdminPasswordGate
              onUnlocked={setPassword}
              probe={async (secret) => {
                const result = await fetchAdminOverview(secret, {});
                return { ok: result.ok, status: result.ok ? 200 : result.status };
              }}
            />
          </div>
        ) : (
          <>
            <div className="mt-6">
              <AdminNav />
            </div>
            <div className="mt-6" key={routeKey}>
              {route.page === 'dashboard' ? <AdminDashboardPage password={password} /> : null}
              {route.page === 'games' ? (
                <AdminGamesPage password={password} detailId={route.gameId} />
              ) : null}
              {route.page === 'kits' ? <AdminKitsPage password={password} /> : null}
              {route.page === 'feedback' ? <AdminFeedbackPage password={password} /> : null}
              {route.page === 'data' ? (
                <AdminDataPage password={password} table={route.table} />
              ) : null}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
