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

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');
const SEED_FILE = path.join(DATA_DIR, 'seed.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const STORE_TABLE = process.env.SUPABASE_STORE_TABLE || 'app_kv';

const USE_SUPABASE = Boolean(createClient && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const supabase = USE_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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

function defaultSeed() {
  return { restaurants: [], staff: {}, drinks: [], menus: {} };
}

function defaultState() {
  return { date: todayISO(), restaurant: null, orders: [] };
}

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const seed = readJsonSafe(SEED_FILE, null);
  if (!seed) writeJson(SEED_FILE, defaultSeed());

  const state = readJsonSafe(STATE_FILE, null);
  if (!state) writeJson(STATE_FILE, defaultState());
}

function normText(v) {
  return String(v || '').trim();
}

function normalizeDrinkItem(d) {
  if (typeof d === 'string') {
    const tc = normText(d);
    return tc ? { tc, sc: tc, en: tc } : null;
  }
  if (!d || typeof d !== 'object') return null;
  const tc = normText(d.tc || d.zhHant || d.name || d.label);
  const sc = normText(d.sc || d.zhHans || tc);
  const en = normText(d.en || d.eng || tc);
  if (!tc && !sc && !en) return null;
  return { tc: tc || sc || en, sc: sc || tc || en, en: en || tc || sc };
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

function normalizeSeed(nextSeed) {
  const restaurants = Array.isArray(nextSeed.restaurants) ? nextSeed.restaurants : [];
  const staff = nextSeed.staff && typeof nextSeed.staff === 'object' ? nextSeed.staff : {};
  const drinks = Array.isArray(nextSeed.drinks) ? nextSeed.drinks : [];
  const menus = nextSeed.menus && typeof nextSeed.menus === 'object' ? nextSeed.menus : {};

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
    const key = `${d.tc}|${d.sc}|${d.en}`;
    if (!drinkSet.has(key)) {
      drinkSet.add(key);
      normalized.drinks.push(d);
    }
  });

  Object.keys(menus).forEach(rest => {
    const cleanRest = normText(rest);
    if (!cleanRest) return;
    normalized.menus[cleanRest] = {};
    const cats = menus[rest] && typeof menus[rest] === 'object' ? menus[rest] : {};
    Object.keys(cats).forEach(cat => {
      const cleanCat = normText(cat);
      if (!cleanCat) return;
      const items = Array.isArray(cats[cat]) ? cats[cat] : [];
      normalized.menus[cleanRest][cleanCat] = items.map(normalizeMenuItem).filter(Boolean);
    });
  });

  return normalized;
}

