/**
 * App — Main Application Controller for Wardi Pro
 * Orchestrates all modules, navigation, comprehensive personal dashboard,
 * prayer times, worship tracking, settings, i18n, and PWA installation.
 */

/* ================================================================== */
/*  Translations                                                       */
/* ================================================================== */

const translations = {
  ar: {
    home: 'الرئيسية', prayer: 'الصلاة', quran: 'القرآن الكريم', tasbeeh: 'التسبيح',
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
    home: 'Home', prayer: 'Prayer', quran: 'Quran', tasbeeh: 'Tasbeeh',
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
/*  App Class                                                          */
/* ================================================================== */

class App {
  constructor() {
    window.WardApp = this;
    window.app = this;
    this.storage = null;
    this.history = null;
    this.prayer = null;
    this.quran = null;
    this.tasbeeh = null;
    this.duas = null;

    this.currentSection = 'home';
    this.currentLang = 'ar';
    this.currentTheme = 'dark';

    // PWA Installation state
    this.deferredInstallPrompt = null;
    this.timelineFilter = 'all';
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

      this.setTheme(this.currentTheme);
      this.setLanguage(this.currentLang);
      document.documentElement.style.setProperty('--base-font-size', fontSize + 'px');

      // 3. Initialise modules
      this.history = new HistoryManager(this.storage);
      await this.history.init();

      if (typeof PrayerManager !== 'undefined') {
        this.prayer = new PrayerManager(this.storage, this.history);
        await this.prayer.init();
      }

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

      // Expose globally for cross-module & testing access
      window.app = this;
      window.storage = this.storage;
      window.historyManager = this.history;
      window.prayerManager = this.prayer;
      window.quranManager = this.quran;
      window.tasbeehManager = this.tasbeeh;
      window.duasManager = this.duas;

      // 4. Setup Navigation & Hash Routing
      this.setupNavigation();

      // 5. Setup PWA Install System
      this.setupPwaInstall();

      // 6. Setup Settings Panel
      this.setupSettings();

      // 7. Setup Comprehensive Dashboard
      this.setupDashboardEvents();
      await this.updateDashboard();

      // 8. Global reference
      window.WardApp = this;

      // 9. Initial Route from URL Hash
      const initialHash = (window.location.hash || '').replace('#', '');
      if (initialHash && document.getElementById(initialHash + '-section')) {
        this.navigateTo(initialHash);
      } else {
        this.navigateTo('home');
      }

      console.log('[Wardi Pro] Application initialized successfully with full prayer & dashboard upgrade.');
    } catch (err) {
      console.error('[Wardi Pro] Failed to initialize app:', err);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Navigation                                                       */
  /* ---------------------------------------------------------------- */

  setupNavigation() {
    // Bottom Nav & Sidebar Buttons
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

    // Settings Back Button
    const settingsBackBtn = document.getElementById('settings-back-btn');
    if (settingsBackBtn) {
      settingsBackBtn.addEventListener('click', () => this.navigateTo('home'));
    }

    // Handle Browser Back / Forward buttons (popstate / hashchange)
    window.addEventListener('hashchange', () => {
      const hash = (window.location.hash || '').replace('#', '');
      if (hash && hash !== this.currentSection && document.getElementById(hash + '-section')) {
        this.navigateTo(hash, false);
      }
    });

    // Quick Action Tiles Across Views
    document.querySelectorAll('[data-action]').forEach(tile => {
      tile.addEventListener('click', () => {
        const action = tile.dataset.action;
        if (action === 'goto-prayer') this.navigateTo('prayer');
        if (action === 'goto-quran') this.navigateTo('quran');
        if (action === 'goto-tasbeeh') this.navigateTo('tasbeeh');
        if (action === 'goto-duas') this.navigateTo('duas');
        if (action === 'goto-history') this.navigateTo('history');
        if (action === 'goto-settings') this.navigateTo('settings');
        if (action === 'goto-qibla') {
          this.navigateTo('prayer');
          setTimeout(() => {
            const qiblaCard = document.getElementById('qibla-compass-card');
            if (qiblaCard) qiblaCard.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }
        if (action === 'goto-azkar-morning') {
          this.navigateTo('tasbeeh');
          setTimeout(() => {
            if (this.tasbeeh) {
              const catItem = document.querySelector('.azkar-cat-card[data-cat="morning"]');
              if (catItem) catItem.click();
            }
          }, 200);
        }
        if (action === 'goto-azkar-evening') {
          this.navigateTo('tasbeeh');
          setTimeout(() => {
            if (this.tasbeeh) {
              const catItem = document.querySelector('.azkar-cat-card[data-cat="evening"]');
              if (catItem) catItem.click();
            }
          }, 200);
        }
        if (action === 'open-add-dua') {
          if (this.duas) {
            this.duas.showAddModal();
          }
        }
      });
    });
  }

  navigateTo(sectionName, updateHash = true) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    // Deactivate all nav items
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Activate target section
    const section = document.getElementById(sectionName + '-section');
    if (section) {
      section.classList.add('active');
    }

    // Activate matching nav button
    document.querySelectorAll(`.nav-item[data-section="${sectionName}"]`).forEach(n => {
      n.classList.add('active');
    });

    this.currentSection = sectionName;
    if (updateHash) {
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', '#' + sectionName);
        }
      } catch (e) {}
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh section-specific data on visit
    try {
      if (sectionName === 'home') this.updateDashboard();
      if (sectionName === 'prayer' && this.prayer) {
        this.prayer.renderPrayerTimes();
        this.prayer.renderTracker();
      }
      if (sectionName === 'history' && this.history) this.history.renderStats('daily');
      if (sectionName === 'duas' && this.duas) this.duas.loadDuas();
    } catch (err) {
      console.error('Error refreshing section:', err);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  PWA Installation System                                          */
  /* ---------------------------------------------------------------- */

  setupPwaInstall() {
    const headerInstallBtn = document.getElementById('header-install-btn');
    const settingsInstallBtn = document.getElementById('settings-install-pwa-btn');
    const installBanner = document.getElementById('pwa-install-banner');
    const bannerInstallBtn = document.getElementById('banner-install-action-btn');
    const bannerDismissBtn = document.getElementById('banner-install-dismiss-btn');

    // 1. Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      this.deferredInstallPrompt = e;
      console.log('[Wardi PWA] Captured beforeinstallprompt event');

      // Surface the polished in-app install button
      if (headerInstallBtn) headerInstallBtn.style.display = 'inline-flex';
      if (settingsInstallBtn) settingsInstallBtn.style.display = 'flex';
      if (installBanner && !sessionStorage.getItem('wardi_pwa_banner_dismissed')) {
        installBanner.style.display = 'flex';
      }
    });

    // 2. Click Handler for Install Buttons
    const triggerInstall = async () => {
      if (this.deferredInstallPrompt) {
        this.deferredInstallPrompt.prompt();
        const { outcome } = await this.deferredInstallPrompt.userChoice;
        console.log('[Wardi PWA] User install choice:', outcome);
        if (outcome === 'accepted') {
          this.showToast('شكراً لتثبيت وِرْدي! ستجده الآن على شاشتك الرئيسية 📲');
          if (headerInstallBtn) headerInstallBtn.style.display = 'none';
          if (installBanner) installBanner.style.display = 'none';
        }
        this.deferredInstallPrompt = null;
      } else {
        // Fallback manual instructions for iOS Safari or unsupported browsers
        this.showManualInstallModal();
      }
    };

    if (headerInstallBtn) headerInstallBtn.addEventListener('click', triggerInstall);
    if (settingsInstallBtn) settingsInstallBtn.addEventListener('click', triggerInstall);
    if (bannerInstallBtn) bannerInstallBtn.addEventListener('click', triggerInstall);

    if (bannerDismissBtn && installBanner) {
      bannerDismissBtn.addEventListener('click', () => {
        installBanner.style.display = 'none';
        sessionStorage.setItem('wardi_pwa_banner_dismissed', 'true');
      });
    }

    // 3. Listen for appinstalled
    window.addEventListener('appinstalled', () => {
      console.log('[Wardi PWA] Application installed successfully!');
      this.showToast('تم تثبيت تطبيق وِرْدي بنجاح على جهازك 🎉');
      if (headerInstallBtn) headerInstallBtn.style.display = 'none';
      if (installBanner) installBanner.style.display = 'none';
      this.deferredInstallPrompt = null;
    });
  }

  showManualInstallModal() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    let message = 'لتثبيت التطبيق:\n1. اضغط على خيارات المتصفح (⋮)\n2. اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"';
    if (isIOS) {
      message = 'لتثبيت وِرْدي على آيفون:\n1. اضغط على زر المشاركة (Share) أسفل الشاشة\n2. مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen) 📲';
    }
    alert(message);
  }

  /* ---------------------------------------------------------------- */
  /*  Comprehensive Personal Dashboard Logic                           */
  /* ---------------------------------------------------------------- */

  setupDashboardEvents() {
    // Activity Timeline filter pills
    const filterContainer = document.getElementById('dashboard-timeline-filter');
    if (filterContainer) {
      filterContainer.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          filterContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.timelineFilter = pill.dataset.filter || 'all';
          this.renderActivityTimeline(this.timelineFilter);
        });
      });
    }

    // Dashboard Customization Button
    const openPrefsBtn = document.getElementById('open-dashboard-prefs-btn');
    if (openPrefsBtn) {
      openPrefsBtn.addEventListener('click', () => this.showDashboardPrefsModal());
    }

    const savePrefsBtn = document.getElementById('save-dashboard-prefs-btn');
    if (savePrefsBtn) {
      savePrefsBtn.addEventListener('click', () => this.saveDashboardPrefs());
    }

    const closePrefsBtn = document.getElementById('close-dashboard-prefs-btn');
    if (closePrefsBtn) {
      closePrefsBtn.addEventListener('click', () => this.hideDashboardPrefsModal());
    }
  }

  async updateDashboard() {
    try {
      // 1. Personalized Greeting based on hour
      const greeting = this.getGreeting();
      const greetEl = document.getElementById('greeting-text');
      if (greetEl) greetEl.textContent = greeting;

      // 2. Dates
      this.updateDates();

      // 3. Fetch Real Stats
      const today = new Date().toISOString().split('T')[0];
      const stats = await this.history.getDailyStats(today);
      const prayerRec = await this.storage.getPrayerRecord(today);
      const tasbeehGoal = parseInt(this.storage.getSetting('daily_goal', 100)) || 100;
      const quranGoal = parseInt(this.storage.getSetting('daily_quran_goal', 4)) || 4;

      // Count completed prayers today
      let completedPrayers = 0;
      if (prayerRec) {
        if (prayerRec.fajr) completedPrayers++;
        if (prayerRec.dhuhr) completedPrayers++;
        if (prayerRec.asr) completedPrayers++;
        if (prayerRec.maghrib) completedPrayers++;
        if (prayerRec.isha) completedPrayers++;
      }

      const tasbeehCount = stats.tasbeehCount || 0;
      const quranPages = stats.quranPages || 0;
      const azkarCount = stats.azkarCompleted || 0;

      // 4. Calculate Unified Daily Progress Percentage
      // Weighted formula: Prayers (40%), Tasbeeh (30%), Quran (15%), Azkar (15%)
      const prayerScore = (completedPrayers / 5) * 40;
      const tasbeehScore = Math.min(tasbeehCount / tasbeehGoal, 1.0) * 30;
      const quranScore = Math.min(quranPages / quranGoal, 1.0) * 15;
      const azkarScore = Math.min(azkarCount / 2, 1.0) * 15;

      const totalProgressPct = Math.round(prayerScore + tasbeehScore + quranScore + azkarScore);

      // Update Unified Progress Elements
      const overallPctEl = document.getElementById('dashboard-overall-pct');
      const overallFillEl = document.getElementById('dashboard-overall-fill');
      const achieveMsgEl = document.getElementById('dashboard-achievement-msg');

      if (overallPctEl) overallPctEl.textContent = `${totalProgressPct}%`;
      if (overallFillEl) {
        overallFillEl.style.width = `${totalProgressPct}%`;
      }

      if (achieveMsgEl) {
        let msg = 'بداية مباركة، ابدأ وِردك اليومي ونل الأجر 🌿';
        if (totalProgressPct >= 100) {
          msg = 'ما شاء الله! أتممت وِرد اليوم بالكامل مبارك لك 👑';
        } else if (totalProgressPct >= 70) {
          msg = 'هنيئاً لك! قطعت شوطاً عظيماً في طاعات اليوم ✨';
        } else if (totalProgressPct >= 35) {
          msg = 'خطوات مباركة، واصل المسير في وِردك 🌟';
        }
        achieveMsgEl.textContent = msg;
      }

      // 5. Update Activity Summary Cards
      // A. Prayer Summary Card
      const prayerCountEl = document.getElementById('dashboard-prayers-completed');
      const prayerNextNameEl = document.getElementById('dashboard-prayer-next-name');
      const prayerNextTimeEl = document.getElementById('dashboard-prayer-next-time');
      if (prayerCountEl) prayerCountEl.textContent = `${completedPrayers} / 5 صلوات`;

      if (this.prayer && this.prayer.nextPrayer) {
        if (prayerNextNameEl) prayerNextNameEl.textContent = this.prayer.nextPrayer.name;
        if (prayerNextTimeEl) prayerNextTimeEl.textContent = this.prayer.format12Hour(this.prayer.nextPrayer.time);
      }

      // B. Tasbeeh Summary Card
      const dashTasbeehToday = document.getElementById('dashboard-tasbeeh-today');
      const dashTasbeehTarget = document.getElementById('dashboard-tasbeeh-target');
      const dashTasbeehFill = document.getElementById('dashboard-tasbeeh-fill');
      if (dashTasbeehToday) dashTasbeehToday.textContent = tasbeehCount;
      if (dashTasbeehTarget) dashTasbeehTarget.textContent = tasbeehGoal;
      if (dashTasbeehFill) {
        const tPct = Math.min((tasbeehCount / tasbeehGoal) * 100, 100);
        dashTasbeehFill.style.width = `${tPct}%`;
      }

      // C. Quran Summary Card
      const dashQuranPages = document.getElementById('dashboard-quran-pages-today');
      const dashQuranPos = document.getElementById('dashboard-quran-last-pos');
      if (dashQuranPages) dashQuranPages.textContent = quranPages;

      const lastPos = this.storage.getSetting('quran_position', null);
      if (dashQuranPos) {
        if (lastPos) {
          const parsed = typeof lastPos === 'string' ? JSON.parse(lastPos) : lastPos;
          dashQuranPos.textContent = `سورة ${parsed.surahName || parsed.surah} — آية ${parsed.ayah || 1}`;
        } else {
          dashQuranPos.textContent = 'سورة الفاتحة';
        }
      }

      // D. Duas Summary Card
      const allDuas = await this.storage.getAllItems('duas');
      const favDuas = allDuas.filter(d => d.isFavorite);
      const dashDuasTotal = document.getElementById('dashboard-duas-total');
      const dashDuasFavs = document.getElementById('dashboard-duas-favs');
      if (dashDuasTotal) dashDuasTotal.textContent = allDuas.length;
      if (dashDuasFavs) dashDuasFavs.textContent = favDuas.length;

      // E. Streaks Calculation
      await this.updateStreakDisplay();

      // 6. Render Activity Timeline (نشاطي اليوم)
      await this.renderActivityTimeline(this.timelineFilter);

      // 7. Render Achievements & Badges
      await this.renderAchievements(completedPrayers, tasbeehCount, quranPages, allDuas.length);

      // 8. Load Spiritual Reminder
      this.loadDailyReminder();

      // 9. Load Home Duas Favorites
      await this.loadHomeFavorites();
    } catch (err) {
      console.error('updateDashboard error:', err);
    }
  }

  async updateStreakDisplay() {
    try {
      const streakEl = document.getElementById('dashboard-streak-count');
      if (!streakEl) return;

      const stats = await this.storage.getAllItems('daily_stats');
      if (!stats || stats.length === 0) {
        streakEl.textContent = '1';
        return;
      }

      // Sort dates descending
      const sorted = stats.sort((a, b) => b.date.localeCompare(a.date));
      let streak = 0;
      let checkDate = new Date();

      for (const rec of sorted) {
        const dStr = checkDate.toISOString().split('T')[0];
        if (rec.date === dStr) {
          const totalActions = (rec.tasbeehCount || 0) + (rec.quranPages || 0) +
                               (rec.prayersCompleted || 0) + (rec.azkarCompleted || 0);
          if (totalActions > 0) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      streakEl.textContent = Math.max(1, streak);
    } catch (e) {
      console.warn('updateStreakDisplay error:', e);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Activity Timeline (نشاطي اليوم)                                   */
  /* ---------------------------------------------------------------- */

  async renderActivityTimeline(filter = 'all') {
    const container = document.getElementById('activity-timeline-list');
    if (!container) return;

    try {
      let activities = await this.storage.getTodayActivities();

      if (filter !== 'all') {
        activities = activities.filter(a => a.type === filter);
      }

      if (!activities || activities.length === 0) {
        container.innerHTML = `
          <div class="empty-timeline-card">
            <span class="empty-icon">🌱</span>
            <p class="empty-text">لا توجد أنشطة مسجلة في هذا التصنيف اليوم بعد.</p>
            <span class="empty-sub">سجل صلاتك، أذكارك، أو تلاوتك لتظهر في جدولك الزمني.</span>
          </div>
        `;
        return;
      }

      const typeMeta = {
        prayer: { icon: '🕌', label: 'صلاة', color: 'var(--success)' },
        tasbeeh: { icon: '📿', label: 'تسبيح', color: 'var(--gold-warm)' },
        quran: { icon: '📖', label: 'قرآن', color: 'var(--primary-rich)' },
        azkar: { icon: '🌅', label: 'أذكار', color: '#E09F3E' },
        dua: { icon: '🤲', label: 'دعاء', color: '#5E81AC' }
      };

      container.innerHTML = activities.slice(0, 15).map(act => {
        const meta = typeMeta[act.type] || { icon: '📌', label: act.type, color: 'var(--gold-warm)' };
        const timeStr = act.timestamp ? new Date(act.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
        const desc = this._escapeHTML(act.details?.description || meta.label);

        return `
          <div class="timeline-row-item">
            <div class="timeline-time-badge">${timeStr}</div>
            <div class="timeline-node" style="border-color:${meta.color};">
              <span class="timeline-node-icon">${meta.icon}</span>
            </div>
            <div class="timeline-content-card card">
              <div class="timeline-card-header">
                <span class="timeline-cat-pill">${meta.label}</span>
              </div>
              <p class="timeline-desc">${desc}</p>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('renderActivityTimeline error:', err);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Achievements & Badges System                                     */
  /* ---------------------------------------------------------------- */

  async renderAchievements(prayersDone, tasbeehCount, quranPages, duasCount) {
    const container = document.getElementById('dashboard-achievements-grid');
    if (!container) return;

    const streakVal = parseInt(document.getElementById('dashboard-streak-count')?.textContent) || 1;

    const badges = [
      {
        id: 'first_step',
        title: 'أول خطوة 🌿',
        desc: 'تسجيل أول عبادة مباركة',
        unlocked: (prayersDone > 0 || tasbeehCount > 0 || quranPages > 0)
      },
      {
        id: 'five_prayers',
        title: 'محافظ على الصلوات 🕌',
        desc: 'إتمام صلوات اليوم الخمس كاملة',
        unlocked: prayersDone >= 5
      },
      {
        id: 'tasbeeh_100',
        title: 'لسان ذاكر 📿',
        desc: 'إتمام 100 تسبيحة في اليوم',
        unlocked: tasbeehCount >= 100
      },
      {
        id: 'streak_3',
        title: 'سلسلة الوفاء 🔥',
        desc: 'المحافظة على الوِرد 3 أيام متتالية',
        unlocked: streakVal >= 3
      },
      {
        id: 'streak_7',
        title: 'أسبوع البركة ⭐',
        desc: 'المحافظة على الوِرد 7 أيام متتالية',
        unlocked: streakVal >= 7
      },
      {
        id: 'quran_companion',
        title: 'رفيق القرآن 📖',
        desc: 'تلاوة 4 صفحات من كتاب الله',
        unlocked: quranPages >= 4
      },
      {
        id: 'dua_heart',
        title: 'مناجاة خاشعة 🤲',
        desc: 'حفظ وتنظيم 5 أدعية مباركة',
        unlocked: duasCount >= 5
      }
    ];

    container.innerHTML = badges.map(b => `
      <div class="achievement-card card ${b.unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon-wrap">
          <span class="achievement-badge-symbol">${b.unlocked ? '✓' : '🔒'}</span>
        </div>
        <strong class="achievement-title">${b.title}</strong>
        <p class="achievement-desc">${b.desc}</p>
        <span class="achievement-status-tag">${b.unlocked ? 'مُنجز ✨' : 'قيد الإنجاز'}</span>
      </div>
    `).join('');
  }

  /* ---------------------------------------------------------------- */
  /*  Dashboard Customization Modal                                    */
  /* ---------------------------------------------------------------- */

  showDashboardPrefsModal() {
    const modal = document.getElementById('dashboard-prefs-modal');
    const overlay = document.getElementById('modal-overlay');

    const tasbeehInput = document.getElementById('pref-tasbeeh-goal-input');
    const quranInput = document.getElementById('pref-quran-goal-input');

    if (tasbeehInput) tasbeehInput.value = this.storage.getSetting('daily_goal', 100);
    if (quranInput) quranInput.value = this.storage.getSetting('daily_quran_goal', 4);

    if (modal) {
      modal.style.display = 'block';
      modal.classList.add('active');
    }
    if (overlay) {
      overlay.style.display = 'block';
      overlay.classList.add('active');
    }
  }

  hideDashboardPrefsModal() {
    const modal = document.getElementById('dashboard-prefs-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
    }
  }

  async saveDashboardPrefs() {
    const tasbeehInput = document.getElementById('pref-tasbeeh-goal-input');
    const quranInput = document.getElementById('pref-quran-goal-input');

    const tGoal = Math.max(10, parseInt(tasbeehInput?.value) || 100);
    const qGoal = Math.max(1, parseInt(quranInput?.value) || 4);

    this.storage.setSetting('daily_goal', tGoal);
    this.storage.setSetting('daily_quran_goal', qGoal);

    this.hideDashboardPrefsModal();
    this.showToast('تم حفظ أهدافك التعبدية بنجاح 🎯');
    await this.updateDashboard();
  }

  /* ---------------------------------------------------------------- */
  /*  Greeting & Dates Helpers                                         */
  /* ---------------------------------------------------------------- */

  getGreeting() {
    const hour = new Date().getHours();
    if (this.currentLang === 'ar') {
      if (hour < 5) return 'قيام مبارك ووتر هادئ 🌙';
      if (hour < 11) return 'السلام عليكم، صباح البركة والسكينة 🌅';
      if (hour < 16) return 'السلام عليكم، طابت ظهيرتكم بالطاعات ☀️';
      if (hour < 20) return 'مساء النور والاستغفار 🌇';
      return 'السلام عليكم، أمسية هادئة بذكر الله 🌙';
    }
    if (hour < 12) return 'Good Morning & Blessings 🌅';
    if (hour < 17) return 'Good Afternoon 🌤️';
    return 'Peace be upon you, Good Evening 🌙';
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
          day: 'numeric', month: 'long', year: 'numeric'
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
      const allDuas = await this.storage.getAllItems('duas');
      const favorites = allDuas.filter(d => d.isFavorite).slice(0, 3);

      if (favorites.length === 0) {
        container.innerHTML = `<p class="empty-state">${
          this.currentLang === 'ar' ? 'لا توجد أدعية مفضلة بعد' : 'No favorite duas yet'
        }</p>`;
        return;
      }

      container.innerHTML = favorites.map(d => `
        <div class="mini-dua-card" onclick="window.WardApp.navigateTo('duas')" style="cursor:pointer;">
          <p class="mini-dua-text">${this._escapeHTML(d.text).substring(0, 90)}${d.text.length > 90 ? '...' : ''}</p>
        </div>
      `).join('');
    } catch (e) {
      console.error('Error loading favorites:', e);
    }
  }

  loadDailyReminder() {
    const el = document.getElementById('daily-reminder');
    if (!el) return;

    const reminders_ar = [
      'قال رسول الله ﷺ: «أحبُّ الأعمال إلى الله أدومُها وإن قلَّ» — متفق عليه',
      'قال رسول الله ﷺ: «مَن قرأ حرفًا من كتاب الله فله به حسنة، والحسنة بعشر أمثالها» — رواه الترمذي',
      'قال رسول الله ﷺ: «أقربُ ما يكونُ العبدُ من ربِّه وهو ساجد، فأكثروا الدعاء» — رواه مسلم',
      'قال رسول الله ﷺ: «الطُّهور شطر الإيمان، والحمد لله تملأ الميزان» — رواه مسلم',
      'قال رسول الله ﷺ: «كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم» — متفق عليه',
      '﴿وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ﴾ — البقرة: ١٨٦',
      '﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾ — الرعد: ٢٨'
    ];

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    el.textContent = reminders_ar[dayOfYear % reminders_ar.length];
  }

  /* ---------------------------------------------------------------- */
  /*  Settings Panel                                                    */
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
        if (fontValue) fontValue.textContent = size + 'px';
        this.storage.setSetting('font_size', parseInt(size));
      });
    }

    // Sound toggle
    const soundToggle = document.getElementById('setting-sound-toggle');
    if (soundToggle) {
      soundToggle.checked = this.storage.getSetting('sound', 'true') === 'true';
      soundToggle.addEventListener('change', () => {
        this.storage.setSetting('sound', String(soundToggle.checked));
        if (this.tasbeeh) this.tasbeeh.soundEnabled = soundToggle.checked;
      });
    }

    // Haptic toggle
    const hapticToggle = document.getElementById('setting-haptic-toggle');
    if (hapticToggle) {
      hapticToggle.checked = this.storage.getSetting('haptic', 'true') === 'true';
      hapticToggle.addEventListener('change', () => {
        this.storage.setSetting('haptic', String(hapticToggle.checked));
        if (this.tasbeeh) this.tasbeeh.hapticEnabled = hapticToggle.checked;
      });
    }

    // Export Data JSON
    const exportBtn = document.getElementById('setting-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          const json = await this.storage.exportData();
          const blob = new Blob([json], { type: 'application/json' });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a');
          a.href     = url;
          a.download = `wardi-backup-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          this.showToast('تم تصدير نسخة احتياطية من بياناتك بنجاح 📁');
        } catch {
          this.showToast('تعذر تصدير البيانات', 'error');
        }
      });
    }

    // Import Data JSON
    const importBtn  = document.getElementById('setting-import-btn');
    const importFile = document.getElementById('setting-import-file');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('سيتم دمج وتحديث البيانات الحالية بالنسخة المستوردة. هل تريد المتابعة؟')) {
          importFile.value = '';
          return;
        }

        try {
          const text   = await file.text();
          const result = await this.storage.importData(text);
          if (result.success) {
            this.showToast('تم استيراد البيانات بنجاح 🎉');
            setTimeout(() => location.reload(), 800);
          } else {
            this.showToast(result.message || 'فشل الاستيراد', 'error');
          }
        } catch {
          this.showToast('ملف غير صالح', 'error');
        }
        importFile.value = '';
      });
    }

    // Clear All Data
    const clearBtn = document.getElementById('setting-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (!confirm('تحذير: هل أنت متأكد من رغبتك في حذف جميع البيانات المحلية؟')) return;
        if (!confirm('تأكيد نهائي: سيتم مسح كافة الأوراد والتسبيحات والأدعية!')) return;

        await this.storage.clearAllData();
        this.showToast('تم مسح جميع البيانات بنجاح');
        setTimeout(() => location.reload(), 500);
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Theme & Language                                                  */
  /* ---------------------------------------------------------------- */

  setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    this.storage.setSetting('theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#071F1C' : '#F6F2E9';
  }

  setLanguage(lang) {
    this.currentLang = lang;
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.body.setAttribute('data-lang', lang);
    this.storage.setSetting('language', lang);
  }

  /* ---------------------------------------------------------------- */
  /*  Toast Notifications                                              */
  /* ---------------------------------------------------------------- */

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast--hiding');
      setTimeout(() => toast.remove(), 280);
    }, 3200);
  }

  _escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

/* ================================================================== */
/*  DOM Ready Auto-Initialization                                     */
/* ================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.app = app;
  app.init();
});
