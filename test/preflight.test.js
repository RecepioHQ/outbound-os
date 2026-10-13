const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDraft } = require('../src/preflight');

const evidence = [
  { claim: 'Offers an AI receptionist product', status: 'VERIFIED' },
  { claim: 'Has an official commercial contact route', status: 'VERIFIED' }
];

test('verified factual claims pass preflight', () => {
  const result = validateDraft({
    recipient: 'owner@example.com',
    subject: 'Example',
    text: 'Hello',
    claims: ['Offers an AI receptionist product']
  }, evidence);
  assert.equal(result.ok, true);
  assert.deepEqual(result.unsupported_claims, []);
});

test('unsupported personalization claim blocks preflight', () => {
  const result = validateDraft({
    recipient: 'owner@example.com',
    subject: 'Example',
    text: 'Hello',
    claims: ['Raised a $10M round']
  }, evidence);
  assert.equal(result.ok, false);
  assert.deepEqual(result.unsupported_claims, ['Raised a $10M round']);
});

test('missing required draft fields fail closed', () => {
  const result = validateDraft({ subject: 'No recipient', claims: [] }, evidence);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some((reason) => /recipient/i.test(reason)));
});
