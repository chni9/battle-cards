/**
 * V7 icon set — technical spec v7 §5.6: hand-made SVG in the arcade style, a 2 px ink outline
 * (2 units on the 24 grid, so it scales with `size`) around palette-filled bodies (§5.1).
 *
 * Every glyph has a light or colored body, because `--ink` equals `--bg-0` and an ink-only
 * glyph would vanish on the ground. Ink is kept for details drawn over a body (pupils, pips,
 * clock hands, lines). A thin motif on the open ground is an ink casing under a colored core
 * (`outlinedLine`), and crosses are filled outlined polygons, never the U+2715 character.
 * Paints are `V7_COLORS` hex, never `currentColor`, `var()` or `color-mix()` (the mobile
 * Safari rule from `ui/seat-colors.ts`). Each name has its own geometry, so no state is told
 * apart by color alone, and help and coach are distinct glyphs (Q45). The legibility rules
 * (solid dots, open gaps, optical size, no icon on its own color) are in DESIGN.md › Icons.
 *
 * Decorative by default (`aria-hidden`). A non-empty `label` makes the icon an image named by
 * it. Icon-only controls go through `IconButton` (L72-08), which carries the aria-label and
 * title (L59-01).
 */

import type { ReactElement } from 'react';
import { V7_COLORS } from '../palette';
import type { IconName } from './icon-names';

export interface IconProps {
  name: IconName;
  /** Rendered width and height in px; the outline scales with it. */
  size?: number;
  /** Accessible name. Omitted or empty, the icon is decorative. */
  label?: string;
  className?: string;
}

const paint = V7_COLORS;

/**
 * A thin motif on the open ground: an ink casing (by default 4 units wider than the colored
 * core, so the core keeps a 2-unit outline like a filled shape) that still reads on `--bg-0`.
 * A motif that crosses a body takes a narrower casing so it does not cut the body in two.
 */
function outlinedLine(d: string, core: string, width = 2, casing = width + 4): ReactElement {
  return (
    <>
      <path d={d} strokeWidth={casing} />
      <path d={d} stroke={core} strokeWidth={width} />
    </>
  );
}

/** One eye for `spying-on-you` and `unspy`, so the two cannot drift apart. */
function eye(body: string): ReactElement {
  return (
    <>
      <path d="M1.5 12C4.5 7 8 4.6 12 4.6S19.5 7 22.5 12C19.5 17 16 19.4 12 19.4S4.5 17 1.5 12z" fill={body} />
      <circle cx="12" cy="12" r="3" fill={paint.ink} />
    </>
  );
}

