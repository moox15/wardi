/**
 * App — Main Application Controller for Wardi Pro
 * Orchestrates all modules, navigation, settings, dashboard, and i18n.
 */

/* ================================================================== */
/*  Translations                                                       */
/* ================================================================== */

const translations = {
  ar: {
    home: 'الرئيسية', quran: 'القرآن الكريم', tasbeeh: 'التسبيح',
    duas: 'الأدعية', history: 'السجل', settings: 'الإعدادات',
    greeting_morning: 'صباح الخير', greeting_afternoon: 'مساء النور', greeting_evening: 'مساء الخير',
    daily_progress: 'تقدم اليوم', tasbeeh_count: 'التسبيح', quran_pages: 'صفحات القرآن',
    continue_reading: 'متابعة القراءة', favorites: 'المفضلة', recent_activity: 'النشاط الأخير',
    daily_reminder: 'تذكير اليوم', search: 'بحث...', add_dua: 'إضافة دعاء',
    save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', copy: 'نسخ',
    copied: 'تم النسخ', theme: 'المظهر', language: 'اللغة', font_size: 'حجم الخط',
    sound: 'الصوت', haptic: 'الاهتزاز', daily_goal: 'الهدف اليومي',
    export_data: 'تصدير البيانات', import_data: 'استيراد البيانات',
    clear_data: 'حذف جميع البيانات', version: 'الإصدار',
    privacy_note: 'جميع بياناتك محفوظة محليًا على جهازك فقط ولا يتم إرسالها لأي طرف خارجي.',
    dark: 'داكن', light: 'فاتح', arabic: 'عربي', english: 'English',
    no_favorites: 'لا توجد أدعية مفضلة بعد', no_activity: 'لا يوجد نشاط حديث',
    streak: 'أيام متتالية', total: 'الإجمالي', today: 'اليوم', this_week: 'هذا الأسبوع', this_month: 'هذا الشهر',
    personal_duas: 'أدعيتي الخاصة', all_categories: 'الكل',
    surah: 'سورة', ayah: 'آية', page_num: 'صفحة', bookmark: 'علامة مرجعية',
    bookmarks: 'العلامات المرجعية', no_bookmarks: 'لا توجد علامات مرجعية',
    loading: 'جاري التحميل...', error_loading: 'حدث خطأ في التحميل',
    reset: 'إعادة تعيين', undo: 'تراجع', target: 'الهدف', session: 'الجلسة',
    lifetime: 'مدى الحياة', daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري',
    category: 'التصنيف', notes: 'ملاحظات', repetition: 'التكرار',
    confirm_reset: 'هل تريد إعادة تعيين العداد؟', morning_azkar: 'أذكار الصباح',
    evening_azkar: 'أذكار المساء', after_prayer: 'أذكار بعد الصلاة',
    general_tasbeeh: 'تسبيح عام', istighfar: 'استغفار', salawat: 'صلاة على النبي',
    custom: 'مخصص', add_custom: 'إضافة تسبيح مخصص',
    dua_text: 'نص الدعاء', dua_category: 'التصنيف', dua_notes: 'ملاحظات',
    dua_repetition: 'عدد التكرار', new_dua: 'دعاء جديد', edit_dua: 'تعديل الدعاء',
    confirm_delete: 'هل تريد حذف هذا الدعاء؟',
    records: 'الأرقام القياسية', best_daily_tasbeeh: 'أعلى تسبيح يومي',
    best_daily_quran: 'أكثر صفحات قرآن', longest_streak: 'أطول سلسلة',
    quran_unavailable: 'بيانات القرآن غير متوفرة حاليًا. يُرجى الاتصال بالإنترنت.',
    offline_notice: 'أنت غير متصل بالإنترنت',
    data_local_notice: 'بياناتك محفوظة على هذا الجهاز/المتصفح فقط ولا تتزامن تلقائيًا بين الأجهزة.'
  },
  en: {
    home: 'Home', quran: 'Quran', tasbeeh: 'Tasbeeh',
    duas: 'Duas', history: 'History', settings: 'Settings',
    greeting_morning: 'Good Morning', greeting_afternoon: 'Good Afternoon', greeting_evening: 'Good Evening',
    daily_progress: "Today's Progress", tasbeeh_count: 'Tasbeeh', quran_pages: 'Quran Pages',
    continue_reading: 'Continue Reading', favorites: 'Favorites', recent_activity: 'Recent Activity',
    daily_reminder: 'Daily Reminder', search: 'Search...', add_dua: 'Add Dua',
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', copy: 'Copy',
    copied: 'Copied', theme: 'Theme', language: 'Language', font_size: 'Font Size',
    sound: 'Sound', haptic: 'Haptic', daily_goal: 'Daily Goal',
    export_data: 'Export Data', import_data: 'Import Data',
    clear_data: 'Clear All Data', version: 'Version',
    privacy_note: 'All your data is stored locally on your device only and is never sent to any third party.',
    dark: 'Dark', light: 'Light', arabic: 'عربي', english: 'English',
    no_favorites: 'No favorite duas yet', no_activity: 'No recent activity',
    streak: 'Day Streak', total: 'Total', today: 'Today', this_week: 'This Week', this_month: 'This Month',
    personal_duas: 'My Personal Duas', all_categories: 'All',
    surah: 'Surah', ayah: 'Ayah', page_num: 'Page', bookmark: 'Bookmark',
    bookmarks: 'Bookmarks', no_bookmarks: 'No bookmarks yet',
    loading: 'Loading...', error_loading: 'Error loading',
    reset: 'Reset', undo: 'Undo', target: 'Target', session: 'Session',
    lifetime: 'Lifetime', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
    category: 'Category', notes: 'Notes', repetition: 'Repetition',
    confirm_reset: 'Reset the counter?', morning_azkar: 'Morning Azkar',
    evening_azkar: 'Evening Azkar', after_prayer: 'After Prayer',
    general_tasbeeh: 'General Tasbeeh', istighfar: 'Istighfar', salawat: 'Salawat',
    custom: 'Custom', add_custom: 'Add Custom Tasbeeh',
    dua_text: 'Dua Text', dua_category: 'Category', dua_notes: 'Notes',
    dua_repetition: 'Repetition Count', new_dua: 'New Dua', edit_dua: 'Edit Dua',
    confirm_delete: 'Delete this dua?',
    records: 'Records', best_daily_tasbeeh: 'Best Daily Tasbeeh',
    best_daily_quran: 'Most Quran Pages', longest_streak: 'Longest Streak',
    quran_unavailable: 'Quran data is currently unavailable. Please connect to the internet.',
    offline_notice: 'You are offline',
    data_local_notice: 'Your data is stored on this device/browser only and does not sync automatically across devices.'
  }
};

