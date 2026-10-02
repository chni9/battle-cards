import type { ReactElement } from 'react';

import { useCardthagoSkin } from './use-cardthago-skin';
import type { CardthagoSkin } from './cardthago-skin';

const LABELS: Record<CardthagoSkin, string> = {
  atelier: 'Atelier',
  fresque: 'Fresque',
};

export function CardthagoSkinToggle({ className }: { className?: string }): ReactElement {
  const { skin, setSkin } = useCardthagoSkin();

  return (
    <div
      className={[
        'cardthago-skin-toggle inline-flex rounded-full border border-border-soft bg-surface-raised/90 p-0.5 shadow-sm backdrop-blur-sm',
        className ?? '',
      ].join(' ')}
      role="group"
      aria-label="Cardthago prototype skin"
    >
      {(['atelier', 'fresque'] as const).map((option) => {
        const active = skin === option;
        return (
          <button
            key={option}
            type="button"
            className={[
              'cardthago-inscription min-h-9 rounded-full px-3 text-xs font-semibold tracking-wide transition-colors',
              active
                ? 'bg-ink text-surface'
                : 'text-ink-muted hover:bg-surface-kit/60 hover:text-ink',
            ].join(' ')}
            aria-pressed={active}
            onClick={() => {
              setSkin(option);
            }}
          >
            {LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
