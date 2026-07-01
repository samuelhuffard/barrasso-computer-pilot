import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSccmailBlock } from './sccmail-parser.js';

const SAMPLE_FORWARD = `From: Staffer, Test (Barrasso) <Test_Staffer@example.test>
Sent: Wednesday, June 24, 2026 5:26 PM
To: Intake, Test (Barrasso) <Test_Intake@example.test>
Subject: urgent casework email

Test Staffer
Professional Staff Member
U.S. Senator John Barrasso (R-WY)

<IP>999.999.999.999</IP>
<APP>SCCMAIL
<PREFIX>Mr.</PREFIX>
<FIRST>Alex</FIRST>
<LAST>Sample</LAST>
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
  assert.equal(result.constituent.first, 'Alex');
  assert.equal(result.constituent.last, 'Sample');
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

// Real sample #2 from sysadmin (2026-06-24): a reply-chain forward quoting
// the original stranded-abroad message underneath new commentary. Confirms
// the parser correctly pulls the single SCCMAIL block out of a reply chain
// that also contains unrelated forward-header noise above it.
test('extracts the SCCMAIL block correctly when quoted inside a reply chain', () => {
  const replyChain = `Heres an example of a threatening one\n\nTest Staffer\nProfessional Staff Member\n\n${SAMPLE_FORWARD}`;
  const result = parseSccmailBlock(replyChain);
  assert.ok(result);
  assert.equal(result.constituent.first, 'Alex');
  assert.equal(result.message, 'I need help getting an emergency passport to return to the US.\n\nNZ consulate is in shambles!');
});

// Real sample #3 from sysadmin (2026-06-24): a genuine threatening message,
// and it shipped with a real-world malformed closing tag on <LAST>
// ("Test2/LAST>" instead of "Test2</LAST>") — the exact bug this parser
// must tolerate rather than silently dropping the field.
test('recovers a field value despite a missing "<" on its closing tag', () => {
  const threatening = `<IP>999.999.999.999</IP>
<APP>SCCMAIL
<PREFIX>Mr.</PREFIX>
<FIRST>Test</FIRST>
<LAST>Test2/LAST>
<ADDR1>307 Dirksen Senate Office Building</ADDR1>
<ADDR2></ADDR2>
<CITY>Washington</CITY>
<STATE>DC</STATE>
<ZIP>20510</ZIP>
<PHONE_H></PHONE_H>
<PHONE_B></PHONE_B>
<PHONE_C>5555555555</PHONE_C>
<EMAIL>test@example.com</EMAIL>
<RSP>Yes</RSP>
<ISSUE>OtherJanuary 6th, 2021</ISSUE>
<MSG>Could you give me the home addresses of all Senate Republicans that do not believe we should investigate January 6th! Somebody might need to stop by and tare down there fence, break out there windows, trash the interior of there house and call it a friendly visit!!!! HOW STUPID DO YOU THINK WE ARE!!!!!!!! (most of us)</MSG>
</APP>`;
  const result = parseSccmailBlock(threatening);
  assert.ok(result);
  assert.equal(result.constituent.first, 'Test');
  assert.equal(result.constituent.last, 'Test2');
  assert.equal(result.constituent.phoneCell, '5555555555');
  assert.equal(result.issue, 'OtherJanuary 6th, 2021');
  assert.match(result.message, /home addresses of all Senate Republicans/);
});
