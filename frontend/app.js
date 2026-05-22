
const ROLES = ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR', 'SUPERADMIN'];
const TENANT_ROLES = ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'];
 
const DEFAULT_ACCOUNTS = {
  OWNER: {
    email: 'owner@example.com', username: 'owner_01', password: 'StrongPass123', tenantName: 'Dostyk Mini Market'
  },
  MANAGER: {
    email: 'manager@example.com', username: 'manager_01', password: 'StrongPass123', addRole: 'MANAGER'
  },
  STAFF: {
    email: 'staff@example.com', username: 'staff_01', password: 'StrongPass123', addRole: 'STAFF'
  },
  AUDITOR: {
    email: 'auditor@example.com', username: 'auditor_01', password: 'StrongPass123', addRole: 'AUDITOR'
  },
  SUPERADMIN: {
    email: 'superadmin@example.com', username: 'superadmin_01', password: 'StrongPass123', setupKey: 'local-super-admin-setup-key'
  }
};
 
const PERMISSIONS = {
  OWNER: 'Full tenant control',
  MANAGER: 'Operational management',
  STAFF: 'Inventory operations',
  AUDITOR: 'Read-only audit/reporting',
  SUPERADMIN: 'Platform-level tenant control'
};
 
const PAGES = {
  overview: {
    title: 'Dashboard',
    subtitle: 'Карта проекта, API connection и сохранённые ID. Без login доступны только Dashboard и Auth.',
    roles: ROLES,
    public: true
  },
  auth: {
    title: 'Auth',
    subtitle: 'Регистрация, email verification по ссылке или токену из Gmail, login/logout, password reset и назначение ролей.',
    roles: ROLES,
    public: true
  },
  inventory: {
    title: 'Warehouse & inventory',
    subtitle: 'Tenant-level workflow: warehouses, suppliers, categories, products, batches and adjustments.',
    roles: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']
  },
  orders: {
    title: 'Reservation / sale / purchase order',
    subtitle: 'Checkout reservation, staged transfer and supplier purchase order workflow.',
    roles: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR']
  },
  reports: {
    title: 'Reports, audit, jobs',
    subtitle: 'Доступ только для OWNER, MANAGER и AUDITOR. STAFF не видит audit/report/job controls.',
    roles: ['OWNER', 'MANAGER', 'AUDITOR']
  },
  platform: {
    title: 'Platform admin',
    subtitle: 'Только SUPERADMIN: list tenants, suspend/reactivate tenant, platform metrics and security actions.',
    roles: ['SUPERADMIN']
  },
  response: {
    title: 'Developer response & logs',
    subtitle: 'Скрытый технический экран для защиты/отладки. Не является отдельным business workflow.',
    roles: ['OWNER', 'MANAGER', 'AUDITOR', 'SUPERADMIN']
  }
};
 
const ACTION_ROLES = {
  refreshCurrentToken: ROLES,
  logoutCurrent: ROLES,
 
  createWarehouseA: ['OWNER', 'MANAGER'],
  createWarehouseB: ['OWNER', 'MANAGER'],
  updateWarehouseA: ['OWNER', 'MANAGER'],
  updateWarehouseB: ['OWNER', 'MANAGER'],
  listWarehouses: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'],
 
  createSupplier: ['OWNER', 'MANAGER'],
  createCategory: ['OWNER', 'MANAGER'],
  listSuppliers: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'],
  listCategories: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'],
 
  createProduct: ['OWNER', 'MANAGER'],
  updateProductRules: ['OWNER', 'MANAGER'],
  archiveProduct: ['OWNER', 'MANAGER'],
  listProducts: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'],
  getProductDetails: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'],
 
  receiveInventory: ['OWNER', 'MANAGER', 'STAFF'],
  triggerLowStockEmailDemo: ['OWNER', 'MANAGER'],
  adjustInventory: ['OWNER', 'MANAGER'],
  reportInventoryIssue: ['OWNER', 'MANAGER', 'STAFF'],
  approveInventoryIssue: ['OWNER', 'MANAGER'],
  rejectInventoryIssue: ['OWNER', 'MANAGER'],
  listInventoryIssues: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'],
  inventorySnapshot: ['OWNER', 'MANAGER', 'AUDITOR'],
 
  createReservation: ['OWNER', 'MANAGER', 'STAFF'],
  confirmReservation: ['OWNER', 'MANAGER', 'STAFF'],
  listReservations: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'],
 
  createTransfer: ['OWNER', 'MANAGER', 'STAFF'],
  approveTransfer: ['OWNER', 'MANAGER'],
  dispatchTransfer: ['OWNER', 'MANAGER', 'STAFF'],
  receiveTransfer: ['OWNER', 'MANAGER', 'STAFF'],
  cancelTransfer: ['OWNER', 'MANAGER'],
  listTransfers: ['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'],
 
  createPurchaseOrder: ['OWNER', 'MANAGER'],
  confirmPurchaseOrder: ['OWNER', 'MANAGER'],
  cancelPurchaseOrder: ['OWNER', 'MANAGER'],
  listPurchaseOrders: ['OWNER', 'MANAGER', 'AUDITOR'],
  listSales: ['OWNER', 'MANAGER', 'AUDITOR'],
 
  lowStock: ['OWNER', 'MANAGER', 'AUDITOR'],
  deadStockReport: ['OWNER', 'MANAGER', 'AUDITOR'],
  forecast: ['OWNER', 'MANAGER', 'AUDITOR'],
  getDeadStockPolicy: ['OWNER', 'MANAGER', 'AUDITOR'],
  updateDeadStockPolicy: ['OWNER', 'MANAGER'],
  runDeadStockDecay: ['OWNER', 'MANAGER'],
  triggerDeadStock: ['OWNER', 'MANAGER'],
  queueStatus: ['OWNER', 'MANAGER', 'AUDITOR'],
  auditLogs: ['OWNER', 'MANAGER', 'AUDITOR'],
 
  platformTenants: ['SUPERADMIN'],
  platformMetrics: ['SUPERADMIN'],
  platformAuditLogs: ['SUPERADMIN'],
  suspendTenant: ['SUPERADMIN'],
  reactivateTenant: ['SUPERADMIN'],
  forcePasswordReset: ['SUPERADMIN']
};
 
const state = loadState();
let logs = [];
 
