const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise the actual parser without loading credentials or initializing storage.
const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const parserSource = source.slice(source.indexOf('function parseBody(req)'), source.indexOf('\nfunction validateOrder('));

function parseChunks(chunks, maxBytes = 1024 * 1024) {
  const parseBody = vm.runInNewContext(`(${parserSource.trim()})`, {
    Buffer,
    JSON_BODY_MAX_BYTES: maxBytes
  });
  const req = new EventEmitter();
  const result = parseBody(req);
  chunks.forEach(chunk => req.emit('data', chunk));
  req.emit('end');
  return result;
}

test('restaurant and menu names survive every UTF-8 chunk boundary', async () => {
  const restaurant = '\u9ad8\u5e2b\u5085';
  const payload = { seed: { restaurants: [restaurant], menus: { [restaurant]: {} } } };
  const bytes = Buffer.from(JSON.stringify(payload));
  for (let split = 1; split < bytes.length; split++) {
    const result = await parseChunks([bytes.subarray(0, split), bytes.subarray(split)]);
    assert.equal(JSON.stringify(result), JSON.stringify(payload));
  }
  assert.equal(JSON.stringify(await parseChunks(Array.from(bytes, byte => Buffer.from([byte])))), JSON.stringify(payload));
});

test('body limit counts bytes, including multibyte characters', async () => {
  const bytes = Buffer.from(JSON.stringify({ name: '\u9ad8\u5e2b\u5085' }));
  await assert.rejects(parseChunks([bytes], bytes.length - 1), /Payload too large/);
  assert.equal((await parseChunks([bytes], bytes.length)).name, '\u9ad8\u5e2b\u5085');
});

test('empty bodies and invalid JSON retain their existing behavior', async () => {
  assert.equal(JSON.stringify(await parseChunks([])), '{}');
  await assert.rejects(parseChunks([Buffer.from('{')]), /Invalid JSON payload/);
});
