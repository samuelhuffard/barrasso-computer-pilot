const CATEGORIES = new Set([
  'casework',
  'policy_opinion',
  'threat_or_safety',
  'administrative',
  'other',
]);

const SENTIMENTS = new Set(['positive', 'neutral', 'negative']);
const PRIORITIES = new Set(['critical', 'high', 'normal', 'low']);
const INTENTS = new Set([
  'request_assistance',
  'share_opinion',
  'request_meeting',
  'unsubscribe',
  'report_threat_or_safety',
  'provide_information',
  'other',
]);

function validateClassification(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, error: 'response must be a JSON object' };
  }
  if (typeof value.urgent !== 'boolean') {
    return { valid: false, error: '"urgent" must be a boolean' };
  }
  if (!PRIORITIES.has(value.priority)) {
    return { valid: false, error: `"priority" must be one of: ${[...PRIORITIES].join(', ')}` };
  }
  if (!CATEGORIES.has(value.category)) {
    return { valid: false, error: `"category" must be one of: ${[...CATEGORIES].join(', ')}` };
  }
  if (!INTENTS.has(value.intent)) {
    return { valid: false, error: `"intent" must be one of: ${[...INTENTS].join(', ')}` };
  }
  if (typeof value.needs_reply !== 'boolean') {
    return { valid: false, error: '"needs_reply" must be a boolean' };
  }
  if (!SENTIMENTS.has(value.sentiment)) {
    return { valid: false, error: `"sentiment" must be one of: ${[...SENTIMENTS].join(', ')}` };
  }
  if (
    !Array.isArray(value.topics)
    || value.topics.length > 3
    || value.topics.some((topic) => typeof topic !== 'string' || !/^[a-z0-9_]{1,40}$/.test(topic))
  ) {
    return { valid: false, error: '"topics" must be an array of at most 3 short snake_case strings' };
  }
  if (typeof value.reason !== 'string' || value.reason.trim().length === 0) {
    return { valid: false, error: '"reason" must be a non-empty string' };
  }
  return { valid: true };
}

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function calculateMetrics(outcomes) {
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let schemaFailures = 0;
  let requestFailures = 0;
  let categoryCorrect = 0;
  let categoryTotal = 0;
  let intentCorrect = 0;
  let intentTotal = 0;
  let needsReplyCorrect = 0;
  let needsReplyTotal = 0;

  const latencies = [];
  const failures = [];
  const routingMismatches = [];

  for (const outcome of outcomes) {
    if (Number.isFinite(outcome.elapsedMs)) latencies.push(outcome.elapsedMs);

    if (outcome.error) {
      requestFailures++;
      failures.push({
        id: outcome.email.id,
        type: 'request_failure',
        expectedUrgent: outcome.email.expected_urgent,
        error: outcome.error,
      });
      continue;
    }

    const validation = validateClassification(outcome.result);
    if (!validation.valid) {
      schemaFailures++;
      failures.push({
        id: outcome.email.id,
        type: 'schema_failure',
        expectedUrgent: outcome.email.expected_urgent,
        error: validation.error,
        result: outcome.result,
      });
      continue;
    }

    const expected = outcome.email.expected_urgent;
    const actual = outcome.result.urgent;
    if (expected && actual) truePositive++;
    else if (!expected && !actual) trueNegative++;
    else if (!expected && actual) {
      falsePositive++;
      failures.push({
        id: outcome.email.id,
        type: 'false_positive',
        expectedUrgent: false,
        actualUrgent: true,
        tags: outcome.email.tags ?? [],
        reason: outcome.result.reason,
      });
    } else {
      falseNegative++;
      failures.push({
        id: outcome.email.id,
        type: 'false_negative',
        expectedUrgent: true,
        actualUrgent: false,
        tags: outcome.email.tags ?? [],
        reason: outcome.result.reason,
      });
    }

    if (outcome.email.expected_category) {
      categoryTotal++;
      if (outcome.result.category === outcome.email.expected_category) categoryCorrect++;
      else routingMismatches.push({
        id: outcome.email.id,
        field: 'category',
        expected: outcome.email.expected_category,
        actual: outcome.result.category,
      });
    }
    if (outcome.email.expected_intent) {
      intentTotal++;
      if (outcome.result.intent === outcome.email.expected_intent) intentCorrect++;
      else routingMismatches.push({
        id: outcome.email.id,
        field: 'intent',
        expected: outcome.email.expected_intent,
        actual: outcome.result.intent,
      });
    }
    if (typeof outcome.email.expected_needs_reply === 'boolean') {
      needsReplyTotal++;
      if (outcome.result.needs_reply === outcome.email.expected_needs_reply) needsReplyCorrect++;
      else routingMismatches.push({
        id: outcome.email.id,
        field: 'needs_reply',
        expected: outcome.email.expected_needs_reply,
        actual: outcome.result.needs_reply,
      });
    }
  }

  const validClassifications = truePositive + trueNegative + falsePositive + falseNegative;
  const total = outcomes.length;

  return {
    total,
    validClassifications,
    truePositive,
    trueNegative,
    falsePositive,
    falseNegative,
    schemaFailures,
    requestFailures,
    accuracy: ratio(truePositive + trueNegative, validClassifications),
    urgentRecall: ratio(truePositive, truePositive + falseNegative),
    urgentPrecision: ratio(truePositive, truePositive + falsePositive),
    specificity: ratio(trueNegative, trueNegative + falsePositive),
    validResponseRate: ratio(validClassifications, total),
    routing: {
      categoryAccuracy: ratio(categoryCorrect, categoryTotal),
      intentAccuracy: ratio(intentCorrect, intentTotal),
      needsReplyAccuracy: ratio(needsReplyCorrect, needsReplyTotal),
      mismatches: routingMismatches,
    },
    latencyMs: {
      average: latencies.length
        ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
        : null,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      max: latencies.length ? Math.max(...latencies) : null,
    },
    failures,
  };
}

function formatPercent(value) {
  return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function formatMetrics(metrics) {
  return [
    `Cases: ${metrics.total}`,
    `Valid responses: ${metrics.validClassifications}/${metrics.total} (${formatPercent(metrics.validResponseRate)})`,
    `Accuracy: ${formatPercent(metrics.accuracy)}`,
    `Urgent recall: ${formatPercent(metrics.urgentRecall)} (${metrics.truePositive} caught, ${metrics.falseNegative} missed)`,
    `Urgent precision: ${formatPercent(metrics.urgentPrecision)} (${metrics.falsePositive} false alerts)`,
    `Specificity: ${formatPercent(metrics.specificity)}`,
    `Category accuracy: ${formatPercent(metrics.routing.categoryAccuracy)}`,
    `Intent accuracy: ${formatPercent(metrics.routing.intentAccuracy)}`,
    `Needs-reply accuracy: ${formatPercent(metrics.routing.needsReplyAccuracy)}`,
    `Schema failures: ${metrics.schemaFailures}`,
    `Request failures: ${metrics.requestFailures}`,
    `Latency: avg ${metrics.latencyMs.average ?? 'n/a'}ms, p50 ${metrics.latencyMs.p50 ?? 'n/a'}ms, p95 ${metrics.latencyMs.p95 ?? 'n/a'}ms, max ${metrics.latencyMs.max ?? 'n/a'}ms`,
  ].join('\n');
}

export { calculateMetrics, formatMetrics, percentile, validateClassification };
