// @vitest-environment happy-dom
/**
 * What's new, rendered on the real catalog: technical spec v7 §7.1, §7.7, §10.4; Appendix A
 * `home-whats-new`, `home-whats-new-dismiss`, `global-card-face`; L63-07, L65-05 (L76-05). Replaces
 * the source-text halves of `whats-new-dialog.test.ts`, which keeps the catalog pins. Shipped
 * entries are never rewritten (release-notes.ts header), so lot-63 stays an entry with items and additions.
 */
import {
  getCard, getKit, latestReleaseNote, RELEASE_NOTES,
  type CardId, type KitId, type WhatsNewScope,
} from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { stubPhoneViewport, swipeSheetDown } from '../test/sheet-gestures';
import { cardDamageChip, cardFaceLabel } from '../ui/card/card-face';
import { WhatsNewDialog } from './whats-new-dialog';

const TITLE = "What's new";
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: TITLE });
const rows = (root: HTMLElement, hook: string): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(`[${hook}]`));
function entry(id: string): HTMLElement {
  const found = sheet().querySelector<HTMLElement>(`[data-release-id="${id}"]`);
  if (found === null) throw new Error(`no entry ${id}`);
  return found;
}
/** [kit portrait alt, card thumb label]: a row shows at most one of them. */
type Art = readonly [string | null, string | null];
const artOf = (row: HTMLElement): Art => [
  within(row).queryByRole('img')?.getAttribute('alt') ?? null,
  within(row).queryByRole('article')?.getAttribute('aria-label') ?? null,
];
function expectedArt(art: { readonly kitId?: KitId; readonly cardId?: CardId }): Art {
  if (art.kitId !== undefined) return [getKit(art.kitId).name, null];
  if (art.cardId !== undefined) {
    const name = getCard(art.cardId)?.name ?? art.cardId;
    return [null, cardFaceLabel({ name, isUpgraded: false, damage: cardDamageChip(art.cardId, false) })];
  }
  return [null, null];
}
function renderSheet(scope: WhatsNewScope) {
  const onClose = vi.fn();
  return { onClose, ...renderUi(<WhatsNewDialog open scope={scope} onClose={onClose} />, { reducedMotion: true }) };
}
/** Home's wiring: every onClose closes the sheet. */
function Harness({ onClose }: { readonly onClose: () => void }): ReactElement {
  const [open, setOpen] = useState(true);
  return <WhatsNewDialog open={open} scope="current" onClose={() => { onClose(); setOpen(false); }} />;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("What's new sheet (spec v7 §7.1, §10.4; L63-07, L65-05)", () => {
  it('renders the latest entry alone in the current scope, with no Latest tag', () => {
    renderSheet('current');
    const latest = latestReleaseNote();
    expect(sheet().getAttribute('data-home-sheet')).toBe('whats-new');
    expect(sheet().querySelector('[data-whats-new-scope]')?.getAttribute('data-whats-new-scope')).toBe('current');
    expect(rows(sheet(), 'data-release-id').map((row) => row.getAttribute('data-release-id'))).toEqual([latest.id]);
    expect([entry(latest.id).querySelector('p')?.textContent, within(entry(latest.id)).getByRole('heading', { level: 3 }).textContent])
      .toEqual([latest.date, latest.title]);
    expect(within(sheet()).queryByText('Latest')).toBeNull();
    expect(within(sheet()).getByRole('button', { name: 'Got it' })).toBeTruthy();
  });

  it('renders every entry in catalog order in the history scope, Latest under the first title only', () => {
    renderSheet('history');
    expect(sheet().querySelector('[data-whats-new-scope]')?.getAttribute('data-whats-new-scope')).toBe('history');
    expect(rows(sheet(), 'data-release-id').map((row) => [row.getAttribute('data-release-id'), row.querySelector('p')?.textContent, within(row).getByRole('heading', { level: 3 }).textContent]))
      .toEqual(RELEASE_NOTES.map((note) => [note.id, note.date, note.title]));
    const [tag, ...others] = within(sheet()).getAllByText('Latest');
    if (tag === undefined) throw new Error('no Latest tag');
    expect(others).toEqual([]);
    const first = entry(latestReleaseNote().id);
    expect(tag.closest('[data-release-id]')).toBe(first);
    expect(within(first).getByRole('heading', { level: 3 }).compareDocumentPosition(tag) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it("renders each entry's Before and After items with the card or kit art they name", () => {
    renderSheet('history');
    for (const note of RELEASE_NOTES) {
      const items = rows(entry(note.id), 'data-whats-new-item');
      expect(items.map((row) => Array.from(row.querySelectorAll('p'), (p) => p.textContent)))
        .toEqual(note.items.map((item) => [`Before. ${item.before}`, `After. ${item.after}`]));
      expect(items.map(artOf)).toEqual(note.items.map((item) => expectedArt(item)));
    }
  });

  it('lists additions under New after the items, with their art, and no New section without additions', () => {
    renderSheet('history');
    expect(RELEASE_NOTES.some((note) => note.items.length > 0 && note.additions.length > 0)).toBe(true);
    for (const note of RELEASE_NOTES) {
      const section = entry(note.id).querySelector<HTMLElement>('[data-whats-new-section="new"]');
      if (note.additions.length === 0) {
        expect(section).toBeNull();
        continue;
      }
      if (section === null) throw new Error(`no New section on ${note.id}`);
      expect(within(section).getByRole('heading', { level: 4 }).textContent).toBe('New');
      for (const item of rows(entry(note.id), 'data-whats-new-item')) {
        expect(item.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
      }
      const additions = rows(section, 'data-whats-new-addition');
      expect(additions.map((row) => row.querySelector('p')?.textContent)).toEqual(note.additions.map((addition) => addition.body));
      expect(additions.map(artOf)).toEqual(note.additions.map((addition) =>
        expectedArt(addition.kind === 'kit' ? { kitId: addition.kitId } : { cardId: addition.cardId })));
    }
  });

  it.each(['Got it', 'Escape', 'backdrop', 'swipe'] as const)('a %s dismissal calls onClose once and closes the sheet (L65-05)', async (way) => {
    stubPhoneViewport(); // a bottom sheet with its swipe handle, whatever the default window
    const onClose = vi.fn();
    const { user } = renderUi(<Harness onClose={onClose} />, { reducedMotion: true });
    const dialog = sheet();
    if (way === 'Escape') {
      await user.keyboard('{Escape}');
    } else if (way === 'swipe') {
      swipeSheetDown(dialog);
    } else if (way === 'backdrop') {
      const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
      if (overlay === null) throw new Error('no backdrop');
      await user.click(overlay);
    } else {
      await user.click(within(dialog).getByRole('button', { name: way }));
    }
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: TITLE, hidden: true })).toBeNull(); });
  });

  it('calls onClose once per open: a double Got it and a later Esc count once until it reopens', async () => {
    const { user, rerender, onClose } = renderSheet('history');
    await user.dblClick(within(sheet()).getByRole('button', { name: 'Got it' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<WhatsNewDialog open={false} scope="history" onClose={onClose} />);
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: TITLE, hidden: true })).toBeNull(); });
    rerender(<WhatsNewDialog open scope="current" onClose={onClose} />);
    await user.click(within(sheet()).getByRole('button', { name: 'Got it' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
