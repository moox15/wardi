/**
 * StorageManager — Foundation data layer for Wardi Pro
 * Manages IndexedDB stores and localStorage settings.
 * All other modules depend on this.
 */
class StorageManager {
  constructor() {
    this.db = null;
    this.DB_NAME = 'WardiDB';
    this.DB_VERSION = 2;
    this.STORE_NAMES = [
      'duas',
      'tasbeeh_sessions',
      'quran_bookmarks',
      'quran_favorites',
      'quran_cache',
      'history_log',
      'daily_stats',
      'prayer_records',
      'achievements',
      'dashboard_prefs'
    ];
  }

  /**
   * Open (or create) the IndexedDB database and set up all object stores.
   * @returns {Promise<IDBDatabase>}
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // duas — user's personal duas
        if (!db.objectStoreNames.contains('duas')) {
          const duasStore = db.createObjectStore('duas', { keyPath: 'id', autoIncrement: true });
          duasStore.createIndex('category', 'category', { unique: false });
        }

        // tasbeeh_sessions — completed tasbeeh sessions
        if (!db.objectStoreNames.contains('tasbeeh_sessions')) {
          db.createObjectStore('tasbeeh_sessions', { keyPath: 'id', autoIncrement: true });
        }

        // quran_bookmarks
        if (!db.objectStoreNames.contains('quran_bookmarks')) {
          db.createObjectStore('quran_bookmarks', { keyPath: 'id', autoIncrement: true });
        }

        // quran_favorites — keyed by surahNumber (one per surah)
        if (!db.objectStoreNames.contains('quran_favorites')) {
          db.createObjectStore('quran_favorites', { keyPath: 'surahNumber' });
        }

        // quran_cache — cached surah data keyed by surahNumber
        if (!db.objectStoreNames.contains('quran_cache')) {
          db.createObjectStore('quran_cache', { keyPath: 'surahNumber' });
        }

        // history_log — chronological activity log
        if (!db.objectStoreNames.contains('history_log')) {
          const historyStore = db.createObjectStore('history_log', { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('date', 'date', { unique: false });
          historyStore.createIndex('type', 'type', { unique: false });
        }

        // daily_stats — one record per date (YYYY-MM-DD)
        if (!db.objectStoreNames.contains('daily_stats')) {
          const statsStore = db.createObjectStore('daily_stats', { keyPath: 'date' });
          statsStore.createIndex('date', 'date', { unique: true });
        }

        // prayer_records — daily prayer tracking (keyPath: date 'YYYY-MM-DD')
        if (!db.objectStoreNames.contains('prayer_records')) {
          const prayerStore = db.createObjectStore('prayer_records', { keyPath: 'date' });
          prayerStore.createIndex('date', 'date', { unique: true });
        }

        // achievements — unlocked milestones and badges
        if (!db.objectStoreNames.contains('achievements')) {
          const achStore = db.createObjectStore('achievements', { keyPath: 'id' });
          achStore.createIndex('category', 'category', { unique: false });
        }

        // dashboard_prefs — personalized layout and target settings
        if (!db.objectStoreNames.contains('dashboard_prefs')) {
          db.createObjectStore('dashboard_prefs', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;

        // Handle connection loss gracefully
        this.db.onversionchange = () => {
          this.db.close();
          console.warn('Database version changed — please reload.');
        };

        resolve(this.db);
      };
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Generic CRUD helpers                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Add a new record to the given store.
   * @param {string} storeName
   * @param {object} item
   * @returns {Promise<number|string>} The generated key / id.
   */
  async addItem(storeName, item) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.add(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get a single record by its primary key.
   * @param {string} storeName
   * @param {*} id
   * @returns {Promise<object|undefined>}
   */
  async getItem(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get every record in a store.
   * @param {string} storeName
   * @returns {Promise<object[]>}
   */
  async getAllItems(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Put (insert-or-update) a record. The item must include the keyPath field.
   * @param {string} storeName
   * @param {object} item
   * @returns {Promise<void>}
   */
  async updateItem(storeName, item) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Delete a single record by its primary key.
   * @param {string} storeName
   * @param {*} id
   * @returns {Promise<void>}
   */
  async deleteItem(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Clear every record in a store.
   * @param {string} storeName
   * @returns {Promise<void>}
   */
  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Query records by an index value.
   * @param {string} storeName
   * @param {string} indexName
   * @param {*} value
   * @returns {Promise<object[]>}
   */
  async getItemsByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
        tx.onerror = () => reject(tx.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Backup / Restore                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Export every IndexedDB store and all wardi_* localStorage keys.
   * @returns {Promise<string>} JSON string.
   */
  async exportAllData() {
    try {
      const stores = {};
      for (const name of this.STORE_NAMES) {
        stores[name] = await this.getAllItems(name);
      }

      // Gather all wardi_* localStorage keys
      const settings = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wardi_')) {
          const shortKey = key.replace('wardi_', '');
          try {
            settings[shortKey] = JSON.parse(localStorage.getItem(key));
          } catch {
            settings[shortKey] = localStorage.getItem(key);
          }
        }
      }

      const payload = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        stores,
        settings
      };

      return JSON.stringify(payload, null, 2);
    } catch (err) {
      console.error('Export failed:', err);
      throw err;
    }
  }

  /**
   * Import data from a previously-exported JSON string.
   * @param {string} jsonString
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!data || !data.version || !data.stores) {
        return { success: false, message: 'Invalid backup file structure.' };
      }

      // Clear existing stores and import
      for (const storeName of this.STORE_NAMES) {
        if (data.stores[storeName]) {
          await this.clearStore(storeName);
          for (const item of data.stores[storeName]) {
            try {
              await this.updateItem(storeName, item);
            } catch (e) {
              console.warn(`Failed to import item into ${storeName}:`, e);
            }
          }
        }
      }

      // Import settings
      if (data.settings && typeof data.settings === 'object') {
        // Clear existing wardi_* keys first
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('wardi_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // Write imported settings
        for (const [key, value] of Object.entries(data.settings)) {
          this.setSetting(key, value);
        }
      }

      return { success: true, message: 'Data imported successfully.' };
    } catch (err) {
      console.error('Import failed:', err);
      return { success: false, message: 'Failed to parse backup file: ' + err.message };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  localStorage helpers (wardi_ prefix)                               */
  /* ------------------------------------------------------------------ */

  /**
   * Read a setting from localStorage.
   * @param {string} key — stored under 'wardi_' + key
   * @param {*} defaultValue
   * @returns {*}
   */
  getSetting(key, defaultValue) {
    const raw = localStorage.getItem('wardi_' + key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  /**
   * Write a setting to localStorage.
   * @param {string} key
   * @param {*} value
   */
  setSetting(key, value) {
    localStorage.setItem(
      'wardi_' + key,
      typeof value === 'string' ? value : JSON.stringify(value)
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Nuclear reset                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Clear ALL IndexedDB stores AND all wardi_* localStorage keys.
   * @returns {Promise<void>}
   */
  async clearAllData() {
    try {
      for (const storeName of this.STORE_NAMES) {
        await this.clearStore(storeName);
      }

      // Remove all wardi_* localStorage entries
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wardi_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (err) {
      console.error('Clear all data failed:', err);
      throw err;
    }
  }
  /* ------------------------------------------------------------------ */
  /*  Specialized Prayer & Activity Helpers                             */
  /* ------------------------------------------------------------------ */

  /**
   * Get prayer record for a specific date (defaults to today).
   * @param {string} [dateStr] 'YYYY-MM-DD'
   * @returns {Promise<object>}
   */
  async getPrayerRecord(dateStr) {
    const d = dateStr || new Date().toISOString().split('T')[0];
    const rec = await this.getItem('prayer_records', d);
    if (rec) return rec;
    return {
      date: d,
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
      fajrTime: null,
      dhuhrTime: null,
      asrTime: null,
      maghribTime: null,
      ishaTime: null,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Save or update prayer record for a date.
   * @param {object} record
   * @returns {Promise<void>}
   */
  async savePrayerRecord(record) {
    record.updatedAt = new Date().toISOString();
    return this.updateItem('prayer_records', record);
  }

  /**
   * Retrieve prayer records for the last N days.
   * @param {number} days
   * @returns {Promise<object[]>}
   */
  async getRecentPrayerRecords(days = 7) {
    try {
      const all = await this.getAllItems('prayer_records');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days - 1));
      const cutoffStr = cutoff.toISOString().split('T')[0];
      return all
        .filter(r => r.date >= cutoffStr)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
      console.error('getRecentPrayerRecords error:', err);
      return [];
    }
  }

  /**
   * Get all activities logged today.
   * @param {string} [dateStr]
   * @returns {Promise<object[]>}
   */
  async getTodayActivities(dateStr) {
    try {
      const targetDate = dateStr || new Date().toISOString().split('T')[0];
      const all = await this.getAllItems('history_log');
      return all
        .filter(item => item.date === targetDate || (item.timestamp && item.timestamp.startsWith(targetDate)))
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    } catch (err) {
      console.error('getTodayActivities error:', err);
      return [];
    }
  }
}

window.StorageManager = StorageManager;
