/**
 * Coach panel — technical spec v7 §4.2 (rebuilt in `ui/` before `screens/table/` is deleted),
 * §6.12 (the tutorial coach and the first-game hints keep their behavior and are restyled) and
 * §8.3 (reduced motion). Appendix A `table-tutorial-coach`, `table-first-game-hints`,
 * `first-game-hint-host` and `tutorial-overlays`. L72-17.
 *
 * Not a Dialog (technical spec v6 §5.4): a hovering, non-modal `<aside>` named by its title, so
 * the table stays clickable around it. It never sets `role` or `aria-modal`, takes no focus and
 * handles no key, so Esc stays with the sheet stack (DESIGN.md › Overlays). Hosts position it
 * (L75); the panel has no `className`. It has no Skip control either: Skip lives on the table
 * flag (Lot 45), and the first-game hint host puts its own "Skip all" in `footer`.
 *
 * The props are those of the V6 `design/components/coach-panel.tsx`, which this replaces for L75.
 * The caller passes `hideAriaLabel`, and every string comes from the shared tutorial and hint
 * copy (`parseCoachBody` splits it; this file invents no words). The root's `data-zone` and the
 * caller's `extraAttrs` (`data-tutorial-index`, `data-hint-id`, ...) are anchors that tests and
 * hosts read.
 *
 * `compact` is the first-game hint card. Its surface is `--panel` at 72% where the default is
 * 90%. V6 used 46%, which left `--text` at about 2.6:1 over a white card face; 72% keeps it at
 * 5.7:1 (6.1:1 over `#f1edff`), so body text takes `--text` and never `--text-2` (4.1:1 there).
 * The compact close control stays 44 px (§5.3), where V6 used 32 px.
 *
 * Under reduced motion the panel renders at rest and `data-motion="reduced"` says so: V6's
 * `animation: none`, with no transform and no fade (§5.7, §8.3). Nothing is carried by motion.
 */

import { motion } from 'motion/react';
import { useId, type ReactElement, type ReactNode } from 'react';

import { parseCoachBody, type CoachBodyPart } from '../../view-model/tutorial-coach-copy';
import { CostAmount } from '../card/cost-amount';
import { glyphAmountFromResource } from '../card/glyph-amount';
import { Icon } from '../icons/icon';
import { RESOURCE_ICON } from '../icons/icon-names';
import { durationS, EASE_ENTRANCE } from '../motion/motion-tokens';
import { motionPropsFor, type V7MotionSpec } from '../motion/reduced-motion';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { CHROME_SHAPE_CLASS, CHROME_SHAPE_SM_CLASS, motionAttribute } from '../primitives/chrome-classes';
import { IconButton } from '../primitives/icon-button';
import { ScrollArea } from '../primitives/scroll-area';

export interface CoachPanelProps {
  title: string;
  body: string;
  zone: string;
  onHide: () => void;
  hideAriaLabel: string;
  footer?: ReactNode;
  extraAttrs?: Record<string, string>;
  /** First-game hints: smaller and more transparent. The tutorial keeps the default. */
  compact?: boolean;
}

/** V6 `@keyframes tutorial-coach-in`, on the V7 base duration and entrance ease (§5.7). */
const COACH_ENTER: V7MotionSpec = {
  initial: { opacity: 0, y: -8, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'tween', duration: durationS('base'), ease: EASE_ENTRANCE },
};

/** The rim, shape and text color of the root. The surface and the max height depend on `compact`. */
const ROOT_CLASS: Readonly<Record<'default' | 'compact', string>> = {
  default: `${CHROME_SHAPE_CLASS} bg-v7-panel/[0.9] backdrop-blur-[6px] max-h-[min(52vh,28rem)]`,
  compact: `${CHROME_SHAPE_SM_CLASS} bg-v7-panel/[0.72] backdrop-blur-[10px] max-h-[min(32vh,12rem)]`,
};
const HEADER_CLASS: Readonly<Record<'default' | 'compact', string>> = {
  default: 'gap-2 px-3 py-2',
  compact: 'gap-1 px-2 py-1',
};
const TITLE_CLASS: Readonly<Record<'default' | 'compact', string>> = {
  default: 'text-v7-title',
  compact: 'text-v7-body',
};
/** The scroll region's focus ring is drawn inside its edge: the rounded root clips an outer one. */
const BODY_CLASS: Readonly<Record<'default' | 'compact', string>> = {
  default: 'flex-1 px-3 py-2 text-v7-body leading-relaxed focus-visible:-outline-offset-2!',
  compact: 'flex-1 px-2 py-1.5 text-v7-caption leading-snug focus-visible:-outline-offset-2!',
};
const FOOTER_CLASS: Readonly<Record<'default' | 'compact', string>> = {
  default: 'flex-col gap-2 px-3 py-2',
  compact: 'flex-row gap-1.5 px-2 py-1.5',
};

