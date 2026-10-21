/**
 * The letter an Avatar shows when it has no portrait. It takes the first grapheme, not the
 * first code unit, so an accented letter keeps its combining mark and a multi-code-point
 * character stays whole instead of rendering half a surrogate pair.
 */

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function avatarInitial(name: string): string {
  const first = graphemes.segment(name.trim())[Symbol.iterator]().next();
  return first.done === true ? '?' : first.value.segment.toUpperCase();
}
