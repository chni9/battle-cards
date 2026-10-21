# V7 Lot 72 — Foundations: task briefs

> Implements `docs/technical_spec_v7.md` (read it first) for Lot 72; parity checklist `docs/technical_spec_v7_parity.md`. Tracker: `docs/backlog_v7.md`.
> Each brief was drafted from the spec and the code on `dev` `1de498d`, then restructured by the 2026-10-21 backlog review; a **Review** line overrides the brief where they differ.

## Draft id → final id

Briefs below may cite other tasks by their draft id; use this table.

| Draft | Final |
|---|---|
| L72-01 | L72-01 |
| (new) | L72-02 |
| L73-01 | L72-03 |
| L73-02 | L72-04 |
| L72-02 | L72-05 |
| L72-03 | L72-06 |
| L72-03 | L72-07 |
| L72-04 | L72-08 |
| L72-05 | L72-09 |
| L72-06 | L72-10 |
| L72-08 | L72-11 |
| L72-07 | L72-12 |
| (new) | L72-13 |
| L72-09 | L72-14 |
| L72-10 | L72-15 |
| L72-11 | L72-16 |
| L72-12 | L72-17 |
| L72-13 | L72-18 |
| (new) | L72-19 |
| L72-14 | L72-20 |
| L72-15 | L72-21 |

Cross-lot moves: draft L73-01 → L72-03, L73-02 → L72-04, L73-03 → L73-01; draft L72-03 split into L72-06 (harness) and L72-07 (icons); draft L74-02 dropped (sheet stack is L72-09); draft L76-18 folded into the Lot 76 copy task; draft L81-02 folded into L81-01.

## Lot scope

Design system beside the V2 look, the pure-module moves, the shared `ui/` pieces other lots import, the component-test harness, art extraction, the holo Card and the table-only `?ui=next` switch. No protocol change. No old screen is recolored (§4.4). Catalog copy fixes open the V7 What's new entry (§10.4, §10.5). **Before this lot merges, the fixes waiting on `dev` (What's new `lot-72`) are promoted to `main`** (§4.6).

## L72-01 — Record V7 in AGENTS, decisions, deploy and PRODUCT.md

**Cx / risk:** M / Low · **Depends on:** — · **Spec:** §1, §2, §4.1, §4.6, §5.8, §10.3, §12.1, §12.4, §12.5, §15
**Files:** `AGENTS.md`, `docs/agent/decisions.md`, `docs/agent/deploy.md`, `docs/agent/frontend.md`, `PRODUCT.md`, `docs/backlog_v7.md`

Docs only. `AGENTS.md`: §1 says V6 closed at Lot 71 and V7 is in progress (`docs/technical_spec_v7.md` + Appendix A `technical_spec_v7_parity.md`, `docs/backlog_v7.md`, Lots 72–81, client-only redesign). §2 lists the V7 docs and says any later V6-style lot takes a number from 82 (spec header). Golden rule 7 gains one line: V7 changes no rule, no value and no protocol field (`PROTOCOL_VERSION` stays 45, spec §1). §9 points the open backlog and the DoD lines to `docs/backlog_v7.md` (V5 stays in parallel) and adds: touching tokens or `ui/` updates `DESIGN.md` (§12.5). Fix the stale `backlog_v3.md (active)` line in the §4 repo map. Golden rule 1: check it against the rules spec §2 mutual-attack paragraph. On this checkout it already carries the 2026-09-29 rule (commit 14a5ce9), so §10.3 is a verify-only step. The subagent rule already landed (8ba060f): verify only. The `.test.tsx` line moves to L72-03, the task that makes it true. `docs/agent/decisions.md` gets one dated `[P]` entry, "V7 visual redesign architecture". It records: the `ui/` / `view-model/` split and the pure-module moves (§4.1–4.3); tokens side by side and a per-screen switch (§4.4); the table-only `?ui=next` until L75; no protocol or server change (§1); the source-text test policy (§12.1); the Q12 one-PR-per-lot model and promotion freeze (§4.6); design-doc precedence (§5.8); and the 2026-10-20 subagent relaxation, which has no entry yet. It also records what V7 supersedes: technical spec v2 visual language, Lot 39 (`backlog_ux.md`) and the V6 Lots 43/53 table layout. Every function is kept. `docs/agent/deploy.md` documents: promote pending `dev` fixes before L72 merges; no `dev` → `main` promotion from the first V7 merge until the L75 flip, L76 and L77 are merged, unless the designer approves; hotfixes branch from `main` as the documented exception. Write `PRODUCT.md` at the repo root with Impeccable `init`. Inputs: audience (designer, friends, first-time beta testers), English only, phone portrait first, one dark theme, and the modes (table = Experience/Operate, admin = Operate, home = light Persuade) (§5.8). `docs/agent/frontend.md` Status points to spec v7, `PRODUCT.md` and `DESIGN.md` (arriving in L72-02), with precedence code > spec v7 §5 > `DESIGN.md`. `.gitignore`: confirm `.superpowers/` and `.impeccable/hook.cache.json` are ignored and `.impeccable/config.json` is committed (all from f883dfe, §12.4). **Watch point:** `.github/workflows/prod-from-dev.yml` rejects any PR into `main` whose head is not `dev`, which conflicts with the hotfix exception (see questions).

**Acceptance:** An agent reading only `AGENTS.md` + `decisions.md` can tell that V7 is in progress and client-only, that the protocol stays 45, that the open backlog is `backlog_v7.md` and that the promotion freeze applies. Golden rule 1 has the same meaning as rules spec §2 (no Lot 54 summed-volley wording). `PRODUCT.md` exists at the repo root. `deploy.md` describes the freeze and the hotfix path. No code changes. `pnpm verify` green.

**Review:** The §4.1 module-list regeneration and the §12.1 classification move to L72-02. Golden rule 1 is verify-only (already the 2026-09-29 rule on dev, commit 14a5ce9). Also gitignore `.claude/worktrees/` and commit `.claude/launch.json` (preview config).

## L72-02 — Split cross-screen source-text tests and record the classification

**Cx / risk:** M / Medium · **Depends on:** L72-01 · **Spec:** §4.1, §12.1
**Files:** `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`, `apps/client/src/**/*.test.ts (cross-screen source-text tests)`

