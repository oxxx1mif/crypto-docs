document.addEventListener('DOMContentLoaded', () => {
  // Load data
  fetch('data/functions.json')
    .then(res => res.json())
    .then(data => {
      const app = new CryptoApp(data);
      app.init();
    });
});

class CryptoApp {
  constructor(data) {
    this.data = data;           // { sections: [...] }
    this.state = {
      searchQuery: '',
      route: this.getRoute()
    };
    this.searchInput = document.getElementById('search');
    this.sidebar = document.getElementById('nav-sections');
    this.content = document.getElementById('content');
  }

  init() {
    this.buildSidebar();
    this.handleRoute();
    window.addEventListener('hashchange', () => {
      this.state.route = this.getRoute();
      this.state.searchQuery = '';
      this.searchInput.value = '';
      this.render();
    });
    this.searchInput.addEventListener('input', () => {
      this.state.searchQuery = this.searchInput.value.trim().toLowerCase();
      window.location.hash = '#/';
      this.state.route = { page: 'home' };
      this.render();
    });
  }

  getRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/').filter(Boolean);
    if (parts.length === 0) return { page: 'home' };
    if (parts[0] === 'section' && parts[1]) return { page: 'section', id: parts[1] };
    if (parts[0] === 'function' && parts[1]) return { page: 'function', id: parts[1] };
    return { page: 'home' };
  }

  /* ---------- Sidebar ---------- */
  buildSidebar() {
    let html = '';
    this.data.sections.forEach(section => {
      const funcs = section.functions || [];
      html += `<div class="section-item" data-section="${section.id}">`;
      html += `<a class="section-link" data-section="${section.id}" href="#/section/${section.id}">⚙ ${section.name}</a>`;
      html += `<ul class="func-list">`;
      funcs.forEach(func => {
        html += `<li><a class="func-link" href="#/function/${func.id}">${func.name}</a></li>`;
      });
      html += `</ul></div>`;
    });
    this.sidebar.innerHTML = html;

    // Toggle open on click (for mobile and desktop)
    this.sidebar.querySelectorAll('.section-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const item = link.parentElement;
        // Toggle only if not already open and we are on this section? Better to always toggle
        item.classList.toggle('open');
        // Close others
        this.sidebar.querySelectorAll('.section-item').forEach(other => {
          if (other !== item) other.classList.remove('open');
        });
      });
    });
    // Prevent function links from toggling parent
    this.sidebar.querySelectorAll('.func-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
        // Also close sidebar on mobile? later
      });
    });
  }

  highlightSidebar(route) {
    this.sidebar.querySelectorAll('.section-link, .func-link').forEach(el => el.classList.remove('active'));
    if (route.page === 'section') {
      const link = this.sidebar.querySelector(`.section-link[data-section="${route.id}"]`);
      if (link) {
        link.classList.add('active');
        const item = link.closest('.section-item');
        if (item) item.classList.add('open');
      }
    } else if (route.page === 'function') {
      // Find the function link and its parent section
      const funcLink = this.sidebar.querySelector(`.func-link[href="#/function/${route.id}"]`);
      if (funcLink) {
        funcLink.classList.add('active');
        const item = funcLink.closest('.section-item');
        if (item) item.classList.add('open');
        // Also highlight section link
        const sectionLink = item?.querySelector('.section-link');
        if (sectionLink) sectionLink.classList.add('active');
      }
    }
  }

  /* ---------- Render ---------- */
  render() {
    const { searchQuery, route } = this.state;

    // If search query active, show results instead of route
    if (searchQuery && route.page === 'home') {
      this.renderSearchResults(searchQuery);
      this.highlightSidebar(route); // no highlight
      return;
    }

    // Clear search query if navigating to a section/function
    switch (route.page) {
      case 'home': this.renderHome(); break;
      case 'section': this.renderSection(route.id); break;
      case 'function': this.renderFunction(route.id); break;
      default: this.renderHome();
    }
    this.highlightSidebar(route);
  }

  handleRoute() {
    this.render();
  }

  renderHome() {
    let html = '<div class="hero"><h2>Crypto Module Documentation</h2><p>Comprehensive reference of cryptographic functions.</p>';
    html += '<div class="section-grid">';
    this.data.sections.forEach(section => {
      const count = section.functions.length;
      html += `<a href="#/section/${section.id}" class="section-card"><h3>${section.name}</h3><p>${count} function${count!==1?'s':''}</p></a>`;
    });
    html += '</div></div>';
    this.content.innerHTML = html;
  }

  renderSection(sectionId) {
    const section = this.data.sections.find(s => s.id === sectionId);
    if (!section) return this.renderHome();
    let html = `<h2>${section.name}</h2><div class="function-grid">`;
    section.functions.forEach(func => {
      html += this.renderFunctionCard(func);
    });
    html += `</div>`;
    this.content.innerHTML = html;
  }

  renderFunctionCard(func) {
    return `
      <a href="#/function/${func.id}" class="function-card">
        <div class="name">${func.name} <span class="badge">${func.metadata?.crypto_version || ''}</span></div>
        <div class="meta">Author: ${func.metadata?.author || ''}</div>
        <div class="desc">${func.description.short}</div>
        <div class="tags">${(func.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      </a>
    `;
  }

  renderFunction(funcId) {
    const func = this.data.sections.flatMap(s => s.functions).find(f => f.id === funcId);
    if (!func) return this.renderHome();
    let html = `<div class="function-detail"><h2>${func.name} <span class="badge">${func.metadata?.crypto_version || ''}</span></h2>`;
    html += `<div class="meta">Author: ${func.metadata?.author} · Version: ${func.metadata?.os_version || 'N/A'}</div>`;
    html += `<p>${func.description.full}</p>`;

    if (func.vulnerabilities?.length) {
      html += `<div class="detail-section"><h3>Security Considerations</h3><ul>${func.vulnerabilities.map(v=>`<li>${v}</li>`).join('')}</ul></div>`;
    }
    if (func.code_examples) {
      html += `<div class="detail-section"><h3>Code Examples</h3>`;
      if (func.code_examples.rust) html += this.codeBlock(func.code_examples.rust, 'rust');
      if (func.code_examples.c) html += this.codeBlock(func.code_examples.c, 'c');
      html += `</div>`;
    }
    html += `<a href="${func.implementation_url}" target="_blank" class="source-link">Source code →</a>`;
    if (func.contributors?.length) {
      html += `<div class="detail-section"><h3>Contributors</h3><div class="contributors">`;
      func.contributors.forEach(u => html += `<a href="https://github.com/${u}" target="_blank"><img src="https://github.com/${u}.png"></a>`);
      html += `</div></div>`;
    }
    html += `</div>`;
    this.content.innerHTML = html;
    this.attachCopyButtons();
  }

  codeBlock(code, lang) {
    const escaped = this.escapeHtml(code);
    return `<div class="code-block"><pre><code>${escaped}</code></pre><button class="copy-btn">⧉</button></div>`;
  }

  attachCopyButtons() {
    this.content.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.previousElementSibling?.textContent || '';
        navigator.clipboard.writeText(code).then(() => {
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        });
      });
    });
  }

  renderSearchResults(query) {
    const allFuncs = this.data.sections.flatMap(s => s.functions);
    const results = allFuncs.filter(f => {
      const text = `${f.name} ${f.description.short} ${(f.tags||[]).join(' ')}`.toLowerCase();
      return text.includes(query);
    });
    let html = `<h2>Search Results</h2>`;
    if (results.length === 0) html += `<p>No functions found.</p>`;
    else {
      html += `<div class="function-grid">`;
      results.forEach(f => html += this.renderFunctionCard(f));
      html += `</div>`;
    }
    this.content.innerHTML = html;
  }

  escapeHtml(text) {
    return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
}