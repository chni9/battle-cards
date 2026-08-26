/**
 * Pending chip callout tone — L51-07.
 * Kept out of `pending-queue.tsx` so that file only exports the component.
 */

import { threatToneFor } from '../../fx/threat-tone';

export function pendingChipCalloutTone(cardId: string): 'threat' | 'guide' {
  return threatToneFor(cardId) === 'attack' ? 'threat' : 'guide';
}
