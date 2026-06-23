import { readFile } from 'node:fs/promises';
import { fetchInboxMessages } from './graph.js';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const MODEL = process.env.TRIAGE_MODEL ?? 'llama3.2:3b';

const SYSTEM_PROMPT = `You are a triage classifier for a U.S. Senate office's constituent correspondence inbox.
Read the email below and respond with ONLY a JSON object, no other text, in this exact shape:
{"urgent": true|false, "category": "casework"|"policy_opinion"|"threat_or_safety"|"administrative"|"other", "sentiment": "positive"|"neutral"|"negative", "reason": "one short sentence"}

Mark "urgent": true ONLY for genuine emergencies requiring same-day human attention: threats of violence, a constituent trapped/endangered abroad, immediate safety risk, active disaster/medical emergency. Do not mark policy opinions, routine casework, or complaints as urgent.`;

async function classifyEmail(email) {
  const userPrompt = `Subject: ${email.subject}\n\nBody: ${email.body}`;

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      stream: false,
      format: 'json',
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return JSON.parse(data.response);
}

function alert(email, result) {
  // Placeholder — actual notification channel TBD with the office (email, Teams, SMS).
  console.log(`\n*** URGENT ALERT *** [${email.id}] "${email.subject}" — ${result.reason}\n`);
}

async function runTriage(emails) {
  const results = [];
  for (const email of emails) {
    const start = Date.now();
    const result = await classifyEmail(email);
    const elapsedMs = Date.now() - start;
    results.push({ email, result, elapsedMs });

    console.log(`[${email.id}] urgent=${result.urgent} category=${result.category} sentiment=${result.sentiment} (${elapsedMs}ms)`);
    if (result.urgent) alert(email, result);
  }
  return results;
}

async function runTest() {
  const raw = await readFile(new URL('./test-emails.json', import.meta.url), 'utf-8');
  const emails = JSON.parse(raw);

  console.log(`Running triage pilot against ${emails.length} synthetic test emails using model "${MODEL}" at ${OLLAMA_URL}\n`);

  const results = await runTriage(emails);

  let correct = 0;
  for (const { email, result } of results) {
    const match = result.urgent === email.expected_urgent;
    if (match) correct++;
    else console.log(`MISMATCH [${email.id}]: expected urgent=${email.expected_urgent}, got ${result.urgent}`);
  }

  const avgMs = Math.round(results.reduce((sum, r) => sum + r.elapsedMs, 0) / results.length);
  console.log(`\n${correct}/${emails.length} correct. Average latency: ${avgMs}ms per email.`);
}

async function runLive() {
  console.log(`Fetching live inbox messages via Graph API using model "${MODEL}" at ${OLLAMA_URL}\n`);
  const emails = await fetchInboxMessages();
  await runTriage(emails);
}

if (process.argv.includes('--test')) {
  runTest().catch((err) => {
    console.error('Triage test failed:', err.message);
    process.exit(1);
  });
}

if (process.argv.includes('--live')) {
  runLive().catch((err) => {
    console.error('Live triage run failed:', err.message);
    process.exit(1);
  });
}

export { classifyEmail, runTriage };
