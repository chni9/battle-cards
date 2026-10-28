/**
 * The five admin sections (Appendix A `admin-nav`, L61-06), as links in tool mode (L80-01). The
 * shell re-renders this on every `popstate`, so the current section follows the URL.
 */

import type { ReactElement } from 'react';

import { ADMIN_SECTIONS, adminSectionHref } from '../../admin/admin-routes';
import { AdminLinkBar } from './admin-ui';

export function AdminNav(): ReactElement {
  return (
    <AdminLinkBar
      label="Admin sections"
      links={ADMIN_SECTIONS}
      currentHref={adminSectionHref(window.location.pathname)}
    />
  );
}
