const http = require('http');
const fs = require('fs');
const path = require('path');
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
const USE_SUPABASE = Boolean(createClient && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const supabase = USE_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

const TABLES = {
  restaurants: process.env.SUPABASE_TABLE_RESTAURANTS || 'restaurants',
  drinks: process.env.SUPABASE_TABLE_DRINKS || 'drinks',
  staff: process.env.SUPABASE_TABLE_STAFF || 'staff',
  menus: process.env.SUPABASE_TABLE_MENUS || 'menus',
  appState: process.env.SUPABASE_TABLE_APP_STATE || 'app_state',
  orders: process.env.SUPABASE_TABLE_ORDERS || 'orders'
};

const DEFAULT_CUTOFF_TIME = '13:00';
const legacySupabaseState = {
  cutoffTime: DEFAULT_CUTOFF_TIME
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

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

function defaultSeed() {
  return { restaurants: [], staff: {}, drinks: [], menus: {} };
}

function defaultState() {
  return { date: todayISO(), restaurant: null, cutoffTime: DEFAULT_CUTOFF_TIME, orders: [] };
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
  const ladyRubyNames = Array.isArray(allStaff && allStaff['Lady Ruby']) ? allStaff['Lady Ruby'] : [];
  return { 'Lady Ruby': ladyRubyNames };
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

function normalizeMenuItem(item) {
  if (!item || typeof item !== 'object') return null;
  const nameTc = normText(item.nameTc || item.tc || item.name || item.nameChi);
  const nameSc = normText(item.nameSc || item.sc || nameTc);
  const nameEn = normText(item.nameEn || item.en || item.nameEng || nameTc);
  const price = Number(item.price);
  if (!nameTc || !Number.isFinite(price) || price < 0) return null;
  return { nameTc, nameSc: nameSc || nameTc, nameEn: nameEn || nameTc, price };
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
        if (it && it.nameTc) menuItems.add(`${r}|${c}|${it.nameTc}`);
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
function normalizeState(input) {
  const state = input && typeof input === 'object' ? input : defaultState();
  return {
    date: normText(state.date) || todayISO(),
    restaurant: state.restaurant ? normText(state.restaurant) : null,
    cutoffTime: normalizeCutoffTime(state.cutoffTime) || DEFAULT_CUTOFF_TIME,
    orders: Array.isArray(state.orders) ? state.orders : []
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
  const menuRows = await supaSelect(TABLES.menus, 'restaurant,category,name_tc,name_sc,name_en,price', {
    order: [{ column: 'restaurant' }, { column: 'category' }, { column: 'name_tc' }]
  });

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
    const item = normalizeMenuItem({ nameTc: m.name_tc, nameSc: m.name_sc, nameEn: m.name_en, price: m.price });
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

  await supaDeleteAll(TABLES.menus, 'id');
  await supaDeleteAll(TABLES.staff, 'id');
  await supaDeleteAll(TABLES.drinks, 'tc');
  await supaDeleteAll(TABLES.restaurants, 'name');

  if (seed.restaurants.length) {
    const { error } = await supabase.from(TABLES.restaurants).insert(seed.restaurants.map(name => ({ name })));
    if (error) throw new Error(`Supabase insert restaurants failed: ${error.message}`);
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
          price: Number(it.price)
        });
      });
    });
  });
  const menuRows = Array.from(menuMap.values());
  if (menuRows.length) {
    const { error } = await supabase.from(TABLES.menus).insert(menuRows);
    if (error) throw new Error(`Supabase insert menus failed: ${error.message}`);
  }
}

async function selectOrdersSupabase(date, appId) {
  try {
    return await supaSelect(TABLES.orders, 'dept,name,food,addon,drink,price,app_id', {
      eq: { date, app_id: appId },
      order: [{ column: 'dept' }, { column: 'name' }]
    });
  } catch (err) {
    if (!isMissingSupabaseColumn(err, 'app_id')) throw err;
    if (appId !== APP_MAIN) {
      throw new Error('Supabase orders table is missing app_id. Please run the SQL migration before using Lady Ruby in production.');
    }
    return supaSelect(TABLES.orders, 'dept,name,food,addon,drink,price', {
      eq: { date },
      order: [{ column: 'dept' }, { column: 'name' }]
    });
  }
}

