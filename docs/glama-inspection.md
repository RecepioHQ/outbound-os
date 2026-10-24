# Glama MCP registry — safe build and introspection

Outbound OS ships a root `Dockerfile` designed for **Glama's source build and protocol introspection**. This is not a hosted email sender or an authenticated production service.

## What is verified

- The MCP server implements Streamable HTTP at `/mcp` and exposes `start`, `check` and policy-gated `send`.
- GitHub Actions builds the container image and checks the actual MCP `initialize` and `tools/list` exchange.
- The CI container binds only to **host loopback** (`127.0.0.1:18787`), has a read-only filesystem and uses `OUTBOUND_OS_LIVE_SEND=0`. No mail credentials are provided.
- Glama owner claim metadata lives in [glama.json](../glama.json) for `Tariq990`. Glama submission and automated grading require sign-in and separate registry verification.

## Reproduce with Docker (Node 22 test client)

```bash
docker build -t outbound-os-mcp:local .
docker run -d --name outbound-os-mcp-check \
  --read-only --tmpfs /tmp:rw,nosuid,size=32m \
  -p 127.0.0.1:18787:8787 -e OUTBOUND_OS_LIVE_SEND=0 \
  outbound-os-mcp:local
npm ci --ignore-scripts
node scripts/probe-mcp-endpoint.mjs
docker rm -f outbound-os-mcp-check
```

The above **must not** be changed to `-p 8787:8787` for convenience. Inside the container the service binds `0.0.0.0` so sandbox probes can reach it; the Docker **host port is loopback-only**. The MCP server has no authentication layer. **Never expose this container publicly** or inject Zoho credentials into it. For a real external integration, implement authentication and authorization before any network exposure.

## Submit to Glama

1. Sign in to <https://glama.ai/mcp/servers> using GitHub. Submit the exact repository URL <https://github.com/RecepioHQ/outbound-os>.
2. As this is an organization repository, complete the maintainer claim using [glama.json](../glama.json).
3. Select the checked-in root Dockerfile (or provide it in Glama if requested), run its build/inspection, and verify the server tools are discovered.
4. When the Glama listing is **actually published** and passes the registry checks, add its real score badge to the upstream [awesome-mcp-servers submission](https://github.com/punkpeye/awesome-mcp-servers/pull/17469). Do not invent a badge or score before listing approval.

Glama's registry and sandbox can change over time. A passing GitHub Actions build alone does not prove Glama has accepted or scored a listing.
