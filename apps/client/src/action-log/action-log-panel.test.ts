/**
 * Action log Why control — L45-05 / technical spec v6 §5.4.
 * Hidden in every mode (no protocol bump; botReason may still arrive on the wire).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('ActionLogPanel Why (L45-05)', () => {
  it('does not render a Why control', () => {
    const source = readFileSync(join(dir, 'action-log-panel.tsx'), 'utf8');
    expect(source).not.toMatch(/>Why</);
    expect(source).not.toContain('formatBotReason');
    expect(source).not.toContain('Show bot reason');
  });
});

describe('ActionLogPanel Dialog embed (L53-07)', () => {
  it('does not stretch to full height or duplicate the Dialog title', () => {
    const source = readFileSync(join(dir, 'action-log-panel.tsx'), 'utf8');
    expect(source).toContain('embedded');
    expect(source).toContain("embedded ? '' : 'h-full'");
    const table = readFileSync(
      join(dir, '../screens/table.tsx'),
      'utf8',
    );
    expect(table).toContain('embedded');
    expect(table).toContain('onInspectCard');
  });
});

describe('ActionLogPanel inspect from log (L56-05)', () => {
  it('renders card segments as buttons when onInspectCard is set', () => {
    const source = readFileSync(join(dir, 'action-log-panel.tsx'), 'utf8');
    expect(source).toContain("segment.type === 'card'");
    expect(source).toContain('type="button"');
    expect(source).toContain('onInspectCard(segment.cardId, segment.isUpgraded)');
  });
});
