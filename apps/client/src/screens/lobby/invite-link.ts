/**
 * The invite link (technical spec v7 §7.1, §7.2, Q28; Part 2 Review Focus 4; L76-17): Share hands
 * friends `{origin}/?code=XXXXXX`, and Home reads that parameter once to pre-fill Join. Client only:
 * the server validates codes, so the parameter gets no character filter, as the Join field does not.
 */

export const INVITE_CODE_PARAM = 'code';
/** The server's GAME_CODE_LENGTH (apps/server/src/rooms/game-code.ts), which the client cannot import. */
export const INVITE_CODE_LENGTH = 6;

/** `{origin}/?code={code}` (the code URI-encoded). */
export function inviteLink(origin: string, code: string): string {
  return `${origin}/?${INVITE_CODE_PARAM}=${encodeURIComponent(code)}`;
}

/** The `code` parameter uppercased and capped at 6, with no character filter; null when missing or empty. */
export function parseInviteCode(search: string): string | null {
  const raw = new URLSearchParams(search).get(INVITE_CODE_PARAM);
  return raw === null || raw === '' ? null : raw.toUpperCase().slice(0, INVITE_CODE_LENGTH);
}

/** `search` without the `code` parameter: '' when nothing else is left, else '?…' (keeps `ui` and the rest). */
export function searchWithoutInviteCode(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(INVITE_CODE_PARAM);
  const rest = params.toString();
  return rest === '' ? '' : `?${rest}`;
}
