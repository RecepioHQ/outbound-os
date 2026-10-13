const test = require('node:test');
const assert = require('node:assert/strict');
const { TOOL_DEFINITIONS, invokeTool } = require('../chatgpt/mcp-tools');

test('MCP tool surface exposes exactly start check send', () => {
  assert.deepEqual(TOOL_DEFINITIONS.map((tool) => tool.name).sort(), ['check', 'send', 'start']);
});

test('MCP tools declare accurate safety annotations', () => {
  const byName = Object.fromEntries(TOOL_DEFINITIONS.map((tool) => [tool.name, tool.annotations]));
  assert.deepEqual(byName.start, { readOnlyHint: true, destructiveHint: false, openWorldHint: false, idempotentHint: true });
  assert.deepEqual(byName.check, { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: true });
  assert.deepEqual(byName.send, { readOnlyHint: false, destructiveHint: true, openWorldHint: true, idempotentHint: false });
});

test('MCP tool invocation delegates to action API', async () => {
  const result = await invokeTool('start', { buyer: { state: 'HOLD' } }, {});
  assert.equal(result.intent, 'start');
  assert.equal(result.skill, 'buyer-research');
});

test('unknown MCP tool is rejected', async () => {
  await assert.rejects(() => invokeTool('blast', {}, {}), /unknown tool/i);
});
