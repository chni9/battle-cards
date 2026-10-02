import { createContext } from 'react';

import type { CardthagoSkin } from './cardthago-skin';

export interface CardthagoSkinContextValue {
  skin: CardthagoSkin;
  setSkin: (skin: CardthagoSkin) => void;
  toggleSkin: () => void;
}

export const CardthagoSkinContext = createContext<CardthagoSkinContextValue | null>(null);
