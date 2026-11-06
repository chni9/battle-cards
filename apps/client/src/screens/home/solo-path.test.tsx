// @vitest-environment happy-dom
/**
 * The Solo path, rendered: technical spec v7 §7.1, §11 (Q7 radio semantics, Q8 busy); Appendix A
 * `home-solo-path`, `solo-menu-rules`, `solo-menu-rules-side-effects`, `home-solo-play-again-seed`,
 * `home-nickname`, `home-forms-enter-submit`; L17-01, L67-01, Lot 70; Part 2 Review Focus 3 and 5 (L76-11).
 */
import { defaultLobbyRules, type LobbyRules } from '@card-battle/shared';
import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { v7SeatColor } from '../../ui/palette';
import type { SoloMenuSeed } from '../solo-menu-seed';
import { RANDOM_ONLY_SOLO_LINE } from '../kit-pick-copy';
import { HomeScreen, type HomeScreenProps } from './home-screen';
import { enterHomePath, expectNoHomeIntent, makeHomeProps, seedHomeStorage } from './test-home';

const SEED_RULES: LobbyRules = { excludedKitIds: ['ghost'], randomOnly: false, turnTimeSeconds: 90 };
const SEED: SoloMenuSeed = { opponentCount: 3, difficulty: 'hard', kitSelection: 'assassin', lobbyRules: SEED_RULES };

async function openSolo(overrides: Partial<HomeScreenProps> = {}) {
  const props = makeHomeProps({ nickname: 'Ada', ...overrides });
  const result = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
  await enterHomePath(result.user, 'solo');
  return { ...result, props };
}
const group = (name: string): HTMLElement => screen.getByRole('radiogroup', { name });
const radios = (name: string): HTMLElement[] => within(group(name)).getAllByRole('radio');
const checked = (name: string): (string | null)[] =>
  radios(name).filter((radio) => radio.getAttribute('aria-checked') === 'true').map((radio) => radio.textContent);
/** A hex as happy-dom reads back an inline background colour (the claim-seat-dialog test pattern). */
function cssBackground(hex: string): string {
  const probe = document.createElement('span');
  probe.style.backgroundColor = hex;
  return probe.style.backgroundColor;
}
const seatBackground = (count: number): string =>
  within(group('Opponents')).getByRole('radio', { name: String(count) }).style.backgroundColor;
const start = (): HTMLElement => screen.getByRole('button', { name: 'Start solo game' });
const kitCard = (): HTMLElement => screen.getByRole('region', { name: 'Your kit' });
const follows = (first: Node, second: Node): boolean =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeEach(() => {
  seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: true });
});

