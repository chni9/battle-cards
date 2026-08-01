/**
 * Home screen — technical spec v2 §6, L11-01.
 * Branded create/join; same intents and validation as V1.
 */

import { PROTOCOL_VERSION } from '@card-battle/shared';
import { motion } from 'motion/react';
import type { ReactElement, SyntheticEvent } from 'react';

import { getCardArtUrl, getCardBackUrl, getKitPortraitUrl } from '../design/asset-lookup';
import { Button } from '../design/components/button';
import type { RoomConnectionStatus } from '../net/use-room-connection';
import { STATUS_LABELS } from './status-labels';

export interface HomeScreenProps {
  nickname: string;
  joinCode: string;
  status: RoomConnectionStatus;
  error: string | null;
  onNicknameChange: (value: string) => void;
  onJoinCodeChange: (value: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}

const inputClassName = [
  'mt-1.5 block w-full min-h-11 rounded-[length:var(--radius-control)]',
  'border border-border bg-surface-raised px-3 py-2 font-sans text-base text-ink',
  'placeholder:text-ink-muted/70',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
].join(' ');

export function HomeScreen({
  nickname,
  joinCode,
  status,
  error,
  onNicknameChange,
  onJoinCodeChange,
  onCreate,
  onJoin,
}: HomeScreenProps): ReactElement {
  const canSubmit = nickname.trim().length > 0 && status !== 'connecting';
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

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-surface font-sans text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,var(--color-surface-kit)_0%,transparent_55%),radial-gradient(ellipse_at_90%_20%,var(--color-slate-soft)_0%,transparent_45%)]"
      />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-5xl gap-8 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-12 md:px-8 md:py-12">
        <section className="order-2 md:order-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
              Online card battle
            </p>
            <h1 className="mt-2 font-sans text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              Card Battle
            </h1>
            <p className="mt-3 max-w-[36ch] text-base leading-relaxed text-ink-muted">
              Create a room or join with a code. Same rules, sharper table.
            </p>
            <p className="mt-4 text-xs text-ink-muted">Protocol v{PROTOCOL_VERSION}</p>
            <p className="mt-1 text-sm text-ink-muted">{STATUS_LABELS[status]}</p>
            {error !== null && (
              <p className="mt-2 text-sm font-medium text-cta-red" role="alert">
                {error}
              </p>
            )}
          </motion.div>

          <div className="mt-8 space-y-8">
            <label className="block text-sm font-medium text-ink">
              Nickname
              <input
                className={inputClassName}
                value={nickname}
                onChange={(event) => {
                  onNicknameChange(event.target.value);
                }}
                maxLength={24}
                autoComplete="nickname"
                placeholder="Your name"
              />
            </label>

            <form onSubmit={onCreateSubmit} className="space-y-3">
              <h2 className="text-lg font-semibold text-ink">Create a game</h2>
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
                />
              </label>
              <Button type="submit" variant="green" disabled={!canJoin}>
                Join
              </Button>
            </form>
          </div>
        </section>

        <aside
          aria-hidden
          className="order-1 flex items-center justify-center md:order-2"
        >
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
      </div>
    </main>
  );
}