function loadState() {
  const saved = JSON.parse(localStorage.getItem('leanstockFinalState') || '{}');
  return {
    apiBase: saved.apiBase || 'https://leanstock-production-6828.up.railway.app/api/v1',
    activeRole: saved.activeRole || 'OWNER',
    activePage: PAGES[saved.activePage] ? saved.activePage : getPageFromLocation(),
    accounts: { ...structuredClone(DEFAULT_ACCOUNTS), ...(saved.accounts || {}) },
    tokens: saved.tokens || {},
    refreshTokens: saved.refreshTokens || {},
    users: saved.users || {},
    memberships: saved.memberships || {},
    verificationTokens: saved.verificationTokens || {},
    resetTokens: saved.resetTokens || {},
    tenantId: saved.tenantId || '',
    warehouseAId: saved.warehouseAId || '',
    warehouseBId: saved.warehouseBId || '',
    supplierId: saved.supplierId || '',
    categoryId: saved.categoryId || '',
    productId: saved.productId || '',
    batchId: saved.batchId || '',
    reservationId: saved.reservationId || '',
    transferId: saved.transferId || '',
    issueReportId: saved.issueReportId || '',
    purchaseOrderId: saved.purchaseOrderId || '',
    ownerUserId: saved.ownerUserId || ''
  };
}
 
function persist() {
  localStorage.setItem('leanstockFinalState', JSON.stringify(state));
}
 
const $ = (id) => document.getElementById(id);
const value = (id) => $(id)?.value?.trim() || '';
const numberValue = (id) => Number(value(id));
const setValue = (id, val) => { if ($(id) && val !== undefined && val !== null) $(id).value = val; };
 
function apiBase() {
  return value('apiBase').replace(/\/$/, '');
}
 
function rootUrl() {
  return apiBase().replace(/\/api\/v1$/, '');
}
 
function normalizeError(error) {
  if (error?.body?.message) return error.body.message;
  if (error?.body?.error) return error.body.error;
  if (error?.body?.code) return error.body.code;
  return error?.message || 'Unknown error';
}
 
function pretty(data) {
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}
 
function output(data) {
  const out = $('out');
  if (!out) return;
  if (!canSeeResponseLogs()) {
    out.textContent = 'Response is hidden for this role. Switch to OWNER, MANAGER, AUDITOR or SUPERADMIN.';
    return;
  }
  out.textContent = pretty(data);
}
 
function pushLog(type, title, message, data) {
  const entry = { type, title, message, time: new Date().toLocaleTimeString(), data };
  logs.unshift(entry);
  logs = logs.slice(0, 25);
  renderLogs();
}
 
function toast(type, title, message) {
  const zone = $('toastZone');
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(message || '')}</p>`;
  zone.appendChild(node);
  setTimeout(() => node.remove(), 5200);
  pushLog(type, title, message);
}
 
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[ch]));
}
 
function renderLogs() {
  const list = $('logList');
  if (!list) return;
  if (!canSeeResponseLogs()) {
    list.innerHTML = '<div class="log-item warn"><strong>Logs hidden for this role</strong><div>STAFF is an operational role and cannot view response/audit-style logs in the frontend demo.</div></div>';
    return;
  }
  list.innerHTML = logs.length
    ? logs.map((item) => `
      <div class="log-item ${item.type}">
        <strong>${escapeHtml(item.title)} <span class="muted">${escapeHtml(item.time)}</span></strong>
        <div>${escapeHtml(item.message || '')}</div>
      </div>
    `).join('')
    : '<div class="log-item"><strong>No notifications yet</strong><div>Run any action to see frontend notifications.</div></div>';
}
 
function getPageFromLocation() {
  const raw = (window.location.hash || '#/overview').replace(/^#\/?/, '');
  const page = raw.split('?')[0] || 'overview';
  if (page === 'password-reset') return 'auth';
  return PAGES[page] ? page : 'overview';
}
 
function hashParams() {
  const raw = window.location.hash || '';
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : window.location.search.replace(/^\?/, '');
  return new URLSearchParams(query);
}
 
function isLoggedIn(role = state.activeRole) {
  return Boolean(activeToken(role));
}
 
function canAccessPage(page = state.activePage, role = state.activeRole) {
  const config = PAGES[page] || PAGES.overview;
  if (config.public) return true;
  return isLoggedIn(role) && config.roles.includes(role);
}
 
function canSeeResponseLogs(role = state.activeRole) {
  return isLoggedIn(role) && PAGES.response.roles.includes(role);
}
 
function requireFrontendRole(allowedRoles, featureName) {
  if (!isLoggedIn()) {
    toast('warn', featureName, `Login as ${state.activeRole} first.`);
    output({ error: 'LOGIN_REQUIRED', activeRole: state.activeRole });
    return false;
  }
  if (allowedRoles.includes(state.activeRole)) return true;
  const allowed = allowedRoles.join(', ');
  toast('warn', featureName, `${state.activeRole} cannot use this frontend action. Allowed roles: ${allowed}.`);
  output({ error: 'FRONTEND_RBAC_BLOCKED', activeRole: state.activeRole, allowedRoles });
  return false;
}
 
function setPage(page, replace = false) {
  const next = PAGES[page] ? page : 'overview';
  state.activePage = next;
  persist();
  const url = `#/${next}`;
  if (replace) history.replaceState(null, '', url);
  else if (window.location.hash !== url) window.location.hash = url;
  renderPage();
}
 
 
function applyActionVisibility() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    const action = button.dataset.action;
    const allowed = ACTION_ROLES[action];
    if (!allowed) return;
 
    const roleAllowed = allowed.includes(state.activeRole);
    button.hidden = !roleAllowed;
    if (roleAllowed && !isLoggedIn()) {
      button.disabled = true;
      button.title = `Login as ${state.activeRole} first.`;
    } else {
      button.disabled = false;
      button.title = roleAllowed ? '' : `Allowed roles: ${allowed.join(', ')}`;
    }
  });
}
 
