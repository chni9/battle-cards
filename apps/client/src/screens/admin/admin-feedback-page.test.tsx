// @vitest-environment happy-dom
import { FEEDBACK_TRIAGE_STATUSES, FEEDBACK_TRIAGE_STATUS_LABEL } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../../admin/admin-present';
import { INBOX_PASSWORD_STORAGE_KEY } from '../../inbox/password-storage';
import { renderUi } from '../../test/render';
import { AdminApp } from './admin-app';
import { AdminFeedbackPage } from './admin-feedback-page';
import { makeAdminOverview, makeInboxRow } from './admin-fixtures';
import { installFakeFetch, setAdminPath } from './admin-test-harness';

const INBOX_PATH = '/api/inbox';
const INTRO = "Tester reports from the game. Filter them, then mark each one pending, done or won't do.";
const EMPTY = 'No reports match these filters.';
const RATE_LIMIT = 'Too many wrong passwords. Try again in a few minutes.';

const r1 = makeInboxRow('r1', { message: 'The shop button is hidden', topics: ['ui'] });
const r2 = makeInboxRow('r2', {
  kind: 'idea',
  status: 'done',
  topics: ['card'],
  message: 'A card that copies a card',
  createdAt: '2026-10-19T09:05:00.000Z',
});
const r3 = makeInboxRow('r3', {
  kind: 'confusion',
  status: 'eliminated',
  message: 'Who plays after the delay?',
  createdAt: '2026-10-18T18:45:00.000Z',
});
const ROWS = [r1, r2, r3];

type GroupName = 'Kind' | 'Area' | 'Status';

function chip(group: GroupName, name: string): HTMLElement {
  return within(screen.getByRole('group', { name: group })).getByRole('button', { name });
}

function isPressed(button: HTMLElement): boolean {
  return button.getAttribute('aria-pressed') === 'true';
}

/** The three triage marks of a row or of the report, in Pending, Done, Eliminated order. */
function marksIn(scope: HTMLElement): HTMLButtonElement[] {
  return FEEDBACK_TRIAGE_STATUSES.map((status) =>
    within(scope).getByRole<HTMLButtonElement>('button', { name: FEEDBACK_TRIAGE_STATUS_LABEL[status] }),
  );
}

/**
 * A mark is off while any save runs: `aria-disabled`, never native `disabled`, so a mark pressed
 * by keyboard keeps focus (WCAG 2.4.3). happy-dom keeps focus on a natively disabled button where
 * Chrome drops it to the body, so the missing `disabled` attribute is what pins the fix here.
 */
function isOff(mark: HTMLElement): boolean {
  expect(mark.hasAttribute('disabled')).toBe(false);
  return mark.getAttribute('aria-disabled') === 'true';
}

function markIn(scope: HTMLElement, name: string): HTMLButtonElement {
  return within(scope).getByRole<HTMLButtonElement>('button', { name });
}

/** Ids of the rows on screen. Only valid while no report is open: it repeats the message. */
function listedIds(): string[] {
  return ROWS.filter((row) => screen.queryByText(row.message) !== null).map((row) => row.id);
}

async function renderLoaded(): Promise<{ fake: ReturnType<typeof installFakeFetch>; user: UserEvent }> {
  const fake = installFakeFetch();
  const { user } = renderUi(<AdminFeedbackPage password="secret" />);
  await fake.last(INBOX_PATH).respond(200, ROWS);
  return { fake, user };
}

