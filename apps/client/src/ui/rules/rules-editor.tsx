/**
 * Host rules editor — technical spec v7 §7.4 (the host, and the player on the solo menu, edit
 * the Table rules sheet: live apply, no Save or Cancel), §11 (the excluded state in words, the
 * locked kit says why, Q39), §13 Q3/Q31 (the solo clock reads "Server default" until a release),
 * Q4/Q18 (the slider sends on release), Q8 (every control locks during a solo launch). Appendix A
 * `lobby-rules-host-dialog`, `lobby-rules-dialog-kit-guardrails`, `lobby-rules-dialog-live-apply`,
 * `rules-turn-time-default-override`. L76-09.
 *
 * The Lot 70 order stays: the "Human turn" slider, then All / None / Random, then the 16 kit
 * toggles. Every payload comes from the pure `rules-editor-model.ts`, so only the slider's
 * release carries `turnTimeSeconds`; the slider has no live `onChange`, so nothing is sent while
 * dragging. A kit toggle is a private `KitToggle` button (the read-only sheet's face as a button:
 * portrait, name, "Excluded"), not the `Toggle` primitive, which draws a knob and takes an icon.
 * The last allowed kit is `aria-disabled`, stays focusable and is described by the visible
 * `LAST_ALLOWED_KIT_REASON`; the whole-editor `disabled` is native, as `Slider` and `Toggle` only
 * offer native `disabled`. Every control is `type="button"`, so none submits the solo `<form>`.
 * "Human turn", "All", "None" and "Random" are the existing Lot 70 labels.
 */

import {
  allowedKitIds,
  MAX_TURN_TIME_SECONDS,
  MIN_TURN_TIME_SECONDS,
  type LobbyRules,
} from '@card-battle/shared';
import { useId, type ReactElement } from 'react';
import { Icon } from '../icons/icon';
import { KitPortrait } from '../kit/kit-portrait';
import { usePrefersReducedMotion } from '../motion/use-prefers-reduced-motion';
import { Button } from '../primitives/button';
import {
  BUTTON_VARIANT_CLASS,
  CHROME_DISABLED_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_SHAPE_SM_CLASS,
  chromePressClass,
  motionAttribute,
} from '../primitives/chrome-classes';
import { Slider } from '../primitives/slider';
import { Toggle } from '../primitives/toggle';
import { EXCLUDED_LABEL, LAST_ALLOWED_KIT_REASON } from '../ui-copy';
import {
  allKitsPayload,
  isLastAllowedKit,
  kitTogglePayload,
  noKitsPayload,
  randomOnlyPayload,
  sliderReadout,
  sliderSeconds,
  turnTimePayload,
  type RulesEditorBinding,
} from './rules-editor-model';
import { rulesKitFaces, type RulesKitFace } from './rules-summary';

export interface RulesEditorProps {
  rules: LobbyRules;
  editor: RulesEditorBinding;
}

/** The read-only sheet's kit grid: auto-fill columns of at least 5.5rem (`rules-sheet.tsx`). */
const KIT_GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-2 gap-y-4';

export function RulesEditor({ rules, editor }: RulesEditorProps): ReactElement {
  const reasonId = useId();
  const disabled = editor.disabled === true;
  const serverDefaultTime = editor.serverDefaultTime === true;

  return (
    <div data-rules-editor className="flex flex-col gap-4">
      <div className="flex items-start gap-2">
        <Icon name="clock" size={24} />
        <Slider
          label="Human turn"
          min={MIN_TURN_TIME_SECONDS}
          max={MAX_TURN_TIME_SECONDS}
          step={1}
          value={sliderSeconds(rules)}
          formatValue={(seconds) => sliderReadout(rules, seconds, serverDefaultTime)}
          onCommit={(seconds) => {
            const payload = turnTimePayload(rules, seconds);
            if (payload !== null) editor.onChange(payload);
          }}
          disabled={disabled}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            editor.onChange(allKitsPayload(rules));
          }}
        >
          All
        </Button>
        <Button
          variant="quiet"
          disabled={disabled}
          onClick={() => {
            editor.onChange(noKitsPayload(rules));
          }}
        >
          None
        </Button>
        <Toggle
          label="Random"
          icon="random"
          pressed={rules.randomOnly}
          disabled={disabled}
          onPressedChange={(on) => {
            editor.onChange(randomOnlyPayload(rules, on));
          }}
        />
      </div>
      {allowedKitIds(rules).length === 1 ? (
        <p id={reasonId} className="font-v7-body text-v7-caption font-bold text-v7-text-2">
          {LAST_ALLOWED_KIT_REASON}
        </p>
      ) : null}
      <ul className={KIT_GRID_CLASS}>
        {rulesKitFaces(rules).map((face) => (
          <li key={face.kitId} data-kit-id={face.kitId} data-excluded={face.excluded ? 'true' : 'false'}>
            <KitToggle
              face={face}
              rules={rules}
              editor={editor}
              disabled={disabled}
              reasonId={reasonId}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface KitToggleProps {
  face: RulesKitFace;
  rules: LobbyRules;
  editor: RulesEditorBinding;
  disabled: boolean;
  reasonId: string;
}

/** One kit as an `aria-pressed` button: pressed = allowed, named by the kit, "Excluded" in words. */
function KitToggle({ face, rules, editor, disabled, reasonId }: KitToggleProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const locked = isLastAllowedKit(rules, face.kitId);
  return (
    <button
      type="button"
      aria-pressed={!face.excluded}
      aria-label={face.name}
      disabled={disabled}
      {...(locked ? { 'aria-disabled': true, 'aria-describedby': reasonId } : {})}
      data-motion={motionAttribute(reduced)}
      onClick={() => {
        if (locked) return;
        const payload = kitTogglePayload(rules, face.kitId);
        if (payload !== null) editor.onChange(payload);
      }}
      className={[
        'flex min-h-11 w-full flex-col items-center gap-1.5 p-1.5 text-center',
        CHROME_SHAPE_SM_CLASS,
        CHROME_FOCUS_CLASS,
        CHROME_DISABLED_CLASS,
        BUTTON_VARIANT_CLASS.quiet,
        locked ? '' : chromePressClass(reduced),
      ]
        .filter((part) => part !== '')
        .join(' ')}
    >
      <span aria-hidden="true" className={face.excluded ? 'opacity-40 grayscale' : ''}>
        <KitPortrait kitId={face.kitId} size="thumb" />
      </span>
      <span className="max-w-full font-v7-body text-v7-caption font-bold leading-tight break-words text-v7-text-2">
        {face.name}
      </span>
      {face.excluded ? (
        <span className="font-v7-body text-v7-micro font-extrabold leading-none text-v7-text-2">
          {EXCLUDED_LABEL}
        </span>
      ) : null}
    </button>
  );
}
