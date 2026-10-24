# Official MCP Registry publication (OCI)

This project can be discovered via the **official [Model Context Protocol registry](https://registry.modelcontextprotocol.io/)** once its metadata and public image have been successfully published.

**Current status:** `server.json` is a publication candidate; the repository does **not** claim to be listed in the registry or auto-discovered by Glama until the registry API confirms it.

## Why an OCI image

- The `chatgpt` MCP server runs over local Streamable HTTP at `http://localhost:8787/mcp`.
- `Dockerfile` has been tested in GitHub Actions with a real MCP `initialize` and `tools/list` exchange.
- The official registry accepts public OCI artifacts from `ghcr.io`, with ownership verified by the `io.modelcontextprotocol.server.name` label.
- GitHub Actions supports `mcp-publisher login github-oidc` without user PATs or npm publishing.

Identity: `io.github.recepciohq/outbound-os`  
Image: `ghcr.io/recepiohq/outbound-os-mcp:0.2.1`

## Publishing process

The [manual-only workflow](../.github/workflows/publish-official-mcp.yml) runs only from `main`:

1. Build the OCI image and verify the MCP ownership label.
2. Publish it to the GitHub Container Registry via a short-lived repository-scoped GitHub Actions token.
3. Confirm the image is **publicly readable anonymously**, without using the job's login credentials. If the image is private, the workflow stops **before** publishing metadata. In that case, a RecepioHQ owner must change the GHCR package visibility to **Public** in the package settings and rerun the workflow.
4. Validate `server.json` with the official publisher tool.
5. Log in using GitHub Actions OIDC, publish to the official registry, and verify the registry search API includes the entry.

GHCR package creation may initially default to private. **Do not assume a successful `docker push` is a public release.**

## Reproduce a safe test

```bash
docker build -t outbound-os-mcp:local .
docker run --detach --name outbound-os-mcp-check \
  --read-only --tmpfs /tmp:rw,nosuid,size=32m \
  --publish 127.0.0.1:18787:8787 \
  --env OUTBOUND_OS_LIVE_SEND=0 \
  outbound-os-mcp:local
npm ci --ignore-scripts
node scripts/probe-mcp-endpoint.mjs
docker rm --force outbound-os-mcp-check
```

**Security:** This is a discovery and local inspection package, **not a hosted production service**. The MCP endpoint has no authentication. Never bind the Docker host port publicly, never connect Zoho credentials to an Internet-exposed instance, and do not turn on live sending by default. Registry listing does not imply audited production deployment, actual mailbox checks, or third-party adoption.

The official registry is in preview and may change schema, versioning, or namespace rules. When a workflow fails, inspect its specific error and repair that cause before retrying; don't repeatedly republish the same OCI tag blindly.
