/**
 * The DEV-only `/dev/ui` gallery route (technical spec v7 §4.2): every `ui/` component on one
 * page for the design gate and critiques. It never matches in a production build, where
 * `App.tsx` also drops the lazily imported gallery chunk.
 */

export const DEV_UI_PATH = '/dev/ui';

export function isDevUiRoute(pathname: string, isDev: boolean): boolean {
  return isDev && (pathname === DEV_UI_PATH || pathname.startsWith(`${DEV_UI_PATH}/`));
}
