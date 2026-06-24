const CATEGORIES = new Set([
  'casework',
  'policy_opinion',
  'threat_or_safety',
  'administrative',
  'other',
]);

const SENTIMENTS = new Set(['positive', 'neutral', 'negative']);

function validateClassification(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, error: 'response must be a JSON object' };
  }
  if (typeof value.urgent !== 'boolean') {
    return { valid: false, error: '"urgent" must be a boolean' };
  }
  if (!CATEGORIES.has(value.category)) {
    return { valid: false, error: `"category" must be one of: ${[...CATEGORIES].join(', ')}` };
  }
  if (!SENTIMENTS.has(value.sentiment)) {
    return { valid: false, error: `"sentiment" must be one of: ${[...SENTIMENTS].join(', ')}` };
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

  const latencies = [];
  const failures = [];

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
    `Schema failures: ${metrics.schemaFailures}`,
    `Request failures: ${metrics.requestFailures}`,
    `Latency: avg ${metrics.latencyMs.average ?? 'n/a'}ms, p50 ${metrics.latencyMs.p50 ?? 'n/a'}ms, p95 ${metrics.latencyMs.p95 ?? 'n/a'}ms, max ${metrics.latencyMs.max ?? 'n/a'}ms`,
  ].join('\n');
}

export { calculateMetrics, formatMetrics, percentile, validateClassification };
