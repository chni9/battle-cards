const DEFAULT_SERVER_URL = 'http://localhost:2567';

export interface PageLocation {
  protocol: string;
  hostname: string;
  origin: string;
}

/**
 * Where the Colyseus client dials.
 * - `VITE_SERVER_URL` wins when non-empty (split API host).
 * - Local Vite: localhost / 127.0.0.1 → port 2567.
 * - Deployed same-origin (Coolify): page `origin` (no :2567).
 */
export function resolveServerUrl(
  envUrl?: string,
  location?: PageLocation,
): string {
  if (envUrl !== undefined && envUrl.length > 0) {
    return envUrl;
  }

  if (location !== undefined) {
    const { hostname, origin } = location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }
  }

  return DEFAULT_SERVER_URL;
}
