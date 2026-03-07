const state = {
  restaurants: [],
  staff: {},
  drinks: [],
  menu: {},
  currentRestaurant: null,
  orders: [],
  date: '',
  lang: 'tc',
  foodLookup: {},
  drinkLookup: {},
  lastOrdersSignature: ''
};

const i18n = {
  tc: {
    appTitle: '加班 Order 飯系統',
    exportCsv: '匯出 CSV',
    exportExcel: '匯出 XLSX',
    secRestaurant: '1) 今日餐廳',
    setRestaurant: '設定餐廳',
    forceChange: '改餐廳並清單',
    secOrder: '2) 填寫訂單',
    dept: '部門',
    name: '同事',
    category: '分類',
    food: '餐點',
    price: '價錢',
    drink: '飲品',
    addon: '加配',
    addonHint: '例如：走蔥、加飯',
    submitOrder: '提交訂單',
    secOrders: '3) 今日訂單',
    total: '總計',
    secImport: '4) 匯入資料 (Excel/CSV/JSON)',
    importData: '匯入覆蓋資料',
    importHint: 'Excel/CSV 標題欄需包含：type, restaurant, category, item, price, dept, name, drink',
    datePrefix: '日期：',
    currentRestaurant: '目前：',
    notSet: '未設定',
    noOrders: '未有訂單',
    noDrink: '無',
    selectRestaurant: '-- 選擇餐廳 --',
    selectDept: '-- 選擇部門 --',
    selectName: '-- 選擇同事 --',
    selectCat: '-- 選擇分類 --',
    selectFood: '-- 選擇餐點 --',
    selectDrink: '-- 無 --',
    chooseDeptFirst: '-- 先選部門 --',
    chooseCatFirst: '-- 先選分類 --',
    chooseRestaurantFirst: '請先揀餐廳',
    chooseNewRestaurantFirst: '請先揀新餐廳',
    enterAdminPassword: '請輸入管理密碼',
    enterAdminPasswordPrompt: '請輸入管理密碼（更改餐廳會清空舊單）',
    restaurantSet: '已設定今日餐廳',
    restaurantChanged: '已更改餐廳，舊單已清空',
    restaurantLocked: '餐廳已鎖定，如需更改請按「改餐廳並清單」',
    orderAdded: '已新增訂單',
    orderUpdated: '已更新訂單',
    chooseImportFile: '請先選擇匯入檔案',
    importSuccess: '匯入成功，已更新資料',
    importFail: '匯入失敗',
    xLabel: 'x',
    badPrice: '\u50f9\u9322\u683c\u5f0f\u932f\u8aa4',
    busyProcessing: '\u7cfb\u7d71\u8655\u7406\u4e2d\uff0c\u8acb\u7a0d\u5019...',
    diagLoading: '\u8f09\u5165\u4e2d...',
    loadFailedPrefix: '\u8f09\u5165\u5931\u6557\uff1a'
  },
  sc: {
    appTitle: '加班订餐系统',
    exportCsv: '导出 CSV',
    exportExcel: '导出 XLSX',
    secRestaurant: '1) 今日餐厅',
    setRestaurant: '设置餐厅',
    forceChange: '改餐厅并清单',
    secOrder: '2) 填写订单',
    dept: '部门',
    name: '同事',
    category: '分类',
    food: '餐点',
    price: '价格',
    drink: '饮品',
    addon: '加配',
    addonHint: '例如：走葱、加饭',
    submitOrder: '提交订单',
    secOrders: '3) 今日订单',
    total: '总计',
    secImport: '4) 导入资料 (Excel/CSV/JSON)',
    importData: '导入覆盖资料',
    importHint: 'Excel/CSV 标题栏需包含：type, restaurant, category, item, price, dept, name, drink',
    datePrefix: '日期：',
    currentRestaurant: '目前：',
    notSet: '未设置',
    noOrders: '暂无订单',
    noDrink: '无',
    selectRestaurant: '-- 选择餐厅 --',
    selectDept: '-- 选择部门 --',
    selectName: '-- 选择同事 --',
    selectCat: '-- 选择分类 --',
    selectFood: '-- 选择餐点 --',
    selectDrink: '-- 无 --',
    chooseDeptFirst: '-- 先选部门 --',
    chooseCatFirst: '-- 先选分类 --',
    chooseRestaurantFirst: '请先选餐厅',
    chooseNewRestaurantFirst: '请先选新餐厅',
    enterAdminPassword: '请输入管理密码',
    enterAdminPasswordPrompt: '请输入管理密码（更改餐厅会清空旧单）',
    restaurantSet: '已设置今日餐厅',
    restaurantChanged: '已更改餐厅，旧单已清空',
    restaurantLocked: '餐厅已锁定，如需更改请按「改餐厅并清单」',
    orderAdded: '已新增订单',
    orderUpdated: '已更新订单',
    chooseImportFile: '请先选择导入文件',
    importSuccess: '导入成功，已更新资料',
    importFail: '导入失败',
    xLabel: 'x',
    badPrice: '\u4ef7\u683c\u683c\u5f0f\u9519\u8bef',
    busyProcessing: '\u7cfb\u7edf\u5904\u7406\u4e2d\uff0c\u8bf7\u7a0d\u5019...',
    diagLoading: '\u8f7d\u5165\u4e2d...',
    loadFailedPrefix: '\u8f7d\u5165\u5931\u8d25\uff1a'
  },
  en: {
    appTitle: 'Overtime Meal Order',
    exportCsv: 'Export CSV',
    exportExcel: 'Export XLSX',
    secRestaurant: '1) Restaurant',
    setRestaurant: 'Set Restaurant',
    forceChange: 'Change & Clear',
    secOrder: '2) Place Order',
    dept: 'Department',
    name: 'Name',
    category: 'Category',
    food: 'Food',
    price: 'Price',
    drink: 'Drink',
    addon: 'Addon',
    addonHint: 'e.g. no onion, extra rice',
    submitOrder: 'Submit Order',
    secOrders: '3) Today Orders',
    total: 'Total',
    secImport: '4) Import Data (Excel/CSV/JSON)',
    importData: 'Import & Overwrite',
    importHint: 'Excel/CSV headers: type, restaurant, category, item, price, dept, name, drink',
    datePrefix: 'Date: ',
    currentRestaurant: 'Current: ',
    notSet: 'Not set',
    noOrders: 'No orders yet',
    noDrink: 'No drink',
    selectRestaurant: '-- Select Restaurant --',
    selectDept: '-- Select Department --',
    selectName: '-- Select Name --',
    selectCat: '-- Select Category --',
    selectFood: '-- Select Food --',
    selectDrink: '-- None --',
    chooseDeptFirst: '-- Select department first --',
    chooseCatFirst: '-- Select category first --',
    chooseRestaurantFirst: 'Please select a restaurant first',
    chooseNewRestaurantFirst: 'Please select new restaurant first',
    enterAdminPassword: 'Please enter admin password',
    enterAdminPasswordPrompt: 'Enter admin password (changing restaurant clears old orders)',
    restaurantSet: 'Today restaurant set',
    restaurantChanged: 'Restaurant changed, old orders cleared',
    restaurantLocked: 'Restaurant is locked. Use password change to switch.',
    orderAdded: 'Order added',
    orderUpdated: 'Order updated',
    chooseImportFile: 'Please choose a file first',
    importSuccess: 'Import successful',
    importFail: 'Import failed',
    xLabel: 'x',
    badPrice: 'Invalid price format',
    busyProcessing: 'Processing, please wait...',
    diagLoading: 'Loading...',
    loadFailedPrefix: 'Load failed: '
  }
};
const el = {
  dateText: document.getElementById('dateText'),
  diagInfo: document.getElementById('diagInfo'),
  restaurantSelect: document.getElementById('restaurantSelect'),
  setRestaurantBtn: document.getElementById('setRestaurantBtn'),
  forceChangeBtn: document.getElementById('forceChangeBtn'),
  currentRestaurantText: document.getElementById('currentRestaurantText'),
  deptSelect: document.getElementById('deptSelect'),
  nameSelect: document.getElementById('nameSelect'),
  categorySelect: document.getElementById('categorySelect'),
  foodSelect: document.getElementById('foodSelect'),
  priceInput: document.getElementById('priceInput'),
  drinkSelect: document.getElementById('drinkSelect'),
  addonInput: document.getElementById('addonInput'),
  orderForm: document.getElementById('orderForm'),
  ordersBody: document.getElementById('ordersBody'),
  totalPrice: document.getElementById('totalPrice'),
  drinkSummary: document.getElementById('drinkSummary'),
  exportXlsxBtn: document.getElementById('exportXlsxBtn'),
  langTc: document.getElementById('langTc'),
  langSc: document.getElementById('langSc'),
  langEn: document.getElementById('langEn'),
  toast: document.getElementById('toast'),
  busyOverlay: document.getElementById('busyOverlay')
};
function mapLocaleToLang(locale) {
  const raw = String(locale || '').toLowerCase();
  if (!raw) return null;
  if (raw === 'en' || raw.startsWith('en-')) return 'en';
  if (raw === 'zh-hant' || raw.startsWith('zh-hant-')) return 'tc';
  if (raw === 'zh-hans' || raw.startsWith('zh-hans-')) return 'sc';
  if (raw === 'zh-hk' || raw === 'zh-tw' || raw === 'zh-mo') return 'tc';
  if (raw === 'zh-cn' || raw === 'zh-sg') return 'sc';
  return null;
}

