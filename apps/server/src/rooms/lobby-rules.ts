/**
 * Lobby launch rules — technical spec §5.2 startGame, §7 lobby;
 * bot lobby intents — technical spec v3 §4.1, §6 (L15-03).
 * Pure so the reject cases are unit-tested without a Colyseus room.
 *
 * Rejection reasons stay as local unions; ERROR_MESSAGE payloads use shared
 * ActionRejectCode via the *RejectionMessage helpers (L32-01 / PROTOCOL 27).
 */

import {
  actionReject,
  isKitId,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type ActionReject,
  type ActionRejectCode,
  type ChooseKitPayload,
  type KitId,
  type LobbyKitSelection,
  type SetReadyPayload,
} from '@card-battle/shared';

export { MAX_PLAYERS };
export const MIN_PLAYERS_TO_START = MIN_PLAYERS;

export type StartGameRejection =
  | 'not-host'
  | 'already-started'
  | 'not-enough-players'
  | 'not-all-ready';

/** Human guest occupancy for the Ready gate (L57-08). Host and bots omitted. */
export interface HumanGuestReadyState {
  isReady: boolean;
  isConnected: boolean;
}

export type SetReadyRejection = 'not-in-lobby' | 'not-allowed';

export type AddBotRejection = 'not-host' | 'already-started' | 'room-full';

export type RemoveBotRejection =
  | 'not-host'
  | 'already-started'
  | 'unknown-bot'
  | 'target-is-human';

export type SetBotDifficultyRejection =
  | 'not-host'
  | 'already-started'
  | 'unknown-bot'
  | 'target-is-human';

export type ChooseKitRejection = 'already-started';

export function guestBlocksStart(guest: HumanGuestReadyState): boolean {
  return !guest.isConnected || !guest.isReady;
}

export function canStartGame(input: {
  requesterSessionId: string;
  hostSessionId: string;
  seatCount: number;
  hasStarted: boolean;
  humanGuests: readonly HumanGuestReadyState[];
}): StartGameRejection | null {
  if (input.hasStarted) {
    return 'already-started';
  }

  if (input.requesterSessionId !== input.hostSessionId) {
    return 'not-host';
  }

  if (input.seatCount < MIN_PLAYERS_TO_START) {
    return 'not-enough-players';
  }

  if (input.humanGuests.some(guestBlocksStart)) {
    return 'not-all-ready';
  }

  return null;
}

export function startGameRejectionMessage(reason: StartGameRejection): ActionReject {
  switch (reason) {
    case 'not-host':
      return actionReject('start-not-host');
    case 'already-started':
      return actionReject('start-already-started');
    case 'not-enough-players':
      return actionReject('start-not-enough-players');
    case 'not-all-ready':
      return actionReject('start-not-all-ready');
  }
}

export function canSetReady(input: {
  hasStarted: boolean;
  requesterIsHost: boolean;
  requesterIsHumanGuest: boolean;
}): SetReadyRejection | null {
  if (input.hasStarted) {
    return 'not-in-lobby';
  }

  if (input.requesterIsHost || !input.requesterIsHumanGuest) {
    return 'not-allowed';
  }

  return null;
}

export function setReadyRejectionMessage(reason: SetReadyRejection): ActionReject {
  switch (reason) {
    case 'not-in-lobby':
      return actionReject('ready-not-in-lobby');
    case 'not-allowed':
      return actionReject('ready-not-allowed');
  }
}

export function parseSetReadyPayload(
  payload: unknown,
): { ok: true; value: SetReadyPayload } | { ok: false; code: ActionRejectCode } {
  if (typeof payload !== 'object' || payload === null || !('ready' in payload)) {
    return { ok: false, code: 'invalid-set-ready-payload' };
  }

  const { ready } = payload;

  if (typeof ready !== 'boolean') {
    return { ok: false, code: 'invalid-set-ready-payload' };
  }

  return { ok: true, value: { ready } };
}

export function canAddBot(input: {
  requesterSessionId: string;
  hostSessionId: string;
  seatCount: number;
  hasStarted: boolean;
}): AddBotRejection | null {
  if (input.hasStarted) {
    return 'already-started';
  }

  if (input.requesterSessionId !== input.hostSessionId) {
    return 'not-host';
  }

  if (input.seatCount >= MAX_PLAYERS) {
    return 'room-full';
  }

  return null;
}

