const state = {
  appId: document.body.dataset.appId || 'main',
  defaultCutoffTime: '13:00',
  restaurants: [],
  restaurantContacts: {},
  staff: {},
  drinks: [],
  menu: {},
  currentRestaurant: null,
  cutoffTime: null,
  cutoffPassed: false,
  orders: [],
  date: '',
  lang: 'tc',
  foodLookup: {},
  drinkLookup: {},
  lateOrder: {
    active: false,
    username: '',
    password: '',
    users: []
  },
  drinkChange: {
    users: []
  },
  lastOrdersSignature: ''
};

const ANNOUNCEMENT_SEEN_KEY = 'otDinnerAnnouncementSeenVersion';
const announcementDismissedVersions = new Set();

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

const i18n = {
  tc: {
    appTitle: '加班 Order 飯系統',
    appTitleLadyRuby: '加班 Order 飯系統 - Lady Ruby',
    exportCsv: '匯出 CSV',
    exportExcel: '匯出 XLSX',
    newFrontend: '新前台',
    backToMain: '返回主版',
    secRestaurant: '1) 今日餐廳',
    setRestaurant: '設定餐廳',
    restaurantPicker: '選擇餐廳',
    restaurantActionHint: '按設定餐廳後，再於彈出的畫面選擇餐廳及截單時間。',
    secOrder: '2) 填寫訂單',
    dept: '部門',
    name: '同事',
    category: '分類',
    food: '餐點',
    price: '價錢',
    drink: '飲品',
    optionsTitle: '選項',
    optionsHint: '請選擇：',
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
    restaurantContact: '聯絡：',
    notSet: '未設定',
    noOrders: '未有訂單',
    noDrink: '無',
    optionRequired: '請先完成選項選擇。',
    optionTooMany: '選項超出數量限制。',
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
    passwordLabel: '管理密碼',
    enterAdminPasswordPrompt: '請輸入管理密碼（更改餐廳會清空舊單）',
    settingsPasswordPrompt: '請輸入管理密碼以更改餐廳或截單時間',
    restaurantSet: '已設定今日餐廳',
    restaurantChanged: '已更改餐廳，舊單已清空',
    cutoffUpdated: '已更新截單時間',
    restaurantLocked: '餐廳已鎖定，如需更改請按「改餐廳並清單」',
    cutoffTime: '截單時間',
    settingsLockedHint: '如需更改餐廳或截單時間，按設定餐廳並輸入密碼。',
    cutoffNotSet: '今日截單時間：未設定',
    cutoffAt: '今日截單時間：',
    cutoffPassedNotice: '下單時間已過，請聯絡部門主管或 Simon 下單。',
    cutoffActiveNotice: '請於截單前完成下單，如已過時請聯絡部門主管或 Simon。',
    restaurantModalTitle: '設定今日餐廳',
    restaurantModalHint: '輸入密碼後，選擇餐廳及截單時間。',
    saveRestaurantSettings: '確認設定',
    cancel: '取消',
    orderBlockedNotice: '下單沒有成功，請聯絡部門主管或 Simon 下單。',
    orderAdded: '已新增訂單',
    orderUpdated: '已更新訂單',
    chooseImportFile: '請先選擇匯入檔案',
    importSuccess: '匯入成功，已更新資料',
    importFail: '匯入失敗',
    xLabel: 'x',
    badPrice: '\u50f9\u9322\u683c\u5f0f\u932f\u8aa4',
    busyProcessing: '\u7cfb\u7d71\u8655\u7406\u4e2d\uff0c\u8acb\u7a0d\u5019...',
    diagLoading: '\u8f09\u5165\u4e2d...',
    loadFailedPrefix: '\u8f09\u5165\u5931\u6557\uff1a',
    secretAccessPrompt: '請輸入私人頁面密碼',
    secretAccessError: '密碼錯誤，未能進入私人頁面。'
  },
  sc: {
    appTitle: '加班订餐系统',
    appTitleLadyRuby: '加班订餐系统 - Lady Ruby',
    exportCsv: '导出 CSV',
    exportExcel: '导出 XLSX',
    newFrontend: '新前台',
    backToMain: '返回主版',
    secRestaurant: '1) 今日餐厅',
    setRestaurant: '设置餐厅',
    restaurantPicker: '选择餐厅',
    restaurantActionHint: '按设置餐厅后，再于弹出的画面选择餐厅及截单时间。',
    secOrder: '2) 填写订单',
    dept: '部门',
    name: '人员',
    category: '分类',
    food: '餐点',
    price: '价格',
    drink: '饮品',
    optionsTitle: '选项',
    optionsHint: '请选择：',
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
    restaurantContact: '联系：',
    notSet: '未设置',
    noOrders: '暂无订单',
    noDrink: '无',
    optionRequired: '请先完成选项选择。',
    optionTooMany: '选项超出数量限制。',
    selectRestaurant: '-- 选择餐厅 --',
    selectDept: '-- 选择部门 --',
    selectName: '-- 选择人员 --',
    selectCat: '-- 选择分类 --',
    selectFood: '-- 选择餐点 --',
    selectDrink: '-- 无 --',
    chooseDeptFirst: '-- 先选部门 --',
    chooseCatFirst: '-- 先选分类 --',
    chooseRestaurantFirst: '请先选餐厅',
    chooseNewRestaurantFirst: '请先选新餐厅',
    enterAdminPassword: '请输入管理密码',
    passwordLabel: '管理密码',
    enterAdminPasswordPrompt: '请输入管理密码（更改餐厅会清空旧单）',
    settingsPasswordPrompt: '请输入管理密码以更改餐厅或截单时间',
    restaurantSet: '已设置今日餐厅',
    restaurantChanged: '已更改餐厅，旧单已清空',
    cutoffUpdated: '已更新截单时间',
    restaurantLocked: '餐厅已锁定，如需更改请按「改餐厅并清单」',
    cutoffTime: '截单时间',
    settingsLockedHint: '如需更改餐厅或截单时间，请按设置餐厅并输入密码。',
    cutoffNotSet: '今日截单时间：未设置',
    cutoffAt: '今日截单时间：',
    cutoffPassedNotice: '下单时间已过，请联络部门主管或 Simon 下单。',
    cutoffActiveNotice: '请于截单前完成下单，如已过时请联络部门主管或 Simon。',
    restaurantModalTitle: '设置今日餐厅',
    restaurantModalHint: '输入密码后，选择餐厅及截单时间。',
    saveRestaurantSettings: '确认设置',
    cancel: '取消',
    orderBlockedNotice: '下单没有成功，请联络部门主管或 Simon 下单。',
    orderAdded: '已新增订单',
    orderUpdated: '已更新订单',
    chooseImportFile: '请先选择导入文件',
    importSuccess: '导入成功，已更新资料',
    importFail: '导入失败',
    xLabel: 'x',
    badPrice: '\u4ef7\u683c\u683c\u5f0f\u9519\u8bef',
    busyProcessing: '\u7cfb\u7edf\u5904\u7406\u4e2d\uff0c\u8bf7\u7a0d\u5019...',
    diagLoading: '\u8f7d\u5165\u4e2d...',
    loadFailedPrefix: '\u8f7d\u5165\u5931\u8d25\uff1a',
    secretAccessPrompt: '请输入私人页面密码',
    secretAccessError: '密码错误，无法进入私人页面。'
  },
  en: {
    appTitle: 'Overtime Meal Order',
    appTitleLadyRuby: 'Overtime Meal Order - Lady Ruby',
    exportCsv: 'Export CSV',
    exportExcel: 'Export XLSX',
    newFrontend: 'New Page',
    backToMain: 'Main Page',
    secRestaurant: '1) Restaurant',
    setRestaurant: 'Set Restaurant',
    restaurantPicker: 'Choose Restaurant',
    restaurantActionHint: 'Click Set Restaurant, then choose the restaurant and cutoff time in the popup.',
    secOrder: '2) Place Order',
    dept: 'Department',
    name: 'Name',
    category: 'Category',
    food: 'Food',
    price: 'Price',
    drink: 'Drink',
    optionsTitle: 'Options',
    optionsHint: 'Please choose:',
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
    restaurantContact: 'Contact: ',
    notSet: 'Not set',
    noOrders: 'No orders yet',
    noDrink: 'No drink',
    optionRequired: 'Please complete required options.',
    optionTooMany: 'Too many options selected.',
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
    passwordLabel: 'Admin Password',
    enterAdminPasswordPrompt: 'Enter admin password (changing restaurant clears old orders)',
    settingsPasswordPrompt: 'Enter admin password to change the restaurant or cutoff time',
    restaurantSet: 'Today restaurant set',
    restaurantChanged: 'Restaurant changed, old orders cleared',
    cutoffUpdated: 'Cutoff time updated',
    restaurantLocked: 'Restaurant is locked. Use password change to switch.',
    cutoffTime: 'Cutoff Time',
    settingsLockedHint: 'To change the restaurant or cutoff time, click Set Restaurant and enter the password.',
    cutoffNotSet: 'Today cutoff time: not set',
    cutoffAt: 'Today cutoff time: ',
    cutoffPassedNotice: 'Ordering time has passed. Please contact your team leader or Simon to place an order.',
    cutoffActiveNotice: 'Please place your order before the cutoff time. After that, contact your team leader or Simon.',
    restaurantModalTitle: 'Set Today Restaurant',
    restaurantModalHint: 'Enter the password, then choose the restaurant and cutoff time.',
    saveRestaurantSettings: 'Save Settings',
    cancel: 'Cancel',
    orderBlockedNotice: 'Order was not placed successfully. Please contact your team leader or Simon to place an order.',
    orderAdded: 'Order added',
    orderUpdated: 'Order updated',
    chooseImportFile: 'Please choose a file first',
    importSuccess: 'Import successful',
    importFail: 'Import failed',
    xLabel: 'x',
    badPrice: 'Invalid price format',
    busyProcessing: 'Processing, please wait...',
    diagLoading: 'Loading...',
    loadFailedPrefix: 'Load failed: ',
    secretAccessPrompt: 'Enter the private page password',
    secretAccessError: 'Incorrect password. Private page access denied.'
  }
};

