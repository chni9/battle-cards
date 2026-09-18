/**
 * Overview modules (Lot 62). Match-level vs actor-level sections.
 */

import type {
  AdminActorsFilter,
  AdminKitStatRow,
  AdminOverview,
} from '@card-battle/shared';
import { useState, type ReactElement, type ReactNode } from 'react';

import { sortByCountDesc } from '../../admin/admin-chart-math';
import {
  adminCardLabel,
  botDifficultyLabel,
  combatOutcomeLabel,
  durationBucketLabel,
  elimReasonLabel,
  feedbackKindLabel,
  hourUtcLabel,
  occupancyLabel,
  opponentMixLabel,
  persistentCardLabel,
  playedActionLabel,
  seatIndexLabel,
  shopMixLabel,
  winnerLivesBucketLabel,
} from '../../admin/admin-overview-labels';
import {
  formatCount,
  formatMinutesFromMs,
  formatNullablePercent,
  formatPercent,
  formatThinkMs,
  formatTurns,
  kitDisplayName,
} from '../../admin/admin-present';
import {
  AdminBucketChart,
  AdminHorizontalBarChart,
  AdminPieChart,
  AdminScatterChart,
  type AdminBarItem,
} from './admin-charts';
import { AdminMetricCard, AdminMetricGrid } from './admin-ui';

const moduleClassName = [
  'space-y-4 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4 md:p-5',
].join(' ');

function AdminActorsControl({
  value,
  onChange,
}: {
  value: AdminActorsFilter;
  onChange: (next: AdminActorsFilter) => void;
}): ReactElement {
  return (
    <label className="block text-xs font-medium text-ink-muted">
      Actors
      <select
        className={[
          'mt-1.5 block min-h-10 rounded-[length:var(--radius-control)]',
          'border border-border bg-surface-raised px-3 py-2 font-sans text-sm text-ink',
        ].join(' ')}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === 'humans' || next === 'bots' || next === 'both') {
            onChange(next);
          }
        }}
      >
        <option value="both">Humans and bots</option>
        <option value="humans">Humans</option>
        <option value="bots">Bots</option>
      </select>
    </label>
  );
}

