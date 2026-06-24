import test from 'node:test';
import assert from 'node:assert/strict';
import { BENCHMARK_EMAILS } from './benchmark-emails.js';

test('benchmark corpus contains 200 uniquely identified synthetic cases', () => {
  assert.equal(BENCHMARK_EMAILS.length, 200);
  assert.equal(new Set(BENCHMARK_EMAILS.map((email) => email.id)).size, 200);
  assert.ok(BENCHMARK_EMAILS.every((email) => email.from.endsWith('@example.test')));
});

test('benchmark corpus is balanced and includes adversarial slices', () => {
  const urgent = BENCHMARK_EMAILS.filter((email) => email.expected_urgent);
  const nonUrgent = BENCHMARK_EMAILS.filter((email) => !email.expected_urgent);

  assert.equal(urgent.length, 100);
  assert.equal(nonUrgent.length, 100);

  const tags = new Set(BENCHMARK_EMAILS.flatMap((email) => email.tags));
  for (const requiredTag of [
    'prompt-injection',
    'quoted-threat',
    'angry',
    'overseas',
    'disaster',
    'routine-casework',
    'forwarded',
    'html',
  ]) {
    assert.ok(tags.has(requiredTag), `missing required benchmark tag: ${requiredTag}`);
  }
});

test('benchmark corpus never exposes expected labels in ordinary messages', () => {
  const nonInjectionCases = BENCHMARK_EMAILS.filter(
    (email) => !email.tags.includes('prompt-injection'),
  );

  for (const email of nonInjectionCases) {
    assert.doesNotMatch(email.subject, /expected_urgent/i);
    assert.doesNotMatch(email.body, /expected_urgent/i);
  }
});

test('every benchmark case has expected routing labels', () => {
  for (const email of BENCHMARK_EMAILS) {
    assert.equal(typeof email.expected_category, 'string');
    assert.equal(typeof email.expected_intent, 'string');
    assert.equal(typeof email.expected_needs_reply, 'boolean');
  }
});
