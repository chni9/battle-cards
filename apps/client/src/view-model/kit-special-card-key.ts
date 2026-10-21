/** List key for kit specials — index disambiguates duplicate card ids (L27-05). */
export function kitSpecialCardKey(cardId: string, index: number): string {
  return `${cardId}:${String(index)}`;
}
