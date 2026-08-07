/**
 * Home screen — hub → Online / Solo paths; optional How to play (never a start gate).
 * Intents unchanged: create / join / solo = create + N× addBot + startGame (L17-01).
 */

import { BOT_DIFFICULTIES, PROTOCOL_VERSION, type BotDifficulty } from '@card-battle/shared';
import { motion } from 'motion/react';
import { useState, type ReactElement, type SyntheticEvent } from 'react';

import { formatBotDifficulty } from '../bots/format-bot-difficulty';
import { getCardArtUrl, getCardBackUrl, getKitPortraitUrl } from '../design/asset-lookup';
import { Button } from '../design/components/button';
import type { RoomConnectionStatus } from '../net/use-room-connection';
import { HowToPlayDialog } from './how-to-play-dialog';
import { STATUS_LABELS } from './status-labels';

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
  onStartSolo: (opponentCount: 1 | 2 | 3, difficulty: BotDifficulty) => void;
}

type HomeMode = 'hub' | 'online' | 'solo';

const inputClassName = [
  'mt-1.5 block w-full min-h-11 rounded-[length:var(--radius-control)]',
  'border border-border bg-surface-raised px-3 py-2 font-sans text-base text-ink',
  'placeholder:text-ink-muted/70',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
].join(' ');

const OPPONENT_COUNTS = [1, 2, 3] as const;

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
}: HomeScreenProps): ReactElement {
  const [mode, setMode] = useState<HomeMode>('hub');
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [soloOpponents, setSoloOpponents] = useState<1 | 2 | 3>(1);
  const [soloDifficulty, setSoloDifficulty] = useState<BotDifficulty>('normal');

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
      onStartSolo(soloOpponents, soloDifficulty);
    }
  };

  const goHub = (): void => {
    if (!busy) {
      setMode('hub');
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-surface font-sans text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,var(--color-surface-kit)_0%,transparent_55%),radial-gradient(ellipse_at_90%_20%,var(--color-slate-soft)_0%,transparent_45%)]"
      />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-5xl gap-8 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-12 md:px-8 md:py-12">
        <section className="order-2 md:order-1">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {mode === 'hub' ? (
              <HubView
                status={status}
                error={error}
                soloLaunchPending={soloLaunchPending}
                busy={busy}
                onOpenHowToPlay={() => {
                  setHowToPlayOpen(true);
                }}
                onChooseOnline={() => {
                  setMode('online');
                }}
                onChooseSolo={() => {
                  setMode('solo');
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
                onBack={goHub}
                onNicknameChange={onNicknameChange}
                onSoloOpponentsChange={setSoloOpponents}
                onSoloDifficultyChange={setSoloDifficulty}
                onSoloSubmit={onSoloSubmit}
              />
            ) : null}
          </motion.div>
        </section>

        <HomeArt />
      </div>

      <HowToPlayDialog
        open={howToPlayOpen}
        onClose={() => {
          setHowToPlayOpen(false);
        }}
      />
    </main>
  );
}

interface HubViewProps {
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
  busy: boolean;
  onOpenHowToPlay: () => void;
  onChooseOnline: () => void;
  onChooseSolo: () => void;
}

function HubView({
  status,
  error,
  soloLaunchPending,
  busy,
  onOpenHowToPlay,
  onChooseOnline,
  onChooseSolo,
}: HubViewProps): ReactElement {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
        Turn-based card battle
      </p>
      <h1 className="mt-2 font-sans text-4xl font-semibold tracking-tight text-ink md:text-5xl">
        Card Battle
      </h1>
      <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-ink-muted">
        Bluff and react under delayed resolution — attacks hit on your opponent’s turn, after
        they have played.
      </p>
      <p className="mt-4 text-xs text-ink-muted">Protocol v{PROTOCOL_VERSION}</p>
      <StatusBlock
        status={status}
        error={error}
        soloLaunchPending={soloLaunchPending}
      />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="green" disabled={busy} onClick={onChooseOnline}>
          Play online
        </Button>
        <Button type="button" variant="green" disabled={busy} onClick={onChooseSolo}>
          Play solo
        </Button>
        <Button type="button" variant="orange" disabled={busy} onClick={onOpenHowToPlay}>
          How to play
        </Button>
      </div>

      <p className="mt-6 max-w-[42ch] text-sm leading-relaxed text-ink-muted">
        New here? Open How to play once, then pick Online for friends or Solo against bots.
      </p>
    </div>
  );
}

interface OnlinePathProps {
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
}

