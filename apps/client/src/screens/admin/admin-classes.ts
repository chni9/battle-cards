/**
 * Shared admin class strings (technical spec v7 §7.8, L80-01). Each admin panel, section title
 * and field label composes these, so the tool-mode look has one source. They sit in a `.ts` file
 * because a `.tsx` file exports components only (react-refresh).
 *
 * Chrome comes from `CHROME_OUTLINE_CLASS`, which reads `--chrome-outline-width` and `--ink`:
 * inside `[data-mode="tool"]` that is a 1 px `V7_TOOL_LINE` edge (`ui/tokens.css`).
 */

import {
  CHROME_FLAT_SM_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_OUTLINE_CLASS,
} from '../../ui/primitives/chrome-classes';

/** Every admin panel: tool-line outline, 8 px radius, `--panel` fill, no shadow. */
export const ADMIN_PANEL_CLASS = `${CHROME_OUTLINE_CLASS} rounded-v7-chrome bg-v7-panel p-4 md:p-5`;

/** Page and module titles: Lilita One (spec v7 §5.2 titles). */
export const ADMIN_SECTION_TITLE_CLASS = 'font-v7-display text-v7-title text-v7-text';

/** Labels above inputs and selects: Nunito at the 12 px caption step (spec v7 §5.2 labels). */
export const ADMIN_FIELD_LABEL_CLASS = 'font-v7-body text-v7-caption font-extrabold text-v7-text-2';

/**
 * Every admin input and select (L80-03): the 16 px `text-v7-input` step so iOS never zooms on
 * focus (spec v7 §5.2, Appendix A `global-text-input-no-ios-zoom`), a 44 px touch height, the
 * `--panel-2` fill and the flat tool-line outline. Wrapped in a label, the label span carries
 * `ADMIN_FIELD_LABEL_CLASS`.
 */
export const ADMIN_FIELD_CLASS = `min-h-11 w-full min-w-0 px-3 font-v7-body text-v7-input font-bold text-v7-text bg-v7-panel-2 ${CHROME_FLAT_SM_CLASS} ${CHROME_FOCUS_CLASS}`;

/** Body, description and table text: Nunito at the 14 px body step; the caller picks the color. */
export const ADMIN_BODY_TEXT_CLASS = 'font-v7-body text-v7-body font-bold';

/** Table headers and metric labels: the field-label step, uppercase. */
export const ADMIN_CAPTION_CLASS = `${ADMIN_FIELD_LABEL_CLASS} uppercase tracking-wide`;
