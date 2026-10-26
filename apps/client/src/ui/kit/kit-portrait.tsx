/**
 * KitPortrait — technical spec v7 §4.2 (shared pieces), §5.5 (the extracted drawing, `artFor`;
 * kit values never come from the art), §6.6.5 (a kit portrait opens the kit sheet; long-press is
 * the caller's), §7.3 (kit picker) and §11 (portrait `alt` = kit name). Appendix A:
 * `global-art-catalog`, `global-dialog-button-primitives`; L10-05 (eliminated is greyscale plus
 * a badge, no per-kit dead art). L72-15. It replaces `design/components/kit-portrait.tsx` on V7
 * surfaces; the classic file stays until L75 and L76.
 *
 * - **Faces:** a kit shows its base drawing from `artFor` on the card-face gradient, in a fixed
 *   box with `object-contain` so the 16 trimmed drawings share one visual weight. An unrevealed
 *   kit (`null`) is a code face with a "?", and Random a code face with the `random` icon. The
 *   art and the code faces share one frame, so a portrait never changes size when a kit is
 *   revealed.
 * - **Name:** `kitPortraitAlt` (the catalog name, "Hidden kit", "Random kit"). A code face is a
 *   `role="img"` named the same way.
 * - **Clickable:** with `onClick` the root is one `<button>` named `ariaLabel ?? alt` and the
 *   face inside is decorative, so a screen reader hears one control, not an image in a button.
 *   The caller names state (for example "eliminated") in `ariaLabel`: button children are
 *   presentational, so the badge is not read there.
 * - **Eliminated:** the face is greyscale and the badge (the `eliminated` icon, never a
 *   character) is a sibling of the face, so the filter never greys the red cross.
 * - **Anchors:** `data-zone="kit-portrait"` and `data-eliminated` stay (`fx/play-flyout.ts` and
 *   the L74 self strip query them); `data-kit-face` and `data-kit-size` are new.
 */

import type { LobbyKitSelection } from '@card-battle/shared';
import type { ReactElement } from 'react';
import { artFor } from '../asset-lookup';
import { Icon } from '../icons/icon';
import { ICON_WELL_CLASS } from '../primitives/chrome-classes';
import { kitPortraitAlt } from './kit-portrait-label';

export interface KitPortraitProps {
  kitId: LobbyKitSelection | null;
  size?: 'thumb' | 'tile' | 'sheet' | 'hero';
  isEliminated?: boolean;
  className?: string;
  /** When set, the portrait is one button (for example opening the kit sheet). */
  onClick?: () => void;
  /** The button's accessible name; defaults to the kit name. Ignored without `onClick`. */
  ariaLabel?: string;
}

type PortraitSize = NonNullable<KitPortraitProps['size']>;
type Face = 'art' | 'hidden' | 'random';

/** 3:4 widths: thumb 40, tile 72, sheet 96, hero 160 px. Spec v7 sets none: L72-15 picks, for the L72-21 critique. */
const WIDTH_CLASS: Readonly<Record<PortraitSize, string>> = {
  thumb: 'w-10',
  tile: 'w-18',
  sheet: 'w-24',
  hero: 'w-40',
};

const FRAME_CLASS =
  'relative inline-block aspect-3/4 shrink-0 rounded-v7-card shadow-v7-card select-none [-webkit-touch-callout:none]';
/** `--cta` focus outline, offset so it clears the face; 44 px target (spec v7 §5.3). */
const BUTTON_CLASS =
  'min-h-11 min-w-11 cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-v7-cta';

const FACE_CLASS = 'absolute inset-0 flex items-center justify-center overflow-hidden rounded-v7-card';
const ART_FACE_CLASS = `${FACE_CLASS} bg-linear-to-b from-v7-card-face-0 to-v7-card-face-1 p-[6%]`;
const HIDDEN_FACE_CLASS = `${FACE_CLASS} bg-v7-panel-2`;
const RANDOM_FACE_CLASS = `${FACE_CLASS} bg-linear-to-br from-v7-panel-2 to-v7-bg-1`;

