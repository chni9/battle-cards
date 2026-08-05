import {
  type PlayingStateView,
  type PublicPlayerView,
  type ResolveSubChoicePayload,
  type SubChoiceRequiredPayload,
} from '@card-battle/shared';
import type { ReactElement } from 'react';

import { Dialog } from '../../../design/components/dialog';
import { MirrorPanel } from './mirror-panel';
import { PoolPickPanel } from './pool-pick-panel';
import { ReanimationKitPanel } from './reanimation-kit-panel';
import { RewardPanel } from './reward-panel';
import { SpecialPickPanel } from './special-pick-panel';
import { StealPickPanel } from './steal-pick-panel';

const SUB_CHOICE_COPY: Record<
  SubChoiceRequiredPayload['kind'],
  { title: string; expiryHint: string }
> = {
  mirror: {
    title: 'Mirror redirect',
    expiryHint: 'On expiry: a random eligible redirect',
  },
  'elimination-reward': {
    title: 'Elimination reward',
    expiryHint: 'On expiry: 2×4 lives',
  },
  'steal-pick': {
    title: 'Steal a card',
    expiryHint: 'On expiry: a random eligible card',
  },
  'pool-pick': {
    title: 'Recover from pool',
    expiryHint: 'On expiry: random eligible cards',
  },
  'special-pick': {
    title: 'Choose a special',
    expiryHint: 'On expiry: a random special',
  },
  'reanimation-kit': {
    title: 'Choose a kit',
    expiryHint: 'On expiry: a random kit',
  },
};

export interface SubChoiceHostProps {
  subChoice: SubChoiceRequiredPayload;
  view: PlayingStateView;
  opponents: readonly PublicPlayerView[];
  nowMs: number;
  onResolve: (payload: ResolveSubChoicePayload) => void;
}

function renderKindPanel(
  props: SubChoiceHostProps,
): ReactElement {
  const { subChoice, view, opponents, onResolve } = props;

  switch (subChoice.kind) {
    case 'mirror':
      return (
        <MirrorPanel
          subChoice={subChoice}
          view={view}
          opponents={opponents}
          onResolve={onResolve}
        />
      );
    case 'elimination-reward':
      return (
        <RewardPanel subChoice={subChoice} view={view} onResolve={onResolve} />
      );
    case 'steal-pick':
      return (
        <StealPickPanel
          subChoice={subChoice}
          view={view}
          opponents={opponents}
          onResolve={onResolve}
        />
      );
    case 'pool-pick':
      return (
        <PoolPickPanel subChoice={subChoice} view={view} onResolve={onResolve} />
      );
    case 'special-pick':
      return <SpecialPickPanel subChoice={subChoice} onResolve={onResolve} />;
    case 'reanimation-kit':
      return <ReanimationKitPanel subChoice={subChoice} onResolve={onResolve} />;
    default: {
      const exhaustive: never = subChoice;
      return exhaustive;
    }
  }
}

export function SubChoiceHost(props: SubChoiceHostProps): ReactElement {
  const { subChoice, nowMs } = props;
  const copy = SUB_CHOICE_COPY[subChoice.kind];
  const secondsLeft = Math.max(0, Math.ceil((subChoice.deadlineMs - nowMs) / 1000));

  return (
    <Dialog
      open
      title={copy.title}
      onClose={() => undefined}
      closeOnOverlayClick={false}
      panelClassName="max-w-3xl"
    >
      <p className="text-sm text-ink-muted">
        {copy.expiryHint} · {String(secondsLeft)}s left
      </p>
      <div className="mt-3">{renderKindPanel(props)}</div>
    </Dialog>
  );
}
