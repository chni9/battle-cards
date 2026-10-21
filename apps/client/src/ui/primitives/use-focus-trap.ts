/**
 * Focus trap for V7 sheets (L11-03 contract kept; technical spec v7 §6.6.5, §6.7; L72-09 fix
 * rounds 1-2: focus follows reachability).
 *
 * - **Live trap.** While `active`, Tab and Shift+Tab wrap inside the container (with nothing
 *   focusable, Tab is swallowed). Every time the trap turns active it moves focus in, unless
 *   focus is already inside: to an element a closing trap handed over, else `initialFocusRef`,
 *   else the first focusable control, else a scrollable region, else the container
 *   (`tabIndex={-1}`). Nothing is focused while the container sits under `[inert]` or
 *   `[hidden]`.
 * - **Open cycle.** `open` (default `active`) spans one opening: a sheet that is minimized or
 *   covered stays in the same cycle. The opener, the element focused when the cycle starts
 *   outside the container, is kept for the whole cycle and cleared when it ends.
 * - **Restore on close.** When the cycle ends, and only if focus is lost (on `body`, on a
 *   removed element, or on an element that `isReachable` rejects, such as one inside this
 *   closing container), focus goes, in order: to the opener when it is reachable; else into
 *   the container `fallbackContainer` names (the new top sheet); else up the opener chain (the
 *   opener of the trap whose container holds this opener, or that trap's `standIn` when it is
 *   collapsed to a bar). A reachable opener that is still under `[inert]` (its sheet re-renders
 *   a moment later) is handed to the trap that will activate around it, with one
 *   `requestAnimationFrame` retry as a backstop. With nowhere to go, focus leaves the closing
 *   container rather than staying in a dead panel.
 * - **Re-parenting.** Before anything else at a cycle end, every other open trap whose opener
 *   sits inside the closing container gets this trap's opener instead, so a sheet opened from
 *   inside it can still return focus after it is gone.
 * - **Release mid-cycle.** When the trap is released while its cycle goes on (Minimize) and
 *   `handOverOnRelease` is true, its opener is handed to the trap that activates around it next,
 *   so the user lands back where they were (the Chat message field).
 *
 * `restoreFocus`, `isReachable`, `fallbackContainer` and `standIn` are read when the cycle ends;
 * `handOverOnRelease` when the trap is released. `focusIntoTrap(container)` moves focus into an
 * open trap the way its own activation would.
 */

import { useEffect, useEffectEvent, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Marks a focusable scroll region (a sheet body that overflows): never the initial focus when a control exists. */
export const SCROLL_REGION_ATTRIBUTE = 'data-scroll-region';

export interface FocusTrapOptions {
  active: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
  /** The open cycle; defaults to `active`. */
  open?: boolean;
  /** Whether focus may land on this element now; defaults to "connected, not inert or hidden". */
  isReachable?: (element: HTMLElement) => boolean;
  /** The container to move focus into when the opener is unreachable (the new top sheet). */
  fallbackContainer?: () => HTMLElement | null;
  /**
   * While open but released (collapsed to a bar), the element that stands in for the container
   * when another trap's opener chain leads into it (the bar's restore control).
   */
  standIn?: () => HTMLElement | null;
  /**
   * Read when the trap is released while its cycle goes on: true hands the opener to the trap
   * that activates around it next (Minimize puts the user back where they were).
   */
  handOverOnRelease?: boolean;
}

interface TrapRecord {
  opener: HTMLElement | null;
  focusIn: () => void;
  standIn: () => HTMLElement | null;
}

/** Every trap in an open cycle, by container, so a closing trap can hand focus to another. */
const traps = new Map<HTMLElement, TrapRecord>();
/** An element a closing trap wants focused once the trap around it activates. */
let handover: HTMLElement | null = null;

function isBlocked(element: Element): boolean {
  return element.closest('[inert], [hidden]') !== null;
}

function defaultReachable(element: HTMLElement): boolean {
  return element.isConnected && !isBlocked(element);
}

function focusablesIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
    if (element.tabIndex === -1) return false;
    if (element instanceof HTMLInputElement && element.type === 'hidden') return false;
    const blocked = element.closest('[hidden], [inert]');
    return blocked === null || !container.contains(blocked);
  });
}

function focusInto(container: HTMLElement, initial: HTMLElement | null): void {
  if (initial !== null && container.contains(initial)) {
    initial.focus();
    return;
  }
  const focusables = focusablesIn(container);
  const control = focusables.find((element) => !element.hasAttribute(SCROLL_REGION_ATTRIBUTE));
  (control ?? focusables[0] ?? container).focus();
}

