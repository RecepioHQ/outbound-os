# MCP tool contract

All tools delegate to `src/intent-router.js`; tool metadata never grants authority that the core engine does not have.

| Tool | Purpose | readOnly | destructive | openWorld | idempotent |
| --- | --- | --- | --- | --- | --- |
| `start` | Inspect state and choose next justified work | true | false | false | true |
| `check` | Read a bounded configured mailbox and persist reconciled local state | false | false | true | true |
| `send` | Attempt one gated email to an external recipient | false | true | true | false |

`send` is intentionally non-idempotent at the MCP metadata layer. The Zoho adapter never blindly retries an ambiguous send mutation; it requires reconciliation first.

`check` does not mutate the mailbox, but it does read an external mailbox and persist reconciled local state. Its MCP annotations therefore use `readOnlyHint: false`, `openWorldHint: true`, `destructiveHint: false`, and `idempotentHint: true`.

For public remote deployment, protect private-data and write tools with authorization. The included server is local-first and binds to loopback by default.