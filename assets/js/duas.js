/**
 * DuasManager — Personal Supplications Manager for Wardi Pro
 * Fulfills all Master Prompt requirements:
 * - Complete ingestion of initial user transcript supplications without omission
 * - Separate storage for original transcript versions vs. vocalized/formatted versions
 * - Organization into 7 categories (Personal, Distress, Rizq, Answered, Quran, Salawat, General)
 * - Dedicated "أدعيتي الخاصة" view
 * - Full CRUD: Add, Read, Edit, Delete, Copy, Favorite, Search, and Repetition counter
 * - Synchronizes with IndexedDB ('duas' store)
 */
class DuasManager {
  constructor(storage) {
    this.storage = storage;
    this.allDuas = [];
    this.filteredDuas = [];
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.editingDuaId = null;

    // Category mapping between internal keys and Arabic display names
    this.categoryLabels = {
      'personal': 'أدعية شخصية',
      'distress': 'أدعية تفريج الهم',
      'rizq': 'أدعية الرزق',
      'answered': 'أدعية الاستجابة',
      'quran': 'أدعية القرآن',
      'salawat': 'الصلاة على النبي',
      'general': 'أدعية متنوعة'
    };
  }

  async init() {
    await this.checkAndLoadInitialData();
    await this.loadDuas();
    this.setupEventListeners();
  }

  /* ------------------------------------------------------------------ */
  /*  Initial Data Load from data/duas.json                             */
  /* ------------------------------------------------------------------ */
  async checkAndLoadInitialData() {
    try {
      const existing = await this.storage.getAllItems('duas');
      if (!existing || existing.length === 0) {
        await this.loadFromJSON();
      }
    } catch (err) {
      console.error('checkAndLoadInitialData error:', err);
      await this.loadFromJSON();
    }
  }