Regenerate the §4.1 pure-module list (React-free modules under `design/` and `screens/table/`) and record a move / delete / retire disposition for each in `docs/backlog_v7.md`. Regenerate the `readFileSync` test list (§12.1) and re-check every row of `docs/backlog_v7_test_classification.md`. Split each source-text test file that reads files owned by several V7 lots (e.g. `design/components/visual-viewport.test.ts`, `feedback/feedback-surfaces.test.ts`, `help/tutorial-hints-independence.test.ts`) into one file per screen, so each lot later classifies only its own file. Assertions are moved verbatim, never loosened.

**Acceptance:** Every React-free module under `design/` and `screens/table/` has a disposition row. Every `readFileSync` test file appears in the classification with an owner lot. No test file reads sources owned by two lots. The number of `it()` cases is unchanged (moved, not dropped). `pnpm verify` green.

## L72-03 — Move fx, help, action-log and awards pure modules

**Cx / risk:** M / Low · **Depends on:** L72-02 · **Spec:** §4.1, §4.2, §4.3, §12.1, §12.2
**Parity (Appendix A):** `global-help-storage`, `home-whats-new-seen-storage`, `global-client-storage`, `table-action-log-entry-copy`, `table-action-log-resource-nets`, `table-action-log-post-lot61-lines`, `table-fx-token-chips`, `table-fx-threat`, `table-first-game-hints`, `end-awards-gallery`
**Files:** `apps/client/src/view-model/`, `apps/client/src/ui/`, `apps/client/src/fx/incoming-threat-diff.ts`, `apps/client/src/fx/threat-tone.ts`, `apps/client/src/fx/opponent-token-chips.ts`, `apps/client/src/fx/play-flyout.ts`, `apps/client/src/action-log/action-log.ts`, `apps/client/src/help/select-hint.ts`, `apps/client/src/help/hint-ids.ts`, `apps/client/src/help/help-storage.ts`, `apps/client/src/help/release-storage.ts`, `apps/client/src/screens/game-over-awards.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/end.tsx`, `apps/client/src/screens/game-over-dialog.tsx`, `apps/client/src/screens/home.tsx`, `apps/client/src/screens/whats-new-dialog.tsx`, `apps/client/src/help/hint-overlay.tsx`, `eslint.config.mjs`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

Create `apps/client/src/view-model/` (§4.2). Move the §4.1 modules that live outside `design/` and `screens/table/`, with their tests and in the destinations the `docs/backlog_v7.md` §4.1 list records. That list wins where L72 already moved a file. Proposed split: game knowledge goes to `view-model/` (`fx/incoming-threat-diff.ts`, `fx/threat-tone.ts`, `fx/opponent-token-chips.ts`, `action-log/action-log.ts`, `help/select-hint.ts`, `screens/game-over-awards.ts`). Storage and anchor helpers with no game knowledge go to `ui/` (`help/hint-ids.ts`, `help/help-storage.ts`, `help/release-storage.ts`, and the pure zone constants and selector builders of `fx/play-flyout.ts`; its DOM measuring stays in `fx/` until L74/L78). Code and assertions do not change. Only import paths and `readFileSync` paths move, and no re-export shim stays at an old path. At lot start, regenerate the §12.1 `readFileSync` list and update the test paths in the classification table. Source-text tests that read old-table files are classified in L75, not here. Add an ESLint override for `src/view-model/**` that rejects `react`, `react-dom` and `motion` imports and `Date.now()` / `performance.now()` (§4.3). `docs/agent/frontend.md` gains a V7 view-model convention: pure, no React, callers pass `nowMs`, behavior tests beside the module. Its mentions of these modules get their new paths.

**Acceptance:** Git shows renames plus import and path edits only. Every moved test passes with unchanged assertions. No moved module or shim is left under `fx/`, `help/` or `action-log/`. The lint override rejects a React import and `Date.now()` under `src/view-model/`. The old table, Home, What's new and Game over behave as before. `pnpm verify` green.

**Review:** Moved from Lot 73 to Lot 72 (backlog review 2026-10-21) so the parallel lots 76 and 80 start from the moved paths. Move only what the L72-02 disposition list says; update every importer, including home, lobby and Game over files.

_Draft id L73-01._

## L72-04 — Move design and table pure modules

**Cx / risk:** M / Low · **Depends on:** L72-03 · **Spec:** §4.1, §4.2, §5.8, §12.1
**Parity (Appendix A):** `global-art-catalog`, `global-card-effect-copy-inline-icons`, `global-visual-viewport-fit`, `table-shell-layout`, `opponent-seat`, `table-target-picker-eligibility`, `table-use-target-routing`, `table-inspect-active-upgrade`, `table-banners`, `table-tutorial-coach`, `table-chat-popup`
**Files:** `apps/client/src/ui/`, `apps/client/src/view-model/`, `apps/client/src/design/asset-lookup.ts`, `apps/client/src/design/seat-colors.ts`, `apps/client/src/design/components/effect-text-tokens.ts`, `apps/client/src/design/components/structured-cost.ts`, `apps/client/src/design/components/visual-viewport.ts`, `apps/client/src/screens/table/table-helpers.ts`, `apps/client/src/screens/table/opponent-seat-resources.ts`, `apps/client/src/screens/table/pending-chip-tone.ts`, `apps/client/src/screens/table/attack-targets.ts`, `apps/client/src/screens/table/chat-unread.ts`, `apps/client/src/screens/table/table-banner.ts`, `apps/client/src/screens/table/tutorial-coach-copy.ts`, `apps/client/src/screens/table/table-copy.ts`, `apps/client/src/screens/table.tsx`, `apps/client/src/screens/table/`, `apps/client/src/screens/lobby.tsx`, `docs/agent/frontend.md`, `docs/backlog_v7.md`, `DESIGN.md`

Move the §4.1 modules from `design/` and `screens/table/`, with their tests, in the destinations the `docs/backlog_v7.md` list records. Skip anything L72 already moved. Proposed: `asset-lookup.ts`, `seat-colors.ts`, `effect-text-tokens.ts`, `structured-cost.ts` and `visual-viewport.ts` go to `ui/`. `table-helpers.ts` (with `table-helpers-kit.test.ts`), `opponent-seat-resources.ts`, `pending-chip-tone.ts`, `attack-targets.ts`, `chat-unread.ts`, `table-banner.ts`, `tutorial-coach-copy.ts` and `table-copy.ts` go to `view-model/`. `persistent-incoming.ts` does not move: L73-07 deletes it. Code and assertions do not change. Only import paths and `readFileSync` paths are updated (the `play-flyout`, `asset-lookup`, `visual-viewport`, `opponent-seat-resources` and `table-banner` tests read other files). No shim stays at an old path. Update the moved module paths in `docs/agent/frontend.md` (`asset-lookup`, `seat-colors`, `table-banner`), and in `DESIGN.md` if it maps `ui/` contents (§5.8).

