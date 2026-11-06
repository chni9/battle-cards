/**
 * First-game hint overlay wiring on the old table — technical spec v6 §5.2 / L46-01. The `hint-overlay.tsx`
 * assertions moved to `hint-overlay.render.test.tsx` (L75-06; classification rows 90, 91, 93); the `table.tsx`,
 * `card-band.tsx` and `sub-choice-host.tsx` reads stay until L75-10.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('hint overlay chrome (L46-01)', () => {
  it('table mounts hints only for Classic and keeps tutorial coach', () => {
    const table = readFileSync(join(here, '../screens/table.tsx'), 'utf8');
    const tutorialCoach = readFileSync(
      join(here, '../screens/table/tutorial-coach.tsx'),
      'utf8',
    );
    expect(table).toContain('HintOverlay');
    expect(table).toContain('selectHint');
    expect(table).toContain('noteHintCause');
    expect(table).toContain('incomingAttackTargetingYouIds');
    expect(table).toContain('incomingThiefTargetingYouIds');
    expect(table).toContain('view.playKind');
    expect(table).toContain("subChoice?.kind === 'elimination-reward'");
    expect(tutorialCoach).toContain('zone="tutorial-coach"');
    expect(table).toContain('TutorialCoach');
  });

  it('anchors Hand, Specials, Incoming, and the reward Dialog', () => {
    const band = readFileSync(join(here, '../screens/table/card-band.tsx'), 'utf8');
    const host = readFileSync(
      join(here, '../screens/table/sub-choice/sub-choice-host.tsx'),
      'utf8',
    );
    expect(band).toContain('data-hint-anchor={zone}');
    expect(band).toContain('w-max');
    expect(host).toContain("hintAnchor: 'reward'");
  });
});
