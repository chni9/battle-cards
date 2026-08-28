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
    expect(src).toContain('placeHintCard');
    expect(src).toContain('data-hint-anchor');
    expect(src).toContain('compact');
    expect(src).toContain('onHide={onGotIt}');
    expect(src).not.toContain('first-game-hint-toggle');
    expect(src).not.toContain('TutorialCallout');
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
    expect(table).toContain('noteHintCause');
    expect(table).toContain('incomingAttackTargetingYouIds');
    expect(table).toContain('incomingThiefTargetingYouIds');
    expect(table).toContain('view.playKind');
    expect(table).toContain("subChoice?.kind === 'elimination-reward'");
    expect(tutorialCoach).toContain('zone="tutorial-coach"');
    expect(table).toContain('TutorialCoach');
  });

  it('anchors Hand, Specials, Incoming, and the reward Dialog', () => {
    const overlay = readFileSync(join(here, 'hint-overlay.tsx'), 'utf8');
    const band = readFileSync(join(here, '../screens/table/card-band.tsx'), 'utf8');
    const host = readFileSync(
      join(here, '../screens/table/sub-choice/sub-choice-host.tsx'),
      'utf8',
    );
    expect(overlay).toContain('hintAnchorId');
    expect(band).toContain('data-hint-anchor={zone}');
    expect(host).toContain("hintAnchor: 'reward'");
  });
});
