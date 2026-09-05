/**
 * Alerts & Notification Center Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('alerts.html')) {
    initAlertsPage();
  }
});

function initAlertsPage() {
  loadAlerts();
  document.getElementById('filter-alert-read')?.addEventListener('change', () => loadAlerts(1));
  document.getElementById('filter-alert-risk')?.addEventListener('change', () => loadAlerts(1));
  document.getElementById('btn-mark-all-read')?.addEventListener('click', markAllAlertsRead);
}

async function loadAlerts(page = 1) {
  const isRead = document.getElementById('filter-alert-read')?.value;
  const riskLevel = document.getElementById('filter-alert-risk')?.value;
  const container = document.getElementById('alerts-list-container');

  if (container) {
    container.innerHTML = '<p style="color:#64748b;padding:20px;text-align:center;">Loading notifications...</p>';
  }

  try {
    const res = await ApiClient.get('/alerts', { isRead, riskLevel, page, limit: 20 });
    renderAlertsList(res.alerts);
  } catch (err) {
    showToast('Failed to load alerts: ' + err.message, 'error');
  }
}

function renderAlertsList(alerts) {
  const container = document.getElementById('alerts-list-container');
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;"><p style="font-size:14px;">No notifications matching selected filters.</p></div>';
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div style="padding:16px;background:${a.isRead ? '#ffffff' : '#fff7ed'};border:1px solid ${a.isRead ? '#e2e8f0' : '#fed7aa'};border-left:4px solid ${a.riskLevel === 'CRITICAL' ? 'var(--risk-critical)' : 'var(--risk-high)'};border-radius:var(--radius-sm);margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
          <span class="risk-badge ${a.riskLevel}">${a.riskLevel} PRIORITY</span>
          <strong style="font-size:13px;color:var(--gov-navy-dark);">${a.projectName}</strong>
          <span style="font-size:11px;color:var(--text-muted);">${formatDate(a.createdAt)}</span>
        </div>
        <p style="font-size:13px;color:var(--text-primary);margin-bottom:6px;">${a.message}</p>
        <div style="display:flex;gap:12px;font-size:12px;">
          <a href="project-details.html?id=${a.projectId}" style="color:var(--gov-blue);font-weight:600;text-decoration:none;">
            View Project Dossier →
          </a>
        </div>
      </div>
      <div>
        ${!a.isRead ? `
          <button class="btn btn-sm btn-secondary" onclick="markSingleAlertRead('${a.alertId}')">
            Mark Read
          </button>
        ` : '<span style="font-size:11px;color:var(--text-muted);">Read</span>'}
      </div>
    </div>
  `).join('');
}

async function markSingleAlertRead(alertId) {
  try {
    await ApiClient.put(`/alerts/${alertId}/read`);
    showToast('Alert marked as read.', 'info');
    loadAlerts(1);
    fetchUnreadAlertsCount();
  } catch (err) {
    showToast('Failed to update alert: ' + err.message, 'error');
  }
}

async function markAllAlertsRead() {
  try {
    await ApiClient.put('/alerts/mark-all-read');
    showToast('All notifications marked as read.', 'success');
    loadAlerts(1);
    fetchUnreadAlertsCount();
  } catch (err) {
    showToast('Error marking alerts read: ' + err.message, 'error');
  }
}
