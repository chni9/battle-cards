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

## Part 2 — Tasks L76-04 … L76-08, L76-11, L76-17, L76-18

### Part 2 constraint deltas

Every Part 1 Global Constraint and Convention still binds. Additions:

- **Starting point.** Part 1 is committed (`109bdb0d..bc6aa9fd`): Home lives in `screens/home/` (V2 look, `design/` imports kept until its restyle task), the lobby in `screens/lobby/` (V7). Read the real code before relying on a name; Appendix A.2/A.3 shapes still hold.
- **Shared dialogs are rewritten in place.** `screens/whats-new-dialog.tsx` (L76-05), `screens/how-to-play-dialog.tsx` (L76-06) and `feedback/feedback-dialog.tsx` (L76-07) keep their file, export name and props, because `screens/arena/top-bar.tsx`, `screens/table.tsx`, `screens/end.tsx` and the lobby mount them. Those callers are never edited; every existing test of those callers (`screens/arena/**/*.test.tsx`, `screens/end*.test.*`, `screens/table*.test.ts`) stays green unedited. A task that would need to edit one stops and reports.
- **After its restyle task a Home file imports nothing from `design/**` or `bots/`.** L76-04 (hub, path header, status, art, New/Beta), L76-08 (Online, Tutorial, nickname field), L76-11 (Solo). At L76-11's commit `grep -rnE "from '[^']*(design/|bots/)" apps/client/src/screens/home` prints nothing.
- **What's new (§10.4).** `lot-72-v7` has 8 items after Part 1. Part 2 adds exactly one **Home** item (L76-04 appends item 9; L76-05/06/07/08/11 may rewrite its text in place when their area changes what it says) and rewrites the **Lobby** item 8 in place for the invite link (L76-17). Every rewrite updates the `release-notes.test.ts` `toEqual`; the append also updates the `whats-new-dialog.test.ts` length pin (9), classification row 236 and the frontend.md list.
- **Backlog Progress.** Lot 76 cell after each task: L76-04 → 11, L76-05 → 12, L76-06 → 13, L76-07 → 14, L76-08 → 15, L76-11 → 16, L76-17 → 17, L76-18 → 18; Total + 1 each (read it first; Lot 75 moves it).
- **Overlay exit waits** use `queryByRole('dialog', { name, hidden: true })` returning null, never Sheet-internal `data-zone` anchors (an exiting Sheet is `aria-hidden`).

### Part 2 Review Focus

1. **A gated How to play closes by any path.** Esc, backdrop, swipe-down, Skip and Got it on the gated carousel each mark seen and enter the chosen path exactly once; paging (chevrons, swipe) never closes it. Owner: **L76-06**.
2. **Feedback hangs.** `submitFeedback` never resolves: dismissal stays locked, and after 15 s the sheet re-enables dismiss with an error; a late success after the timeout sends no second 'sent'. Owner: **L76-07** (fake timers).
3. **A double click on Create, Join, Start tutorial or Start solo game** calls its callback once. Owner: **L76-08** (Create, Join, Tutorial) and **L76-11** (Solo).
4. **An invite link with junk.** `?code=abcdefgh` pre-fills `ABCDEF` (uppercase, capped at 6, no character filter: the server validates, as the Join field does today); `?code=` empty or missing pre-fills nothing and Home opens on the hub as usual; `/admin?code=X` stays admin; Join stays disabled until a nickname is typed and nothing joins by itself. Owner: **L76-17**.
5. **A solo launch while a sheet is open.** Start solo game is in the form; the rules sheet or kit picker opened from the form never submits it, and every Solo control (count, difficulty, Choose kit, rules editor) is disabled while `soloLaunchPending`. Owner: **L76-11**.

### Part 2 execution order

Sequential: **L76-04 → L76-05 → L76-06 → L76-07 → L76-08 → L76-11 → L76-17 → L76-18.**

### Task L76-04: Restyle the Home hub and path chrome

**Files:**
- Create: `apps/client/src/screens/home/whats-new-control.tsx` (`WhatsNewControl`, `WhatsNewControlProps`).
- Modify (each ends with no `design/` and no `bots/` import):
  - `apps/client/src/screens/home/home-screen.tsx`: V7 root, the top-right corner row, `WhatsNewControl`, the mode transition through `motionPropsFor`; no longer renders `HomeArt` at the root.
  - `apps/client/src/screens/home/home-hub.tsx`: the V7 hub (fan, wordmark, tagline, status, three mode tiles, How to play, Feedback, helper).
  - `apps/client/src/screens/home/home-art.tsx`: `HomeArt` becomes the hub's floating card fan; `BetaCard` the V7 Beta badge (names kept, A.2 / A.10).
  - `apps/client/src/screens/home/path-header.tsx`, `apps/client/src/screens/home/home-status.tsx`: V7 restyle, props unchanged.
  - `apps/client/src/screens/home/home-screen.test.tsx`: the edits in Step 1.
  - `apps/client/src/screens/whats-new-dialog.test.ts`: delete the two style-only `it`s; the length pin 8 → 9; header comment.
  - `packages/shared/src/release-notes.ts` + `packages/shared/src/release-notes.test.ts`: What's new item 9 (Home).
  - `docs/agent/decisions.md`, `docs/agent/frontend.md`, `DESIGN.md` (Typography › Display line), `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md` (rows 236, 238, 239).
- Not edited: `online-path.tsx`, `tutorial-path.tsx`, `solo-path.tsx`, `nickname-field.tsx`, `home-classes.ts` (L76-08 / L76-11 restyle them; they keep their `design/` imports until then).
- Existing tests that must stay green unchanged: every other `it` of `home-screen.test.tsx` (36 of 38; the gate, What's new, Feedback, Online, Solo, Tutorial, layout and copy suites), `screens/home/solo-path.kit-picker.test.tsx`, `solo-path.rules.test.tsx`, `home-gate.test.ts`, `home-whats-new.test.ts`, `solo-rules-state.test.ts`, `home-copy.test.ts`, `App.lobby.test.tsx` (its kicked test reads `getByText('You were kicked.').closest('[role="alert"]')`), every `screens/lobby/*.test.tsx`.

**Interfaces:**
- Consumes:
  - ui: `V7_COLORS` (`ui/palette`), `Button` (`ui/primitives/button`: `variant`, `icon`, `disabled`, `className`, `...rest` data attributes), `CHROME_SHAPE_CLASS`, `CHROME_SHAPE_SM_CLASS`, `CHROME_FLAT_SM_CLASS`, `CHROME_FOCUS_CLASS`, `CHROME_DISABLED_CLASS`, `chromePressClass`, `motionAttribute` (`ui/primitives/chrome-classes`), `Card` (`ui/card/card`), `artFor` (`ui/asset-lookup`), `usePrefersReducedMotion` (`ui/motion/use-prefers-reduced-motion`), `motionPropsFor`, `type V7MotionSpec` (`ui/motion/reduced-motion`), `durationS`, `EASE_ENTRANCE` (`ui/motion/motion-tokens`), `type HowToPlayContinueTarget` (`ui/help-storage`).
  - Home: `HomeStatus`, `homeStatusCopy` (`../status-labels`), everything `HomeScreen` already wires.
  - Shared: `type CardId`, `type KitId`.
- Produces:

```tsx
// screens/home/whats-new-control.tsx
export interface WhatsNewControlProps {
  /** The latest entry is unseen: the name gains "(unread)" and the dot shows. */
  readonly unread: boolean;
  /** True only while a solo game launches (spec v7 §11, §13 Q8); the name and dot stay. */
  readonly disabled: boolean;
  readonly onOpen: () => void;
}
export function WhatsNewControl({ unread, disabled, onOpen }: WhatsNewControlProps): ReactElement;

// screens/home/home-art.tsx (names unchanged, A.2)
export function HomeArt(): ReactElement;   // the hub's card fan: aria-hidden, data-home-card-fan, data-motion
export function BetaCard(): ReactElement;  // <aside data-zone="beta-card"> with the word Beta

// Unchanged props: HomeHubProps, PathHeaderProps, HomeStatusProps, HomeScreenProps.
```

- Test hooks (later Part 2 tasks may rely on them): `[data-home-corner]` (the top-right row: `BetaCard` then `WhatsNewControl`, a direct child of `main`, every mode); `[data-home-mode]` (the mode root, value `hub` | `online` | `solo` | `tutorial`, with `data-motion`); `[data-home-card-fan]` and `[data-home-fan-card]` (hub only); `[data-home-tile]` (`solo` | `online` | `tutorial`); `[data-home-alert]` (the error wrapper; the `role="alert"` node inside holds only the message); `[data-whats-new-button]`, `[data-whats-new-unread]`, `[data-zone="beta-card"]` (kept).

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/screens/home/home-screen.test.tsx`: 38 → 45 tests. Header comment: add the parity ids `home-path-header`, `global-motion-reduced-motion`, `global-art-catalog`, `global-dialog-button-primitives` and "(L76-01, L76-04)".

1. In `describe('Home hub (spec v7 §7.1; L42-04, L51-03)')`, `it('locks every hub button while connecting, shows Connecting…, and leaves New live')` keeps its name and every assertion. Only its comment changes, because Q8 disables New during a solo launch, not during an online connect:

```tsx
    // Only a solo launch disables New (spec v7 §11, §13 Q8; L76-04): an online connect leaves it live.
    expect(isEnabled("What's new")).toBe(true);
```

2. Append to the same `describe`:

```tsx
  it('disables New during a solo launch, keeps its unread name and dot, and frees it after (§11, Q8)', () => {
    seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: false });
    const props = makeHomeProps({ soloLaunchPending: true });
    const { rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    const newButton = screen.getByRole('button', { name: "What's new (unread)" });
    expect(newButton.hasAttribute('disabled')).toBe(true);
    expect(newButton.querySelector('[data-whats-new-unread]')).not.toBeNull();
    expect(HUB_BUTTONS.filter(isEnabled)).toEqual([]);
    expect(screen.getByText('Starting solo game…')).toBeTruthy();
    rerender(<HomeScreen {...props} soloLaunchPending={false} />);
    expect(isEnabled("What's new (unread)")).toBe(true);
    expectNoHomeIntent(props);
  });

  it('shows the V7 hub: the Card Battle wordmark, the Solo, Online and Tutorial tiles, then How to play and Feedback (§7.1)', () => {
    seedHomeStorage(SEEN);
    renderHome();
    const wordmark = screen.getByRole('heading', { level: 1 });
    expect(wordmark.textContent).toBe('Card Battle'); // the accessible name stays; CSS shows CARD BATTLE
    expect(wordmark.classList.contains('uppercase')).toBe(true);
    expect(screen.getByText('Turn-based card battle')).toBeTruthy();
    expect(screen.getByText('New here? Open How to play once, then pick Tutorial, Online, or Solo.')).toBeTruthy();
    // Every button in main, in DOM order: New in the corner, the three tiles, the two secondary buttons, nothing else.
    expect(within(main()).getAllByRole('button').map((button) => button.textContent)).toEqual(
      ['New', 'Play solo', 'Play online', 'Tutorial', 'How to play', 'Feedback'],
    );
    expect(['Play solo', 'Play online', 'Tutorial'].map((name) => screen.getByRole('button', { name }).getAttribute('data-home-tile')))
      .toEqual(['solo', 'online', 'tutorial']);
  });

  it('keeps the card fan aria-hidden on the hub only, and still under reduced motion (§7.1, §8.3)', async () => {
    seedHomeStorage(SEEN);
    const { user, unmount } = renderHome();
    const fan = main().querySelector<HTMLElement>('[data-home-card-fan]');
    if (fan === null) throw new Error('no card fan');
    expect([fan.getAttribute('aria-hidden'), fan.getAttribute('data-motion')]).toEqual(['true', 'reduced']);
    const cards = Array.from(fan.querySelectorAll<HTMLElement>('[data-home-fan-card]'));
    expect(cards).toHaveLength(5);
    expect(cards.filter((card) => /translate/.test(card.style.transform))).toEqual([]); // no float offset
    expect(within(main()).queryAllByRole('article')).toEqual([]); // the holo cards are hidden from assistive tech
    await enterHomePath(user, 'online');
    expect(main().querySelector('[data-home-card-fan]')).toBeNull();
    unmount();
    renderUi(<HomeScreen {...makeHomeProps()} />, { reducedMotion: false });
    expect(main().querySelector('[data-home-card-fan]')?.getAttribute('data-motion')).toBe('full');
  });

  it('names the mode on its transition root and marks reduced motion there (§11 Q7)', async () => {
    seedHomeStorage(SEEN);
    const { user, unmount } = renderHome();
    const modeRoot = (): Element | null => main().querySelector('[data-home-mode]');
    expect([modeRoot()?.getAttribute('data-home-mode'), modeRoot()?.getAttribute('data-motion')]).toEqual(['hub', 'reduced']);
    await enterHomePath(user, 'tutorial');
    expect(modeRoot()?.getAttribute('data-home-mode')).toBe('tutorial');
    unmount();
    renderUi(<HomeScreen {...makeHomeProps()} />, { reducedMotion: false });
    expect(modeRoot()?.getAttribute('data-motion')).toBe('full');
  });

  it.each(HOME_PATHS)('disables Back and Feedback on the %s path while connecting or launching', async (target) => {
    seedHomeStorage(SEEN);
    const props = makeHomeProps({ nickname: 'Ada' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, target);
    expect(['Back', 'Feedback'].filter(isEnabled)).toEqual(['Back', 'Feedback']);
    rerender(<HomeScreen {...props} status="connecting" />);
    expect(['Back', 'Feedback'].filter(isEnabled)).toEqual([]);
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect(['Back', 'Feedback'].filter(isEnabled)).toEqual([]);
    expectNoHomeIntent(props);
  });
```

3. In `describe("What's new …")`, replace `it('keeps New beside the Beta badge, outside the hub buttons')` (same name). The V7 corner wraps Beta and New in one row, so New's parent is that row, not `main`; the assertion keeps its meaning (New right after Beta, outside the mode section) and gains the every-path check (parity `home-beta-badge`: shown in every Home mode):

```tsx
  it('keeps New beside the Beta badge, outside the hub buttons', async () => {
    seedHomeStorage(SEEN);
    const { user } = renderHome();
    const newButton = screen.getByRole('button', { name: "What's new" });
    expect(screen.getByText('Beta').closest('aside')?.nextElementSibling).toBe(newButton);
    const corner = newButton.parentElement;
    expect(corner?.hasAttribute('data-home-corner')).toBe(true);
    expect(corner?.parentElement).toBe(main());
    expect(screen.getByRole('button', { name: 'Play online' }).closest('section')?.contains(newButton)).toBe(false);
    for (const target of HOME_PATHS) {
      await enterHomePath(user, target);
      const pathCorner = main().querySelector('[data-home-corner]');
      expect(pathCorner?.contains(screen.getByText('Beta'))).toBe(true);
      expect(pathCorner?.contains(screen.getByRole('button', { name: "What's new" }))).toBe(true);
      await user.click(screen.getByRole('button', { name: 'Back' }));
    }
  });
```

`apps/client/src/screens/whats-new-dialog.test.ts` (4 → 2 tests): delete `it('wires a green New control, red unread badge, and auto-open when unseen')` and `it('keeps What’s new as a small top-right control, not a hub action-row block')` (old-layout detail, decisions entry in Step 5); in the remaining `it('renders a New section …')` change `expect(latestReleaseNote().items).toHaveLength(8);` to `toHaveLength(9)`; replace the header's L76-01 lines with:

```ts
 * L76-01: the Home behavior is rendered in screens/home/home-screen.test.tsx. L76-04 retired the
 * style-only Home lines (decisions.md); L76-05 rewrites the dialog half as rendered tests.
```

`packages/shared/src/release-notes.test.ts`: in `it('writes lot-72-v7 as the New look entry …')`, append to the `toEqual` array after the lobby item:

```ts
      {
        before: 'Home was a plain menu.',
        after: 'Home has the new look, with a big tile for each way to play.',
      },
```

- [ ] **Step 2: Run them and see them fail.**
  - Command: `pnpm vitest run apps/client/src/screens/home/home-screen.test.tsx apps/client/src/screens/whats-new-dialog.test.ts packages/shared/src/release-notes.test.ts`.
  - Expected failures: the solo-launch test (New is enabled during a launch), the hub test (no `uppercase`, the V2 order Online / Solo / Tutorial, no `data-home-tile`), the fan and mode tests (no `[data-home-card-fan]` / `[data-home-mode]`), the corner test (New's parent is `main`), the item pin (8 items) and the release-notes `toEqual`. The three path tests may already pass (the V2 header disables Back / Feedback while busy): they guard the restyle.

- [ ] **Step 3: Implement.**
  - **`packages/shared/src/release-notes.ts`**: append the Step 1 item (no `cardId`, no `kitId`) to `lot-72-v7.items`, after the lobby item.
  - **`screens/home/whats-new-control.tsx`**: doc comment cites spec v7 §7.1 (L63-07: small, top-right, unread dot), §11 / §13 Q8, Appendix A `home-whats-new`. Renders `<Button variant="quiet" data-whats-new-button aria-label={unread ? "What's new (unread)" : "What's new"} disabled={disabled} onClick={onOpen} className="relative">New{dot}</Button>`; the dot, only when `unread`, is `<span data-whats-new-unread aria-hidden="true" className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-v7-ink bg-v7-cta" />` (the IconButton count-badge look). Native `disabled`, never `focusableWhenDisabled` (the tests read the `disabled` attribute).
  - **`screens/home/home-art.tsx`** (doc comment: spec v7 §7.1, §5.4, §5.5, §8.3; parity `home-beta-badge`, `global-art-catalog`):
    - `BetaCard`: `<aside data-zone="beta-card" className={`${CHROME_FLAT_SM_CLASS} inline-flex min-h-7 items-center bg-v7-panel-2 px-2`}>` holding `<p className="font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.16em] text-v7-text">Beta</p>`. Not positioned: the corner row places it.
    - `HomeArt`: a module-level list of five base cards, left to right `spy`, `strong-attack`, `basic-attack`, `mirror`, `shield` (no `super-regeneration`: the What's new test asserts that name never appears in `main`), each with a static tilt and drop (for example `-rotate-12 translate-y-4`, `-rotate-6 translate-y-1`, none, `rotate-6 translate-y-1`, `rotate-12 translate-y-4`) on an outer `<div className="-mx-4 …">`. Root: `<div aria-hidden="true" data-home-card-fan data-motion={motionAttribute(reduced)} className="pointer-events-none relative flex h-40 w-full items-end justify-center overflow-x-clip sm:h-48">`. Inside each outer div, `<motion.div data-home-fan-card {...motionPropsFor(fanFloat(index), reduced)}>` around `<Card size="tile" className="[--card-w:clamp(64px,19vw,104px)]" instance={{ instanceId: `home-fan-${cardId}`, cardId, isUpgraded: false }} />`.
    - `fanFloat(index)` (module-private) returns a `V7MotionSpec`: `{ initial: { y: 0 }, animate: { y: -8 }, transition: { duration: 3.2, delay: index * 0.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } }`. `reduceMotionSpec` drops `y` and the loop, so under reduced motion nothing moves and no transform is written.
  - **`screens/home/home-status.tsx`** (props unchanged; `homeStatusCopy` unchanged, so idle stays unlabeled): the status line `<p className="font-v7-body text-v7-body font-bold text-v7-text-2">{copy}</p>` when `copy !== null`; the error `<div data-home-alert className={`bg-v7-panel-2 px-3 py-2 ring-2 ring-inset ring-v7-danger ${CHROME_SHAPE_SM_CLASS}`}><p role="alert" className="font-v7-body text-v7-body font-bold text-v7-text">{error}</p></div>` (the lobby alert look, no OK: Home errors clear only on the next start, §7.7 "retry in place").
  - **`screens/home/path-header.tsx`** (props unchanged): `<header className="flex flex-col gap-1">`, then a row with `<Button variant="quiet" icon="chevron-left" disabled={backDisabled} onClick={onBack}>Back</Button>` and `<Button variant="quiet" icon="feedback" disabled={backDisabled} onClick={onOpenFeedback}>Feedback</Button>`, then the eyebrow `<p className="mt-4 font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.14em] text-v7-text-2">Card Battle</p>`, `<h1 className="font-v7-display text-v7-display leading-none text-v7-text">{title}</h1>`, the subtitle `<p className="max-w-[40ch] font-v7-body text-v7-body text-v7-text-2">` and `HomeStatus`.
  - **`screens/home/home-hub.tsx`** (props unchanged), one centered column, in this DOM order:
    1. `<HomeArt />`;
    2. `<h1 className={WORDMARK_CLASS} style={WORDMARK_STYLE}>Card Battle</h1>`, with the module-private `WORDMARK_CLASS = 'relative -mt-8 font-v7-display text-v7-display uppercase leading-none tracking-wide text-v7-text sm:text-[48px]'` and `WORDMARK_STYLE: CSSProperties = { WebkitTextStroke: `6px ${V7_COLORS.ink}`, paintOrder: 'stroke fill', textShadow: `0 4px 0 ${V7_COLORS.ink}` }` (`V7_COLORS` from `ui/palette`: inline styles take palette hex, never `var()`; DESIGN.md › The Inline Hex Rule). Lilita, the arcade outline painted under the fill, the hard ink shadow; it overlaps the bottom of the fan;
    3. the tagline `<p>` 'Turn-based card battle' (the eyebrow copy, under the wordmark);
    4. `HomeStatus` (so the alert follows the `<h1>`);
    5. the tiles, `<div className="grid w-full gap-3 sm:grid-cols-3">`, in spec order Play solo, Play online, Tutorial;
    6. `<Button variant="secondary" icon="help" disabled={busy} onClick={onOpenHowToPlay}>How to play</Button>` and `<Button variant="quiet" icon="feedback" disabled={busy} onClick={onOpenFeedback}>Feedback</Button>`;
    7. the helper `<p>` 'New here? Open How to play once, then pick Tutorial, Online, or Solo.'
    - The tile is a module-private `ModeTile({ target, label, disabled, onChoose })`: `<button type="button" data-home-tile={target} data-motion={motionAttribute(reduced)} disabled={disabled} onClick={onChoose} className={[ 'flex min-h-11 items-center gap-3 bg-v7-panel px-3 py-3 text-left text-v7-text sm:flex-col sm:text-center', CHROME_SHAPE_CLASS, CHROME_FOCUS_CLASS, CHROME_DISABLED_CLASS, chromePressClass(reduced) ].join(' ')}>` holding `<img src={artFor(TILE_ART[target])} alt="" draggable={false} className="size-16 shrink-0 object-contain" />` and `<span className="font-v7-display text-v7-title leading-none">{label}</span>`, so the name is exactly the label.
    - `TILE_ART: Readonly<Record<HowToPlayContinueTarget, CardId | KitId>> = { solo: 'scientific', online: 'assassin', tutorial: 'basic-attack' }` (designer question 1).
  - **`screens/home/home-screen.tsx`**: drop the `design/components/button` and `HomeArt` imports. Add a module-private `HOME_MODE_MOTION: V7MotionSpec = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: durationS('base'), ease: EASE_ENTRANCE } }` and `const reduced = usePrefersReducedMotion();`. The tree, every handler and state unchanged:

```tsx
<main className="v7-ground relative h-full overflow-y-auto overscroll-contain font-v7-body text-v7-text">
  <div data-home-corner className="flex items-center justify-end gap-2 px-4 pt-4 sm:px-6">
    <BetaCard />
    <WhatsNewControl
      unread={whatsNewUnread}
      disabled={soloLaunchPending}
      onOpen={() => { setWhatsNewScope('history'); setWhatsNewOpen(true); }}
    />
  </div>
  <section className="mx-auto w-full max-w-3xl px-4 pb-10 pt-2 sm:px-6">
    <motion.div key={mode} data-home-mode={mode} data-motion={motionAttribute(reduced)} {...motionPropsFor(HOME_MODE_MOTION, reduced)}>
      {/* the four mode branches, unchanged */}
    </motion.div>
  </section>
  {/* HowToPlayDialog, WhatsNewDialog, FeedbackDialog, KitPickerSheet, unchanged */}
</main>
```

  - Every class above is a token utility or comes from `chrome-classes.ts`; no inline `var()` style, no emoji, no `100dvh`.
  - After the edit: `grep -nE "from '[^']*(design/|bots/)" apps/client/src/screens/home/{home-screen,home-hub,home-art,path-header,home-status,whats-new-control}.tsx` prints nothing.

- [ ] **Step 4: Run them and see them pass.**
  - Command: `pnpm vitest run apps/client/src/screens/home apps/client/src/screens/whats-new-dialog.test.ts packages/shared/src/release-notes.test.ts apps/client/src/App.lobby.test.tsx apps/client/src/screens/lobby`.
  - Expected: `home-screen.test.tsx` 45 passed; `whats-new-dialog.test.ts` 2; `release-notes.test.ts` unchanged count; every other file unchanged.

- [ ] **Step 5: Docs.**
  - `docs/agent/decisions.md`, append at the end:

```md
## YYYY-MM-DD · [P] V7 Home New control: the V2 style checks retire, and New locks during a solo launch (L76-04)

Spec v7 §5.1 replaces the V2/V6 `--cta-*` colors with the V7 tokens, and §7.1 keeps New as a small top-right control with an unread dot beside Beta. L76-04 rebuilds the hub on the V7 ground, so two source-text `it()`s of `screens/whats-new-dialog.test.ts` that pinned the V2 look retire (spec v7 §12.1, old-layout detail):

- "wires a green New control, red unread badge, and auto-open when unseen": `variant="green"` within 400 characters of `data-whats-new-button`, `bg-cta-red`, no `bg-cta-green`;
- "keeps What’s new as a small top-right control, not a hub action-row block": `data-whats-new-button` within 400 characters of `absolute`.

Their product meaning stays rendered in `screens/home/home-screen.test.tsx`: the unread name and dot ('auto-opens only the latest entry when it is unseen, under an unread New', 'a %s dismissal marks the latest entry seen and clears the unread label and dot') and the placement ('keeps New beside the Beta badge, outside the hub buttons', now in the top-right row on every path).

This supersedes "The New button is never disabled, even while connecting or launching" (parity `home-whats-new`): per spec v7 §11 and §13 Q8, New is disabled while a solo game launches and keeps its "What's new (unread)" name. An online create or join leaves it live; Q8 names only the solo launch.

---
```

  - `docs/agent/frontend.md`:
    - Append to `## Home and lobby (V7 · Lot 76)`, after the L76-16 bullets:

```
- `screens/home/home-screen.tsx`, `home-hub.tsx`, `home-art.tsx`, `whats-new-control.tsx`, `path-header.tsx`,
  `home-status.tsx` (L76-04, spec v7 §5.1–§5.3, §7.1, §11 Q7/Q8; decisions.md YYYY-MM-DD): the V7 hub and
  path chrome. `main` is `.v7-ground` and stays the scroll container (`relative h-full overflow-y-auto
  overscroll-contain`, no `100dvh`). A top-right row (`data-home-corner`, every mode) holds `BetaCard`
  (the word Beta) and `WhatsNewControl` (a quiet "New" named "What's new" or "What's new (unread)", with a
  decorative `--cta` dot); New is disabled only while a solo game launches (Q8) and keeps its name. The
  mode root (`data-home-mode`, `data-motion`) fades and rises through `motionPropsFor`, a fade only under
  reduced motion. The hub, in DOM order: `HomeArt`, a fan of five base holo `Card`s (`data-home-card-fan`,
  `aria-hidden`; each floats through `motionPropsFor` and holds still under reduced motion); the "Card
  Battle" `<h1>` shown uppercase with an ink outline and hard shadow; the 'Turn-based card battle'
  tagline; `HomeStatus`; the tiles in §7.1 order (Play solo, Play online, Tutorial; `data-home-tile`,
  extracted art from `artFor`, chrome from `chrome-classes`); How to play (secondary, `help`) and Feedback
  (quiet, `feedback`); the helper line. Every hub control is disabled while busy. `PathHeader`: quiet
  Back (`chevron-left`) and Feedback, the 'Card Battle' eyebrow, the path `<h1>`, the subtitle,
  `HomeStatus`. `HomeStatus`: the `homeStatusCopy` line (none when idle) and the error as an inline
  `role="alert"` line on `--panel-2` with a `--danger` inset ring, under the title, not dismissible
  (§7.7). These files import nothing from `design/` or `bots/`; the Online, Tutorial and Solo bodies do
  until L76-08 and L76-11. What's new item 9 is the Home item.
```

    - Superseded lines (the rest of each paragraph stays). V2 Home paragraph, before → after:

```
- **Home (L11-01 / L17-01 + hub rework / L51-03):** branded hub first — title,
  decorative V1 kit/card art. Two mode paths (not stacked forms): **Play online**
```
```
- **Home (L11-01 / L17-01 + hub rework / L51-03):** branded hub first — the V7 wordmark
  over a fan of holo cards since L76-04 (Home and lobby, V7 · Lot 76). Two mode paths (not stacked forms): **Play online**
```

    - V2 What's new paragraph, before → after:

```
  Compact **New** is the shared `Button` `variant="green"` (`bg-cta-green-deep`,
  same as Play online) with a **red** unread tick when
```
```
  Compact **New** is a quiet V7 `Button` beside **Beta** (L76-04), disabled while a
  solo game launches (Q8), with a `--cta` unread dot when
```

    - In the What's new item list, after `Eighth item: Lobby item (L76-09, rewritten by L76-12): the lobby shows each seat in its player color, and everyone can open the table rules.` insert ` Ninth item: Home item (L76-04): Home has the new look, with a big tile for each way to play.`
  - `DESIGN.md`, Typography › Hierarchy (no token is added), before → after:

```
- **Display** (Lilita One 400, 32px, `--type-display`): wordmark and the biggest numerals.
```
```
- **Display** (Lilita One 400, 32px, `--type-display`): wordmark and the biggest numerals. The Home
  wordmark (L76-04) is Display uppercase, 48px from `sm`, with a 3px `--ink` outline (a 6px
  `-webkit-text-stroke` painted under the fill) and the `0 4px 0` ink hard shadow.
```
  - `docs/backlog_v7_test_classification.md`:
    - Row 236: `latestReleaseNote() has 0 additions and 8 items` → `latestReleaseNote() has 0 additions and 9 items`.
    - Row 238, end of the last cell: ` **Done (L76-04):** retired, decisions.md YYYY-MM-DD "V7 Home New control: the V2 style checks retire, and New locks during a solo launch".`
    - Row 239, end of the last cell: ` **L76-04:** the \`absolute\` regex retired with row 238's entry; the rendered test also finds New right after Beta in the top-right row (\`data-home-corner\`) on every path.`
  - `docs/backlog_v7.md`: the `| L76-04 |` row's last cell `To do` → `Done`; Progress `| 76 · Home and lobby | 18 | 10 |` → `| 76 · Home and lobby | 18 | 11 |`; Total: read the current value and add 1.

- [ ] **Step 6: Verify and commit.**
  - `pnpm verify` green (expected: test files unchanged, tests +5 net).
  - `git add apps/client/src/screens/home/home-screen.tsx apps/client/src/screens/home/home-hub.tsx apps/client/src/screens/home/home-art.tsx apps/client/src/screens/home/whats-new-control.tsx apps/client/src/screens/home/path-header.tsx apps/client/src/screens/home/home-status.tsx apps/client/src/screens/home/home-screen.test.tsx apps/client/src/screens/whats-new-dialog.test.ts packages/shared/src/release-notes.ts packages/shared/src/release-notes.test.ts docs/agent/decisions.md docs/agent/frontend.md DESIGN.md docs/backlog_v7.md docs/backlog_v7_test_classification.md`
  - Commit:

```
feat(home): restyle hub and path chrome (L76-04)

New is disabled while a solo game launches (spec v7 §11, Q8) and
stays live during an online connect. The V2 style-only What's new
checks retire (decisions.md).
```

**Acceptance map:**
- The tiles open their paths through the soft gate → existing 'opens How to play on the first path click while unseen, and enters nothing yet', 'a gated %s marks How to play seen and enters %s', 'enters a path directly once How to play is seen' (they click the tiles by name).
- Every hub control and the path Back / Feedback are disabled while busy → 'locks every hub button while connecting, shows Connecting…, and leaves New live', 'disables New during a solo launch, …' (hub buttons during a launch), 'disables Back and Feedback on the %s path while connecting or launching', existing 'locks the solo menu while the launch is pending'.
- New is disabled during a solo launch and keeps its unread label → 'disables New during a solo launch, keeps its unread name and dot, and frees it after (§11, Q8)'.
- The card fan is aria-hidden and does not move under reduced motion → 'keeps the card fan aria-hidden on the hub only, and still under reduced motion (§7.1, §8.3)'.
- No Inbox, Admin, protocol or Reset help control → existing 'never shows /admin, /inbox, …' and 'shows the V7 hub: …' (the exact button list of `main`).
- 360×740 and 1440×900 with no horizontal scroll, the hub scrolling inside `#root` → controller browser check, A.9 ruling 1 (plus the existing 'keeps main as the scroll container with no 100dvh …').
- `pnpm verify` green → Step 6.

**Decisions:**
- Tile order follows §7.1 (Solo, Online, Tutorial); V2 had Online first. The labels stay 'Play solo', 'Play online', 'Tutorial' (Review line, §10.6).
- New is disabled only for `soloLaunchPending`, not for `status === 'connecting'`: §11 and §13 Q8 name the solo launch only. The L76-01 connect test keeps "New live"; a new test covers the launch (contract issue 1).
- Beta and New move from absolute positions into one in-flow top-right row, so they never overlap the wordmark at 360 px. The placement test changes from "New's parent is `main`" to "New's parent is the corner row, a child of `main`", and now runs on every path.
- The fan shows on the hub only; the paths drop the V2 art. `HomeArt` keeps its A.2 name and is rendered by `HomeHub`.
- The float loops through `motion` (`repeat: Infinity`, mirrored `y`) rather than a new CSS keyframe in `ui/tokens.css`, so no `ui/` file changes; `reduceMotionSpec` makes it still.
- The eyebrow copy 'Turn-based card battle' sits under the wordmark as a tagline; the wordmark overlaps the fan.
- The unread dot is `--cta` with an ink ring (the IconButton count badge), not the V2 red; `--life` is reserved for lives (§5.1).
- The wordmark keeps the `<h1>` text 'Card Battle' and shows uppercase through CSS, so the accessible name and the L76-01 title tests are unchanged.
- Home errors stay a non-dismissible inline alert (§7.7 "retry in place"); only the lobby alert has OK (L76-14).
- No new or changed visible string besides the What's new item: Before 'Home was a plain menu.', After 'Home has the new look, with a big tile for each way to play.'

---

---

### Task L76-05: Rebuild What's new as a V7 sheet

**Files:**
- Modify: `apps/client/src/screens/whats-new-dialog.tsx`, rewritten in place (export, `WhatsNewDialogProps` and behavior unchanged; V7 `Dialog`, `ui/` card and kit art, the per-open latch).
- Create:
  - `apps/client/src/screens/use-once-per-open.ts`: `useOncePerOpen` (shared by the What's new and How to play dialogs).
  - `apps/client/src/test/sheet-gestures.ts`: `stubPhoneViewport`, `swipeSheetDown` (test-only).
- Test:
  - Create `apps/client/src/screens/whats-new-dialog.sheet.test.tsx` (9 tests, happy-dom): the rendered replacements of the dialog source assertions.
  - Rewrite `apps/client/src/screens/whats-new-dialog.test.ts` (2 tests, node): the catalog assertions only, no `node:fs`. It keeps its name, because later appends update its item-count pin (Part 2 header).
  - Modify `apps/client/src/screens/home/test-home.ts`: `closeHomeDialog` gains `'swipe'` and waits with `hidden: true`.
  - Modify `apps/client/src/screens/home/home-screen.test.tsx`: the What's new dismissal `it.each` gains `'swipe'`; a file-level `afterEach(() => { vi.unstubAllGlobals(); })`.
- Docs: `docs/agent/frontend.md`, `docs/agent/testing.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md` (rows 72, 198, 233–236).
- Existing tests that must stay green unchanged: the other `home-screen.test.tsx` tests (they query What's new by dialog name, `[data-whats-new-scope]`, `[data-release-id]`, the 'Latest' and 'Got it' texts, and close it through `closeHomeDialog`), `solo-path.kit-picker.test.tsx`, `solo-path.rules.test.tsx`, `App.lobby.test.tsx`, `packages/shared/src/release-notes.test.ts`, `ui/release-storage.test.ts`.

**Interfaces:**
- Consumes: `Dialog` (`ui/primitives/dialog`: `open`, `title`, `onClose`, `actions`, `width`, `dataAttributes`), `Button` (`ui/primitives/button`), `Card` (`ui/card/card`), `KitPortrait` (`ui/kit/kit-portrait`), `releaseNotesForScope`, `type ReleaseNoteAddition`, `type ReleaseNoteItem`, `type WhatsNewScope` (`@card-battle/shared`). Tests: `cardFaceLabel`, `cardDamageChip` (`ui/card/card-face`), `getCard`, `getKit`, `RELEASE_NOTES`, `latestReleaseNote`.
- Produces:

```ts
// screens/use-once-per-open.ts
/**
 * One dismissal per open for a shared dialog: plan A.9 ruling 5, the per-open epoch latch of
 * `screens/arena/top-bar.tsx`, re-implemented (never imported from `screens/arena/`). While a sheet
 * exits its handlers stay live, so a double tap or an Esc right after Got it would close it twice;
 * Home's gated How to play would then read the second close as a manual one (spec v7 §7.1). The ref
 * is read only in the returned callback (decisions.md 2026-10-28). L76-05.
 */
export function useOncePerOpen(open: boolean): (action: () => void) => void;

// test/sheet-gestures.ts (shipped code never imports it)
/** A 390×844 phone `visualViewport`: a `Dialog` is a bottom sheet with a swipe handle. Undo with `vi.unstubAllGlobals()`. */
export function stubPhoneViewport(): void;
/** Drags the sheet's handle 120 px down (the Sheet closes from 80 px). Throws when the sheet has no handle. */
export function swipeSheetDown(dialog: HTMLElement): void;

// screens/home/test-home.ts
export type HomeDialogClose = 'Skip' | 'Got it' | 'Cancel' | 'Escape' | 'backdrop' | 'swipe';

// screens/whats-new-dialog.tsx: export and props unchanged
export interface WhatsNewDialogProps { open: boolean; onClose: () => void; scope: WhatsNewScope; }
export function WhatsNewDialog({ open, onClose, scope }: WhatsNewDialogProps): ReactElement;
```

- Hooks kept: `data-whats-new-scope` (the `<ol>`), `data-release-id` (each entry `<li>`), `data-whats-new-section="new"` (the additions `<section>`). New: `data-home-sheet="whats-new"` (the panel), `data-whats-new-item` (each Before / After `<li>`), `data-whats-new-addition` (each addition `<li>`), `data-whats-new-latest` (the 'Latest' tag).

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/test/sheet-gestures.ts` (needed by the tests; create it now):

```ts
/**
 * Sheet gestures for V7 overlay tests (technical spec v7 §6.7, §7.7; plan header: never rely on the
 * default happy-dom window size). Shipped code never imports this file. L76-05.
 */
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

class PhoneVisualViewport extends EventTarget {
  readonly offsetTop = 0;
  readonly offsetLeft = 0;
  readonly width = 390;
  readonly height = 844;
}

export function stubPhoneViewport(): void {
  vi.stubGlobal('visualViewport', new PhoneVisualViewport());
}

export function swipeSheetDown(dialog: HTMLElement): void {
  const handle = dialog.querySelector<HTMLElement>('[data-zone="sheet-handle"]');
  if (handle === null) throw new Error('no swipe handle: call stubPhoneViewport() first');
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: 220 });
}
```

`apps/client/src/screens/whats-new-dialog.sheet.test.tsx` (9 tests):

```tsx
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
```

`apps/client/src/screens/whats-new-dialog.test.ts`, rewritten (2 tests; every catalog assertion of the two remaining `it`s kept verbatim, the source reads dropped):

```ts
/**
 * What's new catalog pins (technical spec v7 §10.4; L63-07, L65-05). Every append to the open
 * entry updates the item count here; the dialog is rendered in whats-new-dialog.sheet.test.tsx (L76-05).
 */
import { latestReleaseNote, RELEASE_NOTES, releaseNotesForScope } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

describe("What's new catalog (L63-07, L65-05)", () => {
  it('keeps lot-72-v7 as the current update and dates the full log newest first', () => {
    expect(latestReleaseNote().id).toBe('lot-72-v7');
    expect(releaseNotesForScope('current').map((note) => note.id)).toEqual(['lot-72-v7']);
    expect(releaseNotesForScope('history').map((note) => note.date)).toEqual([
      '2026-10-26',
      '2026-10-07',
      '2026-10-06',
      '2026-10-05',
      '2026-09-29',
      '2026-09-28',
      '2026-09-20',
    ]);
    expect(RELEASE_NOTES.map((note) => note.id)[0]).toBe(latestReleaseNote().id);
  });

  it('pins the item and addition counts of each entry', () => {
    expect(latestReleaseNote().additions).toHaveLength(0);
    expect(latestReleaseNote().items).toHaveLength(9);
    const lot72 = RELEASE_NOTES.find((note) => note.id === 'lot-72');
    expect(lot72?.items).toHaveLength(3);
    const lot71 = RELEASE_NOTES.find((note) => note.id === 'lot-71');
    expect(lot71?.items).toHaveLength(5);
    const lot69 = RELEASE_NOTES.find((note) => note.id === 'lot-69');
    expect(lot69?.items).toHaveLength(4);
    const lot63 = RELEASE_NOTES.find((note) => note.id === 'lot-63');
    expect(lot63?.items.map((item) => item.cardId)).toEqual(['sentence', 'imposition', 'super-absorber']);
    expect(lot63?.additions).toHaveLength(2);
  });
});
```

If Lot 75 appended to `lot-72-v7` first, keep the current count rather than 9 (Part 1 cross-task note).

`apps/client/src/screens/home/test-home.ts`:
- `HomeDialogClose` gains `'swipe'`; `closeHomeDialog` gets the branch `} else if (way === 'swipe') { swipeSheetDown(dialog); }` (import from `../../test/sheet-gestures`; the caller stubs the phone viewport).
- Its last line becomes `await waitFor(() => { expect(screen.queryByRole('dialog', { name, hidden: true })).toBeNull(); });` (Part 2 rule: an exiting V7 sheet is already `aria-hidden`, so the old form returned before the sheet left).
- The header gets one line: "'swipe' needs `stubPhoneViewport()` (L76-05)."

`apps/client/src/screens/home/home-screen.test.tsx` (45 after L76-04 → 46 tests): add `afterEach` to the `vitest` import, add `import { stubPhoneViewport } from '../../test/sheet-gestures';`, and a file-level `afterEach(() => { vi.unstubAllGlobals(); });`. In `describe("What's new …")` the dismissal `it.each` becomes:

```tsx
  it.each(['Got it', 'Escape', 'backdrop', 'swipe'] as const)(
    'a %s dismissal marks the latest entry seen and clears the unread label and dot', async (way) => {
      if (way === 'swipe') stubPhoneViewport(); // the handle exists only on a bottom sheet
      seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: false });
      // … body unchanged
    });