i18n.tc.confirmOrderChangeTitle = '確認變更訂單';
i18n.tc.confirmOrderChange = '確定變更';
i18n.tc.lateOrderTitle = '主管補單';
i18n.tc.lateOrderHint = '截單時間已過，只有有補單權限的後台用戶可以繼續下單。';
i18n.tc.lateOrderStart = '主管補單';
i18n.tc.lateOrderStop = '結束補單';
i18n.tc.lateOrderActive = '主管補單中：';
i18n.tc.lateOrderUser = '補單用戶';
i18n.tc.lateOrderPassword = '密碼';
i18n.tc.lateOrderLogin = '開始補單';
i18n.tc.lateOrderCancel = '取消';
i18n.tc.lateOrderNoUsers = '未有可補單用戶，請先在後台加入補單權限。';
i18n.tc.lateOrderAuthorized = '已開啟主管補單';
i18n.tc.lateOrderEnded = '已結束主管補單';
i18n.tc.lateOrderPasswordRequired = '請輸入補單用戶密碼';
i18n.tc.lateOrderOnlyAfterCutoff = '截單後才需要使用主管補單。';
i18n.tc.drinkChangeTitle = '更改飲品';
i18n.tc.drinkChangeHint = '輸入有補單權限的用戶密碼後，可以更改今日訂單飲品。';
i18n.tc.drinkChangeLogin = '進入更改飲品';
i18n.tc.drinkChangeSave = '儲存飲品更改';
i18n.tc.drinkChangeNoOrders = '今日未有訂單。';
i18n.tc.drinkChangeNoChanges = '未有需要儲存的飲品更改。';
i18n.tc.drinkChangeSaved = '已更新飲品';
i18n.tc.newDrink = '新飲品';
i18n.tc.announcementTitle = '通告';
i18n.tc.announcementOk = '知道了';
i18n.tc.announcementDontShow = '不再顯示';
i18n.sc.confirmOrderChangeTitle = '确认变更订单';
i18n.sc.confirmOrderChange = '确认变更';
i18n.sc.lateOrderTitle = '主管补单';
i18n.sc.lateOrderHint = '截单时间已过，只有有补单权限的后台用户可以继续下单。';
i18n.sc.lateOrderStart = '主管补单';
i18n.sc.lateOrderStop = '结束补单';
i18n.sc.lateOrderActive = '主管补单中：';
i18n.sc.lateOrderUser = '补单用户';
i18n.sc.lateOrderPassword = '密码';
i18n.sc.lateOrderLogin = '开始补单';
i18n.sc.lateOrderCancel = '取消';
i18n.sc.lateOrderNoUsers = '未有可补单用户，请先在后台加入补单权限。';
i18n.sc.lateOrderAuthorized = '已开启主管补单';
i18n.sc.lateOrderEnded = '已结束主管补单';
i18n.sc.lateOrderPasswordRequired = '请输入补单用户密码';
i18n.sc.lateOrderOnlyAfterCutoff = '截单后才需要使用主管补单。';
i18n.sc.drinkChangeTitle = '更改饮品';
i18n.sc.drinkChangeHint = '输入有补单权限的用户密码后，可以更改今日订单饮品。';
i18n.sc.drinkChangeLogin = '进入更改饮品';
i18n.sc.drinkChangeSave = '保存饮品更改';
i18n.sc.drinkChangeNoOrders = '今日未有订单。';
i18n.sc.drinkChangeNoChanges = '未有需要保存的饮品更改。';
i18n.sc.drinkChangeSaved = '已更新饮品';
i18n.sc.newDrink = '新饮品';
i18n.sc.announcementTitle = '通告';
i18n.sc.announcementOk = '知道了';
i18n.sc.announcementDontShow = '不再显示';
i18n.en.confirmOrderChangeTitle = 'Confirm order change';
i18n.en.confirmOrderChange = 'Confirm change';
i18n.en.lateOrderTitle = 'Supervisor Late Order';
i18n.en.lateOrderHint = 'The cutoff has passed. Only admin users with late-order permission can keep ordering.';
i18n.en.lateOrderStart = 'Supervisor Late Order';
i18n.en.lateOrderStop = 'End Late Order';
i18n.en.lateOrderActive = 'Late ordering as:';
i18n.en.lateOrderUser = 'Late-order user';
i18n.en.lateOrderPassword = 'Password';
i18n.en.lateOrderLogin = 'Start Late Order';
i18n.en.lateOrderCancel = 'Cancel';
i18n.en.lateOrderNoUsers = 'No late-order users yet. Add late-order permission in admin first.';
i18n.en.lateOrderAuthorized = 'Supervisor late order enabled';
i18n.en.lateOrderEnded = 'Supervisor late order ended';
i18n.en.lateOrderPasswordRequired = 'Please enter the late-order user password';
i18n.en.lateOrderOnlyAfterCutoff = 'Supervisor late order is only needed after cutoff.';
i18n.en.drinkChangeTitle = 'Change Drinks';
i18n.en.drinkChangeHint = 'Enter a user with late-order permission to change drinks for today orders.';
i18n.en.drinkChangeLogin = 'Open Drink Changes';
i18n.en.drinkChangeSave = 'Save Drink Changes';
i18n.en.drinkChangeNoOrders = 'No orders today.';
i18n.en.drinkChangeNoChanges = 'No drink changes to save.';
i18n.en.drinkChangeSaved = 'Drinks updated';
i18n.en.newDrink = 'New drink';
i18n.en.announcementTitle = 'Notice';
i18n.en.announcementOk = 'OK';
i18n.en.announcementDontShow = "Don't show again";

const el = {
  appTitle: document.getElementById('appTitle'),
  restaurantSectionTitle: document.getElementById('restaurantSectionTitle'),
  orderSectionTitle: document.querySelector('[data-i18n="secOrder"]'),
  dateText: document.getElementById('dateText'),
  diagInfo: document.getElementById('diagInfo'),
  restaurantSelect: document.getElementById('restaurantSelect'),
  openRestaurantModalBtn: document.getElementById('openRestaurantModalBtn'),
  setRestaurantBtn: document.getElementById('setRestaurantBtn'),
  restaurantModal: document.getElementById('restaurantModal'),
  closeRestaurantModalBtn: document.getElementById('closeRestaurantModalBtn'),
  cancelRestaurantModalBtn: document.getElementById('cancelRestaurantModalBtn'),
  orderChangeModal: document.getElementById('orderChangeModal'),
  orderChangeMessage: document.getElementById('orderChangeMessage'),
  cancelOrderChangeBtn: document.getElementById('cancelOrderChangeBtn'),
  confirmOrderChangeBtn: document.getElementById('confirmOrderChangeBtn'),
  restaurantPasswordInput: document.getElementById('restaurantPasswordInput'),
  restaurantActionHint: document.getElementById('restaurantActionHint'),
  currentRestaurantText: document.getElementById('currentRestaurantText'),
  currentRestaurantContactText: document.getElementById('currentRestaurantContactText'),
  cutoffTimeInput: document.getElementById('cutoffTimeInput'),
  cutoffTimeText: document.getElementById('cutoffTimeText'),
  cutoffNotice: document.getElementById('cutoffNotice'),
  orderErrorNotice: document.getElementById('orderErrorNotice'),
  deptSelect: document.getElementById('deptSelect'),
  nameSelect: document.getElementById('nameSelect'),
  categorySelect: document.getElementById('categorySelect'),
  foodSelect: document.getElementById('foodSelect'),
  priceInput: document.getElementById('priceInput'),
  drinkSelect: document.getElementById('drinkSelect'),
  optionGroupsWrap: document.getElementById('optionGroupsWrap'),
  optionGroupsList: document.getElementById('optionGroupsList'),
  addonInput: document.getElementById('addonInput'),
  orderForm: document.getElementById('orderForm'),
  ordersBody: document.getElementById('ordersBody'),
  totalPrice: document.getElementById('totalPrice'),
  drinkSummary: document.getElementById('drinkSummary'),
  foodSummary: document.getElementById('foodSummary'),
  foodSummaryByDept: document.getElementById('foodSummaryByDept'),
  ordersSectionTitle: document.querySelector('[data-i18n="secOrders"]'),
  exportCsvLink: document.getElementById('exportCsvLink'),
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
  const cutoff = state.cutoffTime ? `, cutoff ${state.cutoffTime}` : '';

  if (state.lang === 'en') {
    const restaurantPart = currentRestaurant ? `today restaurant ${currentRestaurant}` : 'today restaurant not set';
    setDiag(`Loaded: ${restaurantCount} restaurants, ${restaurantPart}${cutoff}, ${orderCount} orders`);
    return;
  }

  if (state.lang === 'sc') {
    const restaurantPart = currentRestaurant
      ? `\u4eca\u65e5\u9910\u5385 ${currentRestaurant}`
      : '\u4eca\u65e5\u9910\u5385\u672a\u8bbe\u7f6e';
    const cutoffPart = state.cutoffTime ? `\uff0c\u622a\u5355 ${state.cutoffTime}` : '';
    setDiag(`\u8f7d\u5165\u6210\u529f\uff1a\u9910\u5385 ${restaurantCount} \u95f4\uff0c${restaurantPart}${cutoffPart}\uff0c\u8ba2\u5355 ${orderCount} \u5f20`);
    return;
  }

  const restaurantPart = currentRestaurant
    ? `\u4eca\u65e5\u9910\u5ef3 ${currentRestaurant}`
    : '\u4eca\u65e5\u9910\u5ef3\u672a\u8a2d\u5b9a';
  const cutoffPart = state.cutoffTime ? `\uff0c\u622a\u55ae ${state.cutoffTime}` : '';
  setDiag(`\u8f09\u5165\u6210\u529f\uff1a\u9910\u5ef3 ${restaurantCount} \u9593\uff0c${restaurantPart}${cutoffPart}\uff0c\u8a02\u55ae ${orderCount} \u5f35`);
}

function showToast(message, ms = 2000) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  clearTimeout(showToast.tid);
  showToast.tid = setTimeout(() => el.toast.classList.add('hidden'), ms);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCutoffInputValue() {
  return String(el.cutoffTimeInput?.value || '').trim() || state.cutoffTime || state.defaultCutoffTime;
}

function hideOrderError() {
  if (!el.orderErrorNotice) return;
  el.orderErrorNotice.classList.add('hidden');
  el.orderErrorNotice.textContent = '';
}