**Acceptance:** Git shows renames plus import and path edits only. Every moved test passes with unchanged assertions, including the Roulette art byte checks and the no-`100dvh` viewport test. The old table and lobby render as before. No file under `design/` or `screens/table/` still exports a moved function. `pnpm verify` green.

**Review:** Moved from Lot 73 to Lot 72 (backlog review 2026-10-21) so the parallel lots 76 and 80 start from the moved paths. Move only what the L72-02 disposition list says; update every importer, including home, lobby and Game over files.

_Draft id L73-02._

## L72-05 — Add V7 tokens, fonts and ground side by side

**Cx / risk:** M / Medium · **Depends on:** L72-01 · **Spec:** §4.4, §4.5, §5.1, §5.2, §5.3, §5.7, §5.8, §8.3, §12.4, §14.3
**Parity (Appendix A):** `global-motion-reduced-motion`, `global-text-input-no-ios-zoom`, `global-visual-viewport-fit`
**Files:** `apps/client/src/ui/tokens.css`, `apps/client/src/ui/palette.ts`, `apps/client/src/ui/fonts.ts`, `apps/client/src/ui/motion/`, `apps/client/src/index.css`, `apps/client/src/main.tsx`, `apps/client/package.json`, `pnpm-lock.yaml`, `.impeccable/config.json`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`apps/client/src/ui/tokens.css` declares, on `:root` and under their spec names: the §5.1 color tokens (`--bg-0` … `--mine`; `--ink` is outline and shadow only, never text) and the §5.3 shape tokens. Chrome shape: 3 px `--ink` outline, hard shadow `0 4px 0 var(--ink)`, 10–12 px radius. Card shape: 12 px radius, iridescent rim and gold rim gradients, `#fff → #f1edff` face, soft shadow. It also declares the §5.7 durations (`--dur-fast/base/slow`) and a type scale that respects the §5.2 floors (11 px functional text, 16 px text inputs). Tailwind v4 `@theme` exposes these under names that never reuse a V2 name (`ink`, `seat-*`, `radius-card`, `font-sans`…; check Tailwind v4 through Context7). `index.css` imports the file and no V2 token value changes (§4.4). Finalize the 8 dark-ground seat hues (§5.1, watch point §14.3). Mirror the palette in `ui/palette.ts` for inline styles (mobile Safari rule in the `seat-colors.ts` header). `ui/fonts.ts` loads `@fontsource/lilita-one`, `@fontsource/fredoka` 500–700 and `@fontsource/nunito` 700–900 next to Outfit, and is imported in `main.tsx` (§4.5, §5.2). Ground: `--bg-1` → `--bg-0` gradient, two radial halos at ~30% opacity and static 1-in-3 px scanlines. It is an opt-in class or component for V7 surfaces only, never on `html`/`body` (§5.1, §4.4). `ui/motion/`: the card spring (stiffness ≈ 400, damping ≈ 28), ease-out for entrances, durations mirrored from the CSS, and a pure helper that reduces any transition to fades and color flashes under reduced motion (§5.7, §8.3). Add the pre-approved scoped Impeccable ignore for `radial-spotlight-glow` / `dark-glow` on `ui/tokens.css` (§12.4). Create `DESIGN.md` at the repo root with Impeccable `document` over `ui/`, including the usage rule that seat hues never sit with `--life` / `--threat-*` in the same element (§5.1, §5.8). Add a "Design system (V7 · Lot 72+)" section to `frontend.md`: the side-by-side rule, the naming scheme, the opt-in ground, fonts and the palette mirror.

**Acceptance:** Tests: a WCAG ratio helper. `--text` and `--text-2` reach ≥ 4.5:1 on `--bg-0`, `--bg-1`, `--panel` and `--panel-2`. `--text-on-card` reaches ≥ 4.5:1 on both card-face stops. Every seat hue reaches ≥ 4.5:1 on the four grounds (seat names are text), and the hues are pairwise distinct by the metric recorded in `DESIGN.md`. CTA label/fill pairs (`--cta`, `--cta-2`, `--danger`) reach ≥ 4.5:1. A parity test shows `palette.ts` and `tokens.css` declare the same values. The reduced-motion helper returns no transform or scale. No V2 `@theme` value changes. `DESIGN.md` exists. Fonts are added with `pnpm add --filter @card-battle/client`. `pnpm verify` green.

_Draft id L72-02._

## L72-06 — Add the component-test harness

**Cx / risk:** S / Low · **Depends on:** L72-05 · **Spec:** §4.5, §5.6, §12.1, §12.2
**Parity (Appendix A):** `global-resource-captions`, `tutorial-overlays`
**Files:** `vitest.config.ts`, `apps/client/src/test/render.tsx`, `apps/client/package.json`, `pnpm-lock.yaml`, `AGENTS.md`, `docs/agent/testing.md`

Harness (§4.5, §12.2): `pnpm add -D --filter @card-battle/client @testing-library/react @testing-library/user-event happy-dom`. The client project in the root `vitest.config.ts` includes `src/**/*.test.{ts,tsx}`, the default environment stays `node`, and component tests opt in per file with `// @vitest-environment happy-dom`. One shared helper wires cleanup between tests, a reduced-motion stub and user-event setup, so later tasks never rebuild it. Docs: AGENTS.md §6 and `testing.md` gain the `.test.tsx` location and the V7 test policy. New V7 code gets behavior tests on the view-model or the rendered component. Existing `readFileSync` tests are classified only by the lot that rewrites the code they read (§12.1). Icons (§5.6): `ui/icons/` is a hand-made SVG set in the arcade style (2 px `--ink` stroke, palette fills). Resources: life, point, upgrade, shield. Statuses: spied-by-you, spying-on-you eye, shield active, Block, persistent, Invisibility + turns, Reanimation armed, Duplication active, eliminated, bot, disconnected, absorb window, ticking Sentence. UI: menu, shop, draw, log, help, coach, chat, feedback `!`, leave/forfeit flag, sound, vibration, rules, share, copy, minimize. Names come from an `as const` list in a `.ts` beside the components (react-refresh rule). Icons are decorative (`aria-hidden`) unless given a label. Help and coach are distinct glyphs (Q45). No emoji in shipped UI. `DESIGN.md` lists the set.

**Acceptance:** `.test.tsx` files run under happy-dom with the shared render helper, every existing `.test.ts` still runs in node with unchanged results, `scripts/**/*.test.ts` is collected, and AGENTS.md §6 / `testing.md` describe the convention. `pnpm verify` green.

