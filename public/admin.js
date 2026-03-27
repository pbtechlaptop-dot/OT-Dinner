const ADMIN_PERMISSION_ALL = '*';
const ADMIN_PERMISSION_OPTIONS = [
  { key: 'import', label: '匯入資料' },
  { key: 'restaurants', label: '餐廳' },
  { key: 'drinks', label: '飲品' },
  { key: 'staff', label: '部門與人員' },
  { key: 'menus', label: '菜單' },
  { key: 'reset_main', label: '重置主站訂單' },
  { key: 'reset_lady_ruby', label: '重置 Lady Ruby 訂單' },
  { key: 'users', label: '用戶與權限' }
];

const state = {
  authenticated: false,
  username: '',
  password: '',
  permissions: [],
  allowedStaffDepartments: [],
  isRoot: false,
  dirty: false,
  menuEdit: null,
  adminUsers: [],
  logs: [],
  seed: { restaurants: [], staff: {}, drinks: [], menus: {} }
};

const el = {
  loginCard: document.getElementById('loginCard'),
  loginUsername: document.getElementById('loginUsername'),
  loginPassword: document.getElementById('loginPassword'),
  loginBtn: document.getElementById('loginBtn'),
  loginHint: document.getElementById('loginHint'),
  adminApp: document.getElementById('adminApp'),
  logoutBtn: document.getElementById('logoutBtn'),
  saveBtn: document.getElementById('saveBtn'),
  resetDayBtn: document.getElementById('resetDayBtn'),
  resetLadyRubyBtn: document.getElementById('resetLadyRubyBtn'),
  status: document.getElementById('status'),
  currentUserText: document.getElementById('currentUserText'),

  sectionImport: document.getElementById('sectionImport'),
  sectionRestaurants: document.getElementById('sectionRestaurants'),
  sectionDrinks: document.getElementById('sectionDrinks'),
  sectionStaff: document.getElementById('sectionStaff'),
  sectionMenus: document.getElementById('sectionMenus'),
  sectionUsers: document.getElementById('sectionUsers'),
  sectionLogs: document.getElementById('sectionLogs'),

  importFile: document.getElementById('importFile'),
  importBtn: document.getElementById('importBtn'),
  restaurantList: document.getElementById('restaurantList'),
  newRestaurant: document.getElementById('newRestaurant'),
  addRestaurantBtn: document.getElementById('addRestaurantBtn'),
  drinkTable: document.getElementById('drinkTable'),
  drinkTc: document.getElementById('drinkTc'),
  drinkSc: document.getElementById('drinkSc'),
  drinkEn: document.getElementById('drinkEn'),
  addDrinkBtn: document.getElementById('addDrinkBtn'),
  deptSelect: document.getElementById('deptSelect'),
  newDept: document.getElementById('newDept'),
  addDeptBtn: document.getElementById('addDeptBtn'),
  removeDeptBtn: document.getElementById('removeDeptBtn'),
  staffList: document.getElementById('staffList'),
  newStaff: document.getElementById('newStaff'),
  addStaffBtn: document.getElementById('addStaffBtn'),
  menuRestaurantSelect: document.getElementById('menuRestaurantSelect'),
  menuCategorySelect: document.getElementById('menuCategorySelect'),
  newCategory: document.getElementById('newCategory'),
  addCategoryBtn: document.getElementById('addCategoryBtn'),
  menuTable: document.getElementById('menuTable'),
  menuTc: document.getElementById('menuTc'),
  menuSc: document.getElementById('menuSc'),
  menuEn: document.getElementById('menuEn'),
  menuPrice: document.getElementById('menuPrice'),
  menuOptions: document.getElementById('menuOptions'),
  addMenuBtn: document.getElementById('addMenuBtn'),
  saveRestaurantBtn: document.getElementById('saveRestaurantBtn'),
  saveDrinkBtn: document.getElementById('saveDrinkBtn'),
  saveStaffBtn: document.getElementById('saveStaffBtn'),
  saveMenuBtn: document.getElementById('saveMenuBtn'),
  saveUsersBtn: document.getElementById('saveUsersBtn'),
  adminUsersList: document.getElementById('adminUsersList'),
  newAdminUsername: document.getElementById('newAdminUsername'),
  newAdminPassword: document.getElementById('newAdminPassword'),
  newAdminPermissions: document.getElementById('newAdminPermissions'),
  newAdminDepartments: document.getElementById('newAdminDepartments'),
  newAdminDepartmentOptions: document.getElementById('newAdminDepartmentOptions'),
  addAdminUserBtn: document.getElementById('addAdminUserBtn'),
  refreshLogsBtn: document.getElementById('refreshLogsBtn'),
  logsHint: document.getElementById('logsHint'),
  adminLogsList: document.getElementById('adminLogsList'),
  toast: document.getElementById('toast'),
  busyOverlay: document.getElementById('busyOverlay'),
  busyText: document.getElementById('busyText')
};

function setStatus(text, isError = false) {
  el.status.textContent = text;
  el.status.className = `mt-2 text-sm ${isError ? 'text-red-600' : 'text-slate-500'}`;
}

let toastTimer = null;
function showToast(text, isError = false) {
  if (!el.toast) return;
  el.toast.textContent = text;
  el.toast.className = `fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-white shadow-lg ${isError ? 'bg-red-600' : 'bg-pbnavy'}`;
  el.toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 2200);
}

function setBusy(isBusy, text = '系統處理中，請稍候...') {
  if (el.busyText && text) el.busyText.textContent = text;
  if (!el.busyOverlay) return;
  el.busyOverlay.classList.toggle('hidden', !isBusy);
  el.busyOverlay.classList.toggle('flex', isBusy);
}

function formatImportAdded(added) {
  if (!added || typeof added !== 'object') return '';
  const parts = [];
  if (Number(added.restaurants || 0) > 0) parts.push(`餐廳 +${added.restaurants}`);
  if (Number(added.drinks || 0) > 0) parts.push(`飲品 +${added.drinks}`);
  if (Number(added.departments || 0) > 0) parts.push(`部門 +${added.departments}`);
  if (Number(added.staff || 0) > 0) parts.push(`人員 +${added.staff}`);
  if (Number(added.menuCategories || 0) > 0) parts.push(`分類 +${added.menuCategories}`);
  if (Number(added.menuItems || 0) > 0) parts.push(`餐點 +${added.menuItems}`);
  return parts.join('、');
}

function setLoginHint(text, isError = false) {
  el.loginHint.textContent = text;
  el.loginHint.className = `mt-2 text-sm ${isError ? 'text-red-600' : 'text-slate-500'}`;
}

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error || 'Request failed');
  }
  return res.json();
}

function hasPermission(permission) {
  if (state.isRoot) return true;
  const permissions = Array.isArray(state.permissions) ? state.permissions : [];
  return permissions.includes(ADMIN_PERMISSION_ALL) || permissions.includes(permission);
}

function permissionSummary(user = {}) {
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  if (user.isRoot || permissions.includes(ADMIN_PERMISSION_ALL)) return '全部權限';
  const labels = ADMIN_PERMISSION_OPTIONS.filter(option => permissions.includes(option.key)).map(option => option.label);
  return labels.length ? labels.join('、') : '沒有權限';
}

function setVisible(node, visible) {
  if (!node) return;
  node.classList.toggle('hidden', !visible);
}

function updateCurrentUserText() {
  if (!el.currentUserText) return;
  if (!state.authenticated) {
    el.currentUserText.textContent = '';
    return;
  }
  el.currentUserText.textContent = `目前登入：${state.username || 'admin'} ｜ ${permissionSummary({ permissions: state.permissions, isRoot: state.isRoot })}`;
}

function setSectionVisibility() {
  setVisible(el.sectionImport, hasPermission('import'));
  setVisible(el.sectionRestaurants, hasPermission('restaurants'));
  setVisible(el.sectionDrinks, hasPermission('drinks'));
  setVisible(el.sectionStaff, hasPermission('staff'));
  setVisible(el.sectionMenus, hasPermission('menus'));
  setVisible(el.sectionUsers, hasPermission('users'));
  setVisible(el.sectionLogs, state.authenticated);
  setVisible(el.saveBtn, state.isRoot);
  setVisible(el.resetDayBtn, hasPermission('reset_main'));
  setVisible(el.resetLadyRubyBtn, hasPermission('reset_lady_ruby'));
}

