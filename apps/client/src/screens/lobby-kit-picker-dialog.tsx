/**
 * Lobby / solo kit picker — PROTOCOL_VERSION 30 / L49-02.
 * Grid of portraits; click opens description then Select. Opponents never see the pick.
 */

import { getKit, type LobbyKitSelection } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';

import { getOpponentPlaceholderUrl } from '../design/asset-lookup';
import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import { KitPortrait } from '../design/components/kit-portrait';
import {
  LOBBY_KIT_PICKER_SELECTIONS,
  lobbyKitSelectionLabel,
} from './lobby-kit-picker';
import { KitInspectDetails } from './table/kit-inspect-details';

export interface LobbyKitPickerDialogProps {
  open: boolean;
  current: LobbyKitSelection;
  onClose: () => void;
  onSelect: (selection: LobbyKitSelection) => void;
}

export function LobbyKitPickerDialog({
  open,
  current,
  onClose,
  onSelect,
}: LobbyKitPickerDialogProps): ReactElement {
  const [preview, setPreview] = useState<LobbyKitSelection | null>(null);

  const closePicker = (): void => {
    setPreview(null);
    onClose();
  };

  const title =
    preview === null
      ? 'Choose kit'
      : preview === 'random'
        ? 'Random kit'
        : getKit(preview).name;

  return (
    <Dialog
      open={open}
      title={title}
      onClose={() => {
        if (preview !== null) {
          setPreview(null);
          return;
        }
        closePicker();
      }}
      panelClassName="max-w-3xl"
      actions={
        preview === null ? (
          <Button type="button" variant="green" onClick={closePicker}>
            Close
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="orange"
              onClick={() => {
                setPreview(null);
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="green"
              onClick={() => {
                onSelect(preview);
                closePicker();
              }}
            >
              Select this kit
            </Button>
          </>
        )
      }
    >
      {preview === null ? (
        <KitGrid current={current} onPreview={setPreview} />
      ) : preview === 'random' ? (
        <RandomKitDetails />
      ) : (
        <KitInspectDetails kitId={preview} />
      )}
    </Dialog>
  );
}

function KitGrid({
  current,
  onPreview,
}: {
  current: LobbyKitSelection;
  onPreview: (selection: LobbyKitSelection) => void;
}): ReactElement {
  return (
    <>
      <p className="text-sm text-ink-muted">
        Opponents cannot see your kit. Random is the default.
      </p>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {LOBBY_KIT_PICKER_SELECTIONS.map((selection) => {
          const selected = current === selection;
          const label = lobbyKitSelectionLabel(selection);

          return (
            <li key={selection}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={label}
                onClick={() => {
                  onPreview(selection);
                }}
                className={[
                  'flex min-h-11 h-full w-full flex-col items-center rounded-[length:var(--radius-card)] border p-1.5 text-left transition',
                  selected
                    ? 'border-cta-orange bg-surface ring-2 ring-cta-orange/40'
                    : 'border-border-soft bg-surface hover:border-border',
                ].join(' ')}
              >
                {selection === 'random' ? (
                  <span className="relative inline-block w-full max-w-[5.5rem] overflow-hidden rounded-[length:var(--radius-card)] border border-border bg-surface-raised">
                    <img
                      src={getOpponentPlaceholderUrl()}
                      alt=""
                      width={72}
                      height={96}
                      className="aspect-[3/4] w-full object-contain"
                      draggable={false}
                    />
                  </span>
                ) : (
                  <KitPortrait kitId={selection} className="w-full max-w-[5.5rem]" />
                )}
                <span className="mt-1 w-full truncate text-center text-xs font-semibold text-ink">
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function RandomKitDetails(): ReactElement {
  return (
    <div className="space-y-3 text-sm text-ink">
      <p>
        The server assigns one of the 15 kits at random when the game starts, the same way as
        before this picker existed.
      </p>
      <p className="text-ink-muted">
        Opponents cannot see which kit you received until Spy, an equivalent, or elimination.
      </p>
    </div>
  );
}
