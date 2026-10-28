/**
 * The words of one pending effect — technical spec v7 §6.5 (every pending effect keeps its own
 * label), §11 (V2 words are reused); L74-05. These are the V2 `pending-queue.tsx` chip words
 * (`Inspect {label}`, `{label} · {source} → {target} · queued #{n}`): the arena cannot import
 * `screens/table/` (L74-01 import rule), so the copy is restated here once, for the seat sheet
 * and for the central plate (L74-06).
 *
 * Each effect has its own label and never a total (golden rule 1, designer 2026-09-29).
 */

import { formatCardLabel } from '@card-battle/shared';

import type { ThreatEntry } from '../../view-model/threats';

export interface PendingEffectCopy {
  /** `formatCardLabel(cardId, isUpgraded)`, as V2 `pending-queue.tsx`. */
  label: string;
  /** `Inspect {label}` (the V2 chip's aria-label). */
  ariaLabel: string;
  /** V2 compact chip title: `{label} · {source} → {target} · queued #{n}[ · {d} damage]`, plus ` · {Mirror name}` when redirected. */
  title: string;
}

export function pendingEffectCopy(entry: ThreatEntry, nicknameOf: (playerId: string) => string): PendingEffectCopy {
  const label = formatCardLabel(entry.cardId, entry.isUpgraded);
  const parts = [
    label,
    `${nicknameOf(entry.sourcePlayerId)} → ${nicknameOf(entry.targetPlayerId)}`,
    `queued #${String(entry.queuedAt)}`,
    ...(entry.label.kind === 'damage' ? [`${String(entry.label.amount)} damage`] : []),
    ...(entry.mirrorBadge !== null ? [formatCardLabel(entry.mirrorBadge, false)] : []),
  ];
  return { label, ariaLabel: `Inspect ${label}`, title: parts.join(' · ') };
}
