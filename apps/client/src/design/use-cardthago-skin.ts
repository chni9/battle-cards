import { useContext } from 'react';

import { CardthagoSkinContext, type CardthagoSkinContextValue } from './cardthago-skin-store';

export function useCardthagoSkin(): CardthagoSkinContextValue {
  const ctx = useContext(CardthagoSkinContext);
  if (ctx === null) {
    throw new Error('useCardthagoSkin must be used within CardthagoSkinProvider');
  }
  return ctx;
}
