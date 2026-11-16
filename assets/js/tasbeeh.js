/**
 * TasbeehManager — Digital Tasbeeh & Azkar companion for Wardi Pro
 *
 * Counting integrity model (no double counting, ever):
 *  - EVERY real tap bumps daily_stats.tasbeehCount (+1) and the
 *    tasbeehByPhrase breakdown via HistoryManager's write-behind cache.
 *  - Undo subtracts from the same aggregates.
 *  - daily_stats is the single source of truth for daily & lifetime totals.
 *  - "Sessions" are display-only summaries (phrase, reps since last summary)
 *    and each summary writes exactly one history_log event.
 *  - Sessions are also silently persisted when the page is hidden, so
 *    an in-flight session is never lost on reload.
 */
class TasbeehManager {
  constructor(storage, history) {
    this.storage = storage;
    this.history = history;
    this.count = 0;
    this._undoStack = [];
    this.target = 33;
    this.currentPhrase = 'سبحان الله';
    this.sessionStart = Date.now();
    this._lastSummaryCount = 0; // reps already summarized into history
    this._lastSavedSession = null; // session persisted on pagehide
    this.soundEnabled = storage.getSetting('sound', 'true') === 'true';
    this.hapticEnabled = storage.getSetting('haptic', 'true') === 'true';
    this.audioCtx = null;
    this._activeAzkarItem = null; // {id, text, count, reference}
  }

  async init() {
    this.setupEventListeners();
    this.renderPhraseSelector();
    this.renderAzkarBrowser();
    await this.loadStatsAndSessions();
    this.updateDisplay();
    this._bindLifecycle();
  }

  /* ------------------------------------------------------------------ */
  /*  Canonical phrase keys (real dhikr-type breakdown)                  */
  /* ------------------------------------------------------------------ */
  phraseKey(phrase) {
    const p = (phrase || '').trim();
    if (/^سُبْحَان|^سبحان الله$|^سبحان الله\b/.test(p) && !p.includes('العظيم') && !p.includes('وبحمده')) return 'سبحان الله';
    if (p.includes('سبحان الله وبحمده')) return 'سبحان الله وبحمده';
    if (p.includes('سبحان الله العظيم')) return 'سبحان الله العظيم';
    if (/^الحمد|^الحمد لله\b/.test(p)) return 'الحمد لله';
    if (p.includes('الله أكبر') || p.includes('الله اکبر')) return 'الله أكبر';
    if (p.includes('أستغفر') || p.includes('استغفر')) return 'أستغفر الله';
    if (p.includes('صل') && (p.includes('على') || p.includes('محم'))) return 'الصلاة على النبي ﷺ';
    if (p.includes('لا إله إلا الله')) return 'لا إله إلا الله';
    if (p.includes('لا حول') || p.includes('لا حول ولا قوة')) return 'لا حول ولا قوة إلا بالله';
    return p.length > 24 ? 'أذكار مخصصة' : p;
  }

  /* ------------------------------------------------------------------ */
  /*  Counter operations (per-tap accurate persistence)                  */
  /* ------------------------------------------------------------------ */
  async increment() {
    const key = this.phraseKey(this.currentPhrase);
    const isAzkarItem = !!this._activeAzkarItem;

    this._undoStack.push(this.count);
    this.count++;

    // 1. Real repetition → daily aggregate (write-behind, race-free)
    if (this.history) {
      await this.history.bumpStats(this.storage.todayKey(), s => {
        s.tasbeehCount = (s.tasbeehCount || 0) + 1;
        if (!s.tasbeehByPhrase) s.tasbeehByPhrase = {};
        s.tasbeehByPhrase[key] = (s.tasbeehByPhrase[key] || 0) + 1;
      });
    }

    // 2. Feedback
    this.playSound();
    this.vibrate();
    this.updateDisplay();
    this._updateDailyBadge();

    const btn = document.getElementById('tasbeeh-increment-btn');
    if (btn) {
      btn.classList.add('tap-pressed');
      setTimeout(() => btn.classList.remove('tap-pressed'), 120);
    }

    // 3. Target reached
    if (this.count === this.target) {
      this.onTargetReached();
      // Azkar item completion → honest dhikr tracking
      if (isAzkarItem && this.history) {
        await this.history.markAzkarDone(this._activeAzkarItem.id);
        await this.history.logActivity('dhikr_completed', {
          description: `إتمام ذكر من ${this._activeAzkarItem.categoryName}`,
          azkarItem: this._activeAzkarItem.id,
          count: this._activeAzkarItem.count
        });
        if (window.WardApp) {
          window.WardApp.showToast('أتممت هذا الذكر 🌿 سُجّل في أذكار اليوم', 'success');
        }
        this.renderAzkarBrowser();
      }
    }
  }