function showOrderError(message) {
  if (!el.orderErrorNotice) return;
  el.orderErrorNotice.textContent = message;
  el.orderErrorNotice.classList.remove('hidden');
  el.orderErrorNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setBusy(isBusy) {
  if (!el.busyOverlay) return;
  el.busyOverlay.classList.toggle('hidden', !isBusy);
  el.busyOverlay.classList.toggle('flex', isBusy);
}

function apiPath(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}app=${encodeURIComponent(state.appId)}`;
}

async function api(path, options = {}) {
  const requestOptions = { headers: { 'Content-Type': 'application/json' }, ...options };
  const method = String(requestOptions.method || 'GET').toUpperCase();
  if (method === 'GET' && !requestOptions.cache) requestOptions.cache = 'no-store';
  if (requestOptions.body && typeof requestOptions.body === 'string' && String(requestOptions.body).trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(requestOptions.body);
      if (!parsed.app) requestOptions.body = JSON.stringify({ ...parsed, app: state.appId });
    } catch {
    }
  }

  const res = await fetch(apiPath(path), requestOptions);
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error || 'Request failed');
  }
  return res.json();
}

function normalizeDrink(d) {
  if (typeof d === 'string') return { tc: d, sc: d, en: d, paused: false };
  if (!d || typeof d !== 'object') return { tc: '', sc: '', en: '', paused: false };
  const tc = String(d.tc || d.name || '').trim();
  const sc = String(d.sc || tc).trim();
  const en = String(d.en || tc).trim();
  return { tc: tc || sc || en, sc: sc || tc || en, en: en || tc || sc, paused: Boolean(d.paused) };
}

function normalizeMenuItem(item) {
  if (!item || typeof item !== 'object') return { nameTc: '', nameSc: '', nameEn: '', price: 0 };
  const tc = String(item.nameTc || item.name || item.tc || '').trim();
  const sc = String(item.nameSc || item.sc || tc).trim();
  const en = String(item.nameEn || item.en || tc).trim();
  const price = Number(item.price);
  const base = { nameTc: tc || sc || en, nameSc: sc || tc || en, nameEn: en || tc || sc, price: Number.isFinite(price) ? price : 0, paused: Boolean(item.paused) };
  if (Array.isArray(item.optionGroups) && item.optionGroups.length) base.optionGroups = item.optionGroups;
  return base;
}

function getLocalizedDrink(drink) {
  const d = normalizeDrink(drink);
  if (state.lang === 'en') return d.en;
  if (state.lang === 'sc') {
    const sc = d.sc || d.tc;
    return sc === d.tc ? toSc(d.tc) : sc;
  }
  return d.tc;
}

function getLocalizedFood(item) {
  const f = normalizeMenuItem(item);
  if (state.lang === 'en') return f.nameEn;
  if (state.lang === 'sc') {
    const sc = f.nameSc || f.nameTc;
    return sc === f.nameTc ? toSc(f.nameTc) : sc;
  }
  return f.nameTc;
}

function applyI18n() {
  document.documentElement.lang = state.lang === 'en' ? 'en' : (state.lang === 'sc' ? 'zh-Hans' : 'zh-Hant');
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.getAttribute('data-i18n-placeholder')); });
  const pageTitle = state.appId === 'lady-ruby' ? t('appTitleLadyRuby') : t('appTitle');
  if (el.appTitle) el.appTitle.textContent = pageTitle;
  document.title = pageTitle;
  if (el.lateOrderPanel) updateLateOrderText();
  if (!el.orderErrorNotice || el.orderErrorNotice.classList.contains('hidden')) return;
  if (state.cutoffPassed) showOrderError(t('orderBlockedNotice'));
}

function updateExportLinks() {
  if (el.exportCsvLink) el.exportCsvLink.href = apiPath('/api/export/csv');
  const newFrontendLink = document.getElementById('newFrontendLink');
  if (newFrontendLink) {
    newFrontendLink.href = location.hostname === '127.0.0.1' || location.hostname === 'localhost'
      ? 'http://127.0.0.1:3100/'
      : '/new/';
  }
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
    if (item.optionGroups !== undefined) {
      try {
        opt.dataset.optionGroups = JSON.stringify(item.optionGroups || []);
      } catch {
        opt.dataset.optionGroups = '[]';
      }
    }
    select.appendChild(opt);
  });
}

function buildLookupMaps() {
  state.foodLookup = {};
  Object.values(state.menu || {}).forEach(items => {
    (items || []).forEach(raw => {
      const it = normalizeMenuItem(raw);
      if (!it.nameTc) return;
      [it.nameTc, it.nameSc, it.nameEn, simplifyChoiceName(it.nameTc), simplifyChoiceName(it.nameSc)]
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .forEach(key => {
          state.foodLookup[key] = it;
        });
    });
  });

  state.drinkLookup = {};
  (state.drinks || []).forEach(raw => {
    const d = normalizeDrink(raw);
    if (d.tc) state.drinkLookup[d.tc] = d;
  });
}

function syncRestaurantLock() {
  if (el.restaurantActionHint) {
    el.restaurantActionHint.textContent = state.currentRestaurant
      ? t('settingsLockedHint')
      : t('restaurantActionHint');
  }
}

function openRestaurantModal() {
  if (!el.restaurantModal) return;
  if (el.restaurantSelect) {
    fillSelect(el.restaurantSelect, (state.restaurants || []).map(r => ({ value: r, label: r })), t('selectRestaurant'));
    el.restaurantSelect.value = state.currentRestaurant || '';
  }
  if (el.cutoffTimeInput) el.cutoffTimeInput.value = state.cutoffTime || state.defaultCutoffTime;
  if (el.restaurantPasswordInput) el.restaurantPasswordInput.value = '';
  el.restaurantModal.classList.remove('hidden');
  el.restaurantModal.classList.add('flex');
  setTimeout(() => el.restaurantSelect?.focus(), 0);
}

function closeRestaurantModal() {
  if (!el.restaurantModal) return;
  el.restaurantModal.classList.add('hidden');
  el.restaurantModal.classList.remove('flex');
  if (el.restaurantPasswordInput) el.restaurantPasswordInput.value = '';
}

function openOrderChangeModal(messageHtml) {
  if (!el.orderChangeModal || !el.orderChangeMessage) return;
  el.orderChangeMessage.innerHTML = messageHtml;
  el.orderChangeModal.classList.remove('hidden');
  el.orderChangeModal.classList.add('flex');
}

function closeOrderChangeModal() {
  if (!el.orderChangeModal || !el.orderChangeMessage) return;
  el.orderChangeModal.classList.add('hidden');
  el.orderChangeModal.classList.remove('flex');
  el.orderChangeMessage.textContent = '';
}

function showAnnouncementIfNeeded(settings) {
  const announcement = settings && settings.announcement ? settings.announcement : null;
  const message = String(
    state.lang === 'en'
      ? (announcement && announcement.messageEn || announcement && announcement.messageTc || announcement && announcement.message)
      : state.lang === 'sc'
        ? (announcement && announcement.messageSc || announcement && announcement.messageTc || announcement && announcement.message)
        : (announcement && announcement.messageTc || announcement && announcement.message)
  || '').trim();
  if (!announcement || !announcement.enabled || !message) return;
  const version = String(announcement.version || message).trim();
  if (announcementDismissedVersions.has(version)) return;
  try {
    if (localStorage.getItem(ANNOUNCEMENT_SEEN_KEY) === version) return;
  } catch {
  }
  let modal = document.getElementById('announcementModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'announcementModal';
    modal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/45 px-4';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
      <h3 class="text-lg font-bold text-pbnavy">${escapeHtml(t('announcementTitle'))}</h3>
      <div class="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">${escapeHtml(message)}</div>
      <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button id="announcementHideBtn" type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">${escapeHtml(t('announcementDontShow'))}</button>
        <button id="announcementOkBtn" type="button" class="rounded-md bg-pborange px-4 py-2 text-sm font-semibold text-white transition hover:bg-pborangestrong">${escapeHtml(t('announcementOk'))}</button>
      </div>
    </div>`;
  const close = () => {
    announcementDismissedVersions.add(version);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };
  modal.querySelector('#announcementOkBtn').onclick = close;
  modal.querySelector('#announcementHideBtn').onclick = () => {
    try {
      localStorage.setItem(ANNOUNCEMENT_SEEN_KEY, version);
    } catch {
    }
    close();
  };
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function ensureLateOrderUi() {
  if (el.lateOrderPanel) return;
  const panel = document.createElement('div');
  panel.id = 'lateOrderPanel';
  panel.className = 'hidden';
  panel.innerHTML = `
    <p id="lateOrderTitle"></p>
    <p id="lateOrderHint"></p>
    <button id="lateOrderStartBtn" type="button"></button>
    <button id="lateOrderStopBtn" type="button"></button>`;
  if (el.cutoffNotice && el.cutoffNotice.parentNode) {
    el.cutoffNotice.parentNode.insertBefore(panel, el.cutoffNotice.nextSibling);
  } else if (el.orderForm && el.orderForm.parentNode) {
    el.orderForm.parentNode.insertBefore(panel, el.orderForm);
  }

  const modal = document.createElement('div');
  modal.id = 'lateOrderModal';
  modal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/45 px-4';
  modal.innerHTML = `
    <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
      <h3 id="lateOrderModalTitle" class="text-lg font-bold text-pbnavy"></h3>
      <p id="lateOrderModalHint" class="mt-1 text-sm text-slate-500"></p>
      <div class="mt-4 grid gap-3">
        <label class="grid gap-2 text-sm text-slate-600">
          <span id="lateOrderUserLabel" class="font-semibold text-pbnavy"></span>
          <select id="lateOrderUserSelect" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-pbnavy focus:ring-2 focus:ring-pbnavy/20"></select>
        </label>
        <label class="grid gap-2 text-sm text-slate-600">
          <span id="lateOrderPasswordLabel" class="font-semibold text-pbnavy"></span>
          <input id="lateOrderPasswordInput" type="password" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-pbnavy focus:ring-2 focus:ring-pbnavy/20" />
        </label>
      </div>
      <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button id="lateOrderCancelBtn" type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"></button>
        <button id="lateOrderLoginBtn" type="button" class="rounded-md bg-pborange px-4 py-2 text-sm font-semibold text-white transition hover:bg-pborangestrong"></button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  el.lateOrderPanel = panel;
  el.lateOrderTitle = document.getElementById('lateOrderTitle');
  el.lateOrderHint = document.getElementById('lateOrderHint');
  el.lateOrderStartBtn = document.getElementById('lateOrderStartBtn');
  el.lateOrderStopBtn = document.getElementById('lateOrderStopBtn');
  el.lateOrderModal = modal;
  el.lateOrderModalTitle = document.getElementById('lateOrderModalTitle');
  el.lateOrderModalHint = document.getElementById('lateOrderModalHint');
  el.lateOrderUserLabel = document.getElementById('lateOrderUserLabel');
  el.lateOrderPasswordLabel = document.getElementById('lateOrderPasswordLabel');
  el.lateOrderUserSelect = document.getElementById('lateOrderUserSelect');
  el.lateOrderPasswordInput = document.getElementById('lateOrderPasswordInput');
  el.lateOrderCancelBtn = document.getElementById('lateOrderCancelBtn');
  el.lateOrderLoginBtn = document.getElementById('lateOrderLoginBtn');

  el.lateOrderStartBtn.addEventListener('click', openLateOrderModal);
  el.lateOrderStopBtn.addEventListener('click', endLateOrderMode);
  el.lateOrderCancelBtn.addEventListener('click', closeLateOrderModal);
  el.lateOrderModal.addEventListener('click', event => {
    if (event.target === el.lateOrderModal) closeLateOrderModal();
  });
  el.lateOrderLoginBtn.addEventListener('click', authorizeLateOrder);
  el.lateOrderPasswordInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') authorizeLateOrder();
  });
}

function updateLateOrderText() {
  ensureLateOrderUi();
  el.lateOrderTitle.textContent = t('lateOrderTitle');
  el.lateOrderHint.textContent = state.lateOrder.active
    ? `${t('lateOrderActive')} ${state.lateOrder.username}`
    : t('lateOrderHint');
  el.lateOrderStartBtn.textContent = t('lateOrderStart');
  el.lateOrderStopBtn.textContent = t('lateOrderStop');
  el.lateOrderModalTitle.textContent = t('lateOrderTitle');
  el.lateOrderModalHint.textContent = t('lateOrderHint');
  el.lateOrderUserLabel.textContent = t('lateOrderUser');
  el.lateOrderPasswordLabel.textContent = t('lateOrderPassword');
  el.lateOrderCancelBtn.textContent = t('lateOrderCancel');
  el.lateOrderLoginBtn.textContent = t('lateOrderLogin');
}

function fillLateOrderUsers() {
  ensureLateOrderUi();
  const users = Array.isArray(state.lateOrder.users) ? state.lateOrder.users : [];
  fillSelect(el.lateOrderUserSelect, users.map(user => ({ value: user.username, label: user.username })), t('lateOrderUser'));
  if (state.lateOrder.username) el.lateOrderUserSelect.value = state.lateOrder.username;
}

async function openLateOrderModal() {
  ensureLateOrderUi();
  if (!state.cutoffPassed) {
    showToast(t('lateOrderOnlyAfterCutoff'), 2500);
    return;
  }
  updateLateOrderText();
  try {
    setBusy(true);
    const payload = await api('/api/late-order/users');
    state.lateOrder.users = Array.isArray(payload.users) ? payload.users : [];
    if (!state.lateOrder.users.length) {
      showToast(t('lateOrderNoUsers'), 3000);
      return;
    }
    fillLateOrderUsers();
    if (el.lateOrderPasswordInput) el.lateOrderPasswordInput.value = '';
    el.lateOrderModal.classList.remove('hidden');
    el.lateOrderModal.classList.add('flex');
    setTimeout(() => el.lateOrderPasswordInput?.focus(), 0);
  } catch (err) {
    showToast(err.message, 3000);
  } finally {
    setBusy(false);
  }
}

function closeLateOrderModal() {
  if (!el.lateOrderModal) return;
  el.lateOrderModal.classList.add('hidden');
  el.lateOrderModal.classList.remove('flex');
  if (el.lateOrderPasswordInput) el.lateOrderPasswordInput.value = '';
}

async function authorizeLateOrder() {
  const username = String(el.lateOrderUserSelect?.value || '').trim();
  const password = String(el.lateOrderPasswordInput?.value || '').trim();
  if (!username) return showToast(t('lateOrderNoUsers'), 3000);
  if (!password) return showToast(t('lateOrderPasswordRequired'));
  try {
    setBusy(true);
    const payload = await api('/api/late-order/authorize', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    state.lateOrder.active = true;
    state.lateOrder.username = payload.user && payload.user.username ? payload.user.username : username;
    state.lateOrder.password = password;
    closeLateOrderModal();
    updateCutoffUi();
    showToast(t('lateOrderAuthorized'));
  } catch (err) {
    if (el.lateOrderPasswordInput) {
      el.lateOrderPasswordInput.value = '';
      el.lateOrderPasswordInput.focus();
    }
    showToast(err.message, 3000);
  } finally {
    setBusy(false);
  }
}

function endLateOrderMode() {
  state.lateOrder.active = false;
  state.lateOrder.password = '';
  updateCutoffUi();
  showToast(t('lateOrderEnded'));
}

function ensureDrinkChangeUi() {
  if (el.drinkChangeModal) return;
  const modal = document.createElement('div');
  modal.id = 'drinkChangeModal';
  modal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/45 px-4';
  modal.innerHTML = `
    <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
      <h3 id="drinkChangeModalTitle" class="text-lg font-bold text-pbnavy"></h3>
      <p id="drinkChangeModalHint" class="mt-1 text-sm text-slate-500"></p>
      <div class="mt-4 grid gap-3 md:grid-cols-[220px_220px_auto]">
        <label class="grid gap-2 text-sm text-slate-600">
          <span id="drinkChangeUserLabel" class="font-semibold text-pbnavy"></span>
          <select id="drinkChangeUserSelect" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-pbnavy focus:ring-2 focus:ring-pbnavy/20"></select>
        </label>
        <label class="grid gap-2 text-sm text-slate-600">
          <span id="drinkChangePasswordLabel" class="font-semibold text-pbnavy"></span>
          <input id="drinkChangePasswordInput" type="password" class="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-pbnavy focus:ring-2 focus:ring-pbnavy/20" />
        </label>
        <button id="drinkChangeLoadBtn" type="button" class="self-end rounded-md bg-pborange px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pborangestrong"></button>
      </div>
      <div id="drinkChangeList" class="mt-4 overflow-x-auto rounded-lg border border-slate-200"></div>
      <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button id="drinkChangeCancelBtn" type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"></button>
        <button id="drinkChangeSaveBtn" type="button" class="hidden rounded-md bg-pborange px-4 py-2 text-sm font-semibold text-white transition hover:bg-pborangestrong"></button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  el.drinkChangeModal = modal;
  el.drinkChangeModalTitle = document.getElementById('drinkChangeModalTitle');
  el.drinkChangeModalHint = document.getElementById('drinkChangeModalHint');
  el.drinkChangeUserLabel = document.getElementById('drinkChangeUserLabel');
  el.drinkChangePasswordLabel = document.getElementById('drinkChangePasswordLabel');
  el.drinkChangeUserSelect = document.getElementById('drinkChangeUserSelect');
  el.drinkChangePasswordInput = document.getElementById('drinkChangePasswordInput');
  el.drinkChangeLoadBtn = document.getElementById('drinkChangeLoadBtn');
  el.drinkChangeList = document.getElementById('drinkChangeList');
  el.drinkChangeCancelBtn = document.getElementById('drinkChangeCancelBtn');
  el.drinkChangeSaveBtn = document.getElementById('drinkChangeSaveBtn');
  el.drinkChangeCancelBtn.addEventListener('click', closeDrinkChangeModal);
  el.drinkChangeModal.addEventListener('click', event => {
    if (event.target === el.drinkChangeModal) closeDrinkChangeModal();
  });
  el.drinkChangeLoadBtn.addEventListener('click', authorizeDrinkChange);
  el.drinkChangeSaveBtn.addEventListener('click', saveDrinkChanges);
  el.drinkChangePasswordInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') authorizeDrinkChange();
  });
}

