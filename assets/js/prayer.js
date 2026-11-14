/**
 * PrayerManager — Comprehensive Islamic Prayer & Qibla Companion for Wardi Pro
 * Features:
 * - 100% offline-capable astronomical prayer times calculation engine
 * - 5 daily prayers (الفجر، الظهر، العصر، المغرب، العشاء) + الشروق
 * - Status for each prayer: passed, current, upcoming with active highlight
 * - Real-time live countdown timer to the next prayer
 * - Manual city selection + User-consented Geolocation with graceful fallback
 * - Multiple calculation methods (Egyptian General Survey default, MWL, Makkah, ISNA, Karachi)
 * - Daily prayer tracking (صليت / لم أصلِّ) persisted in IndexedDB 'prayer_records'
 * - Daily completion percentage and weekly tracking overview
 * - Prayer reminder toggles with Browser Notifications API
 * - Interactive Qibla Compass with spherical trigonometry & device orientation sensor
 */
class PrayerManager {
  constructor(storage, history) {
    this.storage = storage;
    this.history = history;

    // Supported Calculation Methods
    this.METHODS = {
      egypt: {
        id: 'egypt',
        name: 'الهيئة المصرية العامة للمساحة',
        fajrAngle: 19.5,
        ishaAngle: 17.5
      },
      mwl: {
        id: 'mwl',
        name: 'رابطة العالم الإسلامي',
        fajrAngle: 18.0,
        ishaAngle: 17.0
      },
      makkah: {
        id: 'makkah',
        name: 'جامعة أم القرى (مكة المكرمة)',
        fajrAngle: 18.5,
        ishaInterval: 90 // 90 mins after Maghrib
      },
      karachi: {
        id: 'karachi',
        name: 'جامعة العلوم الإسلامية بكراتشي',
        fajrAngle: 18.0,
        ishaAngle: 18.0
      },
      isna: {
        id: 'isna',
        name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)',
        fajrAngle: 15.0,
        ishaAngle: 15.0
      }
    };

