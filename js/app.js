import { fetchRecentCommits, renderCommits } from './github-api.js';

/**
 * Менеджер локализации интерфейса (статичные строки)
 */
const UI_STRINGS = {
  ru: {
    searchPlaceholder: 'Поиск функций...',
    sectionsTitle: 'Разделы',
    recentChanges: 'Последние изменения',
    sourceCode: 'Исходный код',
    contributors: 'Авторы',
    noFunctions: 'Функции не найдены',
  },
  en: {
    searchPlaceholder: 'Search functions...',
    sectionsTitle: 'Sections',
    recentChanges: 'Recent changes',
    sourceCode: 'Source code',
    contributors: 'Contributors',
    noFunctions: 'No functions found',
  }
};

/**
 * Главный класс приложения
 */
class CryptoDocApp {
  constructor() {
    // Состояние
    this.currentLang = localStorage.getItem('crypto-docs-lang') || 'en';
    this.currentTheme = localStorage.getItem('crypto-docs-theme') || 'dark';
    this.data = null;            // загруженный JSON
    this.activeSection = null;   // для подсветки в навигации

    // DOM элементы
    this.sidebar = document.getElementById('sidebar');
    this.menuToggle = document.getElementById('menu-toggle');
    this.searchInput = document.getElementById('search-input');
    this.themeBtn = document.getElementById('theme-btn');
    this.langBtn = document.getElementById('lang-btn');
    this.langLabel = document.getElementById('lang-label');
    this.sectionNav = document.getElementById('section-nav');
    this.mainContent = document.getElementById('main-content');
    this.commitsList = document.getElementById('commits-list');

    this.init();
  }

