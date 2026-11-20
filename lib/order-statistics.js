function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parseStatisticsRange(params, today) {
  const from = params.get('from') || today.slice(0, 7) + '-01';
  const to = params.get('to') || today;
  const app = params.get('app') || 'all';
  if (!isDate(from) || !isDate(to)) throw new Error('請輸入有效的開始及結束日期。');
  if (from > to) throw new Error('開始日期不可遲於結束日期。');
  if (!['all', 'main', 'lady-ruby'].includes(app)) throw new Error('頁面範圍不正確。');
  return { from, to, app, includeTests: params.get('includeTests') === 'true' };
}

function splitFoodItems(value) {
  const text = String(value || '').trim();
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '(' || char === '（') depth++;
    if (char === ')' || char === '）') depth = Math.max(0, depth - 1);
    if (char === '+' && depth === 0 && /\s/.test(text[index - 1] || '') && /\s/.test(text[index + 1] || '')) {
      parts.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter(Boolean).map(part => {
    const match = part.match(/\s+[x×]\s*(\d+)\s*$/i);
    return {
      food: (match ? part.slice(0, match.index) : part).trim(),
      servings: match ? Math.max(1, Number(match[1]) || 1) : 1
    };
  });
}

function buildOrderStatistics(orders, logs, range, timezone = 'Pacific/Auckland') {
  const dates = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const byDay = new Map();
  const restaurantDays = new Map();
  const recordUse = (restaurant, day) => {
    if (!restaurantDays.has(restaurant)) restaurantDays.set(restaurant, new Set());
    restaurantDays.get(restaurant).add(day);
  };
  for (const log of logs) {
    if (log.action !== 'restaurant' || !log.details || typeof log.details !== 'object') continue;
    const details = log.details;
    const app = String(details.app || '');
    const restaurant = String(details.restaurant || '').trim();
    const time = new Date(log.created_at || log.createdAt || '');
    if (!restaurant || !['main', 'lady-ruby'].includes(app) || !Number.isFinite(time.getTime())) continue;
    const day = dates.format(time);
    if (day < range.from || day > range.to) continue;
    if (range.app === 'all' || range.app === app) recordUse(restaurant, day);
    const key = JSON.stringify([day, app]);
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key).add(restaurant);
    const previous = String(details.previousRestaurant || '').trim();
    if (previous && previous !== restaurant) byDay.get(key).add(previous);
  }

  const dishes = new Map();
  const daily = new Map();
  const summary = { orders: 0, servings: 0, recordedOrders: 0, inferredOrders: 0,
    unknownOrders: 0, excludedTests: 0, restaurants: 0 };
  for (const order of orders) {
    const day = String(order.date || '');
    const app = String(order.app_id || order.app || 'main');
    if (!isDate(day) || day < range.from || day > range.to || (range.app !== 'all' && range.app !== app)) continue;
    if (!range.includeTests && /速度測試[，,、\s]*非正式訂餐/.test(String(order.addon || ''))) {
      summary.excludedTests++;
      continue;
    }
    summary.orders++;
    let restaurant = String(order.restaurant || '').trim();
    const candidates = byDay.get(JSON.stringify([day, app]));
    if (restaurant) summary.recordedOrders++;
    else if (candidates && candidates.size === 1) {
      restaurant = [...candidates][0];
      summary.inferredOrders++;
    } else summary.unknownOrders++;

    const items = splitFoodItems(order.food);
    const servings = items.reduce((total, item) => total + item.servings, 0);
    summary.servings += servings;
    if (!daily.has(day)) daily.set(day, { date: day, orders: 0, servings: 0 });
    daily.get(day).orders++;
    daily.get(day).servings += servings;
    if (restaurant) {
      recordUse(restaurant, day);
    }
    for (const item of items) {
      const key = JSON.stringify([restaurant || null, item.food]);
      if (!dishes.has(key)) dishes.set(key, { restaurant: restaurant || null, food: item.food, orders: 0, servings: 0 });
      dishes.get(key).servings += item.servings;
    }
    for (const food of new Set(items.map(item => item.food))) {
      dishes.get(JSON.stringify([restaurant || null, food])).orders++;
    }
  }
  const rankedRestaurants = [...restaurantDays].map(([restaurant, days]) => ({
    restaurant, days: days.size
  })).sort((a, b) => b.days - a.days || a.restaurant.localeCompare(b.restaurant, 'zh-Hant'));
  const rankedDishes = [...dishes.values()].sort((a, b) =>
    b.servings - a.servings || b.orders - a.orders || a.food.localeCompare(b.food, 'zh-Hant'));
  summary.restaurants = restaurantDays.size;
  return { range, summary, restaurants: rankedRestaurants.slice(0, 3), dishes: rankedDishes,
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

function addDishTranslations(statistics, menuRows) {
  const translations = new Map();
  for (const item of menuRows) {
    const key = JSON.stringify([item.restaurant, item.name_tc]);
    const labels = { foodSc: String(item.name_sc || '').trim(), foodEn: String(item.name_en || '').trim() };
    if (!translations.has(key)) translations.set(key, labels);
    else {
      const existing = translations.get(key);
      for (const field of ['foodSc', 'foodEn']) {
        if (existing[field] !== labels[field]) existing[field] = '';
      }
    }
  }
  return { ...statistics, dishes: statistics.dishes.map(item => ({
    ...item, ...(translations.get(JSON.stringify([item.restaurant, item.food])) || {})
  })) };
}

module.exports = { parseStatisticsRange, splitFoodItems, buildOrderStatistics, addDishTranslations };
