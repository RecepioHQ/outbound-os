const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanPublicTree } = require('../scripts/public-release-scan');

function tree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'outbound-release-'));
  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, 'utf8');
  }
  return root;
}

function codes(result) {
  return result.findings.map((item) => item.code);
}

test('clean synthetic public tree passes', () => {
  const root = tree({
    'README.md': 'Contact demo@example.com and visit https://product.example/docs',
    '.env.example': 'API_TOKEN=\n',
    'examples/demo.json': '{"email":"owner@company.example"}'
  });
  assert.deepEqual(scanPublicTree(root), { ok: true, findings: [] });
});

test('forbidden private filenames and directories are blocked', () => {
  const root = tree({
    'outreach-tracker.json': '{}',
    'deal-memory/acme.json': '{}'
  });
  const result = scanPublicTree(root);
  assert.equal(result.ok, false);
  assert.ok(codes(result).includes('forbidden_path'));
});

test('non-example email is blocked', () => {
  const realEmail = ['alice', 'real-company.com'].join('@');
  const root = tree({ 'README.md': `Email ${realEmail}` });
  assert.ok(codes(scanPublicTree(root)).includes('non_synthetic_email'));
});

test('secret assignments and private key material are blocked', () => {
  const privateKey = ['-----BEGIN ', 'PRIVATE KEY-----', '\nabc\n', '-----END ', 'PRIVATE KEY-----'].join('');
  const root = tree({
    '.env': ['ZOHO_CLIENT_SECRET', 'super-secret-value'].join('=').concat('\n'),
    'key.txt': privateKey
  });
  const result = scanPublicTree(root);
  assert.ok(codes(result).includes('secret_value'));
  assert.ok(codes(result).includes('private_key'));
});

test('private/internal URLs are blocked but example and localhost docs are allowed', () => {
  const privateUrl = `https://${['service', 'internal'].join('.')}/api`;
  const bad = tree({ 'README.md': privateUrl });
  assert.ok(codes(scanPublicTree(bad)).includes('private_url'));
  const good = tree({ 'README.md': 'http://localhost:8787/mcp https://service.example/mcp' });
  assert.equal(scanPublicTree(good).ok, true);
});

test('long numeric provider identifiers are blocked', () => {
  const id = ['1234567890', '1234567890'].join('');
  const root = tree({ 'fixture.json': JSON.stringify({ message_id: id }) });
  assert.ok(codes(scanPublicTree(root)).includes('provider_identifier'));
});

test('absolute local user paths are blocked', () => {
  const localPath = ['C:', 'Users', 'someone', 'Desktop', 'secret.txt'].join('\\');
  const root = tree({ 'README.md': localPath });
  assert.ok(codes(scanPublicTree(root)).includes('absolute_local_path'));
});

test('private campaign denylist matches are blocked case-insensitively', () => {
  const term = ['Secret', 'Prospect', 'Incorporated'].join(' ');
  const root = tree({ 'README.md': `A reference to ${term}` });
  const result = scanPublicTree(root, [term.toLowerCase()]);
  assert.ok(codes(result).includes('private_denylist_match'));
});

test('denylist term does not match as a substring inside an unrelated word', () => {
  const term = ['li', 'ne'].join('');
  const root = tree({ 'README.md': 'pipeline discipline inline' });
  assert.equal(scanPublicTree(root, [term]).ok, true);
});

test('git history is blocked before publication unless explicitly allowed', () => {
  const root = tree({ 'README.md': 'safe' });
  fs.mkdirSync(path.join(root, '.git'));
  assert.ok(codes(scanPublicTree(root)).includes('git_history_present'));
  assert.equal(scanPublicTree(root, [], { allowGit: true }).ok, true);
});
