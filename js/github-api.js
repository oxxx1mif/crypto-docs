const REPO_OWNER = 'NightFox-YT';
const REPO_NAME = 'Realix';
const BRANCH = 'feature/crypto';
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${BRANCH}&per_page=5`;

/**
 * Fetch latest commits from GitHub API.
 * Returns an array of commit objects (simplified).
 */
export async function fetchRecentCommits() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    const commits = await response.json();
    return commits.map(commit => ({
      message: commit.commit.message.split('\n')[0],  // first line
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url,
      sha: commit.sha.substring(0, 7)
    }));
  } catch (error) {
    console.error('Failed to fetch commits:', error);
    return [];
  }
}

/**
 * Render commits into the given container element.
 * @param {HTMLElement} container
 * @param {Array} commits
 */
export function renderCommits(container, commits) {
  if (commits.length === 0) {
    container.innerHTML = '<p class="commit-item">Could not load recent changes.</p>';
    return;
  }

  const html = commits.map(commit => `
    <a href="${commit.url}" target="_blank" rel="noopener" class="commit-item">
      <div class="commit-message">${escapeHtml(commit.message)}</div>
      <div class="commit-meta">
        <span>${commit.sha}</span>
        <span>${formatDate(commit.date)}</span>
      </div>
    </a>
  `).join('');

  container.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
