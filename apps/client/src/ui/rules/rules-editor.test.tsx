// @vitest-environment happy-dom
/** Host rules editor (technical spec v7 §7.4, §11, §13 Q3/Q4/Q8/Q18/Q31; Appendix A `lobby-rules-host-dialog`,
 * `lobby-rules-dialog-kit-guardrails`, `lobby-rules-dialog-live-apply`). L76-09. */
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getKit, KIT_IDS, type KitId, type LobbyRules, type SetLobbyRulesPayload } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { EXCLUDED_LABEL, LAST_ALLOWED_KIT_REASON, SERVER_DEFAULT_LABEL } from '../ui-copy';
import { RulesEditor } from './rules-editor';
import type { RulesEditorBinding } from './rules-editor-model';

function rules(overrides: Partial<LobbyRules> = {}): LobbyRules {
  return { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60, ...overrides };
}
function setup(shown: LobbyRules = rules(), binding: Omit<RulesEditorBinding, 'onChange'> = {}) {
  const onChange = vi.fn<(payload: SetLobbyRulesPayload) => void>();
  const editor: RulesEditorBinding = { ...binding, onChange };
  const result = renderUi(<RulesEditor rules={shown} editor={editor} />);
  return { ...result, editor, onChange, slider: screen.getByRole('slider', { name: 'Human turn' }) };
}
const valueOf = (element: HTMLElement): string => (element instanceof HTMLInputElement ? element.value : '');
const follows = (a: HTMLElement, b: HTMLElement): boolean => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('RulesEditor (L76-09)', () => {
  it('puts the slider first, then All, None and Random, then the kit toggles (decisions 2026-10-06)', () => {
    const { slider } = setup();
    const [all, none, random] = ['All', 'None', 'Random'].map((name) => screen.getByRole('button', { name }));
    const firstKit = screen.getByRole('button', { name: getKit(KIT_IDS[0]).name });
    if (all === undefined || none === undefined || random === undefined) throw new Error('missing control');
    expect([follows(slider, all), follows(all, none), follows(none, random), follows(random, firstKit)]).toEqual([true, true, true, true]);
  });

  it('a drag sends one payload on release, with turnTimeSeconds (Q4/Q18)', () => {
    const { slider, onChange } = setup(rules({ excludedKitIds: ['ghost'] }));
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    fireEvent.input(slider, { target: { value: '120' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    expect(onChange.mock.calls).toStrictEqual([[{ excludedKitIds: ['ghost'], randomOnly: false, turnTimeSeconds: 120 }]]);
  });

  it('a held arrow key sends one payload, on key release', () => {
    const { slider, onChange } = setup();
    for (const value of ['61', '62']) {
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      fireEvent.input(slider, { target: { value } });
    }
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    expect(onChange.mock.calls).toStrictEqual([[{ excludedKitIds: [], randomOnly: false, turnTimeSeconds: 62 }]]);
  });

  it('over a 300 s server default the slider sits at 180, and Kit, All, None and Random send no turnTimeSeconds (Review Focus 2)', async () => {
    const { user, slider, onChange } = setup(rules({ turnTimeSeconds: 300, excludedKitIds: ['ghost'] }));
    expect([valueOf(slider), slider.getAttribute('aria-valuetext')]).toEqual(['180', '180s']);
    for (const name of ['Wizard', 'All', 'None', 'Random']) await user.click(screen.getByRole('button', { name }));
    expect(onChange.mock.calls.map(([payload]) => payload)).toStrictEqual([
      { excludedKitIds: ['wizard', 'ghost'], randomOnly: false },
      { excludedKitIds: [], randomOnly: false },
      { excludedKitIds: KIT_IDS.slice(1), randomOnly: false },
      { excludedKitIds: ['ghost'], randomOnly: true },
    ]);
  });

  it('lists the 16 kits in KIT_IDS order as toggles: aria-pressed = allowed, and an excluded kit says Excluded', () => {
    const excludedKitIds: readonly KitId[] = ['kamikaze', 'ghost'];
    setup(rules({ excludedKitIds }));
    const items = [...document.querySelectorAll<HTMLElement>('[data-rules-editor] [data-kit-id]')];
    expect(items.map((item) => item.getAttribute('data-kit-id'))).toEqual([...KIT_IDS]);
    for (const kitId of KIT_IDS) {
      const toggle = screen.getByRole('button', { name: getKit(kitId).name });
      const excluded = excludedKitIds.includes(kitId);
      expect(toggle.getAttribute('aria-pressed'), kitId).toBe(excluded ? 'false' : 'true');
      expect(within(toggle).queryByText(EXCLUDED_LABEL) !== null, kitId).toBe(excluded);
    }
  });

  it('locks the last allowed kit with its visible reason; pressing it sends nothing', async () => {
    const { user, onChange, editor, rerender } = setup(rules({ excludedKitIds: KIT_IDS.filter((kitId) => kitId !== 'wizard') }));
    const wizard = screen.getByRole('button', { name: 'Wizard', description: LAST_ALLOWED_KIT_REASON });
    expect([wizard.getAttribute('aria-disabled'), wizard.getAttribute('aria-pressed')]).toEqual(['true', 'true']);
    expect(screen.getByText(LAST_ALLOWED_KIT_REASON)).toBeTruthy();
    await user.click(wizard);
    expect(onChange).not.toHaveBeenCalled();
    rerender(<RulesEditor rules={rules({ excludedKitIds: KIT_IDS.filter((kitId) => kitId !== 'wizard' && kitId !== 'ghost') })} editor={editor} />);
    expect(screen.queryByText(LAST_ALLOWED_KIT_REASON)).toBeNull();
    expect(screen.getByRole('button', { name: 'Wizard' }).hasAttribute('aria-disabled')).toBe(false);
  });

  it('disables every control while the editor is disabled (solo launch Q8; reconnecting)', async () => {
    const { user, slider, onChange } = setup(rules(), { disabled: true });
    expect(slider.hasAttribute('disabled')).toBe(true);
    for (const name of ['All', 'None', 'Random', ...KIT_IDS.map((kitId) => getKit(kitId).name)]) {
      expect(screen.getByRole('button', { name }).hasAttribute('disabled'), name).toBe(true);
    }
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads Server default at the untouched value while serverDefaultTime, and the seconds while moved (Q3/Q31)', () => {
    const { slider } = setup(rules(), { serverDefaultTime: true });
    expect(slider.getAttribute('aria-valuetext')).toBe(SERVER_DEFAULT_LABEL);
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    expect(slider.getAttribute('aria-valuetext')).toBe('90s');
    fireEvent.input(slider, { target: { value: '60' } });
    expect(slider.getAttribute('aria-valuetext')).toBe(SERVER_DEFAULT_LABEL);
  });
});
