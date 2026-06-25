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
  const clean = {
    urgent: true,
    needs_reply: false,
    category: 'casework',
    topics: ['benefits'],
    intent: 'request_assistance',
    priority: 'high',
    sentiment: 'neutral',
    reason: 'constituent needs help with a benefits claim',
  };
  assert.deepEqual(normalizeClassification(clean), clean);
});

test('coerces a near-miss category into a valid one via keyword match', () => {
  assert.equal(normalizeClassification({ category: 'safety_concern' }).category, 'threat_or_safety');
  assert.equal(normalizeClassification({ category: 'Emergency' }).category, 'threat_or_safety');
  assert.equal(normalizeClassification({ category: 'general_info' }).category, 'administrative');
});

test('falls back to "other" for an unrecognized category or intent', () => {
  assert.equal(normalizeClassification({ category: 'zzz_unknown' }).category, 'other');
  assert.equal(normalizeClassification({ intent: 'zzz_unknown' }).intent, 'other');
});

test('coerces a non-array topics value into an array', () => {
  assert.deepEqual(normalizeClassification({ topics: 'medicare enrollment' }).topics, ['medicare_enrollment']);
  assert.deepEqual(normalizeClassification({ topics: null }).topics, []);
});

test('defaults priority from urgent and reason when missing', () => {
  assert.equal(normalizeClassification({ urgent: true }).priority, 'critical');
  assert.equal(normalizeClassification({ urgent: false }).priority, 'normal');
  assert.equal(normalizeClassification({ reason: '' }).reason, 'No reason provided by model.');
});

test('passes through non-object input unchanged', () => {
  assert.equal(normalizeClassification(null), null);
  assert.equal(normalizeClassification(undefined), undefined);
});
