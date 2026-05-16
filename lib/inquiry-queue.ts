import type { InquiryInput } from "@/lib/validations/inquiry";

const DB_NAME = "vn-inquiry-queue";
const DB_VERSION = 1;
const STORE_NAME = "pending";

type QueuedInquiry = InquiryInput & { _queueId: number; _queuedAt: number };

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

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
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
 * Enqueue an inquiry payload for later sync.
 * Returns the auto-generated queue key.
 */
export async function enqueueInquiry(
  payload: InquiryInput,
): Promise<number> {
  const db = await openDB();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record = { ...payload, _queuedAt: Date.now() };
    const request = store.add(record);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
}

/**
 * Remove a successfully-synced inquiry from the queue.
 */
export async function dequeueInquiry(queueId: number): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(queueId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
}

/**
 * Return every pending inquiry without removing them.
 */
export async function peekInquiries(): Promise<QueuedInquiry[]> {
  const db = await openDB();
  return new Promise<QueuedInquiry[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as QueuedInquiry[]);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
}

/**
 * Return the number of inquiries waiting in the queue.
 */
export async function countPendingInquiries(): Promise<number> {
  const db = await openDB();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
}

/**
 * Drop every record from the pending store.
 */
export async function clearInquiryQueue(): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
}
