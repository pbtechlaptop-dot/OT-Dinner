const state = {
  password: '',
  seed: { restaurants: [], staff: {}, drinks: [], menus: {} }
};

const el = {
  adminPassword: document.getElementById('adminPassword'),
  loadBtn: document.getElementById('loadBtn'),
  saveBtn: document.getElementById('saveBtn'),
  resetDayBtn: document.getElementById('resetDayBtn'),
  status: document.getElementById('status'),

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
  addMenuBtn: document.getElementById('addMenuBtn')
};

function setStatus(text, isError = false) {
  el.status.textContent = text;
  el.status.className = `mt-2 text-sm ${isError ? 'text-red-600' : 'text-slate-500'}`;
}

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const p = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(p.error || 'Request failed');
  }
  return res.json();
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
  state.seed.restaurants = [...new Set((state.seed.restaurants || []).map(v => String(v || '').trim()).filter(Boolean))];
  if (!state.seed.staff || typeof state.seed.staff !== 'object') state.seed.staff = {};
  if (!Array.isArray(state.seed.drinks)) state.seed.drinks = [];
  if (!state.seed.menus || typeof state.seed.menus !== 'object') state.seed.menus = {};
}

function renderRestaurants() {
  el.restaurantList.innerHTML = '';
  state.seed.restaurants.forEach((r, i) => {
    el.restaurantList.appendChild(tag(r, () => {
      state.seed.restaurants.splice(i, 1);
      delete state.seed.menus[r];
      renderAll();
    }));
  });

  const options = ['<option value="">-- 餐廳 --</option>']
    .concat(state.seed.restaurants.map(r => `<option value="${r}">${r}</option>`));
  el.menuRestaurantSelect.innerHTML = options.join('');
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
    };
  });
}

function renderDepartments() {
  const depts = Object.keys(state.seed.staff || {});
  el.deptSelect.innerHTML = depts.length
    ? depts.map(d => `<option value="${d}">${d}</option>`).join('')
    : '<option value="">-- 無部門 --</option>';
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
    }));
  });
}

function currentMenuRestaurant() {
  return el.menuRestaurantSelect.value || state.seed.restaurants[0] || '';
}

function currentMenuCategory() {
  return el.menuCategorySelect.value;
}

function renderMenuCategories() {
  const rest = currentMenuRestaurant();
  if (!rest) {
    el.menuCategorySelect.innerHTML = '<option value="">-- 無分類 --</option>';
    return;
  }
  if (!state.seed.menus[rest]) state.seed.menus[rest] = {};
  const cats = Object.keys(state.seed.menus[rest]);
  el.menuCategorySelect.innerHTML = cats.length
    ? cats.map(c => `<option value="${c}">${c}</option>`).join('')
    : '<option value="">-- 無分類 --</option>';
}

function renderMenuItems() {
  const rest = currentMenuRestaurant();
  const cat = currentMenuCategory();
  const items = rest && cat && state.seed.menus[rest] && state.seed.menus[rest][cat] ? state.seed.menus[rest][cat] : [];

  const rows = items.map((it, i) => `<tr>
    <td class="border-b px-2 py-1">${it.nameTc || ''}</td>
    <td class="border-b px-2 py-1">${it.nameSc || ''}</td>
    <td class="border-b px-2 py-1">${it.nameEn || ''}</td>
    <td class="border-b px-2 py-1">${Number(it.price || 0).toFixed(2)}</td>
    <td class="border-b px-2 py-1"><button data-i="${i}" class="remove-item rounded bg-red-600 px-2 py-1 text-xs text-white">刪除</button></td>
  </tr>`).join('');

  el.menuTable.innerHTML = `<thead><tr class="bg-slate-50"><th class="px-2 py-1 text-left">繁</th><th class="px-2 py-1 text-left">簡</th><th class="px-2 py-1 text-left">EN</th><th class="px-2 py-1 text-left">價錢</th><th></th></tr></thead><tbody>${rows}</tbody>`;

  el.menuTable.querySelectorAll('.remove-item').forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.i);
      items.splice(i, 1);
      renderMenuItems();
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
}

