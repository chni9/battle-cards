/**
 * Tabs with real tablist semantics (technical spec v7 §11; WAI-ARIA APG tabs, horizontal,
 * automatic activation): `aria-selected` tabs, one labelled `tabpanel`, and a roving tabindex
 * so the selected tab is the only Tab stop. ArrowLeft and ArrowRight move focus and select,
 * wrapping and skipping disabled tabs; Home and End jump to the first and last enabled tab.
 *
 * The caller owns the selection (`selectedId`, `onSelect`) and renders the selected panel's
 * content as `children`. Ids come from `idPrefix`, or from `useId`.
 */

import { useId, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { CHROME_FOCUS_CLASS } from './chrome-classes';
import { edgeEnabledIndex, nextEnabledIndex, rovingKeyFor } from './roving-focus';

export interface TabItem<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly disabled?: boolean;
}

export interface TabsProps<T extends string> {
  label: string;
  tabs: readonly TabItem<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  children: ReactNode;
  idPrefix?: string;
}

export function Tabs<T extends string>({
  label,
  tabs,
  selectedId,
  onSelect,
  children,
  idPrefix,
}: TabsProps<T>): ReactElement {
  const generatedId = useId();
  const prefix = idPrefix ?? generatedId;
  const tabId = (id: T): string => `${prefix}-tab-${id}`;
  const panelId = `${prefix}-panel`;
  const disabled = tabs.map((tab) => tab.disabled === true);
  const selectedIndex = tabs.findIndex((tab) => tab.id === selectedId);
  const tabStop =
    selectedIndex >= 0 && disabled[selectedIndex] !== true ? selectedIndex : edgeEnabledIndex(disabled, 'first');

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
    const key = rovingKeyFor(event.key, 'tabs');
    if (key === null) return;
    event.preventDefault();
    const target =
      key === 'first' || key === 'last'
        ? edgeEnabledIndex(disabled, key)
        : nextEnabledIndex(disabled, index, key === 'next' ? 1 : -1);
    const tab = tabs[target];
    if (target === index || tab === undefined) return;
    document.getElementById(tabId(tab.id))?.focus();
    onSelect(tab.id);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex max-w-full gap-1 self-start rounded-v7-chrome border-(length:--chrome-outline-width) border-v7-ink bg-v7-panel p-1"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === selectedId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={selected}
              {...(selected ? { 'aria-controls': panelId } : {})}
              tabIndex={index === tabStop ? 0 : -1}
              disabled={tab.disabled === true}
              onClick={() => {
                if (!selected) onSelect(tab.id);
              }}
              onKeyDown={(event) => {
                onKeyDown(event, index);
              }}
              className={[
                'min-h-11 shrink-0 rounded-v7-chrome-sm px-4 font-v7-display text-v7-body leading-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                CHROME_FOCUS_CLASS,
                selected ? 'bg-v7-cta text-v7-text-on-cta' : 'text-v7-text-2 enabled:hover:text-v7-text',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(selectedId)}
        tabIndex={0}
        className={`rounded-v7-chrome-sm ${CHROME_FOCUS_CLASS}`}
      >
        {children}
      </div>
    </div>
  );
}
