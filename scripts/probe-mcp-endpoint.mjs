// Minimal end-to-end introspection of an actual Streamable HTTP MCP endpoint.
// Intended for an isolated local, dry-run-only container in CI.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const requireFromWorkspace = createRequire(new URL('../chatgpt/package.json', import.meta.url));
const { Client } = await import(pathToFileURL(requireFromWorkspace.resolve('@modelcontextprotocol/sdk/client/index.js')).href);
const { StreamableHTTPClientTransport } = await import(pathToFileURL(requireFromWorkspace.resolve('@modelcontextprotocol/sdk/client/streamableHttp.js')).href);

const endpoint = process.env.OUTBOUND_OS_MCP_TEST_URL || 'http://127.0.0.1:18787/mcp';
const url = new URL(endpoint);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
  throw new Error('MCP inspection must connect to a local loopback endpoint');
}
const client = new Client({ name: 'outbound-os-container-smoke', version: '0.1.0' });
try {
  await client.connect(new StreamableHTTPClientTransport(url));
  const { tools } = await client.listTools();
  const actual = tools.map(tool => tool.name).sort();
  const expected = ['check', 'send', 'start'];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('Unexpected MCP tools: ' + JSON.stringify(actual));
  }
  const send = tools.find(tool => tool.name === 'send');
  if (send.annotations?.destructiveHint !== true || !send.inputSchema) {
    throw new Error('Gated send tool lacks the required declaration');
  }
  console.log('PASS: MCP initialize and tools/list; gated tools=' + actual.join(','));
} finally {
  await client.close();
}
