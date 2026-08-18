const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SETTINGS_FILE = path.join(ROOT, 'settings.json');
const PORT = Number(process.env.NEW_PORT || process.env.PORT || 3100);
const API_ORIGIN = process.env.API_ORIGIN || 'http://127.0.0.1:3000';

function readSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    const limit = Number(parsed.priceLimit);
    return { priceLimit: Number.isFinite(limit) && limit >= 0 ? limit : 22 };
  } catch {
    return { priceLimit: 22 };
  }
}

function writeSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n');
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function verifyAdmin(username, password) {
  const response = await fetch(`${API_ORIGIN}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) return false;
  const payload = await response.json().catch(() => ({}));
  return Boolean(payload && payload.ok);
}

async function proxyRequest(req, res) {
  const target = new URL(req.url, API_ORIGIN);
  const headers = { ...req.headers, host: target.host };
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const response = await fetch(target, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    redirect: 'manual'
  });
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  if (response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } else {
    res.end();
  }
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let fileName = decodeURIComponent(url.pathname);
  if (fileName === '/') fileName = '/index.html';
  if (fileName === '/admin' || fileName === '/admin/') fileName = '/admin.html';
  const filePath = path.normalize(path.join(ROOT, fileName));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': filePath.endsWith('.html') ? 'no-store' : 'public, max-age=60'
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if ((url.pathname === '/admin' || url.pathname === '/admin/') && req.method === 'GET') {
      res.writeHead(302, { Location: `${API_ORIGIN}/admin/` });
      return res.end();
    }
    if (url.pathname === '/new-api/settings' && req.method === 'GET') {
      req.url = '/api/new-settings';
      return proxyRequest(req, res);
    }
    if (url.pathname === '/new-api/settings' && req.method === 'POST') {
      const body = await parseBody(req);
      const priceLimit = Number(body.priceLimit);
      if (!Number.isFinite(priceLimit) || priceLimit < 0) {
        return sendJson(res, 400, { error: 'Price limit must be a positive number.' });
      }
      const ok = await verifyAdmin(String(body.username || ''), String(body.password || ''));
      if (!ok) return sendJson(res, 403, { error: 'Admin login failed.' });
      const settings = { priceLimit };
      writeSettings(settings);
      return sendJson(res, 200, settings);
    }
    if (url.pathname.startsWith('/api/')) return proxyRequest(req, res);
    return serveStatic(req, res);
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`New meal app: http://127.0.0.1:${PORT}`);
  console.log(`Proxying existing API from ${API_ORIGIN}`);
});