    // Pre-stored popular cities for instant manual selection
    this.CITIES = [
      { name: 'القاهرة، مصر', lat: 30.0444, lng: 31.2357, tz: 2, method: 'egypt' },
      { name: 'الإسكندرية، مصر', lat: 31.2001, lng: 29.9187, tz: 2, method: 'egypt' },
      { name: 'الجيزة، مصر', lat: 30.0131, lng: 31.2089, tz: 2, method: 'egypt' },
      { name: 'المنصورة، مصر', lat: 31.0409, lng: 31.3785, tz: 2, method: 'egypt' },
      { name: 'طنطا، مصر', lat: 30.7865, lng: 31.0004, tz: 2, method: 'egypt' },
      { name: 'أسوان، مصر', lat: 24.0889, lng: 32.8998, tz: 2, method: 'egypt' },
      { name: 'الأقصر، مصر', lat: 25.6872, lng: 32.6396, tz: 2, method: 'egypt' },
      { name: 'بورسعيد، مصر', lat: 31.2653, lng: 32.3019, tz: 2, method: 'egypt' },
      { name: 'السويس، مصر', lat: 29.9668, lng: 32.5498, tz: 2, method: 'egypt' },
      { name: 'مكة المكرمة، السعودية', lat: 21.4225, lng: 39.8262, tz: 3, method: 'makkah' },
      { name: 'المدينة المنورة، السعودية', lat: 24.5247, lng: 39.5692, tz: 3, method: 'makkah' },
      { name: 'الرياض، السعودية', lat: 24.7136, lng: 46.6753, tz: 3, method: 'makkah' },
      { name: 'جدة، السعودية', lat: 21.5433, lng: 39.1728, tz: 3, method: 'makkah' },
      { name: 'دبي، الإمارات', lat: 25.2048, lng: 55.2708, tz: 4, method: 'mwl' },
      { name: 'أبوظبي، الإمارات', lat: 24.4539, lng: 54.3773, tz: 4, method: 'mwl' },
      { name: 'القدس الشريف، فلسطين', lat: 31.7683, lng: 35.2137, tz: 2, method: 'mwl' },
      { name: 'عَمّان، الأردن', lat: 31.9454, lng: 35.9284, tz: 3, method: 'mwl' },
      { name: 'دمشق، سوريا', lat: 33.5138, lng: 36.2765, tz: 3, method: 'mwl' },
      { name: 'بيروت، لبنان', lat: 33.8938, lng: 35.5018, tz: 2, method: 'mwl' },
      { name: 'بغداد، العراق', lat: 33.3152, lng: 44.3661, tz: 3, method: 'mwl' },
      { name: 'الكويت، الكويت', lat: 29.3759, lng: 47.9774, tz: 3, method: 'makkah' },
      { name: 'الدوحة، قطر', lat: 25.2854, lng: 51.5310, tz: 3, method: 'makkah' },
      { name: 'المنامة، البحرين', lat: 26.2285, lng: 50.5860, tz: 3, method: 'makkah' },
      { name: 'مسقط، عُمان', lat: 23.5880, lng: 58.3829, tz: 4, method: 'mwl' },
      { name: 'تونس، تونس', lat: 36.8065, lng: 10.1815, tz: 1, method: 'mwl' },
      { name: 'الجزائر، الجزائر', lat: 36.7538, lng: 3.0588, tz: 1, method: 'mwl' },
      { name: 'الرباط، المغرب', lat: 34.0209, lng: -6.8416, tz: 1, method: 'mwl' },
      { name: 'طرابلس، ليبيا', lat: 32.8872, lng: 13.1913, tz: 2, method: 'mwl' },
      { name: 'الخرطوم، السودان', lat: 15.5007, lng: 32.5599, tz: 2, method: 'egypt' },
      { name: 'إسطنبول، تركيا', lat: 41.0082, lng: 28.9784, tz: 3, method: 'mwl' },
      { name: 'لندن، المملكة المتحدة', lat: 51.5074, lng: -0.1278, tz: 0, method: 'mwl' },
      { name: 'نيويورك، أمريكا', lat: 40.7128, lng: -74.0060, tz: -5, method: 'isna' }
    ];

    // Current State
    this.currentLocation = this.storage.getSetting('prayer_location', {
      name: 'القاهرة، مصر',
      lat: 30.0444,
      lng: 31.2357,
      tz: 2,
      isAuto: false
    });

    this.selectedMethod = this.storage.getSetting('prayer_method', 'egypt');
    this.asrJuristic = this.storage.getSetting('prayer_asr_juristic', 1); // 1 = Standard/Shafi'i, 2 = Hanafi
    this.reminders = this.storage.getSetting('prayer_reminders', {
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false
    });

