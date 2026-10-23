/** `/dev/ui` section for the holo card (technical spec v7 §4.2, §5.4, L72-12). DEV only. */

import type { CardId, CardInstance, CardType } from '@card-battle/shared';

import type { GallerySection } from '../../dev/gallery-registry';
import { Card } from './card';
import { CARD_SIZES } from './card-face';

const row = 'flex flex-wrap items-end gap-3';

function copy(cardId: CardId, isUpgraded = false): CardInstance {
  return { instanceId: `gal-${cardId}${isUpgraded ? '-up' : ''}`, cardId, isUpgraded };
}

const HIDDEN_FAMILIES = ['attack', 'action', 'special'] as const satisfies readonly CardType[];

export const gallery: GallerySection = {
  id: 'card',
  title: 'Card',
  entries: [
    {
      id: 'families',
      title: 'Families',
      render: () => (
        <div className={row}>
          <Card size="tile" instance={copy('basic-attack')} />
          <Card size="tile" instance={copy('tax')} />
          <Card size="tile" instance={copy('roulette')} />
          <Card size="tile" instance={copy('mega-attack')} />
        </div>
      ),
    },
    {
      id: 'sizes',
      title: 'Sizes',
      render: () => (
        <div className={row}>
          {CARD_SIZES.map((size) => (
            <Card key={size} size={size} instance={copy('strong-attack', true)} />
          ))}
        </div>
      ),
    },
    {
      id: 'chips',
      title: 'Chips',
      render: () => (
        <div className={row}>
          <Card size="tile" instance={copy('tax')} />
          <Card size="tile" instance={copy('regeneration')} />
          <Card size="tile" instance={copy('regeneration', true)} />
          <Card size="tile" instance={copy('super-mirror')} />
          <Card size="tile" instance={copy('strong-attack')} damageMultiplier={2} />
        </div>
      ),
    },
    {
      id: 'states',
      title: 'States',
      render: () => (
        <div className={row}>
          <Card size="tile" instance={copy('strong-attack', true)} />
          <Card size="tile" instance={copy('poison')} counter={{ kind: 'card-lives', amount: 2 }} />
          <Card size="tile" instance={copy('invisibility')} counter={{ kind: 'turns', amount: 3 }} />
          <Card size="tile" instance={copy('basic-attack')} unplayable />
          <Card size="tile" instance={copy('basic-attack')} selected onActivate={() => undefined} />
        </div>
      ),
    },
    {
      id: 'hidden',
      title: 'Hidden',
      render: () => (
        <div className={row}>
          {HIDDEN_FAMILIES.map((family) => (
            <Card key={family} face="hidden" family={family} size="hand" />
          ))}
        </div>
      ),
    },
  ],
};
