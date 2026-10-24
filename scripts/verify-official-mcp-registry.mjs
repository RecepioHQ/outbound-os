#!/usr/bin/env node
// Read-only, exact-name verification of the official MCP Registry entry.
import { readFileSync } from 'node:fs';

const metadata = JSON.parse(readFileSync(new URL('../server.json', import.meta.url), 'utf8'));
const attempts = process.argv.includes('--retry') ? 8 : 1;
const endpoint = 'https://registry.modelcontextprotocol.io/v0.1/servers?search=' +
  encodeURIComponent(metadata.name);

async function verify() {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let why = 'entry not indexed yet';
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Registry returned HTTP ' + response.status);
      const result = await response.json();
      const entry = (result.servers || []).find((item) =>
        item.server?.name === metadata.name &&
        item.server?.version === metadata.version &&
        item.server?.packages?.some((pkg) =>
          pkg.identifier === metadata.packages[0].identifier
        )
      );
      const status = entry?._meta?.['io.modelcontextprotocol.registry/official']?.status;
      if (entry && status === 'active') {
        console.log('VERIFIED official MCP registry: ' + metadata.name + '@' + metadata.version);
        console.log('OCI image: ' + metadata.packages[0].identifier);
        console.log('Status: ' + status);
        return;
      }
      why = entry ? 'entry exists but is not active' : why;
    } catch (error) {
      why = error.message;
    }
    if (attempt === attempts) throw new Error('Registry verification failed: ' + why);
    console.error('Registry not ready, rechecking (' + attempt + '/' + attempts + '): ' + why);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
await verify();
