/**
 * QuranManager — Complete Quran reader for Wardi Pro
 * Features:
 * - 114 Surahs list (accurate metadata embedded + API sync)
 * - Full Arabic Uthmani text via AlQuran Cloud API with IndexedDB caching
 * - Instant offline fallback for essential Surahs (Al-Fatiha, Al-Ikhlas, Al-Falaq, An-Nas)
 * - Mushaf-style reading view with verse markers ﴿١﴾ and Bismillah handling
 * - Search by Surah name (Arabic/English) and Ayah text search
 * - Bookmarks management (add, remove, jump to bookmark)
 * - Font size scaling
 * - Reading position memory (continue reading)
 * - Previous/Next Surah navigation
 * - Surah favorites
 */
class QuranManager {
  constructor(storage) {
    this.storage = storage;
    this.currentSurah = null;
    this.currentAyah = 1;
    this.surahList = [];
    this.currentSurahData = null; // cached full surah payload
    this.quranFontSize = parseInt(storage.getSetting('quran_font_size', 24));
    this.isLoading = false;
    this.bookmarks = [];
    this.favorites = new Set();
  }

  async init() {
    this.surahList = this.getEmbeddedSurahList();
    this.setupEventListeners();
    await this.loadFavorites();
    await this.renderBookmarks();
    this.renderSurahList();

    // Check last reading position to see if continue button should be ready
    const lastPos = this.getLastPosition();
    if (lastPos && lastPos.surah) {
      const continueBtn = document.getElementById('continue-reading-btn');
      if (continueBtn) {
        const surahMeta = this.surahList.find(s => s.number === lastPos.surah);
        const detailEl = continueBtn.querySelector('.continue-detail');
        if (detailEl && surahMeta) {
          detailEl.textContent = `سورة ${surahMeta.name} — آية ${lastPos.ayah || 1}`;
        }
      }
    }

    // Attempt to sync surah list in background from API
    this.fetchSurahListFromAPI();
  }

