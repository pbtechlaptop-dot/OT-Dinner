const state = {
  appId: document.body && document.body.dataset && document.body.dataset.appId ? document.body.dataset.appId : 'main',
  lang: 'tc',
  priceLimit: 22,
  staff: {},
  drinks: [],
  menu: {},
  restaurants: [],
  restaurantContacts: {},
  orders: [],
  currentRestaurant: '',
  cutoffTime: '',
  cutoffPassed: false,
  date: '',
  lastOrdersSignature: '',
  lateOrder: {
    active: false,
    username: '',
    password: ''
  },
  groupOrder: {
    active: false,
    members: new Set(),
    drinks: []
  },
  selected: new Map()
};

const LAST_STAFF_KEY = 'otDinnerNewLastStaff';
const ANNOUNCEMENT_SEEN_KEY = 'otDinnerAnnouncementSeenVersion';
const announcementDismissedVersions = new Set();

const el = {
  appTitle: document.getElementById('appTitle'),
  dateText: document.getElementById('dateText'),
  restaurantText: document.getElementById('restaurantText'),
  diagText: document.getElementById('diagText'),
  langTc: document.getElementById('langTc'),
  langSc: document.getElementById('langSc'),
  langEn: document.getElementById('langEn'),
  mainLink: document.getElementById('mainLink'),
  restaurantTitle: document.getElementById('restaurantTitle'),
  restaurantActionHint: document.getElementById('restaurantActionHint'),
  restaurantCurrentText: document.getElementById('restaurantCurrentText'),
  restaurantContactText: document.getElementById('restaurantContactText'),
  cutoffText: document.getElementById('cutoffText'),
  openRestaurantModalBtn: document.getElementById('openRestaurantModalBtn'),
  exportCsvLink: document.getElementById('exportCsvLink'),
  exportXlsxBtn: document.getElementById('exportXlsxBtn'),
  staffTitle: document.getElementById('staffTitle'),
  deptLabel: document.getElementById('deptLabel'),
  nameLabel: document.getElementById('nameLabel'),
  drinkLabel: document.getElementById('drinkLabel'),
  deptSelect: document.getElementById('deptSelect'),
  nameSelect: document.getElementById('nameSelect'),
  groupOrderToggle: document.getElementById('groupOrderToggle'),
  groupOrderLabel: document.getElementById('groupOrderLabel'),
  groupMembersWrap: document.getElementById('groupMembersWrap'),
  groupMembersHint: document.getElementById('groupMembersHint'),
  groupMembersList: document.getElementById('groupMembersList'),
  drinkSelect: document.getElementById('drinkSelect'),
  groupDrinksWrap: document.getElementById('groupDrinksWrap'),
  groupDrinksHint: document.getElementById('groupDrinksHint'),
  groupDrinksList: document.getElementById('groupDrinksList'),
  foodTitle: document.getElementById('foodTitle'),
  categorySelect: document.getElementById('categorySelect'),
  priceSortSelect: document.getElementById('priceSortSelect'),
  foodList: document.getElementById('foodList'),
  limitLabel: document.getElementById('limitLabel'),
  kindsLabel: document.getElementById('kindsLabel'),
  qtyLabel: document.getElementById('qtyLabel'),
  balanceLabel: document.getElementById('balanceLabel'),
  limitText: document.getElementById('limitText'),
  selectedKindsText: document.getElementById('selectedKindsText'),
  selectedQtyText: document.getElementById('selectedQtyText'),
  balanceBox: document.getElementById('balanceBox'),
  balanceText: document.getElementById('balanceText'),
  budgetNotice: document.getElementById('budgetNotice'),
  selectedFoodTitle: document.getElementById('selectedFoodTitle'),
  selectionList: document.getElementById('selectionList'),
  addonLabel: document.getElementById('addonLabel'),
  addonInput: document.getElementById('addonInput'),
  submitBtn: document.getElementById('submitBtn'),
  ordersTitle: document.getElementById('ordersTitle'),
  ordersDeptTh: document.getElementById('ordersDeptTh'),
  ordersNameTh: document.getElementById('ordersNameTh'),
  ordersFoodTh: document.getElementById('ordersFoodTh'),
  ordersAddonTh: document.getElementById('ordersAddonTh'),
  ordersDrinkTh: document.getElementById('ordersDrinkTh'),
  ordersPriceTh: document.getElementById('ordersPriceTh'),
  ordersBody: document.getElementById('ordersBody'),
  ordersTotal: document.getElementById('ordersTotal'),
  totalLabel: document.getElementById('totalLabel'),
  drinkSummaryTitle: document.getElementById('drinkSummaryTitle'),
  drinkSummary: document.getElementById('drinkSummary'),
  foodSummaryTitle: document.getElementById('foodSummaryTitle'),
  foodSummary: document.getElementById('foodSummary'),
  foodSummaryByDeptTitle: document.getElementById('foodSummaryByDeptTitle'),
  foodSummaryByDept: document.getElementById('foodSummaryByDept'),
  confirmModal: document.getElementById('confirmModal'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmMessage: document.getElementById('confirmMessage'),
  cancelChangeBtn: document.getElementById('cancelChangeBtn'),
  confirmChangeBtn: document.getElementById('confirmChangeBtn'),
  restaurantModal: document.getElementById('restaurantModal'),
  restaurantModalTitle: document.getElementById('restaurantModalTitle'),
  restaurantModalHint: document.getElementById('restaurantModalHint'),
  restaurantPickerLabel: document.getElementById('restaurantPickerLabel'),
  restaurantSelect: document.getElementById('restaurantSelect'),
  cutoffTimeLabel: document.getElementById('cutoffTimeLabel'),
  cutoffTimeInput: document.getElementById('cutoffTimeInput'),
  restaurantPasswordLabel: document.getElementById('restaurantPasswordLabel'),
  restaurantPasswordInput: document.getElementById('restaurantPasswordInput'),
  cancelRestaurantBtn: document.getElementById('cancelRestaurantBtn'),
  setRestaurantBtn: document.getElementById('setRestaurantBtn'),
  cutoffNotice: document.getElementById('cutoffNotice'),
  busyOverlay: document.getElementById('busyOverlay'),
  busyText: document.getElementById('busyText'),
  toast: document.getElementById('toast')
};

const i18n = {
  tc: {
    appTitle: '加班 Order 飯系統 - New',
    appTitleLadyRuby: '加班 Order 飯系統 - Lady Ruby New',
    date: '日期：',
    restaurant: '今日餐廳：',
    restaurantTitle: '1) 今日餐廳',
    currentRestaurant: '目前：',
    contact: '聯絡：',
    mapAddress: '地圖',
    cutoff: '今日截單時間：',
    restaurantActionHint: '如需要改餐廳或截單時間，按設定餐廳並輸入密碼。',
    cutoffActiveNotice: '請於截單前完成下單，如已過時請聯絡部門主管或 Simon。',
    cutoffPassedNotice: '下單時間已過，請聯絡部門主管或 Simon 下單。',
    loadedSummary: (restaurants, restaurant, cutoff, orders) => `載入成功：餐廳 ${restaurants} 間，今日餐廳 ${restaurant}，截單 ${cutoff}，訂單 ${orders} 張`,
    exportCsv: '匯出 CSV',
    exportXlsx: '匯出 XLSX',
    setRestaurant: '設定餐廳',
    restaurantModalTitle: '設定今日餐廳',
    restaurantModalHint: '輸入密碼後，選擇餐廳及截單時間。',
    restaurantPicker: '選擇餐廳',
    restaurantPassword: '密碼',
    enterAdminPassword: '請輸入管理密碼',
    saveRestaurantSettings: '確認設定',
    selectRestaurant: '-- 選擇餐廳 --',
    chooseRestaurantFirst: '請先選擇餐廳',
    restaurantSet: '已設定今日餐廳',
    restaurantChanged: '已更改餐廳，舊單已清空',
    cutoffUpdated: '已更新截單時間',
    xlsxMissing: 'XLSX 工具未載入',
    requestFailed: '系統連線失敗，請再試一次。',
    invalidPassword: '密碼不正確',
    setRestaurantFirst: '請先設定今日餐廳',
    orderCutoffPassed: '下單時間已過，請聯絡部門主管或 Simon 下單。',
    tooManyAttempts: '密碼錯誤次數太多，請稍後再試。',
    memberAlreadyOrdered: '所選人員今日已經有訂單，請先刪除原有訂單。',
    notSet: '未設定',
    admin: '新版 Admin',
    main: '舊前台',
    staffTitle: '2) 同事資料',
    dept: '部門',
    name: '同事',
    groupOrder: '多人組合下單',
    groupMembersHint: '選擇同一張訂單的人員',
    groupDrinksHint: '按組合人數選擇飲品',
    chooseGroupMembersToast: '請最少選擇兩位人員',
    drink: '飲品',
    food: '餐點',
    foodTitle: '3) 選擇食物',
    limit: '上限',
    kinds: '已選款式',
    qty: '總數量',
    balance: '剩餘 / 超出',
    overWord: '超出',
    canAdd: amount => `仍可在上限內加選 ${amount}。`,
    overLimit: amount => `已超過上限 ${amount}，請減少食物後再下單。`,
    initialBudget: '可在上限內選一份或多份食物；超過上限不能下單。',
    selectedFood: '已選食物',
    noSelectedFood: '未選食物。',
    editQty: '更改',
    removeFood: '刪除',
    addon: '加配 / 備註',
    addonPlaceholder: '例如：走蔥、加飯',
    submit: '提交訂單',
    ordersTitle: '4) 今日訂單',
    price: '價錢',
    total: '總計',
    drinkSummary: '飲品總計',
    foodSummary: '餐點總計',
    foodSummaryByDept: '餐點總計（按部門）',
    confirmTitle: '確認變更訂單',
    cancel: '取消',
    confirm: '確定變更',
    chooseDept: '-- 選擇部門 --',
    chooseName: '-- 選擇同事 --',
    noDrink: '-- 無 --',
    allCats: '選擇分類',
    allCategories: '全部分類',
    sortOriginal: '原本排序',
    sortPriceAsc: '價錢小至大',
    sortPriceDesc: '價錢大至小',
    chooseCategoryFirst: '請先選擇分類。',
    noFoods: '未有餐點。',
    hasOptions: '有選項',
    options: '選項',
    pairOptions: '雙拼選擇',
    optionPortion: number => `第 ${number} 份`,
    completeOption: (food, label) => `請完成「${food}」的${label}。`,
    maxOption: (food, label, max) => `「${food}」的${label}最多只可選 ${max} 項。`,
    chooseDeptToast: '請先選擇部門',
    chooseNameToast: '請先選擇同事',
    chooseFoodToast: '請先選擇食物',
    cannotOrderOver: amount => `已超過上限 ${amount}，不能下單`,
    noOrders: '未有訂單',
    orderAdded: '已提交訂單',
    orderUpdated: '已更新訂單',
    lateOnlyAfterCutoff: '截單後才需要使用主管補單。',
    lateNoUsers: '未有可補單用戶，請先在後台加入補單權限。',
    lateUserPrompt: '請輸入補單用戶帳號',
    latePasswordPrompt: '請輸入補單用戶密碼',
    lateOrderTitle: '主管補單',
    lateOrderHint: '截單時間已過，只有有補單權限的後台用戶可以繼續下單。',
    lateOrderUser: '補單用戶',
    lateOrderPassword: '密碼',
    lateOrderLogin: '開始補單',
    lateOrderPasswordRequired: '請輸入補單用戶密碼',
    lateEnabled: '已開啟主管補單',
    drinkChangeTitle: '更改飲品',
    drinkChangeHint: '輸入有補單權限的用戶，即可更改今日訂單飲品。',
    drinkChangeSave: '儲存飲品',
    drinkChangeNoOrders: '今日未有訂單。',
    drinkChangeSaved: '已更新飲品',
    drinkChangeNoChanges: '未有需要儲存的飲品更改。',
    newDrink: '新飲品',
    busy: '系統處理中，請稍候...',
    changeMessage: (name, oldText, newText) => `<span class="nowrap">${name}</span> 由現在<br><span class="old">${oldText}</span><br>改為<br><span class="new">${newText}</span>`
    ,
    announcementTitle: '通告',
    announcementOk: '知道了',
    announcementDontShow: '不再顯示'
  },
  sc: {
    appTitle: '加班订餐系统 - New',
    appTitleLadyRuby: '加班订餐系统 - Lady Ruby New',
    date: '日期：',
    restaurant: '今日餐厅：',
    restaurantTitle: '1) 今日餐厅',
    currentRestaurant: '目前：',
    contact: '联系：',
    mapAddress: '地图',
    cutoff: '今日截单时间：',
    restaurantActionHint: '如需要改餐厅或截单时间，按设置餐厅并输入密码。',
    cutoffActiveNotice: '请于截单前完成下单，如已过时请联络部门主管或 Simon。',
    cutoffPassedNotice: '下单时间已过，请联络部门主管或 Simon 下单。',
    loadedSummary: (restaurants, restaurant, cutoff, orders) => `载入成功：餐厅 ${restaurants} 间，今日餐厅 ${restaurant}，截单 ${cutoff}，订单 ${orders} 张`,
    exportCsv: '导出 CSV',
    exportXlsx: '导出 XLSX',
    setRestaurant: '设置餐厅',
    restaurantModalTitle: '设置今日餐厅',
    restaurantModalHint: '输入密码后，选择餐厅及截单时间。',
    restaurantPicker: '选择餐厅',
    restaurantPassword: '密码',
    enterAdminPassword: '请输入管理密码',
    saveRestaurantSettings: '确认设置',
    selectRestaurant: '-- 选择餐厅 --',
    chooseRestaurantFirst: '请先选择餐厅',
    restaurantSet: '已设置今日餐厅',
    restaurantChanged: '已更改餐厅，旧单已清空',
    cutoffUpdated: '已更新截单时间',
    xlsxMissing: 'XLSX 工具未载入',
    requestFailed: '系统连接失败，请再试一次。',
    invalidPassword: '密码不正确',
    setRestaurantFirst: '请先设置今日餐厅',
    orderCutoffPassed: '下单时间已过，请联络部门主管或 Simon 下单。',
    tooManyAttempts: '密码错误次数太多，请稍后再试。',
    memberAlreadyOrdered: '所选人员今日已经有订单，请先删除原有订单。',
    notSet: '未设置',
    admin: '新版 Admin',
    main: '旧前台',
    staffTitle: '2) 人员资料',
    dept: '部门',
    name: '人员',
    groupOrder: '多人组合下单',
    groupMembersHint: '选择同一张订单的人员',
    groupDrinksHint: '按组合人数选择饮品',
    chooseGroupMembersToast: '请最少选择两位人员',
    drink: '饮品',
    food: '餐点',
    foodTitle: '3) 选择食物',
    limit: '上限',
    kinds: '已选款式',
    qty: '总数量',
    balance: '剩余 / 超出',
    overWord: '超出',
    canAdd: amount => `仍可在上限内加选 ${amount}。`,
    overLimit: amount => `已超过上限 ${amount}，请减少食物后再下单。`,
    initialBudget: '可在上限内选一份或多份食物；超过上限不能下单。',
    selectedFood: '已选食物',
    noSelectedFood: '未选食物。',
    editQty: '更改',
    removeFood: '删除',
    addon: '加配 / 备注',
    addonPlaceholder: '例如：走葱、加饭',
    submit: '提交订单',
    ordersTitle: '4) 今日订单',
    price: '价格',
    total: '总计',
    drinkSummary: '饮品总计',
    foodSummary: '餐点总计',
    foodSummaryByDept: '餐点总计（按部门）',
    confirmTitle: '确认变更订单',
    cancel: '取消',
    confirm: '确认变更',
    chooseDept: '-- 选择部门 --',
    chooseName: '-- 选择同事 --',
    noDrink: '-- 无 --',
    allCats: '选择分类',
    allCategories: '全部分类',
    sortOriginal: '原本排序',
    sortPriceAsc: '价钱小至大',
    sortPriceDesc: '价钱大至小',
    chooseCategoryFirst: '请先选择分类。',
    noFoods: '未有餐点。',
    hasOptions: '有选项',
    options: '选项',
    pairOptions: '双拼选择',
    optionPortion: number => `第 ${number} 份`,
    completeOption: (food, label) => `请完成「${food}」的${label}。`,
    maxOption: (food, label, max) => `「${food}」的${label}最多只可选 ${max} 项。`,
    chooseDeptToast: '请先选择部门',
    chooseNameToast: '请先选择同事',
    chooseFoodToast: '请先选择食物',
    cannotOrderOver: amount => `已超过上限 ${amount}，不能下单`,
    noOrders: '未有订单',
    orderAdded: '已提交订单',
    orderUpdated: '已更新订单',
    lateOnlyAfterCutoff: '截单后才需要使用主管补单。',
    lateNoUsers: '未有可补单用户，请先在后台加入补单权限。',
    lateUserPrompt: '请输入补单用户帐号',
    latePasswordPrompt: '请输入补单用户密码',
    lateOrderTitle: '主管补单',
    lateOrderHint: '截单时间已过，只有有补单权限的后台用户可以继续下单。',
    lateOrderUser: '补单用户',
    lateOrderPassword: '密码',
    lateOrderLogin: '开始补单',
    lateOrderPasswordRequired: '请输入补单用户密码',
    lateEnabled: '已开启主管补单',
    drinkChangeTitle: '更改饮品',
    drinkChangeHint: '输入有补单权限的用户，即可更改今日订单饮品。',
    drinkChangeSave: '保存饮品',
    drinkChangeNoOrders: '今日未有订单。',
    drinkChangeSaved: '已更新饮品',
    drinkChangeNoChanges: '未有需要保存的饮品更改。',
    newDrink: '新饮品',
    busy: '系统处理中，请稍候...',
    changeMessage: (name, oldText, newText) => `<span class="nowrap">${name}</span> 由现在<br><span class="old">${oldText}</span><br>改为<br><span class="new">${newText}</span>`,
    announcementTitle: '通告',
    announcementOk: '知道了',
    announcementDontShow: '不再显示'
  },
  en: {
    appTitle: 'Overtime Meal Order - New',
    appTitleLadyRuby: 'Overtime Meal Order - Lady Ruby New',
    date: 'Date: ',
    restaurant: 'Restaurant: ',
    restaurantTitle: '1) Restaurant',
    currentRestaurant: 'Current: ',
    contact: 'Contact: ',
    mapAddress: 'Map address',
    cutoff: 'Cutoff time: ',
    restaurantActionHint: 'To change the restaurant or cutoff time, click Set Restaurant and enter the password.',
    cutoffActiveNotice: 'Please place your order before the cutoff time. After that, contact your team leader or Simon.',
    cutoffPassedNotice: 'Ordering time has passed. Please contact your team leader or Simon to place an order.',
    loadedSummary: (restaurants, restaurant, cutoff, orders) => `Loaded: ${restaurants} restaurants, today's restaurant ${restaurant}, cutoff ${cutoff}, ${orders} orders`,
    exportCsv: 'Export CSV',
    exportXlsx: 'Export XLSX',
    setRestaurant: 'Set Restaurant',
    restaurantModalTitle: 'Set Today Restaurant',
    restaurantModalHint: 'Enter the password, then choose the restaurant and cutoff time.',
    restaurantPicker: 'Choose Restaurant',
    restaurantPassword: 'Password',
    enterAdminPassword: 'Enter admin password',
    saveRestaurantSettings: 'Save Settings',
    selectRestaurant: '-- Select Restaurant --',
    chooseRestaurantFirst: 'Please select a restaurant first',
    restaurantSet: 'Today restaurant set',
    restaurantChanged: 'Restaurant changed, old orders cleared',
    cutoffUpdated: 'Cutoff time updated',
    xlsxMissing: 'XLSX tool is not loaded',
    requestFailed: 'Connection failed. Please try again.',
    invalidPassword: 'Incorrect password',
    setRestaurantFirst: 'Please set today restaurant first',
    orderCutoffPassed: 'Ordering time has passed. Please contact your team leader or Simon to place an order.',
    tooManyAttempts: 'Too many failed password attempts. Please try again later.',
    memberAlreadyOrdered: 'One of the selected people already has an order today. Please delete the existing order first.',
    notSet: 'Not set',
    admin: 'New Admin',
    main: 'Old Page',
    staffTitle: '2) Staff',
    dept: 'Department',
    name: 'Name',
    groupOrder: 'Group order',
    groupMembersHint: 'Select people for the same order',
    groupDrinksHint: 'Choose drinks for each person in the group',
    chooseGroupMembersToast: 'Please select at least two people',
    drink: 'Drink',
    food: 'Food',
    foodTitle: '3) Choose Food',
    limit: 'Limit',
    kinds: 'Items',
    qty: 'Quantity',
    balance: 'Remaining / Over',
    overWord: 'Over',
    canAdd: amount => `Remaining within limit: ${amount}.`,
    overLimit: amount => `Over limit by ${amount}. Please reduce food before ordering.`,
    initialBudget: 'Choose one or more foods within the limit. Orders over the limit cannot be submitted.',
    selectedFood: 'Selected Food',
    noSelectedFood: 'No food selected.',
    editQty: 'Edit',
    removeFood: 'Delete',
    addon: 'Addon / Note',
    addonPlaceholder: 'e.g. no onion, extra rice',
    submit: 'Submit Order',
    ordersTitle: '4) Today Orders',
    price: 'Price',
    total: 'Total',
    drinkSummary: 'Drink Summary',
    foodSummary: 'Food Summary',
    foodSummaryByDept: 'Food Summary by Department',
    confirmTitle: 'Confirm Order Change',
    cancel: 'Cancel',
    confirm: 'Confirm Change',
    chooseDept: '-- Select Department --',
    chooseName: '-- Select Name --',
    noDrink: '-- None --',
    allCats: 'Select Category',
    allCategories: 'All Categories',
    sortOriginal: 'Original order',
    sortPriceAsc: 'Price low to high',
    sortPriceDesc: 'Price high to low',
    chooseCategoryFirst: 'Please select a category first.',
    noFoods: 'No food available.',
    hasOptions: 'Options',
    options: 'Options',
    pairOptions: 'Pair Choices',
    optionPortion: number => `Portion ${number}`,
    completeOption: (food, label) => `Please complete ${label} for ${food}.`,
    maxOption: (food, label, max) => `${label} for ${food} allows at most ${max}.`,
    chooseDeptToast: 'Please select department',
    chooseNameToast: 'Please select name',
    chooseFoodToast: 'Please choose food',
    cannotOrderOver: amount => `Over limit by ${amount}. Cannot submit.`,
    noOrders: 'No orders yet',
    orderAdded: 'Order submitted',
    orderUpdated: 'Order updated',
    lateOnlyAfterCutoff: 'Supervisor late order is only needed after cutoff.',
    lateNoUsers: 'No late-order users yet. Add late-order permission in admin first.',
    lateUserPrompt: 'Enter late-order username',
    latePasswordPrompt: 'Enter late-order password',
    lateOrderTitle: 'Supervisor Late Order',
    lateOrderHint: 'The cutoff has passed. Only admin users with late-order permission can keep ordering.',
    lateOrderUser: 'Late-order user',
    lateOrderPassword: 'Password',
    lateOrderLogin: 'Start Late Order',
    lateOrderPasswordRequired: 'Please enter the late-order user password',
    lateEnabled: 'Supervisor late order enabled',
    drinkChangeTitle: 'Change Drinks',
    drinkChangeHint: 'Enter a user with late-order permission to change drinks for today orders.',
    drinkChangeSave: 'Save Drinks',
    drinkChangeNoOrders: 'No orders today.',
    drinkChangeSaved: 'Drinks updated',
    drinkChangeNoChanges: 'No drink changes to save.',
    newDrink: 'New drink',
    busy: 'Processing, please wait...',
    changeMessage: (name, oldText, newText) => `<span class="nowrap">${name}</span> will change from<br><span class="old">${oldText}</span><br>to<br><span class="new">${newText}</span>`,
    announcementTitle: 'Notice',
    announcementOk: 'OK',
    announcementDontShow: "Don't show again"
  }
};

let toSc = value => String(value || '');
let toTc = value => String(value || '');
try {
  if (window.OpenCC && window.OpenCC.Converter) {
    toSc = window.OpenCC.Converter({ from: 'tw', to: 'cn' });
    toTc = window.OpenCC.Converter({ from: 'cn', to: 'tw' });
  }
} catch {
  toSc = value => String(value || '');
  toTc = value => String(value || '');
}

function t(key, ...args) {
  const value = i18n[state.lang][key];
  return typeof value === 'function' ? value(...args) : value;
}

function money(value) {
  const number = Number(value || 0);
  return `$${number.toFixed(2)}`;
}

function detectLang() {
  const raw = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
  if (raw.startsWith('zh-hans') || raw === 'zh-cn' || raw === 'zh-sg') return 'sc';
  if (raw.startsWith('zh')) return 'tc';
  return 'en';
}

function localFood(food) {
  if (!food) return '';
  if (state.lang === 'en') return food.nameEn || food.name;
  if (state.lang === 'sc') {
    const sc = food.nameSc || food.name;
    return sc === food.name ? toSc(food.name) : sc;
  }
  return food.name;
}

function localDrink(drink) {
  if (!drink) return '';
  if (state.lang === 'en') return drink.en || drink.tc;
  if (state.lang === 'sc') {
    const sc = drink.sc || drink.tc;
    return sc === drink.tc ? toSc(drink.tc) : sc;
  }
  return drink.tc;
}

function localCategory(category) {
  const value = String(category || '').trim();
  if (!value) return value;
  const slashParts = value.split('/').map(part => part.trim()).filter(Boolean);
  if (state.lang === 'en' && slashParts.length > 1) return slashParts[slashParts.length - 1];
  if (state.lang !== 'en' && slashParts.length) {
    const tc = slashParts[0];
    return state.lang === 'sc' ? toSc(tc) : tc;
  }
  return value;
}

function foodLookup() {
  const map = {};
  allFoods().forEach(food => {
    const target = localFood(food);
    [food.name, food.nameSc, food.nameEn].forEach(name => {
      const key = String(name || '').trim();
      if (key) map[key] = target;
    });
  });
  return map;
}

function drinkLookup() {
  const map = {};
  (state.drinks || []).map(normalizeDrink).forEach(drink => {
    if (drink.tc) map[drink.tc] = localDrink(drink);
  });
  return map;
}

function displayOrderFood(value) {
  let text = String(value || '').trim();
  if (!text) return '';
  const map = foodLookup();
  Object.keys(map).sort((a, b) => b.length - a.length).forEach(tc => {
    if (tc && map[tc] && map[tc] !== tc) text = text.split(tc).join(map[tc]);
  });
  text = text.split(/\s+\+\s+/).map(part => part.replace(/\s+x\s*1\s*$/i, '').trim()).join(' + ');
  return text;
}

function displayOrderDrink(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const map = drinkLookup();
  return text
    .split(/\s+\+\s+/)
    .map(item => item.split(' → ').map(part => map[part.trim()] || part.trim()).join(' → '))
    .join(' + ');
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.add('hidden'), 2600);
}

