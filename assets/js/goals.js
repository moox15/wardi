/**
 * GoalsManager — أهداف يومي | My Daily Mission
 * Intelligent daily goals + accountability system for Wardi Pro.
 *
 * Design principles:
 *  - Progress is computed from REAL activity data (prayer_records,
 *    daily_stats) for built-in goal types. Nothing is auto-completed;
 *    auto goals complete only when their real progress reaches target.
 *  - Custom goals progress only through explicit user taps.
 *  - Every day gets its own daily_goals record. Yesterday is preserved.
 *  - Carry-forward happens only from goals the user explicitly marked.
 *  - Accountability Mode: firmer reminders, overdue highlighting, honest
 *    review — never humiliation or religious guilt.
 */
class GoalsManager {
  constructor(storage, history) {
    this.storage = storage;
    this.history = history;
    this.today = storage.todayKey();
    this.record = null;          // today's goals record
    this._remindedGoals = new Set();   // goalId:date dedupe
    this._lastNudgeMinute = null;
    this._timer = null;
    this._dateWatcher = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Goal type registry                                                 */
  /* ------------------------------------------------------------------ */

  static get TYPES() {
    return {
      prayers:        { label: 'المحافظة على الصلوات الخمس', icon: '🕌', unit: 'صلوات', auto: true, defaultTarget: 5, maxTarget: 5 },
      azkar_morning:  { label: 'أذكار الصباح',              icon: '🌅', unit: 'أذكار', auto: true, defaultTarget: 13 },
      azkar_evening:  { label: 'أذكار المساء',              icon: '🌙', unit: 'أذكار', auto: true, defaultTarget: 9 },
      quran_minutes:  { label: 'تلاوة القرآن',              icon: '📖', unit: 'دقائق', auto: true, defaultTarget: 10 },
      tasbeeh:        { label: 'التسبيح',                   icon: '📿', unit: 'تسبيحة', auto: true, defaultTarget: 100 },
      istighfar:      { label: 'الاستغفار',                 icon: '🤲', unit: 'مرة', auto: true, defaultTarget: 100 },
      salawat:        { label: 'الصلاة على النبي ﷺ',        icon: '🕋', unit: 'مرة', auto: true, defaultTarget: 100 },
      custom:         { label: 'هدف شخصي',                  icon: '⭐', unit: 'مرة', auto: false, defaultTarget: 1 }
    };
  }

  async init() {
    await this._ensureTodayRecord();
    this.setupEventListeners();
    await this.renderGoalsDashboard();

    // Reminder engine — checks every 30 seconds while app is open
    this._timer = setInterval(() => this._tick(), 30000);
    // New-day watcher — checks every minute for midnight transition
    this._dateWatcher = setInterval(() => this._checkNewDay(), 60000);
    if (!this._visBound) {
      this._visBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this._checkNewDay();
          this.renderGoalsDashboard();
        }
      });
    }

    this._tick();
    this._maybeShowDailySetup();
    this._maybeShowEndOfDayReview();
  }

  /* ------------------------------------------------------------------ */
  /*  Daily record management                                            */
  /* ------------------------------------------------------------------ */

  async _ensureTodayRecord() {
    this.today = this.storage.todayKey();
    try {
      let rec = await this.storage.getItem('daily_goals', this.today);
      if (!rec) {
        // Auto-carry ONLY goals explicitly marked carryOver from yesterday
        const yesterdayKey = this._prevDateKey(this.today);
        const yesterday = await this.storage.getItem('daily_goals', yesterdayKey);
        const carried = (yesterday?.items || [])
          .filter(g => g.carryOver && !g.skipped)
          .map(g => this._newGoal(g.type, {
            title: g.title, target: g.target, priority: g.priority,
            reminderTime: g.reminderTime || null, carryOver: true, manual: g.manual
          }));
        rec = {
          date: this.today,
          items: carried,
          setupDone: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await this.storage.updateItem('daily_goals', rec);
      }
      this.record = rec;
    } catch (err) {
      console.error('[Goals] ensureTodayRecord error:', err);
      this.record = { date: this.today, items: [], setupDone: true, createdAt: '', updatedAt: '' };
    }
  }

  async _persist() {
    if (!this.record) return;
    this.record.updatedAt = new Date().toISOString();
    try {
      await this.storage.updateItem('daily_goals', this.record);
    } catch (err) {
      console.error('[Goals] persist error:', err);
      if (window.WardApp) window.WardApp.showToast('تعذر حفظ أهداف اليوم — تحقق من مساحة التخزين', 'error');
    }
  }

  _newGoal(type, opts = {}) {
    const meta = GoalsManager.TYPES[type] || GoalsManager.TYPES.custom;
    return {
      id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      title: opts.title || meta.label,
      target: Math.max(1, opts.target || meta.defaultTarget),
      priority: opts.priority || 'normal',       // 'high' | 'normal' | 'low'
      reminderTime: opts.reminderTime || null,   // 'HH:MM' | null
      carryOver: !!opts.carryOver,
      manual: !meta.auto,
      progress: 0,       // for custom goals
      done: false,
      skipped: false,
      skippedReason: null,
      createdAt: new Date().toISOString()
    };
  }

  _prevDateKey(dateKey) {
    const d = new Date(dateKey + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    return this.storage.localDateKey(d);
  }

  _checkNewDay() {
    const key = this.storage.todayKey();
    if (key !== this.today) {
      console.log('[Goals] New day detected:', key);
      this._reinitNewDay();
    }
  }

  /**
   * Re-init for midnight transition WITHOUT re-binding event listeners
   * (calling init() again would double-bind setup-modal buttons and
   * cause duplicate goals when clicked).
   */
  async _reinitNewDay() {
    try {
      if (this._timer) clearInterval(this._timer);
      if (this._dateWatcher) clearInterval(this._dateWatcher);
      this._remindedGoals.clear();
      await this._ensureTodayRecord();
      await this.renderGoalsDashboard();
      this._timer = setInterval(() => this._tick(), 30000);
      this._dateWatcher = setInterval(() => this._checkNewDay(), 60000);
      this._tick();
      this._maybeShowDailySetup();
      this._maybeShowEndOfDayReview();
    } catch (err) {
      console.error('[Goals] new-day reinit error:', err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Real progress computation (from actual activity records)           */
  /* ------------------------------------------------------------------ */

  async _loadProgressData() {
    const [stats, prayerRec] = await Promise.all([
      this.history.getDailyStats(this.today),
      this.storage.getPrayerRecord(this.today)
    ]);
    let prayersDone = 0;
    ['fajr','dhuhr','asr','maghrib','isha'].forEach(p => { if (prayerRec[p]) prayersDone++; });

    const azkarDone = stats.azkarDone || {};
    const morningDone = Object.keys(azkarDone).filter(k => k.startsWith('morning:')).length;
    const eveningDone = Object.keys(azkarDone).filter(k => k.startsWith('evening:')).length;
    const phrase = stats.tasbeehByPhrase || {};

    return {
      prayers: prayersDone,
      azkar_morning: morningDone,
      azkar_evening: eveningDone,
      quran_minutes: Math.round(stats.quranReadingMinutes || 0),
      tasbeeh: stats.tasbeehCount || 0,
      istighfar: phrase['أستغفر الله'] || 0,
      salawat: phrase['الصلاة على النبي ﷺ'] || 0,
      stats
    };
  }

  async getGoalProgress(goal, data) {
    const d = data || await this._loadProgressData();
    const meta = GoalsManager.TYPES[goal.type] || GoalsManager.TYPES.custom;
    if (meta.auto) {
      const current = d[goal.type] || 0;
      return { current, target: goal.target, pct: Math.min(100, Math.round((current / goal.target) * 100)), auto: true };
    }
    // Custom goals — manual progress
    const current = goal.progress || 0;
    const done = current >= goal.target;
    return { current, target: goal.target, pct: goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0, auto: false, reached: done };
  }

  /**
   * Sync all goals with real data. Auto goals that reach target are marked
   * done ONCE (with a history event) — never unmarked automatically.
   */
  async syncGoalProgress(silent = true) {
    if (!this.record) return;
    const data = await this._loadProgressData();
    let changed = false;

    for (const goal of this.record.items) {
      if (goal.skipped) continue;
      const meta = GoalsManager.TYPES[goal.type] || GoalsManager.TYPES.custom;
      const p = await this.getGoalProgress(goal, data);

      if (meta.auto) {
        if (goal.done && !goal._doneByProgress) {
          // Manual done stays done
        }
        if (!goal.done && p.current >= goal.target) {
          goal.done = true;
          goal._doneByProgress = true;
          changed = true;
          if (!silent) {
            if (window.WardApp) window.WardApp.showToast(`🎯 اكتمل هدف: ${goal.title}`);
          }
          await this.history.logActivity('daily_goal_completed', {
            description: `تحقيق هدف: ${goal.title}`,
            goalType: goal.type,
            quantity: p.current,
            target: goal.target
          });
        }
      }
    }

    // Custom goals done state follows manual progress
    for (const goal of this.record.items) {
      if (!GoalsManager.TYPES[goal.type]?.auto && !goal.skipped) {
        const reached = (goal.progress || 0) >= goal.target;
        if (reached && !goal.done) {
          goal.done = true;
          changed = true;
          await this.history.logActivity('daily_goal_completed', {
            description: `تحقيق هدف: ${goal.title}`,
            goalType: goal.type,
            quantity: goal.progress,
            target: goal.target
          });
        }
      }
    }

    if (changed) await this._persist();
    return data;
  }

  /* ------------------------------------------------------------------ */
  /*  CRUD                                                               */
  /* ------------------------------------------------------------------ */

  async addGoal(type, opts) {
    const goal = this._newGoal(type, opts);
    this.record.items.push(goal);
    await this._persist();
    await this.renderGoalsDashboard();
    if (window.WardApp) window.WardApp.showToast(`أُضيف الهدف: ${goal.title} 🎯`);
    return goal;
  }

  async updateGoal(goalId, patch) {
    const goal = this.record.items.find(g => g.id === goalId);
    if (!goal) return;
    Object.assign(goal, patch);
    if (patch.target !== undefined) goal.target = Math.max(1, parseInt(patch.target) || goal.target);
    await this._persist();
    await this.renderGoalsDashboard();
  }

  async removeGoal(goalId) {
    const before = this.record.items.length;
    this.record.items = this.record.items.filter(g => g.id !== goalId);
    if (this.record.items.length !== before) {
      await this._persist();
      await this.renderGoalsDashboard();
    }
  }

  /** Explicit manual completion (never automatic for custom goals). */
  async completeGoal(goalId) {
    const goal = this.record.items.find(g => g.id === goalId);
    if (!goal || goal.done) return;
    goal.done = true;
    await this._persist();
    await this.history.logActivity('daily_goal_completed', {
      description: `تحقيق هدف: ${goal.title}`,
      goalType: goal.type,
      quantity: goal.progress || goal.target,
      target: goal.target
    });
    await this.renderGoalsDashboard();
    if (window.WardApp) window.WardApp.showToast(`أحسنت! تحقق هدف: ${goal.title} ✨`);
  }

  async uncompleteGoal(goalId) {
    const goal = this.record.items.find(g => g.id === goalId);
    if (!goal) return;
    goal.done = false;
    delete goal._doneByProgress;
    await this._persist();
    await this.renderGoalsDashboard();
  }

  async skipGoal(goalId, reason) {
    const goal = this.record.items.find(g => g.id === goalId);
    if (!goal) return;
    goal.skipped = true;
    goal.skippedReason = reason || null;
    goal.done = false;
    await this._persist();
    await this.renderGoalsDashboard();
    if (window.WardApp) window.WardApp.showToast('تم استبعاد الهدف من تقييم اليوم', 'info');
  }

  async unskipGoal(goalId) {
    const goal = this.record.items.find(g => g.id === goalId);
    if (!goal) return;
    goal.skipped = false;
    goal.skippedReason = null;
    await this._persist();
    await this.renderGoalsDashboard();
  }

  /** Custom goal manual progress adjust. */
  async adjustCustomGoal(goalId, delta) {
    const goal = this.record.items.find(g => g.id === goalId);
    if (!goal) return;
    const meta = GoalsManager.TYPES[goal.type] || GoalsManager.TYPES.custom;
    if (meta.auto) return; // auto goals can't be manually adjusted
    goal.progress = Math.max(0, (goal.progress || 0) + delta);
    await this._persist();
    if (delta > 0) {
      await this.history.logActivity('habit_completed', {
        description: `تقدم في هدف: ${goal.title} (+${delta})`,
        goalId, quantity: delta
      });
    }
    await this.syncGoalProgress();
    await this.renderGoalsDashboard();
  }

  /* ------------------------------------------------------------------ */
  /*  Templates & carry-over                                             */
  /* ------------------------------------------------------------------ */

  async getTemplate() {
    try {
      return await this.storage.getItem('goal_templates', 'default');
    } catch (e) { return null; }
  }

  async saveTemplate() {
    const tpl = {
      id: 'default',
      items: this.record.items.filter(g => !g.skipped).map(g => ({
        type: g.type, title: g.title, target: g.target,
        priority: g.priority, reminderTime: g.reminderTime, carryOver: g.carryOver, manual: g.manual
      })),
      savedAt: new Date().toISOString()
    };
    await this.storage.updateItem('goal_templates', tpl);
    if (window.WardApp) window.WardApp.showToast('تم حفظ قالب أهدافك الافتراضي 📋');
  }

  async applyYesterday() {
    const yesterdayKey = this._prevDateKey(this.today);
    const yesterday = await this.storage.getItem('daily_goals', yesterdayKey);
    if (!yesterday || !yesterday.items || yesterday.items.length === 0) {
      if (window.WardApp) window.WardApp.showToast('لا توجد أهداف أمس لإعادة استخدامها', 'info');
      return false;
    }
    this.record.items = yesterday.items
      .filter(g => !g.skipped)
      .map(g => this._newGoal(g.type, {
        title: g.title, target: g.target, priority: g.priority,
        reminderTime: g.reminderTime, carryOver: g.carryOver, manual: g.manual
      }));
    await this._persist();
    await this.renderGoalsDashboard();
    return true;
  }

  async applyTemplate() {
    const tpl = await this.getTemplate();
    if (!tpl || !tpl.items || tpl.items.length === 0) {
      if (window.WardApp) window.WardApp.showToast('لا يوجد قالب محفوظ بعد', 'info');
      return false;
    }
    this.record.items = tpl.items.map(g => this._newGoal(g.type, {
      title: g.title, target: g.target, priority: g.priority,
      reminderTime: g.reminderTime, carryOver: g.carryOver, manual: g.manual
    }));
    await this._persist();
    await this.renderGoalsDashboard();
    return true;
  }

  /* ------------------------------------------------------------------ */
  /*  Summary for dashboard                                              */
  /* ------------------------------------------------------------------ */

  async getGoalsSummary() {
    if (!this.record) await this._ensureTodayRecord();
    const items = this.record.items || [];
    const effective = items.filter(g => !g.skipped);
    const done = effective.filter(g => g.done).length;
    const total = effective.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    // Time remaining in the local day
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const msLeft = Math.max(0, endOfDay - now);
    const hoursLeft = Math.floor(msLeft / 3600000);
    const minsLeft = Math.floor((msLeft % 3600000) / 60000);

    // Next reminder among unfinished goals
    const pending = effective.filter(g => !g.done && g.reminderTime);
    let nextReminder = null;
    if (pending.length) {
      pending.sort((a, b) => (a.reminderTime || '').localeCompare(b.reminderTime || ''));
      nextReminder = pending.find(g => g.reminderTime > this._nowHHMM()) ||
                     pending[0];
    }

    return {
      total, done,
      remaining: total - done,
      pct,
      skipped: items.filter(g => g.skipped).length,
      priorityGoals: effective.filter(g => !g.done && g.priority === 'high'),
      nextReminder,
      timeLeft: { hours: hoursLeft, minutes: minsLeft },
      items
    };
  }

  _nowHHMM() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering — dashboard goals card                                   */
  /* ------------------------------------------------------------------ */

  async renderGoalsDashboard() {
    const container = document.getElementById('daily-goals-list');
    const headPct = document.getElementById('goals-day-pct');
    const headFill = document.getElementById('goals-day-fill');
    const headMeta = document.getElementById('goals-day-meta');
    if (!container) return;

    await this.syncGoalProgress();
    const summary = await this.getGoalsSummary();

    if (headPct) headPct.textContent = `${summary.pct}%`;
    if (headFill) headFill.style.width = `${summary.pct}%`;
    if (headMeta) {
      headMeta.textContent = summary.total === 0
        ? 'لم تحدد أهداف اليوم بعد'
        : `${summary.done} / ${summary.total} هدف • باقي من اليوم ${summary.timeLeft.hours}س ${summary.timeLeft.minutes}د`;
    }

    if (summary.total === 0) {
      container.innerHTML = `
        <div class="goals-empty card">
          <span class="goals-empty-icon">🌿</span>
          <p>«يوم جديد، فرصة جديدة للقرب من الله»</p>
          <p class="goals-empty-sub">حدد أهداف يومك لتتابع التزامك وتبني عادة ثابتة.</p>
          <button class="btn btn-primary" id="goals-setup-open-btn">حدد أهداف اليوم 🎯</button>
        </div>
      `;
      const btn = document.getElementById('goals-setup-open-btn');
      if (btn) btn.addEventListener('click', () => this.showSetupModal());
      return;
    }

    const overdue = this._isOverdueTime();
    const accountability = this.storage.getSetting('goal_accountability', false);
    const data = await this._loadProgressData();

    container.innerHTML = summary.items.filter(g => !g.skipped).map(g => {
      const meta = GoalsManager.TYPES[g.type] || GoalsManager.TYPES.custom;
      const p = this._cachedProgress(g, data);
      const isDone = g.done;
      const isOverdue = !isDone && overdue && accountability && g.priority === 'high';

      const progressCell = meta.auto
        ? `<div class="goal-mini-track"><div class="goal-mini-fill" style="width:${p.pct}%"></div></div>
           <span class="goal-prog-val">${p.current} / ${g.target} ${meta.unit}</span>`
        : `<div class="goal-manual-controls">
             <button class="btn-icon goal-adjust-btn" data-goal="${g.id}" data-delta="-1" aria-label="إنقاص">−</button>
             <span class="goal-prog-val">${p.current} / ${g.target} ${meta.unit}</span>
             <button class="btn-icon goal-adjust-btn" data-goal="${g.id}" data-delta="1" aria-label="زيادة">+</button>
           </div>`;

      return `
        <div class="goal-row card ${isDone ? 'goal-done' : ''} ${isOverdue ? 'goal-overdue' : ''} ${g.priority === 'high' ? 'goal-priority-high' : ''}">
          <div class="goal-row-head">
            <span class="goal-icon">${meta.icon}</span>
            <div class="goal-title-wrap">
              <strong class="goal-title">${this._escapeHTML(g.title)}</strong>
              <span class="goal-tags">
                ${g.priority === 'high' ? '<span class="goal-tag tag-high">أولوية</span>' : ''}
                ${g.reminderTime ? `<span class="goal-tag tag-remind">⏰ ${g.reminderTime}</span>` : ''}
                ${g.carryOver ? '<span class="goal-tag tag-carry">يومية</span>' : ''}
                ${isOverdue ? '<span class="goal-tag tag-overdue">تأخر</span>' : ''}
              </span>
            </div>
            ${isDone
              ? '<span class="goal-done-badge">✓ تم</span>'
              : `<button class="btn btn-sm btn-success goal-complete-btn" data-goal="${g.id}">أتممته ✓</button>`}
          </div>
          ${progressCell}
        </div>
      `;
    }).join('');

    // Wire buttons
    container.querySelectorAll('.goal-complete-btn').forEach(b =>
      b.addEventListener('click', () => this.completeGoal(b.dataset.goal)));
    container.querySelectorAll('.goal-adjust-btn').forEach(b =>
      b.addEventListener('click', () => this.adjustCustomGoal(b.dataset.goal, parseInt(b.dataset.delta))));

    // More menu (edit/skip/remove) via inline handlers
    this._wireGoalMenu(container, summary);
  }

  _cachedProgress(goal, data) {
    const meta = GoalsManager.TYPES[goal.type] || GoalsManager.TYPES.custom;
    if (meta.auto) {
      const current = data[goal.type] || 0;
      return { current, pct: Math.min(100, Math.round((current / goal.target) * 100)) };
    }
    const current = goal.progress || 0;
    return { current, pct: Math.min(100, Math.round((current / goal.target) * 100)) };
  }

  _wireGoalMenu(container, summary) {
    // Long-press / right area actions: edit (pencil) + skip + remove
    container.querySelectorAll('.goal-row').forEach(row => {
      const goalId = null;
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._openGoalActions(row);
      });
    });
    // Simpler: add an explicit "⋯" button per row during render? Keep tap on title area opens actions.
    container.querySelectorAll('.goal-title-wrap').forEach(wrap => {
      wrap.addEventListener('click', () => {
        const row = wrap.closest('.goal-row');
        this._openGoalActions(row);
      });
    });
  }

  _openGoalActions(row) {
    // Determine goal id by matching title text against items
    const titleEl = row.querySelector('.goal-title');
    if (!titleEl || !this.record) return;
    const goal = this.record.items.find(g => g.title === titleEl.textContent);
    if (!goal) return;

    const lang = 'ar';
    const action = prompt(
      'خيارات الهدف:\n1) تعديل الهدف والكمية\n2) تمرير الهدف للأيام القادمة (يومي)\n3) استبعاده اليوم مع السبب\n4) حذف الهدف نهائيًا\nاكتب رقم الخيار:',
      ''
    );
    if (!action) return;
    const choice = action.trim()[0];
    if (choice === '1') {
      const newTitle = prompt('عنوان الهدف:', goal.title);
      if (newTitle === null) return;
      const newTarget = prompt('الكمية المستهدفة:', goal.target);
      if (newTarget === null) return;
      const newReminder = prompt('وقت التذكير (HH:MM) أو اتركه فارغًا:', goal.reminderTime || '');
      if (newReminder === null) return;
      this.updateGoal(goal.id, {
        title: newTitle.trim() || goal.title,
        target: newTarget,
        reminderTime: /^\d{1,2}:\d{2}$/.test(newReminder.trim()) ? newReminder.trim() : null
      });
    } else if (choice === '2') {
      this.updateGoal(goal.id, { carryOver: !goal.carryOver });
      if (window.WardApp) window.WardApp.showToast(goal.carryOver ? 'أُلغي التمرير اليومي' : 'أصبح الهدف يوميًا (يُمرر تلقائيًا)');
    } else if (choice === '3') {
      const reason = prompt('ما الذي عطّلك اليوم؟ (سنساعدك على معالجة السبب غدًا)', '');
      this.skipGoal(goal.id, reason);
      if (reason) {
        this._saveSkipInsight(goal, reason);
      }
    } else if (choice === '4') {
      if (confirm('حذف هذا الهدف نهائيًا من اليوم؟')) this.removeGoal(goal.id);
    }
  }

  async _saveSkipInsight(goal, reason) {
    try {
      const reviews = await this.storage.getItem('daily_reviews', this.today) || {
        date: this.today, skipInsights: []
      };
      reviews.skipInsights = reviews.skipInsights || [];
      reviews.skipInsights.push({ goalId: goal.id, title: goal.title, reason, at: new Date().toISOString() });
      await this.storage.updateItem('daily_reviews', reviews);
    } catch (e) {}
  }

  _isOverdueTime() {
    const h = new Date().getHours();
    return h >= 18; // after 6 PM, high-priority unfinished goals are flagged
  }

  /* ------------------------------------------------------------------ */
  /*  Daily setup modal                                                  */
  /* ------------------------------------------------------------------ */

  showSetupModal() {
    const modal = document.getElementById('goals-setup-modal');
    const overlay = document.getElementById('modal-overlay');
    if (!modal) return;

    this._renderSetupList();

    if (modal) { modal.style.display = 'block'; modal.classList.add('active'); }
    if (overlay) { overlay.style.display = 'block'; overlay.classList.add('active'); }
  }

  hideSetupModal() {
    const modal = document.getElementById('goals-setup-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
    if (overlay) {
      // Only hide overlay if no other modal open
      const anyOpen = document.querySelector('.modal.active');
      if (!anyOpen) { overlay.style.display = 'none'; overlay.classList.remove('active'); }
    }
  }

  _renderSetupList() {
    const list = document.getElementById('goals-setup-list');
    if (!list) return;
    const items = this.record.items || [];
    const types = GoalsManager.TYPES;

    list.innerHTML = items.length === 0
      ? '<p class="empty-state" style="padding:8px 0;">لم تضف أهدافًا بعد — اختر من القائمة أدناه.</p>'
      : items.map(g => {
          const meta = types[g.type] || types.custom;
          return `
            <div class="goal-setup-row" data-goal="${g.id}">
              <span class="goal-icon">${meta.icon}</span>
              <div class="goal-setup-info">
                <strong>${this._escapeHTML(g.title)}</strong>
                <span>${g.target} ${meta.unit} ${g.reminderTime ? '• ⏰ ' + g.reminderTime : ''} ${g.carryOver ? '• يومي' : ''}</span>
              </div>
              <button class="btn-icon goal-setup-remove" data-goal="${g.id}" aria-label="إزالة">🗑</button>
            </div>
          `;
        }).join('');

    list.querySelectorAll('.goal-setup-remove').forEach(b => {
      b.addEventListener('click', () => {
        this.removeGoal(b.dataset.goal).then(() => this._renderSetupList());
      });
    });
  }

  _setupAddFromCatalog(type) {
    const meta = GoalsManager.TYPES[type];
    const target = meta.auto ? meta.defaultTarget : 1;
    this.addGoal(type, { target }).then(() => this._renderSetupList());
  }

  _setupAddCustom() {
    const title = prompt('اسم الهدف الشخصي:', '');
    if (!title || !title.trim()) return;
    const target = prompt('الكمية المستهدفة:', '1');
    this.addGoal('custom', { title: title.trim(), target }).then(() => this._renderSetupList());
  }

  async _finishSetup() {
    this.record.setupDone = true;
    await this._persist();
    this.hideSetupModal();
    await this.renderGoalsDashboard();
    if (window.WardApp) window.WardApp.showToast('مبارك! أهداف اليوم جاهزة 🌿');
    if (window.WardApp) window.WardApp.updateDashboard();
  }

  /* ------------------------------------------------------------------ */
  /*  Reminder engine & accountability                                   */
  /* ------------------------------------------------------------------ */

  async _tick() {
    try {
      if (document.visibilityState === 'hidden') return;
      await this._ensureTodayRecord();
      await this.syncGoalProgress();

      const accountability = this.storage.getSetting('goal_accountability', false);
      const effective = (this.record.items || []).filter(g => !g.skipped && !g.done);

      // 1. Per-goal reminder times
      const nowHHMM = this._nowHHMM();
      for (const goal of effective) {
        if (!goal.reminderTime) continue;
        const key = `${goal.id}:${this.today}`;
        if (goal.reminderTime === nowHHMM && !this._remindedGoals.has(key)) {
          this._remindedGoals.add(key);
          this._notify(`⏰ هدف اليوم: ${goal.title}`, `لسه ما أكملت هدف «${goal.title}» — خصص له بضع دقائق دلوقتي.`);
        }
      }

      // 2. Time-based nudges (morning setup, afternoon, evening)
      const hour = new Date().getHours();
      const minute = new Date().getMinutes();
      const minuteKey = `${hour}:${Math.floor(minute / 15)}`; // every 15 min granularity

      if (effective.length === 0 && (this.record.items || []).length === 0) {
        if (hour >= 7 && hour < 12 && !this._remindedGoals.has('setup:' + this.today + ':' + hour)) {
          this._remindedGoals.add('setup:' + this.today + ':' + hour);
          this._notify('🌿 يوم جديد، فرصة جديدة',
            'لسه محددناش أهداف يومك. خلينا نبدأ بخطة بسيطة — اضغط «حدد أهداف اليوم».');
        }
      } else if (effective.length > 0) {
        // Accountability: more frequent, firmer nudges for unfinished goals
        if (accountability && this._lastNudgeMinute !== minuteKey) {
          const intervalMin = parseInt(this.storage.getSetting('goal_reminder_interval', 45)) || 45;
          const lastNudge = parseInt(this.storage.getSetting('goal_last_nudge_ts', '0')) || 0;
          if (Date.now() - lastNudge > intervalMin * 60000 && hour >= 8 && hour <= 23) {
            this._lastNudgeMinute = minuteKey;
            this.storage.setSetting('goal_last_nudge_ts', String(Date.now()));
            const g = effective.find(x => x.priority === 'high') || effective[0];
            const messages = [
              `أنت وعدت نفسك بالهدف ده النهارده: «${g.title}». لسه عندك فرصة تلتزم.`,
              `لسه عندك هدف «${g.title}» — خصص له 10 دقائق دلوقتي.`,
              `أنت أنجزت جزء من أهدافك، باقي خطوات بسيطة وتكمل يومك.`
            ];
            this._notify('وضع الالتزام 🛡️', messages[Math.floor(Math.random() * messages.length)]);
          }
        }

        // Evening review nudge (18:00–22:00, once)
        if (hour >= 18 && hour < 22 && !this._remindedGoals.has('review:' + this.today)) {
          this._remindedGoals.add('review:' + this.today);
          if (effective.length > 0) {
            this._notify('🌅 مراجعة المساء',
              'راجع أهدافك قبل نهاية اليوم. لسه عندك مهام تقدر تلحق تنجزها.');
          }
        }
      }
    } catch (err) {
      console.error('[Goals] tick error:', err);
    }
  }

  _notify(title, body) {
    if (window.WardApp) {
      window.WardApp.showToast(`${title} — ${body}`, 'info');
    }
    // Browser notification only when explicitly permitted & page hidden
    try {
      if ('Notification' in window && Notification.permission === 'granted' &&
          document.visibilityState !== 'visible') {
        new Notification(title, { body, icon: './assets/icons/icon-192.png', silent: false });
      }
    } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /*  End-of-day review                                                  */
  /* ------------------------------------------------------------------ */

  _maybeShowEndOfDayReview() {
    const hour = new Date().getHours();
    if (hour < 20) return; // show after 8 PM
    const shown = this.storage.getSetting('goal_review_shown_' + this.today, false);
    if (shown) return;
    this._openReviewModal();
  }

  async _openReviewModal() {
    const modal = document.getElementById('goals-review-modal');
    if (!modal) return;
    const overlay = document.getElementById('modal-overlay');

    const summary = await this.getGoalsSummary();
    const effective = summary.items.filter(g => !g.skipped);
    const doneItems = effective.filter(g => g.done);
    const missed = effective.filter(g => !g.done);

    const doneEl = document.getElementById('review-done-list');
    const missEl = document.getElementById('review-miss-list');
    const pctEl = document.getElementById('review-pct');

    if (pctEl) pctEl.textContent = `${summary.pct}%`;
    if (doneEl) {
      doneEl.innerHTML = doneItems.length
        ? doneItems.map(g => `<li>✓ ${this._escapeHTML(g.title)}</li>`).join('')
        : '<li class="review-muted">لم يُنجز أي هدف اليوم</li>';
    }
    if (missEl) {
      missEl.innerHTML = missed.length
        ? missed.map(g => `<li>○ ${this._escapeHTML(g.title)}</li>`).join('')
        : '<li class="review-muted">لا يوجد — يوم مكتمل 🎉</li>';
    }

    // Difficulty + adjustment suggestion from real skip reasons
    const sugEl = document.getElementById('review-suggestion');
    if (sugEl) {
      const suggestions = [];
      if (missed.length > 0) {
        const skippedToday = (this.record.items || []).filter(g => g.skipped);
        if (skippedToday.length) {
          suggestions.push(`لاحظنا أنك استبعدت «${skippedToday[0].title}» — إيه اللي عطّله؟ خلينا نعالج السبب بكرة بخطوة أصغر.`);
        } else {
          suggestions.push(`الهدف «${missed[0].title}» ما اكتملش. جرّب تقسمه لكمية أصغر بكرة لتحقق النصر.`);
        }
      } else if (effective.length > 0) {
        suggestions.push('يوم مكتمل بالكامل — حافظ على نفس الخطة غدًا أو ارفع التحدي قليلًا.');
      }
      sugEl.textContent = suggestions[0] || '';
    }

    if (modal) { modal.style.display = 'block'; modal.classList.add('active'); }
    if (overlay) { overlay.style.display = 'block'; overlay.classList.add('active'); }
  }

  hideReviewModal() {
    const modal = document.getElementById('goals-review-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
    if (overlay) {
      const anyOpen = document.querySelector('.modal.active');
      if (!anyOpen) { overlay.style.display = 'none'; overlay.classList.remove('active'); }
    }
  }

  async saveReview() {
    const bestInput = document.getElementById('review-best-input');
    const focusInput = document.getElementById('review-focus-input');
    const summary = await this.getGoalsSummary();

    const review = {
      date: this.today,
      totalGoals: summary.total,
      completedGoals: summary.done,
      pct: summary.pct,
      bestAchievement: (bestInput?.value || '').trim(),
      focusTomorrow: (focusInput?.value || '').trim(),
      savedAt: new Date().toISOString()
    };

    // Merge with any earlier record (skip insights)
    try {
      const existing = await this.storage.getItem('daily_reviews', this.today);
      const merged = Object.assign(existing || {}, review);
      await this.storage.updateItem('daily_reviews', merged);
    } catch (err) {
      await this.storage.updateItem('daily_reviews', review);
    }

    this.storage.setSetting('goal_review_shown_' + this.today, true);
    this.hideReviewModal();
    if (window.WardApp) window.WardApp.showToast('تم حفظ مراجعة يومك 🌙 تصبح على خير');
  }

  /* ------------------------------------------------------------------ */
  /*  Event wiring (setup modal catalog)                                 */
  /* ------------------------------------------------------------------ */

  setupEventListeners() {
    const modal = document.getElementById('goals-setup-modal');
    if (!modal) return;

    modal.querySelectorAll('[data-goal-type]').forEach(btn => {
      btn.addEventListener('click', () => this._setupAddFromCatalog(btn.dataset.goalType));
    });

    const customBtn = document.getElementById('goals-setup-add-custom');
    if (customBtn) customBtn.addEventListener('click', () => this._setupAddCustom());

    const yesterdayBtn = document.getElementById('goals-setup-yesterday');
    if (yesterdayBtn) yesterdayBtn.addEventListener('click', async () => {
      await this.applyYesterday();
      this._renderSetupList();
    });

    const templateBtn = document.getElementById('goals-setup-template');
    if (templateBtn) templateBtn.addEventListener('click', async () => {
      await this.applyTemplate();
      this._renderSetupList();
    });

    const saveTplBtn = document.getElementById('goals-setup-save-template');
    if (saveTplBtn) saveTplBtn.addEventListener('click', () => this.saveTemplate());

    const finishBtn = document.getElementById('goals-setup-finish');
    if (finishBtn) finishBtn.addEventListener('click', () => this._finishSetup());

    const closeBtn = document.getElementById('goals-setup-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      this.record.setupDone = true;
      this._persist();
      this.hideSetupModal();
    });

    const reviewSave = document.getElementById('goals-review-save');
    if (reviewSave) reviewSave.addEventListener('click', () => this.saveReview());

    const reviewClose = document.getElementById('goals-review-close');
    if (reviewClose) reviewClose.addEventListener('click', () => {
      this.storage.setSetting('goal_review_shown_' + this.today, true);
      this.hideReviewModal();
    });

    // Dashboard "edit goals" button
    const openSetup = document.getElementById('open-goals-setup-btn');
    if (openSetup) openSetup.addEventListener('click', () => this.showSetupModal());

    // Accountability mode toggle in settings
    const accToggle = document.getElementById('setting-accountability-toggle');
    if (accToggle) {
      accToggle.checked = this.storage.getSetting('goal_accountability', false);
      accToggle.addEventListener('change', () => {
        this.storage.setSetting('goal_accountability', accToggle.checked);
        if (window.WardApp) {
          window.WardApp.showToast(accToggle.checked
            ? 'تم تفعيل وضع الالتزام — تذكيرات أكثر تشددًا 🛡️'
            : 'تم إيقاف وضع الالتزام', 'info');
        }
      });
    }

    // Reminder frequency
    const freqInput = document.getElementById('setting-reminder-interval');
    if (freqInput) {
      freqInput.value = this.storage.getSetting('goal_reminder_interval', 45);
      freqInput.addEventListener('change', () => {
        const v = Math.max(5, Math.min(240, parseInt(freqInput.value) || 45));
        this.storage.setSetting('goal_reminder_interval', v);
        freqInput.value = v;
      });
    }
  }

  /** Triggered from dashboard button — opens setup modal any time. */
  maybeShowDailySetup() {
    this._maybeShowDailySetup();
  }

  _maybeShowDailySetup() {
    if (!this.record || this.record.setupDone) return;
    const dismissed = this.storage.getSetting('goal_setup_dismissed_' + this.today, false);
    if (dismissed) return;
    this.showSetupModal();
  }

  _escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.GoalsManager = GoalsManager;