async function kvGet(key, fallback) {
  if (!USE_SUPABASE) return readJsonSafe(key === 'seed' ? SEED_FILE : STATE_FILE, fallback);

  const { data, error } = await supabase
    .from(STORE_TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw new Error(`Supabase read error (${key}): ${error.message}`);
  if (data && data.value !== undefined && data.value !== null) return data.value;

  await kvSet(key, fallback);
  return fallback;
}

async function kvSet(key, value) {
  if (!USE_SUPABASE) {
    writeJson(key === 'seed' ? SEED_FILE : STATE_FILE, value);
    return;
  }

  const { error } = await supabase
    .from(STORE_TABLE)
    .upsert({ key, value }, { onConflict: 'key' });

  if (error) throw new Error(`Supabase write error (${key}): ${error.message}`);
}

async function getSeed() {
  const seed = await kvGet('seed', defaultSeed());
  return normalizeSeed(seed || defaultSeed());
}

async function getState() {
  const state = await kvGet('state', defaultState());
  if (!state || state.date !== todayISO()) {
    const reset = defaultState();
    await kvSet('state', reset);
    return reset;
  }
  return state;
}

async function saveSeed(seed) {
  await kvSet('seed', normalizeSeed(seed));
}

async function saveState(state) {
  await kvSet('state', state);
}

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

function serveStatic(reqPath, res) {
  let safePath = reqPath === '/' ? '/index.html' : (reqPath === '/admin' ? '/admin.html' : reqPath);
  safePath = path.normalize(safePath).replace(/^\.\.(\\|\/|$)/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) return text(res, 403, 'Forbidden');

  fs.readFile(filePath, (err, data) => {
    if (err) return text(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function isAdminAuthorized(password) {
  return normText(password) && normText(password) === ADMIN_PASSWORD;
}

async function handleApi(req, res, urlObj) {
  const seed = await getSeed();
  const state = await getState();
  const pathname = (urlObj.pathname || '/').replace(/\/+$/, '') || '/';

  if (req.method === 'GET' && pathname === '/api/bootstrap') {
    return json(res, 200, {
      date: state.date,
      restaurants: seed.restaurants,
      staff: seed.staff,
      drinks: seed.drinks,
      currentRestaurant: state.restaurant,
      orders: state.orders
    });
  }

  if (req.method === 'GET' && pathname === '/api/menu') {
    const restaurant = urlObj.searchParams.get('restaurant') || state.restaurant;
    if (!restaurant) return json(res, 400, { error: 'Restaurant is required' });
    const menu = seed.menus[restaurant];
    if (!menu) return json(res, 404, { error: 'Menu not found for selected restaurant' });
    return json(res, 200, { restaurant, menu });
  }

  if (req.method === 'POST' && pathname === '/api/restaurant') {
    const body = await parseBody(req);
    const restaurant = normText(body.restaurant);
    const forceChange = Boolean(body.forceChange);
    const password = normText(body.password);
    if (!restaurant) return json(res, 400, { error: 'restaurant is required' });
    if (!seed.restaurants.includes(restaurant)) return json(res, 400, { error: 'Unknown restaurant' });
    if (forceChange && password !== CHANGE_PASSWORD) return json(res, 403, { error: 'Invalid password' });
    if (state.restaurant && !forceChange && restaurant !== state.restaurant) {
      return json(res, 403, { error: 'Restaurant is locked. Use password change to switch.' });
    }

    state.restaurant = restaurant;
    if (forceChange) state.orders = [];
    await saveState(state);
    return json(res, 200, { ok: true, currentRestaurant: state.restaurant, cleared: forceChange });
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    if (!state.restaurant) return json(res, 400, { error: 'Please set today restaurant first' });
    const body = await parseBody(req);
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

    const idx = state.orders.findIndex(o => o.dept === clean.dept && o.name === clean.name);
    let updated = false;
    if (idx >= 0) {
      state.orders[idx] = { ...state.orders[idx], ...clean };
      updated = true;
    } else {
      state.orders.push(clean);
    }

    state.orders = state.orders.map((o, i) => ({ id: i + 1, ...o }));
    await saveState(state);
    return json(res, 200, { ok: true, updated, orders: state.orders });
  }

  if (req.method === 'GET' && pathname === '/api/orders') {
    return json(res, 200, {
      orders: state.orders,
      total: state.orders.reduce((sum, o) => sum + Number(o.price || 0), 0)
    });
  }

  if (req.method === 'GET' && pathname === '/api/export/csv') {
    const csv = toCsv(state.orders);
    const fileName = `orders-${state.date}.csv`;
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`
    });
    return res.end('\uFEFF' + csv);
  }

  if (req.method === 'POST' && pathname === '/api/import/seed') {
    const body = await parseBody(req);
    const nextSeed = body && body.seed ? body.seed : null;
    if (!nextSeed || typeof nextSeed !== 'object') return json(res, 400, { error: 'seed payload is required' });

    await saveSeed(nextSeed);
    await saveState(defaultState());
    return json(res, 200, { ok: true });
  }

  if (req.method === 'GET' && pathname === '/api/admin/seed') {
    const password = normText(urlObj.searchParams.get('password'));
    if (!isAdminAuthorized(password)) return json(res, 403, { error: 'Invalid admin password' });
    return json(res, 200, { seed });
  }

  if (req.method === 'POST' && pathname === '/api/admin/seed') {
    const body = await parseBody(req);
    const password = normText(body.password);
    const nextSeed = body && body.seed ? body.seed : null;
    if (!isAdminAuthorized(password)) return json(res, 403, { error: 'Invalid admin password' });
    if (!nextSeed || typeof nextSeed !== 'object') return json(res, 400, { error: 'seed payload is required' });

    await saveSeed(nextSeed);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/admin/reset-day') {
    const body = await parseBody(req);
    const password = normText(body.password);
    if (!isAdminAuthorized(password)) return json(res, 403, { error: 'Invalid admin password' });
    await saveState(defaultState());
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
      return serveStatic(urlObj.pathname, res);
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
    if (USE_SUPABASE) console.log('Storage mode: Supabase');
    if (!USE_SUPABASE) console.log('Storage mode: Local files');
  });
}

module.exports = { createHandler };

