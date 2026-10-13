const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalDomain, canonicalEmail, organizationKey, findDuplicate } = require('../src/dedupe');

test('canonicalizes domain case and trailing dot', () => {
  assert.equal(canonicalDomain(' EXAMPLE.COM. '), 'example.com');
});

test('canonicalizes email case and whitespace', () => {
  assert.equal(canonicalEmail(' Owner@Example.COM '), 'owner@example.com');
});

test('organizationKey prefers canonical domain over name', () => {
  assert.equal(organizationKey({ name: 'Different Name', domain: 'EXAMPLE.com.' }), 'example.com');
});

test('exact mailbox duplicate is detected', () => {
  const state = { organizations: { 'example.com': { domain: 'example.com', contacts: { 'owner@example.com': { email: 'owner@example.com' } } } } };
  const result = findDuplicate(state, { organization: { name: 'Example', domain: 'example.com' }, email: 'OWNER@EXAMPLE.COM' });
  assert.equal(result.duplicate, true);
  assert.equal(result.kind, 'contact');
});

test('same organization with different contact is still organization duplicate', () => {
  const state = { organizations: { 'example.com': { domain: 'example.com', contacts: { 'first@example.com': { email: 'first@example.com' } } } } };
  const result = findDuplicate(state, { organization: { name: 'Example', domain: 'EXAMPLE.COM.' }, email: 'second@example.com' });
  assert.equal(result.duplicate, true);
  assert.equal(result.kind, 'organization');
});