function AdminModule({
  title,
  description,
  actors,
  onActorsChange,
  children,
}: {
  title: string;
  description: string;
  actors?: AdminActorsFilter;
  onActorsChange?: (next: AdminActorsFilter) => void;
  children: ReactNode;
}): ReactElement {
  return (
    <section className={moduleClassName}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-sans text-lg font-semibold text-ink">{title}</h3>
          <p className="max-w-2xl text-sm text-ink-muted">{description}</p>
        </div>
        {actors !== undefined && onActorsChange !== undefined ? (
          <AdminActorsControl value={actors} onChange={onActorsChange} />
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Subheading({ children }: { children: string }): ReactElement {
  return <h4 className="font-sans text-sm font-semibold text-ink">{children}</h4>;
}

function countBars(
  rows: readonly { id: string; label: string; value: number; display?: string }[],
): AdminBarItem[] {
  return sortByCountDesc(rows, (row) => row.value, (row) => row.id);
}

export function AdminOverviewModules({
  overview,
  actors,
  onActorsChange,
}: {
  overview: AdminOverview;
  actors: AdminActorsFilter;
  onActorsChange: (next: AdminActorsFilter) => void;
}): ReactElement {
  const [kitMetric, setKitMetric] = useState<'wins' | 'winRate'>('wins');
  const kitRows =
    kitMetric === 'winRate'
      ? overview.gameplay.kits.filter((row) => row.picks > 0)
      : overview.gameplay.kits;

  return (
    <div className="space-y-6">
      <AdminModule
        title="General"
        description="Match-level totals. Lengths are minutes. Occupancy pie uses the same seat counts as the length-by-seats bars."
      >
        <AdminMetricGrid>
          <AdminMetricCard label="Finished matches" value={formatCount(overview.general.gameCount)} />
          <AdminMetricCard
            label="Humans only"
            value={formatCount(overview.general.humanOnlyCount)}
            hint="No bot seats"
          />
          <AdminMetricCard
            label="With bots"
            value={formatCount(overview.general.withBotsCount)}
            hint="At least one bot seat"
          />
          <AdminMetricCard
            label="Average length"
            value={formatMinutesFromMs(overview.general.avgDurationMs)}
            hint="Per match"
          />
          <AdminMetricCard
            label="Median length"
            value={formatMinutesFromMs(overview.general.medianDurationMs)}
          />
          <AdminMetricCard
            label="Average length per human"
            value={formatMinutesFromMs(overview.general.avgDurationMsPerHumanPlayer)}
            hint="Weighted by human seats; bots excluded"
          />
          <AdminMetricCard
            label="Average occupancy"
            value={
              overview.general.avgOccupancy === null
                ? '—'
                : formatCount(overview.general.avgOccupancy)
            }
          />
          <AdminMetricCard
            label="Average turns"
            value={
              overview.general.avgTurnSequence === null
                ? '—'
                : formatTurns(overview.general.avgTurnSequence)
            }
          />
          <AdminMetricCard
            label="Clock per turn"
            value={formatThinkMs(overview.general.avgClockMsPerTurn)}
            hint="Match clock / turns"
          />
          <AdminMetricCard
            label="Most wins (kit)"
            value={
              overview.general.topKitByWins === null
                ? '—'
                : `${kitDisplayName(overview.general.topKitByWins.kitId)} (${formatCount(overview.general.topKitByWins.wins)} wins)`
            }
          />
          <AdminMetricCard label="Feedback reports" value={formatCount(overview.feedbackCount)} />
        </AdminMetricGrid>
        <Subheading>Length with bots vs without</Subheading>
        <AdminHorizontalBarChart
          items={overview.general.durationByOpponentMix.map((row) => ({
            id: row.hasBots ? 'with-bots' : 'humans',
            label: opponentMixLabel(row.hasBots),
            value: row.avgDurationMs ?? 0,
            display: formatMinutesFromMs(row.avgDurationMs),
          }))}
          caption="Ignores the opponents match-mix filter. Still uses dates, kit, occupancy, and tutorial."
        />
        <Subheading>Length by seat count</Subheading>
        <AdminHorizontalBarChart
          items={overview.general.durationByOccupancy.map((row) => ({
            id: String(row.occupancy),
            label: occupancyLabel(row.occupancy),
            value: row.avgDurationMs ?? 0,
            display: formatMinutesFromMs(row.avgDurationMs),
          }))}
        />
        <Subheading>Games per seat count</Subheading>
        <AdminPieChart
          items={overview.general.gamesByOccupancy.map((row) => ({
            id: String(row.occupancy),
            label: occupancyLabel(row.occupancy),
            value: row.gameCount,
          }))}
        />
      </AdminModule>

      <AdminModule
        title="Volume"
        description="When matches ended, from the finished-game log."
      >
        <Subheading>Games per UTC day</Subheading>
        <AdminHorizontalBarChart
          items={overview.volume.gamesByDay.map((row) => ({
            id: row.day,
            label: row.day,
            value: row.gameCount,
          }))}
        />
        <Subheading>Games by hour of day</Subheading>
        <AdminHorizontalBarChart
          items={overview.volume.gamesByHourUtc.map((row) => ({
            id: String(row.hour),
            label: hourUtcLabel(row.hour),
            value: row.gameCount,
          }))}
          caption="Hours are UTC."
        />
      </AdminModule>

      <AdminModule
        title="Gameplay"
        description="Actions, kits, and pacing for the selected seats. Mixed tables still contribute those seats."
        actors={actors}
        onActorsChange={onActorsChange}
      >
        <Subheading>Actions used</Subheading>
        <AdminHorizontalBarChart
          items={countBars(
            overview.gameplay.actions.map((row) => ({
              id: row.action,
              label: playedActionLabel(row.action),
              value: row.count,
            })),
          )}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Subheading>Kit wins</Subheading>
          <label className="text-xs font-medium text-ink-muted">
            Show
            <select
              className="ml-2 rounded-[length:var(--radius-control)] border border-border bg-surface px-2 py-1 text-sm text-ink"
              value={kitMetric}
              onChange={(event) => {
                setKitMetric(event.target.value === 'winRate' ? 'winRate' : 'wins');
              }}
            >
              <option value="wins">Wins</option>
              <option value="winRate">Win rate</option>
            </select>
          </label>
        </div>
        <AdminHorizontalBarChart
          items={countBars(
            kitRows.map((row: AdminKitStatRow) => ({
              id: row.kitId,
              label: kitDisplayName(row.kitId),
              value: kitMetric === 'wins' ? row.wins : row.winRate,
              display: kitMetric === 'wins' ? formatCount(row.wins) : formatPercent(row.winRate),
            })),
          )}
          caption={`Sample ${formatCount(overview.gameplay.kitSampleGames)} matches. Win rate hides kits with zero picks.`}
        />
        <Subheading>Kit pick vs win</Subheading>
        <AdminScatterChart
          points={overview.gameplay.kits
            .filter((row) => row.picks > 0)
            .map((row) => ({
              id: row.kitId,
              label: kitDisplayName(row.kitId),
              x: row.pickRate,
              y: row.winRate,
            }))}
          xLabel="Pick rate"
          yLabel="Win rate"
          caption="Same numbers as the Kits table."
        />
        <Subheading>Specials played</Subheading>
        <AdminHorizontalBarChart
          items={countBars(
            overview.gameplay.specialsPlayed.map((row) => ({
              id: row.cardId,
              label: adminCardLabel(row.cardId),
              value: row.count,
            })),
          )}
        />
        <Subheading>Shared cards played</Subheading>
        <AdminHorizontalBarChart
          items={countBars(
            overview.gameplay.sharedCardsPlayed.map((row) => ({
              id: row.cardId,
              label: adminCardLabel(row.cardId),
              value: row.count,
            })),
          )}
        />
        <Subheading>Think / pacing</Subheading>
        <AdminMetricGrid>
          <AdminMetricCard
            label="Average think time"
            value={formatThinkMs(overview.gameplay.avgThinkTimeMs)}
          />
          <AdminMetricCard
            label="Think per action"
            value={formatThinkMs(overview.gameplay.thinkTimePerActionMs)}
          />
          <AdminMetricCard label="p50 think" value={formatThinkMs(overview.gameplay.p50ThinkTimeMs)} />
          <AdminMetricCard label="p90 think" value={formatThinkMs(overview.gameplay.p90ThinkTimeMs)} />
          <AdminMetricCard
            label="Draw share"
            value={formatNullablePercent(overview.gameplay.drawShare)}
            hint="Draw as a share of actionPlayed"
          />
        </AdminMetricGrid>
        {overview.gameplay.thinkTimePartial ? (
          <p className="text-xs text-ink-muted">
            New matches only — think time is missing on pre-migration rows (
            {formatCount(overview.gameplay.thinkTimeSeatCount)} of{' '}
            {formatCount(overview.gameplay.actorSeatCount)} seats).
          </p>
        ) : null}
      </AdminModule>

      <AdminModule
        title="Economy"
        description="Shop mix, upgrades, and leftover resources on the selected seats."
        actors={actors}
        onActorsChange={onActorsChange}
      >
        <Subheading>Shop mix</Subheading>
        <AdminHorizontalBarChart
          items={countBars(
            overview.economy.shopMix.map((row) => ({
              id: row.action,
              label: shopMixLabel(row.action),
              value: row.count,
            })),
          )}
        />
        <AdminMetricGrid>
          <AdminMetricCard
            label="Upgrade card"
            value={formatCount(overview.economy.upgradeCardCount)}
          />
          <AdminMetricCard
            label="Upgraded plays"
            value={formatNullablePercent(overview.economy.upgradedPlayShare)}
            hint={`${formatCount(overview.economy.upgradedPlayCount)} of ${formatCount(overview.economy.playCardOrMultiCount)} playCard / multi-attack`}
          />
          <AdminMetricCard
            label="Leftover lives"
            value={formatMaybeCount(overview.economy.avgLeftoverLives)}
          />
          <AdminMetricCard
            label="Leftover points"
            value={formatMaybeCount(overview.economy.avgLeftoverPoints)}
          />
          <AdminMetricCard
            label="Leftover upgrade points"
            value={formatMaybeCount(overview.economy.avgLeftoverUpgradePoints)}
          />
          <AdminMetricCard label="Buys / seat" value={formatMaybeCount(overview.economy.avgBuyCount)} />
          <AdminMetricCard
            label="Sells / seat"
            value={formatMaybeCount(overview.economy.avgSellCount)}
          />
          <AdminMetricCard
            label="Upgrades / seat"
            value={formatMaybeCount(overview.economy.avgUpgradeCount)}
          />
          <AdminMetricCard
            label="Cards played / seat"
            value={formatMaybeCount(overview.economy.avgCardsPlayed)}
          />
        </AdminMetricGrid>
      </AdminModule>

      <AdminModule
        title="Combat"
        description="Attack resolutions from the public action log."
        actors={actors}
        onActorsChange={onActorsChange}
      >
        <AdminMetricGrid>
          <AdminMetricCard label="Lives lost (attacks)" value={formatCount(overview.combat.livesLost)} />
          <AdminMetricCard
            label="Shield absorbed"
            value={formatCount(overview.combat.shieldAbsorbed)}
          />
          <AdminMetricCard
            label="Non-attack life loss"
            value={formatCount(overview.combat.nonAttackLivesLost)}
            hint="Tax, Suicide, Imposition — not applyDamage"
          />
        </AdminMetricGrid>
        <Subheading>Resolution outcomes</Subheading>
        <AdminPieChart
          items={overview.combat.outcomes.map((row) => ({
            id: row.outcome,
            label: combatOutcomeLabel(row.outcome),
            value: row.count,
          }))}
          caption="Tax, Suicide, and Imposition life loss is not attack damage."
        />
      </AdminModule>

      <AdminModule
        title="Hidden tools"
        description="Spy, Thief, Unspy, Mirror, and selected persistents."
        actors={actors}
        onActorsChange={onActorsChange}
      >
        <AdminMetricGrid>
          <AdminMetricCard label="Spy plays" value={formatCount(overview.hidden.spyPlays)} />
          <AdminMetricCard label="Thief plays" value={formatCount(overview.hidden.thiefPlays)} />
          <AdminMetricCard label="Unspy" value={formatCount(overview.hidden.unspyCount)} />
          <AdminMetricCard
            label="Mirror redirects"
            value={formatCount(overview.hidden.mirrorRedirects)}
          />
        </AdminMetricGrid>
        <Subheading>Persistents</Subheading>
        <AdminHorizontalBarChart
          items={overview.hidden.persistents.map((row) => ({
            id: row.cardId,
            label: persistentCardLabel(row.cardId),
            value: row.plays,
            display: `${formatCount(row.plays)} plays / ${formatCount(row.deactivations)} off`,
          }))}
        />
      </AdminModule>

      <AdminModule
        title="Bots and seats"
        description="Human results in mixed games, bot difficulty, and first-player seat share."
        actors={actors}
        onActorsChange={onActorsChange}
      >
        <AdminMetricGrid>
          <AdminMetricCard
            label="Human win rate (mixed)"
            value={formatNullablePercent(overview.botsSeats.humanWinRateInMixed)}
            hint={`${formatCount(overview.botsSeats.humanWinsInMixed)} of ${formatCount(overview.botsSeats.mixedGameCount)} mixed games`}
          />
        </AdminMetricGrid>
        <Subheading>Wins by bot difficulty</Subheading>
        <AdminHorizontalBarChart
          items={overview.botsSeats.byBotDifficulty.map((row) => ({
            id: row.difficulty,
            label: botDifficultyLabel(row.difficulty),
            value: row.wins,
            display: `${formatCount(row.wins)} / ${formatCount(row.gameCount)}`,
          }))}
        />
        <Subheading>Win share by seat</Subheading>
        <AdminHorizontalBarChart
          items={overview.botsSeats.seatWinShare.map((row) => ({
            id: String(row.seatIndex),
            label: seatIndexLabel(row.seatIndex),
            value: row.gameCount === 0 ? 0 : row.wins / row.gameCount,
            display: `${formatCount(row.wins)} / ${formatCount(row.gameCount)}`,
          }))}
        />
      </AdminModule>

      <AdminModule title="Endings" description="How seats left the table, and how close the winner was.">
        <Subheading>Elimination reasons</Subheading>
        <AdminPieChart
          items={overview.endings.reasons.map((row) => ({
            id: row.reason,
            label: elimReasonLabel(row.reason),
            value: row.count,
          }))}
        />
        <Subheading>Leave and inactivity by seat count</Subheading>
        <AdminHorizontalBarChart
          items={overview.endings.leaveRateByOccupancy.map((row) => ({
            id: `leave-${String(row.occupancy)}`,
            label: occupancyLabel(row.occupancy),
            value: row.leaveGameCount,
            display: `${formatCount(row.leaveGameCount)} leave / ${formatCount(row.inactivityGameCount)} inactive / ${formatCount(row.gameCount)} games`,
          }))}
        />
        <Subheading>Winner leftover lives</Subheading>
        <AdminMetricCard
          label="Average winner lives"
          value={formatMaybeCount(overview.endings.avgWinnerLives)}
        />
        <AdminBucketChart
          items={overview.endings.winnerLivesBuckets.map((row) => ({
            id: row.bucket,
            label: winnerLivesBucketLabel(row.bucket),
            value: row.count,
          }))}
        />
        <Subheading>Match duration</Subheading>
        <AdminBucketChart
          items={overview.endings.durationBuckets.map((row) => ({
            id: row.bucket,
            label: durationBucketLabel(row.bucket),
            value: row.count,
          }))}
        />
      </AdminModule>

      <AdminModule
        title="Retention and feedback"
        description="Rematch is room-code reuse, not unique people. Feedback kinds only — topics stay on the Feedback tab."
      >
        <AdminMetricGrid>
          <AdminMetricCard
            label="Rematch rate"
            value={formatNullablePercent(overview.retention.rematchRate)}
            hint={`${formatCount(overview.retention.rematchGameCount)} games whose room code appears more than once`}
          />
          <AdminMetricCard
            label="Distinct nicknames"
            value={formatCount(overview.retention.distinctNicknames)}
            hint="Display-only, not identity"
          />
          <AdminMetricCard
            label="Feedback pulse"
            value={formatCount(overview.feedbackPulse.reportCount)}
            hint={
              overview.feedbackPulse.reportsPerGame === null
                ? 'Date window only — not occupancy, kit, or match mix'
                : `${overview.feedbackPulse.reportsPerGame.toFixed(2)} reports per game (date window)`
            }
          />
        </AdminMetricGrid>
        <Subheading>Feedback kind</Subheading>
        <AdminPieChart
          items={overview.feedbackPulse.byKind.map((row) => ({
            id: row.kind,
            label: feedbackKindLabel(row.kind),
            value: row.count,
          }))}
        />
      </AdminModule>
    </div>
  );
}

function formatMaybeCount(value: number | null): string {
  return value === null ? '—' : formatCount(value);
}