function detectPreferredLang() {
  const primary = (Array.isArray(navigator.languages) && navigator.languages.length)
    ? navigator.languages[0]
    : navigator.language;
  const mapped = mapLocaleToLang(primary);
  return mapped || 'en';
}

function t(key) { return (i18n[state.lang] && i18n[state.lang][key]) || key; }
function setDiag(message, isError = false) {
  if (!el.diagInfo) return;
  el.diagInfo.textContent = message;
  el.diagInfo.className = `mt-1 text-xs ${isError ? 'text-red-200' : 'text-white/75'}`;
}

function updateDiagSummary() {
  const restaurantCount = (state.restaurants || []).length;
  const orderCount = (state.orders || []).length;
  const currentRestaurant = String(state.currentRestaurant || '').trim();

  if (state.lang === 'en') {
    const restaurantPart = currentRestaurant ? `today restaurant ${currentRestaurant}` : 'today restaurant not set';
    setDiag(`Loaded: ${restaurantCount} restaurants, ${restaurantPart}, ${orderCount} orders`);
    return;
  }

  if (state.lang === 'sc') {
    const restaurantPart = currentRestaurant
      ? `\u4eca\u65e5\u9910\u5385 ${currentRestaurant}`
      : '\u4eca\u65e5\u9910\u5385\u672a\u8bbe\u7f6e';
    setDiag(`\u8f7d\u5165\u6210\u529f\uff1a\u9910\u5385 ${restaurantCount} \u95f4\uff0c${restaurantPart}\uff0c\u8ba2\u5355 ${orderCount} \u5f20`);
    return;
  }

  const restaurantPart = currentRestaurant
    ? `\u4eca\u65e5\u9910\u5ef3 ${currentRestaurant}`
    : '\u4eca\u65e5\u9910\u5ef3\u672a\u8a2d\u5b9a';
  setDiag(`\u8f09\u5165\u6210\u529f\uff1a\u9910\u5ef3 ${restaurantCount} \u9593\uff0c${restaurantPart}\uff0c\u8a02\u55ae ${orderCount} \u5f35`);
}

