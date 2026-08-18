const el = {
  usernameInput: document.getElementById('usernameInput'),
  passwordInput: document.getElementById('passwordInput'),
  priceLimitInput: document.getElementById('priceLimitInput'),
  saveBtn: document.getElementById('saveBtn'),
  status: document.getElementById('status'),
  toast: document.getElementById('toast')
};

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function setStatus(message, kind = '') {
  el.status.textContent = message;
  el.status.className = `notice ${kind}`;
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.add('hidden'), 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(payload.error || 'Request failed');
  }
  return response.json();
}

async function loadSettings() {
  const settings = await api('/new-api/settings');
  el.priceLimitInput.value = Number(settings.priceLimit || 22).toFixed(2);
  setStatus(`目前上限：${money(settings.priceLimit || 22)}`, 'ok');
}

async function saveSettings() {
  const priceLimit = Number(el.priceLimitInput.value);
  const username = String(el.usernameInput.value || '').trim();
  const password = String(el.passwordInput.value || '').trim();
  if (!username) return setStatus('請輸入 Admin 帳號。', 'danger');
  if (!password) return setStatus('請輸入 Admin 密碼。', 'danger');
  if (!Number.isFinite(priceLimit) || priceLimit < 0) {
    return setStatus('請輸入有效價錢上限。', 'danger');
  }

  try {
    el.saveBtn.disabled = true;
    setStatus('正在儲存...', '');
    const settings = await api('/new-api/settings', {
      method: 'POST',
      body: JSON.stringify({ username, password, priceLimit })
    });
    el.passwordInput.value = '';
    setStatus(`已儲存，上限：${money(settings.priceLimit)}`, 'ok');
    showToast('已儲存新版價錢上限');
  } catch (err) {
    setStatus(err.message, 'danger');
  } finally {
    el.saveBtn.disabled = false;
  }
}

el.saveBtn.addEventListener('click', saveSettings);
el.passwordInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') saveSettings();
});
el.priceLimitInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') saveSettings();
});

loadSettings().catch(err => setStatus(err.message, 'danger'));
