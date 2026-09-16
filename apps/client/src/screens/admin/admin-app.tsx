/**
 * Password-gated /admin SPA shell (Lot 61-06).
 */

import { useEffect, useState, type ReactElement } from 'react';

import { fetchAdminOverview } from '../../admin/fetch-admin';
import { readStoredInboxPassword } from '../../inbox/password-storage';
import { AdminNav } from './admin-nav';
import { AdminPasswordGate } from './admin-password-gate';
import { AdminDashboardPage } from './admin-dashboard-page';
import { AdminDataPage } from './admin-data-page';
import { AdminFeedbackPage } from './admin-feedback-page';
import { AdminGamesPage } from './admin-games-page';
import { AdminKitsPage } from './admin-kits-page';

function adminRoute(): {
  page: 'dashboard' | 'games' | 'kits' | 'feedback' | 'data';
  gameCode: string | null;
  table: string | null;
} {
  const path = window.location.pathname.replace(/\/$/, '') || '/admin';
  if (path === '/admin' || path === '/admin/dashboard') {
    return { page: 'dashboard', gameCode: null, table: null };
  }
  if (path.startsWith('/admin/games/')) {
    return { page: 'games', gameCode: path.slice('/admin/games/'.length), table: null };
  }
  if (path === '/admin/games') {
    return { page: 'games', gameCode: null, table: null };
  }
  if (path === '/admin/kits') {
    return { page: 'kits', gameCode: null, table: null };
  }
  if (path === '/admin/feedback') {
    return { page: 'feedback', gameCode: null, table: null };
  }
  if (path.startsWith('/admin/data/')) {
    return { page: 'data', gameCode: null, table: path.slice('/admin/data/'.length) };
  }
  if (path === '/admin/data') {
    return { page: 'data', gameCode: null, table: null };
  }
  return { page: 'dashboard', gameCode: null, table: null };
}

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

  const route = adminRoute();

  return (
    <main className="h-full overflow-y-auto bg-surface font-sans text-ink">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
          Designer
        </p>
        <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Admin
        </h1>

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
                <AdminGamesPage password={password} detailId={route.gameCode} />
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