const HIDDEN_MARK_CLASS: Readonly<Record<PortraitSize, string>> = {
  thumb: 'text-v7-title',
  tile: 'text-v7-display',
  sheet: 'text-v7-display',
  hero: 'text-[56px]',
};
const RANDOM_ICON_PX: Readonly<Record<PortraitSize, number>> = { thumb: 22, tile: 36, sheet: 48, hero: 80 };
const BADGE_ICON_PX: Readonly<Record<PortraitSize, number>> = { thumb: 14, tile: 18, sheet: 22, hero: 32 };

function faceFor(kitId: LobbyKitSelection | null): Face {
  if (kitId === null) return 'hidden';
  return kitId === 'random' ? 'random' : 'art';
}

interface FaceProps {
  readonly kitId: LobbyKitSelection | null;
  readonly size: PortraitSize;
  readonly alt: string;
  /** Inside a button the face is decorative; alone it is the image. */
  readonly decorative: boolean;
  readonly greyscale: boolean;
}

function KitFace({ kitId, size, alt, decorative, greyscale }: FaceProps): ReactElement {
  const grey = greyscale ? ' grayscale' : '';
  if (kitId !== null && kitId !== 'random') {
    return (
      <span data-kit-layer="face" className={`${ART_FACE_CLASS}${grey}`}>
        <img
          src={artFor(kitId)}
          alt={decorative ? '' : alt}
          draggable={false}
          className="pointer-events-none size-full object-contain"
        />
      </span>
    );
  }
  const a11y = decorative ? ({ 'aria-hidden': true } as const) : ({ role: 'img', 'aria-label': alt } as const);
  if (kitId === 'random') {
    return (
      <span data-kit-layer="face" {...a11y} className={`${RANDOM_FACE_CLASS}${grey}`}>
        <Icon name="random" size={RANDOM_ICON_PX[size]} />
      </span>
    );
  }
  return (
    <span data-kit-layer="face" {...a11y} className={`${HIDDEN_FACE_CLASS}${grey}`}>
      <span aria-hidden="true" className={`font-v7-display leading-none text-v7-text-2 ${HIDDEN_MARK_CLASS[size]}`}>
        ?
      </span>
    </span>
  );
}

export function KitPortrait({
  kitId,
  size = 'tile',
  isEliminated = false,
  className = '',
  onClick,
  ariaLabel,
}: KitPortraitProps): ReactElement {
  const alt = kitPortraitAlt(kitId);
  const face = faceFor(kitId);
  const clickable = onClick !== undefined;
  const content = (
    <>
      <KitFace kitId={kitId} size={size} alt={alt} decorative={clickable} greyscale={isEliminated} />
      {isEliminated ? (
        <span data-kit-layer="badge" className={`absolute right-1 bottom-1 p-0.5 ${ICON_WELL_CLASS}`}>
          <Icon name="eliminated" size={BADGE_ICON_PX[size]} label="Eliminated" />
        </span>
      ) : null}
    </>
  );

  const rootClassName = [FRAME_CLASS, WIDTH_CLASS[size], clickable ? BUTTON_CLASS : '', className]
    .filter((part) => part !== '')
    .join(' ');
  const anchors = {
    'data-zone': 'kit-portrait',
    'data-eliminated': isEliminated ? 'true' : 'false',
    'data-kit-face': face,
    'data-kit-size': size,
  } as const;

  if (clickable) {
    return (
      <button
        {...anchors}
        type="button"
        aria-label={ariaLabel ?? alt}
        onClick={() => {
          onClick();
        }}
        className={rootClassName}
      >
        {content}
      </button>
    );
  }
  return (
    <span {...anchors} className={rootClassName}>
      {content}
    </span>
  );
}
