const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../chatgpt/plugin-template');

test('portable plugin template has valid identity and MCP example endpoint', () => {
  const plugin = JSON.parse(fs.readFileSync(path.join(root, 'plugin.json'), 'utf8'));
  const mcp = JSON.parse(fs.readFileSync(path.join(root, 'mcp.json'), 'utf8'));
  assert.equal(plugin.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(plugin.name, 'outbound-os');
  assert.equal(plugin.version, '0.1.0');
  assert.equal(plugin.license, 'MIT');
  assert.equal(mcp.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
  assert.equal(mcp.mcpServers.outbound_os.type, 'streamable-http');
  assert.equal(mcp.mcpServers.outbound_os.url, 'https://outbound-os.example/mcp');
});

test('portable plugin template includes a valid skill entrypoint', () => {
  const skill = fs.readFileSync(path.join(root, 'skills/outbound-operator/SKILL.md'), 'utf8');
  assert.match(skill, /^---\r?\nname: outbound-operator\r?\ndescription:/);
  assert.match(skill, /start/i);
  assert.match(skill, /check/i);
  assert.match(skill, /send/i);
});
