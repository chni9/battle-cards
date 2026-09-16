import type { ReactElement } from 'react';

import type { AdminFilterState } from '../../admin/filter-query';
import { Button } from '../../design/components/button';

const inputClassName = [
  'mt-1 block w-full min-h-10 rounded-[length:var(--radius-control)]',
  'border border-border bg-surface-raised px-2 py-1.5 font-sans text-sm text-ink',
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
    <div className="rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4">
      <p className="text-sm font-medium text-ink">Filters</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-ink-muted">
          From (ISO)
          <input
            className={inputClassName}
            value={filters.from}
            onChange={(event) => {
              onChange({ ...filters, from: event.target.value });
            }}
          />
        </label>
        <label className="text-xs text-ink-muted">
          To (ISO)
          <input
            className={inputClassName}
            value={filters.to}
            onChange={(event) => {
              onChange({ ...filters, to: event.target.value });
            }}
          />
        </label>
        <label className="text-xs text-ink-muted">
          Bots
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
            <option value="all">All</option>
            <option value="humans">Humans only</option>
            <option value="withBots">With bots</option>
          </select>
        </label>
        <label className="text-xs text-ink-muted">
          Occupancy (2–8)
          <input
            className={inputClassName}
            inputMode="numeric"
            value={filters.occupancy}
            onChange={(event) => {
              onChange({ ...filters, occupancy: event.target.value });
            }}
          />
        </label>
        <label className="text-xs text-ink-muted">
          Kit id
          <input
            className={inputClassName}
            value={filters.kit}
            onChange={(event) => {
              onChange({ ...filters, kit: event.target.value });
            }}
          />
        </label>
        <label className="flex items-end gap-2 text-xs text-ink">
          <input
            type="checkbox"
            checked={filters.includeTutorial}
            onChange={(event) => {
              onChange({ ...filters, includeTutorial: event.target.checked });
            }}
          />
          Include tutorial games
        </label>
      </div>
      <div className="mt-3">
        <Button compact type="button" variant="green" onClick={onApply}>
          Apply filters
        </Button>
      </div>
    </div>
  );
}
