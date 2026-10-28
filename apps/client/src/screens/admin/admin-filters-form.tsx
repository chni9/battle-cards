/**
 * The match filters shared by Overview, Matches and Kits (Appendix A `admin-filters-form`),
 * restyled for tool mode (technical spec v7 §7.8, L80-03). Edits stay in the caller's state;
 * only Apply sends them (`filtersToQuery`).
 *
 * Seat count is a select over `ADMIN_OCCUPANCY_KEYS` (2–8, the values the server accepts), so it
 * can never send a value the server ignores. Its empty option sends no `occupancy`.
 */

import type { ReactElement } from 'react';

import { ADMIN_OCCUPANCY_KEYS, KIT_IDS } from '@card-battle/shared';

import { kitDisplayName } from '../../admin/admin-present';
import type { AdminFilterState } from '../../admin/filter-query';
import { Button } from '../../ui/primitives/button';
import {
  ADMIN_FIELD_CLASS,
  ADMIN_FIELD_LABEL_CLASS,
  ADMIN_PANEL_CLASS,
  ADMIN_SECTION_TITLE_CLASS,
} from './admin-classes';
import { ANY_SEAT_COUNT_LABEL } from './admin-filters-copy';

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
    <section className={ADMIN_PANEL_CLASS} aria-labelledby="admin-filters-heading">
      <h3 id="admin-filters-heading" className={ADMIN_SECTION_TITLE_CLASS}>
        Filters
      </h3>
      <p className="mt-1 font-v7-body text-v7-caption font-bold text-v7-text-2">
        Tutorial matches are hidden unless you include them below. From and To
        use your local clock.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={ADMIN_FIELD_LABEL_CLASS}>From</span>
          <input
            className={ADMIN_FIELD_CLASS}
            type="datetime-local"
            value={filters.from}
            onChange={(event) => {
              onChange({ ...filters, from: event.target.value });
            }}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={ADMIN_FIELD_LABEL_CLASS}>To</span>
          <input
            className={ADMIN_FIELD_CLASS}
            type="datetime-local"
            value={filters.to}
            onChange={(event) => {
              onChange({ ...filters, to: event.target.value });
            }}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={ADMIN_FIELD_LABEL_CLASS}>Opponents</span>
          <select
            className={ADMIN_FIELD_CLASS}
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
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={ADMIN_FIELD_LABEL_CLASS}>Seat count</span>
          <select
            className={ADMIN_FIELD_CLASS}
            value={filters.occupancy}
            onChange={(event) => {
              onChange({ ...filters, occupancy: event.target.value });
            }}
          >
            <option value="">{ANY_SEAT_COUNT_LABEL}</option>
            {ADMIN_OCCUPANCY_KEYS.map((seats) => (
              <option key={seats} value={String(seats)}>
                {seats}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className={ADMIN_FIELD_LABEL_CLASS}>Kit</span>
          <select
            className={ADMIN_FIELD_CLASS}
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
        <label className="flex min-h-11 items-center gap-2 self-end font-v7-body text-v7-body font-bold text-v7-text">
          <input
            type="checkbox"
            className="size-5 accent-v7-cta-2"
            checked={filters.includeTutorial}
            onChange={(event) => {
              onChange({ ...filters, includeTutorial: event.target.checked });
            }}
          />
          Include tutorial matches
        </label>
      </div>
      <div className="mt-4">
        <Button variant="primary" onClick={onApply}>
          Apply
        </Button>
      </div>
    </section>
  );
}
