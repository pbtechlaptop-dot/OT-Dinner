const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

let createClient = null;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch {
  createClient = null;
}

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const CHANGE_PASSWORD = process.env.CHANGE_PASSWORD || '1234';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || CHANGE_PASSWORD;
const LADY_RUBY_PASSWORD = process.env.LADY_RUBY_PASSWORD || '7777';

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const SEED_FILE = path.join(DATA_DIR, 'seed.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const LADY_RUBY_STATE_FILE = path.join(DATA_DIR, 'state.lady-ruby.json');
const DRINK_FLAGS_FILE = path.join(DATA_DIR, 'drink-flags.json');
const ADMIN_USERS_FILE = path.join(DATA_DIR, 'admin-users.json');
const ADMIN_LOGS_FILE = path.join(DATA_DIR, 'admin-logs.json');
const RESTAURANT_CONTACTS_FILE = path.join(DATA_DIR, 'restaurant-contacts.json');
const APP_MAIN = 'main';
const APP_LADY_RUBY = 'lady-ruby';
const APP_IDS = new Set([APP_MAIN, APP_LADY_RUBY]);
const LADY_RUBY_COOKIE = 'lady_ruby_access';
const APP_STATE_ROW_IDS = {
  [APP_MAIN]: 1,
  [APP_LADY_RUBY]: 2
};

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Pacific/Auckland';
const SUPABASE_KEY_ROLE = (() => {
  try {
    if (String(SUPABASE_SERVICE_ROLE_KEY || '').startsWith('sb_secret_')) return 'service_role';
    if (String(SUPABASE_SERVICE_ROLE_KEY || '').startsWith('sb_publishable_')) return 'anon';
    const parts = String(SUPABASE_SERVICE_ROLE_KEY || '').split('.');
    if (parts.length < 2) return '';
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return String(payload.role || '');
  } catch {
    return '';
  }
})();
const USE_SUPABASE = Boolean(createClient && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const supabase = USE_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

const TABLES = {
  restaurants: process.env.SUPABASE_TABLE_RESTAURANTS || 'restaurants',
  drinks: process.env.SUPABASE_TABLE_DRINKS || 'drinks',
  staff: process.env.SUPABASE_TABLE_STAFF || 'staff',
  menus: process.env.SUPABASE_TABLE_MENUS || 'menus',
  restaurantContacts: process.env.SUPABASE_TABLE_RESTAURANT_CONTACTS || 'restaurant_contacts',
  appState: process.env.SUPABASE_TABLE_APP_STATE || 'app_state',
  orders: process.env.SUPABASE_TABLE_ORDERS || 'orders',
  adminUsers: process.env.SUPABASE_TABLE_ADMIN_USERS || 'admin_users',
  adminLogs: process.env.SUPABASE_TABLE_ADMIN_LOGS || 'admin_logs'
};

const DEFAULT_CUTOFF_TIME = '13:00';
const SEED_CACHE_TTL_MS = Number(process.env.SEED_CACHE_TTL_MS || 30000);
const AUTH_WINDOW_MS = Number(process.env.AUTH_WINDOW_MS || 10 * 60 * 1000);
const AUTH_MAX_FAILURES = Number(process.env.AUTH_MAX_FAILURES || 8);
const ADMIN_USER_KV_KEY = 'admin_users';
const ADMIN_PERMISSION_ALL = '*';
const ADMIN_PERMISSIONS = [
  'import',
  'restaurants',
  'drinks',
  'staff',
  'menus',
  'reset_main',
  'reset_lady_ruby',
  'late_order',
  'users'
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const seedCache = {
  value: null,
  expiresAt: 0
};

const authFailures = new Map();

function assertSupabaseServiceRole() {
  if (!USE_SUPABASE) return;
  if (SUPABASE_KEY_ROLE === 'service_role') return;
  throw new Error(`SUPABASE_SERVICE_ROLE_KEY is not a service_role key (current role: ${SUPABASE_KEY_ROLE || 'unknown'}). Replace it with the real service_role key in Vercel and .env.production.vercel.`);
}

function defaultAdminUsers() {
  return [];
}

function defaultAdminLogs() {
  return [];
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeOrderTimestamp(value) {
  const raw = normText(value);
  if (!raw) return '';
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
}

function uniqueSortedTextList(items) {
  return [...new Set((Array.isArray(items) ? items : []).map(v => normText(v)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function summarizeItems(items, limit = 5) {
  const list = uniqueSortedTextList(items);
  if (!list.length) return '';
  if (list.length <= limit) return list.join('、');
  return `${list.slice(0, limit).join('、')} 等 ${list.length} 項`;
}

function makeLogChange(label, items) {
  const normalizedItems = uniqueSortedTextList(items);
  if (!normalizedItems.length) return null;
  return { label: normText(label), items: normalizedItems };
}

function makeLogSummary(changes) {
  const list = (Array.isArray(changes) ? changes : []).filter(change => change && change.label && Array.isArray(change.items) && change.items.length);
  return list.map(change => `${change.label} ${change.items.length} 項`).join('；');
}

function normalizeAdminLogEntry(input) {
  if (!input || typeof input !== 'object') return null;
  const createdAt = normText(input.createdAt || input.created_at) || nowIso();
  const username = normText(input.username).toLowerCase() || 'admin';
  const action = normText(input.action) || 'save';
  const section = normText(input.section) || 'all';
  const summary = normText(input.summary) || '已更新資料';
  const details = input.details && typeof input.details === 'object' ? input.details : {};
  const id = normText(input.id) || `${createdAt}-${username}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, createdAt, username, action, section, summary, details };
}

function normalizeAdminLogs(input) {
  return (Array.isArray(input) ? input : [])
    .map(normalizeAdminLogEntry)
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function mapDrinksByKey(seedInput) {
  const seed = normalizeSeed(seedInput);
  const map = new Map();
  (seed.drinks || []).forEach(drink => {
    const key = normText(drink.tc);
    if (!key) return;
    map.set(key, {
      tc: key,
      sc: normText(drink.sc) || key,
      en: normText(drink.en) || key,
      paused: Boolean(drink.paused)
    });
  });
  return map;
}

function mapMenuItemsByKey(seedInput) {
  const seed = normalizeSeed(seedInput);
  const map = new Map();
  Object.keys(seed.menus || {}).forEach(restaurant => {
    Object.keys(seed.menus[restaurant] || {}).forEach(category => {
      (seed.menus[restaurant][category] || []).forEach(item => {
        const nameTc = normText(item.nameTc);
        if (!nameTc) return;
        map.set(`${restaurant}|${category}|${nameTc}`, {
          restaurant,
          category,
          nameTc,
          nameSc: normText(item.nameSc) || nameTc,
          nameEn: normText(item.nameEn) || nameTc,
          price: Number(item.price || 0),
          paused: Boolean(item.paused)
        });
      });
    });
  });
  return map;
}

function buildSeedLogDetails(beforeSeedInput, afterSeedInput, section = 'all') {
  const beforeSeed = normalizeSeed(beforeSeedInput);
  const afterSeed = normalizeSeed(afterSeedInput);
  const changes = [];
  const normalizedSection = normText(section).toLowerCase() || 'all';
  const includeAll = normalizedSection === 'all' || normalizedSection === 'import';
  const shouldInclude = key => includeAll || normalizedSection === key;

  if (shouldInclude('restaurants')) {
    changes.push(makeLogChange(
      '新增餐廳',
      afterSeed.restaurants.filter(name => !beforeSeed.restaurants.includes(name))
    ));
    changes.push(makeLogChange(
      '刪除餐廳',
      beforeSeed.restaurants.filter(name => !afterSeed.restaurants.includes(name))
    ));
  }

  if (shouldInclude('drinks')) {
    const beforeDrinks = mapDrinksByKey(beforeSeed);
    const afterDrinks = mapDrinksByKey(afterSeed);
    const addedDrinks = [];
    const removedDrinks = [];
    const updatedDrinks = [];
    afterDrinks.forEach((drink, key) => {
      if (!beforeDrinks.has(key)) {
        addedDrinks.push(drink.tc);
        return;
      }
      const prev = beforeDrinks.get(key);
      const diffParts = [];
      if (prev.sc !== drink.sc || prev.en !== drink.en) diffParts.push('名稱');
      if (prev.paused !== drink.paused) diffParts.push(drink.paused ? '已暫停' : '已恢復');
      if (diffParts.length) updatedDrinks.push(`${drink.tc} (${diffParts.join(' / ')})`);
    });
    beforeDrinks.forEach((drink, key) => {
      if (!afterDrinks.has(key)) removedDrinks.push(drink.tc);
    });
    changes.push(makeLogChange('新增飲品', addedDrinks));
    changes.push(makeLogChange('刪除飲品', removedDrinks));
    changes.push(makeLogChange('更新飲品', updatedDrinks));
  }

  if (shouldInclude('staff')) {
    const beforeDepartments = Object.keys(beforeSeed.staff || {});
    const afterDepartments = Object.keys(afterSeed.staff || {});
    changes.push(makeLogChange('新增部門', afterDepartments.filter(name => !beforeDepartments.includes(name))));
    changes.push(makeLogChange('刪除部門', beforeDepartments.filter(name => !afterDepartments.includes(name))));
    const addedStaff = [];
    const removedStaff = [];
    const departmentNames = [...new Set(beforeDepartments.concat(afterDepartments))];
    departmentNames.forEach(dept => {
      const beforeNames = uniqueSortedTextList(beforeSeed.staff && beforeSeed.staff[dept]);
      const afterNames = uniqueSortedTextList(afterSeed.staff && afterSeed.staff[dept]);
      afterNames.forEach(name => {
        if (!beforeNames.includes(name)) addedStaff.push(`${dept}: ${name}`);
      });
      beforeNames.forEach(name => {
        if (!afterNames.includes(name)) removedStaff.push(`${dept}: ${name}`);
      });
    });
    changes.push(makeLogChange('新增人員', addedStaff));
    changes.push(makeLogChange('刪除人員', removedStaff));
  }

  if (shouldInclude('menus')) {
    const beforeCategorySet = new Set();
    const afterCategorySet = new Set();
    Object.keys(beforeSeed.menus || {}).forEach(rest => {
      Object.keys(beforeSeed.menus[rest] || {}).forEach(cat => beforeCategorySet.add(`${rest} / ${cat}`));
    });
    Object.keys(afterSeed.menus || {}).forEach(rest => {
      Object.keys(afterSeed.menus[rest] || {}).forEach(cat => afterCategorySet.add(`${rest} / ${cat}`));
    });
    changes.push(makeLogChange('新增分類', Array.from(afterCategorySet).filter(key => !beforeCategorySet.has(key))));
    changes.push(makeLogChange('刪除分類', Array.from(beforeCategorySet).filter(key => !afterCategorySet.has(key))));

    const beforeMenus = mapMenuItemsByKey(beforeSeed);
    const afterMenus = mapMenuItemsByKey(afterSeed);
    const addedMenus = [];
    const removedMenus = [];
    const updatedMenus = [];
    afterMenus.forEach((item, key) => {
      if (!beforeMenus.has(key)) {
        addedMenus.push(`${item.restaurant} / ${item.category} / ${item.nameTc}`);
        return;
      }
      const prev = beforeMenus.get(key);
      const diffParts = [];
      if (prev.nameSc !== item.nameSc || prev.nameEn !== item.nameEn) diffParts.push('名稱');
      if (prev.price !== item.price) diffParts.push(`價錢 ${prev.price} -> ${item.price}`);
      if (prev.paused !== item.paused) diffParts.push(item.paused ? '已暫停' : '已恢復');
      if (diffParts.length) updatedMenus.push(`${item.restaurant} / ${item.category} / ${item.nameTc} (${diffParts.join(' / ')})`);
    });
    beforeMenus.forEach((item, key) => {
      if (!afterMenus.has(key)) removedMenus.push(`${item.restaurant} / ${item.category} / ${item.nameTc}`);
    });
    changes.push(makeLogChange('新增餐點', addedMenus));
    changes.push(makeLogChange('刪除餐點', removedMenus));
    changes.push(makeLogChange('更新餐點', updatedMenus));
  }

  return { changes: changes.filter(Boolean) };
}

function buildSeedLogEntry({ admin, section, merge, beforeSeed, afterSeed, added }) {
  const details = buildSeedLogDetails(beforeSeed, afterSeed, section);
  const detailSummary = makeLogSummary(details.changes);
  const importSummary = added ? formatImportAdded(added) : '';
  const summary = merge
    ? (importSummary ? `匯入資料: ${importSummary}` : '匯入資料，沒有新增項目')
    : (detailSummary || `已更新${section === 'all' ? '全部資料' : section}`);
  return normalizeAdminLogEntry({
    username: admin && admin.username,
    action: merge ? 'import' : 'save',
    section: section || 'all',
    summary,
    details: {
      ...(details || {}),
      added: added && typeof added === 'object' ? added : undefined
    }
  });
}

function describePermissions(permissions) {
  const normalized = uniqueSortedTextList(permissions);
  if (!normalized.length) return '沒有權限';
  if (normalized.includes(ADMIN_PERMISSION_ALL)) return '全部權限';
  return normalized.join('、');
}

function buildAdminUsersLogEntry(admin, beforeUsers, afterUsers) {
  const beforeMap = new Map(normalizeAdminUsers(beforeUsers).map(user => [user.username, user]));
  const afterMap = new Map(normalizeAdminUsers(afterUsers).map(user => [user.username, user]));
  const added = [];
  const removed = [];
  const updated = [];

  afterMap.forEach((user, username) => {
    if (!beforeMap.has(username)) {
      added.push(`${username} (${describePermissions(user.permissions)})`);
      return;
    }
    const prev = beforeMap.get(username);
    const diffParts = [];
    if (describePermissions(prev.permissions) !== describePermissions(user.permissions)) {
      diffParts.push(`權限: ${describePermissions(prev.permissions)} -> ${describePermissions(user.permissions)}`);
    }
    if (summarizeItems(prev.staffDepartments) !== summarizeItems(user.staffDepartments)) {
      diffParts.push(`部門: ${summarizeItems(prev.staffDepartments) || '全部'} -> ${summarizeItems(user.staffDepartments) || '全部'}`);
    }
    if (prev.passwordHash !== user.passwordHash) diffParts.push('密碼已更新');
    if (diffParts.length) updated.push(`${username} (${diffParts.join(' / ')})`);
  });

  beforeMap.forEach((user, username) => {
    if (!afterMap.has(username)) removed.push(username);
  });

  const changes = [
    makeLogChange('新增用戶', added),
    makeLogChange('刪除用戶', removed),
    makeLogChange('更新用戶', updated)
  ].filter(Boolean);

  return normalizeAdminLogEntry({
    username: admin && admin.username,
    action: 'users',
    section: 'users',
    summary: makeLogSummary(changes) || '已更新用戶與權限',
    details: { changes }
  });
}

function buildResetLogEntry(admin, appId) {
  const target = normalizeAppId(appId) === APP_LADY_RUBY ? 'Lady Ruby' : '主站';
  return normalizeAdminLogEntry({
    username: admin && admin.username,
    action: 'reset',
    section: normalizeAppId(appId) === APP_LADY_RUBY ? 'reset_lady_ruby' : 'reset_main',
    summary: `重置${target}今日訂單`,
    details: {
      app: normalizeAppId(appId),
      changes: [
        { label: '操作', items: [`已重置${target}今日訂單與餐廳設定`] }
      ]
    }
  });
}

function buildLoginLogEntry(admin) {
  return normalizeAdminLogEntry({
    username: admin && admin.username,
    action: 'login',
    section: 'login',
    summary: '登入後台',
    details: {
      changes: [
        { label: '操作', items: ['成功登入後台'] }
      ]
    }
  });
}

function normalizeAdminDepartments(input) {
  const list = Array.isArray(input) ? input : [];
  return [...new Set(list.map(v => normText(v)).filter(Boolean))];
}

function normalizeAdminUser(input) {
  if (!input || typeof input !== 'object') return null;
  const username = normText(input.username).toLowerCase();
  if (!username || username === 'admin') return null;
  const passwordHash = normText(input.passwordHash);
  const permissionsIn = Array.isArray(input.permissions) ? input.permissions : [];
  const permissions = [...new Set(
    permissionsIn
      .map(v => normText(v))
      .filter(v => v && (v === ADMIN_PERMISSION_ALL || ADMIN_PERMISSIONS.includes(v)))
  )];
  const staffDepartments = permissions.includes('staff')
    ? normalizeAdminDepartments(input.staffDepartments)
    : [];
  if (!passwordHash) return null;
  return {
    username,
    passwordHash,
    permissions: permissions.includes(ADMIN_PERMISSION_ALL) ? [ADMIN_PERMISSION_ALL] : permissions,
    staffDepartments
  };
}

function normalizeAdminUsers(input) {
  const list = Array.isArray(input) ? input : defaultAdminUsers();
  const out = [];
  const seen = new Set();
  list.map(normalizeAdminUser).filter(Boolean).forEach(user => {
    if (seen.has(user.username)) return;
    seen.add(user.username);
    out.push(user);
  });
  return out;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const key = crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
  return `scrypt$${salt}$${key}`;
}

function verifyPassword(password, storedHash) {
  const raw = String(storedHash || '');
  if (!raw.startsWith('scrypt$')) return false;
  const parts = raw.split('$');
  if (parts.length !== 3) return false;
  const [, salt, keyHex] = parts;
  const actual = crypto.scryptSync(String(password || ''), salt, 64);
  const expected = Buffer.from(keyHex, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function hasAdminPermission(user, permission) {
  if (!user) return false;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(ADMIN_PERMISSION_ALL) || perms.includes(permission);
}

function getAdminStaffDepartments(user) {
  if (!user || user.isRoot || !hasAdminPermission(user, 'staff')) return [];
  return normalizeAdminDepartments(user.staffDepartments);
}

function scopeSeedForAdmin(seedInput, admin) {
  const seed = normalizeSeed(seedInput);
  const allowedDepartments = getAdminStaffDepartments(admin);
  if (!allowedDepartments.length) return seed;
  const staff = {};
  allowedDepartments.forEach(dept => {
    if (Array.isArray(seed.staff[dept])) staff[dept] = seed.staff[dept];
  });
  return { ...seed, staff };
}

function mergeScopedStaffSeed(currentSeedInput, nextSeedInput, admin) {
  const currentSeed = normalizeSeed(currentSeedInput);
  const nextSeed = normalizeSeed(nextSeedInput);
  const allowedDepartments = getAdminStaffDepartments(admin);
  if (!allowedDepartments.length) return nextSeed;
  const mergedStaff = { ...(currentSeed.staff || {}) };
  allowedDepartments.forEach(dept => {
    mergedStaff[dept] = Array.isArray(nextSeed.staff && nextSeed.staff[dept]) ? nextSeed.staff[dept] : [];
  });
  return { ...nextSeed, staff: mergedStaff };
}

function mergeScopedMenuRestaurantSeed(currentSeedInput, nextSeedInput, menuRestaurant) {
  const currentSeed = normalizeSeed(currentSeedInput);
  const nextSeed = normalizeSeed(nextSeedInput);
  const restaurant = normText(menuRestaurant);
  if (!restaurant) return nextSeed;
  const mergedMenus = { ...(currentSeed.menus || {}) };
  if (Object.prototype.hasOwnProperty.call(nextSeed.menus || {}, restaurant)) {
    mergedMenus[restaurant] = nextSeed.menus[restaurant];
  } else {
    delete mergedMenus[restaurant];
  }
  return {
    ...currentSeed,
    menus: mergedMenus
  };
}

function todayISO() {
  try {
    // Use business timezone for day rollover instead of UTC midnight.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function currentTimeHM() {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

function normalizeCutoffTime(value) {
  const raw = normText(value);
  if (!raw) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw);
  return match ? `${match[1]}:${match[2]}` : null;
}

function isCutoffPassed(cutoffTime) {
  const cutoff = normalizeCutoffTime(cutoffTime);
  if (!cutoff) return false;
  return currentTimeHM() > cutoff;
}

function timeHMInAppTimezone(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString().slice(11, 16);
  }
}

function isLateOrderTimestamp(orderedAt, cutoffTime) {
  const cutoff = normalizeCutoffTime(cutoffTime);
  const orderedTime = timeHMInAppTimezone(orderedAt);
  return Boolean(cutoff && orderedTime && orderedTime > cutoff);
}

function sortOrdersForDisplay(orders) {
  return [...(Array.isArray(orders) ? orders : [])].sort((a, b) => {
    const aLate = Boolean(a && a.lateOrder);
    const bLate = Boolean(b && b.lateOrder);
    if (aLate !== bLate) return aLate ? 1 : -1;
    if (aLate && bLate) {
      const aTime = normalizeOrderTimestamp(a && a.orderedAt);
      const bTime = normalizeOrderTimestamp(b && b.orderedAt);
      if (aTime !== bTime) return String(aTime || '').localeCompare(String(bTime || ''));
    }
    const deptCompare = normText(a && a.dept).localeCompare(normText(b && b.dept));
    if (deptCompare) return deptCompare;
    return normText(a && a.name).localeCompare(normText(b && b.name));
  }).map((order, index) => ({ ...order, id: index + 1 }));
}

function defaultSeed() {
  return { restaurants: [], staff: {}, drinks: [], menus: {} };
}

function defaultState() {
  return { date: todayISO(), restaurant: null, cutoffTime: DEFAULT_CUTOFF_TIME, orders: [] };
}

function normalizeRestaurantContact(input) {
  if (!input || typeof input !== 'object') return null;
  const restaurant = normText(input.restaurant);
  if (!restaurant) return null;
  return {
    restaurant,
    phone: normText(input.phone),
    email: normText(input.email).toLowerCase(),
    note: normText(input.note)
  };
}

function normalizeRestaurantContacts(input) {
  const map = new Map();
  (Array.isArray(input) ? input : []).forEach(item => {
    const contact = normalizeRestaurantContact(item);
    if (!contact) return;
    if (contact.phone || contact.email || contact.note) map.set(contact.restaurant, contact);
  });
  return Array.from(map.values()).sort((a, b) => a.restaurant.localeCompare(b.restaurant));
}

function contactMapByRestaurant(contacts) {
  return normalizeRestaurantContacts(contacts).reduce((map, contact) => {
    map[contact.restaurant] = contact;
    return map;
  }, {});
}

function normalizeAppId(input) {
  const appId = normText(input).toLowerCase();
  return APP_IDS.has(appId) ? appId : APP_MAIN;
}

function stateFileForApp(appId) {
  return normalizeAppId(appId) === APP_LADY_RUBY ? LADY_RUBY_STATE_FILE : STATE_FILE;
}

function getScopedStaff(allStaff, appId) {
  if (normalizeAppId(appId) !== APP_LADY_RUBY) return allStaff;
  return ['Lady Ruby', 'Operation'].reduce((scoped, dept) => {
    const names = Array.isArray(allStaff && allStaff[dept]) ? allStaff[dept] : [];
    if (names.length) scoped[dept] = names;
    return scoped;
  }, {});
}

function defaultDrinkFlags() {
  return { paused: {} };
}

function normalizeDrinkFlags(input) {
  const source = input && typeof input === 'object' ? input : defaultDrinkFlags();
  const pausedIn = source.paused && typeof source.paused === 'object' ? source.paused : {};
  const paused = {};
  Object.keys(pausedIn).forEach(key => {
    const tc = normText(key);
    if (!tc) return;
    paused[tc] = Boolean(pausedIn[key]);
  });
  return { paused };
}

function readDrinkFlags() {
  return normalizeDrinkFlags(readJsonSafe(DRINK_FLAGS_FILE, defaultDrinkFlags()));
}

function writeDrinkFlags(flags) {
  try {
    writeJson(DRINK_FLAGS_FILE, normalizeDrinkFlags(flags));
  } catch {
    // Ignore read-only/serverless filesystem failures.
  }
}

function applyDrinkFlags(seedInput, flagsInput) {
  const seed = normalizeSeed(seedInput);
  const flags = normalizeDrinkFlags(flagsInput);
  seed.drinks = (seed.drinks || []).map(drink => ({
    ...drink,
    paused: Boolean(flags.paused[drink.tc])
  }));
  return seed;
}

function extractDrinkFlags(seedInput) {
  const seed = normalizeSeed(seedInput);
  const paused = {};
  (seed.drinks || []).forEach(drink => {
    if (drink && drink.tc) paused[drink.tc] = Boolean(drink.paused);
  });
  return { paused };
}

function readJsonSafe(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SEED_FILE)) writeJson(SEED_FILE, defaultSeed());
  if (!fs.existsSync(STATE_FILE)) writeJson(STATE_FILE, defaultState());
  if (!fs.existsSync(LADY_RUBY_STATE_FILE)) writeJson(LADY_RUBY_STATE_FILE, defaultState());
  if (!fs.existsSync(DRINK_FLAGS_FILE)) writeJson(DRINK_FLAGS_FILE, defaultDrinkFlags());
  if (!fs.existsSync(ADMIN_USERS_FILE)) writeJson(ADMIN_USERS_FILE, defaultAdminUsers());
}

function normText(v) {
  return String(v || '').trim();
}

function normalizeDrinkItem(d) {
  if (typeof d === 'string') {
    const tc = normText(d);
    return tc ? { tc, sc: tc, en: tc, paused: false } : null;
  }
  if (!d || typeof d !== 'object') return null;
  const tc = normText(d.tc || d.zhHant || d.name || d.label);
  const sc = normText(d.sc || d.zhHans || tc);
  const en = normText(d.en || d.eng || tc);
  if (!tc && !sc && !en) return null;
  return { tc: tc || sc || en, sc: sc || tc || en, en: en || tc || sc, paused: Boolean(d.paused) };
}

function normalizeOptionGroups(input) {
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
    const id = normText(group.id || group.key || String(i + 1));
    const label = normText(group.label || group.name || '');
    const choicesRaw = Array.isArray(group.choices || group.items) ? (group.choices || group.items) : [];
    const choices = choicesRaw.map(choice => {
      if (typeof choice === 'string' || typeof choice === 'number') {
        const text = normText(choice);
        if (!text) return null;
        const match = text.match(/^(.*?)(?:\s*\(\s*(?:\+|加)?\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*\)\s*|\s*(?:\+|加)\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*)$/);
        if (match) {
          const labelText = normText(match[1] || '');
          const price = Number(match[2] || match[3]);
          if (labelText && Number.isFinite(price) && price > 0) return { label: labelText, price };
        }
        return text;
      }
      if (!choice || typeof choice !== 'object') return null;
      const text = normText(choice.label || choice.name || choice.value || choice.text);
      if (!text) return null;
      const priceRaw = choice.price ?? choice.add ?? choice.extra;
      const price = Number(priceRaw);
      if (Number.isFinite(price) && price > 0) return { label: text, price };
      return text;
    }).filter(Boolean);
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

function normalizeMenuItem(item) {
  if (!item || typeof item !== 'object') return null;
  const nameTc = normText(item.nameTc || item.tc || item.name || item.nameChi);
  const nameSc = normText(item.nameSc || item.sc || nameTc);
  const nameEn = normText(item.nameEn || item.en || item.nameEng || nameTc);
  const price = Number(item.price);
  if (!nameTc || !Number.isFinite(price) || price < 0) return null;
  const optionGroups = normalizeOptionGroups(item.optionGroups ?? item.option_groups ?? item.options);
  const normalized = { nameTc, nameSc: nameSc || nameTc, nameEn: nameEn || nameTc, price, paused: Boolean(item.paused) };
  if (optionGroups.length) normalized.optionGroups = optionGroups;
  return normalized;
}

function normalizeSeed(input) {
  const seed = input && typeof input === 'object' ? input : defaultSeed();

  const restaurants = Array.isArray(seed.restaurants) ? seed.restaurants : [];
  const staff = seed.staff && typeof seed.staff === 'object' ? seed.staff : {};
  const drinks = Array.isArray(seed.drinks) ? seed.drinks : [];
  const menus = seed.menus && typeof seed.menus === 'object' ? seed.menus : {};

  const normalized = {
    restaurants: [...new Set(restaurants.map(normText).filter(Boolean))],
    staff: {},
    drinks: [],
    menus: {}
  };

  Object.keys(staff).forEach(dept => {
    const cleanDept = normText(dept);
    if (!cleanDept) return;
    const names = Array.isArray(staff[dept]) ? staff[dept] : [];
    normalized.staff[cleanDept] = [...new Set(names.map(normText).filter(Boolean))];
  });

  const drinkSet = new Set();
  drinks.map(normalizeDrinkItem).filter(Boolean).forEach(d => {
    const key = d.tc;
    if (!drinkSet.has(key)) {
      drinkSet.add(key);
      normalized.drinks.push(d);
    }
  });

    const restaurantSet = new Set(normalized.restaurants);
  Object.keys(menus).forEach(rest => {
    const cleanRest = normText(rest);
    if (!cleanRest || !restaurantSet.has(cleanRest)) return;
    const cats = menus[rest] && typeof menus[rest] === 'object' ? menus[rest] : {};
    Object.keys(cats).forEach(cat => {
      const cleanCat = normText(cat);
      if (!cleanCat) return;
      const items = Array.isArray(cats[cat]) ? cats[cat] : [];
      const cleanItems = items.map(normalizeMenuItem).filter(Boolean);
      if (!cleanItems.length) return;
      if (!normalized.menus[cleanRest]) normalized.menus[cleanRest] = {};
      normalized.menus[cleanRest][cleanCat] = cleanItems;
    });
  });

  return normalized;
}

function mergeSeeds(currentSeed, incomingSeed) {
  const current = normalizeSeed(currentSeed);
  const incoming = normalizeSeed(incomingSeed);
  const merged = defaultSeed();

  merged.restaurants = [...new Set([...(current.restaurants || []), ...(incoming.restaurants || [])])];

  const staff = {};
  const allDepts = new Set([
    ...Object.keys(current.staff || {}),
    ...Object.keys(incoming.staff || {})
  ]);
  allDepts.forEach(dept => {
    const names = [
      ...((current.staff && current.staff[dept]) || []),
      ...((incoming.staff && incoming.staff[dept]) || [])
    ];
    const unique = [...new Set(names.map(normText).filter(Boolean))];
    if (unique.length) staff[dept] = unique;
  });
  merged.staff = staff;

  const drinkMap = new Map();
  [...(current.drinks || []), ...(incoming.drinks || [])]
    .map(normalizeDrinkItem)
    .filter(Boolean)
    .forEach(d => {
      const key = d.tc;
      drinkMap.set(key, d);
    });
  merged.drinks = Array.from(drinkMap.values());

  const menus = {};
  const allRests = new Set([
    ...Object.keys(current.menus || {}),
    ...Object.keys(incoming.menus || {})
  ]);
  allRests.forEach(rest => {
    const allCats = new Set([
      ...Object.keys((current.menus && current.menus[rest]) || {}),
      ...Object.keys((incoming.menus && incoming.menus[rest]) || {})
    ]);
    allCats.forEach(cat => {
      const itemMap = new Map();
      const allItems = [
        ...(((current.menus && current.menus[rest] && current.menus[rest][cat]) || [])),
        ...(((incoming.menus && incoming.menus[rest] && incoming.menus[rest][cat]) || []))
      ];
      allItems.map(normalizeMenuItem).filter(Boolean).forEach(it => {
        if (!itemMap.has(it.nameTc)) itemMap.set(it.nameTc, it);
      });
      const list = Array.from(itemMap.values());
      if (list.length) {
        if (!menus[rest]) menus[rest] = {};
        menus[rest][cat] = list;
      }
    });
  });
  merged.menus = menus;

  return normalizeSeed(merged);
}

function buildSeedIndex(seedInput) {
  const seed = normalizeSeed(seedInput);
  const restaurants = new Set((seed.restaurants || []).map(normText).filter(Boolean));
  const drinks = new Set((seed.drinks || []).map(d => `${d.tc}|${Boolean(d.paused)}`));
  const departments = new Set(Object.keys(seed.staff || {}).map(normText).filter(Boolean));
  const staffMembers = new Set();
  Object.keys(seed.staff || {}).forEach(dept => {
    (seed.staff[dept] || []).forEach(name => {
      const d = normText(dept);
      const n = normText(name);
      if (d && n) staffMembers.add(`${d}|${n}`);
    });
  });

  const menuCategories = new Set();
  const menuItems = new Set();
  Object.keys(seed.menus || {}).forEach(rest => {
    Object.keys(seed.menus[rest] || {}).forEach(cat => {
      const r = normText(rest);
      const c = normText(cat);
      if (!r || !c) return;
      menuCategories.add(`${r}|${c}`);
      (seed.menus[rest][cat] || []).forEach(item => {
        const it = normalizeMenuItem(item);
        if (it && it.nameTc) menuItems.add(`${r}|${c}|${it.nameTc}|${Boolean(it.paused)}`);
      });
    });
  });

  return { restaurants, drinks, departments, staffMembers, menuCategories, menuItems };
}

function diffSeedAdded(beforeSeed, afterSeed) {
  const before = buildSeedIndex(beforeSeed);
  const after = buildSeedIndex(afterSeed);
  const countAdded = (b, a) => {
    let count = 0;
    a.forEach(v => {
      if (!b.has(v)) count += 1;
    });
    return count;
  };

  return {
    restaurants: countAdded(before.restaurants, after.restaurants),
    drinks: countAdded(before.drinks, after.drinks),
    departments: countAdded(before.departments, after.departments),
    staff: countAdded(before.staffMembers, after.staffMembers),
    menuCategories: countAdded(before.menuCategories, after.menuCategories),
    menuItems: countAdded(before.menuItems, after.menuItems)
  };
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

async function appendAdminLogSafe(entry) {
  try {
    await storage.appendAdminLog(entry);
  } catch (err) {
    console.warn('Admin log write failed:', err && err.message ? err.message : err);
  }
}

async function ensureRecentLoginLog(admin) {
  if (!admin || admin.isRoot) return;
  try {
    const recentLogs = await storage.getAdminLogs({ limit: 10, username: admin.username });
    const now = Date.now();
    const hasRecentLogin = recentLogs.some(log => {
      if (normText(log && log.action).toLowerCase() !== 'login') return false;
      const createdAt = Date.parse(log && log.createdAt);
      return Number.isFinite(createdAt) && Math.abs(now - createdAt) <= 2 * 60 * 1000;
    });
    if (!hasRecentLogin) {
      await appendAdminLogSafe(buildLoginLogEntry(admin));
    }
  } catch (err) {
    console.warn('Ensure login log failed:', err && err.message ? err.message : err);
  }
}

function normalizeState(input) {
  const state = input && typeof input === 'object' ? input : defaultState();
  return {
    date: normText(state.date) || todayISO(),
    restaurant: state.restaurant ? normText(state.restaurant) : null,
    cutoffTime: normalizeCutoffTime(state.cutoffTime) || DEFAULT_CUTOFF_TIME,
    orders: (Array.isArray(state.orders) ? state.orders : []).map(order => ({
      ...order,
      orderedAt: normalizeOrderTimestamp(order && order.orderedAt),
      lateOrder: Boolean(order && order.lateOrder)
    }))
  };
}

async function ensureStateHasValidRestaurant(appId, seedInput, stateInput) {
  const seed = normalizeSeed(seedInput);
  const state = normalizeState(stateInput);
  const restaurant = normText(state.restaurant);
  if (!restaurant) return state;
  if (seed.menus && seed.menus[restaurant]) return state;
  const nextState = { ...state, restaurant: null };
  await storage.saveState(appId, nextState);
  return nextState;
}

async function supaSelect(table, columns, opts = {}) {
  let q = supabase.from(table).select(columns);
  if (opts.eq) {
    Object.keys(opts.eq).forEach(k => {
      q = q.eq(k, opts.eq[k]);
    });
  }
  if (opts.order) {
    opts.order.forEach(o => {
      q = q.order(o.column, { ascending: o.ascending !== false });
    });
  }
  if (Number.isInteger(opts.limit) && opts.limit > 0) q = q.limit(opts.limit);
  if (opts.single) q = q.single();
  if (opts.maybeSingle) q = q.maybeSingle();
  const { data, error } = await q;
  if (error) throw new Error(`Supabase query failed on ${table}: ${error.message}`);
  return data;
}

function isMissingSupabaseColumn(error, columnName) {
  const msg = String((error && error.message) || error || '');
  return msg.includes(columnName) && (msg.includes('does not exist') || msg.includes('schema cache'));
}

function isMissingSupabaseTable(error, tableName) {
  const msg = String((error && error.message) || error || '');
  return msg.includes(tableName) && (
    msg.includes('does not exist')
    || msg.includes('Could not find the table')
    || msg.includes('schema cache')
    || msg.includes('relation')
  );
}

function cutoffSchemaMigrationMessage() {
  return 'Supabase app_state table is missing cutoff_time. Please run the SQL migration in README.md before changing cutoff time in production.';
}

function ordersSchemaMigrationMessage() {
  return 'Supabase orders table is missing app_id. Please run the SQL migration in README.md before using main and Lady Ruby separately in production.';
}

function orderTimeSchemaMigrationMessage() {
  return 'Supabase orders table is missing ordered_at. Please run the SQL migration in README.md before recording order timestamps.';
}

async function supaDeleteAll(table, keyCol) {
  const { error } = await supabase.from(table).delete().not(keyCol, 'is', null);
  if (error) throw new Error(`Supabase delete failed on ${table}: ${error.message}`);
}

async function getSeedSupabase() {
  const restaurantsRows = await supaSelect(TABLES.restaurants, 'name', { order: [{ column: 'name' }] });
  let drinksRows = [];
  let hasPausedColumn = true;
  try {
    drinksRows = await supaSelect(TABLES.drinks, 'tc,sc,en,paused', { order: [{ column: 'tc' }] });
  } catch (err) {
    if (!isMissingSupabaseColumn(err, 'paused')) throw err;
    hasPausedColumn = false;
    drinksRows = await supaSelect(TABLES.drinks, 'tc,sc,en', { order: [{ column: 'tc' }] });
  }
  const staffRows = await supaSelect(TABLES.staff, 'dept,name', { order: [{ column: 'dept' }, { column: 'name' }] });
  let menuRows = [];
  let hasOptionGroupsColumn = true;
  let hasMenuPausedColumn = true;
  try {
    menuRows = await supaSelect(TABLES.menus, 'restaurant,category,name_tc,name_sc,name_en,price,option_groups,paused', {
      order: [{ column: 'restaurant' }, { column: 'category' }, { column: 'name_tc' }]
    });
  } catch (err) {
    if (isMissingSupabaseColumn(err, 'paused')) {
      hasMenuPausedColumn = false;
      try {
        menuRows = await supaSelect(TABLES.menus, 'restaurant,category,name_tc,name_sc,name_en,price,option_groups', {
          order: [{ column: 'restaurant' }, { column: 'category' }, { column: 'name_tc' }]
        });
      } catch (fallbackErr) {
        if (!isMissingSupabaseColumn(fallbackErr, 'option_groups')) throw fallbackErr;
        hasOptionGroupsColumn = false;
        menuRows = await supaSelect(TABLES.menus, 'restaurant,category,name_tc,name_sc,name_en,price', {
          order: [{ column: 'restaurant' }, { column: 'category' }, { column: 'name_tc' }]
        });
      }
    } else if (isMissingSupabaseColumn(err, 'option_groups')) {
      hasOptionGroupsColumn = false;
      try {
        menuRows = await supaSelect(TABLES.menus, 'restaurant,category,name_tc,name_sc,name_en,price,paused', {
          order: [{ column: 'restaurant' }, { column: 'category' }, { column: 'name_tc' }]
        });
      } catch (fallbackErr) {
        if (!isMissingSupabaseColumn(fallbackErr, 'paused')) throw fallbackErr;
        hasMenuPausedColumn = false;
        menuRows = await supaSelect(TABLES.menus, 'restaurant,category,name_tc,name_sc,name_en,price', {
          order: [{ column: 'restaurant' }, { column: 'category' }, { column: 'name_tc' }]
        });
      }
    } else {
      throw err;
    }
  }

  const seed = defaultSeed();
  seed.restaurants = (restaurantsRows || []).map(r => normText(r.name)).filter(Boolean);

  (drinksRows || []).forEach(d => {
    const item = normalizeDrinkItem({ tc: d.tc, sc: d.sc, en: d.en, paused: d.paused });
    if (item) seed.drinks.push(item);
  });

  (staffRows || []).forEach(s => {
    const dept = normText(s.dept);
    const name = normText(s.name);
    if (!dept || !name) return;
    if (!seed.staff[dept]) seed.staff[dept] = [];
    if (!seed.staff[dept].includes(name)) seed.staff[dept].push(name);
  });

  (menuRows || []).forEach(m => {
    const rest = normText(m.restaurant);
    const cat = normText(m.category);
    const item = normalizeMenuItem({
      nameTc: m.name_tc,
      nameSc: m.name_sc,
      nameEn: m.name_en,
      price: m.price,
      option_groups: hasOptionGroupsColumn ? m.option_groups : undefined,
      paused: hasMenuPausedColumn ? m.paused : false
    });
    if (!rest || !cat || !item) return;
    if (!seed.menus[rest]) seed.menus[rest] = {};
    if (!seed.menus[rest][cat]) seed.menus[rest][cat] = [];
    seed.menus[rest][cat].push(item);
    if (!seed.restaurants.includes(rest)) seed.restaurants.push(rest);
  });

  const normalizedSeed = normalizeSeed(seed);
  return hasPausedColumn ? normalizedSeed : applyDrinkFlags(normalizedSeed, readDrinkFlags());
}

async function saveSeedSupabase(input) {
  const seed = normalizeSeed(input);
  const drinkFlags = extractDrinkFlags(seed);
  const existingRestaurantContacts = await getRestaurantContactsSupabase().catch(err => {
    if (isMissingSupabaseTable(err, TABLES.restaurantContacts)) return [];
    throw err;
  });

  await supaDeleteAll(TABLES.menus, 'id');
  await supaDeleteAll(TABLES.staff, 'id');
  await supaDeleteAll(TABLES.drinks, 'tc');
  await supaDeleteAll(TABLES.restaurants, 'name');

  if (seed.restaurants.length) {
    const { error } = await supabase.from(TABLES.restaurants).insert(seed.restaurants.map(name => ({ name })));
    if (error) throw new Error(`Supabase insert restaurants failed: ${error.message}`);
  }

  if (existingRestaurantContacts.length) {
    const restaurantSet = new Set(seed.restaurants);
    await saveRestaurantContactsSupabase(existingRestaurantContacts.filter(contact => restaurantSet.has(contact.restaurant)));
  }

  if (seed.drinks.length) {
    const rows = seed.drinks.map(d => ({ tc: d.tc, sc: d.sc, en: d.en, paused: Boolean(d.paused) }));
    let { error } = await supabase.from(TABLES.drinks).insert(rows);
    if (error && isMissingSupabaseColumn(error, 'paused')) {
      writeDrinkFlags(drinkFlags);
      const fallbackRows = seed.drinks.map(d => ({ tc: d.tc, sc: d.sc, en: d.en }));
      ({ error } = await supabase.from(TABLES.drinks).insert(fallbackRows));
    }
    if (error) throw new Error(`Supabase insert drinks failed: ${error.message}`);
  }
  writeDrinkFlags(drinkFlags);

  const staffRows = [];
  Object.keys(seed.staff).forEach(dept => {
    (seed.staff[dept] || []).forEach(name => staffRows.push({ dept, name }));
  });
  if (staffRows.length) {
    const { error } = await supabase.from(TABLES.staff).insert(staffRows);
    if (error) throw new Error(`Supabase insert staff failed: ${error.message}`);
  }

  const menuMap = new Map();
  Object.keys(seed.menus).forEach(rest => {
    Object.keys(seed.menus[rest] || {}).forEach(cat => {
      (seed.menus[rest][cat] || []).forEach(it => {
        const key = rest + '|' + cat + '|' + it.nameTc;
        menuMap.set(key, {
          restaurant: rest,
          category: cat,
          name_tc: it.nameTc,
          name_sc: it.nameSc,
          name_en: it.nameEn,
          price: Number(it.price),
          option_groups: Array.isArray(it.optionGroups) ? it.optionGroups : undefined,
          paused: Boolean(it.paused)
        });
      });
    });
  });
  const menuRows = Array.from(menuMap.values());
  if (menuRows.length) {
    let error = null;
    let fallbackRows = menuRows;
    let dropOptionGroups = false;
    let dropPaused = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      ({ error } = await supabase.from(TABLES.menus).insert(fallbackRows));
      if (!error) break;
      const missingOptionGroups = isMissingSupabaseColumn(error, 'option_groups');
      const missingPaused = isMissingSupabaseColumn(error, 'paused');
      if (!missingOptionGroups && !missingPaused) break;
      dropOptionGroups = dropOptionGroups || missingOptionGroups;
      dropPaused = dropPaused || missingPaused;
      fallbackRows = menuRows.map(row => {
        const copy = { ...row };
        if (dropOptionGroups) delete copy.option_groups;
        if (dropPaused) delete copy.paused;
        return copy;
      });
    }
    if (error) throw new Error(`Supabase insert menus failed: ${error.message}`);
  }
}

async function getAdminUsersSupabase() {
  let rows = [];
  let hasStaffDepartmentsColumn = true;
  try {
    rows = await supaSelect(TABLES.adminUsers, 'username,password_hash,permissions,staff_departments', {
      order: [{ column: 'username' }]
    });
  } catch (err) {
    if (isMissingSupabaseColumn(err, 'staff_departments')) {
      hasStaffDepartmentsColumn = false;
      rows = await supaSelect(TABLES.adminUsers, 'username,password_hash,permissions', {
        order: [{ column: 'username' }]
      });
    } else if (!isMissingSupabaseTable(err, TABLES.adminUsers)) {
      throw err;
    } else {
      return [];
    }
  }
  return normalizeAdminUsers((rows || []).map(row => ({
    username: row.username,
    passwordHash: row.password_hash,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    staffDepartments: hasStaffDepartmentsColumn && Array.isArray(row.staff_departments) ? row.staff_departments : []
  })));
}

async function saveAdminUsersSupabase(users) {
  const normalized = normalizeAdminUsers(users);
  try {
    await supaDeleteAll(TABLES.adminUsers, 'username');
  } catch (err) {
    if (isMissingSupabaseTable(err, TABLES.adminUsers)) {
      throw new Error('Supabase table admin_users is missing. Please run the SQL in README.md before saving admin users.');
    }
    throw err;
  }
  if (!normalized.length) return;
  const rows = normalized.map(user => ({
    username: user.username,
    password_hash: user.passwordHash,
    permissions: user.permissions,
    staff_departments: user.staffDepartments || []
  }));
  const { error } = await supabase.from(TABLES.adminUsers).insert(rows);
  if (error) {
    if (isMissingSupabaseColumn(error, 'staff_departments')) {
      throw new Error('Supabase column admin_users.staff_departments is missing. Please run the SQL in README.md before saving scoped staff permissions.');
    }
    if (isMissingSupabaseTable(error, TABLES.adminUsers)) {
      throw new Error('Supabase table admin_users is missing. Please run the SQL in README.md before saving admin users.');
    }
    throw new Error(`Supabase save admin_users failed: ${error.message}`);
  }
}

async function getAdminLogsSupabase(options = {}) {
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(200, Math.floor(options.limit))) : 100;
  const username = normText(options.username).toLowerCase();
  const excludedActions = uniqueSortedTextList(options.excludeActions);
  try {
    let rows = await supaSelect(TABLES.adminLogs, 'id,created_at,username,action,section,summary,details', {
      eq: username ? { username } : undefined,
      order: [{ column: 'created_at', ascending: false }],
      limit: excludedActions.length ? Math.min(500, limit * 5) : limit
    });
    if (excludedActions.length) {
      rows = (rows || []).filter(row => !excludedActions.includes(normText(row.action).toLowerCase())).slice(0, limit);
    }
    return normalizeAdminLogs((rows || []).map(row => ({
      id: row.id,
      createdAt: row.created_at,
      username: row.username,
      action: row.action,
      section: row.section,
      summary: row.summary,
      details: row.details
    })));
  } catch (err) {
    if (isMissingSupabaseTable(err, TABLES.adminLogs)) return [];
    throw err;
  }
}

async function getRestaurantContactsSupabase() {
  try {
    const rows = await supaSelect(TABLES.restaurantContacts, 'restaurant,phone,email,note', {
      order: [{ column: 'restaurant' }]
    });
    return normalizeRestaurantContacts(rows || []);
  } catch (err) {
    if (isMissingSupabaseTable(err, TABLES.restaurantContacts)) return [];
    throw err;
  }
}

async function saveRestaurantContactsSupabase(contacts) {
  const rows = normalizeRestaurantContacts(contacts);
  try {
    await supaDeleteAll(TABLES.restaurantContacts, 'restaurant');
  } catch (err) {
    if (isMissingSupabaseTable(err, TABLES.restaurantContacts)) return;
    throw err;
  }
  if (!rows.length) return;
  const { error } = await supabase.from(TABLES.restaurantContacts).insert(rows.map(contact => ({
    restaurant: contact.restaurant,
    phone: contact.phone,
    email: contact.email,
    note: contact.note
  })));
  if (error) {
    if (isMissingSupabaseTable(error, TABLES.restaurantContacts)) return;
    throw new Error(`Supabase insert restaurant contacts failed: ${error.message}`);
  }
}

async function saveRestaurantContactSupabase(contactInput) {
  const contact = normalizeRestaurantContact(contactInput);
  if (!contact) return [];
  try {
    if (!contact.phone && !contact.email && !contact.note) {
      const { error } = await supabase
        .from(TABLES.restaurantContacts)
        .delete()
        .eq('restaurant', contact.restaurant);
      if (error && !isMissingSupabaseTable(error, TABLES.restaurantContacts)) {
        throw new Error(`Supabase delete restaurant contact failed: ${error.message}`);
      }
      return getRestaurantContactsSupabase();
    }
    const { error } = await supabase
      .from(TABLES.restaurantContacts)
      .upsert(contact, { onConflict: 'restaurant' });
    if (error) {
      if (isMissingSupabaseTable(error, TABLES.restaurantContacts)) return [];
      throw new Error(`Supabase save restaurant contact failed: ${error.message}`);
    }
    return getRestaurantContactsSupabase();
  } catch (err) {
    if (isMissingSupabaseTable(err, TABLES.restaurantContacts)) return [];
    throw err;
  }
}

async function appendAdminLogSupabase(entry) {
  const normalized = normalizeAdminLogEntry(entry);
  if (!normalized) return;
  const { error } = await supabase.from(TABLES.adminLogs).insert({
    id: normalized.id,
    created_at: normalized.createdAt,
    username: normalized.username,
    action: normalized.action,
    section: normalized.section,
    summary: normalized.summary,
    details: normalized.details || {}
  });
  if (error) {
    if (isMissingSupabaseTable(error, TABLES.adminLogs)) return;
    throw new Error(`Supabase save admin_logs failed: ${error.message}`);
  }
}

async function deleteAdminLogSupabase(id) {
  const logId = normText(id);
  if (!logId) return false;
  const { error, count } = await supabase
    .from(TABLES.adminLogs)
    .delete({ count: 'exact' })
    .eq('id', logId);
  if (error) {
    if (isMissingSupabaseTable(error, TABLES.adminLogs)) return false;
    throw new Error(`Supabase delete admin_logs failed: ${error.message}`);
  }
  return Number(count || 0) > 0;
}

async function selectOrdersSupabase(date, appId) {
  try {
    return await supaSelect(TABLES.orders, 'dept,name,food,addon,drink,price,app_id,ordered_at', {
      eq: { date, app_id: appId },
      order: [{ column: 'dept' }, { column: 'name' }]
    });
  } catch (err) {
    if (isMissingSupabaseColumn(err, 'ordered_at')) {
      const rows = await supaSelect(TABLES.orders, 'dept,name,food,addon,drink,price,app_id', {
        eq: { date, app_id: appId },
        order: [{ column: 'dept' }, { column: 'name' }]
      });
      return (rows || []).map(row => ({ ...row, ordered_at: null }));
    }
    if (!isMissingSupabaseColumn(err, 'app_id')) throw err;
    throw new Error(ordersSchemaMigrationMessage());
  }
}

async function clearOrdersSupabase(date, appId) {
  let query = supabase.from(TABLES.orders).delete().eq('date', date).eq('app_id', appId);
  let result = await query;
  if (result.error && isMissingSupabaseColumn(result.error, 'app_id')) {
    throw new Error(ordersSchemaMigrationMessage());
  }
  if (result.error) throw new Error(`Supabase clear orders failed: ${result.error.message}`);
}

async function insertOrdersSupabase(date, appId, orders) {
  if (!orders.length) return;
  const rowsWithApp = orders.map(o => ({
    app_id: appId,
    date,
    dept: normText(o.dept),
    name: normText(o.name),
    food: normText(o.food),
    addon: normText(o.addon),
    drink: normText(o.drink),
    price: Number(o.price || 0),
    ordered_at: normalizeOrderTimestamp(o.orderedAt) || nowIso()
  }));
  let result = await supabase.from(TABLES.orders).insert(rowsWithApp);
  if (result.error && isMissingSupabaseColumn(result.error, 'ordered_at')) {
    throw new Error(orderTimeSchemaMigrationMessage());
  }
  if (result.error && isMissingSupabaseColumn(result.error, 'app_id')) {
    throw new Error(ordersSchemaMigrationMessage());
  }
  if (result.error) throw new Error(`Supabase insert orders failed: ${result.error.message}`);
}

async function upsertOrderSupabase(appId, date, order) {
  const row = {
    app_id: appId,
    date,
    dept: normText(order.dept),
    name: normText(order.name),
    food: normText(order.food),
    addon: normText(order.addon),
    drink: normText(order.drink),
    price: Number(order.price),
    ordered_at: nowIso()
  };
  let result = await supabase.from(TABLES.orders).upsert(row, { onConflict: 'date,app_id,dept,name' });
  if (result.error && isMissingSupabaseColumn(result.error, 'ordered_at')) {
    throw new Error(orderTimeSchemaMigrationMessage());
  }
  if (result.error && isMissingSupabaseColumn(result.error, 'app_id')) {
    throw new Error(ordersSchemaMigrationMessage());
  }
  if (result.error) throw new Error(`Supabase upsert order failed: ${result.error.message}`);
}

async function updateOrderDrinkSupabase(appId, date, dept, name, drink) {
  let query = supabase
    .from(TABLES.orders)
    .update({ drink: normText(drink) })
    .eq('date', date)
    .eq('app_id', appId)
    .eq('dept', normText(dept))
    .eq('name', normText(name));
  const result = await query;
  if (result.error && isMissingSupabaseColumn(result.error, 'app_id')) {
    throw new Error(ordersSchemaMigrationMessage());
  }
  if (result.error) throw new Error(`Supabase update order drink failed: ${result.error.message}`);
}

async function getStateSupabase(appId = APP_MAIN) {
  const stateRowId = APP_STATE_ROW_IDS[normalizeAppId(appId)] || 1;
  let hasCutoffColumn = true;
  let appState = null;
  try {
    appState = await supaSelect(TABLES.appState, 'id,date,restaurant,cutoff_time', { eq: { id: stateRowId }, maybeSingle: true });
  } catch (err) {
    if (!isMissingSupabaseColumn(err, 'cutoff_time')) throw err;
    hasCutoffColumn = false;
    appState = await supaSelect(TABLES.appState, 'id,date,restaurant', { eq: { id: stateRowId }, maybeSingle: true });
  }
  if (!appState) {
    const init = hasCutoffColumn
      ? { id: stateRowId, date: todayISO(), restaurant: null, cutoff_time: null }
      : { id: stateRowId, date: todayISO(), restaurant: null };
    const { error } = await supabase.from(TABLES.appState).upsert(init, { onConflict: 'id' });
    if (error) throw new Error(`Supabase init app_state failed: ${error.message}`);
    appState = init;
  }

  const today = todayISO();
  if (normText(appState.date) !== today) {
    const rotatePayload = hasCutoffColumn
      ? { id: stateRowId, date: today, restaurant: null, cutoff_time: null }
      : { id: stateRowId, date: today, restaurant: null };
    const { error } = await supabase.from(TABLES.appState).upsert(rotatePayload, { onConflict: 'id' });
    if (error) throw new Error(`Supabase rotate day failed: ${error.message}`);
    appState = rotatePayload;
  }

  const ordersRows = await selectOrdersSupabase(appState.date, normalizeAppId(appId));

  const orders = sortOrdersForDisplay((ordersRows || []).map(o => ({
    dept: normText(o.dept),
    name: normText(o.name),
    food: normText(o.food),
    addon: normText(o.addon),
    drink: normText(o.drink),
    price: Number(o.price || 0),
    orderedAt: normalizeOrderTimestamp(o.ordered_at),
    lateOrder: isLateOrderTimestamp(o.ordered_at, appState.cutoff_time || DEFAULT_CUTOFF_TIME)
  })));

  return {
    date: appState.date,
    restaurant: appState.restaurant ? normText(appState.restaurant) : null,
    cutoffTime: normalizeCutoffTime(appState.cutoff_time) || DEFAULT_CUTOFF_TIME,
    orders
  };
}

async function saveStateSupabase(appId = APP_MAIN, input) {
  const normalizedAppId = normalizeAppId(appId);
  const stateRowId = APP_STATE_ROW_IDS[normalizedAppId] || 1;
  const state = normalizeState(input);
  let e1 = null;
  const withCutoff = await supabase
    .from(TABLES.appState)
    .upsert({ id: stateRowId, date: state.date, restaurant: state.restaurant, cutoff_time: state.cutoffTime }, { onConflict: 'id' });
  e1 = withCutoff.error;
  if (e1 && isMissingSupabaseColumn(e1, 'cutoff_time')) {
    throw new Error(cutoffSchemaMigrationMessage());
  }
  if (e1) throw new Error(`Supabase save app_state failed: ${e1.message}`);

  await clearOrdersSupabase(state.date, normalizedAppId);
  await insertOrdersSupabase(state.date, normalizedAppId, state.orders || []);
}

async function resetDaySupabase(appId = APP_MAIN) {
  const reset = defaultState();
  await saveStateSupabase(appId, reset);
}

async function getSeedLocal() {
  return normalizeSeed(readJsonSafe(SEED_FILE, defaultSeed()));
}

async function saveSeedLocal(seed) {
  writeJson(SEED_FILE, normalizeSeed(seed));
}

async function getAdminUsersLocal() {
  return normalizeAdminUsers(readJsonSafe(ADMIN_USERS_FILE, defaultAdminUsers()));
}

async function saveAdminUsersLocal(users) {
  writeJson(ADMIN_USERS_FILE, normalizeAdminUsers(users));
}

async function getRestaurantContactsLocal() {
  return normalizeRestaurantContacts(readJsonSafe(RESTAURANT_CONTACTS_FILE, []));
}

async function saveRestaurantContactsLocal(contacts) {
  writeJson(RESTAURANT_CONTACTS_FILE, normalizeRestaurantContacts(contacts));
}

async function saveRestaurantContactLocal(contactInput) {
  const contact = normalizeRestaurantContact(contactInput);
  if (!contact) return getRestaurantContactsLocal();
  const contacts = await getRestaurantContactsLocal();
  const next = contacts.filter(item => item.restaurant !== contact.restaurant);
  if (contact.phone || contact.email || contact.note) next.push(contact);
  await saveRestaurantContactsLocal(next);
  return getRestaurantContactsLocal();
}

async function getAdminLogsLocal(options = {}) {
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.min(200, Math.floor(options.limit))) : 100;
  const username = normText(options.username).toLowerCase();
  const excludedActions = uniqueSortedTextList(options.excludeActions);
  const logs = normalizeAdminLogs(readJsonSafe(ADMIN_LOGS_FILE, defaultAdminLogs()));
  const filtered = logs.filter(log => {
    if (username && normText(log.username).toLowerCase() !== username) return false;
    if (excludedActions.includes(normText(log.action).toLowerCase())) return false;
    return true;
  });
  return filtered.slice(0, limit);
}

async function appendAdminLogLocal(entry) {
  const normalized = normalizeAdminLogEntry(entry);
  if (!normalized) return;
  const logs = normalizeAdminLogs(readJsonSafe(ADMIN_LOGS_FILE, defaultAdminLogs()));
  logs.unshift(normalized);
  writeJson(ADMIN_LOGS_FILE, logs.slice(0, 500));
}

async function deleteAdminLogLocal(id) {
  const logId = normText(id);
  if (!logId) return false;
  const logs = normalizeAdminLogs(readJsonSafe(ADMIN_LOGS_FILE, defaultAdminLogs()));
  const nextLogs = logs.filter(log => normText(log.id) !== logId);
  const deleted = nextLogs.length !== logs.length;
  if (deleted) writeJson(ADMIN_LOGS_FILE, nextLogs);
  return deleted;
}

async function getStateLocal(appId = APP_MAIN) {
  const statePath = stateFileForApp(appId);
  const state = normalizeState(readJsonSafe(statePath, defaultState()));
  if (state.date !== todayISO()) {
    const reset = defaultState();
    writeJson(statePath, reset);
    return reset;
  }
  return { ...state, orders: sortOrdersForDisplay(state.orders) };
}

async function saveStateLocal(appId = APP_MAIN, state) {
  writeJson(stateFileForApp(appId), normalizeState(state));
}

async function resetDayLocal(appId = APP_MAIN) {
  writeJson(stateFileForApp(appId), defaultState());
}

function invalidateSeedCache() {
  seedCache.value = null;
  seedCache.expiresAt = 0;
}

async function getSeedCached() {
  const now = Date.now();
  if (seedCache.value && seedCache.expiresAt > now) return seedCache.value;
  const seed = await (USE_SUPABASE ? getSeedSupabase() : getSeedLocal());
  seedCache.value = seed;
  seedCache.expiresAt = now + SEED_CACHE_TTL_MS;
  return seed;
}

async function saveSeedWithCache(seed) {
  await (USE_SUPABASE ? saveSeedSupabase(seed) : saveSeedLocal(seed));
  invalidateSeedCache();
}

const storage = {
  getSeed: getSeedCached,
  saveSeed: saveSeedWithCache,
  getAdminUsers() {
    if (USE_SUPABASE) return getAdminUsersSupabase();
    return getAdminUsersLocal();
  },
  saveAdminUsers(users) {
    if (USE_SUPABASE) return saveAdminUsersSupabase(users);
    return saveAdminUsersLocal(users);
  },
  getRestaurantContacts() {
    if (USE_SUPABASE) return getRestaurantContactsSupabase();
    return getRestaurantContactsLocal();
  },
  saveRestaurantContacts(contacts) {
    if (USE_SUPABASE) return saveRestaurantContactsSupabase(contacts);
    return saveRestaurantContactsLocal(contacts);
  },
  saveRestaurantContact(contact) {
    if (USE_SUPABASE) return saveRestaurantContactSupabase(contact);
    return saveRestaurantContactLocal(contact);
  },
  getAdminLogs(options = {}) {
    if (USE_SUPABASE) return getAdminLogsSupabase(options);
    return getAdminLogsLocal(options);
  },
  appendAdminLog(entry) {
    if (USE_SUPABASE) return appendAdminLogSupabase(entry);
    return appendAdminLogLocal(entry);
  },
  deleteAdminLog(id) {
    if (USE_SUPABASE) return deleteAdminLogSupabase(id);
    return deleteAdminLogLocal(id);
  },
  getState(appId = APP_MAIN) {
    const normalizedAppId = normalizeAppId(appId);
    if (USE_SUPABASE) return getStateSupabase(normalizedAppId);
    return getStateLocal(normalizedAppId);
  },
  saveState(appId = APP_MAIN, state) {
    const normalizedAppId = normalizeAppId(appId);
    if (USE_SUPABASE) return saveStateSupabase(normalizedAppId, state);
    return saveStateLocal(normalizedAppId, state);
  },
  resetDay(appId = APP_MAIN) {
    const normalizedAppId = normalizeAppId(appId);
    if (USE_SUPABASE) return resetDaySupabase(normalizedAppId);
    return resetDayLocal(normalizedAppId);
  }
};

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  });
  res.end(body);
}

function text(res, status, payload, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  });
  res.end(payload);
}

function getRequestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.socket && req.socket.remoteAddress || 'unknown');
}

function isAuthRateLimited(req, scope) {
  const key = `${scope}:${getRequestIp(req)}`;
  const now = Date.now();
  const entry = authFailures.get(key);
  if (!entry) return false;
  if (entry.resetAt <= now) {
    authFailures.delete(key);
    return false;
  }
  return entry.count >= AUTH_MAX_FAILURES;
}

function recordAuthFailure(req, scope) {
  const key = `${scope}:${getRequestIp(req)}`;
  const now = Date.now();
  const entry = authFailures.get(key);
  if (!entry || entry.resetAt <= now) {
    authFailures.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function clearAuthFailures(req, scope) {
  authFailures.delete(`${scope}:${getRequestIp(req)}`);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function validateOrder(order) {
  if (!order) return 'Missing order payload';
  if (!order.dept || !order.name || !order.food) return 'dept, name, food are required';
  if (order.price === '' || order.price === null || order.price === undefined) return 'price is required';
  const priceNum = Number(order.price);
  if (!Number.isFinite(priceNum) || priceNum < 0) return 'price must be a valid non-negative number';
  return null;
}

function toCsv(orders) {
  const header = ['No', 'Dept', 'Name', 'Food', 'Addon', 'Drink', 'Price'];
  const lines = [header.join(',')];
  const stripAddonPriceText = value => {
    const text = String(value ?? '').trim();
    if (!text) return '';
    return text
      .replace(/\(\s*\+\s*\$?\s*\d+(?:\.\d+)?\s*\)/g, '')
      .replace(/\+\s*\$?\s*\d+(?:\.\d+)?/g, '')
      .replace(/\s*([,;\\/、])\s*/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[,;\\/、\s]+|[,;\\/、\s]+$/g, '')
      .trim();
  };
  const normalizeAddon = value => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (!/[\u3400-\u9fff]/.test(raw)) return stripAddonPriceText(raw);
    let out = '';
    for (const ch of raw) {
      if (/[\u3400-\u9fff]/.test(ch)) out += ch;
      else if (/[0-9]/.test(ch)) out += ch;
      else if (/[+,;\\/、]/.test(ch)) out += ch;
      else if (/\s/.test(ch)) out += ' ';
    }
    out = out.replace(/\s+/g, ' ').replace(/\s*([+,;\\/、])\s*/g, '$1').trim();
    return stripAddonPriceText(out || raw);
  };
  orders.forEach((o, i) => {
    const row = [i + 1, o.dept, o.name, o.food, normalizeAddon(o.addon || ''), o.drink || '', o.price].map(value => {
      const s = String(value ?? '');
      return '"' + s.replace(/"/g, '""') + '"';
    });
    lines.push(row.join(','));
  });
  return lines.join('\n');
}

function parseCookies(req) {
  const header = String((req && req.headers && req.headers.cookie) || '');
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx <= 0) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

function hasLadyRubyAccess(req) {
  const cookies = parseCookies(req);
  return cookies[LADY_RUBY_COOKIE] === '1';
}

function getAppIdFromRequest(urlObj, body) {
  return normalizeAppId(
    (urlObj && urlObj.searchParams && urlObj.searchParams.get('app'))
      || (body && body.app)
      || APP_MAIN
  );
}

function serveStatic(req, reqPath, res) {
  const isLadyRubyPage = reqPath === '/lady-ruby' || reqPath === '/lady-ruby/';
  let safePath = reqPath === '/'
    ? '/index.html'
    : ((reqPath === '/admin' || reqPath === '/admin/') ? '/admin.html' : reqPath);
  if (isLadyRubyPage) safePath = '/lady-ruby.html';
  safePath = path.normalize(safePath).replace(/^\.\.(\\|\/|$)/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) return text(res, 403, 'Forbidden');
  // Lady Ruby page is now public; no access cookie required.

  fs.readFile(filePath, (err, data) => {
    if (err) return text(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    const isVersionedAsset = /\.(css|js|png|svg)$/i.test(filePath) && /[?&]v=|-[0-9]{8,}/i.test(req.url || '');
    const cacheControl = path.basename(filePath).toLowerCase() === 'service-worker.js'
      ? 'no-store'
      : isVersionedAsset
      ? 'public, max-age=31536000, immutable'
      : (ext === '.html' ? 'no-store' : 'public, max-age=300');
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    });
    res.end(data);
  });
}

function isAdminAuthorized(password) {
  return normText(password) && normText(password) === ADMIN_PASSWORD;
}

async function authenticateAdmin(body = {}) {
  const username = normText(body.username).toLowerCase() || 'admin';
  const password = normText(body.password);
  if (!password) return null;
  if (username === 'admin') {
    if (!isAdminAuthorized(password)) return null;
    return { username: 'admin', permissions: [ADMIN_PERMISSION_ALL], staffDepartments: [], isRoot: true };
  }
  const users = await storage.getAdminUsers();
  const user = users.find(entry => entry.username === username);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { username: user.username, permissions: user.permissions || [], staffDepartments: user.staffDepartments || [], isRoot: false };
}

function requireAdminPermission(admin, permission) {
  return hasAdminPermission(admin, permission);
}

async function getLateOrderUsers() {
  const users = await storage.getAdminUsers().catch(() => []);
  const eligible = users
    .filter(user => hasAdminPermission(user, 'late_order'))
    .map(user => ({ username: user.username }));
  return [{ username: 'admin' }].concat(eligible)
    .filter((user, index, list) => user.username && list.findIndex(item => item.username === user.username) === index);
}

async function authenticateLateOrder(body = {}) {
  const admin = await authenticateAdmin({
    username: body.lateOrderUsername || body.username,
    password: body.lateOrderPassword || body.password
  });
  if (!admin || !requireAdminPermission(admin, 'late_order')) return null;
  return admin;
}

function normalizeAdminSection(section) {
  const raw = normText(section).toLowerCase();
  const map = {
    import: 'import',
    restaurants: 'restaurants',
    drinks: 'drinks',
    staff: 'staff',
    menus: 'menus',
    users: 'users',
    reset_main: 'reset_main',
    reset_lady_ruby: 'reset_lady_ruby'
  };
  return map[raw] || '';
}

async function handleApi(req, res, urlObj) {
  assertSupabaseServiceRole();
  const pathname = (urlObj.pathname || '/').replace(/\/+$/, '') || '/';

  if (req.method === 'POST' && pathname === '/api/private-access') {
    if (isAuthRateLimited(req, 'private-access')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const target = normalizeAppId(body && body.target);
    const password = normText(body && body.password);
    if (target !== APP_LADY_RUBY || password !== LADY_RUBY_PASSWORD) {
      recordAuthFailure(req, 'private-access');
      return json(res, 403, { error: 'Invalid password' });
    }
    clearAuthFailures(req, 'private-access');
    const secureFlag = process.env.NODE_ENV === 'production' || Boolean(req.headers['x-forwarded-proto'] === 'https');
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Set-Cookie': `${LADY_RUBY_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secureFlag ? '; Secure' : ''}`
    });
    return res.end(JSON.stringify({ ok: true, redirect: '/lady-ruby/' }));
  }

  if (req.method === 'GET' && pathname === '/api/bootstrap') {
    const appId = getAppIdFromRequest(urlObj);
    const seed = await storage.getSeed();
    const restaurantContacts = await storage.getRestaurantContacts();
    const restaurantContactMap = contactMapByRestaurant(restaurantContacts);
    const rawState = await storage.getState(appId);
    const state = await ensureStateHasValidRestaurant(appId, seed, rawState);
    return json(res, 200, {
      date: state.date,
      restaurants: seed.restaurants,
      restaurantContacts: restaurantContactMap,
      currentRestaurantContact: state.restaurant ? (restaurantContactMap[state.restaurant] || null) : null,
      staff: getScopedStaff(seed.staff, appId),
      drinks: seed.drinks,
      currentRestaurant: state.restaurant,
      cutoffTime: state.cutoffTime,
      cutoffPassed: isCutoffPassed(state.cutoffTime),
      orders: state.orders,
      currentMenu: state.restaurant ? (seed.menus[state.restaurant] || {}) : {},
      app: appId
    });
  }

  if (req.method === 'GET' && pathname === '/api/admin/usernames') {
    const users = await storage.getAdminUsers().catch(() => []);
    const usernames = ['admin'].concat(users.map(user => user.username)).filter((value, index, list) => value && list.indexOf(value) === index);
    return json(res, 200, { usernames });
  }

  if (req.method === 'GET' && pathname === '/api/menu') {
    const seed = await storage.getSeed();
    const appId = getAppIdFromRequest(urlObj);
    const rawState = await storage.getState(appId);
    const state = await ensureStateHasValidRestaurant(appId, seed, rawState);
    const restaurant = urlObj.searchParams.get('restaurant') || state.restaurant;
    if (!restaurant) return json(res, 400, { error: 'Restaurant is required' });
    const menu = seed.menus[restaurant];
    if (!menu) return json(res, 404, { error: 'Menu not found for selected restaurant' });
    return json(res, 200, { restaurant, menu });
  }

  if (req.method === 'GET' && pathname === '/api/late-order/users') {
    const users = await getLateOrderUsers();
    return json(res, 200, { users });
  }

  if (req.method === 'POST' && pathname === '/api/late-order/authorize') {
    if (isAuthRateLimited(req, 'late-order')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const admin = await authenticateLateOrder(body);
    if (!admin) {
      recordAuthFailure(req, 'late-order');
      return json(res, 403, { error: 'Invalid late order username or password' });
    }
    clearAuthFailures(req, 'late-order');
    return json(res, 200, { ok: true, user: { username: admin.username } });
  }

  if (req.method === 'POST' && pathname === '/api/restaurant') {
    if (isAuthRateLimited(req, 'restaurant-settings')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const appId = getAppIdFromRequest(urlObj, body);
    const seed = await storage.getSeed();
    const state = await storage.getState(appId);
    const restaurant = normText(body.restaurant);
    const cutoffTime = normalizeCutoffTime(body.cutoffTime);
    const forceChange = Boolean(body.forceChange);
    const password = normText(body.password);
    const currentCutoff = normalizeCutoffTime(state.cutoffTime) || DEFAULT_CUTOFF_TIME;
    const nextCutoff = cutoffTime || DEFAULT_CUTOFF_TIME;
    const restaurantChanged = Boolean(state.restaurant && restaurant !== state.restaurant);
    const cutoffChanged = Boolean(state.restaurant && nextCutoff !== currentCutoff);
    if (!restaurant) return json(res, 400, { error: 'restaurant is required' });
    if (!seed.restaurants.includes(restaurant)) return json(res, 400, { error: 'Unknown restaurant' });
    if (body.cutoffTime !== undefined && body.cutoffTime !== null && normText(body.cutoffTime) && !cutoffTime) {
      return json(res, 400, { error: 'cutoffTime must be HH:MM' });
    }
    if (password !== CHANGE_PASSWORD) {
      recordAuthFailure(req, 'restaurant-settings');
      return json(res, 403, { error: 'Invalid password' });
    }
    clearAuthFailures(req, 'restaurant-settings');

    state.restaurant = restaurant;
    state.cutoffTime = nextCutoff;
    const cleared = forceChange || restaurantChanged;
    if (cleared) state.orders = [];
    await storage.saveState(appId, state);
    return json(res, 200, {
      ok: true,
      currentRestaurant: state.restaurant,
      cutoffTime: state.cutoffTime,
      cutoffPassed: isCutoffPassed(state.cutoffTime),
      cleared,
      restaurantChanged,
      cutoffChanged
    });
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    const body = await parseBody(req);
    const appId = getAppIdFromRequest(urlObj, body);
    const state = await storage.getState(appId);
    if (!state.restaurant) return json(res, 400, { error: 'Please set today restaurant first' });
    const lateOrder = isCutoffPassed(state.cutoffTime);
    if (lateOrder) {
      if (isAuthRateLimited(req, 'late-order')) {
        return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
      }
      const admin = await authenticateLateOrder(body);
      if (!admin) {
        recordAuthFailure(req, 'late-order');
        return json(res, 403, { error: 'Ordering cutoff has passed. Please use supervisor late order access.' });
      }
      clearAuthFailures(req, 'late-order');
    }

    const error = validateOrder(body);
    if (error) return json(res, 400, { error });

    const existingOrder = (state.orders || []).find(o => o.dept === normText(body.dept) && o.name === normText(body.name));
    const clean = {
      dept: normText(body.dept),
      name: normText(body.name),
      food: normText(body.food),
      addon: normText(body.addon),
      drink: normText(body.drink),
      price: Number(body.price),
      orderedAt: existingOrder ? (normalizeOrderTimestamp(existingOrder.orderedAt) || nowIso()) : nowIso(),
      lateOrder: existingOrder ? Boolean(existingOrder.lateOrder) : lateOrder
    };

    const existed = Boolean(existingOrder);

    if (USE_SUPABASE) {
      await upsertOrderSupabase(appId, state.date, clean);
      return json(res, 200, { ok: true, updated: existed });
    }

    const idx = state.orders.findIndex(o => o.dept === clean.dept && o.name === clean.name);
    let updated = false;
    if (idx >= 0) {
      state.orders[idx] = { ...state.orders[idx], ...clean };
      updated = true;
    } else {
      state.orders.push(clean);
    }

    state.orders = sortOrdersForDisplay(state.orders);
    await storage.saveState(appId, state);
    return json(res, 200, { ok: true, updated });
  }

  if (req.method === 'POST' && pathname === '/api/orders/drink-change') {
    if (isAuthRateLimited(req, 'late-order')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const admin = await authenticateLateOrder(body);
    if (!admin) {
      recordAuthFailure(req, 'late-order');
      return json(res, 403, { error: 'Invalid late order username or password' });
    }
    clearAuthFailures(req, 'late-order');

    const appId = getAppIdFromRequest(urlObj, body);
    const dept = normText(body.dept);
    const name = normText(body.name);
    const nextDrink = normText(body.drink);
    if (!dept || !name) return json(res, 400, { error: 'dept and name are required' });
    const state = await storage.getState(appId);
    const order = (state.orders || []).find(o => normText(o.dept) === dept && normText(o.name) === name);
    if (!order) return json(res, 404, { error: 'Order not found' });
    const currentDrink = normText(order.drink);
    const originalDrink = currentDrink.includes(' → ') ? normText(currentDrink.split(' → ')[0]) : currentDrink;
    const changedDrink = originalDrink && nextDrink && originalDrink !== nextDrink
      ? `${originalDrink} → ${nextDrink}`
      : nextDrink;

    if (USE_SUPABASE) {
      await updateOrderDrinkSupabase(appId, state.date, dept, name, changedDrink);
      const nextState = await storage.getState(appId);
      return json(res, 200, { ok: true, orders: nextState.orders });
    }

    order.drink = changedDrink;
    await storage.saveState(appId, state);
    return json(res, 200, { ok: true, orders: state.orders });
  }

  if (req.method === 'GET' && pathname === '/api/orders') {
    const appId = getAppIdFromRequest(urlObj);
    const state = await storage.getState(appId);
    return json(res, 200, {
      orders: state.orders,
      total: state.orders.reduce((sum, o) => sum + Number(o.price || 0), 0),
      currentRestaurant: state.restaurant || null,
      cutoffTime: state.cutoffTime || DEFAULT_CUTOFF_TIME,
      cutoffPassed: isCutoffPassed(state.cutoffTime)
    });
  }

  if (req.method === 'GET' && pathname === '/api/export/csv') {
    const appId = getAppIdFromRequest(urlObj);
    const state = await storage.getState(appId);
    const csv = toCsv(state.orders);
    const suffix = appId === APP_LADY_RUBY ? '-lady-ruby' : '';
    const fileName = `orders-${state.date}${suffix}.csv`;
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`
    });
    return res.end('\uFEFF' + csv);
  }

  if (req.method === 'POST' && pathname === '/api/import/seed') {
    const body = await parseBody(req);
    const appId = getAppIdFromRequest(urlObj, body);
    const nextSeed = body && body.seed ? body.seed : null;
    if (!nextSeed || typeof nextSeed !== 'object') return json(res, 400, { error: 'seed payload is required' });
    await storage.saveSeed(nextSeed);
    await storage.resetDay(appId);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/admin/login') {
    if (isAuthRateLimited(req, 'admin')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const admin = await authenticateAdmin(body);
    if (!admin) {
      recordAuthFailure(req, 'admin');
      return json(res, 403, { error: 'Invalid admin username or password' });
    }
    clearAuthFailures(req, 'admin');
    await ensureRecentLoginLog(admin);
    return json(res, 200, {
      ok: true,
      user: {
        username: admin.username,
        permissions: admin.permissions,
        staffDepartments: admin.staffDepartments || [],
        isRoot: admin.isRoot
      }
    });
  }

  if (req.method === 'GET' && pathname === '/api/admin/seed') {
    if (isAuthRateLimited(req, 'admin')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const admin = await authenticateAdmin({
      username: urlObj.searchParams.get('username'),
      password: urlObj.searchParams.get('password')
    });
    if (!admin) {
      recordAuthFailure(req, 'admin');
      return json(res, 403, { error: 'Invalid admin username or password' });
    }
    clearAuthFailures(req, 'admin');
    await ensureRecentLoginLog(admin);
    const seed = await storage.getSeed();
    const restaurantContacts = await storage.getRestaurantContacts();
    return json(res, 200, {
      seed: scopeSeedForAdmin(seed, admin),
      restaurantContacts,
      user: {
        username: admin.username,
        permissions: admin.permissions,
        staffDepartments: admin.staffDepartments || [],
        isRoot: admin.isRoot
      }
    });
  }

  if (req.method === 'POST' && pathname === '/api/admin/seed') {
    if (isAuthRateLimited(req, 'admin')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const admin = await authenticateAdmin(body);
    const nextSeed = body && body.seed ? body.seed : null;
    const merge = Boolean(body && body.merge);
    const section = normalizeAdminSection(body && body.section);
    const menuRestaurant = section === 'menus' ? normText(body && body.menuRestaurant) : '';
    if (!admin) {
      recordAuthFailure(req, 'admin');
      return json(res, 403, { error: 'Invalid admin username or password' });
    }
    clearAuthFailures(req, 'admin');
    if (!nextSeed || typeof nextSeed !== 'object') return json(res, 400, { error: 'seed payload is required' });
    if (merge) {
      if (!requireAdminPermission(admin, 'import')) {
        return json(res, 403, { error: 'You do not have permission to import data.' });
      }
    } else if (section) {
      if (!requireAdminPermission(admin, section)) {
        return json(res, 403, { error: `You do not have permission to edit ${section}.` });
      }
    } else if (!admin.isRoot) {
      return json(res, 403, { error: 'You do not have permission to save all data.' });
    }

    const currentSeed = await storage.getSeed();

    if (merge) {
      const mergedSeed = mergeSeeds(currentSeed, nextSeed);
      const added = diffSeedAdded(currentSeed, mergedSeed);
      await storage.saveSeed(mergedSeed);
      await appendAdminLogSafe(buildSeedLogEntry({
        admin,
        section: 'import',
        merge: true,
        beforeSeed: currentSeed,
        afterSeed: mergedSeed,
        added
      }));
      return json(res, 200, { ok: true, merged: true, seed: mergedSeed, added });
    }

    const finalSeed = section === 'staff'
      ? mergeScopedStaffSeed(currentSeed, nextSeed, admin)
      : (section === 'menus'
        ? mergeScopedMenuRestaurantSeed(currentSeed, nextSeed, menuRestaurant)
        : nextSeed);
    await storage.saveSeed(finalSeed);
    await appendAdminLogSafe(buildSeedLogEntry({
      admin,
      section: section || 'all',
      merge: false,
      beforeSeed: currentSeed,
      afterSeed: finalSeed
    }));
    return json(res, 200, { ok: true, merged: false });
  }

  if (req.method === 'POST' && pathname === '/api/admin/restaurant-contact') {
    if (isAuthRateLimited(req, 'admin')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const admin = await authenticateAdmin(body);
    if (!admin) {
      recordAuthFailure(req, 'admin');
      return json(res, 403, { error: 'Invalid admin username or password' });
    }
    clearAuthFailures(req, 'admin');
    if (!requireAdminPermission(admin, 'restaurants')) {
      return json(res, 403, { error: 'You do not have permission to edit restaurants.' });
    }
    const contact = normalizeRestaurantContact(body && body.contact);
    if (!contact) return json(res, 400, { error: 'restaurant contact is required' });
    const seed = await storage.getSeed();
    if (!(seed.restaurants || []).includes(contact.restaurant)) {
      return json(res, 400, { error: 'Unknown restaurant' });
    }
    const restaurantContacts = await storage.saveRestaurantContact(contact);
    await appendAdminLogSafe({
      username: admin.username,
      action: 'save',
      section: 'restaurants',
      summary: `更新餐廳聯絡資料：${contact.restaurant}`,
      details: { restaurant: contact.restaurant }
    });
    return json(res, 200, { ok: true, restaurantContacts });
  }

  if (req.method === 'POST' && pathname === '/api/admin/reset-day') {
    if (isAuthRateLimited(req, 'admin')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const appId = getAppIdFromRequest(urlObj, body);
    const admin = await authenticateAdmin(body);
    if (!admin) {
      recordAuthFailure(req, 'admin');
      return json(res, 403, { error: 'Invalid admin username or password' });
    }
    clearAuthFailures(req, 'admin');
    const neededPermission = appId === APP_LADY_RUBY ? 'reset_lady_ruby' : 'reset_main';
    if (!requireAdminPermission(admin, neededPermission)) {
      return json(res, 403, { error: 'You do not have permission to reset this page.' });
    }
    await storage.resetDay(appId);
    await appendAdminLogSafe(buildResetLogEntry(admin, appId));
    return json(res, 200, { ok: true });
  }

  if (req.method === 'GET' && pathname === '/api/admin/logs') {
    if (isAuthRateLimited(req, 'admin')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const admin = await authenticateAdmin({
      username: urlObj.searchParams.get('username'),
      password: urlObj.searchParams.get('password')
    });
    if (!admin) {
      recordAuthFailure(req, 'admin');
      return json(res, 403, { error: 'Invalid admin username or password' });
    }
    clearAuthFailures(req, 'admin');
    const limitRaw = Number(urlObj.searchParams.get('limit') || 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 100;
    const logs = await storage.getAdminLogs({
      limit,
      username: admin.isRoot ? '' : admin.username,
      excludeActions: admin.isRoot ? [] : ['login']
    });
    return json(res, 200, { logs });
  }

  if (req.method === 'POST' && pathname === '/api/admin/logs/delete') {
    if (isAuthRateLimited(req, 'admin')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const admin = await authenticateAdmin(body);
    if (!admin) {
      recordAuthFailure(req, 'admin');
      return json(res, 403, { error: 'Invalid admin username or password' });
    }
    clearAuthFailures(req, 'admin');
    if (!admin.isRoot) {
      return json(res, 403, { error: 'Only admin can delete logs.' });
    }
    const deleted = await storage.deleteAdminLog(body && body.id);
    return json(res, 200, { ok: true, deleted });
  }

  if (req.method === 'GET' && pathname === '/api/admin/users') {
    if (isAuthRateLimited(req, 'admin')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const admin = await authenticateAdmin({
      username: urlObj.searchParams.get('username'),
      password: urlObj.searchParams.get('password')
    });
    if (!admin) {
      recordAuthFailure(req, 'admin');
      return json(res, 403, { error: 'Invalid admin username or password' });
    }
    clearAuthFailures(req, 'admin');
    if (!requireAdminPermission(admin, 'users')) {
      return json(res, 403, { error: 'You do not have permission to manage users.' });
    }
    const users = await storage.getAdminUsers();
    return json(res, 200, {
      users: users.map(user => ({ username: user.username, permissions: user.permissions, staffDepartments: user.staffDepartments || [] }))
    });
  }

  if (req.method === 'POST' && pathname === '/api/admin/users') {
    if (isAuthRateLimited(req, 'admin')) {
      return json(res, 429, { error: 'Too many failed password attempts. Please try again later.' });
    }
    const body = await parseBody(req);
    const admin = await authenticateAdmin(body);
    if (!admin) {
      recordAuthFailure(req, 'admin');
      return json(res, 403, { error: 'Invalid admin username or password' });
    }
    clearAuthFailures(req, 'admin');
    if (!requireAdminPermission(admin, 'users')) {
      return json(res, 403, { error: 'You do not have permission to manage users.' });
    }

    const usersInput = Array.isArray(body.users) ? body.users : [];
    const existingUsers = await storage.getAdminUsers();
    const existingByUsername = new Map(existingUsers.map(user => [user.username, user]));
    const nextUsers = [];
    for (const item of usersInput) {
      const username = normText(item && item.username).toLowerCase();
      const password = normText(item && item.password);
      const existingHash = normText(item && item.passwordHash) || normText(existingByUsername.get(username) && existingByUsername.get(username).passwordHash);
      const permissions = Array.isArray(item && item.permissions) ? item.permissions : [];
      const staffDepartments = Array.isArray(item && item.staffDepartments) ? item.staffDepartments : [];
      if (!username || username === 'admin') continue;
      const passwordHash = password ? hashPassword(password) : existingHash;
      const normalized = normalizeAdminUser({ username, passwordHash, permissions, staffDepartments });
      if (!normalized) continue;
      nextUsers.push(normalized);
    }
    await storage.saveAdminUsers(nextUsers);
    await appendAdminLogSafe(buildAdminUsersLogEntry(admin, existingUsers, nextUsers));
    return json(res, 200, {
      ok: true,
      users: nextUsers.map(user => ({ username: user.username, permissions: user.permissions, staffDepartments: user.staffDepartments || [] }))
    });
  }

  return json(res, 404, { error: 'API route not found', method: req.method, path: pathname });
}

function createHandler() {
  return async function handler(req, res) {
    try {
      const host = req.headers.host || `${HOST}:${PORT}`;
      const urlObj = new URL(req.url, `http://${host}`);
      if (urlObj.pathname.startsWith('/api/')) return await handleApi(req, res, urlObj);
      return serveStatic(req, urlObj.pathname, res);
    } catch (err) {
      const message = err && err.message ? err.message : 'Server error';
      return json(res, 500, { error: message });
    }
  };
}

if (!USE_SUPABASE) ensureDataFiles();

if (require.main === module) {
  const server = http.createServer(createHandler());
  server.listen(PORT, HOST, () => {
    console.log(`Overtime meal app running at http://${HOST}:${PORT}`);
    console.log(`Storage mode: ${USE_SUPABASE ? 'Supabase (normalized tables)' : 'Local files'}`);
  });
}

module.exports = { createHandler };
