/** Home Beta badge and card art (BetaCard, HomeArt): technical spec v7 §7.1; L51-03, L42-04. */

import type { ReactElement } from 'react';

import { getCardArtUrl, getCardBackUrl, getKitPortraitUrl } from '../../ui/asset-lookup';

export function BetaCard(): ReactElement {
  return (
    <aside
      data-zone="beta-card"
      className="absolute right-4 top-4 z-10 w-[4.25rem] rounded-[length:var(--radius-card)] border border-border bg-surface-raised px-2 py-3 text-center shadow-sm sm:right-8 sm:top-6 sm:w-20 sm:py-4"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink sm:text-xs">
        Beta
      </p>
    </aside>
  );
}

export function HomeArt(): ReactElement {
  return (
    <aside aria-hidden className="order-1 flex items-center justify-center md:order-2">
      <div className="relative h-64 w-full max-w-sm md:h-80">
        <img
          src={getCardBackUrl('attack')}
          alt=""
          className="absolute left-2 top-6 w-28 rotate-[-12deg] rounded-[length:var(--radius-card)] border border-border shadow-md md:w-36"
          draggable={false}
        />
        <img
          src={getCardArtUrl('basic-attack', { isUpgraded: false })}
          alt=""
          className="absolute left-1/2 top-0 w-32 -translate-x-1/2 rotate-[4deg] rounded-[length:var(--radius-card)] border border-border shadow-lg md:w-40"
          draggable={false}
        />
        <img
          src={getCardArtUrl('mirror', { isUpgraded: false })}
          alt=""
          className="absolute right-2 top-10 w-28 rotate-[14deg] rounded-[length:var(--radius-card)] border border-border shadow-md md:w-36"
          draggable={false}
        />
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
          <img
            src={getKitPortraitUrl('untouchable')}
            alt=""
            className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
            draggable={false}
          />
          <img
            src={getKitPortraitUrl('assassin')}
            alt=""
            className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
            draggable={false}
          />
          <img
            src={getKitPortraitUrl('scientific')}
            alt=""
            className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
            draggable={false}
          />
          <img
            src={getKitPortraitUrl('kamikaze')}
            alt=""
            className="h-14 w-14 rounded-[length:var(--radius-badge)] border border-border object-cover shadow-sm"
            draggable={false}
          />
        </div>
      </div>
    </aside>
  );
}