export function CoachPanel({
  title,
  body,
  zone,
  onHide,
  hideAriaLabel,
  footer,
  extraAttrs,
  compact = false,
}: CoachPanelProps): ReactElement {
  const titleId = useId();
  const reduced = usePrefersReducedMotion();
  const enter = motionPropsFor(COACH_ENTER, reduced);
  const variant = compact ? 'compact' : 'default';

  return (
    <motion.aside
      data-zone={zone}
      {...(extraAttrs ?? {})}
      // After the spread, so `extraAttrs` cannot override it.
      data-motion={motionAttribute(reduced)}
      aria-labelledby={titleId}
      initial={reduced ? false : (enter.initial ?? false)}
      animate={enter.animate}
      {...(enter.transition !== undefined ? { transition: enter.transition } : {})}
      className={`flex flex-col overflow-hidden text-v7-text ${ROOT_CLASS[variant]}`}
    >
      <div className={`flex shrink-0 items-center border-b-2 border-v7-ink bg-v7-panel-2 ${HEADER_CLASS[variant]}`}>
        <h2 id={titleId} className={`min-w-0 flex-1 font-v7-display leading-tight ${TITLE_CLASS[variant]}`}>
          {title}
        </h2>
        <IconButton icon="close" aria-label={hideAriaLabel} variant="quiet" onClick={onHide} />
      </div>
      {/* A label because the body can overflow its cap: it becomes a keyboard-scrollable region. */}
      <ScrollArea axis="y" label={title} className={`font-v7-body font-bold ${BODY_CLASS[variant]}`}>
        <CoachBody text={body} />
      </ScrollArea>
      {footer !== undefined ? (
        <div className={`flex shrink-0 border-t-2 border-v7-ink ${FOOTER_CLASS[variant]}`}>{footer}</div>
      ) : null}
    </motion.aside>
  );
}

export interface CoachBodyProps {
  text: string;
}

/**
 * Coach copy as a paragraph: `**bold**` markers become `<strong>` and resource words become
 * glyphs (`parseCoachBody`). Type size and font come from the parent. Each glyph is wrapped in
 * `span[data-coach-resource]`, not `data-resource-kind`, so the FX and play-flyout selectors
 * that read that attribute never match prose.
 */
export function CoachBody({ text }: CoachBodyProps): ReactElement {
  return (
    <p>
      {parseCoachBody(text).map((part, index) => (
        <CoachPart key={`p-${String(index)}`} part={part} />
      ))}
    </p>
  );
}

function CoachPart({ part }: { part: CoachBodyPart }): ReactElement {
  if (part.kind === 'text') {
    return part.bold ? <strong>{part.text}</strong> : <>{part.text}</>;
  }

  // "+4 points" is a gain and speaks "plus"; the sign shows only when copy wrote one. A numbered
  // amount is a CostAmount (a shield too: "3 shield points"); a bare word keeps its words and
  // gains a decorative icon, so the sentence still reads without it.
  const glyph = (
    <span data-coach-resource={part.resource} className="whitespace-nowrap">
      {part.amount !== null ? (
        <CostAmount
          amount={glyphAmountFromResource(part.resource, part.amount)}
          size="md"
          {...(part.sign === '+' ? { signed: 'gain' as const } : {})}
        />
      ) : (
        <>
          {part.word}
          <Icon name={RESOURCE_ICON[part.resource]} size={16} className="ml-1 inline-block align-text-bottom" />
        </>
      )}
    </span>
  );
  return part.bold ? <strong>{glyph}</strong> : glyph;
}