async function loadSeed() {
  state.password = String(el.adminPassword.value || '').trim();
  if (!state.password) return setStatus('請輸入管理密碼。', true);

  try {
    const payload = await api(`/api/admin/seed?password=${encodeURIComponent(state.password)}`);
    state.seed = payload.seed || { restaurants: [], staff: {}, drinks: [], menus: {} };
    renderAll();
    setStatus('已載入資料。');
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function saveSeed() {
  state.password = String(el.adminPassword.value || '').trim();
  if (!state.password) return setStatus('請輸入管理密碼。', true);

  try {
    normalizeSeed();
    await api('/api/admin/seed', {
      method: 'POST',
      body: JSON.stringify({ password: state.password, seed: state.seed })
    });
    setStatus('儲存成功。');
  } catch (err) {
    setStatus(err.message, true);
  }
}

async function resetDay() {
  state.password = String(el.adminPassword.value || '').trim();
  if (!state.password) return setStatus('請輸入管理密碼。', true);
  try {
    await api('/api/admin/reset-day', { method: 'POST', body: JSON.stringify({ password: state.password }) });
    setStatus('已重置今日訂單與餐廳。');
  } catch (err) {
    setStatus(err.message, true);
  }
}

el.loadBtn.onclick = loadSeed;
el.saveBtn.onclick = saveSeed;
el.resetDayBtn.onclick = resetDay;

el.addRestaurantBtn.onclick = () => {
  const v = String(el.newRestaurant.value || '').trim();
  if (!v) return;
  if (!state.seed.restaurants.includes(v)) state.seed.restaurants.push(v);
  if (!state.seed.menus[v]) state.seed.menus[v] = {};
  el.newRestaurant.value = '';
  renderAll();
};

el.addDrinkBtn.onclick = () => {
  const tc = String(el.drinkTc.value || '').trim();
  if (!tc) return;
  const sc = String(el.drinkSc.value || '').trim() || tc;
  const en = String(el.drinkEn.value || '').trim() || tc;
  state.seed.drinks.push({ tc, sc, en });
  el.drinkTc.value = '';
  el.drinkSc.value = '';
  el.drinkEn.value = '';
  renderDrinks();
};

el.addDeptBtn.onclick = () => {
  const dept = String(el.newDept.value || '').trim();
  if (!dept) return;
  if (!state.seed.staff[dept]) state.seed.staff[dept] = [];
  el.newDept.value = '';
  renderDepartments();
  el.deptSelect.value = dept;
  renderStaff();
};

el.removeDeptBtn.onclick = () => {
  const dept = el.deptSelect.value;
  if (!dept) return;
  delete state.seed.staff[dept];
  renderDepartments();
};

el.deptSelect.onchange = renderStaff;

el.addStaffBtn.onclick = () => {
  const dept = el.deptSelect.value;
  const name = String(el.newStaff.value || '').trim();
  if (!dept || !name) return;
  if (!state.seed.staff[dept]) state.seed.staff[dept] = [];
  if (!state.seed.staff[dept].includes(name)) state.seed.staff[dept].push(name);
  el.newStaff.value = '';
  renderStaff();
};

el.menuRestaurantSelect.onchange = () => {
  renderMenuCategories();
  renderMenuItems();
};

el.menuCategorySelect.onchange = renderMenuItems;

el.addCategoryBtn.onclick = () => {
  const rest = currentMenuRestaurant();
  const cat = String(el.newCategory.value || '').trim();
  if (!rest || !cat) return;
  if (!state.seed.menus[rest]) state.seed.menus[rest] = {};
  if (!state.seed.menus[rest][cat]) state.seed.menus[rest][cat] = [];
  el.newCategory.value = '';
  renderMenuCategories();
  el.menuCategorySelect.value = cat;
  renderMenuItems();
};

el.addMenuBtn.onclick = () => {
  const rest = currentMenuRestaurant();
  const cat = currentMenuCategory();
  const nameTc = String(el.menuTc.value || '').trim();
  const nameSc = String(el.menuSc.value || '').trim() || nameTc;
  const nameEn = String(el.menuEn.value || '').trim() || nameTc;
  const price = Number(String(el.menuPrice.value || '').trim());
  if (!rest || !cat || !nameTc || !Number.isFinite(price) || price < 0) return;

  if (!state.seed.menus[rest]) state.seed.menus[rest] = {};
  if (!state.seed.menus[rest][cat]) state.seed.menus[rest][cat] = [];
  state.seed.menus[rest][cat].push({ nameTc, nameSc, nameEn, price });

  el.menuTc.value = '';
  el.menuSc.value = '';
  el.menuEn.value = '';
  el.menuPrice.value = '';
  renderMenuItems();
};

renderAll();
