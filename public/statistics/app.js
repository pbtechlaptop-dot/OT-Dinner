(() => {
  'use strict';
  const el = Object.fromEntries([
    'filters', 'from', 'to', 'app', 'query', 'includeTests', 'rangeLabel', 'status', 'error',
    'report', 'orderCount', 'servingCount', 'restaurantCount', 'unknownCount', 'coverage',
    'restaurants', 'dishCount', 'search', 'export', 'dishes', 'pagination', 'pageLabel', 'previous', 'next'
  ].map(id => [id, document.getElementById(id)]));
  const PAGE_SIZE = 25;
  const number = new Intl.NumberFormat('zh-Hant');
  let data = null;
  let page = 0;
  let request = null;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const escape = value => String(value ?? '').replace(/[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const dateText = date => date.replaceAll('-', '/');

  function rowsForSearch() {
    const query = el.search.value.trim().toLocaleLowerCase();
    return (data?.dishes || []).map((item, index) => ({ ...item, rank: index + 1 }))
      .filter(item => !query || (item.food + ' ' + (item.restaurant || '餐廳未能確認')).toLocaleLowerCase().includes(query));
  }

  function renderDishes() {
    const rows = rowsForSearch();
    page = Math.min(page, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));
    const start = page * PAGE_SIZE;
    el.dishCount.textContent = '按餐點份數 · ' + number.format(data?.dishes.length || 0) + ' 款';
    el.dishes.innerHTML = rows.slice(start, start + PAGE_SIZE).map(item =>
      '<tr><td class="rank-number">' + item.rank + '</td><td>' + escape(item.food) +
      '</td><td' + (item.restaurant ? '' : ' class="unknown"') + '>' + escape(item.restaurant || '餐廳未能確認') +
      '</td><td class="numeric">' + number.format(item.servings) + '</td><td class="numeric">' +
      number.format(item.orders) + '</td></tr>').join('') ||
      '<tr><td colspan="5" class="empty">' + (el.search.value.trim() ? '沒有符合的菜式' : '此日期範圍沒有餐點') + '</td></tr>';
    el.pageLabel.textContent = rows.length ? (start + 1) + '–' + Math.min(start + PAGE_SIZE, rows.length) + ' / ' + number.format(rows.length) : '0 款菜式';
    el.previous.disabled = page === 0;
    el.next.disabled = start + PAGE_SIZE >= rows.length;
  }

  function render() {
    const summary = data.summary;
    el.orderCount.textContent = number.format(summary.orders);
    el.servingCount.textContent = number.format(summary.servings);
    el.restaurantCount.textContent = number.format(summary.restaurants);
    el.unknownCount.textContent = number.format(summary.unknownOrders);
    const coverage = ['餐廳已記錄：' + number.format(summary.recordedOrders) + ' 張',
      '按當日操作記錄推算：' + number.format(summary.inferredOrders) + ' 張'];
    if (summary.unknownOrders) coverage.push(number.format(summary.unknownOrders) + ' 張餐廳未能確認，未計入餐廳排名');
    if (summary.excludedTests) coverage.push('已排除 ' + number.format(summary.excludedTests) + ' 張速度測試單');
    if (!data.logsAvailable) coverage.push('歷史餐廳操作記錄未能取得');
    if (data.storage === 'local') coverage.push('本機資料');
    el.coverage.textContent = coverage.join(' · ');
    const max = data.restaurants[0]?.orders || 1;
    el.restaurants.innerHTML = data.restaurants.map((item, index) =>
      '<article class="rank-item"><div class="rank-title"><span class="rank-number">0' + (index + 1) +
      '</span><h3>' + escape(item.restaurant) + '</h3></div><div class="rank-values"><strong>' +
      number.format(item.orders) + '</strong><span>張訂單</span><span class="servings">' +
      number.format(item.servings) + ' 份餐點</span></div><div class="bar-track"><div class="bar-fill" style="width:' +
      Math.round(item.orders / max * 100) + '%"></div></div></article>').join('') ||
      '<p class="empty">' + (summary.orders ? '此日期範圍未有可確認餐廳的訂單' : '此日期範圍沒有訂單') + '</p>';
    renderDishes();
  }

  function syncPresets(active) {
    document.querySelectorAll('[data-preset]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.preset === active)));
  }

  async function load() {
    if (!el.filters.reportValidity()) return;
    if (el.from.value > el.to.value) {
      el.error.textContent = '開始日期不可遲於結束日期。';
      el.error.hidden = false;
      return;
    }
    request?.abort();
    const controller = new AbortController();
    request = controller;
    el.query.disabled = true;
    el.query.textContent = '查詢中…';
    el.export.disabled = true;
    el.status.textContent = '載入中…';
    el.report.setAttribute('aria-busy', 'true');
    el.error.hidden = true;
    const params = new URLSearchParams({ from: el.from.value, to: el.to.value,
      app: el.app.value, includeTests: String(el.includeTests.checked) });
    try {
      const response = await fetch('/api/statistics?' + params, { cache: 'no-store', signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || '未能讀取統計資料。');
      if (request !== controller) return;
      data = payload;
      page = 0;
      render();
      el.report.hidden = false;
      const scope = { all: '全部頁面', main: '主頁', 'lady-ruby': 'Lady Ruby' }[data.range.app];
      el.rangeLabel.textContent = dateText(data.range.from) + ' 至 ' + dateText(data.range.to);
      el.status.textContent = scope + ' · ' + new Intl.DateTimeFormat('zh-Hant', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()) + ' 更新';
      el.export.disabled = !data.dishes.length;
      history.replaceState(null, '', '/statistics/?' + params);
    } catch (error) {
      if (error.name === 'AbortError' || request !== controller) return;
      data = null;
      el.report.hidden = true;
      el.error.textContent = error.message || '未能讀取統計資料，請稍後再試。';
      el.error.hidden = false;
      el.status.textContent = '查詢失敗';
    } finally {
      if (request === controller) {
        el.query.disabled = false;
        el.query.textContent = '查詢';
        el.report.setAttribute('aria-busy', 'false');
      }
    }
  }

  function setPreset(preset) {
    const end = new Date(today + 'T00:00:00Z');
    const start = new Date(end);
    if (preset === 'week') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    if (preset === 'month') start.setUTCDate(1);
    if (preset === 'previous') {
      start.setUTCDate(1);
      end.setUTCDate(0);
      start.setUTCMonth(start.getUTCMonth() - 1);
    }
    el.from.value = start.toISOString().slice(0, 10);
    el.to.value = end.toISOString().slice(0, 10);
    syncPresets(preset);
  }

  el.filters.addEventListener('submit', event => { event.preventDefault(); load(); });
  document.querySelectorAll('[data-preset]').forEach(button =>
    button.addEventListener('click', () => { setPreset(button.dataset.preset); load(); }));
  for (const control of [el.from, el.to]) control.addEventListener('input', () => syncPresets(''));
  el.search.addEventListener('input', () => { page = 0; renderDishes(); });
  el.previous.addEventListener('click', () => { page--; renderDishes(); });
  el.next.addEventListener('click', () => { page++; renderDishes(); });
  el.export.addEventListener('click', () => {
    if (!data) return;
    const cell = value => {
      let text = String(value ?? '');
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = [['排名', '菜式', '餐廳', '份數', '訂單數'],
      ...rowsForSearch().map(item => [item.rank, item.food, item.restaurant || '餐廳未能確認', item.servings, item.orders])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'order-statistics-' + data.range.from + '-' + data.range.to + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  setPreset('month');
  const params = new URLSearchParams(location.search);
  if (params.has('from')) el.from.value = params.get('from');
  if (params.has('to')) el.to.value = params.get('to');
  if (['all', 'main', 'lady-ruby'].includes(params.get('app'))) el.app.value = params.get('app');
  el.includeTests.checked = params.get('includeTests') === 'true';
  if (params.has('from') || params.has('to')) syncPresets('');
  load();
})();
