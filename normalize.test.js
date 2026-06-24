import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeClassification } from './normalize.js';

test('normalizes messy topics into valid snake_case', () => {
  const result = normalizeClassification({ topics: [' Senator_attendance', 'town hall', "Senator's office"] });
  assert.deepEqual(result.topics, ['senator_attendance', 'town_hall', 'senator_s_office']);
});

test('caps topics at 3 and drops empty strings after cleaning', () => {
  const result = normalizeClassification({ topics: ['a', 'b', 'c', 'd', '   ', ''] });
  assert.deepEqual(result.topics, ['a', 'b', 'c']);
});

test('coerces string booleans for urgent and needs_reply', () => {
  const result = normalizeClassification({ urgent: 'true', needs_reply: 'False' });
  assert.equal(result.urgent, true);
  assert.equal(result.needs_reply, false);
});

test('lowercases and trims enum-like fields', () => {
  const result = normalizeClassification({ category: ' Threat_or_Safety ', intent: 'Report_Threat_Or_Safety', priority: 'CRITICAL', sentiment: 'Negative' });
  assert.equal(result.category, 'threat_or_safety');
  assert.equal(result.intent, 'report_threat_or_safety');
  assert.equal(result.priority, 'critical');
  assert.equal(result.sentiment, 'negative');
});

test('leaves already-clean values untouched', () => {
  const clean = { urgent: true, needs_reply: false, category: 'casework', topics: ['benefits'] };
  assert.deepEqual(normalizeClassification(clean), clean);
});

test('passes through non-object input unchanged', () => {
  assert.equal(normalizeClassification(null), null);
  assert.equal(normalizeClassification(undefined), undefined);
});
