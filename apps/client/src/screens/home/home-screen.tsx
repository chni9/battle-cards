/**
 * Home screen — hub → Online / Solo paths; How to play primer + first-play
 * soft gate (L42-02); What’s new (L63-07).
 * Intents unchanged: create / join / solo = create + N× addBot + startGame (L17-01).
 * L76-01: split by component; every Home state lives here (path components are stateless).
 * L76-04 (technical spec v7 §5.1, §7.1, §11 Q7/Q8): the V7 ground; a top-right row with Beta and
 * New on every mode (New disabled only while a solo game launches); the mode root fades and rises
 * through `motionPropsFor`, a fade only under reduced motion.
 * L76-08 (Part 2 Review Focus 3): Create, Join and Start tutorial launch once per connection state
 * through `useLaunchOnce`; Start solo game joins them in L76-11.
 * L76-17 (spec v7 §7.1): an invite link (`openOnline`) enters Online at mount, through the How to
 * play soft gate (`homeMountEntry`).
 */

import {
  type BotDifficulty,
  type LobbyKitSelection,
  type LobbyRules,
  type SoloOpponentCount,
  type WhatsNewScope,
} from '@card-battle/shared';
import { motion } from 'motion/react';
import { useEffect, useState, type ReactElement, type SyntheticEvent } from 'react';

import { FeedbackDialog } from '../../feedback/feedback-dialog';
import type { RoomConnectionStatus } from '../../net/use-room-connection';
import {
  hasSeenHowToPlay,
  markHowToPlaySeen,
  type HowToPlayContinueTarget,
} from '../../ui/help-storage';
import { durationS, EASE_ENTRANCE } from '../../ui/motion/motion-tokens';
import { motionPropsFor, type V7MotionSpec } from '../../ui/motion/reduced-motion';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { motionAttribute } from '../../ui/primitives/chrome-classes';
import { hasUnseenReleaseNotes, markLatestReleaseSeen } from '../../ui/release-storage';
import { HowToPlayDialog, type HowToPlayCloseReason } from '../how-to-play-dialog';
import { KitPickerSheet } from '../lobby/kit-picker-sheet';
import type { SoloMenuSeed } from '../solo-menu-seed';
import { WhatsNewDialog } from '../whats-new-dialog';
import { BetaCard } from './home-art';
import { homeMountEntry, howToPlayCloseOutcome } from './home-gate';
import { HomeHub } from './home-hub';
import { whatsNewAutoScope, type WhatsNewAutoTrigger } from './home-whats-new';
import { OnlinePath } from './online-path';
import { SoloPath } from './solo-path';
import {
  applySoloRulesPayload,
  initialSoloRulesState,
  soloLaunchKitSelection,
  type SoloRulesState,
} from './solo-rules-state';
import { TutorialPath } from './tutorial-path';
import { useLaunchOnce } from './use-launch-once';
import { WhatsNewControl } from './whats-new-control';

export interface HomeScreenProps {
  nickname: string;
  joinCode: string;
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
  onNicknameChange: (value: string) => void;
  onJoinCodeChange: (value: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onStartSolo: (
    opponentCount: SoloOpponentCount,
    difficulty: BotDifficulty,
    kitSelection: LobbyKitSelection,
    rules: { lobbyRules: LobbyRules; includeTurnTime: boolean },
  ) => void;
  onStartTutorial: () => void;
  /** Finished solo match: open this menu instead of dealing immediately. */
  soloMenuSeed?: SoloMenuSeed;
  onSoloMenuSeedApplied?: () => void;
  /** Invite link (L76-17, spec v7 §7.1): enter Online at mount, through the How to play soft gate. App passes it until the first room view. */
  openOnline?: true;
}

type HomeMode = 'hub' | 'online' | 'solo' | 'tutorial';

/** The mode switch (§11 Q7): a fade and a short rise; `motionPropsFor` keeps the fade only when reduced. */
const HOME_MODE_MOTION: V7MotionSpec = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: durationS('base'), ease: EASE_ENTRANCE },
};

