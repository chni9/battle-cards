/**
 * Test-only queries for cost glyphs and effect copy (technical spec v7 §6.6.1, L72-11). A glyph
 * draws its amount twice: an `.sr-only` spoken text, and an `aria-hidden` number plus icon. A
 * test reads each side on its own. Shipped code never imports this module.
 */

/** What a sighted player reads: the element's text without any `.sr-only` descendant. */
export function visibleText(element: Element): string {
  const clone = element.cloneNode(true);
  if (!(clone instanceof Element)) {
    throw new Error('visibleText needs an Element');
  }
  for (const hidden of clone.querySelectorAll('.sr-only')) {
    hidden.remove();
  }
  return clone.textContent;
}

/** What a screen reader hears from the glyphs: every `.sr-only` text, in document order. */
export function spokenTexts(element: Element): string[] {
  return Array.from(element.querySelectorAll('.sr-only'), (node) => node.textContent);
}

/** The `CostAmount` roots under an element, in document order. */
export function glyphRoots(element: Element): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>('[data-glyph-icon]'));
}
