import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMetrics,
  formatMetrics,
  percentile,
  validateClassification,
} from './evaluation.js';

const validResult = {
  urgent: false,
  category: 'casework',
  sentiment: 'neutral',
  reason: 'Routine request.',
};

test('validateClassification accepts the required response schema', () => {
  assert.deepEqual(validateClassification(validResult), { valid: true });
});

test('validateClassification rejects malformed fields', () => {
  assert.equal(validateClassification(null).valid, false);
  assert.equal(validateClassification({ ...validResult, urgent: 'false' }).valid, false);
  assert.equal(validateClassification({ ...validResult, category: 'emergency' }).valid, false);
  assert.equal(validateClassification({ ...validResult, sentiment: 'angry' }).valid, false);
  assert.equal(validateClassification({ ...validResult, reason: '' }).valid, false);
});

test('percentile uses nearest-rank behavior', () => {
  assert.equal(percentile([10, 20, 30, 40], 50), 20);
  assert.equal(percentile([10, 20, 30, 40], 95), 40);
  assert.equal(percentile([], 95), null);
});

test('calculateMetrics distinguishes misses, false alerts, and invalid responses', () => {
  const outcomes = [
    {
      email: { id: 'tp', expected_urgent: true },
      result: { ...validResult, urgent: true, category: 'threat_or_safety' },
      elapsedMs: 100,
    },
    {
      email: { id: 'tn', expected_urgent: false },
      result: validResult,
      elapsedMs: 200,
    },
    {
      email: { id: 'fp', expected_urgent: false, tags: ['angry_non_threat'] },
      result: { ...validResult, urgent: true },
      elapsedMs: 300,
    },
    {
      email: { id: 'fn', expected_urgent: true, tags: ['overseas'] },
      result: validResult,
      elapsedMs: 400,
    },
    {
      email: { id: 'schema', expected_urgent: false },
      result: { urgent: false },
      elapsedMs: 500,
    },
    {
      email: { id: 'request', expected_urgent: true },
      error: 'timeout',
      elapsedMs: 600,
    },
  ];

  const metrics = calculateMetrics(outcomes);

  assert.equal(metrics.truePositive, 1);
  assert.equal(metrics.trueNegative, 1);
  assert.equal(metrics.falsePositive, 1);
  assert.equal(metrics.falseNegative, 1);
  assert.equal(metrics.schemaFailures, 1);
  assert.equal(metrics.requestFailures, 1);
  assert.equal(metrics.accuracy, 0.5);
  assert.equal(metrics.urgentRecall, 0.5);
  assert.equal(metrics.urgentPrecision, 0.5);
  assert.equal(metrics.specificity, 0.5);
  assert.equal(metrics.validResponseRate, 4 / 6);
  assert.deepEqual(metrics.latencyMs, {
    average: 350,
    p50: 300,
    p95: 600,
    max: 600,
  });
  assert.equal(metrics.failures.length, 4);
});

test('formatMetrics emphasizes urgent recall and latency percentiles', () => {
  const metrics = calculateMetrics([
    {
      email: { id: 'tp', expected_urgent: true },
      result: { ...validResult, urgent: true, category: 'threat_or_safety' },
      elapsedMs: 125,
    },
  ]);

  const output = formatMetrics(metrics);
  assert.match(output, /Urgent recall: 100\.0%/);
  assert.match(output, /p95 125ms/);
});
