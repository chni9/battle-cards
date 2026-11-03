# V7 Lot 76 — Home and lobby Implementation Plan (Part 1: lobby)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Home and the lobby into `screens/home/` and `screens/lobby/` with behavior tests, fix the Lot 76 stale copy, and rebuild the lobby side on the V7 design system: the rules strip with the host editor, the kit picker sheet, the lobby as a mini arena, its chat panel, dismissible errors with a reconnect lock, guest rule-change toasts and the claim sheet with Claim a seat.

**Architecture:**
- `screens/home/` and `screens/lobby/` hold the screens; each `.tsx` renders props and calls intents, and every decision a test needs lives in a sibling pure `.ts` helper (no rule logic, golden rule 8).
- The rules editor lives in `ui/rules/` beside the L72 `RulesStrip` / `RulesSheet`; the kit picker sheet in `screens/lobby/` is shared by the lobby and the solo path.
- App keeps the connection and routing; Lot 76 edits `App.tsx` only for import paths, the lobby reject and reconnect props, the phase-change reject clear and the claim reopen handler.
- **Part 2** (L76-04 … L76-08, L76-11, L76-17, L76-18: the Home restyle, What's new, How to play, Feedback, the paths, the invite link and the gate) stays in brief form below and is expanded into TDD steps once Part 1 is committed on this branch. One branch, one PR into `dev` after L76-18 (designer 2026-11-03: "2 moitiés, 1 PR"); an early PR of Part 1 only on the developer's explicit yes.

**Tech Stack:** React 19 · TypeScript (strict) · Vitest 4 · @testing-library/react + user-event on happy-dom (`renderUi`, `apps/client/src/test/render.tsx`) · motion · the L72 `ui/` design system. No new dependency.

**Spec:** `docs/technical_spec_v7.md` (normative; §4.1–§4.2, §5, §6.7 stack contract, §7.1–§7.5, §7.7, §10, §11, §12, §13) with Appendix A `docs/technical_spec_v7_parity.md`. Tracker: `docs/backlog_v7.md` Lot 76. Design: `DESIGN.md`, `PRODUCT.md`. Visual direction: spec + DESIGN.md, reviewed at the L76-18 gate and in the PR (designer 2026-11-03).

## Global Constraints

- **Client-only (§1, §15 row 76).** No server, engine or protocol change; `PROTOCOL_VERSION` stays 45; no Classic rule or value changes. The only `packages/shared` edit is `src/release-notes.ts` (What's new, §10.4). A task that finds a real need stops and asks.
- **Files Lot 76 never edits:** `screens/table/**` (sole exception: one assertion line, Appendix A.9 ruling 2), `screens/table.tsx`, `screens/arena/**`, `design/**`, `screens/end.tsx`. Lot 75 owns them in parallel (it flips the table in `App.tsx`/`end.tsx` and deletes `screens/table/**` and orphaned `design/components/*`). Lot 76 deletes no `design/` file, even one it orphans: L75-11 or L81 does. No Lot 76 file imports `screens/table/**`. A **new** Lot 76 file never imports `design/**`; a V2 file that a task only moves (L76-01, L76-02) keeps its `design/` and `bots/` imports until its restyle task (Home: L76-04/08/11; lobby: L76-12), so L75-11's orphan sweep must treat them as live.
- **`App.tsx`** changes only where a task's Files list says so, in the Home, lobby and claim branches and the reject state; never in the `playing` / `finished` rendering branches (L75-09 rewrites them).
- **Import rule.** `screens/home/` and `screens/lobby/` import from `ui/`, `view-model/`, `net/` (types), `help/`, `feedback/`, shared screen modules (`status-labels`, `illegal-action-copy`, `how-to-play-dialog`, `whats-new-dialog`, `claim-seat*`, `solo-menu-seed`, `kit-pick-copy`) and each other (the solo path imports the lobby kit picker sheet). `ui/` never imports `screens/`.
- **No rule logic in components (golden rule 8).** Start/Ready gating comes from `screens/lobby/lobby-ready.ts`; kit selections from `lobby-kit-picker.ts`; rules payloads from the rules editor model; nothing re-derives a server rule. Server revalidation stays the only validation.
- **Commit rule for the lobby.** An intent leaves only on an explicit control: Start, Ready / Cancel ready, Add bot, a bot difficulty change, the Kick confirm's Kick, Select this kit, a rules editor control (slider on release), chat Send / Enter, Sit here, a walk-in's Stay. Opening or closing a sheet, the strip, the kit picker, the Kick confirm or a kit sheet sends nothing; every test that opens or closes one asserts no intent spy was called.
- **Tests (§12.1, §12.2, AGENTS.md §6, `docs/agent/testing.md`).**
  - Component tests are `*.test.tsx` that open with `// @vitest-environment happy-dom` and render through `renderUi`. Query by role, name and visible text.
  - Pure logic is tested in node `*.test.ts`. `vitest` imports are explicit. Tests never call `Date.now()`; fake timers use `vi.useFakeTimers({ shouldAdvanceTime: true })` or `advanceTimers: vi.advanceTimersByTime` for user-event.
  - **Never a new source-text (`readFileSync`) test.** (An Appendix A.7 split of an existing source-text test is a move, not a new test.) A source-text test whose code moves or is rewritten is classified per §12.1 in the same commit: product behavior → a rendered or pure test asserting the same outcome; old-layout detail → retired with a `decisions.md` entry citing the V7 section. The matching rows of `docs/backlog_v7_test_classification.md` ("Owner lot 76") are updated in the same commit (replacement test path, or "retired: decisions.md YYYY-MM-DD …").
  - No test is skipped, disabled or weakened. A moved test keeps its assertions and changes only its import paths.
  - Geometry (no horizontal scroll, Start reachable) is checked in the browser at L76-18; happy-dom has no layout.
  - **Never rely on the default happy-dom window size.** Lot 75 (L75-02) changes the client default from 1024×768 (desktop for `viewportModeFor`) to 390×844 portrait. A test whose outcome depends on the viewport mode (a `Sheet` / `Dialog` placement, a desktop layout) stubs it explicitly with the `screens/arena/use-arena-layout-box.test.tsx` pattern (`window.visualViewport` stub, `ResizeObserver` fake, `getBoundingClientRect` spy), so it passes under either default.
- **Strict TypeScript.** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` (spread optional props conditionally), `noPropertyAccessFromIndexSignature`. Never widen a type or cast to silence them; no `eslint-disable` on a type-safety rule. Unions come from `as const` arrays; named exports only. `.tsx` files export components (and their props types) only; constants and helpers go in sibling `.ts` files (react-refresh).
- **Design (DESIGN.md).**
  - V7 ground on every migrated screen; colors via `bg-v7-*` / `text-v7-*` classes or hex from `ui/palette.ts` inline (never `var()` / `color-mix()` inline). Seat hue via `v7SeatColor(index)` with `index` = the seat's position in `view.players`.
  - Tap targets ≥ 44 px; no functional text under 11 px; text inputs 16 px through `TextField`.
  - No emoji or ✕ characters (use `Icon`). Chrome composed from `ui/primitives/chrome-classes.ts`.
  - Overlays use `Sheet` / `Dialog` / `Toast` only, never a custom `fixed` layer. Read-only sheets close on Esc, backdrop or swipe-down; Esc closes only the top sheet (§6.7).
  - Excluded is never shown by color alone: greyed **and** the `EXCLUDED_LABEL` word (§7.3, §7.4, Q15, Q23).
  - Reduced motion via `usePrefersReducedMotion()`, with `data-motion` on animated roots.
  - A task that adds or changes a `ui/` file or a token updates `DESIGN.md` in the same commit (§5.8).
- **Copy:** English only. Reuse existing strings verbatim (`screens/status-labels.ts`, `ui/ui-copy.ts`, the moved lobby and Home strings). Every new or changed player-facing string is listed in the task's **Decisions** and in Appendix B (§10.6), for designer review in the PR.
- **What's new (§10.4).** Player-facing changes append to the open entry `lot-72-v7` ("New look") in `packages/shared/src/release-notes.ts`: one Before / After item per screen area, not per task. Part 1 owns one **Lobby** item (opened by L76-09, extended by L76-12) and the L76-03 copy fix item; tests pinning the latest entry's item count are updated in the same commit. Never a new entry id while `lot-72-v7` is not on `main`.
- **Backlog edits** anchor on the ID cell (`| L76-NN |`): the trailing cells repeat across rows, so never find-and-replace them alone.
- **Docs per task (§12.5, AGENTS.md §9, §12).**
  - L76-01 opens a `## Home and lobby (V7 · Lot 76)` section in `docs/agent/frontend.md`, right before `## Design system (V2 · Lots 10+)`. Each later task appends its bullets there in task order and fixes any `frontend.md` line it supersedes (the V2 **Home** and **Lobby** paragraphs, the Screens table, the `ui/rules` "L76 adds the host editor here" line).
  - `decisions.md` entries are appended at the end in the `## YYYY-MM-DD · [P] …` format, each closing with its own `---`. A past entry is never edited.
  - `docs/backlog_v7.md`: the task row `To do` → `Done`; the Progress row `| 76 · Home and lobby | 18 | k |` where k is the number of Lot 76 tasks now Done (L76-01 → 1, L76-02 → 2, L76-03 → 3, L76-09 → 4, L76-10 → 5, L76-12 → 6, L76-13 → 7, L76-14 → 8, L76-15 → 9, L76-16 → 10); the Total row gains one per task. Read the current Total first: Lot 75 moves it in parallel.
- **Commits:** exactly one Conventional Commit per task, subject ≤ 50 chars (hard cap 72), with the task id, for example `refactor(lobby): split lobby into screens/lobby (L76-02)`. Files staged by name, never `git add -A`. No AI attribution and no Co-Authored-By trailer (AGENTS.md §10). `pnpm verify` green before each commit.
- **Tooling:** run every command through `pnpm` (Node is pinned via `devEngines`). Single test file: `pnpm vitest run <path>`. Never start or stop dev servers in a task: browser checks belong to L76-18 (or to the controller after a task review), on ports other than 2567 / 5173.

## Conventions (shared by every task)

- **Files:** kebab-case under `screens/home/`, `screens/lobby/` or `ui/rules/` (Appendix A.1, A.2, A.4). No `index.ts` barrels: App imports `./screens/home/home-screen` and `./screens/lobby/lobby-screen`.
- **Inputs:** Home tests render `<HomeScreen {...makeHomeProps(…)} />`; lobby tests render `<LobbyScreen {...makeLobbyProps({ view: hostLobbyView(…) })} />` (Appendix A.3). App-level tests use `fakeRoomConnection` (L76-14 on). Tests override only what they assert on.
- **Storage:** Home reads `localStorage` at mount; tests call `localStorage.clear()` in `beforeEach` and seed keys (`card-battle.v6.howToPlaySeen`, `card-battle.v6.lastSeenReleaseId`) before `renderUi`.
- **Feedback POST:** a rendered test that sends feedback mocks `feedback/submit-feedback` with `vi.mock` (relative path from the test file).
- **Overlays:** V7 `Sheet` / `Dialog` portal to `document.body`: scope queries with `within(screen.getByRole('dialog', { name }))`. A closing overlay leaves the DOM after its exit: render with `reducedMotion: true` and `await waitFor(...)` before asserting it is gone. A V2 `design/components/dialog` (still used by Feedback, How to play and What's new until Part 2) behaves the same way.
- **Live regions:** a mounted `Toast` keeps two empty live regions (`role="status"`, `role="alert"`) in `document.body`, so lobby and App tests scope `alert` / `status` role queries to `main` (or another container), never `screen` alone.
- **Order** comes from the view (`view.players`, `KIT_IDS`, `HOW_TO_PLAY_SECTIONS`); components never sort.
- **Docs bullets** in the frontend.md Lot 76 section start with the file and the task id (Appendix A.8).

## Review Focus

The five input classes the spec implies, no brief Acceptance tests, and a player is most likely to meet. Each one has a test in the owning task.

1. **The host excludes the kit a guest is previewing.** The kit sheet is open on 'Assassin' and a lobby view arrives with Assassin excluded: Select this kit turns disabled at once, a click on it sends nothing, and the grid shows Assassin greyed with `Excluded`. Owner: **L76-10** (rerender with the new rules while the kit sheet is open; `onSelect` never called).
2. **A server-default clock above the host range.** The view says `turnTimeSeconds: 300` (server default, never set by the host). A kit toggle, All, None or Random sends a payload with no `turnTimeSeconds` (sending one would override the default for good); the strip reads `300s`; the slider sits at 180. Owner: **L76-09** (payload `toEqual` without the key; strip text).
3. **A kicked guest lands on Home.** The view goes from a lobby to `null` with `error: 'You were kicked.'`: the phase-change clear must not erase it, so Home still shows the alert. Owner: **L76-14** (App test: rerender lobby → null; `clearActionReject` not called; the alert text is on Home).
4. **The Kick target leaves while the confirm is open.** The guest leaves, or the bot seat disappears, before the host confirms: the dialog closes and nothing is sent; a double click on Kick sends exactly one `onKickPlayer`. Owner: **L76-12** (rerender without the seat; two clicks → one call).
5. **The claimable set changes under the claim sheet.** The walk-in picked a seat and another player claims it first (the seat leaves `seats`): the selection clears, Sit here turns disabled, and a double tap on Sit here sends one `claimSeat`. Owner: **L76-16** (rerender without the picked seat; two clicks → one call).

## Execution order

Sequential: **L76-01 → L76-02 → L76-03 → L76-09 → L76-10 → L76-12 → L76-13 → L76-14 → L76-15 → L76-16** (Appendix A.1). L76-02, L76-10 and L76-13 unblock Lot 75's L75-11 once merged into `dev`. After L76-16, Part 2 (L76-04 … L76-08, L76-11, L76-17, L76-18) is planned on the real code; nothing is pushed before the developer's yes.

---

## Part 1 — Tasks L76-01, 02, 03, 09, 10, 12, 13, 14, 15, 16 (execution order)

### Task L76-01: Split Home into screens/home with behavior tests

**Files:**
- Move: `apps/client/src/screens/home.tsx` → `apps/client/src/screens/home/home-screen.tsx` (`git mv`, so blame follows the screen), then cut the sub-components out of it into the files below. Every class, string, attribute, handler and DOM order stays as it is.
- Create (all under `apps/client/src/screens/home/`):
  - `home-hub.tsx` (`HomeHub`, was `HubView`), `online-path.tsx`, `solo-path.tsx`, `tutorial-path.tsx`, `path-header.tsx`, `home-status.tsx` (`HomeStatus`, was `StatusBlock`), `nickname-field.tsx`, `home-art.tsx` (`HomeArt`, `BetaCard`).
  - `home-classes.ts` (`HOME_INPUT_CLASS`, was the private `inputClassName`).
  - Pure helpers: `home-gate.ts`, `home-whats-new.ts`, `solo-rules-state.ts`.
  - Test helper: `test-home.ts`.
- Test (create): `screens/home/home-screen.test.tsx` (36), `screens/home/home-gate.test.ts` (3), `screens/home/home-whats-new.test.ts` (2), `screens/home/solo-rules-state.test.ts` (5).
- Delete (`git rm`): `apps/client/src/screens/home.admin-route.test.ts`, `home.feedback-surfaces.test.ts`, `home.tutorial-hints-independence.test.ts`, `home.visual-viewport.test.ts` (all in `screens/`).
- Modify:
  - `apps/client/src/App.tsx` line 22 only: `import { HomeScreen } from './screens/home';` → `import { HomeScreen } from './screens/home/home-screen';`.
  - `apps/client/src/screens/whats-new-dialog.test.ts`: drop the `home.tsx` reads (Appendix A.7), keep every dialog and catalog `expect()`.
  - `docs/agent/frontend.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`.
- Existing tests that must stay green unchanged: `screens/status-labels.test.ts`, `screens/how-to-play-content.test.ts`, `screens/solo-menu-seed.test.ts`, `screens/lobby-kit-picker.test.ts`, `ui/help-storage.test.ts`, `ui/release-storage.test.ts`, `ui/tutorial-hints-independence.test.ts`, `App.tutorial-hints-independence.test.ts`, `App.arena.test.tsx`, `admin/admin-route.test.ts`, `inbox/inbox-route.test.ts`, every `feedback/*.test.ts`, `packages/shared/src/release-notes.test.ts`.

**Interfaces:**
- Consumes (all exist at `c6941bec`):
  - `@card-battle/shared`: `allowedKitIds`, `BOT_DIFFICULTIES`, `defaultLobbyRules`, `isTurnTimeSeconds`, `SOLO_OPPONENT_COUNTS`, `latestReleaseNote`, `RELEASE_NOTES`, `PROTOCOL_VERSION`, types `BotDifficulty`, `LobbyKitSelection`, `LobbyRules`, `SoloOpponentCount`, `WhatsNewScope`, `FeedbackSubmitBody`.
  - `ui/help-storage`: `hasSeenHowToPlay`, `markHowToPlaySeen`, `readHintState`, `HOW_TO_PLAY_SEEN_KEY`, `HINTS_STORAGE_KEY`, type `HowToPlayContinueTarget` (`'online' | 'solo' | 'tutorial'`).
  - `ui/release-storage`: `hasUnseenReleaseNotes`, `markLatestReleaseSeen`, `shouldAutoOpenWhatsNew`, `LAST_SEEN_RELEASE_ID_KEY`.
  - `screens/`: `HowToPlayDialog` + type `HowToPlayCloseReason` (`'skip' | 'got-it' | 'dismiss'`) from `how-to-play-dialog`, `WhatsNewDialog`, `LobbyKitPickerDialog`, `LobbyRulesPanel`, `lobbyKitSelectionLabel` (`lobby-kit-picker`), `homeStatusCopy` + `STATUS_LABELS` (`status-labels`), type `SoloMenuSeed`.
  - `feedback/feedback-dialog` `FeedbackDialog`; `design/components/button` `Button`, `design/components/kit-portrait` `KitPortrait` (kept by the pure move, see Contract issues); `ui/asset-lookup` art getters; `bots/format-bot-difficulty`.
  - Tests: `renderUi` (`../../test/render`), `@testing-library/react` `screen`, `waitFor`, `within`.
- Produces (props interfaces are verbatim from `home.tsx`; later tasks build on them):

```ts
// home-screen.tsx — HomeScreenProps unchanged (nickname, joinCode, status, error, soloLaunchPending,
// onNicknameChange, onJoinCodeChange, onCreate, onJoin, onStartSolo(opponentCount, difficulty, kitSelection,
// { lobbyRules, includeTurnTime }), onStartTutorial, soloMenuSeed?, onSoloMenuSeedApplied?).
export function HomeScreen(props: HomeScreenProps): ReactElement;

// home-hub.tsx
export interface HomeHubProps { status: RoomConnectionStatus; error: string | null; soloLaunchPending: boolean; busy: boolean;
  onOpenHowToPlay: () => void; onOpenFeedback: () => void; onChooseOnline: () => void; onChooseSolo: () => void; onChooseTutorial: () => void; }
// online-path.tsx
export interface OnlinePathProps { nickname: string; joinCode: string; status: RoomConnectionStatus; error: string | null; busy: boolean;
  canSubmit: boolean; canJoin: boolean; onBack: () => void; onNicknameChange: (value: string) => void; onJoinCodeChange: (value: string) => void;
  onCreateSubmit: (event: SyntheticEvent<HTMLFormElement>) => void; onJoinSubmit: (event: SyntheticEvent<HTMLFormElement>) => void; onOpenFeedback: () => void; }
// solo-path.tsx
export interface SoloPathProps { nickname: string; status: RoomConnectionStatus; error: string | null; soloLaunchPending: boolean; busy: boolean;
  canSubmit: boolean; soloOpponents: SoloOpponentCount; soloDifficulty: BotDifficulty; soloKitSelection: LobbyKitSelection; soloRules: LobbyRules;
  onSoloRulesChange: (rules: LobbyRules, turnTimeChanged: boolean) => void; onBack: () => void; onNicknameChange: (value: string) => void;
  onSoloOpponentsChange: (count: SoloOpponentCount) => void; onSoloDifficultyChange: (difficulty: BotDifficulty) => void;
  onOpenKitPicker: () => void; onSoloSubmit: (event: SyntheticEvent<HTMLFormElement>) => void; onOpenFeedback: () => void; }
// tutorial-path.tsx
export interface TutorialPathProps { nickname: string; status: RoomConnectionStatus; error: string | null; soloLaunchPending: boolean; busy: boolean;
  canSubmit: boolean; onBack: () => void; onNicknameChange: (value: string) => void; onTutorialSubmit: (event: SyntheticEvent<HTMLFormElement>) => void; onOpenFeedback: () => void; }
// path-header.tsx
export interface PathHeaderProps { title: string; subtitle: string; status: RoomConnectionStatus; error: string | null; soloLaunchPending: boolean;
  onBack: () => void; backDisabled: boolean; onOpenFeedback: () => void; }
// home-status.tsx
export interface HomeStatusProps { status: RoomConnectionStatus; error: string | null; soloLaunchPending: boolean; }
// nickname-field.tsx
export interface NicknameFieldProps { value: string; disabled: boolean; onChange: (value: string) => void; }
// home-art.tsx: export function HomeArt(): ReactElement; export function BetaCard(): ReactElement;
// home-classes.ts: export const HOME_INPUT_CLASS: string;
// home-gate.ts, home-whats-new.ts, solo-rules-state.ts: exactly Appendix A.2 (L76-09 later adds applySoloRulesPayload).

// test-home.ts — Appendix A.3, plus four additive helpers Part 2 reuses
export const HOME_INTENT_PROPS = ['onCreate', 'onJoin', 'onStartSolo', 'onStartTutorial'] as const;
export const HOME_PATHS = ['online', 'solo', 'tutorial'] as const satisfies readonly HowToPlayContinueTarget[];
export const HOME_PATH_LABEL: Readonly<Record<HowToPlayContinueTarget, string>>; // 'Play online' | 'Play solo' | 'Tutorial'
export type HomeDialogClose = 'Skip' | 'Got it' | 'Cancel' | 'Escape' | 'backdrop';
export function makeHomeProps(overrides?: Partial<HomeScreenProps>): HomeScreenProps;
export function expectNoHomeIntent(props: HomeScreenProps): void;
export function seedHomeStorage(seen: { readonly howToPlaySeen: boolean; readonly whatsNewSeen: boolean }): void;
export async function enterHomePath(user: UserEvent, target: HowToPlayContinueTarget): Promise<void>;
export async function closeHomeDialog(user: UserEvent, name: string, way: HomeDialogClose): Promise<void>;
```

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/screens/home/test-home.ts` (test-only; shipped code never imports it):

```ts
/**
 * Test-only builders for Home component tests (Lot 76 plan Appendix A.3). Shipped code never imports
 * this file. `closeHomeDialog` finds the backdrop of the V2 Dialog and of the V7 Sheet / Dialog alike
 * (`dialog-overlay` / `sheet-overlay`), so Part 2's sheet rewrites keep the gate and What's new tests.
 */
import { latestReleaseNote } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { expect, vi } from 'vitest';

import { HOW_TO_PLAY_SEEN_KEY, type HowToPlayContinueTarget } from '../../ui/help-storage';
import { LAST_SEEN_RELEASE_ID_KEY } from '../../ui/release-storage';
import type { HomeScreenProps } from './home-screen';

export const HOME_INTENT_PROPS = ['onCreate', 'onJoin', 'onStartSolo', 'onStartTutorial'] as const;
export const HOME_PATHS = ['online', 'solo', 'tutorial'] as const satisfies readonly HowToPlayContinueTarget[];
/** The hub tile and the path title carry the same label today (spec v7 §10.6). */
export const HOME_PATH_LABEL: Readonly<Record<HowToPlayContinueTarget, string>> = {
  online: 'Play online', solo: 'Play solo', tutorial: 'Tutorial',
};
export type HomeDialogClose = 'Skip' | 'Got it' | 'Cancel' | 'Escape' | 'backdrop';

/** Idle Home with no room: empty nickname and code, every callback a `vi.fn()`, no seed. */
export function makeHomeProps(overrides: Partial<HomeScreenProps> = {}): HomeScreenProps {
  return {
    nickname: '', joinCode: '', status: 'idle', error: null, soloLaunchPending: false,
    onNicknameChange: vi.fn(), onJoinCodeChange: vi.fn(), onCreate: vi.fn(), onJoin: vi.fn(),
    onStartSolo: vi.fn(), onStartTutorial: vi.fn(), onSoloMenuSeedApplied: vi.fn(),
    ...overrides,
  };
}

/** The commit rule: no Home intent was called (opening or closing a dialog sends nothing). */
export function expectNoHomeIntent(props: HomeScreenProps): void {
  for (const name of HOME_INTENT_PROPS) {
    const fn = props[name];
    if (vi.isMockFunction(fn)) expect(fn).not.toHaveBeenCalled();
  }
}

/** Home reads both keys at mount: call this before `renderUi`. Clears every other key. */
export function seedHomeStorage(seen: { readonly howToPlaySeen: boolean; readonly whatsNewSeen: boolean }): void {
  localStorage.clear();
  if (seen.howToPlaySeen) localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
  if (seen.whatsNewSeen) localStorage.setItem(LAST_SEEN_RELEASE_ID_KEY, latestReleaseNote().id);
}

/** Clicks the hub tile (How to play already seen) and checks the path title. */
export async function enterHomePath(user: UserEvent, target: HowToPlayContinueTarget): Promise<void> {
  await user.click(screen.getByRole('button', { name: HOME_PATH_LABEL[target] }));
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(HOME_PATH_LABEL[target]);
}

/** Closes the named dialog one way (a footer button, Esc or the backdrop) and waits until it leaves the DOM. */
export async function closeHomeDialog(user: UserEvent, name: string, way: HomeDialogClose): Promise<void> {
  const dialog = screen.getByRole('dialog', { name });
  if (way === 'Escape') {
    await user.keyboard('{Escape}');
  } else if (way === 'backdrop') {
    const overlay = dialog.closest<HTMLElement>('[data-zone="dialog-overlay"], [data-zone="sheet-overlay"]');
    if (overlay === null) throw new Error(`${name} has no backdrop`);
    await user.click(overlay);
  } else {
    await user.click(within(dialog).getByRole('button', { name: way }));
  }
  await waitFor(() => { expect(screen.queryByRole('dialog', { name })).toBeNull(); });
}
```

`apps/client/src/screens/home/home-screen.test.tsx` (36 tests):

```tsx
// @vitest-environment happy-dom
/**
 * Home, rendered: technical spec v7 §7.1, §7.7, §12.1, §12.2; Appendix A `home-hub`, `home-beta-badge`,
 * `home-whats-new`, `home-whats-new-dismiss`, `home-whats-new-seen-storage`, `home-how-to-play-soft-gate`,
 * `home-how-to-play-dismiss`, `home-feedback-dialog`, `global-feedback-entry-points`, `home-online-path`,
 * `home-tutorial-path`, `home-solo-path`, `solo-menu-rules`, `home-forms-enter-submit`,
 * `home-connection-status-and-errors`, `global-status-labels`, `global-visual-viewport-fit`,
 * `legacy-inbox-redirect` (L76-01). Replaces the four `screens/home.*.test.ts` source-text splits and
 * the `home.tsx` reads of `whats-new-dialog.test.ts`.
 */
import { defaultLobbyRules, latestReleaseNote, PROTOCOL_VERSION, RELEASE_NOTES, type FeedbackSubmitBody } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { HINTS_STORAGE_KEY, HOW_TO_PLAY_SEEN_KEY, readHintState } from '../../ui/help-storage';
import { LAST_SEEN_RELEASE_ID_KEY } from '../../ui/release-storage';
import type { SoloMenuSeed } from '../solo-menu-seed';
import { STATUS_LABELS } from '../status-labels';
import { HomeScreen, type HomeScreenProps } from './home-screen';
import { closeHomeDialog, enterHomePath, expectNoHomeIntent, HOME_PATH_LABEL, HOME_PATHS, makeHomeProps, seedHomeStorage } from './test-home';

const feedback = vi.hoisted(() => ({
  submit: vi.fn<(body: FeedbackSubmitBody) => Promise<{ ok: true } | { ok: false; message: string }>>(),
}));
vi.mock('../../feedback/submit-feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../feedback/submit-feedback')>()),
  submitFeedback: feedback.submit,
}));

const SEEN = { howToPlaySeen: true, whatsNewSeen: true } as const;
const HUB_BUTTONS = ['Play online', 'Play solo', 'Tutorial', 'How to play', 'Feedback'];
const SEED: SoloMenuSeed = {
  opponentCount: 3, difficulty: 'hard', kitSelection: 'assassin',
  lobbyRules: { excludedKitIds: ['ghost'], randomOnly: false, turnTimeSeconds: 90 },
};

function renderHome(overrides: Partial<HomeScreenProps> = {}) {
  const props = makeHomeProps(overrides);
  return { ...renderUi(<HomeScreen {...props} />, { reducedMotion: true }), props };
}
const main = (): HTMLElement => screen.getByRole('main');
const title = (): string => screen.getByRole('heading', { level: 1 }).textContent;
const isEnabled = (name: string): boolean => !screen.getByRole('button', { name }).hasAttribute('disabled');
const whatsNew = (): HTMLElement | null => screen.queryByRole('dialog', { name: "What's new" });
const scopeOf = (dialog: HTMLElement | null): string | null | undefined =>
  dialog?.querySelector('[data-whats-new-scope]')?.getAttribute('data-whats-new-scope');
const releaseIds = (dialog: HTMLElement): (string | null)[] =>
  Array.from(dialog.querySelectorAll('[data-release-id]'), (node) => node.getAttribute('data-release-id'));

beforeEach(() => {
  localStorage.clear();
  feedback.submit.mockReset();
  feedback.submit.mockResolvedValue({ ok: true });
});

describe('Home hub (spec v7 §7.1; L42-04, L51-03)', () => {
  it('shows no status line and no alert on the idle hub', () => {
    seedHomeStorage(SEEN);
    renderHome();
    expect(title()).toBe('Card Battle');
    for (const copy of [...Object.values(STATUS_LABELS), 'Starting solo game…']) expect(screen.queryByText(copy)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(HUB_BUTTONS.filter((name) => !isEnabled(name))).toEqual([]);
  });

  it('never shows /admin, /inbox, Inbox, Admin, a protocol version or Reset help on the hub or any path', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    for (const target of [null, ...HOME_PATHS]) {
      if (target !== null) await enterHomePath(user, target);
      expect(main().querySelector('a')).toBeNull();
      expect(main().textContent).not.toMatch(/admin|inbox|protocol v|reset help/i);
      expect(screen.queryByRole('button', { name: /admin|inbox|reset help/i })).toBeNull();
      if (target !== null) await user.click(screen.getByRole('button', { name: 'Back' }));
    }
  });

  it('locks every hub button while connecting, shows Connecting…, and leaves New live', () => {
    seedHomeStorage(SEEN);
    renderHome({ status: 'connecting' });
    expect(screen.getByText(STATUS_LABELS.connecting)).toBeTruthy();
    expect(HUB_BUTTONS.filter(isEnabled)).toEqual([]);
    // Today New stays live while busy; L76-04 disables it during a solo launch (spec v7 §11, Q8).
    expect(isEnabled("What's new")).toBe(true);
  });

  it('shows a failure as Could not join with an alert under the hub title, and keeps it on a path', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome({ status: 'failed', error: 'room "ABCDEF" not found' });
    expect(screen.getByText(STATUS_LABELS.failed)).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('room "ABCDEF" not found');
    expect(screen.getByRole('heading', { level: 1 }).compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    await enterHomePath(user, 'online');
    expect(screen.getByRole('alert').textContent).toBe('room "ABCDEF" not found');
  });

  it('keeps Starting solo game… off the Online header and shows it on the Tutorial header', async () => {
    seedHomeStorage(SEEN);
    const props = makeHomeProps();
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect(screen.queryByText('Starting solo game…')).toBeNull();
    rerender(<HomeScreen {...props} />);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await enterHomePath(user, 'tutorial');
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect(screen.getByText('Starting solo game…')).toBeTruthy();
  });
});

describe('How to play soft gate (spec v7 §7.1; L42-02, L51-02)', () => {
  it('opens How to play on the first path click while unseen, and enters nothing yet', async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome();
    await user.click(screen.getByRole('button', { name: 'Play online' }));
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeTruthy();
    expect(title()).toBe('Card Battle');
    expect(localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBeNull();
    expectNoHomeIntent(props);
  });

  it.each([['Skip', 'online'], ['Got it', 'solo'], ['Escape', 'tutorial'], ['backdrop', 'online']] as const)(
    'a gated %s marks How to play seen and enters %s', async (way, target) => {
      seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
      const { user, props } = renderHome();
      await user.click(screen.getByRole('button', { name: HOME_PATH_LABEL[target] }));
      await closeHomeDialog(user, 'How to play', way);
      expect(localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBe('1');
      expect(title()).toBe(HOME_PATH_LABEL[target]);
      expectNoHomeIntent(props);
    });

  it('enters a path directly once How to play is seen', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    await user.click(screen.getByRole('button', { name: 'Play solo' }));
    expect(title()).toBe('Play solo');
    expect(screen.queryByRole('dialog', { name: 'How to play' })).toBeNull();
  });

  it.each([['Skip', '1'], ['Got it', '1'], ['Escape', null], ['backdrop', null]] as const)(
    'a manual %s close leaves the seen key at %s and stays on the hub', async (way, stored) => {
      seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
      const { user, props } = renderHome();
      await user.click(screen.getByRole('button', { name: 'How to play' }));
      await closeHomeDialog(user, 'How to play', way);
      expect(localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBe(stored);
      expect(title()).toBe('Card Battle');
      expectNoHomeIntent(props);
    });

  it("never re-checks What's new after a gated close", async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome();
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY); // the latest entry is unseen from here on
    await user.click(screen.getByRole('button', { name: 'Play online' }));
    await closeHomeDialog(user, 'How to play', 'Skip');
    expect(whatsNew()).toBeNull();
    expectNoHomeIntent(props);
  });

  it("re-checks What's new after a manual close", async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome();
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY);
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    await closeHomeDialog(user, 'How to play', 'Escape');
    expect(scopeOf(whatsNew())).toBe('current');
    expectNoHomeIntent(props);
  });
});

describe("What's new (spec v7 §7.1; L63-07, L65-05)", () => {
  it('auto-opens only the latest entry when it is unseen, under an unread New', () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: false }); // How to play never blocks it
    const { props } = renderHome();
    const dialog = screen.getByRole('dialog', { name: "What's new" });
    expect(scopeOf(dialog)).toBe('current');
    expect(releaseIds(dialog)).toEqual([latestReleaseNote().id]);
    for (const item of latestReleaseNote().items) {
      expect(dialog.textContent).toContain(item.before);
      expect(dialog.textContent).toContain(item.after);
    }
    expect(screen.getByRole('button', { name: "What's new (unread)" }).querySelector('[data-whats-new-unread]')).not.toBeNull();
    expectNoHomeIntent(props);
  });

  it.each(['Got it', 'Escape', 'backdrop'] as const)(
    'a %s dismissal marks the latest entry seen and clears the unread label and dot', async (way) => {
      seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: false });
      const { user, props } = renderHome();
      await closeHomeDialog(user, "What's new", way);
      expect(localStorage.getItem(LAST_SEEN_RELEASE_ID_KEY)).toBe(latestReleaseNote().id);
      expect(screen.getByRole('button', { name: "What's new" }).querySelector('[data-whats-new-unread]')).toBeNull();
      expectNoHomeIntent(props);
    });

  it('stays closed when the latest entry is seen; New opens every entry, newest first', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome();
    expect(whatsNew()).toBeNull();
    expect(main().textContent).not.toContain('Super Regeneration'); // no release copy outside RELEASE_NOTES
    const newButton = screen.getByRole('button', { name: "What's new" });
    expect(newButton.querySelector('[data-whats-new-unread]')).toBeNull();
    await user.click(newButton);
    const dialog = screen.getByRole('dialog', { name: "What's new" });
    expect(scopeOf(dialog)).toBe('history');
    expect(releaseIds(dialog)).toEqual(RELEASE_NOTES.map((note) => note.id));
    expect(within(dialog).getByText('Latest')).toBeTruthy();
    expectNoHomeIntent(props);
  });

  it('reopens on the latest entry alone when Back finds it unseen after a history visit', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome();
    await user.click(screen.getByRole('button', { name: "What's new" }));
    await closeHomeDialog(user, "What's new", 'Got it');
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY);
    await enterHomePath(user, 'online');
    expect(whatsNew()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    const dialog = screen.getByRole('dialog', { name: "What's new" });
    expect(scopeOf(dialog)).toBe('current');
    expect(releaseIds(dialog)).toEqual([latestReleaseNote().id]);
    expectNoHomeIntent(props);
  });

  it('keeps New beside the Beta badge, outside the hub buttons', () => {
    seedHomeStorage(SEEN);
    renderHome();
    const newButton = screen.getByRole('button', { name: "What's new" });
    expect(screen.getByText('Beta').closest('aside')?.nextElementSibling).toBe(newButton);
    expect(newButton.parentElement).toBe(main());
    expect(screen.getByRole('button', { name: 'Play online' }).closest('section')?.contains(newButton)).toBe(false);
  });
});

describe('Feedback on Home (spec v7 §7.7; L47-03, L57-05)', () => {
  it('opens Feedback in manual mode from the hub, and a send carries screen home and the nickname only', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome({ nickname: 'Ada' });
    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    const dialog = screen.getByRole('dialog', { name: 'Feedback' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(within(dialog).queryByText('Skip is fine.')).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Idea' }));
    await user.type(within(dialog).getByLabelText('Message'), 'More kits');
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    expect(feedback.submit.mock.calls).toEqual([[
      { kind: 'idea', message: 'More kits', screen: 'home', protocolVersion: PROTOCOL_VERSION, topics: [], nickname: 'Ada' },
    ]]);
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull(); });
    expectNoHomeIntent(props);
  });

  it.each(HOME_PATHS)('opens the same Feedback from the %s path header', async (target) => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome({ nickname: 'Ada' });
    await enterHomePath(user, target);
    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    await closeHomeDialog(user, 'Feedback', 'Cancel');
    expect(feedback.submit).not.toHaveBeenCalled();
    expectNoHomeIntent(props);
  });
});

describe('Online path (spec v7 §7.1; L57-07)', () => {
  it('uppercases the code as typed and caps it at 6 characters', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome();
    await enterHomePath(user, 'online');
    const code = screen.getByLabelText('Game code');
    expect(code.getAttribute('maxlength')).toBe('6');
    await user.type(code, 'q');
    expect(props.onJoinCodeChange).toHaveBeenCalledWith('Q');
  });

  it('enables Create with a nickname, and Join only with a nickname and a 6-character code', async () => {
    seedHomeStorage(SEEN);
    const props = makeHomeProps();
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    const cases = [['', '', false, false], ['Ada', 'ABCDE', true, false], ['   ', 'ABCDEF', false, false], ['Ada', 'ABCDEF', true, true]] as const;
    for (const [nickname, joinCode, create, join] of cases) {
      rerender(<HomeScreen {...props} nickname={nickname} joinCode={joinCode} />);
      expect([isEnabled('Create'), isEnabled('Join')]).toEqual([create, join]);
    }
    rerender(<HomeScreen {...props} nickname="Ada" joinCode="ABCDEF" status="connecting" />);
    expect([isEnabled('Create'), isEnabled('Join')]).toEqual([false, false]);
    rerender(<HomeScreen {...props} nickname="Ada" joinCode="ABCDEF" />);
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(props.onJoin).toHaveBeenCalledTimes(1);
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it('submits Join on Enter in the code field only when Join is enabled; Enter in Nickname sends nothing', async () => {
    seedHomeStorage(SEEN);
    const props = makeHomeProps({ nickname: 'Ada', joinCode: 'ABCDE' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    await user.type(screen.getByLabelText('Game code'), '{Enter}');
    expect(props.onJoin).not.toHaveBeenCalled();
    rerender(<HomeScreen {...props} joinCode="ABCDEF" />);
    await user.type(screen.getByLabelText('Nickname'), '{Enter}');
    expectNoHomeIntent(props);
    await user.type(screen.getByLabelText('Game code'), '{Enter}');
    expect(props.onJoin).toHaveBeenCalledTimes(1);
  });
});

describe('Solo path (spec v7 §7.1; L17-01, L67-01, Lot 70)', () => {
  it('starts a default solo game: 1 opponent, Normal, Random, default rules, no clock', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome({ nickname: 'Ada' });
    await enterHomePath(user, 'solo');
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(vi.mocked(props.onStartSolo).mock.calls).toEqual([[1, 'normal', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false }]]);
    expect([props.onCreate, props.onJoin, props.onStartTutorial].map((fn) => vi.mocked(fn).mock.calls.length)).toEqual([0, 0, 0]);
  });

  it('opens on the solo path from a Play again seed, applies it once and launches with it', async () => {
    seedHomeStorage(SEEN);
    const { user, props } = renderHome({ nickname: 'Ada', soloMenuSeed: SEED });
    expect(title()).toBe('Play solo');
    expect(props.onSoloMenuSeedApplied).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(vi.mocked(props.onStartSolo).mock.calls).toEqual([[3, 'hard', 'assassin', { lobbyRules: SEED.lobbyRules, includeTurnTime: true }]]);
  });

  it('locks the solo menu while the launch is pending', () => {
    seedHomeStorage(SEEN);
    renderHome({ nickname: 'Ada', soloMenuSeed: SEED, soloLaunchPending: true });
    expect(screen.getByText('Starting solo game…')).toBeTruthy();
    expect(['Back', 'Feedback', '1', '7', 'Easy', 'Normal', 'Hard', 'Choose kit', 'Start solo game'].filter(isEnabled)).toEqual([]);
    expect(screen.getByLabelText('Nickname').hasAttribute('disabled')).toBe(true);
  });
});

describe('Tutorial path (spec v7 §7.1; L45-04, L46-03)', () => {
  it('starts the tutorial through the gate without writing hint storage', async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome({ nickname: 'Ada' });
    await user.click(screen.getByRole('button', { name: 'Tutorial' }));
    await closeHomeDialog(user, 'How to play', 'Skip');
    await user.click(screen.getByRole('button', { name: 'Start tutorial' }));
    expect(vi.mocked(props.onStartTutorial).mock.calls).toEqual([[]]);
    expect(localStorage.getItem(HINTS_STORAGE_KEY)).toBeNull();
    expect(readHintState().skipAll).toBe(false);
    expect([props.onCreate, props.onJoin, props.onStartSolo].map((fn) => vi.mocked(fn).mock.calls.length)).toEqual([0, 0, 0]);
  });
});

describe('Home layout (L53-07)', () => {
  it('keeps main as the scroll container with no 100dvh on the hub or any path', async () => {
    seedHomeStorage(SEEN);
    const { user, container } = renderHome();
    for (const target of [null, ...HOME_PATHS]) {
      if (target !== null) await enterHomePath(user, target);
      expect(['overflow-y-auto', 'overscroll-contain', 'overflow-hidden'].map((token) => main().classList.contains(token))).toEqual([true, true, false]);
      expect(container.innerHTML).not.toContain('100dvh');
      if (target !== null) await user.click(screen.getByRole('button', { name: 'Back' }));
    }
  });
});
```

That is 5 + 12 + 7 + 4 + 3 + 3 + 1 + 1 = 36 tests. No test depends on the viewport mode: the V2 `Dialog` sizes its overlay from `readVisualViewportBox`, never from `viewportModeFor`, so the default window size does not matter here.

`apps/client/src/screens/home/home-gate.test.ts` (3 tests):

```ts
/** How to play soft gate: technical spec v7 §7.1; L42-02, L51-02; Appendix A `home-how-to-play-soft-gate`, `home-how-to-play-dismiss`. */
import { describe, expect, it } from 'vitest';

import type { HowToPlayContinueTarget } from '../../ui/help-storage';
import type { HowToPlayCloseReason } from '../how-to-play-dialog';
import { howToPlayCloseOutcome } from './home-gate';

const TARGETS: readonly HowToPlayContinueTarget[] = ['online', 'solo', 'tutorial'];
const REASONS: readonly HowToPlayCloseReason[] = ['skip', 'got-it', 'dismiss'];

describe('howToPlayCloseOutcome (L42-02)', () => {
  it("a gated close of any kind marks seen and enters the chosen path, with no What's new check", () => {
    for (const target of TARGETS) {
      for (const reason of REASONS) {
        expect(howToPlayCloseOutcome(target, reason)).toEqual({ markSeen: true, enter: target, checkWhatsNew: false });
      }
    }
  });

  it("a manual Skip or Got it marks seen and re-checks What's new", () => {
    expect(howToPlayCloseOutcome(null, 'skip')).toEqual({ markSeen: true, enter: null, checkWhatsNew: true });
    expect(howToPlayCloseOutcome(null, 'got-it')).toEqual({ markSeen: true, enter: null, checkWhatsNew: true });
  });

  it("a manual dismiss (Esc, backdrop) does not mark seen and re-checks What's new", () => {
    expect(howToPlayCloseOutcome(null, 'dismiss')).toEqual({ markSeen: false, enter: null, checkWhatsNew: true });
  });
});
```

`apps/client/src/screens/home/home-whats-new.test.ts` (2 tests):

```ts
/** What's new auto-open: technical spec v7 §7.1; L63-07, L65-05; Appendix A `home-whats-new`, `home-whats-new-seen-storage`. */
import { describe, expect, it } from 'vitest';

import { whatsNewAutoScope, type WhatsNewAutoTrigger } from './home-whats-new';

const TRIGGERS: readonly WhatsNewAutoTrigger[] = ['mount', 'back-to-hub', 'how-to-play-manual-close'];

describe('whatsNewAutoScope (L65-05)', () => {
  it('opens the latest entry alone for every trigger while it is unseen; How to play never blocks it', () => {
    expect(TRIGGERS.map((trigger) => whatsNewAutoScope(trigger, true))).toEqual(['current', 'current', 'current']);
  });

  it('stays closed for every trigger once the latest entry is seen', () => {
    expect(TRIGGERS.map((trigger) => whatsNewAutoScope(trigger, false))).toEqual([null, null, null]);
  });
});
```

`apps/client/src/screens/home/solo-rules-state.test.ts` (5 tests):

```ts
/** Solo menu rules: technical spec v7 §7.1 (Q3/Q31); Lot 70; L67-01; Appendix A `solo-menu-rules`, `home-solo-path`. */
import { defaultLobbyRules, type LobbyRules } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import type { SoloMenuSeed } from '../solo-menu-seed';
import { applySoloRulesChange, initialSoloRulesState, soloLaunchKitSelection } from './solo-rules-state';

const SEED: SoloMenuSeed = {
  opponentCount: 3, difficulty: 'hard', kitSelection: 'assassin',
  lobbyRules: { excludedKitIds: ['ghost'], randomOnly: false, turnTimeSeconds: 90 },
};
const rulesWith = (patch: Partial<LobbyRules>): LobbyRules => ({ ...defaultLobbyRules(), ...patch });

describe('solo rules state (spec v7 §7.1, Lot 70)', () => {
  it('starts on the default rules, the server clock and Random when there is no seed', () => {
    expect(initialSoloRulesState(undefined)).toEqual({ rules: defaultLobbyRules(), includeTurnTime: false, kitSelection: 'random' });
  });

  it('takes a Play again seed whole and sends its clock only when it is in 5–180 (L67-01)', () => {
    expect(initialSoloRulesState(SEED)).toEqual({ rules: SEED.lobbyRules, includeTurnTime: true, kitSelection: 'assassin' });
    const serverDefault: SoloMenuSeed = { ...SEED, lobbyRules: { ...SEED.lobbyRules, turnTimeSeconds: 300 } };
    expect(initialSoloRulesState(serverDefault)).toEqual({ rules: serverDefault.lobbyRules, includeTurnTime: false, kitSelection: 'assassin' });
  });

  it('turns the clock on only for an in-range time change, and keeps it on', () => {
    const start = initialSoloRulesState(undefined);
    expect(applySoloRulesChange(start, rulesWith({ randomOnly: true }), false).includeTurnTime).toBe(false);
    expect(applySoloRulesChange(start, rulesWith({ turnTimeSeconds: 200 }), true).includeTurnTime).toBe(false);
    const timed = applySoloRulesChange(start, rulesWith({ turnTimeSeconds: 45 }), true);
    expect(timed).toEqual({ rules: rulesWith({ turnTimeSeconds: 45 }), includeTurnTime: true, kitSelection: 'random' });
    expect(applySoloRulesChange(timed, rulesWith({ turnTimeSeconds: 45, excludedKitIds: ['ghost'] }), false).includeTurnTime).toBe(true);
  });

  it('resets an excluded pick to Random and keeps an allowed one', () => {
    const picked = initialSoloRulesState(SEED);
    expect(applySoloRulesChange(picked, rulesWith({ excludedKitIds: ['assassin'] }), false).kitSelection).toBe('random');
    expect(applySoloRulesChange(picked, rulesWith({ excludedKitIds: ['kamikaze'] }), false).kitSelection).toBe('assassin');
    expect(applySoloRulesChange(initialSoloRulesState(undefined), rulesWith({ excludedKitIds: ['assassin'] }), false).kitSelection).toBe('random');
  });

  it('keeps the pick under Random only, but launches Random', () => {
    const picked = initialSoloRulesState(SEED);
    const randomOnly = applySoloRulesChange(picked, { ...SEED.lobbyRules, randomOnly: true }, false);
    expect(randomOnly.kitSelection).toBe('assassin');
    expect(soloLaunchKitSelection(randomOnly)).toBe('random');
    expect(soloLaunchKitSelection(picked)).toBe('assassin');
  });
});
```

`apps/client/src/screens/whats-new-dialog.test.ts`, the rewrite (Appendix A.7). Header comment gains: `L76-01: the Home behavior is rendered in screens/home/home-screen.test.tsx; the style-only Home lines below read screens/home/home-screen.tsx until L76-04 retires them.`
- `it('renders the current update alone and the full log date by date')`: delete `const home = read('home.tsx');` and its four `expect(home)…` lines. The five `expect(source)` lines and the four catalog lines stay, unchanged.
- `it('renders a New section for additions with kit or card art')`: unchanged.
- `it('wires a green New control, red unread badge, and auto-open when unseen')`: keep the title. The body becomes the three style-only assertions, verbatim, on the new file:

```ts
    const home = read('home/home-screen.tsx');
    expect(home).toMatch(
      /<Button[\s\S]{0,400}data-whats-new-button[\s\S]{0,200}variant="green"|<Button[\s\S]{0,400}variant="green"[\s\S]{0,200}data-whats-new-button/,
    );
    expect(home).toContain('bg-cta-red');
    expect(home).not.toContain('bg-cta-green');
```

- `it('keeps What’s new as a small top-right control, not a hub action-row block')`: keep the title. Delete the `HubView` slice and its `not.toContain('onOpenWhatsNew')`. The body becomes:

```ts
    const home = read('home/home-screen.tsx');
    expect(home).toContain('data-whats-new-button');
    expect(home).toMatch(/data-whats-new-button[\s\S]{0,400}absolute/);
```

Replacement map (no `expect()` is lost; each removed Home assertion has a rendered twin):
- `home.admin-route` (`/admin`, `/inbox` absent) → 'never shows /admin, /inbox, Inbox, Admin, a protocol version or Reset help on the hub or any path'.
- `home.feedback-surfaces`:
  - `FeedbackDialog` and `screen="home"` → 'opens Feedback in manual mode from the hub, and a send carries screen home and the nickname only' and 'opens the same Feedback from the %s path header';
  - `Inbox` absent → the /admin test above.
- `home.tutorial-hints-independence` (`skipAllHints` absent) → 'starts the tutorial through the gate without writing hint storage'.
- `home.visual-viewport` (no `100dvh`, `overflow-y-auto overscroll-contain`, no `overflow-hidden` on `main`) → 'keeps main as the scroll container with no 100dvh on the hub or any path'.
- `whats-new-dialog` it 1 (Home part):
  - `useState<WhatsNewScope>('current')` and `scope={whatsNewScope}` → 'auto-opens only the latest entry when it is unseen, under an unread New';
  - `setWhatsNewScope('history')` → 'stays closed when the latest entry is seen; New opens every entry, newest first';
  - `setWhatsNewScope('current')` → 'reopens on the latest entry alone when Back finds it unseen after a history visit'.
- `whats-new-dialog` it 3 (behavior part):
  - "What's new", `data-whats-new-button` and `data-whats-new-unread` → the New name and dot assertions in the auto-open, dismissal and closed tests;
  - `WhatsNewDialog`, `hasUnseenReleaseNotes` and `shouldAutoOpenWhatsNew` → auto-open versus 'stays closed', plus `home-whats-new.test.ts`;
  - `markLatestReleaseSeen` → 'a %s dismissal marks the latest entry seen and clears the unread label and dot';
  - no `Super Regeneration` → 'stays closed when the latest entry is seen; …'.
- `whats-new-dialog` it 4 (`HubView` has no `onOpenWhatsNew`) → 'keeps New beside the Beta badge, outside the hub buttons'.

- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/screens/home/ apps/client/src/screens/whats-new-dialog.test.ts`. Expected:
  - The four new files fail to resolve `./home-screen`, `./test-home`, `./home-gate`, `./home-whats-new` and `./solo-rules-state`, none of which exists before the move.
  - The two re-pointed `whats-new-dialog.test.ts` tests fail with `ENOENT` on `home/home-screen.tsx`.
  - The trailing slash keeps the old `screens/home.*.test.ts` files out of this run.

- [ ] **Step 3: Implement.**
  - **Move** (`git mv apps/client/src/screens/home.tsx apps/client/src/screens/home/home-screen.tsx`), then cut each function into its file, unchanged:
    - `HubView` → `home-hub.tsx` as `HomeHub` / `HomeHubProps`.
    - `OnlinePath` → `online-path.tsx`.
    - `SoloPath` → `solo-path.tsx`, with the module-private `const OPPONENT_COUNTS = SOLO_OPPONENT_COUNTS;`.
    - `TutorialPath` → `tutorial-path.tsx`; `PathHeader` → `path-header.tsx`; `NicknameField` → `nickname-field.tsx`.
    - `StatusBlock` → `home-status.tsx` as `HomeStatus` / `HomeStatusProps`.
    - `BetaCard` and `HomeArt` → `home-art.tsx`.
    - `inputClassName` → `home-classes.ts` as `export const HOME_INPUT_CLASS`. `nickname-field.tsx` and `online-path.tsx` import it.
    - Each `.tsx` exports only its component and its props interface (react-refresh). No `index.ts`.
  - **Import edits:**
    - Every `'./x'` that left `screens/` becomes `'../x'`, and every `'../x'` becomes `'../../x'`.
    - `solo-path.tsx` is the only file that imports `../lobby-kit-picker` (`lobbyKitSelectionLabel`) and `../lobby-rules-panel`.
    - `home-screen.tsx` keeps `../how-to-play-dialog`, `../whats-new-dialog`, `../lobby-kit-picker-dialog`, `../../feedback/feedback-dialog` and `../../design/components/button` (for New).
    - `home-art.tsx` imports `../../ui/asset-lookup`; `home-status.tsx` imports `../status-labels`.
  - **Doc comments:** `home-screen.tsx` keeps the `home.tsx` header and adds `L76-01: split by component; every Home state lives here (path components are stateless).` Each new file opens with one line naming its component and citing spec v7 §7.1 plus the lot ids its parity row names (L42-02, L51-03, L63-07, L47-03, L17-01, Lot 70, L45-04).
  - **What stays in `home-screen.tsx`:** the `<main>` with its exact classes, the gradient div, `<BetaCard />`, the **New `<Button>` and its unread dot, inline and byte-for-byte** (the re-pointed style assertions read them), the grid, the `motion.div key={mode}`, `<HomeArt />`, and the four root dialogs as siblings of the grid. The only DOM change is none.
  - **`home-gate.ts`** (Appendix A.2, pure, no storage): `if (pendingTarget !== null) return { markSeen: true, enter: pendingTarget, checkWhatsNew: false }; return { markSeen: reason !== 'dismiss', enter: null, checkWhatsNew: true };`. It imports `HowToPlayContinueTarget` and `HowToPlayCloseReason` as types only.
  - **`home-whats-new.ts`** (Appendix A.2): `export type WhatsNewAutoTrigger = 'mount' | 'back-to-hub' | 'how-to-play-manual-close';`. `whatsNewAutoScope(trigger, latestUnseen)` is an exhaustive `switch (trigger)` with no `default` (as `continueToTarget`). Each case returns `shouldAutoOpenWhatsNew({ latestUnseen }) ? 'current' : null`, the one rule that How to play never blocks What's new (`ui/release-storage.ts`, which reads no storage in that function). The switch keeps the contract's parameter name under `noUnusedParameters`, and makes a future trigger choose its own answer.
  - **`solo-rules-state.ts`** (Appendix A.2):
    - `initialSoloRulesState(undefined)` returns `{ rules: defaultLobbyRules(), includeTurnTime: false, kitSelection: 'random' }`; with a seed it returns `{ rules: seed.lobbyRules, includeTurnTime: isTurnTimeSeconds(seed.lobbyRules.turnTimeSeconds), kitSelection: seed.kitSelection }`.
    - `applySoloRulesChange` returns `{ rules: next, includeTurnTime: state.includeTurnTime || (turnTimeChanged && isTurnTimeSeconds(next.turnTimeSeconds)), kitSelection }`. `kitSelection` becomes `'random'` when the pick is a kit missing from `allowedKitIds(next)`, else it stays.
    - `soloLaunchKitSelection(state)` returns `state.rules.randomOnly ? 'random' : state.kitSelection`.
  - **`HomeScreen` wiring** (state stays in the screen; the seed is read only in initialisers):
    - Keep `useState` for `soloOpponents` and `soloDifficulty`. Replace the `soloKitSelection` / `soloRules` / `includeTurnTime` trio with `const [solo, setSolo] = useState<SoloRulesState>(() => initialSoloRulesState(soloMenuSeed));`.
    - `whatsNewOpen`'s lazy initialiser becomes `() => whatsNewAutoScope('mount', hasUnseenReleaseNotes()) !== null`. `whatsNewScope` still starts at `'current'`; `whatsNewUnread` and `closeWhatsNew` are unchanged.
    - `openWhatsNewIfDue(trigger: WhatsNewAutoTrigger)`: `const scope = whatsNewAutoScope(trigger, hasUnseenReleaseNotes()); if (scope === null) return; setWhatsNewScope(scope); setWhatsNewOpen(true);`. `goHub` passes `'back-to-hub'`.
    - `onHowToPlayClose(reason)`:
      ```ts
      const outcome = howToPlayCloseOutcome(pendingTarget, reason);
      if (outcome.markSeen) markHowToPlaySeen(); // before entering the path (L42-02)
      setPendingTarget(null);
      setHowToPlayOpen(false);
      if (outcome.enter !== null) continueToTarget(outcome.enter);
      if (outcome.checkWhatsNew) openWhatsNewIfDue('how-to-play-manual-close');
      ```
    - `<SoloPath>` gets `soloKitSelection={solo.kitSelection}` and `soloRules={solo.rules}`. `onSoloRulesChange` becomes `(next, turnTimeChanged) => { setSolo((current) => applySoloRulesChange(current, next, turnTimeChanged)); }`.
    - The kit picker gets `current={solo.kitSelection}`, `allowedKitIds={allowedKitIds(solo.rules)}` and `onSelect={(selection) => { setSolo((current) => ({ ...current, kitSelection: selection })); }}`.
    - `onSoloSubmit` calls `onStartSolo(soloOpponents, soloDifficulty, soloLaunchKitSelection(solo), { lobbyRules: solo.rules, includeTurnTime: solo.includeTurnTime })`.
    - `requestPath`, `continueToTarget`, `busy`, `canSubmit`, `canJoin`, the seed effect and every JSX attribute stay as they are. New stays enabled while busy (L76-04 changes it).
  - **`App.tsx`:** the one import line in Files.

- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/screens/home/ apps/client/src/screens/whats-new-dialog.test.ts apps/client/src/screens/status-labels.test.ts apps/client/src/screens/how-to-play-content.test.ts apps/client/src/screens/solo-menu-seed.test.ts apps/client/src/ui/help-storage.test.ts apps/client/src/ui/release-storage.test.ts apps/client/src/ui/tutorial-hints-independence.test.ts apps/client/src/App.tutorial-hints-independence.test.ts apps/client/src/App.arena.test.tsx apps/client/src/admin/admin-route.test.ts apps/client/src/inbox/inbox-route.test.ts`. Expected:
  - 46 new tests pass (36 + 3 + 2 + 5).
  - `whats-new-dialog.test.ts` keeps its 4 tests, all passing.
  - Every other listed file passes unchanged.
  - `git grep -nE "screens/home'|'home\.tsx'|'screens/home\.tsx'" -- apps/` prints nothing: no import of `./screens/home` and no `readFileSync` of `home.tsx` is left.

- [ ] **Step 5: Docs.**
  - **`docs/agent/frontend.md`, Screens table.** Replace the Home row's file cell `` `screens/home.tsx` + `how-to-play-dialog.tsx` + `whats-new-dialog.tsx` + `feedback/feedback-dialog.tsx` `` with `` `screens/home/home-screen.tsx` (+ `screens/home/*`) + `how-to-play-dialog.tsx` + `whats-new-dialog.tsx` + `feedback/feedback-dialog.tsx` ``.
  - **`docs/agent/frontend.md`, new section** right before `## Design system (V2 · Lots 10+)` (Appendix A.8):

```
## Home and lobby (V7 · Lot 76)

Spec v7 §7.1–§7.5 and §7.7; plan `docs/superpowers/plans/2026-10-21-v7-lot-76-home-lobby.md`. Each bullet starts with its file and task id.

- `screens/home/` (L76-01, spec v7 §4.2, §7.1): `home.tsx` split by component, with no visual or behavior change. `home-screen.tsx` (`HomeScreen`, `HomeScreenProps`; App imports it directly, no `index.ts`) holds every Home state, the New control and the four root dialogs. `home-hub.tsx`, `online-path.tsx`, `solo-path.tsx`, `tutorial-path.tsx`, `path-header.tsx`, `home-status.tsx`, `nickname-field.tsx` and `home-art.tsx` (`HomeArt`, `BetaCard`) hold no state, so Back keeps the solo picks; `home-classes.ts` holds `HOME_INPUT_CLASS`.
- `screens/home/home-gate.ts`, `home-whats-new.ts`, `solo-rules-state.ts` (L76-01): the pure rules `HomeScreen` follows; they read no storage (`ui/help-storage.ts` and `ui/release-storage.ts` do). `howToPlayCloseOutcome`: a gated close marks seen and enters the path with no What's new check; a manual Skip / Got it marks seen, a manual dismiss does not, and both re-check What's new. `whatsNewAutoScope`: 'current' while the latest entry is unseen, for the mount, Back-to-hub and manual How to play triggers (New opens 'history' itself). `initialSoloRulesState` / `applySoloRulesChange` / `soloLaunchKitSelection`: the Play again seed is read once at mount, only an in-range slider change sends the clock (Q3/Q31), an excluded pick falls back to Random, and Random only launches Random but keeps the pick.
- `screens/home/home-screen.test.tsx`, `test-home.ts` (L76-01, spec v7 §12.1): the rendered Home suite. `test-home.ts` has `makeHomeProps`, `expectNoHomeIntent` (the commit rule: a test that opens or closes a dialog asserts no intent), `seedHomeStorage`, `enterHomePath` and `closeHomeDialog` (it finds the V2 and the V7 backdrop). They replace the four `screens/home.*.test.ts` source-text splits and the `home.tsx` reads of `whats-new-dialog.test.ts`, whose style-only New lines read `screens/home/home-screen.tsx` until L76-04. A test that sends feedback mocks `feedback/submit-feedback`.
```

  - **`docs/backlog_v7_test_classification.md`, `## Owner lot 76`.**
    - First-task re-check: run `grep -rl readFileSync apps/client/src --include='*.test.ts'`, and confirm that each of the 34 rows (doc lines 204–237) names an existing file and `it()` title. If a file that reads a `screens/home*` or `screens/lobby*` source has no row, stop and report it. Then add under the heading: `> Re-checked by L76-01 (<commit day>): the 34 rows' files and \`it()\` titles exist at \`c6941bec\`. L76-01 closes the Home rows; row \`net/use-room-connection.tutorial.test.ts\` has no Part 1 owner.`
    - Append at the end of the last cell of each row it touches:
      - `screens/home.admin-route.test.ts` row: ` **Done (L76-01):** replaced by \`screens/home/home-screen.test.tsx\` › 'never shows /admin, /inbox, Inbox, Admin, a protocol version or Reset help on the hub or any path'.`
      - `screens/home.feedback-surfaces.test.ts` row: ` **Done (L76-01):** replaced by \`screens/home/home-screen.test.tsx\` › 'opens Feedback in manual mode from the hub, and a send carries screen home and the nickname only' and 'opens the same Feedback from the %s path header'.`
      - `screens/home.tutorial-hints-independence.test.ts` row: ` **Done (L76-01):** replaced by \`screens/home/home-screen.test.tsx\` › 'starts the tutorial through the gate without writing hint storage'.`
      - `screens/home.visual-viewport.test.ts` row: ` **Done (L76-01):** replaced by \`screens/home/home-screen.test.tsx\` › 'keeps main as the scroll container with no 100dvh on the hub or any path'.`
      - `whats-new-dialog.test.ts` › 'renders the current update alone…' [source assertions]: ` **L76-01:** the home.tsx part is replaced by \`screens/home/home-screen.test.tsx\` › 'auto-opens only the latest entry when it is unseen, under an unread New', 'stays closed when the latest entry is seen; New opens every entry, newest first' and 'reopens on the latest entry alone when Back finds it unseen after a history visit'; the whats-new-dialog.tsx part stays for L76-05.`
      - '… wires a green New control …' [behavior assertions]: ` **Done (L76-01):** replaced by \`screens/home/home-screen.test.tsx\` › 'auto-opens only the latest entry when it is unseen, under an unread New', 'a %s dismissal marks the latest entry seen and clears the unread label and dot' and 'stays closed when the latest entry is seen; New opens every entry, newest first'.`
      - '… wires a green New control …' [styling assertions]: ` **L76-01:** re-pointed at \`screens/home/home-screen.tsx\` (same \`it()\`); L76-04 retires it.`
      - '… keeps What’s new as a small top-right control …': ` **Done (L76-01):** replaced by \`screens/home/home-screen.test.tsx\` › 'keeps New beside the Beta badge, outside the hub buttons'; its \`absolute\` regex reads \`screens/home/home-screen.tsx\` until L76-04 (Appendix A.7).`
  - **`docs/backlog_v7.md`:**
    - In the row that starts `| L76-01 |`: `To do` → `Done`.
    - Progress: `| 76 · Home and lobby | 18 | 0 |` → `| 76 · Home and lobby | 18 | 1 |`.
    - Total: add one to the Done cell it holds when you start (`| **Total** | **135** | **72** |` → `**73**` if no other lot moved it).
  - No `decisions.md` entry and no `DESIGN.md` edit: no rule, token or `ui/` file changes. No What's new item: nothing a player sees changes.

- [ ] **Step 6: Verify and commit.**
  - `pnpm verify` green.
  - Stage by name:

```
git rm apps/client/src/screens/home.admin-route.test.ts apps/client/src/screens/home.feedback-surfaces.test.ts apps/client/src/screens/home.tutorial-hints-independence.test.ts apps/client/src/screens/home.visual-viewport.test.ts
git add apps/client/src/screens/home/home-screen.tsx apps/client/src/screens/home/home-hub.tsx apps/client/src/screens/home/online-path.tsx apps/client/src/screens/home/solo-path.tsx apps/client/src/screens/home/tutorial-path.tsx apps/client/src/screens/home/path-header.tsx apps/client/src/screens/home/home-status.tsx apps/client/src/screens/home/nickname-field.tsx apps/client/src/screens/home/home-art.tsx apps/client/src/screens/home/home-classes.ts apps/client/src/screens/home/home-gate.ts apps/client/src/screens/home/home-gate.test.ts apps/client/src/screens/home/home-whats-new.ts apps/client/src/screens/home/home-whats-new.test.ts apps/client/src/screens/home/solo-rules-state.ts apps/client/src/screens/home/solo-rules-state.test.ts apps/client/src/screens/home/test-home.ts apps/client/src/screens/home/home-screen.test.tsx apps/client/src/screens/whats-new-dialog.test.ts apps/client/src/App.tsx docs/agent/frontend.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
```

  - Commit (the `git mv` of `home.tsx` is already staged):

```
refactor(home): split Home by component (L76-01)

Rendered tests replace the home.tsx source-text reads (spec v7 §12.1).
The style-only What's new lines now read home-screen.tsx until L76-04.
```

**Acceptance map:**
- Idle hub, no status line: 'shows no status line and no alert on the idle hub'.
- No `/admin`, `/inbox`, Inbox, `Protocol v` or Reset help: 'never shows /admin, /inbox, Inbox, Admin, a protocol version or Reset help on the hub or any path'.
- First path click with unseen storage opens How to play: 'opens How to play on the first path click while unseen, and enters nothing yet'.
- Every gated close (Skip, Got it, Esc, backdrop) marks seen and enters: 'a gated %s marks How to play seen and enters %s' (4 cases, all three paths).
- A manual Esc does not mark seen: 'a manual %s close leaves the seen key at %s and stays on the hub' (Escape → null; backdrop → null; Skip and Got it → '1').
- What's new:
  - auto-opens the latest only: 'auto-opens only the latest entry when it is unseen, under an unread New' and 'reopens on the latest entry alone …';
  - New opens the full history: 'stays closed when the latest entry is seen; New opens every entry, newest first';
  - label and dot clear on any dismissal: 'a %s dismissal marks the latest entry seen and clears the unread label and dot' (Got it, Esc, backdrop).
- Home Feedback opens manual with screen 'home': 'opens Feedback in manual mode from the hub, and a send carries screen home and the nickname only' and 'opens the same Feedback from the %s path header'.
- Start tutorial never writes hints `skipAll`: 'starts the tutorial through the gate without writing hint storage'.
- Join is enabled only with a nickname and a 6-character uppercased code: 'uppercases the code as typed and caps it at 6 characters' and 'enables Create with a nickname, and Join only with a nickname and a 6-character code'.
- Default Start solo sends 1 / normal / random / default rules with `includeTurnTime` false: 'starts a default solo game: 1 opponent, Normal, Random, default rules, no clock'.
- `main` is the scroll container, no `100dvh`: 'keeps main as the scroll container with no 100dvh on the hub or any path'.
- The pure helpers have unit tests: `home-gate.test.ts`, `home-whats-new.test.ts`, `solo-rules-state.test.ts`.
- No assertion weakened: the Step 1 replacement map. The §12.1 rows are filled: Step 5.
- `pnpm verify` green: Step 6.

**Decisions:**
- **A pure move keeps the V2 imports.** The Home files import `design/components/button` and `design/components/kit-portrait`, and mount the V2 dialogs, exactly as `home.tsx` did. Dropping them would change the look (see Contract issues). L76-04, L76-08 and L76-11 swap them.
- **The New control and its dot stay inline in `home-screen.tsx`,** so the re-pointed style regexes keep reading the same JSX until L76-04 retires them (Appendix A.7).
- **`whatsNewAutoScope` is an exhaustive `switch (trigger)`.** Every case returns the same answer: the contract keeps `trigger`, and `noUnusedParameters` rejects an unused named parameter. It delegates to `shouldAutoOpenWhatsNew`, so "How to play never blocks What's new" keeps one source.
- **Today's busy rule is pinned:** New stays enabled while connecting ('locks every hub button while connecting …'), so L76-04's change is a visible, deliberate test flip. The Online header still never reads 'Starting solo game…'; it passes `soloLaunchPending={false}` today, and a test pins it.
- **Layout is asserted on classes:** happy-dom has no CSS. `main` must carry `overflow-y-auto` and `overscroll-contain` and never `overflow-hidden`, and the rendered HTML must hold no `100dvh`. Real scrolling is the L76-18 browser gate (A.9 ruling 1).
- **"No hard-coded release copy"** (the old `Super Regeneration` absence) becomes a rendered check: Home's text holds no such string while What's new is closed. The catalog text check on the open dialog shows that its copy comes from `RELEASE_NOTES`.
- **`test-home.ts` gains `HOME_PATHS`, `HOME_PATH_LABEL`, `seedHomeStorage`, `enterHomePath` and `closeHomeDialog`** beyond Appendix A.3 (additive). `closeHomeDialog` accepts the V2 `dialog-overlay` and the V7 `sheet-overlay`, so L76-05 … L76-07 can swap the dialogs without touching the gate and What's new tests.
- **No viewport stub:** no Home test depends on the viewport mode (the V2 Dialog has no placement mode).
- **Feedback is mocked with `importOriginal`** (precedent `screens/arena/commit-veto.test.tsx`), so `FEEDBACK_FALLBACK_ERROR` stays real.
- **Classification notes for rows L76-01 only partly closes:** the What's new [source] row and the [styling] row get an ` **L76-01:** …` note instead of `Done`, because Appendix A.8 has no format for a part-done or re-pointed row.
- **The Lot 76 first-task re-check** of the classification rows (the appendix header rule) runs here.
- No new or changed player-facing string.

---

---

### Task L76-02: Split the lobby into screens/lobby with behavior tests

**Files:**
- Create:
  - `apps/client/src/screens/lobby/test-lobby.ts`: the A.3 lobby test helpers, plus two additive hooks (`lobbyBackdrop`, `isLobbyControlDisabled`).
  - `apps/client/src/screens/lobby/lobby-screen.test.tsx` (25 tests): the rendered replacements of the six lobby source-text tests.
  - `apps/client/src/screens/lobby/lobby-screen.ready-chrome.test.ts` (1 test): the A.7 split of the style-only half of `lobby-ready.test.ts`'s wiring test. Assertions are moved verbatim, none is new. L76-12 deletes it.
- Move (`git mv`, then edit only what is listed in Step 3):
  - `apps/client/src/screens/lobby.tsx` → `apps/client/src/screens/lobby/lobby-screen.tsx`.
  - `apps/client/src/screens/lobby-ready.ts` → `apps/client/src/screens/lobby/lobby-ready.ts` (unchanged).
  - `apps/client/src/screens/lobby-ready.test.ts` → `apps/client/src/screens/lobby/lobby-ready.test.ts`. Its three pure `it`s stay unchanged; the wiring `describe` leaves (A.7).
  - `apps/client/src/screens/lobby-ready-mark.tsx` → `apps/client/src/screens/lobby/lobby-ready-mark.tsx` (unchanged).
  - `apps/client/src/screens/lobby-ready-mark.test.ts` → `apps/client/src/screens/lobby/lobby-ready-mark.test.ts`, re-pointed at `lobby-screen.tsx`.
  - `apps/client/src/screens/lobby-kit-picker.ts` and `lobby-kit-picker.test.ts` → `apps/client/src/screens/lobby/` (both unchanged).
- Delete (`git rm`):
  - `apps/client/src/screens/lobby-kick.test.ts`
  - `apps/client/src/screens/lobby-kit-privacy.test.ts`
  - `apps/client/src/screens/lobby.feedback-surfaces.test.ts`
  - `apps/client/src/screens/lobby.visual-viewport.test.ts`
- Modify:
  - `apps/client/src/App.tsx`, one line: `import { LobbyScreen } from './screens/lobby';` → `import { LobbyScreen } from './screens/lobby/lobby-screen';`.
  - `apps/client/src/screens/lobby-kit-picker-dialog.tsx`: `KitInspectDetails` (`./table/kit-inspect-details`) → `KitDetails` (`../ui/kit/kit-details`), and `./lobby-kit-picker` → `./lobby/lobby-kit-picker`.
  - `apps/client/src/screens/home/solo-path.tsx` and `apps/client/src/screens/home/home-screen.tsx` (L76-01 files): the `lobbyKitSelectionLabel` import, `'../lobby-kit-picker'` → `'../lobby/lobby-kit-picker'`. Edit every `screens/home/*` file that `grep -rn "lobby-kit-picker'" apps/client/src/screens/home` lists, and only those.
  - Docs: `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`.
- Existing tests that must stay green unchanged:
  - `screens/lobby/lobby-kit-picker.test.ts` (moved), and the three pure `it`s of `screens/lobby/lobby-ready.test.ts`.
  - `ui/chat/chat-log.test.tsx`, `ui/kit/kit-details.test.tsx`.
  - Every `screens/home/*.test.ts(x)` from L76-01.
  - `App.arena.test.tsx` (its lobby case renders `LobbyScreen` through App), `screens/claim-seat-dialog.test.ts`.

**Interfaces:**
- Consumes:
  - `makeLobbyView`, `LobbyViewOverrides` (`../../view-model/test-fixtures`).
  - `ChatLog` (`../../ui/chat/chat-log`; props `messages`, `players`, `canWrite`, `onSend`, which receives the trimmed body).
  - `KitDetails` (`../ui/kit/kit-details`, props `{ kitId: KitId }`, the same shape as `KitInspectDetails`).
  - `renderUi` (`../../test/render`), `submitFeedback` (`../../feedback/submit-feedback`, mocked).
- Produces (the props are unchanged from `screens/lobby.tsx`; A.4's final shape gains `onDismissError` in L76-14 and `onReopenClaim` in L76-16):

```ts
// screens/lobby/lobby-screen.tsx
export interface LobbyScreenProps {
  view: LobbyStateView;
  status: RoomConnectionStatus;
  error: string | null;
  onStart: () => void;
  onLeave: () => void;
  onAddBot: (difficulty: BotDifficulty) => void;
  onKickPlayer: (playerId: string) => void;
  onSetReady: (ready: boolean) => void;
  onSetBotDifficulty: (playerId: string, difficulty: BotDifficulty) => void;
  onChooseKit: (selection: LobbyKitSelection) => void;
  onSetLobbyRules: (payload: SetLobbyRulesPayload) => void;
  onSendChat: (body: string) => void;
}
export function LobbyScreen(props: LobbyScreenProps): ReactElement;

// screens/lobby/test-lobby.ts: A.3 verbatim, plus the two additive hooks
export const LOBBY_HOST: LobbySeatView;   // { id: 'host', nickname: 'Ada', isBot: false, isReady: true }
export const LOBBY_GUEST: LobbySeatView;  // { id: 'guest', nickname: 'Bea', isBot: false, isReady: false }
export const LOBBY_BOT: LobbySeatView;    // { id: 'bot-1', nickname: 'Bot Cy', isBot: true, botDifficulty: 'normal', isReady: true }
export const LOBBY_INTENT_PROPS: readonly ['onStart', 'onAddBot', 'onKickPlayer', 'onSetReady', 'onSetBotDifficulty', 'onChooseKit', 'onSetLobbyRules', 'onSendChat'];
export function hostLobbyView(overrides?: LobbyViewOverrides): LobbyStateView;
export function guestLobbyView(overrides?: LobbyViewOverrides): LobbyStateView;
export function walkInLobbyView(overrides?: LobbyViewOverrides): LobbyStateView;
export function makeLobbyProps(overrides?: Partial<LobbyScreenProps>): LobbyScreenProps;
export function expectNoLobbyIntent(props: LobbyScreenProps): void;
export function lobbySeat(playerId: string): HTMLElement;
/** The scrim behind a lobby dialog: `[data-zone="sheet-overlay"]` (V7) or `[data-zone="dialog-overlay"]` (V2: the lobby until L76-12, Feedback until L76-07). */
export function lobbyBackdrop(dialog: HTMLElement): HTMLElement;
/** Native `disabled`, or the V7 Button's `focusableWhenDisabled` (`aria-disabled="true"`). Either one sends nothing. */
export function isLobbyControlDisabled(control: HTMLElement): boolean;
```

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/screens/lobby/test-lobby.ts`:

```ts
/**
 * Lobby test helpers (plan Appendix A.3, L76-02). They hold the three seats every lobby test uses,
 * the host, guest and walk-in views, `LobbyScreen` props with a `vi.fn()` per callback, the
 * commit-rule check (technical spec v7 §6.6.4, plan header "Commit rule for the lobby") and the
 * A.4 test hooks. Tests only.
 */
import type { LobbySeatView, LobbyStateView } from '@card-battle/shared';
import { expect, vi } from 'vitest';

import { makeLobbyView, type LobbyViewOverrides } from '../../view-model/test-fixtures';
import type { LobbyScreenProps } from './lobby-screen';

export const LOBBY_HOST: LobbySeatView = { id: 'host', nickname: 'Ada', isBot: false, isReady: true };
export const LOBBY_GUEST: LobbySeatView = { id: 'guest', nickname: 'Bea', isBot: false, isReady: false };
export const LOBBY_BOT: LobbySeatView = { id: 'bot-1', nickname: 'Bot Cy', isBot: true, botDifficulty: 'normal', isReady: true };

/** Every callback that sends an intent. `onLeave` is not one: Leave is an immediate disconnect. */
export const LOBBY_INTENT_PROPS = [
  'onStart', 'onAddBot', 'onKickPlayer', 'onSetReady', 'onSetBotDifficulty',
  'onChooseKit', 'onSetLobbyRules', 'onSendChat',
] as const;

export function hostLobbyView(overrides: LobbyViewOverrides = {}): LobbyStateView {
  return makeLobbyView({ you: 'host', hostPlayerId: 'host', gameCode: 'ABCDEF', players: [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT], ...overrides });
}
export function guestLobbyView(overrides: LobbyViewOverrides = {}): LobbyStateView {
  return hostLobbyView({ you: 'guest', ...overrides });
}
export function walkInLobbyView(overrides: LobbyViewOverrides = {}): LobbyStateView {
  return hostLobbyView({ you: 'watcher', isSpectator: true, ...overrides });
}

export function makeLobbyProps(overrides: Partial<LobbyScreenProps> = {}): LobbyScreenProps {
  return {
    view: hostLobbyView(),
    status: 'connected',
    error: null,
    onStart: vi.fn(),
    onLeave: vi.fn(),
    onAddBot: vi.fn(),
    onKickPlayer: vi.fn(),
    onSetReady: vi.fn(),
    onSetBotDifficulty: vi.fn(),
    onChooseKit: vi.fn(),
    onSetLobbyRules: vi.fn(),
    onSendChat: vi.fn(),
    ...overrides,
  };
}

export function expectNoLobbyIntent(props: LobbyScreenProps): void {
  for (const name of LOBBY_INTENT_PROPS) {
    const callback: unknown = props[name];
    if (vi.isMockFunction(callback)) expect(callback, name).not.toHaveBeenCalled();
  }
}

export function lobbySeat(playerId: string): HTMLElement {
  const seat = document.querySelector<HTMLElement>(`[data-lobby-seat="${playerId}"]`);
  if (seat === null) throw new Error(`no lobby seat ${playerId}`);
  return seat;
}

export function lobbyBackdrop(dialog: HTMLElement): HTMLElement {
  const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"], [data-zone="dialog-overlay"]');
  if (overlay === null) throw new Error('no dialog backdrop');
  return overlay;
}

export function isLobbyControlDisabled(control: HTMLElement): boolean {
  return control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true';
}
```

`apps/client/src/screens/lobby/lobby-screen.test.tsx` (25 tests). It uses only A.4 hooks and accessible names (no class or element shape), so L76-12 leaves it unchanged:

```tsx
// @vitest-environment happy-dom
/**
 * Lobby screen behavior: technical spec v7 §7.2 and §12.1. These are the rendered replacements of
 * the six lobby source-text tests (L76-02). Parity rows: `lobby-player-list`, `lobby-kick-confirm`,
 * `lobby-host-seat-kick`, `lobby-your-kit`, `lobby-action-row`, `lobby-kit-picker-dialog`,
 * `global-feedback-entry-points`, `global-visual-viewport-fit`. The tests use only the plan A.4
 * hooks and names, so they hold through the L76-12 restyle. A test that opens or closes a dialog
 * asserts that no intent fired.
 */
import { defaultLobbyRules, getKit, KIT_IDS } from '@card-battle/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { submitFeedback } from '../../feedback/submit-feedback';
import { renderUi } from '../../test/render';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import {
  expectNoLobbyIntent, guestLobbyView, hostLobbyView, isLobbyControlDisabled, LOBBY_BOT, LOBBY_GUEST,
  LOBBY_HOST, lobbyBackdrop, lobbySeat, makeLobbyProps, walkInLobbyView,
} from './test-lobby';

vi.mock('../../feedback/submit-feedback', () => ({
  submitFeedback: vi.fn(() => Promise.resolve({ ok: true as const })),
}));

function renderLobby(overrides: Partial<LobbyScreenProps> = {}) {
  const props = makeLobbyProps(overrides);
  return { ...renderUi(<LobbyScreen {...props} />, { reducedMotion: true }), props };
}
/** True when `later` comes after `earlier` in document order. */
function follows(earlier: Node, later: Node): boolean {
  return (earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}
const KICK_CONFIRM = 'Kick this player?';
const READY_GUEST = { ...LOBBY_GUEST, isReady: true };

beforeEach(() => {
  vi.mocked(submitFeedback).mockClear();
});

describe('lobby seats (L49-02, L57-16; parity lobby-player-list)', () => {
  it('lists every seat under Players (3/8) with (you), Host and the bot label, for every viewer', () => {
    const viewers = [
      { view: hostLobbyView(), you: 'host' },
      { view: guestLobbyView(), you: 'guest' },
      { view: walkInLobbyView(), you: null },
    ];
    for (const { view, you } of viewers) {
      const { unmount } = renderLobby({ view });
      expect(screen.getByRole('heading', { name: 'Players (3/8)' })).toBeTruthy();
      for (const seat of [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT]) {
        const text = lobbySeat(seat.id).textContent ?? '';
        expect(text.includes(`${seat.nickname} (you)`), `${seat.id} for ${String(you)}`).toBe(seat.id === you);
      }
      expect(within(lobbySeat('host')).getByText('Host')).toBeTruthy();
      expect(within(lobbySeat('guest')).queryByText('Host')).toBeNull();
      expect(lobbySeat('bot-1').textContent).toContain('Bot·Normal');
      unmount();
    }
  });

  it('puts the ready mark of each seat, named Ready or Not ready, before the nickname', () => {
    renderLobby();
    for (const seat of [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT]) {
      const scope = within(lobbySeat(seat.id));
      const mark = scope.getByLabelText(seat.isReady ? 'Ready' : 'Not ready');
      const name = scope.getByText(new RegExp(`^${seat.nickname}`));
      expect(follows(mark, name), seat.id).toBe(true);
    }
  });

  it('never renders a kit on a seat; the chosen kit shows only on Your kit', () => {
    renderLobby({ view: hostLobbyView({ yourKitSelection: 'assassin' }) });
    const kitNames = KIT_IDS.map((kitId) => getKit(kitId).name);
    for (const seat of [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT]) {
      const element = lobbySeat(seat.id);
      expect(element.querySelector('[data-zone="kit-portrait"]'), seat.id).toBeNull();
      for (const name of kitNames) expect(element.textContent, `${seat.id} / ${name}`).not.toContain(name);
    }
    const shown = screen.getAllByText(getKit('assassin').name);
    expect(shown).toHaveLength(1);
    expect(shown[0]?.closest('[data-lobby-seat]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Choose kit' })).toBeTruthy();
  });

  it('shows Random kit on Your kit for a random pick', () => {
    renderLobby();
    expect(screen.getByText('Random kit')).toBeTruthy();
  });
});

describe('Choose kit (L49-02; parity lobby-your-kit, lobby-kit-picker-dialog)', () => {
  it('opens the kit picker from Choose kit and sends nothing', async () => {
    const { user, props } = renderLobby();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    expect(screen.getByRole('dialog', { name: 'Choose kit' })).toBeTruthy();
    expectNoLobbyIntent(props);
  });

  it('sends chooseKit only from Select this kit', async () => {
    const { user, props } = renderLobby();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    const picker = screen.getByRole('dialog', { name: 'Choose kit' });
    await user.click(within(picker).getByRole('button', { name: getKit('assassin').name }));
    expectNoLobbyIntent(props);
    await user.click(screen.getByRole('button', { name: 'Select this kit' }));
    expect(props.onChooseKit).toHaveBeenCalledTimes(1);
    expect(props.onChooseKit).toHaveBeenCalledWith('assassin');
  });

  it('hides Choose kit under Random only', () => {
    renderLobby({ view: hostLobbyView({ lobbyRules: { ...defaultLobbyRules(), randomOnly: true } }) });
    expect(screen.queryByRole('button', { name: 'Choose kit' })).toBeNull();
  });

  it('shows a walk-in Watching the lobby, the waiting copy, and no kit card, Ready or Start', () => {
    renderLobby({ view: walkInLobbyView() });
    expect(screen.getByText('Watching the lobby')).toBeTruthy();
    expect(screen.getByText('Waiting for the host to start…')).toBeTruthy();
    for (const name of ['Choose kit', 'Ready', 'Start game']) {
      expect(screen.queryByRole('button', { name }), name).toBeNull();
    }
  });
});

describe('Kick (L57-09; parity lobby-kick-confirm, lobby-host-seat-kick)', () => {
  it('gives the host Kick on every other seat, bot and human, and none on their own', () => {
    renderLobby();
    expect(within(lobbySeat('host')).queryByRole('button', { name: 'Kick' })).toBeNull();
    expect(within(lobbySeat('guest')).getByRole('button', { name: 'Kick' })).toBeTruthy();
    expect(within(lobbySeat('bot-1')).getByRole('button', { name: 'Kick' })).toBeTruthy();
  });

  it('gives a guest and a walk-in no Kick at all', () => {
    for (const view of [guestLobbyView(), walkInLobbyView()]) {
      const { unmount } = renderLobby({ view });
      expect(screen.queryAllByRole('button', { name: 'Kick' })).toHaveLength(0);
      unmount();
    }
  });

  it('opens Kick this player? from a seat Kick and sends nothing', async () => {
    const { user, props } = renderLobby();
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: 'Kick' }));
    const confirm = screen.getByRole('dialog', { name: KICK_CONFIRM });
    expect(within(confirm).getByText('Bea will leave this lobby. They can join again with the code.')).toBeTruthy();
    expectNoLobbyIntent(props);
  });

  it.each(['Cancel', 'Esc', 'the backdrop'] as const)('closes the confirm on %s and sends nothing', async (way) => {
    const { user, props } = renderLobby();
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: 'Kick' }));
    const confirm = screen.getByRole('dialog', { name: KICK_CONFIRM });
    if (way === 'Cancel') await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    else if (way === 'Esc') await user.keyboard('{Escape}');
    else await user.click(lobbyBackdrop(confirm));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: KICK_CONFIRM })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });

  it.each([
    ['guest', 'Bea'],
    ['bot-1', 'Bot Cy'],
  ] as const)('kicks %s only from the confirm Kick, then closes', async (id, nickname) => {
    const { user, props } = renderLobby();
    await user.click(within(lobbySeat(id)).getByRole('button', { name: 'Kick' }));
    const confirm = screen.getByRole('dialog', { name: KICK_CONFIRM });
    expect(within(confirm).getByText(`${nickname} will leave this lobby. They can join again with the code.`)).toBeTruthy();
    await user.click(within(confirm).getByRole('button', { name: 'Kick' }));
    expect(props.onKickPlayer).toHaveBeenCalledTimes(1);
    expect(props.onKickPlayer).toHaveBeenCalledWith(id);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: KICK_CONFIRM })).toBeNull();
    });
  });

  it('has no remove-bot callback: bots leave through Kick', () => {
    expectTypeOf<LobbyScreenProps>().not.toHaveProperty('onRemoveBot');
    expect('onRemoveBot' in makeLobbyProps()).toBe(false);
  });
});

describe('Ready and Start (L57-11; parity lobby-action-row)', () => {
  it('lets a guest who is not ready press Ready, with its check icon, which sends setReady(true)', async () => {
    const { user, props } = renderLobby({ view: guestLobbyView() });
    const ready = screen.getByRole('button', { name: 'Ready' });
    expect(ready.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Press Ready when you are set.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start game' })).toBeNull();
    await user.click(ready);
    expect(props.onSetReady).toHaveBeenCalledTimes(1);
    expect(props.onSetReady).toHaveBeenCalledWith(true);
  });

  it('lets a ready guest press Cancel ready, which sends setReady(false)', async () => {
    const { user, props } = renderLobby({ view: guestLobbyView({ players: [LOBBY_HOST, READY_GUEST, LOBBY_BOT] }) });
    expect(screen.getByText('Waiting for the host to start…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ready' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Cancel ready' }));
    expect(props.onSetReady).toHaveBeenCalledTimes(1);
    expect(props.onSetReady).toHaveBeenCalledWith(false);
  });

  it('gives the host Start and no Ready, disabled until every human guest is ready', async () => {
    const { user, props, rerender } = renderLobby();
    expect(screen.queryByRole('button', { name: 'Ready' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancel ready' })).toBeNull();
    const grey = screen.getByRole('button', { name: 'Start game' });
    expect(isLobbyControlDisabled(grey)).toBe(true);
    fireEvent.click(grey);
    expect(props.onStart).not.toHaveBeenCalled();
    rerender(<LobbyScreen {...props} view={hostLobbyView({ players: [LOBBY_HOST, READY_GUEST, LOBBY_BOT] })} />);
    const start = screen.getByRole('button', { name: 'Start game' });
    expect(isLobbyControlDisabled(start)).toBe(false);
    await user.click(start);
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('enables Start for the host plus bots, and keeps it disabled for the host alone', () => {
    const { unmount } = renderLobby({ view: hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] }) });
    expect(isLobbyControlDisabled(screen.getByRole('button', { name: 'Start game' }))).toBe(false);
    unmount();
    renderLobby({ view: hostLobbyView({ players: [LOBBY_HOST] }) });
    expect(isLobbyControlDisabled(screen.getByRole('button', { name: 'Start game' }))).toBe(true);
  });

  it('leaves at once from Leave, with no confirm', async () => {
    const { user, props } = renderLobby();
    await user.click(screen.getByRole('button', { name: 'Leave' }));
    expect(props.onLeave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Feedback (L47-03; parity global-feedback-entry-points)', () => {
  it('opens manual Feedback for screen lobby with the game code and the nickname', async () => {
    const { user, props } = renderLobby();
    expect(screen.queryByText(/Feedback on the felt/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    const dialog = screen.getByRole('dialog', { name: 'Feedback' });
    expectNoLobbyIntent(props);
    await user.click(within(dialog).getByRole('button', { name: 'UI' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Message' }), 'Kick looks odd');
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    expect(submitFeedback).toHaveBeenCalledTimes(1);
    const [payload] = vi.mocked(submitFeedback).mock.calls[0] ?? [];
    expect(payload).toMatchObject({ screen: 'lobby', gameCode: 'ABCDEF', nickname: 'Ada', message: 'Kick looks odd' });
    expect(payload).not.toHaveProperty('playKind');
    expect(payload).not.toHaveProperty('logTail');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });
});

describe('chat (L76-02 moves the lobby to ui/chat ChatLog)', () => {
  it('sends the trimmed chat body through onSendChat', async () => {
    const { user, props } = renderLobby();
    await user.type(screen.getByRole('textbox', { name: 'Message' }), '  hello lobby  {Enter}');
    expect(props.onSendChat).toHaveBeenCalledTimes(1);
    expect(props.onSendChat).toHaveBeenCalledWith('hello lobby');
  });
});

describe('viewport (L53-07; parity global-visual-viewport-fit)', () => {
  it('scrolls inside #root: main is the scroll container and nothing uses 100dvh', () => {
    renderLobby();
    const main = screen.getByRole('main');
    expect(main.className.split(/\s+/)).toEqual(expect.arrayContaining(['overflow-y-auto', 'overscroll-contain']));
    expect(main.className).not.toContain('overflow-hidden');
    expect(document.body.innerHTML).not.toContain('100dvh');
  });
});
```

The test count is 4 + 4 + 9 (`it.each` gives 3 + 2) + 5 + 1 + 1 + 1 = 25.

`apps/client/src/screens/lobby/lobby-screen.ready-chrome.test.ts` (1 test, node). The two assertions are moved verbatim from `lobby-ready.test.ts`:

```ts
/**
 * Lobby Ready chrome (L57-11 / L57-16). This is the old-layout half of `lobby-ready.test.ts`'s
 * wiring test, split out by L76-02 (plan A.7; test classification "lobby Ready wiring … variant").
 * Its product half is rendered in `lobby-screen.test.tsx`. L76-12 retires this file along with
 * the V2 chrome.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('lobby Ready wiring (L57-11)', () => {
  it('toggles Ready from view facts and greys Start', () => {
    const lobby = readFileSync(join(here, 'lobby-screen.tsx'), 'utf8');
    expect(lobby).toContain("variant={youReady ? 'orange' : 'green'}");
    expect(lobby).toContain('LobbyReadyCheckIcon');
  });
});
```

- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/screens/lobby/`. Expected:
  - `lobby-screen.test.tsx` fails to load: `Failed to resolve import "./lobby-screen"`, because `screens/lobby.tsx` has not moved yet.
  - `lobby-screen.ready-chrome.test.ts` fails with `ENOENT … screens/lobby/lobby-screen.tsx`.

- [ ] **Step 3: Implement.**
  - **Moves:** run the `git mv` and `git rm` commands of the Files list. `lobby-ready-mark.tsx` keeps `./lobby-ready`. `lobby-kit-picker.test.ts` keeps `./lobby-kit-picker`. Neither changes.
  - **`screens/lobby/lobby-screen.tsx`**, the moved code. The look does not change. Only these edits:
    - Imports become `../../bots/format-bot-difficulty`, `../../design/components/{bot-seat-label,button,dialog,kit-portrait}`, `../../feedback/feedback-dialog`, `../../net/use-room-connection` (type), `../lobby-kit-picker-dialog`, `../lobby-rules-panel` and `../status-labels`.
    - `./table/chat-log` becomes `../../ui/chat/chat-log`. Same `ChatLog` usage: `messages={view.chatMessages ?? []} players={view.players} canWrite onSend={onSendChat}`.
    - `./lobby-kit-picker`, `./lobby-ready` and `./lobby-ready-mark` stay relative to `./`.
    - The root `<main>` class gains `overscroll-contain`: `h-full overflow-y-auto overscroll-contain bg-surface font-sans text-ink`. A.4 hook: no visible change; scroll no longer chains to the page.
    - Each seat `<li key={player.id}>` gains `data-lobby-seat={player.id}`.
    - Add one doc-comment line: "Moved into `screens/lobby/` by L76-02 (technical spec v7 §4.2); L76-12 restyles it (§7.2)."
    - Do not re-type the rest. The `design/**` imports stay until L76-12 (see Contract issues).
  - **`screens/lobby/lobby-ready.test.ts`**:
    - Delete the `describe('lobby Ready wiring (L57-11)')` block. Its product assertions are now rendered tests; its style assertions are in the split file.
    - Delete the imports and the `here` constant that only that block used (`readFileSync`, `dirname`, `join`, `fileURLToPath`).
    - Leave the three pure `it`s, their fixture and their imports unchanged.
  - **`screens/lobby/lobby-ready-mark.test.ts`**: change `join(here, 'lobby.tsx')` to `join(here, 'lobby-screen.tsx')`. Add a header line: "Moved by L76-02; L76-12 retires it (plan A.7)". Keep every assertion: the moved V2 source still holds `<LobbyReadyStatusMark` before `{player.nickname}`.
  - **`screens/lobby-kit-picker-dialog.tsx`**:
    - Change `import { KitInspectDetails } from './table/kit-inspect-details';` to `import { KitDetails } from '../ui/kit/kit-details';`.
    - Change `<KitInspectDetails kitId={preview} />` to `<KitDetails kitId={preview} />`.
    - Change `from './lobby-kit-picker'` to `from './lobby/lobby-kit-picker'`.
    - Add a doc-comment line: "Kit body: `ui/kit/KitDetails` (L72-15) since L76-02; L76-10 replaces this dialog."
  - **App and Home:** the import lines in Files.
  - **Check:** `grep -rn "table/" apps/client/src/screens/lobby apps/client/src/screens/lobby-kit-picker-dialog.tsx` prints nothing. Nothing in the lobby imports `screens/table/` any more, so L75-11 can delete `chat-log.tsx` and `kit-inspect-details.tsx`.

- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/screens/lobby/ apps/client/src/screens/home/ apps/client/src/ui/chat/ apps/client/src/ui/kit/ apps/client/src/App.arena.test.tsx apps/client/src/screens/claim-seat-dialog.test.ts`. Expected:
  - Pass: `lobby-screen.test.tsx` 25, `lobby-ready.test.ts` 3, `lobby-ready-mark.test.ts` 1, `lobby-kit-picker.test.ts` 2, `lobby-screen.ready-chrome.test.ts` 1.
  - Every other listed file passes with no edit.

- [ ] **Step 5: Docs.**
  - **`docs/agent/frontend.md`**, Screens table. Lobby row file cell: `` `screens/lobby.tsx` + `lobby-kit-picker-dialog.tsx` `` → `` `screens/lobby/lobby-screen.tsx` + `lobby-kit-picker-dialog.tsx` ``.
  - **`docs/agent/frontend.md`**, `## Home and lobby (V7 · Lot 76)`. Append after L76-01's bullets:

```
- `screens/lobby/lobby-screen.tsx` (L76-02, spec v7 §4.2, §7.2, §12.1): the V2 lobby moved as it is.
  App imports `./screens/lobby/lobby-screen` (no `index.ts`). `lobby-ready.ts`,
  `lobby-ready-mark.tsx` and `lobby-kit-picker.ts` moved beside it with their tests; the pure
  `lobby-ready` and `lobby-kit-picker` suites are unchanged. Two imports switched to their L72
  rebuilds, so nothing in the lobby imports `screens/table/` (L75-11 may delete the old copies):
  `ChatLog` from `ui/chat/chat-log`, and in `screens/lobby-kit-picker-dialog.tsx`, `KitDetails`
  from `ui/kit/kit-details`. The V7 `ChatLog` trims the body before `onSend`, which the V6 log
  did not, so a lobby `SEND_CHAT` now carries the trimmed text (decisions.md 2026-11-03). Two
  more edits: the root `main` gained `overscroll-contain`, and each seat `<li>` carries
  `data-lobby-seat={player.id}` (a test hook). Until L76-10, the picker's preview shows the dark
  V7 kit body inside the light V2 dialog.
- `screens/lobby/test-lobby.ts` (L76-02, plan A.3): `LOBBY_HOST` / `LOBBY_GUEST` / `LOBBY_BOT`
  (Ada, Bea, Bot Cy), `hostLobbyView` / `guestLobbyView` / `walkInLobbyView` (code `ABCDEF`),
  `makeLobbyProps` (a `vi.fn()` per callback), `expectNoLobbyIntent` (every intent callback but
  `onLeave`), `lobbySeat(id)`, `lobbyBackdrop(dialog)` (V7 or V2 scrim) and
  `isLobbyControlDisabled(control)` (native `disabled` or `aria-disabled`).
- `screens/lobby/lobby-screen.test.tsx` (L76-02, spec v7 §12.1): the rendered replacements of
  `lobby-kick`, `lobby-kit-privacy`, `lobby-ready-mark`, `lobby-ready` (wiring),
  `lobby.feedback-surfaces` and `lobby.visual-viewport`. They cover:
  - seats, (you), Host, the bot label, and the ready mark before the nickname;
  - no kit on any seat;
  - Choose kit, then Select this kit as the only commit;
  - Random only and the walk-in banner;
  - Kick on every other seat, its confirm (Cancel, Esc and the backdrop send nothing), and no
    remove-bot prop;
  - Ready / Cancel ready, and the grey Start;
  - Feedback (`submitFeedback` mocked: screen `lobby`, game code and nickname);
  - the trimmed chat body;
  - `main` as the scroll container.
  They query only by role, name and the A.4 hooks, so they outlive the L76-12 restyle. The
  style-only halves wait for L76-12: `lobby-ready-mark.test.ts` (moved) and
  `lobby-screen.ready-chrome.test.ts` (split from `lobby-ready.test.ts`).
```

  - **`docs/agent/decisions.md`**: append at the end. Use the commit day as the date.

```
## YYYY-MM-DD · [P] The lobby chat sends the trimmed body (L76-02)

Source: technical spec v7 §4.2, §15 (the lobby leaves `screens/table/`); `docs/agent/frontend.md` Chat (`ui/chat/`, L72-14).

- **Change.** L76-02 moves the lobby to the V7 `ui/chat` `ChatLog`, which trims the body before
  `onSend` (L72-14). The V6 `screens/table/chat-log.tsx` sent the text as typed, spaces included.
  The server stores the body as sent: `parseSendChatPayload` only rejects an empty or
  whitespace-only body.
- **Effect.** A lobby line loses its leading and trailing spaces. Nothing else changes: an empty
  or whitespace-only message is still dropped on the client, and the intent, the 200-character
  cap and the reset after a send are the same.
- **Why.** One chat component serves the lobby, the arena chat sheet (L74-16, which already sends
  trimmed lines) and Game over (L77).

---
```

  - **`docs/backlog_v7_test_classification.md`**, `## Owner lot 76`. Append at the end of the last cell of each row. Find the row by its File and Asserts.
    - `screens/lobby.feedback-surfaces.test.ts` (FeedbackDialog, `screen="lobby"`): ` **Done (L76-02):** replaced by `screens/lobby/lobby-screen.test.tsx` › 'opens manual Feedback for screen lobby with the game code and the nickname'.`
    - `screens/lobby-kick.test.ts` ('Kick', 'setKickTarget' …): ` **Done (L76-02):** replaced by `screens/lobby/lobby-screen.test.tsx` › 'gives the host Kick on every other seat, bot and human, and none on their own', 'gives a guest and a walk-in no Kick at all', 'opens Kick this player? from a seat Kick and sends nothing', 'closes the confirm on %s and sends nothing', 'kicks %s only from the confirm Kick, then closes'.`
    - `screens/lobby-kick.test.ts` (no 'onRemoveBot'): ` **Done (L76-02):** replaced by `screens/lobby/lobby-screen.test.tsx` › 'has no remove-bot callback: bots leave through Kick' (expectTypeOf), 'kicks %s only from the confirm Kick, then closes' (bot-1).`
    - `screens/lobby-kit-privacy.test.ts` (no `/player\.kit/`): ` **Done (L76-02):** replaced by `screens/lobby/lobby-screen.test.tsx` › 'never renders a kit on a seat; the chosen kit shows only on Your kit'.`
    - `screens/lobby-kit-privacy.test.ts` ('yourKitSelection', 'Choose kit'): ` **Done (L76-02):** replaced by `screens/lobby/lobby-screen.test.tsx` › 'shows Random kit on Your kit for a random pick', 'opens the kit picker from Choose kit and sends nothing', 'sends chooseKit only from Select this kit', 'hides Choose kit under Random only'.`
    - `screens/lobby-ready-mark.test.ts` (product: `lobbyReadyLabel`, mark on each seat): ` **Done (L76-02):** replaced by `screens/lobby/lobby-screen.test.tsx` › 'puts the ready mark of each seat, named Ready or Not ready, before the nickname'.`
    - `screens/lobby-ready-mark.test.ts` (old-layout: `w-6 shrink-0`, V2 tokens): ` **Moved (L76-02):** now `screens/lobby/lobby-ready-mark.test.ts`, reading `lobby-screen.tsx`; retired in L76-12.`
    - `screens/lobby-ready.test.ts`, each of its three pure rows: ` **Done (L76-02):** moved to `screens/lobby/lobby-ready.test.ts`, assertions unchanged.`
    - `screens/lobby-ready.test.ts` (wiring, product: 'onSetReady', 'lobbyStartEnabled', 'Cancel ready', 'LobbyReadyStatusMark'): ` **Done (L76-02):** replaced by `screens/lobby/lobby-screen.test.tsx` › 'lets a guest who is not ready press Ready, with its check icon, which sends setReady(true)', 'lets a ready guest press Cancel ready, which sends setReady(false)', 'gives the host Start and no Ready, disabled until every human guest is ready', 'enables Start for the host plus bots, and keeps it disabled for the host alone', 'puts the ready mark of each seat, named Ready or Not ready, before the nickname'.`
    - `screens/lobby-ready.test.ts` (wiring, old-layout: variant expression, `LobbyReadyCheckIcon`): ` **Moved (L76-02):** split to `screens/lobby/lobby-screen.ready-chrome.test.ts` (same titles); retired in L76-12.`
    - `screens/lobby-ready.test.ts` (wiring, 'Feedback on the felt'): ` **Done (L76-02):** replaced by `screens/lobby/lobby-screen.test.tsx` › 'opens manual Feedback for screen lobby with the game code and the nickname'.`
    - `screens/lobby.visual-viewport.test.ts`: ` **Done (L76-02):** replaced by `screens/lobby/lobby-screen.test.tsx` › 'scrolls inside #root: main is the scroll container and nothing uses 100dvh'.`
  - **`docs/backlog_v7.md`:**
    - In the row that starts `| L76-02 |`: `To do` → `Done`.
    - Progress: `| 76 · Home and lobby | 18 | 1 |` → `| 76 · Home and lobby | 18 | 2 |`.
    - Total: read the current Done total (Lot 75 moves it in parallel) and add 1.

- [ ] **Step 6: Verify and commit.**
  - Run `pnpm verify` and wait for it to pass.
  - The `git mv` / `git rm` steps already staged the moves and deletions. Stage the rest by name:

```
git add apps/client/src/screens/lobby/lobby-screen.tsx apps/client/src/screens/lobby/test-lobby.ts apps/client/src/screens/lobby/lobby-screen.test.tsx apps/client/src/screens/lobby/lobby-screen.ready-chrome.test.ts apps/client/src/screens/lobby/lobby-ready.test.ts apps/client/src/screens/lobby/lobby-ready-mark.test.ts apps/client/src/screens/lobby-kit-picker-dialog.tsx apps/client/src/App.tsx apps/client/src/screens/home/solo-path.tsx apps/client/src/screens/home/home-screen.tsx docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
```

  - Drop a `screens/home/*` path above if the grep in Files did not list it.
  - Commit, with no attribution trailer:

```
refactor(lobby): split lobby into screens/lobby (L76-02)

The lobby now uses ui/chat ChatLog, which trims the body before
onSend (decisions.md).
```

**Acceptance map:**
- No seat renders a kit, and Your kit shows only `yourKitSelection`:
  - `never renders a kit on a seat; the chosen kit shows only on Your kit`;
  - `shows Random kit on Your kit for a random pick`.
- Choose kit opens the picker:
  - `opens the kit picker from Choose kit and sends nothing`;
  - `sends chooseKit only from Select this kit`.
- The host gets Kick on every other seat, bot and human, and it opens 'Kick this player?':
  - `gives the host Kick on every other seat, bot and human, and none on their own`;
  - `gives a guest and a walk-in no Kick at all`;
  - `opens Kick this player? from a seat Kick and sends nothing`.
- Only the confirm's Kick calls `onKickPlayer(id)`; Cancel, Esc and backdrop send nothing:
  - `kicks %s only from the confirm Kick, then closes` (guest and bot);
  - `closes the confirm on %s and sends nothing` (×3).
- No `onRemoveBot` prop exists: `has no remove-bot callback: bots leave through Kick` (typecheck plus runtime).
- Each seat's ready mark comes before the nickname, labelled Ready / Not ready: `puts the ready mark of each seat, named Ready or Not ready, before the nickname`.
- A human guest sees Ready (with the check icon) / Cancel ready, which call `onSetReady(!ready)`: the two Ready tests.
- The host's Start stays disabled until `lobbyStartEnabled`:
  - `gives the host Start and no Ready, disabled until every human guest is ready`;
  - `enables Start for the host plus bots, and keeps it disabled for the host alone`.
- Feedback opens with screen 'lobby', the game code and the nickname: `opens manual Feedback for screen lobby with the game code and the nickname`.
- The lobby scrolls inside `#root`, with no `100dvh`: `scrolls inside #root: main is the scroll container and nothing uses 100dvh`.
- The pure `lobby-ready` tests are unchanged: `screens/lobby/lobby-ready.test.ts`, 3 `it`s as they were.
- ChatLog and KitDetails import switch (brief): `sends the trimmed chat body through onSendChat`, plus the Step 3 grep.
- `pnpm verify` green: Step 6.

**Decisions:**
- **The rendered tests use only the A.4 hooks and names**, never class names or element shapes:
  - the mark is found by `getByLabelText`, which matches both the V2 `aria-label` span and the V7 labelled icon;
  - "disabled" is native `disabled` or `aria-disabled` (`isLobbyControlDisabled`);
  - the backdrop is either overlay (`lobbyBackdrop`);
  - a click on a disabled control uses `fireEvent.click`, which behaves the same on both.
  So the 25 tests stay unchanged through L76-12.
- **`overscroll-contain` is added to the moved `main`.** A.4 makes it a hook from L76-02 on, and the classification row for `lobby.visual-viewport` asks for it. It only stops scroll chaining.
- **The V2 picker shows the V7 `KitDetails` until L76-10.** That means a dark body in a light dialog, and the kit name twice (dialog title and `KitDetails` header). It is accepted for this one transition; the controller's browser check should not flag it.
- **`lobby-ready-mark.test.ts` moves whole.** A moved test keeps its assertions. Its product row is marked replaced now; the file retires with its old-layout row in L76-12.
- **Two additive `test-lobby.ts` exports** (`lobbyBackdrop`, `isLobbyControlDisabled`) are shared with L76-12 … L76-16.
- **The chat trim is recorded** in decisions.md and frontend.md.
- **No new or changed player-facing string.**

---

---

### Task L76-03: Fix the Lot 76 stale copy rows

**Files:**
- Create:
  - `apps/client/src/screens/kit-pick-copy.ts`: kit privacy and kit pick strings shared by the lobby, the solo menu, the picker and How to play.
  - `apps/client/src/screens/home/home-copy.ts`: `ONLINE_CREATE_HELPER`.
- Test (create): `apps/client/src/screens/kit-pick-copy.test.ts` (1), `apps/client/src/screens/home/home-copy.test.ts` (1), `apps/client/src/screens/lobby-kit-picker-dialog.test.tsx` (2), `apps/client/src/view-model/kit-inspect-traits.test.ts` (2).
- Modify:
  - Copy:
    - `screens/how-to-play-content.ts` (the Kits body);
    - `screens/lobby/lobby-screen.tsx` (the Your kit line);
    - `screens/lobby-kit-picker-dialog.tsx` (grid lead, `RandomKitDetails`);
    - `screens/home/online-path.tsx` (Create helper), `screens/home/solo-path.tsx` (solo kit line);
    - `view-model/kit-inspect-traits.ts` (Prophet).
  - UI: `ui/kit/kit-details.tsx` (random special versos), `ui/ui-copy.ts` (`RANDOM_SPECIAL_CAPTION`).
  - Release notes: `packages/shared/src/release-notes.ts`.
  - Tests: `screens/how-to-play-content.test.ts` (+1), `screens/home/home-screen.test.tsx` (+2), `screens/lobby/lobby-screen.test.tsx` (+1), `ui/kit/kit-details.test.tsx` (+1, 2 extended), `ui/ui-copy.test.ts` (+1), `packages/shared/src/release-notes.test.ts`, `screens/whats-new-dialog.test.ts`, and **one line** of `screens/table/kit-inspect-dialog.test.ts` (Appendix A.9 ruling 2).
  - Docs: `DESIGN.md`, `docs/technical_spec_v6.md`, `docs/agent/decisions.md`, `docs/agent/frontend.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`.
- Existing tests that must stay green unchanged: the five `how-to-play-content.test.ts` tests (the must-say and never-say lists), `ui/kit/kit-details-sections.test.ts`, `ui/kit/kit.gallery.test.tsx`, `screens/arena/kit-sheet.test.tsx`, `ui/release-storage.test.ts`, every L76-01 and L76-02 test not listed above.

**Interfaces:**
- Consumes:
  - From L76-01: `HomeScreen`, `seedHomeStorage`, `enterHomePath`, `makeHomeProps` (`screens/home/test-home.ts`).
  - From L76-02: `LobbyScreen` (`screens/lobby/lobby-screen.tsx`), `makeLobbyProps`, `guestLobbyView` (`screens/lobby/test-lobby.ts`, Appendix A.3).
  - The dialog `LobbyKitPickerDialog` (props `open`, `current`, `allowedKitIds`, `onClose`, `onSelect`) is still at `screens/lobby-kit-picker-dialog.tsx`, with `RandomKitDetails` inside.
  - `Card` (`ui/card/card`, `face="hidden"` takes `family: CardType` = `'attack' | 'action' | 'special'`), `HIDDEN_CARD_LABEL` ('Hidden card', `ui/card/card-face`).
  - Shared: `getKit(kitId).randomStartingSpecialCount` (`number | undefined`: Prophet 2, Gambler 2, else unset), `CIRCULATING_SPECIAL_CARD_IDS`, `KIT_IDS`.
- Produces:

```ts
// screens/kit-pick-copy.ts
export const KIT_PRIVACY_COPY = 'Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated.';
export const KIT_PICKER_LEAD = `${KIT_PRIVACY_COPY} Random is the default.`;
export const RANDOM_KIT_ASSIGN_COPY = 'The server assigns one of the allowed kits at random when the game starts.';
export const RANDOM_KIT_PRIVACY_COPY = 'Opponents see which kit you received only with an upgraded Spy or Spy Thief, or once you are eliminated.';
// screens/home/home-copy.ts
export const ONLINE_CREATE_HELPER = 'Host gets a code to share. Start from the lobby once every guest is Ready.';
// ui/ui-copy.ts
export const RANDOM_SPECIAL_CAPTION = 'Random special';
// KitDetails: one <li data-random-special={index}> per random starting special, after the fixed specials.
```

- [ ] **Step 1: Write the failing tests.**

`screens/how-to-play-content.test.ts`: add `import { KIT_PRIVACY_COPY } from './kit-pick-copy';` and this `it` after 'states every §5.1 must-say fact'. The five existing tests stay as they are; they still check the must-say tokens (Spy, Random, Gambler, 5–100, weighted, 3 specials, 1-in-10) and the never-say list.

```ts
  it('states the Lot 69, Lot 70 and Lot 66 kit facts (spec v7 §10.1, L76-03)', () => {
    const kits = HOW_TO_PLAY_SECTIONS.find((section) => section.id === 'kits')?.body ?? '';
    expect(kits).toContain(KIT_PRIVACY_COPY);
    expect(kits).toContain('A basic Spy shows only your resources.');
    expect(kits).toContain('pick any kit the host has not excluded, or keep Random');
    expect(kits).toContain('if the host deals kits at random, nobody picks');
    expect(kits).toContain('each Draw has a 1-in-10 chance to drop you to 1 life and lose everything (you are not eliminated)');
    expect(kits).not.toMatch(/until they Spy you|pick a kit or keep Random|chance to eliminate you/);
  });
```

`screens/kit-pick-copy.test.ts` (new, 1 test):

```ts
/** Kit pick copy: technical spec v7 §10.1 (Lot 76 rows, Q11 = B); designer review in the PR (L76-03). */
import { describe, expect, it } from 'vitest';

import { KIT_PICKER_LEAD, KIT_PRIVACY_COPY, RANDOM_KIT_ASSIGN_COPY, RANDOM_KIT_PRIVACY_COPY } from './kit-pick-copy';

describe('kit pick copy (spec v7 §10.1, L76-03)', () => {
  it('says who sees a kit with the Lot 69 wording, and that Random draws from the allowed kits', () => {
    expect(KIT_PRIVACY_COPY).toBe('Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated.');
    expect(KIT_PICKER_LEAD).toBe('Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated. Random is the default.');
    expect(RANDOM_KIT_ASSIGN_COPY).toBe('The server assigns one of the allowed kits at random when the game starts.');
    expect(RANDOM_KIT_PRIVACY_COPY).toBe('Opponents see which kit you received only with an upgraded Spy or Spy Thief, or once you are eliminated.');
  });
});
```

`screens/home/home-copy.test.ts` (new, 1 test):

```ts
/** Home copy: technical spec v7 §10.1 (Online Create helper, L57-11); L76-03. */
import { describe, expect, it } from 'vitest';

import { ONLINE_CREATE_HELPER } from './home-copy';

describe('Home copy (spec v7 §10.1, L76-03)', () => {
  it('tells the host to start once every guest is Ready', () => {
    expect(ONLINE_CREATE_HELPER).toBe('Host gets a code to share. Start from the lobby once every guest is Ready.');
  });
});
```

`screens/home/home-screen.test.tsx`: add `import { KIT_PICKER_LEAD } from '../kit-pick-copy';` and `import { ONLINE_CREATE_HELPER } from './home-copy';`, then this describe at the end (2 tests):

```tsx
describe('Lot 76 copy (spec v7 §10.1, L76-03)', () => {
  it('tells the host on Online to start once every guest is Ready', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    await enterHomePath(user, 'online');
    expect(screen.getByText(ONLINE_CREATE_HELPER)).toBeTruthy();
    expect(main().textContent).not.toContain('when everyone is seated');
  });

  it('says on the solo kit block who can see your kit', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    await enterHomePath(user, 'solo');
    expect(screen.getByText(KIT_PICKER_LEAD)).toBeTruthy();
  });
});
```

`screens/lobby/lobby-screen.test.tsx` (L76-02's file): add `import { KIT_PRIVACY_COPY } from '../kit-pick-copy';`, plus any of `renderUi`, `screen`, `LobbyScreen`, `makeLobbyProps` and `guestLobbyView` the file does not import yet. Then append (1 test):

```tsx
describe('Lot 76 copy (spec v7 §10.1, L76-03)', () => {
  it('says on Your kit who can see your kit', () => {
    renderUi(<LobbyScreen {...makeLobbyProps({ view: guestLobbyView() })} />, { reducedMotion: true });
    expect(screen.getByText(KIT_PRIVACY_COPY)).toBeTruthy();
    expect(screen.queryByText(/until Spy or death/)).toBeNull();
  });
});
```

`screens/lobby-kit-picker-dialog.test.tsx` (new, 2 tests). L76-10 deletes the dialog and carries both tests into its own:

```tsx
// @vitest-environment happy-dom
/**
 * Kit picker copy: technical spec v7 §10.1 (`RandomKitDetails` row and the pre-Lot-69 picker lead), L76-03.
 * L76-10 replaces the dialog with `screens/lobby/kit-picker-sheet.tsx` and carries these assertions over.
 */
import { KIT_IDS, type LobbyKitSelection } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { KIT_PICKER_LEAD, RANDOM_KIT_ASSIGN_COPY, RANDOM_KIT_PRIVACY_COPY } from './kit-pick-copy';
import { LobbyKitPickerDialog } from './lobby-kit-picker-dialog';

function renderPicker() {
  const onSelect = vi.fn<(selection: LobbyKitSelection) => void>();
  const onClose = vi.fn<() => void>();
  const result = renderUi(
    <LobbyKitPickerDialog open current="random" allowedKitIds={KIT_IDS} onClose={onClose} onSelect={onSelect} />,
    { reducedMotion: true },
  );
  return { ...result, onSelect, onClose };
}

describe('kit picker copy (spec v7 §10.1, L76-03)', () => {
  it('leads the grid with who can see your kit and that Random is the default', () => {
    renderPicker();
    expect(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByText(KIT_PICKER_LEAD)).toBeTruthy();
  });

  it('says the Random kit comes from the allowed kits and who can see it, and sends nothing', async () => {
    const { user, onSelect, onClose } = renderPicker();
    await user.click(screen.getByRole('button', { name: 'Random kit' }));
    const preview = screen.getByRole('dialog', { name: 'Random kit' });
    expect(within(preview).getByText(RANDOM_KIT_ASSIGN_COPY)).toBeTruthy();
    expect(within(preview).getByText(RANDOM_KIT_PRIVACY_COPY)).toBeTruthy();
    expect(preview.textContent).not.toMatch(/16 kits|before this picker existed|an equivalent/);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

`view-model/kit-inspect-traits.test.ts` (new, 2 tests). This is Appendix A.9 ruling 2: the Prophet assertion keeps a home after Lot 75 deletes the table test.

```ts
/**
 * Prophet ability copy: technical spec v7 §10.1 (Lot 76 row), L76-03. Mirrors the one line edited in
 * `screens/table/kit-inspect-dialog.test.ts`, which Lot 75 deletes (Lot 76 plan, Appendix A.9 ruling 2).
 */
import { CIRCULATING_SPECIAL_CARD_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { KIT_ABILITY_COPY } from './kit-inspect-traits';

describe('Prophet ability copy (spec v7 §10.1, L76-03)', () => {
  it('says Prophet starts with 2 random circulating specials, duplicates allowed', () => {
    expect(KIT_ABILITY_COPY.prophet).toMatch(/2 special/i);
    expect(KIT_ABILITY_COPY.prophet).toBe('Starts with 2 special cards drawn at random from the circulating special pool (duplicates allowed).');
  });

  it('names no excluded special while every special circulates (Invisibility is live again, L58-06)', () => {
    expect(CIRCULATING_SPECIAL_CARD_IDS).toContain('invisibility');
    expect(KIT_ABILITY_COPY.prophet).not.toMatch(/excluded/i);
  });
});
```

`screens/table/kit-inspect-dialog.test.ts`, line 75 only. Replace `expect(KIT_ABILITY_COPY.prophet).toMatch(/Invisibility excluded/i);` with `expect(KIT_ABILITY_COPY.prophet).toBe('Starts with 2 special cards drawn at random from the circulating special pool (duplicates allowed).');`. No other line in that file changes.

`ui/kit/kit-details.test.tsx`:
- Add `import { RANDOM_SPECIAL_CAPTION } from '../ui-copy';`.
- In `it.each(KIT_IDS)('renders versos, specials and trait cards as Card faces for %s')`, insert after the `kit.specialCards.forEach(…)` cost loop:

```ts
    const randomCount = kit.randomStartingSpecialCount ?? 0;
    const randomSlots = Array.from(specials.querySelectorAll<HTMLElement>('[data-random-special]'));
    expect(randomSlots).toHaveLength(randomCount);
    for (const slot of randomSlots) {
      expect(within(slot).getByRole('article', { name: HIDDEN_CARD_LABEL }).getAttribute('data-card-family')).toBe('special');
      expect(slot.textContent).toContain(RANDOM_SPECIAL_CAPTION);
    }
    // Fixed specials first, then the random ones (spec v7 §10.1, L76-03).
    expect(Array.from(specials.querySelectorAll('[data-special-key], [data-random-special]'), (node) => node.hasAttribute('data-random-special')))
      .toEqual([...kit.specialCards.map(() => false), ...Array.from({ length: randomCount }, () => true)]);
```

- In 'renders Gambler from KIT_CATALOG, never from the kit PNG (spec v7 §5.5)', add after the Roulette line:

```ts
    expect(within(specials).getAllByRole('article', { name: HIDDEN_CARD_LABEL })).toHaveLength(2);
    expect(within(specials).getAllByText(RANDOM_SPECIAL_CAPTION)).toHaveLength(2);
```

- Add to `describe('KitDetails spec values')` (1 test):

```tsx
  it("shows Prophet's two random starting specials as captioned hidden versos with no cost (spec v7 §10.1, L76-03)", () => {
    const { container } = renderUi(<KitDetails kitId="prophet" />);
    const specials = section(container, 'special-cards');
    expect(within(specials).getAllByRole('article', { name: HIDDEN_CARD_LABEL })).toHaveLength(2);
    expect(within(specials).getAllByText(RANDOM_SPECIAL_CAPTION)).toHaveLength(2);
    expect(specials.querySelector('[data-special-key]')).toBeNull();
    expect(specials.textContent).not.toMatch(/pts/);
    expect(section(container, 'ability').textContent).toContain('duplicates allowed');
  });
```

`ui/ui-copy.test.ts`: import `RANDOM_SPECIAL_CAPTION` and add:

```ts
  it('captions a random starting special "Random special" (spec v7 §10.1, L76-03)', () => {
    expect(RANDOM_SPECIAL_CAPTION).toBe('Random special');
  });
```

`packages/shared/src/release-notes.test.ts`, 'writes lot-72-v7 as the New look entry with the catalog-text fix (L72-13)': append to the `latest.items` `toEqual` array, after the last item:

```ts
      { before: 'Some help text about kits, Spy and starting an online game was out of date.', after: 'Fixed some bugs.' },
```

`apps/client/src/screens/whats-new-dialog.test.ts`: `expect(latestReleaseNote().items).toHaveLength(6);` → `toHaveLength(7)`. If a parallel lot has already appended, use the current count plus one. The new item is always the last one.

That is 12 new tests: 1 + 1 + 1 + 2 + 1 + 2 + 2 + 1 + 1.

- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/screens/how-to-play-content.test.ts apps/client/src/screens/kit-pick-copy.test.ts apps/client/src/screens/home/ apps/client/src/screens/lobby/lobby-screen.test.tsx apps/client/src/screens/lobby-kit-picker-dialog.test.tsx apps/client/src/view-model/kit-inspect-traits.test.ts apps/client/src/screens/table/kit-inspect-dialog.test.ts apps/client/src/ui/kit/kit-details.test.tsx apps/client/src/ui/ui-copy.test.ts apps/client/src/screens/whats-new-dialog.test.ts packages/shared/src/release-notes.test.ts`. Expected failures:
  - Missing modules: `kit-pick-copy.test.ts`, `home-copy.test.ts`, `home-screen.test.tsx`, `lobby-screen.test.tsx`, `lobby-kit-picker-dialog.test.tsx` and `how-to-play-content.test.ts` fail to resolve `kit-pick-copy` / `home-copy`.
  - Missing export: `kit-details.test.tsx` and `ui-copy.test.ts` fail on the missing `RANDOM_SPECIAL_CAPTION` export.
  - Old copy: `kit-inspect-traits.test.ts` and `kit-inspect-dialog.test.ts` fail on the Invisibility copy.
  - Item count: `release-notes.test.ts` and `whats-new-dialog.test.ts` fail on the item count.

- [ ] **Step 3: Implement.**
  - **`screens/kit-pick-copy.ts`** (new): the four constants of Interfaces, with a doc comment citing spec v7 §10.1 (Q11 = B). The comment says: since Lot 69 a basic Spy shows resources only and the kit needs an upgraded Spy, Spy Thief or elimination; since Lot 70 the host may exclude kits; the How to play Kits body repeats `KIT_PRIVACY_COPY` verbatim, and `how-to-play-content.test.ts` pins that.
  - **`screens/home/home-copy.ts`** (new): `ONLINE_CREATE_HELPER`, doc comment `Home strings that tests import (Lot 76 plan Appendix A.6). Online Create helper: guests press Ready (L57-11), spec v7 §10.1.`
  - **`screens/how-to-play-content.ts`.** The doc comment adds `; Kits follows technical spec v7 §10.1 (L76-03)`. The `kits` body becomes exactly this literal, without composing the constant, so the primer reads as one paragraph:
    `Each player has a kit. It sets starting lives, points, upgrade points, and Draw, how many random action and attack cards you begin with, which special cards you hold, and sometimes a kit ability. Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated. A basic Spy shows only your resources. In the lobby you may pick any kit the host has not excluded, or keep Random; if the host deals kits at random, nobody picks. Gambler Draw is 5–100 (weighted; each extra point is rarer) each turn; the kit starts with 3 specials; each Draw has a 1-in-10 chance to drop you to 1 life and lose everything (you are not eliminated).`
    Keep the en dash in `5–100`.
  - **`screens/home/online-path.tsx`:** the Create helper `<p>` renders `{ONLINE_CREATE_HELPER}` (import `./home-copy`), with the same element and classes.
  - **`screens/home/solo-path.tsx`:** the kit block's `<p>` renders `{KIT_PICKER_LEAD}` (import `../kit-pick-copy`).
  - **`screens/lobby/lobby-screen.tsx`:** the Your kit `<p className="mt-1 text-sm text-ink-muted">` renders `{KIT_PRIVACY_COPY}` (import `../kit-pick-copy`). No other lobby change.
  - **`screens/lobby-kit-picker-dialog.tsx`** (import `./kit-pick-copy`):
    - The `KitGrid` lead `<p>` renders `{KIT_PICKER_LEAD}`.
    - `RandomKitDetails` keeps its wrapper and classes: `<p>{RANDOM_KIT_ASSIGN_COPY}</p><p className="text-ink-muted">{RANDOM_KIT_PRIVACY_COPY}</p>`.
    - The doc comment cites spec v7 §10.1 (L76-03). L76-10 moves `RandomKitDetails` verbatim.
  - **`view-model/kit-inspect-traits.ts`:** `prophet: 'Starts with 2 special cards drawn at random from the circulating special pool (duplicates allowed).'` (spec v7 §10.1 verbatim).
  - **`ui/ui-copy.ts`:**
    - Append `/** A random starting special's caption under its hidden verso in KitDetails (spec v7 §10.1, §10.6; backlog L76-03 watch point). */ export const RANDOM_SPECIAL_CAPTION = 'Random special';`.
    - The header comment's list of appenders gains `L76-03 appends \`RANDOM_SPECIAL_CAPTION\``.
  - **`ui/kit/kit-details.tsx`:**
    - Read `const randomSpecialCount = kit.randomStartingSpecialCount ?? 0;`.
    - The `special-cards` group renders its `<ul>` when `kit.specialCards.length + randomSpecialCount > 0`. The fixed specials come first, unchanged; then:
      ```tsx
      {Array.from({ length: randomSpecialCount }, (_, index) => (
        <li key={`random-special:${String(index)}`} data-random-special={index} className="flex w-20 flex-col items-start gap-1">
          <Card face="hidden" family="special" size="thumb" />
          <span data-card-caption className={`${CAPTION_CLASS} text-left`}>{RANDOM_SPECIAL_CAPTION}</span>
        </li>
      ))}
      ```
    - No cost: the drawn card is unknown. The hidden verso has no `onActivate`, so it stays an `article` named 'Hidden card', with the gold special rim. The details still contain no button.
    - The header comment gains a **Random specials** bullet (spec v7 §10.1, L76-03). "All visible copy is the V6 copy, verbatim" becomes "…verbatim, plus the L76-03 random-special caption".
  - **`packages/shared/src/release-notes.ts`:** append `{ before: 'Some help text about kits, Spy and starting an online game was out of date.', after: 'Fixed some bugs.' }` as the last item of `lot-72-v7` (§10.4: never a new id while `lot-72-v7` is open).

- [ ] **Step 4: Run them and see them pass.**
  - Run the Step 2 command, plus `apps/client/src/ui/kit/ apps/client/src/screens/arena/kit-sheet.test.tsx apps/client/src/ui/release-storage.test.ts`.
  - Expected:
    - the 12 new tests pass;
    - the extended `kit-details.test.tsx` cases pass for all 16 kits: Prophet 2 and Gambler 2 random slots, every other kit 0;
    - every pre-existing test in those files passes with no other assertion edited.
  - Then `git grep -nE "pick a kit or keep Random|until they Spy you|chance to eliminate you|until Spy or death|one of the 16 kits|until Spy, an equivalent|when everyone is seated|Invisibility excluded|Hidden from opponents|Opponents cannot see" -- 'apps/client/src' ':!*.test.ts' ':!*.test.tsx'` prints nothing. Prophet is included: the Review folds it into this task.

- [ ] **Step 5: Docs.**
  - **`docs/technical_spec_v6.md` §5.1**, the `kits` row (~line 258). Its "Must say" cell becomes `Superseded by \`docs/technical_spec_v7.md\` §10.1 (How to play "Kits", Q11 = B, L76-03); the live copy is \`apps/client/src/screens/how-to-play-content.ts\`.` Section id, title and screenshot cell stay.
  - **`docs/agent/decisions.md`**, appended at the end:

```
## YYYY-MM-DD · [P] The Lot 76 kit copy supersedes the v6 How to play Kits row (L76-03)

- **Supersedes** the `kits` row of `docs/technical_spec_v6.md` §5.1 on designer instruction 2026-10-20
  (technical spec v7 §10, Q11 = B). The row now points at v7 §10.1; the live copy is
  `apps/client/src/screens/how-to-play-content.ts`.
- **Changed** (v7 §10.1, the Lot 76 rows): How to play Kits, the lobby Your kit line, the Random kit
  preview, the Online Create helper and Prophet's ability. A kit now shows only to an upgraded Spy or
  Spy Thief, or once its player is eliminated, and a basic Spy shows only resources (Lot 69). Kits names
  host exclusions and dealt-at-random kits (Lot 70) and says a Gambler bust does not eliminate (Lot 66).
  The Create helper waits for every guest's Ready (L57). Prophet no longer says "Invisibility excluded":
  Invisibility circulates again (L58-06).
- **Also changed, outside §10.1:** the picker lead and the solo kit line, which predate Lot 69, take the
  same wording ("… Random is the default."). `KitDetails` shows Prophet's and Gambler's random starting
  specials as hidden special versos captioned "Random special" (backlog L76-03 watch point). Every
  string is listed in the PR for designer review (§10, §10.6).

---
```

  - **`DESIGN.md`:**
    - Kit › **Cards**: replace `An empty trait group says "None"; Prophet's empty special list stays empty (he starts with two random specials, told in Ability).` with `An empty trait group says "None". A kit with \`randomStartingSpecialCount\` (Prophet 2, Gambler 2) adds that many hidden special versos (\`Card face="hidden" family="special"\`, gold rim) after its fixed specials, each captioned \`RANDOM_SPECIAL_CAPTION\` "Random special", with no cost (L76-03, spec v7 §10.1).`
    - Kit › **Anchors**: add `` `data-random-special` `` after `` `data-special-key` ``.
    - Primitives › **Copy**: after `` `TABLE_RULES_LABEL` "Table rules" (L72-16) `` add `` , and `RANDOM_SPECIAL_CAPTION` "Random special" (L76-03) ``.
  - **`docs/agent/frontend.md`, Lot 76 section** (after the L76-02 bullets):

```
- `screens/how-to-play-content.ts`, `screens/kit-pick-copy.ts`, `screens/home/home-copy.ts`, `screens/lobby/lobby-screen.tsx`, `screens/lobby-kit-picker-dialog.tsx` (L76-03, spec v7 §10.1, Q11 = B): the Lot 76 stale copy rows. How to play Kits, the lobby Your kit line, the solo kit line and the picker lead read the Lot 69 rule (`KIT_PRIVACY_COPY`: a kit shows only to an upgraded Spy or Spy Thief, or once its player is eliminated; How to play adds that a basic Spy shows only resources). Kits also names host exclusions and dealt-at-random kits (Lot 70) and the Gambler bust that no longer eliminates (Lot 66). The Random kit preview says "one of the allowed kits", and the Online Create helper waits for every guest's Ready (`ONLINE_CREATE_HELPER`, L57). Strings used by several screens live in `screens/kit-pick-copy.ts`; Home strings that tests import live in `screens/home/home-copy.ts`. The v6 §5.1 `kits` row points at v7 §10.1.
- `ui/kit/kit-details.tsx`, `view-model/kit-inspect-traits.ts` (L76-03, spec v7 §10.1): a kit with `randomStartingSpecialCount` (Prophet 2, Gambler 2) shows that many hidden special versos (`data-random-special`) after its fixed specials, captioned `RANDOM_SPECIAL_CAPTION` "Random special", with no cost; the arena kit sheet and the picker inherit them. Prophet's ability drops "Invisibility excluded". `view-model/kit-inspect-traits.test.ts` holds that assertion beside the one line edited in `screens/table/kit-inspect-dialog.test.ts` (plan Appendix A.9 ruling 2).
```

  - **`docs/agent/frontend.md`, superseded lines:**
    - Kit section › Values: `` `KIT_ABILITY_COPY`, verbatim (the Prophet copy fix is L76's, spec v7 §10.1). `` → `` `KIT_ABILITY_COPY`, verbatim (Prophet's line follows spec v7 §10.1 since L76-03). ``.
    - Kit section › Anchors: `` `data-special-key` and `data-card-caption` inside `` → `` `data-special-key`, `data-random-special` and `data-card-caption` inside ``.
    - Kit section › Cards inside the details: after `the starting hand is two hidden thumbs.` add `Random starting specials are hidden special thumbs captioned "Random special" (L76-03).`
    - The What's new paragraph: after `Sixth item: … (Q63, L74-17, After \`Fixed some bugs.\`).` add `Seventh item: the Lot 76 copy fixes (How to play Kits, Your kit, the kit picker and its Random kit, the Online Create helper, Prophet's ability and the random-special versos; L76-03, After \`Fixed some bugs.\`).` If a parallel lot already added items, use the next ordinal.
  - **`docs/backlog_v7_test_classification.md`:**
    - The `whats-new-dialog.test.ts` › 'renders a New section …' [catalog assertions] row: `latestReleaseNote() has 0 additions and 1 item; lot-72 has 2 items;` → `latestReleaseNote() has 0 additions and 7 items; lot-72 has 3 items;`. Use the count you pinned. The companion [catalog] row of 'renders the current update alone …' holds no count and stays.
    - The Owner lot 72 `screens/table/kit-inspect-dialog.test.ts` › 'documents Ghost, Duplicator, Prophet and Gambler ability copy' row (doc line 49): append ` **L76-03:** the \`/Invisibility excluded/\` line now pins the spec v7 §10.1 Prophet copy with \`toBe\`, mirrored in \`view-model/kit-inspect-traits.test.ts\`.`
  - **`docs/backlog_v7.md`:**
    - L76-03 row: `| S | Low | L76-01, L76-02 | To do |` → `| S | Low | L76-01, L76-02 | Done |`.
    - Progress: `| 76 · Home and lobby | 18 | 2 |` → `| 76 · Home and lobby | 18 | 3 |`.
    - Total: add one to the Done cell it holds when you start.

- [ ] **Step 6: Verify and commit.**
  - `pnpm verify` green.
  - Stage by name:

```
git add apps/client/src/screens/kit-pick-copy.ts apps/client/src/screens/kit-pick-copy.test.ts apps/client/src/screens/home/home-copy.ts apps/client/src/screens/home/home-copy.test.ts apps/client/src/screens/how-to-play-content.ts apps/client/src/screens/how-to-play-content.test.ts apps/client/src/screens/home/online-path.tsx apps/client/src/screens/home/solo-path.tsx apps/client/src/screens/home/home-screen.test.tsx apps/client/src/screens/lobby/lobby-screen.tsx apps/client/src/screens/lobby/lobby-screen.test.tsx apps/client/src/screens/lobby-kit-picker-dialog.tsx apps/client/src/screens/lobby-kit-picker-dialog.test.tsx apps/client/src/view-model/kit-inspect-traits.ts apps/client/src/view-model/kit-inspect-traits.test.ts apps/client/src/screens/table/kit-inspect-dialog.test.ts apps/client/src/ui/kit/kit-details.tsx apps/client/src/ui/kit/kit-details.test.tsx apps/client/src/ui/ui-copy.ts apps/client/src/ui/ui-copy.test.ts apps/client/src/screens/whats-new-dialog.test.ts packages/shared/src/release-notes.ts packages/shared/src/release-notes.test.ts DESIGN.md docs/technical_spec_v6.md docs/agent/decisions.md docs/agent/frontend.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
```

  - Commit:

```
fix(copy): fix the Lot 76 stale copy rows (L76-03)

Applies the spec v7 §10.1 Lot 76 rows, Prophet included, and gives the
pre-Lot-69 picker lines the same wording. KitDetails shows random
starting specials as captioned hidden versos. Every string is listed
for designer review (§10). Supersedes the v6 §5.1 Kits row (Q11 = B).
```

**Acceptance map:**
- No 'Today' string of the Lot 76 §10.1 rows is left in `apps/client/src` (Prophet too, per the Review):
  - the Step 4 `git grep`;
  - the negative checks in 'states the Lot 69, Lot 70 and Lot 66 kit facts …', 'says on Your kit who can see your kit', 'says the Random kit comes from the allowed kits …', 'tells the host on Online to start once every guest is Ready' and 'names no excluded special while every special circulates …'.
- The How to play must-say facts still pass and the never-say list holds: the unchanged 'states every §5.1 must-say fact' and 'omits delayed resolution, shop-price formula, and draw-is-not-a-card', plus the new Kits test.
- The v6 §5.1 row and the decisions entry are written: Step 5.
- A What's new item with After `Fixed some bugs.` is appended to `lot-72-v7`, and the release-note tests are updated: 'writes lot-72-v7 as the New look entry …' (`toEqual` with the new last item) and `whats-new-dialog.test.ts` (item count).
- Watch point, random starting specials shown: "shows Prophet's two random starting specials as captioned hidden versos with no cost …", the extended 'renders versos, specials and trait cards as Card faces for %s' (16 kits) and the Gambler case.
- Review, the Prophet trait row: 'says Prophet starts with 2 random circulating specials, duplicates allowed' and the edited `kit-inspect-dialog.test.ts` line.
- `pnpm verify` green: Step 6.

**Decisions:**
- **New or changed strings** (all for designer review, §10, §10.6):
  - How to play Kits. Before: `…sometimes a kit ability. Opponents cannot see your kit until they Spy you, or until you are eliminated. In the lobby you may pick a kit or keep Random. Gambler Draw is 5–100 (weighted; each extra point is rarer) each turn; the kit starts with 3 specials; each Draw has a 1-in-10 chance to eliminate you.` After: the Step 3 paragraph.
  - Lobby Your kit. Before: `Hidden from opponents until Spy or death.` After: `Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated.`
  - Kit picker lead. Before: `Opponents cannot see your kit. Random is the default.` After: `Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated. Random is the default.`
  - Solo kit line. Before: `Hidden from opponents. Random is the default.` After: the same as the picker lead.
  - `RandomKitDetails`, first line. Before: `The server assigns one of the 16 kits at random when the game starts, the same way as before this picker existed.` After: `The server assigns one of the allowed kits at random when the game starts.`
  - `RandomKitDetails`, second line. Before: `Opponents cannot see which kit you received until Spy, an equivalent, or elimination.` After: `Opponents see which kit you received only with an upgraded Spy or Spy Thief, or once you are eliminated.`
  - Online Create helper. Before: `Host gets a code to share. Start from the lobby when everyone is seated.` After: `Host gets a code to share. Start from the lobby once every guest is Ready.`
  - Prophet ability. Before: `…circulating special pool (Invisibility excluded; duplicates allowed).` After: `Starts with 2 special cards drawn at random from the circulating special pool (duplicates allowed).`
  - New: `Random special` (the hidden verso caption).
  - New What's new item: Before `Some help text about kits, Spy and starting an online game was out of date.`, After `Fixed some bugs.`
- **Where the strings live:**
  - The Lot 69 sentence is needed by the lobby, the solo menu and the picker, and How to play repeats it, so it gets one shared screen module, `screens/kit-pick-copy.ts`. The How to play body stays a readable literal; a test ties it to the constant.
  - `ONLINE_CREATE_HELPER` goes in `screens/home/home-copy.ts`, because a `.tsx` cannot export a constant (react-refresh) and Appendix A.6 has tests import the constant.
  - Each copy module gets a one-test pin, after the `ui/ui-copy.test.ts` precedent, so a designer amendment changes one test.
- **The Your kit line takes only the first Lot 69 sentence.** The card is compact and is about the kit, not the resources. How to play, which teaches the rule, carries both sentences. Designer question.
- **The two pre-Lot-69 picker lines change** (Appendix A.6): "Opponents cannot see your kit" is false since Spy+ reveals it. "Random is the default." stays.
- **`RandomKitDetails` drops "the same way as before this picker existed"**, a history note that now misleads.
- **Random specials show after the fixed ones**, one caption per verso, with no cost and no button, using `data-random-special` (the slot index) as the anchor. The engine deals the random ones first and appends the fixed list; this is display order only (Appendix A.6). Designer question on the order.
- **The table test line pins the full spec sentence with `toBe`**, which is stronger than the old regex. The new view-model test adds the catalog fact that made the old copy wrong (Invisibility circulates).
- **The What's new item carries no `kitId`/`cardId`:** it spans several screens.
- **The parity appendix rows that quote the old copy** (`docs/technical_spec_v7_parity.md` around lines 910, 936, 987, 996, 1327, 1347 and 1358) stay as the audit record; the L76-18 sweep updates them.

---

---

### Task L76-09: Wire the rules strip and build the host editor

**Files:**
- Create:
  - `apps/client/src/ui/rules/rules-editor-model.ts`: the pure payload builders and clock labels (Appendix A.5, plus `turnTimeLabel` and `sliderReadout`).
  - `apps/client/src/ui/rules/rules-editor.tsx`: `RulesEditor` (exports the component and `RulesEditorProps` only).
  - `apps/client/src/ui/rules/rules.gallery-demos.tsx`: `RulesEditorDemo`, the stateful live-apply demo (a gallery file may hold no PascalCase component, so it is a components-only sibling, like `primitives-gallery-demos.tsx`; it does not match the `*.gallery.tsx` glob).
- Test (create): `apps/client/src/ui/rules/rules-editor-model.test.ts` (8, node), `apps/client/src/ui/rules/rules-editor.test.tsx` (8), `apps/client/src/screens/lobby/lobby-screen.rules.test.tsx` (5), `apps/client/src/screens/home/solo-path.rules.test.tsx` (5).
- Modify:
  - `apps/client/src/ui/ui-copy.ts` (+ `SERVER_DEFAULT_LABEL`, `LAST_ALLOWED_KIT_REASON`) and `ui-copy.test.ts` (+1).
  - `apps/client/src/ui/rules/rules-summary.ts`: `rulesSummaryText(rules, clock?)` takes an optional clock label (default unchanged), so the strip's spoken summary says "Server default" with it. `rules-summary.test.ts` +1.
  - `apps/client/src/ui/rules/rules-strip.tsx`, `rules-sheet.tsx`: the additive `editor?: RulesEditorBinding` prop; doc comments updated. `rules-strip.test.tsx` +3, `rules-sheet.test.tsx` +2.
  - `apps/client/src/ui/rules/rules.gallery.tsx` (+3 entries) and `rules.gallery.test.tsx` (1 id list extended, +2).
  - `apps/client/src/screens/lobby/lobby-screen.tsx`: `LobbyRulesPanel` → `RulesStrip`, editor for the host only.
  - `apps/client/src/screens/home/solo-rules-state.ts` (+ `applySoloRulesPayload`) and its node test `solo-rules-state.test.ts` (+5).
  - `apps/client/src/screens/home/solo-path.tsx`: `LobbyRulesPanel` → `RulesStrip` with the solo binding; `SoloPathProps` loses `onSoloRulesChange`, gains `rulesEditor`.
  - `apps/client/src/screens/home/home-screen.tsx`: builds the solo `RulesEditorBinding`.
  - `packages/shared/src/release-notes.ts` (+ the Lobby item), `packages/shared/src/release-notes.test.ts`, `apps/client/src/screens/whats-new-dialog.test.ts` (item count).
  - `DESIGN.md` (› Rules, › Primitives › Copy), `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md` (row 234 count).
- Delete: `apps/client/src/screens/lobby-rules-panel.tsx` (its two importers move here; no test reads it).
- Existing tests that must stay green unchanged: every existing `it` in `ui/rules/rules-strip.test.tsx` (including 'opens a read-only Table rules sheet with no editable control on tap' and 'is one dialog-opening button that takes the caller className'), `ui/rules/rules-sheet.test.tsx` (including 'has no editable control' and 'puts focus on Close when it opens'), `ui/rules/rules-summary.test.ts`, the three `it.each` cases of `rules.gallery.test.tsx`, `ui/primitives/slider.test.tsx`, `toggle.test.tsx`, `dev/ui-gallery.test.tsx`, `screens/arena/*` (the arena mounts `RulesSheet` with no editor), `screens/home/home-screen.test.tsx` and the existing `solo-rules-state.test.ts` cases (L76-01), `screens/lobby/lobby-screen.test.tsx` (L76-02), `screens/solo-menu-seed.test.ts`, `ui/release-storage.test.ts`.

**Interfaces:**
- Consumes:
  - Shared: `allowEveryKit`, `allowedKitIds`, `excludeEveryKitButFirst`, `isTurnTimeSeconds`, `toggleExcludedKit`, `defaultLobbyRules`, `getKit`, `KIT_IDS`, `MIN_TURN_TIME_SECONDS`, `MAX_TURN_TIME_SECONDS`, `latestReleaseNote`, types `KitId`, `LobbyRules`, `SetLobbyRulesPayload`, `SoloMenuSeed` (`../solo-menu-seed`).
  - ui: `Slider` (`../primitives/slider`), `Toggle` (`../primitives/toggle`), `Button` (`../primitives/button`), `Sheet` (already in `rules-sheet.tsx`), `Icon` (`../icons/icon`), `KitPortrait` (`../kit/kit-portrait`), `CHROME_SHAPE_SM_CLASS`, `CHROME_FOCUS_CLASS`, `CHROME_DISABLED_CLASS`, `BUTTON_VARIANT_CLASS`, `chromePressClass`, `motionAttribute` (`../primitives/chrome-classes`), `usePrefersReducedMotion` (`../motion/use-prefers-reduced-motion`), `rulesKitFaces`, `formatTurnTimeSeconds`, `rulesSummaryText` (`./rules-summary`), `EXCLUDED_LABEL`, `TABLE_RULES_LABEL` (`../ui-copy`), `HOW_TO_PLAY_SEEN_KEY` (`ui/help-storage`), `LAST_SEEN_RELEASE_ID_KEY` (`ui/release-storage`).
  - L76-01: `HomeScreen` (`screens/home/home-screen`), `SoloPath` / `SoloPathProps` (`screens/home/solo-path`, still with the V2 fields `soloRules`, `soloKitSelection`, `onSoloRulesChange`), `SoloRulesState`, `initialSoloRulesState`, `applySoloRulesChange`, `soloLaunchKitSelection` (`screens/home/solo-rules-state`), `makeHomeProps`, `expectNoHomeIntent` (`screens/home/test-home`). The state names below (`solo`, `setSolo`) are the ones Appendix A.5 uses; use whatever L76-01 called the `useState<SoloRulesState>` pair.
  - L76-02: `LobbyScreen` (`screens/lobby/lobby-screen`), `makeLobbyProps`, `hostLobbyView`, `guestLobbyView`, `walkInLobbyView`, `expectNoLobbyIntent` (`screens/lobby/test-lobby`).
- Produces:

```ts
// ui/ui-copy.ts (appended)
/** The solo clock before the slider is released once: the server keeps its own default (spec v7 §7.1, §10.6, Q3/Q31). */
export const SERVER_DEFAULT_LABEL = 'Server default';
/** Why the last allowed kit cannot be excluded: the `set-lobby-rules-no-kit` copy, reused (spec v7 §7.4, §11, Q39). */
export const LAST_ALLOWED_KIT_REASON = 'At least one kit must stay allowed.';

// ui/rules/rules-editor-model.ts — exactly Appendix A.5, plus two labels
export interface RulesEditorBinding {
  readonly onChange: (payload: SetLobbyRulesPayload) => void;
  readonly disabled?: boolean;
  readonly serverDefaultTime?: boolean;
}
export function sliderSeconds(rules: LobbyRules): number;
export function turnTimePayload(rules: LobbyRules, seconds: number): SetLobbyRulesPayload | null;
export function kitTogglePayload(rules: LobbyRules, kitId: KitId): SetLobbyRulesPayload | null;
export function allKitsPayload(rules: LobbyRules): SetLobbyRulesPayload;
export function noKitsPayload(rules: LobbyRules): SetLobbyRulesPayload;
export function randomOnlyPayload(rules: LobbyRules, randomOnly: boolean): SetLobbyRulesPayload;
export function isLastAllowedKit(rules: LobbyRules, kitId: KitId): boolean;
/** The strip's clock: SERVER_DEFAULT_LABEL while serverDefaultTime, else formatTurnTimeSeconds(rules.turnTimeSeconds) (never clamped). */
export function turnTimeLabel(rules: LobbyRules, serverDefaultTime: boolean): string;
/** The slider readout: SERVER_DEFAULT_LABEL while serverDefaultTime AND seconds === sliderSeconds(rules), else `${seconds}s`. */
export function sliderReadout(rules: LobbyRules, seconds: number, serverDefaultTime: boolean): string;

// ui/rules/rules-summary.ts (changed signature, default keeps every caller)
export function rulesSummaryText(rules: LobbyRules, clock?: string): string;   // clock defaults to formatTurnTimeSeconds(rules.turnTimeSeconds)

// ui/rules/rules-strip.tsx / rules-sheet.tsx (additive)
export interface RulesStripProps { rules: LobbyRules; className?: string; editor?: RulesEditorBinding; }
export interface RulesSheetProps { open: boolean; rules: LobbyRules; onClose: () => void; dataAttributes?: Readonly<Record<`data-${string}`, string>>; editor?: RulesEditorBinding; }

// ui/rules/rules-editor.tsx
export interface RulesEditorProps { rules: LobbyRules; editor: RulesEditorBinding; }
export function RulesEditor({ rules, editor }: RulesEditorProps): ReactElement;

// ui/rules/rules.gallery-demos.tsx
export interface RulesEditorDemoProps { readonly solo?: boolean; }
export function RulesEditorDemo({ solo }: RulesEditorDemoProps): ReactElement;

// screens/home/solo-rules-state.ts (Appendix A.2 addition)
export function applySoloRulesPayload(state: SoloRulesState, payload: SetLobbyRulesPayload): SoloRulesState;

// screens/home/solo-path.tsx — SoloPathProps: `onSoloRulesChange` removed, this added
rulesEditor: RulesEditorBinding;
```

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/ui/rules/rules-editor-model.test.ts` (8 tests, node):

```ts
/** Rules editor payloads (technical spec v7 §7.4, §13 Q3/Q4/Q18/Q31; Appendix A `lobby-rules-host-dialog`,
 * `lobby-rules-dialog-kit-guardrails`, `rules-turn-time-default-override`). L76-09. */
import { allowedKitIds, KIT_IDS, MAX_TURN_TIME_SECONDS, type KitId, type LobbyRules } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { SERVER_DEFAULT_LABEL } from '../ui-copy';
import {
  allKitsPayload, isLastAllowedKit, kitTogglePayload, noKitsPayload, randomOnlyPayload,
  sliderReadout, sliderSeconds, turnTimeLabel, turnTimePayload,
} from './rules-editor-model';

function rules(overrides: Partial<LobbyRules> = {}): LobbyRules {
  return { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60, ...overrides };
}
const allBut = (...kept: KitId[]): KitId[] => KIT_IDS.filter((kitId) => !kept.includes(kitId));

describe('rules editor model (L76-09)', () => {
  it('puts the slider on the received seconds in 5–180, and at 180 otherwise (300 → 180)', () => {
    expect([5, 45, 180].map((turnTimeSeconds) => sliderSeconds(rules({ turnTimeSeconds })))).toEqual([5, 45, 180]);
    expect([300, 4, 60.5].map((turnTimeSeconds) => sliderSeconds(rules({ turnTimeSeconds }))))
      .toEqual([MAX_TURN_TIME_SECONDS, MAX_TURN_TIME_SECONDS, MAX_TURN_TIME_SECONDS]);
  });

  it('builds the only payload with turnTimeSeconds, and none outside 5–180', () => {
    expect(turnTimePayload(rules({ excludedKitIds: ['ghost'], randomOnly: true }), 90))
      .toStrictEqual({ excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 90 });
    expect([4, 181, 12.5].map((seconds) => turnTimePayload(rules(), seconds))).toEqual([null, null, null]);
  });

  it('toggles one kit in KIT_IDS order, and gives null for the last allowed kit', () => {
    expect(kitTogglePayload(rules({ excludedKitIds: ['gambler'] }), 'untouchable'))
      .toStrictEqual({ excludedKitIds: ['untouchable', 'gambler'], randomOnly: false });
    expect(kitTogglePayload(rules({ excludedKitIds: ['ghost', 'gambler'], randomOnly: true }), 'ghost'))
      .toStrictEqual({ excludedKitIds: ['gambler'], randomOnly: true });
    expect(kitTogglePayload(rules({ excludedKitIds: allBut('wizard') }), 'wizard')).toBeNull();
  });

  it('All allows every kit; None keeps only KIT_IDS[0], even when another kit was the one kept', () => {
    expect(allKitsPayload(rules({ excludedKitIds: ['ghost'], randomOnly: true }))).toStrictEqual({ excludedKitIds: [], randomOnly: true });
    for (const shown of [rules(), rules({ excludedKitIds: allBut('wizard') })]) {
      const payload = noKitsPayload(shown);
      expect(allowedKitIds(payload)).toEqual([KIT_IDS[0]]);
      expect(payload).toStrictEqual({ excludedKitIds: KIT_IDS.slice(1), randomOnly: false });
    }
  });

  it('flips Random only and keeps the exclusions', () => {
    expect(randomOnlyPayload(rules({ excludedKitIds: ['ghost'] }), true)).toStrictEqual({ excludedKitIds: ['ghost'], randomOnly: true });
    expect(randomOnlyPayload(rules({ randomOnly: true }), false)).toStrictEqual({ excludedKitIds: [], randomOnly: false });
  });

  it('never puts turnTimeSeconds in a Kit, All, None or Random payload over a 300 s server default (Review Focus 2)', () => {
    const serverDefault = rules({ turnTimeSeconds: 300, excludedKitIds: ['ghost'] });
    const payloads = [
      kitTogglePayload(serverDefault, 'wizard'), allKitsPayload(serverDefault),
      noKitsPayload(serverDefault), randomOnlyPayload(serverDefault, true),
    ];
    for (const payload of payloads) {
      expect(payload).not.toBeNull();
      expect(payload).not.toHaveProperty('turnTimeSeconds');
    }
    expect(sliderSeconds(serverDefault)).toBe(180);
  });

  it('names the last allowed kit only', () => {
    const onlyWizard = rules({ excludedKitIds: allBut('wizard') });
    expect(isLastAllowedKit(onlyWizard, 'wizard')).toBe(true);
    expect(isLastAllowedKit(onlyWizard, 'ghost')).toBe(false);
    expect(isLastAllowedKit(rules({ excludedKitIds: allBut('wizard', 'ghost') }), 'wizard')).toBe(false);
  });

  it('reads Server default on the strip, and on the slider at its untouched value, while serverDefaultTime', () => {
    expect(turnTimeLabel(rules({ turnTimeSeconds: 300 }), false)).toBe('300s');
    expect(turnTimeLabel(rules(), true)).toBe(SERVER_DEFAULT_LABEL);
    expect(sliderReadout(rules(), 60, true)).toBe(SERVER_DEFAULT_LABEL);
    expect(sliderReadout(rules(), 90, true)).toBe('90s');
    expect(sliderReadout(rules(), 60, false)).toBe('60s');
    expect(sliderReadout(rules({ turnTimeSeconds: 300 }), 180, true)).toBe(SERVER_DEFAULT_LABEL);
  });
});
```

`apps/client/src/ui/rules/rules-editor.test.tsx` (8 tests). The slider is driven the way `slider.test.tsx` drives it (`fireEvent.pointerDown` / `input` / `pointerUp`; `keyDown` / `input` / `keyUp`):

```tsx
// @vitest-environment happy-dom
/** Host rules editor (technical spec v7 §7.4, §11, §13 Q3/Q4/Q8/Q18/Q31; Appendix A `lobby-rules-host-dialog`,
 * `lobby-rules-dialog-kit-guardrails`, `lobby-rules-dialog-live-apply`). L76-09. */
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getKit, KIT_IDS, type KitId, type LobbyRules, type SetLobbyRulesPayload } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { EXCLUDED_LABEL, LAST_ALLOWED_KIT_REASON, SERVER_DEFAULT_LABEL } from '../ui-copy';
import { RulesEditor } from './rules-editor';
import type { RulesEditorBinding } from './rules-editor-model';

function rules(overrides: Partial<LobbyRules> = {}): LobbyRules {
  return { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60, ...overrides };
}
function setup(shown: LobbyRules = rules(), binding: Omit<RulesEditorBinding, 'onChange'> = {}) {
  const onChange = vi.fn<(payload: SetLobbyRulesPayload) => void>();
  const editor: RulesEditorBinding = { ...binding, onChange };
  const result = renderUi(<RulesEditor rules={shown} editor={editor} />);
  return { ...result, editor, onChange, slider: screen.getByRole('slider', { name: 'Human turn' }) };
}
const valueOf = (element: HTMLElement): string => (element instanceof HTMLInputElement ? element.value : '');
const follows = (a: HTMLElement, b: HTMLElement): boolean => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('RulesEditor (L76-09)', () => {
  it('puts the slider first, then All, None and Random, then the kit toggles (decisions 2026-10-06)', () => {
    const { slider } = setup();
    const [all, none, random] = ['All', 'None', 'Random'].map((name) => screen.getByRole('button', { name }));
    const firstKit = screen.getByRole('button', { name: getKit(KIT_IDS[0]).name });
    if (all === undefined || none === undefined || random === undefined) throw new Error('missing control');
    expect([follows(slider, all), follows(all, none), follows(none, random), follows(random, firstKit)]).toEqual([true, true, true, true]);
  });

  it('a drag sends one payload on release, with turnTimeSeconds (Q4/Q18)', () => {
    const { slider, onChange } = setup(rules({ excludedKitIds: ['ghost'] }));
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    fireEvent.input(slider, { target: { value: '120' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    expect(onChange.mock.calls).toStrictEqual([[{ excludedKitIds: ['ghost'], randomOnly: false, turnTimeSeconds: 120 }]]);
  });

  it('a held arrow key sends one payload, on key release', () => {
    const { slider, onChange } = setup();
    for (const value of ['61', '62']) {
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      fireEvent.input(slider, { target: { value } });
    }
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    expect(onChange.mock.calls).toStrictEqual([[{ excludedKitIds: [], randomOnly: false, turnTimeSeconds: 62 }]]);
  });

  it('over a 300 s server default the slider sits at 180, and Kit, All, None and Random send no turnTimeSeconds (Review Focus 2)', async () => {
    const { user, slider, onChange } = setup(rules({ turnTimeSeconds: 300, excludedKitIds: ['ghost'] }));
    expect([valueOf(slider), slider.getAttribute('aria-valuetext')]).toEqual(['180', '180s']);
    for (const name of ['Wizard', 'All', 'None', 'Random']) await user.click(screen.getByRole('button', { name }));
    expect(onChange.mock.calls.map(([payload]) => payload)).toStrictEqual([
      { excludedKitIds: ['wizard', 'ghost'], randomOnly: false },
      { excludedKitIds: [], randomOnly: false },
      { excludedKitIds: KIT_IDS.slice(1), randomOnly: false },
      { excludedKitIds: ['ghost'], randomOnly: true },
    ]);
  });

  it('lists the 16 kits in KIT_IDS order as toggles: aria-pressed = allowed, and an excluded kit says Excluded', () => {
    const excludedKitIds: readonly KitId[] = ['kamikaze', 'ghost'];
    setup(rules({ excludedKitIds }));
    const items = [...document.querySelectorAll<HTMLElement>('[data-rules-editor] [data-kit-id]')];
    expect(items.map((item) => item.getAttribute('data-kit-id'))).toEqual([...KIT_IDS]);
    for (const kitId of KIT_IDS) {
      const toggle = screen.getByRole('button', { name: getKit(kitId).name });
      const excluded = excludedKitIds.includes(kitId);
      expect(toggle.getAttribute('aria-pressed'), kitId).toBe(excluded ? 'false' : 'true');
      expect(within(toggle).queryByText(EXCLUDED_LABEL) !== null, kitId).toBe(excluded);
    }
  });

  it('locks the last allowed kit with its visible reason; pressing it sends nothing', async () => {
    const { user, onChange, editor, rerender } = setup(rules({ excludedKitIds: KIT_IDS.filter((kitId) => kitId !== 'wizard') }));
    const wizard = screen.getByRole('button', { name: 'Wizard', description: LAST_ALLOWED_KIT_REASON });
    expect([wizard.getAttribute('aria-disabled'), wizard.getAttribute('aria-pressed')]).toEqual(['true', 'true']);
    expect(screen.getByText(LAST_ALLOWED_KIT_REASON)).toBeTruthy();
    await user.click(wizard);
    expect(onChange).not.toHaveBeenCalled();
    rerender(<RulesEditor rules={rules({ excludedKitIds: KIT_IDS.filter((kitId) => kitId !== 'wizard' && kitId !== 'ghost') })} editor={editor} />);
    expect(screen.queryByText(LAST_ALLOWED_KIT_REASON)).toBeNull();
    expect(screen.getByRole('button', { name: 'Wizard' }).hasAttribute('aria-disabled')).toBe(false);
  });

  it('disables every control while the editor is disabled (solo launch Q8; reconnecting)', async () => {
    const { user, slider, onChange } = setup(rules(), { disabled: true });
    expect(slider.hasAttribute('disabled')).toBe(true);
    for (const name of ['All', 'None', 'Random', ...KIT_IDS.map((kitId) => getKit(kitId).name)]) {
      expect(screen.getByRole('button', { name }).hasAttribute('disabled'), name).toBe(true);
    }
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads Server default at the untouched value while serverDefaultTime, and the seconds while moved (Q3/Q31)', () => {
    const { slider } = setup(rules(), { serverDefaultTime: true });
    expect(slider.getAttribute('aria-valuetext')).toBe(SERVER_DEFAULT_LABEL);
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    expect(slider.getAttribute('aria-valuetext')).toBe('90s');
    fireEvent.input(slider, { target: { value: '60' } });
    expect(slider.getAttribute('aria-valuetext')).toBe(SERVER_DEFAULT_LABEL);
  });
});
```

Append to `apps/client/src/ui/rules/rules-sheet.test.tsx` (2 tests; add `KIT_IDS` is already imported):

```tsx
describe('RulesSheet with an editor (L76-09, spec v7 §7.4)', () => {
  it('holds the host editor under the same title, with Close as its only action', () => {
    renderUi(<RulesSheet open rules={rules()} onClose={vi.fn()} editor={{ onChange: vi.fn() }} />);
    const sheet = screen.getByRole('dialog', { name: 'Table rules' });
    expect(within(sheet).getByRole('slider', { name: 'Human turn' })).toBeTruthy();
    expect(within(sheet).getAllByRole('button', { pressed: true })).toHaveLength(KIT_IDS.length);
    const actions = sheet.querySelector<HTMLElement>('[data-zone="sheet-actions"]');
    if (actions === null) throw new Error('no actions row');
    expect(within(actions).getAllByRole('button').map((button) => button.textContent.trim())).toEqual(['Close']);
  });

  it('closes on Escape and on Close, and closing sends nothing', async () => {
    const onClose = vi.fn();
    const onChange = vi.fn();
    const { user } = renderUi(<RulesSheet open rules={rules()} onClose={onClose} editor={{ onChange }} />);
    await user.keyboard('{Escape}');
    await user.click(within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

Append to `apps/client/src/ui/rules/rules-strip.test.tsx` (3 tests; add `vi` to the vitest import):

```tsx
describe('RulesStrip with an editor (L76-09)', () => {
  it('opens the editor in the Table rules sheet; opening and closing send nothing', async () => {
    const onChange = vi.fn();
    const { user } = renderUi(<RulesStrip rules={rules()} editor={{ onChange }} />);
    await user.click(strip());
    expect(within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('slider', { name: 'Human turn' })).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reads Server default on the strip and in its summary while serverDefaultTime (Q3/Q31)', () => {
    renderUi(<RulesStrip rules={rules({ randomOnly: true })} editor={{ onChange: vi.fn(), serverDefaultTime: true }} />);
    expect(within(strip()).getByText('Server default')).toBeTruthy();
    expect(within(strip()).queryByText('60s')).toBeNull();
    expect(screen.getByRole('button', { name: 'Table rules', description: 'Server default, Random' })).toBe(strip());
  });

  it('shows a 300 s server default as received while the editor slider sits at 180 (Review Focus 2)', async () => {
    const { user } = renderUi(<RulesStrip rules={rules({ turnTimeSeconds: 300 })} editor={{ onChange: vi.fn() }} />);
    expect(within(strip()).getByText('300s')).toBeTruthy();
    await user.click(strip());
    const slider = within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('slider', { name: 'Human turn' });
    expect(slider instanceof HTMLInputElement ? slider.value : '').toBe('180');
  });
});
```

Append to `apps/client/src/ui/rules/rules-summary.test.ts` (1 test, inside `describe('rulesSummaryText')`):

```ts
  it('takes the strip clock label in place of the seconds (L76-09, Server default)', () => {
    expect(rulesSummaryText({ excludedKitIds: ['ghost'], randomOnly: false, turnTimeSeconds: 60 }, 'Server default'))
      .toBe('Server default, Excluded Ghost');
  });
```

`apps/client/src/ui/rules/rules.gallery.test.tsx`: retitle and extend the id test (its assertion grows, it does not weaken), and add 2 tests (add `fireEvent` to the testing-library import and an `entryById` helper that finds or throws, as the `it.each` already does inline):

```tsx
  it('registers the rules section with its strips and editor demos', () => {
    expect(gallery.id).toBe('rules');
    expect(gallery.entries.map((entry) => entry.id)).toEqual([
      'default', 'random-only', 'server-default', 'one-allowed', 'host-editor', 'solo-server-default', 'editor-disabled',
    ]);
  });

  it('applies a host edit live in the host-editor entry', async () => {
    const { user } = renderUi(<>{entryById('host-editor').render()}</>);
    await user.click(screen.getByRole('button', { name: 'Table rules' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('button', { name: 'Ghost' }));
    expect(within(screen.getByRole('button', { name: 'Table rules' })).getAllByText('Excluded')).toHaveLength(1);
  });

  it('reads Server default in the solo entry until a slider release', async () => {
    const { user } = renderUi(<>{entryById('solo-server-default').render()}</>);
    const strip = (): HTMLElement => screen.getByRole('button', { name: 'Table rules' });
    expect(within(strip()).getByText('Server default')).toBeTruthy();
    await user.click(strip());
    const slider = within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('slider', { name: 'Human turn' });
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    fireEvent.pointerUp(slider);
    expect(within(strip()).getByText('90s')).toBeTruthy();
  });
```

Append to `apps/client/src/ui/ui-copy.test.ts` (1 test; import the two constants):

```ts
  it('names the untouched solo clock and the last-kit lock (L76-09, spec v7 §7.1, §7.4)', () => {
    expect(SERVER_DEFAULT_LABEL).toBe('Server default');
    expect(LAST_ALLOWED_KIT_REASON).toBe('At least one kit must stay allowed.');
  });
```

Append to `apps/client/src/screens/home/solo-rules-state.test.ts` (L76-01's node test for this module; 5 tests). Extend its import to `applySoloRulesChange, applySoloRulesPayload, initialSoloRulesState, soloLaunchKitSelection, type SoloRulesState` (keep only the names the file uses):

```ts
describe('applySoloRulesPayload (L76-09)', () => {
  const fresh = initialSoloRulesState(undefined);

  it('a kit or Random payload keeps the clock and leaves includeTurnTime false', () => {
    expect(applySoloRulesPayload(fresh, { excludedKitIds: ['ghost'], randomOnly: true })).toEqual({
      rules: { excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 60 }, includeTurnTime: false, kitSelection: 'random',
    });
  });

  it('a slider payload sets the seconds and includeTurnTime', () => {
    expect(applySoloRulesPayload(fresh, { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 90 })).toEqual({
      rules: { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 90 }, includeTurnTime: true, kitSelection: 'random',
    });
  });

  it('resets an excluded local pick to Random and keeps an allowed one', () => {
    const picked: SoloRulesState = { ...fresh, kitSelection: 'assassin' };
    expect(applySoloRulesPayload(picked, { excludedKitIds: ['assassin'], randomOnly: false }).kitSelection).toBe('random');
    expect(applySoloRulesPayload(picked, { excludedKitIds: ['ghost'], randomOnly: false }).kitSelection).toBe('assassin');
  });

  it('Random only hides the pick but keeps it, and the launch sends random', () => {
    const next = applySoloRulesPayload({ ...fresh, kitSelection: 'assassin' }, { excludedKitIds: [], randomOnly: true });
    expect([next.kitSelection, soloLaunchKitSelection(next)]).toEqual(['assassin', 'random']);
  });

  it('a seeded clock above 180 stays the server default through kit edits', () => {
    const seeded = initialSoloRulesState({
      opponentCount: 2, difficulty: 'hard', kitSelection: 'wizard',
      lobbyRules: { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 300 },
    });
    const next = applySoloRulesPayload(seeded, { excludedKitIds: ['ghost'], randomOnly: false });
    expect([next.rules.turnTimeSeconds, next.includeTurnTime]).toEqual([300, false]);
  });
});
```

`apps/client/src/screens/lobby/lobby-screen.rules.test.tsx` (5 tests):

```tsx
// @vitest-environment happy-dom
/** Lobby rules strip and host editor (technical spec v7 §7.2, §7.4, Q15; Appendix A `lobby-rules-summary`,
 * `lobby-rules-host-dialog`, `lobby-rules-dialog-live-apply`, `rules-turn-time-default-override`). L76-09. */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getKit, KIT_IDS, type KitId, type LobbyRules } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { EXCLUDED_LABEL } from '../../ui/ui-copy';
import { LobbyScreen } from './lobby-screen';
import { expectNoLobbyIntent, guestLobbyView, hostLobbyView, makeLobbyProps, walkInLobbyView } from './test-lobby';

const RULES: LobbyRules = { excludedKitIds: [], randomOnly: false, turnTimeSeconds: 60 };
const strip = (): HTMLElement => screen.getByRole('button', { name: 'Table rules' });
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Table rules' });

describe('lobby table rules (L76-09)', () => {
  it('host, over a 300 s server default: the strip reads 300s, the slider sits at 180, and Kit, All, None and Random send no turnTimeSeconds (Review Focus 2)', async () => {
    const props = makeLobbyProps({ view: hostLobbyView({ lobbyRules: { ...RULES, turnTimeSeconds: 300 } }) });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    expect(within(strip()).getByText('300s')).toBeTruthy();
    await user.click(strip());
    expectNoLobbyIntent(props);
    const slider = within(sheet()).getByRole('slider', { name: 'Human turn' });
    expect(slider instanceof HTMLInputElement ? slider.value : '').toBe('180');
    for (const name of ['Ghost', 'All', 'None', 'Random']) await user.click(within(sheet()).getByRole('button', { name }));
    const payloads = vi.mocked(props.onSetLobbyRules).mock.calls.map(([payload]) => payload);
    expect(payloads).toStrictEqual([
      { excludedKitIds: ['ghost'], randomOnly: false },
      { excludedKitIds: [], randomOnly: false },
      { excludedKitIds: KIT_IDS.slice(1), randomOnly: false },
      { excludedKitIds: [], randomOnly: true },
    ]);
    for (const payload of payloads) expect(payload).not.toHaveProperty('turnTimeSeconds');
  });

  it('host: a drag sends one setLobbyRules on release, with turnTimeSeconds', async () => {
    const props = makeLobbyProps({ view: hostLobbyView({ lobbyRules: { ...RULES, excludedKitIds: ['ghost'], randomOnly: true } }) });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(strip());
    const slider = within(sheet()).getByRole('slider', { name: 'Human turn' });
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    fireEvent.input(slider, { target: { value: '120' } });
    expect(props.onSetLobbyRules).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    expect(vi.mocked(props.onSetLobbyRules).mock.calls).toStrictEqual([[{ excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 120 }]]);
  });

  it.each([
    { who: 'a seated guest', view: guestLobbyView({ lobbyRules: { excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 45 } }) },
    { who: 'a walk-in', view: walkInLobbyView({ lobbyRules: { excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 45 } }) },
  ])('$who taps the strip for the read-only sheet: no editable control, Close only, nothing sent (Q15)', async ({ view }) => {
    const props = makeLobbyProps({ view });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(strip());
    expect(within(sheet()).getByText('45s')).toBeTruthy();
    expect(within(sheet()).queryAllByRole('slider')).toHaveLength(0);
    expect(sheet().querySelectorAll('input, select, textarea, [contenteditable], [aria-pressed]')).toHaveLength(0);
    expect(within(sheet()).getAllByRole('button').map((button) => button.textContent.trim())).toEqual(['Close']);
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Table rules' })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });

  it('every face on the strip has its kit-name alt, and every excluded face says Excluded', () => {
    const excludedKitIds: readonly KitId[] = ['assassin', 'gambler'];
    renderUi(<LobbyScreen {...makeLobbyProps({ view: guestLobbyView({ lobbyRules: { ...RULES, excludedKitIds } }) })} />);
    for (const kitId of KIT_IDS) {
      const face = strip().querySelector<HTMLElement>(`[data-kit-id="${kitId}"]`);
      if (face === null) throw new Error(`no face for ${kitId}`);
      expect(within(face).getByAltText(getKit(kitId).name)).toBeTruthy();
      expect(within(face).queryByText(EXCLUDED_LABEL) !== null, kitId).toBe(excludedKitIds.includes(kitId));
    }
  });
});
```

`apps/client/src/screens/home/solo-path.rules.test.tsx` (5 tests):

```tsx
// @vitest-environment happy-dom
/** Solo table rules (technical spec v7 §7.1, §7.4, §13 Q3/Q31, Q8; Appendix A `home-solo-table-rules`,
 * `solo-menu-rules`, `solo-menu-rules-side-effects`, `rules-turn-time-default-override`). L76-09. */
import { defaultLobbyRules, latestReleaseNote } from '@card-battle/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { HOW_TO_PLAY_SEEN_KEY } from '../../ui/help-storage';
import { LAST_SEEN_RELEASE_ID_KEY } from '../../ui/release-storage';
import { SERVER_DEFAULT_LABEL } from '../../ui/ui-copy';
import { HomeScreen } from './home-screen';
import { expectNoHomeIntent, makeHomeProps } from './test-home';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');                         // no soft gate on Play solo
  localStorage.setItem(LAST_SEEN_RELEASE_ID_KEY, latestReleaseNote().id);  // no What's new auto-open
});

async function openSolo(props = makeHomeProps({ nickname: 'Ada' })) {
  const result = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
  await result.user.click(screen.getByRole('button', { name: 'Play solo' }));
  return { ...result, props };
}
const strip = (): HTMLElement => screen.getByRole('button', { name: 'Table rules' });
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Table rules' });
async function closeSheet(user: UserEvent): Promise<void> {
  await user.keyboard('{Escape}');
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: 'Table rules' })).toBeNull();
  });
}

describe('solo table rules (L76-09)', () => {
  it('an untouched solo menu reads Server default and launches with includeTurnTime false', async () => {
    const { user, props } = await openSolo();
    expect(within(strip()).getByText(SERVER_DEFAULT_LABEL)).toBeTruthy();
    await user.click(strip());
    expect(within(sheet()).getByRole('slider', { name: 'Human turn' }).getAttribute('aria-valuetext')).toBe(SERVER_DEFAULT_LABEL);
    await closeSheet(user);
    expectNoHomeIntent(props);
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('kit and Random edits apply locally and keep includeTurnTime false', async () => {
    const { user, props } = await openSolo();
    await user.click(strip());
    await user.click(within(sheet()).getByRole('button', { name: 'Ghost' }));
    await user.click(within(sheet()).getByRole('button', { name: 'Random' }));
    expect(within(sheet()).getByRole('button', { name: 'Ghost' }).getAttribute('aria-pressed')).toBe('false');
    await closeSheet(user);
    expect(within(strip()).getByText(SERVER_DEFAULT_LABEL)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', {
      lobbyRules: { excludedKitIds: ['ghost'], randomOnly: true, turnTimeSeconds: 60 }, includeTurnTime: false,
    });
  });

  it('only a slider release flips includeTurnTime: the strip then shows the seconds and the launch sends them', async () => {
    const { user, props } = await openSolo();
    await user.click(strip());
    const slider = within(sheet()).getByRole('slider', { name: 'Human turn' });
    fireEvent.pointerDown(slider);
    fireEvent.input(slider, { target: { value: '90' } });
    expect(within(strip()).getByText(SERVER_DEFAULT_LABEL)).toBeTruthy();
    fireEvent.pointerUp(slider);
    expect(within(strip()).getByText('90s')).toBeTruthy();
    await closeSheet(user);
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', {
      lobbyRules: { ...defaultLobbyRules(), turnTimeSeconds: 90 }, includeTurnTime: true,
    });
  });

  it('excluding the local pick resets it to Random', async () => {
    const props = makeHomeProps({
      nickname: 'Ada',
      soloMenuSeed: { opponentCount: 1, difficulty: 'normal', kitSelection: 'assassin', lobbyRules: defaultLobbyRules() },
    });
    const { user } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    expect(screen.getByText('Assassin')).toBeTruthy();
    await user.click(strip());
    await user.click(within(sheet()).getByRole('button', { name: 'Assassin' }));
    await closeSheet(user);
    expect(screen.getByText('Random kit')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', {
      lobbyRules: { excludedKitIds: ['assassin'], randomOnly: false, turnTimeSeconds: 60 }, includeTurnTime: true,
    });
  });

  it('disables the editor during a solo launch while the strip still opens (Q8)', async () => {
    const { user, props, rerender } = await openSolo();
    rerender(<HomeScreen {...props} soloLaunchPending />);
    await user.click(strip());
    expect(within(sheet()).getByRole('slider', { name: 'Human turn' }).hasAttribute('disabled')).toBe(true);
    for (const name of ['All', 'None', 'Random', 'Ghost']) {
      expect(within(sheet()).getByRole('button', { name }).hasAttribute('disabled'), name).toBe(true);
    }
    expectNoHomeIntent(props);
  });
});
```

That is 8 + 8 + 2 + 3 + 1 + 2 + 1 + 5 + 5 + 5 = 40 new tests (one gallery `it` retitled and extended).

- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/ui/rules apps/client/src/ui/ui-copy.test.ts apps/client/src/screens/home apps/client/src/screens/lobby/lobby-screen.rules.test.tsx`. Expected:
  - `rules-editor-model.test.ts` and `rules-editor.test.tsx` fail to resolve `./rules-editor-model` / `./rules-editor`.
  - `ui-copy.test.ts`: the two constants are `undefined`.
  - The strip and sheet editor tests fail: the unknown `editor` prop is ignored at runtime, so the sheet has no slider and the strip reads `60s`; the summary test gets `'60s, Excluded Ghost'`.
  - The gallery id test lacks the three new ids; the two new gallery tests throw "No host-editor entry".
  - `solo-rules-state.test.ts`: `applySoloRulesPayload` is not a function.
  - The lobby tests: a guest and a walk-in have no "Table rules" button (the V2 gear is host-only); the host's V2 slider is named "Human turn seconds", not "Human turn", and it sends per input event.
  - The solo tests: the V2 panel prints `60s`, never "Server default", and its slider name differs.

- [ ] **Step 3: Implement.**
  - **`ui/ui-copy.ts`:** append `SERVER_DEFAULT_LABEL` and `LAST_ALLOWED_KIT_REASON` with the doc comments in Interfaces, and extend the file's header line ("L76-09 appends `SERVER_DEFAULT_LABEL` and `LAST_ALLOWED_KIT_REASON`").
  - **`ui/rules/rules-editor-model.ts`** (pure, no React; doc comment cites spec v7 §7.4, Q3/Q4/Q18/Q31 and map-lobby gotcha 15: a payload with `turnTimeSeconds` overrides the server clock for the life of the room):
    - `sliderSeconds`: `isTurnTimeSeconds(rules.turnTimeSeconds) ? rules.turnTimeSeconds : MAX_TURN_TIME_SECONDS`.
    - `turnTimePayload`: `isTurnTimeSeconds(seconds) ? { excludedKitIds: rules.excludedKitIds, randomOnly: rules.randomOnly, turnTimeSeconds: seconds } : null`.
    - `kitTogglePayload`: `toggleExcludedKit(rules, kitId)`, `null` stays `null`, else `{ excludedKitIds: next.excludedKitIds, randomOnly: next.randomOnly }`.
    - `allKitsPayload` / `noKitsPayload`: `allowEveryKit(rules)` / `excludeEveryKitButFirst(rules)` reduced to `{ excludedKitIds, randomOnly }`.
    - `randomOnlyPayload`: `{ excludedKitIds: rules.excludedKitIds, randomOnly }`.
    - Kit, Random, All and None build a two-key object literal, never a spread of `rules` (that would carry `turnTimeSeconds`).
    - `isLastAllowedKit`: `!rules.excludedKitIds.includes(kitId) && allowedKitIds(rules).length === 1`.
    - `turnTimeLabel` and `sliderReadout` as in Interfaces (`formatTurnTimeSeconds` from `./rules-summary`, `SERVER_DEFAULT_LABEL` from `../ui-copy`).
  - **`ui/rules/rules-summary.ts`:** `rulesSummaryText(rules: LobbyRules, clock: string = formatTurnTimeSeconds(rules.turnTimeSeconds))`; the first part is `clock`. Doc comment: the strip passes its clock label, so "Server default" is spoken as shown.
  - **`ui/rules/rules-editor.tsx`** (`RulesEditor`; doc comment cites spec v7 §7.4, §11, Q3/Q4/Q8/Q18/Q31 and the Appendix A rows above). Root `<div data-rules-editor className="flex flex-col gap-4">`, in this order:
    1. A row `flex items-start gap-2`: `<Icon name="clock" size={24} />` (decorative), then `<Slider label="Human turn" min={MIN_TURN_TIME_SECONDS} max={MAX_TURN_TIME_SECONDS} step={1} value={sliderSeconds(rules)} formatValue={(seconds) => sliderReadout(rules, seconds, serverDefaultTime)} onCommit={(seconds) => { const payload = turnTimePayload(rules, seconds); if (payload !== null) editor.onChange(payload); }} disabled={disabled} />`. No `onChange` live prop: nothing is sent while dragging.
    2. A row `flex flex-wrap items-center gap-2`: `<Button variant="secondary" disabled={disabled}>All</Button>` → `allKitsPayload`; `<Button variant="quiet" disabled={disabled}>None</Button>` → `noKitsPayload`; `<Toggle label="Random" icon="random" pressed={rules.randomOnly} disabled={disabled} onPressedChange={(on) => { editor.onChange(randomOnlyPayload(rules, on)); }} />`.
    3. Only while `allowedKitIds(rules).length === 1`: `<p id={reasonId} className="font-v7-body text-v7-caption font-bold text-v7-text-2">{LAST_ALLOWED_KIT_REASON}</p>` (`reasonId = useId()`).
    4. `<ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-2 gap-y-4">` over `rulesKitFaces(rules)`: `<li key data-kit-id={face.kitId} data-excluded={face.excluded ? 'true' : 'false'}>` holding a private `KitToggle`.
    - `disabled = editor.disabled === true`, `serverDefaultTime = editor.serverDefaultTime === true`.
    - **`KitToggle`** (private): `<button type="button" aria-pressed={!face.excluded} aria-label={face.name} disabled={disabled} {...(locked ? { 'aria-disabled': true, 'aria-describedby': reasonId } : {})} data-motion={motionAttribute(reduced)} onClick={…}>`.
      - `locked = isLastAllowedKit(rules, face.kitId)`.
      - `onClick`: return when `locked`; else `kitTogglePayload(rules, face.kitId)` and call `editor.onChange` only when it is not `null`.
      - Classes: `flex min-h-11 w-full flex-col items-center gap-1.5 p-1.5 text-center` + `CHROME_SHAPE_SM_CLASS`, `CHROME_FOCUS_CLASS`, `CHROME_DISABLED_CLASS`, `BUTTON_VARIANT_CLASS.quiet`, and `chromePressClass(reduced)` unless `locked`.
      - Content: an `aria-hidden` `<span>` with `opacity-40 grayscale` when excluded, around `<KitPortrait kitId={face.kitId} size="thumb" />`; the name (`font-v7-body text-v7-caption font-bold leading-tight break-words text-v7-text-2`); and, when excluded, `EXCLUDED_LABEL` (`text-v7-micro font-extrabold`) at full opacity. That is the read-only sheet's face, as a button.
    - Every control is `type="button"` (`Button` and `Toggle` default to it), so nothing submits the solo `<form>` (the Sheet portals out of it anyway).
  - **`ui/rules/rules-sheet.tsx`:** add `editor?: RulesEditorBinding` to the props and the destructuring. The body is `editor !== undefined ? <RulesEditor rules={rules} editor={editor} /> : <today's read-only body, unchanged>`. Title, placement `auto`, `dataAttributes` and the single Close action are unchanged. Doc comment: replace "L76 adds the host editor in this folder; until then the sheet is the guests' view" with "With `editor` (the host, the solo menu: L76-09) the same sheet holds `RulesEditor` and Close stays its only action; without it the sheet is the guests', walk-ins', arena menu's and Game over's read-only view".
  - **`ui/rules/rules-strip.tsx`:** add `editor?: RulesEditorBinding`.
    - `const clock = turnTimeLabel(rules, editor?.serverDefaultTime === true)`: the clock `<span>` prints `clock`, and the hidden summary is `rulesSummaryText(rules, clock)`.
    - `<RulesSheet … {...(editor !== undefined ? { editor } : {})} />`.
    - The strip itself is never disabled: opening stays live while busy or reconnecting (A.9 ruling 6).
    - Doc comment: one sentence on `editor`.
  - **`ui/rules/rules.gallery-demos.tsx`:** `RulesEditorDemo({ solo = false })` keeps `useState<LobbyRules>(defaultLobbyRules)` and `useState(false)` (a time was sent). It renders the gallery frame `<div className="max-w-md rounded-v7-chrome bg-v7-bg-0 p-3">` holding `<RulesStrip rules editor={{ onChange, serverDefaultTime: solo && !timeSent }} />`.
    - `onChange(payload)` sets the rules to `{ excludedKitIds: payload.excludedKitIds, randomOnly: payload.randomOnly, turnTimeSeconds: payload.turnTimeSeconds ?? current.turnTimeSeconds }`, and sets `timeSent` when `payload.turnTimeSeconds !== undefined`.
    - It re-states the two-line merge: `ui/` never imports `screens/home/solo-rules-state`.
  - **`ui/rules/rules.gallery.tsx`:** append three entries:
    - `host-editor` ('Host editor, live apply'): `<RulesEditorDemo />`.
    - `solo-server-default` ('Solo: Server default until the slider is released'): `<RulesEditorDemo solo />`.
    - `editor-disabled` ('Editor disabled (solo launch or reconnecting)'): the existing frame with `<RulesStrip rules={defaultLobbyRules()} editor={{ onChange: () => undefined, disabled: true }} />`, written as an inline arrow, not a component.
    - Update the header comment.
  - **`screens/home/solo-rules-state.ts`:** `applySoloRulesPayload` exactly as Appendix A.2: `applySoloRulesChange(state, { ...state.rules, ...payload, turnTimeSeconds: payload.turnTimeSeconds ?? state.rules.turnTimeSeconds }, payload.turnTimeSeconds !== undefined)`. Doc comment: only the slider's payload carries the clock, so only a slider release sets `includeTurnTime` (Q3/Q31).
  - **`screens/home/solo-path.tsx`:**
    - Replace the `<LobbyRulesPanel rules={soloRules} editable … />` block with `<RulesStrip rules={soloRules} editor={rulesEditor} />` at the same place in the form.
    - `SoloPathProps`: remove `onSoloRulesChange`, add `rulesEditor: RulesEditorBinding` (a `type` import from `../../ui/rules/rules-editor-model`).
    - Drop the `../lobby-rules-panel` import.
  - **`screens/home/home-screen.tsx`:** replace the `onSoloRulesChange={…}` prop on `<SoloPath>` with `rulesEditor={{ onChange: (payload) => { setSolo((current) => applySoloRulesPayload(current, payload)); }, disabled: busy, serverDefaultTime: !solo.includeTurnTime }}`. Import `applySoloRulesPayload`, and drop `applySoloRulesChange` from the import if it becomes unused there. `busy` is the existing `status === 'connecting' || soloLaunchPending`.
  - **`screens/lobby/lobby-screen.tsx`:**
    - Replace the `<LobbyRulesPanel rules={rules} editable={isHost} onExcludedChange… onRandomOnlyChange… onTurnTimeChange… />` block with `<RulesStrip rules={rules} className="mt-6" {...(isHost ? { editor: { onChange: onSetLobbyRules } } : {})} />`.
    - Keep `const rules = view.lobbyRules ?? defaultLobbyRules();`.
    - Import `RulesStrip` from `../../ui/rules/rules-strip`; drop `../lobby-rules-panel`.
  - **Delete** `apps/client/src/screens/lobby-rules-panel.tsx` (`grep -rn "lobby-rules-panel" apps/client/src` must then return only comments and docs).
  - **What's new:** append to `lot-72-v7.items` in `packages/shared/src/release-notes.ts`, after the L76-03 item:

```ts
      {
        before: 'In the lobby, only the host could open the table rules.',
        after: 'Everyone can open the table rules, and the host edits them there.',
      },
```

    Append the same object to the `items` `toEqual` in `release-notes.test.ts` ('writes lot-72-v7 as the New look entry …'). In `apps/client/src/screens/whats-new-dialog.test.ts`, bump `expect(latestReleaseNote().items).toHaveLength(7)` (as L76-03 left it) to `8`. If either number differs, add one to what is there.

- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/ui apps/client/src/screens/home apps/client/src/screens/lobby apps/client/src/screens/whats-new-dialog.test.ts apps/client/src/dev packages/shared/src/release-notes.test.ts`. Expected: the 40 new tests pass. Every existing test listed under Files passes with no assertion edited, apart from the gallery id list, the release-notes `toEqual` and the item count above. Then `pnpm vitest run apps/client/src/screens/arena` (the arena's `RulesSheet` recall is unchanged).

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, append under `## Home and lobby (V7 · Lot 76)`, after the L76-03 bullets:

```
- `ui/rules/rules-editor.tsx`, `rules-editor-model.ts` (L76-09, spec v7 §7.4, §13 Q3/Q4/Q8/Q15/Q18/Q31):
  the host editor. `RulesStrip` and `RulesSheet` take an optional `editor: RulesEditorBinding`
  (`onChange`, `disabled?`, `serverDefaultTime?`). Without it they stay the read-only strip and
  sheet that guests, walk-ins, the arena menu and Game over use (Q15). With it, the same "Table
  rules" sheet holds `RulesEditor`: the "Human turn" `Slider` (5–180, step 1, at `sliderSeconds`,
  so a 300 s server default sits at 180 while the strip shows 300s), then All / None and the
  Random `Toggle`, then the 16 kit toggles (`aria-pressed` = allowed, named by the kit, Excluded in
  words). Every change is one `SET_LOBBY_RULES` payload from the pure model, applied live; Close,
  Esc, backdrop and swipe only close. The slider sends once per release (`Slider.onCommit`), the
  only payload with `turnTimeSeconds`. Kit, Random, All and None never carry it, because it would
  override the server clock for the life of the room. The last allowed kit is `aria-disabled` and
  described by the visible `LAST_ALLOWED_KIT_REASON`. `disabled` locks every editor control (solo
  launch Q8; L76-14 reconnecting) while the strip still opens. `serverDefaultTime` makes the strip,
  its spoken summary and the slider readout at the untouched value read `SERVER_DEFAULT_LABEL`.
- `screens/lobby/lobby-screen.tsx`, `screens/home/solo-path.tsx`, `home-screen.tsx`,
  `solo-rules-state.ts` (L76-09): the lobby mounts `RulesStrip` for everyone and gives only the
  host `editor={{ onChange: onSetLobbyRules }}`. The solo path gets
  `{ onChange: (p) => setSolo((s) => applySoloRulesPayload(s, p)), disabled: busy,
  serverDefaultTime: !solo.includeTurnTime }`. `applySoloRulesPayload` merges a payload into the
  local rules (the clock only when the payload carries it) through `applySoloRulesChange`: only a
  slider release sets `includeTurnTime`, and an excluded local pick falls back to Random.
  `screens/lobby-rules-panel.tsx` is deleted.
```

  - `docs/agent/frontend.md`, `### Rules (ui/rules/, L72-16)`: replace the bullet

```
- **L76 adds the host editor here:** the slider sends on release, All / None / Random and the
  16 kit toggles, in this folder, reusing `rulesKitFaces`. `screens/lobby-rules-panel.tsx` stays
  until L76.
```

    with

```
- **Host editor (L76-09):** `RulesStrip` and `RulesSheet` take an optional `editor`
  (`RulesEditorBinding`); with it the sheet's body is `RulesEditor`, whose payloads come from the
  pure `rules-editor-model.ts` (details under `## Home and lobby (V7 · Lot 76)`).
  `screens/lobby-rules-panel.tsx` is deleted.
```

  - `docs/agent/frontend.md`, V2 `**Lobby (L11-02 / …)**` paragraph: replace the sentences from `**Table rules (Lot 70):** everyone sees a clock` to `until the host moves it.` (or their current wording, if an earlier task reflowed them) with:

```
  **Table rules (Lot 70; V7 L76-09):** everyone sees the `RulesStrip` (the clock with the
  seconds, the Random mark, the 16 kit faces with the excluded ones greyed and labelled
  Excluded) and taps it for the Table rules sheet: read-only for guests and walk-ins, the editor
  for the host. The editor puts the 5–180 second slider on top (it sends once, on release), then
  All / None / Random, then the kit toggles; every change applies live. Random only adds the
  Random mark and hides the kit picker. None keeps the first Classic kit. Play again keeps the
  rules. The tutorial path does not show them. Solo uses the same strip and editor and reads
  "Server default" until the slider is released. An untouched slider does not send a time, so
  `TURN_DURATION_MS` still applies until the host moves it.
```

  - `docs/agent/frontend.md`, the What's new paragraph that lists the `lot-72-v7` items: after the L76-03 item, append ` Eighth item: the lobby's table rules open for everyone, and the host edits them in the same sheet (L76-09; L76-12 rewrites this Lobby item in place).`
  - `DESIGN.md`:
    - **› Rules:**
      - Intro: replace "They are the read-only half of `screens/lobby-rules-panel.tsx` on V7 surfaces; that file and its host editor stay until L76." with "`rules-editor.tsx` and `rules-editor-model.ts` (L76-09) add the host editor; `screens/lobby-rules-panel.tsx` is gone."
      - **Strip:** append "With `editor.serverDefaultTime` the clock and the spoken summary read 'Server default' (`SERVER_DEFAULT_LABEL`) instead of the seconds."
      - **Sheet:** append "With `editor` the body is `RulesEditor` instead of the read-only list, and Close stays the only action."
    - **› Rules, new bullet `**Editor (L76-09):**`** after **Sheet**:
      - The order: slider, the All / None / Random row, the reason line, the kit grid.
      - The slider: the `Slider` labelled "Human turn" beside a decorative `clock`, 5–180 step 1, `aria-valuetext` from `sliderReadout`, committing on release only.
      - The row: All `secondary`, None `quiet`, and the Random `Toggle` with the `random` icon.
      - The reason: "At least one kit must stay allowed." in Nunito 12px `--text-2`, shown only while one kit is allowed.
      - The kit grid: auto-fill columns of at least 5.5rem. Each toggle is a quiet chrome button composed from `chrome-classes.ts`, at least 44px, with `aria-pressed` = allowed and `aria-label` = kit name. It holds an `aria-hidden` thumb portrait, dimmed `opacity-40 grayscale` only when excluded, then the name and "Excluded" at full opacity.
      - The last allowed kit is `aria-disabled` (the off look) and described by the reason. `disabled` sets native `disabled` on every control.
      - Anchors: `data-rules-editor` on the root; `data-kit-id` / `data-excluded` on each `<li>`.
    - **› Rules › Copy:** add "'Server default' (§10.6) and 'At least one kit must stay allowed.' (the existing `set-lobby-rules-no-kit` copy) live in `ui-copy.ts`".
    - **› Rules:** delete the **Later** bullet's first sentence ("L76 adds the host editor in this folder.").
    - **› Rules › Gallery:** add "the host editor (live apply), the solo Server default demo and a disabled editor (`rules.gallery-demos.tsx` holds the stateful demo)".
    - **› Primitives › Copy:** append `SERVER_DEFAULT_LABEL` "Server default" and `LAST_ALLOWED_KIT_REASON` (L76-09) after whatever L76-03 appended.
  - `docs/agent/decisions.md`, append (YYYY-MM-DD = the commit day):

```
## YYYY-MM-DD · [P] Table rules: one sheet for everyone, the host edits it, the slider sends on release (L76-09)

Source: technical spec v7 §7.4, §7.1, §11, §13 (Q3/Q31, Q4/Q18, Q8, Q15); backlog_v7 L76-09; Lot 76
plan Appendix A.5.

- **Supersedes** the host-only view in "2026-10-06 · [P] Rules chrome and lobby chat" ("Host rules
  open from a settings control only the host sees"). Everyone in the lobby (host, seated guests,
  walk-ins) sees the same `RulesStrip` and taps it to open the "Table rules" sheet. Guests and
  walk-ins get the read-only sheet (Q15). The host, and the player on the solo menu, get the same
  sheet holding `RulesEditor`. The Lot 70 order stays (the 5–180 s slider, then All / None /
  Random, then the 16 kit toggles), with live apply and no Save or Cancel, at least one kit
  allowed, and None keeping the first Classic kit.
- **Supersedes** the per-step sends of the Lot 70 slider: `screens/lobby-rules-panel.tsx` sent one
  `setLobbyRules` per input event (Appendix A `lobby-rules-dialog-live-apply`: "every slider step
  sends an intent, which is chatty but intended"). The slider now sends once per gesture, on
  release: pointer up or cancel, key up after a step key, blur, or a change from assistive
  technology (`ui/primitives/slider.tsx`). The intent and its payload are unchanged. A guest's
  strip now changes once per release instead of following the drag.
- Kit, Random, All and None payloads still never carry `turnTimeSeconds` (it overrides the server
  clock for the life of the room). Every payload is built in the pure
  `ui/rules/rules-editor-model.ts`.
- The last allowed kit is `aria-disabled`, stays focusable and is described by the visible "At
  least one kit must stay allowed." (the existing `set-lobby-rules-no-kit` copy), so the reason is
  reachable by keyboard (Q39). The V2 tile was natively disabled with no reason.
- Solo (Q3/Q31): while `includeTurnTime` is false, the strip, its spoken summary and the slider
  readout at the untouched value read "Server default". Only a slider release that changes the
  value sets `includeTurnTime`; kit and Random edits never do. During a solo launch (Q8) every
  editor control is disabled, but the strip still opens so the rules stay readable: in V7 the
  strip is the summary as well as the opener, so only the controls that could change something
  are locked.
- The lobby keeps V2's `view.lobbyRules ?? defaultLobbyRules()` fallback; the room always sends
  the field.

---
```

  - `docs/backlog_v7_test_classification.md`, row 234 (`screens/whats-new-dialog.test.ts` … `[catalog assertions]`): replace "0 additions and 1 item" (or the count L76-03 left) with "0 additions and 8 items".
  - `docs/backlog_v7.md`: the L76-09 row `| M | **High** | Lot 72, L76-01, L76-02 | To do |` → `| M | **High** | Lot 72, L76-01, L76-02 | Done |`; Progress `| 76 · Home and lobby | 18 | 3 |` → `| 76 · Home and lobby | 18 | 4 |`; Total `| **Total** | **135** | **N** |` → N + 1 (75 → 76 when nothing else moved it; read it first).

- [ ] **Step 6: Verify and commit.**
  - Run `pnpm verify` and wait for it to pass.
  - Stage by name:

```
git rm apps/client/src/screens/lobby-rules-panel.tsx
git add apps/client/src/ui/rules/rules-editor.tsx apps/client/src/ui/rules/rules-editor.test.tsx apps/client/src/ui/rules/rules-editor-model.ts apps/client/src/ui/rules/rules-editor-model.test.ts apps/client/src/ui/rules/rules-strip.tsx apps/client/src/ui/rules/rules-strip.test.tsx apps/client/src/ui/rules/rules-sheet.tsx apps/client/src/ui/rules/rules-sheet.test.tsx apps/client/src/ui/rules/rules-summary.ts apps/client/src/ui/rules/rules-summary.test.ts apps/client/src/ui/rules/rules.gallery.tsx apps/client/src/ui/rules/rules.gallery-demos.tsx apps/client/src/ui/rules/rules.gallery.test.tsx apps/client/src/ui/ui-copy.ts apps/client/src/ui/ui-copy.test.ts apps/client/src/screens/lobby/lobby-screen.tsx apps/client/src/screens/lobby/lobby-screen.rules.test.tsx apps/client/src/screens/home/solo-path.tsx apps/client/src/screens/home/home-screen.tsx apps/client/src/screens/home/solo-rules-state.ts apps/client/src/screens/home/solo-rules-state.test.ts apps/client/src/screens/home/solo-path.rules.test.tsx apps/client/src/screens/whats-new-dialog.test.ts packages/shared/src/release-notes.ts packages/shared/src/release-notes.test.ts DESIGN.md docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
```

  - Commit (no attribution, no trailer):

```
feat(lobby): add the host rules editor (L76-09)

Everyone opens the same Table rules sheet; the host and the solo
menu edit it there. The slider sends one setLobbyRules on release.
decisions.md supersedes the 2026-10-06 host-only view and the
per-step sends.
```

**Acceptance map:**
- A drag sends one `setLobbyRules` on release, with `turnTimeSeconds`:
  - `rules-editor.test.tsx` › 'a drag sends one payload on release, with turnTimeSeconds (Q4/Q18)';
  - 'a held arrow key sends one payload, on key release';
  - `lobby-screen.rules.test.tsx` › 'host: a drag sends one setLobbyRules on release, with turnTimeSeconds'.
- Kit, Random, All and None payloads never include it (Review Focus 2):
  - `rules-editor-model.test.ts` › 'never puts turnTimeSeconds in a Kit, All, None or Random payload over a 300 s server default (Review Focus 2)';
  - `rules-editor.test.tsx` › 'over a 300 s server default the slider sits at 180, …';
  - `lobby-screen.rules.test.tsx` › 'host, over a 300 s server default: the strip reads 300s, …'.
- The last allowed tile is disabled with its reason, and a null `toggleExcludedKit` sends nothing: 'locks the last allowed kit with its visible reason; pressing it sends nothing'; 'toggles one kit in KIT_IDS order, and gives null for the last allowed kit'.
- None leaves only `KIT_IDS[0]`: 'All allows every kit; None keeps only KIT_IDS[0], …', and the None payload in both Review Focus 2 component tests.
- Guests get the sheet with no editable control: '$who taps the strip for the read-only sheet: …' (seated guest and walk-in), and the unchanged `rules-sheet.test.tsx` › 'has no editable control'.
- An untouched solo menu shows 'Server default' and launches with `includeTurnTime` false:
  - 'an untouched solo menu reads Server default and launches with includeTurnTime false';
  - 'kit and Random edits apply locally and keep includeTurnTime false';
  - 'reads Server default on the strip and in its summary while serverDefaultTime (Q3/Q31)'.
- A slider release flips `includeTurnTime` to true: 'only a slider release flips includeTurnTime: …'; `solo-rules-state.test.ts` › 'a slider payload sets the seconds and includeTurnTime'.
- An excluded solo pick resets to Random: 'excluding the local pick resets it to Random'; 'resets an excluded local pick to Random and keeps an allowed one'.
- Every excluded face has the label and a kit-name alt: 'every face on the strip has its kit-name alt, and every excluded face says Excluded'; the unchanged `rules-strip.test.tsx` › 'labels each excluded kit "Excluded" and leaves allowed kits unlabelled'.
- Brief items beyond the Acceptance line:
  - The editor is disabled during a solo launch (Q8): 'disables the editor during a solo launch while the strip still opens (Q8)' and 'disables every control while the editor is disabled …'.
  - Out-of-range seconds show on the strip while the slider sits at 180: 'shows a 300 s server default as received while the editor slider sits at 180 (Review Focus 2)'.
  - The Lot 70 order is kept: 'puts the slider first, then All, None and Random, then the kit toggles'.
- `pnpm verify` green: Step 6.

**Decisions:**
- **The editor's labels stay in `ui/rules/`** ('Human turn', 'All', 'None', 'Random', 'Close'): they are the existing Lot 70 labels, as `rules-sheet.tsx` already hard-codes 'Human turn', 'Random' and 'Close' (L72-16). Only the two new strings go to `ui/ui-copy.ts`. Add one sentence to DESIGN.md › Primitives › Copy: "The rules editor's control labels are the Lot 70 words, fixed in `ui/rules/`."
- **The kit toggles are a private `KitToggle` button, not the `Toggle` primitive.** `Toggle` draws a knob and takes an icon name, not a portrait. The kit face needs the portrait, the name and "Excluded", as the read-only sheet shows them. Random stays the `Toggle` (Appendix A.5).
- **The last allowed kit is `aria-disabled` and focusable, described by the reason.** Native `disabled` would hide the reason from keyboard users (Q39). Its handler returns early, and `kitTogglePayload` is `null` there anyway. The whole-editor `disabled` stays native, because `Slider` and `Toggle` only offer native `disabled`.
- **The reason line sits once, above the kit grid, only while one kit is allowed.** A 5.5rem tile cannot hold the sentence. The locked toggle is joined to it by `aria-describedby`.
- **The slider readout shows the live seconds during a drag.** In solo it reads "Server default" whenever the thumb sits at the untouched value, so a drag that ends where it started still reads "Server default", which matches the unchanged `includeTurnTime`. The strip follows A.5 exactly: "Server default" until a release.
- **`rulesSummaryText` gains an optional clock argument** (default unchanged) so the spoken summary says what the strip shows. That file is touched beyond A.1's list.
- **The strip opens while `disabled`** (A.9 ruling 6, and Q8 read as "no edit lands mid-launch"). Only the editor controls lock.
- **The lobby keeps `view.lobbyRules ?? defaultLobbyRules()`**, as V2 did. The field is optional on the wire but always sent.
- **Initial focus in the editor sheet is the slider**, the sheet's first control (the read-only sheet keeps Close). Its blur-commit sends nothing unless the value changed.
- **Button variants:** All `secondary` (was green), None `quiet` (was orange). Close stays `secondary`.
- **New or changed player-facing strings:**
  - `SERVER_DEFAULT_LABEL` 'Server default' (new, §10.6).
  - `LAST_ALLOWED_KIT_REASON` 'At least one kit must stay allowed.' (existing reject copy, now visible on the editor).
  - The slider's accessible name 'Human turn seconds' → 'Human turn' (its visible label; A.5).
  - What's new Lobby item, Before 'In the lobby, only the host could open the table rules.' and After 'Everyone can open the table rules, and the host edits them there.' (new; L76-12 rewrites it).
  - Gallery titles: DEV-only demo copy.

---

---

### Task L76-10: Rebuild the kit picker sheet

**Files:**
- Create:
  - `apps/client/src/screens/lobby/kit-picker-sheet.tsx`: `KitPickerSheet`, `KitPickerSheetProps` (Appendix A.5).
  - `apps/client/src/screens/lobby/kit-tile-stats.ts`: `kitTileStats`.
  - `apps/client/src/screens/lobby/random-kit-details.tsx`: `RandomKitDetails`, moved out of the V2 dialog with L76-03's copy.
  - (consistency ruling X-1) no new copy file: the two Random-only lines are added to `apps/client/src/screens/kit-pick-copy.ts`, which L76-03 created for the kit pick strings (extend `screens/kit-pick-copy.test.ts` with their two values).
- Test (create): `apps/client/src/screens/lobby/kit-tile-stats.test.ts` (3, node), `random-kit-details.test.tsx` (1), `kit-picker-sheet.test.tsx` (13), `lobby-screen.kit-picker.test.tsx` (3), `apps/client/src/screens/home/solo-path.kit-picker.test.tsx` (3).
- Modify:
  - `apps/client/src/screens/lobby/lobby-screen.tsx`: `LobbyKitPickerDialog` → `KitPickerSheet`; the Random-only line; the open flag cleared under Random only.
  - `apps/client/src/screens/home/home-screen.tsx`: `LobbyKitPickerDialog` → `KitPickerSheet`.
  - `apps/client/src/screens/home/solo-path.tsx`: the Random-only line.
  - `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`.
- Delete: `apps/client/src/screens/lobby-kit-picker-dialog.tsx` and L76-03's `apps/client/src/screens/lobby-kit-picker-dialog.test.tsx` (`git rm`). Carry its two tests unchanged in meaning (consistency ruling X-2): the grid lead (`KIT_PICKER_LEAD` inside the dialog named 'Choose kit') becomes a `kit-picker-sheet.test.tsx` case, and the Random preview (`RANDOM_KIT_ASSIGN_COPY` and `RANDOM_KIT_PRIVACY_COPY` inside the dialog named 'Random kit', nothing sent) becomes a `random-kit-details.test.tsx` / `kit-picker-sheet.test.tsx` case. `RandomKitDetails` renders those two constants from `../kit-pick-copy` (not literals), and the grid lead renders `{KIT_PICKER_LEAD}`.
- Modify (`ui/icons`, controller ruling C-1): `apps/client/src/ui/icons/icon-names.ts` (append `'action'` and `'attack'` at the END of `ICON_NAMES`), `apps/client/src/ui/icons/icon.tsx` (two glyphs in the `glyphs` record: a card verso in the arcade style, hex paints from `ui/palette.ts`, 2-unit ink outline; `action` marked with a star, `attack` with a blade; each geometry distinct from every other glyph), `apps/client/src/ui/icons/icon-names.test.ts` (add `/** Kit tile stat glyphs (L76-10). */ const L76_ADDED_NAMES = ['action', 'attack'];` and assert `[...ICON_NAMES]` equals `[...SPEC_ICON_NAMES, ...L72_ADDED_NAMES, ...L76_ADDED_NAMES]`, renaming the first `it` to mention the L76 additions; L76-12 later extends the same array with `'check'`), `apps/client/src/ui/icons/icon.test.tsx` (stays green: its distinct-geometry check now covers them), `DESIGN.md` › Icons › The set (two rows: `action` = starting action cards, `attack` = starting attack cards). `dev/ui-gallery.test.tsx` renders every icon name and stays green unchanged.
- Existing tests that must stay green unchanged: `screens/lobby/lobby-kit-picker.test.ts` (both `it`s), `ui/primitives/kit-tile.test.tsx`, `ui/kit/kit-details.test.tsx`, `ui/kit/kit-portrait.test.tsx`, every L76-09 test (`lobby-screen.rules.test.tsx`, `solo-path.rules.test.tsx`, `ui/rules/*`), `screens/lobby/lobby-screen.test.tsx` (L76-02), `screens/home/home-screen.test.tsx` (L76-01), `screens/solo-menu-seed.test.ts`.

**Interfaces:**
- Consumes:
  - Shared: `getKit`, `KIT_IDS`, `defaultLobbyRules`, `latestReleaseNote`, types `KitId`, `LobbyKitSelection`, `LobbyRules`.
  - ui: `Sheet` (`../../ui/primitives/sheet`), `Button` (`../../ui/primitives/button`), `KitTile` and `type KitTileStat` (`../../ui/primitives/kit-tile`), `KitPortrait` (`../../ui/kit/kit-portrait`), `KitDetails` (`../../ui/kit/kit-details`), `RESOURCE_CAPTIONS` (`../../ui/resource-captions`), `EXCLUDED_LABEL` (`../../ui/ui-copy`).
  - Screens: `LOBBY_KIT_PICKER_SELECTIONS`, `lobbyKitSelectionLabel` (`./lobby-kit-picker`, moved by L76-02) and `ILLEGAL_ACTION_COPY` (`../illegal-action-copy`).
  - L76-09: `RulesStrip` with `editor`, and the solo binding (the solo tests use the strip to exclude a kit and to turn Random only on).
  - Test helpers: `makeLobbyProps`, `guestLobbyView`, `expectNoLobbyIntent` (`./test-lobby`); `makeHomeProps`, `expectNoHomeIntent` (`./test-home`); `HOW_TO_PLAY_SEEN_KEY`, `LAST_SEEN_RELEASE_ID_KEY`.
- Produces:

```ts
// screens/lobby/kit-picker-sheet.tsx — exactly Appendix A.5
export interface KitPickerSheetProps {
  readonly open: boolean;
  readonly current: LobbyKitSelection;
  readonly rules: LobbyRules;
  readonly onSelect: (selection: LobbyKitSelection) => void;
  readonly onClose: () => void;
  readonly disabled?: boolean;
}
export function KitPickerSheet(props: KitPickerSheetProps): ReactElement;

// screens/lobby/kit-tile-stats.ts
export function kitTileStats(kitId: KitId): readonly KitTileStat[];   // six entries, order below
/** The Draw a gambling kit shows (designer 2026-11-03): the weighted payout range of rules spec §4 / Lot 64, the words of `KIT_ABILITY_COPY.gambler`. */
export const WEIGHTED_DRAW_LABEL = '5–100';

// screens/lobby/random-kit-details.tsx
export function RandomKitDetails(): ReactElement;

// screens/kit-pick-copy.ts (L76-03's file; L76-10 appends)
/** Random only replaces the Your kit card in the lobby (spec v7 §7.3): the first sentence of the 'choose-kit-random-only' reject copy. */
export const RANDOM_ONLY_LOBBY_LINE = 'The host is dealing kits at random.';
/** The same on the solo menu, where the player is the host (spec v7 §7.3, §10.6; designer review). */
export const RANDOM_ONLY_SOLO_LINE = 'Kits will be dealt at random.';
```

Test hooks this task adds:
- `data-lobby-sheet="kit-picker"` on the grid sheet's panel and `data-lobby-sheet="kit"` on the kit sheet's panel (A.4).
- `data-kit-picker-tile={selection}` on each grid `<li>`.

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/screens/lobby/kit-tile-stats.test.ts` (3 tests, node):

```ts
/** Kit tile stats (technical spec v7 §7.3, §5.5: values from KIT_CATALOG, never the art). L76-10. */
import { getKit, KIT_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { kitTileStats, WEIGHTED_DRAW_LABEL } from './kit-tile-stats';

describe('kitTileStats (L76-10)', () => {
  it('reads lives, points, upgrade points, Draw, action and attack from KIT_CATALOG for every kit', () => {
    for (const kitId of KIT_IDS) {
      const { startingResources: res, startingCardCounts: cards, traits } = getKit(kitId);
      expect(kitTileStats(kitId), kitId).toEqual([
        { icon: 'life', label: 'Lives', value: String(res.lives) },
        { icon: 'point', label: 'Points', value: String(res.points) },
        { icon: 'upgrade', label: 'Upgrade points', value: String(res.upgradePoints) },
        { icon: 'draw', label: 'Draw', value: traits.drawBustDenominator === undefined ? String(res.draw) : WEIGHTED_DRAW_LABEL },
        { icon: 'action', label: 'Action', value: String(cards.action) },
        { icon: 'attack', label: 'Attack', value: String(cards.attack) },
      ]);
    }
  });

  it('pins two kits by value: Tactician and Indestructible', () => {
    expect(kitTileStats('tactician').map((stat) => stat.value)).toEqual(['1', '15', '0', '4', '2', '2']);
    expect(kitTileStats('indestructible').map((stat) => stat.value)).toEqual(['18', '0', '0', '1', '4', '1']);
  });

  it('shows the weighted Draw range for a gambling kit, not the catalog 10 (designer 2026-11-03)', () => {
    expect(WEIGHTED_DRAW_LABEL).toBe('5–100');
    expect(kitTileStats('gambler').find((stat) => stat.label === 'Draw')?.value).toBe('5–100');
    expect(KIT_IDS.filter((kitId) => kitTileStats(kitId).some((stat) => stat.value === WEIGHTED_DRAW_LABEL))).toEqual(['gambler']);
  });
});
```

`apps/client/src/screens/lobby/random-kit-details.test.tsx` (1 test):

```tsx
// @vitest-environment happy-dom
/** Random kit description (technical spec v7 §10.1 Lot 76 row, §7.3). L76-10 moves it with L76-03's copy. */
import { describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { RandomKitDetails } from './random-kit-details';

describe('RandomKitDetails (L76-10)', () => {
  it('deals one of the allowed kits and uses the Lot 69 wording, not the old 16-kit and Spy lines', () => {
    const { container } = renderUi(<RandomKitDetails />);
    expect(container.textContent).toMatch(/one of the allowed kits/);
    expect(container.textContent).not.toMatch(/16 kits/);
    expect(container.textContent).not.toMatch(/until Spy, an equivalent, or elimination/);
  });
});
```

`apps/client/src/screens/lobby/kit-picker-sheet.test.tsx` (11 tests):

```tsx
// @vitest-environment happy-dom
/**
 * Kit picker sheet — technical spec v7 §7.3, §6.7 (read-only sheets stack; Esc closes the top one), §11 (Q23);
 * Appendix A `lobby-kit-picker-dialog`, `home-solo-kit-picker`, `lobby-dialog-dismiss-map`,
 * `lobby-rules-change-guest-effects`; plan Review Focus 1 and A.9 rulings 3 and 5. L76-10.
 */
import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { defaultLobbyRules, KIT_IDS, type LobbyKitSelection } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { EXCLUDED_LABEL } from '../../ui/ui-copy';
import { ILLEGAL_ACTION_COPY } from '../illegal-action-copy';
import { KitPickerSheet, type KitPickerSheetProps } from './kit-picker-sheet';
import { kitTileStats } from './kit-tile-stats';
import { KIT_PICKER_LEAD, RANDOM_KIT_ASSIGN_COPY, RANDOM_KIT_PRIVACY_COPY } from '../kit-pick-copy';
import { LOBBY_KIT_PICKER_SELECTIONS, lobbyKitSelectionLabel } from './lobby-kit-picker';

function setup(overrides: Partial<KitPickerSheetProps> = {}) {
  const props: KitPickerSheetProps = {
    open: true, current: 'random', rules: defaultLobbyRules(), onSelect: vi.fn(), onClose: vi.fn(), ...overrides,
  };
  const result = renderUi(<KitPickerSheet {...props} />, { reducedMotion: true });
  return { ...result, props };
}
function tile(selection: LobbyKitSelection): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-kit-picker-tile="${selection}"]`);
  if (element === null) throw new Error(`no tile for ${selection}`);
  return element;
}
const head = (selection: LobbyKitSelection): HTMLElement => within(tile(selection)).getByRole('button');
const kitSheet = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-lobby-sheet="kit"]');
const values = (element: HTMLElement): (string | null)[] => [...element.querySelectorAll('dd')].map((dd) => dd.textContent);
const selectIn = (title: string): HTMLElement =>
  within(screen.getByRole('dialog', { name: title })).getByRole('button', { name: 'Select this kit' });

describe('KitPickerSheet (L76-10)', () => {
  it('lists Random then all 16 kits in KIT_IDS order, each tile named by its label', () => {
    setup();
    const grid = screen.getByRole('dialog', { name: 'Choose kit' });
    expect(grid.getAttribute('data-lobby-sheet')).toBe('kit-picker');
    expect([...grid.querySelectorAll('[data-kit-picker-tile]')].map((el) => el.getAttribute('data-kit-picker-tile')))
      .toEqual(['random', ...KIT_IDS]);
    for (const selection of LOBBY_KIT_PICKER_SELECTIONS) {
      expect(within(tile(selection)).getByRole('button', { name: lobbyKitSelectionLabel(selection) })).toBeTruthy();
    }
  });

  it('marks the current pick aria-pressed, and no other tile', () => {
    setup({ current: 'wizard' });
    expect([...document.querySelectorAll('[data-kit-picker-tile] button[aria-pressed="true"]')]).toEqual([head('wizard')]);
  });

  it('prints each kit\'s KIT_CATALOG stats on its tile, and none on Random', () => {
    setup();
    for (const kitId of KIT_IDS) expect(values(tile(kitId)), kitId).toEqual(kitTileStats(kitId).map((stat) => stat.value));
    expect(values(tile('tactician'))).toEqual(['1', '15', '0', '4', '2', '2']);
    expect(values(tile('random'))).toEqual([]);
  });

  it('keeps an excluded kit listed, greyed and labelled Excluded; it can never open or reach Select (Q23)', async () => {
    const { user, props } = setup({ rules: { ...defaultLobbyRules(), excludedKitIds: ['assassin'] } });
    expect(tile('assassin').querySelector('[data-excluded="true"]')).not.toBeNull();
    expect(within(tile('assassin')).getByText(EXCLUDED_LABEL)).toBeTruthy();
    expect(head('assassin').hasAttribute('disabled')).toBe(true);
    await user.click(head('assassin'));
    expect(kitSheet()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Select this kit' })).toBeNull();
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(tile('wizard').querySelector('[data-excluded="true"]')).toBeNull();
  });

  it('a tile opens the kit sheet above the grid; Select this kit sends the pick, then closes', async () => {
    const calls: string[] = [];
    const { user } = setup({ onSelect: (selection) => { calls.push(`select:${selection}`); }, onClose: () => { calls.push('close'); } });
    await user.click(head('wizard'));
    const sheet = screen.getByRole('dialog', { name: 'Wizard' });
    expect(sheet.getAttribute('data-lobby-sheet')).toBe('kit');
    expect(sheet.querySelector('[data-kit-id="wizard"]')).not.toBeNull();
    expect(document.querySelector('[data-lobby-sheet="kit-picker"]')).not.toBeNull();
    expect(calls).toEqual([]);
    await user.click(selectIn('Wizard'));
    expect(calls).toEqual(['select:wizard', 'close']);
  });

  it('the Random tile opens Random kit with the allowed-kits copy; Select sends random', async () => {
    const { user, props } = setup({ current: 'wizard' });
    await user.click(head('random'));
    expect(screen.getByRole('dialog', { name: 'Random kit' }).textContent).toMatch(/one of the allowed kits/);
    await user.click(selectIn('Random kit'));
    expect(props.onSelect).toHaveBeenCalledWith('random');
  });

  it('Back and Esc step back one level; Back, Esc and Close never change the pick', async () => {
    const { user, props } = setup();
    await user.click(head('wizard'));
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(kitSheet()).toBeNull();
    });
    await user.click(head('wizard'));
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(kitSheet()).toBeNull();
    });
    expect(screen.getByRole('dialog', { name: 'Choose kit' })).toBeTruthy();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(head('random').getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalledTimes(1);
    await user.click(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('the host excludes the kit being read: Select turns disabled at once with its reason and sends nothing, and the grid greys it (Review Focus 1)', async () => {
    const { user, props, rerender } = setup();
    await user.click(head('assassin'));
    const select = selectIn('Assassin');
    act(() => {
      select.focus();
    });
    rerender(<KitPickerSheet {...props} rules={{ ...defaultLobbyRules(), excludedKitIds: ['assassin'] }} />);
    expect(select.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(select);
    expect(screen.getByText(ILLEGAL_ACTION_COPY['choose-kit-excluded'].body)).toBeTruthy();
    await user.click(select);
    expect(props.onSelect).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Assassin' })).toBeTruthy();
    expect(within(tile('assassin')).getByText(EXCLUDED_LABEL)).toBeTruthy();
    expect(head('assassin').hasAttribute('disabled')).toBe(true);
  });

  it('Random only shows no sheet even while open, so turning it on closes an open picker', async () => {
    const { user, props, rerender } = setup();
    await user.click(head('wizard'));
    rerender(<KitPickerSheet {...props} rules={{ ...defaultLobbyRules(), randomOnly: true }} />);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(props.onSelect).not.toHaveBeenCalled();
    rerender(<KitPickerSheet {...props} rules={defaultLobbyRules()} />);
    expect(screen.getByRole('dialog', { name: 'Choose kit' })).toBeTruthy();
    expect(kitSheet()).toBeNull();
  });

  it('while disabled the sheets still open and close, and Select sends nothing', async () => {
    const { user, props } = setup({ disabled: true });
    await user.click(head('wizard'));
    expect(selectIn('Wizard').getAttribute('aria-disabled')).toBe('true');
    await user.click(selectIn('Wizard'));
    expect(props.onSelect).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(kitSheet()).toBeNull();
    });
  });

  it('a double tap on Select this kit sends the pick once per kit-sheet open (A.9 ruling 5)', async () => {
    const { user, props } = setup();
    await user.click(head('wizard'));
    await user.dblClick(selectIn('Wizard'));
    expect([vi.mocked(props.onSelect).mock.calls.length, vi.mocked(props.onClose).mock.calls.length]).toEqual([1, 1]);
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Back' }));
    await waitFor(() => {
      expect(kitSheet()).toBeNull();
    });
    await user.click(head('wizard'));
    await user.click(selectIn('Wizard'));
    expect(props.onSelect).toHaveBeenCalledTimes(2);
  });
  it('leads the grid with who can see your kit and that Random is the default (L76-03 copy, carried from lobby-kit-picker-dialog.test.tsx)', () => {
    setup();
    expect(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByText(KIT_PICKER_LEAD)).toBeTruthy();
  });
  it('the Random kit sheet says the kit comes from the allowed kits and who can see it, and opening sends nothing (L76-03 copy, carried)', async () => {
    const { user, props } = setup();
    await user.click(head('random'));
    const sheet = screen.getByRole('dialog', { name: 'Random kit' });
    expect(within(sheet).getByText(RANDOM_KIT_ASSIGN_COPY)).toBeTruthy();
    expect(within(sheet).getByText(RANDOM_KIT_PRIVACY_COPY)).toBeTruthy();
    expect(sheet.textContent).not.toMatch(/16 kits|before this picker existed|an equivalent/);
    expect([props.onSelect, props.onClose].map((fn) => vi.mocked(fn).mock.calls.length)).toEqual([0, 0]);
  });
});
```

`apps/client/src/screens/lobby/lobby-screen.kit-picker.test.tsx` (3 tests):

```tsx
// @vitest-environment happy-dom
/** Lobby kit picker (technical spec v7 §7.2, §7.3; Appendix A `lobby-your-kit`, `lobby-kit-picker-dialog`,
 * `lobby-rules-change-guest-effects`). L76-10. */
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { defaultLobbyRules } from '@card-battle/shared';

import { renderUi } from '../../test/render';
import { EXCLUDED_LABEL } from '../../ui/ui-copy';
import { RANDOM_ONLY_LOBBY_LINE } from '../kit-pick-copy';
import { LobbyScreen } from './lobby-screen';
import { expectNoLobbyIntent, guestLobbyView, makeLobbyProps } from './test-lobby';

const grid = (): HTMLElement => screen.getByRole('dialog', { name: 'Choose kit' });

describe('lobby kit picker (L76-10)', () => {
  it('Choose kit opens the picker; Close sends nothing; Select sends onChooseKit once and closes it', async () => {
    const props = makeLobbyProps({ view: guestLobbyView() });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    expect(grid().getAttribute('data-lobby-sheet')).toBe('kit-picker');
    await user.click(within(grid()).getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Choose kit' })).toBeNull();
    });
    expectNoLobbyIntent(props);
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(grid()).getByRole('button', { name: 'Wizard' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Select this kit' }));
    expect(props.onChooseKit).toHaveBeenCalledTimes(1);
    expect(props.onChooseKit).toHaveBeenCalledWith('wizard');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('keeps an excluded kit in the grid, greyed, labelled and not selectable', async () => {
    const props = makeLobbyProps({ view: guestLobbyView({ lobbyRules: { ...defaultLobbyRules(), excludedKitIds: ['ghost'] } }) });
    const { user } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    const ghost = grid().querySelector<HTMLElement>('[data-kit-picker-tile="ghost"]');
    if (ghost === null) throw new Error('no ghost tile');
    expect(within(ghost).getByText(EXCLUDED_LABEL)).toBeTruthy();
    expect(within(ghost).getByRole('button').hasAttribute('disabled')).toBe(true);
  });

  it('turning Random only on closes the picker and swaps Choose kit for the dealt line; turning it off does not reopen it', async () => {
    const props = makeLobbyProps({ view: guestLobbyView() });
    const { user, rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    rerender(<LobbyScreen {...props} view={guestLobbyView({ lobbyRules: { ...defaultLobbyRules(), randomOnly: true } })} />);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Choose kit' })).toBeNull();
    });
    expect(screen.queryByRole('button', { name: 'Choose kit' })).toBeNull();
    expect(screen.getByText(RANDOM_ONLY_LOBBY_LINE)).toBeTruthy();
    rerender(<LobbyScreen {...props} view={guestLobbyView()} />);
    expect(screen.getByRole('button', { name: 'Choose kit' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Choose kit' })).toBeNull();
    expectNoLobbyIntent(props);
  });
});
```

`apps/client/src/screens/home/solo-path.kit-picker.test.tsx` (3 tests; same `beforeEach`, `openSolo` and storage seeding as `solo-path.rules.test.tsx`, written out again in this file):

```tsx
// @vitest-environment happy-dom
/** Solo kit picker (technical spec v7 §7.1, §7.3; Appendix A `home-solo-kit-picker`, `solo-menu-rules-side-effects`). L76-10. */
import { defaultLobbyRules, latestReleaseNote } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { HOW_TO_PLAY_SEEN_KEY } from '../../ui/help-storage';
import { LAST_SEEN_RELEASE_ID_KEY } from '../../ui/release-storage';
import { EXCLUDED_LABEL } from '../../ui/ui-copy';
import { RANDOM_ONLY_SOLO_LINE } from '../kit-pick-copy';
import { HomeScreen } from './home-screen';
import { expectNoHomeIntent, makeHomeProps } from './test-home';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
  localStorage.setItem(LAST_SEEN_RELEASE_ID_KEY, latestReleaseNote().id);
});
async function openSolo(props = makeHomeProps({ nickname: 'Ada' })) {
  const result = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
  await result.user.click(screen.getByRole('button', { name: 'Play solo' }));
  return { ...result, props };
}
const grid = (): HTMLElement => screen.getByRole('dialog', { name: 'Choose kit' });
async function allClosed(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).toBeNull();
  });
}
async function editRules(user: UserEvent, control: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Table rules' }));
  await user.click(within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('button', { name: control }));
  await user.keyboard('{Escape}');
  await allClosed();
}

describe('solo kit picker (L76-10)', () => {
  it('Select only sets the local pick; nothing leaves until Start solo game', async () => {
    const { user, props } = await openSolo();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(grid()).getByRole('button', { name: 'Assassin' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Assassin' })).getByRole('button', { name: 'Select this kit' }));
    await allClosed();
    expectNoHomeIntent(props);
    expect(screen.getByText('Assassin')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'assassin', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('Back, Esc and Close keep the solo pick', async () => {
    const { user, props } = await openSolo();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(grid()).getByRole('button', { name: 'Wizard' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Wizard' })).getByRole('button', { name: 'Back' }));
    await user.click(within(grid()).getByRole('button', { name: 'Close' }));
    await allClosed();
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(grid()).getByRole('button', { name: 'Wizard' }));
    await user.keyboard('{Escape}');
    await user.keyboard('{Escape}');
    await allClosed();
    expect(screen.getByText('Random kit')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Start solo game' }));
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'normal', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('greys the kits the local rules exclude, and Random only swaps Choose kit for the dealt line', async () => {
    const { user } = await openSolo();
    await editRules(user, 'Ghost');
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    const ghost = grid().querySelector<HTMLElement>('[data-kit-picker-tile="ghost"]');
    if (ghost === null) throw new Error('no ghost tile');
    expect(within(ghost).getByText(EXCLUDED_LABEL)).toBeTruthy();
    expect(within(ghost).getByRole('button').hasAttribute('disabled')).toBe(true);
    await user.click(within(grid()).getByRole('button', { name: 'Close' }));
    await allClosed();
    await editRules(user, 'Random');
    expect(screen.queryByRole('button', { name: 'Choose kit' })).toBeNull();
    expect(screen.getByText(RANDOM_ONLY_SOLO_LINE)).toBeTruthy();
  });
});
```

That is 3 + 1 + 13 + 3 + 3 = 23 new tests (the last two `kit-picker-sheet` cases carry L76-03's deleted `lobby-kit-picker-dialog.test.tsx`, ruling X-2; check that `setup` and `head` are the file's own helpers before you use them).

- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/screens/lobby apps/client/src/screens/home`. Expected:
  - `kit-tile-stats.test.ts`, `random-kit-details.test.tsx` and `kit-picker-sheet.test.tsx` fail to resolve their modules.
  - `lobby-screen.kit-picker.test.tsx` and `solo-path.kit-picker.test.tsx` fail to resolve `RANDOM_ONLY_LOBBY_LINE` / `RANDOM_ONLY_SOLO_LINE` (not yet exported by `../kit-pick-copy`). With those stubbed they would still fail on the V2 picker: no `data-lobby-sheet` panel, excluded kits missing from the grid, no Random-only line, and the V2 dialog stays open under Random only.
  - Every other test in those folders stays green.

- [ ] **Step 3: Implement.**
  - **`kit-tile-stats.ts`** (pure; doc comment: spec v7 §7.3, §5.5, Appendix A `global-art-catalog`; the Gambler Draw is the catalog's 10, a designer question):
    - Read `getKit(kitId)` and return, in this order: `life` / `RESOURCE_CAPTIONS.life` / lives; `point` / `RESOURCE_CAPTIONS.point` / points; `upgrade` / `RESOURCE_CAPTIONS.upgradePoint` / upgradePoints; `draw` / `'Draw'` / `WEIGHTED_DRAW_LABEL` when `kit.traits.drawBustDenominator !== undefined` (the server's weighted-draw trigger, `apps/server/src/engine/turn/sample-draw-gain.ts` `rollDrawGain`), else the catalog draw; `action` / `'Action'` / action; `attack` / `'Attack'` / attack.
    - Every value is `String(n)`. `KitTile` keys stats by label, so the six labels are unique.
  - **`random-kit-details.tsx`:**
    - Move `RandomKitDetails` from `screens/lobby-kit-picker-dialog.tsx` with L76-03's two paragraphs verbatim, and export it.
    - Switch its V2 classes to V7 tokens: wrapper `flex flex-col gap-3 font-v7-body text-v7-body leading-snug font-bold`, first `<p>` `text-v7-text`, second `<p>` `text-v7-text-2`. The V2 `text-ink` is `#1c1a1f`, unreadable on the sheet's `--panel`.
    - Doc comment: spec v7 §10.1 (Lot 76 row), §7.3.
  - **`screens/kit-pick-copy.ts`:** append the two constants in Interfaces (and their two `toBe` lines in `kit-pick-copy.test.ts`).
  - **`kit-picker-sheet.tsx`** (doc comment: spec v7 §7.3, §6.7, §11 Q23, Q39; A.9 rulings 3 and 5; Appendix A rows above). State, in the "adjust state while rendering" style of `ui/primitives/slider.tsx`:

```tsx
const [kitSheet, setKitSheet] = useState<{ readonly selection: LobbyKitSelection | null; readonly epoch: number }>({ selection: null, epoch: 0 });
const sentEpoch = useRef<number | null>(null);   // Select's per-open latch (A.9 ruling 5)
const visible = open && !rules.randomOnly;        // Random only: no sheet, whatever `open` says
if (!visible && kitSheet.selection !== null) setKitSheet({ selection: null, epoch: kitSheet.epoch });   // a hidden picker reopens on the grid
```

    - `excluded = new Set<KitId>(rules.excludedKitIds)`; `preview = kitSheet.selection`; `previewExcluded = preview !== null && preview !== 'random' && excluded.has(preview)`; `selectDisabled = disabled === true || previewExcluded`.
    - `openKit(selection)` = `setKitSheet((s) => ({ selection, epoch: s.epoch + 1 }))`. `back()` = `setKitSheet((s) => ({ ...s, selection: null }))`.
    - `select()`: return when `preview === null || selectDisabled || sentEpoch.current === kitSheet.epoch`; else `sentEpoch.current = kitSheet.epoch; onSelect(preview); onClose();`. The exiting kit sheet keeps rendering with its stale handler, which the latch stops.
    - **Grid sheet:**
      - `<Sheet mode="read-only" open={visible} title="Choose kit" placement="auto" className="max-w-3xl" onClose={onClose} dataAttributes={{ 'data-lobby-sheet': 'kit-picker' }} actions={<Button variant="secondary" onClick={onClose}>Close</Button>}>`.
      - Body: the grid lead `<p>` moved verbatim from the V2 dialog (L76-03's wording), in `font-v7-body text-v7-body font-bold text-v7-text-2`. Then `<ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">` over `LOBBY_KIT_PICKER_SELECTIONS`, each `<li key={selection} data-kit-picker-tile={selection}>` holding a `KitTile`:
        - `name={lobbyKitSelectionLabel(selection)}`;
        - `portrait={<KitPortrait kitId={selection} size="tile" />}`;
        - `stats={selection === 'random' ? [] : kitTileStats(selection)}`;
        - `selected={current === selection}`;
        - `excluded={selection !== 'random' && excluded.has(selection)}`;
        - `onSelect={() => { openKit(selection); }}`.
      - No `onInfo`: the tile itself opens the sheet (ruling 3).
    - **Kit sheet:**
      - `<Sheet mode="read-only" open={visible && preview !== null} title={preview === null ? '' : lobbyKitSelectionLabel(preview)} placement="auto" onClose={back} dataAttributes={{ 'data-lobby-sheet': 'kit' }}>`.
      - Actions: `<Button variant="quiet" onClick={back}>Back</Button>` and `<Button variant="primary" disabled={selectDisabled} focusableWhenDisabled disabledReason={previewExcluded ? ILLEGAL_ACTION_COPY['choose-kit-excluded'].body : ''} onClick={select}>Select this kit</Button>`. The `''` reason keeps one element tree (`Button` G9), so focus stays on Select when it turns disabled.
      - Body: `preview === 'random' ? <RandomKitDetails /> : preview !== null ? <KitDetails kitId={preview} /> : null`.
    - Both sheets stay mounted, so a closing sheet plays its exit and press shield. Read-only depth is 2 (the grid under the kit sheet), so Esc closes only the kit sheet first (§6.7).
  - **`lobby-screen.tsx`:**
    - Replace `<LobbyKitPickerDialog open={kitPickerOpen} current={view.yourKitSelection} allowedKitIds={allowedKitIds(rules)} onClose={…} onSelect={onChooseKit} />` with `<KitPickerSheet open={kitPickerOpen} current={view.yourKitSelection} rules={rules} onSelect={onChooseKit} onClose={() => { setKitPickerOpen(false); }} />`.
    - Right after `rules` is computed, add `if (kitPickerOpen && rules.randomOnly) { setKitPickerOpen(false); }` (render-time adjust; the comment says why: turning Random only off must not reopen the picker by itself, spec v7 §7.3).
    - In the walk-in / Random only / Your kit ternary, the `rules.randomOnly ? null` branch becomes the V2-styled section `<section className="mt-6 rounded-[length:var(--radius-card)] border border-border bg-surface-raised p-4"><h2 className="text-sm font-medium text-ink-muted">Your kit</h2><p className="mt-1 text-sm text-ink-muted">{RANDOM_ONLY_LOBBY_LINE}</p></section>`. L76-12 restyles it.
    - Imports: add `KitPickerSheet` (`./kit-picker-sheet`) and `RANDOM_ONLY_LOBBY_LINE` (`../kit-pick-copy`); drop `../lobby-kit-picker-dialog` and `allowedKitIds` if unused.
  - **`home-screen.tsx`:** replace `<LobbyKitPickerDialog … allowedKitIds={allowedKitIds(solo.rules)} … />` with `<KitPickerSheet open={kitPickerOpen} current={solo.kitSelection} rules={solo.rules} disabled={busy} onClose={…} onSelect={…} />`, keeping L76-01's `onClose` and `onSelect` handlers (the latter sets `solo.kitSelection`). Drop the dialog import and `allowedKitIds` if unused. In solo the rules sheet and the picker are both modal, so Random only cannot turn on while the picker is open; `KitPickerSheet`'s own guard covers it anyway.
  - **`solo-path.tsx`:** `soloRules.randomOnly ? null : (…Your kit…)` → `soloRules.randomOnly ? (<div className="space-y-2"><p className="text-sm font-medium text-ink">Your kit</p><p className="text-sm text-ink-muted">{RANDOM_ONLY_SOLO_LINE}</p></div>) : (…unchanged…)` (V2 classes until L76-11). Import `RANDOM_ONLY_SOLO_LINE` from `../kit-pick-copy`.
  - **Delete** `apps/client/src/screens/lobby-kit-picker-dialog.tsx`, plus the moved test if L76-03 created one (see Files). `grep -rn "lobby-kit-picker-dialog\|LobbyKitPickerDialog" apps/client/src` must then return only parity ids in comments (`ui/kit/kit-details*.tsx`).

- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/screens apps/client/src/ui/primitives/kit-tile.test.tsx apps/client/src/ui/kit apps/client/src/ui/rules`. Expected: the 21 new tests pass, and `lobby-kit-picker.test.ts`, every L76-09 test and every existing test listed under Files pass with no assertion edited. If an L76-02 lobby test pins a V2-only picker detail (excluded kits absent from the grid), change only that expectation to the §7.3 behavior and say so in the commit body.

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, append under `## Home and lobby (V7 · Lot 76)` after the L76-09 bullets:

```
- `screens/lobby/kit-picker-sheet.tsx`, `kit-tile-stats.ts`, `random-kit-details.tsx`,
  `../kit-pick-copy.ts` (L76-10, spec v7 §7.3, §6.7, Q23; decisions YYYY-MM-DD): the kit picker the
  lobby and the solo menu share, as two stacked read-only sheets (`data-lobby-sheet="kit-picker"`,
  then `"kit"`). The grid, "Choose kit", lists Random then all 16 kits in
  `LOBBY_KIT_PICKER_SELECTIONS` order as `KitTile`s (`data-kit-picker-tile` on each `<li>`; stats
  from `kitTileStats`, read from `KIT_CATALOG`; the current pick is `aria-pressed`). An excluded kit
  stays in place, greyed with "Excluded"; its head is natively disabled (ruling 3), so it cannot
  open or be picked. A tile opens the kit sheet (`KitDetails`, or `RandomKitDetails` for Random)
  with Back and Select this kit. Esc steps back one level. Back, Esc and Close never change the
  pick. Select is the only commit (`onChooseKit` in the lobby, the local pick on Home), latched
  once per kit-sheet open. It turns `aria-disabled`, with the "The host has excluded that kit…"
  reason, the moment that kit is excluded, and while `disabled` (solo busy; L76-14 reconnecting).
  Under Random only the picker shows no sheet, the lobby clears its open flag so it never reopens
  by itself, and the Your kit card gives way to `RANDOM_ONLY_LOBBY_LINE` (solo:
  `RANDOM_ONLY_SOLO_LINE`). `screens/lobby-kit-picker-dialog.tsx` is deleted.
```

  - `docs/agent/frontend.md`, Screens table, Lobby row: replace `lobby-kit-picker-dialog.tsx` with `lobby/kit-picker-sheet.tsx`, matching the path style L76-02 used in that row.
  - `docs/agent/frontend.md`, V2 `**Lobby (…)**` paragraph:
    - Replace "**Your kit** (self portrait or Random) + Choose kit Dialog (allowed kit portraits + Random; click a tile for description then Select)." with "**Your kit** (self portrait or Random) + Choose kit (`screens/lobby/kit-picker-sheet.tsx`, L76-10: Random then all 16 kits, excluded ones greyed with Excluded and not selectable; a tile opens the kit sheet, then Select)."
    - In the L76-09 rules sentence, change "Random only adds the Random mark and hides the kit picker." to "Random only adds the Random mark and hides the kit picker; the Your kit card then says 'The host is dealing kits at random.'"
  - `docs/agent/decisions.md`, append (YYYY-MM-DD = the commit day):

```
## YYYY-MM-DD · [P] The kit picker lists every kit; excluded kits are greyed and cannot open (L76-10)

Source: technical spec v7 §7.3, §6.7, §11 (Q23, Q39); backlog_v7 L76-10 (Acceptance and watch
point); Lot 76 plan Appendix A.5 and A.9 rulings 3 and 5.

- **Supersedes** "only allowed kits are listed", the Lot 70 filter in
  `screens/lobby-kit-picker-dialog.tsx`. Appendix A `home-solo-kit-picker` says "Only allowed kits
  are listed (Lot 70 filter)", `lobby-kit-picker-dialog` says "allowed catalog kits only (excluded
  kits are filtered out)", and frontend.md said "allowed kit portraits + Random".
  `screens/lobby/kit-picker-sheet.tsx` lists Random, then all 16 kits in `KIT_IDS` order, in the
  lobby and on the solo menu. An excluded kit stays in place, greyed and labelled "Excluded" (Q23),
  so tiles no longer vanish under a guest's finger when the host edits the rules. An excluded kit
  still cannot be chosen, and the server's `choose-kit-excluded` check is unchanged.
- **One disabled pattern for the picker** (the L76-10 watch point; ruling 3): `KitTile` as it is.
  An excluded tile's head is natively `disabled`: it leaves the Tab order, a tap does nothing, and
  it cannot open the kit sheet. Its visible "Excluded" word is the reason. We did not use the
  arena shop's `aria-disabled` tiles (2026-11-02, L74-14). Those tiles still had something to
  show, and their long-press had to reach them. Here the rules sheet already names every excluded
  kit, and a focusable excluded tile would lead to a Select that can never succeed.
- **Select this kit** is the one control that can turn disabled under focus: the host excludes
  the kit a guest is reading. It uses `Button focusableWhenDisabled`, so focus stays on it, with the
  existing reject copy "The host has excluded that kit. Pick one that is still allowed." as its
  visible reason. It is latched once per kit-sheet open (ruling 5).
- **Random only** hides the picker. Its sheets close, the lobby clears its open flag so turning
  Random only off never reopens the picker by itself, and the Your kit card gives way to one
  line.
- **Gambler's Draw reads "5–100"** on its tile (designer 2026-11-03), not the catalog `draw: 10`:
  the server pays a weighted 5–100 Draw to any kit with `traits.drawBustDenominator`
  (`rollDrawGain`), and the Ability copy and How to play already say so. Every other tile stat is
  the raw `KIT_CATALOG` value.

---
```

  - No classification row changes: no source-text test reads the deleted file.
  - `docs/backlog_v7.md`: the L76-10 row `| M | Medium | Lot 72, L76-02, L76-03 | To do |` → `| M | Medium | Lot 72, L76-02, L76-03 | Done |`; Progress `| 76 · Home and lobby | 18 | 4 |` → `| 76 · Home and lobby | 18 | 5 |`; Total → N + 1 (76 → 77 when nothing else moved it; read it first).

- [ ] **Step 6: Verify and commit.**
  - Run `pnpm verify` and wait for it to pass.
  - Stage by name:

```
git rm apps/client/src/screens/lobby-kit-picker-dialog.tsx
git add apps/client/src/screens/lobby/kit-picker-sheet.tsx apps/client/src/screens/lobby/kit-picker-sheet.test.tsx apps/client/src/screens/lobby/kit-tile-stats.ts apps/client/src/screens/lobby/kit-tile-stats.test.ts apps/client/src/screens/lobby/random-kit-details.tsx apps/client/src/screens/lobby/random-kit-details.test.tsx apps/client/src/screens/kit-pick-copy.ts apps/client/src/screens/kit-pick-copy.test.ts apps/client/src/screens/lobby/lobby-screen.tsx apps/client/src/screens/lobby/lobby-screen.kit-picker.test.tsx apps/client/src/screens/home/home-screen.tsx apps/client/src/screens/home/solo-path.tsx apps/client/src/screens/home/solo-path.kit-picker.test.tsx apps/client/src/ui/icons/icon-names.ts apps/client/src/ui/icons/icon.tsx apps/client/src/ui/icons/icon-names.test.ts DESIGN.md docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md
```

    Add the `git rm` of an L76-03 picker test if Step 3 moved one.
  - Commit (no attribution, no trailer):

```
feat(lobby): rebuild the kit picker sheet (L76-10)

Excluded kits stay listed, greyed and labelled, and cannot open.
decisions.md supersedes the Lot 70 "only allowed kits" filter and
records the picker's one disabled pattern.
```

**Acceptance map:**
- All 16 kits plus Random are listed in order: 'lists Random then all 16 kits in KIT_IDS order, each tile named by its label'.
- An excluded kit is greyed and labeled, and it can never reach Select:
  - 'keeps an excluded kit listed, greyed and labelled Excluded; it can never open or reach Select (Q23)';
  - '… the host excludes the kit being read … (Review Focus 1)';
  - `lobby-screen.kit-picker.test.tsx` › 'keeps an excluded kit in the grid, greyed, labelled and not selectable';
  - `solo-path.kit-picker.test.tsx` › 'greys the kits the local rules exclude, …'.
- Stats come from `KIT_CATALOG`: `kit-tile-stats.test.ts` (all three), and "prints each kit's KIT_CATALOG stats on its tile, and none on Random".
- Select sends `chooseKit({ kitId })` / 'random' in the lobby and only sets local state in solo:
  - 'Choose kit opens the picker; Close sends nothing; Select sends onChooseKit once and closes it'. App's `onChooseKit={chooseKit}` sends `CHOOSE_KIT { kitId: selection }`, unchanged.
  - 'the Random tile opens Random kit with the allowed-kits copy; Select sends random'.
  - 'Select only sets the local pick; nothing leaves until Start solo game'.
- Back, Esc and close never change the selection: 'Back and Esc step back one level; Back, Esc and Close never change the pick'; 'Back, Esc and Close keep the solo pick'.
- Turning Random only on closes and hides the picker:
  - 'Random only shows no sheet even while open, …';
  - 'turning Random only on closes the picker and swaps Choose kit for the dealt line; …';
  - '… and Random only swaps Choose kit for the dealt line' (solo).
- `lobby-kit-picker.test.ts` stays green: Step 4.
- Brief items beyond the Acceptance line:
  - The current pick is `aria-pressed`: 'marks the current pick aria-pressed, and no other tile'.
  - Select turns disabled at once: Review Focus 1.
  - The Random tile copy reflects the allowed set: `random-kit-details.test.tsx`.
- `pnpm verify` green: Step 6.

**Decisions:**
- **Excluded tiles use `KitTile` as is (native `disabled` head)**, per ruling 3. Select is `focusableWhenDisabled` because it is the one control that can turn disabled while focused. Its reason is the existing reject copy, so no new string is needed.
- **Random only gives both sheets `open={false}`** rather than returning `null`, so an open picker plays its exit and keeps its press shield. "Renders nothing" holds once the exit ends. The caller's own `open` flag cannot be reset from inside, so the lobby clears it during render. The solo menu cannot reach the case.
- **Select is latched per kit-sheet open** (ruling 5): a double tap sends one `chooseKit`; a later open can select again.
- **The kit sheet is a second read-only `Sheet` (`placement="auto"`), not a step inside the grid sheet.** That is what makes Esc step back one level under the §6.7 stack. The grid uses `max-w-3xl` (the V2 width) with auto-fill columns of at least 9rem (2 on a phone, about 5 on desktop); geometry is the L76-18 gate's.
- **The Random tile has no stats** (`[]`). Its sheet's copy carries "one of the allowed kits".
- **`data-lobby-sheet` is used on Home too.** The sheet is a lobby module shared with the solo menu; A.4's `data-home-sheet` is for Part 2's Home-owned sheets.
- **`RandomKitDetails` keeps L76-03's words but takes V7 text classes**: the V2 `text-ink` would be dark on the dark sheet.
- **Stat labels reuse existing words**, spoken only: 'Lives', 'Points', 'Upgrade points' (`RESOURCE_CAPTIONS`), 'Draw', 'Action', 'Attack' (the `KitDetails` captions).
- **Designer question:**
  - Action and attack counts get two new glyphs, `action` and `attack` (controller ruling C-1: `duplication-active` would read as a live Duplication). The designer reviews the drawings at the L76-18 gate.
- **Designer answer (2026-11-03): the Gambler tile shows '5–100'**, the weighted range its Ability copy and How to play already state, not the catalog `10`. The tile follows the server's trigger (`traits.drawBustDenominator`), so only Gambler shows it. The decisions.md entry of Step 5 records that this one stat is not the raw `KIT_CATALOG` value.
- **Designer question:** the Random-only lines.
  - Lobby: 'The host is dealing kits at random.', the first sentence of the existing `choose-kit-random-only` reject.
  - Solo (new): 'Kits will be dealt at random.'
- **New or changed player-facing strings:**
  - `RANDOM_ONLY_SOLO_LINE` 'Kits will be dealt at random.' (new).
  - `RANDOM_ONLY_LOBBY_LINE` 'The host is dealing kits at random.' (existing words, newly shown in place of Your kit).
  - Select's disabled reason 'The host has excluded that kit. Pick one that is still allowed.' (existing reject copy, newly shown under the button).
  - The grid's 'Close' is unchanged. The picker no longer hides excluded kits.

---

---

### Task L76-12: Restyle the lobby around a mini arena

**Files:**
- Create (all under `apps/client/src/screens/lobby/`):
  - `lobby-copy.ts`: lobby strings and the difficulty options.
  - `lobby-seat-model.ts`: `lobbySeatRows`, `LobbySeatRow` (A.4), plus the additive `lobbyCanAddBot` and `lobbyStartReason`.
  - `lobby-header.tsx`: `LobbyHeader`.
  - `lobby-seats.tsx`: `LobbySeats`.
  - `kick-confirm-dialog.tsx`: `KickConfirmDialog`.
  - `lobby-kit-card.tsx`: `LobbyKitCard`.
  - `lobby-actions.tsx`: `LobbyActions`.
- Test (create), 27 tests:
  - `lobby-seat-model.test.ts` (6)
  - `lobby-header.test.tsx` (4)
  - `lobby-seats.test.tsx` (11)
  - `lobby-actions.test.tsx` (4)
  - `lobby-kit-card.test.tsx` (2)
- Modify:
  - `apps/client/src/screens/lobby/lobby-screen.tsx`: recomposed from the parts above, on the V7 ground.
  - `apps/client/src/ui/icons/icon-names.ts`, `icon.tsx`: add `check`.
  - `apps/client/src/ui/icons/icon-names.test.ts`: the exact list gains `check`.
  - `apps/client/src/ui/icons/icon.test.tsx`: +1 test.
  - `packages/shared/src/release-notes.ts`, `packages/shared/src/release-notes.test.ts`: the Lobby item is rewritten in place.
  - `DESIGN.md`, `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`.
- Delete (`git rm`):
  - `apps/client/src/screens/lobby/lobby-ready-mark.tsx`
  - `apps/client/src/screens/lobby/lobby-ready-mark.test.ts`
  - `apps/client/src/screens/lobby/lobby-screen.ready-chrome.test.ts`
- Existing tests that must stay green unchanged:
  - `screens/lobby/lobby-screen.test.tsx` (the 25 L76-02 tests: this is the acceptance's first clause), `screens/lobby/lobby-ready.test.ts`, `lobby-kit-picker.test.ts`.
  - The L76-09 and L76-10 tests: `ui/rules/*.test.tsx` and the kit picker tests in `screens/lobby/`.
  - `ui/icons/icon.test.tsx` (the existing `it`s iterate `ICON_NAMES` and now cover `check`), `ui/icons/no-emoji.test.ts`, `dev/ui-gallery.test.tsx` (every icon name).
  - `ui/chat/chat-log.test.tsx`, `screens/whats-new-dialog.test.ts` (the item count does not change), `App.arena.test.tsx`, `screens/home/*.test.tsx`.

**Interfaces:**
- Consumes:
  - L76-02: `LobbyScreenProps`, `test-lobby.ts` (all exports).
  - L76-09: `RulesStrip` with `editor?: RulesEditorBinding` (`../../ui/rules/rules-strip`; `{ onChange, disabled?, serverDefaultTime? }`), already mounted in `lobby-screen.tsx`.
  - L76-10: `KitPickerSheet` (`./kit-picker-sheet`; A.5 props `open, current, rules, onSelect, onClose, disabled?`) and the Random-only line it added to the lobby.
  - L76-03: the Your kit line in `lobby-screen.tsx`.
  - ui:
    - `Avatar`, `Button`, `Dialog`, `Segmented` + `SegmentedOption` (`../../ui/primitives/*`);
    - `CHROME_SHAPE_CLASS`, `CHROME_SHAPE_SM_CLASS`, `CHROME_FOCUS_CLASS` (`../../ui/primitives/chrome-classes`);
    - `Icon` (`../../ui/icons/icon`), `KitPortrait` (`../../ui/kit/kit-portrait`);
    - `PlayerName`, `BotSeatLabel` (`../../ui/seat/*`), `botSeatLabelParts` (`../../ui/seat/bot-seat-label-text`);
    - `ChatLog` (`../../ui/chat/chat-log`), `CHAT_LOG_LABEL` (`../../ui/chat/chat-line`);
    - `v7SeatColor` (`../../ui/palette`, tests).
  - Shared: `ACTION_REJECT_MESSAGE`, `BOT_DIFFICULTIES`, `MAX_PLAYERS`, `MIN_PLAYERS`, `defaultLobbyRules`, `getKit`, and the types `BotDifficulty`, `LobbyKitSelection`, `LobbyRules`, `LobbyStateView`, `SetLobbyRulesPayload`.
  - Screens:
    - `STATUS_LABELS` (`../status-labels`);
    - `lobbyGuestsReady`, `lobbyReadyLabel`, `lobbyShowsReadyToggle`, `lobbyStartEnabled` (`./lobby-ready`);
    - `lobbyKitSelectionLabel` (`./lobby-kit-picker`);
    - `FeedbackDialog` (`../../feedback/feedback-dialog`, V2 until L76-07).
- Produces (A.4 names; L76-13 … L76-16 extend these and never reshape them):

```ts
// lobby-seat-model.ts (pure)
export interface LobbySeatRow { /* A.4 verbatim: id, nickname, seatIndex, isYou, isHost, isReady, readyLabel, botDifficulty, canKick, canSetDifficulty */ }
export function lobbySeatRows(view: LobbyStateView): readonly LobbySeatRow[];
/** The viewer is the host and the table has fewer than MAX_PLAYERS seats (parity lobby-add-bot). */
export function lobbyCanAddBot(view: LobbyStateView): boolean;
/** Why Start is grey, in the server's reject words (§11 Q39); null exactly when lobbyStartEnabled(view). */
export function lobbyStartReason(view: LobbyStateView): string | null;

// lobby-header.tsx (L76-14 adds onDismissError; L76-17 adds Share)
export interface LobbyHeaderProps {
  readonly gameCode: string;
  readonly status: RoomConnectionStatus;
  readonly error: string | null;
  /** Shows 'You are the host' under the code. */
  readonly isHost: boolean;
}
export function LobbyHeader(props: LobbyHeaderProps): ReactElement;

// lobby-seats.tsx
export interface LobbySeatsProps {
  readonly view: LobbyStateView;
  /** Reconnecting (wired by L76-14): Add bot, every difficulty and Kick are disabled, and an open Kick confirm closes. */
  readonly locked: boolean;
  readonly onAddBot: (difficulty: BotDifficulty) => void;
  readonly onKickPlayer: (playerId: string) => void;
  readonly onSetBotDifficulty: (playerId: string, difficulty: BotDifficulty) => void;
}
export function LobbySeats(props: LobbySeatsProps): ReactElement;

// kick-confirm-dialog.tsx: A.4 verbatim
export interface KickConfirmDialogProps {
  readonly target: { readonly id: string; readonly nickname: string } | null;
  readonly onCancel: () => void;
  readonly onConfirm: (playerId: string) => void;
}
export function KickConfirmDialog(props: KickConfirmDialogProps): ReactElement | null;

// lobby-kit-card.tsx (L76-16 adds onReopenClaim?)
export interface LobbyKitCardProps {
  /** view.yourKitSelection. */
  readonly selection: LobbyKitSelection;
  /** view.lobbyRules ?? defaultLobbyRules(): excluded kits and Random only. */
  readonly rules: LobbyRules;
  /** view.isSpectator === true: the Watching the lobby banner, no kit card. */
  readonly walkIn: boolean;
  /** Reconnecting: Select this kit is disabled; Choose kit and the sheets stay live. */
  readonly locked: boolean;
  readonly onChooseKit: (selection: LobbyKitSelection) => void;
}
export function LobbyKitCard(props: LobbyKitCardProps): ReactElement;

// lobby-actions.tsx
export interface LobbyActionsProps {
  readonly view: LobbyStateView;
  /** Reconnecting: Start and Ready / Cancel ready are disabled; Leave and Feedback stay live. */
  readonly locked: boolean;
  readonly onStart: () => void;
  readonly onSetReady: (ready: boolean) => void;
  readonly onLeave: () => void;
}
export function LobbyActions(props: LobbyActionsProps): ReactElement;
```

`lobby-copy.ts` exports. These are the existing strings verbatim, except the two marked NEW:

| Export | Value |
|---|---|
| `LOBBY_EYEBROW` | `'Lobby'` |
| `LOBBY_TITLE` | `'Card Battle'` |
| `GAME_CODE_LABEL` | `'Game code'` |
| `COPY_LABEL` | `'Copy'` |
| `COPY_OK_TITLE` | `'Code copied'` |
| `COPY_FAILED_TITLE` | `'Copy failed'` |
| `COPY_RESULT_DISMISS_LABEL` | `'OK'` |
| `copyResultBody(gameCode, failed)` | `` `Could not copy automatically. Game code: ${gameCode}` `` / `` `Share this code with friends: ${gameCode}` `` |
| `HOST_LINE` | `'You are the host'` |
| `YOUR_KIT_TITLE` | `'Your kit'` |
| `CHOOSE_KIT_LABEL` | `'Choose kit'` |
| `WATCHING_TITLE` | `'Watching the lobby'` |
| `WATCHING_BODY` | `'Claim a disconnected seat if one is listed, or leave and join again later.'` |
| `lobbyPlayersHeading(count)` | `` `Players (${count}/${MAX_PLAYERS})` `` |
| `LOBBY_YOU_SUFFIX` | `' (you)'` |
| `LOBBY_HOST_TAG` | `'Host'` |
| `KICK_LABEL` | `'Kick'` |
| `KICK_TITLE` | `'Kick this player?'` |
| `kickConfirmBody(nickname)` | `` `${nickname} will leave this lobby. They can join again with the code.` `` |
| `KICK_CANCEL_LABEL` | `'Cancel'` |
| `ADD_BOT_LABEL` | `'Add bot'` |
| `ADD_BOT_DIFFICULTY_LABEL` | `'New bot difficulty'` **NEW** (radiogroup name) |
| `botDifficultyLabel(nickname)` | `` `${nickname} difficulty` `` **NEW** (radiogroup name, A.4) |
| `BOT_DIFFICULTY_OPTIONS` | `BOT_DIFFICULTIES.map((value) => ({ value, label: botSeatLabelParts(value).tier }))`, typed `readonly SegmentedOption<BotDifficulty>[]` (Easy / Normal / Hard, through `ui/seat`, because the lobby may not import `bots/`) |
| `START_LABEL` | `'Start game'` |
| `READY_BUTTON_LABEL` | `'Ready'` |
| `CANCEL_READY_LABEL` | `'Cancel ready'` |
| `PRESS_READY_HINT` | `'Press Ready when you are set.'` |
| `WAITING_FOR_HOST_HINT` | `'Waiting for the host to start…'` |
| `LEAVE_LABEL` | `'Leave'` |
| `FEEDBACK_LABEL` | `'Feedback'` |

The Your kit sentence and the Random-only line are NOT copied here (consistency ruling X-1): `LobbyKitCard` imports `KIT_PRIVACY_COPY` and `RANDOM_ONLY_LOBBY_LINE` from `../kit-pick-copy` (L76-03 / L76-10), and L76-03's lobby test that expects the Your kit text to be exactly `KIT_PRIVACY_COPY` stays green.

- [ ] **Step 1: Write the failing tests.**

Shared preamble for the four `.tsx` files. Each opens with `// @vitest-environment happy-dom` and imports:
- `afterEach`, `describe`, `expect`, `it`, `vi` (`vitest`);
- `renderUi` (`../../test/render`);
- `LobbyScreen`, `type LobbyScreenProps` (`./lobby-screen`);
- from `./test-lobby`: `expectNoLobbyIntent`, `guestLobbyView`, `hostLobbyView`, `isLobbyControlDisabled`, `LOBBY_BOT`, `LOBBY_GUEST`, `LOBBY_HOST`, `lobbySeat`, `makeLobbyProps`, `walkInLobbyView` (each file imports only the ones it uses).

Each file declares `renderLobby` and the `afterEach`; `lobby-seats.test.tsx` also declares `cssColor` (the only file that uses it; an unused declaration fails `noUnusedLocals` and lint):

```tsx
function renderLobby(overrides: Partial<LobbyScreenProps> = {}) {
  const props = makeLobbyProps(overrides);
  return { ...renderUi(<LobbyScreen {...props} />, { reducedMotion: true }), props };
}
afterEach(() => {
  vi.restoreAllMocks();
});
// lobby-seats.test.tsx only:
/** A hex as happy-dom reads it back (the PlayerName test pattern). */
function cssColor(hex: string): string {
  const probe = document.createElement('span');
  probe.style.color = hex;
  return probe.style.color;
}
```

`apps/client/src/screens/lobby/lobby-seat-model.test.ts` (6 tests, node):

```ts
/** Lobby seat rows: technical spec v7 §7.2, §11 (Q25, Q39); parity lobby-player-list, lobby-add-bot (L76-12). */
import { ACTION_REJECT_MESSAGE } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { lobbyCanAddBot, lobbySeatRows, lobbyStartReason } from './lobby-seat-model';
import { guestLobbyView, hostLobbyView, LOBBY_BOT, LOBBY_GUEST, LOBBY_HOST, walkInLobbyView } from './test-lobby';

describe('lobbySeatRows', () => {
  it('gives one row per seat, in view.players order, with that index as the seat hue', () => {
    const rows = lobbySeatRows(hostLobbyView({ players: [LOBBY_GUEST, LOBBY_BOT, LOBBY_HOST] }));
    expect(rows.map((row) => [row.id, row.seatIndex])).toEqual([['guest', 0], ['bot-1', 1], ['host', 2]]);
  });
  it('marks you, the host, the ready words and the bot tier', () => {
    expect(lobbySeatRows(guestLobbyView())).toEqual([
      { id: 'host', nickname: 'Ada', seatIndex: 0, isYou: false, isHost: true, isReady: true, readyLabel: 'Ready', botDifficulty: null, canKick: false, canSetDifficulty: false },
      { id: 'guest', nickname: 'Bea', seatIndex: 1, isYou: true, isHost: false, isReady: false, readyLabel: 'Not ready', botDifficulty: null, canKick: false, canSetDifficulty: false },
      { id: 'bot-1', nickname: 'Bot Cy', seatIndex: 2, isYou: false, isHost: false, isReady: true, readyLabel: 'Ready', botDifficulty: 'normal', canKick: false, canSetDifficulty: false },
    ]);
  });
  it('lets the host kick every other seat and set a difficulty on bots only', () => {
    expect(lobbySeatRows(hostLobbyView()).map((row) => [row.id, row.canKick, row.canSetDifficulty])).toEqual([
      ['host', false, false], ['guest', true, false], ['bot-1', true, true],
    ]);
  });
  it('gives a walk-in no own seat and no control', () => {
    expect(lobbySeatRows(walkInLobbyView()).some((row) => row.isYou || row.canKick || row.canSetDifficulty)).toBe(false);
  });
});

describe('lobbyCanAddBot', () => {
  it('opens Add bot to the host below 8 seats only', () => {
    const bots = (count: number) => Array.from({ length: count }, (_, index) => ({ ...LOBBY_BOT, id: `bot-${index}` }));
    expect(lobbyCanAddBot(hostLobbyView({ players: [LOBBY_HOST, ...bots(6)] }))).toBe(true);
    expect(lobbyCanAddBot(hostLobbyView({ players: [LOBBY_HOST, ...bots(7)] }))).toBe(false);
    expect(lobbyCanAddBot(guestLobbyView())).toBe(false);
  });
});

describe('lobbyStartReason', () => {
  it('names why Start is grey with the reject words, and nothing once lobbyStartEnabled', () => {
    expect(lobbyStartReason(hostLobbyView({ players: [LOBBY_HOST] }))).toBe(ACTION_REJECT_MESSAGE['start-not-enough-players']);
    expect(lobbyStartReason(hostLobbyView())).toBe(ACTION_REJECT_MESSAGE['start-not-all-ready']);
    expect(lobbyStartReason(hostLobbyView({ players: [LOBBY_HOST, { ...LOBBY_GUEST, isReady: true }] }))).toBeNull();
    expect(lobbyStartReason(hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] }))).toBeNull();
  });
});
```

`apps/client/src/screens/lobby/lobby-header.test.tsx` (4 tests). Imports: `screen`, `waitFor`, `within`; `STATUS_LABELS` (`../status-labels`); from `./lobby-copy`: `COPY_FAILED_TITLE`, `COPY_LABEL`, `COPY_OK_TITLE`, `COPY_RESULT_DISMISS_LABEL`, `copyResultBody`, `HOST_LINE`, `LOBBY_EYEBROW`, `LOBBY_TITLE`; and the test-lobby helpers.

```tsx
describe('LobbyHeader (spec v7 §7.2; parity lobby-header-status, lobby-game-code)', () => {
  it('puts the lobby on the V7 ground with the eyebrow, title, status line and inline alert', () => {
    const { props, rerender } = renderLobby({ error: 'That seat was not found.' });
    expect(screen.getByRole('main').classList.contains('v7-ground')).toBe(true);
    expect(screen.getByText(LOBBY_EYEBROW)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: LOBBY_TITLE })).toBeTruthy();
    expect(screen.getByText(STATUS_LABELS.connected)).toBeTruthy();
    expect(within(screen.getByRole('main')).getByRole('alert').textContent).toContain('That seat was not found.');
    rerender(<LobbyScreen {...props} status="reconnecting" error={null} />);
    expect(screen.getByText(STATUS_LABELS.reconnecting)).toBeTruthy();
    expect(within(screen.getByRole('main')).queryByRole('alert')).toBeNull();
  });
  it('tells the host they are the host, and nobody else', () => {
    const { unmount } = renderLobby();
    expect(screen.getByText(HOST_LINE)).toBeTruthy();
    unmount();
    renderLobby({ view: guestLobbyView() });
    expect(screen.queryByText(HOST_LINE)).toBeNull();
  });
  it('copies the code and says Code copied, sending nothing', async () => {
    const { user, props } = renderLobby();
    // `renderUi`'s user-event setup installed a clipboard stub on navigator.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: COPY_LABEL }));
    const dialog = await screen.findByRole('dialog', { name: COPY_OK_TITLE });
    expect(writeText).toHaveBeenCalledWith('ABCDEF');
    expect(dialog.getAttribute('data-lobby-sheet')).toBe('copy-result');
    expect(within(dialog).getByText(copyResultBody('ABCDEF', false))).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: COPY_RESULT_DISMISS_LABEL }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: COPY_OK_TITLE })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });
  it('shows the code in the dialog when the copy fails', async () => {
    const { user, props } = renderLobby();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    await user.click(screen.getByRole('button', { name: COPY_LABEL }));
    const dialog = await screen.findByRole('dialog', { name: COPY_FAILED_TITLE });
    expect(within(dialog).getByText('Could not copy automatically. Game code: ABCDEF')).toBeTruthy();
    expectNoLobbyIntent(props);
  });
});
```

`apps/client/src/screens/lobby/lobby-seats.test.tsx` (11 tests). Imports:
- `fireEvent`, `screen`, `waitFor`, `within`;
- `ACTION_REJECT_MESSAGE` and `type LobbySeatView` (shared);
- `v7SeatColor`;
- from `./lobby-copy`: `ADD_BOT_DIFFICULTY_LABEL`, `ADD_BOT_LABEL`, `botDifficultyLabel`, `KICK_LABEL`, `KICK_TITLE`, `lobbyPlayersHeading`;
- `LobbySeats`, `type LobbySeatsProps`;
- the test-lobby helpers.

```tsx
/** Eight seats with 24-character nicknames: the host, then bots and humans in turn; p2 is not ready. */
const FULL_TABLE: readonly LobbySeatView[] = Array.from({ length: 8 }, (_, index): LobbySeatView => {
  const nickname = `Seat ${index} with a long name`.padEnd(24, '.');
  return index % 2 === 1
    ? { id: `p${index}`, nickname, isBot: true, botDifficulty: 'easy', isReady: true }
    : { id: `p${index}`, nickname, isBot: false, isReady: index !== 2 };
});
const fullTable = () => hostLobbyView({ you: 'p0', hostPlayerId: 'p0', players: FULL_TABLE });

describe('seats as a mini arena (spec v7 §7.2, §11 Q25)', () => {
  it('colors each seat by its view.players index, avatar and name alike', () => {
    const players = [LOBBY_GUEST, LOBBY_BOT, LOBBY_HOST];
    renderLobby({ view: hostLobbyView({ players }) });
    players.forEach((seat, index) => {
      const element = lobbySeat(seat.id);
      const name = within(element).getByText(seat.nickname);
      expect([name.getAttribute('data-seat-index'), name.style.color]).toEqual([String(index), cssColor(v7SeatColor(index))]);
      const hues = [...element.querySelectorAll('[data-seat-index]')].map((node) => node.getAttribute('data-seat-index'));
      expect(hues.length, `${seat.id} avatar and name`).toBeGreaterThanOrEqual(2);
      expect(new Set(hues)).toEqual(new Set([String(index)]));
    });
  });
  it('keeps eight 24-character nicknames whole, as text and in the difficulty names, with no kit on any seat', () => {
    renderLobby({ view: fullTable() });
    expect(screen.getByRole('heading', { name: lobbyPlayersHeading(8) })).toBeTruthy();
    for (const seat of FULL_TABLE) {
      expect(seat.nickname).toHaveLength(24);
      const element = lobbySeat(seat.id);
      expect(within(element).getByText(seat.nickname)).toBeTruthy();
      expect(element.querySelector('[data-zone="kit-portrait"]')).toBeNull();
      if (seat.isBot) expect(within(element).getByRole('radiogroup', { name: botDifficultyLabel(seat.nickname) })).toBeTruthy();
    }
  });
  it('marks each seat with a check or a cross icon, named Ready or Not ready', () => {
    renderLobby();
    expect(within(lobbySeat('host')).getByRole('img', { name: 'Ready' }).getAttribute('data-icon')).toBe('check');
    expect(within(lobbySeat('guest')).getByRole('img', { name: 'Not ready' }).getAttribute('data-icon')).toBe('close');
    expect(within(lobbySeat('bot-1')).getByRole('img', { name: 'Ready' }).getAttribute('data-icon')).toBe('check');
  });
});

describe('Add bot and bot difficulty (parity lobby-add-bot, lobby-player-list)', () => {
  it('adds a bot at the chosen difficulty, and choosing alone sends nothing', async () => {
    const { user, props } = renderLobby();
    const choice = screen.getByRole('radiogroup', { name: ADD_BOT_DIFFICULTY_LABEL });
    expect(within(choice).getByRole('radio', { name: 'Normal' }).getAttribute('aria-checked')).toBe('true');
    await user.click(within(choice).getByRole('radio', { name: 'Hard' }));
    expectNoLobbyIntent(props);
    await user.click(screen.getByRole('button', { name: ADD_BOT_LABEL }));
    expect(props.onAddBot).toHaveBeenCalledTimes(1);
    expect(props.onAddBot).toHaveBeenCalledWith('hard');
  });
  it('disables Add bot and its difficulty at 8 seats, with the room-full reason', () => {
    const { props } = renderLobby({ view: fullTable() });
    const addBot = screen.getByRole('button', { name: ADD_BOT_LABEL });
    expect(isLobbyControlDisabled(addBot)).toBe(true);
    expect(screen.getByText(ACTION_REJECT_MESSAGE['add-bot-room-full'])).toBeTruthy();
    fireEvent.click(addBot);
    expect(props.onAddBot).not.toHaveBeenCalled();
    for (const radio of within(screen.getByRole('radiogroup', { name: ADD_BOT_DIFFICULTY_LABEL })).getAllByRole('radio')) {
      expect(isLobbyControlDisabled(radio)).toBe(true);
    }
  });
  it('sends setBotDifficulty from a bot difficulty control, only for a new tier', async () => {
    const { user, props } = renderLobby();
    const control = within(lobbySeat('bot-1')).getByRole('radiogroup', { name: botDifficultyLabel('Bot Cy') });
    await user.click(within(control).getByRole('radio', { name: 'Normal' }));
    expect(props.onSetBotDifficulty).not.toHaveBeenCalled();
    await user.click(within(control).getByRole('radio', { name: 'Hard' }));
    expect(props.onSetBotDifficulty).toHaveBeenCalledTimes(1);
    expect(props.onSetBotDifficulty).toHaveBeenCalledWith('bot-1', 'hard');
  });
  it('gives a guest and a walk-in no difficulty control and no Add bot', () => {
    for (const view of [guestLobbyView(), walkInLobbyView()]) {
      const { unmount } = renderLobby({ view });
      expect(screen.queryAllByRole('radiogroup')).toHaveLength(0);
      expect(screen.queryByRole('button', { name: ADD_BOT_LABEL })).toBeNull();
      unmount();
    }
  });
});

describe('Kick confirm (plan Review Focus 4)', () => {
  it('closes the confirm and sends nothing when the target leaves, and does not reopen when it returns', async () => {
    const { user, props, rerender } = renderLobby();
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: KICK_LABEL }));
    expect(screen.getByRole('dialog', { name: KICK_TITLE }).getAttribute('data-lobby-sheet')).toBe('kick-confirm');
    rerender(<LobbyScreen {...props} view={hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] })} />);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: KICK_TITLE })).toBeNull();
    });
    rerender(<LobbyScreen {...props} view={hostLobbyView()} />);
    expect(screen.queryByRole('dialog', { name: KICK_TITLE })).toBeNull();
    expectNoLobbyIntent(props);
  });
  it('sends one kickPlayer on a double click of the confirm Kick', async () => {
    const { user, props } = renderLobby();
    await user.click(within(lobbySeat('bot-1')).getByRole('button', { name: KICK_LABEL }));
    const kick = within(screen.getByRole('dialog', { name: KICK_TITLE })).getByRole('button', { name: KICK_LABEL });
    fireEvent.click(kick);
    fireEvent.click(kick);
    expect(props.onKickPlayer).toHaveBeenCalledTimes(1);
    expect(props.onKickPlayer).toHaveBeenCalledWith('bot-1');
  });
});

describe('LobbySeats while locked (plan A.4; L76-14 wires the status)', () => {
  function seatsProps(overrides: Partial<LobbySeatsProps> = {}): LobbySeatsProps {
    return { view: hostLobbyView(), locked: true, onAddBot: vi.fn(), onKickPlayer: vi.fn(), onSetBotDifficulty: vi.fn(), ...overrides };
  }
  it('disables Add bot, every difficulty and every Kick, and a Kick press opens nothing', () => {
    const props = seatsProps();
    renderUi(<LobbySeats {...props} />, { reducedMotion: true });
    expect(isLobbyControlDisabled(screen.getByRole('button', { name: ADD_BOT_LABEL }))).toBe(true);
    for (const radio of screen.getAllByRole('radio')) expect(isLobbyControlDisabled(radio)).toBe(true);
    for (const kick of screen.getAllByRole('button', { name: KICK_LABEL })) {
      expect(isLobbyControlDisabled(kick)).toBe(true);
      fireEvent.click(kick);
    }
    expect(screen.queryByRole('dialog')).toBeNull();
    for (const spy of [props.onAddBot, props.onKickPlayer, props.onSetBotDifficulty]) expect(spy).not.toHaveBeenCalled();
  });
  it('closes an open Kick confirm when the lobby locks, and does not reopen it after', async () => {
    const props = seatsProps({ locked: false });
    const { user, rerender } = renderUi(<LobbySeats {...props} />, { reducedMotion: true });
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: KICK_LABEL }));
    expect(screen.getByRole('dialog', { name: KICK_TITLE })).toBeTruthy();
    rerender(<LobbySeats {...props} locked />);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: KICK_TITLE })).toBeNull();
    });
    rerender(<LobbySeats {...props} locked={false} />);
    expect(screen.queryByRole('dialog', { name: KICK_TITLE })).toBeNull();
    expect(props.onKickPlayer).not.toHaveBeenCalled();
  });
});
```

`apps/client/src/screens/lobby/lobby-actions.test.tsx` (4 tests). Imports:
- `fireEvent`, `screen`, `waitFor`;
- `ACTION_REJECT_MESSAGE` (shared);
- from `./lobby-copy`: `CANCEL_READY_LABEL`, `FEEDBACK_LABEL`, `LEAVE_LABEL`, `READY_BUTTON_LABEL`, `START_LABEL`;
- `LobbyActions`;
- the test-lobby helpers.

```tsx
const READY_GUEST = { ...LOBBY_GUEST, isReady: true };

describe('LobbyActions (spec v7 §7.2, §11 Q39; parity lobby-action-row)', () => {
  it('puts the check icon on Ready and none on Cancel ready', () => {
    const { unmount } = renderLobby({ view: guestLobbyView() });
    expect(screen.getByRole('button', { name: READY_BUTTON_LABEL }).querySelector('[data-icon="check"]')).not.toBeNull();
    unmount();
    renderLobby({ view: guestLobbyView({ players: [LOBBY_HOST, READY_GUEST, LOBBY_BOT] }) });
    expect(screen.getByRole('button', { name: CANCEL_READY_LABEL }).querySelector('[data-icon]')).toBeNull();
  });
  it('tells the host why Start is grey, and nothing once the table can start', () => {
    const first = renderLobby();
    expect(screen.getByText(ACTION_REJECT_MESSAGE['start-not-all-ready'])).toBeTruthy();
    first.unmount();
    const alone = renderLobby({ view: hostLobbyView({ players: [LOBBY_HOST] }) });
    expect(screen.getByText(ACTION_REJECT_MESSAGE['start-not-enough-players'])).toBeTruthy();
    alone.unmount();
    renderLobby({ view: hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] }) });
    expect(screen.queryByText(ACTION_REJECT_MESSAGE['start-not-all-ready'])).toBeNull();
    expect(screen.queryByText(ACTION_REJECT_MESSAGE['start-not-enough-players'])).toBeNull();
  });
  it('while locked, disables Start and keeps Leave and Feedback live (plan A.4)', async () => {
    const onStart = vi.fn();
    const onLeave = vi.fn();
    const { user } = renderUi(
      <LobbyActions view={hostLobbyView({ players: [LOBBY_HOST, LOBBY_BOT] })} locked onStart={onStart} onSetReady={vi.fn()} onLeave={onLeave} />,
      { reducedMotion: true },
    );
    const start = screen.getByRole('button', { name: START_LABEL });
    expect(isLobbyControlDisabled(start)).toBe(true);
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: FEEDBACK_LABEL }));
    expect(screen.getByRole('dialog', { name: 'Feedback' })).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull();
    });
    await user.click(screen.getByRole('button', { name: LEAVE_LABEL }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
  it('while locked, disables Ready and sends nothing', () => {
    const onSetReady = vi.fn();
    renderUi(<LobbyActions view={guestLobbyView()} locked onStart={vi.fn()} onSetReady={onSetReady} onLeave={vi.fn()} />, { reducedMotion: true });
    const ready = screen.getByRole('button', { name: READY_BUTTON_LABEL });
    expect(isLobbyControlDisabled(ready)).toBe(true);
    fireEvent.click(ready);
    expect(onSetReady).not.toHaveBeenCalled();
  });
});
```

`apps/client/src/screens/lobby/lobby-kit-card.test.tsx` (2 tests). Imports:
- `fireEvent`, `screen`, `within`;
- `defaultLobbyRules`, `getKit` (shared);
- `CHOOSE_KIT_LABEL`, `YOUR_KIT_TITLE` (`./lobby-copy`);
- `LobbyKitCard`;
- the test-lobby helpers.

```tsx
describe('LobbyKitCard (spec v7 §7.2, §7.3; parity lobby-your-kit)', () => {
  it('shows the current pick as a kit portrait and its label', () => {
    renderLobby({ view: hostLobbyView({ yourKitSelection: 'assassin' }) });
    const card = screen.getByRole('region', { name: YOUR_KIT_TITLE });
    expect(card.querySelector('[data-zone="kit-portrait"]')?.getAttribute('data-kit-face')).toBe('art');
    expect(within(card).getByText(getKit('assassin').name)).toBeTruthy();
  });
  it('while locked, still opens the picker, and Select this kit is disabled (plan A.4)', async () => {
    const onChooseKit = vi.fn();
    const { user } = renderUi(
      <LobbyKitCard selection="random" rules={defaultLobbyRules()} walkIn={false} locked onChooseKit={onChooseKit} />,
      { reducedMotion: true },
    );
    await user.click(screen.getByRole('button', { name: CHOOSE_KIT_LABEL }));
    await user.click(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByRole('button', { name: getKit('assassin').name }));
    const select = screen.getByRole('button', { name: 'Select this kit' });
    expect(isLobbyControlDisabled(select)).toBe(true);
    fireEvent.click(select);
    expect(onChooseKit).not.toHaveBeenCalled();
  });
});
```

`apps/client/src/ui/icons/icon-names.test.ts`:
- L76-10 already added `const L76_ADDED_NAMES = ['action', 'attack'];` (consistency ruling C-1). Extend it to `['action', 'attack', 'check']` and its doc comment ("…the kit tile stat glyphs (L76-10) and the lobby Ready mark and Ready button (L76-12)").
- The first `it` becomes `it('lists the §5.6 set, then the L72 additions, then the L76 check, in order', …)`, with `expect([...ICON_NAMES]).toEqual([...SPEC_ICON_NAMES, ...L72_ADDED_NAMES, ...L76_ADDED_NAMES])`.

`apps/client/src/ui/icons/icon.test.tsx`, +1 test inside `describe('Icon (technical spec v7 §5.6)')`:

```tsx
  it('draws the ready check with a --cta body, a different shape from the not-ready close cross (L76-12)', () => {
    const check = svgOf({ name: 'check' });
    expect(check.querySelector(`[fill="${V7_COLORS.cta}"]`)).not.toBeNull();
    expect(shapeOf(check)).not.toBe(shapeOf(svgOf({ name: 'close' })));
  });
```

`packages/shared/src/release-notes.test.ts`: in `writes lot-72-v7 as the New look entry …`, change the Lobby item that L76-09 added to the `toEqual` to `{ before: 'The lobby was a plain list, and only the host could open the table rules.', after: 'The lobby shows each seat in its player color, and everyone can open the table rules.' }`, at the same position.

New tests: 6 + 4 + 11 + 4 + 2 + 1 = 28. The `icon-names` and `release-notes` `it`s are changed, not added.

- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/screens/lobby/ apps/client/src/ui/icons/ packages/shared/src/release-notes.test.ts`. Expected:
  - The five new lobby files fail to resolve `./lobby-seat-model`, `./lobby-copy`, `./lobby-seats`, `./lobby-actions` or `./lobby-kit-card`.
  - `icon-names.test.ts` fails on the list.
  - The new `icon.test.tsx` case renders an empty glyph for `check`, so `querySelector` returns null.
  - `release-notes.test.ts` fails on the Lobby item text.
  - `lobby-screen.test.tsx` (25), `lobby-ready-mark.test.ts` and `lobby-screen.ready-chrome.test.ts` still pass on the V2 layout.

- [ ] **Step 3: Implement.**
  - **`ui/icons`:**
    - `icon-names.ts`: append `'check'` after L76-10's `'action', 'attack'` (the end of the list), under the comment `// L76-12: the lobby Ready mark and Ready button.`. Update the file doc comment ("then five L72 additions … then the L76 `action`, `attack` and `check`").
    - `icon.tsx`, in `glyphs`: add `check: <path d="M2.5 13 6 9.5l4 4L18 5.5l3.5 3.5L10 20.5z" fill={paint.cta} />` after `random`, commented "A filled outlined check, the Ready mark (L76-12); Not ready is `close`". It stays inside 0..24 with its outline (1.5..22.5 × 4.5..21.5) and spans 19 units (DESIGN.md › Optical size).
  - **`lobby-seat-model.ts`** (pure; doc cites spec v7 §7.2, §11 Q25 and Q39):
    - `lobbySeatRows`: `isHostViewer = view.hostPlayerId === view.you`. Map `view.players` with its index to the A.4 row: `canKick = isHostViewer && seat.id !== view.you`, `botDifficulty = seat.isBot ? seat.botDifficulty ?? null : null`, `readyLabel = lobbyReadyLabel(seat.isReady)`.
    - `lobbyCanAddBot`: `view.hostPlayerId === view.you && view.players.length < MAX_PLAYERS`.
    - `lobbyStartReason`: returns `ACTION_REJECT_MESSAGE['start-not-enough-players']` when `players.length < MIN_PLAYERS`, else `ACTION_REJECT_MESSAGE['start-not-all-ready']` when `!lobbyGuestsReady(view)`, else `null`. These are the two conditions of `lobbyStartEnabled`, so the reason is null exactly when Start is enabled. It decides nothing new.
  - **`lobby-copy.ts`**: the table above (the kit privacy and Random-only lines stay in `../kit-pick-copy`).
  - **`kick-confirm-dialog.tsx`** (doc: spec v7 §7.2 'Kick (confirm)', L57-09, plan A.9 ruling 5, Review Focus 4):
    - V7 `Dialog`: `open={target !== null}`, `title={KICK_TITLE}`, `onClose={onCancel}` (Esc, backdrop and swipe mean Cancel), `dataAttributes={{ 'data-lobby-sheet': 'kick-confirm' }}`.
    - Actions: `<Button variant="quiet" onClick={onCancel}>{KICK_CANCEL_LABEL}</Button>`, then `<Button variant="danger" onClick={confirm}>{KICK_LABEL}</Button>`. Cancel comes first, so it takes the initial focus.
    - Body: `<p className="font-v7-body text-v7-body text-v7-text">{kickConfirmBody(target.nickname)}</p>` while the target is set.
    - The latch is local; nothing is imported from `screens/arena/`:

```tsx
const targetId = target?.id ?? null;
const [openedId, setOpenedId] = useState<string | null>(targetId);
const [epoch, setEpoch] = useState(targetId === null ? 0 : 1);
// Each new target is a new open (adjust state while rendering, as screens/arena/top-bar.tsx does).
if (targetId !== openedId) {
  setOpenedId(targetId);
  if (targetId !== null) setEpoch(epoch + 1);
}
// One Kick per open. While the Dialog exits, AnimatePresence keeps its stale handler, which still
// holds the target; the ref is read at call time (decisions.md 2026-10-28).
const sentEpoch = useRef<number | null>(null);
const confirm = (): void => {
  if (target === null || sentEpoch.current === epoch) return;
  sentEpoch.current = epoch;
  onConfirm(target.id);
};
```

  - **`lobby-seats.tsx`** (doc: spec v7 §7.2, §11 Q25; parity `lobby-player-list`, `lobby-add-bot`, `lobby-host-seat-kick`):
    - **State and derived values:**
      - `useState<string | null>` for `kickTargetId`; `useState<BotDifficulty>('normal')` for the Add bot pick.
      - `rows = lobbySeatRows(view)`, `isHost = view.hostPlayerId === view.you`, `canAdd = lobbyCanAddBot(view)`.
      - The confirm target: a seat that left, or a lock, closes the confirm for good.

```tsx
const kickRow = kickTargetId === null ? undefined : rows.find((row) => row.id === kickTargetId);
if (kickTargetId !== null && (kickRow === undefined || locked)) setKickTargetId(null);
const target = kickRow === undefined || locked ? null : { id: kickRow.id, nickname: kickRow.nickname };
```

    - **Section:** `<section aria-labelledby={headingId} className={`@container ${CHROME_SHAPE_CLASS} bg-v7-panel p-3`}>` with `<h2 id={headingId} className="font-v7-display text-v7-title leading-none text-v7-text">{lobbyPlayersHeading(view.players.length)}</h2>`.
    - **Seat list:** `<ol className="mt-3 grid grid-cols-1 gap-3 @min-[34rem]:grid-cols-2">`, with one `<li data-lobby-seat={row.id} className={`${CHROME_SHAPE_SM_CLASS} flex min-w-0 flex-col gap-2 bg-v7-panel-2 p-2`}>` per row. The order comes from the view; nothing sorts.
    - **Identity row,** `flex min-w-0 items-center gap-2`, in this DOM order (the A.4 hook):
      1. `<Icon name={row.isReady ? 'check' : 'close'} label={row.readyLabel} className="shrink-0" />`.
      2. `<span aria-hidden="true" className="inline-flex shrink-0"><Avatar name={row.nickname} seatIndex={row.seatIndex} size="sm" /></span>`. It is hidden because the name is already text (Lot 74 G3).
      3. A `flex min-w-0 flex-1 flex-col` column. First line: `<PlayerName nickname={row.nickname} seatIndex={row.seatIndex} className="min-w-0 wrap-anywhere text-v7-title leading-tight" />`, then `{row.isYou ? <span …caption text-v7-text-2>{LOBBY_YOU_SUFFIX}</span> : null}` in a `flex min-w-0 flex-wrap items-baseline gap-x-1` line. Second line, only when one applies: the `LOBBY_HOST_TAG` chip (`rounded-v7-chrome-sm bg-v7-panel px-1.5 py-0.5 font-v7-body text-v7-micro font-extrabold uppercase tracking-wide text-v7-text-2`, the `BotSeatLabel` chip shape) and `<BotSeatLabel difficulty={row.botDifficulty} />` for a bot, shown to every recipient.
    - **Host controls,** only when `row.canKick`: a `flex flex-wrap items-center gap-2` row.
      - When `row.canSetDifficulty`: `<Segmented<BotDifficulty> label={botDifficultyLabel(row.nickname)} options={BOT_DIFFICULTY_OPTIONS} value={row.botDifficulty} onChange={(next) => { onSetBotDifficulty(row.id, next); }} disabled={locked} />`. `Segmented` sends nothing for the checked option. Narrow `row.botDifficulty` to non-null for the `value` prop.
      - Then `<Button variant="quiet" disabled={locked} focusableWhenDisabled onClick={() => { setKickTargetId(row.id); }}>{KICK_LABEL}</Button>`.
    - **Add bot,** host only, after the `<ol>`: `<div data-lobby-add-bot className="mt-3 flex flex-wrap items-start gap-2">` holding:
      - `<Segmented<BotDifficulty> label={ADD_BOT_DIFFICULTY_LABEL} options={BOT_DIFFICULTY_OPTIONS} value={addDifficulty} onChange={setAddDifficulty} disabled={locked || !canAdd} />`;
      - `<Button variant="secondary" disabled={locked || !canAdd} focusableWhenDisabled disabledReason={canAdd ? '' : ACTION_REJECT_MESSAGE['add-bot-room-full']} onClick={() => { onAddBot(addDifficulty); }}>{ADD_BOT_LABEL}</Button>`. The reason is always a string, so the Button keeps one element tree and a focused Add bot keeps its focus when the eighth seat lands (Lot 74 G9). An empty reason never shows. The V2 "Add bot" heading is gone; the button keeps the words.
    - **Confirm:** after the section, as a sibling (a fragment), `<KickConfirmDialog target={target} onCancel={() => { setKickTargetId(null); }} onConfirm={(playerId) => { setKickTargetId(null); onKickPlayer(playerId); }} />`. It is never inside a clickable element.
  - **`lobby-header.tsx`** (doc: spec v7 §7.2; parity `lobby-header-status`, `lobby-game-code`). It returns a fragment:
    - A `<header className="flex flex-col gap-1">` with:
      - the eyebrow `<p>` (`font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.14em] text-v7-text-2`);
      - `<h1 className="font-v7-display text-v7-display leading-none text-v7-text">{LOBBY_TITLE}</h1>`;
      - the status `<p>` `{STATUS_LABELS[status]}` (`font-v7-body text-v7-body font-bold text-v7-text-2`);
      - while `error !== null`, `<p role="alert" className={`${CHROME_SHAPE_SM_CLASS} bg-v7-panel-2 px-3 py-2 font-v7-body text-v7-body font-bold text-v7-text ring-2 ring-inset ring-v7-danger`}>{error}</p>`. L76-14 adds the dismiss.
    - The code card, `<section aria-labelledby={codeId} className={`${CHROME_SHAPE_CLASS} bg-v7-panel p-4`}>`, with:
      - `<h2 id={codeId}>{GAME_CODE_LABEL}</h2>` (caption);
      - a `flex flex-wrap items-center gap-3` row: `<p className="font-v7-display text-v7-display tracking-[0.2em] text-v7-text">{gameCode}</p>`, then `<Button variant="secondary" icon="copy" onClick={copy}>{COPY_LABEL}</Button>`;
      - `{isHost ? <p>{HOST_LINE}</p> : null}`.
    - `copy` is the V2 `onCopyCode`, moved as it is: `await navigator.clipboard.writeText(gameCode)`; success → `copyFailed` false and open, a throw → `copyFailed` true and open.
    - The result dialog: `<Dialog open={copyOpen} title={copyFailed ? COPY_FAILED_TITLE : COPY_OK_TITLE} onClose={close} dataAttributes={{ 'data-lobby-sheet': 'copy-result' }} actions={<Button variant="primary" onClick={close}>{COPY_RESULT_DISMISS_LABEL}</Button>}><p className="font-v7-body text-v7-body text-v7-text">{copyResultBody(gameCode, copyFailed)}</p></Dialog>`. It is the last child.
  - **`lobby-kit-card.tsx`** (doc: spec v7 §7.2, §7.3; parity `lobby-your-kit`, `lobby-walk-in-notice`). It owns `const [pickerOpen, setPickerOpen] = useState(false)`. When the card cannot show (`walkIn || rules.randomOnly`) and `pickerOpen` is true, it resets the flag while rendering: `if ((walkIn || rules.randomOnly) && pickerOpen) setPickerOpen(false);`. That way the picker does not reopen when the host turns Random only off. Card chrome is `CHROME_SHAPE_CLASS bg-v7-panel p-4`. Branches:
    - **walk-in:** `<section aria-labelledby>` with `<h2>{WATCHING_TITLE}</h2>` and `<p>{WATCHING_BODY}</p>`. L76-16 adds Claim a seat here.
    - **`rules.randomOnly`:** a card with `<Icon name="random" />` and `{RANDOM_ONLY_LOBBY_LINE}` (`../kit-pick-copy`).
    - **otherwise:** `<section aria-labelledby={titleId}>` (region "Your kit") with:
      - `<h2 id={titleId}>{YOUR_KIT_TITLE}</h2>`;
      - `<p>{KIT_PRIVACY_COPY}</p>` (`../kit-pick-copy`);
      - a `mt-3 flex items-center gap-3` row: `<KitPortrait kitId={selection} size="tile" />`, then a `flex min-w-0 flex-col items-start gap-2` column with `<p className="font-v7-display text-v7-title">{lobbyKitSelectionLabel(selection)}</p>` and `<Button variant="secondary" onClick={() => { setPickerOpen(true); }}>{CHOOSE_KIT_LABEL}</Button>`.

      Choose kit stays live while `locked` (ruling 6: opening the picker stays live).
    - **Picker:** after the card, in every branch but the walk-in one, mount `<KitPickerSheet open={pickerOpen} current={selection} rules={rules} onSelect={onChooseKit} onClose={() => { setPickerOpen(false); }} disabled={locked} />`. Move it here from `lobby-screen.tsx` with L76-10's wiring unchanged.
  - **`lobby-actions.tsx`** (doc: spec v7 §7.2, §11 Q39; parity `lobby-action-row`, `global-feedback-entry-points`):
    - **Derived values:** `isHost`, `showReadyToggle = lobbyShowsReadyToggle(view)`, `youReady`, `youNick` (as V2), `canLaunch = lobbyStartEnabled(view)`, `startReason = lobbyStartReason(view)`. It owns `feedbackOpen`.
    - **The bar:** a fragment. First `<div data-lobby-actions className={`sticky bottom-3 z-10 mt-auto flex flex-col gap-2 ${CHROME_SHAPE_CLASS} bg-v7-panel p-3`}>` with:
      - a hint `<p>` (`font-v7-body text-v7-body font-bold text-v7-text-2`), shown when `!isHost`: `WAITING_FOR_HOST_HINT` when `!showReadyToggle || youReady`, else `PRESS_READY_HINT`;
      - then a `flex flex-wrap items-start gap-2` row.
    - **The row, in order:**
      1. Host: `<Button variant="primary" disabled={locked || !canLaunch} focusableWhenDisabled disabledReason={startReason ?? ''} onClick={onStart}>{START_LABEL}</Button>`. The reason is always a string, so the tree is stable; it shows only while disabled, and only a true view reason ever shows.
      2. Guest with the toggle: ONE `<Button variant={youReady ? 'secondary' : 'primary'} {...(youReady ? {} : { icon: 'check' as const })} disabled={locked} focusableWhenDisabled onClick={() => { onSetReady(!youReady); }}>{youReady ? CANCEL_READY_LABEL : READY_BUTTON_LABEL}</Button>`. One element, so the toggle keeps its focus.
      3. `<Button variant="danger" onClick={onLeave}>{LEAVE_LABEL}</Button>`, immediate.
      4. `<Button variant="quiet" icon="feedback" onClick={() => { setFeedbackOpen(true); }}>{FEEDBACK_LABEL}</Button>`.
    - **Feedback:** after the bar, outside the sticky layer, the V2 `<FeedbackDialog open={feedbackOpen} mode="manual" screen="lobby" gameCode={view.gameCode} {...(youNick !== undefined ? { nickname: youNick } : {})} onDismiss={() => { setFeedbackOpen(false); }} />`, moved as it is.
  - **`lobby-screen.tsx`**, recomposed. The props are unchanged:

```tsx
const isHost = view.hostPlayerId === view.you;
const rules = view.lobbyRules ?? defaultLobbyRules();
// Reconnect lock (plan A.4, ruling 6): L76-14 replaces this with lobbyIntentsLocked(status).
const locked = false;
return (
  <main className="v7-ground relative h-full overflow-y-auto overscroll-contain font-v7-body text-v7-text">
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-4 px-4 pt-6 pb-3 lg:max-w-6xl lg:px-8">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div data-lobby-column="setup" className="flex min-w-0 flex-col gap-4">
          <LobbyHeader gameCode={view.gameCode} status={status} error={error} isHost={isHost} />
          {/* L76-09's RulesStrip element, unchanged except `disabled: locked` added to its editor binding */}
          <LobbyKitCard selection={view.yourKitSelection} rules={rules} walkIn={view.isSpectator === true} locked={locked} onChooseKit={onChooseKit} />
        </div>
        <div data-lobby-column="table" className="flex min-w-0 flex-col gap-4">
          <LobbySeats view={view} locked={locked} onAddBot={onAddBot} onKickPlayer={onKickPlayer} onSetBotDifficulty={onSetBotDifficulty} />
          {/* Chat, as moved by L76-02, until L76-13's panel: */}
          <section className={`${CHROME_SHAPE_CLASS} bg-v7-panel p-3`}>
            <h2 className="font-v7-display text-v7-title leading-none text-v7-text">{CHAT_LOG_LABEL}</h2>
            <div className="mt-2"><ChatLog messages={view.chatMessages ?? []} players={view.players} canWrite onSend={onSendChat} /></div>
          </section>
        </div>
      </div>
      <LobbyActions view={view} locked={locked} onStart={onStart} onSetReady={onSetReady} onLeave={onLeave} />
    </div>
  </main>
);
```

    Remove every `design/**`, `bots/` and `lobby-ready-mark` import. Check that `grep -rnE "from '[^']*(design/|bots/|lobby-ready-mark)" apps/client/src/screens/lobby` prints nothing (import lines only, so a doc comment may still name them).
  - **Layout pins (for the controller's browser check):**
    - At 360 px: one column. The DOM order is header, rules strip, kit card, seats, chat, actions. There is one seat card per row. The host's difficulty control (about 200 px; `Segmented` never shrinks) and Kick share a row when they fit; otherwise Kick wraps below it, never scrolling sideways. Nicknames wrap (`wrap-anywhere`), never truncate.
    - The seat grid is a container query: two columns from 34rem of panel width. 26rem would leave a card about 190 px wide, under the difficulty control's width.
    - From `lg` (64rem): two page columns, setup at 26rem and the table beside it. At 1440×900 the seat cards sit two per row.
    - The action bar is sticky at the bottom of `main` at every size, so Start, Ready, Leave and Feedback stay on screen with 8 seats. Add bot sits under the seats and is reached by scrolling `main`.
    - Tap targets: `Button` md (`min-h-11`) and every `Segmented` item are ≥ 44 px. The smallest text is the 11 px Host tag (`text-v7-micro`).
  - **What's new** (`packages/shared/src/release-notes.ts`): in `lot-72-v7.items`, replace the Lobby item L76-09 appended (find it by its lobby / table-rules text) with `{ before: 'The lobby was a plain list, and only the host could open the table rules.', after: 'The lobby shows each seat in its player color, and everyone can open the table rules.' }` at the same index. L76-09 appended it as item 8 with Before 'In the lobby, only the host could open the table rules.' and After 'Everyone can open the table rules, and the host edits them there.' The item count does not change, but the same replacement goes into the `items` `toEqual` of `packages/shared/src/release-notes.test.ts` ('writes lot-72-v7 as the New look entry …'), and `release-notes.test.ts` joins this task's `git add` list. If no Lobby item exists, append this one instead and update the A.6 count pins (`whats-new-dialog.test.ts` `items` length, classification row 234).
  - **Deletions:** run the `git rm` of the Files list.

- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/screens/lobby/ apps/client/src/ui/icons/ apps/client/src/dev/ apps/client/src/ui/chat/ apps/client/src/App.arena.test.tsx apps/client/src/screens/whats-new-dialog.test.ts packages/shared/src/release-notes.test.ts`. Expected:
  - The 28 new tests pass.
  - `lobby-screen.test.tsx` passes its 25 unchanged tests.
  - The `icon-names` and `release-notes` cases pass.
  - Every other file in the run passes with no edit.

- [ ] **Step 5: Docs.**
  - **`docs/agent/frontend.md`**, Screens table: the Lobby row becomes `| Lobby | `phase: 'lobby'` — V7 mini arena: seats in seat colors, Ready, host Start / Kick / bots, table rules strip, hidden kit pick, chat, Feedback | `screens/lobby/lobby-screen.tsx` + `screens/lobby/*` |`.
  - **`docs/agent/frontend.md`**, `## Home and lobby (V7 · Lot 76)`. Append after L76-10's bullets:

```
- `screens/lobby/lobby-screen.tsx` and its parts (L76-12, spec v7 §7.2, §5.1–§5.3, §11 Q25, Q39):
  `LobbyScreen` composes, in DOM order:
  - the setup column: `LobbyHeader`, the L76-09 `RulesStrip`, `LobbyKitCard`;
  - the table column: `LobbySeats`, then the chat;
  - `LobbyActions`.
  Root: `main.v7-ground relative h-full overflow-y-auto overscroll-contain`. At 360 px it is
  one column with one seat card per row; the host's difficulty and Kick wrap rather than
  scroll sideways. The seat grid goes to two columns from a 34rem panel (container query): the
  3-option difficulty `Segmented` is about 200 px and never shrinks. From `lg` it is two page
  columns (setup 26rem). The action bar is sticky at the bottom of `main`, so Start and Ready
  stay on screen with 8 seats. No inner list scroll (it replaces the V2 `max-h` list).
- Seats (`lobby-seats.tsx`, `lobby-seat-model.ts`): one `--panel-2` card per `view.players`
  entry, in that order (`data-lobby-seat`). Each card holds:
  - a `check` / `close` icon named Ready / Not ready (`lobbyReadyLabel`);
  - the avatar (`aria-hidden`) and the `PlayerName` in the seat hue of that index;
  - ' (you)', the Host tag, and `BotSeatLabel` for every recipient.
  No seat renders a kit. The host gets, on every other seat:
  - a bot difficulty `Segmented` named '{nickname} difficulty', which sends `setBotDifficulty`
    on a new tier;
  - Kick, which opens `KickConfirmDialog`.
  The host also gets an Add bot row: a local 'New bot difficulty' `Segmented` (default Normal),
  then Add bot, which sends `addBot(difficulty)`. At 8 seats both are disabled, with the shared
  reject words 'Room is full (8 seats).' (`lobbyCanAddBot`).
- `kick-confirm-dialog.tsx` (L76-12, plan A.9 ruling 5): a V7 Dialog 'Kick this player?' with
  Cancel (quiet, the initial focus) and Kick (danger). Esc, backdrop and swipe mean Cancel. A
  per-open epoch latch sends one `kickPlayer` on a double click. The owner closes the confirm for
  good when its seat leaves `view.players` or the lobby locks (Review Focus 4).
- `lobby-header.tsx`: the eyebrow, title and `STATUS_LABELS` line, the inline `role="alert"`
  error (L76-14 adds the dismiss), and the Game code card. The card has Copy
  (`navigator.clipboard.writeText`) and the V7 copy-result Dialog ('Code copied' / 'Copy failed';
  both bodies keep the code) with `data-lobby-sheet="copy-result"`, and 'You are the host'.
- `lobby-kit-card.tsx`: one of three cards:
  - Your kit: the L76-03 line, `KitPortrait`, the label, and Choose kit;
  - the Random-only line;
  - the walk-in "Watching the lobby" banner.
  It owns the `KitPickerSheet` open state and resets it under Random only or for a walk-in.
- `lobby-actions.tsx`: Start (primary; grey with `lobbyStartReason`, which gives the server's
  reject words), Ready (primary with the `check` icon) / Cancel ready (secondary) as one button,
  the hints, Leave (danger, immediate) and Feedback (quiet, `feedback` icon). Feedback opens the
  V2 manual `FeedbackDialog` (screen 'lobby', code, nickname) until L76-07.
- `locked` (plan A.4, ruling 6; always `false` until L76-14 sets `lobbyIntentsLocked(status)`):
  - `LobbySeats`, `LobbyKitCard` and `LobbyActions` take it, and so does the editor binding
    (`disabled`).
  - It disables Start, Ready / Cancel ready, Add bot and every difficulty (focusable where a
    button), Kick, and Select this kit (`KitPickerSheet disabled`).
  - It closes an open Kick confirm.
  - Leave, Copy, Feedback, Choose kit and the sheets stay live. `LobbyHeader` takes no `locked`:
    it has no intent control.
- `lobby-copy.ts`: every lobby string the components and tests share, moved verbatim, plus two
  new accessible names: 'New bot difficulty' and '{nickname} difficulty'. Tests:
  `lobby-seat-model.test.ts`, `lobby-header.test.tsx`, `lobby-seats.test.tsx`,
  `lobby-actions.test.tsx`, `lobby-kit-card.test.tsx`. The L76-02 `lobby-screen.test.tsx` stays
  unchanged.
```

  - **`docs/agent/frontend.md`**, other superseded lines:
    - Replace the whole V2 bullet that starts `- **Lobby (L11-02 / L17-02 / L17-03 / L49-02 / L57-11 / L57-09):**` and ends `when the pick is not random.`, whatever L76-09 / L76-10 left in it, with:

```
- **Lobby:** V7 since Lot 76; the screen, its files and tests are under `## Home and lobby
  (V7 · Lot 76)`. Kept from V2:
  - the game code with Copy and its result dialog;
  - Your kit shows only `yourKitSelection`, never a seat's kit; `chooseKit` sends `{ kitId }` or
    `'random'`;
  - the Lot 70 table rules for everyone: an untouched slider sends no time, Play again keeps
    them, the tutorial never shows them;
  - chat for the life of the room, under the seats;
  - walk-ins skip the kit picker (**Watching the lobby**);
  - host and bots are ready on the wire, and human guests toggle **Ready** / **Cancel ready**
    (`setReady`);
  - **Start** is grey until `lobbyStartEnabled` (grey is not validation);
  - host **Kick** on every other seat (bots and humans) opens **Kick this player?**, then
    `kickPlayer`; kicked humans see **You were kicked** and may Join with the same code;
  - host-only Add bot and bot difficulty while below `MAX_PLAYERS`; `BotSeatLabel` for every
    recipient;
  - **Feedback** next to Leave (L47-03);
  - tutorial and Home solo skip the lobby flash (`soloLaunchPending`);
  - **Join with code** sits a guest while the table is in the lobby, or opens the claim picker
    for a reserved disconnected seat;
  - the solo path sends `chooseKit` before `startGame` when the pick is not random.
  The V2 chrome (a fixed check column, green / orange Ready) is retired (decisions.md
  2026-11-03, L76-12).
```

    - In the V2 table paragraph, replace `Lobby player list scrolls (`max-h` + overflow) so eight seats do not cover Start / Add bot.` (it spans two lines) with `The V7 lobby (L76-12) has no inner list scroll: `main` scrolls and its action bar sticks to the bottom, so eight seats never cover Start.`
    - Icons (L72-07): `plus the L72 additions `clock`, `close`, `chevron-left`, `chevron-right`, `random`)` → `plus the L72 additions `clock`, `close`, `chevron-left`, `chevron-right`, `random`, and the L76-12 `check`)`.
    - What's new list (the `**V7 (technical spec v7 §10.4):**` sentence): rewrite the Lobby item sentence L76-09 added to `Lobby item (L76-09, rewritten by L76-12): the lobby shows each seat in its player color, and everyone can open the table rules.`, keeping its ordinal.
  - **`DESIGN.md` › Icons:**
    - In "The set", add after the `random` row: `| L76 addition | `check` | chunky check mark; the lobby Ready mark and the Ready button (L76-12) | `--cta` |`.
    - In the `close` row's motif: `slim cross; Sheet, Dialog, Toast (L72-09) and coach hide (L72-17)` → `slim cross; Sheet, Dialog, Toast (L72-09), coach hide (L72-17) and the lobby Not ready mark (L76-12)`.
    - After "The five L72 additions are not in the spec §5.6 list; they exist because the named Lot 72 components render them.", add: "`check` (L76-12) joins them for the lobby's Ready mark and Ready button; it stays inside the grid with its outline (1.5..22.5 × 4.5..21.5)."
  - **`docs/agent/decisions.md`:** append (the date is the commit day):

```
## YYYY-MM-DD · [P] V7 lobby seats retire the L57-16 Ready chrome (L76-12)

Source: technical spec v7 §7.2 (seats as a mini arena: seat colors, ready check), §5.1 (color
tokens), §5.3 (arcade chrome Button), §5.6 (icon set); `docs/backlog_v7_test_classification.md`,
Owner lot 76, the old-layout rows of `lobby-ready-mark.test.ts` and `lobby-ready.test.ts`.

- **Supersedes** the L57-16 Ready chrome: the fixed `w-6` check / cross column in V2 tokens
  (`text-cta-green-deep` / `text-cta-red`, `lobby-ready-mark.tsx`), and the green Ready / orange
  Cancel ready buttons (`variant={youReady ? 'orange' : 'green'}` with `LobbyReadyCheckIcon`).
- **Now:** each seat card starts with a `ui/icons` mark, `check` (Ready) or `close` (Not ready),
  named by `lobbyReadyLabel`, before the seat-hued avatar and nickname. Ready is a primary
  Button with the `check` icon; Cancel ready is secondary. The state reads by shape and name,
  not by color alone (§11).
- **Retired tests:** `screens/lobby/lobby-ready-mark.test.ts` and
  `screens/lobby/lobby-screen.ready-chrome.test.ts`, deleted with `lobby-ready-mark.tsx`. Their
  product assertions stay as rendered tests in `screens/lobby/lobby-screen.test.tsx` (L76-02):
  each seat's Ready / Not ready mark sits before the nickname, and Ready / Cancel ready send
  `setReady`.

---
```

  - **`docs/backlog_v7_test_classification.md`:** append to the last cell of the `lobby-ready-mark.test.ts` old-layout row and of the `lobby-ready.test.ts` wiring old-layout row: ` **Done (L76-12):** retired, decisions.md 2026-11-03 "V7 lobby seats retire the L57-16 Ready chrome (L76-12)".`
  - **`docs/backlog_v7.md`:**
    - L76-12 row: `| L | Medium | L76-02, L76-09, L76-10 | To do |` → `| L | Medium | L76-02, L76-09, L76-10 | Done |`.
    - Progress: `| 76 · Home and lobby | 18 | 5 |` → `| 76 · Home and lobby | 18 | 6 |`.
    - Total: add 1 to the current value.

- [ ] **Step 6: Verify and commit.**
  - Run `pnpm verify`.
  - Stage by name:

```
git rm apps/client/src/screens/lobby/lobby-ready-mark.tsx apps/client/src/screens/lobby/lobby-ready-mark.test.ts apps/client/src/screens/lobby/lobby-screen.ready-chrome.test.ts
git add apps/client/src/screens/lobby/lobby-screen.tsx apps/client/src/screens/lobby/lobby-copy.ts apps/client/src/screens/lobby/lobby-seat-model.ts apps/client/src/screens/lobby/lobby-seat-model.test.ts apps/client/src/screens/lobby/lobby-header.tsx apps/client/src/screens/lobby/lobby-header.test.tsx apps/client/src/screens/lobby/lobby-seats.tsx apps/client/src/screens/lobby/lobby-seats.test.tsx apps/client/src/screens/lobby/kick-confirm-dialog.tsx apps/client/src/screens/lobby/lobby-kit-card.tsx apps/client/src/screens/lobby/lobby-kit-card.test.tsx apps/client/src/screens/lobby/lobby-actions.tsx apps/client/src/screens/lobby/lobby-actions.test.tsx apps/client/src/ui/icons/icon-names.ts apps/client/src/ui/icons/icon.tsx apps/client/src/ui/icons/icon-names.test.ts apps/client/src/ui/icons/icon.test.tsx packages/shared/src/release-notes.ts packages/shared/src/release-notes.test.ts DESIGN.md docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
```

  - Add any file L76-10 used for the Random-only line if Step 3 moved it.
  - Commit, with no attribution trailer:

```
feat(lobby): restyle lobby as mini arena (L76-12)

Retires the L57-16 Ready chrome tests (decisions.md).
```

**Acceptance map:**
- The L76-02 behavior tests stay green on the new layout: `screens/lobby/lobby-screen.test.tsx`, 25 tests, unchanged.
- Seat color follows `players` order:
  - `colors each seat by its view.players index, avatar and name alike`;
  - `gives one row per seat, in view.players order, with that index as the seat hue`.
- Add bot is disabled at 8 seats and sends the chosen difficulty:
  - `disables Add bot and its difficulty at 8 seats, with the room-full reason`;
  - `adds a bot at the chosen difficulty, and choosing alone sends nothing`.
- Per-bot difficulty sends `setBotDifficulty`: `sends setBotDifficulty from a bot difficulty control, only for a new tier`.
- A copy failure shows the code in the dialog: `shows the code in the dialog when the copy fails`.
- The browser check with 2, 4 and 8 seats at 360×740 and 1440×900 (Start and Add bot reachable, no horizontal scroll): controller browser check, A.9 ruling 1, against the Step 3 layout pins.
- Mandatory extras:
  - 8 × 24-character nicknames: `keeps eight 24-character nicknames whole, …`;
  - no seat renders a kit: that test plus L76-02's `never renders a kit on a seat; …`;
  - Review Focus 4: `closes the confirm and sends nothing when the target leaves, …` and `sends one kickPlayer on a double click of the confirm Kick`;
  - style-only tests retired: Step 5 decisions entry and classification rows.
- `pnpm verify` green: Step 6.

**Decisions:**
- **Layout:**
  - one column at 360 px, two seat columns from a 34rem panel (not 26rem; see Step 3) and two page columns from `lg`;
  - a sticky action bar instead of the V2 inner list scroll;
  - nicknames wrap instead of truncating, since nicknames are not unique and a cut name could look like another seat.

  **Designer question** (default as written): a sticky action bar.
- **The row Kick is `quiet`; the confirm's Kick is `danger`.** Eight red buttons would shout; the destructive step is the confirm. **Designer question.**
- **The Ready mark is the new `check` icon (`--cta` body); Not ready is the existing `close` cross.** They differ in shape and name. `eliminated` was not used because it means elimination. **Designer question** on the check color.
- **Start shows why it is grey,** using the server's reject words (§11 Q39): 'Need at least 2 players to start.' / 'Every connected guest must be ready before start.'. **Add bot at 8 seats** shows 'Room is full (8 seats).'. These are existing strings in a new place. **Designer question.**
- **`locked` is implemented and tested here** (A.4: "from L76-12 on"). It disables controls without adding reason text; Start keeps only its true view reason. Locking closes an open Kick confirm instead of greying its Kick, because `KickConfirmDialogProps` has no `disabled` (see Contract issues).
- **The Add bot difficulty is a `Segmented` named 'New bot difficulty'**, local state, default Normal. It sends nothing until Add bot. The V2 "Add bot" heading is dropped: the button carries the words.
- **Labels come from `botSeatLabelParts(tier).tier`**, not `bots/format-bot-difficulty`, because the Lot 76 import rule does not list `bots/`.
- **`lobbyCanAddBot` and `lobbyStartReason` are additive pure exports** of `lobby-seat-model.ts`, so the components decide nothing.
- **The chat stays as L76-02 moved it** (a `--panel` card with the 'Chat' heading) until L76-13 replaces it.
- **What's new Lobby item** (rewritten in place):
  - before: `The lobby was a plain list, and only the host could open the table rules.`
  - after: `The lobby shows each seat in its player color, and everyone can open the table rules.`
- **New strings** (accessible names): 'New bot difficulty', '{nickname} difficulty'.
- **Changed:** the What's new Lobby item text. **Removed:** the visible 'Add bot' heading.

---

---

### Task L76-13: Add the lobby chat panel

**Files:**
- Create: `apps/client/src/screens/lobby/lobby-chat-panel.tsx` (`LobbyChatPanel`).
- Test (create): `apps/client/src/screens/lobby/lobby-chat-panel.test.tsx` (7 tests).
- Modify:
  - `apps/client/src/screens/lobby/lobby-screen.tsx`: L76-12's temporary chat `<section>` becomes `<LobbyChatPanel view={view} onSendChat={onSendChat} />`. Drop its `ChatLog` and `CHAT_LOG_LABEL` imports.
  - `apps/client/src/screens/lobby/lobby-copy.ts`: add `WALK_IN_CHAT_LABEL`.
  - `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`.
- Existing tests that must stay green unchanged:
  - every `screens/lobby/*.test.ts(x)`, notably `lobby-screen.test.tsx` and its chat case;
  - `ui/chat/chat-log.test.tsx`, `App.arena.test.tsx`.

**Interfaces:**
- Consumes:
  - `ChatLog` (`../../ui/chat/chat-log`).
  - `CHAT_LOG_LABEL` (`'Chat'`), `CHAT_INPUT_LABEL`, `CHAT_EMPTY_COPY`, `CHAT_SEND_LABEL` (`../../ui/chat/chat-line`).
  - `Icon` (`chat`, `chevron-right`), `CHROME_SHAPE_CLASS` / `CHROME_FOCUS_CLASS`.
  - `CHAT_BODY_MAX_LENGTH` and `ChatMessageView` (shared).
  - L76-12: `lobbyPlayersHeading`, the test-lobby helpers.
- Produces:

```ts
// lobby-chat-panel.tsx (L76-14 adds `locked`, wired to ChatLog's `sendLocked`)
export interface LobbyChatPanelProps {
  readonly view: LobbyStateView;
  readonly onSendChat: (body: string) => void;
}
export function LobbyChatPanel(props: LobbyChatPanelProps): ReactElement;

// lobby-copy.ts (addition): technical spec v7 §10.6, Q21
export const WALK_IN_CHAT_LABEL = 'Spectators only see this';
```

- [ ] **Step 1: Write the failing tests.** `apps/client/src/screens/lobby/lobby-chat-panel.test.tsx` (7 tests):

```tsx
// @vitest-environment happy-dom
/**
 * Lobby chat panel: technical spec v7 §7.5 and §10.6 (L76-13). It sits under the seats, collapses,
 * sends on Enter, caps at 200 characters and carries the walk-in label (Q21). Parity rows:
 * `lobby-chat`, `lobby-chat-walk-in-spectator-stream`, `chat-compose-enter`,
 * `chat-new-message-announcement`. Collapsing or expanding sends nothing.
 */
import { CHAT_BODY_MAX_LENGTH, type ChatMessageView } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import { CHAT_EMPTY_COPY, CHAT_INPUT_LABEL, CHAT_LOG_LABEL, CHAT_SEND_LABEL } from '../../ui/chat/chat-line';
import { v7SeatColor } from '../../ui/palette';
import { lobbyPlayersHeading, WALK_IN_CHAT_LABEL } from './lobby-copy';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import { expectNoLobbyIntent, guestLobbyView, hostLobbyView, makeLobbyProps, walkInLobbyView } from './test-lobby';

function renderLobby(overrides: Partial<LobbyScreenProps> = {}) {
  const props = makeLobbyProps(overrides);
  return { ...renderUi(<LobbyScreen {...props} />, { reducedMotion: true }), props };
}
function cssColor(hex: string): string {
  const probe = document.createElement('span');
  probe.style.color = hex;
  return probe.style.color;
}
const toggle = () => screen.getByRole('button', { name: CHAT_LOG_LABEL });
const field = (name: string = CHAT_INPUT_LABEL) => screen.getByRole<HTMLInputElement>('textbox', { name });
const line = (order: number, senderId: string, nickname: string, role: ChatMessageView['role'], body: string): ChatMessageView =>
  ({ order, senderId, nickname, role, body, round: 0 });

describe('LobbyChatPanel (spec v7 §7.5)', () => {
  it('sits under the seats with a Chat heading, open from the start', () => {
    renderLobby();
    const seats = screen.getByRole('heading', { name: lobbyPlayersHeading(3) });
    const chat = screen.getByRole('heading', { name: CHAT_LOG_LABEL });
    expect(seats.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('log')).toBeTruthy();
  });
  it('sends the trimmed body on Enter and resets the input', async () => {
    const { user, props } = renderLobby();
    await user.type(field(), '  hello lobby  {Enter}');
    expect(props.onSendChat).toHaveBeenCalledTimes(1);
    expect(props.onSendChat).toHaveBeenCalledWith('hello lobby');
    expect(field().value).toBe('');
  });
  it('sends nothing for whitespace, from Enter or Send', async () => {
    const { user, props } = renderLobby();
    await user.type(field(), '   {Enter}');
    await user.click(screen.getByRole('button', { name: CHAT_SEND_LABEL }));
    expect(props.onSendChat).not.toHaveBeenCalled();
  });
  it('caps the input at 200 characters', async () => {
    const { user, props } = renderLobby();
    expect(field().getAttribute('maxlength')).toBe(String(CHAT_BODY_MAX_LENGTH));
    await user.click(field());
    await user.paste('a'.repeat(CHAT_BODY_MAX_LENGTH + 5));
    await user.keyboard('{Enter}');
    expect(props.onSendChat).toHaveBeenCalledWith('a'.repeat(CHAT_BODY_MAX_LENGTH));
  });
  it('labels the input Spectators only see this for a walk-in, and Message for a seated player', () => {
    const walkIn = renderLobby({ view: walkInLobbyView() });
    expect(field(WALK_IN_CHAT_LABEL).getAttribute('placeholder')).toBe(WALK_IN_CHAT_LABEL);
    walkIn.unmount();
    for (const view of [hostLobbyView(), guestLobbyView()]) {
      const seated = renderLobby({ view });
      expect(field().getAttribute('placeholder')).toBe(CHAT_INPUT_LABEL);
      expect(screen.queryByRole('textbox', { name: WALK_IN_CHAT_LABEL })).toBeNull();
      seated.unmount();
    }
  });
  it('reads No messages yet. when empty, then stamps each line with its round and seat-colored nickname', () => {
    const empty = renderLobby();
    expect(within(screen.getByRole('log')).getByText(CHAT_EMPTY_COPY)).toBeTruthy();
    empty.unmount();
    renderLobby({ view: walkInLobbyView({ chatMessages: [line(1, 'guest', 'Bea', 'living', 'gl hf'), line(2, 'watcher', 'Cy', 'spectator', 'hi')] }) });
    const log = screen.getByRole('log');
    expect(within(log).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Lobby Bea: gl hf', 'Lobby Cy (spectator): hi']);
    expect(within(log).getByText('Bea').style.color).toBe(cssColor(v7SeatColor(1)));
  });
  it('collapses with the hidden attribute, keeps the transcript and the draft, and sends nothing', async () => {
    const { user, props } = renderLobby({ view: hostLobbyView({ chatMessages: [line(1, 'guest', 'Bea', 'living', 'gl hf')] }) });
    const log = screen.getByRole('log');
    await user.type(field(), 'half a thought');
    await user.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    const body = document.getElementById(toggle().getAttribute('aria-controls') ?? '');
    expect(body?.hidden).toBe(true);
    expect(body?.contains(log)).toBe(true);
    expect(screen.queryByRole('log')).toBeNull();
    await user.click(toggle());
    expect(screen.getByRole('log')).toBe(log);
    expect(field().value).toBe('half a thought');
    expectNoLobbyIntent(props);
  });
});
```

- [ ] **Step 2: Run them and see them fail.** Run `pnpm vitest run apps/client/src/screens/lobby/lobby-chat-panel.test.tsx`. Expected:
  - `WALK_IN_CHAT_LABEL` is undefined, and L76-12's chat block has a heading but no button named Chat. These fail: `sits under the seats …` (no Chat button), `labels the input Spectators only see this …` and `collapses with the hidden attribute …`.
  - `sends the trimmed body …`, `sends nothing for whitespace …`, `caps the input …` and `reads No messages yet. …` already pass. `ChatLog` has carried those behaviors since L76-02; they pin them across the panel change.

- [ ] **Step 3: Implement.**
  - **`lobby-chat-panel.tsx`** (doc: technical spec v7 §7.5, §10.6 Q21; parity `lobby-chat`, `lobby-chat-walk-in-spectator-stream`). `const [open, setOpen] = useState(true)`, `bodyId = useId()`, `walkIn = view.isSpectator === true`:

```tsx
<section data-lobby-chat className={`${CHROME_SHAPE_CLASS} bg-v7-panel p-3`}>
  <h2 className="font-v7-display text-v7-title leading-none text-v7-text">
    <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => { setOpen((current) => !current); }}
      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-v7-chrome-sm text-left ${CHROME_FOCUS_CLASS}`}>
      <span className="inline-flex items-center gap-2"><Icon name="chat" className="shrink-0" />{CHAT_LOG_LABEL}</span>
      <Icon name="chevron-right" className={open ? 'shrink-0 rotate-90' : 'shrink-0'} />
    </button>
  </h2>
  <div id={bodyId} hidden={!open} className="mt-2">
    <ChatLog messages={view.chatMessages ?? []} players={view.players} canWrite onSend={onSendChat}
      {...(walkIn ? { inputLabel: WALK_IN_CHAT_LABEL, placeholder: WALK_IN_CHAT_LABEL } : {})} />
  </div>
</section>
```

    - The `<section>` has no accessible name on purpose. A named section is a region "Chat", and the transcript `ScrollArea` already is one.
    - The chevron points down when open. It does not animate, so reduced motion has nothing to change.
    - `hidden` keeps `ChatLog` mounted, so the transcript, its scroll and an unsent draft survive (map-ui §9 gotcha 2). `ChatLog`'s `ResizeObserver` sticks a reader to the bottom again when the body shows.
    - The client filters nothing: `view.chatMessages` is the recipient's own stream.
  - **`lobby-screen.tsx`**: in the table column, under `LobbySeats`, replace the L76-12 chat `<section>` with `<LobbyChatPanel view={view} onSendChat={onSendChat} />`.
  - **`lobby-copy.ts`**: add `export const WALK_IN_CHAT_LABEL = 'Spectators only see this';` with a comment citing spec v7 §10.6 and Q21.

- [ ] **Step 4: Run them and see them pass.** Run `pnpm vitest run apps/client/src/screens/lobby/ apps/client/src/ui/chat/ apps/client/src/App.arena.test.tsx`. Expected:
  - `lobby-chat-panel.test.tsx`: 7 pass.
  - Every other lobby file passes unchanged: `lobby-screen.test.tsx` 25, plus the L76-12 files 27, `lobby-ready` 3, `lobby-kit-picker` 2 and the L76-09 / L76-10 files.

- [ ] **Step 5: Docs.**
  - **`docs/agent/frontend.md`**, `## Home and lobby (V7 · Lot 76)`. Append after L76-12's bullets:

```
- `screens/lobby/lobby-chat-panel.tsx` (L76-13, spec v7 §7.5, §10.6 Q21): the lobby chat under
  the seats.
  - **Header:** a `--panel` card whose `<h2>` holds a disclosure button named "Chat"
    (`CHAT_LOG_LABEL`; `aria-expanded`, `aria-controls`; the chevron turns down when open).
  - **Body:** the `ui/chat` `ChatLog` (`messages={view.chatMessages ?? []}`,
    `players={view.players}`, `canWrite`, `onSend={onSendChat}`). A walk-in's input is labelled
    and placeholdered `WALK_IN_CHAT_LABEL` ('Spectators only see this', `lobby-copy.ts`); seated
    players keep 'Message'.
  - **Open state:** it starts open on every viewport and reads no viewport mode (decisions.md
    2026-11-03). Collapsing sets `hidden` on the body and keeps `ChatLog` mounted, so the
    transcript and an unsent draft survive. Toggling sends nothing.
  - The client filters nothing: the server builds each reader's stream.
  - Tests: `lobby-chat-panel.test.tsx`, which renders `LobbyScreen`.
```

  - **`docs/agent/frontend.md`**, Chat (`ui/chat/`, L72-14), the **Component** bullet. Replace `override for the walk-in label (L76). It replaces `screens/table/chat-log.tsx` for L74-16, L76-13 and L77-05.` with `override for the walk-in label (the lobby panel passes 'Spectators only see this', L76-13). It replaces `screens/table/chat-log.tsx` for L74-16, the lobby (L76-02; its panel L76-13) and L77-05.`
  - **`docs/agent/decisions.md`:** append (the date is the commit day):

```
## YYYY-MM-DD · [P] The lobby chat panel starts open on every screen (L76-13)

Source: technical spec v7 §7.5 ("Panel under the seats, collapsible on phones"); Appendix A
`lobby-chat` (chat under the player list) and `chat-new-message-announcement` (the lobby has no
unread count).

- **Decision.** `LobbyChatPanel` starts expanded on every viewport and keeps its disclosure toggle
  everywhere. It reads no viewport mode, so its first render never depends on the window size,
  happy-dom's default included.
- **Why open.** The lobby has no unread signal, so a panel that starts collapsed would hide every
  line that arrives until the player opens it. The V6 lobby always showed the transcript.
- **Collapse.** The toggle hides the body with the `hidden` attribute and keeps `ChatLog` mounted,
  so the transcript, its scroll position and an unsent draft survive (the draft lives only while
  `ChatLog` is mounted, decisions.md 2026-11-02, L74-23). The state is local and resets when the
  lobby unmounts.
- **Open question for the designer:** start collapsed on phones, with an unread mark, if the panel
  crowds the seats at 360 px.

---
```

  - **`docs/backlog_v7.md`:**
    - L76-13 row: `| S | Low | Lot 72, L76-12 | To do |` → `| S | Low | Lot 72, L76-12 | Done |`.
    - Progress: `| 76 · Home and lobby | 18 | 6 |` → `| 76 · Home and lobby | 18 | 7 |`.
    - Total: add 1 to the current value.

- [ ] **Step 6: Verify and commit.**
  - Run `pnpm verify`.
  - Stage by name:

```
git add apps/client/src/screens/lobby/lobby-chat-panel.tsx apps/client/src/screens/lobby/lobby-chat-panel.test.tsx apps/client/src/screens/lobby/lobby-screen.tsx apps/client/src/screens/lobby/lobby-copy.ts docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md
```

  - Commit, with no attribution trailer:

```
feat(lobby): add the lobby chat panel (L76-13)
```

**Acceptance map:**
- Enter sends the trimmed body and resets the input: `sends the trimmed body on Enter and resets the input`.
- Whitespace sends nothing: `sends nothing for whitespace, from Enter or Send`.
- The input caps at 200: `caps the input at 200 characters`.
- The walk-in label shows only when `isSpectator`: `labels the input Spectators only see this for a walk-in, and Message for a seated player`.
- Collapsing keeps the transcript: `collapses with the hidden attribute, keeps the transcript and the draft, and sends nothing`.
- Brief extras:
  - under the seats: `sits under the seats with a Chat heading, open from the start`;
  - 'No messages yet.', round labels, seat-colored nicknames and side-stream role labels: `reads No messages yet. when empty, then stamps each line …`;
  - 16 px input: `TextField` `text-v7-input`, checked by the controller in the browser (happy-dom has no CSS).
- `pnpm verify` green: Step 6.

**Decisions:**
- **It starts open on every viewport,** with the toggle everywhere. It has no viewport read, so tests do not depend on the window size. Reason: the lobby has no unread signal. Recorded in decisions.md. **Designer question:** collapsed on phones instead.
- **The disclosure button sits inside the `<h2>`** and reuses `CHAT_LOG_LABEL` ('Chat') as its name. There is no new string, and the section stays unnamed so there is a single 'Chat' region (the transcript's).
- **The panel takes `view`, not the separate fields,** so L76-14 only adds `locked`.
- **New string:** 'Spectators only see this' (input label and placeholder for a walk-in). It is listed in spec §10.6; this is its first shipped use.

---

---

### Task L76-14: Make lobby errors dismissible and lock controls while reconnecting

**Files:**
- Create:
  - `apps/client/src/screens/lobby/lobby-lock.ts`: `lobbyIntentsLocked`.
  - `apps/client/src/screens/reject-phase.ts`: `shouldClearRejectOnPhaseChange`, `ViewPhase`.
  - `apps/client/src/test/fake-room-connection.ts`: `fakeRoomConnection` (test helper, A.3).
- Test (create):
  - `apps/client/src/screens/lobby/lobby-lock.test.ts` (1, node).
  - `apps/client/src/screens/reject-phase.test.ts` (2, node).
  - `apps/client/src/screens/lobby/lobby-screen.reconnect.test.tsx` (7, happy-dom).
  - `apps/client/src/App.lobby.test.tsx` (3, happy-dom; L76-16 appends 4).
- Modify:
  - `apps/client/src/ui/chat/chat-log.tsx`: `sendLocked?: boolean` (A.9 ruling 8); header comment.
  - `apps/client/src/ui/chat/chat-log.test.tsx`: +2 tests in the composer `describe`.
  - `apps/client/src/screens/lobby/lobby-screen.tsx`: `onDismissError` prop; `const locked = false;` (L76-12) becomes `const locked = lobbyIntentsLocked(status);` (L76-12 already passes it to `LobbySeats`, `LobbyKitCard`, `LobbyActions` and into the host's `editor={{ onChange: onSetLobbyRules, disabled: locked }}`); pass it to `LobbyChatPanel` too. `LobbyHeader` takes no `locked` (consistency ruling D-4).
  - `apps/client/src/screens/lobby/lobby-header.tsx`: the alert block with its OK dismiss; the status line as a polite live region.
  - `apps/client/src/screens/lobby/lobby-chat-panel.tsx`: add `locked: boolean` to `LobbyChatPanelProps` (L76-13 created it without one) and pass `sendLocked={locked}` to its `ChatLog`.
  - `apps/client/src/screens/lobby/lobby-copy.ts`: `LOBBY_DISMISS_LABEL`.
  - `apps/client/src/screens/lobby/test-lobby.ts`: `onDismissError: vi.fn()` in `makeLobbyProps` defaults (A.3).
  - Only where the lock table in Step 3 finds a gap: `lobby-seats.tsx`, `lobby-kit-card.tsx`, `lobby-actions.tsx`.
  - `apps/client/src/App.tsx`: the phase-change clear (top of `GameApp`) and `onDismissError={clearActionReject}` in the lobby branch. Nothing in the `playing` / `finished` branches.
  - `DESIGN.md` › Chat; `docs/agent/frontend.md`; `docs/agent/testing.md`; `docs/agent/decisions.md`; `docs/backlog_v7.md`.
- Existing tests that must stay green unchanged: the 31 tests of `ui/chat/chat-log.test.tsx`, `ui/chat/chat.gallery.test.tsx`, `ui/chat/chat-line.test.ts`, `App.arena.test.tsx` (4), `screens/arena/reconnect-banner.test.tsx` (its "keeps Forfeit, chat Enter … available while reconnecting" proves the arena's `ChatLog` is unchanged), `screens/arena/reject-toast.test.tsx`, `screens/arena/chat-sheet.test.tsx`, `screens/end.finished-board.test.tsx`, every `screens/lobby/*.test.tsx` from L76-02 … L76-13, `ui/rules/*.test.tsx`, `screens/lobby/kit-picker-sheet.test.tsx`.

**Interfaces:**
- Consumes:
  - L76-02 / L76-12 / L76-13: `LobbyScreen`, `LobbyScreenProps` (`./lobby-screen`); `LobbyHeader` + `LobbyHeaderProps` (no `locked`), `LobbySeats`, `LobbyKitCard`, `LobbyActions` (each with `locked: boolean`), `LobbyChatPanel` (gains `locked` here); `KickConfirmDialog` (`./kick-confirm-dialog`); `screens/lobby/lobby-copy.ts`; from `./test-lobby`: `makeLobbyProps`, `expectNoLobbyIntent`, `hostLobbyView`, `guestLobbyView`, `lobbySeat`, `LOBBY_HOST`, `LOBBY_GUEST`, `LOBBY_BOT`.
  - L76-09: `RulesEditorBinding.disabled` (`ui/rules/rules-editor-model.ts`), passed through `RulesStrip`'s `editor` prop (A.5).
  - L76-10: `KitPickerSheetProps.disabled` (A.5: Select this kit disabled, the sheets still open and close).
  - ui: `IconButton` (`ui/primitives/icon-button`), `Button` `focusableWhenDisabled` (`ui/primitives/button`), `ChatLog` (`ui/chat/chat-log`).
  - net (types): `RoomConnectionStatus`, `UseRoomConnectionResult`, `ActionRejectPayload` (`net/use-room-connection`).
  - Shared: `ACTION_REJECT_MESSAGE`, `KIT_IDS`, `StateView`, `LobbyStateView`.
  - Tests: `renderUi`, `RenderUiResult` (`test/render`); `markLatestReleaseSeen` (`ui/release-storage`); `makePlayingView` (`view-model/test-fixtures`).
- Produces:

```ts
// screens/lobby/lobby-lock.ts
/** True only for 'reconnecting' (A.4, A.9 ruling 6). */
export function lobbyIntentsLocked(status: RoomConnectionStatus): boolean;

// screens/reject-phase.ts
export type ViewPhase = StateView['phase'];   // 'lobby' | 'playing' | 'finished'
/** previous !== null && next !== null && previous !== next (A.9 ruling 7). */
export function shouldClearRejectOnPhaseChange(previous: ViewPhase | null, next: ViewPhase | null): boolean;

// test/fake-room-connection.ts (A.3)
export function fakeRoomConnection(view: StateView | null, extra?: Partial<UseRoomConnectionResult>): UseRoomConnectionResult;

// ui/chat/chat-log.tsx: one optional prop added to ChatLogProps
  /**
   * The reconnecting lobby (L76-14, spec v7 §7.2, A.9 ruling 8): Send keeps its place and its Tab stop
   * as `aria-disabled`, and neither Send nor Enter calls `onSend`; the draft stays. The arena passes nothing.
   */
  sendLocked?: boolean;          // default false

// screens/lobby/lobby-screen.tsx: LobbyScreenProps gains (A.4 final shape)
  /** Clears the inline alert (App passes clearActionReject). L76-14. */
  onDismissError: () => void;

// screens/lobby/lobby-header.tsx: LobbyHeaderProps gains
  /** The alert's OK (A.9 ruling 4): App's clearActionReject through LobbyScreen. */
  readonly onDismissError: () => void;

// screens/lobby/lobby-copy.ts
/** The alert's dismiss: the V2 dialogs' and the arena reject toast's word (no new §10.6 string). */
export const LOBBY_DISMISS_LABEL = 'OK';
```

- [ ] **Step 1: Write the failing tests.**

First the helper App tests need (test infrastructure, not code under test). `apps/client/src/test/fake-room-connection.ts`:

```ts
/**
 * A full `UseRoomConnectionResult` for App-level tests (technical spec v7 §4.1: the hook's API is
 * unchanged, so App tests mock `net/use-room-connection` and hand App this object). Every intent
 * and command is a `vi.fn()`; `extra` overrides any member. The field set is the local
 * `connectionFor` of `App.arena.test.tsx`, which keeps its own copy (Lot 75 owns that file). L76-14.
 */
import type { StateView } from '@card-battle/shared';
import { vi } from 'vitest';

import type { UseRoomConnectionResult } from '../net/use-room-connection';

export function fakeRoomConnection(
  view: StateView | null,
  extra: Partial<UseRoomConnectionResult> = {},
): UseRoomConnectionResult {
  return {
    // … the body of App.arena.test.tsx `connectionFor`, verbatim: status 'connected', view, error null,
    // actionReject null, gameCode view?.gameCode ?? null, the last-message fields null,
    // soloLaunchPending false, lobbyRules from a lobby view's rules (else null), then one vi.fn() per
    // command (leaveGame: vi.fn(() => Promise.resolve())), then ...extra.
  };
}
```

`apps/client/src/screens/lobby/lobby-lock.test.ts` (1 test):

```ts
/** The lobby's reconnecting lock: technical spec v7 §7.2 (Q29), A.9 ruling 6 (L76-14). */
import { describe, expect, it } from 'vitest';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { lobbyIntentsLocked } from './lobby-lock';

const STATUSES: readonly RoomConnectionStatus[] = ['idle', 'connecting', 'connected', 'reconnecting', 'disconnected', 'failed'];

describe('lobbyIntentsLocked (§7.2, Q29, A.9 ruling 6)', () => {
  it('locks lobby intents only while reconnecting', () => {
    expect(STATUSES.filter(lobbyIntentsLocked)).toEqual(['reconnecting']);
  });
});
```

`apps/client/src/screens/reject-phase.test.ts` (2 tests):

```ts
/** When App clears the shared reject: technical spec v7 §7.2 (Q26, Q29), A.9 ruling 7 (L76-14). */
import { describe, expect, it } from 'vitest';

import { shouldClearRejectOnPhaseChange } from './reject-phase';

describe('shouldClearRejectOnPhaseChange (A.9 ruling 7)', () => {
  it('clears on a change between two phases: lobby → playing, playing → finished, finished → lobby', () => {
    expect(shouldClearRejectOnPhaseChange('lobby', 'playing')).toBe(true);
    expect(shouldClearRejectOnPhaseChange('playing', 'finished')).toBe(true);
    expect(shouldClearRejectOnPhaseChange('finished', 'lobby')).toBe(true);
  });

  it('never clears within a phase, or to or from Home (no room)', () => {
    for (const phase of ['lobby', 'playing', 'finished'] as const) {
      expect(shouldClearRejectOnPhaseChange(phase, phase)).toBe(false);
      expect(shouldClearRejectOnPhaseChange(null, phase)).toBe(false);
      expect(shouldClearRejectOnPhaseChange(phase, null)).toBe(false);
    }
    expect(shouldClearRejectOnPhaseChange(null, null)).toBe(false);
  });
});
```

Add to the `describe('ChatLog composer (spec v7 §6.9, §7.5; parity chat-compose-enter)', …)` block of `apps/client/src/ui/chat/chat-log.test.tsx` (2 tests; `setup` already returns `rerender`):

```tsx
  it('sends nothing on Enter or Send while sendLocked, keeps the draft, and sends it once unlocked (L76-14, A.9 ruling 8)', async () => {
    const { user, onSend, rerender } = setup({ sendLocked: true });
    await user.type(input(), 'brb{Enter}');
    await user.click(sendButton());
    expect(onSend).not.toHaveBeenCalled();
    expect(input().value).toBe('brb');
    rerender(chat({ onSend, sendLocked: false }));
    await user.type(input(), '{Enter}');
    expect(onSend.mock.calls).toEqual([['brb']]);
    expect(input().value).toBe('');
  });
  it('keeps a locked Send visible and in the Tab order: aria-disabled, never native disabled', () => {
    renderUi(chat({ sendLocked: true }));
    expect(sendButton().getAttribute('aria-disabled')).toBe('true');
    expect(sendButton().hasAttribute('disabled')).toBe(false);
    sendButton().focus();
    expect(document.activeElement).toBe(sendButton());
  });
```

`apps/client/src/screens/lobby/lobby-screen.reconnect.test.tsx` (7 tests):

```tsx
// @vitest-environment happy-dom
/**
 * The lobby's reject alert and its reconnecting lock: technical spec v7 §7.2, §7.7, §13 (Q26, Q29);
 * Appendix A `lobby-inline-reject-alert`, `lobby-sticky-reject-alert`, `lobby-header-status`;
 * A.9 rulings 4, 6 and 8 (L76-14).
 */
import { ACTION_REJECT_MESSAGE, KIT_IDS, type LobbyStateView } from '@card-battle/shared';
import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { STATUS_LABELS } from '../status-labels';
import { LOBBY_DISMISS_LABEL } from './lobby-copy';
import { LobbyScreen, type LobbyScreenProps } from './lobby-screen';
import {
  expectNoLobbyIntent, guestLobbyView, hostLobbyView, LOBBY_BOT, LOBBY_GUEST, LOBBY_HOST, lobbySeat, makeLobbyProps,
} from './test-lobby';

/** Not needed by any assertion: pins a desktop box so the sheets center, whatever the happy-dom default size. */
class FakeVisualViewport extends EventTarget { offsetTop = 0; offsetLeft = 0; width = 1440; height = 900; }
/** A native `disabled` or the `aria-disabled` of a `focusableWhenDisabled` Button. */
const isDisabled = (element: HTMLElement): boolean =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
// Toasts and sheets portal to document.body: lobby controls are queried inside <main>.
const main = (): HTMLElement => screen.getByRole('main');
const button = (name: string): HTMLElement => within(main()).getByRole('button', { name });
const dialog = (name: string): HTMLElement => screen.getByRole('dialog', { name });
const gone = async (name: string): Promise<void> => {
  await waitFor(() => { expect(screen.queryByRole('dialog', { name })).toBeNull(); });
};
function setup(overrides: Partial<LobbyScreenProps>) {
  const props = makeLobbyProps(overrides);
  const result = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
  const show = (next: Partial<LobbyScreenProps>): void => { result.rerender(<LobbyScreen {...props} {...next} />); };
  return { props, show, ...result };
}
/** The guest is ready, so Start is enabled while connected. */
const readyHostView = (): LobbyStateView =>
  hostLobbyView({ players: [LOBBY_HOST, { ...LOBBY_GUEST, isReady: true }, LOBBY_BOT] });

beforeEach(() => { vi.stubGlobal('visualViewport', new FakeVisualViewport()); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('lobby reject alert (§7.2, §7.7, Q26, A.9 ruling 4)', () => {
  const message = ACTION_REJECT_MESSAGE['start-not-all-ready'];

  it('shows the reject in a role="alert" line with an OK beside it; OK calls onDismissError once and sends nothing', async () => {
    const { user, props } = setup({ error: message });
    const block = main().querySelector<HTMLElement>('[data-lobby-alert]');
    if (block === null) throw new Error('no lobby alert');
    const alert = within(block).getByRole('alert');
    expect(alert.textContent).toBe(message);
    const ok = within(block).getByRole('button', { name: LOBBY_DISMISS_LABEL });
    expect(alert.contains(ok)).toBe(false); // the live region announces the message only
    await user.click(ok);
    expect(props.onDismissError).toHaveBeenCalledTimes(1);
    expectNoLobbyIntent(props);
  });

  it('renders no alert and no OK without an error', () => {
    setup({ error: null });
    expect(main().querySelector('[data-lobby-alert]')).toBeNull();
    expect(within(main()).queryByRole('alert')).toBeNull();
  });
});

describe('lobby while reconnecting (§7.2, Q29, A.9 ruling 6)', () => {
  it('reads the connection in a polite status line, Reconnecting… included', () => {
    const { show } = setup({ status: 'connected' });
    expect(within(main()).getByRole('status').textContent).toContain(STATUS_LABELS.connected);
    show({ status: 'reconnecting' });
    expect(within(main()).getByRole('status').textContent).toContain(STATUS_LABELS.reconnecting);
  });

  it('host: Start, Add bot, both difficulty controls and Kick lock and send nothing; Leave and Copy stay live; the reconnect unlocks them', async () => {
    const { user, props, show } = setup({ view: readyHostView(), status: 'reconnecting' });
    const locked = (): HTMLElement[] => [
      button('Start game'),
      button('Add bot'),
      within(lobbySeat('guest')).getByRole('button', { name: 'Kick' }),
      within(lobbySeat('bot-1')).getByRole('button', { name: 'Kick' }),
      ...within(main()).getAllByRole('radio'), // the bot's difficulty and Add bot's difficulty
    ];
    expect(locked().every(isDisabled)).toBe(true);
    expect(within(main()).getByRole('radiogroup', { name: 'Bot Cy difficulty' }).getAttribute('aria-disabled')).toBe('true');
    for (const control of locked()) await user.click(control);
    expectNoLobbyIntent(props);
    await user.click(button('Leave'));
    expect(props.onLeave).toHaveBeenCalledTimes(1);
    await user.click(button('Copy'));
    expect(await screen.findByRole('dialog', { name: 'Code copied' })).toBeDefined(); // the copy awaits the clipboard
    await user.keyboard('{Escape}');
    await gone('Code copied');
    show({ status: 'connected' });
    expect(locked().some(isDisabled)).toBe(false);
    await user.click(button('Start game'));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('host: the Table rules sheet still opens, with every editor control disabled; Close works', async () => {
    const { user, props } = setup({ status: 'reconnecting' });
    await user.click(button('Table rules'));
    const sheet = dialog('Table rules');
    const close = within(sheet).getByRole('button', { name: 'Close' });
    const editorButtons = within(sheet).getAllByRole('button').filter((control) => control !== close);
    expect(editorButtons.length).toBeGreaterThanOrEqual(KIT_IDS.length + 3); // 16 kits, All, None, Random
    expect([within(sheet).getByRole('slider'), ...editorButtons].every(isDisabled)).toBe(true);
    for (const control of editorButtons) await user.click(control);
    expectNoLobbyIntent(props);
    await user.click(close);
    await gone('Table rules');
  });

  it('guest: Ready, Select this kit and chat lock and send nothing; the kit picker still opens and Feedback stays live', async () => {
    const { user, props } = setup({ view: guestLobbyView(), status: 'reconnecting' });
    expect(isDisabled(button('Ready'))).toBe(true);
    await user.click(button('Ready'));
    await user.click(button('Choose kit'));                    // opening sends nothing: live (ruling 6)
    await user.click(within(dialog('Choose kit')).getByRole('button', { name: 'Assassin' }));
    const select = within(dialog('Assassin')).getByRole('button', { name: 'Select this kit' });
    expect(isDisabled(select)).toBe(true);
    await user.click(select);
    await user.keyboard('{Escape}');                            // Esc steps back one level (A.5)
    await gone('Assassin');
    await user.keyboard('{Escape}');
    await gone('Choose kit');
    const message = within(main()).getByRole<HTMLInputElement>('textbox', { name: 'Message' });
    await user.type(message, 'brb{Enter}');
    const send = button('Send');
    expect(isDisabled(send)).toBe(true);
    await user.click(send);
    expect(message.value).toBe('brb');
    await user.click(button('Feedback'));
    expect(dialog('Feedback')).toBeDefined();
    expectNoLobbyIntent(props);
  });

  it('closes an open Kick confirm when the connection drops, and it stays closed after the reconnect', async () => {
    const { user, props, show } = setup({ status: 'connected' });
    await user.click(within(lobbySeat('guest')).getByRole('button', { name: 'Kick' }));
    expect(dialog('Kick this player?')).toBeDefined();
    show({ status: 'reconnecting' });
    await gone('Kick this player?');
    show({ status: 'connected' });
    expect(screen.queryByRole('dialog', { name: 'Kick this player?' })).toBeNull();
    expectNoLobbyIntent(props);
  });
});
```

`apps/client/src/App.lobby.test.tsx` (3 tests; L76-16 adds a second `describe`):

```tsx
// @vitest-environment happy-dom
/**
 * App wiring of the lobby over a mocked room connection (technical spec v7 §4.1: the hook's API is
 * unchanged). L76-14: the reject alert's dismiss and the phase-change clear (§7.2, Q26/Q29; A.9
 * ruling 7; Review Focus 3).
 */
import { ACTION_REJECT_MESSAGE, type StateView } from '@card-battle/shared';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import type { ActionRejectPayload, UseRoomConnectionResult } from './net/use-room-connection';
import { guestLobbyView, hostLobbyView } from './screens/lobby/test-lobby';
import { fakeRoomConnection } from './test/fake-room-connection';
import { renderUi, type RenderUiResult } from './test/render';
import { markLatestReleaseSeen } from './ui/release-storage';
import { makePlayingView } from './view-model/test-fixtures';

const fake = vi.hoisted(() => {
  const state: { connection: UseRoomConnectionResult | null } = { connection: null };
  return state;
});

vi.mock('./net/use-room-connection', () => ({
  useRoomConnection: (): UseRoomConnectionResult => {
    if (fake.connection === null) throw new Error('no fake connection');
    return fake.connection;
  },
}));

/**
 * `ui-switch.ts`'s key, written out: until L75-09 flips the default, a stored `next` keeps the playing
 * branch on the arena (as `App.arena.test.tsx` does). L75-09 deletes that module and clears the key.
 */
const ARENA_SWITCH_KEY = 'card-battle.v7.ui';
const NOT_READY: ActionRejectPayload = { code: 'start-not-all-ready', message: ACTION_REJECT_MESSAGE['start-not-all-ready'] };
const KICKED: ActionRejectPayload = { code: 'kicked', message: ACTION_REJECT_MESSAGE.kicked };

function renderApp(connection: UseRoomConnectionResult): RenderUiResult {
  fake.connection = connection;
  return renderUi(<App />, { advanceTimers: vi.advanceTimersByTime, reducedMotion: true });
}
function show(result: RenderUiResult, connection: UseRoomConnectionResult): void {
  fake.connection = connection;
  result.rerender(<App />);
}
/** A connection that holds a reject, on a lobby or a table view. */
function rejected(view: StateView | null, clearActionReject: () => void): UseRoomConnectionResult {
  return fakeRoomConnection(view, { error: NOT_READY.message, actionReject: NOT_READY, clearActionReject });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(ARENA_SWITCH_KEY, 'next');
  markLatestReleaseSeen(); // Home would open What's new over its status block on mount
  vi.useFakeTimers();
});

describe('App lobby rejects (§7.2, Q26/Q29, A.9 ruling 7, L76-14)', () => {
  it("hands clearActionReject to the lobby alert's OK, which calls it once", async () => {
    const clearActionReject = vi.fn<() => void>();
    const { user } = renderApp(rejected(hostLobbyView(), clearActionReject));
    const alert = document.querySelector<HTMLElement>('[data-lobby-alert]');
    if (alert === null) throw new Error('no lobby alert');
    expect(within(alert).getByRole('alert').textContent).toBe(NOT_READY.message);
    await user.click(within(alert).getByRole('button', { name: 'OK' }));
    expect(clearActionReject).toHaveBeenCalledTimes(1);
  });

  it('clears a stored reject once when the room goes from the lobby to the table, never on a same-phase update', () => {
    const clearActionReject = vi.fn<() => void>();
    const result = renderApp(rejected(hostLobbyView(), clearActionReject));
    show(result, rejected(hostLobbyView({ chatMessages: [] }), clearActionReject)); // a lobby update
    expect(clearActionReject).not.toHaveBeenCalled();
    const table = makePlayingView();
    show(result, rejected(table, clearActionReject));
    expect(clearActionReject).toHaveBeenCalledTimes(1);
    show(result, rejected({ ...table, turnSequence: 2 }, clearActionReject)); // a table update
    expect(clearActionReject).toHaveBeenCalledTimes(1);
  });

  it("keeps a kicked guest's message on Home: a lobby that ends with no room never clears it (Review Focus 3)", () => {
    const clearActionReject = vi.fn<() => void>();
    const result = renderApp(fakeRoomConnection(guestLobbyView(), { clearActionReject }));
    show(result, fakeRoomConnection(null, { status: 'disconnected', error: KICKED.message, actionReject: KICKED, clearActionReject }));
    expect(clearActionReject).not.toHaveBeenCalled();
    expect(screen.getByText(KICKED.message).closest('[role="alert"]')).not.toBeNull();
  });
});
```

Test count: 15 new (1 + 2 + 2 + 7 + 3).

- [ ] **Step 2: Run them and see them fail.**
  - Command: `pnpm vitest run apps/client/src/screens/lobby/lobby-lock.test.ts apps/client/src/screens/reject-phase.test.ts apps/client/src/ui/chat/chat-log.test.tsx apps/client/src/screens/lobby/lobby-screen.reconnect.test.tsx apps/client/src/App.lobby.test.tsx`.
  - Expected:
    - `lobby-lock.test.ts`, `reject-phase.test.ts`: fail to import (`./lobby-lock`, `./reject-phase` do not exist).
    - `chat-log.test.tsx`: the 2 new tests fail (`onSend` gets `'brb'`; Send has no `aria-disabled`); the 31 others pass.
    - `lobby-screen.reconnect.test.tsx`: no `[data-lobby-alert]`, no `role="status"` line (unless L76-12 added it), every control enabled while reconnecting, the Kick confirm stays open. The "no alert" test may already pass.
    - `App.lobby.test.tsx`: no `[data-lobby-alert]`; `clearActionReject` is never called on lobby → playing. The Review Focus 3 test passes before and after (it pins today's correct behavior).

- [ ] **Step 3: Implement.**
  - **`screens/lobby/lobby-lock.ts`**: `lobbyIntentsLocked(status) = status === 'reconnecting'`. Doc comment: spec v7 §7.2 "controls disabled while reconnecting" (Q29), A.9 ruling 6; the hook never checks `status` (§4.1), and `@colyseus/sdk` buffers a send while it reconnects and replays it on rejoin, against a state the player has not seen (decisions 2026-11-02 L74-25).
  - **`screens/reject-phase.ts`**: `ViewPhase` and `shouldClearRejectOnPhaseChange` as in Produces. Doc comment: a reject belongs to the screen it arrived on (§7.2 "cleared on phase change", Q26/Q29; A.9 ruling 7). A change to or from no room never clears, so "You were kicked." and a solo-launch failure still show on Home. Within a phase a state update never clears it (L39-06).
  - **`ui/chat/chat-log.tsx`**:
    - Destructure `sendLocked = false`.
    - First lines of `send`: `event.preventDefault(); if (sendLocked) return;`, before the field is read, so the form is never reset and the draft stays.
    - The Send button becomes `<Button type="submit" variant="primary" disabled={sendLocked} focusableWhenDisabled>`. `focusableWhenDisabled` with `disabled` renders `aria-disabled` and swallows the click (`ui/primitives/button.tsx`); with `disabled={false}` it renders exactly as today, so the existing "keeps Send enabled" test holds.
    - Header comment, after "…keeps it enabled.": add "`sendLocked` (L76-14, the reconnecting lobby; A.9 ruling 8) is the one lock: Send turns `aria-disabled` and stays in the Tab order, and the submit handler returns before it reads the field, so neither Send nor Enter sends and the draft stays."
  - **`screens/lobby/lobby-copy.ts`**: add `LOBBY_DISMISS_LABEL = 'OK'` with the doc comment from Produces.
  - **`screens/lobby/test-lobby.ts`**: add `onDismissError: vi.fn()` to the `makeLobbyProps` defaults. It is not an intent: `LOBBY_INTENT_PROPS` is unchanged.
  - **`screens/lobby/lobby-header.tsx`**:
    - Add `onDismissError` to `LobbyHeaderProps` (Produces).
    - The status line stays always mounted and gets `role="status"`, a polite live region, so "Reconnecting…" is announced as the arena's `ReconnectBanner` does. Add it if L76-12 did not.
    - Replace L76-12's error paragraph with this structure. Keep L76-12's error text classes on the `<p>`; the wrapper carries the alert chrome.

```tsx
{error !== null ? (
  <div data-lobby-alert className={`mt-2 flex items-start gap-2 border-l-4 border-l-v7-danger bg-v7-panel-2 py-1 pr-1 pl-3 ${CHROME_SHAPE_SM_CLASS}`}>
    <p role="alert" className="min-w-0 flex-1 py-2.5 …L76-12's error text classes…">{error}</p>
    <IconButton aria-label={LOBBY_DISMISS_LABEL} icon="close" variant="quiet" onClick={onDismissError} />
  </div>
) : null}
```

  - **`screens/lobby/lobby-screen.tsx`**:
    - Add `onDismissError` to `LobbyScreenProps` (A.4 doc comment) and pass it to `LobbyHeader`.
    - `const locked = lobbyIntentsLocked(status);` replaces L76-12's `const locked = false;`. L76-12 already passes `locked` to `LobbySeats`, `LobbyKitCard` and `LobbyActions` and binds `disabled: locked` in the host's `editor`; add `locked={locked}` on `LobbyChatPanel`. `LobbyHeader` gets no `locked`. Guests and walk-ins still get no `editor` (A.5).
  - **`screens/lobby/lobby-chat-panel.tsx`**: add `locked: boolean` to `LobbyChatPanelProps` and pass `sendLocked={locked}` to its `ChatLog`. `canWrite` stays `true`: hiding the composer would drop the draft (map-ui §9 gotcha 2).
  - **The lock table.** L76-12 already applies `locked` inside `LobbySeats`, `LobbyKitCard` and `LobbyActions` (including closing an open Kick confirm) and tests it with `locked` passed directly. Read each component and make sure it does exactly this; where it does not, fix it in that component (the Step 1 test that fails names the control).

| Component | While `locked` |
|---|---|
| `LobbyActions` | Start disabled (`!startEnabled \|\| locked`); Ready / Cancel ready disabled. Leave and Feedback never lock. |
| `LobbySeats` | Kick on every seat disabled; each bot's difficulty `Segmented` `disabled`; Add bot and its difficulty `Segmented` disabled (`atCap \|\| locked`). An open Kick confirm closes when `locked` turns true: in the component that owns the confirm's target, `if (locked && kickTarget !== null) setKickTarget(null)` (React's "adjust state while rendering" pattern; with an epoch state, set `open: false` instead). The confirm then plays its exit and sends nothing. Its props stay as A.4 fixed them. |
| `LobbyKitCard` | `KitPickerSheet disabled={locked}`: Select this kit is disabled and the sheets still open and close (A.5). **Choose kit stays live**: it only opens the picker (see Contract issues). |
| `LobbyHeader` | Nothing locks. Copy, the Copy result and the alert's OK stay live. |
| `LobbyChatPanel` | `sendLocked={locked}` (above). |

  - **`App.tsx`**:
    - Import `shouldClearRejectOnPhaseChange` from `./screens/reject-phase`.
    - Right after the `tablePreference` state and before `claimableSeats`, insert the block below.
    - In the lobby branch, add `onDismissError={clearActionReject}` after `error={error}`.
    - The `playing` and `finished` branches, `TableScreen`, `ArenaScreen` and `EndScreen` props are untouched ("Table reject handling is unchanged").

```tsx
  // A reject belongs to the screen it arrived on (spec v7 §7.2, Q26/Q29; A.9 ruling 7; supersedes the
  // L39 carry-over across phases): a change between two view phases clears it, and a change to or from
  // Home never does, so a kick or a solo-launch failure still shows there. React's "adjust state while
  // rendering" pattern (as `screens/arena/top-bar.tsx`): it runs before the next screen commits, so no
  // dialog or toast mounts with the old reject, and it only updates GameApp's own state (the hook runs here).
  const viewPhase = view?.phase ?? null;
  const [renderedPhase, setRenderedPhase] = useState(viewPhase);
  if (renderedPhase !== viewPhase) {
    setRenderedPhase(viewPhase);
    if (shouldClearRejectOnPhaseChange(renderedPhase, viewPhase)) {
      clearActionReject();
    }
  }
```

  Why this and not an effect: `eslint.config.mjs` enables `react-hooks` `recommended-latest`, which includes `set-state-in-effect`, `set-state-in-render` and `refs`. Both an effect with a `useRef` (read and written only inside the effect) and this render-time block pass those rules: `clearActionReject` is a hook-returned function, not a known `useState` setter, and the planner linted both variants with the repo config. The render-time block wins for two reasons. First, it runs before the next screen commits, while an effect runs after paint: the classic `IllegalActionDialog` and the arena `RejectToast` would mount with the stale reject for a frame, and the toast would start its entrance. Second, it is the repo's pattern (map-ui §0; `top-bar.tsx`, `ui/primitives/sheet.tsx`). Under StrictMode the double render can call `clearActionReject` twice. That is harmless, because the call is idempotent (both fields go to `null`), and tests render without StrictMode, so "called once" holds.

- [ ] **Step 4: Run them and see them pass.**
  - Command: `pnpm vitest run apps/client/src/screens/lobby apps/client/src/screens/reject-phase.test.ts apps/client/src/ui/chat apps/client/src/ui/rules apps/client/src/App.lobby.test.tsx apps/client/src/App.arena.test.tsx apps/client/src/screens/arena/reconnect-banner.test.tsx apps/client/src/screens/arena/reject-toast.test.tsx apps/client/src/screens/arena/chat-sheet.test.tsx`.
  - Expected: the 15 new tests pass, and every existing test in those paths passes with no assertion edited (`chat-log.test.tsx` 33 = 31 + 2).

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, append to `## Home and lobby (V7 · Lot 76)` after the L76-13 bullets:

```
- `screens/lobby/lobby-lock.ts`, `lobby-screen.tsx` (L76-14, spec v7 §7.2, Q29; A.9 rulings 6 and 8):
  `lobbyIntentsLocked(status)` is true only for `'reconnecting'`. While it is, the lobby disables
  every control that sends an intent: Start, Ready / Cancel ready, Add bot and its difficulty, a
  bot's difficulty, Kick (an open Kick confirm closes, nothing sent), Select this kit, every rules
  editor control (`RulesEditorBinding.disabled`) and chat Send and Enter (`ChatLog sendLocked`).
  Leave, Copy, Feedback, the alert's OK, opening the rules sheet and Choose kit (the picker opens
  to browse) stay live. The status line is a polite `role="status"` region, so 'Reconnecting…' is
  announced. Unlike the arena (L74-25), lobby chat locks too: §7.2 locks every lobby intent.
- `screens/lobby/lobby-header.tsx` (L76-14, spec v7 §7.2, §7.7, Q26; A.9 ruling 4): the reject
  stays an inline `role="alert"` line (lobby errors are never a toast). A quiet `close`
  `IconButton` named "OK" (`LOBBY_DISMISS_LABEL`, the arena reject toast's control) sits beside it
  in `[data-lobby-alert]`, outside the live region, so only the message is announced. OK calls
  `onDismissError` (App: `clearActionReject`), sends no intent and stays live while reconnecting.
- `screens/reject-phase.ts`, `App.tsx` (L76-14, A.9 ruling 7; decisions.md supersedes the L39
  carry-over across phases): `GameApp` clears the shared reject (`error` + `actionReject`) when
  the view phase changes between two phases (lobby, playing, finished), with React's "adjust state
  while rendering" pattern, so the next screen never mounts with the old reject. A change to or
  from Home (`view === null`) never clears ("You were kicked.", a solo-launch failure). Within a
  phase nothing changed: a state update never clears it (L39-06).
- `test/fake-room-connection.ts`, `App.lobby.test.tsx` (L76-14): `fakeRoomConnection(view, extra?)`
  is a full `UseRoomConnectionResult` with a `vi.fn()` per member; App-level lobby tests
  `vi.mock('./net/use-room-connection')` with it (`docs/agent/testing.md`).
```

  - `docs/agent/frontend.md`, three superseded lines:
    - In `### Chat (\`ui/chat/\`, L72-14)`, replace `  The old file stays until L75-11. Props: \`messages\`, \`players\`, \`canWrite\`, \`onSend\`.` with `  The old file stays until L75-11. Props: \`messages\`, \`players\`, \`canWrite\`, \`onSend\`, \`inputLabel?\`, \`placeholder?\`, \`sendLocked?\` (L76-14).`.
    - In the same section, replace

```
  down. Send is never disabled
  (nothing tracks an empty field, and a native `disabled` would leave the Tab order). Shift+Enter
  sends too, because the field is a single-line `<input>`.
```

  with

```
  down. Send is never disabled for an empty field
  (nothing tracks one, and a native `disabled` would leave the Tab order). Shift+Enter
  sends too, because the field is a single-line `<input>`. `sendLocked` (L76-14, the
  reconnecting lobby) is the one lock: Send turns `aria-disabled` (`focusableWhenDisabled`),
  neither Send nor Enter sends, and the draft stays. The arena passes nothing.
```

    - In the Lot 39 bullet, replace `    \`stateUpdate\` must **not** clear \`actionReject\` (bot sync would dismiss mid-read).` with `    \`stateUpdate\` must **not** clear \`actionReject\` (bot sync would dismiss mid-read); a view` + newline + `    **phase** change does, from L76-14 (App, \`screens/reject-phase.ts\`; decisions.md).`.
    - In `## Conventions`, after the line `  Lobby accidental drop **reserves** the seat until Kick, Leave, or claim/rejoin.`, insert:

```
  The shared reject (`error` + `actionReject`) clears on a dismiss (the lobby alert's OK, the
  table's OK or toast), a drop, a reconnect, `GAME_OVER`, a leave, and from L76-14 when App sees
  the view phase change between two phases (never to or from Home). While `status` is
  `reconnecting` the lobby locks its intent controls (`lobbyIntentsLocked`, L76-14) and the arena
  its game input (L74-25); the hook never checks `status`.
```

  - `docs/agent/testing.md`, add after `## Arena fixtures (V7 · L74-01)`:

```
## Room connection fake (V7 · L76-14)

`apps/client/src/test/fake-room-connection.ts` `fakeRoomConnection(view, extra?)` returns a full
`UseRoomConnectionResult`: status `connected`, no error or reject, the last-message fields null,
`lobbyRules` from a lobby view, and a `vi.fn()` for every command (`leaveGame` resolves). App-level
tests hoist a holder with `vi.hoisted`, `vi.mock('./net/use-room-connection')` to return it, set
it before `renderUi(<App />)` and again before each `rerender(<App />)` (`App.lobby.test.tsx`).
Shipped code never imports it.
```

  - `DESIGN.md` › `## Chat (ui/chat)`:
    - In the intro, `One \`<ChatLog messages players canWrite onSend inputLabel?` + newline + `placeholder? />\`` becomes `One \`<ChatLog messages players canWrite onSend inputLabel?` + newline + `placeholder? sendLocked? />\``.
    - In **Composer**, replace `Send is` / `never disabled: the form is uncontrolled, so no empty state exists to follow, and the V6` / `behavior is kept.` with `Send is` / `never disabled for an empty field: the form is uncontrolled, so no empty state exists to` / `follow, and the V6 behavior is kept. \`sendLocked\` (the reconnecting lobby, L76-14) is the one` / `lock: Send shows the disabled look as \`aria-disabled\` (\`focusableWhenDisabled\`, still in the` / `Tab order), neither Send nor Enter sends, and the draft stays. The arena passes nothing.`
  - `docs/agent/decisions.md`, append at the end (`{commit day}` = the commit's date, `YYYY-MM-DD`):

```
## YYYY-MM-DD · [P] Lobby rejects: OK dismiss and phase-change clear; the reconnecting lock (L76-14)

Source: technical spec v7 §4.1, §7.2, §7.7, §13 (Q26, Q29); Appendix A `lobby-inline-reject-alert`,
`lobby-sticky-reject-alert`, `reject-state-carryover`, `lobby-header-status`; Lot 76 plan A.9
rulings 4, 6, 7 and 8.

- **Supersedes, across phase changes only,** item 5 of "Lot 39 Table UX polish" (2026-08-10):
  "`stateUpdate` must not clear `actionReject`". Within a phase it still holds: a bot or peer
  update never closes a reject. A view phase change between two phases (lobby, playing,
  finished) now clears the shared reject, so a lobby reject no longer opens on the first table
  frame and an End reject no longer reaches the rematch lobby (parity `reject-state-carryover`).
  A change to or from no room (Home) never clears: "You were kicked." and a solo-launch failure
  must still show on Home.
- **Where.** `GameApp` in `App.tsx`, with React's "adjust state while rendering" pattern
  (`screens/reject-phase.ts` decides). It runs before the next screen commits, so neither the
  classic `IllegalActionDialog` nor the arena `RejectToast` mounts with the stale reject; an effect
  would paint it for a frame first. It updates `GameApp`'s own state (the hook runs there). The
  hook's API is unchanged (§4.1).
- **Dismiss.** The lobby alert stays an inline `role="alert"` line (§7.7; the lobby's one toast is
  the L76-15 rules notice). A quiet `close` `IconButton` named "OK", the arena reject toast's
  control, sits beside it, outside the live region, so only the message is announced. It calls
  `clearActionReject`.
- **Reconnecting lock.** While `status === 'reconnecting'` the lobby disables Start, Ready / Cancel
  ready, Add bot and its difficulty, a bot's difficulty, Kick (an open Kick confirm closes), Select
  this kit, every rules editor control, and chat Send and Enter (`ChatLog sendLocked`: Send stays
  focusable, the draft stays). Leave, Copy, Feedback, the alert's OK, opening the rules sheet and
  Choose kit stay live. The lobby locks chat where the arena does not (L74-25): §7.2 disables
  every lobby control that sends an intent, and the SDK would replay a buffered lobby intent
  against a state the player has not seen.

---
```

  - `docs/backlog_v7.md`: L76-14 row `| S | Medium | L76-12 | To do |` → `| S | Medium | L76-12 | Done |`; Progress `| 76 · Home and lobby | 18 | 7 |` → `| 76 · Home and lobby | 18 | 8 |`; Total: read the current `| **Total** | **135** | **N** |` (Lot 75 moves it in parallel) and write N + 1.
  - No What's new edit (A.6: Part 1 owns two items; L76-12's Lobby item covers the lobby). No classification row: no source-text test reads this code.

- [ ] **Step 6: Verify and commit.**
  - Run `pnpm verify` and wait for it to pass.
  - Stage by name, adding any of `lobby-seats.tsx`, `lobby-kit-card.tsx`, `lobby-actions.tsx` that the lock table made you change:

```
git add apps/client/src/App.tsx apps/client/src/App.lobby.test.tsx apps/client/src/test/fake-room-connection.ts apps/client/src/screens/reject-phase.ts apps/client/src/screens/reject-phase.test.ts apps/client/src/screens/lobby/lobby-lock.ts apps/client/src/screens/lobby/lobby-lock.test.ts apps/client/src/screens/lobby/lobby-screen.tsx apps/client/src/screens/lobby/lobby-header.tsx apps/client/src/screens/lobby/lobby-chat-panel.tsx apps/client/src/screens/lobby/lobby-copy.ts apps/client/src/screens/lobby/test-lobby.ts apps/client/src/screens/lobby/lobby-screen.reconnect.test.tsx apps/client/src/ui/chat/chat-log.tsx apps/client/src/ui/chat/chat-log.test.tsx DESIGN.md docs/agent/frontend.md docs/agent/testing.md docs/agent/decisions.md docs/backlog_v7.md
```

  - Commit, with no attribution trailer:

```
feat(lobby): reconnect lock and error OK (L76-14)

App clears the shared reject when the view phase changes between two
phases, never to or from Home. This supersedes the L39 carry-over
across phases (decisions.md). The lobby alert gets an OK dismiss, and
every lobby intent locks while reconnecting.
```

**Acceptance map:**
- Dismissing the alert calls `clearActionReject` once:
  - `hands clearActionReject to the lobby alert's OK, which calls it once` (App);
  - `shows the reject in a role="alert" line with an OK beside it; OK calls onDismissError once and sends nothing` (component).
- A lobby → playing or finished → lobby phase change clears a stored reject:
  - `clears a stored reject once when the room goes from the lobby to the table, never on a same-phase update` (App);
  - `clears on a change between two phases: lobby → playing, playing → finished, finished → lobby` (pure).
- A same-phase state update does not clear it: the same App test (a lobby update, then a table update), and `never clears within a phase, or to or from Home (no room)`.
- With 'reconnecting', the listed controls are disabled and Leave is not:
  - `host: Start, Add bot, both difficulty controls and Kick lock and send nothing; Leave and Copy stay live; …`;
  - `host: the Table rules sheet still opens, with every editor control disabled; Close works`;
  - `guest: Ready, Select this kit and chat lock and send nothing; …`;
  - `closes an open Kick confirm when the connection drops, …`;
  - `locks lobby intents only while reconnecting`;
  - the two `ChatLog` `sendLocked` tests.
- Table reject handling is unchanged:
  - the arena and table props are untouched (Step 3);
  - the same-phase table update in the App test;
  - `reject-toast.test.tsx`, `reconnect-banner.test.tsx` and `App.arena.test.tsx` stay green unchanged.
- Review Focus 3: `keeps a kicked guest's message on Home: a lobby that ends with no room never clears it (Review Focus 3)`.
- `pnpm verify` green: Step 6.

**Decisions:**
- **The dismiss is an `IconButton` (`close`, named "OK"), not a quiet text button.**
  - It is the V7 `Toast`'s own dismiss and the arena `RejectToast`'s control, so the same reject is dismissed the same way in the lobby and at the table. The L76-15 rules toast on this screen uses it too.
  - A 44 px square fits beside a one-line alert at 360 px without pushing the message onto another line.
  - It sits outside the `role="alert"` node, so the assertive region announces only the message: a control inside it would be read as part of the alert ("…before start. OK"). The node's text changes when a new reject replaces the old one, so a new reject is announced again.
- **After OK, focus falls to the document.** The button unmounts with the alert. The lobby has no natural next target, and moving focus to `main` would need a `tabIndex` on the scroll container.
- **The status line becomes `role="status"`**, as the arena's `ReconnectBanner`. Otherwise a screen-reader user sees the controls turn disabled with no reason. It is always mounted, so each status change is announced.
- **Choose kit stays live while reconnecting; Select this kit is the locked commit.** Ruling 6 lists "Choose kit" as locked and also keeps "opening … the kit picker" live, and Choose kit is the picker's only opener. This plan reads "Choose kit" as the choose-kit intent. That matches A.5 (`disabled`: "the sheets still open and close") and the commit rule (opening sends nothing). See Contract issues.
- **An open Kick confirm closes when the connection drops**, and it does not come back after the reconnect. Keeping it open with a disabled Kick would need a lock prop on `KickConfirmDialogProps`, which A.4 fixes. Closing is what the confirm already does when its target leaves.
- **Lobby chat locks while reconnecting; the arena's does not (L74-25).** Ruling 6 / §7.2 lock every lobby intent. The lock keeps the composer and the draft (`sendLocked`, never `canWrite`).
- **`sendLocked` is a `ChatLog` prop, not a lobby wrapper**: the form's submit handler is the only place that sees Enter. The arena passes nothing.
- **The phase-change clear sits at the top of `GameApp`**, outside the `playing` / `finished` branches that L75-09 rewrites. Those branches still pass `actionReject` and `clearActionReject` exactly as before.
- **`App.lobby.test.tsx` writes the arena switch key as a literal**, not `UI_SWITCH_STORAGE_KEY`: L75 deletes `ui-switch.ts`, and an import would break whichever lot lands second. The key only keeps the table branch on the arena until L75-09. After L75-09 the arena is the default and the stale key is cleared.
- **No new player-facing string.** "OK" is existing copy (V2 dialogs, the arena reject toast); "Reconnecting…" is `STATUS_LABELS`.

---

---

### Task L76-15: Toast guests when the host changes rules

**Files:**
- Create:
  - `apps/client/src/screens/lobby/rules-change-notice.ts`: `lobbyRulesNotice`, `mergeRulesNotice`, `LobbyRulesNotice`, `LOBBY_RULES_TOAST_MS`.
  - `apps/client/src/screens/lobby/lobby-rules-toast.tsx`: `LobbyRulesToast`, `LobbyRulesToastProps`.
- Test (create): `apps/client/src/screens/lobby/rules-change-notice.test.ts` (8, node), `apps/client/src/screens/lobby/lobby-rules-toast.test.tsx` (4, happy-dom).
- Modify:
  - `apps/client/src/screens/lobby/lobby-screen.tsx`: the previous-view state and `<LobbyRulesToast>`.
  - `apps/client/src/screens/lobby/lobby-copy.ts`: `RULES_CHANGED_TITLE`, `PICK_RESET_BODY`.
  - Only if they exist: any `screens/lobby/*.test.tsx` or `App.lobby.test.tsx` query that reads `ByRole('alert')` or `ByRole('status')` from `screen`. The Toast now keeps two empty live regions (`role="status"` and `role="alert"`) mounted in `document.body` while the lobby is up. Scope such a query with `within(screen.getByRole('main'))`; the assertion stays the same.
  - `docs/agent/frontend.md`, `docs/backlog_v7.md`.
- Existing tests that must stay green unchanged: every `screens/lobby/*.test.tsx` (L76-02 … L76-14, after the scoping above), `App.lobby.test.tsx`, `ui/primitives/toast.test.tsx`, `screens/arena/reject-toast.test.tsx`.

**Interfaces:**
- Consumes:
  - L76-12 / L76-14: `LobbyScreen`, `LobbyScreenProps`; `LOBBY_DISMISS_LABEL` (`./lobby-copy`, L76-14).
  - Test helpers from `./test-lobby`: `makeLobbyProps`, `expectNoLobbyIntent`, `guestLobbyView`, `hostLobbyView`, `walkInLobbyView`.
  - ui: `Toast` (`ui/primitives/toast`; `tone`, `timeoutMs`, `dismissLabel`, `onDismiss(cause)`).
  - Shared: `defaultLobbyRules`, `LobbyRules`, `LobbyStateView`, `KitId`.
- Produces:

```ts
// screens/lobby/rules-change-notice.ts
/** What the guest's rules toast says; the helpers return null for no toast. */
export interface LobbyRulesNotice {
  /** The host newly excluded this guest's kit pick, so the server moved it to Random (Lot 70). */
  readonly pickReset: boolean;
}
/** Ruling 4: 6 s, as the arena reject toast; a live sheet's focus trap keeps Tab off OK. */
export const LOBBY_RULES_TOAST_MS = 6000;
export function lobbyRulesNotice(previous: LobbyStateView | null, next: LobbyStateView): LobbyRulesNotice | null;
/** The open toast's notice after a new diff: null keeps it, a notice opens or swaps it, and a reset line stays until it closes. */
export function mergeRulesNotice(open: LobbyRulesNotice | null, incoming: LobbyRulesNotice | null): LobbyRulesNotice | null;

// screens/lobby/lobby-rules-toast.tsx
export interface LobbyRulesToastProps {
  readonly notice: LobbyRulesNotice | null;
  /** OK or the timer: the owner closes it (sets its notice to null). */
  readonly onDismiss: () => void;
}
export function LobbyRulesToast({ notice, onDismiss }: LobbyRulesToastProps): ReactElement | null;

// screens/lobby/lobby-copy.ts
/** §10.6, Q16: the guest's toast title when the host changes a rule. */
export const RULES_CHANGED_TITLE = 'Rules changed';
/** §10.6, Q17: the toast body when the host's exclusion reset the guest's pick (designer question: one toast, title + body). */
export const PICK_RESET_BODY = 'Your pick was reset to Random.';
```

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/screens/lobby/rules-change-notice.test.ts` (8 tests):

```ts
/**
 * Guest rule-change notices: technical spec v7 §7.4 (Q16, Q17), §13; Appendix A
 * `lobby-rules-change-guest-effects`; A.9 rulings 4 and 10 (L76-15).
 */
import { defaultLobbyRules, type LobbyRules, type LobbyStateView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { lobbyRulesNotice, mergeRulesNotice } from './rules-change-notice';
import { guestLobbyView, hostLobbyView, walkInLobbyView } from './test-lobby';

const rules = (overrides: Partial<LobbyRules> = {}): LobbyRules => ({ ...defaultLobbyRules(), ...overrides });
/** Bea, the seated guest of `guestLobbyView`, who picked Assassin unless told otherwise. */
const bea = (lobbyRules: LobbyRules, yourKitSelection: LobbyStateView['yourKitSelection'] = 'assassin'): LobbyStateView =>
  guestLobbyView({ lobbyRules, yourKitSelection });

describe('lobbyRulesNotice (§7.4, Q16, Q17)', () => {
  it('fires nothing on the first view, or on a later view with the same rules', () => {
    expect(lobbyRulesNotice(null, bea(rules()))).toBeNull();
    expect(lobbyRulesNotice(bea(rules()), bea(rules()))).toBeNull();
    expect(lobbyRulesNotice(bea(rules({ excludedKitIds: ['ghost', 'witch'] })), bea(rules({ excludedKitIds: ['witch', 'ghost'] })))).toBeNull();
  });

  it("fires 'Rules changed' for a change of each field, with no reset line", () => {
    const before = bea(rules());
    for (const changed of [rules({ excludedKitIds: ['ghost'] }), rules({ randomOnly: true }), rules({ turnTimeSeconds: 90 })]) {
      expect(lobbyRulesNotice(before, bea(changed))).toEqual({ pickReset: false });
    }
  });

  it("fires nothing on the guest's own Random pick", () => {
    expect(lobbyRulesNotice(bea(rules()), bea(rules(), 'random'))).toBeNull();
  });

  it('gives no reset line for a Random-only toggle, which keeps the pick', () => {
    expect(lobbyRulesNotice(bea(rules()), bea(rules({ randomOnly: true })))).toEqual({ pickReset: false });
    expect(lobbyRulesNotice(bea(rules({ randomOnly: true })), bea(rules()))).toEqual({ pickReset: false });
  });

  it('adds the reset line only when the host newly excluded the pick', () => {
    expect(lobbyRulesNotice(bea(rules()), bea(rules({ excludedKitIds: ['assassin'] }), 'random'))).toEqual({ pickReset: true });
    // Bea went Random herself while the host excluded another kit:
    expect(lobbyRulesNotice(bea(rules()), bea(rules({ excludedKitIds: ['ghost'] }), 'random'))).toEqual({ pickReset: false });
    // Another kit excluded, the pick stays:
    expect(lobbyRulesNotice(bea(rules()), bea(rules({ excludedKitIds: ['ghost'] })))).toEqual({ pickReset: false });
  });

  it('gives the host and walk-ins no notice (A.9 ruling 10)', () => {
    expect(lobbyRulesNotice(hostLobbyView(), hostLobbyView({ lobbyRules: rules({ turnTimeSeconds: 90 }) }))).toBeNull();
    expect(lobbyRulesNotice(walkInLobbyView(), walkInLobbyView({ lobbyRules: rules({ turnTimeSeconds: 90 }) }))).toBeNull();
  });

  it('compares only two views of the same room and seat', () => {
    expect(lobbyRulesNotice(bea(rules()), guestLobbyView({ gameCode: 'OTHER1', lobbyRules: rules({ turnTimeSeconds: 90 }) }))).toBeNull();
    expect(lobbyRulesNotice(bea(rules()), guestLobbyView({ you: 'dee', lobbyRules: rules({ turnTimeSeconds: 90 }) }))).toBeNull();
  });
});

describe('mergeRulesNotice (L76-15)', () => {
  it('opens on a notice, keeps an open toast on none, and keeps its reset line until it closes', () => {
    expect(mergeRulesNotice(null, null)).toBeNull();
    expect(mergeRulesNotice(null, { pickReset: false })).toEqual({ pickReset: false });
    expect(mergeRulesNotice({ pickReset: true }, null)).toEqual({ pickReset: true });
    expect(mergeRulesNotice({ pickReset: true }, { pickReset: false })).toEqual({ pickReset: true });
    expect(mergeRulesNotice({ pickReset: false }, { pickReset: true })).toEqual({ pickReset: true });
  });
});
```

`apps/client/src/screens/lobby/lobby-rules-toast.test.tsx` (4 tests):

```tsx
// @vitest-environment happy-dom
/**
 * The guest rules toast on the rendered lobby: technical spec v7 §7.4 (Q16, Q17), §10.6;
 * A.9 rulings 4 and 10 (L76-15).
 */
import { defaultLobbyRules, type LobbyRules } from '@card-battle/shared';
import { act, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { LOBBY_DISMISS_LABEL, PICK_RESET_BODY, RULES_CHANGED_TITLE } from './lobby-copy';
import { LobbyScreen } from './lobby-screen';
import { LOBBY_RULES_TOAST_MS } from './rules-change-notice';
import { expectNoLobbyIntent, guestLobbyView, hostLobbyView, makeLobbyProps } from './test-lobby';

const rules = (overrides: Partial<LobbyRules> = {}): LobbyRules => ({ ...defaultLobbyRules(), ...overrides });
const toast = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-zone="toast"]');
function openToast(): HTMLElement {
  const found = toast();
  if (found === null) throw new Error('no toast');
  return found;
}

describe('guest rules toast (§7.4, Q16, Q17, A.9 rulings 4 and 10)', () => {
  it("toasts 'Rules changed' to a seated guest when the host changes a rule; OK closes it and sends nothing", async () => {
    const props = makeLobbyProps({ view: guestLobbyView() });
    const { user, rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    expect(toast()).toBeNull(); // the first view never toasts
    rerender(<LobbyScreen {...props} view={guestLobbyView({ lobbyRules: rules({ turnTimeSeconds: 90 }) })} />);
    const card = openToast();
    expect(card.textContent).toContain(RULES_CHANGED_TITLE);
    expect(card.textContent).not.toContain(PICK_RESET_BODY);
    expect(card.closest('[role="status"]')).not.toBeNull(); // tone info: polite
    await user.click(within(card).getByRole('button', { name: LOBBY_DISMISS_LABEL }));
    await waitFor(() => { expect(toast()).toBeNull(); });
    expectNoLobbyIntent(props);
  });

  it("adds the reset line when the host's exclusion moved the guest's pick to Random", () => {
    const props = makeLobbyProps({ view: guestLobbyView({ yourKitSelection: 'assassin' }) });
    const { rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    rerender(<LobbyScreen {...props} view={guestLobbyView({ yourKitSelection: 'random', lobbyRules: rules({ excludedKitIds: ['assassin'] }) })} />);
    expect(openToast().textContent).toContain(RULES_CHANGED_TITLE);
    expect(openToast().textContent).toContain(PICK_RESET_BODY);
  });

  it('never toasts the host', () => {
    const props = makeLobbyProps({ view: hostLobbyView() });
    const { rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    rerender(<LobbyScreen {...props} view={hostLobbyView({ lobbyRules: rules({ turnTimeSeconds: 90 }) })} />);
    expect(toast()).toBeNull();
  });

  it('stays open through later views, keeps the reset line, and closes itself LOBBY_RULES_TOAST_MS after it opened', async () => {
    vi.useFakeTimers();
    const excluded = rules({ excludedKitIds: ['assassin'] });
    const props = makeLobbyProps({ view: guestLobbyView({ yourKitSelection: 'assassin' }) });
    const { rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true, advanceTimers: vi.advanceTimersByTime });
    rerender(<LobbyScreen {...props} view={guestLobbyView({ yourKitSelection: 'random', lobbyRules: excluded })} />);
    act(() => { vi.advanceTimersByTime(1000); });
    rerender(<LobbyScreen {...props} view={guestLobbyView({ yourKitSelection: 'random', lobbyRules: excluded })} />); // same rules
    rerender(<LobbyScreen {...props} view={guestLobbyView({ yourKitSelection: 'random', lobbyRules: rules({ excludedKitIds: ['assassin', 'ghost'] }) })} />);
    expect(openToast().textContent).toContain(PICK_RESET_BODY);
    act(() => { vi.advanceTimersByTime(LOBBY_RULES_TOAST_MS - 1001); });
    expect(toast()).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    await waitFor(() => { expect(toast()).toBeNull(); });
  });
});
```

Test count: 12 new (8 + 4). (`renderUi`'s `afterEach` restores real timers.)

- [ ] **Step 2: Run them and see them fail.**
  - Command: `pnpm vitest run apps/client/src/screens/lobby/rules-change-notice.test.ts apps/client/src/screens/lobby/lobby-rules-toast.test.tsx`.
  - Expected: `rules-change-notice.test.ts` fails to import `./rules-change-notice`. `lobby-rules-toast.test.tsx` fails to import `RULES_CHANGED_TITLE` / `PICK_RESET_BODY` (`./lobby-copy`) and `./rules-change-notice`.

- [ ] **Step 3: Implement.**
  - **`screens/lobby/rules-change-notice.ts`** (pure). Doc comment: spec v7 §7.4 (Q16, Q17; client only, ready state unchanged), Appendix A `lobby-rules-change-guest-effects`, A.9 rulings 4 and 10. The server sends no notice, so the lobby diffs two consecutive views of one room and one seat.
    - `lobbyRulesNotice(previous, next)` returns null when any of these holds:
      - `previous === null` (the first view);
      - `previous.gameCode !== next.gameCode` or `previous.you !== next.you` (another room, or a claim that changed the seat);
      - `next.isSpectator === true` (a walk-in, ruling 10);
      - `next.hostPlayerId === next.you` (the host);
      - the rules are the same.
    - It compares `previous.lobbyRules ?? defaultLobbyRules()` with `next.lobbyRules ?? defaultLobbyRules()`, as the lobby renders them. They are the same when the excluded kits match as a set (same length, every id included), `randomOnly` is equal and `turnTimeSeconds` is equal.
    - Otherwise it returns `{ pickReset }`:
      - `pickReset` is true only when the previous pick was a kit K (not `'random'`), `next.yourKitSelection === 'random'`, K is excluded in the new rules, and K was not excluded before.
      - A Random-only toggle never resets: the server keeps the pick (map-lobby gotcha 17).
    - `mergeRulesNotice(open, incoming)`:
      - `incoming === null` → `open`;
      - otherwise `{ pickReset: incoming.pickReset || open?.pickReset === true }`.
    - `LOBBY_RULES_TOAST_MS = 6000` with the Produces doc comment.
  - **`screens/lobby/lobby-copy.ts`**: add `RULES_CHANGED_TITLE` and `PICK_RESET_BODY` (Produces).
  - **`screens/lobby/lobby-rules-toast.tsx`**:
    - `<Toast open={notice !== null} tone="info" title={RULES_CHANGED_TITLE} {...(notice?.pickReset === true ? { body: PICK_RESET_BODY } : {})} timeoutMs={LOBBY_RULES_TOAST_MS} dismissLabel={LOBBY_DISMISS_LABEL} onDismiss={() => { onDismiss(); }} />`.
    - The cause is ignored: OK and the timer both close it.
    - The title is a constant, so a closing toast never blanks it during its fade.
  - **`screens/lobby/lobby-screen.tsx`**: the exact state, near the other local state, with no effect and no ref:

```tsx
/** The rules toast (L76-15): the last view this screen rendered (the next diff's "previous") and the open notice. */
interface RulesNoticeState {
  readonly seen: LobbyStateView;
  readonly open: LobbyRulesNotice | null;
}
// …in LobbyScreen:
const [rulesNotice, setRulesNotice] = useState<RulesNoticeState>(() => ({ seen: view, open: null }));
if (rulesNotice.seen !== view) {
  // React's "adjust state while rendering" pattern: each new view object is diffed exactly once, and
  // a later view with no notice keeps the open toast (a state update never closes it).
  setRulesNotice({ seen: view, open: mergeRulesNotice(rulesNotice.open, lobbyRulesNotice(rulesNotice.seen, view)) });
}
```

  - Notes on that state:
    - `RulesNoticeState` stays a module-private interface: a `.tsx` exports components and their props only.
    - The initial `seen` is the first view, so the first view never toasts.
    - A phase change unmounts `LobbyScreen` (App renders another branch), so a rematch lobby starts fresh.
    - App's 250 ms `nowMs` rerender keeps the view's identity, so it diffs nothing.
  - Render `<LobbyRulesToast notice={rulesNotice.open} onDismiss={() => { setRulesNotice((current) => ({ ...current, open: null })); }} />` as the last child of the lobby root, never inside a clickable element. The Toast portals to `document.body` on `Z_INDEX.toast`, above sheets.
  - Then run every lobby test once. Where a test reads `ByRole('alert')` or `ByRole('status')` from `screen`, scope it to `within(screen.getByRole('main'))` (Files).

- [ ] **Step 4: Run them and see them pass.**
  - Command: `pnpm vitest run apps/client/src/screens/lobby apps/client/src/App.lobby.test.tsx apps/client/src/ui/primitives/toast.test.tsx`.
  - Expected: the 12 new tests pass. Every existing test passes; at most some lobby role queries were scoped to `main`, with no assertion changed.

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, append to `## Home and lobby (V7 · Lot 76)` after the L76-14 bullets:

```
- `screens/lobby/rules-change-notice.ts`, `lobby-rules-toast.tsx`, `lobby-screen.tsx` (L76-15, spec
  v7 §7.4, Q16/Q17; A.9 rulings 4 and 10): a seated non-host guest gets the lobby's one `Toast`
  (`tone="info"`, polite) when the host changes the rules: "Rules changed", plus the body "Your
  pick was reset to Random." when the host newly excluded the guest's kit pick (the server resets
  it, Lot 70). `lobbyRulesNotice(previous, next)` diffs two consecutive views of one room and one
  seat (excluded kits as a set, Random only, seconds). There is none on the first view, on the
  guest's own Random pick, or for the host and walk-ins. A Random-only toggle is a rule change and
  never a reset (the server keeps the pick). `LobbyScreen` keeps the last view in state ("adjust
  state while rendering", no effect, no ref). A notice that arrives while the toast is open swaps
  its copy in place and keeps the reset line (`mergeRulesNotice`) and the running timer. The toast
  closes on OK or after `LOBBY_RULES_TOAST_MS` (6 s); Esc and state updates never close it. The
  server and ready state are unchanged. Lobby tests scope role queries to `main`: the Toast keeps
  two empty live regions in `document.body`.
```

  - `docs/backlog_v7.md`: L76-15 row `| S | Low | Lot 72, L76-12 | To do |` → `| S | Low | Lot 72, L76-12 | Done |`; Progress `| 76 · Home and lobby | 18 | 8 |` → `| 76 · Home and lobby | 18 | 9 |`; Total: read the current value and add 1.
  - `docs/agent/decisions.md`, append at the end:

```md
## YYYY-MM-DD · [P] A Random-only toggle toasts 'Rules changed' without the reset line (L76-15)

The L76-15 Acceptance says no notice fires "on a Random-only toggle that keeps the pick", and also that 'Rules changed' fires for each field change; spec v7 §7.4 gives guests a toast "when rules change". `randomOnly` is a rules field, and turning it on keeps `yourKitSelection` in the view (the server ignores picks at deal time). Reading: such a toggle never adds the "Your pick was reset to Random." line, but it does show 'Rules changed'. Designer question (Lot 76 plan, Appendix B, Domain D question 2); the default ships until the designer answers.

---
```
  - No What's new edit (A.6).

- [ ] **Step 6: Verify and commit.**
  - Run `pnpm verify` and wait for it to pass.
  - Stage by name, adding any lobby test file whose role queries you scoped:

```
git add apps/client/src/screens/lobby/rules-change-notice.ts apps/client/src/screens/lobby/rules-change-notice.test.ts apps/client/src/screens/lobby/lobby-rules-toast.tsx apps/client/src/screens/lobby/lobby-rules-toast.test.tsx apps/client/src/screens/lobby/lobby-screen.tsx apps/client/src/screens/lobby/lobby-copy.ts docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md
```

  - Commit, with no attribution trailer:

```
feat(lobby): toast guests on rule changes (L76-15)

A Random-only toggle counts as a rule change but never as a pick
reset: the server keeps the pick and only hides it.
```

**Acceptance map:**
- No notice on the first view: `fires nothing on the first view, or on a later view with the same rules`, plus the first assertion of the first component test.
- No notice on unchanged rules: the same pure test.
- No notice on the guest's own Random pick: `fires nothing on the guest's own Random pick`.
- No notice on a Random-only toggle that keeps the pick: `gives no reset line for a Random-only toggle, which keeps the pick` (it still fires 'Rules changed'; recorded in the decisions.md entry of Step 5).
- 'Rules changed' fires for each field change: `fires 'Rules changed' for a change of each field, with no reset line`.
- The reset notice fires only for a newly excluded pick: `adds the reset line only when the host newly excluded the pick`.
- A component test shows the toast to a guest and not to the host:
  - `toasts 'Rules changed' to a seated guest when the host changes a rule; OK closes it and sends nothing`;
  - `adds the reset line when the host's exclusion moved the guest's pick to Random`;
  - `never toasts the host`.
- Brief items beyond the Acceptance line:
  - no toast after a phase change: the remount, the first-view test, and `compares only two views of the same room and seat`;
  - the host and walk-ins get none: `gives the host and walk-ins no notice (A.9 ruling 10)`;
  - the toast stays and closes as ruling 4 says: `stays open through later views, keeps the reset line, and closes itself LOBBY_RULES_TOAST_MS after it opened`.
- `pnpm verify` green: Step 6.

**Decisions:**
- **`LobbyRulesNotice` is `{ pickReset: boolean }`.** A reset always comes with a rule change (only an exclusion resets a pick), so the title is always "Rules changed" and only the body varies. The copy lives in `lobby-copy.ts`, not in the pure helper.
- **One toast carries both notices** (title "Rules changed", body "Your pick was reset to Random."). **Designer question**; the default is implemented.
- **A Random-only toggle fires "Rules changed".** The Acceptance says "no notice … on a Random-only toggle that keeps the pick", while it also says "'Rules changed' fires for each field change" and §7.4 says guests get a toast when the rules change. This plan reads the first clause as "no reset notice". **Designer question** (Contract issues).
- **Excluded kits are compared as a set.** The server keeps them in `KIT_IDS` order, but an order-only difference must never toast.
- **The diff needs the same room and the same seat** (`gameCode` and `you`). A walk-in who claims a seat changes `you`, so no stale comparison crosses the claim.
- **Notices merge while the toast is open** (`mergeRulesNotice`). A host edits rules in quick steps (exclude A, then B). A reset followed one second later by another change would otherwise lose its body line while the guest is still reading. The Toast keeps its running timer on a copy swap.
- **`LOBBY_RULES_TOAST_MS` lives in `rules-change-notice.ts`** beside the helper; `lobby-copy.ts` holds strings only.
- **The first view is the initial `seen` state**, so no render ever diffs against `null` in the component. The helper still answers `null` for `previous === null`, which the first-view test covers.
- **New strings (§10.6):** "Rules changed", "Your pick was reset to Random." (the spec lists it without the final period; as a toast body it is a sentence). "OK" is existing copy.

---

---

### Task L76-16: Restyle the claim sheet and add Claim a seat

**Files:**
- Modify (rewrite in place): `apps/client/src/screens/claim-seat-dialog.tsx` on the V7 `Dialog`, props unchanged; no `design/` import left.
- Modify:
  - `apps/client/src/screens/claim-seat.ts`: add `claimSelection`.
  - `apps/client/src/screens/lobby/lobby-kit-card.tsx`: `onReopenClaim?` and the walk-in banner's **Claim a seat**.
  - `apps/client/src/screens/lobby/lobby-screen.tsx`: `onReopenClaim?` (A.4 final shape), passed to `LobbyKitCard`.
  - `apps/client/src/screens/lobby/lobby-copy.ts`: `CLAIM_SEAT_LABEL`.
  - `apps/client/src/App.tsx`: the lobby branch only (`onReopenClaim`).
  - `apps/client/src/App.lobby.test.tsx`: +4 tests (a second `describe`).
  - `docs/agent/frontend.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`.
- Test (create):
  - `apps/client/src/screens/claim-seat.test.ts` (5, node: the 4 pure tests moved unchanged + 1 new);
  - `apps/client/src/screens/claim-seat-dialog.test.tsx` (6, happy-dom);
  - `apps/client/src/screens/lobby/lobby-claim-seat.test.tsx` (3, happy-dom).
- Delete: `apps/client/src/screens/claim-seat-dialog.test.ts` (A.7 split: pure suites → `claim-seat.test.ts`, dialog source-text tests → `claim-seat-dialog.test.tsx`, the App wiring test → `App.lobby.test.tsx`).
- Existing tests that must stay green unchanged:
  - `App.arena.test.tsx`: its claim test finds the picker by the same title and 'Stay spectating'.
  - `screens/table.claim-seat-dialog.test.ts`, `screens/arena/spectator.test.tsx`, `screens/arena/reconnect-banner.test.tsx`.
  - The L76-14 tests in `App.lobby.test.tsx`, every `screens/lobby/*.test.tsx`.

**Interfaces:**
- Consumes:
  - L76-12: `LobbyKitCard` + `LobbyKitCardProps` (the walk-in banner: heading "Watching the lobby" and its line).
  - L76-14: `App.lobby.test.tsx` harness (`fake`, `renderApp`, `show`, `ARENA_SWITCH_KEY`), `fakeRoomConnection`.
  - `./test-lobby`: `makeLobbyProps`, `expectNoLobbyIntent`, `guestLobbyView`, `hostLobbyView`, `walkInLobbyView`, `LOBBY_HOST`, `LOBBY_GUEST`, `LOBBY_BOT`.
  - ui: `Dialog` (`ui/primitives/dialog`), `Button` (`ui/primitives/button`), `CHROME_FOCUS_CLASS`, `CHROME_SHAPE_SM_CLASS` (`ui/primitives/chrome-classes`), `v7SeatColor` (`ui/palette`), `seatIndexOf` (`ui/seat-colors`).
  - Shared: `ClaimableSeatView`, `LobbySeatView`.
- Produces:

```ts
// screens/claim-seat.ts (added)
/**
 * The seat Sit here would claim (L57-13, L57-15): the player's pick while it is still listed, else a
 * sole listed seat (pre-selected so Sit here works at once), else none. Never a nickname match.
 */
export function claimSelection(
  seats: readonly Pick<ClaimableSeatView, 'playerId'>[],
  picked: string | null,
): string | null;

// screens/claim-seat-dialog.tsx: ClaimSeatDialogProps unchanged
export function ClaimSeatDialog(props: ClaimSeatDialogProps): ReactElement | null;

// screens/lobby/lobby-kit-card.tsx: LobbyKitCardProps gains
  /** App's claim picker reopen (§7.2, Q24, A.9 ruling 9): present only for a walk-in while seats are claimable. */
  readonly onReopenClaim?: () => void;

// screens/lobby/lobby-screen.tsx: LobbyScreenProps gains (A.4 final shape)
  /** App's claim picker reopen; present only while a walk-in has claimable seats. L76-16. */
  onReopenClaim?: () => void;

// screens/lobby/lobby-copy.ts
/** §10.6: a walk-in's control that reopens App's claim picker after Stay (§7.2, Q24). The arena's `spectator-model.ts` has the same words; the lobby never imports `screens/arena/`. */
export const CLAIM_SEAT_LABEL = 'Claim a seat';
```

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/screens/claim-seat.test.ts` (5 tests):
- Header comment: "Claim-seat picker helpers: L57-13, L57-15, L57-16. The pure suites moved unchanged from `claim-seat-dialog.test.ts` (L76-16, technical spec v7 §12.1, §12.2); the dialog's tests are `claim-seat-dialog.test.tsx`."
- Imports: `describe, expect, it` from `vitest` and `claimSelection, claimStayLabel, shouldShowClaimPicker, walkInSeesPrivateHands` from `./claim-seat`. No `node:fs`, `node:path` or `node:url`.
- Copy these three `describe` blocks from `claim-seat-dialog.test.ts` character for character:
  - `claimStayLabel (L57-13)` (1 test);
  - `shouldShowClaimPicker (L57-15)` (2 tests);
  - `walkInSeesPrivateHands (L57-16)` (1 test).
- Then append:

```ts
describe('claimSelection (L57-15, Review Focus 5)', () => {
  it('keeps a pick while it is listed, else pre-selects a sole seat, else picks nothing', () => {
    const ana = { playerId: 'p-ana' };
    const bo = { playerId: 'p-bo' };
    expect(claimSelection([ana], null)).toBe('p-ana');
    expect(claimSelection([ana, bo], null)).toBeNull();
    expect(claimSelection([ana, bo], 'p-bo')).toBe('p-bo');
    expect(claimSelection([ana, bo], 'p-cy')).toBeNull(); // the pick left the set
    expect(claimSelection([bo], 'p-cy')).toBe('p-bo');
    expect(claimSelection([], null)).toBeNull();
  });
});
```

`apps/client/src/screens/claim-seat-dialog.test.tsx` (6 tests):

```tsx
// @vitest-environment happy-dom
/**
 * The claim sheet: technical spec v7 §7.7 (any dismissal is Stay), §6.7, §10.6; Appendix A
 * `claim-seat-dialog`, `global-claim-seat-overlay`, `claim-seat-dismiss-stay`; L57-13, L57-15;
 * A.9 ruling 5; Review Focus 5 (L76-16). Replaces the source-text `claim-seat-dialog.test.ts`.
 */
import type { ClaimableSeatView } from '@card-battle/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { v7SeatColor } from '../ui/palette';
import { ClaimSeatDialog, type ClaimSeatDialogProps } from './claim-seat-dialog';

const TITLE = 'Sit as a disconnected player?';
/** `view.players` order: a seat's hue is its index here. */
const PLAYER_IDS = ['host', 'p-ana', 'p-ana-2', 'p-ana-3'];
const ANA: ClaimableSeatView = { playerId: 'p-ana', nickname: 'Ana' };
const ANA_TWIN: ClaimableSeatView = { playerId: 'p-ana-2', nickname: 'Ana' };
const ANA_LOWER: ClaimableSeatView = { playerId: 'p-ana-3', nickname: 'ana' };

function props(overrides: Partial<ClaimSeatDialogProps> = {}): ClaimSeatDialogProps {
  return { open: true, seats: [ANA, ANA_TWIN, ANA_LOWER], playerIds: PLAYER_IDS, stayLabel: 'Stay spectating', onClaim: vi.fn(), onStay: vi.fn(), ...overrides };
}
function renderOnce(overrides: Partial<ClaimSeatDialogProps> = {}) {
  const p = props(overrides);
  return { p, ...renderUi(<ClaimSeatDialog {...p} />, { reducedMotion: true }) };
}
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: TITLE });
function row(playerId: string): HTMLElement {
  const found = sheet().querySelector<HTMLElement>(`[data-claim-seat="${playerId}"]`);
  if (found === null) throw new Error(`no seat row ${playerId}`);
  return found;
}
const pressed = (playerId: string): string | null => row(playerId).getAttribute('aria-pressed');
function dotColor(playerId: string): string {
  const dot = row(playerId).querySelector<HTMLElement>('[data-claim-seat-dot]');
  if (dot === null) throw new Error(`no dot on ${playerId}`);
  return dot.style.backgroundColor;
}
/** A hex as happy-dom reads back a background colour (the table-banner-host test pattern). */
function cssBackground(hex: string): string {
  const probe = document.createElement('span');
  probe.style.backgroundColor = hex;
  return probe.style.backgroundColor;
}
const sitHere = (): HTMLElement => within(sheet()).getByRole('button', { name: 'Sit here' });
const isDisabled = (element: HTMLElement): boolean =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
/** A 390×844 phone, so the Dialog is a bottom sheet with a swipe handle (never the default window). */
class FakeVisualViewport extends EventTarget { offsetTop = 0; offsetLeft = 0; width = 390; height = 844; }

afterEach(() => { vi.unstubAllGlobals(); });

describe('ClaimSeatDialog (§7.7, L57-13, L57-15)', () => {
  it('lists every claimable seat apart, same nicknames included, in its seat hue under the V7 copy, with nothing pre-selected (L57-13)', async () => {
    const { p, user } = renderOnce();
    expect(within(sheet()).getByText('Nicknames are not unique. Pick the seat by color, or keep watching.')).toBeDefined();
    const ids = ['p-ana', 'p-ana-2', 'p-ana-3'];
    expect(ids.map((id) => row(id).textContent)).toEqual(['Ana', 'Ana', 'ana']);
    expect(ids.map(dotColor)).toEqual([1, 2, 3].map((index) => cssBackground(v7SeatColor(index))));
    expect(ids.map(pressed)).toEqual(['false', 'false', 'false']);
    expect(isDisabled(sitHere())).toBe(true);
    await user.click(sitHere());
    expect(p.onClaim).not.toHaveBeenCalled();
    await user.click(row('p-ana-2'));
    expect(ids.map(pressed)).toEqual(['false', 'true', 'false']);
    await user.click(sitHere());
    expect(vi.mocked(p.onClaim).mock.calls).toEqual([['p-ana-2']]);
    expect(p.onStay).not.toHaveBeenCalled();
  });

  it('pre-selects the only listed seat, so Sit here claims it at once (L57-15)', async () => {
    const { p, user } = renderOnce({ seats: [ANA_TWIN] });
    expect(pressed('p-ana-2')).toBe('true');
    expect(isDisabled(sitHere())).toBe(false);
    await user.click(sitHere());
    expect(vi.mocked(p.onClaim).mock.calls).toEqual([['p-ana-2']]);
  });

  it("tags only the lobby host's seat Host, and none when App passes no host (table, End)", () => {
    const { unmount } = renderOnce({ hostPlayerId: 'p-ana' });
    expect(within(row('p-ana')).queryByText('Host')).not.toBeNull();
    expect(within(row('p-ana-2')).queryByText('Host')).toBeNull();
    unmount();
    renderOnce();
    expect(within(sheet()).queryByText('Host')).toBeNull();
  });

  it('labels Stay with the stay label App gives it', () => {
    renderOnce({ stayLabel: 'Keep this seat' });
    expect(within(sheet()).getByRole('button', { name: 'Keep this seat' })).toBeDefined();
    expect(within(sheet()).queryByRole('button', { name: 'Stay spectating' })).toBeNull();
  });

  it('makes every dismissal Stay: the Stay button, Esc, a backdrop press and a swipe-down each call onStay once (§7.7, L57-16)', async () => {
    vi.stubGlobal('visualViewport', new FakeVisualViewport());
    const viaButton = renderOnce();
    await viaButton.user.click(within(sheet()).getByRole('button', { name: 'Stay spectating' }));
    expect([vi.mocked(viaButton.p.onStay).mock.calls.length, vi.mocked(viaButton.p.onClaim).mock.calls.length]).toEqual([1, 0]);
    viaButton.unmount();
    const viaEsc = renderOnce();
    await viaEsc.user.keyboard('{Escape}');
    expect([vi.mocked(viaEsc.p.onStay).mock.calls.length, vi.mocked(viaEsc.p.onClaim).mock.calls.length]).toEqual([1, 0]);
    viaEsc.unmount();
    const viaBackdrop = renderOnce();
    const overlay = sheet().closest<HTMLElement>('[data-zone="sheet-overlay"]');
    if (overlay === null) throw new Error('no sheet overlay');
    await viaBackdrop.user.click(overlay);
    expect([vi.mocked(viaBackdrop.p.onStay).mock.calls.length, vi.mocked(viaBackdrop.p.onClaim).mock.calls.length]).toEqual([1, 0]);
    viaBackdrop.unmount();
    const viaSwipe = renderOnce();
    const handle = sheet().querySelector<HTMLElement>('[data-zone="sheet-handle"]');
    if (handle === null) throw new Error('no swipe handle');
    fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 220 });
    expect([vi.mocked(viaSwipe.p.onStay).mock.calls.length, vi.mocked(viaSwipe.p.onClaim).mock.calls.length]).toEqual([1, 0]);
  });

  it('drops a pick that leaves the set, disables Sit here, and sends one claim per set on a double tap (Review Focus 5)', async () => {
    const { p, user, rerender } = renderOnce();
    await user.click(row('p-ana-3'));
    rerender(<ClaimSeatDialog {...p} seats={[ANA, ANA_TWIN]} />); // another player claimed p-ana-3 first
    expect([pressed('p-ana'), pressed('p-ana-2')]).toEqual(['false', 'false']);
    expect(isDisabled(sitHere())).toBe(true);
    await user.click(sitHere());
    expect(p.onClaim).not.toHaveBeenCalled();
    await user.click(row('p-ana-2'));
    await user.dblClick(sitHere());
    expect(vi.mocked(p.onClaim).mock.calls).toEqual([['p-ana-2']]);
    rerender(<ClaimSeatDialog {...p} seats={[ANA_TWIN]} />); // a new set is a new question: Sit here re-arms
    await user.click(sitHere());
    expect(vi.mocked(p.onClaim).mock.calls).toEqual([['p-ana-2'], ['p-ana-2']]);
  });
});
```

`apps/client/src/screens/lobby/lobby-claim-seat.test.tsx` (3 tests):

```tsx
// @vitest-environment happy-dom
/** The lobby's Claim a seat: technical spec v7 §7.2 (Q24), §10.6; Appendix A `lobby-walk-in-notice`; A.9 rulings 6 and 9 (L76-16). */
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { CLAIM_SEAT_LABEL } from './lobby-copy';
import { LobbyScreen } from './lobby-screen';
import { expectNoLobbyIntent, guestLobbyView, makeLobbyProps, walkInLobbyView } from './test-lobby';

const claimSeat = (): HTMLElement | null => within(screen.getByRole('main')).queryByRole('button', { name: CLAIM_SEAT_LABEL });
const isDisabled = (element: HTMLElement): boolean =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';

describe('lobby Claim a seat (§7.2, Q24, A.9 ruling 9)', () => {
  it("gives a walk-in a primary Claim a seat only while App passes onReopenClaim; a press calls it and sends nothing", async () => {
    const onReopenClaim = vi.fn<() => void>();
    const props = makeLobbyProps({ view: walkInLobbyView(), onReopenClaim });
    const { user, rerender } = renderUi(<LobbyScreen {...props} />, { reducedMotion: true });
    const button = claimSeat();
    if (button === null) throw new Error('no Claim a seat');
    expect(button.getAttribute('data-variant')).toBe('primary');
    await user.click(button);
    expect(onReopenClaim).toHaveBeenCalledTimes(1);
    expectNoLobbyIntent(props);
    rerender(<LobbyScreen {...makeLobbyProps({ view: walkInLobbyView() })} />); // the set emptied: App passes none
    expect(claimSeat()).toBeNull();
  });

  it('shows no Claim a seat to a seated guest, even with onReopenClaim (it lives in the walk-in banner)', () => {
    renderUi(<LobbyScreen {...makeLobbyProps({ view: guestLobbyView(), onReopenClaim: vi.fn() })} />);
    expect(claimSeat()).toBeNull();
  });

  it('keeps Claim a seat live while reconnecting (A.9 ruling 6)', async () => {
    const onReopenClaim = vi.fn<() => void>();
    const { user } = renderUi(<LobbyScreen {...makeLobbyProps({ view: walkInLobbyView(), status: 'reconnecting', onReopenClaim })} />);
    const button = claimSeat();
    if (button === null) throw new Error('no Claim a seat');
    expect(isDisabled(button)).toBe(false);
    await user.click(button);
    expect(onReopenClaim).toHaveBeenCalledTimes(1);
  });
});
```

Append to `apps/client/src/App.lobby.test.tsx` (4 tests). Add `waitFor` to the `@testing-library/react` import, `type ClaimableSeatView, type LobbySeatView` to the shared import, and `LOBBY_BOT, LOBBY_GUEST, LOBBY_HOST, walkInLobbyView` to the `./screens/lobby/test-lobby` import. The file header gains "L76-16: the claim picker wiring (§7.7, §7.2, Q24; Appendix A `claim-seat-dismiss-stay`)."

```tsx
describe('App claim picker wiring (§7.7, §7.2, Q24, L57-15, L76-16)', () => {
  const picker = (): HTMLElement | null => screen.queryByRole('dialog', { name: 'Sit as a disconnected player?' });
  /** A reserved human seat whose player dropped: the lobby lists it as claimable. */
  const DEE: LobbySeatView = { id: 'dee', nickname: 'Dee', isBot: false, isReady: false };
  const DEE_FREE: readonly ClaimableSeatView[] = [{ playerId: 'dee', nickname: 'Dee' }];
  const seats = [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT, DEE];

  it('shows no picker to a seated living player during play, so Draw stays reachable (L57-15)', () => {
    renderApp(fakeRoomConnection(makePlayingView({ claimableSeats: [{ playerId: 'p1', nickname: 'p1' }] })));
    expect(picker()).toBeNull();
    expect(within(document.querySelector<HTMLElement>('[data-arena-region="dock"]') ?? document.body).getByRole('button', { name: /^Draw, plus / })).toBeDefined();
  });

  it('a lobby walk-in: Stay sends staySpectating once and hides the picker for that set, Claim a seat reopens it, Esc is Stay, and an empty set leaves no control (ruling 9)', async () => {
    const staySpectating = vi.fn<() => void>();
    const walkIn = (claimableSeats: readonly ClaimableSeatView[]) =>
      fakeRoomConnection(walkInLobbyView({ players: seats, claimableSeats }), { staySpectating });
    const result = renderApp(walkIn(DEE_FREE));
    const open = picker();
    if (open === null) throw new Error('the claim picker did not open');
    await result.user.click(within(open).getByRole('button', { name: 'Stay spectating' }));
    expect(staySpectating).toHaveBeenCalledTimes(1);
    await waitFor(() => { expect(picker()).toBeNull(); });
    show(result, walkIn(DEE_FREE)); // a new view, the same set: still hidden
    expect(picker()).toBeNull();
    await result.user.click(screen.getByRole('button', { name: 'Claim a seat' }));
    expect(picker()).not.toBeNull();
    expect(staySpectating).toHaveBeenCalledTimes(1);
    await result.user.keyboard('{Escape}');
    expect(staySpectating).toHaveBeenCalledTimes(2);
    await waitFor(() => { expect(picker()).toBeNull(); });
    show(result, walkIn([]));
    expect(screen.queryByRole('button', { name: 'Claim a seat' })).toBeNull();
    expect(picker()).toBeNull();
  });

  it("a seated non-host lobby guest's Keep this seat sends nothing and hides the picker; no Claim a seat (L57-16)", async () => {
    const staySpectating = vi.fn<() => void>();
    const { user } = renderApp(fakeRoomConnection(guestLobbyView({ players: seats, claimableSeats: DEE_FREE }), { staySpectating }));
    const open = picker();
    if (open === null) throw new Error('the claim picker did not open');
    await user.click(within(open).getByRole('button', { name: 'Keep this seat' }));
    await waitFor(() => { expect(picker()).toBeNull(); });
    expect(staySpectating).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Claim a seat' })).toBeNull();
  });

  it('never shows the picker to the lobby host (L57-15)', () => {
    renderApp(fakeRoomConnection(hostLobbyView({ players: seats, claimableSeats: DEE_FREE })));
    expect(picker()).toBeNull();
  });
});
```

Test count: 18 new (5 + 6 + 3 + 4). The 4 moved pure tests are among the 5; the deleted file had 7.

- [ ] **Step 2: Run them and see them fail.**
  - Command: `pnpm vitest run apps/client/src/screens/claim-seat.test.ts apps/client/src/screens/claim-seat-dialog.test.tsx apps/client/src/screens/lobby/lobby-claim-seat.test.tsx apps/client/src/App.lobby.test.tsx`.
  - Expected:
    - `claim-seat.test.ts` fails to import `claimSelection`.
    - `claim-seat-dialog.test.tsx` fails: the V2 dialog has no `[data-claim-seat]` rows and no dots, Sit here sends twice, and the 390×844 sheet has no swipe handle.
    - `lobby-claim-seat.test.tsx` fails: there is no Claim a seat button (and `CLAIM_SEAT_LABEL` is missing from `./lobby-copy`).
    - `App.lobby.test.tsx`: the walk-in test fails at Claim a seat. The playing, guest and host cases pin today's behavior and pass.

- [ ] **Step 3: Implement.**
  - **`screens/claim-seat.ts`**:
    - Import `type ClaimableSeatView` beside `PublicPlayerView`.
    - Add `claimSelection` (Produces): return `picked` when some seat has that `playerId`; else the sole seat's `playerId` when `seats.length === 1`; else `null`. Destructure the first seat for `noUncheckedIndexedAccess`.
  - **`screens/claim-seat-dialog.tsx`** (rewrite; keep the export and `ClaimSeatDialogProps` verbatim):
    - Doc comment: spec v7 §7.7 (a V7 sheet over Lobby, Table and End; any dismissal is Stay), §6.7 (Esc closes only the top sheet), PROTOCOL_VERSION 32 / L57-13 (nickname and seat hue, no auto-match), L57-15 (the sole seat pre-selected), L57-16 (Stay is explicit), A.9 ruling 5, Review Focus 5.
    - Imports: `Dialog`, `Button`, `CHROME_FOCUS_CLASS`, `CHROME_SHAPE_SM_CLASS`, `v7SeatColor`, `seatIndexOf`, `claimSelection`. No `design/` import.
    - State: `const [picked, setPicked] = useState<string | null>(null)`; `const selectedId = claimSelection(seats, picked)`.
    - Latch (ruling 5, re-implemented locally):
      - `const seatsKey = seats.map((seat) => seat.playerId).join('|')` (App's `claimableKey`);
      - `const claimedFor = useRef<string | null>(null)`;
      - `sitHere = () => { if (selectedId === null || claimedFor.current === seatsKey) return; claimedFor.current = seatsKey; onClaim(selectedId); }`;
      - doc comment: App keeps the dialog mounted while the server answers, so a double tap would send twice; a new set (someone else sat, a seat dropped) is a new question and re-arms it; the ref is read and written only in this handler, never during render (React Compiler lint), as `screens/arena/top-bar.tsx`.
    - Render:

```tsx
<Dialog
  open={open}
  title="Sit as a disconnected player?"
  onClose={onStay}
  actions={
    <>
      <Button variant="secondary" onClick={onStay}>{stayLabel}</Button>
      <Button variant="primary" disabled={selectedId === null} focusableWhenDisabled onClick={sitHere}>Sit here</Button>
    </>
  }
>
  <p className="font-v7-body text-v7-body font-bold text-v7-text">
    Nicknames are not unique. Pick the seat by color, or keep watching.
  </p>
  <ul className="mt-3 flex flex-col gap-2">
    {seats.map((seat) => /* one row: below */)}
  </ul>
</Dialog>
```

  - Each row is `<li key={seat.playerId}>` around a full-width `<button type="button" aria-pressed={selected} data-claim-seat={seat.playerId} onClick={() => { setPicked(seat.playerId); }}>`:
    - Classes: `flex min-h-11 w-full items-center gap-3 bg-v7-panel-2 px-3 py-2 text-left`, plus `CHROME_SHAPE_SM_CLASS` and `CHROME_FOCUS_CLASS`. A selected row adds `ring-(length:--chrome-outline-width) ring-v7-cta`, the `KitTile` selected ring. Being selected is never shown by color alone: `aria-pressed` carries it.
    - Children, in order:
      - the dot: `<span data-claim-seat-dot="" aria-hidden="true" className="size-6 shrink-0 rounded-full border-(length:--chrome-outline-width) border-v7-ink" style={{ backgroundColor: v7SeatColor(seatIndexOf({ players: playerIds.map((id) => ({ id })) }, seat.playerId) ?? 0) }} />`;
      - the nickname: `<span className="min-w-0 wrap-anywhere font-v7-display text-v7-body leading-tight text-v7-text">{seat.nickname}</span>`;
      - when `hostPlayerId !== undefined && seat.playerId === hostPlayerId`: `<span className="font-v7-body text-v7-caption font-extrabold uppercase text-v7-text-2">Host</span>`.
  - Dialog behavior notes:
    - The first focusable in the panel is the first seat row, which takes the initial focus.
    - Sit here uses `focusableWhenDisabled`, so a set change under a focused Sit here never drops focus to `body`.
    - Esc, backdrop and swipe go through `onClose={onStay}`, the same call as the Stay button.
  - **`screens/lobby/lobby-copy.ts`**: add `CLAIM_SEAT_LABEL` (Produces).
  - **`screens/lobby/lobby-kit-card.tsx`**:
    - Add `onReopenClaim?` to `LobbyKitCardProps`.
    - In the walk-in banner (after its heading and line), render `{onReopenClaim !== undefined ? <Button variant="primary" onClick={onReopenClaim}>{CLAIM_SEAT_LABEL}</Button> : null}`.
    - It ignores `locked` (ruling 6: it sends nothing).
    - The Your kit card and the Random-only line never render it.
  - **`screens/lobby/lobby-screen.tsx`**: add `onReopenClaim?` to `LobbyScreenProps` (A.4 doc comment) and pass `{...(onReopenClaim !== undefined ? { onReopenClaim } : {})}` to `LobbyKitCard` (`exactOptionalPropertyTypes`).
  - **`App.tsx`**, lobby branch only. After `onSendChat={sendChat}` (and L76-14's `onDismissError`), add:

```tsx
          // Claim a seat (L76-16, §7.2, Q24, A.9 ruling 9): a walk-in only, while seats are claimable,
          // as the arena (L74-23). A null dismissed key shows the picker again for the same set.
          {...(walkInSpectator && claimableSeats.length > 0
            ? {
                onReopenClaim: () => {
                  setClaimDismissedKey(null);
                },
              }
            : {})}
```

  `claimDialog`, the `playing` and `finished` branches, and `ClaimSeatDialog`'s props from App stay as they are.
  - **Delete** `apps/client/src/screens/claim-seat-dialog.test.ts` once its three successors exist.

- [ ] **Step 4: Run them and see them pass.**
  - Command: `pnpm vitest run apps/client/src/screens/claim-seat.test.ts apps/client/src/screens/claim-seat-dialog.test.tsx apps/client/src/screens/lobby apps/client/src/App.lobby.test.tsx apps/client/src/App.arena.test.tsx apps/client/src/screens/table.claim-seat-dialog.test.ts apps/client/src/screens/arena/spectator.test.tsx apps/client/src/screens/arena/reconnect-banner.test.tsx`.
  - Expected: the 18 tests listed in Step 1 pass (the 4 moved ones unchanged), and every existing test in those paths passes with no assertion edited. `claim-seat-dialog.test.ts` no longer exists.

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, append to `## Home and lobby (V7 · Lot 76)` after the L76-15 bullet:

```
- `screens/claim-seat-dialog.tsx`, `claim-seat.ts` (L76-16, spec v7 §7.7, §6.7; Appendix A
  `claim-seat-dialog`, `claim-seat-dismiss-stay`): the claim picker is a V7 `Dialog` (a bottom sheet
  on phones, centered on desktop; Esc closes only the top sheet), with unchanged props. It shows
  "Sit as a disconnected player?", the "Nicknames are not unique…" line, and one `aria-pressed` row
  per claimable seat: a `v7SeatColor` dot (the seat's index in `view.players`), the nickname, and
  "Host" on the lobby host's seat. There is no nickname auto-match: `claimSelection` pre-selects
  only a sole seat and drops a pick that leaves the set. The actions are Stay (`secondary`,
  `stayLabel`) and Sit here (`primary`, `focusableWhenDisabled` while nothing is picked). Esc,
  backdrop, swipe and Stay all call `onStay`. Sit here sends once per claimable set: a ref latch
  keyed by the seat ids, read only in its handler; a new set re-arms it. App still mounts it only
  while the picker shows. It imports nothing from `design/`.
- `screens/lobby/lobby-kit-card.tsx`, `lobby-screen.tsx`, `App.tsx` (L76-16, spec v7 §7.2, Q24; A.9
  rulings 6 and 9): a lobby walk-in's "Watching the lobby" banner shows a primary **Claim a seat**
  (`CLAIM_SEAT_LABEL`, the arena's words) while App passes `onReopenClaim`. App does so in the lobby
  branch under the arena's condition (`walkInSpectator && claimableSeats.length > 0`); it clears the
  dismissed key, so the picker shows again for the same set. It sends nothing and stays live while
  reconnecting. A seated guest who kept their seat gets no control (Appendix B question).
```

  - `docs/agent/frontend.md` › `## Screens`: replace the row `| Claim | Overlay when \`claimableSeats\` is non-empty — sit or stay spectating | \`screens/claim-seat-dialog.tsx\` |` with `| Claim | V7 \`Dialog\` over Lobby, Table and End when \`claimableSeats\` is non-empty — sit or stay; a walk-in reopens it with **Claim a seat** (arena strip, lobby banner) | \`screens/claim-seat-dialog.tsx\` + \`claim-seat.ts\` |`.
  - `docs/agent/frontend.md` › `## Conventions`, in the connection-hook bullet, replace the two lines

```
  `ClaimSeatDialog` lists living disconnected seats (nickname + seat color, no auto-match)
  with **Sit here** / **Stay spectating**. A single listed seat is pre-selected. The
```

  with

```
  `ClaimSeatDialog` (a V7 `Dialog` from L76-16) lists living disconnected seats (nickname +
  seat hue, no auto-match) with **Sit here** / **Stay spectating** (a seated lobby guest:
  **Keep this seat**). A single listed seat is pre-selected. The
```

  - `docs/backlog_v7_test_classification.md`, Owner lot 76 rows of `screens/claim-seat-dialog.test.ts`. Append each text to the end of the row's last cell, before its closing `|`:
    - `claimStayLabel (L57-13) > keeps a lobby guest…`: ` **Done (L76-16):** moved unchanged to \`screens/claim-seat.test.ts\` › 'keeps a lobby guest on their new seat and spectates otherwise'.`
    - `shouldShowClaimPicker (L57-15) > hides the picker…`: ` **Done (L76-16):** moved unchanged to \`screens/claim-seat.test.ts\` › 'hides the picker from a living seated player during play'.`
    - `shouldShowClaimPicker (L57-15) > shows the picker…`: ` **Done (L76-16):** moved unchanged to \`screens/claim-seat.test.ts\` › 'shows the picker to walk-in spectators and lobby guests'.`
    - `claim seat dialog (L57-13) > lists claimable nicknames without auto-matching`: ` **Done (L76-16):** replaced by \`screens/claim-seat-dialog.test.tsx\` › 'lists every claimable seat apart, same nicknames included, in its seat hue under the V7 copy, with nothing pre-selected (L57-13)'.`
    - `claim seat dialog (L57-13) > pre-selects the only claimable seat…`: ` **Done (L76-16):** replaced by \`screens/claim-seat-dialog.test.tsx\` › 'pre-selects the only listed seat, so Sit here claims it at once (L57-15)' and the two-seat case of 'lists every claimable seat apart…'.`
    - `App claim picker wiring (L57-15) > gates the dialog on shouldShowClaimPicker…`: ` **Done (L76-16):** replaced by \`App.lobby.test.tsx\` › 'shows no picker to a seated living player during play, so Draw stays reachable (L57-15)', 'a lobby walk-in: Stay sends staySpectating once …', 'a seated non-host lobby guest's Keep this seat sends nothing …', 'never shows the picker to the lobby host (L57-15)'; the backdrop dismissal is \`screens/claim-seat-dialog.test.tsx\` › 'makes every dismissal Stay …'.`
  - The Owner lot 75 row `screens/claim-seat-dialog.test.ts` › `walkInSeesPrivateHands (L57-16)`: append ` **Moved (L76-16):** the suite now lives in \`screens/claim-seat.test.ts\`, assertions unchanged.` Lot 75 owns the row's outcome.
  - `docs/backlog_v7.md`: L76-16 row `| M | Medium | Lot 72, L76-12 | To do |` → `| M | Medium | Lot 72, L76-12 | Done |`; Progress `| 76 · Home and lobby | 18 | 9 |` → `| 76 · Home and lobby | 18 | 10 |`; Total: read the current value and add 1.
  - No `decisions.md` entry: every classified product assertion is replaced and none is retired. No `DESIGN.md` edit: no `ui/` file changes. No What's new edit (A.6).

- [ ] **Step 6: Verify and commit.**
  - Run `pnpm verify` and wait for it to pass.
  - Stage by name:

```
git rm apps/client/src/screens/claim-seat-dialog.test.ts
git add apps/client/src/screens/claim-seat-dialog.tsx apps/client/src/screens/claim-seat.ts apps/client/src/screens/claim-seat.test.ts apps/client/src/screens/claim-seat-dialog.test.tsx apps/client/src/screens/lobby/lobby-kit-card.tsx apps/client/src/screens/lobby/lobby-screen.tsx apps/client/src/screens/lobby/lobby-copy.ts apps/client/src/screens/lobby/lobby-claim-seat.test.tsx apps/client/src/App.tsx apps/client/src/App.lobby.test.tsx docs/agent/frontend.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
```

  - Commit, with no attribution trailer:

```
feat(lobby): claim sheet and Claim a seat (L76-16)

claim-seat-dialog.test.ts is split per §12.1: the pure suites move
unchanged to claim-seat.test.ts, and the dialog and App source-text
tests become rendered tests.
```

**Acceptance map:**
- The copy 'Sit as a disconnected player?' and 'Nicknames are not unique…' is present: `lists every claimable seat apart, same nicknames included, …` (the title through `getByRole('dialog', { name })`, the line through `getByText`).
- Two same-nickname seats are both listed and neither is pre-selected: the same test ('Ana', 'Ana' and 'ana', all `aria-pressed="false"`, Sit here disabled).
- A single seat is pre-selected and Sit here is enabled: `pre-selects the only listed seat, so Sit here claims it at once (L57-15)`.
- Every dismissal path calls `onStay` once: `makes every dismissal Stay: the Stay button, Esc, a backdrop press and a swipe-down each call onStay once (§7.7, L57-16)`.
- A walk-in's Stay sends `staySpectating`, and a seated guest's sends nothing:
  - `a lobby walk-in: Stay sends staySpectating once …`;
  - `a seated non-host lobby guest's Keep this seat sends nothing …`.
- Claim a seat reopens the picker for the same claimable set:
  - `a lobby walk-in: … Claim a seat reopens it …` (App);
  - `gives a walk-in a primary Claim a seat only while App passes onReopenClaim; …` (lobby).
- The `claim-seat.ts` tests stay green: `claim-seat.test.ts` (the 4 moved tests verbatim, plus `claimSelection`).
- Review Focus 5: `drops a pick that leaves the set, disables Sit here, and sends one claim per set on a double tap (Review Focus 5)`.
- Brief items beyond the Acceptance line:
  - the seat hue dot: test 1;
  - 'Host': `tags only the lobby host's seat Host, …`;
  - the Stay label: `labels Stay with the stay label App gives it`;
  - the host gets no dialog: `never shows the picker to the lobby host (L57-15)`;
  - seated players keep Draw: `shows no picker to a seated living player during play, …`;
  - Claim a seat stays live while reconnecting: `keeps Claim a seat live while reconnecting (A.9 ruling 6)`.
- `pnpm verify` green: Step 6.

**Decisions:**
- **The Sit here latch is keyed by the claimable set, not by an open counter.** App mounts the dialog with a constant `open`, so it has no reopen of its own. A set change is when App shows the picker again, which makes the set the "open" (ruling 5). A claim rejected without a set change leaves Sit here latched. Stay still works; that reject means the set is about to change.
- **Stay is not latched.** App unmounts the dialog in the same render as `onStay`, so a second Stay press cannot reach it. The component tests count one call per dismissal.
- **The pick rule moved into a pure helper** (`claimSelection` in `claim-seat.ts`) with node tests, beside the existing claim helpers.
- **Stay is `secondary`, Sit here is `primary`.** V2's orange / green map to V7's `--cta-2` / `--cta`. Stay comes first, so the main action ends the row.
- **Sit here uses `focusableWhenDisabled`.** A set change can disable it while it holds focus (Review Focus 5), and a native `disabled` would drop focus to `body`.
- **App keeps mounting the dialog only while it shows** (unchanged `claimDialog`): A.1 limits L76-16's App edit to the lobby branch. So there is no exit fade, and a pick never survives a close.
- **`CLAIM_SEAT_LABEL` is duplicated in `lobby-copy.ts`** (domain note; the lobby never imports `screens/arena/`). A later lot can hoist both copies into `screens/claim-seat.ts`, which both may import.
- **Claim a seat is a full `Button` in the banner**, after its line, `primary` like the arena strip's. It ignores `locked`.
- **No new player-facing string.** Every claim string is V2's verbatim; "Claim a seat" already ships in the arena (§10.6) and is new only on the lobby surface.

---

---

## Part 2 — Briefs (L76-04 … L76-08, L76-11, L76-17, L76-18)

> Expanded into TDD steps once Part 1 is committed on this branch, on the real interfaces. Appendix C.3 lists what Part 1 leaves for each of them.

### L76-04 — Restyle the Home hub and path chrome

**Cx / risk:** M / Medium · **Depends on:** L76-01 · **Spec:** §5.1, §5.2, §5.3, §5.7, §7.1, §10.4, §11, §12.1
**Parity (Appendix A):** `home-hub`, `home-beta-badge`, `home-whats-new`, `home-path-header`, `home-connection-status-and-errors`, `home-forced-exit-landing`, `global-status-labels`, `global-motion-reduced-motion`, `global-art-catalog`, `global-dialog-button-primitives`
**Files:** `apps/client/src/screens/home/`, `apps/client/src/screens/whats-new-dialog.test.ts`, `packages/shared/src/release-notes.ts`, `docs/agent/decisions.md`, `docs/agent/frontend.md`, `DESIGN.md`

Build the hub from §7.1 on the V7 ground (§5.1–§5.3). A 'CARD BATTLE' wordmark (Lilita, arcade outline) sits over a slowly floating fan of holo cards (ui/ Card, existing art, aria-hidden, still under reduced motion). The **Beta** badge (the word only) and the small **New** control with its unread dot sit top-right; New is not a hub row button (L63-07). Three illustrated mode tiles, Solo / Online / Tutorial, use existing extracted art (§5.5); their labels keep the current wording unless the designer rules otherwise. Secondary **How to play** and **Feedback** buttons follow, and the eyebrow and helper copy stay. Restyle the path header (Back, Feedback, title, subtitle) and the status block. Idle stays unlabeled, the status copy comes from `homeStatusCopy`, and the role=alert error sits under the title. Mode transitions honor reduced motion. New is disabled while `soloLaunchPending` (§11, Q7/Q8). Retire the style-only What's new assertions with a `decisions.md` entry that cites §5.1/§7.1 and supersedes 'New is never disabled'. Update the `frontend.md` Home and What's new paragraphs, and `DESIGN.md` if any token is added. Open or append the V7 What's new entry.

**Acceptance:** Rendered tests prove each of these. The tiles open their paths through the soft gate. Every hub control and the path Back/Feedback buttons are disabled while busy. New is disabled during a solo launch and keeps its unread label. The card fan is aria-hidden and does not move under reduced motion. No Inbox, Admin, protocol or Reset help control appears. A browser check at 360×740 and 1440×900 shows no horizontal scroll, and the hub scrolls inside `#root`. `pnpm verify` green.

**Review:** Mode tiles keep the current labels "Play solo", "Play online", "Tutorial" (§10.6).

### L76-05 — Rebuild What's new as a V7 sheet

**Cx / risk:** S / Low · **Depends on:** L76-04 · **Spec:** §7.1, §7.7, §10.4, §12.1
**Parity (Appendix A):** `home-whats-new`, `home-whats-new-dismiss`, `home-whats-new-seen-storage`, `global-client-storage`, `global-card-face`
**Files:** `apps/client/src/screens/whats-new-dialog.tsx`, `apps/client/src/screens/whats-new-dialog.test.ts`, `docs/agent/frontend.md`

Replace `whats-new-dialog.tsx` with a V7 sheet (§7.1, §7.7). The auto-open shows only the latest entry. New opens the full dated history, newest first, with 'Latest' under the first title. Each entry keeps its date eyebrow and title, its Before/After items with a card thumb (ui/ Card, base art) or kit portrait, and the **New** additions block below the items. 'Got it' stays. Esc, backdrop, swipe-down and Got it all mark the latest id seen (L65-05). Rewrite the dialog half of `whats-new-dialog.test.ts` as rendered tests. The catalog assertions (latest id, item counts, dates) stay as data tests and change with each What's new append.

**Acceptance:** Rendered tests prove each of these. The current scope renders one entry, and the history scope renders every entry in catalog order with 'Latest' on the first. Items render above additions. Card or kit art is present when `cardId`/`kitId` is set. Every dismissal path calls the seen marker exactly once. `pnpm verify` green.

### L76-06 — Turn How to play into a swipeable card carousel

**Cx / risk:** M / Medium · **Depends on:** L76-03, L76-04 · **Spec:** §7.1, §5.6, §5.7, §12.2, §13
**Parity (Appendix A):** `home-how-to-play-dialog`, `home-how-to-play-soft-gate`, `home-how-to-play-dismiss`, `global-help-storage`, `global-dialog-interaction-contract`
**Files:** `apps/client/src/screens/how-to-play-dialog.tsx`, `apps/client/src/screens/how-to-play-dialog.test.tsx`, `docs/agent/frontend.md`

Rewrite `screens/how-to-play-dialog.tsx` in place. Keep the same export and `onClose(reason)` contract, so the table '?' and arena callers need no edit. Show one card per `HOW_TO_PLAY_SECTIONS` entry, in order. The copy stays verbatim, including the L76-03 Kits row, with resource icons inline (ui/ icons). Designer screenshots render only when the PNG exists. Pages change by swipe, keyboard or buttons, and the position is announced. Skip and Got it keep their meaning. In a gated open, any dismissal (Skip, Got it, Esc, backdrop, swipe-down) marks seen and continues to the chosen path. In a manual open, only Skip and Got it mark seen (§7.1). It never sends an intent. Update the `frontend.md` How to play paragraph.

**Acceptance:** Rendered tests prove each of these. Nine cards render in section order. Skip and Got it report 'skip' / 'got-it', and Esc / backdrop report 'dismiss'. The L76-01 gate tests stay green. Paging never closes the sheet. Reduced motion turns off the slide. No screenshot `<img>` renders without a file. `pnpm verify` green.

### L76-07 — Rebuild the Feedback sheet with a Sent confirmation

**Cx / risk:** M / Medium · **Depends on:** Lot 72 · **Spec:** §7.7, §5.2, §10.4, §10.6, §11, §12.1
**Parity (Appendix A):** `global-feedback-dialog`, `feedback-dialog-dismiss`, `home-feedback-dialog`, `global-feedback-entry-points`, `global-text-input-no-ios-zoom`, `global-dialog-interaction-contract`
**Files:** `apps/client/src/feedback/feedback-dialog.tsx`, `apps/client/src/feedback/feedback-dialog.test.ts`, `apps/client/src/ui/primitives/`, `packages/shared/src/release-notes.ts`, `docs/agent/frontend.md`, `DESIGN.md`

Rewrite `feedback/feedback-dialog.tsx` in place as a V7 sheet (§7.7). Keep the same export, props and `onDismiss('skip' | 'cancel' | 'sent')`, so the Lobby, table '!', arena and End callers need no edit. Kind (Bug / Confusion / Idea) becomes a real radio group (Q71), and the About chips keep `aria-pressed`. The message (4000) and Contact (optional) (200, autocomplete email) fields are 16 px through a shared text-field primitive: L72's if it ships one, else one added to `ui/primitives/` with DESIGN.md. Kind-based placeholders and hints stay, with Skip in ask mode and Cancel in manual mode. While sending, Esc, backdrop, swipe and Skip/Cancel are locked. A success shows a **Sent** confirmation, and closing it reports 'sent' once (Q6/Q68/Q69). The payload, in-flight gate, requestId guard, the 'bug needs at least one topic' rule and the error copy do not change. Rewrite `feedback-dialog.test.ts` as behavior tests, update the `frontend.md` Feedback paragraph, and add a What's new item.

**Acceptance:** Tests with a mocked `submitFeedback` prove each of these. A double click sends one POST. Send is disabled for an empty message, and for a bug with no topic (with the hint shown). Ask mode shows Skip and 'Skip is fine.'. Dismiss attempts while sending do nothing. A success shows Sent, and closing it reports 'sent' exactly once. A failure shows the server message and keeps the form. The payload never includes the seed and keeps today's fields. The End ask-once helper tests stay green. `pnpm verify` green.

**Review:** "Sent" closes by itself after ~1.5 s; a 15 s client timeout re-enables dismiss with an error (amended §7.7).

### L76-08 — Restyle the Online and Tutorial paths

**Cx / risk:** S / Low · **Depends on:** L76-03, L76-04, L76-07 · **Spec:** §7.1, §5.2
**Parity (Appendix A):** `home-online-path`, `home-tutorial-path`, `home-nickname`, `home-forms-enter-submit`, `home-connection-status-and-errors`, `global-text-input-no-ios-zoom`, `global-room-connection-lifecycle`
**Files:** `apps/client/src/screens/home/`, `docs/agent/frontend.md`

Online path (§7.1): the nickname field sits outside both forms, then Create, then Join with a large code field. The code field uppercases as typed, has maxLength 6, autocomplete and spellcheck off, and placeholder 'ABCDEF'; Enter submits Join only when Join is enabled. Tutorial path: nickname only, then 'Start tutorial'. Every input uses the 16 px text-field primitive. The copy stays, with the L76-03 Create helper. Busy locks the inputs and submits, and failures stay in the status block so the player can retry in place. Update the `frontend.md` Home paragraph.

**Acceptance:** Rendered tests prove each of these. Create needs a nickname. Join needs a nickname and a 6-character code. Enter in the Online nickname field does nothing, and Enter in the code field submits Join. Tutorial start calls `onStartTutorial` once and sends no rules or kit. Inputs are disabled while busy. The nickname survives switching paths. `pnpm verify` green.

**Review:** Connection errors stay inline status blocks, restyled (amended §7.7).

### L76-11 — Restyle the Solo path

**Cx / risk:** M / Medium · **Depends on:** L76-08, L76-09, L76-10 · **Spec:** §7.1, §11
**Parity (Appendix A):** `home-solo-path`, `solo-menu-rules`, `solo-menu-rules-side-effects`, `home-solo-play-again-seed`, `home-nickname`, `home-forms-enter-submit`, `global-room-connection-lifecycle`
**Files:** `apps/client/src/screens/home/`, `docs/agent/frontend.md`

Solo path per §7.1. Nickname first. Opponents, 1 to 7, are added as avatars around a mini table, with an accessible count control (radio or stepper semantics, default 1, Q7). Difficulty is a Segmented control Easy / Normal / Hard (radio semantics, default Normal, `formatBotDifficulty`). Next come the Your kit card (Random by default, hidden under Random only), the rules strip (L76-09), and **Start solo game**. These stay unchanged: the launch sequence, `soloLaunchPending`, Random only forcing 'random', and the Play again seed (kit, count, shared difficulty, rules, and `includeTurnTime` from the seed). Update `frontend.md`.

**Acceptance:** Rendered tests prove each of these. Count and difficulty expose their checked state to assistive tech and change by keyboard. Start calls `onStartSolo` with the chosen count, difficulty and kit (forced to 'random' under Random only), plus `{ lobbyRules, includeTurnTime }`. A seed opens the solo path pre-filled and is applied once. Every control is disabled while busy. `solo-menu-seed.test.ts` stays green. A browser check at 360×740 keeps Start reachable. `pnpm verify` green.

### L76-17 — Add the invite link

**Cx / risk:** M / Low · **Depends on:** L76-08, L76-12 · **Spec:** §7.1, §7.2, §10.4, §13
**Parity (Appendix A):** `lobby-game-code`, `home-online-path`, `global-app-router`, `global-page-reload-recovery`
**Files:** `apps/client/src/App.tsx`, `apps/client/src/screens/lobby/`, `apps/client/src/screens/home/`, `packages/shared/src/release-notes.ts`, `docs/agent/frontend.md`

Lobby: add **Share** next to Copy (§7.2, Q28). When `navigator.share` exists, Share uses the Web Share API with the link `{origin}/?code=XXXXXX`; a user cancel is silent. Otherwise it copies that link and shows a result dialog (wording listed in the PR). Home: a `?code=` URL parameter pre-fills the Join code, uppercased and capped at 6 characters, client only (§7.1). The nickname is still required, nothing joins automatically, and admin paths ignore the parameter. Pure link and parse helpers carry the tests. Update `frontend.md` (Lobby and Home) and add a What's new item.

**Acceptance:** Tests prove each of these. The link helper builds the root URL with the code. The parse helper uppercases, caps at 6 characters and ignores a missing parameter. Share calls `navigator.share` with the link when it exists and falls back to the clipboard otherwise, and both failure paths still show the code. Loading with `?code=` puts the code in Join, and Join stays disabled until a nickname is typed. `/admin?code=` is unaffected. `pnpm verify` green.

**Review:** `?code=` opens Home on the Online path with Join pre-filled (soft gate first) and is stripped from the URL; Share falls back to copying the link with a "Link copied" result.

### L76-18 — Run the Lot 76 browser and design gate

**Cx / risk:** M / Low · **Depends on:** L76-01…L76-17 · **Spec:** §12.3, §12.4, §12.5, §4.6
**Parity (Appendix A):** `home-hub`, `lobby-player-list`, `global-text-input-no-ios-zoom`, `global-visual-viewport-fit`, `global-motion-reduced-motion`, `claim-seat-dismiss-stay`
**Files:** `docs/agent/frontend.md`, `docs/backlog_v7.md`, `.impeccable/config.json`

Post-lot gate (§12.3, §12.4, AGENTS.md §9). Run a two-browser session over the lot's surfaces at 360×740, 375×812, 390×844, 844×390 and 1440×900. Cover: the hub; How to play, gated and manual; What's new, auto and history; Feedback through to Sent; Online create and join, including a `?code=` link; Solo with rules and a kit; Tutorial start. Also cover the lobby with 2, 4 and 8 seats as host, guest and walk-in: rules sheet, toasts, kit picker, chat, claim reopen, Kick and reconnect. Check that every focusable field computes to at least 16 px, and check reduced motion. Fix the Impeccable detector findings and record a `critique` of Home and the lobby. Add a 'Lot 76 verified' heading with room codes in `frontend.md`, and update the V6 first-time gate steps that V7 changed. Confirm that every old Home and lobby file is gone and the L76 §12.1 rows are Done.

**Acceptance:** Gate notes and room codes are recorded. Every defect is fixed, re-verified, and committed under its task id. `screens/home.tsx`, `lobby.tsx`, `lobby-rules-panel.tsx`, `lobby-kit-picker-dialog.tsx` and the old What's new and claim dialogs no longer exist. The design gate passes or is noted as not run per §12.4. `pnpm verify` green. The lot PR into `dev` is ready for review (§4.6).

_Draft id L76-19._

---

## Appendix A — Interface contract, Part 1 (L76-01, 02, 03, 09, 10, 12, 13, 14, 15, 16)

Every Part 1 task builds against these names and shapes. A task may add private helpers, but it never renames or reshapes anything below. Part 2 (L76-04 … L76-08, L76-11, L76-17, L76-18) extends these modules; it never breaks them.

Sources: the code on `claude/v7-lot-76-a937ad` at `c6941bec`, `docs/technical_spec_v7.md` §7, the L72 `ui/` layer (`map-ui.md`), and the Lot 76 briefs. Paths are under `apps/client/src/` unless they say otherwise.

### A.1 Execution order and what each task touches

Order: **L76-01 → L76-02 → L76-03 → L76-09 → L76-10 → L76-12 → L76-13 → L76-14 → L76-15 → L76-16.** Each task starts from the previous task's commit. L75-11 waits on L76-02, L76-10 and L76-13 being merged into `dev`.

| Task | Creates | Moves / deletes | Edits outside its folder |
|---|---|---|---|
| L76-01 | `screens/home/*` (A.2), `screens/home/test-home.ts`, `screens/home/home-screen.test.tsx`, pure helper tests | deletes `screens/home.tsx`, `screens/home.admin-route.test.ts`, `screens/home.feedback-surfaces.test.ts`, `screens/home.tutorial-hints-independence.test.ts`, `screens/home.visual-viewport.test.ts` | `App.tsx` (one import line), `screens/whats-new-dialog.test.ts` (Home assertions only, A.7), docs |
| L76-02 | `screens/lobby/lobby-screen.tsx`, `screens/lobby/test-lobby.ts`, `screens/lobby/lobby-screen.test.tsx` | moves `screens/lobby-ready.ts`, `lobby-ready-mark.tsx`, `lobby-kit-picker.ts` and their tests into `screens/lobby/`; deletes `screens/lobby.tsx`, `lobby-kick.test.ts`, `lobby-kit-privacy.test.ts`, `lobby.feedback-surfaces.test.ts`, `lobby.visual-viewport.test.ts` | `App.tsx` (one import line), `screens/lobby-kit-picker-dialog.tsx` (import `KitDetails` from `ui/kit/kit-details`, `./lobby/lobby-kit-picker`), `screens/home/solo-path.tsx` (import path of `lobbyKitSelectionLabel`), docs |
| L76-03 | random-special versos in `ui/kit/kit-details.tsx` (A.6), `screens/home/home-copy.ts`, `screens/kit-pick-copy.ts`, `view-model/kit-inspect-traits.test.ts` | — | `screens/how-to-play-content.ts`, `screens/lobby/lobby-screen.tsx`, `screens/lobby-kit-picker-dialog.tsx` (`RandomKitDetails`), `screens/home/online-path.tsx`, `screens/home/solo-path.tsx`, `ui/ui-copy.ts`, `ui/kit/kit-details.test.tsx`, `DESIGN.md`, `view-model/kit-inspect-traits.ts`, **one assertion line** in `screens/table/kit-inspect-dialog.test.ts` (A.9 ruling 2), `packages/shared/src/release-notes.ts` + its pins, `docs/technical_spec_v6.md`, docs |
| L76-09 | `ui/rules/rules-editor.tsx`, `ui/rules/rules-editor-model.ts`, `ui/rules/rules.gallery-demos.tsx` (+ tests) | deletes `screens/lobby-rules-panel.tsx` | `ui/rules/rules-strip.tsx`, `rules-sheet.tsx`, `rules-summary.ts`, `rules.gallery.tsx`, `ui/ui-copy.ts`, `screens/lobby/lobby-screen.tsx`, `screens/home/solo-path.tsx`, `screens/home/home-screen.tsx`, `screens/home/solo-rules-state.ts`, release notes, `DESIGN.md`, docs |
| L76-10 | `screens/lobby/kit-picker-sheet.tsx`, `kit-tile-stats.ts`, `random-kit-details.tsx` (+ tests), the two Random-only lines in `screens/kit-pick-copy.ts`, `ui/icons` `action` and `attack` glyphs | deletes `screens/lobby-kit-picker-dialog.tsx` | `screens/lobby/lobby-screen.tsx`, `screens/home/solo-path.tsx`, `screens/home/home-screen.tsx`, `ui/icons/icon-names.ts`, `icon.tsx`, `icon-names.test.ts`, `DESIGN.md`, docs |
| L76-12 | the A.4 lobby files, `ui/icons` `check` icon | deletes `screens/lobby/lobby-ready-mark.tsx` and its source-text tests (A.7) | `ui/icons/icon-names.ts`, `icon.tsx`, `icon-names.test.ts`, `icon.test.tsx`, release notes, `DESIGN.md`, docs |
| L76-13 | `screens/lobby/lobby-chat-panel.tsx` (+ test) | — | `screens/lobby/lobby-screen.tsx`, docs |
| L76-14 | `screens/lobby/lobby-lock.ts`, `screens/reject-phase.ts`, `test/fake-room-connection.ts`, `App.lobby.test.tsx` (+ tests) | — | `App.tsx` (lobby branch props + the phase-change clear), `ui/chat/chat-log.tsx` (`sendLocked`), `ui/rules/*` (`disabled` already exists, A.5), the lobby components, `DESIGN.md`, docs |
| L76-15 | `screens/lobby/rules-change-notice.ts` (+ test), `screens/lobby/lobby-rules-toast.tsx` | — | `screens/lobby/lobby-screen.tsx`, docs |
| L76-16 | `screens/claim-seat-dialog.test.tsx`, `screens/claim-seat.test.ts` | rewrites `screens/claim-seat-dialog.tsx` in place; splits `screens/claim-seat-dialog.test.ts` (A.7) | `App.tsx` (lobby branch: `onReopenClaim`), `App.lobby.test.tsx`, `screens/lobby/lobby-kit-card.tsx`, docs |

Every task also edits `docs/backlog_v7.md` (its row and the Progress row), `docs/agent/frontend.md`, and, when it classifies a source-text test, `docs/backlog_v7_test_classification.md` (A.8).

### A.2 Home files (L76-01; behavior and look unchanged)

`screens/home.tsx` is split by component, keeping every class, string, attribute and handler as it is (map-home §1). All Home state stays in `HomeScreen` (map-home gotcha 1): no path component gets its own `useState`.

| File | Exports (L76-01) |
|---|---|
| `screens/home/home-screen.tsx` | `HomeScreen`, `HomeScreenProps` (verbatim from `home.tsx`, map-home §1.2). App imports `./screens/home/home-screen`. No `index.ts`. |
| `screens/home/home-hub.tsx` | `HomeHub` + `HomeHubProps` (was `HubView`/`HubViewProps`, same fields) |
| `screens/home/online-path.tsx` | `OnlinePath` + `OnlinePathProps` |
| `screens/home/solo-path.tsx` | `SoloPath` + `SoloPathProps` |
| `screens/home/tutorial-path.tsx` | `TutorialPath` + `TutorialPathProps` |
| `screens/home/path-header.tsx` | `PathHeader` + `PathHeaderProps` |
| `screens/home/home-status.tsx` | `HomeStatus` + `HomeStatusProps` (was `StatusBlock`) |
| `screens/home/nickname-field.tsx` | `NicknameField` + `NicknameFieldProps` |
| `screens/home/home-art.tsx` | `HomeArt`, `BetaCard` |
| `screens/home/home-classes.ts` | `HOME_INPUT_CLASS` (was `inputClassName`) |
| `screens/home/home-gate.ts` | pure, below |
| `screens/home/home-whats-new.ts` | pure, below |
| `screens/home/solo-rules-state.ts` | pure, below |
| `screens/home/test-home.ts` | test helper, A.3 |

```ts
// home-gate.ts — the How to play soft gate (map-home §1.7). Reads no storage.
export interface HowToPlayCloseOutcome {
  /** markHowToPlaySeen() before anything else. */
  readonly markSeen: boolean;
  /** The path to enter, or null to stay where we are. */
  readonly enter: HowToPlayContinueTarget | null;
  /** Run the What's new re-check (manual closes only). */
  readonly checkWhatsNew: boolean;
}
export function howToPlayCloseOutcome(
  pendingTarget: HowToPlayContinueTarget | null,
  reason: HowToPlayCloseReason,
): HowToPlayCloseOutcome;
// gated (pendingTarget !== null), any reason → { markSeen: true, enter: pendingTarget, checkWhatsNew: false }
// manual 'skip' | 'got-it' → { markSeen: true, enter: null, checkWhatsNew: true }; manual 'dismiss' → { markSeen: false, enter: null, checkWhatsNew: true }

// home-whats-new.ts — when Home opens What's new by itself (map-home §1.8). Reads no storage.
export type WhatsNewAutoTrigger = 'mount' | 'back-to-hub' | 'how-to-play-manual-close';
export function whatsNewAutoScope(trigger: WhatsNewAutoTrigger, latestUnseen: boolean): WhatsNewScope | null;
// latestUnseen ? 'current' : null for every trigger (the trigger names the call sites; the New control opens 'history' itself)

// solo-rules-state.ts — the solo menu's local rules (map-home §1.14, gotcha 1).
export interface SoloRulesState {
  readonly rules: LobbyRules;
  /** Send the clock at launch; false = the server default (Q3/Q31). */
  readonly includeTurnTime: boolean;
  /** The local kit pick; Random only hides it but keeps it. */
  readonly kitSelection: LobbyKitSelection;
}
export function initialSoloRulesState(seed: SoloMenuSeed | undefined): SoloRulesState;
// no seed → { rules: defaultLobbyRules(), includeTurnTime: false, kitSelection: 'random' }
// seed → { rules: seed.lobbyRules, includeTurnTime: isTurnTimeSeconds(seed.lobbyRules.turnTimeSeconds), kitSelection: seed.kitSelection }
export function applySoloRulesChange(state: SoloRulesState, next: LobbyRules, turnTimeChanged: boolean): SoloRulesState;
// includeTurnTime becomes true when turnTimeChanged && isTurnTimeSeconds(next.turnTimeSeconds); a kitSelection no longer in allowedKitIds(next) becomes 'random'
export function soloLaunchKitSelection(state: SoloRulesState): LobbyKitSelection; // 'random' under rules.randomOnly
// L76-09 adds:
export function applySoloRulesPayload(state: SoloRulesState, payload: SetLobbyRulesPayload): SoloRulesState;
// = applySoloRulesChange(state, { ...state.rules, ...payload, turnTimeSeconds: payload.turnTimeSeconds ?? state.rules.turnTimeSeconds }, payload.turnTimeSeconds !== undefined)
```

`HomeScreen` keeps `soloOpponents` and `soloDifficulty` as their own `useState`s and holds one `useState<SoloRulesState>(() => initialSoloRulesState(soloMenuSeed))`. The seed is read only in initialisers (gotcha 2).

### A.3 Test helpers

```ts
// screens/home/test-home.ts (L76-01)
export const HOME_INTENT_PROPS = ['onCreate', 'onJoin', 'onStartSolo', 'onStartTutorial'] as const;
export function makeHomeProps(overrides?: Partial<HomeScreenProps>): HomeScreenProps;
// nickname '', joinCode '', status 'idle', error null, soloLaunchPending false; every callback vi.fn(); no soloMenuSeed
export function expectNoHomeIntent(props: HomeScreenProps): void;
```

```ts
// screens/lobby/test-lobby.ts (L76-02; L76-14 adds onDismissError to the defaults)
export const LOBBY_HOST: LobbySeatView;   // { id: 'host', nickname: 'Ada', isBot: false, isReady: true }
export const LOBBY_GUEST: LobbySeatView;  // { id: 'guest', nickname: 'Bea', isBot: false, isReady: false }
export const LOBBY_BOT: LobbySeatView;    // { id: 'bot-1', nickname: 'Bot Cy', isBot: true, botDifficulty: 'normal', isReady: true }
export const LOBBY_INTENT_PROPS = [
  'onStart', 'onAddBot', 'onKickPlayer', 'onSetReady', 'onSetBotDifficulty',
  'onChooseKit', 'onSetLobbyRules', 'onSendChat',
] as const;
export function hostLobbyView(overrides?: LobbyViewOverrides): LobbyStateView;
// makeLobbyView({ you: 'host', hostPlayerId: 'host', gameCode: 'ABCDEF', players: [LOBBY_HOST, LOBBY_GUEST, LOBBY_BOT], ...overrides })
export function guestLobbyView(overrides?: LobbyViewOverrides): LobbyStateView;   // same seats, you: 'guest'
export function walkInLobbyView(overrides?: LobbyViewOverrides): LobbyStateView;  // same seats, you: 'watcher', isSpectator: true
export function makeLobbyProps(overrides?: Partial<LobbyScreenProps>): LobbyScreenProps;
// view hostLobbyView(), status 'connected', error null; every callback vi.fn()
export function expectNoLobbyIntent(props: LobbyScreenProps): void;
export function lobbySeat(playerId: string): HTMLElement;   // the element carrying data-lobby-seat={playerId}
```

`LobbyViewOverrides` and `makeLobbyView` come from `view-model/test-fixtures.ts`. App-level tests (L76-14, L76-16) use `test/fake-room-connection.ts` (L76-14):

```ts
export function fakeRoomConnection(view: StateView | null, extra?: Partial<UseRoomConnectionResult>): UseRoomConnectionResult;
// the same field set as App.arena.test.tsx's local connectionFor (map-home §5.3); App.arena.test.tsx is not edited (Lot 75 owns it)
```

### A.4 Lobby files

L76-02 moves the V2 lobby as it is into `screens/lobby/lobby-screen.tsx` and only adds `data-lobby-seat={player.id}` on each seat `<li>` (a test hook, no visible change). L76-12 then splits it into these files. Names, props and test hooks below are final from L76-12 on; L76-13 … L76-16 extend them.

| File | Owner | Exports |
|---|---|---|
| `lobby-screen.tsx` | L76-02, recomposed by L76-12 | `LobbyScreen`, `LobbyScreenProps` |
| `lobby-header.tsx` | L76-12 (L76-14 adds the alert dismiss) | `LobbyHeader`, `LobbyHeaderProps` |
| `lobby-seats.tsx` | L76-12 | `LobbySeats`, `LobbySeatsProps` (the seats, the per-bot difficulty, Kick, the host's Add bot row) |
| `lobby-seat-model.ts` | L76-12 | `lobbySeatRows`, `LobbySeatRow` |
| `kick-confirm-dialog.tsx` | L76-12 | `KickConfirmDialog`, `KickConfirmDialogProps` |
| `lobby-kit-card.tsx` | L76-12 (L76-16 adds Claim a seat) | `LobbyKitCard`, `LobbyKitCardProps` (Your kit card, the Random-only line, or the walk-in banner; owns the kit picker's `open` state) |
| `lobby-actions.tsx` | L76-12 | `LobbyActions`, `LobbyActionsProps` (Start, Ready / Cancel ready + hints, walk-in waiting copy, Leave, Feedback) |
| `lobby-copy.ts` | L76-12 (each later task adds its constants) | lobby strings shared by components and tests |
| `lobby-chat-panel.tsx` | L76-13 | `LobbyChatPanel`, `LobbyChatPanelProps` |
| `lobby-lock.ts` | L76-14 | `lobbyIntentsLocked(status: RoomConnectionStatus): boolean` (true only for `'reconnecting'`) |
| `rules-change-notice.ts` | L76-15 | `lobbyRulesNotice`, `LobbyRulesNotice` |
| `lobby-rules-toast.tsx` | L76-15 | `LobbyRulesToast` |
| `kit-picker-sheet.tsx`, `kit-tile-stats.ts`, `random-kit-details.tsx` | L76-10 | A.5 |
| `lobby-ready.ts`, `lobby-kit-picker.ts` (+ tests) | moved by L76-02, unchanged | as today |

```ts
// lobby-screen.tsx — final shape after L76-16
export interface LobbyScreenProps {
  view: LobbyStateView;
  status: RoomConnectionStatus;
  error: string | null;
  /** Clears the inline alert (App passes clearActionReject). L76-14. */
  onDismissError: () => void;
  onStart: () => void;
  onLeave: () => void;
  onAddBot: (difficulty: BotDifficulty) => void;
  onKickPlayer: (playerId: string) => void;
  onSetReady: (ready: boolean) => void;
  onSetBotDifficulty: (playerId: string, difficulty: BotDifficulty) => void;
  onChooseKit: (selection: LobbyKitSelection) => void;
  onSetLobbyRules: (payload: SetLobbyRulesPayload) => void;
  onSendChat: (body: string) => void;
  /** App's claim picker reopen; present only while a walk-in has claimable seats. L76-16. */
  onReopenClaim?: () => void;
}
// No onRemoveBot, ever (L57-09).

// lobby-seat-model.ts (L76-12) — one row per view.players entry, in that order
export interface LobbySeatRow {
  readonly id: string;
  readonly nickname: string;
  /** Index in view.players: the seat hue (v7SeatColor) and the Avatar seatIndex (Q25). */
  readonly seatIndex: number;
  readonly isYou: boolean;
  readonly isHost: boolean;
  readonly isReady: boolean;
  /** lobbyReadyLabel(isReady): 'Ready' | 'Not ready'. */
  readonly readyLabel: string;
  readonly botDifficulty: BotDifficulty | null;
  /** The viewer is the host and this is another seat (bot or human). */
  readonly canKick: boolean;
  /** canKick && botDifficulty !== null. */
  readonly canSetDifficulty: boolean;
}
export function lobbySeatRows(view: LobbyStateView): readonly LobbySeatRow[];

// kick-confirm-dialog.tsx (L76-12) — V7 Dialog, title 'Kick this player?', body
// `${nickname} will leave this lobby. They can join again with the code.`, actions Cancel (quiet) and Kick (danger).
// onClose (Esc, backdrop, swipe) = Cancel. Kick is latched per open (map-ui §1.21). A target that leaves view.players closes it.
export interface KickConfirmDialogProps {
  readonly target: { readonly id: string; readonly nickname: string } | null;
  readonly onCancel: () => void;
  readonly onConfirm: (playerId: string) => void;
}
```

Sub-component props (`LobbyHeaderProps`, `LobbySeatsProps`, `LobbyKitCardProps`, `LobbyActionsProps`, `LobbyChatPanelProps`) are fixed by L76-12/L76-13's task text. `LobbySeats`, `LobbyKitCard` and `LobbyActions` take a **`locked: boolean`** prop from L76-12 (always `false` until L76-14 wires `lobbyIntentsLocked(status)`); `LobbyChatPanel` gains it in L76-14 (for `ChatLog sendLocked`); `LobbyHeader` takes none (nothing in it locks). L76-14 wires the lock in `lobby-screen.tsx`, adds the alert dismiss in `lobby-header.tsx` and `sendLocked` in `lobby-chat-panel.tsx`, and re-checks the lock table in the other components.

**Test hooks and accessible names that every lobby test may rely on (L76-02 → L76-16):**
- Root: `<main>` (role `main`) is the scroll container: class `overflow-y-auto overscroll-contain`, no `overflow-hidden`, no `100dvh`.
- Each seat: an element with `data-lobby-seat={player.id}`, containing the visible nickname, `' (you)'`, `'Host'`, and the ready mark named `'Ready'` or `'Not ready'` (an element with that accessible name, before the nickname in DOM order).
- Host controls inside a seat: a button named **`Kick`**; a bot's difficulty control named `'{nickname} difficulty'` from L76-12 (L76-02 keeps the V2 buttons `Easy` / `Normal` / `Hard`).
- The Kick confirm: `dialog` named `'Kick this player?'` with buttons `Cancel` and `Kick`.
- Action row buttons: `Start game`, `Ready`, `Cancel ready`, `Leave`, `Feedback`; Add bot button `Add bot`.
- Your kit: the visible kit label (`lobbyKitSelectionLabel`) and a button `Choose kit`.
- Copy: button `Copy`; result dialog `'Code copied'` / `'Copy failed'`.
- Sheets and dialogs Lot 76 opens carry `dataAttributes={{ 'data-lobby-sheet': <name> }}` (`kit-picker`, `kit`, `kick-confirm`, `copy-result`) or `data-home-sheet` on Home (Part 2).

### A.5 Rules editor (L76-09) and kit picker (L76-10)

```ts
// ui/rules/rules-editor-model.ts — pure; every payload is the exact SET_LOBBY_RULES body
export interface RulesEditorBinding {
  readonly onChange: (payload: SetLobbyRulesPayload) => void;
  /** Busy (solo launch, Q8) or reconnecting (L76-14): every editor control is disabled. */
  readonly disabled?: boolean;
  /** Solo: the clock reads SERVER_DEFAULT_LABEL until the slider is released once (Q3/Q31). */
  readonly serverDefaultTime?: boolean;
}
export function sliderSeconds(rules: LobbyRules): number;              // rules.turnTimeSeconds when isTurnTimeSeconds, else MAX_TURN_TIME_SECONDS
export function turnTimePayload(rules: LobbyRules, seconds: number): SetLobbyRulesPayload | null;   // null unless isTurnTimeSeconds(seconds); the only payload with turnTimeSeconds
export function kitTogglePayload(rules: LobbyRules, kitId: KitId): SetLobbyRulesPayload | null;    // null when toggleExcludedKit returns null
export function allKitsPayload(rules: LobbyRules): SetLobbyRulesPayload;
export function noKitsPayload(rules: LobbyRules): SetLobbyRulesPayload;     // keeps KIT_IDS[0]
export function randomOnlyPayload(rules: LobbyRules, randomOnly: boolean): SetLobbyRulesPayload;
export function isLastAllowedKit(rules: LobbyRules, kitId: KitId): boolean;
// Kit, Random, All and None payloads are { excludedKitIds, randomOnly } and never carry turnTimeSeconds
// (sending it overrides the server default for good, map-lobby gotcha 15).

// ui/rules/rules-strip.tsx / rules-sheet.tsx — additive props
export interface RulesStripProps { rules: LobbyRules; className?: string; editor?: RulesEditorBinding; }
export interface RulesSheetProps { open: boolean; rules: LobbyRules; onClose: () => void; dataAttributes?: …; editor?: RulesEditorBinding; }
// No editor → today's read-only sheet (guests, walk-ins, the arena). With editor → the same sheet, title 'Table rules',
// body = <RulesEditor rules editor />, live apply, Close only. The strip's clock reads SERVER_DEFAULT_LABEL when editor?.serverDefaultTime.

// ui/rules/rules-editor.tsx
export interface RulesEditorProps { rules: LobbyRules; editor: RulesEditorBinding; }
export function RulesEditor(props: RulesEditorProps): ReactElement;
// Slider label 'Human turn' (min 5, max 180, step 1, value sliderSeconds(rules), onCommit → turnTimePayload);
// buttons All / None; Random as a Toggle; 16 kit toggles named by the kit name (aria-pressed = allowed);
// the last allowed kit is disabled with LAST_ALLOWED_KIT_REASON visible.

// ui/ui-copy.ts additions (L76-09)
export const SERVER_DEFAULT_LABEL = 'Server default';
export const LAST_ALLOWED_KIT_REASON = 'At least one kit must stay allowed.';
```

Wiring: the lobby passes `editor={{ onChange: onSetLobbyRules }}` (plus `disabled: locked`, bound by L76-12 and wired to the status by L76-14) only when the viewer is the host. The solo path passes `editor={{ onChange: (p) => setSolo((s) => applySoloRulesPayload(s, p)), disabled: busy, serverDefaultTime: !solo.includeTurnTime }}`.

```ts
// screens/lobby/kit-picker-sheet.tsx (L76-10) — the lobby and the solo path share it
export interface KitPickerSheetProps {
  readonly open: boolean;
  readonly current: LobbyKitSelection;
  readonly rules: LobbyRules;                 // excluded kits and Random only
  /** The only commit: the lobby passes onChooseKit, the solo path a local setter. */
  readonly onSelect: (selection: LobbyKitSelection) => void;
  readonly onClose: () => void;
  /** Busy or reconnecting: Select this kit is disabled (the sheets still open and close). */
  readonly disabled?: boolean;
}
// Grid sheet: title 'Choose kit', Random tile first, then KIT_IDS in order (LOBBY_KIT_PICKER_SELECTIONS), every kit a KitTile
// (excluded kits greyed + EXCLUDED_LABEL, native-disabled head per the KitTile contract: they cannot open or be selected).
// A tile press opens the kit sheet above (title = kit name or 'Random kit'; KitDetails or RandomKitDetails) with Back and
// 'Select this kit' (disabled at once when that kit becomes excluded). Esc steps back one level. Select calls onSelect then onClose.
// rules.randomOnly → renders nothing (open is ignored), so turning Random only on closes and hides it.

// screens/lobby/kit-tile-stats.ts
export function kitTileStats(kitId: KitId): readonly KitTileStat[];   // from getKit(kitId): lives, points, upgrade points, draw, action, attack

// screens/lobby/random-kit-details.tsx
export function RandomKitDetails(): ReactElement;   // L76-03 copy, moved out of lobby-kit-picker-dialog.tsx
```

### A.6 Copy and shared-file rules

- **L76-03 copy** lands in the files that exist at that point: `how-to-play-content.ts` (Kits body), `screens/lobby/lobby-screen.tsx` (Your kit line), `screens/lobby-kit-picker-dialog.tsx` (`RandomKitDetails`, which L76-10 moves verbatim), `screens/home/online-path.tsx` (Create helper), `view-model/kit-inspect-traits.ts` (Prophet). L76-03 also fixes the two pre-Lot-69 picker lines ('Opponents cannot see your kit. Random is the default.' and the solo 'Hidden from opponents. Random is the default.') with the same Lot 69 wording; they are listed as designer review items.
- **Random starting specials (L76-03):** `ui/kit/kit-details.tsx` renders `getKit(kitId).randomStartingSpecialCount ?? 0` hidden special versos (`Card face="hidden" family="special"`, or the family the Card supports for a special verso) after the fixed specials, each with the caption `RANDOM_SPECIAL_CAPTION` (`ui/ui-copy.ts`, default `'Random special'`, designer question). Prophet shows two, Gambler Roulette plus two. `DESIGN.md` › Kit is updated.
- **What's new (§10.4).** Each item is appended to `lot-72-v7.items` (never a new entry). Part 1 adds exactly two items: the L76-03 copy fix (After `Fixed some bugs.`) and one **Lobby** item that L76-09 appends and L76-12 rewrites in place (one item per screen area). Every append updates, in the same commit: `packages/shared/src/release-notes.test.ts` (the `toEqual` on the items array), `apps/client/src/screens/whats-new-dialog.test.ts` (`latestReleaseNote().items` length), the item list in `docs/agent/frontend.md`, and the stale counts in row 234 of `docs/backlog_v7_test_classification.md`.
- **Strings:** a new string lives in one `.ts` module (`ui/ui-copy.ts` for `ui/`, `screens/lobby/lobby-copy.ts` for the lobby, `screens/home/home-copy.ts` for Home, `screens/kit-pick-copy.ts` for the kit privacy lines shared by Home, the lobby and the picker) and tests import the constant.

### A.7 Source-text tests Part 1 retires or rewrites

| File | Task | What happens |
|---|---|---|
| `screens/home.admin-route.test.ts`, `home.feedback-surfaces.test.ts`, `home.tutorial-hints-independence.test.ts`, `home.visual-viewport.test.ts` | L76-01 | deleted; each assertion becomes a rendered test in `screens/home/home-screen.test.tsx` |
| `screens/whats-new-dialog.test.ts` | L76-01 | the `home.tsx` reads are removed; their product assertions become rendered Home tests; the style-only assertions (`variant="green"` near `data-whats-new-button`, `bg-cta-red`, no `bg-cta-green`, `absolute` near the button) are re-pointed at `screens/home/home-screen.tsx` and stay until L76-04; the dialog and catalog assertions stay (L76-05 owns the dialog) |
| `screens/lobby-kick.test.ts`, `lobby-kit-privacy.test.ts`, `lobby.feedback-surfaces.test.ts`, `lobby.visual-viewport.test.ts` | L76-02 | deleted; rendered tests in `screens/lobby/lobby-screen.test.tsx` |
| `screens/lobby-ready.test.ts` | L76-02 | moves to `screens/lobby/lobby-ready.test.ts` with its three pure `it`s unchanged; the wiring `describe`'s product assertions become rendered tests; its style-only assertions (the `variant={youReady ? 'orange' : 'green'}` expression, `LobbyReadyCheckIcon`) move to a new split file `screens/lobby/lobby-screen.ready-chrome.test.ts` reading `lobby-screen.tsx` |
| `screens/lobby-ready-mark.test.ts` | L76-02 | moves to `screens/lobby/lobby-ready-mark.test.ts`, re-pointed at the new paths (style-only, map-lobby §8 L223) |
| `screens/lobby/lobby-screen.ready-chrome.test.ts`, `screens/lobby/lobby-ready-mark.test.ts` | L76-12 | deleted with `lobby-ready-mark.tsx`, with one `decisions.md` entry citing §7.2 / §5.1 / §5.3 / §5.6 that supersedes L57-16 |
| `screens/claim-seat-dialog.test.ts` | L76-16 | the pure `claimStayLabel` / `shouldShowClaimPicker` / `walkInSeesPrivateHands` suites move unchanged to `screens/claim-seat.test.ts`; the dialog source-text `it`s become `screens/claim-seat-dialog.test.tsx`; the App wiring `it` becomes `App.lobby.test.tsx` cases; the old file is deleted |
| `screens/table/kit-inspect-dialog.test.ts` | L76-03 | **only** the `/Invisibility excluded/i` assertion changes, to the new Prophet wording (A.9 ruling 2) |

### A.8 Docs conventions

- `docs/agent/frontend.md`: L76-01 adds `## Home and lobby (V7 · Lot 76)` immediately before `## Design system (V2 · Lots 10+)`, with a one-line intro. Each task appends bullets that start with the file and the task id, for example `` - `screens/lobby/kit-picker-sheet.tsx` (L76-10, spec v7 §7.3): … ``. A task that supersedes a line elsewhere (the Screens table, the V2 **Home** / **Lobby** paragraphs, the `ui/rules` "L76 adds the host editor here" line, the Chat section's walk-in note) fixes that line in the same commit.
- `docs/backlog_v7_test_classification.md`: a classified row gets, at the end of its last cell, ` **Done (L76-NN):** replaced by \`<test file>\` › '<it title>'.` or ` **Done (L76-NN):** retired, decisions.md YYYY-MM-DD "<entry title>".` A row a task only re-points or half-closes gets ` **L76-NN:** <what changed, what remains and who owns it>.` Never delete a row.
- `docs/agent/decisions.md`: new entries appended at the end, `## YYYY-MM-DD · [P] <title> (L76-NN)`, ending with `---`; the date is the commit day.

### A.9 Rulings that bind every Part 1 task (controller, 2026-11-03)

1. **No browser work in a task.** The L76-02/L76-12 browser checks named in Acceptance lines (2, 4 and 8 seats at 360×740 and 1440×900) are run by the controller with the built-in browser after the task review, on ports other than 2567 / 5173, and recorded at L76-18. A task's Acceptance line counts as met for its tests and code.
2. **`screens/table/kit-inspect-dialog.test.ts`:** L76-03 edits only its Prophet assertion line (classification row 49 allows it). L76-03 also adds the same Prophet assertion to a new `view-model/kit-inspect-traits.test.ts`, so the coverage survives when Lot 75 deletes the table test.
3. **Kit tiles:** the picker uses `KitTile` as it is (excluded = native-disabled head, no info button). An excluded kit cannot be opened or selected; its visible `Excluded` word is the reason (Q23). This is the one disabled pattern for the picker (L76-10 watch point), recorded in `decisions.md` by L76-10.
4. **Toasts:** one `Toast` per screen. The lobby's only toast is the L76-15 rules notice (`tone="info"`, `timeoutMs` 6000, dismiss label `OK`). Lobby errors stay an inline `role="alert"` block (§7.7).
5. **Confirm latches:** Kick, Sit here and any other one-shot confirm use the per-open epoch latch of `screens/arena/top-bar.tsx` (map-ui §1.21), re-implemented locally (never imported from `screens/arena/`).
6. **Reconnect lock (L76-14):** while `status === 'reconnecting'` these are disabled: Start, Ready / Cancel ready, Add bot and its difficulty, a bot's difficulty, Kick (an open Kick confirm closes), Select this kit, every rules editor control, chat Send and Enter. Leave, Copy, Feedback, opening the rules sheet, Choose kit (it only opens the picker) and Claim a seat stay live.
7. **Phase-change reject clear (L76-14):** App calls `clearActionReject()` when the view phase changes between two non-null phases (`lobby → playing`, `playing → finished`, `finished → lobby`, …). A change to or from `null` (Home) never clears: the "You were kicked." and solo-launch failure messages must still show on Home.
8. **`ChatLog` lock (L76-14):** `ui/chat/chat-log.tsx` gains `sendLocked?: boolean` (default false): Send stays visible and focusable (`focusableWhenDisabled`), and neither Send nor Enter calls `onSend`; the draft is kept. The arena passes nothing and is unchanged.
9. **Lobby Claim a seat (L76-16):** shown only to a walk-in while claimable seats exist (§7.2, spec default; Appendix B asks about seated guests). App passes `onReopenClaim` in the lobby branch under the same condition as the arena (`walkInSpectator && claimableSeats.length > 0`).
10. **Guest toasts (L76-15):** seated non-host guests only; the host and walk-ins get none (§7.4 says "Guests"; Appendix B asks about walk-ins).

---

## Appendix B — Designer questions and new strings (Part 1)

Defaults are implemented unless the designer answers otherwise. Each entry names its task.

### Domain A (L76-01, L76-03)

#### Designer questions (with defaults)

1. **How to play Kits paragraph:** the Step 3 text of L76-03 is the default. The host-exclusion and Random-only sentence reads "In the lobby you may pick any kit the host has not excluded, or keep Random; if the host deals kits at random, nobody picks."
2. **Lobby Your kit line:** the default is one sentence ("Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated."). The alternative adds "A basic Spy shows only your resources."
3. **Pre-Lot-69 picker lead and solo kit line:** the default changes them to the Lot 69 wording plus "Random is the default." The alternative keeps them verbatim.
4. **Random kit preview:** the default is "The server assigns one of the allowed kits at random when the game starts." / "Opponents see which kit you received only with an upgraded Spy or Spy Thief, or once you are eliminated."
5. **Online Create helper:** the default is "Host gets a code to share. Start from the lobby once every guest is Ready."
6. **Random special caption:** the default is "Random special". The random versos sit after the fixed specials (Gambler: Roulette, then two).
7. **What's new Before line:** the default is "Some help text about kits, Spy and starting an online game was out of date." (After: "Fixed some bugs.").

#### New or changed strings

- L76-01: none.
- L76-03: the How to play Kits paragraph; the lobby Your kit line; the kit picker lead; the solo kit line; both `RandomKitDetails` lines; the Online Create helper; Prophet's ability; "Random special" (new); the What's new item. Before/after for each is in L76-03 › Decisions.

### Domain B (L76-02, L76-12, L76-13)

#### Designer questions (with defaults)
- **Lobby action bar:** sticky at the bottom of `main` on every size. Default: sticky. Alternative: in flow at the end, as in V2.
- **Seat Kick button:** quiet (the confirm's Kick is danger). Default: quiet.
- **Ready mark:** the new `check` icon in `--cta`; Not ready is the existing `close` cross. Default as written.
- **Start's grey reason and Add bot's full reason:** shown, in the existing server reject words ('Need at least 2 players to start.', 'Every connected guest must be ready before start.', 'Room is full (8 seats).'). Default: shown.
- **Seat nicknames:** wrap rather than truncate. Default: wrap.
- **Lobby chat panel:** starts open on every viewport, with the toggle everywhere. Default: open. Alternative: collapsed on phones, with an unread mark.
- **What's new Lobby item wording** (rewritten by L76-12). Default:
  - before: 'The lobby was a plain list, and only the host could open the table rules.'
  - after: 'The lobby shows each seat in its player color, and everyone can open the table rules.'

#### New or changed strings
- **L76-02:** none. The lobby chat now sends the trimmed body; this is a behavior change with no new string.
- **L76-12:**
  - New accessible names: 'New bot difficulty' (the Add bot difficulty radiogroup) and '{nickname} difficulty' (each bot's radiogroup, named in A.4).
  - Existing strings in a new place: 'Need at least 2 players to start.' and 'Every connected guest must be ready before start.' under a grey Start; 'Room is full (8 seats).' under a disabled Add bot.
  - Changed: the What's new Lobby item, see above.
  - Removed: the visible 'Add bot' section heading. The button keeps the words.
- **L76-13:** 'Spectators only see this', the walk-in chat input label and placeholder. It is in spec §10.6; this is its first shipped use.

### Domain C (L76-09, L76-10)

#### Designer questions (with defaults)
- **L76-09:**
  - What's new Lobby item. Default: Before 'In the lobby, only the host could open the table rules.', After 'Everyone can open the table rules, and the host edits them there.'
  - Q8 reading. Default: the strip still opens during a solo launch, and every editor control is disabled.
  - Solo readout. Default: shows the live seconds while dragging and "Server default" at the untouched value until a release.
- **L76-10:**
  - Action/attack stat icons: two new glyphs `action` and `attack` (ruling C-1); the designer reviews the drawings.
  - Gambler Draw. **Answered 2026-11-03: '5–100'** (implemented in L76-10).
  - Random-only lines. Default: lobby 'The host is dealing kits at random.' (existing), solo 'Kits will be dealt at random.' (new).
  - The Random tile carries no stats. Alternative: the allowed-kit count, which would need a new string.

#### New or changed strings
- `SERVER_DEFAULT_LABEL` 'Server default' (`ui/ui-copy.ts`, §10.6, new).
- `LAST_ALLOWED_KIT_REASON` 'At least one kit must stay allowed.' (`ui/ui-copy.ts`; existing `set-lobby-rules-no-kit` copy, now visible).
- The slider's accessible name 'Human turn seconds' → 'Human turn' (its visible label).
- What's new `lot-72-v7` Lobby item: Before 'In the lobby, only the host could open the table rules.', After 'Everyone can open the table rules, and the host edits them there.' (new; L76-12 rewrites it).
- `RANDOM_ONLY_LOBBY_LINE` 'The host is dealing kits at random.' (`screens/kit-pick-copy.ts`; existing reject words).
- `RANDOM_ONLY_SOLO_LINE` 'Kits will be dealt at random.' (new).
- Select this kit's disabled reason 'The host has excluded that kit. Pick one that is still allowed.' (existing reject copy, newly shown).
- Spoken stat labels 'Lives', 'Points', 'Upgrade points', 'Draw', 'Action', 'Attack' (existing words).
- Gallery demo titles (DEV-only).

### Domain D (L76-14, L76-15, L76-16)

#### Designer questions (with defaults)

1. **Combined rules toast** (L76-15): one toast titled "Rules changed" with the body "Your pick was reset to Random." when both apply. *Default: as described.*
2. **Random-only toggle** (L76-15): it shows "Rules changed" (no reset line). **Answered 2026-11-03: as the default.**
3. **Walk-ins and rule toasts** (ruling 10, Appendix B): walk-ins see the strip but get no toast. *Default: no toast.*
4. **Claim a seat for a seated guest** who pressed Keep this seat (ruling 9). **Answered 2026-11-03: walk-ins only.**
5. **Kick confirm on a drop** (L76-14): it closes, versus staying open with Kick disabled. *Default: it closes.*
6. **Lobby chat while reconnecting** is locked (ruling 6), unlike the arena's chat (L74-25). *Default: locked; the draft is kept.*
7. **The alert dismiss** is a `close` icon named "OK" (the toast control), not a text button. *Default: the icon.*

#### New or changed strings

- New (§10.6): "Rules changed" (`RULES_CHANGED_TITLE`, L76-15); "Your pick was reset to Random." (`PICK_RESET_BODY`, L76-15; the spec writes it without the period).
- New on the lobby surface, already shipped in the arena: "Claim a seat" (`CLAIM_SEAT_LABEL`, L76-16).
- Existing copy reused: "OK" (`LOBBY_DISMISS_LABEL`, the alert dismiss and the rules toast dismiss); "Reconnecting…" (`STATUS_LABELS`).
- Claim sheet strings unchanged and verbatim: "Sit as a disconnected player?", "Nicknames are not unique. Pick the seat by color, or keep watching.", "Sit here", "Keep this seat", "Stay spectating", "Host".

---

## Appendix C — Notes

### C.1 Consistency rulings (controller, 2026-11-03)

#### From domain A (L76-01, L76-03)

- A-1 (contract issue 1): the header's "never imports design/**" applies to NEW Lot 76 files; a moved V2 file keeps its `design/` imports until its restyle task (L76-04/08/11 for Home, L76-12 for the lobby). Header edited.
- A-2 (issue 5): `screens/home/home-copy.ts` and the shared `screens/kit-pick-copy.ts` (kit privacy strings used by Home, the lobby and the picker) are accepted; header import rule lists `kit-pick-copy`. A.6 "file's own constant" → "a sibling `*-copy.ts`".
- A-3 (issue 3): only classification row 234 carries counts; A.6 corrected to "row 234".
- A-4 (issue 9): L76-02 edits only `solo-path.tsx` for the `lobbyKitSelectionLabel` path.
- A-5 (issue 6): Prophet is fixed in L76-03 (Review line wins over the Acceptance's "except Prophet").
- A-6 (issue 7): A.8 gains a partial-row note format: ` **L76-NN:** <what moved / what remains, owner>.`

#### From domain C (L76-09, L76-10)

- C-1 (issue 1, stat icons): `duplication-active` for action/attack counts is rejected (it means a live Duplication, a false cue). L76-10 adds two icons to `ui/icons` (`action`, `attack`: card-verso glyphs in the arcade style, hex paints, ink outline), appended to `ICON_NAMES`, with `icon.tsx` glyphs, `icon-names.test.ts`, `icon.test.tsx` and DESIGN.md › Icons in the same commit; `kitTileStats` uses them. L76-12 then appends `check` after them. Designer reviews the glyphs at the gate. Plan C edited accordingly (controller edit).
- C-2 (file lists): accepted — L76-09 edits `ui/rules/rules-summary.ts` (+ test) and creates `ui/rules/rules.gallery-demos.tsx`; L76-10 creates `screens/lobby/kit-picker-copy.ts` (L76-12's `lobby-copy.ts` does not re-export it; importers use `kit-picker-copy` directly). A.1 updated.
- C-3, C-4, C-6: accepted as written (Random only → both sheets `open={false}`, the owner clears its flag while rendering; slider readout at the untouched value reads Server default; the shared picker uses `data-lobby-sheet` on Home too).
- C-5: matches A (`solo` / `setSolo`; `SoloPathProps` loses `onSoloRulesChange` and gains `rulesEditor: RulesEditorBinding` in L76-09).

#### From domain D (L76-14, L76-15, L76-16)

- D-1 (issue 1): ruling 6 corrected — "Choose kit" (the opener) stays live; the choose-kit intent is locked through `KitPickerSheet disabled` (Select this kit). Contract A.9 ruling 6 edited.
- D-2 (issue 2): accepted — on `locked` turning true the Kick confirm closes (the owner of the target clears it while rendering); no new prop on `KickConfirmDialogProps`.
- D-3 (issue 3): A.4's "L76-14 changes only `lobby-screen.tsx` and App" is wrong; L76-14 edits `lobby-header.tsx`, `lobby-chat-panel.tsx`, `lobby-copy.ts`, `test-lobby.ts` and re-checks the lock in the sub-components. A.4 sentence edited.
- D-4 (issue 4): `LobbyHeader` takes no `locked` (nothing in it locks). A.4 edited; plan B/D aligned in the merge pass.
- D-5 (issue 5): default = a Random-only toggle shows "Rules changed" without the reset body (the planner's reading). The backlog clause "No notice fires … on a Random-only toggle that keeps the pick" is read as "no reset notice". Flagged to the developer as a designer question with this default (Appendix B); the reviewer checks the reading recorded in L76-15 Decisions.
- D-6 (issue 6): accepted — App keeps mounting `claimDialog` only while shown (shared with the playing/finished branches); no exit fade for the claim sheet. Noted for L81.
- D-7 (issue 7): Conventions gain "scope `alert` / `status` role queries to `main` (or a container); the Toast keeps two empty live regions in `document.body`". Applies to every lobby test from L76-02 on.

#### Cross-domain (after all four parts)

- X-1: one shared kit-copy module. L76-03 creates `screens/kit-pick-copy.ts` (`KIT_PRIVACY_COPY`, `KIT_PICKER_LEAD`, `RANDOM_KIT_ASSIGN_COPY`, `RANDOM_KIT_PRIVACY_COPY`); L76-10 appends `RANDOM_ONLY_LOBBY_LINE` and `RANDOM_ONLY_SOLO_LINE` there (no `screens/lobby/kit-picker-copy.ts`); L76-12's `LobbyKitCard` imports both lines from it (no `YOUR_KIT_HINT` / `RANDOM_ONLY_LINE` copies in `lobby-copy.ts`). Plans B and C edited; C-2's kit-picker-copy part superseded.
- X-2: L76-03's `screens/lobby-kit-picker-dialog.test.tsx` (2 tests) is deleted by L76-10 with the dialog; its grid-lead test becomes a `kit-picker-sheet.test.tsx` case and its Random preview test a `random-kit-details` / sheet case, rendering the `kit-pick-copy` constants. Plan C edited.
- X-3: the `locked` prop: L76-12 implements it in `LobbySeats`, `LobbyKitCard`, `LobbyActions` and binds `disabled: locked` into the host editor, with `const locked = false` in `lobby-screen.tsx`; `LobbyHeader` has none; `LobbyChatPanel` gains it in L76-14. Plan D edited to match plan B.
- X-4: What's new pins: L76-03 appends item 7, L76-09 appends the Lobby item 8, L76-12 rewrites item 8 in place (and its `toEqual` in `release-notes.test.ts`). Plan B edited.
- X-5: lobby tests scope `alert` queries to `main` from L76-12 on (B's header test edited); Home tests are unaffected (Home mounts no Toast).

### C.2 Planner domain reports (contract issues and cross-task notes, as written; C.1 resolves them)

#### Domain A

##### Contract issues

1. **"A Lot 76 file never imports `design/**`" (plan header) versus L76-01, a pure move with no visual change.** The Home files must keep `design/components/button` and `design/components/kit-portrait` (and keep mounting the V2 dialogs) until L76-04, L76-08 and L76-11 restyle them. L76-02 (the V2 lobby moved as it is) is in the same position. I planned the move against Appendix A.2 ("keeping every class") and read the import rule as the end state of each screen. L75-11's orphan sweep must treat these imports as live.
2. **`whatsNewAutoScope(trigger, latestUnseen)` ignores `trigger` by contract.** `noUnusedParameters` rejects an unused named parameter, so L76-01 uses an exhaustive `switch (trigger)` whose cases all return the same answer. Name and shape are unchanged.
3. **Appendix A.6 names classification "lines 232, 234" as the stale "1 item" rows.** Only row 234 holds counts, and its "lot-72 has 2 items" is stale too (it has 3). L76-03 fixes 234 and leaves 232, which holds no count.
4. **Appendix A.1's L76-03 row omits files that A.6 requires:** `screens/home/solo-path.tsx` (the solo line), `ui/ui-copy.ts` (`RANDOM_SPECIAL_CAPTION`), `ui/kit/kit-details.test.tsx` and `DESIGN.md`. They are planned per A.6.
5. **Appendix A.6 says "the file's own constant for Home",** but a `.tsx` cannot export a constant (react-refresh), so a test could not import it. L76-03 adds `screens/home/home-copy.ts`. It also adds `screens/kit-pick-copy.ts`, a shared screen module that the plan header's import rule does not list, for the string the lobby, Home and the picker share.
6. **The backlog L76-03 Acceptance says "except Prophet",** but its Review line folds Prophet into L76-03. The plan treats Prophet as fixed, so its grep includes "Invisibility excluded".
7. **Appendix A.8 has no format for a part-done or re-pointed classification row.** L76-01 writes ` **L76-01:** …` notes on the What's new [source] row (the dialog half stays for L76-05) and the [styling] row (re-pointed, retired by L76-04).
8. **`test-home.ts` gains `HOME_PATHS`, `HOME_PATH_LABEL`, `HomeDialogClose`, `seedHomeStorage`, `enterHomePath` and `closeHomeDialog`** beyond Appendix A.3 (additive). `makeHomeProps` also defaults `onSoloMenuSeedApplied` to `vi.fn()` ("every callback vi.fn()").
9. **A.1's L76-02 row edits "`home-screen.tsx` (import path of `lobbyKitSelectionLabel`)".** After L76-01 only `solo-path.tsx` imports `../lobby-kit-picker`; `home-screen.tsx` imports `../lobby-kit-picker-dialog`, which L76-02 does not move. This is harmless, but L76-02 has nothing to edit in `home-screen.tsx` for that path.

##### Cross-task notes (anything another domain's task must know)

- **L76-02 (B):**
  - Only `screens/home/solo-path.tsx` imports `../lobby-kit-picker` (`lobbyKitSelectionLabel`). `home-screen.tsx` imports `LobbyKitPickerDialog` from `../lobby-kit-picker-dialog`, and `solo-path.tsx` imports `LobbyRulesPanel` from `../lobby-rules-panel`.
  - `lobby-screen.test.tsx` must not pin the old Your kit sentence "Hidden from opponents until Spy or death.", or L76-03 must edit that assertion. L76-03 appends one test there that uses `makeLobbyProps` + `guestLobbyView()` and expects the Your kit `<p>` text to be exactly `KIT_PRIVACY_COPY`.
- **L76-09 (C):** `HomeScreen` holds `const [solo, setSolo] = useState<SoloRulesState>(…)`. `SoloPath` still takes `soloRules`, `soloKitSelection` and `onSoloRulesChange(rules, turnTimeChanged)` (HomeScreen calls `applySoloRulesChange`). `applySoloRulesPayload` goes in `screens/home/solo-rules-state.ts` beside them. The L76-01 tests 'starts a default solo game …' and 'opens on the solo path from a Play again seed …' must stay green: the solo menu still launches with `includeTurnTime` false when untouched.
- **L76-10 (C):**
  - Delete `screens/lobby-kit-picker-dialog.test.tsx` with the dialog, and carry its two tests: the lead `KIT_PICKER_LEAD`, and the Random preview `RANDOM_KIT_ASSIGN_COPY` / `RANDOM_KIT_PRIVACY_COPY` with nothing sent.
  - `RandomKitDetails` imports its strings from `screens/kit-pick-copy.ts`.
  - `KitDetails` now shows random-special versos (Prophet, Gambler), so the kit sheet inherits them.
  - The home test 'locks the solo menu while the launch is pending' expects a disabled 'Choose kit' button on the solo path.
- **L76-12 (B):** the Your kit line is `KIT_PRIVACY_COPY` from `screens/kit-pick-copy.ts`; keep that import (do not copy the string into `lobby-copy.ts`), and keep the L76-03 lobby test green.
- **Part 2:**
  - L76-04 flips 'locks every hub button while connecting, shows Connecting…, and leaves New live' (New disabled during a solo launch). It retires the two re-pointed `whats-new-dialog.test.ts` style tests, plus classification row [styling], with a decisions entry.
  - L76-05 / L76-06 / L76-07 can swap dialogs to V7 sheets without touching the gate and What's new tests: `closeHomeDialog` finds `sheet-overlay` too, and the tests query by dialog name and the 'Skip', 'Got it', 'Cancel' button names.
  - `screens/home/home-copy.ts` exists for Home strings that tests import.
  - The classification row `net/use-room-connection.tutorial.test.ts` has no Part 1 owner (L76-08 or L76-18).
- **Lot 75:**
  - L76-03 appends one `lot-72-v7` item. If Lot 75 appends first, the counts in `release-notes.test.ts`, `whats-new-dialog.test.ts`, classification row 234 and the `frontend.md` ordinal shift by one; the L76-03 steps say to use the current count plus one.
  - The `ui/kit/kit-details.tsx` change shows in the arena kit sheet; no arena test counts kit-sheet cards.
  - `screens/table/kit-inspect-dialog.test.ts` line 75 changes (A.9 ruling 2).
- **L76-18:** sweep the parity Keep and Notes lines that quote the old copy (`docs/technical_spec_v7_parity.md` around 910, 936, 987, 996, 1327, 1347, 1358).

#### Domain B

##### Contract issues
1. **"A Lot 76 file never imports `design/**`" (Global Constraints) cannot hold during L76-02.**
   - The pure move keeps the V2 lobby look, so `screens/lobby/lobby-screen.tsx` still imports `design/components/{bot-seat-label,button,dialog,kit-portrait}` until L76-12. `screens/lobby-kit-picker-dialog.tsx` keeps its V2 `Button` / `Dialog` / `KitPortrait` until L76-10.
   - L76-02 removes only the `screens/table/**` imports, which is what L75-11 waits on. L76-12 removes the rest (Step 3 grep).
2. **A.4 says every sub-component takes `locked` from L76-12.**
   - `LobbyHeader` has no intent control (Copy stays live, ruling 6), so an unused `locked` would fail `noUnusedParameters` / lint. It takes none.
   - `LobbyChatPanel` can only use `locked` through `ChatLog`'s `sendLocked`, which L76-14 adds, so `locked` joins `LobbyChatPanelProps` in L76-14.
   - Everything else follows A.4: L76-12 implements and tests `locked` in `LobbySeats`, `LobbyKitCard` and `LobbyActions`, and passes `disabled: locked` into the rules editor binding (A.5 had assigned that line to L76-14). L76-14 then only sets `locked = lobbyIntentsLocked(status)`, plus App, ChatLog and the alert dismiss.
3. **Ruling 6 lists "Choose kit" as disabled, but also keeps "opening … the kit picker" live.** L76-12 reads "Choose kit" as the picker's commit: `KitPickerSheet disabled={locked}` disables Select this kit, and the Choose kit button stays live. If L76-14 means the button itself, it is a one-prop change in `lobby-kit-card.tsx`.
4. **`KickConfirmDialogProps` (A.4) has no `disabled`.** On lock, L76-12 closes the confirm, and the seat cannot reopen it until unlock. If the designer wants the confirm to stay open with a greyed Kick, that needs an additive `disabled?: boolean` on the dialog. Strictly, that is a reshape of A.4.
5. **A.4's root hook needs `overscroll-contain` from L76-02,** but the V2 lobby `main` lacks it. L76-02 adds the class, a one-word edit beyond "pure move".
6. **The classification rows name the replacement file `screens/lobby/lobby.test.tsx`.** A.1 / A.3 use `screens/lobby/lobby-screen.test.tsx`; the Done marks point at the latter.
7. **Additive exports beyond A.3 / A.4:**
   - `test-lobby.ts`: `lobbyBackdrop`, `isLobbyControlDisabled`;
   - `lobby-seat-model.ts`: `lobbyCanAddBot`, `lobbyStartReason`;
   - `lobby-copy.ts`: the string table.
   No A.4 name or shape is changed.
8. **A.7 calls the moved `lobby-ready-mark.test.ts` "style-only",** but it also carries the product half (row L222: `lobbyReadyLabel`, mark before the nickname). It moves whole (a moved test keeps its assertions). Its product row is marked replaced in L76-02, and the file retires in L76-12.

##### Cross-task notes
- **L76-01 (Part A):**
  - L76-02 edits only the `lobbyKitSelectionLabel` import path in `screens/home/*`, found by grep; it touches nothing else there.
  - L76-01 opens the `frontend.md` Lot 76 section that L76-02 appends to.
- **L76-03 (Part A):**
  - After L76-02, the Your kit line lives in `screens/lobby/lobby-screen.tsx` as JSX text ("Hidden from opponents until Spy or death.").
  - `RandomKitDetails` stays in `screens/lobby-kit-picker-dialog.tsx`; L76-02 only switched that file's `KitDetails` and `lobby-kit-picker` imports.
  - L76-12 renders the L76-03 line from `KIT_PRIVACY_COPY` (`screens/kit-pick-copy.ts`), never a copy (ruling X-1).
- **L76-09 (Part C):**
  - L76-12 keeps L76-09's `<RulesStrip …>` element in `lobby-screen.tsx` (setup column) and only adds `disabled: locked` to its editor binding.
  - L76-12 rewrites the Lobby What's new item that L76-09 appends, in place, to the wording above. L76-09's item should be recognisable by its lobby / table-rules text.
  - If L76-09 does not append a Lobby item, L76-12 appends it and updates the A.6 count pins (written into L76-12 Step 3).
  - Plan C did not exist when this part was written, so the final wording above is this plan's own.
- **L76-10 (Part C):**
  - L76-02's `sends chooseKit only from Select this kit` must stay green against `KitPickerSheet`. That needs:
    - a dialog named 'Choose kit';
    - each kit tile's head button named by the kit name;
    - a 'Select this kit' button in the kit sheet.
  - L76-12's `lobby-kit-card.test.tsx` relies on the same names, plus `disabled` making Select this kit `disabled` or `aria-disabled`.
  - L76-10's own lobby-level tests should query by these A.4 names, not by the V2 lobby structure. L76-12 moves the picker wiring (open state, `onSelect={onChooseKit}`, `disabled`) and the Random-only line from `lobby-screen.tsx` into `LobbyKitCard`.
  - The Random-only line is `RANDOM_ONLY_LOBBY_LINE` from `screens/kit-pick-copy.ts` (ruling X-1).
- **L76-14 (Part D):**
  - `locked` already works in `LobbySeats` / `LobbyKitCard` / `LobbyActions` and the editor binding. Set `const locked = lobbyIntentsLocked(status)` in `lobby-screen.tsx`.
  - Add `locked` to `LobbyChatPanelProps` and pass it to `ChatLog` as `sendLocked`.
  - Add `onDismissError` to `LobbyHeaderProps` and to `makeLobbyProps`.
  - The lock adds no reason text; Start keeps its view reason. Locking closes an open Kick confirm.
  - Reuse `isLobbyControlDisabled` and `lobbyBackdrop` from `test-lobby.ts`.
  - The alert test in `lobby-header.test.tsx` uses `toContain`, so a dismiss button inside the alert keeps it green.
- **L76-15 (Part D):** the lobby mounts no Toast after L76-12 / L76-13, so the rules notice is the only one. Mount it in `lobby-screen.tsx`.
- **L76-16 (Part D):**
  - Claim a seat goes in `LobbyKitCard`'s walk-in branch (`WATCHING_TITLE` / `WATCHING_BODY` already live in `lobby-copy.ts`), with `onReopenClaim?` on `LobbyKitCardProps`.
  - Use the per-open latch pattern of `kick-confirm-dialog.tsx` for Sit here.
- **L76-17 (Part 2):** Share goes next to Copy in `LobbyHeader`'s code card. The copy-result dialog is `data-lobby-sheet="copy-result"`.
- **L76-18 / controller:** the layout pins for the 2 / 4 / 8-seat browser check are in L76-12 Step 3:
  - 360 px: one column; Kick wraps below the difficulty control;
  - seat grid: two columns from a 34rem panel;
  - `lg`: two page columns;
  - the action bar is sticky.
  Also check that the chat input is 16 px and the panel toggle is 44 px.

#### Domain C

##### Contract issues
1. **(Resolved by controller ruling C-1: L76-10 adds `action` and `attack` glyphs.)** **A.5 `kitTileStats` lists "action, attack", but `ui/icons` has no action or attack glyph, and `KitTileStat.icon` must be an `IconName`.** L76-10 keeps the contract shape (six entries) with `duplication-active` for both. Distinct glyphs would touch `icon-names.ts`, `icon.tsx`, `icon-names.test.ts` (an ordered list), `icon.test.tsx` and DESIGN.md › Icons, which A.1 gives to L76-12 for `check`. Proposal: L76-12 adds `action` and `attack` beside `check` and switches `kitTileStats`. Otherwise the designer accepts the shared icon.
2. **A.1 file lists.**
   - L76-09 also edits `ui/rules/rules-summary.ts` (+1 test), giving `rulesSummaryText` an optional clock so the spoken summary says "Server default".
   - L76-09 creates `ui/rules/rules.gallery-demos.tsx`: the live-apply demo needs state, and a `*.gallery.tsx` may not hold a component.
   - (Superseded by consistency ruling X-1: the Random-only lines go in L76-03's `screens/kit-pick-copy.ts`.)
3. **A.5 "rules.randomOnly → renders nothing (open is ignored)"** is implemented as both sheets `open={false}` (exit and press shield), which renders nothing after the exit. A.5 cannot reset the caller's `open`. The lobby clears it during render (L76-10), and L76-12's `LobbyKitCard`, which owns that state, must keep doing so.
4. **A.5 `serverDefaultTime` ("the clock reads SERVER_DEFAULT_LABEL until the slider is released once").** The strip follows it exactly. The slider readout shows live seconds during a drag and "Server default" whenever the thumb sits at the untouched value. A drag that ends where it started commits nothing, so the readout matching the strip there is deliberate.
5. **A.2 `HomeScreen` state names.** L76-09/10 use A.5's `solo` / `setSolo` and assume `SoloPathProps` still carries the V2 `soloRules`, `soloKitSelection` and `onSoloRulesChange`. L76-09 removes `onSoloRulesChange` and adds `rulesEditor: RulesEditorBinding`.
6. **A.4 `data-home-sheet` vs `data-lobby-sheet`.** The shared picker always uses `data-lobby-sheet` (`kit-picker`, `kit`), on Home too.

##### Cross-task notes (anything another domain's task must know)
- **L76-01 (Part A):**
  - L76-09 appends a describe block to `screens/home/solo-rules-state.test.ts`, so it must be the node test for `solo-rules-state.ts` at that path.
  - L76-09/10's Home tests open the solo path from the hub, with `HOW_TO_PLAY_SEEN_KEY` = '1' and `LAST_SEEN_RELEASE_ID_KEY` = `latestReleaseNote().id` seeded, and use `makeHomeProps` / `expectNoHomeIntent`.
  - Keep the hub button 'Play solo', the form button 'Start solo game' and the Your kit label (`lobbyKitSelectionLabel`) as plain text.
  - The kit picker stays a child of `HomeScreen`, with `kitPickerOpen` state there.
- **L76-02 (Part B):**
  - Lobby tests should not pin V2-only rules or picker details, or L76-09/10 must change them: for example, "a guest has no Table rules control", "excluded kits are absent from the picker", or the slider name "Human turn seconds".
  - 'Choose kit' opening a dialog named 'Choose kit', kit tiles named by the kit, and 'Select this kit' all survive L76-10.
- **L76-03 (Part A):**
  - L76-10 moves `RandomKitDetails` verbatim and tests it with `/one of the allowed kits/`, so keep that phrase from §10.1.
  - If L76-03 adds a test rendering `LobbyKitPickerDialog`, L76-10 moves it.
  - L76-03's What's new item comes before L76-09's: item 7, then 8.
- **L76-12 (Part B):**
  - Keep `RulesStrip` with `editor={{ onChange: onSetLobbyRules }}` for the host only.
  - Keep `KitPickerSheet`, and `RANDOM_ONLY_LOBBY_LINE` from `../kit-pick-copy` (no re-export).
  - Keep the "clear the open flag under Random only" rule, moved into `LobbyKitCard`; `lobby-screen.kit-picker.test.tsx` must stay green.
  - The What's new Lobby item is item 8; rewrite it in place.
  - If you add `action` / `attack` glyphs with `check`, switch `kitTileStats` and its test (Contract issue 1).
- **L76-14 (Part D):**
  - The lock wires `editor.disabled` (`disabled: locked`) and `KitPickerSheet disabled={locked}`.
  - Editor controls use native `disabled` (`Slider` and `Toggle` offer nothing else), so a focused editor control drops focus to `body` when the lock starts. Select this kit is `focusableWhenDisabled` with an empty reason, so L76-14 can pass a reconnecting reason through a new prop if it wants one.
  - The strip and both picker sheets stay openable while locked (ruling 6).
- **L76-15 (Part D):** the guest "Your pick was reset to Random" toast compares `yourKitSelection`. The picker no longer hides excluded kits, so a guest previewing the excluded kit sees Select disabled at once.
- **L76-11 (Part 2):**
  - `SoloPath` takes `rulesEditor: RulesEditorBinding`, built in `HomeScreen`.
  - The solo Random-only line is `RANDOM_ONLY_SOLO_LINE` (`screens/kit-pick-copy.ts`).
  - `KitPickerSheet` takes `disabled={busy}` at the `HomeScreen` root.
- **L76-05 (Part 2):** `latestReleaseNote().items` has 8 entries after L76-09 (L76-12 rewrites, not appends).
- **Lot 75 / L75-11:** after L76-10 nothing imports `screens/lobby-kit-picker-dialog.tsx`, and the picker uses `ui/kit/kit-details` only (L76-02 already switched the import).

#### Domain D

##### Contract issues

1. **Ruling 6 lists "Choose kit" as locked and also keeps "opening … the kit picker" live.** Choose kit is the picker's only opener (A.4). The plan reads "Choose kit" as the choose-kit intent: Select this kit is locked, and Choose kit stays live. That matches A.5 (`KitPickerSheetProps.disabled`: "the sheets still open and close") and the commit rule. If the controller meant the button, it is a one-line change in `LobbyKitCard` (`disabled={locked}`) and one test line ("the kit picker still opens" would go).
2. **`KickConfirmDialogProps` (A.4) has no lock.** Ruling 6 locks Kick, but a confirm can already be open when the drop happens. Without reshaping A.4, L76-14 closes the confirm when `locked` turns true (state in the owner of its target, presumably `LobbySeats`). Keeping it open with a disabled Kick would need `locked?: boolean` on `KickConfirmDialogProps`.
3. **A.4 says L76-14 "changes only `lobby-screen.tsx` and App".** That cannot hold:
   - the alert dismiss is in `lobby-header.tsx` (A.4 says so itself);
   - `ChatLog.sendLocked` is created by L76-14 (ruling 8), so L76-13's `LobbyChatPanel` cannot pass it yet;
   - `lobby-copy.ts` and `test-lobby.ts` gain entries (A.3).
   L76-14 also re-checks the lock table in `lobby-seats.tsx`, `lobby-kit-card.tsx` and `lobby-actions.tsx` and fills any gap left by L76-12.
4. **(Resolved, ruling D-4: `LobbyHeader` takes no `locked`.)** `LobbyHeader`'s `locked` (A.4) has nothing to lock (Copy and the alert's OK stay live).
5. **L76-15 Acceptance vs itself.** "No notice … on a Random-only toggle that keeps the pick" conflicts with "'Rules changed' fires for each field change" and with §7.4 ("a toast when rules change"). The plan reads the first clause as "no reset notice": a Random-only toggle shows "Rules changed" without the body. It is recorded as a designer question.
6. **A.1 L76-16: "rewrites `screens/claim-seat-dialog.tsx` in place … props unchanged".** Kept. The V7 `Dialog`'s exit fade and press shield cannot play while App mounts the dialog only while it shows (`claimDialog`). Changing that would touch the claim element shared with the `playing` / `finished` branches, beyond A.1's "lobby branch" scope.
7. **The `Toast` mounts two live regions permanently** (`role="status"` and an empty `role="alert"`) in `document.body`. From L76-15 on, any lobby test that queries `ByRole('alert')` or `ByRole('status')` from `screen` becomes ambiguous. L76-15 scopes such queries to `main`. L76-02 / L76-12 / L76-13 tests should scope them that way from the start.

##### Cross-task notes (anything another domain's task must know)

`plan-part-B.md` did not exist while this was written, so the L76-12 / L76-13 items are assumptions my tests rely on. `plan-part-C.md` confirms the L76-09 / L76-10 items: the 'Human turn' slider, All / None / Random and kit-named toggles, Close as the only sheet action, native `disabled` under `editor.disabled`, `KitPickerSheet disabled={locked}`, picker tiles named by `lobbyKitSelectionLabel`, a kit sheet titled by the kit, Esc stepping back, and both sheets openable while locked.

- **L76-12 (A.4):**
  - `LobbyHeader` renders the always-mounted status line and the error `<p role="alert">`. L76-14 wraps the alert in `[data-lobby-alert]`, adds the OK `IconButton`, and gives the status line `role="status"` (please add it in L76-12 if you can).
  - Lobby sheets (copy result 'Code copied', Kick confirm 'Kick this player?') are V7 `Dialog`s, closed on Esc.
  - Names: buttons 'Start game', 'Ready', 'Cancel ready', 'Leave', 'Feedback', 'Copy', 'Add bot', 'Choose kit'; 'Kick' inside `lobbySeat(id)`.
  - Difficulty controls are `Segmented` radiogroups: a bot's is named `'{nickname} difficulty'` (`'Bot Cy difficulty'`), and Add bot's has any name. They are the only radios in `<main>`.
  - `locked` disables: Start and Ready / Cancel ready (`LobbyActions`); Kick, both difficulty controls and Add bot (`LobbySeats`); `KitPickerSheet disabled` (`LobbyKitCard`). It never disables Leave, Feedback, Copy or Choose kit.
  - The component that owns the Kick confirm's target can clear it during render.
  - The walk-in banner ("Watching the lobby" and its line) lives in `LobbyKitCard`. L76-16 adds `onReopenClaim?` and a button there.
  - `LobbyScreen` renders the `RulesStrip` and passes the host's `editor` binding (L76-14 adds `disabled: locked`).
- **L76-13:**
  - `LobbyChatPanel` renders `ChatLog` with `canWrite` true and never ties `canWrite` to `locked` (that would drop the draft). L76-14 adds `sendLocked={locked}`.
  - At a desktop visual viewport (1440×900, stubbed) the panel shows its composer: textbox 'Message' and button 'Send'.
- **L76-09:** with `editor.disabled` every editor control is native-disabled (slider, All, None, Random, 16 kit toggles). The only other button in the editor sheet is 'Close'. The strip button is named 'Table rules' and the sheet is titled 'Table rules'.
- **L76-10:**
  - With `disabled`, Select this kit is disabled while the picker and kit sheet still open.
  - Kit tile buttons are named by kit name ('Assassin'); the kit sheet is titled by kit name; Esc steps back one level.
- **L76-02 test helpers:**
  - `makeLobbyProps` defaults: L76-14 adds `onDismissError: vi.fn()`.
  - `walkInLobbyView` and `guestLobbyView` take `players` and `claimableSeats` overrides.
  - `expectNoLobbyIntent` covers the 8 `LOBBY_INTENT_PROPS` only (not `onLeave`, `onDismissError` or `onReopenClaim`).
- **Lot 75:**
  - `App.lobby.test.tsx` writes `localStorage['card-battle.v7.ui'] = 'next'` (a literal, not `UI_SWITCH_STORAGE_KEY`) so the playing branch renders the arena. L75-09 can drop that line once the arena is the default. It renders `makePlayingView()` and looks up the dock's `/^Draw/` button.
  - L76-14's phase-change clear sits at the top of `GameApp`, outside the branches L75-09 rewrites. Keep it when you rewrite them.
  - L76-16 moves the `walkInSeesPrivateHands` suite (your classification row 97) to `screens/claim-seat.test.ts`, unchanged. `screens/table.claim-seat-dialog.test.ts` is untouched.
  - `ClaimSeatDialog` keeps its title and 'Stay spectating', so `App.arena.test.tsx`'s claim test stays green.
- **Part 2 (L76-04 Home restyle):** keep Home's error in an element with `role="alert"`. L76-14's Review Focus 3 test reads `screen.getByText('You were kicked.').closest('[role="alert"]')`, and `markLatestReleaseSeen()` keeps What's new from auto-opening over it.
- **`docs/agent/testing.md`** gains a "Room connection fake (V7 · L76-14)" section. Part 2's App-level Home tests can reuse `fakeRoomConnection`.

### C.3 Part 2 inputs

- `net/use-room-connection.tutorial.test.ts` classification row (hook behavior test) has no Part 1 owner: L76-08.
- L76-04 flips the L76-01 test that leaves New live while busy (New disabled during a solo launch) and retires the two re-pointed `whats-new-dialog.test.ts` style assertions.
- L76-05/06/07 swap the V2 What's new, How to play and Feedback dialogs to V7 sheets; the L76-01 tests query by dialog name and button names, and `closeHomeDialog` already handles `sheet-overlay`.
- L76-11 builds the Solo path on `SoloPath`'s `rulesEditor: RulesEditorBinding` (L76-09) and `KitPickerSheet disabled={busy}` (L76-10); the solo Random-only line is `RANDOM_ONLY_SOLO_LINE`.
- L76-17 puts Share next to Copy in `LobbyHeader`'s code card; `fakeRoomConnection` (L76-14) serves App-level Home tests.
- L76-18 sweeps the parity Keep/Notes lines that quote the old copy (`docs/technical_spec_v7_parity.md` around 910, 936, 987, 996, 1327, 1347, 1358) and runs the browser checks the controller deferred (A.9 ruling 1).

---

## Draft id → final id

Briefs below may cite other tasks by their draft id; use this table.

| Draft | Final |
|---|---|
| L76-01 | L76-01 |
| L76-02 | L76-02 |
| L76-03 | L76-03 |
| L76-04 | L76-04 |
| L76-05 | L76-05 |
| L76-06 | L76-06 |
| L76-07 | L76-07 |
| L76-08 | L76-08 |
| L76-09 | L76-09 |
| L76-10 | L76-10 |
| L76-11 | L76-11 |
| L76-12 | L76-12 |
| L76-13 | L76-13 |
| L76-14 | L76-14 |
| L76-15 | L76-15 |
| L76-16 | L76-16 |
| L76-17 | L76-17 |
| L76-19 | L76-18 |

Cross-lot moves: draft L73-01 → L72-03, L73-02 → L72-04, L73-03 → L73-01; draft L72-03 split into L72-06 (harness) and L72-07 (icons); draft L74-02 dropped (sheet stack is L72-09); draft L76-18 folded into the Lot 76 copy task; draft L81-02 folded into L81-01.

## Draft questions and their dispositions

Resolved in the 2026-10-21 backlog review unless listed under "Designer questions still open" in `docs/backlog_v7.md`; dispositions are recorded in the **Review** lines above and in the amended spec.

- Mode tile labels: §7.1 names the tiles Solo / Online / Tutorial, but §1 says existing labels keep their wording ('Play solo', 'Play online', 'Tutorial'). Which labels ship? The draft defaults to the existing ones.
- L72 boundary: does L72 (not L73) ship the `ui/` ChatLog, KitInspectDetails and the read-only rules sheet that L76-02/09/10/13 depend on? Does the rules sheet include the host editor mode? Does L72 ship a text-field primitive (16 px floor, not in the §4.2 list) and a kit tile, or does L76 add them (L76-07, L76-10)? Also, L76 imports `seat-colors` and `asset-lookup` from wherever they live when it merges, and whichever of L73/L76 lands second fixes the paths. Is that acceptable?
- Prophet copy (§10.1, Lot 76) lives in `screens/table/kit-inspect-traits.ts`, and its test is in `screens/table/kit-inspect-dialog.test.ts`, which L76 must not edit. The draft makes L76-18 wait for the L73 pure-module move. Alternatively, should L75 take this row?
- What's new: `lot-72` is promoted to `main` before L72 merges, so the first player-facing V7 PR opens a new entry. Which id and title should it use (for example `lot-76`, or one V7 entry shared by L74–L77 during the freeze)? And is one Before/After item per player-facing task right, or one 'Home and lobby' item extended task by task?
- §7.7 lists 'connection errors' among the bottom sheets / dialogs. Does that mean Home create, join, kick and reclaim failures move from the inline role=alert status block into a sheet? The draft keeps them inline (V7-styled), because §7.1 says nothing and the parity keep is 'retry in place'.
- Invite link: when Web Share is missing, Share copies the link. What should the result dialog say ('Link copied' is not in §10.6)? Should a `?code=` URL open Home directly on the Online path (soft gate still first), or stay on the hub with Join pre-filled? Should the parameter be stripped from the URL after reading? The draft pre-fills only and leaves the URL alone.
- Proposed copy for designer review. Online Create helper: 'Host gets a code to share. Start from the lobby once every guest is Ready.' First Kits sentence: 'In the lobby you may pick a kit or keep Random, unless the host excluded it or deals every kit at random.' Random-only line in place of Your kit: reuse the existing 'The host is dealing kits at random.' in the lobby, and what for solo, where you are the host?
- The kit picker lead 'Opponents cannot see your kit. Random is the default.' and the solo 'Hidden from opponents. Random is the default.' also predate Lot 69 but are not §10.1 rows. Keep them verbatim?
- Gambler kit tile: `KIT_CATALOG` says Draw 10, while the real Draw is 5–100 weighted (kit inspect shows 10 today). Should the §7.3 tile show the catalog 10 or '5–100'?
- Rules toasts (§7.4): walk-in lobby spectators also see the strip. Do they get 'Rules changed' too? The draft gives it to seated non-host guests only.
- Claim a seat (§7.2) is placed in the walk-in banner. A seated non-host guest who pressed 'Keep this seat' also cannot reopen the picker today. Should they get the control as well?
- Feedback 'Sent': does the confirmation close itself after a delay, or wait for the player? And since §7.7 locks dismissal while sending and `submitFeedback` has no client timeout, a hung request would trap the sheet. Add a timeout, or keep it?
- Reconnecting lobby (§7.2 'controls disabled'): the draft disables every intent-sending control and keeps Leave, Copy/Share and Feedback live. For the slider's 'send on release' with a keyboard, the draft commits on each value-changing key-up. Confirm both readings.
