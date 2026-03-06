const state = {
  authenticated: false,
  password: '',
  dirty: false,
  menuEdit: null,
  seed: { restaurants: [], staff: {}, drinks: [], menus: {} }
};

const el = {
  loginCard: document.getElementById('loginCard'),
  loginPassword: document.getElementById('loginPassword'),
  loginBtn: document.getElementById('loginBtn'),
  loginHint: document.getElementById('loginHint'),
  adminApp: document.getElementById('adminApp'),
  logoutBtn: document.getElementById('logoutBtn'),
  saveBtn: document.getElementById('saveBtn'),
  resetDayBtn: document.getElementById('resetDayBtn'),
  status: document.getElementById('status'),

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
  addMenuBtn: document.getElementById('addMenuBtn'),

  saveRestaurantBtn: document.getElementById('saveRestaurantBtn'),
  saveDrinkBtn: document.getElementById('saveDrinkBtn'),
  saveStaffBtn: document.getElementById('saveStaffBtn'),
  saveMenuBtn: document.getElementById('saveMenuBtn'),

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

function setAuthUi(authenticated) {
  state.authenticated = authenticated;
  el.loginCard.classList.toggle('hidden', authenticated);
  el.adminApp.classList.toggle('hidden', !authenticated);
}


function markDirty(msg) {
  state.dirty = true;
  setStatus(msg ? `${msg}（未儲存）` : '已有未儲存修改，請按「儲存全部」。');
}

function requireAuth() {
  if (!state.authenticated || !state.password) {
    setStatus('未登入或登入已失效，請重新登入。', true);
    setAuthUi(false);
    return false;
  }
  return true;
}

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const p = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(p.error || 'Request failed');
  }
  return res.json();
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
    if (!tc) return;
    if (!drinkMap.has(tc)) drinkMap.set(tc, { tc, sc: sc || tc, en: en || tc });
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
        if (!map.has(nameTc)) map.set(nameTc, { nameTc, nameSc: nameSc || nameTc, nameEn: nameEn || nameTc, price });
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
    return `<tr>
      <td class="border-b px-2 py-1">${tc}</td>
      <td class="border-b px-2 py-1">${sc}</td>
      <td class="border-b px-2 py-1">${en}</td>
      <td class="border-b px-2 py-1"><button data-i="${i}" class="remove-drink rounded bg-red-600 px-2 py-1 text-xs text-white">刪除</button></td>
    </tr>`;
  }).join('');
  el.drinkTable.innerHTML = `<thead><tr class="bg-slate-50"><th class="px-2 py-1 text-left">繁</th><th class="px-2 py-1 text-left">簡</th><th class="px-2 py-1 text-left">EN</th><th></th></tr></thead><tbody>${rows}</tbody>`;
  el.drinkTable.querySelectorAll('.remove-drink').forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.i);
      state.seed.drinks.splice(i, 1);
      renderDrinks();
      markDirty('已刪除飲品');
    };
  });
  renderAllDataTables();
}

function renderDepartments() {
  const depts = Object.keys(state.seed.staff || {});
  el.deptSelect.innerHTML = depts.length
    ? depts.map(d => `<option value="${d}">${d}</option>`).join('' )
    : '<option value="">-- 無部門 --</option>';
  renderStaff();
  renderAllDataTables();
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
  renderAllDataTables();
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
  if (el.addMenuBtn) el.addMenuBtn.textContent = '新增餐點';
}

function renderMenuItems() {
  const rest = currentMenuRestaurant();
  const cat = currentMenuCategory();
  const menuInputs = [el.menuTc, el.menuSc, el.menuEn, el.menuPrice, el.addMenuBtn];

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
      el.addMenuBtn.textContent = '更新餐點';
      showToast('已載入餐點供更改');
    };
  });

  renderAllDataTables();
}

function renderAllDataTables() {
  // Section 6 removed from UI.
}

function renderAll() {
  normalizeSeed();
  renderRestaurants();
  renderDrinks();
  renderDepartments();
  renderMenuCategories();
  renderMenuItems();
  renderAllDataTables();
}


