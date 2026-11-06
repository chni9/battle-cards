/**
 * The Feedback sheet's two timers (technical spec v7 §7.7; L76-07). The sheet owns both, not
 * `submitFeedback`, so a hung fetch and a mocked one behave alike (decisions.md L76-07).
 */

/** The Lot 76 backlog review (2026-10-21; not in spec v7 §7.7), a designer question: "Sent" closes by itself after ~1.5 s. */
export const FEEDBACK_SENT_CLOSE_MS = 1500;
/** Spec v7 §7.7: a send with no answer re-enables dismissal with an error after 15 s. */
export const FEEDBACK_SEND_TIMEOUT_MS = 15_000;
