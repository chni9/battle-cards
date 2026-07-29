/**
 * Server entry point — technical spec §3.
 *
 * One room type for now, reachable under the name `game`. Rooms are created on demand by the
 * matchmaker; joining by game code arrives with L1-01.
 */

import { GAME_ROOM_NAME, PROTOCOL_VERSION } from '@card-battle/shared';
import { defineRoom, defineServer } from 'colyseus';

import { GameRoom } from './rooms/game-room';

const DEFAULT_PORT = 2567;

const server = defineServer({
  rooms: {
    [GAME_ROOM_NAME]: defineRoom(GameRoom),
  },
});

const port = Number(process.env['PORT'] ?? DEFAULT_PORT);

await server.listen(port);

console.log(`Card Battle server listening on ${port} — protocol v${PROTOCOL_VERSION}`);
