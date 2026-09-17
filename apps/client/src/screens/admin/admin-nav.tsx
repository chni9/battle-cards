import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';

const LINKS: { href: string; label: string }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/games', label: 'Games' },
  { href: '/admin/kits', label: 'Kits' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/data', label: 'Data' },
];

export function AdminNav(): ReactElement {
  const path = window.location.pathname.replace(/\/$/, '') || '/admin';
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border-soft pb-4">
      {LINKS.map((link) => {
        const active = path === link.href || (link.href !== '/admin' && path.startsWith(link.href));
        return (
          <Button
            key={link.href}
            compact
            type="button"
            variant={active ? 'green' : 'orange'}
            onClick={() => {
              window.history.pushState({}, '', link.href);
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            {link.label}
          </Button>
        );
      })}
    </nav>
  );
}