describe('Solo path (spec v7 §7.1, §11 Q7)', () => {
  it('lays out Nickname, Opponents, Difficulty, Your kit, Table rules and Start solo game in that order, in one form with one submit', async () => {
    await openSolo();
    const parts = [
      screen.getByLabelText('Nickname'),
      group('Opponents'),
      group('Difficulty'),
      kitCard(),
      screen.getByRole('button', { name: 'Table rules' }),
      start(),
    ];
    const form = start().closest('form');
    if (form === null) throw new Error('Start solo game is not in a form');
    expect(parts.every((part) => form.contains(part))).toBe(true);
    expect(parts.slice(1).map((part, index) => {
      const previous = parts[index];
      return previous !== undefined && follows(previous, part);
    })).toEqual([true, true, true, true, true]);
    // Parity `home-forms-enter-submit`: every other button in the solo form is type=button.
    expect(Array.from(form.querySelectorAll('button')).filter((button) => button.type === 'submit').map((button) => button.textContent))
      .toEqual(['Start solo game']);
  });

  it('picks 1 to 7 opponents on seat radios around the table (default 1): arrows change the count, and seats fill up to it', async () => {
    const { user, props } = await openSolo();
    const seats = radios('Opponents');
    expect(seats.map((seat) => seat.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(checked('Opponents')).toEqual(['1']);
    expect(seats.map((seat) => seat.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1', '-1', '-1']);
    act(() => {
      seats[0]?.focus();
    });
    await user.keyboard('{ArrowRight}');
    expect(checked('Opponents')).toEqual(['2']);
    expect(document.activeElement).toBe(within(group('Opponents')).getByRole('radio', { name: '2' }));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(checked('Opponents')).toEqual(['7']); // wraps
    await user.click(within(group('Opponents')).getByRole('radio', { name: '4' }));
    expect(radios('Opponents').map((seat) => seat.getAttribute('data-solo-seat-filled'))).toEqual(['true', 'true', 'true', 'true', 'false', 'false', 'false']);
    expect([1, 4, 5].map(seatBackground)).toEqual([cssBackground(v7SeatColor(1)), cssBackground(v7SeatColor(4)), '']); // a filled seat wears the hue its bot takes
    await user.keyboard('{ArrowDown}');
    expect(checked('Opponents')).toEqual(['5']);
    await user.click(start());
    expect(props.onStartSolo).toHaveBeenCalledWith(5, 'normal', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('picks the shared bot difficulty on a Segmented radio group (default Normal) that changes by keyboard', async () => {
    const { user, props } = await openSolo();
    expect(radios('Difficulty').map((radio) => radio.textContent)).toEqual(['Easy', 'Normal', 'Hard']);
    expect(checked('Difficulty')).toEqual(['Normal']);
    act(() => {
      within(group('Difficulty')).getByRole('radio', { name: 'Normal' }).focus();
    });
    await user.keyboard('{ArrowRight}');
    expect(checked('Difficulty')).toEqual(['Hard']);
    await user.click(start());
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'hard', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('opens pre-filled from a Play again seed and applies it once', async () => {
    const props = makeHomeProps({ nickname: 'Ada', soloMenuSeed: SEED });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Play solo');
    expect([checked('Opponents'), checked('Difficulty')]).toEqual([['3'], ['Hard']]);
    expect(within(kitCard()).getByText('Assassin')).toBeTruthy();
    expect(within(screen.getByRole('button', { name: 'Table rules' })).getByText('90s')).toBeTruthy();
    await user.click(within(group('Opponents')).getByRole('radio', { name: '6' }));
    rerender(<HomeScreen {...props} />);
    expect(checked('Opponents')).toEqual(['6']);
    expect(props.onSoloMenuSeedApplied).toHaveBeenCalledTimes(1);
  });

  it("launches 'random' under Random only, with the dealt line in place of Your kit", async () => {
    const props = makeHomeProps({ nickname: 'Ada', soloMenuSeed: { ...SEED, lobbyRules: { ...SEED_RULES, randomOnly: true } } });
    const { user } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    expect(screen.queryByRole('region', { name: 'Your kit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Choose kit' })).toBeNull();
    expect(screen.getByText(RANDOM_ONLY_SOLO_LINE)).toBeTruthy();
    await user.click(start());
    expect(props.onStartSolo).toHaveBeenCalledWith(3, 'hard', 'random', { lobbyRules: { ...SEED_RULES, randomOnly: true }, includeTurnTime: true });
  });

  it('launches once on a double click on Start solo game or an Enter right after; a failure re-arms it (Review Focus 3)', async () => {
    const { user, props, rerender } = await openSolo();
    await user.dblClick(start());
    await user.type(screen.getByLabelText('Nickname'), '{Enter}');
    expect(props.onStartSolo).toHaveBeenCalledTimes(1);
    rerender(<HomeScreen {...props} status="failed" error="This table is full." />);
    expect(screen.getByRole('alert').textContent).toBe('This table is full.');
    await user.click(start());
    expect(props.onStartSolo).toHaveBeenCalledTimes(2);
  });
});

describe('a solo launch with a sheet open (Part 2 Review Focus 5; spec v7 §11 Q8)', () => {
  it('disables every Solo control during the launch, and the rules strip still opens', async () => {
    const { user, props, rerender } = await openSolo();
    expect(seatBackground(1)).toBe(cssBackground(v7SeatColor(1)));
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect(seatBackground(1)).toBe(''); // the filled seats drop their hue for the off look
    expect([...radios('Opponents'), ...radios('Difficulty')].filter((radio) => !radio.hasAttribute('disabled'))).toEqual([]);
    expect(['Opponents', 'Difficulty'].map((name) => group(name).getAttribute('aria-disabled'))).toEqual(['true', 'true']);
    expect(['Choose kit', 'Start solo game'].filter((name) => !screen.getByRole('button', { name }).hasAttribute('disabled'))).toEqual([]);
    expect(screen.getByLabelText('Nickname').hasAttribute('disabled')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Table rules' }));
    expect(within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('slider', { name: 'Human turn' }).hasAttribute('disabled')).toBe(true);
    expectNoHomeIntent(props);
  });

  it('never submits the form from the rules sheet or the kit picker it opens', async () => {
    const { user, props } = await openSolo();
    await user.click(screen.getByRole('button', { name: 'Table rules' }));
    const rules = screen.getByRole('dialog', { name: 'Table rules' });
    expect(rules.closest('form')).toBeNull();
    act(() => {
      within(rules).getByRole('button', { name: 'Ghost' }).focus();
    });
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Table rules', hidden: true })).toBeNull();
    });
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByRole('button', { name: 'Assassin' }));
    const kit = screen.getByRole('dialog', { name: 'Assassin' });
    expect(kit.closest('form')).toBeNull();
    act(() => {
      within(kit).getByRole('button', { name: 'Select this kit' }).focus();
    });
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(0);
    });
    expect(within(kitCard()).getByText('Assassin')).toBeTruthy();
    expectNoHomeIntent(props);
  });
});
