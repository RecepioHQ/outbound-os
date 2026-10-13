# Deal Mode

A verified human reply exits the cold workflow immediately. The contact becomes cold-ineligible and a deal record is created or updated.

Deal state preserves the latest human reply, stage, verified facts, inferred context, unknowns, objections, pricing context, commitments, next justified action, and last thread sync.

Stages are explicit: `engaged -> discovery -> scope -> pricing -> negotiation -> closed_won | closed_lost | hold`.

Time passing alone never advances a deal stage. Permanent bounces block the exact failed address; temporary delays remain temporary until a later mailbox event resolves them.

Mailbox provider event IDs are replay-safe: processing the same event twice does not create duplicate deals or duplicate transitions.
