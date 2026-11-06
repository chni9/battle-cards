/**
 * Home Nickname field (NicknameField): technical spec v7 §7.1; L57-07, L17-01, L45-04. 16 px through
 * `TextField` (spec v7 §5.2, L76-08).
 */

import type { ReactElement } from 'react';

import { TextField } from '../../ui/primitives/text-field';

export interface NicknameFieldProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export function NicknameField({ value, disabled, onChange }: NicknameFieldProps): ReactElement {
  return (
    <TextField
      label="Nickname"
      value={value}
      maxLength={24}
      autoComplete="nickname"
      placeholder="Your name"
      disabled={disabled}
      onChange={(event) => {
        onChange(event.currentTarget.value);
      }}
    />
  );
}
