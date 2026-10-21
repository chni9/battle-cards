# V7 Lot 72 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V7 "Arcade Holo" foundations beside the V2 look — pure-module moves, design tokens and fonts, test harness, icons, primitives and the sheet stack, extracted art, the holo Card, the shared `ui/` pieces other lots import, catalog copy fixes and the table-only `?ui=next` switch — without changing any rule, value, protocol field or old screen.

**Architecture:** New presentation code lives in `apps/client/src/ui/` (no game knowledge); game knowledge moves, unchanged, into `apps/client/src/view-model/` (pure, React-free, clock-free). V7 tokens sit side by side with the V2 theme; nothing on screen changes for players except the corrected catalog text. Every component is reviewable on a DEV-only `/dev/ui` gallery.

**Tech Stack:** TypeScript (strict) · React 19 · Vite · Tailwind v4 (`@theme inline`, `v7-` namespace) · motion · Vitest 4 (node + happy-dom per file) · @testing-library/react + user-event · sharp + tsx (one-off art script) · @fontsource (Lilita One, Fredoka, Nunito) · Impeccable (PRODUCT.md / DESIGN.md / detector / critique).

**Spec:** `docs/technical_spec_v7.md` (normative; §4, §5, §10.3–10.6, §12, §15 row 72) with Appendix A `docs/technical_spec_v7_parity.md`. Tracker: `docs/backlog_v7.md` Lot 72. Test classification: `docs/backlog_v7_test_classification.md`.

> Generated 2026-10-21: one shared interface contract (below), one planning agent per task, a cross-task critic (13 fixes applied) and a compression pass. Each task ends with **Decisions** — choices the executor cannot derive from the spec; they are binding unless the designer overrides them in review.

## Global Constraints

- PROTOCOL_VERSION stays 45 (packages/shared/src/protocol-version.ts). No protocol field, no intent change, no server or engine change, no Classic rule or value change. L72-13's only shared edits are copy-only catalog strings (§10.5) and the release-notes entry.
- Side by side only (§4.4): no old screen is recolored; index.css V2 @theme and :root values do not change; V7 tokens live in apps/client/src/ui/tokens.css; the ground is opt-in and never on html, body or #root.
- Color tokens (§5.1): --bg-0 #0c0920, --bg-1 #17113a, --glow-a #ff3d7f, --glow-b #3da9ff (halos at ~30% opacity), --panel #1f1850, --panel-2 #2b2256, --ink #0c0920 (outline and shadow only, never text), --text #f3eeff, --text-2 #cfc6ff, --text-on-card #2a2550, --life #ff3d7f, --point #ffc93d, --upgrade #3dcf8f, --shield #6b8cff, --cta #ffd43d, --cta-2 #3da9ff, --danger #ff4d4d, --threat-attack #ff3d7f, --threat-other #ffa53d, --mine #3da9ff, --seat-0..7 (8 hues finalized in L72-05). Scanlines rgba(255,255,255,.03), 1 px every 3 px, on the page ground only.
- Contrast: WCAG AA 4.5:1 for body text and 3:1 for large text. --text and --text-2 ≥ 4.5:1 on --bg-0, --bg-1, --panel and --panel-2. --text-on-card ≥ 4.5:1 on #fff and #f1edff. Every seat hue ≥ 4.5:1 on the four grounds and pairwise distinct by the DESIGN.md metric. CTA label/fill pairs (--cta, --cta-2, --danger) ≥ 4.5:1.
- Typography (§5.2): Lilita One for titles, buttons, UI numerals and seat names; Fredoka 500–700 for everything printed on a card; Nunito 700–900 for body, descriptions, log lines and labels. All self-hosted via @fontsource; @fontsource/outfit stays until L81. Floors: 11 px for any functional text, 16 px for text inputs (no iOS focus zoom). Own lives ≥ 20 px and the incoming damage badge ≥ 22 px on a 375 px phone.
- Shapes (§5.3): arcade chrome = 3 px --ink outline, hard shadow `0 4px 0 var(--ink)`, radius 10–12 px; pressed translates 3 px down and drops the shadow. Holo cards = radius 12 px, 2 px iridescent conic rim (gold rim for specials), face #fff → #f1edff, soft shadow `0 10px 22px rgba(0,0,0,.45)`. Touch targets ≥ 44 px.
- Card sizes (§5.4): hand = clamp(64px, 19vw, 120px) wide with both chips stacked on the left edge and no effect text; sheet ≥ 200 px wide with cost top-left and damage top-right; plus lifted, thumb and tile. Damage chip = listedAttackDamage(cardId, isUpgraded, damageMultiplier). Never request activated art; Roulette uses its base drawing.
- Motion (§5.7, §8.3): --dur-fast 120ms, --dur-base 220ms, --dur-slow 400ms; card spring stiffness ≈ 400, damping ≈ 28; ease-out for entrances. prefers-reduced-motion: reduce → fades and color flashes only, with no transform, scale, shake, sheen sweep or pulse, and no information carried by motion alone.
- Art (§5.5): apps/client/scripts/extract-art.ts run with `pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts`. Outputs, committed: 31 base cards (incl. Roulette) at apps/client/src/assets/art/cards/<cardId>.png and 16 kits (incl. Gambler) at apps/client/src/assets/art/kits/<kitId>.png. Ground removal by edge flood-fill only, never a global color key. Never read '(dead)', Draw.png or *_button.png. The before/after contact sheet goes in a gitignored folder, is attached to the PR and is signed off by the designer before any screen stops using the old PNGs. Existing asset-lookup tests keep their assertions.
- Dependencies: only via `pnpm add --filter @card-battle/client` (`-D` for dev), so pnpm-lock.yaml records them. tsx at the server's version 4.23.1. Try sharp without onlyBuiltDependencies first (pnpm 10 blocks install scripts; the list holds only esbuild today), and confirm the Docker build stage still installs. No icon, animation or audio library beyond motion.
- Vitest: the client project includes src/**/*.test.{ts,tsx} and scripts/**/*.test.ts; the default environment stays node; component tests opt in per file with `// @vitest-environment happy-dom`; every existing .test.ts keeps running in node with unchanged results. No Date.now() in tests or view-model; callers pass nowMs.
- Tests: no test is skipped, disabled or weakened; moved tests keep their assertions verbatim (only import and readFileSync paths change); readFileSync tests are classified only by the lot that rewrites the code they read (§12.1).
- Switch (§4.4): ?ui=next selects V7 and persists localStorage['card-battle.v7.ui']; ?ui=classic clears the key; otherwise the stored value applies; tutorial rooms (playKind === 'tutorial') always get the classic table. Wired at App.tsx (playing) and the EndScreen finished board only; Home, lobby, the Game over dialog and /admin ignore it. Every storage access sits in try/catch. L75 removes it.
- Sheet contract (§6.7): blocking sheets always sit on top and ignore Esc, backdrop and swipe; Minimize collapses them to a bar above every other sheet while the caller keeps intents locked. Read-only sheets stack one level and close on Esc, backdrop or swipe-down. Esc closes only the top sheet (Q49). Toasts are dismissed only manually or by timeout, both through onDismiss, never by a prop or state update. Dialogs are bottom sheets on phones and centered on desktop, sized to visualViewport (L53-02/07), never 100dvh.
- /dev/ui gallery only behind import.meta.env.DEV and absent from production builds; every L72 ui/ component appears in it.
- Copy: English only; no emoji in shipped UI; existing labels keep their wording; the only new strings in L72 are 'Minimize', 'Table rules' and 'Excluded' (§10.6), listed in the PR for designer review. Catalog text per §10.5 exactly.
- Impeccable (§12.4): the only allowed detector ignore is the pre-approved 'radial-spotlight-glow' / 'dark-glow' ignore scoped to apps/client/src/ui/tokens.css; .impeccable/config.json committed, .impeccable/hook.cache.json and .superpowers/ gitignored; PRODUCT.md and DESIGN.md at the repo root, precedence code > spec v7 §5 > DESIGN.md.
- Definition of Done per task: `pnpm verify` (typecheck + lint + test) green, the task's Acceptance line met, its docs/backlog_v7.md status set to Done, DESIGN.md updated when tokens or ui/ change, and docs/agent/frontend.md sections updated, all in the same commit.
- Commits: exactly one Conventional Commit per task, imperative, subject ≤ 50 chars (hard cap 72), no trailing period, task id in the subject (e.g. `feat(ui): add V7 tokens and fonts (L72-05)`, `docs(agents): record V7 status (L72-01)`), with a body only for a spec deviation or decision. No AI attribution: AGENTS.md §10 overrides any Co-Authored-By line.
- Branching (§4.6): Lot 72 is one ready-for-review PR into dev from claude/v7-redesign; the What's new 'lot-72' fixes waiting on dev are promoted to main before L72 merges; then the promotion freeze applies until the L75 flip, L76 and L77 are merged.
- Run every command through pnpm (Node 24.18.0 pinned via devEngines). Check current docs via Context7 before using Tailwind v4 @theme, Vitest 4, @testing-library/react 16, user-event, happy-dom, motion/react or sharp APIs.
- `--text-on-cta` `#0c0920` is the label color on `--cta`, `--cta-2`, `--danger` fills and `--life` chips (spec §5.1 amended 2026-10-21).

## Review Focus

- L72-05: the listed contrast pairs miss two failures. --danger #ff4d4d gives 4.34:1 with --text-on-card (#2a2550), 2.88:1 with --text and 3.27:1 with white; only an ink-valued label passes (5.97:1), and --ink is outline/shadow only. So the CTA label/fill test fails unless L72-05 adds a text token (--text-on-cta = #0c0920) and asserts it on --cta, --cta-2 and --danger. Also --life #ff3d7f on --panel-2 is 4.25:1 (resource-colored text on pills or labels), and no test covers resource tokens as text: L72-05 should assert them, or record in DESIGN.md that they are only used at large size.
- L72-13: spec §10.4 says the first V7 entry is 'lot-<its lot>', i.e. 'lot-72', but 'lot-72' is already the open pre-V7 entry (slot-drop and Poison) and release-storage keys 'seen' by id. Reusing it means every player who dismissed lot-72 never sees the V7 entry. L72-13 must pick a distinct id, update the latest-id pins (shared release-notes.test.ts, ui/release-storage.test.ts after the L72-03 move, whats-new-dialog.test.ts), and add a test that catalog ids are unique and the latest differs from 'lot-72'.
- L72-18: no acceptance line renders the banner host under <React.StrictMode>. The classification row for table-banner.test.ts ('enqueues seed cues synchronously so Strict Mode cannot drop them', L51-06) needs exactly that: with youWon or isEliminated true on first render, 'You won!' or 'You are dead' must appear once and last TABLE_BANNER_MS despite the double-invoked effects. L72-18 should add that StrictMode test now; otherwise L75's replacement test is written against a host that can drop or double the first-paint cue.
- L72-06: motion's useReducedMotion queries window.matchMedia('(prefers-reduced-motion)') (no ': reduce'), caches the result per module graph on first use, and only updates on a 'change' event. Vitest also runs without globals, so RTL never auto-cleans. L72-06 should add harness self-tests: the stub answers both query strings, setReducedMotion(true) then false within one file flips usePrefersReducedMotion on the next render, and DOM is cleaned between tests. Otherwise every later 'reduced motion' component test can pass or fail on stale state.
- L72-09: sheet-stack cases no acceptance test covers. A third read-only sheet ('stack one level' leaves MAX_READ_ONLY_DEPTH overflow undefined: define and test it). Two blocking sheets at once (simultaneous Lot 71 reward pickers). Esc with a minimized blocking bar plus a read-only sheet on top (must close the read-only one). Unmounting the top sheet without stealing focus. dismissLocked ignoring Esc, backdrop and swipe (Feedback send lock). The classification's L72-owned dialog-width rows: an overlay bound to visualViewport at 844×390 and at 390×844 with offsetTop > 0.

## Conventions (shared by every task)

- Files and exports: kebab-case file names and named exports only (apps/client/src has no default export; keep it that way). A component .tsx exports components and types only. Constants, hooks, contexts (createContext) and pure helpers live in a sibling .ts, because react-refresh/only-export-components also reports a PascalCase local component in a .tsx that exports only functions, such as a `Providers` wrapper in src/test/render.tsx.
- Moves (L72-03/04): `git mv` with the basename unchanged. Destinations are flat: src/view-model/<name>.ts (game knowledge) or src/ui/<name>.ts (presentation, storage and anchor helpers). The one exception is design/components/dialog-width.ts → src/ui/primitives/dialog-width.ts. Tests move beside their module. Only import and readFileSync paths change. Importers are updated directly and no re-export shim stays at an old path.
- Layering: src/view-model/** stays pure, with no clock read; callers pass nowMs. It may import @card-battle/shared and pure ui/*.ts helpers (asset-lookup, structured-cost, hint-ids), never a ui/ component. ui/ components may import pure view-model helpers (parseCoachBody, KIT_ABILITY_COPY, table-banner cue logic, HIDDEN_KIT_LABEL). Nothing new imports from design/ or screens/table/; view-model/threat-tone keeps its type import from fx/table-fx-types.
- ESLint view-model purity block (L72-03): files ['apps/client/src/view-model/**/*.ts'] with no-restricted-imports for react, react-dom and motion (plus react/*, react-dom/* and motion/* patterns) and no-restricted-properties for Date.now and performance.now. A Vitest probe at src/view-model/view-model-purity.test.ts proves both rules fire.
- CSS custom properties (ui/tokens.css :root) use the spec §5.1 names exactly: --bg-0 --bg-1 --glow-a --glow-b --panel --panel-2 --ink --text --text-2 --text-on-card --life --point --upgrade --shield --cta --cta-2 --danger --threat-attack --threat-other --mine --seat-0…--seat-7. V7 additions: --text-on-cta, --card-face-0/1, --card-radius, --card-rim-width, --card-rim-holo, --card-rim-gold, --card-shadow, --chrome-outline-width, --chrome-shadow, --chrome-radius, --chrome-radius-sm, --chrome-press-y, --scanline, --dur-fast, --dur-base, --dur-slow, --ease-entrance, and --type-micro/caption/body/input/title/vital/display.
- Tailwind v4 theme rule: one `@theme inline` block in ui/tokens.css, imported by index.css right after `@import "tailwindcss"`. Every V7 key is `--<tailwind-namespace>-v7-<spec-token>`, e.g. --color-v7-panel, --color-v7-text-2, --color-v7-seat-3, --radius-v7-chrome, --radius-v7-card, --shadow-v7-chrome, --shadow-v7-card, --font-v7-display, --font-v7-card, --font-v7-body, --text-v7-input, --ease-v7-entrance. Utilities follow: bg-v7-panel, text-v7-text-2, border-v7-ink, font-v7-display, rounded-v7-chrome, shadow-v7-chrome, text-v7-input. No V7 key reuses a V2 name (--color-ink, --color-surface*, --color-seat-*, --radius-card, --radius-button, --font-sans…). A --text-v7-* size suffix never equals a --color-v7-* suffix. V2 @theme and :root values stay unchanged; L81 may drop the prefix.
- Inline-style colors use hex from ui/palette.ts (V7_COLORS, v7SeatColor), never var() or color-mix (the mobile Safari rule from seat-colors.ts). Classes may use the v7 utilities. A seat hue never shares an element with --life or --threat-* (§5.1). Text on a CTA fill uses --text-on-cta, never --ink.
- Chrome shape is read only from --chrome-outline-width, --chrome-shadow, --chrome-radius(-sm) and --chrome-press-y, never from literals, so L80 can override them under [data-mode="tool"]. The ground is the opt-in `.v7-ground` class (halos plus scanlines, defined only in ui/tokens.css so the pre-approved ignore covers it), never on html, body or #root.
- Reduced motion: V7 components read only usePrefersReducedMotion() (ui/motion/use-prefers-reduced-motion.ts), run motion props through motionSpecFor(spec, reduced) and put data-motion="reduced"|"full" on the animated root. CSS animation and press classes are applied only when full, because happy-dom cannot evaluate media queries and tests assert data-motion or the class.
- Test harness: import { renderUi, setReducedMotion } from 'apps/client/src/test/render.tsx' (relative path). Every .test.tsx starts with `// @vitest-environment happy-dom`; .test.ts stays in node. With fake timers, pass renderUi(ui, { advanceTimers: vi.advanceTimersByTime }). Use { reducedMotion: true } for the reduced path. No Date.now() in tests. After L72-09, renderUi also isolates the sheet stack.
- /dev/ui gallery: isDevUiRoute(pathname, import.meta.env.DEV) plus a lazily imported dev/ui-gallery.tsx. Each ui/ area adds `ui/<area>/<area>.gallery.tsx` with `export const gallery: GallerySection = { id: '<area>', title, entries: [{ id, title, render: () => <…/> }] }`, auto-discovered by import.meta.glob('../ui/**/*.gallery.tsx'). No central registry file is edited. Section ids: primitives, icons, overlays, text, card, chat, kit, rules, coach, banner, seat.
- Icons: <Icon name={IconName} size? label? /> from ui/icons/icon.tsx; names come from ICON_NAMES in ui/icons/icon-names.ts; RESOURCE_ICON maps ResourceKind to an icon. Icons are decorative (aria-hidden) unless given a label. Icon-only controls use IconButton, whose aria-label is required by the type and whose title defaults to it (L59-01). help and coach are distinct glyphs. No emoji in ui/, and use Icon 'eliminated' instead of a ✕ character.
- Sheet stack: <Sheet mode='read-only' onClose …> or <Sheet mode='blocking' …> (a discriminated union, so blocking has no onClose). <Dialog> is a read-only Sheet with placement 'auto'. <Toast onDismiss={(cause) => …} dismissLabel …>. Esc is handled per sheet only when escTargetId(state) === its id. The default store is a module singleton, so no provider is required at app root; <SheetStackProvider store> exists for isolation. Paint order: read-only < expanded blocking < minimized bars; Z_INDEX = { sheet: 50, sheetBar: 80, banner: 90, toast: 95 }.
- Art: artFor(id: CardId | KitId): string in ui/asset-lookup.ts resolves only the base drawing and never throws. It falls back to getCardBackUrl(family | 'kit'), then ART_FALLBACK_URL. Upgraded, activated and active looks are Card code states. Kit values always come from KIT_CATALOG, never from PNGs.
- Card API: <Card size='hand'|'lifted'|'sheet'|'thumb'|'tile' instance={CardInstance} damageMultiplier? counter?={{kind:'card-lives'|'turns', amount}} selected? unplayable? onActivate?={(instanceId) => …} dataAttributes? /> or <Card face='hidden' family={CardType} size … />. The accessible name is cardFaceLabel (name, ' upgraded', ', N damage', counter label). The caller decides unplayable.
- ui-switch: localStorage['card-battle.v7.ui'] = 'next'. Apply the ?ui param once per page load (useState initializer in GameApp), resolve per render with resolveTableUi (tutorial → classic), and pass the finished-board decision to EndScreen as the tableUi prop. Pick the component with `const Board = … ? ArenaScreen : TableScreen` so each mount point keeps one JSX element and the source-text literals stay single-occurrence.
- Copy: ui/ adds only the §10.6 strings L72 needs, in ui/ui-copy.ts: EXCLUDED_LABEL 'Excluded' (L72-08), MINIMIZE_LABEL 'Minimize' (L72-09), TABLE_RULES_LABEL 'Table rules' (L72-16). Every other label (Toast dismissLabel, Carousel previousLabel/nextLabel, IconButton aria-label, coach hideAriaLabel, KitTile infoLabel) is passed by the caller from existing copy. English only.
- Anchor and data attributes: generic passthrough prop `dataAttributes?: Readonly<Record<`data-${string}`, string>>`. CoachPanel keeps `extraAttrs` for drop-in. hintAnchor renders data-hint-anchor. Preserved anchors: data-zone, data-player-id, data-instance-id, data-resource-kind, data-tutorial-highlight, data-seat-index, data-banner, data-kit-section, data-motion.
- exactOptionalPropertyTypes: never pass undefined to an optional prop; use the codebase's conditional-spread pattern `{...(x !== undefined ? { x } : {})}`. Reduced or derived objects omit keys instead of setting them to undefined.
- Viewport mode: one rule in ui/viewport-mode.ts, viewportModeFor({width,height}). Height < 500 → landscape-compact; else width > height → desktop; else portrait. Sheet placement, Carousel gridAtDesktop and L73 seats() all reuse it.
- Chat: ui ChatLog sends onSend(body.trim()) (matches L76-13), never sends whitespace-only text, uses maxLength={CHAT_BODY_MAX_LENGTH} from @card-battle/shared, input name 'chat-body', default label 'Message', and the empty state 'No messages yet.'.
- Source-text test splits (L72-02): `<read-source-basename>.<original-test-basename>.test.ts`, placed beside the source the assertions read (house style already has use-room-connection.forfeit.test.ts). Each expect() moves verbatim, and the original it() title is reused with a ' (<screen>)' suffix. Split before L72-03/04 moves the module whose test reads component files.
- Per-task cadence: flip the task's row in docs/backlog_v7.md, update DESIGN.md whenever tokens or ui/ change, and update docs/agent/frontend.md sections for changed conventions, all in the same commit as the code. Run `pnpm verify` before committing.
- Dependencies: always `pnpm add --filter @card-battle/client <pkg>` (`-D` for dev) so pnpm-lock.yaml records it. L72 adds runtime @fontsource/lilita-one, @fontsource/fredoka and @fontsource/nunito, and dev @testing-library/react, @testing-library/user-event, @testing-library/dom (RTL 16 peer), happy-dom, sharp and tsx@4.23.1. No icon, animation or audio library beyond motion.
- What's new: the V7 entry opened by L72-13 must use an id different from the pre-V7 'lot-72'. Default 'lot-72-v7', titled 'New look', with After 'Fixed some bugs.' for the catalog-text item. Later V7 PRs append to it during the freeze.

## Execution order

Tasks run in id order (L72-01 → L72-21); each one is one commit with `pnpm verify` green. Real prerequisites are wider than some backlog rows suggest — every task's Step 1 checks that what it consumes has landed.

---

### Task L72-01: Record V7 in AGENTS, decisions, deploy and PRODUCT.md

Docs only: no TDD loop; each step is one edit plus a grep/diff check; gate = `pnpm verify` with unchanged counts.

**Files:**
- Create: `PRODUCT.md` (repo root, Impeccable `init`); `.claude/launch.json` (already on disk, commit as is)
- Modify: `AGENTS.md` (§1, §2, §4, golden rule 7, §9 + DoD), `docs/agent/decisions.md` (append only), `docs/agent/deploy.md`, `docs/agent/frontend.md` (Status), `.gitignore`, `docs/backlog_v7.md`
- Verify only: AGENTS.md golden rule 1 (14a5ce9), subagent rule (8ba060f), `.impeccable/config.json` (tracked since f883dfe), spec v7 §10.3, `.github/workflows/prod-from-dev.yml`
- Test: none. Gate: `pnpm verify`.

**Interfaces:**
- Consumes: no code. Every L72-01 contract path has `exports: []`.
- Produces (doc anchors later tasks rely on):
  - `PRODUCT.md` at the repo root (read by Impeccable from L72-05 on).
  - `docs/agent/decisions.md` heading `## 2026-10-21 · [P] V7 visual redesign architecture` (cited from L72-02, L75, L81).
  - `docs/agent/deploy.md` heading `## V7 promotion freeze (technical spec v7 §4.6)` (checked by L72-21; edited on Q13).
  - `docs/agent/frontend.md` Status pointer to spec v7, `/PRODUCT.md` and `` `/DESIGN.md` (created in L72-05)`` — L72-05 deletes exactly ` (created in L72-05)`.
  - `.gitignore` entry `.claude/worktrees/` (L72-10 appends `apps/client/.art-contact-sheet/`).
  - Not touched: the AGENTS.md §6 `.test.tsx` line (L72-06).

---

- [ ] **Step 1: Mark In progress**

In `docs/backlog_v7.md`, set the L72-01 row Status from `To do` to `In progress`.
Check: `grep -n "^| L72-01 " docs/backlog_v7.md | grep -c "| In progress |"` → `1`.

- [ ] **Step 2: Baseline gate**

Run: `pnpm verify`
Expected: exit 0, `Test Files  308 passed (308)`, `Tests  1714 passed (1714)` (`claude/v7-redesign` @ `6e4575a`). Step 17 must match.

- [ ] **Step 3: Verify golden rule 1 (no edit)**

Read golden rule 1 beside rules spec §2 and §6 "Mutual Attacks"; every clause (equal, stronger, weaker, exact group, Strong + Basic, leftover, Mirror) must match.
- `grep -nE "one volley|sum of final damage" AGENTS.md` → no output, exit 1.
- `git log --oneline -1 14a5ce9` → `14a5ce9 fix(game): triage inbox and 28 Sep feedback (#58)`.
- `grep -n "already carries the 2026-09-29 rule" docs/technical_spec_v7.md` → one §10.3 line (leave it).

- [ ] **Step 4: Verify the subagent rule (no edit)**

- `grep -n "\*\*Claude\*\* models (Opus" AGENTS.md` → one §9 line.
- `git log --oneline -1 8ba060f` → `8ba060f docs(agents): allow Claude subagents under Claude Code`.

- [ ] **Step 5: AGENTS.md §1**

Rewrite §1 from `**V6** (readability` through `beta testers under V6.`: V6 **closed at Lot 71** (v6 docs archived); Classic has **16 kits**; V7 "Arcade Holo" in progress, a **client-only** redesign, Lots 72–81 (`docs/technical_spec_v7.md` + Appendix A `docs/technical_spec_v7_parity.md`, `docs/backlog_v7.md`); V5 in parallel; drop "under V6".
Check: `grep -n "closed at Lot 71" AGENTS.md` and `grep -n "client-only" AGENTS.md` each print a §1 line.

- [ ] **Step 6: AGENTS.md §2**

In source-hierarchy item 2, keep the first sentence and the **English only** line; the backlog sentences become: v5 sequences V5 (Lots 32–40); `docs/backlog_v7.md` sequences V7 (Lots 72–81) under spec v7 + Appendix A `docs/technical_spec_v7_parity.md`, with `docs/backlog_v7_test_classification.md` and `docs/superpowers/plans/2026-10-21-v7-lot-*.md`; v1–v4 and `docs/backlog_v6.md` (Lots 41–71) are closed archives, and any later V6-style lot takes a number from 82; `PRODUCT.md` and `DESIGN.md` sit at the root (code > spec v7 §5 > `DESIGN.md`, §5.8).
Check: `grep -n "number from 82" AGENTS.md` → one line; `grep -n "technical_spec_v7_parity.md" AGENTS.md` → ≥ 2 lines.

- [ ] **Step 7: AGENTS.md §4 repo map**

Replace the `docs/` line ending `backlog_v3.md (active).` with:
```
docs/               Rules spec, technical specs v1–v7, backlogs (v5 and v7 open; v1–v4 and v6 archived).
```
Check: `grep -c "backlog_v3.md (active)" AGENTS.md` → `0`.

- [ ] **Step 8: AGENTS.md golden rule 7**

Replace rule 7's first three lines (through `` `docs/backlog_v6.md`). ``) with this; keep the rest and the pinned last line on one line:
```
7. **V1–V4 and V6 are closed; V5 is in progress** (`docs/technical_spec_v5.md`,
 `docs/backlog_v5.md`). **V6** ran Lots 41–71 (`docs/technical_spec_v6.md`,
 `docs/backlog_v6.md`). **V7 is in progress** (Lots 72–81, `docs/technical_spec_v7.md`,
 `docs/backlog_v7.md`), client-only:
 V7 changes no rule, no value and no protocol field (`PROTOCOL_VERSION` stays 45).
```
Check: ``grep -n "V7 changes no rule, no value and no protocol field (\`PROTOCOL_VERSION\` stays 45)" AGENTS.md`` → exactly one line.

- [ ] **Step 9: AGENTS.md §9 and DoD**

§9 opening paragraph: open backlogs = `docs/backlog_v7.md` (Lots 72–81) plus `docs/backlog_v5.md` in parallel; archives = v1–v4 and `docs/backlog_v6.md`; V5 sequencing sentences verbatim; the V6 sequencing sentence becomes ``V7 sequencing, one PR per lot into `dev` and the V7 promotion freeze: `docs/backlog_v7.md` "How to read this" and `docs/agent/deploy.md`.``
In the DoD, change ``(`docs/backlog_v6.md` for V6)`` to ``(`docs/backlog_v7.md` for V7)`` in the Acceptance and status bullets, and add after the status bullet:
```
- [ ] Touching tokens or `ui/` updates `DESIGN.md` in the same commit (spec v7 §5.8, §12.5)
```
Check: ``grep -c "backlog_v6.md\` for V6" AGENTS.md`` → `0`; `grep -n "for V7)" AGENTS.md` → 2 lines; ``grep -n "updates \`DESIGN.md\` in the same commit" AGENTS.md`` → 1 line; `grep -n -i "freeze" AGENTS.md` → the §9 line.

- [ ] **Step 10: Golden rule 1 and subagent rule untouched**

```
diff <(git show HEAD:AGENTS.md | sed -n '/^1\. \*\*Mutual attacks/,/^2\. /p') <(sed -n '/^1\. \*\*Mutual attacks/,/^2\. /p' AGENTS.md) && echo GR1-unchanged
diff <(git show HEAD:AGENTS.md | sed -n '/^\*\*Subagents\*\*/,/^$/p') <(sed -n '/^\*\*Subagents\*\*/,/^$/p' AGENTS.md) && echo SUBAGENTS-unchanged
grep -c "backlog_v7.md" AGENTS.md
wc -l < AGENTS.md
```
Expected: `GR1-unchanged`, `SUBAGENTS-unchanged`, count ≥ 5, ~310 lines (trim nothing).

- [ ] **Step 11: Append the decisions.md entry**

Append after the final `---` and blank line: the heading `## 2026-10-21 · [P] V7 visual redesign architecture`, a source line (designer brainstorm 2026-10-20, spec v7 §2 Q1–Q12, 2026-10-21 backlog review; V6 closed at Lot 71, later V6-style lots from 82), one bullet per item citing its spec section, then a blank line and `---`:
- **Client-only** (§1): no rule/value/protocol/server change (`PROTOCOL_VERSION` 45) beyond §10.3 doc fixes and §10.5 shared copy; a new-field need stops and asks.
- **`ui/` vs `view-model/`** (§4.2–4.3): `ui/` has no game knowledge; `view-model/` is pure, React-free, clock-free (`nowMs` passed in), tested per module.
- **Moves, not rewrites** (§4.1): `git mv` with tests in L72-03/04, path-only changes, no shim.
- **Side by side** (§4.4): V7 tokens in `apps/client/src/ui/tokens.css`, V2 values unchanged; screens switch per lot (L76, L77, L80).
- **`?ui=next` table-only until L75** (`localStorage['card-battle.v7.ui']`, `?ui=classic` clears, tutorial ignores).
- **Source-text tests** (§12.1): per `docs/backlog_v7_test_classification.md`; behavior kept; retirements logged here.
- **Promotion** (Q12 = A, §4.6): one PR per lot into `dev`, promote before L72, freeze until L75/L76/L77; `deploy.md`.
- **Open discrepancy (Q13)**: §4.6 hotfix-from-`main` vs `prod-from-dev.yml`; open, workflow unchanged.
- **Design docs** (§5.8): `PRODUCT.md`, `DESIGN.md`; code > spec v7 §5 > `DESIGN.md`; tokens/`ui/` update `DESIGN.md` (§12.5).
- **Subagents** (2026-10-20, 8ba060f): Claude models under Claude Code; Grok 4.5 / Composer 2.5 under Cursor; GPT excluded.
- **Supersedes**: spec v2 visual language, Lot 39, V6 Lots 43/53 table layout; all functions kept (Appendix A).

Check:
```
git diff --numstat docs/agent/decisions.md
grep -c "^## 2026-10-21 · \[P\] V7 visual redesign architecture$" docs/agent/decisions.md
tail -n 3 docs/agent/decisions.md
```
Expected: `<N>	0	docs/agent/decisions.md` (0 deletions); count `1`; tail ends with the Supersedes line, a blank line, `---`.

- [ ] **Step 12: deploy.md freeze section**

1. Header Sources: before the final period add ` · designer 2026-10-20 (V7 promotion freeze, technical spec v7 §4.6)`.
2. End the `Hotfixes follow the same path:` paragraph with `During the V7 freeze, read the next section first.`
3. Before `## Clone-app shortcut (optional)` insert `## V7 promotion freeze (technical spec v7 §4.6)` (designer 2026-10-20, Q12 = A) with four items: (1) before L72 merges, promote pending `dev` fixes (What's new `lot-72`) to `main` (`git log --oneline origin/main..origin/dev`); (2) no `dev` → `main` from the first V7 merge until L75 flip, L76, L77 merge, unless the designer approves; (3) **Hotfixes during the freeze: open (Q13)**: `prod-from-dev.yml` rejects non-`dev` heads, so a fix waits; no workflow change; (4) L78–L81 ship after the freeze.

Check:
```
grep -n "^## V7 promotion freeze (technical spec v7 §4.6)$" docs/agent/deploy.md
grep -n "Q13" docs/agent/deploy.md
git diff --quiet -- .github && echo NO-CI-CHANGE
```
Expected: one heading line; Q13 on item 3; `NO-CI-CHANGE`.

- [ ] **Step 13: frontend.md Status**

After the existing `## Status` paragraph (ending `gambling death).`), before `## Screens`, insert:
```
**V7 (visual redesign "Arcade Holo") is in progress** (`docs/technical_spec_v7.md` +
Appendix A `docs/technical_spec_v7_parity.md`, `docs/backlog_v7.md`, Lots 72–81). It is
client-only and lands side by side: the V2 design system below still governs every screen
until that screen's V7 lot lands (spec v7 §4.4). Product context: `/PRODUCT.md`. V7
design-system record: `/DESIGN.md` (created in L72-05). On conflict, **code > spec v7 §5
(normative) > `DESIGN.md`** (derived from the code; spec v7 §5.8).
```
Check: `grep -n "code > spec v7 §5" docs/agent/frontend.md`, `grep -n "/PRODUCT.md" docs/agent/frontend.md` → one line each; `grep -c "created in L72-05" docs/agent/frontend.md` → `1`.

- [ ] **Step 14: .gitignore and .claude/launch.json**

After line 17 (`.impeccable/hook.cache.json`) append a blank line, `# Claude Code worktrees (local); .claude/launch.json is committed (preview config)` and `.claude/worktrees/`.
```
git check-ignore -v .claude/worktrees/probe
git check-ignore -v .superpowers/probe .impeccable/hook.cache.json
git check-ignore -q .claude/launch.json; echo "launch-ignored=$?"
git ls-files .impeccable
git status --short --untracked-files=all .claude
```
Expected: `.gitignore:20:.claude/worktrees/	.claude/worktrees/probe` (source `.gitignore`, not `.git/info/exclude`); `.gitignore:16:.superpowers/…` and `.gitignore:17:.impeccable/hook.cache.json…`; `launch-ignored=1`; `.impeccable/config.json`; only `?? .claude/launch.json`.

- [ ] **Step 15: PRODUCT.md via Impeccable `init`**

Run Skill `impeccable:impeccable` with args `init` from the repo root; `PRODUCT.md` lands at the root even if `context` resolves elsewhere. One approval round (question tool, else label inferred facts and note it in the PR). Answer only from:
- Platform `web`, phone portrait first (Q2). Users: designer and friends, first-time beta testers, spectators and walk-ins, 2–8 seats, bots in solo. Purpose and success: AGENTS.md §1, spec v7 §1 Objective. Positioning: delayed resolution (rules spec §6), Spy hidden information. Context: rooms by code/link, solo, tutorial, previews, password `/admin`; desktop derived, landscape-compact.
- Constraints: English only (Q9); one dark theme; SFX only (Q7); no rule/value/protocol change (`PROTOCOL_VERSION` 45); drawings reused (Q1); server authoritative; tech spec v1 §9 out of scope; under Capabilities and Constraints, one line (default for each surface brief): `Mode per surface (designer 2026-10-20, spec v7 §5.8): table = Experience/Operate, admin = Operate, home = light Persuade.`
- Brand "Card Battle", copy per spec v7 §10; evidence `images/`, rules spec, Appendix A; nothing fabricated.
- Accessibility: AA 4.5:1 / 3:1, ≥ 44 px targets, 11 px floor, 16 px inputs, reduced motion = fades/color flashes, never color alone (Q15), `aria-label` on icon-only controls.

Init Step 5: no `buildPath` unless the designer answers; no live mode; no palette, font or visual direction.
```
head -3 PRODUCT.md
grep -n '^## ' PRODUCT.md
grep -n -A2 '^## Platform' PRODUCT.md
grep -n "table = Experience/Operate, admin = Operate, home = light Persuade" PRODUCT.md
grep -n -i -e "english" -e "dark theme" -e "portrait" PRODUCT.md
grep -nE '#[0-9a-fA-F]{6}|Lilita|Fredoka|Nunito|font-family' PRODUCT.md; echo "visual-free=$?"
git status --short .impeccable
```
Expected: `# Product`, blank, `<!-- impeccable:product-schema 1 -->`; sections include `## Platform`, `## Users`, `## Product Purpose`, `## Positioning`, `## Capabilities and Constraints`, `## Accessibility & Inclusion`; `web` under Platform; mode line once; all keywords hit; `visual-free=1`; `.impeccable` clean (or `M .impeccable/config.json` if the designer answered `buildPath`).

- [ ] **Step 16: Backlog**

In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.
In the Q13 bullet, replace ``Blocks the `deploy.md` part of L72-01 only.`` with ``L72-01 records it as open in `deploy.md` ("V7 promotion freeze") with no CI change; the answer edits that section, and the workflow for the first option.`` (Q13 stays open).
Check: `grep -n "^| L72-01 " docs/backlog_v7.md | grep -c "| Done |"` → `1`; `grep -n "| 72 · Foundations | 21 | 1 |" docs/backlog_v7.md` → one line.

- [ ] **Step 17: No code changed; gate green**

```
git status --short --untracked-files=all
git diff --name-only -- apps packages .github vitest.config.ts eslint.config.mjs
pnpm verify
```
Expected: status is exactly the eight Step 18 paths (`?? .claude/launch.json`, `?? PRODUCT.md`, ` M` for the rest; `.impeccable/config.json` only in the buildPath case); empty diff; `pnpm verify` exit 0 with `Test Files  308 passed (308)` and `Tests  1714 passed (1714)`.

- [ ] **Step 18: Commit**

```
git add AGENTS.md PRODUCT.md .gitignore .claude/launch.json docs/agent/decisions.md docs/agent/deploy.md docs/agent/frontend.md docs/backlog_v7.md
git diff --cached --name-only
git commit -F - <<'EOF'
docs(agents): record V7 status (L72-01)

Golden rule 1 and the subagent rule are verified unchanged (14a5ce9,
8ba060f). The V7 hotfix path stays open (Q13): prod-from-dev.yml still
rejects non-dev heads, so deploy.md records it as open and CI is
unchanged. PRODUCT.md carries the per-surface modes as spec v7 §5.8
asks, although Impeccable normally keeps modes in surface briefs.
EOF
git status --short
```
Expected: cached list is exactly the eight paths (plus `.impeccable/config.json`, added explicitly, only in the buildPath case); commit succeeds; status empty. No `Co-Authored-By` (AGENTS.md §10).

**Decisions:**
- decisions.md heading is pinned to `## 2026-10-21 · [P] V7 visual redesign architecture` even if committed later: later tasks cite it and Step 11 greps it, so the old 'use the commit day' option is dropped.
- frontend.md Status keeps the literal `/DESIGN.md` (created in L72-05) (not 'arriving in L72-05'): the critic fix makes L72-05 delete exactly ' (created in L72-05)'.
- PRODUCT.md carries the per-surface mode line under Capabilities and Constraints (contract + spec v7 §5.8), although Impeccable 4.7.0 init keeps surface modes in surface briefs; a later Impeccable `doctor` run may flag it.
- Q13: L72-01 goes Done with the hotfix path written as open in deploy.md and no CI change; the Q13 backlog bullet is reworded but stays open; spec v7 §4.6 is left as written. The conflict sits inside the single [P] entry, not in a separate DISCREPANCY entry.
- Impeccable init Step 5 is cut short: no buildPath unless the designer answers, live mode declined. `.impeccable/config.json` is verify-only (tracked since f883dfe) unless a designer-answered buildPath modifies it, in which case it is staged explicitly.
- Init needs one approval round; with no question tool, init's fallback applies: label inferred facts and say so in the PR. All fed facts come from designer-approved spec v7 sections.
- Golden rule 1, the §9 subagent rule and spec v7 §10.3 are verify-only (14a5ce9, 8ba060f); no text change.
- AGENTS.md ends near 310 lines, past the ~200 target in §12; this task trims no other section (out of scope).
- The V7 promotion-freeze pointer goes in AGENTS.md §9 (contract-listed), not §10.
- `.claude/worktrees/` is added to .gitignore although .git/info/exclude already covers it on this machine; the check requires the deciding source to be `.gitignore:20`.
- Only the AGENTS.md rule 7 block, §4 repo-map line, DoD bullet, frontend.md Status paragraph and Q13 backlog sentence are verbatim copy; the §1/§2/§9 prose, decisions.md bullets and deploy.md freeze items are given as required content plus grep anchors.
- Commit carries no Co-Authored-By line: AGENTS.md §10 forbids AI attribution and wins over the harness attribution reminder.

---

### Task L72-02: Split cross-screen source-text tests and record the classification

Docs plus test surgery; no production code. Moved `expect()`s are copied byte-for-byte; only `readFileSync` paths and their helper `const`s change. A split-off part of an `it()` gets the title suffix ` (<read-source-basename>)`; whole moved `it()`s and parts that stay keep their title. Line numbers are at `6e4575a`; `dir`/`here` below always mean `dirname(fileURLToPath(import.meta.url))`.

**Files:** (test paths under `apps/client/src/`)
- Create (20): `index.visual-viewport.test.ts`, `App.tutorial-hints-independence.test.ts`, `net/use-room-connection.tutorial-hints-independence.test.ts`, `screens/home.visual-viewport.test.ts`, `screens/lobby.visual-viewport.test.ts`, `screens/table/table-shell.visual-viewport.test.ts`, `screens/home.feedback-surfaces.test.ts`, `screens/lobby.feedback-surfaces.test.ts`, `screens/table.feedback-surfaces.test.ts`, `screens/end.feedback-surfaces.test.ts`, `screens/home.tutorial-hints-independence.test.ts`, `screens/game-over-dialog.tutorial-hints-independence.test.ts`, `screens/table.tutorial-hints-independence.test.ts`, `screens/table/your-turn-flash.table-banner.test.ts`, `design/components/dialog.dialog-width.test.ts`, `screens/table/opponent-zone.opponent-seat-resources.test.ts`, `screens/table/economy-bar.chrome-labels.test.ts`, `screens/home.admin-route.test.ts`, `screens/table.claim-seat-dialog.test.ts`, `fx/table-fx-overlay.play-flyout.test.ts`
- Delete: `design/components/visual-viewport.test.ts`, `feedback/feedback-surfaces.test.ts`
- Modify (tests): `help/tutorial-hints-independence.test.ts`, `screens/table/table-banner.test.ts`, `design/components/dialog-width.test.ts`, `screens/table/opponent-seat-resources.test.ts`, `screens/table/chrome-labels.test.ts`, `admin/admin-route.test.ts`, `screens/claim-seat-dialog.test.ts`, `fx/play-flyout.test.ts`
- Modify (docs): `docs/backlog_v7_test_classification.md`, `docs/backlog_v7.md`, `docs/agent/testing.md`, `docs/agent/decisions.md`

**Interfaces:**
- Consumes: L72-01 (`AGENTS.md` §9 names `docs/backlog_v7.md` as the open backlog). No code.
- Produces:
  - `### §4.1 pure-module dispositions` in `docs/backlog_v7.md`: exactly what L72-03/L72-04 move, to `view-model/<name>.ts`, `ui/<name>.ts`, `ui/primitives/dialog-width.ts`, `ui/fx-anchors.ts`.
  - Source-free, so L72-04 moves them with `git mv` plus import edits: `design/components/dialog-width.test.ts`, `screens/table/opponent-seat-resources.test.ts`, `screens/table/chrome-labels.test.ts`, `screens/table/table-banner.test.ts`.
  - Logic-only `help/tutorial-hints-independence.test.ts`; L72-03 moves it to `ui/tutorial-hints-independence.test.ts` beside help-storage and changes its select-hint import to `../view-model/select-hint`.
  - `fx/play-flyout.test.ts` stays in `fx/`; L72-03 edits only its imports, never its `readFileSync(join(dir, 'play-flyout.ts'))` literals.
  - L72-20 literals live in `App.tutorial-hints-independence.test.ts`, `screens/table.tutorial-hints-independence.test.ts`, `screens/*.feedback-surfaces.test.ts`, `admin/admin-route.test.ts` (App part), `screens/claim-seat-dialog.test.ts` (App part), `inbox/inbox-route.test.ts`.
  - Classification sections: Owner lot 72 (absorbing Owner lot 73), 74, 75, 75/76, 76, 77, 78, 80, 81 (new), Kept (new).
  - Naming rule `<read-source-basename>.<original-test-basename>.test.ts`, beside the source read, in `docs/agent/testing.md`.

- [ ] **Step 1: Flip the status.** `docs/backlog_v7.md` L72-02 row: `To do` → `In progress`.

- [ ] **Step 2: Baseline (the failing check).** `grep -rl readFileSync apps/client/src --include='*.test.ts' | wc -l` → `52`. OWNER-CHECK:
```bash
sed 's/\\|/!/g' docs/backlog_v7_test_classification.md | awk -F'|' '/^## /{lot=$0; sub(/^## /,"",lot)} /^\| `/{f=$2; c=$5; gsub(/[ `]/,"",f); gsub(/ /,"",c); if (c!="logic-not-source-text" && !((f SUBSEP lot) in s)) {s[f SUBSEP lot]=1; n[f]++; l[f]=l[f] " | " lot}} END{for (k in n) if (n[k]>1) print k l[k]}' | sort
```
Expected FAIL, exactly:
```
admin/admin-route.test.ts | Owner lot 76 | Owner lot 80
feedback/feedback-surfaces.test.ts | Owner lot 75 | Owner lot 76 | Owner lot 77
fx/play-flyout.test.ts | Owner lot 75 | Owner lot 78
help/tutorial-hints-independence.test.ts | Owner lot 73 | Owner lot 75
screens/claim-seat-dialog.test.ts | Owner lot 75 | Owner lot 76
```
FIND-EXPECT → `287` (same `find` piped straight to `wc -l` → `10`; with `-exec cat {} + | grep -cE '^\s*it\('` → `52`):
```bash
find apps/client/src \( -name '*visual-viewport.test.ts' -o -name '*feedback-surfaces.test.ts' -o -name '*tutorial-hints-independence.test.ts' -o -name '*table-banner.test.ts' -o -name '*dialog-width.test.ts' -o -name '*opponent-seat-resources.test.ts' -o -name '*chrome-labels.test.ts' -o -name '*admin-route.test.ts' -o -name '*claim-seat-dialog.test.ts' -o -name '*play-flyout.test.ts' \) -exec cat {} + | grep -o 'expect(' | wc -l
```
`pnpm vitest run --project client` → `Test Files  101 passed (101)`, `Tests  435 passed (435)` (if L72-01 changed these, rebase later counts).

- [ ] **Step 3: Template for every new file.** `describe` titles copied exactly; no new `expect()`; no comment contains `expect(`; no line starts with `it(` outside a test.
```ts
/**
 * <citation line given below>.
 * <Part> part, split from <original path> by owner lot (technical spec v7 §12.1, L72-02).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
```

- [ ] **Step 4: Split `design/components/visual-viewport.test.ts` into 4, then `git rm` it.** Citation `Full-bleed table — L53-07. html / #root / the shell fill the window.` Each: `const dir`, `describe('full-bleed viewport (L53-07)')` > `it('fills html / #root / the table with 100% instead of a stale 100dvh (<suffix>)')`, original lines with only the `join(dir, …)` path changed. File (suffix, owner): lines → path, expects:
  - `index.visual-viewport.test.ts` (index, L81): 15–20 → `'index.css'`, 4
  - `screens/table/table-shell.visual-viewport.test.ts` (table-shell, L75): 21–27 → `'table-shell.tsx'`, 3
  - `screens/home.visual-viewport.test.ts` (home, L76): 28–33 → `'home.tsx'`, 3
  - `screens/lobby.visual-viewport.test.ts` (lobby, L76): 34–35 → `'lobby.tsx'`, 1

- [ ] **Step 5: Run.** `pnpm vitest run --project client visual-viewport` → `Test Files  4 passed (4)`, `Tests  4 passed (4)`. A FAIL is a mistyped path or literal.

- [ ] **Step 6: Split `feedback/feedback-surfaces.test.ts` into 4 under `screens/`, then `git rm` it.** Citation `Feedback surfaces — technical spec v6 §7.1 / L47-03.` Each: `const screens = dirname(fileURLToPath(import.meta.url));` plus original lines 10–12 (`read()`), `describe('feedback surfaces (technical spec v6 §7.1 / L47-03)')` > `it('wires Feedback on Home, Lobby, Table, and Game over (<suffix>)')`, read line(s); expect lines: `home` (L76) 16; 22–24 · `lobby` (L76) 17; 25–26 · `table` (L75) 18, 20; 27–34 · `end` (L77) 19; 35–50 (16, incl. `expect(end.split('setLeavePending(true)').length).toBe(2);`).

- [ ] **Step 7: Run.** `pnpm vitest run --project client feedback-surfaces` → `Test Files  4 passed (4)`, `Tests  4 passed (4)`.

- [ ] **Step 8: Split the source-text `it()` of `help/tutorial-hints-independence.test.ts` into 5.** Citation `Tutorial completion must not skip first-game hints — L46-03 / spec §5.2.` Each copies original lines 14–19 (`here`, `clientSrc`, `read()`); the App file uses `const clientSrc = dirname(fileURLToPath(import.meta.url));` and no `here`. Each: `describe('tutorial does not skip first-game hints (L46-03)')` > `it('startTutorialGame, Game over, and Skip tutorial never write skipAll (<suffix>)')`. File (suffix, owner): read line(s); expect lines:
  - `App.tutorial-hints-independence.test.ts` (App, L75): 24; 32–33
  - `screens/home.tutorial-hints-independence.test.ts` (home, L76): 27; 38
  - `screens/game-over-dialog.tutorial-hints-independence.test.ts` (game-over-dialog, L77): 25; 34–35
  - `screens/table.tutorial-hints-independence.test.ts` (table, L75): 26, 28; 36–37 then 39–45
  - `net/use-room-connection.tutorial-hints-independence.test.ts` (use-room-connection, Kept): 23; 30–31

  In the original delete lines 22–46, 14–19, 5–7 and add the header line `The source-text checks live beside the files they read (technical spec v7 §12.1, L72-02).` Its two logic `it()`s (3 expects) stay.

- [ ] **Step 9: Run.** `pnpm vitest run --project client tutorial-hints-independence` → `Test Files  6 passed (6)`, `Tests  7 passed (7)`.

- [ ] **Step 10: Move whole source-text `it()`s out of the four module tests L72-04 moves** (template + lines verbatim):
  - `screens/table/your-turn-flash.table-banner.test.ts` (citation `Table banner flash source — L51-06 / L63-03.`): 43–51 under `describe('table banners (L51-06)')`, 341–351 under `describe('Sentence countdown banners (L63-03)')`, inline `'your-turn-flash.tsx'` joins kept. In `table-banner.test.ts` delete 341–352, 43–52, 5–7.
  - `design/components/dialog.dialog-width.test.ts` (citation `Dialog overlay sizing — L53-02 / L53-07.`): 42–70 (`index.css` and `dialog.tsx` `it()`s, paths unchanged) under `describe('dialogPanelClassName (L53-02)')`. In `dialog-width.test.ts` delete 41–70, 1–3.
  - `screens/table/opponent-zone.opponent-seat-resources.test.ts` (citation `Opponent seat resource visibility — L51-08 / L51-10.`): `const dir`, 84–112 under `describe('opponent seat resources (L51-08)')`. In `opponent-seat-resources.test.ts` delete 83–112, 17, 5–7.
  - `screens/table/economy-bar.chrome-labels.test.ts` (citation `Economy / shop chrome labels — L43-02 / technical spec v6 §6.1.`): 13–17 (`dir`, `source()`), 26–48 under `describe('economy chrome labels (L43-02)')`. In `chrome-labels.test.ts` delete 25–48, 13–17, 5–7.

  None of the four trimmed files then contains `readFileSync`, `node:path` or `node:url`.

- [ ] **Step 11: Run.** `pnpm vitest run --project client table-banner dialog-width opponent-seat-resources chrome-labels` → `Test Files  8 passed (8)`, `Tests  26 passed (26)`.

- [ ] **Step 12: Split the other three OWNER-CHECK files.**
  - `screens/home.admin-route.test.ts` (citation `Admin route — Lot 61-06.`, L76): lines 7–8, 10–12, then `describe('admin route (Lot 61-06)')` > `it('renders /admin before game phases and redirects /inbox to feedback (home)')` with lines 17, 21–22. In `admin/admin-route.test.ts` delete 17, 21, 22.
  - `screens/table.claim-seat-dialog.test.ts` (citation `Walk-in watching-hands copy — L57-16.`, L75): `const here`, 105–109 under `describe('walkInSeesPrivateHands (L57-16)')`. In `screens/claim-seat-dialog.test.ts` delete 104–109; keep `here` and node imports.
  - `fx/table-fx-overlay.play-flyout.test.ts` (citation `Token flyout overlay chrome — L51-14.`, L78): `const dir`, `describe('measureTokenFlyout playerId (L51-09 / L51-13)')` > `it('token chip chrome is asCard-only — width must not promote resource icons (L51-14) (table-fx-overlay)')` with 67–71 (4 expects). In `fx/play-flyout.test.ts` delete 67–71.

- [ ] **Step 13: Run.** `pnpm vitest run --project client admin-route claim-seat-dialog play-flyout` → `Test Files  6 passed (6)`, `Tests  21 passed (21)`.

- [ ] **Step 14: Lossless check.** FIND-EXPECT → `287`; file variant → `28`; `it(` variant → `64` (+12 from the 5 split `it()`s). Step 2 readFileSync count → `65`. `pnpm vitest run --project client` → `Test Files  119 passed (119)`, `Tests  447 passed (447)`.

- [ ] **Step 15: Update `docs/backlog_v7_test_classification.md`** (in-place text bottom-up, then delete, move, add rows).
  - (a) Line 3, after the first sentence: `Re-checked by L72-02: every row's file and it() title exist, and every file whose source-text rows spanned two owner lots was split by owner (docs/agent/testing.md), leaving 65 readFileSync files.` Append `**Kept** = no V7 lot rewrites the code the test reads.` Counts (lines 8–11): product-behavior `119`, old-layout-detail `34`, logic-not-source-text `63`, Total `216`.
  - (b) Lines 31–67, 88, 89, 93, 94, 146, 149, 167, 170, 171: rewrite each stale move to the real one (L72-03 for fx/help/action-log/awards, L72-04 for design/ and screens/table/) and where the test now lives (Step 17, splits above). Keep references to the L73 view-model tests (`seats()`, `selfStrip()`, `cardActions()`, `shop()`, `log()`, `rulesRecall()`, §10.3 Spy fixes). Row 46 → `It moves to ui/tutorial-hints-independence.test.ts beside help-storage.ts in L72-03 (logic-only after L72-02); only its select-hint import changes (§4.1, §12.2).` Row 55 → `The it() reads no source; L72-04 moves it unchanged out of pending-queue.test.ts into src/view-model/pending-chip-tone.test.ts beside the moved module (§12.2).` Row 47: the toString duplicate retires only in a lot that rewrites resetHelpStorage (none planned). `The L72 artFor path` → `The L72-10 artFor path`; `The L72 ui/ kit sheet` → `The L72-15 ui/kit details`.
  - (c) File cell → the new file for rows 24–25, 98, 125, 135–138, 170–171, 86–87 (Test suffix `(table) [table.tsx part]` / `(table) [table/economy-bar.tsx part]`), 205 `(home)`, 206 `(lobby)`, 238 `(end)`, 250 `(table-fx-overlay)`.
  - (d) Delete rows 96, 196, 202. Add 11 `product-behavior` rows (the 4 Step 4 files, the 5 Step 8 files, `screens/home.admin-route.test.ts`, trimmed `admin/admin-route.test.ts`), each in its owner's section ((f) creates Lot 81 and Kept): Test `<describe> > <it title>`, Asserts = its expects, Replacement = the matching case of the deleted row. 96: (1)+(2) → table; (4) → game-over-dialog; App → GameApp phase-router component test leaving `readHintState().skipAll` false and HINTS_STORAGE_KEY unwritten (§4.4); home → Home component test, moving with home.tsx in L76-01. 196: (1) → table-shell; (2) → home, lobby; (3) → index (L81-03 rewrites index.css). 202: App half → `admin/admin-route.test.ts` (L80); Home half → home.admin-route.
  - (e) Cut rows 31–67 (37) to after row 25; delete the `## Owner lot 73` heading and table header; under `## Owner lot 72` add `Also holds the pure-module rows that L72-03 / L72-04 move (listed under Owner lot 73 until L72-02).`
  - (f) After Owner lot 80 add `## Owner lot 81` (index row) and `## Kept` (intro `These tests read code V7 keeps unchanged (§4.1); L81-04 lists them as kept.`; use-room-connection row, kept as is, 96 case (3)). Under `## Owner lot 75/76` add `Each file here reads one design/ source whose last importers go in L75 (table) and L76 (home, lobby); it retires with the last importer, L81-02 at the latest.`

- [ ] **Step 16: Verify the classification.** 1. OWNER-CHECK → no output. 2. Rows name real files and `it()`s → no output:
```bash
sed 's/\\|/!/g' docs/backlog_v7_test_classification.md | awk -F'|' '/^\| `/{f=$2; t=$3; gsub(/[ `]/,"",f); sub(/^ +/,"",t); sub(/ +$/,"",t); n=split(t,a," > "); it=a[n]; sub(/ \[[^]]*\]$/,"",it); print f "\t" it}' | while IFS=$'\t' read -r f it; do p="apps/client/src/$f"; [ -f "$p" ] || { echo "MISSING FILE $f"; continue; }; grep -qF -- "$it" "$p" || echo "MISSING IT $f :: $it"; done
```
3. Every readFileSync file has a row → no output:
```bash
comm -23 <(grep -rl readFileSync apps/client/src --include='*.test.ts' | sed 's|apps/client/src/||' | sort) <(sed 's/\\|/!/g' docs/backlog_v7_test_classification.md | awk -F'|' '/^\| `/{f=$2; gsub(/[ `]/,"",f); print f}' | sort -u)
```
4. Class counts → `63 logic-not-source-text`, `34 old-layout-detail`, `119 product-behavior`:
```bash
sed 's/\\|/!/g' docs/backlog_v7_test_classification.md | awk -F'|' '/^\| `/{c=$5; gsub(/ /,"",c); n[c]++} END{for (k in n) print n[k], k}' | sort -k2
```
5. No stale move text → `0`:
```bash
grep -cE "in L73|L73 move|L73 module move|L73 pure-module|\(L73, §12\.2\)|§4\.1, L73|When L73 moves|regenerated at the start of L72|regenerated at L72" docs/backlog_v7_test_classification.md
```
6. Re-read every row touched in 15(c)/(d) against the file it names.

- [ ] **Step 17: Add `### §4.1 pure-module dispositions` to `docs/backlog_v7.md`** after the Lot 72 task table, before the `---` opening Lot 73. Note line: `Regenerated by L72-02 at 6e4575a: the 26 non-test .ts modules under design/ and screens/table/ plus the §4.1 modules elsewhere. L72-03/L72-04 move exactly these with git mv (basename kept, tests beside their module, only import and readFileSync paths change, no shim).` Columns `| Module | React import | Disposition | Destination | Task | Tests that move with it |`. Every Module cell is the full path relative to `apps/client/src` in backticks, one module per row. Same-name `.test.ts` moves unless noted:
  - L72-03 → `view-model/`: `fx/incoming-threat-diff.ts`, `fx/threat-tone.ts` (keeps `import type { ThreatTone } from '../fx/table-fx-types'`), `fx/opponent-token-chips.ts`, `action-log/action-log.ts`, `help/select-hint.ts`, `screens/game-over-awards.ts`.
  - L72-03 extract `fx/play-flyout.ts` → `ui/fx-anchors.ts`: five `*_ZONE` constants, `DECK_CARD_FLYOUT_WIDTH/HEIGHT`, `escapeSelector`, `tokenFlyout{Resource,Seat,Pov}Selector`; `visibleClientRect` and `query*`/`measure*` stay; no test moves.
  - L72-03 → `ui/`: `help/hint-ids.ts`, `help/release-storage.ts`, `help/help-storage.ts` (`help/tutorial-hints-independence.test.ts` (logic its only) moves with it to ui/).
  - L72-04 → `ui/`: `design/asset-lookup.ts`, `design/seat-colors.ts` (type-only `CSSProperties`), `design/components/effect-text-tokens.ts`, `design/components/structured-cost.ts`, `design/components/resource-captions.ts`, `design/components/visual-viewport.ts` (no test); `design/components/dialog-width.ts` → `ui/primitives/dialog-width.ts`.
  - L72-04 → `view-model/`, all `screens/table/`: `table-helpers.ts` (+ `table-helpers-kit.test.ts`), `opponent-seat-resources.ts`, `pending-chip-tone.ts` (its it() moves from pending-queue.test.ts to view-model/pending-chip-tone.test.ts in L72-04), `attack-targets.ts`, `chat-unread.ts`, `table-banner.ts`, `tutorial-coach-copy.ts`, `table-copy.ts`, `kit-inspect-traits.ts`, `kit-special-card-key.ts` (both: `kit-inspect-dialog.test.ts` stays, imports edited), `chrome-labels.ts` (`help/hint-copy.test.ts` import updated), `table-flag-intent.ts`, `active-display.ts` (no test), `sub-choice/sub-choice-constants.ts` (no test; only importer `screens/table.tsx` via `sub-choice/index.ts`).
  - Delete: `screens/table/persistent-incoming.ts` + test · L73-05. Retire with consumers: `screens/table/card-band-fit.ts`, `screens/table/felt-collapse.ts` · L75-10; `screens/table/sub-choice/index.ts` (React barrel) · L75-11, L72-04 drops its `CLIENT_SUB_CHOICE_MS` re-export. Not pure, stays: `design/components/choice-tile-chrome.ts` (type-only `CSSProperties`) · goes with its last importers, L81-02 at the latest. Stay: `fx/motion-timing.ts`, `fx/resource-flow-flash.ts`, `fx/table-fx-types.ts`, `fx/token-flyout-skip.ts` (Lot 78); `help/hint-copy.ts`, `help/place-hint-card.ts` (L75).

- [ ] **Step 18: Verify the table.**
```bash
for f in $(cd apps/client/src && find design screens/table -name '*.ts' ! -name '*.test.ts' | sort) fx/incoming-threat-diff.ts fx/threat-tone.ts fx/opponent-token-chips.ts fx/play-flyout.ts action-log/action-log.ts help/select-hint.ts help/hint-ids.ts help/help-storage.ts help/release-storage.ts screens/game-over-awards.ts; do grep -qF "| \`$f\` |" docs/backlog_v7.md || echo "NO ROW $f"; done
```
Expected: no output (36 lines before Step 17).
```bash
cd apps/client/src && find design screens/table -name '*.ts' ! -name '*.test.ts' | sort | while read -r f; do grep -qE "from '(react|react-dom|motion)(/[^']*)?'" "$f" && echo "react $f" || echo "pure  $f"; done
```
Expected: 26 lines; `react` only for `design/seat-colors.ts` and `design/components/choice-tile-chrome.ts`.

- [ ] **Step 19: Document the convention.** In `docs/agent/testing.md` under `## Layout`, after its first paragraph, add **Source-text tests (V7, technical spec v7 §12.1)**: a `readFileSync` test reads code of one V7 owner lot only (see `docs/backlog_v7_test_classification.md`); a file spanning lots splits into `<read-source-basename>.<original-test-basename>.test.ts` beside the source (precedent `net/use-room-connection.forfeit.test.ts`); `expect()`s move verbatim; split parts get the ` (<read-source-basename>)` suffix, so compare `expect()` counts, not `it()` counts; split a module test's source-text `it()`s before the module moves.

- [ ] **Step 20: Record the acceptance change.** In `docs/backlog_v7.md`, reword the L72-02 clause `The number of it() cases is unchanged (moved, not dropped).` to `The number of expect() assertions is unchanged (moved verbatim, not dropped); it() count rises only where a multi-screen it() is split by owner.` Append to `docs/agent/decisions.md` `## <today> · [P] L72-02 splits source-text tests by owner lot`: 287 `expect()` before and after; +12 `it()` (435 → 447) from five split multi-screen `it()`s.

- [ ] **Step 21: Backlog.** In the L77-01 row, `` `feedback-surfaces.test.ts` `` → `` `screens/end.feedback-surfaces.test.ts` ``. In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

- [ ] **Step 22: Gate.** `pnpm verify` → `tsc` clean, `eslint .` silent, client `Test Files  119 passed (119)`, `Tests  447 passed (447)`, shared/server unchanged. `git status --short` shows only the 30 test paths, 4 docs, and untracked `.claude/` if L72-01 left it.

- [ ] **Step 23: Commit.**
```bash
git add -A -- apps/client/src/{index.visual-viewport,App.tutorial-hints-independence}.test.ts \
  apps/client/src/net/use-room-connection.tutorial-hints-independence.test.ts \
  apps/client/src/help/tutorial-hints-independence.test.ts apps/client/src/feedback/feedback-surfaces.test.ts \
  apps/client/src/design/components/{visual-viewport,dialog-width,dialog.dialog-width}.test.ts \
  apps/client/src/screens/{home,lobby}.visual-viewport.test.ts \
  apps/client/src/screens/{home,lobby,table,end}.feedback-surfaces.test.ts \
  apps/client/src/screens/{home,game-over-dialog,table}.tutorial-hints-independence.test.ts \
  apps/client/src/screens/{home.admin-route,table.claim-seat-dialog,claim-seat-dialog}.test.ts \
  apps/client/src/screens/table/{table-shell.visual-viewport,your-turn-flash.table-banner,table-banner}.test.ts \
  apps/client/src/screens/table/{opponent-zone.opponent-seat-resources,opponent-seat-resources}.test.ts \
  apps/client/src/screens/table/{economy-bar.chrome-labels,chrome-labels}.test.ts \
  apps/client/src/admin/admin-route.test.ts apps/client/src/fx/{play-flyout,table-fx-overlay.play-flyout}.test.ts \
  docs/backlog_v7.md docs/backlog_v7_test_classification.md docs/agent/testing.md docs/agent/decisions.md
git commit -F - <<'EOF'
test(client): split source-text tests (L72-02)

Split every source-text test whose assertions span two V7 owner lots
into <read-source>.<original-test>.test.ts files beside the source,
so each lot later classifies only its own files (spec v7 §12.1), and
record the §4.1 pure-module dispositions for L72-03/L72-04.

Assertions moved verbatim: 287 expect() calls before and after.
Splitting five multi-screen it() blocks raises the client test count
by 12 (435 -> 447); no assertion was dropped or loosened.
EOF
```

**Decisions:**
- Invariant is the expect() count (287 before and after), not the it() count: splitting 5 multi-screen it()s raises client tests 435 -> 447. The L72-02 Acceptance line is reworded to match and a dated [P] entry goes in docs/agent/decisions.md, so decisions.md is added to Files and to git add (critic fix).
- help/tutorial-hints-independence.test.ts becomes logic-only here, and L72-03 moves it to ui/tutorial-hints-independence.test.ts. This aligns with L72-03 and overrides the author's earlier 'stays in help/' (critic fix).
- The pendingChipCalloutTone it() is moved by L72-04 out of pending-queue.test.ts into view-model/pending-chip-tone.test.ts. This aligns with L72-04 and overrides the earlier 'stays in pending-queue.test.ts, L75 moves it' wording (critic fix).
- §4.1 table: every Module cell is the full path relative to apps/client/src, one module per row, so the Step 18 grep coverage check can match them (critic fix).
- OWNER-CHECK found 3 split targets the contract does not name, split under its 'any other file reading two owner lots' rule: admin-route (home part to L76), claim-seat-dialog (table.tsx it() to L75), play-flyout (overlay L51-14 part to L78). play-flyout.test.ts keeps its play-flyout.ts literals.
- The chrome-labels component it() moves whole into one file, screens/table/economy-bar.chrome-labels.test.ts, because economy-bar, shop-dialog and card-actions are all L75 and in the same folder. dialog.dialog-width.test.ts also keeps the index.css it(), as the contract specifies.
- Title rule: a split-off part of an it() gets the suffix ' (<read-source-basename>)'. A whole it() that moves, and a part that stays in the original file, keep the original title.
- Classification restructure: the 37 Owner lot 73 rows (pure-module moves now done in L72-03/04) fold into Owner lot 72. New sections Owner lot 81 (index.visual-viewport) and Kept (use-room-connection) are added. Owner lot 75/76 stays, with a retirement note. Totals become 216 rows, 119 product-behavior.
- sub-choice-constants: at 6e4575a its only importer is screens/table.tsx, through sub-choice/index.ts, not the importers the contract note lists. The §4.1 table records the real importer.
- Out-of-contract doc edits: a testing.md paragraph on the split convention (AGENTS.md §12) and the L77-01 path fix (feedback-surfaces.test.ts -> screens/end.feedback-surfaces.test.ts).
- Stale references in other lot plans are not edited here: L76-01, L77-01/02, L78 and the L72-20 base-name list. Flagged, not fixed: the L75-08 acceptance claims the L51-14 overlay assertion, but the classification assigns it to L78.
- The run steps use Vitest filename filters (visual-viewport, feedback-surfaces, tutorial-hints-independence, table-banner, dialog-width, opponent-seat-resources, chrome-labels, admin-route, claim-seat-dialog, play-flyout). At 6e4575a no other client test file name contains these strings, so the expected counts hold.
- The commit's git add list uses bash brace expansion. It expands to exactly the original 30 test paths (checked by diff) plus the 4 docs.
- Most test code is given as original line ranges at 6e4575a plus the single changed readFileSync path, instead of pasted bodies. The ranges were checked against the files: visual-viewport 15-35, feedback-surfaces 16-50, tutorial-hints 14-46, admin-route 7-22, play-flyout 67-71, claim-seat-dialog 104-109.

---

### Task L72-03: Move fx, help, action-log and awards pure modules

Spec: technical spec v7 §4.1–§4.3, §12.1, §12.2. Refactor: code and assertions stay byte-identical, only import specifiers change; the purity lint is the one new behavior. Short paths are under `apps/client/src/`.

**Files:**
- Create: `apps/client/src/ui/fx-anchors.ts`, `apps/client/src/view-model/view-model-purity.test.ts`
- Move (`git mv`, basename kept, `.ts` + `.test.ts`): `fx/incoming-threat-diff`, `fx/threat-tone`, `fx/opponent-token-chips`, `action-log/action-log`, `help/select-hint`, `screens/game-over-awards` → `view-model/`; `help/hint-ids`, `help/help-storage`, `help/release-storage` → `ui/`; plus `help/tutorial-hints-independence.test.ts` → `ui/`
- Modify (specifiers only): `screens/{table.tsx,home.tsx,game-over-dialog.tsx}`, `screens/table/{table-banner.ts,table-banner.test.ts,pending-queue.tsx,pending-chip-tone.ts}`, `action-log/action-log-panel.tsx`, `help/{hint-copy.ts,hint-copy.test.ts,hint-overlay.tsx}`, `fx/play-flyout.test.ts`
- Modify: `fx/play-flyout.ts` (declarations cut out), `eslint.config.mjs`, `docs/agent/frontend.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`; `DESIGN.md` only if it exists and maps `ui/`
- Test: every moved `*.test.ts` at its new path, `fx/play-flyout.test.ts`, `view-model/view-model-purity.test.ts`

**Interfaces:**
- Consumes: L72-02's §4.1 dispositions table (`docs/backlog_v7.md`), regenerated `docs/backlog_v7_test_classification.md`, logic-only `help/tutorial-hints-independence.test.ts` (2 `it()`s), `screens/table/table-banner.test.ts` without the your-turn-flash `it()`s; unchanged `fx/table-fx-types` (`ThreatTone`, `TokenFlyoutEndpoint`), `design/asset-lookup` (`type ResourceKind`); `eslint` (`new ESLint({ cwd })`, `lintText(code, { filePath })`), no new dependency.
- Produces — moved modules keep every export name and signature byte-identical:
  - `view-model/incoming-threat-diff.ts`: `isPersistentPresentationId, newIncomingThreats, incomingTargetingYouIds, incomingAttackTargetingYouIds, isIncomingThiefCardId, incomingThiefTargetingYouIds`
  - `view-model/threat-tone.ts`: `threatToneFor(cardId: string): ThreatTone` (type import from `../fx/table-fx-types`)
  - `view-model/opponent-token-chips.ts`: `DirectedTokenChip, DeckCardGhost, LiveResourceSnap, StealTransferResult, chipsForPublicLogEntry, deckCardGhostForPublicLogEntry, playCardGhostsForPublicLogEntry, isStealResolve, leftoverLiveFlowChips, stealTransferChips, boostStealChipsWithRecentYield, regenFlowChips, actionLogFlyoutKey`
  - `view-model/action-log.ts`: `ACTION_LOG_KINDS, ActionLogFilters, NicknameResolver, ActionLog{Text,Player,Damage,Card,Resource}Segment, ActionLogSegment, resourceDeltaClass, resourceSegment, formatActionLogEntrySegments, formatActionLogEntry, entryInvolvesPlayer, filterActionLog, TurnGroup, groupByTurn, RoundGroup, roundOfTurn, groupByRound`
  - `view-model/select-hint.ts`: `SelectHintInput, shouldShowFirstGameHints, selectHint, HintDismissCause, HintDismissContext, hintIdsDismissedBy` (`HintId` from `../ui/hint-ids`)
  - `view-model/game-over-awards.ts`: `HIDDEN_KIT_LABEL = 'Hidden kit'`, `AwardValueKind, AwardRank, GAME_OVER_AWARD_IDS, GameOverAwardId, AwardWinner, GameOverAward, pickGameOverAwards, formatThinkTimeMs, formatAwardValue`
  - `ui/hint-ids.ts`: `HINT_IDS, HintId, isHintId, hintAnchorId, hintPlacePrefer`
  - `ui/help-storage.ts`: `HOW_TO_PLAY_SEEN_KEY = 'card-battle.v6.howToPlaySeen'`, `HINTS_STORAGE_KEY = 'card-battle.v6.hints'`, `HowToPlayContinueTarget, HintStorageState, EMPTY_HINT_STATE, hasSeenHowToPlay, markHowToPlaySeen, resetHelpStorage, readHintState, writeHintState, dismissHint, skipAllHints, dismissHints, applyHintPatch`
  - `ui/release-storage.ts`: `LAST_SEEN_RELEASE_ID_KEY = 'card-battle.v6.lastSeenReleaseId'`, `readLastSeenReleaseId, markLatestReleaseSeen, hasUnseenReleaseNotes, shouldAutoOpenWhatsNew`
  - `ui/fx-anchors.ts` (new): `ACTION_LOG_PANEL_ZONE = 'action-log-panel'`, `LOG_COLLAPSED_ZONE = 'log-collapsed'`, `OPPONENTS_COLLAPSED_ZONE = 'opponents-collapsed'`, `INCOMING_PENDING_ZONE = 'incoming-pending'`, `INCOMING_COLLAPSED_ZONE = 'incoming-collapsed'`, `DECK_CARD_FLYOUT_WIDTH = 48`, `DECK_CARD_FLYOUT_HEIGHT = 72`, `escapeSelector(value: string): string`, `tokenFlyoutResourceSelector(kind: ResourceKind, playerId?: string): string`, `tokenFlyoutSeatSelector(playerId: string): string`, `tokenFlyoutPovSelector(playerId: string): string`
  - `eslint.config.mjs`: purity block on `apps/client/src/view-model/**/*.ts` (Step 12).
  - Downstream: L72-04 repoints the `../design/*` / `../screens/table/*` imports of `view-model/opponent-token-chips.ts` and `ui/fx-anchors.ts`; L72-13 updates the `'lot-72'` pin in `ui/release-storage.test.ts`.

- [ ] **Step 1: Check preconditions and mark In progress**

```bash
grep -n "^| L72-02 " docs/backlog_v7.md
grep -n "L72-03" docs/backlog_v7.md | head -20
grep -c readFileSync apps/client/src/help/tutorial-hints-independence.test.ts
ls apps/client/src/view-model
```

Expected: the L72-02 row ends `| Done |`. The §4.1 table matches **Files**; if it differs, follow the table and note the difference in the PR. The `grep -c` prints `0`, and `ls` prints `No such file or directory`. Then set the `| L72-03 |` Status to `In progress`.

- [ ] **Step 2: Record the baseline at the old paths**

```bash
pnpm vitest run --project client apps/client/src/fx/{incoming-threat-diff,threat-tone,opponent-token-chips,play-flyout}.test.ts apps/client/src/action-log/action-log.test.ts apps/client/src/help/{select-hint,hint-ids,help-storage,release-storage,tutorial-hints-independence}.test.ts apps/client/src/screens/game-over-awards.test.ts
pnpm vitest run --project client
grep -rl readFileSync apps/client/src --include='*.test.ts' | sort > "${TMPDIR:-/tmp}/l72-03-rfs-before.txt"
```

Expected: `Test Files  11 passed (11)`, `Tests  104 passed (104)`. Record the second run's `Tests  N passed (N)` as **N**.

- [ ] **Step 3: Move the files**

```bash
mkdir -p apps/client/src/{view-model,ui}
mv2() { git mv "apps/client/src/$1.ts" "apps/client/src/$2.ts" && git mv "apps/client/src/$1.test.ts" "apps/client/src/$2.test.ts"; }
for m in fx/incoming-threat-diff fx/threat-tone fx/opponent-token-chips action-log/action-log help/select-hint screens/game-over-awards; do mv2 "$m" "view-model/${m##*/}"; done
for b in hint-ids help-storage release-storage; do mv2 "help/$b" "ui/$b"; done
git mv apps/client/src/help/tutorial-hints-independence.test.ts apps/client/src/ui/tutorial-hints-independence.test.ts
git status --short | grep -c '^R'
```

Expected: `19`.

- [ ] **Step 4: Typecheck fails on the importers**

Run: `pnpm --filter @card-battle/client typecheck`
Expected: FAIL with only `TS2307` errors: `Found 23 errors in 16 files.` The 16 files are the "specifiers only" files except `fx/play-flyout.test.ts`, plus `view-model/{threat-tone,opponent-token-chips,select-hint,select-hint.test}.ts` and `ui/tutorial-hints-independence.test.ts`. If any other file fails, fix it in Step 5 and add it to the commit.

- [ ] **Step 5: Repoint the import specifiers**

For every Step 4 error, change only the specifier string so it points at the module's new home per **Files**. Inside `view-model/`: `./table-fx-types` → `../fx/table-fx-types`, `./hint-ids` → `../ui/hint-ids`, `../fx/incoming-threat-diff` → `./incoming-threat-diff`. Never reorder lines or touch imported names. Leave these alone: `../design/*` and `../screens/table/*` in `view-model/opponent-token-chips{,.test}.ts`, and `./hint-ids` in `ui/help-storage.ts`.

- [ ] **Step 6: Extract `ui/fx-anchors.ts` from `fx/play-flyout.ts`**

- `ui/fx-anchors.ts`: a doc comment citing spec v7 §4.1, then `import type { ResourceKind } from '../design/asset-lookup';`, then the 11 Produces declarations cut verbatim (with their doc comments) from `fx/play-flyout.ts`. The only code change is `function escapeSelector` → `export function escapeSelector`.
- `fx/play-flyout.ts`: keeps `visibleClientRect`, `rectOf`, every `query*`/`measure*` and the private helpers. It imports the 11 names from `'../ui/fx-anchors'`, placed after the `../design/asset-lookup` import. No re-export.
- `fx/play-flyout.test.ts`, and any split file found by `grep -rln "from './play-flyout'" apps/client/src --include='*.test.ts'`: point the `DECK_CARD_FLYOUT_HEIGHT … tokenFlyoutSeatSelector` import at `'../ui/fx-anchors'`. Its `readFileSync('play-flyout.ts')` literals still match.

- [ ] **Step 7: Typecheck passes**

Run: `pnpm --filter @card-battle/client typecheck`. Expected: exit 0 and no `error TS` line.

- [ ] **Step 8: Moved tests pass at their new paths**

```bash
pnpm vitest run --project client apps/client/src/view-model/{incoming-threat-diff,threat-tone,opponent-token-chips,action-log,select-hint,game-over-awards}.test.ts apps/client/src/ui/{hint-ids,help-storage,release-storage,tutorial-hints-independence}.test.ts apps/client/src/fx/play-flyout.test.ts
pnpm vitest run --project client
```

Expected: `Test Files  11 passed (11)` and `Tests  104 passed (104)`, then `Tests  N passed (N)`.

- [ ] **Step 9: Prove the diff is moves and path edits only**

```bash
git add apps/client/src/{view-model,ui,fx,help,action-log,screens}
git diff --cached -M --name-status --diff-filter=R | wc -l
git diff --cached -M --diff-filter=R -U0 | grep -E '^[-+][^-+]' | grep -v "from '"
git diff --cached --diff-filter=M -U0 -- apps/client/src/screens apps/client/src/action-log/action-log-panel.tsx apps/client/src/help apps/client/src/fx/play-flyout.test.ts | grep -E '^[-+][^-+]' | grep -v "from '"
git diff --cached -U0 apps/client/src/fx/play-flyout.ts | grep '^-[^-]' | sed 's/^-//' | while IFS= read -r line; do grep -qxF -- "$line" apps/client/src/ui/fx-anchors.ts || echo "NOT MOVED: $line"; done
git show HEAD:apps/client/src/fx/play-flyout.ts | grep -oE '^export (const|function) [A-Za-z_]+' | awk '{print $3}' | sort > "${TMPDIR:-/tmp}/l72-03-exp-before.txt"
cat apps/client/src/fx/play-flyout.ts apps/client/src/ui/fx-anchors.ts | grep -oE '^export (const|function) [A-Za-z_]+' | awk '{print $3}' | sort | comm -3 "${TMPDIR:-/tmp}/l72-03-exp-before.txt" -
git diff --cached -U0 -- apps/client/src/fx apps/client/src/help apps/client/src/action-log | grep -E '^\+export (\*|(type )?\{[^}]*\}) from'
ls apps/client/src/screens/game-over-awards.ts apps/client/src/help/select-hint.ts apps/client/src/action-log/action-log.ts apps/client/src/fx/threat-tone.ts 2>&1 | grep -c "No such file"
grep -rl readFileSync apps/client/src --include='*.test.ts' | sort | diff "${TMPDIR:-/tmp}/l72-03-rfs-before.txt" -
```

Expected, in order:
1. `19`.
2. No output.
3. No output.
4. Exactly `NOT MOVED: function escapeSelector(value: string): string {`.
5. Exactly one line, `	escapeSelector`.
6. No output (no shim added).
7. `4`.
8. No output (the §12.1 list is unchanged).

- [ ] **Step 10: Write the failing purity test**

Create `apps/client/src/view-model/view-model-purity.test.ts`:

```ts
/** Technical spec v7 §4.3: src/view-model/ imports no React/react-dom/motion and reads no clock. */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const eslint = new ESLint({ cwd: repoRoot });
const VIEW_MODEL_FILE = join(repoRoot, 'apps/client/src/view-model/threat-tone.ts');
const OUTSIDE_FILE = join(repoRoot, 'apps/client/src/fx/play-flyout.ts');
const REACT_IMPORT = "import { useState } from 'react';\n\nexport const probe = useState;\n";
const DATE_NOW = 'export function probe(): number {\n  return Date.now();\n}\n';

async function lintRuleIds(code: string, filePath: string): Promise<(string | null)[]> {
  const messages = (await eslint.lintText(code, { filePath })).flatMap((result) => result.messages);
  expect(messages.filter((message) => message.fatal === true)).toEqual([]);
  return messages.map((message) => message.ruleId);
}

describe('view-model purity lint (technical spec v7 §4.3)', { timeout: 30_000 }, () => {
  it.each([
    ['a react import', REACT_IMPORT, 'no-restricted-imports'],
    ['a motion/react import', "import { motion } from 'motion/react';\n\nexport const probe = motion;\n", 'no-restricted-imports'],
    ['Date.now()', DATE_NOW, 'no-restricted-properties'],
    ['performance.now()', 'export function probe(): number {\n  return performance.now();\n}\n', 'no-restricted-properties'],
  ] as const)('rejects %s under src/view-model/', async (_label, code, ruleId) => {
    expect(await lintRuleIds(code, VIEW_MODEL_FILE)).toContain(ruleId);
  });

  it('leaves the same code alone outside src/view-model/', async () => {
    const ids = [...(await lintRuleIds(REACT_IMPORT, OUTSIDE_FILE)), ...(await lintRuleIds(DATE_NOW, OUTSIDE_FILE))];
    expect(ids).not.toContain('no-restricted-imports');
    expect(ids).not.toContain('no-restricted-properties');
  });
});
```

- [ ] **Step 11: Purity test fails**

Run: `pnpm vitest run --project client apps/client/src/view-model/view-model-purity.test.ts`
Expected: FAIL with `Tests  4 failed | 1 passed (5)`. Each `rejects …` case fails with `expected [ … ] to include '<ruleId>'`, and no fatal message appears.

- [ ] **Step 12: Add the ESLint view-model override**

In `eslint.config.mjs`, add the constant after the imports and the block as the last entry, after the `apps/client/src/**/*.{ts,tsx}` block:

```js
/** Technical spec v7 §4.3: src/view-model/ is pure and never reads a clock. */
const VIEW_MODEL_PURITY_MESSAGE =
  'src/view-model/ is pure: no React, react-dom or motion import and no clock read; callers pass nowMs (technical spec v7 §4.3).';
// …last config entry:
  {
    files: ['apps/client/src/view-model/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: ['react', 'react-dom', 'motion'].map((name) => ({ name, message: VIEW_MODEL_PURITY_MESSAGE })),
        patterns: [{ group: ['react/*', 'react-dom/*', 'motion/*'], message: VIEW_MODEL_PURITY_MESSAGE }],
      }],
      'no-restricted-properties': ['error',
        { object: 'Date', property: 'now', message: VIEW_MODEL_PURITY_MESSAGE },
        { object: 'performance', property: 'now', message: VIEW_MODEL_PURITY_MESSAGE },
      ],
    },
  },
```

- [ ] **Step 13: Purity test and lint pass**

Run: `pnpm vitest run --project client apps/client/src/view-model/view-model-purity.test.ts && pnpm lint`
Expected: `Tests  5 passed (5)`, and `pnpm lint` exits 0.

- [ ] **Step 14: Update `docs/agent/frontend.md`**

1. Before the first `## Design system` heading, add a `## View-model layer (V7 · Lot 72+)` section that cites spec v7 §4.1–4.3 and states:
   - Modules are moved, not rewritten, and no shim stays at an old path.
   - `view-model/` has no React, react-dom or motion import and no clock read; callers pass `nowMs`. The eslint block and the purity test enforce this.
   - `view-model/` imports only `@card-battle/shared` and pure `ui/*.ts` helpers.
   - `threat-tone` and `opponent-token-chips` keep a type-only `fx/table-fx-types` import.
   - The four `ui/` helpers, whose storage keys `card-battle.v6.*` are unchanged.
2. Point the Screens End row, the Threat FX (L39-05) bullet and the Game over awards bullet at `view-model/…`. Append to the **Table FX (Lot 14)** bullet: "Pure FX decisions live in `view-model/`, zone names and selector builders in `ui/fx-anchors.ts`; `fx/play-flyout.ts` keeps the DOM measuring (L72-03)."

Check: `grep -n "incoming-threat-diff\|game-over-awards\|fx-anchors\|View-model layer" docs/agent/frontend.md`. Expected: every hit shows a new path, and the heading appears once.

- [ ] **Step 15: Update the classification appendix paths**

In `docs/backlog_v7_test_classification.md`:
- Both `help/tutorial-hints-independence.test.ts` rows: set File to `ui/tutorial-hints-independence.test.ts` and Replacement to "Moved in L72-03 beside `ui/help-storage.ts`; assertions unchanged".
- The "Reset help remains the clear path" row: if it says to retire the `it()` when the module moves, change it to "kept verbatim by L72-03; retire only with a `decisions.md` entry".
- The `fx/play-flyout.test.ts` rows: "names live in `ui/fx-anchors.ts` since L72-03; test stays in `fx/`".

```bash
grep -oE '^\| `[^`]+\.test\.ts`' docs/backlog_v7_test_classification.md | sed -E 's/^\| `//; s/`$//' | sort -u | while read -r f; do [ -f "apps/client/src/$f" ] || echo "MISSING $f"; done
```

Expected: no output. Before the edit it printed `MISSING help/tutorial-hints-independence.test.ts`. The totals table is unchanged.

- [ ] **Step 16: `DESIGN.md` only if it already maps `ui/`**

Run: `test -f DESIGN.md && grep -n "ui/" DESIGN.md`. Expected: no file, because L72-05 creates it. If the file exists and maps `ui/`, list the four `ui/*.ts` helpers as non-component helpers and add `DESIGN.md` to Step 20's `git add`.

- [ ] **Step 17: Flip the backlog row to Done**

In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

- [ ] **Step 18: Client builds**

Run: `pnpm --filter @card-battle/client build`. Expected: `✓ built in …` and no unresolved import.

- [ ] **Step 19: Full gate**

Run: `pnpm verify`. Expected: tsc and eslint clean, every Vitest project passes with nothing skipped, and the client project shows **N + 5** tests.

- [ ] **Step 20: Commit**

```bash
git add apps/client/src/{view-model,ui} apps/client/src/fx/play-flyout{.ts,.test.ts} apps/client/src/action-log/action-log-panel.tsx apps/client/src/help/{hint-copy.ts,hint-copy.test.ts,hint-overlay.tsx} apps/client/src/screens/{table.tsx,home.tsx,game-over-dialog.tsx} apps/client/src/screens/table/{table-banner.ts,table-banner.test.ts,pending-queue.tsx,pending-chip-tone.ts} eslint.config.mjs docs/agent/frontend.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
git status --short
git commit -m "refactor(client): move pure modules (L72-03)" -m "ui/fx-anchors.ts keeps a type-only ResourceKind import from design/asset-lookup until L72-04 moves that module; escapeSelector is now exported for fx/play-flyout. The logic-only tutorial-hints-independence test moves beside ui/help-storage.ts."
git log -1 --stat | head -5
```

Expected: nothing unstaged under `apps/`, `docs/` or `eslint.config.mjs`; only the untracked `.claude/` may remain. The subject is 44 characters with no AI attribution, and the stat shows the 19 renames.

**Decisions:**
- The logic-only help/tutorial-hints-independence.test.ts moves to ui/tutorial-hints-independence.test.ts beside help-storage (the contract left this open). L72-02's 'stays in help/' wording must be aligned to this (critic fix). The 19-rename / 16-file / 11-file counts depend on it.
- screens/end.tsx, screens/whats-new-dialog.tsx and screens/lobby.tsx stay untouched: none imports a moved module at 6e4575a. The contract note telling L72-03 to update end.tsx is stale. Only game-over-dialog.tsx imports game-over-awards.
- ui/fx-anchors.ts uses `import type { ResourceKind } from '../design/asset-lookup'` until L72-04 moves asset-lookup. This is a temporary exception to 'nothing new imports from design/', the same one allowed for view-model/opponent-token-chips.
- view-model/opponent-token-chips.ts also keeps a type-only import from ../fx/table-fx-types (TokenFlyoutEndpoint). The convention only names threat-tone, so frontend.md records both.
- The 'Reset help remains the clear path' toString it() moves verbatim, because the acceptance requires unchanged assertions. Its classification row is reworded so the test is retired later, only with a decisions.md entry.
- The purity test goes beyond the contract's two probes: it also lints motion/react and performance.now, adds an outside-folder control linted as fx/play-flyout.ts, and fails on any fatal parse message. It uses a 30 s describe timeout because typed linting takes about 1.2 s per probe. The four reject cases are one it.each that keeps the original titles.
- Step 9 checks (critic fixes): the non-rename check uses --diff-filter=M so that renamed files whose destination is outside the pathspec do not show up as deletions. The shim check scans only added lines, because fx/table-fx-types.ts:93 already re-exports from ./motion-timing at 6e4575a.
- Pinned baselines at 6e4575a plus L72-02: the 11 moved and kept test files hold 104 tests, and the typecheck right after the moves reports 'Found 23 errors in 16 files.'
- If the L72-02 §4.1 dispositions table differs from this task's Files list, the table wins and the difference is recorded in the PR.
- Step 3 uses a mv2 shell helper and Steps 2, 8, 9 and 20 use bash/zsh brace expansion. They expand to the same 19 git mv calls and the same git add path list as the original plan, and were checked in a scratch repo.

---

### Task L72-04: Move design and table pure modules

Spec: technical spec v7 §4.1, §4.2, §5.8, §12.1, §12.2; destinations from the "§4.1 pure-module dispositions" table (L72-02). Pure move: bodies, comments and assertions stay; only import specifiers change, plus the path strings in Steps 8 and 16. No shim at an old path. Run from the repo root (quote it: the path has spaces). Short paths are under `apps/client/src/`.

**Files:**
- Move (`git mv`, basename kept) to `ui/`: `design/{asset-lookup,seat-colors}.ts`, `design/components/{effect-text-tokens,structured-cost,resource-captions}.ts`, each with its `.test.ts`; `design/components/visual-viewport.ts` (its test was split in L72-02). To `ui/primitives/`: `design/components/dialog-width.ts` + `.test.ts` (4 pure `it()`s).
- Move to `view-model/`: `screens/table/{table-helpers,opponent-seat-resources,attack-targets,chat-unread,table-banner,tutorial-coach-copy,table-copy,chrome-labels,table-flag-intent}.ts`, each with its `.test.ts`; `screens/table/table-helpers-kit.test.ts`; `screens/table/{pending-chip-tone,kit-inspect-traits,kit-special-card-key,active-display}.ts`; `screens/table/sub-choice/sub-choice-constants.ts`.
- Create: `view-model/pending-chip-tone.test.ts` (its `it()` leaves `screens/table/pending-queue.test.ts`).
- Modify (specifiers only): the importers found in Steps 6 and 8, `screens/table/sub-choice/index.ts`, `screens/table/pending-queue.test.ts`; `screens/how-to-play-screenshots.ts` (one comment path).
- Modify (docs): `docs/agent/frontend.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`; `DESIGN.md` only if it exists.
- Test: every moved test. Untouched and still green: `screens/table/*.table-banner.test.ts`, `design/components/*.dialog-width.test.ts`, `screens/table/*.opponent-seat-resources.test.ts`, `screens/table/*.chrome-labels.test.ts`, the four `*.visual-viewport.test.ts`.

**Interfaces:**
- Consumes (L72-03):
  - `view-model/threat-tone.ts`: `threatToneFor(cardId: string): ThreatTone`
  - `view-model/incoming-threat-diff.ts`: `isPersistentPresentationId(effectId: string): boolean`; `newIncomingThreats(seenIds: ReadonlySet<string>, pendingEffects: readonly PendingEffectView[], you: string): PendingEffectView[]`; `incomingTargetingYouIds(pendingEffects: readonly PendingEffectView[], you: string): Set<string>`
  - `view-model/action-log.ts`: `formatActionLogEntry(/* unchanged */): string`
  - `view-model/opponent-token-chips.ts` + test and `ui/fx-anchors.ts` (`tokenFlyoutResourceSelector(kind: ResourceKind, playerId?: string): string`), still importing `design/` and `screens/table/`; re-pointed here.
  - ESLint block `files: ['apps/client/src/view-model/**/*.ts']` (no react / react-dom / motion, no `Date.now` / `performance.now`) and its probe `view-model/view-model-purity.test.ts`.
- Consumes (L72-02): the split source-text tests above and the §4.1 dispositions table.
- Produces (every export name and signature byte-identical; `/* unchanged */` = today's parameters):
  - `ui/asset-lookup.ts`: `getKitPortraitUrl(kitId: KitId)`, `getOpponentPlaceholderUrl()`, `getCardArtUrl(cardId: CardId, opts: { isUpgraded: boolean; activated?: boolean })`, `getResourceIconUrl(kind: ResourceKind)`, `getCardBackUrl(type: CardBackKind)`, `getAttackLogoUrl()`, `getActionLogoUrl()`, all `: string`; `ALL_ART_CARD_IDS`, `V1_CARD_IDS`, both `: readonly CardId[]`; `export { CARDS_WITH_ACTIVATED_ART }`; `export type { ResourceKind, CardBackKind }`. Globs `'../assets/{kits,cards,icons,backs}/*.png'` unchanged.
  - `ui/seat-colors.ts`: `SEAT_PALETTE_SIZE`; `type SeatIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7`; `SEAT_COLORS`; `interface SeatPlayersView { players: readonly { id: string }[] }`; `seatIndexOf(view: SeatPlayersView, playerId: string): SeatIndex | null`; `clampSeatIndex(index: number): SeatIndex`; `seatColorHex(index: number)`, `seatColorVar(index: number)`, `seatColorWash(hex: string, amount: number)`, `seatColorAlpha(hex: string, alpha: number)`, all `: string`; `interface SeatZoneStyleOptions`; `seatZoneStyle(index: number, options?: SeatZoneStyleOptions)`, `seatNameStyle(index: number)`, both `: CSSProperties`
  - `ui/effect-text-tokens.ts`: `interface EffectResourceSpan { start: number; end: number; amount: number; kind: ResourceKind; insteadOf: boolean }`; `tokenizeEffectResources(text: string): EffectResourceSpan[]`
  - `ui/structured-cost.ts`: `type StructuredCost = { kind: 'points'; amount: number } | { kind: 'lives'; amount: number } | { kind: 'pointsPerLife'; amount: number } | { kind: 'upgradePoint'; amount: number }`; `type CostSign = 'cost' | 'gain'`; `costSignGlyph(signed: CostSign | undefined): string`; `spokenCost(cost: StructuredCost, multiplier: number | undefined, signed?: CostSign): string`; `structuredCostFromCardCost(cost: CardCost | undefined)`, `structuredPlayCost(card: Card, isUpgraded: boolean)`, both `: StructuredCost | null`; `costAriaLabel(cost: StructuredCost | null, signed?: CostSign): string`
  - `ui/visual-viewport.ts`: `interface VisualViewportBox { offsetTop: number; offsetLeft: number; width: number; height: number }`; `readVisualViewportBox(): VisualViewportBox`
  - `ui/resource-captions.ts`: `RESOURCE_CAPTIONS: Record<ResourceKind, string>`; `resourceCaptionMode(captionVisible: boolean | undefined): 'visible' | 'sr-only'`
  - `ui/primitives/dialog-width.ts`: `DIALOG_PANEL_BASE_CLASS: string`; `dialogPreferredMaxWidth(panelClassName: string)`, `dialogPanelClassName(panelClassName: string)`, both `: string`
  - `view-model/table-helpers.ts`: `type RewardKind = RewardChoice['type']`; `REWARD_KINDS: readonly RewardKind[]`; `REWARD_KIND_LABELS: Record<RewardKind, string>`; `REWARD_KIND_COSTS: Partial<Record<RewardKind, StructuredCost>>`; `nicknameOf(view: PlayingStateView, playerId: string): string`; `hasFullSpyCardReveal(player: PublicPlayerView): boolean`; `visibleKitId(player: PublicPlayerView): KitId | null`; `livingSpiesOnYou(view: PlayingStateView): PublicPlayerView[]`; `buildRewardChoice(kind: RewardKind, cardInstanceId: string): RewardChoice | null`; `cardPlayNeedsTarget(cardId: string, isUpgraded = false): boolean`; `activeUpgradeInstanceId(view: PlayingStateView, instance: CardInstance): string | null`; `cardPlayNeedsConsume(cardId: string): boolean`; `cardIsSelfOnlyPlay(cardId: string, isUpgraded = false): boolean`; `cardEffectText(instance: CardInstance): string`
  - `view-model/opponent-seat-resources.ts`: `interface OpponentLiveResources`; `type OpponentResourceDisplay`; with `P = Pick<PublicPlayerView, 'spied' | 'eliminationReveal'>`: `opponentResourceDisplay(player: P): OpponentResourceDisplay`, `opponentKitIsVisible(player: P): boolean`, `opponentHasLiveResourceIcons(player: P): boolean`; `collectLiveResourceSnaps(you: string, self: OpponentLiveResources, players: readonly PublicPlayerView[]): Map<string, OpponentLiveResources>`
  - `view-model/pending-chip-tone.ts`: `pendingChipCalloutTone(cardId: string): 'threat' | 'guide'`
  - `view-model/attack-targets.ts`: `interface AttackTargetSeat`; `riposteAttackerIds(pendingEffects: readonly PendingPick[], you: string): Set<string>`; `attackTargetOpponents<T extends AttackTargetSeat>(opponents: readonly T[], pendingEffects: readonly PendingPick[], you: string): T[]` and `thiefTargetOpponents` with the same signature
  - `view-model/chat-unread.ts`: `chatUnreadCount(input: { messageCount: number; seenCount: number; open: boolean }): number`
  - `view-model/table-banner.ts`: `TABLE_BANNER_MS = 1600`; `type TableBannerCue = 'turn' | 'attacked' | 'dead' | 'won'`; `TABLE_BANNER_COPY: Record<TableBannerCue, string>`; `WIPE_BANNER_COPY = 'You gambled too much and lost everything'`; `isFlashierBanner(cue: TableBannerCue): boolean`; `interface TableBannerInput { isMyTurn: boolean; isEliminated: boolean; youWon: boolean; pendingEffects: readonly PendingEffectView[]; you: string }`; `interface TableBannerWatch`, `emptyTableBannerWatch(): TableBannerWatch`; `interface SentenceBannerWatch`, `emptySentenceBannerWatch(): SentenceBannerWatch`; `sentenceAnnouncementKey(entry: SentenceAnnouncementLogEntry): string`; `interface SentenceBannerInput`; `nextSentenceBannerLines(prev: SentenceBannerWatch, input: SentenceBannerInput)`; `nextWipeBannerLines(prev: SentenceBannerWatch, entries: readonly ActionLogEntryView[], you: string)`; `povHasWon(/* unchanged */): boolean`; `nextTableBannerCues(prev: TableBannerWatch, input: TableBannerInput): { cues: TableBannerCue[]; next: TableBannerWatch }`
  - `view-model/tutorial-coach-copy.ts`: `TUTORIAL_IDLE_MS = 20_000`; `TUTORIAL_IDLE_PLAY_TITLE = 'Play'`; types `TutorialSendIntent`, `TutorialCardActionSpotlight`, `TutorialEconomySpotlight`, `TutorialShopSpotlight`, `CoachResourceKind`, `CoachBodyPart`; `parseCoachBody(text: string): readonly CoachBodyPart[]`; unchanged `resolveTutorialCoach`, `resolveTutorialPresentationCoach`, `tutorialCoachTitle`, `tutorialCoachMessageKey`, `isTutorialCoachOpen`, `tutorialHighlightAt`, `tutorialSendAllowed`, `tutorialSpotlightInstanceIds`, `tutorialCardActionSpotlight`, `tutorialEconomySpotlight`, `tutorialShopSpotlight`, `tutorialPortraitSpotlight`, `isTutorialIncomingThreatCard`, `tutorialIncomingThreatIds`
  - `view-model/table-copy.ts`: `HIDDEN_KIT_LABEL = 'Hidden kit'`, `HIDE_COACH_ARIA_LABEL = 'Hide coach'`, `OPEN_COACH_ARIA_LABEL = 'Show coach'`, `GOT_IT_ACTION_LABEL = 'Got it'`, `FEEDBACK_ARIA_LABEL = 'Feedback'`, every other label constant unchanged
  - `view-model/kit-inspect-traits.ts`: `KIT_TRAIT_SECTION_KEYS: readonly ['alwaysUpgraded','immuneTo','allowsMultipleAttacksPerTurn','upgradePointBuyCost','upgradePointSellYield','drawBustDenominator']`; `KIT_ABILITY_COPY: Partial<Record<KitId, string>>`
  - `view-model/kit-special-card-key.ts`: `kitSpecialCardKey(cardId: string, index: number): string`
  - `view-model/chrome-labels.ts`: `DRAW_ACTION_LABEL = 'Draw'` … `SHOP_SECTION_POOL = 'Pool'`, plus `CHROME_COST_LABELS`
  - `view-model/table-flag-intent.ts`: `type TableFlagIntent = 'hidden' | 'forfeit' | 'leaveTable' | 'returnHome' | 'skipTutorial'`; `type TableFlagLeaveAction = 'hidden' | 'forfeit' | 'leaveGame'`; unchanged `tableFlagIntent`, `tableFlagLeaveAction`, `tableFlagAriaLabel`
  - `view-model/active-display.ts`: `export { ACTIVE_SHIELD_INSTANCE_ID }`; `persistentToCardInstance(effect: PersistentEffectView): CardInstance`; `shieldActiveInstance(isUpgraded: boolean): CardInstance`
  - `view-model/sub-choice-constants.ts`: `CLIENT_SUB_CHOICE_MS = 40_000`

- [ ] **Step 1: Check the preconditions and mark the task In progress**

```bash
git status --short
grep -n '^| L72-03 ' docs/backlog_v7.md | grep -c '| Done |'
(cd apps/client/src && test -e view-model/threat-tone.ts && test -e ui/fx-anchors.ts && test ! -e design/components/visual-viewport.test.ts && echo OK-PRE \
  && ls screens/table/*.table-banner.test.ts design/components/*.dialog-width.test.ts screens/table/*.opponent-seat-resources.test.ts screens/table/*.chrome-labels.test.ts \
  && grep -c readFileSync design/components/dialog-width.test.ts screens/table/opponent-seat-resources.test.ts screens/table/table-banner.test.ts screens/table/chrome-labels.test.ts)
```
Expected: clean status; `1`; `OK-PRE`, then at least one file per glob; each of the four counts is `:0`. Any failure: L72-02 or L72-03 is incomplete, stop. Then set the `L72-04` row in `docs/backlog_v7.md` from `To do` to `In progress`.

- [ ] **Step 2: Record the baseline**

```bash
pnpm vitest run --project client 2>&1 | tail -6
grep -rl readFileSync apps/client/src --include='*.test.ts' | wc -l
```
Expected: all pass. Note F (`Test Files  F passed (F)`), T (`Tests  T passed (T)`) and R (the `readFileSync` file count).

- [ ] **Step 3: Write the failing test `view-model/pending-chip-tone.test.ts`**

Per the classification row as L72-02 Step 15(b) row 55 rewrites it: "L72-04 moves it unchanged out of pending-queue.test.ts into src/view-model/pending-chip-tone.test.ts beside the moved module (§12.2)."

```ts
/**
 * Pending chip callout tone — L51-07. Moved beside its module from
 * screens/table/pending-queue.test.ts (L72-04, technical spec v7 §12.2).
 */

import { describe, expect, it } from 'vitest';

import { pendingChipCalloutTone } from './pending-chip-tone';

describe('pending queue callouts (L51-07)', () => {
  it('uses red for attack-tone chips and orange for other real pending', () => {
    expect(pendingChipCalloutTone('basic-attack')).toBe('threat');
    expect(pendingChipCalloutTone('sentence')).toBe('threat');
    expect(pendingChipCalloutTone('spy')).toBe('guide');
    expect(pendingChipCalloutTone('thief')).toBe('guide');
  });
});
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `pnpm vitest run --project client src/view-model/pending-chip-tone.test.ts src/ui/asset-lookup.test.ts src/view-model/table-banner.test.ts`
Expected: `FAIL src/view-model/pending-chip-tone.test.ts` with `Failed to resolve import "./pending-chip-tone"`; `Test Files  1 failed (1)` (the other two paths do not exist yet).

- [ ] **Step 5: `git mv` the `ui/` batch (13 renames)**

```bash
(cd apps/client/src && mkdir -p ui/primitives \
 && for m in asset-lookup seat-colors; do git mv design/$m.ts ui/$m.ts && git mv design/$m.test.ts ui/$m.test.ts; done \
 && for m in effect-text-tokens structured-cost resource-captions; do git mv design/components/$m.ts ui/$m.ts && git mv design/components/$m.test.ts ui/$m.test.ts; done \
 && git mv design/components/visual-viewport.ts ui/visual-viewport.ts \
 && git mv design/components/dialog-width.ts ui/primitives/dialog-width.ts \
 && git mv design/components/dialog-width.test.ts ui/primitives/dialog-width.test.ts)
```
Expected: exit 0; `ls apps/client/src/design` shows only `components`.

- [ ] **Step 6: Re-point every `ui/` import**

```bash
UI="from '(\.\./)+design/(asset-lookup|seat-colors)'|from '[^']*design/components/(effect-text-tokens|structured-cost|visual-viewport|dialog-width|resource-captions)'|from '\.\./(asset-lookup|seat-colors)'|from '\./(effect-text-tokens|structured-cost|visual-viewport|dialog-width|resource-captions)'"
(cd apps/client/src && grep -rlE "$UI" design fx action-log help screens view-model)
```
In each listed file, replace only the specifier with the relative path to the new file; this includes `screens/table/table-helpers.ts` (→ `'../../ui/structured-cost'`, fixed again after its Step 7 move). Also inside `ui/`: `effect-text-tokens.ts` and `resource-captions.ts` `'../asset-lookup'` → `'./asset-lookup'`; `fx-anchors.ts` `'../design/asset-lookup'` → `'./asset-lookup'`. The `ui/*.test.ts` self-imports stay.
Expected: rerunning the block above prints nothing.

- [ ] **Step 7: `git mv` the `view-model/` batch (24 renames)**

```bash
(cd apps/client/src \
 && for m in table-helpers opponent-seat-resources attack-targets chat-unread table-banner tutorial-coach-copy table-copy chrome-labels table-flag-intent; do git mv screens/table/$m.ts view-model/$m.ts && git mv screens/table/$m.test.ts view-model/$m.test.ts; done \
 && git mv screens/table/table-helpers-kit.test.ts view-model/table-helpers-kit.test.ts \
 && for m in pending-chip-tone kit-inspect-traits kit-special-card-key active-display; do git mv screens/table/$m.ts view-model/$m.ts; done \
 && git mv screens/table/sub-choice/sub-choice-constants.ts view-model/sub-choice-constants.ts)
```
Expected: exit 0.

- [ ] **Step 8: Re-point every `view-model/` import, drop the barrel re-export, trim `pending-queue.test.ts`**

```bash
VM="from '[^']*(table/|\./|\.\./)(table-helpers|opponent-seat-resources|attack-targets|chat-unread|table-banner|tutorial-coach-copy|table-copy|chrome-labels|table-flag-intent|pending-chip-tone|kit-inspect-traits|kit-special-card-key|active-display|sub-choice-constants)'"
(cd apps/client/src && grep -rlE "$VM" design help screens)
```
Re-point each listed file the same way (`screens/table/kit-inspect-dialog.test.ts` stays beside the dialog; only its two specifiers change). Inside `view-model/`: `table-helpers.ts` `'../../ui/structured-cost'` → `'../ui/structured-cost'`; `pending-chip-tone.ts`, `table-banner.ts`, `table-banner.test.ts` `'../../view-model/<m>'` → `'./<m>'`; `opponent-token-chips.ts` `'../screens/table/opponent-seat-resources'` → `'./opponent-seat-resources'`. Plus four edits:
- `screens/table/sub-choice/index.ts`: delete `export { CLIENT_SUB_CHOICE_MS } from './sub-choice-constants';`; only `export { SubChoiceHost } from './sub-choice-host';` remains.
- `screens/table.tsx`: replace `import { CLIENT_SUB_CHOICE_MS, SubChoiceHost } from './table/sub-choice';` with `import { SubChoiceHost } from './table/sub-choice';` and `import { CLIENT_SUB_CHOICE_MS } from '../view-model/sub-choice-constants';`.
- `screens/table/pending-queue.test.ts`: delete the `it('uses red for attack-tone chips and orange for other real pending', …)` block and `import { pendingChipCalloutTone } from './pending-chip-tone';`; the other `it()`s, `dir` and the `readFileSync` imports stay.
- `screens/how-to-play-screenshots.ts` line 4 comment: `` `design/asset-lookup.ts` `` → `` `ui/asset-lookup.ts` ``.

Expected: rerunning the block above prints nothing; `grep -c pendingChipCalloutTone apps/client/src/screens/table/pending-queue.test.ts` prints `0`.

- [ ] **Step 9: Run the moved and neighbouring tests**

Run: `pnpm vitest run --project client src/view-model/pending-chip-tone.test.ts src/ui/asset-lookup.test.ts src/view-model/table-banner.test.ts`
Expected: `Test Files  3 passed (3)`.

Run: `pnpm vitest run --project client src/ui/ src/view-model/ visual-viewport dialog-width table-banner opponent-seat-resources chrome-labels pending-queue private-zone kit-inspect-dialog hint-copy`
Expected: all pass, including `ui/asset-lookup.test.ts` › "maps Roulette cream/pink faces and copies them onto activated filenames", the four `*.visual-viewport.test.ts` no-`100dvh` tests, `design/components/*.dialog-width.test.ts` (still finds `dialogPreferredMaxWidth` and `readVisualViewportBox` in `dialog.tsx`) and `view-model/view-model-purity.test.ts`.

- [ ] **Step 10: Typecheck**

Run: `pnpm typecheck`
Expected: exit 0, no `error TS` line (no `TS2307 Cannot find module`).

- [ ] **Step 11: Check the structure: no shim, no back-import, renames only**

```bash
git grep -nE "^export (\{|type \{|\*)" -- apps/client/src/design apps/client/src/screens/table
grep -rnE "from '(\.\./)+(design|screens)/" apps/client/src/ui apps/client/src/view-model
git add -A apps/client/src && git diff --cached -M --name-status -- apps/client/src | cut -c1 | sort | uniq -c
git diff --cached -M --name-status -- apps/client/src | grep -E '^(A|D)'
```
Expected:
- First: exactly `apps/client/src/screens/table/sub-choice/index.ts:1:export { SubChoiceHost } from './sub-choice-host';`.
- Second: nothing (`view-model/threat-tone.ts` keeps `'../fx/table-fx-types'`, which does not match).
- Third: `1 A`, `M` for the importers, `37 R`.
- Fourth: only `A	apps/client/src/view-model/pending-chip-tone.test.ts`.
- Every "MOVE in L72-04" row of the §4.1 dispositions table names a destination for which `test -e apps/client/src/<destination>` succeeds.

- [ ] **Step 12: Lint the moved layers**

Run: `pnpm exec eslint apps/client/src/ui apps/client/src/view-model`
Expected: no output, exit 0 (the 14 new `view-model/` modules pass the L72-03 purity block).

- [ ] **Step 13: Compare the full client run with the baseline**

```bash
pnpm vitest run --project client 2>&1 | tail -6
grep -rl readFileSync apps/client/src --include='*.test.ts' | wc -l
```
Expected: `Test Files  F+1 passed (F+1)`; `Tests  T passed (T)` (same `it()` count); the `readFileSync` count is still R.

- [ ] **Step 14: Check the production build**

Run: `pnpm --filter @card-battle/client build`
Expected: ends with `✓ built in …`, no `Could not resolve` (the `import.meta.glob` PNG paths in `ui/asset-lookup.ts` resolve outside Vitest).

- [ ] **Step 15: Smoke-check that the old table and lobby render as before**

Start the `server` and `client` configurations from `.claude/launch.json`; open `http://localhost:5173` at 375×812; check Home kit and card art; create a room (the lobby kit picker shows portraits); start a 4-seat solo game.
Expected: the table shows card art, seat-coloured names, shop costs with resource icons and the kit inspect sections; an open Dialog stays inside the viewport; `read_console_messages` with `onlyErrors` returns none. Stop both servers (the full post-lot gate is L72-21).

- [ ] **Step 16: Update the classification appendix**

```bash
perl -pi -e 's#^\| `design/asset-lookup\.test\.ts`#| `ui/asset-lookup.test.ts`#; s#^\| `design/components/dialog-width\.test\.ts`#| `ui/primitives/dialog-width.test.ts`#; s#^\| `screens/table/table-banner\.test\.ts`#| `view-model/table-banner.test.ts`#; s#^\| `screens/table/opponent-seat-resources\.test\.ts`#| `view-model/opponent-seat-resources.test.ts`#; s#^\| `screens/table/chrome-labels\.test\.ts`#| `view-model/chrome-labels.test.ts`#' docs/backlog_v7_test_classification.md
```
By hand: in the row whose test cell starts `pending queue callouts (L51-07) > uses red for attack-tone chips`, set the File cell to `` `view-model/pending-chip-tone.test.ts` ``; in the `screens/table/private-zone.test.ts` row, replace `design/components/resource-captions.ts` with `ui/resource-captions.ts`.

```bash
(cd apps/client/src && grep -rl readFileSync . --include='*.test.ts' | sed 's#^\./##') | while read f; do grep -qF "| \`$f\`" docs/backlog_v7_test_classification.md || echo "MISSING $f"; done
```
Expected: no output.

- [ ] **Step 17: Update `docs/agent/frontend.md` (and `DESIGN.md` if it exists)**

In `docs/agent/frontend.md`: Components bullet `` `apps/client/src/design/asset-lookup.ts` `` → `` `apps/client/src/ui/asset-lookup.ts` ``; Seat colors bullet `` (`seat-colors.ts`) `` → `` (`ui/seat-colors.ts`) ``; both `` `table-banner.test.ts` `` → `` `view-model/table-banner.test.ts` ``. Append verbatim to the V7 view-model convention section (L72-03):

"L72-04 moved the React-free `design/` and `screens/table/` modules: `src/ui/` holds `asset-lookup`, `seat-colors`, `effect-text-tokens`, `structured-cost`, `visual-viewport`, `resource-captions` and `primitives/dialog-width`; `src/view-model/` holds `table-helpers`, `opponent-seat-resources`, `pending-chip-tone`, `attack-targets`, `chat-unread`, `table-banner`, `tutorial-coach-copy`, `table-copy`, `kit-inspect-traits`, `kit-special-card-key`, `chrome-labels`, `table-flag-intent`, `active-display` and `sub-choice-constants`. New code imports them from there, never from `design/` or `screens/table/`."

If `test -f DESIGN.md` succeeds, add the seven `ui/` helpers to its `ui/` contents map.
Expected: ``grep -nE 'src/design/asset-lookup|\(`seat-colors\.ts`\)|\(`table-banner\.test\.ts`\)|; `table-banner\.test\.ts`' docs/agent/frontend.md`` prints nothing.

- [ ] **Step 18: Flip the backlog**

In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.
Expected: `grep -n '^| L72-04 ' docs/backlog_v7.md` ends with `| Done |`.

- [ ] **Step 19: Run the full gate**

Run: `pnpm verify`
Expected: exit 0 (typecheck, lint, all three Vitest projects green); `grep -rnE "\.(skip|only)\(" apps/client/src/ui apps/client/src/view-model` prints nothing.

- [ ] **Step 20: Commit**

```bash
git add -A apps/client/src docs/agent/frontend.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
test -f DESIGN.md && git add DESIGN.md
git status --short
git commit -m "refactor: move design and table modules (L72-04)" -m "Pure design/ and screens/table/ modules move to src/ui/ and src/view-model/ with their tests (spec v7 §4.1); only import paths change. pendingChipCalloutTone's it() moves from pending-queue.test.ts to view-model/pending-chip-tone.test.ts per its §12.1 classification row, so the it() count is unchanged. CLIENT_SUB_CHOICE_MS is imported from view-model/sub-choice-constants; the sub-choice barrel no longer re-exports it."
```
Expected: `git status --short` lists only `apps/client/src/**`, the three docs (plus `DESIGN.md` if changed), no untracked files; the commit succeeds with the 48-character subject and no AI attribution line.

**Decisions:**
- pendingChipCalloutTone's it() moves out of screens/table/pending-queue.test.ts into a new view-model/pending-chip-tone.test.ts (the contract lists no test). Git shows one A plus an M, not a rename, and the it() count stays the same. Critic fix: L72-02 Step 15(b) row 55 and its Step 17 pending-chip-tone bullet must be edited to say that L72-04 moves the it().
- CLIENT_SUB_CHOICE_MS: on 6e4575a its only consumer is screens/table.tsx, through the sub-choice barrel. The contract note naming tutorial-coach.tsx, export/admin-xlsx.ts and tutorial-coach-copy.test.ts is wrong. Only table.tsx is rewired (its import is split), and the barrel drops the re-export with no shim.
- kit-inspect-dialog.test.ts stays beside kit-inspect-dialog.tsx, following the contract. Classification row 50 says kit-inspect-traits 'moves with this test'; the contract wins. Only the test's two import specifiers change.
- screens/table/table-helpers.ts is re-pointed twice. Step 6 sets '../../ui/structured-cost', because the file is still in screens/table/ when the Step 6 grep runs. After its Step 7 move it becomes '../ui/structured-cost'. Without this, the old plan's Step 6 'grep prints nothing' check could never pass.
- Steps 6 and 8 now find importers with old-specifier greps instead of hand-kept tables. Checked against 6e4575a before the move: the greps list exactly the old tables' importers, plus the files the explicit edits handle (ui/ internals, sub-choice/index.ts, pending-queue.test.ts) and the missed table-helpers.ts. The L72-02 split source-text tests import no moved module, so they stay untouched.
- Two path strings that are not imports also change, so the docs point at real files: the comment in screens/how-to-play-screenshots.ts, and the File-column paths of the moved tests in backlog_v7_test_classification.md.
- DESIGN.md is updated only if it already exists, because L72-05 creates it after this task.
- The Interfaces section keeps every signature but factors shared return types ('all : string'). The section is about 24k characters, over the ~14k target, because the brief requires exact signatures for 21 moved modules.

---

### Task L72-05: Add V7 tokens, fonts and ground side by side

**Spec:** technical spec v7 §4.4, §4.5, §5.1–§5.3, §5.7, §5.8, §8.3, §12.4, §14.3 · **Parity:** `global-motion-reduced-motion`, `global-text-input-no-ios-zoom`, `global-visual-viewport-fit` · **Depends on:** L72-01, and in practice L72-04 (`ui/seat-colors.ts`).

**Files:**
- Create: `apps/client/src/ui/tokens.css`, `apps/client/src/ui/palette.ts`, `apps/client/src/ui/contrast.ts`, `apps/client/src/ui/fonts.ts`, `apps/client/src/ui/motion/motion-tokens.ts`, `apps/client/src/ui/motion/reduced-motion.ts`, `apps/client/src/ui/motion/use-prefers-reduced-motion.ts`, `DESIGN.md`
- Modify: `apps/client/src/index.css`, `apps/client/src/main.tsx`, `apps/client/package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `.impeccable/config.json`, `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`
- Test: `apps/client/src/ui/palette.test.ts`, `apps/client/src/ui/contrast.test.ts`, `apps/client/src/ui/motion/motion-tokens.test.ts`, `apps/client/src/ui/motion/reduced-motion.test.ts`

**Interfaces:**
- Consumes: `export function clampSeatIndex(index: number): SeatIndex` from `apps/client/src/ui/seat-colors.ts` (L72-04); `import type { Transition } from 'motion/react'` and `useReducedMotion(): boolean | null` from `'motion/react'` (motion 12.43.0); `PRODUCT.md` (L72-01) for Impeccable `document`.
- Produces (paths under `apps/client/src/`):
  - `ui/tokens.css`: `:root` with `--<key>: <hex>` for every `V7_COLORS` key (`--bg-0` … `--text-on-cta` … `--card-face-1`), `--seat-0` … `--seat-7` (= `V7_SEAT_COLORS`), `--card-radius`, `--card-rim-width`, `--card-rim-holo`, `--card-rim-gold`, `--card-shadow`, `--chrome-outline-width`, `--chrome-shadow`, `--chrome-radius`, `--chrome-radius-sm`, `--chrome-press-y`, `--scanline`, `--dur-fast|base|slow`, `--ease-entrance`, `--type-micro|caption|body|input|title|vital|display` (values: Steps 11 and 13); one `@theme inline { --color-v7-<token> …; --radius-v7-chrome; --radius-v7-chrome-sm; --radius-v7-card; --shadow-v7-chrome; --shadow-v7-card; --font-v7-display; --font-v7-card; --font-v7-body; --text-v7-micro … --text-v7-display; --ease-v7-entrance }`; `@layer components { .v7-ground { … } }`.
  - `ui/palette.ts`: `export const V7_COLORS: { readonly 'bg-0': '#0c0920'; readonly 'bg-1': '#17113a'; readonly 'glow-a': '#ff3d7f'; readonly 'glow-b': '#3da9ff'; readonly panel: '#1f1850'; readonly 'panel-2': '#2b2256'; readonly ink: '#0c0920'; readonly text: '#f3eeff'; readonly 'text-2': '#cfc6ff'; readonly 'text-on-card': '#2a2550'; readonly 'text-on-cta': '#0c0920'; readonly life: '#ff3d7f'; readonly point: '#ffc93d'; readonly upgrade: '#3dcf8f'; readonly shield: '#6b8cff'; readonly cta: '#ffd43d'; readonly 'cta-2': '#3da9ff'; readonly danger: '#ff4d4d'; readonly 'threat-attack': '#ff3d7f'; readonly 'threat-other': '#ffa53d'; readonly mine: '#3da9ff'; readonly 'card-face-0': '#ffffff'; readonly 'card-face-1': '#f1edff' } /* as const */`, `export type V7ColorToken = keyof typeof V7_COLORS`, `export const V7_SEAT_COLORS: readonly [string, string, string, string, string, string, string, string]`, `export function v7Color(token: V7ColorToken): string`, `export function v7SeatColor(index: number): string`.
  - `ui/contrast.ts`: `export const WCAG_AA_TEXT = 4.5`, `export const WCAG_AA_LARGE_TEXT = 3`, `export function relativeLuminance(hex: string): number`, `export function contrastRatio(foreground: string, background: string): number`, `export function deltaE2000(hexA: string, hexB: string): number`, `export const SEAT_HUE_MIN_DELTA_E: number`.
  - `ui/fonts.ts`: side-effect imports only.
  - `ui/motion/motion-tokens.ts`: `export const DUR_FAST_MS = 120`, `export const DUR_BASE_MS = 220`, `export const DUR_SLOW_MS = 400`, `export const V7_DURATIONS_MS: { readonly fast: 120; readonly base: 220; readonly slow: 400 }`, `export type V7Duration = keyof typeof V7_DURATIONS_MS`, `export const CARD_SPRING: { readonly type: 'spring'; readonly stiffness: 400; readonly damping: 28 }`, `export const EASE_ENTRANCE: readonly [0.16, 1, 0.3, 1]`, `export function durationS(duration: V7Duration): number`.
  - `ui/motion/reduced-motion.ts`: `export interface V7MotionTarget { readonly opacity?: number; readonly x?: number | string; readonly y?: number | string; readonly scale?: number; readonly rotate?: number; readonly color?: string; readonly backgroundColor?: string; readonly boxShadow?: string }`, `export interface V7MotionSpec { readonly initial?: V7MotionTarget; readonly animate: V7MotionTarget; readonly exit?: V7MotionTarget; readonly transition?: Transition }`, `export function reduceMotionSpec(spec: V7MotionSpec): V7MotionSpec`, `export function motionSpecFor(spec: V7MotionSpec, reduced: boolean): V7MotionSpec`.
  - `ui/motion/use-prefers-reduced-motion.ts`: `export function usePrefersReducedMotion(): boolean`.
  - `DESIGN.md` at the repo root.

- [ ] **Step 1: Check preconditions, mark In progress**

```bash
git status --short
test -f apps/client/src/ui/seat-colors.ts && grep -n "export function clampSeatIndex" apps/client/src/ui/seat-colors.ts
test ! -e apps/client/src/ui/tokens.css && test ! -e DESIGN.md && test -f PRODUCT.md && echo ok
```
Expected: clean tree, one `clampSeatIndex` match, `ok`. If `ui/seat-colors.ts` is missing, stop and finish L72-04 first. In `docs/backlog_v7.md`, set this task's Status to `In progress` (working tree only; it flips to `Done` in Step 25).

- [ ] **Step 2: Add the fonts through pnpm**

Run: `pnpm add --filter @card-battle/client @fontsource/lilita-one @fontsource/fredoka @fontsource/nunito`, then `ls apps/client/node_modules/@fontsource/lilita-one/400.css apps/client/node_modules/@fontsource/fredoka/{500,600,700}.css apps/client/node_modules/@fontsource/nunito/{700,800,900}.css`
Expected: the three 5.x deps in `apps/client/package.json`, `@fontsource/outfit` kept, `git diff --stat` lists only `apps/client/package.json` and `pnpm-lock.yaml`; all 7 paths listed.

- [ ] **Step 3: Write the failing motion tests**

Block-bodied callbacks throughout: `no-confusing-void-expression` (strictTypeChecked) rejects `() => expect(…)`.

`apps/client/src/ui/motion/motion-tokens.test.ts`:
```ts
import type { Transition } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { CARD_SPRING, DUR_BASE_MS, DUR_FAST_MS, DUR_SLOW_MS, durationS, EASE_ENTRANCE, V7_DURATIONS_MS } from './motion-tokens';

describe('V7 motion tokens (technical spec v7 §5.7)', () => {
  it('pins the three durations in milliseconds', () => {
    expect([DUR_FAST_MS, DUR_BASE_MS, DUR_SLOW_MS]).toEqual([120, 220, 400]);
    expect(V7_DURATIONS_MS).toEqual({ fast: 120, base: 220, slow: 400 });
  });
  it('converts durations to motion seconds', () => {
    expect(durationS('fast')).toBeCloseTo(0.12, 10);
    expect(durationS('base')).toBeCloseTo(0.22, 10);
    expect(durationS('slow')).toBeCloseTo(0.4, 10);
  });
  it('pins the card spring and the entrance ease-out', () => {
    expect(CARD_SPRING).toEqual({ type: 'spring', stiffness: 400, damping: 28 });
    expect(EASE_ENTRANCE).toEqual([0.16, 1, 0.3, 1]);
  });
  it('types as motion Transitions', () => {
    const spring: Transition = CARD_SPRING;
    const entrance: Transition = { duration: durationS('base'), ease: EASE_ENTRANCE };
    expect([spring, entrance]).toHaveLength(2);
  });
});
```
`apps/client/src/ui/motion/reduced-motion.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CARD_SPRING, durationS } from './motion-tokens';
import { motionSpecFor, reduceMotionSpec, type V7MotionSpec, type V7MotionTarget } from './reduced-motion';

const FAST_TWEEN = { type: 'tween', duration: durationS('fast') };
const slam: V7MotionSpec = {
  initial: { opacity: 0, x: -24, y: '40%', scale: 1.6, rotate: -8, color: '#ff3d7f' },
  animate: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, color: '#f3eeff', backgroundColor: '#1f1850', boxShadow: '0 4px 0 #0c0920' },
  exit: { opacity: 0, scale: 0.8, y: 12 },
  transition: CARD_SPRING,
};
function expectNoTransform(target: V7MotionTarget | undefined): void {
  expect(target).toBeDefined();
  for (const key of ['x', 'y', 'scale', 'rotate']) expect(target).not.toHaveProperty(key);
}

describe('reduceMotionSpec (technical spec v7 §5.7, §8.3)', () => {
  it('drops every transform and scale key from initial, animate and exit', () => {
    const r = reduceMotionSpec(slam);
    [r.initial, r.animate, r.exit].forEach(expectNoTransform);
  });
  it('keeps fades and color flashes and turns the spring into a fast tween', () => {
    expect(reduceMotionSpec(slam)).toStrictEqual({
      initial: { opacity: 0, color: '#ff3d7f' },
      animate: { opacity: 1, color: '#f3eeff', backgroundColor: '#1f1850', boxShadow: '0 4px 0 #0c0920' },
      exit: { opacity: 0 },
      transition: FAST_TWEEN,
    });
  });
  it('gives a fast tween even when the spec had no transition', () => {
    expect(reduceMotionSpec({ animate: { opacity: 1 } }).transition).toStrictEqual(FAST_TWEEN);
  });
  it('omits absent targets and keys instead of setting them to undefined', () => {
    const r = reduceMotionSpec({ animate: { x: 40 } });
    expect(Object.keys(r).sort()).toEqual(['animate', 'transition']);
    expect(Object.keys(r.animate)).toEqual([]);
  });
  it('does not mutate its input', () => {
    const before = structuredClone(slam);
    reduceMotionSpec(slam);
    expect(slam).toStrictEqual(before);
  });
});
describe('motionSpecFor', () => {
  it('returns the spec untouched when motion is allowed', () => {
    expect(motionSpecFor(slam, false)).toBe(slam);
  });
  it('returns the reduced spec when the user prefers reduced motion', () => {
    expect(motionSpecFor(slam, true)).toStrictEqual(reduceMotionSpec(slam));
  });
});
```

- [ ] **Step 4: Run them and see them fail**

Run: `pnpm vitest run --project client apps/client/src/ui/motion/`
Expected: FAIL, `Test Files  2 failed (2)`, `Cannot find module './motion-tokens'` (and `'./reduced-motion'`).

- [ ] **Step 5: Implement the motion modules**

- `motion-tokens.ts`: the Produces constants `as const` (`V7_DURATIONS_MS` built from the `DUR_*_MS`); `durationS` = `V7_DURATIONS_MS[duration] / 1000`. Doc cites §5.7 and the CSS mirror.
- `reduced-motion.ts`: private `REDUCED_TRANSITION: Transition = { type: 'tween', duration: durationS('fast') }`; private `reduceTarget` copies only `opacity`, `color`, `backgroundColor`, `boxShadow` by conditional spreads (no rest destructuring: `ignoreRestSiblings` is off; never an `undefined` value: `exactOptionalPropertyTypes`); `reduceMotionSpec` keeps `initial` / `exit` only when present and always sets `REDUCED_TRANSITION`; `motionSpecFor` = `reduced ? reduceMotionSpec(spec) : spec`. Doc cites §5.7 / §8.3.
- `use-prefers-reduced-motion.ts`: `useReducedMotion() === true` (`null` counts as full motion). Tested by the L72-06 harness self-test.

- [ ] **Step 6: Run them and see them pass**

Run: `pnpm vitest run --project client apps/client/src/ui/motion/`
Expected: PASS, `Test Files  2 passed (2)`, `Tests  11 passed (11)`.

- [ ] **Step 7: Write the failing contrast test**

`apps/client/src/ui/contrast.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { contrastRatio as ratio, deltaE2000, relativeLuminance, SEAT_HUE_MIN_DELTA_E, WCAG_AA_LARGE_TEXT, WCAG_AA_TEXT } from './contrast';
import { V7_COLORS as C, V7_SEAT_COLORS } from './palette';

const GROUNDS = ['bg-0', 'bg-1', 'panel', 'panel-2'] as const;
const CTA_FILLS = ['cta', 'cta-2', 'danger'] as const;
const COLORED_TEXT = ['life', 'point', 'upgrade', 'shield', 'threat-attack', 'threat-other', 'mine', 'danger'] as const;

describe('WCAG helper (technical spec v7 §5.1)', () => {
  it('pins the AA thresholds', () => {
    expect([WCAG_AA_TEXT, WCAG_AA_LARGE_TEXT]).toStrictEqual([4.5, 3]);
  });
  it('computes WCAG relative luminance', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 10);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10);
    expect(relativeLuminance('#808080')).toBeCloseTo(0.2159, 3);
  });
  it('computes symmetric contrast ratios', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 6);
    expect(ratio('#ffffff', '#000000')).toBeCloseTo(21, 6);
    expect(ratio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    expect(ratio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(ratio('#3da9ff', '#3da9ff')).toBeCloseTo(1, 10);
  });
  it('accepts only #rrggbb', () => {
    expect(() => relativeLuminance('red')).toThrow();
    expect(() => relativeLuminance('#fff')).toThrow();
    expect(() => deltaE2000('#ffffff', 'white')).toThrow();
  });
});
describe('CIEDE2000 (seat-hue metric recorded in DESIGN.md)', () => {
  it('is zero for one color and symmetric', () => {
    expect(deltaE2000('#7cc4ff', '#7cc4ff')).toBeCloseTo(0, 10);
    expect(deltaE2000('#ff0000', '#00ff00')).toBeCloseTo(deltaE2000('#00ff00', '#ff0000'), 10);
  });
  it('matches reference distances', () => {
    expect(deltaE2000('#000000', '#ffffff')).toBeCloseTo(100, 1);
    expect(deltaE2000('#ff0000', '#00ff00')).toBeCloseTo(86.61, 1);
    expect(deltaE2000('#0000ff', '#ffff00')).toBeCloseTo(103.43, 1);
  });
});
describe('V7 token contrast (technical spec v7 §5.1, §5.2)', () => {
  it.each(GROUNDS)('--text and --text-2 reach AA on --%s', (g) => {
    expect(ratio(C.text, C[g])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    expect(ratio(C['text-2'], C[g])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
  it('--text-on-card reaches AA on both card-face stops', () => {
    expect(ratio(C['text-on-card'], C['card-face-0'])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    expect(ratio(C['text-on-card'], C['card-face-1'])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
  it.each(GROUNDS)('every seat hue reaches AA on --%s (seat names are text)', (g) => {
    V7_SEAT_COLORS.forEach((hue, i) => {
      expect(ratio(hue, C[g]), `--seat-${i}`).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });
  });
  it('seat hues are pairwise at least SEAT_HUE_MIN_DELTA_E apart (CIEDE2000)', () => {
    expect(SEAT_HUE_MIN_DELTA_E).toBe(20);
    V7_SEAT_COLORS.forEach((a, i) => {
      V7_SEAT_COLORS.slice(i + 1).forEach((b, o) => {
        expect(deltaE2000(a, b), `--seat-${i} vs --seat-${i + o + 1}`).toBeGreaterThanOrEqual(SEAT_HUE_MIN_DELTA_E);
      });
    });
  });
  it.each(CTA_FILLS)('--text-on-cta labels reach AA on --%s', (fill) => {
    expect(ratio(C['text-on-cta'], C[fill])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
  it.each(COLORED_TEXT)('--%s as text: AA on bg-0, bg-1 and panel; large-text AA on panel-2', (t) => {
    for (const g of ['bg-0', 'bg-1', 'panel'] as const) {
      expect(ratio(C[t], C[g]), `on --${g}`).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
    expect(ratio(C[t], C['panel-2'])).toBeGreaterThanOrEqual(WCAG_AA_LARGE_TEXT);
  });
});
```

- [ ] **Step 8: Run it and see it fail**

Run: `pnpm vitest run --project client apps/client/src/ui/contrast.test.ts`
Expected: FAIL, `Cannot find module './contrast'`.

- [ ] **Step 9: Implement `palette.ts` and `contrast.ts`**

- `palette.ts`: header cites §5.1 and the mobile Safari rule (inline styles take these hex values, never `var()` / `color-mix()`). `V7_COLORS` as in Produces, `as const`; `V7_SEAT_COLORS` = Step 11 `SPEC_SEATS`, `as const satisfies` the 8-tuple, in `view.players` index order (provisional, §14.3); `v7Color` indexes `V7_COLORS`; `v7SeatColor` indexes with `clampSeatIndex(index)`.
- `contrast.ts`: constants cite WCAG 2.x 1.4.3 / §5.1, `SEAT_HUE_MIN_DELTA_E = 20`. The tests only bound the math, so implement exactly:
```ts
// hex: /^#[0-9a-f]{6}$/i.test(hex) or throw new Error(`Expected #rrggbb, got ${hex}`)
// linear(c = v/255) = c <= 0.04045 ? c/12.92 : ((c + 0.055)/1.055) ** 2.4
// relativeLuminance = 0.2126R + 0.7152G + 0.0722B; contrastRatio = (max + 0.05)/(min + 0.05)
// XYZ: X = .4124564R+.3575761G+.1804375B; Y = .2126729R+.7151522G+.0721750B; Z = .0193339R+.1191920G+.9503041B
// Lab: white (0.95047, 1, 1.08883); f(t) = t > 216/24389 ? cbrt(t) : ((24389/27)t + 16)/116
//      L = 116fy - 16, a = 500(fx - fy), b = 200(fy - fz)
// deltaE2000 (Sharma, Wu, Dalal 2005; kL = kC = kH = 1; angles in degrees, convert for Math.sin/cos):
//   Cbar = (C1+C2)/2; G = 0.5(1 - sqrt(Cbar^7/(Cbar^7 + 25^7))); a'i = (1+G)ai; C'i = hypot(a'i, bi)
//   h'i = atan2(bi, a'i) in [0,360), 0 if a'i = bi = 0; Lbar' = (L1+L2)/2; Cbar' = (C'1+C'2)/2
//   dL' = L2-L1; dC' = C'2-C'1; dh' = 0 if C'1C'2 = 0 else h'2-h'1 wrapped to [-180,180]; dH' = 2sqrt(C'1C'2)sin(dh'/2)
//   hbar' = h'1+h'2 if C'1C'2 = 0; (h'1+h'2)/2 if |h'1-h'2| <= 180; else (h'1+h'2 + (sum < 360 ? 360 : -360))/2
//   T = 1 - .17cos(hbar'-30) + .24cos(2hbar') + .32cos(3hbar'+6) - .20cos(4hbar'-63)
//   dTheta = 30exp(-((hbar'-275)/25)^2); RT = -sin(2dTheta) * 2sqrt(Cbar'^7/(Cbar'^7 + 25^7))
//   SL = 1 + .015(Lbar'-50)^2/sqrt(20 + (Lbar'-50)^2); SC = 1 + .045Cbar'; SH = 1 + .015Cbar'T
//   dE = sqrt((dL'/SL)^2 + (dC'/SC)^2 + (dH'/SH)^2 + RT(dC'/SC)(dH'/SH))
```

- [ ] **Step 10: Run it and see it pass**

Run: `pnpm vitest run --project client apps/client/src/ui/contrast.test.ts`
Expected: PASS, `Tests  27 passed (27)`.

- [ ] **Step 11: Write the failing palette ⇄ tokens.css parity test**

`apps/client/src/ui/palette.test.ts` reads the CSS through `?raw` (no `readFileSync`, so no §12.1 row). Write `SPEC_COLORS` out as the 23 literal `V7_COLORS` entries from Produces; never import them.
```ts
import { describe, expect, it } from 'vitest';
import { DUR_BASE_MS, DUR_FAST_MS, DUR_SLOW_MS, EASE_ENTRANCE } from './motion/motion-tokens';
import { V7_COLORS, V7_SEAT_COLORS, v7Color, v7SeatColor } from './palette';
import tokensCss from './tokens.css?raw';

const COMMENT = /\/\*[\s\S]*?\*\//g;
const DECLARATION = /--([\w-]+)\s*:\s*([^;]+);/g;
const TYPE_STEPS = ['micro', 'caption', 'body', 'input', 'title', 'vital', 'display'] as const;
const SPEC_COLORS = { 'bg-0': '#0c0920', /* …all 23 entries… */ 'card-face-1': '#f1edff' };
const SPEC_SEATS = ['#7cc4ff', '#ff6461', '#4fe06a', '#f5e05a', '#a080ff', '#f5b07a', '#33e6e0', '#f655c1'];

/** Declarations of the first `<opener> {` block; :root and @theme inline hold no nested braces. */
function declarations(opener: string): Map<string, string> {
  const css = tokensCss.replace(COMMENT, '');
  const start = css.indexOf(`${opener} {`);
  if (start < 0) throw new Error(`tokens.css has no ${opener} block`);
  const bodyStart = start + opener.length + 2;
  const result = new Map<string, string>();
  for (const [, name, value] of css.slice(bodyStart, css.indexOf('}', bodyStart)).matchAll(DECLARATION)) {
    if (name !== undefined && value !== undefined) result.set(name, value.trim());
  }
  return result;
}
function pick(decls: Map<string, string>, keys: readonly string[]): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, decls.get(key)]));
}
const paletteEntries = (): [string, string][] => [
  ...Object.entries(V7_COLORS),
  ...V7_SEAT_COLORS.map((hex, i): [string, string] => [`seat-${i}`, hex]),
];
const byName = ([a]: [string, string], [b]: [string, string]): number => a.localeCompare(b);

describe('V7 palette mirror (technical spec v7 §5.1)', () => {
  it('pins the §5.1 colors plus the V7 additions', () => {
    expect(V7_COLORS).toStrictEqual(SPEC_COLORS);
  });
  it('pins the eight dark-ground seat hues (§14.3 watch point)', () => {
    expect(V7_SEAT_COLORS).toStrictEqual(SPEC_SEATS);
  });
  it('declares exactly the palette hex values on :root', () => {
    const hexOnRoot = [...declarations(':root')].filter(([, value]) => /^#[0-9a-f]{6}$/.test(value));
    expect(hexOnRoot.sort(byName)).toStrictEqual(paletteEntries().sort(byName));
  });
  it('reads colors and clamps seat indexes like the V2 palette', () => {
    expect([v7Color('panel'), v7Color('text-on-cta')]).toStrictEqual(['#1f1850', '#0c0920']);
    expect([3, -1, 99, 2.7].map(v7SeatColor)).toStrictEqual([3, 0, 7, 2].map((i) => V7_SEAT_COLORS[i]));
  });
});
describe('ui/tokens.css (technical spec v7 §5.2, §5.3, §5.7)', () => {
  it('pins the §5.3 card and chrome shapes', () => {
    const root = declarations(':root');
    expect(root.get('card-rim-holo')).toMatch(/^conic-gradient\(/);
    expect(root.get('card-rim-gold')).toMatch(/gradient\(/);
    const shapes = {
      'card-radius': '12px', 'card-rim-width': '2px', 'card-shadow': '0 10px 22px rgba(0, 0, 0, 0.45)',
      'chrome-outline-width': '3px', 'chrome-shadow': '0 4px 0 var(--ink)', 'chrome-radius': '12px',
      'chrome-radius-sm': '10px', 'chrome-press-y': '3px', scanline: 'rgba(255, 255, 255, 0.03)',
    };
    expect(pick(root, Object.keys(shapes))).toStrictEqual(shapes);
  });
  it('keeps the §5.2 type floors (11 px functional, 16 px inputs, 22 px vital)', () => {
    const root = declarations(':root');
    expect(TYPE_STEPS.map((s) => root.get(`type-${s}`))).toStrictEqual(['11px', '12px', '14px', '16px', '20px', '22px', '32px']);
    expect(Number.parseFloat(root.get('type-micro') ?? '')).toBeGreaterThanOrEqual(11);
    expect(Number.parseFloat(root.get('type-input') ?? '')).toBeGreaterThanOrEqual(16);
    expect(Number.parseFloat(root.get('type-vital') ?? '')).toBeGreaterThanOrEqual(22);
  });
  it('mirrors ui/motion/motion-tokens', () => {
    expect(pick(declarations(':root'), ['dur-fast', 'dur-base', 'dur-slow', 'ease-entrance'])).toStrictEqual({
      'dur-fast': `${DUR_FAST_MS}ms`, 'dur-base': `${DUR_BASE_MS}ms`, 'dur-slow': `${DUR_SLOW_MS}ms`,
      'ease-entrance': `cubic-bezier(${EASE_ENTRANCE.join(', ')})`,
    });
  });
  it('maps every V7 color into @theme inline as --color-v7-<token>', () => {
    const theme = declarations('@theme inline');
    for (const [name] of paletteEntries()) expect(theme.get(`color-v7-${name}`), name).toBe(`var(--${name})`);
  });
  it('maps shapes, fonts, type and ease under v7 names only, never a V2 name', () => {
    const theme = declarations('@theme inline');
    const fixed = {
      'radius-v7-chrome': 'var(--chrome-radius)', 'radius-v7-chrome-sm': 'var(--chrome-radius-sm)',
      'radius-v7-card': 'var(--card-radius)', 'shadow-v7-chrome': 'var(--chrome-shadow)',
      'shadow-v7-card': 'var(--card-shadow)', 'ease-v7-entrance': 'var(--ease-entrance)',
      'font-v7-display': "'Lilita One', ui-rounded, system-ui, sans-serif",
      'font-v7-card': "'Fredoka', ui-rounded, system-ui, sans-serif",
      'font-v7-body': "'Nunito', ui-sans-serif, system-ui, sans-serif",
      ...Object.fromEntries(TYPE_STEPS.map((s) => [`text-v7-${s}`, `var(--type-${s})`])),
    };
    expect(pick(theme, Object.keys(fixed))).toStrictEqual(fixed);
    expect(theme.size).toBe(47); // 31 colors + 3 radii + 2 shadows + 3 fonts + 7 type steps + 1 ease
    for (const key of theme.keys()) expect(key).toMatch(/^(color|radius|shadow|font|text|ease)-v7-/);
    for (const s of TYPE_STEPS) expect(theme.has(`color-v7-${s}`)).toBe(false);
  });
  it('keeps the ground opt-in and viewport-safe (§4.4, L53-02)', () => {
    const css = tokensCss.replace(COMMENT, '');
    expect(css).toContain('.v7-ground {');
    expect(css).not.toMatch(/(^|[\s,}])(html|body|#root)\s*[{,]/);
    expect(css).not.toMatch(/\d+d?vh/);
    for (const hex of [V7_COLORS['glow-a'], V7_COLORS['glow-b']]) {
      const rgb = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)).join(' ');
      expect(css).toContain(`rgb(${rgb} / 0.3)`);
    }
  });
});
```

- [ ] **Step 12: Run it and see it fail**

Run: `pnpm vitest run --project client apps/client/src/ui/palette.test.ts`
Expected: FAIL, `Cannot find module './tokens.css?raw'`.

- [ ] **Step 13: Create `apps/client/src/ui/tokens.css`**

Header comment: V7 "Arcade Holo" tokens (§5.1–§5.3, §5.7), side by side with V2 in `index.css` (§4.4), mirrored in `ui/palette.ts`. Spell the openers `:root {` and `@theme inline {`, with no brace in any comment inside them.
- `:root {`: every Produces declaration with the Step 11 values, in commented groups (§5.1 colors: "`--ink` is outline and shadow only; CTA labels use `--text-on-cta`"; §5.3 cards; §5.3 chrome: "L80 tool mode overrides these under `[data-mode="tool"]`"; scanline; §5.7 motion; §5.2 type). The rims, which Step 11 only pattern-checks:
  ```css
  --card-rim-holo: conic-gradient(from 200deg, #ff8ad8, #ffe17a, #8af5d0, #8ccaff, #c3a8ff, #ff8ad8);
  --card-rim-gold: linear-gradient(135deg, #fff2b0 0%, #ffc93d 45%, #c98a12 100%);
  ```
- `@theme inline {`: all 31 `--color-v7-<name>: var(--<name>);` lines in `:root` order, then the 16 keys of Step 11's `fixed`.
- The ground, exactly:
  ```css
  @layer components {
    /* §5.1 ground: opt-in for V7 surfaces, never on html, body or #root (§4.4). Halos are
       --glow-a / --glow-b at 30% (literal rgb for older mobile Safari). */
    .v7-ground {
      background-color: var(--bg-0);
      background-image:
        repeating-linear-gradient(to bottom, var(--scanline) 0 1px, transparent 1px 3px),
        radial-gradient(60% 45% at 12% 8%, rgb(255 61 127 / 0.3), transparent 70%),
        radial-gradient(55% 40% at 88% 92%, rgb(61 169 255 / 0.3), transparent 70%),
        linear-gradient(to bottom, var(--bg-1), var(--bg-0));
      color: var(--text);
    }
  }
  ```
Check: `grep -c -- '--color-v7-' apps/client/src/ui/tokens.css` prints `31`.

- [ ] **Step 14: Run the parity test and see the Vitest CSS gotcha**

Run: `pnpm vitest run --project client apps/client/src/ui/palette.test.ts`
Expected: FAIL, `Error: tokens.css has no :root block` (Vitest blanks CSS imports, `?raw` included).

- [ ] **Step 15: Let the client project read `ui/tokens.css?raw`**

In `vitest.config.ts`, in the client project's `test` object next to `include`, add only:
```ts
          // Vitest blanks every CSS import, `?raw` included, unless css.include matches it.
          // ui/palette.test.ts reads the token source to prove palette.ts mirrors it (L72-05).
          css: { include: [/\/src\/ui\/tokens\.css\?raw$/] },
```
L72-06 rewrites this project's `include` and must keep `css`.

- [ ] **Step 16: Run the parity test and the client project**

Run: `pnpm vitest run --project client apps/client/src/ui/palette.test.ts` → PASS, `Tests  10 passed (10)`.
Run: `pnpm vitest run --project client` → PASS, every pre-existing client file green plus the 4 new ones.

- [ ] **Step 17: Wire tokens and fonts in, side by side**

- `apps/client/src/index.css`: insert `@import "./ui/tokens.css";` as line 2, after `@import "tailwindcss";`. Nothing else.
- `apps/client/src/ui/fonts.ts`: doc comment citing §4.5 / §5.2 (Lilita One titles, buttons, numerals, seat names; Fredoka card print; Nunito body; Outfit stays in `main.tsx` until L81), then exactly 7 imports: `'@fontsource/lilita-one/400.css'`, `'@fontsource/fredoka/{500,600,700}.css'`, `'@fontsource/nunito/{700,800,900}.css'` (one `import '…';` per weight).
- `apps/client/src/main.tsx`: add `import './ui/fonts';` right after the three `@fontsource/outfit` imports.

- [ ] **Step 18: Verify V2 is untouched and the ground is opt-in**

Run: `git diff -U0 apps/client/src/index.css` → one hunk `@@ -1,0 +2 @@` / `+@import "./ui/tokens.css";`, no `-` line.
Run: `grep -rn "v7-ground" apps/client/src apps/client/index.html` → matches only in `ui/tokens.css` and `ui/palette.test.ts`.

- [ ] **Step 19: Build the client and inspect the CSS**

Run: `pnpm --filter @card-battle/client build` → exit 0, no Tailwind or `@import` warning. Then:
```bash
grep -l -- '--bg-0:#0c0920' apps/client/dist/assets/*.css
grep -c 'v7-ground' apps/client/dist/assets/*.css
grep -o -- '--color-seat-0:#1d6fd8' apps/client/dist/assets/*.css | head -1
ls apps/client/dist/assets | grep -cE 'lilita-one|fredoka|nunito'
```
Expected: one CSS file, a count ≥ 1, the unchanged V2 seat token printed, a font-file count > 0.

- [ ] **Step 20: Add the scoped Impeccable ignore (§12.4, Q3b)**

With `IMPECCABLE="$HOME/.claude/plugins/cache/impeccable/impeccable/<installed version>/skills/impeccable"`:
```bash
for rule in radial-spotlight-glow dark-glow; do
  "$IMPECCABLE/scripts/impeccable" hooks ignore-value "$rule" "*" --file apps/client/src/ui/tokens.css \
    --reason "Designer-approved V7 ground halos (technical spec v7 §5.1, §12.4; Q3b 2026-10-20). Scoped to ui/tokens.css only."
done
```
Expected: `git diff .impeccable/config.json` shows only two new `detector.ignoreValues` objects shaped like the existing ones (`rule`, `"value": "*"`, `"files": ["apps/client/src/ui/tokens.css"]`, `createdAt`, `reason`); hand-fix the shape if the CLI differs.

- [ ] **Step 21: Run the detector**

Run: `"$IMPECCABLE/scripts/impeccable" detect apps/client/src/ui/tokens.css apps/client/src/ui/palette.ts apps/client/src/ui/contrast.ts apps/client/src/ui/fonts.ts apps/client/src/ui/motion` (one path per call if needed) → no findings.
Run: `"$IMPECCABLE/scripts/impeccable" detect --no-config apps/client/src/ui/tokens.css` → only `radial-spotlight-glow` and/or `dark-glow`. Fix any other rule in `tokens.css`; no new ignore without designer approval.

- [ ] **Step 22: Create `DESIGN.md` with Impeccable `document`**

Run Impeccable `document` in scan mode over `apps/client/src/ui/` (Skill `impeccable:impeccable`), answering only from spec v7 §5 and `PRODUCT.md` (North Star "Arcade Holo": B1 night neon arcade, B2 white holo cards; Q3b). Without Impeccable, write it by hand in the same section order and note "document not run" in the PR. Frontmatter: V7 tokens only. Body:
- precedence code > spec v7 §5 > DESIGN.md; a task touching tokens or `ui/` updates it in the same commit (§5.8);
- every `:root` token with value and use; naming `--<namespace>-v7-<token>` (no V2 name, L81 may drop the prefix); inline styles take hex from `ui/palette.ts`; `.v7-ground` opt-in, never on `html` / `body` / `#root` or `vh` / `dvh`;
- fonts (Lilita One 400, Fredoka 500–700, Nunito 700–900) with roles; floors 11 px functional, 16 px inputs, ≥ 20 px own lives, ≥ 22 px incoming;
- seat hues: the 8 values, CIEDE2000 (sRGB D65, kL = kC = kH = 1), `SEAT_HUE_MIN_DELTA_E = 20`, measured min 21.33 (seat-4 / seat-7), each ≥ 4.5:1 on the four grounds (lowest 4.77, seat-7 on `--panel-2`), "provisional: tuned in L72/L74 playtests (§14.3)";
- rules: a seat hue never shares an element with `--life` / `--threat-*` (playtest near-collisions ΔE00: seat-0/`--mine` 8.1, seat-1/`--danger` 4.1, seat-5/`--threat-other` 8.6, seat-7/`--life` 13.4); `--ink` never text; CTA labels use `--text-on-cta` (13.70 / 7.73 / 5.97:1); resource and threat colors are body text only on `--bg-*` / `--panel`, large text only on `--panel-2`;
- motion: durations, `CARD_SPRING`, entrance ease (= V2 `MOTION_EASE`), `usePrefersReducedMotion` + `motionSpecFor` (fades and color flashes only, `data-motion` on the animated root); Components: "none yet (L72-07 onward)".

Check: `grep -cE "CIEDE2000|SEAT_HUE_MIN_DELTA_E|--text-on-cta|v7-ground|Lilita One|Fredoka|Nunito|--threat-" DESIGN.md` ≥ 8.

- [ ] **Step 23: Update `docs/agent/frontend.md`**

Drop the " (created in L72-05)" qualifier after `/DESIGN.md` in the Status paragraph L72-01 inserted. Insert `## Design system (V7 · Lot 72+)` right above `## Design system (V2 · Lots 10+)`: spec v7 §5 normative, `DESIGN.md` derived from `ui/` with the Step 22 precedence and same-commit rule, then one bullet each: **Side by side** (§4.4), **Names** (utilities `bg-v7-panel`, `text-v7-text-2`, `border-v7-ink`, `rounded-v7-chrome`, `shadow-v7-chrome`, `font-v7-display`, `text-v7-input`, `ease-v7-entrance`; no V2 name; no `--text-v7-*` suffix equal to a `--color-v7-*` one), **Ground**, **Fonts** (Outfit until L81), **Palette mirror** (parity test; why `test.css.include`), **Contrast** (Step 22 rules), **Motion** (no x / y / scale / rotate when reduced), **Detector** (only ignore, scoped to `ui/tokens.css`).
Check: `grep -c "created in L72-05" docs/agent/frontend.md` prints `0`; `grep -c "Design system (V7 · Lot 72+)" docs/agent/frontend.md` prints `1`.

- [ ] **Step 24: Append the decision to `docs/agent/decisions.md`**

Append only, dated with the commit date, closed by `---`: `## <YYYY-MM-DD> · [P] · [DISCREPANCY] V7 tokens: --text-on-cta and the seat-hue metric (L72-05)` (token names in backticks), three bullets: (1) §5.1 keeps `--ink` non-text and names no CTA label color; `--danger` gets 4.34:1 with `--text-on-card`, 2.88:1 with `--text`, so V7 adds `--text-on-cta: #0c0920` (13.70 / 7.73 / 5.97:1 on `--cta` / `--cta-2` / `--danger`); (2) seat hues: CIEDE2000 pairwise ≥ 20 and ≥ 4.5:1 on the four grounds, in `DESIGN.md`, tuned in playtests (§14.3); (3) `--life` 4.25:1 and `--danger` 4.38:1 on `--panel-2`: resource and threat colors are large text only there.

- [ ] **Step 25: Flip the backlog**

In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

- [ ] **Step 26: Run the full gate**

Run: `pnpm verify`
Expected: exit 0: `tsc` clean in every project, `eslint .` no problems, every Vitest file passed, none skipped. Fix lint in code, never with `eslint-disable`.

- [ ] **Step 27: Commit**

```bash
git add apps/client/package.json pnpm-lock.yaml apps/client/src/index.css apps/client/src/main.tsx \
  apps/client/src/ui/tokens.css apps/client/src/ui/palette.ts apps/client/src/ui/palette.test.ts \
  apps/client/src/ui/contrast.ts apps/client/src/ui/contrast.test.ts apps/client/src/ui/fonts.ts \
  apps/client/src/ui/motion/motion-tokens.ts apps/client/src/ui/motion/motion-tokens.test.ts \
  apps/client/src/ui/motion/reduced-motion.ts apps/client/src/ui/motion/reduced-motion.test.ts \
  apps/client/src/ui/motion/use-prefers-reduced-motion.ts vitest.config.ts .impeccable/config.json \
  DESIGN.md docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md
# plus .impeccable/design.json if Step 22 wrote it
git commit -F- <<'EOF'
feat(ui): add V7 tokens, fonts and ground (L72-05)

Seat hues are spaced by CIEDE2000 >= 20 (DESIGN.md). --text-on-cta is
a V7 addition: --ink is outline-only and --danger misses 4.5:1 with
--text-on-card. Vitest blanks CSS imports, so the client project
includes ui/tokens.css?raw for the palette parity test.
EOF
git status --short
```
Expected: one commit with that subject, no AI attribution line, empty `git status --short`.

**Decisions:**
- Section is ~34k chars, over the ~14k target. The 4 test files are kept as real, runnable code (~14k on their own, as 'keep exactly' requires); everything else was cut to the minimum.
- The compacted tests (pick() helper, blockBody merged into declarations, array-form checks) keep every assertion. Checked in a scratchpad copy against implementations that follow the plan: tsc clean, ESLint strictTypeChecked clean, Vitest 4 files / 48 tests (11+27+10).
- Every test callback is block-bodied: @typescript-eslint/no-confusing-void-expression (strictTypeChecked) rejects `() => expect(...)`. A probe confirmed the rule fires.
- Seat hues pinned in V2 order (blue, red, green, yellow, violet, orange, teal, pink): #7cc4ff #ff6461 #4fe06a #f5e05a #a080ff #f5b07a #33e6e0 #f655c1. Lowest contrast per hue on --panel-2: 7.64, 4.94, 8.32, 10.70, 4.79, 7.76, 9.23, 4.77.
- Seat-hue metric: CIEDE2000 (sRGB, D65, kL=kC=kH=1) with SEAT_HUE_MIN_DELTA_E = 20. Measured minimum 21.33 (seat-4/seat-7), reproduced with the plan's formula block.
- --text-on-cta #0c0920 is a V7 addition for a gap in spec section 5.1: 13.70:1 on --cta, 7.73 on --cta-2, 5.97 on --danger. --danger gets only 4.34 with --text-on-card, and --ink stays outline-only. Logged as [DISCREPANCY] in docs/agent/decisions.md, a file outside the contract's L72-05 list.
- Resource and threat colors as text: AA on --bg-0, --bg-1 and --panel. On --panel-2 they reach only 3:1 (--life 4.25, --danger 4.38), so they are large text only there. contrast.test asserts this.
- vitest.config.ts is modified although it is not in the contract file list. The client project gets css.include for tokens.css?raw because Vitest 4.1.10 blanks every CSS import, ?raw included. L72-06 must keep this css key when it rewrites include.
- In practice L72-05 depends on L72-04, not only L72-01 (palette.ts imports clampSeatIndex from ./seat-colors). Step 1 stops if the file is missing.
- The .v7-ground halos are literal rgb(255 61 127 / 0.3) and rgb(61 169 255 / 0.3), not color-mix(), for older mobile Safari. palette.test pins them to V7_COLORS glow-a and glow-b.
- Tests go beyond the contract list: a separate motion-tokens.test.ts. palette.test also covers --ease-entrance parity, exactly 47 v7-only theme keys, no type-size suffix equal to a color suffix, and a ground never on html/body/#root with no vh/dvh. contrast.test also checks resource and threat text.
- usePrefersReducedMotion gets no test in L72-05 because there is no DOM harness yet. The L72-06 harness self-test covers it.
- If Impeccable document writes .impeccable/design.json, the commit includes it with DESIGN.md. The contract does not list it.
- Applied critic fixes: Step 23 now drops ' (created in L72-05)' after /DESIGN.md (check: grep -c prints 0). Step 1 now says the row flips to Done in Step 25.

---

### Task L72-06: Add the component-test harness

**Cx / risk:** S / Low · **Depends on:** L72-05 · **Spec:** v7 §4.5, §12.1, §12.2

**Files:**
- Modify: `vitest.config.ts` (client `include` line only), `apps/client/package.json`, `pnpm-lock.yaml` (via `pnpm add`)
- Create: `apps/client/src/test/render.tsx`
- Test: `apps/client/src/test/render.test.tsx` (happy-dom), `apps/client/src/test/node-environment.test.ts` (node guard)
- Modify: `AGENTS.md` (§6, one bullet), `docs/agent/testing.md`, `docs/backlog_v7.md`
- Not touched: `DESIGN.md`, `apps/client/tsconfig.json` (L72-10)

**Interfaces:**
- Consumes: `usePrefersReducedMotion(): boolean` from `apps/client/src/ui/motion/use-prefers-reduced-motion.ts` (L72-05, self-test only); RTL `render`, `cleanup`, `screen`, `RenderOptions`, `RenderResult`; `userEvent.setup`, `UserEvent`; vitest `afterEach`, `vi.advanceTimersByTime`.
- Produces:
  - `vitest.config.ts` client project: `test: { name: 'client', root: './apps/client', environment: 'node', include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'], css: { include: [/\/src\/ui\/tokens\.css\?raw$/] } }`, still `extends: './apps/client/vite.config.ts'` (`css` is L72-05's, kept).
  - `export interface RenderUiOptions extends Omit<RenderOptions, 'queries'> { reducedMotion?: boolean; advanceTimers?: (delay: number) => unknown }`
  - `export interface RenderUiResult extends RenderResult { user: UserEvent }`
  - `export function renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult`
  - `export function setReducedMotion(reduce: boolean): void`
  - Every `.test.tsx` opens with `// @vitest-environment happy-dom` and imports `{ renderUi, setReducedMotion }` relatively from `render.tsx`. L72-09 later wraps `ui` in `<SheetStackProvider store={createSheetStackStore()}>`.

---

- [ ] **Step 1: Check the prerequisite and mark In progress**
  Run: `grep -n "export function usePrefersReducedMotion" apps/client/src/ui/motion/use-prefers-reduced-motion.ts`
  Expected: one match. No match → stop (L72-05 is not done). Set the L72-06 row's Status in `docs/backlog_v7.md` to `In progress`.

- [ ] **Step 2: Record the client baseline**
  ```bash
  pnpm vitest run --project client 2>&1 | grep -E 'Test Files|Tests '
  pnpm vitest list --project client --filesOnly | sort > "${TMPDIR:-/tmp}/l72-06-client-files-before.txt"
  ```
  Expected: all green. Note N and M from `Test Files  N passed (N)` / `Tests  M passed (M)`.

- [ ] **Step 3: Add the test dependencies**
  Run: `pnpm add -D --filter @card-battle/client @testing-library/react @testing-library/dom @testing-library/user-event happy-dom`, then `git diff --stat && pnpm install --frozen-lockfile`
  Expected: four new `devDependencies`. The diff touches only `apps/client/package.json` and `pnpm-lock.yaml`, and the frozen install reports the lockfile up to date. An "Ignored build scripts" warning → stop and ask.

- [ ] **Step 4: Write the node-environment guard test**
  Create `apps/client/src/test/node-environment.test.ts`. Never put the environment-docblock text in it.
  ```ts
  /** The client default environment stays node (technical spec v7 §4.5; L72-06). */
  import { describe, expect, it } from 'vitest';

  describe('client default test environment (technical spec v7 §4.5)', () => {
    it('runs a .test.ts file in node, with no DOM globals', () => {
      expect(typeof window).toBe('undefined');
      expect(typeof document).toBe('undefined');
    });
  });
  ```

- [ ] **Step 5: Run the guard test**
  Run: `pnpm vitest run --project client apps/client/src/test/node-environment.test.ts` → PASS, `Tests  1 passed (1)`.

- [ ] **Step 6: Write the failing harness self-test**
  Create `apps/client/src/test/render.test.tsx`:
  ```tsx
  // @vitest-environment happy-dom
  /** V7 component-test harness self-test (technical spec v7 §12.2; L72-06). */
  import { screen } from '@testing-library/react';
  import type { ReactNode } from 'react';
  import { describe, expect, it, vi } from 'vitest';

  import { usePrefersReducedMotion } from '../ui/motion/use-prefers-reduced-motion';
  import { renderUi, setReducedMotion } from './render';

  function MotionProbe() {
    return <p>{usePrefersReducedMotion() ? 'reduced' : 'full'}</p>;
  }

  function NamedRegion({ children }: { children: ReactNode }) {
    return <section aria-label="Harness wrapper">{children}</section>;
  }

  describe('renderUi (technical spec v7 §12.2)', () => {
    it('returns a user-event instance that drives the rendered tree', async () => {
      const onClick = vi.fn<() => void>();
      const { user } = renderUi(<button type="button" onClick={onClick}>Go</button>);
      await user.click(screen.getByRole('button', { name: 'Go' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('drives user-event under fake timers when advanceTimers is passed', async () => {
      vi.useFakeTimers();
      try {
        const onClick = vi.fn<() => void>();
        const { user } = renderUi(<button type="button" onClick={onClick}>Later</button>, {
          advanceTimers: vi.advanceTimersByTime,
        });
        await user.click(screen.getByRole('button', { name: 'Later' }));
        expect(onClick).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('passes RTL render options through (wrapper)', () => {
      renderUi(<p>wrapped</p>, { wrapper: NamedRegion });
      expect(screen.getByRole('region', { name: 'Harness wrapper' }).textContent).toBe('wrapped');
    });
  });

  describe('reduced-motion stub (technical spec v7 §5.7, §8.3)', () => {
    it('answers the motion query and the reduce query from one persistent list each', () => {
      const plain = window.matchMedia('(prefers-reduced-motion)');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
      const noPreference = window.matchMedia('(prefers-reduced-motion: no-preference)');
      expect(window.matchMedia('(prefers-reduced-motion)')).toBe(plain);
      expect(window.matchMedia('(prefers-reduced-motion: reduce)')).toBe(reduce);
      expect([plain.matches, reduce.matches, noPreference.matches]).toEqual([false, false, true]);
      setReducedMotion(true);
      expect([plain.matches, reduce.matches, noPreference.matches]).toEqual([true, true, false]);
    });

    it('dispatches change once per flip, never on a repeated value', () => {
      const list = window.matchMedia('(prefers-reduced-motion)');
      const onChange = vi.fn<() => void>();
      list.addEventListener('change', onChange);
      setReducedMotion(true);
      setReducedMotion(true);
      setReducedMotion(false);
      list.removeEventListener('change', onChange);
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('reports full motion by default', () => {
      renderUi(<MotionProbe />);
      expect(screen.getByText('full').tagName).toBe('P');
    });

    it('reports reduced motion when the render option asks for it', () => {
      renderUi(<MotionProbe />, { reducedMotion: true });
      expect(screen.getByText('reduced').tagName).toBe('P');
    });

    it('flips usePrefersReducedMotion on the next mount, true then false, in one file', () => {
      const first = renderUi(<MotionProbe />);
      expect(first.getByText('full').tagName).toBe('P');
      first.unmount();
      setReducedMotion(true);
      const second = renderUi(<MotionProbe />);
      expect(second.getByText('reduced').tagName).toBe('P');
      second.unmount();
      setReducedMotion(false);
      renderUi(<MotionProbe />);
      expect(screen.getByText('full').tagName).toBe('P');
    });
  });

  // Run order is declaration order: the second test sees what afterEach left behind.
  describe('reset between tests (Vitest globals are off, so RTL does not auto-clean)', () => {
    it('leaves a mounted tree and reduced motion on', () => {
      setReducedMotion(true);
      renderUi(<p>left behind</p>);
      expect(screen.getByText('left behind').tagName).toBe('P');
    });

    it('starts the next test with an empty body and full motion', () => {
      expect(document.body.childElementCount).toBe(0);
      expect(screen.queryByText('left behind')).toBeNull();
      expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
    });
  });
  ```

- [ ] **Step 7: Run it and see it fail (not collected)**
  Run: `pnpm vitest run --project client apps/client/src/test/render.test.tsx` → FAIL, `No test files found, exiting with code 1`.

- [ ] **Step 8: Widen the client `include` in `vitest.config.ts`**
  In the client project, replace only `include: ['src/**/*.test.ts'],` with:
  ```ts
  // Default stays node: component tests opt in per file with the happy-dom docblock
  // (technical spec v7 §4.5). scripts/ holds the art-extraction script tests (L72-10).
  include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  ```
  Check: `grep -c -e "css: { include" -e "test.{ts,tsx}" vitest.config.ts` prints `2`, so L72-05's `css` line is still there.

- [ ] **Step 9: Run it and see the next failure**
  Run: same as Step 7 → FAIL, `Failed to resolve import "./render" from "src/test/render.test.tsx"`.

- [ ] **Step 10: Implement `render.tsx` (no timer shim yet)**
  Exports exactly as in **Produces**, with no PascalCase local component (react-refresh). The doc comment cites v7 §4.5 and §12.2. For now, import only `afterEach` from vitest (`noUnusedLocals`). At module top level, in this order:
  1. If `typeof window === 'undefined'`, throw `new Error('src/test/render.tsx needs a DOM: open the test file with // @vitest-environment happy-dom')`.
  2. Replace `window.matchMedia`. The key is the query with whitespace removed, lowercased. `(prefers-reduced-motion)` and `(prefers-reduced-motion:reduce)` return `reducedMotion`; `(prefers-reduced-motion:no-preference)` returns its inverse. Any other query goes to the bound happy-dom original. Cache one list per key: `Object.defineProperty(happyDomMatchMedia(query), 'matches', { get: () => answer(reducedMotion) })`.
  3. `afterEach(() => { cleanup(); setReducedMotion(false); })`.

  `setReducedMotion`: do nothing if the value is unchanged; otherwise store it and dispatch `new Event('change')` on every cached list.
  `renderUi`: apply `reducedMotion` when given. Call `userEvent.setup(advanceTimers !== undefined ? { advanceTimers } : {})` **before** `render(ui, rest)`, then return `{ ...result, user }`.

- [ ] **Step 11: Run it and see only the fake-timer test fail**
  Run: same as Step 7 → `Tests  1 failed | 9 passed (10)`. The one failure is `drives user-event under fake timers when advanceTimers is passed`, with `Test timed out in 5000ms`.

- [ ] **Step 12: Confirm the cause in the installed sources**
  Run: `grep -rn -e "jestFakeTimersAreEnabled()" -e "jest.advanceTimersByTime(0)" apps/client/node_modules/@testing-library/react/dist/ | head -4`
  Expected: RTL's `asyncWrapper` advances the clock only inside `if (jestFakeTimersAreEnabled())`.

- [ ] **Step 13: Add the Jest-timer shim to `render.tsx`**
  Import `vi`, then add this after the matchMedia stub and before `afterEach`:
  ```ts
  // RTL's async drain advances fake clocks only when it sees a global `jest` (v7 §12.2).
  Reflect.set(globalThis, 'jest', {
    advanceTimersByTime: (ms: number) => {
      vi.advanceTimersByTime(ms);
    },
  });
  ```

- [ ] **Step 14: Run the self-test to green**
  Run: same as Step 7 → PASS, `Tests  10 passed (10)`.

- [ ] **Step 15: Prove `scripts/**/*.test.ts` is collected (temporary probe)**
  ```bash
  mkdir -p apps/client/scripts
  echo "import { expect, it } from 'vitest'; it('probe', () => { expect(1).toBe(1); });" > apps/client/scripts/collect-probe.test.ts
  pnpm vitest run --project client apps/client/scripts/collect-probe.test.ts 2>&1 | grep -E 'Tests '
  rm apps/client/scripts/collect-probe.test.ts && rmdir apps/client/scripts && git status --short apps/client/scripts
  ```
  Expected: `Tests  1 passed (1)`, then empty `git status` output.

- [ ] **Step 16: Prove every existing `.test.ts` still runs in node, unchanged**
  ```bash
  pnpm vitest list --project client --filesOnly | grep -v -e '\.test\.tsx$' -e '/src/test/node-environment\.test\.ts$' | sort | diff "${TMPDIR:-/tmp}/l72-06-client-files-before.txt" -
  grep -rln --include='*.test.ts' -e '@vitest-environment [a-z]' -e '@jest-environment [a-z]' apps/client
  pnpm vitest run --project client 2>&1 | grep -E 'Test Files|Tests '
  ```
  Expected: the diff and the grep print nothing. The full run shows `Test Files  N+2 passed (N+2)` and `Tests  M+11 passed (M+11)` with 0 failed. That means `ui/palette.test.ts` is green, and it only passes while the `css` include is kept.

- [ ] **Step 17: Update `AGENTS.md` §6 (one bullet only)**
  Replace ``- Tests sit beside the code they cover: `src/**/*.test.ts`.`` with:
  ```
  - Tests sit beside the code they cover: `src/**/*.test.ts` runs in node; client component tests
    are `src/**/*.test.tsx`, open with `// @vitest-environment happy-dom` and render through
    `renderUi` (`apps/client/src/test/render.tsx`). V7 code gets behavior tests, never new
    source-text tests (technical spec v7 §12; `docs/agent/testing.md`).
  ```

- [ ] **Step 18: Update `docs/agent/testing.md`**
  1. Header Sources: the active backlog becomes `technical spec v7 §12 · ../backlog_v7.md`, the archives become `../backlog_v1.md` … `../backlog_v6.md`, and `render.test.tsx` is added as an example.
  2. `## Layout`: `.test.ts` holds logic and source-text tests; `.test.tsx` holds component tests. The client project collects `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.ts`, and its default environment is `node`.
  3. New section `## Client component tests (V7 · L72-06)`:
     - Put the test beside the component.
     - Line 1 is the docblock. Vitest scans the whole file for it, so never write it in a node test.
     - Render only through `renderUi`.
     - Assert with plain DOM (no jest-dom).
     - Set reduced motion **before** mounting, and assert `data-motion`.
     - Fake timers: pass `{ advanceTimers: vi.advanceTimersByTime }` and wrap advances in `act`.
     - happy-dom has no layout.
     - Never use `Date.now()`.
  4. New section `## V7 test policy (technical spec v7 §12.1–§12.2)`:
     - New V7 code gets behavior tests.
     - No new `readFileSync` test.
     - Existing `readFileSync` tests are classified only by the lot that removes their code (`../backlog_v7_test_classification.md`).
     - Moved tests keep their assertions.
  5. `## What not to do` gains three ❌ bullets:
     - A `.test.tsx` without the docblock, or one that uses RTL `render`.
     - `@vitest-environment <name>` in a node test.
     - A new `readFileSync` test for V7 code.
  6. `## Checklist` gains ``- [ ] Component tests: `.test.tsx` with the happy-dom docblock, rendered through `renderUi` ``.

- [ ] **Step 19: Check that no other living doc restates the old layout**
  Run: `grep -n -e 'test\.tsx' -e 'happy-dom' docs/agent/frontend.md DESIGN.md`
  Expected: no hit. If there is one, replace it with a pointer to `testing.md` § Client component tests. `DESIGN.md` stays unedited.

- [ ] **Step 20: Flip the backlog**
  In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

- [ ] **Step 21: Run the full gate**
  Run: `pnpm verify` → `tsc` and `eslint .` are clean, with no `react-refresh/only-export-components` report on `render.tsx`. All projects pass with 0 failed and 0 skipped.

- [ ] **Step 22: Commit (this task only)**
  ```bash
  git add vitest.config.ts apps/client/package.json pnpm-lock.yaml apps/client/src/test/render.tsx apps/client/src/test/render.test.tsx apps/client/src/test/node-environment.test.ts AGENTS.md docs/agent/testing.md docs/backlog_v7.md
  git commit -m "test(client): add component-test harness (L72-06)" -m "Vitest runs without globals, so RTL never registers its cleanup: renderUi does, and resets the reduced-motion stub that motion reads once per mount. A minimal jest.advanceTimersByTime shim lets RTL's async drain advance Vitest fake timers."
  ```
  Expected: nothing else is staged (never add `.claude/`), and the commit has no AI attribution.

**Decisions:**
- Adds apps/client/src/test/node-environment.test.ts, which the contract does not list, to lock 'every existing .test.ts still runs in node'. It must never contain the text '@vitest-environment <name>', because Vitest 4.1 scans the whole file for it.
- render.tsx sets a module-level globalThis.jest = { advanceTimersByTime } shim that forwards to vi.advanceTimersByTime. RTL's asyncWrapper (user-event, waitFor) advances fake clocks only when it detects a jest global, so without the shim user-event hangs under vi.useFakeTimers(). Steps 11 to 14 prove this.
- The matchMedia stub answers (prefers-reduced-motion) and (prefers-reduced-motion: reduce) with the flag, and (prefers-reduced-motion: no-preference) with its inverse. Matching ignores whitespace and case, there is one persistent list per query, and every other query passes through to happy-dom.
- The stub is built on happy-dom's own MediaQueryList using Object.defineProperty(list, 'matches', { get }). A hand-written class implementing MediaQueryList fails strict typecheck on the inherited addEventListener overloads.
- motion 12.43 reads (prefers-reduced-motion) once per mount, so setReducedMotion takes effect at the next mount, not on rerender. The self-test and testing.md both say to flip, then mount again.
- render.tsx throws at import when window is undefined, with a message naming the happy-dom docblock. This is additive and changes no signature.
- Critic fix: Step 8 changes only the client include line and keeps L72-05's css: { include: [/\/src\/ui\/tokens\.css\?raw$/] }. Dropping it blanks tokens.css?raw and fails ui/palette.test.ts. Step 16 checks that the whole client project passes.
- scripts/**/*.test.ts collection is proven with a temporary probe that is removed before commit. Adding scripts to apps/client/tsconfig.json stays with L72-10, per the contract, even though spec §4.5 lists it under config.
- @testing-library/dom goes into the same pnpm add because RTL 16 needs it as a peer. There is no @testing-library/jest-dom, so component tests assert with plain DOM (textContent, getAttribute, toBeNull).
- In testing.md, the header Sources line moves from the closed backlog_v6.md to technical spec v7 §12 / backlog_v7.md, and render.test.tsx is cited as an example. This is a small scope extension.
- AGENTS.md gets exactly one new §6 bullet, because the file is already over its ~200-line target.
- Context7 was not available while planning. The API facts come from the installed vitest 4.1.10 and motion 12.43, and from the upstream RTL, DTL, user-event and happy-dom sources. Step 12 re-checks the RTL drain against the installed package at execution time.

---

### Task L72-07: Add the SVG icon set

Spec: technical spec v7 §5.6, §5.1, §12.2, Q45. Icon set only: no harness, dependency, protocol, server, shared or What's new change.

**Files:**
- Create: `apps/client/src/ui/icons/icon-names.ts`
- Create: `apps/client/src/ui/icons/icon.tsx`
- Test: `apps/client/src/ui/icons/icon-names.test.ts` (node)
- Test: `apps/client/src/ui/icons/icon.test.tsx` (happy-dom)
- Test: `apps/client/src/ui/icons/no-emoji.test.ts` (node)
- Modify: `DESIGN.md` (new `## Icons`)
- Modify: `docs/agent/frontend.md` ("Design system (V7 · Lot 72+)", from L72-05)
- Modify: `docs/backlog_v7.md` (L72-07 row, Progress)
- Not here: `ui/icons/icons.gallery.tsx`, `IconButton` (L72-08). `screens/table/spy-eye-icon.tsx`, `forfeit-flag-icon.tsx` stay until L75.

**Interfaces:**
- Consumes:
  - `V7_COLORS` (`apps/client/src/ui/palette.ts`, L72-05): §5.1 token → hex; `ink` and `'bg-0'` are both `'#0c0920'`.
  - `type ResourceKind` (`'life' | 'point' | 'shield' | 'upgradePoint'`) from `apps/client/src/ui/asset-lookup.ts` (L72-04), type-only import.
  - `renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult` from `apps/client/src/test/render.tsx` (L72-06). A `.test.tsx` starts with `// @vitest-environment happy-dom`.
- Produces:
  - `apps/client/src/ui/icons/icon-names.ts`:
    - `export const ICON_NAMES: readonly ['life','point','upgrade','shield','spied-by-you','spying-on-you','shield-active','block','persistent','invisibility','reanimation-armed','duplication-active','eliminated','bot','disconnected','absorb-window','sentence-ticking','menu','shop','draw','log','help','coach','chat','feedback','flag','sound','vibration','rules','share','copy','minimize','clock','close','chevron-left','chevron-right','random']`
    - `export type IconName = (typeof ICON_NAMES)[number]`
    - `export const RESOURCE_ICON: Record<ResourceKind, IconName>` (life→'life', point→'point', upgradePoint→'upgrade', shield→'shield')
    - `export function isIconName(value: string): value is IconName`
  - `apps/client/src/ui/icons/icon.tsx`:
    - `export interface IconProps { name: IconName; size?: number; label?: string; className?: string }`
    - `export function Icon(props: IconProps): ReactElement`

- [ ] **Step 1: Pre-flight.**
  ```bash
  ls apps/client/src/test/render.tsx apps/client/src/ui/palette.ts apps/client/src/ui/asset-lookup.ts DESIGN.md && grep -nE '^\| L72-0[456] ' docs/backlog_v7.md
  ```
  Pass: four paths listed, three rows end `| Done |`; otherwise stop. Read `DESIGN.md` and the frontend.md V7 design-system section.

- [ ] **Step 2: Mark started.** In `docs/backlog_v7.md`, set L72-07 Status `To do` → `In progress` (working tree only).

- [ ] **Step 3: Write the failing names test** `apps/client/src/ui/icons/icon-names.test.ts`:
  ```ts
  /** V7 icon names — technical spec v7 §5.6 plus five L72 additions, L72-07. */
  import { describe, expect, it } from 'vitest';
  import { ICON_NAMES, isIconName, RESOURCE_ICON } from './icon-names';

  /** §5.6 resources, statuses and UI controls, in spec order. */
  const SPEC_ICON_NAMES = ('life point upgrade shield spied-by-you spying-on-you shield-active block persistent invisibility '
    + 'reanimation-armed duplication-active eliminated bot disconnected absorb-window sentence-ticking menu shop draw log '
    + 'help coach chat feedback flag sound vibration rules share copy minimize').split(' ');
  /** Clock (L72-16), close (L72-09, L72-17), chevrons (L72-08), random (L72-16). */
  const L72_ADDED_NAMES = ['clock', 'close', 'chevron-left', 'chevron-right', 'random'];

  describe('ICON_NAMES (technical spec v7 §5.6)', () => {
    it('lists the §5.6 set, then the L72 additions, in order', () => {
      expect([...ICON_NAMES]).toEqual([...SPEC_ICON_NAMES, ...L72_ADDED_NAMES]);
    });
    it('has no duplicate name', () => { expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length); });
  });
  describe('RESOURCE_ICON', () => {
    it('maps each resource kind to its resource icon', () => {
      expect(RESOURCE_ICON).toEqual({ life: 'life', point: 'point', upgradePoint: 'upgrade', shield: 'shield' });
    });
  });
  describe('isIconName', () => {
    it('accepts every listed name', () => { for (const name of ICON_NAMES) expect(isIconName(name)).toBe(true); });
    it('rejects unknown, empty, padded and differently cased names', () => {
      for (const value of ['', 'Life', 'upgradePoint', 'heart', ' close']) expect(isIconName(value)).toBe(false);
    });
  });
  ```

- [ ] **Step 4: See it fail.** `pnpm vitest run --project client apps/client/src/ui/icons/icon-names.test.ts` → `./icon-names` unresolved, `Test Files  1 failed (1)`.

- [ ] **Step 5: Implement `icon-names.ts`** (exports as Produces). `ICON_NAMES = [...] as const` in Produces order, grouped by comments; `isIconName` returns `(ICON_NAMES as readonly string[]).includes(value)` (as `isHintId` in `ui/hint-ids.ts`). Header cites §5.6 and the L72 additions; the list sits outside `icon.tsx` for react-refresh.

- [ ] **Step 6: See it pass.** Same command → `Test Files  1 passed (1)`, `Tests  5 passed (5)`.

- [ ] **Step 7: Write the failing component test** `apps/client/src/ui/icons/icon.test.tsx`:
  ```tsx
  // @vitest-environment happy-dom
  /** V7 Icon — technical spec v7 §5.6, §5.1, Q45, L72-07. */
  import { screen } from '@testing-library/react';
  import { describe, expect, it } from 'vitest';
  import { renderUi } from '../../test/render';
  import { V7_COLORS } from '../palette';
  import { Icon, type IconProps } from './icon';
  import { ICON_NAMES, RESOURCE_ICON } from './icon-names';

  const SHAPES = 'path, circle, ellipse, rect, line, polyline, polygon';
  const PALETTE_HEX: ReadonlySet<string> = new Set(Object.values(V7_COLORS));
  function svgOf(props: IconProps): SVGSVGElement {
    const svg = renderUi(<Icon {...props} />).container.querySelector('svg');
    if (svg === null) throw new Error('Icon rendered no <svg>');
    return svg;
  }
  /** Glyph geometry without paint, so two icons cannot differ by color alone. */
  const shapeOf = (svg: SVGSVGElement): string => svg.innerHTML.replace(/\s(?:fill|stroke)="[^"]*"/g, '');

  describe('Icon (technical spec v7 §5.6)', () => {
    it.each(ICON_NAMES)('renders %s as a non-empty decorative svg', (name) => {
      const svg = svgOf({ name });
      const attrs = ['aria-hidden', 'focusable', 'role', 'aria-label', 'viewBox', 'data-icon'].map((key) => svg.getAttribute(key));
      expect(attrs).toEqual(['true', 'false', null, null, '0 0 24 24', name]);
      expect(svg.querySelector('title')).toBeNull();
      expect(svg.querySelector('text')).toBeNull();
      expect(svg.querySelectorAll(SHAPES).length).toBeGreaterThan(0);
    });
    it('keeps a decorative icon out of the accessibility tree', () => {
      renderUi(<Icon name="life" />);
      expect(screen.queryByRole('img')).toBeNull();
    });
    it.each(ICON_NAMES)('draws %s in the arcade style: 2-unit ink outline, palette paints, a visible body', (name) => {
      const svg = svgOf({ name });
      expect(svg.getAttribute('stroke')).toBe(V7_COLORS.ink);
      expect(svg.getAttribute('stroke-width')).toBe('2');
      for (const element of svg.querySelectorAll('[fill], [stroke]')) {
        for (const paint of [element.getAttribute('fill'), element.getAttribute('stroke')]) {
          if (paint !== null && paint !== 'none') expect(PALETTE_HEX.has(paint), `${name} paints ${paint}`).toBe(true);
        }
      }
      // --ink equals --bg-0, so a glyph drawn only in ink would vanish on the ground.
      const bodies = [...svg.querySelectorAll('[fill]')].map((element) => element.getAttribute('fill'))
        .filter((fill) => fill !== null && fill !== 'none' && fill !== V7_COLORS.ink);
      expect(bodies.length).toBeGreaterThan(0);
    });
    it('gives every name its own shape, not only its own color', () => {
      expect(new Set(ICON_NAMES.map((name) => shapeOf(svgOf({ name })))).size).toBe(ICON_NAMES.length);
    });
    it('draws help and coach as different glyphs (Q45)', () => {
      expect(shapeOf(svgOf({ name: 'help' }))).not.toBe(shapeOf(svgOf({ name: 'coach' })));
    });
    it.each([
      ['life', V7_COLORS.life], ['point', V7_COLORS.point], ['upgradePoint', V7_COLORS.upgrade], ['shield', V7_COLORS.shield],
    ] as const)('fills the %s resource icon with its own token (§5.1)', (kind, hex) => {
      expect(svgOf({ name: RESOURCE_ICON[kind] }).querySelector(`[fill="${hex}"]`)).not.toBeNull();
    });
    it('renders 20 px by default and honours size', () => {
      const size = (svg: SVGSVGElement) => [svg.getAttribute('width'), svg.getAttribute('height')];
      expect(size(svgOf({ name: 'menu' }))).toEqual(['20', '20']);
      expect(size(svgOf({ name: 'menu', size: 32 }))).toEqual(['32', '32']);
    });
    it('passes className to the svg', () => {
      expect(svgOf({ name: 'menu', className: 'shrink-0' }).getAttribute('class')).toBe('shrink-0');
    });
    it('exposes a labelled icon as an image named by its label, with a matching title', () => {
      renderUi(<Icon name="spying-on-you" label="Icon fixture label" />);
      const image = screen.getByRole('img', { name: 'Icon fixture label' });
      expect(image.tagName.toLowerCase()).toBe('svg');
      expect(image.getAttribute('aria-hidden')).toBeNull();
      expect(image.querySelector('title')?.textContent).toBe('Icon fixture label');
    });
    it('treats an empty label as decorative, never as an unnamed image', () => {
      const svg = svgOf({ name: 'help', label: '' });
      expect([svg.getAttribute('aria-hidden'), svg.getAttribute('role')]).toEqual(['true', null]);
      expect(svg.querySelector('title')).toBeNull();
    });
  });
  ```

- [ ] **Step 8: Write the no-emoji test** `apps/client/src/ui/icons/no-emoji.test.ts` (node; Vite `?raw`, so no §12.1 `readFileSync` row). It holds none of the characters it bans: both U+2715 and the probe emoji come from `String.fromCodePoint`.
  ```ts
  /** No emoji in ui/ — technical spec v7 §5.6, L72-07. U+2715 is not Extended_Pictographic, but V7 draws that cross as an icon. */
  import { describe, expect, it } from 'vitest';

  const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
  const MULTIPLICATION_X = String.fromCodePoint(0x2715);
  const UI_SOURCES = import.meta.glob<string>('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });

  describe('ui/ ships no emoji (technical spec v7 §5.6)', () => {
    it('reads files from ui/icons/ and from the rest of ui/', () => {
      const paths = Object.keys(UI_SOURCES);
      expect(paths.some((path) => path.endsWith('/icon.tsx'))).toBe(true);
      expect(paths.some((path) => path.endsWith('/palette.ts'))).toBe(true);
    });
    it('finds no pictographic character and no U+2715 cross in any ui/ file', () => {
      const offenders = Object.entries(UI_SOURCES).flatMap(([path, text]) =>
        text.split('\n').flatMap((line, index) =>
          PICTOGRAPHIC.test(line) || line.includes(MULTIPLICATION_X) ? [`${path}:${index + 1}`] : []));
      expect(offenders).toEqual([]);
    });
    it('flags an emoji and passes the punctuation ui/ copy uses', () => {
      expect(PICTOGRAPHIC.test(`Ready ${String.fromCodePoint(0x1f600)}`)).toBe(true);
      expect(PICTOGRAPHIC.test('Lives 4 · Points 3 — 2× shield → ?')).toBe(false);
    });
  });
  ```
  Check: `grep -rn '✕' apps/client/src/ui` prints nothing.

- [ ] **Step 9: See both fail.** `pnpm vitest run --project client apps/client/src/ui/icons/icon.test.tsx apps/client/src/ui/icons/no-emoji.test.ts` → `Test Files  2 failed (2)`: `./icon` unresolved; in no-emoji only "reads files from ui/icons/ …" fails. If offenders lists a path, replace that pictograph (e.g. `↔`, `©` in a comment) with words in this commit.

- [ ] **Step 10: Implement `icon.tsx`** (exports only `IconProps`, `Icon`). One root `<svg>` around a module-private `const GLYPHS: Readonly<Record<IconName, ReactElement>>` (camelCase for react-refresh; `Record` rejects a missing or extra name).
  - Root: `viewBox="0 0 24 24"`, `width`/`height={size}` (`size = 20`), `fill="none"`, `stroke={V7_COLORS.ink}`, `strokeWidth={2}`, round caps/joins, `focusable="false"`, `data-icon={name}`, `className` via `{...(className !== undefined ? { className } : {})}`.
  - Labelled (`label !== undefined && label !== ''`): `role="img"`, `aria-label`, first child `<title>`; else `aria-hidden`, no title. Never cast.
  - Glyphs: shapes on the 24 grid inheriting the ink outline; fills on shapes, not `<g>`; no `<text>`; paints only `V7_COLORS` hex (no `currentColor`/`var()`/`color-mix`, the `ui/seat-colors.ts` Safari rule); a light or colored body each, ink only for pupils, pips, hands; thin motifs and crosses as filled outlined geometry, never U+2715.
  - Motif / body fill (`V7_COLORS` key); step 14 turns this into a Group | Name | Motif | Body fill table:
    - Resources: `life` heart / life · `point` ringed coin / point · `upgrade` chunky up arrow / upgrade · `shield` heater shield / shield.
    - Statuses: `spied-by-you` magnifier / mine · `spying-on-you` eye with ink pupil / threat-other · `shield-active` shield + three sparks / shield · text-2: `block` brick wall, `persistent` two chasing arrows, `invisibility` ghost with ink eyes (turns are a Badge value), `bot` robot head with antenna, `disconnected` plug and socket apart · `reanimation-armed` tombstone + up arrow / text-2, arrow cta · `duplication-active` two fanned cards / text front, text-2 back · `eliminated` bold cross, the §6.2 seat cross / danger · `absorb-window` funnel / cta-2 · `sentence-ticking` hourglass / threat-attack.
    - UI: text: `menu` three filled bars, `draw` deck with lifted top card, `chat` speech bubble, `sound` speaker + two waves, `vibration` phone between zigzags, `share` box with rising arrow, `minimize` wide bottom bar · text-2: `log` lined scroll, `rules` open book · cta: `shop` bag, `coach` whistle, `feedback` `!` badge · `help` `?` in a disc / cta-2 · `flag` flag on a pole / danger · `copy` two overlapping squares / text front, text-2 back.
    - L72 additions, text: `clock` face with ink hands (L72-16) · `close` slim cross (L72-09, L72-17) · `chevron-left` chunky chevron, `chevron-right` its mirror (L72-08) · `random` die with ink pips (L72-16).

- [ ] **Step 11: See the folder pass.** `pnpm vitest run --project client apps/client/src/ui/icons` → `Test Files  3 passed (3)`, `Tests  93 passed (93)` (5 + 85 + 3). If "own shape" fails, two glyphs differ only by fill (e.g. `eliminated`/`close`): fix the geometry, never the test.

- [ ] **Step 12 (optional): Eyeball.** An uncommitted `icon-preview.tmp.test.tsx` writes `renderToStaticMarkup` of every name at 48 and 20 px on `V7_COLORS['bg-0']` to `os.tmpdir()`; open it, check legibility and help ≠ coach, then delete it.

- [ ] **Step 13: Typecheck and lint.** `pnpm --filter @card-battle/client typecheck && pnpm exec eslint apps/client/src/ui/icons` → exit 0, no output.

- [ ] **Step 14: Update `DESIGN.md`.** Add `## Icons`: sources and `<Icon name size? label? className? />` (§5.6); the step 10 rules (2-unit outline = 2 px at 24 px, scales with `size`; a body is required because `--ink` = `--bg-0`) and table, L72 additions and their consumers marked; a11y (decorative by default; non-empty `label` → `role="img"`, `aria-label`, `<title>`; icon-only controls via `IconButton`, L59-01; one shape per name; help ≠ coach, Q45); counts live in Badge / IconButton; no seat hue as icon paint, no `--life` / `--threat-*` icon in a seat-hued element (§5.1); the no-emoji / U+2715 rule; gallery with L72-08.

- [ ] **Step 15: Update `docs/agent/frontend.md`.** In the V7 design-system section add **Icons (L72-07):** `<Icon name size? label? />`; names only from `ICON_NAMES`, resources via `RESOURCE_ICON`; decorative unless labelled; icon-only controls use `IconButton`; `V7_COLORS` hex paints; no emoji / U+2715 in `ui/`; `SpyEyeIcon` and `ForfeitFlagIcon` stay until L75; details in `DESIGN.md` › Icons.

- [ ] **Step 16: Close the backlog row.** In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

- [ ] **Step 17: Full gate.** `pnpm verify` → exit 0; Vitest `Test Files  N passed (N)`, `Tests  M passed (M)`, no `failed`, `skipped`, `todo`.

- [ ] **Step 18: Commit.**
  ```bash
  git add apps/client/src/ui/icons/icon-names.ts apps/client/src/ui/icons/icon-names.test.ts apps/client/src/ui/icons/icon.tsx apps/client/src/ui/icons/icon.test.tsx apps/client/src/ui/icons/no-emoji.test.ts DESIGN.md docs/agent/frontend.md docs/backlog_v7.md
  git commit -m "feat(ui): add V7 SVG icon set (L72-07)" -m "Adds clock, close, chevron-left, chevron-right and random beyond
  the spec v7 section 5.6 list, because L72-08, L72-09, L72-16 and
  L72-17 render them. The no-emoji test also bans U+2715, which is
  not Extended_Pictographic, so the eliminated and close icons
  replace the cross character."
  ```
  `git status --short` shows nothing from this task, no `.tmp.` file.

**Decisions:**
- Stroke and every paint use V7_COLORS hex (stroke={V7_COLORS.ink}), not the contract note's var(--ink): inline colors follow the mobile Safari rule from ui/seat-colors.ts. The L72-05 parity test keeps the hex and the token equal.
- '2 px ink stroke' means strokeWidth 2 on the 24-unit viewBox: 1.67 px at the default size 20 and exactly 2 px at 24. No non-scaling-stroke. DESIGN.md records this.
- Additions that rename nothing: the root svg carries data-icon={name} (a lookup hook for L72-08, e.g. Avatar's aria-hidden 'eliminated'), an empty-string label counts as decorative, and a third test file icon-names.test.ts (node) sits beside icon-names.ts.
- no-emoji.test.ts also bans U+2715, which is not Extended_Pictographic, because the conventions say to use Icon 'eliminated' instead. It builds U+2715 and its probe emoji with String.fromCodePoint, a transport-safe form of the critic's escape. A grep check confirms no literal cross in ui/.
- The no-emoji glob is exactly the contract's '../**/*.{ts,tsx}' with ?raw (Vite excludes the importing file). It is not a readFileSync test, so it needs no §12.1 row.
- Two acceptance items are deferred by sequencing. The L59-01 aria-label/title check for icon-only controls is verified only at Icon level, because IconButton lands in L72-08. The /dev/ui gallery (ui/icons/icons.gallery.tsx) is also L72-08's job.
- Gap: the contract has no crossed-eye 'unspy' glyph, but the L74 dock brief asks for one (L58-07). It is not added, so the name list stays exact. Either L74 extends ICON_NAMES and DESIGN.md, or the contract gains 'unspy' now.
- The plan also edits docs/agent/frontend.md and docs/backlog_v7.md, which the brief's Files line omits (per-task cadence). The brief repeats L72-06's harness paragraph; per its Review line, L72-07 does no harness, vitest.config or dependency work.
- Every glyph must have a non-ink filled body, because --ink equals --bg-0. Shape uniqueness per name is tested, so no state relies on color alone. The motif and fill list is a plan choice, not pinned by the spec, and becomes DESIGN.md content.
- Classic SpyEyeIcon and ForfeitFlagIcon (screens/table) stay until L75. There is no What's new item because nothing a player sees changes.

---

### Task L72-08: Build arcade chrome primitives

**Cx / risk:** L / Medium · **Spec:** §4.2, §5.2, §5.3, §5.7, §6.4, §7.3, §7.4, §8.3, §10.6, §11 · **Parity:** `global-dialog-button-primitives`, `global-tooltip-unused`, `global-resource-captions` · **Review line:** also ships `TextField`, `Carousel`, a kit tile and the DEV-only `/dev/ui` route, with a test.

**Files:** (relative to `apps/client/src/` unless the path starts at the repo root)
- Create: `ui/viewport-mode.ts`, `ui/use-visual-viewport-box.ts`, `ui/ui-copy.ts`; in `ui/primitives/`: `chrome-classes.ts`, `roving-focus.ts`, `button.tsx`, `icon-button.tsx`, `pill.tsx`, `badge.tsx`, `avatar-initial.ts`, `avatar.tsx`, `tabs.tsx`, `segmented.tsx`, `slider.tsx`, `toggle.tsx`, `tooltip.tsx`, `scroll-area.tsx`, `text-field.tsx`, `carousel.tsx`, `kit-tile.tsx`, `primitives.gallery.tsx`, `primitives-gallery-demos.tsx`; `ui/icons/icons.gallery.tsx`; `dev/dev-ui-route.ts`, `dev/gallery-registry.ts`, `dev/ui-gallery.tsx`
- Modify: `apps/client/src/App.tsx`, `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`
- Test: `ui/viewport-mode.test.ts`, `ui/use-visual-viewport-box.test.tsx`, `ui/ui-copy.test.ts`; in `ui/primitives/`: `roving-focus.test.ts`, `avatar-initial.test.ts`, and `<name>.test.tsx` for `button`, `icon-button`, `pill`, `badge`, `avatar`, `tabs`, `segmented`, `slider`, `toggle`, `tooltip`, `scroll-area`, `text-field`, `carousel`, `kit-tile`; `dev/dev-ui-route.test.ts`, `dev/gallery-registry.test.ts`, `dev/ui-gallery.test.tsx`

**Interfaces:**
- Consumes: L72-04 `resourceCaptionMode(captionVisible): 'visible' | 'sr-only'`, `VisualViewportBox`, `readVisualViewportBox()`, `ResourceKind`, `getOpponentPlaceholderUrl()`; L72-05 `V7_COLORS`, `v7SeatColor(index)`, `ui/tokens.css` v7 utilities and `.v7-ground`, `usePrefersReducedMotion(): boolean`; L72-06 `renderUi(ui, { reducedMotion? })` → `{ user, … }`; L72-07 `Icon { name; size?; label?; className? }`, `ICON_NAMES`, `IconName`.
- Produces (all exported; bare file names are in `ui/primitives/`; each component is `function X(props: XProps): ReactElement`, and the generic ones keep their type parameters):
  - `ui/viewport-mode.ts`: `type ViewportMode = 'portrait' | 'landscape-compact' | 'desktop'`; `const LANDSCAPE_COMPACT_MAX_HEIGHT_PX = 500`; `function viewportModeFor(box: { readonly width: number; readonly height: number }): ViewportMode`.
  - `ui/use-visual-viewport-box.ts`: `function useVisualViewportBox(): VisualViewportBox`; `function useViewportMode(): ViewportMode`.
  - `ui/ui-copy.ts`: `const EXCLUDED_LABEL = 'Excluded'`.
  - `button.tsx`: `type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet'`; `interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> { variant?: ButtonVariant; children: ReactNode; icon?: IconName; size?: 'md' | 'lg'; disabledReason?: string; reserveReasonSlot?: boolean; fullWidth?: boolean; className?: string }`; `Button`.
  - `icon-button.tsx`: `interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'title' | 'className'> { 'aria-label': string; icon: IconName; count?: number; variant?: ButtonVariant; title?: string | null; className?: string }`; `IconButton`.
  - `pill.tsx`: `type PillTone = 'life' | 'point' | 'upgrade' | 'shield' | 'neutral'`; `interface PillProps { icon: IconName; label: string; value: number | 'unknown'; resourceKind?: ResourceKind; size?: 'sm' | 'md' | 'lg'; captionVisible?: boolean; tone?: PillTone; className?: string }`; `Pill`.
  - `badge.tsx`: `type BadgeTone = 'neutral' | 'threat-attack' | 'threat-other' | 'mine' | 'life' | 'point' | 'upgrade' | 'shield'`; `interface BadgeProps { icon?: IconName; label: string; value?: string | number; tone?: BadgeTone; labelHidden?: boolean }`; `Badge`; `interface BadgeGroupItem extends BadgeProps { id: string }`; `interface BadgeGroupProps { items: readonly BadgeGroupItem[]; max?: number; onOverflowClick?: () => void }`; `BadgeGroup`.
  - `avatar-initial.ts`: `function avatarInitial(name: string): string`. `avatar.tsx`: `interface AvatarProps { name: string; seatIndex: number | null; imageUrl?: string; alt?: string; eliminated?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }`; `Avatar`.
  - `tabs.tsx`: `interface TabItem<T extends string> { readonly id: T; readonly label: string; readonly disabled?: boolean }`; `interface TabsProps<T extends string> { label: string; tabs: readonly TabItem<T>[]; selectedId: T; onSelect: (id: T) => void; children: ReactNode; idPrefix?: string }`; `Tabs<T extends string>`.
  - `segmented.tsx`: `interface SegmentedOption<T extends string | number> { readonly value: T; readonly label: string; readonly disabled?: boolean }`; `interface SegmentedProps<T extends string | number> { label: string; options: readonly SegmentedOption<T>[]; value: T; onChange: (value: T) => void; disabled?: boolean }`; `Segmented<T extends string | number>`.
  - `slider.tsx`: `interface SliderProps { label: string; min: number; max: number; step?: number; value: number; onChange?: (value: number) => void; onCommit: (value: number) => void; disabled?: boolean; formatValue?: (value: number) => string }`; `Slider`.
  - `toggle.tsx`: `interface ToggleProps { label: string; pressed: boolean; onPressedChange: (pressed: boolean) => void; icon?: IconName; labelHidden?: boolean; disabled?: boolean }`; `Toggle`.
  - `tooltip.tsx`: `interface TooltipProps { content: string; children: ReactElement; placement?: 'top' | 'bottom' }`; `Tooltip`.
  - `scroll-area.tsx`: `interface ScrollAreaProps { children: ReactNode; axis?: 'y' | 'x' | 'both'; label?: string; className?: string; ref?: Ref<HTMLDivElement> }`; `ScrollArea`.
  - `text-field.tsx`: `interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'children'> { label: string; labelHidden?: boolean; hint?: string; error?: string | null; className?: string; ref?: Ref<HTMLInputElement> }`; `TextField`.
  - `carousel.tsx`: ``interface CarouselSlide { readonly id: string; readonly label: string; readonly content: ReactNode; readonly dataAttributes?: Readonly<Record<`data-${string}`, string>> }``; `interface CarouselProps { label: string; slides: readonly CarouselSlide[]; index?: number; onIndexChange?: (index: number) => void; gridAtDesktop?: boolean; previousLabel: string; nextLabel: string }`; `Carousel`.
  - `kit-tile.tsx`: `interface KitTileStat { readonly icon: IconName; readonly label: string; readonly value: string }`; `interface KitTileProps { name: string; portrait: ReactNode; stats: readonly KitTileStat[]; selected?: boolean; excluded?: boolean; onSelect?: () => void; onInfo?: () => void; infoLabel?: string }`; `KitTile`.
  - `dev/dev-ui-route.ts`: `const DEV_UI_PATH = '/dev/ui'`; `function isDevUiRoute(pathname: string, isDev: boolean): boolean`.
  - `dev/gallery-registry.ts`: `interface GalleryEntry { readonly id: string; readonly title: string; readonly render: () => ReactNode }`; `interface GallerySection { readonly id: string; readonly title: string; readonly entries: readonly GalleryEntry[] }`; `interface GalleryModule { readonly gallery: GallerySection }`; `function collectGallerySections(modules: Readonly<Record<string, GalleryModule>>): readonly GallerySection[]`.
  - `dev/ui-gallery.tsx`: `function UiGallery(): ReactElement`. `primitives.gallery.tsx`, `icons.gallery.tsx`: `const gallery: GallerySection` (ids `primitives`, `icons`).
  - Helpers (not in the contract): `chrome-classes.ts` (Step 18); `roving-focus.ts`: `type RovingKey = 'next' | 'previous' | 'first' | 'last'`; `function nextEnabledIndex(disabled: readonly boolean[], from: number, step: 1 | -1): number`; `function edgeEnabledIndex(disabled: readonly boolean[], edge: 'first' | 'last'): number`; `function rovingKeyFor(key: string, pattern: 'tabs' | 'radios'): RovingKey | null`.

**Conventions:** a `.tsx` exports components and types only; class maps are literal strings; optional props use conditional spread; no emoji and no `✕` under `ui/`. Each `.test.tsx` starts with `// @vitest-environment happy-dom` and uses `renderUi`.
**Test notation:** one bullet per `it('<name>')`: the setup, then `→` and the expected values. `B 'X'` = the button named X; `calls [[…]]` = `mock.calls` toEqual; `has a b` = each class is present.
**Run steps:** `pnpm vitest run --project client apps/client/src/<the test file(s) written for that block>`. A fail step expects `Failed to resolve import "./<module under test>"` for each file. A pass step expects the count shown.

---

- [ ] **Step 1: Start the task and confirm the prerequisites landed** — set L72-08 to `In progress` in `docs/backlog_v7.md`. Run `ls apps/client/src/ui/{palette.ts,visual-viewport.ts,resource-captions.ts,asset-lookup.ts,motion/use-prefers-reduced-motion.ts,icons/icon.tsx,icons/icon-names.ts} apps/client/src/test/render.tsx && grep -c -e '--chrome-press-y' -e '--type-input' -e 'v7-ground' apps/client/src/ui/tokens.css` → 8 paths and a count ≥ 3. Otherwise stop: a task from L72-04 to L72-07 is missing.

- [ ] **Step 2: Write the failing `viewportModeFor` test** — `ui/viewport-mode.test.ts` (`viewportModeFor (technical spec v7 §6.4)`):
  - `it.each` `'%i×%i is %s'`: `[844,390,'landscape-compact'] [1024,499,'landscape-compact'] [400,499,'landscape-compact'] [1024,600,'desktop'] [1440,900,'desktop'] [900,500,'desktop'] [768,1024,'portrait'] [390,844,'portrait'] [375,812,'portrait'] [600,600,'portrait']`.
  - `'switches to landscape-compact strictly under 500 px of visible height'` → `LANDSCAPE_COMPACT_MAX_HEIGHT_PX` 500.
- [ ] **Step 3: Run it and watch it fail**
- [ ] **Step 4: Implement `viewportModeFor`** — `ui/viewport-mode.ts` (cites §6.4). Height < 500 → landscape-compact; otherwise width > height → desktop; otherwise portrait.
- [ ] **Step 5: Run it and watch it pass** → `Tests  11 passed (11)`.

- [ ] **Step 6: Write the failing hook test** — `ui/use-visual-viewport-box.test.tsx`. `window.visualViewport` is stubbed with `fake = Object.assign(new EventTarget(), { width: 390, height: 844, offsetTop: 0, offsetLeft: 0 })`, and the descriptors are restored after each test. The probes print `` `${width}x${height}+${offsetTop}` `` and `useViewportMode()`. `resize(w, h)` mutates `fake` and dispatches `resize` inside `act`.
  - `useVisualViewportBox (L53-07)`: `'reads the visible box on mount'` → `390x844+0`. `'follows visualViewport resize and scroll'` → `resize(844, 390)` → `844x390+0`; `offsetTop = 120` + `scroll` → `844x390+120`. `'removes its visualViewport listeners on unmount'` → `fake.removeEventListener` saw `resize` and `scroll`.
  - `useViewportMode (technical spec v7 §6.4)`: `'maps the visible box to a layout mode'` → `portrait`, `resize(844, 390)` `landscape-compact`, `resize(1440, 900)` `desktop`. `'falls back to the window size when visualViewport is null'` → null + `innerWidth` 1440 / `innerHeight` 900 → `desktop`; 390 × 844 + window `resize` → `portrait`.
- [ ] **Step 7: Run it and watch it fail**
- [ ] **Step 8: Implement the hooks** — `ui/use-visual-viewport-box.ts`. Both hooks use `useSyncExternalStore`, subscribed to `resize` and `scroll` on `visualViewport` (when it is not null) and to `resize` on `window`. The box snapshot returns the cached object while its four fields are unchanged. The mode snapshot is `viewportModeFor(readVisualViewportBox())`.
- [ ] **Step 9: Run it and watch it pass** → `Tests  5 passed (5)`.

- [ ] **Step 10: Write the failing copy test** — `ui/ui-copy.test.ts` (`ui copy (technical spec v7 §10.6)`): `'labels an excluded kit with a word, never with color alone (Q15)'` → `EXCLUDED_LABEL` `'Excluded'`.
- [ ] **Step 11: Run it and watch it fail**
- [ ] **Step 12: Create `ui/ui-copy.ts`** — `export const EXCLUDED_LABEL = 'Excluded';`. The header says the file holds only the §10.6 strings that `ui/` adds (L72-09 appends `MINIMIZE_LABEL` and L72-16 appends `TABLE_RULES_LABEL`).
- [ ] **Step 13: Run it and watch it pass** → `Tests  1 passed (1)`.

- [ ] **Step 14: Write the failing roving-focus test** — `ui/primitives/roving-focus.test.ts`:
  - `nextEnabledIndex`: `'steps forward and back with wrap-around'` → on `[false,false,false]`: `(0, 1)` 1, `(2, 1)` 0, `(0, -1)` 2. `'skips disabled items'` → `([false,true,false], 0, 1)` 2, `([false,false,true], 1, 1)` 0. `'stays put when no other item is enabled'` → `([false,true,true], 0, 1)` 0.
  - `edgeEnabledIndex`: `'finds the first and last enabled items'` → `([true,false,false], 'first')` 1, `([false,false,true], 'last')` 1. `'returns -1 when every item is disabled'` → `([true,true], 'first')` -1.
  - `rovingKeyFor`: `'maps the horizontal tablist keys'` → tabs: ArrowRight next, ArrowLeft previous, Home first, End last, ArrowDown `null`. `'maps radio keys on both axes'` → radios: ArrowDown/ArrowRight next, ArrowUp/ArrowLeft previous, Home `null`, Enter `null`.
- [ ] **Step 15: Run it and watch it fail**
- [ ] **Step 16: Implement `roving-focus.ts`** — use the helper signatures above. `nextEnabledIndex` walks `(from + step * i + n) % n` for `i = 1..n` and returns `from` when no other item is enabled.
- [ ] **Step 17: Run it and watch it pass** → `Tests  7 passed (7)`.
- [ ] **Step 18: Create `chrome-classes.ts`** (§5.3, §5.7; uses the Tailwind 4.3.3 `(--var)` syntax) with these exact values:
  ```ts
  import type { ButtonVariant } from './button';
  export const CHROME_SHAPE_CLASS = 'border-(length:--chrome-outline-width) border-v7-ink rounded-v7-chrome shadow-v7-chrome';
  export const CHROME_SHAPE_SM_CLASS = 'border-(length:--chrome-outline-width) border-v7-ink rounded-v7-chrome-sm shadow-v7-chrome';
  export const CHROME_FOCUS_CLASS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v7-text';
  export const CHROME_DISABLED_CLASS = 'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';
  export const BUTTON_VARIANT_CLASS: Readonly<Record<ButtonVariant, string>> = { primary: 'bg-v7-cta text-v7-text-on-cta', secondary: 'bg-v7-cta-2 text-v7-text-on-cta', danger: 'bg-v7-danger text-v7-text-on-cta', quiet: 'bg-v7-panel-2 text-v7-text' };
  export function chromePressClass(reduced: boolean): string { return reduced ? 'enabled:active:brightness-90' : 'transition-[translate,box-shadow] duration-(--dur-fast) enabled:active:translate-y-(--chrome-press-y) enabled:active:shadow-none'; }
  export function motionAttribute(reduced: boolean): 'reduced' | 'full' { return reduced ? 'reduced' : 'full'; }
  ```

- [ ] **Step 19: Write the failing Button test** — `button.test.tsx` (`Button (technical spec v7 §5.3, §11)`):
  - `'defaults to a primary type="button" in arcade chrome with a 44 px floor'` → `type="button"`, `data-variant="primary"`, has `bg-v7-cta text-v7-text-on-cta rounded-v7-chrome shadow-v7-chrome border-(length:--chrome-outline-width) border-v7-ink min-h-11 font-v7-display`.
  - `it.each` `'%s fills with %s and labels with %s'`: primary `bg-v7-cta`/`text-v7-text-on-cta`, secondary `bg-v7-cta-2`/`text-v7-text-on-cta`, danger `bg-v7-danger`/`text-v7-text-on-cta`, quiet `bg-v7-panel-2`/`text-v7-text`.
  - `'a disabled button blocks its handler'` → `onClick` not called.
  - `'shows the disabled reason as visible text linked by aria-describedby (§11)'` (`disabled`, `"Not enough points"`) → the text has an id, and that id is in `aria-describedby`.
  - `'shows no reason while enabled; reserveReasonSlot keeps an empty slot'` → no text, no `[data-reason-slot]`; with `reserveReasonSlot`: slot text `''`, `aria-hidden="true"`, no `aria-describedby`.
  - `'keeps a caller aria-describedby next to the reason id'` → ids contain `shop-help` and the `"Not your turn"` id.
  - `'presses 3 px down and drops the shadow when motion is full (§5.3)'` → `data-motion="full"`, has `enabled:active:translate-y-(--chrome-press-y) enabled:active:shadow-none`.
  - `'drops the press animation under reduced motion (§5.7)'` → `data-motion="reduced"`, no `/translate/`.
  - `'renders a decorative icon before the label'` (`icon="shop"`) → `svg` aria-hidden.
  - `'size lg and fullWidth keep the floor and stretch'` → has `min-h-14 w-full`.
- [ ] **Step 20: Run it and watch it fail**
- [ ] **Step 21: Implement `Button`** — defaults are primary, md and `type="button"`. Use the Step 18 classes plus the size map `{ md: 'min-h-11 text-v7-body', lg: 'min-h-14 text-v7-title' }`. The reason is a `<span data-reason-slot>` with a `useId` id, placed beside the button in an `inline-flex flex-col` wrapper. `data-motion` goes on the `<button>`.
- [ ] **Step 22: Run it and watch it pass** → `Tests  13 passed (13)`.

- [ ] **Step 23: Write the failing IconButton test** — `icon-button.test.tsx` (`IconButton (L59-01, technical spec v7 §5.6)`):
  - `'is a 44 px button named by aria-label and titled with the same text by default'` (`Open the action log`) → same `title`, `type="button"`, has `size-11`, `svg` aria-hidden.
  - `'title={null} removes the native tooltip and a string replaces it'` → no `title`; then `'Open the menu'`.
  - `'shows an aria-hidden count badge only when count > 0'` → `3` aria-hidden; `count={0}` shows no `0`.
  - `'a disabled icon button blocks its handler'` → not called.
  - `'defaults to the quiet variant and drops the press animation under reduced motion'` → `data-variant="quiet"`, `data-motion="reduced"`, no `/translate/`.
- [ ] **Step 24: Run it and watch it fail**
- [ ] **Step 25: Implement `IconButton`** — the default variant is `quiet`. Set `title={title === null ? undefined : (title ?? ariaLabel)}`, use the chrome classes at `size-11`, and render the aria-hidden count badge only when `count > 0`.
- [ ] **Step 26: Run it and watch it pass** → `Tests  5 passed (5)`.

- [ ] **Step 27: Write the failing Pill test** — `pill.test.tsx` (`Pill (L43-01, L51-08)`):
  - `'shows icon and value and reads "{label} {value}"'` (`Lives` 12, `life`) → `12` aria-hidden; `Lives 12` `sr-only`; `[data-resource-kind="life"]` `title="Lives"`, `data-tone="life"`, `svg` aria-hidden.
  - `'a hidden value renders "?" and reads "{label} unknown"'` (`Points`, `point`) → `?`; `Points unknown` is the `sr-only` text and the root `title`.
  - `'captionVisible shows the caption word; otherwise it is screen-reader only'` → `Shield` aria-hidden; without the prop there is no `Shield` text and `Shield 2` is present.
  - `'size lg puts the value on the vital step (own lives >= 20 px, §5.2)'` → `20` has `text-v7-vital`; `[data-size="lg"]`.
  - `'tone follows resourceKind, can be overridden, and is neutral without a kind'` → `upgradePoint` → `upgrade`; `life` + `tone="neutral"` → `neutral`; no kind (`clock`, `Turn time`, 60) → `neutral`, no `data-resource-kind`.
- [ ] **Step 28: Run it and watch it fail**
- [ ] **Step 29: Implement `Pill`** — map kind to tone with `{ life: 'life', point: 'point', upgradePoint: 'upgrade', shield: 'shield' }`. The tone is a `ring-2 ring-inset ring-v7-<tone>` ring and the value stays `text-v7-text`. Sizes sm, md and lg use `text-v7-caption`, `text-v7-body` and `text-v7-vital`. Show the caption according to `resourceCaptionMode`. The root `title` keeps the native-title text.
- [ ] **Step 30: Run it and watch it pass** → `Tests  5 passed (5)`.

- [ ] **Step 31: Write the failing Badge test** — `badge.test.tsx`; `ITEMS` = `block` Block, `persistent` Poison (value 2), `spied-by-you` Spied, `bot` Bot.
  - Badge: `'shows a decorative icon, the label and the value with its tone'` → `Poison`, `2`, `[data-tone="threat-attack"]`, `svg` aria-hidden. `'labelHidden keeps the label for screen readers only'` → `Spied` `sr-only`. `'defaults to the neutral tone'` → `[data-tone="neutral"]`.
  - BadgeGroup: `'shows two badges, then "+n" for the rest'` → 3 listitems, Block, Poison, no Spied, `+2`, no button. `'max raises the visible count'` (3) → Spied, `+1`. `'adds no marker when every badge fits'` → no `/^\+\d+$/`. `'onOverflowClick turns "+n" into a button'` → B `'+2'` click → called once.
- [ ] **Step 32: Run it and watch it fail**
- [ ] **Step 33: Implement `Badge` and `BadgeGroup`** — Badge sets `data-tone` (default neutral) and uses a literal ring map. BadgeGroup is a `<ul>` that shows `max` badges (default 2) and then `+{n}`, which is a 44 px `<button>` only when `onOverflowClick` is set.
- [ ] **Step 34: Run it and watch it pass** → `Tests  7 passed (7)`.

- [ ] **Step 35: Write the failing Avatar tests**
  - `avatar-initial.test.ts` (escape sequences only): `'uppercases the first grapheme of the trimmed name'` → `'ada'` A, `'  bob'` B. `'keeps a combining mark with its letter'` → `'élodie'` É. `'keeps a multi-code-point grapheme whole'` → `'\u{1F44D}\u{1F3FD}x'` → `'\u{1F44D}\u{1F3FD}'`. `'returns "?" for an empty or blank name'` → `''`, `'   '` → `'?'`.
  - `avatar.test.tsx`: `'renders the image with the name as default alt'` (`Ada`, seat 2, `imageUrl="data:,"`) → img `Ada` is `IMG`. `'prefers a caller alt over the name'` → img `Warrior portrait`. `'falls back to a seat-colored disc showing the initial'` (`ada`, seat 3) → img `ada` is not `IMG`, text `A`, `[data-seat-index="3"]`. `'an unknown seat has no seat index'` (`Zed`, `null`) → `Z`, no `[data-seat-index]`. `'eliminated: grayscale plus the eliminated icon'` → no `svg` at first; once eliminated: `grayscale`, `svg` aria-hidden, `[data-eliminated="true"]`.
- [ ] **Step 36: Run them and watch them fail**
- [ ] **Step 37: Implement `avatarInitial` and `Avatar`** — `avatarInitial` returns the first `Intl.Segmenter(undefined, { granularity: 'grapheme' })` segment of the trimmed name, uppercased, or `'?'` when the name is empty. The disc's `backgroundColor` is `seatIndex === null ? V7_COLORS['text-2'] : v7SeatColor(seatIndex)`, with the initial in `text-v7-text-on-cta`. An eliminated avatar adds `grayscale` and `<Icon name="eliminated">`.
- [ ] **Step 38: Run them and watch them pass** → `Test Files  2 passed (2)`, `Tests  9 passed (9)`.

- [ ] **Step 39: Write the failing Tabs test** — `tabs.test.tsx`: a stateful harness (`Release notes`; Latest, History, Archive disabled; panel `` `Panel ${selected}` ``).
  - `'exposes a labelled tablist, aria-selected tabs and one labelled tabpanel'` → tablist `Release notes`; Latest `aria-selected="true"`, History `"false"`; panel `aria-labelledby` = Latest id, Latest `aria-controls` = panel id; `Panel latest`.
  - `'uses a roving tabindex on the selected tab'` → Latest `tabIndex` 0, History -1.
  - `'ArrowRight and ArrowLeft move focus and select, skipping disabled tabs and wrapping'` → tab, Right (History focused + selected), Right (Latest), Left (History); calls `[['history'], ['latest'], ['history']]`.
  - `'Home and End jump to the first and last enabled tab'` → End History, Home Latest; `[['history'], ['latest']]`.
  - `'click selects; a disabled tab cannot be selected'` → Archive then History → `[['history']]`, `Panel history`.
- [ ] **Step 40: Run it and watch it fail**
- [ ] **Step 41: Implement `Tabs`** — ids come from `idPrefix`, or from a `useId()` value (call the hook unconditionally). Keydown uses `rovingKeyFor(key, 'tabs')` with `edgeEnabledIndex` or `nextEnabledIndex`, then focuses and selects the target (automatic activation).
- [ ] **Step 42: Run it and watch it pass** → `Tests  5 passed (5)`.

- [ ] **Step 43: Write the failing Segmented test** — `segmented.test.tsx`: a stateful harness (`Difficulty`; Easy, Normal, Hard; initial `normal`).
  - `'is a labelled radiogroup with aria-checked radios and a roving tabindex'` → radiogroup `Difficulty`; Normal checked, Easy not; Normal `tabIndex` 0, Hard -1.
  - `'click selects an option'` → Hard → `[['hard']]`, Hard checked.
  - `'arrow keys on both axes move focus and select, wrapping'` → tab (Normal), Right (Hard), Down (Easy), Up, Left (Normal); `[['hard'], ['easy'], ['hard'], ['normal']]`.
  - `'skips a disabled option'` (Hard disabled) → Right → `[['easy']]`.
  - `'a disabled group blocks every option'` → `aria-disabled="true"`, click Easy not called.
  - `'passes numeric values through unchanged'` (`Seats`, 2/3) → click `3 seats` → `[[3]]`.
- [ ] **Step 44: Run it and watch it fail**
- [ ] **Step 45: Implement `Segmented`** — a `radiogroup` of `role="radio"` buttons. The tabbable radio is the checked one, or the first enabled one. Keydown uses `rovingKeyFor(key, 'radios')` with `nextEnabledIndex`.
- [ ] **Step 46: Run it and watch it pass** → `Tests  6 passed (6)`.

- [ ] **Step 47: Write the failing Slider test** — `slider.test.tsx` (`Slider (technical spec v7 §7.4 — sends on release)`): `setup()` renders `Turn time` with min 5, max 180, step 5 and value 60. Events are sent with `fireEvent`.
  - `'is a labelled native range with min, max, step and value'` → `range`, `['5', '180', '5', '60']`.
  - `'reports live values and commits once on pointer release, never while dragging'` → down, input 90, 120 → onChange `[[90], [120]]`, no commit; up → `[[120]]`.
  - `'does not commit twice when the browser fires change after the release'` → down, 90, up, change → `[[90]]`.
  - `'commits once on key release, never per key step'` → (keyDown ArrowRight, input, change) for 65 and for 70 → onChange `[[65], [70]]`, no commit; keyUp → `[[70]]`.
  - `'commits when focus leaves during a key press'` → keyDown ArrowUp, 65, blur → `[[65]]`.
  - `'commits nothing when the release keeps the value'` → pointer down/up, Home down/up → no commit.
  - `'commits a change that arrives outside any drag or key press'` → change 75 → `[[75]]`.
  - `'follows a new value prop while idle'` → rerender 120 → value `'120'`; pointer down/up → no commit.
  - `'shows formatValue output and exposes it as aria-valuetext'` → `60s` as text and as `aria-valuetext`.
- [ ] **Step 48: Run it and watch it fail**
- [ ] **Step 49: Implement `Slider`** — `draft` follows the `value` prop through the render-time pattern. Input events update only `draft` and `onChange`. `commit()` skips a value equal to the last commit or to the current prop. A commit happens:
  - on a `document` `pointerup` or `pointercancel` after a pointerdown;
  - on keyup after a step key (arrows, Home, End, PageUp, PageDown);
  - on blur;
  - on a native `change` listener, only when neither a pointer drag nor a key press is active.
- [ ] **Step 50: Run it and watch it pass** → `Tests  9 passed (9)`.

- [ ] **Step 51: Write the failing Toggle test** — `toggle.test.tsx`:
  - `'is a button with aria-pressed that reports the next state'` → `Sound` `false`; click, rerender pressed → `true`; click → `[[true], [false]]`.
  - `'shows its state by knob position, not color alone'` → `[data-toggle-knob]` `off` then `on`.
  - `'labelHidden keeps the accessible name next to a decorative icon'` → `Sound` `sr-only`, `svg` aria-hidden.
  - `'disabled blocks the handler'` → not called.
  - `'reduced motion moves the knob without a transition'` → `data-motion="reduced"`, knob not `/transition/`.
- [ ] **Step 52: Run it and watch it fail**
- [ ] **Step 53: Implement `Toggle`** — an `aria-pressed` button that calls `onPressedChange(!pressed)`. The `data-toggle-knob` knob moves by translate, with a transition only when motion is full.
- [ ] **Step 54: Run it and watch it pass** → `Tests  5 passed (5)`.

- [ ] **Step 55: Write the failing Tooltip test** — `tooltip.test.tsx` (`Tooltip (parity global-tooltip-unused)`), `"Not enough points"` on B `'Buy'`:
  - `'describes its trigger even while the bubble is closed'` → no tooltip; the `aria-describedby` target reads the content.
  - `'opens on focus and closes on blur'` → tab: tooltip text; tab to `Other` → no tooltip.
  - `'opens on hover and closes when the pointer leaves'` → hover: tooltip; unhover: no tooltip.
  - `'Esc closes it, and that press reaches nothing underneath (Q49)'` → Escape: closed, outer `onKeyDown` not called; Escape again → called once.
  - `'keeps an aria-describedby the trigger already has'` → 2 ids, the first `buy-help`.
  - `'places the bubble below on request'` → `data-placement="bottom"`.
- [ ] **Step 56: Run it and watch it fail**
- [ ] **Step 57: Implement `Tooltip`** — `cloneElement` adds the bubble id after the child's own `aria-describedby`. The bubble is always rendered and is `hidden` while closed. While open, a capture-phase `document` keydown listener stops `Escape` from propagating and closes the bubble.
- [ ] **Step 58: Run it and watch it pass** → `Tests  6 passed (6)`.

- [ ] **Step 59: Write the failing ScrollArea test** — `scroll-area.test.tsx`:
  - `'scrolls on y by default and contains overscroll'` → `[data-scroll-axis="y"]` has `overflow-y-auto overscroll-y-contain`; no region.
  - `it.each` `'axis %s uses %s and %s'`: x `overflow-x-auto overscroll-x-contain`, both `overflow-auto overscroll-contain`.
  - `'a label makes it a focusable named region'` → region `Action log` `tabIndex` 0.
  - `'forwards its ref to the scrolling element'` → `ref.current` is the `[data-scroll-axis]` element.
- [ ] **Step 60: Run it and watch it fail**
- [ ] **Step 61: Implement `ScrollArea`** — a literal axis map, where y adds `overflow-x-hidden` and x adds `overflow-y-hidden`. A label adds `role="region"`, `aria-label` and `tabIndex 0`.
- [ ] **Step 62: Run it and watch it pass** → `Tests  5 passed (5)`.

- [ ] **Step 63: Write the failing TextField test** — `text-field.test.tsx` (`TextField (technical spec v7 §5.2, commit 6372d04)`):
  - `'labels a 16 px, 44 px-tall input and forwards its ref'` (`Nickname`) → the ref is the textbox; has `text-v7-input min-h-11`; `name` `nickname`; no `aria-invalid`.
  - `'links the hint through aria-describedby'` → `['Shown to other players']`.
  - `'marks an error with aria-invalid and describes it; null clears it'` → `aria-invalid="true"`, `['Shown to other players', 'Pick a nickname']`; `error={null}` removes both.
  - `'labelHidden keeps the accessible name'` → `Message` label `sr-only`.
  - `'keeps a caller id and passes input events through'` → id `join-code`; typing `ABC` → 3 calls.
- [ ] **Step 64: Run it and watch it fail**
- [ ] **Step 65: Implement `TextField`** — the input id is the caller `id`, or a `useId()` value (call the hook unconditionally). `aria-describedby` joins the caller ids with the `-hint` and `-error` ids. The error line uses `text-v7-text`, and the border uses `aria-invalid:border-v7-danger`.
- [ ] **Step 66: Run it and watch it pass** → `Tests  5 passed (5)`.

- [ ] **Step 67: Write the failing Carousel test** — `carousel.test.tsx`: `vi.mock('../use-visual-viewport-box')` returns mode `portrait`, reset after each test. Slides are Goal, Turns (`data-section="turns"`) and Lives, with the labels `Previous` and `Next`. The track's `scrollTo` is a spy.
  - `'is a labelled carousel with one named group per slide'` → region `How to play`, `aria-roledescription="carousel"`; groups `['Goal', 'Turns', 'Lives']`; group 1 `slide`, `data-section="turns"`.
  - `'Previous and Next page through the slides and report the index'` → Previous disabled; two Next clicks disable Next; Previous → `[[1], [2], [1]]`.
  - `'a controlled index drives the paging state'` (`index={2}`) → Next disabled; Previous → `[[1]]`.
  - `'paging never bubbles a press to an enclosing dismiss handler'` → the outer click and pointerdown handlers are not called.
  - `'pages with a smooth scroll when motion is full'` → `behavior: 'smooth'`, track `scroll-smooth`.
  - `'pages with an instant scroll under reduced motion (§8.3)'` → `behavior: 'auto'`, no `scroll-smooth`.
  - `'a swipe updates the index from the scroll position'` → `clientWidth` 300, `scrollLeft` 600 → `[[2]]`, Next disabled.
  - `'renders a grid with no paging controls at desktop when gridAtDesktop is set'` → `[data-carousel-layout="grid"]`, 3 groups, no Next.
  - `'stays a carousel at desktop without gridAtDesktop'` → `[data-carousel-layout="track"]`, Next present.
- [ ] **Step 68: Run it and watch it fail**
- [ ] **Step 69: Implement `Carousel`** — call `useViewportMode()` on every render. The track is a snap-x container with `IconButton` chevrons that stop click and pointerdown propagation. Index rules:
  - Paging scrolls from the click handler only: `track.scrollTo({ left: slide.offsetLeft, behavior: reduced ? 'auto' : 'smooth' })`.
  - `onScroll` derives the index as `Math.round(scrollLeft / clientWidth)` (only when `clientWidth > 0`) and never calls `scrollTo`.
  - A non-zero initial index sets `scrollLeft` in a layout effect. A controlled `index` that differs from the last requested one scrolls in an effect.
- [ ] **Step 70: Run it and watch it pass** → `Tests  9 passed (9)`.

- [ ] **Step 71: Write the failing KitTile test** — `kit-tile.test.tsx` (`KitTile (technical spec v7 §7.3, Q15, Q23)`): stats Lives 20, Points 3.
  - `'selects through a button with aria-pressed'` → B `'Warrior'` `false`; click → once; `selected` → `true`.
  - `'renders the caller stats with spoken labels'` → `Lives` `sr-only`; `20`, `3`.
  - `'the info control opens details without selecting'` → B `'Warrior details'` → `onInfo` once, `onSelect` not called.
  - `'renders no info control without an infoLabel'` → 1 button.
  - `'excluded: greyed, labelled "Excluded" and never selectable'` (`selected excluded`) → the button contains `EXCLUDED_LABEL`, is `disabled`, has `aria-pressed="false"`, and `[data-excluded="true"]` exists; click → not called.
  - `'is display-only without onSelect'` → no button; `Warrior` text.
- [ ] **Step 72: Run it and watch it fail**
- [ ] **Step 73: Implement `KitTile`** — no `KIT_CATALOG` import. The head (portrait, name and a visible `EXCLUDED_LABEL`) is an `aria-pressed` button only when `onSelect` is set. The stats sit outside that button. The `help` IconButton renders only when both `onInfo` and `infoLabel` are set.
- [ ] **Step 74: Run it and watch it pass** → `Tests  6 passed (6)`.

- [ ] **Step 75: Write the failing route and registry tests**
  - `dev/dev-ui-route.test.ts` (`isDevUiRoute (technical spec v7 §4.2, DEV only)`): `'serves the gallery at /dev/ui in DEV'` → `DEV_UI_PATH` `'/dev/ui'`; true for `/dev/ui`, `/dev/ui/`, `/dev/ui/card`. `'never matches in a production build'` → false for those and for `/`. `'ignores every other path in DEV'` → false for `/`, `/admin`, `/admin/feedback`, `/dev`, `/dev/uix`, `/dev/ui-kit`.
  - `dev/gallery-registry.test.ts`: `'returns every module section sorted by id, whatever the glob order'` → `['card', 'icons', 'primitives']`. `'throws on a duplicate section id'` → `/icons/`. `'returns an empty list for no modules'` → `[]`.
- [ ] **Step 76: Run them and watch them fail**
- [ ] **Step 77: Implement the route guard and the registry** — `isDevUiRoute` is true only when `isDev` is true and the path is `/dev/ui` or below `/dev/ui/`. The registry throws `` `Duplicate /dev/ui gallery section id "${id}"` `` on a repeated id and returns the sections sorted with `localeCompare`.
- [ ] **Step 78: Run them and watch them pass** → `Test Files  2 passed (2)`, `Tests  6 passed (6)`.

- [ ] **Step 79: Create the primitives and icons gallery sections**
  - `primitives-gallery-demos.tsx` (components only): one `<Name>Demo` per primitive. Together they cover variants, sizes, disabled reasons, `'unknown'`, badge overflow, seats 0–7 plus `null` and eliminated, a Slider readout of the last commit, a `gridAtDesktop` Carousel and an excluded KitTile. Avatar art comes from `getOpponentPlaceholderUrl()`. No `KIT_CATALOG` data, no emoji.
  - `primitives.gallery.tsx`: `{ id: 'primitives', title: 'Primitives' }` with these entries (id, title): button Button, icon-button IconButton, pill Pill, badge Badge, avatar Avatar, tabs Tabs, segmented Segmented, slider Slider, toggle Toggle, tooltip Tooltip, scroll-area ScrollArea, text-field TextField, carousel Carousel, kit-tile KitTile. Each has `render: () => <XDemo />`.
  - `icons.gallery.tsx`: `{ id: 'icons', title: 'Icons' }` with the entries `set` 'Icon set' (every `ICON_NAMES` icon at 32 px with its name) and `labelled` 'Labelled icons' (help "Help" beside coach "Coach", Q45).
  Check: `pnpm lint` reports no `react-refresh/only-export-components` error in these files.
- [ ] **Step 80: Write the failing gallery page test** — `dev/ui-gallery.test.tsx` (`/dev/ui gallery (technical spec v7 §4.2)`), with the viewport hook mocked to portrait:
  - `'paints on the opt-in V7 ground with a page title'` → h1 `UI gallery`, `.v7-ground`.
  - `'links every registered section from the nav, sorted by id'` → the nav `Gallery sections` hrefs include `#icons` and `#primitives`, in sorted order.
  - `'shows every L72-08 primitive'` → region `Primitives` has an h3 for each title listed above.
  - `'shows the full icon set'` → region `Icons` shows every `ICON_NAMES` name.
- [ ] **Step 81: Run it and watch it fail**
- [ ] **Step 82: Implement `UiGallery`** — at module level, call `collectGallerySections(import.meta.glob<GalleryModule>('../ui/**/*.gallery.tsx', { eager: true }))`. Render a `.v7-ground` page with nav links to `#<id>`, one `<section aria-labelledby>` with an h2 per section, and an h3 per entry. Do not use `100dvh`.
- [ ] **Step 83: Run it and watch it pass** → `Tests  4 passed (4)`.
- [ ] **Step 84: Wire `/dev/ui` into `App.tsx`** — import `lazy`, `Suspense` and `isDevUiRoute`, and add a header comment that names the DEV-only gallery. At module level: `const UiGallery = import.meta.env.DEV ? lazy(async () => ({ default: (await import('./dev/ui-gallery')).UiGallery })) : null;`. In `App()`, after the `/admin` branch and before `return <GameApp />;`: `if (isDevUiRoute(path, import.meta.env.DEV) && UiGallery !== null) return <Suspense fallback={null}><UiGallery /></Suspense>;`. Leave the other source-text literals unchanged. Run `pnpm vitest run --project client apps/client/src/inbox apps/client/src/admin apps/client/src/screens/claim-seat-dialog.test.ts apps/client/src/App.tutorial-hints-independence.test.ts` → PASS.
- [ ] **Step 85: Prove production builds carry no gallery** — `pnpm --filter @card-battle/client build && ls apps/client/dist/assets | grep -ci gallery; grep -rl "Gallery sections" apps/client/dist | wc -l` → the build succeeds and both counts are `0`.
- [ ] **Step 86: Check the gallery in the browser** — run `pnpm --filter @card-battle/client dev` (or `preview_start` `client`) and open `http://localhost:5173/dev/ui` at 375×812 and 1440×900. Expect:
  - the page paints on the V7 ground;
  - a pressed Button drops 3 px;
  - the Tooltip opens on hover and closes on Esc;
  - the Carousel pages at 375 px and the `gridAtDesktop` demo is a grid at 1440 px;
  - the TextField computes `font-size: 16px`;
  - the console shows no error, and `/` is unchanged.
  Stop the server.

- [ ] **Step 87: Update `DESIGN.md`** — add a `## Primitives (apps/client/src/ui/primitives/, L72-08)` section. It says chrome classes come only from `chrome-classes.ts` and gives one line per primitive:
  - CTA fills with `--text-on-cta` labels at 13.7 / 7.7 / 6.0 : 1, and the press rule;
  - the IconButton title default; the Pill ring and `?`; Badge shows 2 badges, then +n; the Avatar fallback;
  - Tabs and Segmented keys; the Slider commit rule; Tooltip Esc; the ScrollArea region;
  - TextField at 16 px with `--text` error copy; Carousel reduced-motion scrolling; KitTile "Excluded".

  Then add `### Viewport modes`, `### Copy` and `### /dev/ui gallery`.
- [ ] **Step 88: Update `docs/agent/frontend.md`** — add `### V7 primitives (L72-08)` under "Design system (V7 · Lot 72+)". Cover the import paths, the chrome and roving-focus helpers, `data-motion`, the single viewport rule, the scope of `ui-copy.ts`, and how to register a gallery section.
- [ ] **Step 89: Flip the backlog** — In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.
- [ ] **Step 90: Run the full gate** — `pnpm verify` → tsc, ESLint and Vitest are clean, with `0 failed` and `0 skipped`, including the no-emoji test.
- [ ] **Step 91: Commit the task**
  ```bash
  git add apps/client/src/ui/{viewport-mode.ts,viewport-mode.test.ts,use-visual-viewport-box.ts,use-visual-viewport-box.test.tsx,ui-copy.ts,ui-copy.test.ts} \
    apps/client/src/ui/primitives/{chrome-classes.ts,roving-focus.ts,roving-focus.test.ts,avatar-initial.ts,avatar-initial.test.ts,primitives.gallery.tsx,primitives-gallery-demos.tsx} \
    apps/client/src/ui/primitives/{button,icon-button,pill,badge,avatar,tabs,segmented,slider,toggle,tooltip,scroll-area,text-field,carousel,kit-tile}{.tsx,.test.tsx} \
    apps/client/src/ui/icons/icons.gallery.tsx \
    apps/client/src/dev/{dev-ui-route.ts,dev-ui-route.test.ts,gallery-registry.ts,gallery-registry.test.ts,ui-gallery.tsx,ui-gallery.test.tsx} \
    apps/client/src/App.tsx DESIGN.md docs/agent/frontend.md docs/backlog_v7.md
  git commit -m "feat(ui): add V7 chrome primitives (L72-08)" -m "Adds TextField, Carousel, KitTile and the DEV-only /dev/ui gallery
  (Review line); production builds drop the gallery chunk.

  Two helpers sit outside the interface contract: chrome-classes.ts
  holds the shared chrome and press classes (react-refresh keeps them
  out of button.tsx) and roving-focus.ts holds the Tabs and Segmented
  keyboard model. Tooltip swallows the Esc press that closes it, so
  one press dismisses one layer (Q49)."
  ```
  The commit has no AI attribution line. `git status --short` → only the `.claude/` entries that predate the task, or nothing.

**Decisions:**
- Rewrite is ~39K characters, about twice the ~20K target. It keeps all 91 steps and every test name and assertion; going lower would mean weakening an assertion.
- Adds ui/primitives/chrome-classes.ts, which is not in the contract: react-refresh forbids non-component exports from button.tsx, and IconButton, Toggle, Pill, Tabs and KitTile share the chrome and press classes.
- Adds ui/primitives/roving-focus.ts (nextEnabledIndex, edgeEnabledIndex, rovingKeyFor, RovingKey) with its own node test. It is the shared Tabs and Segmented keyboard model and is not in the contract.
- Stateful gallery demos live in the components-only primitives-gallery-demos.tsx: primitives.gallery.tsx exports the non-component `gallery`, and react-refresh/only-export-components reports PascalCase local components there.
- Button puts data-motion on the <button> (the animated element). That element is the root only when no reason slot wraps it, which narrows the contract's 'data-motion on the root'.
- Pill keeps a native title ('{label}' or '{label} unknown') for global-resource-captions parity. Its tone is a 2 px inset ring, never a text color, because --life on --panel-2 is only 4.25:1.
- Tooltip always renders its bubble, hidden while closed, so aria-describedby always resolves. Esc is a capture-phase document listener that stops propagation, so one Esc dismisses one layer (Q49). Record this in DESIGN.md.
- Slider commits on pointer up, on key up after a step key, on blur, or on a native change outside any drag or key press, and skips a value equal to the current prop. This extends the contract's 'pointerup, keyup, or the change end'.
- KitTile renders its 'help' info IconButton only when both onInfo and infoLabel are set, so it needs no fallback string. Stats render outside the select button so its accessible name stays the kit name.
- TextField error copy uses --text, not --danger (--danger text is 4.38:1 on --panel-2). The --danger border marks the invalid field.
- Avatar root carries data-seat-index (when the seat is known) and data-eliminated. The initial uses --text-on-cta (#0c0920), against which every seat hue is >= 4.5:1.
- Defaults the contract leaves open: Button variant 'primary', IconButton variant 'quiet'.
- Carousel adds data-carousel-track and data-carousel-layout ('track' | 'grid'). It positions the initial slide with scrollLeft and pages with track.scrollTo({ left, behavior }).
- The gallery strings 'UI gallery' and 'Gallery sections' and the demo copy are DEV-only (Step 85 proves they are absent from production builds). They are not §10.6 shipped strings.
- The backlog row lists Depends on L72-05 and L72-06 only. The task also consumes L72-04 and L72-07, which Step 1 checks; the Depends cell is not edited.
- chrome-classes uses the Tailwind v4 `(--var)` syntax (translate-y-(--x), border-(length:--x), duration-(--x)), checked to compile with tailwindcss 4.3.3.
- The commit carries no Co-Authored-By line: AGENTS.md §10 (no AI attribution) overrides the harness attribution reminder.

---

### Task L72-09: Build Sheet, Dialog and Toast with the stack contract

Cx L / risk **High** · Depends on L72-08 · Spec §6.6.5, §6.7, §6.12, §7.7, §8.3, §10.6 · Parity: `global-dialog-interaction-contract`, `global-dialog-width`, `global-visual-viewport-fit`, `table-sub-choice-non-dismissible`, `claim-seat-dismiss-stay`, `illegal-action-dialog`. Owns the whole §6.7 sheet-stack contract and its component tests; Lot 74 consumes it and does not rebuild it.

**Files:**
- Create: `apps/client/src/ui/layers.ts`; in `apps/client/src/ui/primitives/`: `sheet-stack.ts` (pure), `sheet-stack-context.ts`, `sheet-stack-provider.tsx`, `sheet-placement.ts`, `use-focus-trap.ts`, `sheet.tsx`, `dialog.tsx`, `toast.tsx`, `overlays.gallery.tsx`, `overlays.gallery-demos.tsx` (dev-only stateful demos)
- Modify: `apps/client/src/ui/ui-copy.ts` (append `MINIMIZE_LABEL`), `apps/client/src/test/render.tsx` (each `renderUi` call gets its own sheet stack), `DESIGN.md`, `docs/agent/frontend.md`, `docs/agent/testing.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`
- Test: in `apps/client/src/ui/primitives/`: `sheet-stack.test.ts`, `sheet-stack-context.test.ts`, `sheet-placement.test.ts`, `sheet.test.tsx`, `dialog.test.tsx`, `toast.test.tsx`; one new case in `apps/client/src/test/render.test.tsx`
- Do **not** touch: `apps/client/src/design/components/dialog.tsx`, `DIALOG_PANEL_BASE_CLASS` in `ui/primitives/dialog-width.ts`, `apps/client/src/index.css`, `design/components/dialog.dialog-width.test.ts` (old screens keep the V2 Dialog until their lot migrates them, §4.4)

**Interfaces:**
- Consumes:
  - L72-04: `dialogPreferredMaxWidth(panelClassName: string): string` (`ui/primitives/dialog-width.ts`); `interface VisualViewportBox { offsetTop: number; offsetLeft: number; width: number; height: number }` (`ui/visual-viewport.ts`); `seatColorAlpha(hex: string, alpha: number): string` (`ui/seat-colors.ts`)
  - L72-05: `V7_COLORS` (`ui/palette.ts`); `durationS(duration: V7Duration): number`, `EASE_ENTRANCE: readonly [0.16, 1, 0.3, 1]` (`ui/motion/motion-tokens.ts`); `V7MotionSpec`, `motionSpecFor(spec: V7MotionSpec, reduced: boolean): V7MotionSpec` (`ui/motion/reduced-motion.ts`); `usePrefersReducedMotion(): boolean`
  - L72-06: `renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult` (`src/test/render.tsx`)
  - L72-07: `IconName` values `'minimize'`, `'close'`
  - L72-08: `viewportModeFor(box: { readonly width: number; readonly height: number }): ViewportMode`; `useVisualViewportBox(): VisualViewportBox`; `Button(props: ButtonProps)` (variants `'secondary'` / `'quiet'`, `icon`, `fullWidth`); `IconButton(props: IconButtonProps)`; `GallerySection` (`dev/gallery-registry.ts`)
- Produces:
  - `ui/layers.ts`: `export const Z_INDEX: { readonly sheet: 50; readonly sheetBar: 80; readonly banner: 90; readonly toast: 95 }`
  - `ui/ui-copy.ts`: `export const MINIMIZE_LABEL = 'Minimize'`
  - `ui/primitives/sheet-stack.ts`: `export type SheetMode = 'blocking' | 'read-only'`; `export interface SheetStackEntry { readonly id: string; readonly mode: SheetMode; readonly minimized: boolean; readonly dismissLocked: boolean; readonly openOrder: number }`; `export interface SheetStackState { readonly entries: readonly SheetStackEntry[]; readonly nextOrder: number }`; `export const EMPTY_SHEET_STACK: SheetStackState`; `export const MAX_READ_ONLY_DEPTH = 2`; and, each with first parameter `state: SheetStackState`: `openSheet(state, input: { id: string; mode: SheetMode; dismissLocked?: boolean }): SheetStackState`, `closeSheet(state, id: string): SheetStackState`, `setSheetMinimized(state, id: string, minimized: boolean): SheetStackState`, `setSheetDismissLocked(state, id: string, locked: boolean): SheetStackState`, `sheetPaintOrder(state): readonly SheetStackEntry[]`, `escTargetId(state): string | null`, `sheetZIndex(state, id: string): number`, `isSheetInert(state, id: string): boolean`
  - `ui/primitives/sheet-stack-context.ts`: `export interface SheetStackStore { getSnapshot(): SheetStackState; subscribe(listener: () => void): () => void; open(input: { id: string; mode: SheetMode; dismissLocked?: boolean }): void; close(id: string): void; setMinimized(id: string, minimized: boolean): void; setDismissLocked(id: string, locked: boolean): void }`; `createSheetStackStore(): SheetStackStore`; `SheetStackContext: Context<SheetStackStore>`; `useSheetStackStore(): SheetStackStore`; `useSheetStackState(): SheetStackState`
  - `ui/primitives/sheet-stack-provider.tsx`: `export interface SheetStackProviderProps { store?: SheetStackStore; children: ReactNode }`; `SheetStackProvider(props: SheetStackProviderProps): ReactElement`
  - `ui/primitives/sheet-placement.ts`: `export type SheetPlacement = 'bottom' | 'center'`; `export type SheetPlacementPreference = SheetPlacement | 'auto'`; `resolveSheetPlacement(preference: SheetPlacementPreference, box: { readonly width: number; readonly height: number }): SheetPlacement`
  - `ui/primitives/use-focus-trap.ts`: `useFocusTrap(containerRef: RefObject<HTMLElement | null>, options: { active: boolean; initialFocusRef?: RefObject<HTMLElement | null>; restoreFocus?: boolean }): void`
  - `ui/primitives/sheet.tsx`: unexported ``interface SheetBaseProps { open: boolean; title: string; children: ReactNode; actions?: ReactNode; placement?: SheetPlacementPreference; height?: 'auto' | 'full'; initialFocusRef?: RefObject<HTMLElement | null>; hintAnchor?: string; dataAttributes?: Readonly<Record<`data-${string}`, string>>; collapsed?: boolean; collapsedBar?: ReactNode; className?: string }``; `export interface ReadOnlySheetProps extends SheetBaseProps { mode: 'read-only'; onClose: () => void; dismissLocked?: boolean; closeOnBackdrop?: boolean }`; `export interface BlockingSheetProps extends SheetBaseProps { mode: 'blocking'; onMinimizedChange?: (minimized: boolean) => void }`; `export type SheetProps = ReadOnlySheetProps | BlockingSheetProps`; `export function Sheet(props: SheetProps): ReactElement | null`
  - `ui/primitives/dialog.tsx`: ``export interface DialogProps { open: boolean; title: string; children: ReactNode; actions?: ReactNode; onClose: () => void; closeOnBackdrop?: boolean; dismissLocked?: boolean; width?: 'md' | 'lg' | 'xl' | '2xl' | '3xl'; hintAnchor?: string; initialFocusRef?: RefObject<HTMLElement | null>; dataAttributes?: Readonly<Record<`data-${string}`, string>> }``; `Dialog(props: DialogProps): ReactElement | null`
  - `ui/primitives/toast.tsx`: `export type ToastTone = 'info' | 'success' | 'error'`; `export type ToastDismissCause = 'manual' | 'timeout'`; `export interface ToastProps { open: boolean; title: string; body?: string; tone?: ToastTone; timeoutMs?: number; dismissLabel: string; onDismiss: (cause: ToastDismissCause) => void }`; `export function Toast(props: ToastProps): ReactElement | null`
  - `ui/primitives/overlays.gallery.tsx`: `export const gallery: GallerySection` with id `'overlays'`

---

- [ ] **Step 1: Check prerequisites and mark the task in progress**

```bash
ls apps/client/src/ui/primitives/button.tsx apps/client/src/ui/primitives/icon-button.tsx apps/client/src/ui/primitives/dialog-width.ts apps/client/src/ui/visual-viewport.ts apps/client/src/ui/use-visual-viewport-box.ts apps/client/src/ui/viewport-mode.ts apps/client/src/ui/ui-copy.ts apps/client/src/ui/palette.ts apps/client/src/ui/motion/reduced-motion.ts apps/client/src/ui/motion/use-prefers-reduced-motion.ts apps/client/src/test/render.tsx apps/client/src/dev/gallery-registry.ts && git log --oneline | grep -c "(L72-0[4-8])"
```
Expected: every path listed, no "No such file", count `5`; otherwise stop (L72-04..08 must be merged). Then set the L72-09 row in `docs/backlog_v7.md` to `In progress` (not committed on its own).

- [ ] **Step 2: Confirm framework APIs** (Context7 or `node_modules` typings)

React 19.2 `useEffectEvent`, `inert` prop, `createPortal`; Testing Library `wrapper` kept on `rerender`; user-event 14 `tab({ shift })` / `keyboard('{Escape}')` (Tab skipped when keydown is `defaultPrevented`); motion 12 forwarding `inert`/`hidden`; happy-dom `window.visualViewport` reads `vi.stubGlobal('visualViewport', …)`. Expected: no difference; else adapt the call site, never the tested outcome.

- [ ] **Step 3: Add layers and copy**

`apps/client/src/ui/layers.ts` (doc cites §6.7, §6.12): `export const Z_INDEX = { sheet: 50, sheetBar: 80, banner: 90, toast: 95 } as const;`. Append to `ui/ui-copy.ts`: `/** Blocking sub-choice sheets collapse to a bar (spec v7 §6.7, §10.6, Q59). */ export const MINIMIZE_LABEL = 'Minimize';`

- [ ] **Step 4: Write the failing pure stack test** — `apps/client/src/ui/primitives/sheet-stack.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { Z_INDEX } from '../layers';
import { EMPTY_SHEET_STACK, MAX_READ_ONLY_DEPTH, closeSheet, escTargetId, isSheetInert, openSheet, setSheetDismissLocked, setSheetMinimized, sheetPaintOrder, sheetZIndex, type SheetMode, type SheetStackState } from './sheet-stack';

interface OpenInput { readonly id: string; readonly mode: SheetMode; readonly dismissLocked?: boolean }
const ro = (id: string): OpenInput => ({ id, mode: 'read-only' });
const bl = (id: string): OpenInput => ({ id, mode: 'blocking' });
const openAll = (...inputs: readonly OpenInput[]): SheetStackState => inputs.reduce<SheetStackState>((s, i) => openSheet(s, i), EMPTY_SHEET_STACK);
const paintIds = (s: SheetStackState): string[] => sheetPaintOrder(s).map((e) => e.id);
const min = (s: SheetStackState, id: string, minimized = true): SheetStackState => setSheetMinimized(s, id, minimized);

describe('sheet stack paint order (spec v7 §6.7)', () => {
  it('paints read-only sheets first, expanded blocking sheets above them and minimized bars on top', () => {
    const s = openAll(bl('reward-1'), ro('card'), bl('reward-2'), ro('kit'));
    expect(paintIds(s)).toEqual(['card', 'kit', 'reward-1', 'reward-2']);
    expect(paintIds(min(s, 'reward-1'))).toEqual(['card', 'kit', 'reward-2', 'reward-1']);
  });
  it('paints at most MAX_READ_ONLY_DEPTH read-only sheets and brings the hidden one back when the top closes', () => {
    expect(MAX_READ_ONLY_DEPTH).toBe(2);
    const s = openAll(ro('seat'), ro('card'), ro('kit'));
    expect(paintIds(s)).toEqual(['card', 'kit']);
    expect(s.entries.map((e) => e.id)).toEqual(['seat', 'card', 'kit']);
    expect(paintIds(closeSheet(s, 'kit'))).toEqual(['seat', 'card']);
  });
  it('moves a restored sheet to the top of its group', () => {
    expect(paintIds(min(min(openAll(bl('reward-1'), bl('reward-2')), 'reward-1'), 'reward-1', false))).toEqual(['reward-2', 'reward-1']);
  });
});

describe('sheet stack Esc target (Q49)', () => {
  it('targets only the top read-only sheet', () => {
    const s = openAll(ro('card'), ro('kit'));
    expect(escTargetId(s)).toBe('kit');
    expect(escTargetId(closeSheet(s, 'kit'))).toBe('card');
    expect(escTargetId(EMPTY_SHEET_STACK)).toBeNull();
  });
  it('targets nothing while an expanded blocking sheet is on top, even one opened first', () => {
    expect(escTargetId(openAll(bl('mirror'), ro('card')))).toBeNull();
  });
  it('targets the read-only sheet above a minimized blocking bar', () => {
    const s = openSheet(min(openAll(bl('reward')), 'reward'), ro('card'));
    expect(escTargetId(s)).toBe('card');
    expect(paintIds(s)).toEqual(['card', 'reward']);
  });
  it('lets a dismiss-locked top sheet absorb Esc instead of passing it down', () => {
    const s = openAll(ro('card'), { id: 'feedback', mode: 'read-only', dismissLocked: true });
    expect(escTargetId(s)).toBeNull();
    expect(escTargetId(setSheetDismissLocked(s, 'feedback', false))).toBe('feedback');
  });
});

describe('sheet stack inertness and layers', () => {
  it('makes every sheet under an expanded blocking sheet inert, never a bar or an unknown id', () => {
    const s = openAll(ro('card'), bl('reward-1'), bl('reward-2'));
    expect(['card', 'reward-1', 'reward-2', 'missing'].map((id) => isSheetInert(s, id))).toEqual([true, true, false, false]);
    const bars = min(min(s, 'reward-2'), 'reward-1');
    expect(isSheetInert(bars, 'card')).toBe(false);
    expect(isSheetInert(bars, 'reward-1')).toBe(false);
  });
  it('keeps z-indexes inside their Z_INDEX layers', () => {
    const s = min(openAll(ro('card'), ro('kit'), bl('reward'), bl('steal')), 'steal');
    expect(['card', 'kit', 'reward', 'steal', 'missing'].map((id) => sheetZIndex(s, id)))
      .toEqual([Z_INDEX.sheet, Z_INDEX.sheet + 1, Z_INDEX.sheet + 2, Z_INDEX.sheetBar, Z_INDEX.sheet]);
    expect(Z_INDEX).toEqual({ sheet: 50, sheetBar: 80, banner: 90, toast: 95 });
  });
  it('returns the same state when an update changes nothing', () => {
    const s = openAll(ro('card'));
    expect(openSheet(s, ro('card'))).toBe(s);
    expect(closeSheet(s, 'missing')).toBe(s);
    expect(setSheetMinimized(s, 'card', false)).toBe(s);
    expect(setSheetMinimized(s, 'missing', true)).toBe(s);
    expect(setSheetDismissLocked(s, 'card', false)).toBe(s);
    expect(closeSheet(s, 'card').entries).toEqual([]);
  });
});
```

- [ ] **Step 5: Run the stack test and see it fail**

Run: `pnpm vitest run --project client apps/client/src/ui/primitives/sheet-stack.test.ts` — Expected: FAIL, `Failed to resolve import "./sheet-stack"`.

- [ ] **Step 6: Implement the pure stack** — `apps/client/src/ui/primitives/sheet-stack.ts`

Contract signatures; no React, no clock; cite §6.7, Q49, Q59. `EMPTY_SHEET_STACK = { entries: [], nextOrder: 0 }`; `openSheet` appends with `openOrder: state.nextOrder` (and `nextOrder + 1`); restoring (`setSheetMinimized(…, false)`) re-stamps `openOrder`; any update that changes nothing returns `state` itself. Paint order, bottom to top:
```ts
const byOrder = [...state.entries].sort((a, b) => a.openOrder - b.openOrder);
const readOnly = byOrder.filter((e) => e.mode === 'read-only' && !e.minimized).slice(-MAX_READ_ONLY_DEPTH);
const blocking = byOrder.filter((e) => e.mode === 'blocking' && !e.minimized);
const bars = byOrder.filter((e) => e.minimized);
return [...readOnly, ...blocking, ...bars];
```
`escTargetId`: last expanded painted entry, `null` if none, blocking or `dismissLocked`. `isSheetInert`: painted expanded entry with an expanded blocking entry painted above it (bars, unknown ids: never). `sheetZIndex`: expanded `min(Z_INDEX.sheet + index among expanded painted, Z_INDEX.sheetBar - 1)`; bars `min(Z_INDEX.sheetBar + index among bars, Z_INDEX.banner - 1)`; unknown or unpainted `Z_INDEX.sheet`.

- [ ] **Step 7: Run the stack test and see it pass**

Run Step 5's command. Expected: PASS, `Tests 10 passed (10)`.

- [ ] **Step 8: Write the failing placement and store tests**

`apps/client/src/ui/primitives/sheet-placement.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { resolveSheetPlacement } from './sheet-placement';

describe('resolveSheetPlacement (spec v7 §7.7, §6.4)', () => {
  it('centers auto sheets on desktop boxes only', () => {
    const auto = (width: number, height: number): string => resolveSheetPlacement('auto', { width, height });
    expect([auto(1440, 900), auto(1024, 600), auto(390, 844), auto(768, 1024), auto(844, 390)]).toEqual(['center', 'center', 'bottom', 'bottom', 'bottom']);
  });
  it('keeps an explicit placement', () => {
    expect(resolveSheetPlacement('bottom', { width: 1440, height: 900 })).toBe('bottom');
    expect(resolveSheetPlacement('center', { width: 390, height: 844 })).toBe('center');
  });
});
```
`apps/client/src/ui/primitives/sheet-stack-context.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { EMPTY_SHEET_STACK } from './sheet-stack';
import { createSheetStackStore } from './sheet-stack-context';

describe('createSheetStackStore (L72-09)', () => {
  it('starts empty and notifies subscribers only on real changes', () => {
    const store = createSheetStackStore();
    expect(store.getSnapshot()).toBe(EMPTY_SHEET_STACK);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.open({ id: 'card', mode: 'read-only' });
    store.open({ id: 'card', mode: 'read-only' });
    expect(listener).toHaveBeenCalledTimes(1);
    const snapshot = store.getSnapshot();
    store.setMinimized('card', false);
    expect(store.getSnapshot()).toBe(snapshot);
    store.setDismissLocked('card', true);
    store.close('card');
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    store.open({ id: 'kit', mode: 'read-only' });
    expect(listener).toHaveBeenCalledTimes(3);
  });
  it('gives each store its own state', () => {
    const [first, second] = [createSheetStackStore(), createSheetStackStore()];
    first.open({ id: 'card', mode: 'read-only' });
    expect(second.getSnapshot().entries).toEqual([]);
  });
});
```

- [ ] **Step 9: Run both tests and see them fail**

Run: `pnpm vitest run --project client apps/client/src/ui/primitives/sheet-placement.test.ts apps/client/src/ui/primitives/sheet-stack-context.test.ts` — Expected: FAIL, `Failed to resolve import "./sheet-placement"` and `"./sheet-stack-context"`.

- [ ] **Step 10: Implement placement, store, context and provider**

- `sheet-placement.ts`: explicit `preference` wins; `'auto'` → `viewportModeFor(box) === 'desktop' ? 'center' : 'bottom'`.
- `sheet-stack-context.ts` (`.ts` because react-refresh forbids a context in a component file): the store applies the pure functions and notifies only when `next !== state`; arrow-property methods, no `this`. A module-level `createSheetStackStore()` is the `createContext` default, so `main.tsx` needs no provider. `useSheetStackState` = `useSyncExternalStore` with `subscribe`/`getSnapshot` wrapped in `useCallback(…, [store])` (bare `store.subscribe` trips `unbound-method`).
- `sheet-stack-provider.tsx`: `useState(createSheetStackStore)`, `<SheetStackContext.Provider value={store ?? ownStore}>` (house style, `fx/table-fx-context.tsx`).

- [ ] **Step 11: Run both tests and see them pass**

Run Step 9's command. Expected: PASS, `Tests 4 passed (4)`.

- [ ] **Step 12: Write the failing harness-isolation test** — append to `apps/client/src/test/render.test.tsx` (add `useEffect`, `type ReactElement`, `it`, `expect` imports if missing)

```tsx
import { useSheetStackState, useSheetStackStore } from '../ui/primitives/sheet-stack-context';

function RegistersSheet({ id }: { readonly id: string }): null {
  const store = useSheetStackStore();
  useEffect(() => { store.open({ id, mode: 'read-only' }); return () => { store.close(id); }; }, [store, id]);
  return null;
}
function SheetCount(): ReactElement {
  return <output>{useSheetStackState().entries.length}</output>;
}
it('gives every renderUi call its own sheet stack and keeps it across rerender (L72-09)', () => {
  const first = renderUi(<><RegistersSheet id="card" /><SheetCount /></>);
  expect(first.container.textContent).toBe('1');
  expect(renderUi(<SheetCount />).container.textContent).toBe('0');
  first.rerender(<><RegistersSheet id="card" /><RegistersSheet id="kit" /><SheetCount /></>);
  expect(first.container.textContent).toBe('2');
});
```
Run: `pnpm vitest run --project client apps/client/src/test/render.test.tsx` — Expected: FAIL, `expected '1' to be '0'`.

- [ ] **Step 13: Make `renderUi` isolate the stack**

`apps/client/src/test/render.tsx`, signature unchanged: per call `createSheetStackStore()`, and a lowercase `wrapper` arrow wrapping the caller's `wrapper` (if any) in `createElement(SheetStackProvider, { store }, …)`; Testing Library reuses it on `rerender`. No PascalCase local component.

Run Step 12's command. Expected: PASS, all `render.test.tsx` cases.

- [ ] **Step 14: Write the failing Sheet test** — `apps/client/src/ui/primitives/sheet.test.tsx`

```tsx
// @vitest-environment happy-dom
import { act, fireEvent, screen } from '@testing-library/react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { MINIMIZE_LABEL } from '../ui-copy';
import { Sheet } from './sheet';

const noop = (): void => undefined;
function zone(root: ParentNode, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-zone="${name}"]`);
  if (element === null) { throw new Error(`missing data-zone="${name}"`); }
  return element;
}
function overlayOf(dialog: HTMLElement): HTMLElement {
  const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
  if (overlay === null) { throw new Error('dialog has no sheet overlay'); }
  return overlay;
}
const dialog = (name: string): HTMLElement => screen.getByRole('dialog', { name });
const noDialog = (name: string): HTMLElement | null => screen.queryByRole('dialog', { name });
const button = (name: string): HTMLElement => screen.getByRole('button', { name });
const focused = (): Element | null => document.activeElement;
const inert = (element: HTMLElement): boolean => element.hasAttribute('inert');
const z = (element: HTMLElement): number => Number(element.style.zIndex);
function swipeDown(panel: HTMLElement, distancePx: number): void {
  const handle = zone(panel, 'sheet-handle');
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: 100 + distancePx });
}
function Ro({ title, onClose = noop, open = true, children = <p>Effect</p> }: { title: string; onClose?: () => void; open?: boolean; children?: ReactNode }): ReactElement {
  return <Sheet open={open} mode="read-only" title={title} onClose={onClose}>{children}</Sheet>;
}
const REWARD = <Sheet open mode="blocking" title="Choose a reward"><button type="button">4 lives</button></Sheet>;
function OpenerHarness(): ReactElement {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => { setOpen(true); }}>Open card</button>
    <Ro title="Card" open={open} onClose={() => { setOpen(false); }}><button type="button">Use</button><button type="button">Sell</button></Ro></>;
}
function StackedHarness(): ReactElement {
  const [kitOpen, setKitOpen] = useState(false);
  return <><Ro title="Card"><button type="button" onClick={() => { setKitOpen(true); }}>Show kit</button></Ro>
    {kitOpen ? <Ro title="Kit" onClose={() => { setKitOpen(false); }}><button type="button">Kit info</button></Ro> : null}</>;
}

describe('Sheet stack contract (spec v7 §6.7)', () => {
  it('closes only the top read-only sheet on Esc (Q49)', async () => {
    const [closeCard, closeKit] = [vi.fn(), vi.fn()];
    const ui = (kitOpen: boolean): ReactElement => <><Ro title="Card" onClose={closeCard}><button type="button">Use</button></Ro>
      <Ro title="Kit" open={kitOpen} onClose={closeKit}><button type="button">Info</button></Ro></>;
    const { user, rerender } = renderUi(ui(true));
    await user.keyboard('{Escape}');
    expect(closeKit).toHaveBeenCalledTimes(1);
    expect(closeCard).not.toHaveBeenCalled();
    rerender(ui(false));
    await user.keyboard('{Escape}');
    expect(closeCard).toHaveBeenCalledTimes(1);
    expect(closeKit).toHaveBeenCalledTimes(1);
  });
  it('keeps a blocking sheet and the read-only sheet under it open on Esc and backdrop presses', async () => {
    const closeCard = vi.fn();
    const { user } = renderUi(<>{REWARD}<Ro title="Card" onClose={closeCard} /></>);
    const [reward, card] = [dialog('Choose a reward'), dialog('Card')];
    await user.keyboard('{Escape}');
    await user.click(overlayOf(reward));
    await user.click(overlayOf(card));
    expect(closeCard).not.toHaveBeenCalled();
    expect(dialog('Choose a reward')).toBe(reward);
    expect(inert(overlayOf(card))).toBe(true);
    expect(z(overlayOf(reward))).toBeGreaterThan(z(overlayOf(card)));
    expect(reward.querySelector('[data-zone="sheet-handle"]')).toBeNull();
  });
  it('minimizes a blocking sheet to a bar above later sheets, and the bar restores it (Q59)', async () => {
    const onMinimizedChange = vi.fn();
    const ui = (cardOpen: boolean): ReactElement => <><Sheet open mode="blocking" title="Choose a reward" onMinimizedChange={onMinimizedChange}>
      <button type="button">4 lives</button></Sheet><Ro title="Card" open={cardOpen} /></>;
    const { user, rerender } = renderUi(ui(false));
    expect(focused()).toBe(button('4 lives'));
    await user.click(button(MINIMIZE_LABEL));
    expect(onMinimizedChange).toHaveBeenLastCalledWith(true);
    expect(noDialog('Choose a reward')).toBeNull();
    expect(focused()).toBe(button('Choose a reward'));
    rerender(ui(true));
    const cardOverlay = overlayOf(dialog('Card'));
    expect(z(zone(document.body, 'sheet-bar'))).toBeGreaterThan(z(cardOverlay));
    expect(inert(cardOverlay)).toBe(false);
    expect(cardOverlay.style.paddingBottom).toBe('52px');
    await user.click(button('Choose a reward'));
    expect(onMinimizedChange).toHaveBeenLastCalledWith(false);
    expect(dialog('Choose a reward').getAttribute('aria-modal')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Choose a reward' })).toBeNull();
    expect(inert(cardOverlay)).toBe(true);
    expect(focused()).toBe(button('4 lives'));
  });
  it('lets Esc close a read-only sheet opened above a minimized blocking bar', async () => {
    const closeCard = vi.fn();
    const ui = (cardOpen: boolean): ReactElement => <>{REWARD}<Ro title="Card" open={cardOpen} onClose={closeCard}><button type="button">Use</button></Ro></>;
    const { user, rerender } = renderUi(ui(false));
    await user.click(button(MINIMIZE_LABEL));
    rerender(ui(true));
    expect(focused()).toBe(button('Use'));
    await user.keyboard('{Escape}');
    expect(closeCard).toHaveBeenCalledTimes(1);
    expect(button('Choose a reward')).toBeTruthy();
  });
  it('stacks two blocking sheets with the later one on top and the earlier one inert (Lot 71 pickers)', () => {
    renderUi(<><Sheet open mode="blocking" title="Reward from Ana"><button type="button">4 lives</button></Sheet>
      <Sheet open mode="blocking" title="Reward from Ben"><button type="button">2 points</button></Sheet></>);
    const [first, second] = [overlayOf(dialog('Reward from Ana')), overlayOf(dialog('Reward from Ben'))];
    expect([inert(first), inert(second)]).toEqual([true, false]);
    expect(z(second)).toBeGreaterThan(z(first));
    expect(focused()).toBe(button('2 points'));
  });
  it('stacks read-only sheets one level: a third hides the oldest until the top one closes', async () => {
    const closeKit = vi.fn();
    const ui = (kitOpen: boolean): ReactElement => <><Ro title="Seat" /><Ro title="Card" /><Ro title="Kit" open={kitOpen} onClose={closeKit} /></>;
    const { user, rerender } = renderUi(ui(true));
    expect(noDialog('Seat')).toBeNull();
    expect(dialog('Card')).toBeTruthy();
    expect(dialog('Kit')).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(closeKit).toHaveBeenCalledTimes(1);
    rerender(ui(false));
    expect(dialog('Seat')).toBeTruthy();
  });
});

describe('Sheet focus (L11-03 contract kept)', () => {
  it('moves focus in on open, wraps Tab and returns focus to the opener on close', async () => {
    const { user } = renderUi(<OpenerHarness />);
    await user.click(button('Open card'));
    const [use, sell] = [button('Use'), button('Sell')];
    expect(focused()).toBe(use);
    await user.tab();
    expect(focused()).toBe(sell);
    await user.tab();
    expect(focused()).toBe(use);
    await user.tab({ shift: true });
    expect(focused()).toBe(sell);
    await user.keyboard('{Escape}');
    expect(focused()).toBe(button('Open card'));
  });
  it('returns focus into the lower sheet when the top sheet unmounts', async () => {
    const { user } = renderUi(<StackedHarness />);
    const showKit = button('Show kit');
    expect(focused()).toBe(showKit);
    await user.click(showKit);
    expect(focused()).toBe(button('Kit info'));
    await user.keyboard('{Escape}');
    expect(noDialog('Kit')).toBeNull();
    expect(dialog('Card')).toBeTruthy();
    expect(focused()).toBe(showKit);
  });
  it('does not pull focus back when it already left the sheet', () => {
    const ui = (open: boolean): ReactElement => <><button type="button">Open card</button><input aria-label="Message" />
      <Ro title="Card" open={open}><button type="button">Use</button></Ro></>;
    const { rerender } = renderUi(ui(false));
    act(() => { button('Open card').focus(); });
    rerender(ui(true));
    expect(focused()).toBe(button('Use'));
    const message = screen.getByRole('textbox', { name: 'Message' });
    act(() => { message.focus(); });
    rerender(ui(false));
    expect(focused()).toBe(message);
  });
});

describe('Sheet dismissal (read-only)', () => {
  it('closes on a backdrop press, never on a press inside the panel or a drag that ends on the backdrop', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<Ro title="Card" onClose={onClose}><p>Deal 3 damage.</p></Ro>);
    const panel = dialog('Card');
    await user.click(screen.getByText('Deal 3 damage.'));
    await user.click(panel);
    fireEvent.pointerDown(screen.getByText('Deal 3 damage.'));
    fireEvent.click(overlayOf(panel));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(overlayOf(panel));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('closes on a swipe-down of at least 80 px on the handle', () => {
    const onClose = vi.fn();
    renderUi(<Ro title="Card" onClose={onClose} />);
    swipeDown(dialog('Card'), 40);
    expect(onClose).not.toHaveBeenCalled();
    swipeDown(dialog('Card'), 120);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('ignores Esc, backdrop and swipe while dismissLocked (Feedback send lock, §7.7)', async () => {
    const onClose = vi.fn();
    const ui = (locked: boolean): ReactElement => <Sheet open mode="read-only" title="Feedback" onClose={onClose} dismissLocked={locked}><p>Sending</p></Sheet>;
    const { user, rerender } = renderUi(ui(true));
    await user.keyboard('{Escape}');
    await user.click(overlayOf(dialog('Feedback')));
    swipeDown(dialog('Feedback'), 120);
    expect(onClose).not.toHaveBeenCalled();
    rerender(ui(false));
    swipeDown(dialog('Feedback'), 120);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('leaves Esc to a child control that already handled it', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<Ro title="Card" onClose={onClose}>
      <button type="button" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); } }}>Use</button></Ro>);
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
  it('collapses to the caller bar without closing on Esc (targeting, §6.6.2)', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<Sheet open collapsed collapsedBar={<button type="button">Cancel</button>} mode="read-only" title="Basic attack" onClose={onClose}>
      <button type="button">Use</button></Sheet>);
    expect(noDialog('Basic attack')).toBeNull();
    expect(button('Cancel').closest('[data-zone="sheet-bar"]')).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Sheet motion (spec v7 §8.3)', () => {
  it('fades only under reduced motion: no transform on the panel', () => {
    renderUi(<Ro title="Card" />, { reducedMotion: true });
    const panel = dialog('Card');
    expect(panel.getAttribute('data-motion')).toBe('reduced');
    expect(panel.getAttribute('style') ?? '').not.toMatch(/transform|translate|scale/);
    expect(overlayOf(panel).getAttribute('style') ?? '').not.toMatch(/transform|translate|scale/);
  });
  it('marks the full-motion path', () => {
    renderUi(<Ro title="Card" />);
    expect(dialog('Card').getAttribute('data-motion')).toBe('full');
  });
});
```

- [ ] **Step 15: Run the Sheet test and see it fail**

Run: `pnpm vitest run --project client apps/client/src/ui/primitives/sheet.test.tsx` — Expected: FAIL, `Failed to resolve import "./sheet"`.

- [ ] **Step 16: Implement `useFocusTrap`** — `apps/client/src/ui/primitives/use-focus-trap.ts` (cite L11-03, §6.6.5)

One `useEffect` on `[active, containerRef, initialFocusRef]`, a hook-lifetime `openerRef`, and a `useEffectEvent` restore reading the latest `restoreFocus` (default `true`). Algorithm:
- Focusables: `button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])` with `tabIndex !== -1`.
- Activate: record `document.activeElement` as opener only if connected, not `body`, outside the container (else keep the old one, so Minimize → restore keeps it). Unless `container.closest('[inert], [hidden]')`, focus `initialFocusRef.current`, else (if focus is not inside yet) the first focusable, else the container.
- Active: a native container `keydown` wraps Tab / Shift+Tab; with nothing focusable, Tab is swallowed.
- Deactivate/unmount: if `restoreFocus`, the opener is connected and focus is unclaimed (`null`, `body`, disconnected, or inside the container), focus the opener; if the opener is still inside `[inert]`, retry once on `requestAnimationFrame`. Never steal focus from a connected element outside the container.

- [ ] **Step 17: Implement `Sheet`** — `apps/client/src/ui/primitives/sheet.tsx`

Exports only the contract types and `Sheet`; cite §6.7, §6.6.5, §7.7, Q49, Q59, L53-02, L53-07. Approach: register `useId()` in the store while `open` (deps `[open, id, mode, store]`, never `dismissLocked`, so the lock cannot re-stamp `openOrder`; separate effects sync `dismissLocked` and `collapsed` into the store), derive hidden / inert / `zIndex` / bar slot from `useSheetStackState()`, render through `createPortal(…, document.body)`. Rules the tests leave open:
- Defaults: `placement` `'bottom'` (only Dialog passes `'auto'`), `closeOnBackdrop` `true`.
- Esc: a `document` `keydown` listener (`useEffectEvent`) gated on read-only, `!defaultPrevented` and `escTargetId(store.getSnapshot()) === id`. Backdrop and swipe are also ignored while inert; the backdrop needs `target === currentTarget` on both `pointerdown` and `click`; swipe follows one `pointerId` from the handle, `SWIPE_DISMISS_PX = 80`.
- Overlay `motion.div` (`data-zone="sheet-overlay"`, `role="presentation"`, `items-start`, `hidden` when `barMode` or not painted, `inert` from `isSheetInert`): `position: 'fixed'` with `top`/`left`/`width`/`height` from the visual-viewport box, `zIndex` from `sheetZIndex`, `backgroundColor: seatColorAlpha(V7_COLORS['bg-0'], 0.6)`, `paddingBottom: barCount * BAR_SLOT_PX` when bars exist (`BAR_SLOT_PX = 52`: 44 px bar + 8 px gap); `inert`/`hidden` move to a plain wrapper `div` if motion drops them.
- Panel `motion.div`: `role="dialog"`, `aria-modal={!barMode}`, `aria-labelledby` its `h2`, `tabIndex={-1}`, `data-zone="sheet-panel"`, `data-sheet-mode`, `data-sheet-placement`, `data-motion`, `data-hint-anchor`, `dataAttributes`; style ``{ maxHeight: '100%', maxWidth: `min(${dialogPreferredMaxWidth(className ?? '')}, 100%)` }``; V7 token classes only (`bg-v7-panel`, `border-v7-ink`, chrome outline / shadow / radius tokens, `rounded-t-v7-chrome` at the bottom). Children by `data-zone`: `sheet-handle` (read-only + bottom only, `aria-hidden`, `touch-none`), the `h2` title, `sheet-body` (`min-h-0 flex-1 overflow-y-auto`), `sheet-actions` (outside the body), and for blocking sheets the Minimize `Button` (`variant="quiet" icon="minimize"`) last, so initial focus lands on the first body control.
- Bar (`data-zone="sheet-bar"`, outside `AnimatePresence`, `zIndex` from `sheetZIndex`): `position: 'fixed'`, `top: box.offsetTop + box.height - (barIndex + 1) * BAR_SLOT_PX`, full box width; `collapsedBar` when `collapsed`, else a full-width secondary `Button` labelled `title` that restores. Minimize and restore call `store.setMinimized` then `onMinimizedChange?.(…)`.
- Motion via `motionSpecFor(spec, usePrefersReducedMotion())`: overlay fades over `durationS('fast')`; panel `y: 24` → `0` (center `scale: 0.98` → `1`) with opacity, `durationS('base')`, `EASE_ENTRANCE`.
- `useFocusTrap(panelRef, { active: open && registered && !barMode, … })`.

- [ ] **Step 18: Run the Sheet test and see it pass**

Run Step 15's command. Expected: PASS, `Tests 16 passed (16)`.

- [ ] **Step 19: Write the failing Dialog test** — `apps/client/src/ui/primitives/dialog.test.tsx` (V7 replacement for the L72-owned `dialog-width` rows)

```tsx
// @vitest-environment happy-dom
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Dialog } from './dialog';

// zone() and overlayOf(): copy verbatim from sheet.test.tsx.
class FakeVisualViewport extends EventTarget { offsetTop = 0; offsetLeft = 0; width = 0; height = 0; }
function stubVisualViewport(width: number, height: number): FakeVisualViewport {
  const viewport = new FakeVisualViewport();
  viewport.width = width;
  viewport.height = height;
  vi.stubGlobal('visualViewport', viewport);
  return viewport;
}
const noop = (): void => undefined;
const panelOf = (name: string): HTMLElement => screen.getByRole('dialog', { name });

describe('Dialog (spec v7 §7.7, L53-02 / L53-07)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('bounds the panel to an 844×390 landscape box and keeps the footer outside the scrolling body', () => {
    stubVisualViewport(844, 390);
    renderUi(<Dialog open title="How to play" onClose={noop} actions={<button type="button">Close</button>}>
      {Array.from({ length: 40 }, (_, index) => <p key={index}>Rule line {index + 1}</p>)}</Dialog>);
    const panel = panelOf('How to play');
    const overlay = overlayOf(panel);
    expect([overlay.style.position, overlay.style.width, overlay.style.height]).toEqual(['fixed', '844px', '390px']);
    expect(panel.style.maxHeight).toBe('100%');
    expect(panel.getAttribute('data-sheet-placement')).toBe('bottom');
    const [body, footer] = [zone(panel, 'sheet-body'), zone(panel, 'sheet-actions')];
    expect(body.className).toContain('overflow-y-auto');
    expect(footer.parentElement).toBe(panel);
    expect(body.contains(footer)).toBe(false);
    expect(footer.contains(screen.getByRole('button', { name: 'Close' }))).toBe(true);
  });
  it('follows visualViewport offsets when the keyboard opens on a 390×844 phone', () => {
    const viewport = stubVisualViewport(390, 844);
    renderUi(<Dialog open title="Feedback" onClose={noop}><input aria-label="Message" /></Dialog>);
    const overlay = overlayOf(panelOf('Feedback'));
    expect(overlay.style.top).toMatch(/^0(px)?$/);
    expect(overlay.style.height).toBe('844px');
    act(() => { viewport.offsetTop = 120; viewport.height = 480; viewport.dispatchEvent(new Event('resize')); });
    expect(overlay.style.top).toBe('120px');
    expect(overlay.style.left).toMatch(/^0(px)?$/);
    expect([overlay.style.width, overlay.style.height]).toEqual(['390px', '480px']);
    expect(overlay.getAttribute('style') ?? '').not.toMatch(/dvh|vh|inset/);
    expect(overlay.className).not.toMatch(/\binset-0\b|dvh/);
  });
  it('is a bottom sheet capped at min(28rem, 100%) on a phone', () => {
    stubVisualViewport(390, 844);
    renderUi(<Dialog open title="Feedback" onClose={noop}><p>Body</p></Dialog>);
    expect(panelOf('Feedback').getAttribute('data-sheet-placement')).toBe('bottom');
    expect(panelOf('Feedback').style.maxWidth).toMatch(/^min\(28rem,\s?100%\)$/);
  });
  it('is centered on a 1440×900 desktop box and honors the 3xl width', () => {
    stubVisualViewport(1440, 900);
    renderUi(<Dialog open title="Shop" width="3xl" onClose={noop}><p>Cards</p></Dialog>);
    expect(panelOf('Shop').getAttribute('data-sheet-placement')).toBe('center');
    expect(panelOf('Shop').style.maxWidth).toMatch(/^min\(48rem,\s?100%\)$/);
  });
  it('ignores the backdrop but keeps Esc when closeOnBackdrop is false', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<Dialog open title="Table rules" closeOnBackdrop={false} onClose={onClose}><p>Rules</p></Dialog>);
    await user.click(overlayOf(panelOf('Table rules')));
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('passes the hint anchor and data attributes through to the panel', () => {
    renderUi(<Dialog open title="Choose a reward" hintAnchor="elimination-reward" dataAttributes={{ 'data-sub-choice': 'reward' }} onClose={noop}><p>Pick</p></Dialog>);
    expect(panelOf('Choose a reward').getAttribute('data-hint-anchor')).toBe('elimination-reward');
    expect(panelOf('Choose a reward').getAttribute('data-sub-choice')).toBe('reward');
  });
});
```
Run: `pnpm vitest run --project client apps/client/src/ui/primitives/dialog.test.tsx` — Expected: FAIL, `Failed to resolve import "./dialog"`.

- [ ] **Step 20: Implement `Dialog`** — `apps/client/src/ui/primitives/dialog.tsx`

`<Sheet mode="read-only" placement="auto" className={DIALOG_WIDTH_CLASS[width ?? 'md']} …>`, other props by conditional spread. Private `DIALOG_WIDTH_CLASS = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl' } as const` (28 / 32 / 36 / 42 / 48 rem through `dialogPreferredMaxWidth`). Doc: §7.7; `dismissLocked` is the Feedback send lock.

Run Step 19's command. Expected: PASS, `Tests 6 passed (6)`.

- [ ] **Step 21: Write the failing Toast test** — `apps/client/src/ui/primitives/toast.test.tsx`

```tsx
// @vitest-environment happy-dom
import { act, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderUi } from '../../test/render';
import { Z_INDEX } from '../layers';
import { Toast } from './toast';

const timers = { advanceTimers: vi.advanceTimersByTime };
const tick = (ms: number): void => { act(() => { vi.advanceTimersByTime(ms); }); };
const base = { title: "Can't do that", tone: 'error', timeoutMs: 4000, dismissLabel: 'OK' } as const;
const ok = (): HTMLElement => screen.getByRole('button', { name: 'OK' });

describe('Toast dismissal (spec v7 §6.12)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('calls onDismiss once with manual, and the timeout never fires after it', async () => {
    const onDismiss = vi.fn();
    const { user } = renderUi(<Toast open {...base} body="It is not your turn." onDismiss={onDismiss} />, timers);
    expect(screen.getByRole('alert').textContent).toContain("Can't do that");
    await user.click(ok());
    await user.click(ok());
    tick(10_000);
    expect(onDismiss.mock.calls).toEqual([['manual']]);
  });
  it('calls onDismiss once with timeout, and the close button cannot fire it again', async () => {
    const onDismiss = vi.fn();
    const { user } = renderUi(<Toast open {...base} onDismiss={onDismiss} />, timers);
    tick(3999);
    expect(onDismiss).not.toHaveBeenCalled();
    tick(1);
    expect(onDismiss.mock.calls).toEqual([['timeout']]);
    await user.click(ok());
    tick(10_000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
  it('keeps one timer across rerenders and never dismisses on a prop update', () => {
    const [first, second] = [vi.fn(), vi.fn()];
    const { rerender } = renderUi(<Toast open {...base} body="It is not your turn." onDismiss={first} />, timers);
    tick(3000);
    const next = (): ReactElement => <Toast open title="Not enough points" body="You need 2 points." tone="info" timeoutMs={8000} dismissLabel="OK" onDismiss={second} />;
    rerender(next());
    rerender(next());
    tick(999);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    tick(1);
    expect(first).not.toHaveBeenCalled();
    expect(second.mock.calls).toEqual([['timeout']]);
  });
  it('starts a fresh dismissal cycle each time open turns true', () => {
    const onDismiss = vi.fn();
    const { rerender } = renderUi(<Toast open {...base} onDismiss={onDismiss} />, timers);
    tick(4000);
    rerender(<Toast open={false} {...base} onDismiss={onDismiss} />);
    rerender(<Toast open {...base} onDismiss={onDismiss} />);
    tick(4000);
    expect(onDismiss.mock.calls).toEqual([['timeout'], ['timeout']]);
  });
  it('uses status for non-errors, sits on the toast layer and fades without a transform under reduced motion', () => {
    renderUi(<Toast open title="Link copied" dismissLabel="OK" onDismiss={() => undefined} />, { reducedMotion: true, ...timers });
    const toast = screen.getByRole('status');
    expect(Number(toast.style.zIndex)).toBe(Z_INDEX.toast);
    expect(toast.getAttribute('data-motion')).toBe('reduced');
    expect(toast.getAttribute('style') ?? '').not.toMatch(/transform|translate|scale/);
  });
});
```
Run: `pnpm vitest run --project client apps/client/src/ui/primitives/toast.test.tsx` — Expected: FAIL, `Failed to resolve import "./toast"`.

- [ ] **Step 22: Implement `Toast`** — `apps/client/src/ui/primitives/toast.tsx`

Doc: §6.12, "any dismissal, manual or timed, goes through onDismiss; a state update never dismisses". A `dismissedRef` guards both paths. One effect on `[open]` only: on open, reset the guard and start `window.setTimeout` from the current `timeoutMs` through a `useEffectEvent` (the timeout callback is one too, so it calls the latest `onDismiss('timeout')`); cleanup clears it. The close button's plain handler clears the timer and calls `onDismiss('manual')`. Portal to `document.body` inside `AnimatePresence`; root `motion.div` `role={tone === 'error' ? 'alert' : 'status'}`, `data-zone="toast"`, `data-toast-tone`, `data-motion`, style `{ position: 'fixed', top: box.offsetTop + 8, left: box.offsetLeft, width: box.width, zIndex: Z_INDEX.toast, pointerEvents: 'none' }`; a `pointer-events-auto` card (`bg-v7-panel-2`, tone accent `border-l-v7-cta-2` / `-upgrade` / `-danger`) with title, optional body and `<IconButton aria-label={dismissLabel} icon="close" variant="quiet" />`. Motion: `y: -12` → `0` with opacity, `durationS('base')`, `EASE_ENTRANCE`, through `motionSpecFor`.

Run Step 21's command. Expected: PASS, `Tests 5 passed (5)`.

- [ ] **Step 23: Add the overlays gallery section**

`overlays.gallery-demos.tsx` (components only, dev-only, no emoji): `ReadOnlyStackDemo` (Card → Kit → Seat), `BlockingSheetDemo` (reward tiles + Confirm, Minimize, a read-only sheet over the bar), `DialogDemo` (`md`/`3xl`, `dismissLocked` toggles), `ToastDemo` (info + error, `timeoutMs` 4000). `overlays.gallery.tsx`: `export const gallery: GallerySection = { id: 'overlays', title: 'Overlays', entries }`, entries `read-only-stack`, `blocking-sheet`, `dialog`, `toast` rendering those demos.

Run: `pnpm vitest run --project client apps/client/src/dev apps/client/src/ui/icons` — Expected: PASS (gallery registry, section ids, `no-emoji` scan). Optional: `/dev/ui` Overlays at 375×812 (bottom) and 1440×900 (centered); L72-21 checks it formally.

- [ ] **Step 24: Update the living docs**

- `DESIGN.md`, section "Overlays — Sheet, Dialog, Toast (L72-09)": `Z_INDEX`; paint order, depth-2 rule, restore-to-top; Esc rules (Q49, lock absorbs, `defaultPrevented` ignored); Minimize (string "Minimize", §10.6, listed in the Lot 72 PR for designer review; caller keeps intents locked), collapsed sheets on the bar layer, 52 px bar inset; read-only dismiss paths (Esc, backdrop press starting and ending on the overlay, swipe-down ≥ 80 px) all via `onClose`, `dismissLocked` blocks all, `closeOnBackdrop={false}` only the backdrop, blocking has none; focus rules; placement via `viewportModeFor` and `visualViewport` sizing (never `100dvh` / `inset-0`); portal; Toast roles and one `onDismiss` per open; reduced motion; the V2 "Esc closes every open Dialog" note does not apply to V7.
- `docs/agent/frontend.md`: end the V2 `**Dialog:**` bullet with "V2 only: V7 surfaces use `ui/primitives` `Sheet` / `Dialog` / `Toast` (L72-09), where Esc closes only the top sheet (Q49); see DESIGN.md." Add an "Overlays (L72-09)" bullet under "Design system (V7 · Lot 72+)": contract summary, files, portaled sheets leave the caller's `<form>` (retires the `type="button"` parity hazard), `renderUi` isolates the stack, L72-21 checks swipe on touch and placement at 375×812, 844×390, 1440×900.
- `docs/agent/testing.md` (V7 component tests): "`renderUi` gives every call its own `SheetStackProvider` store (L72-09), kept across `rerender`."
- `docs/agent/decisions.md`: append `## <commit date> · [P] V7 sheet stack (L72-09)` with the decisions of this task (depth-2 rule, restore-to-top, collapsed on the bar layer, portal, stack-aware Esc so an Esc meant for a lower sheet cannot reach a claim picker — Appendix A `claim-seat-dismiss-stay`, consumer L76 — `closeOnBackdrop`, Dialog width via `dialogPreferredMaxWidth`, §4.4).
- `docs/backlog_v7_test_classification.md`, the two L72-owned `dialog-width` rows ("drops extra padding…", "pins the overlay…"): "V7 replacement written in L72-09: `apps/client/src/ui/primitives/dialog.test.tsx`; the source-text test stays until the commit that deletes `design/components/dialog.tsx`."
- In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

- [ ] **Step 25: Run the full gate**

Run: `pnpm verify` — Expected: exit 0; `tsc` clean; `eslint .` clean (no react-refresh, `unbound-method`, `exhaustive-deps`, `rules-of-hooks`); all Vitest projects green, 0 failed, 0 skipped.

- [ ] **Step 26: Commit**

```bash
git add apps/client/src/ui/layers.ts apps/client/src/ui/ui-copy.ts \
  apps/client/src/ui/primitives/sheet-stack.ts apps/client/src/ui/primitives/sheet-stack.test.ts \
  apps/client/src/ui/primitives/sheet-stack-context.ts apps/client/src/ui/primitives/sheet-stack-context.test.ts \
  apps/client/src/ui/primitives/sheet-stack-provider.tsx \
  apps/client/src/ui/primitives/sheet-placement.ts apps/client/src/ui/primitives/sheet-placement.test.ts \
  apps/client/src/ui/primitives/use-focus-trap.ts \
  apps/client/src/ui/primitives/sheet.tsx apps/client/src/ui/primitives/sheet.test.tsx \
  apps/client/src/ui/primitives/dialog.tsx apps/client/src/ui/primitives/dialog.test.tsx \
  apps/client/src/ui/primitives/toast.tsx apps/client/src/ui/primitives/toast.test.tsx \
  apps/client/src/ui/primitives/overlays.gallery.tsx apps/client/src/ui/primitives/overlays.gallery-demos.tsx \
  apps/client/src/test/render.tsx apps/client/src/test/render.test.tsx \
  DESIGN.md docs/agent/frontend.md docs/agent/testing.md docs/agent/decisions.md \
  docs/backlog_v7.md docs/backlog_v7_test_classification.md
git commit -F - <<'EOF'
feat(ui): add sheet stack and overlays (L72-09)

One store implements the spec v7 §6.7 contract: blocking sheets above
read-only ones, Minimize bars above every sheet, Esc only on the top
expanded read-only sheet (Q49), read-only sheets at most two deep.

Sheets and Toast portal to document.body. Dialog caps its width with
dialogPreferredMaxWidth, not dialogPanelClassName, whose V2 base
classes would leak V2 chrome; ReadOnlySheetProps gains closeOnBackdrop
so Dialog can honor it.

New string for designer review: "Minimize".
EOF
```
Expected: one commit; `git status` clean for these paths. No Co-Authored-By or other AI attribution line (AGENTS.md §10).

**Decisions:**
- ReadOnlySheetProps adds closeOnBackdrop?: boolean (default true) beyond the contract: DialogProps exposes closeOnBackdrop, and the contract's Sheet props offer no way to drop backdrop dismissal while keeping Esc.
- Dialog sizes its width with a static max-w-* class plus dialogPreferredMaxWidth inline min(<rem>, 100%), not the contract's dialogPanelClassName, which prepends V2 DIALOG_PANEL_BASE_CLASS chrome; restyling that constant would recolor every V2 Dialog (forbidden by §4.4).
- Extra dev-only file ui/primitives/overlays.gallery-demos.tsx holds the stateful demo components: a *.gallery.tsx exporting `gallery` cannot also declare components (react-refresh/only-export-components), and the ../ui/**/*.gallery.tsx glob does not pick it up.
- 'Stack one level' is defined as: only the newest MAX_READ_ONLY_DEPTH (2) expanded read-only sheets paint; an older one stays registered but hidden until a newer one closes.
- A read-only sheet the caller marks `collapsed` (L74 targeting) is stored as minimized: it joins the bar group and bar z-layer, Esc skips it, and its focus trap is released.
- Restoring a minimized sheet re-stamps its openOrder so it rises to the top of its group; otherwise restoring the earlier of two blocking pickers would leave it hidden under the other.
- Every stack update that changes nothing (re-open of a present id, unknown id, unchanged flag) returns the same state object, so the store does not notify subscribers.
- sheetZIndex clamps: expanded painted entries get min(50 + index, 79), bars get min(80 + index, 89), unknown or unpainted ids get 50.
- Sheet and Toast render via createPortal to document.body so the Z_INDEX layers are global and no transformed or <form> ancestor captures a fixed overlay; this retires the type="button" form hazard for V7 sheets.
- Esc is a per-sheet document keydown listener that acts only when escTargetId === its own id and the event is not defaultPrevented; a dismiss-locked top sheet absorbs Esc instead of passing it to the sheet below (Q49).
- useFocusTrap pins extra rules: the opener persists across re-activation (Minimize then restore), no initial focus under [inert]/[hidden], focus is restored only when it is still in the sheet or unclaimed, and one requestAnimationFrame retry runs while the opener is still inert.
- The Minimize button is the last control in a blocking panel so initial focus lands on the first body control (parity table-sub-choice-non-dismissible).
- Bars are 52 px slots (44 px bar + 8 px gap) stacked up from the visual-viewport bottom; every expanded overlay gets paddingBottom = barCount x 52 px so its content stays above the bars.
- Sheet's own default placement is 'bottom'; only Dialog passes 'auto' (centered when viewportModeFor gives desktop).
- Sheet's register effect excludes dismissLocked from its deps, so toggling the lock never closes and re-opens the entry or changes its openOrder.
- Docs touched beyond the brief, per AGENTS.md §12: docs/agent/testing.md (renderUi stack isolation), docs/agent/decisions.md (sheet-stack entry), docs/backlog_v7_test_classification.md (replacement-test path on the two L72-owned dialog-width rows).

---

### Task L72-10: Extract card and kit art with a contact sheet

**Cx / risk:** L / **High** · **Depends on:** L72-06 (via it L72-04 `ui/asset-lookup`, L72-05 `DESIGN.md` / `ui/palette.ts`) · **Spec:** v7 §1, §4.5, §5.4, §5.5 · **Parity:** `global-art-catalog`, `global-art-lot63-gambler-roulette`, `global-activated-art-guard`

High risk (`docs/agent/testing.md` golden rule 5): green tests are not acceptance; Steps 20 and 24 are.

**Files:**
- Create: `apps/client/src/ui/asset-files.ts`, `apps/client/scripts/art-flood-fill.ts`, `apps/client/scripts/extract-art.ts`
- Create (generated, committed): `apps/client/src/assets/art/cards/<cardId>.png` ×31, `apps/client/src/assets/art/kits/<kitId>.png` ×16
- Generated, gitignored, never committed: `apps/client/.art-contact-sheet/contact-sheet.png`
- Modify: `apps/client/src/ui/asset-lookup.ts`, `apps/client/tsconfig.json`, `eslint.config.mjs`, `apps/client/package.json`, `pnpm-lock.yaml`, `.gitignore`, `docs/agent/frontend.md`, `DESIGN.md`, `docs/backlog_v7.md`
- Test (create): `apps/client/scripts/art-flood-fill.test.ts`, `apps/client/src/ui/asset-files.test.ts`, `apps/client/src/ui/asset-lookup.art-for.test.ts`
- Test (unchanged, byte-for-byte green): `apps/client/src/ui/asset-lookup.test.ts`

**Interfaces:**
- Consumes:
  - L72-04 `apps/client/src/ui/asset-lookup.ts`: `getCardBackUrl(type: CardBackKind): string`, `export const ALL_ART_CARD_IDS: readonly CardId[]`, `export type { ResourceKind, CardBackKind }`; `asset-lookup.test.ts` (12 tests).
  - L72-06: client Vitest `include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts']`, environment `node`.
  - L72-05: `export const V7_COLORS` (`apps/client/src/ui/palette.ts`), `DESIGN.md`, `docs/agent/frontend.md` § "Design system (V7 · Lot 72+)".
  - `@card-battle/shared`: `isKitId(value: string): value is KitId`, `getCard(cardId: CardId): Card | undefined`, `KIT_IDS`, `ATTACK_CARD_IDS`, `ACTION_CARD_IDS`, `SPECIAL_CARD_IDS`, types `CardId`, `CardType`, `KitId`.
- Produces:
  - `apps/client/src/ui/asset-files.ts`: `export type ResourceKind = 'life' | 'point' | 'shield' | 'upgradePoint'` · `export type CardBackKind = CardType | 'kit'` · `export interface CardArtFiles { base: string; upgraded: string; activatedBase?: string; activatedUpgraded?: string }` · `export const KIT_FILES: Readonly<Record<KitId, string>>` · `export const CARD_FILES: Readonly<Record<CardId, CardArtFiles>>` · `export const RESOURCE_FILES: Readonly<Record<ResourceKind, string>>` · `export const BACK_FILES: Readonly<Record<CardBackKind, string>>`
  - `apps/client/src/ui/asset-lookup.ts` (additions only): `export const ART_FALLBACK_URL: string` · `export function artFor(id: CardId | KitId): string`
  - `apps/client/scripts/art-flood-fill.ts`: `export interface RgbaImage { readonly width: number; readonly height: number; readonly data: Uint8ClampedArray }` · `export interface CropRect { readonly left: number; readonly top: number; readonly width: number; readonly height: number }` · `export function clearEdgeGround(image: RgbaImage, options: { readonly tolerance: number }): RgbaImage`
  - `apps/client/scripts/extract-art.ts`: no exports; run `pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts`.
  - 47 committed PNGs, read by L72-12 (`Card` via `artFor(cardId)`) and L72-15 (`KitPortrait` via `artFor(kitId)`).

---

- [ ] **Step 1: Preflight and mark In progress**
  ```bash
  test -f apps/client/src/ui/asset-lookup.ts && test -f apps/client/src/ui/asset-lookup.test.ts && test ! -e apps/client/src/design/asset-lookup.ts && echo moved
  grep -n "scripts/\*\*/\*.test.ts" vitest.config.ts
  test -f DESIGN.md && grep -n "Design system (V7" docs/agent/frontend.md
  grep -n "export const V7_COLORS" apps/client/src/ui/palette.ts
  git status --short
  ```
  Expected: `moved`, one line per grep, empty status; else stop. Set the `| L72-10 |` row to `In progress`; `grep -c '^| L72-10 .*| In progress |$' docs/backlog_v7.md` → `1`.

- [ ] **Step 2: Add sharp and tsx (client dev)**
  ```bash
  pnpm add -D --filter @card-battle/client sharp tsx@4.23.1
  pnpm ignored-builds
  pnpm --filter @card-battle/client exec node -e "import('sharp').then((m) => console.log(JSON.stringify(m.default.versions)))"
  ```
  Expected: devDependencies `"sharp": "^0.35.x"`, `"tsx": "4.23.1"` (exact; fix a `^` and rerun `pnpm install`); one-liner prints `"sharp":"0.35.` and a `"vips"` key. If `pnpm ignored-builds` lists sharp, that is fine while the one-liner prints both versions: leave `onlyBuiltDependencies` unchanged and do not approve the build. Add `sharp` to it only if the one-liner fails.

- [ ] **Step 3: Typecheck/lint scripts; ignore the sheet**
  `apps/client/tsconfig.json` → `"include": ["src", "scripts", "vite.config.ts"]`. In `eslint.config.mjs`, after the `apps/client/src/**/*.{ts,tsx}` block:
  ```js
  {
    // One-off Node scripts (art extraction, technical spec v7 §5.5).
    files: ['apps/client/scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  ```
  Append to `.gitignore`:
  ```
  # V7 art contact sheet (technical spec v7 §5.5): attached to the lot PR, never committed
  apps/client/.art-contact-sheet/
  ```
  Run: `pnpm --filter @card-battle/client typecheck && pnpm exec eslint eslint.config.mjs && git check-ignore apps/client/.art-contact-sheet/contact-sheet.png` → only the path is printed.

- [ ] **Step 4: Write the failing flood-fill test** `apps/client/scripts/art-flood-fill.test.ts`:
  ```ts
  /** Edge flood-fill ground removal — technical spec v7 §5.5 (L72-10). Enclosed light regions survive. */
  import { describe, expect, it } from 'vitest';

  import { clearEdgeGround, type RgbaImage } from './art-flood-fill';

  const PIXELS: Readonly<Record<string, readonly [number, number, number, number]>> = {
    '.': [255, 255, 255, 255], // white card ground
    c: [253, 243, 211, 255], // cream special ground
    '#': [40, 40, 40, 255], // dark outline
    o: [250, 250, 250, 255], // light island, 8.7 from white
    '~': [252, 252, 252, 255], // ground noise, 5.2 from white
    g: [230, 230, 230, 255], // light drawing fill, 43.3 from white
    t: [255, 255, 243, 255], // exactly 12 from white
    x: [0, 0, 0, 0], // already transparent
  };

  function imageFrom(rows: readonly string[]): RgbaImage {
    const width = rows[0]?.length ?? 0;
    const data = new Uint8ClampedArray(width * rows.length * 4);
    rows.forEach((row, y) => {
      [...row].forEach((symbol, x) => {
        const pixel = PIXELS[symbol];
        if (pixel === undefined) throw new Error(`Unknown pixel symbol ${symbol}`);
        data.set(pixel, (y * width + x) * 4);
      });
    });
    return { width, height: rows.length, data };
  }

  /** '1' where the pixel is still opaque, '0' where its alpha is 0. */
  const alphaMask = (image: RgbaImage): string[] =>
    Array.from({ length: image.height }, (_, y) =>
      Array.from({ length: image.width }, (_, x) =>
        (image.data[(y * image.width + x) * 4 + 3] ?? 0) === 0 ? '0' : '1',
      ).join(''),
    );

  const mask = (rows: readonly string[], tolerance = 16): string[] =>
    alphaMask(clearEdgeGround(imageFrom(rows), { tolerance }));

  describe('clearEdgeGround (technical spec v7 §5.5, L72-10)', () => {
    it('clears edge-connected ground and keeps an enclosed light island', () => {
      expect(mask(['.......', '.#####.', '.#ooo#.', '.#ooo#.', '.#ooo#.', '.#####.', '.......'])).toEqual(
        ['0000000', '0111110', '0111110', '0111110', '0111110', '0111110', '0000000']);
    });
    it('clears ground noise within tolerance that touches the edge fill', () => {
      expect(mask(['.....', '.~~#.', '.~###', '.....'])).toEqual(['00000', '00010', '00111', '00000']);
    });
    it('keeps a light drawing color beyond tolerance even where it touches the edge', () => {
      expect(mask(['....', 'gg..', 'gg..', '....'])).toEqual(['0000', '1100', '1100', '0000']);
    });
    it('is 4-connected, so a diagonal gap in an outline does not leak', () => {
      expect(mask(['.....', '..#..', '.#o#.', '..#..', '.....'])).toEqual(
        ['00000', '00100', '01110', '00100', '00000']);
    });
    it('counts a distance equal to the tolerance as ground', () => {
      expect(mask(['...', '.t.', '...'], 12)).toEqual(['000', '000', '000']);
      expect(mask(['...', '.t.', '...'], 11)).toEqual(['000', '010', '000']);
    });
    it('uses the most frequent border color as the ground, not the corner pixel', () => {
      expect(mask(['.ccc', 'c..c', 'cccc', 'cc.c'])).toEqual(['1000', '0110', '0000', '0010']);
    });
    it('lets the fill cross pixels that are already transparent', () => {
      expect(mask(['.....', '.###.', '.#.#.', '.#x#.', '.....'])).toEqual(
        ['00000', '01110', '01010', '01010', '00000']);
    });
    it('returns a new image and leaves the input and every color channel untouched', () => {
      const input = imageFrom(['...', '.#.', '...']);
      const before = Uint8ClampedArray.from(input.data);
      const out = clearEdgeGround(input, { tolerance: 16 });
      expect(out).not.toBe(input);
      expect(out.data).not.toBe(input.data);
      expect(input.data).toEqual(before);
      expect([out.width, out.height]).toEqual([3, 3]);
      for (let i = 0; i < out.data.length; i += 4) {
        expect(out.data.subarray(i, i + 3)).toEqual(input.data.subarray(i, i + 3));
      }
    });
  });
  ```

- [ ] **Step 5: See it fail.** `pnpm vitest run --project client apps/client/scripts/art-flood-fill.test.ts` → `Failed to load url ./art-flood-fill`, `Test Files  1 failed (1)`.

- [ ] **Step 6: Implement `clearEdgeGround`** in `apps/client/scripts/art-flood-fill.ts` (header: spec v7 §5.5, edge flood-fill only, never a global color key). Exports exactly the three Produces names. Algorithm:
  1. Copy `new Uint8ClampedArray(image.data)`; only alpha is written.
  2. Ground RGB = most frequent among opaque border pixels (top, bottom, left, right; each pixel once); tie → first to reach the max. No opaque border → only alpha-0 is ground.
  3. Ground pixel: alpha 0 or `Math.hypot(dr, dg, db) <= tolerance`.
  4. Seed every ground border pixel on an explicit stack (no recursion, ~140k px) with a `Uint8Array` visited mask; pop → alpha 0 → push unvisited ground 4-neighbours.
  5. Return `{ width, height, data }`; read `data[i] ?? 0`, no `!`.

- [ ] **Step 7: See it pass.** Same command → `Tests  8 passed (8)`.

- [ ] **Step 8: Write the failing declared-sources test** `apps/client/src/ui/asset-files.test.ts`:
  ```ts
  /** Declared art sources — technical spec v7 §5.5 (L72-10), Appendix A global-art-catalog. */
  import { ACTION_CARD_IDS, ATTACK_CARD_IDS, KIT_IDS, SPECIAL_CARD_IDS } from '@card-battle/shared';
  import { describe, expect, it } from 'vitest';

  import { CARD_FILES, KIT_FILES } from './asset-files';

  describe('asset-files (technical spec v7 §5.5, L72-10)', () => {
    it('declares one distinct base drawing per card and kit, never an excluded file', () => {
      const cardIds = [...ATTACK_CARD_IDS, ...ACTION_CARD_IDS, ...SPECIAL_CARD_IDS];
      const sources = [...cardIds.map((id) => CARD_FILES[id].base), ...KIT_IDS.map((id) => KIT_FILES[id])];
      expect(sources).toHaveLength(47);
      expect(new Set(sources).size).toBe(47);
      for (const name of sources) {
        expect(name).not.toMatch(/\(dead\)|^Draw\.png$|_button\.png$/);
        expect(name).not.toMatch(/activated/);
      }
    });
  });
  ```

- [ ] **Step 9: See it fail.** `pnpm vitest run --project client apps/client/src/ui/asset-files.test.ts` → `Failed to load url ./asset-files`, `Test Files  1 failed (1)`.

- [ ] **Step 10: Move the filename maps into `ui/asset-files.ts`.** Move verbatim from `ui/asset-lookup.ts`, each `export`ed: `ResourceKind`, `CardBackKind`, `CardArtFiles`, `KIT_FILES`, `CARD_FILES`, `RESOURCE_FILES`, `BACK_FILES` (keep `as const satisfies Record<…>`). Sole import: `import type { CardId, CardType, KitId } from '@card-battle/shared';`. Header cites v7 §5.5 / v2 §4. In `asset-lookup.ts`: `import { BACK_FILES, CARD_FILES, KIT_FILES, RESOURCE_FILES, type CardBackKind, type ResourceKind } from './asset-files';`, drop the unused `CardType` import, keep everything else incl. `export type { ResourceKind, CardBackKind };`.

- [ ] **Step 11: Run both; old test untouched**
  ```bash
  pnpm vitest run --project client apps/client/src/ui/asset-files.test.ts apps/client/src/ui/asset-lookup.test.ts
  git diff --exit-code -- apps/client/src/ui/asset-lookup.test.ts && echo unchanged
  ```
  Expected: `Tests  13 passed (13)`, then `unchanged`.

- [ ] **Step 12: Write the failing `artFor` test** `apps/client/src/ui/asset-lookup.art-for.test.ts`:
  ```ts
  /** artFor — technical spec v7 §5.5 (L72-10); global-art-catalog, global-art-lot63-gambler-roulette, global-activated-art-guard. */
  import { KIT_IDS, type CardId } from '@card-battle/shared';
  import { describe, expect, it } from 'vitest';

  import { ALL_ART_CARD_IDS, ART_FALLBACK_URL, artFor } from './asset-lookup';

  describe('artFor (technical spec v7 §5.5, L72-10)', () => {
    it('resolves every card id to art/cards/<id>.png', () => {
      expect(ALL_ART_CARD_IDS).toHaveLength(31);
      for (const id of ALL_ART_CARD_IDS) expect(artFor(id)).toMatch(new RegExp(`/art/cards/${id}\\.png$`));
    });
    it('resolves every kit id to art/kits/<id>.png', () => {
      expect(KIT_IDS).toHaveLength(16);
      for (const id of KIT_IDS) expect(artFor(id)).toMatch(new RegExp(`/art/kits/${id}\\.png$`));
    });
    it('includes Roulette and Gambler (L63-01 / L63-03)', () => {
      expect(artFor('roulette')).toMatch(/\/art\/cards\/roulette\.png$/);
      expect(artFor('gambler')).toMatch(/\/art\/kits\/gambler\.png$/);
    });
    it('never resolves dead, Draw, button or activated art', () => {
      const urls = [...ALL_ART_CARD_IDS.map((id) => artFor(id)), ...KIT_IDS.map((id) => artFor(id))];
      expect(urls).toHaveLength(47);
      for (const url of urls) {
        expect(url).not.toMatch(/\(dead\)|Draw\.png|button/);
        expect(url).not.toMatch(/activated/i);
      }
    });
    it('falls back instead of throwing when an id has no drawing', () => {
      const unknown = 'not-a-card' as CardId; // a corrupt id from the wire
      expect(() => artFor(unknown)).not.toThrow();
      expect(artFor(unknown)).toBe(ART_FALLBACK_URL);
      expect(ART_FALLBACK_URL).toMatch(/^data:image\/svg\+xml,/);
    });
  });
  ```

- [ ] **Step 13: See it fail.** `pnpm vitest run --project client apps/client/src/ui/asset-lookup.art-for.test.ts` → `Tests  5 failed (5)`, `artFor is not a function`.

- [ ] **Step 14: Implement `artFor`** in `asset-lookup.ts` (header: v7 §5.5; base drawings only, never throws):
  ```ts
  const artModules = import.meta.glob<string>('../assets/art/{cards,kits}/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
  });

  /** Transparent 1×1 SVG: the last fallback, so a missing drawing never blanks a screen. */
  export const ART_FALLBACK_URL =
    "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='1'%20height='1'%2F%3E";
  ```
  `artFor(id)` order (not pinned by tests): `` artModules[`../assets/art/${isKitId(id) ? 'kits' : 'cards'}/${id}.png`] `` if defined; else in `try` kit → `getCardBackUrl('kit')`, card → `getCard(id)` is `undefined` ? `ART_FALLBACK_URL` : `getCardBackUrl(card.type)`; `catch` → `ART_FALLBACK_URL`.

- [ ] **Step 15: Run it before any art exists.** Same command → `Tests  3 failed | 2 passed (5)`; card ids resolve to verso URLs (`/src/assets/backs/verso%20attack%20card.png`), so real ids fall back instead of throwing.

- [ ] **Step 16: Write `apps/client/scripts/extract-art.ts`.** Header cites v7 §5.5/§4.5: reads `images/` only via `ui/asset-files.ts`; boxes and erase zones drop only frame and printed values (catalogs own every number, designer 2026-09-21). Constants verbatim (measured on all 47 sources: 365×530, 362×526, 361×526, 359×525, 299×416, 287×416):
  ```ts
  /** Fractions of the source width and height. */
  interface Box { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
  /** Closest drawing fill to its ground: 21.5 (#e6e6e6 on kit pink #f6dade); noise ≤ 2.2; Attack Thief residue 13.1. */
  const GROUND_TOLERANCE = 16;
  /** Attack, action and special faces: inside the frame, below the printed header (ends ≤ 0.143). */
  const CARD_BOX: Box = { left: 0.06, top: 0.145, right: 0.94, bottom: 0.96 };
  /** Kit faces: below the printed stat block (rows end at 0.347). */
  const KIT_BOX: Box = { left: 0.06, top: 0.355, right: 0.94, bottom: 0.96 };
  /** Kit fourth stat row (draw yield: x ≤ 0.266, y 0.373–0.445). No kit drawing enters it. */
  const KIT_ERASE: readonly Box[] = [{ left: 0.04, top: 0.355, right: 0.28, bottom: 0.45 }];
  /** Extra printed rows (top right) and the Super Mirror corner badge, measured per source. */
  const CARD_ERASE: Partial<Record<CardId, readonly Box[]>> = {
    imposition: [{ left: 0.7, top: 0.145, right: 0.96, bottom: 0.3 }],
    'points-generator': [{ left: 0.7, top: 0.145, right: 0.96, bottom: 0.26 }],
    'super-absorber': [{ left: 0.7, top: 0.145, right: 0.96, bottom: 0.235 }],
    poison: [{ left: 0.7, top: 0.145, right: 0.96, bottom: 0.235 }],
    roulette: [{ left: 0.58, top: 0.145, right: 0.96, bottom: 0.33 }],
    'super-mirror': [{ left: 0.74, top: 0.8, right: 0.96, bottom: 0.96 }],
  };
  const EXCLUDED_SOURCE = /\(dead\)|^Draw\.png$|_button\.png$/;
  const IMAGES_DIR = new URL('../../../images/', import.meta.url);
  const ART_DIR = new URL('../src/assets/art/', import.meta.url);
  const SHEET_FILE = new URL('../.art-contact-sheet/contact-sheet.png', import.meta.url);
  const SHEET_COLUMNS = 6, TILE_WIDTH = 120, TILE_HEIGHT = 174, GAP = 8, LABEL_HEIGHT = 20;
  ```
  Pipeline (private helpers, no exports):
  - Jobs: cards in `[...ATTACK_CARD_IDS, ...ACTION_CARD_IDS, ...SPECIAL_CARD_IDS]` order (`CARD_FILES[id].base`, `CARD_BOX`, `CARD_ERASE[id] ?? []`), then kits in `KIT_IDS` order (`KIT_FILES[id]`, `KIT_BOX`, `KIT_ERASE`); throw unless 31 + 16 and no source matches `EXCLUDED_SOURCE`.
  - Per job, sequentially: `sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true })` → erase boxes (alpha 0 only, source coords, on a copy) → crop to the box (`left = Math.round(box.left * W)`, `width = Math.round(box.right * W) - left`; same for top/height) → `clearEdgeGround({ tolerance: GROUND_TOLERANCE })` → trim to alpha > 0 bounds (empty → throw `` `${id}: nothing left after ground removal` ``) → `sharp(data, { raw: { width, height, channels: 4 } }).extract(rect).png({ compressionLevel: 9 })` to `ART_DIR/<folder>/<id>.png`; log `` `art/${folder}/${id}.png ${w}×${h} ← ${source}` ``.
  - Sheet: canvas `SHEET_COLUMNS * (2 * TILE_WIDTH + 3 * GAP)` × `rows * (TILE_HEIGHT + LABEL_HEIGHT + 2 * GAP)` (1584 × 1680), background `V7_COLORS.panel`; per cell a before tile (source PNG) and an after tile (extracted PNG over an 8 px `#ffffff`/`#c8c8c8` SVG checkerboard), both `resize(TILE_WIDTH, TILE_HEIGHT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })`, and a 12 px `` `${folder}/${id}` `` label in `V7_COLORS.text`.
  - `main()`: `mkdir(…, { recursive: true })`, jobs, sheet, log `Extracted 31 cards and 16 kits. Contact sheet: apps/client/.art-contact-sheet/contact-sheet.png`; file ends `await main();`.

- [ ] **Step 17: Typecheck and lint**
  ```bash
  pnpm --filter @card-battle/client typecheck
  pnpm exec eslint apps/client/scripts apps/client/src/ui/asset-files.ts apps/client/src/ui/asset-files.test.ts apps/client/src/ui/asset-lookup.ts apps/client/src/ui/asset-lookup.art-for.test.ts eslint.config.mjs
  ```
  Expected: exit 0, no output; no cast or `eslint-disable` beyond the test's `as CardId`.

- [ ] **Step 18: Run the script**
  ```bash
  pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts
  ls apps/client/src/assets/art/cards/*.png | wc -l; ls apps/client/src/assets/art/kits/*.png | wc -l
  git status --short --ignored apps/client/.art-contact-sheet
  ```
  Expected: 47 `art/…` lines (`art/cards/basic-attack.png … ← Basic attack.png` … `art/kits/gambler.png … ← Gambler.png`), the `Extracted…` line, exit 0; `31`, `16`; `!! apps/client/.art-contact-sheet/`.

- [ ] **Step 19: Reproducible** (`<scratch>` = session scratchpad)
  ```bash
  shasum apps/client/src/assets/art/*/*.png > <scratch>/art-1.sha
  pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts > /dev/null
  shasum apps/client/src/assets/art/*/*.png | diff <scratch>/art-1.sha - && echo identical
  ```
  Expected: `identical`.

- [ ] **Step 20: Review the contact sheet (high-risk).** Open `apps/client/.art-contact-sheet/contact-sheet.png`; on every tile check:
  - [ ] No printed number, coin, heart, shield, recycle arrow or sword/gear box (headers; extra rows of Imposition, Points Generator, Super Absorber, Poison, Roulette; kit stat column incl. draw-yield hand).
  - [ ] No frame line (Sentence 299 px and Spy 287 px have offset frames).
  - [ ] Light parts kept: attack blade highlights, Spy/Spy-Thief eye glints, Curse/Gambler/MEGA ATTACK skulls, Ghost body, `#e6e6e6` parts of Assassin/Warrior/Magician, Attack Thief's white card.
  - [ ] Nothing cut: MEGA ATTACK and Super Mirror flame tips, Spy-Thief top coin.
  - [ ] Super Mirror corner badge gone; enclosed old-ground pockets (Untouchable lenses, Cloning stripes) stay. List both for the designer.
  On failure change only `CARD_BOX`, `KIT_BOX`, `KIT_ERASE`, `CARD_ERASE` or `GROUND_TOLERANCE` (and its comment), then rerun Steps 18–19. Keep the sheet for the Lot 72 PR; sign-off pending until L72-21.

- [ ] **Step 21: Run the art tests**
  ```bash
  pnpm vitest run --project client apps/client/src/ui/asset-lookup.art-for.test.ts apps/client/src/ui/asset-lookup.test.ts apps/client/src/ui/asset-files.test.ts apps/client/scripts/art-flood-fill.test.ts
  git diff --exit-code -- apps/client/src/ui/asset-lookup.test.ts && echo unchanged
  ```
  Expected: `Test Files  4 passed (4)`, `Tests  26 passed (26)` (5 + 12 + 1 + 8), `unchanged`.

- [ ] **Step 22: Production build.** `pnpm --filter @card-battle/client build` → `✓ built in …`, no `Missing asset` or glob error.

- [ ] **Step 23: Docker build stage still installs (watch point).** With Docker:
  ```bash
  docker build --target build -t card-battle:l72-10-build .
  docker run --rm -w /app/apps/client card-battle:l72-10-build node -e "import('sharp').then((m) => console.log(m.default.versions.sharp))"
  ```
  Expected: build succeeds, prints `0.35.x`. Without Docker:
  ```bash
  SCR=<scratch>/l72-10-docker-install && rm -rf "$SCR" && mkdir -p "$SCR/apps/client" "$SCR/apps/server" "$SCR/packages/shared"
  cp package.json pnpm-lock.yaml pnpm-workspace.yaml "$SCR/" && cp apps/client/package.json "$SCR/apps/client/" && cp apps/server/package.json "$SCR/apps/server/" && cp packages/shared/package.json "$SCR/packages/shared/"
  printf '\nsupportedArchitectures:\n  os: [current, linux]\n  cpu: [current, x64, arm64]\n  libc: [current, glibc]\n' >> "$SCR/pnpm-workspace.yaml"
  (cd "$SCR" && NODE_ENV=development pnpm install --frozen-lockfile)
  ls "$SCR/node_modules/.pnpm" | grep -E '^@img\+sharp-(libvips-)?linux-(x64|arm64)@'
  ```
  Expected: `Done in …`, no `ERR_PNPM_`; 4 entries (`@img+sharp-linux-{x64,arm64}@0.35.x`, `@img+sharp-libvips-linux-{x64,arm64}@1.3.x`). Note which check ran for the PR.

- [ ] **Step 24: Read the code line by line (high-risk rule).** Confirm: fill seeds only from the border, 4-connected, no recursion; no ground comparison outside the fill; erase zones only set alpha; sources only `CARD_FILES[id].base` / `KIT_FILES[id]`; `artFor` cannot throw; `getCardArtUrl` / `getKitPortraitUrl` untouched.

- [ ] **Step 25: Update `docs/agent/frontend.md`.** Under "Design system (V7 · Lot 72+)" add an **Art (L72-10, spec v7 §5.5)** bullet: `art/{cards,kits}/<id>.png` (31 + 16), resolved only by `artFor(id)` (never activated art, never throws: verso, then `ART_FALLBACK_URL`); generated by the script from the `ui/asset-files.ts` maps, never hand-edited; printed values never authoritative; contact sheet goes on the lot PR; old screens keep `getCardArtUrl` / `getKitPortraitUrl` until L72-21; new card/kit = map entry + PNG + rerun. V2 section: "Art resolution" → maps in `ui/asset-files.ts`; "Data-only kit registration" → "add `KIT_FILES` + PNG (`ui/asset-files.ts`), then rerun `scripts/extract-art.ts` for `assets/art/kits/<kitId>.png`".

- [ ] **Step 26: Update `DESIGN.md`** (§5.8): add "Illustrations": existing drawings only; `art/{cards,kits}/<id>.png` (31 incl. Roulette, 16 incl. Gambler), transparent, trimmed, native resolution; `artFor(id)`; no activated art (Card states, §5.4); enclosed old-ground regions stay (§5.5); no printed value; sign-off pending (L72-21).

- [ ] **Step 27: Flip the backlog.** In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

- [ ] **Step 28: Full gate.** `pnpm verify` → tsc clean (root, shared, server, client), eslint silent, all projects pass, 0 failed, 0 skipped.

- [ ] **Step 29: Commit (this task only)**
  ```bash
  git add apps/client/scripts/art-flood-fill.ts apps/client/scripts/art-flood-fill.test.ts apps/client/scripts/extract-art.ts apps/client/src/ui/asset-files.ts apps/client/src/ui/asset-files.test.ts apps/client/src/ui/asset-lookup.ts apps/client/src/ui/asset-lookup.art-for.test.ts apps/client/src/assets/art apps/client/tsconfig.json apps/client/package.json pnpm-lock.yaml eslint.config.mjs .gitignore docs/agent/frontend.md DESIGN.md docs/backlog_v7.md
  git commit -m "feat(ui): extract card and kit art (L72-10)" \
    -m "Ground removal is edge flood-fill only (spec v7 §5.5) at tolerance 16: the closest drawing fill sits 21.5 from its ground. Crop boxes and erase zones drop the frame, printed rows and the Super Mirror badge; values come from the catalogs." \
    -m "sharp loads from its prebuilt @img binaries, so onlyBuiltDependencies is unchanged (its install script, if any, stays blocked). tsx matches the server's 4.23.1."
  git status --short && git show --stat --format= HEAD -- apps/client/src/assets/art | tail -1
  ```
  If Step 2 added sharp to `onlyBuiltDependencies`, also stage `pnpm-workspace.yaml` and say so in the last paragraph instead. Expected: status prints nothing (`.art-contact-sheet` stays ignored), then `47 files changed, …`; no AI attribution.

**Decisions:**
- asset-lookup.ts and its test live in apps/client/src/ui/ (after the L72-04 move), not design/ as the brief's Files line says. Step 1 checks the move before anything else.
- The filename maps move verbatim with `as const satisfies Record<…>` (parity Keep line). Their inferred types are readonly literal objects, which are structurally assignable to the contract's `Readonly<Record<…>>` types.
- Two test files the contract does not name: ui/asset-lookup.art-for.test.ts keeps asset-lookup.test.ts byte-identical with its §12.1 classification, and ui/asset-files.test.ts checks that declared sources are never (dead), Draw.png, *_button.png or activated files.
- extract-art also sets alpha 0 in measured erase zones (the kit draw-yield row, and the extra printed rows of imposition, points-generator, super-absorber, poison and roulette), then trims to opaque bounds. A plain rectangle crop would cut drawings. Ground removal stays edge flood-fill only.
- The erase zones also remove Super Mirror's printed bottom-right badge as a baked mark. The designer must confirm this on the contact sheet (L72-21).
- The extraction constants are not in the spec. GROUND_TOLERANCE 16 (closest drawing fill 21.5 from its ground, noise ≤ 2.2), CARD_BOX, KIT_BOX and the erase zones were measured on all 47 sources. The 530-px card crops have a 1 px margin, so the contact sheet is the arbiter.
- Flood-fill ground = the most frequent opaque border RGB (on a tie, the first color to reach the max), never the corner pixel. A pixel is ground when its alpha is 0 or its Euclidean RGB distance is ≤ tolerance. 4-connected; only alpha is ever written.
- artFor fallback order, which the tests do not fully pin: base drawing, then the family verso (getCard(id).type) or the kit verso, then ART_FALLBACK_URL (inline transparent 1×1 SVG). An unknown card id goes straight to ART_FALLBACK_URL.
- The contact sheet imports V7_COLORS from ui/palette.ts (L72-05) for its background and labels. This is a script dependency the contract notes do not list.
- CropRect is exported from art-flood-fill.ts as the contract requires, but nothing in that module consumes it. Only extract-art.ts uses it, as the pixel region passed to sharp extract().
- sharp (critic fix): if `pnpm ignored-builds` lists it but it loads from its prebuilt @img binaries, onlyBuiltDependencies stays unchanged and the build is not approved. sharp is added there only if loading fails; the commit body states this conditionally.
- Docker acceptance: run `docker build --target build` when Docker exists. Otherwise run a scratch `pnpm install --frozen-lockfile` that mirrors the build stage, with supportedArchitectures set to linux x64/arm64 glibc. The PR records which check ran.
- DESIGN.md gets an Illustrations section, following the contract's per-task cadence for ui/ changes, even though the brief's Files list omits it.
- tsx is pinned exactly to 4.23.1, matching apps/server, not to ^4.23.1.

---

### Task L72-11: Rebuild cost glyphs and effect copy in ui/

**Goal:** V7 shared text pieces (cost amount = icon + number + spoken text; effect prose with inline icons; card effect copy = Cost row, effect, Upgrade block) for L72-12, L72-15, L72-17, L74, L76. Spec: technical spec v7 §4.2, §6.6.1, §7.1, §10.5; Appendix A `global-card-effect-copy-inline-icons`, `global-resource-captions`. Catalog text does not change.

**Files:**
- Create: `apps/client/src/ui/card/glyph-amount.ts`, `apps/client/src/ui/card/cost-amount.tsx`, `apps/client/src/ui/text/effect-text-with-icons.tsx`, `apps/client/src/ui/text/card-effect-copy.tsx`, `apps/client/src/ui/text/text.gallery.tsx`, `apps/client/src/test/glyph-queries.ts` (test support, not shipped)
- Test: `apps/client/src/ui/card/glyph-amount.test.ts` (node), `apps/client/src/ui/card/cost-amount.test.tsx`, `apps/client/src/ui/text/effect-text-with-icons.test.tsx`, `apps/client/src/ui/text/card-effect-copy.test.tsx`, `apps/client/src/ui/text/text.gallery.test.tsx` (happy-dom)
- Modify: `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`
- Untouched (checked in Step 21): `apps/client/src/design/components/{card-effect-copy,cost-display,effect-text-icons}.tsx`, `apps/client/src/design/components/{card-effect-copy,cost-display}.test.ts`

**Interfaces** (paths under `apps/client/src/`):
- Consumes:
  - `ui/structured-cost.ts` (L72-04): `type StructuredCost`, `type CostSign`, `costSignGlyph(signed: CostSign | undefined): string`, `spokenCost(cost: StructuredCost, multiplier: number | undefined, signed?: CostSign): string`, `structuredPlayCost(card: Card, isUpgraded: boolean): StructuredCost | null`
  - `ui/effect-text-tokens.ts` (L72-04): `interface EffectResourceSpan { start; end; amount; kind: ResourceKind; insteadOf }`, `tokenizeEffectResources(text: string): EffectResourceSpan[]`; `ui/asset-lookup.ts`: `type ResourceKind` (`'life' | 'point' | 'shield' | 'upgradePoint'`)
  - `ui/icons/icon.tsx` (L72-07): `Icon(props: { name: IconName; size?: number; label?: string; className?: string }): ReactElement` (aria-hidden without `label`); `ui/icons/icon-names.ts`: `type IconName`
  - `test/render.tsx` (L72-06): `renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult`; `dev/gallery-registry.ts` (L72-08): `interface GallerySection { id; title; entries: readonly GalleryEntry[] }`
  - `ui/tokens.css` (L72-05): `text-v7-text`, `text-v7-text-2`, `text-v7-body`, `font-v7-body`, `bg-v7-panel`, `bg-v7-panel-2`, `rounded-v7-chrome`, `rounded-v7-chrome-sm`; `@card-battle/shared`: `type Card`, `SHARED_CARD_CATALOG`, `SPECIAL_CARD_CATALOG`
- Produces:
  - `ui/card/glyph-amount.ts`: `export type GlyphAmount = StructuredCost | { readonly kind: 'shield'; readonly amount: number }`; `export function glyphAmountIcon(amount: GlyphAmount): IconName`; `export function glyphAmountFromResource(kind: ResourceKind, amount: number): GlyphAmount`; `export function spokenGlyphAmount(amount: GlyphAmount, options?: { readonly multiplier?: number; readonly signed?: CostSign }): string`
  - `ui/card/cost-amount.tsx`: `export interface CostAmountProps { amount: GlyphAmount; signed?: CostSign; multiplier?: number; title?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }`; `export function CostAmount(props: CostAmountProps): ReactElement`
  - `ui/text/effect-text-with-icons.tsx`: `export interface EffectTextWithIconsProps { text: string; iconSize?: 'sm' | 'md' }`; `export function EffectTextWithIcons(props: EffectTextWithIconsProps): ReactElement`
  - `ui/text/card-effect-copy.tsx`: `export interface CardEffectCopyProps { card: Card; isUpgraded: boolean }`; `export function CardEffectCopy(props: CardEffectCopyProps): ReactElement`
  - `ui/text/text.gallery.tsx`: `export const gallery: GallerySection` (id `'text'`)
  - `test/glyph-queries.ts`: `visibleText(element: Element): string`, `spokenTexts(element: Element): string[]`, `glyphRoots(element: Element): HTMLElement[]`
  - DOM hooks: `data-glyph-icon={IconName}` on every CostAmount root; `data-effect-part="cost" | "effect" | "upgrade"` on CardEffectCopy rows

Commands run from the repo root. Each test file starts with a header comment citing technical spec v7 §6.6.1 and L72-11 (`.test.tsx`: first line `// @vitest-environment happy-dom`) and imports from the Interfaces modules plus `screen` / `within` from `@testing-library/react`. Test files that build amounts define `const g = (kind: GlyphAmount['kind'], amount: number): GlyphAmount => ({ kind, amount });`.

---

- [ ] **Step 1: Check prerequisites and mark In progress**
  ```bash
  ls apps/client/src/ui/{structured-cost.ts,effect-text-tokens.ts,asset-lookup.ts,tokens.css} \
     apps/client/src/ui/icons/{icon.tsx,icon-names.ts} apps/client/src/test/render.tsx \
     apps/client/src/dev/gallery-registry.ts apps/client/src/ui/primitives/primitives.gallery.tsx DESIGN.md
  grep -nE '^\| L72-0(4|5|6|7|8) ' docs/backlog_v7.md | grep -c '| Done |'
  pnpm eslint apps/client/src/ui/primitives/primitives.gallery.tsx
  ```
  Pass: no `No such file`; count `5`; ESLint silent (L72-08's `*.gallery.tsx` override works). Then set the L72-11 row's Status to `In progress` in `docs/backlog_v7.md` (lands with the task commit).

- [ ] **Step 2: Write the failing glyph model test** — `ui/card/glyph-amount.test.ts`:
  ```ts
  type Row = readonly [GlyphAmount['kind'], number, string, Parameters<typeof spokenGlyphAmount>[1]?];
  function expectSpoken(rows: readonly Row[]): void {
    for (const [kind, n, spoken, options] of rows) { expect(spokenGlyphAmount(g(kind, n), options)).toBe(spoken); }
  }
  describe('glyph-amount (L72-11)', () => {
    it('maps every amount kind to its resource icon', () => {
      const kinds = ['points', 'pointsPerLife', 'lives', 'upgradePoint', 'shield'] as const;
      expect(kinds.map((k) => glyphAmountIcon(g(k, 3)))).toEqual(['point', 'point', 'life', 'upgrade', 'shield']);
    });
    it('turns tokenizer resource kinds into glyph amounts', () => {
      expect((['point', 'life', 'upgradePoint', 'shield'] as const).map((k) => glyphAmountFromResource(k, 4)))
        .toEqual([g('points', 4), g('lives', 4), g('upgradePoint', 4), g('shield', 4)]);
    });
    it('speaks structured costs exactly as spokenCost does', () => {
      const costs = ([['points', 1], ['points', 3], ['lives', 1], ['lives', 4], ['pointsPerLife', 3], ['pointsPerLife', 2],
        ['upgradePoint', 1], ['upgradePoint', 2]] as const).map(([kind, amount]): StructuredCost => ({ kind, amount }));
      for (const cost of costs) {
        expect(spokenGlyphAmount(cost)).toBe(spokenCost(cost, undefined));
        expect(spokenGlyphAmount(cost, { signed: 'cost' })).toBe(spokenCost(cost, undefined, 'cost'));
        expect(spokenGlyphAmount(cost, { signed: 'gain' })).toBe(spokenCost(cost, undefined, 'gain'));
        expect(spokenGlyphAmount(cost, { multiplier: 2 })).toBe(spokenCost(cost, 2));
      }
    });
    it("pins today's spoken strings", () => {
      expectSpoken([['points', 3, '3 pts'], ['points', 1, '1 pt'], ['lives', 4, '4 lives'], ['lives', 1, '1 life'],
        ['upgradePoint', 2, '2 upgrade points'], ['pointsPerLife', 3, '3 pts/life'], ['pointsPerLife', 2, '2 pts/life'],
        ['points', 10, 'minus 10 pts', { signed: 'cost' }], ['points', 4, '2×4 pts', { multiplier: 2 }]]);
    });
    it('speaks shield amounts as shield points, singular and plural', () => {
      expectSpoken([['shield', 4, '4 shield points'], ['shield', 1, '1 shield point'],
        ['shield', 7, 'plus 7 shield points', { signed: 'gain' }], ['shield', 1, 'minus 1 shield point', { signed: 'cost' }],
        ['shield', 4, '2×4 shield points', { multiplier: 2 }], ['shield', 4, '4 shield points', { multiplier: 1 }]]);
    });
  });
  ```

- [ ] **Step 3: Confirm it fails** — `pnpm vitest run --project client apps/client/src/ui/card/glyph-amount.test.ts` → FAIL (`Failed to resolve import "./glyph-amount"`, `Test Files  1 failed (1)`).

- [ ] **Step 4: Implement `ui/card/glyph-amount.ts`** — header cites technical spec v7 §6.6.1, L51-12. Private icon `Record`; exhaustive `switch` for `glyphAmountFromResource`. `spokenGlyphAmount(amount, options = {})`: non-shield → `spokenCost(amount, options.multiplier, options.signed)`; shield → `N shield point(s)` wrapped as spokenCost wraps (`minus `/`plus `, then `${m}×` outside unless m is undefined or 1).

- [ ] **Step 5: Confirm it passes** — same command → PASS, `Tests  5 passed (5)`.

- [ ] **Step 6: Add `test/glyph-queries.ts`** (tests only) — `visibleText`: clone, drop every `.sr-only` node, return `textContent` (throw if the clone is not an `Element`); `spokenTexts`: `.sr-only` texts in document order; `glyphRoots`: `[data-glyph-icon]` elements as an array.

- [ ] **Step 7: Write the failing CostAmount test** — `ui/card/cost-amount.test.tsx`; `renderAmount(el)` returns `glyphRoots(renderUi(el).container)[0]`, throwing `'CostAmount root missing'` if absent.
  ```tsx
  describe('CostAmount (L72-11)', () => {
    it.each([['4 lives', 'lives', 4, 'life'], ['3 pts', 'points', 3, 'point'], ['2 upgrade points', 'upgradePoint', 2, 'upgrade'],
      ['4 shield points', 'shield', 4, 'shield']] as const)('renders %s as the number plus one hidden icon', (spoken, kind, n, icon) => {
      const root = renderAmount(<CostAmount amount={g(kind, n)} />);
      expect([spokenTexts(root), visibleText(root), root.getAttribute('data-glyph-icon'), root.getAttribute('title')])
        .toEqual([[spoken], String(n), icon, spoken]);
      const svgs = root.querySelectorAll('svg');
      expect(svgs).toHaveLength(1);
      for (const svg of svgs) { expect(svg.closest('[aria-hidden="true"]')).not.toBeNull(); }
    });
    it('renders a per-life rate as number, point icon, slash and life icon', () => {
      const root = renderAmount(<CostAmount amount={g('pointsPerLife', 3)} />);
      expect([spokenTexts(root), visibleText(root), root.getAttribute('data-glyph-icon')]).toEqual([['3 pts/life'], '3/', 'point']);
      expect(root.querySelectorAll('svg')).toHaveLength(2);
    });
    it('prefixes the sign glyph and the multiplier, and speaks them', () => {
      for (const [el, visible, spoken] of [
        [<CostAmount amount={g('upgradePoint', 1)} signed="cost" />, '−1', 'minus 1 upgrade point'],
        [<CostAmount amount={g('points', 7)} signed="gain" />, '+7', 'plus 7 pts'],
        [<CostAmount amount={g('points', 4)} multiplier={2} />, '2×4', '2×4 pts'],
      ] as const) {
        const root = renderAmount(el);
        expect([visibleText(root), spokenTexts(root)]).toEqual([visible, [spoken]]);
      }
    });
    it('defaults the tooltip to the spoken amount and accepts an override', () => {
      expect(renderAmount(<CostAmount amount={g('points', 2)} />).getAttribute('title')).toBe('2 pts');
      expect(renderAmount(<CostAmount amount={g('points', 2)} title="Buy price" />).getAttribute('title')).toBe('Buy price');
    });
    it('renders no title with title={null} and keeps the spoken amount (L59-01)', () => {
      const root = renderAmount(<CostAmount amount={g('points', 2)} title={null} />);
      expect([root.hasAttribute('title'), spokenTexts(root)]).toEqual([false, ['2 pts']]);
    });
    it('leaves a named parent button its own name and tooltip (L59-01)', () => {
      renderUi(<button type="button" aria-label="Draw" title="Draw"><CostAmount amount={g('points', 1)} signed="gain" title={null} /></button>);
      expect(screen.getByRole('button', { name: 'Draw' }).querySelectorAll('[title]')).toHaveLength(0);
    });
    it('names an unlabeled parent button with the spoken amount only', () => {
      renderUi(<button type="button"><CostAmount amount={g('lives', 2)} signed="cost" /></button>);
      expect(screen.getByRole('button', { name: 'minus 2 lives' })).toBeInstanceOf(HTMLButtonElement);
    });
  });
  ```

- [ ] **Step 8: Confirm it fails** — `pnpm vitest run --project client apps/client/src/ui/card/cost-amount.test.tsx` → FAIL (`./cost-amount` unresolved, `Test Files  1 failed (1)`).

- [ ] **Step 9: Implement `ui/card/cost-amount.tsx`** — header cites technical spec v7 §6.6.1, L59-01, L39-04. Defaults `size = 'sm'`, `className = ''`; `tooltip = title === undefined ? spoken : (title ?? undefined)`. Root `<span data-glyph-icon title className>` (inline-flex, nowrap, tabular-nums) = sr-only spoken span + one `aria-hidden="true"` span holding `${m}×`, `{costSignGlyph(signed)}{amount.amount}`, `<Icon size={ICON_PX[size]}>` (private `ICON_PX = { sm: 14, md: 16, lg: 20 }`), and for `pointsPerLife` `/` + `life` Icon. No font family/size, V2 class or `<img>`.

- [ ] **Step 10: Confirm it passes** — same command → PASS, `Tests  10 passed (10)`.

- [ ] **Step 11: Write the failing EffectTextWithIcons test** — `ui/text/effect-text-with-icons.test.tsx`; `S = SHARED_CARD_CATALOG`, `X = SPECIAL_CARD_CATALOG`.
  ```tsx
  function expectGlyphs(text: string, visible: string, spoken: string[], icons: string[]): HTMLElement {
    const root = renderUi(<p><EffectTextWithIcons text={text} /></p>).container;
    expect(visibleText(root)).toBe(visible);
    expect(spokenTexts(root)).toEqual(spoken);
    expect(glyphRoots(root).map((node) => node.getAttribute('data-glyph-icon'))).toEqual(icons);
    return root;
  }
  describe('EffectTextWithIcons (L72-11)', () => {
    it('renders "4 lives" and "3 points" as icon + number with spoken text', () => {
      expectGlyphs(S.regeneration.effect, 'Buy up to 4 at 3 each.', ['4 lives', '3 pts'], ['life', 'point']);
    });
    it('renders "2 upgrade points" as its own glyph, matched before points', () => {
      expectGlyphs(X.cloning.upgradeAdds, 'Also gain 10, 2, and 4 (life cap applies).',
        ['10 pts', '2 upgrade points', '4 lives'], ['point', 'upgrade', 'life']);
    });
    it('renders "4 shield points" with a spoken shield amount', () => {
      expectGlyphs(S.shield.effect, 'Gain 4, or refill your shield to 4 if one is already up. Only one shield at a time.',
        ['4 shield points'], ['shield']);
      expect(screen.getByTitle('4 shield points')).toBeInstanceOf(HTMLElement);
    });
    it('keeps "instead of " visible before the previous resource glyph', () => {
      expectGlyphs(S.regeneration.upgradeAdds, 'Lives cost 2 each instead of 3.', ['2 pts', '3 pts'], ['point', 'point']);
      expect(screen.getByText('instead of').closest('[aria-hidden="true"]')).toBeNull();
    });
    it('leaves damage, turn counts and card lives as plain prose', () => {
      for (const text of [S['basic-attack'].upgradeAdds, X.block.upgradeAdds, X.roulette.effect, X['mega-attack'].effect]) {
        expect(expectGlyphs(text, text, [], []).querySelectorAll('svg')).toHaveLength(0);
      }
    });
  });
  ```

- [ ] **Step 12: Confirm it fails** — `pnpm vitest run --project client apps/client/src/ui/text/effect-text-with-icons.test.tsx` → FAIL (`./effect-text-with-icons` unresolved, `Test Files  1 failed (1)`).

- [ ] **Step 13: Implement `ui/text/effect-text-with-icons.tsx`** — default `iconSize = 'md'`; header cites technical spec v7 §6.6.1, L51-12. Walk `tokenizeEffectResources(text)` with a cursor: prose slice, then a nowrap span = `instead of ` (if `insteadOf`) + `<CostAmount amount={glyphAmountFromResource(span.kind, span.amount)} size={iconSize} />` (no `signed`); tail last.

- [ ] **Step 14: Confirm it passes** — same command → PASS, `Tests  5 passed (5)`.

- [ ] **Step 15: Write the failing CardEffectCopy test** — `ui/text/card-effect-copy.test.tsx`. Helpers: `renderCopy(card, isUpgraded)` → container; `maybe(root, name)` = `querySelector('[data-effect-part="${name}"]')`; `part` = `maybe` that throws `missing ${name} part`; `spokenIn(root, name)` = `spokenTexts(part(root, name))`. `basic = SHARED_CARD_CATALOG['basic-attack']`, `regen = SHARED_CARD_CATALOG.regeneration`.
  ```tsx
  describe('CardEffectCopy (L72-11)', () => {
    it('shows Cost, the base effect and the Upgrade block for a base card', () => {
      const root = renderCopy(basic, false);
      expect(within(part(root, 'cost')).getByText('Cost')).toBeInstanceOf(HTMLElement);
      expect(spokenIn(root, 'cost')).toEqual(['1 pt']);
      expect(part(root, 'effect').textContent).toBe('Deal 1 damage to an opponent.');
      expect(visibleText(part(root, 'upgrade'))).toBe('Upgrade — Deal 3 damage instead of 1.');
      expect(screen.queryByText(/Cost:/)).toBeNull();
      expect(screen.queryByText('Choose Use, Upgrade, or Sell.')).toBeNull();
    });
    it('shows upgradeEffect alone for an upgraded card', () => {
      const root = renderCopy(basic, true);
      expect(spokenIn(root, 'cost')).toEqual(['1 pt']);
      expect(part(root, 'effect').textContent).toBe('Deal 3 damage to an opponent.');
      expect([maybe(root, 'upgrade'), screen.queryByText('Upgrade'), screen.queryByText(basic.upgradeAdds)]).toEqual([null, null, null]);
    });
    it('shows Regeneration per-life rates: 3 points per life base, 2 upgraded', () => {
      const base = renderCopy(regen, false);
      expect(spokenIn(base, 'cost')).toEqual(['3 pts/life']);
      expect(glyphRoots(part(base, 'cost'))[0]?.querySelectorAll('svg')).toHaveLength(2);
      expect(spokenIn(base, 'effect')).toEqual(['4 lives', '3 pts']);
      expect(visibleText(part(base, 'upgrade'))).toBe('Upgrade — Lives cost 2 each instead of 3.');
      expect(spokenIn(base, 'upgrade')).toEqual(['2 pts', '3 pts']);
      const up = renderCopy(regen, true);
      expect(spokenIn(up, 'cost')).toEqual(['2 pts/life']);
      expect(visibleText(part(up, 'effect'))).toBe('Buy up to 4 at 2 each.');
      expect(spokenIn(up, 'effect')).toEqual(['4 lives', '2 pts']);
      expect(maybe(up, 'upgrade')).toBeNull();
    });
    it('shows the Tax play cost as 1 life', () => {
      const cost = part(renderCopy(SHARED_CARD_CATALOG.tax, false), 'cost');
      expect(spokenTexts(cost)).toEqual(['1 life']);
      expect(glyphRoots(cost).map((node) => node.getAttribute('data-glyph-icon'))).toEqual(['life']);
    });
    it('speaks "4 shield points" in the Shield effect', () => {
      const root = renderCopy(SHARED_CARD_CATALOG.shield, false);
      expect([spokenIn(root, 'cost'), spokenIn(root, 'effect')]).toEqual([['7 pts'], ['4 shield points']]);
    });
    it('omits the Cost row when the card has no play cost', () => {
      const root = renderCopy({ ...basic, cost: {} }, false);
      expect([maybe(root, 'cost'), screen.queryByText('Cost')]).toEqual([null, null]);
      expect(part(root, 'effect').textContent).toBe(basic.effect);
      expect(maybe(root, 'upgrade')).not.toBeNull();
    });
    it('omits an empty effect paragraph', () => {
      const base = renderCopy({ ...basic, effect: '' }, false);
      expect([maybe(base, 'effect'), maybe(base, 'cost') !== null, maybe(base, 'upgrade') !== null]).toEqual([null, true, true]);
      const up = renderCopy({ ...basic, upgradeEffect: '' }, true);
      expect([maybe(up, 'effect'), maybe(up, 'upgrade')]).toEqual([null, null]);
    });
  });
  ```

- [ ] **Step 16: Confirm it fails** — `pnpm vitest run --project client apps/client/src/ui/text/card-effect-copy.test.tsx` → FAIL (`./card-effect-copy` unresolved, `Test Files  1 failed (1)`).

- [ ] **Step 17: Implement `ui/text/card-effect-copy.tsx`** — header cites technical spec v7 §6.6.1, L51-05, L51-12, rules spec §3. `playCost = structuredPlayCost(card, isUpgraded)`; `effect = isUpgraded ? card.upgradeEffect : card.effect`. Wrapper `space-y-2 font-v7-body text-v7-body text-v7-text`: cost row (bold `Cost` + `<CostAmount size="md">`), effect row, then for base cards the upgrade row on `rounded-v7-chrome-sm bg-v7-panel-2` = bold `Upgrade` + `<span className="text-v7-text-2"> — </span>` + `card.upgradeAdds`. V7 utilities only.

- [ ] **Step 18: Confirm it passes** — same command → PASS, `Tests  7 passed (7)`.

- [ ] **Step 19: Write the failing gallery smoke test** — `ui/text/text.gallery.test.tsx`, in `describe('text gallery section (L72-11)')`:
  ```tsx
  it('registers the text section and renders a cost glyph in every entry', () => {
    expect(gallery.id).toBe('text');
    const ids = gallery.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['cost-amount', 'effect-text', 'card-effect-copy']);
    for (const entry of gallery.entries) {
      const { container, unmount } = renderUi(<>{entry.render()}</>);
      expect(container.querySelector('[data-glyph-icon]')).not.toBeNull();
      unmount();
    }
  });
  ```
  `pnpm vitest run --project client apps/client/src/ui/text/text.gallery.test.tsx` → FAIL (`./text.gallery` unresolved, `Test Files  1 failed (1)`).

- [ ] **Step 20: Implement `ui/text/text.gallery.tsx`** — `{ id: 'text', title: 'Text and cost glyphs', entries }`, each entry in `max-w-sm rounded-v7-chrome bg-v7-panel p-3 text-v7-text`, catalog strings read not copied, no registry edit. `cost-amount`: every kind, 3 pts/life, `signed` cost and gain, `multiplier={2}`, `size="lg"`. `effect-text`: Regeneration effect + upgradeAdds, Cloning upgradeAdds, Shield effect, Block upgradeAdds. `card-effect-copy`: Regeneration base + upgraded, Basic attack, Tax. Rerun Step 19 → PASS, `Tests  1 passed (1)`.

- [ ] **Step 21: Confirm V2 components and source-text tests are untouched**
  ```bash
  git diff --exit-code -- apps/client/src/design
  pnpm vitest run --project client apps/client/src/design/components/card-effect-copy.test.ts apps/client/src/design/components/cost-display.test.ts
  ```
  Pass: no diff (exit 0); `Test Files  2 passed (2)`.

- [ ] **Step 22: Lint and typecheck**
  ```bash
  pnpm eslint apps/client/src/ui/card apps/client/src/ui/text apps/client/src/test/glyph-queries.ts
  pnpm --filter @card-battle/client typecheck
  ```
  Pass: both silent (exit 0); no `react-refresh/only-export-components` on `text.gallery.tsx`.

- [ ] **Step 23: Update DESIGN.md** — section "Cost glyphs and effect copy (L72-11)": icon map; CostAmount anatomy (`{m}×`, `−`/`+`, number, icon; per-life `N [point]/[life]`; sr-only spoken text); `title={null}` (L59-01); `size` = icon px 14/16/20, font from parent; EffectTextWithIcons rules (no sign, `instead of` visible, damage / turns / card lives stay prose); CardEffectCopy order and grounds (`--panel`, Upgrade on `--panel-2`, dash `--text-2`); `data-*` hooks; gallery `text`.

- [ ] **Step 24: Update docs/agent/frontend.md** — under "Design system (V7 · Lot 72+)" add "Cost glyphs and effect copy (L72-11)": the four ui/ files, `title={null}` (L59-01), `signed` / `multiplier`, shield now spoken (V2 spoke only the number), V2 `design/components` versions stay until L75/L76. End the V2 `CostDisplay (L39-04)` bullet with "V7 equivalent: `ui/card/cost-amount.tsx` (L72-11)."

- [ ] **Step 25: Update the backlog** — In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress. Check: `grep -n '^| L72-11 ' docs/backlog_v7.md` ends with `| Done |`.

- [ ] **Step 26: Run the gate** — `pnpm verify` → `tsc` clean (root + three packages), `eslint .` clean, `vitest run` `0 failed`, no skips; new files add `5 + 10 + 5 + 7 + 1 = 28` passing tests.

- [ ] **Step 27: Commit**
  ```bash
  git add apps/client/src/ui/card/glyph-amount.ts apps/client/src/ui/card/glyph-amount.test.ts \
    apps/client/src/ui/card/cost-amount.tsx apps/client/src/ui/card/cost-amount.test.tsx \
    apps/client/src/ui/text/effect-text-with-icons.tsx apps/client/src/ui/text/effect-text-with-icons.test.tsx \
    apps/client/src/ui/text/card-effect-copy.tsx apps/client/src/ui/text/card-effect-copy.test.tsx \
    apps/client/src/ui/text/text.gallery.tsx apps/client/src/ui/text/text.gallery.test.tsx \
    apps/client/src/test/glyph-queries.ts DESIGN.md docs/agent/frontend.md docs/backlog_v7.md
  git commit -m "feat(ui): add cost glyphs and effect copy (L72-11)" \
    -m "Shield phrases now speak 'N shield points'; the V2 inline glyph spoke only the number. Structured costs keep spokenCost's 'N pts' wording."
  git status --short
  ```
  Pass: one commit, no AI attribution; `git status --short` shows only the pre-existing untracked `.claude/`.

**Decisions:**
- Run L72-11 after L72-08. The brief lists only L72-06, but the task also imports from L72-04 (structured-cost, effect-text-tokens, ResourceKind), L72-05 (v7 utilities, DESIGN.md), L72-07 (Icon, IconName) and L72-08 (GallerySection, *.gallery.tsx lint override). Step 1 checks that all five are Done.
- Structured costs use spokenCost's short wording ('3 pts', '1 pt', '3 pts/life', '2 pts/life'), not '3 points'. In the acceptance line, '3 points' is the catalog prose that gets an icon, and its spoken text is '3 pts'. The tests pin the real strings.
- A pointsPerLife amount renders as number + point icon + '/' + life icon (two svgs), as the V2 CostDisplay does. glyphAmountIcon still returns 'point', the primary icon used for data-glyph-icon.
- Shield spoken text is wrapped the same way spokenCost wraps: the 'minus ' or 'plus ' prefix first, then '{m}×' outside it unless the multiplier is undefined or 1. The contract pins only the base text ('1 shield point' / 'N shield points').
- Two DOM hooks are added beyond the contract: data-glyph-icon={glyphAmountIcon(amount)} on every CostAmount root, and data-effect-part='cost'|'effect'|'upgrade' on CardEffectCopy rows. L72-12, L72-15 and L72-17 tests may reuse them.
- New test-only module apps/client/src/test/glyph-queries.ts (visibleText, spokenTexts, glyphRoots), beside the L72-06 render harness. Shipped code never imports it.
- Sizes the contract leaves open: CostAmount size sets icon px to sm 14 / md 16 / lg 20, default 'sm' (V2 CostDisplay used 14). EffectTextWithIcons iconSize defaults to 'md' (V2 inline used 16). CostAmount sets no font family or font size and inherits them from its parent.
- The CostAmount gallery entries go in ui/text/text.gallery.tsx (section 'text'), because ui/card/card.gallery.tsx belongs to L72-12. A gallery smoke test is added.
- `export const gallery` in a .tsx file depends on L72-08's react-refresh override (allowExportNames ['gallery'] or a *.gallery.tsx files block). If Step 1's ESLint check fails, fix it in L72-08, not in this task.
- Intended change from V2: shield phrases now carry an sr-only spoken amount and a default title ('4 shield points'), where the V2 inline glyph spoke only the number. This is recorded in the commit body and in frontend.md.
- The V2 design/components CostDisplay, EffectTextWithIcons and CardEffectCopy and their source-text tests stay untouched. They keep serving the old screens until L75/L76 retire their consumers.
- Test code is compacted: row tables, a local g(kind, amount) factory and tuples compared in one toEqual. Every original assertion and value is kept. The 'instead of' test also gains an icon assertion (['point', 'point']). Counts stay 5/10/5/7/1 = 28.
- The section is about 24k characters, over the ~14k target. The remaining length is the full test code, which the brief requires to be kept without weakening any assertion.

---

### Task L72-12: Build the holo Card component

Spec: technical spec v7 §5.3, §5.4, §5.5, §6.6.5, §8.2, §8.3. Parity (Appendix A): `global-card-face`, `global-activated-art-guard`, `global-art-lot63-gambler-roulette`, `active-persistent-thumbs`, `sentence-chips`.

**Files:**
- Create: `apps/client/src/ui/card/card-face.ts`, `apps/client/src/ui/card/card.tsx`, `apps/client/src/ui/card/card.gallery.tsx`
- Test: `apps/client/src/ui/card/card-face.test.ts` (node), `apps/client/src/ui/card/card.test.tsx` (happy-dom), `apps/client/src/ui/card/card.gallery.test.tsx` (happy-dom)
- Modify: `apps/client/src/ui/tokens.css` (sheen), `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`
- Untouched: `apps/client/src/design/components/card.tsx` and its tests (V2 screens keep it).

**Interfaces:**

Consumes (under `apps/client/src/`):
- `ui/asset-lookup.ts` (L72-04, L72-10): `artFor(id: CardId | KitId): string`, `ALL_ART_CARD_IDS: readonly CardId[]`, `CARDS_WITH_ACTIVATED_ART`
- `ui/structured-cost.ts` (L72-04): `type StructuredCost`, `structuredPlayCost(card: Card, isUpgraded: boolean): StructuredCost | null`
- `ui/card/cost-amount.tsx` (L72-11): `CostAmount(props: CostAmountProps): ReactElement`, `CostAmountProps { amount: GlyphAmount; signed?: CostSign; multiplier?: number; title?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }`
- `ui/icons/icon.tsx` (L72-07): `Icon(props: IconProps): ReactElement`, `IconProps { name: IconName; size?: number; label?: string; className?: string }`
- L72-05: `usePrefersReducedMotion(): boolean` (`ui/motion/use-prefers-reduced-motion.ts`), `V7_COLORS` (`ui/palette.ts`), `WCAG_AA_TEXT`, `contrastRatio(foreground: string, background: string): number` (`ui/contrast.ts`)
- `test/render.tsx` (L72-06): `renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult`, options include `{ reducedMotion?: boolean }`
- `dev/gallery-registry.ts` (L72-08): `GallerySection { readonly id: string; readonly title: string; readonly entries: readonly GalleryEntry[] }`
- `@card-battle/shared`: `getCard`, `listedAttackDamage(cardId, isUpgraded, multiplier = 1)`, `isSharedAttackCardId`, `SPECIAL_CARD_IDS`, `ATTACK_CARD_IDS`, `SPECIAL_ATTACK_CARD_IDS`, types `CardId`, `CardType`, `CardInstance`

Produces, in `apps/client/src/ui/card/card-face.ts` (no React import):
```ts
export const CARD_SIZES: readonly ['hand', 'lifted', 'sheet', 'thumb', 'tile'];
export type CardSize = (typeof CARD_SIZES)[number];
export type CardCounterKind = 'card-lives' | 'turns';
export interface CardCounter { readonly kind: CardCounterKind; readonly amount: number }
export const HIDDEN_CARD_LABEL = 'Hidden card';
export function cardFamilyOf(cardId: CardId): CardType;
export function cardCostChip(cardId: CardId, isUpgraded: boolean): StructuredCost | null;
export function cardDamageChip(cardId: CardId, isUpgraded: boolean, damageMultiplier?: number): number | null;
export function cardCounterLabel(counter: CardCounter): string;
export function cardFaceLabel(input: { readonly name: string; readonly isUpgraded: boolean; readonly damage: number | null; readonly counter?: CardCounter }): string;
```

Produces, in `apps/client/src/ui/card/card.tsx`:
```ts
interface CardCommonProps { size: CardSize; selected?: boolean; unplayable?: boolean; className?: string; dataAttributes?: Readonly<Record<`data-${string}`, string>> }
export interface FaceUpCardProps extends CardCommonProps { face?: 'up'; instance: CardInstance; damageMultiplier?: number; counter?: CardCounter; onActivate?: (instanceId: string) => void }
export interface HiddenCardProps extends CardCommonProps { face: 'hidden'; family: CardType; onActivate?: () => void }
export type CardProps = FaceUpCardProps | HiddenCardProps;
export function Card(props: CardProps): ReactElement;
```

Produces, in `apps/client/src/ui/card/card.gallery.tsx`: `export const gallery: GallerySection` with id `'card'`.

The test steps list each `describe` › `it` title word for word, followed by its assertions. Write them as Vitest code that uses exactly those values.

---

- [ ] **Step 1: Pre-flight and mark In progress**
  ```bash
  ls apps/client/src/ui/asset-lookup.ts apps/client/src/ui/structured-cost.ts apps/client/src/ui/palette.ts apps/client/src/ui/contrast.ts apps/client/src/ui/tokens.css apps/client/src/ui/card/cost-amount.tsx apps/client/src/ui/icons/icon.tsx apps/client/src/ui/motion/use-prefers-reduced-motion.ts apps/client/src/test/render.tsx apps/client/src/dev/gallery-registry.ts && grep -n "export function artFor" apps/client/src/ui/asset-lookup.ts && grep -n "tsx" vitest.config.ts
  ```
  Pass: all ten paths are listed with no "No such file", there is exactly one `artFor` match, and the client `include` has `src/**/*.test.{ts,tsx}`. If any check fails, stop: one of L72-04 to L72-08, L72-10 or L72-11 has not landed. In `docs/backlog_v7.md`, set the `| L72-12 |` row's Status to `In progress` and leave it uncommitted.

- [ ] **Step 2: Write the failing helper test** `apps/client/src/ui/card/card-face.test.ts` (node; header cites spec v7 §5.4, L56-04, L56-06, L58-06, rules spec §1–§3). Table `DAMAGE = [['basic-attack', 1, 3], ['strong-attack', 2, 4], ['super-attack', 7, 10], ['mega-attack', 20, 20]] as const` ([id, base, upgraded]). 10 tests:
  - `CARD_SIZES (spec v7 §5.4)` › `lists the five sizes in order`: equals `['hand', 'lifted', 'sheet', 'thumb', 'tile']`.
  - `cardDamageChip (L56-04)` › `covers every attack id`: `new Set` of DAMAGE ids equals `new Set([...ATTACK_CARD_IDS, ...SPECIAL_ATTACK_CARD_IDS])`. › `equals catalog damage × multiplier, base and upgraded`: per row `(id, false)` = base, `(id, true)` = upgraded, `(id, false, 2)` = base × 2, `(id, true, 2)` = upgraded × 2. › `is null for Tax, Absorber and Super Mirror`: `(id, false)` and `(id, true, 2)` are null for `tax`, `absorber`, `super-mirror`.
  - `cardCostChip (rules spec §1–§3)` › `reads the play cost, with the upgraded Regeneration rate`: `('basic-attack', false)` → `{ kind: 'points', amount: 1 }`; `('super-attack', true)` → points 10; `('mega-attack', false)` → points 16; `('tax', false)` and `('tax', true)` → `{ kind: 'lives', amount: 1 }`; `('regeneration', false)` → `{ kind: 'pointsPerLife', amount: 3 }`; `('regeneration', true)` → pointsPerLife 2.
  - `cardCounterLabel (L56-06 / L58-06)` › `speaks card lives and turns, with singulars`: card-lives 1 → `'1 card life'`, 3 → `'3 card lives'`; turns 1 → `'1 turn remaining'`, 4 → `'4 turns remaining'`.
  - `cardFaceLabel` › `names the card with its upgrade state, damage and counter`: (name, isUpgraded, damage, counter?) `('Poison', false, null)` → `'Poison'`; `('Strong attack', true, 4)` → `'Strong attack upgraded, 4 damage'`; `('Points Generator', true, null, { kind: 'card-lives', amount: 1 })` → `'Points Generator upgraded, 1 card life'`; `('Invisibility', false, null, { kind: 'turns', amount: 3 })` → `'Invisibility, 3 turns remaining'`.
  - `cardFamilyOf` › `matches the catalog type for every card`: each `ALL_ART_CARD_IDS` equals `getCard(id)?.type`; `mega-attack` → `'special'`, `tax` → `'action'`, `basic-attack` → `'attack'`.
  - `hidden label and chip contrast (spec v7 §5.1)` › `labels a hidden face "Hidden card"`: `HIDDEN_CARD_LABEL` is `'Hidden card'`. › `keeps chip numerals at AA: --text-on-cta on --life, --text on --panel-2`: `contrastRatio(V7_COLORS['text-on-cta'], V7_COLORS.life)` and `contrastRatio(V7_COLORS.text, V7_COLORS['panel-2'])` are `>= WCAG_AA_TEXT`.

- [ ] **Step 3: Run it and watch it fail**
  Run: `pnpm vitest run --project client apps/client/src/ui/card/card-face.test.ts`
  Expected: FAIL, `Failed to resolve import "./card-face" from "src/ui/card/card-face.test.ts"`, `Test Files  1 failed (1)`.

- [ ] **Step 4: Implement the helpers** in `card-face.ts` with the signatures above; header cites spec v7 §5.4, L56-04, L56-06, L58-06. `cardDamageChip` = `listedAttackDamage(cardId, isUpgraded, damageMultiplier ?? 1)`. `cardCostChip` = `structuredPlayCost` (from `'../structured-cost'`) on `getCard(cardId)`, `null` without a definition. `cardFamilyOf` = `getCard(cardId)?.type`, else `SPECIAL_CARD_IDS` → `'special'`, `isSharedAttackCardId` → `'attack'`, otherwise `'action'`. `cardFaceLabel` = `` `${name}${isUpgraded ? ' upgraded' : ''}${damage !== null ? `, ${damage} damage` : ''}${counter !== undefined ? `, ${cardCounterLabel(counter)}` : ''}` ``.

- [ ] **Step 5: Run it and watch it pass**
  Run: `pnpm vitest run --project client apps/client/src/ui/card/card-face.test.ts`
  Expected: PASS, `Test Files  1 passed (1)`, `Tests  10 passed (10)`.

- [ ] **Step 6: Write the failing component test** `apps/client/src/ui/card/card.test.tsx`: first line `// @vitest-environment happy-dom`, header cites spec v7 §5.4, §5.5, §6.6.5, §8.3 and the five Appendix A ids. Helpers (plus `el(root, selector)` and `catalogCard(cardId)`, which throw when nothing is found):
  ```tsx
  const FAMILIES: readonly CardType[] = ['attack', 'action', 'special'];
  const UP = '[data-card-face="up"]';
  const inst = (cardId: CardId, isUpgraded = false): CardInstance => ({ instanceId: `inst-${cardId}`, cardId, isUpgraded });
  const classes = (node: HTMLElement) => node.className.split(' ');
  const motionClasses = (node: HTMLElement) => classes(node).filter((n) => n.includes('translate') || n.startsWith('scale-'));
  ```
  "Root" means `el(container, UP)`. Loops reuse one render through `rerender`, and size loops call `unmount()` on each pass. In `Name[ upgraded]`, `' upgraded'` is appended only when the card is upgraded. 29 tests:
  1. `damage chip (spec v7 §5.4, L56-04)` › `shows catalog damage × multiplier on every attack, base and upgraded`: `sheet`; basic-attack 'Basic attack' 1/3, strong-attack 'Strong attack' 2/4, super-attack 'Super attack' 7/10, mega-attack 'MEGA ATTACK' 20/20 × upgraded {false, true} × `damageMultiplier` {1, 2}: `[data-card-chip="damage"]` text is `String(listed)`; `getByRole('article', { name: '<Name>[ upgraded], <listed> damage' })` is the root. › `renders no damage chip on Tax, Absorber and Super Mirror`: tax 'Tax', absorber 'Absorber', super-mirror 'Super Mirror' × upgraded, `damageMultiplier={2}`: no damage chip; article `aria-label` is `Name[ upgraded]`.
  2. `cost chip (spec v7 §5.4)` › `it.each<[CardId, boolean, string, string]>` `'%s (upgraded %s) shows a %s chip read as "%s"'` at `sheet`: basic-attack/false/'points'/'1 pt', super-attack/true/'points'/'10 pts', tax/false/'lives'/'1 life', tax/true/'lives'/'1 life', regeneration/false/'pointsPerLife'/'3 pts/life', regeneration/true/'pointsPerLife'/'2 pts/life'. Chip `[data-card-chip="cost"]`: `data-cost-kind` = kind; `within(chip).getByText(spoken)` truthy; `chip.querySelector('[title]')` null. › `stacks both chips on the left at hand and thumb size, corners otherwise; thumbs show no name`: strong-attack at each `CARD_SIZES`: `[data-card-chips]` is `'left-stack'` at hand/thumb, else `'corners'`; `querySelector('[data-card-name]')?.textContent ?? null` is null at thumb, else `'Strong attack'`.
  3. `upgraded state (spec v7 §5.4)` › `shows the gold "+" badge and says "upgraded"`: hand upgraded strong-attack: `[data-card-badge="upgraded"]` text `'+'`, `aria-hidden` `'true'`; article label `'Strong attack upgraded, 4 damage'`. Rerender base: no badge; label `'Strong attack, 2 damage'`.
  4. `active persistent counter (L56-06, L58-06)` › `it.each<[CardId, CardCounterKind, number, string]>` `'%s with %s %i reads "%s"'` at `thumb`, `counter={{ kind, amount }}`: poison/card-lives/1/'Poison, 1 card life', poison/card-lives/3/'Poison, 3 card lives', roulette/card-lives/2/'Roulette, 2 card lives', invisibility/turns/1/'Invisibility, 1 turn remaining', invisibility/turns/4/'Invisibility, 4 turns remaining'. `getByRole('article', { name: label })` is the root; `[data-card-counter="${kind}"]` text `String(amount)`, `aria-hidden` `'true'`; `[data-card-layer="glow"]` present. › `renders no counter badge and no glow without a counter`: curse at thumb: no `[data-card-counter]`, no glow.
  5. `hidden face (spec v7 §5.4)` › `exposes neither name nor art for any family or size`: each `FAMILIES` × `CARD_SIZES`: `getByRole('article', { name: HIDDEN_CARD_LABEL })` has `data-card-family` = family; no `img`; no `[data-card-id], [data-instance-id], [data-card-chip]`; `textContent` contains no `catalogCard(id).name` of `ALL_ART_CARD_IDS`. › `calls onActivate with no argument when interactive`: special/thumb; `user.click(getByRole('button', { name: HIDDEN_CARD_LABEL }))` → called once, `toHaveBeenCalledWith()`.
  6. `long-press guard (spec v7 §6.6.5)` › `prevents the context menu on every face and on the art`: `fireEvent.contextMenu` returns `false` on the roulette hand root, its `img`, the `button` after rerender with `onActivate={vi.fn()}`, and `[data-card-face="hidden"]` (attack, hand). › `disables text selection and the iOS callout on the root`: tax hand root classes contain `select-none` and `[-webkit-touch-callout:none]`.
  7. `activation (spec v7 §6.6.5)` › `calls back with the instance id on click and on Enter`: hand `{ instanceId: 'h-7', cardId: 'basic-attack', isUpgraded: false }`; `getByRole('button', { name: 'Basic attack, 1 damage' })`; `user.click`, then `focus()` + `user.keyboard('{Enter}')`: called twice, 1st and 2nd with `'h-7'`. › `marks selection with aria-pressed and keeps an unplayable face activatable`: tax hand + `onActivate`: `aria-pressed` `'false'`; rerender `selected unplayable`: `aria-pressed` `'true'`, `data-unplayable` `'true'`; click → called with `'inst-tax'`. › `renders an article, not a button, without onActivate`: tax sheet `selected`: no `button` role; `article` has no `aria-pressed`.
  8. `art (spec v7 §5.4–§5.5; Appendix A global-activated-art-guard)` › `always shows the base drawing from artFor, never activated art`: `const ids: readonly CardId[] = [...CARDS_WITH_ACTIVATED_ART, 'sentence', 'shield']` × upgraded at `sheet` with `counter={{ kind: 'card-lives', amount: 2 }}`: `img` `src` is `artFor(cardId)`, does not match `/activated/i`; `alt` is `''`.
  9. `root anchors and rims` › `carries the card anchors, caller data attributes and className`: tile `{ instanceId: 'x-1', cardId: 'spy', isUpgraded: false }`, `className="extra-class"`, `dataAttributes={{ 'data-tutorial-highlight': 'hand-card' }}`: root `data-card-id` 'spy', `data-instance-id` 'x-1', `data-card-size` 'tile', `data-tutorial-highlight` 'hand-card', classes contain `extra-class`. › `gives attacks and actions the holo rim and specials the gold rim`: tile `data-card-rim`: basic-attack 'holo', tax 'holo', roulette 'gold', mega-attack 'gold'; hidden special 'gold'.
  10. `no effect text on any face (spec v7 §5.4)` › `never prints effect, upgrade effect or upgrade adds, at any size`: every `ALL_ART_CARD_IDS` × `CARD_SIZES` × upgraded: `textContent` contains none of the non-empty `effect`, `upgradeEffect`, `upgradeAdds`.
  11. `reduced motion (spec v7 §5.7, §8.3)`, both on hand upgraded points-generator with `counter={{ kind: 'card-lives', amount: 2 }}`, `selected`, `onActivate={vi.fn()}`: › `animates the sheen, the pulse and the selected lift with full motion`: root `data-motion` `'full'`; `[data-card-layer="sheen-sweep"]` has `v7-card-sheen`; glow has `animate-pulse`; `motionClasses(root)` contains `-translate-y-2` and `scale-105`. › `drops the sheen sweep, the pulse and the lift, and keeps every badge` (`{ reducedMotion: true }`): `data-motion` `'reduced'`; no sheen-sweep; `[data-card-layer="sheen"]` present; glow lacks `animate-pulse`; `motionClasses(root)` equals `[]`; upgraded badge `'+'`; `[data-card-counter="card-lives"]` `'2'`; root `aria-pressed` `'true'`.

- [ ] **Step 7: Run it and watch it fail**
  Run: `pnpm vitest run --project client apps/client/src/ui/card/card.test.tsx`
  Expected: FAIL, `Failed to resolve import "./card" from "src/ui/card/card.test.tsx"`, `Test Files  1 failed (1)`.

- [ ] **Step 8: Add the sheen to `apps/client/src/ui/tokens.css`.** Put the class inside the existing `@layer components` block, beside `.v7-ground`, and put the keyframes and the reduced-motion guard after that block. Change no token value. The pulse uses Tailwind's built-in `animate-pulse` (opacity only), so it needs no new CSS.
  ```css
    /* L72-12 — upgraded holo sheen, a translated layer (spec v7 §5.4, §8.2). */
    .v7-card-sheen { animation: v7-card-sheen 3.2s var(--ease-entrance) infinite; }

  @keyframes v7-card-sheen {
    0% { transform: translateX(-100%) skewX(-12deg); }
    40%, 100% { transform: translateX(300%) skewX(-12deg); }
  }
  @media (prefers-reduced-motion: reduce) { .v7-card-sheen { animation: none; } }
  ```

- [ ] **Step 9: Implement `Card`** in `card.tsx` with exactly the exports above. The header cites spec v7 §5.4, §6.6.5, §8.3, L56-04 and Appendix A `global-activated-art-guard`.
  - Root element: one module-private root renders a `<button type="button">` when `onActivate` is set and an `<article>` otherwise. Its `aria-label` comes from `cardFaceLabel` (face up) or `HIDDEN_CARD_LABEL` (hidden).
  - Data sources: catalog data comes through `card-face.ts`. Art comes only from `artFor(instance.cardId)`: never `getCardArtUrl`, never activated art. The name is `getCard(cardId)?.name ?? cardId`. Do not import the shared `Card` type.
  - Motion: `data-motion` comes from `usePrefersReducedMotion()`. Animation and lift classes are applied only when it is `'full'`.
  - Root behavior: always `select-none [-webkit-touch-callout:none]` and `onContextMenu={(e) => { e.preventDefault(); }}`. Spread `dataAttributes` first, so the fixed attributes win, and append `className` last. Pass optional props by conditional spread.
  - Class strings: literals only. First confirm through Context7 or `node_modules/tailwindcss` that Tailwind v4 has `bg-linear-to-b`, `bg-[image:var(--x)]`, `p-(--x)`, `duration-(--x)`, `outline-3`, `saturate-30` and `[-webkit-touch-callout:none]`.

  Pinned values:
  - Root `relative isolate aspect-[2/3] shrink-0 rounded-v7-card shadow-v7-card p-(--card-rim-width)`. Widths: hand `w-[clamp(64px,19vw,120px)]`, lifted `w-[clamp(80px,24vw,150px)]`, sheet `w-[clamp(200px,56vw,240px)]`, thumb `w-11`, tile `w-[clamp(88px,26vw,128px)]`.
  - Rim holo `bg-[image:var(--card-rim-holo)]`, gold `bg-[image:var(--card-rim-gold)]`. Face `bg-linear-to-b from-v7-card-face-0 to-v7-card-face-1 overflow-hidden`; `<img alt="" draggable={false}>` `object-contain`.
  - Name (bottom) `font-v7-card font-semibold text-v7-text-on-card truncate`: `text-v7-micro` hand, `text-v7-caption` lifted/tile, `text-v7-body` sheet.
  - Chips container: absolute and `pointer-events-none`. `left-stack` is a column at the top left; `corners` puts cost top-left and damage top-right.
  - Cost chip `bg-linear-to-b from-v7-panel-2 to-v7-panel text-v7-text` wrapping `<CostAmount amount={cost} title={null} size>` (`'sm'` hand/thumb, `'md'` lifted/tile, `'lg'` sheet).
  - Damage chip (`aria-hidden="true"`, number only) `bg-v7-life text-v7-text-on-cta font-v7-card font-bold tabular-nums`: `text-v7-micro` hand/thumb, `text-v7-caption` lifted/tile, `text-v7-title` sheet.
  - Upgraded: a `sheen` layer `bg-[image:var(--card-rim-holo)] opacity-20 mix-blend-overlay`. With full motion only, it holds a white `sheen-sweep` band with `v7-card-sheen`. The `+` badge is `bg-[image:var(--card-rim-gold)] text-v7-text-on-cta font-v7-card`.
  - Counter: glow `absolute -inset-1 -z-10 rounded-v7-card bg-v7-cta-2 opacity-60 blur-md` (+ `animate-pulse` at full motion); badge under the face: `<Icon name={kind === 'card-lives' ? 'life' : 'clock'} size={10} />` + amount.
  - Selected `outline-3 outline-offset-2 outline-v7-cta`, full motion adds `-translate-y-2 scale-105 transition-transform duration-(--dur-base) ease-v7-entrance`. Unplayable `saturate-30`, never `grayscale`. Button focus `focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-v7-text`.
  - Hidden `verso` layer `bg-linear-to-b from-v7-panel-2 to-v7-panel`, CSS diamond emblem: attack `bg-v7-glow-a`, action `bg-v7-glow-b`, special `bg-[image:var(--card-rim-gold)]`.

- [ ] **Step 10: Run both tests and watch them pass**
  Run: `pnpm vitest run --project client apps/client/src/ui/card/card.test.tsx apps/client/src/ui/card/card-face.test.ts`
  Expected: PASS, `Test Files  2 passed (2)`, `Tests  39 passed (39)`.

- [ ] **Step 11: Write the failing gallery test** `apps/client/src/ui/card/card.gallery.test.tsx` (happy-dom; header cites spec v7 §4.2): `card gallery (/dev/ui)` › `registers the card section and renders a card in every entry`: `gallery.id` is `'card'`; `new Set(entry ids).size` equals `entries.length`; each `renderUi(<>{entry.render()}</>)` contains `[data-card-face]`, then `unmount()`.
  Run: `pnpm vitest run --project client apps/client/src/ui/card/card.gallery.test.tsx`
  Expected: FAIL, `Failed to resolve import "./card.gallery"`, `Test Files  1 failed (1)`.

- [ ] **Step 12: Add the gallery and watch it pass.** `card.gallery.tsx`: `export const gallery: GallerySection = { id: 'card', title: 'Card', entries }`, `import type { GallerySection } from '../../dev/gallery-registry'`, inline-arrow `render`s, no local PascalCase component. Entries: `families` (basic-attack, tax, roulette, mega-attack at `tile`); `sizes` (each `CARD_SIZES`, upgraded strong-attack); `chips` (tax, regeneration base and upgraded, super-mirror, strong-attack `damageMultiplier={2}`); `states` (upgraded; poison `card-lives` 2; invisibility `turns` 3; unplayable; selected with `onActivate={() => undefined}`); `hidden` (three families at `hand`).
  Run: `pnpm vitest run --project client apps/client/src/ui/card/`
  Expected: PASS, `Test Files  3 passed (3)`, `Tests  40 passed (40)`.

- [ ] **Step 13: Typecheck and lint**
  Run: `pnpm --filter @card-battle/client typecheck && pnpm eslint apps/client/src/ui/card`
  Expected: exit 0, no output; no `eslint-disable` in new files.

- [ ] **Step 14: Update DESIGN.md and frontend.md**
  - `DESIGN.md`: add a `## Card (ui/card)` section that covers:
    - The API and the Step 9 widths. The landscape-compact height comes from L75 through `className`.
    - Chip colors: cost is `--panel-2 → --panel` with `--text`, through `CostAmount` with `title={null}`. Damage is `--life` with `--text-on-cta` at 5.79:1 and is `aria-hidden`.
    - The name is in Fredoka and is not shown at thumb size.
    - The rim, face and shadow tokens, and each state from Step 9. Reduced motion keeps every badge.
    - Art comes only from `artFor`.
    - The full list of `data-*` anchors the component sets.
  - `docs/agent/frontend.md`, section "Design system (V7 · Lot 72+)": add a "Card (`ui/card/`, L72-12)" subsection with these points:
    - It is the only V7 card renderer. `design/components/card.tsx` stays for the classic screens.
    - Art comes only from `artFor`, so the Sentence/Shield guard holds and Roulette uses its base drawing.
    - The context menu is prevented, with `select-none` and no iOS callout.
    - Damage comes from `cardDamageChip` and the accessible name from `cardFaceLabel`.
    - The caller sets `unplayable` and `counter`. The glow and badge follow `counter`.
    - Tests assert `data-motion`, the anchors and the classes, because happy-dom has no media queries.
  Check: `grep -n "## Card (ui/card)" DESIGN.md && grep -n "Card (\`ui/card/\`, L72-12)" docs/agent/frontend.md` → one match each.

- [ ] **Step 15: Mark the task Done in the backlog**
  In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.
  Check: `grep -n "^| L72-12 |" docs/backlog_v7.md` → row ends `| Done |`.

- [ ] **Step 16: Run the full gate**
  Run: `pnpm verify`
  Expected: exit 0; clean typecheck, no ESLint problems, every Vitest project passing, no `failed`, no `skipped`; `design/components/card.test.ts`, `life-count-badge.test.ts`, `asset-lookup.test.ts` unchanged.

- [ ] **Step 17: Commit**
  ```bash
  git add apps/client/src/ui/card/card-face.ts apps/client/src/ui/card/card-face.test.ts apps/client/src/ui/card/card.tsx apps/client/src/ui/card/card.test.tsx apps/client/src/ui/card/card.gallery.tsx apps/client/src/ui/card/card.gallery.test.tsx apps/client/src/ui/tokens.css DESIGN.md docs/agent/frontend.md docs/backlog_v7.md
  git commit -m "feat(ui): add holo Card component (L72-12)" -m "Cost chip violet is --panel-2 to --panel and the damage numeral on --life uses --text-on-cta (5.79:1, AA). Upgraded sheen is a translated layer (.v7-card-sheen in ui/tokens.css); pulse and badge follow counter, per spec v7 §5.4/§8.2."
  ```
  Expected: one commit on `claude/v7-redesign`, subject ≤ 50 chars, no AI attribution; `git status --short` shows only the pre-existing untracked `.claude/`.

**Decisions:**
- The task depends on more than the backlog row lists (L72-06, L72-10, L72-11). It also needs L72-04 (asset-lookup, structured-cost), L72-05 (palette, contrast, reduced-motion hook, card tokens), L72-07 (Icon) and L72-08 (GallerySection). Step 1 checks all of them.
- ui/tokens.css is an L72-05 file with no L72-12 contract entry, but it gains @keyframes v7-card-sheen, a .v7-card-sheen class in @layer components and a prefers-reduced-motion guard. This keeps the sheen beside the other V7 CSS and inside the pre-approved Impeccable scope. The pulse reuses Tailwind's animate-pulse (opacity only), so it adds no CSS.
- The cost chip's 'violet' fill is --panel-2 → --panel with --text numerals, so no new color token is added.
- The damage numeral on the --life chip uses --text-on-cta at 5.79:1. The alternatives are --text-on-card at 4.21:1 and white at 3.37:1. This extends --text-on-cta beyond CTA fills; card-face.test.ts asserts the pair.
- At thumb size the card shows no visible name; the name stays in aria-label, as on the V2 art-only thumb. Chips stack on the left edge at hand and thumb, and sit at the corners at lifted, sheet and tile.
- The contract pins only the hand clamp and sheet >= 200px. The other widths are picks: lifted clamp(80px,24vw,150px), sheet clamp(200px,56vw,240px), thumb 44px (w-11, touch target), tile clamp(88px,26vw,128px). They are recorded in DESIGN.md for the L72-21 critique.
- Hidden faces carry data-card-family and data-card-rim but no data-card-id and no data-instance-id. The contract's root list names data-card-id without a qualifier, but HiddenCardProps has no id and emitting one would leak hidden information.
- The plan adds internal anchors the contract does not name: data-card-face, data-card-rim, data-card-chips (left-stack|corners), data-card-chip (cost|damage), data-cost-kind, data-card-name, data-card-badge, data-card-counter, data-card-layer (glow|face|sheen|sheen-sweep|verso) and data-unplayable. All are listed in DESIGN.md.
- Counter badge icons: card-lives uses Icon 'life', and turns uses Icon 'clock'. The V2 turns badge had no icon.
- As the contract says, the glow pulse and the badge follow only `counter`. Active persistents with counter null (Curse, combat Shield) therefore get no glow. L73/L74 may need an explicit `active` prop if the designer wants the glow on them.
- The plan adds apps/client/src/ui/card/card.gallery.test.tsx, a smoke test (id 'card', unique entry ids, every entry renders a face) that is not in the contract's file list.

---

### Task L72-13: Correct outdated catalog text (§10.5) and open the V7 What's new entry (§10.4)

Copy-only (rules spec §3, §5; decisions.md 2026-09-29 Lot 68). `PROTOCOL_VERSION` stays 45; no engine, rule or `ui/` module change.

**Files:**
- Modify: `packages/shared/src/domain/special-card-catalog.ts:176-183` (Super Absorber `upgradeEffect` / `upgradeAdds`), `:200-207` (Attack Thief `effect` / `upgradeEffect`)
- Modify: `packages/shared/src/domain/card-catalog.ts:73-81` (Absorber `upgradeEffect` / `upgradeAdds`)
- Modify: `packages/shared/src/release-notes.ts:1-17` (header comment), `:47-48` (new first `RELEASE_NOTES_CATALOG` entry)
- Test: `packages/shared/src/domain/special-card-catalog.test.ts`, `card-catalog.test.ts`, `card-label.test.ts` (one new it() each)
- Test: `apps/server/src/engine/turn/super-absorber.test.ts:279-288` (catalog-copy it() only)
- Test: `packages/shared/src/release-notes.test.ts:11-60`, `apps/client/src/ui/release-storage.test.ts` (post-L72-03 path), `apps/client/src/screens/whats-new-dialog.test.ts:32-41, 57` (catalog assertions only)
- Modify: `docs/agent/frontend.md:159`, `docs/agent/decisions.md` (append), `docs/technical_spec_v7.md` §10.4, `docs/backlog_v7_test_classification.md`, `docs/backlog_v7.md`

**Interfaces:**
- Consumes (unchanged, `packages/shared/src/release-notes.ts`): `RELEASE_NOTES: readonly ReleaseNote[]`, `latestReleaseNote(): ReleaseNote`, `releaseNotesForScope(scope: WhatsNewScope): readonly ReleaseNote[]`, `isReleaseNoteId(value: unknown): value is ReleaseNoteId`.
- Consumes (unchanged, `packages/shared/src/domain/card-label.ts`): `formatCardEffectText(card: Card, isUpgraded: boolean): string`. `SPECIAL_CARD_CATALOG` and `SHARED_CARD_CATALOG` keep their shapes.
- Consumes (L72-03, `apps/client/src/ui/release-storage.ts`, unchanged): `export const LAST_SEEN_RELEASE_ID_KEY = 'card-battle.v6.lastSeenReleaseId'`, `export function readLastSeenReleaseId(): string | null`, `export function markLatestReleaseSeen(): void`, `export function hasUnseenReleaseNotes(): boolean`, `export function shouldAutoOpenWhatsNew(input: { latestUnseen: boolean }): boolean`.
- Produces (`special-card-catalog.ts`, `card-catalog.ts`): no new export; string changes only.
- Produces (`packages/shared/src/release-notes.ts`): `RELEASE_NOTES_CATALOG` gains a new first entry `{ id: 'lot-72-v7', date: '2026-10-21', title: 'New look', additions: [], items: [{ cardId: 'attack-thief', before: 'Attack Thief, Absorber+ and Super Absorber+ showed outdated card text.', after: 'Fixed some bugs.' }] }`. `ReleaseNoteId` widens to `'lot-72-v7'` automatically (derived from the catalog).

---

- [ ] **Step 1: Mark the task In progress**

In `docs/backlog_v7.md`, set the `| L72-13 |` row status to `In progress` (ships in the Step 21 commit as `Done`).

- [ ] **Step 2: Check the starting state**

```bash
cd "/Users/yassine/Documents/Perso/Bataille des cartes/battle-cards"
test -f apps/client/src/ui/release-storage.test.ts && test ! -e apps/client/src/help/release-storage.test.ts && echo moved
grep -rln "'lot-72'" apps packages --include='*.ts' --include='*.tsx' | grep -v node_modules | sort
grep -n "export const PROTOCOL_VERSION" packages/shared/src/protocol-version.ts
```
Expected: `moved`; exactly `apps/client/src/screens/whats-new-dialog.test.ts`, `apps/client/src/ui/release-storage.test.ts`, `packages/shared/src/release-notes.test.ts`, `packages/shared/src/release-notes.ts`; `109:export const PROTOCOL_VERSION = 45;`. No `moved` → run L72-03 first. If L72-02 moved the whats-new catalog assertions, apply Step 8 where the grep finds them.

- [ ] **Step 3: Write the failing catalog-copy tests**

`special-card-catalog.test.ts`, inside `describe('SPECIAL_CARD_CATALOG (rules spec §5, L5-01)'`, after `'lists the ruled play Prices …'`:
```ts
  it('pins the Lot 68 Attack Thief and Super Absorber+ copy (technical spec v7 §10.5)', () => {
    const attackThief = SPECIAL_CARD_CATALOG['attack-thief'];
    expect(attackThief.effect).toBe(
      'Block every attack already pending against you, and steal a random attack card from each opponent.',
    );
    expect(attackThief.upgradeEffect).toBe(
      'Block every attack already pending against you, and steal all attack cards from all opponents.',
    );
    expect(attackThief.upgradeAdds).toBe('Steal all attack cards from all opponents, not one random each.');
    expect(`${attackThief.effect} ${attackThief.upgradeEffect}`).not.toMatch(/\bonce\b|charge/i);

    const superAbsorber = SPECIAL_CARD_CATALOG['super-absorber'];
    expect(superAbsorber.effect).toBe(
      'While the counter holds, absorb lives each living opponent lost on their turn. Playing it does not capture past turns.',
    );
    expect(superAbsorber.upgradeEffect).toBe(
      'While the counter holds, absorb lives each living opponent lost on their turn, plus every point and upgrade point that left them, including sales and thefts; never shield. Playing it does not capture past turns.',
    );
    expect(superAbsorber.upgradeAdds).toBe(
      'Also absorb every point and upgrade point that left them, including sales and thefts; never shield.',
    );
  });
```

`card-catalog.test.ts`, inside `describe('SHARED_CARD_CATALOG (rules spec §1–§3, Lot 2 shop rulings)'`:
```ts
  it('pins the Lot 68 Absorber+ copy (technical spec v7 §10.5)', () => {
    const absorber = SHARED_CARD_CATALOG.absorber;
    expect(absorber.effect).toBe('Gain the lives the target lost during their last complete turn.');
    expect(absorber.upgradeEffect).toBe(
      'Gain the lives the target lost during their last complete turn, and also capture every point and upgrade point that left them, including sales and thefts; never shield.',
    );
    expect(absorber.upgradeAdds).toBe(
      'Also capture every point and upgrade point that left them, including sales and thefts; never shield.',
    );
    expect(`${absorber.upgradeEffect} ${absorber.upgradeAdds}`).not.toMatch(/actively spent/i);
  });
```

`card-label.test.ts`, inside `describe('formatCardEffectText (L51-05)'`, after `'locks derived upgradeAdds copy (L51-05)'`:
```ts
  it('renders the technical spec v7 §10.5 copy in the inspect body (L72-13)', () => {
    expect(formatCardEffectText(SPECIAL_CARD_CATALOG['attack-thief'], false)).toBe(
      'Block every attack already pending against you, and steal a random attack card from each opponent.\n\nUpgrade: Steal all attack cards from all opponents, not one random each.',
    );
    expect(formatCardEffectText(SPECIAL_CARD_CATALOG['attack-thief'], true)).toBe(
      'Block every attack already pending against you, and steal all attack cards from all opponents.',
    );
    expect(formatCardEffectText(SHARED_CARD_CATALOG.absorber, false)).toBe(
      'Gain the lives the target lost during their last complete turn.\n\nUpgrade: Also capture every point and upgrade point that left them, including sales and thefts; never shield.',
    );
    expect(formatCardEffectText(SPECIAL_CARD_CATALOG['super-absorber'], true)).toBe(
      'While the counter holds, absorb lives each living opponent lost on their turn, plus every point and upgrade point that left them, including sales and thefts; never shield. Playing it does not capture past turns.',
    );
  });
```

`super-absorber.test.ts`, it() `'catalog copy matches lives-only base and spend-on-upgrade without doubling'`: replace only `expect(card.upgradeEffect).toMatch(/points/i);` with the two lines below; every other expect stays verbatim.
```ts
    expect(card.upgradeEffect).toMatch(/every point and upgrade point that left them/i);
    expect(card.upgradeEffect).toMatch(/never shield/i);
```

- [ ] **Step 4: Run the catalog tests and see them fail**

```bash
pnpm vitest run --project shared packages/shared/src/domain/special-card-catalog.test.ts packages/shared/src/domain/card-catalog.test.ts packages/shared/src/domain/card-label.test.ts
pnpm vitest run --project server apps/server/src/engine/turn/super-absorber.test.ts
```
Expected FAIL. Shared: `Test Files  3 failed (3)`, `Tests  3 failed | 16 passed (19)` (first: `expected 'Block one attack targeting you once, a…'`). Server: `Tests  1 failed | 7 passed (8)` on `/every point and upgrade point that left them/i`.

- [ ] **Step 5: Correct the catalog strings**

String arguments only, set to the exact values the Step 3 tests pin; no other card touched.
- `special-card-catalog.ts`, `'attack-thief': specialCard(...)`: 4th arg (`effect`), 5th arg (`upgradeEffect`); 6th (`upgradeAdds`) stays.
- `special-card-catalog.ts`, `'super-absorber': specialCard(...)`: 5th arg (`upgradeEffect`), 6th arg (`upgradeAdds`).
- `card-catalog.ts`, `absorber: pointsCard(...)`: 6th arg (`upgradeEffect`), 7th arg (`upgradeAdds`).

- [ ] **Step 6: Run the catalog tests and see them pass**

Rerun Step 4: shared `Test Files  3 passed (3)`, `Tests  19 passed (19)`; server `Tests  8 passed (8)`. Then `pnpm vitest run --project client apps/client/src/ui/effect-text-tokens.test.ts` → `Test Files  1 passed (1)`.

- [ ] **Step 7: Write the failing What's new tests (shared)**

`packages/shared/src/release-notes.test.ts` (every other expect stays verbatim):

(a) Rename the first it() to `'lists newest first and keeps lot-72-v7 as the open update'`; set `expect(latestReleaseNote().id).toBe('lot-72-v7');` and `expect(latestReleaseNote().date).toBe('2026-10-21');`; add `expect(isReleaseNoteId('lot-72-v7')).toBe(true);` after the `'lot-72'` one; dates array → `['2026-10-21', '2026-10-07', '2026-10-06', '2026-10-05', '2026-09-29', '2026-09-28', '2026-09-20']`.

(b) `'shows only the current update in the auto popup and every date on New'`: `'current'` → `toEqual(['lot-72-v7'])`; `'history'` ids → `['lot-72-v7', 'lot-72', 'lot-71', 'lot-69', 'lot-68', 'lot-65', 'lot-63']`.

(c) Add after (b):
```ts
  it('keeps ids unique and opens the V7 entry under a new id (technical spec v7 §10.4)', () => {
    const ids = RELEASE_NOTES.map((note) => note.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(latestReleaseNote().id).not.toBe('lot-72');
  });

  it('writes lot-72-v7 as the New look entry with the catalog-text fix (L72-13)', () => {
    const latest = latestReleaseNote();
    expect(latest.id).toBe('lot-72-v7');
    expect(latest.title).toBe('New look');
    expect(latest.additions).toEqual([]);
    expect(latest.items).toEqual([
      {
        cardId: 'attack-thief',
        before: 'Attack Thief, Absorber+ and Super Absorber+ showed outdated card text.',
        after: 'Fixed some bugs.',
      },
    ]);
  });
```

(d) `'writes lot-72 as short gameplay lines'`: replace `const latest = latestReleaseNote();` and `expect(latest.id).toBe('lot-72');` with the lot-71 test's pattern; the rest stays verbatim.
```ts
    const latest = RELEASE_NOTES.find((note) => note.id === 'lot-72');
    expect(latest).toBeDefined();
    if (latest === undefined) {
      return;
    }
```

- [ ] **Step 8: Write the failing What's new tests (client)**

`apps/client/src/ui/release-storage.test.ts`: in `'treats a missing key as unread against the latest catalog id'` and `'Got it writes the latest id so a second visit is read'`, `toBe('lot-72')` → `toBe('lot-72-v7')`. Add after `'treats a stale stored id as unread'`:
```ts
  it('treats a reader who dismissed the pre-V7 lot-72 as unread (technical spec v7 §10.4)', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    storage.setItem(LAST_SEEN_RELEASE_ID_KEY, 'lot-72');
    expect(hasUnseenReleaseNotes()).toBe(true);
    markLatestReleaseSeen();
    expect(storage.getItem(LAST_SEEN_RELEASE_ID_KEY)).toBe('lot-72-v7');
    expect(hasUnseenReleaseNotes()).toBe(false);
  });
```

`apps/client/src/screens/whats-new-dialog.test.ts`, catalog assertions only (`source` / `home` literals stay): latest id `toBe('lot-72-v7')`; `releaseNotesForScope('current')` ids `toEqual(['lot-72-v7'])`; history dates → the Step 7(a) array; `expect(latestReleaseNote().items).toHaveLength(1);` (was 2), followed by:
```ts
    const lot72 = RELEASE_NOTES.find((note) => note.id === 'lot-72');
    expect(lot72?.items).toHaveLength(2);
```

- [ ] **Step 9: Run the What's new tests and see them fail**

```bash
pnpm vitest run --project shared packages/shared/src/release-notes.test.ts
pnpm vitest run --project client apps/client/src/ui/release-storage.test.ts apps/client/src/screens/whats-new-dialog.test.ts
```
Expected FAIL. Shared: `Tests  4 failed | 6 passed (10)` (two pins, unique-id, entry test). Client: `Tests  5 failed | 5 passed (10)` (3 in release-storage, the new one `expected false to be true`; 2 in whats-new-dialog).

- [ ] **Step 10: Add the V7 entry and update the header**

Insert the Produces object as the first element of `RELEASE_NOTES_CATALOG` (above `lot-72`), with `cardId: 'attack-thief' as const` per the file's style. `date` is the commit date: if it lands after 2026-10-21, change it here and in the three date pins of Steps 7(a) and 8.

Header comment: replace "`lot-72` is the open update (…)" with: `lot-72` (active-slot drop cancel; Block / Poison) is promoted to `main` before V7 Lot 72 merges (technical spec v7 §4.6); `lot-72-v7` ("New look") is the open V7 update V7 player-facing PRs append to during the freeze (v7 §10.4), not `lot-72` because seen-state is keyed by id (decisions.md 2026-10-21).

- [ ] **Step 11: Run the What's new tests and see them pass**

Rerun Step 9: shared `Tests  10 passed (10)`; client `Test Files  2 passed (2)`, `Tests  10 passed (10)`.

- [ ] **Step 12: Update `docs/agent/frontend.md` (What's new, line 159)**

Replace "`lot-71` (2026-10-06) is the open update:" with "`lot-71` (2026-10-06) shipped on `main`:". After "A Ghost's points from lost lives show as +? until that Ghost is spied." insert:

" `lot-72` (2026-10-07: active-slot drop cancel; no Poison tick during Block) is promoted to `main` before V7 Lot 72 merges. **V7 (technical spec v7 §10.4):** `lot-72-v7` (2026-10-21, "New look") is the open V7 entry; each V7 player-facing PR appends one Before / After item per screen area during the promotion freeze. New ids never reuse an existing id: seen-state (`ui/release-storage.ts`) is keyed by id. First item: the §10.5 catalog-text fix (After `Fixed some bugs.`)."

- [ ] **Step 13: Record the id discrepancy in `docs/agent/decisions.md`**

Append (append-only) an entry headed `## 2026-10-21 · [P] · [DISCREPANCY] V7 What's new id and catalog copy (L72-13)` that records, in full sentences:
- Spec v7 §10.4's `lot-<its lot>` gives `lot-72`, already the pre-V7 entry promoted to `main` before Lot 72 merges (§4.6); seen-state is keyed by id, so reuse would hide the V7 entry from players who dismissed `lot-72`. The V7 entry is `lot-72-v7` ("New look"); V7 PRs append to it during the freeze; any later entry takes an unused id.
- First item: the §10.5 fix, After `Fixed some bugs.` (2026-09-29 "What's new keeps Before and After").
- §10.5 copy follows 2026-09-29 Lot 68: Attack Thief blocks every pending attack (no kept charge); Absorber+ "capture" / Super Absorber+ "absorb" (rules spec §5) every point and upgrade point that left the target, including sales and thefts, never shield; Attack Thief `upgradeAdds` unchanged.
- Default wording: the designer confirms id and strings in the Lot 72 PR; a frozen-catalog ruling is recorded here (§10.5).

- [ ] **Step 14: Point the spec at the decision**

In `docs/technical_spec_v7.md` §10.4, replace `` (`lot-<its lot>`, titled "New look") `` with `` (titled "New look"; Lot 72's is `lot-72-v7`, not `lot-72`, because the pre-V7 `lot-72` entry already uses that id and seen-state is keyed by id — `docs/agent/decisions.md` 2026-10-21) ``. Nothing else in the spec changes.

- [ ] **Step 15: Refresh the two What's new catalog rows in the classification**

In `docs/backlog_v7_test_classification.md`, the two `screens/whats-new-dialog.test.ts` `[catalog assertions]` rows (or their L72-02 rewording; disposition and owner lot unchanged):
- Row 1: `'lot-72'` → `'lot-72-v7'`, `['lot-72']` → `['lot-72-v7']`, history dates "2026-10-07 down to" → "2026-10-21 down to"; last column "appends to lot-72" → "appends to lot-72-v7".
- Row 2: "0 additions and 2 items;" → "0 additions and 1 item; lot-72 has 2 items;"; last column "appends Before/After items to lot-72" → "… to lot-72-v7".

- [ ] **Step 16: Check the old table inspect and the What's new popup in the browser**

Start previews `server` and `client` (`.claude/launch.json`), open `http://localhost:5173`, run `localStorage.setItem('card-battle.v6.lastSeenReleaseId', 'lot-72'); location.reload();`. Pass: What's new auto-opens on "New look" with the entry's Before / After, Got it closes it and a reload does not reopen it; Play solo kit Duplicator (How to play: Skip) → Attack Thief inspect shows the new `effect` and its unchanged Upgrade line; Play solo kit Specialist → Super Absorber's Upgrade line is the new `upgradeAdds`. Stop both previews.

- [ ] **Step 17: Flip the backlog row**

In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress. `DESIGN.md`: no change (no token or `ui/` module changed).

- [ ] **Step 18: Check no protocol, engine or rule file changed**

```bash
git status --porcelain
git diff --name-only -- packages/shared/src/protocol-version.ts packages/shared/src/protocol apps/server/src --
```
Expected: `git status` lists only the 15 files of Step 21; the diff prints only `apps/server/src/engine/turn/super-absorber.test.ts`.

- [ ] **Step 19: Run the full gate**

`pnpm verify`. Expected: `tsc` exits 0 for root and all three packages, `eslint .` prints no problems, Vitest ends `Test Files  N passed (N)` with none failed or skipped.

- [ ] **Step 20: Note the strings for the PR**

In the Lot 72 PR description, under "Designer review — copy (L72-13)", add a Card / Field / New text table of the seven catalog strings Step 3 pins (Attack Thief `upgradeAdds` marked unchanged) plus the `lot-72-v7` entry, and note the id needs designer confirmation. If the PR is not open yet, keep it for the lot's PR-opening step.

- [ ] **Step 21: Commit**

```bash
git add packages/shared/src/domain/special-card-catalog.ts packages/shared/src/domain/special-card-catalog.test.ts packages/shared/src/domain/card-catalog.ts packages/shared/src/domain/card-catalog.test.ts packages/shared/src/domain/card-label.test.ts apps/server/src/engine/turn/super-absorber.test.ts packages/shared/src/release-notes.ts packages/shared/src/release-notes.test.ts apps/client/src/ui/release-storage.test.ts apps/client/src/screens/whats-new-dialog.test.ts docs/agent/frontend.md docs/agent/decisions.md docs/technical_spec_v7.md docs/backlog_v7_test_classification.md docs/backlog_v7.md
git commit -F - <<'EOF'
fix(shared): correct catalog copy (L72-13)

Open the V7 What's new entry as lot-72-v7, not lot-72 as spec v7
§10.4 reads: the pre-V7 lot-72 id is taken and seen-state is keyed
by id, so reusing it would hide the V7 entry from every player who
dismissed lot-72 (decisions.md 2026-10-21).

super-absorber.test.ts pins the §10.5 upgrade phrase instead of
/points/i; no engine change.
EOF
```
No AI attribution line (AGENTS.md §10). Expected: `git log -1 --format=%s` prints `fix(shared): correct catalog copy (L72-13)`.

**Decisions:**
- V7 What's new entry id is 'lot-72-v7', not spec v7 §10.4's lot-<its lot> ('lot-72'): the pre-V7 'lot-72' already exists and seen-state is keyed by id. Recorded as a [DISCREPANCY] in decisions.md plus one sentence in spec §10.4; the designer confirms the id in the Lot 72 PR.
- The contract's '<commit date>' is pinned as '2026-10-21' in release-notes.ts and in three test date pins (release-notes.test.ts x2, whats-new-dialog.test.ts). Change all four together if the commit lands on a later day.
- Super Absorber+ keeps its own verb 'absorb' (rules spec §5) and Absorber+ uses 'capture'. The contract note says 'capture' for both. The §10.5 phrase 'every point and upgrade point that left them, including sales and thefts; never shield' appears verbatim in all four strings.
- Attack Thief upgradeAdds stays unchanged ('Steal all attack cards from all opponents, not one random each.'). §10.5 and the contract name only effect and upgradeEffect, and that text is still accurate. The new test pins it.
- apps/server/src/engine/turn/super-absorber.test.ts gets a test-only edit, outside the L72-13 module list. /points/i cannot match the new 'every point' wording, so it becomes /every point and upgrade point that left them/i plus /never shield/i. No server code changes.
- whats-new-dialog.test.ts: latestReleaseNote().items length goes from 2 to 1, and lot-72's 2 items stay pinned through RELEASE_NOTES.find. In release-notes.test.ts, 'writes lot-72 as short gameplay lines' switches to a find-by-id lookup; its other assertions stay verbatim.
- Two doc edits go beyond the contract. The frontend.md What's new paragraph is updated, which also fixes the stale 'lot-71 is the open update'. The two whats-new-dialog catalog rows in backlog_v7_test_classification.md are refreshed.
- The commit has no Co-Authored-By trailer. The AGENTS.md §10 'No AI attribution' rule wins over the session's attribution reminder.

---

### Task L72-14: Rebuild ChatLog in ui/

Spec: `docs/technical_spec_v7.md` §4.2, §5.2, §6.9, §7.5. Parity: `chat-compose-enter`, `lobby-chat`, `table-chat-popup`, `chat-new-message-announcement`, `table-chat-side-stream-disclosure`, `lobby-chat-walk-in-spectator-stream`, `end-finished-chat-readonly`, `global-text-input-no-ios-zoom`. `screens/table/chat-log.tsx` and `table-chat.tsx` are not touched; no unread logic; no protocol, server or shared change.

**Files:**
- Create: `apps/client/src/ui/chat/chat-line.ts`, `apps/client/src/ui/chat/chat-log.tsx`, `apps/client/src/ui/chat/chat.gallery.tsx`
- Test: `apps/client/src/ui/chat/chat-line.test.ts` (node), `apps/client/src/ui/chat/chat-log.test.tsx` (happy-dom)
- Modify: `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`

**Interfaces:**
- Consumes:
  - `@card-battle/shared` (unchanged): `CHAT_BODY_MAX_LENGTH = 200`; `chatRoundLabel(round: number): string` (`'Lobby'` for 0, else `` `Round ${n}` ``); `ChatMessageView { order, senderId, nickname, role: 'living' | 'eliminated' | 'spectator', body, round }`.
  - L72-04 `ui/seat-colors.ts`: `seatIndexOf(view: SeatPlayersView, playerId: string): SeatIndex | null`, `SeatIndex`.
  - L72-05 `ui/palette.ts`: `v7SeatColor(index: number): string`, `V7_COLORS` (`V7_COLORS['text-2'] === '#cfc6ff'`), and the `*-v7-*` utilities named in Step 8.
  - L72-06 `src/test/render.tsx`: `renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult` (RTL `RenderResult` plus `user`).
  - L72-08: `ScrollArea({ children, axis?, label?, className?, ref? })` (`ref` on the overflow root); `TextField(props: TextFieldProps)` (input attributes spread on `<input>`, plus `label: string`, `labelHidden?: boolean`; 16 px, min-height 44 px); `Button(props: ButtonProps)` (`variant?: 'primary' | 'secondary' | 'danger' | 'quiet'`, `type` defaults to `'button'`); `type GallerySection` from `dev/gallery-registry.ts`.
- Produces (used by L74-16, L76-13, L77-05):
  - `apps/client/src/ui/chat/chat-line.ts`:
    - `export const CHAT_EMPTY_COPY = 'No messages yet.'`
    - `export const CHAT_INPUT_LABEL = 'Message'`
    - `export const CHAT_SEND_LABEL = 'Send'`
    - `export interface ChatLineView { readonly key: number; readonly roundLabel: string; readonly nickname: string; readonly seatIndex: SeatIndex | null; readonly side: boolean; readonly roleLabel: string | null; readonly body: string }`
    - `export function chatLineView(message: ChatMessageView, players: readonly { id: string }[]): ChatLineView`
  - `apps/client/src/ui/chat/chat-log.tsx`:
    - `export interface ChatLogProps { messages: readonly ChatMessageView[]; players: readonly { id: string }[]; canWrite: boolean; onSend: (body: string) => void; inputLabel?: string; placeholder?: string }`
    - `export function ChatLog(props: ChatLogProps): ReactElement`
  - `apps/client/src/ui/chat/chat.gallery.tsx`: `export const gallery: GallerySection` with `id: 'chat'`.

- [ ] **Step 1: Mark the task In progress**

In `docs/backlog_v7.md`, set the `| L72-14 |` Status to `In progress` (not committed alone).

- [ ] **Step 2: Write the failing test `apps/client/src/ui/chat/chat-line.test.ts`**

```ts
import type { ChatMessageView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { CHAT_EMPTY_COPY, CHAT_INPUT_LABEL, CHAT_SEND_LABEL, chatLineView } from './chat-line';

const PLAYERS = [{ id: 'p-ana' }, { id: 'p-bo' }];
const message = (o: Partial<ChatMessageView>): ChatMessageView =>
  ({ order: 1, senderId: 'p-ana', nickname: 'Ana', role: 'living', body: 'gl hf', round: 0, ...o });

describe('chatLineView (rules spec §6 Chat, spec v7 §6.9)', () => {
  it('keeps the existing chat copy (spec v7 §10.6: no new strings)', () => {
    expect([CHAT_EMPTY_COPY, CHAT_INPUT_LABEL, CHAT_SEND_LABEL]).toEqual(['No messages yet.', 'Message', 'Send']);
  });
  it('stamps a lobby line "Lobby" and a match line "Round N"', () => {
    expect(chatLineView(message({ round: 0 }), PLAYERS).roundLabel).toBe('Lobby');
    expect(chatLineView(message({ round: 3 }), PLAYERS).roundLabel).toBe('Round 3');
  });
  it('maps a living line to its seat with no role label', () => {
    expect(
      chatLineView(message({ order: 7, senderId: 'p-bo', nickname: 'Bo', body: 'watch out', round: 3 }), PLAYERS),
    ).toEqual({ key: 7, roundLabel: 'Round 3', nickname: 'Bo', seatIndex: 1, side: false, roleLabel: null, body: 'watch out' });
  });
  it('marks eliminated and spectator lines as side stream with their role label', () => {
    const eliminated = chatLineView(message({ role: 'eliminated' }), PLAYERS);
    const spectator = chatLineView(message({ senderId: 'walk-in', nickname: 'Cy', role: 'spectator' }), PLAYERS);
    expect([eliminated.side, eliminated.roleLabel]).toEqual([true, '(eliminated)']);
    expect([spectator.side, spectator.roleLabel]).toEqual([true, '(spectator)']);
  });
  it('gives no seat to a sender who is not in the player list', () => {
    expect(chatLineView(message({ senderId: 'walk-in' }), PLAYERS).seatIndex).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run --project client apps/client/src/ui/chat/chat-line.test.ts`
Expected: FAIL, `Failed to resolve import "./chat-line"`, no test runs.

- [ ] **Step 4: Implement `chatLineView` in `apps/client/src/ui/chat/chat-line.ts`**

Exports exactly as in Interfaces. `key = order`, `roundLabel = chatRoundLabel(round)`, `seatIndex = seatIndexOf({ players }, senderId)`, `side = role !== 'living'`, `` roleLabel = side ? `(${role})` : null ``; `nickname`/`body` copied. Imports only `@card-battle/shared` and `../seat-colors`. Header cites rules spec §6 Chat, spec v7 §6.9.

- [ ] **Step 5: Run it to verify it passes**

Run: `pnpm vitest run --project client apps/client/src/ui/chat/chat-line.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Write the failing test `apps/client/src/ui/chat/chat-log.test.tsx`**

Pragma on line 1. No emoji in fixtures (`ui/icons/no-emoji.test.ts` scans `ui/**`, tests included).

```tsx
// @vitest-environment happy-dom
import { CHAT_BODY_MAX_LENGTH, type ChatMessageView } from '@card-battle/shared';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { V7_COLORS, v7SeatColor } from '../palette';
import { CHAT_EMPTY_COPY, CHAT_INPUT_LABEL, CHAT_SEND_LABEL } from './chat-line';
import { ChatLog, type ChatLogProps } from './chat-log';

const PLAYERS = [{ id: 'p-ana' }, { id: 'p-bo' }];
const msg = (order: number, senderId: string, nickname: string, role: ChatMessageView['role'], body: string, round: number): ChatMessageView =>
  ({ order, senderId, nickname, role, body, round });
const ANA_LOBBY = msg(1, 'p-ana', 'Ana', 'living', 'gl hf', 0);
const BO_ROUND_3 = msg(2, 'p-bo', 'Bo', 'living', 'watch out', 3);
const ANA_ELIMINATED = msg(3, 'p-ana', 'Ana', 'eliminated', 'gg', 4);
const CY_SPECTATOR = msg(4, 'walk-in', 'Cy', 'spectator', 'hi', 4);

// JSX factory, not a component.
const chat = (props: Partial<ChatLogProps> = {}) => (
  <ChatLog messages={[]} players={PLAYERS} canWrite onSend={vi.fn()} {...props} />
);
function setup(props: Partial<ChatLogProps> = {}) {
  const onSend = vi.fn<(body: string) => void>();
  return { onSend, ...renderUi(chat({ onSend, ...props })) };
}
// The color string happy-dom stores for `hex`, independent of normalization.
function cssColor(hex: string): string {
  const probe = document.createElement('span');
  probe.style.color = hex;
  return probe.style.color;
}
const input = () => screen.getByRole<HTMLInputElement>('textbox', { name: CHAT_INPUT_LABEL });
const sendButton = () => screen.getByRole('button', { name: CHAT_SEND_LABEL });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChatLog transcript (rules spec §6 Chat, spec v7 §6.9)', () => {
  it('stamps each line with its round label and the sender nickname in its seat hue', () => {
    renderUi(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    expect(screen.getAllByRole('listitem').map((i) => i.textContent)).toEqual(['Lobby Ana: gl hf', 'Round 3 Bo: watch out']);
    expect(screen.getByText('Bo').style.color).toBe(cssColor(v7SeatColor(1)));
  });
  it('labels eliminated and spectator lines and styles them apart from living lines', () => {
    renderUi(chat({ messages: [BO_ROUND_3, ANA_ELIMINATED, CY_SPECTATOR] }));
    const items = screen.getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual([
      'Round 3 Bo: watch out',
      'Round 4 Ana (eliminated): gg',
      'Round 4 Cy (spectator): hi',
    ]);
    expect(items.map((i) => i.getAttribute('data-chat-stream'))).toEqual(['living', 'side', 'side']);
    expect(screen.getByText('Cy').style.color).toBe(cssColor(V7_COLORS['text-2']));
  });
  it('shows "No messages yet." for an empty transcript', () => {
    renderUi(chat());
    expect(screen.getByText('No messages yet.').textContent).toBe(CHAT_EMPTY_COPY);
    expect(screen.queryByRole('list')).toBeNull();
  });
  it('scrolls the transcript to the newest line when a message arrives', () => {
    // happy-dom defines scrollHeight / scrollTop as accessors on Element.prototype.
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(480);
    const scrollTopSet = vi.spyOn(Element.prototype, 'scrollTop', 'set');
    const view = renderUi(chat({ messages: [ANA_LOBBY] }));
    scrollTopSet.mockClear();
    view.rerender(chat({ messages: [ANA_LOBBY, BO_ROUND_3] }));
    expect(scrollTopSet).toHaveBeenCalledWith(480);
  });
});

describe('ChatLog composer (spec v7 §6.9, §7.5; parity chat-compose-enter)', () => {
  it('sends the trimmed body on Enter, resets the input, and a second Enter sends nothing', async () => {
    const { user, onSend } = setup();
    await user.type(input(), '  hello table  {Enter}');
    expect(onSend.mock.calls).toEqual([['hello table']]);
    expect(input().value).toBe('');
    await user.keyboard('{Enter}');
    expect(onSend.mock.calls).toEqual([['hello table']]);
  });
  it('sends through the Send button the same way', async () => {
    const { user, onSend } = setup();
    await user.type(input(), 'gg');
    await user.click(sendButton());
    expect(onSend).toHaveBeenCalledWith('gg');
    expect(input().value).toBe('');
  });
  it('does not send whitespace-only text', async () => {
    const { user, onSend } = setup();
    await user.type(input(), '   {Enter}');
    await user.click(sendButton());
    expect(onSend).not.toHaveBeenCalled();
  });
  it('renders no composer when canWrite is false but keeps the transcript', () => {
    renderUi(chat({ messages: [BO_ROUND_3], canWrite: false }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: CHAT_SEND_LABEL })).toBeNull();
  });
  it('caps the input at CHAT_BODY_MAX_LENGTH and keeps the chat-body name', async () => {
    const { user, onSend } = setup();
    expect(input().getAttribute('maxlength')).toBe(String(CHAT_BODY_MAX_LENGTH));
    expect(input().getAttribute('name')).toBe('chat-body');
    await user.click(input());
    await user.paste('a'.repeat(CHAT_BODY_MAX_LENGTH + 5));
    await user.keyboard('{Enter}');
    expect(onSend).toHaveBeenCalledWith('a'.repeat(CHAT_BODY_MAX_LENGTH));
  });
  it('uses "Message" by default and accepts a label and placeholder override (walk-in, L76)', () => {
    const { unmount } = renderUi(chat());
    expect(screen.getByRole('textbox', { name: 'Message' }).getAttribute('placeholder')).toBe('Message');
    unmount();
    const walkIn = 'Spectators only see this';
    renderUi(chat({ inputLabel: walkIn, placeholder: walkIn }));
    expect(screen.getByRole('textbox', { name: walkIn }).getAttribute('placeholder')).toBe(walkIn);
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `pnpm vitest run --project client apps/client/src/ui/chat/chat-log.test.tsx`
Expected: FAIL, `Failed to resolve import "./chat-log"`, no test runs.

- [ ] **Step 8: Implement `ChatLog(props: ChatLogProps): ReactElement` in `apps/client/src/ui/chat/chat-log.tsx`**

Exports only `ChatLogProps` and `ChatLog` (a private `ChatLine` is fine); nothing imported from `design/` or `screens/table/`. Header cites rules spec §6 Chat, spec v7 §6.9 / §7.5. `inputLabel` and `placeholder` each default to `CHAT_INPUT_LABEL`.

- Transcript: `<ScrollArea axis="y" ref={scroller} className="h-52 rounded-v7-chrome-sm bg-v7-panel-2 px-3 py-2">`, **no `label`**; a `useEffect` on `[messages]` sets `scrollTop = scrollHeight`.
- Empty: `<p className="font-v7-body text-v7-body text-v7-text-2">{CHAT_EMPTY_COPY}</p>`, no list.
- Lines: `<ul className="space-y-1.5">` of `chatLineView(m, players)`, `key={line.key}`. `<li data-chat-stream={side ? 'side' : 'living'}>` with `font-v7-body text-v7-body` plus `text-v7-text` (living) or `italic text-v7-text-2` (side). Children: round-label span (`text-v7-caption text-v7-text-2 not-italic`), `' '`, nickname span (`font-v7-display not-italic`, inline `color` `v7SeatColor(seatIndex)` or `V7_COLORS['text-2']` when `null`; the only element with a seat hue), optional `` ` ${roleLabel}` `` span (`not-italic`), `': '`, body.
- Composer, only when `canWrite`: `<form className="mt-2 flex items-end gap-2" onSubmit={send}>` with `<TextField type="text" name="chat-body" label={inputLabel} labelHidden placeholder={placeholder} maxLength={CHAT_BODY_MAX_LENGTH} className="min-w-0 flex-1" />` and `<Button type="submit" variant="primary">{CHAT_SEND_LABEL}</Button>`.
- `send(event: SyntheticEvent<HTMLFormElement>)`, uncontrolled as today: `preventDefault()`, read and trim `chat-body` from `FormData`, return if empty or `!canWrite`, else `onSend(body)` then `event.currentTarget.reset()`.

- [ ] **Step 9: Run the chat tests to verify they pass**

Run: `pnpm vitest run --project client apps/client/src/ui/chat`
Expected: PASS, `Test Files  2 passed (2)`, `Tests  15 passed (15)`.

- [ ] **Step 10: Add `apps/client/src/ui/chat/chat.gallery.tsx`**

`gallery = { id: 'chat', title: 'Chat', entries }`; module-level fixtures (Lobby living, Round 3 seat 1, eliminated, unknown-sender spectator), `const noop = (): void => undefined`, no PascalCase local component. Entries `<ChatLog … onSend={noop} />`: `transcript` ("Transcript, living and side streams", `canWrite`), `empty` ("Empty", `messages={[]}`, `canWrite`), `read-only` ("Read only (finished board)", `canWrite={false}`). L72-21 reads the input's 16 px here.

Run: `pnpm vitest run --project client apps/client/src/dev`
Expected: PASS; L72-08 registry and route tests stay green, no duplicate-id throw for `chat`.

- [ ] **Step 11: Check the layering**

Run: `grep -rnE "design/|screens/table" apps/client/src/ui/chat`
Expected: no output (exit code 1).

- [ ] **Step 12: Update `DESIGN.md`**

Add a `Chat (ui/chat)` component entry (create the heading if absent) stating: shared by lobby (L76), arena chat sheet (L74) and read-only Game over (L77); the Step 8 box (`h-52`, `bg-v7-panel-2`, `rounded-v7-chrome-sm`, no hard shadow, scrolls to newest); line anatomy (12 px caption round label in `--text-2`, Lilita One nickname in seat hex or `--text-2`, Nunito 14 px body in `--text`, side lines italic `--text-2` with role label and `data-chat-stream="side"`); empty copy "No messages yet."; composer only when `canWrite` (16 px / 44 px `TextField` `chat-body`, hidden overridable label "Message", primary "Send"; trimmed send, whitespace dropped).

- [ ] **Step 13: Update `docs/agent/frontend.md`**

In `Design system (V7 · Lot 72+)`, add to the V7 component list (leave the V6 table chat paragraph as is):

> `ui/chat/ChatLog` (L72-14): transcript plus composer; `onSend` receives the trimmed body; `inputLabel`/`placeholder` override for the walk-in label (L76). It replaces `screens/table/chat-log.tsx` for L74-16, L76-13 and L77-05. The old file stays until L75-11.

- [ ] **Step 14: Flip the backlog**

In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

- [ ] **Step 15: Run the full gate**

Run: `pnpm verify`
Expected: exit code 0: `tsc` clean, ESLint 0 problems, every Vitest project passes (including `ui/icons/no-emoji.test.ts` over `ui/chat`), none skipped.

- [ ] **Step 16: Commit**

```bash
git add apps/client/src/ui/chat/chat-line.ts apps/client/src/ui/chat/chat-line.test.ts apps/client/src/ui/chat/chat-log.tsx apps/client/src/ui/chat/chat-log.test.tsx apps/client/src/ui/chat/chat.gallery.tsx DESIGN.md docs/agent/frontend.md docs/backlog_v7.md
git commit -m "feat(ui): rebuild ChatLog in ui/chat (L72-14)" -m "onSend now receives the trimmed body (the old ChatLog sent it untrimmed), matching L76-13. screens/table/chat-log.tsx stays until L74-16, L76-13 and L77-05 migrate."
```

No AI attribution line (AGENTS.md §10).

**Decisions:**
- Each transcript <li> carries data-chat-stream="living"|"side" (additive markup, not in the contract's preserved-anchor list) so tests prove side lines are styled apart; happy-dom has no CSS cascade.
- The transcript ScrollArea gets no `label` (no role=region, no tab stop), so the message input stays the first focusable element in the L74 chat sheet as today; the contract leaves this open.
- onSend receives the trimmed body (the old ChatLog sent it untrimmed), matching L76-13; recorded in the commit body.
- The composer stays uncontrolled as in today's ChatLog: read `chat-body` from FormData, trim, drop if empty without reset, else onSend then form.reset().
- An unknown sender (seatIndex null) gets its nickname in V7_COLORS['text-2'] inline hex; the seat hue sits only on the nickname span.
- screens/table/chat-log.tsx and table-chat.tsx stay untouched until L74-16, L76-13 and L77-05 migrate and L75-11 deletes screens/table/; no unread logic here (chat-unread.ts is L73/L74).
- Real prerequisites go beyond the backlog's 'Depends on L72-08': L72-04 ui/seat-colors.ts, L72-05 ui/palette.ts and L72-06 src/test/render.tsx. All three come earlier in lot order, so nothing is reordered.
- The scroll test spies on the Element.prototype scrollHeight getter and scrollTop setter. This relies on happy-dom defining both as accessors on the base Element, which was checked against the happy-dom source, not Context7. If the installed version differs, the test fails loudly instead of passing vacuously.
- The maxLength behavior check uses user-event paste, which honors maxlength. The maxlength attribute assertion alone already meets the acceptance line.
- chat-log.test.tsx uses a JSX factory `chat()` and a `setup()` helper (not components) to cut repeated props. Assertions are unchanged; the Enter test asserts onSend.mock.calls equals [['hello table']] before and after the second Enter, which is the same as calledTimes(1) plus calledWith.

---

### Task L72-15: Rebuild kit details and kit portrait in ui/

Spec: technical spec v7 §4.2, §5.5 (`KIT_CATALOG` wins over PNG values), §6.6.5 (kit sheet sections), §7.3 (kit picker), §11 (portrait `alt` = kit name). Parity rows: `kit-inspect-dialog`, `lobby-kit-picker-dialog`, `home-solo-kit-picker`, `global-art-catalog`. This task writes the component test that the L30-05 and L51-04 classification rows of `screens/table/kit-inspect-dialog.test.ts` expect. **Depends on (Done):** L72-04, L72-06, L72-07, L72-08, L72-10, L72-11, L72-12.

**Files:**
- Create: `apps/client/src/ui/kit/kit-portrait-label.ts`, `apps/client/src/ui/kit/kit-portrait.tsx`, `apps/client/src/ui/kit/kit-details-sections.ts`, `apps/client/src/ui/kit/kit-details.tsx`, `apps/client/src/ui/kit/kit.gallery.tsx`
- Test (node): `apps/client/src/ui/kit/kit-portrait-label.test.ts`, `apps/client/src/ui/kit/kit-details-sections.test.ts`
- Test (happy-dom): `apps/client/src/ui/kit/kit-portrait.test.tsx`, `apps/client/src/ui/kit/kit-details.test.tsx`, `apps/client/src/ui/kit/kit.gallery.test.tsx`
- Modify: `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`
- Untouched until L75/L76: `apps/client/src/screens/table/kit-inspect-details.tsx`, `kit-inspect-dialog.tsx`, `kit-inspect-dialog.test.ts`, `apps/client/src/design/components/kit-portrait.tsx`

**Interfaces:**

Consumes:
- `@card-battle/shared`: `getKit(kitId: KitId): Kit`, `getCard(cardId: CardId): Card | undefined`, `KIT_CATALOG`, `KIT_IDS`, `upgradePointBuyCost(kitId: KitId): number`, `upgradePointSellYield(kitId: KitId): number`, `LobbyKitSelection = KitId | 'random'`
- `apps/client/src/`: `artFor(id: CardId | KitId): string` (`ui/asset-lookup.ts`, never throws); `HIDDEN_KIT_LABEL` (`view-model/table-copy.ts`); `KIT_TRAIT_SECTION_KEYS`, `KIT_ABILITY_COPY: Partial<Record<KitId, string>>` (`view-model/kit-inspect-traits.ts`); `kitSpecialCardKey(cardId: string, index: number): string` (`view-model/kit-special-card-key.ts`); `RESOURCE_CAPTIONS` (`ui/resource-captions.ts`); `RESOURCE_ICON`, `Icon` (`ui/icons/`); `Pill`, `PillTone` (`ui/primitives/pill.tsx`); `CostAmount` (`ui/card/cost-amount.tsx`); `spokenGlyphAmount(amount: GlyphAmount, options?: { multiplier?; signed?: CostSign }): string` (`ui/card/glyph-amount.ts`, tests only); `Card` (`face: 'hidden'` + `family: CardType`, or `instance: CardInstance`; `size: CardSize`) (`ui/card/card.tsx`); `cardCostChip(cardId, isUpgraded): StructuredCost | null`, `cardDamageChip(cardId, isUpgraded, damageMultiplier?): number | null`, `cardFaceLabel({ name, isUpgraded, damage, counter? }): string`, `HIDDEN_CARD_LABEL` (`ui/card/card-face.ts`); `renderUi(ui, options?)` (`test/render.tsx`); `GallerySection`, `GalleryEntry` (`dev/gallery-registry.ts`)

Produces (exact, all in `apps/client/src/ui/kit/`):
- `kit-portrait-label.ts`: `export const RANDOM_KIT_LABEL = 'Random kit'`; `export function kitPortraitAlt(kitId: LobbyKitSelection | null): string`
- `kit-portrait.tsx`: `export interface KitPortraitProps { kitId: LobbyKitSelection | null; size?: 'thumb' | 'tile' | 'sheet' | 'hero'; isEliminated?: boolean; className?: string; onClick?: () => void; ariaLabel?: string }`; `export function KitPortrait(props: KitPortraitProps): ReactElement`
- `kit-details-sections.ts`: `export const KIT_DETAILS_SECTION_IDS: readonly ['starting-resources','starting-hand','special-cards','always-upgraded','immune-to','attacks-per-turn','upgrade-points','draw-risk','ability']`; `export type KitDetailsSectionId = (typeof KIT_DETAILS_SECTION_IDS)[number]`; `export const KIT_DETAILS_SECTION_TITLES: Record<KitDetailsSectionId, string>`; `export const KIT_TRAIT_SECTION_FOR: Record<(typeof KIT_TRAIT_SECTION_KEYS)[number], KitDetailsSectionId>`
- `kit-details.tsx`: `export interface KitDetailsProps { kitId: KitId }`; `export function KitDetails(props: KitDetailsProps): ReactElement`
- `kit.gallery.tsx`: `export const gallery: GallerySection` (section id `'kit'`)

Layering: `ui/kit/` never imports `design/` or `screens/`. `.tsx` files export components and types only. Gallery and test files declare no PascalCase local component. Every file header cites its spec sections and lots.

- [ ] **Step 1: Check preconditions and mark In progress**

Read `docs/agent/frontend.md` (Design system V7), `docs/agent/testing.md` (V7 test policy) and `DESIGN.md`. Run:

```bash
ls apps/client/src/{ui/asset-lookup.ts,ui/resource-captions.ts,ui/icons/icon.tsx,ui/icons/icon-names.ts,ui/primitives/pill.tsx,ui/card/card.tsx,ui/card/card-face.ts,ui/card/cost-amount.tsx,ui/card/glyph-amount.ts,view-model/kit-inspect-traits.ts,view-model/kit-special-card-key.ts,view-model/table-copy.ts,test/render.tsx,dev/gallery-registry.ts}
```

Expected: 14 paths print and none says "No such file". If one does, stop: a dependency is not Done. Then set the last cell of the `| L72-15 |` row in `docs/backlog_v7.md` to `In progress` (it ships in the task commit).

- [ ] **Step 2: Write the failing label test**

`kit-portrait-label.test.ts`, `describe('kitPortraitAlt (spec v7 §11)')`:
- `it.each(KIT_IDS)('uses the catalog name for %s')`: `kitPortraitAlt(kitId)` toBe `getKit(kitId).name`.
- `'names the Random face "Random kit"'`: `RANDOM_KIT_LABEL` and `kitPortraitAlt('random')` toBe `'Random kit'`.
- `'names an unrevealed kit "Hidden kit"'`: `HIDDEN_KIT_LABEL` and `kitPortraitAlt(null)` toBe `'Hidden kit'`.
- `'uses the kit name, not the art file name, for Scientific and Wizard'`: `'scientific'` → `'Scientific'`, `'wizard'` → `'Wizard'`.

- [ ] **Step 3: Run it and watch it fail**

`pnpm vitest run --project client apps/client/src/ui/kit/kit-portrait-label.test.ts` → `Failed to resolve import "./kit-portrait-label"`, `Test Files  1 failed (1)`.

- [ ] **Step 4: Implement the label helper**

`kitPortraitAlt`: `null` → `HIDDEN_KIT_LABEL`, `'random'` → `RANDOM_KIT_LABEL`, anything else → `getKit(kitId).name`.

- [ ] **Step 5: Run it and watch it pass**

Same command → `Tests  19 passed (19)`.

- [ ] **Step 6: Write the failing section-table test**

`kit-details-sections.test.ts`, `describe('kit details sections (L30-05, spec v7 §6.6.5)')`:
- `'lists the nine sections in display order'`: `KIT_DETAILS_SECTION_IDS` toEqual the nine ids listed under Produces, in that order.
- `'reuses the kit inspect titles verbatim'`: `KIT_DETAILS_SECTION_TITLES` toEqual `'Starting resources'`, `'Starting hand'`, `'Special cards'`, `'Always upgraded'`, `'Immune to'`, `'Attacks per turn'`, `'Upgrade points'`, `'Draw risk'`, `'Ability'`, one per id in order.
- `'maps every KitTraits key to a rendered section'`: `KIT_TRAIT_SECTION_FOR` toEqual `{ alwaysUpgraded: 'always-upgraded', immuneTo: 'immune-to', allowsMultipleAttacksPerTurn: 'attacks-per-turn', upgradePointBuyCost: 'upgrade-points', upgradePointSellYield: 'upgrade-points', drawBustDenominator: 'draw-risk' }`; `Object.keys(…).sort()` toEqual `[...KIT_TRAIT_SECTION_KEYS].sort()`; each mapped id is in `KIT_DETAILS_SECTION_IDS`.

- [ ] **Step 7: Run it and watch it fail**

`pnpm vitest run --project client apps/client/src/ui/kit/kit-details-sections.test.ts` → `Failed to resolve import "./kit-details-sections"`, `Test Files  1 failed (1)`.

- [ ] **Step 8: Implement the section table**

A pure `.ts` file: the ids `as const`, plus the titles and the mapping exactly as in Step 6. Use `import type { KIT_TRAIT_SECTION_KEYS }` so that a new `KitTraits` key fails typecheck.

- [ ] **Step 9: Run it and watch it pass**

Same command → `Tests  3 passed (3)`.

- [ ] **Step 10: Write the failing KitPortrait test**

`kit-portrait.test.tsx` (`// @vitest-environment happy-dom`). Helper: `portraitRoot(container)` returns `[data-zone="kit-portrait"]` or throws. `describe('KitPortrait (spec v7 §5.5, §11)')`:
- `it.each(KIT_IDS)('draws the extracted art for %s with alt = kit name')`: `screen.getByRole('img', { name: getKit(kitId).name })` has `src` toBe `artFor(kitId)`, matching `` new RegExp(`/art/kits/${kitId}\\.png$`) `` and not `/\(dead\)/i`; root `data-kit-face` is `'art'`.
- `'renders a code face named "Hidden kit" for an unrevealed kit'` (`kitId={null}`): role `img` named `'Hidden kit'`; `querySelector('img')` is null; `data-kit-face` is `'hidden'`.
- `'renders a distinct code face named "Random kit" for Random'`: role `img` named `'Random kit'`; no `<img>`; an `<svg>` is present; `data-kit-face` is `'random'`.
- `'greys an eliminated portrait and labels it "Eliminated" (L10-05)'` (`gambler`, `isEliminated`): `data-eliminated` is `'true'`, a `.grayscale` element is inside, role `img` named `'Eliminated'`.
- `'keeps a living portrait in colour with no Eliminated badge'` (`gambler`): `data-eliminated` is `'false'`, no `.grayscale`, no `img` named `'Eliminated'`.
- `'becomes one button named after the kit when clickable'` (`scientific`, `onClick = vi.fn()`): a button named `'Scientific'`, no `img` named `'Scientific'`; after `await user.click(button)`, `onClick` `toHaveBeenCalledTimes(1)`.
- `'uses ariaLabel as the button name when given'` (`null`, `onClick={vi.fn()}`, `ariaLabel="Ana's kit"`): a button named `"Ana's kit"`.

- [ ] **Step 11: Run it and watch it fail**

`pnpm vitest run --project client apps/client/src/ui/kit/kit-portrait.test.tsx` → `Failed to resolve import "./kit-portrait"`, `Test Files  1 failed (1)`.

- [ ] **Step 12: Implement KitPortrait**

`alt = kitPortraitAlt(kitId)`. Defaults: `size = 'tile'`, `isEliminated = false`, `className = ''`.
- Widths (3:4): `thumb` `w-10` 40 px, `tile` `w-18` 72 px, `sheet` `w-24` 96 px, `hero` `w-40` 160 px. Shape: `rounded-v7-card shadow-v7-card`. Use v7 utilities only, with no inline `var()`.
- Faces:
  - A `KitId`: `<img src={artFor(kitId)} alt={alt} draggable={false}>` on the `--card-face-0` → `--card-face-1` gradient.
  - `null`: `role="img" aria-label={alt}` on `bg-v7-panel-2`, with an `aria-hidden` "?" in `font-v7-display text-v7-text-2`.
  - `'random'`: `role="img" aria-label={alt}` with a decorative `<Icon name="random" />`.
- Eliminated: `grayscale` plus a corner `<Icon name="eliminated" label="Eliminated" />`. No dead art and no ✕.
- Root carries `data-zone="kit-portrait"`, `data-eliminated`, `data-kit-face`, `data-kit-size` and `[-webkit-touch-callout:none] select-none`.
- With `onClick`, the root is `<button type="button" aria-label={ariaLabel ?? alt}>` with `min-h-11 min-w-11` and a `--cta` focus outline. The face inside is decorative: `alt=""` on the img, and code faces get `aria-hidden="true"` and no role. Without `onClick`, the root is a `<span>`. Pass optional props with the conditional spread.

- [ ] **Step 13: Run it and watch it pass**

Same command → `Tests  22 passed (22)`.

- [ ] **Step 14: Write the failing KitDetails test**

`kit-details.test.tsx` (happy-dom). Helpers:
- `section(container, id)` returns `[data-kit-section="${id}"]` or throws. `part(root, selector)` returns the match or throws.
- `expectNumber(text: string, n)` asserts that the text matches `` new RegExp(`(^|\\D)${String(n)}(\\D|$)`) ``. Add no `?? ''`, because `textContent` is typed `string`.
- `expectedSections(kitId)` is the ids without `'ability'` when `KIT_ABILITY_COPY[kitId]` is undefined.
- `traitCardName(cardId, up)` is `cardFaceLabel({ name: getCard(cardId)?.name ?? cardId, isUpgraded: up, damage: cardDamageChip(cardId, up) })`.
- `afterEach(() => { vi.restoreAllMocks(); })`.
- Below, "buy", "sell" and "draw" mean `[data-kit-stat="upgrade-point-buy" | "upgrade-point-sell" | "draw"]`.

`describe('KitDetails for every kit (spec v7 §6.6.5, L30-05)')`, each test an `it.each(KIT_IDS)`:
- `'renders every section in order with its title for %s'`: the `[data-kit-section]` values toEqual `expectedSections(kitId)`; each section has a `heading` named `KIT_DETAILS_SECTION_TITLES[id]`; `section(container, KIT_TRAIT_SECTION_FOR[key])` exists for every `KIT_TRAIT_SECTION_KEYS` key.
- `'shows the KIT_CATALOG starting values for %s (spec v7 §5.5)'`: with values from `KIT_CATALOG[kitId]`, `expectNumber` on `[data-resource-kind="life" | "point" | "upgradePoint"]` gives `lives` / `points` / `upgradePoints`; draw contains `spokenGlyphAmount({ kind: 'points', amount: draw }, { signed: 'gain' })`; `[data-hand-family="action" | "attack"]` contains `` `×${counts.action}` `` / `` `×${counts.attack}` ``.
- `'renders versos, specials and trait cards as Card faces for %s'`:
  - `starting-hand` has exactly 2 `article`s named `HIDDEN_CARD_LABEL`, and its text does not match `/·/`.
  - The `special-cards` `[data-instance-id]` values toEqual `kit.specialCards.map((id, i) => kitSpecialCardKey(id, i))`.
  - For each `[data-special-key="<key>"]`, `cardCostChip(cardId, false)` is not null and the text contains `spokenGlyphAmount(cost, { signed: 'cost' })`.
  - `always-upgraded` / `immune-to` contain `'None'` when the trait list is empty. Otherwise each has one `article` per card, named `traitCardName(cardId, true)` / `traitCardName(cardId, false)`.
- `'states attacks per turn, prices, draw risk and ability for %s'`:
  - `attacks-per-turn` contains `'May play several attack cards as one action'` when `allowsMultipleAttacksPerTurn`, else `'One attack card per action'`.
  - Buy contains `spokenGlyphAmount({ kind: 'points', amount: upgradePointBuyCost(kitId) }, { signed: 'cost' })`. Sell is the same with `upgradePointSellYield(kitId)` and `'gain'`.
  - `draw-risk` contains `'None'` when `drawBustDenominator` is undefined, else `` `1 in ${traits.drawBustDenominator} chance each Draw` ``.
  - `ability` contains `KIT_ABILITY_COPY[kitId]` when it is defined.

`describe('KitDetails spec values')`:
- `'shows Scientific with versos, the Cloning cost and default prices (L51-04)'`:
  - `screen.getByRole('img', { name: 'Scientific' })`; `[data-kit-name]` text toBe `'Scientific'`.
  - Hand: `action` contains `'×5'` and `attack` contains `'×2'`; the hand text does not match `/\d+ action · \d+ attack/i`.
  - Draw contains `'plus 1 pt'`.
  - Specials: `article` `'Cloning'`, `getByText('Cloning')` and `'minus 3 pts'`.
  - Buy `'minus 10 pts'`, sell `'plus 7 pts'`.
  - `always-upgraded`: `article` `'Spy upgraded'` and `getByText('Spy')`.
  - `immune-to` and `draw-risk` contain `'None'`; there is no `[data-kit-section="ability"]`.
- `"renders each of Specialist's duplicate specials with its own key (L27-05)"`:
  - Spy on `console.error` with `vi.spyOn(console, 'error').mockImplementation(() => undefined)`.
  - Specials: 2 `article`s named `'Card Transformer'`, one `'Card Thief'`, one `'Super Absorber'`.
  - `[data-instance-id]` toEqual `['card-transformer:0', 'card-transformer:1', 'card-thief:2', 'super-absorber:3']`.
  - `errors.mock.calls`, filtered to calls with a string argument matching `/same key/i`, toEqual `[]`.
- `'renders Gambler from KIT_CATALOG, never from the kit PNG (spec v7 §5.5)'`:
  - `KIT_CATALOG.gambler.startingResources` toEqual `{ lives: 1, points: 0, upgradePoints: 0, draw: 10 }`, and `startingCardCounts` toEqual `{ action: 0, attack: 0 }`.
  - Rendered: life 1, point 0, upgradePoint 0; draw `'plus 10 pts'`; both hand families `'×0'`.
  - Specials: `article` `'Roulette'` and `'minus 10 pts'`.
  - `draw-risk` contains `'1 in 10 chance each Draw drops this player to 1 life, 0 points, 0 upgrade points, and no shield'`.
  - `ability` contains `'Each Draw has a 1-in-10 chance'`.
- `'uses the Upgrader price overrides (L27-01)'`: buy `'minus 5 pts'`, sell `'plus 7 pts'`.
- `'shows "None" for every empty trait group (Kamikaze)'`: `always-upgraded`, `immune-to` and `draw-risk` contain `'None'`; `attacks-per-turn` contains `'One attack card per action'`.

- [ ] **Step 15: Run it and watch it fail**

`pnpm vitest run --project client apps/client/src/ui/kit/kit-details.test.tsx` → `Failed to resolve import "./kit-details"`, `Test Files  1 failed (1)`.

- [ ] **Step 16: Implement KitDetails**

All visible copy is today's, taken verbatim from `screens/table/kit-inspect-details.tsx`. A module-private `Group` renders `<section data-kit-section={id} aria-labelledby={useId()}>` with an `<h3>` of `KIT_DETAILS_SECTION_TITLES[id]`. Groups follow `KIT_DETAILS_SECTION_IDS` order; `ability` renders only when `KIT_ABILITY_COPY[kitId]` exists.
- Root is `<div data-kit-id>`. The header is `<KitPortrait kitId={kitId} size="sheet" />` plus `<p data-kit-name="">{kit.name}</p>`.
- `starting-resources`: three `Pill`s with `icon: RESOURCE_ICON[k]`, `label: RESOURCE_CAPTIONS[k]`, `value` `lives` / `points` / `upgradePoints`, `resourceKind` `life` / `point` / `upgradePoint`, `tone` `life` / `point` / `upgrade`, and the caption sr-only. Then `<span data-kit-stat="draw" title="Draw action points">Draw <CostAmount amount={{ kind: 'points', amount: draw }} signed="gain" title={null} size="sm" /></span>`.
- `starting-hand`: the line "Random draws from action and attack cards. Duplicates are possible.", then `<li data-hand-family="action" | "attack">`. Each `li` holds `<Card face="hidden" family size="thumb" />`, the label "Action" / "Attack" and `×{count}`. Both families always render, `×0` included.
- `special-cards`: for each card, `key = kitSpecialCardKey(cardId, index)` and `<li key data-special-key={key}>` holds `<Card size="thumb" instance={{ instanceId: key, cardId, isUpgraded: false }} />`, the caption, and `<CostAmount amount={cost} signed="cost" size="sm" />` when `cardCostChip(cardId, false)` is non-null. An empty list (Prophet) stays empty.
- `always-upgraded` / `immune-to`: "None" when the list is empty. Otherwise each card is a `<Card size="thumb">` with `instanceId` `always-upgraded:<cardId>` / `immune-to:<cardId>` and `isUpgraded` `true` / `false`, plus the caption. The Card's upgraded badge replaces the V2 "↑".
- Caption: `<span data-card-caption className="font-v7-body text-v7-caption text-v7-text-2">{getCard(cardId)?.name ?? cardId}</span>`.
- `attacks-per-turn`: "May play several attack cards as one action" or "One attack card per action".
- `upgrade-points`: `data-kit-stat="upgrade-point-buy"` holds "Buy" and a `CostAmount` of `upgradePointBuyCost` with `cost`; `"upgrade-point-sell"` holds "Sell" and a `CostAmount` of `upgradePointSellYield` with `gain`; both `size="sm"`.
- `draw-risk`: "None", or, with `n = traits.drawBustDenominator`: `` `1 in ${String(n)} chance each Draw drops this player to 1 life, 0 points, 0 upgrade points, and no shield, and moves their hand and unplayed specials to the pool. Active cards stay. They are not eliminated.` ``
- `ability`: `KIT_ABILITY_COPY[kitId]` verbatim.
- Styling from tokens only: groups `rounded-v7-chrome-sm bg-v7-panel-2 p-3`; headings `font-v7-display text-v7-body text-v7-text`; prose `font-v7-body text-v7-text-2` (11 px floor); no V2 classes.

- [ ] **Step 17: Run it with the classic test and watch both pass**

`pnpm vitest run --project client apps/client/src/ui/kit/kit-details.test.tsx apps/client/src/screens/table/kit-inspect-dialog.test.ts` → `Test Files  2 passed (2)`, `Tests  74 passed (74)` (69 new + 5 unchanged).

- [ ] **Step 18: Write the failing gallery test**

`kit.gallery.test.tsx` (happy-dom), `describe('kit gallery section')`:
- `'registers the kit section with its entries'`: `gallery.id` is `'kit'`; the entry ids toEqual `['portrait-faces', 'portrait-sizes', 'portrait-roster', 'details-scientific', 'details-specialist', 'details-gambler', 'details-prophet']`.
- `it.each(gallery.entries)('renders the $id entry')`: `renderUi(<>{entry.render()}</>)` contains `[data-zone="kit-portrait"]`.

- [ ] **Step 19: Run it and watch it fail**

`pnpm vitest run --project client apps/client/src/ui/kit/kit.gallery.test.tsx` → `Failed to resolve import "./kit.gallery"`, `Test Files  1 failed (1)`.

- [ ] **Step 20: Implement the gallery section**

`{ id: 'kit', title: 'Kit', entries }`, with inline `render` arrows, in this order:
- `portrait-faces`: `scientific`, `null`, `'random'` and an eliminated `scientific`, all `tile`.
- `portrait-sizes`: `gambler` at each of the four sizes.
- `portrait-roster`: every `KIT_IDS` kit at `tile`.
- `details-scientific`, `details-specialist`, `details-gambler` and `details-prophet`, each on `bg-v7-panel`.

- [ ] **Step 21: Run the folder and check layering**

```bash
pnpm vitest run --project client apps/client/src/ui/kit/
grep -rnE "from '(\.\./)+(design|screens)/" apps/client/src/ui/kit/ ; echo "exit=$?"
```

Expected: `Test Files  5 passed (5)`, `Tests  121 passed (121)` (19 + 3 + 22 + 69 + 8). The grep finds no match and prints `exit=1`.

- [ ] **Step 22: Update DESIGN.md**

Add a `## Kit (ui/kit/, L72-15)` section:
- **KitPortrait**: sizes 40 / 72 / 96 / 160 px at 3:4. Faces are the art, "?" for Hidden and the `random` icon for Random; `alt` = kit name. Eliminated is grayscale plus the `eliminated` badge. Clickable mode is one 44 px button. The root keeps `data-zone="kit-portrait"` and `data-eliminated`.
- **KitDetails**: a header, then nine `data-kit-section` groups on `--panel-2`. Values come from `KIT_CATALOG`, never from art. The starting hand shows hidden versos × count. Special and trait cards are thumb `Card`s with a visible name caption. Costs use `CostAmount`, and empty trait groups say "None".
- L72-21 note: each special shows both the thumb's cost chip and a signed `CostAmount`.

Expected: `grep -n "Kit (ui/kit/, L72-15)" DESIGN.md` prints one line.

- [ ] **Step 23: Update docs/agent/frontend.md**

In the "Design system (V7 · Lot 72+)" section, add a `ui/kit/` bullet:
- `KitPortrait` and `KitDetails` replace `design/components/kit-portrait.tsx` and `screens/table/kit-inspect-details.tsx` on V7 surfaces: the L74 sheet and self strip, the L76 picker and the L72-16 rules strip.
- The classic files and their duplicated copy stay until L75 / L76.
- Values come from `KIT_CATALOG`.
- The anchors are `data-kit-section` and `data-zone="kit-portrait"`.
- `ui/kit/` never imports `design/` or `screens/`.

Expected: `grep -n "ui/kit/" docs/agent/frontend.md` prints at least one line.

- [ ] **Step 24: Record the replacement test in the classification**

In `docs/backlog_v7_test_classification.md`, find the two `kit-inspect-dialog.test.ts` rows "kit inspect trait sections (L30-05) > covers every KitTraits field exactly once" and "kit inspect starting hand (L51-04) > uses action and attack versos…". Append this to the last cell of each: "L72-15 wrote the component test: `apps/client/src/ui/kit/kit-details.test.tsx` (every kit renders every `KIT_TRAIT_SECTION_KEYS` section; Scientific versos ×5 / ×2 with no '·' prose; Draw, buy/sell and special costs spoken)."

Expected: `grep -c "ui/kit/kit-details.test.tsx" docs/backlog_v7_test_classification.md` prints `2`.

- [ ] **Step 25: Flip the backlog row to Done**

In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

Expected: `grep -n "^| L72-15 |" docs/backlog_v7.md` ends with `| Done |`.

- [ ] **Step 26: Run the full gate**

`pnpm verify` → exit 0. `tsc` and `eslint .` print nothing, and Vitest shows no failed or skipped line. The L72-07 no-emoji scan covers `ui/kit/`, and the classic `kit-inspect-dialog.test.ts` stays unchanged and green.

- [ ] **Step 27: Commit**

```bash
git add apps/client/src/ui/kit/kit-portrait-label.ts apps/client/src/ui/kit/kit-portrait-label.test.ts apps/client/src/ui/kit/kit-portrait.tsx apps/client/src/ui/kit/kit-portrait.test.tsx apps/client/src/ui/kit/kit-details-sections.ts apps/client/src/ui/kit/kit-details-sections.test.ts apps/client/src/ui/kit/kit-details.tsx apps/client/src/ui/kit/kit-details.test.tsx apps/client/src/ui/kit/kit.gallery.tsx apps/client/src/ui/kit/kit.gallery.test.tsx DESIGN.md docs/agent/frontend.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
git status --short
git commit -m "feat(ui): add kit portrait and details (L72-15)"
git log -1 --format=%B
```

Expected: only those 14 paths are staged (`A` / `M`). The message is that one subject line, with no body and no AI attribution (AGENTS.md §10).

**Decisions:**
- Section is ~22k chars, over the ~14k target. The five test files hold 121 tests, and I listed every assertion with its exact values. I shortened the tests to name and assertion lists rather than full code, and none was weakened.
- Critic fix applied: a thumb Card shows no name (L72-12). Each special and trait card thumb now gets a visible caption, getCard(cardId)?.name ?? cardId, so today's visible names stay. Tests assert getByText('Cloning') in special-cards and getByText('Spy') in always-upgraded.
- The Card's upgraded badge replaces the V2 '↑' on always-upgraded cards. The caption shows the plain name only.
- An eliminated KitPortrait gets grayscale plus a corner Icon 'eliminated' labelled 'Eliminated'. The contract says only grayscale, but parity row global-art-catalog asks for a greyscale + Eliminated badge, and the V7 icon rule replaces the ✕.
- Adds data attributes the contract does not name: data-kit-face and data-kit-size on the portrait root; data-kit-id, data-kit-name, data-hand-family, data-special-key, data-kit-stat (draw / upgrade-point-buy / upgrade-point-sell) and data-card-caption in KitDetails.
- The portrait keeps the V2 data-zone='kit-portrait' and data-eliminated, because fx/play-flyout.ts and the L74 self strip query them.
- Card needs a CardInstance, so KitDetails passes synthetic instance ids: kitSpecialCardKey(cardId, index) for specials, 'always-upgraded:<cardId>' and 'immune-to:<cardId>' for trait cards. They show up as data-instance-id.
- KitDetails shows the kit name (data-kit-name) next to the sheet portrait, as the brief asks. It may duplicate the L74/L76 sheet title, so this is flagged for the L72-21 critique.
- Each special shows both the thumb's own cost chip and a signed CostAmount row, as the contract asks. This is flagged as a design-gate note for L72-21.
- 'None' appears only in trait groups (always-upgraded, immune-to, draw-risk). Prophet's empty special list stays empty, because he starts with 2 random specials. Gambler's starting hand still shows both versos at ×0.
- Adds apps/client/src/ui/kit/kit.gallery.test.tsx, which the contract does not name. It checks the 'kit' section's entry ids and that every entry renders a kit portrait.
- Edits docs/backlog_v7_test_classification.md, which is not in the brief's Files list, to record the replacement test on the L30-05 and L51-04 kit-inspect-dialog rows.
- Classic kit-inspect-details.tsx, kit-inspect-dialog.tsx, its test and design/components/kit-portrait.tsx stay untouched until L75/L76. KitDetails duplicates their copy verbatim until then.
- Pinned values: portrait widths are thumb 40, tile 72, sheet 96 and hero 160 px at 3:4, and the default size is 'tile'. The root uses [-webkit-touch-callout:none] select-none, because long-press belongs to the caller (§6.6.5).
- KIT_TRAIT_SECTION_FOR is a Record keyed by KIT_TRAIT_SECTION_KEYS, so a new KitTraits key fails typecheck as well as the L30-05 test.
- The Ability section renders KIT_ABILITY_COPY verbatim. The Prophet copy fix belongs to L76 (§10.1).
- The Step 1 precondition ls uses brace expansion to keep the command short. It lists the same 14 files.

---

### Task L72-16: Rebuild the table rules strip and sheet in ui/

**Goal:** a read-only house-rules strip and sheet in `ui/rules/` for L74 (§6.11), L77 (§7.6) and L76 guests (§7.4), fed a `LobbyRules` whose seconds are server-effective and never clamped. No old screen, shared or protocol change (`PROTOCOL_VERSION` stays 45).

**Files:**
- Create: `apps/client/src/ui/rules/rules-summary.ts`
- Create: `apps/client/src/ui/rules/rules-sheet.tsx`
- Create: `apps/client/src/ui/rules/rules-strip.tsx`
- Create: `apps/client/src/ui/rules/rules.gallery.tsx`
- Modify: `apps/client/src/ui/ui-copy.ts` (append `TABLE_RULES_LABEL`)
- Modify: `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`
- Test: `apps/client/src/ui/rules/rules-summary.test.ts` (node)
- Test: `apps/client/src/ui/rules/rules-sheet.test.tsx` (happy-dom)
- Test: `apps/client/src/ui/rules/rules-strip.test.tsx` (happy-dom)

**Interfaces:**
- Consumes:
  - `@card-battle/shared`: `KIT_IDS`, `getKit(kitId: KitId): Kit`, `type KitId`, `type LobbyRules` (`{ excludedKitIds: readonly KitId[]; randomOnly: boolean; turnTimeSeconds: number }`), `defaultLobbyRules(): LobbyRules`, `excludeEveryKitButFirst(rules: LobbyRules): LobbyRules` (gallery only)
  - L72-05 `ui/motion/use-prefers-reduced-motion.ts`: `export function usePrefersReducedMotion(): boolean`
  - L72-06 `src/test/render.tsx`: `export function renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult` (`user`, `reducedMotion?`)
  - L72-07 `ui/icons/icon.tsx`: `export function Icon(props: IconProps): ReactElement` with names `'clock'` and `'random'`
  - L72-08 `ui/ui-copy.ts`: `export const EXCLUDED_LABEL = 'Excluded'`. `ui/primitives/button.tsx`: `export function Button(props: ButtonProps): ReactElement`. `dev/gallery-registry.ts`: `export interface GallerySection`
  - L72-09 `ui/primitives/sheet.tsx`: `export function Sheet(props: SheetProps): ReactElement | null` (`ReadOnlySheetProps`: `mode: 'read-only'; open; title; children; actions?; placement?: SheetPlacementPreference; onClose: () => void`)
  - L72-15 `ui/kit/kit-portrait.tsx`: `export function KitPortrait(props: KitPortraitProps): ReactElement`, where `kitId: LobbyKitSelection | null` and `size?: 'thumb' | 'tile' | 'sheet' | 'hero'`, and the image `alt` is `kitPortraitAlt(kitId)`, which is `getKit(id).name`
- Produces:
  - `apps/client/src/ui/rules/rules-summary.ts`: `export interface RulesKitFace { readonly kitId: KitId; readonly name: string; readonly excluded: boolean }` · `export function rulesKitFaces(rules: Pick<LobbyRules, 'excludedKitIds'>): readonly RulesKitFace[]` · `export function formatTurnTimeSeconds(seconds: number): string`
  - `apps/client/src/ui/ui-copy.ts`: `export const TABLE_RULES_LABEL = 'Table rules'`
  - `apps/client/src/ui/rules/rules-sheet.tsx`: `export interface RulesSheetProps { open: boolean; rules: LobbyRules; onClose: () => void }` · `export function RulesSheet(props: RulesSheetProps): ReactElement | null`
  - `apps/client/src/ui/rules/rules-strip.tsx`: `export interface RulesStripProps { rules: LobbyRules; className?: string }` · `export function RulesStrip(props: RulesStripProps): ReactElement`
  - `apps/client/src/ui/rules/rules.gallery.tsx`: `export const gallery: GallerySection` (section id `'rules'`)

---

- [ ] **Step 1: Mark the task In progress.** In `docs/backlog_v7.md`, change the last cell of the `| L72-16 |` row from `To do` to `In progress` (committed in Step 23). Check: `grep -n "^| L72-16 " docs/backlog_v7.md` ends with `| In progress |`.

- [ ] **Step 2: Write the failing summary test.** Create `apps/client/src/ui/rules/rules-summary.test.ts` (node, no pragma):

```ts
/** Table rules summary helpers (technical spec v7 §6.11, §7.4). */
import { describe, expect, it } from 'vitest';

import { getKit, KIT_IDS, type KitId } from '@card-battle/shared';

import { formatTurnTimeSeconds, rulesKitFaces } from './rules-summary';

describe('rulesKitFaces', () => {
  it('lists the 16 Classic kits in KIT_IDS order with catalog names', () => {
    const faces = rulesKitFaces({ excludedKitIds: [] });
    expect(faces).toHaveLength(16);
    expect(faces.map((face) => face.kitId)).toEqual([...KIT_IDS]);
    expect(faces.map((face) => face.name)).toEqual(KIT_IDS.map((kitId) => getKit(kitId).name));
    expect(faces.some((face) => face.excluded)).toBe(false);
  });

  it('flags exactly the excluded kits, in KIT_IDS order whatever order they arrive in', () => {
    const excludedKitIds: readonly KitId[] = ['gambler', 'ghost', 'untouchable'];
    const faces = rulesKitFaces({ excludedKitIds });
    expect(faces.map((face) => face.kitId)).toEqual([...KIT_IDS]);
    expect(faces.filter((face) => face.excluded).map((face) => face.kitId))
      .toEqual(['untouchable', 'ghost', 'gambler']);
  });
});

describe('formatTurnTimeSeconds', () => {
  it('renders whole seconds with an s suffix across the host range', () => {
    expect(formatTurnTimeSeconds(5)).toBe('5s');
    expect(formatTurnTimeSeconds(60)).toBe('60s');
    expect(formatTurnTimeSeconds(180)).toBe('180s');
  });

  it('never clamps a server default above the host maximum of 180', () => {
    expect(formatTurnTimeSeconds(300)).toBe('300s');
  });
});
```

- [ ] **Step 3: Run it and watch it fail.** `pnpm vitest run --project client apps/client/src/ui/rules/rules-summary.test.ts`. Expected: FAIL with `Failed to resolve import "./rules-summary" from "src/ui/rules/rules-summary.test.ts". Does the file exist?`

- [ ] **Step 4: Implement the summary helpers and the copy constant.**
  - `rules-summary.ts` (pure, imports only `@card-battle/shared`): map `KIT_IDS` to `{ kitId, name: getKit(kitId).name, excluded }`, checking each id against a `Set` of `excludedKitIds`. `formatTurnTimeSeconds` returns `` `${seconds}s` `` with no clamping or rounding. The header comment cites spec v7 §6.11 / §7.4 and parity row `lobby-rules-summary`.
  - `ui-copy.ts`: append `export const TABLE_RULES_LABEL = 'Table rules';` with a comment citing spec v7 §10.6.

- [ ] **Step 5: Run it and watch it pass.** Same command as Step 3. Expected: `Test Files  1 passed (1)`, `Tests  4 passed (4)`.

- [ ] **Step 6: Write the failing sheet test.** Create `apps/client/src/ui/rules/rules-sheet.test.tsx`:

```tsx
// @vitest-environment happy-dom
/** Read-only Table rules sheet (technical spec v7 §6.7, §6.11, §7.4; Q15). */
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getKit, KIT_IDS, type KitId, type LobbyRules } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { RulesSheet } from './rules-sheet';

const EDITABLE_ROLES = [
  'slider', 'checkbox', 'radio', 'switch', 'textbox', 'spinbutton', 'combobox', 'listbox',
] as const;

function rules(overrides: Partial<LobbyRules> = {}): LobbyRules {
  return { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60, ...overrides };
}

function kitFace(container: HTMLElement, kitId: KitId): HTMLElement {
  const face = container.querySelector<HTMLElement>(`[data-kit-id="${kitId}"]`);
  if (face === null) {
    throw new Error(`No kit face for ${kitId}`);
  }
  return face;
}

describe('RulesSheet', () => {
  it('renders nothing while closed', () => {
    renderUi(<RulesSheet open={false} rules={rules()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the turn time, Random only and every kit with the excluded ones labelled', () => {
    const excludedKitIds: readonly KitId[] = ['untouchable', 'wizard'];
    const shown = rules({ excludedKitIds, randomOnly: true, turnTimeSeconds: 300 });
    renderUi(<RulesSheet open rules={shown} onClose={vi.fn()} />);
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(within(sheet).getByText('Human turn')).toBeTruthy();
    expect(within(sheet).getByText('300s')).toBeTruthy();
    expect(within(sheet).getByText('Random')).toBeTruthy();
    expect(within(sheet).getAllByText('Excluded')).toHaveLength(2);
    for (const kitId of KIT_IDS) {
      const face = kitFace(sheet, kitId);
      const excluded = excludedKitIds.includes(kitId);
      expect(within(face).getByText(getKit(kitId).name)).toBeTruthy();
      expect(face.getAttribute('data-excluded'), kitId).toBe(excluded ? 'true' : 'false');
      expect(within(face).queryByText('Excluded') !== null, kitId).toBe(excluded);
    }
  });

  it('leaves the Random mark out when randomOnly is off', () => {
    renderUi(<RulesSheet open rules={rules()} onClose={vi.fn()} />);
    expect(within(screen.getByRole('dialog', { name: 'Table rules' })).queryByText('Random')).toBeNull();
  });

  it('has no editable control', () => {
    renderUi(<RulesSheet open rules={rules({ excludedKitIds: ['ghost'] })} onClose={vi.fn()} />);
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    for (const role of EDITABLE_ROLES) {
      expect(within(sheet).queryAllByRole(role), role).toHaveLength(0);
    }
    expect(
      sheet.querySelectorAll('input, select, textarea, [contenteditable], [aria-pressed]'),
    ).toHaveLength(0);
    for (const button of within(sheet).queryAllByRole('button')) {
      expect(button.getAttribute('aria-label') ?? button.textContent.trim()).toBe('Close');
    }
  });

  it('closes through onClose on Escape, as a read-only sheet', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<RulesSheet open rules={rules()} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes through onClose on Close', async () => {
    const onClose = vi.fn();
    const { user } = renderUi(<RulesSheet open rules={rules()} onClose={onClose} />);
    await user.click(
      within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('button', { name: 'Close' }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 7: Run it and watch it fail.** `pnpm vitest run --project client apps/client/src/ui/rules/rules-sheet.test.tsx`. Expected: FAIL with `Failed to resolve import "./rules-sheet"`.

- [ ] **Step 8: Implement `RulesSheet`** (`rules-sheet.tsx`, exports only `RulesSheetProps` and `RulesSheet`). Approach:
  - Shell: `<Sheet mode="read-only" open={open} title={TABLE_RULES_LABEL} placement="auto" onClose={onClose} actions={<Button variant="secondary" onClick={onClose}>Close</Button>}>`.
  - Body, in this order:
    - `Icon 'clock'` + "Human turn" + `formatTurnTimeSeconds(rules.turnTimeSeconds)` in `font-v7-display`.
    - Only when `randomOnly`: `Icon 'random'` + "Random".
    - A `<ul>` grid (4 columns, more at `sm:`) of `rulesKitFaces(rules)`. Each `<li key={face.kitId} data-kit-id={face.kitId} data-excluded={face.excluded ? 'true' : 'false'}>` holds `<span aria-hidden="true"><KitPortrait kitId={face.kitId} size="thumb" /></span>`, the name in `font-v7-body`, and an `EXCLUDED_LABEL` caption when excluded.
  - Put `opacity-40 grayscale` on the portrait span only. The name and caption keep `text-v7-text-2` at `text-v7-micro` or larger (Q15).
  - No input, no `aria-pressed`, and no button except Close. The header comment cites spec v7 §6.11, §7.4 and Q15.

- [ ] **Step 9: Run it and watch it pass.** Same command as Step 7. Expected: `Tests  6 passed (6)`.

- [ ] **Step 10: Write the failing strip test.** Create `apps/client/src/ui/rules/rules-strip.test.tsx`. Replace the `PASTE HERE` line with the `rules()` and `kitFace()` helpers from Step 6, copied exactly:

```tsx
// @vitest-environment happy-dom
/** Table rules strip (technical spec v7 §6.11, §7.4; Q15). */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getKit, KIT_IDS, type KitId, type LobbyRules } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { RulesStrip } from './rules-strip';

// PASTE HERE: rules() and kitFace() from rules-sheet.test.tsx (Step 6), verbatim.

function strip(): HTMLElement {
  return screen.getByRole('button', { name: 'Table rules' });
}

describe('RulesStrip', () => {
  it.each([
    { seconds: 45, label: '45s' },
    { seconds: 180, label: '180s' },
    { seconds: 300, label: '300s' },
  ])('shows $label from the received rules, never a clamped value', ({ seconds, label }) => {
    renderUi(<RulesStrip rules={rules({ turnTimeSeconds: seconds })} />);
    expect(within(strip()).getByText(label)).toBeTruthy();
  });

  it('shows the Random-only mark when randomOnly is set', () => {
    renderUi(<RulesStrip rules={rules({ randomOnly: true })} />);
    expect(within(strip()).getByText('Random')).toBeTruthy();
  });

  it('shows no Random-only mark when randomOnly is off', () => {
    renderUi(<RulesStrip rules={rules({ randomOnly: false })} />);
    expect(within(strip()).queryByText('Random')).toBeNull();
  });

  it('labels each excluded kit "Excluded" and leaves allowed kits unlabelled', () => {
    const excludedKitIds: readonly KitId[] = ['kamikaze', 'ghost', 'gambler'];
    renderUi(<RulesStrip rules={rules({ excludedKitIds })} />);
    expect(within(strip()).getAllByText('Excluded')).toHaveLength(3);
    for (const kitId of KIT_IDS) {
      const face = kitFace(strip(), kitId);
      const excluded = excludedKitIds.includes(kitId);
      expect(within(face).getByAltText(getKit(kitId).name)).toBeTruthy();
      expect(face.getAttribute('data-excluded'), kitId).toBe(excluded ? 'true' : 'false');
      expect(within(face).queryByText('Excluded') !== null, kitId).toBe(excluded);
    }
  });

  it('opens a read-only Table rules sheet with no editable control on tap', async () => {
    const { user } = renderUi(
      <RulesStrip rules={rules({ excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 300 })} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(strip());
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(within(sheet).getByText('300s')).toBeTruthy();
    expect(within(sheet).getByText('Random')).toBeTruthy();
    expect(within(sheet).getAllByText('Excluded')).toHaveLength(1);
    expect(within(sheet).queryAllByRole('slider')).toHaveLength(0);
    expect(
      sheet.querySelectorAll('input, select, textarea, [contenteditable], [aria-pressed]'),
    ).toHaveLength(0);
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(strip());
    });
  });

  it('marks the press motion reduced under prefers-reduced-motion', () => {
    renderUi(<RulesStrip rules={rules()} />, { reducedMotion: true });
    expect(strip().getAttribute('data-motion')).toBe('reduced');
  });

  it('marks the press motion full by default', () => {
    renderUi(<RulesStrip rules={rules()} />);
    expect(strip().getAttribute('data-motion')).toBe('full');
  });
});
```

- [ ] **Step 11: Run it and watch it fail.** `pnpm vitest run --project client apps/client/src/ui/rules/rules-strip.test.tsx`. Expected: FAIL with `Failed to resolve import "./rules-strip"`.

- [ ] **Step 12: Implement `RulesStrip`** (`rules-strip.tsx`, exports only `RulesStripProps` and `RulesStrip`; `className` defaults to `''`). Approach:
  - State: a local `open` state and `usePrefersReducedMotion()`. Return a fragment holding the button and `<RulesSheet open={open} rules={rules} onClose={() => { setOpen(false); }} />`.
  - Button: a native `<button type="button" aria-label={TABLE_RULES_LABEL} aria-haspopup="dialog" data-motion={reduced ? 'reduced' : 'full'} onClick={() => { setOpen(true); }}>`. Its children are phrasing content only.
  - Button classes: `border-[length:var(--chrome-outline-width)] border-v7-ink rounded-v7-chrome shadow-v7-chrome bg-v7-panel text-v7-text`, a 44 px minimum height, full width, left-aligned, then `className`. Add `active:translate-y-[var(--chrome-press-y)] active:shadow-none` only when motion is not reduced.
  - Row 1: `Icon 'clock'` + `formatTurnTimeSeconds(rules.turnTimeSeconds)` in `font-v7-display`. The value comes from the prop, never from `DEFAULT_TURN_TIME_SECONDS`. When `randomOnly`, add `Icon 'random'` + "Random" in `font-v7-body`.
  - Row 2: a wrapping row of the 16 `rulesKitFaces(rules)`. Each face is a `<span>` with the same `data-kit-id` and `data-excluded` as the sheet. It holds:
    - a portrait span with `<KitPortrait kitId={face.kitId} size="thumb" />`, with no `onClick`, so its `alt` names the kit
    - when excluded, an `EXCLUDED_LABEL` caption in `font-v7-body text-v7-micro text-v7-text-2` at full opacity
  - Put `opacity-40 grayscale` on the portrait span only.
  - The header comment cites spec v7 §6.11, §7.4, §11 and Q15, plus parity rows `lobby-rules-summary` and `rules-recall-table-end`. It also says that callers hide the strip when the rules are unknown and that the tutorial never mounts it.
  - Stop-check: if a non-clickable `KitPortrait` is not phrasing content or lacks `<img alt={kit name}>`, fix it in `ui/kit/`, not here.

- [ ] **Step 13: Run it and watch it pass.** Same command as Step 11. Expected: `Tests  9 passed (9)`.

- [ ] **Step 14: Add the gallery section.** Create `rules.gallery.tsx` on the L72-08 pattern: arrow `render` functions only, no local PascalCase component, and `import type { GallerySection } from '../../dev/gallery-registry'`. It exports `export const gallery: GallerySection = { id: 'rules', title: 'Rules', entries }` with four `RulesStrip` entries (tapping one opens the sheet):
  1. `'default'`: `defaultLobbyRules()`
  2. `'random-only'`: `{ excludedKitIds: ['kamikaze', 'ghost', 'gambler'], randomOnly: true, turnTimeSeconds: 45 }`
  3. `'server-default'`: `{ ...defaultLobbyRules(), turnTimeSeconds: 300 }`
  4. `'one-allowed'`: `excludeEveryKitButFirst(defaultLobbyRules())` (15 excluded)

- [ ] **Step 15: Run the folder and the gallery tests.** `pnpm vitest run --project client apps/client/src/ui/rules apps/client/src/dev`. Expected:
  - `ui/rules` gives `Test Files  3 passed` and `Tests  19 passed`.
  - Every `src/dev` test passes, which shows the `'rules'` id is unique and collected.
  - 0 failed.

- [ ] **Step 16: Typecheck and lint.** `pnpm typecheck && pnpm lint`. Expected: no error. Watch for these three:
  - `exactOptionalPropertyTypes` on `className`
  - `react-refresh/only-export-components` on the three `.tsx` files
  - `no-unnecessary-condition` on `button.textContent.trim()` (`textContent` is `string` on TS 5.9.3)

- [ ] **Step 17: Update `DESIGN.md`.** In the L72-08 / L72-09 components list, add an entry "Rules strip and sheet (`ui/rules/`, L72-16)" that covers:
  - **Strip:** one chrome-token button named "Table rules", with the press shown at full motion only. It shows the clock and `{n}s` in Lilita One as received (never clamped), the Random mark only when Random only is on, and 16 `thumb` portraits in `KIT_IDS` order.
  - **Excluded kit:** `opacity-40 grayscale` on the portrait only, plus a visible "Excluded" caption in `--text-2` at 11 px or larger (Q15).
  - **Sheet:** read-only with `auto` placement. Its only button is Close and it has no editable control.
  - **Copy:** "Table rules" and "Excluded" are §10.6 strings. "Human turn", "Random" and "Close" are reused.
  - **Later:** L76 adds the host editor in this folder.

- [ ] **Step 18: Update `docs/agent/frontend.md`.** In "Design system (V7 · Lot 72+)", add a `ui/rules/` bullet that says:
  - Callers supply `LobbyRules`: the L76 lobby, the L74 recall, and `FinishedStateView.lobbyRules` in L77.
  - Callers hide the strip when the rules are unknown, and the tutorial never mounts it.
  - Seconds are shown as received and may exceed 180.
  - L74's menu and L77's recall open `RulesSheet` directly.
  - L76 adds the host editor here: the slider sends on release, All / None / Random, and kit toggles.
  - `screens/lobby-rules-panel.tsx` stays until L76.

- [ ] **Step 19: Mark the task Done.** In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress. Check: `grep -n "^| L72-16 " docs/backlog_v7.md` ends with `| Done |`.

- [ ] **Step 20: Run the full gate.** `pnpm verify`. Expected: exit 0. tsc and ESLint are clean, and Vitest passes for shared, server and client with 0 failed and 0 skipped.

- [ ] **Step 21: Confirm the change set.** `git status --short` lists only the **Files** above. `screens/lobby-rules-panel.tsx` and `packages/shared/**` are untouched, and `git diff --stat packages/shared/src/protocol-version.ts` prints nothing.

- [ ] **Step 22: Defer the visual check.** This step does not block the task. The L72-21 gate checks the `/dev/ui` rules section at 375×812 and 1440×900 for strip wrapping, readable "Excluded" captions and sheet placement.

- [ ] **Step 23: Commit** (no AI attribution and no Co-Authored-By line, per AGENTS.md §10):

```bash
git add apps/client/src/ui/ui-copy.ts \
  apps/client/src/ui/rules/rules-summary.ts apps/client/src/ui/rules/rules-summary.test.ts \
  apps/client/src/ui/rules/rules-sheet.tsx apps/client/src/ui/rules/rules-sheet.test.tsx \
  apps/client/src/ui/rules/rules-strip.tsx apps/client/src/ui/rules/rules-strip.test.tsx \
  apps/client/src/ui/rules/rules.gallery.tsx \
  DESIGN.md docs/agent/frontend.md docs/backlog_v7.md
git commit -m "feat(ui): add table rules strip and sheet (L72-16)" \
  -m "Table rules is new spec v7 §10.6 copy for designer review. The sheet reuses the existing Human turn, Random and Close labels, so it adds no other string."
```

Check: `git log -1 --format=%s` prints `feat(ui): add table rules strip and sheet (L72-16)`.

**Decisions:**
- The critic fix filed for L72-16 is actually for L72-15 (KitDetails needs a visible caption under special and trait card thumbs). Nothing in L72-16 changes because of it.
- Kit faces in the strip (span) and the sheet (li) carry data-kit-id and data-excluded. These are new test and anchor hooks that the preserved-anchor list does not name. They only add markup.
- Only TABLE_RULES_LABEL goes into ui/ui-copy.ts. 'Human turn', 'Random' and 'Close' are existing labels written as literals in ui/rules. They are not §10.6 strings, and RulesSheetProps has no label props.
- The sheet lists all 16 kits, each with its visible name and an 'Excluded' caption when excluded, not only the excluded kits. This matches the shape of L76's toggle grid. The sheet portrait is aria-hidden because the visible name already names the kit.
- RulesSheet passes placement 'auto' to Sheet (the contract does not say): a bottom sheet on phones, centered on desktop. Its actions slot holds one secondary 'Close' Button, which gives the focus trap a target.
- The Random-only mark is Icon 'random' plus the word 'Random', as the contract says, not a KitPortrait kitId='random' face.
- The strip is a native <button> styled with the chrome tokens, not the L72-08 Button primitive, because it lays out a wrapping multi-row strip. It adds aria-haspopup='dialog' (not in the contract) and data-motion.
- The strip assumes L72-15's non-clickable KitPortrait is phrasing content that renders <img alt={kit name}>, since 16 of them sit inside one <button>. If that does not hold, fix ui/kit/ and leave the strip structure as is.
- formatTurnTimeSeconds never clamps. A TURN_DURATION_MS server default can exceed the host maximum of 180, and the tests pin '300s'.
- Tests use the literal strings 'Table rules', 'Excluded', 'Random', 'Human turn' and 'Close' rather than the constants, so a copy change fails a test.
- rules-strip.test.tsx copies the rules() and kitFace() helpers from rules-sheet.test.tsx instead of adding a shared test helper file. This keeps the Files list unchanged.

---

### Task L72-17: Rebuild the coach panel in ui/

Spec: v7 §4.2, §6.12, §8.3. Parity rows: `table-tutorial-coach`, `table-first-game-hints`, `first-game-hint-host`, `tutorial-overlays`. L72-04, -05, -06, -07, -08 and -11 must be Done first.

**Files:**
- Create: `apps/client/src/ui/coach/coach-panel.tsx`, `apps/client/src/ui/coach/coach.gallery.tsx`
- Test: `apps/client/src/ui/coach/coach-panel.test.tsx`
- Modify: `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`
- Leave untouched until L75 retires them (classification rows 183–185, 92). All are under `apps/client/src/`: `design/components/coach-panel.tsx`, `screens/table/tutorial-coach.tsx`, `help/hint-overlay.tsx`, the `.tutorial-coach-panel` CSS in `index.css`, `tutorial-callout.test.ts` and `hint-overlay.test.ts`.

**Interfaces:**
- Consumes (the files are listed in Step 1):
  - L72-04: `parseCoachBody(text: string): readonly CoachBodyPart[]`, `HIDE_COACH_ARIA_LABEL = 'Hide coach'`, `GOT_IT_ACTION_LABEL = 'Got it'`.
  - L72-11: `CostAmount(props: CostAmountProps): ReactElement`, `glyphAmountFromResource(kind: ResourceKind, amount: number): GlyphAmount`.
  - L72-07: `Icon(props: IconProps): ReactElement`, `RESOURCE_ICON`, the icon `'close'`.
  - L72-08: `IconButton(props: IconButtonProps): ReactElement`, `ScrollArea`, `Button` (gallery only), `GallerySection`.
  - L72-05: `usePrefersReducedMotion(): boolean`, `motionSpecFor(spec: V7MotionSpec, reduced: boolean): V7MotionSpec`, `durationS(duration: V7Duration): number`, `EASE_ENTRANCE: readonly [0.16, 1, 0.3, 1]`.
  - L72-06: `renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult`.
  - Unchanged: `HINT_COPY` and `SKIP_ALL_HINTS_LABEL = 'Skip all'` (`help/hint-copy.ts`); `tutorialStepAt` and `TUTORIAL_LOOK_COACH` (`@card-battle/shared`, gallery only).
- Produces (exact), in `apps/client/src/ui/coach/coach-panel.tsx`:
  - `export interface CoachPanelProps { title: string; body: string; zone: string; onHide: () => void; hideAriaLabel: string; footer?: ReactNode; extraAttrs?: Record<string, string>; compact?: boolean }`
  - `export function CoachPanel(props: CoachPanelProps): ReactElement`
  - `export interface CoachBodyProps { text: string }`
  - `export function CoachBody(props: CoachBodyProps): ReactElement`
  - Also `export const gallery: GallerySection` (id `'coach'`) in `apps/client/src/ui/coach/coach.gallery.tsx`.

---

- [ ] **Step 1: Check the prerequisites.**
  ```bash
  ls apps/client/src/{view-model/{tutorial-coach-copy,table-copy}.ts,ui/card/{cost-amount.tsx,glyph-amount.ts},ui/icons/{icon.tsx,icon-names.ts},ui/primitives/{icon-button,scroll-area,button}.tsx,ui/motion/{use-prefers-reduced-motion,reduced-motion,motion-tokens}.ts,test/render.tsx,dev/gallery-registry.ts} && grep -n "'close'" apps/client/src/ui/icons/icon-names.ts && grep -nE "^\| L72-(04|05|06|07|08|11) " docs/backlog_v7.md
  ```
  Pass: no "No such file" error, `'close'` is found, and every listed row ends in `| Done |`. If any check fails, stop.

- [ ] **Step 2: Mark the task In progress.** In `docs/backlog_v7.md`, set the last cell of the `| L72-17 |` row to `In progress`. This change goes into the Step 14 commit. Check: `grep -n "^| L72-17 " docs/backlog_v7.md` ends with `| In progress |`.

- [ ] **Step 3: Write the failing test** `apps/client/src/ui/coach/coach-panel.test.tsx`. The coach bodies are literal fixtures. The spoken strings come from `spokenCost` / `formatCardCost` and from L72-11's shield rule.
  ```tsx
  // @vitest-environment happy-dom
  /** V7 coach panel — technical spec v7 §6.12, §8.3; parity `table-tutorial-coach`, `table-first-game-hints`.
   * Panel half of the classified tutorial-callout "coach overlay can hide and reopen" row (§12.1). */
  import { screen, within } from '@testing-library/react';
  import { describe, expect, it, vi } from 'vitest';

  import { renderUi, type RenderUiOptions, type RenderUiResult } from '../../test/render';
  import { GOT_IT_ACTION_LABEL, HIDE_COACH_ARIA_LABEL } from '../../view-model/table-copy';
  import { CoachBody, CoachPanel, type CoachPanelProps } from './coach-panel';

  type Overrides = Partial<Omit<CoachPanelProps, 'hideAriaLabel'>>;
  function renderPanel(overrides: Overrides = {}, options: RenderUiOptions = {}): RenderUiResult {
    return renderUi(
      <CoachPanel title="Tax" body="Play Tax." zone="tutorial-coach" onHide={vi.fn<() => void>()}
        hideAriaLabel={HIDE_COACH_ARIA_LABEL} {...overrides} />,
      options,
    );
  }
  function coachRoot(zone: string): HTMLElement {
    const root = document.querySelector<HTMLElement>(`[data-zone="${zone}"]`);
    if (root === null) throw new Error(`no coach root with data-zone="${zone}"`);
    return root;
  }
  function onlyMatch(scope: HTMLElement, selector: string): HTMLElement {
    const matches = scope.querySelectorAll<HTMLElement>(selector);
    expect(matches).toHaveLength(1);
    return matches.item(0);
  }
  const TUTORIAL_ATTRS = { 'data-tutorial-index': '1', 'data-tutorial-coach-open': 'true' };
  const ROOT_ATTR_CASES: readonly { zone: string; compact: boolean; extraAttrs: Record<string, string> }[] = [
    { zone: 'first-game-hint', compact: true, extraAttrs: { 'data-hint-id': 'draw' } },
    { zone: 'tutorial-coach', compact: false, extraAttrs: TUTORIAL_ATTRS },
  ];

  describe('CoachPanel (technical spec v7 §6.12)', () => {
    it('renders bold markers as strong text and drops the ** markers', () => {
      renderPanel({ title: 'Draw', body: '**Draw** gives you **points**. Draw once.', zone: 'first-game-hint', compact: true });
      const root = coachRoot('first-game-hint');
      const strongs = root.querySelectorAll('strong');
      expect(strongs).toHaveLength(2);
      expect(strongs.item(0).textContent).toBe('Draw');
      expect(strongs.item(1).querySelector('[data-coach-resource="point"]')?.textContent).toBe('points');
      expect(root.textContent).not.toContain('**');
      expect(root.textContent).toContain('gives you');
      expect(root.textContent).toContain('Draw once.');
    });

    it('renders numbered resource words as cost glyphs with spoken text', () => {
      renderPanel({ body: 'Tax spends **1 life** and gives you **+4 points**. You keep **2 upgrade points** and **3 shield points**.' });
      const root = coachRoot('tutorial-coach');
      const expected = [
        { resource: 'life', spoken: '1 life' },
        { resource: 'point', spoken: 'plus 4 pts' },
        { resource: 'upgradePoint', spoken: '2 upgrade points' },
        { resource: 'shield', spoken: '3 shield points' },
      ] as const;
      for (const { resource, spoken } of expected) {
        const glyph = onlyMatch(root, `[data-coach-resource="${resource}"]`);
        expect(within(glyph).getByText(spoken)).toBeInstanceOf(HTMLElement);
        expect(glyph.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        expect(glyph.closest('strong')).not.toBeNull();
      }
      expect(root.textContent).not.toContain('**');
    });

    it('renders bare resource words as the word plus a decorative icon', () => {
      renderPanel({ body: 'Your **lives** are your health. A Shield does not stop that.' });
      const root = coachRoot('tutorial-coach');
      const lives = onlyMatch(root, '[data-coach-resource="life"]');
      expect(lives.textContent).toBe('lives');
      expect(lives.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(lives.closest('strong')).not.toBeNull();
      const shield = onlyMatch(root, '[data-coach-resource="shield"]');
      expect(shield.textContent).toBe('Shield');
      expect(shield.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(shield.closest('strong')).toBeNull();
    });

    it('calls onHide from the labelled close control', async () => {
      const onHide = vi.fn<() => void>();
      const { user } = renderPanel({ onHide });
      const hide = screen.getByRole('button', { name: HIDE_COACH_ARIA_LABEL });
      expect(hide.textContent).not.toContain('×');
      expect(hide.querySelector('svg')).not.toBeNull();
      await user.click(hide);
      expect(onHide).toHaveBeenCalledTimes(1);
    });

    it('renders the footer slot', async () => {
      const onAck = vi.fn<() => void>();
      const { user } = renderPanel({
        title: 'Your zone',
        body: 'This dock is **your zone**.',
        footer: <button type="button" data-tutorial-ack="got-it" onClick={onAck}>{GOT_IT_ACTION_LABEL}</button>,
      });
      const ack = within(coachRoot('tutorial-coach')).getByRole('button', { name: GOT_IT_ACTION_LABEL });
      expect(ack.getAttribute('data-tutorial-ack')).toBe('got-it');
      await user.click(ack);
      expect(onAck).toHaveBeenCalledTimes(1);
    });

    it('renders only the hide control without a footer', () => {
      renderPanel();
      expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([HIDE_COACH_ARIA_LABEL]);
    });

    it('is a non-modal hovering panel with no Skip control', () => {
      renderPanel({ extraAttrs: TUTORIAL_ATTRS, footer: <button type="button">{GOT_IT_ACTION_LABEL}</button> });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.queryByRole('alertdialog')).toBeNull();
      const root = coachRoot('tutorial-coach');
      expect(root.getAttribute('role')).toBeNull();
      expect(root.getAttribute('aria-modal')).toBeNull();
      expect(screen.queryByRole('button', { name: /skip/i })).toBeNull();
      expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
        HIDE_COACH_ARIA_LABEL,
        GOT_IT_ACTION_LABEL,
      ]);
    });

    it.each(ROOT_ATTR_CASES)('puts data-zone and extra attributes on the root ($zone)', ({ zone, compact, extraAttrs }) => {
      renderPanel({ title: 'Draw', body: 'Draw once.', zone, compact, extraAttrs });
      const root = coachRoot(zone);
      for (const [name, value] of Object.entries(extraAttrs)) expect(root.getAttribute(name)).toBe(value);
      expect(root.getAttribute('data-motion')).not.toBeNull();
      const heading = within(root).getByRole('heading', { level: 2, name: 'Draw' });
      expect(root.getAttribute('aria-labelledby')).toBe(heading.id);
    });

    it('marks the full-motion entrance by default', () => {
      renderPanel();
      expect(coachRoot('tutorial-coach').getAttribute('data-motion')).toBe('full');
    });

    it('skips the enter animation under reduced motion', () => {
      renderPanel({}, { reducedMotion: true });
      const root = coachRoot('tutorial-coach');
      expect(root.getAttribute('data-motion')).toBe('reduced');
      expect(root.style.opacity).not.toBe('0');
      expect(root.style.transform).not.toMatch(/translate|scale/);
    });
  });

  describe('CoachBody', () => {
    it('renders parsed copy without panel chrome', () => {
      const { container } = renderUi(<CoachBody text="Tax spends **1 life**." />);
      expect(container.querySelector('h2')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
      expect(container.querySelector('strong [data-coach-resource="life"]')).not.toBeNull();
      expect(screen.getByText('1 life')).toBeInstanceOf(HTMLElement);
    });
  });
  ```

- [ ] **Step 4: Run the test and confirm it fails.** Run: `pnpm vitest run --project client apps/client/src/ui/coach/coach-panel.test.tsx`. Expected FAIL: `Failed to resolve import "./coach-panel" from "src/ui/coach/coach-panel.test.tsx"` and `Test Files  1 failed (1)`.

- [ ] **Step 5: Implement** `apps/client/src/ui/coach/coach-panel.tsx`. Approach: put the V6 props on a `motion.aside` with V7 tokens, and run the body through `parseCoachBody`.
  - **Exports and imports:** export only the Produces names; `CoachPart` stays private. Import only from `motion/react`, `react`, `view-model/` and `ui/`.
  - **Header comment:** cites v7 §4.2/§6.12/§8.3 and v6 §5.4 ("not a Dialog; the table stays clickable").
  - **Entrance:** mirrors V6 `@keyframes tutorial-coach-in`:
    ```ts
    const COACH_ENTER: V7MotionSpec = {
      initial: { opacity: 0, y: -8, scale: 0.96 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { type: 'tween', duration: durationS('base'), ease: EASE_ENTRANCE },
    };
    ```
  - **Root attributes**, in this order:
    1. `data-zone`
    2. `{...(extraAttrs ?? {})}`
    3. `data-motion` (`'reduced'` or `'full'`). It comes after the spread so `extraAttrs` cannot override it.
    4. `aria-labelledby`, pointing at the `useId` title.

    Never set `role` or `aria-modal`.
  - **Root motion:** set `initial={reduced ? false : (enter.initial ?? false)}`, where `enter = motionSpecFor(COACH_ENTER, reduced)`. Pass `transition` only through a conditional spread.
  - **Root classes:** always `border-[length:var(--chrome-outline-width)] border-v7-ink shadow-v7-chrome text-v7-text`, plus:
    - default: `rounded-v7-chrome bg-v7-panel/[0.9] backdrop-blur-[6px] max-h-[min(52vh,28rem)]`
    - compact: `rounded-v7-chrome-sm bg-v7-panel/[0.72] backdrop-blur-[10px] max-h-[min(32vh,12rem)]`. 0.72 is the floor.
  - **Header** (`bg-v7-panel-2`, ink `border-b-2`):
    - `<h2 id={titleId}>` in `font-v7-display`, `text-v7-title` (compact: `text-v7-body`);
    - then `<IconButton icon="close" aria-label={hideAriaLabel} variant="quiet" onClick={onHide} />`, 44 px in both variants.
  - **Body:** `<ScrollArea axis="y">` in `font-v7-body font-bold`, `text-v7-body` (compact: `text-v7-caption`), containing `<CoachBody text={body} />`.
  - **Footer:** rendered only when `footer !== undefined`. It has a `border-t-2` and lays out as `flex-col` (compact: `flex-row`).
  - **`CoachBody`:** a `<p>`. Bold parts go in `<strong>`. A resource part is a `span[data-coach-resource]` containing:
    - when `amount !== null`: `<CostAmount amount={glyphAmountFromResource(resource, amount)} size="md" />`, adding `signed: 'gain'` when the sign is `'+'`;
    - otherwise: the word, followed by a decorative `<Icon name={RESOURCE_ICON[resource]} size={16} />`.

- [ ] **Step 6: Run the test and confirm it passes.** Re-run the Step 4 command. Expected PASS: `Test Files  1 passed (1)` and `Tests  12 passed (12)`.

- [ ] **Step 7: Add the gallery** `apps/client/src/ui/coach/coach.gallery.tsx`. It exports only `export const gallery: GallerySection = { id: 'coach', title: 'Coach', entries }` and has no PascalCase local component. Fixtures: `taxCoach = tutorialStepAt(1)?.coach ?? TUTORIAL_LOOK_COACH`, `thiefTaxCoach = tutorialStepAt(21)?.coach ?? TUTORIAL_LOOK_COACH`, and `noop`. Every entry passes `onHide={noop}` and `hideAriaLabel={HIDE_COACH_ARIA_LABEL}`.
  - `tutorial-ack`, "Tutorial coach with Got it":
    - `taxCoach` at `w-[min(22rem,calc(100vw-1rem))]`;
    - `zone="tutorial-coach"`, `data-tutorial-index` `'1'`, `data-tutorial-coach-open` `'true'`;
    - footer: a primary, fullWidth `GOT_IT_ACTION_LABEL` `Button`.
  - `tutorial-plain`, "Tutorial coach without footer": `thiefTaxCoach` at the same width. It shows the `+4 points` gain glyph.
  - `hint-compact`, "First-game hint (compact)":
    - `compact` at `w-[min(15.5rem,calc(100vw-1rem))]`, with `HINT_COPY.draw`;
    - `zone="first-game-hint"`, `data-hint-id` `'draw'`;
    - footer: a primary `GOT_IT_ACTION_LABEL` button and a quiet `SKIP_ALL_HINTS_LABEL` button.

- [ ] **Step 8: Run lint and the related tests.** Run: `pnpm exec eslint apps/client/src/ui/coach && pnpm vitest run --project client apps/client/src/dev tutorial-callout hint-overlay`. Expected:
  - ESLint prints nothing.
  - Vitest reports 0 failed: `'coach'` raises no duplicate-id throw, and the V6 tests left untouched stay green.

- [ ] **Step 9: Check the gallery by eye.** On the `client` preview (port 5173), open `/dev/ui` at 375×812. Pass:
  - three panels are shown;
  - resource icons sit inline in the text;
  - the compact hint is readable over `.v7-ground`;
  - the close control is an SVG, not a `×` character.

  Stop the preview afterwards. If the blur gets flagged, the L72-21 gate decides.

- [ ] **Step 10: Update `DESIGN.md`.** Add a components entry, `Coach panel — ui/coach/ (L72-17)`:
  - **Element:** a hovering `<aside>` named by its title. It is never a dialog or modal, and hosts position it (L75).
  - **Values:** the Step 5 surface, max-height and type values.
  - **Why 72% is the floor:** `--text` stays about 6.1:1 over `#fff` (about 10.6:1 at 90%). V6's 46% gave about 2.6:1.
  - **Amounts:** rendered with `CostAmount`. `+` is spoken "plus", and a shield "N shield points". A bare word gets a decorative `RESOURCE_ICON`.
  - **Controls:** a 44 px close button and no Skip.
  - **Entrance:** opacity 0→1, y −8→0, scale 0.96→1, over `--dur-base` with `--ease-entrance`. It renders at rest under reduced motion.

  Check: `grep -n "ui/coach" DESIGN.md` prints the entry.

- [ ] **Step 11: Update `docs/agent/frontend.md`.** In "Design system (V7 · Lot 72+)", add one bullet for `ui/coach/coach-panel.tsx`:
  - It provides `CoachPanel` / `CoachBody` (L72-17), with the props of `design/components/coach-panel.tsx`.
  - It is the L75 drop-in for `tutorial-coach.tsx` and `help/hint-overlay.tsx`.
  - It is not a dialog and has no Skip; Skip stays on the flag (Lot 45).
  - The caller passes the hide label.
  - The body goes through `parseCoachBody` into `CostAmount` / `Icon`.
  - `compact` has a 72% floor.
  - Copy comes only from the shared tutorial and hint copy.
  - The V6 panel and its CSS stay until L75.

  Check: `grep -n "ui/coach/coach-panel.tsx" docs/agent/frontend.md` matches.

- [ ] **Step 12: Mark the task Done.** In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress. Check: `grep -n "^| L72-17 " docs/backlog_v7.md` ends with `| Done |`.

- [ ] **Step 13: Run the full gate.** Run: `pnpm verify`. Pass: exit 0, `tsc` and ESLint clean, and Vitest with 0 failed and 0 skipped.

- [ ] **Step 14: Commit this task on its own,** with no AI attribution:
  ```bash
  git add apps/client/src/ui/coach/coach-panel.tsx apps/client/src/ui/coach/coach-panel.test.tsx apps/client/src/ui/coach/coach.gallery.tsx DESIGN.md docs/agent/frontend.md docs/backlog_v7.md
  git commit -m "feat(ui): rebuild coach panel in ui/ (L72-17)" -m "Compact hint surface uses 72% panel alpha instead of V6's 46%: --text stays at or above 4.5:1 even over a white card face (about 6.1:1). Recorded in DESIGN.md."
  ```
  Check: `git log -1 --format=%s` prints `feat(ui): rebuild coach panel in ui/ (L72-17)`, and `git status --short` lists none of the six paths.

**Decisions:**
- The compact hint surface is --panel at 72% alpha with a 10 px blur (default: 90% with 6 px), replacing V6's 46% (parity row table-first-game-hints). At 46%, --text over a white V7 card face is about 2.6:1; at 72% it is about 6.1:1. Recorded in DESIGN.md and in the commit body.
- The compact hide control stays 44 px (V6's compact variant used 32 px), per the v7 §5.3 rule of touch targets at least 44 px and IconButton's fixed 44x44.
- The contract makes CoachBodyProps { text } only, so V6 CoachBody's compact parameter is dropped. CostAmount renders at size 'md' and Icon at 16 in both variants.
- Each resource part is wrapped in span[data-coach-resource], not the preserved data-resource-kind, so the fx/play-flyout resource selectors never match coach glyphs. The root also gets aria-labelledby (useId title) and data-motion; no exported signature changes.
- Numeric shield amounts in coach copy (e.g. '3 shield points') now render through CostAmount with the shield GlyphAmount and speak 'N shield points'. V6 showed a bare number plus an image with no spoken amount.
- The test expects 'plus 4 pts' from spokenCost/formatCardCost, unchanged from V6's CostDisplay. L72-11's acceptance line says '3 points'; if L72-11 changes spokenGlyphAmount for points, these expected strings must change with it.
- The contract and spec give no entrance values. The plan copies V6 @keyframes tutorial-coach-in: opacity 0->1, y -8->0, scale 0.96->1, over --dur-base with EASE_ENTRANCE. Under reduced motion it uses initial={false} (renders at rest, no fade), matching V6's animation:none rather than reduceMotionSpec's fade-only output.
- Test fixtures are literal coach bodies modeled on the shared script and the hint copy, not imported step copy, so L75-01's copy fixes cannot break this test. The /dev/ui gallery uses the real tutorialStepAt, TUTORIAL_LOOK_COACH and HINT_COPY strings.
- The test uses a local renderPanel(overrides, options) helper with defaults title 'Tax', body 'Play Tax.' and zone 'tutorial-coach'. It removes repeated props; all 12 original test names and every assertion are kept.

---

### Task L72-18: Rebuild table banner cues in ui/

**Spec:** technical spec v7 §4.2, §6.12, §8.1, §8.3 · **Parity:** `table-banners`, `end-finished-board-shell`, `global-motion-reduced-motion` · **Review focus:** the `<StrictMode>` first-paint test is written now (classification rows L51-06 / L63-03).

**Files** (new files all in `apps/client/src/ui/banner/`):
- Create: `banner-items.ts`, `table-banner-host.tsx`, `banner-demo.tsx` (DEV only), `banner.gallery.tsx`
- Test: `banner-items.test.ts` (node), `table-banner-host.test.tsx` (happy-dom, fake timers), `banner.gallery.test.tsx` (happy-dom)
- Modify: `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`
- Untouched: `apps/client/src/screens/table/your-turn-flash.tsx` (keeps `TableBannerFlash` until L75), `apps/client/src/view-model/table-banner.ts`

**Interfaces:**
- Consumes:
  - `apps/client/src/view-model/table-banner.ts` (L72-04): `TABLE_BANNER_MS = 1600`, `TABLE_BANNER_COPY: Record<TableBannerCue, string>`, `WIPE_BANNER_COPY`, `type TableBannerCue = 'turn' | 'attacked' | 'dead' | 'won'`, `isFlashierBanner(cue: TableBannerCue): boolean`, `emptyTableBannerWatch(): TableBannerWatch`, `emptySentenceBannerWatch(): SentenceBannerWatch`, `nextTableBannerCues(prev: TableBannerWatch, input: TableBannerInput): { cues: TableBannerCue[]; next: TableBannerWatch }`, `nextSentenceBannerLines(prev: SentenceBannerWatch, input: SentenceBannerInput)`, `nextWipeBannerLines(prev: SentenceBannerWatch, entries: readonly ActionLogEntryView[], you: string)`
  - `apps/client/src/ui/` (L72-05): `palette.ts` `V7_COLORS`, `V7_SEAT_COLORS`, `v7SeatColor(index: number): string` · `contrast.ts` `contrastRatio(foreground: string, background: string): number`, `WCAG_AA_TEXT = 4.5` · `motion/motion-tokens.ts` `durationS(duration: V7Duration): number`, `EASE_ENTRANCE: readonly [0.16, 1, 0.3, 1]` · `motion/reduced-motion.ts` `V7MotionSpec`, `motionSpecFor(spec: V7MotionSpec, reduced: boolean): V7MotionSpec` · `motion/use-prefers-reduced-motion.ts` `usePrefersReducedMotion(): boolean`
  - `apps/client/src/ui/layers.ts` (L72-09): `Z_INDEX: { readonly sheet: 50; readonly sheetBar: 80; readonly banner: 90; readonly toast: 95 }`
  - `apps/client/src/test/render.tsx` (L72-06/09): `renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult`
  - L72-08: `apps/client/src/dev/gallery-registry.ts` `GallerySection` · `apps/client/src/ui/primitives/button.tsx` `Button(props: ButtonProps): ReactElement`
  - `@card-battle/shared`: `PendingEffectView`, `SentenceAnnouncementLogEntry`, `ActionLogEntryView`
- Produces:
  - `banner-items.ts`: `export type BannerKind = TableBannerCue | 'sentence' | 'wipe'` · `export interface BannerItem { readonly key: string; readonly kind: BannerKind; readonly text: string }` · `export function bannerLiveMode(kind: BannerKind): 'polite' | 'assertive'` · `export function bannerItemsForCues(cues: readonly TableBannerCue[], startSeq: number): BannerItem[]`
  - `table-banner-host.tsx`: `export interface TableBannerHostProps { isMyTurn: boolean; isEliminated: boolean; youWon: boolean; pendingEffects: readonly PendingEffectView[]; sentenceAnnouncements: readonly SentenceAnnouncementLogEntry[]; actionLog: readonly ActionLogEntryView[]; nicknameOf: (id: string) => string; you: string; seatColor?: string }` · `export function TableBannerHost(props: TableBannerHostProps): ReactElement`
  - `banner.gallery.tsx`: `export const gallery: GallerySection` (id `'banner'`)
  - DEV only, `banner-demo.tsx`: `export interface BannerDemoProps { kind: BannerKind; seatColor?: string }` · `export function BannerDemo(props: BannerDemoProps): ReactElement`
- Later consumers: L74-17 mounts the host; L77 keeps the Game over delay at `TABLE_BANNER_MS`; L78-11 restyles it.

---

- [ ] **Step 1: Mark In progress.** In `docs/backlog_v7.md`, set the L72-18 Status from `To do` to `In progress` (committed in Step 22). Check: `grep -n '^| L72-18 ' docs/backlog_v7.md` ends with `| In progress |`.

- [ ] **Step 2: Preflight.**
  ```bash
  (cd apps/client/src && ls view-model/{table-banner,action-log}.ts ui/{palette,contrast,layers}.ts ui/motion/{motion-tokens,reduced-motion,use-prefers-reduced-motion}.ts test/render.tsx dev/gallery-registry.ts ui/primitives/button.tsx && grep -n "wrapper" test/render.tsx)
  pnpm vitest run --project client apps/client/src/test/render.test.tsx
  ```
  Pass: no `No such file`; `render.tsx` passes providers through RTL's `wrapper` (so `rerender` keeps the host mounted); `Test Files  1 passed`. A missing file means L72-03/04/05/06/08/09 are not merged: stop.

- [ ] **Step 3: Write the failing items test** `apps/client/src/ui/banner/banner-items.test.ts`:
  ```ts
  /** Banner items — L72-18 (technical spec v7 §6.12, §8.1; L51-06, L63-03, L67-01). */
  import { describe, expect, it } from 'vitest';

  import { contrastRatio, WCAG_AA_TEXT } from '../contrast';
  import { V7_COLORS, V7_SEAT_COLORS } from '../palette';
  import { bannerItemsForCues, bannerLiveMode } from './banner-items';

  describe('banner items (L72-18)', () => {
    it('maps cues to keyed items with the locked copy, in order', () => {
      expect(bannerItemsForCues(['attacked', 'turn'], 5)).toEqual([
        { key: 'attacked:5', kind: 'attacked', text: 'You are being attacked' },
        { key: 'turn:6', kind: 'turn', text: 'Your turn' },
      ]);
      expect(bannerItemsForCues(['won'], 0)).toEqual([{ key: 'won:0', kind: 'won', text: 'You won!' }]);
      expect(bannerItemsForCues(['dead'], 2)).toEqual([{ key: 'dead:2', kind: 'dead', text: 'You are dead' }]);
      expect(bannerItemsForCues([], 9)).toEqual([]);
    });

    it('announces Sentence and wipe assertively and the four cues politely', () => {
      for (const kind of ['turn', 'attacked', 'dead', 'won'] as const) {
        expect(bannerLiveMode(kind)).toBe('polite');
      }
      expect(bannerLiveMode('sentence')).toBe('assertive');
      expect(bannerLiveMode('wipe')).toBe('assertive');
    });

    it('keeps the --text-on-cta label at AA on every banner fill', () => {
      for (const fill of [V7_COLORS.cta, V7_COLORS['threat-attack'], V7_COLORS.danger, ...V7_SEAT_COLORS]) {
        expect(contrastRatio(V7_COLORS['text-on-cta'], fill)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
      }
    });
  });
  ```

- [ ] **Step 4: Watch it fail.** `pnpm vitest run --project client apps/client/src/ui/banner/banner-items.test.ts` → `Failed to resolve import "./banner-items"`, `Test Files  1 failed (1)`.

- [ ] **Step 5: Implement `banner-items.ts`** (Produces exports; header cites spec v7 §6.12 / §8.1, L51-06, L63-03, L67-01; imports `TABLE_BANNER_COPY`, `type TableBannerCue` from `'../../view-model/table-banner'`). `bannerLiveMode`: `'assertive'` for `sentence` / `wipe`, else `'polite'`. `bannerItemsForCues`: key `` `${cue}:${startSeq + index}` ``, text `TABLE_BANNER_COPY[cue]`.

- [ ] **Step 6: Watch it pass.** Same command → `Test Files  1 passed (1)`, `Tests  3 passed (3)`.

- [ ] **Step 7: Write the failing host test** `apps/client/src/ui/banner/table-banner-host.test.tsx`. `reducedMotion` must apply before first render (motion reads `matchMedia` once at mount); each rerender passes fresh arrays so the enqueue effects re-run.
  ```tsx
  // @vitest-environment happy-dom
  /** TableBannerHost — L72-18 (spec v7 §6.12, §8.1, §8.3; L51-06, L63-03, L67-01). */
  import { act, screen } from '@testing-library/react';
  import { StrictMode, type ReactElement } from 'react';
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

  import type { ActionLogEntryView, PendingEffectView, SentenceAnnouncementLogEntry } from '@card-battle/shared';

  import { renderUi } from '../../test/render';
  import { TABLE_BANNER_MS as MS } from '../../view-model/table-banner';
  import { Z_INDEX } from '../layers';
  import { V7_COLORS, v7SeatColor } from '../palette';
  import { TableBannerHost, type TableBannerHostProps } from './table-banner-host';

  const TURN = 'Your turn', ATK = 'You are being attacked', DEAD = 'You are dead', WON = 'You won!';
  const S3 = 'Sentence in 3 turns!', S2 = '2 turns before Sentence!';
  const nick = (id: string): string => (id === 'b' ? 'Bob' : 'Alice');
  function host(o: Partial<TableBannerHostProps> = {}): ReactElement {
    return <TableBannerHost isMyTurn={false} isEliminated={false} youWon={false} pendingEffects={[]}
      sentenceAnnouncements={[]} actionLog={[]} nicknameOf={nick} you="me" {...o} />;
  }
  const atk = (id: string): PendingEffectView => ({ id, cardId: 'basic-attack', isUpgraded: false,
    sourcePlayerId: 'opp', targetPlayerId: 'me', queuedAt: 1, damageMultiplier: 1, redirectedBy: null });
  const countdown = (remainingOwnerTurns: number, turnSequence: number): SentenceAnnouncementLogEntry =>
    ({ kind: 'sentenceCountdown', sourcePlayerId: 'a', remainingOwnerTurns, turnSequence });
  const play = countdown(3, 1), tick = countdown(2, 3);
  const bust = (actorPlayerId: string, turnSequence: number): ActionLogEntryView =>
    ({ kind: 'actionPlayed', actorPlayerId, action: 'draw', turnSequence, drawBust: true });
  function advance(ms: number): void { act(() => { vi.advanceTimersByTime(ms); }); }
  const shown = (text: string): HTMLElement | null => screen.queryByText(text);
  function on(text: string): void { expect(shown(text)).not.toBeNull(); }
  function off(text: string): void { expect(shown(text)).toBeNull(); }
  function none(v: { container: HTMLElement }): void { expect(v.container.querySelector('[data-banner]')).toBeNull(); }
  /** Normalizes a hex the way the DOM reports inline colors. */
  function css(hex: string): string { const p = document.createElement('p'); p.style.backgroundColor = hex; return p.style.backgroundColor; }
  function fadeOnly(el: HTMLElement): void { expect(el.getAttribute('data-motion')).toBe('reduced'); expect(el.style.transform).toBe(''); }

  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  describe('TableBannerHost (L72-18)', () => {
    it('plays queued cues in order, each for TABLE_BANNER_MS', () => {
      const view = renderUi(host());
      none(view);
      view.rerender(host({ isMyTurn: true, pendingEffects: [atk('a1')] }));
      on(ATK); off(TURN);
      advance(MS - 1); on(ATK); off(TURN);
      advance(1); off(ATK); on(TURN);
      advance(MS); none(view);
    });

    it('does not extend the showing cue when another is queued behind it', () => {
      const view = renderUi(host({ isMyTurn: true }));
      on(TURN);
      advance(800);
      view.rerender(host({ isMyTurn: true, pendingEffects: [atk('a1')] }));
      on(TURN); off(ATK);
      advance(MS - 800 - 1); on(TURN);
      advance(1); off(TURN); on(ATK);
      advance(MS - 1); on(ATK);
      advance(1); off(ATK);
    });

    it('seeds You won! on first mount and never You are dead', () => {
      renderUi(host({ youWon: true }));
      expect(shown(WON)?.getAttribute('data-banner')).toBe('won');
      off(DEAD);
    });

    it('seeds You are dead on first mount', () => {
      renderUi(host({ isEliminated: true }));
      expect(shown(DEAD)?.getAttribute('data-banner')).toBe('dead');
      off(WON);
    });

    it('seeds Your turn on first mount in a polite, click-through status above sheets', () => {
      renderUi(host({ isMyTurn: true }));
      const banner = screen.getByText(TURN);
      expect(banner.getAttribute('data-banner')).toBe('turn');
      const region = banner.closest('[role="status"]');
      expect(region?.getAttribute('aria-live')).toBe('polite');
      expect(region?.parentElement?.className).toContain('pointer-events-none');
      expect(region?.parentElement?.style.zIndex).toBe(String(Z_INDEX.banner));
    });

    it('replays no log history on first mount', () => {
      const view = renderUi(host({ pendingEffects: [atk('a0')], sentenceAnnouncements: [play], actionLog: [bust('me', 2)] }));
      none(view);
      advance(MS);
      none(view);
    });

    it('announces Sentence lines assertively, one at a time, even to an eliminated POV', () => {
      const view = renderUi(host({ isEliminated: true }));
      view.rerender(host({ isEliminated: true, sentenceAnnouncements: [play] }));
      expect(screen.getByText(S3).getAttribute('data-banner')).toBe('sentence');
      expect(screen.getByText(S3).closest('[role="status"]')?.getAttribute('aria-live')).toBe('assertive');
      advance(400);
      view.rerender(host({ isEliminated: true, sentenceAnnouncements: [play, tick] }));
      off(S2);
      advance(MS - 400);
      off(S3);
      expect(screen.getByText(S2).getAttribute('data-banner')).toBe('sentence');
    });

    it("shows the wipe line only for the POV's own bust, once", () => {
      const view = renderUi(host());
      const wipe = (): Element | null => view.container.querySelector('[data-banner="wipe"]');
      view.rerender(host({ actionLog: [bust('opp', 4)] }));
      expect(wipe()).toBeNull();
      view.rerender(host({ actionLog: [bust('opp', 4), bust('me', 5)] }));
      expect(wipe()?.textContent).toBe('You gambled too much and lost everything');
      expect(wipe()?.closest('[role="status"]')?.getAttribute('aria-live')).toBe('assertive');
      advance(MS);
      view.rerender(host({ actionLog: [bust('opp', 4), bust('me', 5)] }));
      expect(wipe()).toBeNull();
    });

    it('colors Your turn with the POV seat hue and the attack cue with --threat-attack', () => {
      const seat = v7SeatColor(2);
      const view = renderUi(host({ isMyTurn: true, seatColor: seat }));
      expect(screen.getByText(TURN).style.backgroundColor).toBe(css(seat));
      view.rerender(host({ isMyTurn: true, seatColor: seat, pendingEffects: [atk('a1')] }));
      advance(MS);
      expect(screen.getByText(ATK).style.backgroundColor).toBe(css(V7_COLORS['threat-attack']));
    });

    it('defaults the turn hue to --cta', () => {
      renderUi(host({ isMyTurn: true }));
      expect(screen.getByText(TURN).style.backgroundColor).toBe(css(V7_COLORS.cta));
    });

    it('reduced motion renders fades only, with no slam transform', () => {
      const view = renderUi(host(), { reducedMotion: true });
      view.rerender(host({ isMyTurn: true, pendingEffects: [atk('a1')], sentenceAnnouncements: [play] }));
      fadeOnly(screen.getByText(ATK));
      fadeOnly(screen.getByText(S3));
      advance(MS);
      fadeOnly(screen.getByText(TURN));
    });

    it('full motion keeps the slam transform (guard for the reduced case)', () => {
      const view = renderUi(host());
      view.rerender(host({ pendingEffects: [atk('a1')], sentenceAnnouncements: [play] }));
      for (const text of [ATK, S3]) {
        expect(screen.getByText(text).getAttribute('data-motion')).toBe('full');
        expect(screen.getByText(text).style.transform).not.toBe('');
      }
    });
  });

  describe('TableBannerHost under StrictMode (L51-06)', () => {
    it('shows the first-paint You won! once, for TABLE_BANNER_MS', () => {
      renderUi(<StrictMode>{host({ youWon: true })}</StrictMode>);
      expect(screen.getAllByText(WON)).toHaveLength(1);
      advance(MS - 1);
      expect(screen.getAllByText(WON)).toHaveLength(1);
      advance(1); off(WON);
      advance(MS); off(WON);
    });

    it('shows the first-paint You are dead once and never You won!', () => {
      renderUi(<StrictMode>{host({ isEliminated: true })}</StrictMode>);
      expect(screen.getAllByText(DEAD)).toHaveLength(1);
      off(WON);
      advance(MS - 1);
      expect(screen.getAllByText(DEAD)).toHaveLength(1);
      advance(1); off(DEAD);
    });
  });
  ```

- [ ] **Step 8: Watch it fail.** `pnpm vitest run --project client apps/client/src/ui/banner/table-banner-host.test.tsx` → `Failed to resolve import "./table-banner-host"`, `Test Files  1 failed (1)`.

- [ ] **Step 9: Implement `table-banner-host.tsx`** (Produces exports; prop doc comments copied from `TableBannerFlashProps`; header cites spec v7 §6.12 / §8.1 / §8.3, L51-06, L63-03, L67-01 and keeps cue logic in `view-model/table-banner.ts`). Approach: `TableBannerFlash`'s three lanes (cue, Sentence, wipe), holding `BannerItem`s, each lane timing its own head.
  - Refs `watch` / `sentenceWatch` / `wipeWatch` (from the `empty*Watch()` helpers) and one shared `seq = useRef(0)`; state `cueQueue`, `sentenceQueue`, `wipeQueue: readonly BannerItem[]`; `reduced = usePrefersReducedMotion()`.
  - Enqueue effects with today's deps (cues `[isMyTurn, isEliminated, youWon, pendingEffects, you]`, Sentence `[sentenceAnnouncements, nicknameOf, isEliminated, youWon]`, wipe `[actionLog, you]`): call the `next*` helper, store `next`, return if empty, build items (`bannerItemsForCues(cues, seq.current)` or module-private `lineItems(kind: 'sentence' | 'wipe', lines: readonly string[], startSeq: number): BannerItem[]`, same `${kind}:${seq}` keys), advance `seq.current`, enqueue synchronously:
    ```ts
    // Synchronous enqueue (L51-06): a deferred enqueue is cleared by React Strict Mode's
    // effect replay, which dropped the first-paint You are dead / You won! cues.
    setCueQueue((current) => [...current, ...items]);
    ```
  - Hide effects depend only on the head key (`const cueKey = cueQueue[0]?.key;`, deps `[cueKey]`): a `window.setTimeout` of `TABLE_BANNER_MS` drops the head (`current.slice(1)`), cleared in cleanup. An enqueue never restarts it.
  - Render: always-present root `<div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center gap-3 px-4" style={{ zIndex: Z_INDEX.banner }}>`; per defined lane head (cue, Sentence, wipe) a `<div key={item.key} role="status" aria-live={bannerLiveMode(item.kind)}>` around module-private `BannerSlab`. No `AnimatePresence`, no exit animation.
  - `BannerSlab`: `motion.p` (`motion/react`) with `data-banner={item.kind}`, `data-motion={reduced ? 'reduced' : 'full'}`, hex `style={{ backgroundColor: tone, color: V7_COLORS['text-on-cta'] }}`, classes `whitespace-pre-line text-center font-v7-display text-v7-display leading-tight max-w-[min(92vw,30rem)]`, `px-6 py-3` (`px-8 py-4` if `isFlashierBanner`) and `button.tsx`'s arcade chrome classes (`border-v7-ink` outline at `--chrome-outline-width`, `rounded-v7-chrome`, `shadow-v7-chrome`; no literals).
  - Tone: turn / won `seatColor ?? V7_COLORS.cta`; attacked `V7_COLORS['threat-attack']`; dead, sentence, wipe `V7_COLORS.danger`.
  - Motion via `motionSpecFor(spec, reduced)` (`initial` / `transition` by conditional spread), `transition: { duration: durationS('slow'), ease: EASE_ENTRANCE }`, `initial` → `animate`: cue `{ opacity: 0, scale: 0.85, y: 12 }` → `{ opacity: 1, scale: 1, y: 0 }`; flashier `{ opacity: 0, scale: 0.72, y: 12 }` → `{ opacity: 1, scale: 1.06, y: 0 }`; Sentence / wipe `{ opacity: 0, scale: 0.62, y: 18, rotate: -4 }` → `{ opacity: 1, scale: 1.04, y: 0, rotate: 0 }`.

- [ ] **Step 10: Watch it pass.** Same command → `Test Files  1 passed (1)`, `Tests  14 passed (14)`; `pnpm exec eslint apps/client/src/ui/banner` exits 0, no output. If `react-hooks/set-state-in-effect` fires, restore `TableBannerFlash`'s exact shape (items from the ref inside the effect, then functional `setState`).

- [ ] **Step 11: Write the failing gallery test** `apps/client/src/ui/banner/banner.gallery.test.tsx`:
  ```tsx
  // @vitest-environment happy-dom
  /** /dev/ui banner section — L72-18 (technical spec v7 §4.2 DEV gallery). */
  import { screen } from '@testing-library/react';
  import { describe, expect, it } from 'vitest';

  import { renderUi } from '../../test/render';
  import { gallery } from './banner.gallery';

  describe('banner gallery (L72-18)', () => {
    it('lists every banner kind', () => {
      expect(gallery.id).toBe('banner');
      expect(gallery.entries.map((entry) => entry.id)).toEqual(['turn', 'attacked', 'dead', 'won', 'sentence', 'wipe']);
    });

    it('plays a Sentence line on demand', async () => {
      const entry = gallery.entries.find((candidate) => candidate.id === 'sentence');
      expect(entry).toBeDefined();
      const { user } = renderUi(<div>{entry?.render()}</div>);
      expect(screen.queryByText('Sentence in 3 turns!')).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Play' }));
      expect(screen.queryByText('Sentence in 3 turns!')).not.toBeNull();
    });
  });
  ```

- [ ] **Step 12: Watch it fail.** `pnpm vitest run --project client apps/client/src/ui/banner/banner.gallery.test.tsx` → `Failed to resolve import "./banner.gallery"`, `Test Files  1 failed (1)`.

- [ ] **Step 13: Implement the demo and the section.**
  - `banner-demo.tsx` (imported only by the gallery): `plays` state, a `Button` labelled `Play` (DEV label) that increments it, and below it a box `relative h-40 overflow-hidden rounded-v7-chrome [transform:translateZ(0)]` (the transform keeps the host's `fixed` root inside the tile). Seeded kinds (`turn`, `won`, `dead`) mount `<TableBannerHost key={plays} …/>` with `isMyTurn`, `youWon` or `isEliminated`. Change kinds keep one mount and add one input per play: `attacked` → `plays` `basic-attack` effects on `'demo'`; `sentence` → `plays` countdowns (`remainingOwnerTurns: 3`, `turnSequence: i + 1`); `wipe` → `plays` own draw busts. `you: 'demo'`, `nicknameOf: () => 'Bob'`, `seatColor` by conditional spread.
  - `banner.gallery.tsx`: `{ id: 'banner', title: 'Table banners', entries }`, each `render: () => <BannerDemo kind=… />`, in order (id: title): `turn`: `TABLE_BANNER_COPY.turn` with `seatColor={v7SeatColor(0)}`; `attacked`: `TABLE_BANNER_COPY.attacked`; `dead`: `TABLE_BANNER_COPY.dead`; `won`: `TABLE_BANNER_COPY.won` with `seatColor={v7SeatColor(3)}`; `sentence`: 'Sentence countdown'; `wipe`: 'Own Gambler wipe'. No registry edit (`import.meta.glob`).

- [ ] **Step 14: Run the folder.** `pnpm vitest run --project client apps/client/src/ui/banner` → `Test Files  3 passed (3)`, `Tests  19 passed (19)`.

- [ ] **Step 15: Browser check.** `pnpm --filter @card-battle/client dev`, `http://localhost:5173/dev/ui`, Table banners, Play on all 6. Pass: each banner stays in its tile ~1.6 s; fills seat hue (turn, won), pink `--threat-attack` (attacked), red `--danger` (dead, Sentence, wipe), dark label readable; OS reduced motion on → fade only. Stop the server.

- [ ] **Step 16: DESIGN.md.** Add "Table banners (`ui/banner/`, L72-18)" to the components part: `TableBannerFlash` props; three lanes, one item each for exactly `TABLE_BANNER_MS` (1600 ms), never extended; cues polite, Sentence and own wipe assertive `role="status"`; `data-banner` / `data-motion`; Step 9 fills with `--text-on-cta` ≥ 4.5:1 (tested); arcade chrome, `font-v7-display`; `Z_INDEX.banner` (90), `pointer-events: none`; entrance only (`--dur-slow`, `--ease-entrance`), no exit (L78); reduced motion = fade; gallery `banner` via `BannerDemo`. Check: `grep -n "TableBannerHost" DESIGN.md` prints it.

- [ ] **Step 17: docs/agent/frontend.md.** In "Design system (V7 · Lot 72+)", add a Banners bullet: `ui/banner/table-banner-host.tsx` hosts the L51-06 / L63-03 / L67-01 cues (logic stays in `view-model/table-banner.ts`); enqueue synchronously (Strict Mode drops a deferred first-paint cue; a `<StrictMode>` test locks it); each lane times its head by item key; old table keeps `your-turn-flash.tsx` until L75; L74-17 mounts the host. Check: `grep -n "table-banner-host" docs/agent/frontend.md` prints it.

- [ ] **Step 18: Classification rows.** In `docs/backlog_v7_test_classification.md`, rows "enqueues seed cues synchronously so Strict Mode cannot drop them" and "locks the scary Sentence banner in the Motion flash" (in `screens/table/your-turn-flash.table-banner.test.ts`): append to each disposition "Replacement behavior test written early in L72-18: `ui/banner/table-banner-host.test.tsx` (Strict Mode first-paint 'You won!' / 'You are dead' once for `TABLE_BANNER_MS`; Sentence and wipe in assertive status regions; wipe only for the POV). L75 deletes this it() together with `your-turn-flash.tsx`." Owner lot stays L75. Check: `grep -c "table-banner-host.test.tsx" docs/backlog_v7_test_classification.md` prints `2`.

- [ ] **Step 19: Mark Done.** In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress. Check: `grep -n '^| L72-18 ' docs/backlog_v7.md` ends with `| Done |`.

- [ ] **Step 20: Full gate.** `pnpm verify` → typecheck and lint exit 0; Vitest all green (`Test Files  N passed (N)`, 0 failed, 0 skipped), including the untouched `your-turn-flash.table-banner.test.ts` and `view-model/table-banner.test.ts`.

- [ ] **Step 21: Scope.** `git status --short` lists only the 7 new `apps/client/src/ui/banner/` files plus modified `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`; `git diff --quiet -- apps/client/src/screens apps/client/src/view-model packages && echo untouched` prints `untouched`.

- [ ] **Step 22: Commit.**
  ```bash
  git add apps/client/src/ui/banner DESIGN.md docs/agent/frontend.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
  git commit -m "feat(ui): add V7 table banner host (L72-18)" -m "Each lane times its head by item key, so a cue queued behind another no longer extends it (TableBannerFlash restarted the timer on every enqueue). No exit animation: the next item mounts exactly at TABLE_BANNER_MS; banner juice is L78 (spec v7 §8.1)."
  ```
  Check: `git log -1 --format=%s` prints `feat(ui): add V7 table banner host (L72-18)`; no AI attribution trailer.

**Decisions:**
- Depends: the backlog_v7.md Depends cell for L72-18 lists only L72-05/06, but the task also needs L72-03/04 (table-banner.ts, action-log.ts), L72-08 (gallery-registry, Button) and L72-09 (Z_INDEX, renderUi wrapper). Step 2 preflights them; the orchestrator should correct the Depends cell.
- The host imports '../../view-model/table-banner' (moved in L72-04, not L73 as the brief says), as the contract states.
- Extra DEV-only file apps/client/src/ui/banner/banner-demo.tsx (BannerDemo, BannerDemoProps): react-refresh rejects a local component in banner.gallery.tsx, and attacked/Sentence/wipe fire only on a post-mount change, so the gallery needs a stateful demo with a DEV-only 'Play' label (not shipped copy).
- Behavior refinement vs TableBannerFlash: each lane's hide timer is keyed on its head item key, so a cue queued behind another no longer extends it (the old flash restarted the timer on every enqueue). Matches 'each for TABLE_BANNER_MS' and is tested.
- No AnimatePresence and no exit animation: the next item mounts exactly at TABLE_BANNER_MS, which keeps happy-dom deterministic; exit choreography is left to L78.
- Tone the contract does not pin: dead, Sentence and wipe use V7_COLORS.danger (today all three use ATTACK_RED). Contract-pinned: turn/won = seatColor ?? V7_COLORS.cta, attacked = V7_COLORS['threat-attack'].
- Motion values are the author's choice (not spec-pinned): cue scale 0.85->1, flashier (attacked/dead) 0.72->1.06, Sentence/wipe 0.62->1.04 with rotate -4->0, all durationS('slow') + EASE_ENTRANCE; reduced motion keeps opacity only.
- Edits docs/backlog_v7_test_classification.md (outside the brief's Files list) so the two your-turn-flash source-text rows (L51-06 Strict Mode enqueue, L63-03 Sentence/wipe) point at the new behavior test; L75 deletes them instead of writing a duplicate; owner lot stays L75.
- Live regions are per banner (role=status wrapper keyed by item, aria-live from bannerLiveMode) inside an always-present pointer-events-none root at Z_INDEX.banner, not persistent empty regions. Sentence/wipe items come from a module-private lineItems helper (same `${kind}:${seq}` keys), not a new banner-items export; wipe copy reaches the host via nextWipeBannerLines.
- motion 12.43 (read from node_modules; Context7 unavailable): useReducedMotion captures matchMedia in useState at mount and the frame loop captures requestAnimationFrame at import, so tests set reducedMotion before first render and assert data-motion and the inline transform, not animation progress.
- Tests beyond the acceptance line: --text-on-cta AA contrast on every banner fill, seat-hue / --cta default / --threat-attack tone checks, a gallery smoke test, and the reviewFocus <StrictMode> first-paint tests (You won! / You are dead once for TABLE_BANNER_MS).
- No What's new item: the host is not mounted until L74-17 (spec v7 §10.4).
- Length: the section is ~25.5K chars, over the ~14K target, because the 14 host tests plus the items and gallery tests (~11K) are kept whole. Only repeated lines were folded into helpers (on/off/none/fadeOnly, text constants, TABLE_BANNER_MS as MS). Every assertion and exact value is kept.

---

### Task L72-19: Rebuild BotSeatLabel, PlayerName and ConnectionBadge in ui/

Spec v7 §4.2, §5.1, §5.2, §6.2 · Parity `global-connection-badge` · Depends on L72-08 (and L72-04…07).

**Files:**
- Create (all in `apps/client/src/ui/seat/`): `connection-badge-label.ts`, `connection-badge.tsx`, `bot-seat-label.tsx`, `player-name.tsx`, `seat.gallery.tsx`
- Test (same folder): `connection-badge-label.test.ts` (node); `connection-badge.test.tsx`, `bot-seat-label.test.tsx`, `player-name.test.tsx`, `seat.gallery.test.tsx` (happy-dom)
- Modify: `DESIGN.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`
- Unchanged: `apps/client/src/design/components/{connection-badge,bot-seat-label,player-name}.tsx` and their importers

**Interfaces:**

Consumes (paths under `apps/client/src/`):
- `ui/seat-colors.ts` (L72-04): `type SeatIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7`, `interface SeatPlayersView { players: readonly { id: string }[] }`, `seatIndexOf(view: SeatPlayersView, playerId: string): SeatIndex | null`, `clampSeatIndex(index: number): SeatIndex`
- `ui/palette.ts` (L72-05): `v7SeatColor(index: number): string`; utilities `bg-v7-bg-0`, `bg-v7-panel`, `bg-v7-panel-2`, `text-v7-text`, `text-v7-text-2`, `font-v7-display`, `font-v7-body`, `text-v7-micro`, `rounded-v7-chrome-sm`
- `ui/icons/icon.tsx` (L72-07): `Icon(props: IconProps): ReactElement`, `IconProps { name: IconName; size?: number; label?: string; className?: string }` (no label → `aria-hidden="true"`); `ui/icons/icon-names.ts`: `type IconName` (has `'bot'`, `'disconnected'`, `'eliminated'`)
- `test/render.tsx` (L72-06): `renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult`
- `dev/gallery-registry.ts` (L72-08): `GallerySection { readonly id: string; readonly title: string; readonly entries: readonly GalleryEntry[] }`, `GalleryModule { readonly gallery: GallerySection }`, `collectGallerySections(modules: Readonly<Record<string, GalleryModule>>): readonly GallerySection[]`
- `bots/format-bot-difficulty.ts`: `formatBotDifficulty(difficulty: BotDifficulty): string`; `@card-battle/shared`: `BotDifficulty`, `BOT_DIFFICULTIES`, `PublicPlayerView`

Produces:
- `ui/seat/connection-badge-label.ts`: `export interface ConnectionBadgePlayer { connection: { status: 'connected' | 'disconnected' | 'absent'; automaticTurnsTaken: number; consecutiveTimeouts: number }; isEliminated: boolean }` · `export function connectionBadgeLabel(player: ConnectionBadgePlayer): string | null`
- `ui/seat/connection-badge.tsx`: `export interface ConnectionBadgeProps { player: ConnectionBadgePlayer; className?: string }` · `export function ConnectionBadge(props: ConnectionBadgeProps): ReactElement | null`
- `ui/seat/bot-seat-label.tsx`: `export interface BotSeatLabelProps { difficulty: BotDifficulty; className?: string }` · `export function BotSeatLabel(props: BotSeatLabelProps): ReactElement`
- `ui/seat/player-name.tsx`: `export interface PlayerNameProps { nickname: string; playerId?: string; view?: SeatPlayersView; seatIndex?: number; className?: string; possessive?: boolean }` · `export function PlayerName(props: PlayerNameProps): ReactElement`
- `ui/seat/seat.gallery.tsx`: `export const gallery: GallerySection` with `id: 'seat'`

Tests: `.tsx` files start with `// @vitest-environment happy-dom`; imports come from the paths above (`screen` from `@testing-library/react`). Run one with `pnpm vitest run --project client apps/client/src/ui/seat/<file>`; FAIL = `Test Files  1 failed (1)`, module not resolved. `—` is U+2014 with spaces, `·` is U+00B7, as in V2.

---

- [ ] **Step 1: Preflight.** `ls apps/client/src/{ui/seat-colors.ts,ui/palette.ts,ui/icons/icon.tsx,test/render.tsx,dev/gallery-registry.ts} && grep -nE "'bot'|'disconnected'|'eliminated'" apps/client/src/ui/icons/icon-names.ts`. Pass: all paths exist, three names found; else stop (L72-04…08 must be `Done`).

- [ ] **Step 2: Mark in progress.** In `docs/backlog_v7.md`, set the `L72-19` status to `In progress`. Check: `grep -n "^| L72-19 " docs/backlog_v7.md` ends with `| In progress |`.

- [ ] **Step 3: Write the failing test** `connection-badge-label.test.ts`:
  ```ts
  type Overrides = Partial<ConnectionBadgePlayer['connection']> & { isEliminated?: boolean };
  const fakeSeat = ({ isEliminated = false, ...connection }: Overrides = {}): ConnectionBadgePlayer => ({
    isEliminated, connection: { status: 'connected', automaticTurnsTaken: 0, consecutiveTimeouts: 0, ...connection },
  });
  const label = (o?: Overrides) => connectionBadgeLabel(fakeSeat(o));

  describe('connectionBadgeLabel (L10-04 · global-connection-badge)', () => {
    it('returns null for a connected seat with no timeouts', () => { expect(label()).toBeNull(); });
    it('labels an eliminated seat first, whatever its connection', () => {
      expect(label({ isEliminated: true })).toBe('eliminated');
      expect(label({ isEliminated: true, status: 'disconnected' })).toBe('eliminated');
      expect(label({ isEliminated: true, status: 'absent', automaticTurnsTaken: 2 })).toBe('eliminated');
    });
    it('labels the reconnect grace window', () => {
      expect(label({ status: 'disconnected', consecutiveTimeouts: 3 })).toBe('disconnected — grace');
    });
    it('counts automatic turns out of 3 while absent, ahead of timeouts', () => {
      expect(label({ status: 'absent' })).toBe('absent 0/3');
      expect(label({ status: 'absent', automaticTurnsTaken: 2, consecutiveTimeouts: 4 })).toBe('absent 2/3');
    });
    it('counts idle timeouts out of 5 while connected', () => {
      expect(label({ consecutiveTimeouts: 1 })).toBe('idle timeouts 1/5');
      expect(label({ consecutiveTimeouts: 4 })).toBe('idle timeouts 4/5');
    });
    it('accepts a PublicPlayerView seat as is', () => { expectTypeOf<PublicPlayerView>().toExtend<ConnectionBadgePlayer>(); });
  });
  ```

- [ ] **Step 4: Run `connection-badge-label.test.ts` — expect FAIL.**

- [ ] **Step 5: Implement** `connection-badge-label.ts` (both Produces exports): V2's private `badgeLabel` from `design/components/connection-badge.tsx`, copied verbatim. Pure `.ts`; the header cites L10-04 and the server's `ABSENT_AUTO_TURN_LIMIT` / `CONNECTED_TIMEOUT_LIMIT`.

- [ ] **Step 6: Run it — expect PASS:** `Tests  6 passed (6)`.

- [ ] **Step 7: Write the failing test** `connection-badge.test.tsx`. Helpers: `Overrides` and `fakeSeat` copied from Step 3; `glyphOf(name: IconName): string` returns the `<svg>` innerHTML of `renderUi(<Icon name={name} size={12} />)` and then unmounts; `rootOf(container: HTMLElement): Element` returns `firstElementChild` or throws.
  ```tsx
  const STATES: readonly { name: string; seat: ConnectionBadgePlayer; text: string; icon: IconName }[] = [
    { name: 'eliminated', seat: fakeSeat({ isEliminated: true }), text: 'eliminated', icon: 'eliminated' },
    { name: 'grace', seat: fakeSeat({ status: 'disconnected' }), text: 'disconnected — grace', icon: 'disconnected' },
    { name: 'absent', seat: fakeSeat({ status: 'absent', automaticTurnsTaken: 2 }), text: 'absent 2/3', icon: 'disconnected' },
    { name: 'idle', seat: fakeSeat({ consecutiveTimeouts: 4 }), text: 'idle timeouts 4/5', icon: 'disconnected' },
  ];
  describe('ConnectionBadge (V7 · global-connection-badge)', () => {
    it('uses two distinct glyphs', () => { expect(glyphOf('eliminated')).not.toBe(glyphOf('disconnected')); });
    it.each(STATES)('renders the $name copy with a decorative $icon icon', ({ seat, text, icon }) => {
      const root = rootOf(renderUi(<ConnectionBadge player={seat} />).container);
      expect(root.textContent).toBe(text);
      expect(root.getAttribute('aria-label')).toBeNull();
      const svgs = root.querySelectorAll('svg');
      expect(svgs).toHaveLength(1);
      expect(svgs[0]?.getAttribute('aria-hidden')).toBe('true');
      expect(svgs[0]?.innerHTML).toBe(glyphOf(icon));
    });
    it('renders nothing for a connected seat with no timeouts', () => {
      expect(renderUi(<ConnectionBadge player={fakeSeat()} />).container.childElementCount).toBe(0);
    });
    it('passes className to the root', () => {
      const { container } = renderUi(<ConnectionBadge player={fakeSeat({ status: 'disconnected' })} className="shrink-0" />);
      expect(rootOf(container).classList.contains('shrink-0')).toBe(true);
    });
  });
  ```

- [ ] **Step 8: Run `connection-badge.test.tsx` — expect FAIL.**

- [ ] **Step 9: Implement** `connection-badge.tsx`: `export function ConnectionBadge({ player, className = '' }: ConnectionBadgeProps): ReactElement | null`. Null label → `null`; else a root `<span>` (no role, no `aria-label`) with `<Icon name={isEliminated ? 'eliminated' : 'disconnected'} size={12} />` then `<span>{label}</span>`. Root classes: chip `inline-flex items-center gap-1 rounded-v7-chrome-sm px-1.5 py-0.5 font-v7-body text-v7-micro font-extrabold uppercase tracking-wide` + `align-middle` + tone (`bg-v7-bg-0 text-v7-text` eliminated, else `bg-v7-panel-2 text-v7-text-2`) + `className`.

- [ ] **Step 10: Run it — expect PASS:** `Tests  7 passed (7)`.

- [ ] **Step 11: Write the failing test** `bot-seat-label.test.tsx` (`glyphOf` and `rootOf` as in Step 7):
  ```tsx
  const LABELS: Record<BotDifficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
  describe('BotSeatLabel (V7 · L17-03)', () => {
    it.each(BOT_DIFFICULTIES)('reads "Bot · %s" with a decorative dot and icon', (difficulty) => {
      const root = rootOf(renderUi(<BotSeatLabel difficulty={difficulty} />).container);
      expect(root.textContent).toBe(`Bot·${LABELS[difficulty]}`);
      expect(root.getAttribute('aria-label')).toBeNull();
      expect(screen.getByText('Bot').closest('[aria-hidden="true"]')).toBeNull();
      expect(screen.getByText(LABELS[difficulty]).closest('[aria-hidden="true"]')).toBeNull();
      expect(screen.getByText('·').getAttribute('aria-hidden')).toBe('true');
      const svg = root.querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.innerHTML).toBe(glyphOf('bot'));
    });
    it('passes className to the root', () => {
      const { container } = renderUi(<BotSeatLabel difficulty="hard" className="shrink-0" />);
      expect(rootOf(container).classList.contains('shrink-0')).toBe(true);
    });
  });
  ```

- [ ] **Step 12: Run `bot-seat-label.test.tsx` — expect FAIL.**

- [ ] **Step 13: Implement** `bot-seat-label.tsx`: `export function BotSeatLabel({ difficulty, className = '' }: BotSeatLabelProps): ReactElement`. Children in order, no whitespace nodes: `<Icon name="bot" size={12} />`, `<span>Bot</span>`, `<span aria-hidden="true">·</span>`, `<span className="normal-case tracking-normal text-v7-text">{formatBotDifficulty(difficulty)}</span>`. Root: Step 9 chip + `bg-v7-panel text-v7-text-2` + `className`; no `aria-label`.

- [ ] **Step 14: Run it — expect PASS:** `Tests  4 passed (4)`.

- [ ] **Step 15: Write the failing test** `player-name.test.tsx`. Helpers: `cssColor(hex)` sets `style.color` on a probe `<span>` and reads it back (happy-dom normalizes colors); `nameSpan(ui: ReactElement): HTMLSpanElement` renders `ui` and returns the first `span`, or throws.
  ```tsx
  const VIEW = { players: [{ id: 'p-ana' }, { id: 'p-bo' }, { id: 'p-cy' }] };
  const seatOf = (ui: ReactElement) => nameSpan(ui).getAttribute('data-seat-index');
  describe('PlayerName (V7 · L39-03)', () => {
    it('colors the nickname with the V7 hue of an explicit seat', () => {
      const span = nameSpan(<PlayerName nickname="Ana" seatIndex={3} />);
      expect(span.textContent).toBe('Ana');
      expect(span.getAttribute('data-seat-index')).toBe('3');
      expect(span.style.color).toBe(cssColor(v7SeatColor(3)));
    });
    it('clamps an explicit seat into the 0–7 palette', () => {
      expect(seatOf(<PlayerName nickname="Hi" seatIndex={11} />)).toBe('7');
      expect(seatOf(<PlayerName nickname="Lo" seatIndex={-2} />)).toBe('0');
    });
    it('resolves the seat from view.players when no seat is given', () => {
      const span = nameSpan(<PlayerName nickname="Bo" playerId="p-bo" view={VIEW} />);
      expect(span.getAttribute('data-seat-index')).toBe('1');
      expect(span.style.color).toBe(cssColor(v7SeatColor(1)));
    });
    it('prefers the explicit seat over the view', () => {
      expect(seatOf(<PlayerName nickname="Bo" playerId="p-bo" view={VIEW} seatIndex={6} />)).toBe('6');
    });
    it('leaves an unknown or unseated player uncolored', () => {
      const span = nameSpan(<PlayerName nickname="Zed" playerId="p-zed" view={VIEW} />);
      expect(span.textContent).toBe('Zed');
      expect(span.hasAttribute('data-seat-index')).toBe(false);
      expect(span.style.color).toBe('');
      expect(seatOf(<PlayerName nickname="Solo" />)).toBeNull();
    });
    it('colors only the nickname in the possessive form', () => {
      const { container } = renderUi(<PlayerName nickname="Cy" playerId="p-cy" view={VIEW} possessive />);
      expect(container.textContent).toBe("Cy's");
      expect(container.querySelector('span')?.textContent).toBe('Cy');
    });
    it('passes className to the nickname span', () => {
      expect(nameSpan(<PlayerName nickname="Ana" seatIndex={0} className="truncate" />).classList.contains('truncate')).toBe(true);
    });
  });
  ```

- [ ] **Step 16: Run `player-name.test.tsx` — expect FAIL.**

- [ ] **Step 17: Implement** `player-name.tsx`: `export function PlayerName({ nickname, playerId, view, seatIndex, className = '', possessive = false }: PlayerNameProps): ReactElement`. Seat as today: `clampSeatIndex(seatIndex)` if given, else `seatIndexOf(view, playerId)` if both set, else `null`. Fragment: a `font-v7-display` + `className` span with inline `color: v7SeatColor(i)` and `data-seat-index={String(i)}` (both omitted when unresolved), then `'s` outside it when `possessive`.

- [ ] **Step 18: Run it — expect PASS:** `Tests  7 passed (7)`.

- [ ] **Step 19: Write the failing test** `seat.gallery.test.tsx`:
  ```tsx
  const sections = collectGallerySections(import.meta.glob<GalleryModule>('../**/*.gallery.tsx', { eager: true }));
  describe('seat gallery (/dev/ui · L72-19)', () => {
    it('is discovered under the "seat" id', () => { expect(sections.map((s) => s.id)).toContain('seat'); });
    it('shows every PlayerName seat, BotSeatLabel tier and ConnectionBadge state', () => {
      const seat = sections.find((s) => s.id === 'seat');
      if (seat === undefined) throw new Error('seat gallery section missing');
      renderUi(<>{seat.entries.map((entry) => <div key={entry.id}>{entry.render()}</div>)}</>);
      for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
        expect(screen.getByText(`Seat ${index}`).getAttribute('data-seat-index')).toBe(String(index));
      }
      expect(screen.getByText('Ana').getAttribute('data-seat-index')).toBe('0');
      expect(screen.getByText('Unknown').hasAttribute('data-seat-index')).toBe(false);
      for (const text of ['Easy', 'Normal', 'Hard', 'eliminated', 'disconnected — grace', 'absent 2/3', 'idle timeouts 4/5']) {
        expect(screen.getAllByText(text).length).toBeGreaterThan(0);
      }
    });
  });
  ```

- [ ] **Step 20: Run `seat.gallery.test.tsx` — expect FAIL:** `Tests  2 failed (2)` (`to include 'seat'`, `seat gallery section missing`).

- [ ] **Step 21: Implement** `seat.gallery.tsx`, only export `gallery = { id: 'seat', title: 'Seat', entries }`. Entry ids: `player-name-seats` (`Seat ${index}` at seats 0…7); `player-name-forms` (`Ana` seat 0 `possessive`; `Unknown`, no seat); `bot-seat-label` (each `BOT_DIFFICULTIES`); `connection-badge` (eliminated, disconnected, absent 2 turns, 4 timeouts, and a connected 0-timeout seat captioned "connected: no badge").

- [ ] **Step 22: Run the folder — expect PASS.** `pnpm vitest run --project client apps/client/src/ui/seat` → `Test Files  5 passed (5)`, `Tests  26 passed (26)`.

- [ ] **Step 23: Update `DESIGN.md`.** Next to `ui/primitives`, add "Seat identity — `ui/seat/` (L72-19)": PlayerName (Lilita One, inline `v7SeatColor` hex, possessive colors only the nickname, seat hue never with `--life` / `--threat-*`); BotSeatLabel ("Bot · {Easy|Normal|Hard}" on `--panel`); ConnectionBadge (copy and 3 / 5 thresholds unchanged, eliminated on `--bg-0`, degraded on `--panel-2`, table seats only); all 11 px, decorative 12 px icon, `--chrome-radius-sm`, no outline or hard shadow; gallery `seat`. Check: `grep -n "ui/seat" DESIGN.md` prints it.

- [ ] **Step 24: Update `docs/agent/frontend.md`.** In "Design system (V7 · Lot 72+)", add: "**Seat identity (`ui/seat/`, L72-19):** `PlayerName`, `BotSeatLabel`, `ConnectionBadge` with unchanged props and copy (`connectionBadgeLabel` in `connection-badge-label.ts`); V2 versions stay until L74 / L76 / L77 switch imports; new code imports only `ui/seat/`." Append "(V7 rebuilds: `ui/seat/`, L72-19)" to the V2 Components bullet. Check: `grep -n "ui/seat" docs/agent/frontend.md` prints two lines.

- [ ] **Step 25: Flip the backlog.** In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress. Check: `grep -n "^| L72-19 " docs/backlog_v7.md` ends with `| Done |`.

- [ ] **Step 26: Confirm V2 is untouched.** `git status --porcelain apps/client/src/design apps/client/src/screens apps/client/src/action-log apps/client/src/bots` prints nothing. `git status --porcelain` lists only `apps/client/src/ui/seat/` (10 files) and the three docs.

- [ ] **Step 27: Run the gate.** `pnpm verify` exits 0: `tsc` clean (including the `expectTypeOf` check), `eslint .` clean, Vitest has no `failed` (the L72-07 no-emoji test now scans `ui/seat/`).

- [ ] **Step 28: Commit.**
  ```bash
  git add apps/client/src/ui/seat/connection-badge-label{,.test}.ts apps/client/src/ui/seat/{connection-badge,bot-seat-label,player-name,seat.gallery}{,.test}.tsx DESIGN.md docs/agent/frontend.md docs/backlog_v7.md
  git commit -m "feat(ui): rebuild seat labels in ui/seat (L72-19)" -m "The design/components versions stay for the V2 table, lobby and Game over until L74, L76 and L77 switch their imports (spec v7 §4.2)."
  ```
  Pass: `git log -1 --format=%s` prints `feat(ui): rebuild seat labels in ui/seat (L72-19)`.

**Decisions:**
- V2 design/components/{connection-badge,bot-seat-label,player-name}.tsx and every importer stay untouched; L74, L76 and L77 switch imports. Nothing mounts the V7 pieces yet, so no What's new item.
- Badge copy moves from V2's private badgeLabel into pure ui/seat/connection-badge-label.ts (connectionBadgeLabel) because react-refresh forbids non-component exports in a .tsx; it is copied verbatim.
- The 3 and 5 thresholds stay literals that mirror the server's ABSENT_AUTO_TURN_LIMIT / CONNECTED_TIMEOUT_LIMIT; those constants are server-only and are cited, not imported.
- ConnectionBadge text goes from V2's 10 px to text-v7-micro (11 px), the spec v7 §5.2 floor for functional text.
- ConnectionBadge and BotSeatLabel have no role or aria-label: the visible text is the spoken text, as in V2. Their 12 px icons (eliminated vs disconnected; bot) are aria-hidden.
- Badge tones: eliminated bg-v7-bg-0 + text-v7-text, degraded bg-v7-panel-2 + text-v7-text-2. BotSeatLabel uses bg-v7-panel with a text-v7-text-2 label and a text-v7-text difficulty. The L72-05 contrast tests cover these pairs.
- Seat badges take their radius from rounded-v7-chrome-sm and carry no outline or hard shadow; the seat frame around them owns the arcade chrome (§5.3).
- BotSeatLabel children have no whitespace text nodes, so textContent stays 'Bot·Easy' exactly as in V2.
- PlayerName uses font-v7-display (Lilita One, one weight) and drops V2's font-semibold. The seat color is inline hex from v7SeatColor, never var() (mobile Safari rule), and only on the nickname span (§5.1).
- Test helpers (fakeSeat, glyphOf, rootOf) are repeated in each test file instead of a shared fixture module, so the task keeps exactly its ten planned files.

---

### Task L72-20: Add the ?ui=next table switch

**Depends on:** L72-01; assumes L72-02, L72-04 and L72-08 (`/dev/ui` lines in `App.tsx`) have landed, and touches none of their lines. **Spec:** technical spec v7 §4.4, §12.1. **Parity:** `global-app-router`, `global-client-storage`, `end-finished-board-shell`, `finished-board-readonly`, `table-tutorial-flow`.

**Files:**
- Create: `apps/client/src/ui-switch.ts`
- Create: `apps/client/src/screens/arena/arena-screen.tsx`
- Modify: `apps/client/src/App.tsx`
- Modify: `apps/client/src/screens/end.tsx`
- Modify: `docs/agent/frontend.md`
- Modify: `docs/backlog_v7.md`
- Test: `apps/client/src/ui-switch.test.ts` (node, no `readFileSync`, so no §12.1 row)
- Test: `apps/client/src/screens/arena/arena-screen.test.ts` (node, no `readFileSync`; L74-01 replaces it)

**Interfaces:**
- Consumes:
  - `import type { PlayKind, PlayingStateView } from '@card-battle/shared'` (`PlayKind = 'classic' | 'tutorial'`)
  - `TableScreen(props: TableScreenProps): ReactElement` and `interface TableScreenProps` from `apps/client/src/screens/table.tsx` (unchanged)
  - `FinishedStateView.playKind`, `PlayingStateView.playKind`
- Produces, in `apps/client/src/ui-switch.ts`:
  - `export const UI_SWITCH_STORAGE_KEY = 'card-battle.v7.ui'`
  - `export const UI_SWITCH_QUERY_PARAM = 'ui'`
  - `export type TableUi = 'classic' | 'next'`
  - `export type UiSwitchParam = TableUi | null`
  - `export interface UiSwitchStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }`
  - `export function browserUiSwitchStorage(): UiSwitchStorage | null`
  - `export function parseUiSwitchParam(search: string): UiSwitchParam`
  - `export function applyUiSwitchParam(param: UiSwitchParam, storage: UiSwitchStorage | null): TableUi`
  - `export function readStoredTableUi(storage: UiSwitchStorage | null): TableUi`
  - `export function resolveTableUi(input: { preference: TableUi; playKind: PlayKind }): TableUi`
- Produces, in `apps/client/src/screens/arena/arena-screen.tsx`:
  - `export type ArenaScreenProps = TableScreenProps`
  - `export function ArenaScreen(props: ArenaScreenProps): ReactElement`
- Produces, in `apps/client/src/screens/end.tsx`:
  - `export interface EndScreenProps { view: FinishedStateView; actionReject: ActionRejectPayload | null; onDismissActionReject: () => void; statusLabel: string; nowMs: number; onLeave: () => void; onPlayAgain?: () => void; tableUi?: TableUi }`
  - `export function EndScreen(props: EndScreenProps): ReactElement` (export unchanged)
- `apps/client/src/App.tsx`: `export function App()` unchanged.

---

- [ ] **Step 1: Mark the task In progress.** In `docs/backlog_v7.md`, change the last cell of the `| L72-20 |` row from `To do` to `In progress` (committed in Step 18). Check: `grep -n "^| L72-20 " docs/backlog_v7.md` ends with `| In progress |`.

- [ ] **Step 2: Write the failing resolver test.** Create `apps/client/src/ui-switch.test.ts`:

```ts
// Temporary table switch: technical spec v7 §4.4 / L72-20. L75 deletes it with ui-switch.ts.
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyUiSwitchParam, browserUiSwitchStorage, parseUiSwitchParam, readStoredTableUi,
  resolveTableUi, UI_SWITCH_QUERY_PARAM, UI_SWITCH_STORAGE_KEY, type UiSwitchStorage,
} from './ui-switch';

class MemoryStorage implements UiSwitchStorage {
  public readonly data = new Map<string, string>();
  public getItem(key: string): string | null { return this.data.get(key) ?? null; }
  public setItem(key: string, value: string): void { this.data.set(key, value); }
  public removeItem(key: string): void { this.data.delete(key); }
}
const fail = (): never => { throw new Error('storage blocked'); };
/** Private window or blocked site data: every call throws (spec v7 §4.4 try/catch rule). */
const blocked: UiSwitchStorage = { getItem: fail, setItem: fail, removeItem: fail };
function storageWith(value: string): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(UI_SWITCH_STORAGE_KEY, value);
  return storage;
}

describe('table ui switch (technical spec v7 §4.4 / L72-20)', () => {
  afterEach(() => { Reflect.deleteProperty(globalThis, 'localStorage'); });

  it('pins the localStorage key and the query param', () => {
    expect(UI_SWITCH_STORAGE_KEY).toBe('card-battle.v7.ui');
    expect(UI_SWITCH_QUERY_PARAM).toBe('ui');
  });

  it('reads only ?ui=next and ?ui=classic from the query string', () => {
    expect(parseUiSwitchParam('?ui=next')).toBe('next');
    expect(parseUiSwitchParam('?ui=classic')).toBe('classic');
    expect(parseUiSwitchParam('ui=next')).toBe('next');
    expect(parseUiSwitchParam('?code=ABCDEF&ui=next')).toBe('next');
    for (const search of ['', '?ui=', '?ui=NEXT', '?ui=v7', '?view=next']) {
      expect(parseUiSwitchParam(search)).toBeNull();
    }
  });

  it('?ui=next selects V7 and persists it for later loads', () => {
    const storage = new MemoryStorage();
    expect(applyUiSwitchParam('next', storage)).toBe('next');
    expect(storage.getItem('card-battle.v7.ui')).toBe('next');
    expect(applyUiSwitchParam(null, storage)).toBe('next'); // reload without the param keeps V7
  });

  it('?ui=classic clears the key', () => {
    const storage = storageWith('next');
    expect(applyUiSwitchParam('classic', storage)).toBe('classic');
    expect(storage.data.has('card-battle.v7.ui')).toBe(false);
    expect(applyUiSwitchParam(null, storage)).toBe('classic');
  });

  it('without a param the stored value applies, and only "next" opts in', () => {
    expect(applyUiSwitchParam(null, new MemoryStorage())).toBe('classic');
    expect(applyUiSwitchParam(null, storageWith('next'))).toBe('next');
    expect(readStoredTableUi(storageWith('next'))).toBe('next');
    for (const storage of [storageWith('classic'), storageWith('NEXT'), new MemoryStorage(), null]) {
      expect(readStoredTableUi(storage)).toBe('classic');
    }
  });

  it('tutorial rooms always get the classic table', () => {
    for (const preference of ['next', 'classic'] as const) {
      expect(resolveTableUi({ preference, playKind: 'tutorial' })).toBe('classic');
      expect(resolveTableUi({ preference, playKind: 'classic' })).toBe(preference);
    }
  });

  it('a throwing storage never throws and still honors the param for this load', () => {
    expect(applyUiSwitchParam('next', blocked)).toBe('next');
    expect(applyUiSwitchParam('classic', blocked)).toBe('classic');
    expect(applyUiSwitchParam(null, blocked)).toBe('classic');
    expect(readStoredTableUi(blocked)).toBe('classic');
  });

  it('works with no storage at all', () => {
    expect(applyUiSwitchParam('next', null)).toBe('next');
    expect(applyUiSwitchParam('classic', null)).toBe('classic');
    expect(applyUiSwitchParam(null, null)).toBe('classic');
  });

  it('browserUiSwitchStorage returns localStorage, or null when it is missing or its getter throws', () => {
    expect(browserUiSwitchStorage()).toBeNull();
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    expect(browserUiSwitchStorage()).toBe(storage);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: fail });
    expect(browserUiSwitchStorage()).toBeNull();
    expect(applyUiSwitchParam(parseUiSwitchParam('?ui=next'), browserUiSwitchStorage())).toBe('next');
  });
});
```

- [ ] **Step 3: Run it and watch it fail.** `pnpm vitest run --project client apps/client/src/ui-switch.test.ts`. Expected: FAIL, `Failed to resolve import "./ui-switch"`, `Test Files  1 failed (1)`.

- [ ] **Step 4: Implement `apps/client/src/ui-switch.ts`.** The Produces exports only, as the tests pin them; header doc comment cites technical spec v7 §4.4 and says L75 deletes the module. Non-obvious points: `browserUiSwitchStorage` returns `null` when `!('localStorage' in globalThis)` and reads `globalThis.localStorage` inside try/catch (pattern of `feedback/asked-storage.ts`); `applyUiSwitchParam` returns the param even when the write throws; every `catch` holds a comment (`no-empty`); no function throws.

- [ ] **Step 5: Run it and watch it pass.** Same command. Expected: `✓ |client| src/ui-switch.test.ts (9 tests)`, `Tests  9 passed (9)`.

- [ ] **Step 6: Write the failing arena pass-through test.** Create `apps/client/src/screens/arena/arena-screen.test.ts` (`ArenaScreen` has no hooks, so it is called as a plain function):

```ts
// Arena entry before L74 (technical spec v7 §4.4 / L72-20); L74-01 replaces this test.
import type { PlayingStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { TableScreen } from '../table';
import { ArenaScreen, type ArenaScreenProps } from './arena-screen';

const noop = (): void => { /* no intent fires */ };

function classicView(): PlayingStateView {
  return {
    phase: 'playing', you: 'a', gameCode: 'ABCDEF', currentTurnPlayerId: 'a', turnSequence: 1,
    turnOrder: ['a'], turnDeadlineMs: null, players: [],
    self: {
      lives: 10, shield: 0, shieldIsUpgraded: false, points: 0, upgradePoints: 0, kitId: 'warrior',
      hand: [], specialCards: [], activePersistentEffects: [], attackBlockCharges: 0,
    },
    pendingEffects: [], actionLog: [], pool: [], poolBuyCost: 1, pendingSentences: [],
    playKind: 'classic', tutorialIndex: null,
  };
}

function tableProps(): ArenaScreenProps {
  return {
    view: classicView(), actionReject: null, onDismissActionReject: noop, statusLabel: 'Connected',
    nowMs: 0, deadlineMs: null, lastActionResolved: null, subChoice: null,
    onDraw: noop, onPlayCard: noop, onPlayMultipleAttacks: noop, onResolveSubChoice: noop,
    onBuyCard: noop, onSellCard: noop, onUpgradeCard: noop, onBuyUpgradePoint: noop,
    onBuySpecialCard: noop, onBuyPoolCard: noop, onClearSpy: noop, onSellUpgradePoint: noop,
    onLeave: noop, onForfeit: noop, onSendChat: noop,
  };
}

function expectPassThrough(props: ArenaScreenProps): void {
  const element = ArenaScreen(props);
  expect(element.type).toBe(TableScreen);
  expect(element.props).toEqual(props);
}

describe('arena screen before L74 (technical spec v7 §4.4 / L72-20)', () => {
  it('renders the classic TableScreen with exactly the props it receives', () => {
    expectPassThrough(tableProps());
  });

  it('forwards the finished-board props unchanged', () => {
    expectPassThrough({ ...tableProps(), readOnly: true, youWon: true, onShowStats: noop, onOpenFeedback: noop });
  });
});
```

- [ ] **Step 7: Run it and watch it fail.** `pnpm vitest run --project client apps/client/src/screens/arena/arena-screen.test.ts`. Expected: FAIL, cannot resolve `./arena-screen`, `Test Files  1 failed (1)`.

- [ ] **Step 8: Implement `apps/client/src/screens/arena/arena-screen.tsx`.** `ArenaScreen` returns `<TableScreen {...props} />`. Doc comment: V7 arena entry (technical spec v7 §4.2 / §4.4), mounted behind `?ui=next` by App and EndScreen, classic table until L74-01 replaces the body. No hooks, no other export (react-refresh).

- [ ] **Step 9: Run it and watch it pass.** Same command. Expected: `✓ |client| src/screens/arena/arena-screen.test.ts (2 tests)`, `Tests  2 passed (2)`.

- [ ] **Step 10: Wire the playing mount point in `App.tsx`.** Edit `GameApp` only (not `App()`, `/inbox`, `/admin` or the `/dev/ui` lines).
  - Imports (path order): `ArenaScreen`, and `applyUiSwitchParam`, `browserUiSwitchStorage`, `parseUiSwitchParam`, `resolveTableUi`; keep `TableScreen`. Add a header comment line citing technical spec v7 §4.4 (L72-20, removed in L75).
  - With the other `useState` calls, before any early return (once per page load, never per 250 ms tick):
    ```tsx
    const [tablePreference] = useState(() =>
      applyUiSwitchParam(parseUiSwitchParam(window.location.search), browserUiSwitchStorage()),
    );
    ```
  - Finished branch: add to `<EndScreen`: `tableUi={resolveTableUi({ preference: tablePreference, playKind: view.playKind })}`.
  - Playing branch: before the `return`, then rename the single `<TableScreen` tag to `<Board` with every prop unchanged:
    ```tsx
    const Board =
      resolveTableUi({ preference: tablePreference, playKind: view.playKind }) === 'next'
        ? ArenaScreen
        : TableScreen;
    ```
  - Import `ui-switch` nowhere else; do not strip `?ui=` from the URL.

- [ ] **Step 11: Wire the finished board in `end.tsx`.** Import `ArenaScreen` and `type TableUi`. Add `tableUi?: TableUi;` to `EndScreenProps` (doc: "Table switch decision from App (technical spec v7 §4.4); classic when omitted. L75 removes it."), destructure `tableUi = 'classic'`, add `const Board = tableUi === 'next' ? ArenaScreen : TableScreen;` before the `return`, and rename the single `<TableScreen` tag to `<Board` with every prop verbatim (`onLeave={requestLeave}`, the one `setLeavePending(true)`). Add a header comment line citing the switch (technical spec v7 §4.4 / L72-20).

- [ ] **Step 12: Typecheck and lint the touched files.** `pnpm typecheck && pnpm exec eslint apps/client/src/ui-switch.ts apps/client/src/ui-switch.test.ts apps/client/src/screens/arena apps/client/src/App.tsx apps/client/src/screens/end.tsx`. Expected: exit 0, no `error TS`, no ESLint output.

- [ ] **Step 13: Confirm the source-text literals stay single.**
  - `grep -c "<Board" apps/client/src/App.tsx apps/client/src/screens/end.tsx; grep -c "<TableScreen" apps/client/src/App.tsx apps/client/src/screens/end.tsx; grep -c "setLeavePending(true)" apps/client/src/screens/end.tsx`. Expected: `<Board` `1`/`1`; `<TableScreen` `0`/`0`; `setLeavePending(true)` `1`.
  - `pnpm vitest run --project client $(grep -rlE "App\.tsx'|[/']end\.tsx'" apps/client/src --include='*.test.ts')`. Expected: every file passes, `0 failed`.
  - No code is deleted, so `docs/backlog_v7_test_classification.md` gets no row.

- [ ] **Step 14: Document the switch in `docs/agent/frontend.md`.** No `DESIGN.md` change (no token, no `ui/` file).
  - `## Screens`, Table row, File cell: append `` · `?ui=next` → `screens/arena/arena-screen.tsx` (renders `TableScreen` until L74-01)``. End row, When cell: append `; the finished board follows the same switch (`tableUi`)`.
  - `## Conventions`, after the End screen bullet:
    ```
    - **Table UI switch (technical spec v7 §4.4 · L72-20, removed in L75):** `?ui=next` writes
      `localStorage['card-battle.v7.ui'] = 'next'`, `?ui=classic` removes it, else the stored
      value applies; applied once per page load (`useState` initializer in `GameApp`); tutorial
      rooms always get classic. Read only by `App.tsx` (playing) and `EndScreen` (`tableUi`),
      each via `const Board = … ? ArenaScreen : TableScreen` so source-text literals stay single.
      `ArenaScreen` renders `TableScreen` until L74-01.
    ```
  - Storage list: add right after (or, if an earlier L72 task added a list, append `card-battle.v7.ui` to it):
    ```
    - **Client storage keys** (every access in try/catch, no accounts): localStorage
      `card-battle.v6.howToPlaySeen`, `card-battle.v6.lastSeenReleaseId`, `card-battle.v6.hints`,
      `card-battle.v6.feedbackAsked.<gameCode>` and `card-battle.v7.ui` (table switch, L72-20,
      removed in L75); sessionStorage `card-battle:reconnection-token` and
      `card-battle.v6.inboxPassword`.
    ```
  - Check: `grep -c "card-battle.v7.ui" docs/agent/frontend.md` prints `2` or more.

- [ ] **Step 15: Browser check.** Deferred to step 4 of the L72-21 gate; nothing to run here.

- [ ] **Step 16: Mark the task Done.** In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress. Check: `grep -n "^| L72-20 " docs/backlog_v7.md` ends with `| Done |`.

- [ ] **Step 17: Run the full gate.** `pnpm verify`. Expected: exit 0; tsc and ESLint clean; Vitest `0 failed`, nothing skipped, including `src/ui-switch.test.ts (9 tests)` and `src/screens/arena/arena-screen.test.ts (2 tests)`.

- [ ] **Step 18: Commit.**

```bash
git add apps/client/src/ui-switch.ts apps/client/src/ui-switch.test.ts \
  apps/client/src/screens/arena/arena-screen.tsx apps/client/src/screens/arena/arena-screen.test.ts \
  apps/client/src/App.tsx apps/client/src/screens/end.tsx \
  docs/agent/frontend.md docs/backlog_v7.md
git commit -m "feat(client): add ?ui=next table switch (L72-20)" \
  -m "ArenaScreen renders the classic TableScreen until L74-01 replaces its body, so the switch path is wired and testable on staging without stranding testers."
```

Check: `git log -1 --format=%s` prints `feat(client): add ?ui=next table switch (L72-20)`; `git status --short` lists none of these files. No AI attribution (AGENTS.md §10).

**Decisions:**
- Adds apps/client/src/screens/arena/arena-screen.test.ts, which the contract does not list. It is a node test that calls the hook-free ArenaScreen directly and checks it returns TableScreen with identical props, for both the live and the finished board. This proves 'same table with the switch on or off'. L74-01 replaces it. If the React Compiler is ever enabled, the direct call must become a renderUi test.
- frontend.md has no consolidated storage-key list at 6e4575a. Step 14 creates a 'Client storage keys' bullet under ## Conventions (keys from parity global-client-storage plus card-battle.v7.ui). If an earlier L72 task already added a list, the step appends to it instead.
- Board must be an inline ternary over the two module-level imports (ArenaScreen / TableScreen), never a helper call that returns a component, because react-hooks/static-components (eslint-plugin-react-hooks 7.1.1) flags a JSX tag whose value comes from a call.
- The ?ui param is applied once per page load in a GameApp useState initializer and is never stripped from the URL. Only App.tsx (playing) and EndScreen (finished board via tableUi) read the switch.
- Critic fix: the Done step now also adds 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress, and is no longer limited to flipping the task row.
- The commit carries a short body that records the interim pass-through (ArenaScreen = TableScreen until L74-01). It has no Co-Authored-By line, because AGENTS.md §10 overrides it per the contract.
- Test trims keep every assertion and value. Repeated expects are folded into loops (null parse cases, classic stored values, tutorial/classic preference pairs). ThrowingStorage becomes one `fail` function shared by the storage object and the throwing localStorage getter. Test counts stay at 9 and 2.

---

### Task L72-21: Run the Lot 72 design and browser gate

Gate task (spec v7 §4.4, §5.5, §12.3, §12.4; parity `global-text-input-no-ios-zoom`, `global-visual-viewport-fit`): checks only, no TDD cycle; defects are fixed in Step 16 within the single commit.

**Files:**
- Modify: `docs/agent/frontend.md` (record after the last `### Lot … verified` in `## Post-lot browser gate`).
- Modify: `docs/backlog_v7.md` (L72-21 Status, `## Progress` Done cells).
- Modify only on a defect: the offending `apps/client/src/ui/**` file(s) and tests, `DESIGN.md` (§5.8), any superseded `docs/agent/frontend.md` section.
- Never committed: `.impeccable/critique/*`, `apps/client/.art-contact-sheet/contact-sheet.png`, `apps/client/dist/`, the baseline worktree.

**Interfaces:**
- Consumes (read-only):
  - `ui-switch.ts`: `UI_SWITCH_STORAGE_KEY = 'card-battle.v7.ui'`, `UI_SWITCH_QUERY_PARAM = 'ui'`, `parseUiSwitchParam(search: string): UiSwitchParam`, `applyUiSwitchParam(param: UiSwitchParam, storage: UiSwitchStorage | null): TableUi`, `resolveTableUi(input: { preference: TableUi; playKind: PlayKind }): TableUi` (tutorial → `'classic'`).
  - `ArenaScreen(props: ArenaScreenProps): ReactElement` (pass-through to `TableScreen`); `EndScreen` with `tableUi?: TableUi`.
  - `DEV_UI_PATH = '/dev/ui'`, `isDevUiRoute(pathname: string, isDev: boolean): boolean`, `UiGallery(): ReactElement`; section ids `primitives`, `icons`, `overlays`, `text`, `card`, `chat`, `kit`, `rules`, `coach`, `banner`, `seat`.
  - `artFor(id: CardId | KitId): string`, `ART_FALLBACK_URL`; `pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts` → 31 PNGs in `assets/art/cards`, 16 in `assets/art/kits`, `apps/client/.art-contact-sheet/contact-sheet.png`.
  - `ChatLog` input `name="chat-body"`, `maxLength={CHAT_BODY_MAX_LENGTH}` (200).
  - `Sheet` (`mode: 'read-only'` + `onClose` | `mode: 'blocking'`), `Dialog` (read-only, placement `'auto'`), `resolveSheetPlacement(preference, box)`, `viewportModeFor(box)`.
  - `.v7-ground` (`ui/tokens.css`); the `.impeccable/config.json` halo ignore.
  - Release ids `'lot-72'`, `'lot-72-v7'`; What's new key `card-battle.v6.lastSeenReleaseId`.
- Produces: no export; the frontend.md record, the backlog flip, PR critique notes.

```bash
REPO="/Users/yassine/Documents/Perso/Bataille des cartes/battle-cards"
IMPECCABLE="$HOME/.claude/plugins/cache/impeccable/impeccable/4.7.0/skills/impeccable/scripts/impeccable"
BASE=$(git -C "$REPO" rev-parse "$(git -C "$REPO" log --format=%H --grep='(L72-01)' -n 1)^")  # 6e4575a unless rebased
BASELINE="$REPO/../battle-cards-l72-baseline"
```

Browser probes (inspection-only IIFEs for `javascript_tool`):
- **P1 look** → `{ viewport, loadedFonts, v7FontElements, v7GroundElements, roots, styleTupleCount, styleHash }`. `loadedFonts`: sorted loaded `document.fonts` families. `v7FontElements`: `body, body *` with computed font `/Lilita One|Fredoka|Nunito/`. `roots`: `html`, `body`, `#root` as `sel | backgroundColor | color | fontFamily`. Hash: per element `tagName|fontFamily|fontSize|fontWeight|color|backgroundColor|borderRadius|boxShadow`; dedupe, sort, join `\n`, fold `h = (Math.imul(31, h) + codePoint) | 0`, emit `(h >>> 0).toString(16)`. Return `tuples` too when diffing.
- **P2 board** (dev build): `key` = `localStorage['card-battle.v7.ui']`, `code` = `/Code ([A-Z0-9]{6,})/` in body text. On `[data-zone="table"]` (else `{ mounted: false, key, code }`), walk the `__reactFiber$…` node's `.return` chain collecting function `type.name`s; return `{ mounted: true, arena: has 'ArenaScreen', table: has 'TableScreen', end: has 'EndScreen', key, code }`.
- **P3 gallery** → `{ groundOnRoot (html/body/#root has .v7-ground), groundCount, loadedFonts, pageOverflowX (scrollWidth − clientWidth), chat: { fontSize: computed string, height: rounded, maxLength } | null, smallFields: input/textarea/select under 16 px }`.
- **P4 sheet**, last `[role="dialog"]` (none → `{ open: false, count: 0 }`) → `{ count, vv: [offsetTop, width, height], overlay: [top, width, height] of nearest fixed self-or-ancestor, panelBottomGap: vh − panel.bottom, panelCenterOffset: panel mid − vh/2, ariaModal, usesDvh: a CSS rule contains 100dvh }`; `vh` = `visualViewport.height`; rounded.

- [ ] **Step 1: Preflight**

```bash
cd "$REPO"
grep -E '^\| L72-(0[1-9]|1[0-9]|20) ' docs/backlog_v7.md | grep -vc '| Done |'
git status --porcelain
```
Pass: `0`; nothing tracked modified (untracked only `.impeccable/critique/`). Otherwise stop.

- [ ] **Step 2: Set L72-21 to `In progress` in `docs/backlog_v7.md` (working tree only)**

Pass: `grep -c '^| L72-21 .*| In progress |$' docs/backlog_v7.md` prints `1`.

- [ ] **Step 3: Tip baseline gate**

```bash
cd "$REPO" && pnpm verify
pnpm vitest run --project client apps/client/src/ui-switch.test.ts apps/client/src/dev/dev-ui-route.test.ts
```
Pass: exit 0 with `Tests  <N> passed` (note N); then `Test Files  2 passed`.

- [ ] **Step 4: No V2 value changed (§4.4)**

```bash
git diff --unified=0 "$BASE" -- apps/client/src/index.css | grep -E '^[+-][^+-]'
git diff --unified=0 "$BASE" -- apps/client/src/main.tsx | grep -E '^[+-][^+-]'
```
Pass: exactly `+@import "./ui/tokens.css";`, then only the added `./ui/fonts` import; no `-` line.

- [ ] **Step 5: Detector config holds only the halo ignore**

```bash
diff <(git show "$BASE":.impeccable/config.json | jq -c '.detector.ignoreValues[] | [.rule, .files]' | sort) \
     <(jq -c '.detector.ignoreValues[] | [.rule, .files]' .impeccable/config.json | sort)
jq -c '[.detector.ignoreRules, .detector.ignoreFiles]' .impeccable/config.json
grep -rn 'impeccable-disable' apps/client/src/ui apps/client/src/screens/arena apps/client/src/index.css
git check-ignore .impeccable/hook.cache.json
```
Pass: `diff` prints only `> ["dark-glow",["apps/client/src/ui/tokens.css"]]` and `> ["radial-spotlight-glow",["apps/client/src/ui/tokens.css"]]`; `[[],[]]`; no `grep` output; `.impeccable/hook.cache.json`. Any other ignore → Step 16.

- [ ] **Step 6: Detector on shipped V7 files**

```bash
cd "$REPO" && "$IMPECCABLE" detect --json apps/client/src/ui apps/client/src/screens/arena apps/client/src/assets/art; echo "exit=$?"
```
Pass: `[]`, `exit=0` (2 = findings, 1 = unscannable). Primary findings, tests and galleries included → Step 16; advisory → PR notes with fix or reason.

- [ ] **Step 7: Art is deterministic and unused by screens**

```bash
cd "$REPO" && pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts
git status --porcelain apps/client/src/assets/art
ls apps/client/src/assets/art/cards/*.png | wc -l; ls apps/client/src/assets/art/kits/*.png | wc -l
git check-ignore apps/client/.art-contact-sheet/contact-sheet.png
grep -rlnE "artFor|ART_FALLBACK_URL|ui/card/card'|ui/kit/kit-portrait'" apps/client/src --include='*.ts' --include='*.tsx' | grep -v '^apps/client/src/ui/'
```
Pass: exit 0; empty status; `31`, `16`; the path; no output. Metadata-only drift: `git checkout -- apps/client/src/assets/art` and note it; a visibly different image is an L72-10 defect.

- [ ] **Step 8: Production build ships no gallery**

```bash
cd "$REPO" && NODE_ENV=production pnpm --filter @card-battle/client build
ls apps/client/dist/assets | grep -ci gallery
```
Pass: build exits 0; `0`.

- [ ] **Step 9: Capture the pre-Lot-72 baseline**

```bash
git -C "$REPO" worktree add --detach "$BASELINE" "$BASE"
pnpm --dir "$BASELINE" install --frozen-lockfile
```
Background `cd "$BASELINE" && TURN_DURATION_MS=300000 pnpm dev`; wait for `:5173` and `:2567`; open `http://localhost:5173`, nick `L72Gate`. At 375×812 (reload on Home), then 1440×900 (no reload in game): (1) Home, dismiss What's new (marks `lot-72` seen); (2) Play online → Create game, note code; (3) Home → Play solo, Opponents 3, Easy, kit Random, Start, skip hints, note `Code …`; (4) flag → Forfeit, Skip Feedback. Screenshot + P1 at each stop; stop the stack.

Pass: 8 screenshots and P1 outputs, codes kept; `lsof -iTCP:5173 -sTCP:LISTEN; lsof -iTCP:2567 -sTCP:LISTEN` prints nothing.

- [ ] **Step 10: Tip with switch off looks unchanged**

Background `cd "$REPO" && TURN_DURATION_MS=300000 pnpm dev`; open `/?ui=classic` (P2 `key: null`); repeat Step 9's sequence in the same profile; P2 on table and finished board.

Pass: every screen `v7FontElements === 0`, `v7GroundElements === 0`, `roots` and `loadedFonts` = baseline (Outfit only); Home/lobby `styleHash` and `styleTupleCount` = baseline (else diff `tuples` → Step 16); table and Game over screenshots match bar cards, names, code, timers; P2 `arena: false, table: true`. Expected: What's new opens on `lot-72-v7`. Note codes L1, S1.

- [ ] **Step 11: Switch persistence and tutorial bypass (375×812)**

`/?ui=next` → `key: 'next'`. `/` → `key: 'next'`, Home `styleHash` = Step 10's. Solo game → `mounted: true, arena: true, table: true`, screenshot = Step 10 (code S2). Forfeit → `end: true, arena: true`. `/?ui=classic` → `key: null`. `/?ui=next`, Tutorial past board tour → `arena: false, table: true, key: 'next'` (code T1); Skip tutorial via flag. `/?ui=classic` → `key: null`.

Pass: every P2/P1 expectation above holds.

- [ ] **Step 12: `/dev/ui` at both viewports**

Open `/dev/ui` at 375×812 and 1440×900 (reload after resize); P3 + screenshot.

Pass: all 11 section ids in text and nav; `groundOnRoot === false`, `groundCount >= 1`; fonts include `Fredoka`, `Lilita One`, `Nunito`; `pageOverflowX === 0`; `chat` = `{ fontSize: '16px', height: >= 44, maxLength: 200 }`; `smallFields` = `[]`. Failures → Step 16 (shell-only overflow: fix, note not shipped).

- [ ] **Step 13: Sheet placement, visual viewport, swipe**

Overlays → Dialog entry; P4 at 375×812, 844×390, 1440×900 (reopen after resize). Pass: `overlay` = `vv`, `usesDvh === false`, `ariaModal === 'true'`; `panelBottomGap <= 16` at the first two; `|panelCenterOffset| <= 8` at 1440×900.

At 375×812, `left_click_drag` the read-only sheet's title down 260 px (touch-only fallback: `pointerdown`, ten `pointermove`, `pointerup` with `pointerType: 'touch'`; record which). Pass: P4 `count` drops by one. Same on the blocking Sheet entry. Pass: stays open. Reset preset `desktop`.

- [ ] **Step 14: Rendered scans of `/dev/ui`**

```bash
"$IMPECCABLE" detect --json --viewport 375x812 http://localhost:5173/dev/ui; echo "exit=$?"
"$IMPECCABLE" detect --json --viewport 1440x900 http://localhost:5173/dev/ui; echo "exit=$?"
```
Pass: `[]`, exit 0, bar `radial-spotlight-glow` / `dark-glow` on `.v7-ground` (halo, Q3b; record). Other findings → Step 16. Exit 1: record "URL scan unavailable: <error>".

- [ ] **Step 15: Impeccable critique**

Load `impeccable:impeccable`; run `critique apps/client/src/ui` (live `http://localhost:5173/dev/ui` at both viewports) and `critique apps/client/.art-contact-sheet/contact-sheet.png` (crop, frame/number removal, fringe, light parts). P0/P1 against §5, contrast, 11/16 px, 44 px, a11y, reduced motion or tested behavior → Step 16; taste → PR notes for L74/L75, L76, L77.

Pass: both reports exist with provenance headers; each P0/P1 fixed or argued false positive.

- [ ] **Step 16 (only if Steps 4–15 found defects): Fix and re-check**

Fix the root cause in `apps/client/src/ui/**` (no ignore, no weakened test); a behavior fix starts with a failing happy-dom test beside the component (`pnpm vitest run --project client <test path>` fails, then passes); update `DESIGN.md` with it. Re-run the finding step, then Step 6.

Pass: both clean. A fix needing a rule, value, protocol or non-§10.6 copy change: stop, ask the designer, set L72-21 `Blocked`, reason in `docs/agent/decisions.md`.

- [ ] **Step 17: Promotion and contact-sheet sign-off**

```bash
git -C "$REPO" fetch origin main dev
git -C "$REPO" show origin/main:packages/shared/src/release-notes.ts | grep -c "id: 'lot-72',"
```
Ask the designer about the L72-10 contact sheet. Pass: `1` (note short sha) or `0` (pending); a sign-off date or "pending".

- [ ] **Step 18: Clean up**

Stop the stack; `git -C "$REPO" worktree remove --force "$BASELINE"`; preset `desktop`. Pass: `git -C "$REPO" worktree list` lacks `battle-cards-l72-baseline`; no listener on `:5173`/`:2567`; no `card-battle.v7.ui`.

- [ ] **Step 19: Write the record in `docs/agent/frontend.md`**

After the last `### Lot … verified` record, add heading `### Lot 72 verified <YYYY-MM-DD> (browser, \`TURN_DURATION_MS=300000\`, PROTOCOL 45)`, a setup line (`:5173`, `:2567`, nick `L72Gate`, viewports incl. 844×390, baseline `<BASE sha>` with rooms `<BL1>`, `<BS1>`), then one bullet each:
- **Design gate (§12.4):** Steps 5, 6, 14 results (PNGs unscannable, only the Q3b halo ignore); critique notes in the Lot 72 PR.
- **Side by side (§4.4):** Home, lobby `<L1>`, solo `<S1>`, Game over match the baseline; What's new opened on `lot-72-v7`.
- **Switch (§4.4):** Step 11 with `<S2>`, `<T1>`.
- **`/dev/ui`:** Steps 8, 12, 13 (`chat-body` **16px**, swipe method).
- **Art (§5.5):** Step 7; contact sheet "signed off <date>" or "**pending** — no screen uses `artFor` until signed off".
- **Pre-merge (§4.6):** `lot-72` on `origin/main` at `<sha>`, or "**pending** — the PR waits".
- Fixes (none, or one line each); `pnpm verify` **<N>** tests.

Pass: `grep -c '^### Lot 72 verified' docs/agent/frontend.md` prints `1`; no `<` placeholder left.

- [ ] **Step 20: Flip the backlog**

In docs/backlog_v7.md, set this task's Status to Done and add 1 to the Done cells of `| 72 · Foundations |` and `| **Total** |` in ## Progress.

Pass: `grep -E '^\| L72-[0-9]{2} ' docs/backlog_v7.md | grep -vc '| Done |'` prints `0`.

- [ ] **Step 21: `pnpm verify`**

```bash
cd "$REPO" && pnpm verify
```
Pass: exit 0, `Tests  <N> passed`, N matching the record (update it if Step 16 added tests).

- [ ] **Step 22: Commit**

No fixes:
```bash
cd "$REPO"
git add docs/agent/frontend.md docs/backlog_v7.md
git commit -m "docs(agents): record Lot 72 gate (L72-21)"
```
With fixes, add the fixed `apps/client/src/ui/**` files, their tests and `DESIGN.md` to that `git add`, and commit with:
```bash
git commit -m "fix(ui): close Lot 72 design gate (L72-21)" -m "<one line per defect: what the gate found and why the fix is right>"
```
No AI attribution, no Co-Authored-By (AGENTS.md §10). Pass: `git log -1 --format=%s` is that subject; `git status --porcelain` shows nothing tracked.

- [ ] **Step 23: "Design gate" notes in the Lot 72 PR description**

Pass: the PR body has both critique reports (summary, P0–P3 dispositions, designer questions), advisory findings with reasons, the contact-sheet link and sign-off status, an unchecked "`lot-72` promoted to `main`" item if pending, and the new strings Minimize, Table rules, Excluded (§10.6) for review.

**Decisions:**
- Running `impeccable detect` on assets/art/ checks nothing, because the folder holds only PNGs and the detector returns exit 0 without scanning them. The art is checked instead by re-running extract-art.ts (Step 7), by the contact-sheet critique and by rendered URL scans of /dev/ui.
- apps/client/src/screens/arena (from L72-20) is added to the detector scope, on top of the brief's ui/, tokens.css and assets/art/.
- The DOM cannot show that the tutorial ignores ?ui=next, because ArenaScreen is a pass-through that renders the same markup as TableScreen. Probe P2 reads React fiber component names in a dev build instead. ui-switch.test.ts still covers resolveTableUi.
- The 'looks as before' reference is a temporary detached worktree at the commit before L72-01 (6e4575a). It sits outside the repo so `pnpm lint` never lints a second copy, and Step 18 removes it.
- Checks added from the contract: Sheet swipe and phone/desktop placement (L72-09 defers both to this gate), 844×390 placement with the overlay sized to visualViewport (parity global-visual-viewport-fit), no gallery chunk in the production build, fields at least 16 px and 44 px on /dev/ui, and the index.css/main.tsx diff limited to two added imports.
- Gate fixes go into the single L72-21 commit, whose subject then becomes `fix(ui): close Lot 72 design gate (L72-21)` with a body. That commit may touch apps/client/src/ui/** and DESIGN.md, which are outside the contract's file list.
- .impeccable/critique/ snapshots are not gitignored. Explicit `git add` paths keep them out of the commit, and the critique notes go in the PR description instead.
- Promoting lot-72 to main blocks the PR merge (§4.6), not this task. L72-21 can be Done while the record says 'pending' and the PR carries an unchecked item.
- Contact-sheet sign-off may stay 'pending' when L72-21 is Done, because Step 7 proves no screen imports artFor yet.
- Critique triage: L72 fixes only P0/P1 issues against §5, contrast or size floors, 44 px targets, a11y, reduced motion or tested behavior. Taste suggestions go in the PR notes, routed to L74/L75 (table), L76 (home/lobby) or L77 (Game over).
- Expected behavior, not a defect: the tip auto-opens What's new on 'lot-72-v7' (New look) even after the baseline marked 'lot-72' as seen.
- Impeccable critique sub-agents may run on Claude models, as allowed by AGENTS.md §9 (relaxed in 8ba060f on 2026-10-20).

---

## Appendix — Interface contract

Exact paths and exports every task produces or consumes. Names here are binding; a task that must deviate records it in its Decisions.

| Task | Path | Exports |
|---|---|---|
| L72-01 | `PRODUCT.md` | — |
| L72-01 | `AGENTS.md` | — |
| L72-01 | `docs/agent/decisions.md` | — |
| L72-01 | `docs/agent/deploy.md` | — |
| L72-01 | `.gitignore` | — |
| L72-02 | `docs/backlog_v7.md` | — |
| L72-02 | `docs/backlog_v7_test_classification.md` | — |
| L72-02 | `apps/client/src/design/components/visual-viewport.test.ts` | — |
| L72-02 | `apps/client/src/feedback/feedback-surfaces.test.ts` | — |
| L72-02 | `apps/client/src/help/tutorial-hints-independence.test.ts` | — |
| L72-03 | `apps/client/src/view-model/incoming-threat-diff.ts` | export function isPersistentPresentationId(effectId: string): boolean<br>export function newIncomingThreats(seenIds: ReadonlySet<string>, pendingEffects: readonly PendingEffectView[], you: string): PendingEffectView[]<br>export function incomingTargetingYouIds(pendingEffects: readonly PendingEffectView[], you: string): Set<string><br>export function incomingAttackTargetingYouIds(pendingEffects: readonly PendingEffectView[], you: string): Set<string><br>export function isIncomingThiefCardId(cardId: string): boolean<br>export function incomingThiefTargetingYouIds(pendingEffects: readonly PendingEffectView[], you: string): Set<string> |
| L72-03 | `apps/client/src/view-model/threat-tone.ts` | export function threatToneFor(cardId: string): ThreatTone |
| L72-03 | `apps/client/src/view-model/opponent-token-chips.ts` | export interface DirectedTokenChip<br>export interface DeckCardGhost<br>export type LiveResourceSnap = OpponentLiveResources<br>export interface StealTransferResult<br>export function chipsForPublicLogEntry(entry: ActionLogEntryView, you: string, players: readonly PublicPlayerView[], selfKitId: KitId): DirectedTokenChip[]<br>export function deckCardGhostForPublicLogEntry(entry: ActionLogEntryView, you: string, players: readonly PublicPlayerView[]): DeckCardGhost \| null<br>export function playCardGhostsForPublicLogEntry(entry: ActionLogEntryView, you: string): DeckCardGhost[]<br>export function isStealResolve(entry: ActionLogEntryView): boolean<br>export function leftoverLiveFlowChips(accounted: readonly DirectedTokenChip[], prev: ReadonlyMap<string, LiveResourceSnap>, next: ReadonlyMap<string, LiveResourceSnap>): DirectedTokenChip[]<br>export function stealTransferChips(entry: ActionLogEntryView, prev: ReadonlyMap<string, LiveResourceSnap>, next: ReadonlyMap<string, LiveResourceSnap>): StealTransferResult<br>export function boostStealChipsWithRecentYield(entry: ActionLogEntryView, chips: readonly DirectedTokenChip[], pointYields: ReadonlyMap<string, number>): DirectedTokenChip[]<br>export function regenFlowChips(entry: ActionLogEntryView, prev: ReadonlyMap<string, LiveResourceSnap>, next: ReadonlyMap<string, LiveResourceSnap>): StealTransferResult<br>export function actionLogFlyoutKey(entry: ActionLogEntryView): string |
| L72-03 | `apps/client/src/view-model/action-log.ts` | export const ACTION_LOG_KINDS: readonly ActionLogEntryKind[]<br>export interface ActionLogFilters<br>export type NicknameResolver = (playerId: string) => string<br>export interface ActionLogTextSegment<br>export interface ActionLogPlayerSegment<br>export interface ActionLogDamageSegment<br>export interface ActionLogCardSegment<br>export interface ActionLogResourceSegment<br>export type ActionLogSegment<br>export function resourceDeltaClass(direction: LogResourceDirection): string<br>export function resourceSegment(delta: LogResourceDelta): ActionLogResourceSegment<br>export function formatActionLogEntrySegments(/* unchanged */)<br>export function formatActionLogEntry(/* unchanged */): string<br>export function entryInvolvesPlayer(entry: ActionLogEntryView, playerId: string): boolean<br>export function filterActionLog(/* unchanged */)<br>export interface TurnGroup<br>export function groupByTurn(entries: readonly ActionLogEntryView[]): TurnGroup[]<br>export interface RoundGroup<br>export function roundOfTurn(turnSequence: number, seatCount: number): number<br>export function groupByRound(/* unchanged */) |
| L72-03 | `apps/client/src/view-model/select-hint.ts` | export interface SelectHintInput<br>export function shouldShowFirstGameHints(input: Pick<SelectHintInput, 'playKind' \| 'readOnly' \| 'selfEliminated'>): boolean<br>export function selectHint(input: SelectHintInput): HintId \| null<br>export type HintDismissCause<br>export interface HintDismissContext<br>export function hintIdsDismissedBy(cause: HintDismissCause, ctx: HintDismissContext): readonly HintId[] |
| L72-03 | `apps/client/src/view-model/game-over-awards.ts` | export const HIDDEN_KIT_LABEL = 'Hidden kit'<br>export type AwardValueKind = 'points' \| 'lives' \| 'upgrade' \| 'count' \| 'time'<br>export type AwardRank = 'max' \| 'min'<br>export const GAME_OVER_AWARD_IDS<br>export type GameOverAwardId = (typeof GAME_OVER_AWARD_IDS)[number]<br>export interface AwardWinner<br>export interface GameOverAward<br>export function pickGameOverAwards(recap: GameRecapView): GameOverAward[]<br>export function formatThinkTimeMs(ms: number): string<br>export function formatAwardValue(kind: AwardValueKind, value: number): string |
| L72-03 | `apps/client/src/ui/hint-ids.ts` | export const HINT_IDS<br>export type HintId = (typeof HINT_IDS)[number]<br>export function isHintId(value: unknown): value is HintId<br>export function hintAnchorId(id: HintId): string<br>export function hintPlacePrefer(id: HintId): 'below' \| 'above' \| 'beside' |
| L72-03 | `apps/client/src/ui/help-storage.ts` | export const HOW_TO_PLAY_SEEN_KEY = 'card-battle.v6.howToPlaySeen'<br>export const HINTS_STORAGE_KEY = 'card-battle.v6.hints'<br>export type HowToPlayContinueTarget = 'online' \| 'solo' \| 'tutorial'<br>export interface HintStorageState { readonly dismissed: readonly HintId[]; readonly skipAll: boolean }<br>export const EMPTY_HINT_STATE: HintStorageState<br>export function hasSeenHowToPlay(): boolean<br>export function markHowToPlaySeen(): void<br>export function resetHelpStorage(): void<br>export function readHintState(): HintStorageState<br>export function writeHintState(state: HintStorageState): void<br>export function dismissHint(id: HintId): HintStorageState<br>export function skipAllHints(): HintStorageState<br>export function dismissHints(ids: readonly HintId[]): HintStorageState<br>export function applyHintPatch(/* unchanged */) |
| L72-03 | `apps/client/src/ui/release-storage.ts` | export const LAST_SEEN_RELEASE_ID_KEY = 'card-battle.v6.lastSeenReleaseId'<br>export function readLastSeenReleaseId(): string \| null<br>export function markLatestReleaseSeen(): void<br>export function hasUnseenReleaseNotes(): boolean<br>export function shouldAutoOpenWhatsNew(input: { latestUnseen: boolean }): boolean |
| L72-03 | `apps/client/src/ui/fx-anchors.ts` | export const ACTION_LOG_PANEL_ZONE = 'action-log-panel'<br>export const LOG_COLLAPSED_ZONE = 'log-collapsed'<br>export const OPPONENTS_COLLAPSED_ZONE = 'opponents-collapsed'<br>export const INCOMING_PENDING_ZONE = 'incoming-pending'<br>export const INCOMING_COLLAPSED_ZONE = 'incoming-collapsed'<br>export const DECK_CARD_FLYOUT_WIDTH = 48<br>export const DECK_CARD_FLYOUT_HEIGHT = 72<br>export function escapeSelector(value: string): string<br>export function tokenFlyoutResourceSelector(kind: ResourceKind, playerId?: string): string<br>export function tokenFlyoutSeatSelector(playerId: string): string<br>export function tokenFlyoutPovSelector(playerId: string): string |
| L72-03 | `eslint.config.mjs` | { files: ['apps/client/src/view-model/**/*.ts'], rules: { 'no-restricted-imports': ['error', { paths: ['react','react-dom','motion'].map(name => ({ name, message })), patterns: [{ group: ['react/*','react-dom/*','motion/*'], message }] }], 'no-restricted-properties': ['error', { object: 'Date', property: 'now', message }, { object: 'performance', property: 'now', message }] } } |
| L72-04 | `apps/client/src/ui/asset-lookup.ts` | export function getKitPortraitUrl(kitId: KitId): string<br>export function getOpponentPlaceholderUrl(): string<br>export function getCardArtUrl(cardId: CardId, opts: { isUpgraded: boolean; activated?: boolean }): string<br>export function getResourceIconUrl(kind: ResourceKind): string<br>export function getCardBackUrl(type: CardBackKind): string<br>export function getAttackLogoUrl(): string<br>export function getActionLogoUrl(): string<br>export const ALL_ART_CARD_IDS: readonly CardId[]<br>export const V1_CARD_IDS: readonly CardId[]<br>export { CARDS_WITH_ACTIVATED_ART }<br>export type { ResourceKind, CardBackKind } |
| L72-04 | `apps/client/src/ui/seat-colors.ts` | export const SEAT_PALETTE_SIZE<br>export type SeatIndex = 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7<br>export const SEAT_COLORS /* V2 hues, unchanged */<br>export interface SeatPlayersView { players: readonly { id: string }[] }<br>export function seatIndexOf(view: SeatPlayersView, playerId: string): SeatIndex \| null<br>export function clampSeatIndex(index: number): SeatIndex<br>export function seatColorHex(index: number): string<br>export function seatColorVar(index: number): string<br>export function seatColorWash(hex: string, amount: number): string<br>export function seatColorAlpha(hex: string, alpha: number): string<br>export interface SeatZoneStyleOptions<br>export function seatZoneStyle(index: number, options?: SeatZoneStyleOptions): CSSProperties<br>export function seatNameStyle(index: number): CSSProperties |
| L72-04 | `apps/client/src/ui/effect-text-tokens.ts` | export interface EffectResourceSpan { start: number; end: number; amount: number; kind: ResourceKind; insteadOf: boolean }<br>export function tokenizeEffectResources(text: string): EffectResourceSpan[] |
| L72-04 | `apps/client/src/ui/structured-cost.ts` | export type StructuredCost = { kind: 'points'; amount: number } \| { kind: 'lives'; amount: number } \| { kind: 'pointsPerLife'; amount: number } \| { kind: 'upgradePoint'; amount: number }<br>export type CostSign = 'cost' \| 'gain'<br>export function costSignGlyph(signed: CostSign \| undefined): string<br>export function spokenCost(cost: StructuredCost, multiplier: number \| undefined, signed?: CostSign): string<br>export function structuredCostFromCardCost(cost: CardCost \| undefined): StructuredCost \| null<br>export function structuredPlayCost(card: Card, isUpgraded: boolean): StructuredCost \| null<br>export function costAriaLabel(cost: StructuredCost \| null, signed?: CostSign): string |
| L72-04 | `apps/client/src/ui/visual-viewport.ts` | export interface VisualViewportBox { offsetTop: number; offsetLeft: number; width: number; height: number }<br>export function readVisualViewportBox(): VisualViewportBox |
| L72-04 | `apps/client/src/ui/resource-captions.ts` | export const RESOURCE_CAPTIONS: Record<ResourceKind, string> /* Lives, Points, Shield, Upgrade points */<br>export function resourceCaptionMode(captionVisible: boolean \| undefined): 'visible' \| 'sr-only' |
| L72-04 | `apps/client/src/ui/primitives/dialog-width.ts` | export const DIALOG_PANEL_BASE_CLASS: string<br>export function dialogPreferredMaxWidth(panelClassName: string): string<br>export function dialogPanelClassName(panelClassName: string): string |
| L72-04 | `apps/client/src/view-model/table-helpers.ts` | export type RewardKind = RewardChoice['type']<br>export const REWARD_KINDS: readonly RewardKind[]<br>export const REWARD_KIND_LABELS: Record<RewardKind, string><br>export const REWARD_KIND_COSTS: Partial<Record<RewardKind, StructuredCost>><br>export function nicknameOf(view: PlayingStateView, playerId: string): string<br>export function hasFullSpyCardReveal(player: PublicPlayerView): boolean<br>export function visibleKitId(player: PublicPlayerView): KitId \| null<br>export function livingSpiesOnYou(view: PlayingStateView): PublicPlayerView[]<br>export function buildRewardChoice(kind: RewardKind, cardInstanceId: string): RewardChoice \| null<br>export function cardPlayNeedsTarget(cardId: string, isUpgraded = false): boolean<br>export function activeUpgradeInstanceId(view: PlayingStateView, instance: CardInstance): string \| null<br>export function cardPlayNeedsConsume(cardId: string): boolean<br>export function cardIsSelfOnlyPlay(cardId: string, isUpgraded = false): boolean<br>export function cardEffectText(instance: CardInstance): string |
| L72-04 | `apps/client/src/view-model/opponent-seat-resources.ts` | export interface OpponentLiveResources<br>export type OpponentResourceDisplay<br>export function opponentResourceDisplay(player: Pick<PublicPlayerView, 'spied' \| 'eliminationReveal'>): OpponentResourceDisplay<br>export function opponentKitIsVisible(player: Pick<PublicPlayerView, 'spied' \| 'eliminationReveal'>): boolean<br>export function opponentHasLiveResourceIcons(player: Pick<PublicPlayerView, 'spied' \| 'eliminationReveal'>): boolean<br>export function collectLiveResourceSnaps(you: string, self: OpponentLiveResources, players: readonly PublicPlayerView[]): Map<string, OpponentLiveResources> |
| L72-04 | `apps/client/src/view-model/pending-chip-tone.ts` | export function pendingChipCalloutTone(cardId: string): 'threat' \| 'guide' |
| L72-04 | `apps/client/src/view-model/attack-targets.ts` | export interface AttackTargetSeat<br>export function riposteAttackerIds(pendingEffects: readonly PendingPick[], you: string): Set<string><br>export function attackTargetOpponents<T extends AttackTargetSeat>(opponents: readonly T[], pendingEffects: readonly PendingPick[], you: string): T[]<br>export function thiefTargetOpponents<T extends AttackTargetSeat>(opponents: readonly T[], pendingEffects: readonly PendingPick[], you: string): T[] |
| L72-04 | `apps/client/src/view-model/chat-unread.ts` | export function chatUnreadCount(input: { messageCount: number; seenCount: number; open: boolean }): number |
| L72-04 | `apps/client/src/view-model/table-banner.ts` | export const TABLE_BANNER_MS = 1600<br>export type TableBannerCue = 'turn' \| 'attacked' \| 'dead' \| 'won'<br>export const TABLE_BANNER_COPY: Record<TableBannerCue, string><br>export const WIPE_BANNER_COPY = 'You gambled too much and lost everything'<br>export function isFlashierBanner(cue: TableBannerCue): boolean<br>export interface TableBannerInput { isMyTurn: boolean; isEliminated: boolean; youWon: boolean; pendingEffects: readonly PendingEffectView[]; you: string }<br>export interface TableBannerWatch<br>export function emptyTableBannerWatch(): TableBannerWatch<br>export interface SentenceBannerWatch<br>export function emptySentenceBannerWatch(): SentenceBannerWatch<br>export function sentenceAnnouncementKey(entry: SentenceAnnouncementLogEntry): string<br>export interface SentenceBannerInput<br>export function nextSentenceBannerLines(prev: SentenceBannerWatch, input: SentenceBannerInput): /* unchanged */<br>export function nextWipeBannerLines(prev: SentenceBannerWatch, entries: readonly ActionLogEntryView[], you: string): /* unchanged */<br>export function povHasWon(/* unchanged */): boolean<br>export function nextTableBannerCues(prev: TableBannerWatch, input: TableBannerInput): { cues: TableBannerCue[]; next: TableBannerWatch } |
| L72-04 | `apps/client/src/view-model/tutorial-coach-copy.ts` | export const TUTORIAL_IDLE_MS = 20_000<br>export const TUTORIAL_IDLE_PLAY_TITLE = 'Play'<br>export type TutorialSendIntent<br>export type TutorialCardActionSpotlight = 'use' \| 'upgrade' \| 'sell'<br>export type TutorialEconomySpotlight = 'draw' \| 'shop'<br>export type TutorialShopSpotlight = 'upgrade-point' \| 'absorber'<br>export function resolveTutorialCoach(index: number): TutorialCoachCopy \| undefined<br>export function resolveTutorialPresentationCoach(/* unchanged */)<br>export function tutorialCoachTitle(copy: TutorialCoachCopy, idle: boolean): string<br>export function tutorialCoachMessageKey(/* unchanged */)<br>export function isTutorialCoachOpen(/* unchanged */)<br>export type CoachResourceKind = 'point' \| 'life' \| 'upgradePoint' \| 'shield'<br>export type CoachBodyPart = { readonly kind: 'text'; readonly text: string; readonly bold: boolean } \| { readonly kind: 'resource'; readonly resource: CoachResourceKind; readonly amount: number \| null; readonly sign: '+' \| ''; readonly word: string; readonly bold: boolean }<br>export function parseCoachBody(text: string): readonly CoachBodyPart[]<br>export function tutorialHighlightAt(index: number): TutorialHighlight<br>export function tutorialSendAllowed(/* unchanged */)<br>export function tutorialSpotlightInstanceIds(/* unchanged */)<br>export function tutorialCardActionSpotlight(/* unchanged */)<br>export function tutorialEconomySpotlight(/* unchanged */)<br>export function tutorialShopSpotlight(/* unchanged */)<br>export function tutorialPortraitSpotlight(highlight: TutorialHighlight): boolean<br>export function isTutorialIncomingThreatCard(cardId: string): boolean<br>export function tutorialIncomingThreatIds(/* unchanged */) |
| L72-04 | `apps/client/src/view-model/table-copy.ts` | export const HIDDEN_KIT_LABEL = 'Hidden kit'<br>export const HIDE_COACH_ARIA_LABEL = 'Hide coach'<br>export const OPEN_COACH_ARIA_LABEL = 'Show coach'<br>export const GOT_IT_ACTION_LABEL = 'Got it'<br>export const FEEDBACK_ARIA_LABEL = 'Feedback'<br>/* every other *_LABEL / *_TITLE / *_BODY / SHOP_PRICE_BLURB constant unchanged */ |
| L72-04 | `apps/client/src/view-model/kit-inspect-traits.ts` | export const KIT_TRAIT_SECTION_KEYS: readonly ['alwaysUpgraded','immuneTo','allowsMultipleAttacksPerTurn','upgradePointBuyCost','upgradePointSellYield','drawBustDenominator']<br>export const KIT_ABILITY_COPY: Partial<Record<KitId, string>> |
| L72-04 | `apps/client/src/view-model/kit-special-card-key.ts` | export function kitSpecialCardKey(cardId: string, index: number): string |
| L72-04 | `apps/client/src/view-model/chrome-labels.ts` | export const DRAW_ACTION_LABEL = 'Draw'<br>export const SHOP_ACTION_LABEL = 'Shop'<br>export const UNSPY_ACTION_LABEL = 'Unspy'<br>export const BUY_UPGRADE_POINT_LABEL = 'Buy'<br>export const SELL_UPGRADE_POINT_LABEL = 'Sell'<br>export const CARD_UPGRADE_LABEL = 'Upgrade'<br>export const CARD_SELL_LABEL = 'Sell'<br>export const BUY_SPECIAL_LABEL = 'Buy special'<br>export const BUY_POOL_CARD_LABEL = 'Buy random'<br>export const CARD_BUY_LABEL = 'Buy selected'<br>export const SHOP_SECTION_UPGRADE_POINTS = 'Upgrade points'<br>export const SHOP_SECTION_CARDS = 'Cards'<br>export const SHOP_SECTION_POOL = 'Pool'<br>export const CHROME_COST_LABELS |
| L72-04 | `apps/client/src/view-model/table-flag-intent.ts` | export type TableFlagIntent = 'hidden' \| 'forfeit' \| 'leaveTable' \| 'returnHome' \| 'skipTutorial'<br>export type TableFlagLeaveAction = 'hidden' \| 'forfeit' \| 'leaveGame'<br>export function tableFlagIntent(input: /* unchanged */): TableFlagIntent<br>export function tableFlagLeaveAction(input: /* unchanged */): TableFlagLeaveAction<br>export function tableFlagAriaLabel(intent: TableFlagIntent, labels: /* unchanged */): string |
| L72-04 | `apps/client/src/view-model/active-display.ts` | export { ACTIVE_SHIELD_INSTANCE_ID }<br>export function persistentToCardInstance(effect: PersistentEffectView): CardInstance<br>export function shieldActiveInstance(isUpgraded: boolean): CardInstance |
| L72-04 | `apps/client/src/view-model/sub-choice-constants.ts` | export const CLIENT_SUB_CHOICE_MS = 40_000 |
| L72-05 | `apps/client/src/ui/tokens.css` | :root { --bg-0:#0c0920; --bg-1:#17113a; --glow-a:#ff3d7f; --glow-b:#3da9ff; --panel:#1f1850; --panel-2:#2b2256; --ink:#0c0920; --text:#f3eeff; --text-2:#cfc6ff; --text-on-card:#2a2550; --text-on-cta:#0c0920; --life:#ff3d7f; --point:#ffc93d; --upgrade:#3dcf8f; --shield:#6b8cff; --cta:#ffd43d; --cta-2:#3da9ff; --danger:#ff4d4d; --threat-attack:#ff3d7f; --threat-other:#ffa53d; --mine:#3da9ff; --seat-0 … --seat-7 (finalized here); --card-face-0:#ffffff; --card-face-1:#f1edff; --card-radius:12px; --card-rim-width:2px; --card-rim-holo:<conic-gradient>; --card-rim-gold:<gradient>; --card-shadow:0 10px 22px rgba(0,0,0,.45); --chrome-outline-width:3px; --chrome-shadow:0 4px 0 var(--ink); --chrome-radius:12px; --chrome-radius-sm:10px; --chrome-press-y:3px; --scanline:rgba(255,255,255,.03); --dur-fast:120ms; --dur-base:220ms; --dur-slow:400ms; --ease-entrance:cubic-bezier(0.16,1,0.3,1); --type-micro:11px; --type-caption:12px; --type-body:14px; --type-input:16px; --type-title:20px; --type-vital:22px; --type-display:32px }<br>@theme inline { --color-v7-<token>: var(--<token>) for every color above incl. --color-v7-seat-0..7; --radius-v7-chrome; --radius-v7-chrome-sm; --radius-v7-card; --shadow-v7-chrome; --shadow-v7-card; --font-v7-display: 'Lilita One', ui-rounded, system-ui, sans-serif; --font-v7-card: 'Fredoka', ui-rounded, system-ui, sans-serif; --font-v7-body: 'Nunito', ui-sans-serif, system-ui, sans-serif; --text-v7-micro … --text-v7-display: var(--type-*); --ease-v7-entrance: var(--ease-entrance) }<br>@layer components { .v7-ground { background: two radial halos (--glow-a/--glow-b at ~30% opacity) over linear-gradient(to bottom, var(--bg-1), var(--bg-0)); static 1 px scanlines every 3 px in var(--scanline) } } |
| L72-05 | `apps/client/src/ui/palette.ts` | export const V7_COLORS: { readonly 'bg-0': '#0c0920'; readonly 'bg-1': '#17113a'; readonly 'glow-a': '#ff3d7f'; readonly 'glow-b': '#3da9ff'; readonly panel: '#1f1850'; readonly 'panel-2': '#2b2256'; readonly ink: '#0c0920'; readonly text: '#f3eeff'; readonly 'text-2': '#cfc6ff'; readonly 'text-on-card': '#2a2550'; readonly 'text-on-cta': '#0c0920'; readonly life: '#ff3d7f'; readonly point: '#ffc93d'; readonly upgrade: '#3dcf8f'; readonly shield: '#6b8cff'; readonly cta: '#ffd43d'; readonly 'cta-2': '#3da9ff'; readonly danger: '#ff4d4d'; readonly 'threat-attack': '#ff3d7f'; readonly 'threat-other': '#ffa53d'; readonly mine: '#3da9ff'; readonly 'card-face-0': '#ffffff'; readonly 'card-face-1': '#f1edff' } /* as const */<br>export type V7ColorToken = keyof typeof V7_COLORS<br>export const V7_SEAT_COLORS: readonly [string, string, string, string, string, string, string, string]<br>export function v7Color(token: V7ColorToken): string<br>export function v7SeatColor(index: number): string |
| L72-05 | `apps/client/src/ui/contrast.ts` | export const WCAG_AA_TEXT = 4.5<br>export const WCAG_AA_LARGE_TEXT = 3<br>export function relativeLuminance(hex: string): number<br>export function contrastRatio(foreground: string, background: string): number<br>export function deltaE2000(hexA: string, hexB: string): number<br>export const SEAT_HUE_MIN_DELTA_E: number |
| L72-05 | `apps/client/src/ui/fonts.ts` | — |
| L72-05 | `apps/client/src/ui/motion/motion-tokens.ts` | export const DUR_FAST_MS = 120<br>export const DUR_BASE_MS = 220<br>export const DUR_SLOW_MS = 400<br>export const V7_DURATIONS_MS: { readonly fast: 120; readonly base: 220; readonly slow: 400 }<br>export type V7Duration = keyof typeof V7_DURATIONS_MS<br>export const CARD_SPRING: { readonly type: 'spring'; readonly stiffness: 400; readonly damping: 28 }<br>export const EASE_ENTRANCE: readonly [0.16, 1, 0.3, 1]<br>export function durationS(duration: V7Duration): number |
| L72-05 | `apps/client/src/ui/motion/reduced-motion.ts` | export interface V7MotionTarget { readonly opacity?: number; readonly x?: number \| string; readonly y?: number \| string; readonly scale?: number; readonly rotate?: number; readonly color?: string; readonly backgroundColor?: string; readonly boxShadow?: string }<br>export interface V7MotionSpec { readonly initial?: V7MotionTarget; readonly animate: V7MotionTarget; readonly exit?: V7MotionTarget; readonly transition?: Transition }<br>export function reduceMotionSpec(spec: V7MotionSpec): V7MotionSpec<br>export function motionSpecFor(spec: V7MotionSpec, reduced: boolean): V7MotionSpec |
| L72-05 | `apps/client/src/ui/motion/use-prefers-reduced-motion.ts` | export function usePrefersReducedMotion(): boolean |
| L72-05 | `DESIGN.md` | — |
| L72-06 | `vitest.config.ts` | client project test: { name: 'client', root: './apps/client', environment: 'node', include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'] } |
| L72-06 | `apps/client/src/test/render.tsx` | export interface RenderUiOptions extends Omit<RenderOptions, 'queries'> { reducedMotion?: boolean; advanceTimers?: (delay: number) => unknown }<br>export interface RenderUiResult extends RenderResult { user: UserEvent }<br>export function renderUi(ui: ReactElement, options?: RenderUiOptions): RenderUiResult<br>export function setReducedMotion(reduce: boolean): void |
| L72-07 | `apps/client/src/ui/icons/icon-names.ts` | export const ICON_NAMES: readonly ['life','point','upgrade','shield','spied-by-you','spying-on-you','shield-active','block','persistent','invisibility','reanimation-armed','duplication-active','eliminated','bot','disconnected','absorb-window','sentence-ticking','menu','shop','draw','log','help','coach','chat','feedback','flag','sound','vibration','rules','share','copy','minimize','clock','close','chevron-left','chevron-right','random']<br>export type IconName = (typeof ICON_NAMES)[number]<br>export const RESOURCE_ICON: Record<ResourceKind, IconName> /* life→'life', point→'point', upgradePoint→'upgrade', shield→'shield' */<br>export function isIconName(value: string): value is IconName |
| L72-07 | `apps/client/src/ui/icons/icon.tsx` | export interface IconProps { name: IconName; size?: number; label?: string; className?: string }<br>export function Icon(props: IconProps): ReactElement |
| L72-08 | `apps/client/src/ui/viewport-mode.ts` | export type ViewportMode = 'portrait' \| 'landscape-compact' \| 'desktop'<br>export const LANDSCAPE_COMPACT_MAX_HEIGHT_PX = 500<br>export function viewportModeFor(box: { readonly width: number; readonly height: number }): ViewportMode |
| L72-08 | `apps/client/src/ui/use-visual-viewport-box.ts` | export function useVisualViewportBox(): VisualViewportBox<br>export function useViewportMode(): ViewportMode |
| L72-08 | `apps/client/src/ui/ui-copy.ts` | export const EXCLUDED_LABEL = 'Excluded' |
| L72-08 | `apps/client/src/ui/primitives/button.tsx` | export type ButtonVariant = 'primary' \| 'secondary' \| 'danger' \| 'quiet'<br>export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' \| 'children'> { variant?: ButtonVariant; children: ReactNode; icon?: IconName; size?: 'md' \| 'lg'; disabledReason?: string; reserveReasonSlot?: boolean; fullWidth?: boolean; className?: string }<br>export function Button(props: ButtonProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/icon-button.tsx` | export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' \| 'children' \| 'title' \| 'className'> { 'aria-label': string; icon: IconName; count?: number; variant?: ButtonVariant; title?: string \| null; className?: string }<br>export function IconButton(props: IconButtonProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/pill.tsx` | export type PillTone = 'life' \| 'point' \| 'upgrade' \| 'shield' \| 'neutral'<br>export interface PillProps { icon: IconName; label: string; value: number \| 'unknown'; resourceKind?: ResourceKind; size?: 'sm' \| 'md' \| 'lg'; captionVisible?: boolean; tone?: PillTone; className?: string }<br>export function Pill(props: PillProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/badge.tsx` | export type BadgeTone = 'neutral' \| 'threat-attack' \| 'threat-other' \| 'mine' \| 'life' \| 'point' \| 'upgrade' \| 'shield'<br>export interface BadgeProps { icon?: IconName; label: string; value?: string \| number; tone?: BadgeTone; labelHidden?: boolean }<br>export function Badge(props: BadgeProps): ReactElement<br>export interface BadgeGroupItem extends BadgeProps { id: string }<br>export interface BadgeGroupProps { items: readonly BadgeGroupItem[]; max?: number; onOverflowClick?: () => void }<br>export function BadgeGroup(props: BadgeGroupProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/avatar.tsx` | export interface AvatarProps { name: string; seatIndex: number \| null; imageUrl?: string; alt?: string; eliminated?: boolean; size?: 'sm' \| 'md' \| 'lg'; className?: string }<br>export function Avatar(props: AvatarProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/avatar-initial.ts` | export function avatarInitial(name: string): string |
| L72-08 | `apps/client/src/ui/primitives/tabs.tsx` | export interface TabItem<T extends string> { readonly id: T; readonly label: string; readonly disabled?: boolean }<br>export interface TabsProps<T extends string> { label: string; tabs: readonly TabItem<T>[]; selectedId: T; onSelect: (id: T) => void; children: ReactNode; idPrefix?: string }<br>export function Tabs<T extends string>(props: TabsProps<T>): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/segmented.tsx` | export interface SegmentedOption<T extends string \| number> { readonly value: T; readonly label: string; readonly disabled?: boolean }<br>export interface SegmentedProps<T extends string \| number> { label: string; options: readonly SegmentedOption<T>[]; value: T; onChange: (value: T) => void; disabled?: boolean }<br>export function Segmented<T extends string \| number>(props: SegmentedProps<T>): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/slider.tsx` | export interface SliderProps { label: string; min: number; max: number; step?: number; value: number; onChange?: (value: number) => void; onCommit: (value: number) => void; disabled?: boolean; formatValue?: (value: number) => string }<br>export function Slider(props: SliderProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/toggle.tsx` | export interface ToggleProps { label: string; pressed: boolean; onPressedChange: (pressed: boolean) => void; icon?: IconName; labelHidden?: boolean; disabled?: boolean }<br>export function Toggle(props: ToggleProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/tooltip.tsx` | export interface TooltipProps { content: string; children: ReactElement; placement?: 'top' \| 'bottom' }<br>export function Tooltip(props: TooltipProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/scroll-area.tsx` | export interface ScrollAreaProps { children: ReactNode; axis?: 'y' \| 'x' \| 'both'; label?: string; className?: string; ref?: Ref<HTMLDivElement> }<br>export function ScrollArea(props: ScrollAreaProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/text-field.tsx` | export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' \| 'size' \| 'children'> { label: string; labelHidden?: boolean; hint?: string; error?: string \| null; className?: string; ref?: Ref<HTMLInputElement> }<br>export function TextField(props: TextFieldProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/carousel.tsx` | export interface CarouselSlide { readonly id: string; readonly label: string; readonly content: ReactNode; readonly dataAttributes?: Readonly<Record<`data-${string}`, string>> }<br>export interface CarouselProps { label: string; slides: readonly CarouselSlide[]; index?: number; onIndexChange?: (index: number) => void; gridAtDesktop?: boolean; previousLabel: string; nextLabel: string }<br>export function Carousel(props: CarouselProps): ReactElement |
| L72-08 | `apps/client/src/ui/primitives/kit-tile.tsx` | export interface KitTileStat { readonly icon: IconName; readonly label: string; readonly value: string }<br>export interface KitTileProps { name: string; portrait: ReactNode; stats: readonly KitTileStat[]; selected?: boolean; excluded?: boolean; onSelect?: () => void; onInfo?: () => void; infoLabel?: string }<br>export function KitTile(props: KitTileProps): ReactElement |
| L72-08 | `apps/client/src/dev/dev-ui-route.ts` | export const DEV_UI_PATH = '/dev/ui'<br>export function isDevUiRoute(pathname: string, isDev: boolean): boolean |
| L72-08 | `apps/client/src/dev/gallery-registry.ts` | export interface GalleryEntry { readonly id: string; readonly title: string; readonly render: () => ReactNode }<br>export interface GallerySection { readonly id: string; readonly title: string; readonly entries: readonly GalleryEntry[] }<br>export interface GalleryModule { readonly gallery: GallerySection }<br>export function collectGallerySections(modules: Readonly<Record<string, GalleryModule>>): readonly GallerySection[] |
| L72-08 | `apps/client/src/dev/ui-gallery.tsx` | export function UiGallery(): ReactElement |
| L72-09 | `apps/client/src/ui/layers.ts` | export const Z_INDEX: { readonly sheet: 50; readonly sheetBar: 80; readonly banner: 90; readonly toast: 95 } |
| L72-09 | `apps/client/src/ui/primitives/sheet-stack.ts` | export type SheetMode = 'blocking' \| 'read-only'<br>export interface SheetStackEntry { readonly id: string; readonly mode: SheetMode; readonly minimized: boolean; readonly dismissLocked: boolean; readonly openOrder: number }<br>export interface SheetStackState { readonly entries: readonly SheetStackEntry[]; readonly nextOrder: number }<br>export const EMPTY_SHEET_STACK: SheetStackState<br>export const MAX_READ_ONLY_DEPTH = 2<br>export function openSheet(state: SheetStackState, input: { id: string; mode: SheetMode; dismissLocked?: boolean }): SheetStackState<br>export function closeSheet(state: SheetStackState, id: string): SheetStackState<br>export function setSheetMinimized(state: SheetStackState, id: string, minimized: boolean): SheetStackState<br>export function setSheetDismissLocked(state: SheetStackState, id: string, locked: boolean): SheetStackState<br>export function sheetPaintOrder(state: SheetStackState): readonly SheetStackEntry[]<br>export function escTargetId(state: SheetStackState): string \| null<br>export function sheetZIndex(state: SheetStackState, id: string): number<br>export function isSheetInert(state: SheetStackState, id: string): boolean |
| L72-09 | `apps/client/src/ui/primitives/sheet-stack-context.ts` | export interface SheetStackStore { getSnapshot(): SheetStackState; subscribe(listener: () => void): () => void; open(input: { id: string; mode: SheetMode; dismissLocked?: boolean }): void; close(id: string): void; setMinimized(id: string, minimized: boolean): void; setDismissLocked(id: string, locked: boolean): void }<br>export function createSheetStackStore(): SheetStackStore<br>export const SheetStackContext: Context<SheetStackStore><br>export function useSheetStackStore(): SheetStackStore<br>export function useSheetStackState(): SheetStackState |
| L72-09 | `apps/client/src/ui/primitives/sheet-stack-provider.tsx` | export interface SheetStackProviderProps { store?: SheetStackStore; children: ReactNode }<br>export function SheetStackProvider(props: SheetStackProviderProps): ReactElement |
| L72-09 | `apps/client/src/ui/primitives/sheet-placement.ts` | export type SheetPlacement = 'bottom' \| 'center'<br>export type SheetPlacementPreference = SheetPlacement \| 'auto'<br>export function resolveSheetPlacement(preference: SheetPlacementPreference, box: { readonly width: number; readonly height: number }): SheetPlacement |
| L72-09 | `apps/client/src/ui/primitives/use-focus-trap.ts` | export function useFocusTrap(containerRef: RefObject<HTMLElement \| null>, options: { active: boolean; initialFocusRef?: RefObject<HTMLElement \| null>; restoreFocus?: boolean }): void |
| L72-09 | `apps/client/src/ui/primitives/sheet.tsx` | interface SheetBaseProps { open: boolean; title: string; children: ReactNode; actions?: ReactNode; placement?: SheetPlacementPreference; height?: 'auto' \| 'full'; initialFocusRef?: RefObject<HTMLElement \| null>; hintAnchor?: string; dataAttributes?: Readonly<Record<`data-${string}`, string>>; collapsed?: boolean; collapsedBar?: ReactNode; className?: string }<br>export interface ReadOnlySheetProps extends SheetBaseProps { mode: 'read-only'; onClose: () => void; dismissLocked?: boolean }<br>export interface BlockingSheetProps extends SheetBaseProps { mode: 'blocking'; onMinimizedChange?: (minimized: boolean) => void }<br>export type SheetProps = ReadOnlySheetProps \| BlockingSheetProps<br>export function Sheet(props: SheetProps): ReactElement \| null |
| L72-09 | `apps/client/src/ui/primitives/dialog.tsx` | export interface DialogProps { open: boolean; title: string; children: ReactNode; actions?: ReactNode; onClose: () => void; closeOnBackdrop?: boolean; dismissLocked?: boolean; width?: 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl'; hintAnchor?: string; initialFocusRef?: RefObject<HTMLElement \| null>; dataAttributes?: Readonly<Record<`data-${string}`, string>> }<br>export function Dialog(props: DialogProps): ReactElement \| null |
| L72-09 | `apps/client/src/ui/primitives/toast.tsx` | export type ToastTone = 'info' \| 'success' \| 'error'<br>export type ToastDismissCause = 'manual' \| 'timeout'<br>export interface ToastProps { open: boolean; title: string; body?: string; tone?: ToastTone; timeoutMs?: number; dismissLabel: string; onDismiss: (cause: ToastDismissCause) => void }<br>export function Toast(props: ToastProps): ReactElement \| null |
| L72-10 | `apps/client/src/ui/asset-files.ts` | export type ResourceKind = 'life' \| 'point' \| 'shield' \| 'upgradePoint'<br>export type CardBackKind = CardType \| 'kit'<br>export interface CardArtFiles { base: string; upgraded: string; activatedBase?: string; activatedUpgraded?: string }<br>export const KIT_FILES: Readonly<Record<KitId, string>><br>export const CARD_FILES: Readonly<Record<CardId, CardArtFiles>><br>export const RESOURCE_FILES: Readonly<Record<ResourceKind, string>><br>export const BACK_FILES: Readonly<Record<CardBackKind, string>> |
| L72-10 | `apps/client/src/ui/asset-lookup.ts` | export const ART_FALLBACK_URL: string<br>export function artFor(id: CardId \| KitId): string |
| L72-10 | `apps/client/scripts/art-flood-fill.ts` | export interface RgbaImage { readonly width: number; readonly height: number; readonly data: Uint8ClampedArray }<br>export interface CropRect { readonly left: number; readonly top: number; readonly width: number; readonly height: number }<br>export function clearEdgeGround(image: RgbaImage, options: { readonly tolerance: number }): RgbaImage |
| L72-10 | `apps/client/scripts/extract-art.ts` | — |
| L72-11 | `apps/client/src/ui/card/glyph-amount.ts` | export type GlyphAmount = StructuredCost \| { readonly kind: 'shield'; readonly amount: number }<br>export function glyphAmountIcon(amount: GlyphAmount): IconName<br>export function glyphAmountFromResource(kind: ResourceKind, amount: number): GlyphAmount<br>export function spokenGlyphAmount(amount: GlyphAmount, options?: { readonly multiplier?: number; readonly signed?: CostSign }): string |
| L72-11 | `apps/client/src/ui/card/cost-amount.tsx` | export interface CostAmountProps { amount: GlyphAmount; signed?: CostSign; multiplier?: number; title?: string \| null; size?: 'sm' \| 'md' \| 'lg'; className?: string }<br>export function CostAmount(props: CostAmountProps): ReactElement |
| L72-11 | `apps/client/src/ui/text/effect-text-with-icons.tsx` | export interface EffectTextWithIconsProps { text: string; iconSize?: 'sm' \| 'md' }<br>export function EffectTextWithIcons(props: EffectTextWithIconsProps): ReactElement |
| L72-11 | `apps/client/src/ui/text/card-effect-copy.tsx` | export interface CardEffectCopyProps { card: Card; isUpgraded: boolean }<br>export function CardEffectCopy(props: CardEffectCopyProps): ReactElement |
| L72-12 | `apps/client/src/ui/card/card-face.ts` | export const CARD_SIZES: readonly ['hand', 'lifted', 'sheet', 'thumb', 'tile']<br>export type CardSize = (typeof CARD_SIZES)[number]<br>export type CardCounterKind = 'card-lives' \| 'turns'<br>export interface CardCounter { readonly kind: CardCounterKind; readonly amount: number }<br>export const HIDDEN_CARD_LABEL = 'Hidden card'<br>export function cardFamilyOf(cardId: CardId): CardType<br>export function cardCostChip(cardId: CardId, isUpgraded: boolean): StructuredCost \| null<br>export function cardDamageChip(cardId: CardId, isUpgraded: boolean, damageMultiplier?: number): number \| null<br>export function cardCounterLabel(counter: CardCounter): string<br>export function cardFaceLabel(input: { readonly name: string; readonly isUpgraded: boolean; readonly damage: number \| null; readonly counter?: CardCounter }): string |
| L72-12 | `apps/client/src/ui/card/card.tsx` | interface CardCommonProps { size: CardSize; selected?: boolean; unplayable?: boolean; className?: string; dataAttributes?: Readonly<Record<`data-${string}`, string>> }<br>export interface FaceUpCardProps extends CardCommonProps { face?: 'up'; instance: CardInstance; damageMultiplier?: number; counter?: CardCounter; onActivate?: (instanceId: string) => void }<br>export interface HiddenCardProps extends CardCommonProps { face: 'hidden'; family: CardType; onActivate?: () => void }<br>export type CardProps = FaceUpCardProps \| HiddenCardProps<br>export function Card(props: CardProps): ReactElement |
| L72-13 | `packages/shared/src/domain/special-card-catalog.ts` | — |
| L72-13 | `packages/shared/src/release-notes.ts` | RELEASE_NOTES_CATALOG gains a new first entry { id: 'lot-72-v7', date: '<commit date>', title: 'New look', additions: [], items: [{ cardId: 'attack-thief', before: '<one sentence>', after: 'Fixed some bugs.' }] } |
| L72-14 | `apps/client/src/ui/chat/chat-line.ts` | export const CHAT_EMPTY_COPY = 'No messages yet.'<br>export const CHAT_INPUT_LABEL = 'Message'<br>export const CHAT_SEND_LABEL = 'Send'<br>export interface ChatLineView { readonly key: number; readonly roundLabel: string; readonly nickname: string; readonly seatIndex: SeatIndex \| null; readonly side: boolean; readonly roleLabel: string \| null; readonly body: string }<br>export function chatLineView(message: ChatMessageView, players: readonly { id: string }[]): ChatLineView |
| L72-14 | `apps/client/src/ui/chat/chat-log.tsx` | export interface ChatLogProps { messages: readonly ChatMessageView[]; players: readonly { id: string }[]; canWrite: boolean; onSend: (body: string) => void; inputLabel?: string; placeholder?: string }<br>export function ChatLog(props: ChatLogProps): ReactElement |
| L72-15 | `apps/client/src/ui/kit/kit-portrait-label.ts` | export const RANDOM_KIT_LABEL = 'Random kit'<br>export function kitPortraitAlt(kitId: LobbyKitSelection \| null): string |
| L72-15 | `apps/client/src/ui/kit/kit-portrait.tsx` | export interface KitPortraitProps { kitId: LobbyKitSelection \| null; size?: 'thumb' \| 'tile' \| 'sheet' \| 'hero'; isEliminated?: boolean; className?: string; onClick?: () => void; ariaLabel?: string }<br>export function KitPortrait(props: KitPortraitProps): ReactElement |
| L72-15 | `apps/client/src/ui/kit/kit-details-sections.ts` | export const KIT_DETAILS_SECTION_IDS: readonly ['starting-resources','starting-hand','special-cards','always-upgraded','immune-to','attacks-per-turn','upgrade-points','draw-risk','ability']<br>export type KitDetailsSectionId = (typeof KIT_DETAILS_SECTION_IDS)[number]<br>export const KIT_DETAILS_SECTION_TITLES: Record<KitDetailsSectionId, string><br>export const KIT_TRAIT_SECTION_FOR: Record<(typeof KIT_TRAIT_SECTION_KEYS)[number], KitDetailsSectionId> |
| L72-15 | `apps/client/src/ui/kit/kit-details.tsx` | export interface KitDetailsProps { kitId: KitId }<br>export function KitDetails(props: KitDetailsProps): ReactElement |
| L72-16 | `apps/client/src/ui/rules/rules-summary.ts` | export interface RulesKitFace { readonly kitId: KitId; readonly name: string; readonly excluded: boolean }<br>export function rulesKitFaces(rules: Pick<LobbyRules, 'excludedKitIds'>): readonly RulesKitFace[]<br>export function formatTurnTimeSeconds(seconds: number): string |
| L72-16 | `apps/client/src/ui/rules/rules-sheet.tsx` | export interface RulesSheetProps { open: boolean; rules: LobbyRules; onClose: () => void }<br>export function RulesSheet(props: RulesSheetProps): ReactElement \| null |
| L72-16 | `apps/client/src/ui/rules/rules-strip.tsx` | export interface RulesStripProps { rules: LobbyRules; className?: string }<br>export function RulesStrip(props: RulesStripProps): ReactElement |
| L72-17 | `apps/client/src/ui/coach/coach-panel.tsx` | export interface CoachPanelProps { title: string; body: string; zone: string; onHide: () => void; hideAriaLabel: string; footer?: ReactNode; extraAttrs?: Record<string, string>; compact?: boolean }<br>export function CoachPanel(props: CoachPanelProps): ReactElement<br>export interface CoachBodyProps { text: string }<br>export function CoachBody(props: CoachBodyProps): ReactElement |
| L72-18 | `apps/client/src/ui/banner/banner-items.ts` | export type BannerKind = TableBannerCue \| 'sentence' \| 'wipe'<br>export interface BannerItem { readonly key: string; readonly kind: BannerKind; readonly text: string }<br>export function bannerLiveMode(kind: BannerKind): 'polite' \| 'assertive'<br>export function bannerItemsForCues(cues: readonly TableBannerCue[], startSeq: number): BannerItem[] |
| L72-18 | `apps/client/src/ui/banner/table-banner-host.tsx` | export interface TableBannerHostProps { isMyTurn: boolean; isEliminated: boolean; youWon: boolean; pendingEffects: readonly PendingEffectView[]; sentenceAnnouncements: readonly SentenceAnnouncementLogEntry[]; actionLog: readonly ActionLogEntryView[]; nicknameOf: (id: string) => string; you: string; seatColor?: string }<br>export function TableBannerHost(props: TableBannerHostProps): ReactElement |
| L72-19 | `apps/client/src/ui/seat/connection-badge-label.ts` | export interface ConnectionBadgePlayer { connection: { status: 'connected' \| 'disconnected' \| 'absent'; automaticTurnsTaken: number; consecutiveTimeouts: number }; isEliminated: boolean }<br>export function connectionBadgeLabel(player: ConnectionBadgePlayer): string \| null |
| L72-19 | `apps/client/src/ui/seat/connection-badge.tsx` | export interface ConnectionBadgeProps { player: ConnectionBadgePlayer; className?: string }<br>export function ConnectionBadge(props: ConnectionBadgeProps): ReactElement \| null |
| L72-19 | `apps/client/src/ui/seat/bot-seat-label.tsx` | export interface BotSeatLabelProps { difficulty: BotDifficulty; className?: string }<br>export function BotSeatLabel(props: BotSeatLabelProps): ReactElement |
| L72-19 | `apps/client/src/ui/seat/player-name.tsx` | export interface PlayerNameProps { nickname: string; playerId?: string; view?: SeatPlayersView; seatIndex?: number; className?: string; possessive?: boolean }<br>export function PlayerName(props: PlayerNameProps): ReactElement |
| L72-20 | `apps/client/src/ui-switch.ts` | export const UI_SWITCH_STORAGE_KEY = 'card-battle.v7.ui'<br>export const UI_SWITCH_QUERY_PARAM = 'ui'<br>export type TableUi = 'classic' \| 'next'<br>export type UiSwitchParam = TableUi \| null<br>export interface UiSwitchStorage { getItem(key: string): string \| null; setItem(key: string, value: string): void; removeItem(key: string): void }<br>export function browserUiSwitchStorage(): UiSwitchStorage \| null<br>export function parseUiSwitchParam(search: string): UiSwitchParam<br>export function applyUiSwitchParam(param: UiSwitchParam, storage: UiSwitchStorage \| null): TableUi<br>export function readStoredTableUi(storage: UiSwitchStorage \| null): TableUi<br>export function resolveTableUi(input: { preference: TableUi; playKind: PlayKind }): TableUi |
| L72-20 | `apps/client/src/screens/arena/arena-screen.tsx` | export type ArenaScreenProps = TableScreenProps<br>export function ArenaScreen(props: ArenaScreenProps): ReactElement |
| L72-20 | `apps/client/src/App.tsx` | export function App(): ReactElement \| null /* unchanged export */ |
| L72-20 | `apps/client/src/screens/end.tsx` | export interface EndScreenProps { view: FinishedStateView; actionReject: ActionRejectPayload \| null; onDismissActionReject: () => void; statusLabel: string; nowMs: number; onLeave: () => void; onPlayAgain?: () => void; tableUi?: TableUi }<br>export function EndScreen(props: EndScreenProps): ReactElement |
| L72-21 | `docs/agent/frontend.md` | — |
