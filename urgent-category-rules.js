// Deterministic category assignment for urgent messages. The model reliably
// decides urgent/not-urgent but conflated "urgent" with "threat_or_safety" as a
// category (e.g. classifying a flood-disaster assistance request the same as an
// actual threat of violence) — so once a message is urgent, which bucket it
// lands in is decided here by definition, not left to the model's judgment.
//
// threat_or_safety: someone (the sender, a third party, or an aggressor) is in
// danger BECAUSE OF ANOTHER PERSON'S actions — a threat, act of violence, abuse,
// abduction, trafficking, or an immediate risk to life such as self-harm.
//
// casework: an urgent request for the office's help with a situation caused by
// circumstance rather than a person threatening harm — natural disaster, being
// stranded/detained/unreachable overseas, a medical/logistics emergency.
//
// If neither definition matches, the message still needs a human to look at it
// immediately (it was marked urgent), so it defaults to threat_or_safety rather
// than silently falling through to a category with no configured alert
// recipients (see alert-routing.js) — the same escalate-on-uncertainty
// philosophy already used by injection-guard.js.

const THREAT_OR_SAFETY_SIGNALS = [
  // Deliberately excludes the bare word "armed" — "armed fighting/conflict" in an
  // overseas-unrest email is circumstance (casework), not a person threatening the
  // constituent. "Armed" only counts here paired with a person (see patterns below).
  /\b(threat(en(ing)?|ened)?|attack|weapon|gun|shoot(ing)?|kill(ing)?|blood|violence|violent)\b/i,
  /\bharm\s+(the\s+senator|myself|himself|herself|themselves|him|her|them|someone)\b/i,
  /\b(abuser|domestic\s+violence|fleeing\s+(an?\s+)?(armed|abusive)|armed\s+(man|person|individual|suspect|attacker|gunman))\b/i,
  /\b(traffick|forced\s+labor|held\s+against\s+(my|her|his|their)\s+will|documents?\s+(were\s+)?taken|not\s+(able|allowed)\s+to\s+leave|cannot\s+safely\s+call\s+police)\b/i,
  /\b(abduct|took\s+(them|him|her)\s+across\s+state\s+lines|missing\s+child)\b/i,
  /\b(self[-\s]?harm|suicid|harm\s+(himself|herself|myself|themselves)\s+tonight)\b/i,
];

const CASEWORK_SIGNALS = [
  /\b(evacuat|wildfire|flood(ing)?|blizzard|contaminat|disaster|livestock|armed\s+(fighting|conflict|unrest))\b/i,
  /\b(stranded|detained\s+by\s+(foreign|local)|embassy|overseas|evacuation\s+route)\b/i,
  /\b(medication|prescription|oxygen\s+(equipment|supply)|medical\s+evacuation)\b/i,
  /\b(social\s+security|passport|va\s+(record|claim)|irs|tax\s+refund|benefits?\s+(claim|payment))\b/i,
  /\b(missing(?!\s+child)|cannot\s+locate|evacuation\s+order|nursing\s+home|no\s+safe\s+water|water\s+supply)\b/i,
];

function matchesAny(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

// Returns the deterministic category for an urgent message, or null if the
// caller should fall back to the model's own category (non-urgent messages).
function classifyUrgentCategory(email) {
  const text = `${email.subject ?? ''} ${email.body ?? ''}`;

  if (matchesAny(THREAT_OR_SAFETY_SIGNALS, text)) return 'threat_or_safety';
  if (matchesAny(CASEWORK_SIGNALS, text)) return 'casework';
  return 'threat_or_safety';
}

export { classifyUrgentCategory, THREAT_OR_SAFETY_SIGNALS, CASEWORK_SIGNALS };
