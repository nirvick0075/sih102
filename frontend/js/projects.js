/**
 * Projects Directory & CSV Ingestion Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

let currentPage = 1;
const limitPerPage = 15;

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('projects.html')) {
    initProjectsPage();
  }
});

function initProjectsPage() {
  loadProjects();
  setupFilterListeners();
  setupCsvImportModal();
}

async function loadProjects(page = 1) {
  currentPage = page;
  const search = document.getElementById('search-input')?.value || '';
  const riskLevel = document.getElementById('filter-risk')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';
  const state = document.getElementById('filter-state')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';
  const sortBy = document.getElementById('sort-by')?.value || 'aiScore';

  const tbody = document.getElementById('projects-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:#64748b;">Loading projects directory...</td></tr>';
  }

  try {
    const res = await ApiClient.get('/projects', {
      search,
      riskLevel,
      category,
      state,
      projectStatus: status,
      sortBy,
      order: sortBy === 'projectName' ? 'asc' : 'desc',
      page,
      limit: limitPerPage
    });

    renderProjectsTable(res.projects);
    renderPagination(res.pagination);
  } catch (err) {
    showToast('Failed to load projects: ' + err.message, 'error');
  }
}

function renderProjectsTable(projects) {
  const tbody = document.getElementById('projects-tbody');
  if (!tbody) return;

  if (projects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;">No projects match your current filter criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = projects.map(p => `
    <tr>
      <td>
        <a href="project-details.html?id=${p.projectId}" style="font-weight:700;color:var(--gov-blue);text-decoration:none;">
          ${p.projectId}
        </a>
      </td>
      <td style="max-width:220px;font-weight:500;">
        ${p.projectName}
      </td>
      <td><span class="status-pill">${p.category}</span></td>
      <td>${p.district}, ${p.state}</td>
      <td>
        <div><strong>${formatCurrency(p.estimatedCost)}</strong></div>
        ${p.costDeviationPct > 15 ? `<span style="font-size:11px;color:#dc2626;font-weight:600;">+${p.costDeviationPct}% overrun</span>` : ''}
      </td>
      <td>
        <span class="status-pill ${p.projectStatus}">${p.projectStatus}</span>
        ${p.delayDays > 0 ? `<div style="font-size:10px;color:#ea580c;margin-top:2px;">${p.delayDays}d delayed</div>` : ''}
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="risk-badge ${p.riskLevel}">${p.aiScore} / 100</span>
        </div>
      </td>
      <td>
        <a href="project-details.html?id=${p.projectId}" class="btn btn-sm btn-secondary">
          Dossier →
        </a>
      </td>
    </tr>
  `).join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination-container');
  if (!container || !pagination) return;

  const { page, pages, total } = pagination;
  if (pages <= 1) {
    container.innerHTML = `<span style="font-size:12px;color:var(--text-muted);">Showing all ${total} records</span>`;
    return;
  }

  container.innerHTML = `
    <span style="font-size:12px;color:var(--text-muted);margin-right:12px;">
      Showing page ${page} of ${pages} (${total} total projects)
    </span>
    <div style="display:inline-flex;gap:6px;">
      <button class="btn btn-sm btn-secondary" ${page === 1 ? 'disabled' : ''} onclick="loadProjects(${page - 1})">
        Previous
      </button>
      <button class="btn btn-sm btn-secondary" ${page === pages ? 'disabled' : ''} onclick="loadProjects(${page + 1})">
        Next
      </button>
    </div>
  `;
}

function setupFilterListeners() {
  const inputs = ['filter-risk', 'filter-category', 'filter-state', 'filter-status', 'sort-by'];
  inputs.forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => loadProjects(1));
  });

  const searchInput = document.getElementById('search-input');
  let searchDebounce = null;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => loadProjects(1), 300);
  });
}

/**
 * Setup Admin CSV Ingestion Modal
 */
function setupCsvImportModal() {
  const modal = document.getElementById('csv-import-modal');
  const openBtn = document.getElementById('btn-open-csv-import');
  const closeBtn = document.getElementById('btn-close-csv-modal');
  const fileInput = document.getElementById('csv-file-input');
  const submitBtn = document.getElementById('btn-submit-csv-import');
  const previewBox = document.getElementById('csv-preview-container');

  openBtn?.addEventListener('click', () => {
    modal?.classList.add('active');
  });

  closeBtn?.addEventListener('click', () => {
    modal?.classList.remove('active');
  });

  let selectedFile = null;

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      selectedFile = e.target.files[0];
      document.getElementById('selected-file-name').textContent = selectedFile.name;
      document.getElementById('selected-file-box').style.display = 'flex';
    }
  });

  submitBtn?.addEventListener('click', async () => {
    if (!selectedFile) {
      showToast('Please select a valid CSV file to import.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Analyzing & Ingesting Dataset...';

      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await ApiClient.post('/projects/import', formData);

      showToast(res.message, 'success');
      modal?.classList.remove('active');
      loadProjects(1);
    } catch (err) {
      showToast('Import Error: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Ingest & Run Anomaly Engine';
    }
  });
}
