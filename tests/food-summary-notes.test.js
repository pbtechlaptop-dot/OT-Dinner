const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

for (const file of ['New/app.js', 'public/app.js']) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const names = ['compactSummaryPrefix', 'summaryOrderExtraNote', 'summaryExtraNote',
    'summarySystemOptionKeys', 'addFoodSummaryEntry', 'formatFoodSummaryLine', 'renderStaffFoodSummary',
    'displayOrderTableFood', 'splitOrderFoodParts', 'parseFoodSummaryPart', 'isRiceFoodName', 'orderMemberNames'];
  const functions = names.map(name => {
    const start = source.indexOf(`function ${name}(`);
    const end = source.indexOf('\nfunction ', start + 1);
    return source.slice(start, end);
  }).join('\n');
  const items = [{ key: 'rice', label: '\u7c73\u98ef\uff08\u5c0f\uff09', qty: 1 },
    { key: 'chicken', label: '\u8106\u76ae\u54b8\u96de\uff08\u534a\u96bb\uff09', qty: 1 }];
  const context = vm.createContext({
    summaryFoodMatch: () => null,
    splitAddonParts: value => value.split(','),
    displayOrderAddon: order => order.addon,
    stripAddonPriceText: value => value,
    parseOrderFoodItems: order => order.items || items,
    orderDeliveryDept: order => order.dept,
    escapeHtml: value => value,
    displayOrderFood: value => value,
    parseAddonSummarySegments: value => value.split(';').filter(Boolean).map(addon => ({ addon, qty: 1 })),
    matchingAddonSegmentsForFood: segments => segments.filter(segment => ['\u5c0f', '\u5927'].includes(segment.addon)),
    segmentBelongsToFoodChoice: segment => ['\u5c0f', '\u5927'].includes(segment.addon),
    t: key => key === 'addon' ? 'NOTE' : 'x'
  });
  vm.runInContext(functions, context);

  test(`${file}: rice size never appears as a chicken note in any summary`, () => {
    const note = context.summaryOrderExtraNote('\u5c0f', items);
    assert.equal(note, '');
    const counts = {};
    for (const number of [17, 18]) {
      items.forEach(item => context.addFoodSummaryEntry(counts, item.key, item.label, 1, number, note));
    }
    const chicken = context.formatFoodSummaryLine(items[1].label, counts.chicken);
    assert.match(chicken, /17,18/);
    assert.match(chicken, /x 2/);
    assert.doesNotMatch(chicken, /NOTE/);
    const staff = context.renderStaffFoodSummary([
      { dept: 'Lady Ruby', addon: '\u5c0f' }, { dept: 'Lady Ruby', addon: '\u5c0f' }
    ]);
    assert.doesNotMatch(staff, /NOTE/);
    assert.match(staff, /Total:/);
  });

  test(`${file}: user notes survive, including words containing the size character`, () => {
    assert.equal(context.summaryOrderExtraNote('\u5c0f;\u5c11\u9e7d', items), '\u5c11\u9e7d');
    assert.equal(context.summaryOrderExtraNote('\u5c0f;\u5c0f\u8fa3', items), '\u5c0f\u8fa3');
    assert.equal(context.summaryOrderExtraNote('\u5c0f', [items[1]]), '\u5c0f');
  });

  test(`${file}: today's table puts rice size in the food column and preserves dish order`, () => {
    const chicken = items[1].label;
    const rice = '\u7c73\u98ef';
    assert.equal(context.displayOrderTableFood({ food: `${chicken} + ${rice}`, addon: '\u5c0f' }),
      `${chicken} + ${items[0].label}`);
    assert.equal(context.displayOrderTableFood({ food: `${rice} + ${chicken}`, addon: '\u5c0f;\u5c11\u9e7d' }),
      `${items[0].label} + ${chicken}`);
    assert.equal(context.displayOrderTableFood({ food: chicken, addon: '\u5c11\u9e7d' }), chicken);
  });

  test(`${file}: staff summary counts 13 people with 17 dishes and lists each order separately`, () => {
    const orders = Array.from({ length: 13 }, (_, index) => ({
      dept: 'Lady Ruby', name: `Person ${index + 1}`, addon: '',
      items: index < 4 ? items : [items[1]]
    }));
    const html = context.renderStaffFoodSummary(orders);
    assert.match(html, /Total: <span[^>]*>13<\/span>/);
    assert.equal((html.match(/- \(\d+\)/g) || []).length, 13);
    assert.match(html, /- \(1\).* \+ /);
    assert.match(html, /- \(2\).* \+ /);
    assert.doesNotMatch(html, /\(1,2\)/);
  });

  test(`${file}: group members count as people, not dishes or order rows`, () => {
    const html = context.renderStaffFoodSummary([
      { dept: 'HQ', name: 'Alan + Ben', addon: '' },
      { dept: 'HQ', name: 'Cory', addon: '', items: [{ ...items[0], qty: 3 }] }
    ]);
    assert.match(html, /Total: <span[^>]*>3<\/span>/);
    assert.equal((html.match(/- \(\d+\)/g) || []).length, 2);
    assert.match(html, /x 3/);
  });
}
