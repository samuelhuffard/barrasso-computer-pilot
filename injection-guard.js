const INJECTION_PATTERNS = [
  { name: 'system_override_phrase', regex: /\bsystem\s+override\b/i },
  { name: 'ignore_instructions', regex: /\bignore\s+(the\s+)?(email|message|text|context|instructions?|rules?)(\s+(above|below))?\b/i },
  { name: 'disregard_above', regex: /\bdisregard\s+(the\s+)?(above|previous|prior|preceding)\b/i },
  { name: 'new_instructions', regex: /\b(new|updated)\s+instructions?\b/i },
  { name: 'persona_hijack', regex: /\byou\s+are\s+now\s+(a|an)\b/i },
  { name: 'act_as_ai', regex: /\bact\s+as\s+(an?|the)\s+(ai|assistant|model|system)\b/i },
  { name: 'forced_output', regex: /\boutput\s+(the\s+following|this|exactly)\b/i },
  { name: 'embedded_json_schema', regex: /\{\s*"urgent"\s*:/i },
  { name: 'prompt_marker', regex: /\bprompt\s*:\s*$/im },
];

function detectPromptInjection(text) {
  if (!text) return { detected: false, matches: [] };
  const matches = INJECTION_PATTERNS.filter((pattern) => pattern.regex.test(text)).map((pattern) => pattern.name);
  return { detected: matches.length > 0, matches };
}

export { detectPromptInjection, INJECTION_PATTERNS };
