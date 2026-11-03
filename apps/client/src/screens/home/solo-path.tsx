/** Home Play solo path: opponents, difficulty, rules, kit (SoloPath): technical spec v7 §7.1; L17-01, L67-01, Lot 70. */

import {
  BOT_DIFFICULTIES,
  SOLO_OPPONENT_COUNTS,
  type BotDifficulty,
  type LobbyKitSelection,
  type LobbyRules,
  type SoloOpponentCount,
} from '@card-battle/shared';
import type { ReactElement, SyntheticEvent } from 'react';

import { formatBotDifficulty } from '../../bots/format-bot-difficulty';
import { Button } from '../../design/components/button';
import { KitPortrait } from '../../design/components/kit-portrait';
import type { RoomConnectionStatus } from '../../net/use-room-connection';
import { lobbyKitSelectionLabel } from '../lobby/lobby-kit-picker';
import { KIT_PICKER_LEAD } from '../kit-pick-copy';
import { LobbyRulesPanel } from '../lobby-rules-panel';
import { NicknameField } from './nickname-field';
import { PathHeader } from './path-header';

const OPPONENT_COUNTS = SOLO_OPPONENT_COUNTS;

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
  onSoloRulesChange: (rules: LobbyRules, turnTimeChanged: boolean) => void;
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
  onSoloRulesChange,
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

      <form onSubmit={onSoloSubmit} className="mt-8 space-y-6">
        <NicknameField
          value={nickname}
          disabled={busy}
          onChange={onNicknameChange}
        />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Opponents</legend>
          <div className="flex flex-wrap gap-2">
            {OPPONENT_COUNTS.map((count) => (
              <Button
                key={count}
                type="button"
                variant={soloOpponents === count ? 'green' : 'orange'}
                disabled={busy}
                onClick={() => {
                  onSoloOpponentsChange(count);
                }}
              >
                {count}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink">Difficulty</legend>
          <div className="flex flex-wrap gap-2">
            {BOT_DIFFICULTIES.map((tier) => (
              <Button
                key={tier}
                type="button"
                variant={soloDifficulty === tier ? 'green' : 'orange'}
                disabled={busy}
                onClick={() => {
                  onSoloDifficultyChange(tier);
                }}
              >
                {formatBotDifficulty(tier)}
              </Button>
            ))}
          </div>
        </fieldset>

        <LobbyRulesPanel
          rules={soloRules}
          editable
          onExcludedChange={(excludedKitIds) => {
            onSoloRulesChange({ ...soloRules, excludedKitIds }, false);
          }}
          onRandomOnlyChange={(randomOnly) => {
            onSoloRulesChange({ ...soloRules, randomOnly }, false);
          }}
          onTurnTimeChange={(turnTimeSeconds) => {
            onSoloRulesChange({ ...soloRules, turnTimeSeconds }, true);
          }}
        />

        {soloRules.randomOnly ? null : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink">Your kit</p>
          <p className="text-sm text-ink-muted">{KIT_PICKER_LEAD}</p>
          <div className="flex flex-wrap items-center gap-3">
            <KitPortrait
              kitId={soloKitSelection === 'random' ? null : soloKitSelection}
              nickname="Random kit"
              className="w-16"
            />
            <div className="min-w-0 space-y-2">
              <p className="font-medium text-ink">{lobbyKitSelectionLabel(soloKitSelection)}</p>
              <Button
                type="button"
                variant="orange"
                disabled={busy}
                onClick={onOpenKitPicker}
              >
                Choose kit
              </Button>
            </div>
          </div>
        </div>
        )}

        <Button type="submit" variant="green" disabled={!canSubmit}>
          Start solo game
        </Button>
      </form>
    </div>
  );
}