function showToast(message, ms = 2000) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  clearTimeout(showToast.tid);
  showToast.tid = setTimeout(() => el.toast.classList.add('hidden'), ms);
}

function setBusy(isBusy) {
  if (!el.busyOverlay) return;
  el.busyOverlay.classList.toggle('hidden', !isBusy);
  el.busyOverlay.classList.toggle('flex', isBusy);
}

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error || 'Request failed');
  }
  return res.json();
}

function normalizeDrink(d) {
  if (typeof d === 'string') return { tc: d, sc: d, en: d };
  if (!d || typeof d !== 'object') return { tc: '', sc: '', en: '' };
  const tc = String(d.tc || d.name || '').trim();
  const sc = String(d.sc || tc).trim();
  const en = String(d.en || tc).trim();
  return { tc: tc || sc || en, sc: sc || tc || en, en: en || tc || sc };
}

function normalizeMenuItem(item) {
  if (!item || typeof item !== 'object') return { nameTc: '', nameSc: '', nameEn: '', price: 0 };
  const tc = String(item.nameTc || item.name || item.tc || '').trim();
  const sc = String(item.nameSc || item.sc || tc).trim();
  const en = String(item.nameEn || item.en || tc).trim();
  const price = Number(item.price);
  return { nameTc: tc || sc || en, nameSc: sc || tc || en, nameEn: en || tc || sc, price: Number.isFinite(price) ? price : 0 };
}

