---
name: outbound-operator
description: Operate Outbound OS through its Start, Check, and Send MCP tools while preserving all mechanical safety gates.
---

Use `start` to inspect the current state and identify the next justified task.

Use `check` to read and reconcile mailbox events. Treat mailbox evidence as authoritative for send, reply, bounce, delay, and delivery events.

Use `send` only when the user explicitly asks to send or has otherwise provided the required authorization. The tool itself still enforces Buyer Selection, evidence, mailbox verification, dedupe, preflight, commercial review, deliverability, rate/cap, authorization, and approval-hash gates.

Never describe `Start`, `Check`, or `Send` as bypass commands. A failed hard gate means stop.