const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SKIP_DIRS = new Set(['node_modules', '.git']);

function listFiles(root) {
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

function buildReleaseManifest(root) {
  const absoluteRoot = path.resolve(root);
  return listFiles(absoluteRoot)
    .map((full) => {
      const bytes = fs.readFileSync(full);
      return {
        path: path.relative(absoluteRoot, full).replace(/\\/g, '/'),
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        bytes: bytes.length
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

if (require.main === module) {
  const root = process.argv[2] || process.cwd();
  process.stdout.write(`${JSON.stringify({ root: path.resolve(root), files: buildReleaseManifest(root) }, null, 2)}\n`);
}

module.exports = { buildReleaseManifest };
