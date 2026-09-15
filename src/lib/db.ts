const DB_NAME = 'grace-db';
const DB_VERSION = 1;

type StoreName =
  | 'notes'
  | 'drafts'
  | 'chat_cache'
  | 'profile_cache'
  | 'offline_queue'
  | 'feed_cache'
  | 'app_cache';

export interface NoteRecord {
  id: string;
  createdAt?: number;
  [key: string]: unknown;
}

export interface DraftRecord {
  id: string;
  type: string;
  data: unknown;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

export interface QueuedAction {
  id: number;
  type: string;
  endpoint: string;
  method: string;
  body?: unknown;
  table?: string;
  payload?: unknown;
  timestamp: number;
  createdAt: number;
  attempts: number;
  [key: string]: unknown;
}

export interface QueueActionInput {
  type: string;
  endpoint: string;
  method: string;
  body?: unknown;
  table?: string;
  payload?: unknown;
  timestamp?: number;
  attempts?: number;
  [key: string]: unknown;
}

let databasePromise: Promise<IDBDatabase> | undefined;

export function initDB(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      createStore(database, 'notes', 'id', { createdAt: 'createdAt' });
      createStore(database, 'drafts', 'id', { type: 'type' });
      createStore(database, 'chat_cache', 'roomId');
      createStore(database, 'profile_cache', 'userId');
      createStore(database, 'offline_queue', 'id', { createdAt: 'createdAt' }, true);
      createStore(database, 'feed_cache', 'key');
      createStore(database, 'app_cache', 'key');
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open IndexedDB.'));
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another tab.'));
  });

  databasePromise.catch(() => {
    databasePromise = undefined;
  });

  return databasePromise;
}

function createStore(
  database: IDBDatabase,
  name: StoreName,
  keyPath: string,
  indexes: Record<string, string> = {},
  autoIncrement = false,
): void {
  const store = database.objectStoreNames.contains(name)
    ? null
    : database.createObjectStore(name, { keyPath, autoIncrement });

  if (!store) return;
  Object.entries(indexes).forEach(([indexName, indexPath]) => {
    store.createIndex(indexName, indexPath, { unique: false });
  });
}

function requestToPromise<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<any>,
): Promise<T> {
  return initDB().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let result: T;

        let request: IDBRequest<T>;
        try {
          request = createRequest(store);
        } catch (error) {
          reject(error);
          return;
        }

        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => {
          reject(request.error || new Error('IndexedDB request failed.'));
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => {
          reject(transaction.error || new Error('IndexedDB transaction failed.'));
        };
        transaction.onabort = () => {
          reject(transaction.error || new Error('IndexedDB transaction was aborted.'));
        };
      }),
  );
}

async function safe<T>(operation: Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    console.error('Grace DB operation failed:', error);
    return fallback;
  }
}

export function saveNote(note: NoteRecord): Promise<NoteRecord | undefined> {
  const value = { ...note, createdAt: note.createdAt ?? Date.now() };
  return safe(requestToPromise<NoteRecord>('notes', 'readwrite', (store) => store.put(value)), undefined);
}

export function getNotes(): Promise<NoteRecord[]> {
  return safe(
    requestToPromise<NoteRecord[]>('notes', 'readonly', (store) => store.index('createdAt').getAll()),
    [],
  );
}

export function getNote(id: IDBValidKey): Promise<NoteRecord | undefined> {
  return safe(requestToPromise<NoteRecord | undefined>('notes', 'readonly', (store) => store.get(id)), undefined);
}

export function deleteNote(id: IDBValidKey): Promise<void> {
  return safe(requestToPromise<void>('notes', 'readwrite', (store) => store.delete(id)), undefined);
}

export function saveDraft(draft: DraftRecord): Promise<DraftRecord | undefined> {
  const now = Date.now();
  const value = { ...draft, createdAt: draft.createdAt ?? now, updatedAt: now };
  return safe(requestToPromise<DraftRecord>('drafts', 'readwrite', (store) => store.put(value)), undefined);
}

