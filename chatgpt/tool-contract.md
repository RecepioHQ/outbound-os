# MCP tool contract

All tools delegate to `src/intent-router.js`; tool metadata never grants authority that the core engine does not have.

| Tool | Purpose | readOnly | destructive | openWorld | idempotent |
| --- | --- | --- | --- | --- | --- |
| `start` | Inspect state and choose next justified work | true | false | false | true |
| `check` | Read a bounded configured mailbox and return reconciled state | true | false | false | true |
| `send` | Attempt one gated email to an external recipient | false | true | true | false |

`send` is intentionally non-idempotent at the MCP metadata layer. The Zoho adapter never blindly retries an ambiguous send mutation; it requires reconciliation first.

`check` is read-only with respect to external systems in v0.1.0. It computes and returns a reconciled state object but does not persist that state from the MCP server by itself. If a future release persists state during `check`, its annotation must change to `readOnlyHint: false`.

For public remote deployment, protect private-data and write tools with authorization. The included server is local-first and binds to loopback by default.