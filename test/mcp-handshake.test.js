const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');

test('MCP loopback server completes protocol initialize and lists three gated tools', { timeout: 16000 }, async () => {
  const mod = await import(pathToFileURL(path.resolve(__dirname, '../chatgpt/mcp-server.mjs')).href);
  const chatgptRequire = createRequire(path.resolve(__dirname, '../chatgpt/package.json'));
  const { Client } = await import(pathToFileURL(chatgptRequire.resolve('@modelcontextprotocol/sdk/client/index.js')).href);
  const { StreamableHTTPClientTransport } = await import(pathToFileURL(chatgptRequire.resolve('@modelcontextprotocol/sdk/client/streamableHttp.js')).href);

  const httpServer = mod.createMcpHttpServer({
    env: { OUTBOUND_OS_LIVE_SEND: '0' },
    depsFactory: () => ({})
  });
  let client;
  try {
    await new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(0, '127.0.0.1', resolve);
    });
    const port = httpServer.address().port;
    assert.ok(port > 0);

    client = new Client({ name: 'outbound-os-local-smoke', version: '0.1.0' });
    const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:' + port + '/mcp'));
    await client.connect(transport);

    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map(t => t.name).sort(), ['check', 'send', 'start']);
    const send = tools.tools.find(t => t.name === 'send');
    assert.equal(send.annotations?.destructiveHint, true);
    assert.ok(send.inputSchema, 'Tool schema must be present');
  } finally {
    if (client) await client.close();
    await new Promise((resolve, reject) => httpServer.close(e => e ? reject(e) : resolve()));
  }
});
