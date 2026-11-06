/**
 * Phase router — Home / Lobby / Table / End / Admin.
 * Conventions: docs/agent/frontend.md · technical spec v2 §6 · L17-01 solo skip-lobby.
 * Admin is pathname `/admin` (Lot 61); `/inbox` redirects to `/admin/feedback`.
 * `/dev/ui` is the DEV-only V7 component gallery (technical spec v7 §4.2): it is lazily
 * imported behind `import.meta.env.DEV`, so production builds carry no gallery chunk.
 * The playing and finished tables are the V7 arena (`screens/arena/`), tutorial rooms included; `?ui=` is
 * ignored and the retired switch key is cleared at boot (technical spec v7 §4.4, L75-09).
 * `?code=` pre-fills Join and opens Online once (L76-17).
 */

import { defaultLobbyRules } from '@card-battle/shared';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { isDevUiRoute } from './dev/dev-ui-route';
import { useRoomConnection } from './net/use-room-connection';
import { AdminApp } from './screens/admin/admin-app';
import { ArenaScreen, type ArenaScreenProps } from './screens/arena/arena-screen';
import { forgetChatSeen } from './screens/arena/chat-unread-store';
import { ClaimSeatDialog } from './screens/claim-seat-dialog';
import { claimStayLabel, shouldShowClaimPicker } from './screens/claim-seat';
import { EndScreen } from './screens/end';
import { HomeScreen } from './screens/home/home-screen';
import { parseInviteCode, searchWithoutInviteCode } from './screens/lobby/invite-link';
import { LobbyScreen } from './screens/lobby/lobby-screen';
import { shouldClearRejectOnPhaseChange } from './screens/reject-phase';
import { soloMenuSeed, type SoloMenuSeed } from './screens/solo-menu-seed';
import { STATUS_LABELS } from './screens/status-labels';
import { browserRemovableStorage, clearRetiredTableSwitch } from './retired-table-switch';
import { cachedLobbyRules } from './view-model/rules-recall';

const UiGallery = import.meta.env.DEV
  ? lazy(async () => ({ default: (await import('./dev/ui-gallery')).UiGallery }))
  : null;

export function App() {
  const path = window.location.pathname;
  if (path === '/inbox' || path.startsWith('/inbox/')) {
    window.location.replace('/admin/feedback');
    return null;
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <AdminApp />;
  }
  if (isDevUiRoute(path, import.meta.env.DEV) && UiGallery !== null) {
    return (
      <Suspense fallback={null}>
        <UiGallery />
      </Suspense>
    );
  }
  return <GameApp />;
}

