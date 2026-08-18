/**
 * Worker-thread screen game runner — L38-01.
 * Jobs carry policy id / profile / iteration budget only — no GameState.
 */

import { parentPort } from 'node:worker_threads';

import {
  runScreenJob,
  type ScreenWorkerInbound,
  type ScreenWorkerOutbound,
} from './screen-jobs';

if (parentPort === null) {
  throw new Error('screen-worker must run as a worker thread');
}

const port = parentPort;

port.on('message', (message: ScreenWorkerInbound) => {
  try {
    const results = message.jobs.map((job) => runScreenJob(job));
    port.postMessage({
      type: 'result',
      id: message.id,
      results,
    } satisfies ScreenWorkerOutbound);
  } catch (error) {
    port.postMessage({
      type: 'error',
      id: message.id,
      message: error instanceof Error ? error.message : String(error),
    } satisfies ScreenWorkerOutbound);
  }
});