function getLocalizedDrink(drink) {
  const d = normalizeDrink(drink);
  return state.lang === 'en' ? d.en : state.lang === 'sc' ? d.sc : d.tc;
}

function getLocalizedFood(item) {
  const f = normalizeMenuItem(item);
  return state.lang === 'en' ? f.nameEn : state.lang === 'sc' ? f.nameSc : f.nameTc;
}

function applyI18n() {
  document.documentElement.lang = state.lang === 'en' ? 'en' : (state.lang === 'sc' ? 'zh-Hans' : 'zh-Hant');
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.getAttribute('data-i18n-placeholder')); });
}

function fillSelect(select, items, placeholder) {
  select.innerHTML = '';
  const first = document.createElement('option');
  first.value = '';
  first.textContent = placeholder;
  select.appendChild(first);
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.value;
    opt.textContent = item.label;
    if (item.price !== undefined) opt.dataset.price = String(item.price);
    select.appendChild(opt);
  });
}

function buildLookupMaps() {
  state.foodLookup = {};
  Object.values(state.menu || {}).forEach(items => {
    (items || []).forEach(raw => {
      const it = normalizeMenuItem(raw);
      if (!it.nameTc) return;
      state.foodLookup[it.nameTc] = it;
    });
  });

  state.drinkLookup = {};
  (state.drinks || []).forEach(raw => {
    const d = normalizeDrink(raw);
    if (d.tc) state.drinkLookup[d.tc] = d;
  });
}

function syncRestaurantLock() {
  const locked = Boolean(state.currentRestaurant);
  const selected = el.restaurantSelect.value;
  el.setRestaurantBtn.disabled = locked && selected !== state.currentRestaurant;
}

function renderRestaurants() {
  fillSelect(el.restaurantSelect, (state.restaurants || []).map(r => ({ value: r, label: r })), t('selectRestaurant'));
  if (state.currentRestaurant) el.restaurantSelect.value = state.currentRestaurant;
  el.currentRestaurantText.textContent = `${t('currentRestaurant')}${state.currentRestaurant || t('notSet')}`;
  syncRestaurantLock();
}

function renderDepartments() {
  fillSelect(el.deptSelect, Object.keys(state.staff || {}).map(d => ({ value: d, label: d })), t('selectDept'));
  fillSelect(el.nameSelect, [], t('chooseDeptFirst'));
}

function renderDrinks() {
  fillSelect(el.drinkSelect, (state.drinks || []).map(raw => {
    const d = normalizeDrink(raw);
    return { value: d.tc, label: getLocalizedDrink(d) };
  }), t('selectDrink'));
}

