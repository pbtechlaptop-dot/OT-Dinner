const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { parseStatisticsRange, splitFoodItems, buildOrderStatistics } = require('../lib/order-statistics');
const range = { from: '2026-11-01', to: '2026-11-30', app: 'all', includeTests: false };
const order = (restaurant, food, extra = {}) => ({
  date: '2026-11-18', app_id: 'main', restaurant, food, ...extra
});
const log = (restaurant, app = 'main', extra = {}) => ({
  action: 'restaurant', created_at: '2026-11-17T22:00:00Z',
  details: { restaurant, app, ...extra }
});

test('range accepts valid inclusive dates and rejects impossible or reversed dates and invalid scope', () => {
  assert.equal(parseStatisticsRange(new URLSearchParams(), '2026-11-21').from, '2026-11-01');
  assert.throws(() => parseStatisticsRange(new URLSearchParams('from=2026-02-30'), '2026-11-21'));
  assert.throws(() => parseStatisticsRange(new URLSearchParams('from=2026-12-01&to=2026-11-01'), '2026-11-21'));
  assert.throws(() => parseStatisticsRange(new URLSearchParams('app=other'), '2026-11-21'));
});

test('dish quantities are separate from orders and plus signs inside dish names are retained', () => {
  assert.deepEqual(splitFoodItems('Rice x 2 + Chicken（A + B） + Soup × 3'), [
    { food: 'Rice', servings: 2 }, { food: 'Chicken（A + B）', servings: 1 }, { food: 'Soup', servings: 3 }
  ]);
  const result = buildOrderStatistics([order('A', 'Rice + Rice x 2')], [], range);
  assert.equal(result.summary.orders, 1);
  assert.equal(result.summary.servings, 3);
  assert.equal(result.dishes[0].orders, 1);
  assert.equal(result.dishes[0].servings, 3);
});

test('restaurant top three uses days, dishes use servings, and equal dish names stay restaurant-scoped', () => {
  const rows = [order('A', 'Rice x 2'), order('A', 'Soup'), order('B', 'Rice x 5'),
    order('C', 'Chicken'), order('D', 'Toast'), order('A', 'Rice', { date: '2026-12-01' })];
  const result = buildOrderStatistics(rows, [], range);
  assert.equal(result.restaurants.length, 3);
  assert.equal(result.restaurants[0].restaurant, 'A');
  assert.equal(result.restaurants[0].days, 1);
  assert.equal(result.dishes[0].restaurant, 'B');
  assert.equal(result.dishes[0].servings, 5);
  assert.equal(result.summary.orders, 5);
  assert.equal(result.dishes.filter(row => row.food === 'Rice').length, 2);
});

test('legacy attribution requires a single restaurant for the same business date and app', () => {
  const rows = [order(null, 'Rice'), order(null, 'Soup', { app_id: 'lady-ruby' })];
  const result = buildOrderStatistics(rows, [log('A'), log('A')], range);
  assert.equal(result.summary.inferredOrders, 1);
  assert.equal(result.summary.unknownOrders, 1);
  const ambiguous = buildOrderStatistics(rows, [log('A'), log('B')], range);
  assert.equal(ambiguous.summary.inferredOrders, 0);
  const switched = buildOrderStatistics(rows, [log('B', 'main', { previousRestaurant: 'A' })], range);
  assert.equal(switched.summary.inferredOrders, 0);
  const explicit = buildOrderStatistics([order('C', 'Rice')], [log('A'), log('B')], range);
  assert.equal(explicit.dishes[0].restaurant, 'C');
  assert.equal(explicit.restaurants.some(item => item.restaurant === 'C'), true);
  assert.equal(explicit.summary.recordedOrders, 1);
});

test('many orders on one day cannot outrank a restaurant used on two days', () => {
  const rows = [
    ...Array.from({ length: 50 }, () => order('A', 'Rice')),
    order('B', 'Soup'), order('B', 'Soup', { date: '2026-11-19' }),
    order('B', 'Soup', { app_id: 'lady-ruby', date: '2026-11-19' })
  ];
  const result = buildOrderStatistics(rows, [], range);
  assert.deepEqual(result.restaurants, [{ restaurant: 'B', days: 2 }, { restaurant: 'A', days: 1 }]);
});

test('restaurant selection logs count days even without orders, respecting page and date filters', () => {
  const records = [log('A'), log('A'), log('A', 'lady-ruby'), log('B', 'lady-ruby'),
    { ...log('A'), created_at: '2026-10-01T00:00:00Z' }];
  assert.deepEqual(buildOrderStatistics([], records, range).restaurants,
    [{ restaurant: 'A', days: 1 }, { restaurant: 'B', days: 1 }]);
  assert.deepEqual(buildOrderStatistics([], records, { ...range, app: 'main' }).restaurants,
    [{ restaurant: 'A', days: 1 }]);
});

test('test orders are excluded by default, and page and date filters do not mix locations', () => {
  const rows = [order('A', 'Rice', { addon: '速度測試，非正式訂餐' }),
    order('B', 'Soup', { app_id: 'lady-ruby' }), order('C', 'Toast')];
  assert.equal(buildOrderStatistics(rows, [], range).summary.excludedTests, 1);
  assert.equal(buildOrderStatistics(rows, [], { ...range, includeTests: true }).summary.orders, 3);
  const ruby = buildOrderStatistics(rows, [], { ...range, app: 'lady-ruby' });
  assert.equal(ruby.summary.orders, 1);
  assert.equal(ruby.restaurants[0].restaurant, 'B');
  assert.equal(buildOrderStatistics([], [], range).dishes.length, 0);
});

test('public statistics API paginates past 1000 rows and never returns private order fields', async () => {
  const root = path.join(__dirname, '..');
  const rows = Array.from({ length: 1201 }, (_, index) => ({
    ...order('A', 'Rice'), id: index + 1, name: 'PRIVATE_NAME', addon: 'PRIVATE_NOTE',
    dept: 'PRIVATE_DEPT', price: 123
  }));
  const pages = [];
  const client = {
    from(table) {
      let filtered = table === 'orders' ? rows : [];
      const query = {
        select: () => query, order: () => query,
        eq: (key, value) => { filtered = filtered.filter(row => row[key] === value); return query; },
        gte: (key, value) => { filtered = filtered.filter(row => row[key] >= value); return query; },
        lte: (key, value) => { filtered = filtered.filter(row => row[key] <= value); return query; },
        lt: (key, value) => { filtered = filtered.filter(row => row[key] < value); return query; },
        range: async (start, end) => { pages.push([table, start]); return { data: filtered.slice(start, end + 1) }; }
      };
      return query;
    }
  };
  const stub = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'server.js'), 'utf8'), {
    require: name => name === '@supabase/supabase-js' ? { createClient: () => client }
      : name === 'fs' ? { existsSync: () => false } : require(name),
    __dirname: root, module: stub, Buffer, console,
    process: { env: { SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test-only' } }
  });
  let status;
  let body;
  await stub.exports.createHandler()({
    method: 'GET', url: '/api/statistics?from=2026-11-01&to=2026-11-30', headers: { host: 'localhost' }
  }, { writeHead: code => { status = code; }, end: text => { body = text; } });
  assert.equal(status, 200);
  assert.equal(JSON.parse(body).summary.orders, 1201);
  assert.deepEqual(pages.filter(([table]) => table === 'orders').map(([, start]) => start), [0, 500, 1000]);
  assert.doesNotMatch(body, /PRIVATE_NAME|PRIVATE_NOTE|PRIVATE_DEPT|ordered_at|username/);
});
