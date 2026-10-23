/**
 * Query helpers for CostAmount / effect-copy tests (technical spec v7 §6.6.1, L72-11).
 * Test support only — shipped ui/ never imports this module.
 */

export function visibleText(element: Element): string {
  const clone = element.cloneNode(true);
  if (!(clone instanceof Element)) {
    throw new Error('visibleText: clone is not an Element');
  }
  for (const hidden of clone.querySelectorAll('.sr-only')) {
    hidden.remove();
  }
  return clone.textContent;
}

export function spokenTexts(element: Element): string[] {
  return [...element.querySelectorAll('.sr-only')].map((node) => node.textContent);
}

export function glyphRoots(element: Element): HTMLElement[] {
  return [...element.querySelectorAll<HTMLElement>('[data-glyph-icon]')];
}
