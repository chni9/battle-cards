/**
 * Bumped whenever the client/server event contract in technical spec §5.2 / §5.3 changes
 * in a way an older client cannot handle. Client and server compare it on connection.
 *
 * 22 → 23 (backlog L20-18, technical spec v4 §4.4/§5): `subChoiceRequired` /
 * `resolveSubChoice` replace the `mirrorChoiceRequired` / `chooseMirrorTarget` and
 * `rewardChoiceRequired` / `chooseEliminationReward` pairs. Payload shapes are
 * unchanged (each now carries a `kind` discriminant); Mirror and elimination-reward
 * behaviour is unchanged. This is V4's one and only protocol bump — no other V4 task
 * touches this constant (`docs/backlog_v4.md` scope lock).
 */
export const PROTOCOL_VERSION = 23;
