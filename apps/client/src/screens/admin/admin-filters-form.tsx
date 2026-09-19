import type { ReactElement } from 'react';

import type { AdminFilterState } from '../../admin/filter-query';
import { KIT_IDS } from '@card-battle/shared';

import { Button } from '../../design/components/button';
import { kitDisplayName } from '../../admin/admin-present';

const inputClassName = [
  'mt-1.5 block w-full min-h-10 rounded-[length:var(--radius-control)]',
  'border border-border bg-surface-raised px-3 py-2 font-sans text-sm text-ink',
  'placeholder:text-ink-muted/60',
].join(' ');

interface AdminFiltersFormProps {
  filters: AdminFilterState;
  onChange: (next: AdminFilterState) => void;
  onApply: () => void;
}

export function AdminFiltersForm({
  filters,
  onChange,
  onApply,
}: AdminFiltersFormProps): ReactElement {
  return (
    <section
      className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4 md:p-5"
      aria-labelledby="admin-filters-heading"
    >
      <h3 id="admin-filters-heading" className="font-sans text-sm font-semibold text-ink">
        Filters
      </h3>
      <p className="mt-1 text-xs text-ink-muted">
        Tutorial matches are hidden unless you include them below. From and To
        use your local clock.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-medium text-ink-muted">
          From
          <input
            className={inputClassName}
            type="datetime-local"
            value={filters.from}
            onChange={(event) => {
              onChange({ ...filters, from: event.target.value });
            }}
          />
        </label>
        <label className="block text-xs font-medium text-ink-muted">
          To
          <input
            className={inputClassName}
            type="datetime-local"
            value={filters.to}
            onChange={(event) => {
              onChange({ ...filters, to: event.target.value });
            }}
          />
        </label>
        <label className="block text-xs font-medium text-ink-muted">
          Opponents
          <select
            className={inputClassName}
            value={filters.bots}
            onChange={(event) => {
              onChange({
                ...filters,
                bots: event.target.value as AdminFilterState['bots'],
              });
            }}
          >
            <option value="all">All matches</option>
            <option value="humans">Humans only</option>
            <option value="withBots">Includes bots</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-ink-muted">
          Seat count
          <input
            className={inputClassName}
            inputMode="numeric"
            placeholder="2–8"
            value={filters.occupancy}
            onChange={(event) => {
              onChange({ ...filters, occupancy: event.target.value });
            }}
          />
        </label>
        <label className="block text-xs font-medium text-ink-muted">
          Kit
          <select
            className={inputClassName}
            value={filters.kit}
            onChange={(event) => {
              onChange({ ...filters, kit: event.target.value });
            }}
          >
            <option value="">Any kit</option>
            {KIT_IDS.map((kitId) => (
              <option key={kitId} value={kitId}>
                {kitDisplayName(kitId)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-10 items-center gap-2 pt-5 text-sm text-ink">
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={filters.includeTutorial}
            onChange={(event) => {
              onChange({ ...filters, includeTutorial: event.target.checked });
            }}
          />
          Include tutorial matches
        </label>
      </div>
      <div className="mt-4">
        <Button compact type="button" variant="green" onClick={onApply}>
          Apply
        </Button>
      </div>
    </section>
  );
}
