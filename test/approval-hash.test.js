const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalMessage, hashMessage, createApproval, approvalMatches } = require('../src/approval');

function message() {
  return { recipient: 'owner@example.com', subject: 'Hello', text: 'Plain text', html: '<p>Plain text</p>' };
}

test('identical message preserves approval hash', () => {
  const original = message();
  const approval = createApproval(original, 'commercial-review');
  assert.equal(approvalMatches({ ...original }, approval), true);
  assert.equal(hashMessage(original), approval.message_sha256);
  assert.equal(typeof canonicalMessage(original), 'string');
});

for (const field of ['recipient', 'subject', 'text', 'html']) {
  test(`mutation of ${field} invalidates approval`, () => {
    const original = message();
    const approval = createApproval(original, 'commercial-review');
    const changed = { ...original, [field]: `${original[field]} changed` };
    assert.equal(approvalMatches(changed, approval), false);
  });
}
