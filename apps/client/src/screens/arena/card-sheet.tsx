/**
 * Read-only card sheet — technical spec v7 §6.6.1 (the face at sheet size, then the Cost row, the
 * effect and the Upgrade block), §5.4 (the card face), §6.7 (read-only sheets stack); Lot 74 plan
 * A.8 ruling 1 (the activated look is the counter glow; Shield and Sentence never get it); L56-05
 * (a queue or log card shows the catalog face with no footer).
 *
 * Every source shows the same body. The read-only form has no action row: L74-08 adds Use,
 * Upgrade and Sell for a held card. Opening or closing the sheet sends nothing (§6.6.4).
 */

import { getCard, type PlayingStateView } from '@card-battle/shared';
import type { ReactElement } from 'react';

import type { ActionContext } from '../../view-model/action-lock';
import { Card } from '../../ui/card/card';
import { Badge } from '../../ui/primitives/badge';
import { Sheet } from '../../ui/primitives/sheet';
import { CardEffectCopy } from '../../ui/text/card-effect-copy';
import { arenaSheetKey } from './arena-sheets';
import {
  ACTIVE_LABEL,
  CARD_LIVES_LABEL,
  SPY_REVEAL_LABEL,
  cardSheetContext,
  cardSheetCounter,
  cardSheetTitle,
  liveCardSheetSource,
  sheetInstanceFor,
  type CardSheetSource,
} from './card-sheet-source';

export interface CardSheetProps {
  /** False while the sheet plays its exit from `closing` (arena-sheets.ts). */
  open: boolean;
  source: CardSheetSource;
  /** The live view: in-play counters follow it; L74-08 reads card actions from it. */
  view: PlayingStateView;
  /** The arena's action context (Appendix A.2); read from L74-08 on. */
  ctx: ActionContext;
  onClose: () => void;
}

export function CardSheet(props: CardSheetProps): ReactElement {
  const source = liveCardSheetSource(props.source, props.view);
  const instance = sheetInstanceFor(source);
  const card = getCard(instance.cardId);
  const counter = cardSheetCounter(source);
  const context = cardSheetContext(source);

  return (
    <Sheet
      open={props.open}
      mode="read-only"
      placement="bottom"
      title={cardSheetTitle(source)}
      onClose={props.onClose}
      dataAttributes={{ 'data-arena-sheet': arenaSheetKey({ kind: 'card', source }) }}
    >
      <div className="flex flex-col items-center gap-3 pt-2 pb-3">
        <Card size="sheet" instance={instance} {...(counter !== null ? { counter } : {})} />
        {card !== undefined ? (
          <div className="w-full">
            <CardEffectCopy card={card} isUpgraded={instance.isUpgraded} />
          </div>
        ) : null}
        {context?.kind === 'active' ? (
          <div data-card-sheet-context="active" className="flex w-full flex-wrap items-center gap-2">
            <p className="font-v7-display text-v7-body text-v7-text">{ACTIVE_LABEL}</p>
            {context.count !== null ? (
              <Badge
                icon={context.count.label === CARD_LIVES_LABEL ? 'life' : 'clock'}
                label={context.count.label}
                value={context.count.value}
              />
            ) : null}
          </div>
        ) : null}
        {context?.kind === 'spy-reveal' ? (
          <p data-card-sheet-context="spy-reveal" className="w-full font-v7-body text-v7-body text-v7-text-2">
            {SPY_REVEAL_LABEL}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
