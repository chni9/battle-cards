/**
 * Home Play solo path (SoloPath): technical spec v7 §7.1, §11 (Q7 radio semantics, Q8 busy);
 * L17-01, L67-01, Lot 70. L76-11: the V7 Solo path, one form in the §7.1 order: Nickname,
 * Opponents (`SoloOpponentPicker`, seat radios around a mini table), Difficulty (`Segmented`),
 * Your kit (`SoloKitCard`), the Table rules strip (L76-09) and Start solo game, the only submit:
 * every other button is `type="button"`, and the rules and kit sheets portal outside the form,
 * so neither ever submits it. While busy every control is disabled and the strip still opens.
 */

import type {
  BotDifficulty,
  LobbyKitSelection,
  LobbyRules,
  SoloOpponentCount,
} from '@card-battle/shared';
import type { ReactElement, SyntheticEvent } from 'react';

import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { Button } from '../../ui/primitives/button';
import { Segmented } from '../../ui/primitives/segmented';
import type { RulesEditorBinding } from '../../ui/rules/rules-editor-model';
import { RulesStrip } from '../../ui/rules/rules-strip';
import { BOT_DIFFICULTY_OPTIONS } from '../lobby/lobby-copy';
import { SOLO_DIFFICULTY_LABEL } from './home-copy';
import { NicknameField } from './nickname-field';
import { PathHeader } from './path-header';
import { SoloKitCard } from './solo-kit-card';
import { SoloOpponentPicker } from './solo-opponent-picker';

export interface SoloPathProps {
  nickname: string;
  status: RoomConnectionStatus;
  error: string | null;
  soloLaunchPending: boolean;
  busy: boolean;
  canSubmit: boolean;
  soloOpponents: SoloOpponentCount;
  soloDifficulty: BotDifficulty;
  soloKitSelection: LobbyKitSelection;
  soloRules: LobbyRules;
  /** The solo binding for the Table rules editor (L76-09): local apply, Server default, busy lock. */
  rulesEditor: RulesEditorBinding;
  onBack: () => void;
  onNicknameChange: (value: string) => void;
  onSoloOpponentsChange: (count: SoloOpponentCount) => void;
  onSoloDifficultyChange: (difficulty: BotDifficulty) => void;
  onOpenKitPicker: () => void;
  onSoloSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  onOpenFeedback: () => void;
}

export function SoloPath({
  nickname,
  status,
  error,
  soloLaunchPending,
  busy,
  canSubmit,
  soloOpponents,
  soloDifficulty,
  soloKitSelection,
  soloRules,
  rulesEditor,
  onBack,
  onNicknameChange,
  onSoloOpponentsChange,
  onSoloDifficultyChange,
  onOpenKitPicker,
  onSoloSubmit,
  onOpenFeedback,
}: SoloPathProps): ReactElement {
  return (
    <div>
      <PathHeader
        title="Play solo"
        subtitle="Fight bots immediately — no lobby, same rules as online."
        status={status}
        error={error}
        soloLaunchPending={soloLaunchPending}
        onBack={onBack}
        backDisabled={busy}
        onOpenFeedback={onOpenFeedback}
      />

      <form onSubmit={onSoloSubmit} className="mt-6 flex flex-col gap-5">
        <NicknameField value={nickname} disabled={busy} onChange={onNicknameChange} />

        <SoloOpponentPicker
          value={soloOpponents}
          nickname={nickname}
          disabled={busy}
          onChange={onSoloOpponentsChange}
        />

        <div className="flex flex-col gap-2">
          {/* The visible caption; the group carries the same name through `Segmented`'s `label`. */}
          <p aria-hidden="true" className="font-v7-body text-v7-body font-extrabold text-v7-text">
            {SOLO_DIFFICULTY_LABEL}
          </p>
          <Segmented<BotDifficulty>
            label={SOLO_DIFFICULTY_LABEL}
            options={BOT_DIFFICULTY_OPTIONS}
            value={soloDifficulty}
            onChange={onSoloDifficultyChange}
            disabled={busy}
          />
        </div>

        <SoloKitCard
          selection={soloKitSelection}
          randomOnly={soloRules.randomOnly}
          disabled={busy}
          onOpenKitPicker={onOpenKitPicker}
        />

        <RulesStrip rules={soloRules} editor={rulesEditor} />

        <Button type="submit" variant="primary" size="lg" disabled={!canSubmit}>
          Start solo game
        </Button>
      </form>
    </div>
  );
}
