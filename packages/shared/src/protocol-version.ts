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
 */
export const PROTOCOL_VERSION = 27;
