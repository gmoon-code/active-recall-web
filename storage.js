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
      request.onsuccess = () => resolve(request.result?.payload ? JSON.parse(request.result.payload) : null);
      request.onerror = () => reject(request.error || new Error('Read failed'));
      transaction.onabort = () => reject(transaction.error || new Error('Storage transaction aborted'));
    });
  }

  async function writeIndexedDB(payload) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put({ id: PRIMARY, payload, savedAt: new Date().toISOString() });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Write failed'));
      transaction.onabort = () => reject(transaction.error || new Error('Storage transaction aborted'));
    });
  }

  async function load() {
    try {
      const fromIndexedDB = await readIndexedDB();
      if (fromIndexedDB) {
        mode = 'indexeddb';
        return fromIndexedDB;
      }
      const legacy = getLegacy();
      if (legacy) {
        // Keep the legacy copy until the full IndexedDB transaction has committed.
        await writeIndexedDB(JSON.stringify(legacy));
        mode = 'indexeddb';
        try { localStorage.removeItem(OLD_DB_KEY); localStorage.removeItem(OLD_SESSION_KEY); } catch { /* safe to retain duplicate */ }
        return legacy;
      }
      mode = 'indexeddb';
      return null;
    } catch (error) {
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
      if (mode === 'indexeddb') {
        await writeIndexedDB(payload);
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
  async function requestPersistence() {
    if (!navigator.storage?.persist) return false;
    return !!(await navigator.storage.persist());
  }
  root.ActiveRecallStorage = { load, save, ready, storageMode, requestPersistence };
})(globalThis);
