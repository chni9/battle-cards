/**
 * V7 self-hosted fonts (technical spec v7 §4.5, §5.2). Side-effect imports only; the
 * family stacks live in `ui/tokens.css` (`--font-v7-*`).
 *
 * - Lilita One: titles, buttons, UI numerals, seat names.
 * - Fredoka 500-700: everything printed on a card.
 * - Nunito 700-900: body text, descriptions, log lines, labels.
 *
 * Outfit stays imported in `main.tsx` until L81 removes it.
 */

import '@fontsource/lilita-one/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
