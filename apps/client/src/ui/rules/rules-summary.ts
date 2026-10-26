/**
 * Table rules summary helpers — technical spec v7 §6.11 (rules recall in game and on Game over)
 * and §7.4 (the lobby strip and sheet); Appendix A rows `lobby-rules-summary` and
 * `rules-recall-table-end`. L72-16.
 *
 * Pure: it reads `LobbyRules` and the kit catalog, never a clock or a DOM, so the strip, the
 * sheet and the L76 host editor share one list of faces.
 */

import { getKit, KIT_IDS, type KitId, type LobbyRules } from '@card-battle/shared';
import { EXCLUDED_LABEL } from '../ui-copy';

export interface RulesKitFace {
  readonly kitId: KitId;
  readonly name: string;
  readonly excluded: boolean;
}

/**
 * All 16 Classic kits in `KIT_IDS` order, whatever order the excluded ids arrive in, so the
 * strip and the sheet never reshuffle when the host toggles a kit. The name is the catalog
 * name (§5.5: kit values never come from the art).
 */
export function rulesKitFaces(rules: Pick<LobbyRules, 'excludedKitIds'>): readonly RulesKitFace[] {
  const excluded = new Set<KitId>(rules.excludedKitIds);
  return KIT_IDS.map((kitId) => ({ kitId, name: getKit(kitId).name, excluded: excluded.has(kitId) }));
}

/**
 * The turn time as received, "{n}s". Never clamped or rounded: `LobbyStateView.lobbyRules`
 * carries the server-effective seconds, which follow `TURN_DURATION_MS` until the host sets a
 * time, so they can exceed the host maximum of 180 (Appendix A `lobby-rules-summary`).
 */
export function formatTurnTimeSeconds(seconds: number): string {
  return `${String(seconds)}s`;
}

/**
 * The strip's spoken summary, for the button's `aria-describedby`: the seconds, "Random" when
 * kits are dealt at random, then "Excluded" followed by the excluded kit names (in `KIT_IDS`
 * order, like the faces), joined by commas. It uses only words the strip already shows, so it
 * adds no copy (L72-16 fix round 1). The button's name stays "Table rules".
 */
export function rulesSummaryText(rules: LobbyRules): string {
  const excludedNames = rulesKitFaces(rules)
    .filter((face) => face.excluded)
    .map((face) => face.name);
  return [
    formatTurnTimeSeconds(rules.turnTimeSeconds),
    rules.randomOnly ? 'Random' : null,
    excludedNames.length > 0 ? `${EXCLUDED_LABEL} ${excludedNames.join(', ')}` : null,
  ]
    .filter((part) => part !== null)
    .join(', ');
}