/* ================================================================== */
/*  App class                                                          */
/* ================================================================== */

class App {
  constructor() {
    this.storage = null;
    this.history = null;
    this.quran = null;
    this.tasbeeh = null;
    this.duas = null;
    this.currentSection = 'home';
    this.currentLang = 'ar';
    this.currentTheme = 'dark';
  }

  /* ---------------------------------------------------------------- */
  /*  Bootstrap                                                        */
  /* ---------------------------------------------------------------- */

  async init() {
    try {
      // 1. Storage layer
      this.storage = new StorageManager();
      await this.storage.initDB();

      // 2. Read saved settings
      this.currentTheme = this.storage.getSetting('theme', 'dark');
      this.currentLang  = this.storage.getSetting('language', 'ar');
      const fontSize    = this.storage.getSetting('font_size', 18);
      // sound, haptic, dailyGoal are read on-demand; persisted in localStorage

      this.setTheme(this.currentTheme);
      this.setLanguage(this.currentLang);
      document.documentElement.style.setProperty('--base-font-size', fontSize + 'px');

      // 3. Initialise modules
      this.history = new HistoryManager(this.storage);
      await this.history.init();

      // QuranManager, TasbeehManager, DuasManager are created by their own
      // JS files which load before app.js (per ARCHITECTURE.md load order).
      if (typeof QuranManager !== 'undefined') {
        this.quran = new QuranManager(this.storage);
        await this.quran.init();
      }

      if (typeof TasbeehManager !== 'undefined') {
        this.tasbeeh = new TasbeehManager(this.storage, this.history);
        await this.tasbeeh.init();
      }

      if (typeof DuasManager !== 'undefined') {
        this.duas = new DuasManager(this.storage);
        await this.duas.init();
      }

      // 4. Navigation
      this.setupNavigation();

      // 5. Settings panel
      this.setupSettings();

      // 6. Dashboard
      await this.updateDashboard();

      // 7. Service worker
      this.registerServiceWorker();

      // 8. Global reference
      window.WardApp = this;

      // 9. Initial Route from URL Hash if present
      const initialHash = (window.location.hash || '').replace('#', '');
      if (initialHash && document.getElementById(initialHash + '-section')) {
        this.navigateTo(initialHash);
      }

      console.log('Wardi Pro initialized successfully');
    } catch (err) {
      console.error('Failed to initialize app:', err);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Navigation                                                       */
  /* ---------------------------------------------------------------- */

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        if (section) this.navigateTo(section);
      });
    });

    // Mobile Top Bar Settings Icon
    const openSettingsBtn = document.getElementById('open-settings-btn');
    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', () => this.navigateTo('settings'));
    }

    // Settings Back to Home Button
    const settingsBackBtn = document.getElementById('settings-back-btn');
    if (settingsBackBtn) {
      settingsBackBtn.addEventListener('click', () => this.navigateTo('home'));
    }

    // Quick Action Tiles on Home Screen
    document.querySelectorAll('[data-action]').forEach(tile => {
      tile.addEventListener('click', () => {
        const action = tile.dataset.action;
        if (action === 'goto-quran') this.navigateTo('quran');
        if (action === 'goto-tasbeeh') this.navigateTo('tasbeeh');
        if (action === 'goto-duas') this.navigateTo('duas');
        if (action === 'goto-azkar') {
          this.navigateTo('tasbeeh');
          setTimeout(() => {
            const azkarBrowser = document.querySelector('.azkar-browser');
            if (azkarBrowser) azkarBrowser.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }
      });
    });
  }

  navigateTo(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    // Deactivate all nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Activate target section
    const section = document.getElementById(sectionName + '-section');
    if (section) section.classList.add('active');

    // Activate matching nav buttons (sidebar + bottom nav may both exist)
    document.querySelectorAll(`.nav-item[data-section="${sectionName}"]`).forEach(n => {
      n.classList.add('active');
    });

    this.currentSection = sectionName;
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '#' + sectionName);
      }
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh section data
    try {
      if (sectionName === 'home') this.updateDashboard();
      if (sectionName === 'history' && this.history) this.history.renderStats('daily');
      if (sectionName === 'duas' && this.duas && typeof this.duas.loadDuas === 'function') this.duas.loadDuas();
    } catch (err) {
      console.error('Error refreshing section:', err);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Theme & Language                                                  */
  /* ---------------------------------------------------------------- */

  setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    this.storage.setSetting('theme', theme);
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#063B32' : '#FAF8F2';
  }

  setLanguage(lang) {
    this.currentLang = lang;
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.setAttribute('data-lang', lang);
    this.storage.setSetting('language', lang);
    this.applyTranslations();
  }

  applyTranslations() {
    const dict = translations[this.currentLang];
    if (!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        // For inputs use placeholder, for everything else use textContent
        if (el.tagName === 'INPUT' && el.type !== 'button' && el.type !== 'submit') {
          el.placeholder = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Dashboard                                                        */
  /* ---------------------------------------------------------------- */

  async updateDashboard() {
    try {
      // 1. Greeting
      const greeting = this.getGreeting();
      const greetEl = document.getElementById('greeting-text');
      if (greetEl) greetEl.textContent = greeting;

      // 2. Dates
      this.updateDates();

      // 3. Daily stats
      const today = new Date().toISOString().split('T')[0];
      const stats = await this.history.getDailyStats(today);
      const goal  = this.storage.getSetting('daily_goal', 100);

      const tasbeehCount    = document.getElementById('daily-tasbeeh-count');
      const tasbeehGoal     = document.getElementById('daily-tasbeeh-goal');
      const tasbeehProgress = document.getElementById('daily-tasbeeh-progress');
      const quranPages      = document.getElementById('daily-quran-pages');

      if (tasbeehCount) tasbeehCount.textContent = stats.tasbeehCount || 0;
      if (tasbeehGoal) tasbeehGoal.textContent = goal;
      if (tasbeehProgress) {
        const pct = Math.min(((stats.tasbeehCount || 0) / goal) * 100, 100);
        tasbeehProgress.style.width = pct + '%';
      }
      if (quranPages) quranPages.textContent = stats.quranPages || 0;

      // 4. Continue reading
      const lastPos     = this.storage.getSetting('quran_position', null);
      const continueBtn = document.getElementById('continue-reading-btn');
      if (continueBtn) {
        if (lastPos) {
          continueBtn.style.display = 'block';
          continueBtn.onclick = () => {
            this.navigateTo('quran');
            if (this.quran && typeof this.quran.loadSurah === 'function') {
              const pos = typeof lastPos === 'string' ? JSON.parse(lastPos) : lastPos;
              this.quran.loadSurah(pos.surah, pos.ayah || 1);
            }
          };
        } else {
          continueBtn.style.display = 'none';
        }
      }

      // 5. Favourite duas
      await this.loadHomeFavorites();

      // 6. Recent activity
      await this.loadRecentActivity();

      // 7. Daily reminder
      this.loadDailyReminder();
    } catch (err) {
      console.error('updateDashboard error:', err);
    }
  }

  getGreeting() {
    const hour = new Date().getHours();
    if (this.currentLang === 'ar') {
      if (hour < 12) return 'صباح الخير 🌅';
      if (hour < 17) return 'مساء النور 🌤️';
      return 'مساء الخير 🌙';
    }
    if (hour < 12) return 'Good Morning 🌅';
    if (hour < 17) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  }

  updateDates() {
    const now = new Date();
    const locale = this.currentLang === 'ar' ? 'ar-SA' : 'en-US';

    const gregEl = document.getElementById('gregorian-date');
    if (gregEl) {
      gregEl.textContent = now.toLocaleDateString(locale, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }

    const hijriEl = document.getElementById('hijri-date');
    if (hijriEl) {
      try {
        const hijriLocale = this.currentLang === 'ar'
          ? 'ar-SA-u-ca-islamic-umalqura'
          : 'en-US-u-ca-islamic-umalqura';
        hijriEl.textContent = now.toLocaleDateString(hijriLocale, {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      } catch {
        hijriEl.textContent = '';
      }
    }
  }

  async loadHomeFavorites() {
    const container = document.getElementById('home-favorites-list');
    if (!container) return;

    try {
      const allDuas  = await this.storage.getAllItems('duas');
      const favorites = allDuas.filter(d => d.isFavorite).slice(0, 3);

      if (favorites.length === 0) {
        container.innerHTML = `<p class="empty-state" data-i18n="no_favorites">${
          this.currentLang === 'ar' ? 'لا توجد أدعية مفضلة بعد' : 'No favorite duas yet'
        }</p>`;
        return;
      }

      container.innerHTML = favorites.map(d => `
        <div class="mini-dua-card" onclick="window.WardApp.navigateTo('duas')" style="cursor:pointer;">
          <p class="mini-dua-text">${this._escapeHTML(d.text).substring(0, 80)}${d.text.length > 80 ? '...' : ''}</p>
        </div>
      `).join('');
    } catch (e) {
      console.error('Error loading favorites:', e);
    }
  }

  async loadRecentActivity() {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    try {
      const activities = await this.history.getRecentActivity(5);

      if (!activities || activities.length === 0) {
        container.innerHTML = `<p class="empty-state" data-i18n="no_activity">${
          this.currentLang === 'ar' ? 'لا يوجد نشاط حديث' : 'No recent activity'
        }</p>`;
        return;
      }

      const typeIcons = { tasbeeh: '📿', quran: '📖', dua: '🤲', azkar: '🌙' };

      container.innerHTML = activities.map(a => `
        <div class="activity-item">
          <span class="activity-icon">${typeIcons[a.type] || '📌'}</span>
          <span class="activity-text">${this._escapeHTML(a.details?.description || a.type)}</span>
          <span class="activity-time">${this.timeAgo(a.timestamp)}</span>
        </div>
      `).join('');
    } catch (e) {
      console.error('Error loading activity:', e);
    }
  }

  timeAgo(timestamp) {
    if (!timestamp) return '';
    const diff  = Date.now() - new Date(timestamp).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);

    if (this.currentLang === 'ar') {
      if (mins < 1)  return 'الآن';
      if (mins < 60) return `منذ ${mins} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      return `منذ ${days} يوم`;
    }
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  /* ---------------------------------------------------------------- */
  /*  Daily Reminder — verified Islamic texts only                     */
  /* ---------------------------------------------------------------- */

  loadDailyReminder() {
    const el = document.getElementById('daily-reminder');
    if (!el) return;

    // Arabic reminders — Quran ayat with surah:ayah, or Hadith with source
    const reminders_ar = [
      'قال رسول الله ﷺ: «أحبُّ الأعمال إلى الله أدومُها وإن قلَّ» — متفق عليه',
      'قال رسول الله ﷺ: «مَن قرأ حرفًا من كتاب الله فله به حسنة، والحسنة بعشر أمثالها» — رواه الترمذي',
      'قال رسول الله ﷺ: «أقربُ ما يكونُ العبدُ من ربِّه وهو ساجد، فأكثروا الدعاء» — رواه مسلم',
      'قال رسول الله ﷺ: «الطُّهور شطر الإيمان، والحمد لله تملأ الميزان» — رواه مسلم',
      'قال رسول الله ﷺ: «كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم» — متفق عليه',
      '﴿وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ﴾ — البقرة: ١٨٦',
      '﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾ — الرعد: ٢٨'
    ];

    const reminders_en = [
      'The Prophet ﷺ said: "The most beloved deeds to Allah are the most consistent, even if small." — Agreed upon',
      'The Prophet ﷺ said: "Whoever recites a letter from the Book of Allah will have a reward, and each reward is multiplied by ten." — Tirmidhi',
      'The Prophet ﷺ said: "The closest a servant is to his Lord is while prostrating, so increase your supplications." — Muslim',
      '"And when My servants ask about Me, I am near. I respond to the call of the caller when he calls upon Me." — Quran 2:186',
      '"Verily, in the remembrance of Allah do hearts find rest." — Quran 13:28'
    ];

    const reminders = this.currentLang === 'ar' ? reminders_ar : reminders_en;
    // Same reminder all day — pick based on day-of-year
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    el.textContent = reminders[dayOfYear % reminders.length];
  }

  /* ---------------------------------------------------------------- */
  /*  Settings panel                                                    */
  /* ---------------------------------------------------------------- */

  setupSettings() {
    // Theme toggle
    const themeToggle = document.getElementById('setting-theme-toggle');
    if (themeToggle) {
      themeToggle.checked = this.currentTheme === 'light';
      themeToggle.addEventListener('change', () => {
        this.setTheme(themeToggle.checked ? 'light' : 'dark');
      });
    }

    // Language toggle
    const langToggle = document.getElementById('setting-language-toggle');
    if (langToggle) {
      langToggle.checked = this.currentLang === 'en';
      langToggle.addEventListener('change', () => {
        this.setLanguage(langToggle.checked ? 'en' : 'ar');
      });
    }

    // Font size slider
    const fontRange = document.getElementById('setting-font-size-range');
    const fontValue = document.getElementById('setting-font-size-value');
    if (fontRange) {
      fontRange.value = this.storage.getSetting('font_size', 18);
      if (fontValue) fontValue.textContent = fontRange.value + 'px';
      fontRange.addEventListener('input', () => {
        const size = fontRange.value;
        document.documentElement.style.setProperty('--base-font-size', size + 'px');
        this.storage.setSetting('font_size', parseInt(size, 10));
        if (fontValue) fontValue.textContent = size + 'px';
      });
    }

    // Sound toggle
    const soundToggle = document.getElementById('setting-sound-toggle');
    if (soundToggle) {
      soundToggle.checked = this.storage.getSetting('sound', 'true') === 'true';
      soundToggle.addEventListener('change', () => {
        this.storage.setSetting('sound', soundToggle.checked ? 'true' : 'false');
      });
    }

    // Haptic toggle
    const hapticToggle = document.getElementById('setting-haptic-toggle');
    if (hapticToggle) {
      hapticToggle.checked = this.storage.getSetting('haptic', 'true') === 'true';
      hapticToggle.addEventListener('change', () => {
        this.storage.setSetting('haptic', hapticToggle.checked ? 'true' : 'false');
      });
    }

    // Daily goal
    const goalInput = document.getElementById('setting-daily-goal-input');
    if (goalInput) {
      goalInput.value = this.storage.getSetting('daily_goal', 100);
      goalInput.addEventListener('change', () => {
        this.storage.setSetting('daily_goal', parseInt(goalInput.value, 10) || 100);
      });
    }

    // Export
    const exportBtn = document.getElementById('setting-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          const data = await this.storage.exportAllData();
          const blob = new Blob([data], { type: 'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `wardi-backup-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          this.showToast(this.currentLang === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Data exported successfully');
        } catch {
          this.showToast(this.currentLang === 'ar' ? 'فشل تصدير البيانات' : 'Export failed', 'error');
        }
      });
    }

    // Import
    const importBtn  = document.getElementById('setting-import-btn');
    const importFile = document.getElementById('setting-import-file');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const confirmMsg = this.currentLang === 'ar'
          ? 'سيتم استبدال جميع البيانات الحالية. هل تريد المتابعة؟'
          : 'This will replace all current data. Continue?';
        if (!confirm(confirmMsg)) {
          importFile.value = '';
          return;
        }

        try {
          const text   = await file.text();
          const result = await this.storage.importData(text);
          if (result.success) {
            this.showToast(this.currentLang === 'ar' ? 'تم استيراد البيانات بنجاح' : 'Data imported successfully');
            location.reload();
          } else {
            this.showToast(result.message, 'error');
          }
        } catch {
          this.showToast(this.currentLang === 'ar' ? 'ملف غير صالح' : 'Invalid file', 'error');
        }
        importFile.value = '';
      });
    }

    // Clear all data (double confirm)
    const clearBtn = document.getElementById('setting-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        const msg1 = this.currentLang === 'ar'
          ? 'هل أنت متأكد؟ سيتم حذف جميع البيانات نهائيًا!'
          : 'Are you sure? All data will be permanently deleted!';
        if (!confirm(msg1)) return;

        const msg2 = this.currentLang === 'ar'
          ? 'تأكيد نهائي: حذف كل شيء؟'
          : 'Final confirmation: delete everything?';
        if (!confirm(msg2)) return;

        await this.storage.clearAllData();
        this.showToast(this.currentLang === 'ar' ? 'تم حذف جميع البيانات' : 'All data deleted');
        location.reload();
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Toast & Modal                                                    */
  /* ---------------------------------------------------------------- */

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.add('toast--hiding');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showModal(selector) {
    const overlay = document.getElementById('modal-overlay');
    const modal   = document.querySelector(selector);
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
  }

  hideModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  }

  /* ---------------------------------------------------------------- */
  /*  Service Worker                                                   */
  /* ---------------------------------------------------------------- */

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.warn('Service Worker registration failed:', err));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Utility                                                          */
  /* ---------------------------------------------------------------- */

  /** Basic HTML-escape for user-generated text injected via innerHTML */
  _escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

/* ================================================================== */
/*  Auto-init on DOM ready                                             */
/* ================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
