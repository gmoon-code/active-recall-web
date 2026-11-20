/* Active Recall Web: free, no-server, browser-local persistence. */
(function (root) {
  'use strict';
  const DB_NAME = 'active-recall-web-local';
  const DB_VERSION = 1;
  const STORE = 'snapshots';
  const PRIMARY = 'primary';
  const OLD_DB_KEY = 'activeRecallWebMvp_v1';
  const OLD_SESSION_KEY = 'activeRecallWebActiveSession_v1';
  let mode = 'initialising';
  let sequence = Promise.resolve();
  let openPromise;
  let loadedRevision = null;
  let loadedPayload = null;
  let storageConflict = false;

  function storageError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }
  function revisionOf(row) {
    // v4.32 and older IndexedDB records did not carry a revision.
    if (!row || row.revision === undefined) return 0;
    if (!Number.isSafeInteger(row.revision) || row.revision < 0)
      throw storageError('Saved storage metadata is invalid. Do not clear browser data.', 'CORRUPT_SNAPSHOT');
    return row.revision;
  }
  function payloadOf(row) {
    if (!row) return null;
    if (typeof row.payload !== 'string' || !row.payload)
      throw storageError('Saved data is incomplete. Do not clear browser data.', 'CORRUPT_SNAPSHOT');
    return row.payload;
  }
  function conflictError() {
    return storageError('Another tab saved a newer notebook. This tab cannot overwrite it. Export a backup of any unsaved work here before reloading.', 'STALE_SNAPSHOT');
  }

  function getLegacy() {
    try {
      const raw = localStorage.getItem(OLD_DB_KEY);
      if (!raw) return null;
      return { db: JSON.parse(raw), activeSessionId: localStorage.getItem(OLD_SESSION_KEY) || null };
    } catch (error) {
      throw new Error('Saved legacy data could not be read. Preserve your browser data before retrying. ' + error.message);
    }
  }

  function openDatabase() {
    if (openPromise) return openPromise;
    if (!('indexedDB' in root)) return Promise.reject(new Error('IndexedDB unavailable'));
    openPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
      request.onblocked = () => reject(new Error('A different tab is blocking a storage upgrade.'));
    }).catch(error => { openPromise = null; throw error; });
    return openPromise;
  }

  async function readIndexedDB() {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(PRIMARY);
      request.onsuccess = () => {
        try {
          const row = request.result;
          const payload = payloadOf(row);
          resolve({ snapshot: payload === null ? null : JSON.parse(payload), revision: revisionOf(row), payload });
        } catch (error) {
          reject(error.code === 'CORRUPT_SNAPSHOT' ? error :
            storageError('Saved data could not be decoded. Do not clear browser data.', 'CORRUPT_SNAPSHOT'));
        }
      };
      request.onerror = () => reject(request.error || new Error('Read failed'));
      transaction.onabort = () => reject(transaction.error || new Error('Storage transaction aborted'));
    });
  }

  async function writeIndexedDB(payload, expectedRevision, expectedPayload) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      let nextRevision = null;
      const check = store.get(PRIMARY);
      check.onsuccess = () => {
        try {
          const current = revisionOf(check.result);
          // Payload comparison also detects edits made by older, unversioned tabs.
          if (current !== expectedRevision || payloadOf(check.result) !== expectedPayload) {
            storageConflict = true;
            reject(conflictError());
            transaction.abort();
            return;
          }
          if (!Number.isSafeInteger(current + 1)) throw storageError('Storage revision limit reached.', 'CORRUPT_SNAPSHOT');
          nextRevision = current + 1;
          store.put({ id: PRIMARY, payload, revision: nextRevision, savedAt: new Date().toISOString() });
        } catch (error) {
          reject(error);
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve(nextRevision);
      transaction.onerror = () => reject(transaction.error || new Error('Write failed'));
      transaction.onabort = () => reject(transaction.error || new Error('Storage transaction aborted'));
    });
  }

  async function load() {
    if (storageConflict) throw conflictError();
    // A read in this tab must not race its own queued writes.
    await sequence.catch(() => {});
    try {
      const { snapshot, revision, payload } = await readIndexedDB();
      // Later read-only inspections must not rebase a stale tab's write rights.
      if (loadedRevision === null) { loadedRevision = revision; loadedPayload = payload; }
      if (snapshot) {
        mode = 'indexeddb';
        return snapshot;
      }
      const legacy = getLegacy();
      if (legacy) {
        // Keep the legacy copy until the full IndexedDB transaction has committed.
        const migratedPayload = JSON.stringify(legacy);
        loadedRevision = await writeIndexedDB(migratedPayload, loadedRevision, loadedPayload);
        loadedPayload = migratedPayload;
        mode = 'indexeddb';
        try { localStorage.removeItem(OLD_DB_KEY); localStorage.removeItem(OLD_SESSION_KEY); } catch { /* safe to retain duplicate */ }
        return legacy;
      }
      mode = 'indexeddb';
      return null;
    } catch (error) {
      if (error.code === 'STALE_SNAPSHOT' || error.code === 'CORRUPT_SNAPSHOT') throw error;
      // Use the legacy copy if present, but never silently erase unreadable data.
      const legacy = getLegacy();
      if (legacy) { mode = 'localstorage-fallback'; return legacy; }
      if (error.message.includes('IndexedDB unavailable') || error.name === 'SecurityError') {
        mode = 'localstorage-fallback';
        return null;
      }
      throw error;
    }
  }

  function save(db, activeSessionId) {
    // Snapshot immediately: later state mutations must not overtake this write.
    const payload = JSON.stringify({ db, activeSessionId: activeSessionId || null });
    const write = async () => {
      if (storageConflict) throw conflictError();
      if (mode === 'indexeddb') {
        if (loadedRevision === null) throw new Error('Load saved data before writing to this browser.');
        loadedRevision = await writeIndexedDB(payload, loadedRevision, loadedPayload);
        loadedPayload = payload;
        return;
      }
      localStorage.setItem(OLD_DB_KEY, JSON.stringify(db));
      localStorage.setItem(OLD_SESSION_KEY, activeSessionId || '');
    };
    sequence = sequence.catch(() => {}).then(write);
    return sequence;
  }

  function ready() { return sequence; }
  function storageMode() { return mode; }
  function hasStorageConflict() { return storageConflict; }
  async function requestPersistence() {
    if (!navigator.storage?.persist) return false;
    return !!(await navigator.storage.persist());
  }
  root.ActiveRecallStorage = { load, save, ready, storageMode, hasStorageConflict, requestPersistence };
})(globalThis);
