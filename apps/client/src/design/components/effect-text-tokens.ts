/**
 * Tokenize catalog effect / upgradeAdds resource phrases (L51-12).
 * Presentation amounts come from the catalog strings, not invented values.
 */

import type { ResourceKind } from '../asset-lookup';

export interface EffectResourceSpan {
  start: number;
  end: number;
  amount: number;
  kind: ResourceKind;
  /** True when this span replaced an `instead of N` tail. */
  insteadOf: boolean;
}

const RESOURCE_RE =
  /(\d+)\s+(upgrade points?|points?|lives?|life|shield points?|shield)\b/gi;
const INSTEAD_RE = /instead of (\d+)\b/gi;

function kindFromWord(word: string): ResourceKind {
  const lower = word.toLowerCase();
  if (lower === 'upgrade point' || lower === 'upgrade points') {
    return 'upgradePoint';
  }
  if (lower === 'life' || lower === 'lives') {
    return 'life';
  }
  if (lower === 'shield' || lower === 'shield point' || lower === 'shield points') {
    return 'shield';
  }
  return 'point';
}

export function tokenizeEffectResources(text: string): EffectResourceSpan[] {
  const raw: {
    start: number;
    end: number;
    type: 'resource' | 'instead';
    amount: number;
    word?: string;
  }[] = [];

  for (const match of text.matchAll(new RegExp(RESOURCE_RE.source, 'gi'))) {
    const amount = match[1];
    const word = match[2];
    if (amount === undefined || word === undefined) {
      continue;
    }
    raw.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'resource',
      amount: Number(amount),
      word,
    });
  }

  for (const match of text.matchAll(new RegExp(INSTEAD_RE.source, 'gi'))) {
    const amount = match[1];
    if (amount === undefined) {
      continue;
    }
    raw.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'instead',
      amount: Number(amount),
    });
  }

  raw.sort((a, b) => a.start - b.start);

  const spans: EffectResourceSpan[] = [];
  let lastKind: ResourceKind | undefined;
  let cursor = 0;
  for (const item of raw) {
    if (item.start < cursor) {
      continue;
    }
    if (item.type === 'resource' && item.word !== undefined) {
      const kind = kindFromWord(item.word);
      lastKind = kind;
      spans.push({
        start: item.start,
        end: item.end,
        amount: item.amount,
        kind,
        insteadOf: false,
      });
      cursor = item.end;
      continue;
    }
    if (item.type === 'instead' && lastKind !== undefined) {
      spans.push({
        start: item.start,
        end: item.end,
        amount: item.amount,
        kind: lastKind,
        insteadOf: true,
      });
      cursor = item.end;
    }
  }
  return spans;
}
