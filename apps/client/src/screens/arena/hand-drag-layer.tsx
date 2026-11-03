/**
 * The hand-drag ghost and Sell zone — technical spec v7 §6.6.3 (the Sell zone), §6.6.5 (a ghost
 * out of the clipped scroller); Lot 74 plan Appendix A.8 ruling 10; DESIGN.md › Overlays › Drag
 * ghost (L74-12).
 *
 * The one fixed layer outside `Sheet` / `Dialog` / `Toast`: a `pointer-events: none` portal to
 * `document.body`, mounted only during a drag, on `Z_INDEX.dragGhost` below every sheet. Both
 * parts are `aria-hidden`: the real card stays in its slot (dimmed, `data-lifted`), and the sheet
 * is the accessible path to every action. The ghost's instance id is `ghost-<instanceId>`, so a
 * `[data-instance-id]` query (the L74-17 FX, the L75 tutorial highlight) still finds the real card.
 */

import { motion } from 'motion/react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';

import { Card } from '../../ui/card/card';
import { CostAmount } from '../../ui/card/cost-amount';
import { Z_INDEX } from '../../ui/layers';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { CHROME_SHAPE_SM_CLASS, motionAttribute } from '../../ui/primitives/chrome-classes';
import { CARD_SELL_LABEL } from '../../view-model/chrome-labels';
import { sellYieldOf } from './card-sheet-actions';
import type { HandDragView } from './use-hand-drag';

export interface HandDragLayerProps {
  drag: HandDragView | null;
}

const SELL_ZONE_CLASS = `${CHROME_SHAPE_SM_CLASS} flex flex-col items-center justify-center bg-v7-panel font-v7-display text-v7-body text-v7-text`;

export function HandDragLayer({ drag }: HandDragLayerProps): ReactElement | null {
  const reduced = usePrefersReducedMotion();
  if (drag === null) {
    return null;
  }
  const { instance } = drag.card;
  const sell = drag.phase === 'dragging' && drag.zones.sell ? drag.sellRect : null;
  const sellOver = drag.hover?.kind === 'sell';
  // The catalog sell gain, as the card sheet's Sell button shows it.
  const sellYield = sellYieldOf(instance);
  return createPortal(
    <>
      {/* Before the ghost, so the card paints over the zone it is dropped on. */}
      {sell === null ? null : (
        <div
          data-zone="sell-drop"
          aria-hidden="true"
          data-drop={sellOver ? 'over' : 'valid'}
          style={{
            position: 'fixed',
            left: sell.left,
            top: sell.top,
            width: sell.width,
            height: sell.height,
            zIndex: Z_INDEX.dragGhost,
            pointerEvents: 'none',
          }}
          className={sellOver ? `${SELL_ZONE_CLASS} ring-4 ring-v7-mine` : SELL_ZONE_CLASS}
        >
          <span>{CARD_SELL_LABEL}</span>
          {sellYield === null ? null : <CostAmount amount={sellYield} signed="gain" title={null} />}
        </div>
      )}
      <motion.div
        data-zone="hand-drag-ghost"
        aria-hidden="true"
        data-motion={motionAttribute(reduced)}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          x: drag.ghostX,
          y: drag.ghostY,
          zIndex: Z_INDEX.dragGhost,
          pointerEvents: 'none',
        }}
      >
        <Card
          size="hand"
          instance={{ ...instance, instanceId: `ghost-${instance.instanceId}` }}
          className={reduced ? '' : 'scale-105'}
        />
      </motion.div>
    </>,
    document.body,
  );
}
