const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

for (const file of ['New/app.js', 'public/app.js']) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const names = ['compactSummaryPrefix', 'summaryOrderExtraNote', 'summaryExtraNote',
    'summarySystemOptionKeys', 'addFoodSummaryEntry', 'formatFoodSummaryLine', 'renderStaffFoodSummary',
    'displayOrderTableFood', 'displayOrderTableAddon', 'splitOrderFoodParts', 'parseFoodSummaryPart', 'isRiceFoodName', 'orderMemberNames',
    'splitAddonParts', 'matchingAddonSegmentsForFood', 'segmentBelongsToFoodChoice', 'inferAddonSegmentForFood',
    'stripFoodPrefixFromAddon', 'foodLabelsMatch', 'canonicalAddonPart', 'normalizeAddonForSummary',
    'parseAddonSummarySegments', 'displayOrderAddon'];
  const functions = names.map(name => {
    const start = source.indexOf(`function ${name}(`);
    const end = source.indexOf('\nfunction ', start + 1);
    return source.slice(start, end);
  }).join('\n');
  const items = [{ key: 'rice', label: '\u7c73\u98ef\uff08\u5c0f\uff09', qty: 1 },
    { key: 'chicken', label: '\u8106\u76ae\u54b8\u96de\uff08\u534a\u96bb\uff09', qty: 1 }];
  const context = vm.createContext({
    state: { lang: 'tc' },
    summaryFoodMatch: () => null,
    stripAddonPriceText: value => value,
    parseOrderFoodItems: order => order.items || items,
    orderDeliveryDept: order => order.dept,
    escapeHtml: value => value,
    displayOrderFood: value => value,
    displayFood: value => value,
    toTc: value => value,
    addonChineseName: () => '',
    displayAddon: value => value,
    normalizeOptionChoice: choice => choice,
    orderOptionLabel: value => value,
    localOptionLabel: value => value,
    formatOptionLabel: value => value,
    storedOptionChineseLabel: value => value,
    extractEnglishOptionLabel: value => value,
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

  test(`${file}: all configured choices go in food parentheses while typed notes stay in notes`, () => {
    const pork = '\u5404\u5f0f\u8c6c\u6252\u98ef';
    const sauce = '\u6912\u9e7d';
    const meat = '\u8089';
    const sweetSour = '\u5495\u5695(\u8089/\u9b5a)\u98ef';
    const pair = '\u71d2\u5473\u96d9\u62fc\u98ef';
    const roast = '\u71d2\u8089';
    const charSiu = '\u53c9\u71d2';
    const foods = [
      { name: pork, optionGroups: [{ choices: [{ label: sauce }] }] },
      { name: sweetSour, optionGroups: [{ choices: [{ label: meat }] }] },
      { name: pair, optionGroups: [{ choices: [{ label: roast }, { label: charSiu }] }] }
    ];
    context.summaryFoodMatch = (raw, display) => foods.find(food => food.name === raw || food.name === display) || null;
    try {
      const order = { food: `${pork} + ${sweetSour}`, addon: `${sauce};${meat};\u5c11\u6c41` };
      assert.equal(context.displayOrderTableFood(order), `${pork}\uff08${sauce}\uff09 + ${sweetSour}\uff08${meat}\uff09`);
      assert.equal(context.displayOrderTableAddon(order), '\u5c11\u6c41');
      assert.equal(context.displayOrderTableFood({ food: pair, addon: `${roast}+${charSiu}` }),
        `${pair}\uff08${roast}\u3001${charSiu}\uff09`);
      assert.equal(context.displayOrderTableAddon({ food: pork, addon: '\u5c0f\u8fa3' }), '\u5c0f\u8fa3');
      assert.equal(context.displayOrderTableFood({ food: `${pork} x 2`, addon: sauce }), `${pork}\uff08${sauce}\uff09 x 2`);
      const scoped = { food: `${pork} + ${sweetSour}`, addon: `${pork}: ${sauce}\uff1b${sweetSour}: ${meat}\uff1b\u5c11\u6c41` };
      assert.equal(context.displayOrderTableFood(scoped), `${pork}\uff08${sauce}\uff09 + ${sweetSour}\uff08${meat}\uff09`);
      assert.equal(context.displayOrderTableAddon(scoped), '\u5c11\u6c41');
      foods[0].optionGroups[0].choices.push({ label: '\u9ed1\u6912' });
      assert.equal(context.displayOrderTableFood({ food: `${pork} x 2`, addon: `${sauce} x 1;\u9ed1\u6912 x 1` }),
        `${pork}\uff08${sauce}\uff09 + ${pork}\uff08\u9ed1\u6912\uff09`);
    } finally {
      context.summaryFoodMatch = () => null;
    }
  });
}
