/**
 * Kit portrait accessible name — technical spec v7 §11 (portrait `alt` = kit name), §5.5 (kit
 * values and names come from `KIT_CATALOG`, never from the art), L72-15.
 *
 * Kept outside `kit-portrait.tsx` so that file exports components only (react-refresh).
 */

import { getKit, type LobbyKitSelection } from '@card-battle/shared';
import { HIDDEN_KIT_LABEL } from '../../view-model/table-copy';

/** The Random pick's name: existing V6 copy, the lobby's default label (rules spec §4). */
export const RANDOM_KIT_LABEL = 'Random kit';

/**
 * The name a portrait gives assistive tech: the catalog name for a kit (so Scientific and
 * Wizard are not named after their art files), "Random kit" for the Random pick, and "Hidden
 * kit" while the POV may not see the kit (hidden information, golden rule 4).
 */
export function kitPortraitAlt(kitId: LobbyKitSelection | null): string {
  if (kitId === null) return HIDDEN_KIT_LABEL;
  if (kitId === 'random') return RANDOM_KIT_LABEL;
  return getKit(kitId).name;
}
