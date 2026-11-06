/**
 * The solo opponent count as seats around a mini table (technical spec v7 §7.1, "opponents 1–7
 * picked by adding avatars around a mini table"; §11 Q7 real radio semantics; WAI-ARIA APG radio
 * group). L76-11.
 *
 * A `radiogroup` named by its visible "Opponents" caption holds seven radios, the bot seats 1–7
 * on an oval in a 320×216 stage (`solo-table.ts`, so it fits a 360 px phone). Seat n is checked
 * at n opponents; seats 1…n fill in the hue the bot will take (`v7SeatColor(n)`: the player is
 * seat 0 in `view.players`), the rest are dashed empties. Each radio's only text is its number,
 * so no new string. The felt and the player's own avatar at the bottom are decorative.
 *
 * Keyboard follows `Segmented` through `roving-focus.ts`: the checked seat is the one Tab stop,
 * arrow keys move and select, wrapping, and command chords are left to the browser. While
 * `disabled` (a solo launch, Q8) every seat is natively disabled and takes no keys, and the
 * filled seats drop their hue for the "off" look, so `--text-2` never sits on a seat hue.
 */

import { SOLO_OPPONENT_COUNTS, type SoloOpponentCount } from '@card-battle/shared';
import { useId, useRef, type KeyboardEvent, type ReactElement } from 'react';

import { v7SeatColor } from '../../ui/palette';
import { Avatar } from '../../ui/primitives/avatar';
import {
  CHROME_DISABLED_CLASS,
  CHROME_DISC_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_OUTLINE_CLASS,
} from '../../ui/primitives/chrome-classes';
import { hasCommandModifier, nextEnabledIndex, rovingKeyFor } from '../../ui/primitives/roving-focus';
import { SOLO_OPPONENTS_LABEL } from './home-copy';
import { SOLO_TABLE_SEATS, SOLO_TABLE_YOU } from './solo-table';

export interface SoloOpponentPickerProps {
  readonly value: SoloOpponentCount;
  /** The decorative You avatar's initial. */
  readonly nickname: string;
  readonly disabled: boolean;
  readonly onChange: (count: SoloOpponentCount) => void;
}

/** A disabled group renders native-disabled radios, which take no keys, so arrows never skip a seat. */
const NONE_DISABLED: readonly boolean[] = SOLO_OPPONENT_COUNTS.map(() => false);

const SEAT_CLASS = `absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full font-v7-display text-v7-body leading-none ${CHROME_FOCUS_CLASS} ${CHROME_DISABLED_CLASS}`;
const FILLED_CLASS = `${CHROME_DISC_CLASS} text-v7-text-on-cta`;
const EMPTY_CLASS = 'border-2 border-dashed border-v7-text-2 bg-v7-bg-0 text-v7-text-2';
const CHECKED_CLASS = 'ring-[3px] ring-v7-cta ring-offset-2 ring-offset-v7-bg-0';

export function SoloOpponentPicker({ value, nickname, disabled, onChange }: SoloOpponentPickerProps): ReactElement {
  const labelId = useId();
  const groupRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (hasCommandModifier(event)) return;
    const key = rovingKeyFor(event.key, 'radios');
    if (key !== 'next' && key !== 'previous') return;
    event.preventDefault();
    const target = nextEnabledIndex(NONE_DISABLED, index, key === 'next' ? 1 : -1);
    const count = SOLO_OPPONENT_COUNTS[target];
    if (target === index || count === undefined) return;
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[target]?.focus();
    onChange(count);
  }

  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="font-v7-body text-v7-body font-extrabold text-v7-text">
        {SOLO_OPPONENTS_LABEL}
      </p>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={labelId}
        {...(disabled ? { 'aria-disabled': true } : {})}
        data-solo-table
        className="relative mx-auto aspect-[320/216] w-full max-w-[20rem]"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-x-[22%] inset-y-[26%] rounded-[50%] bg-v7-panel-2 ${CHROME_OUTLINE_CLASS}`}
        />
        <span
          aria-hidden="true"
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${String(SOLO_TABLE_YOU.x)}%`, top: `${String(SOLO_TABLE_YOU.y)}%` }}
        >
          <Avatar name={nickname} seatIndex={0} />
        </span>
        {SOLO_OPPONENT_COUNTS.map((count, index) => {
          const checked = count === value;
          const filled = count <= value;
          const { x, y } = SOLO_TABLE_SEATS[count];
          return (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              disabled={disabled}
              data-solo-seat={count}
              data-solo-seat-filled={filled ? 'true' : 'false'}
              style={{
                left: `${String(x)}%`,
                top: `${String(y)}%`,
                ...(filled && !disabled ? { backgroundColor: v7SeatColor(count) } : {}),
              }}
              className={`${SEAT_CLASS} ${filled ? FILLED_CLASS : EMPTY_CLASS} ${checked ? CHECKED_CLASS : ''}`}
              onClick={() => {
                if (!checked) onChange(count);
              }}
              onKeyDown={(event) => {
                onKeyDown(event, index);
              }}
            >
              {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}
