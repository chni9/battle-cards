// @vitest-environment happy-dom
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_CHART_COLORS,
  ADMIN_CHART_EMPTY_COLOR,
  scatterPlotXY,
} from '../../admin/admin-chart-math';
import { renderUi } from '../../test/render';
import { AdminHorizontalBarChart, AdminPieChart, AdminScatterChart } from './admin-charts';

/** happy-dom may serialize a hex color as `rgb(r, g, b)`; accept either form. */
function colorForms(hex: string): readonly string[] {
  const packed = Number.parseInt(hex.slice(1), 16);
  const rgb = `rgb(${String((packed >> 16) & 0xff)}, ${String((packed >> 8) & 0xff)}, ${String(packed & 0xff)})`;
  return [hex, rgb];
}

function expectColor(actual: string, hex: string): void {
  expect(colorForms(hex)).toContain(actual);
}

describe('admin charts (technical spec v7 §7.8, L80-04)', () => {
  it('empty bars and an empty pie show No data', () => {
    const { rerender } = renderUi(<AdminHorizontalBarChart items={[]} />);
    expect(screen.getByText('No data')).not.toBeNull();
    expect(screen.queryByRole('img')).toBeNull();

    rerender(<AdminPieChart items={[]} />);
    expect(screen.getByText('No data')).not.toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('a two-slice pie names both labels and counts in its aria-label', () => {
    renderUi(
      <AdminPieChart
        items={[
          { id: 'win', label: 'Win', value: 3 },
          { id: 'loss', label: 'Loss', value: 1 },
        ]}
      />,
    );
    const pie = screen.getByRole('img');
    expect(pie.getAttribute('aria-label')).toBe('Win 3, Loss 1');
    const legend = screen.getByRole('list');
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toStrictEqual([
      'Win3',
      'Loss1',
    ]);
  });

  it('the pie background is the conic gradient of its slices', () => {
    renderUi(
      <AdminPieChart
        items={[
          { id: 'win', label: 'Win', value: 3 },
          { id: 'loss', label: 'Loss', value: 1 },
        ]}
      />,
    );
    const background = screen.getByRole('img').style.background;
    expect(background).toContain('conic-gradient');
    const forms = [ADMIN_CHART_COLORS[0], ADMIN_CHART_COLORS[1]].map(colorForms);
    for (const accepted of forms) {
      expect(accepted.some((form) => background.includes(form))).toBe(true);
    }
  });

  it('an all-zero pie paints the empty ring', () => {
    renderUi(
      <AdminPieChart
        items={[
          { id: 'win', label: 'Win', value: 0 },
          { id: 'loss', label: 'Loss', value: 0 },
        ]}
      />,
    );
    const pie = screen.getByRole('img');
    expect(pie.style.background).not.toContain('conic-gradient');
    expectColor(pie.style.background, ADMIN_CHART_EMPTY_COLOR);
  });

  it('scatter points carry their title and the axis text', () => {
    const { container } = renderUi(
      <AdminScatterChart
        points={[{ id: 'kamikaze', label: 'Kamikaze', x: 0.5, y: 0.25 }]}
        xLabel="Pick rate"
        yLabel="Win rate"
      />,
    );
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    const circle = circles[0];
    expect(circle?.querySelector('title')?.textContent).toBe('Kamikaze: pick 50.0%, win 25.0%');
    const { x, y } = scatterPlotXY(0.5, 0.25);
    expect(circle?.getAttribute('cx')).toBe(String(x));
    expect(circle?.getAttribute('cy')).toBe(String(y));
    expect(screen.getByText('Win rate × Pick rate')).not.toBeNull();
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Win rate versus Pick rate');
  });

  it('bars and dots paint the first palette color', () => {
    const { container, rerender } = renderUi(
      <AdminHorizontalBarChart items={[{ id: 'a', label: 'Alpha', value: 4 }]} />,
    );
    const bar = container.querySelector('.bg-v7-cta-2');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('style')).toContain('width: 100%');
    expect(container.querySelector('.bg-v7-panel-2')).not.toBeNull();

    rerender(
      <AdminScatterChart
        points={[{ id: 'a', label: 'Alpha', x: 0.1, y: 0.9 }]}
        xLabel="Pick rate"
        yLabel="Win rate"
      />,
    );
    expect(container.querySelector('circle')?.getAttribute('fill')).toBe(ADMIN_CHART_COLORS[0]);
  });
});
