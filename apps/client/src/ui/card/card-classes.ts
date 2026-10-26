/**
 * Class strings the V7 card frame is built from — technical spec v7 §5.3 (holo rim, radius),
 * §5.4 (hidden verso). They live outside `card.tsx` so that file exports components only
 * (react-refresh) and so the kit portrait's code faces (Hidden, Random; L72-15 fix round 1) wear
 * the same tile language instead of restating it: a rim, the verso fill lit from the top, and an
 * inner frame line read as a tile on `--bg-0` and on `--panel` alike. Every class map is a
 * literal string so Tailwind sees each utility.
 */

export type Rim = 'holo' | 'gold';

const RIM_FILL_CLASS: Readonly<Record<Rim, string>> = {
  holo: 'bg-[image:var(--card-rim-holo)]',
  gold: 'bg-[image:var(--card-rim-gold)]',
};

/** The rim layer: a full-box layer under the face, whose padding-box is the 2 px rim. */
export function rimLayerClass(rim: Rim): string {
  return `absolute inset-0 rounded-v7-card ${RIM_FILL_CLASS[rim]}`;
}

/** The face and the verso sit inside the rim; their radius is the card radius minus the rim. */
export const INNER_CLASS =
  'absolute inset-(--card-rim-width) overflow-hidden rounded-[calc(var(--card-radius)-var(--card-rim-width))]';

/**
 * The verso: `--panel-2` lit from the top and hatched in `--bg-0`, so it reads as a card on a
 * `--panel` ground as well as on `--bg-0`, not only by its 2 px rim (L72-12 fix round 1, B5).
 */
export const VERSO_CLASS = `${INNER_CLASS} flex items-center justify-center bg-v7-panel-2`;
export const VERSO_LIGHT_CLASS = 'absolute inset-0 bg-linear-to-b from-v7-text-2 to-transparent opacity-20';
export const VERSO_HATCH_CLASS =
  'absolute inset-0 bg-[repeating-linear-gradient(135deg,var(--bg-0)_0_3px,transparent_3px_7px)] opacity-60';
/** The inner frame line a verso carries, so its edge reads even without the hatch. */
export const VERSO_FRAME_CLASS =
  'absolute inset-[7%] rounded-[calc(var(--card-radius)-6px)] border border-v7-text-2 opacity-35';