function renderPage() {
  const page = PAGES[state.activePage] ? state.activePage : 'overview';
  if (state.activePage !== page) {
    state.activePage = page;
    persist();
  }
  const config = PAGES[page] || PAGES.overview;
  const denied = !canAccessPage(page);
  document.querySelectorAll('.page-section').forEach((section) => {
    section.classList.toggle('active', section.id === page && !denied);
  });
  document.querySelectorAll('[data-page-link]').forEach((link) => {
    const target = link.dataset.pageLink;
    link.classList.toggle('active', target === page);
    link.classList.toggle('locked', !canAccessPage(target));
  });
  if ($('pageTitle')) $('pageTitle').textContent = config.title;
  if ($('pageSubtitle')) $('pageSubtitle').textContent = config.subtitle;
  if ($('pageRolePills')) {
    $('pageRolePills').innerHTML = `
      <span class="pill blue">Active: ${escapeHtml(state.activeRole)}</span>
      <span class="pill ${canAccessPage(page) ? 'ok' : 'warn'}">${canAccessPage(page) ? 'Allowed' : 'Role locked'}</span>
    `;
  }
  if ($('accessPanel')) {
    const allowed = config.roles.join(', ');
    $('accessPanel').classList.toggle('active', denied);
    $('accessPanel').innerHTML = denied
      ? `<strong>${escapeHtml(isLoggedIn() ? state.activeRole + ' cannot use this page.' : 'Login required.')}</strong><br />Allowed roles: ${escapeHtml(allowed)}. Open Auth, login with a permitted role, then return to this page.`
      : '';
  }
}
 
async function handleIncomingEmailLink() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  const page = raw.split('?')[0];
  const params = hashParams();
  const token = params.get('token');
 
  if (page === 'password-reset' && token) {
    state.activePage = 'auth';
    history.replaceState(null, '', '#/auth');
    render();
    setValue('resetToken', token);
    toast('ok', 'Password reset link opened', 'Token was placed into the reset form. Enter a new password and click Reset password.');
    return true;
  }
 
  return false;
}
 
function activeToken(role = state.activeRole) {
  return state.tokens[role];
}
 
function refreshToken(role = state.activeRole) {
  return state.refreshTokens[role];
}
 
function clearAllAuthSessions() {
  state.tokens = {};
  state.refreshTokens = {};
  state.users = {};
}
 
function account(role) {
  return state.accounts[role];
}
 
function setAccountField(role, field, val) {
  state.accounts[role] = { ...account(role), [field]: val };
  persist();
}
 
async function request(path, options = {}) {
  const method = options.method || 'GET';
  const role = options.role || state.activeRole;
  const headers = { ...(options.headers || {}) };
 
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
 
  if (!options.skipAuth) {
    const token = activeToken(role);
    if (!token) {
      throw Object.assign(new Error(`${role} is not logged in. Login first or switch active role.`), { status: 401 });
    }
    headers.Authorization = `Bearer ${token}`;
  }
 
  const res = await fetch(apiBase() + path, { method, headers, body: options.body });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = text; }
 
  if (!res.ok) {
    throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body, path, method });
  }
 
  return body;
}
 
async function safe(label, fn, successMessage) {
  try {
    const result = await fn();
    output(result);
    toast('ok', label, successMessage || 'Operation completed successfully.');
    persist();
    render();
    return result;
  } catch (error) {
    const message = normalizeError(error);
    output({
      error: message,
      status: error.status,
      method: error.method,
      path: error.path,
      body: error.body
    });
    const type = error.status === 403 ? 'warn' : 'bad';
    toast(type, label, `${error.status ? error.status + ': ' : ''}${message}`);
    return null;
  }
}
 
function saveApiBase() {
  state.apiBase = apiBase();
  persist();
  render();
  toast('ok', 'API base saved', state.apiBase);
}
 
async function health() {
  return safe('Health check', async () => {
    const res = await fetch(rootUrl() + '/health');
    return res.json();
  }, 'Backend health endpoint responded.');
}
 
function openDocs() {
  window.open(rootUrl() + '/docs', '_blank', 'noopener,noreferrer');
}
 
function setActiveRole(role) {
  state.activeRole = role;
  persist();
  render();
  // FIX: если у роли нет токена — это просто выбор вкладки, не "сессия".
  if (activeToken(role)) {
    toast('ok', 'Active role selected', `Now using ${role} token for protected actions.`);
  } else {
    toast('warn', 'Role selected (not logged in)', `${role} selected. You must Login before protected actions.`);
  }
}
 
function rememberAuth(role, result) {
  if (result?.accessToken) state.tokens[role] = result.accessToken;
  if (result?.refreshToken) state.refreshTokens[role] = result.refreshToken;
  if (result?.user) state.users[role] = result.user;
  if (result?.verificationToken) state.verificationTokens[role] = result.verificationToken;
  if (result?.tenantId && role === 'OWNER') state.tenantId = result.tenantId;
  if (result?.user?.id && role === 'OWNER') state.ownerUserId = result.user.id;
  if (Array.isArray(result?.memberships)) {
    state.memberships[role] = result.memberships;
    const tenantMembership = result.memberships.find((m) => m.role === role) || result.memberships[0];
    if (tenantMembership?.tenantId && role === 'OWNER') state.tenantId = tenantMembership.tenantId;
  }
  persist();
}
 
async function registerRole(role) {
  readRoleInputs(role);
  const acc = account(role);
  const path = role === 'SUPERADMIN' ? '/auth/register-super-admin' : '/auth/register';
  const body = role === 'SUPERADMIN'
    ? { email: acc.email, username: acc.username, password: acc.password, setupKey: acc.setupKey }
    : {
      email: acc.email,
      username: acc.username,
      password: acc.password,
      ...(role === 'OWNER' ? { tenantName: acc.tenantName } : {})
    };
 
  return safe(`Register ${role}`, async () => {
    const result = await request(path, { method: 'POST', body: JSON.stringify(body), skipAuth: true });
    // FIX: регистрация НЕ логинит пользователя. Сохраняем только токен верификации и id, но НЕ access-токен.
    if (result?.verificationToken) state.verificationTokens[role] = result.verificationToken;
    if (result?.tenantId && role === 'OWNER') state.tenantId = result.tenantId;
    if (result?.user?.id && role === 'OWNER') state.ownerUserId = result.user.id;
    persist();
    setValue(`verify-${role}`, state.verificationTokens[role] || '');
    if (role === 'OWNER') {
      setValue('resetEmail', acc.email);
      setValue('supplierEmail', acc.email);
      setValue('customerEmail', acc.email);
    }
    return result;
  }, `${role} account was registered (NOT logged in). Verify email, then click Login.`);
}
 
async function verifyRole(role) {
  const token = value(`verify-${role}`) || state.verificationTokens[role];
  if (!token) {
    toast('warn', `Verify ${role}`, 'Click the Verify Email button in Gmail or paste the verification token from the email.');
    return null;
  }
 
  return safe(`Verify ${role}`, () => request(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'GET', skipAuth: true
  }), `${role} email verified. You can log in now.`);
}
 