async function persistIfDirty(reasonLabel) {
  if (!state.dirty) return true;
  try {
    normalizeSeed();
    const payload = await api('/api/admin/seed', {
      method: 'POST',
      body: JSON.stringify({ password: state.password, seed: state.seed })
    });
    state.dirty = false;
    setStatus(`已先儲存，再載入「${reasonLabel}」。`);
    return true;
  } catch (err) {
    setStatus(`自動儲存失敗: ${err.message}`, true);
    return false;
  }
}
async function fetchSeedByPassword(password) {
  const payload = await api(`/api/admin/seed?password=${encodeURIComponent(password)}`);
  return payload.seed || { restaurants: [], staff: {}, drinks: [], menus: {} };
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
      const pending = String(el.newRestaurant?.value || '').trim();
      if (pending && !state.seed.restaurants.includes(pending)) {
        state.seed.restaurants.push(pending);
        if (!state.seed.menus[pending]) state.seed.menus[pending] = {};
        el.newRestaurant.value = '';
      }
    }

    if (section === 'drinks') {
      const tcInput = String(el.drinkTc?.value || '').trim();
      const scInput = String(el.drinkSc?.value || '').trim();
      const tc = tcInput || toTc(scInput);
      const sc = scInput || toSc(tcInput || tc);
      const en = String(el.drinkEn?.value || '').trim() || tc;
      if (tc) {
        state.seed.drinks = state.seed.drinks || [];
        if (!state.seed.drinks.some(d => String(d.tc || '').trim() === tc)) {
          state.seed.drinks.push({ tc, sc: sc || tc, en: en || tc });
        }
        el.drinkTc.value = '';
        el.drinkSc.value = '';
        el.drinkEn.value = '';
      }
    }

    if (section === 'staff') {
      const pendingDept = String(el.newDept?.value || '').trim();
      if (pendingDept) {
        state.seed.staff = state.seed.staff || {};
        if (!state.seed.staff[pendingDept]) state.seed.staff[pendingDept] = [];
        el.newDept.value = '';
      }

      const dept = String(el.deptSelect?.value || pendingDept).trim();
      const pendingName = String(el.newStaff?.value || '').trim();
      if (dept && pendingName) {
        state.seed.staff = state.seed.staff || {};
        if (!state.seed.staff[dept]) state.seed.staff[dept] = [];
        if (!state.seed.staff[dept].includes(pendingName)) state.seed.staff[dept].push(pendingName);
        el.newStaff.value = '';
      }
    }

    if (section === 'menus') {
      const rest = String(el.menuRestaurantSelect?.value || '').trim();
      const cat = String(el.menuCategorySelect?.value || '').trim();
      const tcInput = String(el.menuTc?.value || '').trim();
      const scInput = String(el.menuSc?.value || '').trim();
      const nameTc = tcInput || toTc(scInput);
      const nameSc = scInput || toSc(tcInput || nameTc);
      const nameEn = String(el.menuEn?.value || '').trim() || nameTc;
      const price = Number(String(el.menuPrice?.value || '').trim());

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
    const payload = await api('/api/admin/seed', {
      method: 'POST',
      body: JSON.stringify({ password: state.password, seed: state.seed })
    });

    state.dirty = false;
    renderAll();
    setStatus(`已儲存「${label}」。`);
    showToast(`已儲存${label}`);
  } catch (err) {
    setStatus(`儲存${label}失敗: ${err.message}`, true);
    showToast(`儲存${label}失敗`, true);
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
    state.seed = await fetchSeedByPassword(state.password);
    state.dirty = false;
    renderAll();
    setStatus('已載入資料。');
    showToast('載入成功');
  } catch (err) {
    setStatus(err.message, true);
    if (/Invalid admin password/i.test(err.message)) {
      logout();
      setLoginHint('密碼已失效，請重新登入。', true);
    }
  } finally {
    setBusy(false);
  }
}

