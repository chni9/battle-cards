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
 * apart by color alone, and help and coach are distinct glyphs (Q45).
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
 * A thin motif on the open ground: an ink casing 4 units wider than the colored core, so the
 * core keeps a 2-unit outline like a filled shape and still reads on `--bg-0`.
 */
function outlinedLine(d: string, core: string, width = 2): ReactElement {
  return (
    <>
      <path d={d} strokeWidth={width + 4} />
      <path d={d} stroke={core} strokeWidth={width} />
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
      {outlinedLine('M15.5 15.5 20 20', paint.mine, 3)}
      <circle cx="10" cy="10" r="6.5" fill={paint.mine} />
      <path d="M7 9.2a3.4 3.4 0 0 1 2.2-2.2" stroke={paint.text} strokeWidth={1.5} />
    </>
  ),
  'spying-on-you': (
    <>
      <path
        d="M2 12c2.8-4.2 6.2-6.3 10-6.3s7.2 2.1 10 6.3c-2.8 4.2-6.2 6.3-10 6.3S4.8 16.2 2 12z"
        fill={paint['threat-other']}
      />
      <circle cx="12" cy="12" r="2.2" fill={paint.ink} />
    </>
  ),
  'shield-active': (
    <>
      <path
        d="M10 6 16.5 8.5v4c0 4.2-2.8 7.1-6.5 8.8-3.7-1.7-6.5-4.6-6.5-8.8v-4z"
        fill={paint.shield}
      />
      {outlinedLine('M18.8 6.7 20.6 4.9M19.8 11.2h2M14.4 3.6l.4-1.6', paint.cta)}
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
        d="M3 12A9 9 0 0 1 15.08 3.54L15.76 1.66 18.92 7.6 12.68 10.12 13.37 8.24A4 4 0 0 0 8 12z"
        fill={paint['text-2']}
      />
      <path
        d="M21 12A9 9 0 0 1 8.92 20.46L8.24 22.34 5.08 16.4 11.32 13.88 10.63 15.76A4 4 0 0 0 16 12z"
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
      <path d="M3.5 21V10.5a5.5 5.5 0 0 1 11 0V21z" fill={paint['text-2']} />
      <path d="M6.5 13h5M6.5 16.5h5" />
      <path d="M18.5 2 23 7.5h-2.5v7h-4v-7H14z" fill={paint.cta} />
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
      {outlinedLine('M9.5 10h4M9.5 14h4', paint.text)}
      <rect x="2" y="8" width="7.5" height="8" rx="2" fill={paint['text-2']} />
      <rect x="16" y="6" width="6" height="12" rx="2" fill={paint['text-2']} />
      <path d="M18.5 10h1M18.5 14h1" />
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
      <rect x="3" y="3.5" width="18" height="4.5" rx="2.25" fill={paint.text} />
      <rect x="3" y="9.75" width="18" height="4.5" rx="2.25" fill={paint.text} />
      <rect x="3" y="16" width="18" height="4.5" rx="2.25" fill={paint.text} />
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
      <rect x="2.5" y="9" width="12" height="13" rx="2" fill={paint['text-2']} />
      <rect x="9.5" y="2.5" width="11.5" height="13.5" rx="2" transform="rotate(14 15.25 9.25)" fill={paint.text} />
    </>
  ),
  // The `spying-on-you` eye, crossed out (L58-07).
  unspy: (
    <>
      <path
        d="M2 12c2.8-4.2 6.2-6.3 10-6.3s7.2 2.1 10 6.3c-2.8 4.2-6.2 6.3-10 6.3S4.8 16.2 2 12z"
        fill={paint['text-2']}
      />
      <circle cx="12" cy="12" r="2.2" fill={paint.ink} />
      {outlinedLine('M4.5 4.5 19.5 19.5', paint.text)}
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
      <path d="M9.3 9.4a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.8v.5" strokeWidth={2.5} />
      <circle cx="12" cy="17.4" r="0.4" fill={paint.ink} />
    </>
  ),
  coach: (
    <>
      <path d="M9 6h11a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 20 11h-4.68A6.5 6.5 0 1 1 9 6z" fill={paint.cta} />
      <circle cx="9" cy="12.5" r="1.2" fill={paint.ink} />
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
      <path d="M12 7.5V13" strokeWidth={2.5} />
      <circle cx="12" cy="16.6" r="0.4" fill={paint.ink} />
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
