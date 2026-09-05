/**
 * Dashboard & Analytics Page Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

let riskChartInstance = null;
let stateChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.endsWith('dashboard.html') || window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    await loadDashboardData();
  }
});

async function loadDashboardData() {
  try {
    await Promise.all([
      loadMetricsOverview(),
      loadRiskDistributionChart(),
      loadStateAnalysisChart(),
      loadTopFlaggedProjects(),
      loadRecentAlerts()
    ]);
  } catch (err) {
    showToast('Error loading dashboard analytics: ' + err.message, 'error');
  }
}

async function loadMetricsOverview() {
  const res = await ApiClient.get('/analytics/overview');
  if (!res.success) return;

  const data = res.data;
  document.getElementById('metric-total-projects').textContent = data.totalProjects.toLocaleString('en-IN');
  document.getElementById('metric-flagged-projects').textContent = data.flaggedProjects.toLocaleString('en-IN');
  document.getElementById('metric-critical-projects').textContent = data.criticalProjects.toLocaleString('en-IN');
  document.getElementById('metric-investigations').textContent = data.underInvestigation.toLocaleString('en-IN');
  document.getElementById('metric-total-expenditure').textContent = formatCurrency(data.totalActual);
  document.getElementById('metric-cost-overrun').textContent = formatCurrency(data.costOverrunTotal);
}

async function loadRiskDistributionChart() {
  const res = await ApiClient.get('/analytics/risk-distribution');
  if (!res.success) return;

  const dist = res.distribution;
  const ctx = document.getElementById('riskDistributionChart');
  if (!ctx) return;

  if (riskChartInstance) riskChartInstance.destroy();

  riskChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Low Risk (0-29)', 'Medium Risk (30-59)', 'High Priority (60-79)', 'Critical Priority (80-100)'],
      datasets: [{
        data: [dist.LOW, dist.MEDIUM, dist.HIGH, dist.CRITICAL],
        backgroundColor: ['#10b981', '#f59e0b', '#ea580c', '#dc2626'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11 } }
        }
      },
      cutout: '70%'
    }
  });
}

async function loadStateAnalysisChart() {
  const res = await ApiClient.get('/analytics/state-analysis');
  if (!res.success) return;

  const states = res.states.slice(0, 8); // Top 8 states
  const ctx = document.getElementById('stateAnalysisChart');
  if (!ctx) return;

  if (stateChartInstance) stateChartInstance.destroy();

  stateChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: states.map(s => s.state),
      datasets: [
        {
          label: 'Total Projects',
          data: states.map(s => s.totalProjects),
          backgroundColor: '#94a3b8'
        },
        {
          label: 'Flagged Anomalies',
          data: states.map(s => s.flaggedProjects),
          backgroundColor: '#ea580c'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 12, font: { size: 11 } }
        }
      }
    }
  });
}

async function loadTopFlaggedProjects() {
  const res = await ApiClient.get('/projects', { sortBy: 'aiScore', order: 'desc', limit: 6 });
  if (!res.success) return;

  const tbody = document.getElementById('top-projects-tbody');
  if (!tbody) return;

  if (res.projects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">No flagged projects available.</td></tr>';
    return;
  }

  tbody.innerHTML = res.projects.map(p => `
    <tr>
      <td>
        <a href="project-details.html?id=${p.projectId}" style="font-weight:700;color:var(--gov-blue);text-decoration:none;">
          ${p.projectId}
        </a>
      </td>
      <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${p.projectName}">
        ${p.projectName}
      </td>
      <td>${p.district}, ${p.state}</td>
      <td><strong>${formatCurrency(p.sanctionedAmount)}</strong></td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <strong style="font-size:14px;">${p.aiScore}</strong>
          <span style="font-size:11px;color:var(--text-muted);">/100</span>
        </div>
      </td>
      <td>
        <span class="risk-badge ${p.riskLevel}">${p.riskLevel}</span>
      </td>
      <td>
        <a href="project-details.html?id=${p.projectId}" class="btn btn-sm btn-secondary">
          Analyze Dossier →
        </a>
      </td>
    </tr>
  `).join('');
}

async function loadRecentAlerts() {
  const res = await ApiClient.get('/alerts', { limit: 5 });
  if (!res.success) return;

  const container = document.getElementById('dashboard-alerts-feed');
  if (!container) return;

  if (res.alerts.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:12px;padding:12px;">No active anomaly alerts.</p>';
    return;
  }

  container.innerHTML = res.alerts.map(a => `
    <div style="padding:10px 12px;background:#f8fafc;border-left:3px solid ${a.riskLevel === 'CRITICAL' ? 'var(--risk-critical)' : 'var(--risk-high)'};border-radius:4px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:2px;">
        <span style="font-weight:700;color:${a.riskLevel === 'CRITICAL' ? 'var(--risk-critical)' : 'var(--risk-high)'}">${a.riskLevel} ANOMALY</span>
        <span>${formatDate(a.createdAt)}</span>
      </div>
      <p style="font-size:12px;color:var(--text-primary);">${a.message}</p>
      <a href="project-details.html?id=${a.projectId}" style="font-size:11px;color:var(--gov-blue);font-weight:600;text-decoration:none;display:inline-block;margin-top:4px;">
        Inspect Project ${a.projectId} →
      </a>
    </div>
  `).join('');
}