  /* ------------------------------------------------------------------ */
  /*  Surah Metadata (All 114 Verified Surahs)                          */
  /* ------------------------------------------------------------------ */
  getEmbeddedSurahList() {
    return [
      { number: 1, name: "الفاتحة", englishName: "Al-Faatiha", englishNameTranslation: "The Opening", numberOfAyahs: 7, revelationType: "Meccan" },
      { number: 2, name: "البقرة", englishName: "Al-Baqara", englishNameTranslation: "The Cow", numberOfAyahs: 286, revelationType: "Medinan" },
      { number: 3, name: "آل عمران", englishName: "Aal-i-Imraan", englishNameTranslation: "The Family of Imran", numberOfAyahs: 200, revelationType: "Medinan" },
      { number: 4, name: "النساء", englishName: "An-Nisaa", englishNameTranslation: "The Women", numberOfAyahs: 176, revelationType: "Medinan" },
      { number: 5, name: "المائدة", englishName: "Al-Maaida", englishNameTranslation: "The Table", numberOfAyahs: 120, revelationType: "Medinan" },
      { number: 6, name: "الأنعام", englishName: "Al-An'aam", englishNameTranslation: "The Cattle", numberOfAyahs: 165, revelationType: "Meccan" },
      { number: 7, name: "الأعراف", englishName: "Al-A'raaf", englishNameTranslation: "The Heights", numberOfAyahs: 206, revelationType: "Meccan" },
      { number: 8, name: "الأنفال", englishName: "Al-Anfaal", englishNameTranslation: "The Spoils of War", numberOfAyahs: 75, revelationType: "Medinan" },
      { number: 9, name: "التوبة", englishName: "At-Tawba", englishNameTranslation: "The Repentance", numberOfAyahs: 129, revelationType: "Medinan" },
      { number: 10, name: "يونس", englishName: "Yunus", englishNameTranslation: "Jonah", numberOfAyahs: 109, revelationType: "Meccan" },
      { number: 11, name: "هود", englishName: "Hud", englishNameTranslation: "Hud", numberOfAyahs: 123, revelationType: "Meccan" },
      { number: 12, name: "يوسف", englishName: "Yusuf", englishNameTranslation: "Joseph", numberOfAyahs: 111, revelationType: "Meccan" },
      { number: 13, name: "الرعد", englishName: "Ar-Ra'd", englishNameTranslation: "The Thunder", numberOfAyahs: 43, revelationType: "Medinan" },
      { number: 14, name: "إبراهيم", englishName: "Ibrahim", englishNameTranslation: "Abraham", numberOfAyahs: 52, revelationType: "Meccan" },
      { number: 15, name: "الحجر", englishName: "Al-Hijr", englishNameTranslation: "The Rocky Tract", numberOfAyahs: 99, revelationType: "Meccan" },
      { number: 16, name: "النحل", englishName: "An-Nahl", englishNameTranslation: "The Bees", numberOfAyahs: 128, revelationType: "Meccan" },
      { number: 17, name: "الإسراء", englishName: "Al-Israa", englishNameTranslation: "The Night Journey", numberOfAyahs: 111, revelationType: "Meccan" },
      { number: 18, name: "الكهف", englishName: "Al-Kahf", englishNameTranslation: "The Cave", numberOfAyahs: 110, revelationType: "Meccan" },
      { number: 19, name: "مريم", englishName: "Maryam", englishNameTranslation: "Mary", numberOfAyahs: 98, revelationType: "Meccan" },
      { number: 20, name: "طه", englishName: "Taa-Haa", englishNameTranslation: "Ta-Ha", numberOfAyahs: 135, revelationType: "Meccan" },
      { number: 21, name: "الأنبياء", englishName: "Al-Anbiyaa", englishNameTranslation: "The Prophets", numberOfAyahs: 112, revelationType: "Meccan" },
      { number: 22, name: "الحج", englishName: "Al-Hajj", englishNameTranslation: "The Pilgrimage", numberOfAyahs: 78, revelationType: "Medinan" },
      { number: 23, name: "المؤمنون", englishName: "Al-Muminoon", englishNameTranslation: "The Believers", numberOfAyahs: 118, revelationType: "Meccan" },
      { number: 24, name: "النور", englishName: "An-Noor", englishNameTranslation: "The Light", numberOfAyahs: 64, revelationType: "Medinan" },
      { number: 25, name: "الفرقان", englishName: "Al-Furqaan", englishNameTranslation: "The Criterion", numberOfAyahs: 77, revelationType: "Meccan" },
      { number: 26, name: "الشعراء", englishName: "Ash-Shu'araa", englishNameTranslation: "The Poets", numberOfAyahs: 227, revelationType: "Meccan" },
      { number: 27, name: "النمل", englishName: "An-Naml", englishNameTranslation: "The Ants", numberOfAyahs: 93, revelationType: "Meccan" },
      { number: 28, name: "القصص", englishName: "Al-Qasas", englishNameTranslation: "The Stories", numberOfAyahs: 88, revelationType: "Meccan" },
      { number: 29, name: "العنكبوت", englishName: "Al-Ankaboot", englishNameTranslation: "The Spider", numberOfAyahs: 69, revelationType: "Meccan" },
      { number: 30, name: "الروم", englishName: "Ar-Room", englishNameTranslation: "The Romans", numberOfAyahs: 60, revelationType: "Meccan" },
      { number: 31, name: "لقمان", englishName: "Luqman", englishNameTranslation: "Luqman", numberOfAyahs: 34, revelationType: "Meccan" },
      { number: 32, name: "السجدة", englishName: "As-Sajda", englishNameTranslation: "The Prostration", numberOfAyahs: 30, revelationType: "Meccan" },
      { number: 33, name: "الأحزاب", englishName: "Al-Ahzaab", englishNameTranslation: "The Combined Forces", numberOfAyahs: 73, revelationType: "Medinan" },
      { number: 34, name: "سبأ", englishName: "Saba", englishNameTranslation: "Sheba", numberOfAyahs: 54, revelationType: "Meccan" },
      { number: 35, name: "فاطر", englishName: "Faatir", englishNameTranslation: "The Originator", numberOfAyahs: 45, revelationType: "Meccan" },
      { number: 36, name: "يس", englishName: "Yaseen", englishNameTranslation: "Ya-Seen", numberOfAyahs: 83, revelationType: "Meccan" },
      { number: 37, name: "الصافات", englishName: "As-Saaffaat", englishNameTranslation: "Those set in Ranks", numberOfAyahs: 182, revelationType: "Meccan" },
      { number: 38, name: "ص", englishName: "Saad", englishNameTranslation: "Saad", numberOfAyahs: 88, revelationType: "Meccan" },
      { number: 39, name: "الزمر", englishName: "Az-Zumar", englishNameTranslation: "The Troops", numberOfAyahs: 75, revelationType: "Meccan" },
      { number: 40, name: "غافر", englishName: "Ghafir", englishNameTranslation: "The Forgiver", numberOfAyahs: 85, revelationType: "Meccan" },
      { number: 41, name: "فصلت", englishName: "Fussilat", englishNameTranslation: "Explained in Detail", numberOfAyahs: 54, revelationType: "Meccan" },
      { number: 42, name: "الشورى", englishName: "Ash-Shura", englishNameTranslation: "Consultation", numberOfAyahs: 53, revelationType: "Meccan" },
      { number: 43, name: "الزخرف", englishName: "Az-Zukhruf", englishNameTranslation: "Ornaments of Gold", numberOfAyahs: 89, revelationType: "Meccan" },
      { number: 44, name: "الدخان", englishName: "Ad-Dukhaan", englishNameTranslation: "The Smoke", numberOfAyahs: 59, revelationType: "Meccan" },
      { number: 45, name: "الجاثية", englishName: "Al-Jaathiya", englishNameTranslation: "Crouching", numberOfAyahs: 37, revelationType: "Meccan" },
      { number: 46, name: "الأحقاف", englishName: "Al-Ahqaf", englishNameTranslation: "The Dunes", numberOfAyahs: 35, revelationType: "Meccan" },
      { number: 47, name: "محمد", englishName: "Muhammad", englishNameTranslation: "Muhammad", numberOfAyahs: 38, revelationType: "Medinan" },
      { number: 48, name: "الفتح", englishName: "Al-Fath", englishNameTranslation: "The Victory", numberOfAyahs: 29, revelationType: "Medinan" },
      { number: 49, name: "الحجرات", englishName: "Al-Hujuraat", englishNameTranslation: "The Inner Apartments", numberOfAyahs: 18, revelationType: "Medinan" },
      { number: 50, name: "ق", englishName: "Qaaf", englishNameTranslation: "Qaf", numberOfAyahs: 45, revelationType: "Meccan" },
      { number: 51, name: "الذاريات", englishName: "Adh-Dhaariyat", englishNameTranslation: "The Winnowing Winds", numberOfAyahs: 60, revelationType: "Meccan" },
      { number: 52, name: "الطور", englishName: "At-Toor", englishNameTranslation: "The Mount", numberOfAyahs: 49, revelationType: "Meccan" },
      { number: 53, name: "النجم", englishName: "An-Najm", englishNameTranslation: "The Star", numberOfAyahs: 62, revelationType: "Meccan" },
      { number: 54, name: "القمر", englishName: "Al-Qamar", englishNameTranslation: "The Moon", numberOfAyahs: 55, revelationType: "Meccan" },
      { number: 55, name: "الرحمن", englishName: "Ar-Rahmaan", englishNameTranslation: "The Beneficent", numberOfAyahs: 78, revelationType: "Medinan" },
      { number: 56, name: "الواقعة", englishName: "Al-Waaqia", englishNameTranslation: "The Inevitable", numberOfAyahs: 96, revelationType: "Meccan" },
      { number: 57, name: "الحديد", englishName: "Al-Hadid", englishNameTranslation: "The Iron", numberOfAyahs: 29, revelationType: "Medinan" },
      { number: 58, name: "المجادلة", englishName: "Al-Mujaadila", englishNameTranslation: "The Pleading Woman", numberOfAyahs: 22, revelationType: "Medinan" },
      { number: 59, name: "الحشر", englishName: "Al-Hashr", englishNameTranslation: "The Exile", numberOfAyahs: 24, revelationType: "Medinan" },
      { number: 60, name: "الممتحنة", englishName: "Al-Mumtahana", englishNameTranslation: "She that is to be examined", numberOfAyahs: 13, revelationType: "Medinan" },
      { number: 61, name: "الصف", englishName: "As-Saff", englishNameTranslation: "The Ranks", numberOfAyahs: 14, revelationType: "Medinan" },
      { number: 62, name: "الجمعة", englishName: "Al-Jumu'a", englishNameTranslation: "Friday", numberOfAyahs: 11, revelationType: "Medinan" },
      { number: 63, name: "المنافقون", englishName: "Al-Munaafiqoon", englishNameTranslation: "The Hypocrites", numberOfAyahs: 11, revelationType: "Medinan" },
      { number: 64, name: "التغابن", englishName: "At-Taghaabun", englishNameTranslation: "Mutual Disillusion", numberOfAyahs: 18, revelationType: "Medinan" },
      { number: 65, name: "الطلاق", englishName: "At-Talaaq", englishNameTranslation: "Divorce", numberOfAyahs: 12, revelationType: "Medinan" },
      { number: 66, name: "التحريم", englishName: "At-Tahrim", englishNameTranslation: "The Prohibition", numberOfAyahs: 12, revelationType: "Medinan" },
      { number: 67, name: "الملك", englishName: "Al-Mulk", englishNameTranslation: "The Sovereignty", numberOfAyahs: 30, revelationType: "Meccan" },
      { number: 68, name: "القلم", englishName: "Al-Qalam", englishNameTranslation: "The Pen", numberOfAyahs: 52, revelationType: "Meccan" },
      { number: 69, name: "الحاقة", englishName: "Al-Haaqqa", englishNameTranslation: "The Reality", numberOfAyahs: 52, revelationType: "Meccan" },
      { number: 70, name: "المعارج", englishName: "Al-Ma'aarij", englishNameTranslation: "The Ascending Stairways", numberOfAyahs: 44, revelationType: "Meccan" },
      { number: 71, name: "نوح", englishName: "Nooh", englishNameTranslation: "Noah", numberOfAyahs: 28, revelationType: "Meccan" },
      { number: 72, name: "الجن", englishName: "Al-Jinn", englishNameTranslation: "The Jinn", numberOfAyahs: 28, revelationType: "Meccan" },
      { number: 73, name: "المزمل", englishName: "Al-Muzzammil", englishNameTranslation: "The Enshrouded One", numberOfAyahs: 20, revelationType: "Meccan" },
      { number: 74, name: "المدثر", englishName: "Al-Muddaththir", englishNameTranslation: "The Cloaked One", numberOfAyahs: 56, revelationType: "Meccan" },
      { number: 75, name: "القيامة", englishName: "Al-Qiyaama", englishNameTranslation: "The Resurrection", numberOfAyahs: 40, revelationType: "Meccan" },
      { number: 76, name: "الإنسان", englishName: "Al-Insaan", englishNameTranslation: "Man", numberOfAyahs: 31, revelationType: "Medinan" },
      { number: 77, name: "المرسلات", englishName: "Al-Mursalaat", englishNameTranslation: "The Emissaries", numberOfAyahs: 50, revelationType: "Meccan" },
      { number: 78, name: "النبأ", englishName: "An-Naba", englishNameTranslation: "The Tidings", numberOfAyahs: 40, revelationType: "Meccan" },
      { number: 79, name: "النازعات", englishName: "An-Naazi'aat", englishNameTranslation: "Those who drag forth", numberOfAyahs: 46, revelationType: "Meccan" },
      { number: 80, name: "عبس", englishName: "Abasa", englishNameTranslation: "He frowned", numberOfAyahs: 42, revelationType: "Meccan" },
      { number: 81, name: "التكوير", englishName: "At-Takwir", englishNameTranslation: "The Overthrowing", numberOfAyahs: 29, revelationType: "Meccan" },
      { number: 82, name: "الانفطار", englishName: "Al-Infitaar", englishNameTranslation: "The Cleaving", numberOfAyahs: 19, revelationType: "Meccan" },
      { number: 83, name: "المطففين", englishName: "Al-Mutaffifin", englishNameTranslation: "Defrauding", numberOfAyahs: 36, revelationType: "Meccan" },
      { number: 84, name: "الانشقاق", englishName: "Al-Inshiqaaq", englishNameTranslation: "The Splitting Open", numberOfAyahs: 25, revelationType: "Meccan" },
      { number: 85, name: "البروج", englishName: "Al-Burooj", englishNameTranslation: "The Mansions of the Stars", numberOfAyahs: 22, revelationType: "Meccan" },
      { number: 86, name: "الطارق", englishName: "At-Taariq", englishNameTranslation: "The Morning Star", numberOfAyahs: 17, revelationType: "Meccan" },
      { number: 87, name: "الأعلى", englishName: "Al-A'laa", englishNameTranslation: "The Most High", numberOfAyahs: 19, revelationType: "Meccan" },
      { number: 88, name: "الغاشية", englishName: "Al-Ghaashiya", englishNameTranslation: "The Overwhelming Event", numberOfAyahs: 26, revelationType: "Meccan" },
      { number: 89, name: "الفجر", englishName: "Al-Fajr", englishNameTranslation: "The Dawn", numberOfAyahs: 30, revelationType: "Meccan" },
      { number: 90, name: "البلد", englishName: "Al-Balad", englishNameTranslation: "The City", numberOfAyahs: 20, revelationType: "Meccan" },
      { number: 91, name: "الشمس", englishName: "Ash-Shams", englishNameTranslation: "The Sun", numberOfAyahs: 15, revelationType: "Meccan" },
      { number: 92, name: "الليل", englishName: "Al-Lail", englishNameTranslation: "The Night", numberOfAyahs: 21, revelationType: "Meccan" },
      { number: 93, name: "الضحى", englishName: "Ad-Dhuhaa", englishNameTranslation: "The Morning Hours", numberOfAyahs: 11, revelationType: "Meccan" },
      { number: 94, name: "الشرح", englishName: "Ash-Sharh", englishNameTranslation: "The Relief", numberOfAyahs: 8, revelationType: "Meccan" },
      { number: 95, name: "التين", englishName: "At-Tin", englishNameTranslation: "The Fig", numberOfAyahs: 8, revelationType: "Meccan" },
      { number: 96, name: "العلق", englishName: "Al-Alaq", englishNameTranslation: "The Clot", numberOfAyahs: 19, revelationType: "Meccan" },
      { number: 97, name: "القدر", englishName: "Al-Qadr", englishNameTranslation: "The Power", numberOfAyahs: 5, revelationType: "Meccan" },
      { number: 98, name: "البينة", englishName: "Al-Bayyina", englishNameTranslation: "The Clear Proof", numberOfAyahs: 8, revelationType: "Medinan" },
      { number: 99, name: "الزلزلة", englishName: "Az-Zalzala", englishNameTranslation: "The Earthquake", numberOfAyahs: 8, revelationType: "Medinan" },
      { number: 100, name: "العاديات", englishName: "Al-Aadiyaat", englishNameTranslation: "The Courser", numberOfAyahs: 11, revelationType: "Meccan" },
      { number: 101, name: "القارعة", englishName: "Al-Qaari'a", englishNameTranslation: "The Calamity", numberOfAyahs: 11, revelationType: "Meccan" },
      { number: 102, name: "التكاثر", englishName: "At-Takaathur", englishNameTranslation: "The Rivalry in World Increase", numberOfAyahs: 8, revelationType: "Meccan" },
      { number: 103, name: "العصر", englishName: "Al-Asr", englishNameTranslation: "The Declining Day", numberOfAyahs: 3, revelationType: "Meccan" },
      { number: 104, name: "الهمزة", englishName: "Al-Humaza", englishNameTranslation: "The Traducer", numberOfAyahs: 9, revelationType: "Meccan" },
      { number: 105, name: "الفيل", englishName: "Al-Fil", englishNameTranslation: "The Elephant", numberOfAyahs: 5, revelationType: "Meccan" },
      { number: 106, name: "قريش", englishName: "Quraysh", englishNameTranslation: "Quraysh", numberOfAyahs: 4, revelationType: "Meccan" },
      { number: 107, name: "الماعون", englishName: "Al-Maa'oon", englishNameTranslation: "The Small Kindnesses", numberOfAyahs: 7, revelationType: "Meccan" },
      { number: 108, name: "الكوثر", englishName: "Al-Kawthar", englishNameTranslation: "The Abundance", numberOfAyahs: 3, revelationType: "Meccan" },
      { number: 109, name: "الكافرون", englishName: "Al-Kaafiroon", englishNameTranslation: "The Disbelievers", numberOfAyahs: 6, revelationType: "Meccan" },
      { number: 110, name: "النصر", englishName: "An-Nasr", englishNameTranslation: "The Divine Support", numberOfAyahs: 3, revelationType: "Medinan" },
      { number: 111, name: "المسد", englishName: "Al-Masad", englishNameTranslation: "The Palm Fibre", numberOfAyahs: 5, revelationType: "Meccan" },
      { number: 112, name: "الإخلاص", englishName: "Al-Ikhlaas", englishNameTranslation: "Sincerity", numberOfAyahs: 4, revelationType: "Meccan" },
      { number: 113, name: "الفلق", englishName: "Al-Falaq", englishNameTranslation: "The Daybreak", numberOfAyahs: 5, revelationType: "Meccan" },
      { number: 114, name: "الناس", englishName: "An-Naas", englishNameTranslation: "Mankind", numberOfAyahs: 6, revelationType: "Meccan" }
    ];
  }