async function loginRole(role) {
  readRoleInputs(role);
  const acc = account(role);
  return safe(`Login ${role}`, async () => {
    const result = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: acc.email, password: acc.password }),
      skipAuth: true
    });
    clearAllAuthSessions();
    rememberAuth(role, result);
    state.activeRole = role;
    if (role === 'OWNER') {
      setValue('platformTenantId', state.tenantId);
      setValue('forceResetUserId', state.ownerUserId);
    }
    return result;
  }, `Logged in as ${role}. Previous frontend session was cleared, so only this role is active.`);
}
 
async function logoutRole(role = state.activeRole) {
  const token = refreshToken(role);
  if (!token) {
    toast('warn', `Logout ${role}`, 'No refresh token saved for this role.');
    return null;
  }
  return safe(`Logout ${role}`, async () => {
    const result = await request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
      skipAuth: true
    });
    delete state.tokens[role];
    delete state.refreshTokens[role];
    return result;
  }, `${role} refresh token was revoked.`);
}
 
async function refreshCurrentToken() {
  const role = state.activeRole;
  const token = refreshToken(role);
  if (!token) {
    toast('warn', 'Refresh token', `No refresh token saved for ${role}.`);
    return null;
  }
  return safe(`Refresh ${role}`, async () => {
    const result = await request('/auth/refresh', {
      method: 'POST', body: JSON.stringify({ refreshToken: token }), skipAuth: true
    });
    if (result.accessToken) state.tokens[role] = result.accessToken;
    return result;
  }, `${role} access token refreshed.`);
}
 
async function addRoleToTenant(role) {
  if (!['MANAGER', 'STAFF', 'AUDITOR'].includes(role)) return null;
  if (!requireFrontendRole(['OWNER'], `Add ${role} to tenant`)) return null;
  readRoleInputs(role);
  const acc = account(role);
  return safe(`Assign ${role} in OWNER tenant`, async () => {
    const result = await request('/memberships', {
      method: 'POST',
      role: 'OWNER',
      body: JSON.stringify({ email: acc.email, role })
    });
    state.memberships[role] = [result];
    return result;
  }, `${role} was assigned to the OWNER tenant. Login ${role} again to load this membership.`);
}
 
async function removeRoleFromTenant(role) {
  if (!['MANAGER', 'STAFF', 'AUDITOR'].includes(role)) return null;
  if (!requireFrontendRole(['OWNER'], `Remove ${role} from tenant`)) return null;
  const membershipId = state.memberships[role]?.[0]?.id;
  if (!membershipId) {
    toast('warn', `Remove ${role}`, 'No membership ID saved. Click Assign or list memberships in Postman first.');
    return null;
  }
  return safe(`Remove ${role} from OWNER tenant`, async () => {
    await request(`/memberships/${membershipId}`, { method: 'DELETE', role: 'OWNER' });
    delete state.memberships[role];
    return { message: `${role} membership removed`, membershipId };
  }, `${role} was removed from the OWNER tenant.`);
}
 
async function requestReset() {
  const email = value('resetEmail');
  return safe('Request password reset', async () => {
    const result = await request('/auth/request-password-reset', {
      method: 'POST', body: JSON.stringify({ email }), skipAuth: true
    });
    if (result?.resetToken) {
      setValue('resetToken', result.resetToken);
      state.resetTokens[email] = result.resetToken;
    }
    return result;
  }, 'Password reset email was queued. Check inbox.');
}
 
async function resetPassword() {
  return safe('Reset password', async () => {
    const result = await request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: value('resetToken'), newPassword: value('newPassword') }),
      skipAuth: true
    });
 
    clearAllAuthSessions();
    state.activeRole = 'OWNER';
    setValue('resetToken', '');
    setValue('newPassword', '');
    persist();
    return result;
  }, 'Password was reset. All frontend sessions were cleared. Log in again with the new password.');
}
 
function requireId(name, label) {
  const val = state[name];
  if (!val) throw new Error(`${label} is missing. Create or load it first.`);
  return val;
}
 
async function createWarehouse(slot) {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Create warehouse')) return null;
  const isA = slot === 'A';
  return safe(`Create warehouse ${slot}`, async () => {
    const result = await request('/warehouses', {
      method: 'POST',
      body: JSON.stringify({
        name: value(isA ? 'warehouseAName' : 'warehouseBName'),
        address: value(isA ? 'warehouseAAddress' : 'warehouseBAddress')
      })
    });
    if (isA) state.warehouseAId = result.id;
    else state.warehouseBId = result.id;
    return result;
  }, `Warehouse ${slot} created by ${state.activeRole}. Audit log written.`);
}
 
