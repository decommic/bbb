/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const DB_NAME = 'aPixDB';
const STORE_NAME = 'modelStore';
const VERSION = 1;

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', request.error);
      reject('IndexedDB error');
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        // The key will be the model's base64 URL (string)
        dbInstance.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);
    
        request.onsuccess = () => {
            resolve();
        };
    
        request.onerror = () => {
            console.error('Error setting data in IndexedDB:', request.error);
            reject(request.error);
        };
    });
}
  
export async function idbGet<T>(key: string): Promise<T | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
    
        request.onsuccess = () => {
            resolve(request.result as T | undefined);
        };
    
        request.onerror = () => {
            console.error('Error getting data from IndexedDB:', request.error);
            reject(request.error);
        };
    });
}