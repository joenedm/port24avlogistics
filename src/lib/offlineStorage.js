// Offline storage for crew mode scanning
const DB_NAME = 'GearTrackDB';
const STORE_NAME = 'scans';
const ASSETS_STORE = 'assets';

let db = null;

export const initOfflineStorage = () => {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, 1);
    
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!database.objectStoreNames.contains(ASSETS_STORE)) {
        const store = database.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
        store.createIndex('barcode', 'barcode', { unique: false });
      }
    };
  });
};

export const saveScanOffline = async (scan) => {
  const database = await initOfflineStorage();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add({ ...scan, synced: false, timestamp: Date.now() });
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
};

export const getPendingScans = async () => {
  const database = await initOfflineStorage();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result.filter(s => !s.synced));
  });
};

export const markScansSynced = async (ids) => {
  const database = await initOfflineStorage();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    ids.forEach(id => {
      const req = store.get(id);
      req.onsuccess = () => {
        const scan = req.result;
        if (scan) { scan.synced = true; store.put(scan); }
      };
    });
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
  });
};

export const cacheAssets = async (assets) => {
  const database = await initOfflineStorage();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([ASSETS_STORE], 'readwrite');
    const store = tx.objectStore(ASSETS_STORE);
    store.clear();
    assets.forEach(a => store.add(a));
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
  });
};

export const getCachedAssets = async () => {
  const database = await initOfflineStorage();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([ASSETS_STORE], 'readonly');
    const store = tx.objectStore(ASSETS_STORE);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
};

export const isOnline = () => navigator.onLine;