async function updateWarehouse(slot) {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Update warehouse')) return null;
  const isA = slot === 'A';
  const warehouseId = requireId(isA ? 'warehouseAId' : 'warehouseBId', `Warehouse ${slot} ID`);
  return safe(`Update warehouse ${slot}`, () => request(`/warehouses/${warehouseId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: value(isA ? 'warehouseAName' : 'warehouseBName'),
      address: value(isA ? 'warehouseAAddress' : 'warehouseBAddress')
    })
  }), `Warehouse ${slot} updated. Audit log written.`);
}
 
function pickList(response) {
  return response?.data || response?.items || [];
}
 
async function listWarehouses() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'], 'List warehouses')) return null;
  return safe('List warehouses', async () => {
    const result = await request('/warehouses?limit=20');
    const list = pickList(result);
    if (list[0]?.id) state.warehouseAId = state.warehouseAId || list[0].id;
    if (list[1]?.id) state.warehouseBId = state.warehouseBId || list[1].id;
    return result;
  }, 'Warehouses loaded. IDs saved for next actions.');
}
 
async function createSupplier() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Create supplier')) return null;
  return safe('Create supplier', async () => {
    const body = {
      name: value('supplierName'),
      phone: value('supplierPhone') || undefined,
      email: value('supplierEmail') || undefined
    };
    const result = await request('/catalog/suppliers', { method: 'POST', body: JSON.stringify(body) });
    state.supplierId = result.id;
    return result;
  }, 'Supplier created and saved. Audit log written.');
}
 
async function listSuppliers() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'], 'List suppliers')) return null;
  return safe('List suppliers', async () => {
    const result = await request('/catalog/suppliers?limit=20');
    const list = pickList(result);
    if (list[0]?.id) state.supplierId = state.supplierId || list[0].id;
    return result;
  }, 'Suppliers loaded.');
}
 
async function createCategory() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Create category')) return null;
  return safe('Create category', async () => {
    const result = await request('/catalog/categories', {
      method: 'POST', body: JSON.stringify({ name: value('categoryName') })
    });
    state.categoryId = result.id;
    return result;
  }, 'Category created and saved. Audit log written.');
}
 
async function listCategories() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'], 'List categories')) return null;
  return safe('List categories', async () => {
    const result = await request('/catalog/categories?limit=20');
    const list = pickList(result);
    if (list[0]?.id) state.categoryId = state.categoryId || list[0].id;
    return result;
  }, 'Categories loaded.');
}
 
async function createProduct() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Create product')) return null;
  return safe('Create product', async () => {
    const body = {
      sku: value('productSku'),
      barcode: value('productBarcode') || undefined,
      name: value('productName'),
      description: 'Frontend demo product',
      basePrice: numberValue('basePrice'),
      minSalePrice: numberValue('minSalePrice'),
      reorderPoint: numberValue('reorderPoint'),
      reorderQuantity: numberValue('reorderQuantity'),
      supplierId: state.supplierId || undefined,
      categoryId: state.categoryId || undefined
    };
    const result = await request('/products', { method: 'POST', body: JSON.stringify(body) });
    state.productId = result.id;
    return result;
  }, 'Product created and saved. Audit log written.');
}
 
async function updateProductRules() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Update product reorder rules')) return null;
  return safe('Update product reorder rules', async () => {
    const productId = requireId('productId', 'Product ID');
    return request(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        reorderPoint: numberValue('reorderPoint'),
        reorderQuantity: numberValue('reorderQuantity')
      })
    });
  }, 'Product reorder rules updated. Audit log written.');
}
 
async function listProducts() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'], 'List products')) return null;
  return safe('List products', async () => {
    const result = await request('/products?limit=20');
    const list = pickList(result);
    if (list[0]?.id) state.productId = state.productId || list[0].id;
    return result;
  }, 'Products loaded.');
}
 
async function getProductDetails() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'], 'Get product details')) return null;
  return safe('Get product details', () => request(`/products/${requireId('productId', 'Product ID')}`), 'Product details loaded.');
}
 
async function archiveProduct() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Archive product')) return null;
  return safe('Archive product', () => request(`/products/${requireId('productId', 'Product ID')}`, { method: 'DELETE' }), 'Product archived. Audit log written.');
}
 
async function triggerLowStockEmailDemo() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Low-stock email demo')) return null;
  return safe('Low-stock email demo', async () => {
    const productId = requireId('productId', 'Product ID');
    await request(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reorderPoint: 999999, reorderQuantity: Number(value('reorderQuantity') || 40) })
    });
    const result = await request('/inventory/batches', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        warehouseId: requireId('warehouseAId', 'Warehouse A ID'),
        quantityOnHand: 1,
        unitCost: numberValue('unitCost') || 300,
        salePrice: numberValue('salePrice') || 520,
        minSalePrice: numberValue('minSalePrice') || 350,
        receivedAt: new Date().toISOString()
      })
    });
    state.batchId = result.id;
    return { message: 'Low-stock condition created. Backend enqueued low-stock alert email to OWNER/MANAGER recipients.', batch: result };
  }, 'Low-stock alert email was triggered through real inventory flow.');
}
 
async function receiveInventory() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF'], 'Receive inventory')) return null;
  return safe('Receive inventory', async () => {
    const result = await request('/inventory/batches', {
      method: 'POST',
      body: JSON.stringify({
        productId: requireId('productId', 'Product ID'),
        warehouseId: requireId('warehouseAId', 'Warehouse A ID'),
        quantityOnHand: numberValue('quantityOnHand'),
        unitCost: numberValue('unitCost'),
        salePrice: numberValue('salePrice'),
        minSalePrice: numberValue('minSalePrice'),
        receivedAt: new Date().toISOString()
      })
    });
    state.batchId = result.id;
    return result;
  }, 'Inventory batch received. If available quantity is below reorder point, required low-stock email is queued.');
}
 
async function adjustInventory() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Adjust inventory')) return null;
  return safe('Adjust inventory', () => request('/inventory/adjustments', {
    method: 'POST',
    body: JSON.stringify({
      batchId: requireId('batchId', 'Batch ID'),
      newQuantityOnHand: numberValue('newQuantityOnHand'),
      reason: value('adjustReason'),
      note: value('adjustNote') || undefined
    })
  }), 'Inventory adjustment saved. Audit log written.');
}
 
async function reportInventoryIssue() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF'], 'Report damaged/missing stock')) return null;
  return safe('Report inventory issue', async () => {
    const result = await request('/inventory/issue-reports', {
      method: 'POST',
      body: JSON.stringify({
        batchId: requireId('batchId', 'Batch ID'),
        proposedQuantity: numberValue('issueProposedQuantity'),
        reason: value('issueReason'),
        note: value('issueNote') || undefined
      })
    });
    state.issueReportId = result.id;
    return result;
  }, 'Issue report created. MANAGER/OWNER must approve before stock changes.');
}
 
async function approveInventoryIssue() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Approve inventory issue')) return null;
  return safe('Approve inventory issue', () => request(`/inventory/issue-reports/${requireId('issueReportId', 'Issue Report ID')}/approve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote: 'Approved after manager review' })
  }), 'Issue report approved and inventory adjustment applied.');
}
 
async function rejectInventoryIssue() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Reject inventory issue')) return null;
  return safe('Reject inventory issue', () => request(`/inventory/issue-reports/${requireId('issueReportId', 'Issue Report ID')}/reject`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote: 'Rejected after manager review' })
  }), 'Issue report rejected. Stock was not changed.');
}
 
async function listInventoryIssues() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'], 'List inventory issues')) return null;
  return safe('List inventory issue reports', async () => {
    const result = await request('/inventory/issue-reports?limit=20');
    const list = pickList(result);
    if (list[0]?.id) state.issueReportId = state.issueReportId || list[0].id;
    return result;
  }, 'Inventory issue reports loaded.');
}
 
async function createReservation() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF'], 'Create reservation')) return null;
  return safe('Create reservation', async () => {
    const result = await request('/reservations', {
      method: 'POST',
      body: JSON.stringify({
        warehouseId: requireId('warehouseAId', 'Warehouse A ID'),
        customerName: value('customerName') || undefined,
        customerEmail: value('customerEmail') || undefined,
        idempotencyKey: `frontend-checkout-${Date.now()}`,
        items: [{ productId: requireId('productId', 'Product ID'), quantity: numberValue('reservationQty') }]
      })
    });
    state.reservationId = result.id;
    return result;
  }, 'Reservation created. Inventory is reserved.');
}
 
