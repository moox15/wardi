/**
 * HistoryManager — Unified activity tracking & statistics for Wardi Pro
 * Depends on StorageManager for all persistence.
 *
 * Architecture:
 *  - history_log  → append-only chronological event stream (timeline, feed)
 *  - daily_stats  → one aggregate record per LOCAL date (fast analytics)
 *
 * Reliability:
 *  - Daily stats are mirrored in memory and flushed to IndexedDB with a
 *    short debounce (write-behind). This eliminates read-modify-write
 *    races during rapid tapping and reduces IDB churn.
 *  - Flushes are forced on visibilitychange / pagehide / beforeunload.
 *
 * Activity types (new unified):
 *  prayer_completed, tasbeeh_count, dhikr_completed, dua_read,
 *  quran_reading, habit_completed, daily_goal_completed
 * Legacy aliases preserved: prayer, tasbeeh, quran, dua, azkar
 */
class HistoryManager {
  constructor(storage) {
    this.storage = storage;

    // In-memory daily stats cache {date: {...stats}}
    this._statsCache = {};
    this._dirtyDates = new Set();
    this._flushTimer = null;
    this._flushing = null;

    // Bind lifecycle handlers once
    this._onHide = () => { this.flushAll(); };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flushAll();
    });
    window.addEventListener('pagehide', this._onHide);
    window.addEventListener('beforeunload', this._onHide);

    this.STAT_FIELDS = ['tasbeehCount', 'quranPages', 'quranReadingMinutes',
      'azkarCompleted', 'duasRead', 'prayersCompleted', 'goalsCompleted'];
    this.TASBEEH_TYPES = new Set(['tasbeeh', 'tasbeeh_count', 'dhikr_completed']);
  }

  async init() {
    // Prime today's cache so first writes are merge-safe
    await this.getStatsCached(this.storage.todayKey());
    this.setupEventListeners();
  }

  setupEventListeners() {
    ['daily', 'weekly', 'monthly'].forEach(period => {
      const tab = document.getElementById('history-tab-' + period);
      if (tab) {
        tab.addEventListener('click', () => {
          this.renderStats(period);
        });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Daily stats: cached read-modify-write with debounced flush        */
  /* ------------------------------------------------------------------ */

  /** Empty stats skeleton for a date. */
  emptyStats(date) {
    return {
      date,
      tasbeehCount: 0,
      quranPages: 0,
      quranReadingMinutes: 0,
      azkarCompleted: 0,
      duasRead: 0,
      prayersCompleted: 0,
      goalsCompleted: 0,
      tasbeehByPhrase: {},   // {canonicalPhrase: count} — real dhikr breakdown
      azkarDone: {}          // {azkarItemId: true}  — completed azkar items
    };
  }

  /** Load a day's stats into the cache (merging persisted record). */
  async getStatsCached(date) {
    if (this._statsCache[date]) return this._statsCache[date];
    let rec = null;
    try {
      rec = await this.storage.getItem('daily_stats', date);
    } catch (e) {
      console.error('getStatsCached error:', e);
    }
    const merged = Object.assign(this.emptyStats(date), rec || {}, { date });
    this._statsCache[date] = merged;
    return merged;
  }

  /** Mutate a day's stats in memory and schedule a flush. */
  async bumpStats(date, mutator) {
    const stats = await this.getStatsCached(date);
    mutator(stats);
    this._dirtyDates.add(date);
    this._scheduleFlush();
    return stats;
  }

  /** Persist today's stats — debounced. */
  _scheduleFlush() {
    if (this._flushTimer) clearTimeout(this._flushTimer);
    this._flushTimer = setTimeout(() => this.flushAll(), 1200);
  }

  /** Force-write all dirty dates to IndexedDB immediately. */
  async flushAll() {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
    // Serialize concurrent flushes
    if (this._flushing) {
      await this._flushing.catch(() => {});
    }
    if (this._dirtyDates.size === 0) return;

    const dates = [...this._dirtyDates];
    this._dirtyDates.clear();

    this._flushing = (async () => {
      for (const date of dates) {
        const stats = this._statsCache[date];
        if (!stats) continue;
        try {
          const clean = Object.assign({}, stats);
          delete clean._meta;
          await this.storage.updateItem('daily_stats', clean);
        } catch (err) {
          console.error('flushAll: failed to persist stats for', date, err);
          // Re-mark as dirty so a later flush can retry
          this._dirtyDates.add(date);
        }
      }
    })();

    await this._flushing;
    this._flushing = null;
  }

  /**
   * Increment a numeric stat field for today (legacy-compatible API).
   * @param {string} field  tasbeehCount | quranPages | quranReadingMinutes |
   *                        azkarCompleted | duasRead | prayersCompleted | goalsCompleted
   * @param {number} value  Amount to add (may be negative for corrections)
   * @param {string} [dateStr]
   */
  async updateDailyStats(field, value, dateStr) {
    const date = dateStr || this.storage.todayKey();
    if (!this.STAT_FIELDS.includes(field)) {
      console.warn('updateDailyStats: unknown field', field);
      return;
    }
    await this.bumpStats(date, s => {
      s[field] = Math.max(0, (s[field] || 0) + value);
    });
  }

  /** Register a completed azkar item for a date. */
  async markAzkarDone(itemId, dateStr) {
    const date = dateStr || this.storage.todayKey();
    await this.bumpStats(date, s => {
      if (!s.azkarDone) s.azkarDone = {};
      if (!s.azkarDone[itemId]) {
        s.azkarDone[itemId] = true;
        s.azkarCompleted = (s.azkarCompleted || 0) + 1;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Logging                                                            */
  /* ------------------------------------------------------------------ */

  /** Map legacy activity types onto the unified schema. */
  _normalizeType(type) {
    const aliases = {
      'tasbeeh': 'tasbeeh_count',
      'dhikr': 'dhikr_completed',
      'prayer': 'prayer_completed',
      'quran': 'quran_reading',
      'dua': 'dua_read',
      'azkar': 'dhikr_completed',
      'goal': 'daily_goal_completed'
    };
    return aliases[type] || type;
  }

  /**
   * Record an activity event in history_log.
   * NOTE: daily_stats updates are handled by the callers for tasbeeh/quran
   * (they own accurate quantities). For other types we update the mapped stat.
   *
   * @param {string} type   unified activity type (or legacy alias)
   * @param {object} details  { description, count, quantity, target, phrase, surah, metadata... }
   */
  async logActivity(type, details = {}) {
    try {
      const now = new Date();
      const dateStr = this.storage.localDateKey(now);
      const normType = this._normalizeType(type);

      const entry = {
        type: normType,
        details: details || {},
        timestamp: now.toISOString(),
        date: dateStr
      };

      // Compose readable description if not given
      if (!details.description) {
        details.description = this._defaultDescription(normType, details);
      }

      await this.storage.addItem('history_log', entry);

      // Stats side effects (avoid double counting for tasbeeh/quran:
      // tasbeeh bumps per-tap in TasbeehManager, quran minutes tracked in reader)
      if (normType === 'prayer_completed') {
        await this.updateDailyStats('prayersCompleted', details.count || 1, dateStr);
      } else if (normType === 'dua_read') {
        await this.updateDailyStats('duasRead', details.count || 1, dateStr);
      } else if (normType === 'dhikr_completed' && details.azkarItem) {
        // azkar item completion counted via markAzkarDone by caller
      } else if (normType === 'daily_goal_completed') {
        await this.updateDailyStats('goalsCompleted', 1, dateStr);
      }

      return entry;
    } catch (err) {
      console.error('logActivity error:', err);
    }
  }

  _defaultDescription(type, details) {
    const d = details || {};
    switch (type) {
      case 'prayer_completed': return d.description || 'صلاة';
      case 'tasbeeh_count': return d.phrase ? `${d.phrase} (${d.count || 1})` : 'تسبيح';
      case 'dhikr_completed': return d.description || 'ذكر';
      case 'dua_read': return d.description || 'قراءة دعاء';
      case 'quran_reading': return d.description || 'تلاوة قرآن';
      case 'habit_completed': return d.description || 'عادة';
      case 'daily_goal_completed': return d.description || 'هدف اليوم';
      default: return 'نشاط';
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Queries                                                            */
  /* ------------------------------------------------------------------ */

  /** Stats for a specific local date. */
  async getDailyStats(date) {
    try {
      const rec = await this.storage.getItem('daily_stats', date);
      return Object.assign(this.emptyStats(date), rec || {}, { date });
    } catch (err) {
      console.error('getDailyStats error:', err);
      return this.emptyStats(date);
    }
  }

  /** Stats for the last 7 local days (ascending). */
  async getWeeklyStats() {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(await this.getDailyStats(this.storage.localDateKey(d)));
    }
    return days;
  }

  /** Stats for the last 30 local days (ascending). */
  async getMonthlyStats() {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(await this.getDailyStats(this.storage.localDateKey(d)));
    }
    return days;
  }

  /** Consecutive active days ending today (0 if today has no activity yet). */
  async getStreak() {
    try {
      await this.flushAll();
      let streak = 0;
      const now = new Date();
      // If today has no activity yet, start counting from yesterday
      const todayStats = await this.getDailyStats(this.storage.todayKey());
      if (!this._isActiveDay(todayStats)) {
        now.setDate(now.getDate() - 1);
      }
      for (let i = 0; i < 365; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const stats = await this.getDailyStats(this.storage.localDateKey(d));
        if (this._isActiveDay(stats)) streak++;
        else break;
      }
      return streak;
    } catch (err) {
      console.error('getStreak error:', err);
      return 0;
    }
  }

  /** Lifetime aggregates across all daily_stats. */
  async getLifetimeStats() {
    try {
      await this.flushAll();
      const all = await this.storage.getAllItems('daily_stats');
      let totalTasbeeh = 0, totalQuranPages = 0, totalAzkar = 0,
          totalDuas = 0, totalPrayers = 0, totalMinutes = 0, totalDays = 0;

      const activeDays = [];
      for (const day of all) {
        if (!day || !day.date) continue;
        totalTasbeeh += day.tasbeehCount || 0;
        totalQuranPages += day.quranPages || 0;
        totalAzkar += day.azkarCompleted || 0;
        totalDuas += day.duasRead || 0;
        totalPrayers += day.prayersCompleted || 0;
        totalMinutes += day.quranReadingMinutes || 0;
        if (this._isActiveDay(day)) activeDays.push(day.date);
      }

      // Longest streak from active days
      activeDays.sort((a, b) => a.localeCompare(b));
      let longestStreak = 0, currentStreak = 0, prevDate = null;
      for (const date of activeDays) {
        if (prevDate && this._dayDiff(prevDate, date) === 1) currentStreak++;
        else currentStreak = 1;
        longestStreak = Math.max(longestStreak, currentStreak);
        prevDate = date;
      }

      return { totalTasbeeh, totalQuranPages, totalAzkar, totalDuas,
               totalPrayers, totalMinutes, totalDays: activeDays.length, longestStreak };
    } catch (err) {
      console.error('getLifetimeStats error:', err);
      return { totalTasbeeh: 0, totalQuranPages: 0, totalAzkar: 0, totalDuas: 0,
               totalPrayers: 0, totalMinutes: 0, totalDays: 0, longestStreak: 0 };
    }
  }

  /** Recent activity log entries, newest first. */
  async getRecentActivity(limit = 20) {
    try {
      const all = await this.storage.getAllItems('history_log');
      all.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      return all.slice(0, limit);
    } catch (err) {
      console.error('getRecentActivity error:', err);
      return [];
    }
  }

  /** Personal bests. */
  async getRecords() {
    try {
      const all = await this.storage.getAllItems('daily_stats');
      let bestTasbeeh = 0, bestQuran = 0, bestMinutes = 0;
      for (const day of all) {
        if ((day.tasbeehCount || 0) > bestTasbeeh) bestTasbeeh = day.tasbeehCount;
        if ((day.quranPages || 0) > bestQuran) bestQuran = day.quranPages;
        if ((day.quranReadingMinutes || 0) > bestMinutes) bestMinutes = day.quranReadingMinutes;
      }
      const longestStreak = (await this.getLifetimeStats()).longestStreak;
      return { bestTasbeeh, bestQuran, bestMinutes, longestStreak };
    } catch (err) {
      console.error('getRecords error:', err);
      return { bestTasbeeh: 0, bestQuran: 0, bestMinutes: 0, longestStreak: 0 };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                          */
  /* ------------------------------------------------------------------ */

  async renderStats(period = 'daily') {
    try {
      ['daily', 'weekly', 'monthly'].forEach(p => {
        const tab = document.getElementById('history-tab-' + p);
        if (tab) tab.classList.toggle('active', p === period);
      });

      const streak = await this.getStreak();
      const streakEl = document.getElementById('history-streak-count');
      if (streakEl) streakEl.textContent = streak;

      const lifetime = await this.getLifetimeStats();
      const totalTasbeehEl = document.getElementById('history-total-tasbeeh');
      const totalQuranEl = document.getElementById('history-total-quran');
      if (totalTasbeehEl) totalTasbeehEl.textContent = lifetime.totalTasbeeh.toLocaleString('ar-EG');
      if (totalQuranEl) totalQuranEl.textContent = lifetime.totalQuranPages.toLocaleString('ar-EG');

      let data;
      if (period === 'daily') {
        data = [await this.getDailyStats(this.storage.todayKey())];
      } else if (period === 'weekly') {
        data = await this.getWeeklyStats();
      } else {
        data = await this.getMonthlyStats();
      }
      this.renderChart(data, period);

      const records = await this.getRecords();
      const lang = document.body.getAttribute('data-lang') || 'ar';
      const labels = lang === 'ar'
        ? { bestT: 'أعلى تسبيح يومي', bestQ: 'أكثر صفحات قرآن', streak: 'أطول سلسلة متصلة' }
        : { bestT: 'Best Daily Tasbeeh', bestQ: 'Most Quran Pages', streak: 'Longest Streak' };

      const recordsList = document.getElementById('history-records-list');
      if (recordsList) {
        recordsList.innerHTML = `
          <div class="record-row"><span class="record-name">${labels.bestT}</span><span class="record-val">${records.bestTasbeeh.toLocaleString('ar-EG')}</span></div>
          <div class="record-row"><span class="record-name">${labels.bestQ}</span><span class="record-val">${records.bestQuran.toLocaleString('ar-EG')}</span></div>
          <div class="record-row"><span class="record-name">${labels.streak}</span><span class="record-val">${records.longestStreak}</span></div>
        `;
      }

      const bestT = document.getElementById('record-best-tasbeeh');
      const bestQ = document.getElementById('record-best-quran');
      const streakR = document.getElementById('record-best-streak');
      if (bestT) bestT.textContent = records.bestTasbeeh.toLocaleString('ar-EG');
      if (bestQ) bestQ.textContent = records.bestQuran.toLocaleString('ar-EG');
      if (streakR) streakR.textContent = records.longestStreak;

      await this.renderActivityFeed();

      // Weekly report (real data summary)
      this.renderWeeklyReport();
    } catch (err) {
      console.error('renderStats error:', err);
    }
  }

  /** CSS bar chart into #history-chart-container. */
  renderChart(data, period = 'daily') {
    const container = document.getElementById('history-chart-container');
    if (!container || !data || data.length === 0) return;

    const bars = data.map(d => ({
      label: d.date ? d.date.slice(5) : '',
      value: (d.tasbeehCount || 0) + (d.quranPages || 0) + (d.azkarCompleted || 0) +
             (d.duasRead || 0) + (d.prayersCompleted || 0) + Math.round((d.quranReadingMinutes || 0) / 2)
    }));

    const hasActivity = bars.some(b => b.value > 0);
    if (!hasActivity) {
      container.innerHTML = `
        <div class="chart-empty-state">
          <span class="chart-empty-icon">📈</span>
          <p class="chart-empty-text">ابدأ أورادك اليوم (صلاة، تسبيح، قرآن) لترى إحصاءاتك البيانية هنا</p>
        </div>
      `;
      return;
    }

    const maxVal = Math.max(...bars.map(b => b.value), 1);
    const showLabel = bars.length <= 14;

    container.innerHTML = `
      <div class="history-chart">
        ${bars.map(b => {
          const pct = Math.max((b.value / maxVal) * 100, 3);
          return `
            <div class="chart-bar-col" style="min-width:${bars.length > 14 ? '10' : '24'}px;">
              <span class="chart-bar-val">${b.value > 0 ? b.value : ''}</span>
              <div class="chart-bar-track">
                <div class="chart-bar-fill" style="height:${pct}%;"></div>
              </div>
              ${showLabel ? `<span class="chart-bar-label">${b.label}</span>` : ''}
            </div>`;
        }).join('')}
      </div>
    `;
  }

  /** Smart Weekly Report built strictly from stored records. */
  async renderWeeklyReport() {
    const container = document.getElementById('history-weekly-report');
    if (!container) return;

    try {
      const week = await this.getWeeklyStats();
      const prayersRecs = await this.storage.getRecentPrayerRecords(7);

      const totals = week.reduce((acc, d) => ({
        tasbeeh: acc.tasbeeh + (d.tasbeehCount || 0),
        quranPages: acc.quranPages + (d.quranPages || 0),
        minutes: acc.minutes + (d.quranReadingMinutes || 0),
        azkar: acc.azkar + (d.azkarCompleted || 0),
        prayers: acc.prayers + (d.prayersCompleted || 0)
      }), { tasbeeh: 0, quranPages: 0, minutes: 0, azkar: 0, prayers: 0 });

      // Prayer consistency from prayer_records (source of truth for prayer)
      const possiblePrayers = prayersRecs.length * 5;
      const donePrayers = prayersRecs.reduce((acc, r) =>
        acc + ['fajr','dhuhr','asr','maghrib','isha'].filter(p => r[p]).length, 0);
      const prayerPct = possiblePrayers > 0 ? Math.round((donePrayers / possiblePrayers) * 100) : 0;

      // Strongest day by combined activity
      let bestDay = null, bestVal = 0;
      week.forEach(d => {
        const v = (d.tasbeehCount || 0) + (d.prayersCompleted || 0) * 3 +
                  (d.quranReadingMinutes || 0) + (d.azkarCompleted || 0);
        if (v > bestVal) { bestVal = v; bestDay = d; }
      });

      const hasAny = totals.tasbeeh > 0 || totals.minutes > 0 || totals.quranPages > 0 ||
                     totals.azkar > 0 || donePrayers > 0;

      if (!hasAny) {
        container.innerHTML = `
          <p class="empty-state" style="padding:8px 0;">
            لا توجد بيانات كافية بعد هذا الأسبوع لتوليد تقرير مُلخّص.
          </p>`;
        return;
      }

      const activeDays = week.filter(d => this._isActiveDay(d)).length;
      const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

      container.innerHTML = `
        <div class="weekly-report-grid">
          <div class="wr-stat"><span class="wr-val">${prayerPct}%</span><span class="wr-label">التزام الصلوات (7 أيام)</span></div>
          <div class="wr-stat"><span class="wr-val">${totals.tasbeeh.toLocaleString('ar-EG')}</span><span class="wr-label">تسبيحات الأسبوع</span></div>
          <div class="wr-stat"><span class="wr-val">${totals.minutes} د</span><span class="wr-label">دقائق تلاوة</span></div>
          <div class="wr-stat"><span class="wr-val">${totals.quranPages}</span><span class="wr-label">صفحات مسجّلة</span></div>
          <div class="wr-stat"><span class="wr-val">${activeDays}/7</span><span class="wr-label">أيام نشطة</span></div>
          <div class="wr-stat"><span class="wr-val">${totals.azkar}</span><span class="wr-label">أذكار مكتملة</span></div>
        </div>
        ${bestDay ? `<p class="wr-note">⭐ أقوى يوم: ${dayNames[new Date(bestDay.date + 'T00:00:00').getDay()]} — إجمالي نشاط ${bestVal} نقطة وِرد.</p>` : ''}
        ${prayerPct < 100 ? `<p class="wr-note">فرصة للتحسين: نسبة صلواتك المسجّلة ${prayerPct}% — سجّل صلواتك فور أدائها لتحصل على تقرير أدق.</p>` : ''}
      `;
    } catch (err) {
      console.error('renderWeeklyReport error:', err);
      container.innerHTML = '<p class="empty-state">تعذر توليد التقرير.</p>';
    }
  }

  /** Recent activity feed into #history-activity-list. */
  async renderActivityFeed() {
    const container = document.getElementById('history-activity-list') ||
                      document.getElementById('history-feed-list');
    if (!container) return;

    try {
      const activities = await this.getRecentActivity(25);
      const lang = document.body.getAttribute('data-lang') || 'ar';

      if (!activities || activities.length === 0) {
        container.innerHTML = `<p class="empty-state">${lang === 'ar' ? 'لا يوجد نشاط حديث' : 'No recent activity'}</p>`;
        return;
      }

      const typeIcons = {
        tasbeeh_count: '📿', dhikr_completed: '🌅', prayer_completed: '🕌',
        quran_reading: '📖', dua_read: '🤲', habit_completed: '✅',
        daily_goal_completed: '🎯'
      };

      container.innerHTML = activities.map(a => `
        <div class="activity-item" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
          <span class="activity-icon" style="font-size:20px;">${typeIcons[a.type] || '📌'}</span>
          <span class="activity-text" style="flex:1;font-size:14px;color:var(--text-primary);">${this._escapeHTML(a.details?.description || a.type)}</span>
          <span class="activity-time" style="font-size:12px;color:var(--text-muted);white-space:nowrap;">${this._timeAgo(a.timestamp, lang)}</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('renderActivityFeed error:', err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Smart insights (only when data supports them)                      */
  /* ------------------------------------------------------------------ */

  /**
   * Generate 0–4 short insights from REAL stored data. Never fabricates.
   * @returns {Promise<string[]>} Arabic insight strings
   */
  async getSmartInsights() {
    const out = [];
    try {
      await this.flushAll();
      const week = await this.getWeeklyStats();
      const today = week[week.length - 1];
      const prev6 = week.slice(0, 6);

      const tasbeehToday = today.tasbeehCount || 0;
      const tasbeehAvgPrev = prev6.reduce((a, d) => a + (d.tasbeehCount || 0), 0) / Math.max(1, prev6.filter(d => (d.tasbeehCount || 0) > 0).length || 1);
      const activePrevDays = prev6.filter(d => (d.tasbeehCount || 0) > 0).length;

      // Tasbeeh insight (needs at least 3 active prior days)
      if (tasbeehToday > 0 && activePrevDays >= 3) {
        if (tasbeehToday > tasbeehAvgPrev * 1.2) {
          out.push(`⚡ معدل تسبيحك اليوم (${tasbeehToday}) أعلى من متوسطك الأسبوعي (${Math.round(tasbeehAvgPrev)}).`);
        } else if (tasbeehToday < tasbeehAvgPrev * 0.6) {
          out.push(`📿 معدل تسبيحك اليوم أقل من متوسطك الأسبوعي (${Math.round(tasbeehAvgPrev)}) — جلسة قصيرة تعيد التوازن.`);
        }
      }

      // Morning azkar consistency (needs data)
      const morningDoneDays = week.filter(d => Object.keys(d.azkarDone || {}).some(k => k.startsWith('morning:'))).length;
      if (morningDoneDays >= 3) {
        out.push(`🌅 حافظت على أذكار الصباح ${morningDoneDays} أيام هذا الأسبوع.`);
      }

      // Unlogged prayer check (only if some prayers logged today and day isn't over)
      const hour = new Date().getHours();
      if (today.prayersCompleted > 0 && today.prayersCompleted < 5 && hour >= 18) {
        const names = ['الفجر','الظهر','العصر','المغرب','العشاء'];
        const rec = await this.storage.getPrayerRecord(this.storage.todayKey());
        const remaining = ['fajr','dhuhr','asr','maghrib','isha'].filter(p => !rec[p]).map(p => names[['fajr','dhuhr','asr','maghrib','isha'].indexOf(p)]);
        if (remaining.length > 0) {
          out.push(`🕌 لسه محتاج تسجّل صلاة ${remaining.join(' و')}.`);
        }
      }

      // Quran reading insight
      const readingDays = week.filter(d => (d.quranReadingMinutes || 0) > 0 || (d.quranPages || 0) > 0).length;
      if (readingDays >= 4) {
        out.push(`📖 تواصلت مع كتاب الله ${readingDays} أيام من آخر 7 أيام — استمر.`);
      }

      // Goal completion insight
      if (today.goalsCompleted >= 3) {
        out.push(`🎯 أنجزت ${today.goalsCompleted} أهداف اليوم — يوم مبارك.`);
      }
    } catch (err) {
      console.error('getSmartInsights error:', err);
    }
    return out.slice(0, 3);
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  _isActiveDay(stats) {
    if (!stats) return false;
    return (
      (stats.tasbeehCount || 0) > 0 ||
      (stats.quranPages || 0) > 0 ||
      (stats.quranReadingMinutes || 0) > 0 ||
      (stats.azkarCompleted || 0) > 0 ||
      (stats.duasRead || 0) > 0 ||
      (stats.prayersCompleted || 0) > 0 ||
      (stats.goalsCompleted || 0) > 0
    );
  }

  _dayDiff(dateA, dateB) {
    const a = new Date(dateA + 'T00:00:00');
    const b = new Date(dateB + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  _timeAgo(timestamp, lang = 'ar') {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (lang === 'ar') {
      if (mins < 1) return 'الآن';
      if (mins < 60) return `منذ ${mins} دقيقة`;
      if (hours < 24) return `منذ ${hours} ساعة`;
      return `منذ ${days} يوم`;
    }
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  _escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.HistoryManager = HistoryManager;
