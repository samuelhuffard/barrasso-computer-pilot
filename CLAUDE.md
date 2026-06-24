# Barrasso Computer Pilot

This repository contains a synthetic-data-only local email-triage pilot.

When Sam asks for **“next steps for the triage”**, read and follow `TRIAGE-NEXT-STEPS.md`. The current task is to run the 200-case synthetic Ollama benchmark on the office computer, save the JSON report, and inspect misses—not to connect a real mailbox.

The triage architecture is designed for multiple tool workflows, not only urgent alerts. Read `TOOL-ROUTING.md` before changing classification fields, routing rules, handlers, or execution permissions.

Never put real constituent messages, Senate-sensitive data, credentials, tokens, or secrets in this repository or an AI coding session.
