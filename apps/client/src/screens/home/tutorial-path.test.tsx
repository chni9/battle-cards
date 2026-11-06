// @vitest-environment happy-dom
/**
 * The Tutorial path, rendered: technical spec v7 §7.1 (nickname only), §5.2; Appendix A
 * `home-tutorial-path`, `home-nickname`, `home-forms-enter-submit`; L45-04, L46-03; Part 2 Review
 * Focus 3 (L76-08).
 */
import { screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { HomeScreen, type HomeScreenProps } from './home-screen';
import { enterHomePath, makeHomeProps, seedHomeStorage } from './test-home';

function StatefulHome(props: HomeScreenProps): ReactElement {
  const [nickname, setNickname] = useState(props.nickname);
  return <HomeScreen {...props} nickname={nickname} onNicknameChange={setNickname} />;
}
const nickname = (): HTMLInputElement => screen.getByLabelText<HTMLInputElement>('Nickname');
const start = (): HTMLElement => screen.getByRole('button', { name: 'Start tutorial' });
const otherLaunches = (props: HomeScreenProps): number[] =>
  [props.onCreate, props.onJoin, props.onStartSolo].map((fn) => vi.mocked(fn).mock.calls.length);

beforeEach(() => {
  seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: true });
});

describe('Tutorial path (spec v7 §7.1; L45-04)', () => {
  it('holds a 16 px Nickname and Start tutorial in one form; a double click starts once with no rules or kit (Review Focus 3)', async () => {
    const props = makeHomeProps({ nickname: 'Ada' });
    const { user } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'tutorial');
    expect(nickname().classList.contains('text-v7-input')).toBe(true);
    expect(start().closest('form')).toBe(nickname().closest('form'));
    expect(start().getAttribute('type')).toBe('submit');
    await user.dblClick(start());
    expect(vi.mocked(props.onStartTutorial).mock.calls).toEqual([[]]);
    expect(otherLaunches(props)).toEqual([0, 0, 0]);
  });

  it('Enter in Nickname starts the tutorial once it has a name', async () => {
    const props = makeHomeProps();
    const { user } = renderUi(<StatefulHome {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'tutorial');
    await user.type(nickname(), '{Enter}');
    expect(props.onStartTutorial).not.toHaveBeenCalled();
    await user.type(nickname(), 'Ada{Enter}');
    expect(vi.mocked(props.onStartTutorial).mock.calls).toEqual([[]]);
  });

  it('locks Nickname and Start tutorial during the launch', async () => {
    const props = makeHomeProps({ nickname: 'Ada' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'tutorial');
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect(screen.getByText('Starting solo game…')).toBeTruthy();
    expect([nickname().hasAttribute('disabled'), start().hasAttribute('disabled')]).toEqual([true, true]);
    expect(props.onStartTutorial).not.toHaveBeenCalled();
  });
});
