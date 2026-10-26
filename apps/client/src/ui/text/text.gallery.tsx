/**
 * `/dev/ui` section for the L72-11 text pieces (technical spec v7 §4.2, §6.6.1): cost glyphs,
 * effect prose with inline icons and card effect copy. The catalog strings are read from the
 * catalogs, never copied, and the labels are DEV-only demo copy. DEV only.
 *
 * No PascalCase local component lives here: `react-refresh/only-export-components` would report
 * the `gallery` export beside one. The frames are plain functions that return JSX.
 */

import { SHARED_CARD_CATALOG, SPECIAL_CARD_CATALOG, type Card } from '@card-battle/shared';
import type { ReactElement, ReactNode } from 'react';
import type { GallerySection } from '../../dev/gallery-registry';
import { CostAmount } from '../card/cost-amount';
import type { GlyphAmount } from '../card/glyph-amount';
import { CardEffectCopy } from './card-effect-copy';
import { EffectTextWithIcons } from './effect-text-with-icons';

const FRAME_CLASS = 'flex max-w-sm flex-col gap-3 rounded-v7-chrome bg-v7-panel p-3 text-v7-text';
const LABEL_CLASS = 'font-v7-body text-v7-caption font-bold text-v7-text-2';

function frame(children: ReactNode): ReactElement {
  return <div className={FRAME_CLASS}>{children}</div>;
}

/** A DEV label over a sample, so each sample says which props it shows. */
function labelled(label: string, sample: ReactNode): ReactElement {
  return (
    <div key={label} className="flex flex-col gap-1">
      <p className={LABEL_CLASS}>{label}</p>
      {sample}
    </div>
  );
}

function amountRow(label: string, amount: ReactElement): ReactElement {
  return (
    <li key={label} className="flex items-center justify-between gap-3">
      <span className={LABEL_CLASS}>{label}</span>
      <span className="font-v7-display text-v7-body leading-none">{amount}</span>
    </li>
  );
}

const amount = (kind: GlyphAmount['kind'], n: number): GlyphAmount => ({ kind, amount: n });

const prose = (text: string): ReactElement => (
  <p className="font-v7-body text-v7-body leading-snug font-bold">
    <EffectTextWithIcons text={text} />
  </p>
);

const regeneration: Card = SHARED_CARD_CATALOG.regeneration;
const cloning: Card = SPECIAL_CARD_CATALOG.cloning;

export const gallery: GallerySection = {
  id: 'text',
  title: 'Text and cost glyphs',
  entries: [
    {
      id: 'cost-amount',
      title: 'CostAmount',
      render: () =>
        frame(
          <ul className="flex flex-col gap-2">
            {[
              amountRow('Points', <CostAmount amount={amount('points', 3)} />),
              amountRow('Lives', <CostAmount amount={amount('lives', 4)} />),
              amountRow('Upgrade points', <CostAmount amount={amount('upgradePoint', 2)} />),
              amountRow('Shield points', <CostAmount amount={amount('shield', 4)} />),
              amountRow('Points per life', <CostAmount amount={amount('pointsPerLife', 3)} />),
              amountRow('signed="cost"', <CostAmount amount={amount('upgradePoint', 1)} signed="cost" />),
              amountRow('signed="gain"', <CostAmount amount={amount('points', 7)} signed="gain" />),
              amountRow('multiplier={2}', <CostAmount amount={amount('points', 4)} multiplier={2} />),
              amountRow('size="lg"', <CostAmount amount={amount('lives', 4)} size="lg" />),
            ]}
          </ul>,
        ),
    },
    {
      id: 'effect-text',
      title: 'EffectTextWithIcons',
      render: () =>
        frame([
          labelled('Regeneration effect', prose(regeneration.effect)),
          labelled('Regeneration upgradeAdds, with "instead of"', prose(regeneration.upgradeAdds)),
          labelled('Cloning upgradeAdds, three resources', prose(cloning.upgradeAdds)),
          labelled('Shield effect', prose(SHARED_CARD_CATALOG.shield.effect)),
          labelled('Block upgradeAdds, turns stay prose', prose(SPECIAL_CARD_CATALOG.block.upgradeAdds)),
        ]),
    },
    {
      id: 'card-effect-copy',
      title: 'CardEffectCopy',
      render: () =>
        frame([
          labelled('Regeneration, base', <CardEffectCopy card={regeneration} isUpgraded={false} />),
          labelled('Regeneration, upgraded', <CardEffectCopy card={regeneration} isUpgraded />),
          labelled(
            'Basic attack, base',
            <CardEffectCopy card={SHARED_CARD_CATALOG['basic-attack']} isUpgraded={false} />,
          ),
          labelled('Tax, base (life cost)', <CardEffectCopy card={SHARED_CARD_CATALOG.tax} isUpgraded={false} />),
        ]),
    },
  ],
};