function localizeErrorMessage(message) {
  const text = String(message || '').trim();
  if (!text) return t('requestFailed');
  if (/too many failed password attempts/i.test(text)) return t('tooManyAttempts');
  if (/invalid password|invalid admin username or password|invalid late order username or password/i.test(text)) return t('invalidPassword');
  if (/please set today restaurant first/i.test(text)) return t('setRestaurantFirst');
  if (/ordering cutoff has passed/i.test(text)) return t('orderCutoffPassed');
  if (/order price exceeds limit/i.test(text)) return t('cannotOrderOver', text.match(/\$[0-9]+(?:\.[0-9]+)?/)?.[0] || '');
  if (/already has an order today/i.test(text)) return t('memberAlreadyOrdered');
  if (/request failed/i.test(text)) return t('requestFailed');
  return text;
}

function setBusy(isBusy, text) {
  if (!el.busyOverlay) return;
  if (el.busyText) el.busyText.textContent = text || t('busy');
  el.busyOverlay.classList.toggle('hidden', !isBusy);
}

function updateStaticText() {
  document.documentElement.lang = state.lang === 'en' ? 'en' : (state.lang === 'sc' ? 'zh-Hans' : 'zh-Hant');
  const title = state.appId === 'lady-ruby' ? t('appTitleLadyRuby') : t('appTitle');
  document.title = title;
  el.appTitle.textContent = title;
  el.dateText.textContent = `${t('date')}${state.date || '--'}`;
  el.restaurantText.textContent = `${t('restaurant')}${state.currentRestaurant || t('notSet')}`;
  el.restaurantTitle.textContent = t('restaurantTitle');
  el.restaurantActionHint.textContent = t('restaurantActionHint');
  el.restaurantCurrentText.textContent = `${t('currentRestaurant')}${state.currentRestaurant || t('notSet')}`;
  el.cutoffText.textContent = `${t('cutoff')}${state.cutoffTime || '--'}`;
  renderRestaurantContact();
  updateCutoffNotice();
  el.exportCsvLink.textContent = t('exportCsv');
  el.exportCsvLink.href = withAppParam('/api/export/csv');
  el.exportXlsxBtn.textContent = t('exportXlsx');
  el.openRestaurantModalBtn.textContent = t('setRestaurant');
  el.restaurantModalTitle.textContent = t('restaurantModalTitle');
  el.restaurantModalHint.textContent = t('restaurantModalHint');
  el.restaurantPickerLabel.textContent = t('restaurantPicker');
  el.cutoffTimeLabel.textContent = t('cutoff');
  el.restaurantPasswordLabel.textContent = t('restaurantPassword');
  el.restaurantPasswordInput.placeholder = t('enterAdminPassword');
  el.cancelRestaurantBtn.textContent = t('cancel');
  el.setRestaurantBtn.textContent = t('saveRestaurantSettings');
  el.mainLink.textContent = t('main');
  el.mainLink.href = state.appId === 'lady-ruby' ? '/lady-ruby/' : '/';
  el.staffTitle.textContent = t('staffTitle');
  el.deptLabel.textContent = t('dept');
  el.nameLabel.textContent = t('name');
  el.groupOrderLabel.textContent = t('groupOrder');
  el.groupMembersHint.textContent = t('groupMembersHint');
  el.groupDrinksHint.textContent = t('groupDrinksHint');
  el.drinkLabel.textContent = t('drink');
  el.foodTitle.textContent = t('foodTitle');
  el.limitLabel.textContent = t('limit');
  el.kindsLabel.textContent = t('kinds');
  el.qtyLabel.textContent = t('qty');
  el.balanceLabel.textContent = t('balance');
  el.selectedFoodTitle.textContent = t('selectedFood');
  el.addonLabel.textContent = t('addon');
  el.addonInput.placeholder = t('addonPlaceholder');
  el.submitBtn.textContent = t('submit');
  el.ordersTitle.textContent = t('ordersTitle');
  el.ordersDeptTh.textContent = t('dept');
  el.ordersNameTh.textContent = t('name');
  el.ordersFoodTh.textContent = t('food');
  el.ordersAddonTh.textContent = t('addon').split('/')[0].trim();
  el.ordersDrinkTh.textContent = t('drink');
  el.ordersPriceTh.textContent = t('price');
  el.totalLabel.textContent = t('total');
  el.drinkSummaryTitle.textContent = t('drinkSummary');
  el.foodSummaryTitle.textContent = t('foodSummary');
  el.foodSummaryByDeptTitle.textContent = t('foodSummaryByDept');
  el.confirmTitle.textContent = t('confirmTitle');
  el.cancelChangeBtn.textContent = t('cancel');
  el.confirmChangeBtn.textContent = t('confirm');
  if (!state.selected.size) el.budgetNotice.textContent = t('initialBudget');
  renderPriceSortOptions();
  updateDiagSummary();
}

