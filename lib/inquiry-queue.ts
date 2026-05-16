import type { InquiryInput } from "@/lib/validations/inquiry";
import { IDB_NAME, IDB_VERSION, IDB_STORE } from "@/lib/inquiry-queue-constants";

export type QueuedInquiry = InquiryInput & { _queueId: number; _queuedAt: number };

/**
 * Opens (or creates) the IndexedDB database.
 * Works in both window and service-worker contexts.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB is not available in this environment"));
      return;
    }

    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, {
          keyPath: "_queueId",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Run a single IndexedDB transaction and close the database afterwards.
 *
 * Resolves/rejects only from the transaction-level events to avoid the
 * double-reject that occurs when both `request.onerror` and `tx.onerror`
 * fire.  The db is closed in both success and error paths.
 */
function withTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    openDB()
      .then((db) => {
        const tx = db.transaction(IDB_STORE, mode);
        const store = tx.objectStore(IDB_STORE);
        const request = fn(store);

        tx.oncomplete = () => {
          resolve(request.result as T);
          db.close();
        };
        tx.onerror = () => {
          reject(tx.error);
          db.close();
        };
      })
      .catch(reject);
  });
}

/**
 * Enqueue an inquiry payload for later sync.
 * Returns the auto-generated queue key.
 */
export function enqueueInquiry(payload: InquiryInput): Promise<number> {
  const record = { ...payload, _queuedAt: Date.now() };
  return withTransaction<number>("readwrite", (store) => store.add(record));
}

/**
 * Remove a successfully-synced inquiry from the queue.
 */
export function dequeueInquiry(queueId: number): Promise<void> {
  return withTransaction<void>("readwrite", (store) => store.delete(queueId));
}

/**
 * Return every pending inquiry without removing them.
 */
export function peekInquiries(): Promise<QueuedInquiry[]> {
  return withTransaction<QueuedInquiry[]>("readonly", (store) => store.getAll());
}

/**
 * Return the number of inquiries waiting in the queue.
 */
export function countPendingInquiries(): Promise<number> {
  return withTransaction<number>("readonly", (store) => store.count());
}
