const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

test('ChatGPT MCP server module can be imported and creates a server', async () => {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, '../chatgpt/mcp-server.mjs')).href;
  const mod = await import(moduleUrl);
  assert.equal(typeof mod.createMcpServer, 'function');
  const server = mod.createMcpServer({});
  assert.ok(server);
  assert.equal(typeof server.connect, 'function');
  await server.close();
});

test('MCP server binds to loopback by default', async () => {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, '../chatgpt/mcp-server.mjs')).href;
  const mod = await import(moduleUrl);
  assert.equal(mod.resolveListenHost({}), '127.0.0.1');
});

test('non-loopback MCP exposure requires explicit opt-in', async () => {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, '../chatgpt/mcp-server.mjs')).href;
  const mod = await import(moduleUrl);
  assert.throws(() => mod.resolveListenHost({ OUTBOUND_OS_MCP_HOST: '0.0.0.0' }), /remote MCP exposure is disabled/i);
  assert.equal(mod.resolveListenHost({ OUTBOUND_OS_MCP_HOST: '0.0.0.0', OUTBOUND_OS_MCP_ALLOW_REMOTE: '1' }), '0.0.0.0');
});