```

- [ ] **Step 2: Run them and see them fail.**
  - Command: `pnpm vitest run apps/client/src/screens/whats-new-dialog.sheet.test.tsx apps/client/src/screens/whats-new-dialog.test.ts apps/client/src/screens/home/home-screen.test.tsx`.
  - Expected: `whats-new-dialog.sheet.test.tsx` fails on the V2 dialog (no `data-home-sheet`, no `data-whats-new-item` / `data-whats-new-addition` rows, no swipe handle, two closes on a double Got it), and so does the Home `swipe` case. The catalog file and every other Home test pass already.

- [ ] **Step 3: Implement.**
  - **`screens/use-once-per-open.ts`**:
    - `const [wasOpen, setWasOpen] = useState(open); const [epoch, setEpoch] = useState(open ? 1 : 0);` then `if (open !== wasOpen) { setWasOpen(open); if (open) setEpoch(epoch + 1); }` ("adjust state while rendering", as `screens/lobby/kick-confirm-dialog.tsx`).
    - `const doneEpoch = useRef<number | null>(null);`
    - It returns `(action) => { if (doneEpoch.current === epoch) return; doneEpoch.current = epoch; action(); }`.
    - If the React Compiler lint rejects a ref read inside a returned closure, inline the same latch in each dialog instead and say so in the report.
  - **`screens/whats-new-dialog.tsx`** (doc comment: spec v7 §7.1, §7.7, §10.4, §5.4; L63-07, L65-05; "a V7 `Dialog`, so Esc closes only the top sheet (§6.7)"). It imports nothing from `design/`.
    - `const once = useOncePerOpen(open); const close = (): void => { once(onClose); };`
    - `<Dialog open={open} title="What's new" width="2xl" onClose={close} dataAttributes={{ 'data-home-sheet': 'whats-new' }} actions={<Button variant="primary" onClick={close}>Got it</Button>}>`.
    - Body: `<ol data-whats-new-scope={scope} className="flex list-none flex-col gap-6 p-0">` over `releaseNotesForScope(scope)` (catalog order; never sorted). Each `<li key={note.id} data-release-id={note.id}>` holds, in this DOM order (the date is the entry's first `<p>`):
      1. the date `<p className="font-v7-body text-v7-caption font-extrabold uppercase tracking-[0.14em] text-v7-text-2">`;
      2. `<h3 className="mt-1 font-v7-display text-v7-title leading-tight text-v7-text">{note.title}</h3>`;
      3. when `scope === 'history' && index === 0`, `<p data-whats-new-latest className={`mt-1 inline-flex bg-v7-cta px-2 font-v7-body text-v7-caption font-extrabold text-v7-text-on-cta ${CHROME_FLAT_SM_CLASS}`}>Latest</p>` (no tag in the current scope, as today);
      4. the items `<ul className="mt-3 flex list-none flex-col gap-3 p-0">`. Each `<li key={`${note.id}-${String(itemIndex)}`} data-whats-new-item className="flex items-start gap-3">` holds the art, then `<div className="min-w-0 space-y-1 font-v7-body text-v7-body text-v7-text"><p><span className="font-extrabold text-v7-text-2">Before. </span>{item.before}</p><p><span className="font-extrabold">After. </span>{item.after}</p></div>`;
      5. when `note.additions.length > 0`, `<section data-whats-new-section="new" className="mt-4"><h4 className="font-v7-display text-v7-body text-v7-text">New</h4><ul …>`. Each `<li key={additionKey(…)} data-whats-new-addition className="flex items-start gap-3">` holds the art, then `<p className="min-w-0 font-v7-body text-v7-body text-v7-text">{addition.body}</p>`.
    - Art, a module-private `ReleaseArt({ kitId, cardId, instanceId }: { readonly kitId: KitId | undefined; readonly cardId: CardId | undefined; readonly instanceId: string })` (required props that accept `undefined`, so `item.kitId` passes under `exactOptionalPropertyTypes`): a `kitId` → `<KitPortrait kitId={kitId} size="thumb" />` (alt = the kit name, §11). Otherwise a `cardId` → `<Card size="thumb" instance={{ instanceId, cardId, isUpgraded: false }} />` (base art, art-only thumb). Otherwise nothing. The kit wins when both are set, as today. Items pass `item.kitId`, `item.cardId` and `whats-new-${note.id}-${String(itemIndex)}`; additions pass `addition.kind === 'kit' ? addition.kitId : undefined`, `addition.kind === 'card' ? addition.cardId : undefined` and `additionKey(note.id, addition)`.
    - Keep `additionKey`; drop the old `AdditionArt`.
  - The Home wiring is unchanged: `closeWhatsNew` (mark seen, clear the dot, close) is the `onClose` of every path.

- [ ] **Step 4: Run them and see them pass.**
  - Command: `pnpm vitest run apps/client/src/screens/whats-new-dialog.sheet.test.tsx apps/client/src/screens/whats-new-dialog.test.ts apps/client/src/screens/home apps/client/src/App.lobby.test.tsx packages/shared/src/release-notes.test.ts`.
  - Expected: `whats-new-dialog.sheet.test.tsx` 9 passed, `whats-new-dialog.test.ts` 2, `home-screen.test.tsx` 46, every other file unchanged.

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, append to `## Home and lobby (V7 · Lot 76)` after the L76-04 bullet:

```
- `screens/whats-new-dialog.tsx`, `screens/use-once-per-open.ts` (L76-05, spec v7 §7.1, §7.7, §10.4;
  L63-07, L65-05): What's new is a V7 `Dialog` (a bottom sheet on phones, centered on desktop; width
  `2xl`; `data-home-sheet="whats-new"`) with unchanged props. The `current` scope (the auto popup)
  shows the latest entry alone; `history` (New) shows every entry in catalog order with 'Latest' under
  the first title. Each entry keeps its date eyebrow and title, its Before / After items
  (`data-whats-new-item`) with a `ui/card` `Card` thumb of the base art for a `cardId` or a `ui/kit`
  `KitPortrait` thumb for a `kitId`, and after them the New additions (`data-whats-new-section="new"`,
  `data-whats-new-addition`). Got it, Esc, the backdrop and a swipe-down each call `onClose` once:
  `useOncePerOpen(open)` latches every dismissal path per open (A.9 ruling 5), so Home's `closeWhatsNew`
  marks the latest id seen once. It imports nothing from `design/`. Tests: `whats-new-dialog.sheet.test.tsx`
  renders the real catalog (shipped entries never change, and lot-63 has items and additions);
  `whats-new-dialog.test.ts` keeps the catalog pins that every What's new append updates.
- `test/sheet-gestures.ts`, `screens/home/test-home.ts` (L76-05): `stubPhoneViewport()` and
  `swipeSheetDown(dialog)` for sheet tests; `closeHomeDialog` gains `'swipe'` and waits with
  `queryByRole('dialog', { name, hidden: true })` (an exiting sheet is already `aria-hidden`).
```

  - `docs/agent/testing.md`, a new section after `## Room connection fake (V7 · L76-14)`:

```md
## Sheet gestures (V7 · L76-05)

`apps/client/src/test/sheet-gestures.ts`: `stubPhoneViewport()` stubs a 390×844 `visualViewport`
(`vi.stubGlobal`; undo with `vi.unstubAllGlobals()` in `afterEach`), so a `Dialog` is a bottom sheet
with a swipe handle whatever the default window size. `swipeSheetDown(dialog)` drags that handle
120 px down (the Sheet closes from 80 px). Wait for a closed sheet with
`queryByRole('dialog', { name, hidden: true })` returning null: an exiting sheet is already
`aria-hidden`. Shipped code never imports it.
```

  - `docs/backlog_v7_test_classification.md` (end of each last cell):
    - Row 233: ` **Done (L76-05):** the whats-new-dialog.tsx part is replaced by \`screens/whats-new-dialog.sheet.test.tsx\` › 'renders the latest entry alone in the current scope, with no Latest tag' and 'renders every entry in catalog order in the history scope, Latest under the first title only' ('Latest' shows in the history scope only, as in V6).`
    - Row 234: ` **Done (L76-05):** kept unchanged as a pure catalog test, \`screens/whats-new-dialog.test.ts\` › 'keeps lot-72-v7 as the current update and dates the full log newest first'.`
    - Row 235: ` **Done (L76-05):** replaced by \`screens/whats-new-dialog.sheet.test.tsx\` › "renders each entry's Before and After items with the card or kit art they name" and 'lists additions under New after the items, with their art, and no New section without additions' (on the real catalog: lot-63 has both).`
    - Row 236: ` **Done (L76-05):** pure catalog test \`screens/whats-new-dialog.test.ts\` › 'pins the item and addition counts of each entry'.`
    - Rows 72 and 198: ` **L76-05:** \`screens/whats-new-dialog.tsx\` now renders the \`ui/card\` Card and the \`ui/kit\` KitPortrait, so What's new no longer imports the old card; its remaining importers are the classic table's (L75).`
  - `docs/backlog_v7.md`: the `| L76-05 |` row → `Done`; Progress `| 76 · Home and lobby | 18 | 11 |` → `| 76 · Home and lobby | 18 | 12 |`; Total + 1 (read it first).
  - No What's new item: the Home item 9 already covers the Home look (Part 2 header).

- [ ] **Step 6: Verify and commit.**
  - `pnpm verify` green (expected: test files +1, tests +10).
  - `git add apps/client/src/screens/whats-new-dialog.tsx apps/client/src/screens/whats-new-dialog.sheet.test.tsx apps/client/src/screens/whats-new-dialog.test.ts apps/client/src/screens/use-once-per-open.ts apps/client/src/test/sheet-gestures.ts apps/client/src/screens/home/test-home.ts apps/client/src/screens/home/home-screen.test.tsx docs/agent/frontend.md docs/agent/testing.md docs/backlog_v7.md docs/backlog_v7_test_classification.md`
  - Commit: `feat(home): What's new as a V7 sheet (L76-05)` (no body).

**Acceptance map:**
- The current scope renders one entry → 'renders the latest entry alone in the current scope, with no Latest tag'.
- The history scope renders every entry in catalog order with 'Latest' on the first → 'renders every entry in catalog order in the history scope, Latest under the first title only'.
- Items render above additions → 'lists additions under New after the items, with their art, and no New section without additions'.
- Card or kit art is present when `cardId` / `kitId` is set → "renders each entry's Before and After items with the card or kit art they name" and the additions test.
- Every dismissal path calls the seen marker exactly once → 'a %s dismissal calls onClose once and closes the sheet (L65-05)' (Got it, Escape, backdrop, swipe), 'calls onClose once per open: …', and the Home 'a %s dismissal marks the latest entry seen and clears the unread label and dot' (now with swipe).
- `pnpm verify` green → Step 6.

**Decisions:**
- `Dialog` (placement auto) rather than a bottom-only `Sheet`: §7.7 puts shared dialogs centered on desktop. Width `2xl`, as V6.
- The current scope shows no 'Latest' tag (V6 behavior and the brief); classification row 233's wording suggested one (contract issue 3).
- One latch per open on every dismissal path (`useOncePerOpen`). It costs nothing on Home, where `closeWhatsNew` is idempotent, and How to play needs it (L76-06).
- The rendered tests use the real catalog, not a mocked note: shipped entries never change, and lot-63 carries items with art plus additions.
- The rendered tests live in a new `whats-new-dialog.sheet.test.tsx` beside the catalog `whats-new-dialog.test.ts`, which keeps its name for the later item-count pins.
- `closeHomeDialog` now waits with `hidden: true` (stricter, never weaker) and gains `'swipe'`.
- No new or changed visible string ('Got it', 'Latest', 'New', 'Before.', 'After.' are kept).

---

---

### Task L76-06: Turn How to play into a swipeable card carousel

**Designer answer (2026-11-03): icons AND card renders (binding; overrides this task's "no card renders" text, its decisions entry and its designer question 4).** Four slides also show static card renders from `ui/card` `Card` (base art only, never `getCardArtUrl`), `aria-hidden` inside the slide (the slide text already names them), in a `data-how-to-play-renders` row under the body, sized with `[--card-w:…]` on each card (Card size contract), at most 2 per slide so the slide never scrolls sideways at 360 px:
- `cards`: `basic-attack` and `shield` (an attack and an action card), `size="hand"`;
- `upgrade`: `basic-attack` base and the same card `isUpgraded` (the holo sheen and "+" badge show what Upgrade does), `size="hand"`;
- `kits`: one `KitPortrait kitId="random" size="tile"` (the Random choice) — no real kit, so no kit is suggested;
- `specials`: `block`, `size="hand"`.
Every other slide stays text + icons. Tests (add to `screens/how-to-play-dialog.test.tsx`, +2): `it('renders the card art row on the Cards, Upgrade, Kits and Special cards slides only, hidden from assistive tech')` (the four slides each hold one `[data-how-to-play-renders]` with `aria-hidden="true"` and the expected `data-card-id`s / `data-kit-face="random"`; the five others have none) and `it('shows the upgraded Basic Attack beside the base one on the Upgrade slide')` (one render carries the upgraded state: check the Card's upgraded marker the `ui/card` tests use). Instance ids are synthetic (`how-to-play:<cardId>[:upgraded]`). Replace the decisions.md entry title and text with: `## YYYY-MM-DD · [P] How to play is a card carousel with icons and card renders (L76-06)` — "Spec v7 §7.1 asks for resource icons inline; §13 row 12 says icons and card renders; the designer chose both (2026-11-03): four slides (Cards, Upgrade, Kits, Special cards) add aria-hidden base-art renders. This supersedes the parity row `home-how-to-play-dialog` (a V2 Dialog with PNG glyph rows). `screens/how-to-play-dialog.tsx` keeps its export and `onClose(reason)` contract, so the arena TopBar and the classic table mount the V7 sheet unedited; on the classic table '?' it is now a V7 sheet in the sheet stack (Esc closes only it)." Add `ui/card` and `ui/kit` imports to the Interfaces; adjust the test counts (+2).


**Files:**
- Modify: `apps/client/src/screens/how-to-play-dialog.tsx`, rewritten in place (export, `HowToPlayDialogProps`, `HowToPlayCloseReason` and the reasons unchanged; V7 `Dialog` + `Carousel`).
- Test:
  - Create `apps/client/src/screens/how-to-play-dialog.test.tsx` (13 tests, happy-dom).
  - Modify `apps/client/src/screens/home/home-screen.test.tsx` (46 → 53): Part 2 Review Focus 1 on Home.
  - Modify `apps/client/src/test/sheet-gestures.ts`: `swipeCarouselTo`.
- Modify: `packages/shared/src/release-notes.ts` + `packages/shared/src/release-notes.test.ts` (item 9 rewritten in place), `docs/agent/frontend.md`, `docs/agent/testing.md`, `docs/backlog_v7.md`.
- Existing tests that must stay green unchanged:
  - `screens/arena/top-bar.test.tsx` ('marks How to play seen from the menu: $way → $seen'). How it stays green:
    - The Menu entry calls `onClose()` then `onHowToPlay()`, so the Menu sheet leaves the stack in the commit that opens How to play.
    - The rewrite is a `Dialog` titled 'How to play', so `getByRole('dialog', { name: 'How to play' })` finds it; the exiting Menu is `aria-hidden`.
    - Its actions are buttons named 'Skip' and 'Got it', reporting 'skip' / 'got-it' (TopBar marks seen).
    - Esc reaches it as the only and top sheet and reports 'dismiss', so seen stays null.
    - The test's wait `queryByRole('dialog', { name: 'How to play' })` returns null as soon as the sheet exits (`aria-hidden`).
    - Both placements (today's 1024×768 desktop default, or Lot 75's 390×844) carry the same buttons and Esc handling.
  - `screens/arena/log-sheet.test.tsx`, `screens/arena/rules-recall.test.tsx` (they only list the Menu's buttons) and `App.arena.test.tsx` (it never opens How to play).
  - The classic table: `screens/table.tsx` mounts the dialog with the same props; no test opens it (`screens/table/table-chrome.test.ts` and `economy-bar.chrome-labels.test.ts` read `economy-bar.tsx`, never this file).
  - `screens/how-to-play-content.test.ts` (the copy and the real screenshot lookup) and `screens/home/home-gate.test.ts` (it imports the type `HowToPlayCloseReason`).
  - The L76-01 gate tests in `home-screen.test.tsx` ('opens How to play on the first path click …', 'a gated %s …', 'a manual %s close …', the What's new re-checks, the Tutorial gate): they close through `closeHomeDialog` by dialog and button names and the sheet backdrop.

**Interfaces:**
- Consumes: `Dialog`, `Button`, `Carousel`, `type CarouselSlide` (`ui/primitives/carousel`), `CHROME_OUTLINE_CLASS` (`ui/primitives/chrome-classes`), `Icon`, `type IconName` (`ui/icons`), `HOW_TO_PLAY_SECTIONS`, `type HowToPlaySection`, `type HowToPlaySectionId` (`./how-to-play-content`), `howToPlayScreenshotUrl` (`./how-to-play-screenshots`), `useOncePerOpen` (`./use-once-per-open`, L76-05). Tests: `stubPhoneViewport`, `swipeSheetDown` (L76-05), `HOW_TO_PLAY_SECTIONS`.
- Produces:

```ts
// screens/how-to-play-dialog.tsx: unchanged contract (Home, screens/arena/top-bar.tsx, screens/table.tsx)
export type HowToPlayCloseReason = 'skip' | 'got-it' | 'dismiss';
export interface HowToPlayDialogProps { open: boolean; onClose: (reason: HowToPlayCloseReason) => void; }
export function HowToPlayDialog({ open, onClose }: HowToPlayDialogProps): ReactElement;

// test/sheet-gestures.ts (added)
/** Scrolls the dialog's Carousel track to `index` as a swipe would: a 300 px track, then `scroll`. */
export function swipeCarouselTo(dialog: HTMLElement, index: number): void;
```

- Hooks: each slide group carries `data-how-to-play-section={section.id}` (kept from V6); the icon row is `<ul data-how-to-play-icons>`.

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/test/sheet-gestures.ts`, append (header: "L76-06 adds `swipeCarouselTo`"):

```ts
export function swipeCarouselTo(dialog: HTMLElement, index: number): void {
  const track = dialog.querySelector<HTMLElement>('[data-carousel-track]');
  if (track === null) throw new Error('no carousel track');
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 });
  // writable: a later chevron press may scroll the track itself.
  Object.defineProperty(track, 'scrollLeft', { configurable: true, writable: true, value: index * 300 });
  fireEvent.scroll(track);
}
```

`apps/client/src/screens/how-to-play-dialog.test.tsx` (13 tests):

```tsx
// @vitest-environment happy-dom
/**
 * How to play as a V7 card carousel: technical spec v7 §7.1, §5.6, §8.3, §6.7; Appendix A
 * `home-how-to-play-dialog`, `home-how-to-play-dismiss`, `global-dialog-interaction-contract`; v6 §5.1
 * (L51-02) and the L76-03 Kits copy (L76-06).
 */
import { screen, waitFor, within } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../test/render';
import { stubPhoneViewport, swipeCarouselTo, swipeSheetDown } from '../test/sheet-gestures';
import { HOW_TO_PLAY_SECTIONS } from './how-to-play-content';
import { HowToPlayDialog, type HowToPlayCloseReason } from './how-to-play-dialog';

/** Designer PNGs a test pretends exist; the real lookup finds none (how-to-play-content.test.ts). */
const shots = vi.hoisted(() => ({ files: new Set<string>() }));
vi.mock('./how-to-play-screenshots', () => ({
  howToPlayScreenshotUrl: (fileName: string): string | null => (shots.files.has(fileName) ? `/how-to-play/${fileName}` : null),
}));

const TITLE = 'How to play';
const sheet = (): HTMLElement => screen.getByRole('dialog', { name: TITLE });
const cards = (): HTMLElement[] => within(sheet()).getAllByRole('group');
const status = (): string | null => within(sheet()).getByRole('status').textContent;
const button = (name: string): HTMLElement => within(sheet()).getByRole('button', { name });
function renderOpen(options: { reducedMotion?: boolean } = { reducedMotion: true }) {
  const onClose = vi.fn<(reason: HowToPlayCloseReason) => void>();
  return { onClose, ...renderUi(<HowToPlayDialog open onClose={onClose} />, options) };
}
/** The callers' wiring: every onClose closes the sheet. */
function Harness({ onClose }: { readonly onClose: (reason: HowToPlayCloseReason) => void }): ReactElement {
  const [open, setOpen] = useState(true);
  return <HowToPlayDialog open={open} onClose={(reason) => { onClose(reason); setOpen(false); }} />;
}

beforeEach(() => { shots.files.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('How to play cards (spec v7 §7.1)', () => {
  it('shows one card per section in order, the copy verbatim, under the primer line', () => {
    renderOpen();
    expect(within(sheet()).getByText('This is a short primer — not the full rules.')).toBeTruthy();
    expect(cards().map((card) => [card.getAttribute('aria-label'), card.getAttribute('data-how-to-play-section')]))
      .toEqual(HOW_TO_PLAY_SECTIONS.map((section) => [section.title, section.id]));
    expect(cards().map((card) => within(card).getByRole('heading', { level: 3 }).textContent))
      .toEqual(HOW_TO_PLAY_SECTIONS.map((section) => section.title));
    expect(HOW_TO_PLAY_SECTIONS.map((section, index) => cards()[index]?.contains(within(sheet()).getByText(section.body))))
      .toEqual(HOW_TO_PLAY_SECTIONS.map(() => true));
    expect(status()).toBe('How to play, 1 of 9');
  });

  it('puts the resource icons on the Lives, Points and Upgrade cards only', () => {
    renderOpen();
    const iconsOf = (card: HTMLElement) =>
      Array.from(card.querySelectorAll('[data-how-to-play-icons] li'), (li) => [li.querySelector('[data-icon]')?.getAttribute('data-icon'), li.textContent]);
    expect(Object.fromEntries(cards().map((card) => [card.getAttribute('data-how-to-play-section') ?? '', iconsOf(card)]))).toEqual({
      goal: [], turn: [], lives: [['life', 'Lives'], ['shield', 'Shield']], points: [['point', 'Points']],
      cards: [], upgrade: [['upgrade', 'Upgrade points']], kits: [], specials: [], shop: [],
    });
  });

  it('renders no screenshot img while the designer files are absent', () => {
    renderOpen();
    expect(sheet().querySelectorAll('img')).toHaveLength(0);
  });

  it('renders a screenshot only on the card whose file exists, as decoration', () => {
    shots.files.add('shop.png');
    renderOpen();
    expect(Array.from(sheet().querySelectorAll('img'), (img) => [
      img.closest('[data-how-to-play-section]')?.getAttribute('data-how-to-play-section'), img.getAttribute('src'), img.getAttribute('alt'),
    ])).toEqual([['shop', '/how-to-play/shop.png', '']]);
  });
});

describe('How to play paging (spec v7 §7.1, §8.3)', () => {
  it('pages by the chevrons, the keyboard and a swipe, announces the position, and never closes', async () => {
    const { user, onClose } = renderOpen();
    await user.click(button('Next'));
    expect(status()).toBe('How to play, 2 of 9');
    button('Next').focus();
    await user.keyboard('{Enter}');
    expect(status()).toBe('How to play, 3 of 9');
    await user.click(button('Previous'));
    expect(status()).toBe('How to play, 2 of 9');
    swipeCarouselTo(sheet(), 8);
    expect(status()).toBe('How to play, 9 of 9');
    await user.click(button('Next')); // the end stop pages nowhere and closes nothing
    expect(status()).toBe('How to play, 9 of 9');
    expect(onClose).not.toHaveBeenCalled();
    expect(sheet()).toBeTruthy();
  });

  it.each([
    [true, 'reduced', 'auto', false],
    [false, 'full', 'smooth', true],
  ] as const)('with reduced motion %s the track is %s and pages with an %s scroll', async (reducedMotion, motion, behavior, smooth) => {
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(() => undefined);
    try {
      const { user } = renderOpen({ reducedMotion });
      const track = sheet().querySelector<HTMLElement>('[data-carousel-track]');
      if (track === null) throw new Error('no carousel track');
      expect([track.getAttribute('data-motion'), track.classList.contains('scroll-smooth'), sheet().getAttribute('data-motion')])
        .toEqual([motion, smooth, motion]);
      await user.click(button('Next'));
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior }));
    } finally {
      scrollTo.mockRestore();
    }
  });
});

describe('How to play closing (spec v7 §7.1, §7.7, §6.7)', () => {
  it.each([
    ['Skip', 'skip'], ['Got it', 'got-it'], ['Escape', 'dismiss'], ['backdrop', 'dismiss'], ['swipe', 'dismiss'],
  ] as const)('%s reports %s once and closes the sheet', async (way, reason) => {
    stubPhoneViewport(); // a bottom sheet with its swipe handle, whatever the default window
    const onClose = vi.fn<(reason: HowToPlayCloseReason) => void>();
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
    expect(onClose.mock.calls).toEqual([[reason]]);
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: TITLE, hidden: true })).toBeNull(); });
  });

  it('calls onClose once per open: a double Skip and a later Esc count once until it reopens', async () => {
    const { user, rerender, onClose } = renderOpen();
    await user.dblClick(button('Skip'));
    await user.keyboard('{Escape}');
    expect(onClose.mock.calls).toEqual([['skip']]);
    rerender(<HowToPlayDialog open={false} onClose={onClose} />);
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: TITLE, hidden: true })).toBeNull(); });
    rerender(<HowToPlayDialog open onClose={onClose} />);
    expect(status()).toBe('How to play, 1 of 9'); // a reopened carousel starts on the first card
    await user.click(button('Got it'));
    expect(onClose.mock.calls).toEqual([['skip'], ['got-it']]);
  });
});
```

`apps/client/src/screens/home/home-screen.test.tsx` (46 → 53 tests). Add `swipeCarouselTo` to the existing `../../test/sheet-gestures` import. Append a `describe` (Part 2 Review Focus 1):

```tsx
describe('How to play carousel on Home (spec v7 §7.1; Part 2 Review Focus 1, L76-06)', () => {
  beforeEach(() => { stubPhoneViewport(); }); // the swipe-down handle exists only on a bottom sheet

  it.each(['Skip', 'Got it', 'Escape', 'backdrop', 'swipe'] as const)(
    "a gated %s after paging marks seen and enters Play solo once, with no What's new re-check", async (way) => {
      seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
      const { user, props } = renderHome();
      localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY); // a second, manual-looking close would open What's new
      await user.click(screen.getByRole('button', { name: 'Play solo' }));
      const dialog = screen.getByRole('dialog', { name: 'How to play' });
      await user.click(within(dialog).getByRole('button', { name: 'Next' }));
      await user.click(within(dialog).getByRole('button', { name: 'Next' }));
      swipeCarouselTo(dialog, 5);
      expect(within(dialog).getByRole('status').textContent).toBe('How to play, 6 of 9');
      expect([title(), localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)]).toEqual(['Card Battle', null]); // paging closes nothing
      await closeHomeDialog(user, 'How to play', way);
      expect([title(), localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)]).toEqual(['Play solo', '1']);
      expect(whatsNew()).toBeNull();
      expectNoHomeIntent(props);
    });

  it("a double click on the gated Skip enters Play online once and opens no What's new", async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome();
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY);
    await user.click(screen.getByRole('button', { name: 'Play online' }));
    await user.dblClick(within(screen.getByRole('dialog', { name: 'How to play' })).getByRole('button', { name: 'Skip' }));
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'How to play', hidden: true })).toBeNull(); });
    expect([title(), localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)]).toEqual(['Play online', '1']);
    expect(whatsNew()).toBeNull();
    expectNoHomeIntent(props);
  });

  it("a manual swipe-down closes without marking seen and re-checks What's new", async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const { user, props } = renderHome();
    localStorage.removeItem(LAST_SEEN_RELEASE_ID_KEY);
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    await closeHomeDialog(user, 'How to play', 'swipe');
    expect([title(), localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)]).toEqual(['Card Battle', null]);
    expect(scopeOf(whatsNew())).toBe('current');
    expectNoHomeIntent(props);
  });
});
```

`packages/shared/src/release-notes.test.ts`: in the `lot-72-v7` `toEqual`, the last item becomes:

```ts
      {
        before: 'Home was a plain menu, and How to play was one long page.',
        after: 'Home has the new look, and How to play is a deck of cards you swipe through.',
      },
