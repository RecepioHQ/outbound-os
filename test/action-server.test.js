const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { createRequestHandler } = require('../src/action-server');

function request(method, url, body) {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  req.method = method;
  req.url = url;
  return req;
}

function responseCapture() {
  let statusCode = 200;
  let body = '';
  const headers = {};
  return {
    res: {
      setHeader(name, value) { headers[name.toLowerCase()] = value; },
      writeHead(code, extra = {}) { statusCode = code; Object.assign(headers, extra); },
      end(chunk = '') { body += chunk; }
    },
    read() { return { statusCode, headers, body }; }
  };
}

test('POST /action dispatches to shared action API', async () => {
  const capture = responseCapture();
  const handler = createRequestHandler({});
  await handler(request('POST', '/action', { action: 'start', input: { buyer: { state: 'HOLD' } } }), capture.res);
  const result = capture.read();
  assert.equal(result.statusCode, 200);
  assert.equal(JSON.parse(result.body).intent, 'start');
});

test('unsupported HTTP route returns 404', async () => {
  const capture = responseCapture();
  const handler = createRequestHandler({});
  await handler(request('GET', '/missing'), capture.res);
  assert.equal(capture.read().statusCode, 404);
});
