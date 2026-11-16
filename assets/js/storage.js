/**
 * StorageManager — Foundation data layer for Wardi Pro
 * Manages IndexedDB stores and localStorage settings.
 * All other modules depend on this.
 *
 * v3 changes (non-destructive migration):
 *  - New stores: daily_goals, goal_templates, daily_reviews
 *  - All dates normalized to LOCAL calendar date keys (YYYY-MM-DD)
 *  - Transactions resolve on tx.oncomplete (data truly committed)
 *  - Safe, additive migrations; existing user data is preserved
 */
class StorageManager {
  constructor() {
    this.db = null;
    this.DB_NAME = 'WardiDB';
    this.DB_VERSION = 3;
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
      'dashboard_prefs',
      'daily_goals',
      'goal_templates',
      'daily_reviews'
    ];
    // In-memory mirror for settings (survives localStorage unavailability better)
    this._settingsReady = false;
  }

  /* ------------------------------------------------------------------ */
  /*  Local date helpers — single source of truth for "today"            */
  /* ------------------------------------------------------------------ */

  /**
   * Local calendar date key 'YYYY-MM-DD' (NOT UTC).
   * All modules must use this to avoid day-boundary mismatches.
   * @param {Date} [date]
   * @returns {string}
   */
  localDateKey(date) {
    const d = date instanceof Date ? date : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Today's local date key. */
  todayKey() {
    return this.localDateKey(new Date());
  }

  /* ------------------------------------------------------------------ */
  /*  Database initialization & migration                                */
  /* ------------------------------------------------------------------ */

  async initDB() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      let request;
      try {
        request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      } catch (err) {
        console.error('IndexedDB unavailable:', err);
        reject(err);
        return;
      }

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      // Another tab holds an older connection — don't destroy data, just inform.
      request.onblocked = () => {
        console.warn('[WardiDB] Upgrade blocked by another open tab. Close other Wardi tabs and reload.');
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        try {
          this._migrate(db, oldVersion);
        } catch (err) {
          console.error('[WardiDB] Migration error (data left intact):', err);
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;

        // If another tab upgrades the DB, close politely instead of throwing.
        this.db.onversionchange = () => {
          try { this.db.close(); } catch (e) {}
          this.db = null;
          console.warn('[WardiDB] Database version changed — reloading app to pick up new schema.');
          setTimeout(() => window.location.reload(), 300);
        };

        // Surface unexpected fatal errors without losing the app
        this.db.onerror = (e) => {
          console.error('[WardiDB] Request error:', e.target && e.target.error);
        };

        resolve(this.db);
      };
    });
  }

  /**
   * Additive, versioned migration. NEVER deletes or resets stores.
   */
  _migrate(db, oldVersion) {
    console.log(`[WardiDB] Migrating from version ${oldVersion} → ${this.DB_VERSION}`);

    const ensureStore = (name, keyOpts, indexes) => {
      if (db.objectStoreNames.contains(name)) {
        const tx = db.transaction([name], 'readonly').objectStore(name);
        (indexes || []).forEach(idx => {
          if (!tx.indexNames.contains(idx.name)) {
            // Creating an index needs a versionchange tx — handled by caller context.
          }
        });
        return null;
      }
      return db.createObjectStore(name, keyOpts);
    };

    // v1/v2 stores (kept intact)
    if (!db.objectStoreNames.contains('duas')) {
      const s = db.createObjectStore('duas', { keyPath: 'id', autoIncrement: true });
      s.createIndex('category', 'category', { unique: false });
    }
    if (!db.objectStoreNames.contains('tasbeeh_sessions')) {
      db.createObjectStore('tasbeeh_sessions', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains('quran_bookmarks')) {
      db.createObjectStore('quran_bookmarks', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains('quran_favorites')) {
      db.createObjectStore('quran_favorites', { keyPath: 'surahNumber' });
    }
    if (!db.objectStoreNames.contains('quran_cache')) {
      db.createObjectStore('quran_cache', { keyPath: 'surahNumber' });
    }
    if (!db.objectStoreNames.contains('history_log')) {
      const s = db.createObjectStore('history_log', { keyPath: 'id', autoIncrement: true });
      s.createIndex('date', 'date', { unique: false });
      s.createIndex('type', 'type', { unique: false });
    }
    if (!db.objectStoreNames.contains('daily_stats')) {
      db.createObjectStore('daily_stats', { keyPath: 'date' });
    }
    if (!db.objectStoreNames.contains('prayer_records')) {
      const s = db.createObjectStore('prayer_records', { keyPath: 'date' });
      s.createIndex('date', 'date', { unique: true });
    }
    if (!db.objectStoreNames.contains('achievements')) {
      const s = db.createObjectStore('achievements', { keyPath: 'id' });
      s.createIndex('category', 'category', { unique: false });
    }
    if (!db.objectStoreNames.contains('dashboard_prefs')) {
      db.createObjectStore('dashboard_prefs', { keyPath: 'key' });
    }

    // v3 stores — Daily Goals & Accountability system
    if (!db.objectStoreNames.contains('daily_goals')) {
      db.createObjectStore('daily_goals', { keyPath: 'date' });
    }
    if (!db.objectStoreNames.contains('goal_templates')) {
      db.createObjectStore('goal_templates', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('daily_reviews')) {
      db.createObjectStore('daily_reviews', { keyPath: 'date' });
    }

    console.log('[WardiDB] Migration complete — all existing records preserved.');
  }

  /* ------------------------------------------------------------------ */
  /*  Generic CRUD helpers (resolve on transaction completion)           */
  /* ------------------------------------------------------------------ */

  _assertReady(storeName) {
    if (!this.db) {
      throw new Error('Database not initialized. Call initDB() first.');
    }
    if (!this.STORE_NAMES.includes(storeName)) {
      console.warn(`[WardiDB] Unknown store "${storeName}"`);
    }
  }

  /**
   * Add a new record. Resolves with the generated key after the transaction commits.
   */
  addItem(storeName, item) {
    return new Promise((resolve, reject) => {
      try {
        this._assertReady(storeName);
        const tx = this.db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).add(item);
        let key = null;
        req.onsuccess = () => { key = req.result; };
        tx.oncomplete = () => resolve(key);
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('add failed'));
      } catch (err) { reject(err); }
    });
  }

  /**
   * Get a single record by primary key.
   */
  getItem(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        this._assertReady(storeName);
        const tx = this.db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(id);
        let out;
        req.onsuccess = () => { out = req.result; };
        tx.oncomplete = () => resolve(out);
        tx.onabort = tx.onerror = () => reject(tx.error);
      } catch (err) { reject(err); }
    });
  }

  /**
   * Get every record in a store.
   */
  getAllItems(storeName) {
    return new Promise((resolve, reject) => {
      try {
        this._assertReady(storeName);
        const tx = this.db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        let out;
        req.onsuccess = () => { out = req.result || []; };
        tx.oncomplete = () => resolve(out);
        tx.onabort = tx.onerror = () => reject(tx.error);
      } catch (err) { reject(err); }
    });
  }

  /**
   * Put (insert-or-update). The item must include the keyPath field.
   */
  updateItem(storeName, item) {
    return new Promise((resolve, reject) => {
      try {
        this._assertReady(storeName);
        const tx = this.db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).put(item);
        let key = null;
        req.onsuccess = () => { key = req.result; };
        tx.oncomplete = () => resolve(key);
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('put failed'));
      } catch (err) { reject(err); }
    });
  }

  /**
   * Delete a single record by primary key.
   */
  deleteItem(storeName, id) {
    return new Promise((resolve, reject) => {
      try {
        this._assertReady(storeName);
        const tx = this.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('delete failed'));
      } catch (err) { reject(err); }
    });
  }

  /**
   * Clear every record in a store.
   */
  clearStore(storeName) {
    return new Promise((resolve, reject) => {
      try {
        this._assertReady(storeName);
        const tx = this.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => resolve(true);
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('clear failed'));
      } catch (err) { reject(err); }
    });
  }

  /**
   * Query records by an index value.
   */
  getItemsByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      try {
        this._assertReady(storeName);
        const tx = this.db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).index(indexName).getAll(value);
        let out;
        req.onsuccess = () => { out = req.result || []; };
        tx.oncomplete = () => resolve(out);
        tx.onabort = tx.onerror = () => reject(tx.error);
      } catch (err) { reject(err); }
    });
  }

  /**
   * Batch put many records in a single transaction (used by import).
   */
  bulkPut(storeName, items) {
    return new Promise((resolve, reject) => {
      try {
        this._assertReady(storeName);
        if (!Array.isArray(items) || items.length === 0) { resolve(0); return; }
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        let count = 0;
        for (const item of items) {
          if (item && typeof item === 'object') {
            try { store.put(item); count++; } catch (e) { /* skip invalid */ }
          }
        }
        tx.oncomplete = () => resolve(count);
        tx.onabort = tx.onerror = () => reject(tx.error || new Error('bulkPut failed'));
      } catch (err) { reject(err); }
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
    const stores = {};
    for (const name of this.STORE_NAMES) {
      stores[name] = await this.getAllItems(name);
    }

    const settings = {};
    try {
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
    } catch (e) { /* localStorage unavailable */ }

    const payload = {
      app: 'wardi-pro',
      schema: 3,
      version: '3.0',
      exportDate: new Date().toISOString(),
      stores,
      settings
    };

    return JSON.stringify(payload, null, 2);
  }

  /** Backwards-compatible alias used by Settings UI. */
  async exportData() {
    return this.exportAllData();
  }

  /**
   * Parse + validate a backup WITHOUT touching the database.
   * @param {string} jsonString
   * @returns {{success: boolean, message: string, data?: object, storeCounts?: object}}
   */
  validateBackup(jsonString) {
    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (err) {
      return { success: false, message: 'الملف ليس JSON صالحًا: ' + err.message };
    }

    if (!data || typeof data !== 'object') {
      return { success: false, message: 'ملف النسخة الاحتياطية غير صالح.' };
    }
    if (!data.stores || typeof data.stores !== 'object') {
      return { success: false, message: 'النسخة لا تحتوي على مخزن بيانات صالح (stores).' };
    }
    if (!Array.isArray(data.stores.duas) && !Array.isArray(data.stores.daily_stats) &&
        !Array.isArray(data.stores.history_log)) {
      return { success: false, message: 'هذا الملف لا يبدو نسخة احتياطية من وِرْدي.' };
    }
    // Reject absurd sizes (>30MB) to protect the browser
    if (jsonString.length > 30 * 1024 * 1024) {
      return { success: false, message: 'الملف كبير جدًا (>30MB) — لا يبدو نسخة احتياطية صحيحة.' };
    }

    const storeCounts = {};
    for (const name of this.STORE_NAMES) {
      const arr = data.stores[name];
      storeCounts[name] = Array.isArray(arr) ? arr.length : 0;
    }

    return { success: true, message: 'النسخة صالحة.', data, storeCounts };
  }

  /**
   * Import a validated backup. Preserves stores absent from the backup,
   * replaces only stores that exist in it, and validates each record.
   * @param {object} data  Parsed payload from validateBackup()
   * @returns {Promise<{success: boolean, imported: number, message: string}>}
   */
  async importData(data) {
    let imported = 0;
    try {
      for (const storeName of this.STORE_NAMES) {
        const arr = data.stores && data.stores[storeName];
        if (!Array.isArray(arr)) continue; // store not in backup → keep existing data
        try {
          await this.clearStore(storeName);
          imported += await this.bulkPut(storeName, arr);
        } catch (e) {
          console.warn(`[WardiDB] Import issue in ${storeName}:`, e);
        }
      }

      // Settings (only if present)
      if (data.settings && typeof data.settings === 'object') {
        try {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('wardi_')) keysToRemove.push(key);
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          for (const [key, value] of Object.entries(data.settings)) {
            this.setSetting(key, value);
          }
        } catch (e) { /* localStorage unavailable */ }
      }

      return { success: true, imported, message: `تم استيراد ${imported} سجلًا بنجاح.` };
    } catch (err) {
      console.error('[WardiDB] Import failed:', err);
      return { success: false, imported, message: 'فشل الاستيراد: ' + err.message };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  localStorage helpers (wardi_ prefix)                               */
  /* ------------------------------------------------------------------ */

  getSetting(key, defaultValue) {
    try {
      const raw = localStorage.getItem('wardi_' + key);
      if (raw === null) return defaultValue;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch {
      return defaultValue;
    }
  }

  setSetting(key, value) {
    try {
      localStorage.setItem(
        'wardi_' + key,
        typeof value === 'string' ? value : JSON.stringify(value)
      );
    } catch (e) {
      console.warn('[WardiDB] localStorage write failed:', e);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Nuclear reset (explicit user action only)                          */
  /* ------------------------------------------------------------------ */

  async clearAllData() {
    for (const storeName of this.STORE_NAMES) {
      try {
        await this.clearStore(storeName);
      } catch (e) {
        console.warn(`[WardiDB] Could not clear ${storeName}:`, e);
      }
    }
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wardi_')) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ */
  /*  Prayer helpers                                                     */
  /* ------------------------------------------------------------------ */

  emptyPrayerRecord(dateStr) {
    return {
      date: dateStr || this.todayKey(),
      fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
      fajrTime: null, dhuhrTime: null, asrTime: null, maghribTime: null, ishaTime: null,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Get prayer record for a local date (defaults to today).
   */
  async getPrayerRecord(dateStr) {
    const d = dateStr || this.todayKey();
    try {
      const rec = await this.getItem('prayer_records', d);
      if (rec) {
        // Normalize legacy records
        return Object.assign(this.emptyPrayerRecord(d), rec, { date: d });
      }
    } catch (err) {
      console.error('getPrayerRecord error:', err);
    }
    return this.emptyPrayerRecord(d);
  }

  async savePrayerRecord(record) {
    record.updatedAt = new Date().toISOString();
    return this.updateItem('prayer_records', record);
  }

  /**
   * Prayer records for the last N local days (ascending by date).
   */
  async getRecentPrayerRecords(days = 7) {
    try {
      const all = await this.getAllItems('prayer_records');
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days - 1));
      const cutoffStr = this.localDateKey(cutoff);
      return all
        .filter(r => r && r.date && r.date >= cutoffStr)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (err) {
      console.error('getRecentPrayerRecords error:', err);
      return [];
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Activity log helpers                                               */
  /* ------------------------------------------------------------------ */

  /**
   * All activities logged on a local date, newest first.
   */
  async getTodayActivities(dateStr) {
    try {
      const targetDate = dateStr || this.todayKey();
      const all = await this.getAllItems('history_log');
      return all
        .filter(item => item && (item.date === targetDate ||
                 (item.timestamp && item.timestamp.startsWith(targetDate))))
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    } catch (err) {
      console.error('getTodayActivities error:', err);
      return [];
    }
  }
}

window.StorageManager = StorageManager;
