/**
 * Typed illegal-action / ERROR_MESSAGE codes — PROTOCOL_VERSION 27 / L32-01.
 * `message` stays a short English fallback; clients may map `code` to richer copy.
 */

export const ACTION_REJECT_CODES = [
  // Turn / gate
  'not-your-turn',
  'not-active-player',
  'already-acted',
  'game-not-in-progress',
  'finish-mirror-choice',
  'finish-steal-choice',
  'finish-pool-pick',
  'finish-special-pick',
  'finish-reanimation-kit-pick',
  'finish-elimination-rewards',

  // Ownership / target / play
  'unknown-player',
  'unknown-card',
  'card-not-held',
  'invalid-target',
  'card-not-playable-yet',
  'play-not-legal',
  'attacks-forbidden-during-block',

  // Multi-attack
  'multi-attack-kit-forbidden',
  'multi-attack-need-two',
  'duplicate-attack-selection',
  'only-attacks-multiplayable',

  // Economy
  'not-enough-points',
  'not-enough-lives',
  'cannot-afford-cost',
  'not-enough-upgrade-points',
  'no-upgrade-point-to-sell',
  'already-upgraded',
  'card-not-buyable-individually',
  'card-not-sellable-individually',
  'cost-not-shop-transfer',

  // Kits / persistents
  'duplicator-kit-required',
  'persistent-not-active',
  'persistent-not-manual',

  // Mirror
  'no-mirror-choice-pending',
  'invalid-mirror-target',
  'pending-attack-unavailable',
  'nothing-left-to-redirect',
  'no-opponent-to-redirect',
  'mirror-choice-missing',

  // Steal
  'no-steal-choice-pending',
  'steal-card-unavailable',
  'steal-choice-missing',

  // Pool / special / reanimation sub-choices
  'no-pool-pick-pending',
  'pool-pick-wrong-count',
  'duplicate-pool-picks',
  'pool-card-unavailable',
  'pool-card-gone',
  'no-special-pick-pending',
  'special-unavailable',
  'no-reanimation-kit-pick-pending',
  'kit-unavailable',
  'no-pending-reanimation',
  'sub-choice-missing',

  // Elimination rewards
  'no-elimination-reward-pending',
  'no-matching-elimination-reward',
  'only-eliminator-chooses-rewards',
  'reward-card-already-chosen',
  'reward-card-unavailable',

  // Room payload / host
  'no-host-seated',
  'invalid-play-card-payload',
  'invalid-play-multiple-attacks-payload',
  'invalid-buy-card-payload',
  'invalid-sell-card-payload',
  'invalid-upgrade-card-payload',
  'invalid-deactivate-persistent-payload',
  'invalid-resolve-sub-choice-payload',
  'invalid-add-bot-payload',
  'invalid-remove-bot-payload',
  'invalid-set-bot-difficulty-payload',

  // Lobby (still sent on ERROR_MESSAGE)
  'start-not-host',
  'start-already-started',
  'start-not-enough-players',
  'add-bot-not-host',
  'add-bot-already-started',
  'add-bot-room-full',
  'remove-bot-not-host',
  'remove-bot-already-started',
  'remove-bot-unknown',
  'remove-bot-target-is-human',
  'set-bot-difficulty-not-host',
  'set-bot-difficulty-already-started',
  'set-bot-difficulty-unknown',
  'set-bot-difficulty-target-is-human',
] as const;

export type ActionRejectCode = (typeof ACTION_REJECT_CODES)[number];