async function confirmReservation() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF'], 'Confirm reservation')) return null;
  return safe('Confirm reservation', () => request(`/reservations/${requireId('reservationId', 'Reservation ID')}/confirm`, {
    method: 'POST'
  }), 'Reservation confirmed and sale created.');
}
 
async function listReservations() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'], 'List reservations')) return null;
  return safe('List reservations', () => request('/reservations?limit=20'), 'Reservations loaded.');
}
 
async function createTransfer() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF'], 'Create transfer request')) return null;
  return safe('Create transfer request', async () => {
    const result = await request('/transfers', {
      method: 'POST',
      body: JSON.stringify({
        fromWarehouseId: requireId('warehouseAId', 'Warehouse A ID'),
        toWarehouseId: requireId('warehouseBId', 'Warehouse B ID'),
        items: [{ productId: requireId('productId', 'Product ID'), quantity: numberValue('transferQty') }]
      })
    });
    state.transferId = result.id;
    return result;
  }, 'Transfer request created with status REQUESTED. Next: OWNER/MANAGER approves it.');
}
 
async function approveTransfer() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Approve transfer')) return null;
  return safe('Approve transfer', () => request(`/transfers/${requireId('transferId', 'Transfer ID')}/approve`, { method: 'POST' }), 'Transfer approved. Next: dispatch it.');
}
 
async function dispatchTransfer() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF'], 'Dispatch transfer')) return null;
  return safe('Dispatch transfer', () => request(`/transfers/${requireId('transferId', 'Transfer ID')}/dispatch`, { method: 'POST' }), 'Transfer is now IN_TRANSIT. Next: receive it at Warehouse B.');
}
 
async function receiveTransfer() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF'], 'Receive transfer')) return null;
  return safe('Receive transfer', () => request(`/transfers/${requireId('transferId', 'Transfer ID')}/receive`, { method: 'POST' }), 'Transfer received. Stock moved atomically and transfer receipt email queued.');
}
 
