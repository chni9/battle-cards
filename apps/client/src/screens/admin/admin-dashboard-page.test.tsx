// @vitest-environment happy-dom
import type { AdminOverview } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportOverviewXlsx } from '../../export/admin-xlsx';
import { renderUi } from '../../test/render';
import { AdminDashboardPage } from './admin-dashboard-page';
import { makeAdminOverview } from './admin-fixtures';
import { installFakeFetch } from './admin-test-harness';

// No test writes a file: the page only has to hand the loaded overview to the exporter.
vi.mock('../../export/admin-xlsx', () => ({ exportOverviewXlsx: vi.fn() }));
const exportOverview = vi.mocked(exportOverviewXlsx);

afterEach(() => {
  exportOverview.mockClear();
});

const OVERVIEW_PATH = '/api/admin/overview';
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

/** An overview whose General "Finished matches" card reads `gameCount`. */
function overviewOf(gameCount: number): AdminOverview {
  const empty = makeAdminOverview();
  return makeAdminOverview({ gameCount, general: { ...empty.general, gameCount } });
}

function actorsSelect(): HTMLSelectElement {
  const [first] = screen.getAllByRole<HTMLSelectElement>('combobox', { name: 'Actors' });
  if (first === undefined) throw new Error('No Actors select rendered');
  return first;
}

function finishedMatchesCard(): HTMLElement {
  const card = screen.getByText('Finished matches').parentElement;
  if (card === null) throw new Error('The Finished matches card has no parent');
  return card;
}

function expectNineModules(): void {
  for (const title of MODULE_TITLES) {
    expect(screen.getByRole('heading', { level: 3, name: title })).not.toBeNull();
  }
}

describe('AdminDashboardPage (technical spec v7 §7.8, L80-05)', () => {
  it('shows Loading… until the first response, never No data', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminDashboardPage password="secret" />);
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expect(screen.queryByText('No data')).toBeNull();

    await fake.last(OVERVIEW_PATH).respond(200, makeAdminOverview());
    expect(screen.queryByRole('status')).toBeNull();
    expectNineModules();
  });

  it('Actors Humans refetches with actors=humans and both omits actors', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDashboardPage password="secret" />);
    await fake.last(OVERVIEW_PATH).respond(200, makeAdminOverview());
    expect(fake.to(OVERVIEW_PATH)).toHaveLength(1);
    expect(fake.last(OVERVIEW_PATH).url.searchParams.has('actors')).toBe(false);

    await user.selectOptions(actorsSelect(), 'humans');
    expect(fake.to(OVERVIEW_PATH)).toHaveLength(2);
    expect(fake.last(OVERVIEW_PATH).url.searchParams.get('actors')).toBe('humans');
    expect(fake.last(OVERVIEW_PATH).headers['x-inbox-password']).toBe('secret');
    // The new request is still pending: the loaded overview stays on screen, under Loading….
    expectNineModules();
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    await fake.last(OVERVIEW_PATH).respond(200, makeAdminOverview());
    expect(screen.queryByRole('status')).toBeNull();

    await user.selectOptions(actorsSelect(), 'both');
    expect(fake.to(OVERVIEW_PATH)).toHaveLength(3);
    expect(fake.last(OVERVIEW_PATH).url.searchParams.has('actors')).toBe(false);
  });

  it('an error never blanks a loaded overview, and a later success clears the alert', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDashboardPage password="secret" />);
    await fake.last(OVERVIEW_PATH).respond(200, makeAdminOverview());
    expect(screen.queryByRole('alert')).toBeNull();

    // An edit alone sends nothing: the request is keyed on the applied filters, not the form's.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'humans');
    expect(fake.to(OVERVIEW_PATH)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(fake.to(OVERVIEW_PATH)).toHaveLength(2);
    expect(fake.last(OVERVIEW_PATH).url.searchParams.get('bots')).toBe('humans');
    // A refetch in flight keeps the loaded overview on screen.
    expectNineModules();
    await fake.last(OVERVIEW_PATH).respond(503);
    expect(screen.getByRole('alert').textContent).toBe('Database unavailable');
    expectNineModules();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'withBots');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(fake.to(OVERVIEW_PATH)).toHaveLength(3);
    expect(fake.last(OVERVIEW_PATH).url.searchParams.get('bots')).toBe('withBots');
    // The retry replaces the stale alert with Loading…; the modules stay.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expectNineModules();
    await fake.last(OVERVIEW_PATH).respond(200, makeAdminOverview());
    expect(screen.queryByRole('alert')).toBeNull();
    expectNineModules();
  });

  it('after a 503, Apply with no filter edit asks again and a 200 clears the alert', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDashboardPage password="secret" />);
    await fake.last(OVERVIEW_PATH).respond(503);
    expect(screen.getByRole('alert').textContent).toBe('Database unavailable');
    // Nothing loaded, so no module and no Actors control: Apply is the only retry.
    expect(screen.queryByRole('heading', { level: 3, name: 'General' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Actors' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(fake.to(OVERVIEW_PATH)).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    await fake.last(OVERVIEW_PATH).respond(200, makeAdminOverview());
    expect(screen.queryByRole('alert')).toBeNull();
    expectNineModules();
  });

  it('a refetch shows Loading… while the nine modules stay on screen', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDashboardPage password="secret" />);
    await fake.last(OVERVIEW_PATH).respond(200, overviewOf(4));
    expect(screen.queryByRole('status')).toBeNull();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'humans');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    // Never blank a loaded overview: the old numbers stay until the new ones land.
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expectNineModules();
    expect(within(finishedMatchesCard()).getByText('4')).not.toBeNull();

    await fake.last(OVERVIEW_PATH).respond(200, overviewOf(5));
    expect(screen.queryByRole('status')).toBeNull();
    expect(within(finishedMatchesCard()).getByText('5')).not.toBeNull();
  });

  it('ignores a stale overview response', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDashboardPage password="secret" />);
    await fake.last(OVERVIEW_PATH).respond(200, overviewOf(0));

    await user.selectOptions(actorsSelect(), 'humans');
    const humansCall = fake.last(OVERVIEW_PATH);
    await user.selectOptions(actorsSelect(), 'bots');
    const botsCall = fake.last(OVERVIEW_PATH);
    expect(humansCall.url.searchParams.get('actors')).toBe('humans');
    expect(botsCall.url.searchParams.get('actors')).toBe('bots');

    await botsCall.respond(200, overviewOf(2));
    expect(within(finishedMatchesCard()).getByText('2')).not.toBeNull();
    await humansCall.respond(200, overviewOf(1));
    expect(within(finishedMatchesCard()).getByText('2')).not.toBeNull();
    expect(within(finishedMatchesCard()).queryByText('1')).toBeNull();
  });

  it('Download Excel appears once loaded and exports the overview', async () => {
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminDashboardPage password="secret" />);
    expect(screen.queryByRole('button', { name: 'Download Excel' })).toBeNull();

    const overview = overviewOf(7);
    await fake.last(OVERVIEW_PATH).respond(200, overview);
    await user.click(screen.getByRole('button', { name: 'Download Excel' }));
    expect(exportOverview.mock.calls).toStrictEqual([[overview]]);
  });
});
