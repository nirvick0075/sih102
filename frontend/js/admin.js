/**
 * Admin User Management & Audit Log Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('admin.html')) {
    initAdminPage();
  }
});

function initAdminPage() {
  loadUsersList();
  loadAuditLogs();
  setupCreateUserModal();
}

async function loadUsersList() {
  const tbody = document.getElementById('users-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b;">Loading user accounts...</td></tr>';
  }

  try {
    const res = await ApiClient.get('/users');
    renderUsersTable(res.users);
  } catch (err) {
    showToast('Failed to load users: ' + err.message, 'error');
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>
        <select class="form-control" style="width:130px;padding:4px 8px;font-size:12px;" onchange="changeUserRole('${u._id}', this.value)">
          <option value="USER" ${u.role === 'USER' ? 'selected' : ''}>USER</option>
          <option value="INVESTIGATOR" ${u.role === 'INVESTIGATOR' ? 'selected' : ''}>INVESTIGATOR</option>
          <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
        </select>
      </td>
      <td>
        <span class="status-pill ${u.isActive ? 'COMPLETED' : 'DELAYED'}">
          ${u.isActive ? 'Active' : 'Deactivated'}
        </span>
      </td>
      <td>${formatDate(u.createdAt)}</td>
      <td>
        <button class="btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}" onclick="toggleUserStatus('${u._id}', ${!u.isActive})">
          ${u.isActive ? 'Deactivate' : 'Reactivate'}
        </button>
      </td>
    </tr>
  `).join('');
}

async function changeUserRole(userId, newRole) {
  try {
    const res = await ApiClient.put(`/users/${userId}`, { role: newRole });
    showToast(res.message, 'success');
    loadUsersList();
  } catch (err) {
    showToast('Failed to update role: ' + err.message, 'error');
    loadUsersList();
  }
}

async function toggleUserStatus(userId, newStatus) {
  try {
    const res = await ApiClient.put(`/users/${userId}`, { isActive: newStatus });
    showToast(res.message, 'success');
    loadUsersList();
  } catch (err) {
    showToast('Failed to change status: ' + err.message, 'error');
  }
}

function setupCreateUserModal() {
  const modal = document.getElementById('create-user-modal');
  const openBtn = document.getElementById('btn-open-create-user');
  const closeBtn = document.getElementById('btn-close-user-modal');
  const submitBtn = document.getElementById('btn-submit-create-user');

  openBtn?.addEventListener('click', () => modal?.classList.add('active'));
  closeBtn?.addEventListener('click', () => modal?.classList.remove('active'));

  submitBtn?.addEventListener('click', async () => {
    const name = document.getElementById('new-user-name')?.value.trim();
    const email = document.getElementById('new-user-email')?.value.trim();
    const password = document.getElementById('new-user-password')?.value;
    const role = document.getElementById('new-user-role')?.value;

    if (!name || !email || !password) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      const res = await ApiClient.post('/users', { name, email, password, role });
      showToast(res.message, 'success');
      modal?.classList.remove('active');
      loadUsersList();
    } catch (err) {
      showToast('Failed to create user: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

async function loadAuditLogs() {
  const tbody = document.getElementById('audit-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#64748b;">Loading audit logs...</td></tr>';
  }

  try {
    const res = await ApiClient.get('/audit-logs');
    renderAuditTable(res.logs);
  } catch (err) {
    showToast('Failed to load audit logs: ' + err.message, 'error');
  }
}

function renderAuditTable(logs) {
  const tbody = document.getElementById('audit-tbody');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;">No audit entries logged yet.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td><span class="status-pill COMPLETED" style="font-family:monospace;">${l.action}</span></td>
      <td><strong>${l.userEmail}</strong> (${l.userRole})</td>
      <td>${l.resourceType} ${l.resourceId ? `[${l.resourceId}]` : ''}</td>
      <td>${formatDate(l.timestamp)}</td>
      <td><span class="hash-pill">${JSON.stringify(l.details || {}).slice(0, 45)}...</span></td>
    </tr>
  `).join('');
}