async function saveSeed() {
  if (!requireAuth()) return;
  try {
    normalizeSeed();
    setBusy(true);
    const payload = await api('/api/admin/seed', {
      method: 'POST',
      body: JSON.stringify({ password: state.password, seed: state.seed })
    });
    state.dirty = false;
    setStatus('儲存成功。');
    showToast('儲存成功');
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
}

async function resetDay() {
  if (!requireAuth()) return;
  try {
    setBusy(true);
    await api('/api/admin/reset-day', { method: 'POST', body: JSON.stringify({ password: state.password }) });
    setStatus('已重置今日訂單與餐廳。');
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
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
    const price = Number(String(row.price || row.PRICE || '').replace(',', '.'));

    if (type === 'RESTAURANT' && restaurant) seed.restaurants.push(restaurant);
    if (type === 'STAFF' && dept && name) {
      if (!seed.staff[dept]) seed.staff[dept] = [];
      seed.staff[dept].push(name);
    }
    if (type === 'DRINK' && drinkTc) seed.drinks.push({ tc: drinkTc, sc: drinkSc || drinkTc, en: drinkEn || drinkTc });
    if (type === 'MENU' && restaurant && category && itemTc && Number.isFinite(price)) {
      if (!seed.menus[restaurant]) seed.menus[restaurant] = {};
      if (!seed.menus[restaurant][category]) seed.menus[restaurant][category] = [];
      seed.menus[restaurant][category].push({ nameTc: itemTc, nameSc: itemSc || itemTc, nameEn: itemEn || itemTc, price });
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
      seed.drinks.push({ tc, sc, en });
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
      const price = Number(String(rawPrice).replace(',', '.'));
      if (!tc || !Number.isFinite(price)) return;

      if (!seed.menus[restaurant][cat]) seed.menus[restaurant][cat] = [];
      seed.menus[restaurant][cat].push({ nameTc: tc, nameSc: toSc(tc), nameEn: en || tc, price });
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
    const hasMenus = Object.keys(parsed.menus || {}).length > 0;
    if (hasMenus) return parsed;
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
      body: JSON.stringify({ password: state.password, seed, merge: true })
    });
    state.seed = payload.seed || state.seed;
    state.dirty = false;
    renderAll();
    el.importFile.value = '';
    const summary = formatImportAdded(payload.added);
    const baseMsg = '匯入成功，已合併新資料（舊資料保留，重複已略過）。';
    setStatus(summary ? `${baseMsg} 新增：${summary}` : `${baseMsg}（沒有新增資料）`);
    showToast(summary ? `匯入成功：${summary}` : '匯入成功（沒有新增資料）', 3200);
  } catch (err) {
    setStatus(`匯入失敗: ${err.message}`, true);
  } finally {
    setBusy(false);
  }
}

async function login() {
  const pwd = String(el.loginPassword.value || '').trim();
  if (!pwd) return setLoginHint('請輸入管理密碼。', true);
  try {
    setBusy(true, '正在登入後台，請稍候...');
    setLoginHint('正在登入，請稍候...');
    const loadedSeed = await fetchSeedByPassword(pwd);
    state.password = pwd;
    state.seed = loadedSeed;
    state.dirty = false;
    setAuthUi(true);
    renderAll();
    setStatus('已載入資料。');
    showToast('已登入後台');
    setLoginHint('');
    el.loginPassword.value = '';
  } catch (err) {
    state.password = '';
    setAuthUi(false);
    setLoginHint('密碼錯誤，請再試一次。', true);
    setStatus(err.message, true);
  } finally {
    setBusy(false);
  }
}

function logout() {
  state.password = '';
  state.authenticated = false;
  state.dirty = false;
  setAuthUi(false);
  setStatus('登入後可操作。');
  setLoginHint('已登出。');
}

el.loginBtn.onclick = login;
el.loginPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});
el.logoutBtn.onclick = logout;

el.saveBtn.onclick = saveSeed;
el.resetDayBtn.onclick = resetDay;
el.importBtn.onclick = importSeed;

el.saveRestaurantBtn.onclick = () => saveSection('restaurants');
el.saveDrinkBtn.onclick = () => saveSection('drinks');
el.saveStaffBtn.onclick = () => saveSection('staff');
el.saveMenuBtn.onclick = () => saveSection('menus');

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
  state.seed.drinks.push({ tc, sc, en });
  el.drinkTc.value = '';
  el.drinkSc.value = '';
  el.drinkEn.value = '';
  renderDrinks();
  markDirty('已新增飲品');
};

el.addDeptBtn.onclick = () => {
  if (!requireAuth()) return;
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
  if (!rest) return setStatus('請先選擇餐廳。', true);
  if (!cat) return setStatus('請先選擇分類。', true);
  if (!nameTc) return setStatus('請輸入餐點名稱。', true);
  if (!Number.isFinite(price) || price < 0) return setStatus('請輸入有效價錢。', true);

  if (!state.seed.menus[rest]) state.seed.menus[rest] = {};
  if (!state.seed.menus[rest][cat]) state.seed.menus[rest][cat] = [];

  if (state.menuEdit && state.menuEdit.rest === rest && state.menuEdit.cat === cat) {
    const idx = state.menuEdit.index;
    if (idx >= 0 && idx < state.seed.menus[rest][cat].length) {
      state.seed.menus[rest][cat][idx] = { nameTc, nameSc, nameEn, price };
      markDirty('已更新餐點');
    }
  } else {
    state.seed.menus[rest][cat].push({ nameTc, nameSc, nameEn, price });
    markDirty('已新增餐點');
  }

  el.menuTc.value = '';
  el.menuSc.value = '';
  el.menuEn.value = '';
  el.menuPrice.value = '';
  resetMenuEdit();
  renderMenuItems();
};

attachAutoConvert();
setAuthUi(false);




















































