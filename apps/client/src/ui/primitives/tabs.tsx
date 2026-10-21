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
import {
  CHROME_FOCUS_CLASS,
  CHROME_TRACK_CLASS,
  CHROME_TRACK_IDLE_CLASS,
  CHROME_TRACK_ITEM_CLASS,
  CHROME_TRACK_SELECTED_CLASS,
  CHROME_TRACK_SELECTED_LOCKED_CLASS,
} from './chrome-classes';
import { edgeEnabledIndex, hasCommandModifier, nextEnabledIndex, rovingKeyFor } from './roving-focus';

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
    if (hasCommandModifier(event)) return;
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
        className={`${CHROME_TRACK_CLASS} self-start`}
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
              className={`${CHROME_TRACK_ITEM_CLASS} shrink-0 px-4 ${
                selected
                  ? tab.disabled === true
                    ? CHROME_TRACK_SELECTED_LOCKED_CLASS
                    : CHROME_TRACK_SELECTED_CLASS
                  : CHROME_TRACK_IDLE_CLASS
              }`}
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
