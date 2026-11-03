/** Home path header: Back, Feedback, title, status (PathHeader): technical spec v7 §7.1; L47-03, L51-03. */

import type { ReactElement } from 'react';

import { Button } from '../../design/components/button';
import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { HomeStatus } from './home-status';

export interface PathHeaderProps {
  title: string;
  subtitle: string;
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
  onBack: () => void;
  backDisabled: boolean;
  onOpenFeedback: () => void;
}

export function PathHeader({
  title,
  subtitle,
  status,
  error,
  soloLaunchPending,
  onBack,
  backDisabled,
  onOpenFeedback,
}: PathHeaderProps): ReactElement {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="orange" disabled={backDisabled} onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="orange" disabled={backDisabled} onClick={onOpenFeedback}>
          Feedback
        </Button>
      </div>
      <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
        Card Battle
      </p>
      <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-ink-muted">{subtitle}</p>
      <HomeStatus
        status={status}
        error={error}
        soloLaunchPending={soloLaunchPending}
      />
    </div>
  );
}
