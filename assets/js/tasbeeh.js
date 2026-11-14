/**
 * TasbeehManager — Complete Digital Tasbeeh & Azkar Companion for Wardi Pro
 * Features:
 * - Large tactile tap counter with ring progress visualization
 * - Increment, Undo, and Reset with confirmation
 * - Web Audio API procedural chime & Haptic vibration feedback
 * - Daily target and session auto-saving
 * - Preset phrases + custom phrase & target support
 * - Keyboard support (Space / Enter to count)
 * - Authentic categorized Azkar (Morning, Evening, After Prayer, General, Istighfar, Salawat)
 * - One-tap transfer from any Azkar into the active Tasbeeh counter
 * - Session history and statistics integration
 */
class TasbeehManager {
  constructor(storage, history) {
    this.storage = storage;
    this.history = history;
    this.count = 0;
    this.previousCount = 0;
    this.target = parseInt(storage.getSetting('daily_goal', 33)) || 33;
    this.currentPhrase = 'سبحان الله';
    this.sessionStart = Date.now();
    this.soundEnabled = storage.getSetting('sound', 'true') === 'true';
    this.hapticEnabled = storage.getSetting('haptic', 'true') === 'true';
    this.audioCtx = null;
  }

  async init() {
    this.setupEventListeners();
    this.renderPhraseSelector();
    await this.loadStatsAndSessions();
    this.updateDisplay();
  }

  /* ------------------------------------------------------------------ */
  /*  Counter Operations                                                */
  /* ------------------------------------------------------------------ */
  increment() {
    this.previousCount = this.count;
    this.count++;

    this.playSound();
    this.vibrate();
    this.updateDisplay();

    // Micro-animation on tap button and ring
    const btn = document.getElementById('tasbeeh-increment-btn');
    if (btn) {
      btn.classList.add('tap-pressed');
      setTimeout(() => btn.classList.remove('tap-pressed'), 120);
    }

    // Target reached celebratory feedback
    if (this.count === this.target) {
      this.onTargetReached();
    }

    // Periodic auto-sync
    if (this.count % 10 === 0) {
      this.syncDailyStats();
    }
  }

  undo() {
    if (this.count > 0) {
      this.count = this.previousCount;
      this.updateDisplay();
      if (window.WardApp) {
        window.WardApp.showToast('تم التراجع عن التسبيحة الأخيرة', 'info');
      }
    }
  }

  async reset(skipConfirm = false) {
    if (this.count === 0) return;

    if (!skipConfirm) {
      const lang = window.WardApp?.currentLang || 'ar';
      const msg = lang === 'ar' ? 'هل تريد حفظ الجلسة وتصفير العداد؟' : 'Save session and reset counter?';
      if (!confirm(msg)) return;
    }

    // Save session before reset
    await this.saveSession();

    this.count = 0;
    this.previousCount = 0;
    this.sessionStart = Date.now();
    this.updateDisplay();
    await this.loadStatsAndSessions();
  }

  setPhrase(phrase, target = 33) {
    if (this.count > 0) {
      this.saveSession();
    }
    this.currentPhrase = phrase;
    this.target = target;
    this.count = 0;
    this.previousCount = 0;
    this.sessionStart = Date.now();
    this.updateDisplay();
  }

  /* ------------------------------------------------------------------ */
  /*  Persistence & History Logging                                     */
  /* ------------------------------------------------------------------ */
  async saveSession() {
    if (this.count === 0) return;

    const session = {
      phrase: this.currentPhrase,
      count: this.count,
      target: this.target,
      completed: this.count >= this.target,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      durationMs: Date.now() - this.sessionStart
    };

    try {
      await this.storage.addItem('tasbeeh_sessions', session);

      // Log in history
      if (this.history) {
        await this.history.logActivity('tasbeeh', {
          description: `${this.currentPhrase} (${this.count} مرة)`,
          count: this.count,
          phrase: this.currentPhrase
        });
      }

      await this.loadStatsAndSessions();
    } catch (err) {
      console.error('saveSession error:', err);
    }
  }