function updateDrinkChangeText() {
  ensureDrinkChangeUi();
  el.drinkChangeModalTitle.textContent = t('drinkChangeTitle');
  el.drinkChangeModalHint.textContent = t('drinkChangeHint');
  el.drinkChangeUserLabel.textContent = t('lateOrderUser');
  el.drinkChangePasswordLabel.textContent = t('lateOrderPassword');
  el.drinkChangeLoadBtn.textContent = t('drinkChangeLogin');
  el.drinkChangeCancelBtn.textContent = t('lateOrderCancel');
  el.drinkChangeSaveBtn.textContent = t('drinkChangeSave');
}

function fillDrinkChangeUsers() {
  const users = Array.isArray(state.drinkChange.users) ? state.drinkChange.users : [];
  fillSelect(el.drinkChangeUserSelect, users.map(user => ({ value: user.username, label: user.username })), t('lateOrderUser'));
}

async function openDrinkChangeModal() {
  ensureDrinkChangeUi();
  updateDrinkChangeText();
  el.drinkChangeList.innerHTML = '';
  el.drinkChangeSaveBtn.classList.add('hidden');
  try {
    setBusy(true);
    const payload = await api('/api/late-order/users');
    state.drinkChange.users = Array.isArray(payload.users) ? payload.users : [];
    if (!state.drinkChange.users.length) {
      showToast(t('lateOrderNoUsers'), 3000);
      return;
    }
    fillDrinkChangeUsers();
    if (el.drinkChangePasswordInput) el.drinkChangePasswordInput.value = '';
    el.drinkChangeModal.classList.remove('hidden');
    el.drinkChangeModal.classList.add('flex');
    setTimeout(() => el.drinkChangePasswordInput?.focus(), 0);
  } catch (err) {
    showToast(err.message, 3000);
  } finally {
    setBusy(false);
  }
}

