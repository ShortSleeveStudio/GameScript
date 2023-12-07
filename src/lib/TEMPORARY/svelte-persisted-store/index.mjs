// index.ts
import { writable as internal } from "svelte/store";
var stores = {
  local: {},
  session: {}
};
function getStorage(type) {
  return type === "local" ? localStorage : sessionStorage;
}
function writable(key, initialValue, options) {
  console.warn("writable() has been deprecated. Please use persisted() instead.\n\nchange:\n\nimport { writable } from 'svelte-persisted-store'\n\nto:\n\nimport { persisted } from 'svelte-persisted-store'");
  return persisted(key, initialValue, options);
}
function persisted(key, initialValue, options) {
  var _a, _b;
  const serializer = (_a = options == null ? void 0 : options.serializer) != null ? _a : JSON;
  const storageType = (_b = options == null ? void 0 : options.storage) != null ? _b : "local";
  const browser = typeof window !== "undefined" && typeof document !== "undefined";
  const storage = browser ? getStorage(storageType) : null;
  function updateStorage(key2, value) {
    storage == null ? void 0 : storage.setItem(key2, serializer.stringify(value));
  }
  if (!stores[storageType][key]) {
    const store = internal(initialValue, (set2) => {
      const json = storage == null ? void 0 : storage.getItem(key);
      if (json) {
        set2(serializer.parse(json));
      }
      if (browser && storageType == "local") {
        const handleStorage = (event) => {
          if (event.key === key)
            set2(event.newValue ? serializer.parse(event.newValue) : null);
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
      }
    });
    const { subscribe, set } = store;
    stores[storageType][key] = {
      set(value) {
        updateStorage(key, value);
        set(value);
      },
      update(callback) {
        return store.update((last) => {
          const value = callback(last);
          updateStorage(key, value);
          return value;
        });
      },
      subscribe
    };
  }
  return stores[storageType][key];
}
export {
  persisted,
  writable
};
//# sourceMappingURL=index.mjs.map