/** Home Play online path: Create and Join forms (OnlinePath): technical spec v7 §7.1; L57-07, L51-03. */

import type { ReactElement, SyntheticEvent } from 'react';

import { Button } from '../../design/components/button';
import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { HOME_INPUT_CLASS } from './home-classes';
import { ONLINE_CREATE_HELPER } from './home-copy';
import { NicknameField } from './nickname-field';
import { PathHeader } from './path-header';

export interface OnlinePathProps {
  nickname: string;
  joinCode: string;
  status: RoomConnectionStatus;
  error: string | null;
  busy: boolean;
  canSubmit: boolean;
  canJoin: boolean;
  onBack: () => void;
  onNicknameChange: (value: string) => void;
  onJoinCodeChange: (value: string) => void;
  onCreateSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onJoinSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onOpenFeedback: () => void;
}

export function OnlinePath({
  nickname,
  joinCode,
  status,
  error,
  busy,
  canSubmit,
  canJoin,
  onBack,
  onNicknameChange,
  onJoinCodeChange,
  onCreateSubmit,
  onJoinSubmit,
  onOpenFeedback,
}: OnlinePathProps): ReactElement {
  return (
    <div>
      <PathHeader
        title="Play online"
        subtitle="Create a room for friends, or join with a six-letter code."
        status={status}
        error={error}
        soloLaunchPending={false}
        onBack={onBack}
        backDisabled={busy}
        onOpenFeedback={onOpenFeedback}
      />

      <div className="mt-8 space-y-8">
        <NicknameField
          value={nickname}
          disabled={busy}
          onChange={onNicknameChange}
        />

        <form onSubmit={onCreateSubmit} className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Create a game</h2>
          <p className="text-sm text-ink-muted">
            {ONLINE_CREATE_HELPER}
          </p>
          <Button type="submit" variant="green" disabled={!canSubmit}>
            Create
          </Button>
        </form>

        <form onSubmit={onJoinSubmit} className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Join a game</h2>
          <label className="block text-sm font-medium text-ink">
            Game code
            <input
              className={HOME_INPUT_CLASS}
              value={joinCode}
              onChange={(event) => {
                onJoinCodeChange(event.target.value.toUpperCase());
              }}
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              placeholder="ABCDEF"
              disabled={busy}
            />
          </label>
          <Button type="submit" variant="green" disabled={!canJoin}>
            Join
          </Button>
        </form>
      </div>
    </div>
  );
}
