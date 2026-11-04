/**
 * Lobby kit picker roster — PROTOCOL_VERSION 30 / L49-01.
 * Random first, then every catalog kit. Description copy lives with the Dialog.
 */

import { KIT_IDS, getKit, type LobbyKitSelection } from '@card-battle/shared';

export const LOBBY_KIT_PICKER_SELECTIONS = [
  'random',
  ...KIT_IDS,
] as const satisfies readonly LobbyKitSelection[];

export function lobbyKitSelectionLabel(selection: LobbyKitSelection): string {
  return selection === 'random' ? 'Random kit' : getKit(selection).name;
}
