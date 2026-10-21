// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Tabs, type TabItem } from './tabs';

type TabId = 'latest' | 'history' | 'archive';

const TABS: readonly TabItem<TabId>[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'history', label: 'History' },
  { id: 'archive', label: 'Archive', disabled: true },
];

function Harness({ onSelect }: { onSelect: (id: TabId) => void }) {
  const [selected, setSelected] = useState<TabId>('latest');
  return (
    <Tabs
      label="Release notes"
      tabs={TABS}
      selectedId={selected}
      onSelect={(id) => {
        onSelect(id);
        setSelected(id);
      }}
    >
      {`Panel ${selected}`}
    </Tabs>
  );
}

describe('Tabs (technical spec v7 §11, WAI-ARIA tabs)', () => {
  it('exposes a labelled tablist, aria-selected tabs and one labelled tabpanel', () => {
    renderUi(<Harness onSelect={vi.fn()} />);
    expect(screen.getByRole('tablist', { name: 'Release notes' })).toBeTruthy();
    const latest = screen.getByRole('tab', { name: 'Latest' });
    expect(latest.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'History' }).getAttribute('aria-selected')).toBe('false');
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(latest.id);
    expect(latest.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.textContent).toBe('Panel latest');
  });

  it('uses a roving tabindex on the selected tab', () => {
    renderUi(<Harness onSelect={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Latest' }).tabIndex).toBe(0);
    expect(screen.getByRole('tab', { name: 'History' }).tabIndex).toBe(-1);
  });

  it('ArrowRight and ArrowLeft move focus and select, skipping disabled tabs and wrapping', async () => {
    const onSelect = vi.fn();
    const { user } = renderUi(<Harness onSelect={onSelect} />);
    await user.tab();
    await user.keyboard('{ArrowRight}');
    const history = screen.getByRole('tab', { name: 'History' });
    expect(document.activeElement).toBe(history);
    expect(history.getAttribute('aria-selected')).toBe('true');
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Latest' }));
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(history);
    expect(onSelect.mock.calls).toEqual([['history'], ['latest'], ['history']]);
  });

  it('Home and End jump to the first and last enabled tab', async () => {
    const onSelect = vi.fn();
    const { user } = renderUi(<Harness onSelect={onSelect} />);
    await user.tab();
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'History' }));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Latest' }));
    expect(onSelect.mock.calls).toEqual([['history'], ['latest']]);
  });

  it('click selects; a disabled tab cannot be selected', async () => {
    const onSelect = vi.fn();
    const { user } = renderUi(<Harness onSelect={onSelect} />);
    await user.click(screen.getByRole('tab', { name: 'Archive' }));
    await user.click(screen.getByRole('tab', { name: 'History' }));
    expect(onSelect.mock.calls).toEqual([['history']]);
    expect(screen.getByRole('tabpanel').textContent).toBe('Panel history');
  });
});
