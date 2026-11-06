/**
 * Home Tutorial path: nickname and Start tutorial (TutorialPath): technical spec v7 §7.1, §5.2;
 * L45-04, L46-03. L76-08: V7 `TextField` and `Button`; the nickname and the submit share one form,
 * so Enter in the nickname starts the tutorial.
 */

import type { ReactElement, SyntheticEvent } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { Button } from '../../ui/primitives/button';
import { NicknameField } from './nickname-field';
import { PathHeader } from './path-header';

export interface TutorialPathProps {
  nickname: string;
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
  busy: boolean;
  canSubmit: boolean;
  onBack: () => void;
  onNicknameChange: (value: string) => void;
  onTutorialSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onOpenFeedback: () => void;
}

export function TutorialPath({
  nickname,
  status,
  error,
  soloLaunchPending,
  busy,
  canSubmit,
  onBack,
  onNicknameChange,
  onTutorialSubmit,
  onOpenFeedback,
}: TutorialPathProps): ReactElement {
  return (
    <div>
      <PathHeader
        title="Tutorial"
        subtitle="A scripted 1v1 on the real table. Nickname only — kits and bots are chosen for you."
        status={status}
        error={error}
        soloLaunchPending={soloLaunchPending}
        onBack={onBack}
        backDisabled={busy}
        onOpenFeedback={onOpenFeedback}
      />

      <form onSubmit={onTutorialSubmit} className="mt-6 flex flex-col gap-4">
        <NicknameField value={nickname} disabled={busy} onChange={onNicknameChange} />
        <Button type="submit" variant="primary" disabled={!canSubmit} className="self-start">
          Start tutorial
        </Button>
      </form>
    </div>
  );
}
