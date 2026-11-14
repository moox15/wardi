/**
 * HistoryManager — Activity tracking & statistics for Wardi Pro
 * Depends on StorageManager for all persistence.
 */
class HistoryManager {
  constructor(storage) {
    this.storage = storage; // StorageManager instance
  }

  async init() {
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
  /*  Logging                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Record an activity in history_log and update daily_stats.
   * @param {'tasbeeh'|'quran'|'dua'|'azkar'} type
   * @param {object} details  e.g. { description, count, surah }
   */
  async logActivity(type, details) {
    try {
      const now = new Date();
      const dateStr = this._dateKey(now);

      const entry = {
        type,
        details: details || {},
        timestamp: now.toISOString(),
        date: dateStr
      };

      await this.storage.addItem('history_log', entry);

      // Update daily stats depending on type
      switch (type) {
        case 'tasbeeh':
          await this.updateDailyStats('tasbeehCount', details.count || 1);
          break;
        case 'quran':
          await this.updateDailyStats('quranPages', details.pages || 1);
          break;
        case 'azkar':
          await this.updateDailyStats('azkarCompleted', details.count || 1);
          break;
        case 'dua':
          await this.updateDailyStats('duasRead', details.count || 1);
          break;
        case 'prayer':
          await this.updateDailyStats('prayersCompleted', details.count || 1);
          break;
      }
    } catch (err) {
      console.error('logActivity error:', err);
    }
  }

  /**
   * Increment a stat field for today's daily_stats record.
   * Creates the record if it doesn't exist.
   * @param {string} field  One of: tasbeehCount, quranPages, azkarCompleted, duasRead, prayersCompleted
   * @param {number} value  Amount to add
   */
  async updateDailyStats(field, value) {
    try {
      const today = this._dateKey(new Date());
      let stats = await this.storage.getItem('daily_stats', today);

      if (!stats) {
        stats = {
          date: today,
          tasbeehCount: 0,
          quranPages: 0,
          azkarCompleted: 0,
          duasRead: 0,
          prayersCompleted: 0
        };
      }

      stats[field] = (stats[field] || 0) + value;
      await this.storage.updateItem('daily_stats', stats);
    } catch (err) {
      console.error('updateDailyStats error:', err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Queries                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Get stats for a specific date.
   * @param {string} date  'YYYY-MM-DD'
   * @returns {Promise<object>}
   */
  async getDailyStats(date) {
    try {
      const stats = await this.storage.getItem('daily_stats', date);
      return stats || { date, tasbeehCount: 0, quranPages: 0, azkarCompleted: 0, duasRead: 0 };
    } catch (err) {
      console.error('getDailyStats error:', err);
      return { date, tasbeehCount: 0, quranPages: 0, azkarCompleted: 0, duasRead: 0 };
    }
  }

  /**
   * Get stats for the last 7 days (including today).
   * @returns {Promise<object[]>}
   */
  async getWeeklyStats() {
    try {
      const days = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = this._dateKey(d);
        days.push(await this.getDailyStats(key));
      }
      return days;
    } catch (err) {
      console.error('getWeeklyStats error:', err);
      return [];
    }
  }

  /**
   * Get stats for the last 30 days (including today).
   * @returns {Promise<object[]>}
   */
  async getMonthlyStats() {
    try {
      const days = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = this._dateKey(d);
        days.push(await this.getDailyStats(key));
      }
      return days;
    } catch (err) {
      console.error('getMonthlyStats error:', err);
      return [];
    }
  }

  /**
   * Count consecutive days (up to and including today) where any stat > 0.
   * @returns {Promise<number>}
   */
  async getStreak() {
    try {
      let streak = 0;
      const now = new Date();

      for (let i = 0; i < 365; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = this._dateKey(d);
        const stats = await this.storage.getItem('daily_stats', key);
        if (stats && this._isActiveDay(stats)) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    } catch (err) {
      console.error('getStreak error:', err);
      return 0;
    }
  }

  /**
   * Aggregate totals across ALL daily_stats records.
   * @returns {Promise<object>}
   */
  async getLifetimeStats() {
    try {
      const all = await this.storage.getAllItems('daily_stats');
      let totalTasbeeh = 0;
      let totalQuranPages = 0;
      let totalAzkar = 0;
      let totalDuas = 0;
      let totalDays = 0;

      // Sort ascending by date for streak calculation
      all.sort((a, b) => a.date.localeCompare(b.date));

      let longestStreak = 0;
      let currentStreak = 0;
      let prevDate = null;

      for (const day of all) {
        totalTasbeeh += day.tasbeehCount || 0;
        totalQuranPages += day.quranPages || 0;
        totalAzkar += day.azkarCompleted || 0;
        totalDuas += day.duasRead || 0;

        if (this._isActiveDay(day)) {
          totalDays++;

          if (prevDate) {
            const diff = this._dayDiff(prevDate, day.date);
            if (diff === 1) {
              currentStreak++;
            } else {
              currentStreak = 1;
            }
          } else {
            currentStreak = 1;
          }
          longestStreak = Math.max(longestStreak, currentStreak);
          prevDate = day.date;
        } else {
          currentStreak = 0;
          prevDate = null;
        }
      }

      return { totalTasbeeh, totalQuranPages, totalAzkar, totalDuas, totalDays, longestStreak };
    } catch (err) {
      console.error('getLifetimeStats error:', err);
      return { totalTasbeeh: 0, totalQuranPages: 0, totalAzkar: 0, totalDuas: 0, totalDays: 0, longestStreak: 0 };
    }
  }

  /**
   * Get recent activity log entries, newest first.
   * @param {number} limit
   * @returns {Promise<object[]>}
   */
  async getRecentActivity(limit = 20) {
    try {
      const all = await this.storage.getAllItems('history_log');
      // Sort newest first
      all.sort((a, b) => {
        const ta = a.timestamp || '';
        const tb = b.timestamp || '';
        return tb.localeCompare(ta);
      });
      return all.slice(0, limit);
    } catch (err) {
      console.error('getRecentActivity error:', err);
      return [];
    }
  }

  /**
   * Personal bests.
   * @returns {Promise<object>}
   */
  async getRecords() {
    try {
      const all = await this.storage.getAllItems('daily_stats');
      let bestTasbeeh = 0;
      let bestQuran = 0;

      for (const day of all) {
        if ((day.tasbeehCount || 0) > bestTasbeeh) bestTasbeeh = day.tasbeehCount;
        if ((day.quranPages || 0) > bestQuran) bestQuran = day.quranPages;
      }

      const longestStreak = (await this.getLifetimeStats()).longestStreak;

      return { bestTasbeeh, bestQuran, longestStreak };
    } catch (err) {
      console.error('getRecords error:', err);
      return { bestTasbeeh: 0, bestQuran: 0, longestStreak: 0 };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Render stats panel for a given period.
   * @param {'daily'|'weekly'|'monthly'} period
   */
  async renderStats(period = 'daily') {
    try {
      // Highlight active tab
      ['daily', 'weekly', 'monthly'].forEach(p => {
        const tab = document.getElementById('history-tab-' + p);
        if (tab) tab.classList.toggle('active', p === period);
      });

      // Streak
      const streak = await this.getStreak();
      const streakEl = document.getElementById('history-streak-count');
      if (streakEl) streakEl.textContent = streak;

      // Lifetime totals for the header
      const lifetime = await this.getLifetimeStats();
      const totalTasbeehEl = document.getElementById('history-total-tasbeeh');
      const totalQuranEl = document.getElementById('history-total-quran');
      if (totalTasbeehEl) totalTasbeehEl.textContent = lifetime.totalTasbeeh.toLocaleString();
      if (totalQuranEl) totalQuranEl.textContent = lifetime.totalQuranPages.toLocaleString();

      // Period data
      let data;
      if (period === 'daily') {
        const today = this._dateKey(new Date());
        const stats = await this.getDailyStats(today);
        data = [stats];
      } else if (period === 'weekly') {
        data = await this.getWeeklyStats();
      } else {
        data = await this.getMonthlyStats();
      }

      this.renderChart(data);

      // Records
      const records = await this.getRecords();
      const recordsList = document.getElementById('history-records-list');
      const lang = document.body.getAttribute('data-lang') || 'ar';
      const labels = lang === 'ar'
        ? { bestT: 'أعلى تسبيح يومي', bestQ: 'أكثر صفحات قرآن', streak: 'أطول سلسلة متصلة' }
        : { bestT: 'Best Daily Tasbeeh', bestQ: 'Most Quran Pages', streak: 'Longest Streak' };

      if (recordsList) {
        recordsList.innerHTML = `
          <div class="record-row"><span class="record-name">${labels.bestT}</span><span class="record-val">${records.bestTasbeeh.toLocaleString()}</span></div>
          <div class="record-row"><span class="record-name">${labels.bestQ}</span><span class="record-val">${records.bestQuran.toLocaleString()}</span></div>
          <div class="record-row"><span class="record-name">${labels.streak}</span><span class="record-val">${records.longestStreak}</span></div>
        `;
      }

      const bestT = document.getElementById('record-best-tasbeeh');
      const bestQ = document.getElementById('record-best-quran');
      const streakR = document.getElementById('record-best-streak');
      if (bestT) bestT.textContent = records.bestTasbeeh.toLocaleString();
      if (bestQ) bestQ.textContent = records.bestQuran.toLocaleString();
      if (streakR) streakR.textContent = records.longestStreak;

      // Activity feed
      await this.renderActivityFeed();
    } catch (err) {
      console.error('renderStats error:', err);
    }
  }

  /**
   * Render a CSS-based bar chart into #history-chart-container.
   * @param {object[]} data  Array of daily_stats objects.
   */
  renderChart(data) {
    const container = document.getElementById('history-chart-container');
    if (!container || !data || data.length === 0) return;

    // Compute combined value for each day
    const bars = data.map(d => ({
      label: d.date ? d.date.slice(5) : '', // MM-DD
      value: (d.tasbeehCount || 0) + (d.quranPages || 0) + (d.azkarCompleted || 0) + (d.duasRead || 0) + (d.prayersCompleted || 0)
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

  /**
   * Render the recent activity feed into #history-activity-list.
   */
  async renderActivityFeed() {
    const container = document.getElementById('history-activity-list') || document.getElementById('history-feed-list');
    if (!container) return;

    try {
      const activities = await this.getRecentActivity(20);
      const lang = document.body.getAttribute('data-lang') || 'ar';

      if (!activities || activities.length === 0) {
        container.innerHTML = `<p class="empty-state">${lang === 'ar' ? 'لا يوجد نشاط حديث' : 'No recent activity'}</p>`;
        return;
      }

      const typeIcons = { tasbeeh: '📿', quran: '📖', dua: '🤲', azkar: '🌙' };

      container.innerHTML = activities.map(a => `
        <div class="activity-item" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
          <span class="activity-icon" style="font-size:20px;">${typeIcons[a.type] || '📌'}</span>
          <span class="activity-text" style="flex:1;font-size:14px;color:var(--text-primary);">${a.details?.description || a.type}</span>
          <span class="activity-time" style="font-size:12px;color:var(--text-muted);white-space:nowrap;">${this._timeAgo(a.timestamp, lang)}</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('renderActivityFeed error:', err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  /** @returns {string} 'YYYY-MM-DD' */
  _dateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Check if any stat in a daily record is > 0 */
  _isActiveDay(stats) {
    return (
      (stats.tasbeehCount || 0) > 0 ||
      (stats.quranPages || 0) > 0 ||
      (stats.azkarCompleted || 0) > 0 ||
      (stats.duasRead || 0) > 0
    );
  }

  /** Difference in calendar days between two YYYY-MM-DD strings */
  _dayDiff(dateA, dateB) {
    const a = new Date(dateA + 'T00:00:00');
    const b = new Date(dateB + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  /** Human-readable "time ago" */
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
    } else {
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return `${days}d ago`;
    }
  }
}

window.HistoryManager = HistoryManager;
