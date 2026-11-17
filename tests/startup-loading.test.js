const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadFunctions(file, names, globals) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n/g, '\n');
  const functions = names.map(name => {
    const pattern = new RegExp(`^(?:async )?function ${name}\\(`, 'm');
    const start = source.search(pattern);
    assert.notEqual(start, -1, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
  }).join('\n');
  return vm.runInNewContext(`${functions}\n({ ${names.join(', ')} })`, globals);
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('today data skips both queries when no restaurant is configured or the selection was removed', async () => {
  for (const restaurant of [null, 'Removed restaurant']) {
    const row = { date: '2026-11-18', restaurant, cutoff_time: '13:00' };
    const { getTodayPageData } = loadFunctions('server.js', [
      'readTodayPageState', 'getTodayPageData'
    ], {
      USE_SUPABASE: true, TABLES: { restaurants: 'restaurants' },
      getAppStateRowSupabase: async () => row,
      describeAppStateRow: value => ({ ...value, cutoffTime: value.cutoff_time }),
      supaSelect: async () => null,
      getOrdersForStateSupabase: () => assert.fail('Unexpected order query'),
      getMenu: () => assert.fail('Unexpected menu query'),
      isCutoffPassed: () => false
    });
    const data = await getTodayPageData('main', true);
    assert.equal(data.currentRestaurant, null);
    assert.equal(data.orders.length, 0);
    assert.equal(Object.keys(data.currentMenu).length, 0);
  }
});

test('today starts orders and only the selected menu together after reading the restaurant', async () => {
  const orders = deferred();
  const started = deferred();
  const calls = [];
  const row = { date: '2026-11-18', restaurant: 'Cafe B', cutoff_time: '13:00' };
  const { getTodayPageData } = loadFunctions('server.js', [
    'readTodayPageState', 'getTodayPageData'
  ], {
    USE_SUPABASE: true, TABLES: { restaurants: 'restaurants' },
    getAppStateRowSupabase: async app => { calls.push(app); return row; },
    describeAppStateRow: value => ({ ...value, cutoffTime: value.cutoff_time }),
    supaSelect: async (_, __, options) => { calls.push(options.eq.name); return { name: 'Cafe B' }; },
    getOrdersForStateSupabase: (app, state) => {
      assert.equal(app, 'lady-ruby');
      assert.equal(state, row);
      calls.push('orders');
      return orders.promise;
    },
    getMenu: async restaurant => {
      calls.push(restaurant);
      started.resolve();
      return { Meals: ['dish'] };
    },
    isCutoffPassed: () => false
  });
  const pending = getTodayPageData('lady-ruby', true);
  await started.promise;
  assert.deepEqual(calls, ['lady-ruby', 'Cafe B', 'orders', 'Cafe B']);
  orders.resolve([]);
  const data = await pending;
  assert.deepEqual(data.currentMenu.Meals, ['dish']);
  assert.deepEqual(data.orders, []);
  await getTodayPageData('lady-ruby');
  assert.deepEqual(calls.slice(4), ['lady-ruby', 'Cafe B', 'orders']);
});

for (const file of ['public/app.js', 'New/app.js']) {
  const loadName = file === 'public/app.js' ? 'loadBootstrap' : 'load';
  test(`${file} makes staff selectable before today's data and ignores stale menu responses`, async () => {
    const basics = deferred();
    const today = deferred();
    const staleMenu = deferred();
    const departmentReady = deferred();
    const state = { currentRestaurant: '', selected: new Map(), defaultCutoffTime: '13:00' };
    const calls = [];
    const el = { dateText: {}, deptSelect: { value: '' }, nameSelect: { options: [] } };
    const funcs = loadFunctions(file, [loadName, 'loadMenu'], {
      state, el, startupRequest: null, restaurantRevision: 0, menuLoadVersion: 0,
      api: url => {
        calls.push(url);
        if (url.endsWith('basics')) return basics.promise;
        if (url.endsWith('today')) return today.promise;
        assert.equal(url, '/api/menu?restaurant=Old');
        return staleMenu.promise;
      },
      t: key => key, setDiag: () => {}, buildLookupMaps: () => {}, renderRestaurants: () => {},
      renderDepartments: () => departmentReady.resolve(), renderDrinks: () => {},
      showAnnouncementIfNeeded: () => {}, updateStaticText: () => {}, applyLastStaff: () => {},
      renderGroupMembers: () => {}, applyDeliveryOverrides: orders => orders,
      rememberDeliveryOverrides: () => {}, orderSignature: orders => JSON.stringify(orders),
      renderCategories: () => {}, renderSelection: () => {}, renderOrders: () => {},
      updateDiagSummary: () => {}, syncOrderMemberAvailability: () => {}
    });
    const initial = funcs[loadName]();
    assert.deepEqual(calls, ['/api/bootstrap?part=basics', '/api/bootstrap?part=today']);
    basics.resolve({ staff: { HQ: ['Alan'] } });
    await departmentReady.promise;
    assert.deepEqual(state.staff, { HQ: ['Alan'] });
    today.resolve({ currentRestaurant: 'Old', currentMenu: { Meals: ['old'] }, orders: [] });
    await initial;
    assert.deepEqual(state.menu, { Meals: ['old'] });
    assert.equal(calls.length, 2);

    const late = funcs.loadMenu('Old');
    state.currentRestaurant = 'New';
    await funcs.loadMenu('New', { Meals: ['new'] });
    staleMenu.resolve({ menu: { Meals: ['stale'] } });
    await late;
    assert.deepEqual(state.menu, { Meals: ['new'] });
  });
}

test('public startup routes keep each location and its menu separate', async () => {
  const root = path.join(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const files = {
    'seed.json': {
      restaurants: ['Cafe A', 'Cafe B'],
      staff: { HQ: ['Alex'], 'Lady Ruby': ['Sam'] },
      menus: {
        'Cafe A': { Meals: [{ nameTc: 'Dish A', price: 15 }] },
        'Cafe B': { Meals: [{ nameTc: 'Dish B', price: 17 }] }
      }
    },
    'state.json': { date, restaurant: null, orders: [] },
    'state.lady-ruby.json': { date, restaurant: 'Cafe B', cutoffTime: '13:00', orders: [] }
  };
  const moduleStub = { exports: {} };
  vm.runInNewContext(source, {
    require: name => name === 'fs' ? {
      existsSync: file => !path.basename(file).startsWith('.env'),
      readFileSync: file => JSON.stringify(files[path.basename(file)] || {}),
      writeFileSync: () => assert.fail('Unexpected storage write')
    } : require(name),
    __dirname: root, module: moduleStub, process: { env: {} }, Buffer, console
  });
  const handler = moduleStub.exports.createHandler();
  const request = async url => {
    let status;
    let data;
    await handler({ method: 'GET', url, headers: { host: 'localhost' } }, {
      writeHead: code => { status = code; },
      end: body => { data = JSON.parse(body); }
    });
    return { status, data };
  };
  const basics = await request('/api/bootstrap?part=basics&app=lady-ruby');
  assert.equal(basics.status, 200);
  assert.deepEqual(basics.data.staff, { 'Lady Ruby': ['Sam'] });
  assert.deepEqual(basics.data.restaurants, ['Cafe A', 'Cafe B']);
  assert.equal('currentMenu' in basics.data, false);

  const main = await request('/api/bootstrap?part=today&app=main');
  assert.equal(main.status, 200);
  assert.equal(main.data.currentRestaurant, null);
  assert.deepEqual(main.data.currentMenu, {});
  assert.deepEqual(main.data.orders, []);

  const ruby = await request('/api/bootstrap?part=today&app=lady-ruby');
  assert.equal(ruby.status, 200);
  assert.equal(ruby.data.currentRestaurant, 'Cafe B');
  assert.deepEqual(ruby.data.currentMenu.Meals.map(item => item.nameTc), ['Dish B']);
  assert.equal((await request('/api/menu?app=lady-ruby&restaurant=Cafe%20A')).status, 409);
});
