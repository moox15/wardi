# وِرْدي Pro — Final Delivery Report

**Date:** 2026-11-16 · **Scope:** Full audit, data-integrity repair, new Daily Mission (أهداف يومي) system, dashboard rebuild, prayer/quran/azkar honesty fixes, premium features, and real-browser verification.
**Policy honored:** no rebuild-from-scratch, no destructive DB changes, no fabricated data, no paid APIs, PWA still installable, nothing pushed to GitHub.

---

## 1. Critical Bugs Found in the Audit

| # | Severity | Bug | Root cause |
|---|----------|-----|-----------|
| 1 | 🔴 Critical | Tasbeeh double-counted (~63 recorded for 33 taps) | Per-tap `syncDailyStats` (+10 every 10 taps) **plus** full session count re-saved on reset |
| 2 | 🔴 Critical | Activities between 00:00–03:00 landed on the wrong day | Mixed UTC (`toISOString().split('T')[0]`) and local date keys |
| 3 | 🔴 Critical | Read-modify-write IndexedDB races on rapid tasbeeh taps | Every tap loaded → modified → saved the whole day record independently |
| 4 | 🔴 High | Settings "export" button called a nonexistent method (`storage.exportData()` was actually `exportAllData`) | API drift |
| 5 | 🔴 High | Import claimed "merge" but destructively cleared all stores first | Broken `importData` |
| 6 | 🔴 High | Quran logged **+1 page just for opening a surah** | Fake `logActivity('quran', {pages:1})` in `loadSurah` |
| 7 | 🟠 High | Prayer reminder toggles were decorative — no scheduler existed | Missing scheduler |
| 8 | 🟠 Medium | Qibla added a duplicate `deviceorientation` listener on every retry | Listener leak |
| 9 | 🟠 Medium | Streak logic buggy: `_isActiveDay` ignored prayers; loop iterated a sorted array against a mutated date | Logic errors |
| 10 | 🟠 Medium | Undo never decremented daily stats | Missing negative correction |
| 11 | 🟡 Low | Opening a page counted as "completing an activity" | Overcounted engagement |

## 2. Fixes Applied

### Data layer (`storage.js` — rewritten)
- **Safe additive migration v2→v3**: adds `daily_goals` (key `date`), `goal_templates` (key `id`), `daily_reviews` (key `date`). Guards with `objectStoreNames.contains(...)` — **zero existing records touched** (verified in-browser: `Migrating from version 0 → 3 → Migration complete — all existing records preserved`).
- All date keys normalized to the **local calendar** via `localDateKey()` / `todayKey()`.
- Every CRUD promise resolves on `tx.oncomplete` (not `request.onsuccess`).
- New: `validateBackup()`, non-destructive **merge** `importData()`, `exportData()` alias, `bulkPut()`, `onblocked` handling.

### Unified activity tracker (`history.js` — rewritten)
- Single activity schema: `prayer_completed, tasbeeh_count, dhikr_completed, dua_read, quran_reading, habit_completed, daily_goal_completed` + legacy aliases so old records stay readable.
- **Write-behind stats cache** (1.2 s debounced flush, forced on `visibilitychange`/`pagehide`/`beforeunload`) kills the read-modify-write race: one in-memory copy, one writer.
- `bumpStats(date, mutator)` is the only stats write path; undo passes **negative deltas**.
- Honest streak logic (`getStreak()`), monthly (30-day) consistency, weekly report renderer, `getSmartInsights()` (only ever derived from real stored data).

### Tasbeeh (`tasbeeh.js` — rewritten)
- **Exact 1:1 counting**: every real tap bumps `daily_stats.tasbeehCount` + `tasbeehByPhrase[phraseKey]` exactly once; undo subtracts; sessions are display-only summaries with **delta-only** recording (`_lastSummaryCount`) and a silent pagehide save.
- Canonical `phraseKey()` maps phrases to real dhikr types (سبحان الله، الحمد لله، الله أكبر، أستغفر الله، الصلاة على النبي ﷺ، لا إله إلا الله…).
- **Azkar browser restored** (was missing from UI): حصن المسلم items load into the counter with their authentic targets; completing one marks `azkarDone[id]` once (idempotent).

### Quran (`quran.js`)
- Removed the fake "open surah = +1 page" log entirely.
- Added an **honest reading-time tracker** (15 s ticks while the reader is actually visible → `quranReadingMinutes`; ≥30 s partial counts as 1 min) and an **explicit manual page logger** (user-entered, sanity-capped at ±200).
- Fixed the Bismillah strip: exact string compare failed on Uthmani text (ٱ alef-wasla + diacritics). New `stripBismillah()` normalizes/tolerantly matches and maps the cut back to the original text (unit-tested against real API text in Node).

### Prayer (`prayer.js`)
- Real **reminder scheduler** (`_startReminderScheduler`/`_checkReminders`, dedupe keys `wardi_notified_{date}_{prayer}`), optional pre-prayer reminder (`prayer_pre_reminder`, now wired to a new dropdown), orientation listener dedupe, un-marking decrements `prayersCompleted` via `count:-1`.

### New: أهداف يومي | My Daily Mission (`goals.js` — new module)
- 8 goal types: 7 auto-tracked from **real data** (prayers, azkar morning/evening, quran minutes, tasbeeh, istighfar, salawat) + manual custom goals with +/− controls.
- **Never auto-marked done falsely** — auto goals complete only when real counts reach target; one `daily_goal_completed` event per completion (verified exactly-once).
- Carry-forward **only** from goals explicitly marked daily; "use yesterday" and save/apply templates.
- Reminder engine (30 s tick, per-goal times, interval setting) with **constructive accountability mode** (no humiliation, no religious guilt — overdue goals get a gentle tag and larger-type nudge).
- Daily setup modal + **end-of-day review** (after 20:00): done/missed lists, honest suggestion derived from real skip reasons, optional best-moment/tomorrow-focus fields stored in `daily_reviews`.