function GameApp() {
  const connection = useRoomConnection();
  const {
    status,
    view,
    error,
    actionReject,
    soloLaunchPending,
    createGame,
    joinGame,
    leaveGame,
    forfeit,
    clearActionReject,
    startGame,
    startSoloGame,
    startTutorialGame,
    addBot,
    kickPlayer,
    setReady,
    playAgain,
    claimSeat,
    staySpectating,
    setBotDifficulty,
    chooseKit,
    setLobbyRules,
    sendChat,
    drawCard,
    playCard,
    playMultipleAttacks,
    resolveSubChoice,
    buyCard,
    sellCard,
    upgradeCard,
    buyUpgradePoint,
    buySpecialCard,
    buyPoolCard,
    clearSpy,
    sellUpgradePoint,
    deactivatePersistent,
    activateDuplication,
    lastTurnStarted,
    lastActionResolved,
    subChoice,
    lobbyRules,
  } = connection;
  // `lobbyRules` is this room's last lobby rules (L74-21, spec v7 §6.10, §6.11): the playing view
  // carries none. The connection keeps them per STATE_UPDATE, and every leave resets them (L74-26).
  const leave = (): void => {
    void leaveGame();
  };
  const [nickname, setNickname] = useState('');
  // Invite link (spec v7 §7.1, §7.2; L76-17): `?code=` is read once, at mount, and seeds Join. `/admin` and
  // `/dev/ui` return before GameApp, so they never read it. The effect below strips it from the URL, so a
  // reload or Back does not open it again.
  const [inviteCode] = useState(() => parseInviteCode(window.location.search));
  // Home opens on Online only until the first room view, so a Leave or a kick lands on the hub (parity
  // `home-online-path`). "Adjust state while rendering", as the phase-change clear below.
  const [inviteOpensOnline, setInviteOpensOnline] = useState(inviteCode !== null);
  if (inviteOpensOnline && view !== null) {
    setInviteOpensOnline(false);
  }
  const [joinCode, setJoinCode] = useState(inviteCode ?? '');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [claimDismissedKey, setClaimDismissedKey] = useState<string | null>(null);
  const [pendingSoloMenu, setPendingSoloMenu] = useState<SoloMenuSeed | null>(null);

  // A reject belongs to the screen it arrived on (spec v7 §7.2, Q26/Q29; A.9 ruling 7; supersedes the
  // L39 carry-over across phases): a change between two view phases clears it, and a change to or from
  // Home never does, so a kick or a solo-launch failure still shows there. React's "adjust state while
  // rendering" pattern (as `screens/arena/top-bar.tsx`): it runs before the next screen commits, so no
  // dialog or toast mounts with the old reject, and it only updates GameApp's own state (the hook runs here).
  const viewPhase = view?.phase ?? null;
  const [renderedPhase, setRenderedPhase] = useState(viewPhase);
  if (renderedPhase !== viewPhase) {
    setRenderedPhase(viewPhase);
    if (shouldClearRejectOnPhaseChange(renderedPhase, viewPhase)) {
      clearActionReject();
    }
  }

  const claimableSeats = view?.claimableSeats ?? [];
  const claimableKey = claimableSeats.map((seat) => seat.playerId).join('|');
  const walkInSpectator = view?.isSpectator === true;
  const youAreHost = view?.phase === 'lobby' && view.hostPlayerId === view.you;
  const showClaimPicker =
    view !== null &&
    shouldShowClaimPicker({
      claimableCount: claimableSeats.length,
      isSpectator: walkInSpectator,
      phase: view.phase,
      youAreHost,
    }) &&
    claimDismissedKey !== claimableKey;
  const claimPlayerIds = useMemo(
    () => (view === null ? [] : view.players.map((player) => player.id)),
    [view],
  );

  // A room back in its lobby starts its next match with the chat lines it holds already seen (V7 arena,
  // `chat-unread-store.ts`, L74-16 carry-forward). An effect, so it runs once the lobby has rendered and
  // no arena is mounted: a mounted arena hook would seed the count again at once. Keyed on the phase
  // and the code, so every return to the lobby, Play again included, forgets it once.
  const lobbyGameCode = view?.phase === 'lobby' ? view.gameCode : null;
  useEffect(() => {
    if (lobbyGameCode !== null) {
      forgetChatSeen(lobbyGameCode);
    }
  }, [lobbyGameCode]);

  // Once per page load (spec v7 §4.4, L75-09): the retired opt-in key is cleared, and `?ui=` is never read.
  useEffect(() => {
    clearRetiredTableSwitch(browserRemovableStorage());
  }, []);

  useEffect(() => {
    if (inviteCode === null) {
      return;
    }
    const { pathname, search, hash } = window.location;
    window.history.replaceState(window.history.state, '', `${pathname}${searchWithoutInviteCode(search)}${hash}`);
  }, [inviteCode]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  const claimDialog =
    view !== null && showClaimPicker ? (
      <ClaimSeatDialog
        open
        seats={claimableSeats}
        playerIds={claimPlayerIds}
        stayLabel={claimStayLabel({
          isSpectator: walkInSpectator,
          phase: view.phase,
        })}
        {...(view.phase === 'lobby' ? { hostPlayerId: view.hostPlayerId } : {})}
        locked={status === 'reconnecting'}
        onClaim={(playerId) => {
          claimSeat(playerId);
        }}
        onStay={() => {
          if (walkInSpectator) {
            staySpectating();
          }
          setClaimDismissedKey(claimableKey);
        }}
      />
    ) : null;

  if (view?.phase === 'finished') {
    return (
      <>
        <EndScreen
          view={view}
          actionReject={actionReject}
          onDismissActionReject={clearActionReject}
          statusLabel={STATUS_LABELS[status]}
          connectionStatus={status}
          nowMs={nowMs}
          onLeave={leave}
          {...(view.playKind === 'classic' && !walkInSpectator
            ? {
                onPlayAgain: () => {
                  // One human seat reopens the solo menu. Two humans reform the lobby.
                  const seed = soloMenuSeed({
                    playKind: view.playKind,
                    ...(view.isSpectator === true ? { isSpectator: true as const } : {}),
                    players: view.players,
                    kitId: view.finalTable.self.kitId,
                    lobbyRules: view.lobbyRules ?? defaultLobbyRules(),
                  });
                  if (seed !== null) {
                    setPendingSoloMenu(seed);
                    leave();
                    return;
                  }
                  playAgain();
                },
              }
            : {})}
        />
        {claimDialog}
      </>
    );
  }

  if (view?.phase === 'playing') {
    const boardProps: ArenaScreenProps = {
      view,
      actionReject,
      onDismissActionReject: clearActionReject,
      statusLabel: STATUS_LABELS[status],
      nowMs,
      deadlineMs: lastTurnStarted?.deadlineMs ?? view.turnDeadlineMs,
      lastActionResolved,
      subChoice,
      onDraw: drawCard,
      onPlayCard: playCard,
      onPlayMultipleAttacks: playMultipleAttacks,
      onResolveSubChoice: resolveSubChoice,
      onBuyCard: buyCard,
      onSellCard: sellCard,
      onUpgradeCard: upgradeCard,
      onBuyUpgradePoint: buyUpgradePoint,
      onBuySpecialCard: buySpecialCard,
      onBuyPoolCard: buyPoolCard,
      onClearSpy: clearSpy,
      onSellUpgradePoint: sellUpgradePoint,
      onDeactivatePersistent: deactivatePersistent,
      onActivateDuplication: activateDuplication,
      onLeave: leave,
      onForfeit: forfeit,
      onSendChat: sendChat,
      lastTurnStarted,
      cachedLobbyRules: cachedLobbyRules(lobbyRules, view),
      // The raw status (L74-25, §6.12): the arena's Reconnecting… banner and its game-input lock.
      connectionStatus: status,
    };
    return (
      <>
        <ArenaScreen
          {...boardProps}
          // Claim a seat (L74-23, §7.2, Q24): a walk-in only, while seats are claimable, as V2's
          // `shouldShowClaimPicker`. A null dismissed key shows the picker again beside the board.
          {...(walkInSpectator && claimableSeats.length > 0
            ? {
                onReopenClaim: () => {
                  setClaimDismissedKey(null);
                },
              }
            : {})}
        />
        {claimDialog}
      </>
    );
  }

  if (view?.phase === 'lobby' && !soloLaunchPending) {
    return (
      <>
        <LobbyScreen
          view={view}
          status={status}
          error={error}
          onDismissError={clearActionReject}
          onStart={startGame}
          onLeave={leave}
          onAddBot={addBot}
          onKickPlayer={kickPlayer}
          onSetReady={setReady}
          onSetBotDifficulty={setBotDifficulty}
          onChooseKit={chooseKit}
          onSetLobbyRules={setLobbyRules}
          onSendChat={sendChat}
          // Claim a seat (L76-16, §7.2, Q24, A.9 ruling 9): a walk-in only, while seats are claimable,
          // as the arena (L74-23). A null dismissed key shows the picker again for the same set.
          {...(walkInSpectator && claimableSeats.length > 0
            ? {
                onReopenClaim: () => {
                  setClaimDismissedKey(null);
                },
              }
            : {})}
        />
        {claimDialog}
      </>
    );
  }

  return (
    <HomeScreen
      nickname={nickname}
      joinCode={joinCode}
      status={status}
      error={error}
      soloLaunchPending={soloLaunchPending}
      onNicknameChange={setNickname}
      onJoinCodeChange={setJoinCode}
      onCreate={() => {
        void createGame(nickname);
      }}
      onJoin={() => {
        void joinGame(joinCode, nickname);
      }}
      onStartSolo={(opponentCount, difficulty, kitSelection, rules) => {
        void startSoloGame({
          nickname,
          opponentCount,
          difficulty,
          kitSelection,
          lobbyRules: rules.lobbyRules,
          includeTurnTime: rules.includeTurnTime,
        });
      }}
      onStartTutorial={() => {
        void startTutorialGame(nickname);
      }}
      {...(pendingSoloMenu !== null
        ? {
            soloMenuSeed: pendingSoloMenu,
            onSoloMenuSeedApplied: () => {
              setPendingSoloMenu(null);
            },
          }
        : {})}
      {...(inviteOpensOnline ? { openOnline: true as const } : {})}
    />
  );
}
