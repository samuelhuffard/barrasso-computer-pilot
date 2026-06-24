# Triage Pilot — Next Steps

If Sam says **“next steps for the triage”**, start here.

## Current objective

Run the synthetic local-model benchmark on the Barrasso office computer and preserve the result files for comparison. Do not connect to a real mailbox during this step.

## Safety boundary

- Use only the synthetic cases in `benchmark-emails.js`.
- Do not paste real constituent messages into Claude, Codex, GitHub, or this repository.
- Do not run `--live`; Microsoft Graph access is a separate IT-gated step.
- The classifier only generates review alerts. It must not reply, send mail, or take irreversible action.

## Office-computer procedure

Open PowerShell and enter the repository folder—the folder containing `package.json` and `triage.js`.

Update and prepare:

```powershell
git pull
npm install
npm test
ollama list
```

Confirm `llama3.2:3b` appears in `ollama list`. If it does not:

```powershell
ollama pull llama3.2:3b
```

Run a five-case connectivity check:

```powershell
$env:TRIAGE_MODEL = "llama3.2:3b"
$env:BENCHMARK_LIMIT = "5"
npm run benchmark
Remove-Item Env:BENCHMARK_LIMIT
```

If that completes without request or schema failures, run all 200 cases:

```powershell
npm run benchmark
```

The full run should take about 15 minutes at the previously measured speed.

## What to bring back

The command prints the exact report path. Reports are saved under:

```text
benchmark-results\
```

Bring back:

1. The final console summary.
2. The generated `.json` report.
3. Any case IDs listed under `Failures`.

Do not commit the reports; the directory is intentionally ignored by Git.

## Decision criteria

Primary requirement:

- Urgent recall: 100%—zero missed emergencies.

Also inspect:

- Schema failures: 0
- Request failures: 0
- False positives: review each individually
- Category, intent, and needs-reply accuracy: review every mismatch before enabling downstream tools
- p95 latency: acceptable for asynchronous inbox polling

Passing this benchmark supports continued pilot testing. It does not establish production readiness.

## After the baseline

Do not download additional models until the `llama3.2:3b` report is saved. Afterward, compare Phi-4-mini and Qwen3 4B one at a time using the commands in `BENCHMARK.md`.
