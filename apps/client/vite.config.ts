import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Source art keeps display names (`Thief +.png`, `Strong attack.png`); emitted
 * hashed files must be URL-safe — spaces and `+` break under some reverse proxies
 * and SPA fallbacks that serve index.html for missing assets.
 */
function sanitizeAssetFileName(asset: {
  names: string[];
  originalFileNames: string[];
}): string {
  const raw = asset.names[0] ?? asset.originalFileNames[0] ?? 'asset';
  const base = raw.replace(/^.*[/\\]/, '');
  const stem = base.replace(/\.[^.]+$/, '');
  const safe = stem.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'asset';
  return `assets/${safe}-[hash][extname]`;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: sanitizeAssetFileName,
      },
    },
  },
});