async function clearOrdersSupabase(date, appId) {
  let query = supabase.from(TABLES.orders).delete().eq('date', date).eq('app_id', appId);
  let result = await query;
  if (result.error && isMissingSupabaseColumn(result.error, 'app_id')) {
    if (appId !== APP_MAIN) {
      throw new Error('Supabase orders table is missing app_id. Please run the SQL migration before using Lady Ruby in production.');
    }
    result = await supabase.from(TABLES.orders).delete().eq('date', date);
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
    price: Number(o.price || 0)
  }));
  let result = await supabase.from(TABLES.orders).insert(rowsWithApp);
  if (result.error && isMissingSupabaseColumn(result.error, 'app_id')) {
    if (appId !== APP_MAIN) {
      throw new Error('Supabase orders table is missing app_id. Please run the SQL migration before using Lady Ruby in production.');
    }
    const legacyRows = orders.map(o => ({
      date,
      dept: normText(o.dept),
      name: normText(o.name),
      food: normText(o.food),
      addon: normText(o.addon),
      drink: normText(o.drink),
      price: Number(o.price || 0)
    }));
    result = await supabase.from(TABLES.orders).insert(legacyRows);
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
    price: Number(order.price)
  };
  let result = await supabase.from(TABLES.orders).upsert(row, { onConflict: 'date,app_id,dept,name' });
  if (result.error && isMissingSupabaseColumn(result.error, 'app_id')) {
    if (appId !== APP_MAIN) {
      throw new Error('Supabase orders table is missing app_id. Please run the SQL migration before using Lady Ruby in production.');
    }
    const legacyRow = {
      date,
      dept: normText(order.dept),
      name: normText(order.name),
      food: normText(order.food),
      addon: normText(order.addon),
      drink: normText(order.drink),
      price: Number(order.price)
    };
    result = await supabase.from(TABLES.orders).upsert(legacyRow, { onConflict: 'date,dept,name' });
  }
  if (result.error) throw new Error(`Supabase upsert order failed: ${result.error.message}`);
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

  const orders = (ordersRows || []).map((o, i) => ({
    id: i + 1,
    dept: normText(o.dept),
    name: normText(o.name),
    food: normText(o.food),
    addon: normText(o.addon),
    drink: normText(o.drink),
    price: Number(o.price || 0)
  }));

  return {
    date: appState.date,
    restaurant: appState.restaurant ? normText(appState.restaurant) : null,
    cutoffTime: normalizeCutoffTime(appState.cutoff_time) || legacySupabaseState.cutoffTime || DEFAULT_CUTOFF_TIME,
    orders
  };
}