  async loadFromJSON() {
    try {
      const resp = await fetch('./data/duas.json');
      if (resp.ok) {
        const initialList = await resp.json();
        for (const dua of initialList) {
          await this.storage.addItem('duas', {
            ...dua,
            isFavorite: dua.isFavorite ?? true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } else {
        // Fallback directly if fetch fails (e.g. file:// protocol)
        await this.insertEmbeddedInitialDuas();
      }
    } catch (e) {
      console.warn('Loading duas.json via fetch failed, using embedded fallback:', e);
      await this.insertEmbeddedInitialDuas();
    }
  }

  /**
   * Embedded fallback guarantee: all Duas extracted from user transcript
   */
  async insertEmbeddedInitialDuas() {
    const transcriptDuas = [
      {
        text: "اللهم اني عبدك وابن عبدك وابن أمتك ناصيتي بيدك ماض فيا حكمك عدل فيا قضائك اسئلك بكل اسم هو لك سميت به نفسك أو علمته أحد من خلقك أو استأثرت به في علم الغيب عندك أن تجعل القرآن ربيع قلبي ونور صدري وجلاء حزني وذهاب همي",
        category: "distress",
        notes: "النسخة الأصلية من المحادثة كما وردت نصًا",
        isFavorite: true,
        repetitionCount: 1,
        source: "transcript_original"
      },
      {
        text: "اللهم إني عبدُك، ابنُ عبدِك، ابنُ أمتِك،\nناصيتي بيدِك،\nماضٍ فيَّ حكمُك،\nعدلٌ فيَّ قضاؤك،\n\nأسألك بكلِّ اسمٍ هو لك،\nسمَّيتَ به نفسَك،\nأو أنزلتَه في كتابك،\nأو علَّمتَه أحدًا من خلقك،\nأو استأثرتَ به في علم الغيب عندك،\n\nأن تجعل القرآن ربيعَ قلبي،\nونورَ صدري،\nوجلاءَ حزني،\nوذهابَ همّي.",
        category: "distress",
        notes: "الصيغة المُنقّحة والمُشكّلة — دعاء رفع الهم والحزن",
        isFavorite: true,
        repetitionCount: 1,
        source: "transcript_vocalized"
      },
      {
        text: "اللهم إني أسألك من فضلك و رحمتك فانه لا يملكها إلا انت اللهم إني أسألك من فضلك و رحمتك فانه لا يملكها إلا انت اللهم إني أسألك من فضلك و رحمتك فانه لا يملكها إلا انت",
        category: "rizq",
        notes: "النسخة الأصلية من المحادثة — مكررة ثلاث مرات كما كُتبت",
        isFavorite: true,
        repetitionCount: 3,
        source: "transcript_original"
      },
      {
        text: "اللهم إني أسألك من فضلك ورحمتك، فإنه لا يملكها إلا أنت.",
        category: "rizq",
        notes: "الصيغة المُنقّحة — تُقال ثلاث مرات لطلب الفضل والرزق والرحمة",
        isFavorite: true,
        repetitionCount: 3,
        source: "transcript_vocalized"
      },
      {
        text: "نسأل الله أن يفتح لك أبواب فضله، ويغنيك بحلاله عن حرامه، وبفضله عمَّن سواه، ويرزقك من حيث لا تحتسب. آمين.",
        category: "rizq",
        notes: "دعاء الاستفتاح والرزق بالفضل والبركة — من ختام المحادثة",
        isFavorite: true,
        repetitionCount: 1,
        source: "transcript_closing"
      },
      {
        text: "ربنا يريح قلبك ويشرح صدرك ويجعل القرآن نور حياتك.",
        category: "personal",
        notes: "دعاء انشراح الصدر وطمأنينة القلب ونور القرآن — من دعاء المحادثة",
        isFavorite: true,
        repetitionCount: 1,
        source: "transcript_blessing"
      }
    ];

    for (const d of transcriptDuas) {
      await this.storage.addItem('duas', {
        ...d,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Data Management & Filtering                                       */
  /* ------------------------------------------------------------------ */
  async loadDuas() {
    try {
      this.allDuas = await this.storage.getAllItems('duas');
      this.applyFilterAndSearch();
    } catch (err) {
      console.error('loadDuas error:', err);
    }
  }

  applyFilterAndSearch() {
    let result = [...this.allDuas];

    // Filter by Category
    if (this.currentCategory !== 'all') {
      result = result.filter(d => {
        const cat = d.category || '';
        const mappedLabel = this.categoryLabels[this.currentCategory] || '';
        return cat === this.currentCategory || cat === mappedLabel;
      });
    }

    // Filter by Search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(d => {
        const text = (d.text || '').toLowerCase();
        const notes = (d.notes || '').toLowerCase();
        return text.includes(q) || notes.includes(q);
      });
    }

    // Sort: favorites first, then newest
    result.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });

    this.filteredDuas = result;
    this.renderDuas(result);
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering Engine                                                  */
  /* ------------------------------------------------------------------ */
  renderDuas(duas) {
    const container = document.getElementById('duas-list-container');
    if (!container) return;

    if (!duas || duas.length === 0) {
      const lang = window.WardApp?.currentLang || 'ar';
      container.innerHTML = `
        <div class="empty-state card" style="text-align:center;padding:40px 20px;">
          <span style="font-size:3rem;display:block;margin-bottom:12px;">🤲</span>
          <p>${lang === 'ar' ? 'لا توجد أدعية مطابقة' : 'No duas found'}</p>
          <button class="btn btn-primary" onclick="window.WardApp.duas.showAddModal()" style="margin-top:16px;">
            ${lang === 'ar' ? '+ إضافة دعاء جديد' : '+ Add New Dua'}
          </button>
        </div>
      `;
      return;
    }

    // Header banner indicating "أدعيتي الخاصة"
    const isPersonalFilter = this.currentCategory === 'personal' || this.currentCategory === 'all';

    let headerHtml = '';
    if (this.currentCategory === 'all') {
      headerHtml = `
        <div class="duas-section-header-banner">
          <span class="banner-title">✨ أدعيتي الخاصة والمسنونة (${duas.length})</span>
        </div>
      `;
    }

    const cardsHtml = duas.map(dua => {
      const catLabel = this.getCategoryDisplayName(dua.category);
      const isFav = !!dua.isFavorite;
      const rep = dua.repetitionCount || 1;

      return `
        <div class="dua-card card" data-id="${dua.id}" id="dua-card-${dua.id}">
          <div class="dua-card-header">
            <span class="dua-category-badge badge">${catLabel}</span>
            <div class="dua-card-actions">
              <button class="btn-icon dua-fav-btn ${isFav ? 'active' : ''}" data-id="${dua.id}" title="${isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}">
                ${isFav ? '★' : '☆'}
              </button>
              <button class="btn-icon dua-copy-btn" data-id="${dua.id}" title="نسخ نص الدعاء">
                📋
              </button>
              <button class="btn-icon dua-edit-btn" data-id="${dua.id}" title="تعديل">
                ✏️
              </button>
              <button class="btn-icon dua-delete-btn" data-id="${dua.id}" title="حذف">
                🗑️
              </button>
            </div>
          </div>

          <div class="dua-body">
            <p class="dua-text">${this.formatDuaText(dua.text)}</p>
          </div>

          ${dua.notes ? `
            <div class="dua-notes-box">
              <span class="notes-icon">📌</span>
              <span class="notes-text">${this._escapeHTML(dua.notes)}</span>
            </div>
          ` : ''}

          <div class="dua-footer">
            ${rep > 1 ? `
              <span class="dua-repeat-badge" title="يُستحب تكراره ${rep} مرات">
                تكرار: ${rep} مرات
              </span>
            ` : '<span class="dua-repeat-badge">مرة واحدة</span>'}

            <button class="btn btn-secondary dua-tasbeeh-btn" data-id="${dua.id}" title="انقل هذا الدعاء لعداد التسبيح">
              عدّ بالتسبيح 📿
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = headerHtml + cardsHtml;

    // Attach Action Listeners
    container.querySelectorAll('.dua-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        this.toggleFavorite(id);
      });
    });

    container.querySelectorAll('.dua-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const dua = this.allDuas.find(d => d.id === id);
        if (dua) this.copyDuaText(dua.text);
      });
    });

    container.querySelectorAll('.dua-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const dua = this.allDuas.find(d => d.id === id);
        if (dua) this.showEditModal(dua);
      });
    });

    container.querySelectorAll('.dua-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        this.deleteDua(id);
      });
    });

    container.querySelectorAll('.dua-tasbeeh-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const dua = this.allDuas.find(d => d.id === id);
        if (dua && window.WardApp && window.WardApp.tasbeeh) {
          window.WardApp.tasbeeh.setPhrase(dua.text, dua.repetitionCount || 33);
          window.WardApp.navigateTo('tasbeeh');
          window.WardApp.showToast('تم نقل الدعاء إلى عداد التسبيح');
        }
      });
    });
  }

  getCategoryDisplayName(catKey) {
    if (!catKey) return 'أدعية عامة';
    if (this.categoryLabels[catKey]) return this.categoryLabels[catKey];
    return catKey;
  }

  formatDuaText(text) {
    if (!text) return '';
    return this._escapeHTML(text).replace(/\n/g, '<br>');
  }

  _escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ------------------------------------------------------------------ */
  /*  CRUD Actions                                                      */
  /* ------------------------------------------------------------------ */
  showAddModal() {
    this.editingDuaId = null;
    const modalTitle = document.getElementById('dua-modal-title');
    const textInput = document.getElementById('dua-text-input');
    const catSelect = document.getElementById('dua-category-select');
    const notesInput = document.getElementById('dua-notes-input');
    const repInput = document.getElementById('dua-repetition-input');
    const delBtn = document.getElementById('dua-delete-btn');

    if (modalTitle) modalTitle.textContent = window.WardApp?.currentLang === 'ar' ? 'إضافة دعاء جديد' : 'Add New Dua';
    if (textInput) textInput.value = '';
    if (catSelect) catSelect.value = this.currentCategory !== 'all' ? this.currentCategory : 'personal';
    if (notesInput) notesInput.value = '';
    if (repInput) repInput.value = 1;
    if (delBtn) delBtn.style.display = 'none';

    this.openModal();
  }

  showEditModal(dua) {
    this.editingDuaId = dua.id;
    const modalTitle = document.getElementById('dua-modal-title');
    const textInput = document.getElementById('dua-text-input');
    const catSelect = document.getElementById('dua-category-select');
    const notesInput = document.getElementById('dua-notes-input');
    const repInput = document.getElementById('dua-repetition-input');
    const delBtn = document.getElementById('dua-delete-btn');

    if (modalTitle) modalTitle.textContent = window.WardApp?.currentLang === 'ar' ? 'تعديل الدعاء' : 'Edit Dua';
    if (textInput) textInput.value = dua.text || '';

    // Set matching option in select
    if (catSelect) {
      let matchedVal = 'personal';
      for (const opt of catSelect.options) {
        if (opt.value === dua.category || opt.textContent.trim() === dua.category) {
          matchedVal = opt.value;
          break;
        }
      }
      catSelect.value = matchedVal;
    }

    if (notesInput) notesInput.value = dua.notes || '';
    if (repInput) repInput.value = dua.repetitionCount || 1;
    if (delBtn) delBtn.style.display = 'inline-flex';

    this.openModal();
  }

  openModal(duaOrId) {
    if (duaOrId) {
      if (typeof duaOrId === 'object') {
        this.showEditModal(duaOrId);
        return;
      }
      const found = this.allDuas.find(d => d.id === duaOrId);
      if (found) {
        this.showEditModal(found);
        return;
      }
    }
    const modal = document.getElementById('dua-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal) {
      modal.style.display = 'block';
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
    }
    if (overlay) {
      overlay.style.display = 'block';
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
    }
    // Auto-focus input
    setTimeout(() => {
      const textInput = document.getElementById('dua-text-input');
      if (textInput) {
        textInput.focus();
        textInput.classList.remove('input-error');
      }
    }, 120);
  }

  closeModal() {
    const modal = document.getElementById('dua-modal');
    const overlay = document.getElementById('modal-overlay');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    }
    const textInput = document.getElementById('dua-text-input');
    if (textInput) textInput.classList.remove('input-error');
    this.editingDuaId = null;
  }

  async saveDuaFromModal() {
    const textInput = document.getElementById('dua-text-input');
    const catSelect = document.getElementById('dua-category-select');
    const notesInput = document.getElementById('dua-notes-input');
    const repInput = document.getElementById('dua-repetition-input');

    const text = (textInput?.value || '').trim();
    if (!text) {
      if (textInput) {
        textInput.classList.add('input-error');
        textInput.focus();
      }
      if (window.WardApp) {
        window.WardApp.showToast('يرجى كتابة نص الدعاء المبارك أولاً', 'error');
      }
      return;
    }

    const categoryKey = catSelect?.value || 'personal';
    const notes = (notesInput?.value || '').trim();
    const repetition = Math.max(1, parseInt(repInput?.value) || 1);

    try {
      if (this.editingDuaId) {
        // Edit existing
        const existing = this.allDuas.find(d => d.id === this.editingDuaId);
        const updated = {
          ...existing,
          text,
          category: categoryKey,
          notes,
          repetitionCount: repetition,
          updatedAt: new Date().toISOString()
        };
        await this.storage.updateItem('duas', updated);
        if (window.WardApp) window.WardApp.showToast('تم حفظ تعديل الدعاء بنجاح ✨');
      } else {
        // Create new
        const newDua = {
          text,
          category: categoryKey,
          notes,
          repetitionCount: repetition,
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await this.storage.addItem('duas', newDua);
        if (window.WardApp) window.WardApp.showToast('تمت إضافة الدعاء إلى قائمتك بنجاح 🤲');
      }

      this.closeModal();
      await this.loadDuas();

      // Log in history
      if (window.WardApp && window.WardApp.history) {
        await window.WardApp.history.logActivity('dua', {
          description: `حفظ دعاء: ${text.substring(0, 32)}...`
        });
      }

      // Update dashboard
      if (window.WardApp && typeof window.WardApp.updateDashboard === 'function') {
        await window.WardApp.updateDashboard();
      }
    } catch (err) {
      console.error('saveDua error:', err);
      if (window.WardApp) window.WardApp.showToast('تعذر حفظ الدعاء في الذاكرة المحلية', 'error');
    }
  }

  async deleteDua(id) {
    const lang = window.WardApp?.currentLang || 'ar';
    const msg = lang === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذا الدعاء نهائياً؟' : 'Are you sure you want to delete this dua?';
    if (!confirm(msg)) return;

    try {
      await this.storage.deleteItem('duas', id);
      this.closeModal();
      await this.loadDuas();
      if (window.WardApp) {
        window.WardApp.showToast(lang === 'ar' ? 'تم حذف الدعاء بنجاح 🗑️' : 'Dua deleted');
        if (typeof window.WardApp.updateDashboard === 'function') {
          await window.WardApp.updateDashboard();
        }
      }
    } catch (err) {
      console.error('deleteDua error:', err);
      if (window.WardApp) window.WardApp.showToast('تعذر حذف الدعاء', 'error');
    }
  }

  async toggleFavorite(id) {
    try {
      const dua = this.allDuas.find(d => d.id === id);
      if (!dua) return;

      dua.isFavorite = !dua.isFavorite;
      dua.updatedAt = new Date().toISOString();
      await this.storage.updateItem('duas', dua);
      this.applyFilterAndSearch();

      if (window.WardApp) {
        window.WardApp.showToast(dua.isFavorite ? 'أُضيف إلى المفضلة ★' : 'أُزيل من المفضلة ☆');
        // Refresh home favorites widget
        window.WardApp.loadHomeFavorites();
      }
    } catch (err) {
      console.error('toggleFavorite error:', err);
    }
  }

  copyDuaText(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.WardApp) window.WardApp.showToast('تم نسخ نص الدعاء 📋');
      }).catch(() => this._fallbackCopy(text));
    } else {
      this._fallbackCopy(text);
    }
  }

  _fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      if (window.WardApp) window.WardApp.showToast('تم نسخ نص الدعاء 📋');
    } catch (err) {
      console.error('Copy fallback failed:', err);
    }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------------ */
  /*  Event Listeners                                                   */
  /* ------------------------------------------------------------------ */
  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('duas-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target.value || '').trim();
        this.applyFilterAndSearch();
      });
    }

    // Category pills filter
    const filterContainer = document.getElementById('duas-category-filter');
    if (filterContainer) {
      filterContainer.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          filterContainer.querySelectorAll('.filter-pill').forEach(p => {
            p.classList.remove('active');
            p.setAttribute('aria-selected', 'false');
          });
          pill.classList.add('active');
          pill.setAttribute('aria-selected', 'true');
          this.currentCategory = pill.dataset.category || 'all';
          this.applyFilterAndSearch();
        });
      });
    }

    // Add FAB button
    const addBtn = document.getElementById('duas-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddModal());
    }

    // Save modal button
    const saveBtn = document.getElementById('dua-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveDuaFromModal());
    }

    // Cancel / close modal buttons (handles both header close button and footer cancel button)
    document.querySelectorAll('.dua-close-modal, #dua-cancel-btn, #dua-close-modal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeModal();
      });
    });

    // Delete modal button
    const deleteBtn = document.getElementById('dua-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.editingDuaId) this.deleteDua(this.editingDuaId);
      });
    }

    // Close modal on backdrop click
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeModal());
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('dua-modal');
        if (modal && modal.style.display !== 'none') {
          this.closeModal();
        }
      }
    });
  }
}

window.DuasManager = DuasManager;

