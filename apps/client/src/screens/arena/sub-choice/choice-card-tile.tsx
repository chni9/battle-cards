/**
 * The one card tile every sub-choice picker uses — technical spec v7 §5.4 (the `tile` size, the
 * hidden verso), §6.7, §11 (accessible names, a disabled control says why); Appendix A
 * `table-subchoice-mirror` (the V2 tile names) (L74-18).
 *
 * The `Card` primitive names itself from its face and has no disabled state, while the pickers
 * need the V2 names ("{source}'s {card} → you") and greyed reward cards. So the tile is an
 * `aria-pressed` button named by the caller around a decorative `tile` Card (no `onActivate`, so
 * an `<article>` under `aria-hidden`). A greyed tile is `aria-disabled`, stays focusable and reads
 * its reason after its name; a press on it does nothing. A null instance draws the attack verso,
 * so no instance id reaches the DOM.
 */

import type { CardInstance } from '@card-battle/shared';
import { useId, type ReactElement, type ReactNode } from 'react';

import { Card } from '../../../ui/card/card';
import { usePrefersReducedMotion } from '../../../ui/motion/use-prefers-reduced-motion';
import { CHROME_FOCUS_CLASS, chromePressClass, motionAttribute } from '../../../ui/primitives/chrome-classes';

export interface ChoiceCardTileProps {
  /** The face; null draws the attack verso (§5.4 hidden state). */
  readonly instance: CardInstance | null;
  /** The accessible name: the inner Card is decorative. */
  readonly label: string;
  readonly selected: boolean;
  /** Greyed, `aria-disabled`, still focusable; a press does nothing. */
  readonly disabled?: boolean;
  /** Read after the name (`aria-describedby`): why it is greyed. */
  readonly description?: string;
  /** A visible line under the face. */
  readonly caption?: ReactNode;
  /** L56-04: a pending attack's multiplier on the damage chip. */
  readonly damageMultiplier?: number;
  readonly onSelect: () => void;
}

export function ChoiceCardTile({
  instance,
  label,
  selected,
  disabled = false,
  description,
  caption,
  damageMultiplier,
  onSelect,
}: ChoiceCardTileProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== '';
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      {...(disabled ? { 'aria-disabled': true } : {})}
      {...(hasDescription ? { 'aria-describedby': descriptionId } : {})}
      data-motion={motionAttribute(reduced)}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      className={[
        CHROME_FOCUS_CLASS,
        'flex min-w-11 flex-col items-center gap-1 rounded-v7-chrome-sm p-1',
        disabled ? 'cursor-not-allowed' : chromePressClass(reduced),
      ].join(' ')}
    >
      <span aria-hidden="true">
        {instance === null ? (
          <Card face="hidden" family="attack" size="tile" selected={selected} unplayable={disabled} />
        ) : (
          <Card
            size="tile"
            instance={instance}
            selected={selected}
            unplayable={disabled}
            {...(damageMultiplier !== undefined ? { damageMultiplier } : {})}
          />
        )}
      </span>
      {caption !== undefined ? <span className="max-w-full truncate text-v7-caption text-v7-text-2">{caption}</span> : null}
      {hasDescription ? (
        <span id={descriptionId} hidden>
          {description}
        </span>
      ) : null}
    </button>
  );
}
