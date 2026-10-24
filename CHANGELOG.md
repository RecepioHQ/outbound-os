# Changelog

## [0.2.0] — 2026-10-24

This release focuses on a safe, installable developer experience for the MIT-licensed Outbound OS reference implementation.

### Added

- An `outbound-os` executable entry point with `demo`, `--help`, `--version`, plus delegation to the existing policy-gated `start`, `check`, and `send` actions.
- Offline synthetic demo via `outbound-os demo --json`, with no live mail delivery.
- Six focused CLI regression tests covering the command entrypoint, error exits, version/help, the demo, and default-disabled live sends.
- GitHub Actions Node 22 checks for tests, release disclosure scanning, demo output, and npm archive binary contents.

### Verified

- **94/94 tests passed** from the v0.2.0 branch in an isolated Windows checkout using Node 22 and npm 10.
- `npm run scan:release` returned zero findings in that checkout.
- **The actual v0.2.0 archive** was created and installed with an isolated npm prefix on Windows. The installed CLI ran `demo --json` and confirmed `live_sent=false` and `simulated=true`.
- The Node GitHub Actions workflow for the CLI change passed in the main repository.

### Installation

See [README](README.md). You can clone this repository, `npm ci`, and run `node bin/outbound-os.js demo --json`, or build an npm archive with `npm pack` and install it locally.

**Known issue:** a direct global GitHub-source npm installation created a dangling workspace junction on one verified Windows/npm 10 environment. The documented packed archive installation worked instead. Track progress in [issue #3](https://github.com/RecepioHQ/outbound-os/issues/3).

### Security and scope

- Live mail sending remains **disabled by default**; the hard gates and exact approval hash still apply.
- No live external email traffic is part of the demo or baseline tests.
- This release does not claim npm-registry publication, production SaaS readiness, community adoption metrics, revenue improvements, or compatibility with all possible providers.
- The MIT license is unchanged.

## [0.1.0]

Initial MIT-licensed public reference implementation and baseline deterministic outbound safety model.