function setAuthUi(authenticated) {
  state.authenticated = authenticated;
  el.loginCard.classList.toggle('hidden', authenticated);
  el.adminApp.classList.toggle('hidden', !authenticated);
  updateCurrentUserText();
  if (authenticated) setSectionVisibility();
}

function markDirty(msg) {
  state.dirty = true;
  setStatus(msg ? `${msg}（未儲存）` : '已有未儲存修改，請按「儲存全部」。');
}

function requireAuth() {
  if (!state.authenticated || !state.username || !state.password) {
    setStatus('未登入或登入已失效，請重新登入。', true);
    setAuthUi(false);
    return false;
  }
  return true;
}

function handleAdminPasswordError(err) {
  if (!/Invalid admin username or password/i.test(String((err && err.message) || ''))) return false;
  logout();
  setLoginHint('帳號或密碼已失效，請重新登入。', true);
  setStatus('帳號或密碼錯誤，請重新登入。', true);
  return true;
}

function adminAuthBody(extra = {}) {
  return { username: state.username, password: state.password, ...extra };
}

function buildPermissionCheckboxes(name, selected = []) {
  return ADMIN_PERMISSION_OPTIONS.map(option => {
    const checked = selected.includes(option.key) ? 'checked' : '';
    return `<label class="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
      <input type="checkbox" name="${name}" value="${option.key}" class="h-4 w-4" ${checked} />
      <span>${option.label}</span>
    </label>`;
  }).join('');
}

function getCheckedPermissions(container, name) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(`input[name="${name}"]:checked`))
    .map(input => String(input.value || '').trim())
    .filter(Boolean);
}

function getAllDepartments() {
  return Object.keys(state.seed && state.seed.staff || {}).sort((a, b) => a.localeCompare(b));
}

function getVisibleStaffDepartments() {
  const allDepartments = getAllDepartments();
  if (state.isRoot) return allDepartments;
  if (!hasPermission('staff')) return [];
  if (!Array.isArray(state.allowedStaffDepartments) || !state.allowedStaffDepartments.length) return allDepartments;
  return allDepartments.filter(dept => state.allowedStaffDepartments.includes(dept));
}

function buildDepartmentCheckboxes(name, selected = []) {
  const departments = getAllDepartments();
  if (!departments.length) {
    return '<p class="text-xs text-slate-500">目前未有部門資料。</p>';
  }
  return departments.map(dept => {
    const checked = selected.includes(dept) ? 'checked' : '';
    return `<label class="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
      <input type="checkbox" name="${name}" value="${dept}" class="h-4 w-4" ${checked} />
      <span>${dept}</span>
    </label>`;
  }).join('');
}

function toggleDepartmentChooserForNewUser() {
  if (!el.newAdminDepartments || !el.newAdminPermissions || !el.newAdminDepartmentOptions) return;
  const permissions = getCheckedPermissions(el.newAdminPermissions, 'new-admin-permission');
  const show = permissions.includes('staff');
  el.newAdminDepartments.classList.toggle('hidden', !show);
  if (show) {
    el.newAdminDepartmentOptions.innerHTML = buildDepartmentCheckboxes('new-admin-department', []);
  }
}

function canManageDepartmentStructure() {
  if (!hasPermission('staff')) return false;
  return state.isRoot || !Array.isArray(state.allowedStaffDepartments) || !state.allowedStaffDepartments.length;
}

function updateStaffStructureControls() {
  const canManageStructure = canManageDepartmentStructure();
  if (el.newDept) {
    el.newDept.disabled = !canManageStructure;
    el.newDept.classList.toggle('hidden', !canManageStructure);
    if (!canManageStructure) el.newDept.value = '';
  }
  if (el.addDeptBtn) {
    el.addDeptBtn.disabled = !canManageStructure;
    el.addDeptBtn.classList.toggle('hidden', !canManageStructure);
  }
  if (el.removeDeptBtn) {
    el.removeDeptBtn.disabled = !canManageStructure;
    el.removeDeptBtn.classList.toggle('hidden', !canManageStructure);
  }
}

function renderNewUserPermissions() {
  if (!el.newAdminPermissions) return;
  el.newAdminPermissions.innerHTML = buildPermissionCheckboxes('new-admin-permission', []);
  el.newAdminPermissions.querySelectorAll('input[name="new-admin-permission"]').forEach(input => {
    input.addEventListener('change', toggleDepartmentChooserForNewUser);
  });
  toggleDepartmentChooserForNewUser();
}

function renderAdminUsers() {
  if (!el.adminUsersList) return;
  if (!hasPermission('users')) {
    el.adminUsersList.innerHTML = '';
    return;
  }
  if (!state.adminUsers.length) {
    el.adminUsersList.innerHTML = '<p class="rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">暫時未有額外用戶。</p>';
    return;
  }

  el.adminUsersList.innerHTML = state.adminUsers.map((user, index) => `
    <div class="rounded-lg border border-slate-200 p-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="font-semibold text-pbnavy">${user.username}</p>
          <p class="text-xs text-slate-500">留空新密碼即保持原本密碼不變。</p>
        </div>
        <button type="button" data-index="${index}" class="remove-admin-user rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white">刪除</button>
      </div>
      <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[240px_1fr]">
        <input type="password" data-index="${index}" class="admin-user-password rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="輸入新密碼（可留空）" />
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2 admin-user-permissions" data-index="${index}">
          ${buildPermissionCheckboxes(`admin-permission-${index}`, Array.isArray(user.permissions) ? user.permissions : [])}
        </div>
      </div>
      <div class="admin-user-departments-wrap mt-3 ${Array.isArray(user.permissions) && user.permissions.includes('staff') ? '' : 'hidden'}" data-index="${index}">
        <p class="mb-2 text-xs font-semibold text-slate-600">可管理部門</p>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2 admin-user-departments" data-index="${index}">
          ${buildDepartmentCheckboxes(`admin-department-${index}`, Array.isArray(user.staffDepartments) ? user.staffDepartments : [])}
        </div>
      </div>
    </div>
  `).join('');

  el.adminUsersList.querySelectorAll('.admin-user-permissions').forEach(container => {
    const index = container.dataset.index;
    container.querySelectorAll(`input[name="admin-permission-${index}"]`).forEach(input => {
      input.addEventListener('change', () => {
        const checked = getCheckedPermissions(container, `admin-permission-${index}`);
        const wrap = el.adminUsersList.querySelector(`.admin-user-departments-wrap[data-index="${index}"]`);
        if (!wrap) return;
        const show = checked.includes('staff');
        wrap.classList.toggle('hidden', !show);
        if (show) {
          const deptContainer = wrap.querySelector(`.admin-user-departments[data-index="${index}"]`);
          if (deptContainer) {
            deptContainer.innerHTML = buildDepartmentCheckboxes(`admin-department-${index}`, getCheckedPermissions(deptContainer, `admin-department-${index}`));
          }
        }
      });
    });
  });

  el.adminUsersList.querySelectorAll('.remove-admin-user').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.index);
      if (!Number.isInteger(index) || index < 0 || index >= state.adminUsers.length) return;
      const removed = state.adminUsers[index];
      state.adminUsers.splice(index, 1);
      renderAdminUsers();
      setStatus(`已移除用戶 ${removed.username}，請按「儲存此區」確認。`);
    };
  });
}

