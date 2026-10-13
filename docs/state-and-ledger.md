# State and Ledger

Outbound OS keeps operational memory outside the chat session.

- `state/state.json` is the current derived projection, written atomically.
- `state/events.jsonl` is append-only and records reconciled lifecycle changes.
- Replayed provider/event IDs are idempotent.
- Organization identity is canonicalized by domain when available; email identity is case-insensitive.
- A mailbox/provider remains authoritative for actual send/reply/delivery events; local state reconciles to that evidence rather than inventing outcomes.

The default runtime directory is `state/` at the repository root and is excluded from Git. Set `OUTBOUND_OS_DATA_DIR` to move the runtime state elsewhere.

The CLI action layer and MCP action layer both load this state automatically when a request does not explicitly provide a state object. After a mailbox `check`, the reconciled state is written back atomically. This lets Deal Mode survive a new process or chat session without depending on conversational memory.

No credentials belong in state files.