/**
 * Cardthago DA mock — local skin preference (never synced to server).
 */

export const CARDTHAGO_SKIN_STORAGE_KEY = 'cardthago-skin-v1';

export const CARDTHAGO_SKINS = ['atelier', 'fresque'] as const;

export type CardthagoSkin = (typeof CARDTHAGO_SKINS)[number];

export function isCardthagoSkin(value: string): value is CardthagoSkin {
  return (CARDTHAGO_SKINS as readonly string[]).includes(value);
}

export function readCardthagoSkin(): CardthagoSkin {
  try {
    const raw = localStorage.getItem(CARDTHAGO_SKIN_STORAGE_KEY);
    if (raw !== null && isCardthagoSkin(raw)) {
      return raw;
    }
  } catch {
    /* private mode */
  }
  return 'atelier';
}

export function writeCardthagoSkin(skin: CardthagoSkin): void {
  try {
    localStorage.setItem(CARDTHAGO_SKIN_STORAGE_KEY, skin);
  } catch {
    /* private mode */
  }
}

export function applyCardthagoSkinToDocument(skin: CardthagoSkin): void {
  document.documentElement.dataset['cardthagoSkin'] = skin;
}
