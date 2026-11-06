// @vitest-environment happy-dom
/** Random kit description (technical spec v7 §10.1 Lot 76 row, §7.3). L76-10 moves it with L76-03's copy. */
import { describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { RandomKitDetails } from './random-kit-details';

describe('RandomKitDetails (L76-10)', () => {
  it('deals one of the allowed kits and uses the Lot 69 wording, not the old 16-kit and Spy lines', () => {
    const { container } = renderUi(<RandomKitDetails />);
    expect(container.textContent).toMatch(/one of the allowed kits/);
    expect(container.textContent).not.toMatch(/16 kits/);
    expect(container.textContent).not.toMatch(/until Spy, an equivalent, or elimination/);
  });
});
