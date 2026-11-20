(() => {
  'use strict';
  const el = Object.fromEntries([
    'filters', 'from', 'to', 'app', 'query', 'includeTests', 'rangeLabel', 'status', 'error',
    'report', 'orderCount', 'servingCount', 'restaurantCount', 'legacyCount', 'coverage',
    'restaurants', 'dishCount', 'search', 'export', 'dishes', 'pagination', 'pageLabel', 'previous', 'next'
  ].map(id => [id, document.getElementById(id)]));
  const PAGE_SIZE = 25;
  const locale = { tc: 'zh-Hant', sc: 'zh-Hans', en: 'en-NZ' };
  let lang = 'tc';
  try { lang = localStorage.getItem('otDinnerStatisticsLanguage') || lang; } catch {}
  if (!locale[lang]) lang = 'tc';
  let number = new Intl.NumberFormat(locale[lang]);
  const t = (key, values = {}) => (window.StatisticsI18n[lang][key] || key)
    .replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  let data = null;
  let page = 0;
  let request = null;
  let loading = false;
  let errorKey = '';
  let updatedAt = null;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const escape = value => String(value ?? '').replace(/[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const dateText = date => date.replaceAll('-', '/');
  const foodName = item => (lang === 'sc' ? item.foodSc : lang === 'en' ? item.foodEn : '') || item.food;

  function renderStatus() {
    el.query.textContent = t(loading ? 'querying' : 'query');
    if (loading) el.status.textContent = t('loading');
    else if (errorKey) el.status.textContent = t('failed');
    else if (data && updatedAt) {
      const scope = data.range.app === 'lady-ruby' ? 'Lady Ruby' : t(data.range.app === 'all' ? 'all' : 'main');
      const time = new Intl.DateTimeFormat(locale[lang], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(updatedAt);
      el.status.textContent = t('updated', { scope, time });
    }
    if (data) el.rangeLabel.textContent = t('range', { from: dateText(data.range.from), to: dateText(data.range.to) });
    if (errorKey) el.error.textContent = t(errorKey);
  }

  function applyLanguage(nextLang) {
    lang = locale[nextLang] ? nextLang : 'tc';
    number = new Intl.NumberFormat(locale[lang]);
    document.documentElement.lang = locale[lang];
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    for (const [attribute, key] of [['aria-label', 'i18nAria'], ['placeholder', 'i18nPlaceholder'], ['title', 'i18nTitle']]) {
      document.querySelectorAll('[data-' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()) + ']')
        .forEach(node => node.setAttribute(attribute, t(node.dataset[key])));
    }
    document.querySelectorAll('[data-lang]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang)));
    if (data) render();
    renderStatus();
    try { localStorage.setItem('otDinnerStatisticsLanguage', lang); } catch {}
  }

  function rowsForSearch() {
    const query = el.search.value.trim().toLocaleLowerCase();
    return (data?.dishes || []).map((item, index) => ({ ...item, rank: index + 1 }))
      .filter(item => !query || (item.food + ' ' + foodName(item) + ' ' + (item.restaurant || t('unknownRestaurant'))).toLocaleLowerCase().includes(query));
  }

  function renderDishes() {
    const rows = rowsForSearch();
    page = Math.min(page, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));
    const start = page * PAGE_SIZE;
    el.dishCount.textContent = t('dishCount', { count: number.format(data?.dishes.length || 0) });
    el.dishes.innerHTML = rows.slice(start, start + PAGE_SIZE).map(item =>
      '<tr><td class="rank-number">' + item.rank + '</td><td>' + escape(foodName(item)) +
      '</td><td' + (item.restaurant ? '' : ' class="unknown"') + '>' + escape(item.restaurant || t('unknownRestaurant')) +
      '</td><td class="numeric">' + number.format(item.servings) + '</td><td class="numeric">' +
      number.format(item.orders) + '</td></tr>').join('') ||
      '<tr><td colspan="5" class="empty">' + t(el.search.value.trim() ? 'noMatch' : 'noDishes') + '</td></tr>';
    el.pageLabel.textContent = rows.length ? (start + 1) + '–' + Math.min(start + PAGE_SIZE, rows.length) + ' / ' + number.format(rows.length) : t('zeroDishes');
    el.previous.disabled = page === 0;
    el.next.disabled = start + PAGE_SIZE >= rows.length;
  }

  function render() {
    const summary = data.summary;
    el.orderCount.textContent = number.format(summary.orders);
    el.servingCount.textContent = number.format(summary.servings);
    el.restaurantCount.textContent = number.format(summary.restaurants);
    el.legacyCount.textContent = number.format(summary.legacySkipped);
    const coverage = [t('snapshotOnly')];
    if (summary.legacySkipped) coverage.push(t('legacySkipped', { count: number.format(summary.legacySkipped) }));
    if (summary.excludedTests) coverage.push(t('excludedTests', { count: number.format(summary.excludedTests) }));
    if (data.storage === 'local') coverage.push(t('localData'));
    el.coverage.textContent = coverage.join(' · ');
    const max = data.restaurants[0]?.days || 1;
    el.restaurants.innerHTML = data.restaurants.map((item, index) =>
      '<article class="rank-item"><div class="rank-title"><span class="rank-number">0' + (index + 1) +
      '</span><h3>' + escape(item.restaurant) + '</h3></div><div class="rank-values"><strong>' +
      number.format(item.days) + '</strong><span>' + t('daysUsed') + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' +
      Math.round(item.days / max * 100) + '%"></div></div></article>').join('') ||
      '<p class="empty">' + t('noRestaurants') + '</p>';
    renderDishes();
  }

  function syncPresets(active) {
    document.querySelectorAll('[data-preset]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.dataset.preset === active)));
  }

  async function load() {
    if (!el.filters.reportValidity()) return;
    if (el.from.value > el.to.value) {
      errorKey = 'invalidRange';
      el.error.textContent = t(errorKey);
      el.error.hidden = false;
      return;
    }
    request?.abort();
    const controller = new AbortController();
    request = controller;
    loading = true;
    errorKey = '';
    el.query.disabled = true;
    el.query.textContent = t('querying');
    el.export.disabled = true;
    el.status.textContent = t('loading');
    el.report.setAttribute('aria-busy', 'true');
    el.error.hidden = true;
    const params = new URLSearchParams({ from: el.from.value, to: el.to.value,
      app: el.app.value, includeTests: String(el.includeTests.checked) });
    try {
      const response = await fetch('/api/statistics?' + params, { cache: 'no-store', signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t('loadError'));
      if (request !== controller) return;
      data = payload;
      updatedAt = new Date();
      page = 0;
      render();
      el.report.hidden = false;
      el.export.disabled = !data.dishes.length;
      history.replaceState(null, '', '/statistics/?' + params);
    } catch (error) {
      if (error.name === 'AbortError' || request !== controller) return;
      data = null;
      el.report.hidden = true;
      errorKey = 'loadError';
      el.error.textContent = t(errorKey);
      el.error.hidden = false;
      el.status.textContent = t('failed');
    } finally {
      if (request === controller) {
        el.query.disabled = false;
        loading = false;
        renderStatus();
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
    const rows = [['rank', 'dish', 'restaurant', 'servings', 'orders'].map(key => t(key)),
      ...rowsForSearch().map(item => [item.rank, foodName(item), item.restaurant || t('unknownRestaurant'), item.servings, item.orders])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'order-statistics-' + data.range.from + '-' + data.range.to + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelectorAll('[data-lang]').forEach(button =>
    button.addEventListener('click', () => applyLanguage(button.dataset.lang)));
  applyLanguage(lang);
  setPreset('month');
  const params = new URLSearchParams(location.search);
  if (params.has('from')) el.from.value = params.get('from');
  if (params.has('to')) el.to.value = params.get('to');
  if (['all', 'main', 'lady-ruby'].includes(params.get('app'))) el.app.value = params.get('app');
  el.includeTests.checked = params.get('includeTests') === 'true';
  if (params.has('from') || params.has('to')) syncPresets('');
  load();
})();