function OnlinePath({
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
            Host gets a code to share. Start from the lobby when everyone is seated.
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
              className={inputClassName}
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

interface SoloPathProps {
  nickname: string;
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
  busy: boolean;
  canSubmit: boolean;
  soloOpponents: 1 | 2 | 3;
  soloDifficulty: BotDifficulty;
  onBack: () => void;
  onNicknameChange: (value: string) => void;
  onSoloOpponentsChange: (count: 1 | 2 | 3) => void;
  onSoloDifficultyChange: (difficulty: BotDifficulty) => void;
  onSoloSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
}

function SoloPath({
  nickname,
  status,
  error,
  soloLaunchPending,
  busy,
  canSubmit,
  soloOpponents,
  soloDifficulty,
  onBack,
  onNicknameChange,
  onSoloOpponentsChange,
  onSoloDifficultyChange,
  onSoloSubmit,
}: SoloPathProps): ReactElement {
  return (
    <div>
      <PathHeader
        title="Play solo"
        subtitle="Fight bots immediately — no lobby, same rules as online."
        status={status}
        error={error}
        soloLaunchPending={soloLaunchPending}
        onBack={onBack}
        backDisabled={busy}
      />

      <form onSubmit={onSoloSubmit} className="mt-8 space-y-6">
        <NicknameField
          value={nickname}
          disabled={busy}
          onChange={onNicknameChange}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Opponents</legend>
          <div className="flex flex-wrap gap-2">
            {OPPONENT_COUNTS.map((count) => (
              <Button
                key={count}
                type="button"
                variant={soloOpponents === count ? 'green' : 'orange'}
                disabled={busy}
                onClick={() => {
                  onSoloOpponentsChange(count);
                }}
              >
                {count}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Difficulty</legend>
          <div className="flex flex-wrap gap-2">
            {BOT_DIFFICULTIES.map((tier) => (
              <Button
                key={tier}
                type="button"
                variant={soloDifficulty === tier ? 'green' : 'orange'}
                disabled={busy}
                onClick={() => {
                  onSoloDifficultyChange(tier);
                }}
              >
                {formatBotDifficulty(tier)}
              </Button>
            ))}
          </div>
        </fieldset>

        <Button type="submit" variant="green" disabled={!canSubmit}>
          Start solo game
        </Button>
      </form>
    </div>
  );
}

interface PathHeaderProps {
  title: string;
  subtitle: string;
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
  onBack: () => void;
  backDisabled: boolean;
}

function PathHeader({
  title,
  subtitle,
  status,
  error,
  soloLaunchPending,
  onBack,
  backDisabled,
}: PathHeaderProps): ReactElement {
  return (
    <div>
      <Button type="button" variant="orange" disabled={backDisabled} onClick={onBack}>
        Back
      </Button>
      <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
        Card Battle
      </p>
      <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-ink-muted">{subtitle}</p>
      <StatusBlock
        status={status}
        error={error}
        soloLaunchPending={soloLaunchPending}
      />
    </div>
  );
}

interface NicknameFieldProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

function NicknameField({ value, disabled, onChange }: NicknameFieldProps): ReactElement {
  return (
    <label className="block text-sm font-medium text-ink">
      Nickname
      <input
        className={inputClassName}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        maxLength={24}
        autoComplete="nickname"
        placeholder="Your name"
        disabled={disabled}
      />
    </label>
  );
}

interface StatusBlockProps {
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
}

function StatusBlock({ status, error, soloLaunchPending }: StatusBlockProps): ReactElement {
  return (
    <>
      <p className="mt-4 text-sm text-ink-muted">
        {soloLaunchPending ? 'Starting solo game…' : STATUS_LABELS[status]}
      </p>
      {error !== null && (
        <p className="mt-2 text-sm font-medium text-cta-red" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function HomeArt(): ReactElement {
  return (
    <aside aria-hidden className="order-1 flex items-center justify-center md:order-2">
      <div className="relative h-64 w-full max-w-sm md:h-80">
        <img
          src={getCardBackUrl('attack')}
          alt=""
          className="absolute left-2 top-6 w-28 rotate-[-12deg] rounded-[length:var(--radius-card)] border border-border shadow-md md:w-36"
          draggable={false}
        />
        <img
          src={getCardArtUrl('basic-attack', { isUpgraded: false })}
          alt=""
          className="absolute left-1/2 top-0 w-32 -translate-x-1/2 rotate-[4deg] rounded-[length:var(--radius-card)] border border-border shadow-lg md:w-40"
          draggable={false}
        />
        <img
          src={getCardArtUrl('mirror', { isUpgraded: false })}
          alt=""
          className="absolute right-2 top-10 w-28 rotate-[14deg] rounded-[length:var(--radius-card)] border border-border shadow-md md:w-36"
          draggable={false}
        />
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
          <img
            src={getKitPortraitUrl('untouchable')}
            alt=""
            className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
            draggable={false}
          />
          <img
            src={getKitPortraitUrl('assassin')}
            alt=""
            className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
            draggable={false}
          />
          <img
            src={getKitPortraitUrl('scientific')}
            alt=""
            className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
            draggable={false}
          />
          <img
            src={getKitPortraitUrl('kamikaze')}
            alt=""
            className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
            draggable={false}
          />
        </div>
      </div>
    </aside>
  );
}
