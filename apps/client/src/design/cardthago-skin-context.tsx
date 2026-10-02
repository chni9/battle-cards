import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import {
  applyCardthagoSkinToDocument,
  readCardthagoSkin,
  writeCardthagoSkin,
  type CardthagoSkin,
} from './cardthago-skin';
import { CardthagoSkinContext } from './cardthago-skin-store';

export function CardthagoSkinProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [skin, setSkinState] = useState<CardthagoSkin>(() => readCardthagoSkin());

  useEffect(() => {
    applyCardthagoSkinToDocument(skin);
  }, [skin]);

  const setSkin = useCallback((next: CardthagoSkin) => {
    writeCardthagoSkin(next);
    setSkinState(next);
  }, []);

  const toggleSkin = useCallback(() => {
    setSkin(skin === 'atelier' ? 'fresque' : 'atelier');
  }, [setSkin, skin]);

  const value = useMemo(
    () => ({
      skin,
      setSkin,
      toggleSkin,
    }),
    [skin, setSkin, toggleSkin],
  );

  return (
    <CardthagoSkinContext.Provider value={value}>{children}</CardthagoSkinContext.Provider>
  );
}