**Review:** Split from the icon set (backlog review): this task is only the harness — testing-library, user-event, happy-dom, the client Vitest include `src/**/*.test.{ts,tsx}` plus `scripts/**/*.test.ts`, the per-file `// @vitest-environment happy-dom` convention, the shared render helper, and the `.test.tsx` lines in AGENTS.md §6 and `docs/agent/testing.md`.

_Draft id L72-03._

## L72-07 — Add the SVG icon set

**Cx / risk:** M / Low · **Depends on:** L72-06 · **Spec:** §4.5, §5.6, §12.1, §12.2
**Parity (Appendix A):** `global-resource-captions`, `tutorial-overlays`
**Files:** `apps/client/src/ui/icons/`, `DESIGN.md`

Harness (§4.5, §12.2): `pnpm add -D --filter @card-battle/client @testing-library/react @testing-library/user-event happy-dom`. The client project in the root `vitest.config.ts` includes `src/**/*.test.{ts,tsx}`, the default environment stays `node`, and component tests opt in per file with `// @vitest-environment happy-dom`. One shared helper wires cleanup between tests, a reduced-motion stub and user-event setup, so later tasks never rebuild it. Docs: AGENTS.md §6 and `testing.md` gain the `.test.tsx` location and the V7 test policy. New V7 code gets behavior tests on the view-model or the rendered component. Existing `readFileSync` tests are classified only by the lot that rewrites the code they read (§12.1). Icons (§5.6): `ui/icons/` is a hand-made SVG set in the arcade style (2 px `--ink` stroke, palette fills). Resources: life, point, upgrade, shield. Statuses: spied-by-you, spying-on-you eye, shield active, Block, persistent, Invisibility + turns, Reanimation armed, Duplication active, eliminated, bot, disconnected, absorb window, ticking Sentence. UI: menu, shop, draw, log, help, coach, chat, feedback `!`, leave/forfeit flag, sound, vibration, rules, share, copy, minimize. Names come from an `as const` list in a `.ts` beside the components (react-refresh rule). Icons are decorative (`aria-hidden`) unless given a label. Help and coach are distinct glyphs (Q45). No emoji in shipped UI. `DESIGN.md` lists the set.

**Acceptance:** Every §5.6 icon name renders a non-empty `<svg>` that is `aria-hidden` by default, icon-only controls built from them carry an `aria-label` / `title` (L59-01), no emoji remains in `ui/`, and the set appears in the `/dev/ui` gallery once it exists. `DESIGN.md` lists the set. `pnpm verify` green.

**Review:** Split from the harness (backlog review): this task is only the §5.6 icon set, with a role/label test per icon-only usage. Depends on the harness task.

_Draft id L72-03._

## L72-08 — Build arcade chrome primitives

**Cx / risk:** L / Medium · **Depends on:** L72-05, L72-06 · **Spec:** §4.2, §5.3, §5.7, §7.4, §11
**Parity (Appendix A):** `global-dialog-button-primitives`, `global-tooltip-unused`, `global-resource-captions`
**Files:** `apps/client/src/ui/primitives/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`ui/primitives/` controls, using tokens only and holding no game knowledge (§4.2, §5.3):
- **Button**: primary `--cta`, secondary `--cta-2`, danger and quiet variants. The pressed state translates 3 px and drops the shadow. Target ≥ 44 px. A disabled button keeps a slot for its visible reason (§11).
- **IconButton**: 44 px, `aria-label` required at the type level, optional count badge (unread).
- **Pill**: icon + value. A hidden value shows `?` and reads "{label} unknown". Keeps `data-resource-kind`.
- **Badge**: a status with "+n" overflow.
- **Avatar**: image with `alt`, or a seat-hue disc with the initial; eliminated treatment is grayscale + ✕.
- **Tabs**: roving focus, `aria-selected`.
- **Segmented**: radiogroup semantics.
- **Slider**: `onCommit` fires on release only (pointer up, key up, change end), per §7.4 "sends on release".
- **Toggle**: `aria-pressed`.
- **Tooltip**: opens on hover and focus, closes on Esc, and keeps the information today's native `title`s carry.
- **ScrollArea**: scrolls inside, never the page, with overscroll contained.

Reduced motion is honored (§5.7). Component files export components only. `DESIGN.md` and the `frontend.md` V7 component list are updated.

**Acceptance:** happy-dom tests for each primitive: roles and states (`aria-checked` radios, `aria-pressed`, `aria-selected`, arrow keys in the tablist); disabled blocks the handler; Slider calls `onCommit` exactly once on release and never while dragging or keying; Pill renders `?` and "{label} unknown"; Avatar alt and initial fallback; Tooltip opens on focus and closes on Esc; reduced motion drops the press animation. `pnpm verify` green.

**Review:** Also ships `TextField` (16 px floor), `Carousel` (shared by How to play and the awards gallery; grid at desktop width) and a kit tile, and creates the DEV-only `/dev/ui` gallery route (`import.meta.env.DEV`, absent from production builds, with a test). Every later `ui/` task adds its component to the gallery.

_Draft id L72-04._

## L72-09 — Build Sheet, Dialog and Toast with the stack contract

**Cx / risk:** L / High · **Depends on:** L72-08 · **Spec:** §6.6.5, §6.7, §6.12, §7.7, §10.6
**Parity (Appendix A):** `global-dialog-interaction-contract`, `global-dialog-width`, `global-visual-viewport-fit`, `table-sub-choice-non-dismissible`, `claim-seat-dismiss-stay`, `illegal-action-dialog`
**Files:** `apps/client/src/ui/primitives/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`ui/primitives/` gets Sheet (bottom sheet), Dialog (a bottom sheet on phones, centered on desktop, §7.7) and Toast. One stack manager implements the §6.7 contract:
- Blocking sheets always sit on top; any other open sheet is pushed underneath.
- Blocking sheets ignore Esc, backdrop and swipe. They offer **Minimize**, which collapses them to a bar that stays above every other sheet; the caller keeps intents locked.
- Read-only sheets stack one level and close on Esc, backdrop or swipe-down.
- Esc closes only the top sheet (Q49).

