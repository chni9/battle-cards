/**
 * `/dev/ui` section for the L72-12 holo Card (technical spec v7 §4.2, §5.4): the families and
 * rims, every size, the chips, the states and the hidden face, plus every catalog drawing at
 * hand size so the art fit can be checked card by card. The labels are DEV-only demo copy.
 * DEV only.
 *
 * No PascalCase local component lives here: `react-refresh/only-export-components` would report
 * the `gallery` export beside one. The frames are plain functions that return JSX.
 */

import type { CardId, CardInstance, CardType } from '@card-battle/shared';
import type { ReactElement, ReactNode } from 'react';
import type { GallerySection } from '../../dev/gallery-registry';
import { ALL_ART_CARD_IDS } from '../asset-lookup';
import { Card } from './card';
import { CARD_SIZES } from './card-face';

const LABEL_CLASS = 'font-v7-body text-v7-caption font-bold text-v7-text-2';

/** Cards sit on the dark ground with room below for a counter badge and above for a lift. */
function row(children: ReactNode): ReactElement {
  return <div className="flex flex-wrap items-end gap-x-4 gap-y-6 pt-3 pb-4">{children}</div>;
}

function labelled(label: string, sample: ReactNode): ReactElement {
  return (
    <div key={label} className="flex flex-col items-center gap-3">
      {sample}
      <p className={LABEL_CLASS}>{label}</p>
    </div>
  );
}

const inst = (cardId: CardId, isUpgraded = false): CardInstance => ({
  instanceId: `gallery-${cardId}-${isUpgraded ? 'up' : 'base'}`,
  cardId,
  isUpgraded,
});

const FAMILIES: readonly CardType[] = ['attack', 'action', 'special'];

export const gallery: GallerySection = {
  id: 'card',
  title: 'Card',
  entries: [
    {
      id: 'families',
      title: 'Families and rims (tile)',
      render: () =>
        row(
          (['basic-attack', 'tax', 'roulette', 'mega-attack'] as const).map((cardId) =>
            labelled(cardId, <Card size="tile" instance={inst(cardId)} />),
          ),
        ),
    },
    {
      id: 'sizes',
      title: 'Sizes (upgraded Strong attack)',
      render: () =>
        row(CARD_SIZES.map((size) => labelled(size, <Card size={size} instance={inst('strong-attack', true)} />))),
    },
    {
      id: 'chips',
      title: 'Chips (sheet)',
      render: () =>
        row([
          labelled('Tax: life cost', <Card size="sheet" instance={inst('tax')} />),
          labelled('Regeneration', <Card size="sheet" instance={inst('regeneration')} />),
          labelled('Regeneration upgraded', <Card size="sheet" instance={inst('regeneration', true)} />),
          labelled('Super Mirror: no damage', <Card size="sheet" instance={inst('super-mirror')} />),
          labelled('damageMultiplier={2}', <Card size="sheet" instance={inst('strong-attack')} damageMultiplier={2} />),
        ]),
    },
    {
      id: 'states',
      title: 'States (hand and thumb)',
      render: () =>
        row([
          labelled('upgraded', <Card size="hand" instance={inst('super-attack', true)} />),
          labelled('card lives 2', <Card size="thumb" instance={inst('poison')} counter={{ kind: 'card-lives', amount: 2 }} />),
          labelled('turns 3', <Card size="thumb" instance={inst('invisibility')} counter={{ kind: 'turns', amount: 3 }} />),
          labelled(
            'active upgraded',
            <Card size="hand" instance={inst('points-generator', true)} counter={{ kind: 'card-lives', amount: 2 }} />,
          ),
          labelled('unplayable', <Card size="hand" instance={inst('mega-attack')} unplayable />),
          labelled(
            'selected',
            <Card size="hand" instance={inst('basic-attack')} selected onActivate={() => undefined} />,
          ),
          labelled('button', <Card size="hand" instance={inst('shield')} onActivate={() => undefined} />),
        ]),
    },
    {
      id: 'hidden',
      title: 'Hidden face (hand)',
      render: () =>
        row(FAMILIES.map((family) => labelled(family, <Card face="hidden" family={family} size="hand" />))),
    },
    {
      id: 'catalog',
      title: 'Every drawing (hand)',
      render: () =>
        row(ALL_ART_CARD_IDS.map((cardId) => <Card key={cardId} size="hand" instance={inst(cardId)} />)),
    },
  ],
};
