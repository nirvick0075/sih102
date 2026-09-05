/**
 * Authentication and Dynamic RBAC Navigation Controller
 * MPLAD Intelligence & Anomaly Detection System (SIH26102)
 */

document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
});

function initAuthUI() {
  const isLoginPage = window.location.pathname.endsWith('login.html');
  const user = ApiClient.getUser();
  const token = ApiClient.getToken();

  if (isLoginPage) {
    // If already logged in, redirect to dashboard
    if (token && user) {
      window.location.href = 'dashboard.html';
      return;
    }
    setupLoginForm();
  } else {
    // Protected pages require authentication
    if (!token || !user) {
      window.location.href = 'login.html';
      return;
    }
    applyRoleBasedNavigation(user);
    renderUserInfo(user);
    setupLogoutButton();
    fetchUnreadAlertsCount();
  }
}

/**
 * Handle Single-Form Login submission
 */
function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('login-submit-btn');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Authenticating...';

      const response = await ApiClient.post('/auth/login', { email, password });

      if (response.success && response.token) {
        ApiClient.setToken(response.token);
        ApiClient.setUser(response.user);

        showToast(`Authentication successful! Welcome, ${response.user.name}.`, 'success');

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 600);
      }
    } catch (err) {
      showToast(err.message || 'Login failed. Please check credentials.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Sign In to Portal';
    }
  });
}

/**
 * Dynamically show/hide navigation elements based strictly on backend-returned role
 */
function applyRoleBasedNavigation(user) {
  const role = user.role || 'USER';

  // Elements tagged with data-role="ADMIN", data-role="INVESTIGATOR", etc.
  document.querySelectorAll('[data-role]').forEach(el => {
    const requiredRoles = el.getAttribute('data-role').split(',').map(r => r.trim());
    if (requiredRoles.includes(role)) {
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  // Admin-only specific buttons or cards
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = role === 'ADMIN' ? '' : 'none';
  });

  // Investigator & Admin buttons
  document.querySelectorAll('.investigator-only').forEach(el => {
    el.style.display = (role === 'INVESTIGATOR' || role === 'ADMIN') ? '' : 'none';
  });
}

/**
 * Populate user avatar, name, and role badge
 */
function renderUserInfo(user) {
  const nameEls = document.querySelectorAll('.user-display-name');
  const roleEls = document.querySelectorAll('.user-display-role');
  const avatarEls = document.querySelectorAll('.user-avatar');

  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  nameEls.forEach(el => el.textContent = user.name || user.email);
  roleEls.forEach(el => {
    el.textContent = user.role;
    el.className = `role-badge role-${user.role.toLowerCase()}`;
  });
  avatarEls.forEach(el => el.textContent = initial);
}

/**
 * Setup logout click handler
 */
function setupLogoutButton() {
  document.querySelectorAll('.btn-logout, .btn-logout-icon').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      ApiClient.clearSession();
      showToast('You have been securely logged out.', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 400);
    });
  });
}

/**
 * Update unread alert badge counter in navbar
 */
async function fetchUnreadAlertsCount() {
  try {
    const res = await ApiClient.get('/alerts', { limit: 1 });
    const badge = document.getElementById('unread-alerts-badge');
    if (badge && res.unreadCount !== undefined) {
      if (res.unreadCount > 0) {
        badge.textContent = res.unreadCount > 99 ? '99+' : res.unreadCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (err) {
    // Silent catch
  }
}