  init() {
    // Применяем сохранённые тему и язык
    this.applyTheme();
    this.applyLanguage();

    // Обработчики
    this.menuToggle.addEventListener('click', () => this.toggleSidebar());
    this.searchInput.addEventListener('input', () => this.handleSearch());
    this.themeBtn.addEventListener('click', () => this.toggleTheme());
    this.langBtn.addEventListener('click', () => this.toggleLanguage());

    // Закрываем сайдбар при клике вне его (на мобильных)
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && this.sidebar.classList.contains('open')) {
        if (!this.sidebar.contains(e.target) && e.target !== this.menuToggle && !this.menuToggle.contains(e.target)) {
          this.sidebar.classList.remove('open');
        }
      }
    });

    // Загружаем данные и рендерим
    this.loadData();
  }

  async loadData() {
    try {
      const response = await fetch('/data/functions.json');
      if (!response.ok) throw new Error('Failed to load documentation data');
      this.data = await response.json();
      this.renderAll();
      this.loadGitHubCommits();
      // После рендера можно активировать IntersectionObserver для подсветки секций
      this.observeSections();
    } catch (error) {
      this.mainContent.innerHTML = `<p>Error loading documentation. Please check that the JSON file exists.</p>`;
      console.error(error);
    }
  }

  renderAll() {
    this.renderNavigation();
    this.renderSections();
  }

  /* ========== Навигация ========== */
  renderNavigation() {
    if (!this.data) return;
    const t = UI_STRINGS[this.currentLang];
    const sections = this.data.sections;

    const navHtml = `
      <h2>${t.sectionsTitle}</h2>
      <ul class="nav-list">
        ${sections.map(section => `
          <li>
            <a href="#section-${section.id}" class="nav-link" data-section="${section.id}">
              <span class="material-icons">category</span>
              ${section.name[this.currentLang]}
            </a>
          </li>
        `).join('')}
      </ul>
    `;
    this.sectionNav.innerHTML = navHtml;

    // Подсветка активного пункта при клике
    this.sectionNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        // Убираем активный класс у всех
        this.sectionNav.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        // На мобильных закрываем сайдбар
        if (window.innerWidth <= 768) {
          this.sidebar.classList.remove('open');
        }
      });
    });
  }

  /* ========== Основной контент ========== */
  renderSections() {
    if (!this.data) return;
    let html = '';
    const t = UI_STRINGS[this.currentLang];
    const lang = this.currentLang;

    this.data.sections.forEach(section => {
      html += `<section id="section-${section.id}" class="section">
        <div class="section-header">
          <h2>${section.name[lang]}</h2>
        </div>
        <div class="functions-grid">`;

      section.functions.forEach(func => {
        html += this.renderFunctionCard(func);
      });

      html += `</div></section>`;
    });

    this.mainContent.innerHTML = html;
  }

  renderFunctionCard(func) {
    const lang = this.currentLang;
    const t = UI_STRINGS[this.currentLang];
    const name = func.name[lang];
    const desc = func.description[lang];
    const tags = func.tags || [];
    const metadata = func.metadata;
    const contributors = func.contributors || [];

    // Карточка со всеми полями
    return `
      <article class="function-card" data-function-id="${func.id}" data-search-content="${this.getSearchText(func)}">
        <div class="card-title">
          ${name}
          ${metadata.crypto_version ? `<span class="badge">${metadata.crypto_version}</span>` : ''}
        </div>

        <div class="metadata">
          <span title="Author"><span class="material-icons">person</span>${metadata.author || '—'}</span>
          <span title="Realix version"><span class="material-icons">package</span>${metadata.os_version || '—'}</span>
        </div>

        <p class="description">${desc}</p>

        ${func.code_snippet ? `
        <div class="code-block">
          <pre>${this.escapeHtml(func.code_snippet)}</pre>
        </div>` : ''}

        ${tags.length > 0 ? `
        <div class="tags">
          ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>` : ''}

        ${func.implementation_url ? `
        <a href="${func.implementation_url}" target="_blank" rel="noopener" class="source-link">
          <span class="material-icons">open_in_new</span>
          ${t.sourceCode}
        </a>` : ''}

        ${contributors.length > 0 ? `
        <div class="contributors">
          <span class="contributors-label">${t.contributors}:</span>
          ${contributors.map(user => `
            <a href="https://github.com/${user}" target="_blank" rel="noopener" title="@${user}">
              <img class="contributor-avatar" src="https://github.com/${user}.png" alt="${user}" loading="lazy">
            </a>
          `).join('')}
        </div>` : ''}
      </article>
    `;
  }

  /* Вспомогательная функция: собираем весь поисковый текст */
  getSearchText(func) {
    const ruName = func.name.ru || '';
    const enName = func.name.en || '';
    const ruDesc = func.description.ru || '';
    const enDesc = func.description.en || '';
    const tags = (func.tags || []).join(' ');
    return `${ruName} ${enName} ${ruDesc} ${enDesc} ${tags}`.toLowerCase();
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ========== Поиск ========== */
  handleSearch() {
    const query = this.searchInput.value.toLowerCase().trim();
    const cards = this.mainContent.querySelectorAll('.function-card');

    cards.forEach(card => {
      const searchData = card.getAttribute('data-search-content') || '';
      if (query === '' || searchData.includes(query)) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });

    // Скрываем секции, в которых не осталось видимых карточек (опционально)
    const sections = this.mainContent.querySelectorAll('.section');
    sections.forEach(section => {
      const visibleCards = section.querySelectorAll('.function-card:not(.hidden)');
      if (visibleCards.length === 0) {
        section.classList.add('hidden');
      } else {
        section.classList.remove('hidden');
      }
    });
  }

  /* ========== Смена темы ========== */
  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('crypto-docs-theme', this.currentTheme);
    this.applyTheme();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    const icon = this.themeBtn.querySelector('.material-icons');
    if (icon) {
      icon.textContent = this.currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
    }
  }

  /* ========== Локализация ========== */
  toggleLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'ru' : 'en';
    localStorage.setItem('crypto-docs-lang', this.currentLang);
    this.applyLanguage();
    // Перерендер всех динамических элементов
    if (this.data) {
      this.renderAll();
      // Также перезагружаем коммиты (текст виджета на нужном языке)
      this.loadGitHubCommits();
    }
  }

  applyLanguage() {
    this.langLabel.textContent = this.currentLang.toUpperCase();
    // Обновляем статичные строки интерфейса
    const t = UI_STRINGS[this.currentLang];
    this.searchInput.placeholder = t.searchPlaceholder;
    // Заголовок виджета «Recent changes» обновится при перерендере коммитов
  }

  /* ========== GitHub API ========== */
  async loadGitHubCommits() {
    const commits = await fetchRecentCommits();
    renderCommits(this.commitsList, commits);
    // Обновляем заголовок виджета на текущий язык
    const widgetTitle = this.commitsList.parentElement.querySelector('.widget-title');
    if (widgetTitle) {
      const t = UI_STRINGS[this.currentLang];
      widgetTitle.innerHTML = `<span class="material-icons">commit</span> ${t.recentChanges}`;
    }
  }

  /* ========== Мобильное меню ========== */
  toggleSidebar() {
    this.sidebar.classList.toggle('open');
  }

  /* ========== Intersection Observer для активной секции ========== */
  observeSections() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const id = entry.target.id;
        const link = this.sectionNav.querySelector(`[data-section="${id.replace('section-', '')}"]`);
        if (link) {
          if (entry.isIntersecting) {
            this.sectionNav.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          }
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.section').forEach(section => observer.observe(section));
  }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  new CryptoDocApp();
});
