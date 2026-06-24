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

test('casework creates intake and draft-review suggestions', () => {
  const plan = buildToolPlan(email, classification);
  const tools = plan.actions.map((entry) => entry.tool);

  assert.deepEqual(tools, [
    TOOL_NAMES.LOG_TRIAGE,
    TOOL_NAMES.CREATE_CASE_REVIEW,
    TOOL_NAMES.CREATE_DRAFT_REVIEW,
  ]);
});

test('policy opinion creates an aggregate correspondence signal without drafting', () => {
  const plan = buildToolPlan(email, {
    ...classification,
    category: 'policy_opinion',
    intent: 'share_opinion',
    needs_reply: false,
    sentiment: 'negative',
    topics: ['energy_policy'],
  });

  assert.deepEqual(plan.actions.map((entry) => entry.tool), [
    TOOL_NAMES.LOG_TRIAGE,
    TOOL_NAMES.RECORD_CORRESPONDENCE_SIGNAL,
  ]);
});

test('urgent messages trigger staff notification but never auto-draft', () => {
  const plan = buildToolPlan(email, {
    ...classification,
    urgent: true,
    priority: 'critical',
    category: 'threat_or_safety',
    intent: 'report_threat_or_safety',
  });

  const tools = plan.actions.map((entry) => entry.tool);
  assert.ok(tools.includes(TOOL_NAMES.NOTIFY_STAFF));
  assert.ok(tools.includes(TOOL_NAMES.CREATE_SAFETY_REVIEW));
  assert.ok(!tools.includes(TOOL_NAMES.CREATE_DRAFT_REVIEW));
});

test('administrative intents route to specialized review workflows', () => {
  const meeting = buildToolPlan(email, {
    ...classification,
    category: 'administrative',
    intent: 'request_meeting',
  });
  const unsubscribe = buildToolPlan(email, {
    ...classification,
    category: 'administrative',
    intent: 'unsubscribe',
    needs_reply: false,
  });

  assert.ok(meeting.actions.some((entry) => entry.tool === TOOL_NAMES.CREATE_SCHEDULING_REVIEW));
  assert.ok(unsubscribe.actions.some((entry) => entry.tool === TOOL_NAMES.CREATE_SUBSCRIPTION_REVIEW));
});

test('dispatcher executes only explicitly allowlisted handlers', async () => {
  const plan = buildToolPlan(email, classification);
  const called = [];
  const handlers = {
    [TOOL_NAMES.LOG_TRIAGE]: async () => called.push(TOOL_NAMES.LOG_TRIAGE),
    [TOOL_NAMES.CREATE_CASE_REVIEW]: async () => called.push(TOOL_NAMES.CREATE_CASE_REVIEW),
  };

  const outcomes = await dispatchToolPlan(
    plan,
    handlers,
    [TOOL_NAMES.LOG_TRIAGE],
  );

  assert.deepEqual(called, [TOOL_NAMES.LOG_TRIAGE]);
  assert.equal(outcomes[0].status, 'executed');
  assert.equal(outcomes[1].status, 'suggested_only');
  assert.equal(outcomes[2].status, 'suggested_only');
});