```

- [ ] **Step 2: Run them and see them fail.**
  - Command: `pnpm vitest run apps/client/src/screens/how-to-play-dialog.test.tsx apps/client/src/screens/home/home-screen.test.tsx packages/shared/src/release-notes.test.ts`.
  - Expected: `how-to-play-dialog.test.tsx` fails on the V2 dialog (no slide groups, no status line, no chevrons, no swipe handle, two closes on a double Skip). The Review Focus 1 tests fail at 'Next', and the double-click test fails because What's new opens (the second Skip reads as a manual close). The release-notes `toEqual` fails too. The L76-01 gate tests still pass.

- [ ] **Step 3: Implement.**
  - **`packages/shared/src/release-notes.ts`**: rewrite `lot-72-v7` item 9 in place to the Step 1 text (the count stays 9).
  - **`screens/how-to-play-dialog.tsx`** (doc comment: spec v7 §7.1 (a swipeable card carousel, copy verbatim, resource icons inline; gated vs manual dismissal belongs to the caller), §5.6, §8.3, §6.7; v6 §5.1 / L51-02; Appendix A `home-how-to-play-dialog`; "Screenshot `<img>` only when the designer file exists"). It imports nothing from `design/`, and no longer the PNG resource icons of `ui/asset-lookup`.
    - Module-private: `PRIMER_LINE = 'This is a short primer — not the full rules.'`, `PREVIOUS_LABEL = 'Previous'`, `NEXT_LABEL = 'Next'` (the admin pager's words), and `SECTION_ICONS: Partial<Record<HowToPlaySectionId, readonly { readonly icon: IconName; readonly caption: string }[]>>` = `lives`: `life` 'Lives', `shield` 'Shield'; `points`: `point` 'Points'; `upgrade`: `upgrade` 'Upgrade points' (the V6 glyph rows on the V7 icons).
    - `const once = useOncePerOpen(open); const close = (reason: HowToPlayCloseReason): void => { once(() => { onClose(reason); }); };`
    - `<Dialog open={open} title="How to play" width="xl" onClose={() => { close('dismiss'); }} actions={<><Button variant="quiet" onClick={() => { close('skip'); }}>Skip</Button><Button variant="primary" onClick={() => { close('got-it'); }}>Got it</Button></>}>`.
    - Body: `<p className="font-v7-body text-v7-body text-v7-text-2">{PRIMER_LINE}</p>` then `<div className="mt-3"><Carousel label="How to play" slides={slides} previousLabel={PREVIOUS_LABEL} nextLabel={NEXT_LABEL} /></div>`. No `gridAtDesktop`: §7.1 pages on every viewport, and the carousel never depends on the window size.
    - Build `slides` during render, not at module load, so the screenshot lookup runs per render: `HOW_TO_PLAY_SECTIONS.map((section): CarouselSlide => ({ id: section.id, label: section.title, dataAttributes: { 'data-how-to-play-section': section.id }, content: <HowToPlayCard section={section} /> }))`. The order comes from the content; never sort.
    - Module-private `HowToPlayCard({ section })`: `<div className={`h-full bg-v7-panel-2 p-4 ${CHROME_OUTLINE_CLASS} rounded-v7-chrome`}>` with no drop shadow (the track clips vertical overflow). Inside, in order:
      1. `<h3 className="font-v7-display text-v7-title leading-tight text-v7-text">{section.title}</h3>`;
      2. when `SECTION_ICONS[section.id]` exists, `<ul data-how-to-play-icons className="mt-2 flex list-none flex-wrap gap-3 p-0">`, each `<li className="inline-flex items-center gap-1.5 font-v7-body text-v7-body font-bold text-v7-text"><Icon name={icon} size={20} /><span>{caption}</span></li>`;
      3. `<p className="mt-2 font-v7-body text-v7-body leading-relaxed text-v7-text">{section.body}</p>`;
      4. when `section.screenshotFile !== null` and `howToPlayScreenshotUrl(section.screenshotFile)` is not null, `<img src={url} alt="" draggable={false} className={`mt-3 w-full rounded-v7-chrome-sm object-cover ${CHROME_OUTLINE_CLASS}`} />`.
    - Reduced motion: the Carousel pages instantly with no `scroll-smooth`, and the Sheet fades only; nothing else here animates.
    - The dialog never touches storage and sends no intent: the caller marks seen (Home through `howToPlayCloseOutcome`; the arena and the table on 'skip' / 'got-it').
  - The Home, arena and table callers are unchanged.

- [ ] **Step 4: Run them and see them pass.**
  - Command: `pnpm vitest run apps/client/src/screens/how-to-play-dialog.test.tsx apps/client/src/screens/how-to-play-content.test.ts apps/client/src/screens/home apps/client/src/screens/arena/top-bar.test.tsx apps/client/src/screens/arena/log-sheet.test.tsx apps/client/src/screens/arena/rules-recall.test.tsx apps/client/src/App.arena.test.tsx packages/shared/src/release-notes.test.ts`.
  - Expected: `how-to-play-dialog.test.tsx` 13 passed, `home-screen.test.tsx` 53, every other file unchanged (the arena files unedited).

- [ ] **Step 5: Docs.**
  - **Controller additions (critic M3, M4):**
    - `docs/agent/frontend.md` › `## Arena (V7, ?ui=next)`: in the "**Outside the stack until L75 / L76:**" bullet remove `HowToPlayDialog` (it now names only the V2 `FeedbackDialog`, until L76-07), and add "the TopBar's How to play sheet (V7 since L76-06)" to the **Owner-local** sheets bullet.
    - `docs/agent/decisions.md`, append at the end (and add the file to `git add`):

```md
## YYYY-MM-DD · [P] How to play is a card carousel with icons, no card renders (L76-06)

Spec v7 §7.1 asks for one card per How to play section with "resource icons inline"; §13 row 12 says "How to play uses icons and card renders". L76-06 ships icons only, no card renders on the slides (Lot 76 plan Appendix B, designer question; the default ships until the designer answers). This supersedes the parity row `home-how-to-play-dialog` (a V2 Dialog with PNG glyph rows). `screens/how-to-play-dialog.tsx` keeps its export and `onClose(reason)` contract, so the arena TopBar and the classic table mount the V7 sheet unedited; on the classic table '?' it is now a V7 sheet in the sheet stack (Esc closes only it).

---
```
  - `docs/agent/frontend.md`:
    - Append to `## Home and lobby (V7 · Lot 76)` after the L76-05 bullets:

```
- `screens/how-to-play-dialog.tsx` (L76-06, spec v7 §7.1, §5.6, §8.3; Appendix A `home-how-to-play-dialog`,
  `home-how-to-play-dismiss`): How to play is a V7 `Dialog` (a bottom sheet on phones, centered on
  desktop, width `xl`) holding a `Carousel` labelled "How to play" on every viewport. There is one card
  per `HOW_TO_PLAY_SECTIONS` entry, in order (`data-how-to-play-section`, named by the section title),
  each with the title, the body verbatim and, on Lives, Points and Upgrade, the resource icons
  (`ui/icons` `life` Lives and `shield` Shield, `point` Points, `upgrade` Upgrade points;
  `data-how-to-play-icons`). The body stays plain text: `EffectTextWithIcons` would turn "0 lives",
  "1 upgrade point" and "1 life" into glyph amounts, so the copy would no longer read verbatim. A
  screenshot `<img>` renders only when `howToPlayScreenshotUrl` finds the designer PNG. The chevrons
  (Previous / Next, keyboard-operable) and a swipe on the track page it, the status line announces
  "How to play, n of 9", and paging never closes it. Reduced motion pages instantly and the sheet
  fades only. Skip → 'skip', Got it → 'got-it', Esc, backdrop and swipe-down → 'dismiss', each once
  per open (`useOncePerOpen`), so a gated close enters its path once and never reads as a manual
  close. Props and `HowToPlayCloseReason` are unchanged, so Home, the arena menu and the classic table
  '?' need no edit; on the table it is now a V7 sheet, so Esc closes only it (Q49). It never sends an
  intent and imports nothing from `design/`.
```

    - V2 How to play paragraph, before → after (the rest stays):

```
  **How to play** (L42 / L51-02): spec §5.1 sections in order (goal, turns, lives,
```
```
  **How to play** (L42 / L51-02; a V7 card carousel since L76-06): spec §5.1 sections in order (goal, turns, lives,
```

    - In the What's new item list, replace ` Ninth item: Home item (L76-04): Home has the new look, with a big tile for each way to play.` with ` Ninth item: Home item (L76-04, rewritten by L76-06): Home has the new look, and How to play is a deck of cards you swipe through.`
  - `docs/agent/testing.md`, append to `## Sheet gestures (V7 · L76-05)`: `` `swipeCarouselTo(dialog, index)` (L76-06) scrolls the dialog's `Carousel` track to a slide as a swipe would: it stubs the track's `clientWidth` (300) and a writable `scrollLeft`, then fires `scroll`. ``
  - `docs/backlog_v7.md`: the `| L76-06 |` row → `Done`; Progress `| 76 · Home and lobby | 18 | 12 |` → `| 76 · Home and lobby | 18 | 13 |`; Total + 1 (read it first).
  - Classification: no row names `how-to-play-dialog.tsx` (none to edit); row 236's count is unchanged (a rewrite, not an append).

- [ ] **Step 6: Verify and commit.**
  - `pnpm verify` green (expected: test files +1, tests +20).
  - `git add apps/client/src/screens/how-to-play-dialog.tsx apps/client/src/screens/how-to-play-dialog.test.tsx apps/client/src/screens/home/home-screen.test.tsx apps/client/src/test/sheet-gestures.ts packages/shared/src/release-notes.ts packages/shared/src/release-notes.test.ts docs/agent/frontend.md docs/agent/testing.md docs/agent/decisions.md docs/backlog_v7.md`
  - Commit:

```
feat(home): How to play card carousel (L76-06)

Every dismissal path closes How to play once per open, so a gated
close never reads as a second, manual one (Part 2 Review Focus 1).
```

**Acceptance map:**
- Nine cards render in section order → 'shows one card per section in order, the copy verbatim, under the primer line'.
- Skip and Got it report 'skip' / 'got-it', Esc / backdrop report 'dismiss' → '%s reports %s once and closes the sheet' (plus swipe → 'dismiss').
- The L76-01 gate tests stay green → the unchanged `How to play soft gate` describe of `home-screen.test.tsx` (Step 4).
- Paging never closes the sheet → 'pages by the chevrons, the keyboard and a swipe, announces the position, and never closes' and the Review Focus 1 Home tests.
- Reduced motion turns off the slide → 'with reduced motion %s the track is %s and pages with an %s scroll'.
- No screenshot `<img>` renders without a file → 'renders no screenshot img while the designer files are absent' and 'renders a screenshot only on the card whose file exists, as decoration'.
- Part 2 Review Focus 1 → "a gated %s after paging marks seen and enters Play solo once, with no What's new re-check" (Skip, Got it, Escape, backdrop, swipe) and "a double click on the gated Skip enters Play online once and opens no What's new".
- `pnpm verify` green → Step 6.

**Decisions:**
- Resource icons: the V6 per-section glyph rows (Lives + Shield, Points, Upgrade points) on the V7 `Icon`s, not `EffectTextWithIcons`. That component rewrites "0 lives", "1 upgrade point" and "1 life" in the bodies into glyph amounts, which breaks "copy verbatim" (§7.1); it is built for catalog effect strings (§6.6.1).
- Keyboard paging is the Carousel's own: Tab to a chevron, then Enter or Space (the track stays out of the Tab order, L72-08). No ArrowLeft / ArrowRight handler, which would need a `ui/` change.
- No `gridAtDesktop`: §7.1 says a swipeable carousel, and the L72 gallery demo of How to play pages on desktop too.
- A `Dialog` (width `xl`) rather than a full-height Sheet; the body scrolls when a card is tall (Kits).
- Initial focus is the Sheet default, the first control: the Previous chevron (`aria-disabled` on card 1). The primary Got it is not focused, so a gated open cannot be dismissed by a stray Enter.
- One onClose per open (`useOncePerOpen`, L76-05). Without it, a double click on a gated Skip would enter the path and then re-check What's new as a manual close.
- No card renders in the slides, although §13 Q12 says "icons and card renders": §7.1 and the brief name icons only (designer question 4).
- The lead line 'This is a short primer — not the full rules.' stays above the carousel.
- Changed string: What's new item 9, Before 'Home was a plain menu, and How to play was one long page.' and After 'Home has the new look, and How to play is a deck of cards you swipe through.' (L76-04's text is rewritten in place). Reused accessible names: 'Previous' and 'Next' (the admin pager's words) on the chevrons.

---

---

### Task L76-07: Rebuild the Feedback sheet with a Sent confirmation

> Controller note: L76-05 created `screens/use-once-per-open.ts` (a per-open dismissal latch) and `test/sheet-gestures.ts` (`stubPhoneViewport`, `swipeSheetDown`; L76-06 added `swipeCarouselTo`), and switched `closeHomeDialog` to `hidden: true` waits with a `'swipe'` option. Reuse them where they fit instead of writing new ones, and say so in your report.

**Files:**
- Modify (rewrite in place): `apps/client/src/feedback/feedback-dialog.tsx` on the V7 `Dialog`; export name, `FeedbackDialogMode` and `FeedbackDialogProps` unchanged; return type becomes `ReactElement | null` (the V7 `Dialog`'s). No `design/` import left.
- Create:
  - `apps/client/src/feedback/feedback-timing.ts`: the two timers.
  - `apps/client/src/ui/primitives/text-area.tsx`: `TextArea` (16 px multi-line field; `TextField` renders an `<input>` only).
- Modify:
  - `apps/client/src/feedback/feedback-form-copy.ts`: the Sent strings; `FEEDBACK_FALLBACK_ERROR` moves here (same value).
  - `apps/client/src/feedback/submit-feedback.ts`: imports `FEEDBACK_FALLBACK_ERROR` from `./feedback-form-copy` (its own definition removed). Reason: `screens/lobby/lobby-screen.test.tsx` mocks `submit-feedback` without the original module, so the dialog must not read copy from it.
  - `apps/client/src/ui/primitives/primitives-gallery-demos.tsx` (+ `TextAreaDemo`), `apps/client/src/ui/primitives/primitives.gallery.tsx` (+ the `text-area` entry), `apps/client/src/dev/ui-gallery.test.tsx` (`PRIMITIVE_TITLES` gains `'TextArea'`).
  - `apps/client/src/screens/home/home-screen.test.tsx`: **one query** in 'opens Feedback in manual mode from the hub, and a send carries screen home and the nickname only': `getByRole('button', { name: 'Idea' })` → `getByRole('radio', { name: 'Idea' })` (Kind is a radio group, A.10 / Q71). Nothing else in the file changes.
  - `apps/client/src/screens/lobby/lobby-actions.tsx`: the doc comment only ("Feedback opens the V2 manual `FeedbackDialog` until L76-07" is stale).
  - `packages/shared/src/release-notes.ts` + `packages/shared/src/release-notes.test.ts`: What's new item 9 rewritten in place (Step 5).
  - `DESIGN.md`, `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`.
- Test (create): `apps/client/src/feedback/feedback-dialog.test.tsx` (14, happy-dom), `apps/client/src/ui/primitives/text-area.test.tsx` (3, happy-dom).
- Delete: `apps/client/src/feedback/feedback-dialog.test.ts` (source-text; classification rows "claims the in-flight gate…" and "shows Kind / About / Contact in ask-mode…").
- Existing tests that must stay green **unchanged**, and why:
  - `screens/arena/top-bar.test.tsx`, `screens/arena/chat-sheet.test.tsx`: they open Feedback and find `dialog` named 'Feedback' (the manual title is still 'Feedback').
  - `screens/end.finished-board.test.tsx`: ask and manual titles stay 'Feedback'; Cancel keeps its name; a closing V7 sheet is `aria-hidden`, so `queryByRole('dialog', { name: 'Feedback' })` turns null at once.
  - `screens/lobby/lobby-screen.test.tsx` and `screens/home/home-screen.test.tsx` (send tests): Bug stays the default, the About chips stay buttons named 'UI'…, Message stays a `textbox` named 'Message', Send keeps its name, and a success renames the sheet 'Sent' at once, so `waitFor(() => queryByRole('dialog', { name: 'Feedback' }) === null)` passes well inside 1 s (the Sent auto-close is 1.5 s).
  - `screens/lobby/lobby-actions.test.tsx`, `screens/lobby/lobby-screen.reconnect.test.tsx`: Esc closes a manual sheet that is not sending; they wait with `hidden: true`.
  - `screens/end-feedback.test.ts` and `feedback/asked-storage.test.ts` (the End ask-once helpers), `screens/end.feedback-surfaces.test.ts`, `screens/table.feedback-surfaces.test.ts`, `screens/game-over-dialog.entrance.test.tsx` (they read `end.tsx` / `table.tsx` or pure helpers; neither file changes).
  - `feedback/build-feedback-payload.test.ts`, `feedback-form-copy.test.ts`, `submit-feedback.test.ts`, `submit-gate.test.ts`; `ui/primitives/sheet.test.tsx`, `dialog.test.tsx`, `text-field.test.tsx`; every `App*.test.tsx`.

**Interfaces:**
- Consumes:
  - ui: `Dialog` (`../ui/primitives/dialog`: `open`, `title`, `onClose`, `actions`, `dismissLocked`, `dataAttributes`), `Button` (`../ui/primitives/button`), `Segmented` + `SegmentedOption` (`../ui/primitives/segmented`), `TextField` (`../ui/primitives/text-field`), `Icon` (`../ui/icons/icon`, the L76-12 `check`), `usePrefersReducedMotion` (`../ui/motion/use-prefers-reduced-motion`), from `../ui/primitives/chrome-classes`: `BUTTON_VARIANT_CLASS`, `CHROME_DISABLED_CLASS`, `CHROME_FLAT_SM_CLASS`, `CHROME_FOCUS_CLASS`, `CHROME_SHAPE_SM_CLASS`, `chromePressClass`, `motionAttribute`.
  - feedback (unchanged): `buildFeedbackPayload`, `resolveFeedbackSubmitFields`, `canSendFeedbackForm`, `feedbackSendHint`, `feedbackAboutHint`, `feedbackMessagePlaceholder`, `feedbackDialogTitle`, `FEEDBACK_ASK_LEAD`, `FEEDBACK_ABOUT_LEGEND`, `submitFeedback`, `beginFeedbackSend`, `endFeedbackSend`.
  - Shared: `FEEDBACK_KINDS`, `FEEDBACK_TOPICS`, `FEEDBACK_TOPIC_LABEL`, `isFeedbackTopicsComplete`, `toggleFeedbackTopic`, `FeedbackKind`, `FeedbackScreen`, `FeedbackTopic`, `PlayKind`, `ActionLogEntryView`.
- Produces:

```ts
// feedback/feedback-timing.ts
/** The Lot 76 backlog review (2026-10-21; not in spec v7 §7.7), a designer question: "Sent" closes by itself after ~1.5 s. */
export const FEEDBACK_SENT_CLOSE_MS = 1500;
/** Spec v7 §7.7: a send with no answer re-enables dismissal with an error after 15 s. */
export const FEEDBACK_SEND_TIMEOUT_MS = 15_000;

// feedback/feedback-form-copy.ts (added)
/** Moved from submit-feedback.ts (same words): the network / 503 copy, also the 15 s timeout's error. */
export const FEEDBACK_FALLBACK_ERROR = 'Could not save — try again';
/** §10.6, Q6/Q68/Q69: the title the sheet takes after a successful send. */
export const FEEDBACK_SENT_TITLE = 'Sent';
/** NEW (designer review): the Sent confirmation's line, a polite `role="status"`. */
export const FEEDBACK_SENT_BODY = 'Thanks for your feedback.';
/** The Sent confirmation's dismiss: the lobby's existing 'OK'. */
export const FEEDBACK_SENT_DISMISS_LABEL = 'OK';

// ui/primitives/text-area.tsx
export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'children'> {
  label: string;
  labelHidden?: boolean;
  hint?: string;
  error?: string | null;
  /** Lands on the wrapper, as TextField's. */
  className?: string;
  ref?: Ref<HTMLTextAreaElement>;
}
export function TextArea(props: TextAreaProps): ReactElement;

// feedback/feedback-dialog.tsx: FeedbackDialogMode and FeedbackDialogProps unchanged
export function FeedbackDialog(props: FeedbackDialogProps): ReactElement | null;
```

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/ui/primitives/text-area.test.tsx` (3 tests):

```tsx
// @vitest-environment happy-dom
/** TextArea: technical spec v7 §5.2 (16 px, no iOS zoom), §7.7 (the Feedback message); L76-07. */
import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { renderUi } from '../../test/render';
import { TextArea } from './text-area';

function descriptions(element: Element): (string | null | undefined)[] {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter((id) => id !== '')
    .map((id) => document.getElementById(id)?.textContent);
}

describe('TextArea (technical spec v7 §5.2; L76-07)', () => {
  it('labels a 16 px multi-line field and forwards its ref and attributes', () => {
    const ref = createRef<HTMLTextAreaElement>();
    renderUi(<TextArea label="Message" ref={ref} maxLength={4000} rows={4} placeholder="What was unclear?" />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    expect(ref.current).toBe(field);
    expect(field.tagName).toBe('TEXTAREA');
    expect([...field.classList]).toEqual(expect.arrayContaining(['text-v7-input', 'min-h-28']));
    expect([field.getAttribute('maxlength'), field.getAttribute('rows'), field.getAttribute('placeholder')]).toEqual(['4000', '4', 'What was unclear?']);
    expect(field.hasAttribute('aria-invalid')).toBe(false);
  });

  it('describes the hint and the error, and marks the error invalid', () => {
    const { rerender } = renderUi(<TextArea label="Message" hint="Up to 4000 characters" error="Write a few words" />);
    const field = screen.getByRole('textbox', { name: 'Message' });
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(descriptions(field)).toEqual(['Up to 4000 characters', 'Write a few words']);
    rerender(<TextArea label="Message" hint="Up to 4000 characters" error={null} />);
    expect(field.hasAttribute('aria-invalid')).toBe(false);
    expect(descriptions(field)).toEqual(['Up to 4000 characters']);
  });

  it('keeps the name when the label is hidden from sight', () => {
    renderUi(<TextArea label="Message" labelHidden />);
    const label = screen.getByText('Message');
    expect(label.classList.contains('sr-only')).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeTruthy();
  });
});
```

`apps/client/src/feedback/feedback-dialog.test.tsx` (14 tests):

```tsx
// @vitest-environment happy-dom
/**
 * The Feedback sheet, rendered: technical spec v7 §7.7 (a 15 s client timeout) and the Lot 76 backlog review (Sent closes by itself; a
 * timeout), §5.2, §10.6, §11 (Q6, Q68, Q69, Q71); Appendix A `global-feedback-dialog`,
 * `feedback-dialog-dismiss`, `global-text-input-no-ios-zoom`, `global-dialog-interaction-contract`;
 * L47-03, L47-06, L57-05; Part 2 Review Focus 2 (L76-07). Replaces the source-text
 * `feedback-dialog.test.ts`.
 */
import {
  FEEDBACK_TOPICS, FEEDBACK_TOPIC_LABEL, PROTOCOL_VERSION, type ActionLogEntryView, type FeedbackSubmitBody,
} from '@card-battle/shared';
import { act, screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiOptions } from '../test/render';
import { FeedbackDialog, type FeedbackDialogProps } from './feedback-dialog';
import {
  FEEDBACK_ASK_LEAD, FEEDBACK_FALLBACK_ERROR, FEEDBACK_SENT_BODY, FEEDBACK_SENT_DISMISS_LABEL, FEEDBACK_SENT_TITLE,
  feedbackMessagePlaceholder, feedbackSendHint,
} from './feedback-form-copy';
import { FEEDBACK_SEND_TIMEOUT_MS, FEEDBACK_SENT_CLOSE_MS } from './feedback-timing';

type SubmitResult = { ok: true } | { ok: false; message: string };
const feedback = vi.hoisted(() => ({ submit: vi.fn<(body: FeedbackSubmitBody) => Promise<SubmitResult>>() }));
vi.mock('./submit-feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./submit-feedback')>()),
  submitFeedback: feedback.submit,
}));