It keeps the Dialog contract: `role="dialog"`, `aria-modal`, a labelled title, focus trap, initial focus and focus restore; one dismiss path through the caller's `onClose`; the backdrop closes only on the overlay itself; `data-hint-anchor` passes through. The overlay is sized to `visualViewport` with `items-start` / `max-h-full` and `min(width, 100%)` panels, reusing `readVisualViewportBox` (L53-02/07). A collapsed-bar mode releases the focus trap; Minimize uses it now and L74 targeting later (§6.6.5). Toast is dismissed manually or by timeout, both through `onDismiss`. A prop or state update never dismisses it (§6.12). Reduced motion: fades only. New string "Minimize" (§10.6). `DESIGN.md` and `frontend.md` record that the V2 "Esc closes every open Dialog" note does not apply to V7 surfaces.

**Acceptance:** happy-dom tests: with two read-only sheets, Esc closes only the top one. A blocking sheet over a read-only one ignores Esc and backdrop. Minimize collapses it to a bar rendered above the others, and the bar restores it. Focus enters on open and returns on close. Tab wraps. A press inside the panel does not close it. Toast calls `onDismiss` once on manual close, once on timeout (fake timers), and never on rerender. Reduced motion renders no transform. Swipe and phone/desktop placement are checked in the L72 gate. `pnpm verify` green.

**Review:** Owns the whole §6.7 sheet-stack contract and its component tests (blocking sheets on top, Minimize bar, Esc closes only the top sheet, read-only stacking). Lot 74 consumes it and does not rebuild it.

_Draft id L72-05._

## L72-10 — Extract card and kit art with a contact sheet

**Cx / risk:** L / High · **Depends on:** L72-06 · **Spec:** §1, §4.5, §5.4, §5.5
**Parity (Appendix A):** `global-art-catalog`, `global-art-lot63-gambler-roulette`
**Files:** `apps/client/scripts/extract-art.ts`, `apps/client/src/assets/art/cards/`, `apps/client/src/assets/art/kits/`, `apps/client/src/design/asset-lookup.ts`, `apps/client/src/design/asset-lookup.test.ts`, `apps/client/tsconfig.json`, `eslint.config.mjs`, `apps/client/package.json`, `pnpm-lock.yaml`, `.gitignore`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`apps/client/scripts/extract-art.ts`, run with `pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts`, with `sharp` as a client dev dependency (§4.5, §5.5). The client has no `tsx` today (see questions). Sources are the base card PNGs (cream: not upgraded, not activated) and the kit PNGs in repo `images/`. They are mapped through the existing declared filename maps, moved into a glob-free module that `asset-lookup.ts` reuses, so the script never invents a mapping and never reads `(dead)`, `Draw.png` or `*_button.png`. For each art template the script crops to the drawing and drops the frame and baked numbers. It removes the ground by edge flood-fill only, never by a global color key. Committed output: `apps/client/src/assets/art/cards/<cardId>.png` (31, including Roulette) and `apps/client/src/assets/art/kits/<kitId>.png` (16, including Gambler). The script also writes a before/after contact sheet of all 47 assets to a gitignored folder (`.gitignore` entry in this task). The sheet is attached to the PR, and the designer signs it off before any screen stops using the old PNGs. `asset-lookup.ts` gains `artFor(cardId | kitId)`. The existing lookups and tests stay unchanged, because the old screens still use them. `apps/client/tsconfig.json` includes `scripts`, and ESLint gives `apps/client/scripts/**` Node globals. In `frontend.md`, the art convention says: drawings are keyed by id, values printed on PNGs are never authoritative (`KIT_CATALOG` wins), and upgraded/activated looks become code states. **Watch point:** pnpm 10 blocks install scripts (`onlyBuiltDependencies` lists only esbuild), and the Docker build stage installs dev dependencies. Confirm sharp's prebuilt binary loads both locally and in the Docker build.

**Acceptance:** `artFor` test: every `ALL_ART_CARD_IDS` and `KIT_IDS` entry resolves to `art/{cards,kits}/<id>.png`, and no resolved URL matches `(dead)`, `Draw.png` or `button`. The existing `asset-lookup.test.ts` assertions are unchanged and green. The script typechecks and lints. The contact sheet is attached to the PR. The Docker build stage still installs. Deps go through `pnpm add -D`. `pnpm verify` green.

**Review:** `artFor()` never throws: a missing file falls back to the verso, as the FX code does today. The flood-fill gets a unit test (enclosed light island survives, edge-connected ground cleared). `tsx` is added as a client dev dependency at the server's version; try `sharp` without `onlyBuiltDependencies` first and add it only if the install script is required.

_Draft id L72-06._

## L72-11 — Rebuild cost glyphs and effect copy in ui/

**Cx / risk:** M / Low · **Depends on:** L72-06 · **Spec:** §4.2, §6.6.1, §7.1, §10.5
**Parity (Appendix A):** `global-card-effect-copy-inline-icons`, `global-resource-captions`
**Files:** `apps/client/src/ui/card/`, `apps/client/src/ui/text/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

Shared text pieces for the card sheet (L74), the long-press sheets, the kit sheet, the coach panel and the How to play inline icons (L76) (§4.2, §6.6.1, §7.1):
- **Cost amount**: icon + number with sr-only spoken cost (`spokenCost`). It has an optional `title`; `title={null}` applies when a parent already names the action (L59-01). Supports cost/gain sign and a multiplier.
- **Effect text with inline V7 icons**, driven by the existing pure `effect-text-tokens.ts`.
- **Card effect copy**: a Cost icon row, then `effect` plus the "Upgrade — {upgradeAdds}" block for a base card, or `upgradeEffect` alone for an upgraded card. No play cost means no Cost row. An empty effect is omitted. Upgraded Regeneration shows 2 points per life.

Catalog text is unchanged here; the copy fixes are §10.5, in later lots. `DESIGN.md` and `frontend.md` are updated.

**Acceptance:** happy-dom behavior tests that assert today's card-effect-copy and cost-display outcomes:
- base vs upgraded blocks
- the Cost row is omitted when there is no cost
- Regeneration per-life rates
- "4 lives", "3 points", "2 upgrade points" and "4 shield points" render as icon + number with spoken text
- `title={null}` removes the tooltip

The old source-text tests stay untouched. `pnpm verify` green.

_Draft id L72-08._

## L72-12 — Build the holo Card component

**Cx / risk:** L / Medium · **Depends on:** L72-06, L72-10, L72-11 · **Spec:** §5.3, §5.4, §5.5, §6.6.5, §8.2, §8.3
**Parity (Appendix A):** `global-card-face`, `global-activated-art-guard`, `global-art-lot63-gambler-roulette`, `active-persistent-thumbs`, `sentence-chips`
**Files:** `apps/client/src/ui/card/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`ui/card/` Card for every family, size and state (§5.4).

