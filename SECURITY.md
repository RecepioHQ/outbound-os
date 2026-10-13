# Security Policy

Outbound OS is designed to fail closed around outbound actions, but it is still operator software that can access private mailbox data and, when explicitly enabled, send external email.

## Defaults

- Live sending is disabled unless provider configuration is complete and `OUTBOUND_OS_LIVE_SEND=1` is set.
- The ChatGPT/MCP server binds to loopback (`127.0.0.1`) by default.
- Non-loopback MCP binding is rejected unless `OUTBOUND_OS_MCP_ALLOW_REMOTE=1` is set.
- That remote-exposure flag is **not authentication**. Do not expose a mailbox-connected MCP server publicly without a real authentication/authorization boundary.
- State files live under `state/` by default and are excluded from Git.
- Exact approved-message hashes are checked again immediately before a live send.
- Ambiguous send mutations are not automatically retried.

## Credentials

Never commit:

- OAuth access or refresh tokens;
- API keys;
- client secrets;
- private keys;
- real `.env` files;
- mailbox passwords;
- private MCP/tunnel URLs or bearer credentials.

Use environment variables or another local secret store. `.env.example` contains names only and does not load automatically.

## Public-data boundary

All committed examples and tests must use synthetic identities and reserved/example domains. Never contribute real prospect names, emails, message IDs, thread IDs, negotiation data, mailbox captures, or production logs.

`npm run scan:release` checks common disclosure classes before release, but scanners are defense in depth—not permission to copy production data into the repository and hope it gets caught.

## Remote MCP deployments

The included MCP server is local-first. A public remote deployment that exposes private data or write tools needs an authorization model appropriate to the deployment, such as an OAuth-capable gateway/proxy that validates access for every request.

Do not set `OUTBOUND_OS_MCP_ALLOW_REMOTE=1` merely to make a tunnel or server reachable unless you understand and protect the resulting endpoint.

## Reporting a vulnerability

Do not open a public issue containing secrets, private data, or exploit details. Prefer GitHub private vulnerability reporting / Security Advisories for the repository when available. If private reporting is not available, open a minimal public issue requesting a private security contact without including the sensitive details.

## Supported version

Security fixes target the current `main` branch and latest tagged release.