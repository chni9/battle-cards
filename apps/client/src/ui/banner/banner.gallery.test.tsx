// @vitest-environment happy-dom
/** /dev/ui banner section — L72-18 (technical spec v7 §4.2 DEV gallery). */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { gallery } from './banner.gallery';

describe('banner gallery (L72-18)', () => {
  it('lists every banner kind', () => {
    expect(gallery.id).toBe('banner');
    expect(gallery.entries.map((entry) => entry.id)).toEqual(['turn', 'attacked', 'dead', 'won', 'sentence', 'wipe']);
  });

  it('plays a Sentence line on demand', async () => {
    const entry = gallery.entries.find((candidate) => candidate.id === 'sentence');
    expect(entry).toBeDefined();
    const { user } = renderUi(<div>{entry?.render()}</div>);
    expect(screen.queryByText('Sentence in 3 turns!')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.queryByText('Sentence in 3 turns!')).not.toBeNull();
  });
});
