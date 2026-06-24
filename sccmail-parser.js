// Parses the SCCMAIL casework-intake block the office's mail system embeds in
// forwarded constituent emails: a flat <APP>...</APP> wrapper with one tag per
// field (see sample from sysadmin, 2026-06-24). Tags are not real XML — no
// nesting, no escaping — so a per-field regex is more robust than an XML parser
// against malformed/truncated blocks.
const FIELD_TAGS = [
  'PREFIX', 'FIRST', 'LAST',
  'ADDR1', 'ADDR2', 'CITY', 'STATE', 'ZIP',
  'PHONE_H', 'PHONE_B', 'PHONE_C',
  'EMAIL', 'RSP', 'ISSUE',
];

function extractTag(text, tag) {
  // The office's mail system has been observed to drop the leading "<" on a
  // closing tag (e.g. "<LAST>Test2/LAST>" instead of "<LAST>Test2</LAST>") —
  // tolerate that so a single typo upstream doesn't silently blank a field.
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<?\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

// Parses a single SCCMAIL <APP>...</APP> block out of a forwarded email body.
// Returns null if no block is found (i.e. this is a plain, non-casework email).
function parseSccmailBlock(text) {
  if (typeof text !== 'string' || !/<APP>/i.test(text)) return null;

  const appMatch = text.match(/<APP>([\s\S]*?)<\/APP>/i);
  const appBody = appMatch ? appMatch[1] : text;

  const ipMatch = text.match(/<IP>([\s\S]*?)<\/IP>/i);

  const fields = {};
  for (const tag of FIELD_TAGS) {
    fields[tag.toLowerCase()] = extractTag(appBody, tag);
  }

  return {
    ip: ipMatch ? ipMatch[1].trim() : '',
    constituent: {
      prefix: fields.prefix,
      first: fields.first,
      last: fields.last,
      addr1: fields.addr1,
      addr2: fields.addr2,
      city: fields.city,
      state: fields.state,
      zip: fields.zip,
      phoneHome: fields.phone_h,
      phoneBusiness: fields.phone_b,
      phoneCell: fields.phone_c,
      email: fields.email,
    },
    responseRequested: fields.rsp,
    issue: fields.issue,
    message: extractTag(appBody, 'MSG'),
  };
}

export { parseSccmailBlock };
