/**
 * First-game hint overlay wiring — technical spec v6 §5.2 / L46-01.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('hint overlay chrome (L46-01)', () => {
  it('uses CoachPanel with Got it and Skip all', () => {
    const src = readFileSync(join(here, 'hint-overlay.tsx'), 'utf8');
    expect(src).toContain('CoachPanel');
    expect(src).toContain('GOT_IT_ACTION_LABEL');
    expect(src).toContain('SKIP_ALL_HINTS_LABEL');
    expect(src).toContain('zone="first-game-hint"');
    expect(src).toContain('data-hint-id');
    expect(src).not.toContain('role="dialog"');
  });

  it('table mounts hints only for Classic and keeps tutorial coach', () => {
    const table = readFileSync(join(here, '../screens/table.tsx'), 'utf8');
    const tutorialCoach = readFileSync(
      join(here, '../screens/table/tutorial-coach.tsx'),
      'utf8',
    );
    expect(table).toContain('HintOverlay');
    expect(table).toContain('selectHint');
    expect(table).toContain('view.playKind');
    expect(tutorialCoach).toContain('zone="tutorial-coach"');
    expect(table).toContain('TutorialCoach');
  });
});
