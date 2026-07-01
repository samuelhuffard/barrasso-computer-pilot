import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOL_NAMES, buildToolPlan, dispatchToolPlan } from './tool-routing.js';

const email = {
  id: 'synthetic-route-1',
  from: 'constituent@example.test',
  subject: 'Help with delayed benefit',
};

const classification = {
  urgent: false,
  priority: 'normal',
  category: 'casework',
  intent: 'request_assistance',
  needs_reply: true,
  sentiment: 'neutral',
  topics: ['benefits'],
  reason: 'Routine casework assistance request.',
};

test('non-urgent messages only produce a log entry', () => {
  const plan = buildToolPlan(email, classification);
  const tools = plan.actions.map((entry) => entry.tool);

  assert.deepEqual(tools, [TOOL_NAMES.LOG_TRIAGE]);
});

test('urgent messages trigger staff notification in addition to the log entry', () => {
  const plan = buildToolPlan(email, {
    ...classification,
    urgent: true,
    priority: 'critical',
    category: 'threat_or_safety',
    intent: 'report_threat_or_safety',
  });

  const tools = plan.actions.map((entry) => entry.tool);
  assert.deepEqual(tools, [TOOL_NAMES.LOG_TRIAGE, TOOL_NAMES.NOTIFY_STAFF]);
});

test('dispatcher executes only explicitly allowlisted handlers', async () => {
  const plan = buildToolPlan(email, { ...classification, urgent: true });
  const called = [];
  const handlers = {
    [TOOL_NAMES.LOG_TRIAGE]: async () => called.push(TOOL_NAMES.LOG_TRIAGE),
    [TOOL_NAMES.NOTIFY_STAFF]: async () => called.push(TOOL_NAMES.NOTIFY_STAFF),
  };

  const outcomes = await dispatchToolPlan(
    plan,
    handlers,
    [TOOL_NAMES.LOG_TRIAGE],
  );

  assert.deepEqual(called, [TOOL_NAMES.LOG_TRIAGE]);
  assert.equal(outcomes[0].status, 'executed');
  assert.equal(outcomes[1].status, 'suggested_only');
});
