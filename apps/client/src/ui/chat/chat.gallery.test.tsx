// @vitest-environment happy-dom
/**
 * `/dev/ui` chat section — technical spec v7 §4.2: every ui/ component appears in the gallery.
 * Each entry draws the transcript; only the read-only one has no composer (L72-21 reads the
 * input's 16 px on the others).
 */

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { gallery } from './chat.gallery';

describe('chat gallery (/dev/ui)', () => {
  it('registers the chat section with the transcript, empty, read-only and longest-line entries', () => {
    expect(gallery.id).toBe('chat');
    expect(gallery.entries.map((entry) => entry.id)).toEqual(['transcript', 'empty', 'read-only', 'longest-line']);
  });
  it('renders a log in every entry and a composer in all but the read-only one', () => {
    for (const entry of gallery.entries) {
      const { unmount } = renderUi(<>{entry.render()}</>);
      expect(screen.getByRole('log')).toBeTruthy();
      expect(screen.queryByRole('textbox') !== null).toBe(entry.id !== 'read-only');
      unmount();
    }
  });
});
