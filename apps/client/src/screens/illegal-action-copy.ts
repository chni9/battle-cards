/**
 * Richer client copy for illegal-action rejects — L39-02.
 * Keyed by ActionRejectCode; fall back to wire / shared short message if missing.
 */

import {
  MAX_PLAYERS,
  type ActionRejectCode,
} from '@card-battle/shared';

export interface IllegalActionCopy {
  /** Dialog title; defaults to "Can't do that". */
  title?: string;
  /** 1–2 sentence body shown in the dialog. */
  body: string;
}

const DEFAULT_TITLE = "Can't do that";

/** Exhaustive client copy — every ActionRejectCode must appear (see test). */
export const ILLEGAL_ACTION_COPY: Record<ActionRejectCode, IllegalActionCopy> = {
  'not-your-turn': {
    title: 'Not your turn',
    body: 'Wait for your turn before playing or buying. You can still inspect cards and the board.',
  },
  'not-active-player': {
    title: 'Seat inactive',
    body: 'You are not an active player in this game, so that action cannot be taken.',
  },
  'already-acted': {
    title: 'Already acted',
    body: 'You already took your main action this turn. Wait for the turn to finish.',
  },
  'game-not-in-progress': {
    title: 'Game not running',
    body: 'That action only works while a match is in progress.',
  },
  'finish-mirror-choice': {
    title: 'Mirror pending',
    body: 'Finish your Mirror choice first — redirect or confirm before doing anything else.',
  },
  'finish-steal-choice': {
    title: 'Steal pending',
    body: 'Pick a card to steal (or finish the Steal prompt) before taking another action.',
  },
  'finish-pool-pick': {
    title: 'Pool pick pending',
    body: 'Finish choosing cards from the pool before taking another action.',
  },
  'finish-special-pick': {
    title: 'Special pick pending',
    body: 'Finish choosing your special card before taking another action.',
  },
  'finish-reanimation-kit-pick': {
    title: 'Kit pick pending',
    body: 'Choose a kit for reanimation before taking another action.',
  },
  'finish-elimination-rewards': {
    title: 'Rewards pending',
    body: 'Claim your elimination rewards first, then continue playing.',
  },

  'unknown-player': {
    body: 'That player is not in this game (or no longer is). Pick a different target.',
  },
  'unknown-card': {
    body: 'That card is not recognized. Refresh or pick another card from your hand.',
  },
  'card-not-held': {
    title: 'Card not in hand',
    body: 'You do not hold that card anymore. It may have been played, sold, or stolen.',
  },
  'invalid-target': {
    title: 'Invalid target',
    body: 'That target is not legal for this card. Choose an eligible opponent or seat.',
  },
  'card-not-playable-yet': {
    title: 'Not playable yet',
    body: 'This card cannot be played in the current situation — check its conditions and timing.',
  },
  'play-not-legal': {
    title: 'Illegal play',
    body: "This card can't be played in the current situation. Check costs, targets, and kit rules.",
  },
  'attacks-forbidden-during-block': {
    title: 'Attacks blocked',
    body: 'Attack cards are forbidden while Block is in effect. Play something else or wait it out.',
  },

  'multi-attack-kit-forbidden': {
    title: 'Kit restriction',
    body: 'Your kit cannot play multiple attacks in one turn. Play a single attack instead.',
  },
  'multi-attack-need-two': {
    title: 'Need more attacks',
    body: 'Multi-attack needs at least two attack cards selected. Add another or play one alone.',
  },
  'duplicate-attack-selection': {
    body: 'You selected the same attack more than once. Each attack in a multi-play must be distinct.',
  },
  'only-attacks-multiplayable': {
    body: 'Only attack cards can be played together in one multi-attack. Drop non-attacks from the selection.',
  },

  'not-enough-points': {
    title: 'Not enough points',
    body: 'You do not have enough points for that. Earn or buy points, or choose a cheaper option.',
  },
  'not-enough-lives': {
    title: 'Not enough lives',
    body: 'You do not have enough lives to pay that cost. Pick another option or recover lives first.',
  },
  'cannot-afford-cost': {
    title: "Can't afford it",
    body: 'You cannot afford that cost with your current resources. Adjust the spend or wait for income.',
  },
  'not-enough-upgrade-points': {
    title: 'No upgrade points',
    body: 'You need more upgrade points for that. Buy one from the economy bar first.',
  },
  'no-upgrade-point-to-sell': {
    body: 'You have no upgrade point to sell. Buy one first if you want to convert it back.',
  },
  'already-upgraded': {
    title: 'Already upgraded',
    body: 'That copy is already upgraded. Pick a different copy or another card.',
  },
  'card-not-buyable-individually': {
    body: 'That card cannot be bought one-off from the shop. Use the shared buy flow or another option.',
  },
  'card-not-sellable-individually': {
    body: 'That card cannot be sold individually. Sell upgrade points or another eligible card instead.',
  },
  'cost-not-shop-transfer': {
    body: 'That cost cannot be paid as a shop transfer. Use the normal buy/sell actions instead.',
  },

  'duplicator-kit-required': {
    title: 'Duplicator only',
    body: 'Only the Duplicator kit can activate duplication. Your kit does not have that ability.',
  },
  'persistent-not-active': {
    body: 'That persistent effect is not active on your seat, so it cannot be deactivated.',
  },
  'persistent-not-manual': {
    body: 'That persistent cannot be turned off manually — it expires or resolves on its own schedule.',
  },

  'no-mirror-choice-pending': {
    body: 'There is no Mirror choice waiting for you right now.',
  },
  'invalid-mirror-target': {
    title: 'Invalid Mirror target',
    body: 'That redirect target is not legal. Choose an eligible pending attack or opponent.',
  },
  'pending-attack-unavailable': {
    body: 'That pending attack is no longer available to redirect. Pick another eligible effect.',
  },
  'nothing-left-to-redirect': {
    body: 'Nothing is left to redirect with Mirror. The choice may have already resolved.',
  },
  'no-opponent-to-redirect': {
    body: 'There is no living opponent to redirect that attack to.',
  },
  'mirror-choice-missing': {
    body: 'Your Mirror choice was incomplete. Pick a valid redirect and confirm again.',
  },

  'no-steal-choice-pending': {
    body: 'There is no Steal choice waiting for you right now.',
  },
  'steal-card-unavailable': {
    body: 'That card is not available to steal anymore. Pick another eligible card.',
  },
  'steal-choice-missing': {
    body: 'Your Steal choice was incomplete. Select a card and confirm again.',
  },

  'no-pool-pick-pending': {
    body: 'There is no pool pick waiting for you right now.',
  },
  'pool-pick-wrong-count': {
    title: 'Wrong number of cards',
    body: 'Choose the exact number of pool cards required, then confirm.',
  },
  'duplicate-pool-picks': {
    body: 'You selected the same pool card more than once. Each pick must be a different card.',
  },
  'pool-card-unavailable': {
    body: 'That card is not available in the pool. Pick from the listed eligible cards.',
  },
  'pool-card-gone': {
    body: 'That card is no longer in the pool. Someone else may have taken it — pick again.',
  },
  'no-special-pick-pending': {
    body: 'There is no special-card pick waiting for you right now.',
  },
  'special-unavailable': {
    body: 'That special is not available. Choose from the options still on offer.',
  },
  'no-reanimation-kit-pick-pending': {
    body: 'There is no reanimation kit pick waiting for you right now.',
  },
  'kit-unavailable': {
    body: 'That kit is not available. Choose from the kits still offered.',
  },
  'no-pending-reanimation': {
    body: 'There is no pending reanimation to resolve for your seat.',
  },
  'sub-choice-missing': {
    body: 'Your sub-choice was incomplete. Make a valid selection and confirm again.',
  },

  'no-elimination-reward-pending': {
    body: 'There is no elimination reward waiting for you right now.',
  },
  'no-matching-elimination-reward': {
    body: 'That elimination reward no longer matches what the server expects. Reopen the prompt.',
  },
  'only-eliminator-chooses-rewards': {
    title: 'Not your rewards',
    body: 'Only the player who scored the elimination may choose those rewards.',
  },
  'reward-card-already-chosen': {
    body: 'That card was already chosen as a reward. Pick a different card or resource option.',
  },
  'reward-card-unavailable': {
    body: 'That card is not available as a reward anymore. Choose from what is still listed.',
  },

  'no-host-seated': {
    body: 'No host is seated in this room, so that host-only action cannot run.',
  },
  'invalid-play-card-payload': {
    title: 'Invalid play',
    body: 'The play request was malformed. Close the dialog and try playing the card again.',
  },
  'invalid-play-multiple-attacks-payload': {
    title: 'Invalid multi-attack',
    body: 'The multi-attack request was malformed. Reselect your attacks and targets, then retry.',
  },
  'invalid-buy-card-payload': {
    title: 'Invalid buy',
    body: 'The buy request was malformed. Close the shop and try purchasing again.',
  },
  'invalid-sell-card-payload': {
    title: 'Invalid sell',
    body: 'The sell request was malformed. Close the card dialog and try selling again.',
  },
  'invalid-upgrade-card-payload': {
    title: 'Invalid upgrade',
    body: 'The upgrade request was malformed. Close the card dialog and try upgrading again.',
  },
  'invalid-deactivate-persistent-payload': {
    body: 'The deactivate request was malformed. Try turning off the persistent effect again.',
  },
  'invalid-resolve-sub-choice-payload': {
    body: 'The sub-choice confirmation was malformed. Reopen the prompt and confirm again.',
  },
  'invalid-add-bot-payload': {
    body: 'The add-bot request was malformed. Try adding a bot again from the lobby.',
  },
  'invalid-remove-bot-payload': {
    body: 'The remove-bot request was malformed. Try removing the bot again from the lobby.',
  },
  'invalid-set-bot-difficulty-payload': {
    body: 'The bot-difficulty request was malformed. Try changing difficulty again from the lobby.',
  },
  'invalid-choose-kit-payload': {
    body: 'The kit choice was malformed. Open Choose kit and pick again.',
  },

  'start-not-host': {
    title: 'Host only',
    body: 'Only the host can start the game. Ask the host to press Start when everyone is ready.',
  },
  'start-already-started': {
    body: 'The game has already started. You should be at the table shortly.',
  },
  'start-not-enough-players': {
    title: 'Need more players',
    body: 'You need at least two players (humans or bots) before the host can start.',
  },
  'add-bot-not-host': {
    title: 'Host only',
    body: 'Only the host can add bots. Ask the host if you want more opponents.',
  },
  'add-bot-already-started': {
    body: 'Bots cannot be added after the game has started.',
  },
  'add-bot-room-full': {
    title: 'Room full',
    body: `All ${String(MAX_PLAYERS)} seats are taken. Remove a bot or leave a seat free before adding another.`,
  },
  'remove-bot-not-host': {
    title: 'Host only',
    body: 'Only the host can remove bots from the lobby.',
  },
  'remove-bot-already-started': {
    body: 'Bots cannot be removed after the game has started.',
  },
  'remove-bot-unknown': {
    body: 'That bot seat was not found. It may already have been removed.',
  },
  'remove-bot-target-is-human': {
    body: 'That seat is a human player, not a bot. You cannot remove humans this way.',
  },
  'set-bot-difficulty-not-host': {
    title: 'Host only',
    body: 'Only the host can change a bot\'s difficulty.',
  },
  'set-bot-difficulty-already-started': {
    body: 'Bot difficulty cannot be changed after the game has started.',
  },
  'set-bot-difficulty-unknown': {
    body: 'That bot seat was not found. It may already have been removed.',
  },
  'set-bot-difficulty-target-is-human': {
    body: 'That seat is a human player, not a bot. Difficulty only applies to bots.',
  },
  'choose-kit-already-started': {
    title: 'Game already started',
    body: 'You cannot change your kit after the host has started the game.',
  },
  'tutorial-follow-coach': {
    title: 'Tutorial step',
    body: 'This tutorial step asks for a different action.',
  },
  'tutorial-room-closed': {
    title: 'Tutorial closed',
    body: 'This tutorial cannot be joined.',
  },
};

export function resolveIllegalActionCopy(
  code: ActionRejectCode | undefined,
  fallbackMessage: string,
): { title: string; body: string } {
  if (code !== undefined) {
    const entry = ILLEGAL_ACTION_COPY[code];
    return {
      title: entry.title ?? DEFAULT_TITLE,
      body: entry.body,
    };
  }

  return {
    title: DEFAULT_TITLE,
    body: fallbackMessage.length > 0 ? fallbackMessage : DEFAULT_TITLE,
  };
}
