/**
 * `/dev/ui` section for the L72-16 table rules strip and sheet (technical spec v7 §4.2, §7.4,
 * §11): the default rules, Random only with three kits excluded and a short clock, a server
 * default above the host maximum of 180 s, and a single allowed kit (15 excluded). Tap a strip
 * to open the read-only sheet. The titles are DEV-only demo copy. DEV only.
 *
 * No PascalCase local component lives here: `react-refresh/only-export-components` would report
 * the `gallery` export beside one. The frame is a plain function that returns JSX.
 */

import { defaultLobbyRules, excludeEveryKitButFirst, type LobbyRules } from '@card-battle/shared';
import type { ReactElement } from 'react';
import type { GallerySection } from '../../dev/gallery-registry';
import { RulesStrip } from './rules-strip';

/** The strip sits on the page ground in the lobby, so the demo shows it on `--bg-0`, a phone column wide. */
function frame(rules: LobbyRules): ReactElement {
  return (
    <div className="max-w-md rounded-v7-chrome bg-v7-bg-0 p-3">
      <RulesStrip rules={rules} />
    </div>
  );
}

export const gallery: GallerySection = {
  id: 'rules',
  title: 'Rules',
  entries: [
    { id: 'default', title: 'Default rules', render: () => frame(defaultLobbyRules()) },
    {
      id: 'random-only',
      title: 'Random only, three kits excluded, 45 s',
      render: () => frame({ excludedKitIds: ['kamikaze', 'ghost', 'gambler'], randomOnly: true, turnTimeSeconds: 45 }),
    },
    {
      id: 'server-default',
      title: 'Server default above the host maximum (300 s)',
      render: () => frame({ ...defaultLobbyRules(), turnTimeSeconds: 300 }),
    },
    {
      id: 'one-allowed',
      title: 'One kit allowed (15 excluded)',
      render: () => frame(excludeEveryKitButFirst(defaultLobbyRules())),
    },
  ],
};
