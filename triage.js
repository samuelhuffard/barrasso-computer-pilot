import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchInboxMessages } from './graph.js';
import { watchFolder } from './folder-watch.js';
import { BENCHMARK_EMAILS } from './benchmark-emails.js';
import { calculateMetrics, formatMetrics, validateClassification } from './evaluation.js';

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
  const result = JSON.parse(data.response);
  const validation = validateClassification(result);
  if (!validation.valid) {
    throw new Error(`Invalid classifier response: ${validation.error}`);
  }
  return result;
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

function safeModelName(model) {
  return model.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

async function runBenchmark() {
  const requestedLimit = Number.parseInt(process.env.BENCHMARK_LIMIT ?? '', 10);
  const emails = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? BENCHMARK_EMAILS.slice(0, requestedLimit)
    : BENCHMARK_EMAILS;
  console.log(`Running ${emails.length}-case adversarial benchmark using model "${MODEL}" at ${OLLAMA_URL}\n`);

  const outcomes = [];
  for (let index = 0; index < emails.length; index++) {
    const email = emails[index];
    const start = Date.now();
    try {
      const result = await classifyEmail(email);
      const elapsedMs = Date.now() - start;
      outcomes.push({ email, result, elapsedMs });
      const marker = result.urgent === email.expected_urgent ? 'PASS' : 'MISS';
      console.log(`[${index + 1}/${emails.length}] ${marker} ${email.id} expected=${email.expected_urgent} actual=${result.urgent} ${elapsedMs}ms`);
    } catch (error) {
      const elapsedMs = Date.now() - start;
      outcomes.push({ email, error: error.message, elapsedMs });
      console.log(`[${index + 1}/${emails.length}] ERROR ${email.id} ${elapsedMs}ms — ${error.message}`);
    }
  }

  const metrics = calculateMetrics(outcomes);
  console.log(`\n${formatMetrics(metrics)}\n`);

  if (metrics.failures.length) {
    console.log('Failures:');
    for (const failure of metrics.failures) {
      console.log(`- ${failure.type} ${failure.id}: ${failure.reason ?? failure.error ?? 'classification mismatch'}`);
    }
  }

  const reportDir = new URL('./benchmark-results/', import.meta.url);
  await mkdir(reportDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportUrl = new URL(`${safeModelName(MODEL)}-${stamp}.json`, reportDir);
  await writeFile(reportUrl, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    model: MODEL,
    ollamaUrl: OLLAMA_URL,
    metrics,
    outcomes,
  }, null, 2)}\n`);
  console.log(`Full report: ${fileURLToPath(reportUrl)}`);

  if (metrics.falseNegative > 0 || metrics.schemaFailures > 0 || metrics.requestFailures > 0) {
    process.exitCode = 1;
  }
}

async function runLive() {
  console.log(`Fetching live inbox messages via Graph API using model "${MODEL}" at ${OLLAMA_URL}\n`);
  const emails = await fetchInboxMessages();
  await runTriage(emails);
}

async function classifyAndLog(email) {
  const start = Date.now();
  const result = await classifyEmail(email);
  const elapsedMs = Date.now() - start;
  console.log(`[${email.id}] urgent=${result.urgent} category=${result.category} sentiment=${result.sentiment} (${elapsedMs}ms)`);
  if (result.urgent) alert(email, result);
}

async function runWatch(folderPath) {
  await watchFolder(folderPath, classifyAndLog);
}

if (process.argv.includes('--test')) {
  runTest().catch((err) => {
    console.error('Triage test failed:', err.message);
    process.exit(1);
  });
}

if (process.argv.includes('--benchmark')) {
  runBenchmark().catch((err) => {
    console.error('Benchmark failed:', err.message);
    process.exit(1);
  });
}

if (process.argv.includes('--live')) {
  runLive().catch((err) => {
    console.error('Live triage run failed:', err.message);
    process.exit(1);
  });
}

const watchIndex = process.argv.indexOf('--watch');
if (watchIndex !== -1) {
  const folderPath = process.argv[watchIndex + 1];
  if (!folderPath) {
    console.error('Usage: node triage.js --watch <folder-path>');
    process.exit(1);
  }
  runWatch(folderPath).catch((err) => {
    console.error('Folder watch failed:', err.message);
    process.exit(1);
  });
}

export { classifyEmail, runTriage };