**Anatomy:**
- Cost chip: violet gradient + number. Tax shows a life chip; Regeneration shows its per-life price, with the upgraded rate from `structuredPlayCost`.
- Damage chip: pink, from `listedAttackDamage(cardId, isUpgraded, damageMultiplier)`, on attacks only.
- Illustration from `artFor`.
- Name in Fredoka at the bottom.

**Sizes:** `hand` (`clamp(64px, 19vw, 120px)`, chips stacked on the left edge, no effect text), `lifted`, `sheet` (≥ 200 px, cost top-left and damage top-right), `thumb`, `tile`.

**Families:** attack and action get the iridescent rim; specials get the gold rim.

**States:**
- Upgraded: holo sheen + gold "+" badge, upgraded damage.
- Active persistent: pulsing glow + counter badge. Card lives speak as "N card lives" / "1 card life"; Invisibility shows turns as "N turns remaining" / "1 turn remaining".
- Unplayable: desaturated; the caller decides when.
- Selected: lift, scale, `--cta` outline, `aria-pressed`.
- Hidden: a code-rendered verso for each family.

Faces set `-webkit-touch-callout: none` and `user-select: none` and block the context menu (§6.6.5). An interactive face is a button: Enter or click calls back with the `instanceId`. Every face's accessible name includes the upgrade state and damage. Card never requests activated art: activated is a code state, so the Sentence/Shield guard holds by construction, and Roulette uses its base drawing. Reduced motion: no sheen sweep, no pulse. `DESIGN.md` and `frontend.md` are updated.

**Acceptance:** happy-dom tests:
- The damage chip equals catalog damage × multiplier for each attack, base and upgraded, and is absent on Tax, Absorber and Super Mirror (L56-04).
- Cost chip kinds: points, Tax life, Regeneration per-life (base and upgraded rate).
- Upgraded shows the badge and an accessible "upgraded".
- Counter labels, including the singulars.
- A hidden face exposes neither name nor art.
- `contextmenu` default is prevented.
- Click and Enter call back with the instance id.
- The hand size renders no effect text.
- Reduced motion removes the animated sheen and pulse.

`pnpm verify` green.

**Review:** Depends on the cost-glyph task (it consumes its `ui/card` cost chip).

_Draft id L72-07._

## L72-13 — Correct outdated catalog text (§10.5)

**Cx / risk:** S / Low · **Depends on:** L72-01 · **Spec:** §10.4, §10.5
**Files:** `packages/shared/src/domain/special-card-catalog.ts`, `packages/shared/src/domain/card-catalog.ts`, `their tests`, `packages/shared/src/release-notes.ts`

Copy-only edits in `packages/shared`: Attack Thief `effect` / `upgradeEffect` ("Block every attack already pending against you, and steal a random attack card from each opponent." / "…and steal all attack cards from all opponents.", Lot 68) and the Absorber+ / Super Absorber+ upgrade lines ("every point and upgrade point that left them, including sales and thefts; never shield", Lot 68). Update the catalog and label tests that pin them. No protocol change. Open the V7 What's new entry if none is open (§10.4) with After `Fixed some bugs.`, updating the latest-id pin tests.

**Acceptance:** The catalog strings match §10.5, their tests pin the new text, and the old table inspect shows it. The V7 What's new entry exists and the latest-id tests pass. PR lists the strings for designer review. `pnpm verify` green.

## L72-14 — Rebuild ChatLog in ui/

**Cx / risk:** S / Low · **Depends on:** L72-08 · **Spec:** §4.2, §5.2, §6.9, §7.5
**Parity (Appendix A):** `chat-compose-enter`, `lobby-chat`, `table-chat-popup`, `chat-new-message-announcement`, `table-chat-side-stream-disclosure`, `lobby-chat-walk-in-spectator-stream`, `end-finished-chat-readonly`, `global-text-input-no-ios-zoom`
**Files:** `apps/client/src/ui/chat/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`ui/chat/` transcript + composer, so the lobby (L76) and the arena (L74) stop importing `screens/table/chat-log.tsx` (§4.2, §6.9, §7.5).
- Each line shows the round label (`chatRoundLabel`) and the nickname in its seat hue, with a fallback for an unknown sender.
- Eliminated and spectator lines are styled apart and carry their role label.
- Empty state: "No messages yet."
- The transcript scrolls to the newest line on update.
- The composer appears only when `canWrite`. Enter or Send submits, whitespace-only text is not sent, and the form resets after a send.
- `maxLength` comes from `CHAT_BODY_MAX_LENGTH`, not a literal 200.
- The input is ≥ 16 px computed and ≥ 44 px tall (iOS zoom rule).
- Optional label/placeholder override, for the walk-in "Spectators only see this" used in L76.

No unread logic here (`chat-unread.ts` belongs to L73/L74). The old ChatLog stays until its consumers migrate.

**Acceptance:** happy-dom tests:
- round label + nickname on each line
- the side-stream role label
- the empty state
- Enter sends the body and resets the form
- whitespace is not sent
- no composer when `canWrite` is false
- `maxLength === CHAT_BODY_MAX_LENGTH`

The 16 px computed size is verified in the L72 gate. `pnpm verify` green.

_Draft id L72-09._

## L72-15 — Rebuild kit details and kit portrait in ui/

**Cx / risk:** M / Low · **Depends on:** L72-12, L72-11 · **Spec:** §4.2, §5.5, §6.6.5, §7.3, §11
**Parity (Appendix A):** `kit-inspect-dialog`, `lobby-kit-picker-dialog`, `home-solo-kit-picker`, `global-art-catalog`
**Files:** `apps/client/src/ui/kit/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`ui/kit/` gets a KitPortrait and kit details.

**KitPortrait:** art from `artFor(kitId)`, `alt` = kit name (§11), a distinct placeholder face for hidden and for Random, and an eliminated grayscale.

**Kit details** replace `screens/table/kit-inspect-details.tsx` for the kit sheet (L74) and the kit picker (L76) (§4.2, §6.6.5, §7.3). They show:
- the name and the portrait
- starting resources (lives, points, upgrade points, Draw +N), from `KIT_CATALOG`, never PNG values (§5.5)
- the starting hand as attack/action versos × count, never prose (L51-04)
- special cards as Card thumbs with play costs, with keys safe for duplicates
- every `KitTraits` section (Always upgraded, Immune to, Attacks per turn, Upgrade point buy/sell, Draw risk) and the Ghost, Duplicator, Prophet and Gambler ability copy from the existing `kit-inspect-traits.ts`
- "None" for empty groups

