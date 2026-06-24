import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSccmailBlock } from './sccmail-parser.js';

const SAMPLE_FORWARD = `From: Boswell, Senn (Barrasso) <Senn_Boswell@Barrasso.senate.gov>
Sent: Wednesday, June 24, 2026 5:26 PM
To: Huffard, Sam (Barrasso) <Sam_Huffard@Barrasso.senate.gov>
Subject: urgent casework email

Senn Boswell
Professional Staff Member
U.S. Senator John Barrasso (R-WY)

<IP>999.999.999.999</IP>
<APP>SCCMAIL
<PREFIX>Mr.</PREFIX>
<FIRST>Senn</FIRST>
<LAST>Boswell</LAST>
<ADDR1>307 Dirksen Senate Office Building</ADDR1>
<ADDR2></ADDR2>
<CITY>Washington</CITY>
<STATE>DC</STATE>
<ZIP>20510</ZIP>
<PHONE_H></PHONE_H>
<PHONE_B></PHONE_B>
<PHONE_C>202-748-2453</PHONE_C>
<EMAIL>test@example.com</EMAIL>
<RSP>Yes</RSP>
<ISSUE>OtherStranded abroad</ISSUE>

<MSG>I need help getting an emergency passport to return to the US.

NZ consulate is in shambles!</MSG>
</APP>`;

test('returns null when no SCCMAIL block is present', () => {
  assert.equal(parseSccmailBlock('just a plain routine email, no tags here'), null);
});

test('returns null for non-string input', () => {
  assert.equal(parseSccmailBlock(null), null);
  assert.equal(parseSccmailBlock(undefined), null);
});

test('extracts contact fields from a real-format SCCMAIL forward', () => {
  const result = parseSccmailBlock(SAMPLE_FORWARD);
  assert.ok(result);
  assert.equal(result.constituent.first, 'Senn');
  assert.equal(result.constituent.last, 'Boswell');
  assert.equal(result.constituent.prefix, 'Mr.');
  assert.equal(result.constituent.city, 'Washington');
  assert.equal(result.constituent.state, 'DC');
  assert.equal(result.constituent.zip, '20510');
  assert.equal(result.constituent.phoneCell, '202-748-2453');
  assert.equal(result.constituent.phoneHome, '');
  assert.equal(result.constituent.email, 'test@example.com');
});

test('extracts the IP, issue, and response-requested flag', () => {
  const result = parseSccmailBlock(SAMPLE_FORWARD);
  assert.equal(result.ip, '999.999.999.999');
  assert.equal(result.issue, 'OtherStranded abroad');
  assert.equal(result.responseRequested, 'Yes');
});

test('extracts the constituent message body without the forward wrapper', () => {
  const result = parseSccmailBlock(SAMPLE_FORWARD);
  assert.equal(
    result.message,
    'I need help getting an emergency passport to return to the US.\n\nNZ consulate is in shambles!'
  );
});

test('handles a malformed/truncated block without throwing', () => {
  const truncated = '<IP>1.2.3.4</IP>\n<APP>SCCMAIL\n<FIRST>Jane</FIRST>\n<MSG>no closing tag';
  const result = parseSccmailBlock(truncated);
  assert.ok(result);
  assert.equal(result.constituent.first, 'Jane');
  assert.equal(result.message, '');
});
