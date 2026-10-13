import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const { TOOL_DEFINITIONS, invokeTool } = require('./mcp-tools.js');
const { buildActionDeps } = require('../src/action-api.js');

const contextSchema = z.record(z.string(), z.unknown()).optional();

function resultPayload(result) {
  return {
    content: [{ type: 'text', text: JSON.stringify(result) }],
    structuredContent: { result }
  };
}

export function createMcpServer(deps = buildActionDeps(process.env)) {
  const server = new McpServer(
    { name: 'outbound-os', version: '0.1.0' },
    {
      instructions: 'Use start to inspect the next justified work, check to read/reconcile mailbox state, and send only when the user explicitly requests sending. No tool bypasses Outbound OS hard gates. Send may create an irreversible external email.'
    }
  );

  for (const tool of TOOL_DEFINITIONS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: { input: contextSchema },
        annotations: tool.annotations
      },
      async ({ input }) => resultPayload(await invokeTool(tool.name, input || {}, deps))
    );
  }
  return server;
}

export function resolveListenHost(env = process.env) {
  const host = String(env.OUTBOUND_OS_MCP_HOST || '127.0.0.1').trim() || '127.0.0.1';
  const loopback = host === '127.0.0.1' || host === '::1' || host === 'localhost';
  if (!loopback && env.OUTBOUND_OS_MCP_ALLOW_REMOTE !== '1') {
    throw new Error('Remote MCP exposure is disabled. Add an authentication layer and set OUTBOUND_OS_MCP_ALLOW_REMOTE=1 only when you intend to expose the server.');
  }
  return host;
}

export function createMcpHttpServer(options = {}) {
  const mcpPath = options.path || '/mcp';
  const env = options.env || process.env;
  const depsFactory = options.depsFactory || (() => buildActionDeps(env));

  return createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');

    if (req.method === 'OPTIONS' && url.pathname === mcpPath) {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, mcp-session-id',
        'Access-Control-Expose-Headers': 'Mcp-Session-Id'
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Outbound OS MCP server');
      return;
    }

    const allowedMethods = new Set(['POST', 'GET', 'DELETE']);
    if (url.pathname === mcpPath && req.method && allowedMethods.has(req.method)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
      const server = createMcpServer(depsFactory());
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });
      res.on('close', () => {
        transport.close();
        server.close();
      });
      try {
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } catch (error) {
        if (!res.headersSent) res.writeHead(500).end('Internal server error');
      }
      return;
    }

    res.writeHead(404).end('Not Found');
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const port = Number(process.env.PORT || 8787);
  const host = resolveListenHost(process.env);
  createMcpHttpServer().listen(port, host, () => {
    console.log(`Outbound OS MCP server listening on http://${host}:${port}/mcp`);
  });
}
