/**
 * Shared IndexedDB constants for the inquiry queue.
 *
 * Both `lib/inquiry-queue.ts` (client-side modules) and `public/sw.js`
 * (service worker, plain JS) must agree on these values.  The SW cannot
 * import TS modules, so if you change anything here you **must** update
 * the corresponding literals at the top of `public/sw.js` as well.
 */
export const IDB_NAME = "vn-inquiry-queue";
export const IDB_VERSION = 1;
export const IDB_STORE = "pending";
export const SYNC_TAG = "replay-inquiry";
export const CHANNEL_NAME = "vn-inquiry-sync";