Copy is unchanged; the Prophet fix is L76 (§10.1).

**Acceptance:** happy-dom tests:
- For every `KIT_IDS` kit, every `KIT_TRAIT_SECTION_KEYS` section and the catalog starting values render.
- Specialist's duplicate specials each render.
- The starting hand renders verso faces with counts and no "action · attack" prose.
- The portrait `alt` is the kit name.
- Gambler values match `KIT_CATALOG`.

`pnpm verify` green.

_Draft id L72-10._

## L72-16 — Rebuild the table rules strip and sheet in ui/

**Cx / risk:** M / Low · **Depends on:** L72-09, L72-15 · **Spec:** §6.11, §7.4, §7.6, §10.6, §11
**Parity (Appendix A):** `lobby-rules-summary`, `rules-recall-table-end`
**Files:** `apps/client/src/ui/rules/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`ui/rules/` read-only house-rules strip and sheet, shared by the arena recall (L74, §6.11), the Game over recall (L77, §7.6) and lobby guests and walk-ins (L76, §7.4). The strip shows:
- a clock icon + `{turnTimeSeconds}s` from the `LobbyRules` it receives (server-effective, never a client constant)
- a Random-only mark with a distinct Random face
- all 16 kit faces, with excluded kits greyed **and** labelled "Excluded" (never color alone, Q15)

Tapping the strip opens the read-only sheet: turn time, Random only, excluded kits. The input is a `LobbyRules` value; where it comes from (`rulesRecall`) is L73. The host editor (slider sends on release, All / None / Random, kit toggles, guardrails) joins this component in L76. New strings: "Table rules", "Excluded" (§10.6).

**Acceptance:** happy-dom tests:
- seconds render from the prop, including a server default above 180
- the Random-only mark appears only when it is set
- each excluded kit carries the "Excluded" label and allowed kits do not
- tapping the strip opens a read-only sheet with no editable control

`pnpm verify` green.

_Draft id L72-11._

## L72-17 — Rebuild the coach panel in ui/

**Cx / risk:** S / Low · **Depends on:** L72-08, L72-11 · **Spec:** §4.2, §6.12, §8.3
**Parity (Appendix A):** `table-tutorial-coach`, `table-first-game-hints`, `first-game-hint-host`, `tutorial-overlays`
**Files:** `apps/client/src/ui/coach/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`ui/coach/` CoachPanel replaces `design/components/coach-panel.tsx` for the tutorial coach and the first-game hints, which are re-anchored in L75 (§4.2, §6.12).
- It hovers and is not a Dialog: the table stays clickable around it.
- Title + body go through the existing `parseCoachBody`: bold markers, and resource words as V7 cost glyphs or icons.
- A hide × with an `aria-label` passed by the caller ("Hide coach").
- A footer slot (Got it / Skip all).
- A compact translucent variant for hints.
- `data-zone` and extra data attributes pass through (`data-hint-id`, `data-tutorial-*`).
- No Skip control: Skip stays on the table flag (Lot 45).
- Reduced motion: no enter animation.

Strings always come from the shared scripts and the hint copy, never from the client. Callouts and tour highlights are L75.

**Acceptance:** happy-dom tests:
- body markers and resource words render icon glyphs with spoken text
- × calls `onHide`
- the footer renders
- data attributes reach the root
- the panel has no `role="dialog"` and no Skip control
- reduced motion skips the enter animation

`pnpm verify` green.

_Draft id L72-12._

## L72-18 — Rebuild table banner cues in ui/

**Cx / risk:** M / Medium · **Depends on:** L72-05, L72-06 · **Spec:** §4.2, §6.12, §8.1, §8.3
**Parity (Appendix A):** `table-banners`, `end-finished-board-shell`, `global-motion-reduced-motion`
**Files:** `apps/client/src/ui/banner/`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

`ui/banner/` renders the `TableBannerFlash` cues, so the arena (L74) and the Game over delay (L77, `TABLE_BANNER_MS`) never import `screens/table/your-turn-flash.tsx` (§4.2, §6.12, §8.1). A queue plays one cue at a time for `TABLE_BANNER_MS`:
- "Your turn", in the POV seat hue
- "You are being attacked", in attack tone and flashier
- "You are dead"
- "You won!"
- table-wide Sentence lines, announced `aria-live` assertive, spectators included (L63-03)
- the POV's own Gambler wipe line (L67-01)

The banner has `role="status"` and no pointer events. Reduced motion: fade only. Cue logic stays in the pure `table-banner.ts`, which L73 moves; it is called as today. Copy comes from `TABLE_BANNER_COPY` / `WIPE_BANNER_COPY`. Juice comes in L78.

**Acceptance:** happy-dom tests with fake timers:
- queued cues play in order, each for `TABLE_BANNER_MS`
- Sentence lines are announced assertively
- the wipe line shows only for the POV's own bust
- the first mount seeds won, dead and turn, but no log history
- reduced motion renders no slam transform

`pnpm verify` green.

_Draft id L72-13._

## L72-19 — Rebuild BotSeatLabel, PlayerName and ConnectionBadge in ui/

**Cx / risk:** S / Low · **Depends on:** L72-08 · **Spec:** §4.2, §6.2
**Parity (Appendix A):** `global-connection-badge`
**Files:** `apps/client/src/ui/seat/`, `DESIGN.md`, `docs/agent/frontend.md`

These three are imported by the table, the lobby and Game over (§4.2). Rebuild them in `ui/` in the V7 style (seat color from the V7 palette, bot difficulty label, connection state: disconnected grace, absent N/3, idle N/5), keeping their props and copy, so Lots 74, 76 and 77 share one implementation. Old screens keep importing the old ones until their lot migrates.

**Acceptance:** Component tests render each state from a fake seat and assert the visible text and `aria` labels match today's copy. Added to the `/dev/ui` gallery. `pnpm verify` green.

## L72-20 — Add the ?ui=next table switch

