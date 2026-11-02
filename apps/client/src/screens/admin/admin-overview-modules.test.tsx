// @vitest-environment happy-dom
import type { AdminActorsFilter, AdminOverview } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { kitDisplayName } from '../../admin/admin-present';
import { renderUi } from '../../test/render';
import { makeAdminOverview } from './admin-fixtures';
import { AdminOverviewModules } from './admin-overview-modules';

const MODULE_TITLES = [
  'General',
  'Volume',
  'Gameplay',
  'Economy',
  'Combat',
  'Hidden tools',
  'Bots and seats',
  'Endings',
  'Retention and feedback',
];

/** The empty-log overview with `thinkTimePartial` set, plus whatever else the test overrides. */
function overviewWith(
  thinkTimePartial: boolean,
  gameplay: Partial<AdminOverview['gameplay']> = {},
): AdminOverview {
  const empty = makeAdminOverview();
  return makeAdminOverview({ gameplay: { ...empty.gameplay, thinkTimePartial, ...gameplay } });
}

function renderModules(overview: AdminOverview, actors: AdminActorsFilter = 'both') {
  const onActorsChange = vi.fn<(next: AdminActorsFilter) => void>();
  const view = renderUi(
    <AdminOverviewModules overview={overview} actors={actors} onActorsChange={onActorsChange} />,
  );
  return { ...view, onActorsChange };
}

function actorSelects(): HTMLSelectElement[] {
  return screen.getAllByRole<HTMLSelectElement>('combobox', { name: 'Actors' });
}

describe('AdminOverviewModules (technical spec v7 §7.8, L80-05)', () => {
  it('renders the nine module headings in order', () => {
    renderModules(overviewWith(false));
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toStrictEqual(MODULE_TITLES);
  });

  it('keeps the UTC, non-attack and match-mix notes', () => {
    // A chart caption renders only beside data: an empty chart says No data and nothing else.
    const empty = makeAdminOverview();
    renderModules(
      makeAdminOverview({
        general: {
          ...empty.general,
          durationByOpponentMix: [{ hasBots: false, gameCount: 1, avgDurationMs: 60_000 }],
        },
        volume: { ...empty.volume, gamesByHourUtc: [{ hour: 12, gameCount: 1 }] },
        combat: { ...empty.combat, outcomes: [{ outcome: 'applied', count: 1 }] },
      }),
    );
    expect(screen.getByText('Hours are UTC.')).not.toBeNull();
    expect(
      screen.getByText('Tax, Suicide, and Imposition life loss is not attack damage.'),
    ).not.toBeNull();
    expect(screen.getByText(/Ignores the opponents match-mix filter/)).not.toBeNull();
  });

  it('shows the New matches only note when thinkTimePartial is set', () => {
    const { unmount } = renderModules(
      overviewWith(true, { thinkTimeSeatCount: 3, actorSeatCount: 8 }),
    );
    const note = screen.getByText(/New matches only/);
    expect(note.textContent).toBe(
      'New matches only — think time is missing on pre-migration rows (3 of 8 seats).',
    );
    unmount();

    renderModules(overviewWith(false));
    expect(screen.queryByText(/New matches only/)).toBeNull();
  });

  it('puts an Actors select on the five actor-level headers', async () => {
    const { user, onActorsChange } = renderModules(overviewWith(false));
    const selects = actorSelects();
    expect(selects).toHaveLength(5);
    for (const select of selects) {
      expect(Array.from(select.options, (option) => option.text)).toStrictEqual([
        'Humans and bots',
        'Humans',
        'Bots',
      ]);
    }

    const [first] = selects;
    if (first === undefined) throw new Error('No Actors select rendered');
    await user.selectOptions(first, 'humans');
    expect(onActorsChange.mock.calls).toStrictEqual([['humans']]);
  });

  it('the five Actors selects follow the one actors value', () => {
    renderModules(overviewWith(false), 'bots');
    expect(actorSelects().map((select) => select.value)).toStrictEqual([
      'bots',
      'bots',
      'bots',
      'bots',
      'bots',
    ]);
  });

  it('keeps the Kit wins Show select local', async () => {
    const overview = overviewWith(false, {
      kitSampleGames: 2,
      kits: [
        { kitId: 'kamikaze', picks: 4, wins: 3, pickRate: 0.5, winRate: 0.75 },
        { kitId: 'scientific', picks: 0, wins: 0, pickRate: 0, winRate: 0 },
      ],
    });
    const { user, onActorsChange } = renderModules(overview);
    const caption = screen.getByText(/Win rate hides kits with zero picks/);
    const chart = caption.closest('figure');
    if (chart === null) throw new Error('The kit chart has no figure');
    expect(within(chart).getByText(kitDisplayName('scientific'))).not.toBeNull();
    expect(within(chart).getByText('3')).not.toBeNull();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Show' }), 'Win rate');

    expect(within(chart).queryByText(kitDisplayName('scientific'))).toBeNull();
    expect(within(chart).getByText(kitDisplayName('kamikaze'))).not.toBeNull();
    expect(within(chart).getByText('75.0%')).not.toBeNull();
    expect(onActorsChange).not.toHaveBeenCalled();
  });

  it('renders the pick × win scatter', () => {
    renderModules(
      overviewWith(false, {
        kits: [{ kitId: 'kamikaze', picks: 4, wins: 3, pickRate: 0.5, winRate: 0.75 }],
      }),
    );
    const scatter = screen.getByRole('img', { name: 'Win rate versus Pick rate' });
    expect(scatter.querySelectorAll('circle')).toHaveLength(1);
    expect(screen.getByText('Same numbers as the Kits table.')).not.toBeNull();
  });

  it('every select uses the 16 px input step', () => {
    renderModules(overviewWith(false));
    const selects = screen.getAllByRole('combobox');
    // Five Actors selects and the Kit wins Show select: a vacuous pass is not allowed.
    expect(selects).toHaveLength(6);
    for (const select of selects) {
      expect(select.classList.contains('text-v7-input')).toBe(true);
    }
  });
});
