// @vitest-environment happy-dom
/** Lobby rules strip and host editor (technical spec v7 §7.2, §7.4, Q15; Appendix A `lobby-rules-summary`,
 * `lobby-rules-host-dialog`, `lobby-rules-dialog-live-apply`, `rules-turn-time-default-override`). L76-09. */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getKit, KIT_IDS, type KitId, type LobbyRules } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { EXCLUDED_LABEL } from '../../ui/ui-copy';
import { LobbyScreen } from './lobby-screen';
import { expectNoLobbyIntent, guestLobbyView, hostLobbyView, makeLobbyProps, walkInLobbyView } from './test-lobby';

const RULES: LobbyRules = { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60 };
const strip = (): HTMLElement => screen.getByRole('button', { name: 'Table rules' });
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Table rules' });

describe('lobby table rules (L76-09)', () => {
  it('host, over a 300 s server default: the strip reads 300s, the slider sits at 180, and Kit, All, None and Random send no turnTimeSeconds (Review Focus 2)', async () => {
    const props = makeLobbyProps({ view: hostLobbyView({ lobbyRules: { ...RULES, turnTimeSeconds: 300 } }) });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    expect(within(strip()).getByText('300s')).toBeTruthy();
    await user.click(strip());
    expectNoLobbyIntent(props);
    const slider = within(sheet()).getByRole('slider', { name: 'Human turn' });
    expect(slider instanceof HTMLInputElement ? slider.value : '').toBe('180');
    for (const name of ['Ghost', 'All', 'None', 'Random']) await user.click(within(sheet()).getByRole('button', { name }));
    const payloads = vi.mocked(props.onSetLobbyRules).mock.calls.map(([payload]) => payload);
    expect(payloads).toStrictEqual([
      { excludedKitIds: ['ghost'], randomOnly: false },
      { excludedKitIds: [], randomOnly: false },
      { excludedKitIds: KIT_IDS.slice(1), randomOnly: false },
      { excludedKitIds: [], randomOnly: true },
    ]);
    for (const payload of payloads) expect(payload).not.toHaveProperty('turnTimeSeconds');
  });

  it('host: a drag sends one setLobbyRules on release, with turnTimeSeconds', async () => {
    const props = makeLobbyProps({ view: hostLobbyView({ lobbyRules: { ...RULES, excludedKitIds: ['ghost'], randomOnly: true } }) });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(strip());
    const slider = within(sheet()).getByRole('slider', { name: 'Human turn' });
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    fireEvent.input(slider, { target: { value: '120' } });
    expect(props.onSetLobbyRules).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    expect(vi.mocked(props.onSetLobbyRules).mock.calls).toStrictEqual([[{ excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 120 }]]);
  });

  it.each([
    { who: 'a seated guest', view: guestLobbyView({ lobbyRules: { excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 45 } }) },
    { who: 'a walk-in', view: walkInLobbyView({ lobbyRules: { excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 45 } }) },
  ])('$who taps the strip for the read-only sheet: no editable control, Close only, nothing sent (Q15)', async ({ view }) => {
    const props = makeLobbyProps({ view });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(strip());
    expect(within(sheet()).getByText('45s')).toBeTruthy();
    expect(within(sheet()).queryAllByRole('slider')).toHaveLength(0);
    expect(sheet().querySelectorAll('input, select, textarea, [contenteditable], [aria-pressed]')).toHaveLength(0);
    expect(within(sheet()).getAllByRole('button').map((button) => button.textContent.trim())).toEqual(['Close']);
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Table rules' })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });

  it.each([
    { who: 'the host', view: hostLobbyView({ lobbyRules: RULES }) },
    { who: 'a guest', view: guestLobbyView({ lobbyRules: RULES }) },
  ])('Close returns focus to the Table rules strip for $who, even when the press never focused it (Safari; P2 critique b)', async ({ view }) => {
    const { user } = renderUi(<LobbyScreen {...makeLobbyProps({ view })} />, { reducedMotion: true });
    const opener = strip();
    fireEvent.click(opener); // Safari does not focus a button on click, so the sheet has no opener to return to
    expect(document.activeElement).not.toBe(opener);
    await user.click(within(sheet()).getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Table rules', hidden: true })).toBeNull();
    });
    expect(document.activeElement).toBe(opener);
  });

  it('every face on the strip has its kit-name alt, and every excluded face says Excluded', () => {
    const excludedKitIds: readonly KitId[] = ['assassin', 'gambler'];
    renderUi(<LobbyScreen {...makeLobbyProps({ view: guestLobbyView({ lobbyRules: { ...RULES, excludedKitIds } }) })} />);
    for (const kitId of KIT_IDS) {
      const face = strip().querySelector<HTMLElement>(`[data-kit-id="${kitId}"]`);
      if (face === null) throw new Error(`no face for ${kitId}`);
      expect(within(face).getByAltText(getKit(kitId).name)).toBeTruthy();
      expect(within(face).queryByText(EXCLUDED_LABEL) !== null, kitId).toBe(excludedKitIds.includes(kitId));
    }
  });
});
