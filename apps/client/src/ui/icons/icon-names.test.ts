/** V7 icon names — technical spec v7 §5.6 plus five L72 additions, L72-07. */
import { describe, expect, it } from 'vitest';
import { ICON_NAMES, isIconName, RESOURCE_ICON } from './icon-names';

/** §5.6 resources, statuses and UI controls, in spec order. */
const SPEC_ICON_NAMES = ('life point upgrade shield spied-by-you spying-on-you shield-active block persistent invisibility '
  + 'reanimation-armed duplication-active eliminated bot disconnected absorb-window sentence-ticking menu shop draw unspy log '
  + 'help coach chat feedback flag sound vibration rules share copy minimize').split(' ');
/** Clock (L72-16), close (L72-09, L72-17), chevrons (L72-08), random (L72-16). */
const L72_ADDED_NAMES = ['clock', 'close', 'chevron-left', 'chevron-right', 'random'];

describe('ICON_NAMES (technical spec v7 §5.6)', () => {
  it('lists the §5.6 set, then the L72 additions, in order', () => {
    expect([...ICON_NAMES]).toEqual([...SPEC_ICON_NAMES, ...L72_ADDED_NAMES]);
  });
  it('has no duplicate name', () => { expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length); });
});
describe('RESOURCE_ICON', () => {
  it('maps each resource kind to its resource icon', () => {
    expect(RESOURCE_ICON).toEqual({ life: 'life', point: 'point', upgradePoint: 'upgrade', shield: 'shield' });
  });
});
describe('isIconName', () => {
  it('accepts every listed name', () => { for (const name of ICON_NAMES) expect(isIconName(name)).toBe(true); });
  it('rejects unknown, empty, padded and differently cased names', () => {
    for (const value of ['', 'Life', 'upgradePoint', 'heart', ' close']) expect(isIconName(value)).toBe(false);
  });
});
