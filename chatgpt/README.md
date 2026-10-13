# ChatGPT / MCP integration

Outbound OS exposes the same three operator intents to ChatGPT through an optional MCP server:

- `start` — inspect state and return the next justified work; no external mutation.
- `check` — read the configured mailbox and reconcile the returned state; no mailbox mutation.
- `send` — attempt one approved outbound email through the same core gate engine used by the CLI.

There is no privileged ChatGPT send path. `send` still requires Buyer Selection, evidence, mailbox verification, dedupe, factual preflight, commercial review, deliverability/rate/cap health, explicit authorization, and an exact approval hash.

## Run locally

```bash
cd chatgpt
npm install
npm start
```

By default the MCP server binds only to `127.0.0.1:8787` and exposes `/mcp`. This is intentional because mailbox access can contain private data and `send` can create an irreversible external action.

Use MCP Inspector or a supported private/Secure MCP Tunnel flow for development. Do not expose the server directly to the public internet without authentication and authorization.

## Remote deployment

OpenAI's current plugin architecture uses MCP servers and skills. A production remote plugin needs a stable HTTPS Streamable HTTP endpoint, normally ending in `/mcp`, and private-data/write tools must be protected by an appropriate authorization flow.

Outbound OS v0.1.0 does not ship a hosted multi-user OAuth service. `chatgpt/plugin-template/` is therefore a packaging template, not a ready-to-submit public plugin. Replace the `.example` MCP URL only after deploying the server behind an authorization boundary appropriate for your users.

The server refuses non-loopback binding unless `OUTBOUND_OS_MCP_ALLOW_REMOTE=1` is explicitly set. That flag only acknowledges network exposure; it does not implement OAuth or make a public deployment safe by itself.

## ChatGPT plan compatibility

ChatGPT plugin/MCP capabilities vary by plan, workspace, region, administrator settings, and action type. Do not assume that a ChatGPT Plus subscription alone guarantees arbitrary custom write/send actions. The local CLI remains the universal operator surface for the public repository.

Official references:

- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/plugins/build/plugins
