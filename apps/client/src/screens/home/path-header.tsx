/**
 * Home path header: Back, Feedback, title, status (PathHeader): technical spec v7 §7.1; Appendix A
 * `home-path-header`; L47-03, L51-03. L76-04: quiet V7 Back and Feedback (both disabled while busy),
 * the 'Card Battle' eyebrow, the path title in Display, the subtitle and `HomeStatus`.
 */

import type { ReactElement } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { Button } from '../../ui/primitives/button';
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
    <header className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Button variant="quiet" icon="chevron-left" disabled={backDisabled} onClick={onBack}>
          Back
        </Button>
        <Button variant="quiet" icon="feedback" disabled={backDisabled} onClick={onOpenFeedback}>
          Feedback
        </Button>
      </div>
      <p className="mt-4 font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.14em] text-v7-text-2">
        Card Battle
      </p>
      <h1 className="font-v7-display text-v7-display leading-none text-v7-text">{title}</h1>
      <p className="max-w-[40ch] font-v7-body text-v7-body text-v7-text-2">{subtitle}</p>
      <HomeStatus status={status} error={error} soloLaunchPending={soloLaunchPending} />
    </header>
  );
}
