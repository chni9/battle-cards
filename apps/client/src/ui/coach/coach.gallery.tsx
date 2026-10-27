/**
 * `/dev/ui` section for the L72-17 coach panel (technical spec v7 §4.2, §6.12): the tutorial
 * coach with its Got it footer (a tour step), the tutorial coach without a footer and with a
 * `+4 points` gain glyph, and the compact first-game hint with Got it and Skip all. The copy is
 * the real shared tutorial and hint copy, so the glyphs and bold markers are the ones a player
 * sees. DEV only.
 *
 * `max-w-full` keeps each panel inside its gallery card on a phone, where the real host width
 * (`min(22rem, 100vw - 1rem)`) is wider than the card. No PascalCase local component lives here:
 * `react-refresh/only-export-components` would report the `gallery` export beside one.
 */

import { TUTORIAL_LOOK_COACH, tutorialStepAt } from '@card-battle/shared';
import type { GallerySection } from '../../dev/gallery-registry';
import { HINT_COPY, SKIP_ALL_HINTS_LABEL } from '../../help/hint-copy';
import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../../view-model/table-copy';
import { Button } from '../primitives/button';
import { CoachPanel } from './coach-panel';

/** Step 1: bare "lives", "1 life" and "4 points". Step 21: the "+4 points" gain and bare words. */
const taxCoach = tutorialStepAt(1)?.coach ?? TUTORIAL_LOOK_COACH;
const thiefTaxCoach = tutorialStepAt(21)?.coach ?? TUTORIAL_LOOK_COACH;
const noop = (): void => undefined;

const TUTORIAL_WIDTH_CLASS = 'w-[min(22rem,calc(100vw-1rem))] max-w-full';
const HINT_WIDTH_CLASS = 'w-[min(15.5rem,calc(100vw-1rem))] max-w-full';

export const gallery: GallerySection = {
  id: 'coach',
  title: 'Coach',
  entries: [
    {
      id: 'tutorial-ack',
      title: 'Tutorial coach with Got it',
      render: () => (
        <div className={TUTORIAL_WIDTH_CLASS}>
          <CoachPanel
            title={taxCoach.title}
            body={taxCoach.body}
            zone="tutorial-coach"
            extraAttrs={{ 'data-tutorial-index': '1', 'data-tutorial-coach-open': 'true' }}
            onHide={noop}
            hideAriaLabel={HIDE_COACH_ARIA_LABEL}
            footer={
              <Button variant="primary" fullWidth>
                {GOT_IT_ACTION_LABEL}
              </Button>
            }
          />
        </div>
      ),
    },
    {
      id: 'tutorial-plain',
      title: 'Tutorial coach without footer',
      render: () => (
        <div className={TUTORIAL_WIDTH_CLASS}>
          <CoachPanel
            title={thiefTaxCoach.title}
            body={thiefTaxCoach.body}
            zone="tutorial-coach"
            extraAttrs={{ 'data-tutorial-index': '21', 'data-tutorial-coach-open': 'true' }}
            onHide={noop}
            hideAriaLabel={HIDE_COACH_ARIA_LABEL}
          />
        </div>
      ),
    },
    {
      id: 'hint-compact',
      title: 'First-game hint (compact)',
      render: () => (
        <div className={HINT_WIDTH_CLASS}>
          <CoachPanel
            compact
            title={HINT_COPY.draw.title}
            body={HINT_COPY.draw.body}
            zone="first-game-hint"
            extraAttrs={{ 'data-hint-id': 'draw' }}
            onHide={noop}
            hideAriaLabel={HIDE_COACH_ARIA_LABEL}
            footer={
              <>
                <Button variant="primary" className="flex-1">
                  {GOT_IT_ACTION_LABEL}
                </Button>
                <Button variant="quiet" className="flex-1">
                  {SKIP_ALL_HINTS_LABEL}
                </Button>
              </>
            }
          />
        </div>
      ),
    },
  ],
};
