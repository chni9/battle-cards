/**
 * Home Play online path: Create and Join forms (OnlinePath): technical spec v7 §7.1, §5.2; L57-07,
 * L51-03. L76-08: V7 cards on the ground. Nickname sits above both forms (Enter in it does nothing);
 * Create and Join are two `--panel` cards, Join with the large code field (`TextField size="lg"`).
 */

import type { ReactElement, SyntheticEvent } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { Button } from '../../ui/primitives/button';
import { CHROME_SHAPE_CLASS } from '../../ui/primitives/chrome-classes';
import { TextField } from '../../ui/primitives/text-field';
import { INVITE_CODE_LENGTH } from '../lobby/invite-link';
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

const CARD_CLASS = `${CHROME_SHAPE_CLASS} flex flex-col gap-3 bg-v7-panel p-4`;

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

      <div className="mt-6 flex flex-col gap-4">
        <NicknameField value={nickname} disabled={busy} onChange={onNicknameChange} />

        <form onSubmit={onCreateSubmit} className={CARD_CLASS}>
          <h2 className="font-v7-display text-v7-title leading-none text-v7-text">Create a game</h2>
          <p className="font-v7-body text-v7-body text-v7-text-2">{ONLINE_CREATE_HELPER}</p>
          <Button type="submit" variant="primary" disabled={!canSubmit} className="self-start">
            Create
          </Button>
        </form>

        <form onSubmit={onJoinSubmit} className={CARD_CLASS}>
          <h2 className="font-v7-display text-v7-title leading-none text-v7-text">Join a game</h2>
          <TextField
            label="Game code"
            size="lg"
            value={joinCode}
            maxLength={INVITE_CODE_LENGTH}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABCDEF"
            disabled={busy}
            onChange={(event) => {
              onJoinCodeChange(event.currentTarget.value.toUpperCase());
            }}
          />
          <Button type="submit" variant="primary" disabled={!canJoin} className="self-start">
            Join
          </Button>
        </form>
      </div>
    </div>
  );
}
