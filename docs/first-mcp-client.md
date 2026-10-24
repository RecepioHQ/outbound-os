# Get Outbound OS running as a local MCP server (5-minute guide)

This guide is for developers who want to **inspect and test the three MCP tools** in Claude Code or Cursor. Outbound OS has a [verified official MCP Registry entry](https://registry.modelcontextprotocol.io/v0.1/servers?search=outbound-os) and a public, MIT-licensed Docker image, but it is **not a hosted MCP service**.

For a browser-only policy simulation without Docker or an MCP client, use [the interactive demo](https://recepiohq.github.io/outbound-os/).

## Requirements

- Docker or Docker Desktop with a working local Docker engine
- For Claude Code: Claude Code CLI installed; for Cursor: Cursor installed
- An available local port `8787`
- **No Zoho account, secrets, API keys or email addresses required for discovery**

## Step 1 — Start the public container locally

Run this command from a terminal (one line; also works in PowerShell):

```bash
docker run --rm --detach --name outbound-os-local --read-only --tmpfs /tmp:rw,nosuid,size=32m --publish 127.0.0.1:8787:8787 --env OUTBOUND_OS_LIVE_SEND=0 ghcr.io/recepiohq/outbound-os-mcp:0.2.1
```

Docker fetches the public image automatically. The **host port is bound to `127.0.0.1` only**; do not replace it with `-p 8787:8787` because the container's MCP endpoint has no authentication.

```bash
docker logs outbound-os-local
```

Keep the container running while using the MCP client. For first-time source auditing, inspect the [Dockerfile](../Dockerfile) and the [official registry manifest](../server.json).

## Step 2 — Connect an MCP client

### Claude Code

From the folder where you want to use the tools:

```bash
claude mcp add --transport http outbound-os http://127.0.0.1:8787/mcp
claude mcp list
```

Claude Code uses local project scope by default. Start Claude Code and use `/mcp` to inspect connection status. The available tools should be **`start`**, **`check`** and **`send`**, with `send` marked potentially destructive and still subject to core safety gates.

Reference: [Claude Code MCP setup](https://code.claude.com/docs/en/mcp).

### Cursor

Open `~/.cursor/mcp.json` for user-wide configuration, or `.cursor/mcp.json` inside your own project, then add:

```json
{
  "mcpServers": {
    "outbound-os": {
      "url": "http://127.0.0.1:8787/mcp"
    }
  }
}
```

Restart or refresh MCP connections in Cursor and check its available tools. Cursor supports Streamable HTTP endpoints configured by URL. If you already have other servers, **merge** this object into your existing `mcpServers` instead of overwriting the file.

Reference: [Cursor MCP documentation](https://docs.cursor.com/context/model-context-protocol).

## Step 3 — Inspect, don't send

Ask the client: **“List the Outbound OS MCP tools and their input schemas. Do not invoke any sending operation.”**

The public container is a **dry-run-only inspection build**. It has no real Zoho credentials; `OUTBOUND_OS_LIVE_SEND=0` is set and no workflow has human approval or verified contacts. Do not interpret a reported tool name or a synthetic gate PASS as proof of deliverability or permission to send messages.

The **`check`** intent can read a configured mailbox in a properly authorized deployment, but this demonstration has no mailbox configuration. The **`send`** intent must not be used to contact real recipients as part of setup.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Port 8787 already used | Stop the competing local process, or change the host side to `127.0.0.1:18787:8787` and use `http://127.0.0.1:18787/mcp` in the client |
| Connection refused | Confirm `docker ps` lists `outbound-os-local`; inspect `docker logs outbound-os-local` |
| HTTP 404 on root URL | The protocol endpoint is `/mcp`, not the root `/` |
| No tools visible | Refresh the MCP client and inspect transport compatibility; this server exposes Streamable HTTP, not stdio |
| Trying to connect from an online cloud client | `127.0.0.1` is your own computer, not a remote hosted URL; use a properly authenticated, private tunnel only when you understand the threat model |
| Missing approval for sending | Expected: approvals and mailbox verification are not bypassed by installing the MCP server |

## Stop and clean up

```bash
docker stop outbound-os-local
```

Because the container was started with `--rm`, stopping it removes that instance. This does not alter your MCP client configuration or delete the local Docker image.

## What is and isn't verified

**Verified:** the exact public OCI package is anonymously pullable from GHCR, and GitHub Actions builds the same source Dockerfile and completes MCP `initialize` plus `tools/list` over loopback. The official MCP Registry lists `io.github.RecepioHQ/outbound-os@0.2.1` as active.

**Not claimed:** that every user machine or MCP client version was end-to-end tested, that Glama scored the server, or that a production mailbox is available. Report reproducible setup issues at [GitHub Issues](https://github.com/RecepioHQ/outbound-os/issues).