### Dashboard & app shell (`app.js`, `index.html`)
- Dashboard now renders the **goals card** (`#daily-goals-list`, day %, fill, meta, edit button), a **smart insights** block, and explains progress from goals.
- Local date everywhere; streak display defers to `history.getStreak()`.
- Timeline understands all unified + legacy activity types and filter aliases.
- Goals/insights refresh on every home visit; weekly report renders on history visit.
- Settings: accountability toggle + reminder-interval row wired by `goals.js`.

### UI (`style.css`)
- Full style block for: goal rows/badges/tags (incl. `tag-overdue`, `tag-high`, `tag-carry`), mini progress tracks, manual ± controls, setup catalog, review lists, weekly-report grid, insights, azkar browser, quran page-log, `.btn-sm`, `.btn-success`.
- Added `:focus-visible` outlines and a `prefers-reduced-motion` guard.

### PWA (`service-worker.js`)
- Cache bumped `wardi-pro-v5 → wardi-pro-v6`; `goals.js` added to precache list.

## 3. Real-Browser Test Results (Edge, localhost:8080)

| Test | Result |
|------|--------|
| App boot, DB migration v0→v3, no console errors | ✅ |
| **10 automated taps** with phrase "لا إله إلا الله" → recorded exactly 10 under that phrase | ✅ |
| Concurrent **human taps** (34 × سبحان الله via the live Review pane) recorded separately and correctly (34 + 10 = 44) | ✅ |
| **Undo 3** → stats 44→41; **+4 taps** → 45; flush → DB exact match (46 after 1 more azkar tap) | ✅ |
| Azkar item (morning:0, target 1) → one tap completes → `azkarDone` marked once, `azkarCompleted` 1 | ✅ |
| Mark fajr+dhuhr → `prayer_records` true, `prayersCompleted` 2, goal auto-progress "2 / 5 صلوات", unified gauge 30% | ✅ |
| Timeline shows unified types (صلاة ×2, تسبيح) | ✅ |
| Quran: surah 2 opens with clean first ayah (الٓمٓ) + ornamental bismillah banner; **no fake page logged** | ✅ |
| Manual page log (3) → `quranPages` 3 + one honest history event + input cleared | ✅ |
| Goals setup modal: 3 catalog goals added with correct targets (5/13/9), finish → dashboard rows | ✅ |
| Custom goal via prompts ("قراءة كتاب", target 3): +2 → "2 / 3", +1 → auto-done with **exactly one** `daily_goal_completed` event | ✅ |
| Manual "أتممته ✓" on prayers goal → done, second legit event | ✅ |
| End-of-day review modal: 50%, done/missed lists, constructive suggestion | ✅ |
| Weekly report: 40% prayer consistency, 46 tasbeeh, 1/7 active days | ✅ |
| **Reload persistence**: tasbeeh 46, pages 3, prayers 2, azkar 1, all 4 goals with done states — all intact | ✅ |
| Export: all 13 stores + settings in valid JSON | ✅ |
| Import round-trip: idempotent merge (0 new records, nothing lost) | ✅ |
| Horizontal overflow at **360/390/430 px**: 0 px on all 7 sections + goals modal | ✅ |
| Light/dark theme switching | ✅ |

## 4. Files Changed

- `assets/js/storage.js` — rewritten (v3 data layer)
- `assets/js/history.js` — rewritten (unified tracker)
- `assets/js/tasbeeh.js` — rewritten (integrity model)
- `assets/js/goals.js` — **new** (Daily Mission system; midnight re-init fixed to avoid duplicate listener binding)
- `assets/js/quran.js` — fake log removed, bismillah fix, manual page logger, tracker
- `assets/js/prayer.js` — scheduler, dedupe, un-mark correction, pre-reminder wiring
- `assets/js/app.js` — goals init/expose, dashboard goals + insights blocks, local dates, streak fix, timeline types, weekly-report hook
- `index.html` — goals card, insights block, azkar browser, quran page-log, pre-reminder select, accountability + interval settings, 2 new modals, `goals.js` script tag
- `assets/css/style.css` — new component styles + a11y/motion guards
- `service-worker.js` — cache v6 + precache

## 5. Remaining Limitations

1. **Stale DB reads during the 1.2 s write-behind window** — by design; all UI paths read after flush or from the cache. Testers must `flushAll()` before asserting on raw DB values.
2. **No real push notifications tested on a locked phone** — the reminder engine logs and toasts work; `Notification` API fires only when permission was already granted and the page is hidden.
3. **Quran reading minutes** need ≥60 s (or ≥30 s on leave) to register a minute — short glances intentionally don't count.
4. **Prayer times** depend on the browser's geolocation/city fallback; geolocation errors degrade gracefully to the default city (observed warning is benign).
5. **English UI** for the new goals components ships Arabic-first (labels in `goals.js`); i18n expansion is a follow-up.
6. `scripts/temp_edge_profile/` from earlier test runs remains ignored — safe to delete manually.
7. OneDrive folder sync may briefly lock files during edits (Windows); no impact on runtime.

## 6. How to Verify Yourself

```powershell
node scripts/server.js        # port 8080
# open http://localhost:8080/ — DevTools > Application > IndexedDB > WardiDB v3
```

A local static server is currently running from this session (background task `sh_1e51a1afb001R3ekZ4XrvFGV0d`); stop it when done.
