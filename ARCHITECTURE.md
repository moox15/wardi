# Wardi Pro — Architecture Specification

## Overview
Single-page PWA Islamic companion app. Arabic RTL default. Dark mode default.

## Project Root
`c:\Users\midoh\OneDrive\Desktop\wardi`

## Navigation Sections (in order)
1. home — الرئيسية
2. quran — القرآن الكريم
3. tasbeeh — التسبيح
4. duas — الأدعية
5. history — السجل
6. settings — الإعدادات

## HTML Structure

### Body attributes
- `dir="rtl"` default
- `data-theme="dark"` default
- `data-lang="ar"` default

### Main containers
```
body
  #app-container
    #sidebar (desktop nav)
    #main-content
      #home-section.section.active
      #quran-section.section
      #tasbeeh-section.section
      #duas-section.section
      #history-section.section
      #settings-section.section
    #bottom-nav (mobile nav)
  #toast-container
  #modal-overlay
```

### Element ID Reference (ALL IDs used across HTML/JS/CSS)

#### Navigation
- `#sidebar` — desktop sidebar nav
- `#bottom-nav` — mobile bottom nav bar
- `.nav-item[data-section="X"]` — nav buttons (X = section name)
- `.nav-item.active` — active nav state

#### Home Section (#home-section)
- `#greeting-text` — greeting display
- `#hijri-date` — Hijri date
- `#gregorian-date` — Gregorian date
- `#daily-tasbeeh-count` — today's tasbeeh total
- `#daily-tasbeeh-goal` — today's goal
- `#daily-tasbeeh-progress` — progress bar fill element
- `#daily-quran-pages` — pages read today
- `#continue-reading-btn` — continue quran button
- `#home-favorites-list` — favorite duas quick list
- `#recent-activity-list` — recent activity feed
- `#daily-reminder` — motivational reminder text

#### Quran Section (#quran-section)
- `#quran-surah-list-view` — surah listing view
- `#quran-reader-view` — reading view
- `#surah-search-input` — search input for surahs
- `#surah-list-container` — surah list container
- `#quran-reader-header` — reader top bar
- `#quran-surah-title` — current surah name
- `#quran-ayah-display` — ayah text container
- `#quran-page-number` — current page number
- `#quran-prev-btn` — previous page/surah
- `#quran-next-btn` — next page/surah
- `#quran-bookmark-btn` — bookmark current position
- `#quran-font-increase` — increase font size
- `#quran-font-decrease` — decrease font size
- `#quran-back-btn` — back to surah list
- `#quran-bookmarks-list` — bookmarks panel
- `#quran-search-ayah-input` — search ayahs

#### Tasbeeh Section (#tasbeeh-section)
- `#tasbeeh-count-display` — large counter number
- `#tasbeeh-phrase-display` — current phrase text
- `#tasbeeh-target-display` — target count
- `#tasbeeh-progress-ring` — circular progress SVG
- `#tasbeeh-progress-circle` — SVG circle element
- `#tasbeeh-increment-btn` — main tap button
- `#tasbeeh-undo-btn` — undo last count
- `#tasbeeh-reset-btn` — reset counter
- `#tasbeeh-sound-toggle` — toggle sound
- `#tasbeeh-phrase-select` — phrase selector dropdown
- `#tasbeeh-custom-phrase-input` — custom phrase input
- `#tasbeeh-target-input` — target input
- `#tasbeeh-lifetime-count` — lifetime total
- `#tasbeeh-daily-count` — daily total
- `#tasbeeh-sessions-list` — session history

#### Duas Section (#duas-section)
- `#duas-search-input` — search input
- `#duas-category-filter` — category filter
- `#duas-list-container` — duas list
- `#duas-add-btn` — add new dua FAB
- `#dua-modal` — add/edit dua modal
- `#dua-modal-title` — modal title
- `#dua-text-input` — dua text textarea
- `#dua-category-select` — category select
- `#dua-notes-input` — notes textarea
- `#dua-repetition-input` — repetition count input
- `#dua-save-btn` — save dua button
- `#dua-cancel-btn` — cancel button
- `#dua-delete-btn` — delete button (hidden for new)

#### History Section (#history-section)
- `#history-tab-daily` — daily tab
- `#history-tab-weekly` — weekly tab
- `#history-tab-monthly` — monthly tab
- `#history-stats-container` — stats display area
- `#history-streak-count` — active days streak
- `#history-total-tasbeeh` — lifetime tasbeeh
- `#history-total-quran` — total quran pages
- `#history-chart-container` — chart area
- `#history-records-list` — records list
- `#history-activity-list` — activity feed

