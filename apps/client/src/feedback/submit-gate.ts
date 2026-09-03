/**
 * Synchronous in-flight lock for Feedback Send (technical spec v6 §7.1 / L47-03).
 * `useState` busy only flips after paint, so two clicks in one tick would both POST.
 */

export function beginFeedbackSend(inFlight: { current: boolean }): boolean {
  if (inFlight.current) {
    return false;
  }
  inFlight.current = true;
  return true;
}

export function endFeedbackSend(inFlight: { current: boolean }): void {
  inFlight.current = false;
}
