/**
 * Card-lives under active persistents — L56-06.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('ActivePersistentThumb (L56-06)', () => {
  it('shows remaining card lives under thumbs with a counter', () => {
    const source = readFileSync(join(dir, 'active-persistent-thumb.tsx'), 'utf8');
    expect(source).toContain('detail="thumb"');
    expect(source).toContain('activated');
    expect(source).toContain("kind=\"card-lives\"");
    expect(source).toContain('counter !== null');
    expect(source).toContain('amount={counter}');
    expect(source).not.toContain("from '../../design/components/resource-icon'");
  });

  it('wires own and opponent actives, including Poison counter', () => {
    const own = readFileSync(join(dir, 'private-zone.tsx'), 'utf8');
    const opponent = readFileSync(join(dir, 'opponent-zone.tsx'), 'utf8');
    expect(own).toContain('ActivePersistentThumb');
    expect(own).toContain('effect.counter');
    expect(own).toContain('data-zone="own-actives"');
    expect(opponent).toContain('ActivePersistentThumb');
    expect(opponent).toContain('effect.counter');
    expect(opponent).toContain('data-zone="opponent-actives"');
  });

  it('omits the badge when counter is null (Curse / Invisibility / Shield)', () => {
    const own = readFileSync(join(dir, 'private-zone.tsx'), 'utf8');
    expect(own).toContain('counter: null');
    const inspect = readFileSync(join(dir, 'card-actions.tsx'), 'utf8');
    expect(inspect).toContain('Card lives');
    expect(inspect).toContain("kind=\"card-lives\"");
    expect(inspect).not.toContain('Counter:');
  });
});
