const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN_SEGMENTS = new Set([
  'outreach-tracker.json',
  'current-targets.json',
  'current-targets.txt',
  'follow-up-resolutions.json',
  'buyer-research',
  'deal-memory',
  'deal-reviews',
  'preflight-reviews',
  'recovery-reviews',
  'handoff.md',
  'mcp-url.txt',
  '.secrets'
]);

const SKIP_DIRS = new Set(['node_modules', '.git']);

function isAllowedSyntheticEmail(email) {
  const domain = String(email).split('@')[1]?.toLowerCase() || '';
  return domain === 'example.com' || domain === 'example.org' || domain === 'example.net' || domain.endsWith('.example') || domain.endsWith('.invalid');
}

function walkFiles(root) {
  const files = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  visit(root);
  return files;
}

function pushFinding(findings, code, relative, detail) {
  findings.push({ code, path: relative.replace(/\\/g, '/'), detail });
}

function scanEnvSecrets(content, relative, findings) {
  const isEnv = /(^|\/|\\)\.env(?:\.[^/\\]+)?$/i.test(relative);
  if (!isEnv || /\.env\.example$/i.test(relative)) return;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (value && !/^(changeme|placeholder|example|your[-_].*|<.*>)$/i.test(value)) {
      pushFinding(findings, 'secret_value', relative, `Non-placeholder value in ${key.trim()}`);
    }
  }
}

function scanContent(content, relative, findings, denylist) {
  const privateKey = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
  if (privateKey.test(content)) pushFinding(findings, 'private_key', relative, 'Private key material detected');

  const tokenPattern = /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|ya29\.[0-9A-Za-z_-]{20,})\b/g;
  if (tokenPattern.test(content)) pushFinding(findings, 'secret_value', relative, 'Credential/token-like value detected');

  scanEnvSecrets(content, relative, findings);

  const emailPattern = /\b[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi;
  for (const match of content.matchAll(emailPattern)) {
    if (!isAllowedSyntheticEmail(match[0])) {
      pushFinding(findings, 'non_synthetic_email', relative, `Non-example email detected: ${match[0]}`);
    }
  }

  const urlPattern = /https?:\/\/[^\s)>'"`]+/gi;
  for (const match of content.matchAll(urlPattern)) {
    try {
      const parsed = new URL(match[0]);
      const host = parsed.hostname.toLowerCase();
      const privateIpv4 = /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(?:1[6-9]|2\d|3[01])\./.test(host);
      const internalName = host.endsWith('.internal') || (host.endsWith('.local') && host !== 'localhost');
      if (privateIpv4 || internalName) pushFinding(findings, 'private_url', relative, `Private/internal URL detected: ${match[0]}`);
    } catch (_) {}
  }

  const providerId = /["']?(?:message_id|messageId|thread_id|threadId|account_id|accountId|provider_event_id)["']?\s*[:=]\s*["']?(\d{15,})/g;
  if (providerId.test(content)) pushFinding(findings, 'provider_identifier', relative, 'Long provider/message identifier detected');

  const windowsPath = /\b[A-Za-z]:\\Users\\[^\\\s]+\\/;
  const posixPath = /(?:^|\s)(?:\/Users|\/home)\/[^/\s]+\//;
  if (windowsPath.test(content) || posixPath.test(content)) {
    pushFinding(findings, 'absolute_local_path', relative, 'Absolute local user path detected');
  }

  const lower = content.toLowerCase();
  const isWordChar = (char) => Boolean(char) && /[\p{L}\p{N}]/u.test(char);
  for (const raw of denylist || []) {
    const term = String(raw || '').trim().toLowerCase();
    if (term.length < 4) continue;
    let index = 0;
    let matched = false;
    while ((index = lower.indexOf(term, index)) >= 0) {
      const left = index > 0 ? lower[index - 1] : '';
      const rightIndex = index + term.length;
      const right = rightIndex < lower.length ? lower[rightIndex] : '';
      if (!isWordChar(left) && !isWordChar(right)) {
        matched = true;
        break;
      }
      index += Math.max(1, term.length);
    }
    if (matched) pushFinding(findings, 'private_denylist_match', relative, `Private denylist term detected: ${raw}`);
  }
}

function scanPublicTree(root, privateDenylist = [], options = {}) {
  const absoluteRoot = path.resolve(root);
  const findings = [];

  if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) {
    return { ok: false, findings: [{ code: 'missing_root', path: '.', detail: 'Public tree does not exist' }] };
  }

  if (fs.existsSync(path.join(absoluteRoot, '.git')) && !options.allowGit) {
    pushFinding(findings, 'git_history_present', '.git', 'Git history exists before publication gate');
  }

  for (const full of walkFiles(absoluteRoot)) {
    const relative = path.relative(absoluteRoot, full);
    const segments = relative.split(path.sep).map((segment) => segment.toLowerCase());
    if (segments.some((segment) => FORBIDDEN_SEGMENTS.has(segment))) {
      pushFinding(findings, 'forbidden_path', relative, 'Private-project path is forbidden in the public tree');
    }

    let content;
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch (_) {
      continue;
    }
    if (content.includes('\u0000')) continue;
    scanContent(content, relative, findings, privateDenylist);
  }

  findings.sort((a, b) => `${a.path}:${a.code}:${a.detail}`.localeCompare(`${b.path}:${b.code}:${b.detail}`));
  return { ok: findings.length === 0, findings };
}

if (require.main === module) {
  const root = process.argv.find((arg) => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1]) || process.cwd();
  const allowGit = process.argv.includes('--allow-git');
  const result = scanPublicTree(root, [], { allowGit });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = { scanPublicTree };