export const ACTION_REJECT_MESSAGE: Record<ActionRejectCode, string> = {
  'not-your-turn': 'It is not your turn.',
  'not-active-player': 'You are not an active player.',
  'already-acted': 'You already acted this turn.',
  'game-not-in-progress': 'The game is not in progress.',
  'finish-mirror-choice': 'Finish your Mirror choice first.',
  'finish-steal-choice': 'Finish your Steal choice first.',
  'finish-pool-pick': 'Finish your pool pick first.',
  'finish-special-pick': 'Finish your special pick first.',
  'finish-reanimation-kit-pick': 'Finish your reanimation kit pick first.',
  'finish-elimination-rewards': 'Finish elimination rewards first.',

  'unknown-player': 'Unknown player.',
  'unknown-card': 'Unknown card.',
  'card-not-held': 'You do not hold that card.',
  'invalid-target': 'Invalid target.',
  'card-not-playable-yet': 'That card is not playable yet.',
  'play-not-legal': 'That play is not legal.',
  'attacks-forbidden-during-block': 'Attack cards are forbidden during Block.',

  'multi-attack-kit-forbidden': 'Your kit cannot play multiple attacks in one turn.',
  'multi-attack-need-two': 'Select at least two attacks.',
  'duplicate-attack-selection': 'Duplicate attack selection.',
  'only-attacks-multiplayable': 'Only attack cards can be multi-played.',

  'not-enough-points': 'Not enough points.',
  'not-enough-lives': 'Not enough lives.',
  'cannot-afford-cost': 'Cannot afford that cost.',
  'not-enough-upgrade-points': 'Not enough upgrade points.',
  'no-upgrade-point-to-sell': 'No upgrade point to sell.',
  'already-upgraded': 'That copy is already upgraded.',
  'card-not-buyable-individually': 'That card cannot be bought individually.',
  'card-not-sellable-individually': 'That card cannot be sold individually.',
  'cost-not-shop-transfer': 'That cost cannot be paid as a shop transfer.',

  'duplicator-kit-required': 'Only the Duplicator kit can activate duplication.',
  'persistent-not-active': 'That persistent effect is not active.',
  'persistent-not-manual': 'That persistent cannot be deactivated manually.',

  'no-mirror-choice-pending': 'No Mirror choice pending.',
  'invalid-mirror-target': 'Invalid Mirror target.',
  'pending-attack-unavailable': 'That pending attack is not available.',
  'nothing-left-to-redirect': 'Nothing left to redirect.',
  'no-opponent-to-redirect': 'No opponent to redirect to.',
  'mirror-choice-missing': 'Mirror choice missing.',

  'no-steal-choice-pending': 'No steal choice pending.',
  'steal-card-unavailable': 'That card is not available to steal.',
  'steal-choice-missing': 'Steal choice missing.',

  'no-pool-pick-pending': 'No pool pick pending.',
  'pool-pick-wrong-count': 'Choose the exact number of cards required from the pool.',
  'duplicate-pool-picks': 'Duplicate pool picks are not allowed.',
  'pool-card-unavailable': 'That card is not available in the pool.',
  'pool-card-gone': 'That card is no longer in the pool.',
  'no-special-pick-pending': 'No special pick pending.',
  'special-unavailable': 'That special is not available.',
  'no-reanimation-kit-pick-pending': 'No reanimation kit pick pending.',
  'kit-unavailable': 'That kit is not available.',
  'no-pending-reanimation': 'No pending reanimation.',
  'sub-choice-missing': 'Sub-choice missing.',

  'no-elimination-reward-pending': 'No elimination reward pending.',
  'no-matching-elimination-reward': 'No matching elimination reward pending.',
  'only-eliminator-chooses-rewards': 'Only the eliminator may choose rewards.',
  'reward-card-already-chosen': 'That card was already chosen as a reward.',
  'reward-card-unavailable': 'That card is not available.',

  'no-host-seated': 'No host is seated.',
  'invalid-play-card-payload': 'Invalid playCard payload.',
  'invalid-play-multiple-attacks-payload': 'Invalid playMultipleAttacks payload.',
  'invalid-buy-card-payload': 'Invalid buyCard payload.',
  'invalid-sell-card-payload': 'Invalid sellCard payload.',
  'invalid-upgrade-card-payload': 'Invalid upgradeCard payload.',
  'invalid-deactivate-persistent-payload': 'Invalid deactivatePersistent payload.',
  'invalid-resolve-sub-choice-payload': 'Invalid resolveSubChoice payload.',
  'invalid-add-bot-payload': 'Invalid addBot payload.',
  'invalid-remove-bot-payload': 'Invalid removeBot payload.',
  'invalid-set-bot-difficulty-payload': 'Invalid setBotDifficulty payload.',

  'start-not-host': 'Only the host can start the game.',
  'start-already-started': 'The game has already started.',
  'start-not-enough-players': 'Need at least 2 players to start.',
  'add-bot-not-host': 'Only the host can add a bot.',
  'add-bot-already-started': 'Cannot add a bot after the game has started.',
  'add-bot-room-full': 'Room is full (4 seats).',
  'remove-bot-not-host': 'Only the host can remove a bot.',
  'remove-bot-already-started': 'Cannot remove a bot after the game has started.',
  'remove-bot-unknown': 'That bot seat was not found.',
  'remove-bot-target-is-human': 'That seat is a human player, not a bot.',
  'set-bot-difficulty-not-host': 'Only the host can change a bot difficulty.',
  'set-bot-difficulty-already-started': 'Cannot change bot difficulty after the game has started.',
  'set-bot-difficulty-unknown': 'That bot seat was not found.',
  'set-bot-difficulty-target-is-human': 'That seat is a human player, not a bot.',
};

export interface ActionReject {
  ok: false;
  code: ActionRejectCode;
  message: string;
}

export function actionReject(code: ActionRejectCode): ActionReject {
  return { ok: false, code, message: ACTION_REJECT_MESSAGE[code] };
}

export function isActionRejectCode(value: unknown): value is ActionRejectCode {
  return (
    typeof value === 'string' &&
    (ACTION_REJECT_CODES as readonly string[]).includes(value)
  );
}
