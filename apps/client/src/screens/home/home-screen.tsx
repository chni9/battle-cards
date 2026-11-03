/**
 * Home screen — hub → Online / Solo paths; How to play primer + first-play
 * soft gate (L42-02); What’s new (L63-07).
 * Intents unchanged: create / join / solo = create + N× addBot + startGame (L17-01).
 * L76-01: split by component; every Home state lives here (path components are stateless).
 */

import {
  allowedKitIds,
  type BotDifficulty,
  type LobbyKitSelection,
  type LobbyRules,
  type SoloOpponentCount,
  type WhatsNewScope,
} from '@card-battle/shared';
import { motion } from 'motion/react';
import { useEffect, useState, type ReactElement, type SyntheticEvent } from 'react';

import { Button } from '../../design/components/button';
import { FeedbackDialog } from '../../feedback/feedback-dialog';
import type { RoomConnectionStatus } from '../../net/use-room-connection';
import {
  hasSeenHowToPlay,
  markHowToPlaySeen,
  type HowToPlayContinueTarget,
} from '../../ui/help-storage';
import { hasUnseenReleaseNotes, markLatestReleaseSeen } from '../../ui/release-storage';
import { HowToPlayDialog, type HowToPlayCloseReason } from '../how-to-play-dialog';
import { LobbyKitPickerDialog } from '../lobby-kit-picker-dialog';
import type { SoloMenuSeed } from '../solo-menu-seed';
import { WhatsNewDialog } from '../whats-new-dialog';
import { BetaCard, HomeArt } from './home-art';
import { howToPlayCloseOutcome } from './home-gate';
import { HomeHub } from './home-hub';
import { whatsNewAutoScope, type WhatsNewAutoTrigger } from './home-whats-new';
import { OnlinePath } from './online-path';
import { SoloPath } from './solo-path';
import {
  applySoloRulesChange,
  initialSoloRulesState,
  soloLaunchKitSelection,
  type SoloRulesState,
} from './solo-rules-state';
import { TutorialPath } from './tutorial-path';

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
}

type HomeMode = 'hub' | 'online' | 'solo' | 'tutorial';

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
}: HomeScreenProps): ReactElement {
  const [mode, setMode] = useState<HomeMode>(soloMenuSeed !== undefined ? 'solo' : 'hub');
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [whatsNewScope, setWhatsNewScope] = useState<WhatsNewScope>('current');
  const [whatsNewOpen, setWhatsNewOpen] = useState(
    () => whatsNewAutoScope('mount', hasUnseenReleaseNotes()) !== null,
  );
  const [whatsNewUnread, setWhatsNewUnread] = useState(() => hasUnseenReleaseNotes());
  const [pendingTarget, setPendingTarget] = useState<HowToPlayContinueTarget | null>(null);
  const [soloOpponents, setSoloOpponents] = useState<SoloOpponentCount>(
    soloMenuSeed?.opponentCount ?? 1,
  );
  const [soloDifficulty, setSoloDifficulty] = useState<BotDifficulty>(
    soloMenuSeed?.difficulty ?? 'normal',
  );
  const [solo, setSolo] = useState<SoloRulesState>(() => initialSoloRulesState(soloMenuSeed));
  const [kitPickerOpen, setKitPickerOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    if (soloMenuSeed !== undefined) {
      onSoloMenuSeedApplied?.();
    }
  }, [onSoloMenuSeedApplied, soloMenuSeed]);

  const busy = status === 'connecting' || soloLaunchPending;
  const canSubmit = nickname.trim().length > 0 && !busy;
  const canJoin = canSubmit && joinCode.trim().length === 6;

  const onCreateSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canSubmit) {
      onCreate();
    }
  };

  const onJoinSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canJoin) {
      onJoin();
    }
  };

  const onSoloSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canSubmit) {
      onStartSolo(soloOpponents, soloDifficulty, soloLaunchKitSelection(solo), {
        lobbyRules: solo.rules,
        includeTurnTime: solo.includeTurnTime,
      });
    }
  };

  const onTutorialSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (canSubmit) {
      onStartTutorial();
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
    <main className="relative h-full min-h-full overflow-y-auto overscroll-contain bg-surface font-sans text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,var(--color-surface-kit)_0%,transparent_55%),radial-gradient(ellipse_at_90%_20%,var(--color-slate-soft)_0%,transparent_45%)]"
      />

      <BetaCard />
      <Button
        type="button"
        variant="green"
        compact
        data-whats-new-button
        aria-label={whatsNewUnread ? "What's new (unread)" : "What's new"}
        onClick={() => {
          setWhatsNewScope('history');
          setWhatsNewOpen(true);
        }}
        className="absolute right-[5.75rem] top-4 z-10 min-w-9 sm:right-28 sm:top-6"
      >
        New
        {whatsNewUnread ? (
          <span
            data-whats-new-unread
            aria-hidden
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-cta-red"
          />
        ) : null}
      </Button>

      <div className="relative mx-auto grid min-h-full max-w-5xl gap-8 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-12 md:px-8 md:py-12">
        <section className="order-2 md:order-1">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
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
                onSoloRulesChange={(next, turnTimeChanged) => {
                  setSolo((current) => applySoloRulesChange(current, next, turnTimeChanged));
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

        <HomeArt />
      </div>

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
      <LobbyKitPickerDialog
        open={kitPickerOpen}
        current={solo.kitSelection}
        allowedKitIds={allowedKitIds(solo.rules)}
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
