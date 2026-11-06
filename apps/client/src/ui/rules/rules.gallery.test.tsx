// @vitest-environment happy-dom
/**
 * `/dev/ui` rules section — technical spec v7 §4.2: every ui/ component appears in the gallery.
 * Each entry draws one strip that opens the sheet; the fixtures pin the cases L72-21 inspects.
 */

import { KIT_IDS } from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GalleryEntry } from '../../dev/gallery-registry';
import { renderUi } from '../../test/render';
import { gallery } from './rules.gallery';

function entryById(id: string): GalleryEntry {
  const entry = gallery.entries.find((candidate) => candidate.id === id);
  if (entry === undefined) {
    throw new Error(`No ${id} entry`);
  }
  return entry;
}

describe('rules gallery (/dev/ui)', () => {
  it('registers the rules section with its strips and editor demos', () => {
    expect(gallery.id).toBe('rules');
    expect(gallery.entries.map((entry) => entry.id)).toEqual([
      'default', 'random-only', 'server-default', 'one-allowed', 'host-editor', 'solo-server-default', 'editor-disabled',
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

  it('applies a host edit live in the host-editor entry', async () => {
    const { user } = renderUi(<>{entryById('host-editor').render()}</>);
    await user.click(screen.getByRole('button', { name: 'Table rules' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('button', { name: 'Ghost' }));
    expect(within(screen.getByRole('button', { name: 'Table rules' })).getAllByText('Excluded')).toHaveLength(1);
  });

  it('reads Server default in the solo entry until a slider release', async () => {
    const { user } = renderUi(<>{entryById('solo-server-default').render()}</>);
    const strip = (): HTMLElement => screen.getByRole('button', { name: 'Table rules' });
    expect(within(strip()).getByText('Server default')).toBeTruthy();
    await user.click(strip());
    const slider = within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('slider', { name: 'Human turn' });
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    fireEvent.pointerUp(slider);
    expect(within(strip()).getByText('90s')).toBeTruthy();
  });
});