type Dismiss = FeedbackDialogProps['onDismiss'];
type SheetProps = Omit<FeedbackDialogProps, 'open'>;

/** A caller like Home, the lobby or the arena: any onDismiss closes the sheet. */
function Host(props: SheetProps): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <FeedbackDialog
      {...props}
      open={open}
      onDismiss={(reason) => {
        props.onDismiss(reason);
        setOpen(false);
      }}
    />
  );
}
function renderSheet(overrides: Partial<Omit<SheetProps, 'onDismiss'>> = {}, options: RenderUiOptions = {}) {
  const onDismiss = vi.fn<Dismiss>();
  const props: SheetProps = { mode: 'manual', screen: 'home', onDismiss, ...overrides };
  return { onDismiss, ...renderUi(<Host {...props} />, { reducedMotion: true, ...options }) };
}
const sheet = (name = 'Feedback'): HTMLElement => screen.getByRole('dialog', { name });
const control = (name: string, role: 'button' | 'radio' | 'textbox' = 'button'): HTMLElement =>
  within(sheet()).getByRole(role, { name });
const messageValue = (): string => within(sheet()).getByRole<HTMLTextAreaElement>('textbox', { name: 'Message' }).value;
const isDisabled = (element: HTMLElement): boolean =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
function backdrop(dialog: HTMLElement): HTMLElement {
  const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
  if (overlay === null) throw new Error('no backdrop');
  return overlay;
}
/** Lets the mocked POST answer and React render the answer. */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}
async function gone(name: string): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name, hidden: true })).toBeNull();
  });
}
function deferred(): { promise: Promise<SubmitResult>; resolve: (result: SubmitResult) => void } {
  let resolve: (result: SubmitResult) => void = () => undefined;
  const promise = new Promise<SubmitResult>((answer) => {
    resolve = answer;
  });
  return { promise, resolve };
}
/** An Idea needs no area, so a message alone enables Send. */
async function writeIdea(user: UserEvent, message: string): Promise<void> {
  await user.click(control('Idea', 'radio'));
  await user.type(control('Message', 'textbox'), message);
}
const ENTRY: ActionLogEntryView = { kind: 'rewardsClaimed', eliminatorPlayerId: 'p1', eliminatedPlayerId: 'p2', turnSequence: 3 };

beforeEach(() => {
  feedback.submit.mockReset();
  feedback.submit.mockResolvedValue({ ok: true });
});

