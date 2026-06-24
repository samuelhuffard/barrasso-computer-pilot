function toSnakeCase(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

const INTENT_SYNONYMS = {
  request_information: 'request_assistance',
  ask_question: 'request_assistance',
  request_help: 'request_assistance',
  provide_feedback: 'share_opinion',
  give_feedback: 'share_opinion',
  express_opinion: 'share_opinion',
  report_concern: 'report_threat_or_safety',
  report_issue: 'request_assistance',
  schedule_meeting: 'request_meeting',
};

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true') return true;
    if (lowered === 'false') return false;
  }
  return value;
}

// Fixes common model formatting noise (stray whitespace, capitalization, string
// booleans, non-snake-case topics) without changing the model's actual judgment.
// Semantic errors (e.g. an invalid category value) are left alone and still
// caught by validateClassification downstream.
function normalizeClassification(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;

  const normalized = { ...raw };

  if ('urgent' in normalized) normalized.urgent = coerceBoolean(normalized.urgent);
  if ('needs_reply' in normalized) normalized.needs_reply = coerceBoolean(normalized.needs_reply);

  for (const field of ['category', 'intent', 'priority', 'sentiment']) {
    if (typeof normalized[field] === 'string') normalized[field] = normalized[field].trim().toLowerCase();
  }

  if (typeof normalized.intent === 'string' && normalized.intent in INTENT_SYNONYMS) {
    normalized.intent = INTENT_SYNONYMS[normalized.intent];
  }

  if (Array.isArray(normalized.topics)) {
    normalized.topics = normalized.topics
      .filter((topic) => typeof topic === 'string')
      .map(toSnakeCase)
      .filter((topic) => topic.length > 0)
      .slice(0, 3);
  }

  if (typeof normalized.reason === 'string') normalized.reason = normalized.reason.trim();

  return normalized;
}

export { normalizeClassification, toSnakeCase, coerceBoolean };