describe('AdminFeedbackPage (technical spec v7 §7.8, L80-09)', () => {
  it('shows the Feedback intro and Loading… until /api/inbox answers, then the rows', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminFeedbackPage password="secret" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Feedback' })).not.toBeNull();
    expect(screen.getByText(INTRO)).not.toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Loading…');
    expect(screen.queryByRole('group')).toBeNull();
    expect(fake.last(INBOX_PATH).headers['x-inbox-password']).toBe('secret');

    await fake.last(INBOX_PATH).respond(200, ROWS);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('group', { name: 'Kind' })).not.toBeNull();
    expect(screen.getByText(r1.message)).not.toBeNull();
  });

  it('lists Pending rows only by default', async () => {
    await renderLoaded();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(listedIds()).toStrictEqual(['r1']);
  });

  it('each row starts with a status badge: named by its status, tone fill, glyph, no side stripe', async () => {
    const { user } = await renderLoaded();
    await user.click(chip('Status', 'Any status'));
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    // Never color alone (§5.1): the badge has a name and a glyph as well as the fill.
    const expected = [
      [FEEDBACK_TRIAGE_STATUS_LABEL.pending, 'bg-v7-threat-other'],
      [FEEDBACK_TRIAGE_STATUS_LABEL.done, 'bg-v7-upgrade'],
      [FEEDBACK_TRIAGE_STATUS_LABEL.eliminated, 'bg-v7-danger'],
    ] as const;
    for (const [index, [label, tone]] of expected.entries()) {
      const item = items[index];
      if (item === undefined) throw new Error(`no row ${String(index)}`);
      const badge = item.firstElementChild;
      if (badge === null) throw new Error('the row is empty');
      expect(badge.getAttribute('role')).toBe('img');
      expect(badge.getAttribute('aria-label')).toBe(label);
      expect(badge.className).toContain(tone);
      expect(badge.querySelector('svg')).not.toBeNull();
      // A one-sided accent stripe is the Impeccable side-tab defect (spec v7 §12.4).
      expect(item.className).not.toContain('border-l');
    }
  });

  it('kind, area and status filters are aria-pressed toggles', async () => {
    const { user } = await renderLoaded();

    expect(isPressed(chip('Kind', 'All'))).toBe(true);
    for (const name of ['Bug', 'Confusion', 'Idea']) expect(isPressed(chip('Kind', name))).toBe(false);
    await user.click(chip('Kind', 'Idea'));
    expect(isPressed(chip('Kind', 'Idea'))).toBe(true);
    expect(isPressed(chip('Kind', 'All'))).toBe(false);

    expect(isPressed(chip('Area', 'Any area'))).toBe(true);
    for (const name of ['UI', 'Gameplay', 'Card', 'Shop', 'Bot', 'Tutorial', 'Other']) {
      expect(isPressed(chip('Area', name))).toBe(false);
    }
    await user.click(chip('Area', 'Card'));
    expect(isPressed(chip('Area', 'Card'))).toBe(true);
    expect(isPressed(chip('Area', 'Any area'))).toBe(false);

    const status = within(screen.getByRole('group', { name: 'Status' })).getAllByRole('button');
    expect(status.map((button) => button.getAttribute('aria-label') ?? button.textContent)).toStrictEqual([
      'Any status',
      FEEDBACK_TRIAGE_STATUS_LABEL.pending,
      FEEDBACK_TRIAGE_STATUS_LABEL.done,
      FEEDBACK_TRIAGE_STATUS_LABEL.eliminated,
    ]);
    for (const button of status) expect(button.hasAttribute('aria-pressed')).toBe(true);
    // The three icon-only chips keep a tooltip as well as the name; Pending is the default view.
    for (const state of FEEDBACK_TRIAGE_STATUSES) {
      const button = chip('Status', FEEDBACK_TRIAGE_STATUS_LABEL[state]);
      expect(button.getAttribute('title')).toBe(FEEDBACK_TRIAGE_STATUS_LABEL[state]);
      expect(isPressed(button)).toBe(state === 'pending');
    }
    expect(isPressed(chip('Status', 'Any status'))).toBe(false);
    await user.click(chip('Status', FEEDBACK_TRIAGE_STATUS_LABEL.done));
    expect(isPressed(chip('Status', FEEDBACK_TRIAGE_STATUS_LABEL.done))).toBe(true);
    expect(isPressed(chip('Status', FEEDBACK_TRIAGE_STATUS_LABEL.pending))).toBe(false);
  });

  it('the filters narrow the loaded rows on the client, with no further request', async () => {
    const { fake, user } = await renderLoaded();
    await user.click(chip('Status', 'Any status'));
    expect(listedIds()).toStrictEqual(['r1', 'r2', 'r3']);
    await user.click(chip('Kind', 'Idea'));
    expect(listedIds()).toStrictEqual(['r2']);
    await user.click(chip('Kind', 'All'));
    await user.click(chip('Area', 'UI'));
    expect(listedIds()).toStrictEqual(['r1']);
    await user.click(chip('Area', 'Any area'));
    await user.click(chip('Status', FEEDBACK_TRIAGE_STATUS_LABEL.eliminated));
    expect(listedIds()).toStrictEqual(['r3']);
    expect(fake.calls).toHaveLength(1);
  });

  it('a filter with no match shows the empty message', async () => {
    const { user } = await renderLoaded();
    expect(screen.queryByText(EMPTY)).toBeNull();
    // No Pending idea: r2 is the only idea and it is Done.
    await user.click(chip('Kind', 'Idea'));
    expect(screen.getByText(EMPTY)).not.toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    // The filters stay, so the designer can widen the view.
    expect(screen.getByRole('group', { name: 'Kind' })).not.toBeNull();
  });

  it('a row mark sends one PATCH without opening the report and disables every mark until it resolves', async () => {
    const { fake, user } = await renderLoaded();
    const row = screen.getByRole('listitem');
    await user.click(markIn(row, FEEDBACK_TRIAGE_STATUS_LABEL.done));

    expect(fake.to('/api/inbox/r1')).toHaveLength(1);
    const patch = fake.last('/api/inbox/r1');
    expect(patch.method).toBe('PATCH');
    expect(patch.jsonBody).toStrictEqual({ status: 'done' });
    expect(patch.headers['x-inbox-password']).toBe('secret');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(marksIn(row).map(isOff)).toStrictEqual([true, true, true]);

    await patch.respond(200);
    // Done is outside the Pending view, so the row leaves it.
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText(EMPTY)).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fake.to('/api/inbox/r1')).toHaveLength(1);
  });

  it('while a mark saves, the marks of every row are disabled', async () => {
    const { fake, user } = await renderLoaded();
    await user.click(chip('Status', 'Any status'));
    const [first, second, third] = screen.getAllByRole('listitem');
    if (first === undefined || second === undefined || third === undefined) throw new Error('expected three rows');
    await user.click(markIn(first, FEEDBACK_TRIAGE_STATUS_LABEL.eliminated));
    for (const row of [first, second, third]) {
      expect(marksIn(row).map(isOff)).toStrictEqual([true, true, true]);
    }

    await fake.last('/api/inbox/r1').respond(200);
    for (const row of [first, second, third]) {
      expect(marksIn(row).map(isOff)).toStrictEqual([false, false, false]);
    }
    // The row follows the server's answer: its Eliminated mark is now the pressed one.
    expect(marksIn(first).map(isPressed)).toStrictEqual([false, false, true]);
  });

  it('a row mark pressed by keyboard keeps focus while it saves, and a second press sends nothing', async () => {
    const { fake, user } = await renderLoaded();
    await user.click(chip('Status', 'Any status'));
    const [row] = screen.getAllByRole('listitem');
    if (row === undefined) throw new Error('expected a row');
    const done = markIn(row, FEEDBACK_TRIAGE_STATUS_LABEL.done);
    done.focus();
    expect(document.activeElement).toBe(done);

    await user.keyboard('{Enter}');
    expect(fake.to('/api/inbox/r1')).toHaveLength(1);
    expect(isOff(done)).toBe(true);
    expect(document.activeElement).toBe(done);
    // The off mark swallows Enter and Space: still one PATCH.
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(fake.to('/api/inbox/r1')).toHaveLength(1);

    await fake.last('/api/inbox/r1').respond(200);
    expect(isOff(done)).toBe(false);
    expect(isPressed(done)).toBe(true);
    expect(document.activeElement).toBe(done);
  });

  it('a report mark pressed by keyboard keeps focus inside the dialog while it saves', async () => {
    const { fake, user } = await renderLoaded();
    await user.click(screen.getByRole('button', { name: /The shop button is hidden/ }));
    const dialog = await screen.findByRole('dialog');
    const done = markIn(dialog, FEEDBACK_TRIAGE_STATUS_LABEL.done);
    done.focus();
    expect(document.activeElement).toBe(done);

    await user.keyboard('{Enter}');
    expect(fake.to('/api/inbox/r1')).toHaveLength(1);
    expect(isOff(done)).toBe(true);
    expect(document.activeElement).toBe(done);
    await user.keyboard('{Enter}');
    expect(fake.to('/api/inbox/r1')).toHaveLength(1);

    await fake.last('/api/inbox/r1').respond(200);
    expect(isPressed(done)).toBe(true);
    expect(document.activeElement).toBe(done);
  });

  it('the current status mark is a no-op', async () => {
    const { fake, user } = await renderLoaded();
    const row = screen.getByRole('listitem');
    const pending = markIn(row, FEEDBACK_TRIAGE_STATUS_LABEL.pending);
    expect(isPressed(pending)).toBe(true);
    await user.click(pending);
    expect(fake.calls).toHaveLength(1);
    expect(marksIn(row).map(isOff)).toStrictEqual([false, false, false]);
  });

  it.each([
    [503, 'Database unavailable'],
    [429, RATE_LIMIT],
  ])('a failed mark leaves the row unchanged, shows an alert and re-enables the marks (%i)', async (status, copy) => {
    const { fake, user } = await renderLoaded();
    const row = screen.getByRole('listitem');
    await user.click(markIn(row, FEEDBACK_TRIAGE_STATUS_LABEL.done));
    expect(screen.queryByRole('alert')).toBeNull();

    await fake.last('/api/inbox/r1').respond(status);
    expect(screen.getByRole('alert').textContent).toBe(copy);
    // Still in the Pending view, still Pending, and every mark can be pressed again.
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(marksIn(row).map(isPressed)).toStrictEqual([true, false, false]);
    expect(marksIn(row).map(isOff)).toStrictEqual([false, false, false]);
  });

  it('a 401 on a mark clears the stored key and leaves the row unchanged', async () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    const { fake, user } = await renderLoaded();
    const row = screen.getByRole('listitem');
    await user.click(markIn(row, FEEDBACK_TRIAGE_STATUS_LABEL.done));
    await fake.last('/api/inbox/r1').respond(401);
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
    expect(marksIn(row).map(isPressed)).toStrictEqual([true, false, false]);
  });

  it('a retry after a failed mark clears the alert and updates the row', async () => {
    const { fake, user } = await renderLoaded();
    await user.click(chip('Status', 'Any status'));
    const row = screen.getAllByRole('listitem')[0];
    if (row === undefined) throw new Error('expected a row');
    await user.click(markIn(row, FEEDBACK_TRIAGE_STATUS_LABEL.done));
    await fake.last('/api/inbox/r1').respond(503);
    expect(screen.getByRole('alert')).not.toBeNull();

    await user.click(markIn(row, FEEDBACK_TRIAGE_STATUS_LABEL.done));
    expect(fake.to('/api/inbox/r1')).toHaveLength(2);
    expect(screen.queryByRole('alert')).toBeNull();
    await fake.last('/api/inbox/r1').respond(200);
    expect(marksIn(row).map(isPressed)).toStrictEqual([false, true, false]);
  });

  it('a 401 on a mark that resolves after Sign out and re-unlock does not lock the new session', async () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'old');
    setAdminPath('/admin/feedback');
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminApp />);
    await fake.last(INBOX_PATH).respond(200, ROWS);
    await user.click(markIn(screen.getByRole('listitem'), FEEDBACK_TRIAGE_STATUS_LABEL.done));
    const staleMark = fake.last('/api/inbox/r1');

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await user.type(screen.getByLabelText('Password'), 'new{Enter}');
    await fake.last('/api/admin/overview').respond(200, makeAdminOverview());
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('new');

    await staleMark.respond(401);
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('new');
  });

  it('createdAt goes through formatDateTime in rows and the report', async () => {
    const { user } = await renderLoaded();
    const row = screen.getByRole('listitem');
    expect(row.textContent).toContain(formatDateTime(r1.createdAt));
    expect(row.textContent).not.toContain(r1.createdAt);

    await user.click(within(row).getByRole('button', { name: /The shop button is hidden/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain(formatDateTime(r1.createdAt));
    expect(dialog.textContent).not.toContain(r1.createdAt);
  });

  it('the report shows every kept field with — when null, in tool mode', async () => {
    const { user } = await renderLoaded();
    await user.click(screen.getByRole('button', { name: /The shop button is hidden/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('data-mode')).toBe('tool');
    expect(within(dialog).getByRole('heading', { name: 'Bug' })).not.toBeNull();

    expect(within(dialog).getByText('About: UI')).not.toBeNull();
    expect(within(dialog).getByText(r1.message)).not.toBeNull();
    expect(within(dialog).getByText('Contact: —')).not.toBeNull();
    expect(within(dialog).getByText('Nickname: —')).not.toBeNull();
    expect(within(dialog).getByText('Code: —')).not.toBeNull();
    expect(within(dialog).getByText('Screen: home')).not.toBeNull();
    expect(within(dialog).getByText('Play: —')).not.toBeNull();
    expect(within(dialog).getByText('Protocol: 45')).not.toBeNull();
    expect(within(dialog).getByText('User agent: —')).not.toBeNull();
    const tail = within(dialog).getByRole('region', { name: 'Log tail' });
    expect(tail.getAttribute('data-scroll-axis')).toBe('x');
    expect(tail.querySelector('pre')?.textContent).toBe('null');
    // The same marks as the row, Pending pressed.
    expect(marksIn(dialog).map(isPressed)).toStrictEqual([true, false, false]);
  });

  it('a report with values shows them and the log tail as JSON', async () => {
    const tail = [{ type: 'play', actor: 'Bea' }, { type: 'turn', n: 3 }];
    const full = makeInboxRow('r4', {
      kind: 'idea',
      message: 'A full report',
      contact: 'bea@example.com',
      nickname: 'Bea',
      gameCode: 'ABCDEF',
      playKind: 'tutorial',
      userAgent: 'TestAgent/1.0',
      logTail: tail,
      topics: ['card', 'shop'],
    });
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminFeedbackPage password="secret" />);
    await fake.last(INBOX_PATH).respond(200, [full]);
    await user.click(screen.getByRole('button', { name: /A full report/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('About: Card, Shop')).not.toBeNull();
    expect(within(dialog).getByText('Contact: bea@example.com')).not.toBeNull();
    expect(within(dialog).getByText('Nickname: Bea')).not.toBeNull();
    expect(within(dialog).getByText('Code: ABCDEF')).not.toBeNull();
    expect(within(dialog).getByText('Play: tutorial')).not.toBeNull();
    expect(within(dialog).getByText('User agent: TestAgent/1.0')).not.toBeNull();
    expect(
      within(within(dialog).getByRole('region', { name: 'Log tail' })).getByText((_text, node) => node?.tagName === 'PRE')
        .textContent,
    ).toBe(JSON.stringify(tail, null, 2));
  });

  it('a mark in the report sends one PATCH and the report follows the row, then Close closes it', async () => {
    const { fake, user } = await renderLoaded();
    await user.click(screen.getByRole('button', { name: /The shop button is hidden/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(markIn(dialog, FEEDBACK_TRIAGE_STATUS_LABEL.done));
    expect(fake.to('/api/inbox/r1')).toHaveLength(1);
    expect(fake.last('/api/inbox/r1').jsonBody).toStrictEqual({ status: 'done' });
    expect(marksIn(dialog).map(isOff)).toStrictEqual([true, true, true]);

    await fake.last('/api/inbox/r1').respond(200);
    expect(marksIn(dialog).map(isPressed)).toStrictEqual([false, true, false]);
    expect(marksIn(dialog).map(isOff)).toStrictEqual([false, false, false]);

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a load error shows an alert', async () => {
    const fake = installFakeFetch();
    renderUi(<AdminFeedbackPage password="secret" />);
    await fake.last(INBOX_PATH).respond(503);
    expect(screen.getByRole('alert').textContent).toBe('Database unavailable');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