describe('the Feedback ticket (spec v7 §7.7, §11 Q71; L47-06, L57-05)', () => {
  it('shows Kind as a radio group on Bug, the About chips in catalog order, 16 px Message and Contact, Cancel, and Send off', () => {
    renderSheet();
    const dialog = sheet();
    const kind = within(dialog).getByRole('radiogroup', { name: 'Kind' });
    expect(within(kind).getAllByRole('radio').map((radio) => [radio.textContent, radio.getAttribute('aria-checked')])).toEqual([
      ['Bug', 'true'], ['Confusion', 'false'], ['Idea', 'false'],
    ]);
    const about = within(dialog).getByRole('group', { name: 'About' });
    expect(within(about).getAllByRole('button').map((chip) => [chip.textContent, chip.getAttribute('aria-pressed')])).toEqual(
      FEEDBACK_TOPICS.map((id) => [FEEDBACK_TOPIC_LABEL[id], 'false']),
    );
    const message = control('Message', 'textbox');
    const contact = control('Contact (optional)', 'textbox');
    expect([message.tagName, message.getAttribute('maxlength'), contact.getAttribute('maxlength'), contact.getAttribute('autocomplete')])
      .toEqual(['TEXTAREA', '4000', '200', 'email']);
    expect([message, contact].every((field) => field.classList.contains('text-v7-input'))).toBe(true);
    expect(control('Cancel')).toBeTruthy();
    expect(within(dialog).queryByText(FEEDBACK_ASK_LEAD)).toBeNull();
    expect(isDisabled(control('Send'))).toBe(true);
  });

  it.each([
    { mode: 'ask', dismiss: 'Skip', reason: 'skip' },
    { mode: 'manual', dismiss: 'Cancel', reason: 'cancel' },
  ] as const)('in $mode mode, $dismiss, Esc and the backdrop each report $reason once', async ({ mode, dismiss, reason }) => {
    for (const way of ['button', 'Escape', 'backdrop'] as const) {
      const { user, onDismiss, unmount } = renderSheet({ mode });
      const dialog = sheet();
      expect(within(dialog).queryByText(FEEDBACK_ASK_LEAD) !== null).toBe(mode === 'ask');
      if (way === 'button') await user.click(within(dialog).getByRole('button', { name: dismiss }));
      else if (way === 'Escape') await user.keyboard('{Escape}');
      else await user.click(backdrop(dialog));
      expect(onDismiss.mock.calls, way).toEqual([[reason]]);
      await gone('Feedback');
      unmount();
    }
    expect(feedback.submit).not.toHaveBeenCalled();
  });

  it('drops the draft on every dismissal (L47-03)', async () => {
    const onDismiss = vi.fn<Dismiss>();
    const { user } = renderUi(<FeedbackDialog open mode="manual" screen="home" onDismiss={onDismiss} />, { reducedMotion: true });
    await user.click(control('Gameplay'));
    await user.type(control('Message', 'textbox'), 'Draw froze');
    await user.click(control('Cancel'));
    expect(onDismiss.mock.calls).toEqual([['cancel']]);
    // The parent kept it open, so the same sheet shows a fresh ticket.
    expect(messageValue()).toBe('');
    expect(control('Gameplay').getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps Send off for a blank message and for a bug with no area, with the hint; Kind changes by keyboard and keeps the areas', async () => {
    const { user } = renderSheet();
    const message = control('Message', 'textbox');
    await user.type(message, '   ');
    expect(isDisabled(control('Send'))).toBe(true);
    expect(within(sheet()).queryByRole('status')).toBeNull();
    await user.type(message, 'Draw froze');
    expect(isDisabled(control('Send'))).toBe(true);
    expect(within(sheet()).getByRole('status').textContent).toBe(feedbackSendHint('bug', [], 'Draw froze'));
    await user.click(control('Gameplay'));
    expect(control('Gameplay').getAttribute('aria-pressed')).toBe('true');
    expect(within(sheet()).queryByRole('status')).toBeNull();
    expect(isDisabled(control('Send'))).toBe(false);
    act(() => {
      control('Bug', 'radio').focus();
    });
    await user.keyboard('{ArrowRight}');
    expect(control('Confusion', 'radio').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(control('Confusion', 'radio'));
    expect(message.getAttribute('placeholder')).toBe(feedbackMessagePlaceholder('confusion'));
    expect(control('Gameplay').getAttribute('aria-pressed')).toBe('true');
  });

  it('sends one POST on a double click, and one on two clicks in the same tick (the in-flight gate, L47-03)', async () => {
    feedback.submit.mockReturnValue(new Promise<SubmitResult>(() => undefined)); // no answer: the sheet stays busy
    const first = renderSheet();
    await writeIdea(first.user, 'More kits');
    await first.user.dblClick(control('Send'));
    expect(feedback.submit).toHaveBeenCalledTimes(1);
    first.unmount();
    feedback.submit.mockClear();
    const second = renderSheet();
    await writeIdea(second.user, 'More kits');
    const send = control('Send');
    act(() => {
      send.click();
      send.click();
    });
    expect(feedback.submit).toHaveBeenCalledTimes(1);
  });

  it('locks Esc, the backdrop and Skip while sending, and frees them when the answer comes', async () => {
    const answer = deferred();
    feedback.submit.mockReturnValueOnce(answer.promise);
    const { user, onDismiss } = renderSheet({ mode: 'ask', screen: 'end' });
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    const dialog = sheet();
    expect(isDisabled(control('Skip'))).toBe(true);
    expect(isDisabled(control('Sending…'))).toBe(true);
    await user.keyboard('{Escape}');
    await user.click(backdrop(dialog));
    expect(sheet()).toBe(dialog);
    expect(onDismiss).not.toHaveBeenCalled();
    answer.resolve({ ok: false, message: 'Too many reports' });
    await settle();
    expect(isDisabled(control('Skip'))).toBe(false);
    await user.keyboard('{Escape}');
    expect(onDismiss.mock.calls).toEqual([['skip']]);
  });

  it('shows a failure in words and keeps the ticket, and a retry can send (L47-03)', async () => {
    feedback.submit.mockResolvedValueOnce({ ok: false, message: 'Too many reports' });
    const { user, onDismiss } = renderSheet();
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    await settle();
    expect(within(sheet()).getByRole('alert').textContent).toBe('Too many reports');
    expect(messageValue()).toBe('More kits');
    expect(control('Idea', 'radio').getAttribute('aria-checked')).toBe('true');
    await user.click(control('Send'));
    await settle();
    expect(sheet(FEEDBACK_SENT_TITLE)).toBeTruthy();
    expect(feedback.submit).toHaveBeenCalledTimes(2);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("sends today's payload in ask mode: the tester's kind, areas in catalog order and contact, the context and the log tail; never the seed", async () => {
    const { user } = renderSheet({ mode: 'ask', screen: 'end', nickname: 'Ada', gameCode: 'ABCDEF', playKind: 'classic', actionLog: [ENTRY] });
    await user.click(control('Card'));
    await user.click(control('UI'));
    await user.type(control('Message', 'textbox'), '  Shield did not block  ');
    await user.type(control('Contact (optional)', 'textbox'), ' ada@example.com {Enter}');
    expect(feedback.submit).not.toHaveBeenCalled(); // no <form>: Enter never sends
    await user.click(control('Send'));
    expect(feedback.submit.mock.calls).toEqual([[{
      kind: 'bug', message: 'Shield did not block', screen: 'end', protocolVersion: PROTOCOL_VERSION,
      topics: ['ui', 'card'], contact: 'ada@example.com', nickname: 'Ada', gameCode: 'ABCDEF', playKind: 'classic', logTail: [ENTRY],
    }]]);
    expect(JSON.stringify(feedback.submit.mock.calls)).not.toContain('seed');
  });
});

describe('Sent (spec v7 §7.7 amended, Q6/Q68/Q69; L76-07 Review)', () => {
  it('replaces the ticket with Sent, focuses OK, and closes by itself after FEEDBACK_SENT_CLOSE_MS with one sent', async () => {
    vi.useFakeTimers();
    const { user, onDismiss } = renderSheet({}, { advanceTimers: vi.advanceTimersByTime });
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    await settle();
    const sent = sheet(FEEDBACK_SENT_TITLE);
    expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull();
    expect(within(sent).getByRole('status').textContent).toBe(FEEDBACK_SENT_BODY);
    expect(document.activeElement).toBe(within(sent).getByRole('button', { name: FEEDBACK_SENT_DISMISS_LABEL }));
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SENT_CLOSE_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss.mock.calls).toEqual([['sent']]);
    await gone(FEEDBACK_SENT_TITLE);
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SEND_TIMEOUT_MS); // the send timer was cleared by the answer
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it.each(['OK', 'Escape', 'backdrop'] as const)('closing Sent early with %s reports sent once, and the timer never reports it again', async (way) => {
    vi.useFakeTimers();
    const { user, onDismiss } = renderSheet({}, { advanceTimers: vi.advanceTimersByTime });
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    await settle();
    const sent = sheet(FEEDBACK_SENT_TITLE);
    if (way === 'OK') await user.click(within(sent).getByRole('button', { name: FEEDBACK_SENT_DISMISS_LABEL }));
    else if (way === 'Escape') await user.keyboard('{Escape}');
    else await user.click(backdrop(sent));
    expect(onDismiss.mock.calls).toEqual([['sent']]);
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SENT_CLOSE_MS * 2);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('a send that never answers (Part 2 Review Focus 2; spec v7 §7.7 amended)', () => {
  it('keeps dismissal locked for 15 s, then unlocks it with the error; a late success sends no second sent', async () => {
    vi.useFakeTimers();
    const hung = deferred();
    const retry = deferred();
    feedback.submit.mockReturnValueOnce(hung.promise).mockReturnValueOnce(retry.promise);
    const { user, onDismiss } = renderSheet({}, { advanceTimers: vi.advanceTimersByTime });
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SEND_TIMEOUT_MS - 1);
    });
    expect(isDisabled(control('Cancel'))).toBe(true);
    await user.keyboard('{Escape}');
    expect(onDismiss).not.toHaveBeenCalled();
    expect(within(sheet()).queryByRole('alert')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(within(sheet()).getByRole('alert').textContent).toBe(FEEDBACK_FALLBACK_ERROR);
    expect(isDisabled(control('Cancel'))).toBe(false);
    expect(isDisabled(control('Send'))).toBe(false);
    hung.resolve({ ok: true }); // the first POST answers late: ignored
    await settle();
    expect(screen.queryByRole('dialog', { name: FEEDBACK_SENT_TITLE })).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();
    await user.click(control('Send')); // the retry
    retry.resolve({ ok: true });
    await settle();
    expect(sheet(FEEDBACK_SENT_TITLE)).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SENT_CLOSE_MS);
    });
    expect(onDismiss.mock.calls).toEqual([['sent']]);
    expect(feedback.submit).toHaveBeenCalledTimes(2);
  });
});
```

Test count: `text-area.test.tsx` 3, `feedback-dialog.test.tsx` 14 (1 + 2 + 1 + 1 + 1 + 1 + 1 + 1 in the ticket block, 1 + 3 for Sent, 1 for Review Focus 2).

- [ ] **Step 2: Run them and see them fail.**

`pnpm vitest run apps/client/src/feedback/feedback-dialog.test.tsx apps/client/src/ui/primitives/text-area.test.tsx` → both files fail to load: `./text-area`, `./feedback-timing` and the `FEEDBACK_SENT_*` / `FEEDBACK_FALLBACK_ERROR` exports of `./feedback-form-copy` do not exist yet.

- [ ] **Step 3: Implement.**

1. **`feedback/feedback-timing.ts`** and the **`feedback-form-copy.ts`** additions exactly as in Interfaces. Move `FEEDBACK_FALLBACK_ERROR` out of `submit-feedback.ts` (same value), which now imports it from `./feedback-form-copy`.
2. **`ui/primitives/text-area.tsx`**: mirror `TextField` (the same hint / error / `aria-describedby` / always-present `aria-live="polite"` error region / `aria-invalid` logic and the same field chrome: `px-3 py-2 font-v7-body text-v7-input font-bold text-v7-text placeholder:text-v7-text-2 placeholder:opacity-70`, `CHROME_FLAT_SM_CLASS`, `bg-v7-panel-2`, `aria-invalid:border-v7-danger disabled:cursor-not-allowed disabled:opacity-50`, `CHROME_FOCUS_CLASS`), with a `<textarea>`, `min-h-28 w-full min-w-0 resize-y`, `useId` ids `{id}-hint` / `{id}-error`. Header comment cites spec v7 §5.2 and §7.7 and says why it exists (TextField is input-only).
3. **Gallery:** `TextAreaDemo` in `primitives-gallery-demos.tsx` (a `Message` field with `maxLength={4000}` and a placeholder, one with a hint, one disabled), the entry `{ id: 'text-area', title: 'TextArea', render: () => <TextAreaDemo /> }` after `text-field` in `primitives.gallery.tsx`, and `'TextArea'` after `'TextField'` in `dev/ui-gallery.test.tsx` › `PRIMITIVE_TITLES`.
4. **`feedback/feedback-dialog.tsx`** (rewrite; header comment: spec v7 §7.7 amended, §5.2, §11 Q71; L47-03, L47-06, L57-05; L76-07):
   - State: `kind`, `topics`, `message`, `contact`, `busy`, `error`, plus `sent: boolean`. Refs: `requestId`, `inFlight` (as today), `sendTimer: number | null`, `okSlot` (an `HTMLSpanElement`).
   - `resetForm()` also sets `sent` false and clears the send timer. `dismiss(reason)` is unchanged (bump `requestId`, `resetForm()`, `onDismiss(reason)`).
   - `onSubmit()` keeps the gate order (topics / message check, then `beginFeedbackSend(inFlight)`, then `setBusy(true)`, `setError(null)`, the same `context`, `const id = requestId.current`, the same `buildFeedbackPayload(submitted.kind, message, context, contact)`). Before the POST it starts `sendTimer` with `FEEDBACK_SEND_TIMEOUT_MS`; on expiry, when `id === requestId.current`: `requestId.current += 1` (so the late answer is ignored), `endFeedbackSend(inFlight)`, `setBusy(false)`, `setError(FEEDBACK_FALLBACK_ERROR)`. The `.then` handler, when `id === requestId.current`: clear the timer, `endFeedbackSend(inFlight)`, `setBusy(false)`, then `setSent(true)` on success, else `setError(result.message)`. Clear the timer on unmount (capture the ref object in the effect, not `.current`).
   - Auto-close: `const reportSent = useEffectEvent(() => { dismiss('sent'); });` and an effect on `[open, sent]` that, while `open && sent`, starts a `FEEDBACK_SENT_CLOSE_MS` timeout calling `reportSent()` and clears it in its cleanup. Focus: an effect on `[sent]` that, when `sent` turns true, focuses `okSlot.current?.querySelector('button')` (the `Button` primitive takes no `ref`).
   - Render one `Dialog` (default width `md`):
     - `title={sent ? FEEDBACK_SENT_TITLE : feedbackDialogTitle(mode)}`, `dismissLocked={busy}`, `dataAttributes={{ 'data-feedback-sheet': sent ? 'sent' : mode }}`.
     - `onClose={() => { dismiss(sent ? 'sent' : mode === 'ask' ? 'skip' : 'cancel'); }}` (Esc, backdrop, swipe).
     - `actions`: when `sent`, `<span ref={okSlot} className="contents"><Button variant="primary" onClick={() => { dismiss('sent'); }}>{FEEDBACK_SENT_DISMISS_LABEL}</Button></span>`; otherwise a `quiet` Button `Skip` / `Cancel` (`disabled={busy}`, same `dismiss(...)`), then a `primary` Button `Send` / `Sending…` (`disabled={!canSend}`, `onClick={onSubmit}`).
     - Body when `sent`: `<div className="flex items-center gap-3"><Icon name="check" size={40} /><p role="status" className="font-v7-body text-v7-body font-bold text-v7-text">{FEEDBACK_SENT_BODY}</p></div>`.
     - Body otherwise, in this order, with **no `<form>`**:
       1. ask mode only: `<p>` `FEEDBACK_ASK_LEAD` (`font-v7-body text-v7-body text-v7-text-2`);
       2. a visible caption `<p aria-hidden="true">Kind</p>` then `<Segmented<FeedbackKind> label="Kind" options={KIND_OPTIONS} value={kind} onChange={setKind} />`, where `KIND_OPTIONS` is a module-level (non-exported) `FEEDBACK_KINDS.map((value) => ({ value, label: KIND_LABEL[value] }))` and `KIND_LABEL` stays the local `Record<FeedbackKind, string>` ('Bug', 'Confusion', 'Idea');
       3. `<fieldset>` with `<legend>{FEEDBACK_ABOUT_LEGEND}</legend>`, the `feedbackAboutHint(kind)` line, and one chip per `FEEDBACK_TOPICS` entry: a native `<button type="button" aria-pressed={selected} data-motion={motionAttribute(reduced)}>` named by `FEEDBACK_TOPIC_LABEL[id]`, classes `inline-flex min-h-11 items-center px-3 font-v7-display text-v7-body leading-none`, `CHROME_SHAPE_SM_CLASS`, `CHROME_FOCUS_CLASS`, `chromePressClass(reduced)`, pressed `bg-v7-cta-2 text-v7-text-on-cta`, idle `BUTTON_VARIANT_CLASS.quiet`; `onClick` → `setTopics(toggleFeedbackTopic(topics, id))`;
       4. the send hint, when not null: `<p role="status">` (`font-v7-body text-v7-caption font-extrabold text-v7-text`; `--danger` text fails AA at this size, so the words stay `--text`);
       5. `<TextArea label="Message" rows={4} maxLength={4000} placeholder={feedbackMessagePlaceholder(kind)} value={message} onChange={(event) => { setMessage(event.currentTarget.value); }} />`;
       6. `<TextField label="Contact (optional)" maxLength={200} autoComplete="email" value={contact} onChange=… />`;
       7. the error, when not null: `<p role="alert">` inside the lobby alert look (`bg-v7-panel-2 px-3 py-2.5 ring-2 ring-inset ring-v7-danger`, `CHROME_SHAPE_SM_CLASS`, `font-v7-body text-v7-body font-bold text-v7-text`).
   - Kind and the chips stay live while sending (parity: only Skip / Cancel and Send lock).
5. **`screens/home/home-screen.test.tsx`**: the one query swap listed in Files.
6. **`screens/lobby/lobby-actions.tsx`** doc comment: "Leave is immediate and Feedback opens the V2 manual `FeedbackDialog` until L76-07." → "Leave is immediate and Feedback opens the manual Feedback sheet (L76-07)."

- [ ] **Step 4: Run them and see them pass.**

`pnpm vitest run apps/client/src/feedback apps/client/src/ui/primitives/text-area.test.tsx apps/client/src/ui/primitives/text-field.test.tsx apps/client/src/ui/primitives/sheet.test.tsx apps/client/src/ui/primitives/dialog.test.tsx apps/client/src/dev/ui-gallery.test.tsx apps/client/src/screens/home apps/client/src/screens/lobby apps/client/src/screens/arena/top-bar.test.tsx apps/client/src/screens/arena/chat-sheet.test.tsx apps/client/src/screens/end.finished-board.test.tsx apps/client/src/screens/end-feedback.test.ts apps/client/src/screens/end.feedback-surfaces.test.ts apps/client/src/screens/table.feedback-surfaces.test.ts apps/client/src/screens/game-over-dialog.entrance.test.tsx packages/shared/src/release-notes.test.ts` → all green; `feedback-dialog.test.tsx` 14, `text-area.test.tsx` 3; `feedback-dialog.test.ts` no longer exists.

- [ ] **Step 5: Docs.**
  - **What's new (§10.4): rewrite item 9 in place** (the Home item L76-04 appended; L76-05/06 may have reworded it). Read it as it stands. Replace the final `.` of its `before` with `, and Feedback closed without a word.` and the final `.` of its `after` with `, and Feedback shows Sent once your note is saved.` (Example: `'Home was a list of buttons.'` → `'Home was a list of buttons, and Feedback closed without a word.'`.) Update that item in the `release-notes.test.ts` › 'writes lot-72-v7 as the New look entry…' `toEqual` to the same two strings. No count changes (no `whats-new-dialog.test.ts` pin, no row 236 edit). In `docs/agent/frontend.md`'s What's new item list, rewrite the ' Ninth item: …' sentence to the new after text and mark it '(L76-04, rewritten by L76-06 and L76-07)'. If there is no item 9, stop and report: L76-04 has not landed.
  - `docs/agent/frontend.md`, section `## Home and lobby (V7 · Lot 76)`, append:

```md
- `feedback/feedback-dialog.tsx`, `feedback-timing.ts`, `ui/primitives/text-area.tsx` (L76-07, spec v7 §7.7, the Lot 76 backlog review for the 1.5 s Sent close, §5.2, §11 Q71; decisions.md YYYY-MM-DD): Feedback is a V7 `Dialog` (a bottom sheet on phones, centered on desktop, in the sheet stack) with unchanged props, so Home, the lobby, the arena, the classic table and End mount it as before. Kind is a `Segmented` radio group "Kind" (Bug first); the About chips keep `aria-pressed` and catalog order; Message is the new `TextArea` and Contact (optional) a `TextField`, both 16 px. There is still no `<form>`, so Enter never sends. Send keeps the synchronous in-flight gate and the request id. While sending, `dismissLocked` ignores Esc, backdrop and swipe and Skip / Cancel are disabled; with no answer after `FEEDBACK_SEND_TIMEOUT_MS` (15 s) the sheet unlocks with 'Could not save — try again' and the late answer is ignored. A success retitles the sheet "Sent" ("Thanks for your feedback.", OK focused); it closes after `FEEDBACK_SENT_CLOSE_MS` (1.5 s) or on OK, Esc, backdrop or swipe and reports `onDismiss('sent')` once. The payload is unchanged and never carries the seed. Tests: `feedback/feedback-dialog.test.tsx` (it replaces the source-text `feedback-dialog.test.ts`), `ui/primitives/text-area.test.tsx`.
```

  - Superseded `frontend.md` lines (fix in place):
    - The L76-12 `lobby-actions.tsx` bullet: "Feedback opens the V2 manual `FeedbackDialog` (screen 'lobby', code, nickname) until L76-07." → "Feedback opens the manual Feedback sheet (screen 'lobby', code, nickname; L76-07)."
    - The Arena "Who owns which sheet" bullet "**Outside the stack until L75 / L76:** the V2 `HowToPlayDialog` and `FeedbackDialog` the TopBar opens …": remove `FeedbackDialog` from it (L76-06 may already have removed `HowToPlayDialog`; if the bullet then names no dialog, delete it) and add "the TopBar's Feedback sheet (V7 since L76-07)" to the **Owner-local** bullet's list.
    - Grep `frontend.md` for `FeedbackDialog` and `same Dialog`: wherever the V2 **Home** paragraph (or its L76-04 rewrite) says the hub and path headers open "the same Dialog", write "the same Feedback sheet (V7, L76-07)"; leave the Lot 47 / Lot 57 history lines alone.
  - `DESIGN.md`:
    - `## Primitives`, right after the **TextField** bullet: "- **TextArea:** the multi-line twin of TextField (the Feedback message, L76-07): the same 16px (`--type-input`) Nunito on `--panel-2`, chrome, hint, error live region and `aria-invalid`, with a 112px minimum height and a vertical resize handle. TextField renders an `<input>` only."
    - `## Overlays`, after the sentence that names `dismissLocked` "the Feedback send lock": "The Feedback sheet (L76-07) holds that lock for at most 15 s: with no answer it unlocks and shows the error. A success retitles the same sheet 'Sent', which closes by itself after 1.5 s."
  - `docs/agent/decisions.md`, append:

```md
## YYYY-MM-DD · [P] Feedback locks dismissal while sending, times out after 15 s and ends on Sent (L76-07)

Source: technical spec v7 §7.7 (a 15 s client timeout re-enables dismissal with an error; ends with "Sent"); the Lot 76 backlog review of 2026-10-21 ("Sent" closes by itself after ~1.5 s; not in §7.7, a designer question); §5.2, §10.6, §11 (Q6, Q68, Q69, Q71); Lot 76 plan L76-07 Review line, Part 2 Review Focus 2.

- **Supersedes** in Appendix A `global-feedback-dialog`: "Esc / overlay dismisses as skip (ask) or cancel (manual). It is not gated by busy", "Success: the dialog closes at once with reason 'sent'. There is no confirmation toast" and "The Kind buttons carry no aria-pressed"; and in `feedback-dialog-dismiss`: "busy sending: buttons disabled, but Escape / backdrop still close". While a send is in flight the sheet is `dismissLocked` (Esc, backdrop, swipe) and Skip / Cancel are disabled.
- **Timeout.** The dialog owns the 15 s timer (`FEEDBACK_SEND_TIMEOUT_MS`), not `submitFeedback`, so a hung fetch and a mocked one behave alike. On expiry it moves the request id on, releases the in-flight gate and shows the existing 'Could not save — try again'. A late answer to that request is ignored: no Sent, no 'sent'. The note may still have been stored, so a retry can store a second one: a duplicate row is preferred to a sheet the player cannot leave.
- **Sent.** A success retitles the same sheet "Sent" with "Thanks for your feedback." and a focused OK. It closes after `FEEDBACK_SENT_CLOSE_MS` (1.5 s) or on OK, Esc, backdrop or swipe, and calls `onDismiss('sent')` exactly once, so no caller changes (End still marks the ask-once flag on 'sent', 1.5 s later). The sheet is renamed at once, so a test that waits for the 'Feedback' dialog to close after a send still passes.
- **Fields.** Kind is a `Segmented` radio group (Q71); the About chips keep `aria-pressed`. Message is the new `ui/primitives` `TextArea` (16 px, §5.2). There is still no `<form>`: Enter never sends. `FEEDBACK_FALLBACK_ERROR` moved to `feedback-form-copy.ts`, because a lobby test mocks `submit-feedback` without its constants.
- **Test edit.** `screens/home/home-screen.test.tsx` › 'opens Feedback in manual mode from the hub…' finds Idea by role `radio` instead of `button`: the same control, now a radio (§11, Q71). Its assertions are unchanged.

---
```

  - `docs/backlog_v7_test_classification.md`, Owner lot 76, append to the last cell of:
    - the row "…> claims the in-flight gate before POST so a double-click cannot dual-insert": ` **Done (L76-07):** replaced by \`feedback/feedback-dialog.test.tsx\` › 'sends one POST on a double click, and one on two clicks in the same tick (the in-flight gate, L47-03)', 'keeps Send off for a blank message and for a bug with no area, with the hint; Kind changes by keyboard and keeps the areas', 'locks Esc, the backdrop and Skip while sending, and frees them when the answer comes' and 'replaces the ticket with Sent, focuses OK, and closes by itself after FEEDBACK_SENT_CLOSE_MS with one sent'.`
    - the row "…> shows Kind / About / Contact in ask-mode with Skip, including Return home": ` **Done (L76-07):** replaced by \`feedback/feedback-dialog.test.tsx\` › 'shows Kind as a radio group on Bug, the About chips in catalog order, 16 px Message and Contact, Cancel, and Send off', 'in $mode mode, $dismiss, Esc and the backdrop each report $reason once' and "sends today's payload in ask mode: the tester's kind, areas in catalog order and contact, the context and the log tail; never the seed".`
  - `docs/backlog_v7.md`: the `| L76-07 |` row `To do` → `Done`; the Progress row → `| 76 · Home and lobby | 18 | 14 |`; read the Total row and add 1 to its done count.

- [ ] **Step 6: Verify and commit.**

`pnpm verify` green. Then:

```bash
git rm apps/client/src/feedback/feedback-dialog.test.ts
git add apps/client/src/feedback/feedback-dialog.tsx apps/client/src/feedback/feedback-dialog.test.tsx \
  apps/client/src/feedback/feedback-form-copy.ts apps/client/src/feedback/feedback-timing.ts apps/client/src/feedback/submit-feedback.ts \
  apps/client/src/ui/primitives/text-area.tsx apps/client/src/ui/primitives/text-area.test.tsx \
  apps/client/src/ui/primitives/primitives-gallery-demos.tsx apps/client/src/ui/primitives/primitives.gallery.tsx \
  apps/client/src/dev/ui-gallery.test.tsx apps/client/src/screens/home/home-screen.test.tsx apps/client/src/screens/lobby/lobby-actions.tsx \
  packages/shared/src/release-notes.ts packages/shared/src/release-notes.test.ts \
  DESIGN.md docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
git commit -m "feat(feedback): rebuild Feedback sheet (L76-07)" -m "Kind is a radio group and the fields are 16 px (TextArea is new in
ui/primitives). Sending locks dismissal; a 15 s client timeout unlocks
it with the error and ignores the late answer. A success retitles the
sheet Sent, which closes after 1.5 s and reports 'sent' once. Props
and payload are unchanged, so no caller changes."
```

**Acceptance map:**
- Tests with a mocked `submitFeedback` → every `feedback-dialog.test.tsx` case mocks `./submit-feedback`.
- A double click sends one POST → 'sends one POST on a double click, and one on two clicks in the same tick (the in-flight gate, L47-03)'.
- Send disabled for an empty message, and for a bug with no topic (with the hint shown) → 'keeps Send off for a blank message and for a bug with no area, with the hint; Kind changes by keyboard and keeps the areas'.
- Ask mode shows Skip and 'Skip is fine.' → 'in $mode mode, $dismiss, Esc and the backdrop each report $reason once' (ask case).
- Dismiss attempts while sending do nothing → 'locks Esc, the backdrop and Skip while sending, and frees them when the answer comes' (swipe: `ui/primitives/sheet.test.tsx` › 'ignores Esc, backdrop and swipe while dismissLocked').
- A success shows Sent, and closing it reports 'sent' exactly once → 'replaces the ticket with Sent…' and 'closing Sent early with %s reports sent once…'.
- A failure shows the server message and keeps the form → 'shows a failure in words and keeps the ticket, and a retry can send (L47-03)'.
- The payload never includes the seed and keeps today's fields → "sends today's payload in ask mode…".
- The End ask-once helper tests stay green → `screens/end-feedback.test.ts`, `feedback/asked-storage.test.ts` (unchanged, Step 4).
- Review: Sent closes by itself after ~1.5 s; a 15 s timeout re-enables dismiss with an error → 'replaces the ticket with Sent…' and 'keeps dismissal locked for 15 s, then unlocks it with the error; a late success sends no second sent' (Review Focus 2).
- `pnpm verify` green → Step 6.

**Decisions:**
- **Sent is the same sheet, retitled.** A success swaps the title to "Sent" and the body to the confirmation, instead of opening a second sheet. One sheet keeps the stack simple, and the 'Feedback' dialog name disappears at once, which keeps the Home and lobby send tests green unedited.
- **The timeout lives in the dialog** (not in `submitFeedback`), so the mocked tests and a real hung fetch behave the same, and no `AbortController` is needed. A late answer after the timeout is ignored, even a success: it shows no Sent (Review Focus 2). A retry may then store a second row; accepted, recorded in decisions.md.
- **Timeout copy reuses** `FEEDBACK_FALLBACK_ERROR` ('Could not save — try again'): no new string.
- **The Sent sheet has an OK** (primary, focused) so a keyboard or screen-reader user can close it at once; Esc, backdrop and swipe also close it. All report 'sent' once.
- **Kind and the chips stay live while sending**, as today; only Skip / Cancel and Send lock (parity), plus Esc / backdrop / swipe (§7.7).
- **Kind's visible caption is `aria-hidden`**: the radiogroup's `aria-label` "Kind" names it once for screen readers.
- **New `ui/` primitive `TextArea`** rather than a `multiline` TextField: TextField's props and ref are typed for `<input>`, and a union would widen them.
- **`FEEDBACK_FALLBACK_ERROR` moves** to `feedback-form-copy.ts`: `lobby-screen.test.tsx` mocks `submit-feedback` with a factory that has no constants.
- **Designer question:** Sent body "Thanks for your feedback." (default) or no line at all.
- **Designer question:** What's new item 9 suffixes (default: before "…, and Feedback closed without a word.", after "…, and Feedback shows Sent once your note is saved.").
- Strings: NEW "Thanks for your feedback."; §10.6 "Sent" (first shipped use); existing "OK" (the lobby's dismiss word) in a new place; item 9's two suffixes. Unchanged: "Feedback", "Skip is fine.", "Kind", "Bug", "Confusion", "Idea", "About", the chip labels, the hints and placeholders, "Message", "Contact (optional)", "Skip", "Cancel", "Send", "Sending…", the server error texts.

---

---

### Task L76-08: Restyle the Online and Tutorial paths

**Files:**
- Modify:
  - `apps/client/src/screens/home/nickname-field.tsx`: `NicknameField` on `TextField` (props unchanged).
  - `apps/client/src/screens/home/online-path.tsx`: V7 cards, `TextField size="lg"` for the code, `ui/primitives/button`; no `design/` import.
  - `apps/client/src/screens/home/tutorial-path.tsx`: V7, `ui/primitives/button`; no `design/` import.
  - `apps/client/src/screens/home/home-screen.tsx`: Create, Join and Start tutorial go through `useLaunchOnce` (Review Focus 3).
  - `apps/client/src/ui/primitives/text-field.tsx`: `size?: 'md' | 'lg'` (§7.1 "a large code field"); `text-field.test.tsx` +1; `primitives-gallery-demos.tsx`: the demo's "Join code" field gets `size="lg"`.
  - `DESIGN.md`, `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`, `docs/backlog_v7_test_classification.md`.
- Create: `apps/client/src/screens/home/use-launch-once.ts`.
- Test (create): `apps/client/src/screens/home/online-path.test.tsx` (5), `apps/client/src/screens/home/tutorial-path.test.tsx` (3), `apps/client/src/net/use-room-connection.tutorial.behavior.test.ts` (1).
- Delete: `apps/client/src/screens/home/home-classes.ts` (`HOME_INPUT_CLASS` has no importer left).
- Existing tests that must stay green unchanged: `screens/home/home-screen.test.tsx` (its Online tests query 'Game code' / 'Nickname' by label, Create / Join by button name, and click Join then Create once each with static props: the latch is per intent, so both still go through), `solo-path.rules.test.tsx`, `solo-path.kit-picker.test.tsx`, `home-gate.test.ts`, `ui/primitives/text-field.test.tsx` (its existing cases use the default size), `net/use-room-connection.tutorial.test.ts` and `net/use-room-connection.tutorial-hints-independence.test.ts` (the hook does not change), `App.lobby.test.tsx`, `dev/ui-gallery.test.tsx`.

**Interfaces:**
- Consumes: `TextField` (`../../ui/primitives/text-field`), `Button` (`../../ui/primitives/button`), `CHROME_SHAPE_CLASS` (`../../ui/primitives/chrome-classes`), `PathHeader` (A.2, restyled by L76-04; props as today), `ONLINE_CREATE_HELPER` (`./home-copy`), `RoomConnectionStatus` (`../../net/use-room-connection`); tests: `makeHomeProps`, `expectNoHomeIntent`, `enterHomePath`, `seedHomeStorage`, `HOME_PATH_LABEL` (`./test-home`), `STATUS_LABELS` (`../status-labels`), `HINTS_STORAGE_KEY` (`../ui/help-storage`).
- Produces:

```ts
// ui/primitives/text-field.tsx: TextFieldProps gains
  /** `lg`: the Home Join code (spec v7 §7.1 "a large code field", L76-08): Lilita at the display step, 56 px tall. Default `md`. */
  size?: 'md' | 'lg';

// screens/home/use-launch-once.ts
export const HOME_LAUNCHES = ['create', 'join', 'solo', 'tutorial'] as const;
export type HomeLaunch = (typeof HOME_LAUNCHES)[number];
/**
 * One launch per intent per connection state (Part 2 Review Focus 3). Returns `launchOnce(launch, run)`:
 * `run()` is called unless that intent already launched since `status`, `error` or `soloLaunchPending`
 * last changed. A change re-arms every intent, so a failure lets the player retry in place.
 */
export function useLaunchOnce(
  status: RoomConnectionStatus,
  error: string | null,
  soloLaunchPending: boolean,
): (launch: HomeLaunch, run: () => void) => void;
```

- [ ] **Step 1: Write the failing tests.**

Add to `apps/client/src/ui/primitives/text-field.test.tsx` (+1, inside the existing `describe`):

```tsx
  it('size lg is the large code field: Lilita at the display step, 56 px tall (spec v7 §7.1; L76-08)', () => {
    renderUi(<TextField label="Game code" size="lg" />);
    const input = screen.getByRole('textbox', { name: 'Game code' });
    expect([...input.classList]).toEqual(expect.arrayContaining(['font-v7-display', 'text-v7-display', 'min-h-14']));
    expect(input.classList.contains('text-v7-input')).toBe(false);
  });
```

`apps/client/src/screens/home/online-path.test.tsx` (5 tests):

```tsx
// @vitest-environment happy-dom
/**
 * The Online path, rendered: technical spec v7 §7.1, §5.2, §7.7 (connection errors stay inline);
 * Appendix A `home-online-path`, `home-nickname`, `home-forms-enter-submit`,
 * `home-connection-status-and-errors`, `global-text-input-no-ios-zoom`; L57-07, L51-03; Part 2 Review
 * Focus 3 (L76-08).
 */
import { screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { STATUS_LABELS } from '../status-labels';
import { HomeScreen, type HomeScreenProps } from './home-screen';
import { enterHomePath, expectNoHomeIntent, HOME_PATH_LABEL, makeHomeProps, seedHomeStorage } from './test-home';

/** App's nickname and code state, so typing reaches the fields (App.tsx owns both). */
function StatefulHome(props: HomeScreenProps): ReactElement {
  const [nickname, setNickname] = useState(props.nickname);
  const [joinCode, setJoinCode] = useState(props.joinCode);
  return (
    <HomeScreen
      {...props}
      nickname={nickname}
      joinCode={joinCode}
      onNicknameChange={(value) => {
        props.onNicknameChange(value);
        setNickname(value);
      }}
      onJoinCodeChange={(value) => {
        props.onJoinCodeChange(value);
        setJoinCode(value);
      }}
    />
  );
}
const field = (name: string): HTMLInputElement => screen.getByLabelText<HTMLInputElement>(name);
const button = (name: string): HTMLElement => screen.getByRole('button', { name });
const title = (): string => screen.getByRole('heading', { level: 1 }).textContent;
const follows = (first: Node, second: Node): boolean =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeEach(() => {
  seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: true });
});

describe('Online path (spec v7 §7.1, §5.2; L57-07)', () => {
  it('puts a 16 px Nickname outside both forms, then Create, then Join with a large code field', async () => {
    const { user } = renderUi(<HomeScreen {...makeHomeProps()} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    const nickname = field('Nickname');
    const code = field('Game code');
    const create = button('Create');
    const join = button('Join');
    expect(nickname.closest('form')).toBeNull();
    expect(['maxlength', 'autocomplete', 'placeholder'].map((name) => nickname.getAttribute(name))).toEqual(['24', 'nickname', 'Your name']);
    expect(nickname.classList.contains('text-v7-input')).toBe(true);
    expect(create.closest('form')?.contains(code)).toBe(false);
    expect(join.closest('form')).toBe(code.closest('form'));
    expect(['maxlength', 'autocomplete', 'spellcheck', 'placeholder'].map((name) => code.getAttribute(name))).toEqual(['6', 'off', 'false', 'ABCDEF']);
    expect(code.classList.contains('text-v7-display')).toBe(true);
    expect([follows(nickname, create), follows(create, code), follows(code, join)]).toEqual([true, true, true]);
    expect([create, join].map((control) => control.getAttribute('type'))).toEqual(['submit', 'submit']);
  });

  it('uppercases the code as typed; Enter in Game code joins once, and only when Join is enabled; Enter in Nickname never', async () => {
    const props = makeHomeProps();
    const { user } = renderUi(<StatefulHome {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    await user.type(field('Nickname'), 'Ada{Enter}');
    await user.type(field('Game code'), 'abcde{Enter}');
    expect(field('Game code').value).toBe('ABCDE');
    expectNoHomeIntent(props);
    await user.type(field('Game code'), 'fg'); // maxLength keeps six
    expect(field('Game code').value).toBe('ABCDEF');
    await user.type(field('Game code'), '{Enter}');
    expect(props.onJoin).toHaveBeenCalledTimes(1);
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it('a double click on Create or Join launches once; a failure re-arms both so the player retries in place (Review Focus 3)', async () => {
    const props = makeHomeProps({ nickname: 'Ada', joinCode: 'ABCDEF' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    await user.dblClick(button('Create'));
    await user.dblClick(button('Join'));
    expect([vi.mocked(props.onCreate).mock.calls.length, vi.mocked(props.onJoin).mock.calls.length]).toEqual([1, 1]);
    rerender(<HomeScreen {...props} status="failed" error='room "ABCDEF" not found' />);
    expect(screen.getByText(STATUS_LABELS.failed)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('room "ABCDEF" not found');
    expect(title()).toBe(HOME_PATH_LABEL.online);
    expect([field('Nickname').value, field('Game code').value]).toEqual(['Ada', 'ABCDEF']);
    await user.click(button('Join'));
    expect([vi.mocked(props.onCreate).mock.calls.length, vi.mocked(props.onJoin).mock.calls.length]).toEqual([1, 2]);
  });

  it('locks Nickname, Game code, Create and Join while connecting', async () => {
    const props = makeHomeProps({ nickname: 'Ada', joinCode: 'ABCDEF' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    rerender(<HomeScreen {...props} status="connecting" />);
    expect(screen.getByText(STATUS_LABELS.connecting)).toBeTruthy();
    expect([field('Nickname'), field('Game code'), button('Create'), button('Join')].map((control) => control.hasAttribute('disabled')))
      .toEqual([true, true, true, true]);
    expectNoHomeIntent(props);
  });

  it('keeps the nickname across the Online, Tutorial and Solo paths', async () => {
    const props = makeHomeProps();
    const { user } = renderUi(<StatefulHome {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'online');
    await user.type(field('Nickname'), 'Ada');
    for (const target of ['tutorial', 'solo'] as const) {
      await user.click(button('Back'));
      await enterHomePath(user, target);
      expect(field('Nickname').value).toBe('Ada');
    }
    expect(vi.mocked(props.onNicknameChange).mock.calls.at(-1)).toEqual(['Ada']);
    expectNoHomeIntent(props);
  });
});
```

`apps/client/src/screens/home/tutorial-path.test.tsx` (3 tests):

```tsx
// @vitest-environment happy-dom
/**
 * The Tutorial path, rendered: technical spec v7 §7.1 (nickname only), §5.2; Appendix A
 * `home-tutorial-path`, `home-nickname`, `home-forms-enter-submit`; L45-04, L46-03; Part 2 Review
 * Focus 3 (L76-08).
 */
import { screen } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi } from '../../test/render';
import { HomeScreen, type HomeScreenProps } from './home-screen';
import { enterHomePath, makeHomeProps, seedHomeStorage } from './test-home';

function StatefulHome(props: HomeScreenProps): ReactElement {
  const [nickname, setNickname] = useState(props.nickname);
  return <HomeScreen {...props} nickname={nickname} onNicknameChange={setNickname} />;
}
const nickname = (): HTMLInputElement => screen.getByLabelText<HTMLInputElement>('Nickname');
const start = (): HTMLElement => screen.getByRole('button', { name: 'Start tutorial' });
const otherLaunches = (props: HomeScreenProps): number[] =>
  [props.onCreate, props.onJoin, props.onStartSolo].map((fn) => vi.mocked(fn).mock.calls.length);

beforeEach(() => {
  seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: true });
});

describe('Tutorial path (spec v7 §7.1; L45-04)', () => {
  it('holds a 16 px Nickname and Start tutorial in one form; a double click starts once with no rules or kit (Review Focus 3)', async () => {
    const props = makeHomeProps({ nickname: 'Ada' });
    const { user } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'tutorial');
    expect(nickname().classList.contains('text-v7-input')).toBe(true);
    expect(start().closest('form')).toBe(nickname().closest('form'));
    expect(start().getAttribute('type')).toBe('submit');
    await user.dblClick(start());
    expect(vi.mocked(props.onStartTutorial).mock.calls).toEqual([[]]);
    expect(otherLaunches(props)).toEqual([0, 0, 0]);
  });

  it('Enter in Nickname starts the tutorial once it has a name', async () => {
    const props = makeHomeProps();
    const { user } = renderUi(<StatefulHome {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'tutorial');
    await user.type(nickname(), '{Enter}');
    expect(props.onStartTutorial).not.toHaveBeenCalled();
    await user.type(nickname(), 'Ada{Enter}');
    expect(vi.mocked(props.onStartTutorial).mock.calls).toEqual([[]]);
  });

  it('locks Nickname and Start tutorial during the launch', async () => {
    const props = makeHomeProps({ nickname: 'Ada' });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    await enterHomePath(user, 'tutorial');
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect(screen.getByText('Starting solo game…')).toBeTruthy();
    expect([nickname().hasAttribute('disabled'), start().hasAttribute('disabled')]).toEqual([true, true]);
    expect(props.onStartTutorial).not.toHaveBeenCalled();
  });
});
```

`apps/client/src/net/use-room-connection.tutorial.behavior.test.ts` (1 test):

```ts
// @vitest-environment happy-dom
/**
 * startTutorialGame over a mocked Colyseus client: L45-04, L46-03; technical spec v7 §12.1 (Owner
 * lot 76 row `net/use-room-connection.tutorial.test.ts`, L76-08). The source-text test stays beside
 * it: the hook does not change (§4.1), as with the forfeit and clear-spy behavior tests.
 */
import { CLIENT_READY, GAME_ROOM_NAME, PROTOCOL_VERSION, START_GAME } from '@card-battle/shared';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '../test/render'; // act environment and per-test cleanup (L72-06)
import { HINTS_STORAGE_KEY } from '../ui/help-storage';
import { useRoomConnection } from './use-room-connection';

const fake = vi.hoisted(() => ({
  create: vi.fn<(roomName: string, options: unknown) => void>(),
  send: vi.fn<(type: string, payload?: unknown) => void>(),
  leave: vi.fn<(consented?: boolean) => Promise<void>>(() => Promise.resolve()),
}));

vi.mock('@colyseus/sdk', () => ({
  Client: class {
    create(roomName: string, options: unknown): Promise<unknown> {
      fake.create(roomName, options);
      return Promise.resolve({
        roomId: 'TUTOR1',
        reconnectionToken: 'token',
        reconnection: { enabled: false, maxRetries: 0, maxDelay: 0, minDelay: 0 },
        send: fake.send,
        leave: fake.leave,
        onDrop: () => undefined,
        onMessage: () => undefined,
        onError: () => undefined,
        onReconnect: () => undefined,
        onLeave: () => undefined,
      });
    }
  },
}));

describe('startTutorialGame (L45-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // keeps `leave`'s resolved implementation
    localStorage.clear();
  });

  it('creates a tutorial room with the trimmed nickname, then sends START_GAME alone: no rules, kit or bot', async () => {
    const { result } = renderHook(() => useRoomConnection());
    await act(async () => {
      await result.current.startTutorialGame('  Ana  ');
    });
    expect(fake.create.mock.calls).toEqual([[GAME_ROOM_NAME, { protocolVersion: PROTOCOL_VERSION, nickname: 'Ana', tutorial: true }]]);
    expect(fake.send.mock.calls.map(([type]) => type).filter((type) => type !== CLIENT_READY)).toEqual([START_GAME]);
    expect(result.current.soloLaunchPending).toBe(true);
    expect(localStorage.getItem(HINTS_STORAGE_KEY)).toBeNull(); // L46-03: the tutorial never skips the first-game hints
  });
});
```

Test count: 10 new (text-field +1, online 5, tutorial 3, hook 1).

- [ ] **Step 2: Run them and see them fail.**

`pnpm vitest run apps/client/src/screens/home/online-path.test.tsx apps/client/src/screens/home/tutorial-path.test.tsx apps/client/src/ui/primitives/text-field.test.tsx apps/client/src/net/use-room-connection.tutorial.behavior.test.ts` → the size test fails (no `text-v7-display`: `size` is ignored; `tsc` also rejects the prop); the 16 px checks fail (the fields still carry `HOME_INPUT_CLASS`); the large-code check fails; both double-click tests count 2; the hook test **passes already** (the hook is unchanged: it is the classification replacement, not new behavior).

- [ ] **Step 3: Implement.**

1. **`text-field.tsx`:** add `size = 'md'` to the props; a module-level `const SIZE_CLASS = { md: 'min-h-11 font-v7-body text-v7-input font-bold', lg: 'min-h-14 font-v7-display text-v7-display tracking-[0.2em]' } as const;` replaces `min-h-11 … font-v7-body text-v7-input font-bold` in the input's class list (keep `w-full min-w-0 px-3 text-v7-text`, the placeholder, chrome, fill, invalid, disabled and focus classes). The header comment adds: "`size="lg"` is the Home Join code (§7.1 'a large code field', L76-08); it stays far above the 16 px floor."
2. **`use-launch-once.ts`** (header: Part 2 Review Focus 3; spec v7 §1 "an accidental tap never spends the turn"; the `screens/arena/top-bar.tsx` epoch latch, plan A.9 ruling 5, re-implemented):
   - `const [epoch, setEpoch] = useState(0)` and `const [source, setSource] = useState({ status, error, soloLaunchPending })`; while rendering, when any of the three differs from `source`: `setSource(...)` and `setEpoch(epoch + 1)` ("adjust state while rendering").
   - `const launched = useRef<Partial<Record<HomeLaunch, number>>>({})`, read and written only inside the returned function: `if (launched.current[launch] === epoch) return; launched.current[launch] = epoch; run();`.
3. **`home-screen.tsx`:** `const launchOnce = useLaunchOnce(status, error, soloLaunchPending);` then `onCreateSubmit` → `if (canSubmit) launchOnce('create', onCreate);`, `onJoinSubmit` → `if (canJoin) launchOnce('join', onJoin);`, `onTutorialSubmit` → `if (canSubmit) launchOnce('tutorial', onStartTutorial);`. `onSoloSubmit` is untouched (L76-11).
4. **`nickname-field.tsx`:** `<TextField label="Nickname" value={value} maxLength={24} autoComplete="nickname" placeholder="Your name" disabled={disabled} onChange={(event) => { onChange(event.currentTarget.value); }} />`. Header comment: "16 px through `TextField` (spec v7 §5.2, L76-08)".
5. **`online-path.tsx`** (props unchanged; header comment adds §5.2 and L76-08): `PathHeader` (unchanged call), then `<div className="mt-6 flex flex-col gap-4">` holding, in order:
   - `NicknameField` (outside both forms);
   - the Create form as a card (`${CHROME_SHAPE_CLASS} bg-v7-panel p-4 flex flex-col gap-3`): `<h2 className="font-v7-display text-v7-title leading-none text-v7-text">Create a game</h2>`, `<p className="font-v7-body text-v7-body text-v7-text-2">{ONLINE_CREATE_HELPER}</p>`, `<Button type="submit" variant="primary" disabled={!canSubmit}>Create</Button>`;
   - the Join form as the same card: `<h2>Join a game</h2>`, `<TextField label="Game code" size="lg" value={joinCode} maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABCDEF" disabled={busy} onChange={(event) => { onJoinCodeChange(event.currentTarget.value.toUpperCase()); }} />`, `<Button type="submit" variant="primary" disabled={!canJoin}>Join</Button>`.
   The submit buttons keep their self width (`self-start`).
6. **`tutorial-path.tsx`** (props unchanged): `PathHeader`, then `<form onSubmit={onTutorialSubmit} className="mt-6 flex flex-col gap-4">` with `NicknameField` and `<Button type="submit" variant="primary" disabled={!canSubmit} className="self-start">Start tutorial</Button>`.
7. `git rm` `screens/home/home-classes.ts`. Then `grep -rnE "from '[^']*(design/|bots/)" apps/client/src/screens/home/online-path.tsx apps/client/src/screens/home/tutorial-path.tsx apps/client/src/screens/home/nickname-field.tsx` prints nothing.

- [ ] **Step 4: Run them and see them pass.**

`pnpm vitest run apps/client/src/screens/home apps/client/src/ui/primitives/text-field.test.tsx apps/client/src/net apps/client/src/App.lobby.test.tsx apps/client/src/dev/ui-gallery.test.tsx` → green: `online-path.test.tsx` 5, `tutorial-path.test.tsx` 3, `use-room-connection.tutorial.behavior.test.ts` 1, the text-field file +1; `home-screen.test.tsx`, `solo-path.*.test.tsx`, `net/use-room-connection.tutorial.test.ts` unchanged and green.

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, `## Home and lobby (V7 · Lot 76)`, append:

```md
- `screens/home/online-path.tsx`, `tutorial-path.tsx`, `nickname-field.tsx` (L76-08, spec v7 §7.1, §5.2, §7.7): the V7 Online and Tutorial paths. Online: Nickname (`TextField`, 16 px) outside both forms, so Enter in it does nothing; then the Create card (`ONLINE_CREATE_HELPER`, primary Create) and the Join card with the large code field (`TextField size="lg"`: uppercased as typed, maxLength 6, autocomplete and spellcheck off, placeholder ABCDEF) and primary Join. Enter in the code submits Join only while Join is enabled. Tutorial: Nickname, then Start tutorial, in one form (Enter starts it). Busy disables the fields and the submits. A connection error stays in the path header's inline status block and the fields keep their values, so the player retries in place. `home-classes.ts` is deleted. Tests: `online-path.test.tsx`, `tutorial-path.test.tsx`.
- `screens/home/use-launch-once.ts`, `home-screen.tsx` (L76-08, Part 2 Review Focus 3; decisions.md YYYY-MM-DD): Create, Join, Start tutorial and (from L76-11) Start solo game each launch once per connection state: a second submit of the same intent before `status`, `error` or `soloLaunchPending` changes is ignored, so a double click or an Enter after a click sends one intent. A change re-arms every intent.
- `net/use-room-connection.tutorial.behavior.test.ts` (L76-08, spec v7 §12.1): `renderHook` over a mocked `@colyseus/sdk` proves `startTutorialGame` creates `{ protocolVersion, nickname (trimmed), tutorial: true }`, then sends `START_GAME` alone (no rules, kit or bot) and writes no hint storage. The source-text `use-room-connection.tutorial.test.ts` stays: the hook does not change.
```

  - Fix the L76-01 `screens/home/` bullet: replace "; `home-classes.ts` holds `HOME_INPUT_CLASS`." with ". (`home-classes.ts` was deleted by L76-08: the fields are `TextField`s.)"
  - `DESIGN.md` › Primitives › **TextField** bullet, append: "`size="lg"` (the Home Join code, L76-08): Lilita at `--type-display` (32px) with wide tracking, 56px tall."
  - `docs/agent/decisions.md`, append:

```md
## YYYY-MM-DD · [P] Home launches each intent once per connection state (L76-08)

Source: Lot 76 plan Part 2 Review Focus 3; technical spec v7 §1 ("an accidental tap never spends the turn"), §7.1, §7.7 (connection errors stay inline, retry in place); Appendix A `home-forms-enter-submit`, `global-room-connection-lifecycle`.

- A double click on Create, Join, Start tutorial or Start solo game called its callback twice: `createGame` and the solo and tutorial launches await `leaveCurrent` before they set `connecting`, so a second submit can land before the buttons grey out. `useLaunchOnce` (`screens/home/use-launch-once.ts`) records, per intent, the connection epoch it last launched in. The epoch moves whenever `status`, `error` or `soloLaunchPending` changes ("adjust state while rendering"); the ref is read only in handlers (the epoch latch of `screens/arena/top-bar.tsx`, plan A.9 ruling 5).
- Per intent, not one latch for all: a Create and a Join in the same state each go through once, as `home-screen.test.tsx` already expects. A failure (new `status` and `error`) re-arms every intent, so the player retries in place.
- `screens/home/home-classes.ts` (`HOME_INPUT_CLASS`, plan Appendix A.2) is deleted: Nickname and Game code are `TextField`s, and the Join code uses its new `size="lg"` (§7.1 "a large code field").

---
```

  - `docs/backlog_v7_test_classification.md`, Owner lot 76, row `net/use-room-connection.tutorial.test.ts`, append to its last cell: ` **Done (L76-08):** replaced by \`net/use-room-connection.tutorial.behavior.test.ts\` › 'creates a tutorial room with the trimmed nickname, then sends START_GAME alone: no rules, kit or bot'; the Home side is \`screens/home/tutorial-path.test.tsx\` › 'holds a 16 px Nickname and Start tutorial in one form; a double click starts once with no rules or kit (Review Focus 3)'. The source-text test stays beside it, because the hook does not change (as the forfeit and clear-spy rows).`
  - What's new: no change (no gameplay change; L76-04's Home item covers the new look).
  - `docs/backlog_v7.md`: `| L76-08 |` → `Done`; Progress → `| 76 · Home and lobby | 18 | 15 |`; Total done + 1.

- [ ] **Step 6: Verify and commit.**

`pnpm verify` green. Then:

```bash
git rm apps/client/src/screens/home/home-classes.ts
git add apps/client/src/screens/home/nickname-field.tsx apps/client/src/screens/home/online-path.tsx apps/client/src/screens/home/tutorial-path.tsx \
  apps/client/src/screens/home/home-screen.tsx apps/client/src/screens/home/use-launch-once.ts \
  apps/client/src/screens/home/online-path.test.tsx apps/client/src/screens/home/tutorial-path.test.tsx \
  apps/client/src/net/use-room-connection.tutorial.behavior.test.ts \
  apps/client/src/ui/primitives/text-field.tsx apps/client/src/ui/primitives/text-field.test.tsx apps/client/src/ui/primitives/primitives-gallery-demos.tsx \
  DESIGN.md docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md docs/backlog_v7_test_classification.md
git commit -m "feat(home): restyle Online and Tutorial (L76-08)" -m "Nickname and Game code are TextFields (16 px; the code uses the new
large size). Create, Join and Start tutorial launch once per connection
state, so a double click sends one intent; a failure re-arms them."
```

**Acceptance map:**
- Create needs a nickname; Join needs a nickname and a 6-character code → `home-screen.test.tsx` › 'enables Create with a nickname, and Join only with a nickname and a 6-character code' (unchanged) and `online-path.test.tsx` › 'uppercases the code as typed; Enter in Game code joins once…'.
- Enter in the Online nickname field does nothing; Enter in the code field submits Join → 'uppercases the code as typed; Enter in Game code joins once, and only when Join is enabled; Enter in Nickname never' (+ the unchanged `home-screen.test.tsx` Enter test).
- Tutorial start calls `onStartTutorial` once and sends no rules or kit → `tutorial-path.test.tsx` › 'holds a 16 px Nickname and Start tutorial in one form; a double click starts once…' and `use-room-connection.tutorial.behavior.test.ts` › 'creates a tutorial room…'.
- Inputs are disabled while busy → 'locks Nickname, Game code, Create and Join while connecting', 'locks Nickname and Start tutorial during the launch'.
- The nickname survives switching paths → 'keeps the nickname across the Online, Tutorial and Solo paths'.
- Review: connection errors stay inline status blocks → 'a double click on Create or Join launches once; a failure re-arms both so the player retries in place (Review Focus 3)'.
- `pnpm verify` green → Step 6.

**Decisions:**
- **Launch latch per intent per connection state** (Review Focus 3): one shared latch would break the unchanged `home-screen.test.tsx` case that clicks Join then Create with static props and expects one call each. Recorded in decisions.md.
- **Large code field = `TextField size="lg"`** (a `ui/` change with DESIGN.md), because `TextField` fixes the input's type size and §7.1 asks for a large code field. Lilita 32 px, 56 px tall; `autoCapitalize="characters"` added so phone keyboards start in capitals.
- **Create and Join sit in two `--panel` cards**, Nickname above both on the ground; primary buttons (each card has one action).
- **Hook test kept beside the source-text test**, as the forfeit and clear-spy precedents (the hook does not change); it also checks hint storage (L46-03).
- **No What's new rewrite:** the paths gain no new behavior a player feels beyond the look L76-04's Home item covers.
- Strings: none new or changed.

---

---

### Task L76-11: Restyle the Solo path

**Controller additions (Part 1 whole-branch review, binding; they override this task's Files, "unchanged" list, Interfaces line for `CHOOSE_KIT_LABEL`, Acceptance map and `git add` where they differ):**
- **m5 — Random only clears the Home picker flag.** `KitPickerSheet`'s contract (`kit-picker-sheet.tsx` header) says the caller clears its own open flag under Random only; `LobbyKitCard` does, `HomeScreen` does not. Add the render-time clear in `screens/home/home-screen.tsx`: `if (solo.rules.randomOnly && kitPickerOpen) setKitPickerOpen(false);` ("adjust state while rendering"). Test, appended to `screens/home/solo-path.kit-picker.test.tsx` (3 → 4): `it('turning Random only on with the picker open closes it, and turning it off never reopens it (m5)')` — open Choose kit; click the 'Table rules' strip, then 'Random' in the rules sheet (it stacks over the picker); `await waitFor` until `queryByRole('dialog', { name: 'Choose kit', hidden: true })` is null; click 'Random' again; press Escape and wait until no dialog named 'Table rules' remains (`hidden: true`); assert `queryByRole('dialog', { name: 'Choose kit' })` is null and `expectNoHomeIntent(props)`.
- **#79 — solo rules tests prove one launch.** Edit `screens/home/solo-path.rules.test.tsx` (it is NOT unchanged in this task): every case that opens and closes the rules sheet before Start asserts `expectNoHomeIntent(props)` right after the close, and every launch assertion adds `expect(props.onStartSolo).toHaveBeenCalledTimes(1)`. No other change.
- **m4 — one 'Choose kit' string.** Move `CHOOSE_KIT_LABEL = 'Choose kit'` from `screens/lobby/lobby-copy.ts` to `screens/kit-pick-copy.ts` (pin it in `screens/kit-pick-copy.test.ts`); import it from `../kit-pick-copy` in `screens/lobby/lobby-kit-card.tsx`, in `screens/lobby/kit-picker-sheet.tsx` (its `title`, today the literal "Choose kit"), and in `SoloKitCard`. `screens/lobby/lobby-kit-card.test.tsx` changes its import line only (`CHOOSE_KIT_LABEL` from `../kit-pick-copy`); its assertions stay. Tests that query the literal 'Choose kit' stay as they are. In Interfaces read `CHOOSE_KIT_LABEL` (`../kit-pick-copy`) instead of `../lobby/lobby-copy`.
- **Files and `git add` additions:** `apps/client/src/screens/kit-pick-copy.ts`, `apps/client/src/screens/kit-pick-copy.test.ts`, `apps/client/src/screens/lobby/lobby-copy.ts`, `apps/client/src/screens/lobby/lobby-kit-card.tsx`, `apps/client/src/screens/lobby/lobby-kit-card.test.tsx`, `apps/client/src/screens/lobby/kit-picker-sheet.tsx`, `apps/client/src/screens/home/solo-path.rules.test.tsx`, `apps/client/src/screens/home/solo-path.kit-picker.test.tsx`.
- **Acceptance map additions:** m5 → `solo-path.kit-picker.test.tsx` › 'turning Random only on with the picker open closes it, …'; #79 → the `solo-path.rules.test.tsx` single-launch assertions; m4 → `kit-pick-copy.test.ts` pin + the unchanged 'Choose kit' queries.

**Files:**
- Modify (rewrite): `apps/client/src/screens/home/solo-path.tsx`: V7 layout in the §7.1 order; `SoloPathProps` unchanged; no `design/` or `bots/` import.
- Create:
  - `apps/client/src/screens/home/solo-opponent-picker.tsx`: `SoloOpponentPicker` (the seat radio group around the mini table).
  - `apps/client/src/screens/home/solo-table.ts`: the stage size and seat positions (pure constants).
  - `apps/client/src/screens/home/solo-kit-card.tsx`: `SoloKitCard` (Your kit, or the Random-only line).
- Modify:
  - `apps/client/src/screens/home/home-screen.tsx`: `onSoloSubmit` goes through `launchOnce('solo', …)` (L76-08 hook).
  - `apps/client/src/screens/home/home-copy.ts`: `SOLO_OPPONENTS_LABEL`, `SOLO_DIFFICULTY_LABEL`.
  - `apps/client/src/screens/home/home-screen.test.tsx`: **one assertion split** in 'locks the solo menu while the launch is pending' (Step 1).
  - `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`.
- Test (create): `apps/client/src/screens/home/solo-path.test.tsx` (8, happy-dom), `apps/client/src/screens/home/solo-table.test.ts` (1, node).
- Existing tests that must stay green unchanged: `screens/solo-menu-seed.test.ts`; `screens/home/solo-path.rules.test.tsx` (it uses 'Play solo', the 'Table rules' strip, 'Start solo game', 'Assassin' / 'Random kit' text from the kit label: all kept); `screens/home/solo-path.kit-picker.test.tsx` ('Choose kit', `RANDOM_ONLY_SOLO_LINE`, the picker sheets: kept); `home-screen.test.tsx` except the split (its 'starts a default solo game…', seed and `KIT_PICKER_LEAD` tests keep passing: the default is 1 / Normal / Random, the seed is read at mount, and the kit card keeps `KIT_PICKER_LEAD`); `online-path.test.tsx` and `tutorial-path.test.tsx` (L76-08); `screens/lobby/*.test.tsx`.

**Interfaces:**
- Consumes:
  - L76-08: `useLaunchOnce` (`./use-launch-once`).
  - L76-09 / L76-10: `RulesStrip` (`../../ui/rules/rules-strip`, `editor` binding), `RulesEditorBinding`; `KitPickerSheet` (unchanged, still rendered by `HomeScreen`).
  - Lobby: `BOT_DIFFICULTY_OPTIONS`, `YOUR_KIT_TITLE` (`../lobby/lobby-copy`), `CHOOSE_KIT_LABEL` (`../kit-pick-copy`, moved there by m4), `lobbyKitSelectionLabel` (`../lobby/lobby-kit-picker`); `KIT_PICKER_LEAD`, `RANDOM_ONLY_SOLO_LINE` (`../kit-pick-copy`).
  - ui: `Segmented` (`../../ui/primitives/segmented`), `Button`, `Avatar` (`../../ui/primitives/avatar`), `KitPortrait` (`../../ui/kit/kit-portrait`), `Icon`, `v7SeatColor` (`../../ui/palette`), `hasCommandModifier`, `nextEnabledIndex`, `rovingKeyFor` (`../../ui/primitives/roving-focus`), `CHROME_DISC_CLASS`, `CHROME_DISABLED_CLASS`, `CHROME_FOCUS_CLASS`, `CHROME_OUTLINE_CLASS`, `CHROME_SHAPE_CLASS` (`../../ui/primitives/chrome-classes`).
  - Shared: `SOLO_OPPONENT_COUNTS`, `SoloOpponentCount`, `BotDifficulty`, `LobbyKitSelection`, `LobbyRules`.
- Produces:

```ts
// screens/home/solo-table.ts — the mini table (spec v7 §7.1; plan A.10: fits a 328 px content width)
export interface TablePoint { readonly x: number; readonly y: number } // percent of the stage
/** The stage box: `w-full max-w-[20rem] aspect-[320/216]`, so it never passes 320 px. */
export const SOLO_TABLE_STAGE = { width: 320, height: 216 } as const;
export const SOLO_TABLE_SEAT_PX = 44;
/** Bot seats 1..7 clockwise from the bottom-left, on an ellipse (centre 50/50, radii 42 % and 38 %, 45° apart). */
export const SOLO_TABLE_SEATS: Readonly<Record<SoloOpponentCount, TablePoint>> = {
  1: { x: 20.3, y: 76.9 }, 2: { x: 8, y: 50 }, 3: { x: 20.3, y: 23.1 }, 4: { x: 50, y: 12 },
  5: { x: 79.7, y: 23.1 }, 6: { x: 92, y: 50 }, 7: { x: 79.7, y: 76.9 },
};
/** The player's own seat, bottom centre (decorative). */
export const SOLO_TABLE_YOU: TablePoint = { x: 50, y: 88 };

// screens/home/home-copy.ts (added; existing words)
export const SOLO_OPPONENTS_LABEL = 'Opponents';
export const SOLO_DIFFICULTY_LABEL = 'Difficulty';

// screens/home/solo-opponent-picker.tsx
export interface SoloOpponentPickerProps {
  readonly value: SoloOpponentCount;
  /** The decorative You avatar's initial. */
  readonly nickname: string;
  readonly disabled: boolean;
  readonly onChange: (count: SoloOpponentCount) => void;
}
export function SoloOpponentPicker(props: SoloOpponentPickerProps): ReactElement;

// screens/home/solo-kit-card.tsx
export interface SoloKitCardProps {
  readonly selection: LobbyKitSelection;
  readonly randomOnly: boolean;
  /** Busy (solo launch): Choose kit is disabled (spec v7 §11, Q8). */
  readonly disabled: boolean;
  readonly onOpenKitPicker: () => void;
}
export function SoloKitCard(props: SoloKitCardProps): ReactElement;
```

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/screens/home/solo-table.test.ts` (1 test):

```ts
/** The solo mini table fits a 360 px phone: technical spec v7 §7.1; Lot 76 plan A.10 (L76-11). */
import { SOLO_OPPONENT_COUNTS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { SOLO_TABLE_SEAT_PX, SOLO_TABLE_SEATS, SOLO_TABLE_STAGE, SOLO_TABLE_YOU } from './solo-table';

describe('solo mini table (L76-11)', () => {
  it('keeps seven 44 px seats and You inside a stage no wider than 328 px, each clear of the others', () => {
    expect(SOLO_TABLE_STAGE.width).toBeLessThanOrEqual(328); // a 360 px phone's content width
    const half = SOLO_TABLE_SEAT_PX / 2;
    const centres = [...SOLO_OPPONENT_COUNTS.map((count) => SOLO_TABLE_SEATS[count]), SOLO_TABLE_YOU].map(({ x, y }) => ({
      x: (x / 100) * SOLO_TABLE_STAGE.width,
      y: (y / 100) * SOLO_TABLE_STAGE.height,
    }));
    for (const { x, y } of centres) {
      expect([x - half >= 0, x + half <= SOLO_TABLE_STAGE.width, y - half >= 0, y + half <= SOLO_TABLE_STAGE.height]).toEqual([true, true, true, true]);
    }
    const gaps = centres.flatMap((a, i) => centres.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y)));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(SOLO_TABLE_SEAT_PX + 4);
  });
});
```

`apps/client/src/screens/home/solo-path.test.tsx` (8 tests):

```tsx
// @vitest-environment happy-dom
/**
 * The Solo path, rendered: technical spec v7 §7.1, §11 (Q7 radio semantics, Q8 busy); Appendix A
 * `home-solo-path`, `solo-menu-rules`, `solo-menu-rules-side-effects`, `home-solo-play-again-seed`,
 * `home-nickname`, `home-forms-enter-submit`; L17-01, L67-01, Lot 70; Part 2 Review Focus 3 and 5 (L76-11).
 */
import { defaultLobbyRules, type LobbyRules } from '@card-battle/shared';
import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderUi } from '../../test/render';
import type { SoloMenuSeed } from '../solo-menu-seed';
import { RANDOM_ONLY_SOLO_LINE } from '../kit-pick-copy';
import { HomeScreen, type HomeScreenProps } from './home-screen';
import { enterHomePath, expectNoHomeIntent, makeHomeProps, seedHomeStorage } from './test-home';

const SEED_RULES: LobbyRules = { excludedKitIds: ['ghost'], randomOnly: false, turnTimeSeconds: 90 };
const SEED: SoloMenuSeed = { opponentCount: 3, difficulty: 'hard', kitSelection: 'assassin', lobbyRules: SEED_RULES };

async function openSolo(overrides: Partial<HomeScreenProps> = {}) {
  const props = makeHomeProps({ nickname: 'Ada', ...overrides });
  const result = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
  await enterHomePath(result.user, 'solo');
  return { ...result, props };
}
const group = (name: string): HTMLElement => screen.getByRole('radiogroup', { name });
const radios = (name: string): HTMLElement[] => within(group(name)).getAllByRole('radio');
const checked = (name: string): (string | null)[] =>
  radios(name).filter((radio) => radio.getAttribute('aria-checked') === 'true').map((radio) => radio.textContent);
const start = (): HTMLElement => screen.getByRole('button', { name: 'Start solo game' });
const kitCard = (): HTMLElement => screen.getByRole('region', { name: 'Your kit' });
const follows = (first: Node, second: Node): boolean =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

beforeEach(() => {
  seedHomeStorage({ howToPlaySeen: true, whatsNewSeen: true });
});

describe('Solo path (spec v7 §7.1, §11 Q7)', () => {
  it('lays out Nickname, Opponents, Difficulty, Your kit, Table rules and Start solo game in that order, in one form with one submit', async () => {
    await openSolo();
    const parts = [
      screen.getByLabelText('Nickname'),
      group('Opponents'),
      group('Difficulty'),
      kitCard(),
      screen.getByRole('button', { name: 'Table rules' }),
      start(),
    ];
    const form = start().closest('form');
    if (form === null) throw new Error('Start solo game is not in a form');
    expect(parts.every((part) => form.contains(part))).toBe(true);
    expect(parts.slice(1).map((part, index) => {
      const previous = parts[index];
      return previous !== undefined && follows(previous, part);
    })).toEqual([true, true, true, true, true]);
    // Parity `home-forms-enter-submit`: every other button in the solo form is type=button.
    expect(Array.from(form.querySelectorAll('button')).filter((button) => button.type === 'submit').map((button) => button.textContent))
      .toEqual(['Start solo game']);
  });

  it('picks 1 to 7 opponents on seat radios around the table (default 1): arrows change the count, and seats fill up to it', async () => {
    const { user, props } = await openSolo();
    const seats = radios('Opponents');
    expect(seats.map((seat) => seat.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(checked('Opponents')).toEqual(['1']);
    expect(seats.map((seat) => seat.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1', '-1', '-1']);
    act(() => {
      seats[0]?.focus();
    });
    await user.keyboard('{ArrowRight}');
    expect(checked('Opponents')).toEqual(['2']);
    expect(document.activeElement).toBe(within(group('Opponents')).getByRole('radio', { name: '2' }));
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(checked('Opponents')).toEqual(['7']); // wraps
    await user.click(within(group('Opponents')).getByRole('radio', { name: '4' }));
    expect(radios('Opponents').map((seat) => seat.getAttribute('data-solo-seat-filled'))).toEqual(['true', 'true', 'true', 'true', 'false', 'false', 'false']);
    await user.keyboard('{ArrowDown}');
    expect(checked('Opponents')).toEqual(['5']);
    await user.click(start());
    expect(props.onStartSolo).toHaveBeenCalledWith(5, 'normal', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('picks the shared bot difficulty on a Segmented radio group (default Normal) that changes by keyboard', async () => {
    const { user, props } = await openSolo();
    expect(radios('Difficulty').map((radio) => radio.textContent)).toEqual(['Easy', 'Normal', 'Hard']);
    expect(checked('Difficulty')).toEqual(['Normal']);
    act(() => {
      within(group('Difficulty')).getByRole('radio', { name: 'Normal' }).focus();
    });
    await user.keyboard('{ArrowRight}');
    expect(checked('Difficulty')).toEqual(['Hard']);
    await user.click(start());
    expect(props.onStartSolo).toHaveBeenCalledWith(1, 'hard', 'random', { lobbyRules: defaultLobbyRules(), includeTurnTime: false });
  });

  it('opens pre-filled from a Play again seed and applies it once', async () => {
    const props = makeHomeProps({ nickname: 'Ada', soloMenuSeed: SEED });
    const { user, rerender } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Play solo');
    expect([checked('Opponents'), checked('Difficulty')]).toEqual([['3'], ['Hard']]);
    expect(within(kitCard()).getByText('Assassin')).toBeTruthy();
    expect(within(screen.getByRole('button', { name: 'Table rules' })).getByText('90s')).toBeTruthy();
    await user.click(within(group('Opponents')).getByRole('radio', { name: '6' }));
    rerender(<HomeScreen {...props} />);
    expect(checked('Opponents')).toEqual(['6']);
    expect(props.onSoloMenuSeedApplied).toHaveBeenCalledTimes(1);
  });

  it("launches 'random' under Random only, with the dealt line in place of Your kit", async () => {
    const props = makeHomeProps({ nickname: 'Ada', soloMenuSeed: { ...SEED, lobbyRules: { ...SEED_RULES, randomOnly: true } } });
    const { user } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    expect(screen.queryByRole('region', { name: 'Your kit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Choose kit' })).toBeNull();
    expect(screen.getByText(RANDOM_ONLY_SOLO_LINE)).toBeTruthy();
    await user.click(start());
    expect(props.onStartSolo).toHaveBeenCalledWith(3, 'hard', 'random', { lobbyRules: { ...SEED_RULES, randomOnly: true }, includeTurnTime: true });
  });

  it('launches once on a double click on Start solo game or an Enter right after; a failure re-arms it (Review Focus 3)', async () => {
    const { user, props, rerender } = await openSolo();
    await user.dblClick(start());
    await user.type(screen.getByLabelText('Nickname'), '{Enter}');
    expect(props.onStartSolo).toHaveBeenCalledTimes(1);
    rerender(<HomeScreen {...props} status="failed" error="This table is full." />);
    expect(screen.getByRole('alert').textContent).toBe('This table is full.');
    await user.click(start());
    expect(props.onStartSolo).toHaveBeenCalledTimes(2);
  });
});

describe('a solo launch with a sheet open (Part 2 Review Focus 5; spec v7 §11 Q8)', () => {
  it('disables every Solo control during the launch, and the rules strip still opens', async () => {
    const { user, props, rerender } = await openSolo();
    rerender(<HomeScreen {...props} soloLaunchPending />);
    expect([...radios('Opponents'), ...radios('Difficulty')].filter((radio) => !radio.hasAttribute('disabled'))).toEqual([]);
    expect(['Opponents', 'Difficulty'].map((name) => group(name).getAttribute('aria-disabled'))).toEqual(['true', 'true']);
    expect(['Choose kit', 'Start solo game'].filter((name) => !screen.getByRole('button', { name }).hasAttribute('disabled'))).toEqual([]);
    expect(screen.getByLabelText('Nickname').hasAttribute('disabled')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Table rules' }));
    expect(within(screen.getByRole('dialog', { name: 'Table rules' })).getByRole('slider', { name: 'Human turn' }).hasAttribute('disabled')).toBe(true);
    expectNoHomeIntent(props);
  });

  it('never submits the form from the rules sheet or the kit picker it opens', async () => {
    const { user, props } = await openSolo();
    await user.click(screen.getByRole('button', { name: 'Table rules' }));
    const rules = screen.getByRole('dialog', { name: 'Table rules' });
    expect(rules.closest('form')).toBeNull();
    act(() => {
      within(rules).getByRole('button', { name: 'Ghost' }).focus();
    });
    await user.keyboard('{Enter}');
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Table rules', hidden: true })).toBeNull();
    });
    await user.click(screen.getByRole('button', { name: 'Choose kit' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Choose kit' })).getByRole('button', { name: 'Assassin' }));
    const kit = screen.getByRole('dialog', { name: 'Assassin' });
    expect(kit.closest('form')).toBeNull();
    act(() => {
      within(kit).getByRole('button', { name: 'Select this kit' }).focus();
    });
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.queryAllByRole('dialog', { hidden: true })).toHaveLength(0);
    });
    expect(within(kitCard()).getByText('Assassin')).toBeTruthy();
    expectNoHomeIntent(props);
  });
});
```

Edit in `apps/client/src/screens/home/home-screen.test.tsx` › 'locks the solo menu while the launch is pending' — replace

```ts
    expect(['Back', 'Feedback', '1', '7', 'Easy', 'Normal', 'Hard', 'Choose kit', 'Start solo game'].filter(isEnabled)).toEqual([]);
```

with

```ts
    expect(['Back', 'Feedback', 'Choose kit', 'Start solo game'].filter(isEnabled)).toEqual([]);
    // Opponents and Difficulty are radio groups since L76-11 (spec v7 §11, Q7): the same controls, role radio.
    expect(['1', '7', 'Easy', 'Normal', 'Hard'].filter((name) => !screen.getByRole('radio', { name }).hasAttribute('disabled'))).toEqual([]);
```

Why: the five controls change role (`button` → `radio`) by §11 / Q7; the assertion that every Solo control is disabled keeps its coverage.

Test count: `solo-path.test.tsx` 8, `solo-table.test.ts` 1.

- [ ] **Step 2: Run them and see them fail.**

`pnpm vitest run apps/client/src/screens/home/solo-path.test.tsx apps/client/src/screens/home/solo-table.test.ts apps/client/src/screens/home/home-screen.test.tsx` → `solo-table.test.ts` fails to load (`./solo-table` missing); the solo tests find no radiogroup 'Opponents' / 'Difficulty' (buttons today) and no region 'Your kit'; the double click counts 2; the edited `home-screen.test.tsx` case fails (no radio named '1').

- [ ] **Step 3: Implement.**

1. **`solo-table.ts`**: the Interfaces constants, header citing spec v7 §7.1 and plan A.10 (the 7-option `Segmented` measures ~346 px).
2. **`home-copy.ts`**: append the two labels (comment: existing words, now shared with tests; L76-11).
3. **`solo-opponent-picker.tsx`** (header: spec v7 §7.1 "opponents 1–7 picked by adding avatars around a mini table", §11 Q7; WAI-ARIA APG radio group; L76-11):
   - `useId` for a visible caption `<p id={labelId} className="font-v7-body text-v7-body font-extrabold text-v7-text">{SOLO_OPPONENTS_LABEL}</p>`.
   - The group: `<div ref={groupRef} role="radiogroup" aria-labelledby={labelId} {...(disabled ? { 'aria-disabled': true } : {})} data-solo-table className="relative mx-auto aspect-[320/216] w-full max-w-[20rem]">`.
   - Inside, first the decorative felt: `<span aria-hidden="true" className={\`absolute inset-x-[22%] inset-y-[26%] rounded-[50%] bg-v7-panel-2 ${CHROME_OUTLINE_CLASS}\`} />`, then the decorative You seat: `<span aria-hidden="true" className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: '50%', top: '88%' }}><Avatar name={nickname} seatIndex={0} /></span>` (position from `SOLO_TABLE_YOU`).
   - Then one seat per `SOLO_OPPONENT_COUNTS` entry `count`, in order: `<button type="button" role="radio" aria-checked={count === value} tabIndex={count === value ? 0 : -1} disabled={disabled} data-solo-seat={count} data-solo-seat-filled={count <= value ? 'true' : 'false'}>` whose only text is `{count}`, absolutely placed at `SOLO_TABLE_SEATS[count]` (`style={{ left: \`${x}%\`, top: \`${y}%\` }}`, `size-11 -translate-x-1/2 -translate-y-1/2 rounded-full font-v7-display text-v7-body leading-none`, `CHROME_FOCUS_CLASS`, `CHROME_DISABLED_CLASS`). Filled (`count <= value`): `CHROME_DISC_CLASS text-v7-text-on-cta` with inline `backgroundColor: v7SeatColor(count)` (the seat index the bot will take: you are 0). Empty: `border-2 border-dashed border-v7-text-2 bg-v7-bg-0 text-v7-text-2`. The checked seat adds `ring-[3px] ring-v7-cta ring-offset-2 ring-offset-v7-bg-0`.
   - Click: `if (count !== value) onChange(count)`. Keys: the `Segmented` model, reusing `roving-focus.ts` — ignore `hasCommandModifier(event)`; `rovingKeyFor(event.key, 'radios')`; on 'next' / 'previous' `preventDefault()`, `nextEnabledIndex(NONE_DISABLED, index, ±1)` with a module-level `const NONE_DISABLED: readonly boolean[] = SOLO_OPPONENT_COUNTS.map(() => false)` (a disabled group renders native-disabled radios, which take no keys), focus `groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[target]`, then `onChange(SOLO_OPPONENT_COUNTS[target])` (guard `undefined`).
4. **`solo-kit-card.tsx`** (header: spec v7 §7.1 "your kit card (Random default)", §7.3; mirrors `LobbyKitCard`'s Your kit and Random-only cards, but Choose kit locks while busy, Q8, unlike the lobby's while reconnecting, A.9 ruling 6):
   - `randomOnly`: `<div className={\`${CHROME_SHAPE_CLASS} bg-v7-panel p-4 flex items-center gap-3\`}><Icon name="random" className="shrink-0" /><p className="font-v7-body text-v7-body font-bold text-v7-text">{RANDOM_ONLY_SOLO_LINE}</p></div>` (no heading, as the lobby host's card).
   - Otherwise `<section aria-labelledby={titleId} className={\`${CHROME_SHAPE_CLASS} bg-v7-panel p-4\`}>`: `<h2 id={titleId} className="font-v7-display text-v7-title leading-none text-v7-text">{YOUR_KIT_TITLE}</h2>`, `<p className="mt-2 font-v7-body text-v7-body text-v7-text-2">{KIT_PICKER_LEAD}</p>`, then `<div className="mt-3 flex items-center gap-3"><KitPortrait kitId={selection} size="tile" /><div className="flex min-w-0 flex-col items-start gap-2"><p className="font-v7-display text-v7-title text-v7-text">{lobbyKitSelectionLabel(selection)}</p><Button variant="secondary" disabled={disabled} onClick={onOpenKitPicker}>{CHOOSE_KIT_LABEL}</Button></div></div>`.
5. **`solo-path.tsx`** (props unchanged; header: spec v7 §7.1, §11 Q7/Q8; L17-01, L67-01, Lot 70; L76-11): `PathHeader` (unchanged call), then `<form onSubmit={onSoloSubmit} className="mt-6 flex flex-col gap-5">` with, in this order:
   1. `NicknameField` (`disabled={busy}`);
   2. `<SoloOpponentPicker value={soloOpponents} nickname={nickname} disabled={busy} onChange={onSoloOpponentsChange} />`;
   3. a caption `<p aria-hidden="true" …>{SOLO_DIFFICULTY_LABEL}</p>` and `<Segmented<BotDifficulty> label={SOLO_DIFFICULTY_LABEL} options={BOT_DIFFICULTY_OPTIONS} value={soloDifficulty} onChange={onSoloDifficultyChange} disabled={busy} />`;
   4. `<SoloKitCard selection={soloKitSelection} randomOnly={soloRules.randomOnly} disabled={busy} onOpenKitPicker={onOpenKitPicker} />`;
   5. `<RulesStrip rules={soloRules} editor={rulesEditor} />`;
   6. `<Button type="submit" variant="primary" size="lg" disabled={!canSubmit}>Start solo game</Button>`.
   Drop the `formatBotDifficulty`, `design/components/button` and `design/components/kit-portrait` imports.
6. **`home-screen.tsx`**: in `onSoloSubmit`, `if (canSubmit) launchOnce('solo', () => { onStartSolo(soloOpponents, soloDifficulty, soloLaunchKitSelection(solo), { lobbyRules: solo.rules, includeTurnTime: solo.includeTurnTime }); });`.
7. Run `grep -rnE "from '[^']*(design/|bots/)" apps/client/src/screens/home`: it must print nothing (Part 2 constraint). If it lists a file this task does not own (`home-hub.tsx`, `path-header.tsx`, `home-art.tsx`, `home-screen.tsx`'s New control: L76-04), stop and report; do not restyle it here.

- [ ] **Step 4: Run them and see them pass.**

`pnpm vitest run apps/client/src/screens/home apps/client/src/screens/solo-menu-seed.test.ts apps/client/src/screens/lobby apps/client/src/ui/rules` → green: `solo-path.test.tsx` 8, `solo-table.test.ts` 1, `home-screen.test.tsx` (with the split), `solo-path.rules.test.tsx`, `solo-path.kit-picker.test.tsx`, `online-path.test.tsx`, `tutorial-path.test.tsx`, `solo-menu-seed.test.ts` unchanged.

- [ ] **Step 5: Docs.**
  - `docs/agent/frontend.md`, `## Home and lobby (V7 · Lot 76)`, append:

```md
- `screens/home/solo-path.tsx`, `solo-opponent-picker.tsx`, `solo-table.ts`, `solo-kit-card.tsx` (L76-11, spec v7 §7.1, §11 Q7/Q8; decisions.md YYYY-MM-DD): the V7 Solo path, one form in the §7.1 order: Nickname, Opponents, Difficulty, Your kit, the Table rules strip (L76-09), Start solo game (the only submit; every other button is `type="button"`). Opponents is a radio group (`aria-labelledby` its caption) whose seven radios are bot seats around an oval mini table in a 320×216 stage (`solo-table.ts`, so it fits a 360 px phone): seat n is checked at n opponents, seats 1…n fill in their seat hue (`v7SeatColor(n)`), the rest are dashed, the player's avatar sits at the bottom (decorative). The checked seat is the one Tab stop; arrows move and select, wrapping. Difficulty is `Segmented<BotDifficulty>` "Difficulty" with the lobby's `BOT_DIFFICULTY_OPTIONS`. `SoloKitCard` shows Your kit (the L76-03 lead, portrait, label, Choose kit) or, under Random only, `RANDOM_ONLY_SOLO_LINE`; Random only still launches 'random'. While a launch is pending every control is disabled and the strip still opens (Q8). `screens/home` imports nothing from `design/` or `bots/`. Tests: `solo-path.test.tsx`, `solo-table.test.ts`.
```

  - `docs/agent/decisions.md`, append:

```md
## YYYY-MM-DD · [P] Solo opponents are seat radios around a mini table (L76-11)

Source: technical spec v7 §7.1 ("opponents 1–7 picked by adding avatars around a mini table"), §11 (Q7: real radio semantics, Q8: busy); Lot 76 plan Appendix A.10 (the count control must fit a 328 px content width), Part 2 Review Focus 3 and 5.

- A seven-option `Segmented` needs about 346 px and its options never wrap, so it would overflow a 360 px phone. The count is a radio group "Opponents" whose seven radios are the bot seats around an oval table, inside a 320×216 px stage (`screens/home/solo-table.ts`; `solo-table.test.ts` checks every 44 px seat fits and none overlap). Seat n is checked at n opponents; seats 1…n fill in their seat hue (`v7SeatColor(n)`, the index the bot will take in `view.players`), the rest are dashed empties; the player's own avatar sits at the bottom, decorative. The radios keep the labels 1–7, so no new string.
- Keyboard: the checked seat is the only Tab stop; arrow keys move and select, wrapping (the `Segmented` model, `roving-focus.ts`); a click selects.
- Rejected: a stepper (it needs plus and minus icons and two new labels, and has no checked state for §11), and a two-row radio row (it fits but shows no table).
- Difficulty is `Segmented<BotDifficulty>` "Difficulty" with the lobby's `BOT_DIFFICULTY_OPTIONS`, so `screens/home` no longer imports `bots/`. Your kit (`SoloKitCard`) moves before the rules strip (§7.1 order); its Choose kit is disabled during a launch (Q8), where the lobby's stays live while reconnecting (A.9 ruling 6). Start solo game goes through the L76-08 launch latch.
- **Test edit.** `screens/home/home-screen.test.tsx` › 'locks the solo menu while the launch is pending' finds 1, 7, Easy, Normal and Hard by role `radio`: the same controls with radio semantics (§11, Q7). Every control is still asserted disabled.

---
```

  - What's new: no change (the Solo look is covered by L76-04's Home item; no gameplay change).
  - `docs/backlog_v7.md`: `| L76-11 |` → `Done`; Progress → `| 76 · Home and lobby | 18 | 16 |`; Total done + 1.

- [ ] **Step 6: Verify and commit.**

`pnpm verify` green; the Step 3.7 grep prints nothing. Then:

```bash
git add apps/client/src/screens/home/solo-path.tsx apps/client/src/screens/home/solo-opponent-picker.tsx \
  apps/client/src/screens/home/solo-table.ts apps/client/src/screens/home/solo-table.test.ts \
  apps/client/src/screens/home/solo-kit-card.tsx apps/client/src/screens/home/solo-path.test.tsx \
  apps/client/src/screens/home/home-screen.tsx apps/client/src/screens/home/home-copy.ts apps/client/src/screens/home/home-screen.test.tsx \
  apps/client/src/screens/home/solo-path.rules.test.tsx apps/client/src/screens/home/solo-path.kit-picker.test.tsx \
  apps/client/src/screens/kit-pick-copy.ts apps/client/src/screens/kit-pick-copy.test.ts apps/client/src/screens/lobby/lobby-copy.ts \
  apps/client/src/screens/lobby/lobby-kit-card.tsx apps/client/src/screens/lobby/lobby-kit-card.test.tsx apps/client/src/screens/lobby/kit-picker-sheet.tsx \
  docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md
git commit -m "feat(home): restyle the Solo path (L76-11)" -m "Opponents is a radio group of bot seats around a mini table (a
7-option Segmented would overflow 360 px) and Difficulty a Segmented.
Your kit sits before the rules strip (spec v7 §7.1). Start solo game
launches once per connection state. Home no longer imports design/ or
bots/."
```

**Acceptance map:**
- Count and difficulty expose their checked state and change by keyboard → 'picks 1 to 7 opponents on seat radios around the table…' and 'picks the shared bot difficulty on a Segmented radio group…'.
- Start calls `onStartSolo` with count, difficulty and kit (forced to 'random' under Random only) plus `{ lobbyRules, includeTurnTime }` → the two tests above, "launches 'random' under Random only, with the dealt line in place of Your kit", and the unchanged `home-screen.test.tsx` / `solo-path.rules.test.tsx` / `solo-path.kit-picker.test.tsx` launch tests.
- A seed opens the solo path pre-filled and is applied once → 'opens pre-filled from a Play again seed and applies it once' (+ the unchanged `home-screen.test.tsx` seed test).
- Every control is disabled while busy → 'disables every Solo control during the launch, and the rules strip still opens' and the split `home-screen.test.tsx` case.
- `solo-menu-seed.test.ts` stays green → Step 4.
- A browser check at 360×740 keeps Start reachable → controller browser check (A.9 ruling 1), recorded at L76-18; the geometry is pinned by `solo-table.test.ts`.
- Review Focus 3 (Start solo) → 'launches once on a double click on Start solo game or an Enter right after; a failure re-arms it'. Review Focus 5 → the two tests under 'a solo launch with a sheet open'.
- `pnpm verify` green → Step 6.

**Decisions:**
- **Count control = seat radios around a mini table** (recorded in decisions.md). **Designer question:** default as built; alternatives: a stepper, or a two-row radio row.
- **Seats show their number** (1–7) on the seat hue when filled, dashed when empty. **Designer question:** default numbers; alternative: a bot glyph on filled seats.
- **Your kit sits before the rules strip** (§7.1 order); the V2 menu had it after.
- **`SoloKitCard` is new**, not `LobbyKitCard`: the solo Choose kit must lock while busy (Q8; the existing test expects it), the lobby's must not (A.9 ruling 6), and Home keeps owning the `KitPickerSheet` state (A.2).
- **Start solo game is `size="lg"`** (the path's one primary action).
- **No What's new rewrite** (look only).
- Strings: none new. `SOLO_OPPONENTS_LABEL` 'Opponents' and `SOLO_DIFFICULTY_LABEL` 'Difficulty' are the V2 legends moved into constants; the radios keep '1'…'7' and 'Easy' / 'Normal' / 'Hard'.

---

---

### Task L76-17: Add the invite link

**Files:**
- Create: `apps/client/src/screens/lobby/invite-link.ts` (pure).
- Modify:
  - `apps/client/src/screens/lobby/lobby-header.tsx`: **Share** next to Copy; the result dialog gains the 'Link copied' state.
  - `apps/client/src/screens/lobby/lobby-copy.ts`: `SHARE_LABEL`, `LINK_COPIED_TITLE`, `linkCopiedBody`.
  - `apps/client/src/screens/home/home-gate.ts`: `homeMountEntry`.
  - `apps/client/src/screens/home/home-screen.tsx`: `HomeScreenProps.openOnline?: true`; the first `mode`, `howToPlayOpen` and `pendingTarget` come from `homeMountEntry`.
  - `apps/client/src/App.tsx`: the top of `GameApp` (read, strip, consume once) and the Home branch only.
  - `packages/shared/src/release-notes.ts` + `release-notes.test.ts`: the Lobby item 8 rewritten in place.
  - `docs/agent/frontend.md`, `docs/agent/decisions.md`, `docs/backlog_v7.md`.
- Test:
  - Create `apps/client/src/screens/lobby/invite-link.test.ts` (3, node).
  - Append: `apps/client/src/screens/lobby/lobby-header.test.tsx` (+6), `apps/client/src/screens/home/home-gate.test.ts` (+1), `apps/client/src/screens/home/online-path.test.tsx` (+1), `apps/client/src/App.lobby.test.tsx` (+6, a third `describe`).
- Existing tests that must stay green unchanged: the existing `lobby-header.test.tsx` cases (Copy keeps its name, its 'Code copied' / 'Copy failed' dialogs, bodies and `data-lobby-sheet="copy-result"`), `lobby-screen.reconnect.test.tsx` (Copy stays live), every other `screens/lobby/*.test.tsx`, `screens/home/*.test.tsx`, the two existing `App.lobby.test.tsx` `describe`s (their path is `/`), `App.arena.test.tsx`, `screens/admin/*.test.tsx`, `ui-switch` tests.

**Interfaces:**
- Consumes: `LobbyHeader` / `LobbyHeaderProps` (L76-12/14, unchanged props), `Button` (`icon="share"`: the icon exists), `Dialog`; `copyResultBody`, `COPY_FAILED_TITLE`, `COPY_OK_TITLE`, `COPY_RESULT_DISMISS_LABEL` (`./lobby-copy`); `HowToPlayContinueTarget`, `hasSeenHowToPlay` (`../../ui/help-storage`); `fakeRoomConnection`, the `App.lobby.test.tsx` harness (`fake`, `renderApp`, `show`); `guestLobbyView`, `makeLobbyProps`, `expectNoLobbyIntent`.
- Produces:

```ts
// screens/lobby/invite-link.ts — spec v7 §7.1, §7.2; Q28 (L76-17). Client only: the server validates codes.
export const INVITE_CODE_PARAM = 'code';
/** The server's GAME_CODE_LENGTH (apps/server/src/rooms/game-code.ts), which the client cannot import. */
export const INVITE_CODE_LENGTH = 6;
/** `{origin}/?code={code}` (the code URI-encoded). */
export function inviteLink(origin: string, code: string): string;
/** The `code` parameter uppercased and capped at 6, with no character filter; null when missing or empty. */
export function parseInviteCode(search: string): string | null;
/** `search` without the `code` parameter: '' when nothing else is left, else '?…' (keeps `ui` and the rest). */
export function searchWithoutInviteCode(search: string): string;

// screens/lobby/lobby-copy.ts (added)
/** §7.2: the lobby code card's Web Share control (L76-17). */
export const SHARE_LABEL = 'Share';
/** §10.6: the result when Share falls back to copying the invite link. */
export const LINK_COPIED_TITLE = 'Link copied';
/** NEW (designer review): the Link copied body; the link carries the code. */
export function linkCopiedBody(link: string): string; // `Share this link with friends: ${link}`

// screens/home/home-gate.ts (added)
export type HomeMountMode = 'hub' | HowToPlayContinueTarget;
export interface HomeMountEntry {
  /** The path Home shows first. */
  readonly mode: HomeMountMode;
  /** The path waiting behind a gated How to play opened at mount, else null. */
  readonly gatedTarget: HowToPlayContinueTarget | null;
}
export function homeMountEntry(input: {
  readonly soloSeed: boolean;
  readonly openOnline: boolean;
  readonly howToPlaySeen: boolean;
}): HomeMountEntry;
// soloSeed → { mode: 'solo', gatedTarget: null } (the seed skips the gate, as today)
// openOnline && howToPlaySeen → { mode: 'online', gatedTarget: null }
// openOnline && !howToPlaySeen → { mode: 'hub', gatedTarget: 'online' }
// otherwise → { mode: 'hub', gatedTarget: null }

// screens/home/home-screen.tsx: HomeScreenProps gains
  /** Invite link (L76-17, spec v7 §7.1): enter Online at mount, through the How to play soft gate. App passes it until the first room view. */
  openOnline?: true;
```

- [ ] **Step 1: Write the failing tests.**

`apps/client/src/screens/lobby/invite-link.test.ts` (3 tests):

```ts
/** The invite link: technical spec v7 §7.1, §7.2, Q28; Part 2 Review Focus 4 (L76-17). */
import { describe, expect, it } from 'vitest';

import { INVITE_CODE_LENGTH, inviteLink, parseInviteCode, searchWithoutInviteCode } from './invite-link';

describe('invite link (L76-17)', () => {
  it('builds the root URL with the code', () => {
    expect(inviteLink('https://cards.example', 'ABCDEF')).toBe('https://cards.example/?code=ABCDEF');
    expect(inviteLink('http://localhost:5173', 'QWERTY')).toBe('http://localhost:5173/?code=QWERTY');
  });

  it('reads ?code= uppercased and capped at 6, with no character filter; a missing or empty code is null (Review Focus 4)', () => {
    expect(INVITE_CODE_LENGTH).toBe(6);
    expect(parseInviteCode('?code=abcdefgh')).toBe('ABCDEF');
    expect(parseInviteCode('?code=ab')).toBe('AB');
    expect(parseInviteCode('?ui=next&code=x1-y')).toBe('X1-Y');
    expect(parseInviteCode('?code=')).toBeNull();
    expect(parseInviteCode('?ui=next')).toBeNull();
    expect(parseInviteCode('')).toBeNull();
  });

  it('strips only the code from the search string', () => {
    expect(searchWithoutInviteCode('?code=ABCDEF')).toBe('');
    expect(searchWithoutInviteCode('?code=ABCDEF&ui=next')).toBe('?ui=next');
    expect(searchWithoutInviteCode('?ui=next')).toBe('?ui=next');
    expect(searchWithoutInviteCode('')).toBe('');
  });
});
```

Append to `apps/client/src/screens/home/home-gate.test.ts` (+1; import `homeMountEntry`):

```ts
describe('homeMountEntry (L76-17; spec v7 §7.1)', () => {
  it('opens a seeded solo menu first, an invite on Online (behind the gate while unseen), else the hub', () => {
    const entry = (soloSeed: boolean, openOnline: boolean, howToPlaySeen: boolean) => homeMountEntry({ soloSeed, openOnline, howToPlaySeen });
    expect(entry(true, true, false)).toEqual({ mode: 'solo', gatedTarget: null });
    expect(entry(false, true, true)).toEqual({ mode: 'online', gatedTarget: null });
    expect(entry(false, true, false)).toEqual({ mode: 'hub', gatedTarget: 'online' });
    expect(entry(false, false, false)).toEqual({ mode: 'hub', gatedTarget: null });
    expect(entry(false, false, true)).toEqual({ mode: 'hub', gatedTarget: null });
  });
});
```

Append to `apps/client/src/screens/home/online-path.test.tsx` (+1; add `closeHomeDialog` to the `./test-home` import and `HOW_TO_PLAY_SEEN_KEY` from `../../ui/help-storage`):

```tsx
describe('invite link on Home (spec v7 §7.1; L76-17)', () => {
  it('openOnline enters Online at mount, through the How to play gate the first time', async () => {
    seedHomeStorage({ howToPlaySeen: false, whatsNewSeen: true });
    const props = makeHomeProps({ joinCode: 'ABCDEF', openOnline: true });
    const { user } = renderUi(<HomeScreen {...props} />, { reducedMotion: true });
    expect(title()).toBe('Card Battle');
    await closeHomeDialog(user, 'How to play', 'Escape');
    expect(localStorage.getItem(HOW_TO_PLAY_SEEN_KEY)).toBe('1');
    expect(title()).toBe(HOME_PATH_LABEL.online);
    expect(field('Game code').value).toBe('ABCDEF');
    expect(button('Join').hasAttribute('disabled')).toBe(true);
    expectNoHomeIntent(props);
  });
});
```

Append to `apps/client/src/screens/lobby/lobby-header.test.tsx` (+6; add `act` to the testing-library import, `afterEach` is already imported, `SHARE_LABEL`, `LINK_COPIED_TITLE`, `linkCopiedBody` to the `./lobby-copy` import, and `inviteLink` from `./invite-link`):

```tsx
describe('Share (spec v7 §7.2, Q28; L76-17)', () => {
  const link = (): string => inviteLink(window.location.origin, 'ABCDEF');
  function stubShare(share: (data: ShareData) => Promise<void>): void {
    Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: share });
  }
  async function settle(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
    });
  }
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'share');
  });

  it('hands the invite link to the Web Share sheet and shows no dialog', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>(() => Promise.resolve());
    stubShare(share);
    const { user, props } = renderLobby();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: SHARE_LABEL }));
    await settle();
    expect(share.mock.calls).toEqual([[{ url: link() }]]);
    expect(link()).toBe(`${window.location.origin}/?code=ABCDEF`);
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    expectNoLobbyIntent(props);
  });

  it('stays silent when the player cancels the share sheet', async () => {
    stubShare(() => Promise.reject(new DOMException('Share canceled', 'AbortError')));
    const { user } = renderLobby();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: SHARE_LABEL }));
    await settle();
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
  });

  it('copies the link and says Link copied where Web Share is missing, even while reconnecting', async () => {
    const { user, props } = renderLobby({ status: 'reconnecting' });
    expect('share' in navigator).toBe(false);
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await user.click(screen.getByRole('button', { name: SHARE_LABEL }));
    const dialog = await screen.findByRole('dialog', { name: LINK_COPIED_TITLE });
    expect(writeText).toHaveBeenCalledWith(link());
    expect(dialog.getAttribute('data-lobby-sheet')).toBe('copy-result');
    expect(within(dialog).getByText(linkCopiedBody(link()))).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: COPY_RESULT_DISMISS_LABEL }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: LINK_COPIED_TITLE, hidden: true })).toBeNull();
    });
    expectNoLobbyIntent(props);
  });

  it.each([
    { label: 'a share fails (not a cancel) and the link copies', share: 'fails', clipboard: 'ok', title: LINK_COPIED_TITLE },
    { label: 'Web Share is missing and the clipboard refuses', share: 'missing', clipboard: 'fails', title: COPY_FAILED_TITLE },
    { label: 'a share fails and the clipboard refuses', share: 'fails', clipboard: 'fails', title: COPY_FAILED_TITLE },
  ] as const)('still shows the code when $label', async ({ share, clipboard, title }) => {
    if (share === 'fails') stubShare(() => Promise.reject(new DOMException('Not allowed', 'NotAllowedError')));
    const { user, props } = renderLobby();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    if (clipboard === 'ok') writeText.mockResolvedValue(undefined);
    else writeText.mockRejectedValue(new Error('denied'));
    await user.click(screen.getByRole('button', { name: SHARE_LABEL }));
    const dialog = await screen.findByRole('dialog', { name: title });
    expect(writeText).toHaveBeenCalledWith(link());
    expect(dialog.textContent).toContain('ABCDEF');
    expect(within(dialog).getByText(title === LINK_COPIED_TITLE ? linkCopiedBody(link()) : copyResultBody('ABCDEF', true))).toBeTruthy();
    expectNoLobbyIntent(props);
  });
});
```

Append to `apps/client/src/App.lobby.test.tsx` a third `describe` (+6 cases; add `afterEach` to the vitest import and `HOW_TO_PLAY_SEEN_KEY` from `./ui/help-storage`):

```tsx
describe('App invite link (§7.1, §7.2, L76-17; Part 2 Review Focus 4)', () => {
  const title = (): string => screen.getByRole('heading', { level: 1 }).textContent;
  const codeField = (): HTMLInputElement => screen.getByRole<HTMLInputElement>('textbox', { name: 'Game code' });
  const home = (extra: Partial<UseRoomConnectionResult> = {}): UseRoomConnectionResult =>
    fakeRoomConnection(null, { status: 'idle', ...extra });
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, '1');
  });
  afterEach(() => {
    history.replaceState(null, '', '/');
  });

  it('?code=abcdefgh opens Online with ABCDEF in Join, strips the parameter, and joins only after a nickname', async () => {
    history.replaceState(null, '', '/?code=abcdefgh');
    const joinGame = vi.fn<UseRoomConnectionResult['joinGame']>(() => Promise.resolve());
    const { user } = renderApp(home({ joinGame }));
    expect(title()).toBe('Play online');
    expect(codeField().value).toBe('ABCDEF');
    expect(window.location.search).toBe('');
    const join = screen.getByRole('button', { name: 'Join' });
    expect(join.hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByLabelText('Nickname'), 'Ada');
    expect(joinGame).not.toHaveBeenCalled();
    await user.click(join);
    expect(joinGame.mock.calls).toEqual([['ABCDEF', 'Ada']]);
  });

  it('meets How to play first on a first visit; Skip enters Online with the code', async () => {
    localStorage.removeItem(HOW_TO_PLAY_SEEN_KEY);
    history.replaceState(null, '', '/?code=QWERTY');
    const { user } = renderApp(home());
    const howTo = screen.getByRole('dialog', { name: 'How to play' });
    expect(title()).toBe('Card Battle');
    await user.click(within(howTo).getByRole('button', { name: 'Skip' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'How to play', hidden: true })).toBeNull();
    });
    expect(title()).toBe('Play online');
    expect(codeField().value).toBe('QWERTY');
  });

  it.each(['/?code=', '/'])('%s opens the hub as usual and pre-fills nothing', async (path) => {
    history.replaceState(null, '', path);
    const { user } = renderApp(home());
    expect(title()).toBe('Card Battle');
    expect(screen.queryByRole('textbox', { name: 'Game code' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Play online' }));
    expect(codeField().value).toBe('');
  });

  it('/admin?code=ABCDEF stays the admin tool and keeps its URL', () => {
    history.replaceState(null, '', '/admin?code=ABCDEF');
    renderApp(home());
    expect(screen.getByRole('main').getAttribute('data-mode')).toBe('tool');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Insights');
    expect(screen.queryByRole('textbox', { name: 'Game code' })).toBeNull();
    expect(window.location.search).toBe('?code=ABCDEF');
  });

  it('opens Online only until the first room view: back on Home after the lobby, it is the hub', () => {
    history.replaceState(null, '', '/?code=ABCDEF');
    const result = renderApp(home());
    expect(title()).toBe('Play online');
    show(result, fakeRoomConnection(guestLobbyView()));
    expect(screen.getByRole('button', { name: 'Leave' })).toBeTruthy();
    show(result, home());
    expect(title()).toBe('Card Battle');
  });
});
```

Test count: `invite-link.test.ts` 3; +1 `home-gate.test.ts`; +1 `online-path.test.tsx`; +6 `lobby-header.test.tsx` (3 + an `it.each` of 3); +6 `App.lobby.test.tsx` cases (4 `it` + an `it.each` of 2).

- [ ] **Step 2: Run them and see them fail.**

`pnpm vitest run apps/client/src/screens/lobby/invite-link.test.ts apps/client/src/screens/lobby/lobby-header.test.tsx apps/client/src/screens/home/home-gate.test.ts apps/client/src/screens/home/online-path.test.tsx apps/client/src/App.lobby.test.tsx` → `invite-link.test.ts` fails to load (no `./invite-link`); `lobby-header.test.tsx` and `home-gate.test.ts` fail to load (missing exports); the `openOnline` Home test stays on the hub; the App `?code=` cases find the hub and an empty code (the admin and the `/` cases already pass).

- [ ] **Step 3: Implement.**

1. **`invite-link.ts`** (header: spec v7 §7.1, §7.2, Q28; Review Focus 4; client only, the server validates codes, so there is no character filter, as the Join field):
   - `inviteLink`: `` `${origin}/?${INVITE_CODE_PARAM}=${encodeURIComponent(code)}` ``.
   - `parseInviteCode`: `const raw = new URLSearchParams(search).get(INVITE_CODE_PARAM); return raw === null || raw === '' ? null : raw.toUpperCase().slice(0, INVITE_CODE_LENGTH);`.
   - `searchWithoutInviteCode`: delete the parameter from a `URLSearchParams(search)`; return `''` when `toString()` is empty, else `` `?${rest}` ``.
2. **`lobby-copy.ts`**: the three additions (Interfaces).
3. **`lobby-header.tsx`** (props unchanged; header comment adds Share, §7.2, Q28, L76-17):
   - Replace `copyOpen` + `copyFailed` with `const [resultOpen, setResultOpen] = useState(false)` and `const [result, setResult] = useState<CopyResult>({ kind: 'code' })`, where `type CopyResult = { readonly kind: 'code' } | { readonly kind: 'link'; readonly link: string } | { readonly kind: 'failed' }` (module-level, not exported). Keep the result while the dialog exits so its title does not flash.
   - `copy()` as today, now setting `{ kind: 'code' }` or `{ kind: 'failed' }`.
   - `share()`: `const link = inviteLink(window.location.origin, gameCode);` then in an async IIFE: if `'share' in navigator`, `try { await navigator.share({ url: link }); return; } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return; }` (the player closed the share sheet; any other failure falls through); then `try { await navigator.clipboard.writeText(link); setResult({ kind: 'link', link }); } catch { setResult({ kind: 'failed' }); }` and `setResultOpen(true)`.
   - Next to Copy in the code card's row: `<Button variant="secondary" icon="share" onClick={share}>{SHARE_LABEL}</Button>`. Share, like Copy, sends no intent and stays live while reconnecting (A.9 ruling 6).
   - The one `Dialog` (`data-lobby-sheet="copy-result"`, OK unchanged): title `COPY_OK_TITLE` / `LINK_COPIED_TITLE` / `COPY_FAILED_TITLE` and body `copyResultBody(gameCode, false)` / `linkCopiedBody(result.link)` / `copyResultBody(gameCode, true)` by `result.kind` (a `switch`).
4. **`home-gate.ts`**: `HomeMountMode`, `HomeMountEntry`, `homeMountEntry` (Interfaces; pure, reads no storage).
5. **`home-screen.tsx`**: add `openOnline` to the props and destructuring. Replace the first values of `mode`, `howToPlayOpen` and `pendingTarget` with one initialiser:
   `const [entry] = useState(() => homeMountEntry({ soloSeed: soloMenuSeed !== undefined, openOnline: openOnline === true, howToPlaySeen: hasSeenHowToPlay() }));` then `useState<HomeMode>(entry.mode)`, `useState(entry.gatedTarget !== null)`, `useState<HowToPlayContinueTarget | null>(entry.gatedTarget)`. A gated close then enters Online through the existing `onHowToPlayClose` / `howToPlayCloseOutcome` path. The What's new auto-open at mount is unchanged.
6. **`App.tsx`** (only the top of `GameApp` and the Home branch; never the playing / finished branches):
   - Import `parseInviteCode`, `searchWithoutInviteCode` from `./screens/lobby/invite-link`.
   - Right before `const [joinCode, setJoinCode]`:

```ts
  // Invite link (spec v7 §7.1, §7.2; L76-17): `?code=` is read once, at mount, and seeds Join. `/admin` and
  // `/dev/ui` return before GameApp, so they never read it. The effect below strips it from the URL, so a
  // reload or Back does not open it again.
  const [inviteCode] = useState(() => parseInviteCode(window.location.search));
  // Home opens on Online only until the first room view, so a Leave or a kick lands on the hub (parity
  // `home-online-path`). "Adjust state while rendering", as the phase-change clear below.
  const [inviteOpensOnline, setInviteOpensOnline] = useState(inviteCode !== null);
  if (inviteOpensOnline && view !== null) {
    setInviteOpensOnline(false);
  }
```

   - `const [joinCode, setJoinCode] = useState(inviteCode ?? '');`
   - An effect beside the other effects: `useEffect(() => { if (inviteCode === null) return; const { pathname, search, hash } = window.location; window.history.replaceState(window.history.state, '', \`${pathname}${searchWithoutInviteCode(search)}${hash}\`); }, [inviteCode]);`
   - Home branch: `{...(inviteOpensOnline ? { openOnline: true as const } : {})}` on `<HomeScreen>`.
   - The App header comment gains: "`?code=` pre-fills Join and opens Online once (L76-17)."

- [ ] **Step 4: Run them and see them pass.**

`pnpm vitest run apps/client/src/screens/lobby apps/client/src/screens/home apps/client/src/App.lobby.test.tsx apps/client/src/App.arena.test.tsx apps/client/src/screens/admin packages/shared/src/release-notes.test.ts` → green: `invite-link.test.ts` 3; `lobby-header.test.tsx` 4 + 6; `home-gate.test.ts` 3 + 1; `online-path.test.tsx` 5 + 1; `App.lobby.test.tsx` 7 + 6 = 13; everything else unchanged.

- [ ] **Step 5: Docs.**
  - **What's new (§10.4): rewrite item 8 (Lobby) in place** in `packages/shared/src/release-notes.ts`:
    - before: `'The lobby was a plain list, only the host could open the table rules, and friends had to type the code.'`
    - after: `'The lobby shows each seat in its player color, everyone can open the table rules, and Share sends a link that fills in the code.'`
    Update item 8 in the `release-notes.test.ts` › 'writes lot-72-v7 as the New look entry…' `toEqual` to the same strings. No count changes.
  - `docs/agent/frontend.md`:
    - `## Home and lobby (V7 · Lot 76)`, append:

```md
- `screens/lobby/invite-link.ts`, `lobby-header.tsx` (L76-17, spec v7 §7.2, §10.6, Q28; decisions.md YYYY-MM-DD): the code card has Copy and **Share**. Share passes `inviteLink(origin, code)` (`{origin}/?code=XXXXXX`) to `navigator.share({ url })` when the browser has it; a cancel (`AbortError`) is silent. Without Web Share, or when it fails otherwise, Share copies the link and the copy-result Dialog says "Link copied" ("Share this link with friends: {link}"); a refused clipboard shows "Copy failed" with the code. Share sends nothing and stays live while reconnecting. Tests: `invite-link.test.ts`, `lobby-header.test.tsx`.
- `App.tsx`, `screens/home/home-screen.tsx`, `home-gate.ts` (L76-17, spec v7 §7.1, Part 2 Review Focus 4): `GameApp` reads `?code=` once, in a `useState` initialiser (`parseInviteCode`: uppercased, capped at 6, no character filter; missing or empty is ignored), seeds `joinCode`, and strips it with `history.replaceState` (other parameters stay). It passes `openOnline` to Home until the first room view, so Home enters Online through the How to play soft gate (`homeMountEntry`; a solo Play again seed still wins) and a Leave or a kick lands on the hub. Nothing joins by itself: Join waits for a nickname. `/admin` and `/dev/ui` never read it. Tests: `App.lobby.test.tsx` › 'App invite link…', `home-gate.test.ts`, `online-path.test.tsx`.
```

    - The L76-12 `lobby-header.tsx` bullet: "The card has Copy (`navigator.clipboard.writeText`) and the V7 copy-result Dialog ('Code copied' / 'Copy failed'; both bodies keep the code)" → "The card has Copy (`navigator.clipboard.writeText`), Share (L76-17) and the V7 copy-result Dialog ('Code copied' / 'Link copied' / 'Copy failed'; every body keeps the code)".
    - The Screens table: the Home row "When" cell gains "; `?code=` opens Online with Join pre-filled"; the Lobby row gains "code Copy / Share".
    - The What's new paragraph's "Eighth item: Lobby item (L76-09, rewritten by L76-12): the lobby shows each seat in its player color, and everyone can open the table rules." → "Eighth item: Lobby item (L76-09, rewritten by L76-12 and L76-17): the lobby shows each seat in its player color, everyone can open the table rules, and Share sends a link that fills in the code."
  - `docs/agent/decisions.md`, append:

```md
## YYYY-MM-DD · [P] An invite link opens Join through the soft gate, once (L76-17)

Source: technical spec v7 §7.1 (`?code=XXXXXX` pre-fills Join; client only; nickname still required), §7.2 (Share: Web Share, else copy a link), §10.6 ("Link copied"), §13 Q28; Lot 76 plan L76-17 Review line, Appendix A.10, Part 2 Review Focus 4.

- **Link.** `inviteLink(origin, code)` = `{origin}/?code={code}` (`screens/lobby/invite-link.ts`). Share calls `navigator.share({ url })` when the browser has it; a cancel (`AbortError`) is silent. Without Web Share, or when it fails for another reason, Share copies the link and shows "Link copied" ("Share this link with friends: {link}"); a refused clipboard shows the existing "Copy failed" with the code, so every failure still shows the code. Share sends nothing and stays live while reconnecting, as Copy.
- **Read once.** `GameApp` reads `?code=` in a `useState` initialiser: uppercased, capped at 6, no character filter (the server validates, as for the Join field); a missing or empty value is ignored. It seeds `joinCode`, and an effect strips `code` with `history.replaceState` (other parameters, such as `ui`, stay), so a reload or Back does not open it again. `/admin` and `/dev/ui` return before `GameApp` and never read it.
- **Online once.** App passes `openOnline` to Home only until the first room view, so a Leave or a kick lands on the hub (parity `home-online-path`: "After a kick: Home remounts on the hub"). Home enters Online through the How to play soft gate (`homeMountEntry`); a solo Play again seed still wins. Nothing joins by itself: Join stays disabled until a nickname is typed.
- What's new at mount is unchanged: when the latest entry is unseen it opens above the gated How to play, as it does over a seeded solo menu.

---
```

  - `docs/backlog_v7.md`: `| L76-17 |` → `Done`; Progress → `| 76 · Home and lobby | 18 | 17 |`; Total done + 1.

- [ ] **Step 6: Verify and commit.**

`pnpm verify` green. Then:

```bash
git add apps/client/src/screens/lobby/invite-link.ts apps/client/src/screens/lobby/invite-link.test.ts \
  apps/client/src/screens/lobby/lobby-header.tsx apps/client/src/screens/lobby/lobby-header.test.tsx apps/client/src/screens/lobby/lobby-copy.ts \
  apps/client/src/screens/home/home-gate.ts apps/client/src/screens/home/home-gate.test.ts \
  apps/client/src/screens/home/home-screen.tsx apps/client/src/screens/home/online-path.test.tsx \
  apps/client/src/App.tsx apps/client/src/App.lobby.test.tsx \
  packages/shared/src/release-notes.ts packages/shared/src/release-notes.test.ts \
  docs/agent/frontend.md docs/agent/decisions.md docs/backlog_v7.md
git commit -m "feat(lobby): add the invite link (L76-17)" -m "Share sends {origin}/?code=XXXXXX through Web Share, else copies it
(Link copied). App reads ?code= once, strips it, pre-fills Join and
opens Online through the soft gate until the first room view."
```

**Acceptance map:**
- The link helper builds the root URL with the code → `invite-link.test.ts` › 'builds the root URL with the code'.
- The parse helper uppercases, caps at 6 and ignores a missing parameter → 'reads ?code= uppercased and capped at 6, with no character filter; a missing or empty code is null (Review Focus 4)'.
- Share calls `navigator.share` with the link when it exists, falls back to the clipboard otherwise, and both failure paths still show the code → `lobby-header.test.tsx` › 'hands the invite link to the Web Share sheet…', 'stays silent when the player cancels…', 'copies the link and says Link copied where Web Share is missing…', 'still shows the code when $label' (3).
- Loading with `?code=` puts the code in Join, and Join stays disabled until a nickname is typed → `App.lobby.test.tsx` › '?code=abcdefgh opens Online with ABCDEF in Join, strips the parameter, and joins only after a nickname'.
- `/admin?code=` is unaffected → '/admin?code=ABCDEF stays the admin tool and keeps its URL'.
- Review: Online with Join pre-filled, soft gate first, stripped from the URL; Share falls back to copying the link with "Link copied" → the App cases above, 'meets How to play first on a first visit; Skip enters Online with the code', `online-path.test.tsx` › 'openOnline enters Online at mount, through the How to play gate the first time'.
- Review Focus 4 (junk, empty, missing, admin, no auto-join) → the parse test, '%s opens the hub as usual and pre-fills nothing' (2) and the cases above.
- `pnpm verify` green → Step 6.

**Decisions:**
- **`openOnline` lasts until the first room view** (App state), not every Home render: otherwise a kicked guest would land on Online, against parity `home-online-path`.
- **Strip only when a code was read**: a bare `?code=` stays in the URL (harmless; nothing is read from it).
- **A non-cancel Web Share failure falls back to copying the link**, so both failure paths end on a dialog that shows the code (Link copied with the link, or Copy failed with the code).
- **`navigator.share` gets `{ url }` only** (no title or text): no new strings. **Designer question:** add a title such as 'Card Battle'?
- **What's new at mount is unchanged** over an invite link. **Designer question:** suppress it over the gate (default: unchanged).
- **Designer question:** "Link copied" body "Share this link with friends: {link}" (default), parallel to the Copy body.
- **Designer question:** item 8 wording (default above).
- Strings: §7.2 "Share" (`SHARE_LABEL`); §10.6 "Link copied" (`LINK_COPIED_TITLE`); NEW "Share this link with friends: {link}" (`linkCopiedBody`); item 8 rewritten (before / after above). Reused: "OK", "Copy failed", "Could not copy automatically. Game code: {code}".

---

---

### Task L76-18: Run the Lot 76 browser and design gate

Controller-run (A.9 ruling 1): the controller drives the browser and Impeccable; fixes go to one fix subagent per defect class, each committed under the task id that owns the defect (`fix(lobby): … (L76-12)`). The gate's own record is one docs commit.

**Files:** `docs/agent/frontend.md`, `docs/backlog_v7.md`, `docs/technical_spec_v7_parity.md` (sweep), `docs/agent/decisions.md` (only for a gate ruling), `.impeccable/config.json` (only for a designer-approved ignore), plus the files the fix waves touch.

- [ ] **Step 1: Lot 76 whole-branch review and its fix wave.** Review `0b4ff56f..HEAD` on the most capable model with the ledger's deferred minors. ONE fix dispatch carries its findings plus the Part 1 final-review items routed here: m1 (lock Sit here while reconnecting: `locked={status === 'reconnecting'}` from App's shared `claimDialog` const, Stay stays live), m3 (stale comments in `lobby-kit-picker.ts:3`, `test-lobby.ts:66`, `lobby-ready.ts:2`, `DESIGN.md` › Kit "stay until L75 and L76"), #81 (`rules-sheet.tsx:10` and DESIGN.md › Rules › Sheet "no editable control" wording), #88 (DESIGN.md "No icon on its own color" lists and the frontend.md Icons bullet: `action` and `check` on `--cta`, `attack` on `--danger`/`--life`), #100 (a test that the Kick confirm opens with focus on Cancel), #107 (DESIGN.md › Chat: the V6 chat-log stays "until L75 deletes the classic table"), #137 (clear the claim sheet's `picked` while rendering when it leaves the set). One scoped re-review.
- [ ] **Step 2: Browser gate** (built-in browser; server `PORT=2667 TURN_DURATION_MS=300000 RECONNECT_GRACE_MS=5000`, client `VITE_SERVER_URL=http://localhost:2667 vite --port 5273 --strictPort`, from temporary `.claude/launch.json` entries reverted afterwards; never ports 2567 / 5173). Viewports 360×740, 375×812, 390×844, 844×390, 1440×900; a host tab, a guest tab, a walk-in tab.
  - Home: hub (fan static under reduced motion, no horizontal scroll, scrolls inside `#root`), How to play gated and manual (swipe, chevrons, every close path), What's new auto and history, Feedback through Sent (auto-close) and an error, Online create and join, a `?code=` link end to end (How to play first, then Online with the code, URL stripped), Solo with rules ('Server default' readout at 320–360) and a kit, Tutorial start.
  - Lobby at 2, 4 and 8 seats as host, guest and walk-in: rules strip and editor, guest toasts (incl. the timer when a second notice lands), kit picker (excluded while previewing), chat (16 px, collapse keeps the draft; check whether a reader scrolled up keeps the scroll position — ledger #108 — and correct `lobby-chat-panel.tsx`'s comment and add a short decisions note if not), claim sheet and Claim a seat reopen, Kick, the inline alert with OK (look at 360 and 1440), reconnect lock if a drop can be produced (otherwise record "not exercised").
  - Classic table (default `ui`) and a tutorial room: open '?' How to play and '!' Feedback while a your-turn flash and a hint or coach card show. Since L76-06/07 they are V7 sheets on `Z_INDEX.sheet` (50), under the classic your-turn flash (z-90/91), the hint card (z-105) and the coach panel (z-110); record what paints on top and whether every control stays reachable, and hand anything left to L75-09/L75-11 in the gate entry.
  - Every focusable text field computes ≥ 16 px; reduced motion honoured.
  - Copy the Part 1 controller pass (ledger, room WYMASR) into the record.
- [ ] **Step 3: Design gate.** Run the Impeccable detector on the Lot 76 files (`screens/home/**`, `screens/lobby/**`, the rewritten shared dialogs, `ui/rules/**`, the new `ui/` primitives and icons); fix every finding (an ignore needs the designer, except the pre-approved `ui/tokens.css` halos). Run an Impeccable `critique` of Home and the lobby and record its score and top items. Designer items for the PR: the action/attack/check glyphs (#89), one Q39 decision for the reason-less locks (Select this kit, Start/Ready/Kick while reconnecting, Sit here with no pick — #90, #116, #139; reusing `STATUS_LABELS.reconnecting` needs no new string), the toast timer (#122), the inset alert ring (ruling), and Appendix B Part 2 strings.
- [ ] **Step 4: Docs and bookkeeping.**
  - `docs/agent/frontend.md`: a `### Lot 76 verified YYYY-MM-DD (browser, …, PROTOCOL 45)` entry after the Lot 74 one, with room codes, viewports, results, fixes (commit ids) and what was not exercised; update the V6 first-time gate steps that V7 changed.
  - `docs/technical_spec_v7_parity.md`: sweep the rows whose Files / Keep / Notes lines name moved or rewritten code (ledger #53: lines 42, 269, 3818 and the `home.tsx` / `lobby.tsx` / `lobby-rules-panel.tsx` / `lobby-kit-picker-dialog.tsx` mentions; plus the rows Part 2 planners listed: `home-whats-new`, `home-beta-badge`, `home-hub`, `home-how-to-play-dialog`, `global-feedback-dialog`, `feedback-dialog-dismiss`, `home-solo-path`, `home-online-path`, `lobby-game-code`, `global-app-router`). Point each at the new file; never rewrite a dated history entry.
  - Confirm with `git ls-files` that `screens/home.tsx`, `screens/lobby.tsx`, `screens/lobby-rules-panel.tsx` and `screens/lobby-kit-picker-dialog.tsx` are gone and that `screens/whats-new-dialog.tsx` and `screens/claim-seat-dialog.tsx` are the V7 rewrites; every Owner-lot-76 classification row carries its Done note.
  - `docs/backlog_v7.md`: the row that starts `| L76-18 |` → `Done`; Progress `| 76 · Home and lobby | 18 | 18 |`; Total + 1.
- [ ] **Step 5: Verify and commit.** `pnpm verify`; `git add` the docs by name; `git commit -m "docs(v7): record the Lot 76 gate (L76-18)"`.
- [ ] **Step 6: PR.** Only on the developer's explicit yes: push the branch and open ONE ready-for-review PR into `dev` (AGENTS.md §10; no AI attribution), listing the designer items, every new or changed string (Appendix B), the Lot 75 coordination notes and the gate record.

**Acceptance map:** gate notes and room codes → Step 4 frontend.md entry; every defect fixed, re-verified and committed under its task id → Steps 1–3; old files gone → Step 4 `git ls-files`; design gate passed or noted → Step 3; `pnpm verify` → Step 5; PR ready for review → Step 6 (on the developer's yes).

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

### A.10 Part 2 contract (L76-04 … L76-18)

- **Home files keep their A.2 names.** L76-04 may add components under `screens/home/` (for example `home-card-fan.tsx` `HomeCardFan`, `home-mode-tile.tsx` `HomeModeTile`, `home-header.tsx` for Beta + New); it lists every new export in its Interfaces block, and later tasks consume them by those names.
- **Hub (L76-04, §7.1):** `.v7-ground` `main` stays the scroll container (`relative h-full overflow-y-auto overscroll-contain`, no `100dvh`); the wordmark shows 'CARD BATTLE' while the `<h1>` accessible name stays 'Card Battle'; the card fan is `aria-hidden` and static under reduced motion (`data-motion`); three mode tiles named exactly 'Play solo', 'Play online', 'Tutorial' (buttons, soft gate unchanged); secondary 'How to play' and 'Feedback'; top-right 'Beta' and the New control named "What's new" / "What's new (unread)" with a decorative unread dot; New disabled while `soloLaunchPending` (and keeps its unread name); every hub control and the path Back / Feedback disabled while busy; no Inbox / Admin / protocol / Reset help control.
- **WhatsNewDialog (L76-05):** props unchanged (`open`, `onClose`, `scope`); a V7 sheet (`Sheet` read-only or `Dialog`); `onClose` is called once per dismissal path (Got it, Esc, backdrop, swipe-down) — Home's `closeWhatsNew` marks seen.
- **HowToPlayDialog (L76-06):** props unchanged (`open`, `onClose(reason: 'skip' | 'got-it' | 'dismiss')`); one `Carousel` slide per `HOW_TO_PLAY_SECTIONS` entry (9), copy verbatim; Skip → 'skip', Got it → 'got-it', Esc / backdrop / swipe → 'dismiss'; no `<img>` without a file; reduced motion turns off the slide.
- **FeedbackDialog (L76-07):** props unchanged (`open`, `mode`, `screen`, `nickname?`, `gameCode?`, `playKind?`, `actionLog?`, `onDismiss(reason: 'skip' | 'cancel' | 'sent')`); Kind as a radio group (`Segmented`), About chips `aria-pressed`, `TextField`/textarea at 16 px; dismissal locked while sending; 'Sent' confirmation that closes by itself after ~1.5 s (`onDismiss('sent')` once); 15 s client timeout re-enables dismissal with an error; payload unchanged (never the seed).
- **Online / Tutorial (L76-08):** nickname and game code through `TextField` (labels 'Nickname' and 'Game code' unchanged, so `getByLabelText` keeps working); the code field uppercases, `maxLength` 6, autocomplete/spellcheck off, placeholder 'ABCDEF'; Enter in the Online nickname field does nothing, Enter in the code field submits Join only when enabled.
- **Solo (L76-11):** the opponent count control must fit a 328 px content width (a 7-option `Segmented` measures ~346 px: map-ui fact 6) — the count is a seat-radio group around a mini table (`screens/home/solo-opponent-picker.tsx`, `solo-table.ts`; L76-11 decisions.md); difficulty is `Segmented<BotDifficulty>` named 'Difficulty'; `SoloPath` keeps `rulesEditor: RulesEditorBinding` (L76-09) and `KitPickerSheet disabled={busy}` (L76-10); the Random-only line is `RANDOM_ONLY_SOLO_LINE`.
- **Invite link (L76-17):** pure `screens/lobby/invite-link.ts` with `inviteLink(origin: string, code: string): string` (`{origin}/?code=XXXXXX`) and `parseInviteCode(search: string): string | null` (uppercase, cap 6, null when missing or empty); `LobbyHeader` gets a 'Share' button next to Copy (Web Share when `navigator.share` exists, a user cancel is silent; else copy the link and show a 'Link copied' result dialog; both failure paths show the code); App reads the parameter once at `GameApp` mount (`useState` initialiser), seeds `joinCode`, strips `code` with `history.replaceState`, and passes `HomeScreenProps.openOnline?: true` so Home enters the Online path through the soft gate at mount; `/admin` and `/dev/ui` ignore it. App edits stay outside the playing / finished branches.
- **Gate (L76-18):** controller-run (browser + Impeccable); it records 'Lot 76 verified' in `frontend.md`, sweeps the parity rows naming moved files, applies the final-review fix wave, and confirms `screens/home.tsx`, `screens/lobby.tsx`, `screens/lobby-rules-panel.tsx`, `screens/lobby-kit-picker-dialog.tsx` are gone and the What's new and claim dialogs are the V7 rewrites.

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

### Part 2 — Domain P2-A (L76-04, L76-05, L76-06)

#### Designer questions (with defaults)

1. **Mode tile art** (§5.5 extracted art): Play solo = the Scientific kit, Play online = the Assassin kit, Tutorial = the Basic Attack card.
2. **Card fan:** five base faces, Spy, Strong Attack, Basic Attack, Mirror, Shield, tilted and floating out of phase (3.2 s mirrored, 8 px). No upgraded sheen. Super Regeneration is left out because a test pins that no release copy shows outside What's new.
3. **Hub details:**
   - The tiles follow §7.1 order (Solo, Online, Tutorial; V6 had Online first).
   - The 'Turn-based card battle' eyebrow sits under the wordmark as a tagline.
   - The wordmark is `--text` with a 3 px ink outline and hard shadow, 32 px on phones and 48 px from `sm`.
   - The paths show no art.
   - The New unread dot is `--cta` (the IconButton count badge), not red.
4. **How to play card renders:** **Answered 2026-11-03: icons and card renders** (four slides; see L76-06's designer-answer block).
5. **How to play initial focus:** the Previous chevron (the Sheet default), not Got it.
6. **What's new item 9 copy:** L76-04 'Home was a plain menu.' → 'Home has the new look, with a big tile for each way to play.'; L76-06 rewrites it to 'Home was a plain menu, and How to play was one long page.' → 'Home has the new look, and How to play is a deck of cards you swipe through.'

#### New or changed strings

- What's new `lot-72-v7` item 9 (Home), added by L76-04 and rewritten by L76-06 (texts in designer question 6).
- How to play chevron names 'Previous' / 'Next': reused from the admin pager, new on this surface.
- No other new or changed visible string. These are kept verbatim: 'Beta', 'New', "What's new" / "What's new (unread)", 'Turn-based card battle', 'Card Battle', the tile labels, the helper line, 'Back', 'Feedback', 'How to play', 'Got it', 'Latest', 'Before.', 'After.', 'Skip', 'This is a short primer — not the full rules.', every How to play body and caption.

### Part 2 — Domain P2-B (L76-07, L76-08, L76-11, L76-17)

#### Designer questions (with defaults)

- **L76-07:** the Sent body line "Thanks for your feedback." (default) or none; the Sent sheet's OK (default: shown and focused); Sent auto-closes after 1.5 s (Review line); the 15 s timeout reuses 'Could not save — try again' (default) and ignores a late success (a retry may store a duplicate row); What's new item 9 suffixes: before "…, and Feedback closed without a word.", after "…, and Feedback shows Sent once your note is saved."
- **L76-08:** the large Join code field is Lilita 32 px, 56 px tall, wide tracking (default).
- **L76-11:** the opponent count is seat radios around a mini table (**answered 2026-11-03: seat radios around a mini table**) vs. a stepper or a two-row radio row; filled seats show their number on the seat hue (default) vs. a bot glyph; Your kit before the rules strip (§7.1 order, default).
- **L76-17:** `navigator.share` gets the URL only (default) or also a title; the "Link copied" body "Share this link with friends: {link}" (default); a non-cancel share failure copies the link instead (default); What's new still auto-opens over an invite link's gate (default: unchanged); item 8: before "The lobby was a plain list, only the host could open the table rules, and friends had to type the code.", after "The lobby shows each seat in its player color, everyone can open the table rules, and Share sends a link that fills in the code."

#### New or changed strings

- **L76-07:** "Sent" (§10.6, `FEEDBACK_SENT_TITLE`); NEW "Thanks for your feedback." (`FEEDBACK_SENT_BODY`); "OK" (existing word, `FEEDBACK_SENT_DISMISS_LABEL`); What's new item 9: the two suffixes above (the rest of the item is L76-04's). Unchanged and reused: "Feedback", "Skip is fine.", "Kind", "Bug" / "Confusion" / "Idea", "About", the chip labels, hints and placeholders, "Message", "Contact (optional)", "Skip", "Cancel", "Send", "Sending…", "Could not save — try again".
- **L76-08:** none.
- **L76-11:** none ("Opponents", "Difficulty", "1"…"7", "Easy" / "Normal" / "Hard" are the V2 words, moved into `home-copy.ts` constants where new).
- **L76-17:** "Share" (§7.2, `SHARE_LABEL`); "Link copied" (§10.6, `LINK_COPIED_TITLE`); NEW "Share this link with friends: {link}" (`linkCopiedBody`); What's new item 8 rewritten (before / after above).

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

### C.4 Part 2 consistency rulings (controller, 2026-11-03)

#### Part 2 — from domain P2-A (L76-04, L76-05, L76-06)

- P2A-1 (issue 1): New is disabled only during a solo launch (spec v7 §11 / Q8), not whenever `status === 'connecting'`; the L76-01 'leaves New live' connecting assertion stays and a solo-launch test is added. Accepted.
- P2A-2 (issue 2): `HomeArt` becomes the hub-only card fan inside `HomeHub`; the only new Home export is `WhatsNewControl`. Accepted; A.10 names are examples, not requirements.
- P2A-3 (issue 4): the rendered What's new tests cannot sit in `whats-new-dialog.test.tsx` beside `whats-new-dialog.test.ts` (docs/agent/testing.md: never the same basename) → renamed `screens/whats-new-dialog.sheet.test.tsx` in the plan (controller edit).
- P2A-4 (issue 5): `screens/use-once-per-open.ts` and `test/sheet-gestures.ts` accepted as shared modules (L76-07 reuses them).
- P2A-5 (issue 6): `closeHomeDialog` switches to `hidden: true` waits in L76-05. Accepted.

#### Part 2 — from domain P2-B (L76-07, L76-08, L76-11, L76-17) and the Part 1 final review

- P2B-1 (issue 1, 9): two Part 1 Home test queries change role only (Kind 'button' → 'radio' in L76-07; Opponents/Difficulty → 'radio' in L76-11), assertions unchanged, recorded in decisions.md. Accepted (§11 / Q7 / Q71 radio semantics).
- P2B-2 (issues 2, 3): `ui/primitives/text-area.tsx` (`TextArea`) in L76-07 and `TextField size?: 'md' | 'lg'` in L76-08, each with DESIGN.md + gallery. Accepted.
- P2B-3 (issue 4): L76-08 deletes `screens/home/home-classes.ts`. Accepted.
- P2B-4 (issue 5): the launch latch is per intent per connection epoch (`screens/home/use-launch-once.ts`). Accepted.
- P2B-5 (issue 6, 7): extra invite exports; `openOnline` passed only until the first room view (a kick/leave must remount Home on the hub). Accepted.
- P2B-6 (issue 8): `FEEDBACK_FALLBACK_ERROR` moves to `feedback-form-copy.ts`. Accepted.
- P2B-7: item 9 — L76-04 appends, L76-06 rewrites, L76-07 appends its suffixes to whatever stands (both planners agree). Final count 9.
- P2B-8: L76-11 carries the Part 1 final-review items m5, #79, m4 (controller block added to its task text); L76-07 is told to reuse L76-05's `use-once-per-open.ts` / `test/sheet-gestures.ts`.

### C.5 Part 2 planner domain reports (contract issues and cross-task notes, as written; C.4 resolves them)

#### Domain P2-A

##### Contract issues

1. **"L76-04 flips the L76-01 test that leaves New live while busy"** (Part 2 header and domain notes). That test's busy case is `status: 'connecting'`. Spec v7 §11 and §13 Q8 disable New only during a solo launch, so the plan keeps that assertion (comment only) and adds a solo-launch test (New disabled, unread name and dot kept). If the controller reads Q8 as "New disabled whenever busy", flip that one assertion and pass `disabled={busy}` to `WhatsNewControl`; nothing else changes.
2. **A.2 / A.10 names:** `home-art.tsx` keeps `HomeArt` and `BetaCard`. `HomeArt` is now the hub-only card fan, rendered by `HomeHub` instead of `HomeScreen`. The only new Home export is `WhatsNewControl` (`whats-new-control.tsx`); the tile is a module-private component of `home-hub.tsx` (no `home-mode-tile.tsx`, no `home-header.tsx`).
3. **Classification row 233** says the current scope shows "the 'Latest' label". V6 and the L76-05 brief show 'Latest' only under the first history title; the plan keeps that, and the row's Done note says so.
4. **Two What's new test files.** The catalog pins stay in `screens/whats-new-dialog.test.ts`, because the Part 2 header has later appends (L76-07, L76-17) update "the `whats-new-dialog.test.ts` length pin". The rendered dialog tests go to a new sibling `screens/whats-new-dialog.sheet.test.tsx`.
5. **Additive shared modules outside A.10:** `screens/use-once-per-open.ts` (the per-open dismissal latch, A.9 ruling 5, used by What's new and How to play) and `test/sheet-gestures.ts` (`stubPhoneViewport`, `swipeSheetDown`, `swipeCarouselTo`).
6. **`closeHomeDialog`** (L76-01 helper) waited with the non-hidden `queryByRole`, which returns at once for an exiting V7 sheet. L76-05 switches it to `hidden: true` (Part 2 rule) and adds `'swipe'`.

##### Cross-task notes (anything another domain's task must know)

- **L76-07 (Feedback):**
  - `useOncePerOpen` (`screens/use-once-per-open.ts`) can latch the one 'sent' report and the dismissal paths.
  - `test/sheet-gestures.ts` gives the phone viewport and the swipe for the Feedback sheet tests.
  - `closeHomeDialog(user, 'Feedback', 'Cancel' | 'swipe')` works on a V7 sheet and now waits with `hidden: true`.
  - A What's new item append makes `whats-new-dialog.test.ts` pin 10, `release-notes.test.ts`, row 236 and the frontend.md list.
- **L76-08 / L76-11:**
  - `PathHeader`, `HomeStatus`, the corner row and the mode root are V7 from L76-04. The path bodies (`online-path.tsx`, `tutorial-path.tsx`, `solo-path.tsx`, `nickname-field.tsx`, `home-classes.ts`) still import `design/components/button` / `kit-portrait` and `bots/`, until their tasks.
  - The mode section is `max-w-3xl`, and the paths show no art.
  - Home item 9 may be rewritten in place when their area changes what it says.
  - Part 2 Review Focus 3 and 5 tests can reuse `stubPhoneViewport()` when a sheet's placement matters.
- **L76-17:** `openOnline` at mount goes through the soft gate, and with How to play unseen the gate is now the V7 carousel sheet. Its tests close it with `closeHomeDialog`.
- **L76-18 (gate):**
  - Check the hub at 360×740 and 1440×900: the fan's `overflow-x-clip` and no page scroll, the wordmark outline in Safari (`paint-order` on HTML text), the tile tap targets.
  - Check the How to play swipe on touch, Previous / Next focus, and a tall Kits card scrolling in the sheet.
  - Check a long What's new history, and the New dot on the disabled New during a solo launch.
  - Sweep the parity lines L76-04/05/06 supersede: `home-whats-new` (green New, red dot, 'never disabled'), `home-beta-badge` (absolute position), `home-hub` (V1 art, 0.35 s fade with no reduced-motion check), `home-how-to-play-dialog` (V2 Dialog, resource PNG glyph rows).
- **Lot 75:**
  - `screens/table.tsx` keeps mounting `HowToPlayDialog` with unchanged props, but it is now a V7 `Dialog`: Esc closes only it (Q49), and it sits on the V7 `Z_INDEX` sheet layer, not V2's `z-[100]`. Check it against the V6 coach and hint layers (105 / 110) until L75 removes the classic table.
  - The arena `top-bar.test.tsx` How to play tests pass unedited.
  - `screens/whats-new-dialog.tsx` no longer imports `design/components/card`, `kit-portrait`, `dialog` or `button`; `screens/how-to-play-dialog.tsx` no longer imports `design/components/dialog` or `button` (classification rows 72 and 198 note it). L75-11's orphan sweep sees two fewer live importers.

#### Domain P2-B

##### Contract issues

1. **"Keep every Feedback test green unedited" cannot hold for one Home line.** `screens/home/home-screen.test.tsx` › 'opens Feedback in manual mode from the hub…' clicks Kind 'Idea' with `getByRole('button')`; A.10 and Q71 make Kind a radio group. L76-07 changes that one query to `'radio'` (assertions unchanged, recorded in decisions.md). Every arena, End, table and lobby test that touches Feedback stays unedited.
2. **A.10 Feedback "TextField/textarea at 16 px":** `TextField` renders an `<input>` only. L76-07 adds `ui/primitives/text-area.tsx` (`TextArea`) with DESIGN.md, the gallery entry and a `dev/ui-gallery.test.tsx` title, as the L76-07 brief allows.
3. **A.10 Online "large code field" (§7.1):** `TextField` fixes the input's type size. L76-08 adds `size?: 'md' | 'lg'` to `TextField` (a `ui/` file with DESIGN.md), outside the brief's Files list.
4. **A.2 lists `screens/home/home-classes.ts` (`HOME_INPUT_CLASS`).** L76-08 deletes it: nothing imports it once both fields are `TextField`s.
5. **Review Focus 3 latch vs. an existing test.** `home-screen.test.tsx` › 'enables Create with a nickname, and Join only with…' clicks Join then Create with static props and expects one call each, so the latch is per intent, not one shared launch latch (L76-08 decisions.md).
6. **A.10 invite link** adds exports beyond the two named: `INVITE_CODE_PARAM`, `INVITE_CODE_LENGTH`, `searchWithoutInviteCode` (the strip). `home-gate.ts` gains `homeMountEntry` / `HomeMountEntry` / `HomeMountMode`. All additive.
7. **A.10 "passes `HomeScreenProps.openOnline?: true`":** passing it on every Home render would reopen Online after a kick or a Leave (parity `home-online-path`: "After a kick: Home remounts on the hub"). L76-17 passes it only until the first room view.
8. **`FEEDBACK_FALLBACK_ERROR` moves** from `submit-feedback.ts` to `feedback-form-copy.ts`: `screens/lobby/lobby-screen.test.tsx` mocks `submit-feedback` with a factory that has no constants, so the dialog must not read copy from that module.
9. **L76-11 edits one Part 1 assertion:** `home-screen.test.tsx` › 'locks the solo menu while the launch is pending' finds 1, 7, Easy, Normal and Hard by role `radio` (the role change is §11 / Q7; coverage unchanged).

##### Cross-task notes (anything another domain's task must know)

1. **Assumed L76-04 output** (these tasks write against it; if L76-04 differs, the executor applies the same edit to the renamed thing and says so in its report):
   - `HomeScreen` (`screens/home/home-screen.tsx`) keeps the state names `mode`, `howToPlayOpen`, `pendingTarget`, `feedbackOpen`, `kitPickerOpen`, `solo`, `soloOpponents`, `soloDifficulty`, the derived `busy`, `canSubmit`, `canJoin`, and the handlers `onCreateSubmit`, `onJoinSubmit`, `onSoloSubmit`, `onTutorialSubmit`, `onHowToPlayClose`, `continueToTarget`; all Home state stays there (A.2).
   - `PathHeader` keeps its props (`title`, `subtitle`, `status`, `error`, `soloLaunchPending`, `onBack`, `backDisabled`, `onOpenFeedback`), its buttons named 'Back' and 'Feedback' (disabled while busy), and the path title as the page's only `<h1>`; `HomeStatus` keeps the `role="alert"` error and the `homeStatusCopy` line under it.
   - The hub `<h1>` accessible name stays 'Card Battle' and the mode tiles stay buttons named 'Play online', 'Play solo', 'Tutorial' (A.10); `test-home.ts` (`enterHomePath`, `closeHomeDialog`, `seedHomeStorage`, `makeHomeProps`) is unchanged.
   - L76-04 removes every `design/` import from `home-hub.tsx`, `path-header.tsx`, `home-art.tsx` and `home-screen.tsx` (the New control). L76-11's grep relies on it and stops if one is left.
   - L76-04 appends What's new item 9 (Home). L76-07 rewrites it with suffixes; L76-08 and L76-11 leave it alone; L76-17 rewrites only item 8.
   - `home-screen.test.tsx` › 'locks the solo menu while the launch is pending' still holds the V2 line L76-11 splits; L76-04 may reword other lines of that file but not this one.
2. **L76-05 / L76-06:** `closeHomeDialog` must keep working on the V7 What's new and How to play sheets (A.10). L76-17's App test presses a button named 'Skip' inside the gated 'How to play' dialog (A.10: Skip → 'skip').
3. **L76-06 → L76-07 (frontend.md):** the Arena "Outside the stack until L75 / L76" bullet names both V2 dialogs; L76-06 removes How to play, L76-07 removes Feedback and deletes the bullet if it is then empty.
4. **The L76-08 launch latch** (`screens/home/use-launch-once.ts`, `HOME_LAUNCHES` includes `'solo'`) is consumed by L76-11; no other domain needs it.
5. **The lobby kit card is untouched:** Solo uses its own `SoloKitCard` (Choose kit locks during a solo launch, Q8), while `LobbyKitCard` keeps Choose kit live while reconnecting (A.9 ruling 6).
6. **L76-18 (gate):** browser-check the Feedback sheet through Sent (auto-close, OK focus, the 15 s lock is not testable live), the large Join code at 360×740, the Solo mini table at 360×740 and 375×812 (every seat inside the stage, Start reachable, the 'Opponents' ring and focus rings unclipped), Share on a phone (Web Share sheet) and on desktop ("Link copied"), and a `?code=` link end to end (How to play first, then Online with the code, URL stripped). Parity rows that these tasks supersede and L76-18 sweeps: `global-feedback-dialog` ("Esc / overlay … not gated by busy", "closes at once with reason 'sent'", "Kind buttons carry no aria-pressed"), `feedback-dialog-dismiss` ("busy sending … Escape / backdrop still close"), `home-solo-path` ("Opponents: buttons 1 to 7 … no aria-pressed", "same styling" for Difficulty), `home-online-path` (the code field is now `TextField size="lg"`), `lobby-game-code` (Share), `global-app-router` (`?code=`).
7. **Lot 75:** none of these tasks edits `screens/arena/**`, `screens/table/**`, `screens/table.tsx`, `screens/end.tsx`, `design/**` or `App.arena.test.tsx`. L76-07 changes what the arena TopBar, the classic table and End render for Feedback (a V7 sheet in the sheet stack) without editing them; L75's orphan sweep may now find `design/components/dialog` and `design/components/button` with fewer importers, and after L76-11 `screens/home` no longer imports `design/components/kit-portrait` or `bots/format-bot-difficulty`.

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
