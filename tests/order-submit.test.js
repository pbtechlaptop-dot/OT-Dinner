const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const date = '2026-11-18';
const originalTime = '2026-11-18T07:00:00.000Z';
const initialOrder = { dept: 'HQ', name: 'Alan', food: 'Rice', price: 18,
  orderedAt: originalTime, lateOrder: false };
const requestOrder = { dept: 'HQ', name: 'Alan', food: 'Noodles', price: 20, sourcePage: 'new' };

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function setup({ orders = [], late = false, ...overrides } = {}) {
  const calls = [];
  let saved;
  const dependencies = {
    getState: async app => {
      calls.push(['state', app]);
      return { date, restaurant: 'Cafe A', cutoffTime: '13:00', orders };
    },
    getSettings: async () => { calls.push(['settings']); return { priceLimit: 22 }; },
    save: async (app, day, order) => { saved = order; calls.push(['save', app, day]); },
    remove: async (app, day, order) => { calls.push(['remove', app, day, order.name]); },
    read: async (day, app) => {
      calls.push(['read', app, day]);
      return [{ dept: saved.dept, name: saved.name, food: saved.food, price: saved.price,
        restaurant: saved.restaurant,
        pickup_dept: saved.pickupDept, source_page: saved.sourcePage,
        ordered_at: saved.orderedAt, addon: saved.addon, drink: saved.drink }];
    },
    late: () => late,
    ...overrides
  };
  const moduleStub = { exports: {} };
  vm.runInNewContext(source + `
    storage.getState = __deps.getState;
    storage.getNewSettings = __deps.getSettings;
    upsertOrderSupabase = __deps.save;
    deleteOrderSupabase = __deps.remove;
    selectOrdersSupabase = __deps.read;
    isCutoffPassed = __deps.late;
    authenticateLateOrder = async () => null;
  `, {
    require: name => {
      if (name === '@supabase/supabase-js') return { createClient: () => ({}) };
      if (name === 'fs') return {
        existsSync: () => false,
        readFileSync: () => assert.fail('Unexpected file read'),
        writeFileSync: () => assert.fail('Unexpected file write')
      };
      return require(name);
    },
    __dirname: root, module: moduleStub, __deps: dependencies,
    process: { env: { SUPABASE_URL: 'https://example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test-only' } },
    Buffer, console: { warn: () => {} }
  });
  return {
    calls, saved: () => saved,
    async submit(body = requestOrder) {
      const req = new EventEmitter();
      Object.assign(req, { method: 'POST', url: '/api/orders', headers: { host: 'localhost' } });
      let status;
      let data;
      const pending = moduleStub.exports.createHandler()(req, {
        writeHead: code => { status = code; },
        end: value => { data = JSON.parse(value); }
      });
      req.emit('data', Buffer.from(JSON.stringify(body)));
      req.emit('end');
      await pending;
      return { status, data };
    }
  };
}

test('starts state and settings together, waits for DB write, then returns persisted orders', { timeout: 2000 }, async () => {
  const settings = deferred();
  const state = deferred();
  const write = deferred();
  const started = deferred();
  const checksStarted = deferred();
  const checks = [];
  let finished = false;
  const app = setup({
    getState: () => { checks.push('state'); return state.promise; },
    getSettings: () => { checks.push('settings'); checksStarted.resolve(); return settings.promise; },
    save: async () => { started.resolve(); await write.promise; },
    read: async (day, appId) => {
      assert.equal(finished, true);
      assert.equal(day, date);
      assert.equal(appId, 'lady-ruby');
      return [{ dept: 'HQ', name: 'Alan', food: 'Noodles', price: 20 },
        { dept: 'HQ', name: 'Ben', food: 'Rice', price: 18 }];
    }
  });
  const pending = app.submit({ ...requestOrder, app: 'lady-ruby' });
  await checksStarted.promise;
  assert.deepEqual(checks, ['state', 'settings']);
  // Resolve settings before state: neither depends on the other query completing.
  settings.resolve({ priceLimit: 22 });
  state.resolve({ date, restaurant: 'Cafe A', cutoffTime: '13:00', orders: [] });
  await started.promise;
  assert.equal(finished, false);
  finished = true;
  write.resolve();
  const result = await pending;
  assert.equal(result.status, 200);
  assert.equal(result.data.updated, false);
  assert.deepEqual(result.data.orders.map(order => order.name), ['Alan', 'Ben']);
});

test('editing keeps original order time and returns updated status', async () => {
  const app = setup({ orders: [initialOrder] });
  const result = await app.submit();
  assert.equal(result.status, 200);
  assert.equal(result.data.updated, true);
  assert.equal(app.saved().orderedAt, originalTime);
  assert.equal(result.data.orders[0].food, 'Noodles');
  assert.equal(result.data.orders[0].sourcePage, 'new');
  assert.equal(app.saved().restaurant, 'Cafe A');
  assert.equal(result.data.orders[0].restaurant, 'Cafe A');
});

test('restaurant snapshot comes from server state and preserves an existing snapshot on edit', async () => {
  const created = setup();
  await created.submit({ ...requestOrder, restaurant: 'Untrusted client value' });
  assert.equal(created.saved().restaurant, 'Cafe A');
  const edited = setup({ orders: [{ ...initialOrder, restaurant: 'Original Cafe' }] });
  await edited.submit({ ...requestOrder, restaurant: 'Untrusted client value' });
  assert.equal(edited.saved().restaurant, 'Original Cafe');
});

test('group split removes the replaced identity and preserves its original timestamp', async () => {
  const app = setup({ orders: [{ ...initialOrder, name: 'Alan + Ben + Cory' }] });
  const result = await app.submit({ ...requestOrder, name: 'Alan + Ben', price: 40, allowGroupSplit: true });
  assert.equal(result.status, 200);
  assert.equal(result.data.updated, true);
  assert.equal(app.saved().orderedAt, originalTime);
  assert.deepEqual(app.calls.filter(call => ['remove', 'save'].includes(call[0])).map(call => call[0]),
    ['remove', 'save']);
});

test('duplicate group member and excess budget are still rejected before saving', async () => {
  const conflict = setup({ orders: [{ ...initialOrder, name: 'Alan + Ben' }] });
  assert.equal((await conflict.submit()).status, 409);
  assert.equal(conflict.saved(), undefined);
  const overBudget = setup();
  assert.equal((await overBudget.submit({ ...requestOrder, price: 23 })).status, 400);
  assert.equal(overBudget.saved(), undefined);
});

test('DB write failure does not report success or read updated orders', async () => {
  const app = setup({ save: async () => { throw new Error('Write failed'); } });
  const result = await app.submit();
  assert.equal(result.status, 500);
  assert.equal(result.data.ok, undefined);
  assert.equal(app.calls.some(call => call[0] === 'read'), false);
});

test('no restaurant and unauthorized late orders remain blocked', async () => {
  const unset = setup({
    getState: async () => ({ date, restaurant: null, orders: [] })
  });
  assert.equal((await unset.submit()).status, 400);
  assert.equal(unset.saved(), undefined);
  const late = setup({ late: true });
  assert.equal((await late.submit()).status, 403);
  assert.equal(late.saved(), undefined);
});

test('if list refresh fails after saving, success retains the existing client fallback', async () => {
  const app = setup({ read: async () => { throw new Error('Read failed'); } });
  const result = await app.submit();
  assert.equal(result.status, 200);
  assert.equal(result.data.ok, true);
  assert.notEqual(app.saved(), undefined);
  assert.equal('orders' in result.data, false);
});