export function addBotRejectionMessage(reason: AddBotRejection): ActionReject {
  switch (reason) {
    case 'not-host':
      return actionReject('add-bot-not-host');
    case 'already-started':
      return actionReject('add-bot-already-started');
    case 'room-full':
      return actionReject('add-bot-room-full');
  }
}

export function canRemoveBot(input: {
  requesterSessionId: string;
  hostSessionId: string;
  hasStarted: boolean;
  targetExists: boolean;
  targetIsBot: boolean;
}): RemoveBotRejection | null {
  if (input.hasStarted) {
    return 'already-started';
  }

  if (input.requesterSessionId !== input.hostSessionId) {
    return 'not-host';
  }

  if (!input.targetExists) {
    return 'unknown-bot';
  }

  if (!input.targetIsBot) {
    return 'target-is-human';
  }

  return null;
}

export function removeBotRejectionMessage(reason: RemoveBotRejection): ActionReject {
  switch (reason) {
    case 'not-host':
      return actionReject('remove-bot-not-host');
    case 'already-started':
      return actionReject('remove-bot-already-started');
    case 'unknown-bot':
      return actionReject('remove-bot-unknown');
    case 'target-is-human':
      return actionReject('remove-bot-target-is-human');
  }
}

export function canSetBotDifficulty(input: {
  requesterSessionId: string;
  hostSessionId: string;
  hasStarted: boolean;
  targetExists: boolean;
  targetIsBot: boolean;
}): SetBotDifficultyRejection | null {
  if (input.hasStarted) {
    return 'already-started';
  }

  if (input.requesterSessionId !== input.hostSessionId) {
    return 'not-host';
  }

  if (!input.targetExists) {
    return 'unknown-bot';
  }

  if (!input.targetIsBot) {
    return 'target-is-human';
  }

  return null;
}

export function setBotDifficultyRejectionMessage(
  reason: SetBotDifficultyRejection,
): ActionReject {
  switch (reason) {
    case 'not-host':
      return actionReject('set-bot-difficulty-not-host');
    case 'already-started':
      return actionReject('set-bot-difficulty-already-started');
    case 'unknown-bot':
      return actionReject('set-bot-difficulty-unknown');
    case 'target-is-human':
      return actionReject('set-bot-difficulty-target-is-human');
  }
}

export function canChooseKit(input: { hasStarted: boolean }): ChooseKitRejection | null {
  if (input.hasStarted) {
    return 'already-started';
  }

  return null;
}

export function chooseKitRejectionMessage(reason: ChooseKitRejection): ActionReject {
  const codes = {
    'already-started': 'choose-kit-already-started',
  } as const satisfies Record<ChooseKitRejection, ActionRejectCode>;
  return actionReject(codes[reason]);
}

/**
 * Parse `chooseKit` — PROTOCOL_VERSION 30 / L49-01.
 * Distinguishes a malformed payload from an unknown kit id.
 */
export function parseChooseKitPayload(
  payload: unknown,
): { ok: true; value: ChooseKitPayload } | { ok: false; code: ActionRejectCode } {
  if (typeof payload !== 'object' || payload === null || !('kitId' in payload)) {
    return { ok: false, code: 'invalid-choose-kit-payload' };
  }

  const { kitId } = payload;

  if (typeof kitId !== 'string') {
    return { ok: false, code: 'invalid-choose-kit-payload' };
  }

  if (kitId === 'random') {
    return { ok: true, value: { kitId: 'random' } };
  }

  if (!isKitId(kitId)) {
    return { ok: false, code: 'kit-unavailable' };
  }

  return { ok: true, value: { kitId } };
}

/**
 * Seats that picked a catalog kit. Empty / all-random → `undefined` so
 * `createInitialState` keeps the seeded random-with-replacement path.
 */
export function collectForcedKitsBySeatId(
  selections: ReadonlyMap<string, LobbyKitSelection>,
): ReadonlyMap<string, KitId> | undefined {
  const forced = new Map<string, KitId>();

  for (const [seatId, selection] of selections) {
    if (selection !== 'random') {
      forced.set(seatId, selection);
    }
  }

  return forced.size === 0 ? undefined : forced;
}