#### Settings Section (#settings-section)
- `#setting-theme-toggle` — dark/light toggle
- `#setting-language-toggle` — ar/en toggle
- `#setting-font-size-range` — font size slider
- `#setting-font-size-value` — font size display
- `#setting-sound-toggle` — sound toggle
- `#setting-haptic-toggle` — haptic toggle
- `#setting-daily-goal-input` — daily goal input
- `#setting-export-btn` — export data
- `#setting-import-btn` — import data
- `#setting-import-file` — file input (hidden)
- `#setting-clear-btn` — clear all data
- `#app-version` — version display

#### Global
- `#toast-container` — toast notifications
- `#modal-overlay` — modal backdrop
- `.modal` — modal windows
- `.modal.active` — visible modal

## CSS Design System

### Colors (CSS Custom Properties on :root)
```css
--emerald: #063B32;
--dark-green: #082C27;
--royal-green: #0D5B48;
--gold: #D6B46A;
--cream: #F4EBDD;
--soft-white: #FAF8F2;
--dark-text: #172B26;

/* Dark theme (default) */
--bg-primary: #082C27;
--bg-secondary: #063B32;
--bg-card: #0D5B48;
--bg-card-hover: #0f6b55;
--text-primary: #FAF8F2;
--text-secondary: #c4c9c7;
--text-muted: #8a9490;
--accent: #D6B46A;
--accent-hover: #e0c47e;
--border: rgba(214,180,106,0.15);
--shadow: rgba(0,0,0,0.3);

/* Light theme */
[data-theme="light"]
--bg-primary: #FAF8F2;
--bg-secondary: #F4EBDD;
--bg-card: #FFFFFF;
--bg-card-hover: #f8f5ef;
--text-primary: #172B26;
--text-secondary: #3d5249;
--text-muted: #6b7f77;
--accent: #0D5B48;
--accent-hover: #063B32;
--border: rgba(13,91,72,0.15);
--shadow: rgba(0,0,0,0.08);
```

### Typography
```css
--font-arabic: 'Amiri', 'Traditional Arabic', 'Noto Naskh Arabic', serif;
--font-ui: 'Segoe UI', 'Noto Sans Arabic', sans-serif;
--font-quran: 'Amiri Quran', 'Amiri', 'KFGQPC Uthmanic Script HAFS', serif;
```

Google Fonts to load: Amiri (400,700), Noto Sans Arabic (400,600,700)
Use @import in CSS or link tags in HTML.

### Spacing Scale
4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px

### Border Radius
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-full: 50%;

### Breakpoints
- Mobile: max-width 768px
- Tablet: 769px - 1024px
- Desktop: min-width 1025px

### Transitions
All transitions: 0.3s ease

### Bottom Nav (mobile only, show below 769px)
Height: 64px, fixed bottom, 6 items with icons + labels

### Sidebar (desktop only, show above 1024px)
Width: 260px, fixed left (RTL: right), full height

### Cards
Background: var(--bg-card), border-radius: var(--radius-md), padding: 20px, border: 1px solid var(--border)

### Buttons
Primary: background var(--accent), color var(--dark-text)
Secondary: background transparent, border 1px solid var(--border)
FAB: 56px round, background var(--accent), fixed position

## JavaScript Module APIs

### Global namespace
```js
window.WardApp = { storage, quran, tasbeeh, duas, history }
```

### storage.js — StorageManager
```js
class StorageManager {
  async initDB()
  async addItem(storeName, item) -> id
  async getItem(storeName, id) -> item
  async getAllItems(storeName) -> items[]
  async updateItem(storeName, item) -> void
  async deleteItem(storeName, id) -> void
  async clearStore(storeName) -> void
  async exportAllData() -> jsonString
  async importData(jsonString) -> {success, message}
  getSetting(key, defaultValue) -> value
  setSetting(key, value) -> void
}
```

IndexedDB name: `WardiDB`, version: 1
Object stores:
- `duas` — keyPath: 'id', autoIncrement
- `tasbeeh_sessions` — keyPath: 'id', autoIncrement
- `quran_bookmarks` — keyPath: 'id', autoIncrement
- `quran_favorites` — keyPath: 'surahNumber'
- `quran_cache` — keyPath: 'surahNumber'
- `history_log` — keyPath: 'id', autoIncrement
- `daily_stats` — keyPath: 'date'

LocalStorage keys (prefix `wardi_`):
- `wardi_theme` — 'dark'|'light'
- `wardi_language` — 'ar'|'en'
- `wardi_font_size` — number (16-32)
- `wardi_sound` — 'true'|'false'
- `wardi_haptic` — 'true'|'false'
- `wardi_daily_goal` — number
- `wardi_quran_position` — JSON string {surah,ayah}
- `wardi_quran_font_size` — number

