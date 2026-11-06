/**
 * How to play primer: technical spec v7 §7.1 (a swipeable card carousel, the copy verbatim, resource
 * icons inline, and static card renders on four slides; gated vs manual dismissal belongs to the
 * caller), §5.6, §8.3, §6.7; v6 §5.1 / L51-02; Appendix A `home-how-to-play-dialog`. Screenshot `<img>`
 * only when the designer file exists. A V7 `Dialog`, so Esc closes only the top sheet (§6.7). Skip,
 * Got it, Esc, the backdrop and a swipe-down each call `onClose` once per open (`useOncePerOpen`), so a
 * gated close enters its path once and never reads as a second, manual close. Paging never closes it.
 * The dialog never touches storage and sends no intent. L76-06.
 */

import type { CardId } from '@card-battle/shared';
import { useRef, type ReactElement } from 'react';

import { Card } from '../ui/card/card';
import type { IconName } from '../ui/icons/icon-names';
import { Icon } from '../ui/icons/icon';
import { KitPortrait } from '../ui/kit/kit-portrait';
import { Button } from '../ui/primitives/button';
import { Carousel, type CarouselSlide } from '../ui/primitives/carousel';
import { CHROME_OUTLINE_CLASS } from '../ui/primitives/chrome-classes';
import { Dialog } from '../ui/primitives/dialog';
import {
  HOW_TO_PLAY_SECTIONS,
  type HowToPlaySection,
  type HowToPlaySectionId,
} from './how-to-play-content';
import { howToPlayScreenshotUrl } from './how-to-play-screenshots';
import { useOncePerOpen } from './use-once-per-open';

export type HowToPlayCloseReason = 'skip' | 'got-it' | 'dismiss';

export interface HowToPlayDialogProps {
  open: boolean;
  onClose: (reason: HowToPlayCloseReason) => void;
}

const PRIMER_LINE = 'This is a short primer — not the full rules.';
const PREVIOUS_LABEL = 'Previous';
const NEXT_LABEL = 'Next';

/** The V6 per-section glyph rows on the V7 icons (not `EffectTextWithIcons`: it would rewrite "0 lives" into glyph amounts). */
const SECTION_ICONS: Partial<
  Record<HowToPlaySectionId, readonly { readonly icon: IconName; readonly caption: string }[]>
> = {
  lives: [
    { icon: 'life', caption: 'Lives' },
    { icon: 'shield', caption: 'Shield' },
  ],
  points: [{ icon: 'point', caption: 'Points' }],
  upgrade: [{ icon: 'upgrade', caption: 'Upgrade points' }],
};

/** One static render: a base-art card (optionally upgraded) or the Random kit portrait. */
type SectionRender =
  | { readonly kind: 'card'; readonly cardId: CardId; readonly isUpgraded: boolean }
  | { readonly kind: 'kit' };

const cardRender = (cardId: CardId, isUpgraded = false): SectionRender => ({ kind: 'card', cardId, isUpgraded });

/**
 * The card renders under four bodies (designer 2026-11-03: icons and card renders). At most two per
 * slide, so a slide never scrolls sideways at 360 px. The Kits slide shows the Random choice, so no
 * real kit is suggested.
 */
const SECTION_RENDERS: Partial<Record<HowToPlaySectionId, readonly SectionRender[]>> = {
  cards: [cardRender('basic-attack'), cardRender('shield')],
  upgrade: [cardRender('basic-attack'), cardRender('basic-attack', true)],
  kits: [{ kind: 'kit' }],
  specials: [cardRender('block')],
};

/** Synthetic: no hand owns these cards, and the arena's own instance ids never start with it. */
function renderInstanceId(render: Extract<SectionRender, { kind: 'card' }>): string {
  return `how-to-play:${render.cardId}${render.isUpgraded ? ':upgraded' : ''}`;
}

function SectionRenders({ renders }: { readonly renders: readonly SectionRender[] }): ReactElement {
  return (
    <div data-how-to-play-renders aria-hidden="true" className="mt-3 flex flex-wrap items-center justify-center gap-4">
      {renders.map((render) =>
        render.kind === 'kit' ? (
          <KitPortrait key="kit-random" kitId="random" size="tile" />
        ) : (
          <Card
            key={renderInstanceId(render)}
            size="hand"
            className="[--card-w:96px]"
            instance={{ instanceId: renderInstanceId(render), cardId: render.cardId, isUpgraded: render.isUpgraded }}
          />
        ),
      )}
    </div>
  );
}

function HowToPlayCard({ section }: { readonly section: HowToPlaySection }): ReactElement {
  const icons = SECTION_ICONS[section.id];
  const renders = SECTION_RENDERS[section.id];
  const shot = section.screenshotFile === null ? null : howToPlayScreenshotUrl(section.screenshotFile);
  return (
    <div className={`h-full bg-v7-panel-2 p-4 ${CHROME_OUTLINE_CLASS} rounded-v7-chrome`}>
      <h3 className="font-v7-display text-v7-title leading-tight text-v7-text">{section.title}</h3>
      {icons !== undefined ? (
        <ul data-how-to-play-icons className="mt-2 flex list-none flex-wrap gap-3 p-0">
          {icons.map(({ icon, caption }) => (
            <li
              key={icon}
              className="inline-flex items-center gap-1.5 font-v7-body text-v7-body font-bold text-v7-text"
            >
              <Icon name={icon} size={20} />
              <span>{caption}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 font-v7-body text-v7-body leading-relaxed text-v7-text">{section.body}</p>
      {renders !== undefined ? <SectionRenders renders={renders} /> : null}
      {shot !== null ? (
        <img
          src={shot}
          alt=""
          draggable={false}
          className={`mt-3 w-full rounded-v7-chrome-sm object-cover ${CHROME_OUTLINE_CLASS}`}
        />
      ) : null}
    </div>
  );
}

export function HowToPlayDialog({ open, onClose }: HowToPlayDialogProps): ReactElement {
  const once = useOncePerOpen(open);
  // Initial focus: Next. The first control in the DOM is the Previous chevron, which is aria-disabled
  // on slide 1 (P2 critique c). A callback ref on the carousel's box finds Next as the box mounts.
  const nextRef = useRef<HTMLElement | null>(null);
  const close = (reason: HowToPlayCloseReason): void => {
    once(() => {
      onClose(reason);
    });
  };
  // Built during render, so the screenshot lookup runs per render. The order comes from the content.
  const slides = HOW_TO_PLAY_SECTIONS.map(
    (section): CarouselSlide => ({
      id: section.id,
      label: section.title,
      dataAttributes: { 'data-how-to-play-section': section.id },
      content: <HowToPlayCard section={section} />,
    }),
  );

  return (
    <Dialog
      open={open}
      title="How to play"
      width="xl"
      onClose={() => {
        close('dismiss');
      }}
      initialFocusRef={nextRef}
      actions={
        <>
          <Button
            variant="quiet"
            onClick={() => {
              close('skip');
            }}
          >
            Skip
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              close('got-it');
            }}
          >
            Got it
          </Button>
        </>
      }
    >
      <p className="font-v7-body text-v7-body text-v7-text-2">{PRIMER_LINE}</p>
      <div
        ref={(box) => {
          nextRef.current = box?.querySelector<HTMLElement>(`button[aria-label="${NEXT_LABEL}"]`) ?? null;
        }}
        className="mt-3"
      >
        <Carousel label="How to play" slides={slides} previousLabel={PREVIOUS_LABEL} nextLabel={NEXT_LABEL} />
      </div>
    </Dialog>
  );
}
