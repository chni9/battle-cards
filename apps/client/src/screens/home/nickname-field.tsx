/** Home Nickname field (NicknameField): technical spec v7 §7.1; L57-07, L17-01, L45-04. */

import type { ReactElement } from 'react';

import { HOME_INPUT_CLASS } from './home-classes';

export interface NicknameFieldProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function NicknameField({ value, disabled, onChange }: NicknameFieldProps): ReactElement {
  return (
    <label className="block text-sm font-medium text-ink">
      Nickname
      <input
        className={HOME_INPUT_CLASS}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        maxLength={24}
        autoComplete="nickname"
        placeholder="Your name"
        disabled={disabled}
      />
    </label>
  );
}
