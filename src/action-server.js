const http = require('node:http');
const { handleAction, buildActionDeps } = require('./action-api');

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (error) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, code, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(code);
  res.end(JSON.stringify(payload));
}

function createRequestHandler(deps = buildActionDeps()) {
  return async function requestHandler(req, res) {
    const url = new URL(req.url || '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/') {
      return sendJson(res, 200, { name: 'Outbound OS Action API', ok: true });
    }
    if (req.method !== 'POST' || url.pathname !== '/action') {
      return sendJson(res, 404, { ok: false, error: 'Not found' });
    }
    try {
      const body = await readJson(req);
      const result = await handleAction(body, deps);
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error.message });
    }
  };
}

function createActionServer(options = {}) {
  const deps = options.deps || buildActionDeps(options.env || process.env, options);
  return http.createServer(createRequestHandler(deps));
}

if (require.main === module) {
  const port = Number(process.env.PORT || 8787);
  createActionServer().listen(port, () => {
    console.log(`Outbound OS Action API listening on http://localhost:${port}/action`);
  });
}

module.exports = { createRequestHandler, createActionServer };