function renderRestaurantContact() {
  const contactMap = state.restaurantContacts && typeof state.restaurantContacts === 'object' ? state.restaurantContacts : {};
  const contact = state.currentRestaurant ? contactMap[state.currentRestaurant] : null;
  const parts = [];
  if (contact && contact.phone) parts.push(escapeHtml(contact.phone));
  if (contact && contact.email) parts.push(escapeHtml(contact.email));
  if (contact && contact.note) parts.push(linkifyText(contact.note));
  if (!parts.length) {
    el.restaurantContactText.classList.add('hidden');
    el.restaurantContactText.textContent = '';
    return;
  }
  el.restaurantContactText.innerHTML = `${escapeHtml(t('contact'))}${parts.join(' / ')}`;
  el.restaurantContactText.classList.remove('hidden');
}

function updateDiagSummary() {
  if (!el.diagText) return;
  const restaurantCount = Array.isArray(state.restaurants) ? state.restaurants.length : 0;
  el.diagText.textContent = t(
    'loadedSummary',
    restaurantCount,
    state.currentRestaurant || t('notSet'),
    state.cutoffTime || '--',
    (state.orders || []).length
  );
}

function updateCutoffNotice() {
  if (!el.cutoffNotice) return;
  if (!state.currentRestaurant && !state.cutoffTime) {
    el.cutoffNotice.className = 'cutoff-notice hidden';
    el.cutoffNotice.textContent = '';
    return;
  }
  const cutoff = state.cutoffTime || '--';
  el.cutoffNotice.textContent = state.cutoffPassed
    ? `${t('cutoff')}${cutoff}. ${t('cutoffPassedNotice')}`
    : `${t('cutoff')}${cutoff}. ${t('cutoffActiveNotice')}`;
  el.cutoffNotice.className = `cutoff-notice ${state.cutoffPassed ? 'passed' : 'active'}`;
}

function setLanguage(lang) {
  state.lang = lang;
  updateStaticText();
  renderCategories();
  renderDrinks();
  renderFoods();
  renderSelection();
  renderOrders();
}

function withAppParam(path) {
  const app = encodeURIComponent(state.appId || 'main');
  return `${path}${path.includes('?') ? '&' : '?'}app=${app}`;
}

async function api(path, options = {}) {
  const requestOptions = { headers: { 'Content-Type': 'application/json' }, ...options };
  if (requestOptions.body && typeof requestOptions.body === 'string') {
    try {
      const body = JSON.parse(requestOptions.body);
      if (!body.app) requestOptions.body = JSON.stringify({ ...body, app: state.appId || 'main' });
    } catch {
    }
  }
  const response = await fetch(withAppParam(path), requestOptions);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(localizeErrorMessage(payload.error || 'Request failed'));
  }
  return response.json();
}

function fillSelect(select, items, placeholder) {
  select.innerHTML = '';
  const first = document.createElement('option');
  first.value = '';
  first.textContent = placeholder;
  select.appendChild(first);
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    select.appendChild(option);
  });
}

function readLastStaff() {
  try {
    return JSON.parse(localStorage.getItem(LAST_STAFF_KEY) || 'null') || null;
  } catch {
    return null;
  }
}

function saveLastStaff(dept, name) {
  try {
    localStorage.setItem(LAST_STAFF_KEY, JSON.stringify({ dept, name }));
  } catch {
  }
}

function applyLastStaff() {
  const last = readLastStaff();
  if (!last || !last.dept || !last.name) return false;
  const names = state.staff && state.staff[last.dept];
  if (!Array.isArray(names) || !names.includes(last.name)) return false;
  el.deptSelect.value = last.dept;
  renderNames();
  el.nameSelect.value = last.name;
  return true;
}

function normalizeDrink(raw) {
  if (typeof raw === 'string') return { tc: raw, paused: false };
  return {
    tc: String(raw && (raw.tc || raw.name) || '').trim(),
    sc: String(raw && (raw.sc || raw.tc || raw.name) || '').trim(),
    en: String(raw && (raw.en || raw.tc || raw.name) || '').trim(),
    paused: Boolean(raw && raw.paused)
  };
}