function collectAdminUsersPayload() {
  return state.adminUsers.map((user, index) => {
    const passwordInput = el.adminUsersList.querySelector(`.admin-user-password[data-index="${index}"]`);
    const permissionsWrap = el.adminUsersList.querySelector(`.admin-user-permissions[data-index="${index}"]`);
    const departmentsWrap = el.adminUsersList.querySelector(`.admin-user-departments[data-index="${index}"]`);
    const permissions = getCheckedPermissions(permissionsWrap, `admin-permission-${index}`);
    return {
      username: user.username,
      password: String((passwordInput && passwordInput.value) || '').trim(),
      permissions,
      staffDepartments: permissions.includes('staff')
        ? getCheckedPermissions(departmentsWrap, `admin-department-${index}`)
        : []
    };
  }).filter(user => user.username);
}

async function fetchSeedByCredentials(username, password) {
  const payload = await api(`/api/admin/seed?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
  return {
    seed: payload.seed || { restaurants: [], staff: {}, drinks: [], menus: {} },
    user: payload.user || { username, permissions: [], staffDepartments: [], isRoot: false }
  };
}

async function fetchAdminUsers() {
  const payload = await api(`/api/admin/users?username=${encodeURIComponent(state.username)}&password=${encodeURIComponent(state.password)}`);
  return Array.isArray(payload.users) ? payload.users : [];
}

async function fetchAdminLogs(limit = 100) {
  const payload = await api(`/api/admin/logs?username=${encodeURIComponent(state.username)}&password=${encodeURIComponent(state.password)}&limit=${encodeURIComponent(limit)}`);
  return Array.isArray(payload.logs) ? payload.logs : [];
}

async function deleteAdminLog(id) {
  const payload = await api('/api/admin/logs/delete', {
    method: 'POST',
    body: JSON.stringify(adminAuthBody({ id }))
  });
  return Boolean(payload && payload.deleted);
}

async function fetchAdminUsernames() {
  const payload = await api('/api/admin/usernames');
  return Array.isArray(payload.usernames) ? payload.usernames : ['admin'];
}

async function loadLoginUsernames() {
  if (!el.loginUsername) return;
  try {
    const usernames = await fetchAdminUsernames();
    el.loginUsername.innerHTML = usernames.map(username => `<option value="${username}">${username}</option>`).join('');
    if (!usernames.includes('admin')) {
      el.loginUsername.innerHTML = `<option value="admin">admin</option>${el.loginUsername.innerHTML}`;
    }
    el.loginUsername.value = 'admin';
  } catch {
    el.loginUsername.innerHTML = '<option value="admin">admin</option>';
    el.loginUsername.value = 'admin';
  }
}

async function loginRequest(username, password) {
  const payload = await api('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  return payload.user || { username, permissions: [], staffDepartments: [], isRoot: false };
}

let toSc = v => String(v || '');
let toTc = v => String(v || '');
try {
  if (window.OpenCC && window.OpenCC.Converter) {
    toSc = window.OpenCC.Converter({ from: 'tw', to: 'cn' });
    toTc = window.OpenCC.Converter({ from: 'cn', to: 'tw' });
  }
} catch {
  toSc = v => String(v || '');
  toTc = v => String(v || '');
}

function attachAutoConvert() {
  el.drinkTc.addEventListener('input', () => {
    const v = String(el.drinkTc.value || '').trim();
    if (v) el.drinkSc.value = toSc(v);
  });
  el.drinkSc.addEventListener('input', () => {
    const v = String(el.drinkSc.value || '').trim();
    if (v) el.drinkTc.value = toTc(v);
  });
  el.menuTc.addEventListener('input', () => {
    const v = String(el.menuTc.value || '').trim();
    if (v) el.menuSc.value = toSc(v);
  });
  el.menuSc.addEventListener('input', () => {
    const v = String(el.menuSc.value || '').trim();
    if (v) el.menuTc.value = toTc(v);
  });
}

function tag(text, onRemove) {
  const wrap = document.createElement('span');
  wrap.className = 'inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-1 text-xs';
  wrap.innerHTML = `<span>${text}</span>`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'x';
  btn.className = 'rounded bg-red-600 px-1 text-white';
  btn.onclick = onRemove;
  wrap.appendChild(btn);
  return wrap;
}

function parseOptionGroups(input) {
  if (input === null || input === undefined || input === '') return [];
  let raw = input;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  const list = Array.isArray(raw) ? raw : [];
  const cleaned = [];
  list.forEach((group, i) => {
    if (!group || typeof group !== 'object') return;
    const id = String(group.id || group.key || i + 1).trim();
    const label = String(group.label || group.name || '').trim();
    const choicesRaw = Array.isArray(group.choices || group.items) ? (group.choices || group.items) : [];
    const choices = choicesRaw.map(v => String(v || '').trim()).filter(Boolean);
    if (!choices.length) return;
    const min = Number(group.min);
    const max = Number(group.max);
    const out = { id, label, choices };
    if (Number.isFinite(min) && min >= 0) out.min = min;
    if (Number.isFinite(max) && max >= 0) out.max = max;
    cleaned.push(out);
  });
  return cleaned;
}

function parseOptionGroupsInput(rawInput) {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return { groups: [], error: '' };
  if (trimmed === '[]') return { groups: [], error: '' };
  const groups = parseOptionGroups(trimmed);
  if (!groups.length) return { groups: [], error: '選項格式錯誤（需為JSON）' };
  return { groups, error: '' };
}

function normalizeSeed() {
  const restaurants = [...new Set((state.seed.restaurants || []).map(v => String(v || '').trim()).filter(Boolean))];
  state.seed.restaurants = restaurants;

  const staffIn = state.seed.staff && typeof state.seed.staff === 'object' ? state.seed.staff : {};
  const staff = {};
  Object.keys(staffIn).forEach(dept => {
    const d = String(dept || '').trim();
    if (!d) return;
    const names = Array.isArray(staffIn[dept]) ? staffIn[dept] : [];
    const cleanNames = [...new Set(names.map(n => String(n || '').trim()).filter(Boolean))];
    if (cleanNames.length) staff[d] = cleanNames;
  });
  state.seed.staff = staff;

  const drinksIn = Array.isArray(state.seed.drinks) ? state.seed.drinks : [];
  const drinkMap = new Map();
  drinksIn.forEach(d => {
    const tc = String((d && d.tc) || '').trim();
    const sc = String((d && d.sc) || tc).trim();
    const en = String((d && d.en) || tc).trim();
    const paused = Boolean(d && d.paused);
    if (!tc) return;
    if (!drinkMap.has(tc)) drinkMap.set(tc, { tc, sc: sc || tc, en: en || tc, paused });
  });
  state.seed.drinks = Array.from(drinkMap.values());

  const menusIn = state.seed.menus && typeof state.seed.menus === 'object' ? state.seed.menus : {};
  const menus = {};
  restaurants.forEach(rest => {
    const cats = menusIn[rest] && typeof menusIn[rest] === 'object' ? menusIn[rest] : {};
    const outCats = {};
    Object.keys(cats).forEach(cat => {
      const cleanCat = String(cat || '').trim();
      if (!cleanCat) return;
      const items = Array.isArray(cats[cat]) ? cats[cat] : [];
      const map = new Map();
      items.forEach(it => {
        const nameTc = String((it && it.nameTc) || '').trim();
        const nameSc = String((it && it.nameSc) || nameTc).trim();
        const nameEn = String((it && it.nameEn) || nameTc).trim();
        const price = Number(it && it.price);
        if (!nameTc || !Number.isFinite(price) || price < 0) return;
        const optionGroups = parseOptionGroups(it && (it.optionGroups ?? it.option_groups ?? it.options));
        if (!map.has(nameTc)) {
          const base = { nameTc, nameSc: nameSc || nameTc, nameEn: nameEn || nameTc, price };
          if (optionGroups.length) base.optionGroups = optionGroups;
          map.set(nameTc, base);
        }
      });
      const cleanItems = Array.from(map.values());
      if (cleanItems.length) outCats[cleanCat] = cleanItems;
    });
    menus[rest] = outCats;
  });
  state.seed.menus = menus;
}

function renderRestaurants() {
  const selectedRestaurant = String(el.menuRestaurantSelect.value || '');
  el.restaurantList.innerHTML = '';
  state.seed.restaurants.forEach((r, i) => {
    el.restaurantList.appendChild(tag(r, () => {
      state.seed.restaurants.splice(i, 1);
      delete state.seed.menus[r];
      renderAll();
      markDirty('已刪除餐廳');
    }));
  });

  const options = ['<option value="">-- 餐廳 --</option>']
    .concat(state.seed.restaurants.map(r => `<option value="${r}">${r}</option>`));
  el.menuRestaurantSelect.innerHTML = options.join('');
  if (selectedRestaurant && state.seed.restaurants.includes(selectedRestaurant)) {
    el.menuRestaurantSelect.value = selectedRestaurant;
  } else {
    el.menuRestaurantSelect.value = '';
  }
}

function renderDrinks() {
  const rows = state.seed.drinks.map((d, i) => {
    const tc = d.tc || '';
    const sc = d.sc || tc;
    const en = d.en || tc;
    const paused = Boolean(d.paused);
    return `<tr>
      <td class="border-b px-2 py-1">${tc}</td>
      <td class="border-b px-2 py-1">${sc}</td>
      <td class="border-b px-2 py-1">${en}</td>
      <td class="border-b px-2 py-1">${paused ? '<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">已暫停</span>' : '<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">供應中</span>'}</td>
      <td class="border-b px-2 py-1">
        <button data-i="${i}" class="toggle-drink rounded bg-slate-700 px-2 py-1 text-xs text-white">${paused ? '恢復' : '暫停'}</button>
        <button data-i="${i}" class="remove-drink ml-1 rounded bg-red-600 px-2 py-1 text-xs text-white">刪除</button>
      </td>
    </tr>`;
  }).join('');
  el.drinkTable.innerHTML = `<thead><tr class="bg-slate-50"><th class="px-2 py-1 text-left">繁</th><th class="px-2 py-1 text-left">簡</th><th class="px-2 py-1 text-left">EN</th><th class="px-2 py-1 text-left">狀態</th><th></th></tr></thead><tbody>${rows}</tbody>`;
  el.drinkTable.querySelectorAll('.toggle-drink').forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.i);
      const current = state.seed.drinks[i];
      if (!current) return;
      current.paused = !current.paused;
      renderDrinks();
      markDirty(current.paused ? '已暫停飲品' : '已恢復飲品');
    };
  });
  el.drinkTable.querySelectorAll('.remove-drink').forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.i);
      state.seed.drinks.splice(i, 1);
      renderDrinks();
      markDirty('已刪除飲品');
    };
  });
}

function renderDepartments() {
  const depts = getVisibleStaffDepartments();
  el.deptSelect.innerHTML = depts.length
    ? depts.map(d => `<option value="${d}">${d}</option>`).join('')
    : '<option value="">-- 無部門 --</option>';
  updateStaffStructureControls();
  renderStaff();
}

function renderStaff() {
  const dept = el.deptSelect.value;
  const names = (state.seed.staff && state.seed.staff[dept]) ? state.seed.staff[dept] : [];
  el.staffList.innerHTML = '';
  names.forEach((n, i) => {
    el.staffList.appendChild(tag(n, () => {
      names.splice(i, 1);
      renderStaff();
      markDirty('已刪除人員');
    }));
  });
}

function currentMenuRestaurant() {
  return String(el.menuRestaurantSelect.value || '').trim();
}

function currentMenuCategory() {
  return el.menuCategorySelect.value;
}

function renderMenuCategories() {
  const rest = currentMenuRestaurant();
  if (!rest) {
    el.menuCategorySelect.innerHTML = '<option value="">-- 請先選擇餐廳 --</option>';
    el.menuCategorySelect.value = '';
    el.menuCategorySelect.disabled = true;
    el.addCategoryBtn.disabled = true;
    el.addCategoryBtn.classList.add('opacity-60', 'cursor-not-allowed');
    return;
  }
  el.menuCategorySelect.disabled = false;
  el.addCategoryBtn.disabled = false;
  el.addCategoryBtn.classList.remove('opacity-60', 'cursor-not-allowed');
  if (!state.seed.menus[rest]) state.seed.menus[rest] = {};
  const cats = Object.keys(state.seed.menus[rest]);
  el.menuCategorySelect.innerHTML = cats.length
    ? cats.map(c => `<option value="${c}">${c}</option>`).join('')
    : '<option value="">-- 無分類 --</option>';
}

function resetMenuEdit() {
  state.menuEdit = null;
  if (el.addMenuBtn) el.addMenuBtn.textContent = '\u65b0\u589e\u9910\u9ede';
  if (el.menuOptions) el.menuOptions.value = '';
}

function renderMenuItems() {
  const rest = currentMenuRestaurant();
  const cat = currentMenuCategory();
  const menuInputs = [el.menuTc, el.menuSc, el.menuEn, el.menuPrice, el.menuOptions, el.addMenuBtn];

  if (!rest) {
    menuInputs.forEach(node => { if (node) node.disabled = true; });
    el.menuTable.innerHTML = '<thead><tr class="bg-slate-50"><th class="px-2 py-1 text-left">繁</th><th class="px-2 py-1 text-left">簡</th><th class="px-2 py-1 text-left">EN</th><th class="px-2 py-1 text-left">價錢</th><th></th></tr></thead><tbody><tr><td colspan="5" class="px-2 py-3 text-slate-400">請先選擇餐廳</td></tr></tbody>';
    return;
  }

  if (!cat) {
    menuInputs.forEach(node => { if (node) node.disabled = true; });
    el.menuTable.innerHTML = '<thead><tr class="bg-slate-50"><th class="px-2 py-1 text-left">繁</th><th class="px-2 py-1 text-left">簡</th><th class="px-2 py-1 text-left">EN</th><th class="px-2 py-1 text-left">價錢</th><th></th></tr></thead><tbody><tr><td colspan="5" class="px-2 py-3 text-slate-400">請先選擇分類</td></tr></tbody>';
    return;
  }

  menuInputs.forEach(node => { if (node) node.disabled = false; });
  const items = rest && cat && state.seed.menus[rest] && state.seed.menus[rest][cat] ? state.seed.menus[rest][cat] : [];
  const rows = items.map((it, i) => `<tr>
    <td class="border-b px-2 py-1">${it.nameTc || ''}</td>
    <td class="border-b px-2 py-1">${it.nameSc || ''}</td>
    <td class="border-b px-2 py-1">${it.nameEn || ''}</td>
    <td class="border-b px-2 py-1">${Number(it.price || 0).toFixed(2)}</td>
    <td class="border-b px-2 py-1">
      <button data-i="${i}" class="edit-item rounded bg-amber-500 px-2 py-1 text-xs text-white">更改</button>
      <button data-i="${i}" class="remove-item ml-1 rounded bg-red-600 px-2 py-1 text-xs text-white">刪除</button>
    </td>
  </tr>`).join('');

  el.menuTable.innerHTML = `<thead><tr class="bg-slate-50"><th class="px-2 py-1 text-left">繁</th><th class="px-2 py-1 text-left">簡</th><th class="px-2 py-1 text-left">EN</th><th class="px-2 py-1 text-left">價錢</th><th></th></tr></thead><tbody>${rows}</tbody>`;

  el.menuTable.querySelectorAll('.remove-item').forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.i);
      items.splice(i, 1);
      if (state.menuEdit && state.menuEdit.rest === rest && state.menuEdit.cat === cat && state.menuEdit.index === i) {
        resetMenuEdit();
      }
      renderMenuItems();
      markDirty('已刪除餐點');
    };
  });

  el.menuTable.querySelectorAll('.edit-item').forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.i);
      const it = items[i];
      if (!it) return;
      state.menuEdit = { rest, cat, index: i };
      el.menuTc.value = it.nameTc || '';
      el.menuSc.value = it.nameSc || '';
      el.menuEn.value = it.nameEn || '';
      el.menuPrice.value = String(it.price ?? '');
      if (el.menuOptions) {
        el.menuOptions.value = Array.isArray(it.optionGroups) && it.optionGroups.length
          ? JSON.stringify(it.optionGroups)
          : '';
      }
      el.addMenuBtn.textContent = '\u66f4\u65b0\u9910\u9ede';
      showToast('\u5df2\u8f09\u5165\u9910\u9ede\u4f9b\u66f4\u6539');
    };
  });
}

function renderAll() {
  normalizeSeed();
  renderRestaurants();
  renderDrinks();
  renderDepartments();
  renderMenuCategories();
  renderMenuItems();
  renderAdminUsers();
  renderLogs();
  updateCurrentUserText();
  setSectionVisibility();
}

function formatLogTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  try {
    return new Intl.DateTimeFormat('zh-Hant', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function renderLogChange(change) {
  const items = Array.isArray(change && change.items) ? change.items : [];
  if (!change || !change.label || !items.length) return '';
  const preview = items.slice(0, 8);
  const extra = items.length - preview.length;
  return `<div class="rounded-md bg-slate-50 px-3 py-2">
    <p class="text-xs font-semibold text-slate-600">${change.label}</p>
    <p class="mt-1 text-sm text-slate-700">${preview.join('、')}${extra > 0 ? ` 等 ${items.length} 項` : ''}</p>
  </div>`;
}

function renderLogs() {
  if (!el.adminLogsList || !el.logsHint) return;
  const logs = Array.isArray(state.logs) ? state.logs : [];
  const scopeLabel = state.isRoot ? '全部操作紀錄' : '你自己的操作紀錄';
  el.logsHint.textContent = logs.length ? `顯示最近 ${logs.length} 筆${scopeLabel}` : `暫時未有${scopeLabel}。`;
  if (!logs.length) {
    el.adminLogsList.innerHTML = '<p class="rounded-md border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">未有可顯示的紀錄。</p>';
    return;
  }

  el.adminLogsList.innerHTML = logs.map(log => {
    const changes = Array.isArray(log && log.details && log.details.changes) ? log.details.changes : [];
    const changesHtml = changes.map(renderLogChange).filter(Boolean).join('');
    return `<article class="rounded-lg border border-slate-200 p-3">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="font-semibold text-pbnavy">${log.summary || '已更新資料'}</p>
          <p class="mt-1 text-xs text-slate-500">帳號：${log.username || 'admin'} ｜ 區域：${log.section || 'all'} ｜ ${formatLogTime(log.createdAt)}</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">${log.action || 'save'}</span>
          ${state.isRoot ? `<button type="button" data-id="${log.id || ''}" class="delete-log rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700">刪除紀錄</button>` : ''}
        </div>
      </div>
      ${changesHtml ? `<div class="mt-3 grid grid-cols-1 gap-2">${changesHtml}</div>` : ''}
    </article>`;
  }).join('');

  if (state.isRoot) {
    el.adminLogsList.querySelectorAll('.delete-log').forEach(button => {
      button.onclick = async () => {
        const id = String(button.dataset.id || '').trim();
        if (!id) return;
        if (!window.confirm('確定要刪除這筆操作紀錄？此操作不能還原。')) return;
        try {
          button.disabled = true;
          await deleteAdminLog(id);
          state.logs = state.logs.filter(log => String(log.id || '') !== id);
          renderLogs();
          setStatus('已刪除操作紀錄。');
          showToast('已刪除操作紀錄');
        } catch (err) {
          setStatus(`刪除操作紀錄失敗: ${err.message}`, true);
          showToast('刪除操作紀錄失敗', true);
          handleAdminPasswordError(err);
          button.disabled = false;
        }
      };
    });
  }
}

async function loadAdminLogs(options = {}) {
  const { silent = false } = options;
  if (!requireAuth()) return;
  try {
    const logs = await fetchAdminLogs();
    state.logs = logs;
    renderLogs();
  } catch (err) {
    state.logs = [];
    renderLogs();
    if (!silent) setStatus(`載入操作紀錄失敗: ${err.message}`, true);
    handleAdminPasswordError(err);
  }
}

async function persistIfDirty(reasonLabel) {
  if (!state.dirty) return true;
  if (!state.isRoot) {
    setStatus(`你未儲存的修改仍在畫面上，請先儲存目前區域後再進入「${reasonLabel}」。`, true);
    return false;
  }
  try {
    normalizeSeed();
    await api('/api/admin/seed', {
      method: 'POST',
      body: JSON.stringify(adminAuthBody({ seed: state.seed }))
    });
    state.dirty = false;
    await loadAdminLogs({ silent: true });
    setStatus(`已先儲存，再載入「${reasonLabel}」。`);
    return true;
  } catch (err) {
    setStatus(`自動儲存失敗: ${err.message}`, true);
    handleAdminPasswordError(err);
    return false;
  }
}

async function saveSection(section) {
  if (!requireAuth()) return;
  const labels = {
    restaurants: '餐廳',
    drinks: '飲品',
    staff: '部門與人員',
    menus: '菜單'
  };
  const label = labels[section] || '資料';

  try {
    if (section === 'restaurants') {
      const pending = String((el.newRestaurant && el.newRestaurant.value) || '').trim();
      if (pending && !state.seed.restaurants.includes(pending)) {
        state.seed.restaurants.push(pending);
        if (!state.seed.menus[pending]) state.seed.menus[pending] = {};
        el.newRestaurant.value = '';
      }
    }

    if (section === 'drinks') {
      const tcInput = String((el.drinkTc && el.drinkTc.value) || '').trim();
      const scInput = String((el.drinkSc && el.drinkSc.value) || '').trim();
      const tc = tcInput || toTc(scInput);
      const sc = scInput || toSc(tcInput || tc);
      const en = String((el.drinkEn && el.drinkEn.value) || '').trim() || tc;
      if (tc) {
        state.seed.drinks = state.seed.drinks || [];
        if (!state.seed.drinks.some(d => String(d.tc || '').trim() === tc)) {
          state.seed.drinks.push({ tc, sc: sc || tc, en: en || tc, paused: false });
        }
        el.drinkTc.value = '';
        el.drinkSc.value = '';
        el.drinkEn.value = '';
      }
    }

    if (section === 'staff') {
      if (!canManageDepartmentStructure()) {
        if (el.newDept) el.newDept.value = '';
      }
      const pendingDept = String((el.newDept && el.newDept.value) || '').trim();
      if (pendingDept && canManageDepartmentStructure()) {
        state.seed.staff = state.seed.staff || {};
        if (!state.seed.staff[pendingDept]) state.seed.staff[pendingDept] = [];
        el.newDept.value = '';
      }

      const dept = String((el.deptSelect && el.deptSelect.value) || pendingDept).trim();
      const pendingName = String((el.newStaff && el.newStaff.value) || '').trim();
      if (dept && pendingName) {
        state.seed.staff = state.seed.staff || {};
        if (!state.seed.staff[dept]) state.seed.staff[dept] = [];
        if (!state.seed.staff[dept].includes(pendingName)) state.seed.staff[dept].push(pendingName);
        el.newStaff.value = '';
      }
    }

    if (section === 'menus') {
      const rest = String((el.menuRestaurantSelect && el.menuRestaurantSelect.value) || '').trim();
      const cat = String((el.menuCategorySelect && el.menuCategorySelect.value) || '').trim();
      const tcInput = String((el.menuTc && el.menuTc.value) || '').trim();
      const scInput = String((el.menuSc && el.menuSc.value) || '').trim();
      const nameTc = tcInput || toTc(scInput);
      const nameSc = scInput || toSc(tcInput || nameTc);
      const nameEn = String((el.menuEn && el.menuEn.value) || '').trim() || nameTc;
      const price = Number(String((el.menuPrice && el.menuPrice.value) || '').trim());

      if (rest && cat && nameTc && Number.isFinite(price) && price >= 0) {
        state.seed.menus = state.seed.menus || {};
        if (!state.seed.menus[rest]) state.seed.menus[rest] = {};
        if (!state.seed.menus[rest][cat]) state.seed.menus[rest][cat] = [];
        if (!state.seed.menus[rest][cat].some(it => String(it.nameTc || '').trim() === nameTc)) {
          state.seed.menus[rest][cat].push({ nameTc, nameSc: nameSc || nameTc, nameEn: nameEn || nameTc, price });
        }
        el.menuTc.value = '';
        el.menuSc.value = '';
        el.menuEn.value = '';
        el.menuPrice.value = '';
      }
    }

    normalizeSeed();
    setBusy(true);
    await api('/api/admin/seed', {
      method: 'POST',
      body: JSON.stringify(adminAuthBody({ seed: state.seed, section }))
    });
    state.dirty = false;
    await loadAdminLogs({ silent: true });
    renderAll();
    setStatus(`已儲存「${label}」。`);
    showToast(`已儲存${label}`);
  } catch (err) {
    setStatus(`儲存${label}失敗: ${err.message}`, true);
    showToast(`儲存${label}失敗`, true);
    handleAdminPasswordError(err);
  } finally {
    setBusy(false);
  }
}

async function loadSeed() {
  if (!requireAuth()) return;
  const okPersist = await persistIfDirty('全部資料');
  if (!okPersist) return;
  try {
    setBusy(true);
    const payload = await fetchSeedByCredentials(state.username, state.password);
    state.seed = payload.seed;
    state.permissions = Array.isArray(payload.user.permissions) ? payload.user.permissions : [];
    state.allowedStaffDepartments = Array.isArray(payload.user.staffDepartments) ? payload.user.staffDepartments : [];
    state.isRoot = Boolean(payload.user.isRoot);
    state.adminUsers = hasPermission('users') ? await fetchAdminUsers() : [];
    state.dirty = false;
    renderAll();
    setStatus('已載入資料。');
    showToast('載入成功');
  } catch (err) {
    setStatus(err.message, true);
    handleAdminPasswordError(err);
  } finally {
    setBusy(false);
  }
}

async function saveSeed() {
  if (!requireAuth()) return;
  if (!state.isRoot) {
    setStatus('只有 admin 可以使用「儲存全部」。', true);
    return;
  }
  try {
    normalizeSeed();
    setBusy(true);
    await api('/api/admin/seed', {
      method: 'POST',
      body: JSON.stringify(adminAuthBody({ seed: state.seed }))
    });
    state.dirty = false;
    await loadAdminLogs({ silent: true });
    setStatus('儲存成功。');
    showToast('儲存成功');
  } catch (err) {
    setStatus(err.message, true);
    handleAdminPasswordError(err);
  } finally {
    setBusy(false);
  }
}

async function saveAdminUsers() {
  if (!requireAuth()) return;
  if (!hasPermission('users')) {
    setStatus('你沒有管理用戶的權限。', true);
    return;
  }
  try {
    const usersPayload = collectAdminUsersPayload();
    const invalidScopedUser = usersPayload.find(user => user.permissions.includes('staff') && !user.staffDepartments.length);
    if (invalidScopedUser) {
      setStatus(`請為 ${invalidScopedUser.username} 選擇至少一個可管理部門。`, true);
      return;
    }
    setBusy(true);
    const payload = await api('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(adminAuthBody({ users: usersPayload }))
    });
    state.adminUsers = Array.isArray(payload.users) ? payload.users : [];
    await loadAdminLogs({ silent: true });
    renderAdminUsers();
    setStatus('已儲存用戶與權限。');
    showToast('已儲存用戶與權限');
  } catch (err) {
    setStatus(`儲存用戶失敗: ${err.message}`, true);
    showToast('儲存用戶失敗', true);
    handleAdminPasswordError(err);
  } finally {
    setBusy(false);
  }
}

async function resetDay(app = 'main') {
  if (!requireAuth()) return;
  try {
    setBusy(true);
    await api('/api/admin/reset-day', {
      method: 'POST',
      body: JSON.stringify(adminAuthBody({ app }))
    });
    await loadAdminLogs({ silent: true });
    setStatus(app === 'lady-ruby' ? '已重置 Lady Ruby 今日訂單與餐廳。' : '已重置主站今日訂單與餐廳。');
  } catch (err) {
    setStatus(err.message, true);
    handleAdminPasswordError(err);
  } finally {
    setBusy(false);
  }
}

function parseImportedPrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;
  const cleaned = raw.replace(/[^\d,.\-]/g, '');
  if (!cleaned) return NaN;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized = cleaned.replace(/,/g, '');
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  }
  const price = Number(normalized);
  return Number.isFinite(price) ? price : NaN;
}

function rowsToSeed(rows) {
  const seed = { restaurants: [], staff: {}, drinks: [], menus: {} };
  rows.forEach(row => {
    const type = String(row.type || row.TYPE || '').trim().toUpperCase();
    const restaurant = String(row.restaurant || row.RESTAURANT || '').trim();
    const category = String(row.category || row.CATEGORY || '').trim();
    const itemTc = String(row.item_tc || row.ITEM_TC || row.item || row.ITEM || '').trim();
    const itemSc = String(row.item_sc || row.ITEM_SC || itemTc).trim();
    const itemEn = String(row.item_en || row.ITEM_EN || itemTc).trim();
    const dept = String(row.dept || row.DEPT || '').trim();
    const name = String(row.name || row.NAME || '').trim();
    const drinkTc = String(row.drink_tc || row.DRINK_TC || row.drink || row.DRINK || '').trim();
    const drinkSc = String(row.drink_sc || row.DRINK_SC || drinkTc).trim();
    const drinkEn = String(row.drink_en || row.DRINK_EN || drinkTc).trim();
    const price = parseImportedPrice(row.price ?? row.PRICE);
    const optionRaw = row.option_groups
      ?? row.OPTION_GROUPS
      ?? row.optionGroups
      ?? row.OPTIONGROUPS
      ?? row.options
      ?? row.OPTIONS
      ?? row.option
      ?? row.OPTION
      ?? row['\u63a8\u85a6']
      ?? row['\u63a8\u8350'];
    const optionGroups = parseOptionGroups(optionRaw);

    if (type === 'RESTAURANT' && restaurant) seed.restaurants.push(restaurant);
    if (type === 'STAFF' && dept && name) {
      if (!seed.staff[dept]) seed.staff[dept] = [];
      seed.staff[dept].push(name);
    }
    const pausedRaw = String(row.paused || row.PAUSED || '').trim().toLowerCase();
    const paused = pausedRaw === '1' || pausedRaw === 'true' || pausedRaw === 'yes' || pausedRaw === 'y';
    if (type === 'DRINK' && drinkTc) seed.drinks.push({ tc: drinkTc, sc: drinkSc || drinkTc, en: drinkEn || drinkTc, paused });
    if (type === 'MENU' && restaurant && category && itemTc && Number.isFinite(price)) {
      if (!seed.menus[restaurant]) seed.menus[restaurant] = {};
      if (!seed.menus[restaurant][category]) seed.menus[restaurant][category] = [];
      const entry = { nameTc: itemTc, nameSc: itemSc || itemTc, nameEn: itemEn || itemTc, price };
      if (optionGroups.length) entry.optionGroups = optionGroups;
      seed.menus[restaurant][category].push(entry);
      seed.restaurants.push(restaurant);
    }
  });

  seed.restaurants = [...new Set(seed.restaurants)];
  Object.keys(seed.staff).forEach(k => { seed.staff[k] = [...new Set(seed.staff[k])]; });
  return seed;
}

function parseWorkbookSeed(wb) {
  const seed = { restaurants: [], staff: {}, drinks: [], menus: {} };
  const staffNames = ['Staff', 'staff'];
  const drinkNames = ['Drink', 'drink', 'Drinks', 'drinks'];

  const getSheet = names => {
    for (const n of wb.SheetNames) {
      if (names.includes(n)) return wb.Sheets[n];
    }
    return null;
  };

  const pick = (row, names, index) => {
    for (const k of names) {
      if (Object.prototype.hasOwnProperty.call(row, k)) {
        const v = String(row[k] || '').trim();
        if (v) return v;
      }
    }
    const values = Object.values(row).map(v => String(v || '').trim());
    return (values[index] || '').trim();
  };

  const pickNamed = (row, names) => {
    for (const k of names) {
      if (Object.prototype.hasOwnProperty.call(row, k)) {
        const v = String(row[k] || '').trim();
        if (v) return v;
      }
    }
    return '';
  };

  const staffSheet = getSheet(staffNames);
  if (staffSheet) {
    const rows = XLSX.utils.sheet_to_json(staffSheet, { defval: '' });
    rows.forEach(r => {
      const dept = pick(r, ['Dept', 'DEPT', 'Department', '部門', '部门'], 0);
      const name = pick(r, ['Name', 'NAME', 'Staff', '姓名'], 1);
      if (!dept || !name) return;
      if (!seed.staff[dept]) seed.staff[dept] = [];
      seed.staff[dept].push(name);
    });
  }

  const drinkSheet = getSheet(drinkNames);
  if (drinkSheet) {
    const rows = XLSX.utils.sheet_to_json(drinkSheet, { defval: '' });
    rows.forEach(r => {
      const tc = pick(r, ['TC', 'tc', 'Traditional', '繁體', '繁体'], 0);
      const sc = pick(r, ['SC', 'sc', 'Simplified', '簡體', '简体'], 1) || tc;
      const en = pick(r, ['EN', 'en', 'English', '英文'], 2) || tc;
      if (!tc) return;
      const pausedRaw = pick(r, ['Paused', 'paused', '暫停', '暂停'], 3);
      const paused = ['1', 'true', 'yes', 'y'].includes(String(pausedRaw || '').trim().toLowerCase());
      seed.drinks.push({ tc, sc, en, paused });
    });
  }

  wb.SheetNames.forEach(sheetName => {
    if (staffNames.includes(sheetName) || drinkNames.includes(sheetName)) return;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const restaurant = String(sheetName || '').trim();
    if (!restaurant) return;

    if (!seed.menus[restaurant]) seed.menus[restaurant] = {};
    seed.restaurants.push(restaurant);

    rows.forEach(r => {
      const tc = pick(r, ['Name TC', 'Item TC', 'Name', 'Item', '中文名稱', '中文名称'], 0);
      const en = pick(r, ['Name EN', 'Item EN', 'English', '英文名稱', '英文名称'], 1) || tc;
      const cat = pick(r, ['Category', 'Cat', '食物種類', '食物种类'], 2) || 'Others';
      const rawPrice = pick(r, ['Price', 'price', '價錢', '价格'], 3);
      const optionRaw = pickNamed(r, ['Option Groups', 'Options', 'Option', '\u9078\u9805', '\u9078\u64c7', '\u53ef\u9078', '\u63a8\u85a6', '\u63a8\u8350', '__EMPTY']);
      const optionGroups = parseOptionGroups(optionRaw);
      const price = parseImportedPrice(rawPrice);
      if (!tc || !Number.isFinite(price)) return;

      if (!seed.menus[restaurant][cat]) seed.menus[restaurant][cat] = [];
      const entry = { nameTc: tc, nameSc: toSc(tc), nameEn: en || tc, price };
      if (optionGroups.length) entry.optionGroups = optionGroups;
      seed.menus[restaurant][cat].push(entry);
    });
  });

  seed.restaurants = [...new Set(seed.restaurants)];
  seed.drinks = seed.drinks.filter(d => d.tc);
  Object.keys(seed.staff).forEach(k => { seed.staff[k] = [...new Set(seed.staff[k])]; });
  return seed;
}

async function readImportSeed(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.json')) return JSON.parse(await file.text());
  if (!window.XLSX) throw new Error('XLSX parser not loaded');

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const parsed = parseWorkbookSeed(wb);
    if (Object.keys(parsed.menus || {}).length > 0) return parsed;
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (!rows.length) throw new Error('No data in import file');
  return rowsToSeed(rows);
}

async function importSeed() {
  if (!requireAuth()) return;
  const file = el.importFile.files && el.importFile.files[0];
  if (!file) return setStatus('請先選擇匯入檔案。', true);

  try {
    setBusy(true);
    const seed = await readImportSeed(file);
    const payload = await api('/api/admin/seed', {
      method: 'POST',
      body: JSON.stringify(adminAuthBody({ seed, merge: true, section: 'import' }))
    });
    state.seed = payload.seed || state.seed;
    state.dirty = false;
    await loadAdminLogs({ silent: true });
    renderAll();
    el.importFile.value = '';
    const summary = formatImportAdded(payload.added);
    const baseMsg = '匯入成功，已合併新資料（舊資料保留，重複略過）。';
    setStatus(summary ? `${baseMsg} 新增：${summary}` : `${baseMsg}（沒有新增資料）`);
    showToast(summary ? `匯入成功：${summary}` : '匯入成功（沒有新增資料）');
  } catch (err) {
    setStatus(`匯入失敗: ${err.message}`, true);
    handleAdminPasswordError(err);
  } finally {
    setBusy(false);
  }
}

async function login() {
  const username = String(el.loginUsername.value || '').trim().toLowerCase() || 'admin';
  const password = String(el.loginPassword.value || '').trim();
  if (!password) return setLoginHint('請輸入帳號及密碼。', true);
  try {
    setBusy(true, '正在登入後台，請稍候...');
    setLoginHint('正在登入，請稍候...');
    const user = await loginRequest(username, password);
    const payload = await fetchSeedByCredentials(username, password);
    state.username = user.username || username;
    state.password = password;
    state.permissions = Array.isArray(user.permissions) ? user.permissions : [];
    state.allowedStaffDepartments = Array.isArray(user.staffDepartments) ? user.staffDepartments : [];
    state.isRoot = Boolean(user.isRoot);
    state.seed = payload.seed;
    if (hasPermission('users')) {
      try {
        state.adminUsers = await fetchAdminUsers();
      } catch (err) {
        state.adminUsers = [];
        if (!/admin_users is missing/i.test(String((err && err.message) || ''))) throw err;
      }
    } else {
      state.adminUsers = [];
    }
    state.dirty = false;
    setAuthUi(true);
    renderNewUserPermissions();
    try {
      state.logs = await fetchAdminLogs();
    } catch {
      state.logs = [];
    }
    renderAll();
    const tableMissingNote = hasPermission('users') && !state.adminUsers.length
      ? '已登入。若要新增限權用戶，請先在 Supabase 建立 admin_users table。'
      : '已載入資料。';
    setStatus(tableMissingNote);
    showToast('已登入後台');
    setLoginHint('');
    el.loginPassword.value = '';
  } catch (err) {
    state.username = '';
    state.password = '';
    state.permissions = [];
    state.allowedStaffDepartments = [];
    state.isRoot = false;
    state.adminUsers = [];
    state.logs = [];
    setAuthUi(false);
    setLoginHint('帳號或密碼錯誤，請再試一次。', true);
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
}

function logout() {
  state.username = '';
  state.password = '';
  state.permissions = [];
  state.allowedStaffDepartments = [];
  state.isRoot = false;
  state.authenticated = false;
  state.dirty = false;
  state.menuEdit = null;
  state.adminUsers = [];
  state.logs = [];
  setAuthUi(false);
  setStatus('登入後可操作。');
  setLoginHint('已登出。');
  if (el.loginPassword) el.loginPassword.value = '';
  renderLogs();
}

el.loginBtn.onclick = login;
el.loginPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});
if (el.loginUsername) {
  el.loginUsername.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
}
el.logoutBtn.onclick = logout;

el.saveBtn.onclick = saveSeed;
el.resetDayBtn.onclick = () => resetDay('main');
if (el.resetLadyRubyBtn) el.resetLadyRubyBtn.onclick = () => resetDay('lady-ruby');
el.importBtn.onclick = importSeed;

el.saveRestaurantBtn.onclick = () => saveSection('restaurants');
el.saveDrinkBtn.onclick = () => saveSection('drinks');
el.saveStaffBtn.onclick = () => saveSection('staff');
el.saveMenuBtn.onclick = () => saveSection('menus');
if (el.saveUsersBtn) el.saveUsersBtn.onclick = saveAdminUsers;
if (el.refreshLogsBtn) el.refreshLogsBtn.onclick = () => loadAdminLogs();

if (el.addAdminUserBtn) {
  el.addAdminUserBtn.onclick = () => {
    if (!requireAuth()) return;
    const username = String(((el.newAdminUsername && el.newAdminUsername.value) || '')).trim().toLowerCase();
    const password = String(((el.newAdminPassword && el.newAdminPassword.value) || '')).trim();
    const permissions = getCheckedPermissions(el.newAdminPermissions, 'new-admin-permission');
    const staffDepartments = permissions.includes('staff')
      ? getCheckedPermissions(el.newAdminDepartmentOptions, 'new-admin-department')
      : [];
    if (!username) return setStatus('請輸入新帳號。', true);
    if (username === 'admin') return setStatus('admin 為系統固定帳號，不能在此新增。', true);
    if (!password) return setStatus('請輸入新用戶密碼。', true);
    if (!permissions.length) return setStatus('請至少選擇一項權限。', true);
    if (permissions.includes('staff') && !staffDepartments.length) return setStatus('如有部門權限，請至少選擇一個部門。', true);
    if (state.adminUsers.some(user => user.username === username)) return setStatus('此帳號已存在。', true);
    state.adminUsers.push({ username, permissions, staffDepartments });
    el.newAdminUsername.value = '';
    el.newAdminPassword.value = '';
    renderNewUserPermissions();
    renderAdminUsers();
    const passwordField = el.adminUsersList.querySelector(`.admin-user-password[data-index="${state.adminUsers.length - 1}"]`);
    if (passwordField) passwordField.value = password;
    setStatus(`已新增用戶 ${username}，請按「儲存此區」確認。`);
  };
}

el.addRestaurantBtn.onclick = () => {
  if (!requireAuth()) return;
  const v = String(el.newRestaurant.value || '').trim();
  if (!v) return setStatus('請輸入餐廳名稱。', true);
  if (state.seed.restaurants.includes(v)) return setStatus('餐廳已存在。', true);
  state.seed.restaurants.push(v);
  if (!state.seed.menus[v]) state.seed.menus[v] = {};
  el.newRestaurant.value = '';
  renderAll();
  markDirty('已新增餐廳');
};

el.addDrinkBtn.onclick = () => {
  if (!requireAuth()) return;
  const tcInput = String(el.drinkTc.value || '').trim();
  const scInput = String(el.drinkSc.value || '').trim();
  const tc = tcInput || toTc(scInput);
  const sc = scInput || toSc(tcInput || tc);
  if (!tc) return setStatus('請輸入飲品名稱（繁體或簡體其一）。', true);
  const en = String(el.drinkEn.value || '').trim() || tc;
  state.seed.drinks.push({ tc, sc, en, paused: false });
  el.drinkTc.value = '';
  el.drinkSc.value = '';
  el.drinkEn.value = '';
  renderDrinks();
  markDirty('已新增飲品');
};

el.addDeptBtn.onclick = () => {
  if (!requireAuth()) return;
  if (!canManageDepartmentStructure()) return setStatus('此帳號只可管理指定部門人員，不能新增部門。', true);
  const dept = String(el.newDept.value || '').trim();
  if (!dept) return setStatus('請輸入部門名稱。', true);
  if (state.seed.staff[dept]) return setStatus('部門已存在。', true);
  state.seed.staff[dept] = [];
  el.newDept.value = '';
  renderDepartments();
  el.deptSelect.value = dept;
  renderStaff();
  markDirty('已新增部門');
};

el.removeDeptBtn.onclick = () => {
  if (!requireAuth()) return;
  if (!canManageDepartmentStructure()) return setStatus('此帳號只可管理指定部門人員，不能刪除部門。', true);
  const dept = el.deptSelect.value;
  if (!dept) return setStatus('請先選擇部門。', true);
  delete state.seed.staff[dept];
  renderDepartments();
  markDirty('已刪除部門');
};

el.deptSelect.onchange = renderStaff;

el.addStaffBtn.onclick = () => {
  if (!requireAuth()) return;
  const dept = el.deptSelect.value;
  const name = String(el.newStaff.value || '').trim();
  if (!dept) return setStatus('請先選擇部門。', true);
  if (!name) return setStatus('請輸入人員名稱。', true);
  if (!state.seed.staff[dept]) state.seed.staff[dept] = [];
  if (state.seed.staff[dept].includes(name)) return setStatus('人員已存在於此部門。', true);
  state.seed.staff[dept].push(name);
  el.newStaff.value = '';
  renderStaff();
  markDirty('已新增人員');
};

el.menuRestaurantSelect.onchange = () => {
  resetMenuEdit();
  renderMenuCategories();
  renderMenuItems();
};
el.menuCategorySelect.onchange = () => {
  resetMenuEdit();
  renderMenuItems();
};

el.addCategoryBtn.onclick = () => {
  if (!requireAuth()) return;
  const rest = currentMenuRestaurant();
  const cat = String(el.newCategory.value || '').trim();
  if (!rest) return setStatus('請先選擇餐廳。', true);
  if (!cat) return setStatus('請輸入分類名稱。', true);
  if (!state.seed.menus[rest]) state.seed.menus[rest] = {};
  if (state.seed.menus[rest][cat]) return setStatus('分類已存在。', true);
  state.seed.menus[rest][cat] = [];
  el.newCategory.value = '';
  renderMenuCategories();
  el.menuCategorySelect.value = cat;
  renderMenuItems();
  markDirty('已新增分類');
};

el.addMenuBtn.onclick = () => {
  if (!requireAuth()) return;
  const rest = currentMenuRestaurant();
  const cat = currentMenuCategory();
  const tcInput = String(el.menuTc.value || '').trim();
  const scInput = String(el.menuSc.value || '').trim();
  const nameTc = tcInput || toTc(scInput);
  const nameSc = scInput || toSc(tcInput || nameTc);
  const nameEn = String(el.menuEn.value || '').trim() || nameTc;
  const price = Number(String(el.menuPrice.value || '').trim());
  if (!rest) return setStatus('\u8acb\u5148\u9078\u64c7\u9910\u5ef3\u3002', true);
  if (!cat) return setStatus('\u8acb\u5148\u9078\u64c7\u5206\u985e\u3002', true);
  if (!nameTc) return setStatus('\u8acb\u8f38\u5165\u9910\u9ede\u540d\u7a31\u3002', true);
  if (!Number.isFinite(price) || price < 0) return setStatus('\u8acb\u8f38\u5165\u6709\u6548\u50f9\u9322\u3002', true);

  const optionInput = el.menuOptions ? el.menuOptions.value : '';
  const optionParsed = parseOptionGroupsInput(optionInput);
  if (optionParsed.error) return setStatus(optionParsed.error, true);

  if (!state.seed.menus[rest]) state.seed.menus[rest] = {};
  if (!state.seed.menus[rest][cat]) state.seed.menus[rest][cat] = [];

  if (state.menuEdit && state.menuEdit.rest === rest && state.menuEdit.cat === cat) {
    const idx = state.menuEdit.index;
    if (idx >= 0 && idx < state.seed.menus[rest][cat].length) {
      const entry = { nameTc, nameSc, nameEn, price };
      if (optionParsed.groups.length) entry.optionGroups = optionParsed.groups;
      state.seed.menus[rest][cat][idx] = entry;
      markDirty('\u5df2\u66f4\u65b0\u9910\u9ede');
    }
  } else {
    const entry = { nameTc, nameSc, nameEn, price };
    if (optionParsed.groups.length) entry.optionGroups = optionParsed.groups;
    state.seed.menus[rest][cat].push(entry);
    markDirty('\u5df2\u65b0\u589e\u9910\u9ede');
  }

  el.menuTc.value = '';
  el.menuSc.value = '';
  el.menuEn.value = '';
  el.menuPrice.value = '';
  if (el.menuOptions) el.menuOptions.value = '';
  resetMenuEdit();
  renderMenuItems();
};

attachAutoConvert();
renderNewUserPermissions();
loadLoginUsernames();
setAuthUi(false);



