const glyphs: Readonly<Record<IconName, ReactElement>> = {
  // Resources: each fills with its own §5.1 token.
  life: (
    <path
      d="M12 20.5s-8.5-5.1-8.5-11a4.75 4.75 0 0 1 8.5-2.9 4.75 4.75 0 0 1 8.5 2.9c0 5.9-8.5 11-8.5 11z"
      fill={paint.life}
    />
  ),
  point: (
    <>
      <circle cx="12" cy="12" r="9" fill={paint.point} />
      <circle cx="12" cy="12" r="5" />
    </>
  ),
  upgrade: <path d="M12 3 21 12h-5.5v9h-7v-9H3z" fill={paint.upgrade} />,
  shield: <path d="M12 2.5 20 5.5V11c0 5-3.5 8.5-8 10.5C7.5 19.5 4 16 4 11V5.5z" fill={paint.shield} />,

  // Statuses.
  'spied-by-you': (
    <>
      {outlinedLine('M15.5 15.5 20 20', paint.mine, 3.5)}
      <circle cx="9.5" cy="9.5" r="7" fill={paint.mine} />
      <path d="M6 8.8a3.8 3.8 0 0 1 2.8-2.8" stroke={paint.text} strokeWidth={1.5} />
    </>
  ),
  'spying-on-you': eye(paint['threat-other']),
  // Sparks end at least 3 units inside the edges, so their casings stay in the viewBox.
  'shield-active': (
    <>
      <path
        d="M9.5 6 16.3 8.55v4.68c0 4.25-2.98 7.23-6.8 8.92-3.82-1.7-6.8-4.67-6.8-8.92V8.55z"
        fill={paint.shield}
      />
      {outlinedLine('M17.8 6.8 19.8 4.8M18.8 10.4H21M14.4 5l.5-2', paint.cta, 2.5, 6)}
    </>
  ),
  block: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" fill={paint['text-2']} />
      <path d="M3 9.3h18M3 14.7h18M12 4v5.3M7.5 9.3v5.4M16.5 9.3v5.4M12 14.7V20" />
    </>
  ),
  persistent: (
    <>
      <path
        d="M2.54 12.83A9.5 9.5 0 0 1 13.65 2.64L13.91 1.17 19.57 6.48 12.26 10.52 12.69 8.06A4 4 0 0 0 8.02 12.35z"
        fill={paint['text-2']}
      />
      <path
        d="M21.46 11.17A9.5 9.5 0 0 1 10.35 21.36L10.09 22.83 4.43 17.52 11.74 13.48 11.31 15.94A4 4 0 0 0 15.98 11.65z"
        fill={paint['text-2']}
      />
    </>
  ),
  invisibility: (
    <>
      <path d="M5 20.5V11a7 7 0 0 1 14 0v9.5l-2.33-2-2.34 2-2.33-2-2.33 2-2.34-2z" fill={paint['text-2']} />
      <ellipse cx="9.5" cy="11.5" rx="0.8" ry="1.3" fill={paint.ink} />
      <ellipse cx="14.5" cy="11.5" rx="0.8" ry="1.3" fill={paint.ink} />
    </>
  ),
  'reanimation-armed': (
    <>
      <path d="M2.5 21.5V10.5a6.5 6.5 0 0 1 13 0v11z" fill={paint['text-2']} />
      <path d="M9 9v6.5M6.5 11.5h5" />
      {/* The arrow overlaps the stone, so grave and rising read as one motif. */}
      <path d="M17 2 22 8.5h-3V17h-4V8.5h-3z" fill={paint.cta} />
    </>
  ),
  'duplication-active': (
    <>
      <rect x="4" y="4.5" width="10" height="14" rx="2" transform="rotate(-12 9 11.5)" fill={paint['text-2']} />
      <rect x="10" y="5.5" width="10" height="14" rx="2" transform="rotate(12 15 12.5)" fill={paint.text} />
    </>
  ),
  // The bold seat cross of §6.2; `close` is the slimmer cross.
  eliminated: (
    <path d="M3.5 7.5 7.5 3.5 12 8l4.5-4.5 4 4L16 12l4.5 4.5-4 4L12 16l-4.5 4.5-4-4L8 12z" fill={paint.danger} />
  ),
  bot: (
    <>
      {outlinedLine('M12 8V5.5', paint['text-2'])}
      <circle cx="12" cy="4" r="1.8" fill={paint['text-2']} />
      <rect x="3.5" y="8" width="17" height="12.5" rx="3.5" fill={paint['text-2']} />
      <circle cx="9" cy="12.8" r="1.3" fill={paint.ink} />
      <circle cx="15" cy="12.8" r="1.3" fill={paint.ink} />
      <path d="M9.5 17h5" />
    </>
  ),
  disconnected: (
    <>
      {/* A plug, its two prongs facing a socket across a gap, turned onto the diagonal. */}
      {outlinedLine('M8.11 12 10.23 9.88M12 15.89 14.12 13.77', paint.text, 2.5)}
      <rect x="1.25" y="5.75" width="8" height="12.5" rx="2.5" transform="rotate(-45 12 12)" fill={paint['text-2']} />
      <rect x="15.25" y="5.75" width="7.5" height="12.5" rx="2.5" transform="rotate(-45 12 12)" fill={paint['text-2']} />
    </>
  ),
  'absorb-window': <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" fill={paint['cta-2']} />,
  'sentence-ticking': (
    <>
      <path d="M6.5 5h11c0 4-4 5.5-4 7s4 3 4 7h-11c0-4 4-5.5 4-7s-4-3-4-7z" fill={paint['threat-attack']} />
      <rect x="4.5" y="2" width="15" height="3.5" rx="1.75" fill={paint['text-2']} />
      <rect x="4.5" y="18.5" width="15" height="3.5" rx="1.75" fill={paint['text-2']} />
    </>
  ),

  // UI controls.
  menu: (
    <>
      <rect x="3" y="1.5" width="18" height="5" rx="2.5" fill={paint.text} />
      <rect x="3" y="9.5" width="18" height="5" rx="2.5" fill={paint.text} />
      <rect x="3" y="17.5" width="18" height="5" rx="2.5" fill={paint.text} />
    </>
  ),
  shop: (
    <>
      {outlinedLine('M8.5 9V7a3.5 3.5 0 0 1 7 0v2', paint.cta)}
      <path d="M4 9h16l-1.2 11a1.5 1.5 0 0 1-1.5 1.3H6.7a1.5 1.5 0 0 1-1.5-1.3z" fill={paint.cta} />
    </>
  ),
  draw: (
    <>
      {/* Two staggered card-edge slabs, and the top card lifted off them. */}
      <rect x="2" y="18.5" width="16" height="4.5" rx="1.75" fill={paint['text-2']} />
      <rect x="6" y="13.5" width="16" height="4.5" rx="1.75" fill={paint['text-2']} />
      <rect x="8" y="1.5" width="8.5" height="10.5" rx="2" transform="rotate(-10 12.25 6.75)" fill={paint.text} />
    </>
  ),
  // The `spying-on-you` eye, crossed out (L58-07).
  unspy: (
    <>
      {eye(paint['text-2'])}
      {/* A 1-unit casing, so the slash does not cut the eye in two; the pupil shows on both sides. */}
      {outlinedLine('M3.5 3.5 20.5 20.5', paint.text, 2.5, 4.5)}
    </>
  ),
  log: (
    <>
      <rect x="5" y="4" width="14" height="16" fill={paint['text-2']} />
      <rect x="3.5" y="2.5" width="17" height="4" rx="2" fill={paint['text-2']} />
      <rect x="3.5" y="17.5" width="17" height="4" rx="2" fill={paint['text-2']} />
      <path d="M8.5 10h7M8.5 14h5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9.5" fill={paint['cta-2']} />
      <path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2.9-1.2 1.6v.2" strokeWidth={2.5} />
      {/* Solid dot: a stroke wider than a tiny circle renders as a ring in Blink and WebKit. */}
      <circle cx="12" cy="17.5" r="1.4" fill={paint.ink} stroke="none" />
    </>
  ),
  coach: (
    <>
      <path d="M9.5 4.5h11A1.5 1.5 0 0 1 22 6v2.5a1.5 1.5 0 0 1-1.5 1.5h-3.77A7.5 7.5 0 1 1 9.5 4.5z" fill={paint.cta} />
      <circle cx="9.5" cy="12" r="1.5" fill={paint.ink} />
    </>
  ),
  chat: (
    <>
      <path
        d="M5 3.5h14a2.5 2.5 0 0 1 2.5 2.5v8.5a2.5 2.5 0 0 1-2.5 2.5h-7L7 21v-4H5a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 5 3.5z"
        fill={paint.text}
      />
      <circle cx="8" cy="10.25" r="0.6" fill={paint.ink} />
      <circle cx="12" cy="10.25" r="0.6" fill={paint.ink} />
      <circle cx="16" cy="10.25" r="0.6" fill={paint.ink} />
    </>
  ),
  feedback: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill={paint.cta} />
      <path d="M12 7v6" strokeWidth={2.5} />
      <circle cx="12" cy="16.8" r="1.4" fill={paint.ink} stroke="none" />
    </>
  ),
  flag: (
    <>
      <path d="M5 3.5h14.5L16 8.5l3.5 5H5z" fill={paint.danger} />
      {outlinedLine('M5 3v18', paint['text-2'])}
    </>
  ),
  sound: (
    <>
      <path d="M3 9h3.5L11 4.5v15L6.5 15H3z" fill={paint.text} />
      {outlinedLine('M15 9.5a3.5 3.5 0 0 1 0 5M18 6.5a7.5 7.5 0 0 1 0 11', paint.text)}
    </>
  ),
  vibration: (
    <>
      <rect x="8" y="3" width="8" height="18" rx="2" fill={paint.text} />
      <path d="M10.5 18h3" />
      {outlinedLine('M5 8 3 10l2 2-2 2 2 2M19 8l2 2-2 2 2 2-2 2', paint.text)}
    </>
  ),
  rules: (
    <>
      <path d="M12 6.5C9.5 4.8 6.2 4.3 2.5 4.8v14c3.7-.5 7 0 9.5 1.7z" fill={paint['text-2']} />
      <path d="M12 6.5c2.5-1.7 5.8-2.2 9.5-1.7v14c-3.7-.5-7 0-9.5 1.7z" fill={paint['text-2']} />
      <path d="M5 9.3c1.8-.2 3.5.1 4.8.7M19 9.3c-1.8-.2-3.5.1-4.8.7M5 13.3c1.8-.2 3.5.1 4.8.7M19 13.3c-1.8-.2-3.5.1-4.8.7" />
    </>
  ),
  share: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" fill={paint.text} />
      <path d="M12 2.5 17 8h-3v7.5h-4V8H7z" fill={paint.text} />
    </>
  ),
  copy: (
    <>
      <rect x="3" y="3" width="12" height="12" rx="2" fill={paint['text-2']} />
      <rect x="9" y="9" width="12" height="12" rx="2" fill={paint.text} />
    </>
  ),
  minimize: <rect x="3" y="15.5" width="18" height="5" rx="2.5" fill={paint.text} />,

  // L72 additions.
  clock: (
    <>
      <circle cx="12" cy="12" r="9" fill={paint.text} />
      <path d="M12 7v5l3.5 2.5" />
    </>
  ),
  close: <path d="M5 8 8 5l4 4 4-4 3 3-4 4 4 4-3 3-4-4-4 4-3-3 4-4z" fill={paint.text} />,
  'chevron-left': <path d="M15.5 3 19 6.5 13.5 12l5.5 5.5-3.5 3.5-9-9z" fill={paint.text} />,
  'chevron-right': <path d="M8.5 3 5 6.5l5.5 5.5L5 17.5 8.5 21l9-9z" fill={paint.text} />,
  random: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" fill={paint.text} />
      <circle cx="8" cy="8" r="0.9" fill={paint.ink} />
      <circle cx="16" cy="8" r="0.9" fill={paint.ink} />
      <circle cx="12" cy="12" r="0.9" fill={paint.ink} />
      <circle cx="8" cy="16" r="0.9" fill={paint.ink} />
      <circle cx="16" cy="16" r="0.9" fill={paint.ink} />
    </>
  ),
};

export function Icon({ name, size = 20, label, className }: IconProps): ReactElement {
  const labelled = label !== undefined && label !== '';
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={paint.ink}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      data-icon={name}
      {...(className !== undefined ? { className } : {})}
      {...(labelled ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {labelled ? <title>{label}</title> : null}
      {glyphs[name]}
    </svg>
  );
}
