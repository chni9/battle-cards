/**
 * `/dev/ui` demo for the L76-09 host rules editor (technical spec v7 §4.2, §7.1, §7.4). DEV only:
 * the gallery is lazily imported behind `import.meta.env.DEV`, so none of this ships.
 * Components only, because `rules.gallery.tsx` exports the non-component `gallery`
 * (react-refresh).
 *
 * `RulesEditorDemo` keeps its own rules and applies every payload live, as the room would. The
 * merge re-states the two lines of `applySoloRulesPayload` (the clock changes only when the
 * payload carries it), because `ui/` never imports `screens/home/solo-rules-state`. With `solo`,
 * the strip reads "Server default" until a slider release sends a time (Q3/Q31).
 */

import { defaultLobbyRules, type LobbyRules, type SetLobbyRulesPayload } from '@card-battle/shared';
import { useState, type ReactElement } from 'react';
import { RulesStrip } from './rules-strip';

export interface RulesEditorDemoProps {
  readonly solo?: boolean;
}

export function RulesEditorDemo({ solo = false }: RulesEditorDemoProps): ReactElement {
  const [rules, setRules] = useState<LobbyRules>(defaultLobbyRules);
  const [timeSent, setTimeSent] = useState(false);

  const onChange = (payload: SetLobbyRulesPayload): void => {
    setRules((current) => ({
      excludedKitIds: payload.excludedKitIds,
      randomOnly: payload.randomOnly,
      turnTimeSeconds: payload.turnTimeSeconds ?? current.turnTimeSeconds,
    }));
    if (payload.turnTimeSeconds !== undefined) setTimeSent(true);
  };

  return (
    <div className="max-w-md rounded-v7-chrome bg-v7-bg-0 p-3">
      <RulesStrip rules={rules} editor={{ onChange, serverDefaultTime: solo && !timeSent }} />
    </div>
  );
}
