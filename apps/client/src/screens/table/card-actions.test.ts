/**
 * Target Dialog uses SeatTile — L44-02 / technical spec v6 §6.4.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));

describe('card-actions visual pickers (L44-02 / L44-04 / L44-05 / L44-06)', () => {
  const source = readFileSync(join(dir, 'card-actions.tsx'), 'utf8');

  it('picks seats with SeatTile and still sends targetPlayerId (L44-02)', () => {
    expect(source).toContain('SeatTile');
    expect(source).toContain('visibleKitId');
    expect(source).toContain('targetPlayerId: resolvedTarget');
    expect(source).not.toMatch(/type="radio"/);
    expect(source).not.toContain('name="card-target"');
  });

  it('picks Assassin attacks as CardChoiceTile plus per-line SeatTile (L44-04)', () => {
    expect(source).toContain('CardChoiceTile');
    expect(source).toContain('onPlayMultipleAttacks');
    expect(source).not.toMatch(/type="checkbox"/);
    expect(source).not.toContain('<select');
  });

  it('picks Transformer consume cards as CardChoiceTile (L44-05)', () => {
    expect(source).toContain('consumeInstanceId: resolvedConsumeId');
    expect(source).toContain("kind === 'consume'");
    expect(source).toContain('CardChoiceTile');
  });

  it('inspects cards with CostDisplay and upgradeAdds, not Cost: prose (L51-05)', () => {
    expect(source).toContain('CardEffectCopy');
    expect(source).not.toContain('Cost:');
    expect(source).not.toContain('formatCardEffectText');
  });

  it('does not prompt Choose Use, Upgrade, or Sell (L51-12)', () => {
    expect(source).not.toContain('Choose Use, Upgrade, or Sell.');
  });

  it('commits Regeneration quantity with four click-to-buy tiles (L44-06)', () => {
    expect(source).toContain('REGEN_QUANTITIES');
    expect(source).toContain('1 life');
    expect(source).toContain('structuredPlayCost');
    expect(source).toContain("signed=\"cost\"");
    expect(source).toContain('quantity: lives');
    expect(source).toContain('choiceTileClassName');
    expect(source).not.toContain('<input');
    expect(source).not.toContain('quantityText');
  });
});
