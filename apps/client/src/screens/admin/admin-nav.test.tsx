// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { AdminNav } from './admin-nav';
import { setAdminPath } from './admin-test-harness';

const onPopState = vi.fn();

afterEach(() => {
  window.removeEventListener('popstate', onPopState);
  onPopState.mockReset();
});

function sectionLinks(): HTMLElement[] {
  return within(screen.getByRole('navigation', { name: 'Admin sections' })).getAllByRole('link');
}

function currentLabels(): (string | null)[] {
  return sectionLinks()
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent);
}

describe('AdminNav (Appendix A admin-nav, L80-01)', () => {
  it('lists Overview, Matches, Kits, Feedback, Database in order inside a nav', () => {
    setAdminPath('/admin');
    renderUi(<AdminNav />);
    expect(sectionLinks().map((link) => [link.textContent, link.getAttribute('href')])).toStrictEqual([
      ['Overview', '/admin'],
      ['Matches', '/admin/games'],
      ['Kits', '/admin/kits'],
      ['Feedback', '/admin/feedback'],
      ['Database', '/admin/data'],
    ]);
    expect(currentLabels()).toStrictEqual(['Overview']);
  });

  it.each([
    ['/admin/games/abc', 'Matches'],
    ['/admin/data/feedback_reports', 'Database'],
  ])('marks the section of a nested route aria-current="page" (%s)', (path, label) => {
    setAdminPath(path);
    renderUi(<AdminNav />);
    expect(currentLabels()).toStrictEqual([label]);
    expect(sectionLinks().filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
  });

  it('marks no section on /admin/dashboard (exact-or-prefix rule kept)', () => {
    setAdminPath('/admin/dashboard');
    renderUi(<AdminNav />);
    expect(sectionLinks().filter((link) => link.hasAttribute('aria-current'))).toHaveLength(0);
  });

  it('a plain click pushes the section path and fires popstate', async () => {
    setAdminPath('/admin');
    const { user } = renderUi(<AdminNav />);
    window.addEventListener('popstate', onPopState);
    await user.click(screen.getByRole('link', { name: 'Kits' }));
    expect(window.location.pathname).toBe('/admin/kits');
    expect(onPopState).toHaveBeenCalledTimes(1);
  });

  it('a Cmd or Ctrl click is left to the browser', async () => {
    const defaultPrevented: boolean[] = [];
    // Stands in for the browser at the end of the bubble path: records whether the page left
    // the click alone, then cancels it so happy-dom does not navigate the test window.
    const browser = (event: MouseEvent): void => {
      defaultPrevented.push(event.defaultPrevented);
      event.preventDefault();
    };
    window.addEventListener('click', browser);
    try {
      for (const key of ['Meta', 'Control']) {
        setAdminPath('/admin');
        const { user, unmount } = renderUi(<AdminNav />);
        window.addEventListener('popstate', onPopState);
        await user.keyboard(`{${key}>}`);
        await user.click(screen.getByRole('link', { name: 'Kits' }));
        await user.keyboard(`{/${key}}`);
        expect(window.location.pathname, key).toBe('/admin');
        expect(onPopState, key).not.toHaveBeenCalled();
        unmount();
      }
    } finally {
      window.removeEventListener('click', browser);
    }
    expect(defaultPrevented).toStrictEqual([false, false]);
  });
});
