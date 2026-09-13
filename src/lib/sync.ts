import { getQueuedActions } from './db';
import { replayQueue, type ReplayResult } from './offlineQueue';

export type SyncCompleteCallback = (result: ReplayResult) => void;

let started = false;
let currentSync: Promise<ReplayResult> | undefined;
const listeners = new Set<SyncCompleteCallback>();

export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

export function startSync(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', handleOnline);
  if (isOnline()) void syncNow();
}

export async function syncNow(): Promise<ReplayResult> {
  if (currentSync) return currentSync;

  currentSync = runSync().finally(() => {
    currentSync = undefined;
  });
  return currentSync;
}

export function onSyncComplete(callback: SyncCompleteCallback): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

async function runSync(): Promise<ReplayResult> {
  if (!isOnline()) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      remaining: (await getQueuedActions()).length,
    };
  }

  try {
    const result = await replayQueue();
    notify(result);
    return result;
  } catch (error) {
    console.error('Grace Book offline sync failed:', error);
    const result: ReplayResult = {
      processed: 0,
      succeeded: 0,
      failed: 1,
      remaining: (await getQueuedActions()).length,
    };
    notify(result);
    return result;
  }
}

function handleOnline(): void {
  void syncNow();
}

function notify(result: ReplayResult): void {
  listeners.forEach((listener) => {
    try {
      listener(result);
    } catch (error) {
      console.error('Grace Book sync listener failed:', error);
    }
  });
}
