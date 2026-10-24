# Hacker News launch preparation — factual checklist

**Status:** Preparation notes, **not** a ready-to-publish HN post. This file was assembled with AI assistance. Hacker News requests that contributors write their own submissions and comments and not automate posting. The author should use these as verifiable facts to explain the project in their own words.

Sources:
- https://news.ycombinator.com/showhn.html
- https://news.ycombinator.com/newsguidelines.html
- https://news.ycombinator.com/showlim

## Project and proof

- Interactive browser demo (public, no account): https://recepiohq.github.io/outbound-os/
- Repo: https://github.com/RecepioHQ/outbound-os
- Verified browser result: HTTPS 200 and Chrome rendered 13 production-policy gates; synthetic-only, no network calls or real email
- GitHub Pages source: main branch, /docs directory
- License: MIT (see `LICENSE`)
- Stack: Node.js 22+, CommonJS, local CLI, optional MCP and Zoho Mail adapter
- Core distinction: checks buyer selection, evidentiary support, mailbox verification, duplicates, approval hash, send authorization, deliverability and rate/cap policy **before any transport action**.
- The local demonstration uses synthetic inputs, reserved example domains, a mock mailbox and dry-run transport. It does not contact a real email provider.
- A passing synthetic path is compared with a deliberately blocked one. In the blocked path, `mailbox_verification=unknown` produces `BLOCK` and **zero transport calls**.
- State and reply reconciliation exist, but the tool is **not a hosted SaaS**, a lead database, or a turnkey bulk-mail campaign manager.
- Live sending is disabled by default and requires Zoho configuration, explicit authorization and exact approval. No guarantee of successful deliverability or outcomes.

## Two commands worth demonstrating

From the repo root after installing locked dependencies:

```bash
npm ci
node bin/outbound-os.js demo --compare
```

For installation from an **official release archive**, first ensure that the archive's version actually contains the `--compare` feature. Otherwise use the source commands above; do not claim that an old release offers a new feature.

## Prior to manual submission

- [ ] Manually open the public browser demo and test the approved, blocked and HOLD scenarios before submission.
- [ ] Verify the latest default branch and all advertised commands still work on a clean machine.
- [ ] Check the README install steps, license, and links.
- [ ] Ensure a green CI workflow and the safety scanner completed.
- [ ] Check https://news.ycombinator.com/showlim for current restrictions on Show HN eligibility.
- [ ] Visit https://news.ycombinator.com/showhn.html and confirm the project qualifies as something people can run.
- [ ] Avoid a signup gate, demo email collection, and unverifiable marketing claims.
- [ ] The project author writes the submission title and post **in their own words**, drawing from the observed demo and personal motivation.
- [ ] Submit the **actual repository** as the URL and prefix the personally authored title with `Show HN:` *only when eligible*.
- [ ] Stay available to answer technical questions and disclose limitations.
- [ ] Do not request upvotes or comments, use automation to post, or delete/repost to game ranking.

## Useful technical discussion topics (not a post script)

- Why policy must reside below the AI model instead of trusting its recommendations.
- Distinction between a synthetic passing dry-run and authorization to contact a real recipient.
- Why `unknown` mailbox verification is blocked instead of assumed safe.
- Tradeoffs of strict per-message approval hashes.
- Tradeoffs and operational risks of integrating a user-owned Zoho mailbox.
- Limitations of a reference implementation compared with a hosted SaaS.

## Feedback and contribution paths

- Bug reports and feature requests: https://github.com/RecepioHQ/outbound-os/issues
- Safe CLI input diagnostics: https://github.com/RecepioHQ/outbound-os/issues/4
- npm Git-source installation diagnostics: https://github.com/RecepioHQ/outbound-os/issues/3
- Before contributing: [CONTRIBUTING.md](../CONTRIBUTING.md)
- Security issues: [SECURITY.md](../SECURITY.md)

## Success metrics (measure, don't invent)

Record timestamped unique external bug reports, reproductions, independently created PRs, confirmed third-party usage, and reproducible feedback. Stars alone are not proof of adoption. Never create artificial engagement to satisfy a grant application.