export function HomeScreen({
  nickname,
  joinCode,
  status,
  error,
  soloLaunchPending,
  onNicknameChange,
  onJoinCodeChange,
  onCreate,
  onJoin,
  onStartSolo,
  onStartTutorial,
  soloMenuSeed,
  onSoloMenuSeedApplied,
  openOnline,
}: HomeScreenProps): ReactElement {
  // The seed and the invite are read only at mount (gotcha 2): a later prop change moves nothing.
  const [entry] = useState(() =>
    homeMountEntry({
      soloSeed: soloMenuSeed !== undefined,
      openOnline: openOnline === true,
      howToPlaySeen: hasSeenHowToPlay(),
    }),
  );
  const [mode, setMode] = useState<HomeMode>(entry.mode);
  const [howToPlayOpen, setHowToPlayOpen] = useState(entry.gatedTarget !== null);
  const [whatsNewScope, setWhatsNewScope] = useState<WhatsNewScope>('current');
  const [whatsNewOpen, setWhatsNewOpen] = useState(
    () => whatsNewAutoScope('mount', hasUnseenReleaseNotes()) !== null,
  );
  const [whatsNewUnread, setWhatsNewUnread] = useState(() => hasUnseenReleaseNotes());
  const [pendingTarget, setPendingTarget] = useState<HowToPlayContinueTarget | null>(entry.gatedTarget);
  const [soloOpponents, setSoloOpponents] = useState<SoloOpponentCount>(
    soloMenuSeed?.opponentCount ?? 1,
  );
  const [soloDifficulty, setSoloDifficulty] = useState<BotDifficulty>(
    soloMenuSeed?.difficulty ?? 'normal',
  );
  const [solo, setSolo] = useState<SoloRulesState>(() => initialSoloRulesState(soloMenuSeed));
  const [kitPickerOpen, setKitPickerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const reduced = usePrefersReducedMotion();
  // Adjust state while rendering: Random only hides the picker (`KitPickerSheet` contract: the caller
  // clears its own flag), so turning it off never reopens it (spec v7 §7.3; as `LobbyKitCard`, L76-11).
  if (solo.rules.randomOnly && kitPickerOpen) setKitPickerOpen(false);

  useEffect(() => {
    if (soloMenuSeed !== undefined) {
      onSoloMenuSeedApplied?.();
    }
  }, [onSoloMenuSeedApplied, soloMenuSeed]);

  const busy = status === 'connecting' || soloLaunchPending;
  const canSubmit = nickname.trim().length > 0 && !busy;
  const canJoin = canSubmit && joinCode.trim().length === 6;
  const launchOnce = useLaunchOnce(status, error, soloLaunchPending);

  const onCreateSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canSubmit) {
      launchOnce('create', onCreate);
    }
  };

  const onJoinSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canJoin) {
      launchOnce('join', onJoin);
    }
  };

  const onSoloSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canSubmit) {
      launchOnce('solo', () => {
        onStartSolo(soloOpponents, soloDifficulty, soloLaunchKitSelection(solo), {
          lobbyRules: solo.rules,
          includeTurnTime: solo.includeTurnTime,
        });
      });
    }
  };

  const onTutorialSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canSubmit) {
      launchOnce('tutorial', onStartTutorial);
    }
  };

  const closeWhatsNew = (): void => {
    markLatestReleaseSeen();
    setWhatsNewUnread(false);
    setWhatsNewOpen(false);
  };

  const openWhatsNewIfDue = (trigger: WhatsNewAutoTrigger): void => {
    const scope = whatsNewAutoScope(trigger, hasUnseenReleaseNotes());
    if (scope === null) {
      return;
    }
    setWhatsNewScope(scope);
    setWhatsNewOpen(true);
  };

  const goHub = (): void => {
    if (!busy) {
      setMode('hub');
      openWhatsNewIfDue('back-to-hub');
    }
  };

  const continueToTarget = (target: HowToPlayContinueTarget): void => {
    switch (target) {
      case 'online':
        setMode('online');
        return;
      case 'solo':
        setMode('solo');
        return;
      case 'tutorial':
        setMode('tutorial');
        return;
    }
  };

  const requestPath = (target: HowToPlayContinueTarget): void => {
    if (hasSeenHowToPlay()) {
      continueToTarget(target);
      return;
    }
    setPendingTarget(target);
    setHowToPlayOpen(true);
  };

  const onHowToPlayClose = (reason: HowToPlayCloseReason): void => {
    const outcome = howToPlayCloseOutcome(pendingTarget, reason);
    if (outcome.markSeen) {
      markHowToPlaySeen(); // before entering the path (L42-02)
    }
    setPendingTarget(null);
    setHowToPlayOpen(false);
    if (outcome.enter !== null) {
      continueToTarget(outcome.enter);
    }
    if (outcome.checkWhatsNew) {
      openWhatsNewIfDue('how-to-play-manual-close');
    }
  };

  return (
    <main className="v7-ground relative h-full overflow-y-auto overscroll-contain font-v7-body text-v7-text">
      <div data-home-corner className="flex items-center justify-end gap-2 px-4 pt-4 sm:px-6">
        <BetaCard />
        <WhatsNewControl
          unread={whatsNewUnread}
          disabled={soloLaunchPending}
          onOpen={() => {
            setWhatsNewScope('history');
            setWhatsNewOpen(true);
          }}
        />
      </div>

      <section className="mx-auto w-full max-w-3xl px-4 pb-10 pt-2 sm:px-6">
        <motion.div
          key={mode}
          data-home-mode={mode}
          data-motion={motionAttribute(reduced)}
          {...motionPropsFor(HOME_MODE_MOTION, reduced)}
        >
          {mode === 'hub' ? (
            <HomeHub
              status={status}
              error={error}
              soloLaunchPending={soloLaunchPending}
              busy={busy}
              onOpenHowToPlay={() => {
                setHowToPlayOpen(true);
              }}
              onOpenFeedback={() => {
                setFeedbackOpen(true);
              }}
              onChooseOnline={() => {
                requestPath('online');
              }}
              onChooseSolo={() => {
                requestPath('solo');
              }}
              onChooseTutorial={() => {
                requestPath('tutorial');
              }}
            />
          ) : null}

          {mode === 'online' ? (
            <OnlinePath
              nickname={nickname}
              joinCode={joinCode}
              status={status}
              error={error}
              busy={busy}
              canSubmit={canSubmit}
              canJoin={canJoin}
              onBack={goHub}
              onNicknameChange={onNicknameChange}
              onJoinCodeChange={onJoinCodeChange}
              onCreateSubmit={onCreateSubmit}
              onJoinSubmit={onJoinSubmit}
              onOpenFeedback={() => {
                setFeedbackOpen(true);
              }}
            />
          ) : null}

          {mode === 'solo' ? (
            <SoloPath
              nickname={nickname}
              status={status}
              error={error}
              soloLaunchPending={soloLaunchPending}
              busy={busy}
              canSubmit={canSubmit}
              soloOpponents={soloOpponents}
              soloDifficulty={soloDifficulty}
              soloKitSelection={solo.kitSelection}
              soloRules={solo.rules}
              rulesEditor={{
                onChange: (payload) => {
                  setSolo((current) => applySoloRulesPayload(current, payload));
                },
                disabled: busy,
                serverDefaultTime: !solo.includeTurnTime,
              }}
              onBack={goHub}
              onNicknameChange={onNicknameChange}
              onSoloOpponentsChange={setSoloOpponents}
              onSoloDifficultyChange={setSoloDifficulty}
              onOpenKitPicker={() => {
                setKitPickerOpen(true);
              }}
              onSoloSubmit={onSoloSubmit}
              onOpenFeedback={() => {
                setFeedbackOpen(true);
              }}
            />
          ) : null}

          {mode === 'tutorial' ? (
            <TutorialPath
              nickname={nickname}
              status={status}
              error={error}
              soloLaunchPending={soloLaunchPending}
              busy={busy}
              canSubmit={canSubmit}
              onBack={goHub}
              onNicknameChange={onNicknameChange}
              onTutorialSubmit={onTutorialSubmit}
              onOpenFeedback={() => {
                setFeedbackOpen(true);
              }}
            />
          ) : null}
        </motion.div>
      </section>

      <HowToPlayDialog open={howToPlayOpen} onClose={onHowToPlayClose} />
      <WhatsNewDialog open={whatsNewOpen} scope={whatsNewScope} onClose={closeWhatsNew} />
      <FeedbackDialog
        open={feedbackOpen}
        mode="manual"
        screen="home"
        nickname={nickname}
        onDismiss={() => {
          setFeedbackOpen(false);
        }}
      />
      <KitPickerSheet
        open={kitPickerOpen}
        current={solo.kitSelection}
        rules={solo.rules}
        disabled={busy}
        onClose={() => {
          setKitPickerOpen(false);
        }}
        onSelect={(selection) => {
          setSolo((current) => ({ ...current, kitSelection: selection }));
        }}
      />
    </main>
  );
}