function normalizeFood(raw, category) {
  const name = String(raw && (raw.nameTc || raw.name || raw.tc) || '').trim();
  const price = Number(raw && raw.price);
  const food = {
    key: `${category}::${name}`,
    category,
    name,
    nameSc: String(raw && (raw.nameSc || raw.sc || raw.nameTc || raw.name || raw.tc) || '').trim(),
    nameEn: String(raw && raw.nameEn || '').trim(),
    price: Number.isFinite(price) ? price : 0,
    paused: Boolean(raw && raw.paused)
  };
  if (Array.isArray(raw && raw.optionGroups) && raw.optionGroups.length) {
    food.optionGroups = raw.optionGroups;
  }
  return food;
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

function normalizeOptionChoice(choice) {
  if (typeof choice === 'string' || typeof choice === 'number') {
    const labelRaw = String(choice).trim();
    if (!labelRaw) return null;
    return parseChoiceLabel(labelRaw) || { label: labelRaw, price: 0 };
  }
  if (!choice || typeof choice !== 'object') return null;
  const label = String(choice.label || choice.name || choice.value || choice.text || '').trim();
  if (!label) return null;
  const price = Number(choice.price ?? choice.add ?? choice.extra);
  return { label, price: Number.isFinite(price) ? price : 0 };
}

function formatOptionLabel(label, price) {
  const displayLabel = localOptionLabel(label);
  return Number.isFinite(price) && price > 0 ? `${displayLabel} (+${money(price)})` : displayLabel;
}

function localOptionLabel(label) {
  const raw = String(label || '').trim();
  if (!raw) return '';
  if (state.lang === 'en') {
    const english = raw
      .replace(/^[\u3400-\u9fff\s/+&()（）-]+/, '')
      .replace(/^choice\s+/i, '')
      .replace(/^[-:/\s]+/, '')
      .trim();
    return english || raw;
  }
  const slashParts = raw.split('/').map(part => part.trim()).filter(Boolean);
  const source = slashParts.length > 1 ? slashParts[0] : raw;
  const chinese = source.match(/[\u3400-\u9fff][\u3400-\u9fff\s/+&()（）-]*/g);
  const display = chinese && chinese.length ? chinese.join('').trim() : source;
  return state.lang === 'sc' ? toSc(display) : display;
}

function orderOptionLabel(label) {
  const raw = String(label || '').trim();
  if (!raw) return '';
  const slashParts = raw.split('/').map(part => part.trim()).filter(Boolean);
  const source = slashParts.length > 1 ? slashParts[0] : raw;
  const chinese = source.match(/[\u3400-\u9fff][\u3400-\u9fff\s/+&()（）-]*/g);
  const display = chinese && chinese.length ? chinese.join('').trim() : source;
  return toTc(display);
}

function splitAddonParts(addonText) {
  return String(addonText || '')
    .split(/[+＋,，、;；/]/)
    .map(part => part.trim())
    .filter(Boolean);
}

function normalizeAddonForSummary(addonText) {
  const parts = splitAddonParts(addonText)
    .map(canonicalAddonPart)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  return parts.join('+');
}

function canonicalAddonPart(part) {
  const value = toTc(String(part || '').trim());
  const chinese = value.match(/[\u3400-\u9fff]+/g);
  if (chinese && chinese.length) return chinese.join('');
  const known = addonChineseName(value);
  if (known) return toTc(known);
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function localizeAddonForSummary(addonText) {
  const normalized = normalizeAddonForSummary(addonText);
  if (!normalized) return '';
  return normalized.split('+').map(localizeAddonPart).join('+');
}

function localizeAddonForDisplay(addonText) {
  return String(addonText || '')
    .split(/([+＋,，、;；/])/)
    .map(part => {
      if (!part.trim()) return part;
      if (/^[+＋,，、;；/]$/.test(part)) return part === '＋' ? '+' : part;
      return localizeAddonPart(part);
    })
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function localizeAddonPart(part) {
  const raw = String(part || '').trim();
  const qtyMatch = raw.match(/\s+x\s*\d+\s*$/i);
  const suffix = qtyMatch ? raw.slice(qtyMatch.index).trim() : '';
  const value = canonicalAddonPart(qtyMatch ? raw.slice(0, qtyMatch.index) : raw);
  if (!value) return '';
  const localized = localizeAddonName(value);
  return suffix ? `${localized} ${suffix}` : localized;
}

function localizeAddonName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (state.lang === 'en') return addonEnglishName(raw);
  const chinese = addonChineseName(raw) || optionChineseName(raw) || raw;
  return state.lang === 'sc' ? toSc(chinese) : toTc(chinese);
}

function optionChineseName(value) {
  const key = canonicalTextKey(value);
  if (!key) return '';
  const map = {};
  allFoods().forEach(food => {
    (food.optionGroups || []).forEach(group => {
      (group.choices || []).map(normalizeOptionChoice).filter(Boolean).forEach(choice => {
        const tc = orderOptionLabel(choice.label);
        if (!tc || !/[\u3400-\u9fff]/.test(tc)) return;
        [choice.label, localOptionLabel(choice.label), extractEnglishOptionLabel(choice.label), tc].forEach(label => {
          const labelKey = canonicalTextKey(label);
          if (labelKey) map[labelKey] = tc;
        });
      });
    });
  });
  return map[key] || '';
}

function extractEnglishOptionLabel(label) {
  return String(label || '')
    .replace(/^[\u3400-\u9fff\s/+&()（）-]+/, '')
    .replace(/^choice\s+/i, '')
    .replace(/^[-:/\s]+/, '')
    .trim();
}

function addonChineseName(value) {
  const map = {
    'bbq pork': '叉燒',
    'honey bbq pork': '叉燒',
    'pork crispy': '燒肉',
    'crispy pork': '燒肉',
    'roast pork': '燒肉',
    'crispy roast pork': '燒肉',
    'roast duck': '燒鴨',
    'duck': '燒鴨',
    'chicken': '雞',
    'egg noodles': '雞蛋麵',
    'choice egg noodles': '雞蛋麵',
    'hor fun': '河粉',
    'lai fen': '瀨粉'
  };
  return map[canonicalTextKey(value)] || '';
}

function canonicalTextKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[()（）]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function addonEnglishName(value) {
  const map = {
    '叉燒': 'BBQ Pork',
    '燒肉': 'Roast Pork',
    '燒鴨': 'Roast Duck',
    '雞': 'Chicken',
    '雞蛋麵': 'Egg Noodles',
    '河粉': 'Hor Fun',
    '瀨粉': 'Lai Fen',
    '肉': 'Meat',
    '椒鹽': 'Salt and Pepper',
    '少鹽': 'Less Salt',
    '加辣': 'Spicy',
    '小辣': 'Mild Spicy'
  };
  return map[value] || displayOrderFood(value);
}

function displayAddon(addonText) {
  const raw = String(addonText || '').trim();
  if (!raw) return '';
  const hasCjk = /[\u3400-\u9fff]/.test(raw);
  if (!hasCjk && state.lang === 'en') return raw;
  return localizeAddonForDisplay(raw) || raw;
}

function allFoods() {
  const list = [];
  Object.entries(state.menu || {}).forEach(([category, items]) => {
    (items || []).forEach(item => {
      const food = normalizeFood(item, category);
      if (!Array.isArray(food.optionGroups) || !food.optionGroups.length) {
        const inferred = inferOptionGroups(food, items);
        if (inferred.length) food.optionGroups = inferred;
      }
      if (food.name && !food.paused) list.push(food);
    });
  });
  return list;
}

function inferOptionGroups(food, rawItems) {
  if (!food || !food.name.includes('雙拼')) return [];
  const choices = [];
  (rawItems || []).forEach(raw => {
    const name = String(raw && (raw.nameTc || raw.name || raw.tc) || '').trim();
    if (!name || name === food.name || name.includes('雙拼')) return;
    const simplified = simplifyChoiceName(name);
    if (!simplified || choices.includes(simplified)) return;
    choices.push(simplified);
  });
  if (choices.length < 2) return [];
  return [{
    label: 'pairOptions',
    inferredPair: true,
    min: 2,
    max: 2,
    choices
  }];
}

function simplifyChoiceName(name) {
  let value = String(name || '').trim();
  value = value.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();
  value = value.replace(/湯?麵$|湯?面$|飯$|河$|米$|米粉$|米綫$|撈麵$|撈面$/g, '').trim();
  value = value.replace(/^各式/, '').trim();
  return value;
}

function getTotals() {
  let total = 0;
  let qty = 0;
  state.selected.forEach(entry => {
    total += getEntryTotalPrice(entry);
    qty += entry.qty;
  });
  return { total, qty, kinds: state.selected.size };
}

function getEffectivePriceLimit() {
  return state.priceLimit * Math.max(1, selectedOrderMembers().length);
}

function normalizeOptionSet(optionSet) {
  const normalized = {};
  Object.entries(optionSet || {}).forEach(([key, value]) => {
    normalized[key] = Array.isArray(value) ? [...value] : [];
  });
  return normalized;
}

function getEntryOptionSets(entry) {
  const qty = Math.max(0, Math.floor(Number(entry && entry.qty) || 0));
  const groups = Array.isArray(entry && entry.food && entry.food.optionGroups) ? entry.food.optionGroups : [];
  if (!groups.length || !qty) return [];
  const existing = Array.isArray(entry.optionSets) && entry.optionSets.length
    ? entry.optionSets
    : (entry.options ? [entry.options] : []);
  return Array.from({ length: qty }, (_, index) => normalizeOptionSet(existing[index] || {}));
}

function getEntryOptionExtra(entry, optionSet) {
  const groups = Array.isArray(entry && entry.food && entry.food.optionGroups) ? entry.food.optionGroups : [];
  const selectedOptions = optionSet || entry.options || {};
  return groups.reduce((sum, group, index) => {
    const selected = Array.isArray(selectedOptions[index]) ? selectedOptions[index] : [];
    const choices = (group.choices || []).map(normalizeOptionChoice).filter(Boolean);
    selected.forEach(label => {
      const choice = choices.find(item => item.label === label);
      if (choice && Number.isFinite(choice.price)) sum += choice.price;
    });
    return sum;
  }, 0);
}

function getEntryUnitPrice(entry) {
  return Number(entry && entry.food && entry.food.price || 0) + getEntryOptionExtra(entry);
}

function getEntryTotalPrice(entry) {
  const base = Number(entry && entry.food && entry.food.price || 0);
  const qty = Math.max(0, Math.floor(Number(entry && entry.qty) || 0));
  const optionSets = getEntryOptionSets(entry);
  if (!optionSets.length) return base * qty;
  return optionSets.reduce((sum, optionSet) => sum + base + getEntryOptionExtra(entry, optionSet), 0);
}

function renderDepartments() {
  const departments = Object.keys(state.staff || {});
  fillSelect(el.deptSelect, departments.map(dept => ({ value: dept, label: dept })), t('chooseDept'));
  const single = departments.length === 1 ? departments[0] : '';
  if (single) {
    el.deptSelect.value = single;
    renderNames();
  }
}

function renderNames() {
  const names = state.staff[el.deptSelect.value] || [];
  fillSelect(el.nameSelect, names.map(name => ({ value: name, label: name })), t('chooseName'));
  state.groupOrder.members = new Set();
  renderGroupMembers();
  renderSelection();
}

function orderMemberNames(order) {
  return String(order && order.name || '')
    .split(/\s+\+\s+/)
    .map(name => name.trim())
    .filter(Boolean);
}

function orderIdentityKey(dept, members) {
  const sortedMembers = [...(members || [])].sort((a, b) => a.localeCompare(b));
  return `${String(dept || '').trim()}\u0000${sortedMembers.join('\u0000')}`;
}

function selectedOrderMembers() {
  if (!state.groupOrder.active) {
    const name = String(el.nameSelect.value || '').trim();
    return name ? [name] : [];
  }
  const deptNames = state.staff[el.deptSelect.value] || [];
  return deptNames.filter(name => state.groupOrder.members.has(name));
}

function findExistingOrderForMembers(dept, members, options = {}) {
  const key = orderIdentityKey(dept, members);
  const selectedMembers = [...(members || [])].map(name => String(name || '').trim()).filter(Boolean);
  const exact = (state.orders || []).find(order => orderIdentityKey(order.dept, orderMemberNames(order)) === key);
  if (exact) return exact;
  if (!options.allowGroupSplit || !selectedMembers.length) return null;
  return (state.orders || []).find(order => {
    if (String(order.dept || '').trim() !== String(dept || '').trim()) return false;
    const existingMembers = orderMemberNames(order);
    return existingMembers.length > selectedMembers.length
      && selectedMembers.every(member => existingMembers.includes(member));
  });
}

function memberHasDifferentOrder(dept, member, selectedMembers) {
  const selectedList = [...(selectedMembers || [])].map(name => String(name || '').trim()).filter(Boolean);
  const selectedKey = orderIdentityKey(dept, selectedList);
  const replacementGroup = selectedList.length ? (state.orders || []).find(order => {
    if (String(order.dept || '').trim() !== String(dept || '').trim()) return false;
    const members = orderMemberNames(order);
    return members.length > selectedList.length && selectedList.every(selected => members.includes(selected));
  }) : null;
  if (replacementGroup && !orderMemberNames(replacementGroup).includes(member)) return true;
  return (state.orders || []).some(order => {
    if (String(order.dept || '').trim() !== String(dept || '').trim()) return false;
    const members = orderMemberNames(order);
    if (orderIdentityKey(order.dept, members) === selectedKey) return false;
    if (members.length > 1 && members.includes(member)) {
      if (!selectedList.length) return false;
      if (selectedList.every(selected => members.includes(selected))) return false;
    }
    return members.includes(member);
  });
}

function renderGroupMembers() {
  const active = Boolean(el.groupOrderToggle && el.groupOrderToggle.checked);
  state.groupOrder.active = active;
  if (el.nameSelect) el.nameSelect.disabled = active;
  if (!el.groupMembersWrap || !el.groupMembersList) return;
  el.groupMembersWrap.classList.toggle('hidden', !active);
  if (!active) {
    state.groupOrder.members = new Set();
    state.groupOrder.drinks = [];
    renderGroupDrinks();
    return;
  }
  const dept = el.deptSelect.value;
  const names = state.staff[dept] || [];
  const initialMembers = selectedOrderMembers();
  names.forEach(name => {
    if (state.groupOrder.members.has(name) && memberHasDifferentOrder(dept, name, initialMembers)) {
      state.groupOrder.members.delete(name);
    }
  });
  const selectedMembers = selectedOrderMembers();
  el.groupMembersList.innerHTML = names.map(name => {
    const checked = state.groupOrder.members.has(name) ? 'checked' : '';
    const disabled = memberHasDifferentOrder(dept, name, selectedMembers) ? 'disabled' : '';
    return `
      <label class="group-member-choice">
        <input type="checkbox" data-action="group-member" value="${escapeHtml(name)}" ${checked} ${disabled} />
        <span>${escapeHtml(name)}</span>
      </label>
    `;
  }).join('');
  renderGroupDrinks();
}

function renderDrinks() {
  const drinks = (state.drinks || []).map(normalizeDrink).filter(drink => drink.tc && !drink.paused);
  fillSelect(el.drinkSelect, drinks.map(drink => ({ value: drink.tc, label: localDrink(drink) })), t('noDrink'));
  renderGroupDrinks();
}

function renderGroupDrinks() {
  const active = Boolean(state.groupOrder.active);
  if (el.drinkSelect) el.drinkSelect.disabled = active;
  if (!el.groupDrinksWrap || !el.groupDrinksList) return;
  const members = selectedOrderMembers();
  el.groupDrinksWrap.classList.toggle('hidden', !active || !members.length);
  if (!active || !members.length) {
    el.groupDrinksList.innerHTML = '';
    return;
  }
  state.groupOrder.drinks = members.map((_, index) => state.groupOrder.drinks[index] || '');
  const drinks = (state.drinks || []).map(normalizeDrink).filter(drink => drink.tc && !drink.paused);
  const noDrink = t('noDrink').replace(/-/g, '').trim();
  el.groupDrinksList.innerHTML = members.map((member, index) => {
    const selectedValue = state.groupOrder.drinks[index] || '';
    const options = [`<option value="">${escapeHtml(noDrink)}</option>`]
      .concat(drinks.map(drink => {
        const selected = drink.tc === selectedValue ? ' selected' : '';
        return `<option value="${escapeHtml(drink.tc)}"${selected}>${escapeHtml(localDrink(drink))}</option>`;
      })).join('');
    return `
      <label class="group-drink-row">
        <span>${escapeHtml(member)}</span>
        <select data-action="group-drink" data-index="${index}">${options}</select>
      </label>
    `;
  }).join('');
}

function selectedGroupDrinks() {
  if (!state.groupOrder.active) return [el.drinkSelect.value].filter(Boolean);
  return state.groupOrder.drinks
    .slice(0, selectedOrderMembers().length)
    .map(drink => String(drink || '').trim())
    .filter(Boolean);
}

function renderCategories() {
  const categories = Object.keys(state.menu || {}).filter(category => {
    const items = Array.isArray(state.menu[category]) ? state.menu[category] : [];
    return items.some(item => {
      const food = normalizeFood(item, category);
      return food.name && !food.paused;
    });
  });
  fillSelect(el.categorySelect, [
    { value: '__all__', label: t('allCategories') },
    ...categories.map(category => ({ value: category, label: localCategory(category) }))
  ], t('allCats'));
  el.categorySelect.selectedIndex = 0;
  el.categorySelect.value = '';
  renderFoods();
}

function renderPriceSortOptions() {
  if (!el.priceSortSelect) return;
  const current = el.priceSortSelect.value || 'original';
  fillSelect(el.priceSortSelect, [
    { value: 'original', label: t('sortOriginal') },
    { value: 'asc', label: t('sortPriceAsc') },
    { value: 'desc', label: t('sortPriceDesc') }
  ], '');
  el.priceSortSelect.value = current;
}

function renderFoods() {
  const category = el.categorySelect.value;
  if (el.categorySelect.selectedIndex <= 0 || !category) {
    el.foodList.innerHTML = `<p class="hint">${escapeHtml(t('chooseCategoryFirst'))}</p>`;
    return;
  }
  const foods = allFoods().filter(food => {
    return category === '__all__' || food.category === category;
  });
  const sortMode = el.priceSortSelect ? el.priceSortSelect.value : 'original';
  if (sortMode === 'asc') foods.sort((a, b) => Number(a.price || 0) - Number(b.price || 0) || localFood(a).localeCompare(localFood(b), 'zh-Hant'));
  if (sortMode === 'desc') foods.sort((a, b) => Number(b.price || 0) - Number(a.price || 0) || localFood(a).localeCompare(localFood(b), 'zh-Hant'));

  if (!foods.length) {
    el.foodList.innerHTML = `<p class="hint">${escapeHtml(t('noFoods'))}</p>`;
    return;
  }

  el.foodList.innerHTML = foods.map(food => {
    const selected = state.selected.get(food.key);
    const qty = selected ? selected.qty : 0;
    return `
      <div class="food-item ${qty ? 'selected' : ''}" data-key="${escapeHtml(food.key)}">
        <div>
          <div class="food-name">${escapeHtml(localFood(food))}</div>
          <div class="food-meta">${money(food.price)}${Array.isArray(food.optionGroups) && food.optionGroups.length ? ` · ${escapeHtml(t('hasOptions'))}` : ''}</div>
        </div>
        <div class="qty">
          <button type="button" data-action="minus" aria-label="減少">-</button>
          <input data-action="qty" type="number" min="0" step="1" value="${qty}" aria-label="數量" />
          <button type="button" data-action="plus" aria-label="增加">+</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderSelection() {
  const entries = Array.from(state.selected.values());
  if (!entries.length) {
    el.selectionList.innerHTML = `<p class="hint">${escapeHtml(t('noSelectedFood'))}</p>`;
  } else {
    el.selectionList.innerHTML = entries.map(({ food, qty }) => `
      <div class="selected-line selection-detail" data-key="${escapeHtml(food.key)}">
        <div>
          <div class="selected-main">
            <span>${escapeHtml(localFood(food))}</span>
            <strong>${money(getEntryTotalPrice(state.selected.get(food.key)))}</strong>
          </div>
          <div class="selected-controls">
            <span>${escapeHtml(t('editQty'))}</span>
            <button type="button" data-action="selected-minus" aria-label="減少">-</button>
            <input data-action="selected-qty" type="number" min="0" step="1" value="${qty}" aria-label="數量" />
            <button type="button" data-action="selected-plus" aria-label="增加">+</button>
            <button class="btn btn-light selected-remove" type="button" data-action="selected-remove">${escapeHtml(t('removeFood'))}</button>
          </div>
          ${renderEntryOptions(state.selected.get(food.key))}
        </div>
      </div>
    `).join('');
  }

  const totals = getTotals();
  const optionValidation = validateSelectedOptions();
  const effectiveLimit = getEffectivePriceLimit();
  const balance = effectiveLimit - totals.total;
  el.limitText.textContent = money(effectiveLimit);
  el.selectedKindsText.textContent = String(totals.kinds);
  el.selectedQtyText.textContent = String(totals.qty);
  el.balanceText.textContent = balance >= 0 ? money(balance) : `${t('overWord')} ${money(Math.abs(balance))}`;
  el.balanceBox.classList.toggle('ok', balance >= 0);
  el.balanceBox.classList.toggle('over', balance < 0);
  el.budgetNotice.className = `notice ${balance >= 0 ? 'ok' : 'danger'}`;
  el.budgetNotice.textContent = balance >= 0
    ? (optionValidation.ok ? t('canAdd', money(balance)) : optionValidation.error)
    : t('overLimit', money(Math.abs(balance)));
  el.submitBtn.disabled = totals.qty === 0 || totals.total > effectiveLimit || !optionValidation.ok;
}

function renderEntryOptions(entry) {
  const groups = Array.isArray(entry && entry.food && entry.food.optionGroups) ? entry.food.optionGroups : [];
  if (!groups.length) return '';
  const optionSets = getEntryOptionSets(entry);
  return `<div class="option-groups">${optionSets.map((optionSet, portionIndex) => `
    <div class="option-portion">
      <div class="option-portion-title">${escapeHtml(t('optionPortion', portionIndex + 1))}</div>
      ${groups.map((group, groupIndex) => {
    const label = group.inferredPair || group.label === 'pairOptions' ? t('pairOptions') : (group.label || t('options'));
    const choices = (group.choices || []).map(normalizeOptionChoice).filter(Boolean);
    const max = Number.isFinite(group.max) ? group.max : choices.length;
    const min = Number.isFinite(group.min) ? group.min : (max === 1 ? 1 : 0);
    const isSingle = max === 1 && min <= 1;
    const selected = Array.isArray(optionSet[groupIndex]) ? optionSet[groupIndex] : [];
    return `
      <div class="option-group">
        <div class="option-title">${escapeHtml(label)} <span>(${min}${max === min ? '' : `-${max}`})</span></div>
        <div class="option-list">
          ${choices.map(choice => {
            const checked = selected.includes(choice.label) ? 'checked' : '';
            return `
              <label class="option-choice">
                <input
                  type="${isSingle ? 'radio' : 'checkbox'}"
                  name="option-${escapeHtml(entry.food.key)}-${portionIndex}-${groupIndex}"
                  value="${escapeHtml(choice.label)}"
                  data-action="option"
                  data-key="${escapeHtml(entry.food.key)}"
                  data-portion="${portionIndex}"
                  data-group="${groupIndex}"
                  ${checked}
                />
                <span>${escapeHtml(formatOptionLabel(choice.label, choice.price))}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
      }).join('')}
    </div>
  `).join('')}</div>`;
}

function validateSelectedOptions() {
  for (const entry of state.selected.values()) {
    const groups = Array.isArray(entry.food.optionGroups) ? entry.food.optionGroups : [];
    const optionSets = getEntryOptionSets(entry);
    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index] || {};
      const choices = (group.choices || []).map(normalizeOptionChoice).filter(Boolean);
      const max = Number.isFinite(group.max) ? group.max : choices.length;
      const min = Number.isFinite(group.min) ? group.min : (max === 1 ? 1 : 0);
      for (let portionIndex = 0; portionIndex < optionSets.length; portionIndex += 1) {
        const selected = Array.isArray(optionSets[portionIndex] && optionSets[portionIndex][index]) ? optionSets[portionIndex][index] : [];
        if (selected.length < min) {
          const label = group.inferredPair || group.label === 'pairOptions' ? t('pairOptions') : (group.label || t('options'));
          return { ok: false, error: t('completeOption', `${localFood(entry.food)} ${t('optionPortion', portionIndex + 1)}`, label) };
        }
        if (selected.length > max) {
          const label = group.inferredPair || group.label === 'pairOptions' ? t('pairOptions') : (group.label || t('options'));
          return { ok: false, error: t('maxOption', `${localFood(entry.food)} ${t('optionPortion', portionIndex + 1)}`, label, max) };
        }
      }
    }
  }
  return { ok: true, error: '' };
}

function setFoodQty(key, qty) {
  const food = allFoods().find(item => item.key === key);
  if (!food) return;
  const nextQty = Math.max(0, Math.floor(Number(qty) || 0));
  if (nextQty <= 0) state.selected.delete(key);
  else {
    const existing = state.selected.get(key);
    const entry = { food, qty: nextQty };
    const optionSets = getEntryOptionSets({ ...(existing || {}), food, qty: nextQty });
    if (optionSets.length) {
      entry.optionSets = optionSets;
      entry.options = optionSets[0] || {};
    }
    state.selected.set(key, entry);
  }
  renderFoods();
  renderSelection();
}

function setFoodOption(key, portionIndex, groupIndex, label, checked, single) {
  const entry = state.selected.get(key);
  if (!entry) return;
  const optionSets = getEntryOptionSets(entry);
  const targetIndex = Math.max(0, Math.floor(Number(portionIndex) || 0));
  const options = normalizeOptionSet(optionSets[targetIndex] || {});
  const current = Array.isArray(options[groupIndex]) ? [...options[groupIndex]] : [];
  if (single) {
    options[groupIndex] = checked ? [label] : [];
  } else if (checked && !current.includes(label)) {
    current.push(label);
    options[groupIndex] = current;
  } else if (!checked) {
    options[groupIndex] = current.filter(item => item !== label);
  }
  optionSets[targetIndex] = options;
  state.selected.set(key, { ...entry, optionSets, options: optionSets[0] || {} });
  renderSelection();
}

function renderOrders() {
  const orders = state.orders || [];
  if (!orders.length) {
    el.ordersBody.innerHTML = `<tr><td colspan="7">${escapeHtml(t('noOrders'))}</td></tr>`;
    el.ordersTotal.textContent = money(0);
    el.drinkSummary.textContent = '';
    el.foodSummary.textContent = '';
    el.foodSummaryByDept.textContent = '';
    return;
  }
  let total = 0;
  el.ordersBody.innerHTML = orders.map((order, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(order.dept || '')}</td>
      <td>${escapeHtml(order.name || '')}</td>
      <td>${escapeHtml(displayOrderFood(order.food || ''))}</td>
      <td>${escapeHtml(displayAddon(order.addon || ''))}</td>
      <td>${escapeHtml(displayOrderDrink(order.drink || '') || t('noDrink').replace(/-/g, '').trim())}</td>
      <td>${money(order.price)}</td>
    </tr>
  `).join('');

  const drinkByDept = {};
  const foodCounts = {};
  const foodByDept = {};
  orders.forEach((order, index) => {
    const dept = String(order.dept || '').trim() || '-';
    total += Number(order.price || 0);
    parseOrderDrinks(order).forEach(drink => {
      if (!drinkByDept[dept]) drinkByDept[dept] = {};
      drinkByDept[dept][drink] = (drinkByDept[dept][drink] || 0) + 1;
    });
    parseOrderFoodItems(order).forEach(({ key, label, qty }) => {
      if (!label) return;
      const foodKey = key || label;
      if (!foodCounts[foodKey]) foodCounts[foodKey] = { label, count: 0, numbers: [] };
      foodCounts[foodKey].label = label;
      foodCounts[foodKey].count += qty;
      if (!foodCounts[foodKey].numbers.includes(index + 1)) foodCounts[foodKey].numbers.push(index + 1);
      if (!foodByDept[dept]) foodByDept[dept] = {};
      if (!foodByDept[dept][foodKey]) foodByDept[dept][foodKey] = { label, count: 0, numbers: [] };
      foodByDept[dept][foodKey].label = label;
      foodByDept[dept][foodKey].count += qty;
      if (!foodByDept[dept][foodKey].numbers.includes(index + 1)) foodByDept[dept][foodKey].numbers.push(index + 1);
    });
  });

  el.ordersTotal.textContent = money(total);
  el.drinkSummary.innerHTML = Object.entries(drinkByDept).map(([dept, drinks]) => {
    const count = Object.values(drinks).reduce((sum, n) => sum + Number(n || 0), 0);
    const lines = Object.entries(drinks).map(([drink, qty]) => `- ${escapeHtml(drink)} x ${qty}`).join('<br>');
    return `<strong>${escapeHtml(dept)}:</strong> <strong>Total: <span class="changed">${count}</span></strong><br>${lines}`;
  }).join('<br><br>');
  el.foodSummary.innerHTML = Object.entries(foodCounts)
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0], 'zh-Hant'))
    .map(([, entry]) => formatFoodSummaryLine(entry.label, entry))
    .join('<br>');
  el.foodSummaryByDept.innerHTML = Object.entries(foodByDept).map(([dept, foods]) => {
    const count = Object.values(foods).reduce((sum, entry) => sum + Number(entry.count || 0), 0);
    const lines = Object.entries(foods).map(([, entry]) => formatFoodSummaryLine(entry.label, entry)).join('<br>');
    return `<strong>${escapeHtml(dept)}:</strong> <strong>Total: <span class="changed">${count}</span></strong><br>${lines}`;
  }).join('<br><br>');
  renderGroupMembers();
}

function orderSignature(orders) {
  return JSON.stringify((orders || []).map(order => [
    order.dept || '',
    order.name || '',
    order.food || '',
    Number(order.price || 0),
    order.addon || '',
    order.drink || ''
  ]));
}

function currentDrink(drink) {
  const parts = String(drink || '').split(' → ').map(part => part.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
}

function parseOrderDrinks(order) {
  return displayOrderDrink(String(order && order.drink || '').trim())
    .split(/\s+\+\s+/)
    .map(currentDrink)
    .filter(Boolean);
}

function parseOrderFoodItems(order) {
  const rawText = String(order.food || '').trim();
  const text = displayOrderFood(rawText);
  const addonRaw = displayAddon(order.addon || '');
  const addonKey = normalizeAddonForSummary(addonRaw);
  const addon = displayAddon(addonRaw);
  const rawParts = splitOrderFoodParts(rawText);
  const displayParts = splitOrderFoodParts(text);
  const parsedParts = displayParts.map((part, index) => parseFoodSummaryPart(part, rawParts[index] || part));
  const optionIndexes = parsedParts
    .map((part, index) => foodUsesAddonForSummary(part.raw, part.food) ? index : -1)
    .filter(index => index >= 0);
  const addonSegments = parseAddonSummarySegments(addonRaw);
  const hasOptionFood = optionIndexes.length > 0;
  const rows = [];

  parsedParts.forEach((part, index) => {
    if (!part.food) return;
    const isOptionFood = optionIndexes.includes(index);
    const matchingSegments = isOptionFood
      ? matchingAddonSegmentsForFood(addonSegments, part.food, rawParts[index] || part.food, optionIndexes.length)
      : [];
    if (matchingSegments.length) {
      matchingSegments.forEach(segment => {
        const label = `${part.food}（${segment.addon}）`;
        const key = `${part.food}||${segment.key}`;
        rows.push({ key, label, qty: segment.qty });
      });
      return;
    }
    const useAddon = addon && (!hasOptionFood || isOptionFood && !addonSegments.length);
    const label = useAddon ? `${part.food}（${addon}）` : part.food;
    const key = useAddon && addonKey ? `${part.food}||${addonKey}` : part.food;
    rows.push({ key, label, qty: part.qty });
  });
  return rows;
}

function parseFoodSummaryPart(value, rawValue) {
  const text = String(value || '').trim();
  if (!text) return { food: '', raw: String(rawValue || '').trim(), qty: 0 };
  const match = text.match(/\s+x\s*(\d+)\s*$/i);
  return {
    food: match ? text.slice(0, match.index).trim() : text,
    raw: String(rawValue || value || '').trim(),
    qty: match ? Math.max(1, Number(match[1]) || 1) : 1
  };
}

function parseAddonSummarySegments(addonText) {
  return String(addonText || '')
    .split(/[;；]+/)
    .map(segment => {
      let text = String(segment || '').trim();
      if (!text) return null;
      const prefixMatch = text.match(/^(.+?)\s*[:：]\s*(.+)$/);
      const food = prefixMatch ? displayOrderFood(prefixMatch[1].trim()) : '';
      text = prefixMatch ? prefixMatch[2].trim() : text;
      const qtyMatch = text.match(/\s+x\s*(\d+)\s*$/i);
      const qty = qtyMatch ? Math.max(1, Number(qtyMatch[1]) || 1) : 1;
      const addon = displayAddon(qtyMatch ? text.slice(0, qtyMatch.index).trim() : text);
      if (!addon) return null;
      return { food, addon, qty, key: normalizeAddonForSummary(addon) || addon };
    })
    .filter(Boolean);
}

function matchingAddonSegmentsForFood(segments, displayFood, rawFood, optionFoodCount) {
  const direct = segments.filter(segment => segment.food && foodLabelsMatch(segment.food, displayFood, rawFood));
  if (direct.length) return direct;
  const inferred = segments
    .filter(segment => !segment.food)
    .map(segment => inferAddonSegmentForFood(segment, displayFood, rawFood))
    .filter(Boolean);
  if (inferred.length) return inferred;
  return optionFoodCount === 1 ? segments.filter(segment => !segment.food) : [];
}

function inferAddonSegmentForFood(segment, displayFood, rawFood) {
  const source = String(segment && segment.addon || '').trim();
  const prefixes = [displayFood, rawFood, displayOrderFood(rawFood)]
    .map(value => String(value || '').replace(/\s+x\s*\d+\s*$/i, '').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  for (const prefix of prefixes) {
    const addon = stripFoodPrefixFromAddon(source, prefix);
    if (!addon) continue;
    const normalizedAddon = displayAddon(addon);
    return { ...segment, food: displayFood, addon: normalizedAddon, key: normalizeAddonForSummary(normalizedAddon) || normalizedAddon };
  }
  return null;
}

function stripFoodPrefixFromAddon(text, prefix) {
  const raw = String(text || '').trim();
  const target = compactSummaryPrefix(prefix);
  if (!raw || !target) return '';
  let consumed = '';
  for (let index = 0; index < raw.length; index += 1) {
    const compact = compactSummaryPrefix(raw[index]);
    if (!compact) continue;
    consumed += compact;
    if (!target.startsWith(consumed)) return '';
    if (consumed === target) {
      return raw.slice(index + 1).replace(/^[:：\s/、,，]+/, '').trim();
    }
  }
  return '';
}

function compactSummaryPrefix(value) {
  return String(value || '')
    .replace(/\s+x\s*\d+\s*$/i, '')
    .toLowerCase()
    .replace(/[\s/\\,，、()（）]/g, '');
}

function foodLabelsMatch(prefix, displayFood, rawFood) {
  const clean = value => String(value || '').replace(/\s+x\s*\d+\s*$/i, '').trim();
  const target = clean(prefix);
  if (!target) return false;
  const names = [displayFood, rawFood, displayOrderFood(rawFood)].map(clean).filter(Boolean);
  return names.includes(target);
}

function splitOrderFoodParts(value) {
  return String(value || '').split(/\s+\+\s+/).map(part => part.trim()).filter(Boolean);
}

function foodUsesAddonForSummary(rawFood, displayFoodName) {
  const clean = value => String(value || '').replace(/\s+x\s*\d+\s*$/i, '').trim();
  const raw = clean(rawFood);
  const display = clean(displayFoodName);
  const match = allFoods().find(food => {
    const names = [food.name, food.nameSc, food.nameEn, localFood(food)].map(clean);
    return names.includes(raw) || names.includes(display);
  });
  if (match && Array.isArray(match.optionGroups) && match.optionGroups.length) return true;
  return /雙拼|双拼|三拼|combination/i.test(raw) || /雙拼|双拼|三拼|combination/i.test(display);
}

function formatFoodSummaryLine(food, entry) {
  const numbers = Array.isArray(entry.numbers) ? entry.numbers.join(',') : '';
  const prefix = numbers ? `(${escapeHtml(numbers)}) - ` : '';
  return `- ${prefix}${escapeHtml(food)} x ${Number(entry.count || 0)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function linkifyText(value) {
  const text = String(value || '');
  const urlPattern = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
  let lastIndex = 0;
  let html = '';
  for (const match of text.matchAll(urlPattern)) {
    const urlText = match[0].replace(/[),.;!?]+$/g, '');
    const trailing = match[0].slice(urlText.length);
    html += escapeHtml(text.slice(lastIndex, match.index));
    const href = urlText.startsWith('www.') ? `https://${urlText}` : urlText;
    try {
      const parsed = new URL(href);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        const label = isMapUrl(parsed) ? t('mapAddress') : urlText;
        html += `<a href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
      } else {
        html += escapeHtml(urlText);
      }
    } catch {
      html += escapeHtml(urlText);
    }
    html += escapeHtml(trailing);
    lastIndex = match.index + match[0].length;
  }
  html += escapeHtml(text.slice(lastIndex));
  return html;
}

function isMapUrl(url) {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  return host.includes('google.') && path.includes('/maps')
    || host === 'maps.app.goo.gl'
    || host === 'goo.gl' && path.startsWith('/maps')
    || host.includes('maps.google.')
    || path.includes('/maps/');
}

async function load() {
  setBusy(true);
  try {
    const [settings, bootstrap] = await Promise.all([
      api('/api/new-settings'),
      api('/api/bootstrap')
    ]);
    state.priceLimit = Number(settings.priceLimit) || 22;
    state.restaurants = bootstrap.restaurants || [];
    state.restaurantContacts = bootstrap.restaurantContacts || {};
    state.staff = bootstrap.staff || {};
    state.drinks = bootstrap.drinks || [];
    state.menu = bootstrap.currentMenu || {};
    state.orders = bootstrap.orders || [];
    state.lastOrdersSignature = orderSignature(state.orders);
    state.currentRestaurant = bootstrap.currentRestaurant || '';
    state.cutoffTime = bootstrap.cutoffTime || '';
    state.cutoffPassed = Boolean(bootstrap.cutoffPassed);
    state.date = bootstrap.date || '';
    updateStaticText();
    renderDepartments();
    applyLastStaff();
    renderDrinks();
    renderCategories();
    renderSelection();
    renderOrders();
    updateDiagSummary();
    showAnnouncementIfNeeded(settings);
  } finally {
    setBusy(false);
  }
}

async function submitOrder() {
  const dept = el.deptSelect.value;
  const members = selectedOrderMembers();
  const name = members.join(' + ');
  if (!dept) return showToast(t('chooseDeptToast'));
  if (!name) return showToast(t('chooseNameToast'));
  const existingGroupSplitOrder = state.groupOrder.active
    ? findExistingOrderForMembers(dept, members, { allowGroupSplit: true })
    : null;
  if (state.groupOrder.active && members.length < 2 && !existingGroupSplitOrder) return showToast(t('chooseGroupMembersToast'));
  const entries = Array.from(state.selected.values());
  if (!entries.length) return showToast(t('chooseFoodToast'));

  const totals = getTotals();
  const optionValidation = validateSelectedOptions();
  if (!optionValidation.ok) return showToast(optionValidation.error);
  const effectiveLimit = getEffectivePriceLimit();
  if (totals.total > effectiveLimit) {
    return showToast(t('cannotOrderOver', money(totals.total - effectiveLimit)));
  }
  const food = entries.map(formatEntryOrderText).join(' + ');
  const addonRaw = String(el.addonInput.value || '').trim();
  const optionAddon = buildOrderOptionAddon(entries);
  const addon = [optionAddon, addonRaw].filter(Boolean).join('；');
  const order = {
    dept,
    name,
    groupMembers: members,
    food,
    addon,
    drink: selectedGroupDrinks().join(' + '),
    price: totals.total,
    allowGroupSplit: Boolean(state.groupOrder.active)
  };
  if (state.cutoffPassed && state.lateOrder.active) {
    order.lateOrder = true;
    order.lateOrderUsername = state.lateOrder.username;
    order.lateOrderPassword = state.lateOrder.password;
  }

  const existing = findExistingOrderForMembers(dept, members, { allowGroupSplit: Boolean(state.groupOrder.active) });
  if (existing && (orderIdentityKey(existing.dept, orderMemberNames(existing)) !== orderIdentityKey(dept, members) || !sameOrder(existing, order))) {
    const confirmed = await confirmOrderChange(existing, order);
    if (!confirmed) return;
  }

  try {
    setBusy(true);
    const payload = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify(order)
    });
    if (Array.isArray(payload.orders)) state.orders = payload.orders;
    else state.orders = await api('/api/orders').then(data => data.orders || []);
    state.lastOrdersSignature = orderSignature(state.orders);
    if (!state.groupOrder.active) saveLastStaff(dept, name);
    state.selected.clear();
    el.categorySelect.value = '';
    resetStaffForm();
    if (state.lateOrder.active) {
      state.lateOrder.active = false;
      state.lateOrder.password = '';
    }
    el.addonInput.value = '';
    renderFoods();
    renderSelection();
    renderOrders();
    updateDiagSummary();
    showToast(payload.updated ? t('orderUpdated') : t('orderAdded'));
  } catch (err) {
    showToast(err.message);
  } finally {
    setBusy(false);
  }
}

function resetStaffForm() {
  if (el.groupOrderToggle) el.groupOrderToggle.checked = false;
  state.groupOrder.active = false;
  state.groupOrder.members = new Set();
  state.groupOrder.drinks = [];
  const departments = Object.keys(state.staff || {});
  const single = departments.length === 1 ? departments[0] : '';
  el.deptSelect.value = single || '';
  renderNames();
  el.nameSelect.value = '';
  el.drinkSelect.value = '';
  renderGroupDrinks();
}

function openRestaurantModal() {
  fillSelect(el.restaurantSelect, (state.restaurants || []).map(restaurant => ({
    value: restaurant,
    label: state.lang === 'sc' ? toSc(restaurant) : restaurant
  })), t('selectRestaurant'));
  el.restaurantSelect.value = state.currentRestaurant || '';
  el.cutoffTimeInput.value = state.cutoffTime || '13:00';
  el.restaurantPasswordInput.value = '';
  el.restaurantModal.classList.remove('hidden');
  setTimeout(() => el.restaurantSelect.focus(), 0);
}

function closeRestaurantModal() {
  el.restaurantModal.classList.add('hidden');
  el.restaurantPasswordInput.value = '';
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
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-card">
      <h3>${escapeHtml(t('announcementTitle'))}</h3>
      <div class="announcement-message">${escapeHtml(message)}</div>
      <div class="modal-actions">
        <button id="announcementHideBtn" class="btn btn-light" type="button">${escapeHtml(t('announcementDontShow'))}</button>
        <button id="announcementOkBtn" class="btn" type="button">${escapeHtml(t('announcementOk'))}</button>
      </div>
    </div>`;
  const close = () => {
    announcementDismissedVersions.add(version);
    modal.classList.add('hidden');
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
}

async function saveRestaurantSettings() {
  const restaurant = String(el.restaurantSelect.value || '').trim();
  const cutoffTime = String(el.cutoffTimeInput.value || '').trim();
  const password = String(el.restaurantPasswordInput.value || '').trim();
  if (!restaurant) return showToast(t('chooseRestaurantFirst'));
  const changingRestaurant = Boolean(state.currentRestaurant && restaurant !== state.currentRestaurant);
  try {
    setBusy(true);
    const payload = await api('/api/restaurant', {
      method: 'POST',
      body: JSON.stringify({ restaurant, cutoffTime, password, forceChange: changingRestaurant })
    });
    closeRestaurantModal();
    await load();
    if (payload.restaurantChanged || payload.cleared) showToast(t('restaurantChanged'));
    else if (payload.cutoffChanged) showToast(t('cutoffUpdated'));
    else showToast(t('restaurantSet'));
  } catch (err) {
    showToast(err.message);
    el.restaurantPasswordInput.value = '';
    el.restaurantPasswordInput.focus();
  } finally {
    setBusy(false);
  }
}

async function exportXlsx() {
  if (!window.XLSX) return showToast(t('xlsxMissing'));
  try {
    setBusy(true);
    const payload = await api(`/api/orders?_=${Date.now()}`);
    const orders = payload.orders || [];
    const header = ['No', t('dept'), t('name'), t('food'), t('addon'), t('drink'), t('price')];
    const rows = orders.map((order, index) => [
      index + 1,
      order.dept || '',
      order.name || '',
      displayOrderFood(order.food || ''),
      displayAddon(order.addon || ''),
      displayOrderDrink(order.drink || ''),
      Number(order.price || 0)
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!autofilter'] = { ref: `A1:G${Math.max(1, rows.length + 1)}` };
    ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 18 }, { wch: 36 }, { wch: 22 }, { wch: 18 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `orders-${state.date || new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (err) {
    showToast(err.message);
  } finally {
    setBusy(false);
  }
}

async function refreshOrdersSilently() {
  if (refreshOrdersSilently.inFlight) return;
  refreshOrdersSilently.inFlight = true;
  try {
    const payload = await api(`/api/orders?_=${Date.now()}`);
    const incoming = payload.orders || [];
    const signature = orderSignature(incoming);
    const previousRestaurant = state.currentRestaurant;
    const previousCutoffTime = state.cutoffTime;
    state.currentRestaurant = payload.currentRestaurant || state.currentRestaurant;
    state.cutoffTime = payload.cutoffTime || state.cutoffTime;
    state.cutoffPassed = Boolean(payload.cutoffPassed);
    if (state.currentRestaurant !== previousRestaurant || state.cutoffTime !== previousCutoffTime) {
      updateStaticText();
    }
    if (signature !== state.lastOrdersSignature) {
      state.orders = incoming;
      state.lastOrdersSignature = signature;
      renderOrders();
      updateDiagSummary();
    }
  } catch {
  } finally {
    refreshOrdersSilently.inFlight = false;
  }
}

function startAutoRefresh() {
  if (startAutoRefresh.timer) clearInterval(startAutoRefresh.timer);
  startAutoRefresh.timer = setInterval(() => {
    if (document.hidden) return;
    refreshOrdersSilently();
  }, 5000);
}

function buildEntryFoodText(entry) {
  const foodName = entry && entry.food ? entry.food.name : '';
  return foodName;
}

function formatEntryOrderText(entry) {
  const text = buildEntryFoodText(entry);
  const qty = Number(entry && entry.qty || 0);
  return qty > 1 ? `${text} x${qty}` : text;
}

function buildEntryOptionText(entry) {
  const groups = Array.isArray(entry.food.optionGroups) ? entry.food.optionGroups : [];
  const optionSets = getEntryOptionSets(entry);
  if (optionSets.length) {
    const counts = {};
    optionSets.forEach(optionSet => {
      const text = buildOptionSetText(entry, optionSet);
      if (!text) return;
      counts[text] = (counts[text] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([text, count]) => count > 1 ? `${text} x${count}` : text)
      .join('；');
  }
  const parts = [];
  groups.forEach((group, index) => {
    const selected = Array.isArray(entry.options && entry.options[index]) ? entry.options[index] : [];
    if (!selected.length) return;
    parts.push(selected.map(orderOptionLabel).join('+'));
  });
  return parts.join(', ');
}

function buildOptionSetText(entry, optionSet) {
  const groups = Array.isArray(entry.food.optionGroups) ? entry.food.optionGroups : [];
  const parts = [];
  groups.forEach((group, index) => {
    const selected = Array.isArray(optionSet && optionSet[index]) ? optionSet[index] : [];
    if (!selected.length) return;
    parts.push(selected.map(localOptionLabel).join('+'));
  });
  return parts.join(', ');
}

function buildOrderOptionAddon(entries) {
  const optionEntries = (entries || [])
    .map(entry => ({ entry, text: buildEntryOptionText(entry) }))
    .filter(item => item.text);
  const needsFoodPrefix = optionEntries.length > 1;
  return optionEntries
    .map(({ entry, text }) => needsFoodPrefix ? `${entry.food.name}: ${text}` : text)
    .join('；');
}

function sameOrder(a, b) {
  return String(a.food || '') === String(b.food || '')
    && String(a.addon || '') === String(b.addon || '')
    && String(a.drink || '') === String(b.drink || '')
    && Number(a.price || 0) === Number(b.price || 0);
}

function describeOrder(order) {
  const parts = [displayOrderFood(order.food || '')];
  const addon = displayAddon(order.addon || '');
  if (addon) parts.push(addon);
  if (order.drink) parts.push(displayOrderDrink(order.drink || ''));
  parts.push(money(order.price || 0));
  return parts.filter(Boolean).join(' / ');
}

function confirmOrderChange(existing, next) {
  return new Promise(resolve => {
    el.confirmMessage.innerHTML = t(
      'changeMessage',
      escapeHtml(next.name || existing.name || ''),
      escapeHtml(describeOrder(existing)),
      escapeHtml(describeOrder(next))
    );
    el.confirmModal.classList.remove('hidden');

    const cleanup = () => {
      el.confirmChangeBtn.removeEventListener('click', onConfirm);
      el.cancelChangeBtn.removeEventListener('click', onCancel);
      el.confirmModal.classList.add('hidden');
    };
    const onConfirm = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    el.confirmChangeBtn.addEventListener('click', onConfirm);
    el.cancelChangeBtn.addEventListener('click', onCancel);
  });
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
  const clearHold = () => clearTimeout(holdTimer);
  node.addEventListener('pointerup', handleTap);
  node.addEventListener('pointerdown', startHold);
  node.addEventListener('pointerleave', clearHold);
  node.addEventListener('pointercancel', clearHold);
  node.addEventListener('pointerup', clearHold);
}

function openAdminAccess() {
  window.location.href = '/admin/';
}

async function openLateOrderAccess() {
  if (!state.cutoffPassed) return showToast(t('lateOnlyAfterCutoff'));
  try {
    setBusy(true);
    const usersPayload = await api('/api/late-order/users');
    const users = Array.isArray(usersPayload.users) ? usersPayload.users : [];
    if (!users.length) return showToast(t('lateNoUsers'));
    showLateOrderModal(users);
  } catch (err) {
    showToast(err.message);
  } finally {
    setBusy(false);
  }
}

async function openDrinkChangeAccess() {
  try {
    setBusy(true);
    if (!state.orders.length) return showToast(t('drinkChangeNoOrders'));
    const usersPayload = await api('/api/late-order/users');
    const users = Array.isArray(usersPayload.users) ? usersPayload.users : [];
    if (!users.length) return showToast(t('lateNoUsers'));
    showDrinkChangeAuthModal(users);
  } catch (err) {
    showToast(err.message);
  } finally {
    setBusy(false);
  }
}

function userOptions(users) {
  return users.map(user => `<option value="${escapeHtml(user.username || '')}">${escapeHtml(user.username || '')}</option>`).join('');
}

function showLateOrderModal(users) {
  let modal = document.getElementById('lateOrderModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lateOrderModal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-card">
      <h3>${escapeHtml(t('lateOrderTitle'))}</h3>
      <p>${escapeHtml(t('lateOrderHint'))}</p>
      <div class="modal-fields">
        <label>
          <span>${escapeHtml(t('lateOrderUser'))}</span>
          <select id="lateOrderUserSelect">${userOptions(users)}</select>
        </label>
        <label>
          <span>${escapeHtml(t('lateOrderPassword'))}</span>
          <input id="lateOrderPasswordInput" type="password" />
        </label>
      </div>
      <div class="modal-actions">
        <button id="lateOrderCancelBtn" class="btn btn-light" type="button">${escapeHtml(t('cancel'))}</button>
        <button id="lateOrderLoginBtn" class="btn" type="button">${escapeHtml(t('lateOrderLogin'))}</button>
      </div>
    </div>`;
  const close = () => modal.classList.add('hidden');
  const authorize = async () => {
    const username = String(modal.querySelector('#lateOrderUserSelect').value || '').trim();
    const password = String(modal.querySelector('#lateOrderPasswordInput').value || '').trim();
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
      close();
      showToast(t('lateEnabled'));
    } catch (err) {
      showToast(err.message);
      const input = modal.querySelector('#lateOrderPasswordInput');
      if (input) {
        input.value = '';
        input.focus();
      }
    } finally {
      setBusy(false);
    }
  };
  modal.querySelector('#lateOrderCancelBtn').addEventListener('click', close);
  modal.querySelector('#lateOrderLoginBtn').addEventListener('click', authorize);
  modal.querySelector('#lateOrderPasswordInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') authorize();
  });
  modal.onclick = event => {
    if (event.target === modal) close();
  };
  modal.classList.remove('hidden');
  setTimeout(() => modal.querySelector('#lateOrderPasswordInput')?.focus(), 0);
}

function showDrinkChangeAuthModal(users) {
  let modal = document.getElementById('drinkChangeAuthModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'drinkChangeAuthModal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-card">
      <h3>${escapeHtml(t('drinkChangeTitle'))}</h3>
      <p>${escapeHtml(t('drinkChangeHint'))}</p>
      <div class="modal-fields">
        <label>
          <span>${escapeHtml(t('lateOrderUser'))}</span>
          <select id="drinkChangeUserSelect">${userOptions(users)}</select>
        </label>
        <label>
          <span>${escapeHtml(t('lateOrderPassword'))}</span>
          <input id="drinkChangePasswordInput" type="password" />
        </label>
      </div>
      <div class="modal-actions">
        <button id="drinkChangeAuthCancelBtn" class="btn btn-light" type="button">${escapeHtml(t('cancel'))}</button>
        <button id="drinkChangeAuthLoginBtn" class="btn" type="button">${escapeHtml(t('confirm'))}</button>
      </div>
    </div>`;
  const close = () => modal.classList.add('hidden');
  const authorize = async () => {
    const username = String(modal.querySelector('#drinkChangeUserSelect').value || '').trim();
    const password = String(modal.querySelector('#drinkChangePasswordInput').value || '').trim();
    if (!password) return showToast(t('lateOrderPasswordRequired'));
    try {
      setBusy(true);
      await api('/api/late-order/authorize', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      close();
      showDrinkChangeModal(username, password);
    } catch (err) {
      showToast(err.message);
      const input = modal.querySelector('#drinkChangePasswordInput');
      if (input) {
        input.value = '';
        input.focus();
      }
    } finally {
      setBusy(false);
    }
  };
  modal.querySelector('#drinkChangeAuthCancelBtn').addEventListener('click', close);
  modal.querySelector('#drinkChangeAuthLoginBtn').addEventListener('click', authorize);
  modal.querySelector('#drinkChangePasswordInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') authorize();
  });
  modal.onclick = event => {
    if (event.target === modal) close();
  };
  modal.classList.remove('hidden');
  setTimeout(() => modal.querySelector('#drinkChangePasswordInput')?.focus(), 0);
}

function showDrinkChangeModal(username, password) {
  let modal = document.getElementById('drinkChangeModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'drinkChangeModal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }
  const drinks = (state.drinks || []).map(normalizeDrink).filter(drink => drink.tc && !drink.paused);
  const rows = (state.orders || []).map((order, index) => {
    const current = currentDrink(String(order.drink || '').trim());
    const options = [`<option value="">${escapeHtml(t('noDrink').replace(/-/g, '').trim())}</option>`]
      .concat(drinks.map(drink => {
        const selected = drink.tc === current ? ' selected' : '';
        return `<option value="${escapeHtml(drink.tc)}"${selected}>${escapeHtml(localDrink(drink))}</option>`;
      })).join('');
    return `<tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(order.dept || '')}</td>
      <td>${escapeHtml(order.name || '')}</td>
      <td>${escapeHtml(displayOrderDrink(order.drink || '') || t('noDrink').replace(/-/g, '').trim())}</td>
      <td><select class="drink-change-select" data-dept="${escapeHtml(order.dept || '')}" data-name="${escapeHtml(order.name || '')}" data-current="${escapeHtml(current)}">${options}</select></td>
    </tr>`;
  }).join('');
  modal.innerHTML = `
    <div class="modal-card wide-modal">
      <h3>${escapeHtml(t('drinkChangeTitle'))}</h3>
      <div class="table-wrap drink-change-table">
        <table>
          <thead><tr><th>#</th><th>${escapeHtml(t('dept'))}</th><th>${escapeHtml(t('name'))}</th><th>${escapeHtml(t('drink'))}</th><th>${escapeHtml(t('newDrink'))}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="modal-actions">
        <button id="drinkChangeCancelBtn" class="btn btn-light" type="button">${escapeHtml(t('cancel'))}</button>
        <button id="drinkChangeSaveBtn" class="btn" type="button">${escapeHtml(t('drinkChangeSave'))}</button>
      </div>
    </div>`;
  modal.classList.remove('hidden');
  modal.querySelector('#drinkChangeCancelBtn').addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('#drinkChangeSaveBtn').addEventListener('click', () => saveDrinkChanges(username, password, modal));
}

async function saveDrinkChanges(username, password, modal) {
  const changes = Array.from(modal.querySelectorAll('.drink-change-select'))
    .map(select => ({
      dept: select.dataset.dept,
      name: select.dataset.name,
      current: select.dataset.current,
      drink: select.value
    }))
    .filter(change => change.drink !== change.current);
  if (!changes.length) return showToast(t('drinkChangeNoChanges'));
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
    modal.classList.add('hidden');
    renderOrders();
    showToast(t('drinkChangeSaved'));
  } catch (err) {
    showToast(err.message);
  } finally {
    setBusy(false);
  }
}

el.deptSelect.addEventListener('change', renderNames);
el.nameSelect.addEventListener('change', renderSelection);
el.groupOrderToggle.addEventListener('change', () => {
  state.groupOrder.active = el.groupOrderToggle.checked;
  state.groupOrder.members = new Set();
  if (state.groupOrder.active && el.nameSelect.value && !memberHasDifferentOrder(el.deptSelect.value, el.nameSelect.value, [])) {
    state.groupOrder.members.add(el.nameSelect.value);
  }
  renderGroupMembers();
  renderSelection();
});
el.groupMembersList.addEventListener('change', event => {
  const input = event.target;
  if (!input || input.dataset.action !== 'group-member') return;
  const name = String(input.value || '').trim();
  if (!name) return;
  if (input.checked) state.groupOrder.members.add(name);
  else state.groupOrder.members.delete(name);
  renderGroupMembers();
  renderSelection();
});
el.groupDrinksList.addEventListener('change', event => {
  const select = event.target;
  if (!select || select.dataset.action !== 'group-drink') return;
  const index = Number(select.dataset.index);
  if (!Number.isFinite(index) || index < 0) return;
  state.groupOrder.drinks[index] = select.value;
});
el.categorySelect.addEventListener('change', renderFoods);
if (el.priceSortSelect) el.priceSortSelect.addEventListener('change', renderFoods);
el.langTc.addEventListener('click', () => setLanguage('tc'));
el.langSc.addEventListener('click', () => setLanguage('sc'));
el.langEn.addEventListener('click', () => setLanguage('en'));
el.openRestaurantModalBtn.addEventListener('click', openRestaurantModal);
el.cancelRestaurantBtn.addEventListener('click', closeRestaurantModal);
el.setRestaurantBtn.addEventListener('click', saveRestaurantSettings);
el.exportXlsxBtn.addEventListener('click', exportXlsx);
el.restaurantModal.addEventListener('click', event => {
  if (event.target === el.restaurantModal) closeRestaurantModal();
});
bindHiddenTrigger(el.restaurantTitle, openAdminAccess);
bindHiddenTrigger(el.staffTitle, openLateOrderAccess, { allowHold: false });
bindHiddenTrigger(el.foodTitle, openDrinkChangeAccess, { allowHold: false });
el.submitBtn.addEventListener('click', submitOrder);
el.foodList.addEventListener('click', event => {
  const item = event.target.closest('.food-item');
  if (!item) return;
  const key = item.dataset.key;
  const current = state.selected.get(key);
  const qty = current ? current.qty : 0;
  const action = event.target.dataset.action;
  if (action === 'plus') setFoodQty(key, qty + 1);
  if (action === 'minus') setFoodQty(key, qty - 1);
});
el.foodList.addEventListener('change', event => {
  if (event.target.dataset.action !== 'qty') return;
  const item = event.target.closest('.food-item');
  if (!item) return;
  setFoodQty(item.dataset.key, event.target.value);
});
el.selectionList.addEventListener('change', event => {
  const input = event.target;
  if (input.dataset.action === 'option') {
    setFoodOption(input.dataset.key, input.dataset.portion, input.dataset.group, input.value, input.checked, input.type === 'radio');
    return;
  }
  if (input.dataset.action === 'selected-qty') {
    const item = input.closest('.selected-line');
    if (!item) return;
    setFoodQty(item.dataset.key, input.value);
  }
});
el.selectionList.addEventListener('click', event => {
  const action = event.target.dataset.action;
  if (!action || !action.startsWith('selected-')) return;
  const item = event.target.closest('.selected-line');
  if (!item) return;
  const key = item.dataset.key;
  const current = state.selected.get(key);
  const qty = current ? current.qty : 0;
  if (action === 'selected-plus') setFoodQty(key, qty + 1);
  if (action === 'selected-minus') setFoodQty(key, qty - 1);
  if (action === 'selected-remove') setFoodQty(key, 0);
});

state.lang = detectLang();
updateStaticText();
load().catch(err => showToast(err.message));
startAutoRefresh();
