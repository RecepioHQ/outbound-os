# Hard Gates

Outbound OS is fail-closed. `Send` is an intent, not a bypass.

The public first-touch chain evaluates, in order: Buyer Selection, evidence quality, contact route, strict mailbox validity, dedupe, factual personalization, preflight, commercial review, deliverability health, rate/cap controls, explicit authorization, and approval-hash integrity.

A critical failure returns `BLOCK`. Missing readiness such as authorization can return `HOLD`. Transport is reachable only when every required gate is `PASS`.

Strict mailbox verification passes only `valid`; `invalid`, `catch_all`, `unknown`, and `error` are blocked by default.