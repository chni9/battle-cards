/** Table rules summary helpers (technical spec v7 §6.11, §7.4). */
import { describe, expect, it } from 'vitest';

import { getKit, KIT_IDS, type KitId } from '@card-battle/shared';

import { formatTurnTimeSeconds, rulesKitFaces } from './rules-summary';

describe('rulesKitFaces', () => {
  it('lists the 16 Classic kits in KIT_IDS order with catalog names', () => {
    const faces = rulesKitFaces({ excludedKitIds: [] });
    expect(faces).toHaveLength(16);
    expect(faces.map((face) => face.kitId)).toEqual([...KIT_IDS]);
    expect(faces.map((face) => face.name)).toEqual(KIT_IDS.map((kitId) => getKit(kitId).name));
    expect(faces.some((face) => face.excluded)).toBe(false);
  });

  it('flags exactly the excluded kits, in KIT_IDS order whatever order they arrive in', () => {
    const excludedKitIds: readonly KitId[] = ['gambler', 'ghost', 'untouchable'];
    const faces = rulesKitFaces({ excludedKitIds });
    expect(faces.map((face) => face.kitId)).toEqual([...KIT_IDS]);
    expect(faces.filter((face) => face.excluded).map((face) => face.kitId))
      .toEqual(['untouchable', 'ghost', 'gambler']);
  });
});

describe('formatTurnTimeSeconds', () => {
  it('renders whole seconds with an s suffix across the host range', () => {
    expect(formatTurnTimeSeconds(5)).toBe('5s');
    expect(formatTurnTimeSeconds(60)).toBe('60s');
    expect(formatTurnTimeSeconds(180)).toBe('180s');
  });

  it('never clamps a server default above the host maximum of 180', () => {
    expect(formatTurnTimeSeconds(300)).toBe('300s');
  });
});