function closeDrinkChangeModal() {
  if (!el.drinkChangeModal) return;
  el.drinkChangeModal.classList.add('hidden');
  el.drinkChangeModal.classList.remove('flex');
  if (el.drinkChangePasswordInput) el.drinkChangePasswordInput.value = '';
}

function renderDrinkChangeRows() {
  const orders = Array.isArray(state.orders) ? state.orders : [];
  if (!orders.length) {
    el.drinkChangeList.innerHTML = `<p class="px-3 py-4 text-sm text-slate-500">${t('drinkChangeNoOrders')}</p>`;
    el.drinkChangeSaveBtn.classList.add('hidden');
    return;
  }
  const drinkOptions = (state.drinks || [])
    .map(normalizeDrink)
    .filter(drink => drink.tc && !drink.paused)
    .map(drink => ({ value: drink.tc, label: getLocalizedDrink(drink) }));
  const rows = orders.map((order, index) => {
    const currentDrink = parseDrinkChange(order.drink).current;
    const optionsHtml = [`<option value="">${t('selectDrink')}</option>`].concat(drinkOptions.map(drink => {
      const selected = drink.value === currentDrink ? ' selected' : '';
      return `<option value="${escapeHtml(drink.value)}"${selected}>${escapeHtml(drink.label)}</option>`;
    })).join('');
    return `<tr>
      <td class="border-b border-slate-200 px-3 py-2">${index + 1}</td>
      <td class="border-b border-slate-200 px-3 py-2">${escapeHtml(order.dept)}</td>
      <td class="border-b border-slate-200 px-3 py-2">${escapeHtml(order.name)}</td>
      <td class="border-b border-slate-200 px-3 py-2">${escapeHtml(displayDrink(order.drink))}</td>
      <td class="border-b border-slate-200 px-3 py-2">
        <select class="drink-change-select w-full min-w-40 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" data-dept="${escapeHtml(order.dept)}" data-name="${escapeHtml(order.name)}" data-current="${escapeHtml(currentDrink)}">${optionsHtml}</select>
      </td>
    </tr>`;
  }).join('');
  el.drinkChangeList.innerHTML = `<table class="min-w-full border-collapse text-sm">
    <thead><tr class="bg-slate-50 text-left text-pbnavy">
      <th class="border-b border-slate-200 px-3 py-2">#</th>
      <th class="border-b border-slate-200 px-3 py-2">${t('dept')}</th>
      <th class="border-b border-slate-200 px-3 py-2">${t('name')}</th>
      <th class="border-b border-slate-200 px-3 py-2">${t('drink')}</th>
      <th class="border-b border-slate-200 px-3 py-2">${t('newDrink')}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
  el.drinkChangeSaveBtn.classList.remove('hidden');
}

async function authorizeDrinkChange() {
  const username = String(el.drinkChangeUserSelect?.value || '').trim();
  const password = String(el.drinkChangePasswordInput?.value || '').trim();
  if (!username) return showToast(t('lateOrderNoUsers'), 3000);
  if (!password) return showToast(t('lateOrderPasswordRequired'));
  try {
    setBusy(true);
    await api('/api/late-order/authorize', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    await refreshOrdersSilently();
    renderDrinkChangeRows();
  } catch (err) {
    showToast(err.message, 3000);
  } finally {
    setBusy(false);
  }
}

async function saveDrinkChanges() {
  const username = String(el.drinkChangeUserSelect?.value || '').trim();
  const password = String(el.drinkChangePasswordInput?.value || '').trim();
  const changes = Array.from(el.drinkChangeList.querySelectorAll('.drink-change-select'))
    .map(select => ({
      dept: select.dataset.dept,
      name: select.dataset.name,
      current: select.dataset.current,
      drink: select.value
    }))
    .filter(change => change.drink && change.drink !== change.current);
  if (!changes.length) return showToast(t('drinkChangeNoChanges'), 2500);
  try {
    setBusy(true);
    let latestOrders = null;
    for (const change of changes) {
      const payload = await api('/api/orders/drink-change', {
        method: 'POST',
        body: JSON.stringify({ username, password, dept: change.dept, name: change.name, drink: change.drink })
      });
      if (Array.isArray(payload.orders)) latestOrders = payload.orders;
    }
    if (latestOrders) state.orders = latestOrders;
    renderOrders();
    renderDrinkChangeRows();
    showToast(t('drinkChangeSaved'));
  } catch (err) {
    showToast(err.message, 3000);
  } finally {
    setBusy(false);
  }
}

function renderRestaurants() {
  fillSelect(el.restaurantSelect, (state.restaurants || []).map(r => ({ value: r, label: r })), t('selectRestaurant'));
  if (state.currentRestaurant) el.restaurantSelect.value = state.currentRestaurant;
  if (el.cutoffTimeInput) el.cutoffTimeInput.value = state.cutoffTime || state.defaultCutoffTime;
  el.currentRestaurantText.textContent = `${t('currentRestaurant')}${state.currentRestaurant || t('notSet')}`;
  renderCurrentRestaurantContact();
  el.cutoffTimeText.textContent = state.cutoffTime ? `${t('cutoffAt')}${state.cutoffTime}` : t('cutoffNotSet');
  syncRestaurantLock();
  updateCutoffUi();
  updateDiagSummary();
}

function renderCurrentRestaurantContact() {
  if (!el.currentRestaurantContactText) return;
  const contactMap = state.restaurantContacts && typeof state.restaurantContacts === 'object' ? state.restaurantContacts : {};
  const contact = state.currentRestaurant ? contactMap[state.currentRestaurant] : null;
  const parts = [];
  if (contact && contact.phone) parts.push(contact.phone);
  if (contact && contact.email) parts.push(contact.email);
  if (contact && contact.note) parts.push(contact.note);
  if (!parts.length) {
    el.currentRestaurantContactText.classList.add('hidden');
    el.currentRestaurantContactText.textContent = '';
    return;
  }
  el.currentRestaurantContactText.textContent = `${t('restaurantContact')}${parts.join(' / ')}`;
  el.currentRestaurantContactText.classList.remove('hidden');
}

function renderDepartments() {
  const departments = Object.keys(state.staff || {});
  fillSelect(el.deptSelect, departments.map(d => ({ value: d, label: d })), t('selectDept'));
  const singleDepartment = departments.length === 1 ? departments[0] : '';
  el.deptSelect.disabled = Boolean(singleDepartment);
  if (singleDepartment) el.deptSelect.value = singleDepartment;
  fillSelect(el.nameSelect, [], t('chooseDeptFirst'));
  if (singleDepartment) {
    fillSelect(el.nameSelect, (state.staff[singleDepartment] || []).map(name => ({ value: name, label: name })), t('selectName'));
  }
}

function renderDrinks() {
  fillSelect(el.drinkSelect, (state.drinks || []).map(raw => {
    const d = normalizeDrink(raw);
    if (d.paused) return null;
    return { value: d.tc, label: getLocalizedDrink(d) };
  }).filter(Boolean), t('selectDrink'));
}

function renderCategories() {
  const categories = Object.keys(state.menu || {});
  fillSelect(el.categorySelect, categories.map(c => ({ value: c, label: c })), t('selectCat'));
  if (categories.length) el.categorySelect.value = categories[0];
  fillSelect(el.foodSelect, [], t('chooseCatFirst'));
  el.priceInput.value = '';
  if (categories.length) renderFood();
}

function renderFood() {
  const cat = el.categorySelect.value;
  const items = (state.menu && state.menu[cat]) ? state.menu[cat] : [];
  fillSelect(el.foodSelect, items.map(raw => {
    const f = normalizeMenuItem(raw);
    if (f.paused) return null;
    return { value: f.nameTc, label: `${getLocalizedFood(f)} ($${f.price})`, price: f.price, optionGroups: f.optionGroups };
  }).filter(Boolean), t('selectFood'));
  el.priceInput.value = '';
  renderOptionGroupsFromSelection();
}

function displayFood(foodKey) {
  let text = String(foodKey || '').trim();
  if (!text) return '';
  const keys = Object.keys(state.foodLookup || {}).filter(Boolean).sort((a, b) => b.length - a.length);
  keys.forEach(key => {
    const f = state.foodLookup[key];
    const target = f ? getLocalizedFood(f) : '';
    if (target && target !== key) text = replaceFoodToken(text, key, target);
  });
  return translateInlineFoodText(text);
}

function replaceFoodToken(text, key, target) {
  let out = '';
  let cursor = 0;
  let index = text.indexOf(key, cursor);
  while (index !== -1) {
    const before = index > 0 ? text[index - 1] : '';
    const after = text[index + key.length] || '';
    const touchesCjk = /[\u3400-\u9fff]/.test(before) || /[\u3400-\u9fff]/.test(after);
    if (!touchesCjk) {
      out += text.slice(cursor, index) + target;
      cursor = index + key.length;
    }
    index = text.indexOf(key, index + key.length);
  }
  return out + text.slice(cursor);
}

function simplifyChoiceName(name) {
  let value = String(name || '').trim();
  value = value.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();
  value = value.replace(/湯?麵$|湯?面$|飯$|河$|米$|米粉$|米綫$|撈麵$|撈面$/g, '').trim();
  value = value.replace(/^各式/, '').trim();
  return value;
}

function translateInlineFoodText(text) {
  let out = String(text || '');
  if (state.lang === 'sc') return toSc(out);
  if (state.lang !== 'en') return out;
  const replacements = {
    '（': ' (',
    '）': ')',
    '，': ', ',
    '少鹽': 'less salt',
    '少盐': 'less salt',
    '走蔥': 'no spring onion',
    '走葱': 'no spring onion',
    '加飯': 'extra rice',
    '加饭': 'extra rice',
    '白飯': 'rice',
    '白饭': 'rice',
    '飯': 'rice',
    '饭': 'rice',
    '加辣': 'spicy',
    '小辣': 'mild spicy',
    '少辣': 'less spicy',
    '中辣': 'medium spicy',
    '大辣': 'extra spicy',
    '走辣': 'no spicy'
  };
  Object.keys(replacements).sort((a, b) => b.length - a.length).forEach(key => {
    out = out.split(key).join(replacements[key]);
  });
  return out.replace(/\s{2,}/g, ' ').trim();
}

function parseDrinkChange(drinkKey) {
  const parts = String(drinkKey || '').split(' → ').map(part => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { original: parts[0], current: parts[parts.length - 1], changed: true };
  const current = parts[0] || String(drinkKey || '').trim();
  return { original: current, current, changed: false };
}

function displayDrink(drinkKey) {
  if (!drinkKey) return t('noDrink');
  const change = parseDrinkChange(drinkKey);
  if (change.changed) return `${displayDrink(change.original)} → ${displayDrink(change.current)}`;
  const d = state.drinkLookup[drinkKey];
  return d ? getLocalizedDrink(d) : drinkKey;
}

function displayDrinkHtml(drinkKey) {
  if (!drinkKey) return escapeHtml(t('noDrink'));
  const change = parseDrinkChange(drinkKey);
  if (!change.changed) return escapeHtml(displayDrink(drinkKey));
  return `<span class="text-slate-500">${escapeHtml(displayDrink(change.original))}</span> <span class="text-slate-400">→</span> <span class="font-semibold text-pborange">${escapeHtml(displayDrink(change.current))}</span>`;
}

function displayAddon(addonText) {
  const raw = String(addonText || '').trim();
  if (!raw) return '';
  const hasCjk = /[\u3400-\u9fff]/.test(raw);
  if (!hasCjk) return raw;
  let out = '';
  for (const ch of raw) {
    if (/[\u3400-\u9fff]/.test(ch)) out += ch;
    else if (/[0-9]/.test(ch)) out += ch;
    else if (/[+,;\\/、]/.test(ch)) out += ch;
    else if (/\s/.test(ch)) out += ' ';
  }
  out = out.replace(/\s+/g, ' ').replace(/\s*([+,;\\/、])\s*/g, '$1').trim();
  return out || raw;
}

function stripAddonPriceText(addonText) {
  const text = String(addonText || '').trim();
  if (!text) return '';
  return text
    .replace(/\(\s*\+\s*\$?\s*\d+(?:\.\d+)?\s*\)/g, '')
    .replace(/\+\s*\$?\s*\d+(?:\.\d+)?/g, '')
    .replace(/\s*([,;\/、])\s*/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,;\/、\s]+|[,;\/、\s]+$/g, '')
    .trim();
}

function describeOrderForChange(order) {
  if (!order) return '';
  const parts = [displayFood(order.food)];
  const addon = displayAddon(order.addon || '');
  if (addon) parts.push(addon);
  if (order.drink) parts.push(displayDrink(order.drink));
  return parts.join(' / ');
}

function sameOrderContent(a, b) {
  if (!a || !b) return false;
  return String(a.food || '') === String(b.food || '')
    && String(a.addon || '') === String(b.addon || '')
    && String(a.drink || '') === String(b.drink || '')
    && Number(a.price || 0) === Number(b.price || 0);
}

function buildOrderChangeMessage(existingOrder, nextOrder) {
  const name = escapeHtml(nextOrder.name || existingOrder.name || '');
  const fromText = escapeHtml(describeOrderForChange(existingOrder));
  const toText = escapeHtml(describeOrderForChange(nextOrder));
  if (state.lang === 'en') return `${name} will change from <strong>${fromText}</strong> to <strong>${toText}</strong>.`;
  if (state.lang === 'sc') return `${name} 将由现在 <strong>${fromText}</strong> 改为 <strong>${toText}</strong>。`;
  return `${name} 由現在 <strong>${fromText}</strong> 轉到 <strong>${toText}</strong>。`;
}

function confirmOrderChange(existingOrder, nextOrder) {
  return new Promise(resolve => {
    if (!el.orderChangeModal || !el.confirmOrderChangeBtn || !el.cancelOrderChangeBtn) {
      resolve(window.confirm(buildOrderChangeMessage(existingOrder, nextOrder).replace(/<[^>]+>/g, '')));
      return;
    }

    const cleanup = () => {
      el.confirmOrderChangeBtn.removeEventListener('click', handleConfirm);
      el.cancelOrderChangeBtn.removeEventListener('click', handleCancel);
    };
    const finish = decision => {
      cleanup();
      closeOrderChangeModal();
      resolve(decision);
    };
    const handleConfirm = () => finish(true);
    const handleCancel = () => finish(false);

    openOrderChangeModal(buildOrderChangeMessage(existingOrder, nextOrder));
    el.confirmOrderChangeBtn.addEventListener('click', handleConfirm);
    el.cancelOrderChangeBtn.addEventListener('click', handleCancel);
  });
}

function renderOptionGroups(foodKey, optionGroupsRaw) {
  if (!el.optionGroupsWrap || !el.optionGroupsList) return;
  el.optionGroupsList.innerHTML = '';
  let groups = [];
  if (optionGroupsRaw) {
    try {
      const parsed = JSON.parse(optionGroupsRaw);
      if (Array.isArray(parsed)) groups = parsed;
    } catch {
      groups = [];
    }
  } else {
    const item = state.foodLookup[foodKey];
    groups = item && Array.isArray(item.optionGroups) ? item.optionGroups : [];
  }
  if (!groups.length) {
    el.optionGroupsWrap.classList.add('hidden');
    updatePriceWithOptions();
    return;
  }

  el.optionGroupsWrap.classList.remove('hidden');
  groups.forEach((group, gIndex) => {
    const label = group.label || t('optionsTitle');
    const normalizedChoices = (group.choices || []).map(normalizeOptionChoice).filter(Boolean);
    const max = Number.isFinite(group.max) ? group.max : normalizedChoices.length;
    const min = Number.isFinite(group.min) ? group.min : (max === 1 ? 1 : 0);
    const isSingle = max === 1 && min <= 1;
    const wrap = document.createElement('div');
    wrap.className = 'rounded-md border border-slate-200 bg-white p-2';

    const header = document.createElement('div');
    header.className = 'mb-1 text-sm font-semibold text-slate-700';
    header.textContent = `${label} (${t('optionsHint')}${min}${max === min ? '' : `-${max}`})`;
    wrap.appendChild(header);

    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'grid gap-1 sm:grid-cols-2';
    normalizedChoices.forEach((choice, cIndex) => {
      const choiceLabel = choice.label;
      const choicePrice = Number.isFinite(choice.price) ? choice.price : 0;
      const optLabel = document.createElement('label');
      optLabel.className = 'flex items-center gap-2 text-sm text-slate-700';
      const input = document.createElement('input');
      input.type = isSingle ? 'radio' : 'checkbox';
      input.name = `opt-${gIndex}`;
      input.value = String(choiceLabel);
      input.dataset.choiceLabel = String(choiceLabel);
      input.dataset.choicePrice = String(choicePrice);
      input.dataset.groupIndex = String(gIndex);
      input.dataset.groupMin = String(min);
      input.dataset.groupMax = String(max);
      input.className = 'h-4 w-4 accent-pbnavy';
      optLabel.appendChild(input);
      const span = document.createElement('span');
      span.textContent = formatOptionLabel(choiceLabel, choicePrice);
      optLabel.appendChild(span);
      optionsWrap.appendChild(optLabel);
    });
    wrap.appendChild(optionsWrap);
    el.optionGroupsList.appendChild(wrap);
  });
  el.optionGroupsList.onchange = updatePriceWithOptions;
  updatePriceWithOptions();
}

function renderOptionGroupsFromSelection() {
  const opt = el.foodSelect.options[el.foodSelect.selectedIndex];
  const raw = opt && opt.dataset ? opt.dataset.optionGroups : '';
  renderOptionGroups(el.foodSelect.value, raw);
}

function collectOptionSelections() {
  if (!el.optionGroupsWrap || el.optionGroupsWrap.classList.contains('hidden')) {
    return { ok: true, text: '', extraPrice: 0 };
  }
  const groups = Array.from(el.optionGroupsList.children || []);
  const selections = [];
  let extraPrice = 0;
  let anyError = false;
  const normalizeChoiceLabel = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const matches = raw.match(/[\u3400-\u9fff]+/g);
    if (matches && matches.length) return matches.join('');
    return raw;
  };
  for (const groupEl of groups) {
    const inputs = Array.from(groupEl.querySelectorAll('input'));
    if (!inputs.length) continue;
    const min = Number(inputs[0].dataset.groupMin || 0);
    const max = Number(inputs[0].dataset.groupMax || inputs.length);
    const chosen = inputs.filter(i => i.checked).map(i => {
      const label = normalizeChoiceLabel(i.dataset.choiceLabel || i.value);
      const price = Number(i.dataset.choicePrice || 0);
      if (Number.isFinite(price) && price > 0) {
        extraPrice += price;
        return formatOptionLabel(label, price);
      }
      return label;
    }).filter(Boolean);
    if (chosen.length < min) anyError = true;
    if (chosen.length > max) return { ok: false, text: '', error: t('optionTooMany') };
    if (chosen.length) selections.push(chosen.join('+'));
  }
  if (anyError) return { ok: false, text: '', error: t('optionRequired') };
  return { ok: true, text: selections.join(', '), extraPrice };
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
  if (refreshOrdersSilently.inFlight) return;
  refreshOrdersSilently.inFlight = true;
  try {
    const payload = await api(`/api/orders?_=${Date.now()}`);
    const nextRestaurant = payload.currentRestaurant || null;
    const nextCutoffTime = payload.cutoffTime || state.defaultCutoffTime;
    const nextCutoffPassed = Boolean(payload.cutoffPassed);
    const restaurantChanged = nextRestaurant !== state.currentRestaurant;
    const cutoffChanged = nextCutoffTime !== state.cutoffTime || nextCutoffPassed !== state.cutoffPassed;
    if (restaurantChanged || cutoffChanged) {
      state.currentRestaurant = nextRestaurant;
      state.cutoffTime = nextCutoffTime;
      state.cutoffPassed = nextCutoffPassed;
      renderRestaurants();
      if (restaurantChanged) await loadMenu(state.currentRestaurant);
    }
    const incoming = payload.orders || [];
    const sig = orderSignature(incoming);
    if (sig !== state.lastOrdersSignature) {
      state.orders = incoming;
      state.lastOrdersSignature = sig;
      renderOrders();
    }
  } catch {
  } finally {
    refreshOrdersSilently.inFlight = false;
  }
}

function startAutoRefresh() {
  if (startAutoRefresh.tid) clearInterval(startAutoRefresh.tid);
  startAutoRefresh.tid = setInterval(() => {
    if (document.hidden) return;
    refreshOrdersSilently();
  }, 5000);
}

async function requestPrivateAccess() {
  window.location.href = '/lady-ruby/';
}

function requestAdminAccess() {
  window.location.href = '/admin/';
}

function bindHiddenTrigger(node, action, options = {}) {
  if (!node) return;
  const allowHold = options.allowHold !== false;
  let tapCount = 0;
  let resetTimer = null;
  let holdTimer = null;
  let holdTriggered = false;

  node.style.touchAction = 'manipulation';

  const handleTap = event => {
    if (event) event.preventDefault();
    if (holdTriggered) {
      holdTriggered = false;
      return;
    }
    tapCount += 1;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => { tapCount = 0; }, 1200);
    if (tapCount < 4) return;
    tapCount = 0;
    action();
  };

  const startHold = () => {
    if (!allowHold) return;
    clearTimeout(holdTimer);
    holdTriggered = false;
    holdTimer = setTimeout(() => {
      tapCount = 0;
      holdTriggered = true;
      action();
    }, 900);
  };

  const clearHold = () => {
    clearTimeout(holdTimer);
  };

  node.addEventListener('pointerup', handleTap);
  node.addEventListener('pointerdown', startHold);
  node.addEventListener('pointerleave', clearHold);
  node.addEventListener('pointercancel', clearHold);
  node.addEventListener('pointerup', clearHold);
}

function setupSecretEntry() {
  if (state.appId !== 'main' || !el.appTitle) return;
  bindHiddenTrigger(el.appTitle, requestPrivateAccess);
}

function setupAdminEntry() {
  if (!el.restaurantSectionTitle) return;
  bindHiddenTrigger(el.restaurantSectionTitle, requestAdminAccess);
}

function setupLateOrderEntry() {
  if (!el.orderSectionTitle) return;
  bindHiddenTrigger(el.orderSectionTitle, openLateOrderModal, { allowHold: false });
}

function setupDrinkChangeEntry() {
  if (!el.ordersSectionTitle) return;
  bindHiddenTrigger(el.ordersSectionTitle, openDrinkChangeModal, { allowHold: false });
}

function buildFoodSummaryLabel(order) {
  const food = String(displayFood(order.food) || '').trim();
  const addon = stripAddonPriceText(displayAddon(order.addon || ''));
  if (!food) return '';
  return addon ? `${food}（${addon}）` : food;
}

function parseOrderFoodItems(order) {
  const addon = stripAddonPriceText(displayAddon(order.addon || ''));
  const text = String(displayFood(order.food || '')).trim();
  if (!text) return [];
  return text.split(/\s+\+\s+/).map(part => {
    const value = part.trim();
    if (!value) return null;
    const match = value.match(/\s+x\s*(\d+)\s*$/i);
    const qty = match ? Math.max(1, Number(match[1]) || 1) : 1;
    const food = match ? value.slice(0, match.index).trim() : value;
    if (!food) return null;
    const label = addon ? `${food}（${addon}）` : food;
    return { label, qty };
  }).filter(Boolean);
}

function formatFoodSummaryLine(food, entry) {
  const numbers = Array.isArray(entry && entry.numbers) ? entry.numbers.filter(Boolean) : [];
  const count = Number(entry && entry.count) || 0;
  const numberPrefix = numbers.length ? `(${numbers.join(',')}) - ` : '';
  return `- ${numberPrefix}${escapeHtml(food)} ${t('xLabel')} ${count}`;
}

function renderOrders() {
  const orders = [...(state.orders || [])];
  let total = 0;
  if (!orders.length) {
    el.ordersBody.innerHTML = `<tr><td colspan="7">${t('noOrders')}</td></tr>`;
    el.totalPrice.textContent = '0.00';
    el.drinkSummary.textContent = '';
    if (el.foodSummary) el.foodSummary.textContent = '';
    if (el.foodSummaryByDept) el.foodSummaryByDept.textContent = '';
    updateDiagSummary();
    return;
  }

  el.ordersBody.innerHTML = orders.map((o, i) => {
    const p = Number(o.price || 0);
    total += p;
    const addon = stripAddonPriceText(displayAddon(o.addon || ''));
    return `<tr><td>${i + 1}</td><td>${o.dept}</td><td>${o.name}</td><td>${displayFood(o.food)}</td><td>${addon}</td><td>${displayDrinkHtml(o.drink)}</td><td>${p.toFixed(2)}</td></tr>`;
  }).join('');
  el.totalPrice.textContent = total.toFixed(2);

  const byDeptDrink = {};
  const foodCounts = {};
  const byDeptFood = {};
  orders.forEach((o, index) => {
    const orderNumber = index + 1;
    const drinkKey = parseDrinkChange(o.drink).current;
    const dept = String(o.dept || '').trim() || '-';
    if (drinkKey) {
      if (!byDeptDrink[dept]) byDeptDrink[dept] = {};
      byDeptDrink[dept][drinkKey] = (byDeptDrink[dept][drinkKey] || 0) + 1;
    }

    parseOrderFoodItems(o).forEach(({ label, qty }) => {
      const foodKey = label || buildFoodSummaryLabel(o);
      if (!foodKey) return;
      if (!foodCounts[foodKey]) foodCounts[foodKey] = { count: 0, numbers: [] };
      foodCounts[foodKey].count += qty;
      if (!foodCounts[foodKey].numbers.includes(orderNumber)) foodCounts[foodKey].numbers.push(orderNumber);
      if (!byDeptFood[dept]) byDeptFood[dept] = {};
      if (!byDeptFood[dept][foodKey]) byDeptFood[dept][foodKey] = { count: 0, numbers: [] };
      byDeptFood[dept][foodKey].count += qty;
      if (!byDeptFood[dept][foodKey].numbers.includes(orderNumber)) byDeptFood[dept][foodKey].numbers.push(orderNumber);
    });
  });

  const summaryHtml = Object.entries(byDeptDrink)
  .map(([dept, drinkMap]) => {
    const deptTotal = Object.values(drinkMap).reduce((sum, count) => sum + Number(count || 0), 0);
    const drinksList = Object.entries(drinkMap)
      .map(([k, c]) => `- ${displayDrink(k)} ${t('xLabel')} ${c}`)
      .join('<br>');
    return `<div><strong>${dept}:</strong> <span class="ml-2 font-semibold text-slate-700">Total: <span class="text-pborange">${deptTotal}</span></span><br>${drinksList}</div>`;
  })
  .join('<br>');

  el.drinkSummary.innerHTML = summaryHtml;
  if (el.foodSummary) {
    const foodHtml = Object.entries(foodCounts)
      .sort((a, b) => {
        if (b[1].count !== a[1].count) return b[1].count - a[1].count;
        return a[0].localeCompare(b[0], 'zh-Hant');
      })
      .map(([food, entry]) => formatFoodSummaryLine(food, entry))
      .join('<br>');
    el.foodSummary.innerHTML = foodHtml;
  }
  if (el.foodSummaryByDept) {
    const foodByDeptHtml = Object.entries(byDeptFood)
      .map(([dept, foodMap]) => {
        const deptTotal = Object.values(foodMap).reduce((sum, entry) => sum + (Number(entry && entry.count) || 0), 0);
        const foodsList = Object.entries(foodMap)
          .sort((a, b) => {
            if (b[1].count !== a[1].count) return b[1].count - a[1].count;
            return a[0].localeCompare(b[0], 'zh-Hant');
          })
          .map(([food, entry]) => formatFoodSummaryLine(food, entry))
          .join('<br>');
        return `<div><strong>${dept}:</strong> <span class="ml-2 font-semibold text-slate-700">Total: <span class="text-pborange">${deptTotal}</span></span><br>${foodsList}</div>`;
      })
      .join('<br>');
    el.foodSummaryByDept.innerHTML = foodByDeptHtml;
  }
  updateDiagSummary();
}

function updateCutoffUi() {
  if (!el.cutoffNotice || !el.orderForm) return;
  ensureLateOrderUi();
  if (!state.cutoffTime) {
    state.lateOrder.active = false;
    state.lateOrder.password = '';
    el.lateOrderPanel.classList.add('hidden');
    el.cutoffNotice.classList.add('hidden');
    el.cutoffNotice.textContent = '';
    if (!state.cutoffPassed) hideOrderError();
    Array.from(el.orderForm.elements).forEach(node => { node.disabled = false; });
    return;
  }

  el.cutoffNotice.textContent = state.cutoffPassed
    ? `${t('cutoffAt')}${state.cutoffTime}. ${t('cutoffPassedNotice')}`
    : `${t('cutoffAt')}${state.cutoffTime}. ${t('cutoffActiveNotice')}`;
  el.cutoffNotice.classList.remove('hidden');

  if (!state.cutoffPassed) {
    state.lateOrder.active = false;
    state.lateOrder.password = '';
  }
  el.lateOrderPanel.classList.add('hidden');
  el.lateOrderStartBtn.classList.add('hidden');
  el.lateOrderStopBtn.classList.add('hidden');
  updateLateOrderText();

  Array.from(el.orderForm.elements).forEach(node => {
    node.disabled = Boolean(state.cutoffPassed && !state.lateOrder.active);
  });
  if (state.cutoffPassed && !state.lateOrder.active) {
    showOrderError(t('orderBlockedNotice'));
  } else {
    hideOrderError();
  }
}

async function loadMenu(restaurant, initialMenu) {
  if (!restaurant) {
    state.menu = {};
    buildLookupMaps();
    renderCategories();
    return;
  }
  if (initialMenu && typeof initialMenu === 'object') {
    state.menu = initialMenu;
    buildLookupMaps();
    renderCategories();
    return;
  }
  state.menu = {};
  buildLookupMaps();
  renderCategories();
  const payload = await api(`/api/menu?restaurant=${encodeURIComponent(restaurant)}`);
  state.menu = payload.menu || {};
  buildLookupMaps();
  renderCategories();
}

async function loadBootstrap() {
  setBusy(true);
  setDiag(t('diagLoading'));
  try {
    const [payload, settings] = await Promise.all([
      api('/api/bootstrap'),
      api('/api/new-settings')
    ]);
    state.restaurants = payload.restaurants || [];
    state.restaurantContacts = payload.restaurantContacts || {};
    state.staff = payload.staff || {};
    state.drinks = payload.drinks || [];
    state.currentRestaurant = payload.currentRestaurant || null;
    state.cutoffTime = payload.cutoffTime || state.defaultCutoffTime;
    state.cutoffPassed = Boolean(payload.cutoffPassed);
    state.orders = payload.orders || [];
    state.lastOrdersSignature = orderSignature(state.orders);
    state.date = payload.date || '';

    el.dateText.textContent = `${t('datePrefix')}${payload.date}`;
    renderRestaurants();
    renderDepartments();
    renderDrinks();
    await loadMenu(state.currentRestaurant, payload.currentMenu || null);
    renderOrders();
    updateDiagSummary();
    showAnnouncementIfNeeded(settings);
  } catch (err) {
    setDiag(`${t('loadFailedPrefix')}${err.message}`, true);
    throw err;
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
      const price = parseImportedPrice(rawPrice);
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

function formatMoney(value) {
  if (!Number.isFinite(value)) return '';
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, '');
}

function normalizeOptionChoice(choice) {
  if (typeof choice === 'string' || typeof choice === 'number') {
    const labelRaw = String(choice).trim();
    if (!labelRaw) return null;
    const parsed = parseChoiceLabel(labelRaw);
    return parsed ? parsed : { label: labelRaw, price: 0 };
  }
  if (!choice || typeof choice !== 'object') return null;
  const label = String(choice.label || choice.name || choice.value || choice.text || '').trim();
  if (!label) return null;
  const priceRaw = choice.price ?? choice.add ?? choice.extra;
  const price = Number(priceRaw);
  return { label, price: Number.isFinite(price) ? price : 0 };
}

function parseChoiceLabel(labelRaw) {
  const raw = String(labelRaw || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(.*?)(?:\s*\(\s*(?:\+|加)?\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*\)\s*|\s*(?:\+|加)\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*)$/);
  if (!match) return null;
  const label = String(match[1] || '').trim();
  const price = Number(match[2] || match[3]);
  if (!label || !Number.isFinite(price) || price <= 0) return null;
  return { label, price };
}

function formatOptionLabel(label, price) {
  if (Number.isFinite(price) && price > 0) return `${label} (+$${formatMoney(price)})`;
  return label;
}

function computeOptionExtraPrice() {
  if (!el.optionGroupsWrap || el.optionGroupsWrap.classList.contains('hidden')) return 0;
  const inputs = Array.from(el.optionGroupsList.querySelectorAll('input'));
  return inputs.reduce((sum, input) => {
    if (!input.checked) return sum;
    const extra = Number(input.dataset.choicePrice || 0);
    return sum + (Number.isFinite(extra) ? extra : 0);
  }, 0);
}

function updatePriceWithOptions() {
  if (!el.priceInput) return;
  const baseRaw = el.priceInput.dataset.basePrice;
  const base = parsePriceInput(baseRaw || el.priceInput.value);
  if (!Number.isFinite(base)) {
    el.priceInput.value = '';
    return;
  }
  const extra = computeOptionExtraPrice();
  const total = base + extra;
  el.priceInput.value = total.toFixed(2);
}

function resetOrderForm() {
  const departments = Object.keys(state.staff || {});
  const singleDepartment = departments.length === 1 ? departments[0] : '';
  el.deptSelect.disabled = Boolean(singleDepartment);
  el.deptSelect.value = singleDepartment || '';
  if (singleDepartment) {
    fillSelect(el.nameSelect, (state.staff[singleDepartment] || []).map(n => ({ value: n, label: n })), t('selectName'));
  } else {
    fillSelect(el.nameSelect, [], t('chooseDeptFirst'));
  }
  el.categorySelect.value = '';
  fillSelect(el.foodSelect, [], t('chooseCatFirst'));
  el.priceInput.value = '';
  el.priceInput.dataset.basePrice = '';
  el.drinkSelect.value = '';
  el.addonInput.value = '';
  renderOptionGroups('');
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
    stripAddonPriceText(displayAddon(o.addon || '')),
    displayDrink(o.drink || ''),
    Number(o.price || 0)
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!autofilter'] = { ref: `A1:G${Math.max(1, rows.length + 1)}` };
  ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  const datePart = state.date || new Date().toISOString().slice(0, 10);
  const suffix = state.appId === 'lady-ruby' ? '-lady-ruby' : '';
  XLSX.writeFile(wb, `orders-${datePart}${suffix}.xlsx`);
}

el.deptSelect.addEventListener('change', () => {
  const dept = el.deptSelect.value;
  fillSelect(el.nameSelect, (state.staff[dept] || []).map(n => ({ value: n, label: n })), t('selectName'));
});

el.categorySelect.addEventListener('change', renderFood);
el.foodSelect.addEventListener('change', () => {
  const opt = el.foodSelect.options[el.foodSelect.selectedIndex];
  const base = opt && opt.dataset ? (opt.dataset.price || '') : '';
  el.priceInput.dataset.basePrice = base;
  el.priceInput.value = base;
  renderOptionGroupsFromSelection();
});
el.restaurantSelect?.addEventListener('change', syncRestaurantLock);
el.openRestaurantModalBtn?.addEventListener('click', openRestaurantModal);
el.closeRestaurantModalBtn?.addEventListener('click', closeRestaurantModal);
el.cancelRestaurantModalBtn?.addEventListener('click', closeRestaurantModal);
el.restaurantModal?.addEventListener('click', event => {
  if (event.target === el.restaurantModal) closeRestaurantModal();
});

el.setRestaurantBtn.addEventListener('click', async () => {
  const restaurant = el.restaurantSelect.value;
  const changingRestaurant = Boolean(state.currentRestaurant && restaurant && restaurant !== state.currentRestaurant);
  const cutoffTime = getCutoffInputValue();
  if (!restaurant) return showToast(t('chooseRestaurantFirst'));
  const previousRestaurant = state.currentRestaurant;
  const previousCutoffTime = state.cutoffTime;
  const previousMenu = state.menu;
  const previousFoodLookup = state.foodLookup;
  try {
    setBusy(true);
    const password = String(el.restaurantPasswordInput?.value || '').trim();
    if (!password) return showToast(t('enterAdminPassword'));
    const payload = await api('/api/restaurant', {
      method: 'POST',
      body: JSON.stringify({ restaurant, cutoffTime, password, forceChange: changingRestaurant })
    });
    await loadMenu(restaurant);
    state.currentRestaurant = payload.currentRestaurant;
    state.cutoffTime = payload.cutoffTime || state.defaultCutoffTime;
    state.cutoffPassed = Boolean(payload.cutoffPassed);
    el.currentRestaurantText.textContent = `${t('currentRestaurant')}${restaurant}`;
    if (payload.cleared) state.orders = [];
    renderRestaurants();
    closeRestaurantModal();
    if (payload.restaurantChanged || payload.cleared) {
      renderOrders();
      resetOrderForm();
      showToast(t('restaurantChanged'));
    } else if (payload.cutoffChanged) {
      showToast(t('cutoffUpdated'));
    } else {
      showToast(t('restaurantSet'));
    }
  } catch (err) {
    state.currentRestaurant = previousRestaurant;
    state.cutoffTime = previousCutoffTime;
    state.menu = previousMenu;
    state.foodLookup = previousFoodLookup;
    buildLookupMaps();
    renderCategories();
    renderRestaurants();
    if (/invalid password/i.test(String(err.message || ''))) {
      if (el.restaurantPasswordInput) {
        el.restaurantPasswordInput.value = '';
        el.restaurantPasswordInput.focus();
      }
    }
    showToast(err.message);
  } finally {
    setBusy(false);
  }
});

el.orderForm.addEventListener('submit', async event => {
  event.preventDefault();
  hideOrderError();
  const selectedFoodOpt = el.foodSelect.options[el.foodSelect.selectedIndex];
  const selectedPrice = selectedFoodOpt && selectedFoodOpt.dataset ? selectedFoodOpt.dataset.price : '';
  const basePrice = parsePriceInput(selectedPrice || el.priceInput.dataset.basePrice || el.priceInput.value);
  if (!Number.isFinite(basePrice)) return showToast(t('badPrice'));

  const optionSummary = collectOptionSelections();
  if (!optionSummary.ok) return showOrderError(optionSummary.error || t('optionRequired'));
  const price = basePrice + (optionSummary.extraPrice || 0);
  el.priceInput.value = price.toFixed(2);
  const addonText = String(el.addonInput.value || '').trim();
  const mergedAddon = optionSummary.text
    ? (addonText ? `${addonText}, ${optionSummary.text}` : optionSummary.text)
    : addonText;

  const order = { dept: el.deptSelect.value, name: el.nameSelect.value, food: el.foodSelect.value, price, addon: mergedAddon, drink: el.drinkSelect.value };
  if (state.cutoffPassed && state.lateOrder.active) {
    order.lateOrderUsername = state.lateOrder.username;
    order.lateOrderPassword = state.lateOrder.password;
    order.lateOrder = true;
  }
  const existingOrder = (state.orders || []).find(o => o.dept === order.dept && o.name === order.name);
  if (existingOrder && !sameOrderContent(existingOrder, order)) {
    const confirmed = await confirmOrderChange(existingOrder, order);
    if (!confirmed) return;
  }
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
    if (state.lateOrder.active) {
      state.lateOrder.active = false;
      state.lateOrder.password = '';
    }
    renderOrders();
    resetOrderForm();
    updateCutoffUi();
    showToast(updated ? t('orderUpdated') : t('orderAdded'));
  } catch (err) {
    if (/cutoff/i.test(String(err.message || ''))) {
      state.cutoffPassed = true;
      updateCutoffUi();
      showOrderError(t('orderBlockedNotice'));
    }
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
updateExportLinks();
setupSecretEntry();
setupAdminEntry();
setupLateOrderEntry();
setupDrinkChangeEntry();
if (el.cutoffTimeInput && !el.cutoffTimeInput.value) el.cutoffTimeInput.value = state.defaultCutoffTime;
el.cutoffTimeInput?.addEventListener('input', syncRestaurantLock);
startAutoRefresh();
loadBootstrap().catch(err => showToast(err.message, 3000));