**Cx / risk:** S / Medium · **Depends on:** L72-01 · **Spec:** §4.4, §12.1
**Parity (Appendix A):** `global-app-router`, `global-client-storage`, `end-finished-board-shell`, `finished-board-readonly`, `table-tutorial-flow`
**Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/end.tsx`, `apps/client/src/screens/arena/`, `apps/client/src/ui-switch.ts`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

A pure resolver plus storage (§4.4):
- `?ui=next` selects V7 and persists `localStorage['card-battle.v7.ui']`.
- `?ui=classic` clears the key.
- Otherwise the stored value applies.
- Tutorial rooms (`playKind === 'tutorial'`) always get the classic table.
- Every storage access sits in try/catch.

The switch is wired at both table mount points: `App.tsx` (playing) and the finished board inside `EndScreen`. They render `screens/arena/arena-screen.tsx`, which takes the `TableScreen` props. Until L74 replaces its body, it renders the classic table (see questions). Home, lobby, the Game over dialog and `/admin` ignore the switch. In `frontend.md`, document the switch, its key, the tutorial exclusion and its removal in L75, and add the key to the storage list.

**Acceptance:** Resolver tests: next, classic, stored, tutorial and a throwing storage. With the switch on or off the same table renders today. The literals asserted by the `inbox-route`, `admin-route`, `claim-seat-dialog`, `tutorial-hints-independence` and `feedback-surfaces` source-text tests stay in place; no code is deleted, so nothing needs classifying. `pnpm verify` green.

_Draft id L72-14._

## L72-21 — Run the Lot 72 design and browser gate

**Cx / risk:** M / Low · **Depends on:** L72-01…L72-20 · **Spec:** §4.4, §5.5, §12.3, §12.4
**Parity (Appendix A):** `global-text-input-no-ios-zoom`, `global-visual-viewport-fit`
**Files:** `docs/agent/frontend.md`, `docs/backlog_v7.md`

§12.3 / §12.4 on Lot 72's surfaces:
1. Run the Impeccable detector on the shipped V7 files (`ui/`, `tokens.css`, `assets/art/`) and fix every finding. The only allowed ignore is the pre-approved halo ignore.
2. Run an Impeccable `critique` of the tokens, primitives, Card and the contact sheet.
3. Browser check at 375×812 and 1440×900: Home, lobby, a 4-seat solo table and Game over look as they did before the side-by-side tokens and fonts landed (§4.4).
4. Check that `?ui=next` survives a reload, `?ui=classic` clears it, and the tutorial ignores it.
5. Check that the V7 chat input computes to ≥ 16 px.
6. Record the results with room codes under "Lot 72 verified" in `frontend.md`.

Fix each defect, re-verify, and commit before Lot 73.

**Acceptance:** The detector is clean on V7 files. Critique notes are in the PR. "Lot 72 verified" with room codes is in `frontend.md`. Contact-sheet sign-off is recorded, or marked pending before any screen uses the new art. `pnpm verify` green.

**Review:** Pre-merge check: the fixes waiting on `dev` (What's new `lot-72`) are already promoted to `main` (§4.6). Review the `/dev/ui` gallery with Impeccable `critique`.

_Draft id L72-15._

## Draft questions and their dispositions

Resolved in the 2026-10-21 backlog review unless listed under "Designer questions still open" in `docs/backlog_v7.md`; dispositions are recorded in the **Review** lines above and in the amended spec.

- `?ui=next` before L74: what should `screens/arena/arena-screen.tsx` render in L72? The default here is a pass-through to the classic `TableScreen`, so the switch path is wired and testable without stranding testers on staging. The alternative is to ship only the resolver in L72 and wire it in L74.
- Visual review surface: the L72 components and Card are not mounted on any screen, but §12.3 / §12.4 need something rendered to critique. Should L72 add a DEV-only gallery route behind `import.meta.env.DEV`? That is not in the spec. The alternative is to critique only the contact sheet and code in L72 and do the first visual review in L74 / L76.
- The §5.5 command `pnpm --filter @card-battle/client exec tsx …` needs `tsx`, which only `@card-battle/server` has (4.23.1); it is not in the root `.bin`. OK to add `tsx` as a client dev dependency at the same version? §4.5 lists only `sharp`.
- sharp under pnpm 10: `onlyBuiltDependencies` lists only esbuild, and the Docker build stage installs dev dependencies. If sharp needs its install script, may it be added to `onlyBuiltDependencies`? The other option is to keep sharp off the Docker path.
- Hotfix exception vs CI: `.github/workflows/prod-from-dev.yml` fails every PR into `main` whose head is not `dev`, so the §4.6 hotfix-from-`main` exception cannot pass as written. Should L72-01 also allow a hotfix head-branch pattern in that workflow (a CI change), or should hotfixes take another path?
- Golden rule 1 on this checkout already carries the 2026-09-29 rule (commit 14a5ce9, no Lot 54 summed volley). L72-01 only verifies it. Should spec §10.3's stale sentence be amended in the same commit, or left as is?
- DESIGN.md timing: Impeccable `document` derives from the code, and before L72-02 the only tokens are V2. So `DESIGN.md` is created in L72-02 and every later `ui/` task updates it, while `PRODUCT.md` stays in L72-01. Is that split OK, given that §15 groups both under Docs?
- Seat hues 'contrast check against each other' (§5.1): which metric and threshold? Options are a minimum CIEDE2000 distance or a minimum mutual contrast ratio. It will be recorded in `DESIGN.md` and locked by the L72-02 test.
- Tailwind `@theme` names: the V7 tokens collide with V2 utility names (`ink`, `seat-*`, `radius-card`, `font-sans`). Which namespace should V7 use? For example a `v7-` prefix kept until L81, or V7-only words. Should L81 rename them once V2 is gone?
- Rules sheet scope: L72-11 builds the read-only strip and sheet. The host editor (slider on release, All / None / Random, kit toggles, guardrails, "Server default") is used only by the Home solo menu and the lobby, both L76, so it is left to L76 on the same `ui/rules` component. Confirm?
- BotSeatLabel, the seat-colored PlayerName and ConnectionBadge are imported by both the table and the lobby / Game over. §4.2 does not list them as shared pieces. Should L72 also rebuild them in `ui/` so the parallel L74 and L76 sessions do not each build their own?
- Art safety: `artFor` (like `getCardArtUrl`) would throw on a missing file and blank the app, since there is no error boundary. Should V7 render paths fall back to the verso instead, as the FX code does? The parity note says this needs a decision.
- Flood-fill test: a unit test of the edge flood-fill (an enclosed light island survives, edge-connected ground is cleared) means adding `scripts/**/*.test.ts` to the client Vitest include, beyond §4.5. Add it, or rely on the contact-sheet sign-off alone?
- What's new: §10.4 names L73 and L80 as adding nothing. L72 has no player-visible change either (the switch is a tester flag), so these tasks add no item. Confirm?
- `.claude/` (`launch.json`, `worktrees/`) is untracked on this branch. Should L72-01 gitignore `.claude/worktrees/` (and commit or ignore `launch.json`), or leave it out of V7?