async function saveStateSupabase(appId = APP_MAIN, input) {
  const normalizedAppId = normalizeAppId(appId);
  const stateRowId = APP_STATE_ROW_IDS[normalizedAppId] || 1;
  const state = normalizeState(input);
  legacySupabaseState.cutoffTime = state.cutoffTime;
  let e1 = null;
  const withCutoff = await supabase
    .from(TABLES.appState)
    .upsert({ id: stateRowId, date: state.date, restaurant: state.restaurant, cutoff_time: state.cutoffTime }, { onConflict: 'id' });
  e1 = withCutoff.error;
  if (e1 && isMissingSupabaseColumn(e1, 'cutoff_time')) {
    const fallback = await supabase
      .from(TABLES.appState)
      .upsert({ id: stateRowId, date: state.date, restaurant: state.restaurant }, { onConflict: 'id' });
    e1 = fallback.error;
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

async function getStateLocal(appId = APP_MAIN) {
  const statePath = stateFileForApp(appId);
  const state = normalizeState(readJsonSafe(statePath, defaultState()));
  if (state.date !== todayISO()) {
    const reset = defaultState();
    writeJson(statePath, reset);
    return reset;
  }
  return state;
}

async function saveStateLocal(appId = APP_MAIN, state) {
  writeJson(stateFileForApp(appId), normalizeState(state));
}

async function resetDayLocal(appId = APP_MAIN) {
  writeJson(stateFileForApp(appId), defaultState());
}

const storage = {
  getSeed: USE_SUPABASE ? getSeedSupabase : getSeedLocal,
  saveSeed: USE_SUPABASE ? saveSeedSupabase : saveSeedLocal,
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
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function text(res, status, payload, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(payload);
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
  orders.forEach((o, i) => {
    const row = [i + 1, o.dept, o.name, o.food, o.addon || '', o.drink || '', o.price].map(value => {
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
  if (isLadyRubyPage && !hasLadyRubyAccess(req)) return text(res, 404, 'Not found');

  fs.readFile(filePath, (err, data) => {
    if (err) return text(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

function isAdminAuthorized(password) {
  return normText(password) && normText(password) === ADMIN_PASSWORD;
}

async function handleApi(req, res, urlObj) {
  const pathname = (urlObj.pathname || '/').replace(/\/+$/, '') || '/';

  if (req.method === 'POST' && pathname === '/api/private-access') {
    const body = await parseBody(req);
    const target = normalizeAppId(body && body.target);
    const password = normText(body && body.password);
    if (target !== APP_LADY_RUBY || password !== LADY_RUBY_PASSWORD) {
      return json(res, 403, { error: 'Invalid password' });
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': `${LADY_RUBY_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax`
    });
    return res.end(JSON.stringify({ ok: true, redirect: '/lady-ruby/' }));
  }

  if (req.method === 'GET' && pathname === '/api/bootstrap') {
    const appId = getAppIdFromRequest(urlObj);
    const seed = await storage.getSeed();
    const rawState = await storage.getState(appId);
    const state = await ensureStateHasValidRestaurant(appId, seed, rawState);
    return json(res, 200, {
      date: state.date,
      restaurants: seed.restaurants,
      staff: getScopedStaff(seed.staff, appId),
      drinks: seed.drinks,
      currentRestaurant: state.restaurant,
      cutoffTime: state.cutoffTime,
      cutoffPassed: isCutoffPassed(state.cutoffTime),
      orders: state.orders,
      app: appId
    });
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

  if (req.method === 'POST' && pathname === '/api/restaurant') {
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
    if (forceChange && password !== CHANGE_PASSWORD) return json(res, 403, { error: 'Invalid password' });
    if (state.restaurant && (restaurantChanged || cutoffChanged) && password !== CHANGE_PASSWORD) {
      return json(res, 403, { error: 'Password is required to change restaurant or cutoff time.' });
    }

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
    if (isCutoffPassed(state.cutoffTime)) {
      return json(res, 403, { error: 'Ordering cutoff has passed. Please contact your team leader or Simon to place an order.' });
    }

    const error = validateOrder(body);
    if (error) return json(res, 400, { error });

    const clean = {
      dept: normText(body.dept),
      name: normText(body.name),
      food: normText(body.food),
      addon: normText(body.addon),
      drink: normText(body.drink),
      price: Number(body.price)
    };

    const existed = state.orders.some(o => o.dept === clean.dept && o.name === clean.name);

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

    state.orders = state.orders.map((o, i) => ({ id: i + 1, ...o }));
    await storage.saveState(appId, state);
    return json(res, 200, { ok: true, updated });
  }

  if (req.method === 'GET' && pathname === '/api/orders') {
    const appId = getAppIdFromRequest(urlObj);
    const state = await storage.getState(appId);
    return json(res, 200, {
      orders: state.orders,
      total: state.orders.reduce((sum, o) => sum + Number(o.price || 0), 0)
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

  if (req.method === 'GET' && pathname === '/api/admin/seed') {
    const seed = await storage.getSeed();
    const password = normText(urlObj.searchParams.get('password'));
    if (!isAdminAuthorized(password)) return json(res, 403, { error: 'Invalid admin password' });
    return json(res, 200, { seed });
  }

  if (req.method === 'POST' && pathname === '/api/admin/seed') {
    const body = await parseBody(req);
    const password = normText(body.password);
    const nextSeed = body && body.seed ? body.seed : null;
    const merge = Boolean(body && body.merge);
    if (!isAdminAuthorized(password)) return json(res, 403, { error: 'Invalid admin password' });
    if (!nextSeed || typeof nextSeed !== 'object') return json(res, 400, { error: 'seed payload is required' });

    if (merge) {
      const currentSeed = await storage.getSeed();
      const mergedSeed = mergeSeeds(currentSeed, nextSeed);
      const added = diffSeedAdded(currentSeed, mergedSeed);
      await storage.saveSeed(mergedSeed);
      return json(res, 200, { ok: true, merged: true, seed: mergedSeed, added });
    }

    await storage.saveSeed(nextSeed);
    return json(res, 200, { ok: true, merged: false });
  }

  if (req.method === 'POST' && pathname === '/api/admin/reset-day') {
    const body = await parseBody(req);
    const password = normText(body.password);
    const appId = getAppIdFromRequest(urlObj, body);
    if (!isAdminAuthorized(password)) return json(res, 403, { error: 'Invalid admin password' });
    await storage.resetDay(appId);
    return json(res, 200, { ok: true });
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













