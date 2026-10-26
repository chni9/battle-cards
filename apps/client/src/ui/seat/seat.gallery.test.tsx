// @vitest-environment happy-dom
/**
 * `/dev/ui` seat section — technical spec v7 §4.2: every ui/ component appears in the gallery.
 * It is found by the same glob `dev/ui-gallery.tsx` uses, so a section that is not discovered
 * fails here too.
 */

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { collectGallerySections, type GalleryModule } from '../../dev/gallery-registry';
import { renderUi } from '../../test/render';

const sections = collectGallerySections(import.meta.glob<GalleryModule>('../**/*.gallery.tsx', { eager: true }));

describe('seat gallery (/dev/ui · L72-19)', () => {
  it('is discovered under the "seat" id', () => {
    expect(sections.map((s) => s.id)).toContain('seat');
  });

  it('shows every PlayerName seat, BotSeatLabel tier and ConnectionBadge state', () => {
    const seat = sections.find((s) => s.id === 'seat');
    if (seat === undefined) throw new Error('seat gallery section missing');
    renderUi(
      <>
        {seat.entries.map((entry) => (
          <div key={entry.id}>{entry.render()}</div>
        ))}
      </>,
    );
    for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
      expect(screen.getByText(`Seat ${index}`).getAttribute('data-seat-index')).toBe(String(index));
    }
    expect(screen.getByText('Ana').getAttribute('data-seat-index')).toBe('0');
    expect(screen.getByText('Unknown').hasAttribute('data-seat-index')).toBe(false);
    for (const text of ['Easy', 'Normal', 'Hard', 'eliminated', 'disconnected — grace', 'absent 2/3', 'idle timeouts 4/5']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
  });

  it('never shows a nickname longer than the server accepts (24 characters)', () => {
    const seat = sections.find((s) => s.id === 'seat');
    if (seat === undefined) throw new Error('seat gallery section missing');
    const { container } = renderUi(
      <>
        {seat.entries.map((entry) => (
          <div key={entry.id}>{entry.render()}</div>
        ))}
      </>,
    );
    const nicknames = [...container.querySelectorAll('.font-v7-display')].map((node) => node.textContent);
    expect(nicknames.length).toBeGreaterThan(8);
    for (const nickname of nicknames) expect(nickname.length).toBeLessThanOrEqual(24);
  });
});
