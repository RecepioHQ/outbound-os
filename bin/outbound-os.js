#!/usr/bin/env node
'use strict';

// Public command dispatcher. Keep transport decisions in the existing
// fail-closed action API; this file does not bypass its safety gates.
const { version } = require('../package.json');
const { main: runAction } = require('../src/cli');
const { runDemo } = require('../scripts/demo');
const { runContrastDemo } = require('../scripts/demo-contrast');

const HELP = `Outbound OS ${version} — decision-gated outbound workflows

Usage:
  outbound-os demo            Offline synthetic walkthrough (no live sends)
  outbound-os demo --json     Output the synthetic walkthrough as JSON
  outbound-os demo --compare  Show an allowed and a blocked synthetic send
  outbound-os start --json    Read task context (existing policy gates apply)
  outbound-os check --json    Reconcile configured mailbox/state
  outbound-os send --json     Evaluate prepared context; never bypass hard gates
  outbound-os --help          Show this help
  outbound-os --version       Show package version

For prepared action contexts:
  outbound-os send --json --input ./prepared-context.json

Safety:
  The demo uses synthetic data and does not perform network calls.
  Live sends are disabled by default and require explicit configuration,
  exact approval, and successful verification of every hard gate.
  See SECURITY.md before configuring a mailbox or remote MCP endpoint.
`;

async function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    process.stdout.write(HELP);
    return 0;
  }
  if (command === '--version' || command === '-v' || command === 'version') {
    process.stdout.write(`${version}\n`);
    return 0;
  }
  if (command === 'demo') {
    if (rest.some((flag) => flag !== '--json' && flag !== '--compare')) {
      process.stderr.write('demo only supports --json and --compare\n');
      return 2;
    }
    const result = rest.includes('--compare') ? await runContrastDemo() : await runDemo();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }
  if (['start', 'check', 'send'].includes(command.toLowerCase())) {
    return runAction(argv);
  }
  process.stderr.write(`Unknown command: ${command}. Use --help for supported commands.\n`);
  return 2;
}

if (require.main === module) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  });
}

module.exports = { main };
