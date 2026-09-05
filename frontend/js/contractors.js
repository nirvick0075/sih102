/**
 * Contractor Performance & Historical Risk Directory Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('contractors.html')) {
    initContractorsPage();
  }
});

function initContractorsPage() {
  loadContractors();
  document.getElementById('search-contractor-input')?.addEventListener('input', () => loadContractors(1));
  document.getElementById('sort-contractor-by')?.addEventListener('change', () => loadContractors(1));
}

async function loadContractors(page = 1) {
  const search = document.getElementById('search-contractor-input')?.value || '';
  const sortBy = document.getElementById('sort-contractor-by')?.value || 'anomalyRate';
  const tbody = document.getElementById('contractors-tbody');

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:#64748b;">Loading contractor analytics...</td></tr>';
  }

  try {
    const res = await ApiClient.get('/contractors', { search, sortBy, order: 'desc', page, limit: 15 });
    renderContractorsTable(res.contractors);
  } catch (err) {
    showToast('Failed to load contractors: ' + err.message, 'error');
  }
}

function renderContractorsTable(contractors) {
  const tbody = document.getElementById('contractors-tbody');
  if (!tbody) return;

  if (contractors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#94a3b8;">No contractors found.</td></tr>';
    return;
  }

  tbody.innerHTML = contractors.map(c => `
    <tr>
      <td><strong>${c.name}</strong><br><span style="font-size:11px;color:var(--text-muted);">${c.contractorId} | ${c.registrationNumber}</span></td>
      <td>${c.district}, ${c.state}</td>
      <td><strong>${c.totalProjects}</strong></td>
      <td>
        <span style="font-weight:600;color:${c.delayRate > 30 ? '#dc2626' : 'inherit'};">
          ${c.delayRate}%
        </span>
        <span style="font-size:11px;color:var(--text-muted);">(${c.delayedProjects} delayed)</span>
      </td>
      <td>
        <span style="font-weight:600;color:${c.costOverrunRate > 30 ? '#dc2626' : 'inherit'};">
          ${c.costOverrunRate}%
        </span>
        <span style="font-size:11px;color:var(--text-muted);">(avg +${c.averageCostDeviation}%)</span>
      </td>
      <td>
        <span style="font-weight:700;color:${c.anomalyRate > 35 ? '#ea580c' : '#10b981'};">
          ${c.anomalyRate}%
        </span>
        <span style="font-size:11px;color:var(--text-muted);">(${c.anomalousProjects} flagged)</span>
      </td>
      <td>
        <span class="risk-badge ${c.riskScore >= 60 ? 'HIGH' : (c.riskScore >= 30 ? 'MEDIUM' : 'LOW')}">
          ${c.riskScore} / 100
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewContractorPortfolio('${c.contractorId}')">
          Portfolio →
        </button>
      </td>
    </tr>
  `).join('');
}

async function viewContractorPortfolio(contractorId) {
  try {
    const res = await ApiClient.get(`/contractors/${contractorId}`);
    const modal = document.getElementById('contractor-portfolio-modal');
    const titleEl = document.getElementById('portfolio-modal-title');
    const bodyEl = document.getElementById('portfolio-modal-body');

    if (titleEl) titleEl.textContent = `Portfolio: ${res.contractor.name}`;
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="margin-bottom:16px;padding:12px;background:#f8fafc;border-radius:var(--radius-sm);display:grid;grid-template-columns:repeat(4,1fr);gap:10px;text-align:center;">
          <div><div style="font-size:11px;color:var(--text-muted);">Total Works</div><strong style="font-size:16px;">${res.contractor.totalProjects}</strong></div>
          <div><div style="font-size:11px;color:var(--text-muted);">Delay Rate</div><strong style="font-size:16px;color:#dc2626;">${res.contractor.delayRate}%</strong></div>
          <div><div style="font-size:11px;color:var(--text-muted);">Cost Overrun</div><strong style="font-size:16px;color:#ea580c;">${res.contractor.costOverrunRate}%</strong></div>
          <div><div style="font-size:11px;color:var(--text-muted);">Anomaly Index</div><strong style="font-size:16px;">${res.contractor.anomalyRate}%</strong></div>
        </div>
        <h4 style="font-size:13px;font-weight:700;margin-bottom:8px;">Associated MPLAD Projects:</h4>
        <div class="table-responsive">
          <table class="gov-table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Name</th>
                <th>Estimated</th>
                <th>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              ${res.projects.map(p => `
                <tr>
                  <td><a href="project-details.html?id=${p.projectId}" style="color:var(--gov-blue);font-weight:600;">${p.projectId}</a></td>
                  <td>${p.projectName}</td>
                  <td>${formatCurrency(p.estimatedCost)}</td>
                  <td><span class="risk-badge ${p.riskLevel}">${p.aiScore}/100</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    modal?.classList.add('active');
    document.getElementById('btn-close-portfolio-modal')?.addEventListener('click', () => {
      modal?.classList.remove('active');
    });
  } catch (err) {
    showToast('Failed to load contractor portfolio: ' + err.message, 'error');
  }
}