function renderCategories() {
  fillSelect(el.categorySelect, Object.keys(state.menu || {}).map(c => ({ value: c, label: c })), t('selectCat'));
  fillSelect(el.foodSelect, [], t('chooseCatFirst'));
  el.priceInput.value = '';
}

function renderFood() {
  const cat = el.categorySelect.value;
  const items = (state.menu && state.menu[cat]) ? state.menu[cat] : [];
  fillSelect(el.foodSelect, items.map(raw => {
    const f = normalizeMenuItem(raw);
    return { value: f.nameTc, label: `${getLocalizedFood(f)} ($${f.price})`, price: f.price };
  }), t('selectFood'));
  el.priceInput.value = '';
}

function displayFood(foodKey) {
  const f = state.foodLookup[foodKey];
  return f ? getLocalizedFood(f) : foodKey;
}

function displayDrink(drinkKey) {
  if (!drinkKey) return t('noDrink');
  const d = state.drinkLookup[drinkKey];
  return d ? getLocalizedDrink(d) : drinkKey;
}

function orderSignature(orders) {
  return JSON.stringify((orders || []).map(o => [
    o.dept || '',
    o.name || '',
    o.food || '',
    Number(o.price || 0),
    o.addon || '',
    o.drink || ''
  ]));
}

function upsertLocalOrder(order) {
  const idx = (state.orders || []).findIndex(o => o.dept === order.dept && o.name === order.name);
  if (idx >= 0) {
    state.orders[idx] = { ...state.orders[idx], ...order };
    return true;
  }
  state.orders.push(order);
  return false;
}

async function refreshOrdersSilently() {
  try {
    const payload = await api('/api/orders');
    const incoming = payload.orders || [];
    const sig = orderSignature(incoming);
    if (sig !== state.lastOrdersSignature) {
      state.orders = incoming;
      state.lastOrdersSignature = sig;
      renderOrders();
    }
  } catch {
  }
}

function startAutoRefresh() {
  if (startAutoRefresh.tid) clearInterval(startAutoRefresh.tid);
  startAutoRefresh.tid = setInterval(() => {
    if (document.hidden) return;
    refreshOrdersSilently();
  }, 3000);
}
function renderOrders() {
  const orders = [...(state.orders || [])];
  let total = 0;
  if (!orders.length) {
    el.ordersBody.innerHTML = `<tr><td colspan="7">${t('noOrders')}</td></tr>`;
    el.totalPrice.textContent = '0.00';
    el.drinkSummary.textContent = '';
    updateDiagSummary();
    return;
  }

  el.ordersBody.innerHTML = orders.map((o, i) => {
    const p = Number(o.price || 0);
    total += p;
    return `<tr><td>${i + 1}</td><td>${o.dept}</td><td>${o.name}</td><td>${displayFood(o.food)}</td><td>${o.addon || ''}</td><td>${displayDrink(o.drink)}</td><td>${p.toFixed(2)}</td></tr>`;
  }).join('');
  el.totalPrice.textContent = total.toFixed(2);

  const byDeptDrink = {};
  orders.forEach(o => {
    const drinkKey = String(o.drink || '').trim();
    if (!drinkKey) return;
    const dept = String(o.dept || '').trim() || '-';
    if (!byDeptDrink[dept]) byDeptDrink[dept] = {};
    byDeptDrink[dept][drinkKey] = (byDeptDrink[dept][drinkKey] || 0) + 1;
  });

 const summaryHtml = Object.entries(byDeptDrink)
  .map(([dept, drinkMap]) => {
    const drinksList = Object.entries(drinkMap)
      .map(([k, c]) => `- ${displayDrink(k)} ${t('xLabel')} ${c}`)
      .join('<br>');
    return `<div><strong>${dept}:</strong><br>${drinksList}</div>`;
  })
  .join('<br>');

el.drinkSummary.innerHTML = summaryHtml;

  updateDiagSummary();
}

async function loadMenu(restaurant) {
  if (!restaurant) {
    state.menu = {};
    renderCategories();
    return;
  }
  const payload = await api(`/api/menu?restaurant=${encodeURIComponent(restaurant)}`);
  state.menu = payload.menu || {};
  buildLookupMaps();
  renderCategories();
}

