const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildReleaseManifest } = require('../scripts/release-manifest');

test('release manifest is sorted, deterministic, and excludes node_modules/.git', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outbound-manifest-'));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(path.join(root, 'node_modules/pkg'), { recursive: true });
  fs.mkdirSync(path.join(root, '.git'), { recursive: true });
  fs.writeFileSync(path.join(root, 'z.txt'), 'z', 'utf8');
  fs.writeFileSync(path.join(root, 'src/a.txt'), 'a', 'utf8');
  fs.writeFileSync(path.join(root, 'node_modules/pkg/index.js'), 'ignored', 'utf8');
  fs.writeFileSync(path.join(root, '.git/config'), 'ignored', 'utf8');

  const manifest = buildReleaseManifest(root);
  assert.deepEqual(manifest.map((item) => item.path), ['src/a.txt', 'z.txt']);
  assert.equal(manifest[0].sha256, crypto.createHash('sha256').update('a').digest('hex'));
  assert.deepEqual(buildReleaseManifest(root), manifest);
});
