const UI_STRINGS = {
  ru: {
    searchPlaceholder: 'Поиск функций...',
    sectionsTitle: 'Разделы',
    sourceCode: 'Исходный код',
    contributors: 'Авторы',
    noFunctions: 'Функции не найдены',
    loading: 'Загрузка...',
    error: 'Ошибка загрузки данных',
  },
  en: {
    searchPlaceholder: 'Search functions...',
    sectionsTitle: 'Sections',
    sourceCode: 'Source code',
    contributors: 'Contributors',
    noFunctions: 'No functions found',
    loading: 'Loading...',
    error: 'Error loading data',
  }
};

class CryptoDocApp {
  constructor() {
    this.currentLang = localStorage.getItem('crypto-docs-lang') || 'en';
    this.currentTheme = localStorage.getItem('crypto-docs-theme') || 'dark';
    this.data = null;
    this.activeSectionId = null;

    this.sidebar = document.getElementById('sidebar');
    this.menuToggle = document.getElementById('menu-toggle');
    this.searchInput = document.getElementById('search-input');
    this.themeBtn = document.getElementById('theme-btn');
    this.langBtn = document.getElementById('lang-btn');
    this.langLabel = document.getElementById('lang-label');
    this.sectionNav = document.getElementById('section-nav');
    this.mainContent = document.getElementById('main-content');

    this.init();
  }

  init() {
    this.applyTheme();
    this.applyLanguage();

    this.menuToggle.addEventListener('click', () => this.toggleSidebar());
    this.searchInput.addEventListener('input', () => this.handleSearch());
    this.themeBtn.addEventListener('click', () => this.toggleTheme());
    this.langBtn.addEventListener('click', () => this.toggleLanguage());

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && this.sidebar.classList.contains('open')) {
        if (!this.sidebar.contains(e.target) && e.target !== this.menuToggle && !this.menuToggle.contains(e.target)) {
          this.sidebar.classList.remove('open');
        }
      }
    });

    this.loadData();
  }

  async loadData() {
    try {
      const response = await fetch('./data/functions.json');
      if (!response.ok) throw new Error('functions.json not found');
      this.data = await response.json();
      this.renderAll();
      this.observeSections();
    } catch (error) {
      this.mainContent.innerHTML = `<p>${UI_STRINGS[this.currentLang].error}</p>`;
    }
  }

  renderAll() {
    this.renderNavigation();
    this.renderSections();
  }

  renderNavigation() {
    if (!this.data || !this.data.sections) return;
    const t = UI_STRINGS[this.currentLang];
    let html = `<h2>${t.sectionsTitle}</h2><ul class="nav-list">`;
    this.data.sections.forEach(section => {
      html += `
        <li>
          <a href="#section-${section.id}" class="nav-link" data-section="${section.id}">
            <span class="material-icons">category</span>
            ${section.name[this.currentLang]}
          </a>
        </li>`;
    });
    html += `</ul>`;
    this.sectionNav.innerHTML = html;

    this.sectionNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        this.setActiveNav(link.dataset.section);
        if (window.innerWidth <= 768) this.sidebar.classList.remove('open');
      });
    });
  }

  setActiveNav(sectionId) {
    this.sectionNav.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionId);
    });
    this.activeSectionId = sectionId;
  }

  renderSections() {
    if (!this.data || !this.data.sections) return;
    const lang = this.currentLang;
    const t = UI_STRINGS[lang];
    let html = '';

    this.data.sections.forEach(section => {
      html += `<section id="section-${section.id}" class="section">
        <div class="section-header">
          <h2>${section.name[lang]}</h2>
        </div>
        <div class="functions-grid">`;

      if (!section.functions || section.functions.length === 0) {
        html += `<p>${t.noFunctions}</p>`;
      } else {
        section.functions.forEach(func => {
          html += this.renderFunctionCard(func);
        });
      }

      html += `</div></section>`;
    });

    this.mainContent.innerHTML = html;
  }

  renderFunctionCard(func) {
    const lang = this.currentLang;
    const t = UI_STRINGS[lang];
    const name = func.name[lang] || '';
    const desc = func.description[lang] || '';
    const tags = func.tags || [];
    const metadata = func.metadata;
    const contributors = func.contributors || [];

    return `
      <article class="function-card" data-function-id="${func.id}" data-search-content="${this.getSearchText(func)}">
        <div class="card-title">
          ${this.escapeHtml(name)}
          ${metadata && metadata.crypto_version ? `<span class="badge">${this.escapeHtml(metadata.crypto_version)}</span>` : ''}
        </div>
        <div class="metadata">
          <span title="Author"><span class="material-icons">person</span>${metadata ? this.escapeHtml(metadata.author || '—') : '—'}</span>
          <span title="OS version"><span class="material-icons">package</span>${metadata ? this.escapeHtml(metadata.os_version || '—') : '—'}</span>
        </div>
        <p class="description">${this.escapeHtml(desc)}</p>
        ${func.code_snippet ? `<div class="code-block"><pre>${this.escapeHtml(func.code_snippet)}</pre></div>` : ''}
        ${tags.length ? `<div class="tags">${tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        ${func.implementation_url ? `<a href="${this.escapeHtml(func.implementation_url)}" target="_blank" rel="noopener" class="source-link"><span class="material-icons">open_in_new</span>${t.sourceCode}</a>` : ''}
        ${contributors.length ? `
          <div class="contributors">
            <span class="contributors-label">${t.contributors}:</span>
            ${contributors.map(user => `
              <a href="https://github.com/${this.escapeHtml(user)}" target="_blank" rel="noopener" title="@${this.escapeHtml(user)}">
                <img class="contributor-avatar" src="https://github.com/${this.escapeHtml(user)}.png" alt="${this.escapeHtml(user)}" loading="lazy">
              </a>
            `).join('')}
          </div>` : ''}
      </article>
    `;
  }

  getSearchText(func) {
    const ruName = (func.name.ru || '').toLowerCase();
    const enName = (func.name.en || '').toLowerCase();
    const ruDesc = (func.description.ru || '').toLowerCase();
    const enDesc = (func.description.en || '').toLowerCase();
    const tags = (func.tags || []).join(' ').toLowerCase();
    return `${ruName} ${enName} ${ruDesc} ${enDesc} ${tags}`;
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  handleSearch() {
    const query = this.searchInput.value.toLowerCase().trim();
    const cards = this.mainContent.querySelectorAll('.function-card');
    cards.forEach(card => {
      const data = card.getAttribute('data-search-content') || '';
      card.classList.toggle('hidden', query !== '' && !data.includes(query));
    });
    this.mainContent.querySelectorAll('.section').forEach(section => {
      const visible = section.querySelectorAll('.function-card:not(.hidden)');
      section.classList.toggle('hidden', visible.length === 0);
    });
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('crypto-docs-theme', this.currentTheme);
    this.applyTheme();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    const icon = this.themeBtn.querySelector('.material-icons');
    if (icon) icon.textContent = this.currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
  }

  toggleLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'ru' : 'en';
    localStorage.setItem('crypto-docs-lang', this.currentLang);
    this.applyLanguage();
    if (this.data) this.renderAll();
  }

  applyLanguage() {
    this.langLabel.textContent = this.currentLang.toUpperCase();
    const t = UI_STRINGS[this.currentLang];
    this.searchInput.placeholder = t.searchPlaceholder;
  }

  toggleSidebar() {
    this.sidebar.classList.toggle('open');
  }

  observeSections() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace('section-', '');
          this.setActiveNav(id);
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('.section').forEach(section => observer.observe(section));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CryptoDocApp();
});