export function getDrafts(type?: string): Promise<DraftRecord[]> {
  const operation = type
    ? requestToPromise<DraftRecord[]>('drafts', 'readonly', (store) => store.index('type').getAll(type))
    : requestToPromise<DraftRecord[]>('drafts', 'readonly', (store) => store.getAll());
  return safe(operation, []);
}

export function getDraft(id: IDBValidKey): Promise<DraftRecord | undefined> {
  return safe(requestToPromise<DraftRecord | undefined>('drafts', 'readonly', (store) => store.get(id)), undefined);
}

export function deleteDraft(id: IDBValidKey): Promise<void> {
  return safe(requestToPromise<void>('drafts', 'readwrite', (store) => store.delete(id)), undefined);
}

export function cacheChatMessages(roomId: string, messages: unknown[]): Promise<unknown | undefined> {
  const value = { roomId, messages, updatedAt: Date.now() };
  return safe(requestToPromise<unknown>('chat_cache', 'readwrite', (store) => store.put(value)), undefined);
}

export function getCachedChat(roomId: string): Promise<unknown[] | undefined> {
  return safe(
    requestToPromise<{ messages?: unknown[] } | undefined>('chat_cache', 'readonly', (store) => store.get(roomId))
      .then((record) => record?.messages),
    undefined,
  );
}

export function clearChatCache(roomId: string): Promise<void> {
  return safe(requestToPromise<void>('chat_cache', 'readwrite', (store) => store.delete(roomId)), undefined);
}

export function cacheProfile(userId: string, profile: unknown): Promise<unknown | undefined> {
  const value = { userId, profile, updatedAt: Date.now() };
  return safe(requestToPromise<unknown>('profile_cache', 'readwrite', (store) => store.put(value)), undefined);
}

export function getCachedProfile(userId: string): Promise<unknown> {
  return safe(
    requestToPromise<{ profile?: unknown } | undefined>('profile_cache', 'readonly', (store) => store.get(userId))
      .then((record) => record?.profile),
    undefined,
  );
}

export function queueAction(action: QueueActionInput): Promise<QueuedAction | undefined> {
  const now = Date.now();
  const value = {
    ...action,
    timestamp: action.timestamp ?? now,
    createdAt: now,
    attempts: action.attempts ?? 0,
  };
  return safe(requestToPromise<QueuedAction>('offline_queue', 'readwrite', (store) => store.add(value)), undefined);
}

export function getQueuedActions(): Promise<QueuedAction[]> {
  return safe(
    requestToPromise<QueuedAction[]>('offline_queue', 'readonly', (store) => store.index('createdAt').getAll()),
    [],
  );
}

export function updateQueuedAction(action: QueuedAction): Promise<QueuedAction | undefined> {
  return safe(requestToPromise<QueuedAction>('offline_queue', 'readwrite', (store) => store.put(action)), undefined);
}

export function removeQueuedAction(id: IDBValidKey): Promise<void> {
  return safe(requestToPromise<void>('offline_queue', 'readwrite', (store) => store.delete(id)), undefined);
}

export function clearQueue(): Promise<void> {
  return safe(requestToPromise<void>('offline_queue', 'readwrite', (store) => store.clear()), undefined);
}

export function setCache(key: string, value: unknown): Promise<unknown | undefined> {
  return safe(requestToPromise<unknown>('app_cache', 'readwrite', (store) => store.put({ key, value })), undefined);
}

export function getCache(key: string): Promise<unknown> {
  return safe(
    requestToPromise<{ value?: unknown } | undefined>('app_cache', 'readonly', (store) => store.get(key))
      .then((record) => record?.value),
    undefined,
  );
}

export function deleteCache(key: string): Promise<void> {
  return safe(requestToPromise<void>('app_cache', 'readwrite', (store) => store.delete(key)), undefined);
}

export function clearAllCache(): Promise<void> {
  return safe(requestToPromise<void>('app_cache', 'readwrite', (store) => store.clear()), undefined);
}
