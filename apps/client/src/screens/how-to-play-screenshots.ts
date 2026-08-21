/**
 * Optional How to play screenshots — technical spec v6 §5.1.
 * Missing files omit the `<img>`; never a placeholder drawing.
 * Same glob pattern as `design/asset-lookup.ts` (eager `?url`).
 */

const screenshotModules = import.meta.glob<string>('../assets/how-to-play/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

export function howToPlayScreenshotUrl(fileName: string): string | null {
  const suffix = `/how-to-play/${fileName}`;
  const entry = Object.entries(screenshotModules).find(([path]) => path.endsWith(suffix));
  if (entry === undefined) {
    return null;
  }
  return entry[1];
}