  async syncDailyStats() {
    if (this.history) {
      await this.history.updateDailyStats('tasbeehCount', 10);
    }
    const dailyEl = document.getElementById('tasbeeh-daily-count');
    if (dailyEl) {
      const cur = parseInt(dailyEl.textContent) || 0;
      dailyEl.textContent = cur + 10;
    }
  }

  async loadStatsAndSessions() {
    try {
      const sessions = await this.storage.getAllItems('tasbeeh_sessions');
      const today = new Date().toISOString().split('T')[0];

      const dailyTotal = sessions
        .filter(s => s.date === today)
        .reduce((acc, s) => acc + (s.count || 0), 0) + this.count;

      const lifetimeTotal = sessions
        .reduce((acc, s) => acc + (s.count || 0), 0) + this.count;

      const dailyEl = document.getElementById('tasbeeh-daily-count');
      const lifeEl = document.getElementById('tasbeeh-lifetime-count');
      if (dailyEl) dailyEl.textContent = dailyTotal;
      if (lifeEl) lifeEl.textContent = lifetimeTotal;

      // Update sessions list (last 10)
      const listEl = document.getElementById('tasbeeh-sessions-list');
      if (listEl) {
        if (!sessions || sessions.length === 0) {
          listEl.innerHTML = `<p class="empty-state">لا توجد جلسات مسجلة بعد</p>`;
          return;
        }

        const recent = sessions.slice(-8).reverse();
        listEl.innerHTML = recent.map(s => {
          const time = s.createdAt ? new Date(s.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '';
          return `
            <div class="session-item card" style="display:flex;justify-content:space-between;align-items:center;padding:12px;margin-bottom:8px;">
              <div>
                <strong>${s.phrase}</strong>
                <span style="font-size:12px;color:var(--text-muted);display:block;">${s.date} ${time}</span>
              </div>
              <span class="badge" style="background:var(--accent);color:var(--dark-text);padding:4px 10px;border-radius:12px;font-weight:bold;">
                ${s.count}
              </span>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('loadStatsAndSessions error:', err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Display Updates & Progress Ring                                    */
  /* ------------------------------------------------------------------ */
  updateDisplay() {
    const countEl = document.getElementById('tasbeeh-count-display');
    const phraseEl = document.getElementById('tasbeeh-phrase-display');
    const targetEl = document.getElementById('tasbeeh-target-display');
    const ringCircle = document.getElementById('tasbeeh-progress-circle');
    const ringContainer = document.getElementById('tasbeeh-progress-ring');

    if (countEl) countEl.textContent = this.count;
    if (phraseEl) phraseEl.textContent = this.currentPhrase;
    if (targetEl) targetEl.textContent = this.target;

    // Conic gradient ring progress
    const pct = this.target > 0 ? Math.min((this.count / this.target) * 100, 100) : 0;
    if (ringContainer) {
      ringContainer.setAttribute('aria-valuenow', this.count);
      ringContainer.setAttribute('aria-valuemax', this.target);
      ringContainer.style.background = `conic-gradient(var(--accent) ${pct * 3.6}deg, rgba(214, 180, 106, 0.15) ${pct * 3.6}deg)`;
    }
    if (ringCircle) {
      ringCircle.style.transform = `rotate(${pct * 3.6}deg)`;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Sound & Haptics                                                   */
  /* ------------------------------------------------------------------ */
  playSound() {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (this.audioCtx) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        // Elegant, peaceful bell-like ping (660Hz)
        osc.frequency.setValueAtTime(660, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.13);
      }
    } catch (e) {
      // Audio not supported or blocked
    }
  }

  vibrate() {
    if (!this.hapticEnabled) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(35);
      } catch (e) {}
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
  /*  Phrase Selector                                                   */
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
              data-phrase="${p.text}" 
              data-target="${p.target}"
              role="option"
              aria-selected="${idx === 0 ? 'true' : 'false'}">
        ${p.text}
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

    // Custom phrase inputs
    const customInput = document.getElementById('tasbeeh-custom-phrase-input');
    const targetInput = document.getElementById('tasbeeh-target-input');

    const handleCustom = () => {
      const phrase = (customInput?.value || '').trim();
      const target = parseInt(targetInput?.value) || 33;
      if (phrase) {
        container.querySelectorAll('.phrase-option').forEach(b => b.classList.remove('active'));
        this.setPhrase(phrase, target);
      }
    };

    if (customInput) customInput.addEventListener('change', handleCustom);
    if (targetInput) targetInput.addEventListener('change', handleCustom);
  }

  /* ------------------------------------------------------------------ */
  /*  Authentic Azkar Data Catalog                                      */
  /* ------------------------------------------------------------------ */
  getAzkarData() {
    return {
      morning: {
        name: 'أذكار الصباح',
        icon: '🌅',
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
        name: 'أذكار المساء',
        icon: '🌙',
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
        name: 'أذكار بعد الصلاة المفروضة',
        icon: '🕌',
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
        name: 'تسبيح عام',
        icon: '📿',
        items: [
          { text: 'سبحان الله وبحمده، سبحان الله العظيم.', count: 100, reference: 'متفق عليه' },
          { text: 'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر.', count: 100, reference: 'صحيح مسلم' },
          { text: 'لا حول ولا قوة إلا بالله العلي العظيم.', count: 100, reference: 'كنز من كنوز الجنة' },
          { text: 'حسبي الله ونعم الوكيل.', count: 100, reference: 'رواه البخاري' }
        ]
      },
      istighfar: {
        name: 'الاستغفار',
        icon: '🤲',
        items: [
          { text: 'أستغفر الله العظيم وأتوب إليه.', count: 100, reference: 'سنة نبوية' },
          { text: 'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك عليَّ وأبوء بذنبي، فاغفر لي فإنه لا يغفر الذنوب إلا أنت.', count: 1, reference: 'سيد الاستغفار — رواه البخاري' },
          { text: 'رب اغفر لي وتب علي إنك أنت التواب الرحيم.', count: 100, reference: 'رواه أبو داود والترمذي' }
        ]
      },
      salawat: {
        name: 'الصلاة على النبي ﷺ',
        icon: '🕋',
        items: [
          { text: 'اللهم صلِّ وسلِّم وبارك على نبينا محمد وعلى آله وصحبه أجمعين.', count: 100, reference: 'فضل الصلاة على النبي ﷺ' },
          { text: 'اللهم صلِّ على محمد وعلى آل محمد كما صليت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد، اللهم بارك على محمد وعلى آل محمد كما باركت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد.', count: 10, reference: 'الصلاة الإبراهيمية — متفق عليه' }
        ]
      }
    };
  }

  _escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------ */
  /*  Event Listeners                                                   */
  /* ------------------------------------------------------------------ */
  setupEventListeners() {
    // Tap button
    const incBtn = document.getElementById('tasbeeh-increment-btn');
    if (incBtn) {
      incBtn.addEventListener('click', () => this.increment());
    }

    // Progress ring tap also increments for convenience
    const ring = document.getElementById('tasbeeh-progress-ring');
    if (ring) {
      ring.addEventListener('click', () => this.increment());
    }

    // Undo button
    const undoBtn = document.getElementById('tasbeeh-undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }

    // Reset button
    const resetBtn = document.getElementById('tasbeeh-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.reset());
    }

    // Sound toggle in tasbeeh view
    const soundBtn = document.getElementById('tasbeeh-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        this.storage.setSetting('sound', this.soundEnabled ? 'true' : 'false');
        soundBtn.setAttribute('aria-pressed', this.soundEnabled ? 'true' : 'false');
        soundBtn.querySelector('span:first-child').textContent = this.soundEnabled ? '🔊' : '🔇';
        if (window.WardApp) {
          window.WardApp.showToast(this.soundEnabled ? 'تم تفعيل الصوت' : 'تم كتم الصوت');
        }
      });
    }

    // Keyboard support: Space bar or Enter to tap counter when Tasbeeh section is visible
    window.addEventListener('keydown', (e) => {
      const tasbeehSec = document.getElementById('tasbeeh-section');
      if (tasbeehSec && tasbeehSec.classList.contains('active')) {
        // Avoid triggering when user is typing into input or textarea
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.increment();
        }
      }
    });
  }
}

window.TasbeehManager = TasbeehManager;

