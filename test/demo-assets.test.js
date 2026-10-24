const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

test('interactive screenshot is a nonempty PNG with readable dimensions', () => {
  const image = fs.readFileSync(path.join(root, 'docs/assets/demo-blocked.png'));
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(image.readUInt32BE(16) >= 900, 'screenshot too narrow');
  assert.ok(image.readUInt32BE(20) >= 700, 'screenshot too short');
  assert.ok(image.byteLength > 10000, 'screenshot appears empty');
});

test('social preview and favicon use local/static assets only', () => {
  const html = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
  assert.match(html, /og:image.*demo-blocked\.png/);
  assert.match(html, /rel="icon" href="\.\/favicon\.svg"/);
  assert.match(html, /No API or tracking calls/);
  assert.match(html, /connect-src 'none'/);
  assert.ok(fs.existsSync(path.join(root, 'docs/favicon.svg')));
  assert.doesNotThrow(() => new vm.Script(fs.readFileSync(path.join(root, 'docs/app.js'), 'utf8')));
});
