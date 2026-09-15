import { supabase } from './supabase';
import {
  getQueuedActions,
  queueAction,
  removeQueuedAction,
  updateQueuedAction,
  type QueuedAction,
} from './db';

const MAX_QUEUE_SIZE = 100;
const MAX_ATTEMPTS = 3;

export type SupabaseQueueMethod = 'insert' | 'update' | 'delete' | 'upsert' | 'post' | 'patch';

export interface ReplayResult {
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
}

export async function queueSupabaseCall(
  table: string,
  method: SupabaseQueueMethod | string,
  payload: unknown,
): Promise<QueuedAction | undefined> {
  await makeRoom();
  return queueAction({
    type: 'supabase',
    endpoint: table,
    method: method.toLowerCase(),
    body: payload,
    table,
    payload,
    timestamp: Date.now(),
    attempts: 0,
  });
}

export async function queueStorageUpload(file: Blob, path: string): Promise<QueuedAction | undefined> {
  await makeRoom();
  return queueAction({
    type: 'storage-upload',
    endpoint: path,
    method: 'upload',
    body: { file, path },
    timestamp: Date.now(),
    attempts: 0,
  });
}

export async function replayQueue(): Promise<ReplayResult> {
  const actions = await getQueuedActions();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const action of actions) {
    if (action.attempts >= MAX_ATTEMPTS) continue;
    processed += 1;

    try {
      await replayAction(action);
      await removeQueuedAction(action.id);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      const attempts = action.attempts + 1;
      console.warn(
        'Grace Book offline action failed; it will remain queued.',
        { id: action.id, attempts, error },
      );
      await updateQueuedAction({ ...action, attempts });
    }
  }

  return {
    processed,
    succeeded,
    failed,
    remaining: (await getQueuedActions()).length,
  };
}

async function replayAction(action: QueuedAction): Promise<void> {
  if (action.type === 'storage-upload') {
    await replayStorageUpload(action);
    return;
  }
  if (action.type === 'supabase') {
    await replaySupabaseCall(action);
    return;
  }
  throw new Error('Unsupported offline action type: ' + action.type);
}

async function replaySupabaseCall(action: QueuedAction): Promise<void> {
  const table = action.table || action.endpoint;
  const payload = action.payload ?? action.body;
  const method = action.method.toLowerCase();
  const query = supabase.from(table) as any;
  let result: { error: { message?: string } | null };

  if (method === 'insert' || method === 'post') {
    result = await query.insert(payload);
  } else if (method === 'upsert') {
    result = await query.upsert(payload);
  } else if (method === 'update' || method === 'patch') {
    const data = extractData(payload);
    const filters = extractFilters(payload);
    if (!filters) throw new Error('Queued update requires a match or filters object.');
    result = await applyFilters(query.update(data), filters);
  } else if (method === 'delete') {
    const filters = extractFilters(payload) ?? (
      payload && typeof payload === 'object'
        ? payload as Record<string, unknown>
        : undefined
    );
    if (!filters) {
      throw new Error('Queued delete requires a filter object.');
    }
    result = await applyFilters(query.delete(), filters);
  } else {
    throw new Error('Unsupported Supabase queue method: ' + action.method);
  }

  if (result.error) throw new Error(result.error.message || 'Supabase request failed.');
}

async function replayStorageUpload(action: QueuedAction): Promise<void> {
  const body = action.body as { file?: Blob; path?: string } | undefined;
  if (!body?.file || !body.path) throw new Error('Queued storage upload is missing its file or path.');

  const parts = body.path.replace(/^\/+/, '').split('/');
  const bucket = parts.length > 1 ? parts.shift() || 'uploads' : 'uploads';
  const objectPath = parts.length > 0 ? parts.join('/') : body.path;
  const { error } = await supabase.storage.from(bucket).upload(objectPath, body.file, { upsert: true });
  if (error) throw new Error(error.message || 'Supabase storage upload failed.');
}

function extractData(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const record = payload as Record<string, unknown>;
  return record.data ?? record.values ?? payload;
}

function extractFilters(payload: unknown): Record<string, unknown> | Array<[string, string, unknown]> | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const filters = record.match ?? record.where ?? record.filters;
  if (filters && typeof filters === 'object') return filters as Record<string, unknown>;
  return undefined;
}

async function applyFilters(
  builder: any,
  filters: Record<string, unknown> | Array<[string, string, unknown]>,
): Promise<{ error: { message?: string } | null }> {
  if (Array.isArray(filters)) {
    for (const [column, operator, value] of filters) {
      if (operator === 'eq') builder = builder.eq(column, value);
      else if (operator === 'neq') builder = builder.neq(column, value);
      else if (operator === 'in' && Array.isArray(value)) builder = builder.in(column, value);
      else throw new Error('Unsupported queued filter operator: ' + operator);
    }
    return builder;
  }
  return builder.match(filters);
}

async function makeRoom(): Promise<void> {
  const actions = await getQueuedActions();
  const overflow = actions.length - MAX_QUEUE_SIZE + 1;
  if (overflow <= 0) return;
  await Promise.all(actions.slice(0, overflow).map((action) => removeQueuedAction(action.id)));
}
