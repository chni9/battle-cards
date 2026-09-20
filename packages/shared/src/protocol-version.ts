/**
 * Bumped whenever the client/server event contract in technical spec §5.2 / §5.3 changes
 * in a way an older client cannot handle. Client and server compare it on connection.
 *
 * 22 → 23 (backlog L20-18, technical spec v4 §4.4/§5): `subChoiceRequired` /
 * `resolveSubChoice` replace the `mirrorChoiceRequired` / `chooseMirrorTarget` and
 * `rewardChoiceRequired` / `chooseEliminationReward` pairs. Payload shapes are
 * unchanged (each now carries a `kind` discriminant); Mirror and elimination-reward
 * behaviour is unchanged. That was V4's planned single bump (`docs/backlog_v4.md`).
 *
 * 23 → 24 (designer 2026-08-06): `FinishedStateView.finalTable` — a per-recipient
 * `PlayingStateView` snapshot of the finished board so the client can dismiss the
 * stats dialog and keep inspecting the table. Exception to the V4 single-bump lock;
 * see `docs/agent/decisions.md`.
 *
 * 24 → 25 (designer 2026-08-07): Absorber post-elim window + `absorbWindowOpen`.
 *
 * 25 → 26 (designer 2026-08-07): public `curseTransferred` action-log kind
 * when a successful attack passes Curse; Curse is victim-owned.
 *
 * 26 → 27 (L32-01 / table UX polish): `error` payload is
 * `{ code: ActionRejectCode; message: string }` instead of `{ message: string }`.
 *
 * 27 → 28 (L36-04 / #V5-4): `BOT_REASON_CODES` gains `search-best` and
 * `search-fallback`. Public Why panel stays coarse — no visit counts or
 * win-probability numbers in `BotDecisionReason.params`.
 *
 * 28 → 29 (L41-02 / technical spec v6 §8): `playKind` + `tutorialIndex` on
 * playing and finished views; `RoomJoinOptions.tutorial?: true`; client
 * `FORFEIT`; reject codes `tutorial-follow-coach` and `tutorial-room-closed`.
 * Only protocol bump in V6.
 *
 * 29 → 30 (L49-01 / designer 2026-08-23): lobby `chooseKit` + per-recipient
 * `yourKitSelection`. Default remains random. Opponents never receive another
 * seat's lobby kit. Exception to the V6 single-bump lock; see decisions.md.
 *
 * 30 → 31 (L56-03 / designer 2026-09-09): `mirrorRedirected` required
 * `isUpgraded` + post-redirect `damageMultiplier`; Super Mirror redirect lines
 * use the attack `cardId`; new public kind `persistentDeactivated`. Exception
 * to the V6 single-bump lock (same class as L49); see decisions.md.
 *
 * 31 → 32 (L57-07 / designer 2026-09-15): lobby `setReady` / `kickPlayer`,
 * finished `playAgain`, join-by-code `claimSeat` + spectator views
 * (`isSpectator`, `claimableSeats`), `LobbySeatView.isReady`. Exception to
 * the V6 single-bump lock (same class as L49 / L56); see decisions.md.
 *
 * 32 → 33 (L57-16 / designer 2026-09-15): `staySpectating` so a walk-in
 * with an open claim picker does not receive the Spy overlay until Stay
 * or the picker empties. Exception to the V6 single-bump lock (same class
 * as L49 / L56 / L57-07); see decisions.md.
 *
 * 33 → 34 (L58-02 / designer 2026-09-15): `buyPoolCard`, `clearSpy`,
 * `PlayingStateView.poolBuyCost`, `PublicPlayerView.spyingOnYou`, reject
 * codes `empty-pool` / `not-spying-you`. Retargeted from 31 → 32 after
 * Lot 57 landed on main; see decisions.md.
 *
 * 34 → 35 (L60-02 / designer 2026-09-15): `GameRecapPlayerView` match totals,
 * optional recap `kitId`, think time. Exception to the V6 single-bump lock
 * (same class as L49 / L56 / L57 / L58); see decisions.md.
 *
 * 35 → 36 (L63-03 / designer 2026-09-20): public `drawBust` on `actionPlayed`
 * so a Draw that instantly eliminates is a table tell. Exception to the V6
 * single-bump lock (same class as L49 / L56–L60); see decisions.md.
 *
 * 36 → 37 (designer 2026-09-20): public `pendingSentences` plus
 * `sentenceCountdown` / `sentenceFired` action-log kinds. Older clients cannot
 * read the countdown. Exception to the V6 single-bump lock (same class as
 * L49 / L56–L60 / L63); see decisions.md.
 */
export const PROTOCOL_VERSION = 37;
