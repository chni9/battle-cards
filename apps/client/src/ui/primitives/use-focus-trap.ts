/**
 * Focus trap for V7 sheets (L11-03 contract kept; technical spec v7 §6.6.5, §6.7).
 *
 * - On activation, focus moves in: to `initialFocusRef`, else to the first focusable element,
 *   else to the container (`tabIndex={-1}`). Nothing is focused while the container sits under
 *   `[inert]` (a sheet under a blocking one) or `[hidden]` (a read-only sheet past the depth).
 * - While active, Tab and Shift+Tab wrap inside the container; with nothing focusable, Tab is
 *   swallowed.
 * - On deactivation or unmount, focus returns to the opener, the element focused before the
 *   first activation. The opener survives a re-activation that starts with focus nowhere
 *   (Minimize, then restore from the bar). Focus is restored only when nothing else claimed it
 *   (focus is on `body`, on a removed element or still inside the container), so closing a
 *   sheet never steals focus from a field the player moved to. An opener that is still inert
 *   (inside a sheet that the closing blocking sheet covered) gets one retry on the next frame.
 *
 * `restoreFocus` (default true) is read when the trap deactivates, so a caller can skip the
 * restore for one transition (a sheet collapsing to its bar).
 */

import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusablesIn(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => {
    if (element.tabIndex === -1) return false;
    if (element instanceof HTMLInputElement && element.type === 'hidden') return false;
    const blocked = element.closest('[hidden], [inert]');
    return blocked === null || !container.contains(blocked);
  });
}

/** Nobody else holds focus: it is lost, or still inside the sheet that is going away. */
function focusUnclaimed(container: HTMLElement): boolean {
  const active = document.activeElement;
  return active === null || active === document.body || !active.isConnected || container.contains(active);
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options: { active: boolean; initialFocusRef?: RefObject<HTMLElement | null>; restoreFocus?: boolean },
): void {
  const { active, initialFocusRef, restoreFocus = true } = options;
  const openerRef = useRef<HTMLElement | null>(null);

  const restore = useEffectEvent((container: HTMLElement): void => {
    const opener = openerRef.current;
    if (!restoreFocus || opener === null) return;
    const attempt = (): boolean => {
      if (!opener.isConnected || !focusUnclaimed(container)) return true;
      if (opener.closest('[inert]') !== null) return false;
      opener.focus();
      return true;
    };
    if (!attempt()) {
      window.requestAnimationFrame(() => {
        attempt();
      });
    }
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!active || container === null) return;

    const current = document.activeElement;
    if (
      current instanceof HTMLElement &&
      current.isConnected &&
      current !== document.body &&
      !container.contains(current)
    ) {
      openerRef.current = current;
    }

    if (container.closest('[inert], [hidden]') === null) {
      const initial = initialFocusRef?.current ?? null;
      if (initial !== null) initial.focus();
      else if (!container.contains(document.activeElement)) (focusablesIn(container)[0] ?? container).focus();
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
      restore(container);
    };
  }, [active, containerRef, initialFocusRef]);
}
