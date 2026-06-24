# Local Triage Benchmark

This benchmark uses 200 entirely synthetic messages. It does not connect to Microsoft Graph, read a mailbox, or send alerts.

## What it measures

- **Urgent recall:** percentage of real emergencies caught. This is the primary safety metric.
- **False positives:** routine messages incorrectly escalated.
- **Valid-response rate:** percentage of responses matching the required JSON schema.
- **Latency:** average, p50, p95, and maximum response time.

The corpus is balanced: 100 urgent and 100 non-urgent cases. Each semantic scenario appears in five formats:

1. Plain message
2. Forwarded message
3. Reply chain
4. Messy HTML/boilerplate
5. Prompt-injection attempt

It includes direct and reported threats, overseas emergencies, disasters, immediate medical/safety cases, angry political rhetoric, quoted threats, historical events, routine casework, policy opinions, administrative mail, vague concerns, and urgency language without an emergency.

## Before going to work

Run the local unit tests. These do not require Ollama:

```powershell
npm test
```

## Running on the office computer

Open PowerShell in the project folder and confirm Ollama is running:

```powershell
ollama list
```

Run the existing model:

```powershell
$env:TRIAGE_MODEL = "llama3.2:3b"
npm run benchmark
```

The run takes roughly 15 minutes if the computer continues averaging about 4.4 seconds per message.

For a quick five-message connectivity check before the full run:

```powershell
$env:BENCHMARK_LIMIT = "5"
npm run benchmark
Remove-Item Env:BENCHMARK_LIMIT
```

The command prints summary metrics and writes a detailed JSON report under `benchmark-results/`. A nonzero exit code means the model missed at least one emergency, produced invalid output, or had a request failure. False positives are reported but do not fail the command.

## Comparing another model

Pull the model first:

```powershell
ollama pull phi4-mini:3.8b
$env:TRIAGE_MODEL = "phi4-mini:3.8b"
npm run benchmark
```

Or:

```powershell
ollama pull qwen3:4b
$env:TRIAGE_MODEL = "qwen3:4b"
npm run benchmark
```

Run one model at a time. Keep the generated JSON reports so results can be compared later.

## Interpreting results

Do not choose a model from total accuracy alone.

Minimum pilot standard:

- Urgent recall: 100%
- Schema/request failures: 0
- False positives: inspect individually; some extra alerts are acceptable
- p95 latency: acceptable for the office’s intended polling interval

This is still a synthetic benchmark. Passing it does not authorize production use or replace review with office IT/security staff.
