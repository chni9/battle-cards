// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { INBOX_PASSWORD_STORAGE_KEY } from '../../inbox/password-storage';
import { renderUi } from '../../test/render';
import { AdminApp } from './admin-app';
import { makeAdminOverview } from './admin-fixtures';
import { installFakeFetch, setAdminPath } from './admin-test-harness';

const BLURB = 'Finished matches, kit balance, feedback, and raw log tables. Not linked from the player hub.';

describe('AdminApp shell (technical spec v7 §7.8, L61-06, L80-01)', () => {
  it('opens the tool scope with the Designer header', () => {
    installFakeFetch();
    setAdminPath('/admin');
    renderUi(<AdminApp />);
    const main = screen.getByRole('main');
    expect(main.getAttribute('data-mode')).toBe('tool');
    expect(within(main).getByText('Designer')).not.toBeNull();
    expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe('Insights');
    expect(within(main).getByText(BLURB)).not.toBeNull();
  });

  it('a stored card-battle.v6.inboxPassword skips the gate with no probe', () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    setAdminPath('/admin');
    const fake = installFakeFetch();
    renderUi(<AdminApp />);
    expect(screen.queryByLabelText('Password')).toBeNull();
    // The one request is the Overview page's own load: the page is mounted and no gate ever was.
    expect(screen.getByRole('heading', { level: 2, name: 'Overview' })).not.toBeNull();
    expect(fake.calls.map((call) => call.url.pathname)).toStrictEqual(['/api/admin/overview']);
  });

  it('every admin request carries X-Inbox-Password', async () => {
    setAdminPath('/admin');
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminApp />);
    await user.type(screen.getByLabelText('Password'), 'secret{Enter}');
    await fake.last('/api/admin/overview').respond(200, makeAdminOverview());
    expect(screen.queryByLabelText('Password')).toBeNull();
    await user.click(screen.getByRole('link', { name: 'Matches' }));
    await user.click(screen.getByRole('link', { name: 'Kits' }));
    expect(fake.calls.map((call) => call.url.pathname)).toStrictEqual([
      '/api/admin/overview',
      '/api/admin/overview',
      '/api/admin/games',
      '/api/admin/kit-stats',
    ]);
    expect(fake.calls.map((call) => call.headers['x-inbox-password'])).toStrictEqual([
      'secret',
      'secret',
      'secret',
      'secret',
    ]);
  });

  it.each([
    ['/admin', '/api/admin/overview'],
    ['/admin/games', '/api/admin/games'],
    ['/admin/kits', '/api/admin/kit-stats'],
    ['/admin/feedback', '/api/inbox'],
    ['/admin/data', '/api/admin/tables/finished_games'],
  ])('a 401 on any page clears the stored key and shows the gate (%s)', async (path, endpoint) => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    setAdminPath(path);
    const fake = installFakeFetch();
    renderUi(<AdminApp />);
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(fake.calls.map((call) => call.url.pathname)).toStrictEqual([endpoint]);
    await fake.last(endpoint).respond(401);
    expect(screen.getByLabelText('Password')).not.toBeNull();
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
  });
});

describe('AdminApp sign-out and rate limit (L80-02)', () => {
  function signOutButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Sign out' });
  }

  it('Sign out removes the key and shows an empty gate', async () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    setAdminPath('/admin');
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminApp />);
    await fake.last('/api/admin/overview').respond(200, makeAdminOverview());
    await user.click(signOutButton());
    const field = screen.getByLabelText('Password');
    expect(field instanceof HTMLInputElement && field.value).toBe('');
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  });

  it('Sign out is absent while the gate shows', () => {
    setAdminPath('/admin');
    installFakeFetch();
    renderUi(<AdminApp />);
    expect(screen.getByLabelText('Password')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  });

  it('the next Unlock after sign-out probes again', async () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    setAdminPath('/admin');
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminApp />);
    await fake.last('/api/admin/overview').respond(200, makeAdminOverview());
    expect(fake.to('/api/admin/overview')).toHaveLength(1);
    await user.click(signOutButton());
    await user.type(screen.getByLabelText('Password'), 'secret{Enter}');
    expect(fake.to('/api/admin/overview')).toHaveLength(2);
    expect(fake.last('/api/admin/overview').headers['x-inbox-password']).toBe('secret');
  });

  it('a page request resolving after Sign out leaves the key absent', async () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    setAdminPath('/admin/kits');
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminApp />);
    await user.click(signOutButton());
    await fake.last('/api/admin/kit-stats').respond(200, { sampleGames: 0, rows: [] });
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBeNull();
    expect(screen.getByLabelText('Password')).not.toBeNull();
  });

  it('a Feedback 401 that resolves after Sign out does not lock the next session', async () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'old');
    setAdminPath('/admin/feedback');
    const fake = installFakeFetch();
    const { user } = renderUi(<AdminApp />);
    const staleList = fake.last('/api/inbox');
    await user.click(signOutButton());
    await user.type(screen.getByLabelText('Password'), 'new{Enter}');
    await fake.last('/api/admin/overview').respond(200, makeAdminOverview());
    expect(screen.queryByLabelText('Password')).toBeNull();
    await staleList.respond(401);
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('new');
  });

  it('a 429 on the Feedback list shows the rate-limit copy and keeps the key', async () => {
    sessionStorage.setItem(INBOX_PASSWORD_STORAGE_KEY, 'secret');
    setAdminPath('/admin/feedback');
    const fake = installFakeFetch();
    renderUi(<AdminApp />);
    await fake.last('/api/inbox').respond(429);
    expect(screen.getByText('Too many wrong passwords. Try again in a few minutes.')).not.toBeNull();
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(sessionStorage.getItem(INBOX_PASSWORD_STORAGE_KEY)).toBe('secret');
  });
});
