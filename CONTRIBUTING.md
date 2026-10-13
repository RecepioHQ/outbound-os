# Contributing

Contributions are welcome when they preserve the project's core invariant: a model recommendation never overrides a mechanical safety gate.

## Before you change code

1. Keep changes focused and reviewable.
2. Add or update a failing test first for behavior changes and bug fixes.
3. Use only synthetic fixtures and reserved/example domains.
4. Do not add production credentials, logs, mailbox captures, buyer lists, or real prospect data.
5. Do not weaken verification, dedupe, approval hashes, rate/cap controls, deliverability checks, or ambiguous-send reconciliation to make a demo pass.

## Local checks

```bash
npm test
npm run demo
npm run scan:release
```

For the optional MCP wrapper:

```bash
cd chatgpt
npm install
npm start
```

## Data rules

Examples and tests must use domains such as:

- `example.com`
- `example.org`
- `example.net`
- `company.example`
- `company.invalid`

Do not anonymize a real customer/prospect and commit it. Create a fully synthetic fixture instead.

## Provider adapters

Provider mutations must be non-retrying by default. If the network result is ambiguous after a mutation attempt, require reconciliation before another attempt.

Read retries are acceptable only for clearly transient failures and must remain bounded.

## Tool metadata

MCP annotations must match actual behavior. If a tool begins writing persistent state or external state, update `readOnlyHint`; irreversible sends must remain destructive/open-world.

## Pull requests

A PR should explain:

- the behavior being changed;
- which test proves the change;
- any new external API or permission required;
- whether the change affects live-send, mailbox privacy, state persistence, or plugin annotations.

Run the full test suite and release scan before requesting review.