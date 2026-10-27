// @vitest-environment happy-dom
/**
 * `/dev/ui` rules section — technical spec v7 §4.2: every ui/ component appears in the gallery.
 * Each entry draws one strip that opens the sheet; the fixtures pin the cases L72-21 inspects.
 */

import { KIT_IDS } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { gallery } from './rules.gallery';

describe('rules gallery (/dev/ui)', () => {
  it('registers the rules section with the four strips', () => {
    expect(gallery.id).toBe('rules');
    expect(gallery.entries.map((entry) => entry.id)).toEqual([
      'default',
      'random-only',
      'server-default',
      'one-allowed',
    ]);
  });

  it('draws one Table rules strip with all 16 kits in every entry', () => {
    for (const entry of gallery.entries) {
      const { unmount } = renderUi(<>{entry.render()}</>);
      const strip = screen.getByRole('button', { name: 'Table rules' });
      expect(strip.querySelectorAll('[data-kit-id]'), entry.id).toHaveLength(KIT_IDS.length);
      unmount();
    }
  });

  it.each([
    { id: 'default', seconds: '60s', random: false, excluded: 0 },
    { id: 'random-only', seconds: '45s', random: true, excluded: 3 },
    { id: 'server-default', seconds: '300s', random: false, excluded: 0 },
    { id: 'one-allowed', seconds: '60s', random: false, excluded: 15 },
  ])('shows $seconds, $excluded excluded and Random $random in the $id entry', (expected) => {
    const entry = gallery.entries.find((candidate) => candidate.id === expected.id);
    if (entry === undefined) {
      throw new Error(`No ${expected.id} entry`);
    }
    renderUi(<>{entry.render()}</>);
    const strip = screen.getByRole('button', { name: 'Table rules' });
    expect(within(strip).getByText(expected.seconds)).toBeTruthy();
    expect(within(strip).queryByText('Random') !== null).toBe(expected.random);
    expect(within(strip).queryAllByText('Excluded')).toHaveLength(expected.excluded);
  });
});