/** Focus `element` now, or hand it over until the inert sheet around it activates. */
function focusWhenReady(element: HTMLElement): void {
  if (!isBlocked(element)) {
    element.focus();
    return;
  }
  handover = element;
  window.requestAnimationFrame(() => {
    if (handover !== element) return;
    handover = null;
    const active = document.activeElement;
    const lost = active === null || active === document.body || !active.isConnected;
    if (lost && element.isConnected && !isBlocked(element)) element.focus();
  });
}

function ownerTrap(element: HTMLElement, except: HTMLElement): TrapRecord | undefined {
  for (const [container, record] of traps) {
    if (container !== except && container.contains(element)) return record;
  }
  return undefined;
}

export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, options: FocusTrapOptions): void {
  const {
    active,
    initialFocusRef,
    restoreFocus = true,
    open = active,
    isReachable,
    fallbackContainer,
    standIn,
    handOverOnRelease = false,
  } = options;

  const focusIn = useEffectEvent((container: HTMLElement): void => {
    focusInto(container, initialFocusRef?.current ?? null);
  });
  const readStandIn = useEffectEvent((): HTMLElement | null => standIn?.() ?? null);
  const readHandOverOnRelease = useEffectEvent((): boolean => handOverOnRelease);

  const endCycle = useEffectEvent((container: HTMLElement, record: TrapRecord): void => {
    const reachable = isReachable ?? defaultReachable;
    const live = (element: HTMLElement): boolean =>
      element.isConnected && !container.contains(element) && reachable(element);
    // Openers that point into this container now point where this sheet came from, so a sheet
    // opened from inside it can still return focus after it is gone.
    const heir = record.opener?.isConnected === true ? record.opener : null;
    for (const other of traps.values()) {
      if (other !== record && other.opener !== null && container.contains(other.opener)) other.opener = heir;
    }
    if (!restoreFocus) return;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== document.body && live(focused)) return;

    const { opener: ownOpener } = record;
    if (ownOpener !== null && live(ownOpener)) {
      focusWhenReady(ownOpener);
      return;
    }
    const fallback = fallbackContainer?.() ?? null;
    if (fallback !== null && fallback !== container) {
      const target = traps.get(fallback);
      // A top sheet with no opener of its own inherits this one.
      if (target?.opener === null) target.opener = heir;
      // An inert top sheet moves focus in itself as soon as it activates.
      if (isBlocked(fallback)) return;
      if (target === undefined) focusInto(fallback, null);
      else target.focusIn();
      return;
    }
    let opener = ownOpener;
    const seen = new Set<TrapRecord>([record]);
    while (opener !== null && !live(opener)) {
      const owner = ownerTrap(opener, container);
      if (owner === undefined || seen.has(owner)) {
        opener = null;
        break;
      }
      seen.add(owner);
      // A sheet collapsed to its bar is reached through the bar.
      const standIn = owner.standIn();
      opener = standIn !== null && live(standIn) ? standIn : owner.opener;
    }
    if (opener !== null) {
      focusWhenReady(opener);
      return;
    }
    // Nothing to return to: never leave focus inside a sheet that is going away.
    if (focused instanceof HTMLElement && container.contains(focused)) focused.blur();
  });

  // The open cycle: record the opener when it starts, restore and forget it when it ends.
  useEffect(() => {
    const container = containerRef.current;
    if (!open || container === null) return;
    const current = document.activeElement;
    const record: TrapRecord = {
      opener:
        current instanceof HTMLElement && current.isConnected && current !== document.body && !container.contains(current)
          ? current
          : null,
      focusIn: () => {
        focusIn(container);
      },
      standIn: () => readStandIn(),
    };
    traps.set(container, record);
    return () => {
      endCycle(container, record);
      traps.delete(container);
    };
  }, [open, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!active || container === null) return;

    if (!isBlocked(container) && !container.contains(document.activeElement)) {
      const handed = handover;
      if (handed !== null && handed.isConnected && container.contains(handed)) {
        handover = null;
        handed.focus();
      } else {
        focusIn(container);
      }
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const focusables = focusablesIn(container);
      const first = focusables[0];
      const last = focusables.at(-1);
      if (first === undefined || last === undefined) {
        event.preventDefault();
        return;
      }
      const focused = document.activeElement;
      if (event.shiftKey && (focused === first || focused === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      // Released while the cycle goes on (the cycle cleanup above already removed a closed
      // record): hand the opener to whichever trap activates around it.
      const record = traps.get(container);
      const opener = record?.opener ?? null;
      if (opener?.isConnected === true && readHandOverOnRelease() && container.contains(document.activeElement)) {
        handover = opener;
      }
    };
  }, [active, containerRef]);
}

/** Move focus into an open trap's container the way its own activation would (L72-09). */
export function focusIntoTrap(container: HTMLElement): void {
  const record = traps.get(container);
  if (record === undefined) focusInto(container, null);
  else record.focusIn();
}
