/**
 * Server entry point — technical spec §3.
 *
 * One room type, reachable under the name `game`. Create via matchmaker `create`; join by
 * the 6-letter game code via `joinById` (L1-01).
 */

import { GAME_ROOM_NAME, PROTOCOL_VERSION } from '@card-battle/shared';
import { defineRoom, defineServer } from 'colyseus';
import express from 'express';

import {
  defaultFeedbackApiDeps,
  mountFeedbackApi,
} from './http/feedback-http';
import { mountStaticSpa, resolveStaticDir } from './http/static-spa';
import { GameRoom } from './rooms/game-room';

const DEFAULT_PORT = 2567;

const server = defineServer({
  rooms: {
    [GAME_ROOM_NAME]: defineRoom(GameRoom),
  },
  express: (app) => {
    if (process.env['NODE_ENV'] === 'production') {
      app.set('trust proxy', 1);
    }
    // /api must mount even when STATIC_DIR is missing (local tsx without a client build).
    app.use('/api', express.json({ limit: '64kb' }));
    mountFeedbackApi(app, defaultFeedbackApiDeps());

    const staticDir = resolveStaticDir();
    if (staticDir === undefined) {
      console.warn('STATIC_DIR missing or not found — SPA not served');
      return;
    }
    mountStaticSpa(app, staticDir);
  },
});

const port = Number(process.env['PORT'] ?? DEFAULT_PORT);

await server.listen(port);

console.log(`Card Battle server listening on ${port} — protocol v${PROTOCOL_VERSION}`);
