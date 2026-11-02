// @vitest-environment happy-dom
import { KIT_IDS } from '@card-battle/shared';
import { fireEvent, screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { kitDisplayName } from '../../admin/admin-present';
import { DEFAULT_ADMIN_FILTERS, filtersToQuery } from '../../admin/filter-query';
import { renderUi } from '../../test/render';
import { AdminFiltersForm } from './admin-filters-form';

/** Holds the filter state like a page does and records the query each Apply would send. */
function FiltersHarness({ sent }: { sent: Record<string, string>[] }): ReactElement {
  const [filters, setFilters] = useState(DEFAULT_ADMIN_FILTERS);
  return (
    <AdminFiltersForm
      filters={filters}
      onChange={setFilters}
      onApply={() => {
        sent.push(filtersToQuery(filters));
      }}
    />
  );
}

function seatSelect(): HTMLSelectElement {
  return screen.getByRole<HTMLSelectElement>('combobox', { name: 'Seat count' });
}

function optionLabels(select: HTMLSelectElement): string[] {
  return Array.from(select.options, (option) => option.text);
}

function optionValues(select: HTMLSelectElement): string[] {
  return Array.from(select.options, (option) => option.value);
}

describe('AdminFiltersForm (Appendix A admin-filters-form, L80-03)', () => {
  it('Seat count offers the any option then 2 to 8 (spec v7 §13 Q76)', () => {
    renderUi(<FiltersHarness sent={[]} />);
    const seats = seatSelect();
    expect(optionLabels(seats)).toStrictEqual(['Any seat count', '2', '3', '4', '5', '6', '7', '8']);
    expect(optionValues(seats)).toStrictEqual(['', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('5 then Apply sends occupancy=5', async () => {
    const sent: Record<string, string>[] = [];
    const { user } = renderUi(<FiltersHarness sent={sent} />);
    await user.selectOptions(seatSelect(), '5');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(sent).toStrictEqual([{ occupancy: '5' }]);
  });

  it('the any option sends no occupancy', async () => {
    const sent: Record<string, string>[] = [];
    const { user } = renderUi(<FiltersHarness sent={sent} />);
    await user.selectOptions(seatSelect(), '5');
    await user.selectOptions(seatSelect(), '');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(sent).toStrictEqual([{}]);
    expect(sent[0] ?? {}).not.toHaveProperty('occupancy');
  });

  it('edits without Apply send nothing', async () => {
    const sent: Record<string, string>[] = [];
    const { user } = renderUi(<FiltersHarness sent={sent} />);
    const firstKit = KIT_IDS[0];
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-18T09:00' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-19T09:00' } });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Opponents' }), 'humans');
    await user.selectOptions(seatSelect(), '4');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Kit' }), firstKit);
    await user.click(screen.getByRole('checkbox', { name: 'Include tutorial matches' }));

    // The edits landed in the controlled fields; none of them reached `sent`.
    expect(screen.getByLabelText<HTMLInputElement>('From').value).toBe('2026-09-18T09:00');
    expect(seatSelect().value).toBe('4');
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'Include tutorial matches' }).checked).toBe(true);
    expect(sent).toStrictEqual([]);
  });

  it('keeps Opponents, Kit, From, To, the tutorial toggle and the helper copy (Appendix A admin-filters-form)', () => {
    renderUi(<FiltersHarness sent={[]} />);

    const opponents = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Opponents' });
    expect(optionLabels(opponents)).toStrictEqual(['All matches', 'Humans only', 'Includes bots']);
    expect(optionValues(opponents)).toStrictEqual(['all', 'humans', 'withBots']);

    const kit = screen.getByRole<HTMLSelectElement>('combobox', { name: 'Kit' });
    expect(optionLabels(kit)).toStrictEqual(['Any kit', ...KIT_IDS.map((kitId) => kitDisplayName(kitId))]);
    expect(optionValues(kit)).toStrictEqual(['', ...KIT_IDS]);

    expect(screen.getByLabelText<HTMLInputElement>('From').type).toBe('datetime-local');
    expect(screen.getByLabelText<HTMLInputElement>('To').type).toBe('datetime-local');

    const tutorial = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Include tutorial matches' });
    expect(tutorial.checked).toBe(false);

    expect(
      screen.getByText(
        'Tutorial matches are hidden unless you include them below. From and To use your local clock.',
      ),
    ).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Filters' })).not.toBeNull();
  });

  it('every filter field uses the 16 px input step', () => {
    const { container } = renderUi(<FiltersHarness sent={[]} />);
    const fields = Array.from(container.querySelectorAll('input:not([type="checkbox"]), select'));
    // From, To, Opponents, Seat count and Kit: a vacuous pass on an empty list is not allowed.
    expect(fields).toHaveLength(5);
    for (const field of fields) {
      expect(field.classList.contains('text-v7-input')).toBe(true);
    }
  });
});
