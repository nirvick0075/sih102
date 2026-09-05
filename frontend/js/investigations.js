/**
 * Investigations Case Management Hub Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('investigations.html')) {
    initInvestigationsPage();
  }
});

function initInvestigationsPage() {
  loadInvestigations();
  document.getElementById('filter-inv-status')?.addEventListener('change', () => loadInvestigations(1));
  document.getElementById('search-inv-input')?.addEventListener('input', () => loadInvestigations(1));
}

async function loadInvestigations(page = 1) {
  const status = document.getElementById('filter-inv-status')?.value || '';
  const search = document.getElementById('search-inv-input')?.value || '';
  const tbody = document.getElementById('investigations-tbody');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:#64748b;">Loading cases...</td></tr>';
  }

  try {
    const res = await ApiClient.get('/investigations', { status, search, page, limit: 15 });
    renderInvestigationsTable(res.investigations);
  } catch (err) {
    showToast('Failed to load investigations: ' + err.message, 'error');
  }
}

function renderInvestigationsTable(cases) {
  const tbody = document.getElementById('investigations-tbody');
  if (!tbody) return;

  if (cases.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">No investigation cases found matching filter.</td></tr>';
    return;
  }

  tbody.innerHTML = cases.map(c => `
    <tr>
      <td>
        <a href="investigation-details.html?id=${c.investigationId}" style="font-weight:700;color:var(--gov-blue);text-decoration:none;">
          ${c.investigationId}
        </a>
      </td>
      <td>
        <a href="project-details.html?id=${c.projectId}" style="color:var(--text-primary);font-weight:600;text-decoration:none;">
          ${c.projectId}
        </a>
        <div style="font-size:11px;color:var(--text-muted);">${c.projectName}</div>
      </td>
      <td>${c.district}, ${c.state}</td>
      <td>
        <span class="risk-badge ${c.riskLevel}">${c.aiScore} / 100</span>
      </td>
      <td>${c.investigatorName}</td>
      <td>
        <span class="status-pill ${c.status}">${c.status}</span>
        ${c.blockchainTx ? '<span style="font-size:10px;color:#059669;display:block;margin-top:2px;">🛡️ On-Chain</span>' : ''}
      </td>
      <td>
        <a href="investigation-details.html?id=${c.investigationId}" class="btn btn-sm btn-primary">
          Open Case →
        </a>
      </td>
    </tr>
  `).join('');
}