  /* ------------------------------------------------------------------ */
  /*  Instant Fallback Data for offline initial load (Authentic Text)    */
  /* ------------------------------------------------------------------ */
  getOfflineFallbackSurah(surahNumber) {
    const fallbacks = {
      1: {
        number: 1,
        name: "سُورَةُ الفَاتِحَةِ",
        englishName: "Al-Faatiha",
        revelationType: "Meccan",
        numberOfAyahs: 7,
        ayahs: [
          { numberInSurah: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
          { numberInSurah: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
          { numberInSurah: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ" },
          { numberInSurah: 4, text: "مَالِكِ يَوْمِ الدِّينِ" },
          { numberInSurah: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
          { numberInSurah: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
          { numberInSurah: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" }
        ]
      },
      112: {
        number: 112,
        name: "سُورَةُ الإِخْلَاصِ",
        englishName: "Al-Ikhlaas",
        revelationType: "Meccan",
        numberOfAyahs: 4,
        ayahs: [
          { numberInSurah: 1, text: "قُلْ هُوَ اللَّهُ أَحَدٌ" },
          { numberInSurah: 2, text: "اللَّهُ الصَّمَدُ" },
          { numberInSurah: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ" },
          { numberInSurah: 4, text: "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ" }
        ]
      },
      113: {
        number: 113,
        name: "سُورَةُ الفَلَقِ",
        englishName: "Al-Falaq",
        revelationType: "Meccan",
        numberOfAyahs: 5,
        ayahs: [
          { numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ" },
          { numberInSurah: 2, text: "مِن شَرِّ مَا خَلَقَ" },
          { numberInSurah: 3, text: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ" },
          { numberInSurah: 4, text: "وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ" },
          { numberInSurah: 5, text: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ" }
        ]
      },
      114: {
        number: 114,
        name: "سُورَةُ النَّاسِ",
        englishName: "An-Naas",
        revelationType: "Meccan",
        numberOfAyahs: 6,
        ayahs: [
          { numberInSurah: 1, text: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ" },
          { numberInSurah: 2, text: "مَلِكِ النَّاسِ" },
          { numberInSurah: 3, text: "إِلَٰهِ النَّاسِ" },
          { numberInSurah: 4, text: "مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ" },
          { numberInSurah: 5, text: "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ" },
          { numberInSurah: 6, text: "مِنَ الْجِنَّةِ وَالنَّاسِ" }
        ]
      }
    };
    return fallbacks[surahNumber] || null;
  }

  /* ------------------------------------------------------------------ */
  /*  Fetch Surah List from API                                         */
  /* ------------------------------------------------------------------ */
  async fetchSurahListFromAPI() {
    try {
      const resp = await fetch('https://api.alquran.cloud/v1/surah');
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.code === 200 && Array.isArray(data.data)) {
        this.surahList = data.data;
        this.renderSurahList();
      }
    } catch (e) {
      // Offline or network error: gracefully keep embedded list
      console.log('Using embedded surah catalog (offline/local mode).');
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Favorites & Bookmarks in IndexedDB                                */
  /* ------------------------------------------------------------------ */
  async loadFavorites() {
    try {
      const favs = await this.storage.getAllItems('quran_favorites');
      this.favorites = new Set(favs.map(f => f.surahNumber));
    } catch (err) {
      console.error('loadFavorites error:', err);
    }
  }

  async toggleFavorite(surahNumber, surahName) {
    try {
      if (this.favorites.has(surahNumber)) {
        this.favorites.delete(surahNumber);
        await this.storage.deleteItem('quran_favorites', surahNumber);
      } else {
        this.favorites.add(surahNumber);
        await this.storage.addItem('quran_favorites', {
          surahNumber,
          surahName,
          addedAt: new Date().toISOString()
        });
      }
      this.renderSurahList();
    } catch (err) {
      console.error('toggleFavorite error:', err);
    }
  }

  async renderBookmarks() {
    const container = document.getElementById('quran-bookmarks-list');
    if (!container) return;

    try {
      this.bookmarks = await this.storage.getAllItems('quran_bookmarks');
      if (!this.bookmarks || this.bookmarks.length === 0) {
        const lang = window.WardApp?.currentLang || 'ar';
        container.innerHTML = `<p class="empty-state">${lang === 'ar' ? 'لا توجد علامات مرجعية' : 'No bookmarks saved'}</p>`;
        return;
      }

      container.innerHTML = this.bookmarks.map(b => `
        <div class="bookmark-item card" data-id="${b.id}" data-surah="${b.surahNumber}" data-ayah="${b.ayahNumber || 1}">
          <div class="bookmark-info">
            <span class="bookmark-surah">${b.surahName || ('سورة ' + b.surahNumber)}</span>
            <span class="bookmark-ayah">آية ${b.ayahNumber || 1}</span>
          </div>
          <div class="bookmark-actions">
            <button class="btn btn-secondary bookmark-jump-btn" data-surah="${b.surahNumber}" data-ayah="${b.ayahNumber || 1}">
              انتقل 📖
            </button>
            <button class="btn-icon bookmark-delete-btn" data-id="${b.id}" title="حذف العلامة">
              🗑
            </button>
          </div>
        </div>
      `).join('');

      // Event handlers
      container.querySelectorAll('.bookmark-jump-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const surahNum = parseInt(btn.dataset.surah);
          const ayahNum = parseInt(btn.dataset.ayah) || 1;
          this.loadSurah(surahNum, ayahNum);
        });
      });

      container.querySelectorAll('.bookmark-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          await this.removeBookmark(id);
        });
      });
    } catch (err) {
      console.error('renderBookmarks error:', err);
    }
  }

  async addBookmark(surahNumber, ayahNumber, surahName) {
    try {
      await this.storage.addItem('quran_bookmarks', {
        surahNumber,
        ayahNumber: ayahNumber || 1,
        surahName: surahName || `سورة ${surahNumber}`,
        createdAt: new Date().toISOString()
      });
      if (window.WardApp) {
        const lang = window.WardApp.currentLang;
        window.WardApp.showToast(lang === 'ar' ? 'تمت إضافة العلامة المرجعية 🔖' : 'Bookmark added 🔖');
      }
      await this.renderBookmarks();
    } catch (err) {
      console.error('addBookmark error:', err);
    }
  }

  async removeBookmark(id) {
    try {
      await this.storage.deleteItem('quran_bookmarks', id);
      if (window.WardApp) {
        const lang = window.WardApp.currentLang;
        window.WardApp.showToast(lang === 'ar' ? 'تم حذف العلامة المرجعية' : 'Bookmark removed');
      }
      await this.renderBookmarks();
    } catch (err) {
      console.error('removeBookmark error:', err);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Surah List Rendering & Filtering                                  */
  /* ------------------------------------------------------------------ */
  renderSurahList(filter = '') {
    const container = document.getElementById('surah-list-container');
    if (!container) return;

    let list = this.surahList;
    const cleanFilter = (filter || '').trim().toLowerCase();

    if (cleanFilter) {
      list = list.filter(s => {
        const numMatch = s.number.toString() === cleanFilter;
        const nameMatch = s.name.toLowerCase().includes(cleanFilter);
        const enMatch = (s.englishName || '').toLowerCase().includes(cleanFilter);
        const transMatch = (s.englishNameTranslation || '').toLowerCase().includes(cleanFilter);
        return numMatch || nameMatch || enMatch || transMatch;
      });
    }

    if (list.length === 0) {
      const lang = window.WardApp?.currentLang || 'ar';
      container.innerHTML = `<div class="empty-state"><p>${lang === 'ar' ? 'لم يتم العثور على سور مطابقة' : 'No surahs match your search'}</p></div>`;
      return;
    }

    const lang = window.WardApp?.currentLang || 'ar';

    container.innerHTML = list.map(s => {
      const isFav = this.favorites.has(s.number);
      const revTypeAr = s.revelationType === 'Meccan' ? 'مكية' : 'مدنية';
      const revType = lang === 'ar' ? revTypeAr : s.revelationType;

      return `
        <div class="surah-item card" data-number="${s.number}" role="button" tabindex="0" aria-label="سورة ${s.name}">
          <div class="surah-item-left">
            <span class="surah-number-badge">${s.number}</span>
            <div class="surah-info">
              <h4 class="surah-name-ar">${s.name}</h4>
              <span class="surah-meta">${revType} • ${s.numberOfAyahs} آية</span>
            </div>
          </div>
          <div class="surah-item-right">
            <button class="btn-icon surah-fav-btn ${isFav ? 'active' : ''}" data-number="${s.number}" data-name="${s.name}" title="${isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">
              ${isFav ? '★' : '☆'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.surah-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.surah-fav-btn')) return;
        const surahNum = parseInt(item.dataset.number);
        this.loadSurah(surahNum);
      });
    });

    container.querySelectorAll('.surah-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const num = parseInt(btn.dataset.number);
        const name = btn.dataset.name;
        this.toggleFavorite(num, name);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Load & Render Surah                                               */
  /* ------------------------------------------------------------------ */
  async loadSurah(number, targetAyah = 1) {
    if (this.isLoading) return;
    this.isLoading = true;

    const display = document.getElementById('quran-ayah-display');
    const titleEl = document.getElementById('quran-surah-title');
    const pageNumEl = document.getElementById('quran-page-number');

    this.showReader();

    // Show clean loading state
    if (display) {
      display.innerHTML = `
        <div class="quran-loading">
          <div class="loading-spinner"></div>
          <p>جاري تحميل السورة الكريمة...</p>
        </div>
      `;
    }

    try {
      let surahData = null;

      // 1. Check IndexedDB cache first
      try {
        const cached = await this.storage.getItem('quran_cache', number);
        if (cached && cached.ayahs && cached.ayahs.length > 0) {
          surahData = cached;
        }
      } catch (cacheErr) {
        console.warn('Cache lookup notice:', cacheErr);
      }

      // 2. If not cached, fetch from AlQuran Cloud API (Uthmani edition)
      if (!surahData) {
        try {
          const res = await fetch(`https://api.alquran.cloud/v1/surah/${number}/quran-uthmani`);
          if (res.ok) {
            const json = await res.json();
            if (json.code === 200 && json.data) {
              surahData = json.data;
              // Cache locally into IndexedDB
              await this.storage.addItem('quran_cache', surahData).catch(() => {
                this.storage.updateItem('quran_cache', surahData).catch(() => {});
              });
            }
          }
        } catch (netErr) {
          console.warn('Network fetch failed:', netErr);
        }
      }

      // 3. If still not found, check offline fallbacks
      if (!surahData) {
        surahData = this.getOfflineFallbackSurah(number);
      }

      // 4. If completely unavailable (offline and not cached)
      if (!surahData || !surahData.ayahs || surahData.ayahs.length === 0) {
        const meta = this.surahList.find(s => s.number === number);
        const surahName = meta ? meta.name : `رقم ${number}`;
        if (titleEl) titleEl.textContent = `سورة ${surahName}`;

        if (display) {
          display.innerHTML = `
            <div class="empty-state quran-error-card card">
              <span style="font-size:3rem;margin-bottom:12px;">📶</span>
              <h3>سورة ${surahName} غير متوفرة دون اتصال</h3>
              <p>بيانات هذه السورة لم تُحمَّل بعد في الذاكرة المحلية. يُرجى الاتصال بالإنترنت مرة واحدة لتنزيلها وحفظها تلقائيًا للقراءة دون اتصال.</p>
              <button class="btn btn-primary" onclick="window.WardApp.quran.loadSurah(${number})">إعادة المحاولة 🔄</button>
            </div>
          `;
        }
        this.isLoading = false;
        return;
      }

      // Store current state
      this.currentSurah = surahData;
      this.currentSurahData = surahData;
      this.currentAyah = targetAyah;

      // Update Header Title
      if (titleEl) {
        titleEl.textContent = `سورة ${surahData.name.replace(/^سُورَةُ\s*/, '')}`;
      }

      // Update Page / Surah indicator
      if (pageNumEl) {
        pageNumEl.textContent = `السورة ${surahData.number} من 114 • ${surahData.numberOfAyahs} آية`;
      }

      // Render Ayahs in Mushaf style
      this.renderSurah(surahData, targetAyah);

      // Save position in settings and log to history
      this.savePosition(surahData.number, targetAyah);

      if (window.WardApp && window.WardApp.history) {
        window.WardApp.history.logActivity('quran', {
          description: `قراءة سورة ${surahData.name}`,
          surah: surahData.number,
          pages: 1
        });
      }

      // Smooth scroll to target ayah if > 1
      if (targetAyah > 1) {
        setTimeout(() => {
          const targetEl = document.getElementById(`ayah-${number}-${targetAyah}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.classList.add('highlight-ayah');
          }
        }, 150);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

    } catch (err) {
      console.error('loadSurah fatal error:', err);
      if (display) {
        display.innerHTML = `<div class="empty-state"><p>حدث خطأ غير متوقع أثناء تحميل السورة.</p></div>`;
      }
    } finally {
      this.isLoading = false;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Mushaf-Style Rendering Engine                                     */
  /* ------------------------------------------------------------------ */
  renderSurah(surahData, highlightAyah = 1) {
    const display = document.getElementById('quran-ayah-display');
    if (!display) return;

    display.style.fontSize = this.quranFontSize + 'px';

    const isSurahTawbah = surahData.number === 9;
    const isSurahFatiha = surahData.number === 1;

    let bismillahHtml = '';
    if (!isSurahTawbah && !isSurahFatiha) {
      bismillahHtml = `
        <div class="mushaf-bismillah">
          <span class="bismillah-ornament">﷽</span>
        </div>
      `;
    }

    // Build Ayahs text flow
    const ayahsHtml = surahData.ayahs.map(ayah => {
      let text = ayah.text || '';

      // AlQuran cloud Uthmani often prepends Bismillah to Ayah 1 (except Fatiha where it's verse 1)
      if (ayah.numberInSurah === 1 && !isSurahFatiha && !isSurahTawbah) {
        const bismillahClean = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
        if (text.startsWith(bismillahClean)) {
          text = text.substring(bismillahClean.length).trim();
        }
      }

      const ayahNumArabic = this.toArabicDigits(ayah.numberInSurah);

      return `
        <span class="mushaf-ayah ${ayah.numberInSurah === highlightAyah ? 'active-ayah' : ''}" 
              id="ayah-${surahData.number}-${ayah.numberInSurah}" 
              data-ayah="${ayah.numberInSurah}">
          ${text}
          <span class="ayah-marker" title="آية ${ayah.numberInSurah}">﴿${ayahNumArabic}﴾</span>
        </span>
      `;
    }).join(' ');

    display.innerHTML = `
      <div class="mushaf-page-frame">
        <div class="mushaf-header-surah-box">
          <span class="mushaf-surah-banner">${surahData.name}</span>
        </div>
        ${bismillahHtml}
        <div class="mushaf-text-block">
          ${ayahsHtml}
        </div>
      </div>
    `;

    // Click on Ayah to bookmark or mark position
    display.querySelectorAll('.mushaf-ayah').forEach(ayahSpan => {
      ayahSpan.addEventListener('click', () => {
        const ayahNum = parseInt(ayahSpan.dataset.ayah);
        this.savePosition(surahData.number, ayahNum);
        display.querySelectorAll('.mushaf-ayah').forEach(s => s.classList.remove('active-ayah'));
        ayahSpan.classList.add('active-ayah');
        if (window.WardApp) {
          window.WardApp.showToast(`تم حفظ الموضع: آية ${ayahNum}`);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Ayah Search within current Surah                                  */
  /* ------------------------------------------------------------------ */
  searchWithinAyahs(query) {
    if (!this.currentSurahData || !this.currentSurahData.ayahs) return;
    const q = (query || '').trim().toLowerCase();
    const display = document.getElementById('quran-ayah-display');
    if (!display) return;

    if (!q) {
      this.renderSurah(this.currentSurahData, this.currentAyah);
      return;
    }

    display.querySelectorAll('.mushaf-ayah').forEach(span => {
      const text = span.textContent.toLowerCase();
      if (text.includes(q)) {
        span.style.background = 'rgba(214, 180, 106, 0.35)';
        span.style.borderRadius = '6px';
        span.style.padding = '2px 4px';
      } else {
        span.style.background = 'transparent';
        span.style.padding = '0';
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Navigation & View Switching                                       */
  /* ------------------------------------------------------------------ */
  showSurahList() {
    const listView = document.getElementById('quran-surah-list-view');
    const readerView = document.getElementById('quran-reader-view');
    if (listView) listView.style.display = 'block';
    if (readerView) readerView.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showReader() {
    const listView = document.getElementById('quran-surah-list-view');
    const readerView = document.getElementById('quran-reader-view');
    if (listView) listView.style.display = 'none';
    if (readerView) readerView.style.display = 'block';
  }

  navigateSurah(direction) {
    if (!this.currentSurah) {
      this.loadSurah(1);
      return;
    }
    const target = this.currentSurah.number + direction;
    if (target >= 1 && target <= 114) {
      this.loadSurah(target);
    } else {
      if (window.WardApp) {
        window.WardApp.showToast(direction > 0 ? 'وصلت إلى آخر سورة في المصحف' : 'أنت في السورة الأولى');
      }
    }
  }

  changeFontSize(delta) {
    this.quranFontSize = Math.max(16, Math.min(42, this.quranFontSize + delta));
    this.storage.setSetting('quran_font_size', this.quranFontSize);
    const display = document.getElementById('quran-ayah-display');
    if (display) {
      display.style.fontSize = this.quranFontSize + 'px';
    }
  }

  savePosition(surahNumber, ayahNumber) {
    this.currentAyah = ayahNumber || 1;
    this.storage.setSetting('quran_position', JSON.stringify({
      surah: surahNumber,
      ayah: this.currentAyah,
      savedAt: new Date().toISOString()
    }));

    // Update continue reading button on home
    const continueBtn = document.getElementById('continue-reading-btn');
    if (continueBtn) {
      continueBtn.style.display = 'flex';
      const meta = this.surahList.find(s => s.number === surahNumber);
      const detailEl = continueBtn.querySelector('.continue-detail');
      if (detailEl && meta) {
        detailEl.textContent = `سورة ${meta.name} — آية ${this.currentAyah}`;
      }
    }
  }

  getLastPosition() {
    const pos = this.storage.getSetting('quran_position', null);
    if (!pos) return null;
    try {
      return typeof pos === 'string' ? JSON.parse(pos) : pos;
    } catch {
      return null;
    }
  }

  toArabicDigits(num) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/[0-9]/g, w => arabicDigits[+w]);
  }

  /* ------------------------------------------------------------------ */
  /*  Event Listeners                                                   */
  /* ------------------------------------------------------------------ */
  setupEventListeners() {
    // Surah search input
    const surahSearch = document.getElementById('surah-search-input');
    if (surahSearch) {
      surahSearch.addEventListener('input', (e) => {
        this.renderSurahList(e.target.value);
      });
    }

    // Back to list button
    const backBtn = document.getElementById('quran-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.showSurahList();
      });
    }

    // Previous / Next Surah
    const prevBtn = document.getElementById('quran-prev-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        // In Arabic RTL, "previous" button moves to surah - 1
        this.navigateSurah(-1);
      });
    }

    const nextBtn = document.getElementById('quran-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        // In Arabic RTL, "next" button moves to surah + 1
        this.navigateSurah(1);
      });
    }

    // Font size controls
    const increaseBtn = document.getElementById('quran-font-increase');
    if (increaseBtn) {
      increaseBtn.addEventListener('click', () => this.changeFontSize(2));
    }

    const decreaseBtn = document.getElementById('quran-font-decrease');
    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', () => this.changeFontSize(-2));
    }

    // Bookmark button
    const bookmarkBtn = document.getElementById('quran-bookmark-btn');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        if (!this.currentSurah) return;
        this.addBookmark(this.currentSurah.number, this.currentAyah, this.currentSurah.name);
      });
    }

    // Search Ayahs input
    const ayahSearch = document.getElementById('quran-search-ayah-input');
    if (ayahSearch) {
      ayahSearch.addEventListener('input', (e) => {
        this.searchWithinAyahs(e.target.value);
      });
    }
  }
}

window.QuranManager = QuranManager;

