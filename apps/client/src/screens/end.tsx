/**
 * End screen — technical spec v2 §6, L13-01.
 * Winner + public recap + Excel action-log export (Lot 19) + return home.
 */

import { PROTOCOL_VERSION, type FinishedStateView } from '@card-battle/shared';
import { motion, useReducedMotion } from 'motion/react';
import { useState, type ReactElement } from 'react';

import { getCardArtUrl, getCardBackUrl, getKitPortraitUrl } from '../design/asset-lookup';
import { Button } from '../design/components/button';
import {
  buildActionLogWorkbook,
  downloadWorkbookBuffer,
} from '../export/build-action-log-xlsx';

export interface EndScreenProps {
  view: FinishedStateView;
  onLeave: () => void;
}

function nickOf(view: FinishedStateView, playerId: string): string {
  return view.players.find((player) => player.id === playerId)?.nickname ?? playerId;
}

export function EndScreen({ view, onLeave }: EndScreenProps): ReactElement {
  const reduceMotion = useReducedMotion();
  const winnerNick = nickOf(view, view.winnerPlayerId);
  const youWon = view.winnerPlayerId === view.you;
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function onExportLog(): Promise<void> {
    setExportBusy(true);
    setExportError(null);

    try {
      const buffer = await buildActionLogWorkbook(view.exportLog);
      downloadWorkbookBuffer(buffer, `${view.gameCode}-action-log.xlsx`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-surface font-sans text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,var(--color-surface-kit)_0%,transparent_55%),radial-gradient(ellipse_at_90%_20%,var(--color-slate-soft)_0%,transparent_45%)]"
      />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-5xl gap-8 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-12 md:px-8 md:py-12">
        <section className="order-2 md:order-1">
          <motion.div
            initial={reduceMotion === true ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
              Game over
            </p>
            <h1 className="mt-2 font-sans text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              Card Battle
            </h1>
            <p className="mt-4 text-lg font-semibold text-ink">
              Winner: {winnerNick}
              {youWon ? ' (you)' : ''}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              Protocol v{PROTOCOL_VERSION} · Code {view.gameCode}
            </p>
          </motion.div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Players</h2>
            <ul className="mt-3 divide-y divide-border-soft rounded-[length:var(--radius-card)] border border-border bg-surface-raised">
              {view.players.map((player) => (
                <li
                  key={player.id}
                  className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-ink">
                    {player.nickname}
                    {player.isYou ? ' (you)' : ''}
                    {player.id === view.winnerPlayerId ? ' · winner' : ''}
                  </span>
                  {player.isEliminated && (
                    <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                      Eliminated
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4">
            <h2 className="text-lg font-semibold text-ink">Recap</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Turns played: {view.recap.turnSequence}
            </p>
            <ul className="mt-3 space-y-2">
              {view.recap.players.map((row) => (
                <li key={row.playerId} className="text-sm text-ink">
                  <span className="font-medium">{nickOf(view, row.playerId)}</span>
                  {' — '}
                  played {row.cardsPlayedCount}, bought {row.buyCount}, sold {row.sellCount},
                  upgraded {row.upgradeCount}
                </li>
              ))}
            </ul>
            <h3 className="mt-4 text-sm font-semibold text-ink">Eliminations</h3>
            {view.recap.eliminations.length === 0 ? (
              <p className="mt-1 text-sm text-ink-muted">No eliminations</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {view.recap.eliminations.map((entry) => (
                  <li
                    key={`${entry.playerId}-${entry.reason}`}
                    className="text-sm text-ink"
                  >
                    {nickOf(view, entry.playerId)} eliminated ({entry.reason})
                    {entry.eliminatorPlayerId !== null
                      ? ` by ${nickOf(view, entry.eliminatorPlayerId)}`
                      : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="purple"
              disabled={exportBusy}
              onClick={() => {
                void onExportLog();
              }}
            >
              {exportBusy ? 'Building Excel…' : 'Download action log (Excel)'}
            </Button>
            <Button type="button" variant="red" onClick={onLeave}>
              Return home
            </Button>
          </div>
          {exportError !== null && (
            <p className="mt-2 text-sm text-ink-muted" role="alert">
              {exportError}
            </p>
          )}
        </section>

        <aside
          aria-hidden
          className="order-1 flex items-center justify-center md:order-2"
        >
          <div className="relative h-64 w-full max-w-sm md:h-80">
            <img
              src={getCardBackUrl('special')}
              alt=""
              className="absolute left-2 top-6 w-28 rotate-[-12deg] rounded-[length:var(--radius-card)] border border-border shadow-md md:w-36"
              draggable={false}
            />
            <img
              src={getCardArtUrl('sentence', { isUpgraded: false })}
              alt=""
              className="absolute left-1/2 top-0 w-32 -translate-x-1/2 rotate-[4deg] rounded-[length:var(--radius-card)] border border-border shadow-lg md:w-40"
              draggable={false}
            />
            <img
              src={getCardArtUrl('cloning', { isUpgraded: false })}
              alt=""
              className="absolute right-2 top-10 w-28 rotate-[14deg] rounded-[length:var(--radius-card)] border border-border shadow-md md:w-36"
              draggable={false}
            />
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
              <img
                src={getKitPortraitUrl('untouchable')}
                alt=""
                className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
                draggable={false}
              />
              <img
                src={getKitPortraitUrl('assassin')}
                alt=""
                className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
                draggable={false}
              />
              <img
                src={getKitPortraitUrl('scientific')}
                alt=""
                className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
                draggable={false}
              />
              <img
                src={getKitPortraitUrl('kamikaze')}
                alt=""
                className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
                draggable={false}
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
