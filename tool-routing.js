const TOOL_NAMES = Object.freeze({
  LOG_TRIAGE: 'log_triage',
  NOTIFY_STAFF: 'notify_staff',
});

function action(tool, reason, payload, options = {}) {
  return {
    tool,
    reason,
    payload,
    execution: options.execution ?? 'review_required',
  };
}

function buildToolPlan(email, classification) {
  const common = {
    emailId: email.id,
    from: email.from ?? 'unknown',
    subject: email.subject,
    body: email.body ?? '',
    classification,
  };

  const actions = [
    action(
      TOOL_NAMES.LOG_TRIAGE,
      'Every message should have an auditable classification record.',
      common,
      { execution: 'automatic_safe' },
    ),
  ];

  if (classification.urgent) {
    actions.push(action(
      TOOL_NAMES.NOTIFY_STAFF,
      'Urgent safety or emergency classification requires immediate human review.',
      common,
      { execution: 'automatic_safe' },
    ));
  }

  return {
    emailId: email.id,
    generatedAt: new Date().toISOString(),
    actions,
  };
}

async function dispatchToolPlan(plan, handlers, allowedTools = []) {
  const allowlist = new Set(allowedTools);
  const outcomes = [];

  for (const plannedAction of plan.actions) {
    const handler = handlers[plannedAction.tool];
    if (!allowlist.has(plannedAction.tool) || typeof handler !== 'function') {
      outcomes.push({
        tool: plannedAction.tool,
        status: 'suggested_only',
        reason: plannedAction.reason,
      });
      continue;
    }

    const result = await handler(plannedAction.payload, plannedAction);
    outcomes.push({
      tool: plannedAction.tool,
      status: 'executed',
      result,
    });
  }

  return outcomes;
}

export { TOOL_NAMES, buildToolPlan, dispatchToolPlan };