async function loadBootstrap() {
  setBusy(true);
  setDiag(t('diagLoading'));
  try {
    const payload = await api('/api/bootstrap');
    state.restaurants = payload.restaurants || [];
    state.staff = payload.staff || {};
    state.drinks = payload.drinks || [];
    state.currentRestaurant = payload.currentRestaurant || null;
    state.orders = payload.orders || [];
    state.lastOrdersSignature = orderSignature(state.orders);
    state.date = payload.date || '';

    el.dateText.textContent = `${t('datePrefix')}${payload.date}`;
    renderRestaurants();
    renderDepartments();
    renderDrinks();
    await loadMenu(state.currentRestaurant);
    renderOrders();
    updateDiagSummary();
  } catch (err) {
    setDiag(`${t('loadFailedPrefix')}${err.message}`, true);
    throw err;
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
      const dept = pick(r, ['Dept', 'DEPT', 'Department'], 0);
      const name = pick(r, ['Name', 'NAME', 'Staff'], 1);
      if (!dept || !name) return;
      if (!seed.staff[dept]) seed.staff[dept] = [];
      seed.staff[dept].push(name);
    });
  }

  const drinkSheet = getSheet(drinkNames);
  if (drinkSheet) {
    const rows = XLSX.utils.sheet_to_json(drinkSheet, { defval: '' });
    rows.forEach(r => {
      const tc = pick(r, ['TC', 'tc', 'Traditional'], 0);
      const sc = pick(r, ['SC', 'sc', 'Simplified'], 1) || tc;
      const en = pick(r, ['EN', 'en', 'English'], 2) || tc;
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
      const tc = pick(r, ['Name TC', 'Item TC', 'Name', 'Item'], 0);
      const en = pick(r, ['Name EN', 'Item EN', 'English'], 1) || tc;
      const cat = pick(r, ['Category', 'Cat'], 2) || 'Others';
      const rawPrice = pick(r, ['Price', 'price'], 3);
      const price = Number(String(rawPrice).replace(',', '.'));
      if (!tc || !Number.isFinite(price)) return;

      if (!seed.menus[restaurant][cat]) seed.menus[restaurant][cat] = [];
      seed.menus[restaurant][cat].push({ nameTc: tc, nameSc: tc, nameEn: en || tc, price });
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
function parsePriceInput(v) {
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function resetOrderForm() {
  el.deptSelect.value = '';
  fillSelect(el.nameSelect, [], t('chooseDeptFirst'));
  el.categorySelect.value = '';
  fillSelect(el.foodSelect, [], t('chooseCatFirst'));
  el.priceInput.value = '';
  el.drinkSelect.value = '';
  el.addonInput.value = '';
}

async function exportXlsx() {
  if (!window.XLSX) return showToast('XLSX parser not loaded');

  const payload = await api('/api/orders');
  const orders = payload.orders || [];

  const header = ['No', 'Dept', 'Name', 'Food', 'Addon', 'Drink', 'Price'];
  const rows = orders.map((o, i) => [
    i + 1,
    o.dept || '',
    o.name || '',
    displayFood(o.food || ''),
    o.addon || '',
    displayDrink(o.drink || ''),
    Number(o.price || 0)
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!autofilter'] = { ref: `A1:G${Math.max(1, rows.length + 1)}` };
  ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  const datePart = state.date || new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `orders-${datePart}.xlsx`);
}

el.deptSelect.addEventListener('change', () => {
  const dept = el.deptSelect.value;
  fillSelect(el.nameSelect, (state.staff[dept] || []).map(n => ({ value: n, label: n })), t('selectName'));
});

el.categorySelect.addEventListener('change', renderFood);
el.foodSelect.addEventListener('change', () => {
  const opt = el.foodSelect.options[el.foodSelect.selectedIndex];
  el.priceInput.value = opt && opt.dataset ? (opt.dataset.price || '') : '';
});
el.restaurantSelect.addEventListener('change', syncRestaurantLock);

el.setRestaurantBtn.addEventListener('click', async () => {
  const restaurant = el.restaurantSelect.value;
  if (!restaurant) return showToast(t('chooseRestaurantFirst'));
  if (state.currentRestaurant && restaurant !== state.currentRestaurant) return showToast(t('restaurantLocked'));
  try {
    setBusy(true);
    await api('/api/restaurant', { method: 'POST', body: JSON.stringify({ restaurant, forceChange: false }) });
    state.currentRestaurant = restaurant;
    el.currentRestaurantText.textContent = `${t('currentRestaurant')}${restaurant}`;
    await loadMenu(restaurant);
    syncRestaurantLock();
    showToast(t('restaurantSet'));
  } catch (err) {
    showToast(err.message);
  } finally {
    setBusy(false);
  }
});

el.forceChangeBtn.addEventListener('click', async () => {
  const restaurant = el.restaurantSelect.value;
  if (!restaurant) return showToast(t('chooseNewRestaurantFirst'));

  const passwordRaw = window.prompt(t('enterAdminPasswordPrompt'), '');
  if (passwordRaw === null) return;
  const password = String(passwordRaw || '').trim();
  if (!password) return showToast(t('enterAdminPassword'));

  try {
    setBusy(true);
    const payload = await api('/api/restaurant', { method: 'POST', body: JSON.stringify({ restaurant, password, forceChange: true }) });
    state.currentRestaurant = payload.currentRestaurant;
    state.orders = [];
    el.currentRestaurantText.textContent = `${t('currentRestaurant')}${state.currentRestaurant}`;
    await loadMenu(state.currentRestaurant);
    syncRestaurantLock();
    renderOrders();
    resetOrderForm();
    showToast(t('restaurantChanged'));
  } catch (err) {
    showToast(err.message);
  } finally {
    setBusy(false);
  }
});

el.orderForm.addEventListener('submit', async event => {
  event.preventDefault();
  const selectedFoodOpt = el.foodSelect.options[el.foodSelect.selectedIndex];
  const selectedPrice = selectedFoodOpt && selectedFoodOpt.dataset ? selectedFoodOpt.dataset.price : '';
  const price = parsePriceInput(selectedPrice || el.priceInput.value);
  if (!Number.isFinite(price)) return showToast(t('badPrice'));

  const order = { dept: el.deptSelect.value, name: el.nameSelect.value, food: el.foodSelect.value, price, addon: el.addonInput.value, drink: el.drinkSelect.value };
  try {
    setBusy(true);
    const payload = await api('/api/orders', { method: 'POST', body: JSON.stringify(order) });
    let updated = false;
    if (Array.isArray(payload.orders)) {
      state.orders = payload.orders;
      updated = Boolean(payload.updated);
    } else {
      updated = upsertLocalOrder(order);
      if (typeof payload.updated === 'boolean') updated = payload.updated;
    }
    state.lastOrdersSignature = orderSignature(state.orders);
    renderOrders();
    resetOrderForm();
    showToast(updated ? t('orderUpdated') : t('orderAdded'));
  } catch (err) {
    showToast(err.message);
  } finally {
    setBusy(false);
  }
});

el.exportXlsxBtn.addEventListener('click', async () => {
  try {
    await exportXlsx();
  } catch (err) {
    showToast(err.message);
  }
});

el.langTc.addEventListener('click', async () => { state.lang = 'tc'; applyI18n(); await loadBootstrap(); });
el.langSc.addEventListener('click', async () => { state.lang = 'sc'; applyI18n(); await loadBootstrap(); });
el.langEn.addEventListener('click', async () => { state.lang = 'en'; applyI18n(); await loadBootstrap(); });

state.lang = detectPreferredLang();
applyI18n();
startAutoRefresh();
loadBootstrap().catch(err => showToast(err.message, 3000));



