  async undo() {
    if (this.count <= 0 || this._undoStack.length === 0) return;

    const previous = this._undoStack.pop();
    const delta = previous - this.count; // negative (undo)
    this.count = previous;

    // Correct the daily aggregates by the same negative amount
    if (this.history && delta < 0) {
      const key = this.phraseKey(this.currentPhrase);
      await this.history.bumpStats(this.storage.todayKey(), s => {
        s.tasbeehCount = Math.max(0, (s.tasbeehCount || 0) + delta);
        if (!s.tasbeehByPhrase) s.tasbeehByPhrase = {};
        s.tasbeehByPhrase[key] = Math.max(0, (s.tasbeehByPhrase[key] || 0) + delta);
      });
    }

    this.updateDisplay();
    this._updateDailyBadge();
    if (window.WardApp) {
      window.WardApp.showToast('تم التراجع عن التسبيحة الأخيرة', 'info');
    }
  }

  async reset(skipConfirm = false) {
    if (this.count === 0) return;

    if (!skipConfirm) {
      const lang = window.WardApp?.currentLang || 'ar';
      const msg = lang === 'ar'
        ? 'هل تريد حفظ الجلسة وتصفير العداد؟ (التسبيحات المحسوبة تبقى في إحصاءات اليوم)'
        : 'Save session summary and reset the counter?';
      if (!confirm(msg)) return;
    }

    await this._summarizeSession(true);
    this.count = 0;
    this._undoStack = [];
    this._lastSummaryCount = 0;
    this._activeAzkarItem = null;
    this.sessionStart = Date.now();
    this.updateDisplay();
    await this.loadStatsAndSessions();
  }

  async setPhrase(phrase, target = 33, azkarItem = null) {
    if (this.count > 0) {
      await this._summarizeSession(true);
    }
    this.currentPhrase = phrase;
    this.target = Math.max(1, parseInt(target) || 33);
    this.count = 0;
    this._undoStack = [];
    this._lastSummaryCount = 0;
    this._activeAzkarItem = azkarItem;
    this.sessionStart = Date.now();
    this.updateDisplay();
  }

  /**
   * Write one session summary + one history event for the reps since the
   * last summary. Only the delta is recorded — never double counts.
   */
  async _summarizeSession(manual = false) {
    const delta = this.count - this._lastSummaryCount;
    if (delta <= 0) return;
    this._lastSummaryCount = this.count;

    const session = {
      phrase: this.currentPhrase,
      count: delta,
      totalThisSession: this.count,
      target: this.target,
      completed: this.count >= this.target,
      date: this.storage.todayKey(),
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - this.sessionStart,
      manual
    };

    try {
      await this.storage.addItem('tasbeeh_sessions', session);
      if (this.history) {
        await this.history.logActivity('tasbeeh_count', {
          description: `${this.currentPhrase} — ${delta} مرة`,
          phrase: this.currentPhrase,
          phraseKey: this.phraseKey(this.currentPhrase),
          count: delta,
          target: this.target
        });
      }
      this._lastSavedSession = session;
    } catch (err) {
      console.error('summarizeSession error:', err);
    }
  }

