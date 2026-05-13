(() => {
  const DB_NAME = "caloriflash_db";
  const DB_VERSION = 1;

  const STORES = {
    entries: "entries",
    favorites: "favorites",
    templates: "templates",
    recipes: "recipes",
    settings: "settings"
  };

  let dbInstance = null;

  function openDb() {
    if (dbInstance) {
      return Promise.resolve(dbInstance);
    }
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORES.entries)) {
          const store = db.createObjectStore(STORES.entries, { keyPath: "id" });
          store.createIndex("date", "date", { unique: false });
          store.createIndex("mealType", "mealType", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.favorites)) {
          db.createObjectStore(STORES.favorites, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.templates)) {
          db.createObjectStore(STORES.templates, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.recipes)) {
          db.createObjectStore(STORES.recipes, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: "key" });
        }
      };
      req.onsuccess = () => {
        dbInstance = req.result;
        resolve(dbInstance);
      };
      req.onerror = () => reject(req.error);
    });
  }

  function tx(storeName, mode = "readonly") {
    return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function getAll(storeName) {
    return tx(storeName).then((store) => requestToPromise(store.getAll()));
  }

  function getByKey(storeName, key) {
    return tx(storeName).then((store) => requestToPromise(store.get(key)));
  }

  function put(storeName, value) {
    return tx(storeName, "readwrite").then((store) => requestToPromise(store.put(value)));
  }

  function remove(storeName, key) {
    return tx(storeName, "readwrite").then((store) => requestToPromise(store.delete(key)));
  }

  function queryEntriesByDate(dateStr) {
    return tx(STORES.entries).then(
      (store) =>
        new Promise((resolve, reject) => {
          const idx = store.index("date");
          const req = idx.getAll(IDBKeyRange.only(dateStr));
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        })
    );
  }

  window.CFDB = {
    STORES,
    openDb,
    getAll,
    getByKey,
    put,
    remove,
    queryEntriesByDate
  };
})();