    this.currentTimings = null;
    this.nextPrayer = null;
    this.countdownTimer = null;
    this.todayRecord = null;
  }

  async init() {
    this.calculateTimings();
    await this.loadTodayPrayerRecord();
    this.setupEventListeners();
    this.renderPrayerTimes();
    this.renderTracker();
    this.startCountdownTimer();
    this.setupQiblaCompass();
    await this.renderWeeklySummary();
  }

  /* ------------------------------------------------------------------ */
  /*  Astronomical Prayer Times Engine                                  */
  /* ------------------------------------------------------------------ */
  calculateTimings(dateObj = new Date()) {
    const lat = this.currentLocation.lat;
    const lng = this.currentLocation.lng;
    const method = this.METHODS[this.selectedMethod] || this.METHODS.egypt;

    const Y = dateObj.getFullYear();
    const M = dateObj.getMonth() + 1;
    const D = dateObj.getDate();

    // Determine current timezone offset in hours
    const tzOffset = -dateObj.getTimezoneOffset() / 60;
    const tz = this.currentLocation.isAuto ? tzOffset : (this.currentLocation.tz ?? tzOffset);

    // Julian Date calculation
    const jd = 367 * Y - Math.floor(7 * (Y + Math.floor((M + 9) / 12)) / 4) +
               Math.floor(275 * M / 9) + D - 730531.5 + 2451545.0;

    // Sun coordinates
    const D_sun = jd - 2451545.0;
    const g = (357.529 + 0.98560028 * D_sun) % 360;
    const q = (280.459 + 0.98564736 * D_sun) % 360;
    const L = (q + 1.915 * Math.sin(this._rad(g)) + 0.020 * Math.sin(this._rad(2 * g))) % 360;
    const e = 23.439 - 0.00000036 * D_sun;

    const RA = (this._deg(Math.atan2(Math.cos(this._rad(e)) * Math.sin(this._rad(L)), Math.cos(this._rad(L)))) / 15 + 24) % 24;
    const dec = this._deg(Math.asin(Math.sin(this._rad(e)) * Math.sin(this._rad(L))));
    let eqt = (q / 15) - RA;
    if (eqt > 12) eqt -= 24;
    if (eqt < -12) eqt += 24;

    // Midday (Dhuhr)
    const midday = 12 + tz - (lng / 15) - eqt;

    // Hour angle helper for sun altitude
    const hourAngle = (angle) => {
      const radLat = this._rad(lat);
      const radDec = this._rad(dec);
      const cosVal = (Math.sin(this._rad(angle)) - Math.sin(radLat) * Math.sin(radDec)) /
                     (Math.cos(radLat) * Math.cos(radDec));
      if (cosVal > 1 || cosVal < -1) return null;
      return this._deg(Math.acos(cosVal)) / 15;
    };

    // 1. Fajr
    const fajrH = hourAngle(-method.fajrAngle);
    const fajrTime = fajrH ? midday - fajrH : midday - 1.5;

    // 2. Sunrise
    const sunriseH = hourAngle(-0.8333);
    const sunriseTime = sunriseH ? midday - sunriseH : midday - 1.0;

    // 3. Dhuhr (solar noon)
    const dhuhrTime = midday;

    // 4. Asr (shadow factor)
    const shadowFactor = this.asrJuristic === 2 ? 2.0 : 1.0;
    const asrAltitude = this._deg(Math.atan(1.0 / (shadowFactor + Math.tan(this._rad(Math.abs(lat - dec))))));
    const asrH = hourAngle(asrAltitude);
    const asrTime = asrH ? midday + asrH : midday + 3.0;

    // 5. Sunset & Maghrib
    const sunsetTime = sunriseH ? midday + sunriseH : midday + 5.5;
    const maghribTime = sunsetTime;

    // 6. Isha
    let ishaTime;
    if (method.ishaInterval) {
      ishaTime = maghribTime + (method.ishaInterval / 60);
    } else {
      const ishaH = hourAngle(-method.ishaAngle);
      ishaTime = ishaH ? midday + ishaH : midday + 6.8;
    }

    const fmt = (t) => {
      let h = Math.floor(t);
      let m = Math.round((t - h) * 60);
      if (m === 60) { h += 1; m = 0; }
      h = (h + 24) % 24;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    this.currentTimings = {
      fajr: fmt(fajrTime),
      sunrise: fmt(sunriseTime),
      dhuhr: fmt(dhuhrTime),
      asr: fmt(asrTime),
      maghrib: fmt(maghribTime),
      isha: fmt(ishaTime),
      date: dateObj.toISOString().split('T')[0]
    };

    // Cache in localStorage for instant offline boots
    this.storage.setSetting('cached_prayer_times', this.currentTimings);
    return this.currentTimings;
  }

  _rad(d) { return (d * Math.PI) / 180.0; }
  _deg(r) { return (r * 180.0) / Math.PI; }

  /* ------------------------------------------------------------------ */
  /*  Next Prayer Determination & Status                                */
  /* ------------------------------------------------------------------ */
  getPrayerStatusList() {
    if (!this.currentTimings) this.calculateTimings();

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { id: 'fajr', name: 'الفجر', icon: '🌅', time: this.currentTimings.fajr, isMain: true },
      { id: 'sunrise', name: 'الشروق', icon: '☀️', time: this.currentTimings.sunrise, isMain: false },
      { id: 'dhuhr', name: 'الظهر', icon: '☀️', time: this.currentTimings.dhuhr, isMain: true },
      { id: 'asr', name: 'العصر', icon: '🌤️', time: this.currentTimings.asr, isMain: true },
      { id: 'maghrib', name: 'المغرب', icon: '🌇', time: this.currentTimings.maghrib, isMain: true },
      { id: 'isha', name: 'العشاء', icon: '🌙', time: this.currentTimings.isha, isMain: true }
    ];

    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    let nextFound = false;
    let nextPrayerObj = null;

    const list = prayers.map((p, index) => {
      const pMins = toMinutes(p.time);
      let status = 'upcoming';

      if (currentMinutes >= pMins) {
        status = 'passed';
      }

      // Check if this is the upcoming next prayer
      if (currentMinutes < pMins && !nextFound) {
        status = 'next';
        nextFound = true;
        nextPrayerObj = p;
      }

      return { ...p, status, minutes: pMins };
    });

    // If all prayers today have passed, next is tomorrow's Fajr
    if (!nextFound) {
      nextPrayerObj = { ...prayers[0], isTomorrow: true };
      if (list[0]) list[0].status = 'next-tomorrow';
    }

    this.nextPrayer = nextPrayerObj;
    return list;
  }

  /* ------------------------------------------------------------------ */
  /*  Render Prayer Section                                             */
  /* ------------------------------------------------------------------ */
  renderPrayerTimes() {
    const container = document.getElementById('prayer-times-list');
    const heroCard = document.getElementById('prayer-hero-card');
    const locationDisplay = document.getElementById('prayer-current-location');
    const dateDisplay = document.getElementById('prayer-hijri-date');

    if (locationDisplay) {
      locationDisplay.textContent = this.currentLocation.name || 'القاهرة، مصر';
    }

    if (dateDisplay) {
      dateDisplay.textContent = this.getFormattedHijriDate();
    }

    const prayerList = this.getPrayerStatusList();

    // 1. Next Prayer Hero Card
    if (heroCard && this.nextPrayer) {
      const statusLabel = this.nextPrayer.isTomorrow ? 'صلاة الفجر غداً' : `صلاة ${this.nextPrayer.name}`;
      const timeFormatted = this.format12Hour(this.nextPrayer.time);

      heroCard.innerHTML = `
        <div class="prayer-hero-badge">الصلاة القادمة</div>
        <div class="prayer-hero-main">
          <div class="prayer-hero-info">
            <h2 class="prayer-hero-name">${this.nextPrayer.name}</h2>
            <span class="prayer-hero-time">${timeFormatted}</span>
          </div>
          <div class="prayer-countdown-box">
            <span class="countdown-label">متبقي على الأذان</span>
            <div id="prayer-countdown-timer" class="countdown-digits">--:--:--</div>
          </div>
        </div>
      `;
    }

    // 2. Daily Prayers Schedule List
    if (container) {
      container.innerHTML = prayerList.map(p => {
        const isPassed = p.status === 'passed';
        const isNext = p.status === 'next';
        const time12 = this.format12Hour(p.time);
        const reminderActive = !!this.reminders[p.id];

        let statusText = 'قادمة';
        let statusClass = 'badge-upcoming';
        if (isPassed) {
          statusText = 'مضت';
          statusClass = 'badge-passed';
        } else if (isNext) {
          statusText = 'التالية';
          statusClass = 'badge-next';
        }

        return `
          <div class="prayer-time-row card ${isNext ? 'active-next-prayer' : ''}" data-prayer="${p.id}">
            <div class="prayer-row-left">
              <span class="prayer-icon-bubble">${p.icon}</span>
              <div class="prayer-name-group">
                <strong class="prayer-name">${p.name}</strong>
                <span class="prayer-status-badge ${statusClass}">${statusText}</span>
              </div>
            </div>
            <div class="prayer-row-right">
              <span class="prayer-time-val">${time12}</span>
              ${p.isMain ? `
                <button class="btn-icon prayer-notify-btn ${reminderActive ? 'active' : ''}" 
                        data-prayer="${p.id}" 
                        title="${reminderActive ? 'إلغاء التنبيه' : 'تفعيل التنبيه'}">
                  ${reminderActive ? '🔔' : '🔕'}
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');

      // Wire reminder buttons
      container.querySelectorAll('.prayer-notify-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pid = btn.dataset.prayer;
          this.toggleReminder(pid);
        });
      });
    }

    this.updateCountdownDisplay();
  }

  format12Hour(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'م' : 'ص';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  }

  getFormattedHijriDate() {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(now);
    } catch {
      return 'التاريخ الهجري';
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Live Countdown Timer                                              */
  /* ------------------------------------------------------------------ */
  startCountdownTimer() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    this.countdownTimer = setInterval(() => {
      this.updateCountdownDisplay();
    }, 1000);
  }

  updateCountdownDisplay() {
    const timerEl = document.getElementById('prayer-countdown-timer');
    const heroTimerEl = document.getElementById('dashboard-prayer-countdown');
    if (!this.nextPrayer) return;

    const now = new Date();
    const [targetH, targetM] = this.nextPrayer.time.split(':').map(Number);

    const targetDate = new Date();
    targetDate.setHours(targetH, targetM, 0, 0);

    if (this.nextPrayer.isTomorrow || targetDate <= now) {
      if (this.nextPrayer.isTomorrow) {
        targetDate.setDate(targetDate.getDate() + 1);
      } else {
        // Just crossed prayer time: recalculate
        this.calculateTimings();
        this.renderPrayerTimes();
        return;
      }
    }

    const diff = Math.max(0, targetDate - now);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    const text = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (timerEl) timerEl.textContent = text;
    if (heroTimerEl) heroTimerEl.textContent = text;
  }

  /* ------------------------------------------------------------------ */
  /*  Prayer Tracking (Daily Checklist & History)                       */
  /* ------------------------------------------------------------------ */
  getTodayDateString() {
    return new Date().toISOString().split('T')[0];
  }

  async loadTodayPrayerRecord() {
    const today = this.getTodayDateString();
    this.todayRecord = await this.storage.getPrayerRecord(today);
  }

  async renderTracker() {
    const container = document.getElementById('prayer-tracking-checklist');
    const progressFill = document.getElementById('prayer-daily-progress-fill');
    const progressCount = document.getElementById('prayer-daily-progress-count');
    const progressPct = document.getElementById('prayer-daily-progress-pct');

    if (!this.todayRecord) await this.loadTodayPrayerRecord();

    const prayers = [
      { id: 'fajr', name: 'صلاة الفجر', icon: '🌅' },
      { id: 'dhuhr', name: 'صلاة الظهر', icon: '☀️' },
      { id: 'asr', name: 'صلاة العصر', icon: '🌤️' },
      { id: 'maghrib', name: 'صلاة المغرب', icon: '🌇' },
      { id: 'isha', name: 'صلاة العشاء', icon: '🌙' }
    ];

    let completedCount = 0;
    prayers.forEach(p => {
      if (this.todayRecord[p.id]) completedCount++;
    });

    const pct = Math.round((completedCount / 5) * 100);

    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressCount) progressCount.textContent = `${completedCount} / 5 صلوات`;
    if (progressPct) progressPct.textContent = `${pct}%`;

    if (container) {
      container.innerHTML = prayers.map(p => {
        const isDone = !!this.todayRecord[p.id];
        return `
          <div class="prayer-track-item ${isDone ? 'completed' : ''}" data-prayer="${p.id}">
            <div class="track-left">
              <span class="track-icon">${p.icon}</span>
              <strong class="track-name">${p.name}</strong>
            </div>
            <button class="btn btn-sm track-toggle-btn ${isDone ? 'btn-success' : 'btn-outline'}" 
                    data-prayer="${p.id}">
              ${isDone ? 'صليت ✓' : 'لم أصلِّ'}
            </button>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.track-toggle-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const pid = btn.dataset.prayer;
          await this.togglePrayerDone(pid);
        });
      });
    }
  }

  async togglePrayerDone(prayerId) {
    if (!this.todayRecord) await this.loadTodayPrayerRecord();

    const wasDone = !!this.todayRecord[prayerId];
    this.todayRecord[prayerId] = !wasDone;

    if (!wasDone) {
      this.todayRecord[`${prayerId}Time`] = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } else {
      this.todayRecord[`${prayerId}Time`] = null;
    }

    await this.storage.savePrayerRecord(this.todayRecord);
    await this.renderTracker();
    await this.renderWeeklySummary();

    // Log activity in history if marked done
    if (!wasDone && window.WardApp && window.WardApp.history) {
      const arabicName = {
        fajr: 'صلاة الفجر',
        dhuhr: 'صلاة الظهر',
        asr: 'صلاة العصر',
        maghrib: 'صلاة المغرب',
        isha: 'صلاة العشاء'
      }[prayerId] || 'الصلاة';

      await window.WardApp.history.logActivity('prayer', {
        prayer: prayerId,
        description: `أداء ${arabicName}`
      });
    }

    // Refresh dashboard immediately
    if (window.WardApp && typeof window.WardApp.updateDashboard === 'function') {
      await window.WardApp.updateDashboard();
    }

    if (window.WardApp) {
      const msg = !wasDone ? 'تقبل الله طاعتكم 🤲 تم تسجيل الصلاة' : 'تم إلغاء تسجيل الصلاة';
      window.WardApp.showToast(msg);
    }
  }

  async renderWeeklySummary() {
    const container = document.getElementById('prayer-weekly-summary');
    if (!container) return;

    const records = await this.storage.getRecentPrayerRecords(7);
    const recordMap = {};
    records.forEach(r => { recordMap[r.date] = r; });

    // Generate last 7 days
    const days = [];
    const arabicDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayName = arabicDays[d.getDay()];
      const rec = recordMap[key];

      let count = 0;
      if (rec) {
        if (rec.fajr) count++;
        if (rec.dhuhr) count++;
        if (rec.asr) count++;
        if (rec.maghrib) count++;
        if (rec.isha) count++;
      }
      days.push({ key, dayName, count, isToday: i === 0 });
    }

    container.innerHTML = `
      <div class="weekly-tracker-grid">
        ${days.map(d => `
          <div class="weekly-day-col ${d.isToday ? 'today-col' : ''}">
            <div class="weekly-count-dots">
              ${[1, 2, 3, 4, 5].map(dot => `
                <span class="prayer-dot ${dot <= d.count ? 'dot-filled' : ''}"></span>
              `).join('')}
            </div>
            <span class="weekly-day-label">${d.dayName}</span>
            <span class="weekly-day-num">${d.count}/5</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /* ------------------------------------------------------------------ */
  /*  Qibla Compass Engine                                              */
  /* ------------------------------------------------------------------ */
  calculateQiblaBearing(lat, lng) {
    const kaabaLat = 21.422477;
    const kaabaLng = 39.826184;

    const phi1 = this._rad(lat);
    const phi2 = this._rad(kaabaLat);
    const dLambda = this._rad(kaabaLng - lng);

    const y = Math.sin(dLambda);
    const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(dLambda);

    let bearing = this._deg(Math.atan2(y, x));
    return (bearing + 360) % 360;
  }

  setupQiblaCompass() {
    const dial = document.getElementById('qibla-compass-dial');
    const degreeEl = document.getElementById('qibla-degree-val');
    const cardinalEl = document.getElementById('qibla-cardinal-dir');

    const bearing = this.calculateQiblaBearing(this.currentLocation.lat, this.currentLocation.lng);
    const bearingRounded = Math.round(bearing);

    if (degreeEl) degreeEl.textContent = `${bearingRounded}°`;

    // Direction string in Arabic
    let dirText = 'جنوب شرق';
    if (bearing >= 337.5 || bearing < 22.5) dirText = 'شمال';
    else if (bearing >= 22.5 && bearing < 67.5) dirText = 'شمال شرق';
    else if (bearing >= 67.5 && bearing < 112.5) dirText = 'شرق';
    else if (bearing >= 112.5 && bearing < 157.5) dirText = 'جنوب شرق';
    else if (bearing >= 157.5 && bearing < 202.5) dirText = 'جنوب';
    else if (bearing >= 202.5 && bearing < 247.5) dirText = 'جنوب غرب';
    else if (bearing >= 247.5 && bearing < 292.5) dirText = 'غرب';
    else if (bearing >= 292.5 && bearing < 337.5) dirText = 'شمال غرب';

    if (cardinalEl) cardinalEl.textContent = dirText;

    if (dial) {
      dial.style.transform = `rotate(${bearingRounded}deg)`;
    }

    // Try listening to device orientation if supported on mobile
    if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      const btn = document.getElementById('qibla-calibrate-btn');
      if (btn) {
        btn.style.display = 'inline-flex';
        btn.onclick = async () => {
          try {
            const resp = await window.DeviceOrientationEvent.requestPermission();
            if (resp === 'granted') {
              this._listenOrientation(bearing);
              btn.style.display = 'none';
            }
          } catch (e) {
            console.warn('Orientation permission error:', e);
          }
        };
      }
    } else if (window.DeviceOrientationEvent) {
      this._listenOrientation(bearing);
    }
  }

  _listenOrientation(qiblaBearing) {
    const dial = document.getElementById('qibla-compass-dial');
    if (!dial) return;

    window.addEventListener('deviceorientation', (e) => {
      let heading = null;
      if (e.webkitCompassHeading) {
        heading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null) {
        const needleRotation = (qiblaBearing - heading + 360) % 360;
        dial.style.transform = `rotate(${needleRotation}deg)`;
      }
    }, true);
  }

  /* ------------------------------------------------------------------ */
  /*  Location & Settings Modal                                         */
  /* ------------------------------------------------------------------ */
  setupEventListeners() {
    // Open Location Selector Button
    const locBtn = document.getElementById('prayer-change-location-btn');
    if (locBtn) {
      locBtn.addEventListener('click', () => this.showLocationModal());
    }

    // Auto-locate GPS Button
    const gpsBtn = document.getElementById('prayer-gps-locate-btn');
    if (gpsBtn) {
      gpsBtn.addEventListener('click', () => this.requestUserLocation());
    }

    // Calculation Method Select
    const methodSelect = document.getElementById('prayer-method-select');
    if (methodSelect) {
      methodSelect.value = this.selectedMethod;
      methodSelect.addEventListener('change', (e) => {
        this.selectedMethod = e.target.value;
        this.storage.setSetting('prayer_method', this.selectedMethod);
        this.calculateTimings();
        this.renderPrayerTimes();
        if (window.WardApp) window.WardApp.showToast('تم تحديث طريقة الحساب');
      });
    }

    // Juristic Asr Select
    const juristicSelect = document.getElementById('prayer-juristic-select');
    if (juristicSelect) {
      juristicSelect.value = this.asrJuristic;
      juristicSelect.addEventListener('change', (e) => {
        this.asrJuristic = parseInt(e.target.value) || 1;
        this.storage.setSetting('prayer_asr_juristic', this.asrJuristic);
        this.calculateTimings();
        this.renderPrayerTimes();
        if (window.WardApp) window.WardApp.showToast('تم تحديث مذهب صلاة العصر');
      });
    }

    // City Dropdown Selector
    const citySelect = document.getElementById('prayer-city-select');
    if (citySelect) {
      citySelect.innerHTML = this.CITIES.map((c, idx) => `
        <option value="${idx}" ${c.name === this.currentLocation.name ? 'selected' : ''}>
          ${c.name}
        </option>
      `).join('');

      citySelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value);
        const city = this.CITIES[idx];
        if (city) {
          this.setCityLocation(city);
        }
      });
    }
  }

  setCityLocation(city) {
    this.currentLocation = {
      name: city.name,
      lat: city.lat,
      lng: city.lng,
      tz: city.tz,
      isAuto: false
    };
    if (city.method && this.METHODS[city.method]) {
      this.selectedMethod = city.method;
      this.storage.setSetting('prayer_method', this.selectedMethod);
      const methodSelect = document.getElementById('prayer-method-select');
      if (methodSelect) methodSelect.value = this.selectedMethod;
    }

    this.storage.setSetting('prayer_location', this.currentLocation);
    this.calculateTimings();
    this.renderPrayerTimes();
    this.setupQiblaCompass();

    if (window.WardApp) {
      window.WardApp.showToast(`تم تعيين الموقع: ${city.name}`);
      window.WardApp.updateDashboard();
    }
  }

  requestUserLocation() {
    if (!navigator.geolocation) {
      if (window.WardApp) window.WardApp.showToast('تحديد الموقع الجغرافي غير مدعوم في متصفحك', 'error');
      return;
    }

    if (window.WardApp) window.WardApp.showToast('جاري تحديد الموقع بدقة عبر GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.currentLocation = {
          name: 'موقعي الحالي (GPS)',
          lat,
          lng,
          tz: -new Date().getTimezoneOffset() / 60,
          isAuto: true
        };
        this.storage.setSetting('prayer_location', this.currentLocation);
        this.calculateTimings();
        this.renderPrayerTimes();
        this.setupQiblaCompass();

        if (window.WardApp) {
          window.WardApp.showToast('تم تحديد الموقع بنجاح عبر GPS 📍');
          window.WardApp.updateDashboard();
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        let msg = 'تعذر الوصول للموقع الجغرافي، تم الإبقاء على القاهرة كافتراضي';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'تم رفض إذن الموقع، يُرجى اختيار مدينتك من القائمة يدويًا';
        }
        if (window.WardApp) window.WardApp.showToast(msg, 'info');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  async toggleReminder(prayerId) {
    if (!('Notification' in window)) {
      if (window.WardApp) window.WardApp.showToast('الإشعارات غير مدعومة في هذا المتصفح', 'info');
      return;
    }

    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        if (window.WardApp) window.WardApp.showToast('يُرجى السماح بالإشعارات لتفعيل التنبيهات', 'info');
        return;
      }
    }

    this.reminders[prayerId] = !this.reminders[prayerId];
    this.storage.setSetting('prayer_reminders', this.reminders);
    this.renderPrayerTimes();

    const arabicName = {
      fajr: 'صلاة الفجر',
      dhuhr: 'صلاة الظهر',
      asr: 'صلاة العصر',
      maghrib: 'صلاة المغرب',
      isha: 'صلاة العشاء'
    }[prayerId] || 'الصلاة';

    if (window.WardApp) {
      const msg = this.reminders[prayerId] ?
        `تم تفعيل تنبيه ${arabicName} 🔔` :
        `تم إلغاء تنبيه ${arabicName} 🔕`;
      window.WardApp.showToast(msg);
    }
  }

  showLocationModal() {
    const select = document.getElementById('prayer-city-select');
    if (select) {
      select.focus();
      select.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

window.PrayerManager = PrayerManager;
