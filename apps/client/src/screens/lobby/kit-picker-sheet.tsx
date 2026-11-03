/**
 * Kit picker sheet — technical spec v7 §7.3 (the kit picker), §6.7 (read-only sheets stack, and Esc
 * closes only the top one), §11 (Q23: an excluded kit is greyed and says so in words; Q39: a
 * disabled action says why); Appendix A `lobby-kit-picker-dialog`, `home-solo-kit-picker`,
 * `lobby-dialog-dismiss-map`, `lobby-rules-change-guest-effects`; Lot 76 plan Appendix A.9 rulings
 * 3 and 5. L76-10. It replaces the V2 `LobbyKitPickerDialog`, and the lobby and the solo menu share it.
 *
 * Two read-only `Sheet`s, so Esc steps back one level: the grid ("Choose kit") under, and the kit
 * sheet over it (`KitDetails`, or `RandomKitDetails`) with Back and Select this kit. Select is the
 * only commit. Back, Esc and Close never change the pick.
 *
 * - **An excluded kit stays listed** (Q23), greyed and labelled by `KitTile`, whose head is natively
 *   `disabled`: it leaves the Tab order and cannot open the kit sheet, so it can never reach Select
 *   (ruling 3, the one disabled pattern of the picker).
 * - **Select can turn disabled under focus** when the host excludes the kit being read, or while
 *   `disabled`: it keeps focus (`focusableWhenDisabled`), says why with the existing reject copy,
 *   and sends nothing.
 * - **Select is latched per kit-sheet open** (ruling 5): the exiting sheet keeps its stale handler
 *   while it fades, and a double tap must not send two `chooseKit` intents.
 * - **Random only** shows no sheet, whatever `open` says. Both sheets get `open={false}` rather
 *   than unmounting, so an open picker plays its exit; the caller clears its own flag.
 */

import { type KitId, type LobbyKitSelection, type LobbyRules } from '@card-battle/shared';
import { useRef, useState, type ReactElement } from 'react';

import { KitDetails } from '../../ui/kit/kit-details';
import { KitPortrait } from '../../ui/kit/kit-portrait';
import { Button } from '../../ui/primitives/button';
import { KitTile } from '../../ui/primitives/kit-tile';
import { Sheet } from '../../ui/primitives/sheet';
import { ILLEGAL_ACTION_COPY } from '../illegal-action-copy';
import { KIT_PICKER_LEAD } from '../kit-pick-copy';
import { LOBBY_KIT_PICKER_SELECTIONS, lobbyKitSelectionLabel } from './lobby-kit-picker';
import { kitTileStats } from './kit-tile-stats';
import { RandomKitDetails } from './random-kit-details';

export interface KitPickerSheetProps {
  readonly open: boolean;
  readonly current: LobbyKitSelection;
  /** Excluded kits and Random only. */
  readonly rules: LobbyRules;
  /** The only commit: the lobby passes `onChooseKit`, the solo path a local setter. */
  readonly onSelect: (selection: LobbyKitSelection) => void;
  readonly onClose: () => void;
  /** Busy or reconnecting: Select this kit is disabled (the sheets still open and close). */
  readonly disabled?: boolean;
}

interface KitSheetState {
  /** The tile whose sheet is open, or null for the grid alone. */
  readonly selection: LobbyKitSelection | null;
  /** Counts kit-sheet opens, so Select can latch once per open. */
  readonly epoch: number;
}

export function KitPickerSheet({
  open,
  current,
  rules,
  onSelect,
  onClose,
  disabled = false,
}: KitPickerSheetProps): ReactElement {
  const [kitSheet, setKitSheet] = useState<KitSheetState>({ selection: null, epoch: 0 });
  const sentEpoch = useRef<number | null>(null);
  const visible = open && !rules.randomOnly;
  // Render-time sync, as in `ui/primitives/slider.tsx`: a hidden picker reopens on the grid.
  if (!visible && kitSheet.selection !== null) setKitSheet({ selection: null, epoch: kitSheet.epoch });

  const excluded = new Set<KitId>(rules.excludedKitIds);
  const preview = kitSheet.selection;
  const previewExcluded = preview !== null && preview !== 'random' && excluded.has(preview);
  const selectDisabled = disabled || previewExcluded;

  const openKit = (selection: LobbyKitSelection): void => {
    setKitSheet((state) => ({ selection, epoch: state.epoch + 1 }));
  };
  const back = (): void => {
    setKitSheet((state) => ({ ...state, selection: null }));
  };
  const select = (): void => {
    if (preview === null || selectDisabled || sentEpoch.current === kitSheet.epoch) return;
    sentEpoch.current = kitSheet.epoch;
    onSelect(preview);
    onClose();
  };

  return (
    <>
      <Sheet
        mode="read-only"
        open={visible}
        title="Choose kit"
        placement="auto"
        className="max-w-3xl"
        onClose={onClose}
        dataAttributes={{ 'data-lobby-sheet': 'kit-picker' }}
        actions={
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        }
      >
        <p className="font-v7-body text-v7-body font-bold text-v7-text-2">{KIT_PICKER_LEAD}</p>
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
          {LOBBY_KIT_PICKER_SELECTIONS.map((selection) => (
            <li key={selection} data-kit-picker-tile={selection} className="grid">
              <KitTile
                name={lobbyKitSelectionLabel(selection)}
                portrait={<KitPortrait kitId={selection} size="tile" />}
                stats={selection === 'random' ? [] : kitTileStats(selection)}
                selected={current === selection}
                excluded={selection !== 'random' && excluded.has(selection)}
                onSelect={() => {
                  openKit(selection);
                }}
              />
            </li>
          ))}
        </ul>
      </Sheet>
      <Sheet
        mode="read-only"
        open={visible && preview !== null}
        title={preview === null ? '' : lobbyKitSelectionLabel(preview)}
        placement="auto"
        onClose={back}
        dataAttributes={{ 'data-lobby-sheet': 'kit' }}
        actions={
          <>
            <Button variant="quiet" onClick={back}>
              Back
            </Button>
            <Button
              variant="primary"
              disabled={selectDisabled}
              focusableWhenDisabled
              disabledReason={previewExcluded ? ILLEGAL_ACTION_COPY['choose-kit-excluded'].body : ''}
              onClick={select}
            >
              Select this kit
            </Button>
          </>
        }
      >
        {preview === 'random' ? <RandomKitDetails /> : preview !== null ? <KitDetails kitId={preview} /> : null}
      </Sheet>
    </>
  );
}
