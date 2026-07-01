import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyUrgentCategory } from './urgent-category-rules.js';

test('direct threat of violence classifies as threat_or_safety', () => {
  const email = { subject: 'Warning', body: 'I have a weapon and will be waiting outside the event.' };
  assert.equal(classifyUrgentCategory(email), 'threat_or_safety');
});

test('reported threat against the Senator classifies as threat_or_safety', () => {
  const email = { subject: 'Concerning post', body: 'Someone posted that one shot is all it takes.' };
  assert.equal(classifyUrgentCategory(email), 'threat_or_safety');
});

test('domestic violence / abuser classifies as threat_or_safety', () => {
  const email = { subject: 'Need help tonight', body: 'She is fleeing an armed abuser tonight and has nowhere to go.' };
  assert.equal(classifyUrgentCategory(email), 'threat_or_safety');
});

test('missing child abduction classifies as threat_or_safety', () => {
  const email = { subject: 'Missing child', body: 'Police believe an adult took them across state lines.' };
  assert.equal(classifyUrgentCategory(email), 'threat_or_safety');
});

test('flood disaster assistance request classifies as casework, not threat_or_safety', () => {
  const email = {
    subject: 'Flooding damage to ranch, need disaster assistance info',
    body: 'Our ranch sustained serious flood damage this week and we have livestock at risk. We need to know what federal disaster assistance is available right now, this is time sensitive.',
  };
  assert.equal(classifyUrgentCategory(email), 'casework');
});

test('wildfire evacuation classifies as casework', () => {
  const email = { subject: 'Wildfire approaching', body: 'The evacuation road is blocked and the wildfire is moving toward our neighborhood.' };
  assert.equal(classifyUrgentCategory(email), 'casework');
});

test('constituent stranded overseas classifies as casework', () => {
  const email = {
    subject: 'My father is stuck overseas and needs help',
    body: 'My father is a Wyoming resident currently traveling in a country where the embassy has been unreachable for two days.',
  };
  assert.equal(classifyUrgentCategory(email), 'casework');
});

test('detained overseas without a threatening person classifies as casework', () => {
  const email = { subject: 'Detained overseas', body: 'My husband was detained by foreign police yesterday and has not been allowed to contact a lawyer or the embassy.' };
  assert.equal(classifyUrgentCategory(email), 'casework');
});

test('medical equipment failure classifies as casework', () => {
  const email = { subject: 'Oxygen equipment stopped after outage', body: 'My father’s home oxygen equipment has failed during the outage and the backup supply is nearly empty.' };
  assert.equal(classifyUrgentCategory(email), 'casework');
});

test('self-harm risk classifies as threat_or_safety despite being framed as a medical case', () => {
  const email = { subject: 'Veteran in immediate danger', body: 'My brother is a veteran in crisis and has said he will harm himself tonight.' };
  assert.equal(classifyUrgentCategory(email), 'threat_or_safety');
});

test('ambiguous urgent content with no matching signal defaults to threat_or_safety', () => {
  const email = { subject: 'Please help immediately', body: 'This is an urgent situation and I need someone from the office to call me back right away.' };
  assert.equal(classifyUrgentCategory(email), 'threat_or_safety');
});