async function cancelTransfer() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Cancel transfer')) return null;
  return safe('Cancel transfer', () => request(`/transfers/${requireId('transferId', 'Transfer ID')}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: 'Cancelled from frontend demo' })
  }), 'Transfer cancelled before receipt.');
}
 
async function listTransfers() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'STAFF', 'AUDITOR'], 'List transfers')) return null;
  return safe('List transfers', async () => {
    const result = await request('/transfers?limit=20');
    const list = pickList(result);
    if (list[0]?.id) state.transferId = state.transferId || list[0].id;
    return result;
  }, 'Transfers loaded. Latest transfer ID saved if missing.');
}
 
async function listSales() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'AUDITOR'], 'List sales')) return null;
  return safe('List sales', () => request('/sales?limit=20'), 'Sales loaded.');
}
 
async function createPurchaseOrder() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Create purchase order')) return null;
  return safe('Create purchase order', async () => {
    const result = await request('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify({
        supplierId: requireId('supplierId', 'Supplier ID'),
        expectedAt: value('poExpectedAt') || undefined,
        notes: 'Restock based on forecast',
        items: [{ productId: requireId('productId', 'Product ID'), quantity: numberValue('poQty'), unitCost: numberValue('unitCost') }]
      })
    });
    state.purchaseOrderId = result.id;
    return result;
  }, 'Purchase order created. Audit log written; confirmation email is sent after Confirm PO.');
}
 
async function confirmPurchaseOrder() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Confirm purchase order')) return null;
  return safe('Confirm purchase order', () => request(`/purchase-orders/${requireId('purchaseOrderId', 'Purchase Order ID')}/confirm`, {
    method: 'POST'
  }), 'Purchase order confirmed and required supplier email queued.');
}
 
async function cancelPurchaseOrder() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Cancel purchase order')) return null;
  return safe('Cancel purchase order', () => request(`/purchase-orders/${requireId('purchaseOrderId', 'Purchase Order ID')}/cancel`, {
    method: 'POST'
  }), 'Purchase order cancelled. Audit log written.');
}
 
async function listPurchaseOrders() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'AUDITOR'], 'List purchase orders')) return null;
  return safe('List purchase orders', () => request('/purchase-orders?limit=20'), 'Purchase orders loaded.');
}
 
 
async function lowStock() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'AUDITOR'], 'Reports')) return null;
  return safe('Low stock report', () => request('/reports/low-stock'), 'Low stock report loaded.');
}
 
async function deadStockReport() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'AUDITOR'], 'Reports')) return null;
  return safe('Dead stock report', () => request('/reports/dead-stock'), 'Dead stock report loaded.');
}
 
async function forecast() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'AUDITOR'], 'Forecast reports')) return null;
  return safe('Forecast reorder suggestions', () => request('/reports/forecast/reorder-suggestions'), 'Forecast suggestions loaded.');
}
 
async function inventorySnapshot() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'AUDITOR'], 'Inventory snapshot')) return null;
  return safe('Inventory snapshot', () => request('/reports/inventory-snapshot'), 'Inventory snapshot loaded.');
}
 
async function getDeadStockPolicy() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'AUDITOR'], 'Dead-stock policy')) return null;
  return safe('Get dead-stock policy', () => request('/reports/dead-stock-policy'), 'Dead-stock policy loaded.');
}
 
async function updateDeadStockPolicy() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Update dead-stock policy')) return null;
  return safe('Update dead-stock policy', () => request('/reports/dead-stock-policy', {
    method: 'PATCH',
    body: JSON.stringify({
      ageDays: numberValue('deadStockAgeDays'),
      discountPercent: numberValue('deadStockDiscountPercent'),
      cooldownHours: numberValue('deadStockCooldownHours')
    })
  }), 'Tenant dead-stock policy updated.');
}
 
async function runDeadStockDecay() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Dead-stock decay')) return null;
  return safe('Run dead-stock decay', () => request('/reports/dead-stock-decay/run', { method: 'POST' }), 'Dead-stock price decay applied.');
}
 
async function triggerDeadStock() {
  if (!requireFrontendRole(['OWNER', 'MANAGER'], 'Dead-stock queue trigger')) return null;
  return safe('Trigger dead-stock queue', () => request('/jobs/dead-stock/trigger', { method: 'POST' }), 'Dead-stock job enqueued.');
}
 
async function queueStatus() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'AUDITOR'], 'Queue status')) return null;
  return safe('Queue status', () => request('/jobs/status'), 'Queue counts loaded.');
}
 
async function auditLogs() {
  if (!requireFrontendRole(['OWNER', 'MANAGER', 'AUDITOR'], 'Audit logs')) return null;
  return safe('Tenant audit logs', () => request('/audit-logs?limit=20'), 'Tenant audit logs loaded.');
}
 
async function platformTenants() {
  if (!requireFrontendRole(['SUPERADMIN'], 'Platform admin')) return null;
  return safe('Platform list tenants', async () => {
    const result = await request('/platform/tenants?limit=20', { role: 'SUPERADMIN' });
    const list = pickList(result);
    if (list[0]?.id) {
      setValue('platformTenantId', state.tenantId || list[0].id);
    }
    return result;
  }, 'Tenants loaded by SUPERADMIN.');
}
 
async function platformMetrics() {
  if (!requireFrontendRole(['SUPERADMIN'], 'Platform metrics')) return null;
  return safe('Platform metrics', () => request('/platform/metrics', { role: 'SUPERADMIN' }), 'Platform metrics loaded.');
}
 
async function platformAuditLogs() {
  if (!requireFrontendRole(['SUPERADMIN'], 'Platform audit logs')) return null;
  return safe('Platform audit logs', () => request('/platform/audit-logs?limit=20', { role: 'SUPERADMIN' }), 'Platform audit logs loaded.');
}
 
async function suspendTenant() {
  if (!requireFrontendRole(['SUPERADMIN'], 'Suspend tenant')) return null;
  const tenantId = value('platformTenantId') || state.tenantId;
  return safe('Suspend tenant', () => request(`/platform/tenants/${tenantId}/suspend`, {
    method: 'PATCH', role: 'SUPERADMIN', body: JSON.stringify({ reason: value('suspendReason') || undefined })
  }), 'Tenant suspended by SUPERADMIN. Reactivate it before continuing tenant workflows.');
}
 
async function reactivateTenant() {
  if (!requireFrontendRole(['SUPERADMIN'], 'Reactivate tenant')) return null;
  const tenantId = value('platformTenantId') || state.tenantId;
  return safe('Reactivate tenant', () => request(`/platform/tenants/${tenantId}/reactivate`, {
    method: 'PATCH', role: 'SUPERADMIN'
  }), 'Tenant reactivated. Tenant users can work again.');
}
 
async function forcePasswordReset() {
  if (!requireFrontendRole(['SUPERADMIN'], 'Force password reset')) return null;
  const userId = value('forceResetUserId') || state.ownerUserId;
  return safe('Force user password reset', () => request(`/platform/users/${userId}/force-password-reset`, {
    method: 'PATCH', role: 'SUPERADMIN', body: JSON.stringify({ reason: value('forceResetReason') || undefined })
  }), 'Password reset email was forced by SUPERADMIN.');
}
 
function readRoleInputs(role) {
  const acc = account(role);
  ['email', 'username', 'password', 'tenantName', 'setupKey'].forEach((field) => {
    const el = $(`${field}-${role}`);
    if (el) acc[field] = el.value.trim();
  });
  state.accounts[role] = acc;
  persist();
}
 
function renderRoleTabs() {
  $('roleTabs').innerHTML = ROLES.map((role) => {
    const active = role === state.activeRole ? 'active' : '';
    const logged = activeToken(role) ? '<span class="pill ok">logged</span>' : '<span class="pill bad">no token</span>';
    return `
      <div class="role-tab ${active}" data-role-tab="${role}">
        <strong>${role}</strong>
        <small>${escapeHtml(PERMISSIONS[role])}</small>
        <div class="pill-row">${logged}</div>
      </div>
    `;
  }).join('');
}
 
function renderRoleCards() {
  $('roleCards').innerHTML = ROLES.map((role) => {
    const acc = account(role);
    const isSuper = role === 'SUPERADMIN';
    const canBeAdded = ['MANAGER', 'STAFF', 'AUDITOR'].includes(role);
    const verifiedToken = state.verificationTokens[role] || '';
    const tokenStatus = activeToken(role) ? '<span class="pill ok">token saved</span>' : '<span class="pill warn">not logged in</span>';
    const membershipText = state.memberships[role]?.length
      ? state.memberships[role].map((m) => `${m.role}:${short(m.tenantId)}`).join(', ')
      : 'no membership loaded';
 
    return `
      <div class="card col-4">
        <h4>${role}</h4>
        <p class="desc">${escapeHtml(PERMISSIONS[role])}</p>
        <div class="pill-row">${tokenStatus}<span class="pill blue">${escapeHtml(membershipText)}</span></div>
        <div class="form-grid">
          <div class="full"><label>Email</label><input id="email-${role}" value="${escapeHtml(acc.email)}" /></div>
          <div><label>Username</label><input id="username-${role}" value="${escapeHtml(acc.username)}" /></div>
          <div><label>Password</label><input id="password-${role}" value="${escapeHtml(acc.password)}" /></div>
          ${isSuper
            ? `<div class="full"><label>SUPERADMIN setup key</label><input id="setupKey-${role}" value="${escapeHtml(acc.setupKey)}" /></div>`
            : (role === 'OWNER'
              ? `<div class="full"><label>Tenant name</label><input id="tenantName-${role}" value="${escapeHtml(acc.tenantName)}" /></div>`
              : `<div class="full account-note"><strong>Account-only registration</strong><br />This user registers and verifies email first. OWNER assigns ${role} inside the main tenant after that.</div>`)}
          <div class="full"><label>Verification token from email</label><input id="verify-${role}" value="${escapeHtml(verifiedToken)}" placeholder="paste token copied from Gmail" /></div>
        </div>
        <div class="actions">
          <button data-role-action="register" data-role="${role}">Register</button>
          <button class="secondary" data-role-action="verify" data-role="${role}">Verify</button>
          <button class="ok" data-role-action="login" data-role="${role}">Login</button>
          <button class="ghost" data-role-action="active" data-role="${role}">Use role</button>
          <button class="secondary" data-role-action="logout" data-role="${role}">Logout</button>
          ${canBeAdded ? `<button class="warn" data-role-action="add" data-role="${role}">Assign to OWNER tenant</button><button class="danger" data-role-action="remove" data-role="${role}">Remove from tenant</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}
 
function short(id) {
  return id ? String(id).slice(0, 8) : '-';
}
 
function renderPills() {
  const values = [
    ['tenant', state.tenantId],
    ['warehouse A', state.warehouseAId],
    ['warehouse B', state.warehouseBId],
    ['supplier', state.supplierId],
    ['category', state.categoryId],
    ['product', state.productId],
    ['batch', state.batchId],
    ['reservation', state.reservationId],
    ['transfer', state.transferId],
    ['issue report', state.issueReportId],
    ['purchase order', state.purchaseOrderId],
    ['owner user', state.ownerUserId]
  ];
  $('idPills').innerHTML = values.map(([label, val]) => `
    <span class="pill ${val ? 'ok' : 'warn'}">${escapeHtml(label)}: <span class="mono">${escapeHtml(short(val))}</span></span>
  `).join('');
}
 
function renderStatus() {
  const role = state.activeRole;
  const logged = Boolean(activeToken(role));
  $('activeRoleText').textContent = logged ? role : '—';
  $('loginStatusText').textContent = logged ? `Logged in as ${role}` : 'Not logged in';
  $('apiStatusText').textContent = apiBase();
  // FIX: пока нет токена — не показываем конкретную роль как активную сессию.
  $('sidebarSession').innerHTML = logged
    ? `
    <div class="pill-row">
      <span class="pill ok">Logged in</span>
      <span class="pill blue">${escapeHtml(role)}</span>
    </div>
    <div style="margin-top:8px;" class="mono">${escapeHtml(account(role).email)}</div>
    <div class="small" style="margin-top:8px;">Tenant: ${escapeHtml(short(state.tenantId))}</div>
    <div class="actions" style="margin-top:10px;">
      <button class="secondary" data-action="refreshCurrentToken">Refresh token</button>
      <button class="secondary" data-action="logoutCurrent">Logout</button>
    </div>
  `
    : `
    <div class="pill-row">
      <span class="pill bad">No active session</span>
    </div>
    <div class="small" style="margin-top:8px;">Login a role to start a session.</div>
  `;
}
 
function syncInputsFromState() {
  setValue('apiBase', state.apiBase);
  setValue('platformTenantId', value('platformTenantId') || state.tenantId);
  setValue('forceResetUserId', value('forceResetUserId') || state.ownerUserId);
  if (!value('resetEmail')) setValue('resetEmail', account(state.activeRole).email || account('OWNER').email);
  if (!value('supplierEmail')) setValue('supplierEmail', account('OWNER').email);
  if (!value('customerEmail')) setValue('customerEmail', account('OWNER').email);
}
 
function render() {
  syncInputsFromState();
  renderRoleTabs();
  renderRoleCards();
  renderPills();
  renderStatus();
  renderLogs();
  renderPage();
  applyActionVisibility();
}
 
const ACTIONS = {
  saveApiBase,
  health,
  openDocs,
  requestReset,
  resetPassword,
  createWarehouseA: () => createWarehouse('A'),
  createWarehouseB: () => createWarehouse('B'),
  updateWarehouseA: () => updateWarehouse('A'),
  updateWarehouseB: () => updateWarehouse('B'),
  listWarehouses,
  createSupplier,
  listSuppliers,
  createCategory,
  listCategories,
  createProduct,
  updateProductRules,
  listProducts,
  getProductDetails,
  archiveProduct,
  triggerLowStockEmailDemo,
  receiveInventory,
  adjustInventory,
  reportInventoryIssue,
  approveInventoryIssue,
  rejectInventoryIssue,
  listInventoryIssues,
  createReservation,
  confirmReservation,
  listReservations,
  createTransfer,
  approveTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  listTransfers,
  listSales,
  createPurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  listPurchaseOrders,
  lowStock,
  deadStockReport,
  forecast,
  inventorySnapshot,
  getDeadStockPolicy,
  updateDeadStockPolicy,
  runDeadStockDecay,
  triggerDeadStock,
  queueStatus,
  auditLogs,
  platformTenants,
  platformMetrics,
  platformAuditLogs,
  suspendTenant,
  reactivateTenant,
  forcePasswordReset,
  refreshCurrentToken,
  logoutCurrent: () => logoutRole(state.activeRole),
  clearLogs: () => { logs = []; renderLogs(); output('Logs cleared.'); }
};
 
document.addEventListener('click', (event) => {
  const navLink = event.target.closest('[data-page-link]');
  if (navLink) {
    event.preventDefault();
    const page = navLink.dataset.pageLink;
    if (!canAccessPage(page)) {
      const allowed = (PAGES[page] || PAGES.overview).roles.join(', ');
      toast('warn', 'Page locked', isLoggedIn() ? `${state.activeRole} cannot open this page. Allowed roles: ${allowed}.` : `Login first. Allowed roles: ${allowed}.`);
      return;
    }
    setPage(page);
    return;
  }
 
  const roleTab = event.target.closest('[data-role-tab]');
  if (roleTab) {
    setActiveRole(roleTab.dataset.roleTab);
    return;
  }
 
  const roleAction = event.target.closest('[data-role-action]');
  if (roleAction) {
    const role = roleAction.dataset.role;
    const action = roleAction.dataset.roleAction;
    if (action === 'register') registerRole(role);
    if (action === 'verify') verifyRole(role);
    if (action === 'login') loginRole(role);
    if (action === 'logout') logoutRole(role);
    if (action === 'active') setActiveRole(role);
    if (action === 'add') addRoleToTenant(role);
    if (action === 'remove') removeRoleFromTenant(role);
    return;
  }
 
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const actionName = actionButton.dataset.action;
    const allowed = ACTION_ROLES[actionName];
    if (allowed && !requireFrontendRole(allowed, actionName)) return;
    const action = ACTIONS[actionName];
    if (action) action();
  }
});
 
document.addEventListener('input', (event) => {
  const input = event.target;
  const match = input.id.match(/^(email|username|password|tenantName|setupKey)-(.+)$/);
  if (match) setAccountField(match[2], match[1], input.value);
  if (input.id === 'apiBase') {
    state.apiBase = apiBase();
    persist();
    renderStatus();
  }
});
 
window.addEventListener('hashchange', () => {
  const page = getPageFromLocation();
  state.activePage = page;
  persist();
  render();
});
 
window.addEventListener('load', async () => {
  render();
  const handled = await handleIncomingEmailLink();
  if (!handled) {
    toast('ok', 'Frontend ready', 'Use Auth first: register, click the Verify Email button in Gmail, then login OWNER.');
  }
});
