/**
 * Lobby strings shared by the lobby components and their tests (technical spec v7 §7.2, §10.6;
 * plan Appendix A.6). L76-12 moves the V2 lobby strings here verbatim and adds two accessible
 * names for designer review: 'New bot difficulty' and '{nickname} difficulty'. The Your kit
 * sentence and the Random-only lines stay in `../kit-pick-copy` (shared with Home and the picker).
 */

import { BOT_DIFFICULTIES, MAX_PLAYERS, type BotDifficulty } from '@card-battle/shared';

import type { SegmentedOption } from '../../ui/primitives/segmented';
import { botSeatLabelParts } from '../../ui/seat/bot-seat-label-text';

export const LOBBY_EYEBROW = 'Lobby';
export const LOBBY_TITLE = 'Card Battle';

export const GAME_CODE_LABEL = 'Game code';
export const COPY_LABEL = 'Copy';
export const COPY_OK_TITLE = 'Code copied';
export const COPY_FAILED_TITLE = 'Copy failed';
export const COPY_RESULT_DISMISS_LABEL = 'OK';
/** Both bodies keep the code, so a failed copy still shows it to read out. */
export function copyResultBody(gameCode: string, failed: boolean): string {
  return failed ? `Could not copy automatically. Game code: ${gameCode}` : `Share this code with friends: ${gameCode}`;
}
export const HOST_LINE = 'You are the host';

export const YOUR_KIT_TITLE = 'Your kit';
export const CHOOSE_KIT_LABEL = 'Choose kit';
export const WATCHING_TITLE = 'Watching the lobby';
export const WATCHING_BODY = 'Claim a disconnected seat if one is listed, or leave and join again later.';

export function lobbyPlayersHeading(count: number): string {
  return `Players (${count}/${MAX_PLAYERS})`;
}
export const LOBBY_YOU_SUFFIX = ' (you)';
export const LOBBY_HOST_TAG = 'Host';
export const KICK_LABEL = 'Kick';
export const KICK_TITLE = 'Kick this player?';
export function kickConfirmBody(nickname: string): string {
  return `${nickname} will leave this lobby. They can join again with the code.`;
}
export const KICK_CANCEL_LABEL = 'Cancel';
export const ADD_BOT_LABEL = 'Add bot';
/** NEW (L76-12): the name of the Add bot difficulty radiogroup. */
export const ADD_BOT_DIFFICULTY_LABEL = 'New bot difficulty';
/** NEW (L76-12): the name of a bot seat's difficulty radiogroup (plan A.4). */
export function botDifficultyLabel(nickname: string): string {
  return `${nickname} difficulty`;
}
/** Easy / Normal / Hard through `ui/seat`, because the lobby may not import `bots/` (Lot 76 import rule). */
export const BOT_DIFFICULTY_OPTIONS: readonly SegmentedOption<BotDifficulty>[] = BOT_DIFFICULTIES.map((value) => ({
  value,
  label: botSeatLabelParts(value).tier,
}));

export const START_LABEL = 'Start game';
export const READY_BUTTON_LABEL = 'Ready';
export const CANCEL_READY_LABEL = 'Cancel ready';
export const PRESS_READY_HINT = 'Press Ready when you are set.';
export const WAITING_FOR_HOST_HINT = 'Waiting for the host to start…';
export const LEAVE_LABEL = 'Leave';
export const FEEDBACK_LABEL = 'Feedback';
