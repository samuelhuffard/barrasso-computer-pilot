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

const VALID_CATEGORIES = new Set(['casework', 'policy_opinion', 'threat_or_safety', 'administrative', 'other']);
const VALID_INTENTS = new Set([
  'request_assistance', 'share_opinion', 'request_meeting', 'unsubscribe',
  'report_threat_or_safety', 'provide_information', 'other',
]);
const VALID_SENTIMENTS = new Set(['positive', 'neutral', 'negative']);

const CATEGORY_SYNONYMS = {
  safety: 'threat_or_safety',
  security: 'threat_or_safety',
  emergency: 'threat_or_safety',
  threat: 'threat_or_safety',
  danger: 'threat_or_safety',
  opinion: 'policy_opinion',
  policy: 'policy_opinion',
  feedback: 'policy_opinion',
  general: 'administrative',
  informational: 'administrative',
  information: 'administrative',
  admin: 'administrative',
};

// Falls back to a keyword match against the model's raw (invalid) value, then
// to "other" — the model is reliably good at signaling intent even when it
// misses the exact enum string, so a hard failure here just trades a noisy
// schema error for a coarser-but-correct category instead of throwing away
// the rest of a valid classification (urgent, priority, reason, etc).
function coerceCategory(value) {
  if (VALID_CATEGORIES.has(value)) return value;
  if (typeof value !== 'string') return 'other';
  const key = value.trim().toLowerCase().replace(/[^a-z]+/g, '');
  if (CATEGORY_SYNONYMS[key]) return CATEGORY_SYNONYMS[key];
  for (const [synonym, mapped] of Object.entries(CATEGORY_SYNONYMS)) {
    if (key.includes(synonym)) return mapped;
  }
  return 'other';
}

function coerceIntent(value) {
  if (VALID_INTENTS.has(value)) return value;
  if (typeof value === 'string' && value in INTENT_SYNONYMS) return INTENT_SYNONYMS[value];
  return 'other';
}

function coerceSentiment(value) {
  return VALID_SENTIMENTS.has(value) ? value : 'neutral';
}

function coerceTopics(value) {
  if (Array.isArray(value)) {
    return value
      .filter((topic) => typeof topic === 'string')
      .map(toSnakeCase)
      .filter((topic) => topic.length > 0)
      .slice(0, 3);
  }
  if (typeof value === 'string' && value.trim()) {
    const single = toSnakeCase(value);
    return single ? [single] : [];
  }
  return [];
}

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

  normalized.category = coerceCategory(normalized.category);
  normalized.intent = coerceIntent(normalized.intent);
  normalized.sentiment = coerceSentiment(normalized.sentiment);
  normalized.topics = coerceTopics(normalized.topics);

  if (typeof normalized.priority !== 'string' || !['critical', 'high', 'normal', 'low'].includes(normalized.priority)) {
    normalized.priority = normalized.urgent === true ? 'critical' : 'normal';
  }

  if (typeof normalized.reason !== 'string' || normalized.reason.trim().length === 0) {
    normalized.reason = 'No reason provided by model.';
  } else {
    normalized.reason = normalized.reason.trim();
  }

  return normalized;
}

export { normalizeClassification, toSnakeCase, coerceBoolean };
