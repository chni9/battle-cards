/**
 * The economy dock — technical spec v7 §6.1 item 5 (Draw, Shop, Unspy, Activate duplication),
 * §6.6.4 (an explicit button commits), §6.12, §11; L59-01, L64-05, L58-07; Lot 74 plan Appendix A
 * `economy-bar`, `unspy-dialog`, `private-zone-identity` and A.8 rulings 4 and 7 (L74-13).
 *
 * It renders `selfStrip(view, ctx).dock` and decides nothing (golden rule 8): a control exists when
 * the model has it, and is disabled with the model's reason, shown as text under the button. Every
 * send goes through `commit`, which ArenaScreen has already silenced for `TAP_GUARD_MS` after
 * targeting ends. An eliminated Watching POV keeps this dock, disabled (ruling 7); a walk-in has no
 * model entries, so ArenaScreen does not render it at all (Q38).
 *
 * Draw and Activate duplication send once per view (`useCommitOnce`; final review I3, ruling R2):
 * a double tap sends one intent, and the next view or a new `actionReject` re-arms them. Unspy's
 * Confirm closes its sheet only when the send went out (Minor 9).
 */

import type { PlayingStateView } from '@card-battle/shared';
import type { ActionRejectPayload } from '../../net/use-room-connection';
import { useAnimate } from 'motion/react';
import { useEffect, useState, type ReactElement } from 'react';

import { CostAmount } from '../../ui/card/cost-amount';
import { durationS, EASE_ENTRANCE } from '../../ui/motion/motion-tokens';
import { usePrefersReducedMotion } from '../../ui/motion/use-prefers-reduced-motion';
import { Button } from '../../ui/primitives/button';
import { motionAttribute } from '../../ui/primitives/chrome-classes';
import { DISABLED_REASON_COPY, type DisabledReason } from '../../view-model/action-reasons';
import { SHOP_ACTION_LABEL } from '../../view-model/chrome-labels';
import type { DockModel } from '../../view-model/self-strip';
import type { ArenaIntent } from './arena-commit';
import {
  ACTIVATE_DUPLICATION_LABEL,
  drawAriaLabel,
  drawPulseKey,
  unspyAriaLabel,
} from './dock-model';
import { UnspySheet } from './unspy-sheet';
import { useCommitOnce } from './use-commit-once';

/** The arena commit behind the targeting tap guard: true when the send went out, false when the guard swallowed it. */
export type DockCommit = (intent: ArenaIntent) => boolean;

export interface DockProps {
  /** `selfStrip(view, ctx).dock`. */
  model: DockModel;
  /** `selfStrip(...).isActive`. */
  isMyTurn: boolean;
  turnSequence: number;
  /** Spy nicknames and seat hues for the Unspy picker; a new view re-arms Draw and Activate duplication. */
  view: PlayingStateView;
  /** The arena commit, already silenced by the targeting tap guard. */
  commit: DockCommit;
  /** `props.actionReject`: a new reject re-arms Draw and Activate duplication. */
  actionReject: ActionRejectPayload | null;
  /** L74-14 passes the shop sheet opener; until then Shop renders disabled. */
  onOpenShop?: () => void;
}

/** `disabledReason` only while the model gives one (`exactOptionalPropertyTypes`). */
function reasonProps(reason: DisabledReason | null): { readonly disabledReason?: string } {
  return reason === null ? {} : { disabledReason: DISABLED_REASON_COPY[reason] };
}

export function Dock({ model, isMyTurn, turnSequence, view, commit, actionReject, onOpenShop }: DockProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const [unspyOpen, setUnspyOpen] = useState(false);
  const once = useCommitOnce({ view, reject: actionReject });
  const { draw, shop, unspy, duplication } = model;

  // L64-05: the pulse key changes at every own turn start and payout change. It animates the
  // wrapper in place instead of remounting it by `key`, so keyboard focus stays on Draw. A key
  // exists only while `draw` does, and then the span below is mounted when this effect runs, so
  // `scope.current` needs no null check (its type is the element).
  const pulseKey = draw === null ? null : drawPulseKey({ isMyTurn, turnSequence, gain: draw.gain });
  useEffect(() => {
    if (pulseKey === null || reduced) return;
    void animate(scope.current, { scale: [1, 1.12, 1] }, { duration: durationS('slow'), ease: EASE_ENTRANCE });
  }, [pulseKey, reduced, animate, scope]);

  if (unspy === null && unspyOpen) {
    // Unspy left the model (the POV was eliminated): forget the open flag, so a later Unspy does
    // not pop the sheet open by itself. React's "adjust state while rendering" pattern, as in
    // `arena-screen.tsx`; the sheet itself is unmounted below.
    setUnspyOpen(false);
  }

  return (
    <div data-zone="dock-controls" className="flex flex-wrap items-start justify-center gap-2 px-2 py-1">
      {draw !== null ? (
        <span ref={scope} className="inline-flex" data-motion={motionAttribute(reduced)}>
          <Button
            variant={draw.hot ? 'danger' : 'primary'}
            icon="point"
            aria-label={drawAriaLabel(draw.gain)}
            title={drawAriaLabel(draw.gain)}
            data-hint-anchor="draw"
            disabled={!draw.enabled}
            focusableWhenDisabled
            reserveReasonSlot
            {...reasonProps(draw.reason)}
            onClick={() => {
              once('draw', () => commit({ kind: 'drawCard' }));
            }}
          >
            {`+${String(draw.gain)}`}
          </Button>
        </span>
      ) : null}
      {shop !== null ? (
        <Button
          variant="secondary"
          icon="shop"
          data-hint-anchor="shop"
          reserveReasonSlot
          disabled={onOpenShop === undefined}
          focusableWhenDisabled
          {...(onOpenShop !== undefined ? { onClick: onOpenShop } : {})}
        >
          {SHOP_ACTION_LABEL}
        </Button>
      ) : null}
      {unspy !== null ? (
        <Button
          variant="quiet"
          icon="unspy"
          data-unspy=""
          aria-label={unspyAriaLabel(unspy.cost)}
          title={unspyAriaLabel(unspy.cost)}
          disabled={!unspy.enabled}
          focusableWhenDisabled
          reserveReasonSlot
          {...reasonProps(unspy.reason)}
          onClick={() => {
            setUnspyOpen(true);
          }}
        >
          <CostAmount amount={unspy.cost} signed="cost" title={null} />
        </Button>
      ) : null}
      {duplication !== null ? (
        <Button
          variant="quiet"
          icon="duplication-active"
          disabled={!duplication.enabled}
          focusableWhenDisabled
          reserveReasonSlot
          {...reasonProps(duplication.reason)}
          onClick={() => {
            once('activate-duplication', () => commit({ kind: 'activateDuplication' }));
          }}
        >
          {ACTIVATE_DUPLICATION_LABEL}
        </Button>
      ) : null}
      {unspy !== null ? (
        <UnspySheet
          open={unspyOpen}
          control={unspy}
          view={view}
          onConfirm={(targetPlayerId) => {
            // A Confirm the tap guard swallowed keeps the sheet and its pick (Minor 9).
            const sent = commit({ kind: 'clearSpy', payload: { targetPlayerId } });
            if (sent) {
              setUnspyOpen(false);
            }
            return sent;
          }}
          onClose={() => {
            setUnspyOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