### app.js — Main Application Controller
```js
class App {
  constructor()
  async init()
  navigateTo(sectionName)
  setTheme(theme)
  setLanguage(lang)
  updateDashboard()
  showToast(message, type='success')
  showModal(modalElement)
  hideModal(modalElement)
  confirmAction(message) -> Promise<boolean>
  getGreeting() -> string
  loadDailyReminder() -> string
}
```

App.init() should:
1. Init StorageManager
2. Init all modules
3. Apply saved theme/language/font-size
4. Set up navigation event listeners
5. Load dashboard
6. Register service worker

### quran.js — QuranManager
```js
class QuranManager {
  constructor(storage)
  async init()
  async loadSurahList() // Load from embedded data or API
  async loadSurah(number) // Load ayahs, cache in IndexedDB
  renderSurahList(filter='')
  renderSurah(surahData)
  async searchAyahs(query)
  async addBookmark(surah, ayah, surahName)
  async removeBookmark(id)
  async getBookmarks()
  savePosition(surah, ayah)
  getLastPosition() -> {surah, ayah}
  async toggleFavorite(surahNumber, surahName)
  changeFontSize(delta)
  showSurahList()
  showReader()
  navigateSurah(direction) // +1 or -1
}
```

Quran API: `https://api.alquran.cloud/v1/surah/{number}/ar.alafasy` for text
Surah list: `https://api.alquran.cloud/v1/surah` 
Cache all fetched data in IndexedDB `quran_cache` store.

Surah list data should also be embedded as fallback (at minimum names and numbers).

### tasbeeh.js — TasbeehManager
```js
class TasbeehManager {
  constructor(storage)
  async init()
  increment()
  undo()
  async reset()
  setPhrase(phrase, target)
  async saveSession()
  async getStats() -> {daily, weekly, lifetime}
  updateDisplay()
  playSound()
  vibrate()
  renderAzkarCategories()
  showAzkarCategory(categoryKey)
  showAzkarList()
  showTasbeeh()
}
```

Built-in Azkar data (embed in the JS, not external file):
- أذكار الصباح — morning azkar
- أذكار المساء — evening azkar
- أذكار بعد الصلاة — after prayer
- تسبيح عام — general tasbeeh (سبحان الله, الحمد لله, الله أكبر, لا إله إلا الله, etc.)
- استغفار — istighfar
- صلاة على النبي — salawat

Each azkar item: { text, count, reference }

### duas.js — DuasManager
```js
class DuasManager {
  constructor(storage)
  async init()
  async loadDuas()
  async loadDefaultDuas() // Load from data/duas.json on first run
  renderDuas(duas)
  async addDua(duaData)
  async updateDua(duaData)
  async deleteDua(id)
  async toggleFavorite(id)
  searchDuas(query) -> filtered[]
  filterByCategory(category) -> filtered[]
  showAddModal()
  showEditModal(dua)
  copyDuaText(text)
}
```

### history.js — HistoryManager
```js
class HistoryManager {
  constructor(storage)
  async init()
  async logActivity(type, details)
  async getDailyStats(date) -> stats
  async getWeeklyStats() -> stats[]
  async getMonthlyStats() -> stats[]
  async getStreak() -> number
  async getRecords() -> records
  renderStats(period)
  renderChart(data)
  renderActivityFeed()
}
```

Activity types: 'tasbeeh', 'quran', 'dua', 'azkar'

## Translations

Use a simple translations object in app.js:

```js
const translations = {
  ar: {
    home: 'الرئيسية',
    quran: 'القرآن الكريم',
    tasbeeh: 'التسبيح',
    duas: 'الأدعية',
    history: 'السجل',
    settings: 'الإعدادات',
    // ... etc
  },
  en: {
    home: 'Home',
    quran: 'Quran',
    tasbeeh: 'Tasbeeh',
    duas: 'Duas',
    history: 'History',
    settings: 'Settings',
    // ... etc
  }
};
```

## Nav Icons (Unicode/Text)
Use these Unicode characters for nav icons:
- Home: 🏠 or ◉
- Quran: 📖 or ◈
- Tasbeeh: 📿 or ◎
- Duas: 🤲 or ❋
- History: 📊 or ◧
- Settings: ⚙ or ◉

Actually, use simple CSS shapes or unicode for icons. No SVG files.

## Important Notes
1. All file paths must be RELATIVE (for GitHub Pages)
2. Script loading order in HTML: storage.js, history.js, quran.js, tasbeeh.js, duas.js, app.js
3. Each module file should expose its class on window (e.g., window.StorageManager = StorageManager)
4. app.js creates instances and coordinates everything
5. The app auto-initializes on DOMContentLoaded
6. Use try/catch around all async operations
7. Service worker registration in app.js
8. All Arabic text must be in proper Unicode, no transliteration
9. Quran text ONLY from API, never AI-generated
10. Duas from data/duas.json — pre-populated from user's personal collection

