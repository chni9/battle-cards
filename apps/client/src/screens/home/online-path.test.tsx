// @vitest-environment happy-dom
/**
 * The Online path, rendered: technical spec v7 §7.1, §5.2, §7.7 (connection errors stay inline);
 * Appendix A `home-online-path`, `home-nickname`, `home-forms-enter-submit`,
 * `home-connection-status-and-errors`, `global-text-input-no-ios-zoom`; L57-07, L51-03; Part 2 Review
 * Focus 3 (L76-08).
 */
import { screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { HOW_TO_PLAY_SEEN_KEY } from '../../ui/help-storage';
import { STATUS_LABELS } from '../status-labels';
import { HomeScreen, type HomeScreenProps } from './home-screen';
import { closeHomeDialog, enterHomePath, expectNoHomeIntent, HOME_PATH_LABEL, makeHomeProps, seedHomeStorage } from './test-home';

/** App's nickname and code state, so typing reaches the fields (App.tsx owns both). */
function StatefulHome(props: HomeScreenProps): ReactElement {
  const [nickname, setNickname] = useState(props.nickname);
  const [joinCode, setJoinCode] = useState(props.joinCode);
  return (
    <HomeScreen
      {...props}
      nickname={nickname}
      joinCode={joinCode}
      onNicknameChange={(value) => {
        props.onNicknameChange(value);
        setNickname(value);
      }}
      onJoinCodeChange={(value) => {
        props.onJoinCodeChange(value);
        setJoinCode(value);
      }}
    />
  );
}
const field = (name: string): HTMLInputElement => screen.getByLabelText<HTMLInputElement>(name);
const button = (name: string): HTMLElement => screen.getByRole('button', { name });
const title = (): string => screen.getByRole('heading', { level: 1 }).textContent;
const follows = (first: Node, second: Node): boolean =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeEach(() => {
  seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: true });
});

describe('Online path (spec v7 §7.1, §5.2; L57-07)', () => {
  it('puts a 16 px Nickname outside both forms, then Create, then Join with a large code field', async () => {
    const { user } = renderUi(<HomeScreen {...makeHomeProps()} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    const nickname = field('Nickname');
    const code = field('Game code');
    const create = button('Create');
    const join = button('Join');
    expect(nickname.closest('form')).toBeNull();
    expect(['maxlength', 'autocomplete', 'placeholder'].map((name) => nickname.getAttribute(name))).toEqual(['24', 'nickname', 'Your name']);
    expect(nickname.classList.contains('text-v7-input')).toBe(true);
    expect(create.closest('form')?.contains(code)).toBe(false);
    expect(join.closest('form')).toBe(code.closest('form'));
    expect(['maxlength', 'autocomplete', 'spellcheck', 'placeholder'].map((name) => code.getAttribute(name))).toEqual(['6', 'off', 'false', 'ABCDEF']);
    expect(code.classList.contains('text-v7-display')).toBe(true);
    expect([follows(nickname, create), follows(create, code), follows(code, join)]).toEqual([true, true, true]);
    expect([create, join].map((control) => control.getAttribute('type'))).toEqual(['submit', 'submit']);
  });

  it('uppercases the code as typed; Enter in Game code joins once, and only when Join is enabled; Enter in Nickname never', async () => {
    const props = makeHomeProps();
    const { user } = renderUi(<StatefulHome {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    await user.type(field('Nickname'), 'Ada{Enter}');
    await user.type(field('Game code'), 'abcde{Enter}');
    expect(field('Game code').value).toBe('ABCDE');
    expectNoHomeIntent(props);
    await user.type(field('Game code'), 'fg'); // maxLength keeps six
    expect(field('Game code').value).toBe('ABCDEF');
    await user.type(field('Game code'), '{Enter}');
    expect(props.onJoin).toHaveBeenCalledTimes(1);
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it('a double click on Create or Join launches once; a failure re-arms both so the player retries in place (Review Focus 3)', async () => {
    const props = makeHomeProps({ nickname: 'Ada', joinCode: 'ABCDEF' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    await user.dblClick(button('Create'));
    await user.dblClick(button('Join'));
    expect([vi.mocked(props.onCreate).mock.calls.length, vi.mocked(props.onJoin).mock.calls.length]).toEqual([1, 1]);
    rerender(<HomeScreen {...props} status="failed" error='room "ABCDEF" not found' />);
    expect(screen.getByText(STATUS_LABELS.failed)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('room "ABCDEF" not found');
    expect(title()).toBe(HOME_PATH_LABEL.online);
    expect([field('Nickname').value, field('Game code').value]).toEqual(['Ada', 'ABCDEF']);
    expect(field('Game code').getAttribute('autocapitalize')).toBe('characters');
    await user.click(button('Join'));
    expect([vi.mocked(props.onCreate).mock.calls.length, vi.mocked(props.onJoin).mock.calls.length]).toEqual([1, 2]);
    await user.click(button('Create')); // the failure re-armed Create too, not only Join
    expect([vi.mocked(props.onCreate).mock.calls.length, vi.mocked(props.onJoin).mock.calls.length]).toEqual([2, 2]);
  });

  it('locks Nickname, Game code, Create and Join while connecting', async () => {
    const props = makeHomeProps({ nickname: 'Ada', joinCode: 'ABCDEF' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    rerender(<HomeScreen {...props} status="connecting" />);
    expect(screen.getByText(STATUS_LABELS.connecting)).toBeTruthy();
    expect([field('Nickname'), field('Game code'), button('Create'), button('Join')].map((control) => control.hasAttribute('disabled')))
      .toEqual([true, true, true, true]);
    expectNoHomeIntent(props);
  });

  it('keeps the nickname across the Online, Tutorial and Solo paths', async () => {
    const props = makeHomeProps();
    const { user } = renderUi(<StatefulHome {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    await user.type(field('Nickname'), 'Ada');
    for (const target of ['tutorial', 'solo'] as const) {
      await user.click(button('Back'));
      await enterHomePath(user, target);
      expect(field('Nickname').value).toBe('Ada');
    }
    expect(vi.mocked(props.onNicknameChange).mock.calls.at(-1)).toEqual(['Ada']);
    expectNoHomeIntent(props);
  });
});

describe('invite link on Home (spec v7 §7.1; L76-17)', () => {
  it('openOnline enters Online at mount, through the How to play gate the first time', async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const props = makeHomeProps({ joinCode: 'ABCDEF', openOnline: true });
    const { user } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    expect(title()).toBe('Card Battle');
    await closeHomeDialog(user, 'How to play', 'Escape');
    expect(localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBe('1');
    expect(title()).toBe(HOME_PATH_LABEL.online);
    expect(field('Game code').value).toBe('ABCDEF');
    expect(button('Join').hasAttribute('disabled')).toBe(true);
    expectNoHomeIntent(props);
  });
});