  /** Persist in-flight session when the page is hidden or closed. */
  _bindLifecycle() {
    const onHide = () => {
      try {
        if (this.count > 0 && this.count > this._lastSummaryCount) {
          // Fire and forget — page is going away
          this._summarizeSession(false);
        }
      } catch (e) {}
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
  }

  /* ------------------------------------------------------------------ */
  /*  Stats & sessions display                                           */
  /* ------------------------------------------------------------------ */
  async loadStatsAndSessions() {
    try {
      const today = this.storage.todayKey();
      const todayStats = await this.history.getDailyStats(today);

      // Daily total — single source of truth (accurate per-tap counts)
      const dailyEl = document.getElementById('tasbeeh-daily-count');
      if (dailyEl) dailyEl.textContent = (todayStats.tasbeehCount || 0).toLocaleString('ar-EG');

      // Lifetime total from all daily_stats records (not from sessions)
      const allStats = await this.storage.getAllItems('daily_stats');
      const lifetimeTotal = allStats.reduce((a, d) => a + (d.tasbeehCount || 0), 0);
      const lifeEl = document.getElementById('tasbeeh-lifetime-count');
      if (lifeEl) lifeEl.textContent = lifetimeTotal.toLocaleString('ar-EG');

      // Sessions list (summaries, newest first)
      const sessions = await this.storage.getAllItems('tasbeeh_sessions');
      const listEl = document.getElementById('tasbeeh-sessions-list');
      if (listEl) {
        if (!sessions || sessions.length === 0) {
          listEl.innerHTML = `<p class="empty-state">لا توجد جلسات مسجلة بعد</p>`;
        } else {
          const recent = sessions.slice(-8).reverse();
          listEl.innerHTML = recent.map(s => {
            const time = s.createdAt ? new Date(s.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '';
            return `
              <div class="session-item card" style="display:flex;justify-content:space-between;align-items:center;padding:12px;margin-bottom:8px;">
                <div>
                  <strong>${this._escapeHTML(s.phrase)}</strong>
                  <span style="font-size:12px;color:var(--text-muted);display:block;">${s.date} ${time}</span>
                </div>
                <span class="badge" style="background:var(--accent);color:var(--text-on-gold);padding:4px 10px;border-radius:12px;font-weight:bold;">
                  ${s.count}
                </span>
              </div>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error('loadStatsAndSessions error:', err);
    }
  }

  /** Refresh dashboard immediately after taps (throttled). */
  _updateDailyBadge() {
    if (this._dashTimer) return;
    this._dashTimer = setTimeout(async () => {
      this._dashTimer = null;
      try {
        const stats = await this.history.getDailyStats(this.storage.todayKey());
        const el = document.getElementById('dashboard-tasbeeh-today');
        const fill = document.getElementById('dashboard-tasbeeh-fill');
        const goal = parseInt(this.storage.getSetting('daily_goal', 100)) || 100;
        if (el) el.textContent = stats.tasbeehCount || 0;
        if (fill) fill.style.width = `${Math.min(((stats.tasbeehCount || 0) / goal) * 100, 100)}%`;
      } catch (e) {}
    }, 1500);
  }

  /* ------------------------------------------------------------------ */
  /*  Display & progress ring                                            */
  /* ------------------------------------------------------------------ */
  updateDisplay() {
    const countEl = document.getElementById('tasbeeh-count-display');
    const phraseEl = document.getElementById('tasbeeh-phrase-display');
    const targetEl = document.getElementById('tasbeeh-target-display');
    const ringContainer = document.getElementById('tasbeeh-progress-ring');

    if (countEl) countEl.textContent = this.count;
    if (phraseEl) phraseEl.textContent = this.currentPhrase;
    if (targetEl) targetEl.textContent = this.target;

    const pct = this.target > 0 ? Math.min((this.count / this.target) * 100, 100) : 0;
    if (ringContainer) {
      ringContainer.setAttribute('aria-valuenow', this.count);
      ringContainer.setAttribute('aria-valuemax', this.target);
      ringContainer.style.background = `conic-gradient(var(--accent) ${pct * 3.6}deg, rgba(214, 180, 106, 0.15) ${pct * 3.6}deg)`;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Sound & haptics                                                    */
  /* ------------------------------------------------------------------ */
  playSound() {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (this.audioCtx) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.13);
      }
    } catch (e) { /* audio blocked */ }
  }

  vibrate() {
    if (!this.hapticEnabled) return;
    if ('vibrate' in navigator) {
      try { navigator.vibrate(35); } catch (e) {}
    }
  }

  onTargetReached() {
    if (window.WardApp) {
      const lang = window.WardApp.currentLang;
      window.WardApp.showToast(
        lang === 'ar' ? `ما شاء الله! اكتمل الهدف (${this.target}) 🎉` : `MashaAllah! Target completed (${this.target}) 🎉`
      );
    }
    if ('vibrate' in navigator && this.hapticEnabled) {
      navigator.vibrate([60, 40, 60]);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Phrase selector                                                    */
  /* ------------------------------------------------------------------ */
  renderPhraseSelector() {
    const container = document.getElementById('tasbeeh-phrase-select');
    if (!container) return;

    const presets = [
      { text: 'سبحان الله', target: 33 },
      { text: 'الحمد لله', target: 33 },
      { text: 'الله أكبر', target: 34 },
      { text: 'لا إله إلا الله', target: 100 },
      { text: 'أستغفر الله', target: 100 },
      { text: 'سبحان الله وبحمده', target: 100 },
      { text: 'سبحان الله العظيم', target: 100 },
      { text: 'لا حول ولا قوة إلا بالله', target: 100 },
      { text: 'اللهم صلِّ وسلِّم على نبينا محمد', target: 100 },
      { text: 'حسبي الله ونعم الوكيل', target: 100 },
      { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', target: 100 }
    ];

    container.innerHTML = presets.map((p, idx) => `
      <button class="phrase-option ${idx === 0 ? 'active' : ''}"
              data-phrase="${this._escapeAttr(p.text)}"
              data-target="${p.target}"
              role="option"
              aria-selected="${idx === 0 ? 'true' : 'false'}">
        ${this._escapeHTML(p.text)}
      </button>
    `).join('');

    container.querySelectorAll('.phrase-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.phrase-option').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        this.setPhrase(btn.dataset.phrase, parseInt(btn.dataset.target) || 33);
      });
    });

    const customInput = document.getElementById('tasbeeh-custom-phrase-input');
    const targetInput = document.getElementById('tasbeeh-target-input');

    const handleCustom = () => {
      const phrase = (customInput?.value || '').trim();
      const target = parseInt(targetInput?.value) || 33;
      if (phrase) {
        container.querySelectorAll('.phrase-option').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        this.setPhrase(phrase, target);
      }
    };

    if (customInput) customInput.addEventListener('change', handleCustom);
    if (targetInput) targetInput.addEventListener('change', handleCustom);
  }

  /* ------------------------------------------------------------------ */
  /*  Azkar browser (authentic catalog, honest per-item tracking)         */
  /* ------------------------------------------------------------------ */
  getAzkarData() {
    return {
      morning: {
        name: 'أذكار الصباح', icon: '🌅',
        items: [
          { text: 'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. ربِّ أسألك خير ما في هذا اليوم وخير ما بعده، وأعوذ بك من شر ما في هذا اليوم وشر ما بعده.', count: 1, reference: 'رواه مسلم' },
          { text: 'اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور.', count: 1, reference: 'رواه الترمذي وأبو داود' },
          { text: 'اللهم إني أصبحت أشهدك، وأشهد حملة عرشك، وملائكتك، وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمدًا عبدك ورسولك.', count: 4, reference: 'رواه أبو داود' },
          { text: 'اللهم ما أصبح بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.', count: 1, reference: 'رواه أبو داود' },
          { text: 'اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت.', count: 3, reference: 'رواه أبو داود' },
          { text: 'اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر، لا إله إلا أنت.', count: 3, reference: 'رواه أبو داود' },
          { text: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.', count: 7, reference: 'رواه أبو داود' },
          { text: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.', count: 3, reference: 'رواه أبو داود والترمذي' },
          { text: 'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.', count: 3, reference: 'رواه أحمد والترمذي' },
          { text: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.', count: 1, reference: 'رواه الحاكم والترمذي' },
          { text: 'سبحان الله وبحمده.', count: 100, reference: 'صحيح مسلم' },
          { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.', count: 100, reference: 'متفق عليه' },
          { text: 'أستغفر الله وأتوب إليه.', count: 100, reference: 'متفق عليه' }
        ]
      },
      evening: {
        name: 'أذكار المساء', icon: '🌙',
        items: [
          { text: 'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. ربِّ أسألك خير ما في هذه الليلة وخير ما بعدها، وأعوذ بك من شر ما في هذه الليلة وشر ما بعدها.', count: 1, reference: 'رواه مسلم' },
          { text: 'اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.', count: 1, reference: 'رواه الترمذي' },
          { text: 'اللهم ما أمسى بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.', count: 1, reference: 'رواه أبو داود' },
          { text: 'اللهم إني أمسيت أشهدك، وأشهد حملة عرشك، وملائكتك، وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمدًا عبدك ورسولك.', count: 4, reference: 'رواه أبو داود' },
          { text: 'أعوذ بكلمات الله التامات من شر ما خلق.', count: 3, reference: 'رواه مسلم' },
          { text: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.', count: 3, reference: 'رواه أبو داود والترمذي' },
          { text: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.', count: 7, reference: 'رواه أبو داود' },
          { text: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.', count: 1, reference: 'رواه الحاكم' },
          { text: 'سبحان الله وبحمده.', count: 100, reference: 'صحيح مسلم' }
        ]
      },
      afterPrayer: {
        name: 'أذكار بعد الصلاة', icon: '🕌',
        items: [
          { text: 'أستغفر الله، أستغفر الله، أستغفر الله.', count: 3, reference: 'رواه مسلم' },
          { text: 'اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام.', count: 1, reference: 'رواه مسلم' },
          { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. اللهم لا مانع لما أعطيت، ولا معطي لما منعت، ولا ينفع ذا الجد منك الجد.', count: 1, reference: 'متفق عليه' },
          { text: 'سبحان الله.', count: 33, reference: 'صحيح مسلم' },
          { text: 'الحمد لله.', count: 33, reference: 'صحيح مسلم' },
          { text: 'الله أكبر.', count: 33, reference: 'صحيح مسلم' },
          { text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.', count: 1, reference: 'صحيح مسلم — تمام المائة' }
        ]
      },
      general: {
        name: 'تسبيح عام', icon: '📿',
        items: [
          { text: 'سبحان الله وبحمده، سبحان الله العظيم.', count: 100, reference: 'متفق عليه' },
          { text: 'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر.', count: 100, reference: 'صحيح مسلم' },
          { text: 'لا حول ولا قوة إلا بالله العلي العظيم.', count: 100, reference: 'كنز من كنوز الجنة' },
          { text: 'حسبي الله ونعم الوكيل.', count: 100, reference: 'رواه البخاري' }
        ]
      },
      istighfar: {
        name: 'الاستغفار', icon: '🤲',
        items: [
          { text: 'أستغفر الله العظيم وأتوب إليه.', count: 100, reference: 'سنة نبوية' },
          { text: 'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك عليَّ وأبوء بذنبي، فاغفر لي فإنه لا يغفر الذنوب إلا أنت.', count: 1, reference: 'سيد الاستغفار — رواه البخاري' },
          { text: 'رب اغفر لي وتب علي إنك أنت التواب الرحيم.', count: 100, reference: 'رواه أبو داود والترمذي' }
        ]
      },
      salawat: {
        name: 'الصلاة على النبي ﷺ', icon: '🕋',
        items: [
          { text: 'اللهم صلِّ وسلِّم وبارك على نبينا محمد وعلى آله وصحبه أجمعين.', count: 100, reference: 'فضل الصلاة على النبي ﷺ' },
          { text: 'اللهم صلِّ على محمد وعلى آل محمد كما صليت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد، اللهم بارك على محمد وعلى آل محمد كما باركت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد.', count: 10, reference: 'الصلاة الإبراهيمية — متفق عليه' }
        ]
      }
    };
  }

  async renderAzkarBrowser() {
    const container = document.getElementById('azkar-browser');
    if (!container) return;

    // Which azkar items are already done today?
    let doneMap = {};
    try {
      const stats = await this.history.getDailyStats(this.storage.todayKey());
      doneMap = stats.azkarDone || {};
    } catch (e) {}

    if (!this._azkarCategory) this._azkarCategory = 'morning';
    const catKey = this._azkarCategory;
    const data = this.getAzkarData();
    const cat = data[catKey];

    const tabs = Object.entries(data).map(([key, c]) => `
      <button class="filter-pill ${key === catKey ? 'active' : ''}" data-azkar-cat="${key}">
        ${c.icon} ${c.name}
      </button>
    `).join('');

    const items = cat.items.map((item, idx) => {
      const id = `${catKey}:${idx}`;
      const done = !!doneMap[id];
      return `
        <div class="azkar-item card ${done ? 'azkar-done' : ''}" data-azkar-id="${id}" data-count="${item.count}">
          <div class="azkar-item-head">
            <span class="azkar-count-badge">${done ? '✓' : '×' + item.count}</span>
            <span class="azkar-ref">${this._escapeHTML(item.reference)}</span>
          </div>
          <p class="azkar-text">${this._escapeHTML(item.text)}</p>
          <button class="btn btn-sm ${done ? 'btn-secondary' : 'btn-primary'} azkar-count-btn" data-azkar-id="${id}">
            ${done ? 'عدّ مرة أخرى 🔁' : 'ابدأ العد 📿'}
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="azkar-tabs category-filter" style="margin-bottom:10px;">${tabs}</div>
      <div class="azkar-items-list">${items}</div>
    `;

    // Tab switching
    container.querySelectorAll('[data-azkar-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._azkarCategory = btn.dataset.azkarCat;
        this.renderAzkarBrowser();
      });
    });

    // Item → load into counter with its authentic target
    container.querySelectorAll('.azkar-count-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.azkarId;
        const [cKey, idxStr] = id.split(':');
        const item = data[cKey].items[parseInt(idxStr)];
        await this.setPhrase(item.text, item.count, {
          id, text: item.text, count: item.count, reference: item.reference,
          categoryName: data[cKey].name
        });
        // Highlight active
        container.querySelectorAll('.azkar-item').forEach(el => el.classList.remove('azkar-active'));
        const cardEl = container.querySelector(`.azkar-item[data-azkar-id="${id}"]`);
        if (cardEl) cardEl.classList.add('azkar-active');
        if (window.WardApp) {
          window.WardApp.showToast(`جاهز: عدّ ${item.count} مرة عبر السبحة`, 'info');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Event listeners                                                    */
  /* ------------------------------------------------------------------ */
  setupEventListeners() {
    const incBtn = document.getElementById('tasbeeh-increment-btn');
    if (incBtn) incBtn.addEventListener('click', () => this.increment());

    const ring = document.getElementById('tasbeeh-progress-ring');
    if (ring) ring.addEventListener('click', () => this.increment());

    const undoBtn = document.getElementById('tasbeeh-undo-btn');
    if (undoBtn) undoBtn.addEventListener('click', () => this.undo());

    const resetBtn = document.getElementById('tasbeeh-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());

    const soundBtn = document.getElementById('tasbeeh-sound-toggle');
    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', this.soundEnabled ? 'true' : 'false');
      soundBtn.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        this.storage.setSetting('sound', this.soundEnabled ? 'true' : 'false');
        soundBtn.setAttribute('aria-pressed', this.soundEnabled ? 'true' : 'false');
        const span = soundBtn.querySelector('span:last-child');
        if (span) span.textContent = this.soundEnabled ? '🔊' : '🔇';
        if (window.WardApp) {
          window.WardApp.showToast(this.soundEnabled ? 'تم تفعيل الصوت' : 'تم كتم الصوت');
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      const tasbeehSec = document.getElementById('tasbeeh-section');
      if (tasbeehSec && tasbeehSec.classList.contains('active')) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.increment();
        }
      }
    });
  }

  _escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

window.TasbeehManager = TasbeehManager;
