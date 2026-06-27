class CryptoDocApp {
  constructor() {
    this.state = {
      sections: [],
      functions: {},
      currentView: null,
      searchQuery: '',
    };
    this.cache = {
      sectionNav: document.getElementById('section-nav'),
      mainContent: document.getElementById('main-content'),
      searchInput: document.getElementById('search-input'),
      sidebar: document.getElementById('sidebar'),
      menuToggle: document.getElementById('menu-toggle'),
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadData().then(() => {
      this.handleRoute();
      window.addEventListener('hashchange', () => this.handleRoute());
    });
  }

  bindEvents() {
    this.cache.menuToggle.addEventListener('click', () => {
      this.cache.sidebar.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && this.cache.sidebar.classList.contains('open')) {
        if (!this.cache.sidebar.contains(e.target) && e.target !== this.cache.menuToggle && !this.cache.menuToggle.contains(e.target)) {
          this.cache.sidebar.classList.remove('open');
        }
      }
    });
    this.cache.searchInput.addEventListener('input', (e) => {
      this.state.searchQuery = e.target.value.trim().toLowerCase();
      if (this.state.searchQuery) {
        window.location.hash = '#/';
      } else {
        window.location.hash = window.location.hash || '#/';
      }
      this.renderView();
    });
  }

  async loadData() {
    try {
      const listRes = await fetch('./data/sections-list.json');
      const sectionIds = await listRes.json();
      const sections = [];
      const functions = {};
      for (const id of sectionIds) {
        const secRes = await fetch(`./data/sections/${id}.json`);
        const sec = await secRes.json();
        sections.push(sec);
        for (const funcId of sec.functions) {
          if (!functions[funcId]) {
            const funcRes = await fetch(`./data/functions/${funcId}.json`);
            functions[funcId] = await funcRes.json();
          }
        }
      }
      this.state.sections = sections;
      this.state.functions = functions;
    } catch (err) {
      console.error('Data loading error:', err);
      this.cache.mainContent.innerHTML = '<p>Error loading documentation.</p>';
    }
  }

  getRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);
    if (parts.length === 0) return { page: 'home' };
    if (parts[0] === 'section' && parts[1]) return { page: 'section', id: parts[1] };
    if (parts[0] === 'function' && parts[1]) return { page: 'function', id: parts[1] };
    return { page: 'home' };
  }

  handleRoute() {
    const route = this.getRoute();
    if (route.page === 'function' || route.page === 'section') {
      this.state.searchQuery = '';
      this.cache.searchInput.value = '';
    }
    this.renderView();
  }

  renderView() {
    const route = this.getRoute();
    const query = this.state.searchQuery;

    if (query && route.page === 'home') {
      this.renderSearchResults(query);
      this.renderSidebar(route);
      return;
    }

    switch (route.page) {
      case 'home': this.renderHome(); break;
      case 'section': this.renderSection(route.id); break;
      case 'function': this.renderFunction(route.id); break;
      default: this.renderHome();
    }
    this.renderSidebar(route);
    if (window.innerWidth <= 768) this.cache.sidebar.classList.remove('open');

    if (window.hljs) {
      document.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }
  }

  renderSidebar(route) {
    const nav = this.cache.sectionNav;
    let html = `<a class="home-link" href="#/"><span class="home-icon">⌂</span>Home</a>`;
    html += `<h2>Sections</h2><ul class="nav-list">`;
    this.state.sections.forEach(section => {
      const isActive = (route.page === 'section' && route.id === section.id) || 
                       (route.page === 'function' && this.getSectionOfFunction(route.id) === section.id);
      html += `<li class="nav-section ${isActive ? 'open' : ''}">`;
      html += `<a href="#/section/${section.id}" class="nav-section-header ${isActive ? 'active' : ''}">⚙ ${section.name}</a>`;
      html += `<ul class="nav-functions">`;
      section.functions.forEach(funcId => {
        const func = this.state.functions[funcId];
        if (func) {
          const isFuncActive = route.page === 'function' && route.id === funcId;
          html += `<li><a href="#/function/${funcId}" class="nav-function-link ${isFuncActive ? 'active' : ''}">${func.name}</a></li>`;
        }
      });
      html += `</ul></li>`;
    });
    html += `</ul>`;
    nav.innerHTML = html;
  }

  getSectionOfFunction(funcId) {
    for (const sec of this.state.sections) {
      if (sec.functions.includes(funcId)) return sec.id;
    }
    return null;
  }

  renderHome() {
    let html = `<div class="view-container hero">`;
    html += `<h2>Crypto Module Documentation</h2>`;
    html += `<p>Comprehensive reference for the cryptographic subsystem. Explore available sections and their implementations.</p>`;
    html += `<div class="sections-grid">`;
    this.state.sections.forEach(sec => {
      const funcCount = sec.functions.length;
      html += `<a href="#/section/${sec.id}" class="section-card">`;
      html += `<h3>${sec.name}</h3>`;
      html += `<p>${funcCount} function${funcCount !== 1 ? 's' : ''}</p>`;
      html += `</a>`;
    });
    html += `</div></div>`;
    this.cache.mainContent.innerHTML = html;
  }

  renderSection(sectionId) {
    const section = this.state.sections.find(s => s.id === sectionId);
    if (!section) return this.renderHome();
    let html = `<div class="view-container section-header"><h2>${section.name}</h2></div>`;
    html += `<div class="functions-grid">`;
    section.functions.forEach(funcId => {
      const func = this.state.functions[funcId];
      if (func) html += this.renderFunctionCard(func);
    });
    html += `</div>`;
    this.cache.mainContent.innerHTML = html;
  }

  renderFunctionCard(func) {
    return `
      <a href="#/function/${func.id}" class="function-card">
        <div class="card-title">${func.name} <span class="badge">${func.metadata.crypto_version || ''}</span></div>
        <div class="metadata">
          <span>Author: ${func.metadata.author}</span>
        </div>
        <p class="description">${func.description.short}</p>
        <div class="tags">${(func.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </a>
    `;
  }

  renderFunction(funcId) {
    const func = this.state.functions[funcId];
    if (!func) return this.renderHome();
    let html = `<div class="view-container function-detail">`;
    html += `<div class="card-title">${func.name} <span class="badge">${func.metadata.crypto_version || ''}</span></div>`;
    html += `<div class="metadata">`;
    html += `<span>Author: ${func.metadata.author}</span>`;
    html += `<span>Version: ${func.metadata.os_version || 'N/A'}</span>`;
    html += `</div>`;
    html += `<p>${func.description.full}</p>`;

    if (func.vulnerabilities && func.vulnerabilities.length) {
      html += `<div class="detail-section"><h3>Security Considerations</h3><ul>`;
      func.vulnerabilities.forEach(v => html += `<li>${v}</li>`);
      html += `</ul></div>`;
    }

    if (func.code_examples) {
      html += `<div class="detail-section"><h3>Code Examples</h3>`;
      if (func.code_examples.rust) {
        html += `<div class="code-block"><pre><code class="language-rust">${this.escapeHtml(func.code_examples.rust)}</code></pre><button class="copy-btn" title="Copy">⧉</button></div>`;
      }
      if (func.code_examples.c) {
        html += `<div class="code-block"><pre><code class="language-c">${this.escapeHtml(func.code_examples.c)}</code></pre><button class="copy-btn" title="Copy">⧉</button></div>`;
      }
      html += `</div>`;
    }

    html += `<div class="detail-section">`;
    html += `<a href="${func.implementation_url}" target="_blank" class="source-link">Source code →</a>`;
    html += `</div>`;

    if (func.contributors && func.contributors.length) {
      html += `<div class="detail-section"><h3>Contributors</h3><div class="contributors">`;
      func.contributors.forEach(user => {
        html += `<a href="https://github.com/${user}" target="_blank" title="${user}"><img class="contributor-avatar" src="https://github.com/${user}.png" alt="${user}"></a>`;
      });
      html += `</div></div>`;
    }

    html += `</div>`;
    this.cache.mainContent.innerHTML = html;

    requestAnimationFrame(() => {
      this.cache.mainContent.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const codeBlock = btn.closest('.code-block').querySelector('code');
          if (codeBlock) {
            navigator.clipboard.writeText(codeBlock.textContent).then(() => {
              btn.classList.add('copied');
              setTimeout(() => btn.classList.remove('copied'), 1500);
            });
          }
        });
      });
    });
  }

  renderSearchResults(query) {
    const allFuncs = Object.values(this.state.functions);
    const results = allFuncs.filter(func => {
      const searchData = `${func.name} ${func.description.short} ${(func.tags || []).join(' ')}`.toLowerCase();
      return searchData.includes(query);
    });
    let html = `<div class="view-container"><div class="section-header"><h2>Search Results</h2></div>`;
    if (results.length === 0) {
      html += `<p>No functions found matching "${this.escapeHtml(query)}".</p>`;
    } else {
      html += `<div class="functions-grid">`;
      results.forEach(func => html += this.renderFunctionCard(func));
      html += `</div>`;
    }
    html += `</div>`;
    this.cache.mainContent.innerHTML = html;
  }

  escapeHtml(text) {
    return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
}

document.addEventListener('DOMContentLoaded', () => new CryptoDocApp());