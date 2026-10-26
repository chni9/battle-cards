// @vitest-environment happy-dom
/**
 * ConnectionBadge — L10-04, parity `global-connection-badge` (technical spec v7 Appendix A),
 * §5.2 (11 px floor for functional text) and §11 (the visible text is the spoken text).
 */

import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { Icon } from '../icons/icon';
import type { IconName } from '../icons/icon-names';
import { ConnectionBadge } from './connection-badge';
import type { ConnectionBadgePlayer } from './connection-badge-label';

type Overrides = Partial<ConnectionBadgePlayer['connection']> & { isEliminated?: boolean };

const fakeSeat = ({ isEliminated = false, ...connection }: Overrides = {}): ConnectionBadgePlayer => ({
  isEliminated,
  connection: { status: 'connected', automaticTurnsTaken: 0, consecutiveTimeouts: 0, ...connection },
});

/** The markup of one glyph, so a test can tell which icon a badge drew. */
function glyphOf(name: IconName): string {
  const { container, unmount } = renderUi(<Icon name={name} size={12} />);
  const markup = container.querySelector('svg')?.innerHTML ?? '';
  unmount();
  return markup;
}

function rootOf(container: HTMLElement): Element {
  const root = container.firstElementChild;
  if (root === null) {
    throw new Error('Nothing was rendered');
  }
  return root;
}

const STATES: readonly { name: string; seat: ConnectionBadgePlayer; text: string; icon: IconName }[] = [
  { name: 'eliminated', seat: fakeSeat({ isEliminated: true }), text: 'eliminated', icon: 'eliminated' },
  { name: 'grace', seat: fakeSeat({ status: 'disconnected' }), text: 'disconnected — grace', icon: 'disconnected' },
  { name: 'absent', seat: fakeSeat({ status: 'absent', automaticTurnsTaken: 2 }), text: 'absent 2/3', icon: 'disconnected' },
  { name: 'idle', seat: fakeSeat({ consecutiveTimeouts: 4 }), text: 'idle timeouts 4/5', icon: 'disconnected' },
];

describe('ConnectionBadge (V7 · global-connection-badge)', () => {
  it('uses two distinct glyphs', () => {
    expect(glyphOf('eliminated')).not.toBe(glyphOf('disconnected'));
  });

  it.each(STATES)('renders the $name copy with a decorative $icon icon', ({ seat, text, icon }) => {
    const root = rootOf(renderUi(<ConnectionBadge player={seat} />).container);
    expect(root.textContent).toBe(text);
    expect(root.getAttribute('aria-label')).toBeNull();
    const svgs = root.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0]?.getAttribute('aria-hidden')).toBe('true');
    expect(svgs[0]?.innerHTML).toBe(glyphOf(icon));
  });

  it('renders nothing for a connected seat with no timeouts', () => {
    expect(renderUi(<ConnectionBadge player={fakeSeat()} />).container.childElementCount).toBe(0);
  });

  it('passes className to the root', () => {
    const { container } = renderUi(<ConnectionBadge player={fakeSeat({ status: 'disconnected' })} className="shrink-0" />);
    expect(rootOf(container).classList.contains('shrink-0')).toBe(true);
  });
});
