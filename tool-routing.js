const TOOL_NAMES = Object.freeze({
  LOG_TRIAGE: 'log_triage',
  NOTIFY_STAFF: 'notify_staff',
  CREATE_SAFETY_REVIEW: 'create_safety_review',
  CREATE_CASE_REVIEW: 'create_case_review',
  RECORD_CORRESPONDENCE_SIGNAL: 'record_correspondence_signal',
  CREATE_DRAFT_REVIEW: 'create_draft_review',
  CREATE_SCHEDULING_REVIEW: 'create_scheduling_review',
  CREATE_SUBSCRIPTION_REVIEW: 'create_subscription_review',
  CREATE_ADMIN_REVIEW: 'create_admin_review',
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

  if (classification.category === 'threat_or_safety') {
    actions.push(action(
      TOOL_NAMES.CREATE_SAFETY_REVIEW,
      'Safety-related correspondence requires a dedicated human review record.',
      common,
    ));
  }

  if (classification.category === 'casework') {
    actions.push(action(
      TOOL_NAMES.CREATE_CASE_REVIEW,
      'Casework should enter a staff-reviewed intake workflow.',
      common,
    ));
  }

  if (classification.category === 'policy_opinion') {
    actions.push(action(
      TOOL_NAMES.RECORD_CORRESPONDENCE_SIGNAL,
      'Policy correspondence can contribute to aggregate topic and sentiment reporting.',
      {
        ...common,
        topics: classification.topics,
        sentiment: classification.sentiment,
      },
      { execution: 'automatic_safe' },
    ));
  }

  if (classification.category === 'administrative') {
    if (classification.intent === 'request_meeting') {
      actions.push(action(
        TOOL_NAMES.CREATE_SCHEDULING_REVIEW,
        'Meeting requests should enter the scheduling review queue.',
        common,
      ));
    } else if (classification.intent === 'unsubscribe') {
      actions.push(action(
        TOOL_NAMES.CREATE_SUBSCRIPTION_REVIEW,
        'Subscription changes require a controlled administrative workflow.',
        common,
      ));
    } else {
      actions.push(action(
        TOOL_NAMES.CREATE_ADMIN_REVIEW,
        'Administrative correspondence should enter the general staff review queue.',
        common,
      ));
    }
  }

  if (classification.needs_reply && !classification.urgent) {
    actions.push(action(
      TOOL_NAMES.CREATE_DRAFT_REVIEW,
      'The classifier identified a likely reply requirement; drafting remains human-reviewed.',
      common,
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
